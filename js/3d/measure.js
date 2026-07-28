/* js/3d/measure.js
 * Pure-logic distance/area math for the 3D measurement tool. Operates on
 * points already in the scene's local meters (see js/3d/terrain.js's
 * local-tangent-plane projection) — no DOM, no THREE. Node-testable.
 *
 * These are on-screen conceptual measurements of generated/approximate
 * geometry and real terrain rendered at a flat-earth local approximation —
 * label results 'approximate' in the UI, never 'exact' or 'surveyed'.
 */
window.SCENE3D_MEASURE = (function () {
  'use strict';

  const METERS_TO_FEET = 3.28084;
  const SQM_TO_SQFT = 10.7639;

  function distance(p1, p2) {
    const dx = (p2.x || 0) - (p1.x || 0);
    const dy = (p2.y || 0) - (p1.y || 0);
    const dz = (p2.z || 0) - (p1.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /* Shoelace formula on the horizontal (X-Z) plane — footprint area of a
   * closed polygon, ignoring elevation (Y). Requires 3+ points. */
  function polygonAreaXZ(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      sum += (a.x || 0) * (b.z || 0) - (b.x || 0) * (a.z || 0);
    }
    return Math.abs(sum) / 2;
  }

  const metersToFeet = m => m * METERS_TO_FEET;
  const sqMetersToSqFeet = sqm => sqm * SQM_TO_SQFT;

  return { distance, polygonAreaXZ, metersToFeet, sqMetersToSqFeet };
})();
