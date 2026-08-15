/* tests/test_parcel_zoning_geometry.mjs
 *
 * js/parcel/zoning-geometry.js — window.ZONING_GEOMETRY — is the
 * parcel-to-zoning-district spatial join. None of the three NoVA parcel
 * services publish a native zoning_code, so this point-in-polygon join
 * against the real, live zoning district geometry is the only way
 * PARCEL_FEASIBILITY.assess() can ever produce a real DC-eligibility
 * score for those counties. These tests cover the coverage/cache surface
 * and the honesty contract: null (never a guess) when geometry isn't
 * cached, the parcel has no polygon, or no district actually contains
 * the point.
 *
 * Run: node tests/test_parcel_zoning_geometry.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

const GEO_SRC = readFileSync(join(ROOT, 'js', 'parcel', 'geo.js'), 'utf8');
const ZG_SRC  = readFileSync(join(ROOT, 'js', 'parcel', 'zoning-geometry.js'), 'utf8');

// Both modules attach to the same sandbox window -- zoning-geometry.js
// reads window.PARCEL_GEO internally, exactly like it will in the browser.
function freshModule() {
  const sandboxWindow = {};
  new Function('window', GEO_SRC)(sandboxWindow);
  new Function('window', ZG_SRC)(sandboxWindow);
  return sandboxWindow.ZONING_GEOMETRY;
}

const originalFetch = global.fetch;
function mockFetchOnce(handler) {
  global.fetch = handler;
}
function restoreFetch() {
  global.fetch = originalFetch;
}

const ZG = freshModule();

ok('js/parcel/zoning-geometry.js exports window.ZONING_GEOMETRY', !!ZG);

// ── Coverage / cache surface ──────────────────────────────────────────
ok('hasCoverage true for Loudoun (51107)', ZG.hasCoverage('51107'));
ok('hasCoverage true for Prince William (51153)', ZG.hasCoverage('51153'));
ok('hasCoverage true for Fairfax (51059)', ZG.hasCoverage('51059'));
ok('hasCoverage false for an uncovered county (24031)', !ZG.hasCoverage('24031'));
ok('isCached false before any load', !ZG.isCached('51107'));
ok('getCachedByFips returns null before any load', ZG.getCachedByFips('51107') === null);

// ── resolveForFips: honesty contract when nothing is cached ───────────
ok('resolveForFips returns null when geometry is not cached',
  ZG.resolveForFips('51107', { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }) === null);
ok('resolveForFips returns null when the parcel has no geometry',
  ZG.resolveForFips('51107', null) === null);

// A small synthetic pair of adjacent square districts (real point-in-polygon
// math against real GeoJSON, not a stub of the resolution logic itself).
const DISTRICT_A = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[-77.5, 39.0], [-77.4, 39.0], [-77.4, 39.1], [-77.5, 39.1], [-77.5, 39.0]]] },
  properties: { zoning_code: 'IP', zoning_name: 'Industrial Park', zoning_category: 'industrial', dc_classification: 'permitted_by_right' },
};
const DISTRICT_B = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[-77.4, 39.0], [-77.3, 39.0], [-77.3, 39.1], [-77.4, 39.1], [-77.4, 39.0]]] },
  properties: { zoning_code: 'R1', zoning_name: 'Residential', zoning_category: 'residential', dc_classification: 'prohibited' },
};
const geojsonFC = { type: 'FeatureCollection', features: [DISTRICT_A, DISTRICT_B] };

const parcelInA = { type: 'Polygon', coordinates: [[[-77.46, 39.02], [-77.44, 39.02], [-77.44, 39.04], [-77.46, 39.04], [-77.46, 39.02]]] };
const parcelInB = { type: 'Polygon', coordinates: [[[-77.36, 39.02], [-77.34, 39.02], [-77.34, 39.04], [-77.36, 39.04], [-77.36, 39.02]]] };
const parcelOutside = { type: 'Polygon', coordinates: [[[-77.9, 39.5], [-77.8, 39.5], [-77.8, 39.6], [-77.9, 39.6], [-77.9, 39.5]]] };

async function run() {
  const zg = freshModule();
  let fetchCalls = 0;
  mockFetchOnce(async (url) => {
    fetchCalls++;
    ok('loadByFips requests the correct real geometry path for Loudoun',
      url === 'data/zoning/geometry/va-loudoun-county.geojson');
    return { ok: true, json: async () => geojsonFC };
  });

  await zg.loadByFips('51107');
  restoreFetch();

  ok('after loadByFips, isCached is true', zg.isCached('51107'));
  ok('getCachedByFips returns the loaded FeatureCollection', zg.getCachedByFips('51107')?.features?.length === 2);
  ok('exactly one fetch happened for the load', fetchCalls === 1);

  const resolvedA = zg.resolveForFips('51107', parcelInA);
  ok('parcel inside district A resolves to code IP', resolvedA?.zoningCode === 'IP');
  ok('resolved result tags source as parcel_boundary_spatial_join', resolvedA?.source === 'parcel_boundary_spatial_join');
  ok('resolved result carries the district name', resolvedA?.zoningName === 'Industrial Park');
  ok('resolved result carries the raw GIS dc_classification', resolvedA?.dcClassification === 'permitted_by_right');

  const resolvedB = zg.resolveForFips('51107', parcelInB);
  ok('parcel inside district B resolves to code R1', resolvedB?.zoningCode === 'R1');

  const resolvedOutside = zg.resolveForFips('51107', parcelOutside);
  ok('parcel outside every district resolves to null -- never a nearest-guess', resolvedOutside === null);

  ok('resolveForFips for an uncached jurisdiction (51153) still returns null',
    zg.resolveForFips('51153', parcelInA) === null);

  // Cache dedup: two concurrent loadByFips calls for the same jurisdiction
  // must share one in-flight fetch rather than double-fetching.
  const zg2 = freshModule();
  let concurrentFetchCount = 0;
  mockFetchOnce(async () => {
    concurrentFetchCount++;
    await new Promise(r => setTimeout(r, 5));
    return { ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) };
  });
  await Promise.all([zg2.loadByFips('51153'), zg2.loadByFips('51153')]);
  restoreFetch();
  ok('concurrent loadByFips calls for the same jurisdiction de-dupe to one fetch', concurrentFetchCount === 1);

  // A non-ok HTTP response must reject, not silently cache empty data.
  const zg3 = freshModule();
  mockFetchOnce(async () => ({ ok: false, status: 404 }));
  let threw = false;
  try { await zg3.loadByFips('51059'); } catch { threw = true; }
  restoreFetch();
  ok('a failed fetch rejects rather than caching empty/broken data', threw);
  ok('a failed fetch leaves the jurisdiction uncached', !zg3.isCached('51059'));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

run();
