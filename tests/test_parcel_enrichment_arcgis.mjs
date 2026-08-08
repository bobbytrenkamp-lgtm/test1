/* tests/test_parcel_enrichment_arcgis.mjs — the 'arcgis-table' join executor.

   Covers WHERE-clause construction (quoting, numeric columns, SQL escaping),
   batching, ArcGIS's habit of reporting errors inside a 200 response, HTML
   login pages masquerading as data, retry/backoff, abort propagation,
   duplicate rows per parcel, and the raw-vs-normalized key round trip.

   global.fetch is stubbed throughout — no network access, and failure modes a
   live county server produces only intermittently are exercised every run.

   Run:  node tests/test_parcel_enrichment_arcgis.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };
global.CustomEvent = class CustomEvent { constructor(type, opts) { this.type = type; this.detail = (opts || {}).detail; } };

require('../js/parcel/schema.js');
require('../js/parcel/provenance.js');
require('../js/parcel/enrichment.js');
require('../js/parcel/enrichment-arcgis-table.js');

const ENR = global.PARCEL_ENRICHMENT;
const AG  = global.PARCEL_ENRICHMENT_ARCGIS;

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

const SOURCE = {
  id: 'pwc-cama',
  label: 'Prince William County CAMA',
  type: 'arcgis-table',
  url: 'https://example.gov/arcgis/rest/services/Parcels/MapServer/5',
  baseField: 'parcel_id',
  joinField: 'GPIN',
  confidence: 'official-joined',
  fieldMap: { owner: 'OWNER_CUR', assessed_value: 'TOTVAL' },
};

function feature(parcelId) {
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    properties: { parcel_id: parcelId, area_acres: 10, county_fips: '51153' },
  };
}
const fc = (...f) => ({ type: 'FeatureCollection', features: f });

/* Stubs global.fetch. `handler(url)` returns either a plain object (sent as
   JSON with 200) or { status, body, text } for the awkward cases. */
function stubFetch(handler) {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push(url);
    if (opts && opts.signal && opts.signal.aborted) {
      const e = new Error('aborted'); e.name = 'AbortError'; throw e;
    }
    const r = handler(url, calls.length);
    if (r && r.__raw) {
      return {
        ok: r.status ? r.status < 400 : true,
        status: r.status || 200,
        statusText: r.statusText || '',
        json: async () => { if (r.notJson) throw new Error('bad json'); return r.body; },
      };
    }
    return { ok: true, status: 200, statusText: 'OK', json: async () => r };
  };
  return calls;
}
const esriRows = (rows) => ({ features: rows.map(attributes => ({ attributes })) });

// ── WHERE construction ─────────────────────────────────────────────────────
{
  t('string keys are quoted',
    AG.buildWhere(SOURCE, ['A1', 'B2']), "GPIN IN ('A1','B2')");

  // Quoting a value against an integer column makes some backends error and
  // others silently return nothing — which would look like a bad join key.
  t('numericJoin emits unquoted numbers',
    AG.buildWhere({ ...SOURCE, numericJoin: true }, ['101', '202']), 'GPIN IN (101,202)');
  t('numericJoin strips thousands separators',
    AG.buildWhere({ ...SOURCE, numericJoin: true }, ['1,234']), 'GPIN IN (1234)');
  t('numericJoin drops non-numeric values rather than emitting broken SQL',
    AG.buildWhere({ ...SOURCE, numericJoin: true }, ['12', 'NOT-A-NUMBER']), 'GPIN IN (12)');
  t('numericJoin with no usable values yields no predicate',
    AG.buildWhere({ ...SOURCE, numericJoin: true }, ['abc']), null);

  // A text-stored id that merely looks numeric must stay quoted, or the
  // leading zeros the county actually stores are lost.
  t('a text join keeps leading zeros by quoting',
    AG.buildWhere(SOURCE, ['0012345']), "GPIN IN ('0012345')");

  t('embedded apostrophes are doubled, not passed through',
    AG.buildWhere(SOURCE, ["O'BRIEN-1"]), "GPIN IN ('O''BRIEN-1')");
  t("a quote-injection attempt is neutralized",
    AG.buildWhere(SOURCE, ["x') OR 1=1--"]), "GPIN IN ('x'') OR 1=1--')");
  t('an empty key list yields no predicate', AG.buildWhere(SOURCE, []), null);
}

// ── URL construction ───────────────────────────────────────────────────────
{
  const url = new URL(AG.buildUrl(SOURCE, "GPIN IN ('A1')"));
  t('queries the layer /query endpoint', url.pathname.endsWith('/MapServer/5/query'), true);
  t('geometry is not requested (this is an attribute join)',
    url.searchParams.get('returnGeometry'), 'false');
  t('f=json', url.searchParams.get('f'), 'json');

  const outFields = url.searchParams.get('outFields').split(',');
  ok('the join column is always requested, even though fieldMap does not name it',
    outFields.includes('GPIN'));
  ok('mapped source columns are requested', outFields.includes('OWNER_CUR') && outFields.includes('TOTVAL'));

  const trailing = new URL(AG.buildUrl({ ...SOURCE, url: SOURCE.url + '/' }, 'X'));
  t('a trailing slash on the configured url does not produce a doubled path',
    trailing.pathname.endsWith('/MapServer/5/query'), true);
}

// ── Happy path through the engine ──────────────────────────────────────────
{
  ENR.clearCache();
  stubFetch(() => esriRows([
    { GPIN: 'A-1', OWNER_CUR: 'ACME LAND LLC', TOTVAL: 250000 },
  ]));

  const res = await ENR.enrich(fc(feature('A-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  const props = res.features[0].properties;

  t('source reports ok', res.sources[0].status, 'ok');
  t('owner is joined in', props.owner, 'ACME LAND LLC');
  t('assessed value is joined in', props.assessed_value, 250000);
  t('provenance names the CAMA source',
    global.PARCEL_PROVENANCE.get(props, 'owner').sourceId, 'pwc-cama');
  t('provenance records the source column',
    global.PARCEL_PROVENANCE.get(props, 'assessed_value').sourceField, 'TOTVAL');
}

// ── Raw vs normalized keys ─────────────────────────────────────────────────
{
  // The parcel layer stores '0123-45-6789'; the CAMA table stores the same id
  // punctuated differently. Normalization must bridge them, and the WHERE
  // clause must still ask for the RAW form the server actually holds.
  ENR.clearCache();
  const src = { ...SOURCE, joinNormalize: { upper: true, stripNonAlnum: true } };
  const calls = stubFetch(() => esriRows([{ GPIN: '0123456789', OWNER_CUR: 'BRIDGED CO' }]));

  const res = await ENR.enrich(fc(feature('0123-45-6789')), { enrichment: { sources: [src] } }, { now: 1 });

  ok('the query asks for the raw, punctuated value the parcel layer holds',
    decodeURIComponent(calls[0]).includes("'0123-45-6789'"));
  t('the differently-punctuated response still joins',
    res.features[0].properties.owner, 'BRIDGED CO');
}

// ── ArcGIS errors inside a 200 body ────────────────────────────────────────
{
  ENR.clearCache();
  stubFetch(() => ({
    error: { code: 400, message: "Unable to complete operation.", details: ["Invalid field: GPIN"] },
  }));

  const res = await ENR.enrich(fc(feature('B-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('an ArcGIS error body is a source error, not an empty result', res.sources[0].status, 'error');
  ok('the error surfaces the ArcGIS message', res.sources[0].error.includes('Unable to complete operation'));
  ok('the error surfaces the field-level detail', res.sources[0].error.includes('Invalid field: GPIN'));
  t('geometry survives the failed join', res.features[0].geometry.type, 'Polygon');
  t('base fields survive the failed join', res.features[0].properties.area_acres, 10);
}

// ── HTML login page masquerading as data ───────────────────────────────────
{
  ENR.clearCache();
  stubFetch(() => ({ __raw: true, status: 200, notJson: true }));

  const res = await ENR.enrich(fc(feature('C-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('a non-JSON 200 is reported as an error', res.sources[0].status, 'error');
  ok('the message names the likely cause rather than a parser failure',
    res.sources[0].error.includes('non-JSON'));
}

// ── Retry / backoff ────────────────────────────────────────────────────────
{
  ENR.clearCache();
  let n = 0;
  stubFetch(() => {
    n++;
    if (n < 3) return { __raw: true, status: 503, statusText: 'Service Unavailable' };
    return esriRows([{ GPIN: 'D-1', OWNER_CUR: 'RECOVERED CO' }]);
  });

  const res = await ENR.enrich(fc(feature('D-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('a transient 503 is retried', n, 3);
  t('the eventual success is merged', res.features[0].properties.owner, 'RECOVERED CO');
  t('and the source reports ok', res.sources[0].status, 'ok');
}

{
  ENR.clearCache();
  let n = 0;
  stubFetch(() => { n++; return { __raw: true, status: 500, statusText: 'Server Error' }; });

  const res = await ENR.enrich(fc(feature('E-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('retries are bounded', n, 3);
  t('persistent failure is reported as an error', res.sources[0].status, 'error');
  ok('the last HTTP status is preserved', res.sources[0].error.includes('500'));
}

// ── Abort must not burn retries ────────────────────────────────────────────
{
  ENR.clearCache();
  let n = 0;
  const controller = { aborted: false };
  stubFetch(() => {
    n++;
    controller.aborted = true;              // user pans away mid-flight
    const e = new Error('aborted'); e.name = 'AbortError'; throw e;
  });

  const res = await ENR.enrich(fc(feature('F-1')), { enrichment: { sources: [SOURCE] } },
    { now: 1, signal: controller });

  t('an aborted request is not retried', n, 1);
  t('the parcel is left unenriched', res.features[0].properties.owner, undefined);
}

// ── Batching ───────────────────────────────────────────────────────────────
{
  ENR.clearCache();
  const src = { ...SOURCE, batchSize: 2 };
  const calls = stubFetch(() => esriRows([]));

  const feats = ['K1', 'K2', 'K3', 'K4', 'K5'].map(feature);
  await ENR.enrich(fc(...feats), { enrichment: { sources: [src] } }, { now: 1 });

  t('5 keys at batchSize 2 makes 3 requests', calls.length, 3);
  const allKeys = calls.map(c => decodeURIComponent(c)).join(' ');
  ok('every key appears across the batches',
    ['K1', 'K2', 'K3', 'K4', 'K5'].every(k => allKeys.includes(`'${k}'`)));
}

// ── Duplicate CAMA rows for one parcel ─────────────────────────────────────
{
  // Assessment tables legitimately carry several rows per parcel (one per
  // building, one per owner of record). Merging them would fabricate a parcel
  // matching no single official row; first-wins is deterministic and honest.
  ENR.clearCache();
  stubFetch(() => esriRows([
    { GPIN: 'G-1', OWNER_CUR: 'FIRST OWNER', TOTVAL: 100 },
    { GPIN: 'G-1', OWNER_CUR: 'SECOND OWNER', TOTVAL: 200 },
  ]));

  const res = await ENR.enrich(fc(feature('G-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('the first row wins deterministically', res.features[0].properties.owner, 'FIRST OWNER');
  t('fields are not mixed across duplicate rows', res.features[0].properties.assessed_value, 100);
}

// ── A row whose join column is null ────────────────────────────────────────
{
  ENR.clearCache();
  stubFetch(() => esriRows([
    { GPIN: null, OWNER_CUR: 'ORPHAN ROW' },
    { GPIN: 'H-1', OWNER_CUR: 'REAL OWNER' },
  ]));

  const res = await ENR.enrich(fc(feature('H-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('a row with a null join key is discarded, not attached to something', res.features[0].properties.owner, 'REAL OWNER');
}

// ── Zero matches stays loud ────────────────────────────────────────────────
{
  ENR.clearCache();
  stubFetch(() => esriRows([]));
  const res = await ENR.enrich(fc(feature('I-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('an empty but valid response is joined-none, not ok', res.sources[0].status, 'joined-none');
}

// ── Vintage is never invented ──────────────────────────────────────────────
{
  ENR.clearCache();
  stubFetch(() => esriRows([{ GPIN: 'J-1', OWNER_CUR: 'X' }]));
  const res = await ENR.enrich(fc(feature('J-1')), { enrichment: { sources: [SOURCE] } }, { now: 1 });
  t('sourceUpdatedAt stays null when the publisher declares no vintage',
    global.PARCEL_PROVENANCE.get(res.features[0].properties, 'owner').sourceUpdatedAt, null);

  ENR.clearCache();
  stubFetch(() => esriRows([{ GPIN: 'J-2', OWNER_CUR: 'X' }]));
  const dated = await ENR.enrich(fc(feature('J-2')),
    { enrichment: { sources: [{ ...SOURCE, sourceUpdatedAt: '2026-07-01' }] } }, { now: 1 });
  t('a declared vintage is carried into provenance',
    global.PARCEL_PROVENANCE.get(dated.features[0].properties, 'owner').sourceUpdatedAt, '2026-07-01');
}

// ── Missing url ────────────────────────────────────────────────────────────
{
  ENR.clearCache();
  stubFetch(() => esriRows([]));
  const res = await ENR.enrich(fc(feature('L-1')),
    { enrichment: { sources: [{ ...SOURCE, url: undefined }] } }, { now: 1 });
  t('a source with no url errors rather than fetching undefined', res.sources[0].status, 'error');
  ok('the message names the offending source', res.sources[0].error.includes('pwc-cama'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
