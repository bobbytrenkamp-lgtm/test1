/* js/parcel/constraints.js
 * window.PARCEL_CONSTRAINTS — mapped environmental and development
 * constraints intersecting a parcel.
 *
 * Answers, factually: how many acres of this parcel fall inside a FEMA
 * mapped floodplain, a mapped wetland, a protected area — and what share of
 * the parcel that is.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It does not decide whether a parcel is buildable. No single dataset can.
 * FEMA floodplain maps are famously coarse and often decades old; the
 * National Wetlands Inventory is explicitly not a jurisdictional
 * determination and says so in its own metadata; neither substitutes for a
 * survey, a delineation, or a local ordinance. Reporting "18.1% of this
 * parcel is in a mapped floodplain" is a fact. Concluding "this parcel is
 * 81.9% buildable" is not, and this module never does it — it reports
 * intersections and states what remains UNCONSTRAINED BY THESE LAYERS,
 * which is a much narrower claim.
 *
 * Every result carries the source and the dataset's own vintage where the
 * publisher states one, so a user can weigh a 2019 flood map differently
 * from a 2025 one.
 *
 * GEOMETRY
 * --------
 * Real intersection, not sampling: polygon clipping via the vendored
 * polygon-clipping library (MIT), which handles the non-convex, multi-ring,
 * hole-bearing polygons that real floodplain and wetland data consists of.
 * Hand-rolling a clipper for that would be a bug farm — Sutherland-Hodgman,
 * the tempting simple choice, is only correct for CONVEX clip polygons and
 * would silently produce wrong areas on exactly the concave floodplain
 * shapes that matter most.
 *
 * Depends on: window.PARCEL_GEO (required), window.polygonClipping (required).
 */
window.PARCEL_CONSTRAINTS = (function () {
  'use strict';

  const GEO = () => window.PARCEL_GEO;
  const CLIP = () => window.polygonClipping;

  /* Registered constraint layers. Same pluggable-provider shape as the
     proximity engine: a layer says where its polygons come from and what
     they mean, and this engine is generic over all of them. */
  const LAYERS = Object.create(null);

  /* Constraint classes, used for grouping and for the report. These are
     descriptive labels, NOT a severity ranking — a wetland is not "worse"
     than a floodplain, they are different problems with different processes. */
  const CLASSES = ['flood', 'wetland', 'protected', 'water', 'slope', 'other'];

  function registerLayer(config) {
    if (!config || !config.id) throw new Error('registerLayer requires an id');
    if (!CLASSES.includes(config.constraintClass)) {
      throw new Error(`constraint layer '${config.id}' has unknown class '${config.constraintClass}'`);
    }
    if (typeof config.provider !== 'function' && !config.unavailable) {
      throw new Error(`constraint layer '${config.id}' needs a provider function`);
    }
    LAYERS[config.id] = { ...config };
  }

  function registerUnavailable(id, constraintClass, reason) {
    LAYERS[id] = { id, constraintClass, unavailable: true, reason, provider: null };
  }

  function getLayer(id) { return LAYERS[id] || null; }
  function layerIds() { return Object.keys(LAYERS).sort(); }
  function reset() { for (const k of Object.keys(LAYERS)) delete LAYERS[k]; }

  /* GeoJSON geometry -> the nested coordinate array polygon-clipping wants.
     A Polygon is one "multipolygon element"; a MultiPolygon is several. */
  function toClipperGeom(geometry) {
    if (!geometry) return null;
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates;
    return null;
  }

  function fromClipperResult(result) {
    if (!result || !result.length) return null;
    return { type: 'MultiPolygon', coordinates: result };
  }

  /* Area of the intersection of two geometries, in square metres.
     Returns 0 for a genuine non-overlap, and null when the geometry could
     not be processed at all — a distinction the caller must preserve, since
     "no flood risk mapped here" and "we could not check" are very different
     statements to put in front of someone buying land. */
  function intersectionAreaSqm(parcelGeometry, constraintGeometry) {
    const a = toClipperGeom(parcelGeometry);
    const b = toClipperGeom(constraintGeometry);
    if (!a || !b) return null;

    try {
      const clipped = CLIP().intersection(a, b);
      const geom = fromClipperResult(clipped);
      if (!geom) return 0;
      return GEO().polygonAreaSqm(geom);
    } catch {
      // polygon-clipping throws on certain self-intersecting inputs. Real
      // government polygons do contain those, and one bad constraint polygon
      // must not take down the whole analysis.
      return null;
    }
  }

  /* Union of many constraint geometries, so overlapping polygons within one
     layer are not double counted. FEMA zones routinely overlap (an AE zone
     inside a floodway); summing them separately would report more
     constrained acreage than the parcel contains — occasionally over 100%,
     which is the tell that a system is summing overlaps. */
  function unionAll(geometries) {
    const parts = geometries.map(toClipperGeom).filter(Boolean);
    if (!parts.length) return null;
    try {
      const merged = CLIP().union(parts[0], ...parts.slice(1));
      return fromClipperResult(merged);
    } catch {
      return null;
    }
  }

  /* Analyzes one layer's features against one parcel. Pure given its
     features; all I/O lives in the layer's provider. */
  function analyzeLayer(parcelGeometry, layer, features) {
    const geo = GEO();
    const parcelSqm = geo.polygonAreaSqm(parcelGeometry);

    const result = {
      layerId: layer.id,
      label: layer.label || layer.id,
      constraintClass: layer.constraintClass,
      source: layer.source || null,
      sourceUpdatedAt: layer.sourceUpdatedAt || null,
      caveat: layer.caveat || null,
      intersects: false,
      areaSqm: 0,
      areaAcres: 0,
      pctOfParcel: 0,
      featureCount: (features || []).length,
      geometry: null,
      // Set when we genuinely could not evaluate, so the UI can say "not
      // checked" rather than implying a clean result.
      unevaluated: false,
    };

    if (!parcelGeometry || !parcelSqm) {
      result.unevaluated = true;
      result.why = 'parcel has no usable polygon geometry';
      return result;
    }
    if (!features || !features.length) return result;   // genuinely zero, not unknown

    const overlapping = [];
    for (const f of features) {
      const g = f && f.geometry;
      if (!g) continue;
      // Cheap bbox rejection before real clipping.
      const fb = geo.bounds(g);
      const pb = geo.bounds(parcelGeometry);
      if (fb && pb && (fb[0] > pb[2] || fb[2] < pb[0] || fb[1] > pb[3] || fb[3] < pb[1])) continue;
      overlapping.push(g);
    }
    if (!overlapping.length) return result;

    // Union first, then intersect once. Order matters: intersecting each
    // polygon separately and summing would double count overlaps.
    const merged = overlapping.length === 1 ? overlapping[0] : unionAll(overlapping);
    if (!merged) {
      result.unevaluated = true;
      result.why = 'constraint geometry could not be processed';
      return result;
    }

    const sqm = intersectionAreaSqm(parcelGeometry, merged);
    if (sqm == null) {
      result.unevaluated = true;
      result.why = 'intersection could not be computed for this geometry';
      return result;
    }

    result.intersects = sqm > 0;
    result.areaSqm = sqm;
    result.areaAcres = Math.round(geo.sqmToAcres(sqm) * 100) / 100;
    // Clamped: floating-point clipping can produce a hair over 100% on a
    // parcel entirely inside a constraint, and "103% of the parcel is in a
    // floodplain" destroys trust in every other number on the panel.
    result.pctOfParcel = Math.min(100, Math.round((sqm / parcelSqm) * 1000) / 10);

    if (result.intersects) {
      const clipped = CLIP().intersection(toClipperGeom(parcelGeometry), toClipperGeom(merged));
      result.geometry = fromClipperResult(clipped);
    }

    return result;
  }

  /* Runs every registered layer. Per-layer failure isolation: a dead FEMA
     service must not blank the wetlands result. */
  async function analyze(parcelGeometry, opts) {
    const o = opts || {};
    const signal = o.signal || null;
    const ids = o.layers || layerIds();
    const geo = GEO();

    const parcelSqm = geo.polygonAreaSqm(parcelGeometry);
    const results = [];
    const unavailable = [];

    for (const id of ids) {
      const layer = LAYERS[id];
      if (!layer) continue;
      if (layer.unavailable) {
        unavailable.push({ layerId: id, constraintClass: layer.constraintClass, reason: layer.reason });
        continue;
      }
      if (signal && signal.aborted) break;

      const cacheKey = o.cacheKey ? `${o.cacheKey}::${id}` : null;
      if (cacheKey && _cache.has(cacheKey)) { results.push(_cache.get(cacheKey)); continue; }

      try {
        const features = await layer.provider({ parcelGeometry, signal, ...o });
        const r = analyzeLayer(parcelGeometry, layer, features);
        if (cacheKey) _cache.set(cacheKey, r);
        results.push(r);
      } catch (err) {
        results.push({
          layerId: id,
          label: layer.label || id,
          constraintClass: layer.constraintClass,
          error: (err && err.message) ? err.message : String(err),
          unevaluated: true,
          intersects: false,
          areaAcres: 0,
          pctOfParcel: 0,
        });
      }
    }

    _trim();

    return {
      parcelAcres: Math.round(geo.sqmToAcres(parcelSqm) * 100) / 100,
      results,
      unavailable,
      summary: summarize(parcelSqm, results),
      aborted: !!(signal && signal.aborted),
    };
  }

  /* Combined footprint across layers.
   *
   * Unions the per-layer intersection geometries rather than summing their
   * acreages: a parcel corner that is both wetland AND floodplain — extremely
   * common, since wetlands sit in floodplains — would otherwise be counted
   * twice and could push "constrained acreage" past the parcel's own size. */
  function summarize(parcelSqm, results) {
    const geo = GEO();
    const evaluated = results.filter(r => !r.unevaluated && !r.error);
    const unevaluated = results.filter(r => r.unevaluated || r.error);
    const geometries = evaluated.map(r => r.geometry).filter(Boolean);

    let constrainedSqm = 0;
    if (geometries.length === 1) {
      constrainedSqm = geo.polygonAreaSqm(geometries[0]);
    } else if (geometries.length > 1) {
      const merged = unionAll(geometries);
      constrainedSqm = merged ? geo.polygonAreaSqm(merged) : 0;
    }
    constrainedSqm = Math.min(constrainedSqm, parcelSqm);

    return {
      constrainedAcres: Math.round(geo.sqmToAcres(constrainedSqm) * 100) / 100,
      constrainedPct: parcelSqm ? Math.min(100, Math.round((constrainedSqm / parcelSqm) * 1000) / 10) : 0,

      /* Named at length on purpose. This is NOT "buildable acreage" and must
         never be relabelled as such: it is simply the area left over after
         subtracting the layers we happened to check, on maps of varying age
         and precision, before any survey, delineation, setback, easement, or
         local ordinance has been considered. */
      unconstrainedByCheckedLayersAcres:
        Math.round(geo.sqmToAcres(Math.max(0, parcelSqm - constrainedSqm)) * 100) / 100,

      layersEvaluated: evaluated.length,
      layersUnevaluated: unevaluated.length,
      // Present whenever anything failed, so a partial picture is never
      // presented as a complete one.
      partial: unevaluated.length > 0,
      disclaimer:
        'Mapped constraints only, from public datasets of varying age and precision. ' +
        'Not a survey, wetland delineation, or jurisdictional determination. ' +
        'Additional due diligence is required before relying on these figures.',
    };
  }

  /* Cache. Constraint intersection is the most expensive thing this system
     does per parcel, and a user toggling panels or reopening the same parcel
     should not pay for it twice. Keyed by caller-supplied parcel identity. */
  const _cache = new Map();
  const MAX_CACHE = 300;

  function clearCache() { _cache.clear(); }
  function cacheSize() { return _cache.size; }

  // Bound the cache after each insert-heavy analyze() call.
  function _trim() {
    while (_cache.size > MAX_CACHE) _cache.delete(_cache.keys().next().value);
  }

  return {
    registerLayer, registerUnavailable, getLayer, layerIds, reset,
    analyze, analyzeLayer, summarize,
    intersectionAreaSqm, unionAll,
    clearCache, cacheSize, _trim,
    CLASSES,
  };
})();
