/* data/parcel_pipeline/check_registry_integrity.mjs
 *
 *   node data/parcel_pipeline/check_registry_integrity.mjs
 *
 * Fast, no-network structural checks on js/parcel/registry.js, meant to run
 * on every PR that touches the registry (unlike data/check_parcel_services.mjs,
 * which needs live network access and is scoped separately). Catches the
 * class of mistake a live-service probe can't: a copy-pasted entry left
 * under the wrong FIPS key, a duplicate FIPS silently overwriting an
 * earlier entry (JS object literals allow this with no error), or an
 * unrecognized connector type.
 *
 * ALLOWED_CONNECTORS is intentionally kept here as its own explicit list
 * rather than imported from anywhere, and cross-linked by comment with
 * tests/parcel.test.js's `['arcgis', 'geojson', 'wfs'].includes(cfg.connector)`
 * assertion (~line 508) -- the two must be updated together whenever a new
 * connector type ships, or entries using it will pass this check yet fail
 * that one (or vice versa).
 *
 * Exit codes: 0 = clean, 1 = one or more integrity problems found.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY_PATH, loadRegistry } from './lib/load_registry.mjs';
import { LICENSE_STATUSES } from './classify_licensing.mjs';

// Keep in sync with tests/parcel.test.js's connector-enum assertion.
const ALLOWED_CONNECTORS = ['arcgis', 'geojson', 'wfs'];

const COMMERCIAL_USE_STATUSES = ['permitted', 'restricted', 'unknown'];
const CONFIDENCE_LEVELS = ['high', 'medium', 'none'];

// Keep in sync with data/policy_pipeline/models.py's
// REPLACEMENT_HISTORY_REQUIRED_KEYS -- one Python side, one JS side, same
// shape, since a replaced serviceUrl on a parcel entry and a replaced url
// on a policy source are the same kind of provenance record.
const REPLACEMENT_HISTORY_REQUIRED_KEYS = ['old_value', 'new_value', 'changed_at', 'reason', 'verified_via'];

// Pure and exported so tests/test_parcel_registry_integrity.mjs can exercise
// every branch (missing keys, non-array, empty/undefined) against synthetic
// fixtures without needing a real registry.js entry to carry the field yet.
export function validateReplacementHistory(entries) {
  const problems = [];
  if (!Array.isArray(entries)) {
    return [`replacementHistory must be an array, got ${typeof entries}`];
  }
  entries.forEach((rec, i) => {
    const missing = REPLACEMENT_HISTORY_REQUIRED_KEYS.filter(k => !(k in (rec || {})));
    if (missing.length) {
      problems.push(`replacementHistory[${i}] missing keys: ${JSON.stringify(missing)}`);
    }
  });
  return problems;
}

// Pure and exported, same rationale as validateReplacementHistory above.
// Structured licensing fields are optional at the schema level -- an entry
// with none of them is not an error, just not yet classified by
// classify_licensing.mjs. A partially-shaped one (an invalid enum value,
// or a strong RESTRICTED/NONCOMMERCIAL claim with no evidence backing it)
// is a real integrity problem worth catching at PR time.
export function validateLicenseFields(attribution) {
  const problems = [];
  if (attribution.license_status === undefined) return problems;

  if (!LICENSE_STATUSES.includes(attribution.license_status)) {
    problems.push(`license_status '${attribution.license_status}' not in ${JSON.stringify(LICENSE_STATUSES)}`);
  }
  if (attribution.commercial_use_status !== undefined
      && !COMMERCIAL_USE_STATUSES.includes(attribution.commercial_use_status)) {
    problems.push(`commercial_use_status '${attribution.commercial_use_status}' not in `
      + `${JSON.stringify(COMMERCIAL_USE_STATUSES)}`);
  }
  if (attribution.redistribution_status !== undefined
      && !COMMERCIAL_USE_STATUSES.includes(attribution.redistribution_status)) {
    problems.push(`redistribution_status '${attribution.redistribution_status}' not in `
      + `${JSON.stringify(COMMERCIAL_USE_STATUSES)}`);
  }
  if (attribution.confidence_level !== undefined
      && !CONFIDENCE_LEVELS.includes(attribution.confidence_level)) {
    problems.push(`confidence_level '${attribution.confidence_level}' not in ${JSON.stringify(CONFIDENCE_LEVELS)}`);
  }
  if (attribution.attribution_required !== undefined
      && attribution.attribution_required !== null
      && typeof attribution.attribution_required !== 'boolean') {
    problems.push('attribution_required must be true, false, or null');
  }
  // A RESTRICTED or NONCOMMERCIAL claim is a strong, actionable fact -- it
  // must be backed by real evidence text (the free-text license field),
  // never asserted with nothing behind it. UNKNOWN/TERMS_UNCLEAR have no
  // such requirement since they represent honest absence of evidence, not
  // a claim.
  if (['RESTRICTED', 'NONCOMMERCIAL'].includes(attribution.license_status)
      && !(typeof attribution.license === 'string' && attribution.license.length > 20)) {
    problems.push(`license_status '${attribution.license_status}' has no supporting evidence text in attribution.license`);
  }
  return problems;
}

/* Loads the browser-side enrichment validator so a jurisdiction's
   `enrichment` block is checked by the SAME code that will execute it at
   runtime, rather than by a second, drifting reimplementation here. Both
   files are window-global IIFEs, so they need a minimal shim to require().

   Returns null if the modules can't be loaded, in which case enrichment
   validation is skipped rather than failing the whole integrity check --
   this script's original duties (duplicate FIPS, connector enum, key
   mismatches) must keep working regardless. */
function loadEnrichmentValidator() {
  try {
    const require = createRequire(import.meta.url);
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    if (!globalThis.window) globalThis.window = globalThis;
    require(join(ROOT, 'js/parcel/schema.js'));
    require(join(ROOT, 'js/parcel/provenance.js'));
    require(join(ROOT, 'js/parcel/enrichment.js'));
    return globalThis.window.PARCEL_ENRICHMENT || null;
  } catch {
    return null;
  }
}

function findDuplicateKeyLines(source) {
  const seen = new Map(); // fips -> first line number
  const dupes = [];
  const lines = source.split('\n');
  const keyLineRe = /^\s*'(\d{5})':\s*\{/;
  lines.forEach((line, idx) => {
    const m = keyLineRe.exec(line);
    if (!m) return;
    const fips = m[1];
    if (seen.has(fips)) {
      dupes.push({ fips, firstLine: seen.get(fips), duplicateLine: idx + 1 });
    } else {
      seen.set(fips, idx + 1);
    }
  });
  return dupes;
}

function main() {
  const problems = [];

  const source = readFileSync(REGISTRY_PATH, 'utf8');
  const dupes = findDuplicateKeyLines(source);
  for (const d of dupes) {
    problems.push(
      `Duplicate FIPS key '${d.fips}': first defined at line ${d.firstLine}, ` +
      `duplicated at line ${d.duplicateLine}. JavaScript object literals silently ` +
      `let the later one win -- one of these two entries is being ignored entirely.`
    );
  }

  let registry;
  try {
    registry = loadRegistry();
  } catch (e) {
    console.error(`FATAL: could not load js/parcel/registry.js: ${e.message}`);
    process.exit(1);
  }

  for (const entry of registry.all()) {
    if (!entry.id) problems.push(`FIPS ${entry.fips}: missing or empty 'id'`);
    if (!entry.name) problems.push(`FIPS ${entry.fips}: missing or empty 'name'`);
    if (!entry.serviceUrl) problems.push(`FIPS ${entry.fips}: missing or empty 'serviceUrl'`);
    if (!ALLOWED_CONNECTORS.includes(entry.connector)) {
      problems.push(
        `FIPS ${entry.fips}: connector '${entry.connector}' is not in the allowed set ` +
        `${JSON.stringify(ALLOWED_CONNECTORS)} -- if this is a genuine new connector type, ` +
        `update ALLOWED_CONNECTORS here AND the matching assertion in tests/parcel.test.js together.`
      );
    }
    if (!/^\d{5}$/.test(String(entry.fips))) {
      problems.push(`FIPS ${entry.fips}: not a valid 5-digit FIPS string`);
    }
    // Optional, additive field -- most entries have never had their
    // serviceUrl repointed and carry none of this. When present, though,
    // each entry must be a real provenance record, not a partial one that
    // would leave "why was this changed" unanswerable later.
    if (entry.replacementHistory !== undefined) {
      for (const p of validateReplacementHistory(entry.replacementHistory)) {
        problems.push(`FIPS ${entry.fips}: ${p}`);
      }
    }

    for (const p of validateLicenseFields(entry.attribution || {})) {
      problems.push(`FIPS ${entry.fips}: ${p}`);
    }
  }

  /* Multi-source enrichment blocks. A bad join configuration is exactly the
     kind of defect that produces confidently-wrong parcel data rather than
     an obvious failure -- a join on the wrong column silently attributes one
     property's assessment to another -- so it has to fail at PR time, not at
     render time in a user's browser. */
  const enrichmentValidator = loadEnrichmentValidator();
  if (enrichmentValidator) {
    for (const entry of registry.all()) {
      if (!entry.enrichment) continue;
      const { valid, errors } = enrichmentValidator.validateConfig(entry.enrichment);
      if (!valid) {
        for (const err of errors) {
          problems.push(`FIPS ${entry.fips}: invalid enrichment config -- ${err}`);
        }
      }
      for (const source of (entry.enrichment.sources || [])) {
        if (source.baseField && !entry.fieldMap?.[source.baseField] && source.baseField !== 'county_fips') {
          problems.push(
            `FIPS ${entry.fips}: enrichment source '${source.id}' joins from base field ` +
            `'${source.baseField}', which this jurisdiction's own fieldMap does not populate -- ` +
            `the join key would always be empty.`
          );
        }
      }
    }
  }

  // Every registry.all() entry's own `fips` field must match the object key
  // it's actually stored under -- checked via has()/get() round-trip rather
  // than re-parsing the source, since JURISDICTIONS is keyed by that exact
  // string already.
  for (const entry of registry.all()) {
    if (!registry.has(entry.fips)) {
      problems.push(`FIPS ${entry.fips}: entry.fips does not match its own object key`);
      continue;
    }
    if (registry.get(entry.fips) !== entry) {
      problems.push(`FIPS ${entry.fips}: get(fips) does not return this exact entry -- key mismatch`);
    }
  }

  if (problems.length) {
    console.log(`${problems.length} registry integrity problem(s) found:\n`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }

  console.log(`OK -- ${registry.all().length} jurisdictions, no integrity problems found.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
