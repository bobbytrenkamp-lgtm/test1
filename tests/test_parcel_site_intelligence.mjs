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
                     'market_context', 'policy_context', 'suitability', 'source_confidence', 'limitations']) {
    ok(`the contract key "${key}" is present`, si[key] !== undefined);
  }
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
