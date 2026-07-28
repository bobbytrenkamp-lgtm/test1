/* tests/test_economy_core.mjs — Node regression tests for js/economy.js's
   pure, DOM-free internals: median/percentileRank statistics, countySignals,
   and the Data Center Readiness Score.

   These were previously exercised only by a throwaway manual smoke test
   (vm.runInContext, run once, discarded) -- a real gap given readinessScore
   combines nine inputs with weighted percentile ranking and graceful
   degradation, exactly the kind of arithmetic that is easy to get subtly
   wrong (off-by-one in rounding, treating "missing" as "zero", forgetting
   to redistribute weight) without anything to catch a regression.

   Run:  node tests/test_economy_core.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/* economy.js only touches `document` inside functions this file never calls
   (isLight, chart/tooltip builders) -- top-level load needs no DOM. */
global.window = global;
require('../js/economy.js');
const E = window.ECONOMY;

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}
function check(cond, name) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

/* ══════════════════════════ median() ══════════════════════════ */

eq(E.median([]), null, 'median of empty array is null');
eq(E.median([5]), 5, 'median of single value');
eq(E.median([1, 3, 2]), 2, 'median of odd-length array');
eq(E.median([1, 2, 3, 4]), 2.5, 'median of even-length array averages the middle two');
eq(E.median([1, null, 3, undefined, 5]), 3, 'median filters out null/undefined before computing');

/* ══════════════════════════ percentileRank() ══════════════════════════ */

eq(E.percentileRank(null, [1, 2, 3, 4, 5], 3), null, 'percentileRank of a null value is null');
eq(E.percentileRank(5, [1, 2, 3], 20), null,
   'percentileRank refuses to rank against a pool smaller than minSample');
eq(E.percentileRank(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5), 45,
   'percentileRank: 4 below + half of 1 equal, over 10 = 45th percentile');
eq(E.percentileRank(5, [5, 5, 5, 1, 2, 3, 4, 6, 7, 8], 10), 55,
   'percentileRank splits ties: 4 below + half of 3 equal, over 10 = 55th percentile');

/* ══════════════════════════ readinessScore() ══════════════════════════ */

/* 21 counties, one per state, indices 0..20. Direct ("higher is better")
   factors get value = index; inverted ("lower is better") factors get
   value = 20 - index, i.e. the mirror image. Because the pool is odd-length
   (21) and symmetric, the CENTER county (index 10) sits at exactly the
   50th percentile on every factor regardless of direction -- letting every
   factor's contribution be hand-verified as exactly 50/100, rather than
   asserting against whatever the code happens to output. */
function buildSyntheticEconomy(n) {
  const counties = {};
  const states = {};
  for (let i = 0; i < n; i++) {
    const stateFips = String(i + 1).padStart(2, '0');
    const fips = stateFips + '001';
    const direct = i;
    const inverted = (n - 1) - i;
    counties[fips] = {
      name: `County ${i}`, state: `State ${i}`, state_fips: stateFips,
      metrics: {
        population: { change_5y_pct: direct },
        unemployment_rate: { value: inverted },
        bachelors_or_higher_pct: { value: direct },
        labor_force_participation_rate: { value: direct },
        broadband_pct: { value: direct },
        housing_vacancy_rate: { value: inverted },
      },
      building_permits: { change_yoy_pct: direct },
      avg_weekly_wage: { value: inverted },
    };
    states[stateFips] = { name: `State ${i}`, metrics: {}, electricity_price: { value: inverted } };
  }
  return { countyData: { counties }, stateData: { states } };
}

const N = 21;
const CENTER_INDEX = 10;
const CENTER_FIPS = String(CENTER_INDEX + 1).padStart(2, '0') + '001';

{
  const { countyData, stateData } = buildSyntheticEconomy(N);
  E._resetCache();
  const r = E.readinessScore(countyData, stateData, CENTER_FIPS);
  check(r !== null, 'readinessScore returns a result for a fully-populated county');
  eq(r.score, 50, 'center county of a symmetric 21-county pool scores exactly 50 on every factor');
  eq(r.completeness, 100, 'all 9 factors present -> 100% of the weighting used');
  eq(r.grade, 'Moderate', 'a score of exactly 50 grades as Moderate (the >=50 threshold)');
  eq(r.breakdown.length, 9, 'breakdown lists all 9 factors when all are present');
  check(r.breakdown.every(f => f.score === 50), 'every individual factor score is exactly 50');
  const weights = r.breakdown.map(f => f.weight);
  check(weights.every((w, i) => i === 0 || w <= weights[i - 1]),
        'breakdown is sorted by weight, descending');
}

{
  /* Same pool (so percentiles for every OTHER factor stay identical to the
     case above) but this run's target county is missing two optional
     fields -- the exact situation a county with no BLS/permits coverage
     hits in production. */
  const { countyData, stateData } = buildSyntheticEconomy(N);
  E._resetCache();
  E.readinessScore(countyData, stateData, CENTER_FIPS);   // warms the pool cache
  delete countyData.counties[CENTER_FIPS].building_permits;
  delete countyData.counties[CENTER_FIPS].avg_weekly_wage;
  const r = E.readinessScore(countyData, stateData, CENTER_FIPS);
  eq(r.completeness, 80, 'excluding a 10-weight and a 10-weight factor drops completeness to 80');
  eq(r.breakdown.length, 7, 'breakdown drops to 7 factors when 2 are missing');
  eq(r.score, 50,
     'excluding two factors that were themselves exactly at 50 does not move the average -- ' +
     'proof missing factors are excluded and reweighted, not silently scored as 0 ' +
     '(a scoring-as-0 regression would have pulled this down to 40)');
}

{
  const { countyData, stateData } = buildSyntheticEconomy(N);
  E._resetCache();
  const r = E.readinessScore(countyData, stateData, 'not-a-real-fips');
  eq(r, null, 'readinessScore returns null for a county with no record at all');
}

{
  const { countyData, stateData } = buildSyntheticEconomy(N);
  countyData.counties['99001'] = { name: 'Empty County', state_fips: '99' };
  E._resetCache();
  const r = E.readinessScore(countyData, stateData, '99001');
  eq(r, null, 'readinessScore returns null (not a fabricated score) when every factor is missing');
}

{
  /* Comparative check on invert direction: two counties differing ONLY in
     unemployment rate. Lower unemployment is better, so it must score
     higher despite having the numerically LARGER raw... no, the numerically
     SMALLER raw unemployment value. */
  const n = 25;
  const { countyData, stateData } = buildSyntheticEconomy(n);
  const lowUnemploymentFips = String(n).padStart(2, '0') + '001';   // inverted = 0 (best)
  const highUnemploymentFips = '01001';                              // inverted = n-1 (worst)
  E._resetCache();
  const lo = E.readinessScore(countyData, stateData, lowUnemploymentFips);
  const hi = E.readinessScore(countyData, stateData, highUnemploymentFips);
  const loFactor = lo.breakdown.find(f => f.key === 'unemployment');
  const hiFactor = hi.breakdown.find(f => f.key === 'unemployment');
  check(loFactor.score > hiFactor.score,
        'invert:true factors score LOWER raw values HIGHER (unemployment is a cost signal)');
}

{
  /* Cache invalidation: a stale pool from a previous dataset must not leak
     into a readinessScore call against a brand-new dataset after a reload
     (_resetCache is what economy-view.js calls whenever data is refetched). */
  const a = buildSyntheticEconomy(N);
  E._resetCache();
  const before = E.readinessScore(a.countyData, a.stateData, CENTER_FIPS);

  const b = buildSyntheticEconomy(N);
  // Skew dataset B so the center county is now the best on every factor.
  for (const fips in b.countyData.counties) {
    const c = b.countyData.counties[fips];
    if (fips === CENTER_FIPS) continue;
    c.metrics.population.change_5y_pct = -1000;
    c.metrics.bachelors_or_higher_pct.value = -1000;
  }
  E._resetCache();
  const after = E.readinessScore(b.countyData, b.stateData, CENTER_FIPS);
  check(after.score > before.score,
        '_resetCache() clears the pool cache so a new dataset is not scored against stale data');
}

/* ══════════════════════════ countySignals() ══════════════════════════ */

{
  const counties = {
    '51107': {
      name: 'Loudoun County',
      metrics: {
        population: { change_5y_pct: 40 },              // well above median -> momentum signal
        median_household_income: { change_5y_pct: 5 },
        bachelors_or_higher_pct: { value: 10 },
        broadband_pct: { value: 10 },
      },
    },
    '51059': { name: 'Fairfax County', metrics: { population: { change_5y_pct: -2 } } },
  };
  const countyData = { counties };

  const loudoun = E.countySignals(countyData, '51107');
  check(Array.isArray(loudoun), 'countySignals returns an array');
  check(loudoun.some(s => s.id === 'population_momentum'),
        'a county whose growth beats the national median gets the population_momentum signal');
  check(loudoun.every(s => typeof s.text === 'string' && s.text.length > 0),
        'every emitted signal carries human-readable, traceable text');

  const missing = E.countySignals(countyData, '00000');
  eq(missing, [], 'countySignals returns an empty array for an unknown fips, not an error');
}

check(Array.isArray(E.SIGNAL_RULES) && E.SIGNAL_RULES.length > 0,
      'SIGNAL_RULES is a non-empty rule table');
check(E.SIGNAL_RULES.every(r => typeof r.id === 'string' && typeof r.test === 'function'),
      'every signal rule has an id and a test function');

/* ══════════════════════════ quantileBreaks() ══════════════════════════ */

eq(E.quantileBreaks([], 5), null, 'quantileBreaks of no data is null');
{
  const qb = E.quantileBreaks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
  eq(qb.min, 1, 'quantileBreaks reports the true min');
  eq(qb.max, 10, 'quantileBreaks reports the true max');
  eq(qb.count, 10, 'quantileBreaks counts only the finite values supplied');
  eq(qb.breaks.length, 4, 'quantileBreaks returns classes-1 break points');
}
eq(E.quantileBreaks([1, null, undefined, NaN, 3], 5).count, 2,
   'quantileBreaks excludes null/undefined/NaN rather than treating them as 0');

/* ══════════════════════════ summary ══════════════════════════ */

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
