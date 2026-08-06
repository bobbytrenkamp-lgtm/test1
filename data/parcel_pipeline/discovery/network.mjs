/* data/parcel_pipeline/discovery/network.mjs — shared request utility for
 * the permanent parcel discovery pipeline: timeout, exponential backoff +
 * jitter, transient-only retry, structured error classification, and a
 * run-scoped cache keyed by URL.
 *
 * This generalizes the retry/backoff/classify pattern already proven in
 * data/check_parcel_services.mjs (probe/classify/probeWithRetry) into a
 * reusable module. check_parcel_services.mjs itself is NOT refactored to
 * use this — it is a working, live-network CI script and touching it for a
 * pure refactor is unnecessary risk. A future cleanup PR may unify them.
 *
 * Every adapter in data/parcel_pipeline/discovery/ routes its network calls
 * through fetchJsonCached() so that --resume/--refresh in discover_batch.mjs
 * work automatically: a cache hit never touches the network, a cache miss
 * fetches once and persists the full response under <cacheDir>/raw/, and
 * nothing here needs to know about --resume at all.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const ERROR_TYPES = Object.freeze({
  TIMEOUT: 'timeout',
  DNS: 'dns',
  CONNECTION_RESET: 'connection-reset',
  HTTP_4XX: 'http-4xx',
  HTTP_5XX: 'http-5xx',
  RATE_LIMITED: 'rate-limited',
  MALFORMED_BODY: 'malformed-body',
  UNKNOWN: 'unknown',
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* Pure. Takes the same raw result shape check_parcel_services.mjs's probe()
   already returns: { httpStatus, body, raw, error }. Returns
   { ok, why, errorType, transient }. transient=true only for failures worth
   retrying: transport-level failures (timeout/dns/connection-reset) and
   server-side 5xx/429 — never a clean 4xx or a malformed/error body, since
   retrying those wastes time without changing the answer. */
export function classifyResult(result) {
  if (result.error) {
    let errorType = ERROR_TYPES.UNKNOWN;
    if (/timeout after/.test(result.error)) errorType = ERROR_TYPES.TIMEOUT;
    else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(result.error)) errorType = ERROR_TYPES.DNS;
    else if (/ECONNRESET|ECONNREFUSED|ECONNABORTED|EPIPE/i.test(result.error)) errorType = ERROR_TYPES.CONNECTION_RESET;
    return { ok: false, why: result.error, errorType, transient: true };
  }
  if (result.httpStatus !== 200) {
    if (result.httpStatus === 429) {
      return { ok: false, why: 'HTTP 429 (rate limited)', errorType: ERROR_TYPES.RATE_LIMITED, transient: true };
    }
    const errorType = result.httpStatus >= 500 ? ERROR_TYPES.HTTP_5XX
      : result.httpStatus >= 400 ? ERROR_TYPES.HTTP_4XX : ERROR_TYPES.UNKNOWN;
    return { ok: false, why: `HTTP ${result.httpStatus}`, errorType, transient: result.httpStatus >= 500 };
  }
  if (!result.body) {
    return {
      ok: false,
      why: `non-JSON response (${String(result.raw || '').replace(/\s+/g, ' ').slice(0, 80)})`,
      errorType: ERROR_TYPES.MALFORMED_BODY,
      transient: false,
    };
  }
  return { ok: true, body: result.body };
}

/* Pure. Exposed separately from the retry loop so the jitter formula is
   independently unit-testable without mocking fetch. Matches the exact
   formula already proven in check_parcel_services.mjs's probeWithRetry. */
export function computeBackoffMs(attempt, baseBackoffMs = 250) {
  return baseBackoffMs * 2 ** (attempt - 1) + Math.random() * baseBackoffMs;
}

/* Single attempt, no retry. options: { timeoutMs=8000, headers, method='GET' }.
   Returns the raw { httpStatus, body, raw, error } shape classifyResult()
   expects — never throws. */
export async function fetchJson(url, options = {}) {
  const { timeoutMs = 8000, headers = {}, method = 'GET' } = options;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'parcel-discovery-pipeline/1.0 (+github.com data center tracker)',
        ...headers,
      },
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON — handled by caller */ }
    return { httpStatus: res.status, body, raw: text.slice(0, 2000) };
  } catch (e) {
    return {
      httpStatus: null,
      body: null,
      error: e.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* Wraps fetchJson + classifyResult + computeBackoffMs in a retry loop.
   options adds { maxRetries=2, baseBackoffMs=250 } on top of fetchJson's
   options. Returns { result, classified, attempts }. */
export async function fetchJsonWithRetry(url, options = {}) {
  const { maxRetries = 2, baseBackoffMs = 250, ...fetchOptions } = options;
  let attempt = 0;
  while (true) {
    const result = await fetchJson(url, fetchOptions);
    const classified = classifyResult(result);
    attempt++;
    if (classified.ok || !classified.transient || attempt > maxRetries) {
      return { result, classified, attempts: attempt };
    }
    await sleep(computeBackoffMs(attempt, baseBackoffMs));
  }
}

/* Pure. Content-addressed safe filename for a URL (+ optional params object
   folded into the string before slugifying), used for both raw/ output
   filenames and cache lookups so discover_batch.mjs's --resume/--refresh
   never need their own separate derivation. Truncated to keep filenames
   filesystem-safe; a short hash suffix keeps two different long URLs that
   truncate to the same prefix from colliding. */
export function makeSafeName(url, params = null) {
  const full = params ? `${url}?${JSON.stringify(params)}` : url;
  const slug = full
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  let hash = 0;
  for (let i = 0; i < full.length; i++) {
    hash = (hash * 31 + full.charCodeAt(i)) >>> 0;
  }
  const hashSuffix = hash.toString(36);
  const truncated = slug.slice(0, 120);
  return `${truncated}-${hashSuffix}`;
}

/* Cache-first fetch: if <cacheDir>/raw/<safeName>.json already exists (a
   prior run, or --resume), returns it without a network call. Otherwise
   calls fetchJsonWithRetry and writes the full response + metadata to that
   path. If cacheDir is null, caching is skipped entirely (always fetches
   live) — used by unit tests and any one-off invocation that shouldn't
   persist anything to disk. */
export async function fetchJsonCached(url, options = {}, cacheDir = null) {
  if (!cacheDir) {
    const { result, classified, attempts } = await fetchJsonWithRetry(url, options);
    return { url, result, classified, attempts, fromCache: false };
  }

  const safeName = makeSafeName(url, options.params || null);
  const rawPath = join(cacheDir, 'raw', `${safeName}.json`);

  if (!options.refresh && existsSync(rawPath)) {
    try {
      const cached = JSON.parse(readFileSync(rawPath, 'utf8'));
      return { ...cached, fromCache: true };
    } catch {
      /* Corrupt cache entry — fall through and re-fetch. */
    }
  }

  const { result, classified, attempts } = await fetchJsonWithRetry(url, options);
  const record = {
    url,
    fetchedAt: new Date().toISOString(),
    result,
    classified,
    attempts,
  };
  mkdirSync(dirname(rawPath), { recursive: true });
  writeFileSync(rawPath, JSON.stringify(record, null, 2) + '\n');
  return { ...record, fromCache: false };
}
