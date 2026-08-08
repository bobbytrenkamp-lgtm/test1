/* js/parcel/site-intelligence.js
 * window.PARCEL_SITE_INTELLIGENCE — the stable export object.
 *
 * Assembles everything this system knows about a site into one plain,
 * serializable object that another repository or service can consume without
 * knowing anything about this application.
 *
 * TWO CONSUMERS, TWO CONTRACTS
 * ----------------------------
 * `build()` produces the general site-intelligence object: location, parcels,
 * acreage, land use, zoning, infrastructure, constraints, valuations,
 * transactions, market and policy context, and source confidence throughout.
 *
 * `toUnderwritingInputs()` produces a narrower object for a future
 * underwriting handoff, and it enforces the rule that matters most in that
 * direction: OBSERVED FACTS AND UNDERWRITING ASSUMPTIONS STAY SEPARATE.
 * An assessed value is a tax authority's opinion for taxation purposes; it is
 * not a market value and emphatically not a purchase price. This module will
 * hand over the assessed value as an observed fact, clearly labelled, and it
 * will never populate an acquisition-price field from it. Doing that once, in
 * one place, silently, is how a model ends up underwritten on a number nobody
 * chose.
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - NO UI OBJECTS. No DOM nodes, no Leaflet layers, no functions, no class
 *   instances. Everything here must survive JSON.stringify unchanged, because
 *   the consumer is another process.
 * - NO INVENTED VALUES. A section with no data is omitted or explicitly null
 *   with a reason; it is never filled with a default that looks like a
 *   finding.
 * - STABLE SHAPE. The top-level keys are a contract. Adding keys is safe;
 *   renaming or repurposing one breaks consumers silently, so the version
 *   field exists to make a breaking change visible.
 *
 * Depends on: nothing required. Reads optional parcel modules when present.
 */
window.PARCEL_SITE_INTELLIGENCE = (function () {
  'use strict';

  /* Bump the MAJOR component when a key changes meaning or disappears, so a
     consumer can refuse an object it does not understand rather than silently
     reading a field that now means something else. */
  const SCHEMA_VERSION = '1.0.0';

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

  /* Pulls the provenance record for one field into the plain shape a
     consumer can read without loading PARCEL_PROVENANCE. */
  function provenanceFor(props, field) {
    const P = window.PARCEL_PROVENANCE;
    if (!P) return null;
    const rec = P.get(props, field);
    if (!rec) return null;
    return {
      source_id: rec.sourceId,
      source_label: rec.sourceLabel,
      confidence: rec.confidence,
      source_field: rec.sourceField,
      fetched_at: rec.fetchedAt,
      source_updated_at: rec.sourceUpdatedAt,
      derived_from: rec.derivedFrom || null,
    };
  }

  /* Confidence roll-up across the fields that carry a section. Reported as
     the WEAKEST tier present, because a section is only as trustworthy as its
     shakiest populated field — averaging would let one direct-official field
     mask three inferred ones. */
  function sectionConfidence(props, fields) {
    const P = window.PARCEL_PROVENANCE;
    if (!P) return null;
    return P.weakestOf(props, fields);
  }

  function buildLocation(parcels) {
    const GEO = window.PARCEL_GEO;
    const first = parcels[0];
    if (!first || !first.geometry || !GEO) return null;
    const c = GEO.vertexCentroid(first.geometry);
    const props = first.properties || {};
    return {
      // Named to say what it is. This is a representative interior point for
      // labelling, NOT an area centroid and not a survey point.
      representative_point: c ? { lon: c[0], lat: c[1] } : null,
      county_fips: str(props.county_fips),
      state: str(props.state),
      address: str(props.address),
      address_note: props.address
        ? 'Site address as published by the assessor; it identifies the parcel, not a mailing location.'
        : null,
    };
  }

  function buildParcels(parcels) {
    return parcels.map(p => {
      const props = p.properties || {};
      const GEO = window.PARCEL_GEO;
      const acres = numeric(props.area_acres) ??
        (GEO && p.geometry ? round2(GEO.sqmToAcres(GEO.polygonAreaSqm(p.geometry))) : null);
      return {
        parcel_id: str(props.parcel_id) ?? str(p.id),
        pin: str(props.pin),
        county_fips: str(props.county_fips),
        acres,
        acres_source: numeric(props.area_acres) != null ? 'published' : (acres != null ? 'measured-from-geometry' : null),
        zoning_code: str(props.zoning_code),
        land_use_code: str(props.land_use_code),
        land_use_desc: str(props.land_use_desc),
        owner: str(props.owner),
        owner_note: props.owner
          ? 'Owner of record as published. Name matching is not proof of entity identity.'
          : null,
        source: str(props._source),
      };
    });
  }

  function buildValuations(parcels) {
    const rows = [];
    for (const p of parcels) {
      const props = p.properties || {};
      const assessed = numeric(props.assessed_value);
      const land = numeric(props.land_value);
      const improvement = numeric(props.improvement_value);
      if (assessed == null && land == null && improvement == null) continue;

      rows.push({
        parcel_id: str(props.parcel_id) ?? str(p.id),
        assessed_value: assessed,
        land_value: land,
        improvement_value: improvement,
        tax_year: str(props.tax_year),
        provenance: provenanceFor(props, 'assessed_value'),
      });
    }

    return {
      parcels: rows,
      /* Stated in the payload rather than left to the consumer's judgement.
         The single most common misuse of this data is treating an assessed
         value as a market value or a purchase price. */
      note:
        'Assessed values are tax authority determinations for taxation purposes. They are ' +
        'not market values, not appraisals, and not purchase prices. Assessment ratios and ' +
        'reassessment cycles vary by jurisdiction.',
      confidence: rows.length && parcels[0]
        ? sectionConfidence(parcels[0].properties || {}, ['assessed_value', 'land_value', 'improvement_value'])
        : null,
    };
  }

  function buildTransactions(parcels) {
    const SALES = window.PARCEL_SALES;
    if (!SALES) return { available: false, why: 'transaction module not loaded', parcels: [] };

    const rows = [];
    for (const p of parcels) {
      const history = SALES.buildHistory(p.properties || {});
      if (!history.count) continue;
      rows.push({
        parcel_id: str((p.properties || {}).parcel_id) ?? str(p.id),
        sales_history: history.sales.map(s => ({
          sale_date: s.sale_date,
          sale_price: s.sale_price,
          deed_type: s.deed_type,
          classification: s.classification,
          classification_reason: s.classificationReason,
          usable_as_comparable: s.usableAsComparable,
          buyer: s.buyer,
          seller: s.seller,
          source: s.source,
        })),
        market_sale_count: history.marketSaleCount,
        excluded_transfer_count: history.excludedCount,
        most_recent_market_sale: history.mostRecentMarketSale
          ? {
              sale_date: history.mostRecentMarketSale.sale_date,
              sale_price: history.mostRecentMarketSale.sale_price,
            }
          : null,
      });
    }

    return {
      available: rows.length > 0,
      parcels: rows,
      note:
        'Transfers are classified; only those classified as market sales are marked usable. ' +
        'Nominal transfers (gifts, trusts, corrections) and distressed transfers (foreclosure, ' +
        'tax deed) are retained for the record but are not comparable sales.',
    };
  }

  function buildInfrastructure(proximityResult) {
    if (!proximityResult) return { available: false, why: 'no proximity analysis was run', layers: [] };

    const layers = (proximityResult.results || []).map(r => ({
      layer_id: r.layerId,
      label: r.label,
      category: r.category,
      // A layer that errored reports its error rather than a distance, so a
      // consumer cannot read a failure as "nothing nearby".
      error: r.error || null,
      nearest_miles: r.nearest ? r.nearest.distanceMiles : null,
      nearest_name: r.nearest ? r.nearest.name : null,
      on_site: r.nearest ? !!r.nearest.onParcel : null,
      counts_within_miles: r.counts || null,
      beyond_search_radius: r.beyondSearchRadius || false,
      measures: r.measures || null,
      source: r.source || null,
      source_updated_at: r.sourceUpdatedAt || null,
    }));

    return {
      available: layers.length > 0,
      layers,
      /* Unavailable layers travel with the payload. A consumer that sees no
         fiber row must be able to tell "we have no fiber data" from "there is
         no fiber nearby". */
      unavailable: (proximityResult.unavailable || []).map(u => ({
        layer_id: u.layerId, category: u.category, reason: u.reason,
      })),
      note: 'Distances are straight-line from the parcel boundary. Proximity is not capacity: ' +
            'nearness to a line or substation says nothing about available headroom or ' +
            'willingness to serve.',
    };
  }

  function buildConstraints(constraintResult) {
    if (!constraintResult) return { available: false, why: 'no constraint analysis was run', layers: [] };

    const s = constraintResult.summary || {};
    return {
      available: true,
      parcel_acres: constraintResult.parcelAcres ?? null,
      layers: (constraintResult.results || []).map(r => ({
        layer_id: r.layerId,
        label: r.label,
        constraint_class: r.constraintClass,
        intersects: !!r.intersects,
        acres: r.areaAcres ?? null,
        pct_of_parcel: r.pctOfParcel ?? null,
        // The distinction a consumer must not lose.
        evaluated: !r.unevaluated && !r.error,
        error: r.error || null,
        why_unevaluated: r.why || null,
        source: r.source || null,
        source_updated_at: r.sourceUpdatedAt || null,
        caveat: r.caveat || null,
      })),
      unavailable: (constraintResult.unavailable || []).map(u => ({
        layer_id: u.layerId, constraint_class: u.constraintClass, reason: u.reason,
      })),
      summary: {
        constrained_acres: s.constrainedAcres ?? null,
        constrained_pct: s.constrainedPct ?? null,
        unconstrained_by_checked_layers_acres: s.unconstrainedByCheckedLayersAcres ?? null,
        layers_evaluated: s.layersEvaluated ?? null,
        layers_unevaluated: s.layersUnevaluated ?? null,
        partial: !!s.partial,
        disclaimer: s.disclaimer || null,
      },
    };
  }

  function buildEnvelope(envelope) {
    if (!envelope) return { available: false, why: 'no conceptual envelope was computed' };
    return {
      available: true,
      conceptual: true,
      gross_acres: envelope.grossAcres ?? null,
      constrained_acres: envelope.constrainedAcres ?? null,
      conceptual_usable_acres: envelope.conceptualUsableAcres ?? null,
      conceptual_max_footprint_sqft: envelope.conceptualMaxFootprintSqft ?? null,
      possible_site_coverage_pct: envelope.possibleSiteCoveragePct ?? null,
      footprint_limited_by: envelope.footprintLimitedBy ?? null,
      setback_ft: envelope.setbackFt ?? null,
      partial: !!envelope.partial,
      // The step ledger is exported so a consumer can tell exact geometry
      // from an area estimate rather than treating both as measurements.
      steps: (envelope.steps || []).map(s => ({
        step: s.step, method: s.method, applied: !!s.applied,
        produces_geometry: !!s.producesGeometry, note: s.note || s.why || null,
      })),
      derived_from: ['parcel_geometry', 'mapped_constraints', 'zoning_setbacks'],
      disclaimer: envelope.disclaimer || null,
    };
  }

  function buildAssemblage(assemblageResult) {
    if (!assemblageResult) return null;
    return {
      parcel_count: assemblageResult.parcelCount,
      combined_acres: assemblageResult.combinedAcres,
      contiguous: !!assemblageResult.contiguous,
      contiguous_group_count: (assemblageResult.groups || []).length,
      largest_contiguous_acres: assemblageResult.largestContiguousAcres,
      distinct_owners: assemblageResult.ownership ? assemblageResult.ownership.distinctOwners : null,
      unknown_owner_parcels: assemblageResult.ownership ? assemblageResult.ownership.unknownOwnerParcels : null,
      zoning_districts: assemblageResult.zoningMix ? assemblageResult.zoningMix.distinct : null,
      gaps: (assemblageResult.gaps || []).map(g => ({
        separation_feet: g.separationFeet, relation: g.relation,
      })),
      notes: assemblageResult.notes || [],
    };
  }

  function buildScore(scoreResult) {
    if (!scoreResult) return { available: false, why: 'no suitability score was computed' };
    return {
      available: scoreResult.scorable !== false,
      overall: scoreResult.overall,
      components: (scoreResult.components || []).map(c => ({
        component: c.component, label: c.label, weight: c.weight,
        score: c.score, inputs: c.inputs, rule: c.rule,
      })),
      omitted: (scoreResult.omitted || []).map(o => ({
        component: o.component, weight: o.weight, why: o.why,
      })),
      coverage_pct: scoreResult.coverage ? scoreResult.coverage.availablePct : null,
      confidence: scoreResult.confidence || null,
      basis: scoreResult.basis || null,
      disclaimer: scoreResult.disclaimer || null,
    };
  }

  function buildPolicyContext(fips) {
    const index = (typeof window !== 'undefined' && window.DC_RISK_BY_FIPS) || null;
    if (!index || !fips) return { available: false, why: 'no policy index loaded for this county' };
    const rec = index[String(fips).padStart(5, '0')];
    if (!rec) return { available: false, why: 'this county is not in the policy risk index' };
    return {
      available: true,
      county_fips: String(fips).padStart(5, '0'),
      risk_score: numeric(rec.risk_score ?? rec.raw_score),
      scale: '1 (very favorable) to 5 (high political risk)',
      note: 'A forward-looking indicator of the likelihood of future restrictions, not a ' +
            'record of current law or a statement about any pending application.',
    };
  }

  /* Assembles the full object.
   *
   *   input = {
   *     site_id?, parcels: [{ id, geometry, properties }],
   *     proximity?, constraints?, envelope?, assemblage?, score?
   *   }
   */
  function build(input) {
    const i = input || {};
    const parcels = (i.parcels || []).filter(p => p && p.properties);
    const primary = parcels[0] || null;
    const props = primary ? (primary.properties || {}) : {};
    const fips = str(props.county_fips) || str(i.county_fips);

    const parcelRows = buildParcels(parcels);
    const totalAcres = i.assemblage && i.assemblage.combinedAcres != null
      ? i.assemblage.combinedAcres
      : parcelRows.reduce((sum, p) => sum + (p.acres || 0), 0);

    return {
      schema_version: SCHEMA_VERSION,
      site_id: str(i.site_id) ?? (parcelRows.length ? parcelRows.map(p => p.parcel_id).join('+') : null),
      generated_by: 'test1 parcel site intelligence',

      location: buildLocation(parcels),
      parcels: parcelRows,

      acreage: {
        // When several parcels are present this is the assemblage UNION, not
        // a sum, because parcel polygons can overlap. The basis is stated so
        // a consumer knows which it is.
        total_acres: round2(totalAcres),
        basis: i.assemblage
          ? 'union of parcel polygons (overlaps counted once)'
          : (parcelRows.length > 1 ? 'sum of parcel acreages' : 'single parcel'),
        parcel_count: parcelRows.length,
      },

      land_use: {
        codes: uniq(parcelRows.map(p => p.land_use_code).filter(Boolean)),
        descriptions: uniq(parcelRows.map(p => p.land_use_desc).filter(Boolean)),
      },
      zoning: {
        codes: uniq(parcelRows.map(p => p.zoning_code).filter(Boolean)),
        note: 'Zoning district as published. District compatibility is not the same as a ' +
              'determination that a particular use is permitted on this parcel.',
        confidence: sectionConfidence(props, ['zoning_code']),
      },

      infrastructure: buildInfrastructure(i.proximity),
      constraints: buildConstraints(i.constraints),
      conceptual_buildable_area: buildEnvelope(i.envelope),
      assemblage: buildAssemblage(i.assemblage),

      valuations: buildValuations(parcels),
      transactions: buildTransactions(parcels),

      market_context: {
        nearby_data_centers: i.proximity && i.proximity.results
          ? (i.proximity.results.find(r => r.layerId === 'data-centers') || {}).counts || null
          : null,
        nearest_data_center_miles: i.proximity && i.proximity.results
          ? ((i.proximity.results.find(r => r.layerId === 'data-centers') || {}).nearest || {}).distanceMiles ?? null
          : null,
      },
      policy_context: buildPolicyContext(fips),

      suitability: buildScore(i.score),

      source_confidence: {
        by_section: {
          ownership: sectionConfidence(props, ['owner', 'owner_mailing']),
          valuation: sectionConfidence(props, ['assessed_value', 'land_value', 'improvement_value']),
          zoning: sectionConfidence(props, ['zoning_code']),
          transactions: sectionConfidence(props, ['last_sale_date', 'last_sale_price']),
        },
        model: 'direct-official > official-joined > official-derived > third-party-mirror > inferred > unknown',
        note: 'Confidence describes how directly a value came from its publisher, not whether ' +
              'the value is correct. A joined value reached this record through a key match ' +
              'this system performed.',
      },

      limitations: [
        'Assembled from public government data of varying age, completeness, and precision.',
        'Not a survey, title report, appraisal, wetland delineation, or engineering study.',
        'Mapped constraints reflect published layers only; absence of a mapping is not absence of a condition.',
        'Conceptual usable acreage is a planning estimate, not legally buildable acreage.',
        'Suitability is a screening score for ranking candidates, not a determination of developability.',
      ],
    };
  }

  /* Underwriting handoff.
   *
   * Deliberately structured as two disjoint blocks. `observed` holds facts
   * this system read from public records. `assumptions_required` names the
   * inputs an underwriting model needs and that this system CANNOT supply —
   * each one present as an explicit null with a reason, so the consumer is
   * forced to decide rather than inheriting a default.
   *
   * The acquisition price is the important one: an assessed value is not a
   * purchase price, and nothing here will populate it from one. */
  function toUnderwritingInputs(siteIntelligence) {
    const si = siteIntelligence || {};
    const valuation = (si.valuations && si.valuations.parcels && si.valuations.parcels[0]) || null;
    const tx = (si.transactions && si.transactions.parcels && si.transactions.parcels[0]) || null;
    const lastMarketSale = tx ? tx.most_recent_market_sale : null;

    return {
      schema_version: SCHEMA_VERSION,
      site_id: si.site_id ?? null,

      observed: {
        land_acres: si.acreage ? si.acreage.total_acres : null,
        conceptual_usable_acres: si.conceptual_buildable_area && si.conceptual_buildable_area.available
          ? si.conceptual_buildable_area.conceptual_usable_acres : null,
        zoning_codes: si.zoning ? si.zoning.codes : [],
        land_use_codes: si.land_use ? si.land_use.codes : [],
        county_fips: si.location ? si.location.county_fips : null,

        assessed_value: valuation ? valuation.assessed_value : null,
        land_value: valuation ? valuation.land_value : null,
        tax_year: valuation ? valuation.tax_year : null,
        assessed_value_note:
          'A tax authority determination for taxation purposes. NOT a market value, NOT an ' +
          'appraisal, and NOT a purchase price. Do not use as an acquisition assumption.',

        last_market_sale_date: lastMarketSale ? lastMarketSale.sale_date : null,
        last_market_sale_price: lastMarketSale ? lastMarketSale.sale_price : null,
        last_market_sale_note: lastMarketSale
          ? 'A prior arms-length transaction. It is evidence of past value, not the price of ' +
            'a future acquisition.'
          : 'No transfer on record could be classified as a market sale.',

        mapped_constraint_pct: si.constraints && si.constraints.summary
          ? si.constraints.summary.constrained_pct : null,
        constraint_analysis_partial: si.constraints && si.constraints.summary
          ? !!si.constraints.summary.partial : null,
      },

      assumptions_required: {
        acquisition_price: {
          value: null,
          why: 'No public record establishes what this site would sell for. Assessed values and ' +
               'prior sales are observed facts, not acquisition assumptions, and this system ' +
               'will not populate this field from either.',
        },
        is_for_sale: {
          value: null,
          why: 'Listing status is not published in any public parcel record.',
        },
        power_capacity_mw: {
          value: null,
          why: 'Available capacity cannot be inferred from infrastructure proximity. Only an ' +
               'interconnection study answers it.',
        },
        entitlement_path: {
          value: null,
          why: 'Whether the intended use is permitted here requires reading the ordinance and ' +
               'confirming with the jurisdiction; zoning district compatibility is not a ' +
               'determination.',
        },
        development_cost: {
          value: null,
          why: 'Site work, grading, stormwater, and utility extension costs require a site ' +
               'engineer and are outside this system entirely.',
        },
      },

      separation_note:
        'The observed block contains facts read from public records. The assumptions_required ' +
        'block names inputs this system deliberately does not supply. Nothing in observed ' +
        'should be copied into an assumption field without an explicit human decision.',
    };
  }

  function uniq(arr) { return Array.from(new Set(arr)); }
  function round2(n) { return Math.round((n || 0) * 100) / 100; }

  /* Guards the no-UI-objects rule at runtime. Returns problems rather than
     throwing, so a caller can log them without breaking a panel. */
  function validate(obj) {
    const problems = [];
    /* Tracks the ANCESTORS on the current path, not everything ever visited.
       A node appearing twice in different branches is a shared reference,
       which JSON.stringify handles fine by writing it out twice — only a node
       that contains itself is circular. Using a visited-set here would flag
       every legitimately shared sub-object (the same counts object appearing
       under both infrastructure and market_context) as a defect. */
    const ancestors = new Set();

    (function walk(node, path) {
      if (node == null) return;
      const type = typeof node;
      if (type === 'function') { problems.push(`${path} is a function`); return; }
      if (type !== 'object') return;
      if (ancestors.has(node)) { problems.push(`${path} is a circular reference`); return; }
      ancestors.add(node);

      if (typeof Node !== 'undefined' && node instanceof Node) {
        problems.push(`${path} is a DOM node`); return;
      }
      const ctor = node.constructor && node.constructor.name;
      if (ctor && ctor !== 'Object' && ctor !== 'Array') {
        problems.push(`${path} is a ${ctor} instance, not a plain object`);
        return;
      }
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
      ancestors.delete(node);
    })(obj, 'root');

    return { valid: problems.length === 0, problems };
  }

  return { build, toUnderwritingInputs, validate, SCHEMA_VERSION };
})();
