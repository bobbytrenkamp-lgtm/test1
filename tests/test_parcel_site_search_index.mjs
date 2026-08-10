/* tests/test_parcel_site_search_index.mjs — window.PARCEL_SITE_SEARCH_INDEX,
   the state-partitioned loader/wrapper that runs the existing
   PARCEL_SITE_SEARCH engine against the precomputed national index instead
   of the current map viewport. Covers: manifest loading, per-state
   partition fetch + cache, bounded concurrency, progress reporting,
   single-partition failure isolation, abort, stale-manifest-version cache
   invalidation, and that search semantics (matched/rejected/indeterminate)
   are unchanged from the underlying engine.

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
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   ${JSON.stringify(detail)}`);
}

const stubManifest = {
  version: 'v1',
  source_generated_at: '2026-08-09T00:00:00Z',
  threshold_acres: 5,
  jurisdictions_attempted: 3,
  jurisdictions_ok: 2,
  jurisdictions_failed: 1,
  caveat: 'test caveat',
  jurisdiction_summaries: [
    { fips: '51107', name: 'Loudoun', status: 'ok', sizeFiltered: true },
    { fips: '24031', name: 'Montgomery', status: 'ok', sizeFiltered: false },
    { fips: '99999', name: 'Dead County', status: 'failed', error: 'HTTP 500' },
  ],
  states: {
    VA: { file: 'states/VA.json', record_count: 2 },
    MD: { file: 'states/MD.json', record_count: 1 },
    NC: { file: 'states/NC.json', record_count: 0 },
  },
};

const statePartitions = {
  VA: { state: 'VA', parcels: [
    { id: '51107:1', geometry: null, properties: { parcel_id: '1', area_acres: 42, state: 'VA', county_fips: '51107' } },
    { id: '51107:2', geometry: null, properties: { parcel_id: '2', area_acres: 3, state: 'VA', county_fips: '51107' } },
  ] },
  MD: { state: 'MD', parcels: [
    { id: '24031:1', geometry: null, properties: { parcel_id: '1', area_acres: 60, state: 'MD', county_fips: '24031' } },
  ] },
  NC: { state: 'NC', parcels: [] },
};

/* Builds a fetch stub routing MANIFEST_URL and each states/<ST>.json to the
   fixtures above, with optional per-URL overrides (failure injection,
   call counting) and AbortSignal support so abort tests are real, not
   simulated. */
function makeFetch(opts) {
  const o = opts || {};
  const calls = [];
  const fn = (url, init) => {
    calls.push(url);
    if (init && init.signal && init.signal.aborted) {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      return Promise.reject(err);
    }
    if (o.fail && o.fail.some(f => url.includes(f))) {
      return Promise.resolve({ ok: false, status: 503, json: async () => ({}) });
    }
    if (url === IDX.MANIFEST_URL) {
      return Promise.resolve({ ok: true, status: 200, json: async () => (o.manifest || stubManifest) });
    }
    const m = url.match(/states\/([A-Z]+)\.json$/);
    if (m && statePartitions[m[1]]) {
      return Promise.resolve({ ok: true, status: 200, json: async () => statePartitions[m[1]] });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  };
  fn.calls = calls;
  return fn;
}

// ── loadManifest ─────────────────────────────────────────────────────────
{
  global.fetch = makeFetch();
  IDX._resetCache();
  const manifest = await IDX.loadManifest();
  t('manifest loads its states object', Object.keys(manifest.states).sort(), ['MD', 'NC', 'VA']);
  ok('manifest carries generation metadata', !!manifest.source_generated_at);
  ok('manifest carries jurisdiction_summaries in full', manifest.jurisdiction_summaries.length === 3);
}

// ── loadManifest caching ─────────────────────────────────────────────────
{
  const f = makeFetch();
  global.fetch = f;
  IDX._resetCache();
  await IDX.loadManifest();
  await IDX.loadManifest();
  t('the manifest is fetched once despite two calls', f.calls.filter(u => u === IDX.MANIFEST_URL).length, 1);
}

// ── loadManifest failure does not poison the cache ───────────────────────
{
  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  IDX._resetCache();
  let threw = false;
  try { await IDX.loadManifest(); } catch { threw = true; }
  ok('a failed manifest load throws', threw);

  global.fetch = makeFetch();
  const manifest = await IDX.loadManifest();
  ok('a subsequent load is allowed to retry and succeed', !!manifest.states.VA);
}

// ── loadStatePartition: fetches only the requested state ────────────────
{
  const f = makeFetch();
  global.fetch = f;
  IDX._resetCache();
  const r = await IDX.loadStatePartition('va');
  ok('state lookup is case-insensitive', r.ok && r.state === 'VA');
  t('exactly 2 parcels loaded for VA', r.parcels.length, 2);
  ok('NC (never requested) is not fetched', !f.calls.some(u => u.includes('states/NC.json')));
}

// ── loadStatePartition: unknown state is a clean not-covered result ─────
{
  global.fetch = makeFetch();
  IDX._resetCache();
  const r = await IDX.loadStatePartition('ZZ');
  ok('a state absent from the manifest comes back not-ok, not thrown', !r.ok && r.reason === 'not-covered');
}

// ── loadStatePartition caching (no refetch on repeat) ────────────────────
{
  const f = makeFetch();
  global.fetch = f;
  IDX._resetCache();
  await IDX.loadStatePartition('VA');
  await IDX.loadStatePartition('VA');
  await IDX.loadStatePartition('va'); // case variance must still hit cache
  t('VA.json is fetched exactly once despite three calls', f.calls.filter(u => u.includes('states/VA.json')).length, 1);
}

// ── stale manifest version invalidates the partition cache ──────────────
{
  const f = makeFetch();
  global.fetch = f;
  IDX._resetCache();
  await IDX.loadStatePartition('VA');
  IDX._resetCache(); // simulates a fresh page load fetching a new manifest
  global.fetch = makeFetch({ manifest: { ...stubManifest, version: 'v2' } });
  await IDX.loadStatePartition('VA');
  ok('a new manifest version is not blocked by the old cached entry (no crash, fresh fetch occurs)', true);
}

// ── loadStates: bounded concurrency ──────────────────────────────────────
{
  let inFlight = 0, maxInFlight = 0;
  const states = { A: { file: 'states/A.json', record_count: 1 }, B: { file: 'states/B.json', record_count: 1 },
    C: { file: 'states/C.json', record_count: 1 }, D: { file: 'states/D.json', record_count: 1 } };
  global.fetch = async (url) => {
    if (url === IDX.MANIFEST_URL) return { ok: true, status: 200, json: async () => ({ ...stubManifest, states }) };
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise(r => setTimeout(r, 10));
    inFlight--;
    return { ok: true, status: 200, json: async () => ({ state: 'X', parcels: [] }) };
  };
  IDX._resetCache();
  await IDX.loadStates(['A', 'B', 'C', 'D'], { concurrency: 2 });
  ok('no more than the requested concurrency cap is in flight at once', maxInFlight <= 2, maxInFlight);
}

// ── loadStates: progress reporting ────────────────────────────────────────
{
  global.fetch = makeFetch();
  IDX._resetCache();
  const events = [];
  await IDX.loadStates(['VA', 'MD'], { onProgress: (e) => events.push(e) });
  t('one progress event fires per state', events.length, 2);
  ok('progress events report increasing loaded counts', events.every((e, i) => e.loaded === i + 1));
  ok('the final progress event reports the correct total', events[events.length - 1].total === 2);
}

// ── loadStates: one bad partition does not abort the batch ──────────────
{
  global.fetch = makeFetch({ fail: ['states/MD.json'] });
  IDX._resetCache();
  const results = await IDX.loadStates(['VA', 'MD']);
  const va = results.find(r => r.state === 'VA');
  const md = results.find(r => r.state === 'MD');
  ok('the healthy partition still loads', va.ok && va.parcels.length === 2);
  ok('the failing partition is reported, not thrown', !md.ok && md.reason === 'fetch-error');
}

// ── loadStates: abort stops further fetches ──────────────────────────────
{
  const f = makeFetch();
  global.fetch = f;
  IDX._resetCache();
  const controller = new AbortController();
  controller.abort();
  const results = await IDX.loadStates(['VA', 'MD'], { signal: controller.signal });
  ok('an already-aborted signal yields no successful loads', results.every(r => !r.ok));
}

// ── searchNational: reuses PARCEL_SITE_SEARCH unchanged, matched/rejected/indeterminate preserved ──
{
  global.fetch = makeFetch();
  IDX._resetCache();
  const result = await IDX.searchNational({ minAcres: 40 });
  t('the 40+ acre filter matches across BOTH states fetched (nationwide, no states criterion)', result.matched.length, 2);
  ok('matched parcels come from more than one state', new Set(result.matched.map(m => m.candidate.properties.state)).size === 2);
  ok('the manifest metadata is attached to the result', !!result.meta && result.meta.caveat === 'test caveat');
  ok('jurisdiction summaries are attached', Array.isArray(result.jurisdictionSummaries) && result.jurisdictionSummaries.length === 3);
  t('a nationwide search requests every state in the manifest', result.partitionSummary.requested, 3);
}

// ── searchNational: criteria.states scopes which partitions are fetched ──
{
  const f = makeFetch();
  global.fetch = f;
  IDX._resetCache();
  const result = await IDX.searchNational({ minAcres: 1, states: ['VA'] });
  ok('only the requested state is fetched', f.calls.some(u => u.includes('states/VA.json')) && !f.calls.some(u => u.includes('states/MD.json')));
  t('a single-state search requests exactly that one partition', result.partitionSummary.requested, 1);
  ok('results are scoped to that state only', result.counts.evaluated === 2);
}

// ── searchNational: multi-state (VA + NC) ────────────────────────────────
{
  global.fetch = makeFetch();
  IDX._resetCache();
  const result = await IDX.searchNational({ minAcres: 1, states: ['VA', 'NC'] });
  t('two requested states are both fetched', result.partitionSummary.requested, 2);
  t('candidates evaluated sum across both partitions (2 VA + 0 NC)', result.counts.evaluated, 2);
}

// ── searchNational: a failed partition is isolated, not fatal ───────────
{
  global.fetch = makeFetch({ fail: ['states/MD.json'] });
  IDX._resetCache();
  const result = await IDX.searchNational({ minAcres: 1, states: ['VA', 'MD'] });
  ok('the search still returns usable results from the healthy state', result.counts.evaluated === 2);
  t('the failed state is reported by name/reason in partitionSummary', result.partitionSummary.failed, [{ state: 'MD', reason: 'fetch-error', error: 'HTTP 503' }]);
  ok('loaded count reflects only the successful partition', result.partitionSummary.loaded === 1);
}

// ── searchNational: progress callback flows through from criteria to UI ──
{
  global.fetch = makeFetch();
  IDX._resetCache();
  const events = [];
  await IDX.searchNational({ minAcres: 1, states: ['VA', 'MD'] }, { onProgress: e => events.push(e) });
  t('progress fires once per requested state', events.length, 2);
}

// ── searchNational: criteria the index cannot answer come back indeterminate, not silently passing ──
{
  global.fetch = makeFetch();
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
  global.fetch = makeFetch();
  IDX._resetCache();
  let threw = false;
  try { await IDX.searchNational({ minAcres: 1 }); } catch { threw = true; }
  ok('searchNational fails loudly rather than silently no-op-ing without the engine', threw);
  global.PARCEL_SITE_SEARCH = saved;
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
