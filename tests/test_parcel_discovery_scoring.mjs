/* tests/test_parcel_discovery_scoring.mjs — unit tests for
   data/parcel_pipeline/discovery/scoring.mjs's deterministic scorer: every
   positive factor and penalty in isolation, band boundaries, and the
   wrong-jurisdiction / tile-only-no-geometry hard-reject short-circuits.

   Pure module, no mocking needed.

   Run:  node tests/test_parcel_discovery_scoring.mjs
*/
import {
  POSITIVE_FACTORS, PENALTIES, BANDS,
  fieldCoverageScore, classifyScore, scoreCandidate,
} from '../data/parcel_pipeline/discovery/scoring.mjs';

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

function baseCandidate(overrides = {}) {
  return {
    jurisdictionMatch: 'unknown',
    publisherType: 'unknown',
    geometryType: null,
    isTileOnly: false,
    queryable: false,
    requiresAuth: false,
    sampleRecords: [],
    sampleNullRatio: null,
    ...overrides,
  };
}

// ── fieldCoverageScore ──
t('fieldCoverageScore: 0/0 returns 0 (no divide-by-zero)', fieldCoverageScore(0, 0), 0);
t('fieldCoverageScore: full coverage caps at RICH_FIELD_COVERAGE_MAX',
  fieldCoverageScore(20, 20), POSITIVE_FACTORS.RICH_FIELD_COVERAGE_MAX);
t('fieldCoverageScore: half coverage is half the cap',
  fieldCoverageScore(10, 20), Math.round(0.5 * POSITIVE_FACTORS.RICH_FIELD_COVERAGE_MAX));
t('fieldCoverageScore: over-100% ratio still capped (never exceeds max)',
  fieldCoverageScore(30, 20), POSITIVE_FACTORS.RICH_FIELD_COVERAGE_MAX);

// ── classifyScore: band boundaries ──
t('classifyScore: 85 exactly is strong', classifyScore(85), 'strong');
t('classifyScore: 84 is good (just under strong)', classifyScore(84), 'good');
t('classifyScore: 70 exactly is good', classifyScore(70), 'good');
t('classifyScore: 69 is marginal (just under good)', classifyScore(69), 'marginal');
t('classifyScore: 50 exactly is marginal', classifyScore(50), 'marginal');
t('classifyScore: 49 is weak (just under marginal)', classifyScore(49), 'weak');
t('classifyScore: 0 is weak', classifyScore(0), 'weak');
t('classifyScore: negative score is weak', classifyScore(-40), 'weak');
ok('BANDS is ordered highest-first', BANDS[0].min > BANDS[1].min && BANDS[1].min > BANDS[2].min && BANDS[2].min > BANDS[3].min);

// ── scoreCandidate: hard rejects short-circuit before any numeric score ──
{
  const wrongJurisdiction = baseCandidate({ jurisdictionMatch: 'wrong', publisherType: 'official', geometryType: 'polygon' });
  const result = scoreCandidate(wrongJurisdiction);
  t('wrong-jurisdiction: hard reject regardless of other strong evidence',
    { rejected: result.rejected, rejectReason: result.rejectReason, score: result.score, band: result.band },
    { rejected: true, rejectReason: 'wrong-jurisdiction', score: null, band: null });
}
{
  const tileOnlyNoGeom = baseCandidate({ isTileOnly: true, geometryType: null });
  const result = scoreCandidate(tileOnlyNoGeom);
  t('tile-only with no queryable geometry: hard reject',
    { rejected: result.rejected, rejectReason: result.rejectReason, score: result.score, band: result.band },
    { rejected: true, rejectReason: 'tile-only-no-queryable-geometry', score: null, band: null });
}
{
  // Tile-only but WITH a geometry type present is not a hard reject -- just
  // the heavy TILE_ONLY penalty applies below, since some tile services do
  // still expose queryable feature geometry via a companion endpoint.
  const tileOnlyWithGeom = baseCandidate({ isTileOnly: true, geometryType: 'polygon' });
  const result = scoreCandidate(tileOnlyWithGeom);
  ok('tile-only WITH a geometry type is not a hard reject', result.rejected === false);
}

// ── scoreCandidate: each positive factor in isolation ──
t('official publisher alone scores exactly OFFICIAL_PUBLISHER',
  scoreCandidate(baseCandidate({ publisherType: 'official' })).score, POSITIVE_FACTORS.OFFICIAL_PUBLISHER);
t('polygon geometry alone scores exactly POLYGON_GEOMETRY',
  scoreCandidate(baseCandidate({ geometryType: 'polygon' })).score, POSITIVE_FACTORS.POLYGON_GEOMETRY);
t('queryable (non-tile) alone scores exactly QUERYABLE',
  scoreCandidate(baseCandidate({ queryable: true })).score, POSITIVE_FACTORS.QUERYABLE);
t('exact jurisdiction match alone scores exactly EXACT_JURISDICTION_MATCH',
  scoreCandidate(baseCandidate({ jurisdictionMatch: 'exact' })).score, POSITIVE_FACTORS.EXACT_JURISDICTION_MATCH);
t('real, non-null sample records alone scores exactly REAL_SAMPLE_RECORDS',
  scoreCandidate(baseCandidate({ sampleRecords: [{ PIN: '123' }], sampleNullRatio: 0.1 })).score,
  POSITIVE_FACTORS.REAL_SAMPLE_RECORDS);

// ── scoreCandidate: each penalty in isolation ──
t('point geometry alone scores exactly POINT_GEOMETRY penalty',
  scoreCandidate(baseCandidate({ geometryType: 'point' })).score, PENALTIES.POINT_GEOMETRY);
t('tile-only (with a geometry type, so not hard-rejected) scores exactly TILE_ONLY penalty',
  // geometryType:'line' deliberately used here (not polygon/point) so this
  // isolates only the tile-only penalty -- 'line' doesn't itself add or
  // subtract any factor, unlike polygon (+20) or point (-35).
  scoreCandidate(baseCandidate({ isTileOnly: true, geometryType: 'line' })).score, PENALTIES.TILE_ONLY);
t('auth required alone scores exactly AUTH_REQUIRED penalty',
  scoreCandidate(baseCandidate({ requiresAuth: true })).score, PENALTIES.AUTH_REQUIRED);
t('unverified third-party mirror alone scores exactly UNVERIFIED_THIRD_PARTY_MIRROR penalty',
  scoreCandidate(baseCandidate({ publisherType: 'third-party', thirdPartyMirrorVerified: false })).score,
  PENALTIES.UNVERIFIED_THIRD_PARTY_MIRROR);
ok('third-party mirror that IS verified does NOT take the penalty',
  scoreCandidate(baseCandidate({ publisherType: 'third-party', thirdPartyMirrorVerified: true })).score === 0);
t('mostly-null samples alone scores exactly MOSTLY_NULL_SAMPLES penalty (not the positive factor)',
  scoreCandidate(baseCandidate({ sampleRecords: [{ PIN: null }], sampleNullRatio: 0.9 })).score,
  PENALTIES.MOSTLY_NULL_SAMPLES);

// ── scoreCandidate: field coverage factor requires both fieldMapPreview and totalCanonicalFieldCount ──
{
  const withCoverage = baseCandidate({
    fieldMapPreview: { fieldMap: { parcel_id: 'PIN', owner: 'OWNER', assessed_value: 'AV' }, notProvidedBySource: [], requiresReview: [] },
    totalCanonicalFieldCount: 6,
  });
  const result = scoreCandidate(withCoverage);
  t('field coverage factor: 3/6 matched scores half the coverage cap',
    result.score, Math.round(0.5 * POSITIVE_FACTORS.RICH_FIELD_COVERAGE_MAX));
}
{
  const noCoverageInfo = baseCandidate({ fieldMapPreview: { fieldMap: { parcel_id: 'PIN' } } });
  t('field coverage factor: missing totalCanonicalFieldCount contributes nothing',
    scoreCandidate(noCoverageInfo).score, 0);
}

// ── scoreCandidate: a realistic strong candidate composes to the 'strong' band ──
{
  const strong = baseCandidate({
    publisherType: 'official', geometryType: 'polygon', queryable: true,
    jurisdictionMatch: 'exact', sampleRecords: [{ PIN: '123' }], sampleNullRatio: 0.0,
    fieldMapPreview: { fieldMap: { parcel_id: 'PIN', owner: 'OWNER', assessed_value: 'AV', address: 'ADDR' } },
    totalCanonicalFieldCount: 4,
  });
  const result = scoreCandidate(strong);
  const expectedScore = POSITIVE_FACTORS.OFFICIAL_PUBLISHER + POSITIVE_FACTORS.POLYGON_GEOMETRY
    + POSITIVE_FACTORS.QUERYABLE + POSITIVE_FACTORS.EXACT_JURISDICTION_MATCH
    + POSITIVE_FACTORS.REAL_SAMPLE_RECORDS + POSITIVE_FACTORS.RICH_FIELD_COVERAGE_MAX;
  t('realistic strong candidate: score sums every applicable factor', result.score, expectedScore);
  t('realistic strong candidate: bands to strong', result.band, 'strong');
  ok('realistic strong candidate: breakdown has one entry per applicable factor', result.breakdown.length === 6);
}

// ── scoreCandidate: a realistic weak candidate composes penalties correctly ──
{
  const weak = baseCandidate({
    publisherType: 'third-party', thirdPartyMirrorVerified: false,
    geometryType: 'point', requiresAuth: true,
  });
  const result = scoreCandidate(weak);
  const expectedScore = PENALTIES.UNVERIFIED_THIRD_PARTY_MIRROR + PENALTIES.POINT_GEOMETRY + PENALTIES.AUTH_REQUIRED;
  t('realistic weak candidate: score sums every applicable penalty', result.score, expectedScore);
  t('realistic weak candidate: bands to weak', result.band, 'weak');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
