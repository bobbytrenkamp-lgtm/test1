/* tests/test_build_national_site_index.mjs — unit tests for
   data/parcel_pipeline/build_national_site_index.mjs, with every network
   call STUBBED (no real access): server-side size-filter WHERE-clause
   construction, centroid computation, feature normalization into the exact
   candidate shape js/parcel/site-search.js expects, and orchestration
   (concurrency, per-jurisdiction failure isolation, truncation flagging).

   Run:  node tests/test_build_national_site_index.mjs
*/
import {
  computeSizeWhere, buildQueryUrl, centroidFromGeometry, normalizeFeature,
  fetchJurisdictionRecords, buildIndex, structuralOutFields, DEFAULT_THRESHOLD_ACRES,
} from '../data/parcel_pipeline/build_national_site_index.mjs';

const arcgisError = (message) => ({ ok: true, json: async () => ({ error: { code: 400, message } }) });

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

// ── computeSizeWhere ─────────────────────────────────────────────────────
{
  const acresResult = computeSizeWhere({ area_acres: 'PA_LEGAL_ACRE' }, 5);
  t('acres field produces a direct >= filter', acresResult.where, 'PA_LEGAL_ACRE >= 5');
  ok('acres field is marked size-filtered', acresResult.sizeFiltered);

  const sqftResult = computeSizeWhere({ area_sqft: 'GISACRES_SQFT' }, 5);
  t('sqft-only field converts the threshold to sqft', sqftResult.where, 'GISACRES_SQFT >= 217800');
  ok('sqft field is marked size-filtered', sqftResult.sizeFiltered);

  const neitherResult = computeSizeWhere({ parcel_id: 'PIN' }, 5);
  t('no size field falls back to an unfiltered query', neitherResult.where, '1=1');
  ok('no size field is marked NOT size-filtered', !neitherResult.sizeFiltered);
}

// ── structuralOutFields ──────────────────────────────────────────────────
{
  const fields = structuralOutFields({
    parcel_id: 'PA_MCPI', area_acres: 'PA_LEGAL_ACRE', subdivision: 'PA_SUBD_NAME', county_fips: '__computed__',
  });
  t('only fields a structural CRITERION reads are requested, sorted for a stable assertion', [...fields].sort(),
    ['PA_LEGAL_ACRE', 'PA_MCPI']);
  ok('a __computed__ field is never sent as a real outField', !fields.includes('__computed__'));
  ok('a canonical field this index does not use (subdivision) is not requested', !fields.includes('PA_SUBD_NAME'));
  t('no fieldMap at all falls back to a defensive wildcard', structuralOutFields(undefined), ['*']);
}

// ── buildQueryUrl ────────────────────────────────────────────────────────
{
  const url = buildQueryUrl(
    { serviceUrl: 'https://example.gov/arcgis/rest/services/Parcels/MapServer/0', fieldMap: { parcel_id: 'PIN', area_acres: 'ACRES' } },
    { where: 'ACRES >= 5' }, 2000,
  );
  ok('query hits the jurisdiction service /query endpoint', url.startsWith('https://example.gov/arcgis/rest/services/Parcels/MapServer/0/query'));
  ok('the where clause is passed through', url.includes('where=ACRES+%3E%3D+5') || url.includes('where=ACRES%20%3E%3D%205'));
  ok('geojson output is requested', url.includes('f=geojson'));
  ok('geometry is requested (needed for centroid)', url.includes('returnGeometry=true'));
  ok('the cap is passed as resultRecordCount', url.includes('resultRecordCount=2000'));
  ok('outFields is scoped to structural fields, not a wildcard', url.includes('outFields=PIN%2CACRES') || url.includes('outFields=PIN,ACRES'));
  ok('geometry is requested at reduced precision, not full precision', url.includes('geometryPrecision=4'));
  ok('the polygon is generalized/simplified server-side', url.includes('maxAllowableOffset=0.001'));
}

// ── centroidFromGeometry ─────────────────────────────────────────────────
{
  const poly = { type: 'Polygon', coordinates: [[[-77.5, 39.0], [-77.4, 39.0], [-77.4, 39.1], [-77.5, 39.1], [-77.5, 39.0]]] };
  t('polygon centroid is the bbox midpoint', centroidFromGeometry(poly), [-77.45, 39.05]);
  t('null geometry produces no centroid', centroidFromGeometry(null), null);
  t('geometry with no coordinates produces no centroid', centroidFromGeometry({ type: 'Polygon' }), null);
}

// ── normalizeFeature ─────────────────────────────────────────────────────
{
  const jurisdiction = {
    fips: '51107', state: 'VA',
    fieldMap: { parcel_id: 'PA_MCPI', pin: 'PA_MCPI', area_acres: 'PA_LEGAL_ACRE' },
  };
  const feature = {
    type: 'Feature',
    properties: { PA_MCPI: '12345', PA_LEGAL_ACRE: 42.5 },
    geometry: { type: 'Polygon', coordinates: [[[-77.5, 39.0], [-77.4, 39.0], [-77.4, 39.1], [-77.5, 39.1], [-77.5, 39.0]]] },
  };
  const rec = normalizeFeature(feature, jurisdiction);
  t('record id combines fips and parcel id', rec.id, '51107:12345');
  t('source field names resolve to canonical field names', rec.properties.parcel_id, '12345');
  t('area_acres resolves via fieldMap, not a guessed key', rec.properties.area_acres, 42.5);
  t('county_fips is stamped from the jurisdiction, not the source', rec.properties.county_fips, '51107');
  t('state is stamped from the jurisdiction', rec.properties.state, 'VA');
  t('geometry is reduced to a Point centroid, not the full polygon', rec.geometry, { type: 'Point', coordinates: [-77.45, 39.05] });
}

// ── fetchJurisdictionRecords: HTTP and ArcGIS-error-body failure isolation ─
{
  const jurisdiction = { fips: '00000', name: 'Fake County', serviceUrl: 'https://example.gov/arcgis/rest/services/Parcels/MapServer/0', fieldMap: {} };

  const httpFail = await fetchJurisdictionRecords(jurisdiction, {
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  ok('an HTTP failure is reported, not thrown', httpFail.ok === false);
  t('the HTTP status is preserved', httpFail.error, 'HTTP 503');

  const arcgisErrorFail = await fetchJurisdictionRecords(jurisdiction, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ error: { code: 400, message: 'Invalid query.' } }) }),
  });
  ok('an HTTP-200-with-error-body is reported as a failure, not read as zero features', arcgisErrorFail.ok === false);
  ok('the ArcGIS error message is preserved', arcgisErrorFail.error.includes('Invalid query'));
}

// ── fetchJurisdictionRecords: success + truncation flag ─────────────────
{
  const jurisdiction = {
    fips: '51107', name: 'Loudoun', serviceUrl: 'https://example.gov/arcgis/rest/services/Parcels/MapServer/0',
    fieldMap: { parcel_id: 'PIN', area_acres: 'ACRES' },
  };
  const twoFeatures = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { PIN: 'A', ACRES: 10 }, geometry: null },
      { type: 'Feature', properties: { PIN: 'B', ACRES: 20 }, geometry: null },
    ],
  };
  const notTruncated = await fetchJurisdictionRecords(jurisdiction, {
    fetchImpl: async () => ({ ok: true, json: async () => twoFeatures }), cap: 500,
  });
  ok('a successful query is reported ok', notTruncated.ok === true);
  t('records are produced for every feature', notTruncated.records.length, 2);
  ok('not truncated when feature count is below the cap', !notTruncated.truncated);

  const truncated = await fetchJurisdictionRecords(jurisdiction, {
    fetchImpl: async () => ({ ok: true, json: async () => twoFeatures }), cap: 2,
  });
  ok('truncated flag is set when feature count hits the cap', truncated.truncated);
}

// ── fetchJurisdictionRecords: outFields=*/where=1=1 fallback retry ──────
// Live-probed against the real registry (2026-08-10): New Castle County DE
// and Clark County NV both reject a restricted outFields list with a
// generic ArcGIS error, but outFields=* against the same where clause
// succeeds; Marion County IN's ACREAGE field cannot be numerically
// compared with `>=` at all. A single fallback (outFields=*, where=1=1)
// covers both failure classes.
{
  const jurisdiction = {
    fips: '10003', name: 'New Castle County', serviceUrl: 'https://example.gov/arcgis/rest/services/Parcels/MapServer/0',
    fieldMap: { parcel_id: 'PRCLID', area_acres: 'LOTSZ' },
  };
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (u.searchParams.get('outFields') === '*') {
      return { ok: true, json: async () => ({ features: [{ type: 'Feature', properties: { PRCLID: 'X', LOTSZ: 12 }, geometry: null }] }) };
    }
    return arcgisError('Failed to execute query.');
  };
  const result = await fetchJurisdictionRecords(jurisdiction, { fetchImpl });

  t('exactly two requests are made (primary, then fallback)', calls.length, 2);
  ok('the primary request uses the restricted, size-filtered query', calls[0].includes('LOTSZ') && !calls[0].includes('outFields=%2A'));
  ok('the fallback request uses outFields=*', new URL(calls[1]).searchParams.get('outFields') === '*');
  ok('the fallback request uses an unfiltered where clause', new URL(calls[1]).searchParams.get('where') === '1=1');
  ok('the fallback succeeding is reported as an overall success', result.ok === true);
  ok('a successful fallback is flagged so it is distinguishable from a real size-filtered result', result.fallbackApplied === true);
  ok('the primary (real, intended) query error is preserved even though the fallback succeeded', result.primaryError.includes('Failed to execute query'));
  ok('the fallback result is honestly reported as NOT size-filtered', result.sizeFiltered === false);
  t('the fallback record is still normalized correctly', result.records.length, 1);
}
{
  // Both primary AND fallback fail -- the ORIGINAL (primary) error must be
  // what's reported, since it describes the actually-intended query, not
  // the fallback's.
  const jurisdiction = {
    fips: '99999', name: 'Truly Dead County', serviceUrl: 'https://example.gov/arcgis/rest/services/Parcels/MapServer/0',
    fieldMap: { parcel_id: 'PIN', area_acres: 'ACRES' },
  };
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return arcgisError('Invalid query parameters.'); };
  const result = await fetchJurisdictionRecords(jurisdiction, { fetchImpl });

  t('both the primary and the fallback are attempted', calls.length, 2);
  ok('the overall result is still a failure when the fallback also fails', result.ok === false);
  ok('the PRIMARY error is reported, not a fallback-specific one', result.error.includes('Invalid query parameters'));
  ok('a doubly-failed result is not mislabeled as a successful fallback', !result.fallbackApplied);
}
{
  // Non-retryable failures (transport error, HTTP error, malformed body)
  // must NOT trigger a second request -- retrying a different query shape
  // cannot plausibly fix a dead service or a network failure.
  const jurisdiction = { fips: '00001', name: 'X', serviceUrl: 'https://example.gov/arcgis/rest/services/Parcels/MapServer/0', fieldMap: {} };

  let httpCalls = 0;
  await fetchJurisdictionRecords(jurisdiction, { fetchImpl: async () => { httpCalls++; return { ok: false, status: 503 }; } });
  t('an HTTP failure makes exactly one request, no fallback retry', httpCalls, 1);

  let throwCalls = 0;
  await fetchJurisdictionRecords(jurisdiction, { fetchImpl: async () => { throwCalls++; throw new Error('network down'); } });
  t('a transport-level throw makes exactly one request, no fallback retry', throwCalls, 1);

  let malformedCalls = 0;
  await fetchJurisdictionRecords(jurisdiction, { fetchImpl: async () => { malformedCalls++; return { ok: true, json: async () => { throw new Error('bad json'); } }; } });
  t('a malformed response body makes exactly one request, no fallback retry', malformedCalls, 1);
}

// ── buildIndex: orchestration, per-jurisdiction isolation, summary stats ──
{
  const jurisdictions = [
    { fips: '11111', name: 'Filtered County', serviceUrl: 'https://a.gov/MapServer/0', fieldMap: { parcel_id: 'PIN', area_acres: 'ACRES' } },
    { fips: '22222', name: 'Unfiltered County', serviceUrl: 'https://b.gov/MapServer/0', fieldMap: { parcel_id: 'PIN' } },
    { fips: '33333', name: 'Dead County', serviceUrl: 'https://c.gov/MapServer/0', fieldMap: { parcel_id: 'PIN' } },
  ];
  const stubFeatures = (n) => ({
    type: 'FeatureCollection',
    features: Array.from({ length: n }, (_, i) => ({ type: 'Feature', properties: { PIN: String(i), ACRES: 10 + i }, geometry: null })),
  });
  const fetchImpl = async (url) => {
    if (url.includes('a.gov')) return { ok: true, json: async () => stubFeatures(3) };
    if (url.includes('b.gov')) return { ok: true, json: async () => stubFeatures(2) };
    return { ok: false, status: 503 };
  };

  const index = await buildIndex(jurisdictions, { fetchImpl, concurrency: 2 });

  t('total parcels combines only the successful jurisdictions', index.meta.total_parcels, 5);
  t('one jurisdiction is size-filtered', index.meta.jurisdictions_size_filtered, 1);
  t('one jurisdiction is an unfiltered sample', index.meta.jurisdictions_unfiltered_sample, 1);
  t('one jurisdiction failed', index.meta.jurisdictions_failed, 1);
  ok('a dead jurisdiction does not abort the whole batch', index.jurisdiction_summaries.some(s => s.fips === '33333' && s.status === 'failed'));
  ok('the caveat explains the sample-vs-filtered distinction', index.meta.caveat.includes('unfiltered_sample'));
  ok('the caveat states proximity/constraint criteria are not in this index', index.meta.caveat.includes('Proximity'));
  t('default threshold is used when not overridden', index.meta.threshold_acres, DEFAULT_THRESHOLD_ACRES);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
