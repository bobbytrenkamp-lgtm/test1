/* js/3d/objects.js
 * Pure-logic scene object store — the data model for Phase B's building
 * creation/editing tools. No DOM, no THREE — js/3d/engine.js syncs THREE
 * meshes to whatever this store holds; it never becomes the source of truth
 * itself. Node-testable (see tests/scene3d.test.js).
 *
 * Every object here is a generated conceptual volume, never a surveyed or
 * engineered structure — footprintStatus is always 'approximate' in Phase B
 * (there is no path yet that could justify 'exact'). Consumers must not
 * present these dimensions as anything more precise than that.
 */
window.SCENE3D_OBJECTS = (function () {
  'use strict';

  const SQM_TO_SQFT = 10.7639;

  let _objects = [];   // ordered array, insertion order = list() order
  let _nextSeq = 1;

  function _footprintSqm(footprint) {
    if (!footprint) return 0;
    if (footprint.shape === 'rectangle') {
      return Math.max(0, footprint.width || 0) * Math.max(0, footprint.depth || 0);
    }
    return 0;
  }

  function _withMetrics(obj) {
    const sqm = _footprintSqm(obj.footprint);
    obj.metrics = {
      footprintSqft: Math.round(sqm * SQM_TO_SQFT),
      footprintStatus: 'approximate', // conceptual volume — never claim 'exact'
    };
    return obj;
  }

  /* props: { type, label, footprint:{shape,width,depth}, height, position:{x,z}, rotationDeg } */
  function create(props) {
    props = props || {};
    const obj = {
      id: 'obj_' + (_nextSeq++),
      type: props.type || 'building',
      label: props.label || 'Building',
      footprint: {
        shape: (props.footprint && props.footprint.shape) || 'rectangle',
        width: (props.footprint && props.footprint.width) || 30,
        depth: (props.footprint && props.footprint.depth) || 30,
      },
      height: typeof props.height === 'number' ? props.height : 10,
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
   * clobbering depth). Returns the updated object, or null if id not found. */
  function update(id, patch) {
    const obj = get(id);
    if (!obj || !patch) return obj || null;
    if (patch.label !== undefined) obj.label = patch.label;
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

  /* Replaces the entire store from a plain-array snapshot (e.g. restoring a
   * saved workspace's scene3d.objects). Recomputes metrics rather than
   * trusting stored values, and does not reset the id sequence, so newly
   * created objects in the same session never collide with restored ids. */
  function fromArray(arr) {
    _objects = (Array.isArray(arr) ? arr : []).map(raw => _withMetrics({
      id: raw.id || ('obj_' + (_nextSeq++)),
      type: raw.type || 'building',
      label: raw.label || 'Building',
      footprint: {
        shape: (raw.footprint && raw.footprint.shape) || 'rectangle',
        width: (raw.footprint && raw.footprint.width) || 30,
        depth: (raw.footprint && raw.footprint.depth) || 30,
      },
      height: typeof raw.height === 'number' ? raw.height : 10,
      position: { x: (raw.position && raw.position.x) || 0, z: (raw.position && raw.position.z) || 0 },
      rotationDeg: raw.rotationDeg || 0,
      createdAt: raw.createdAt || Date.now(),
    }));
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
   * computed; omitted entirely (not zero) when not available. */
  function computeSiteMetrics(siteTotalSqft) {
    const buildings = _objects.filter(o => o.type === 'building');
    const totalFootprintSqft = buildings.reduce((sum, o) => sum + (o.metrics.footprintSqft || 0), 0);
    const maxHeight = buildings.reduce((max, o) => Math.max(max, o.height || 0), 0);
    const out = {
      buildingCount: buildings.length,
      totalFootprintSqft,
      maxHeightFt: Math.round(maxHeight * 3.28084),
      footprintStatus: 'approximate',
    };
    if (typeof siteTotalSqft === 'number' && siteTotalSqft > 0) {
      out.coveragePct = Math.round((totalFootprintSqft / siteTotalSqft) * 1000) / 10;
    }
    return out;
  }

  return { create, get, update, remove, restore, list, clear, fromArray, toArray, computeSiteMetrics };
})();
