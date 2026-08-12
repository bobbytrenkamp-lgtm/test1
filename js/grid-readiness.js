/* js/grid-readiness.js — window.GRID_READINESS
 *
 * Thin fetch-and-cache wrapper around data/grid_readiness.json (see
 * data/generate_grid_readiness.py for the full methodology this file's
 * per-county scores come from). Same lazy-fetch-once-cache-forever pattern
 * already used by js/parcel/proximity-layers.js's loadInfrastructureLayers()
 * and js/economy.js's per-scope loaders — the file is a few MB (every
 * scored county's full component breakdown, kept for transparency rather
 * than trimmed to just the headline number), so it is never fetched until
 * something actually asks for a county's score, and never fetched twice.
 */
window.GRID_READINESS = (function () {
  "use strict";

  let _promise = null;

  function load() {
    if (_promise) return _promise;
    _promise = fetch("data/grid_readiness.json")
      .then(res => {
        if (!res.ok) throw new Error(`grid_readiness.json HTTP ${res.status}`);
        return res.json();
      })
      .catch(err => {
        _promise = null;   // a failed fetch must not poison future attempts
        throw err;
      });
    return _promise;
  }

  /* Resolves to a single county's record, or null if this deployment's
     data has no entry for it (a county neither dataset ever touched — see
     the generator's own header for why that means "no data", not "zero").
     Never throws: a fetch failure resolves to null so a card can render an
     honest empty state instead of leaving the page half-loaded. */
  function getByFips(fips) {
    return load()
      .then(doc => (doc.counties || {})[fips] || null)
      .catch(() => null);
  }

  function _resetCache() { _promise = null; }   // test-only

  return { load, getByFips, _resetCache };
})();
