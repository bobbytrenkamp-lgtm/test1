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

  // ── Result virtualization ──────────────────────────────────────────────
  // A national search can return thousands of matches (the precomputed
  // index alone holds 85,000+ candidate records -- see
  // js/parcel/site-search-index.js). Rendering every result row up front
  // used to mean a hard cutoff at 200 with the rest thrown away behind a
  // "…and N more, narrow your search" message -- the user could never
  // actually see result #201 without changing their criteria. Results now
  // stream into the DOM a page at a time as the user scrolls #fs-results
  // (which is already the panel's overflow:auto container), the same
  // pattern js/pipeline.js already uses for its facility table.
  const PAGE_SIZE = 150;
  let _renderedResults = [];   // the full results[] array for the current search
  let _renderedCount = 0;      // how many of _renderedResults are in the DOM

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

  /* ── Pure: partition load summary → honest "N/M states searched" line.
   * A failed state partition never silently drops out of the result count
   * -- it is named, with a reason, so "11/12 state partitions searched"
   * reads as a real coverage statement, not a rounding error. */
  function renderPartitionSummary(ps) {
    if (!ps || !ps.requested) return '';
    const failedList = (ps.failed || []).map(f =>
      `${esc(f.state)} (${esc(f.reason === 'not-covered' ? 'not covered by the index' : (f.error || 'unavailable'))})`
    ).join(', ');
    return `<p class="pp-muted fs-partition-summary">${ps.loaded}/${ps.requested} state partition(s) searched` +
      (failedList ? ` — unavailable: ${failedList}` : '') +
      (ps.aborted ? ' — superseded by a newer search before finishing' : '') +
      `</p>`;
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

    if (result.partitionSummary) html += renderPartitionSummary(result.partitionSummary);

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

    const firstPage = results.slice(0, PAGE_SIZE);
    html += `<ul class="fs-results-list" id="fs-results-list">${firstPage.map(renderResultRow).join('')}</ul>`;
    html += renderLoadMoreStatus(firstPage.length, results.length);
    return html;
  }

  /* ── Pure: one result entry → its <li> markup. Shared by renderResults()'s
   * initial page and _appendResultRows()'s scroll-triggered pages, so a
   * result row has exactly one template regardless of which page it lands
   * on. `i` is the entry's index in the FULL results[] array (not the page),
   * since data-fs-idx drives click-to-focus against _lastResult.results. */
  function renderResultRow(entry, i) {
    const p = (entry.candidate && entry.candidate.properties) || {};
    const label = p.address || p.pin || entry.id || 'Parcel';
    const sub = [
      entry.acres != null ? `${entry.acres.toFixed(1)} ac` : null,
      p.zoning_code || null,
      entry.outcome === 'indeterminate' ? 'partially evaluated — see below' : null,
    ].filter(Boolean).join(' · ');
    return `<li class="fs-result-item" data-fs-idx="${i}">
        <div class="fs-result-main">${esc(label)}</div>
        ${sub ? `<div class="fs-result-sub pp-muted">${esc(sub)}</div>` : ''}
      </li>`;
  }

  /* ── Pure: rendered-count + total → the trailing status line. Unlike the
   * old hard "…and N more, narrow the search" dead end, this describes a
   * still-scrollable list -- every result is reachable, just not all in the
   * DOM yet. Returns '' once everything is rendered, so the indicator
   * disappears rather than lingering as "Showing 340 of 340". */
  function renderLoadMoreStatus(renderedCount, total) {
    if (renderedCount >= total) return '';
    return `<p class="pp-muted fs-result-more" id="fs-load-more">Showing ${renderedCount} of ${total} — scroll for more.</p>`;
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

  // A national search fetches state partitions over the network and can
  // take real, visible time (see js/parcel/site-search-index.js). Two
  // pieces of state track that: _searchSeq is a monotonic token so a
  // search that is still in flight when a newer one starts can detect it
  // has been superseded and must not overwrite the newer search's
  // rendered results; _currentAbortController lets a newer search actually
  // cancel the older one's outstanding partition fetches rather than just
  // ignoring their result once they land.
  let _searchSeq = 0;
  let _currentAbortController = null;

  async function _onSubmit(formEl) {
    const fields = Object.fromEntries(new FormData(formEl).entries());
    const scope = fields.scope === 'national' ? 'national' : 'viewport';
    delete fields.scope; // not a PARCEL_SITE_SEARCH criterion
    const results = document.getElementById('fs-results');

    if (_currentAbortController) _currentAbortController.abort();
    const controller = new AbortController();
    _currentAbortController = controller;
    const token = ++_searchSeq;

    if (results) results.innerHTML = '<p class="pp-empty">Searching…</p>';

    let result;
    if (scope === 'national') {
      result = await runSearchNational(fields, {
        unknownPolicy: 'exclude',
        signal: controller.signal,
        onProgress: (p) => {
          if (token !== _searchSeq || !results) return; // a newer search has already started
          const noun = p.total === 1 ? 'state' : 'states';
          const trouble = p.ok === false ? ` — ${esc(p.state)} unavailable` : '';
          results.innerHTML = `<p class="pp-empty">Searching ${p.total} ${noun}… ${p.loaded} / ${p.total} loaded${trouble}</p>`;
        },
      });
    } else {
      result = runSearch(fields, { unknownPolicy: 'exclude' });
    }

    if (token !== _searchSeq) return; // superseded by a newer search; do not overwrite its results
    _lastResult = result;
    if (results) results.innerHTML = renderResults(_lastResult);
    _renderedResults = (result && result.results) || [];
    _renderedCount = Math.min(PAGE_SIZE, _renderedResults.length);
  }

  function _focusResult(idx) {
    const entry = _lastResult && _lastResult.results && _lastResult.results[idx];
    if (entry && entry.candidate) window.PARCEL?.focusParcel(entry.candidate);
  }

  /* Appends the next page of already-computed results to the DOM and
   * refreshes/removes the "Showing X of Y" status line. Reuses
   * renderResultRow() -- the exact template renderResults() used for the
   * first page -- so a row looks identical regardless of which page it
   * arrived on. */
  function _appendResultRows() {
    const list = document.getElementById('fs-results-list');
    if (!list || _renderedCount >= _renderedResults.length) return;
    const nextEnd = Math.min(_renderedCount + PAGE_SIZE, _renderedResults.length);
    let html = '';
    for (let i = _renderedCount; i < nextEnd; i++) html += renderResultRow(_renderedResults[i], i);
    list.insertAdjacentHTML('beforeend', html);
    _renderedCount = nextEnd;

    const status = document.getElementById('fs-load-more');
    const statusHTML = renderLoadMoreStatus(_renderedCount, _renderedResults.length);
    if (!statusHTML) { if (status) status.remove(); }
    else if (status) status.outerHTML = statusHTML;
    else list.insertAdjacentHTML('afterend', statusHTML);
  }

  /* Wired once (guarded like js/pipeline.js's own _wireInfiniteScroll) since
   * #fs-results is a static element that persists across searches -- only
   * its inner content is replaced each search, not the container itself. */
  function _wireResultScroll() {
    const wrap = document.getElementById('fs-results');
    if (!wrap || wrap.dataset.scrollWired === '1') return;
    wrap.dataset.scrollWired = '1';
    wrap.addEventListener('scroll', () => {
      if (_renderedCount >= _renderedResults.length) return;
      if (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 400) _appendResultRows();
    }, { passive: true });
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
      _wireResultScroll();
    }
  }

  // Safe to call at load time: this script tag is `defer`, so the DOM is
  // already parsed by the time this IIFE runs.
  if (typeof document !== 'undefined' && document.getElementById) init();

  return {
    init, open, close, toggle,
    buildCriteriaFromForm, runSearch, runSearchNational, renderResults, renderPartitionSummary,
    renderResultRow, renderLoadMoreStatus, PAGE_SIZE,
  };
})();
