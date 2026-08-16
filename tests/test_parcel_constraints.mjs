/* tests/test_parcel_constraints.mjs — constraint intersection engine.

   The numbers this produces ("18.1% of this parcel is in a mapped
   floodplain") go in front of someone deciding whether to buy land, so the
   tests check them against geometrically known answers and concentrate on
   the ways an intersection engine lies:

     - summing overlapping polygons so constrained area exceeds the parcel
     - reporting "0% constrained" when the check actually failed
     - relabelling leftover area as "buildable"

   Run:  node tests/test_parcel_constraints.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

global.polygonClipping = require('../js/vendor/polygon-clipping.umd.min.js');
require('../js/parcel/geo.js');
require('../js/parcel/constraints.js');

const GEO = global.PARCEL_GEO;
const C = global.PARCEL_CONSTRAINTS;

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

/* A parcel spanning 0..0.02 degrees in both axes near the equator, so the
   expected intersection FRACTIONS below follow directly from the geometry
   and don't depend on the area formula being right. */
const poly = (coords) => ({ type: 'Polygon', coordinates: [coords] });
const parcel = poly([[0, 0], [0.02, 0], [0.02, 0.02], [0, 0.02], [0, 0]]);
const feat = (geometry, props = {}) => ({ type: 'Feature', geometry, properties: props });

// The western half of the parcel: exactly 50%.
const westHalf = poly([[0, 0], [0.01, 0], [0.01, 0.02], [0, 0.02], [0, 0]]);
// The southern half: exactly 50%, overlapping westHalf in the SW quarter.
const southHalf = poly([[0, 0], [0.02, 0], [0.02, 0.01], [0, 0.01], [0, 0]]);
// A quarter in the NE corner: exactly 25%.
const neQuarter = poly([[0.01, 0.01], [0.02, 0.01], [0.02, 0.02], [0.01, 0.02], [0.01, 0.01]]);
const disjoint = poly([[1, 1], [1.01, 1], [1.01, 1.01], [1, 1.01], [1, 1]]);

// ── Raw intersection area ──────────────────────────────────────────────────
{
  const parcelSqm = GEO.polygonAreaSqm(parcel);
  near('the western half intersects at exactly 50%',
    C.intersectionAreaSqm(parcel, westHalf) / parcelSqm, 0.5, 0.001);
  near('the NE quarter intersects at exactly 25%',
    C.intersectionAreaSqm(parcel, neQuarter) / parcelSqm, 0.25, 0.001);

  // Zero and null are different facts and must stay different.
  t('a disjoint polygon intersects at exactly zero', C.intersectionAreaSqm(parcel, disjoint), 0);
  t('a non-polygon geometry yields null, not zero',
    C.intersectionAreaSqm(parcel, { type: 'Point', coordinates: [0, 0] }), null);
  t('a null geometry yields null', C.intersectionAreaSqm(parcel, null), null);

  // A constraint entirely containing the parcel is 100%, not more.
  const huge = poly([[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]);
  near('a constraint covering the whole parcel is 100%',
    C.intersectionAreaSqm(parcel, huge) / parcelSqm, 1.0, 0.001);
}

// ── Overlap must not double count ──────────────────────────────────────────
{
  C.reset();
  C.registerLayer({
    id: 'flood', constraintClass: 'flood', label: 'FEMA flood',
    provider: async () => [feat(westHalf), feat(southHalf)],
  });

  const res = await C.analyze(parcel, {});
  const flood = res.results[0];

  // West half (50%) UNION south half (50%) overlapping in the SW quarter
  // (25%) = 75%. Summing them would give 100%, which is the classic
  // double-counting bug.
  near('overlapping polygons in one layer are unioned, not summed', flood.pctOfParcel, 75, 0.5);
  ok('the result is well under the 100% that summing would produce', flood.pctOfParcel < 90);
  ok('it reports an intersection', flood.intersects);
  ok('acreage is reported', flood.areaAcres > 0);
}

// ── Cross-layer overlap must not double count either ───────────────────────
{
  C.reset();
  // Wetlands sit inside floodplains constantly — the single most common way
  // constrained acreage exceeds the parcel.
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood',
    provider: async () => [feat(westHalf)] });
  C.registerLayer({ id: 'wetland', constraintClass: 'wetland', label: 'Wetland',
    provider: async () => [feat(westHalf)] });

  const res = await C.analyze(parcel, {});
  near('each layer independently reports its own 50%', res.results[0].pctOfParcel, 50, 0.5);
  near('and so does the second', res.results[1].pctOfParcel, 50, 0.5);

  // But the COMBINED footprint is still 50%, not 100%.
  near('the combined constrained footprint unions across layers',
    res.summary.constrainedPct, 50, 0.5);
  ok('combined constrained acreage never exceeds the parcel',
    res.summary.constrainedAcres <= res.parcelAcres + 0.01);
}

// ── Zero constraints is a real answer ──────────────────────────────────────
{
  C.reset();
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood',
    provider: async () => [feat(disjoint)] });

  const res = await C.analyze(parcel, {});
  t('a disjoint constraint yields 0%', res.results[0].pctOfParcel, 0);
  ok('and does not claim an intersection', !res.results[0].intersects);
  ok('and is NOT marked unevaluated — this is a real zero', !res.results[0].unevaluated);
  t('the summary reports nothing constrained', res.summary.constrainedAcres, 0);
  ok('the summary is not flagged partial', !res.summary.partial);
}

{
  C.reset();
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood', provider: async () => [] });
  const res = await C.analyze(parcel, {});
  ok('a layer with no features is a genuine zero, not an unknown', !res.results[0].unevaluated);
  t('with zero area', res.results[0].areaAcres, 0);
}

// ── A failed check must never read as a clean result ───────────────────────
{
  C.reset();
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'FEMA',
    provider: async () => { throw new Error('FEMA NFHL HTTP 503'); } });
  C.registerLayer({ id: 'wetland', constraintClass: 'wetland', label: 'NWI',
    provider: async () => [feat(neQuarter)] });

  const res = await C.analyze(parcel, {});
  const flood = res.results.find(r => r.layerId === 'flood');
  const wet = res.results.find(r => r.layerId === 'wetland');

  t('a failing layer reports its error', flood.error, 'FEMA NFHL HTTP 503');
  ok('and is marked unevaluated, NOT 0% constrained', flood.unevaluated);
  ok('the working layer still produces a real answer', wet.pctOfParcel > 0);

  // The single most important assertion in this file: a partial picture must
  // never be presented as a complete one.
  ok('the summary is flagged partial when any layer failed', res.summary.partial);
  t('and counts what could not be evaluated', res.summary.layersUnevaluated, 1);
  t('alongside what could', res.summary.layersEvaluated, 1);
}

// ── Leftover area is never called "buildable" ──────────────────────────────
{
  C.reset();
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood',
    provider: async () => [feat(westHalf)] });
  const res = await C.analyze(parcel, {});

  ok('the leftover figure exists', res.summary.unconstrainedByCheckedLayersAcres > 0);
  near('and is the parcel minus the constrained part',
    res.summary.unconstrainedByCheckedLayersAcres,
    res.parcelAcres - res.summary.constrainedAcres, 0.02);

  // The name is load-bearing.
  const keys = Object.keys(res.summary);
  ok('no key claims "buildable"', !keys.some(k => /buildable/i.test(k)));
  ok('no key claims "usable"', !keys.some(k => /usable/i.test(k)));
  ok('the summary carries a due-diligence disclaimer',
    /due diligence/i.test(res.summary.disclaimer));
  ok('the disclaimer says it is not a delineation or determination',
    /delineation|determination/i.test(res.summary.disclaimer));
}

// ── A parcel entirely inside a constraint never exceeds 100% ──────────────
{
  C.reset();
  const huge = poly([[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]);
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood',
    provider: async () => [feat(huge)] });
  const res = await C.analyze(parcel, {});

  ok('percentage is capped at 100', res.results[0].pctOfParcel <= 100);
  near('a fully-covered parcel reports ~100%', res.results[0].pctOfParcel, 100, 0.5);
  ok('leftover acreage is zero, never negative',
    res.summary.unconstrainedByCheckedLayersAcres >= 0);
  ok('combined constrained percentage is also capped', res.summary.constrainedPct <= 100);
}

// ── Provenance and vintage ─────────────────────────────────────────────────
{
  C.reset();
  C.registerLayer({
    id: 'flood', constraintClass: 'flood', label: 'FEMA NFHL',
    source: 'FEMA National Flood Hazard Layer',
    sourceUpdatedAt: '2024-03-01',
    caveat: 'FEMA maps are coarse and often decades old.',
    provider: async () => [feat(westHalf)],
  });
  const res = await C.analyze(parcel, {});
  t('the source is carried through', res.results[0].source, 'FEMA National Flood Hazard Layer');
  t('so is the dataset vintage', res.results[0].sourceUpdatedAt, '2024-03-01');
  ok('and the layer-specific caveat', res.results[0].caveat.includes('decades old'));
}

// ── Unavailable layers ─────────────────────────────────────────────────────
{
  C.reset();
  C.registerUnavailable('slope', 'slope', 'No free nationwide slope-derived constraint layer is wired up yet.');
  const res = await C.analyze(parcel, {});
  t('an unavailable layer produces no result row', res.results.length, 0);
  t('but is reported as unavailable', res.unavailable.length, 1);
  ok('with the reason stated, so a missing row is never read as "no constraint here"',
    res.unavailable[0].reason.includes('wired up'));
}

// ── Caching ────────────────────────────────────────────────────────────────
{
  C.reset();
  C.clearCache();
  let calls = 0;
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood',
    provider: async () => { calls++; return [feat(westHalf)]; } });

  await C.analyze(parcel, { cacheKey: 'parcel-A' });
  t('the first analysis runs the provider', calls, 1);
  const second = await C.analyze(parcel, { cacheKey: 'parcel-A' });
  t('a repeat analysis of the same parcel is cached', calls, 1);
  near('and returns the same number', second.results[0].pctOfParcel, 50, 0.5);

  await C.analyze(parcel, { cacheKey: 'parcel-B' });
  t('a different parcel is not served from another parcel\'s cache', calls, 2);

  C.clearCache();
  t('clearCache empties it', C.cacheSize(), 0);
}

// ── Cache is actually bounded (regression) ──────────────────────────────────
// _trim() existed, was exported, and its own comment said "Bound the cache
// after each insert-heavy analyze() call" -- but nothing ever called it from
// inside analyze(), so PARCEL_CONSTRAINTS' cache grew without limit for the
// lifetime of the page no matter how many distinct parcels a user visited.
{
  C.reset();
  C.clearCache();
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood',
    provider: async () => [feat(westHalf)] });

  // MAX_CACHE is an internal constant (300), not exported -- exercise the
  // real public contract instead: analyze() for more distinct cache keys
  // than any reasonable bound, then assert the cache did not simply keep
  // growing forever.
  const KEYS = 400;
  for (let i = 0; i < KEYS; i++) {
    await C.analyze(parcel, { cacheKey: `bound-test-${i}` });
  }
  ok(`the cache does not grow past a bound even after ${KEYS} distinct parcels`,
    C.cacheSize() > 0 && C.cacheSize() < KEYS);
  C.clearCache();
}

// ── Cancellation and validation ────────────────────────────────────────────
{
  C.reset();
  let called = false;
  C.registerLayer({ id: 'x', constraintClass: 'flood', label: 'X',
    provider: async () => { called = true; return []; } });
  const res = await C.analyze(parcel, { signal: { aborted: true } });
  ok('an aborted analysis does not call providers', !called);
  ok('and says it aborted', res.aborted);
}

{
  C.reset();
  let threw = false;
  try { C.registerLayer({ id: 'bad', constraintClass: 'nonsense', provider: async () => [] }); }
  catch { threw = true; }
  ok('an unknown constraint class is rejected at registration', threw);

  threw = false;
  try { C.registerLayer({ id: 'noprov', constraintClass: 'flood' }); } catch { threw = true; }
  ok('a layer with no provider is rejected', threw);
}

// ── A parcel with no geometry ──────────────────────────────────────────────
{
  C.reset();
  C.registerLayer({ id: 'flood', constraintClass: 'flood', label: 'Flood',
    provider: async () => [feat(westHalf)] });
  const res = await C.analyze(null, {});
  ok('a parcel with no geometry is unevaluated, not 0% constrained',
    res.results[0].unevaluated);
  ok('and the summary says so', res.summary.partial);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
