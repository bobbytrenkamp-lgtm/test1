/* tests/scene3d.test.js
 * Phase A 3D terrain view unit tests. No external test framework — run with
 * `node tests/scene3d.test.js`. Follows tests/parcel.test.js's dual-mode
 * bootstrap pattern: js/3d/terrain-tiles.js and js/3d/scene-state.js have no
 * DOM/THREE dependency, so they load directly under a minimal window shim.
 * js/3d/index.js, engine.js, and camera.js touch the DOM/canvas/WebGL and
 * are excluded here — they need real-browser e2e coverage instead (see
 * docs/3D_SYSTEM_ARCHITECTURE.md's manual verification checklist).
 */

if (typeof window === 'undefined') {
  const path = require('path');
  const ROOT = path.join(__dirname, '..');
  global.window = global;
  for (const rel of ['js/3d/terrain-tiles.js', 'js/3d/scene-state.js']) {
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
    assertEq(captured.schemaVersion, 1, 'captured object stamps current schema version');
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
