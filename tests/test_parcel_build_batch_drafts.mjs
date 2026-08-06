/* tests/test_parcel_build_batch_drafts.mjs — unit tests for
   data/parcel_pipeline/build_batch_drafts.mjs's pure helper functions:
   buildCatalogRecordFromCandidate (candidate -> generate_entry.mjs-shaped
   catalog record) and evaluateTargetForDraft (the draft-eligibility gate,
   deliberately much looser than promote_batch.mjs's promotion gate -- a
   draft is just a starting point for human review, not a promotion
   decision).

   Fixtures are grounded in this session's own real live-verification run
   (Durham County NC, FIPS 37063, discover_batch.mjs --fips 37063,29510
   dispatched against real ArcGIS endpoints on GitHub Actions): a real
   ArcGIS FeatureServer, real field names (PIN, ZONING, Shape__Area, ...),
   a real score of 44 (band: weak) with 4 real requiresReview items.

   Run:  node tests/test_parcel_build_batch_drafts.mjs
*/
import {
  buildCatalogRecordFromCandidate, evaluateTargetForDraft,
} from '../data/parcel_pipeline/build_batch_drafts.mjs';

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

// Real target + candidate shape from the Durham County NC live-verification
// run (score/band/requiresReview count match exactly what that real run
// produced; field values are representative of the real response, not
// invented from nothing).
const durhamTarget = {
  fips: '37063', name: 'Durham County', state: 'NC', status: 'complete',
  bestCandidateId: '37063-arcgis_online-services2-arcgis-com-...-parcels-new-featureserver-1',
  bestScore: 44, bestBand: 'weak',
};
const durhamCandidate = {
  candidateId: '37063-arcgis_online-services2-arcgis-com-...-parcels-new-featureserver-1',
  source: 'arcgis_online', fips: '37063', jurisdictionName: 'Durham County', state: 'NC',
  serviceUrl: 'https://services2.arcgis.com/G5vr3CoJh6g2ed8E/arcgis/rest/services/Parcels_new/FeatureServer/1',
  portalUrl: null, publisherType: 'unknown', publisherName: 'Durham_GIS',
  jurisdictionMatch: 'exact', geometryType: 'polygon', queryable: true, isTileOnly: false, requiresAuth: false,
  fields: [{ name: 'PIN' }, { name: 'ZONING' }, { name: 'Shape__Area' }],
  sampleRecords: [{ PIN: '0822537634' }], sampleNullRatio: 0.1,
  staticDownloadOnly: false, ingested: false,
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
  rejected: false, rejectReason: null, score: 44, band: 'weak',
};

// ── buildCatalogRecordFromCandidate ──
{
  const rec = buildCatalogRecordFromCandidate(durhamTarget, durhamCandidate);
  t('fips carried through', rec.fips, '37063');
  t('name carried through from target', rec.name, 'Durham County');
  t('state carried through from target', rec.state, 'NC');
  t('service_url carried through from candidate', rec.service_url, durhamCandidate.serviceUrl);
  t('source_type inferred as arcgis_featureserver for a real FeatureServer URL', rec.source_type, 'arcgis_featureserver');
  t('official_publisher pulled from candidate.publisherName', rec.official_publisher, 'Durham_GIS');
  t('status is always candidate (draft generation never promotes)', rec.status, 'candidate');
  t('no shared-service filter field/value when this is not a shared_services match', rec.county_filter_field, null);
}

{
  // A shared_services-sourced candidate carries filterField/filterValue --
  // confirm those flow through into county_filter_field/value.
  const sharedCandidate = {
    ...durhamCandidate,
    source: 'shared_services',
    serviceUrl: 'https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0',
    sharedServiceMatch: { filterField: 'COUNTY', filterValue: 'ESSEX' },
  };
  const rec = buildCatalogRecordFromCandidate({ ...durhamTarget, fips: '34013', name: 'Essex County', state: 'NJ' }, sharedCandidate);
  t('shared_services filterField flows into county_filter_field', rec.county_filter_field, 'COUNTY');
  t('shared_services filterValue flows into county_filter_value', rec.county_filter_value, 'ESSEX');
}

{
  // A non-ArcGIS-shaped serviceUrl (e.g. null, from a bare dcat/ckan/socrata
  // portal link with no queryable service) must not be mislabeled arcgis_featureserver.
  const noServiceUrlCandidate = { ...durhamCandidate, serviceUrl: null, source: 'socrata' };
  const rec = buildCatalogRecordFromCandidate(durhamTarget, noServiceUrlCandidate);
  t('source_type falls back to the raw source when there is no ArcGIS-shaped serviceUrl', rec.source_type, 'socrata');
}

// ── evaluateTargetForDraft ──
{
  const evaluation = evaluateTargetForDraft(durhamTarget, durhamCandidate, 'marginal');
  ok('a weak-band real candidate is NOT eligible at the default min-band (marginal)', evaluation.eligible === false);
  ok('the rejection reason mentions the band', /band 'weak'/.test(evaluation.reason));
}
{
  const evaluation = evaluateTargetForDraft(durhamTarget, durhamCandidate, 'weak');
  ok('the same weak-band candidate IS eligible when --min-band weak is explicitly requested', evaluation.eligible === true);
}
{
  const skippedTarget = { fips: '11111', name: 'Already Done', status: 'skipped-already-covered' };
  const evaluation = evaluateTargetForDraft(skippedTarget, null, 'marginal');
  ok('a skipped-already-covered target is never eligible', evaluation.eligible === false);
  ok('the reason explains why (already covered)', /already covered/.test(evaluation.reason));
}
{
  const noCandidateTarget = { fips: '22222', name: 'Nothing Found', status: 'partial' };
  const evaluation = evaluateTargetForDraft(noCandidateTarget, null, 'marginal');
  ok('a target with no best candidate is never eligible', evaluation.eligible === false);
}
{
  const rejectedCandidate = { ...durhamCandidate, rejected: true, rejectReason: 'wrong-jurisdiction', band: null, score: null };
  const evaluation = evaluateTargetForDraft(durhamTarget, rejectedCandidate, 'weak');
  ok('a rejected best candidate is never eligible, even at --min-band weak', evaluation.eligible === false);
  ok('the rejection reason is surfaced', /wrong-jurisdiction/.test(evaluation.reason));
}
{
  const strongCandidate = { ...durhamCandidate, band: 'strong', score: 90 };
  const evaluation = evaluateTargetForDraft(durhamTarget, strongCandidate, 'marginal');
  ok('a strong-band candidate is eligible at the default min-band', evaluation.eligible === true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
