/* tests/test_parcel_discovery_network.mjs — unit tests for
   data/parcel_pipeline/discovery/network.mjs's classification, backoff,
   and cache logic. No real network access — fetchJson/fetchJsonWithRetry
   use the real global fetch only when actually invoked, so these tests
   stick to the pure functions (classifyResult, computeBackoffMs,
   makeSafeName) plus fetchJsonCached's cache-hit/cache-miss behavior
   using a temp directory and a monkey-patched global.fetch.

   Run:  node tests/test_parcel_discovery_network.mjs
*/
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ERROR_TYPES, classifyResult, computeBackoffMs, makeSafeName, fetchJsonCached,
} from '../data/parcel_pipeline/discovery/network.mjs';

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

// ── classifyResult: every ERROR_TYPES branch ──
t('timeout error classified transient', classifyResult({ error: 'timeout after 8000ms' }),
  { ok: false, why: 'timeout after 8000ms', errorType: ERROR_TYPES.TIMEOUT, transient: true });

t('DNS error classified transient', classifyResult({ error: 'getaddrinfo ENOTFOUND example.gov' }).errorType,
  ERROR_TYPES.DNS);

t('connection reset classified transient', classifyResult({ error: 'ECONNRESET' }).errorType,
  ERROR_TYPES.CONNECTION_RESET);

t('unrecognized transport error still transient but unknown type',
  classifyResult({ error: 'some weird failure' }),
  { ok: false, why: 'some weird failure', errorType: ERROR_TYPES.UNKNOWN, transient: true });

t('HTTP 429 classified rate-limited and transient',
  classifyResult({ httpStatus: 429 }),
  { ok: false, why: 'HTTP 429 (rate limited)', errorType: ERROR_TYPES.RATE_LIMITED, transient: true });

t('HTTP 500 classified http-5xx and transient',
  classifyResult({ httpStatus: 500 }).transient, true);

t('HTTP 404 classified http-4xx and NOT transient (real answer, retrying wastes time)',
  classifyResult({ httpStatus: 404 }),
  { ok: false, why: 'HTTP 404', errorType: ERROR_TYPES.HTTP_4XX, transient: false });

t('non-JSON 200 response classified malformed-body, not transient',
  classifyResult({ httpStatus: 200, body: null, raw: '<html>oops</html>' }),
  { ok: false, why: 'non-JSON response (<html>oops</html>)', errorType: ERROR_TYPES.MALFORMED_BODY, transient: false });

t('clean 200 JSON body classified ok',
  classifyResult({ httpStatus: 200, body: { hello: 'world' } }),
  { ok: true, body: { hello: 'world' } });

// ── computeBackoffMs: bounds and monotonicity ──
{
  const base = 100;
  const b1 = computeBackoffMs(1, base);
  const b2 = computeBackoffMs(2, base);
  const b3 = computeBackoffMs(3, base);
  ok('backoff attempt 1 within [base, 2*base)', b1 >= base && b1 < 2 * base);
  ok('backoff attempt 2 within [2*base, 3*base)', b2 >= 2 * base && b2 < 3 * base);
  ok('backoff attempt 3 within [4*base, 5*base)', b3 >= 4 * base && b3 < 5 * base);
  ok('backoff grows with attempt (jitter cannot invert the trend across many samples)',
    computeBackoffMs(5, base) > computeBackoffMs(1, base));
}

// ── makeSafeName: deterministic, collision-resistant, filesystem-safe ──
{
  const n1 = makeSafeName('https://example.gov/arcgis/rest/services/Parcels/MapServer/0?f=json');
  const n2 = makeSafeName('https://example.gov/arcgis/rest/services/Parcels/MapServer/0?f=json');
  const n3 = makeSafeName('https://example.gov/arcgis/rest/services/Parcels/MapServer/1?f=json');
  t('makeSafeName is deterministic for the same URL', n1, n2);
  ok('makeSafeName differs for different URLs', n1 !== n3);
  ok('makeSafeName contains no path-unsafe characters', /^[a-z0-9-]+$/.test(n1));
}

// ── fetchJsonCached: cache miss writes, cache hit skips network ──
{
  const dir = mkdtempSync(join(tmpdir(), 'parcel-network-test-'));
  let fetchCalls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls++;
    return {
      status: 200,
      text: async () => JSON.stringify({ name: 'Test Layer', fields: [{ name: 'PIN' }] }),
    };
  };

  try {
    const url = 'https://example.gov/test-service?f=json';
    const first = await fetchJsonCached(url, {}, dir);
    ok('first fetchJsonCached call is not from cache', first.fromCache === false);
    ok('first call made exactly 1 real fetch', fetchCalls === 1);
    ok('raw response file was written', existsSync(join(dir, 'raw', `${makeSafeName(url)}.json`)));

    const second = await fetchJsonCached(url, {}, dir);
    ok('second fetchJsonCached call IS from cache', second.fromCache === true);
    ok('second call made no additional fetch', fetchCalls === 1);
    t('cached result body matches original', second.result.body, first.result.body);

    const third = await fetchJsonCached(url, { refresh: true }, dir);
    ok('refresh:true bypasses the cache', third.fromCache === false);
    ok('refresh triggered a second real fetch', fetchCalls === 2);

    const noCacheDir = await fetchJsonCached(url, {}, null);
    ok('cacheDir=null never touches the filesystem cache', noCacheDir.fromCache === false);
    ok('cacheDir=null still made a real fetch', fetchCalls === 3);
  } finally {
    globalThis.fetch = realFetch;
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
