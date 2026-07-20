/* js/command-palette.js — Global command palette (Ctrl/Cmd+K)
   No external deps. Works standalone; integrates with map.js globals if present.
   Security: all dynamic text written via textContent — no innerHTML with user data.
*/
(function () {
  'use strict';

  /* ── Static command registry ── */
  const NAV_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
  const MAP_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>';
  const TOOL_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
  const LAYER_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
  const THEME_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const WS_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>';
  const AUTH_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const KB_ICON   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>';
  const PIN_ICON  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  const STATIC_COMMANDS = [
    // Navigation
    { id: 'nav-home',      label: 'Go to Home',             cat: 'Navigate',   icon: NAV_ICON,  action: () => _tab('home') },
    { id: 'nav-map',       label: 'Go to Map',              cat: 'Navigate',   icon: MAP_ICON,  action: () => _tab('map') },
    { id: 'nav-news',      label: 'Go to AI News',          cat: 'Navigate',   icon: NAV_ICON,  action: () => _tab('news') },
    { id: 'nav-stocks',    label: 'Go to AI Stocks',        cat: 'Navigate',   icon: NAV_ICON,  action: () => _tab('stocks') },
    { id: 'nav-analytics', label: 'Go to Analytics',        cat: 'Navigate',   icon: NAV_ICON,  action: () => _tab('analytics') },
    { id: 'nav-about',     label: 'Go to About',            cat: 'Navigate',   icon: NAV_ICON,  action: () => _tab('about') },
    // Map tools
    { id: 'tool-measure',  label: 'Measure Distance',       cat: 'Map Tools',  icon: TOOL_ICON, action: () => _gis('gis-measure') },
    { id: 'tool-draw',     label: 'Draw Polygon',           cat: 'Map Tools',  icon: TOOL_ICON, action: () => _gis('gis-draw') },
    { id: 'tool-radius',   label: 'Radius Buffer',          cat: 'Map Tools',  icon: TOOL_ICON, action: () => _gis('gis-radius') },
    { id: 'tool-pin',      label: 'Drop Candidate Site Pin',cat: 'Map Tools',  icon: PIN_ICON,  action: () => _gis('gis-pin') },
    { id: 'tool-compare',  label: 'Compare Counties',       cat: 'Map Tools',  icon: TOOL_ICON, action: () => _gis('gis-compare') },
    { id: 'tool-export',   label: 'Export Data',            cat: 'Map Tools',  icon: TOOL_ICON, action: () => _gis('gis-export') },
    { id: 'tool-share',    label: 'Copy Share Link',        cat: 'Map Tools',  icon: TOOL_ICON, action: () => _gis('gis-share') },
    { id: 'tool-locate',   label: 'Find My Location',       cat: 'Map Tools',  icon: PIN_ICON,  action: () => _gis('gis-locate') },
    { id: 'tool-fullscreen',label:'Toggle Fullscreen',      cat: 'Map Tools',  icon: TOOL_ICON, action: () => _gis('gis-fullscreen') },
    // Layers
    { id: 'layer-ai',      label: 'Toggle AI Campuses Layer',     cat: 'Layers', icon: LAYER_ICON, action: () => _layerToggle('ai_campus') },
    { id: 'layer-dc',      label: 'Toggle Data Centers Layer',    cat: 'Layers', icon: LAYER_ICON, action: () => _layerToggle('dc_existing') },
    { id: 'layer-planned', label: 'Toggle Planned DCs Layer',     cat: 'Layers', icon: LAYER_ICON, action: () => _layerToggle('dc_planned') },
    { id: 'layer-power',   label: 'Toggle Power Infrastructure',  cat: 'Layers', icon: LAYER_ICON, action: () => _layerToggle('power') },
    { id: 'layer-fiber',   label: 'Toggle Fiber Network',         cat: 'Layers', icon: LAYER_ICON, action: () => _layerToggle('fiber') },
    { id: 'layer-water',   label: 'Toggle Water Stress',          cat: 'Layers', icon: LAYER_ICON, action: () => _layerToggle('water') },
    { id: 'layer-tax',     label: 'Toggle Tax Incentive Areas',   cat: 'Layers', icon: LAYER_ICON, action: () => _layerToggle('tax') },
    { id: 'layer-risk',    label: 'Toggle Political Risk Layer',  cat: 'Layers', icon: LAYER_ICON, action: () => _gis('gis-political-risk') },
    // Theme
    { id: 'theme-dark',    label: 'Switch to Dark Theme',         cat: 'Appearance', icon: THEME_ICON, action: () => _theme('dark') },
    { id: 'theme-light',   label: 'Switch to Light Theme',        cat: 'Appearance', icon: THEME_ICON, action: () => _theme('light') },
    { id: 'theme-system',  label: 'Use System Theme',             cat: 'Appearance', icon: THEME_ICON, action: () => _theme('system') },
    // Workspace
    { id: 'ws-settings',   label: 'Open Workspace Settings',      cat: 'Workspace', icon: WS_ICON, action: () => window.MapWorkspace?.openSettings() },
    { id: 'ws-guided',     label: 'Workspace: Guided Layout',     cat: 'Workspace', icon: WS_ICON, action: () => window.MapWorkspace?.setPreset('guided') },
    { id: 'ws-analyst',    label: 'Workspace: Analyst Layout',    cat: 'Workspace', icon: WS_ICON, action: () => window.MapWorkspace?.setPreset('analyst') },
    { id: 'ws-minimal',    label: 'Workspace: Minimal Layout',    cat: 'Workspace', icon: WS_ICON, action: () => window.MapWorkspace?.setPreset('minimal') },
    // Auth
    { id: 'auth-account',  label: 'Open Account / Sign In',       cat: 'Account',   icon: AUTH_ICON, action: () => document.getElementById('auth-btn')?.click() },
    // Keyboard
    { id: 'kb-shortcuts',  label: 'Show Keyboard Shortcuts',      cat: 'Help',      icon: KB_ICON,  action: () => document.getElementById('kb-help-btn')?.click() },
  ];

  /* ── Action helpers ── */
  function _tab(name) {
    document.querySelector(`.header-tab[data-tab="${name}"]`)?.click();
  }

  function _gis(id) {
    _tab('map');
    setTimeout(() => document.getElementById(id)?.click(), 150);
  }

  function _layerToggle(layerId) {
    _tab('map');
    setTimeout(() => {
      const cb = document.querySelector(`input[data-layer="${layerId}"]`);
      if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    }, 200);
  }

  function _theme(val) {
    if (typeof window._applyTheme === 'function') {
      window._applyTheme(val);
    } else {
      if (val === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', val);
      const light = val === 'light' || (val === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
      document.documentElement.classList.toggle('is-light-theme', light);
    }
    localStorage.setItem('theme', val);
  }

  function _zoomToState(abbr) {
    _tab('map');
    setTimeout(() => {
      const input = document.getElementById('search-input');
      if (!input) return;
      input.value = abbr;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        const first = document.querySelector('.search-result-item');
        if (first) first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      }, 120);
    }, 200);
  }

  /* ── Build full command list (static + dynamic state entries) ── */
  function _allCommands() {
    const cmds = STATIC_COMMANDS.slice();
    const stateNames = window._STATE_NAMES || {};
    Object.entries(stateNames).forEach(([abbr, name]) => {
      cmds.push({
        id: 'state-' + abbr,
        label: 'Zoom to ' + name,
        cat: 'States',
        icon: PIN_ICON,
        action: () => _zoomToState(abbr),
      });
    });
    return cmds;
  }

  /* ── Fuzzy scoring ── */
  function _score(label, q) {
    if (!q) return 1;
    const t = label.toLowerCase();
    if (t === q) return 10;
    if (t.startsWith(q)) return 7;
    if (t.includes(q)) return 5;
    // all chars of q appear in order within t
    let ci = 0;
    for (let i = 0; i < t.length && ci < q.length; i++) {
      if (t[i] === q[ci]) ci++;
    }
    return ci === q.length ? 2 : 0;
  }

  /* ── State ── */
  let _open      = false;
  let _activeIdx = 0;
  let _filtered  = [];
  let _overlay, _input, _listEl;

  /* ── DOM inject (lazy, on first open) ── */
  function _inject() {
    _overlay = document.createElement('div');
    _overlay.id = 'cmd-palette';
    _overlay.setAttribute('role', 'dialog');
    _overlay.setAttribute('aria-label', 'Command palette');
    _overlay.setAttribute('aria-modal', 'true');
    _overlay.hidden = true;

    const box = document.createElement('div');
    box.id = 'cmd-box';

    const searchWrap = document.createElement('div');
    searchWrap.id = 'cmd-search-wrap';
    searchWrap.innerHTML = '<svg id="cmd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

    _input = document.createElement('input');
    _input.id = 'cmd-input';
    _input.type = 'text';
    _input.placeholder = 'Search commands or type a state name…';
    _input.autocomplete = 'off';
    _input.spellcheck = false;
    _input.setAttribute('aria-label', 'Search commands');
    _input.setAttribute('aria-autocomplete', 'list');
    _input.setAttribute('aria-controls', 'cmd-list');
    _input.setAttribute('role', 'combobox');
    _input.setAttribute('aria-expanded', 'true');

    const escHint = document.createElement('kbd');
    escHint.id = 'cmd-esc-hint';
    escHint.textContent = 'Esc';

    searchWrap.appendChild(_input);
    searchWrap.appendChild(escHint);

    _listEl = document.createElement('ul');
    _listEl.id = 'cmd-list';
    _listEl.setAttribute('role', 'listbox');
    _listEl.setAttribute('aria-label', 'Commands');

    const footer = document.createElement('div');
    footer.id = 'cmd-footer';
    footer.innerHTML = '<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> run</span><span><kbd>Esc</kbd> close</span>';

    box.appendChild(searchWrap);
    box.appendChild(_listEl);
    box.appendChild(footer);
    _overlay.appendChild(box);
    document.body.appendChild(_overlay);

    _overlay.addEventListener('pointerdown', e => {
      if (e.target === _overlay) close();
    });
    _input.addEventListener('input', _render);
    _input.addEventListener('keydown', _onKey);
  }

  /* ── Render list ── */
  function _render() {
    const q = _input.value.trim().toLowerCase();
    const all = _allCommands();

    _filtered = all
      .map(cmd => ({ cmd, s: _score(cmd.label, q) + (cmd.cat === 'Navigate' && !q ? 0.5 : 0) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s || a.cmd.label.localeCompare(b.cmd.label))
      .slice(0, 14)
      .map(x => x.cmd);

    _activeIdx = _filtered.length ? 0 : -1;
    _listEl.innerHTML = '';

    if (!_filtered.length) {
      const empty = document.createElement('li');
      empty.className = 'cmd-empty';
      empty.textContent = 'No commands match "' + _input.value.trim() + '"';
      _listEl.appendChild(empty);
      return;
    }

    let lastCat = null;
    _filtered.forEach((cmd, i) => {
      if (cmd.cat !== lastCat) {
        lastCat = cmd.cat;
        const divider = document.createElement('li');
        divider.className = 'cmd-cat';
        divider.setAttribute('role', 'presentation');
        divider.textContent = cmd.cat;
        _listEl.appendChild(divider);
      }
      const li = document.createElement('li');
      li.className = 'cmd-item' + (i === _activeIdx ? ' active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === _activeIdx ? 'true' : 'false');
      li.dataset.idx = String(i);

      // icon (SVG constant — not user data)
      if (cmd.icon) {
        const iconWrap = document.createElement('span');
        iconWrap.className = 'cmd-icon';
        iconWrap.innerHTML = cmd.icon;
        li.appendChild(iconWrap);
      }

      // label — textContent for safety
      const label = document.createElement('span');
      label.className = 'cmd-label';
      label.textContent = cmd.label;
      li.appendChild(label);

      li.addEventListener('pointerdown', e => { e.preventDefault(); _execute(cmd); });
      li.addEventListener('pointerenter', () => { _activeIdx = i; _updateFocus(); });
      _listEl.appendChild(li);
    });
  }

  function _updateFocus() {
    _listEl.querySelectorAll('.cmd-item').forEach((el, i) => {
      const on = i === _activeIdx;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function _onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _activeIdx = Math.min(_activeIdx + 1, _filtered.length - 1);
      _updateFocus(); return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      _activeIdx = Math.max(_activeIdx - 1, 0);
      _updateFocus(); return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (_activeIdx >= 0 && _filtered[_activeIdx]) _execute(_filtered[_activeIdx]);
    }
  }

  /* ── Open / close / execute ── */
  function open() {
    if (!_overlay) _inject();
    _open = true;
    _overlay.hidden = false;
    _input.value = '';
    _render();
    requestAnimationFrame(() => _input.focus());
  }

  function close() {
    if (!_overlay) return;
    _open = false;
    _overlay.hidden = true;
  }

  function _execute(cmd) {
    close();
    setTimeout(() => {
      try { cmd.action(); } catch (e) { console.warn('[CommandPalette]', e); }
    }, 40);
  }

  /* ── Global keyboard shortcut ── */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      _open ? close() : open();
      return;
    }
    // Also open on '/' key when not in an input (convenience shortcut)
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      _open ? close() : open();
    }
  });

  /* ── Public API ── */
  window.CMD_PALETTE = { open, close };
}());
