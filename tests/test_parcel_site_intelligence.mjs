/* tests/test_parcel_site_intelligence.mjs — the cross-repo export object.

   This object leaves the application, so the tests check the contract rather
   than the values: that it survives JSON round-tripping with no UI objects or
   functions in it, that a failed check never exports as a clean zero, and —
   most importantly — that the underwriting handoff never populates an
   acquisition price from an assessed value.

   Run:  node tests/test_parcel_site_intelligence.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

global.polygonClipping = require('../js/vendor/polygon-clipping.umd.min.js');
require('../js/parcel/schema.js');
require('../js/parcel/provenance.js');
require('../js/parcel/geo.js');
require('../js/parcel/sales.js');
require('../js/parcel/site-intelligence.js');

const SI = global.PARCEL_SITE_INTELLIGENCE;
const PROV = global.PARCEL_PROVENANCE;

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

const geom = { type: 'Polygon', coordinates: [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]] };

function richInput() {
  const props = {
    parcel_id: 'A-1', county_fips: '51107', state: 'VA', address: '123 Data Center Way',
    area_acres: 120, zoning_code: 'I-1', land_use_code: 'I', land_use_desc: 'Industrial',
    owner: 'ACME LAND LLC', assessed_value: 4200000, land_value: 3000000, tax_year: '2025',
    last_sale_date: '2023-06-01', last_sale_price: 3600000, deed_type: 'WARRANTY DEED',
  };
  PROV.attach(props, 'assessed_value', PROV.record({
    sourceId: 'loudoun-cama', sourceLabel: 'Loudoun CAMA', confidence: 'official-joined', sourceField: 'TOTVAL',
  }));
  PROV.attach(props, 'owner', PROV.record({ sourceId: 'loudoun-cama', confidence: 'official-joined' }));

  return {
    site_id: 'SITE-1',
    parcels: [{ id: 'A-1', geometry: geom, properties: props }],
    proximity: {
      results: [
        { layerId: 'substations', label: 'Substations', category: 'power',
          nearest: { distanceMiles: 1.4, name: 'Sterling Sub', onParcel: false }, counts: { 1: 0, 3: 2, 5: 3, 10: 6 },
          measures: 'Distance only. Says nothing about capacity.' },
        { layerId: 'data-centers', label: 'Data centers', category: 'market',
          nearest: { distanceMiles: 0.9, name: 'AWS Ashburn' }, counts: { 1: 1, 3: 5, 5: 12, 10: 40 } },
        { layerId: 'interstates', label: 'Interstates', category: 'transportation',
          error: 'BTS service HTTP 503', nearest: null, counts: {} },
      ],
      unavailable: [{ layerId: 'fiber', category: 'telecom', reason: 'No free reliable nationwide fiber route data exists.' }],
    },
    constraints: {
      parcelAcres: 120,
      results: [
        { layerId: 'fema-flood', label: 'FEMA flood', constraintClass: 'flood',
          intersects: true, areaAcres: 14.4, pctOfParcel: 12, source: 'FEMA NFHL', sourceUpdatedAt: '2024-03-01',
          caveat: 'FEMA maps are coarse.' },
        { layerId: 'nwi-wetlands', label: 'Wetlands', constraintClass: 'wetland',
          unevaluated: true, error: 'NWI HTTP 503', why: 'service failed' },
      ],
      unavailable: [{ layerId: 'steep-slope', constraintClass: 'slope', reason: 'needs a raster pipeline' }],
      summary: {
        constrainedAcres: 14.4, constrainedPct: 12, unconstrainedByCheckedLayersAcres: 105.6,
        layersEvaluated: 1, layersUnevaluated: 1, partial: true,
        disclaimer: 'Mapped constraints only. Additional due diligence is required.',
      },
    },
    envelope: {
      grossAcres: 120, constrainedAcres: 14.4, conceptualUsableAcres: 98.2,
      conceptualMaxFootprintSqft: 2600000, possibleSiteCoveragePct: 49.7,
      footprintLimitedBy: 'zoning-lot-coverage', setbackFt: 25, partial: false,
      steps: [
        { step: 'constraints', method: 'exact-polygon-difference', applied: true, producesGeometry: true },
        { step: 'setbacks', method: 'steiner-inner-parallel-body-area', applied: true, producesGeometry: false,
          note: 'Area estimate only.' },
      ],
      disclaimer: 'Conceptual planning estimate.',
    },
    score: {
      scorable: true, overall: 78,
      components: [{ component: 'power', label: 'Power', weight: 25, score: 88, inputs: {}, rule: 'Distance curves.' }],
      omitted: [{ component: 'access', label: 'Access', weight: 12, why: 'the data was not available' }],
      coverage: { availablePct: 62 }, confidence: 'moderate',
      basis: 'Weighted mean of 1 component(s).', disclaimer: 'Screening score only.',
    },
  };
}

// ── Shape and serializability ──────────────────────────────────────────────
{
  const si = SI.build(richInput());

  t('the schema version is exported', si.schema_version, SI.SCHEMA_VERSION);
  t('the site id is carried through', si.site_id, 'SITE-1');

  // The contract: this leaves the process.
  const v = SI.validate(si);
  ok('the object contains no functions, DOM nodes, or class instances', v.valid);
  if (!v.valid) console.log('   problems:', v.problems);

  const roundTripped = JSON.parse(JSON.stringify(si));
  t('it survives a JSON round trip unchanged', roundTripped, si);

  // Every top-level key a consumer contracts against.
  for (const key of ['location', 'parcels', 'acreage', 'land_use', 'zoning', 'infrastructure',
                     'constraints', 'conceptual_buildable_area', 'valuations', 'transactions',
                     'market_context', 'policy_context', 'suitability', 'findings', 'site_status',
                     'source_confidence', 'limitations']) {
    ok(`the contract key "${key}" is present`, si[key] !== undefined);
  }
}

// ── Zoning feasibility, findings, and site_status: no feasibility engine loaded ──
// PARCEL_FEASIBILITY is not required by this test file's own module list, so
// this section proves the schema degrades honestly rather than crashing or
// inventing a result when that optional module is absent.
{
  const si = SI.build(richInput());
  t('zoning.feasibility is null when the feasibility engine is not loaded', si.zoning.feasibility, null);
  ok('an unassessed zoning read produces an "unknowns" finding, not a guess',
    si.findings.unknowns.some(u => u.category === 'zoning'));
  t('site_status is insufficient_data with no zoning and no constraint data',
    SI.build({ parcels: [{ id: 'G', geometry: geom, properties: { parcel_id: 'G' } }] }).site_status,
    'insufficient_data');
  ok('unevaluated constraint layers still surface as unknowns without a feasibility engine',
    si.findings.unknowns.some(u => u.category === 'environmental' && /could not be evaluated/.test(u.statement)));
  ok('constraint layers with no available data source also surface as unknowns',
    si.findings.unknowns.some(u => u.category === 'environmental' && /no data source available/.test(u.statement)));
  ok('a nearby substation (1.4 miles) is surfaced as an advantage',
    si.findings.advantages.some(a => a.category === 'power' && /1\.4 miles/.test(a.statement)));
  ok('proximity is explicitly disclaimed as not being capacity',
    si.findings.unknowns.some(u => u.category === 'power' && u.statement.includes('not evidence of available interconnection capacity')));
  ok('a failed proximity layer never becomes a finding',
    !si.findings.advantages.some(a => /Interstates/i.test(a.statement)) &&
    !si.findings.constraints.some(c => /Interstates/i.test(c.statement)));
  ok('a region with no mapped fiber coverage gets no invented telecom finding',
    !si.findings.advantages.some(a => a.category === 'telecom') &&
    !si.findings.unknowns.some(u => u.category === 'telecom'));
}

// ── Findings must consider EVERY layer in a category, not just the first ──
// Regression: buildFindings originally used results.find(r => r.category ===
// 'power'), which silently ignores a second power-category layer
// (substations AND transmission-lines both use "power") whenever the first
// one in the array happened to have no usable distance or an error.
{
  const si = SI.build({
    site_id: 'MULTI-POWER', parcels: [{ id: 'M-1', geometry: geom, properties: { parcel_id: 'M-1' } }],
    proximity: {
      results: [
        { layerId: 'substations', label: 'Substations', category: 'power', error: 'HTTP 503', nearest: null, counts: {} },
        { layerId: 'transmission-lines', label: 'Transmission Lines', category: 'power',
          nearest: { distanceMiles: 0.8, name: 'Line 4821' }, counts: { 1: 1, 3: 2, 5: 4, 10: 9 } },
      ],
      unavailable: [],
    },
  });
  ok('the second power-category layer is used when the first one errored',
    si.findings.advantages.some(a => a.category === 'power' && /0\.8 miles/.test(a.statement)));

  const swapped = SI.build({
    site_id: 'MULTI-POWER-2', parcels: [{ id: 'M-2', geometry: geom, properties: { parcel_id: 'M-2' } }],
    proximity: {
      results: [
        { layerId: 'transmission-lines', label: 'Transmission Lines', category: 'power',
          nearest: { distanceMiles: 5, name: 'Line X' }, counts: {} },
        { layerId: 'substations', label: 'Substations', category: 'power',
          nearest: { distanceMiles: 1.1, name: 'Nearby Sub' }, counts: {} },
      ],
      unavailable: [],
    },
  });
  ok('the NEAREST power result wins across layers, regardless of array order',
    swapped.findings.advantages.some(a => a.category === 'power' && /1\.1 miles/.test(a.statement)) &&
    !swapped.findings.advantages.some(a => a.category === 'power' && /5 miles/.test(a.statement)));
}

// ── Fiber/telecom proximity, when real coverage exists ─────────────────────
{
  const si = SI.build({
    site_id: 'FIBER-1', parcels: [{ id: 'F-1', geometry: geom, properties: { parcel_id: 'F-1' } }],
    proximity: {
      results: [
        { layerId: 'tx-fiberlight-network', label: 'TX Fiberlight Network', category: 'telecom',
          nearest: { distanceMiles: 0.4, name: 'Fiberlight route' }, counts: {} },
      ],
      unavailable: [],
    },
  });
  ok('a nearby mapped fiber route is surfaced as an advantage',
    si.findings.advantages.some(a => a.category === 'telecom' && /0\.4 miles/.test(a.statement)));
  ok('fiber proximity is disclaimed as not being capacity or lit service',
    si.findings.unknowns.some(u => u.category === 'telecom' && /not evidence of available strand capacity/.test(u.statement)));

  const far = SI.build({
    site_id: 'FIBER-2', parcels: [{ id: 'F-2', geometry: geom, properties: { parcel_id: 'F-2' } }],
    proximity: {
      results: [
        { layerId: 'tx-fiberlight-network', label: 'TX Fiberlight Network', category: 'telecom',
          nearest: { distanceMiles: 15, name: 'Fiberlight route' }, counts: {} },
      ],
      unavailable: [],
    },
  });
  ok('a distant fiber route is not claimed as an advantage', !far.findings.advantages.some(a => a.category === 'telecom'));
  ok('but the capacity disclaimer still travels since real fiber data exists',
    far.findings.unknowns.some(u => u.category === 'telecom'));
}

// ── Zoning feasibility, findings, and site_status: feasibility engine loaded ──
{
  const mockZoningData = {
    '51107': {
      districts: {
        'PD-IP': {
          district_name: 'Planned Development - Industrial Park',
          uses: [{ standardized_use_id: 'data_center', permission_status: 'permitted_by_right', confidence_level: 'moderate' }],
        },
        'AR1': {
          district_name: 'Agricultural Rural',
          uses: [{ standardized_use_id: 'data_center', permission_status: 'prohibited', confidence_level: 'moderate' }],
        },
        'B2': {
          district_name: 'Community Business',
          uses: [{ standardized_use_id: 'data_center', permission_status: 'special_use_permit', confidence_level: 'moderate' }],
        },
        'PD-OP': {
          district_name: 'Planned Development - Office Park',
          uses: [{ standardized_use_id: 'data_center', permission_status: 'not_listed', confidence_level: 'low' }],
        },
      },
      jurisdiction: { jurisdiction_name: 'Loudoun County, VA' },
      disclaimer: 'Test disclaimer',
    },
  };
  global.window.ZONING = {
    getCachedByFips: (fips) => mockZoningData[fips] || null,
    hasCoverage: (fips) => !!mockZoningData[fips],
  };
  require('../js/parcel/feasibility.js');

  function siteFor(zoningCode, constrainedPct) {
    const props = {
      parcel_id: 'Z-1', county_fips: '51107', state: 'VA', zoning_code: zoningCode, area_acres: 50,
    };
    const input = { site_id: 'ZSITE', parcels: [{ id: 'Z-1', geometry: geom, properties: props }] };
    if (constrainedPct != null) {
      input.constraints = { parcelAcres: 50, results: [], summary: { constrainedPct, partial: false } };
    }
    return SI.build(input);
  }

  {
    const si = siteFor('PD-IP', 2);
    t('a by-right district is exported on the zoning section', si.zoning.feasibility.permission_status, 'permitted_by_right');
    t('site_status is potentially_viable for a clean by-right site', si.site_status, 'potentially_viable');
    ok('the by-right eligibility is stated as an advantage',
      si.findings.advantages.some(a => a.category === 'zoning' && /permitted by right/.test(a.statement)));
  }
  {
    const si = siteFor('AR1', 2);
    t('a prohibited district rolls up to material_constraints', si.site_status, 'material_constraints');
    ok('the prohibition is stated as a constraint',
      si.findings.constraints.some(c => c.category === 'zoning' && /prohibited/.test(c.statement)));
  }
  {
    const si = siteFor('B2', 2);
    t('a special-use-permit district rolls up to conditional', si.site_status, 'conditional');
    ok('the approval requirement is stated as a constraint',
      si.findings.constraints.some(c => c.category === 'zoning' && /requires/.test(c.statement)));
  }
  {
    const si = siteFor('PD-OP', 2);
    t('an unresearched (not_listed) district is insufficient_data, never upgraded by clean constraints',
      si.site_status, 'insufficient_data');
  }
  {
    const si = siteFor('PD-IP', 60);
    t('a majority-constrained parcel overrides an otherwise by-right zoning read',
      si.site_status, 'material_constraints');
  }
  {
    const si = siteFor('PD-IP', 30);
    t('a partially-constrained by-right site is conditional, not potentially_viable',
      si.site_status, 'conditional');
  }

  delete global.window.ZONING;
}

// ── Parcels and acreage ────────────────────────────────────────────────────
{
  const si = SI.build(richInput());
  t('the parcel is exported', si.parcels[0].parcel_id, 'A-1');
  t('published acreage is used', si.parcels[0].acres, 120);
  t('and its basis is stated', si.parcels[0].acres_source, 'published');

  // A parcel with no published area still gets a measured one, labelled.
  const measured = SI.build({ parcels: [{ id: 'B', geometry: geom, properties: { parcel_id: 'B' } }] });
  ok('acreage falls back to measurement', measured.parcels[0].acres > 0);
  t('and says it was measured', measured.parcels[0].acres_source, 'measured-from-geometry');

  ok('the owner carries a caution about name matching',
    si.parcels[0].owner_note.includes('not proof of entity identity'));
}

// ── Valuations: assessed is not market ─────────────────────────────────────
{
  const si = SI.build(richInput());
  t('the assessed value is exported', si.valuations.parcels[0].assessed_value, 4200000);
  ok('with its provenance', si.valuations.parcels[0].provenance.source_id === 'loudoun-cama');
  ok('and the confidence tier', si.valuations.parcels[0].provenance.confidence === 'official-joined');

  // The note travels in the payload rather than relying on the consumer.
  ok('the payload states assessed values are not market values',
    si.valuations.note.includes('not market values'));
  ok('and not purchase prices', si.valuations.note.includes('not purchase prices'));
}

// ── Transactions ───────────────────────────────────────────────────────────
{
  const si = SI.build(richInput());
  const tx = si.transactions.parcels[0];
  ok('sale history is exported', tx.sales_history.length === 1);
  t('with its classification', tx.sales_history[0].classification, 'market');
  ok('and whether it is usable as a comparable', tx.sales_history[0].usable_as_comparable === true);
  ok('the payload explains that transfers are classified',
    si.transactions.note.includes('only those classified as market sales'));

  // A quitclaim must export as a transfer, not a sale.
  const qc = SI.build({
    parcels: [{ id: 'C', geometry: geom, properties: {
      parcel_id: 'C', last_sale_date: '2024-01-01', last_sale_price: 1, deed_type: 'QUIT CLAIM DEED' } }],
  });
  t('a $1 quitclaim is classified nominal in the export',
    qc.transactions.parcels[0].sales_history[0].classification, 'nominal');
  t('and no market sale is claimed', qc.transactions.parcels[0].most_recent_market_sale, null);
}

// ── A failed check must never export as a clean result ─────────────────────
{
  const si = SI.build(richInput());

  const interstates = si.infrastructure.layers.find(l => l.layer_id === 'interstates');
  t('a failed proximity layer exports its error', interstates.error, 'BTS service HTTP 503');
  t('and no distance', interstates.nearest_miles, null);

  const wetlands = si.constraints.layers.find(l => l.layer_id === 'nwi-wetlands');
  ok('a failed constraint layer is marked not evaluated', wetlands.evaluated === false);
  t('and exports its error', wetlands.error, 'NWI HTTP 503');
  ok('rather than 0% coverage', wetlands.pct_of_parcel == null);

  ok('the constraint summary carries the partial flag', si.constraints.summary.partial === true);
  t('and counts what could not be evaluated', si.constraints.summary.layers_unevaluated, 1);

  // Unavailable layers travel, so "no fiber row" is distinguishable from
  // "no fiber nearby".
  ok('deliberately unavailable proximity layers are exported with reasons',
    si.infrastructure.unavailable.some(u => u.layer_id === 'fiber' && u.reason.includes('No free reliable')));
  ok('and unavailable constraint layers too',
    si.constraints.unavailable.some(u => u.layer_id === 'steep-slope'));
}

// ── Envelope step ledger ───────────────────────────────────────────────────
{
  const si = SI.build(richInput());
  const env = si.conceptual_buildable_area;
  ok('the envelope is flagged conceptual', env.conceptual === true);
  t('usable acreage is exported', env.conceptual_usable_acres, 98.2);
  ok('no key claims plain buildable acreage',
    !Object.keys(env).some(k => /^buildable/.test(k)));
  ok('the step ledger distinguishes geometry from estimate',
    env.steps.find(s => s.step === 'constraints').produces_geometry === true &&
    env.steps.find(s => s.step === 'setbacks').produces_geometry === false);
  ok('and derived_from names the inputs', env.derived_from.includes('zoning_setbacks'));
}

// ── Suitability export keeps its explanation ───────────────────────────────
{
  const si = SI.build(richInput());
  t('the overall score is exported', si.suitability.overall, 78);
  ok('with per-component weights and rules',
    si.suitability.components[0].weight === 25 && si.suitability.components[0].rule.length > 0);
  ok('omitted components travel too', si.suitability.omitted[0].component === 'access');
  t('and coverage is stated', si.suitability.coverage_pct, 62);
  ok('with the disclaimer', si.suitability.disclaimer.includes('Screening score only'));
}

// ── Source confidence ──────────────────────────────────────────────────────
{
  const si = SI.build(richInput());
  // The roll-up takes the WEAKEST tier across populated fields. richInput()
  // attributes assessed_value but leaves land_value unattributed, so the
  // honest answer is unknown — one attributed field must not mask an
  // unattributed one sitting beside it.
  t('an unattributed field beside an attributed one weakens the roll-up',
    si.source_confidence.by_section.valuation, 'unknown');
  t('ownership, fully attributed, rolls up to its tier',
    si.source_confidence.by_section.ownership, 'official-joined');
  ok('the model ordering is published', si.source_confidence.model.includes('direct-official'));
  ok('and confidence is explained as directness, not correctness',
    si.source_confidence.note.includes('not whether'));

  // A field with no provenance record rolls up as unknown, never as good.
  const bare = SI.build({ parcels: [{ id: 'D', geometry: geom, properties: { parcel_id: 'D', assessed_value: 100 } }] });
  t('an unattributed value rolls up as unknown', bare.source_confidence.by_section.valuation, 'unknown');
}

// ── Missing sections are explicit, never invented ──────────────────────────
{
  const minimal = SI.build({ parcels: [{ id: 'E', geometry: geom, properties: { parcel_id: 'E' } }] });

  ok('no proximity analysis is reported as unavailable', minimal.infrastructure.available === false);
  ok('with a reason', minimal.infrastructure.why.includes('no proximity analysis'));
  ok('no constraint analysis is reported as unavailable', minimal.constraints.available === false);
  ok('no envelope is reported as unavailable', minimal.conceptual_buildable_area.available === false);
  ok('no score is reported as unavailable', minimal.suitability.available === false);

  // Nothing invented a zero.
  ok('no constrained percentage is invented', minimal.constraints.summary === undefined);
  t('and no valuation rows are invented', minimal.valuations.parcels.length, 0);

  const empty = SI.build({ parcels: [] });
  t('an empty site exports zero parcels', empty.parcels.length, 0);
  ok('and still validates', SI.validate(empty).valid);
}

// ── The underwriting handoff ───────────────────────────────────────────────
{
  const si = SI.build(richInput());
  const uw = SI.toUnderwritingInputs(si);

  // Observed facts come across.
  t('land acreage is observed', uw.observed.land_acres, 120);
  t('the assessed value is observed', uw.observed.assessed_value, 4200000);
  t('the last market sale is observed', uw.observed.last_market_sale_price, 3600000);
  t('conceptual usable acreage is observed', uw.observed.conceptual_usable_acres, 98.2);

  // THE assertion this whole module exists for.
  t('acquisition price is null, never derived from the assessed value',
    uw.assumptions_required.acquisition_price.value, null);
  ok('and the reason says the system will not populate it',
    uw.assumptions_required.acquisition_price.why.includes('will not populate this field'));

  // No assumption may be silently pre-filled from an observation.
  for (const [key, entry] of Object.entries(uw.assumptions_required)) {
    t(`assumption "${key}" is null`, entry.value, null);
    ok(`assumption "${key}" states why it cannot be supplied`, entry.why.length > 20);
  }

  ok('the assessed value carries a do-not-use-as-acquisition warning',
    uw.observed.assessed_value_note.includes('Do not use as an acquisition assumption'));
  ok('the last sale is labelled evidence of past value, not a future price',
    uw.observed.last_market_sale_note.includes('not the price of'));
  ok('the separation between facts and assumptions is stated',
    uw.separation_note.includes('should be copied into an assumption field'));

  // Structural: the two blocks must not share keys, or a consumer merging
  // them could overwrite a fact with an assumption.
  const overlap = Object.keys(uw.observed).filter(k => k in uw.assumptions_required);
  t('observed and assumptions_required share no keys', overlap, []);

  ok('the underwriting object also validates as plain data', SI.validate(uw).valid);

  // A site with no market sale must say so rather than leaving it ambiguous.
  const noSale = SI.toUnderwritingInputs(SI.build({
    parcels: [{ id: 'F', geometry: geom, properties: { parcel_id: 'F', area_acres: 10 } }],
  }));
  t('no market sale exports as null', noSale.observed.last_market_sale_price, null);
  ok('with an explanation', noSale.observed.last_market_sale_note.includes('could be classified'));
}

// ── Limitations ────────────────────────────────────────────────────────────
{
  const si = SI.build(richInput());
  ok('limitations are exported', si.limitations.length >= 4);
  ok('including that this is not a survey or appraisal',
    si.limitations.some(l => /not a survey/i.test(l)));
  ok('including that conceptual acreage is not legally buildable',
    si.limitations.some(l => /not legally buildable/i.test(l)));
  ok('including that the score is a screening tool',
    si.limitations.some(l => /screening score/i.test(l)));
  ok('including that absent mapping is not absent condition',
    si.limitations.some(l => /absence of a mapping/i.test(l)));
}

// ── validate() actually catches violations ─────────────────────────────────
{
  ok('a function is caught', !SI.validate({ a: () => {} }).valid);
  ok('a class instance is caught', !SI.validate({ a: new Date() }).valid);
  const circular = { a: 1 }; circular.self = circular;
  ok('a circular reference is caught', !SI.validate(circular).valid);
  ok('plain nested data passes', SI.validate({ a: { b: [1, 2, { c: null }] } }).valid);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
