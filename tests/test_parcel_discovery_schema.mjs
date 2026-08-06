/* tests/test_parcel_discovery_schema.mjs — unit tests for
   data/parcel_pipeline/discovery/schema.mjs's geometry normalization,
   layer ranking, and ArcGIS-specific error-envelope classification.

   inspectArcGISService/fetchSampleRecords are exercised via a
   monkey-patched global.fetch against canned ArcGIS-shaped JSON bodies —
   no real network access.

   Run:  node tests/test_parcel_discovery_schema.mjs
*/
import {
  normalizeGeometryType, rankLayersByNameKeywords, inspectArcGISService, fetchSampleRecords,
} from '../data/parcel_pipeline/discovery/schema.mjs';

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

// ── normalizeGeometryType ──
t('esriGeometryPolygon -> polygon', normalizeGeometryType('esriGeometryPolygon'), 'polygon');
t('esriGeometryPoint -> point', normalizeGeometryType('esriGeometryPoint'), 'point');
t('esriGeometryMultipoint -> point', normalizeGeometryType('esriGeometryMultipoint'), 'point');
t('esriGeometryPolyline -> line', normalizeGeometryType('esriGeometryPolyline'), 'line');
t('unrecognized geometry type -> null', normalizeGeometryType('esriGeometryEnvelope'), null);
t('missing geometry type -> null', normalizeGeometryType(undefined), null);

// ── rankLayersByNameKeywords ──
{
  const layers = [
    { id: 0, name: 'Zoning Districts' },
    { id: 1, name: 'Tax Parcels' },
    { id: 2, name: 'Cadastral Boundaries' },
    { id: 3, name: 'Street Centerlines' },
  ];
  const ranked = rankLayersByNameKeywords(layers);
  t('non-parcel-ish layers are excluded from ranking', ranked.map(l => l.id).includes(0), false);
  ok('ranking includes the parcel-keyword layers', ranked.some(l => l.id === 1) && ranked.some(l => l.id === 2));
  ok('cadastral (longer keyword match) ranks at or above tax-parcel-keyword match',
    ranked.find(l => l.id === 2).keywordScore >= ranked.find(l => l.id === 1).keywordScore);
  t('street centerlines never appears (no keyword match)', ranked.map(l => l.id).includes(3), false);
}
t('rankLayersByNameKeywords on an empty layer list returns empty', rankLayersByNameKeywords([]), []);

// ── inspectArcGISService: mocked fetch against canned ArcGIS bodies ──
async function withMockedFetch(bodyOrFn, fn) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    status: 200,
    text: async () => JSON.stringify(typeof bodyOrFn === 'function' ? bodyOrFn() : bodyOrFn),
  });
  try {
    return await fn();
  } finally {
    globalThis.fetch = realFetch;
  }
}

await withMockedFetch(
  {
    name: 'Parcels', description: 'County parcel boundaries', copyrightText: 'Example County GIS',
    owner: 'examplecounty', capabilities: 'Query,Data', maxRecordCount: 2000,
    geometryType: 'esriGeometryPolygon',
    fields: [{ name: 'PIN', alias: 'PIN', type: 'esriFieldTypeString' }],
  },
  async () => {
    const result = await inspectArcGISService('https://example.gov/arcgis/rest/services/Parcels/MapServer/0', {});
    ok('inspectArcGISService: live service returns ok:true', result.ok === true);
    t('inspectArcGISService: geometryType normalized', result.geometryType, 'polygon');
    t('inspectArcGISService: capabilities parsed into an array', result.capabilities, ['Query', 'Data']);
    ok('inspectArcGISService: fields parsed', Array.isArray(result.fields) && result.fields.length === 1);
  },
);

await withMockedFetch(
  { error: { code: 499, message: 'Token Required' } },
  async () => {
    const result = await inspectArcGISService('https://example.gov/arcgis/rest/services/Locked/MapServer/0', {});
    t('inspectArcGISService: ArcGIS 499 error classified as auth, not ok',
      { ok: result.ok, errorType: result.errorType }, { ok: false, errorType: 'auth' });
  },
);

await withMockedFetch(
  { error: { code: 400, message: 'Invalid or missing input parameters' } },
  async () => {
    const result = await inspectArcGISService('https://example.gov/arcgis/rest/services/Bad/MapServer/0', {});
    t('inspectArcGISService: generic ArcGIS error classified as unknown, not ok',
      { ok: result.ok, errorType: result.errorType }, { ok: false, errorType: 'unknown' });
  },
);

await withMockedFetch(
  { features: [{ attributes: { PIN: '123', OWNER: 'JANE DOE' } }, { attributes: { PIN: '456', OWNER: null } }] },
  async () => {
    const result = await fetchSampleRecords('https://example.gov/arcgis/rest/services/Parcels/MapServer/0', {}, 2);
    ok('fetchSampleRecords: parses feature attributes', result.ok === true);
    t('fetchSampleRecords: returns raw attribute records', result.records,
      [{ PIN: '123', OWNER: 'JANE DOE' }, { PIN: '456', OWNER: null }]);
  },
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
