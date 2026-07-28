/* js/3d/index.js
 * window.SCENE3D — public coordinator for the 3D terrain view. Mirrors
 * window.PARCEL's shape (js/parcel/index.js): a small always-loaded
 * bootstrap that map.js calls into, with the actual Three.js engine lazy-
 * loaded on first activation so non-3D visitors download zero 3D bytes.
 *
 * Call order from map.js:
 *   1. window.SCENE3D.init(leafletMap)              — after Leaflet map is ready
 *   2. window.SCENE3D.onCountyChanged(fips)          — from handleCountyClick
 *   3. window.SCENE3D.onLayerToggle('terrain_3d', v) — from setLayerVisible
 *   4. window.SCENE3D.applyState(scene3d)            — from _applyWorkspace, may be null
 *   5. window.SCENE3D.captureState()                 — from _captureWorkspaceState, may return null
 *
 * This file must stay dependency-free (no THREE import) so it is always
 * safe to load eagerly. It never imports vendor/three/* itself — activate()
 * inserts a <script type="module" src="js/3d/engine.js"> only when the user
 * actually opens 3D mode, and engine.js calls _registerEngine() once ready.
 */
window.SCENE3D = (function () {
  'use strict';

  let _map            = null;
  let _selectedFips    = null;
  let _active          = false;
  let _capability      = null;
  let _engine          = null;   // registered by js/3d/engine.js once loaded
  let _engineLoadPromise = null;
  let _engineResolve   = null;
  let _engineReject    = null;
  let _pendingState    = null;   // scene3d state to apply once the engine loads

  function _els() {
    return {
      panel:  document.getElementById('scene3d-panel'),
      status: document.getElementById('scene3d-status'),
      host:   document.getElementById('scene3d-canvas-host'),
    };
  }

  function _showStatus(message, kind) {
    const { status } = _els();
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.dataset.kind = kind || 'info';
  }

  function _hideStatus() {
    const { status } = _els();
    if (status) status.hidden = true;
  }

  /* Safe to call multiple times — subsequent calls are no-ops beyond
   * updating the stored map reference. */
  function init(map) {
    _map = map;
  }

  /* Cheap, synchronous WebGL capability check — cached after first call so
   * UI (e.g. disabling the rail button with an explanatory title) can call
   * this freely without re-probing WebGL every time. */
  function isAvailable() {
    if (!_capability) {
      _capability = window.SCENE3D_FALLBACK
        ? window.SCENE3D_FALLBACK.detectWebGL()
        : { ok: false, reason: 'no-document' };
    }
    return _capability;
  }

  function onCountyChanged(fips) {
    _selectedFips = fips || null;
    if (_engine && _active) {
      try { _engine.onCountyChanged(_selectedFips); } catch (_) {}
    }
  }

  function onLayerToggle(layerId, visible, fips) {
    if (layerId !== 'terrain_3d') return;
    if (_engine && _active) {
      try { _engine.onLayerToggle(layerId, visible, fips || _selectedFips); } catch (_) {}
    }
  }

  /* Returns a scene3d-shaped object, or null when 3D was never activated
   * this session — callers (js/map.js _captureWorkspaceState) must only
   * attach the field to a saved workspace when this is non-null, so a user
   * who never touches 3D doesn't get a stub scene3d key on every save. */
  function captureState() {
    if (!_engine || !_active) return null;
    try {
      return window.SCENE3D_STATE
        ? window.SCENE3D_STATE.captureScene3dState(_engine.getSceneDescriptor())
        : null;
    } catch (_) {
      return null;
    }
  }

  /* state may be null (pre-Phase-A saved workspace) — a no-op, not an error. */
  function applyState(state) {
    const normalized = window.SCENE3D_STATE
      ? window.SCENE3D_STATE.migrateScene3dState(state)
      : null;
    if (!normalized) return;

    if (_engine) {
      try { _engine.applyState(normalized); } catch (_) {}
    } else {
      _pendingState = normalized;
      if (normalized.active) activate();
    }
  }

  function _loadEngine() {
    if (_engineLoadPromise) return _engineLoadPromise;
    _engineLoadPromise = new Promise((resolve, reject) => {
      _engineResolve = resolve;
      _engineReject  = reject;
      try {
        const s = document.createElement('script');
        s.type = 'module';
        s.src = 'js/3d/engine.js' + (window.APP_VERSION ? ('?v=' + window.APP_VERSION) : '');
        s.onerror = () => { if (_engineReject) _engineReject(new Error('engine-load-failed')); };
        document.head.appendChild(s);
      } catch (e) {
        reject(e);
      }
    });
    return _engineLoadPromise;
  }

  /* Called by js/3d/engine.js at the end of its own module evaluation. */
  function _registerEngine(api) {
    _engine = api;
    if (_engineResolve) { _engineResolve(api); _engineResolve = null; _engineReject = null; }
  }

  /* User opened 3D mode. Never throws — resolves false on any failure so
   * the caller (map.js toggleScene3D) can always proceed with UI state.
   * Three.js is only fetched here, and only if WebGL is actually usable. */
  async function activate() {
    const cap = isAvailable();
    if (!cap.ok) {
      _showStatus(
        (window.SCENE3D_FALLBACK && window.SCENE3D_FALLBACK.MESSAGES[cap.reason]) ||
          "3D view isn't available on this device or browser.",
        'error'
      );
      return false;
    }

    _active = true;
    try {
      if (!_engine) {
        _showStatus('Loading 3D view…', 'loading');
        await _loadEngine();
      }
      _hideStatus();
      const { host } = _els();
      _engine.activate({
        host, map: _map, fips: _selectedFips,
        onStatus: _showStatus, onStatusClear: _hideStatus,
      });
      if (cap.lowPower) {
        _showStatus(window.SCENE3D_FALLBACK.MESSAGES['low-power'], 'warning');
      }
      if (_pendingState) {
        _engine.applyState(_pendingState);
        _pendingState = null;
      }
      return true;
    } catch (e) {
      _active = false;
      _showStatus(
        (window.SCENE3D_FALLBACK && window.SCENE3D_FALLBACK.MESSAGES['engine-load-failed']) ||
          "3D view couldn't be loaded.",
        'error'
      );
      return false;
    }
  }

  function deactivate() {
    _active = false;
    if (_engine) {
      try { _engine.deactivate(); } catch (_) {}
    }
  }

  function _notifyObjectsChanged() {
    try { document.dispatchEvent(new CustomEvent('scene3d:objects-changed', { detail: {} })); } catch (_) {}
  }

  /* Phase B: object system (building volumes), selection, undo/redo, and
   * live site metrics. Every method here is guarded the same way as the
   * Phase A methods above — a missing/inactive engine is always a safe
   * no-op, never a thrown error, so UI code never needs its own try/catch
   * around these calls. */
  function createBuilding(overrides) {
    if (!_engine || !_active) return null;
    let obj = null;
    try { obj = _engine.createBuilding(overrides); } catch (_) {}
    _notifyObjectsChanged();
    return obj;
  }

  /* type: 'building' | 'parking' | 'road' | 'fence' (Phase C). */
  function createObject(type, overrides) {
    if (!_engine || !_active) return null;
    let obj = null;
    try { obj = _engine.createObject(type, overrides); } catch (_) {}
    _notifyObjectsChanged();
    return obj;
  }

  function updateObject(id, patch) {
    if (!_engine || !_active) return null;
    let obj = null;
    try { obj = _engine.updateObject(id, patch); } catch (_) {}
    _notifyObjectsChanged();
    return obj;
  }

  function deleteSelected() {
    if (!_engine || !_active) return false;
    let ok = false;
    try { ok = _engine.deleteSelected(); } catch (_) {}
    _notifyObjectsChanged();
    return ok;
  }

  function undo() {
    if (!_engine || !_active) return false;
    let ok = false;
    try { ok = _engine.undo(); } catch (_) {}
    _notifyObjectsChanged();
    return ok;
  }

  function redo() {
    if (!_engine || !_active) return false;
    let ok = false;
    try { ok = _engine.redo(); } catch (_) {}
    _notifyObjectsChanged();
    return ok;
  }

  function historyCounts() {
    if (!_engine || !_active) return { undo: 0, redo: 0 };
    try { return _engine.historyCounts(); } catch (_) { return { undo: 0, redo: 0 }; }
  }

  function getMetrics() {
    if (!_engine || !_active) return null;
    try { return _engine.getMetrics(); } catch (_) { return null; }
  }

  function listObjects() {
    if (!_engine || !_active) return [];
    try { return _engine.listObjects(); } catch (_) { return []; }
  }

  function selectObject(id) {
    if (!_engine || !_active) return;
    try { _engine.selectObject(id); } catch (_) {}
  }

  function deselectObject() {
    if (!_engine || !_active) return;
    try { _engine.deselectObject(); } catch (_) {}
  }

  function setTransformMode(mode) {
    if (!_engine || !_active) return;
    try { _engine.setTransformMode(mode); } catch (_) {}
  }

  /* Phase C: construction-phasing preview. phase=null shows every phase. */
  function setPhaseFilter(phase) {
    if (!_engine || !_active) return;
    try { _engine.setPhaseFilter(phase); } catch (_) {}
    _notifyObjectsChanged();
  }

  function listPhases() {
    if (!_engine || !_active) return [];
    try { return _engine.listPhases(); } catch (_) { return []; }
  }

  /* Phase D: generic development templates and the data-center campus
   * generator. listTemplates() is available with no engine required (it's
   * just a static list for UI display) — but instantiating needs an active
   * scene, same guard as everything else. */
  function listTemplates() {
    return (window.SCENE3D_TEMPLATES && window.SCENE3D_TEMPLATES.list()) || [];
  }

  function instantiateTemplate(templateId) {
    if (!_engine || !_active) return [];
    let created = [];
    try { created = _engine.instantiateTemplate(templateId); } catch (_) {}
    _notifyObjectsChanged();
    return created;
  }

  /* Requires a parcel to be selected — the engine/generator refuse and
   * return an explanatory warning rather than throwing when none is. */
  function generateCampus(opts) {
    if (!_engine || !_active) return { halls: [], substations: [], fences: [], roads: [], warnings: ['3D view is not active.'], disclaimer: '' };
    let result = null;
    try { result = _engine.generateCampus(opts); } catch (_) {}
    _notifyObjectsChanged();
    return result || { halls: [], substations: [], fences: [], roads: [], warnings: ['Campus generation failed.'], disclaimer: '' };
  }

  /* Phase D: sun position / shadows. dateISO=null tracks "now." */
  function setSunTime(dateISO) {
    if (!_engine || !_active) return null;
    try { return _engine.setSunTime(dateISO); } catch (_) { return null; }
  }

  function getSunInfo() {
    if (!_engine || !_active) return null;
    try { return _engine.getSunInfo(); } catch (_) { return null; }
  }

  /* Phase D: saved viewpoints — session-only until captureState() persists
   * them into the workspace's scene3d.viewpoints field. */
  function saveViewpoint(name) {
    if (!_engine || !_active) return null;
    try { return _engine.saveViewpoint(name); } catch (_) { return null; }
  }

  function listViewpoints() {
    if (!_engine || !_active) return [];
    try { return _engine.listViewpoints(); } catch (_) { return []; }
  }

  function applyViewpoint(id) {
    if (!_engine || !_active) return false;
    try { return _engine.applyViewpoint(id); } catch (_) { return false; }
  }

  function deleteViewpoint(id) {
    if (!_engine || !_active) return false;
    try { return _engine.deleteViewpoint(id); } catch (_) { return false; }
  }

  return {
    init, onCountyChanged, onLayerToggle, isAvailable,
    captureState, applyState, activate, deactivate,
    createBuilding, createObject, updateObject, deleteSelected, undo, redo, historyCounts,
    getMetrics, listObjects, selectObject, deselectObject, setTransformMode,
    setPhaseFilter, listPhases,
    listTemplates, instantiateTemplate, generateCampus,
    setSunTime, getSunInfo,
    saveViewpoint, listViewpoints, applyViewpoint, deleteViewpoint,
    _registerEngine,
  };
})();
