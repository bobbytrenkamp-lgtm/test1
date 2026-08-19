/* data/check_parcel_services.mjs — probe every parcel service in the registry.
 *
 *   node data/check_parcel_services.mjs
 *   node data/check_parcel_services.mjs --fips 51107,24031    # scope to specific FIPS
 *   node data/check_parcel_services.mjs --record-history       # append to health history
 *
 * WHY THIS EXISTS
 * js/parcel/registry.js carries an explicit warning that none of its
 * serviceUrl values has ever been fetch-confirmed: they were originally
 * plausible-looking guesses, and a later pass re-derived them from web search
 * without being able to make outbound requests either. One (Montgomery County
 * MD) had already been found to be a completely invalid org/service ID. That
 * file names this exact check as its single highest-value follow-up:
 *
 *   "opening each serviceUrl + '?f=json' in a real browser and confirming it
 *    returns a valid layer definition (name + fields), not {"error":...}"
 *
 * A dead service is invisible in the UI beyond a generic "Parcel data
 * unavailable — service error" toast, so this turns a silent data gap into a
 * checkable, CI-runnable fact.
 *
 * WHY JAVASCRIPT, when every other data/ script is Python: the registry IS
 * JavaScript (window.PARCEL_REGISTRY). Loading it directly keeps this honest —
 * it probes exactly what the app ships, with no second copy of the URLs to
 * drift out of sync.
 *
 * ALSO CHECKS FIELD MAPPINGS. A service can be perfectly alive and still yield
 * blank parcel panels if fieldMap points at attribute names the layer does not
 * have. registry.js already documents this happening for the Virginia
 * boundary services (geometry, but no owner/address/zoning). Comparing
 * fieldMap against the layer's real field list catches that class too.
 *
 * --fips <csv>: probes only the given FIPS codes instead of the whole
 * registry. Used by .github/workflows/parcel_pr_check.yml to scope a PR's
 * probe to only the jurisdictions that PR's diff actually touched (via
 * data/parcel_pipeline/changed_fips.mjs), instead of re-probing 50+ services
 * on every registry.js change. Omitted (the default) probes everything,
 * exactly as before this flag existed.
 *
 * RETRY + MULTI-RUN CONFIRMATION. A single failed request no longer means a
 * service is reported as newly dead. Transport-level failures (timeout, DNS,
 * connection reset — never a clean HTTP error response, since retrying a
 * real 404/403 wastes time and won't change the answer) get up to 2 retries
 * with exponential backoff + jitter. If a jurisdiction still fails after
 * retries and isn't already knownUnavailable, it's only treated as a
 * CONFIRMED new failure (bad++, fails the job) if it also failed in at least
 * one of its last 2 recorded runs in data/parcel_health_history.json — a
 * single first-time failure is logged but does not fail the build. This
 * needs --record-history passed on the runs that should feed that history
 * (the scheduled/dispatch runs; PR-scoped runs read history for context but
 * never write to it, so a feature-branch probe can't pollute it).
 *
 * Exit codes: 0 = no NEW confirmed failures (live services, plus any already
 *                 recorded in registry.js as knownUnavailable, plus any
 *                 not-yet-confirmed single failures).
 *             1 = a service failed and was confirmed dead across multiple
 *                 recorded runs (or is being probed for the first time ever
 *                 with no history to consult — see isConfirmedDead below).
 *             2 = could not run at all (registry failed to load, or every
 *                 probe failed identically = this runner has no network).
 *
 * A service already recorded as down does not fail the run. An alert that
 * fires monthly on the same known fact stops being read, and the next real
 * breakage then looks exactly like the noise.
 * Network is required, so this cannot run in a sandbox — it is meant for CI
 * or a developer machine. See .github/workflows/check_parcel_services.yml
 * and .github/workflows/parcel_pr_check.yml.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 20000);
const MAX_RETRIES = 2;
const HISTORY_PATH = join(ROOT, 'data/parcel_health_history.json');
const HISTORY_RUNS_PER_FIPS = 6;
const CONFIRMATION_WINDOW = 3; // this run + up to 2 prior recorded runs
const CONFIRMATION_THRESHOLD = 2; // failures within that window needed to confirm

function parseArgs(argv) {
  const args = { fips: null, recordHistory: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--fips') args.fips = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (argv[i] === '--record-history') args.recordHistory = true;
  }
  return args;
}

/* Load the registry the same way the browser does: it is a classic script
   that assigns to window, so give it a window to assign to. */
function loadRegistry() {
  const src = readFileSync(join(ROOT, 'js/parcel/registry.js'), 'utf8');
  const sandboxWindow = {};
  new Function('window', src)(sandboxWindow);
  const reg = sandboxWindow.PARCEL_REGISTRY;
  if (!reg || typeof reg.all !== 'function') {
    throw new Error('registry.js did not define window.PARCEL_REGISTRY.all()');
  }
  return reg.all();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url + '?f=json', {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'parcel-service-check/1.0' },
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON — handled below */ }
    return { httpStatus: res.status, body, raw: text.slice(0, 200) };
  } catch (e) {
    return { httpStatus: null, body: null, error: e.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : e.message };
  } finally {
    clearTimeout(timer);
  }
}

/* ArcGIS returns HTTP 200 with an {"error":{...}} envelope for a bad service
   ID, so the status code alone proves nothing — the body has to be read.
   `transient` marks failures worth retrying: transport-level only (the fetch
   itself never got a response). A real HTTP error response, or a 200 with a
   malformed/error body, is a genuine answer from the server — retrying it
   wastes time without changing the result. */
/* Mirrors data/lib/endpoint_diagnostics.py's DOWN_REASONS taxonomy so a
   failure reported here and one reported by the Python citation/policy
   checkers speak the same vocabulary once both land in data_health.json.
   downReason is a *reason*, layered on top of (not replacing) errorType and
   the existing ok/transient fields this script's callers already depend on. */
const DOWN_REASON = {
  TRANSIENT_FAILURE: 'TRANSIENT_FAILURE',
  SOURCE_MOVED: 'SOURCE_MOVED',
  SOURCE_RETIRED: 'SOURCE_RETIRED',
  ACCESS_BLOCKED: 'ACCESS_BLOCKED',
  REPLACEMENT_REQUIRED: 'REPLACEMENT_REQUIRED',
};

/* Bot-wall/challenge-page signatures — same list as the Python side's
   _ACCESS_BLOCKED_MARKERS in data/lib/endpoint_diagnostics.py, kept in sync
   by hand since one is Python and one is JS. */
const ACCESS_BLOCKED_MARKERS = /cf-browser-verification|checking your browser|captcha|access denied|request blocked|akamai|incapsula|perimeterx|attention required|cloudflare/i;

function downReasonFor({ httpStatus, errorType, rawBody, transient }) {
  if (httpStatus === 999 || (httpStatus === 403 && rawBody && ACCESS_BLOCKED_MARKERS.test(rawBody))) {
    return DOWN_REASON.ACCESS_BLOCKED;
  }
  if (httpStatus === 404 || httpStatus === 410) return DOWN_REASON.SOURCE_RETIRED;
  if (transient) return DOWN_REASON.TRANSIENT_FAILURE;
  return DOWN_REASON.TRANSIENT_FAILURE;
}

function classify(r) {
  if (r.error) {
    let errorType = 'unknown';
    if (/timeout after/.test(r.error)) errorType = 'timeout';
    else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(r.error)) errorType = 'dns';
    else if (/ECONNRESET|ECONNREFUSED|ECONNABORTED|EPIPE/i.test(r.error)) errorType = 'connection-reset';
    return { ok: false, why: r.error, errorType, transient: true,
             downReason: downReasonFor({ errorType, transient: true }) };
  }
  if (r.httpStatus !== 200) {
    const errorType = r.httpStatus >= 500 ? 'http-5xx' : r.httpStatus >= 400 ? 'http-4xx' : 'unknown';
    return { ok: false, why: `HTTP ${r.httpStatus}`, errorType, transient: false,
             downReason: downReasonFor({ httpStatus: r.httpStatus, errorType, rawBody: r.raw, transient: false }) };
  }
  if (!r.body) {
    return {
      ok: false,
      why: `non-JSON response (${r.raw.replace(/\s+/g, ' ').slice(0, 80)})`,
      errorType: 'unknown', transient: false, downReason: DOWN_REASON.TRANSIENT_FAILURE,
    };
  }
  if (r.body.error) {
    const e = r.body.error;
    const errorType = (e.code === 499 || e.code === 498) ? 'auth' : 'unknown';
    const downReason = errorType === 'auth' ? DOWN_REASON.ACCESS_BLOCKED : DOWN_REASON.TRANSIENT_FAILURE;
    return { ok: false, why: `ArcGIS error ${e.code ?? '?'}: ${e.message || JSON.stringify(e).slice(0, 80)}`, errorType, transient: false, downReason };
  }
  if (!Array.isArray(r.body.fields)) {
    return { ok: false, why: 'JSON has no field list — not a layer endpoint', errorType: 'unknown', transient: false,
             downReason: DOWN_REASON.SOURCE_RETIRED };
  }
  return { ok: true, name: r.body.name || '(unnamed layer)', fields: r.body.fields.map(f => f.name) };
}

/* Retries only transient (transport-level) failures, exponential backoff
   with jitter so a batch of simultaneously-retried requests doesn't all
   collide on the same schedule. A clean HTTP error or malformed-body result
   returns immediately — see classify()'s `transient` flag. */
async function probeWithRetry(url) {
  let attempt = 0;
  while (true) {
    const r = await probe(url);
    const c = classify(r);
    attempt++;
    if (c.ok || !c.transient || attempt > MAX_RETRIES) {
      return { c, attempts: attempt };
    }
    const backoff = 250 * 2 ** (attempt - 1) + Math.random() * 250;
    await sleep(backoff);
  }
}

function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return { meta: {}, history: {} };
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    return { meta: {}, history: {} };
  }
}

function saveHistory(history) {
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + '\n');
}

/* A jurisdiction failing THIS run is only "confirmed" newly dead (fails the
   build) if it also failed in at least one of its last CONFIRMATION_WINDOW-1
   recorded runs. With no history at all for a FIPS, there's nothing to
   compare against — treated as confirmed immediately (fail-safe: a brand
   new jurisdiction or a probe with history-recording never enabled
   shouldn't get a free pass on a genuine failure). */
function isConfirmedDead(fips, history) {
  const priorRuns = (history.history && history.history[fips]) || [];
  const recentPrior = priorRuns.slice(-(CONFIRMATION_WINDOW - 1));
  if (recentPrior.length === 0) return true;
  const priorFailures = recentPrior.filter(run => !run.ok).length;
  return (priorFailures + 1) >= CONFIRMATION_THRESHOLD;
}

function appendHistory(history, fips, result) {
  if (!history.history) history.history = {};
  if (!history.history[fips]) history.history[fips] = [];
  history.history[fips].push(result);
  if (history.history[fips].length > HISTORY_RUNS_PER_FIPS) {
    history.history[fips] = history.history[fips].slice(-HISTORY_RUNS_PER_FIPS);
  }
}

const args = parseArgs(process.argv.slice(2));

let jurisdictions = (() => {
  try { return loadRegistry(); }
  catch (e) { console.error('FATAL: ' + e.message); process.exit(2); }
})();

if (args.fips) {
  const wanted = new Set(args.fips);
  jurisdictions = jurisdictions.filter(j => wanted.has(j.fips));
  const missing = [...wanted].filter(f => !jurisdictions.some(j => j.fips === f));
  if (missing.length) {
    console.error(`WARNING: --fips requested ${missing.join(', ')} but not found in registry.js`);
  }
}

console.log(`Probing ${jurisdictions.length} parcel service(s) (timeout ${TIMEOUT_MS}ms)` +
  (args.fips ? ` [scoped to: ${args.fips.join(', ')}]` : '') + '\n');

const history = loadHistory();

let bad = 0;
const summary = [];
const recovered = [];
const deadReasons = [];   // raw failure reasons, for the broken-network guard

for (const j of jurisdictions) {
  const { c, attempts } = await probeWithRetry(j.serviceUrl);
  console.log(`── ${j.name}  [FIPS ${j.fips}]`);
  console.log(`   ${j.serviceUrl}`);

  /* A service already recorded as down must not keep failing the run. An
     alert that fires every month on the same known fact stops being read,
     and the next genuinely NEW breakage arrives looking identical to the
     noise. Known outages are reported and pass; anything not on the list
     is checked against recent history before it's allowed to fail the
     build — see isConfirmedDead. Recovery is reported too, so the marker
     gets removed rather than quietly outliving the outage it describes. */
  const known = j.knownUnavailable;
  const attemptsNote = attempts > 1 ? ` (${attempts} attempts)` : '';

  if (!c.ok) {
    if (args.recordHistory) {
      appendHistory(history, j.fips, { timestamp: new Date().toISOString(), ok: false, errorType: c.errorType });
    }

    if (known) {
      console.log(`   STATUS: DEAD — ${c.why}${attemptsNote}  (KNOWN since ${known.since}, not a new failure)\n`);
      summary.push(`DEAD* ${j.fips} ${j.name} — ${c.why} (known since ${known.since})`);
      deadReasons.push(c.why);
    } else if (isConfirmedDead(j.fips, history)) {
      bad++;
      console.log(`   STATUS: DEAD — ${c.why}${attemptsNote}  [${c.errorType}, confirmed across multiple runs]\n`);
      summary.push(`DEAD  ${j.fips} ${j.name} — ${c.why}`);
      deadReasons.push(c.why);
    } else {
      console.log(`   STATUS: DEAD — ${c.why}${attemptsNote}  [${c.errorType}, first failure — not yet confirmed, will fail the build if this repeats]\n`);
      summary.push(`DEAD* ${j.fips} ${j.name} — ${c.why} (first failure, not yet confirmed)`);
      deadReasons.push(c.why);
    }
    continue;
  }

  if (args.recordHistory) {
    appendHistory(history, j.fips, { timestamp: new Date().toISOString(), ok: true, errorType: null });
  }

  if (known) {
    recovered.push(`${j.fips} ${j.name} (was ${known.status} since ${known.since})`);
    console.log(`   RECOVERED — was marked knownUnavailable since ${known.since}; remove that block from registry.js`);
  }

  /* Live. Now check the fieldMap actually lines up with reality — a live
     service with a wrong fieldMap renders shapes and an empty detail panel,
     which looks like a different bug entirely. */
  const have = new Set(c.fields.map(f => f.toUpperCase()));
  const mapped = Object.entries(j.fieldMap || {}).filter(([, v]) => v && v !== '__computed__');
  const missing = mapped.filter(([, v]) => !have.has(String(v).toUpperCase()));

  /* notProvidedBySource records attributes this service genuinely does not
     carry, so they are deliberately absent from fieldMap rather than mapped
     to a guess. Verify the claim rather than trusting it: if the county
     later publishes one, say so, because that is a free upgrade nobody would
     otherwise notice. Matching is by suffix as well as exact name so a
     joined layer's table-qualified fields (GISPROD.VECTOR.CAMADATA.OWNER_CUR)
     still register. */
  const declaredAbsent = j.notProvidedBySource || [];
  const nowAvailable = declaredAbsent.filter(key => {
    const k = key.toUpperCase();
    return c.fields.some(f => {
      const F = f.toUpperCase();
      return F === k || F.endsWith('.' + k);
    });
  });

  console.log(`   STATUS: LIVE — layer "${c.name}", ${c.fields.length} fields${attemptsNote}`);
  if (missing.length) {
    console.log(`   FIELD MAP: ${mapped.length - missing.length}/${mapped.length} resolve; ${missing.length} missing:`);
    for (const [k, v] of missing) console.log(`     - ${k} -> "${v}" not present`);
    /* Print what the layer ACTUALLY exposes. Without this the report says a
       mapping is wrong but not what to replace it with, and the only way to
       repair the fieldMap is to guess — which is precisely how these entries
       became wrong in the first place. */
    console.log(`   ACTUAL FIELDS (${c.fields.length}): ${c.fields.join(', ')}`);
    console.log(`   (shapes will draw; those attributes render blank in the panel)`);
    summary.push(`LIVE  ${j.fips} ${j.name} — ${missing.length}/${mapped.length} fieldMap entries missing`);
  } else {
    console.log(`   FIELD MAP: all ${mapped.length} entries resolve`);
    summary.push(`LIVE  ${j.fips} ${j.name} — OK` +
      (declaredAbsent.length ? ` (${declaredAbsent.length} attributes not carried by this source)` : ''));
  }
  if (declaredAbsent.length) {
    console.log(`   NOT PROVIDED BY SOURCE: ${declaredAbsent.length} attribute(s) declared absent` +
      (nowAvailable.length ? '' : ' — confirmed absent'));
  }
  if (nowAvailable.length) {
    /* Not an error: the data got better. Worth shouting about, because it
       means a real attribute is sitting unused behind a stale exclusion. */
    console.log(`   NOW AVAILABLE: ${nowAvailable.join(', ')} <-- service has gained these; map them and drop from notProvidedBySource`);
  }
  console.log('');
}

if (args.recordHistory) {
  history.meta = {
    description: 'Rolling per-jurisdiction health history for data/check_parcel_services.mjs, ' +
      `capped at the last ${HISTORY_RUNS_PER_FIPS} recorded scheduled/dispatch runs per FIPS. ` +
      'Only written by non-PR-triggered runs (--record-history), so a feature-branch probe can ' +
      'never pollute it. Used to require >=2 failures within a run window before a service is ' +
      'reported as a confirmed new outage rather than a possible transient blip.',
    last_updated: new Date().toISOString(),
  };
  saveHistory(history);
}

console.log('══ SUMMARY ══');
for (const line of summary) console.log('  ' + line);
console.log(`\n${jurisdictions.length - bad}/${jurisdictions.length} services returned a valid layer definition.`);

/* Same safety property as data/check_source_links.py: if EVERY probe failed
   for the same reason, the far more likely explanation is that this runner
   has no usable network (a sandbox proxy answering 403, DNS down, egress
   policy) than that five independent county GIS services died simultaneously.
   Reporting that as "all parcel data is dead" would send someone re-deriving
   five perfectly good URLs. Exit 2 (cannot run) rather than 1 (real failure). */
if (deadReasons.length === jurisdictions.length && jurisdictions.length > 1) {
  const reasons = new Set(deadReasons);
  if (reasons.size === 1) {
    console.log(`\nEVERY probe failed identically ("${[...reasons][0]}").`);
    console.log('That is a broken-network signature, not five dead services — this');
    console.log('runner almost certainly has no outbound access. Treating as');
    console.log('COULD-NOT-RUN rather than reporting every URL dead.');
    process.exit(2);
  }
}

if (recovered.length) {
  console.log('\nRECOVERED — remove the knownUnavailable block for:');
  for (const r of recovered) console.log('  ' + r);
}

if (bad) {
  console.log('\nA DEAD service means that county silently shows no parcels (the UI only');
  console.log('surfaces a generic "Parcel data unavailable — service error" toast).');
  console.log('Re-derive the URL from the county/state GIS portal and update');
  console.log('js/parcel/registry.js. See docs/PARCEL_ADD_JURISDICTION.md.');
}
process.exit(bad ? 1 : 0);
