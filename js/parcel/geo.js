/* js/parcel/geo.js
 * window.PARCEL_GEO — geodesic distance and polygon primitives.
 *
 * Extracted as its own module because the proximity engine, the constraint
 * intersection engine, and the assemblage/adjacency work all need the same
 * handful of operations, and three private copies of point-in-polygon is
 * exactly how they end up disagreeing about whether a parcel touches
 * something.
 *
 * WHY NOT CENTROIDS
 * -----------------
 * The obvious way to answer "how far is this parcel from a substation" is to
 * measure from the parcel's centroid. For the parcels this product exists to
 * evaluate, that is wrong in a way that matters: a 600-acre data center site
 * can be a mile across, so a substation sitting on its boundary is "0.5 miles
 * away" by centroid and 0 miles away in reality. Every distance here is
 * therefore measured from the nearest point of the parcel POLYGON, and a
 * feature inside the parcel is distance 0.
 *
 * ACCURACY
 * --------
 * Distances use the haversine formula on a spherical earth (R = 6371.0088 km,
 * the mean radius). At the scale that matters here — a parcel to
 * infrastructure within ~50 miles — the spherical approximation differs from
 * a full ellipsoidal (Vincenty/Karney) solution by well under 0.5%, which is
 * far smaller than the positional error in the public infrastructure datasets
 * being measured against. Reporting "1.8 miles" is honest at that precision;
 * reporting "1.83 miles" would not be, and the formatter rounds accordingly.
 *
 * Depends on: nothing.
 */
window.PARCEL_GEO = (function () {
  'use strict';

  const EARTH_RADIUS_KM = 6371.0088;
  const KM_PER_MILE = 1.609344;
  const SQM_PER_ACRE = 4046.8564224;

  const toRad = (deg) => (deg * Math.PI) / 180;

  /* Great-circle distance in kilometres between two [lon, lat] pairs. */
  function haversineKm(a, b) {
    const [lon1, lat1] = a;
    const [lon2, lat2] = b;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  const kmToMiles = (km) => km / KM_PER_MILE;
  const milesToKm = (mi) => mi * KM_PER_MILE;

  /* Local planar projection around an anchor latitude.
   *
   * Point-to-segment distance has no closed form on a sphere, so segment work
   * is done in a local tangent plane where it does. Scaling longitude by
   * cos(lat) keeps the plane conformal enough that errors stay negligible
   * over the few-kilometre spans these segments cover. The anchor is passed
   * in rather than derived per-point so every point in one calculation shares
   * one projection — mixing projections mid-calculation is how distances stop
   * obeying the triangle inequality. */
  function projector(anchorLatDeg) {
    const kx = Math.cos(toRad(anchorLatDeg)) * (Math.PI / 180) * EARTH_RADIUS_KM;
    const ky = (Math.PI / 180) * EARTH_RADIUS_KM;
    return ([lon, lat]) => [lon * kx, lat * ky];
  }

  /* Shortest distance in km from point p to the segment ab, all in the
     projected plane. */
  function pointToSegmentKm(p, a, b) {
    const [px, py] = p, [ax, ay] = a, [bx, by] = b;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    // A degenerate segment (a duplicated vertex, which real government
    // polygons contain) collapses to point-to-point rather than dividing by
    // zero.
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  /* Every linear ring in a Polygon or MultiPolygon, as arrays of [lon, lat].
     Other geometry types yield nothing rather than throwing — a parcel layer
     occasionally serves a stray Point or a null geometry, and one bad feature
     must not take down a whole viewport's analysis. */
  function ringsOf(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return geometry.coordinates || [];
    if (geometry.type === 'MultiPolygon') {
      const out = [];
      for (const poly of (geometry.coordinates || [])) for (const ring of poly) out.push(ring);
      return out;
    }
    return [];
  }

  /* Ray-casting point-in-polygon, honouring holes: a point inside an odd
     number of rings is inside the polygon, so a point in a donut hole
     correctly reads as outside. */
  function pointInPolygon(point, geometry) {
    const [x, y] = point;
    let inside = false;
    for (const ring of ringsOf(geometry)) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersects = ((yi > y) !== (yj > y)) &&
          (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
        if (intersects) inside = !inside;
      }
    }
    return inside;
  }

  /* Distance in km from a point to a polygon: 0 if inside, otherwise the
     shortest distance to any boundary segment. This is the primitive the
     whole proximity engine rests on. */
  function pointToPolygonKm(point, geometry) {
    if (pointInPolygon(point, geometry)) return 0;

    const anchor = point[1];
    const project = projector(anchor);
    const p = project(point);

    let best = Infinity;
    for (const ring of ringsOf(geometry)) {
      for (let i = 1; i < ring.length; i++) {
        const d = pointToSegmentKm(p, project(ring[i - 1]), project(ring[i]));
        if (d < best) best = d;
      }
    }
    return best === Infinity ? null : best;
  }

  /* Representative interior point. Used only where a single coordinate is
     genuinely required (a map label, a radius query's centre) — never as a
     stand-in for the polygon in a distance calculation.

     This is the average of the outer ring's vertices, which is the CENTROID
     OF THE VERTICES, not the centroid of the area: a ring with densely
     sampled vertices along one edge pulls it toward that edge. That is
     acceptable for its actual uses and is named plainly so nobody mistakes it
     for an area centroid. */
  function vertexCentroid(geometry) {
    const rings = ringsOf(geometry);
    if (!rings.length || !rings[0].length) return null;
    const ring = rings[0];
    let x = 0, y = 0, n = 0;
    // The last vertex of a closed ring repeats the first; counting it twice
    // would bias every centroid slightly toward that vertex.
    const end = (ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]) ? ring.length - 1 : ring.length;
    for (let i = 0; i < end; i++) { x += ring[i][0]; y += ring[i][1]; n++; }
    return n ? [x / n, y / n] : null;
  }

  /* Spherical excess ring area in square metres, via the standard geodesic
     polygon formula. Sign indicates winding, which the caller uses to treat
     interior rings (holes) as negative. */
  function ringAreaSqm(ring) {
    if (!ring || ring.length < 3) return 0;
    let total = 0;
    for (let i = 0; i < ring.length; i++) {
      const [lon1, lat1] = ring[i];
      const [lon2, lat2] = ring[(i + 1) % ring.length];
      total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
    }
    return (total * EARTH_RADIUS_KM * EARTH_RADIUS_KM * 1e6) / 2;
  }

  /* Geodesic area in square metres. Holes subtract: a Polygon's first ring is
     its exterior and the rest are interior. */
  function polygonAreaSqm(geometry) {
    if (!geometry) return 0;
    if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates || [];
      if (!rings.length) return 0;
      let area = Math.abs(ringAreaSqm(rings[0]));
      for (let i = 1; i < rings.length; i++) area -= Math.abs(ringAreaSqm(rings[i]));
      return Math.max(0, area);
    }
    if (geometry.type === 'MultiPolygon') {
      let total = 0;
      for (const poly of (geometry.coordinates || [])) {
        total += polygonAreaSqm({ type: 'Polygon', coordinates: poly });
      }
      return total;
    }
    return 0;
  }

  const sqmToAcres = (sqm) => sqm / SQM_PER_ACRE;

  /* Axis-aligned bounds [minLon, minLat, maxLon, maxLat], used to reject
     obviously-distant candidates before doing real segment math. */
  function bounds(geometry) {
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const ring of ringsOf(geometry)) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
    return Number.isFinite(minLon) ? [minLon, minLat, maxLon, maxLat] : null;
  }

  /* Cheap lower bound on the distance from a point to a bounding box, in km.
     Never overestimates, so using it to skip candidates can never discard the
     true nearest feature. */
  function pointToBoundsKm(point, box) {
    if (!box) return Infinity;
    const [lon, lat] = point;
    const [minLon, minLat, maxLon, maxLat] = box;
    const dLat = lat < minLat ? minLat - lat : (lat > maxLat ? lat - maxLat : 0);
    const dLon = lon < minLon ? minLon - lon : (lon > maxLon ? lon - maxLon : 0);
    if (dLat === 0 && dLon === 0) return 0;
    const kmPerDegLat = (Math.PI / 180) * EARTH_RADIUS_KM;
    const kmPerDegLon = kmPerDegLat * Math.cos(toRad(lat));
    return Math.hypot(dLat * kmPerDegLat, dLon * kmPerDegLon);
  }

  return {
    EARTH_RADIUS_KM, KM_PER_MILE,
    haversineKm, kmToMiles, milesToKm,
    pointInPolygon, pointToPolygonKm, pointToSegmentKm, projector,
    ringsOf, vertexCentroid, polygonAreaSqm, ringAreaSqm, sqmToAcres,
    bounds, pointToBoundsKm,
  };
})();
