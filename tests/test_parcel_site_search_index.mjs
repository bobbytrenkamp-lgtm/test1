/* tests/test_parcel_site_search_index.mjs — window.PARCEL_SITE_SEARCH_INDEX,
   the loader/wrapper that runs the existing PARCEL_SITE_SEARCH engine
   against the precomputed multi-jurisdiction index instead of the current
   map viewport.

   Run:  node tests/test_parcel_site_search_index.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;

require('../js/parcel/site-search.js');
require('../js/parcel/site-search-index.js');

const IDX = global.PARCEL_SITE_SEARCH_INDEX;

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

const stubIndex = {
  meta: {
    generated_at: '2026-08-09T00:00:00Z',
    threshold_acres: 5,
    jurisdictions_ok: 2,
    jurisdictions_size_filtered: 1,
    jurisdictions_unfiltered_sample: 1,
    caveat: 'test caveat',
  },
  jurisdiction_summaries: [
    { fips: '51107', name: 'Loudoun', status: 'ok', sizeFiltered: true },
    { fips: '24031', name: 'Montgomery', status: 'ok', sizeFiltered: false },
  ],
  parcels: [
    { id: '51107:1', geometry: { type: 'Point', coordinates: [-77.5, 39.0] }, properties: { parcel_id: '1', area_acres: 42, state: 'VA', county_fips: '51107' } },
    { id: '51107:2', geometry: { type: 'Point', coordinates: [-77.4, 39.1] }, properties: { parcel_id: '2', area_acres: 3, state: 'VA', county_fips: '51107' } },
    { id: '24031:1', geometry: { type: 'Point', coordinates: [-77.1, 39.2] }, properties: { parcel_id: '1', area_acres: 60, state: 'MD', county_fips: '24031' } },
  ],
};

function stubFetch(body, status) {
  global.fetch = async () => ({
    ok: status === undefined || (status >= 200 && status < 300),
    status: status || 200,
    json: async () => body,
  });
}

// ── loadIndex ────────────────────────────────────────────────────────────
{
  stubFetch(stubIndex);
  IDX._resetCache();
  const loaded = await IDX.loadIndex();
  t('the index loads its parcels array', loaded.parcels.length, 3);
  ok('the index carries generation metadata', !!loaded.meta.generated_at);
}

// ── loadIndex caching ────────────────────────────────────────────────────
{
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => stubIndex }; };
  IDX._resetCache();
  await IDX.loadIndex();
  await IDX.loadIndex();
  t('the loader caches across calls', calls, 1);
  IDX._resetCache();
  await IDX.loadIndex();
  t('_resetCache forces a fresh fetch', calls, 2);
}

// ── loadIndex failure does not poison the cache ─────────────────────────
{
  stubFetch({}, 503);
  IDX._resetCache();
  let threw = false;
  try { await IDX.loadIndex(); } catch { threw = true; }
  ok('a failed load throws', threw);

  stubFetch(stubIndex);
  const loaded = await IDX.loadIndex();
  t('a subsequent load is allowed to retry and succeed', loaded.parcels.length, 3);
}

// ── searchNational: reuses PARCEL_SITE_SEARCH unchanged ─────────────────
{
  stubFetch(stubIndex);
  IDX._resetCache();
  const result = await IDX.searchNational({ minAcres: 40 });
  t('the 40+ acre filter matches across BOTH jurisdictions, not just one', result.matched.length, 2);
  ok('matched parcels come from more than one county', new Set(result.matched.map(m => m.candidate.properties.county_fips)).size === 2);
  ok('the index metadata is attached to the result', !!result.meta);
  t('the metadata caveat is passed through verbatim', result.meta.caveat, 'test caveat');
  ok('jurisdiction summaries are attached', Array.isArray(result.jurisdictionSummaries));
}

// ── searchNational: criteria the index cannot answer come back indeterminate, not silently passing ──
{
  stubFetch(stubIndex);
  IDX._resetCache();
  const result = await IDX.searchNational({ minAcres: 40, maxMilesToTransmission: 2 }, { unknownPolicy: 'include' });
  ok('a proximity criterion with no data on index records is indeterminate, not a false pass or fail',
    result.indeterminate.length === 2);
  ok('no parcel is silently matched on a criterion the index cannot evaluate', result.matched.length === 0);
}

// ── searchNational requires PARCEL_SITE_SEARCH to be loaded ─────────────
{
  const saved = global.PARCEL_SITE_SEARCH;
  delete global.PARCEL_SITE_SEARCH;
  stubFetch(stubIndex);
  IDX._resetCache();
  let threw = false;
  try { await IDX.searchNational({ minAcres: 1 }); } catch { threw = true; }
  ok('searchNational fails loudly rather than silently no-op-ing without the engine', threw);
  global.PARCEL_SITE_SEARCH = saved;
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
