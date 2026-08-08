/* js/parcel/site-search.js
 * window.PARCEL_SITE_SEARCH — large-site discovery.
 *
 * Turns the parcel system from a viewer into a site-finding tool: "show me
 * parcels over 50 acres within 2 miles of transmission and 5 miles of an
 * interstate".
 *
 * THE CENTRAL CORRECTNESS PROBLEM: FILTERING ON DATA YOU DO NOT HAVE
 * ------------------------------------------------------------------
 * Most parcels in this system are missing most fields. A filter of
 * "floodplain <= 5%" run over a county where flood data was never checked
 * has three possible behaviours, and two of them are lies:
 *
 *   - Silently INCLUDE unknowns: the results list parcels as meeting a flood
 *     criterion that was never evaluated. A user reads that list as "these
 *     passed", and it is the most damaging option.
 *   - Silently EXCLUDE unknowns: the tool quietly hides every parcel in
 *     thin-data counties, and the user concludes there is no land there.
 *   - Report them as UNKNOWN, separately from matches and misses.
 *
 * This module does the third. Every parcel lands in exactly one of `matched`,
 * `rejected`, or `indeterminate`, each criterion records its own verdict, and
 * the caller decides how to present unknowns. `unknownPolicy` lets a caller
 * choose 'exclude' (default, conservative) or 'include' explicitly — but the
 * counts are always reported separately, so a user can never mistake "45
 * parcels matched" for "45 parcels were checked".
 *
 * PERFORMANCE
 * -----------
 * This engine evaluates CANDIDATES it is handed. It never loads parcels
 * nationally, and it is designed to run behind a jurisdiction filter and a
 * spatial bound so the candidate set is bounded before it arrives. Criteria
 * are ordered cheapest-first (a field comparison before a distance
 * calculation before a polygon intersection), and evaluation short-circuits
 * on the first rejection, so an expensive check never runs for a parcel
 * already ruled out on acreage.
 *
 * Depends on: window.PARCEL_GEO (optional — only for area fallback).
 */
window.PARCEL_SITE_SEARCH = (function () {
  'use strict';

  /* Criterion definitions. `cost` orders evaluation: 1 is a plain field
     comparison, 2 needs precomputed analysis on the candidate, 3 would need
     new I/O. Nothing here performs I/O — a candidate arrives with whatever
     analysis the caller has already run, and a criterion whose input is
     absent returns 'unknown' rather than guessing. */
  const CRITERIA = {
    minAcres: {
      cost: 1, label: 'Minimum acreage',
      evaluate: (c, v) => cmpNumber(acresOf(c), v, (a, b) => a >= b),
    },
    maxAcres: {
      cost: 1, label: 'Maximum acreage',
      evaluate: (c, v) => cmpNumber(acresOf(c), v, (a, b) => a <= b),
    },
    states: {
      cost: 1, label: 'State',
      evaluate: (c, v) => {
        const s = prop(c, 'state') || (c.state ?? null);
        if (s == null || s === '') return unknown('parcel has no state recorded');
        return verdict(v.map(x => String(x).toUpperCase()).includes(String(s).toUpperCase()));
      },
    },
    counties: {
      cost: 1, label: 'County',
      evaluate: (c, v) => {
        const f = prop(c, 'county_fips');
        if (f == null || f === '') return unknown('parcel has no county FIPS');
        const norm = String(f).padStart(5, '0');
        return verdict(v.map(x => String(x).padStart(5, '0')).includes(norm));
      },
    },
    zoningCodes: {
      cost: 1, label: 'Zoning',
      evaluate: (c, v) => {
        const z = prop(c, 'zoning_code');
        if (z == null || z === '') return unknown('this jurisdiction does not publish zoning on the parcel');
        const zs = String(z).toUpperCase();
        // Prefix match: "I" should find I-1, I-2, I-95-BP. Exactness here
        // would make the filter useless, since zoning codes are hierarchical
        // strings rather than an enum.
        return verdict(v.some(x => zs.startsWith(String(x).toUpperCase())));
      },
    },
    landUseCodes: {
      cost: 1, label: 'Land use',
      evaluate: (c, v) => {
        const lu = prop(c, 'land_use_code');
        if (lu == null || lu === '') return unknown('no land use code published for this parcel');
        const s = String(lu).toUpperCase();
        return verdict(v.some(x => s.startsWith(String(x).toUpperCase())));
      },
    },
    ownerKnown: {
      cost: 1, label: 'Owner identified',
      evaluate: (c, v) => {
        const owner = prop(c, 'owner');
        // An owner field this system cannot resolve to an identity counts as
        // NOT known, not as unknown — we did check, and the answer is no.
        const resolved = window.PARCEL_ASSEMBLAGE
          ? window.PARCEL_ASSEMBLAGE.normalizeOwner(owner)
          : (owner && String(owner).trim() ? String(owner).trim() : null);
        return verdict(v ? !!resolved : !resolved);
      },
    },
    minAssessedValue: {
      cost: 1, label: 'Minimum assessed value',
      evaluate: (c, v) => cmpNumber(numProp(c, 'assessed_value'), v, (a, b) => a >= b),
    },
    maxAssessedValue: {
      cost: 1, label: 'Maximum assessed value',
      evaluate: (c, v) => cmpNumber(numProp(c, 'assessed_value'), v, (a, b) => a <= b),
    },

    /* Distance criteria read the proximity analysis the caller attached as
       `candidate.proximity` (keyed by layer id). A layer that failed or was
       never run is unknown — never "far away", and never "close". */
    maxMilesToTransmission: {
      cost: 2, label: 'Distance to transmission',
      evaluate: (c, v) => distanceAtMost(c, 'transmission-lines', v),
    },
    maxMilesToSubstation: {
      cost: 2, label: 'Distance to substation',
      evaluate: (c, v) => distanceAtMost(c, 'substations', v),
    },
    maxMilesToInterstate: {
      cost: 2, label: 'Distance to interstate',
      evaluate: (c, v) => distanceAtMost(c, 'interstates', v),
    },
    maxMilesToDataCenter: {
      cost: 2, label: 'Distance to existing data center',
      evaluate: (c, v) => distanceAtMost(c, 'data-centers', v),
    },
    minDataCentersWithin10Miles: {
      cost: 2, label: 'Data center density',
      evaluate: (c, v) => {
        const r = (c.proximity || {})['data-centers'];
        if (!r || r.error || !r.counts) return unknown('data center proximity was not evaluated');
        const n = r.counts[10];
        if (typeof n !== 'number') return unknown('no 10-mile count available');
        return verdict(n >= v);
      },
    },

    /* Constraint criteria read `candidate.constraints` (keyed by layer id).
       An unevaluated constraint layer is the single most important unknown
       in this whole module: treating "we could not check the floodplain" as
       "0% floodplain" would put parcels in a matched list on the strength of
       a check that never happened. */
    maxFloodplainPct: {
      cost: 3, label: 'Floodplain coverage',
      evaluate: (c, v) => constraintAtMost(c, 'fema-flood', v),
    },
    maxWetlandPct: {
      cost: 3, label: 'Wetland coverage',
      evaluate: (c, v) => constraintAtMost(c, 'nwi-wetlands', v),
    },
    minConceptualUsableAcres: {
      cost: 3, label: 'Conceptual usable acreage',
      evaluate: (c, v) => {
        const env = c.envelope;
        if (!env || env.conceptualUsableAcres == null) {
          return unknown('no conceptual envelope was computed for this parcel');
        }
        if (env.partial) {
          // A partial envelope is a number built on an incomplete check.
          // Filtering on it silently would launder that incompleteness.
          return unknown('the conceptual envelope is incomplete for this parcel');
        }
        return verdict(env.conceptualUsableAcres >= v);
      },
    },
  };

  /* ── Verdict helpers ─────────────────────────────────────────────────── */

  const PASS = 'pass', FAIL = 'fail', UNKNOWN = 'unknown';

  function verdict(bool) { return { verdict: bool ? PASS : FAIL }; }
  function unknown(why) { return { verdict: UNKNOWN, why }; }

  function prop(candidate, field) {
    return (candidate && candidate.properties) ? candidate.properties[field] : undefined;
  }

  function numProp(candidate, field) {
    const raw = prop(candidate, field);
    // Number(null) is 0 and Number('') is 0, so the explicit test is
    // load-bearing: without it a parcel publishing no assessed value would
    // read as one assessed at zero and pass a "maxAssessedValue" filter.
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function acresOf(candidate) {
    const direct = numProp(candidate, 'area_acres');
    if (direct != null) return direct;
    const sqft = numProp(candidate, 'area_sqft');
    if (sqft != null) return sqft / 43560;
    // Fall back to measuring the polygon. A parcel whose publisher omits an
    // area attribute still has a size, and excluding it from an acreage
    // search would hide real land.
    if (candidate.geometry && window.PARCEL_GEO) {
      const sqm = window.PARCEL_GEO.polygonAreaSqm(candidate.geometry);
      if (sqm) return window.PARCEL_GEO.sqmToAcres(sqm);
    }
    return null;
  }

  function cmpNumber(actual, threshold, test) {
    if (actual == null) return unknown('value not available for this parcel');
    return verdict(test(actual, threshold));
  }

  function distanceAtMost(candidate, layerId, maxMiles) {
    const r = (candidate.proximity || {})[layerId];
    if (!r) return unknown(`${layerId} proximity was not evaluated for this parcel`);
    if (r.error) return unknown(`${layerId} proximity failed: ${r.error}`);
    if (!r.nearest) {
      // Nothing within the engine's search horizon is a genuine FAIL of a
      // "within X miles" test, not an unknown: we looked and found nothing.
      return verdict(false);
    }
    return verdict(r.nearest.distanceMiles <= maxMiles);
  }

  function constraintAtMost(candidate, layerId, maxPct) {
    const r = (candidate.constraints || {})[layerId];
    if (!r) return unknown(`${layerId} was not checked for this parcel`);
    if (r.unevaluated || r.error) {
      return unknown(`${layerId} could not be evaluated${r.error ? `: ${r.error}` : ''}`);
    }
    if (typeof r.pctOfParcel !== 'number') return unknown(`${layerId} produced no percentage`);
    return verdict(r.pctOfParcel <= maxPct);
  }

  /* ── Criteria validation ─────────────────────────────────────────────── */

  function validateCriteria(criteria) {
    const errors = [];
    if (!criteria || typeof criteria !== 'object') return { valid: false, errors: ['criteria must be an object'] };

    for (const [key, value] of Object.entries(criteria)) {
      if (!CRITERIA[key]) { errors.push(`unknown criterion '${key}'`); continue; }
      if (value == null) { errors.push(`criterion '${key}' has no value`); continue;
      }
      if (/^(states|counties|zoningCodes|landUseCodes)$/.test(key)) {
        if (!Array.isArray(value) || !value.length) errors.push(`criterion '${key}' needs a non-empty array`);
      } else if (key === 'ownerKnown') {
        if (typeof value !== 'boolean') errors.push(`criterion 'ownerKnown' must be true or false`);
      } else if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`criterion '${key}' must be a finite number`);
      }
    }

    if (typeof criteria.minAcres === 'number' && typeof criteria.maxAcres === 'number' &&
        criteria.minAcres > criteria.maxAcres) {
      errors.push('minAcres is greater than maxAcres — no parcel can satisfy both');
    }

    return { valid: errors.length === 0, errors };
  }

  /* ── Evaluation ──────────────────────────────────────────────────────── */

  /* Evaluates one candidate against all active criteria.
     Short-circuits on the first FAIL so expensive checks never run for a
     parcel already excluded, but records every criterion it did evaluate so
     the result explains itself. */
  function evaluateCandidate(candidate, criteria) {
    const active = Object.keys(criteria)
      .filter(k => CRITERIA[k])
      .sort((a, b) => CRITERIA[a].cost - CRITERIA[b].cost || a.localeCompare(b));

    const checks = [];
    let failed = null;
    const unknowns = [];

    for (const key of active) {
      const def = CRITERIA[key];
      const res = def.evaluate(candidate, criteria[key]);
      checks.push({ criterion: key, label: def.label, threshold: criteria[key], ...res });

      if (res.verdict === FAIL) { failed = key; break; }
      if (res.verdict === UNKNOWN) unknowns.push(key);
    }

    let outcome;
    if (failed) outcome = 'rejected';
    else if (unknowns.length) outcome = 'indeterminate';
    else outcome = 'matched';

    return {
      outcome,
      checks,
      failedOn: failed,
      unknownCriteria: unknowns,
      // Only meaningful for matched parcels; present on all three so callers
      // can sort a mixed list without special-casing.
      acres: acresOf(candidate),
    };
  }

  /* Runs a search over a bounded candidate set.
   *
   *   candidates: [{ id, geometry, properties, proximity?, constraints?, envelope? }]
   *   criteria:   see CRITERIA
   *   opts.unknownPolicy: 'exclude' (default) | 'include'
   */
  function search(candidates, criteria, opts) {
    const o = opts || {};
    const policy = o.unknownPolicy === 'include' ? 'include' : 'exclude';

    const check = validateCriteria(criteria);
    if (!check.valid) {
      return {
        error: check.errors.join('; '),
        matched: [], rejected: [], indeterminate: [],
        counts: { evaluated: 0, matched: 0, rejected: 0, indeterminate: 0 },
      };
    }

    const matched = [], rejected = [], indeterminate = [];

    for (const candidate of (candidates || [])) {
      if (!candidate) continue;
      const evaluation = evaluateCandidate(candidate, criteria);
      const entry = {
        id: candidate.id ?? prop(candidate, 'parcel_id') ?? null,
        candidate,
        ...evaluation,
      };
      if (evaluation.outcome === 'matched') matched.push(entry);
      else if (evaluation.outcome === 'rejected') rejected.push(entry);
      else indeterminate.push(entry);
    }

    // Largest first: in site discovery, acreage is what the user came for.
    const byAcres = (a, b) => (b.acres ?? 0) - (a.acres ?? 0);
    matched.sort(byAcres);
    indeterminate.sort(byAcres);

    const results = policy === 'include' ? matched.concat(indeterminate) : matched.slice();

    return {
      results,
      matched,
      rejected,
      indeterminate,
      unknownPolicy: policy,
      counts: {
        evaluated: matched.length + rejected.length + indeterminate.length,
        matched: matched.length,
        rejected: rejected.length,
        indeterminate: indeterminate.length,
      },
      /* Present whenever anything could not be fully evaluated. The wording
         is deliberate: a result list is a list of parcels that PASSED THE
         CHECKS WE COULD RUN, which is a narrower claim than "parcels that
         meet your criteria". */
      caveat: indeterminate.length
        ? `${indeterminate.length} parcel(s) could not be fully evaluated because the data ` +
          `needed for one or more criteria is not available for them. They are ` +
          `${policy === 'include' ? 'included in results and flagged' : 'excluded from results'}, ` +
          `not silently treated as passing.`
        : null,
    };
  }

  /* Human-readable explanation of one result, for a "why is this here?"
     affordance. Explanations are what make a screening tool trustworthy —
     a filtered list with no reasoning is indistinguishable from a guess. */
  function explain(entry) {
    if (!entry || !entry.checks) return null;
    return entry.checks.map(c => {
      const value = c.threshold;
      if (c.verdict === PASS) return `${c.label}: meets ${JSON.stringify(value)}`;
      if (c.verdict === FAIL) return `${c.label}: does NOT meet ${JSON.stringify(value)}`;
      return `${c.label}: not evaluated — ${c.why}`;
    });
  }

  function criteriaIds() { return Object.keys(CRITERIA).sort(); }
  function criterionLabel(id) { return CRITERIA[id] ? CRITERIA[id].label : null; }

  return {
    search, evaluateCandidate, validateCriteria, explain,
    criteriaIds, criterionLabel, acresOf,
    CRITERIA, PASS, FAIL, UNKNOWN,
  };
})();
