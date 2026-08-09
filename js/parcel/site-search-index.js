/* js/parcel/site-search-index.js
 * window.PARCEL_SITE_SEARCH_INDEX — search across every wired jurisdiction
 * at once, using the precomputed index data/parcel_pipeline/
 * build_national_site_index.mjs writes.
 *
 * This is deliberately a SEPARATE mode from js/parcel/find-sites.js's
 * default viewport search, not a replacement for it. That module's own
 * header is explicit that it searches "parcels currently loaded on the
 * map" and that "there is no bulk 'all parcels in the US' store anywhere in
 * this system" -- this file is that store's honest, narrowly-scoped
 * counterpart: a periodically-refreshed, size-filtered, multi-jurisdiction
 * index, not a live national database.
 *
 * Reuses window.PARCEL_SITE_SEARCH's search()/evaluateCandidate() UNCHANGED
 * against the loaded index records. That engine already returns
 * 'indeterminate' for any criterion whose data is absent from a candidate
 * (see site-search.js's own header) -- index records have no `.proximity`/
 * `.constraints`/`.envelope`, so distance and constraint criteria correctly
 * come back indeterminate rather than silently passing or failing. No
 * parallel evaluation logic was written for this file; it is a loader and
 * a thin wrapper, nothing more.
 *
 * Depends on: window.PARCEL_SITE_SEARCH (required).
 */
window.PARCEL_SITE_SEARCH_INDEX = (function () {
  'use strict';

  const INDEX_URL = 'data/site_search_index.json';

  let _indexPromise = null;

  function loadIndex() {
    if (_indexPromise) return _indexPromise;
    _indexPromise = (async () => {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error(`site search index HTTP ${res.status}`);
      const json = await res.json();
      if (!json || !Array.isArray(json.parcels)) {
        throw new Error('site search index has no parcels array');
      }
      return json;
    })();
    // A failed load must not poison the cache forever -- the next attempt
    // should be allowed to retry, same convention as proximity-layers.js's
    // loadInfrastructureLayers().
    _indexPromise.catch(() => { _indexPromise = null; });
    return _indexPromise;
  }

  /* Runs a PARCEL_SITE_SEARCH search across the full precomputed index
   * instead of the current map viewport.
   *
   *   criteria: same shape as PARCEL_SITE_SEARCH's CRITERIA
   *   opts.unknownPolicy: 'exclude' (default) | 'include'
   *
   * Returns the same shape PARCEL_SITE_SEARCH.search() does, plus `meta`
   * (the index's own generation metadata -- when it was built, which
   * jurisdictions were size-filtered vs. an unfiltered sample, which were
   * truncated) so a caller can render an honest "as of <date>, covering N
   * jurisdictions" caveat rather than presenting this as a live, complete
   * national search. */
  async function searchNational(criteria, opts) {
    const engine = window.PARCEL_SITE_SEARCH;
    if (!engine) throw new Error('PARCEL_SITE_SEARCH_INDEX requires window.PARCEL_SITE_SEARCH to be loaded first');

    const index = await loadIndex();
    const result = engine.search(index.parcels, criteria, opts);
    return { ...result, meta: index.meta, jurisdictionSummaries: index.jurisdiction_summaries };
  }

  function _resetCache() { _indexPromise = null; }

  return { loadIndex, searchNational, _resetCache, INDEX_URL };
})();
