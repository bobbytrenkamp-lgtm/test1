/* tests/test_parcel_site_search_worker_dispatch.mjs — the Worker-dispatch
   layer js/parcel/site-search-index.js adds in front of _searchNationalDirect
   (PR B). A nationwide search evaluates 85,000+ index records and measures
   at ~680ms of blocking main-thread execution -- see
   js/parcel/site-search-worker.js's header for the real numbers. This tests
   the DISPATCH/PROTOCOL logic (request id routing so overlapping searches
   don't cross streams, progress-callback forwarding, abort translation from
   an AbortSignal into a postMessage, crash recovery, and fallback to the
   main thread when the worker path itself fails) using a fake Worker the
   test drives directly -- the same style as test_parcel_site_search_index
   .mjs's makeFetch() stub for `fetch`.

   What this file deliberately does NOT test: the real contents of
   js/parcel/site-search-worker.js (self.window=self + importScripts +
   onmessage) cannot execute inside Node (no importScripts, no browser
   Worker runtime) -- that script is covered by a live Playwright
   verification instead (see the PR description), which confirms a real
   browser Worker actually runs it and returns correct results.

   Run:  node tests/test_parcel_site_search_worker_dispatch.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;

class FakeWorker {
  constructor(url) {
    this.url = url;
    this.posted = [];
    this.onmessage = null;
    this.onerror = null;
    FakeWorker.instances.push(this);
  }
  postMessage(msg) { this.posted.push(msg); }
  _reply(msg) { if (this.onmessage) this.onmessage({ data: msg }); }
  _crash(message) { if (this.onerror) this.onerror({ message }); }
}
FakeWorker.instances = [];
global.Worker = FakeWorker;

require('../js/parcel/site-search.js');
require('../js/parcel/site-search-index.js');
const IDX = global.PARCEL_SITE_SEARCH_INDEX;

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   ${JSON.stringify(detail)}`);
}
function t(name, actual, expected) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), { got: actual, want: expected });
}

function lastWorker() { return FakeWorker.instances[FakeWorker.instances.length - 1]; }

// ── Worker support is detected and used when a Worker global exists ─────
{
  ok('WORKERS_SUPPORTED is true when a Worker global is present', IDX.WORKERS_SUPPORTED === true);
}

// ── A search dispatches to the worker, not the main-thread fetch path ───
{
  IDX._resetCache();
  const before = FakeWorker.instances.length;
  const p = IDX.searchNational({ minAcres: 5 });
  ok('a new worker instance is created for the search', FakeWorker.instances.length === before + 1);
  const w = lastWorker();
  ok('exactly one message is posted to start the search', w.posted.length === 1);
  t('the posted message carries type search and the criteria', { type: w.posted[0].type, criteria: w.posted[0].criteria },
    { type: 'search', criteria: { minAcres: 5 } });

  const fakeResult = { matched: [{ id: 'x' }], rejected: [], indeterminate: [], counts: { evaluated: 1, matched: 1, rejected: 0, indeterminate: 0 } };
  w._reply({ type: 'result', id: w.posted[0].id, result: fakeResult });
  const result = await p;
  t('the resolved result is exactly what the worker posted back', result, fakeResult);
}

// ── The SAME worker instance is reused across searches ──────────────────
{
  const before = FakeWorker.instances.length;
  const p = IDX.searchNational({ minAcres: 1 });
  ok('no new worker is spun up for a second search', FakeWorker.instances.length === before);
  const w = lastWorker();
  w._reply({ type: 'result', id: w.posted[w.posted.length - 1].id, result: { counts: {} } });
  await p;
}

// ── Progress messages are forwarded to onProgress by request id ─────────
{
  const events = [];
  const p = IDX.searchNational({ minAcres: 1 }, { onProgress: (e) => events.push(e) });
  const w = lastWorker();
  const id = w.posted[w.posted.length - 1].id;
  w._reply({ type: 'progress', id, progress: { loaded: 1, total: 3 } });
  w._reply({ type: 'progress', id, progress: { loaded: 2, total: 3 } });
  w._reply({ type: 'result', id, result: { counts: {} } });
  await p;
  t('every progress message reaches the caller in order', events, [{ loaded: 1, total: 3 }, { loaded: 2, total: 3 }]);
}

// ── Overlapping searches route responses by id, never cross streams ─────
{
  const w = lastWorker();
  const p1 = IDX.searchNational({ minAcres: 1 });
  const id1 = w.posted[w.posted.length - 1].id;
  const p2 = IDX.searchNational({ minAcres: 2 });
  const id2 = w.posted[w.posted.length - 1].id;
  ok('two overlapping searches get distinct request ids', id1 !== id2);

  // Reply to the SECOND search first, to prove ordering of replies doesn't
  // determine which promise resolves with which result.
  w._reply({ type: 'result', id: id2, result: { tag: 'second' } });
  w._reply({ type: 'result', id: id1, result: { tag: 'first' } });
  const [r1, r2] = await Promise.all([p1, p2]);
  t('the first search resolves with the first search\'s own result', r1, { tag: 'first' });
  t('the second search resolves with the second search\'s own result', r2, { tag: 'second' });
}

// ── An error message rejects, then falls back to the main thread ────────
{
  global.fetch = async (url) => {
    if (String(url).endsWith('manifest.json')) {
      return { ok: true, status: 200, json: async () => ({ version: 'v1', states: { VA: { file: 'states/VA.json', record_count: 1 } } }) };
    }
    return { ok: true, status: 200, json: async () => ({ state: 'VA', parcels: [{ id: 'p1', properties: { area_acres: 10, state: 'VA' } }] }) };
  };
  IDX._resetCache();
  const p = IDX.searchNational({ minAcres: 1 });
  const w = lastWorker();
  w._reply({ type: 'error', id: w.posted[w.posted.length - 1].id, error: 'boom' });
  const result = await p;
  ok('a worker-reported error does not surface as a thrown/empty result -- it falls back to the main thread',
    result.counts.evaluated === 1);
}

// ── A worker crash (onerror) rejects everything pending and drops the instance ──
{
  IDX._resetCache();
  const before = FakeWorker.instances.length;
  const p1 = IDX.searchNational({ minAcres: 1 });
  const w = lastWorker();
  ok('a crash test starts with a live worker instance', FakeWorker.instances.length === before + 1 || before > 0);
  w._crash('worker script failed to load');
  const result = await p1;
  ok('a crashed worker still resolves via the main-thread fallback rather than hanging forever',
    typeof result === 'object' && result !== null);

  const afterCrashInstances = FakeWorker.instances.length;
  const p2 = IDX.searchNational({ minAcres: 1 });
  const w2 = lastWorker();
  ok('the next search after a crash creates a fresh worker instead of reusing the dead one',
    FakeWorker.instances.length > afterCrashInstances && w2 !== w);
  w2._reply({ type: 'result', id: w2.posted[w2.posted.length - 1].id, result: { counts: {} } });
  await p2;
}

// ── Abort: an already-aborted signal posts an abort message immediately ──
{
  IDX._resetCache();
  const controller = new AbortController();
  controller.abort();
  const p = IDX.searchNational({ minAcres: 1 }, { signal: controller.signal });
  const w = lastWorker();
  // The worker instance is reused across tests, so its `.posted` log may
  // already carry earlier searches' messages -- take the LAST 'search'
  // message, not the first, to find the one THIS call just sent.
  const searchMsg = w.posted.filter((m) => m.type === 'search').pop();
  const abortMsg = w.posted.find((m) => m.type === 'abort' && m.id === searchMsg.id);
  ok('an already-aborted signal immediately posts an abort message for that request id', !!abortMsg);
  w._reply({ type: 'result', id: searchMsg.id, result: { counts: {}, aborted: true } });
  await p;
}

// ── Abort: a signal that fires later posts abort exactly once, for the right id ──
{
  IDX._resetCache();
  const controller = new AbortController();
  const p = IDX.searchNational({ minAcres: 1 }, { signal: controller.signal });
  const w = lastWorker();
  const searchMsg = w.posted.filter((m) => m.type === 'search').pop();
  ok('no abort has been posted for THIS request yet (only, if any, earlier tests\' unrelated ids)',
    !w.posted.some((m) => m.type === 'abort' && m.id === searchMsg.id));
  controller.abort();
  const abortMsgs = w.posted.filter((m) => m.type === 'abort' && m.id === searchMsg.id);
  ok('aborting later posts exactly one abort message for that request', abortMsgs.length === 1, abortMsgs.length);
  w._reply({ type: 'result', id: searchMsg.id, result: { counts: {}, aborted: true } });
  await p;
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
