/* data/check_parcel_services.mjs — probe every parcel service in the registry.
 *
 *   node data/check_parcel_services.mjs
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
 * Exit codes: 0 = no NEW failures (live services, plus any already recorded
 *                 in registry.js as knownUnavailable).
 *             1 = a service failed that is not already known-dead.
 *             2 = could not run at all (registry failed to load, or every
 *                 probe failed identically = this runner has no network).
 *
 * A service already recorded as down does not fail the run. An alert that
 * fires monthly on the same known fact stops being read, and the next real
 * breakage then looks exactly like the noise.
 * Network is required, so this cannot run in a sandbox — it is meant for CI
 * or a developer machine. See .github/workflows/check_parcel_services.yml.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 20000);

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
  }
}

/* ArcGIS returns HTTP 200 with an {"error":{...}} envelope for a bad service
   ID, so the status code alone proves nothing — the body has to be read. */
function classify(r) {
  if (r.error)                      return { ok: false, why: r.error };
  if (r.httpStatus !== 200)         return { ok: false, why: `HTTP ${r.httpStatus}` };
  if (!r.body)                      return { ok: false, why: `non-JSON response (${r.raw.replace(/\s+/g, ' ').slice(0, 80)})` };
  if (r.body.error) {
    const e = r.body.error;
    return { ok: false, why: `ArcGIS error ${e.code ?? '?'}: ${e.message || JSON.stringify(e).slice(0, 80)}` };
  }
  if (!Array.isArray(r.body.fields)) return { ok: false, why: 'JSON has no field list — not a layer endpoint' };
  return { ok: true, name: r.body.name || '(unnamed layer)', fields: r.body.fields.map(f => f.name) };
}

const jurisdictions = (() => {
  try { return loadRegistry(); }
  catch (e) { console.error('FATAL: ' + e.message); process.exit(2); }
})();

console.log(`Probing ${jurisdictions.length} parcel services (timeout ${TIMEOUT_MS}ms)\n`);

let bad = 0;
const summary = [];
const recovered = [];
const deadReasons = [];   // raw failure reasons, for the broken-network guard

for (const j of jurisdictions) {
  const res = await probe(j.serviceUrl);
  const c = classify(res);
  console.log(`── ${j.name}  [FIPS ${j.fips}]`);
  console.log(`   ${j.serviceUrl}`);

  /* A service already recorded as down must not keep failing the run. An
     alert that fires every month on the same known fact stops being read,
     and the next genuinely NEW breakage arrives looking identical to the
     noise. Known outages are reported and pass; anything not on the list
     fails. Recovery is reported too, so the marker gets removed rather than
     quietly outliving the outage it describes. */
  const known = j.knownUnavailable;

  if (!c.ok) {
    if (known) {
      console.log(`   STATUS: DEAD — ${c.why}  (KNOWN since ${known.since}, not a new failure)\n`);
      summary.push(`DEAD* ${j.fips} ${j.name} — ${c.why} (known since ${known.since})`);
      deadReasons.push(c.why);
    } else {
      bad++;
      console.log(`   STATUS: DEAD — ${c.why}\n`);
      summary.push(`DEAD  ${j.fips} ${j.name} — ${c.why}`);
      deadReasons.push(c.why);
    }
    continue;
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

  console.log(`   STATUS: LIVE — layer "${c.name}", ${c.fields.length} fields`);
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
