/* tests/test_parcel_enrichment_discovery.mjs — CAMA join candidate discovery.

   The module under test proposes multi-source joins for production
   jurisdictions, so its failure mode is not a blank panel but a parcel
   confidently showing another property's owner and assessed value. These
   tests concentrate on the guards against that: OBJECTID never being usable
   as a join key, distinct-key match counting, the match-rate threshold, and
   the refusal to propose anything a live sample did not confirm.

   Run:  node tests/test_parcel_enrichment_discovery.mjs
*/
import {
  scoreLayerName, rankJoinCandidates, proposeJoinFields, sampleBaseKeys,
  verifyJoin, evaluateCandidate, toEnrichmentSource,
  MIN_MATCH_RATE, JOIN_FIELD_CANDIDATES,
} from '../data/parcel_pipeline/discovery/enrichment_candidates.mjs';

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

/* Stubs global.fetch with a URL-matching handler. The discovery modules go
   through network.mjs's fetchJson, which reads res.text() and JSON.parses it. */
function stubFetch(handler) {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    const body = handler(String(url), calls.length);
    return {
      status: (body && body.__status) || 200,
      text: async () => typeof body === 'string' ? body : JSON.stringify(body),
    };
  };
  return calls;
}
const esri = (rows) => ({ features: rows.map(attributes => ({ attributes })) });

// ── Name scoring is ordering only ──────────────────────────────────────────
{
  ok('a CAMA-named layer scores above an unrelated one',
    scoreLayerName('Parcel CAMA Public') > scoreLayerName('Streetlights'));
  ok('an assessment-named layer scores', scoreLayerName('Real Estate Assessments') > 0);
  ok('a layer literally called "Parcels" is penalized as the geometry layer we already have',
    scoreLayerName('Parcels') < scoreLayerName('Parcel Assessment Data'));
  t('an empty name scores zero', scoreLayerName(''), 0);
}

// ── Candidate ranking ──────────────────────────────────────────────────────
{
  const svc = {
    layers: [
      { id: 3, name: 'Parcels' },
      { id: 7, name: 'Property Assessment' },
    ],
    tables: [
      { id: 12, name: 'CAMADATA' },
      { id: 13, name: 'Streetlight Inventory' },
    ],
  };
  const ranked = rankJoinCandidates(svc, { excludeLayerId: 3 });

  t('the CAMA table ranks first', ranked[0].name, 'CAMADATA');
  t('it is identified as a table', ranked[0].kind, 'table');
  ok('the jurisdiction\'s own parcel layer is excluded', !ranked.some(c => c.id === 3 && c.kind === 'layer'));
  ok('an unrelated table is dropped', !ranked.some(c => c.name === 'Streetlight Inventory'));
  ok('a plausible sibling layer is still considered', ranked.some(c => c.name === 'Property Assessment'));
}

// ── Join field proposal ────────────────────────────────────────────────────
{
  const fields = [
    { name: 'OBJECTID' }, { name: 'GPIN' }, { name: 'OWNER_CUR' }, { name: 'TOTVAL' },
  ];
  const proposed = proposeJoinFields(fields, 'GPIN');
  t('the identically-named key on both sides ranks first', proposed[0], 'GPIN');

  // The single most important guard in this file. OBJECTID is an ArcGIS row
  // number; joining on it matches two unrelated tables with total confidence.
  ok('OBJECTID is never proposed as a join field', !proposed.includes('OBJECTID'));
  ok('FID is never proposed', !proposeJoinFields([{ name: 'FID' }], null).includes('FID'));
  ok('OID is never proposed', !proposeJoinFields([{ name: 'OID' }], null).includes('OID'));

  ok('a content column is not proposed as a key', !proposed.includes('OWNER_CUR'));
  t('a table with no identifier-like column proposes nothing',
    proposeJoinFields([{ name: 'NOTES' }, { name: 'COLOR' }], null), []);
  ok('a known identifier name is proposed even with no base hint',
    proposeJoinFields([{ name: 'APN' }], null).includes('APN'));
  ok('every documented candidate name is recognized',
    JOIN_FIELD_CANDIDATES.every(c => proposeJoinFields([{ name: c.toUpperCase() }], null).length === 1));
}

// ── Sampling real keys from the parcel layer ───────────────────────────────
{
  stubFetch(() => esri([{ PA_MCPI: '111-22-3333' }, { PA_MCPI: '444-55-6666' }, { PA_MCPI: null }, { PA_MCPI: '   ' }]));
  const s = await sampleBaseKeys('https://gis.example.gov/x/MapServer/3', 'PA_MCPI', {}, 25);

  t('sampling succeeds', s.ok, true);
  t('null and whitespace keys are discarded', s.keys, ['111-22-3333', '444-55-6666']);
}
{
  stubFetch(() => ({ error: { message: 'Invalid field: NOPE' } }));
  const s = await sampleBaseKeys('https://gis.example.gov/x/MapServer/3', 'NOPE', {});
  t('an ArcGIS error while sampling is a failure, not an empty sample', s.ok, false);
  ok('the reason is preserved', s.why.includes('Invalid field'));
}
{
  stubFetch(() => esri([]));
  const s = await sampleBaseKeys('https://gis.example.gov/x/MapServer/3', 'PA_MCPI', {});
  t('a layer returning no keys is not a usable sample', s.ok, false);
}

// ── Join verification ──────────────────────────────────────────────────────
{
  // Exact match on every sampled key.
  const keys = ['A1', 'A2', 'A3', 'A4'];
  stubFetch(() => esri(keys.map(GPIN => ({ GPIN }))));
  const v = await verifyJoin('https://gis.example.gov/x/MapServer/12', 'GPIN', keys, {});

  t('a total match verifies', v.verified, true);
  t('the match rate is 1', v.best.matchRate, 1);
  t('the winning variant is the exact one', v.best.variant, 'exact');
}

{
  // The formatting-mismatch case: parcel layer stores punctuation, CAMA does
  // not. Must verify AND record that stripNonAlnum is required.
  const keys = ['0123-45-6789', '0999-88-7777'];
  stubFetch((url) => {
    const decoded = decodeURIComponent(url);
    if (decoded.includes("'0123456789'")) return esri([{ PIN: '0123456789' }, { PIN: '0999887777' }]);
    return esri([]);   // the exact-form query finds nothing
  });
  const v = await verifyJoin('https://gis.example.gov/x/MapServer/12', 'PIN', keys, {});

  t('a punctuation mismatch still verifies via the stripped variant', v.verified, true);
  t('and the required normalization is recorded for the config',
    v.best.normalize, { stripNonAlnum: true });
}

{
  // Below-threshold: must be reported with its rate, not promoted.
  const keys = ['B1', 'B2', 'B3', 'B4', 'B5'];
  stubFetch(() => esri([{ GPIN: 'B1' }, { GPIN: 'B2' }]));   // 2 of 5 = 40%
  const v = await verifyJoin('https://gis.example.gov/x/MapServer/12', 'GPIN', keys, {});

  t('a partial match does not verify', v.verified, false);
  t('the measured rate is still reported', v.best.matchRate, 0.4);
  ok(`0.4 is genuinely below the documented threshold of ${MIN_MATCH_RATE}`, 0.4 < MIN_MATCH_RATE);
}

{
  // Distinct-key counting. A CAMA table with 3 rows for 1 parcel must not
  // report a 300% match rate.
  const keys = ['C1', 'C2'];
  stubFetch(() => esri([
    { GPIN: 'C1' }, { GPIN: 'C1' }, { GPIN: 'C1' },   // three buildings on one parcel
  ]));
  const v = await verifyJoin('https://gis.example.gov/x/MapServer/12', 'GPIN', keys, {});

  t('duplicate rows count once, so the rate cannot exceed 1', v.best.matchRate, 0.5);
  t('and the match count is by distinct key', v.best.matched, 1);
}

{
  // An ArcGIS error on one variant must not abort verification.
  const keys = ['D1'];
  let n = 0;
  stubFetch(() => {
    n++;
    if (n === 1) return { error: { message: 'Invalid field type for comparison' } };
    return esri([{ PIN: 'D1' }]);
  });
  const v = await verifyJoin('https://gis.example.gov/x/MapServer/12', 'PIN', keys, {});
  t('a failing variant is recorded but does not stop the others', v.verified, true);
  ok('the failed attempt is retained as evidence', v.attempts.some(a => !a.ok));
}

// ── Full candidate evaluation ──────────────────────────────────────────────
const fakeMapFields = (sourceNames, canonical) => {
  const fieldMap = {};
  if (sourceNames.includes('OWNER_CUR') && canonical.includes('owner')) fieldMap.owner = 'OWNER_CUR';
  if (sourceNames.includes('TOTVAL') && canonical.includes('assessed_value')) fieldMap.assessed_value = 'TOTVAL';
  if (sourceNames.includes('GPIN') && canonical.includes('pin')) fieldMap.pin = 'GPIN';
  return { fieldMap, needsReview: [] };
};

{
  stubFetch((url) => {
    if (url.includes('f=json') && !url.includes('/query')) {
      return { name: 'CAMADATA', fields: [{ name: 'GPIN', type: 'esriFieldTypeString' }, { name: 'OWNER_CUR' }, { name: 'TOTVAL' }] };
    }
    return esri([{ GPIN: 'E1' }, { GPIN: 'E2' }]);
  });

  const result = await evaluateCandidate(
    { kind: 'table', id: 12, name: 'CAMADATA' },
    {
      candidateUrl: 'https://gis.example.gov/x/MapServer/12',
      baseJoinSourceField: 'GPIN',
      sampleKeys: ['E1', 'E2'],
      missingCanonicalFields: ['owner', 'assessed_value', 'pin'],
      mapFieldsFn: fakeMapFields,
      synonyms: {},
    },
    {},
  );

  t('a good candidate is verified', result.status, 'verified');
  t('the verified join column is recorded', result.joinField, 'GPIN');
  t('the measured match rate travels with the result', result.matchRate, 1);
  t('missing canonical fields are mapped', result.fieldMap.owner, 'OWNER_CUR');

  // The join column is machinery, not content.
  ok('the join column is not also proposed as a canonical value',
    !Object.values(result.fieldMap).includes('GPIN'));
}

{
  // Verified join, but the table has nothing the base entry is missing.
  stubFetch((url) => {
    if (!url.includes('/query')) return { name: 'X', fields: [{ name: 'GPIN' }] };
    return esri([{ GPIN: 'F1' }]);
  });
  const result = await evaluateCandidate(
    { kind: 'table', id: 12, name: 'X' },
    {
      candidateUrl: 'https://gis.example.gov/x/MapServer/12',
      baseJoinSourceField: 'GPIN', sampleKeys: ['F1'],
      missingCanonicalFields: ['owner'], mapFieldsFn: fakeMapFields, synonyms: {},
    }, {},
  );
  t('a join with nothing to contribute is distinguished from a useful one',
    result.status, 'verified-but-empty');
}

{
  // Unverifiable join must NOT be proposed, however good the name looked.
  stubFetch((url) => {
    if (!url.includes('/query')) return { name: 'CAMADATA', fields: [{ name: 'PIN' }, { name: 'OWNER_CUR' }] };
    return esri([]);
  });
  const result = await evaluateCandidate(
    { kind: 'table', id: 12, name: 'CAMADATA' },
    {
      candidateUrl: 'https://gis.example.gov/x/MapServer/12',
      baseJoinSourceField: 'GPIN', sampleKeys: ['G1', 'G2', 'G3'],
      missingCanonicalFields: ['owner'], mapFieldsFn: fakeMapFields, synonyms: {},
    }, {},
  );
  t('a promising name with no verified join is rejected', result.status, 'join-unverified');
  ok('no fieldMap is proposed for it', result.fieldMap === undefined);
  ok('the reason quantifies the failure', /match rate|no join column/.test(result.why));
}

{
  stubFetch(() => ({ __status: 404, error: { message: 'not found' } }));
  const result = await evaluateCandidate(
    { kind: 'table', id: 99, name: 'Gone' },
    {
      candidateUrl: 'https://gis.example.gov/x/MapServer/99',
      baseJoinSourceField: 'GPIN', sampleKeys: ['H1'],
      missingCanonicalFields: ['owner'], mapFieldsFn: fakeMapFields, synonyms: {},
    }, {},
  );
  t('an unreachable candidate is reported, not thrown', result.status, 'unreachable');
}

{
  stubFetch((url) => {
    if (!url.includes('/query')) return { name: 'Notes', fields: [{ name: 'COMMENT' }, { name: 'COLOR' }] };
    return esri([]);
  });
  const result = await evaluateCandidate(
    { kind: 'table', id: 15, name: 'Notes' },
    {
      candidateUrl: 'https://gis.example.gov/x/MapServer/15',
      baseJoinSourceField: 'GPIN', sampleKeys: ['I1'],
      missingCanonicalFields: ['owner'], mapFieldsFn: fakeMapFields, synonyms: {},
    }, {},
  );
  t('a table with no identifier column is rejected before any probing',
    result.status, 'no-join-field');
}

// ── Draft config emission ──────────────────────────────────────────────────
{
  const src = toEnrichmentSource(
    {
      url: 'https://gis.example.gov/x/MapServer/12',
      name: 'CAMADATA',
      joinField: 'GPIN',
      joinNormalize: { stripNonAlnum: true },
      fieldMap: { owner: 'OWNER_CUR' },
    },
    { jurisdictionId: 'va-loudoun-county', baseField: 'parcel_id' },
  );

  t('the emitted source uses the arcgis-table executor', src.type, 'arcgis-table');
  // A joined value is never direct-official: it reached the parcel through a
  // key match this system performed, and a bad key produces confident errors.
  t('confidence is official-joined, never direct-official', src.confidence, 'official-joined');
  t('the verified normalization is carried into the config',
    src.joinNormalize, { stripNonAlnum: true });
  t('the id is derived from the jurisdiction', src.id, 'va-loudoun-county-cama');

  const plain = toEnrichmentSource(
    { url: 'u', joinField: 'PIN', joinNormalize: {}, fieldMap: { owner: 'O' } },
    { jurisdictionId: 'x' },
  );
  t('no normalization is emitted when none was needed', plain.joinNormalize, undefined);
  t('baseField defaults to parcel_id', plain.baseField, 'parcel_id');
}

// ── Orchestrator: gap selection and service-root derivation ───────────────
{
  const { serviceRootOf, missingFieldsFor, rankGapJurisdictions, investigate, renderMarkdown } =
    await import('../data/parcel_pipeline/discover_enrichment.mjs');

  t('a MapServer layer url yields its service root',
    serviceRootOf('https://x.gov/rest/services/A/MapServer/3'),
    { root: 'https://x.gov/rest/services/A/MapServer', layerId: '3' });
  t('a FeatureServer layer url works too',
    serviceRootOf('https://x.gov/rest/services/A/FeatureServer/0').layerId, '0');
  t('a bare service root parses with no layer id',
    serviceRootOf('https://x.gov/rest/services/A/MapServer').layerId, null);
  t('a non-ArcGIS url is rejected rather than mangled',
    serviceRootOf('https://x.gov/geojson/parcels.json').root, null);

  t('fields the entry already provides are not chased',
    missingFieldsFor({ fieldMap: { owner: 'O', assessed_value: 'V' } }).includes('owner'), false);
  ok('fields the entry lacks are chased',
    missingFieldsFor({ fieldMap: { parcel_id: 'P' } }).includes('assessed_value'));

  const fakeRegistry = {
    all: () => [
      { fips: '11111', id: 'a', name: 'A', fieldMap: { parcel_id: 'P' } },
      { fips: '22222', id: 'b', name: 'B', fieldMap: { parcel_id: 'P' } },
      { fips: '33333', id: 'c', name: 'C', fieldMap: Object.fromEntries(
        ['owner','zoning_code','land_use_code','land_use_desc','building_count','year_built',
         'gross_floor_area','assessed_value','land_value','improvement_value','tax_year',
         'last_sale_date','last_sale_price','deed_book','deed_page'].map(f => [f, 'X'])) },
    ],
  };
  const ranked = rankGapJurisdictions(fakeRegistry, { '22222': 40, '11111': 2 });
  t('the county with more data centers is investigated first', ranked[0].fips, '22222');
  ok('a jurisdiction already carrying every target field is not investigated',
    !ranked.some(j => j.fips === '33333'));

  // A non-ArcGIS entry must be reported, not attempted.
  const geo = await investigate({ fips: '44444', id: 'd', name: 'D', connector: 'geojson', fieldMap: { parcel_id: 'P' } }, {}, {});
  t('a non-ArcGIS jurisdiction is skipped with a reason', geo.status, 'unsupported-connector');

  // A computed parcel_id exists only in the browser -- nothing to join FROM.
  const computed = await investigate(
    { fips: '55555', id: 'e', name: 'E', connector: 'arcgis', fieldMap: { parcel_id: '__computed__' } }, {}, {});
  t('a computed parcel_id cannot anchor a join', computed.status, 'no-base-join-field');

  // A dead service is reported, not thrown -- one bad server must not lose a batch.
  stubFetch(() => ({ __status: 500 }));
  const dead = await investigate(
    { fips: '66666', id: 'f', name: 'F', connector: 'arcgis',
      serviceUrl: 'https://dead.example.gov/rest/services/X/MapServer/3', fieldMap: { parcel_id: 'PIN' } }, {}, {});
  t('an unreachable service is reported rather than thrown', dead.status, 'service-unreachable');

  const md = renderMarkdown([
    { fips: '11111', name: 'A', status: 'proposed', candidates: [
      { status: 'verified', name: 'CAMA', joinField: 'PIN', matchRate: 1, sampled: 25, fieldMap: { owner: 'O' } }] },
    { fips: '22222', name: 'B', status: 'candidates-unverified', why: 'best 40%' },
  ], { runId: 'test' });

  ok('the report states the match threshold rather than just a verdict', md.includes('threshold'));
  ok('the report shows the measured match rate', md.includes('100% of 25'));
  ok('unverified candidates are shown with their reason, not omitted', md.includes('best 40%'));
  ok('the report says nothing is applied automatically', md.includes('Nothing here is applied automatically'));
  ok('the report tells the reviewer to spot-check against the county lookup',
    md.includes('public property lookup'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
