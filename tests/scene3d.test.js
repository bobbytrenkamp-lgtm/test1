/* tests/scene3d.test.js
 * 3D terrain view unit tests (Phase A + Phase B). No external test framework
 * — run with `node tests/scene3d.test.js`. Follows tests/parcel.test.js's
 * dual-mode bootstrap pattern: the modules below have no DOM/THREE
 * dependency beyond CustomEvent/document.dispatchEvent (shimmed here exactly
 * like tests/parcel.test.js does), so they load directly under a minimal
 * window shim. js/3d/index.js, engine.js, terrain.js, and camera.js touch
 * the real DOM/canvas/WebGL/Three.js and are excluded here — they need
 * real-browser e2e coverage instead (see docs/3D_SYSTEM_ARCHITECTURE.md's
 * manual verification checklist).
 */

if (typeof window === 'undefined') {
  const path = require('path');
  const ROOT = path.join(__dirname, '..');
  global.window = global;
  global.CustomEvent = class CustomEvent {
    constructor(type, opts) { this.type = type; this.detail = (opts || {}).detail; }
  };
  global.document = {
    _listeners: {},
    dispatchEvent(ev) { (this._listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    getElementById: () => null,
  };
  for (const rel of [
    'js/3d/terrain-tiles.js', 'js/3d/scene-state.js',
    'js/3d/objects.js', 'js/3d/history.js', 'js/3d/selection.js', 'js/3d/measure.js',
  ]) {
    require(path.join(ROOT, rel));
  }
}

(function runTests() {
  'use strict';

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      passed++;
      console.log('%cPASS%c ' + msg, 'color:green;font-weight:bold', '');
    } else {
      failed++;
      console.error('%cFAIL%c ' + msg, 'color:red;font-weight:bold', '');
    }
  }

  function assertEq(a, b, msg) {
    const ok = JSON.stringify(a) === JSON.stringify(b);
    if (ok) {
      passed++;
      console.log('%cPASS%c ' + msg + ` (${JSON.stringify(a)})`, 'color:green;font-weight:bold', '');
    } else {
      failed++;
      console.error('%cFAIL%c ' + msg + ` — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`, 'color:red;font-weight:bold', '');
    }
  }

  function assertClose(a, b, tol, msg) {
    const ok = typeof a === 'number' && Math.abs(a - b) <= tol;
    if (ok) {
      passed++;
      console.log('%cPASS%c ' + msg + ` (${a})`, 'color:green;font-weight:bold', '');
    } else {
      failed++;
      console.error('%cFAIL%c ' + msg + ` — expected ~${b} (±${tol}), got ${a}`, 'color:red;font-weight:bold', '');
    }
  }

  const g = (typeof window !== 'undefined' ? window : global);

  // ── SCENE3D_TERRAIN_TILES ───────────────────────────────────────────────

  console.group('SCENE3D_TERRAIN_TILES');

  const TT = g.SCENE3D_TERRAIN_TILES;
  assert(!!TT, 'SCENE3D_TERRAIN_TILES is defined');

  if (TT) {
    // Tile math
    assertEq(TT.lngLatToTile(0, 0, 0), { x: 0, y: 0, z: 0 }, 'z=0 always yields tile (0,0)');
    const nullIsland = TT.lngLatToTile(0.0001, 0.0001, 10);
    assert(nullIsland.x >= 0 && nullIsland.y >= 0, 'tile coords are non-negative near (0,0)');

    // Known reference: Washington DC (~38.9, -77.0) at zoom 4 should land in
    // the tile covering the eastern US (rough sanity check, not pixel-exact).
    const dc = TT.lngLatToTile(-77.03, 38.9, 4);
    assert(dc.x >= 0 && dc.x < 16 && dc.y >= 0 && dc.y < 16, 'DC tile coords in valid z=4 range');

    // Round-trip: tile bounds should contain the point used to compute the tile
    const z = 8;
    const pt = { lat: 39.5, lng: -98.35 }; // geographic center of the contiguous US
    const tile = TT.lngLatToTile(pt.lng, pt.lat, z);
    const bounds = TT.tileToLngLatBounds(tile.x, tile.y, z);
    assert(pt.lng >= bounds.west && pt.lng <= bounds.east, 'tile bounds contain source longitude');
    assert(pt.lat <= bounds.north && pt.lat >= bounds.south, 'tile bounds contain source latitude');

    // Terrarium decode — hand-computed RGB -> elevation triples
    const decoded = TT.decodeTerrarium(new Uint8Array([
      0, 0, 0, 255,       // (0*256 + 0 + 0/256) - 32768 = -32768
      128, 0, 0, 255,     // (128*256 + 0 + 0/256) - 32768 = 0
      128, 0, 128, 255,   // (128*256 + 0 + 128/256) - 32768 = 0.5
      255, 255, 255, 255, // (255*256+255+255/256)-32768 = 32767.99609375
    ]));
    assertClose(decoded[0], -32768, 0.01, 'decode: black pixel = -32768m (sentinel floor)');
    assertClose(decoded[1], 0, 0.01, 'decode: (128,0,0) = 0m');
    assertClose(decoded[2], 0.5, 0.01, 'decode: (128,0,128) = 0.5m (sub-meter blue channel)');
    assertClose(decoded[3], 32767.996, 0.01, 'decode: white pixel = max representable elevation');

    // Cache: hit/miss/eviction
    const cache = TT.createTileCache(2);
    assert(!cache.has(1, 2, 3), 'cache starts empty');
    cache.set(1, 2, 3, new Float32Array([1]));
    assert(cache.has(1, 2, 3), 'cache.set makes has() true');
    assertEq(cache.size(), 1, 'cache size is 1 after one set');
    cache.set(1, 2, 4, new Float32Array([2]));
    cache.set(1, 2, 5, new Float32Array([3])); // exceeds capacity 2 -> evicts oldest (1,2,3)
    assertEq(cache.size(), 2, 'cache size capped at capacity');
    assert(!cache.has(1, 2, 3), 'oldest entry evicted at capacity');
    assert(cache.has(1, 2, 4) && cache.has(1, 2, 5), 'newer entries retained after eviction');

    // fetchElevationTile: de-dupe concurrent requests for the same tile
    const cache2 = TT.createTileCache();
    let loadCalls = 0;
    const slowLoader = () => {
      loadCalls++;
      return new Promise(resolve => setTimeout(() => resolve(new Uint8Array(4 * 4).fill(128)), 5));
    };
    Promise.all([
      TT.fetchElevationTile(5, 1, 1, { cache: cache2, loadPixels: slowLoader }),
      TT.fetchElevationTile(5, 1, 1, { cache: cache2, loadPixels: slowLoader }),
    ]).then(([a, b]) => {
      assertEq(loadCalls, 1, 'concurrent requests for the same tile de-dupe to one loader call');
      assert(a === b, 'both callers receive the same decoded result');
    }).catch(e => { failed++; console.error('FAIL de-dupe test threw:', e); });

    // fetchElevationTile: a rejected loader resolves to a rejection, not a
    // thrown exception, and does not poison the cache for a later retry
    const cache3 = TT.createTileCache();
    let attempt = 0;
    const flakyLoader = () => {
      attempt++;
      return attempt === 1 ? Promise.reject(new Error('404')) : Promise.resolve(new Uint8Array(4).fill(0));
    };
    TT.fetchElevationTile(5, 9, 9, { cache: cache3, loadPixels: flakyLoader })
      .then(() => { failed++; console.error('FAIL first fetch should have rejected'); })
      .catch(() => {
        passed++;
        console.log('%cPASS%c failed tile fetch rejects rather than throwing synchronously', 'color:green;font-weight:bold', '');
        return TT.fetchElevationTile(5, 9, 9, { cache: cache3, loadPixels: flakyLoader });
      })
      .then(heights => {
        assert(!!heights, 'retry after a failed fetch succeeds (cache was not poisoned)');
      })
      .catch(e => { failed++; console.error('FAIL retry-after-failure threw:', e); });
  }

  console.groupEnd();

  // ── SCENE3D_STATE ────────────────────────────────────────────────────────

  console.group('SCENE3D_STATE');

  const SS = g.SCENE3D_STATE;
  assert(!!SS, 'SCENE3D_STATE is defined');

  if (SS) {
    assertEq(SS.migrateScene3dState(null), null, 'migrating null returns null (no opinion about 3D)');
    assertEq(SS.migrateScene3dState(undefined), null, 'migrating undefined returns null');
    assertEq(SS.captureScene3dState(null), null, 'capturing with no live source returns null');

    const captured = SS.captureScene3dState({
      active: true,
      camera: { target: { lat: 38.9, lng: -77.0 }, distance: 500, azimuth: 90, polar: 30 },
      terrainEnabled: false,
      exaggeration: 2,
    });
    assert(!!captured, 'capturing a live source returns an object');
    assertEq(captured.schemaVersion, SS.CURRENT_SCHEMA_VERSION, 'captured object stamps current schema version');
    assertEq(captured.camera.target, { lat: 38.9, lng: -77.0 }, 'captured camera target round-trips');
    assertEq(captured.terrainEnabled, false, 'captured terrainEnabled round-trips');

    // Round-trip: capture -> migrate -> apply-default -> re-migrate is stable
    const migratedTwice = SS.migrateScene3dState(SS.migrateScene3dState(captured));
    assertEq(migratedTwice, SS.migrateScene3dState(captured), 'migrating an already-current object is idempotent');

    // Old workspace with no scene3d key at all — must not throw, must not
    // force a default "3D open" state onto the caller.
    const legacy = SS.migrateScene3dState(undefined);
    assertEq(legacy, null, 'a pre-Phase-A workspace (no scene3d key) yields null, not a forced default');

    // Malformed/partial object — must backfill from defaults, never throw
    let threw = false;
    let backfilled = null;
    try {
      backfilled = SS.migrateScene3dState({ active: true }); // missing camera entirely
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'a partial scene3d object does not throw during migration');
    assert(!!backfilled && !!backfilled.camera, 'a partial object is backfilled with default camera fields');
    assertEq(backfilled.camera.distance, SS.DEFAULTS.camera.distance, 'missing camera.distance backfilled from defaults');

    // applyScene3dStateOrDefault always returns something usable
    const forApply = SS.applyScene3dStateOrDefault(null);
    assert(!!forApply && !!forApply.camera, 'applyScene3dStateOrDefault(null) returns a usable default object');

    // Phase B backward compatibility: a workspace saved under schema v1
    // (before the `objects` field existed) must migrate to v2 with an empty
    // objects array, not throw and not invent placeholder buildings.
    const v1Save = {
      schemaVersion: 1, active: true,
      camera: { target: { lat: 38.9, lng: -77.0 }, distance: 800, azimuth: 20, polar: 40 },
      terrainEnabled: true, exaggeration: 2,
    };
    const migratedV1 = SS.migrateScene3dState(v1Save);
    assertEq(migratedV1.schemaVersion, 2, 'a v1 save migrates to the current schema version (2)');
    assertEq(migratedV1.objects, [], 'a v1 save (no objects key) migrates to an empty objects array');
    assertEq(migratedV1.camera.target, { lat: 38.9, lng: -77.0 }, 'a v1 save keeps its camera target through migration');

    // A corrupted/non-array `objects` field degrades to [] rather than throwing
    const corrupted = SS.migrateScene3dState({ schemaVersion: 2, objects: 'not-an-array' });
    assertEq(corrupted.objects, [], 'a non-array objects field is coerced to [] rather than throwing');
  }

  console.groupEnd();

  // ── SCENE3D_OBJECTS (Phase B) ───────────────────────────────────────────

  console.group('SCENE3D_OBJECTS');

  const OBJ = g.SCENE3D_OBJECTS;
  assert(!!OBJ, 'SCENE3D_OBJECTS is defined');

  if (OBJ) {
    OBJ.clear();
    const b1 = OBJ.create({ label: 'B1', footprint: { width: 30, depth: 20 }, height: 15, position: { x: 5, z: 5 } });
    assert(!!b1.id, 'create() assigns an id');
    assertEq(b1.footprint, { shape: 'rectangle', width: 30, depth: 20 }, 'create() stores the given footprint');
    assertEq(b1.metrics.footprintStatus, 'approximate', 'a created building is always labeled approximate, never exact');
    assertClose(b1.metrics.footprintSqft, 30 * 20 * 10.7639, 1, 'footprintSqft is computed from width*depth in m^2 -> sqft');

    const updated = OBJ.update(b1.id, { height: 25, footprint: { width: 40 } });
    assertEq(updated.height, 25, 'update() applies a height patch');
    assertEq(updated.footprint, { shape: 'rectangle', width: 40, depth: 20 }, 'update() merges footprint one level deep (depth untouched)');
    assertClose(updated.metrics.footprintSqft, 40 * 20 * 10.7639, 1, 'metrics recompute after update()');

    assertEq(OBJ.update('nonexistent-id', { height: 1 }), null, 'update() on an unknown id returns null rather than throwing');

    const b2 = OBJ.create({ label: 'B2', footprint: { width: 10, depth: 10 }, height: 5 });
    assertEq(OBJ.list().length, 2, 'list() returns every created object');

    const metrics = OBJ.computeSiteMetrics(100000);
    assertEq(metrics.buildingCount, 2, 'computeSiteMetrics counts all building-type objects');
    assert(typeof metrics.coveragePct === 'number', 'coveragePct is computed when siteTotalSqft is provided');

    const metricsNoSite = OBJ.computeSiteMetrics();
    assertEq(metricsNoSite.coveragePct, undefined, 'coveragePct is omitted (not zero) when site area is unavailable');

    assert(OBJ.remove(b2.id), 'remove() returns true for an existing id');
    assert(!OBJ.remove(b2.id), 'remove() returns false on a second call for the same id');
    assertEq(OBJ.list().length, 1, 'list() reflects the removal');

    // restore() reinstates an object with its original id (used by undo/redo)
    const snapshot = JSON.parse(JSON.stringify(b1));
    OBJ.remove(b1.id);
    const restored = OBJ.restore(snapshot);
    assertEq(restored.id, b1.id, 'restore() reinstates the object under its original id, not a freshly minted one');

    // fromArray() replaces the whole store and recomputes metrics rather
    // than trusting stored values
    OBJ.fromArray([{ id: 'ext_1', label: 'Imported', footprint: { width: 20, depth: 20 }, height: 8, position: { x: 0, z: 0 } }]);
    assertEq(OBJ.list().length, 1, 'fromArray() replaces the entire store');
    assertClose(OBJ.get('ext_1').metrics.footprintSqft, 20 * 20 * 10.7639, 1, 'fromArray() recomputes metrics rather than trusting stored values');

    OBJ.clear();
    assertEq(OBJ.list().length, 0, 'clear() empties the store');
  }

  console.groupEnd();

  // ── SCENE3D_HISTORY (Phase B) ───────────────────────────────────────────

  console.group('SCENE3D_HISTORY');

  const HISTMOD = g.SCENE3D_HISTORY;
  assert(!!HISTMOD, 'SCENE3D_HISTORY is defined');

  if (HISTMOD) {
    const h = HISTMOD.createHistory(3);
    assert(!h.canUndo() && !h.canRedo(), 'a fresh history stack has nothing to undo or redo');

    let value = 0;
    h.push({ undo: () => { value = 0; }, redo: () => { value = 1; }, label: 'set to 1' });
    value = 1;
    assert(h.canUndo(), 'canUndo() is true after a push');
    assert(!h.canRedo(), 'canRedo() is false until something has been undone');

    assert(h.undo(), 'undo() returns true when there is something to undo');
    assertEq(value, 0, 'undo() invokes the command\'s undo function');
    assert(h.canRedo(), 'canRedo() is true after an undo');

    assert(h.redo(), 'redo() returns true when there is something to redo');
    assertEq(value, 1, 'redo() invokes the command\'s redo function');

    h.clear();
    assert(!h.undo(), 'undo() on an empty stack returns false rather than throwing');
    assert(!h.redo(), 'redo() on an empty stack returns false rather than throwing');

    // A new push after an undo clears the redo stack (standard undo/redo rule)
    h.clear();
    h.push({ undo: () => {}, redo: () => {}, label: 'a' });
    h.undo();
    assert(h.canRedo(), 'redo available right after undo');
    h.push({ undo: () => {}, redo: () => {}, label: 'b' });
    assert(!h.canRedo(), 'pushing a new command clears the redo stack');

    // Capacity eviction
    const h2 = HISTMOD.createHistory(2);
    h2.push({ undo: () => {}, redo: () => {}, label: '1' });
    h2.push({ undo: () => {}, redo: () => {}, label: '2' });
    h2.push({ undo: () => {}, redo: () => {}, label: '3' });
    assertEq(h2.counts().undo, 2, 'undo stack is capped at maxSize, oldest entry evicted');

    let threwOnBadPush = false;
    try { h.push({ label: 'no functions' }); } catch (e) { threwOnBadPush = true; }
    assert(threwOnBadPush, 'pushing a command without undo/redo functions throws (a programmer error, not a runtime data issue)');
  }

  console.groupEnd();

  // ── SCENE3D_SELECTION (Phase B) ─────────────────────────────────────────

  console.group('SCENE3D_SELECTION');

  const SEL = g.SCENE3D_SELECTION;
  assert(!!SEL, 'SCENE3D_SELECTION is defined');

  if (SEL) {
    SEL.deselect();
    assertEq(SEL.getSelected(), null, 'nothing selected initially');

    let selectedEventId = null;
    document.addEventListener('scene3d:object-selected', e => { selectedEventId = e.detail.id; });
    SEL.select('obj_42');
    assertEq(SEL.getSelected(), 'obj_42', 'select() updates getSelected()');
    assertEq(selectedEventId, 'obj_42', 'select() emits scene3d:object-selected with the id');
    assert(SEL.isSelected('obj_42'), 'isSelected() true for the selected id');
    assert(!SEL.isSelected('obj_99'), 'isSelected() false for a different id');

    let deselectedFired = false;
    document.addEventListener('scene3d:object-deselected', () => { deselectedFired = true; });
    SEL.deselect();
    assertEq(SEL.getSelected(), null, 'deselect() clears the selection');
    assert(deselectedFired, 'deselect() emits scene3d:object-deselected');

    SEL.select(null);
    assertEq(SEL.getSelected(), null, 'select(null) behaves like deselect()');
  }

  console.groupEnd();

  // ── SCENE3D_MEASURE (Phase B) ───────────────────────────────────────────

  console.group('SCENE3D_MEASURE');

  const MEAS = g.SCENE3D_MEASURE;
  assert(!!MEAS, 'SCENE3D_MEASURE is defined');

  if (MEAS) {
    assertEq(MEAS.distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 }), 5, '3-4-5 right triangle distance is exact');
    assertEq(MEAS.distance({ x: 1, z: 1 }, { x: 1, z: 1 }), 0, 'distance between identical points is 0');

    const square = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }];
    assertEq(MEAS.polygonAreaXZ(square), 100, 'a 10x10 square has area 100 (shoelace formula)');
    assertEq(MEAS.polygonAreaXZ([{ x: 0, z: 0 }, { x: 1, z: 0 }]), 0, 'fewer than 3 points yields area 0, not an error');

    assertClose(MEAS.metersToFeet(1), 3.28084, 0.001, 'metersToFeet conversion factor');
    assertClose(MEAS.sqMetersToSqFeet(1), 10.7639, 0.001, 'sqMetersToSqFeet conversion factor');
  }

  console.groupEnd();

  // ── Summary ──────────────────────────────────────────────────────────────
  // Two of the assertions above resolve asynchronously (the de-dupe and
  // retry-after-failure tests); give them a tick before printing totals so
  // their pass/fail counts are included, matching the file's synchronous
  // reporting style as closely as async allows.
  setTimeout(() => {
    const total  = passed + failed;
    const status = failed === 0 ? '%cALL PASS%c' : `%c${failed} FAILED%c`;
    const color  = failed === 0 ? 'color:green;font-weight:bold' : 'color:red;font-weight:bold';
    console.log(status + ` — ${passed}/${total} tests passed`, color, '');
    if (typeof module !== 'undefined' && failed > 0) process.exitCode = 1;
  }, 50);
})();
