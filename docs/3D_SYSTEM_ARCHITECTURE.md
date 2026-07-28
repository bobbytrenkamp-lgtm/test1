# 3D Terrain View — Architecture Reference (Phase A + Phase B)

This document covers **Phase A** (integrated 2D/3D terrain foundation) and **Phase B** (object system: building volumes, selection, transform gizmo, undo/redo, live site metrics) of the 3D site-design/digital-twin system. Phases C–E (roads/parking/fences/utilities, setbacks/constraint checking, environmental overlays, the data-center campus generator, development templates, presentation mode, and export) are explicitly out of scope for this pass and are not described here.

---

## Why Phase A only

The full request spans 47 requirement sections — terrain, navigation, building creation, a campus generator, constraint checking, presentation mode, exports, and more. Attempting all of it in one pass would produce exactly what the request itself warns against: "a demo… a collection of disconnected buttons." The request's own implementation order (Phase A → E) is followed here: Phase A ships a real, working, integrated 2D/3D terrain foundation — not stubs — and later phases build on top of it once it is solid.

A repository audit preceded any code (see git history for this change) and found: zero prior 3D/WebGL code anywhere in the repo (genuinely greenfield for the engine itself), but real integration surface already exists that Phase A reuses rather than duplicates — `window.PARCEL` (`js/parcel/index.js`) as the coordinator pattern to mirror, `window.PARCEL_FEASIBILITY` (`js/parcel/feasibility.js`) as the buildable-envelope data source for later phases' massing, `window.LAYER_REGISTRY` (`js/layer-registry.js`) as the provenance-metadata schema, and — most importantly — the existing per-user saved "workspace" object in `js/map.js` (`_captureWorkspaceState`/`_applyWorkspace`) as the natural home for 3D scene state, avoiding the need for a new "Project" entity.

---

## Technology decision: Three.js (MIT), vendored, lazy-loaded

| Criterion | Three.js | Babylon.js | CesiumJS | deck.gl | Raw WebGL |
|---|---|---|---|---|---|
| License | MIT | Apache 2.0 | Apache 2.0 (Ion features paid) | MIT | n/a |
| Vendoring as static files, no bundler | Yes | Yes, heavier | Hard — large worker/asset tree | Partial, fragmented packages | N/A |
| Built for county-scale heightmap terrain + orbit camera | Yes, most common use case for exactly this | Yes | Built for globe geodesy, not flat local scenes | Built for map data-viz overlays, not orbitable object scenes | N/A |
| Leaflet coexistence | Own canvas, no conflict | Same | Wants to *be* the map | Naturally an overlay, not a separate view | Same as Three.js |
| Mobile/touch | `OrbitControls` addon has strong touch support | Comparable | Heavier interaction surface | Weak for this use case | Hand-rolled |

**Chosen: Three.js**, vendored at `vendor/three/` (`three.module.js`, `three.core.min.js`, `OrbitControls.js`, `LICENSE`). Rejected Cesium (paid Ion terrain, disproportionate globe-geodesy framework for a single-county scene), Babylon.js (no material advantage here, less precedent for heightmap-PNG terrain), deck.gl (built for map overlays, not orbitable scenes), raw WebGL (would reinvent camera math, picking, and mesh generation from scratch — wrong for a Phase A timeline).

### The ES-module wrinkle

Modern Three.js ships ES-module builds only (the classic UMD build was removed at r161). This repo's ~40 existing scripts are all classic `<script defer>` tags. Phase A introduces the first ES module in the codebase deliberately and narrowly:

- `js/3d/index.js` is a **classic** script (always loaded, `window._track` tracked like every other script) that defines `window.SCENE3D` and imports nothing from `vendor/three/`.
- The first time a visitor opens 3D mode, `SCENE3D.activate()` inserts `<script type="module" src="js/3d/engine.js">` — this is the **only** file that imports `vendor/three/three.module.js` and `vendor/three/OrbitControls.js`.
- Net effect: visitors who never open 3D mode download zero Three.js bytes.

`OrbitControls.js` ships with a bare `import ... from 'three'` specifier, which does not resolve without an import map. Rather than add an import map (a second new browser-API surface with no other precedent in this codebase), the vendored copy has one line patched: `from 'three'` → `from './three.module.js'`. **Re-apply this one-line patch if `vendor/three/OrbitControls.js` is ever re-vendored from a fresh upstream copy.**

### Vendoring procedure

```
mkdir /tmp/three-vendor && cd /tmp/three-vendor
npm install three --no-save
cp node_modules/three/build/three.module.min.js  <repo>/vendor/three/three.module.js
cp node_modules/three/build/three.core.min.js    <repo>/vendor/three/three.core.min.js
cp node_modules/three/examples/jsm/controls/OrbitControls.js <repo>/vendor/three/OrbitControls.js
cp node_modules/three/LICENSE                    <repo>/vendor/three/LICENSE
# then: patch OrbitControls.js's `from 'three'` -> `from './three.module.js'`
rm -rf /tmp/three-vendor
```

Same procedure already used for Leaflet/topojson (see `AI_CONTEXT.md`'s "Vendored Dependencies" section): installed via `npm install` into a scratch directory, copied manually, scratch directory discarded — no `package.json`/`package-lock.json` ever committed. Vendored at Three.js r0.185.1.

---

## Terrain data source: AWS Terrain Tiles (Terrarium encoding)

Free, keyless, no-account-required S3-hosted elevation tile set: `https://registry.opendata.aws/terrain-tiles/`. URL template: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`. Decode: `elevation_meters = (red*256 + green + blue/256) - 32768`.

USGS's official EPQS elevation API was evaluated and rejected: confirmed CORS-blocked for direct browser `fetch()` (documented in real user bug reports), and it is a point-query API unsuited to bulk terrain-mesh generation regardless.

**Known caveat, not hidden:** this bucket's CORS support is inferred from its wide adoption by browser-side tools (e.g. MapLibre GL JS's `raster-dem` source uses this exact URL pattern directly from the browser), but was not independently bucket-specific confirmed before this Phase A build. If a live CORS smoke test against the deployed GitHub Pages origin ever fails, the per-tile and total-failure fallback paths described below are exactly what protect the rest of the application — the terrain layer degrades to an honest "no data" message rather than breaking.

---

## Module reference

```
vendor/three/
  three.module.js       Three.js core (minified), MIT
  three.core.min.js     Three.js core dependency of the module build above
  OrbitControls.js       Three.js examples/jsm addon, MIT (one-line import patch, see above)
  TransformControls.js   Three.js examples/jsm addon, MIT (same one-line import patch)
  LICENSE

js/3d/
  index.js          Classic script. window.SCENE3D coordinator — mirrors
                     window.PARCEL's shape (init/onCountyChanged/onLayerToggle),
                     plus Phase B passthroughs (createBuilding/undo/redo/etc.).
                     No THREE import; lazy-loads engine.js on first activate().
  fallback.js        Classic script. WebGL capability probe + low-power
                      (software renderer) heuristic. Runs before any THREE code.
  terrain-tiles.js    Classic script, DOM-free. Tile math, Terrarium decode,
                       in-memory cache with de-dupe/eviction. Node-testable.
  scene-state.js      Classic script, DOM-free. scene3d schema (v2)
                       capture/migrate/apply. Node-testable.
  objects.js          Classic script, DOM-free (Phase B). Building-volume
                       object store: create/update/remove/list/restore,
                       aggregate site metrics. Node-testable.
  history.js          Classic script, DOM-free (Phase B). Generic undo/redo
                       command stack. Node-testable.
  selection.js        Classic script (Phase B). Single-object selection state
                       + scene3d:object-selected/-deselected CustomEvents,
                       mirrors js/parcel/selection.js's shape.
  measure.js          Classic script, DOM-free (Phase B). Distance/polygon-
                       area math in local scene meters. Node-testable.
  engine.js          ES module. Owns THREE.Scene/Camera/Renderer, the render
                      loop, the object mesh sync, click-to-select raycasting,
                      and the TransformControls gizmo; orchestrates terrain.js
                      + camera.js. Registers itself onto window.SCENE3D via
                      _registerEngine().
  terrain.js          ES module. Local-tangent-plane lat/lng<->meters
                       projection + THREE terrain mesh building from decoded
                       heightmaps.
  camera.js           ES module. Orbit/pan/zoom/tilt camera configuration on
                       top of OrbitControls (mouse-drag orbit, wheel/pinch
                       zoom, two-finger pan/touch are handled by OrbitControls
                       itself, not reimplemented here).

css/scene3d.css       Panel styling, matches the existing floating-panel
                       token set (var(--surface)/--border/--text/--text-muted).
```

### `window.SCENE3D` — public API

```js
window.SCENE3D = {
  init(map),                          // after Leaflet map is ready
  onCountyChanged(fips),               // from handleCountyClick
  onLayerToggle(id, visible, fips),    // from setLayerVisible('terrain_3d', ...)
  isAvailable(),                       // sync WebGL capability check, cached
  captureState(),                      // -> scene3d object, or null if never activated
  applyState(state),                   // restores camera/terrain from a saved scene3d object; state may be null (no-op)
  activate(),                          // user opened 3D mode — lazy-loads engine.js
  deactivate(),                        // tears down the WebGL context, frees GPU memory
};
```

Every method is wrapped so it can only return/resolve — it never throws past the `window.SCENE3D` boundary — and every call site in `js/map.js` uses `window.SCENE3D?.method()`. A missing or failed 3D module is always a safe no-op elsewhere in the app: **a 3D failure cannot break the rest of the application.**

Integration points added to `js/map.js`:
- Map-ready init, alongside the existing `window.PARCEL?.init(leafletMap)` call.
- `handleCountyClick`, alongside the existing `window.PARCEL.onCountyChanged(fips)` call.
- `setLayerVisible`, a new `terrain_3d` branch alongside the existing `parcels` branch.
- `_captureWorkspaceState()` / `_applyWorkspace()` — see schema section below.

### `scene3d` — saved workspace field

Extends the **existing** per-user save/load system (localStorage, with optional Supabase cloud sync under the `"workspace"` item type) rather than introducing a new "Project" entity:

```js
scene3d: {
  schemaVersion: 2,
  active: false,
  camera: { target: { lat, lng }, distance, azimuth, polar },
  terrainEnabled: true,
  exaggeration: 1.5,
  objects: [ /* Phase B building volumes, see below */ ],
}
```

`_captureWorkspaceState` only attaches this field when `SCENE3D.captureState()` returns non-null (the user actually opened 3D mode that session) — a user who never touches 3D gets no `scene3d` key on their saves, same as before this change. `_applyWorkspace` does `if (ws.scene3d) window.SCENE3D?.applyState(ws.scene3d)` with no `else` branch: a workspace saved before Phase A shipped has no `scene3d` key, loads with no error, and does not force 3D mode open or closed. `js/3d/scene-state.js`'s `migrateScene3dState()` backfills partial/older-shaped objects from defaults rather than rejecting them, so future schema bumps stay backward compatible — a v1 save (Phase A, before `objects` existed) migrates to v2 with an empty `objects` array, never a fabricated building.

### Fallback behavior

`js/3d/fallback.js`'s `detectWebGL()` runs before any Three.js import. A software-rasterizer denylist (SwiftShader/llvmpipe/etc. substring match) flags low-power devices without needing a GPU allowlist that would rot over time — unrecognized GPUs are treated as fine (fails open). If WebGL is unavailable, `SCENE3D.activate()` never fetches Three.js at all — the network tab shows zero requests to `vendor/three/*`.

Per-tile terrain fetch failures (network, CORS, 404) are caught individually in `js/3d/terrain.js`; a failed tile renders as a visually distinct dimmed wireframe "no data" patch, not unmarked flat ground. If every tile in view fails, the panel shows an honest status message instead of a scene that looks like a silent bug.

---

## Phase B: object system (building volumes, selection, transform gizmo, undo/redo, live metrics)

Phase B adds a real (not stubbed) conceptual building-volume editor on top of Phase A's terrain view, reusing Phase A's infrastructure rather than starting a second system: the same `window.SCENE3D` coordinator, the same `scene3d` saved-workspace field (extended with an `objects` array, schema v2), the same fail-safe `_engine && _active` guard pattern for every new coordinator method.

**Object model** (`js/3d/objects.js`): each building is `{ id, type:'building', label, footprint:{shape:'rectangle', width, depth}, height, position:{x,z}, rotationDeg, metrics:{footprintSqft, footprintStatus} }`, all dimensions in local scene meters. `footprintStatus` is always `'approximate'` — there is no code path in Phase B that could justify `'exact'` for a generated conceptual volume, and the UI never claims otherwise (object list rows and the metrics readout both append "(approx.)"). `computeSiteMetrics(siteTotalSqft)` aggregates footprint/height/coverage across every building; `coveragePct` is *omitted*, not zeroed, when the site's total area is unavailable (no parcel selected) — the same "exclude missing factor, never fabricate a zero" convention used elsewhere in this codebase (e.g. `PARCEL_FEASIBILITY.assess()`'s weight redistribution).

**Building creation**: `SCENE3D.createBuilding()` seeds a default footprint/height from `window.PARCEL_FEASIBILITY.assess(...).envelope` when a parcel is selected (reusing the existing buildable-envelope calculator rather than re-deriving setback/coverage logic), falling back to a generic 30m×30m×10m box when no parcel context is available. Either way the result is placed at the scene origin and immediately selected so the user can drag it into position.

**Selection** (`js/3d/selection.js`): a single-selection singleton mirroring `js/parcel/selection.js`'s shape (`select`/`deselect`/`getSelected`/`isSelected`, `scene3d:object-selected`/`-deselected` CustomEvents on `document`). `js/3d/engine.js` subscribes to these events at module scope to keep the TransformControls gizmo attached to whatever is selected and to recolor the selected mesh — the same event-driven decoupling the parcel system already uses between its selection state and its renderer.

**Transform gizmo**: `vendor/three/TransformControls.js` (same MIT license, same one-line `from 'three'` → `from './three.module.js'` import patch as `OrbitControls.js`). Deliberately restricted to two modes, exposed as "Move" / "Rotate" toolbar buttons — no "Scale" mode:
- Translate: only the X and Z axis handles are shown (`showY = false`) — buildings move across the ground plane, they don't float up through it via an accidental Y-axis drag.
- Rotate: only the Y axis handle is shown (`showX = false; showZ = false`) — a building can face a different direction (yaw); tilting it (pitch/roll) has no real-world meaning for a ground-sitting structure.
- Scale was cut from Phase B's UI entirely: a literal non-uniform 3D scale on a box is ambiguous (does it change the footprint, the height, or distort the box?) — precise footprint/height edits belong in the object panel's fields instead, where "40m wide" is unambiguous. This is a deliberate scope cut, not an oversight.

While dragging, `objectChange` events live-sync the object store from the mesh every frame (so the metrics panel updates in real time) without pushing an undo entry per frame; a single undo/redo command is pushed once on `mouseUp`, comparing the pre-drag snapshot to the final position/rotation.

**Undo/redo** (`js/3d/history.js`): a generic `{ undo, redo, label }` command stack, capped at 50 entries, with the standard "a new push clears the redo stack" rule. Every mutating operation (create, delete, edit, move/rotate) pushes exactly one command. Create/delete commands capture a full JSON snapshot of the object and use `OBJECTS.restore(snapshot)` (not `OBJECTS.create()`) on undo/redo so the object's original id is preserved rather than minting a new one each time.

**Switching sites clears objects, on purpose**: building positions are stored in scene-local meters relative to the current origin (the map's center at the time 3D was activated/the county last changed). If the user switches counties, those coordinates would silently point at a different, unrelated piece of geography. `SCENE3D.onCountyChanged` clears the object store, selection, and undo history when the fips actually changes, and shows a status message explaining why — the alternative (silently keeping stale positions, or silently re-projecting them onto the new site) would both be a form of fabricating site data.

**Live site metrics dashboard**: `#scene3d-metrics` renders building count, total footprint (sqft), coverage % of the parcel (when available), and max height (ft) — recomputed and re-rendered after every object mutation via a `scene3d:objects-changed` CustomEvent dispatched by the coordinator (plus the selection events, since the delete button's enabled state depends on selection too).

---

## Explicitly out of scope this pass

Roads/parking/fencing/utility modeling, setbacks and real-time constraint-conflict checking, environmental context overlays, construction phasing, the data-center campus generator, development templates, sun/shadow tools, alternatives/scenario comparison, presentation mode, image/data/3D-model export, persistent (IndexedDB) tile/object caching, fly/walk-through navigation, keyboard shortcuts for the object editor (undo/redo/delete are toolbar-button-only in Phase B to avoid colliding with existing global shortcuts), non-rectangular footprint shapes, and reconciling the pre-existing drawing-tool (map-level vs. parcel-level) and compare-tool (three separate systems) fragmentation identified during the repository audit. These are Phases C–E (or, for the last two items, a standing cross-cutting cleanup not tied to any single phase).

---

## Manual verification checklist

Automated coverage (`tests/scene3d.test.js`, wired into `tests/run_all.sh`) covers tile math, Terrarium decode, cache/de-dupe/eviction behavior, `scene3d` schema v1→v2 migration, the object store (create/update/remove/restore/metrics), the undo/redo command stack, selection events, and distance/area math — all DOM/WebGL-free pure logic (89 assertions total); the full suite (`tests/run_all.sh`) passes with these additions and no regressions. The following need a real browser and were **not** verified during this implementation pass (Phase A or Phase B) — the session had no working Chromium/Chrome binary available (a broken symlink in the expected Playwright cache, and `playwright install` is off-limits per environment policy) — so they remain open items for the first real-browser pass on this feature, not confirmed-working claims:

- [ ] CORS smoke test: `fetch()` one known Terrarium tile URL from the deployed GitHub Pages origin's browser console; confirm it resolves rather than a CORS error.
- [ ] Opening 3D mode on a WebGL-capable device with network access renders a real terrain mesh for the currently-selected county area, and the elevation visually matches known local topology.
- [ ] Orbit (drag), pan, zoom (scroll/pinch), and tilt all work with both mouse and a real touchscreen.
- [ ] Switching from 2D to 3D and back preserves county/parcel context without a duplicate data fetch.
- [ ] Save a workspace while 3D is active, reload the page, load that workspace — camera position, terrain toggle, and 3D-active state restore correctly.
- [ ] Load a workspace saved before this feature shipped (no `scene3d` key) — no error, 3D state untouched.
- [ ] Disable WebGL in the browser (e.g. `chrome://flags` software rendering, or a fresh profile with hardware acceleration off) — confirm the documented fallback message appears and zero `vendor/three/*` requests fire.
- [ ] Force a terrain-fetch failure (block `s3.amazonaws.com` in devtools) — confirm the honest fallback message appears instead of unmarked flat ground.
- [ ] `tests/run_all.sh` passes clean, including the updated `test_no_paid_dependencies.py` tile-host allowlist.
- [ ] Click "+ Building" — a box appears, is auto-selected, and the Move gizmo attaches to it with only X/Z handles visible (no Y arrow).
- [ ] Drag the Move gizmo — the building follows on the ground plane only (never moves vertically); the metrics panel's footprint/coverage numbers update live during the drag.
- [ ] Switch to Rotate mode — only the Y-axis (yaw) ring is visible; X/Z tilt rings are hidden.
- [ ] Click a building on the canvas (not via the object list) — it becomes selected (gizmo attaches, row highlights in the object list, Delete button enables); click empty space — it deselects.
- [ ] Create 2–3 buildings, move/rotate one, delete another; Undo three times restores the prior states in order; Redo replays them; the object list and metrics panel stay in sync at every step.
- [ ] Save a workspace with buildings placed, reload, load it back — buildings reappear at the same positions/sizes.
- [ ] Load a workspace saved under Phase A (schema v1, no `objects` key) — loads with no error and an empty building list, not a crash.
- [ ] Switch to a different county while buildings exist — objects clear, a status message explains why, and no stale/mis-positioned geometry is left behind.
- [ ] Orbiting/panning the camera (a drag that starts on empty space or the terrain, not on a building or the gizmo) does not accidentally select or move a building.
