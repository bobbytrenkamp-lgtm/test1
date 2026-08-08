/* js/parcel/envelope.js
 * window.PARCEL_ENVELOPE — conceptual buildable envelope.
 *
 * Upgrades the feasibility system from pure area arithmetic (acreage x lot
 * coverage) to an actual geometric subtraction:
 *
 *     parcel polygon
 *       MINUS mapped constraint polygons     (exact, by polygon clipping)
 *       MINUS zoning setbacks                (area estimate, see below)
 *       = conceptual buildable envelope
 *
 * THIS IS A PLANNING ESTIMATE, NOT ENGINEERING
 * --------------------------------------------
 * Every result carries `conceptual: true` and a disclaimer, because the
 * distance between this and a real answer is large and easy to forget:
 *
 *   - Setbacks are applied from base zoning only. Overlay districts,
 *     proffers, approved development conditions, and variances all change
 *     them, and none are in this data.
 *   - Constraint layers are mapped products of varying age. Absence of a
 *     mapped wetland is not absence of a wetland.
 *   - Easements, access requirements, stormwater management, parking, and
 *     grading are not modelled at all, and on a real site they routinely
 *     consume more land than the setbacks do.
 *
 * So the output is named `conceptualUsableAcres`, never "buildable acreage".
 * A number called buildable acreage will be treated as one.
 *
 * EXACT WHERE POSSIBLE, ESTIMATED WHERE NOT — AND LABELLED EITHER WAY
 * ------------------------------------------------------------------
 * Constraint subtraction is exact: polygon-clipping computes a real
 * difference polygon, and the module returns it so the map can draw it.
 *
 * The setback step is an AREA estimate, not a polygon. True polygon
 * offsetting (mitred/rounded inward buffering with self-intersection
 * cleanup) is a substantial algorithm, and a naive version silently produces
 * wrong shapes on the concave, notched parcels that are common in practice.
 * Rather than ship a plausible-looking wrong polygon, this uses the inner
 * parallel body area from the Steiner formula:
 *
 *     A_eroded ~= A - P*s + pi*s^2
 *
 * where A is area, P is perimeter, and s is the setback distance. This is
 * EXACT for a convex polygon with rounded corners and a good approximation
 * otherwise, degrading gracefully (it under-estimates on concave shapes,
 * which is the safe direction for a screening tool). The result explicitly
 * reports which steps produced geometry and which produced only an area, so
 * nothing downstream can mistake one for the other.
 *
 * Depends on: window.PARCEL_GEO, window.polygonClipping (both required).
 */
window.PARCEL_ENVELOPE = (function () {
  'use strict';

  const GEO = () => window.PARCEL_GEO;
  const CLIP = () => window.polygonClipping;

  const SQFT_PER_SQM = 10.763910416709722;
  const FT_PER_M = 3.280839895013123;

  function toClipperGeom(geometry) {
    if (!geometry) return null;
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates;
    return null;
  }
  function fromClipper(result) {
    return (result && result.length) ? { type: 'MultiPolygon', coordinates: result } : null;
  }

  /* Exact geometric difference: parcel minus the union of constraint
     geometries. Returns null when the constraints cover the parcel entirely
     (a real result meaning "nothing left"), and undefined-ish behaviour is
     avoided by the caller checking `subtractionFailed`. */
  function subtractConstraints(parcelGeometry, constraintGeometries) {
    const parcel = toClipperGeom(parcelGeometry);
    if (!parcel) return { geometry: null, failed: true, why: 'parcel has no usable polygon geometry' };

    const parts = (constraintGeometries || []).map(toClipperGeom).filter(Boolean);
    if (!parts.length) return { geometry: parcelGeometry, failed: false };

    try {
      const diff = CLIP().difference(parcel, ...parts);
      return { geometry: fromClipper(diff), failed: false };
    } catch {
      // Real government polygons include self-intersections that make the
      // clipper throw. Reported rather than swallowed: silently falling back
      // to the un-subtracted parcel would overstate usable land, which is the
      // dangerous direction.
      return { geometry: null, failed: true, why: 'constraint geometry could not be subtracted' };
    }
  }

  /* Inner parallel body area (Steiner). See the header for why this is an
     area rather than a polygon.

     Clamped at zero: on a long thin parcel a large setback genuinely
     consumes the whole site, and the formula can go negative there. Zero is
     the correct answer, and it is a meaningful one — "this setback leaves
     nothing" is exactly what a screening tool should surface. */
  function erodedAreaSqm(geometry, setbackMeters) {
    const geo = GEO();
    const area = geo.polygonAreaSqm(geometry);
    if (!area) return 0;
    if (!setbackMeters || setbackMeters <= 0) return area;

    const perimeter = geo.perimeterMeters(geometry);
    if (!perimeter) return 0;

    /* The formula is only valid while the inner parallel body is non-empty.
       Past that point the +pi*s^2 term grows faster than the -P*s term and
       the expression turns back UPWARD, so a setback wide enough to consume
       the whole site would otherwise be reported as consuming none of it —
       the most dangerous possible direction for this number.

       P/(2*pi) is the radius of the disk with this perimeter, i.e. the
       largest erosion any shape of this perimeter can absorb. At or beyond
       it, nothing is left. */
    const maxUsefulErosion = perimeter / (2 * Math.PI);
    if (setbackMeters >= maxUsefulErosion) return 0;

    const eroded = area - (perimeter * setbackMeters) + (Math.PI * setbackMeters * setbackMeters);
    // Never report more land after applying a setback than before it.
    return Math.max(0, Math.min(area, eroded));
  }

  /* The single setback distance used for the erosion.
   *
   * Zoning states front/side/rear separately, but the parallel-body formula
   * takes one distance. The MINIMUM is used deliberately: it is the least
   * aggressive assumption, so the estimate errs toward reporting more usable
   * land rather than less. That direction is chosen so this tool never
   * screens OUT a site that deserved a closer look — the opposite error
   * (screening in a site that fails on a closer look) is caught by the due
   * diligence this module repeatedly says is required. The choice is
   * reported in the output so it can be argued with. */
  function effectiveSetbackFt(setbacks) {
    const values = ['front', 'side', 'rear']
      .map(k => setbacks && setbacks[k])
      .filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    if (!values.length) return null;
    return Math.min(...values);
  }

  /* Builds the envelope.
   *
   *   parcelGeometry      GeoJSON Polygon/MultiPolygon
   *   constraintGeometries array of constraint geometries already intersected
   *                        with the parcel (from PARCEL_CONSTRAINTS)
   *   standards           zoning standards (setbacks, lot coverage, height)
   */
  function build(parcelGeometry, constraintGeometries, standards, opts) {
    const geo = GEO();
    const o = opts || {};
    const s = standards || {};

    const grossSqm = geo.polygonAreaSqm(parcelGeometry);
    const result = {
      conceptual: true,
      steps: [],
      grossAcres: round2(geo.sqmToAcres(grossSqm)),
      constrainedAcres: 0,
      afterConstraintsAcres: round2(geo.sqmToAcres(grossSqm)),
      setbackFt: null,
      conceptualUsableAcres: null,
      conceptualMaxFootprintSqft: null,
      possibleSiteCoveragePct: null,
      geometry: null,
      partial: false,
      disclaimer:
        'Conceptual planning estimate. Base zoning setbacks and mapped constraints only — ' +
        'overlay districts, proffers, approved conditions, easements, access, stormwater, ' +
        'parking, and grading are not modelled, and on a real site those routinely consume ' +
        'more land than setbacks do. Not a survey and not buildable acreage. Confirm ' +
        'everything with the jurisdiction and a site engineer.',
    };

    if (!grossSqm) {
      result.partial = true;
      result.why = 'parcel has no usable polygon geometry';
      return result;
    }

    // ── Step 1: subtract mapped constraints (exact) ──────────────────────
    const sub = subtractConstraints(parcelGeometry, constraintGeometries);
    let workingGeometry = parcelGeometry;

    if (sub.failed) {
      result.partial = true;
      result.why = sub.why;
      result.steps.push({ step: 'constraints', method: 'exact-polygon-difference', applied: false, why: sub.why });
    } else if (!constraintGeometries || !constraintGeometries.length) {
      result.steps.push({ step: 'constraints', method: 'exact-polygon-difference', applied: true, note: 'no constraint geometry supplied' });
    } else {
      workingGeometry = sub.geometry;
      const remainingSqm = workingGeometry ? geo.polygonAreaSqm(workingGeometry) : 0;
      result.constrainedAcres = round2(geo.sqmToAcres(Math.max(0, grossSqm - remainingSqm)));
      result.afterConstraintsAcres = round2(geo.sqmToAcres(remainingSqm));
      result.geometry = workingGeometry;
      result.steps.push({ step: 'constraints', method: 'exact-polygon-difference', applied: true, producesGeometry: true });
    }

    const afterConstraintsSqm = workingGeometry ? geo.polygonAreaSqm(workingGeometry) : 0;

    // ── Step 2: subtract setbacks (area estimate) ────────────────────────
    const setbackFt = effectiveSetbackFt(s.setbacks || {
      front: s.minimum_front_setback?.value,
      side: s.minimum_side_setback?.value,
      rear: s.minimum_rear_setback?.value,
    });

    let usableSqm = afterConstraintsSqm;
    if (setbackFt != null) {
      result.setbackFt = setbackFt;
      usableSqm = erodedAreaSqm(workingGeometry, setbackFt / FT_PER_M);
      result.steps.push({
        step: 'setbacks',
        method: 'steiner-inner-parallel-body-area',
        applied: true,
        producesGeometry: false,
        setbackFt,
        setbackBasis: 'minimum of front/side/rear — the least aggressive assumption',
        note: 'Area estimate only; no setback polygon is produced. Exact for convex parcels, ' +
              'under-estimates usable area on concave ones.',
      });
    } else {
      result.steps.push({
        step: 'setbacks', method: 'steiner-inner-parallel-body-area', applied: false,
        why: 'no setback standards available for this district',
      });
      // Not applying a setback is itself a limitation on the estimate, not a
      // finding that none applies.
      result.partial = true;
    }

    result.conceptualUsableAcres = round2(geo.sqmToAcres(usableSqm));

    /* Everything downstream is derived from the ROUNDED usable acreage, not
       the raw square metres. A panel showing "118.53 usable acres" beside a
       footprint that works out to 118.54 acres invites exactly the question
       we cannot answer well, and internal consistency is worth more here than
       the fraction of an acre lost to rounding. */
    usableSqm = (result.conceptualUsableAcres * 4046.8564224);

    // ── Step 3: coverage-limited footprint ───────────────────────────────
    const coveragePct = s.maximum_lot_coverage?.value ?? s.lotCoveragePct ?? null;
    if (coveragePct != null && Number.isFinite(coveragePct)) {
      // Coverage is a ratio of the LOT, but it cannot place a building where
      // there is no usable land, so the binding limit is the smaller of the
      // two. Applying coverage to gross acreage alone is how a site half
      // covered by floodplain gets a footprint that could not physically fit.
      const coverageLimitedSqm = grossSqm * (coveragePct / 100);
      const footprintSqm = Math.min(coverageLimitedSqm, usableSqm);
      result.conceptualMaxFootprintSqft = Math.round(footprintSqm * SQFT_PER_SQM);
      result.possibleSiteCoveragePct = grossSqm
        ? Math.round((footprintSqm / grossSqm) * 1000) / 10 : null;
      result.footprintLimitedBy = coverageLimitedSqm <= usableSqm ? 'zoning-lot-coverage' : 'usable-land';
    }

    return result;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  return { build, subtractConstraints, erodedAreaSqm, effectiveSetbackFt };
})();
