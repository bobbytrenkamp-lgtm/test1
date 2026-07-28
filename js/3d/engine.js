/* js/3d/engine.js  (ES module — the only file that imports Three.js)
 * Lazy-loaded by js/3d/index.js on first SCENE3D.activate(). Owns the
 * THREE.Scene/Camera/Renderer, the terrain mesh, and the render loop.
 * Registers itself back onto window.SCENE3D via _registerEngine() so the
 * always-loaded coordinator can call into it without importing THREE itself.
 */
import * as THREE from '../../vendor/three/three.module.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { buildTerrainMesh, projectLatLng, unprojectXZ } from './terrain.js';
import { createOrbitCamera } from './camera.js';

const TT = window.SCENE3D_TERRAIN_TILES;

let renderer = null;
let scene = null;
let orbitCamera = null;
let terrainGroup = null;
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
let loadedTileCount = 0;

const tileCache = TT.createTileCache();

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
    loadedTileCount = result.loadedCount;

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

function _buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd4e8);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(600, 900, 400);
  scene.add(ambient, sun);

  const canvas = document.createElement('canvas');
  canvas.className = 'scene3d-canvas';
  host.innerHTML = '';
  host.appendChild(canvas);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const { w, h } = _size();
  orbitCamera = createOrbitCamera(THREE, OrbitControls, canvas, w / Math.max(h, 1));
  renderer.setSize(w, h, false);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(_resize);
    resizeObserver.observe(host);
  }

  _animate();
}

function _teardownScene() {
  if (animFrame != null) cancelAnimationFrame(animFrame);
  animFrame = null;
  if (resizeObserver) { try { resizeObserver.disconnect(); } catch (_) {} }
  resizeObserver = null;
  if (orbitCamera) { try { orbitCamera.dispose(); } catch (_) {} }
  orbitCamera = null;
  if (terrainGroup) {
    terrainGroup.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
  }
  terrainGroup = null;
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
  currentFips = fips || null;
  const center = map && typeof map.getCenter === 'function' ? map.getCenter() : null;
  if (!center) return;
  originLat = center.lat;
  originLng = center.lng;
  if (renderer) _rebuildTerrain();
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
  };
}

function applyState(normalized) {
  if (!normalized) return;
  exaggeration = typeof normalized.exaggeration === 'number' ? normalized.exaggeration : exaggeration;
  terrainVisible = normalized.terrainEnabled !== false;
  if (terrainGroup) terrainGroup.visible = terrainVisible;

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
});
