/* tests/test_parcel_constraint_layers.mjs — concrete constraint layer wiring.

   fema-flood was PENDING (registerUnavailable) until a real GitHub Actions
   dispatch verified FEMA's NFHL MapServer layer 28 is live with real fields
   (FLD_ZONE, ZONE_SUBTY, SFHA_TF, STATIC_BFE). This tests that it is now a
   real registered layer with a live-query provider, while nwi-wetlands and
   protected-lands correctly remain unavailable (their candidate URLs were
   dispatched too, but returned HTTP 400/502/timeout, not confirmed data).

   Run:  node tests/test_parcel_constraint_layers.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

global.polygonClipping = require('../js/vendor/polygon-clipping.umd.min.js');
require('../js/parcel/geo.js');
require('../js/parcel/constraints.js');

const C = global.PARCEL_CONSTRAINTS;

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}
function t(name, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  same ? pass++ : fail++;
  console.log(`${same ? 'PASS' : 'FAIL'}  ${name}`);
  if (!same) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}

function stubFetch(handler) {
  global.fetch = async (url) => {
    const result = handler(String(url));
    if (result instanceof Error) throw result;
    return {
      ok: result.status === undefined || (result.status >= 200 && result.status < 300),
      status: result.status || 200,
      json: async () => result.body,
    };
  };
}

function loadLayersModule() {
  delete require.cache[require.resolve('../js/parcel/constraint-layers.js')];
  delete global.PARCEL_CONSTRAINT_LAYERS;
  C.reset();
  require('../js/parcel/constraint-layers.js');
}

const squareParcel = { type: 'Polygon', coordinates: [[[-77.5, 39.0], [-77.4, 39.0], [-77.4, 39.1], [-77.5, 39.1], [-77.5, 39.0]]] };

// ── Registration ─────────────────────────────────────────────────────────
{
  stubFetch(() => ({ body: { type: 'FeatureCollection', features: [] } }));
  loadLayersModule();

  const ids = C.layerIds();
  ok('fema-flood is a real registered layer, not pending', ids.includes('fema-flood'));
  const femaLayer = C.getLayer('fema-flood');
  ok('fema-flood is not marked unavailable', !femaLayer.unavailable);
  ok('fema-flood has a provider function', typeof femaLayer.provider === 'function');
  ok('nwi-wetlands is still registered unavailable (not confirmed live)', C.getLayer('nwi-wetlands').unavailable);
  ok('protected-lands is still registered unavailable (not confirmed live)', C.getLayer('protected-lands').unavailable);
}

// ── Live query construction ─────────────────────────────────────────────
{
  let capturedUrl = null;
  stubFetch((url) => {
    capturedUrl = url;
    return { body: { type: 'FeatureCollection', features: [] } };
  });
  loadLayersModule();

  await C.analyze(squareParcel, { layers: ['fema-flood'] });
  ok('query hits the real FEMA hazards.fema.gov NFHL layer 28 endpoint',
    capturedUrl && capturedUrl.startsWith('https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query'));
  ok('query requests real confirmed fields (FLD_ZONE)', capturedUrl && capturedUrl.includes('FLD_ZONE'));
  ok('query requests real confirmed fields (SFHA_TF)', capturedUrl && capturedUrl.includes('SFHA_TF'));
  ok('query uses geometry envelope spatial filter', capturedUrl && capturedUrl.includes('esriGeometryEnvelope'));
  ok('query requests geojson output', capturedUrl && capturedUrl.includes('f=geojson'));
}

// ── Real intersection against a stubbed flood polygon ───────────────────
{
  const floodPolygon = {
    type: 'Polygon',
    coordinates: [[[-77.5, 39.0], [-77.45, 39.0], [-77.45, 39.1], [-77.5, 39.1], [-77.5, 39.0]]],
  };
  stubFetch(() => ({
    body: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { FLD_ZONE: 'AE', SFHA_TF: 'T' }, geometry: floodPolygon }],
    },
  }));
  loadLayersModule();

  const result = await C.analyze(squareParcel, { layers: ['fema-flood'] });
  const r = result.results[0];
  ok('overlapping flood zone is detected as intersecting', r.intersects === true);
  ok('intersection area is greater than zero', r.areaAcres > 0);
  ok('pctOfParcel is roughly half (overlapping half the square)', r.pctOfParcel > 40 && r.pctOfParcel < 60);
}

// ── No overlap ───────────────────────────────────────────────────────────
{
  const farAwayPolygon = {
    type: 'Polygon',
    coordinates: [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
  };
  stubFetch(() => ({
    body: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { FLD_ZONE: 'AE' }, geometry: farAwayPolygon }],
    },
  }));
  loadLayersModule();

  const result = await C.analyze(squareParcel, { layers: ['fema-flood'] });
  ok('a genuinely non-overlapping flood zone reports intersects: false', result.results[0].intersects === false);
}

// ── HTTP failure isolation ───────────────────────────────────────────────
{
  stubFetch(() => ({ status: 503, body: {} }));
  loadLayersModule();

  const result = await C.analyze(squareParcel, { layers: ['fema-flood'] });
  const r = result.results[0];
  ok('a failed FEMA fetch is reported unevaluated, not a false "0% flood"', r.unevaluated === true);
  ok('the failure carries an error message', typeof r.error === 'string' && r.error.length > 0);
}

// ── ArcGIS HTTP-200-with-error-body handling ─────────────────────────────
{
  stubFetch(() => ({ body: { error: { code: 400, message: 'Invalid query parameters.' } } }));
  loadLayersModule();

  const result = await C.analyze(squareParcel, { layers: ['fema-flood'] });
  ok('an ArcGIS error body (HTTP 200) is surfaced as unevaluated, not read as zero features',
    result.results[0].unevaluated === true);
}

// ── Caveat text preserved ────────────────────────────────────────────────
{
  stubFetch(() => ({ body: { type: 'FeatureCollection', features: [] } }));
  loadLayersModule();
  const layer = C.getLayer('fema-flood');
  ok('caveat still warns about FEMA map vintage', layer.caveat.toLowerCase().includes('decade'));
  ok('caveat still warns absence does not certify dry', layer.caveat.toLowerCase().includes('does not certify'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
