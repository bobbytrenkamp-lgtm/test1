/* tests/test_parcel_envelope.mjs — conceptual buildable envelope.

   This module produces the number most likely to be misread as a promise, so
   the tests concentrate on the ways it could overstate: applying lot coverage
   to gross acreage when half the site is floodplain, silently falling back to
   the un-subtracted parcel when clipping fails, and reporting more land after
   a setback than before it.

   Run:  node tests/test_parcel_envelope.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

global.polygonClipping = require('../js/vendor/polygon-clipping.umd.min.js');
require('../js/parcel/geo.js');
require('../js/parcel/envelope.js');

const GEO = global.PARCEL_GEO;
const E = global.PARCEL_ENVELOPE;

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
function near(name, actual, expected, tol) {
  const good = Math.abs(actual - expected) <= tol;
  good ? pass++ : fail++;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}`);
  if (!good) console.log(`   got ${actual}, want ${expected} ±${tol}`);
}

const poly = (c) => ({ type: 'Polygon', coordinates: [c] });
// ~0.02 x 0.02 degrees at the equator: about 4.95 km^2, ~1223 acres.
const parcel = poly([[0, 0], [0.02, 0], [0.02, 0.02], [0, 0.02], [0, 0]]);
const westHalf = poly([[0, 0], [0.01, 0], [0.01, 0.02], [0, 0.02], [0, 0]]);

// ── Constraint subtraction is exact ────────────────────────────────────────
{
  const sub = E.subtractConstraints(parcel, [westHalf]);
  ok('subtraction succeeds', !sub.failed);
  near('removing the western half leaves half the area',
    GEO.polygonAreaSqm(sub.geometry) / GEO.polygonAreaSqm(parcel), 0.5, 0.001);

  const none = E.subtractConstraints(parcel, []);
  t('no constraints leaves the parcel untouched', none.geometry, parcel);

  const all = E.subtractConstraints(parcel, [poly([[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]])]);
  t('a constraint covering everything leaves no geometry', all.geometry, null);
  ok('and that is a real result, not a failure', !all.failed);

  const bad = E.subtractConstraints(null, [westHalf]);
  ok('a parcel with no geometry is a failure, not an empty result', bad.failed);
}

// ── Setback erosion ────────────────────────────────────────────────────────
{
  const area = GEO.polygonAreaSqm(parcel);
  t('a zero setback removes nothing', E.erodedAreaSqm(parcel, 0), area);
  ok('a real setback removes land', E.erodedAreaSqm(parcel, 30) < area);

  // Never more land after a setback than before — the direction that would
  // overstate the site.
  for (const s of [1, 10, 50, 200, 1000]) {
    ok(`a ${s}m setback never increases area`, E.erodedAreaSqm(parcel, s) <= area + 1e-6);
  }

  // A setback wider than the parcel consumes it entirely. Zero is the correct
  // and meaningful answer.
  ok('a setback wider than the site leaves nothing, not a negative',
    E.erodedAreaSqm(parcel, 5000) === 0);

  // Against the known Steiner value for this square: A - P*s + pi*s^2.
  const P = GEO.perimeterMeters(parcel);
  const s = 50;
  near('erosion matches the inner parallel body formula',
    E.erodedAreaSqm(parcel, s), area - P * s + Math.PI * s * s, 1);
}

// ── Setback selection ──────────────────────────────────────────────────────
{
  t('the minimum of front/side/rear is used',
    E.effectiveSetbackFt({ front: 50, side: 15, rear: 25 }), 15);
  t('missing values are ignored', E.effectiveSetbackFt({ front: 50 }), 50);
  t('no setbacks at all yields null, not zero',
    E.effectiveSetbackFt({}), null);
  t('a zero setback is a real value, distinct from absent',
    E.effectiveSetbackFt({ front: 0 }), 0);
  t('non-numeric values are discarded',
    E.effectiveSetbackFt({ front: 'N/A', side: 20 }), 20);
}

// ── Full envelope ──────────────────────────────────────────────────────────
{
  const env = E.build(parcel, [westHalf], {
    setbacks: { front: 50, side: 25, rear: 25 },
    maximum_lot_coverage: { value: 60 },
  });

  ok('the result is labelled conceptual', env.conceptual === true);
  near('gross acreage is the whole parcel', env.grossAcres, GEO.sqmToAcres(GEO.polygonAreaSqm(parcel)), 1);
  near('half the parcel is constrained', env.constrainedAcres, env.grossAcres / 2, 2);
  near('and half remains after constraints', env.afterConstraintsAcres, env.grossAcres / 2, 2);

  ok('usable acreage is less than what remains after constraints (setbacks applied)',
    env.conceptualUsableAcres < env.afterConstraintsAcres);
  ok('and is never negative', env.conceptualUsableAcres >= 0);
  t('the setback actually used is reported', env.setbackFt, 25);

  // The step ledger is what keeps exact and estimated distinguishable.
  const constraintStep = env.steps.find(s => s.step === 'constraints');
  const setbackStep = env.steps.find(s => s.step === 'setbacks');
  ok('the constraint step is recorded as exact geometry', constraintStep.producesGeometry === true);
  ok('the setback step is recorded as NOT producing geometry', setbackStep.producesGeometry === false);
  ok('and names its method', setbackStep.method.includes('steiner'));
  ok('and states the basis for choosing one setback', setbackStep.setbackBasis.includes('least aggressive'));

  ok('a subtraction geometry is returned for the map', env.geometry !== null);
}

// ── Coverage must not exceed physically usable land ────────────────────────
{
  // 60% lot coverage on a parcel where 90% is constrained. Applying coverage
  // to GROSS acreage would produce a footprint six times larger than the land
  // it could sit on.
  const almostAll = poly([[0, 0], [0.018, 0], [0.018, 0.02], [0, 0.02], [0, 0]]);
  const env = E.build(parcel, [almostAll], {
    setbacks: { front: 10, side: 10, rear: 10 },
    maximum_lot_coverage: { value: 60 },
  });

  const usableSqft = env.conceptualUsableAcres * 43560;
  ok('the footprint never exceeds the usable land',
    env.conceptualMaxFootprintSqft <= usableSqft + 1);
  t('and the binding limit is reported as the land, not the zoning',
    env.footprintLimitedBy, 'usable-land');

  // The opposite case: plenty of land, zoning is the binding limit.
  const roomy = E.build(parcel, [], { setbacks: { front: 10, side: 10, rear: 10 }, maximum_lot_coverage: { value: 20 } });
  t('with ample land, zoning coverage is the binding limit', roomy.footprintLimitedBy, 'zoning-lot-coverage');
  ok('and site coverage does not exceed the zoning maximum', roomy.possibleSiteCoveragePct <= 20.1);
}

// ── Missing inputs are limitations, not clean results ──────────────────────
{
  const noSetbacks = E.build(parcel, [], { maximum_lot_coverage: { value: 50 } });
  ok('no setback standards marks the estimate partial', noSetbacks.partial);
  const step = noSetbacks.steps.find(s => s.step === 'setbacks');
  ok('and records that the step was not applied', step.applied === false);
  ok('with the reason', step.why.includes('no setback standards'));

  const noGeom = E.build(null, [], {});
  ok('a parcel with no geometry is partial', noGeom.partial);
  t('with no usable acreage claimed', noGeom.conceptualUsableAcres, null);
}

// ── Naming and disclaimer ──────────────────────────────────────────────────
{
  const env = E.build(parcel, [westHalf], { setbacks: { front: 20, side: 20, rear: 20 }, maximum_lot_coverage: { value: 50 } });
  const keys = Object.keys(env);

  // The name is the safeguard. "buildableAcres" would be read as a promise.
  ok('no key claims plain "buildable acreage"',
    !keys.some(k => /^buildable/i.test(k)));
  ok('the usable figure is explicitly conceptual', keys.includes('conceptualUsableAcres'));
  ok('the footprint figure is explicitly conceptual', keys.includes('conceptualMaxFootprintSqft'));

  ok('the disclaimer leads with "Conceptual planning estimate"',
    env.disclaimer.startsWith('Conceptual planning estimate'));
  ok('it says this is not buildable acreage', /not .*buildable acreage/i.test(env.disclaimer));
  ok('it names what is not modelled',
    /easements/i.test(env.disclaimer) && /stormwater/i.test(env.disclaimer));
  ok('it says it is not a survey', /not a survey/i.test(env.disclaimer));
}

// ── Ordering: constraints before setbacks ──────────────────────────────────
{
  // Applying the setback to the gross parcel and then subtracting constraints
  // would over-report, because the setback band would be partly inside the
  // constrained area and get double credit. The step order in the output
  // records which happened.
  const env = E.build(parcel, [westHalf], { setbacks: { front: 30, side: 30, rear: 30 } });
  t('constraints are the first step', env.steps[0].step, 'constraints');
  t('setbacks are the second', env.steps[1].step, 'setbacks');

  const noConstraint = E.build(parcel, [], { setbacks: { front: 30, side: 30, rear: 30 } });
  ok('a constrained parcel yields less usable land than an unconstrained one',
    env.conceptualUsableAcres < noConstraint.conceptualUsableAcres);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
