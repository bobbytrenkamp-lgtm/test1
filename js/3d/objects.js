/* js/3d/objects.js
 * Pure-logic scene object store — the data model for the 3D object system
 * (buildings, parking, roads, fences). No DOM, no THREE — js/3d/engine.js
 * syncs THREE meshes to whatever this store holds; it never becomes the
 * source of truth itself. Node-testable (see tests/scene3d.test.js).
 *
 * Every object here is a generated conceptual volume, never a surveyed or
 * engineered structure — footprintStatus is always 'approximate' (there is
 * no path yet that could justify 'exact'). Consumers must not present these
 * dimensions as anything more precise than that.
 *
 * Phase C note on roads/fences: both are modeled as straight rectangular
 * segments (footprint.width = across, footprint.depth = length along
 * travel direction), the same parametrization as buildings/parking, so
 * they reuse the entire existing transform-gizmo/selection/undo pipeline
 * with no new interaction code. Multi-segment or curved paths are not
 * supported — compose a path from several straight segments placed end to
 * end. This is a deliberate scope cut, not an oversight (see
 * docs/3D_SYSTEM_ARCHITECTURE.md).
 */
window.SCENE3D_OBJECTS = (function () {
  'use strict';

  const SQM_TO_SQFT = 10.7639;
  const METERS_TO_FEET = 3.28084;

  const AREA_TYPES = new Set(['building', 'parking']);
  const LINEAR_TYPES = new Set(['road', 'fence']);

  const TYPE_DEFAULTS = {
    building: { label: 'Building', footprint: { width: 30, depth: 30 }, height: 10 },
    parking:  { label: 'Parking Lot', footprint: { width: 40, depth: 25 }, height: 0.05 },
    road:     { label: 'Road Segment', footprint: { width: 7, depth: 30 }, height: 0.05 },
    fence:    { label: 'Fence Line', footprint: { width: 0.15, depth: 30 }, height: 2 },
  };

  let _objects = [];   // ordered array, insertion order = list() order
  let _nextSeq = 1;

  function _typeDefaults(type) {
    return TYPE_DEFAULTS[type] || TYPE_DEFAULTS.building;
  }

  function _footprintSqm(footprint) {
    if (!footprint) return 0;
    if (footprint.shape === 'rectangle') {
      return Math.max(0, footprint.width || 0) * Math.max(0, footprint.depth || 0);
    }
    return 0;
  }

  function _withMetrics(obj) {
    const metrics = { footprintStatus: 'approximate' };
    if (AREA_TYPES.has(obj.type)) {
      metrics.footprintSqft = Math.round(_footprintSqm(obj.footprint) * SQM_TO_SQFT);
    } else if (LINEAR_TYPES.has(obj.type)) {
      metrics.lengthFt = Math.round((obj.footprint.depth || 0) * METERS_TO_FEET);
    }
    obj.metrics = metrics;
    return obj;
  }

  /* props: { type, label, phase, footprint:{shape,width,depth}, height, position:{x,z}, rotationDeg } */
  function create(props) {
    props = props || {};
    const type = ['building', 'parking', 'road', 'fence'].includes(props.type) ? props.type : 'building';
    const defaults = _typeDefaults(type);
    const obj = {
      id: 'obj_' + (_nextSeq++),
      type,
      label: props.label || defaults.label,
      phase: typeof props.phase === 'number' && props.phase > 0 ? Math.round(props.phase) : 1,
      footprint: {
        shape: (props.footprint && props.footprint.shape) || 'rectangle',
        width: (props.footprint && props.footprint.width) || defaults.footprint.width,
        depth: (props.footprint && props.footprint.depth) || defaults.footprint.depth,
      },
      height: typeof props.height === 'number' ? props.height : defaults.height,
      position: {
        x: (props.position && props.position.x) || 0,
        z: (props.position && props.position.z) || 0,
      },
      rotationDeg: props.rotationDeg || 0,
      createdAt: props.createdAt || Date.now(),
    };
    _withMetrics(obj);
    _objects.push(obj);
    return obj;
  }

  function get(id) {
    return _objects.find(o => o.id === id) || null;
  }

  /* Shallow-merges patch into the object (footprint/position merge one level
   * deep so a caller can update just `{footprint:{width:40}}` without
   * clobbering depth). Returns the updated object, or null if id not found.
   * `type` is intentionally not patchable — changing an object's type after
   * creation would leave its dimensions/metrics in an inconsistent state;
   * delete and recreate instead. */
  function update(id, patch) {
    const obj = get(id);
    if (!obj || !patch) return obj || null;
    if (patch.label !== undefined) obj.label = patch.label;
    if (patch.phase !== undefined && typeof patch.phase === 'number' && patch.phase > 0) obj.phase = Math.round(patch.phase);
    if (patch.height !== undefined) obj.height = patch.height;
    if (patch.rotationDeg !== undefined) obj.rotationDeg = patch.rotationDeg;
    if (patch.position) Object.assign(obj.position, patch.position);
    if (patch.footprint) Object.assign(obj.footprint, patch.footprint);
    _withMetrics(obj);
    return obj;
  }

  function remove(id) {
    const before = _objects.length;
    _objects = _objects.filter(o => o.id !== id);
    return _objects.length !== before;
  }

  function list() {
    return _objects.slice();
  }

  function clear() {
    _objects = [];
  }

  function _normalizeRaw(raw) {
    const type = ['building', 'parking', 'road', 'fence'].includes(raw.type) ? raw.type : 'building';
    const defaults = _typeDefaults(type);
    return _withMetrics({
      id: raw.id || ('obj_' + (_nextSeq++)),
      type,
      label: raw.label || defaults.label,
      phase: typeof raw.phase === 'number' && raw.phase > 0 ? Math.round(raw.phase) : 1,
      footprint: {
        shape: (raw.footprint && raw.footprint.shape) || 'rectangle',
        width: (raw.footprint && raw.footprint.width) || defaults.footprint.width,
        depth: (raw.footprint && raw.footprint.depth) || defaults.footprint.depth,
      },
      height: typeof raw.height === 'number' ? raw.height : defaults.height,
      position: { x: (raw.position && raw.position.x) || 0, z: (raw.position && raw.position.z) || 0 },
      rotationDeg: raw.rotationDeg || 0,
      createdAt: raw.createdAt || Date.now(),
    });
  }

  /* Replaces the entire store from a plain-array snapshot (e.g. restoring a
   * saved workspace's scene3d.objects). Recomputes metrics rather than
   * trusting stored values, and does not reset the id sequence, so newly
   * created objects in the same session never collide with restored ids.
   * A pre-Phase-C save has no `type`/`phase` keys on its objects at all —
   * those default to 'building'/1, exactly matching what Phase B always
   * meant, so old saves render identically to before. */
  function fromArray(arr) {
    _objects = (Array.isArray(arr) ? arr : []).map(_normalizeRaw);
  }

  function toArray() {
    return JSON.parse(JSON.stringify(_objects));
  }

  /* Re-inserts a fully-formed object (its own id preserved) back into the
   * store — used by undo/redo to reinstate a deleted/replaced object without
   * minting a new id via create(). Not part of the normal creation path. */
  function restore(obj) {
    if (!obj || !obj.id) return null;
    if (get(obj.id)) return get(obj.id); // already present — no-op, not a duplicate
    _objects.push(_withMetrics(JSON.parse(JSON.stringify(obj))));
    return get(obj.id);
  }

  /* Aggregate metrics across every object currently in the store — the data
   * source for the live site metrics dashboard. siteTotalSqft is optional
   * (from PARCEL_FEASIBILITY's envelope, when available) so coverage can be
   * computed; omitted entirely (not zero) when not available.
   * coveragePct is based on building footprint only, matching its Phase B
   * meaning ("building coverage of the site") — totalSiteFootprintSqft adds
   * parking so a caller wanting overall impervious-ish footprint has it too. */
  function computeSiteMetrics(siteTotalSqft) {
    const buildings = _objects.filter(o => o.type === 'building');
    const parking   = _objects.filter(o => o.type === 'parking');
    const roads     = _objects.filter(o => o.type === 'road');
    const fences    = _objects.filter(o => o.type === 'fence');

    const buildingFootprintSqft = buildings.reduce((s, o) => s + (o.metrics.footprintSqft || 0), 0);
    const parkingFootprintSqft  = parking.reduce((s, o) => s + (o.metrics.footprintSqft || 0), 0);
    const roadLengthFt          = roads.reduce((s, o) => s + (o.metrics.lengthFt || 0), 0);
    const fenceLengthFt         = fences.reduce((s, o) => s + (o.metrics.lengthFt || 0), 0);
    const maxHeight             = buildings.reduce((max, o) => Math.max(max, o.height || 0), 0);

    const out = {
      buildingCount: buildings.length,
      parkingCount: parking.length,
      roadCount: roads.length,
      fenceCount: fences.length,
      totalFootprintSqft: buildingFootprintSqft,
      totalSiteFootprintSqft: buildingFootprintSqft + parkingFootprintSqft,
      roadLengthFt,
      fenceLengthFt,
      maxHeightFt: Math.round(maxHeight * METERS_TO_FEET),
      footprintStatus: 'approximate',
    };
    if (typeof siteTotalSqft === 'number' && siteTotalSqft > 0) {
      out.coveragePct = Math.round((buildingFootprintSqft / siteTotalSqft) * 1000) / 10;
    }
    return out;
  }

  return {
    TYPE_DEFAULTS,
    create, get, update, remove, restore, list, clear, fromArray, toArray, computeSiteMetrics,
  };
})();
