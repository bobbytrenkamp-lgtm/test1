/* js/3d/constraints.js
 * Pure-logic geometric constraint checking for the 3D object system. No
 * DOM, no THREE — operates on plain {x,z} points in the scene's local
 * meters (see js/3d/terrain.js's projection). Node-testable.
 *
 * Honesty boundary, stated once here because it governs every status this
 * module can return: this module can verify two things geometrically —
 * (1) whether an object's footprint stays within the real parcel boundary
 * polygon, and (2) whether two objects' footprints overlap each other. It
 * CANNOT verify actual zoning setback-line compliance, because that would
 * require a true offset (inset) polygon of the parcel boundary by the
 * front/side/rear setback distances, and this codebase does not compute
 * that geometry anywhere (PARCEL_FEASIBILITY reports setback distances as
 * numbers, not as inset-polygon coordinates). Rather than fabricate an
 * approximate inset polygon and risk it being read as an authoritative
 * setback line, this module never returns a 'pass'/'compliant'/'approved'
 * status. Every object sits in one of three states:
 *   'unknown'          — no parcel boundary available to check against
 *   'conflict'         — geometrically certain problem: outside the parcel
 *                         boundary, or overlapping another object
 *   'requires-review'  — inside the parcel boundary, no overlaps found, but
 *                         setback-line compliance was not and cannot be
 *                         verified by this module — the raw setback numbers
 *                         must be checked by a person.
 */
window.SCENE3D_CONSTRAINTS = (function () {
  'use strict';

  /* Ray-casting point-in-polygon, same algorithm already used by
   * js/parcel/draw-tool.js's _pointInPolygon (there in lat/lng, here in
   * local x/z meters) — reusing a proven pattern rather than a new one. */
  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, zi = polygon[i].z;
      const xj = polygon[j].x, zj = polygon[j].z;
      const intersect = ((zi > point.z) !== (zj > point.z))
        && (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /* The 4 corners of a footprint rectangle, in scene-local x/z, accounting
   * for rotation about the object's center (position). */
  function rectCorners(obj) {
    const w = (obj.footprint && obj.footprint.width) || 0;
    const d = (obj.footprint && obj.footprint.depth) || 0;
    const rad = ((obj.rotationDeg || 0) * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const hw = w / 2, hd = d / 2;
    const local = [
      { x: -hw, z: -hd }, { x: hw, z: -hd }, { x: hw, z: hd }, { x: -hw, z: hd },
    ];
    return local.map(p => ({
      x: obj.position.x + p.x * cos - p.z * sin,
      z: obj.position.z + p.x * sin + p.z * cos,
    }));
  }

  /* Separating Axis Theorem for two (possibly rotated) rectangles — exact,
   * not an approximation, unlike the polygon-boundary check above. */
  function rectanglesOverlap(objA, objB) {
    const cornersA = rectCorners(objA);
    const cornersB = rectCorners(objB);

    function axes(corners) {
      const out = [];
      for (let i = 0; i < 2; i++) { // only need 2 of the 4 edges (opposite edges share an axis)
        const p1 = corners[i], p2 = corners[i + 1];
        const edge = { x: p2.x - p1.x, z: p2.z - p1.z };
        const len = Math.hypot(edge.x, edge.z) || 1;
        out.push({ x: -edge.z / len, z: edge.x / len }); // perpendicular, normalized
      }
      return out;
    }

    function project(corners, axis) {
      const dots = corners.map(c => c.x * axis.x + c.z * axis.z);
      return { min: Math.min(...dots), max: Math.max(...dots) };
    }

    const testAxes = axes(cornersA).concat(axes(cornersB));
    for (const axis of testAxes) {
      const pa = project(cornersA, axis);
      const pb = project(cornersB, axis);
      if (pa.max < pb.min || pb.max < pa.min) return false; // gap found on this axis — no overlap
    }
    return true; // no separating axis found on any of the 4 tested axes — rectangles overlap
  }

  /* obj: the object to check. allObjects: full object list (obj excluded
   * automatically by id). parcelBoundary: array of {x,z} points (the real
   * parcel polygon projected into scene-local meters), or null/undefined
   * when no parcel is selected. */
  function checkObjectConstraints(obj, allObjects, parcelBoundary) {
    const reasons = [];

    if (!parcelBoundary || parcelBoundary.length < 3) {
      return { status: 'unknown', reasons: ['No parcel boundary available — select a parcel to check site containment.'] };
    }

    const corners = rectCorners(obj);
    const allInside = corners.every(c => pointInPolygon(c, parcelBoundary));
    if (!allInside) {
      reasons.push('Extends outside the parcel boundary.');
    }

    const overlaps = (allObjects || [])
      .filter(o => o.id !== obj.id)
      .filter(o => rectanglesOverlap(obj, o));
    overlaps.forEach(o => reasons.push(`Overlaps "${o.label}".`));

    if (reasons.length > 0) {
      return { status: 'conflict', reasons };
    }
    return {
      status: 'requires-review',
      reasons: ['Inside the parcel boundary with no overlaps — setback-line compliance was not verified; compare against the setback distances shown above.'],
    };
  }

  return { pointInPolygon, rectCorners, rectanglesOverlap, checkObjectConstraints };
})();
