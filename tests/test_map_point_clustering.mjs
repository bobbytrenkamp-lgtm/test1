/* tests/test_map_point_clustering.mjs — window.MAP_POINT_CLUSTERING, the
   grid-based clustering used to render the 53,826-record substation layer
   (and other large point layers) without one Leaflet marker per point at
   low zoom.

   Run:  node tests/test_map_point_clustering.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
require('../js/map-point-clustering.js');

const C = global.MAP_POINT_CLUSTERING;

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}
function t(name, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  same ? pass++ : fail++;
  console.log(`${same ? 'PASS' : 'FAIL'}  ${name}`);
  if (!same) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}

// ── cellSizeForZoom ──────────────────────────────────────────────────────
{
  ok('cell size shrinks as zoom increases', C.cellSizeForZoom(2) > C.cellSizeForZoom(10));
  ok('cell size never goes to zero (a floor is enforced)', C.cellSizeForZoom(30) > 0);
  ok('an invalid zoom falls back to a sane default rather than NaN', Number.isFinite(C.cellSizeForZoom(undefined)));
}

// ── clusterPoints: real clustering ───────────────────────────────────────
{
  // Two points close together at national zoom collapse into one cluster.
  // Coordinates deliberately mid-cell (not near a grid-cell boundary) so
  // the test exercises ordinary clustering, not boundary-straddling.
  const points = [
    { lat: 39.1234, lon: -77.6234, id: 'a' },
    { lat: 39.1235, lon: -77.6235, id: 'b' },
  ];
  const { clusters, singles } = C.clusterPoints(points, { zoom: 3 });
  t('two adjacent points at national zoom form exactly one cluster', clusters.length, 1);
  t('no singles when both points clustered', singles.length, 0);
  t('the cluster count matches the real point count', clusters[0].count, 2);
  t('both real points are preserved inside the cluster, not discarded', clusters[0].items.length, 2);
}

{
  // Two points far apart never cluster, regardless of zoom.
  const points = [
    { lat: 38.0, lon: -122.0, id: 'west' },
    { lat: 40.0, lon: -74.0, id: 'east' },
  ];
  const { clusters, singles } = C.clusterPoints(points, { zoom: 3 });
  t('two continents apart never merge into one cluster', clusters.length, 0);
  t('both render as individual singles', singles.length, 2);
}

{
  // A single isolated point is a "single", not a "cluster of 1".
  const points = [{ lat: 39.0, lon: -77.5, id: 'lonely' }];
  const { clusters, singles } = C.clusterPoints(points, { zoom: 10 });
  t('a lone point is a single, not a cluster', clusters.length, 0);
  t('the single point is returned', singles.length, 1);
}

{
  // Cluster position is a real mean of its members, not an arbitrary grid corner.
  const points = [
    { lat: 39.13, lon: -77.63 },
    { lat: 39.15, lon: -77.65 },
  ];
  const { clusters } = C.clusterPoints(points, { zoom: 3 });
  ok('a real cluster formed for this pair', clusters.length === 1);
  ok('cluster position is a real centroid, not a fabricated cell corner',
    clusters.length === 1 &&
    Math.abs(clusters[0].lat - 39.14) < 0.001 && Math.abs(clusters[0].lon - (-77.64)) < 0.001);
}

// ── clusterPoints: viewport bounds ───────────────────────────────────────
{
  const points = [
    { lat: 39.0, lon: -77.5, id: 'in-view' },
    { lat: 10.0, lon: 20.0, id: 'far-away' },
  ];
  const bounds = [-78, 38, -77, 40];
  const { clusters, singles } = C.clusterPoints(points, { zoom: 10, bounds });
  const allPts = [...clusters.flatMap(c => c.items), ...singles];
  t('a point far outside the viewport bounds is dropped entirely, not just unclustered', allPts.length, 1);
  ok('the in-view point survives', allPts[0].id === 'in-view');
}

// ── clusterPoints: malformed input isolation ─────────────────────────────
{
  const points = [
    { lat: 39.0, lon: -77.5, id: 'good' },
    { lat: null, lon: -77.5, id: 'bad-lat' },
    { lat: 39.0, lon: undefined, id: 'bad-lon' },
    null,
  ];
  const { clusters, singles } = C.clusterPoints(points, { zoom: 10 });
  const allPts = [...clusters.flatMap(c => c.items), ...singles];
  t('malformed points (missing/null coordinates, null entries) are skipped, not thrown', allPts.length, 1);
}

// ── clusterPoints: singleThreshold ───────────────────────────────────────
{
  const points = [
    { lat: 39.0, lon: -77.5 }, { lat: 39.0001, lon: -77.5001 }, { lat: 39.0002, lon: -77.5002 },
  ];
  const strict = C.clusterPoints(points, { zoom: 3, singleThreshold: 5 });
  t('a threshold above the real cell count means nothing clusters', strict.clusters.length, 0);
  t('all 3 points return as singles instead', strict.singles.length, 3);
}

// ── clusterRadius ─────────────────────────────────────────────────────────
{
  ok('radius grows with cluster size', C.clusterRadius(1000) > C.clusterRadius(2));
  ok('radius growth is sublinear (50,000 is not 25,000x the radius of 2)',
    C.clusterRadius(50000) < C.clusterRadius(2) * 100);
  ok('radius is capped so an enormous cluster does not dominate the screen', C.clusterRadius(1000000) <= 28);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
