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
 * Depends on: window.ZONING (optional — degrades gracefully if absent)
 */
window.PARCEL_FEASIBILITY = (function () {
  'use strict';

  /* ── Permission status metadata ── */
  const STATUS_META = {
    permitted_by_right:       { cls: 'pf-eligible',     icon: '✓', label: 'Eligible — By Right'       },
    permitted_with_limitations:{ cls: 'pf-conditional', icon: '!', label: 'Eligible with Limitations'  },
    conditional:              { cls: 'pf-conditional',  icon: '!', label: 'Conditional Approval Req.'  },
    special_use_permit:       { cls: 'pf-conditional',  icon: '!', label: 'Special Use Permit Req.'    },
    administrative_approval:  { cls: 'pf-conditional',  icon: '!', label: 'Admin Approval Required'    },
    site_plan_approval:       { cls: 'pf-conditional',  icon: '!', label: 'Site Plan Approval Req.'    },
    prohibited:               { cls: 'pf-prohibited',   icon: '✗', label: 'Prohibited'                 },
    not_listed:               { cls: 'pf-unknown',      icon: '?', label: 'Not Listed in District'     },
    unclear:                  { cls: 'pf-unknown',      icon: '?', label: 'Status Unclear'             },
    unknown:                  { cls: 'pf-unknown',      icon: '?', label: 'Unknown'                    },
  };

  /* Eligibility contribution to the composite score (0–100 component) */
  const ELIGIBILITY_SCORE = {
    permitted_by_right:        100,
    permitted_with_limitations: 80,
    conditional:                60,
    special_use_permit:         55,
    administrative_approval:    60,
    site_plan_approval:         60,
    prohibited:                  0,
    not_listed:                 20,
    unclear:                    20,
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
    const zoningCode   = props.zoning_code;

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
      return {
        available:  false,
        reason:     `District "${zoningCode}" not found in zoning data.`,
        zoningCode,
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

    // Composite development potential score (0–100)
    const acres = Number(props.area_acres) || ((Number(props.area_sqft) || 0) / 43560);
    const factors = [
      { id: 'eligibility', label: 'Zoning Eligibility', weight: 0.40, score: _eligibilityScore(permissionStatus) },
      { id: 'site_size',   label: 'Site Size',          weight: 0.25, score: _siteSizeScore(acres)              },
      { id: 'land_use',    label: 'Land Use Match',     weight: 0.20, score: _landUseScore(zoningCode)          },
      { id: 'market',      label: 'Market Strength',    weight: 0.15, score: _marketScore(resolvedFips)         },
    ];
    const compositeScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));

    return {
      available:           true,
      fips:                resolvedFips,
      zoningCode,
      permissionStatus,
      statusMeta,
      approvalType,
      conditions,
      confidence,
      manualReviewRequired: dcUse?.manual_review_required ?? true,
      envelope,
      score:               compositeScore,
      factors,
      districtName:        district.district_name,
      dcSummary:           district.dc_eligibility_summary ?? district.dc_analysis?.notes ?? null,
      jurisdictionName:    zoningData.jurisdiction?.jurisdiction_name ?? null,
      ordinanceUrl:        zoningData.jurisdiction?.official_ordinance_url ?? null,
      disclaimer:          zoningData.disclaimer ?? null,
    };
  }

  /* ── Async variant: loads zoning data if not yet cached ── */
  async function assessAsync(props, fips) {
    const resolvedFips = String(fips || props.county_fips || '').padStart(5, '0');
    if (window.ZONING?.hasCoverage(resolvedFips) && !window.ZONING?.getCachedByFips(resolvedFips)) {
      await window.ZONING.loadByFips(resolvedFips).catch(() => {});
    }
    return assess(props, resolvedFips);
  }

  return { assess, assessAsync, STATUS_META, DC_MARKET_SCORES };
})();
