/* tests/test_parcel_coverage_metrics.mjs — coverage classification + metrics.

   These numbers get quoted, so the tests concentrate on the ways a coverage
   report lies: counting an unknown as a miss, letting a stale committed
   artifact pass CI, treating a down service as "rich" because its config
   names many fields, and reporting a score without its components.

   Run:  node tests/test_parcel_coverage_metrics.mjs
*/
import {
  FIELD_CATEGORIES, QUALITY_WEIGHTS, MAX_QUALITY_SCORE, TIERS,
  categoriesPresent, categoryRatios, qualityScore, classify, rankOpportunities,
} from '../data/parcel_pipeline/coverage_rules.mjs';
import { buildMetrics, facilityCountsByFips, renderReport }
  from '../data/parcel_pipeline/generate_coverage_metrics.mjs';

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

const entry = (fieldMap, extra = {}) => ({
  fips: '11111', id: 'x', name: 'X', state: 'XX', connector: 'arcgis',
  serviceUrl: 'https://example.gov/MapServer/0', fieldMap, ...extra,
});

// ── Category presence ──────────────────────────────────────────────────────
{
  const e = entry({ parcel_id: 'PIN', owner: 'OWNER', assessed_value: 'VAL' });
  const present = categoriesPresent(e);
  ok('identity is detected', present.identity);
  ok('ownership is detected', present.ownership);
  ok('assessment is detected', present.assessment);
  ok('sales is absent', !present.sales);

  // A joined field is a present field from the panel's point of view.
  const enriched = entry({ parcel_id: 'PIN' }, {
    enrichment: { sources: [{ id: 's', confidence: 'official-joined', fieldMap: { owner: 'O', last_sale_price: 'P' } }] },
  });
  const ep = categoriesPresent(enriched);
  ok('a field supplied only by an enrichment source counts as present', ep.ownership);
  ok('so does one from a joined sales column', ep.sales);
}

// ── Ratios, not booleans ───────────────────────────────────────────────────
{
  const partial = entry({ assessed_value: 'V' });                    // 1 of 4
  const full = entry({ assessed_value: 'V', land_value: 'L', improvement_value: 'I', tax_year: 'T' });

  ok('a partially-populated category scores below a complete one',
    categoryRatios(partial).assessment < categoryRatios(full).assessment);
  t('a complete category is 1', categoryRatios(full).assessment, 1);
  t('an absent category is 0', categoryRatios(partial).sales, 0);
}

// ── Quality score is transparent and bounded ───────────────────────────────
{
  const empty = qualityScore(entry({}));
  t('an empty entry scores zero', empty.total, 0);

  const everything = {};
  for (const fields of Object.values(FIELD_CATEGORIES)) for (const f of fields) everything[f] = 'X';
  const maxed = qualityScore(entry(everything, {
    enrichment: { sources: [{ id: 's', confidence: 'official-joined', fieldMap: {} }] },
  }));
  t('an entry with every field and declared provenance reaches the maximum',
    maxed.total, MAX_QUALITY_SCORE);

  ok('the score never exceeds its stated maximum', maxed.total <= MAX_QUALITY_SCORE);
  ok('every weighted category is reported as its own component',
    Object.keys(QUALITY_WEIGHTS).every(k => maxed.components[k] !== undefined));
  ok('each component shows its weight and its earned share',
    maxed.components.assessment.weight === QUALITY_WEIGHTS.assessment &&
    maxed.components.assessment.earned === QUALITY_WEIGHTS.assessment);

  // The total must genuinely be the sum of its parts — a score with a hidden
  // term is exactly the opaque number this design rejects.
  const summed = Object.values(maxed.components).reduce((a, c) => a + c.earned, 0);
  t('the total is exactly the sum of its components', Math.round(summed * 10) / 10, maxed.total);

  // Provenance credit is for ATTRIBUTION, not data goodness.
  const noConfidence = qualityScore(entry({}, {
    enrichment: { sources: [{ id: 's', fieldMap: {} }] },      // no confidence declared
  }));
  t('an enrichment source with no declared confidence earns no provenance credit',
    noConfidence.components.provenance.earned, 0);
}

// ── Tier classification ────────────────────────────────────────────────────
{
  t('geometry and an id only is boundary-only',
    classify(entry({ parcel_id: 'PIN', area_acres: 'AC' })), TIERS.BOUNDARY_ONLY);

  t('ownership, assessment, sales and zoning is full intelligence',
    classify(entry({
      parcel_id: 'PIN', area_acres: 'AC', owner: 'O',
      assessed_value: 'V', last_sale_price: 'S', zoning_code: 'Z',
    })), TIERS.FULL_INTELLIGENCE);

  t('address plus valuation but no sales is rich',
    classify(entry({ parcel_id: 'PIN', address: 'A', assessed_value: 'V' })), TIERS.RICH);

  t('three attribute categories with no valuation is standard',
    classify(entry({ parcel_id: 'PIN', zoning_code: 'Z', land_use_code: 'L', deed_book: 'D' })),
    TIERS.STANDARD);

  t('a single attribute category is basic',
    classify(entry({ parcel_id: 'PIN', zoning_code: 'Z' })), TIERS.BASIC);

  t('no service url at all is unsupported',
    classify({ fips: '1', fieldMap: { parcel_id: 'P' } }), TIERS.UNSUPPORTED);

  // Operational state must override configured depth: a county whose CAMA
  // service is down today is not "rich" to the user looking at it today.
  const deep = entry({
    parcel_id: 'PIN', owner: 'O', assessed_value: 'V', last_sale_price: 'S', zoning_code: 'Z',
  });
  t('a failing source degrades a deep jurisdiction', classify(deep, { status: 'failing' }), TIERS.DEGRADED);
  t('a blocked source blocks it', classify(deep, { status: 'blocked' }), TIERS.BLOCKED);
  t('healthy status leaves the depth-based tier alone',
    classify(deep, { status: 'ok' }), TIERS.FULL_INTELLIGENCE);
}

// ── Facility attribution ───────────────────────────────────────────────────
{
  const counts = facilityCountsByFips([
    { county_fips: '51107' }, { county_fips: '51107' }, { county_fips: '6037' }, { county_fips: null },
  ]);
  t('facilities are counted per county', counts['51107'], 2);
  // A 4-digit FIPS from a source that dropped the leading zero must land in
  // the same bucket as the registry's 5-digit key, or the county silently
  // reads as uncovered.
  t('a short FIPS is zero-padded to match the registry', counts['06037'], 1);
  ok('a facility with no FIPS is not counted anywhere', !Object.values(counts).includes(undefined));
}

// ── Metrics assembly ───────────────────────────────────────────────────────
const fakeRegistry = (entries) => ({ all: () => entries });

{
  const metrics = buildMetrics({
    registry: fakeRegistry([
      entry({ parcel_id: 'P', owner: 'O', assessed_value: 'V', last_sale_price: 'S', zoning_code: 'Z' }),
      { ...entry({ parcel_id: 'P' }), fips: '22222', id: 'y', name: 'Y' },
    ]),
    catalog: { jurisdictions: {} },
    facilities: [
      { county_fips: '11111' }, { county_fips: '11111' },
      { county_fips: '99999' },              // a county we do not cover
      { county_fips: null },                 // unattributable
    ],
  });

  t('production jurisdictions are counted', metrics.coverage.productionJurisdictions, 2);
  t('total facilities includes every record', metrics.coverage.totalFacilities, 4);
  t('facilities in covered jurisdictions are counted', metrics.coverage.facilitiesInCoveredJurisdictions, 2);

  // The distinction that keeps the headline honest: an unknown county is not
  // a coverage miss, so it must leave the denominator rather than inflate it.
  t('facilities with no FIPS are reported separately', metrics.coverage.facilitiesUnattributed, 1);
  t('facility-weighted coverage excludes unattributable facilities from the denominator',
    metrics.coverage.facilityWeightedCoveragePct, 66.7);   // 2 of 3, not 2 of 4

  t('the tier distribution counts each jurisdiction once',
    Object.values(metrics.tierDistribution).reduce((a, b) => a + b, 0), 2);
  ok('depth is reported for every category',
    Object.keys(FIELD_CATEGORIES).every(c => metrics.depth[c] !== undefined));
  ok('the weights are published in the artifact so the score can be audited',
    metrics.meta.qualityWeights.assessment === QUALITY_WEIGHTS.assessment);
  ok('the artifact carries its own caveat about what it does not measure',
    /not a measure of data accuracy/.test(metrics.meta.caveat));

  // A timestamp would make the artifact differ every run and turn --check
  // into permanent CI noise.
  ok('the artifact has no generation timestamp', metrics.meta.generatedAt === undefined);

  // Determinism: same inputs must produce byte-identical output, or --check
  // fails spuriously.
  const again = buildMetrics({
    registry: fakeRegistry([
      entry({ parcel_id: 'P', owner: 'O', assessed_value: 'V', last_sale_price: 'S', zoning_code: 'Z' }),
      { ...entry({ parcel_id: 'P' }), fips: '22222', id: 'y', name: 'Y' },
    ]),
    catalog: { jurisdictions: {} },
    facilities: [{ county_fips: '11111' }, { county_fips: '11111' }, { county_fips: '99999' }, { county_fips: null }],
  });
  t('the same inputs produce identical output', JSON.stringify(again), JSON.stringify(metrics));
}

{
  // Empty inputs must not divide by zero or emit NaN into a published file.
  const empty = buildMetrics({ registry: fakeRegistry([]), catalog: { jurisdictions: {} }, facilities: [] });
  t('no jurisdictions yields 0% rather than NaN', empty.coverage.facilityWeightedCoveragePct, 0);
  t('and a zero mean score', empty.qualityScore.mean, 0);
  ok('no NaN reaches the artifact', !JSON.stringify(empty).includes('null,"NaN"') && !/NaN/.test(JSON.stringify(empty)));
}

// ── Opportunity ranking ────────────────────────────────────────────────────
{
  const ranked = rankOpportunities(
    {
      '33333': { name: 'Big', state: 'AA', status: 'candidate', facility_count: 40, service_url: 'u', query_support: true, available_fields: ['A'] },
      '44444': { name: 'Small', state: 'BB', status: 'candidate', facility_count: 2, portal_url: 'p' },
      '55555': { name: 'Covered', state: 'CC', status: 'candidate', facility_count: 99 },
      '66666': { name: 'Rejected', state: 'DD', status: 'rejected', facility_count: 50 },
      '77777': { name: 'NoFacilities', state: 'EE', status: 'candidate', facility_count: 0 },
    },
    { '33333': 40, '44444': 2, '55555': 99, '66666': 50 },
    new Set(['55555']),
  );

  t('the biggest uncovered opportunity ranks first', ranked[0].fips, '33333');
  ok('an already-covered jurisdiction is excluded', !ranked.some(o => o.fips === '55555'));
  ok('a previously-rejected source is excluded', !ranked.some(o => o.fips === '66666'));
  ok('a jurisdiction with no facilities is excluded', !ranked.some(o => o.fips === '77777'));
  t('a queryable service with a known field list is low effort', ranked[0].effort, 'low');
  t('a portal-only lead is high effort', ranked.find(o => o.fips === '44444').effort, 'high');
  ok('prior investigation status is carried through',
    ranked[0].previousInvestigation.includes('catalogued'));
}

// ── Report rendering ───────────────────────────────────────────────────────
{
  const metrics = buildMetrics({
    registry: fakeRegistry([entry({ parcel_id: 'P', owner: 'O' })]),
    catalog: { jurisdictions: {} },
    facilities: [{ county_fips: '11111' }],
  });
  const md = renderReport(metrics);

  ok('the report marks itself as generated', md.includes('do not edit by hand'));
  ok('the report states the caveat before any number', md.indexOf('not a measure of data accuracy') < md.indexOf('## Coverage'));
  ok('the report says category coverage is more honest than the score',
    md.includes('more honest'));
  ok('the report publishes the weights', md.includes('assessment 15'));
  ok('the report explains why geometry is unscored', md.includes('precondition'));
  ok('facility-weighted coverage is highlighted', md.includes('**Facility-weighted coverage**'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
