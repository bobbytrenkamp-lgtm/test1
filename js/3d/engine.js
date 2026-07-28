/* js/3d/engine.js  (ES module — the only file that imports Three.js)
 * Lazy-loaded by js/3d/index.js on first SCENE3D.activate(). Owns the
 * THREE.Scene/Camera/Renderer, the terrain mesh, the Phase B object system
 * (building volumes, selection, transform gizmo, undo/redo), and the render
 * loop. Registers itself back onto window.SCENE3D via _registerEngine() so
 * the always-loaded coordinator can call into it without importing THREE.
 */
import * as THREE from '../../vendor/three/three.module.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { TransformControls } from '../../vendor/three/TransformControls.js';
import { buildTerrainMesh, projectLatLng, unprojectXZ } from './terrain.js';
import { createOrbitCamera } from './camera.js';

const TT = window.SCENE3D_TERRAIN_TILES;
const OBJECTS = window.SCENE3D_OBJECTS;
const SELECTION = window.SCENE3D_SELECTION;
const CONSTRAINTS = window.SCENE3D_CONSTRAINTS;
const HISTORY = window.SCENE3D_HISTORY.createHistory();

const TYPE_COLORS = {
  building: 0xd9a15c,
  parking:  0x4a4a52,
  road:     0x6b6b73,
  fence:    0x8a7a63,
};
const SELECTED_COLOR = 0x4874e8;
const CONFLICT_COLOR = 0xd9534f;
const METERS_PER_FOOT = 0.3048;
const SQFT_TO_SQM = 0.092903;

let renderer = null;
let scene = null;
let orbitCamera = null;
let terrainGroup = null;
let objectsGroup = null;
let boundaryGroup = null;
let parcelBoundaryLocal = null;  // array of {x,z} in scene-local meters, or null when no parcel selected
let transformControls = null;
let transformHelper = null;
let animFrame = null;
let resizeObserver = null;
let host = null;
let map = null;
let originLat = null;
let originLng = null;
let currentFips = null;
let exaggeration = 1.5;
let terrainVisible = true;
let terrainStatusCb = null;
let terrainClearCb = null;
let activePhaseFilter = null; // null = show all phases; otherwise a phase number

const objectMeshes = new Map();          // objectId -> THREE.Mesh
const constraintStatusById = new Map();  // objectId -> { status, reasons }

function _materialFor(obj, selected, constraintStatus) {
  const color = selected
    ? SELECTED_COLOR
    : (constraintStatus === 'conflict' ? CONFLICT_COLOR : (TYPE_COLORS[obj.type] || TYPE_COLORS.building));
  const opts = { color };
  if (obj.type === 'fence') { opts.transparent = true; opts.opacity = 0.6; }
  return new THREE.MeshLambertMaterial(opts);
}

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let pointerDownScreen = null;
let transformDragSnapshot = null; // { id, position, rotationDeg } captured on mouseDown

const tileCache = TT.createTileCache();

// ── Selection <-> gizmo wiring (module-scope, survives activate/deactivate cycles) ──
document.addEventListener('scene3d:object-selected', e => _onSelectionChanged(e.detail && e.detail.id));
document.addEventListener('scene3d:object-deselected', () => _onSelectionChanged(null));
// A parcel selection change invalidates the real boundary geometry every
// constraint check depends on — rebuild both whenever it fires.
document.addEventListener('parcel:selected', () => { _rebuildParcelBoundary(); _recomputeConstraints(); });
document.addEventListener('parcel:deselected', () => { _rebuildParcelBoundary(); _recomputeConstraints(); });

function _onSelectionChanged(id) {
  objectMeshes.forEach((mesh, meshId) => {
    const obj = OBJECTS.get(meshId);
    if (!obj) return;
    const status = (constraintStatusById.get(meshId) || {}).status;
    mesh.material = _materialFor(obj, meshId === id, status);
  });
  if (!transformControls) return;
  if (id && objectMeshes.has(id)) transformControls.attach(objectMeshes.get(id));
  else transformControls.detach();
}

/* Recomputes every object's constraint status (boundary containment +
 * object-to-object overlap — see js/3d/constraints.js for exactly what this
 * can and cannot verify) and refreshes mesh materials to reflect it. Cheap
 * enough to call after every mutation and on every gizmo-drag frame at the
 * object counts this feature supports. */
function _recomputeConstraints() {
  constraintStatusById.clear();
  const objs = OBJECTS.list();
  objs.forEach(obj => {
    constraintStatusById.set(obj.id, CONSTRAINTS.checkObjectConstraints(obj, objs, parcelBoundaryLocal));
  });
  const selectedId = SELECTION.getSelected();
  objs.forEach(obj => {
    const mesh = objectMeshes.get(obj.id);
    if (!mesh) return;
    const status = (constraintStatusById.get(obj.id) || {}).status;
    mesh.material = _materialFor(obj, obj.id === selectedId, status);
  });
}

function _parcelBoundaryPointsFromSelection() {
  try {
    if (!window.PARCEL_SELECTION || originLat == null) return null;
    const sel = window.PARCEL_SELECTION.getSelected();
    const geom = sel && sel.feature && sel.feature.geometry;
    if (!geom) return null;
    let ring = null;
    if (geom.type === 'Polygon') ring = geom.coordinates[0];
    else if (geom.type === 'MultiPolygon') ring = geom.coordinates[0] && geom.coordinates[0][0];
    if (!ring || ring.length < 3) return null;
    return ring.map(([lng, lat]) => projectLatLng(lat, lng, originLat, originLng));
  } catch (_) {
    return null;
  }
}

function _rebuildParcelBoundary() {
  if (!scene) return;
  if (boundaryGroup) {
    scene.remove(boundaryGroup);
    boundaryGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  boundaryGroup = null;
  parcelBoundaryLocal = _parcelBoundaryPointsFromSelection();
  if (!parcelBoundaryLocal) return;

  const pts = parcelBoundaryLocal.map(p => new THREE.Vector3(p.x, 0.2, p.z));
  pts.push(pts[0].clone());
  const geometry = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x2fa84f }));
  line.name = 'scene3d-parcel-boundary';
  boundaryGroup = new THREE.Group();
  boundaryGroup.add(line);
  scene.add(boundaryGroup);
}

async function loadPixels(url, signal) {
  const res = await fetch(url, { signal, mode: 'cors' });
  if (!res.ok) throw new Error('tile-fetch-failed:' + res.status);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

function _size() {
  const w = (host && host.clientWidth) || 300;
  const h = (host && host.clientHeight) || 300;
  return { w, h };
}

function _resize() {
  if (!renderer || !orbitCamera) return;
  const { w, h } = _size();
  renderer.setSize(w, h, false);
  orbitCamera.setAspect(w / Math.max(h, 1));
}

function _animate() {
  animFrame = requestAnimationFrame(_animate);
  if (!renderer || !scene || !orbitCamera) return;
  orbitCamera.controls.update();
  renderer.render(scene, orbitCamera.camera);
}

// ── Terrain ──────────────────────────────────────────────────────────────

async function _rebuildTerrain() {
  if (!scene || originLat == null || originLng == null) return;
  if (terrainGroup) {
    scene.remove(terrainGroup);
    terrainGroup.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
  }
  if (terrainStatusCb) terrainStatusCb('Loading terrain…', 'loading');
  try {
    const result = await buildTerrainMesh(THREE, {
      originLat, originLng, tileTiles: TT, cache: tileCache, loadPixels, exaggeration,
    });
    terrainGroup = result.group;
    terrainGroup.visible = terrainVisible;
    scene.add(terrainGroup);

    if (result.loadedCount === 0) {
      if (terrainStatusCb) {
        terrainStatusCb(
          (window.SCENE3D_FALLBACK && window.SCENE3D_FALLBACK.MESSAGES['terrain-failed']) ||
            "Terrain data couldn't be loaded for this area.",
          'error'
        );
      }
    } else if (result.failedCount > 0) {
      if (terrainStatusCb) {
        terrainStatusCb(`Terrain loaded for ${result.loadedCount} of ${result.totalCount} tiles — hatched patches mean no data.`, 'warning');
      }
    } else if (terrainClearCb) {
      terrainClearCb();
    }
  } catch (e) {
    if (terrainStatusCb) {
      terrainStatusCb(
        (window.SCENE3D_FALLBACK && window.SCENE3D_FALLBACK.MESSAGES['terrain-failed']) ||
          "Terrain data couldn't be loaded for this area.",
        'error'
      );
    }
  }
}

// ── Object system (Phase B) ─────────────────────────────────────────────

function _meshGeometryFor(obj) {
  const w = Math.max(1, obj.footprint.width || 30);
  const d = Math.max(1, obj.footprint.depth || 30);
  const h = Math.max(1, obj.height || 10);
  return new THREE.BoxGeometry(w, h, d);
}

function _createMeshForObject(obj) {
  const mesh = new THREE.Mesh(_meshGeometryFor(obj), _materialFor(obj, false, null));
  mesh.position.set(obj.position.x, obj.height / 2, obj.position.z);
  mesh.rotation.y = (obj.rotationDeg || 0) * Math.PI / 180;
  mesh.userData.objectId = obj.id;
  mesh.visible = activePhaseFilter == null || obj.phase === activePhaseFilter;
  objectsGroup.add(mesh);
  objectMeshes.set(obj.id, mesh);
  return mesh;
}

function _removeObjectMesh(id) {
  const mesh = objectMeshes.get(id);
  if (!mesh) return;
  objectsGroup.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
  objectMeshes.delete(id);
}

/* Full geometry/position/rotation resync after a footprint/height/position/
 * rotation edit from the object panel (as opposed to a live gizmo drag,
 * which mutates the mesh directly — see _onTransformObjectChange). */
function _syncObjectMesh(obj) {
  const mesh = objectMeshes.get(obj.id);
  if (!mesh) return;
  mesh.geometry.dispose();
  mesh.geometry = _meshGeometryFor(obj);
  mesh.position.set(obj.position.x, obj.height / 2, obj.position.z);
  mesh.rotation.y = (obj.rotationDeg || 0) * Math.PI / 180;
  mesh.visible = activePhaseFilter == null || obj.phase === activePhaseFilter;
}

function _rebuildAllObjectMeshes() {
  objectMeshes.forEach((mesh, id) => _removeObjectMesh(id));
  OBJECTS.list().forEach(obj => _createMeshForObject(obj));
  _recomputeConstraints();
}

/* null shows every phase; a number shows only objects with that phase
 * (construction-phasing preview — buildings/roads/etc. can be tagged with a
 * phase number and toggled independently to preview a phased buildout). */
function setPhaseFilter(phase) {
  activePhaseFilter = typeof phase === 'number' ? phase : null;
  OBJECTS.list().forEach(obj => {
    const mesh = objectMeshes.get(obj.id);
    if (mesh) mesh.visible = activePhaseFilter == null || obj.phase === activePhaseFilter;
  });
}

function listPhases() {
  const phases = new Set(OBJECTS.list().map(o => o.phase || 1));
  return Array.from(phases).sort((a, b) => a - b);
}

function _feasibilityEnvelope() {
  try {
    if (!window.PARCEL_SELECTION || !window.PARCEL_FEASIBILITY) return null;
    const sel = window.PARCEL_SELECTION.getSelected();
    if (!sel || !sel.feature) return null;
    const result = window.PARCEL_FEASIBILITY.assess(sel.feature.properties, currentFips);
    return (result && result.envelope) || null;
  } catch (_) {
    return null;
  }
}

/* type: 'building' | 'parking' | 'road' | 'fence'. Only 'building' pulls
 * default dimensions from the parcel's buildable envelope — parking/road/
 * fence sizing isn't governed by that zoning calculation, so they fall back
 * to js/3d/objects.js's generic per-type defaults instead. */
function createObject(type, overrides) {
  if (!scene || !objectsGroup) return null;
  overrides = overrides || {};
  let envelopeDefaults = {};
  if (type === 'building') {
    const envelope = _feasibilityEnvelope();
    if (envelope && envelope.footprintSqft > 0) {
      const side = Math.sqrt(envelope.footprintSqft * SQFT_TO_SQM);
      envelopeDefaults.footprint = { shape: 'rectangle', width: Math.round(side), depth: Math.round(side) };
    }
    if (envelope && envelope.maxHeight_ft > 0) {
      envelopeDefaults.height = Math.round(envelope.maxHeight_ft * METERS_PER_FOOT);
    }
  }
  const props = Object.assign({ type }, envelopeDefaults, overrides);
  const obj = OBJECTS.create(props);
  _createMeshForObject(obj);
  SELECTION.select(obj.id);
  _recomputeConstraints();

  const snapshot = JSON.parse(JSON.stringify(obj));
  HISTORY.push({
    label: 'Create ' + type,
    undo: () => {
      OBJECTS.remove(snapshot.id);
      _removeObjectMesh(snapshot.id);
      if (SELECTION.getSelected() === snapshot.id) SELECTION.deselect();
      _recomputeConstraints();
    },
    redo: () => {
      OBJECTS.restore(snapshot);
      _createMeshForObject(OBJECTS.get(snapshot.id));
      SELECTION.select(snapshot.id);
      _recomputeConstraints();
    },
  });
  return obj;
}
function createBuilding(overrides) { return createObject('building', overrides); }

function updateObject(id, patch) {
  const obj = OBJECTS.get(id);
  if (!obj) return null;
  const before = JSON.parse(JSON.stringify(obj));
  const updated = OBJECTS.update(id, patch);
  if (!updated) return null;
  _syncObjectMesh(updated);
  _recomputeConstraints();
  const after = JSON.parse(JSON.stringify(updated));
  HISTORY.push({
    label: 'Edit ' + obj.type,
    undo: () => { OBJECTS.update(id, before); _syncObjectMesh(OBJECTS.get(id)); _recomputeConstraints(); },
    redo: () => { OBJECTS.update(id, after); _syncObjectMesh(OBJECTS.get(id)); _recomputeConstraints(); },
  });
  return updated;
}

function deleteSelected() {
  const id = SELECTION.getSelected();
  if (!id) return false;
  const obj = OBJECTS.get(id);
  if (!obj) return false;
  const snapshot = JSON.parse(JSON.stringify(obj));
  OBJECTS.remove(id);
  _removeObjectMesh(id);
  SELECTION.deselect();
  _recomputeConstraints();
  HISTORY.push({
    label: 'Delete ' + obj.type,
    undo: () => {
      OBJECTS.restore(snapshot);
      _createMeshForObject(OBJECTS.get(snapshot.id));
      SELECTION.select(snapshot.id);
      _recomputeConstraints();
    },
    redo: () => {
      OBJECTS.remove(snapshot.id);
      _removeObjectMesh(snapshot.id);
      if (SELECTION.getSelected() === snapshot.id) SELECTION.deselect();
      _recomputeConstraints();
    },
  });
  return true;
}

function undo() { const ok = HISTORY.undo(); _recomputeConstraints(); return ok; }
function redo() { const ok = HISTORY.redo(); _recomputeConstraints(); return ok; }
function historyCounts() { return HISTORY.counts(); }

function getMetrics() {
  const envelope = _feasibilityEnvelope();
  const metrics = OBJECTS.computeSiteMetrics(envelope ? envelope.siteTotalSqft : undefined);
  // Raw setback distances (front/side/rear, feet) from the existing zoning
  // calculator, surfaced for manual comparison — see js/3d/constraints.js's
  // header comment for why this module never verifies setback-line
  // compliance geometrically.
  metrics.setbacks = (envelope && envelope.setbacks) || null;
  return metrics;
}

function listObjects() {
  const selectedId = SELECTION.getSelected();
  return OBJECTS.list().map(o => Object.assign(
    { selected: o.id === selectedId },
    o,
    { constraint: constraintStatusById.get(o.id) || { status: 'unknown', reasons: [] } }
  ));
}

// ── Transform gizmo ──────────────────────────────────────────────────────

function _applyGizmoAxisRestrictions() {
  if (!transformControls) return;
  if (transformControls.mode === 'translate') {
    transformControls.showX = true; transformControls.showY = false; transformControls.showZ = true;
  } else if (transformControls.mode === 'rotate') {
    transformControls.showX = false; transformControls.showY = true; transformControls.showZ = false;
  }
}

function setTransformMode(mode) {
  if (!transformControls || (mode !== 'translate' && mode !== 'rotate')) return;
  transformControls.setMode(mode);
  _applyGizmoAxisRestrictions();
}

function _onTransformMouseDown() {
  if (orbitCamera) orbitCamera.controls.enabled = false;
  const id = SELECTION.getSelected();
  const obj = id && OBJECTS.get(id);
  transformDragSnapshot = obj ? { id, position: Object.assign({}, obj.position), rotationDeg: obj.rotationDeg } : null;
}

function _onTransformObjectChange() {
  // Live-sync the store from the mesh during drag so the metrics/position/
  // constraint readouts update in real time — no undo entry yet, that
  // happens once on mouseUp so a single drag is a single undo step, not one
  // per frame.
  const id = SELECTION.getSelected();
  const mesh = id && objectMeshes.get(id);
  if (!id || !mesh) return;
  OBJECTS.update(id, {
    position: { x: mesh.position.x, z: mesh.position.z },
    rotationDeg: (mesh.rotation.y * 180) / Math.PI,
  });
  _recomputeConstraints();
}

function _onTransformMouseUp() {
  if (orbitCamera) orbitCamera.controls.enabled = true;
  const snap = transformDragSnapshot;
  transformDragSnapshot = null;
  if (!snap) return;
  const obj = OBJECTS.get(snap.id);
  if (!obj) return;
  const after = { position: Object.assign({}, obj.position), rotationDeg: obj.rotationDeg };
  const changed = after.position.x !== snap.position.x || after.position.z !== snap.position.z || after.rotationDeg !== snap.rotationDeg;
  if (!changed) return;
  const id = snap.id;
  HISTORY.push({
    label: 'Move ' + obj.type,
    undo: () => { OBJECTS.update(id, snap); _syncObjectMesh(OBJECTS.get(id)); _recomputeConstraints(); },
    redo: () => { OBJECTS.update(id, after); _syncObjectMesh(OBJECTS.get(id)); _recomputeConstraints(); },
  });
}

// ── Click-to-select raycasting ───────────────────────────────────────────

function _onCanvasPointerDown(e) {
  pointerDownScreen = { x: e.clientX, y: e.clientY };
}

function _onCanvasPointerUp(e) {
  if (!pointerDownScreen || (transformControls && transformControls.dragging)) { pointerDownScreen = null; return; }
  const dx = e.clientX - pointerDownScreen.x;
  const dy = e.clientY - pointerDownScreen.y;
  pointerDownScreen = null;
  if (Math.sqrt(dx * dx + dy * dy) > 6) return; // treat as an orbit/pan drag, not a click

  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, orbitCamera.camera);
  const hits = raycaster.intersectObjects(objectsGroup.children, false);
  if (hits.length && hits[0].object.userData.objectId) {
    SELECTION.select(hits[0].object.userData.objectId);
  } else {
    SELECTION.deselect();
  }
}

// ── Scene lifecycle ──────────────────────────────────────────────────────

function _buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd4e8);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(600, 900, 400);
  scene.add(ambient, sun);

  objectsGroup = new THREE.Group();
  objectsGroup.name = 'scene3d-objects';
  scene.add(objectsGroup);

  const canvas = document.createElement('canvas');
  canvas.className = 'scene3d-canvas';
  host.innerHTML = '';
  host.appendChild(canvas);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const { w, h } = _size();
  orbitCamera = createOrbitCamera(THREE, OrbitControls, canvas, w / Math.max(h, 1));
  renderer.setSize(w, h, false);

  transformControls = new TransformControls(orbitCamera.camera, canvas);
  transformControls.setMode('translate');
  transformHelper = transformControls.getHelper();
  scene.add(transformHelper);
  transformControls.addEventListener('mouseDown', _onTransformMouseDown);
  transformControls.addEventListener('objectChange', _onTransformObjectChange);
  transformControls.addEventListener('mouseUp', _onTransformMouseUp);
  _applyGizmoAxisRestrictions();

  canvas.addEventListener('pointerdown', _onCanvasPointerDown);
  canvas.addEventListener('pointerup', _onCanvasPointerUp);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(_resize);
    resizeObserver.observe(host);
  }

  _rebuildParcelBoundary();
  _rebuildAllObjectMeshes();
  _onSelectionChanged(SELECTION.getSelected());
  _animate();
}

function _teardownScene() {
  if (animFrame != null) cancelAnimationFrame(animFrame);
  animFrame = null;
  if (resizeObserver) { try { resizeObserver.disconnect(); } catch (_) {} }
  resizeObserver = null;
  if (transformControls) { try { transformControls.dispose(); } catch (_) {} }
  transformControls = null;
  transformHelper = null;
  if (orbitCamera) { try { orbitCamera.dispose(); } catch (_) {} }
  orbitCamera = null;
  objectMeshes.forEach((mesh, id) => _removeObjectMesh(id));
  if (terrainGroup) {
    terrainGroup.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
  }
  terrainGroup = null;
  objectsGroup = null;
  if (renderer) { try { renderer.dispose(); } catch (_) {} }
  renderer = null;
  scene = null;
  if (host) host.innerHTML = '';
}

function activate(opts) {
  host = opts.host;
  map = opts.map;
  currentFips = opts.fips || null;
  terrainStatusCb = opts.onStatus || null;
  terrainClearCb = opts.onStatusClear || null;

  if (!host) throw new Error('scene3d-canvas-host missing');

  const center = map && typeof map.getCenter === 'function' ? map.getCenter() : null;
  originLat = center ? center.lat : 39.5;
  originLng = center ? center.lng : -98.35;

  if (!renderer) _buildScene();
  else _resize();

  _rebuildTerrain();
}

function deactivate() {
  _teardownScene();
}

function onCountyChanged(fips) {
  fips = fips || null;
  if (fips === currentFips) return;
  // Object positions are meaningful only relative to the current origin —
  // switching sites without clearing would silently "teleport" buildings
  // onto a different county's geography. Clear rather than mislead.
  if (OBJECTS.list().length && terrainStatusCb) {
    terrainStatusCb('Switched site — 3D objects from the previous site were cleared.', 'warning');
  }
  OBJECTS.clear();
  SELECTION.deselect();
  HISTORY.clear();
  if (objectsGroup) objectMeshes.forEach((mesh, id) => _removeObjectMesh(id));

  currentFips = fips;
  const center = map && typeof map.getCenter === 'function' ? map.getCenter() : null;
  if (!center) return;
  originLat = center.lat;
  originLng = center.lng;
  if (renderer) {
    _rebuildTerrain();
    _rebuildParcelBoundary();
    _recomputeConstraints();
  }
}

function onLayerToggle(layerId, visible) {
  if (layerId !== 'terrain_3d') return;
  terrainVisible = !!visible;
  if (terrainGroup) terrainGroup.visible = terrainVisible;
}

function getSceneDescriptor() {
  if (!orbitCamera || originLat == null) return null;
  const camState = orbitCamera.getState();
  const targetLatLng = unprojectXZ(camState.target.x, camState.target.z, originLat, originLng);
  return {
    active: true,
    camera: {
      target: { lat: targetLatLng.lat, lng: targetLatLng.lng },
      distance: camState.distance,
      azimuth: camState.azimuthDeg,
      polar: camState.polarDeg,
    },
    terrainEnabled: terrainVisible,
    exaggeration,
    objects: OBJECTS.toArray(),
  };
}

function applyState(normalized) {
  if (!normalized) return;
  exaggeration = typeof normalized.exaggeration === 'number' ? normalized.exaggeration : exaggeration;
  terrainVisible = normalized.terrainEnabled !== false;
  if (terrainGroup) terrainGroup.visible = terrainVisible;

  OBJECTS.fromArray(normalized.objects || []);
  SELECTION.deselect();
  HISTORY.clear();
  if (objectsGroup) _rebuildAllObjectMeshes();

  if (!orbitCamera) return;
  const cam = normalized.camera || {};
  let targetXZ = { x: 0, z: 0 };
  if (cam.target && typeof cam.target.lat === 'number' && typeof cam.target.lng === 'number' && originLat != null) {
    targetXZ = projectLatLng(cam.target.lat, cam.target.lng, originLat, originLng);
  }
  orbitCamera.setState({
    distance: cam.distance, azimuthDeg: cam.azimuth, polarDeg: cam.polar,
    target: { x: targetXZ.x, y: 0, z: targetXZ.z },
  });

  // Exaggeration affects mesh vertex Y, so it needs a rebuild to take effect
  // (cheap relative to the network fetch since tiles are cache-hit).
  if (renderer) _rebuildTerrain();
}

window.SCENE3D._registerEngine({
  activate, deactivate, onCountyChanged, onLayerToggle, applyState, getSceneDescriptor,
  createBuilding, createObject, updateObject, deleteSelected, undo, redo, historyCounts, getMetrics, listObjects,
  selectObject: id => SELECTION.select(id), deselectObject: () => SELECTION.deselect(),
  setTransformMode, setPhaseFilter, listPhases,
});
