/* js/parcel/proximity.js
 * window.PARCEL_PROXIMITY — infrastructure proximity for a parcel or site.
 *
 * Answers, for a selected parcel: how far to the nearest substation,
 * transmission line, interstate, existing data center — and how many of each
 * are within 1, 3, 5, and 10 miles.
 *
 * WHAT THIS DOES NOT CLAIM
 * ------------------------
 * Proximity is not capacity, and this module never implies otherwise. Being
 * 0.4 miles from a transmission line says nothing about whether that line has
 * headroom, whether the utility will serve the site, or what an interconnect
 * would cost or take. Those are answered by a utility study, not a distance
 * calculation. Every result carries a `measures` string stating what was
 * measured so the panel can present the fact without the inference.
 *
 * Fiber is deliberately absent. There is no free, reliable, nationwide public
 * dataset of actual fiber routes; the FCC's broadband availability data
 * describes marketed residential service, not lit fiber a data center could
 * take service from. Rather than dress that up, the layer registry records
 * fiber as unavailable with the reason, and the UI is expected to say so.
 *
 * DISTANCES ARE POLYGON-BASED. A 600-acre site can be a mile across, so
 * centroid distance would report a substation on the parcel's own boundary as
 * half a mile away. See js/parcel/geo.js.
 *
 * Depends on: window.PARCEL_GEO (required), window.PARCEL_PROVENANCE (optional,
 * for derivation metadata).
 */
window.PARCEL_PROXIMITY = (function () {
  'use strict';

  const GEO = () => window.PARCEL_GEO;

  const DEFAULT_RADII_MILES = [1, 3, 5, 10];

  /* How far out to look before giving up. Beyond ~50 miles a distance stops
     being decision-relevant for site selection and starts being trivia, and
     the honest answer is "none nearby" rather than a 180-mile figure
     presented with the same weight as a 2-mile one. */
  const MAX_SEARCH_MILES = 50;

  /* Layer registry. A layer describes WHERE features come from and what a
     distance to them means; the engine below is generic over all of them.
     `provider` is a function returning features, so a layer can be backed by
     repository data (the data center index), a runtime fetch, or a test stub
     without the engine knowing the difference. */
  const LAYERS = Object.create(null);

  /* Categories the panel groups by. Ordered as the panel renders them. */
  const CATEGORIES = ['power', 'transportation', 'market', 'water', 'telecom'];

  function registerLayer(config) {
    if (!config || !config.id) throw new Error('registerLayer requires an id');
    if (!CATEGORIES.includes(config.category)) {
      throw new Error(`layer '${config.id}' has unknown category '${config.category}'`);
    }
    if (typeof config.provider !== 'function' && !config.unavailable) {
      throw new Error(`layer '${config.id}' needs a provider function (or unavailable: true)`);
    }
    LAYERS[config.id] = {
      radii: DEFAULT_RADII_MILES,
      geometry: 'point',
      ...config,
    };
  }

  function getLayer(id) { return LAYERS[id] || null; }
  function layerIds() { return Object.keys(LAYERS).sort(); }
  function layersByCategory(category) {
    return Object.values(LAYERS).filter(l => l.category === category);
  }

  /* Records a layer we deliberately do NOT provide, with the reason. This is
     a first-class concept rather than an omission: "we don't show fiber" is
     information the user needs, and silently having no fiber row invites the
     assumption that none is nearby. */
  function registerUnavailable(id, category, reason) {
    LAYERS[id] = { id, category, unavailable: true, reason, provider: null };
  }

  /* Distance from a parcel polygon to one feature, in km.
     Handles point and line features; a line's distance is the
     minimum over its vertices and segments, so a transmission line passing
     beside a parcel measures to the nearest point on the line rather than to
     an arbitrary endpoint. */
  function featureDistanceKm(parcelGeometry, feature) {
    const geo = GEO();
    const g = feature && feature.geometry;
    if (!g) return null;

    if (g.type === 'Point') {
      return geo.pointToPolygonKm(g.coordinates, parcelGeometry);
    }

    if (g.type === 'LineString' || g.type === 'MultiLineString') {
      const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
      let best = Infinity;
      for (const line of lines) {
        for (const coord of line) {
          const d = geo.pointToPolygonKm(coord, parcelGeometry);
          if (d != null && d < best) best = d;
          if (best === 0) return 0;
        }
      }
      return best === Infinity ? null : best;
    }

    if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
      // Polygon-to-polygon: measure from the other polygon's vertices, which
      // is exact when they are disjoint and correctly yields 0 when they
      // overlap at a vertex. Good enough for proximity reporting; the
      // constraint engine does real intersection separately.
      let best = Infinity;
      for (const ring of geo.ringsOf(g)) {
        for (const coord of ring) {
          const d = geo.pointToPolygonKm(coord, parcelGeometry);
          if (d != null && d < best) best = d;
          if (best === 0) return 0;
        }
      }
      return best === Infinity ? null : best;
    }

    return null;
  }

  /* Analyzes one layer against one parcel. Pure given its features — all I/O
     happens in the layer's provider. */
  function analyzeLayer(parcelGeometry, layer, features) {
    const geo = GEO();
    const radii = layer.radii || DEFAULT_RADII_MILES;
    const result = {
      layerId: layer.id,
      label: layer.label || layer.id,
      category: layer.category,
      measures: layer.measures || null,
      nearest: null,
      counts: {},
      featureCount: (features || []).length,
      source: layer.source || null,
      sourceUpdatedAt: layer.sourceUpdatedAt || null,
    };
    for (const r of radii) result.counts[r] = 0;

    if (!parcelGeometry || !features || !features.length) return result;

    const parcelBounds = geo.bounds(parcelGeometry);
    const maxKm = geo.milesToKm(MAX_SEARCH_MILES);

    let nearestKm = Infinity;
    let nearestFeature = null;
    /* Counted rather than merely skipped. The pre-filter below discards
       far-away features for speed, but "we discarded 40 substations as too
       far" and "this layer had no features at all" are different facts, and
       collapsing them would make an empty layer indistinguishable from a
       remote one. */
    let beyondRadius = 0;

    for (const f of features) {
      // Cheap rejection first. pointToBoundsKm never overestimates, so
      // skipping on it can never discard the true nearest feature.
      const anchor = (f.geometry && f.geometry.type === 'Point') ? f.geometry.coordinates : null;
      if (anchor && parcelBounds && geo.pointToBoundsKm(anchor, parcelBounds) > maxKm) {
        beyondRadius++;
        continue;
      }

      const km = featureDistanceKm(parcelGeometry, f);
      if (km == null) continue;

      if (km > maxKm) { beyondRadius++; continue; }

      if (km < nearestKm) { nearestKm = km; nearestFeature = f; }

      for (const r of radii) {
        if (km <= geo.milesToKm(r)) result.counts[r]++;
      }
    }

    if (nearestFeature) {
      result.nearest = {
        distanceMiles: Math.round(geo.kmToMiles(nearestKm) * 10) / 10,
        distanceKm: Math.round(nearestKm * 100) / 100,
        // Zero is a real, meaningful answer here — the feature is ON the
        // parcel — and must never be rendered as "unknown".
        onParcel: nearestKm === 0,
        name: (nearestFeature.properties || {}).name || null,
        properties: nearestFeature.properties || {},
      };
    }

    if (beyondRadius) {
      // Reported explicitly rather than left as a bare null, which reads as
      // "we didn't look" instead of "nothing is close enough to matter".
      result.beyondSearchRadius = true;
      result.beyondSearchRadiusCount = beyondRadius;
      result.searchRadiusMiles = MAX_SEARCH_MILES;
    }

    return result;
  }

  /* Full analysis across every registered layer.
   *
   * Each layer's provider is awaited independently and failures are isolated:
   * a dead substation service must not blank the data-center proximity row
   * that came from repository data and cannot fail. */
  async function analyze(parcelGeometry, opts) {
    const o = opts || {};
    const signal = o.signal || null;
    const ids = o.layers || layerIds();

    const results = [];
    const unavailable = [];

    for (const id of ids) {
      const layer = LAYERS[id];
      if (!layer) continue;

      if (layer.unavailable) {
        unavailable.push({ layerId: id, category: layer.category, reason: layer.reason });
        continue;
      }
      if (signal && signal.aborted) break;

      try {
        const features = await layer.provider({ parcelGeometry, signal, ...o });
        results.push(analyzeLayer(parcelGeometry, layer, features));
      } catch (err) {
        results.push({
          layerId: id,
          label: layer.label || id,
          category: layer.category,
          error: (err && err.message) ? err.message : String(err),
          nearest: null,
          counts: {},
        });
      }
    }

    return {
      results,
      unavailable,
      byCategory: CATEGORIES.reduce((acc, c) => {
        acc[c] = results.filter(r => r.category === c);
        return acc;
      }, {}),
      aborted: !!(signal && signal.aborted),
    };
  }

  /* Formats a distance for display. Rounds to one decimal because the
     underlying public datasets do not justify more precision, and prints
     "on site" for zero rather than "0.0 mi", which reads like a rounding
     artifact rather than the meaningful fact it is. */
  function formatDistance(miles) {
    if (miles == null) return null;
    if (miles === 0) return 'on site';
    if (miles < 0.1) return '<0.1 mi';
    return `${miles.toFixed(1)} mi`;
  }

  function reset() {
    for (const k of Object.keys(LAYERS)) delete LAYERS[k];
  }

  return {
    registerLayer, registerUnavailable, getLayer, layerIds, layersByCategory,
    analyze, analyzeLayer, featureDistanceKm, formatDistance, reset,
    CATEGORIES, DEFAULT_RADII_MILES, MAX_SEARCH_MILES,
  };
})();
