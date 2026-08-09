/* js/parcel/find-sites.js
 * window.FIND_SITES — "Find Sites" panel: turns PARCEL_SITE_SEARCH from an
 * untested, unwired engine into an actual UI feature (Phase 12).
 *
 * SCOPE, DELIBERATELY BOUNDED
 * ----------------------------
 * This searches the parcels CURRENTLY LOADED on the map
 * (PARCEL_RENDERER.getFeatures()), not a nationwide index -- there is no
 * bulk "all parcels in the US" store anywhere in this system, and building
 * one is real, separately-scoped work, not something to fake here. A user
 * pans/zooms to the area they care about, the parcel layer loads for that
 * viewport the same way it always has, and Find Sites filters what's
 * already on screen. The results summary always states how many parcels
 * were evaluated, so "0 matches" from an empty map is never confused with
 * "0 matches" from a real, populated search.
 *
 * This module builds the criteria object and renders results; it does not
 * reimplement any evaluation logic -- PARCEL_SITE_SEARCH.search() remains
 * the single source of truth for matched/rejected/indeterminate, including
 * its unknown-data handling. See site-search.js's own header for why that
 * three-way split exists and must not be collapsed here.
 *
 * A SECOND, SEPARATE SCOPE: THE PRECOMPUTED NATIONAL INDEX
 * ----------------------------------------------------------
 * runSearchNational() is a distinct, additive function -- not a change to
 * runSearch() above, which keeps searching only what's on screen exactly as
 * it always has. It hands off to window.PARCEL_SITE_SEARCH_INDEX, which
 * runs the SAME PARCEL_SITE_SEARCH engine against a periodically-refreshed,
 * size-filtered, multi-jurisdiction index instead of the map viewport (see
 * data/parcel_pipeline/build_national_site_index.mjs and
 * js/parcel/site-search-index.js). It is deliberately a separate function
 * rather than a mode flag on runSearch(): that index load is asynchronous
 * (a fetch), while the viewport search is synchronous, and giving one
 * function two different return shapes depending on its arguments is worse
 * than two small, honestly-named functions.
 *
 * Depends on: PARCEL_SITE_SEARCH (required to actually search),
 *   PARCEL_RENDERER (candidate source for runSearch),
 *   PARCEL_SITE_SEARCH_INDEX (candidate source for runSearchNational,
 *   optional -- only required if that scope is used),
 *   PARCEL (focusParcel, optional).
 */
window.FIND_SITES = (function () {
  'use strict';

  let _lastResult = null;
  let _open = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Pure: form values → PARCEL_SITE_SEARCH criteria ──────────────────
   * `fields` is a plain object of raw values (as read from a <form> via
   * FormData → Object.fromEntries, or handed in directly by a test).
   * Blank/absent fields are simply omitted from criteria, never coerced
   * into a value that would silently filter on something the user never
   * asked for. */
  function buildCriteriaFromForm(fields) {
    const f = fields || {};
    const criteria = {};
    const errors = [];

    function num(key) {
      const raw = f[key];
      if (raw == null || raw === '') return;
      const n = Number(raw);
      if (!Number.isFinite(n)) { errors.push(`${key} must be a number`); return; }
      criteria[key] = n;
    }
    function list(key) {
      const raw = f[key];
      if (raw == null || raw === '') return;
      const arr = String(raw).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) criteria[key] = arr;
    }

    num('minAcres');
    num('maxAcres');
    num('maxMilesToTransmission');
    num('maxMilesToSubstation');
    num('maxMilesToInterstate');
    num('maxFloodplainPct');
    num('maxWetlandPct');
    num('minConceptualUsableAcres');
    list('states');
    list('zoningCodes');
    list('counties');
    list('landUseCodes');

    if (f.ownerKnown === true || f.ownerKnown === false) criteria.ownerKnown = f.ownerKnown;

    if (typeof criteria.minAcres === 'number' && typeof criteria.maxAcres === 'number' &&
        criteria.minAcres > criteria.maxAcres) {
      errors.push('Minimum acreage is greater than maximum acreage — no parcel can satisfy both');
    }

    return { criteria, errors };
  }

  const _emptyResult = () => ({
    matched: [], rejected: [], indeterminate: [], results: [],
    counts: { evaluated: 0, matched: 0, rejected: 0, indeterminate: 0 },
  });

  /* ── Runs a search over whatever parcels are currently rendered on the
   * map. Not pure (reads PARCEL_RENDERER/PARCEL_SITE_SEARCH globals), but
   * everything it delegates to is; this function itself has no rendering
   * or filtering logic of its own to get wrong. */
  function runSearch(fields, opts) {
    const { criteria, errors } = buildCriteriaFromForm(fields);
    if (errors.length) return { error: errors.join('; '), ..._emptyResult() };
    if (!Object.keys(criteria).length) {
      return { error: 'Enter at least one search criterion.', ..._emptyResult() };
    }
    if (!window.PARCEL_SITE_SEARCH) {
      return { error: 'Site search engine unavailable.', ..._emptyResult() };
    }
    const candidates = window.PARCEL_RENDERER ? window.PARCEL_RENDERER.getFeatures() : [];
    return window.PARCEL_SITE_SEARCH.search(candidates, criteria, opts);
  }

  /* ── Runs a search across the precomputed multi-jurisdiction index
   * instead of the map viewport. Async (the index is fetched), unlike
   * runSearch() -- see the header comment above for why this is a separate
   * function rather than a mode flag. Mirrors runSearch()'s own error
   * handling exactly, so renderResults() does not need to special-case
   * which scope produced a given error result. */
  async function runSearchNational(fields, opts) {
    const { criteria, errors } = buildCriteriaFromForm(fields);
    if (errors.length) return { error: errors.join('; '), ..._emptyResult() };
    if (!Object.keys(criteria).length) {
      return { error: 'Enter at least one search criterion.', ..._emptyResult() };
    }
    if (!window.PARCEL_SITE_SEARCH_INDEX) {
      return { error: 'National site index unavailable.', ..._emptyResult() };
    }
    try {
      return await window.PARCEL_SITE_SEARCH_INDEX.searchNational(criteria, opts);
    } catch (e) {
      return { error: `Could not load the national index: ${e.message}`, ..._emptyResult() };
    }
  }

  /* ── Pure: search result → results-list HTML ── */
  function renderResults(result) {
    if (!result) return '<p class="pp-empty">Enter search criteria above and click Search.</p>';
    if (result.error) return `<p class="pp-empty pp-field-na">${esc(result.error)}</p>`;

    const { counts, caveat, results, meta } = result;
    const scopeLine = meta
      ? `of ${counts.evaluated} parcel(s) in the precomputed national index ` +
        `(as of ${esc(meta.generated_at || 'unknown date')}, ${meta.jurisdictions_ok ?? '?'} jurisdiction(s) covered)`
      : `of ${counts.evaluated} parcel(s) currently loaded on the map`;
    let html = `<div class="fs-summary">
      <strong>${counts.matched}</strong> matched · ${counts.rejected} rejected
      ${counts.indeterminate ? `· ${counts.indeterminate} indeterminate` : ''}
      <div class="pp-muted">${scopeLine}</div>
    </div>`;

    if (meta && meta.caveat) html += `<p class="pf-disclaimer">${esc(meta.caveat)}</p>`;
    if (caveat) html += `<p class="pf-disclaimer">${esc(caveat)}</p>`;

    if (!counts.evaluated) {
      html += meta
        ? '<p class="pp-empty">The national index has no parcels recorded yet.</p>'
        : '<p class="pp-empty">No parcels are loaded on the map yet. Pan or zoom to a covered ' +
          'county to load its parcel layer, then search again.</p>';
      return html;
    }
    if (!results.length) {
      html += '<p class="pp-empty">No loaded parcels matched these criteria. Try broadening the search.</p>';
      return html;
    }

    html += '<ul class="fs-results-list">';
    results.slice(0, 200).forEach((entry, i) => {
      const p = (entry.candidate && entry.candidate.properties) || {};
      const label = p.address || p.pin || entry.id || 'Parcel';
      const sub = [
        entry.acres != null ? `${entry.acres.toFixed(1)} ac` : null,
        p.zoning_code || null,
        entry.outcome === 'indeterminate' ? 'partially evaluated — see below' : null,
      ].filter(Boolean).join(' · ');
      html += `<li class="fs-result-item" data-fs-idx="${i}">
        <div class="fs-result-main">${esc(label)}</div>
        ${sub ? `<div class="fs-result-sub pp-muted">${esc(sub)}</div>` : ''}
      </li>`;
    });
    if (results.length > 200) {
      html += `<li class="pp-muted fs-result-more">…and ${results.length - 200} more. Narrow the search to see the rest.</li>`;
    }
    html += '</ul>';
    return html;
  }

  /* ── DOM wiring (untested directly, same convention as panel.js's show()) ── */

  function _getPanel() { return document.getElementById('find-sites-panel'); }

  function open() {
    const p = _getPanel();
    if (!p) return;
    p.classList.add('open');
    p.setAttribute('aria-hidden', 'false');
    _open = true;
  }

  function close() {
    const p = _getPanel();
    if (!p) return;
    p.classList.remove('open');
    p.setAttribute('aria-hidden', 'true');
    _open = false;
  }

  function toggle() { _open ? close() : open(); }

  async function _onSubmit(formEl) {
    const fields = Object.fromEntries(new FormData(formEl).entries());
    const scope = fields.scope === 'national' ? 'national' : 'viewport';
    delete fields.scope; // not a PARCEL_SITE_SEARCH criterion
    const results = document.getElementById('fs-results');
    if (results) results.innerHTML = '<p class="pp-empty">Searching…</p>';
    _lastResult = scope === 'national'
      ? await runSearchNational(fields, { unknownPolicy: 'exclude' })
      : runSearch(fields, { unknownPolicy: 'exclude' });
    if (results) results.innerHTML = renderResults(_lastResult);
  }

  function _focusResult(idx) {
    const entry = _lastResult && _lastResult.results && _lastResult.results[idx];
    if (entry && entry.candidate) window.PARCEL?.focusParcel(entry.candidate);
  }

  function init() {
    const panel = _getPanel();
    if (!panel) return;
    const form = document.getElementById('fs-form');
    if (form) {
      form.addEventListener('submit', e => { e.preventDefault(); void _onSubmit(form); });
    }
    const results = document.getElementById('fs-results');
    if (results) {
      results.addEventListener('click', e => {
        const item = e.target.closest('[data-fs-idx]');
        if (item) _focusResult(Number(item.dataset.fsIdx));
      });
      results.innerHTML = renderResults(null);
    }
  }

  // Safe to call at load time: this script tag is `defer`, so the DOM is
  // already parsed by the time this IIFE runs.
  if (typeof document !== 'undefined' && document.getElementById) init();

  return {
    init, open, close, toggle,
    buildCriteriaFromForm, runSearch, runSearchNational, renderResults,
  };
})();
