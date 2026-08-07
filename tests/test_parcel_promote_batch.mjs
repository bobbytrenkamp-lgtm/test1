/* tests/test_parcel_promote_batch.mjs — unit tests for
   data/parcel_pipeline/promote_batch.mjs's promotion gate. This is the
   single most safety-critical test file in the whole discovery pipeline --
   promote_batch.mjs is the ONE tool allowed to write to
   js/parcel/registry.js, so evaluatePromotion() rejecting exactly the right
   things is what makes that safe to trust with --write.

   Grounded in the same real Durham County NC live-verification data as
   test_parcel_build_batch_drafts.mjs: a real weak-band candidate with 4
   real unresolved requiresReview items is the "should NOT promote" anchor
   case, matching this session's own actual live-dispatch result.

   Run:  node tests/test_parcel_promote_batch.mjs
*/
import {
  evaluatePromotion, mergeCatalogRecordForPromotion, insertRegistryEntry,
} from '../data/parcel_pipeline/promote_batch.mjs';

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

const durhamTarget = { fips: '37063', name: 'Durham County', state: 'NC', status: 'complete', bestCandidateId: 'x' };
const durhamCandidate = {
  candidateId: '37063-arcgis_online-x', fips: '37063', jurisdictionMatch: 'exact',
  rejected: false, rejectReason: null, score: 44, band: 'weak',
  serviceUrl: 'https://services2.arcgis.com/G5vr3CoJh6g2ed8E/arcgis/rest/services/Parcels_new/FeatureServer/1',
  publisherName: 'Durham_GIS', portalUrl: null, geometryType: 'polygon', queryable: true,
  fields: [{ name: 'PIN' }, { name: 'ZONING' }],
  fieldMapPreview: {
    fieldMap: { parcel_id: 'PIN', zoning_code: 'ZONING', county_fips: '__computed__' },
    notProvidedBySource: ['owner_mailing'],
    requiresReview: [
      { canonicalId: 'pin', reason: 'tier1-corpus-collision', candidates: ['REID', 'PIN'] },
      { canonicalId: 'address', reason: 'fuzzy-candidate', candidates: ['LOCATION_ADDR'] },
      { canonicalId: 'owner', reason: 'fuzzy-candidate', candidates: ['PROPERTY_OWNER'] },
      { canonicalId: 'land_value', reason: 'fuzzy-candidate', candidates: ['TOTAL_LAND_VALUE_ASSESSED'] },
    ],
  },
  mappingValidation: { ok: false, missing: [], extra: [], overlap: [], requiredMissing: [] },
};
const durhamCatalogRecord = { fips: '37063', name: 'Durham County, North Carolina', status: 'candidate', notes: '' };

// ── the real Durham NC live-verification result: correctly NEVER promotes ──
{
  const evaluation = evaluatePromotion(durhamTarget, durhamCandidate, {
    registryHasFips: () => false, catalogRecord: durhamCatalogRecord, allowWeak: false,
  });
  ok('real Durham NC candidate (weak band, 4 open requiresReview items) is REJECTED', evaluation.approved === false);
  ok('rejection reason cites the unresolved requiresReview items (checked before the band gate)',
    /unresolved requiresReview/.test(evaluation.reason));
}

// ── each individual gate, isolated ──
function cleanCandidate(overrides = {}) {
  return {
    candidateId: 'x', fips: '99999', jurisdictionMatch: 'exact', rejected: false, rejectReason: null,
    score: 80, band: 'good',
    fieldMapPreview: { fieldMap: { parcel_id: 'PIN', county_fips: '__computed__' }, notProvidedBySource: [], requiresReview: [] },
    mappingValidation: { ok: true, missing: [], extra: [], overlap: [], requiredMissing: [] },
    ...overrides,
  };
}
const cleanTarget = { fips: '99999', name: 'Clean County', status: 'complete', bestCandidateId: 'x' };
const cleanCatalogRecord = { fips: '99999', name: 'Clean County', status: 'candidate', notes: '' };

t('no candidate at all -> rejected',
  evaluatePromotion(cleanTarget, null, {}).approved, false);

t('rejected candidate -> rejected',
  evaluatePromotion(cleanTarget, cleanCandidate({ rejected: true, rejectReason: 'wrong-jurisdiction' }), {}).approved, false);

t('FIPS already in registry.js -> rejected (duplicate guard)',
  evaluatePromotion(cleanTarget, cleanCandidate(), { registryHasFips: () => true, catalogRecord: cleanCatalogRecord }).approved, false);

for (const badMatch of ['partial', 'unknown', 'wrong']) {
  t(`jurisdictionMatch='${badMatch}' -> rejected (never promote on non-exact evidence)`,
    evaluatePromotion(cleanTarget, cleanCandidate({ jurisdictionMatch: badMatch }), { catalogRecord: cleanCatalogRecord }).approved, false);
}

t('any unresolved requiresReview item -> rejected, regardless of score',
  evaluatePromotion(cleanTarget, cleanCandidate({
    fieldMapPreview: { fieldMap: {}, notProvidedBySource: [], requiresReview: [{ canonicalId: 'owner', reason: 'fuzzy-candidate' }] },
  }), { catalogRecord: cleanCatalogRecord }).approved, false);

t('mappingValidation.ok === false -> rejected',
  evaluatePromotion(cleanTarget, cleanCandidate({ mappingValidation: { ok: false, missing: ['owner'], extra: [], overlap: [], requiredMissing: [] } }), { catalogRecord: cleanCatalogRecord }).approved, false);

t('mappingValidation.requiredMissing non-empty -> rejected even if ok is somehow true',
  evaluatePromotion(cleanTarget, cleanCandidate({ mappingValidation: { ok: true, missing: [], extra: [], overlap: [], requiredMissing: ['parcel_id'] } }), { catalogRecord: cleanCatalogRecord }).approved, false);

{
  // Real scenario from batch 2 (Richmond city VA, FIPS 51760): ok=false
  // because requiredMissing is non-empty, but missing/extra/overlap are
  // all empty arrays -- `validation.missing || validation` used to report
  // an uninformative "[]" here instead of the actual, actionable reason,
  // since an empty array is truthy in JS.
  const richmondLikeValidation = { ok: false, missing: [], extra: [], overlap: [], requiredMissing: ['parcel_id'] };
  const evaluation = evaluatePromotion(cleanTarget, cleanCandidate({ mappingValidation: richmondLikeValidation }), { catalogRecord: cleanCatalogRecord });
  ok('ok=false with only requiredMissing set -> rejected', evaluation.approved === false);
  ok('reason names the actual missing required field, not an uninformative "[]"', evaluation.reason.includes('parcel_id'));
  ok('reason does not contain a bare "[]"', !evaluation.reason.includes('[]'));
}

t('weak band without --allow-weak -> rejected',
  evaluatePromotion(cleanTarget, cleanCandidate({ band: 'weak', score: 44 }), { catalogRecord: cleanCatalogRecord }).approved, false);

t('weak band WITH allowWeak:true clears the band gate (but still needs a catalog record)',
  evaluatePromotion(cleanTarget, cleanCandidate({ band: 'weak', score: 44 }), { catalogRecord: cleanCatalogRecord, allowWeak: true }).approved, true);

t('no existing catalog record -> rejected (never invents one)',
  evaluatePromotion(cleanTarget, cleanCandidate(), { catalogRecord: null }).approved, false);

t('catalog record already status=production -> rejected',
  evaluatePromotion(cleanTarget, cleanCandidate(), { catalogRecord: { ...cleanCatalogRecord, status: 'production' } }).approved, false);

// ── the fully-clean, approvable case ──
{
  const evaluation = evaluatePromotion(cleanTarget, cleanCandidate(), { registryHasFips: () => false, catalogRecord: cleanCatalogRecord });
  t('a genuinely clean candidate against an existing candidate-status catalog record IS approved',
    evaluation, { approved: true, reason: null });
}

// ── mergeCatalogRecordForPromotion ──
{
  const existing = {
    fips: '37063', name: 'Durham County, North Carolina', state: 'NC', facility_count: 14, priority_rank: null,
    source_scope: 'county', source_type: null, service_url: null, portal_url: 'https://maps.durhamnc.gov/',
    official_publisher: null, geometry_type: null, query_support: null, record_count: null, available_fields: [],
    geographic_extent: 'county', county_filter_field: null, county_filter_value: null, update_frequency: null,
    licensing_notes: null, confidence_score: null, field_coverage_score: null, status: 'candidate',
    rejection_reason: null, last_verified: '2026-08-05', retry_eligible: true, retry_after_days: 30,
    notes: 'Prior investigation notes.',
  };
  const merged = mergeCatalogRecordForPromotion(existing, durhamTarget, durhamCandidate);
  t('status flips to production', merged.status, 'production');
  t('service_url is taken from the candidate', merged.service_url, durhamCandidate.serviceUrl);
  t('source_type inferred as arcgis_featureserver', merged.source_type, 'arcgis_featureserver');
  t('field_coverage_score is a plain count of mapped fields (matches existing catalog convention), not the 0-100 score',
    merged.field_coverage_score, 2); // parcel_id + zoning_code, county_fips excluded
  t('confidence_score is the discover_batch.mjs score', merged.confidence_score, 44);
  ok('existing prior notes are preserved, not overwritten', merged.notes.includes('Prior investigation notes.'));
  ok('a new promotion note is appended', merged.notes.includes('Promoted via promote_batch.mjs'));
  t('facility_count/priority_rank/name/state preserved from the existing record (never invented)',
    { facility_count: merged.facility_count, priority_rank: merged.priority_rank, name: merged.name, state: merged.state },
    { facility_count: 14, priority_rank: null, name: 'Durham County, North Carolina', state: 'NC' });
  ok('rejection_reason cleared on promotion', merged.rejection_reason === null);
}

// ── insertRegistryEntry ──
{
  const fakeRegistry = `window.PARCEL_REGISTRY = (function () {
  const JURISDICTIONS = {
    '11111': {
      id: 'x',
    },

  };

  function get(fips) {}
})();
`;
  const entryBody = `'22222': {
      id:          'test-id',
    },`;
  const result = insertRegistryEntry(fakeRegistry, entryBody);
  ok('new entry key line is indented 4 spaces, matching real entries', result.includes("\n    '22222': {"));
  ok('existing entry is untouched', result.includes("'11111': {"));
  ok('JURISDICTIONS closing brace is still present exactly once', (result.match(/^ {2}\};\s*$/gm) || []).length === 1);
  ok('new entry appears BEFORE the closing brace, not after', result.indexOf("'22222'") < result.indexOf('  };'));
}
{
  let threw = false;
  try {
    insertRegistryEntry('no closing brace pattern here', "'22222': {},");
  } catch {
    threw = true;
  }
  ok('insertRegistryEntry throws rather than guessing when the closing brace pattern is not found', threw);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
