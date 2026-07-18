/* js/workspace.js — MapWorkspace singleton
   Resizable/collapsible/floating detail rail, per-component visibility
   toggles, workspace presets, card popout, and settings panel.
   Exports: window.MapWorkspace
*/
(function () {
  'use strict';

  const STORAGE_KEY       = 'mapWorkspacePreferences:v1';
  const MIN_RAIL_W        = 280;
  const MAX_RAIL_FRAC     = 0.5;
  const DEFAULT_RAIL_W    = 340;
  const MAP_SIZE_DEBOUNCE = 120;

  /* ── Component registry ──────────────────────────────────────────────── */
  const REG = {
    header:       { selector: '#header',        label: 'Header bar',              group: 'Layout',      tags: 'nav tabs brand logo' },
    dashboard:    { selector: '#dashboard',     label: 'KPI Strip',               group: 'Layout',      tags: 'kpi counts dashboard' },
    lastUpdated:  { selector: '#last-updated',  label: 'Data-updated badge',      group: 'Layout',      tags: 'badge timestamp updated' },
    searchBar:    { selector: '#search-bar',    label: 'Search & Layers bar',     group: 'Layout',      tags: 'search layers filters' },
    statsBar:     { selector: '#stats-bar',     label: 'Restriction summary row', group: 'Stats Bar',   tags: 'chips restriction summary row' },
    pillBan:      { selector: null, statSev: 'ban',      label: 'Ban pill',              group: 'Stats Bar', tags: 'ban pill chip' },
    pillHigh:     { selector: null, statSev: 'high',     label: 'High restriction pill', group: 'Stats Bar', tags: 'high pill chip' },
    pillModerate: { selector: null, statSev: 'moderate', label: 'Moderate pill',         group: 'Stats Bar', tags: 'moderate pill chip' },
    pillProposed: { selector: null, statSev: 'proposed', label: 'Proposed pill',         group: 'Stats Bar', tags: 'proposed pill chip' },
    pillPro:      { selector: null, statSev: 'pro',      label: 'Pro-development pill',  group: 'Stats Bar', tags: 'pro development pill chip' },
    legend:       { selector: '#legend',        label: 'Legend',                  group: 'Map',         tags: 'legend colors severity' },
    coordDisplay: { selector: '#coord-display', label: 'Coordinate display',      group: 'Map',         tags: 'coordinates lat lng coord' },
    gisToolbar:   { selector: '#map-gis-bar',  label: 'GIS toolbar',             group: 'Map',         tags: 'gis tools measure export print share' },
    zoomControls: { selector: '.leaflet-control-zoom', label: 'Zoom controls',   group: 'Map',         tags: 'zoom controls leaflet' },
    detailRail:   { selector: '#detail-panel', label: 'Detail panel',            group: 'Detail Panel', tags: 'detail county panel rail sidebar' },
  };

  /* ── Preset visibility maps ──────────────────────────────────────────── */
  const PRESET_VIS = {
    guided: {
      header: true, dashboard: true, lastUpdated: true, searchBar: true,
      statsBar: true, pillBan: true, pillHigh: true, pillModerate: true, pillProposed: true, pillPro: true,
      legend: true, coordDisplay: true, gisToolbar: true, zoomControls: true, detailRail: true,
    },
    analyst: {
      header: true, dashboard: false, lastUpdated: false, searchBar: true,
      statsBar: true, pillBan: true, pillHigh: true, pillModerate: true, pillProposed: true, pillPro: true,
      legend: true, coordDisplay: false, gisToolbar: true, zoomControls: true, detailRail: true,
    },
    minimal: {
      header: false, dashboard: false, lastUpdated: false, searchBar: false,
      statsBar: false, pillBan: false, pillHigh: false, pillModerate: false, pillProposed: false, pillPro: false,
      legend: false, coordDisplay: false, gisToolbar: false, zoomControls: true, detailRail: false,
    },
  };

  const PRESET_META = {
    guided:  { label: 'Guided',   desc: 'All UI visible — best for exploration' },
    analyst: { label: 'Analyst',  desc: 'Core tools, no secondary chrome' },
    minimal: { label: 'Minimal',  desc: 'Maximum map space — minimal chrome' },
    custom:  { label: 'Custom',   desc: 'Your saved layout' },
  };

  const DEFAULT_VIS = Object.assign({}, PRESET_VIS.guided);

  const DEFAULT_PREFS = {
    railWidth: DEFAULT_RAIL_W,
    railCollapsed: false,
    railFloating: false,
    railFloatLeft: null,
    railFloatTop: null,
    preset: 'guided',
    visibility: Object.assign({}, DEFAULT_VIS),
  };

  let prefs = null;
  let _mapSizeTimer  = null;
  let _floatingCards = [];

  /* ── Storage ─────────────────────────────────────────────────────────── */
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        prefs = Object.assign({}, DEFAULT_PREFS, stored);
        prefs.visibility = Object.assign({}, DEFAULT_VIS, stored.visibility || {});
      } else {
        prefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
      }
    } catch {
      prefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
    }
  }

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
  }

  /* ── Component visibility ────────────────────────────────────────────── */
  function setComponentVisibility(id, visible, opts) {
    const save            = !opts || opts.save !== false;
    const skipSave        = opts && opts.skipSave;
    const skipPresetCheck = opts && opts.skipPresetCheck;

    const comp = REG[id];
    if (!comp) return;

    if (comp.statSev) {
      const bar = document.getElementById('stats-bar');
      if (bar) bar.classList.toggle('ws-hide-' + comp.statSev, !visible);
    } else if (comp.selector) {
      document.querySelectorAll(comp.selector).forEach(el => {
        el.classList.toggle('ws-hidden', !visible);
      });
    }

    if (save) {
      prefs.visibility[id] = visible;
      if (!skipPresetCheck) _checkAutoCustomPreset();
      if (!skipSave) savePrefs();
      scheduleMapSizeUpdate();
    }
  }

  function applyVisibility() {
    Object.keys(REG).forEach(id => {
      const vis = prefs.visibility[id] !== false;
      setComponentVisibility(id, vis, { save: false });
    });
  }

  /* ── Presets ─────────────────────────────────────────────────────────── */
  function setPreset(name) {
    if (name === 'custom') {
      prefs.preset = 'custom';
      savePrefs();
      _updatePresetUI();
      return;
    }
    const vis = PRESET_VIS[name];
    if (!vis) return;
    prefs.preset = name;
    prefs.visibility = Object.assign({}, vis);
    savePrefs();
    applyVisibility();
    updateSettingsUI();
  }

  function _checkAutoCustomPreset() {
    if (prefs.preset === 'custom') return;
    for (const name of ['guided', 'analyst', 'minimal']) {
      const vis = PRESET_VIS[name];
      const match = Object.keys(REG).every(id => {
        const def = vis[id] !== false;
        const cur = prefs.visibility[id] !== false;
        return def === cur;
      });
      if (match) {
        if (prefs.preset !== name) { prefs.preset = name; _updatePresetUI(); }
        return;
      }
    }
    if (prefs.preset !== 'custom') { prefs.preset = 'custom'; _updatePresetUI(); }
  }

  function _updatePresetUI() {
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === prefs.preset);
    });
    const desc = document.getElementById('ws-preset-desc');
    if (desc) desc.textContent = PRESET_META[prefs.preset]?.desc || '';
  }

  /* ── Rail width ──────────────────────────────────────────────────────── */
  function setRailWidth(w) {
    const max = Math.floor(window.innerWidth * MAX_RAIL_FRAC);
    w = Math.max(MIN_RAIL_W, Math.min(max, Math.round(w)));
    prefs.railWidth = w;
    const panel = document.getElementById('detail-panel');
    if (panel && !panel.classList.contains('ws-rail-collapsed') && !panel.classList.contains('ws-rail-floating')) {
      panel.style.width = w + 'px';
    }
  }

  /* ── Rail collapse / restore ─────────────────────────────────────────── */
  function collapseRail() {
    const panel = document.getElementById('detail-panel');
    const tab   = document.getElementById('ws-rail-tab');
    if (!panel) return;
    panel.classList.add('ws-rail-collapsed');
    if (tab) tab.hidden = false;
    prefs.railCollapsed = true;
    savePrefs();
    scheduleMapSizeUpdate();
  }

  function restoreRail() {
    const panel = document.getElementById('detail-panel');
    const tab   = document.getElementById('ws-rail-tab');
    if (!panel) return;
    panel.classList.remove('ws-rail-collapsed');
    if (!prefs.railFloating) panel.style.width = prefs.railWidth + 'px';
    if (tab) tab.hidden = true;
    prefs.railCollapsed = false;
    savePrefs();
    scheduleMapSizeUpdate();
  }

  /* ── Rail float / dock ───────────────────────────────────────────────── */
  function floatRail() {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    panel.classList.remove('ws-rail-collapsed');
    const tab = document.getElementById('ws-rail-tab');
    if (tab) tab.hidden = true;

    panel.classList.add('ws-rail-floating');
    panel.style.width = (prefs.railWidth || DEFAULT_RAIL_W) + 'px';
    panel.style.right  = '';
    panel.style.left   = '';
    panel.style.top    = '';

    if (prefs.railFloatLeft != null && prefs.railFloatTop != null) {
      panel.style.left = prefs.railFloatLeft + 'px';
      panel.style.top  = prefs.railFloatTop  + 'px';
    } else {
      panel.style.right = '80px';
      panel.style.top   = '60px';
    }

    prefs.railFloating  = true;
    prefs.railCollapsed = false;
    savePrefs();
    scheduleMapSizeUpdate();
    _syncFloatBtn();
  }

  function dockRail() {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    panel.classList.remove('ws-rail-floating');
    panel.style.position = '';
    panel.style.left   = '';
    panel.style.top    = '';
    panel.style.right  = '';
    panel.style.bottom = '';
    panel.style.width  = prefs.railWidth + 'px';
    prefs.railFloating = false;
    savePrefs();
    scheduleMapSizeUpdate();
    _syncFloatBtn();
  }

  function _syncFloatBtn() {
    const panel    = document.getElementById('detail-panel');
    const floatBtn = document.getElementById('ws-rail-float');
    const dockBtn  = document.getElementById('ws-rail-dock');
    if (!floatBtn || !dockBtn) return;
    const floating = panel && panel.classList.contains('ws-rail-floating');
    floatBtn.hidden = floating;
    dockBtn.hidden  = !floating;
  }

  /* ── Rail resize drag ────────────────────────────────────────────────── */
  function _initRailResize() {
    const handle = document.getElementById('ws-rail-resize');
    const panel  = document.getElementById('detail-panel');
    if (!handle || !panel) return;

    let active = false, didMove = false, startX = 0, startW = 0;

    handle.addEventListener('pointerdown', e => {
      if (panel.classList.contains('ws-rail-floating') || panel.classList.contains('ws-rail-collapsed')) return;
      if (window.matchMedia('(max-width: 700px)').matches) return;
      e.preventDefault(); // prevents 300ms ghost-click on mobile
      active  = true;
      didMove = false;
      startX  = e.clientX;
      startW  = panel.getBoundingClientRect().width;
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('ws-resizing-rail');
    });

    handle.addEventListener('pointermove', e => {
      if (!active) return;
      didMove = true;
      const max  = Math.floor(window.innerWidth * MAX_RAIL_FRAC);
      const newW = Math.max(MIN_RAIL_W, Math.min(max, startW + (startX - e.clientX)));
      panel.style.width = newW + 'px';
      scheduleMapSizeUpdate();
    });

    const _resizeEnd = e => {
      if (!active) return;
      if (didMove) e.preventDefault(); // suppress post-drag synthesized click on desktop
      active = false;
      document.body.classList.remove('ws-resizing-rail');
      prefs.railWidth = Math.round(panel.getBoundingClientRect().width);
      savePrefs();
    };
    handle.addEventListener('pointerup', _resizeEnd);
    handle.addEventListener('pointercancel', _resizeEnd); // pointer left window mid-drag

    handle.addEventListener('dblclick', () => {
      setRailWidth(DEFAULT_RAIL_W);
      savePrefs();
      scheduleMapSizeUpdate();
    });
  }

  /* ── Rail float drag ─────────────────────────────────────────────────── */
  function _initRailFloatDrag() {
    const titlebar = document.getElementById('ws-float-titlebar');
    const panel    = document.getElementById('detail-panel');
    if (!titlebar || !panel) return;

    let dragging = false, didMove = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

    titlebar.addEventListener('pointerdown', e => {
      if (!panel.classList.contains('ws-rail-floating')) return;
      if (e.target.closest('button')) return;
      e.preventDefault(); // suppresses post-drag synthesized click
      const rect = panel.getBoundingClientRect();
      dragging = true;
      didMove  = false;
      startX   = e.clientX;
      startY   = e.clientY;
      origLeft = rect.left;
      origTop  = rect.top;
      panel.style.right  = '';
      panel.style.bottom = '';
      titlebar.setPointerCapture(e.pointerId);
    });

    titlebar.addEventListener('pointermove', e => {
      if (!dragging) return;
      didMove = true;
      panel.style.left = (origLeft + e.clientX - startX) + 'px';
      panel.style.top  = (origTop  + e.clientY - startY) + 'px';
    });

    const _floatEnd = e => {
      if (!dragging) return;
      if (didMove) e.preventDefault(); // suppress post-drag synthesized click
      dragging = false;
      const rect = panel.getBoundingClientRect();
      prefs.railFloatLeft = Math.round(rect.left);
      prefs.railFloatTop  = Math.round(rect.top);
      savePrefs();
    };
    titlebar.addEventListener('pointerup',     _floatEnd);
    titlebar.addEventListener('pointercancel', _floatEnd);
  }

  /* ── Rail tab label sync ─────────────────────────────────────────────── */
  function _initRailTabLabel() {
    const h2   = document.querySelector('#detail-header h2');
    const tab  = document.getElementById('ws-rail-tab');
    const span = tab?.querySelector('span');
    if (!h2 || !span) return;
    const sync = () => { span.textContent = h2.textContent.trim() || 'Details'; };
    sync();
    new MutationObserver(sync).observe(h2, { childList: true, characterData: true, subtree: true });
  }

  /* ── Map size ────────────────────────────────────────────────────────── */
  function scheduleMapSizeUpdate() {
    clearTimeout(_mapSizeTimer);
    _mapSizeTimer = setTimeout(() => {
      window.leafletMap?.invalidateSize({ animate: false });
    }, MAP_SIZE_DEBOUNCE);
  }

  /* ── Settings panel ──────────────────────────────────────────────────── */
  function openSettings() {
    const panel    = document.getElementById('ws-settings-panel');
    const backdrop = document.getElementById('ws-settings-backdrop');
    if (!panel || panel.hidden === false) return;
    panel.hidden    = false;
    backdrop.hidden = false;
    document.getElementById('ws-settings-btn')?.classList.add('active');
    document.getElementById('ws-settings-close')?.focus();
  }

  function closeSettings() {
    const panel    = document.getElementById('ws-settings-panel');
    const backdrop = document.getElementById('ws-settings-backdrop');
    if (!panel) return;
    panel.hidden    = true;
    backdrop.hidden = true;
    document.getElementById('ws-settings-btn')?.classList.remove('active');
    document.getElementById('ws-settings-btn')?.focus();
  }

  function updateSettingsUI() {
    _updatePresetUI();
    document.querySelectorAll('[data-ws-toggle]').forEach(input => {
      const id = input.dataset.wsToggle;
      input.checked = prefs.visibility[id] !== false;
    });
  }

  /* ── Settings search ─────────────────────────────────────────────────── */
  function _initSettingsSearch() {
    const input = document.getElementById('ws-settings-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll('[data-ws-item]').forEach(row => {
        if (!q) { row.hidden = false; return; }
        const text = (row.dataset.wsItem + ' ' + (row.dataset.wsTags || '')).toLowerCase();
        row.hidden = !text.includes(q);
      });
      document.querySelectorAll('.ws-settings-group').forEach(grp => {
        if (!q) { grp.hidden = false; return; }
        const any = Array.from(grp.querySelectorAll('[data-ws-item]')).some(r => !r.hidden);
        grp.hidden = !any;
      });
    });
  }

  /* ── Card popout ─────────────────────────────────────────────────────── */
  function _initCardPopout() {
    const body = document.getElementById('detail-body');
    if (!body) return;
    new MutationObserver(_injectPopoutBtns).observe(body, { childList: true, subtree: true });
    _injectPopoutBtns();
  }

  function _injectPopoutBtns() {
    document.querySelectorAll('.policy-scope-section').forEach(section => {
      const header = section.querySelector('.policy-scope-header');
      if (!header || header.querySelector('.ws-card-popout-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'ws-card-popout-btn';
      btn.title     = 'Pop out to floating window';
      btn.setAttribute('aria-label', 'Pop out to floating window');
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg>';
      btn.addEventListener('click', e => { e.stopPropagation(); _popoutCard(section); });
      header.appendChild(btn);
    });
  }

  function _popoutCard(sectionEl) {
    const titleEl = sectionEl.querySelector('.policy-scope-title, .policy-scope-header span:first-child');
    const title   = titleEl ? titleEl.textContent.trim() : 'Policy Details';

    // Snapshot content (strip popout button)
    const clone = sectionEl.cloneNode(true);
    clone.querySelectorAll('.ws-card-popout-btn').forEach(b => b.remove());
    const contentHTML = clone.innerHTML;

    // Insert placeholder, hide original
    const placeholder = document.createElement('div');
    placeholder.className = 'ws-card-placeholder';
    placeholder.innerHTML =
      '<span class="ws-card-placeholder-label">"' + _escHtml(title) + '" is in a floating window</span>' +
      '<button class="ws-card-return-btn" type="button">Return to rail</button>';
    sectionEl.parentNode.insertBefore(placeholder, sectionEl);
    sectionEl.style.display = 'none';

    // Build floating card
    const card   = document.createElement('div');
    card.className = 'ws-floating-card';
    card.tabIndex  = 0;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', title);

    const offset   = _floatingCards.length * 30;
    const railEl   = document.getElementById('detail-panel');
    const railLeft = (railEl && !railEl.classList.contains('ws-rail-collapsed') && !railEl.classList.contains('ws-rail-floating'))
      ? railEl.getBoundingClientRect().left
      : window.innerWidth;
    card.style.right = (window.innerWidth - railLeft + 10 + offset) + 'px';
    card.style.top   = (80 + offset) + 'px';

    card.innerHTML =
      '<div class="ws-fc-titlebar">' +
        '<span class="ws-fc-title">' + _escHtml(title) + '</span>' +
        '<button class="ws-fc-btn ws-fc-return" title="Return to rail" aria-label="Return to rail">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
        '</button>' +
        '<button class="ws-fc-btn ws-fc-close" title="Close" aria-label="Close">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="ws-fc-body"></div>';

    card.querySelector('.ws-fc-body').innerHTML = contentHTML;
    document.body.appendChild(card);

    const entry = { el: card, sectionEl, placeholder };
    _floatingCards.push(entry);

    _makeDraggable(card.querySelector('.ws-fc-titlebar'), card);
    card.querySelector('.ws-fc-return').addEventListener('click', () => _returnCard(entry));
    card.querySelector('.ws-fc-close').addEventListener('click', () => _returnCard(entry));
    placeholder.querySelector('.ws-card-return-btn').addEventListener('click', () => _returnCard(entry));

    card.addEventListener('pointerdown', () => _bringCardForward(card), { passive: true });
  }

  function _bringCardForward(card) {
    let maxZ = 850;
    _floatingCards.forEach(c => { const z = parseInt(c.el.style.zIndex || '850', 10); if (z > maxZ) maxZ = z; });
    card.style.zIndex = (maxZ + 1) + '';
  }

  function _returnCard(entry) {
    const { el, sectionEl, placeholder } = entry;
    if (sectionEl?.parentNode) sectionEl.style.display = '';
    if (placeholder?.parentNode) placeholder.parentNode.removeChild(placeholder);
    if (el?.parentNode) el.parentNode.removeChild(el);
    const idx = _floatingCards.indexOf(entry);
    if (idx >= 0) _floatingCards.splice(idx, 1);
  }

  function closeAllFloatingCards() {
    [..._floatingCards].forEach(_returnCard);
  }

  /* ── Generic drag helper ─────────────────────────────────────────────── */
  function _makeDraggable(handle, mover) {
    let dragging = false, didMove = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      e.preventDefault(); // suppresses post-drag synthesized click
      const rect = mover.getBoundingClientRect();
      dragging = true;
      didMove  = false;
      startX   = e.clientX; startY = e.clientY;
      origLeft = rect.left;  origTop = rect.top;
      mover.style.right  = '';
      mover.style.bottom = '';
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      didMove = true;
      mover.style.left = (origLeft + e.clientX - startX) + 'px';
      mover.style.top  = (origTop  + e.clientY - startY) + 'px';
    });
    const _dragEnd = e => {
      if (!dragging) return;
      if (didMove) e.preventDefault(); // suppress post-drag synthesized click
      dragging = false;
    };
    handle.addEventListener('pointerup',     _dragEnd);
    handle.addEventListener('pointercancel', _dragEnd);
  }

  /* ── County change → close all floating cards ────────────────────────── */
  function _initCountyChangeDetector() {
    const h2 = document.querySelector('#detail-header h2');
    if (!h2) return;
    let lastText = h2.textContent;
    new MutationObserver(() => {
      const text = h2.textContent;
      if (text !== lastText) { lastText = text; closeAllFloatingCards(); }
    }).observe(h2, { childList: true, characterData: true, subtree: true });
  }

  /* ── HTML helper ─────────────────────────────────────────────────────── */
  function _escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Settings toggle groups builder ─────────────────────────────────── */
  function _buildToggles() {
    const container = document.getElementById('ws-settings-toggles');
    if (!container) return;

    const groups = {};
    Object.entries(REG).forEach(([id, comp]) => {
      const g = comp.group || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push({ id, ...comp });
    });

    container.innerHTML = '';
    Object.entries(groups).forEach(([groupName, items]) => {
      const grpEl = document.createElement('div');
      grpEl.className = 'ws-settings-group';
      const hdr = document.createElement('div');
      hdr.className = 'ws-settings-group-header';
      hdr.innerHTML =
        '<span>' + _escHtml(groupName) + '</span>' +
        '<div class="ws-settings-group-actions">' +
          '<button class="ws-text-btn" type="button" data-ga="show" data-gn="' + _escHtml(groupName) + '">Show all</button>' +
          '<button class="ws-text-btn" type="button" data-ga="reset" data-gn="' + _escHtml(groupName) + '">Reset</button>' +
        '</div>';
      grpEl.appendChild(hdr);

      items.forEach(comp => {
        const row   = document.createElement('label');
        row.className = 'ws-toggle-row';
        row.dataset.wsItem = comp.id;
        row.dataset.wsTags = comp.tags || '';
        const span  = document.createElement('span');
        span.className   = 'ws-toggle-label';
        span.textContent = comp.label;
        const input = document.createElement('input');
        input.className = 'ws-toggle';
        input.type      = 'checkbox';
        input.dataset.wsToggle = comp.id;
        input.checked   = prefs.visibility[comp.id] !== false;
        input.addEventListener('change', () => setComponentVisibility(comp.id, input.checked));
        row.appendChild(span);
        row.appendChild(input);
        grpEl.appendChild(row);
      });

      hdr.querySelectorAll('[data-ga]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const action = btn.dataset.ga;
          const gn     = btn.dataset.gn;
          Object.entries(REG).forEach(([id, comp]) => {
            if ((comp.group || 'Other') !== gn) return;
            const vis = action === 'show' ? true : DEFAULT_VIS[id] !== false;
            setComponentVisibility(id, vis, { skipSave: true, skipPresetCheck: true });
          });
          _checkAutoCustomPreset();
          savePrefs();
          updateSettingsUI();
        });
      });

      container.appendChild(grpEl);
    });
  }

  /* ── DOM injection ───────────────────────────────────────────────────── */
  function injectDOM() {
    const detailPanel  = document.getElementById('detail-panel');
    const detailHeader = document.getElementById('detail-header');
    const headerRight  = document.getElementById('header-right');
    if (!detailPanel || !detailHeader || !headerRight) return;

    /* 1. Resize handle */
    if (!document.getElementById('ws-rail-resize')) {
      const handle = document.createElement('div');
      handle.id = 'ws-rail-resize';
      handle.setAttribute('aria-hidden', 'true');
      detailPanel.insertBefore(handle, detailPanel.firstChild);
    }

    /* 2. Floating titlebar (before detail-header) */
    if (!document.getElementById('ws-float-titlebar')) {
      const tb = document.createElement('div');
      tb.id = 'ws-float-titlebar';
      tb.setAttribute('aria-hidden', 'true');
      tb.innerHTML =
        '<span class="ws-float-title">Detail Panel</span>' +
        '<div class="ws-float-controls">' +
          '<button class="ws-float-btn" id="ws-rail-dock" type="button" title="Dock to right edge" aria-label="Dock panel to right edge" hidden>' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><rect x="15" y="3" width="6" height="18" rx="1"/><path d="M3 12h9M8 8l4 4-4 4"/></svg>' +
          '</button>' +
        '</div>';
      detailPanel.insertBefore(tb, detailHeader);
    }

    /* 3. Rail controls (right side of detail-header) */
    if (!document.getElementById('ws-rail-controls')) {
      const ctrls = document.createElement('div');
      ctrls.id = 'ws-rail-controls';
      ctrls.setAttribute('aria-label', 'Panel controls');
      ctrls.innerHTML =
        '<button class="ws-rail-btn" id="ws-rail-float" type="button" title="Pop out as floating window" aria-label="Pop out as floating window">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 2h6v6"/><path d="m22 2-9 9"/></svg>' +
        '</button>' +
        '<button class="ws-rail-btn" id="ws-rail-collapse" type="button" title="Collapse panel" aria-label="Collapse panel">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>';
      detailHeader.appendChild(ctrls);
    }

    /* 4. Rail restore tab (fixed, appended to body) */
    if (!document.getElementById('ws-rail-tab')) {
      const tab = document.createElement('button');
      tab.id     = 'ws-rail-tab';
      tab.type   = 'button';
      tab.hidden = true;
      tab.setAttribute('aria-label', 'Restore detail panel');
      tab.innerHTML = '<span>Details</span>';
      document.body.appendChild(tab);
    }

    /* 5. Settings gear button in header-right */
    if (!document.getElementById('ws-settings-btn')) {
      const btn = document.createElement('button');
      btn.id        = 'ws-settings-btn';
      btn.type      = 'button';
      btn.className = 'header-icon-btn';
      btn.title     = 'Workspace settings';
      btn.setAttribute('aria-label', 'Workspace settings');
      btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
      const themeBtn = headerRight.querySelector('#theme-toggle');
      headerRight.insertBefore(btn, themeBtn || null);
    }

    /* 6. Settings backdrop */
    if (!document.getElementById('ws-settings-backdrop')) {
      const bd = document.createElement('div');
      bd.id     = 'ws-settings-backdrop';
      bd.hidden = true;
      document.body.appendChild(bd);
    }

    /* 7. Settings panel */
    if (!document.getElementById('ws-settings-panel')) {
      const sp = document.createElement('div');
      sp.id     = 'ws-settings-panel';
      sp.hidden = true;
      sp.setAttribute('role', 'dialog');
      sp.setAttribute('aria-label', 'Workspace Settings');
      sp.setAttribute('aria-modal', 'true');
      sp.innerHTML =
        '<div class="ws-settings-header">' +
          '<h3>Workspace</h3>' +
          '<button id="ws-settings-close" type="button" aria-label="Close workspace settings">&#x2715;</button>' +
        '</div>' +
        '<div class="ws-settings-body">' +
          '<div class="ws-settings-section">' +
            '<div class="ws-settings-section-title">Layout Preset</div>' +
            '<div class="ws-preset-row">' +
              '<button class="ws-preset-btn" type="button" data-preset="guided"><span class="ws-preset-name">Guided</span></button>' +
              '<button class="ws-preset-btn" type="button" data-preset="analyst"><span class="ws-preset-name">Analyst</span></button>' +
              '<button class="ws-preset-btn" type="button" data-preset="minimal"><span class="ws-preset-name">Minimal</span></button>' +
              '<button class="ws-preset-btn" type="button" data-preset="custom"><span class="ws-preset-name">Custom</span></button>' +
            '</div>' +
            '<p class="ws-preset-desc" id="ws-preset-desc"></p>' +
          '</div>' +
          '<div class="ws-settings-section">' +
            '<input class="ws-settings-search" id="ws-settings-search" type="search" placeholder="Find a setting…" aria-label="Search settings" autocomplete="off" />' +
          '</div>' +
          '<div id="ws-settings-toggles"></div>' +
          '<div class="ws-settings-section">' +
            '<div class="ws-settings-section-title">Actions</div>' +
            '<div class="ws-settings-actions">' +
              '<button class="ws-action-btn" type="button" data-ws-action="show-all">Show Everything</button>' +
              '<button class="ws-action-btn" type="button" data-ws-action="hide-optional">Minimal Map</button>' +
              '<button class="ws-action-btn" type="button" data-ws-action="reset-positions">Reset Window Positions</button>' +
              '<button class="ws-action-btn" type="button" data-ws-action="return-cards">Return All Cards to Rail</button>' +
              '<button class="ws-action-btn ws-danger-btn" type="button" data-ws-action="clear-workspace">Clear Saved Workspace</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(sp);
    }

    _buildToggles();
  }

  /* ── Wire events ─────────────────────────────────────────────────────── */
  function wireEvents() {
    document.getElementById('ws-settings-btn')?.addEventListener('click', openSettings);
    const _closeBtn    = document.getElementById('ws-settings-close');
    const _settingsBdp = document.getElementById('ws-settings-backdrop');
    _closeBtn?.addEventListener('click', closeSettings);
    _settingsBdp?.addEventListener('click', closeSettings);
    _closeBtn?.addEventListener('touchend', e => { e.preventDefault(); closeSettings(); });
    _settingsBdp?.addEventListener('touchend', e => { e.preventDefault(); closeSettings(); });

    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => setPreset(btn.dataset.preset));
    });

    document.getElementById('ws-rail-collapse')?.addEventListener('click', () => {
      prefs.railCollapsed ? restoreRail() : collapseRail();
    });

    document.getElementById('ws-rail-float')?.addEventListener('click', floatRail);
    document.getElementById('ws-rail-dock')?.addEventListener('click', dockRail);

    document.getElementById('ws-rail-tab')?.addEventListener('click', restoreRail);

    document.querySelectorAll('[data-ws-action]').forEach(btn => {
      btn.addEventListener('click', () => _handleAction(btn.dataset.wsAction));
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const sp = document.getElementById('ws-settings-panel');
      if (sp && !sp.hidden) { e.stopPropagation(); closeSettings(); }
    });

    _initRailResize();
    _initRailFloatDrag();
    _initRailTabLabel();
    _initCardPopout();
    _initCountyChangeDetector();
    _initSettingsSearch();
  }

  /* ── Action handler ──────────────────────────────────────────────────── */
  function _handleAction(action) {
    switch (action) {
      case 'show-all':
        prefs.preset     = 'guided';
        prefs.visibility = Object.assign({}, DEFAULT_VIS);
        savePrefs();
        applyVisibility();
        updateSettingsUI();
        break;
      case 'hide-optional':
        setPreset('minimal');
        break;
      case 'reset-positions': {
        prefs.railFloatLeft = null;
        prefs.railFloatTop  = null;
        const panel = document.getElementById('detail-panel');
        if (panel?.classList.contains('ws-rail-floating')) {
          panel.style.left  = '';
          panel.style.top   = '';
          panel.style.right = '80px';
        }
        savePrefs();
        break;
      }
      case 'return-cards':
        closeAllFloatingCards();
        break;
      case 'clear-workspace':
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        prefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
        dockRail();
        setRailWidth(DEFAULT_RAIL_W);
        applyVisibility();
        updateSettingsUI();
        break;
    }
  }

  /* ── Apply all preferences ───────────────────────────────────────────── */
  function _applyPrefs() {
    const panel = document.getElementById('detail-panel');
    if (panel) panel.style.width = prefs.railWidth + 'px';

    if (prefs.railFloating)  floatRail();
    else if (prefs.railCollapsed) collapseRail();

    _syncFloatBtn();
    applyVisibility();
    scheduleMapSizeUpdate();
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  let _initialized = false;
  function init() {
    if (_initialized) return;
    _initialized = true;
    loadPrefs();
    injectDOM();
    wireEvents();
    _applyPrefs();
    updateSettingsUI();
  }

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.MapWorkspace = {
    init,
    openSettings,
    closeSettings,
    setPreset,
    setComponentVisibility,
    collapseRail,
    restoreRail,
    floatRail,
    dockRail,
    closeAllFloatingCards,
    scheduleMapSizeUpdate,
    updateSettingsUI,
  };

  /* Self-initialize — this script loads with defer so the DOM is ready.
     map.js also calls MapWorkspace.init() after its async data load; the
     _initialized guard makes that second call a no-op. */
  init();

}());
