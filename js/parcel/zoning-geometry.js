/* js/parcel/zoning-geometry.js
 * window.ZONING_GEOMETRY — parcel-to-zoning-district spatial join.
 *
 * WHY THIS EXISTS
 * ----------------
 * None of the three NoVA parcel services (Loudoun, Prince William, Fairfax)
 * publish a native zoning_code attribute on their parcel records. Real,
 * live zoning district polygon geometry exists for all three counties
 * (data/zoning/geometry/{jurisdiction}.geojson, normalized with a
 * zoning_code property per feature) but nothing connected a clicked
 * parcel's boundary to that geometry -- so PARCEL_FEASIBILITY.assess()
 * could never produce a real DC-eligibility score for any parcel in any
 * of the three counties, regardless of how much zoning-geometry work had
 * been done on the data side. This module is that connection.
 *
 * METHOD
 * ------
 * Point-in-polygon against the parcel's vertex centroid (PARCEL_GEO
 * already documents why this is the right representative point for this
 * use -- a single interior point is genuinely required here, unlike a
 * distance calculation, because "which district contains this parcel" is
 * inherently a point-membership question). Districts are non-overlapping
 * by construction (real government zoning maps), so first match wins.
 *
 * HONESTY CONTRACT
 * -----------------
 * Returns null -- never a guess -- when: the jurisdiction has no zoning
 * geometry, the geometry hasn't been fetched into cache yet, the parcel
 * has no polygon, or no district polygon actually contains the parcel's
 * point (e.g. a data gap at the county boundary). Callers must treat null
 * as "unknown," not as "no zoning."
 *
 * Depends on: PARCEL_GEO (pointInPolygon, vertexCentroid).
 */
window.ZONING_GEOMETRY = (function () {
  'use strict';

  /* County FIPS -> jurisdiction_id, mirroring js/zoning.js's own map.
   * Kept as a separate copy (not read from window.ZONING) so this module
   * has no load-order dependency on zoning.js -- both must agree with the
   * real data on disk, and the frontend-coverage regression test
   * (tests/test_zoning_frontend_coverage.mjs) already guards zoning.js's
   * copy against drift from what's actually on disk. */
  const FIPS_TO_JURISDICTION = {
    '51107': 'va-loudoun-county',
    '51153': 'va-prince-william-county',
    '51059': 'va-fairfax-county',
  };

  /* jurisdictionId -> cached GeoJSON FeatureCollection */
  const _cache = {};
  /* jurisdictionId -> in-flight fetch Promise, so two parcels clicked in the
     same county before the first fetch resolves share one request. */
  const _loading = new Map();

  function hasCoverage(fips) {
    return Object.prototype.hasOwnProperty.call(FIPS_TO_JURISDICTION, fips);
  }

  function isCached(fips) {
    const jid = FIPS_TO_JURISDICTION[fips];
    return !!(jid && _cache[jid]);
  }

  function getCachedByFips(fips) {
    const jid = FIPS_TO_JURISDICTION[fips];
    return jid ? (_cache[jid] || null) : null;
  }

  async function loadByFips(fips) {
    const jid = FIPS_TO_JURISDICTION[fips];
    if (!jid) return null;
    if (_cache[jid]) return _cache[jid];
    if (_loading.has(jid)) return _loading.get(jid);

    const p = (async () => {
      const url = `data/zoning/geometry/${jid}.geojson`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Zoning geometry unavailable for ${jid} (${res.status})`);
      const data = await res.json();
      _cache[jid] = data;
      return data;
    })();
    _loading.set(jid, p);
    try {
      return await p;
    } finally {
      _loading.delete(jid);
    }
  }

  /* Resolve the zoning district containing a parcel's representative point.
   *
   * Returns { zoningCode, zoningName, districtCategory, dcClassification,
   * source: 'parcel_boundary_spatial_join' } on a real match, or null when
   * geometry isn't cached, the parcel has no polygon, or no district
   * polygon contains the point. Never guesses a nearest/closest district
   * as a fallback -- "unknown" is the honest answer when point-in-polygon
   * genuinely finds nothing. */
  function resolveForFips(fips, parcelGeometry) {
    if (!parcelGeometry || !window.PARCEL_GEO) return null;
    const geojson = getCachedByFips(fips);
    if (!geojson || !Array.isArray(geojson.features) || !geojson.features.length) return null;

    const point = window.PARCEL_GEO.vertexCentroid(parcelGeometry);
    if (!point) return null;

    for (const feature of geojson.features) {
      if (!feature.geometry) continue;
      if (window.PARCEL_GEO.pointInPolygon(point, feature.geometry)) {
        const p = feature.properties || {};
        if (!p.zoning_code) continue; // malformed feature -- keep looking rather than return a codeless match
        return {
          zoningCode:       p.zoning_code,
          zoningName:       p.zoning_name || null,
          districtCategory: p.zoning_category || null,
          dcClassification: p.dc_classification || null,
          source:           'parcel_boundary_spatial_join',
        };
      }
    }
    return null;
  }

  return {
    FIPS_TO_JURISDICTION,
    hasCoverage,
    isCached,
    getCachedByFips,
    loadByFips,
    resolveForFips,
  };
})();
