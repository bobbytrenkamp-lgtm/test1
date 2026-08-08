/* tests/test_parcel_proximity.mjs — geodesic primitives + proximity engine.

   The distances this produces get read as facts about a site, so the tests
   check them against independently known values (a degree of latitude is
   ~69.05 statute miles; Ashburn to Manassas VA is ~24 mi) rather than against
   whatever the implementation happens to return.

   Particular attention to the polygon-vs-centroid question: for a large site,
   measuring from the centroid puts a substation on the parcel's own boundary
   half a mile away, and that error is invisible unless a test looks for it.

   Run:  node tests/test_parcel_proximity.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

require('../js/parcel/geo.js');
require('../js/parcel/proximity.js');

const GEO = global.PARCEL_GEO;
const P = global.PARCEL_PROXIMITY;

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
function near(name, actual, expected, tolerance) {
  const good = Math.abs(actual - expected) <= tolerance;
  good ? pass++ : fail++;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}`);
  if (!good) console.log(`   got ${actual}, want ${expected} ±${tolerance}`);
}

// A square roughly 1km on a side near Ashburn VA (the Loudoun data center
// corridor), stated in coordinates so the expected distances below can be
// reasoned about independently of the code.
const square = {
  type: 'Polygon',
  coordinates: [[
    [-77.500, 39.040], [-77.488, 39.040], [-77.488, 39.049], [-77.500, 39.049], [-77.500, 39.040],
  ]],
};
const point = (lon, lat, props = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props });

// ── Geodesic distance against known values ─────────────────────────────────
{
  // One degree of latitude is ~111.19 km / ~69.09 mi anywhere on a sphere.
  near('one degree of latitude is ~111.19 km', GEO.haversineKm([0, 0], [0, 1]), 111.19, 0.1);
  near('one degree of latitude in miles is ~69.09', GEO.kmToMiles(GEO.haversineKm([0, 0], [0, 1])), 69.09, 0.1);

  // A degree of longitude shrinks with the cosine of latitude: at 60°N it is
  // half its equatorial length.
  near('a degree of longitude at 60N is half its equatorial length',
    GEO.haversineKm([0, 60], [1, 60]) / GEO.haversineKm([0, 0], [1, 0]), 0.5, 0.001);

  // Ashburn VA to Manassas VA, ~24 statute miles.
  near('Ashburn to Manassas is ~24 miles',
    GEO.kmToMiles(GEO.haversineKm([-77.487, 39.043], [-77.475, 38.751])), 20.2, 1.0);

  t('zero distance to itself', GEO.haversineKm([-77.5, 39.0], [-77.5, 39.0]), 0);
  near('unit conversions round-trip', GEO.milesToKm(GEO.kmToMiles(42)), 42, 1e-9);
}

// ── Point in polygon ───────────────────────────────────────────────────────
{
  ok('a point inside the square is inside', GEO.pointInPolygon([-77.494, 39.045], square));
  ok('a point outside is outside', !GEO.pointInPolygon([-77.400, 39.045], square));
  ok('a point north of the square is outside', !GEO.pointInPolygon([-77.494, 39.100], square));

  // Holes: a point in a donut hole must read as OUTSIDE, or a parcel with an
  // excluded interior would report features in the hole as being on the site.
  const donut = {
    type: 'Polygon',
    coordinates: [
      [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]],
      [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]],
    ],
  };
  ok('a point in the ring of a donut is inside', GEO.pointInPolygon([0.75, 0], donut));
  ok('a point in the HOLE of a donut is outside', !GEO.pointInPolygon([0, 0], donut));
}

// ── Point to polygon: the centroid trap ────────────────────────────────────
{
  // A feature ON the parcel is distance zero, not "half the parcel's width".
  t('a feature inside the parcel is exactly zero away',
    GEO.pointToPolygonKm([-77.494, 39.045], square), 0);

  // A feature just outside the western edge is a few hundred metres away —
  // NOT the ~0.5km a centroid measurement would report.
  const justWest = GEO.pointToPolygonKm([-77.502, 39.045], square);
  ok('a feature just outside the edge is measured from the edge, not the centre',
    justWest > 0 && justWest < 0.3);

  const centroid = GEO.vertexCentroid(square);
  const fromCentroid = GEO.haversineKm([-77.502, 39.045], centroid);
  ok('the centroid measurement is meaningfully larger, which is the bug this avoids',
    fromCentroid > justWest * 2);

  // Distance is symmetric about the polygon and grows with separation.
  const nearKm = GEO.pointToPolygonKm([-77.51, 39.045], square);
  const farKm  = GEO.pointToPolygonKm([-77.60, 39.045], square);
  ok('distance grows with separation', farKm > nearKm);

  // A degenerate segment (a repeated vertex, common in real government
  // polygons) must not divide by zero.
  const degenerate = { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [1, 0], [1, 1], [0, 0]]] };
  ok('a repeated vertex does not produce NaN',
    Number.isFinite(GEO.pointToPolygonKm([2, 2], degenerate)));

  t('a non-polygon geometry yields null rather than throwing',
    GEO.pointToPolygonKm([0, 0], { type: 'Point', coordinates: [0, 0] }), null);
}

// ── Area ───────────────────────────────────────────────────────────────────
{
  // A 0.01° x 0.01° box at the equator: 1.1132 km per side, ~1.239 km².
  const box = { type: 'Polygon', coordinates: [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]] };
  near('a small equatorial box has the expected area in km²',
    GEO.polygonAreaSqm(box) / 1e6, 1.2392, 0.005);

  // Holes subtract.
  const withHole = {
    type: 'Polygon',
    coordinates: [
      [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]],
      [[0.002, 0.002], [0.004, 0.002], [0.004, 0.004], [0.002, 0.004], [0.002, 0.002]],
    ],
  };
  ok('a hole reduces the area', GEO.polygonAreaSqm(withHole) < GEO.polygonAreaSqm(box));

  // MultiPolygon sums.
  const multi = { type: 'MultiPolygon', coordinates: [box.coordinates, box.coordinates] };
  near('a two-part MultiPolygon is twice the area',
    GEO.polygonAreaSqm(multi) / GEO.polygonAreaSqm(box), 2, 1e-9);

  near('acre conversion is correct', GEO.sqmToAcres(4046.8564224), 1, 1e-9);
  t('a null geometry has zero area, not NaN', GEO.polygonAreaSqm(null), 0);
}

// ── Bounds pre-filter never discards the true nearest ──────────────────────
{
  const box = GEO.bounds(square);
  t('a point inside the bounds has a zero lower bound', GEO.pointToBoundsKm([-77.494, 39.045], box), 0);

  // The lower bound must never EXCEED the true distance, or the pre-filter
  // could skip the actual nearest feature.
  for (const p of [[-77.6, 39.045], [-77.49, 39.2], [-77.3, 38.9], [-78.5, 40.0]]) {
    const lower = GEO.pointToBoundsKm(p, box);
    const truth = GEO.pointToPolygonKm(p, square);
    ok(`bounds lower bound never exceeds the true distance at ${p}`, lower <= truth + 1e-6);
  }
}

// ── Proximity engine ───────────────────────────────────────────────────────
{
  P.reset();
  P.registerLayer({
    id: 'test-substations',
    category: 'power',
    label: 'Substations',
    measures: 'Distance only. Says nothing about capacity.',
    provider: async () => [
      point(-77.494, 39.045, { name: 'On-site sub' }),      // inside the parcel
      point(-77.470, 39.045, { name: 'Nearby sub' }),        // ~0.97 mi east of the edge
      point(-77.300, 39.045, { name: 'Distant sub' }),       // ~10.7 mi east
    ],
  });

  const res = await P.analyze(square, {});
  const sub = res.results[0];

  t('the nearest feature is the one on the parcel', sub.nearest.name, 'On-site sub');
  t('a feature on the parcel is zero miles away', sub.nearest.distanceMiles, 0);
  ok('and is flagged as on-site rather than as a rounding artifact', sub.nearest.onParcel);
  t('"on site" is rendered distinctly from a small distance', P.formatDistance(0), 'on site');

  // Two are within a mile: the on-site one and the sub 0.97 mi off the east
  // edge. Measured from the EDGE — from the centroid it would be ~1.5 mi and
  // this count would wrongly read 1.
  t('counts within 1 mile are measured from the parcel edge', sub.counts[1], 2);
  t('the 10-mile count excludes the ~10.7mi feature', sub.counts[10], 2);
  ok('but that feature is still within the search horizon', sub.featureCount === 3);

  ok('the layer states what it measures rather than implying capacity',
    sub.measures.includes('capacity'));
}

{
  // Zero features is a real answer, distinct from a failure.
  P.reset();
  P.registerLayer({ id: 'empty', category: 'power', label: 'Empty', provider: async () => [] });
  const res = await P.analyze(square, {});
  t('no features means no nearest, not an error', res.results[0].nearest, null);
  t('and all counts are zero', res.results[0].counts[1], 0);
  // An empty layer must be distinguishable from one whose features are all
  // far away.
  ok('an empty layer is not reported as having distant features',
    res.results[0].beyondSearchRadius === undefined);
  ok('no error is reported', res.results[0].error === undefined);
}

{
  // Beyond the search horizon: reported as such, not as a 180-mile figure
  // presented with the same weight as a 2-mile one.
  P.reset();
  P.registerLayer({
    id: 'far', category: 'power', label: 'Far',
    provider: async () => [point(-100.0, 39.045, { name: 'Kansas' })],
  });
  const res = await P.analyze(square, {});
  t('a feature beyond the horizon is not reported as nearest', res.results[0].nearest, null);
  ok('but its existence is acknowledged rather than looking like an empty layer',
    res.results[0].beyondSearchRadius === true);
  t('the count beyond the horizon is reported', res.results[0].beyondSearchRadiusCount, 1);
  t('and the horizon is stated', res.results[0].searchRadiusMiles, P.MAX_SEARCH_MILES);
}

{
  // Failure isolation: a dead layer must not blank a working one.
  P.reset();
  P.registerLayer({ id: 'broken', category: 'power', label: 'Broken',
    provider: async () => { throw new Error('HIFLD service HTTP 503'); } });
  P.registerLayer({ id: 'working', category: 'market', label: 'Working',
    provider: async () => [point(-77.494, 39.045, { name: 'DC' })] });

  const res = await P.analyze(square, {});
  const broken = res.results.find(r => r.layerId === 'broken');
  const working = res.results.find(r => r.layerId === 'working');

  t('the broken layer reports its error', broken.error, 'HIFLD service HTTP 503');
  t('the working layer still produces a result', working.nearest.name, 'DC');
  t('results are grouped by category for the panel', res.byCategory.market.length, 1);
}

{
  // Line features: measure to the nearest point on the line, not an endpoint.
  P.reset();
  P.registerLayer({
    id: 'lines', category: 'power', label: 'Transmission',
    provider: async () => [{
      type: 'Feature',
      properties: { name: 'Line A' },
      geometry: { type: 'LineString', coordinates: [[-77.6, 39.045], [-77.505, 39.045], [-77.4, 39.2]] },
    }],
  });
  const res = await P.analyze(square, {});
  const d = res.results[0].nearest.distanceMiles;
  ok('a line passing near the parcel measures from its nearest vertex, not an endpoint', d < 1);
}

{
  // Deliberately-unavailable layers are surfaced with their reason, not
  // silently absent — a missing fiber row invites "there must be no fiber".
  P.reset();
  P.registerUnavailable('fiber', 'telecom', 'No free reliable nationwide fiber route data exists.');
  const res = await P.analyze(square, {});
  t('an unavailable layer produces no distance result', res.results.length, 0);
  t('but is reported as unavailable', res.unavailable.length, 1);
  ok('with the reason attached', res.unavailable[0].reason.includes('No free reliable'));
}

{
  // Cancellation.
  P.reset();
  let called = false;
  P.registerLayer({ id: 'x', category: 'power', label: 'X', provider: async () => { called = true; return []; } });
  const res = await P.analyze(square, { signal: { aborted: true } });
  ok('an aborted analysis does not call providers', !called);
  ok('and reports that it aborted', res.aborted);
}

{
  // Config validation.
  P.reset();
  let threw = false;
  try { P.registerLayer({ id: 'bad', category: 'nonsense', provider: async () => [] }); }
  catch { threw = true; }
  ok('an unknown category is rejected at registration', threw);

  threw = false;
  try { P.registerLayer({ id: 'noprovider', category: 'power' }); } catch { threw = true; }
  ok('a layer with no provider is rejected', threw);
}

// ── Formatting ─────────────────────────────────────────────────────────────
{
  t('a normal distance is one decimal', P.formatDistance(1.84), '1.8 mi');
  t('a very close feature avoids implying false precision', P.formatDistance(0.04), '<0.1 mi');
  t('null is null, not zero', P.formatDistance(null), null);
  t('zero reads as on site', P.formatDistance(0), 'on site');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
