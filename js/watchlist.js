/* js/watchlist.js — Watchlist store with notes, policy snapshots, change
   detection, and optional cloud sync (Phase 4).

   WHY: the watchlist was a flat array of FIPS strings in localStorage, read
   directly in eight different places across map.js, home.js, analytics.js, and
   jurisdiction.js. There was nowhere to hang notes, no record of what a county
   looked like when you started watching it, and no sync. This module owns the
   data and exposes one API.

   STORAGE
     dc-watchlist-v2  structured entries (this module)
     dc-watchlist-v1  legacy flat array — MIGRATED FROM, NEVER DELETED.
                      v1 is left byte-for-byte intact so an older build, or a
                      rollback, still finds the user's data. v2 is additive.

   ENTRY SHAPE
     { fips, added_at, notes, snapshot: { level, status, effective_date, title } }

   The snapshot records the policy state at the moment the county was added or
   last acknowledged. diff() compares it against live mapData to surface real
   changes. This is genuine client-side change detection performed when the
   page loads — it is NOT email or push notification, and the UI must never
   imply otherwise.

   CLOUD SYNC
     When window.AUTH is configured and signed in, entries mirror to the
     existing saved_items table via AUTH.saveItem('county', ...). Local storage
     stays authoritative for reads so the feature works fully signed-out.

   Exports: window.WATCHLIST
*/
window.WATCHLIST = (function () {
  'use strict';

  const V1_KEY = 'dc-watchlist-v1';   // legacy flat array — read, never written destructively
  const V2_KEY = 'dc-watchlist-v2';   // structured store owned by this module

  const _listeners = [];
  let _entries = null;                // fips -> entry, lazily loaded

  /* ── Storage primitives ─────────────────────────────────────────────────── */

  function _readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function _writeV2() {
    try {
      localStorage.setItem(V2_KEY, JSON.stringify({
        _schema: 'watchlist_v2',
        updated_at: new Date().toISOString(),
        entries: Object.values(_entries),
      }));
    } catch (err) {
      console.warn('[Watchlist] could not persist:', err && err.message);
    }
    _mirrorLegacy();
  }

  /* Keep the v1 array in sync with the current FIPS set so any code path still
     reading the legacy key (or an older cached build) sees the same counties.
     This only ever writes the FIPS list — it never removes data v1 had that v2
     does not, because migration always imports v1 first. */
  function _mirrorLegacy() {
    try {
      localStorage.setItem(V1_KEY, JSON.stringify(Object.keys(_entries)));
    } catch (_) { /* quota or private mode — v2 is still written */ }
  }

  /* ── Migration ──────────────────────────────────────────────────────────── */

  function _load() {
    if (_entries) return _entries;
    _entries = {};

    /* 1. Load v2 if present. */
    const v2 = _readJSON(V2_KEY, null);
    if (v2 && Array.isArray(v2.entries)) {
      for (const e of v2.entries) {
        if (e && /^\d{5}$/.test(String(e.fips))) _entries[e.fips] = _normalize(e);
      }
    }

    /* 2. Fold in any v1 FIPS not already present. Runs every load, not just
          once, so a county added by an older build still gets picked up. */
    const v1 = _readJSON(V1_KEY, []);
    if (Array.isArray(v1)) {
      let imported = 0;
      for (const fips of v1) {
        const f = String(fips);
        if (!/^\d{5}$/.test(f) || _entries[f]) continue;
        _entries[f] = _normalize({ fips: f, added_at: null, notes: '' });
        imported++;
      }
      if (imported) {
        console.info(`[Watchlist] migrated ${imported} counties from ${V1_KEY}`);
        _writeV2();
      }
    }
    return _entries;
  }

  function _normalize(e) {
    return {
      fips: String(e.fips),
      added_at: e.added_at || null,
      notes: typeof e.notes === 'string' ? e.notes : '',
      snapshot: e.snapshot && typeof e.snapshot === 'object' ? e.snapshot : null,
    };
  }

  /* ── Policy snapshots ───────────────────────────────────────────────────── */

  /* Capture the fields whose change is meaningful to someone tracking a county. */
  function _snapshot(fips) {
    const md = (typeof mapData !== 'undefined' && mapData) ? mapData : null;
    const c = md ? md[fips] : null;
    if (!c) return { level: null, status: null, effective_date: null, title: null, absent: true };
    return {
      level: c.level == null ? null : c.level,
      status: c.status || null,
      effective_date: c.effective_date || null,
      title: c.title || null,
      absent: false,
    };
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  function list() {
    return Object.values(_load()).sort((a, b) =>
      String(b.added_at || '').localeCompare(String(a.added_at || '')));
  }

  function fipsList() { return Object.keys(_load()); }

  function has(fips) { return !!_load()[String(fips)]; }

  function get(fips) { return _load()[String(fips)] || null; }

  function count() { return Object.keys(_load()).length; }

  function add(fips, opts) {
    const f = String(fips);
    if (!/^\d{5}$/.test(f)) return false;
    const load = _load();
    if (load[f]) return false;
    load[f] = _normalize({
      fips: f,
      added_at: new Date().toISOString(),
      notes: (opts && opts.notes) || '',
      snapshot: _snapshot(f),
    });
    _writeV2();
    _cloudSave(load[f]);
    _emit('add', f);
    return true;
  }

  function remove(fips) {
    const f = String(fips);
    const load = _load();
    if (!load[f]) return false;
    delete load[f];
    _writeV2();
    _cloudRemove(f);
    _emit('remove', f);
    return true;
  }

  function toggle(fips) {
    return has(fips) ? (remove(fips), false) : (add(fips), true);
  }

  function setNotes(fips, notes) {
    const e = _load()[String(fips)];
    if (!e) return false;
    e.notes = String(notes == null ? '' : notes);
    _writeV2();
    _cloudSave(e);
    _emit('notes', String(fips));
    return true;
  }

  /* ── Change detection ───────────────────────────────────────────────────── */

  /* Compare each entry's snapshot against live mapData. Returns only real,
     describable changes. Entries added before snapshots existed (migrated from
     v1) have snapshot === null and are skipped rather than reported as changed. */
  function diff() {
    const out = [];
    for (const e of list()) {
      if (!e.snapshot) continue;
      const now = _snapshot(e.fips);
      const was = e.snapshot;
      const changes = [];

      if (was.absent && !now.absent) {
        changes.push({ field: 'record', text: 'A policy record was added for this county' });
      } else if (!was.absent && now.absent) {
        changes.push({ field: 'record', text: 'The policy record for this county was removed' });
      } else if (!was.absent && !now.absent) {
        if (was.level !== now.level) {
          const L = window.LEVEL_LABELS || {};
          const from = L[String(was.level)] || String(was.level);
          const to   = L[String(now.level)] || String(now.level);
          const dir  = (now.level > was.level) ? 'increased' : 'decreased';
          changes.push({ field: 'level', dir, text: `Restriction level ${dir}: ${from} → ${to}` });
        }
        if (was.status !== now.status) {
          changes.push({ field: 'status', text: `Status changed: ${was.status || '—'} → ${now.status || '—'}` });
        }
        if (was.effective_date !== now.effective_date) {
          changes.push({ field: 'effective_date', text: `Effective date changed: ${was.effective_date || '—'} → ${now.effective_date || '—'}` });
        }
        if (was.title !== now.title) {
          changes.push({ field: 'title', text: 'Policy title or description was revised' });
        }
      }

      if (changes.length) {
        const c = (typeof mapData !== 'undefined' && mapData) ? mapData[e.fips] : null;
        out.push({
          fips: e.fips,
          name: c ? c.name : `County ${e.fips}`,
          state: c ? c.state : '',
          changes,
        });
      }
    }
    return out;
  }

  /* Re-baseline one county (or all) to the current policy state, clearing its
     pending changes. Called when the user acknowledges what they have seen. */
  function acknowledge(fips) {
    const load = _load();
    const targets = fips ? [String(fips)] : Object.keys(load);
    let n = 0;
    for (const f of targets) {
      if (!load[f]) continue;
      load[f].snapshot = _snapshot(f);
      n++;
    }
    if (n) { _writeV2(); _emit('acknowledge', fips || null); }
    return n;
  }

  /* ── Portable bundles ───────────────────────────────────────────────────── */

  /* Serialize the watchlist so it can be handed to a colleague. Contains only
     county identifiers and the user's own notes — no account data, no
     credentials, nothing derived from the signed-in session. */
  function exportBundle() {
    return {
      _schema: 'watchlist_bundle_v1',
      exported_at: new Date().toISOString(),
      count: count(),
      entries: list().map(e => ({ fips: e.fips, notes: e.notes || '' })),
    };
  }

  /* Merge a bundle into the current watchlist. Additive by design: existing
     counties are kept, and a note is only filled in where the user has none,
     so importing can never silently overwrite someone's own annotations. */
  function importBundle(bundle) {
    if (!bundle || bundle._schema !== 'watchlist_bundle_v1' || !Array.isArray(bundle.entries)) {
      return { ok: false, error: 'Not a valid watchlist bundle.' };
    }
    const load = _load();
    let added = 0, notesFilled = 0, skipped = 0;
    for (const raw of bundle.entries) {
      const f = String(raw && raw.fips || '');
      if (!/^\d{5}$/.test(f)) { skipped++; continue; }
      const incomingNotes = typeof raw.notes === 'string' ? raw.notes : '';
      if (!load[f]) {
        load[f] = _normalize({
          fips: f,
          added_at: new Date().toISOString(),
          notes: incomingNotes,
          snapshot: _snapshot(f),
        });
        added++;
      } else if (incomingNotes && !load[f].notes) {
        load[f].notes = incomingNotes;
        notesFilled++;
      }
    }
    if (added || notesFilled) { _writeV2(); _emit('import', null); }
    return { ok: true, added, notesFilled, skipped, total: bundle.entries.length };
  }

  /* ── Cloud sync (optional; no-ops when not signed in) ───────────────────── */

  function _cloudReady() {
    return !!(window.AUTH && window.AUTH.configured && window.AUTH.state === 'signedIn');
  }

  function _cloudSave(entry) {
    if (!_cloudReady()) return;
    const c = (typeof mapData !== 'undefined' && mapData) ? mapData[entry.fips] : null;
    Promise.resolve(window.AUTH.saveItem('county', entry.fips, {
      name: c ? c.name : null,
      state: c ? c.state : null,
      level: c ? c.level : null,
      added_at: entry.added_at,
    }, entry.notes || null)).catch(err =>
      console.warn('[Watchlist] cloud save failed:', err && err.message));
  }

  function _cloudRemove(fips) {
    if (!_cloudReady()) return;
    Promise.resolve(window.AUTH.removeItem('county', fips)).catch(err =>
      console.warn('[Watchlist] cloud remove failed:', err && err.message));
  }

  /* Pull cloud rows down and merge them in. Additive — a county saved on
     another device is added locally; nothing local is deleted, because an
     empty cloud response is indistinguishable from a failed fetch. */
  async function syncFromCloud() {
    if (!_cloudReady()) return { ok: false, reason: 'not-signed-in' };
    let rows;
    try {
      rows = await window.AUTH.getSavedItems('county');
    } catch (err) {
      return { ok: false, reason: (err && err.message) || 'fetch-failed' };
    }
    if (!Array.isArray(rows)) return { ok: false, reason: 'bad-response' };

    const load = _load();
    let added = 0;
    for (const r of rows) {
      const f = String(r.item_id || '');
      if (!/^\d{5}$/.test(f) || load[f]) continue;
      load[f] = _normalize({
        fips: f,
        added_at: (r.item_data && r.item_data.added_at) || r.created_at || null,
        notes: r.notes || '',
        snapshot: _snapshot(f),
      });
      added++;
    }
    if (added) { _writeV2(); _emit('sync', null); }
    return { ok: true, added, cloudCount: rows.length };
  }

  /* Push every local entry up, for a user who built a list before signing in. */
  async function pushAllToCloud() {
    if (!_cloudReady()) return { ok: false, reason: 'not-signed-in' };
    const all = list();
    for (const e of all) _cloudSave(e);
    return { ok: true, pushed: all.length };
  }

  /* ── Subscriptions ──────────────────────────────────────────────────────── */

  function onChange(fn) {
    if (typeof fn !== 'function') return () => {};
    _listeners.push(fn);
    return () => {
      const i = _listeners.indexOf(fn);
      if (i !== -1) _listeners.splice(i, 1);
    };
  }

  function _emit(action, fips) {
    for (const fn of _listeners.slice()) {
      try { fn({ action, fips, count: count() }); }
      catch (err) { console.error('[Watchlist] listener error:', err); }
    }
  }

  /* When the user signs in, merge whatever is in the cloud, then push local
     additions up so both sides converge. auth.js dispatches 'auth:stateChange'
     on document (not window) for every transition, so filter for signedIn. */
  document.addEventListener('auth:stateChange', (e) => {
    if (!e.detail || e.detail.state !== 'signedIn') return;
    syncFromCloud().then(r => { if (r.ok) pushAllToCloud(); });
  });

  return {
    list, fipsList, has, get, count,
    add, remove, toggle, setNotes,
    diff, acknowledge,
    exportBundle, importBundle,
    syncFromCloud, pushAllToCloud,
    onChange,
    _keys: { V1_KEY, V2_KEY },
  };
})();
