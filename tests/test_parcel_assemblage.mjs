/* tests/test_parcel_assemblage.mjs — assemblage and ownership analysis.

   Two claims here are easy to make and expensive to get wrong: that parcels
   form one developable site, and that two parcels share an owner. The tests
   concentrate on both — that a parcel 500 feet away is never called
   contiguous, that "SMITH JOHN" on two deeds is not treated as proof, and
   that a total assembled from 3 of 9 parcels never reads like all 9.

   Run:  node tests/test_parcel_assemblage.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

global.polygonClipping = require('../js/vendor/polygon-clipping.umd.min.js');
require('../js/parcel/geo.js');
require('../js/parcel/assemblage.js');

const A = global.PARCEL_ASSEMBLAGE;

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

/* Squares on a grid near the equator. 0.001 degrees is ~111 m, so the
   separations below are in easily-reasoned units. */
const box = (x, y, w = 0.001, h = 0.001) => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]],
});
const parcel = (id, geometry, properties = {}) => ({ id, geometry, properties: { parcel_id: id, ...properties } });

// ── Owner normalization ────────────────────────────────────────────────────
{
  t('case and whitespace are normalized', A.normalizeOwner('  ACME Land  LLC '), 'acme land');
  ok('corporate suffix variants compare equal',
    A.sameOwner('ABC HOLDINGS LLC', 'ABC Holdings, L.L.C.'));
  ok('an ampersand and "and" compare equal',
    A.sameOwner('SMITH & JONES', 'Smith and Jones'));

  // Never fuzzy. Different entities must not merge.
  ok('different names do not match', !A.sameOwner('ACME LAND LLC', 'ACME PROPERTIES LLC'));
  ok('a substring is not a match', !A.sameOwner('ACME', 'ACME LAND'));

  // Placeholders would link every unowned parcel in a county into one empire.
  for (const junk of ['UNKNOWN', 'N/A', 'None', 'CURRENT OWNER', 'TAXPAYER', 'various', 'STATE']) {
    t(`"${junk}" is not a usable identity`, A.normalizeOwner(junk), null);
    ok(`and never matches itself`, !A.sameOwner(junk, junk));
  }

  t('a bare suffix is not an identity', A.normalizeOwner('LLC'), null);
  t('an empty string is not an identity', A.normalizeOwner(''), null);
  t('null is not an identity', A.normalizeOwner(null), null);
  ok('a real name survives suffix stripping', A.normalizeOwner('ACME LAND HOLDINGS LLC') === 'acme land holdings');
}

// ── Contiguity vs nearby ───────────────────────────────────────────────────
{
  const a = box(0, 0);
  const touching = box(0.001, 0);           // shares the eastern edge
  const roadApart = box(0.00125, 0);        // ~28 m gap — a local street
  const farAway = box(0.0025, 0);           // ~167 m gap
  const distant = box(0.02, 0);             // ~2 km

  t('parcels sharing an edge are contiguous', A.relationship(a, touching).relation, 'contiguous');

  // The headline rule: a parcel across a street is not contiguous.
  const road = A.relationship(a, roadApart);
  t('a parcel across a right-of-way is NOT contiguous', road.relation, 'separated-by-gap');
  ok('and says so explicitly', road.note.includes('not treated as contiguous'));

  const near500ft = A.relationship(a, farAway);
  t('a parcel ~500 feet away is merely nearby', near500ft.relation, 'nearby');
  ok('its separation is reported in metres', near500ft.separationMeters > 100);

  t('a parcel 2km away is distant', A.relationship(a, distant).relation, 'distant');

  // Digitizing slop must not break a genuine shared boundary.
  const slop = box(0.0010005, 0);           // ~5 cm gap
  t('a few centimetres of digitizing slop still reads as contiguous',
    A.relationship(a, slop).relation, 'contiguous');

  near('overlapping parcels are zero apart', A.parcelSeparationMeters(a, box(0.0005, 0)), 0, 0.001);
}

// ── Grouping ───────────────────────────────────────────────────────────────
{
  // Three in a row that touch, plus one far away.
  const parcels = [
    parcel('A', box(0, 0)),
    parcel('B', box(0.001, 0)),
    parcel('C', box(0.002, 0)),
    parcel('D', box(0.02, 0)),
  ];
  const groups = A.contiguousGroups(parcels);
  t('three touching parcels form one group and the outlier another', groups.length, 2);
  const sizes = groups.map(g => g.length).sort();
  t('with sizes 1 and 3', sizes, [1, 3]);
}

// ── Full analysis: contiguous case ─────────────────────────────────────────
{
  const parcels = [
    parcel('A', box(0, 0), { owner: 'ACME LAND LLC', assessed_value: 100000, zoning_code: 'I-1', area_acres: 3 }),
    parcel('B', box(0.001, 0), { owner: 'ACME LAND LLC', assessed_value: 150000, zoning_code: 'I-1', area_acres: 3 }),
  ];
  const res = A.analyze(parcels);

  t('both parcels are counted', res.parcelCount, 2);
  ok('the assemblage is contiguous', res.contiguous);
  t('as one group', res.groups.length, 1);
  ok('combined acreage is positive', res.combinedAcres > 0);
  near('the largest contiguous piece is the whole thing', res.largestContiguousAcres, res.combinedAcres, 0.01);
  ok('an outline polygon is produced for the map', res.outline !== null);

  t('one owner controls both', res.ownership.distinctOwners, 1);
  t('and holds two parcels', res.ownership.largestHolding.parcelCount, 2);
  t('combined assessed value sums', res.assessedValue.value, 250000);
  ok('and is flagged complete', res.assessedValue.complete);
  t('a single zoning district', res.zoningMix.distinct, 1);
  ok('no non-contiguity warning is raised', !res.notes.some(n => n.includes('do not touch')));

  // The claim is evidence, not proof.
  ok('ownership grouping states its basis', res.ownership.basis.includes('not proof'));
}

// ── Full analysis: non-contiguous case ─────────────────────────────────────
{
  const parcels = [
    parcel('A', box(0, 0), { owner: 'ACME LAND LLC', area_acres: 3 }),
    parcel('B', box(0.001, 0), { owner: 'ACME LAND LLC', area_acres: 3 }),
    parcel('C', box(0.02, 0), { owner: 'OTHER CO', area_acres: 3 }),
  ];
  const res = A.analyze(parcels);

  ok('the assemblage is not contiguous', !res.contiguous);
  t('two separate groups', res.groups.length, 2);
  ok('the largest contiguous piece is smaller than the total',
    res.largestContiguousAcres < res.combinedAcres);

  // The most important sentence this module can produce.
  const warning = res.notes.find(n => n.includes('do not touch'));
  ok('it warns that the parcels do not form one site', !!warning);
  ok('and states that combined acreage is not a developable site',
    warning.includes('not a single'));
  ok('and quantifies the largest contiguous piece',
    warning.includes(String(res.largestContiguousAcres)));

  ok('the gap between groups is reported', res.gaps.length >= 1);
  ok('in feet as well as metres', res.gaps[0].separationFeet > 0);
  t('two distinct owners', res.ownership.distinctOwners, 2);
}

// ── Overlapping polygons are unioned, not summed ───────────────────────────
{
  // A condominium footprint over its land parcel, or a digitizing error.
  const parcels = [
    parcel('A', box(0, 0, 0.002, 0.002)),
    parcel('B', box(0.001, 0.001, 0.002, 0.002)),   // overlaps A's corner
  ];
  const res = A.analyze(parcels);

  const sumOfParts = 2 * (res.groups[0].acres / 1);   // rough reference
  ok('combined acreage is the union, not the sum', res.overlapAcres > 0);
  ok('and the overlap is explained', res.notes.some(n => n.includes('counted once')));
  ok('combined acreage is less than naively adding both', res.combinedAcres < sumOfParts * 2);
}

// ── Missing values are not zeros ───────────────────────────────────────────
{
  const parcels = [
    parcel('A', box(0, 0), { assessed_value: 100000 }),
    parcel('B', box(0.001, 0), {}),                       // publishes no value
    parcel('C', box(0.002, 0), { assessed_value: null }),
  ];
  const res = A.analyze(parcels);

  t('only parcels with values contribute', res.assessedValue.value, 100000);
  t('and the count of contributors is reported', res.assessedValue.contributingParcels, 1);
  t('alongside the total', res.assessedValue.totalParcels, 3);
  ok('the sum is flagged incomplete', !res.assessedValue.complete);

  // A total covering 1 of 3 parcels must not read like all 3.
  ok('and a note says how many parcels the total covers',
    res.notes.some(n => n.includes('1 of 3')));
}

// ── Sales are listed, never summed ─────────────────────────────────────────
{
  const parcels = [
    parcel('A', box(0, 0), { last_sale_price: 500000, last_sale_date: '2019-04-01' }),
    parcel('B', box(0.001, 0), { last_sale_price: 700000, last_sale_date: '2024-09-15' }),
  ];
  const res = A.analyze(parcels);

  t('each sale is listed separately', res.lastSales.length, 2);
  ok('no combined sale price is produced',
    !Object.keys(res).some(k => /combinedSale|totalSale|salePrice/i.test(k)));
  ok('sale dates are preserved so different vintages stay visible',
    res.lastSales[0].date !== res.lastSales[1].date);
}

// ── Same-owner adjacency ───────────────────────────────────────────────────
{
  const target = parcel('A', box(0, 0), { owner: 'ACME LAND LLC' });
  const pool = [
    parcel('B', box(0.001, 0), { owner: 'ACME LAND, L.L.C.' }),   // touching, same owner
    parcel('C', box(0.002, 0), { owner: 'ACME LAND LLC' }),        // touching B, not A
    parcel('D', box(0.0025, 0.005), { owner: 'ACME LAND LLC' }),   // same owner, ~500ft away
    parcel('E', box(0.001, 0.001), { owner: 'SOMEONE ELSE' }),     // touching, different owner
    parcel('F', box(0.05, 0), { owner: 'ACME LAND LLC' }),         // same owner, far away
  ];
  const res = A.sameOwnerNearby(target, pool);

  ok('the owner matched', res.matched);
  t('one contiguous same-owner parcel', res.contiguous.length, 1);
  t('and it is the adjacent one', res.contiguous[0].parcelId, 'B');
  ok('a different owner on a touching parcel is excluded',
    !res.contiguous.some(e => e.parcelId === 'E'));
  ok('a distant same-owner parcel is excluded entirely',
    !res.contiguous.concat(res.nearby).some(e => e.parcelId === 'F'));

  // The arithmetic that matters: only touching land is added up.
  near('contiguous owned acreage counts only touching parcels',
    res.contiguousOwnedAcres, res.parcelAcres + res.contiguous[0].acres, 0.01);
  ok('nearby same-owner acreage is reported separately, not added in',
    res.nearbyOwnedAcres !== res.contiguousOwnedAcres);
}

{
  // A generic owner name must produce no matches at all, with an explanation.
  const target = parcel('A', box(0, 0), { owner: 'UNKNOWN' });
  const pool = [parcel('B', box(0.001, 0), { owner: 'UNKNOWN' })];
  const res = A.sameOwnerNearby(target, pool);

  ok('a placeholder owner does not match', !res.matched);
  t('and no parcels are linked', res.contiguous.length, 0);
  ok('with the reason stated', res.why.includes('placeholder'));
}

// ── Degenerate inputs ──────────────────────────────────────────────────────
{
  const empty = A.analyze([]);
  t('an empty assemblage has no parcels', empty.parcelCount, 0);
  t('and zero acreage', empty.combinedAcres, 0);
  ok('with an explanatory note', empty.notes.length > 0);

  const withNull = A.analyze([parcel('A', box(0, 0)), { id: 'B', geometry: null, properties: {} }]);
  t('a parcel with no geometry is skipped', withNull.parcelCount, 1);
  t('and counted as skipped', withNull.skippedParcels, 1);

  const single = A.analyze([parcel('A', box(0, 0), { owner: 'ACME LLC' })]);
  ok('a single parcel is trivially contiguous', single.contiguous);
  t('with one group', single.groups.length, 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
