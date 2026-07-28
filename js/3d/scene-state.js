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

  // v1 -> v2: added `objects` (Phase B building volumes).
  // v2 -> v3: added `viewpoints` (Phase D saved camera views) and `sun`
  // (Phase D date/time used to position the sun for shadows). A save from
  // an older schema has none of these keys — they migrate to an empty
  // array / null respectively, never throw, never invent placeholder data.
  const CURRENT_SCHEMA_VERSION = 3;

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
    objects: Object.freeze([]),      // building/parking/road/fence/substation objects, see js/3d/objects.js
    viewpoints: Object.freeze([]),   // named saved camera views, see js/3d/engine.js
    sun: null,                       // { dateISO } or null = use "now" — see js/3d/sun.js
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

  function _cloneViewpoints(viewpoints) {
    if (!Array.isArray(viewpoints)) return [];
    return viewpoints
      .filter(v => v && typeof v === 'object' && typeof v.name === 'string')
      .map(v => ({
        id: typeof v.id === 'string' ? v.id : ('vp_' + Math.random().toString(36).slice(2, 10)),
        name: v.name,
        camera: _cloneCamera(v.camera),
      }));
  }

  function _cloneSun(sun) {
    if (!sun || typeof sun !== 'object' || typeof sun.dateISO !== 'string') return null;
    return { dateISO: sun.dateISO };
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
    // dropped, missing fields defaulted. A v1 save has no `objects` key,
    // which _cloneObjects turns into []; a v1/v2 save has no `viewpoints`/
    // `sun` keys, which _cloneViewpoints/_cloneSun turn into []/null — that
    // is the entirety of what migrating through v2 and v3 requires.
    void version;
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      active: !!raw.active,
      camera: _cloneCamera(raw.camera),
      terrainEnabled: raw.terrainEnabled !== false,
      exaggeration: typeof raw.exaggeration === 'number' ? raw.exaggeration : DEFAULTS.exaggeration,
      objects: _cloneObjects(raw.objects),
      viewpoints: _cloneViewpoints(raw.viewpoints),
      sun: _cloneSun(raw.sun),
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
