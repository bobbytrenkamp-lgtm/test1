/* js/3d/campus-generator.js
 * Conceptual data-center campus layout generator — pure logic, no DOM/
 * THREE. Node-testable. Depends on window.SCENE3D_CONSTRAINTS (point-in-
 * polygon + rectangle corners) — load order in index.html puts
 * constraints.js before this file.
 *
 * What this generates is a CONCEPTUAL layout only: candidate data-hall
 * footprints placed on a grid, filtered to those that fit entirely inside
 * the real parcel boundary polygon, plus an optional substation, perimeter
 * fence (from the boundary's own edges), and one access-road stub. It does
 * NOT claim engineering feasibility, utility capacity, permit compliance,
 * or that generated positions are buildable — every result carries an
 * explicit disclaimer string, and js/3d/engine.js/js/map.js must surface
 * it, not just the numbers. The grid-inset used to keep halls away from
 * the boundary edge (`marginM`) is a generator placement parameter, not a
 * legal setback line — see js/3d/constraints.js for why this codebase
 * cannot compute or claim setback-line compliance.
 */
window.SCENE3D_CAMPUS_GENERATOR = (function () {
  'use strict';

  const MAX_GRID_CELLS = 2000; // hard cap so a degenerate input (tiny hall on a huge parcel) can't hang

  function _bbox(polygon) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    polygon.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    });
    return { minX, maxX, minZ, maxZ };
  }

  function _centroid(polygon) {
    let x = 0, z = 0;
    polygon.forEach(p => { x += p.x; z += p.z; });
    return { x: x / polygon.length, z: z / polygon.length };
  }

  function _fitsInsideBoundary(candidate, boundary, CONSTRAINTS) {
    const corners = CONSTRAINTS.rectCorners(candidate);
    return corners.every(c => CONSTRAINTS.pointInPolygon(c, boundary));
  }

  /* opts:
   *   boundary       — required: array of {x,z}, the real parcel boundary
   *                     in scene-local meters (js/3d/terrain.js's
   *                     projection). Refuses to generate anything without it.
   *   hallWidth/hallDepth/hallHeight — meters, defaults 60/90/12 (an
   *                     illustrative data-hall scale, not a real spec)
   *   spacing        — meters between adjacent halls, default 15
   *   marginM        — meters to keep clear of the boundary edge when
   *                     placing halls, default 10 — a placement margin,
   *                     NOT a legal setback (see file header)
   *   targetHallCount — optional cap on how many halls to place
   *   includeSubstation/includeFence/includeAccessRoad — booleans, all
   *                     default true
   */
  function generate(opts) {
    opts = opts || {};
    const CONSTRAINTS = window.SCENE3D_CONSTRAINTS;
    const warnings = [];
    const boundary = opts.boundary;

    if (!boundary || boundary.length < 3) {
      return {
        halls: [], substations: [], fences: [], roads: [],
        warnings: ['No parcel boundary available — select a parcel before generating a campus layout.'],
        disclaimer: 'Conceptual layout only. Does not claim engineering feasibility, utility capacity, or permit compliance.',
      };
    }

    const hallWidth = Math.max(1, opts.hallWidth || 60);
    const hallDepth = Math.max(1, opts.hallDepth || 90);
    const hallHeight = Math.max(1, opts.hallHeight || 12);
    const spacing = Math.max(0, opts.spacing != null ? opts.spacing : 15);
    const marginM = Math.max(0, opts.marginM != null ? opts.marginM : 10);
    const targetHallCount = typeof opts.targetHallCount === 'number' && opts.targetHallCount > 0 ? Math.floor(opts.targetHallCount) : Infinity;
    const includeSubstation = opts.includeSubstation !== false;
    const includeFence = opts.includeFence !== false;
    const includeAccessRoad = opts.includeAccessRoad !== false;

    const box = _bbox(boundary);
    const stepX = hallWidth + spacing;
    const stepZ = hallDepth + spacing;
    const startX = box.minX + marginM + hallWidth / 2;
    const startZ = box.minZ + marginM + hallDepth / 2;
    const endX = box.maxX - marginM - hallWidth / 2;
    const endZ = box.maxZ - marginM - hallDepth / 2;

    const halls = [];
    const placedCandidates = []; // for overlap checks against already-accepted halls (grid spacing normally prevents this, kept as a safety net)
    let cellsChecked = 0;
    let hallSeq = 1;

    for (let z = startZ; z <= endZ && halls.length < targetHallCount; z += stepZ) {
      for (let x = startX; x <= endX && halls.length < targetHallCount; x += stepX) {
        cellsChecked++;
        if (cellsChecked > MAX_GRID_CELLS) {
          warnings.push('Stopped after checking the maximum number of candidate positions — reduce hall size or increase spacing to search a smaller grid.');
          z = endZ + 1; break;
        }
        const candidate = { position: { x, z }, rotationDeg: 0, footprint: { width: hallWidth, depth: hallDepth } };
        if (!_fitsInsideBoundary(candidate, boundary, CONSTRAINTS)) continue;
        const overlaps = placedCandidates.some(p => CONSTRAINTS.rectanglesOverlap(candidate, p));
        if (overlaps) continue;
        placedCandidates.push(candidate);
        halls.push({
          type: 'building',
          label: 'Data Hall ' + hallSeq++,
          footprint: { shape: 'rectangle', width: hallWidth, depth: hallDepth },
          height: hallHeight,
          rotationDeg: 0,
          position: { x, z },
        });
      }
    }

    if (halls.length === 0) {
      warnings.push('No data hall of this size fits inside the parcel boundary at this spacing/margin — try a smaller hall footprint, less spacing, or a smaller margin.');
    } else if (targetHallCount !== Infinity && halls.length < targetHallCount) {
      warnings.push(`Only ${halls.length} of the requested ${targetHallCount} data halls fit inside the parcel boundary at this spacing.`);
    }

    const substations = [];
    if (includeSubstation && halls.length > 0) {
      const subDefaults = (window.SCENE3D_OBJECTS && window.SCENE3D_OBJECTS.TYPE_DEFAULTS.substation) || { footprint: { width: 20, depth: 20 } };
      const last = halls[halls.length - 1];
      const candidate = {
        position: { x: last.position.x + hallWidth / 2 + spacing + subDefaults.footprint.width / 2, z: last.position.z },
        rotationDeg: 0,
        footprint: { width: subDefaults.footprint.width, depth: subDefaults.footprint.depth },
      };
      if (_fitsInsideBoundary(candidate, boundary, CONSTRAINTS) && !placedCandidates.some(p => CONSTRAINTS.rectanglesOverlap(candidate, p))) {
        substations.push({
          type: 'substation',
          footprint: { shape: 'rectangle', width: subDefaults.footprint.width, depth: subDefaults.footprint.depth },
          rotationDeg: 0,
          position: candidate.position,
        });
      } else {
        warnings.push('No room found for a substation placeholder near the generated data halls — add one manually if needed.');
      }
    }

    const fences = [];
    if (includeFence) {
      if (boundary.length <= 12) {
        for (let i = 0; i < boundary.length; i++) {
          const a = boundary[i];
          const b = boundary[(i + 1) % boundary.length];
          const dx = b.x - a.x, dz = b.z - a.z;
          const length = Math.hypot(dx, dz);
          if (length < 1) continue;
          const angleDeg = Math.atan2(dx, dz) * 180 / Math.PI; // 0 = along +z; matches rotationDeg convention used by rectCorners
          fences.push({
            type: 'fence',
            footprint: { shape: 'rectangle', width: 0.15, depth: length },
            rotationDeg: angleDeg,
            position: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
          });
        }
      } else {
        warnings.push('The parcel boundary has too many vertices for automatic perimeter fencing — add fence segments manually.');
      }
    }

    const roads = [];
    if (includeAccessRoad && boundary.length >= 3) {
      let longestIdx = 0, longestLen = -1;
      for (let i = 0; i < boundary.length; i++) {
        const a = boundary[i], b = boundary[(i + 1) % boundary.length];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        if (len > longestLen) { longestLen = len; longestIdx = i; }
      }
      const a = boundary[longestIdx], b = boundary[(longestIdx + 1) % boundary.length];
      const edgeMid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      const centroid = _centroid(boundary);
      const dirX = centroid.x - edgeMid.x, dirZ = centroid.z - edgeMid.z;
      const dirLen = Math.hypot(dirX, dirZ) || 1;
      const stubLength = Math.min(30, dirLen * 0.5);
      const angleDeg = Math.atan2(dirX, dirZ) * 180 / Math.PI;
      roads.push({
        type: 'road',
        footprint: { shape: 'rectangle', width: 7, depth: stubLength },
        rotationDeg: angleDeg,
        position: { x: edgeMid.x + (dirX / dirLen) * (stubLength / 2), z: edgeMid.z + (dirZ / dirLen) * (stubLength / 2) },
      });
    }

    return {
      halls, substations, fences, roads, warnings,
      disclaimer: 'Conceptual layout only, generated from simple grid placement inside the real parcel boundary. Does not claim engineering feasibility, utility capacity, drainage, geotechnical suitability, or permit compliance — every generated object remains fully editable.',
    };
  }

  return { generate };
})();
