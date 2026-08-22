/* tests/test_handoff_export.mjs — tests for js/parcel/handoff.js (Phase 5:
   SiteIntel -> Underwrite handoff export). Exercises PARCEL_HANDOFF.build()
   only -- .download() touches Blob/URL/document, which aren't available in
   bare Node without jsdom (not a dependency of this repo; see
   tests/run_all.sh's jsdom-optional-skip convention), so it's only checked
   to exist as a function.

   Run:  node tests/test_handoff_export.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
require('../js/creos-ids.js');
require('../js/parcel/schema.js');
require('../js/parcel/handoff.js');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail) console.log(`   ${detail}`);
}

const H = window.PARCEL_HANDOFF;

/* ── basic shape, no site intelligence available ─────────────────────── */
{
  const feature = {
    properties: {
      parcel_id: 'PIN-001',
      address: '123 Old County Rd',
      state: 'VA',
      county_fips: '51059',
      owner: 'Example Holdings LLC',
      area_sqft: 87120, // 2 acres
    },
    geometry: null,
  };

  const payload = H.build({ feature, jurisdictionId: 'fairfax-va' });

  ok('schemaVersion is creos-handoff-v1', payload.schemaVersion === 'creos-handoff-v1');
  ok('handoffId is a valid CREOS ulid', window.isValidCreosUlid(payload.handoffId));
  ok('sourceModule is siteintel', payload.sourceModule === 'siteintel');
  ok('targetModule is underwrite', payload.targetModule === 'underwrite');
  ok('createdAt is an ISO datetime string', typeof payload.createdAt === 'string' && !isNaN(Date.parse(payload.createdAt)));

  ok('property.identity.propertyId is a valid CREOS ulid', window.isValidCreosUlid(payload.property.identity.propertyId));
  ok('property.identity.propertyName carries the raw address', payload.property.identity.propertyName === '123 Old County Rd');
  ok('property.identity has NO structured address (see handoff.js decision #1)', payload.property.identity.address === undefined);
  ok('property.classification.propertyType is always "land" (see decision #2)', payload.property.classification.propertyType === 'land');
  ok('property.physical.buildingArea derived from area_sqft', payload.property.physical.buildingArea.value === 87120 && payload.property.physical.buildingArea.unit === 'sf');
  ok('property.parcel.parcelId set when county_fips known', payload.property.parcel.parcelId === 'PIN-001' && payload.property.parcel.jurisdiction === '51059');
  ok('property.location omitted when no geometry/site intelligence', payload.property.location === undefined);

  ok('assumptions[] is always empty (Phase 5 only sends observations)', Array.isArray(payload.assumptions) && payload.assumptions.length === 0);
  ok('sources[] defaults to empty', Array.isArray(payload.sources) && payload.sources.length === 0);
  ok('provenance[] defaults to empty', Array.isArray(payload.provenance) && payload.provenance.length === 0);

  const names = payload.observations.map(o => o.name);
  ok('raw address observation present', names.includes('Site address'));
  ok('raw state observation present', names.includes('State'));
  ok('raw county_fips observation present', names.includes('County FIPS'));
  ok('raw owner observation present', names.includes('Owner of record'));
  ok('no valuation/transaction/zoning observations without site intelligence', !names.some(n => ['Assessed value', 'Zoning code(s)', 'Most recent market sale price'].includes(n)));

  for (const o of payload.observations) {
    ok(`observation "${o.name}" has status proposed`, o.status === 'proposed');
    ok(`observation "${o.name}" has sourceType observed`, o.sourceType === 'observed');
    ok(`observation "${o.name}" has sourceModule siteintel`, o.sourceModule === 'siteintel');
    ok(`observation "${o.name}" assumptionId is a valid CREOS ulid`, window.isValidCreosUlid(o.assumptionId));
  }
}

/* ── full mapping with a realistic, hand-built site-intelligence object ─ */
{
  const feature = {
    properties: { parcel_id: 'PIN-777', address: '9 Data Center Way', county_fips: '51059', gross_floor_area: 500000, owner: 'Sample Owner LLC' },
    geometry: { rings: [[[0, 0]]] }, // shape irrelevant -- location comes from `si`, not geometry, in this test
  };

  const si = {
    site_id: 'PIN-777',
    location: { representative_point: { lat: 38.9, lon: -77.3 }, county_fips: '51059', state: 'VA', address: '9 Data Center Way' },
    acreage: { total_acres: 12.5 },
    land_use: { codes: ['IND-1', 'IND-2'] },
    zoning: { codes: ['M-1'] },
    source_confidence: {
      by_section: { ownership: 'inferred', valuation: 'direct-official', zoning: 'official-joined', transactions: 'unknown' },
    },
  };

  // Stubbed exactly as js/parcel/site-intelligence.js's real toUnderwritingInputs()
  // would derive it from `si` -- see that file's own function for the real logic.
  window.PARCEL_SITE_INTELLIGENCE = {
    toUnderwritingInputs() {
      return {
        observed: {
          land_acres: 12.5,
          conceptual_usable_acres: 9.1,
          zoning_codes: ['M-1'],
          land_use_codes: ['IND-1', 'IND-2'],
          county_fips: '51059',
          assessed_value: 4200000,
          land_value: 1100000,
          tax_year: 2025,
          assessed_value_note: 'A tax authority determination, not a purchase price.',
          last_market_sale_date: 1521072000000, // epoch ms -> should normalize to an ISO date
          last_market_sale_price: 3900000,
          last_market_sale_note: 'A prior arms-length transaction.',
          mapped_constraint_pct: 14.2,
          constraint_analysis_partial: true,
        },
        assumptions_required: {
          acquisition_price: { value: null, why: 'no public record' },
        },
      };
    },
  };

  const payload = H.build({ feature, jurisdictionId: 'fairfax-va', siteIntelligence: si });
  const byName = Object.fromEntries(payload.observations.map(o => [o.name, o]));

  ok('property.location taken from si.location.representative_point', payload.property.location.latitude === 38.9 && payload.property.location.longitude === -77.3);
  ok('property.physical.landArea from si.acreage.total_acres', payload.property.physical.landArea.value === 12.5 && payload.property.physical.landArea.unit === 'acre');
  ok('property.classification.subtype from land_use codes', payload.property.classification.subtype === 'IND-1, IND-2');

  ok('Assessed value observation present with correct number/unit', byName['Assessed value']?.value === 4200000 && byName['Assessed value'].unit === 'USD' && byName['Assessed value'].valueType === 'number');
  ok('Assessed value carries the assessed_value_note as methodology (not dropped)', byName['Assessed value'].methodology === 'A tax authority determination, not a purchase price.');
  ok('Assessed value confidence mapped direct-official -> verified', byName['Assessed value'].confidence === 'verified');
  ok('Zoning confidence mapped official-joined -> high', byName['Zoning code(s)'].confidence === 'high');
  ok('Ownership confidence mapped inferred -> low', byName['Owner of record']?.confidence === 'low');
  ok('Transactions confidence "unknown" is OMITTED, not fabricated', byName['Most recent market sale price'].confidence === undefined);

  const saleDate = byName['Most recent market sale date'];
  ok('epoch-ms sale date normalized to an ISO calendar date', saleDate.valueType === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(saleDate.value));

  ok('mapped_constraint_pct observation present as a number', byName['Mapped constraint coverage']?.value === 14.2);
  ok('partial constraint analysis is disclosed via methodology, not silently dropped', /partial/i.test(byName['Mapped constraint coverage'].methodology || ''));

  ok('acquisition_price (assumptions_required) never appears anywhere in the payload', JSON.stringify(payload).includes('acquisition_price') === false);

  for (const o of payload.observations) {
    ok(`[full] observation "${o.name}" status is proposed (Underwrite-boundary governance)`, o.status === 'proposed');
  }

  delete window.PARCEL_SITE_INTELLIGENCE;
}

/* ── null/empty observed values are omitted, never sent as null ─────── */
{
  const feature = { properties: { parcel_id: 'PIN-002' }, geometry: null };
  window.PARCEL_SITE_INTELLIGENCE = {
    toUnderwritingInputs() {
      return { observed: { assessed_value: null, land_value: undefined, zoning_codes: [] }, assumptions_required: {} };
    },
  };
  const payload = H.build({ feature, siteIntelligence: {} });
  const names = payload.observations.map(o => o.name);
  ok('null observed value produces no observation entry', !names.includes('Assessed value'));
  ok('undefined observed value produces no observation entry', !names.includes('Assessed land value'));
  ok('empty-array-joined observed value produces no observation entry', !names.includes('Zoning code(s)'));
  ok('property.parcel omitted when neither county_fips nor jurisdictionId known', payload.property.parcel === undefined);
  delete window.PARCEL_SITE_INTELLIGENCE;
}

/* ── error handling ───────────────────────────────────────────────────── */
try {
  H.build({});
  ok('build() throws without a feature', false, 'did not throw');
} catch {
  ok('build() throws without a feature', true);
}

ok('download is exposed as a function', typeof H.download === 'function');
ok('SCHEMA_VERSION is exposed', H.SCHEMA_VERSION === 'creos-handoff-v1');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
