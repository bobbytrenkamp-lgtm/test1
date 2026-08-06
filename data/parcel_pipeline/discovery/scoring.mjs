/* data/parcel_pipeline/discovery/scoring.mjs — deterministic, auditable
 * candidate scoring for the permanent discovery pipeline.
 *
 * Pure — no fetching. Operates only on an already-built candidate record
 * (the normalized candidate-stub shape every discovery adapter produces,
 * augmented with a field-mapping preview). Every score is accompanied by a
 * breakdown array so a human reviewing output/<run-id>/candidates/<id>.json
 * can see exactly why a candidate landed where it did — no opaque single
 * number.
 */

export const POSITIVE_FACTORS = Object.freeze({
  OFFICIAL_PUBLISHER: 25,
  POLYGON_GEOMETRY: 20,
  QUERYABLE: 10,
  EXACT_JURISDICTION_MATCH: 15,
  RICH_FIELD_COVERAGE_MAX: 15,
  REAL_SAMPLE_RECORDS: 10,
});

export const PENALTIES = Object.freeze({
  POINT_GEOMETRY: -35,
  TILE_ONLY: -50,
  AUTH_REQUIRED: -50,
  UNVERIFIED_THIRD_PARTY_MIRROR: -20,
  MOSTLY_NULL_SAMPLES: -15,
});

/* Ordered highest-first; classifyScore picks the first band whose `min`
   the score meets or exceeds. */
export const BANDS = Object.freeze([
  { min: 85, label: 'strong' },
  { min: 70, label: 'good' },
  { min: 50, label: 'marginal' },
  { min: 0, label: 'weak' },
]);

const MOSTLY_NULL_THRESHOLD = 0.6; // sampleNullRatio at/above this counts as "mostly null"

/* Pure. Linear scale of matchedCanonicalCount/totalCanonicalCount, capped
   at POSITIVE_FACTORS.RICH_FIELD_COVERAGE_MAX. totalCanonicalCount=0
   returns 0 rather than dividing by zero. */
export function fieldCoverageScore(matchedCanonicalCount, totalCanonicalCount) {
  if (!totalCanonicalCount) return 0;
  const ratio = Math.max(0, Math.min(1, matchedCanonicalCount / totalCanonicalCount));
  return Math.round(ratio * POSITIVE_FACTORS.RICH_FIELD_COVERAGE_MAX);
}

/* Pure. Returns the label for the first band the score meets. A score
   below every band's min (shouldn't happen given BANDS' last entry is 0,
   but scores can be negative from penalties) falls through to 'weak'. */
export function classifyScore(score) {
  for (const band of BANDS) {
    if (score >= band.min) return band.label;
  }
  return 'weak';
}

/* Pure. candidate is the normalized candidate-stub shape (see
   discover_batch.mjs's header comment for the canonical field list),
   optionally augmented with `fieldMapPreview: {fieldMap, notProvidedBySource,
   requiresReview}` and `totalCanonicalFieldCount` for the field-coverage
   factor.
 *
 * Wrong-jurisdiction evidence is a hard reject: it short-circuits before
 * any numeric score is computed, so a wrong-jurisdiction candidate can
 * never be mistaken for "a real but low-scoring" one by anyone only
 * glancing at a number. Two other conditions are also hard rejects per
 * the user's spec: "service metadata contradicts title" and "same-name
 * county in the wrong state" both collapse to jurisdictionMatch === 'wrong'
 * at the adapter layer, which is where that determination is actually
 * made (adapters have the county-name/state context; scoring.mjs doesn't
 * re-derive it).
 */
export function scoreCandidate(candidate) {
  if (candidate.jurisdictionMatch === 'wrong') {
    return {
      rejected: true,
      rejectReason: 'wrong-jurisdiction',
      score: null,
      band: null,
      breakdown: [{ factor: 'jurisdictionMatch', points: null, reason: 'jurisdictionMatch === "wrong" — hard reject regardless of any other evidence' }],
    };
  }
  if (candidate.isTileOnly && candidate.geometryType == null) {
    // Tile-only layers with no queryable geometry at all can't back this
    // app's feature (attribute) queries — also a hard reject, not just a
    // heavy penalty, since there is nothing usable to fall back to.
    return {
      rejected: true,
      rejectReason: 'tile-only-no-queryable-geometry',
      score: null,
      band: null,
      breakdown: [{ factor: 'isTileOnly', points: null, reason: 'tile-only layer with no queryable feature geometry' }],
    };
  }

  const breakdown = [];
  let score = 0;

  function add(factor, points, reason) {
    score += points;
    breakdown.push({ factor, points, reason });
  }

  if (candidate.publisherType === 'official') {
    add('official-publisher', POSITIVE_FACTORS.OFFICIAL_PUBLISHER, `publisherType=official (${candidate.publisherName || 'unnamed'})`);
  }

  if (candidate.geometryType === 'polygon') {
    add('polygon-geometry', POSITIVE_FACTORS.POLYGON_GEOMETRY, 'geometryType=polygon');
  } else if (candidate.geometryType === 'point') {
    add('point-geometry-penalty', PENALTIES.POINT_GEOMETRY, 'geometryType=point (parcels need polygon boundaries)');
  }

  if (candidate.isTileOnly) {
    add('tile-only-penalty', PENALTIES.TILE_ONLY, 'service is tile-cached only, not a queryable feature layer');
  } else if (candidate.queryable) {
    add('queryable', POSITIVE_FACTORS.QUERYABLE, 'service supports attribute/spatial query');
  }

  if (candidate.jurisdictionMatch === 'exact') {
    add('exact-jurisdiction-match', POSITIVE_FACTORS.EXACT_JURISDICTION_MATCH, 'jurisdictionMatch=exact (confirmed via FIPS/county-name/jurisdiction-code field or sample-record confirmation, not bounding-box)');
  }

  if (candidate.requiresAuth) {
    add('auth-required-penalty', PENALTIES.AUTH_REQUIRED, 'service requires an authentication token');
  }

  if (candidate.publisherType === 'third-party' && !candidate.thirdPartyMirrorVerified) {
    add('unverified-third-party-mirror-penalty', PENALTIES.UNVERIFIED_THIRD_PARTY_MIRROR, 'publisherType=third-party and not independently verified as a current, authoritative mirror');
  }

  if (candidate.fieldMapPreview && typeof candidate.totalCanonicalFieldCount === 'number') {
    const matchedCount = Object.keys(candidate.fieldMapPreview.fieldMap || {}).filter(k => k !== 'county_fips').length;
    const points = fieldCoverageScore(matchedCount, candidate.totalCanonicalFieldCount);
    if (points > 0) {
      add('field-coverage', points, `${matchedCount}/${candidate.totalCanonicalFieldCount} canonical fields resolved by the field mapper`);
    }
  }

  if (Array.isArray(candidate.sampleRecords) && candidate.sampleRecords.length > 0) {
    if (typeof candidate.sampleNullRatio === 'number' && candidate.sampleNullRatio >= MOSTLY_NULL_THRESHOLD) {
      add('mostly-null-samples-penalty', PENALTIES.MOSTLY_NULL_SAMPLES, `sampleNullRatio=${candidate.sampleNullRatio.toFixed(2)} — most sampled field values were null`);
    } else {
      add('real-sample-records', POSITIVE_FACTORS.REAL_SAMPLE_RECORDS, `${candidate.sampleRecords.length} real, non-empty sample record(s) fetched`);
    }
  }

  const band = classifyScore(score);
  return { rejected: false, rejectReason: null, score, band, breakdown };
}
