/* js/parcel/comparables.js
 * Comparable parcel finder — identifies similar parcels within the active
 * viewport for side-by-side DC site evaluation.
 *
 * window.PARCEL_COMPARABLES.find(subjectProps, options) → Feature[]
 *
 * Comparables are ranked by a weighted similarity score across:
 *   - Zoning match (same district)
 *   - Area similarity (within a configurable band)
 *   - Land use category match
 *   - Assessed value per acre proximity
 *
 * Depends on: PARCEL_RENDERER.getFeatures()
 */
window.PARCEL_COMPARABLES = (function () {
  'use strict';

  const DEFAULTS = {
    maxResults:      5,
    minAreaRatio:    0.20,  // allow down to 20% of subject area
    maxAreaRatio:    5.00,  // allow up to 500% of subject area
    requireSameZone: false, // if true, only same district is returned
  };

  /* Normalized area in square feet from props */
  function _area(props) {
    const a = Number(props.area_sqft) || 0;
    if (a > 0) return a;
    return Number(props.area_acres) * 43560 || 0;
  }

  /* Assessed value per acre (land value proxy) */
  function _valuePerAcre(props) {
    const acres = _area(props) / 43560;
    const value = Number(props.land_value) || Number(props.assessed_value) || 0;
    if (!acres || !value) return null;
    return value / acres;
  }

  /* Land use category bucket — reduces to broad type for matching */
  function _luCategory(zoningCode, landUseCode) {
    const z = String(zoningCode || '').toUpperCase();
    const l = String(landUseCode || '').toUpperCase();
    const combined = z + ' ' + l;
    if (/I\d|INDUSTRI|PD-IP|IP\b/.test(combined)) return 'industrial';
    if (/OFFICE|OP\b|O\d/.test(combined))          return 'office';
    if (/COMMERCIAL|C\d|B\d|RETAIL/.test(combined)) return 'commercial';
    if (/AGRIC|AR\d|FARM|AG\b/.test(combined))      return 'agricultural';
    if (/RESID|R\d|DWELL/.test(combined))            return 'residential';
    return 'other';
  }

  /* Compute similarity score (0–100) between subject and a candidate */
  function _score(subject, candidate) {
    const sp = subject.properties || {};
    const cp = candidate.properties || {};

    const sArea = _area(sp);
    const cArea = _area(cp);

    // Must have some area to compare
    if (!sArea || !cArea) return 0;

    const areaRatio = cArea / sArea;

    // Area band filter
    if (areaRatio < DEFAULTS.minAreaRatio || areaRatio > DEFAULTS.maxAreaRatio) return 0;

    let score = 0;

    // Zoning match (40 pts)
    if (sp.zoning_code && cp.zoning_code) {
      if (sp.zoning_code === cp.zoning_code) {
        score += 40;
      } else if (sp.zoning_code?.split('-')[0] === cp.zoning_code?.split('-')[0]) {
        score += 20; // same family (e.g. PD-IP vs PD-CC)
      }
    }

    // Area proximity (30 pts) — peak score at ratio = 1.0
    const areaSimilarity = 1 - Math.abs(Math.log(areaRatio)) / Math.log(DEFAULTS.maxAreaRatio);
    score += Math.max(0, Math.round(areaSimilarity * 30));

    // Land use category match (20 pts)
    const sCat = _luCategory(sp.zoning_code, sp.land_use_code);
    const cCat = _luCategory(cp.zoning_code, cp.land_use_code);
    if (sCat === cCat && sCat !== 'other') score += 20;
    else if (sCat === 'other' || cCat === 'other') score += 5;

    // Value per acre proximity (10 pts)
    const sVpa = _valuePerAcre(sp);
    const cVpa = _valuePerAcre(cp);
    if (sVpa && cVpa) {
      const vpaRatio = Math.min(sVpa, cVpa) / Math.max(sVpa, cVpa);
      score += Math.round(vpaRatio * 10);
    }

    return Math.min(100, score);
  }

  /* Find comparable parcels for a subject parcel.
   * subject  — GeoJSON Feature (normalized parcel)
   * options  — optional overrides for DEFAULTS
   * Returns array of { feature, score } sorted by score desc, max maxResults items. */
  function find(subject, options = {}) {
    const opts = Object.assign({}, DEFAULTS, options);
    const features = window.PARCEL_RENDERER?.getFeatures() || [];
    const subjectId = subject.properties?.parcel_id;

    const scored = [];
    for (const f of features) {
      if (f.properties?.parcel_id === subjectId) continue; // skip self

      if (opts.requireSameZone && f.properties?.zoning_code !== subject.properties?.zoning_code) continue;

      const s = _score(subject, f);
      if (s > 0) scored.push({ feature: f, score: s });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, opts.maxResults);
  }

  /* Summarize key differences between two parcels (for the comparison table) */
  function diff(subjectProps, candidateProps) {
    const fields = ['area_acres', 'zoning_code', 'assessed_value', 'land_value', 'last_sale_price'];
    const result = {};
    for (const f of fields) {
      const sv = subjectProps[f];
      const cv = candidateProps[f];
      if (sv != null && cv != null && typeof sv === 'number' && typeof cv === 'number' && sv !== 0) {
        result[f] = { delta_pct: Math.round(((cv - sv) / sv) * 100) };
      }
    }
    return result;
  }

  return { find, diff };
})();
