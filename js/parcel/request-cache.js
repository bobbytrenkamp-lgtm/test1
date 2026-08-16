/* js/parcel/request-cache.js
 * window.PARCEL_REQUEST_CACHE — small TTL'd cache in front of live parcel
 * queries (ArcGIS/WFS connectors' viewport fetches, searches, and by-id
 * lookups).
 *
 * Why: parcel viewport queries go straight from the visitor's browser to
 * the county's own GIS server on every debounced pan/zoom (see renderer.js's
 * DEBOUNCE_MS + AbortController cancellation, which already prevents rapid
 * successive fetches from piling up, but does nothing for a user panning
 * AWAY from a viewport and back to it later in the same session -- that
 * still re-issues an identical request). At real traffic this is the kind
 * of load pattern that gets a site's own IP throttled or blocked by a
 * county IT department, breaking the feature for every visitor, not just
 * the one who caused it. There is no backend to put a shared cache behind
 * (this is a static site, see README's "static, no server needed"), so this
 * lives client-side, per visitor, per page load.
 *
 * Parcel boundary data does not meaningfully change minute-to-minute, so a
 * short TTL is safe: it cuts real redundant load without risking anyone
 * seeing meaningfully stale data. Deliberately conservative -- if a county
 * genuinely re-publishes its parcel layer mid-session, the TTL expiring
 * within minutes means that's a short-lived staleness window, not a
 * permanent one.
 */
window.PARCEL_REQUEST_CACHE = (function () {
  'use strict';

  const DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 minutes
  const MAX_ENTRIES     = 200;          // bounded, matches the MAX_CACHE pattern in constraints.js

  const _store = new Map(); // key -> { value, expiresAt }

  function _trim() {
    const excess = _store.size - MAX_ENTRIES;
    if (excess <= 0) return;
    // Map preserves insertion order; the oldest entries are the least
    // recently written (set() re-inserts on every write, so this is
    // effectively least-recently-used, not just least-recently-created).
    let i = 0;
    for (const key of _store.keys()) {
      if (i++ >= excess) break;
      _store.delete(key);
    }
  }

  function _clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  /* Returns a deep clone of the cached value, or undefined on a miss/expiry.
   * Cloning on every read (not on write) means callers can freely mutate
   * what they get back -- e.g. Leaflet attaches back-references onto
   * GeoJSON feature objects it's given -- without corrupting what's cached
   * for the next reader. */
  function get(key) {
    const entry = _store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      _store.delete(key);
      return undefined;
    }
    return _clone(entry.value);
  }

  function set(key, value, ttlMs) {
    _store.delete(key); // re-insert so this becomes the most-recently-written entry
    _store.set(key, { value: _clone(value), expiresAt: Date.now() + (ttlMs || DEFAULT_TTL_MS) });
    _trim();
  }

  function clear() { _store.clear(); }
  function size()  { return _store.size; }

  return { get, set, clear, size, DEFAULT_TTL_MS, MAX_ENTRIES };
})();
