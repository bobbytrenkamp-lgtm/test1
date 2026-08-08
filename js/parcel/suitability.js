/* js/parcel/suitability.js
 * window.PARCEL_SUITABILITY — explainable site suitability screening score.
 *
 * Composes the analyses built by the rest of this system — proximity,
 * constraints, the conceptual envelope, zoning, policy risk, and data
 * confidence — into component scores and one headline number.
 *
 * WHAT THIS SCORE IS
 * ------------------
 * A SCREENING tool: a way to sort a list of candidate parcels so a human
 * looks at the promising ones first. That is all.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not a judgement that a property is suitable for development, and the
 * module never says so. A high score means "the mapped, public data we could
 * find looks favourable on the axes we measured". It cannot see title, soils,
 * utility willingness to serve, community opposition, a seller's intentions,
 * or any of the things that actually kill deals.
 *
 * DESIGN RULES, ENFORCED BY TESTS
 * -------------------------------
 * 1. DETERMINISTIC. Same inputs, same output, always. No randomness, no
 *    time dependence, no LLM anywhere near it.
 * 2. TRANSPARENT. Every component publishes its weight, its inputs, and the
 *    rule that produced its value. The overall score is exactly the weighted
 *    mean of its components — a test asserts the arithmetic, so a hidden
 *    term cannot creep in.
 * 3. NEVER SCORES WHAT IT DID NOT MEASURE. A component with no data is
 *    OMITTED and the weights of the remaining components are renormalized —
 *    it is never scored 0, and never silently scored 50. Scoring an
 *    unmeasured axis as zero would punish thin-data counties for our own
 *    coverage gaps; scoring it as average would invent a fact.
 * 4. REPORTS ITS OWN COVERAGE. Every result states which components were
 *    scored, which were skipped and why, and what share of the total weight
 *    was actually available. A 78 built from three of eight components is a
 *    different thing from a 78 built from all eight, and the output makes
 *    that visible rather than leaving both to look identical.
 *
 * Depends on: nothing required. Reads optional globals for policy context.
 */
window.PARCEL_SUITABILITY = (function () {
  'use strict';

  /* Component weights. Visible, adjustable, and summing to 100 for
     legibility — though nothing depends on that sum, since scoring
     renormalizes over whatever components actually had data.

     These encode a specific view of data center siting: power is the
     binding constraint in this market and is weighted accordingly; site
     size and usable land come next because a site that cannot physically
     hold the building is not a site. Reasonable people would weight these
     differently, which is exactly why they are named constants. */
  const WEIGHTS = Object.freeze({
    power:       25,
    site:        20,
    constraints: 15,
    access:      12,
    landUse:     12,
    market:      10,
    policy:       6,
  });

  const LABELS = Object.freeze({
    power:       'Power',
    site:        'Site',
    constraints: 'Constraints',
    access:      'Access',
    landUse:     'Land use',
    market:      'Market',
    policy:      'Policy',
  });

  /* Piecewise-linear interpolation over documented breakpoints.
     Chosen over a formula so every threshold is readable and arguable: a
     reviewer can see that 2 miles to a substation scores 80 without solving
     an equation. Breakpoints must be ascending in x. */
  function interpolate(x, points) {
    if (x == null || !Number.isFinite(x)) return null;
    if (x <= points[0][0]) return points[0][1];
    const last = points[points.length - 1];
    if (x >= last[0]) return last[1];
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      if (x <= x1) {
        const ratio = (x - x0) / (x1 - x0);
        return Math.round(y0 + ratio * (y1 - y0));
      }
    }
    return last[1];
  }

  /* Distance-to-infrastructure curves, in miles. Flat at the top because the
     difference between 0.2 and 0.4 miles rarely decides anything, and flat at
     the bottom because past a point "far" is just far. */
  const SUBSTATION_CURVE   = [[0, 100], [1, 92], [2, 80], [5, 55], [10, 30], [20, 10], [40, 0]];
  const TRANSMISSION_CURVE = [[0, 100], [0.5, 95], [1, 88], [3, 65], [6, 40], [12, 15], [25, 0]];
  const INTERSTATE_CURVE   = [[0, 100], [1, 95], [3, 85], [6, 65], [12, 40], [25, 15], [50, 0]];
  const DATACENTER_CURVE   = [[0, 100], [2, 95], [5, 85], [10, 70], [25, 45], [50, 20], [100, 5]];

  /* Acreage curve. Rises steeply through the range where a site becomes
     capable of holding a real campus, then flattens — beyond a few hundred
     acres more land stops being the differentiator. */
  const ACREAGE_CURVE = [[0, 0], [5, 15], [10, 30], [25, 55], [50, 75], [100, 88], [250, 96], [500, 100]];

  /* Zoning prefix compatibility. Prefix matching because zoning codes are
     hierarchical strings, not an enum: "I" must find I-1, I-2, I-95-BP. */
  const ZONING_COMPAT = [
    ['PD', 85], ['BP', 78], ['OP', 68], ['I', 88], ['M', 80],
    ['C', 50], ['B', 50], ['A', 40], ['OS', 12], ['R', 10],
  ];

  /* ── Component scorers ───────────────────────────────────────────────────
   *
   * Each returns { score, inputs, rule } or null when it has nothing to work
   * with. Returning null is what triggers omission-and-renormalization; a
   * scorer must never invent a midpoint to avoid returning null. */

  function scorePower(ctx) {
    const sub = nearestMiles(ctx, 'substations');
    const tx = nearestMiles(ctx, 'transmission-lines');

    const subScore = sub != null ? interpolate(sub, SUBSTATION_CURVE) : null;
    const txScore = tx != null ? interpolate(tx, TRANSMISSION_CURVE) : null;
    if (subScore == null && txScore == null) return null;

    // Averaged over whichever are present, rather than treating a missing
    // one as zero.
    const parts = [subScore, txScore].filter(v => v != null);
    return {
      score: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length),
      inputs: {
        nearestSubstationMiles: sub,
        nearestTransmissionMiles: tx,
      },
      rule: 'Mean of substation and transmission distance curves, over whichever were measured. ' +
            'Distance only — this says nothing about available capacity or willingness to serve.',
    };
  }

  function scoreSite(ctx) {
    const acres = numeric(ctx.acres);
    const usable = ctx.envelope && !ctx.envelope.partial
      ? numeric(ctx.envelope.conceptualUsableAcres) : null;

    if (acres == null && usable == null) return null;

    const acreScore = acres != null ? interpolate(acres, ACREAGE_CURVE) : null;
    const usableScore = usable != null ? interpolate(usable, ACREAGE_CURVE) : null;

    // Conceptual usable acreage is the better signal when available: gross
    // acreage on a site that is mostly floodplain overstates it badly.
    let score, rule;
    if (usableScore != null && acreScore != null) {
      score = Math.round(0.4 * acreScore + 0.6 * usableScore);
      rule = 'Acreage curve applied to gross acres (40%) and conceptual usable acres (60%). ' +
             'Usable weighs more because gross acreage on a mostly-constrained site overstates it.';
    } else if (usableScore != null) {
      score = usableScore;
      rule = 'Acreage curve applied to conceptual usable acres.';
    } else {
      score = acreScore;
      rule = 'Acreage curve applied to gross acres. No conceptual envelope was available, ' +
             'so constrained land is not discounted here.';
    }

    return { score, inputs: { grossAcres: acres, conceptualUsableAcres: usable }, rule };
  }

  function scoreConstraints(ctx) {
    const c = ctx.constraintSummary;
    // A partial constraint analysis must not be scored: a 95 built from a
    // flood check that failed is a confident statement about nothing.
    if (!c || c.partial || typeof c.constrainedPct !== 'number') return null;

    // Linear: 0% constrained scores 100, 100% constrained scores 0. Simple on
    // purpose — a more elaborate curve would imply precision the underlying
    // FEMA and NWI mapping does not have.
    const score = Math.round(Math.max(0, 100 - c.constrainedPct));
    return {
      score,
      inputs: { constrainedPct: c.constrainedPct, layersEvaluated: c.layersEvaluated },
      rule: '100 minus the share of the parcel inside mapped constraint layers. ' +
            'Mapped constraints only — not a survey or a wetland delineation.',
    };
  }

  function scoreAccess(ctx) {
    const interstate = nearestMiles(ctx, 'interstates');
    if (interstate == null) return null;
    return {
      score: interpolate(interstate, INTERSTATE_CURVE),
      inputs: { nearestInterstateMiles: interstate },
      rule: 'Straight-line distance to the nearest interstate. Not drive time, and not ' +
            'distance to an interchange — a highway you cannot get onto is not access.',
    };
  }

  function scoreLandUse(ctx) {
    const zoning = str(ctx.properties && ctx.properties.zoning_code);
    const landUse = str(ctx.properties && ctx.properties.land_use_code);
    const code = zoning || landUse;
    if (!code) return null;

    const upper = code.toUpperCase();
    let matched = null;
    for (const [prefix, value] of ZONING_COMPAT) {
      if (upper.startsWith(prefix)) { matched = { prefix, value }; break; }
    }
    if (!matched) return null;   // an unrecognized code is not a low score

    return {
      score: matched.value,
      inputs: { code, matchedPrefix: matched.prefix, source: zoning ? 'zoning_code' : 'land_use_code' },
      rule: `Zoning/land-use prefix "${matched.prefix}" mapped to a compatibility value. ` +
            'Compatibility of the district in general — it does not mean this use is permitted here.',
    };
  }

  function scoreMarket(ctx) {
    const dc = (ctx.proximity || {})['data-centers'];
    if (!dc || dc.error) return null;
    const nearest = dc.nearest ? dc.nearest.distanceMiles : null;
    const within10 = dc.counts ? dc.counts[10] : null;

    if (nearest == null && within10 == null) return null;

    const proximityScore = nearest != null ? interpolate(nearest, DATACENTER_CURVE) : null;
    // Density curve: some clustering signals a working market; enormous
    // density can equally signal a constrained one, so this flattens rather
    // than climbing indefinitely.
    const densityScore = within10 != null
      ? interpolate(within10, [[0, 20], [1, 45], [3, 65], [8, 85], [20, 95], [50, 100]]) : null;

    const parts = [proximityScore, densityScore].filter(v => v != null);
    return {
      score: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length),
      inputs: { nearestDataCenterMiles: nearest, dataCentersWithin10Miles: within10 },
      rule: 'Mean of distance-to-nearest and 10-mile count curves. Existing clustering ' +
            'indicates power and fiber already reached the corridor; it is not a guarantee ' +
            'that more capacity is available.',
    };
  }

  function scorePolicy(ctx) {
    const fips = str(ctx.fips || (ctx.properties && ctx.properties.county_fips));
    if (!fips) return null;
    const index = (typeof window !== 'undefined' && window.DC_RISK_BY_FIPS) || null;
    if (!index) return null;
    const rec = index[String(fips).padStart(5, '0')];
    if (!rec) return null;

    const raw = Number(rec.risk_score ?? rec.raw_score);
    if (!Number.isFinite(raw)) return null;

    // The published scale is 1 (very favorable) to 5 (high risk). Inverted
    // and mapped to 0-100 linearly.
    const score = Math.round(Math.max(0, Math.min(100, ((5 - raw) / 4) * 100)));
    return {
      score,
      inputs: { countyFips: fips, publishedRiskScore: raw },
      rule: 'County data center political-risk score (1 favorable to 5 high risk), inverted. ' +
            'A forward-looking indicator of restriction likelihood, not a record of current law.',
    };
  }

  const SCORERS = {
    power: scorePower,
    site: scoreSite,
    constraints: scoreConstraints,
    access: scoreAccess,
    landUse: scoreLandUse,
    market: scoreMarket,
    policy: scorePolicy,
  };

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  function nearestMiles(ctx, layerId) {
    const r = (ctx.proximity || {})[layerId];
    if (!r || r.error || !r.nearest) return null;
    const m = r.nearest.distanceMiles;
    return Number.isFinite(m) ? m : null;
  }

  function numeric(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function str(v) {
    if (v == null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  }

  /* Data confidence: how much of the picture we actually had. Reported as a
     band rather than a number, because a precise-looking "confidence: 62"
     invites arithmetic on a quantity that does not support it. */
  function confidenceBand(weightAvailablePct) {
    if (weightAvailablePct >= 85) return 'high';
    if (weightAvailablePct >= 60) return 'moderate';
    if (weightAvailablePct >= 35) return 'low';
    return 'very-low';
  }

  /* ── Main entry point ────────────────────────────────────────────────── */

  /* score(ctx) where ctx is:
   *   { properties, geometry?, acres?, fips?,
   *     proximity?:  { [layerId]: proximityResult },
   *     constraintSummary?: constraintsSummary,
   *     envelope?:   conceptualEnvelope }
   */
  function score(ctx) {
    const c = ctx || {};
    const components = [];
    const omitted = [];

    for (const [key, scorer] of Object.entries(SCORERS)) {
      let result = null;
      try {
        result = scorer(c);
      } catch (err) {
        result = null;
      }

      if (!result || result.score == null || !Number.isFinite(result.score)) {
        omitted.push({
          component: key,
          label: LABELS[key],
          weight: WEIGHTS[key],
          why: 'the data this component needs was not available for this parcel',
        });
        continue;
      }

      components.push({
        component: key,
        label: LABELS[key],
        weight: WEIGHTS[key],
        score: Math.max(0, Math.min(100, Math.round(result.score))),
        inputs: result.inputs || {},
        rule: result.rule || null,
      });
    }

    const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    const availableWeight = components.reduce((sum, x) => sum + x.weight, 0);

    /* No components means no score. Returning null rather than 0 is the whole
       point: a parcel we know nothing about has an UNKNOWN score, and 0 would
       sort it below a genuinely poor site that we did measure. */
    if (!availableWeight) {
      return {
        overall: null,
        components: [],
        omitted,
        coverage: { availableWeight: 0, totalWeight, availablePct: 0 },
        confidence: confidenceBand(0),
        scorable: false,
        why: 'None of the inputs this score needs were available for this parcel.',
        disclaimer: DISCLAIMER,
      };
    }

    // Weighted mean over the components that had data — renormalized, so a
    // missing component neither drags the score down nor invents a value.
    const weighted = components.reduce((sum, x) => sum + x.score * x.weight, 0);
    const overall = Math.round(weighted / availableWeight);
    const availablePct = Math.round((availableWeight / totalWeight) * 1000) / 10;

    return {
      overall,
      components: components.sort((a, b) => b.weight - a.weight),
      omitted,
      coverage: { availableWeight, totalWeight, availablePct },
      confidence: confidenceBand(availablePct),
      scorable: true,
      /* Stated explicitly so a headline number is never read alone. A 78
         from three of seven components is a different claim from a 78 from
         all seven. */
      basis: `Weighted mean of ${components.length} component(s) covering ${availablePct}% ` +
             `of the total weight. ${omitted.length} component(s) had no data and were omitted ` +
             `rather than scored zero.`,
      disclaimer: DISCLAIMER,
    };
  }

  const DISCLAIMER =
    'Screening score only. It ranks candidate sites by mapped public data on the axes ' +
    'listed — it is not a judgement that a property is suitable for development, and it ' +
    'cannot see title, soils, utility willingness to serve, community opposition, or ' +
    'whether the land is for sale. Every component and its rule is shown so the number ' +
    'can be checked rather than trusted.';

  /* Flat text explanation of one result, for the panel's expandable detail. */
  function explain(result) {
    if (!result) return [];
    const lines = [];
    for (const c of (result.components || [])) {
      lines.push(`${c.label}: ${c.score}/100 (weight ${c.weight}) — ${c.rule}`);
    }
    for (const o of (result.omitted || [])) {
      lines.push(`${o.label}: not scored — ${o.why}`);
    }
    return lines;
  }

  return {
    score, explain, interpolate, confidenceBand,
    WEIGHTS, LABELS, DISCLAIMER,
    SUBSTATION_CURVE, TRANSMISSION_CURVE, INTERSTATE_CURVE, DATACENTER_CURVE, ACREAGE_CURVE,
  };
})();
