/* tests/test_parcel_enrichment.mjs — the multi-source enrichment foundation.

   Covers js/parcel/provenance.js and js/parcel/enrichment.js: exact-join
   validation, the refusal to join on owner/address, deterministic conflict
   resolution, per-source health isolation, caching, cancellation, and the
   missing-vs-zero distinction.

   Every executor here is a fake. That is the point of the design: the engine
   itself performs no network I/O, so the entire join/conflict/provenance
   path — including failure modes a live service would only produce
   intermittently — is exercised deterministically and offline.

   Run:  node tests/test_parcel_enrichment.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };
global.CustomEvent = class CustomEvent { constructor(type, opts) { this.type = type; this.detail = (opts || {}).detail; } };

require('../js/parcel/schema.js');
require('../js/parcel/provenance.js');
require('../js/parcel/enrichment.js');

const PROV = global.PARCEL_PROVENANCE;
const ENR  = global.PARCEL_ENRICHMENT;

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

/* A parcel as the ArcGIS connector's _normalize() would hand it over:
   geometry plus the handful of fields the boundary layer actually publishes,
   modeled on the real Loudoun County VA shape (plat metadata only). */
function baseFeature(parcelId, extra = {}) {
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    properties: { parcel_id: parcelId, area_acres: 10, county_fips: '51107', _source: 'arcgis', ...extra },
  };
}
function fc(...features) { return { type: 'FeatureCollection', features }; }

const camaSource = {
  id: 'test-cama',
  label: 'Test County CAMA',
  type: 'fake-table',
  baseField: 'parcel_id',
  joinField: 'PARCELID',
  confidence: 'official-joined',
  fieldMap: { owner: 'OWNER_NAME', assessed_value: 'TOTVAL', year_built: 'YRBLT' },
};

function fakeExecutor(recordsByKey, opts = {}) {
  return async (source, keys) => {
    if (opts.throws) throw new Error(opts.throws);
    const records = {};
    for (const k of keys) if (recordsByKey[k]) records[k] = recordsByKey[k];
    if (opts.onCall) opts.onCall(keys);
    return { records, sourceUpdatedAt: opts.sourceUpdatedAt || null };
  };
}

// ── PARCEL_PROVENANCE ──────────────────────────────────────────────────────
{
  ok('every confidence tier has a unique rank',
    new Set(Object.values(PROV.CONFIDENCE).map(c => c.rank)).size === Object.keys(PROV.CONFIDENCE).length);
  ok('direct-official outranks official-joined',
    PROV.rankOf('direct-official') > PROV.rankOf('official-joined'));
  ok('official-joined outranks inferred',
    PROV.rankOf('official-joined') > PROV.rankOf('inferred'));
  t('an unrecognized confidence id degrades to unknown rather than throwing',
    PROV.tier('offical-joined').id, 'unknown');
  t('isKnownConfidence rejects a typo', PROV.isKnownConfidence('offical-joined'), false);

  const props = {};
  PROV.attach(props, 'assessed_value', PROV.record({
    sourceId: 'x-cama', sourceLabel: 'X CAMA', confidence: 'official-joined', sourceField: 'TOTVAL',
  }));
  t('describe() names tier, source, and source column',
    PROV.describe(props, 'assessed_value'), 'Official (joined) — X CAMA (TOTVAL)');
  t('describe() returns null for a field with no record', PROV.describe(props, 'owner'), null);
  ok('isAtLeast is true at the recorded tier', PROV.isAtLeast(props, 'assessed_value', 'official-joined'));
  ok('isAtLeast is false above the recorded tier', !PROV.isAtLeast(props, 'assessed_value', 'direct-official'));

  // A derived value with no stated inputs must not masquerade as
  // "calculated from official values" — that is the unexplained-number
  // failure mode the module exists to prevent.
  t('derived() with inputs is official-derived',
    PROV.derived({ derivedFrom: ['sale_price', 'area_acres'] }).confidence, 'official-derived');
  t('derived() with NO inputs downgrades to inferred',
    PROV.derived({ derivedFrom: [] }).confidence, 'inferred');
  t('derived() keeps its input list',
    PROV.derived({ derivedFrom: ['sale_price', 'area_acres'] }).derivedFrom, ['sale_price', 'area_acres']);

  // weakestOf: a section is only as good as its shakiest populated field.
  const mixed = { a: 1, b: 2, c: 3 };
  PROV.attach(mixed, 'a', PROV.record({ confidence: 'direct-official' }));
  PROV.attach(mixed, 'b', PROV.record({ confidence: 'inferred' }));
  t('weakestOf returns the least direct tier among populated fields',
    PROV.weakestOf(mixed, ['a', 'b']), 'inferred');
  t('weakestOf counts a populated field with no record as unknown',
    PROV.weakestOf(mixed, ['a', 'c']), 'unknown');
  t('weakestOf skips fields that are absent entirely (missing is not low-confidence)',
    PROV.weakestOf(mixed, ['a', 'nonexistent']), 'direct-official');
}

// ── Join-key normalization ─────────────────────────────────────────────────
{
  t('trims by default', ENR.normalizeKey('  123  ', {}), '123');
  t('upper is opt-in', ENR.normalizeKey('a1', { upper: true }), 'A1');
  t('case is preserved when upper is not requested', ENR.normalizeKey('a1', {}), 'a1');
  t('stripNonAlnum makes a hyphenated id match its bare form',
    ENR.normalizeKey('0123-45-6789', { stripNonAlnum: true }), '0123456789');
  t('padStart restores leading zeros a spreadsheet export dropped',
    ENR.normalizeKey('12345', { padStart: 10 }), '0000012345');
  t('padding runs AFTER stripping so punctuated and bare ids pad alike',
    ENR.normalizeKey('123-45', { stripNonAlnum: true, padStart: 10 }),
    ENR.normalizeKey('12345', { stripNonAlnum: true, padStart: 10 }));

  // Every "empty" variant must become null, not '', or they would all
  // collide into one bucket and cross-join every keyless parcel.
  t('null key stays null', ENR.normalizeKey(null, {}), null);
  t('undefined key becomes null', ENR.normalizeKey(undefined, {}), null);
  t('whitespace-only key becomes null', ENR.normalizeKey('   ', {}), null);
  t('punctuation-only key becomes null once stripped',
    ENR.normalizeKey('---', { stripNonAlnum: true }), null);
  t('numeric zero is a real key, not an empty one', ENR.normalizeKey(0, {}), '0');
}

// ── Config validation ──────────────────────────────────────────────────────
{
  t('absent enrichment is valid', ENR.validateConfig(null).valid, true);
  t('a well-formed source validates', ENR.validateConfig({ sources: [camaSource] }).valid, true);

  const noBase = ENR.validateConfig({ sources: [{ ...camaSource, baseField: undefined }] });
  ok('a source with no baseField is rejected', !noBase.valid);
  ok('the error names baseField', noBase.errors.some(e => e.includes('baseField')));

  // The rule the whole design hangs on.
  for (const field of ['owner', 'owner_mailing', 'address']) {
    const bad = ENR.validateConfig({ sources: [{ ...camaSource, baseField: field }] });
    ok(`joining on "${field}" is a hard config error`, !bad.valid);
    ok(`the "${field}" error explains why fuzzy identity joins are refused`,
      bad.errors.some(e => e.includes('confidently-wrong')));
  }

  const dupes = ENR.validateConfig({ sources: [camaSource, { ...camaSource }] });
  ok('duplicate source ids are rejected', !dupes.valid);

  const badField = ENR.validateConfig({ sources: [{ ...camaSource, fieldMap: { not_a_real_field: 'X' } }] });
  ok('a fieldMap naming a non-canonical field is rejected', !badField.valid);

  const badConf = ENR.validateConfig({ sources: [{ ...camaSource, confidence: 'very-official' }] });
  ok('an unknown confidence id is rejected at config time', !badConf.valid);
}

// ── Happy path: fill empty fields + provenance ─────────────────────────────
{
  ENR.clearCache();
  ENR.registerExecutor('fake-table', fakeExecutor({
    'A-1': { PARCELID: 'A-1', OWNER_NAME: 'ACME LAND LLC', TOTVAL: 250000, YRBLT: 1998 },
  }));

  const collection = fc(baseFeature('A-1'));
  const res = await ENR.enrich(collection, { enrichment: { sources: [camaSource] } }, { now: 1_000_000 });
  const props = res.features[0].properties;

  t('joined fields are merged onto the parcel', props.owner, 'ACME LAND LLC');
  t('numeric joined fields survive', props.assessed_value, 250000);
  t('the parcel keeps its own base fields', props.area_acres, 10);
  t('geometry is untouched', res.features[0].geometry.type, 'Polygon');
  t('source health reports ok', res.sources[0].status, 'ok');
  t('health counts merged fields', res.sources[0].fieldsMerged, 3);
  t('health counts matched keys', res.sources[0].matched, 1);

  const prov = PROV.get(props, 'assessed_value');
  t('merged value records its source id', prov.sourceId, 'test-cama');
  t('merged value records the source column it came from', prov.sourceField, 'TOTVAL');
  t('merged value is tagged official-joined, not direct-official', prov.confidence, 'official-joined');
  ok('merged value records when it was fetched', typeof prov.fetchedAt === 'string');
}

// ── Missing vs zero ────────────────────────────────────────────────────────
{
  ENR.clearCache();
  ENR.registerExecutor('fake-table', fakeExecutor({
    'Z-0': { PARCELID: 'Z-0', OWNER_NAME: '', TOTVAL: 0, YRBLT: null },
  }));

  const res = await ENR.enrich(fc(baseFeature('Z-0')), { enrichment: { sources: [camaSource] } }, { now: 1 });
  const props = res.features[0].properties;

  // 0 is a real assessed value (tax-exempt land, for one) and must survive.
  t('a genuine zero IS merged', props.assessed_value, 0);
  ok('an empty string is NOT merged as a value', props.owner === undefined);
  ok('an explicit null is NOT merged as a value', props.year_built === undefined);
  t('only the real value counts toward fieldsMerged', res.sources[0].fieldsMerged, 1);
}

// ── Conflict resolution ────────────────────────────────────────────────────
{
  ENR.clearCache();
  ENR.registerExecutor('fake-table', fakeExecutor({
    'C-1': { PARCELID: 'C-1', OWNER_NAME: 'SECONDARY OWNER', TOTVAL: 999 },
  }));

  // Base already knows the owner. A secondary source must not overwrite it.
  const withOwner = baseFeature('C-1', { owner: 'BASE OWNER' });
  const res = await ENR.enrich(fc(withOwner), { enrichment: { sources: [camaSource] } }, { now: 1 });
  const props = res.features[0].properties;

  t('an existing base value is NOT overwritten without override', props.owner, 'BASE OWNER');
  t('the empty field is still filled', props.assessed_value, 999);
  ok('the rejected value is recorded as a conflict, not discarded silently',
    res.conflicts.some(c => c.field === 'owner' && c.rejected === 'SECONDARY OWNER' && c.kept === 'BASE OWNER'));

  // override:true still loses when the incoming source is no more direct.
  const sameConf = { ...camaSource, override: true, confidence: 'official-joined' };
  const props2 = (await ENR.enrich(fc(baseFeature('C-1', { owner: 'BASE OWNER' })),
    { enrichment: { sources: [sameConf] } }, { now: 1 })).features[0].properties;
  t('override does not win when the source is not more direct', props2.owner, 'BASE OWNER');

  // Base values carry no provenance record, so they are treated as
  // direct-official; only something strictly more direct could displace
  // them, and nothing outranks direct-official.
  const higher = { ...camaSource, override: true, confidence: 'direct-official' };
  const props3 = (await ENR.enrich(fc(baseFeature('C-1', { owner: 'BASE OWNER' })),
    { enrichment: { sources: [higher] } }, { now: 1 })).features[0].properties;
  t('an equally-direct override still cannot displace the geometry source', props3.owner, 'BASE OWNER');
}

// ── Determinism: source order never depends on which server answers first ──
{
  ENR.clearCache();
  ENR.registerExecutor('slow-first', async (source, keys) => {
    await new Promise(r => setTimeout(r, 20));
    return { records: { 'D-1': { PARCELID: 'D-1', OWNER_NAME: 'FROM SLOW' } } };
  });
  ENR.registerExecutor('fast-second', async () => ({ records: { 'D-1': { PARCELID: 'D-1', OWNER_NAME: 'FROM FAST' } } }));

  const slow = { ...camaSource, id: 'slow', type: 'slow-first', priority: 1, fieldMap: { owner: 'OWNER_NAME' } };
  const fast = { ...camaSource, id: 'fast', type: 'fast-second', priority: 2, fieldMap: { owner: 'OWNER_NAME' } };

  // Declared in the "wrong" order; priority must still decide the winner.
  const res = await ENR.enrich(fc(baseFeature('D-1')), { enrichment: { sources: [fast, slow] } }, { now: 1 });
  t('lower priority number wins regardless of declaration order or latency',
    res.features[0].properties.owner, 'FROM SLOW');
}

// ── Failure isolation: a dead source must never break geometry ─────────────
{
  ENR.clearCache();
  ENR.registerExecutor('fake-table', fakeExecutor({}, { throws: 'CAMA service HTTP 503' }));

  const res = await ENR.enrich(fc(baseFeature('E-1')), { enrichment: { sources: [camaSource] } }, { now: 1 });

  t('a throwing source is reported as error, not propagated', res.sources[0].status, 'error');
  t('the error message is preserved for the health indicator', res.sources[0].error, 'CAMA service HTTP 503');
  t('the parcel still has its geometry', res.features[0].geometry.type, 'Polygon');
  t('the parcel still has its base fields', res.features[0].properties.area_acres, 10);
  t('summarizeHealth reports total failure when the only source died',
    ENR.summarizeHealth(res.sources).status, 'failed');
}

{
  // One source up, one down => degraded, not ok.
  const good = { ...camaSource, id: 'good', type: 'good-exec', fieldMap: { owner: 'OWNER_NAME' } };
  const bad  = { ...camaSource, id: 'bad',  type: 'bad-exec',  fieldMap: { year_built: 'YRBLT' } };
  ENR.clearCache();
  ENR.registerExecutor('good-exec', fakeExecutor({ 'F-1': { OWNER_NAME: 'STILL WORKS' } }));
  ENR.registerExecutor('bad-exec', fakeExecutor({}, { throws: 'boom' }));

  const res = await ENR.enrich(fc(baseFeature('F-1')), { enrichment: { sources: [good, bad] } }, { now: 1 });
  t('the healthy source still merges its fields', res.features[0].properties.owner, 'STILL WORKS');
  t('mixed health is reported as degraded', ENR.summarizeHealth(res.sources).status, 'degraded');
}

// ── A wrong join key must be loud, not a silent no-op ──────────────────────
{
  ENR.clearCache();
  ENR.registerExecutor('fake-table', fakeExecutor({ 'SOMETHING-ELSE': { OWNER_NAME: 'X' } }));
  const res = await ENR.enrich(fc(baseFeature('G-1')), { enrichment: { sources: [camaSource] } }, { now: 1 });
  t('matching zero of N keys is flagged, not reported ok', res.sources[0].status, 'joined-none');
  ok('the message points at the join configuration',
    res.sources[0].error.includes('joinField'));
}

// ── Unsupported source type ────────────────────────────────────────────────
{
  ENR.clearCache();
  const res = await ENR.enrich(fc(baseFeature('H-1')),
    { enrichment: { sources: [{ ...camaSource, type: 'not-registered-anywhere' }] } }, { now: 1 });
  t('an unregistered source type is reported, not thrown', res.sources[0].status, 'unsupported');
  t('the parcel is returned untouched', res.features[0].properties.owner, undefined);
}

// ── Broken config disables enrichment entirely ─────────────────────────────
{
  ENR.clearCache();
  const res = await ENR.enrich(fc(baseFeature('I-1')),
    { enrichment: { sources: [{ ...camaSource, baseField: 'owner' }] } }, { now: 1 });
  t('a config error is surfaced as its own health entry', res.sources[0].status, 'config-error');
  t('no partial enrichment is applied', res.features[0].properties.assessed_value, undefined);
}

// ── Caching ────────────────────────────────────────────────────────────────
{
  ENR.clearCache();
  let calls = 0;
  ENR.registerExecutor('fake-table', fakeExecutor(
    { 'J-1': { OWNER_NAME: 'CACHED CO', TOTVAL: 1 } },
    { onCall: () => { calls++; } },
  ));
  const cfg = { enrichment: { sources: [camaSource] } };

  await ENR.enrich(fc(baseFeature('J-1')), cfg, { now: 1000 });
  t('first enrichment hits the executor', calls, 1);

  const second = await ENR.enrich(fc(baseFeature('J-1')), cfg, { now: 2000 });
  t('a second pass over the same key is served from cache', calls, 1);
  t('the cached value is still merged', second.features[0].properties.owner, 'CACHED CO');

  // An unmatched key is cached too, so panning does not re-ask forever.
  ENR.clearCache();
  calls = 0;
  await ENR.enrich(fc(baseFeature('NOPE')), cfg, { now: 1000 });
  await ENR.enrich(fc(baseFeature('NOPE')), cfg, { now: 1000 });
  t('a known-missing key is cached rather than re-requested', calls, 1);

  // TTL expiry.
  ENR.clearCache();
  calls = 0;
  await ENR.enrich(fc(baseFeature('J-1')), cfg, { now: 0 });
  await ENR.enrich(fc(baseFeature('J-1')), cfg, { now: ENR.DEFAULT_TTL_MS + 1 });
  t('an expired cache entry is refetched', calls, 2);

  ENR.clearCache();
  t('clearCache empties the cache', ENR.cacheSize(), 0);
}

// ── Cancellation ───────────────────────────────────────────────────────────
{
  ENR.clearCache();
  ENR.registerExecutor('fake-table', fakeExecutor({ 'K-1': { OWNER_NAME: 'TOO LATE' } }));
  const aborted = { aborted: true };
  const res = await ENR.enrich(fc(baseFeature('K-1')),
    { enrichment: { sources: [camaSource] } }, { now: 1, signal: aborted });

  t('an already-aborted request is reported as aborted', res.aborted, true);
  t('no sources are executed after abort', res.sources.length, 0);
  t('the parcel is returned unenriched', res.features[0].properties.owner, undefined);
}

// ── Multiple features sharing one join key ─────────────────────────────────
{
  ENR.clearCache();
  let seenKeys = null;
  ENR.registerExecutor('fake-table', fakeExecutor(
    { 'L-1': { OWNER_NAME: 'SHARED OWNER' } },
    { onCall: (keys) => { seenKeys = keys; } },
  ));

  const res = await ENR.enrich(fc(baseFeature('L-1'), baseFeature('L-1'), baseFeature('L-2')),
    { enrichment: { sources: [camaSource] } }, { now: 1 });

  t('a repeated join key is only requested once', seenKeys.length, 2);
  t('every feature sharing the key receives the joined value',
    res.features.slice(0, 2).map(f => f.properties.owner), ['SHARED OWNER', 'SHARED OWNER']);
  t('an unmatched feature is left alone', res.features[2].properties.owner, undefined);
}

// ── Parcels with no join key at all ────────────────────────────────────────
{
  ENR.clearCache();
  ENR.registerExecutor('fake-table', fakeExecutor({ 'M-1': { OWNER_NAME: 'X' } }));
  const keyless = baseFeature('M-1');
  delete keyless.properties.parcel_id;

  const res = await ENR.enrich(fc(keyless), { enrichment: { sources: [camaSource] } }, { now: 1 });
  t('a viewport with no usable keys is reported as no-keys', res.sources[0].status, 'no-keys');
  t('nothing is merged onto a keyless parcel', res.features[0].properties.owner, undefined);
}

// ── No enrichment configured (the overwhelmingly common case) ──────────────
{
  const res = await ENR.enrich(fc(baseFeature('N-1')), { fips: '51107' }, { now: 1 });
  t('a jurisdiction with no enrichment block returns its features unchanged',
    res.features[0].properties.owner, undefined);
  t('and reports no sources', res.sources.length, 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
