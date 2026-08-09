/* tests/test_parcel_proximity_layers.mjs — concrete proximity layer wiring.

   This closes an "engine exists, data exists, but nothing connects them" gap:
   data/sample_layers.json already carries real, weekly-refreshed HIFLD
   transmission (1,892 records) and substation (~25 records) data, rendered
   on the map, but the parcel proximity engine had never been pointed at it.

   The substation coverage caveat is the thing most worth protecting here —
   that dataset is real but covers only ~25 US substations nationwide, and the
   tests check that the layer's own label says so rather than reading like a
   normal-coverage distance measurement.

   Run:  node tests/test_parcel_proximity_layers.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

require('../js/parcel/geo.js');
require('../js/parcel/proximity.js');

const P = global.PARCEL_PROXIMITY;

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

const sampleLayers = {
  power_infrastructure: [
    { id: 'sub-1', name: 'Ashburn Sub', type: 'SUBSTATION', voltage_kv: 230, county_fips: '51107', state: 'VA', lon: -77.49, lat: 39.04 },
    { id: 'sub-2', name: 'Sterling Sub', type: 'SUBSTATION', voltage_kv: 115, county_fips: '51107', state: 'VA', lon: -77.40, lat: 39.00 },
  ],
  transmission_lines: [
    { id: 'tl-1', name: '230kV Line A', voltage_kv: 230, owner: 'Dominion', path: [[-77.55, 39.00], [-77.45, 39.05]] },
    { id: 'tl-2', name: 'Bad Line (no path)', voltage_kv: 115, owner: 'Dominion', path: [] },
  ],
  fiber_network: [],
  water_stress: {},
  _last_updated: '2026-08-01T00:00:00Z',
};

function stubFetch(handler) {
  global.fetch = async (url) => {
    const body = handler(String(url));
    return { ok: body !== null, status: body !== null ? 200 : 404, json: async () => body };
  };
}

// Load proximity-layers.js fresh for each stubbed-fetch scenario.
async function loadLayersModule() {
  delete require.cache[require.resolve('../js/parcel/proximity-layers.js')];
  delete global.PARCEL_PROXIMITY_LAYERS;
  P.reset();
  require('../js/parcel/proximity-layers.js');
  return global.PARCEL_PROXIMITY_LAYERS;
}

// ── Registration ─────────────────────────────────────────────────────────
{
  stubFetch(() => sampleLayers);
  await loadLayersModule();

  const ids = P.layerIds();
  ok('substations is a real registered layer, not pending', ids.includes('substations'));
  ok('transmission-lines is a real registered layer, not pending', ids.includes('transmission-lines'));
  ok('data-centers is still registered', ids.includes('data-centers'));
  ok('interstates is a real registered layer, not pending', ids.includes('interstates'));
  const interstateLayer = P.getLayer('interstates');
  ok('interstates has a provider function', typeof interstateLayer.provider === 'function');
  ok('interstates is not marked unavailable', !interstateLayer.unavailable);
}

// ── Interstates: live query construction and RTTYP filtering ──────────────
{
  let capturedUrl = null;
  global.fetch = async (url) => {
    capturedUrl = String(url);
    return {
      ok: true, status: 200,
      json: async () => ({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { BASENAME: '66', NAME: 'I- 66', RTTYP: 'I' },
          geometry: { type: 'LineString', coordinates: [[-77.55, 39.00], [-77.45, 39.05]] },
        }],
      }),
    };
  };
  await loadLayersModule();

  const square = { type: 'Polygon', coordinates: [[[-77.50, 39.02], [-77.46, 39.02], [-77.46, 39.06], [-77.50, 39.06], [-77.50, 39.02]]] };
  const res = await P.analyze(square, { layers: ['interstates'] });
  const r = res.results[0];

  ok('query hits the real Census TIGERweb Primary Roads layer 2 endpoint',
    capturedUrl && capturedUrl.startsWith('https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer/2/query'));
  ok('query filters server-side to interstates only (RTTYP=I)', capturedUrl && capturedUrl.includes("RTTYP%3D%27I%27"));
  ok('query requests geojson output', capturedUrl && capturedUrl.includes('f=geojson'));
  ok('the interstate feature is found', r.nearest !== null);
  t('the feature name resolves from NAME', r.nearest.name, 'I- 66');
}

// ── Substation data flows through and the coverage caveat is present ──────
{
  stubFetch(() => sampleLayers);
  await loadLayersModule();

  const layer = P.getLayer('substations');
  ok('the coverage caveat names the incomplete count', layer.measures.includes('~25 US records'));
  ok('and states that absence is not evidence of absence',
    layer.measures.includes('Absence of a nearby result is not evidence'));
  ok('the source names the real dataset lineage', layer.source.includes('HIFLD'));

  const square = { type: 'Polygon', coordinates: [[[-77.50, 39.03], [-77.48, 39.03], [-77.48, 39.05], [-77.50, 39.05], [-77.50, 39.03]]] };
  const res = await P.analyze(square, { layers: ['substations'] });
  const sub = res.results[0];

  t('the nearer substation is found', sub.nearest.name, 'Ashburn Sub');
  ok('with a real distance', sub.nearest.distanceMiles >= 0);
  t('both substation records were loaded', sub.featureCount, 2);
}

// ── Transmission data flows through, and a line with no path is skipped ───
{
  stubFetch(() => sampleLayers);
  await loadLayersModule();

  const square = { type: 'Polygon', coordinates: [[[-77.50, 39.02], [-77.46, 39.02], [-77.46, 39.06], [-77.50, 39.06], [-77.50, 39.02]]] };
  const res = await P.analyze(square, { layers: ['transmission-lines'] });
  const tl = res.results[0];

  ok('the real line is found', tl.nearest !== null);
  // Only one usable feature: the malformed empty-path record must not crash
  // the layer or be silently counted as a feature.
  t('the line with no path is not counted as a usable feature', tl.featureCount, 1);
}

// ── Failure isolation: a dead infrastructure fetch must not break the map ──
{
  stubFetch(() => null);   // 404
  await loadLayersModule();

  const square = { type: 'Polygon', coordinates: [[[-77.50, 39.02], [-77.46, 39.02], [-77.46, 39.06], [-77.50, 39.06], [-77.50, 39.02]]] };
  const res = await P.analyze(square, { layers: ['substations', 'transmission-lines', 'data-centers'] });

  const sub = res.results.find(r => r.layerId === 'substations');
  const tl = res.results.find(r => r.layerId === 'transmission-lines');
  ok('a failed infrastructure fetch is reported as a layer error', !!sub.error);
  ok('and the same for transmission', !!tl.error);
  t('geometry/other layers are unaffected by the shared fetch failing', res.results.length, 3);
}

// ── Both layers share one cached fetch, not two ────────────────────────────
{
  let calls = 0;
  stubFetch((url) => { if (url.includes('sample_layers')) calls++; return sampleLayers; });
  await loadLayersModule();

  const square = { type: 'Polygon', coordinates: [[[-77.50, 39.02], [-77.46, 39.02], [-77.46, 39.06], [-77.50, 39.06], [-77.50, 39.02]]] };
  await P.analyze(square, { layers: ['substations', 'transmission-lines'] });

  t('one fetch serves both layers', calls, 1);
}

// ── Cache reset ────────────────────────────────────────────────────────────
{
  const mod = await loadLayersModule();
  let calls = 0;
  stubFetch(() => { calls++; return sampleLayers; });

  await mod.loadInfrastructureLayers();
  await mod.loadInfrastructureLayers();
  t('the loader caches across calls', calls, 1);

  mod._resetCache();
  await mod.loadInfrastructureLayers();
  t('_resetCache forces a fresh fetch', calls, 2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
