/* tests/test_parcel_site_search.mjs — large-site discovery filters.

   The failure mode that matters here is filtering on data you don't have. A
   "floodplain <= 5%" filter run over a county where flood data was never
   checked must not quietly list those parcels as passing. Most of these tests
   are about that distinction.

   Run:  node tests/test_parcel_site_search.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

global.polygonClipping = require('../js/vendor/polygon-clipping.umd.min.js');
require('../js/parcel/geo.js');
require('../js/parcel/assemblage.js');
require('../js/parcel/site-search.js');

const S = global.PARCEL_SITE_SEARCH;

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

const cand = (id, properties = {}, extra = {}) => ({ id, properties: { parcel_id: id, ...properties }, ...extra });
const outcome = (c, criteria) => S.evaluateCandidate(c, criteria).outcome;

// ── Plain field criteria ───────────────────────────────────────────────────
{
  t('a parcel above the acreage floor matches',
    outcome(cand('A', { area_acres: 80 }), { minAcres: 50 }), 'matched');
  t('a parcel below it is rejected',
    outcome(cand('B', { area_acres: 20 }), { minAcres: 50 }), 'rejected');
  t('a range works in both directions',
    outcome(cand('C', { area_acres: 80 }), { minAcres: 50, maxAcres: 100 }), 'matched');
  t('and rejects above the ceiling',
    outcome(cand('D', { area_acres: 500 }), { minAcres: 50, maxAcres: 100 }), 'rejected');

  t('square feet convert to acres',
    outcome(cand('E', { area_sqft: 43560 * 60 }), { minAcres: 50 }), 'matched');

  // A parcel with no area attribute still has a size.
  const withGeom = {
    id: 'F', properties: { parcel_id: 'F' },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0.02, 0], [0.02, 0.02], [0, 0.02], [0, 0]]] },
  };
  ok('acreage falls back to measuring the polygon', S.acresOf(withGeom) > 1000);

  t('a parcel with no area at all is indeterminate, not rejected',
    outcome(cand('G', {}), { minAcres: 50 }), 'indeterminate');
}

// ── Missing is not zero ────────────────────────────────────────────────────
{
  // Number(null) is 0, so a naive implementation would let a parcel with no
  // assessed value pass "maxAssessedValue: 1000000" as though worth nothing.
  t('a null assessed value is indeterminate, not zero',
    outcome(cand('H', { assessed_value: null }), { maxAssessedValue: 1000000 }), 'indeterminate');
  t('an empty-string value is indeterminate too',
    outcome(cand('I', { assessed_value: '' }), { maxAssessedValue: 1000000 }), 'indeterminate');
  t('a genuine zero IS a value and passes',
    outcome(cand('J', { assessed_value: 0 }), { maxAssessedValue: 1000000 }), 'matched');
}

// ── Zoning and land use are prefix matches ─────────────────────────────────
{
  t('a zoning prefix finds its subdistricts',
    outcome(cand('K', { zoning_code: 'I-2' }), { zoningCodes: ['I'] }), 'matched');
  t('a non-matching district is rejected',
    outcome(cand('L', { zoning_code: 'R-1' }), { zoningCodes: ['I'] }), 'rejected');
  t('a parcel whose jurisdiction publishes no zoning is indeterminate',
    outcome(cand('M', {}), { zoningCodes: ['I'] }), 'indeterminate');
  t('and an empty zoning string is indeterminate, not a mismatch',
    outcome(cand('N', { zoning_code: '' }), { zoningCodes: ['I'] }), 'indeterminate');
}

// ── Owner known ────────────────────────────────────────────────────────────
{
  t('a real owner satisfies ownerKnown',
    outcome(cand('O', { owner: 'ACME LAND LLC' }), { ownerKnown: true }), 'matched');
  // A placeholder is a definite "not known" — we checked, the answer is no.
  t('a placeholder owner FAILS ownerKnown rather than being unknown',
    outcome(cand('P', { owner: 'UNKNOWN' }), { ownerKnown: true }), 'rejected');
  t('a missing owner also fails it',
    outcome(cand('Q', {}), { ownerKnown: true }), 'rejected');
  t('ownerKnown:false finds parcels without an identified owner',
    outcome(cand('R', {}), { ownerKnown: false }), 'matched');
}

// ── Distance criteria ──────────────────────────────────────────────────────
{
  const near = cand('S', { area_acres: 100 }, {
    proximity: { 'substations': { nearest: { distanceMiles: 1.2 }, counts: {} } },
  });
  const far = cand('T', { area_acres: 100 }, {
    proximity: { 'substations': { nearest: { distanceMiles: 9.5 }, counts: {} } },
  });

  t('a nearby substation matches', outcome(near, { maxMilesToSubstation: 2 }), 'matched');
  t('a distant one is rejected', outcome(far, { maxMilesToSubstation: 2 }), 'rejected');

  // Nothing found within the search horizon is a real FAIL of "within X
  // miles" — we looked. That is different from not having looked.
  const nothingNearby = cand('U', { area_acres: 100 }, {
    proximity: { 'substations': { nearest: null, counts: {} } },
  });
  t('nothing within the search horizon is a rejection, not an unknown',
    outcome(nothingNearby, { maxMilesToSubstation: 2 }), 'rejected');

  const notRun = cand('V', { area_acres: 100 }, { proximity: {} });
  t('a proximity layer that was never run is indeterminate',
    outcome(notRun, { maxMilesToSubstation: 2 }), 'indeterminate');

  const failed = cand('W', { area_acres: 100 }, {
    proximity: { 'substations': { error: 'HIFLD HTTP 503' } },
  });
  t('a proximity layer that errored is indeterminate',
    outcome(failed, { maxMilesToSubstation: 2 }), 'indeterminate');

  const dense = cand('X', { area_acres: 100 }, {
    proximity: { 'data-centers': { nearest: { distanceMiles: 2 }, counts: { 1: 0, 3: 2, 5: 4, 10: 9 } } },
  });
  t('data center density counts within 10 miles',
    outcome(dense, { minDataCentersWithin10Miles: 5 }), 'matched');
  t('and rejects below the threshold',
    outcome(dense, { minDataCentersWithin10Miles: 15 }), 'rejected');
}

// ── Constraint criteria: the headline case ─────────────────────────────────
{
  const clean = cand('Y', { area_acres: 100 }, {
    constraints: { 'fema-flood': { pctOfParcel: 2.1 } },
  });
  const floody = cand('Z', { area_acres: 100 }, {
    constraints: { 'fema-flood': { pctOfParcel: 40 } },
  });

  t('a parcel with little mapped floodplain matches',
    outcome(clean, { maxFloodplainPct: 5 }), 'matched');
  t('a heavily flooded one is rejected',
    outcome(floody, { maxFloodplainPct: 5 }), 'rejected');

  // THE test this module exists for. A county where flood data was never
  // checked must not have its parcels listed as meeting a flood criterion.
  const unchecked = cand('AA', { area_acres: 100 }, { constraints: {} });
  t('a parcel whose floodplain was never checked is indeterminate, NOT matched',
    outcome(unchecked, { maxFloodplainPct: 5 }), 'indeterminate');

  const failedCheck = cand('AB', { area_acres: 100 }, {
    constraints: { 'fema-flood': { unevaluated: true, error: 'FEMA NFHL HTTP 503' } },
  });
  t('a failed flood check is indeterminate, not 0% floodplain',
    outcome(failedCheck, { maxFloodplainPct: 5 }), 'indeterminate');
  ok('and the reason names the failure',
    S.evaluateCandidate(failedCheck, { maxFloodplainPct: 5 })
      .checks[0].why.includes('HTTP 503'));
}

// ── Partial envelopes do not launder incompleteness ────────────────────────
{
  const complete = cand('AC', { area_acres: 100 }, {
    envelope: { conceptualUsableAcres: 80, partial: false },
  });
  const partial = cand('AD', { area_acres: 100 }, {
    envelope: { conceptualUsableAcres: 80, partial: true },
  });

  t('a complete envelope can be filtered on',
    outcome(complete, { minConceptualUsableAcres: 50 }), 'matched');
  t('a partial envelope is indeterminate even though it has a number',
    outcome(partial, { minConceptualUsableAcres: 50 }), 'indeterminate');
}

// ── Search results and counts ──────────────────────────────────────────────
{
  const candidates = [
    cand('big', { area_acres: 200, zoning_code: 'I-1' }),
    cand('small', { area_acres: 5, zoning_code: 'I-1' }),
    cand('medium', { area_acres: 90, zoning_code: 'I-1' }),
    cand('nozoning', { area_acres: 300 }),
  ];
  const res = S.search(candidates, { minAcres: 50, zoningCodes: ['I'] });

  t('two parcels fully match', res.counts.matched, 2);
  t('one is rejected on size', res.counts.rejected, 1);
  t('one is indeterminate on zoning', res.counts.indeterminate, 1);
  t('every candidate is accounted for', res.counts.evaluated, 4);

  // Nothing may vanish: the three buckets must partition the input.
  t('the buckets partition the input',
    res.matched.length + res.rejected.length + res.indeterminate.length, candidates.length);

  t('results are largest-first', res.results.map(r => r.id), ['big', 'medium']);

  // Default policy is conservative.
  t('unknowns are excluded from results by default', res.unknownPolicy, 'exclude');
  ok('the indeterminate parcel is not in results', !res.results.some(r => r.id === 'nozoning'));
  ok('a caveat explains that some parcels could not be evaluated',
    res.caveat.includes('could not be fully evaluated'));
  ok('and states they are not treated as passing', res.caveat.includes('not silently treated as passing'));

  const included = S.search(candidates, { minAcres: 50, zoningCodes: ['I'] }, { unknownPolicy: 'include' });
  t('the include policy adds them to results', included.results.length, 3);
  t('but still counts them separately', included.counts.indeterminate, 1);
  ok('and still carries the caveat', !!included.caveat);
}

{
  const allGood = S.search([cand('A', { area_acres: 100 })], { minAcres: 50 });
  t('a search with nothing unknown has no caveat', allGood.caveat, null);
}

// ── Short-circuiting ───────────────────────────────────────────────────────
{
  // A parcel rejected on acreage must not have its expensive constraint
  // criterion evaluated at all.
  const small = cand('AE', { area_acres: 5 }, { constraints: {} });
  const ev = S.evaluateCandidate(small, { minAcres: 50, maxFloodplainPct: 5 });

  t('evaluation stops at the first failure', ev.checks.length, 1);
  t('and the cheap criterion is the one that ran', ev.checks[0].criterion, 'minAcres');
  t('the failing criterion is named', ev.failedOn, 'minAcres');
}

{
  // Ordering: cheap field checks run before expensive constraint checks.
  const c = cand('AF', { area_acres: 100 }, {
    constraints: { 'fema-flood': { pctOfParcel: 1 } },
    proximity: { 'substations': { nearest: { distanceMiles: 1 }, counts: {} } },
  });
  const ev = S.evaluateCandidate(c, { maxFloodplainPct: 5, minAcres: 50, maxMilesToSubstation: 2 });
  t('criteria run cheapest-first',
    ev.checks.map(x => x.criterion), ['minAcres', 'maxMilesToSubstation', 'maxFloodplainPct']);
}

// ── Validation ─────────────────────────────────────────────────────────────
{
  ok('a valid criteria set validates', S.validateCriteria({ minAcres: 50 }).valid);

  const unknownCriterion = S.validateCriteria({ notARealCriterion: 5 });
  ok('an unknown criterion is rejected', !unknownCriterion.valid);

  const backwards = S.validateCriteria({ minAcres: 100, maxAcres: 50 });
  ok('an impossible acreage range is rejected', !backwards.valid);
  ok('with an explanation', backwards.errors.some(e => e.includes('no parcel can satisfy')));

  ok('a non-numeric threshold is rejected', !S.validateCriteria({ minAcres: 'fifty' }).valid);
  ok('an empty array criterion is rejected', !S.validateCriteria({ states: [] }).valid);
  ok('a non-boolean ownerKnown is rejected', !S.validateCriteria({ ownerKnown: 'yes' }).valid);

  const bad = S.search([cand('A', { area_acres: 100 })], { minAcres: 100, maxAcres: 50 });
  ok('a search with invalid criteria returns an error, not results', !!bad.error);
  t('and no results', bad.results ? bad.results.length : 0, 0);
}

// ── Explanations ───────────────────────────────────────────────────────────
{
  const c = cand('AG', { area_acres: 100 }, { constraints: {} });
  const entry = S.evaluateCandidate(c, { minAcres: 50, maxFloodplainPct: 5 });
  const lines = S.explain(entry);

  ok('every evaluated criterion is explained', lines.length === entry.checks.length);
  ok('a passing criterion says it was met', lines.some(l => l.includes('meets')));
  ok('an unknown criterion says it was not evaluated and why',
    lines.some(l => l.includes('not evaluated') && l.includes('not checked')));
}

// ── Degenerate inputs ──────────────────────────────────────────────────────
{
  const empty = S.search([], { minAcres: 50 });
  t('no candidates yields no results', empty.counts.evaluated, 0);
  t('and no caveat', empty.caveat, null);

  const nullish = S.search([null, undefined, cand('A', { area_acres: 100 })], { minAcres: 50 });
  t('null candidates are skipped', nullish.counts.evaluated, 1);

  const noCriteria = S.search([cand('A', { area_acres: 100 })], {});
  t('an empty criteria set matches everything', noCriteria.counts.matched, 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
