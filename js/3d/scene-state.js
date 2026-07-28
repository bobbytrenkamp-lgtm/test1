/* js/3d/scene-state.js
 * Pure-logic schema for the `scene3d` field added to the existing
 * per-user saved "workspace" object (see js/map.js _captureWorkspaceState /
 * _applyWorkspace). No DOM, no THREE — Node-testable.
 *
 * A workspace saved before this schema existed has no `scene3d` key at all;
 * that is the common case and must keep loading with no error and without
 * forcing 3D mode open or closed (see migrateScene3dState()).
 */
window.SCENE3D_STATE = (function () {
  'use strict';

  const CURRENT_SCHEMA_VERSION = 1;

  const DEFAULTS = Object.freeze({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    active: false,
    camera: Object.freeze({
      target: Object.freeze({ lat: null, lng: null }),
      distance: 1200,   // meters, orbit radius
      azimuth: 0,        // degrees, compass heading
      polar: 45,          // degrees, tilt from vertical (0 = top-down, 90 = eye-level)
    }),
    terrainEnabled: true,
    exaggeration: 1.5,   // vertical exaggeration multiplier
  });

  function _cloneCamera(cam) {
    cam = cam || {};
    const target = cam.target || {};
    return {
      target: {
        lat: typeof target.lat === 'number' ? target.lat : DEFAULTS.camera.target.lat,
        lng: typeof target.lng === 'number' ? target.lng : DEFAULTS.camera.target.lng,
      },
      distance: typeof cam.distance === 'number' ? cam.distance : DEFAULTS.camera.distance,
      azimuth:  typeof cam.azimuth  === 'number' ? cam.azimuth  : DEFAULTS.camera.azimuth,
      polar:    typeof cam.polar    === 'number' ? cam.polar    : DEFAULTS.camera.polar,
    };
  }

  /* raw -> normalized current-schema object, or null if raw is null/undefined
   * (meaning "this workspace has no opinion about 3D" — the pre-Phase-A case).
   * Never throws; a malformed/partial object is backfilled from defaults
   * rather than rejected, since a saved workspace should always still load. */
  function migrateScene3dState(raw) {
    if (raw == null || typeof raw !== 'object') return null;
    const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;

    if (version > CURRENT_SCHEMA_VERSION) {
      // From a future schema version this build doesn't know about yet —
      // drop unknown fields rather than fail, keep it loadable.
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        active: !!raw.active,
        camera: _cloneCamera(raw.camera),
        terrainEnabled: raw.terrainEnabled !== false,
        exaggeration: typeof raw.exaggeration === 'number' ? raw.exaggeration : DEFAULTS.exaggeration,
      };
    }

    // version 0 (unversioned/partial) or current version — same backfill path.
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      active: !!raw.active,
      camera: _cloneCamera(raw.camera),
      terrainEnabled: raw.terrainEnabled !== false,
      exaggeration: typeof raw.exaggeration === 'number' ? raw.exaggeration : DEFAULTS.exaggeration,
    };
  }

  /* source: a plain object describing the live scene (or null/undefined if
   * 3D was never activated this session — callers must pass null through,
   * not a stub object, so inactive users don't bloat every saved workspace). */
  function captureScene3dState(source) {
    if (source == null) return null;
    return migrateScene3dState(Object.assign({ schemaVersion: CURRENT_SCHEMA_VERSION }, source));
  }

  /* Always returns a usable current-schema object (defaults if raw is null),
   * for callers that need something to apply rather than a null to check. */
  function applyScene3dStateOrDefault(raw) {
    return migrateScene3dState(raw) || JSON.parse(JSON.stringify(DEFAULTS));
  }

  return {
    CURRENT_SCHEMA_VERSION,
    DEFAULTS,
    migrateScene3dState,
    captureScene3dState,
    applyScene3dStateOrDefault,
  };
})();
