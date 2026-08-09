/* js/map-point-clustering.js
 * window.MAP_POINT_CLUSTERING — zoom-aware grid clustering for large point
 * layers (currently: the 53,826-record substation layer, the single largest
 * point dataset the map renders).
 *
 * WHY THIS EXISTS
 * At low/mid zoom, rendering one Leaflet marker per point for tens of
 * thousands of points is both a real render cost (even with preferCanvas)
 * and visually meaningless -- at national zoom, adjacent substations are
 * indistinguishable pixels stacked on top of each other anyway. This groups
 * points into a lat/lon grid whose cell size shrinks as zoom increases, so
 * a handful of clusters render at national zoom and individual points
 * render once a user has zoomed in enough to actually see them apart.
 *
 * This is a plain grid clustering, not a hierarchical/tree-based one
 * (no vendored clustering library -- see the header of js/map.js's power
 * layer wiring for why: this sandbox cannot fetch a CDN library to vendor
 * it). A grid is the right tradeoff here: O(n) to bucket, no
 * precomputation/index structure to maintain as data changes, and good
 * enough clustering quality for a screening map, not a scientific one.
 *
 * Depends on: nothing (pure functions only).
 */
window.MAP_POINT_CLUSTERING = (function () {
  'use strict';

  /* Degrees-per-grid-cell at a given zoom level. Halves (roughly) per zoom
   * level so cells shrink as the user zooms in, converging toward
   * individual points. Bottoms out at a small non-zero size so clustering
   * never fully disables at extreme zoom -- two points on literally the
   * same coordinate should still merge into one marker. */
  function cellSizeForZoom(zoom) {
    const z = Number.isFinite(zoom) ? zoom : 4;
    return Math.max(0.0008, 20 / Math.pow(2, z));
  }

  /* Pure: buckets points into grid cells and returns one cluster record per
   * non-empty cell.
   *
   *   points: [{ lat, lon, ...rest }]
   *   opts.zoom: current map zoom (drives cell size)
   *   opts.bounds: optional [minLon, minLat, maxLon, maxLat] -- when given,
   *     points outside it are skipped entirely (viewport-bounded rendering,
   *     not just clustering) rather than clustered and then discarded, so
   *     a huge dataset panned far away costs nothing.
   *   opts.singleThreshold: cluster count at/below which a cell is NOT
   *     treated as a cluster -- its point(s) are returned individually so a
   *     lone substation still renders as itself, not a "cluster of 1".
   *
   * Returns: { clusters: [{ lat, lon, count, items }], singles: [point] }
   * -- singles are cells with <= singleThreshold points, returned as their
   * real individual points (not wrapped), clusters are cells above it,
   * centered on the mean position of their members (a real position
   * derived from real points, not an arbitrary cell corner). */
  function clusterPoints(points, opts) {
    const o = opts || {};
    const zoom = o.zoom;
    const bounds = o.bounds || null;
    const singleThreshold = o.singleThreshold != null ? o.singleThreshold : 1;
    const cellSize = cellSizeForZoom(zoom);

    const cells = new Map();
    for (const p of (points || [])) {
      if (p == null || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      if (bounds) {
        const [minLon, minLat, maxLon, maxLat] = bounds;
        if (p.lon < minLon || p.lon > maxLon || p.lat < minLat || p.lat > maxLat) continue;
      }
      const cellX = Math.floor(p.lon / cellSize);
      const cellY = Math.floor(p.lat / cellSize);
      const key = `${cellX}:${cellY}`;
      let cell = cells.get(key);
      if (!cell) { cell = []; cells.set(key, cell); }
      cell.push(p);
    }

    const clusters = [];
    const singles = [];
    for (const members of cells.values()) {
      if (members.length <= singleThreshold) {
        singles.push(...members);
        continue;
      }
      let sumLat = 0, sumLon = 0;
      for (const m of members) { sumLat += m.lat; sumLon += m.lon; }
      clusters.push({
        lat: sumLat / members.length,
        lon: sumLon / members.length,
        count: members.length,
        items: members,
      });
    }

    return { clusters, singles };
  }

  /* Pure: a visual radius for a cluster marker, scaled (not linear -- a
   * cluster of 5,000 should not be 5,000x the radius of a cluster of 1) so
   * very large and very small clusters both stay legible on screen. */
  function clusterRadius(count) {
    if (count <= 1) return 5;
    return Math.min(28, 8 + Math.log2(count) * 3);
  }

  return { clusterPoints, cellSizeForZoom, clusterRadius };
})();
