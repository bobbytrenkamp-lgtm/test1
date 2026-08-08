/* tests/test_parcel_suitability.mjs — explainable site suitability score.

   A score is the easiest place in this whole system to hide a lie, so the
   tests check the properties that make it checkable rather than the values
   it happens to produce: that the total is exactly the weighted mean of its
   parts, that an unmeasured component is omitted rather than scored zero or
   fifty, and that a parcel we know nothing about scores null rather than 0.

   Run:  node tests/test_parcel_suitability.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

require('../js/parcel/suitability.js');
const S = global.PARCEL_SUITABILITY;

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

const prox = (layerId, distanceMiles, counts) => ({
  [layerId]: { nearest: distanceMiles == null ? null : { distanceMiles }, counts: counts || {} },
});

const richCtx = () => ({
  fips: '51107',
  acres: 120,
  properties: { county_fips: '51107', zoning_code: 'I-1' },
  proximity: {
    ...prox('substations', 1.5),
    ...prox('transmission-lines', 0.6),
    ...prox('interstates', 3.2),
    ...prox('data-centers', 2.1, { 1: 0, 3: 2, 5: 5, 10: 12 }),
  },
  constraintSummary: { constrainedPct: 8, partial: false, layersEvaluated: 2 },
  envelope: { conceptualUsableAcres: 95, partial: false },
});

// ── Interpolation ──────────────────────────────────────────────────────────
{
  const curve = [[0, 100], [10, 50], [20, 0]];
  t('at a breakpoint the value is exact', S.interpolate(10, curve), 50);
  t('below the first breakpoint it clamps', S.interpolate(-5, curve), 100);
  t('above the last it clamps', S.interpolate(999, curve), 0);
  t('midway between breakpoints it interpolates', S.interpolate(5, curve), 75);
  t('null input yields null, not zero', S.interpolate(null, curve), null);
  t('NaN yields null', S.interpolate(NaN, curve), null);

  // Monotonic curves must produce monotonic scores.
  let prev = 101;
  for (const miles of [0, 1, 2, 5, 10, 20, 40]) {
    const v = S.interpolate(miles, S.SUBSTATION_CURVE);
    ok(`substation score never rises with distance (${miles} mi)`, v <= prev);
    prev = v;
  }
}

// ── The arithmetic must be exactly what it claims ──────────────────────────
{
  const res = S.score(richCtx());
  ok('a rich parcel is scorable', res.scorable);
  ok('the overall score is in range', res.overall >= 0 && res.overall <= 100);

  // The single most important assertion in this file: a score with a hidden
  // term is the opaque number this design rejects.
  const weighted = res.components.reduce((sum, c) => sum + c.score * c.weight, 0);
  const available = res.components.reduce((sum, c) => sum + c.weight, 0);
  t('the overall is exactly the weighted mean of its components',
    res.overall, Math.round(weighted / available));

  ok('every component publishes its weight',
    res.components.every(c => typeof c.weight === 'number'));
  ok('every component publishes the rule that produced it',
    res.components.every(c => typeof c.rule === 'string' && c.rule.length > 20));
  ok('every component publishes the inputs it used',
    res.components.every(c => c.inputs && typeof c.inputs === 'object'));
  ok('components are ordered by weight so the panel leads with what matters',
    res.components[0].weight >= res.components[res.components.length - 1].weight);
}

// ── Determinism ────────────────────────────────────────────────────────────
{
  const a = S.score(richCtx());
  const b = S.score(richCtx());
  t('the same inputs produce byte-identical output', JSON.stringify(a), JSON.stringify(b));
}

// ── Missing components are omitted, never scored ───────────────────────────
{
  // Only acreage: every other component has nothing to work with.
  const thin = S.score({ acres: 100, properties: {} });

  ok('a thin parcel is still scorable on what we have', thin.scorable);
  t('only the site component scored', thin.components.length, 1);
  t('and it is the site one', thin.components[0].component, 'site');

  ok('the others are omitted, not scored', thin.omitted.length === 6);
  ok('none of the omitted appear as components with a zero',
    !thin.components.some(c => c.score === 0));
  ok('each omission states why', thin.omitted.every(o => o.why.includes('not available')));

  // Renormalization: a thin parcel with a good site must not be dragged down
  // by components that were never measured.
  t('the score is the site score alone, not diluted toward zero',
    thin.overall, thin.components[0].score);

  ok('coverage reports what share of weight was available', thin.coverage.availablePct > 0);
  ok('and it is well under 100', thin.coverage.availablePct < 50);
  ok('confidence is correspondingly low',
    ['low', 'very-low'].includes(thin.confidence));
  ok('the basis states how many components were omitted',
    thin.basis.includes('6 component(s) had no data'));
  ok('and says they were omitted rather than scored zero',
    thin.basis.includes('rather than scored zero'));
}

{
  // Direct comparison: the same good site scores the same whether or not
  // unmeasurable components are present. Omission must not be a penalty.
  const siteOnly = S.score({ acres: 200, properties: {} });
  const withPower = S.score({
    acres: 200, properties: {},
    proximity: { ...prox('substations', 1), ...prox('transmission-lines', 0.5) },
  });
  ok('adding a strong power component raises the score', withPower.overall >= siteOnly.overall);
  ok('and increases coverage', withPower.coverage.availablePct > siteOnly.coverage.availablePct);
}

// ── A parcel we know nothing about scores null, not zero ───────────────────
{
  const nothing = S.score({ properties: {} });
  t('an unmeasurable parcel has no score', nothing.overall, null);
  ok('and is explicitly not scorable', !nothing.scorable);
  ok('with an explanation', nothing.why.includes('None of the inputs'));
  t('coverage is zero', nothing.coverage.availablePct, 0);
  t('confidence is very low', nothing.confidence, 'very-low');

  // 0 would sort an unknown parcel below a genuinely poor one we did measure.
  ok('the score is null rather than 0', nothing.overall !== 0);
}

// ── Partial analyses are not scored ────────────────────────────────────────
{
  const partialConstraints = S.score({
    acres: 100, properties: {},
    constraintSummary: { constrainedPct: 5, partial: true, layersEvaluated: 1 },
  });
  ok('a partial constraint analysis is omitted, not scored 95',
    !partialConstraints.components.some(c => c.component === 'constraints'));

  const partialEnvelope = S.score({
    acres: 100, properties: {},
    envelope: { conceptualUsableAcres: 95, partial: true },
  });
  const site = partialEnvelope.components.find(c => c.component === 'site');
  t('a partial envelope is not used as usable acreage', site.inputs.conceptualUsableAcres, null);
  ok('and the rule says constrained land was not discounted',
    site.rule.includes('not discounted'));
}

// ── Proximity failures are omissions, not zeros ────────────────────────────
{
  const errored = S.score({
    acres: 100, properties: {},
    proximity: { 'substations': { error: 'HIFLD HTTP 503' }, 'transmission-lines': { error: 'HIFLD HTTP 503' } },
  });
  ok('a failed power layer omits the power component',
    !errored.components.some(c => c.component === 'power'));
  ok('rather than scoring it zero',
    !errored.components.some(c => c.component === 'power' && c.score === 0));

  // "Nothing within the search horizon" is a real, poor result — distinct
  // from a failed lookup.
  const nothingNearby = S.score({
    acres: 100, properties: {},
    proximity: { 'substations': { nearest: null, counts: {} } },
  });
  ok('a layer that found nothing nearby also omits rather than inventing a score',
    !nothingNearby.components.some(c => c.component === 'power'));
}

// ── Individual component behaviour ─────────────────────────────────────────
{
  const close = S.score({ acres: 100, properties: {}, proximity: { ...prox('substations', 0.5) } });
  const far = S.score({ acres: 100, properties: {}, proximity: { ...prox('substations', 25) } });
  const closePower = close.components.find(c => c.component === 'power').score;
  const farPower = far.components.find(c => c.component === 'power').score;
  ok('a nearby substation scores higher than a distant one', closePower > farPower);

  const clean = S.score({ acres: 100, properties: {}, constraintSummary: { constrainedPct: 0, partial: false } });
  const constrained = S.score({ acres: 100, properties: {}, constraintSummary: { constrainedPct: 60, partial: false } });
  t('an unconstrained parcel scores 100 on constraints',
    clean.components.find(c => c.component === 'constraints').score, 100);
  t('and 60% constrained scores 40',
    constrained.components.find(c => c.component === 'constraints').score, 40);

  const industrial = S.score({ acres: 100, properties: { zoning_code: 'I-2' } });
  const residential = S.score({ acres: 100, properties: { zoning_code: 'R-1' } });
  ok('industrial zoning scores above residential',
    industrial.components.find(c => c.component === 'landUse').score >
    residential.components.find(c => c.component === 'landUse').score);

  // An unrecognized code is an omission, not a low score — we do not know
  // what it means.
  const weird = S.score({ acres: 100, properties: { zoning_code: 'ZZQ-9' } });
  ok('an unrecognized zoning code is omitted rather than scored low',
    !weird.components.some(c => c.component === 'landUse'));

  ok('the land use rule says compatibility is not permission',
    industrial.components.find(c => c.component === 'landUse').rule.includes('does not mean this use is permitted'));
}

// ── Policy component reads the published index ─────────────────────────────
{
  global.DC_RISK_BY_FIPS = { '51107': { risk_score: 1 }, '06037': { risk_score: 5 } };

  const favorable = S.score({ acres: 100, fips: '51107', properties: {} });
  const risky = S.score({ acres: 100, fips: '06037', properties: {} });
  t('a very favorable county scores 100 on policy',
    favorable.components.find(c => c.component === 'policy').score, 100);
  t('a high-risk county scores 0',
    risky.components.find(c => c.component === 'policy').score, 0);
  ok('the rule says it is forward-looking, not current law',
    favorable.components.find(c => c.component === 'policy').rule.includes('not a record of current law'));

  const unlisted = S.score({ acres: 100, fips: '99999', properties: {} });
  ok('a county missing from the index omits policy rather than scoring it',
    !unlisted.components.some(c => c.component === 'policy'));

  delete global.DC_RISK_BY_FIPS;
  const noIndex = S.score({ acres: 100, fips: '51107', properties: {} });
  ok('with no risk index loaded, policy is omitted',
    !noIndex.components.some(c => c.component === 'policy'));
}

// ── Confidence bands ───────────────────────────────────────────────────────
{
  t('full coverage is high confidence', S.confidenceBand(100), 'high');
  t('85% is high', S.confidenceBand(85), 'high');
  t('70% is moderate', S.confidenceBand(70), 'moderate');
  t('40% is low', S.confidenceBand(40), 'low');
  t('10% is very low', S.confidenceBand(10), 'very-low');

  const rich = S.score(richCtx());
  ok('a fully-analyzed parcel reaches high or moderate confidence',
    ['high', 'moderate'].includes(rich.confidence));
}

// ── Disclaimer and explanations ────────────────────────────────────────────
{
  const res = S.score(richCtx());
  ok('the disclaimer calls it a screening score', res.disclaimer.includes('Screening score only'));
  ok('it denies being a judgement of suitability',
    res.disclaimer.includes('not a judgement that a property is suitable'));
  ok('it names what the score cannot see',
    /title|soils|willingness to serve/.test(res.disclaimer));
  ok('it says the number can be checked rather than trusted',
    res.disclaimer.includes('checked rather than trusted'));

  const lines = S.explain(res);
  ok('every scored component is explained', lines.length >= res.components.length);
  ok('explanations include the weight', lines.some(l => l.includes('weight')));

  const thin = S.score({ acres: 100, properties: {} });
  ok('omitted components are explained too',
    S.explain(thin).some(l => l.includes('not scored')));
}

// ── Weights are visible and sane ───────────────────────────────────────────
{
  const total = Object.values(S.WEIGHTS).reduce((a, b) => a + b, 0);
  t('weights sum to 100 for legibility', total, 100);
  ok('power is the heaviest component, matching the stated design',
    S.WEIGHTS.power === Math.max(...Object.values(S.WEIGHTS)));
  ok('every weight is positive', Object.values(S.WEIGHTS).every(w => w > 0));
  ok('every weighted component has a label',
    Object.keys(S.WEIGHTS).every(k => typeof S.LABELS[k] === 'string'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
