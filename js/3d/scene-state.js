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

  // v1 -> v2: added `objects` (Phase B building volumes). A v1 save has no
  // `objects` key at all — that must migrate to an empty array, never throw,
  // never invent placeholder buildings.
  const CURRENT_SCHEMA_VERSION = 2;

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
    objects: Object.freeze([]),  // Phase B building volumes, see js/3d/objects.js
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

  /* Light structural normalization only — filters out non-object entries so
   * a corrupted save can't crash js/3d/objects.js's fromArray(); full field
   * validation/defaulting of each object happens there, not here. */
  function _cloneObjects(objects) {
    if (!Array.isArray(objects)) return [];
    return objects.filter(o => o && typeof o === 'object').map(o => JSON.parse(JSON.stringify(o)));
  }

  /* raw -> normalized current-schema object, or null if raw is null/undefined
   * (meaning "this workspace has no opinion about 3D" — the pre-Phase-A case).
   * Never throws; a malformed/partial object is backfilled from defaults
   * rather than rejected, since a saved workspace should always still load. */
  function migrateScene3dState(raw) {
    if (raw == null || typeof raw !== 'object') return null;
    const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;

    // Every branch (older/unversioned, current, and future-unknown versions)
    // shares one backfill path: known fields normalized, unknown fields
    // dropped, missing fields defaulted. A v1 save simply has no `objects`
    // key, which _cloneObjects already turns into [] — that is the only
    // "migration" v1 -> v2 actually requires.
    void version;
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      active: !!raw.active,
      camera: _cloneCamera(raw.camera),
      terrainEnabled: raw.terrainEnabled !== false,
      exaggeration: typeof raw.exaggeration === 'number' ? raw.exaggeration : DEFAULTS.exaggeration,
      objects: _cloneObjects(raw.objects),
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
