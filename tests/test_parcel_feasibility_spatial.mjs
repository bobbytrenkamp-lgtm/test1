/* tests/test_parcel_feasibility_spatial.mjs
 *
 * PARCEL_FEASIBILITY.assess()'s spatial zoning-code fallback: when a
 * parcel has no native zoning_code (true for every parcel in all three
 * NoVA counties today), it falls back to ZONING_GEOMETRY's point-in-
 * polygon join if the caller attached the parcel's raw geometry
 * (props._geometry). This is the piece that actually closes the gap the
 * NoVA site-intelligence audit flagged as the real bottleneck: real
 * zoning-district geometry existed for all three counties, but nothing
 * connected a clicked parcel to it, so a DC-eligibility score could never
 * be produced regardless of how much zoning-geometry work had been done.
 *
 * Run: node tests/test_parcel_feasibility_spatial.mjs
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

const GEO_SRC          = readFileSync(join(ROOT, 'js', 'parcel', 'geo.js'), 'utf8');
const ZONING_GEOM_SRC   = readFileSync(join(ROOT, 'js', 'parcel', 'zoning-geometry.js'), 'utf8');
const FEASIBILITY_SRC   = readFileSync(join(ROOT, 'js', 'parcel', 'feasibility.js'), 'utf8');

// A district that IS classified in the mock ZONING dataset.
const CLASSIFIED_DISTRICT_GEOM = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[-77.5, 39.0], [-77.4, 39.0], [-77.4, 39.1], [-77.5, 39.1], [-77.5, 39.0]]] },
  properties: { zoning_code: 'IP', zoning_name: 'Industrial Park', zoning_category: 'industrial', dc_classification: 'permitted_by_right' },
};
// A district that resolves spatially but has NO entry in the mock ZONING
// dataset -- exactly Loudoun's real situation for 51 of its 58 live codes.
const UNCLASSIFIED_DISTRICT_GEOM = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[-77.4, 39.0], [-77.3, 39.0], [-77.3, 39.1], [-77.4, 39.1], [-77.4, 39.0]]] },
  properties: { zoning_code: 'GI', zoning_name: '', zoning_category: 'unclassified', dc_classification: 'not_listed' },
};
const GEOJSON_FC = { type: 'FeatureCollection', features: [CLASSIFIED_DISTRICT_GEOM, UNCLASSIFIED_DISTRICT_GEOM] };

const MOCK_ZONING_DATA = {
  jurisdiction_id: 'va-loudoun-county',
  jurisdiction: { jurisdiction_name: 'Loudoun County, Virginia', official_ordinance_url: 'https://example.test/ordinance' },
  disclaimer: 'Test disclaimer',
  districts: {
    IP: {
      district_name: 'Industrial Park (classified)',
      district_category: 'industrial',
      uses: [{ standardized_use_id: 'data_center', permission_status: 'permitted_by_right', confidence_level: 'moderate', manual_review_required: false, conditions: [] }],
      dc_analysis: { base_zoning_status: 'permitted_by_right' },
      dc_eligibility_summary: 'By right in Industrial Park.',
    },
    // Note: 'GI' is deliberately absent -- mirrors districts.json not
    // having an entry for a real live district code yet.
  },
};

function freshSandbox() {
  const sandboxWindow = {};
  new Function('window', GEO_SRC)(sandboxWindow);
  new Function('window', ZONING_GEOM_SRC)(sandboxWindow);
  new Function('window', FEASIBILITY_SRC)(sandboxWindow);
  return sandboxWindow;
}

const parcelInClassified   = { type: 'Polygon', coordinates: [[[-77.46, 39.02], [-77.44, 39.02], [-77.44, 39.04], [-77.46, 39.04], [-77.46, 39.02]]] };
const parcelInUnclassified = { type: 'Polygon', coordinates: [[[-77.36, 39.02], [-77.34, 39.02], [-77.34, 39.04], [-77.36, 39.04], [-77.36, 39.02]]] };

const originalFetch = global.fetch;
async function withMockedGeometryLoaded(sandboxWindow, fips, geojson, fn) {
  global.fetch = async () => ({ ok: true, json: async () => geojson });
  try {
    await sandboxWindow.ZONING_GEOMETRY.loadByFips(fips);
  } finally {
    global.fetch = originalFetch;
  }
  return fn();
}

async function run() {
  // ── 1. Native zoning_code present: spatial join is never attempted ──
  {
    const w = freshSandbox();
    w.ZONING = { hasCoverage: () => true, getCachedByFips: () => MOCK_ZONING_DATA };
    const result = w.PARCEL_FEASIBILITY.assess(
      { zoning_code: 'IP', county_fips: '51107', area_acres: 25, _geometry: parcelInUnclassified },
      '51107'
    );
    ok('native zoning_code wins over spatial resolution even when geometry would resolve differently',
      result.zoningCode === 'IP');
    ok('zoningCodeSource is parcel_attribute when the source publishes the code', result.zoningCodeSource === 'parcel_attribute');
    ok('available true for a classified district via native attribute', result.available === true);
  }

  // ── 2. No native code, geometry resolves to a CLASSIFIED district ──
  {
    const w = freshSandbox();
    w.ZONING = { hasCoverage: () => true, getCachedByFips: () => MOCK_ZONING_DATA };
    await withMockedGeometryLoaded(w, '51107', GEOJSON_FC, () => {
      const result = w.PARCEL_FEASIBILITY.assess(
        { county_fips: '51107', area_acres: 25, _geometry: parcelInClassified },
        '51107'
      );
      ok('spatial resolution finds the real code when no native zoning_code exists', result.zoningCode === 'IP');
      ok('zoningCodeSource is parcel_boundary_spatial_join', result.zoningCodeSource === 'parcel_boundary_spatial_join');
      ok('available true once the spatially-resolved code IS classified', result.available === true);
      ok('permissionStatus reflects the real classification', result.permissionStatus === 'permitted_by_right');
      ok('score is a number 0-100', typeof result.score === 'number' && result.score >= 0 && result.score <= 100);
    });
  }

  // ── 3. No native code, geometry resolves to an UNCLASSIFIED district ──
  // The key honesty case: a real code was found, but has no eligibility
  // research yet -- must be a clearly-labeled partial result, never a
  // blank "not found" and never silently scored as favorable or unfavorable.
  {
    const w = freshSandbox();
    w.ZONING = { hasCoverage: () => true, getCachedByFips: () => MOCK_ZONING_DATA };
    await withMockedGeometryLoaded(w, '51107', GEOJSON_FC, () => {
      const result = w.PARCEL_FEASIBILITY.assess(
        { county_fips: '51107', area_acres: 25, _geometry: parcelInUnclassified },
        '51107'
      );
      ok('available is false for a spatially-resolved but unclassified district', result.available === false);
      ok('the real resolved code is still surfaced, not hidden', result.zoningCode === 'GI');
      ok('zoningCodeSource is still reported on the honest-partial result', result.zoningCodeSource === 'parcel_boundary_spatial_join');
      ok('reason explains it was resolved from the map but not yet classified',
        /resolved from the county.s zoning map/i.test(result.reason) && /has not yet been classified/i.test(result.reason));
    });
  }

  // ── 4. No native code, no geometry attached: unchanged prior behavior ──
  {
    const w = freshSandbox();
    w.ZONING = { hasCoverage: () => true, getCachedByFips: () => MOCK_ZONING_DATA };
    const result = w.PARCEL_FEASIBILITY.assess({ county_fips: '51107', area_acres: 25 }, '51107');
    ok('no geometry, no native code -> the original honest "no code" reason', result.available === false && result.reason === 'No zoning code on this parcel.');
  }

  // ── 5. Geometry attached but ZONING_GEOMETRY has no cached data for this
  // jurisdiction yet: must degrade gracefully, not throw ──
  {
    const w = freshSandbox();
    w.ZONING = { hasCoverage: () => true, getCachedByFips: () => MOCK_ZONING_DATA };
    let threw = false;
    let result;
    try {
      result = w.PARCEL_FEASIBILITY.assess({ county_fips: '51107', area_acres: 25, _geometry: parcelInClassified }, '51107');
    } catch { threw = true; }
    ok('assess() never throws when zoning geometry is not yet cached', !threw);
    ok('degrades to the honest "no code" result when spatial resolution finds nothing cached',
      result?.available === false && result?.reason === 'No zoning code on this parcel.');
  }

  // ── 6. ZONING_GEOMETRY module entirely absent: graceful degradation ──
  {
    const sandboxWindow = {};
    new Function('window', FEASIBILITY_SRC)(sandboxWindow); // no geo.js, no zoning-geometry.js
    sandboxWindow.ZONING = { hasCoverage: () => true, getCachedByFips: () => MOCK_ZONING_DATA };
    let threw = false;
    let result;
    try {
      result = sandboxWindow.PARCEL_FEASIBILITY.assess(
        { county_fips: '51107', area_acres: 25, _geometry: parcelInClassified }, '51107'
      );
    } catch { threw = true; }
    ok('assess() never throws when window.ZONING_GEOMETRY is not loaded at all', !threw);
    ok('degrades honestly when the spatial module is entirely absent',
      result?.available === false && result?.reason === 'No zoning code on this parcel.');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

run();
