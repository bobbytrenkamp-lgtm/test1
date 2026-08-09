/* js/parcel/saved-sites.js
 * window.SAVED_SITES — persistent parcel bookmarks (Phase 13).
 *
 * WHY THIS EXISTS
 * ----------------
 * The parcel Compare tray (js/parcel/selection.js) is in-memory only --
 * confirmed by grepping it for any localStorage call: there is none. A page
 * refresh silently loses every parcel a user added to Compare. No parcel-
 * level "save for later" concept exists anywhere else in this system
 * either (grepped js/parcel/*.js and index.html for save/bookmark near
 * parcel code -- zero matches; the existing #detail-save-btn only handles
 * 'county' and 'facility' types, never 'parcel').
 *
 * This module is deliberately modeled on window.WATCHLIST's already-proven
 * shape (js/watchlist.js: add/remove/toggle/has/get/list, one JSON blob in
 * localStorage, an onChange pub/sub) rather than inventing a new pattern.
 * It does NOT replicate watchlist.js's v1/v2 legacy-migration machinery or
 * cloud sync -- there is no prior flat-array format to migrate from since
 * this is a new feature, and cloud sync is real, separately-scoped work.
 *
 * A parcel's full properties are snapshotted at save time (same principle
 * as watchlist.js's policy `snapshot`): a saved site must still show real
 * data -- address, zoning, acreage -- even after the user has navigated
 * away and the parcel is no longer loaded on the map.
 *
 * KEYING
 * ------
 * parcel_id is only unique WITHIN a jurisdiction, not across the whole
 * system (two counties can both hand out parcel_id "12345") -- confirmed
 * by reading js/parcel/schema.js's field definitions, which document no
 * cross-jurisdiction uniqueness guarantee. Every entry is therefore keyed
 * by `${county_fips}:${parcel_id||pin}`, never by parcel_id alone.
 *
 * Depends on: nothing required. Reads window.PARCEL_SCHEMA (for CSV
 * headers, matching panel.js's compare-tray export field-by-field) and
 * localStorage (optional -- degrades to in-memory-only if unavailable,
 * e.g. private browsing with storage blocked, rather than throwing).
 */
window.SAVED_SITES = (function () {
  'use strict';

  const STORAGE_KEY = 'dc-saved-parcels-v1';
  const _listeners = [];
  let _entries = null; // key -> entry, lazily loaded

  /* ── Storage primitives ─────────────────────────────────────────────── */

  function _storageAvailable() {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  }

  function _readJSON() {
    if (!_storageAvailable()) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function _write() {
    if (!_storageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        _schema: 'saved_sites_v1',
        updated_at: new Date().toISOString(),
        entries: Object.values(_entries),
      }));
    } catch (err) {
      console.warn('[SavedSites] could not persist:', err && err.message);
    }
  }

  function _load() {
    if (_entries) return _entries;
    _entries = {};
    const raw = _readJSON();
    if (raw && Array.isArray(raw.entries)) {
      for (const e of raw.entries) {
        if (e && e.key) _entries[e.key] = e;
      }
    }
    return _entries;
  }

  /* ── Keying ──────────────────────────────────────────────────────────
   * Pure -- given a GeoJSON feature (or any {properties} object), returns
   * its saved-sites key, or null when the feature has nothing stable to
   * key on (no parcel_id/pin AND no county_fips). Exposed for the UI layer
   * to check "is this parcel saved?" without constructing a full entry. */
  function keyFor(feature) {
    const p = (feature && feature.properties) || {};
    const id = p.parcel_id || p.pin;
    const fips = p.county_fips;
    if (!id && !fips) return null;
    return `${fips || 'unknown'}:${id || 'noid'}`;
  }

  /* ── Public API ──────────────────────────────────────────────────────── */

  function list() {
    return Object.values(_load()).sort((a, b) =>
      String(b.added_at || '').localeCompare(String(a.added_at || '')));
  }

  function has(feature) {
    const k = typeof feature === 'string' ? feature : keyFor(feature);
    return !!(k && _load()[k]);
  }

  function get(feature) {
    const k = typeof feature === 'string' ? feature : keyFor(feature);
    return (k && _load()[k]) || null;
  }

  function count() { return Object.keys(_load()).length; }

  function add(feature, opts) {
    const k = keyFor(feature);
    if (!k) return false;
    const load = _load();
    if (load[k]) return false;
    const p = feature.properties || {};
    load[k] = {
      key: k,
      county_fips: p.county_fips || null,
      parcel_id: p.parcel_id || null,
      pin: p.pin || null,
      added_at: new Date().toISOString(),
      notes: (opts && opts.notes) || '',
      // Full properties snapshot, same principle as WATCHLIST's policy
      // snapshot: a saved site must render real data even after the user
      // has navigated away and the live parcel is no longer loaded.
      properties: { ...p },
      geometry: feature.geometry || null,
    };
    _write();
    _emit('add', k);
    return true;
  }

  function remove(feature) {
    const k = typeof feature === 'string' ? feature : keyFor(feature);
    if (!k) return false;
    const load = _load();
    if (!load[k]) return false;
    delete load[k];
    _write();
    _emit('remove', k);
    return true;
  }

  function toggle(feature) {
    return has(feature) ? (remove(feature), false) : (add(feature), true);
  }

  function setNotes(feature, notes) {
    const k = typeof feature === 'string' ? feature : keyFor(feature);
    const e = k && _load()[k];
    if (!e) return false;
    e.notes = String(notes == null ? '' : notes);
    _write();
    _emit('notes', k);
    return true;
  }

  function clear() {
    _entries = {};
    _write();
    _emit('clear', null);
  }

  /* ── CSV export — same field list as panel.js's compare-tray export,
   * so a user gets one consistent set of columns whichever export they
   * use. Pure: entries in, CSV string out. ── */
  const CSV_FIELDS = [
    'parcel_id', 'pin', 'address', 'owner',
    'zoning_code', 'land_use_code', 'land_use_desc',
    'area_sqft', 'area_acres',
    'assessed_value', 'land_value', 'improvement_value',
    'tax_year', 'last_sale_date', 'last_sale_price',
    'county_fips',
  ];

  function _csvCell(v) {
    if (v == null || v === '') return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function renderCSV(entries) {
    const schema = window.PARCEL_SCHEMA;
    const header = CSV_FIELDS.map(fid => {
      const field = schema?.FIELD_MAP?.[fid];
      return field ? field.label : fid;
    });
    const rows = (entries || []).map(e => {
      const p = e.properties || {};
      return CSV_FIELDS.map(fid => _csvCell(p[fid])).join(',');
    });
    return [header.join(','), ...rows].join('\r\n');
  }

  /* ── Subscriptions ───────────────────────────────────────────────────── */

  function onChange(fn) {
    if (typeof fn !== 'function') return () => {};
    _listeners.push(fn);
    return () => {
      const i = _listeners.indexOf(fn);
      if (i !== -1) _listeners.splice(i, 1);
    };
  }

  function _emit(action, key) {
    for (const fn of _listeners.slice()) {
      try { fn({ action, key, count: count() }); }
      catch (err) { console.error('[SavedSites] listener error:', err); }
    }
  }

  return {
    keyFor, list, has, get, count,
    add, remove, toggle, setNotes, clear,
    renderCSV, CSV_FIELDS,
    onChange,
    _key: STORAGE_KEY,
  };
})();
