/* Results Panel — dockable county list with virtual scroll, sort, and map sync */
(function () {
  'use strict';

  const ROW_H    = 44;
  const BUFFER   = 6;
  const MIN_H    = 80;
  const DEF_H    = 220;

  let _isOpen       = false;
  let _sortedFips   = [];
  let _sortKey      = 'severity-desc';
  let _mapData      = {};
  let _filterFn     = () => true;
  let _selectedFips = null;
  let _onRowClickCb = null;
  let _panelH       = DEF_H;
  let _bodyEl       = null;
  let _spacerEl     = null;
  let _rowsWrap     = null;

  try { _sortKey = localStorage.getItem('results-sort') || 'severity-desc'; } catch (_) {}
  try { _panelH  = parseInt(localStorage.getItem('results-panel-h') || DEF_H, 10) || DEF_H; } catch (_) {}

  /* ── Severity helpers (mirrors map.js logic, no shared state) ── */
  const SEV_ORDER  = { ban: 5, high: 4, moderate: 3, proposed: 2, none: 1, pro: 0 };
  const SEV_COLORS = { ban: '#7f1d1d', high: '#dc2626', moderate: '#f97316', proposed: '#eab308', none: '#16a34a', pro: '#4ade80' };
  const SEV_LABELS = { ban: 'Moratorium', high: 'High', moderate: 'Moderate', proposed: 'Proposed', none: 'None', pro: 'Pro-DC' };

  function _sevKey(fips) {
    const c = _mapData[fips];
    if (!c) return 'none';
    const l = c.level, s = c.status || 'active';
    if (l === -1) return 'pro';
    if (l <= 0)   return 'none';
    if (s === 'proposed' || s === 'pending') return 'proposed';
    if (l >= 4)   return 'ban';
    if (l === 3)  return 'high';
    return 'moderate';
  }

  function _sort(arr) {
    const a = [...arr];
    switch (_sortKey) {
      case 'severity-desc': return a.sort((x, y) => (SEV_ORDER[_sevKey(y)] || 0) - (SEV_ORDER[_sevKey(x)] || 0));
      case 'severity-asc':  return a.sort((x, y) => (SEV_ORDER[_sevKey(x)] || 0) - (SEV_ORDER[_sevKey(y)] || 0));
      case 'name-asc':      return a.sort((x, y) => (_mapData[x]?.name || '').localeCompare(_mapData[y]?.name || ''));
      case 'name-desc':     return a.sort((x, y) => (_mapData[y]?.name || '').localeCompare(_mapData[x]?.name || ''));
      case 'state-asc':     return a.sort((x, y) => {
        const sx = (_mapData[x]?.state || '') + (_mapData[x]?.name || '');
        const sy = (_mapData[y]?.state || '') + (_mapData[y]?.name || '');
        return sx.localeCompare(sy);
      });
      default: return a;
    }
  }

  function _esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Row factory ── */
  function _makeRow(fips, top, selected) {
    const c    = _mapData[fips] || {};
    const sk   = _sevKey(fips);
    const div  = document.createElement('div');
    div.className = 'rp-row' + (selected ? ' rp-row-selected' : '');
    div.style.cssText = `position:absolute;top:${top}px;left:0;right:0;height:${ROW_H}px`;
    div.dataset.fips = fips;
    div.dataset.idx  = String(Math.round(top / ROW_H));
    div.setAttribute('role', 'listitem');
    div.tabIndex = 0;
    div.innerHTML =
      `<span class="rp-dot" style="background:${SEV_COLORS[sk]}"></span>` +
      `<span class="rp-name">${_esc(c.name || fips)}</span>` +
      `<span class="rp-state">${_esc(c.state || '')}</span>` +
      `<span class="rp-badge rp-badge-${sk}">${_esc(SEV_LABELS[sk] || '')}</span>`;
    div.addEventListener('click', () => { if (_onRowClickCb) _onRowClickCb(fips); });
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (_onRowClickCb) _onRowClickCb(fips); }
    });
    return div;
  }

  /* ── Virtual scroll ── */
  function _render() {
    if (!_bodyEl || !_rowsWrap || !_spacerEl) return;
    const total = _sortedFips.length;
    _spacerEl.style.height = (total * ROW_H) + 'px';

    const scrollTop = _bodyEl.scrollTop;
    const viewH     = _bodyEl.clientHeight;
    const startIdx  = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER);
    const endIdx    = Math.min(total - 1, Math.ceil((scrollTop + viewH) / ROW_H) + BUFFER);

    // Remove out-of-range rendered rows
    _rowsWrap.querySelectorAll('.rp-row').forEach(el => {
      const idx = parseInt(el.dataset.idx, 10);
      if (idx < startIdx || idx > endIdx) el.remove();
    });

    // Track already-rendered indices
    const rendered = new Set();
    _rowsWrap.querySelectorAll('.rp-row').forEach(el => rendered.add(parseInt(el.dataset.idx, 10)));

    const frag = document.createDocumentFragment();
    for (let i = startIdx; i <= endIdx; i++) {
      if (rendered.has(i)) continue;
      const fips = _sortedFips[i];
      if (!fips) continue;
      frag.appendChild(_makeRow(fips, i * ROW_H, fips === _selectedFips));
    }
    _rowsWrap.appendChild(frag);
  }

  function _clearRows() {
    if (_rowsWrap) _rowsWrap.innerHTML = '';
  }

  /* ── Title updater ── */
  function _updateTitle() {
    const el = document.getElementById('results-panel-title');
    if (el) el.textContent = _sortedFips.length.toLocaleString() + ' counties';
  }

  /* ── Public API ── */
  function update(mapData, filterFn) {
    _mapData  = mapData;
    _filterFn = filterFn;
    const filtered  = Object.keys(mapData).filter(filterFn);
    _sortedFips = _sort(filtered);
    _updateTitle();
    if (_isOpen) { _clearRows(); _render(); }
  }

  function highlightFips(fips) {
    _selectedFips = fips;
    if (!_isOpen) return;
    // Update rendered rows' selected state
    if (_rowsWrap) {
      _rowsWrap.querySelectorAll('.rp-row').forEach(el => {
        el.classList.toggle('rp-row-selected', el.dataset.fips === fips);
      });
    }
    if (!fips || !_bodyEl) return;
    const idx = _sortedFips.indexOf(fips);
    if (idx < 0) return;
    const rowTop = idx * ROW_H;
    const viewH  = _bodyEl.clientHeight;
    const cur    = _bodyEl.scrollTop;
    if (rowTop < cur || rowTop + ROW_H > cur + viewH) {
      _bodyEl.scrollTop = Math.max(0, rowTop - viewH / 2 + ROW_H / 2);
    }
  }

  function open() {
    const panel = document.getElementById('results-panel');
    if (!panel) return;
    panel.hidden = false;
    _isOpen = true;
    panel.style.height = _panelH + 'px';
    const btn = document.getElementById('gis-results');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
    _updateTitle();
    _clearRows();
    requestAnimationFrame(_render);
    if (_selectedFips) highlightFips(_selectedFips);
  }

  function close() {
    const panel = document.getElementById('results-panel');
    if (!panel) return;
    panel.hidden = true;
    _isOpen = false;
    const btn = document.getElementById('gis-results');
    if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
  }

  function toggle() { if (_isOpen) close(); else open(); }

  function onRowClick(cb) { _onRowClickCb = cb; }

  /* ── Init ── */
  function _init() {
    _bodyEl = document.getElementById('results-panel-body');
    if (!_bodyEl) return;

    // Build virtual-scroll structure inside the panel body
    const container = document.createElement('div');
    container.style.cssText = 'position:relative;';
    _spacerEl = document.createElement('div');
    _rowsWrap = document.createElement('div');
    _rowsWrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    // Row wrappers need pointer events
    _rowsWrap.style.pointerEvents = 'auto';
    container.appendChild(_spacerEl);
    container.appendChild(_rowsWrap);
    _bodyEl.appendChild(container);

    _bodyEl.addEventListener('scroll', _render, { passive: true });

    // Sort select
    const sortSel = document.getElementById('results-sort-select');
    if (sortSel) {
      sortSel.value = _sortKey;
      sortSel.addEventListener('change', () => {
        _sortKey = sortSel.value;
        try { localStorage.setItem('results-sort', _sortKey); } catch (_) {}
        const filtered = Object.keys(_mapData).filter(_filterFn);
        _sortedFips = _sort(filtered);
        _clearRows();
        _bodyEl.scrollTop = 0;
        _updateTitle();
        _render();
      });
    }

    // Resize handle — drag upward to expand
    const handle = document.getElementById('results-panel-resize');
    if (handle) {
      let startY = 0, startH = 0;
      function onMove(e) {
        const cy  = e.clientY ?? e.touches?.[0]?.clientY ?? startY;
        const dy  = startY - cy;
        const max = Math.floor(window.innerHeight * 0.5);
        _panelH   = Math.max(MIN_H, Math.min(max, startH + dy));
        const panel = document.getElementById('results-panel');
        if (panel) panel.style.height = _panelH + 'px';
        _render();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend',  onUp);
        try { localStorage.setItem('results-panel-h', String(_panelH)); } catch (_) {}
      }
      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        startY = e.clientY;
        startH = _panelH;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
      });
      handle.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY;
        startH = _panelH;
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend',  onUp);
      }, { passive: true });
    }

    // Close button
    document.getElementById('results-panel-close')?.addEventListener('click', close);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  window.RESULTS_PANEL = { open, close, toggle, update, highlightFips, onRowClick };
})();
