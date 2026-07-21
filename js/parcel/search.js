/* js/parcel/search.js
 * Parcel address / PIN search — augments the existing map search bar.
 *
 * When the parcels layer is active and a county with parcel coverage is selected,
 * this module listens on #search-input and appends a "Parcels" section to
 * #search-results after the county/facility results rendered by map.js.
 *
 * Depends on: PARCEL (PARCEL.search), window.PARCEL_REGISTRY
 */
window.PARCEL_SEARCH = (function () {
  'use strict';

  const DEBOUNCE_MS = 400;
  const MAX_RESULTS = 6;

  let _debounce  = null;
  let _lastQuery = '';
  let _active    = false;
  let _fips      = null;

  /* Called by PARCEL.onLayerToggle and PARCEL.onCountyChanged */
  function setContext(active, fips) {
    _active = active && !!fips && !!window.PARCEL_REGISTRY?.has(fips);
    _fips   = _active ? fips : null;
    if (!_active) _clearParcelResults();
  }

  function _clearParcelResults() {
    document.getElementById('parcel-search-results-section')?.remove();
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function _runSearch(query) {
    if (!_active || !_fips || !query || query.length < 2) {
      _clearParcelResults();
      return;
    }

    const results = await window.PARCEL?.search(query).catch(() => null);
    const features = results?.features || [];

    _clearParcelResults();
    if (!features.length) return;

    const container = document.getElementById('search-results');
    if (!container || container.style.display === 'none') return;

    const section = document.createElement('div');
    section.id = 'parcel-search-results-section';
    section.className = 'search-parcel-section';

    const hdr = document.createElement('div');
    hdr.className = 'search-parcel-hdr';
    hdr.textContent = 'Parcels';
    section.appendChild(hdr);

    const limited = features.slice(0, MAX_RESULTS);
    for (const feature of limited) {
      const props = feature.properties || {};
      const label = props.address || props.pin || props.parcel_id || 'Parcel';
      const sub   = [
        props.owner ? props.owner : null,
        props.zoning_code ? `Zoning: ${props.zoning_code}` : null,
        props.area_acres  ? `${Number(props.area_acres).toFixed(2)} ac` : null,
      ].filter(Boolean).join(' · ');

      const item = document.createElement('div');
      item.className = 'search-result-item search-parcel-item';
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '0');
      item.innerHTML = `
        <span class="search-parcel-icon" aria-hidden="true">📌</span>
        <div class="search-parcel-text">
          <div class="search-parcel-label">${_esc(label)}</div>
          ${sub ? `<div class="search-parcel-sub">${_esc(sub)}</div>` : ''}
        </div>`;

      const doSelect = () => {
        container.style.display = 'none';
        document.getElementById('search-input')?.blur();
        _clearParcelResults();
        window.PARCEL?.focusParcel(feature);
      };
      item.addEventListener('click', doSelect);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') doSelect(); });

      section.appendChild(item);
    }

    if (features.length > MAX_RESULTS) {
      const more = document.createElement('div');
      more.className = 'search-parcel-more';
      more.textContent = `+${features.length - MAX_RESULTS} more — refine your search`;
      section.appendChild(more);
    }

    container.appendChild(section);
  }

  /* ── Wire up to the existing search bar ── */
  function _init() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!_active) return;
      if (q === _lastQuery) return;
      _lastQuery = q;
      clearTimeout(_debounce);
      if (!q || q.length < 2) { _clearParcelResults(); return; }
      _debounce = setTimeout(() => _runSearch(q), DEBOUNCE_MS);
    });

    // Clear parcel results when search box loses focus (after a short delay for click)
    input.addEventListener('blur', () => {
      setTimeout(_clearParcelResults, 200);
    });
  }

  // Delay init until DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return { setContext };
})();
