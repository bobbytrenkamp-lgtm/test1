/* tests/test_parcel_mapping_confidence.mjs — unit tests for
   data/parcel_pipeline/discovery/mapping_confidence.mjs's non-invasive
   confidence-tagging wrapper around field_mapper.mjs's mapFields().

   Runs mapFields() itself (unmodified, real function) against real
   ground-truth source field lists reconstructed from the corpus, so this
   both tests tagMappingConfidence() and re-confirms zero changes leaked
   into field_mapper.mjs's own behavior.

   Run:  node tests/test_parcel_mapping_confidence.mjs
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mapFields } from '../data/parcel_pipeline/field_mapper.mjs';
import { CONFIDENCE, tagMappingConfidence, sampleValueIsPlausible } from '../data/parcel_pipeline/discovery/mapping_confidence.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const synonymsDoc = JSON.parse(readFileSync(join(ROOT, 'data', 'parcel_field_synonyms.json'), 'utf8'));
const synonyms = synonymsDoc.synonyms || synonymsDoc;

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

const canonicalFieldIds = Object.keys(synonyms).concat(['county_fips']);

// ── Hudson County NJ real-world case: PAMS_PIN is a verified tier-1 exact-alias for parcel_id ──
{
  const sourceFields = ['PAMS_PIN', 'GIS_PIN', 'OWNER_NAME', 'PROP_LOC', 'NET_VALUE'];
  const mapped = mapFields(sourceFields, canonicalFieldIds, synonyms);
  ok('sanity: mapFields resolved parcel_id from PAMS_PIN', mapped.fieldMap.parcel_id === 'PAMS_PIN');

  const tags = tagMappingConfidence(mapped, { synonyms });
  const parcelIdTag = tags.find(tg => tg.canonicalId === 'parcel_id');
  t('Hudson County NJ: PAMS_PIN resolves as exact-alias (real tier-1 synonym)',
    parcelIdTag?.confidence, CONFIDENCE.EXACT_ALIAS);
  t('Hudson County NJ: exact-alias tag carries the correct sourceField', parcelIdTag?.sourceField, 'PAMS_PIN');
}

// ── every requiresReview entry from mapFields() passes through verbatim, never upgraded ──
{
  // A deliberately ambiguous/colliding source field list: two independently
  // tier-1-verified parcel_id synonyms present together forces a
  // tier1-corpus-collision into requiresReview.
  const sourceFields = ['APN', 'PARCELID', 'Shape_Area', 'ADDR_LINE1', 'ADDR_LINE2', 'ADDR_CITY'];
  const mapped = mapFields(sourceFields, canonicalFieldIds, synonyms);
  ok('sanity: mapFields produced at least one requiresReview entry', mapped.requiresReview.length > 0);

  const tags = tagMappingConfidence(mapped, { synonyms });
  const reviewTags = tags.filter(tg => tg.confidence === CONFIDENCE.MANUAL_REVIEW_REQUIRED);
  t('every mapFields requiresReview entry appears as manual-review-required',
    reviewTags.length, mapped.requiresReview.length);

  for (const original of mapped.requiresReview) {
    const tag = reviewTags.find(tg => tg.reason === original.reason
      && tg.canonicalId === (original.canonicalId || null)
      && tg.sourceField === (original.sourceField || null));
    ok(`requiresReview entry (reason=${original.reason}) passed through with reason preserved exactly`, !!tag);
  }
  ok('no requiresReview-originated canonicalId was ALSO separately tagged as a resolved confidence',
    mapped.requiresReview.every(r => !r.canonicalId
      || !tags.some(tg => tg.canonicalId === r.canonicalId && tg.confidence !== CONFIDENCE.MANUAL_REVIEW_REQUIRED)));
}

// ── shared-service canonical ids get the highest confidence tier ──
{
  const sourceFields = ['SOME_UNRECOGNIZED_FIELD', 'PAMS_PIN'];
  const mapped = mapFields(sourceFields, canonicalFieldIds, synonyms);
  const sharedServiceCanonicalIds = new Set(['parcel_id']);
  const tags = tagMappingConfidence(mapped, { synonyms, sharedServiceCanonicalIds });
  const parcelIdTag = tags.find(tg => tg.canonicalId === 'parcel_id');
  t('a canonical id present in sharedServiceCanonicalIds is tagged verified-precedent (overrides exact-alias)',
    parcelIdTag?.confidence, CONFIDENCE.VERIFIED_PRECEDENT);
}

// ── tier-2 (normalized-name) resolved fields tag as normalized-match, not exact-alias ──
// BLDG_COUNT is deliberately NOT in the synonym corpus for building_count
// (confirmed: only BUILDING_COUNT, HOUSE_CNT, IMP_COUNT, NBBLDGS, NOCARDS,
// NUMBLDGS, PPDWELLCOUNT, TBLDGS, TOTSTRUCTS are) -- it only resolves via
// tier 2's normalization (BLDG->BUILDING expansion), a clean tier-2-only
// case, unlike BUILDING_COUNT itself which is already a tier-1 synonym.
{
  const sourceFields = ['BLDG_COUNT'];
  const canonicalIds = ['building_count', 'county_fips'];
  const mapped = mapFields(sourceFields, canonicalIds, synonyms);
  ok('sanity: mapFields resolved building_count via tier 2 (normalized match)', mapped.fieldMap.building_count === 'BLDG_COUNT');
  const tags = tagMappingConfidence(mapped, { synonyms });
  const tag = tags.find(tg => tg.canonicalId === 'building_count');
  t('tier-2 resolved field tags as normalized-match (not exact-alias)', tag?.confidence, CONFIDENCE.NORMALIZED_MATCH);
}

// ── sample-value-supported upgrade: a normalized-match field with a plausible sample value ──
{
  const sourceFields = ['BLDG_COUNT'];
  const canonicalIds = ['building_count', 'county_fips'];
  const mapped = mapFields(sourceFields, canonicalIds, synonyms);
  const tags = tagMappingConfidence(mapped, { synonyms, sampleRecord: { BLDG_COUNT: 3 } });
  const tag = tags.find(tg => tg.canonicalId === 'building_count');
  t('normalized-match field with a plausible sample value upgrades to sample-value-supported',
    tag?.confidence, CONFIDENCE.SAMPLE_VALUE_SUPPORTED);
}
{
  const sourceFields = ['BLDG_COUNT'];
  const canonicalIds = ['building_count', 'county_fips'];
  const mapped = mapFields(sourceFields, canonicalIds, synonyms);
  const tags = tagMappingConfidence(mapped, { synonyms, sampleRecord: { BLDG_COUNT: -5 } });
  const tag = tags.find(tg => tg.canonicalId === 'building_count');
  t('normalized-match field with an implausible sample value stays normalized-match (not upgraded)',
    tag?.confidence, CONFIDENCE.NORMALIZED_MATCH);
}

// ── without a synonyms option, everything resolved conservatively tags normalized-match ──
{
  const sourceFields = ['PAMS_PIN'];
  const canonicalIds = ['parcel_id', 'county_fips'];
  const mapped = mapFields(sourceFields, canonicalIds, synonyms);
  const tags = tagMappingConfidence(mapped, {}); // no synonyms passed
  const tag = tags.find(tg => tg.canonicalId === 'parcel_id');
  t('omitting synonyms tags every resolved field conservatively as normalized-match (never assumes tier-1)',
    tag?.confidence, CONFIDENCE.NORMALIZED_MATCH);
}

// ── county_fips is always excluded (never meaningfully "confident" one way or another) ──
{
  const sourceFields = ['PAMS_PIN'];
  const canonicalIds = ['parcel_id', 'county_fips'];
  const mapped = mapFields(sourceFields, canonicalIds, synonyms);
  const tags = tagMappingConfidence(mapped, { synonyms });
  ok('county_fips never appears in the confidence tag list', !tags.some(tg => tg.canonicalId === 'county_fips'));
}

// ── sampleValueIsPlausible: pure function edge cases ──
t('sampleValueIsPlausible: no plausibility check exists for an unlisted canonical id -> false',
  sampleValueIsPlausible('parcel_id', 'PAMS-001'), false);
t('sampleValueIsPlausible: null value -> false', sampleValueIsPlausible('assessed_value', null), false);
t('sampleValueIsPlausible: empty string value -> false', sampleValueIsPlausible('assessed_value', ''), false);
t('sampleValueIsPlausible: negative assessed_value -> false', sampleValueIsPlausible('assessed_value', -100), false);
t('sampleValueIsPlausible: plausible assessed_value -> true', sampleValueIsPlausible('assessed_value', 250000), true);
t('sampleValueIsPlausible: year_built before 1600 -> false', sampleValueIsPlausible('year_built', 1500), false);
t('sampleValueIsPlausible: year_built far in the future -> false', sampleValueIsPlausible('year_built', 3000), false);
t('sampleValueIsPlausible: plausible year_built -> true', sampleValueIsPlausible('year_built', 1998), true);
t('sampleValueIsPlausible: non-numeric string for a numeric field -> false', sampleValueIsPlausible('assessed_value', 'not-a-number'), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
