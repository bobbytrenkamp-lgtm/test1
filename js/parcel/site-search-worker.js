/* js/parcel/site-search-worker.js — runs the national-index search (fetch +
 * evaluate) off the main thread.
 *
 * WHY: a nationwide search with no state filter evaluates every record in
 * the precomputed index (85,811 records as of 2026-08 -- see
 * data/site_search/manifest.json). Measured directly: PARCEL_SITE_SEARCH
 * .search() over that many candidates takes ~680ms of uninterruptible
 * main-thread execution for a broad criteria set -- long past the point a
 * tab reads as frozen (no scroll, no click, nothing paints). Fetching the
 * state partitions was already async (site-search-index.js's loadStates());
 * this moves the CPU-bound evaluation step off the main thread too, and
 * does the fetching here as well so the (also real, ~400ms+) cost of
 * moving tens of thousands of parsed JSON records across the postMessage
 * boundary never has to happen -- only `criteria`/`opts` (tiny) go in, and
 * only the evaluated result comes back out.
 *
 * `self.window = self` lets js/parcel/site-search.js and
 * js/parcel/site-search-index.js -- both written for a <script> tag that
 * assigns to `window.X` -- run completely unmodified in a worker's global
 * scope via importScripts(). Those files remain the single source of truth
 * for partition loading and for match/reject/indeterminate evaluation (see
 * their own headers); this worker does not reimplement or fork any of that
 * logic, just relocates where it runs. PARCEL_GEO/PARCEL_ASSEMBLAGE are not
 * loaded here -- site-search.js already treats both as optional and
 * degrades to its documented fallback (no polygon-area fallback, plain-
 * string owner check) when absent, exactly as it would on the main thread
 * before either optional script has loaded.
 *
 * MESSAGE PROTOCOL (deliberately thin -- this is transport, not logic):
 *   in  {type:'search', id, criteria, opts:{unknownPolicy, concurrency}}
 *   in  {type:'abort', id}
 *   out {type:'progress', id, progress}   -- zero or more, mirrors onProgress
 *   out {type:'result', id, result}       -- exactly one, on success
 *   out {type:'error', id, error}         -- exactly one, on failure
 * AbortSignal itself cannot cross postMessage, so each in-flight search gets
 * its own AbortController built INSIDE the worker; an 'abort' message for
 * that id calls .abort() on it, which is what site-search-index.js's
 * loadStates() already checks between partition fetches -- same semantics
 * as an aborted main-thread search, just relayed by id instead of by object
 * identity.
 */
self.window = self;
importScripts('site-search.js', 'site-search-index.js');

const _controllers = new Map(); // search id -> AbortController

self.onmessage = async (e) => {
  const msg = e.data || {};

  if (msg.type === 'abort') {
    const c = _controllers.get(msg.id);
    if (c) c.abort();
    return;
  }

  if (msg.type !== 'search') return;
  const { id, criteria, opts } = msg;
  const o = opts || {};
  const controller = new AbortController();
  _controllers.set(id, controller);

  try {
    const result = await self.PARCEL_SITE_SEARCH_INDEX.searchNational(criteria, {
      unknownPolicy: o.unknownPolicy,
      concurrency: o.concurrency,
      signal: controller.signal,
      onProgress: (progress) => self.postMessage({ type: 'progress', id, progress }),
    });
    self.postMessage({ type: 'result', id, result });
  } catch (err) {
    self.postMessage({ type: 'error', id, error: (err && err.message) || String(err) });
  } finally {
    _controllers.delete(id);
  }
};
