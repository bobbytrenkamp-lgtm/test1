/* js/parcel/site-search-index.js
 * window.PARCEL_SITE_SEARCH_INDEX — search across every wired jurisdiction
 * at once, using the precomputed, state-partitioned index
 * data/parcel_pipeline/build_national_site_index.mjs +
 * data/parcel_pipeline/split_site_search_index.mjs write.
 *
 * This is deliberately a SEPARATE mode from js/parcel/find-sites.js's
 * default viewport search, not a replacement for it. That module's own
 * header is explicit that it searches "parcels currently loaded on the
 * map" and that "there is no bulk 'all parcels in the US' store anywhere in
 * this system" -- this file is that store's honest, narrowly-scoped
 * counterpart: a periodically-refreshed, size-filtered, multi-jurisdiction
 * index, not a live national database.
 *
 * PARTITIONED LOADING (STORE EVERYTHING, LOAD ONLY WHAT IS NEEDED)
 * ------------------------------------------------------------------
 * The index used to be one ~42MB data/site_search_index.json fetched in
 * full on every national search, even a single-state one. It is now split
 * by state (data/site_search/manifest.json + data/site_search/states/
 * <ST>.json, see split_site_search_index.mjs) -- a search scoped to
 * criteria.states fetches only those partitions; a search with no states
 * criterion fetches every partition in the manifest (still progressively,
 * with a concurrency cap, not as one request). No parcel coverage changed:
 * every record that used to be in the monolithic file is still reachable,
 * just not downloaded until a search actually needs that state.
 *
 * Reuses window.PARCEL_SITE_SEARCH's search()/evaluateCandidate() UNCHANGED
 * against the loaded partition records -- this file adds a loading/caching
 * layer in front of the SAME engine, no parallel evaluation logic. That
 * engine already returns 'indeterminate' for any criterion whose data is
 * absent from a candidate (see site-search.js's own header) -- index
 * records have no `.proximity`/`.constraints`/`.envelope`, so distance and
 * constraint criteria correctly come back indeterminate rather than
 * silently passing or failing.
 *
 * Depends on: window.PARCEL_SITE_SEARCH (required).
 */
window.PARCEL_SITE_SEARCH_INDEX = (function () {
  'use strict';

  const MANIFEST_URL = 'data/site_search/manifest.json';
  const partitionUrl = (state) => `data/site_search/states/${state}.json`;

  const DEFAULT_CONCURRENCY = 6;
  // Bounded LRU: a user who searches many states in one session should not
  // accumulate unlimited cached partitions in memory. 20 states is enough
  // headroom for any real multi-state search this UI exposes while still
  // being a real cap, not a nominal one.
  const MAX_CACHED_PARTITIONS = 20;

  let _manifestPromise = null;

  function loadManifest() {
    if (_manifestPromise) return _manifestPromise;
    _manifestPromise = (async () => {
      const res = await fetch(MANIFEST_URL);
      if (!res.ok) throw new Error(`site search manifest HTTP ${res.status}`);
      const json = await res.json();
      if (!json || !json.states) throw new Error('site search manifest has no states');
      return json;
    })();
    // A failed load must not poison the cache forever -- the next attempt
    // should be allowed to retry, same convention as proximity-layers.js's
    // loadInfrastructureLayers().
    _manifestPromise.catch(() => { _manifestPromise = null; });
    return _manifestPromise;
  }

  // state -> { version, promise } ; Map preserves insertion order, which
  // this uses as the LRU recency order (re-set on access = most recent).
  const _partitionCache = new Map();

  function _touch(state, entry) {
    _partitionCache.delete(state);
    _partitionCache.set(state, entry);
    while (_partitionCache.size > MAX_CACHED_PARTITIONS) {
      const oldest = _partitionCache.keys().next().value;
      _partitionCache.delete(oldest);
    }
  }

  /* Loads one state's partition, honoring the manifest's cache-invalidating
   * version: a cached entry from a stale manifest version is treated as a
   * miss, not reused. Never throws -- a dead or missing partition comes
   * back as { ok: false, error }, so one bad state cannot abort a
   * multi-state search (the same failure-isolation principle every other
   * batch loader in this codebase already follows). */
  async function loadStatePartition(state, opts) {
    const o = opts || {};
    const key = String(state).toUpperCase();
    const manifest = await loadManifest();

    const entry = manifest.states[key];
    if (!entry) {
      return { state: key, ok: false, reason: 'not-covered', error: 'not covered by the national index', parcels: [] };
    }

    const cached = _partitionCache.get(key);
    if (cached && cached.version === manifest.version) {
      _touch(key, cached);
      return cached.promise;
    }

    const promise = (async () => {
      let res;
      try {
        res = await fetch(partitionUrl(key), { signal: o.signal });
      } catch (e) {
        if (e && e.name === 'AbortError') return { state: key, ok: false, reason: 'aborted', error: e.message, parcels: [] };
        return { state: key, ok: false, reason: 'fetch-error', error: e.message, parcels: [] };
      }
      if (!res.ok) return { state: key, ok: false, reason: 'fetch-error', error: `HTTP ${res.status}`, parcels: [] };
      let json;
      try {
        json = await res.json();
      } catch {
        return { state: key, ok: false, reason: 'fetch-error', error: 'non-JSON response', parcels: [] };
      }
      if (!json || !Array.isArray(json.parcels)) {
        return { state: key, ok: false, reason: 'fetch-error', error: 'partition has no parcels array', parcels: [] };
      }
      return { state: key, ok: true, parcels: json.parcels, recordCount: entry.record_count };
    })();

    _touch(key, { version: manifest.version, promise });
    return promise;
  }

  /* Loads a set of states with a bounded concurrency cap (never fires more
   * than `concurrency` requests at once) and reports progress as each
   * settles -- required for a national/multi-state search to show honest,
   * incremental feedback instead of freezing until every partition lands.
   * A caller's AbortSignal stops the queue from starting new fetches once
   * aborted; in-flight fetches are handed the same signal directly. */
  async function loadStates(states, opts) {
    const o = opts || {};
    const concurrency = Math.max(1, o.concurrency || DEFAULT_CONCURRENCY);
    const onProgress = typeof o.onProgress === 'function' ? o.onProgress : () => {};
    const signal = o.signal;

    const queue = states.slice();
    const results = [];
    let loaded = 0;

    async function worker() {
      while (queue.length) {
        if (signal && signal.aborted) return;
        const state = queue.shift();
        const r = await loadStatePartition(state, { signal });
        results.push(r);
        loaded++;
        onProgress({ loaded, total: states.length, state, ok: r.ok, reason: r.reason, error: r.error });
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, states.length) }, worker));
    return results;
  }

  /* Runs a PARCEL_SITE_SEARCH search across the precomputed national index
   * instead of the current map viewport.
   *
   *   criteria: same shape as PARCEL_SITE_SEARCH's CRITERIA. If
   *     criteria.states is set, ONLY those state partitions are fetched --
   *     a "Virginia + North Carolina" search never touches the other 29
   *     states. With no states criterion, every state in the manifest is
   *     fetched (still partition-by-partition, concurrency-capped, not as
   *     one request) -- a "nationwide" search.
   *   opts.unknownPolicy: 'exclude' (default) | 'include'
   *   opts.concurrency: max simultaneous partition fetches (default 6)
   *   opts.onProgress({loaded, total, state, ok, reason, error}): called as
   *     each partition settles, so a caller can render "7/12 states loaded"
   *     rather than freezing until the whole search finishes.
   *   opts.signal: an AbortSignal. Aborting stops any not-yet-started
   *     partition fetch and is passed to in-flight fetches; already-loaded
   *     (cached) partitions are unaffected since they resolve immediately.
   *
   * A partition that fails to load does NOT abort the whole search -- its
   * records are simply absent from the candidate set, and it is reported
   * in the returned `partitionSummary.failed` so the caller can say
   * "11/12 state partitions searched, Arizona unavailable" rather than
   * silently under-counting or throwing away otherwise-usable results.
   *
   * Returns the same shape PARCEL_SITE_SEARCH.search() does, plus `meta`
   * (generation metadata from the manifest -- when it was built, which
   * jurisdictions were size-filtered vs. an unfiltered sample) and
   * `partitionSummary` (which states were requested/loaded/failed this
   * call) so a caller can render an honest "as of <date>, covering N
   * jurisdictions" caveat rather than presenting this as a live, complete
   * national search. */
  async function _searchNationalDirect(criteria, opts) {
    const engine = window.PARCEL_SITE_SEARCH;
    if (!engine) throw new Error('PARCEL_SITE_SEARCH_INDEX requires window.PARCEL_SITE_SEARCH to be loaded first');

    const o = opts || {};
    const manifest = await loadManifest();

    const requestedStates = Array.isArray(criteria && criteria.states) && criteria.states.length
      ? [...new Set(criteria.states.map(s => String(s).toUpperCase()))]
      : Object.keys(manifest.states).sort();

    const partitionResults = await loadStates(requestedStates, {
      concurrency: o.concurrency,
      onProgress: o.onProgress,
      signal: o.signal,
    });

    const candidates = [];
    const failed = [];
    for (const r of partitionResults) {
      if (r.ok) candidates.push(...r.parcels);
      else failed.push({ state: r.state, reason: r.reason, error: r.error });
    }

    const aborted = !!(o.signal && o.signal.aborted);

    const result = engine.search(candidates, criteria, o);
    return {
      ...result,
      meta: {
        generated_at: manifest.source_generated_at,
        threshold_acres: manifest.threshold_acres,
        jurisdictions_attempted: manifest.jurisdictions_attempted,
        jurisdictions_ok: manifest.jurisdictions_ok,
        jurisdictions_failed: manifest.jurisdictions_failed,
        caveat: manifest.caveat,
      },
      jurisdictionSummaries: manifest.jurisdiction_summaries,
      partitionSummary: {
        requested: requestedStates.length,
        loaded: requestedStates.length - failed.length,
        failed,
        aborted,
      },
    };
  }

  function _resetCache() { _manifestPromise = null; _partitionCache.clear(); }

  /* ── Worker dispatch ─────────────────────────────────────────────────
   * A nationwide search evaluates 85,000+ index records; measured at
   * ~680ms of blocking main-thread execution (see
   * js/parcel/site-search-worker.js's header). When Worker is available,
   * searchNational() hands the whole fetch+evaluate pipeline to
   * site-search-worker.js -- which reuses _searchNationalDirect() above
   * unmodified via importScripts() -- and only ever sends `criteria`/
   * `opts` across the boundary, never the candidate array itself. One
   * worker is created lazily and reused across searches rather than
   * spun up per search (avoiding repeated script-parse cost); a worker
   * that errors out (e.g. the script 404s) is dropped so the next search
   * gets a fresh instance instead of reusing a dead one. */
  const WORKER_URL = 'js/parcel/site-search-worker.js';
  const WORKERS_SUPPORTED = typeof Worker !== 'undefined';

  let _worker = null;
  let _workerReqSeq = 0;
  const _pending = new Map(); // request id -> {resolve, reject, onProgress}

  function _getWorker() {
    if (_worker) return _worker;
    _worker = new Worker(WORKER_URL);
    _worker.onmessage = (e) => {
      const msg = e.data || {};
      const p = _pending.get(msg.id);
      if (!p) return; // a stale/aborted request's late message -- ignore
      if (msg.type === 'progress') { p.onProgress(msg.progress); return; }
      _pending.delete(msg.id);
      if (msg.type === 'result') p.resolve(msg.result);
      else p.reject(new Error(msg.error || 'national search worker failed'));
    };
    _worker.onerror = (e) => {
      // The worker itself crashed (e.g. importScripts couldn't load) --
      // reject everything in flight rather than leaving callers hanging
      // forever, and drop the dead instance so the NEXT search creates a
      // fresh worker instead of reusing a broken one.
      for (const p of _pending.values()) p.reject(new Error((e && e.message) || 'national search worker error'));
      _pending.clear();
      _worker = null;
    };
    return _worker;
  }

  function _searchNationalInWorker(criteria, opts) {
    const o = opts || {};
    return new Promise((resolve, reject) => {
      const id = ++_workerReqSeq;
      const worker = _getWorker();
      _pending.set(id, {
        resolve,
        reject,
        onProgress: typeof o.onProgress === 'function' ? o.onProgress : () => {},
      });
      if (o.signal) {
        if (o.signal.aborted) worker.postMessage({ type: 'abort', id });
        else o.signal.addEventListener('abort', () => worker.postMessage({ type: 'abort', id }), { once: true });
      }
      worker.postMessage({
        type: 'search', id, criteria,
        opts: { unknownPolicy: o.unknownPolicy, concurrency: o.concurrency },
      });
    });
  }

  /* Public entry point. Same signature and return shape as
   * _searchNationalDirect() -- callers (js/parcel/find-sites.js and its
   * tests) never need to know or care whether a given search ran on the
   * main thread or in a worker. Falls back to the main thread when Worker
   * isn't available at all (older browsers, and every current test
   * environment: neither Node nor jsdom implements Worker) or when the
   * worker path itself fails (e.g. the script fails to load) -- a search
   * must still work in a browser that supports Worker but hits some
   * worker-specific edge case, not silently return nothing. */
  async function searchNational(criteria, opts) {
    if (WORKERS_SUPPORTED) {
      try {
        return await _searchNationalInWorker(criteria, opts);
      } catch (e) {
        // fall through to the main thread below
      }
    }
    return _searchNationalDirect(criteria, opts);
  }

  return {
    loadManifest, loadStatePartition, loadStates, searchNational, _resetCache,
    _searchNationalDirect, _searchNationalInWorker, _getWorker,
    MANIFEST_URL, WORKER_URL, WORKERS_SUPPORTED,
  };
})();
