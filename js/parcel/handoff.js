/* js/parcel/handoff.js — builds and downloads a `creos-handoff-v1` payload
   for a single parcel (Phase 5: SiteIntel -> Underwrite handoff).

   Depends on:
     - window.generateCreosUlid / window.creosDisplayId  (js/creos-ids.js)
     - window.PARCEL_SCHEMA.format                        (js/parcel/schema.js)
     - window.PARCEL_SITE_INTELLIGENCE.toUnderwritingInputs (js/parcel/site-intelligence.js)

   Target schema (not duplicated here, this file must stay in sync with it
   by hand — no shared package exists between this app and test4):
   test4's src/domain/handoff.ts (HandoffSchema), property.ts (PropertySchema),
   assumption.ts (AssumptionSchema). See docs/HANDOFF_DESIGN.md in that repo
   for the transport design (JSON export/import, no backend).

   Translation-layer decisions (see docs/CREOS_IDS.md's Phase 5 note for the
   long version):

   1. `identity.address` is left OMITTED. PropertySchema requires a
      structured { line1, city, state, postalCode } object, and this app's
      parcel data has only a single-line `address` string plus, sometimes,
      `county_fips`/`state` -- never a decomposed city or postal code.
      Fabricating city/postalCode to satisfy the schema would violate this
      project's no-fabricated-data rule. The raw address/state/county
      strings travel instead as `observations[]` entries (category
      'identity'), and `propertyName` carries the human-readable address so
      it isn't lost.

   2. `classification.propertyType` is always 'land'. SiteIntel evaluates
      raw parcels for site acquisition/entitlement, not completed, occupied
      buildings -- 'land' is the truthful default even when a parcel
      happens to carry an existing structure (building_count/year_built).
      This app has no zoning-code -> office/retail/multifamily/etc.
      classification table, and guessing one would fabricate a
      determination SiteIntel does not actually make. The real zoning/land
      use codes still travel as `subtype` and as observations.

   3. `assumptions_required` (from toUnderwritingInputs) is NEVER included.
      Every entry in that block is a deliberate null -- "SiteIntel cannot
      answer this" -- and AssumptionSchema's value types have no null
      variant. Writing a placeholder value would fabricate data SiteIntel
      explicitly refuses to supply (acquisition_price above all). Only
      `observed` facts become `observations[]` entries; a field with a
      null/empty observed value is simply omitted, not sent as a null.

   4. SiteIntel's confidence vocabulary ('direct-official' > 'official-
      joined' > 'official-derived' > 'third-party-mirror' > 'inferred' >
      'unknown', js/parcel/provenance.js) is mapped onto CREOS's
      ('low'|'medium'|'high'|'verified') via a fixed, documented table
      (CONFIDENCE_MAP below) rather than left unmapped -- but 'unknown'
      maps to "omit the field" rather than guessing a CREOS tier. */
(function () {
  'use strict';

  var SCHEMA_VERSION = 'creos-handoff-v1';

  var CONFIDENCE_MAP = {
    'direct-official': 'verified',
    'official-joined': 'high',
    'official-derived': 'medium',
    'third-party-mirror': 'medium',
    inferred: 'low',
    unknown: null,
  };

  function mapConfidence(tier) {
    if (!tier) return undefined;
    var mapped = CONFIDENCE_MAP[tier];
    return mapped || undefined;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isIsoCalendarDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T00:00:00.000Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  /* One observed field -> one creos-handoff-v1 Assumption-shaped record.
     Returns null (meaning: omit) for a null/undefined/empty value -- see
     decision #3 in the file header. */
  function observation(opts) {
    var raw = opts.value;
    if (raw === null || raw === undefined || raw === '') return null;

    var valueType = opts.valueType;
    var value = raw;
    if (valueType === 'number') {
      var n = Number(raw);
      if (!Number.isFinite(n)) return null;
      value = n;
    } else if (valueType === 'date') {
      var display = window.PARCEL_SCHEMA ? window.PARCEL_SCHEMA.format(opts.dateFieldId, raw) : String(raw);
      if (isIsoCalendarDate(display)) {
        value = display;
      } else {
        // Upstream date isn't a clean ISO calendar date (unknown source
        // format) -- carry it faithfully as a string rather than guessing
        // a date that might misrepresent it.
        valueType = 'string';
        value = String(raw);
      }
    } else {
      value = String(raw);
    }

    var ts = nowIso();
    var record = {
      assumptionId: window.generateCreosUlid(),
      name: opts.name,
      category: opts.category,
      valueType: valueType,
      value: value,
      sourceType: 'observed',
      sourceModule: 'siteintel',
      status: 'proposed',
      createdAt: ts,
      updatedAt: ts,
    };
    if (opts.unit) record.unit = opts.unit;
    var confidence = mapConfidence(opts.confidenceTier);
    if (confidence) record.confidence = confidence;
    if (opts.methodology) record.methodology = String(opts.methodology);
    return record;
  }

  var PROPERTY_TYPE = 'land'; // see decision #2 above

  function buildProperty(props, si, jurisdictionId) {
    var addressLine = props.address ? String(props.address) : null;
    var propertyName = addressLine || (props.parcel_id ? 'Parcel ' + props.parcel_id : 'Unnamed parcel');
    var ts = nowIso();

    var property = {
      identity: {
        propertyId: window.generateCreosUlid(),
        propertyName: propertyName,
      },
      classification: {
        propertyType: PROPERTY_TYPE,
      },
      metadata: {
        createdAt: ts,
        updatedAt: ts,
      },
    };

    var landUseCodes = si && si.land_use ? si.land_use.codes : null;
    if (landUseCodes && landUseCodes.length) {
      property.classification.subtype = landUseCodes.join(', ');
    }

    var point = si && si.location ? si.location.representative_point : null;
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lon)) {
      property.location = { latitude: point.lat, longitude: point.lon };
    }

    var totalAcres = si && si.acreage ? si.acreage.total_acres : null;
    var grossFloorArea = props.gross_floor_area != null ? Number(props.gross_floor_area)
      : props.area_sqft != null ? Number(props.area_sqft) : null;

    var physical = {};
    if (Number.isFinite(totalAcres) && totalAcres > 0) physical.landArea = { value: totalAcres, unit: 'acre' };
    if (Number.isFinite(grossFloorArea) && grossFloorArea > 0) physical.buildingArea = { value: grossFloorArea, unit: 'sf' };
    if (props.building_count != null && Number.isFinite(Number(props.building_count))) {
      physical.units = { value: Number(props.building_count), unit: 'units' };
    }
    if (props.year_built != null && Number.isFinite(Number(props.year_built))) {
      physical.yearBuilt = Number(props.year_built);
    }
    if (Object.keys(physical).length) property.physical = physical;

    var jurisdiction = (props.county_fips && String(props.county_fips)) || (jurisdictionId && String(jurisdictionId)) || null;
    if (props.parcel_id && jurisdiction) {
      property.parcel = { parcelId: String(props.parcel_id), jurisdiction: jurisdiction };
    }

    return property;
  }

  function buildObservations(props, si, uw) {
    var conf = (si && si.source_confidence && si.source_confidence.by_section) || {};
    var observed = (uw && uw.observed) || {};
    var out = [];

    function push(rec) {
      var built = observation(rec);
      if (built) out.push(built);
    }

    push({ name: 'Site address', category: 'identity', valueType: 'string', value: props.address });
    push({ name: 'State', category: 'identity', valueType: 'string', value: props.state });
    push({ name: 'County FIPS', category: 'identity', valueType: 'string', value: observed.county_fips || props.county_fips });
    push({ name: 'Owner of record', category: 'identity', valueType: 'string', value: props.owner, confidenceTier: conf.ownership });

    push({ name: 'Land area', category: 'physical', unit: 'acre', valueType: 'number', value: observed.land_acres });
    push({
      name: 'Conceptual usable land area', category: 'physical', unit: 'acre', valueType: 'number',
      value: observed.conceptual_usable_acres, confidenceTier: 'inferred',
      methodology: 'Planning estimate from mapped constraints, not legally buildable acreage.',
    });

    push({ name: 'Zoning code(s)', category: 'zoning', valueType: 'string', value: (observed.zoning_codes || []).join(', '), confidenceTier: conf.zoning });
    push({ name: 'Land use code(s)', category: 'zoning', valueType: 'string', value: (observed.land_use_codes || []).join(', ') });

    push({
      name: 'Assessed value', category: 'valuation', unit: 'USD', valueType: 'number',
      value: observed.assessed_value, confidenceTier: conf.valuation, methodology: observed.assessed_value_note,
    });
    push({ name: 'Assessed land value', category: 'valuation', unit: 'USD', valueType: 'number', value: observed.land_value, confidenceTier: conf.valuation });
    push({ name: 'Tax year', category: 'valuation', valueType: 'number', value: observed.tax_year, confidenceTier: conf.valuation });

    push({
      name: 'Most recent market sale date', category: 'transaction', valueType: 'date', dateFieldId: 'last_sale_date',
      value: observed.last_market_sale_date, confidenceTier: conf.transactions, methodology: observed.last_market_sale_note,
    });
    push({
      name: 'Most recent market sale price', category: 'transaction', unit: 'USD', valueType: 'number',
      value: observed.last_market_sale_price, confidenceTier: conf.transactions, methodology: observed.last_market_sale_note,
    });

    push({
      name: 'Mapped constraint coverage', category: 'constraints', unit: 'percent', valueType: 'number',
      value: observed.mapped_constraint_pct,
      confidenceTier: observed.constraint_analysis_partial ? 'inferred' : null,
      methodology: observed.constraint_analysis_partial ? 'Constraint mapping for this parcel is partial -- absence of a mapped constraint is not absence of a condition.' : null,
    });

    return out;
  }

  /* Pure: builds the payload object. No DOM access, so this is directly
     unit-testable under plain Node (see tests/test_handoff_export.mjs). */
  function build(opts) {
    opts = opts || {};
    var feature = opts.feature;
    if (!feature) throw new Error('PARCEL_HANDOFF.build: opts.feature is required');
    if (typeof window.generateCreosUlid !== 'function') {
      throw new Error('PARCEL_HANDOFF.build: window.generateCreosUlid is not available (js/creos-ids.js not loaded)');
    }

    var props = feature.properties || {};
    var si = opts.siteIntelligence || null;
    var uw = si && window.PARCEL_SITE_INTELLIGENCE ? window.PARCEL_SITE_INTELLIGENCE.toUnderwritingInputs(si) : null;

    return {
      schemaVersion: SCHEMA_VERSION,
      handoffId: window.generateCreosUlid(),
      createdAt: nowIso(),
      sourceModule: 'siteintel',
      targetModule: 'underwrite',
      sourceApplicationVersion: 'siteintel-parcel-explorer',
      property: buildProperty(props, si, opts.jurisdictionId),
      observations: buildObservations(props, si, uw),
      assumptions: [],
      provenance: [],
      sources: [],
    };
  }

  /* Impure: triggers a browser file download. Mirrors the existing
     Blob + <a download> pattern already used for CSV export in
     js/parcel/panel.js (_exportSavedCSV/_exportCSV) -- same idiom, JSON
     content instead of CSV. */
  function download(payload, filename) {
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var propId = payload && payload.property && payload.property.identity ? payload.property.identity.propertyId : null;
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || ('creos-handoff-' + (propId ? propId.slice(-8) : 'export') + '-' + new Date().toISOString().slice(0, 10) + '.json');
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  window.PARCEL_HANDOFF = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    build: build,
    download: download,
  };
})();
