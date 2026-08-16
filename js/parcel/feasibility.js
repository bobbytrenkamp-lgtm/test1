/* js/parcel/feasibility.js
 * DC Development Feasibility Engine — parcel-level assessment.
 *
 * window.PARCEL_FEASIBILITY.assess(props, fips) → feasibility object
 *
 * Uses cached zoning data from window.ZONING (loaded by the zoning intelligence
 * module).  If zoning data is not yet loaded for the jurisdiction, returns
 * { available: false }.  Callers should load zoning data first via
 * window.ZONING.loadByFips(fips) if needed.
 *
 * ZONING CODE SOURCE
 * -------------------
 * None of the NoVA parcel services publish a native zoning_code attribute.
 * When props.zoning_code is absent AND the caller has attached the
 * parcel's raw geometry (props._geometry) AND window.ZONING_GEOMETRY has
 * that jurisdiction's district polygons cached, assess() falls back to a
 * point-in-polygon spatial join to resolve the district. The result
 * always carries zoningCodeSource: 'parcel_attribute' |
 * 'parcel_boundary_spatial_join' so callers can disclose provenance
 * rather than presenting a spatially-inferred code as if the source
 * itself had published it.
 *
 * Depends on: window.ZONING (optional — degrades gracefully if absent),
 *   window.ZONING_GEOMETRY (optional — spatial fallback only)
 */
window.PARCEL_FEASIBILITY = (function () {
  'use strict';

  /* ── Permission status metadata ──
     Keys must cover every value in data/zoning/schemas/permitted_use.schema.json's
     permission_status enum (12 values), not just the ones exercised by the
     jurisdictions researched so far -- a status a researcher correctly
     records (e.g. "special_exception", the term Virginia counties like
     Fairfax use instead of "special_use_permit" for the same kind of
     legislative-body approval) must not silently fall through to the
     generic "Unknown" bucket just because no jurisdiction had used it yet
     when this map was first written. */
  const STATUS_META = {
    permitted_by_right:       { cls: 'pf-eligible',     icon: '✓', label: 'Eligible — By Right'       },
    permitted_with_limitations:{ cls: 'pf-conditional', icon: '!', label: 'Eligible with Limitations'  },
    accessory:                { cls: 'pf-conditional',  icon: '!', label: 'Accessory Use Only'         },
    conditional:              { cls: 'pf-conditional',  icon: '!', label: 'Conditional Approval Req.'  },
    special_exception:        { cls: 'pf-conditional',  icon: '!', label: 'Special Exception Req.'     },
    special_use_permit:       { cls: 'pf-conditional',  icon: '!', label: 'Special Use Permit Req.'    },
    administrative_approval:  { cls: 'pf-conditional',  icon: '!', label: 'Admin Approval Required'    },
    site_plan_approval:       { cls: 'pf-conditional',  icon: '!', label: 'Site Plan Approval Req.'    },
    prohibited:               { cls: 'pf-prohibited',   icon: '✗', label: 'Prohibited'                 },
    not_listed:               { cls: 'pf-unknown',      icon: '?', label: 'Not Listed in District'     },
    unclear:                  { cls: 'pf-unknown',      icon: '?', label: 'Status Unclear'             },
    manual_review_required:   { cls: 'pf-unknown',      icon: '?', label: 'Manual Review Required'     },
    unknown:                  { cls: 'pf-unknown',      icon: '?', label: 'Unknown'                    },
  };

  /* Eligibility contribution to the composite score (0–100 component).
     Same coverage requirement as STATUS_META above. */
  const ELIGIBILITY_SCORE = {
    permitted_by_right:        100,
    permitted_with_limitations: 80,
    accessory:                  40,
    conditional:                60,
    special_exception:          55,
    special_use_permit:         55,
    administrative_approval:    60,
    site_plan_approval:         60,
    prohibited:                  0,
    not_listed:                 20,
    unclear:                    20,
    manual_review_required:     20,
    unknown:                    20,
  };

  /* Known high-value data center markets (FIPS → market score 0–100) */
  const DC_MARKET_SCORES = {
    '51107': 100, // Loudoun County, VA — Data Center Alley #1
    '51153': 92,  // Prince William County, VA — Manassas/Gainesville corridor
    '51059': 80,  // Fairfax County, VA — Reston/Tysons
    '24031': 75,  // Montgomery County, MD — Silver Spring/Germantown
    '24027': 68,  // Howard County, MD — Columbia/Jessup emerging market
    '13121': 78,  // Fulton County, GA — Atlanta metro
    '17031': 72,  // Cook County, IL — Chicago
    '04013': 78,  // Maricopa County, AZ — Phoenix
    '48113': 72,  // Dallas County, TX
    '06085': 68,  // Santa Clara County, CA — Silicon Valley
    '53033': 70,  // King County, WA — Seattle
    '36061': 60,  // New York County, NY
    '34013': 75,  // Essex County, NJ — Northern NJ
    '25017': 65,  // Middlesex County, MA — Boston corridor
  };

  /* Land use code prefix → DC-compatibility (0–100) */
  const LAND_USE_COMPAT = {
    'PD':  85, // Planned Development (often tech/industrial parks)
    'I':   82, // Industrial
    'M':   75, // Manufacturing
    'BP':  70, // Business Park
    'OP':  65, // Office Park
    'B':   52, // Business / Commercial
    'C':   50, // Commercial
    'A':   38, // Agricultural (land available but not ideal)
    'OS':  20, // Open Space
    'R':   10, // Residential
  };

  /* ── Score component helpers ── */

  function _eligibilityScore(permissionStatus) {
    return ELIGIBILITY_SCORE[permissionStatus] ?? 20;
  }

  function _siteSizeScore(acres) {
    const a = Number(acres) || 0;
    if (a >= 50) return 100;
    if (a >= 20) return 88;
    if (a >= 10) return 72;
    if (a >=  5) return 55;
    if (a >=  2) return 35;
    if (a >=  1) return 18;
    return 5;
  }

  function _landUseScore(zoningCode) {
    if (!zoningCode) return 30;
    const z = String(zoningCode).toUpperCase();
    for (const [prefix, score] of Object.entries(LAND_USE_COMPAT)) {
      if (z.startsWith(prefix)) return score;
    }
    return 30;
  }

  function _marketScore(fips) {
    return DC_MARKET_SCORES[String(fips).padStart(5, '0')] ?? 45;
  }

  /* Political risk (0 = lowest risk, 4 = highest risk) → score 0–100 */
  function _politicalRiskScore(fips) {
    const riskData = window.DC_RISK_BY_FIPS;
    if (!riskData) return null;
    const rec = riskData[String(fips).padStart(5, '0')];
    if (!rec) return null;
    // Invert: low raw_score = favorable = high component score
    const raw = Number(rec.risk_score ?? rec.raw_score ?? 2);
    return Math.round(Math.max(0, 100 - (raw / 4) * 100));
  }

  /* Water stress (0–4 scale: 0=low, 4=very high) → score 0–100 */
  function _waterStressScore(fips) {
    const waterData = window.DC_WATER_STRESS;
    if (!waterData || typeof waterData !== 'object') return null;
    const level = waterData[String(fips).padStart(5, '0')];
    if (level === undefined || level === null) return null;
    // Invert: lower stress = better score
    const n = Number(level);
    if (isNaN(n)) return null;
    return Math.round(Math.max(0, 100 - (n / 4) * 100));
  }

  /* ── Buildable envelope ── */

  function _buildableEnvelope(props, standards) {
    if (!standards) return null;

    const areaSqft = Number(props.area_sqft) || (Number(props.area_acres) * 43560);
    if (!areaSqft) return null;

    const lotCoveragePct = standards.maximum_lot_coverage?.value ?? null;
    const heightFt       = standards.maximum_building_height?.value ?? null;
    const frontSetback   = standards.minimum_front_setback?.value   ?? null;
    const sideSetback    = standards.minimum_side_setback?.value    ?? null;
    const rearSetback    = standards.minimum_rear_setback?.value    ?? null;

    // Buildable footprint from lot coverage
    const footprintSqft  = lotCoveragePct != null ? Math.round(areaSqft * (lotCoveragePct / 100)) : null;
    const footprintAcres = footprintSqft != null ? +(footprintSqft / 43560).toFixed(3) : null;

    // Estimated gross floor area: data centers average ~20 ft per story
    let gfaSqft = null;
    if (footprintSqft && heightFt) {
      const floors = Math.max(1, Math.floor(heightFt / 20));
      gfaSqft = footprintSqft * floors;
    }

    // Minimum site to be DC-viable (1 MW data center ≈ ~50,000 sqft footprint)
    const minViableSqft = 50000;
    const isViable = footprintSqft != null ? footprintSqft >= minViableSqft : null;

    return {
      siteTotalSqft:     Math.round(areaSqft),
      siteTotalAcres:    +(areaSqft / 43560).toFixed(3),
      maxCoverage_pct:   lotCoveragePct,
      footprintSqft,
      footprintAcres,
      maxHeight_ft:      heightFt,
      estimatedGFA_sqft: gfaSqft,
      setbacks:          { front: frontSetback, side: sideSetback, rear: rearSetback },
      isViable,
      disclaimer:        'Estimates use base zoning standards only. Approved development plans, proffers, and overlay districts may impose different requirements. Confirm all figures with the jurisdiction before relying on them.',
    };
  }

  /* ── Main assessment ── */

  function assess(props, fips) {
    const resolvedFips = String(fips || props.county_fips || '').padStart(5, '0');
    let zoningCode        = props.zoning_code || null;
    let zoningCodeSource  = zoningCode ? 'parcel_attribute' : null;
    let spatialZoningName = null;

    if (!zoningCode && props._geometry && window.ZONING_GEOMETRY) {
      const resolved = window.ZONING_GEOMETRY.resolveForFips(resolvedFips, props._geometry);
      if (resolved && resolved.zoningCode) {
        zoningCode        = resolved.zoningCode;
        zoningCodeSource  = 'parcel_boundary_spatial_join';
        spatialZoningName = resolved.zoningName;
      }
    }

    // Try cached zoning data first — do not trigger a new fetch
    const zoningData = window.ZONING?.getCachedByFips(resolvedFips) || null;

    if (!zoningData) {
      return {
        available: false,
        reason:    window.ZONING?.hasCoverage(resolvedFips)
          ? 'Zoning data not yet loaded. Open the Zoning panel to load it.'
          : 'Zoning intelligence not available for this jurisdiction.',
      };
    }

    if (!zoningCode) {
      return { available: false, reason: 'No zoning code on this parcel.' };
    }

    const district = zoningData.districts?.[zoningCode];
    if (!district) {
      // A spatially-resolved code that isn't (yet) in the classified
      // districts registry is a real, honest partial result -- the code
      // itself is a fact from the county's own zoning map, it just hasn't
      // been researched for data-center eligibility yet. Surface it rather
      // than returning a blank "not found."
      return {
        available:  false,
        reason:     zoningCodeSource === 'parcel_boundary_spatial_join'
          ? `District "${zoningCode}" was resolved from the county's zoning map, but has not yet been classified for data-center eligibility.`
          : `District "${zoningCode}" not found in zoning data.`,
        zoningCode,
        zoningCodeSource,
        zoningName: spatialZoningName,
      };
    }

    // Find the data_center use entry for this district
    const dcUse = district.uses?.find(u => u.standardized_use_id === 'data_center');
    const permissionStatus = dcUse?.permission_status
                          ?? district.dc_analysis?.base_zoning_status
                          ?? 'unknown';

    const statusMeta  = STATUS_META[permissionStatus] || STATUS_META.unknown;
    const conditions  = dcUse?.conditions ?? district.dc_analysis?.conditions ?? [];
    const approvalType= dcUse?.approval_type ?? district.dc_analysis?.approval_type ?? null;
    const confidence  = dcUse?.confidence_level ?? 'low';

    // Buildable envelope from zoning dimensional standards
    const envelope = _buildableEnvelope(props, district.standards);

    /* Geometric envelope, when the caller has supplied parcel geometry and
       (optionally) the constraint intersections from PARCEL_CONSTRAINTS.
       This is the parcel polygon with mapped constraints actually subtracted
       and setbacks eroded, rather than the acreage x lot-coverage arithmetic
       above -- see js/parcel/envelope.js.

       Added ALONGSIDE the existing `envelope` rather than replacing it. The
       area-based figures are what the panel and report already render, and
       swapping the meaning of an existing field out from under them would
       change displayed numbers for every jurisdiction as a side effect of
       adding a feature. Callers opt in by passing geometry. */
    let geometricEnvelope = null;
    if (props._geometry && window.PARCEL_ENVELOPE && window.polygonClipping) {
      geometricEnvelope = window.PARCEL_ENVELOPE.build(
        props._geometry,
        props._constraintGeometries || [],
        district.standards,
      );
    }

    // Composite development potential score (0–100)
    // Base factors always present; optional data-backed factors added when available
    const acres = Number(props.area_acres) || ((Number(props.area_sqft) || 0) / 43560);

    const riskScore  = _politicalRiskScore(resolvedFips);
    const waterScore = _waterStressScore(resolvedFips);

    // Build factors with adaptive weighting
    // Core factors always present; optional factors injected when data exists.
    // Weights sum to exactly 1.0 regardless of which optional factors fire.
    const coreFactors = [
      { id: 'eligibility', label: 'Zoning Eligibility', score: _eligibilityScore(permissionStatus), group: 'Zoning' },
      { id: 'site_size',   label: 'Site Size',          score: _siteSizeScore(acres),               group: 'Site'   },
      { id: 'land_use',    label: 'Land Use Match',     score: _landUseScore(zoningCode),            group: 'Zoning' },
      { id: 'market',      label: 'Market Strength',    score: _marketScore(resolvedFips),           group: 'Market' },
    ];
    const optFactors = [
      riskScore  != null ? { id: 'risk',  label: 'Political Risk',  score: riskScore,  group: 'Risk'  } : null,
      waterScore != null ? { id: 'water', label: 'Water Stress',    score: waterScore, group: 'Site'  } : null,
    ].filter(Boolean);

    // Core weights (no optional factors): eligibility 40%, size 25%, land_use 20%, market 15%
    // With optional factors: redistribute 12% proportionally from all core factors
    const coreWeights  = [0.40, 0.25, 0.20, 0.15];
    const optWeight    = optFactors.length > 0 ? 0.06 * optFactors.length : 0;
    const coreTotal    = 1 - optWeight;
    const weightedCore = coreWeights.map(w => +(w * coreTotal).toFixed(4));
    const optPerFactor = optFactors.length > 0 ? +(optWeight / optFactors.length).toFixed(4) : 0;

    const factors = [
      ...coreFactors.map((f, i) => ({ ...f, weight: weightedCore[i] })),
      ...optFactors.map(f  => ({ ...f, weight: optPerFactor })),
    ];
    const compositeScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));

    return {
      available:           true,
      fips:                resolvedFips,
      zoningCode,
      zoningCodeSource,
      permissionStatus,
      statusMeta,
      approvalType,
      conditions,
      confidence,
      manualReviewRequired: dcUse?.manual_review_required ?? true,
      envelope,
      geometricEnvelope,
      score:               compositeScore,
      factors,
      districtName:        district.district_name || spatialZoningName || null,
      dcSummary:           district.dc_eligibility_summary ?? district.dc_analysis?.notes ?? null,
      jurisdictionName:    zoningData.jurisdiction?.jurisdiction_name ?? null,
      ordinanceUrl:        zoningData.jurisdiction?.official_ordinance_url ?? null,
      disclaimer:          zoningData.disclaimer ?? null,
    };
  }

  /* ── Async variant: loads zoning data (and, when the parcel has no native
     zoning_code, the geometry needed for the spatial fallback) if not yet
     cached ── */
  async function assessAsync(props, fips) {
    const resolvedFips = String(fips || props.county_fips || '').padStart(5, '0');
    const loads = [];
    if (window.ZONING?.hasCoverage(resolvedFips) && !window.ZONING?.getCachedByFips(resolvedFips)) {
      loads.push(window.ZONING.loadByFips(resolvedFips).catch(() => {}));
    }
    if (!props.zoning_code && props._geometry &&
        window.ZONING_GEOMETRY?.hasCoverage(resolvedFips) &&
        !window.ZONING_GEOMETRY?.isCached(resolvedFips)) {
      loads.push(window.ZONING_GEOMETRY.loadByFips(resolvedFips).catch(() => {}));
    }
    if (loads.length) await Promise.all(loads);
    return assess(props, resolvedFips);
  }

  return { assess, assessAsync, STATUS_META, DC_MARKET_SCORES };
})();
