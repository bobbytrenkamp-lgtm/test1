/* js/3d/templates.js
 * Generic development templates — pure logic, no DOM/THREE. Node-testable.
 *
 * "Generic" is deliberate: these are illustrative starting arrangements
 * (a building + parking, an office park, a warehouse + yard), not
 * engineering designs, approved plans, or anything specific to data
 * centers — the data-center-specific generator lives separately in
 * js/3d/campus-generator.js. A template never creates objects itself; it
 * returns plain object-creation specs, and the caller (js/3d/engine.js) is
 * responsible for actually instantiating them, so a template placement can
 * be a single batched undo step.
 */
window.SCENE3D_TEMPLATES = (function () {
  'use strict';

  const TEMPLATES = [
    {
      id: 'single-building',
      label: 'Single Building + Parking',
      description: 'One conceptual building, an adjacent parking area, and a short access road stub.',
      specs: [
        { type: 'building', offset: { x: 0, z: 0 }, footprint: { width: 30, depth: 30 } },
        { type: 'parking', offset: { x: 45, z: 0 }, footprint: { width: 35, depth: 25 } },
        { type: 'road', offset: { x: 0, z: -35 }, footprint: { width: 7, depth: 25 } },
      ],
    },
    {
      id: 'office-park',
      label: 'Office Park',
      description: 'Two conceptual buildings, two parking areas, and a perimeter fence segment.',
      specs: [
        { type: 'building', offset: { x: -35, z: 0 }, footprint: { width: 30, depth: 25 }, height: 12 },
        { type: 'building', offset: { x: 35, z: 0 }, footprint: { width: 30, depth: 25 }, height: 12 },
        { type: 'parking', offset: { x: -35, z: 40 }, footprint: { width: 35, depth: 25 } },
        { type: 'parking', offset: { x: 35, z: 40 }, footprint: { width: 35, depth: 25 } },
        { type: 'fence', offset: { x: 0, z: -55 }, footprint: { width: 0.15, depth: 140 }, rotationDeg: 90 },
      ],
    },
    {
      id: 'warehouse-yard',
      label: 'Warehouse + Yard',
      description: 'One large conceptual warehouse, a fenced yard, and an access road stub.',
      specs: [
        { type: 'building', offset: { x: 0, z: 0 }, footprint: { width: 80, depth: 50 }, height: 9 },
        { type: 'fence', offset: { x: 0, z: 60 }, footprint: { width: 0.15, depth: 100 }, rotationDeg: 90 },
        { type: 'road', offset: { x: 0, z: -35 }, footprint: { width: 8, depth: 30 } },
      ],
    },
  ];

  function list() {
    return TEMPLATES.map(t => ({ id: t.id, label: t.label, description: t.description, objectCount: t.specs.length }));
  }

  function get(id) {
    return TEMPLATES.find(t => t.id === id) || null;
  }

  /* Returns an array of absolute object-creation specs
   * ({type, footprint, height, rotationDeg, position}), offset by
   * originOffset (default the scene origin). Returns null for an unknown
   * template id. */
  function instantiate(id, originOffset) {
    const t = get(id);
    if (!t) return null;
    const ox = (originOffset && originOffset.x) || 0;
    const oz = (originOffset && originOffset.z) || 0;
    return t.specs.map(s => {
      const spec = {
        type: s.type,
        footprint: { shape: 'rectangle', width: s.footprint.width, depth: s.footprint.depth },
        rotationDeg: s.rotationDeg || 0,
        position: { x: ox + s.offset.x, z: oz + s.offset.z },
      };
      if (typeof s.height === 'number') spec.height = s.height;
      return spec;
    });
  }

  return { list, get, instantiate };
})();
