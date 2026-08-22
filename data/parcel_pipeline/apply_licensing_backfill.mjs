/* data/parcel_pipeline/apply_licensing_backfill.mjs (ONE-TIME migration script)
 *
 *   node data/parcel_pipeline/apply_licensing_backfill.mjs [--dry-run]
 *
 * Inserts the structured license_status/commercial_use_status/
 * redistribution_status/attribution_required/confidence_level fields
 * (computed by classify_licensing.mjs) into every attribution object in
 * js/parcel/registry.js, immediately after its existing `license:` field
 * and before `note:`.
 *
 * SAFETY: confirmed via direct inspection that all 60 `license:` fields in
 * the file are immediately followed by `note:` with nothing in between
 * (100% structurally regular) -- this script relies on that regularity
 * rather than a general JS parser. It locates each `license: <string>,`
 * span with a regex that correctly respects backslash-escaped quotes
 * inside the string literal, evaluates that literal with Node itself
 * (so escaping is handled exactly the way the JS engine would, not by a
 * hand-rolled unescaper), and matches it against each registry entry's
 * already-loaded `attribution.license` string to find which FIPS it
 * belongs to -- this does NOT assume file source order matches
 * registry.all() iteration order (integer-like string keys like FIPS
 * codes get reordered by the JS engine in for-in/Object.keys, so the two
 * orders are not guaranteed to match).
 *
 * Run tests/parcel.test.js and data/parcel_pipeline/check_registry_integrity.mjs
 * immediately after this runs -- if either fails, revert with
 * `git checkout -- js/parcel/registry.js` rather than hand-patching the
 * output.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { REGISTRY_PATH, loadRegistry } from './lib/load_registry.mjs';
import { classifyLicenseText } from './classify_licensing.mjs';

const LICENSE_RE = /license:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,/g;

function evalStringLiteral(literal) {
  // eslint-disable-next-line no-new-func
  return new Function(`return (${literal});`)();
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const registry = loadRegistry();
  const byLicenseText = new Map();
  for (const entry of registry.all()) {
    const license = entry.attribution && entry.attribution.license;
    if (typeof license === 'string') {
      if (byLicenseText.has(license)) {
        throw new Error(`Two entries share an identical license string -- cannot disambiguate by text `
          + `(FIPS ${byLicenseText.get(license).fips} and ${entry.fips}). Aborting, no changes made.`);
      }
      byLicenseText.set(license, entry);
    }
  }

  const source = readFileSync(REGISTRY_PATH, 'utf8');
  const matches = [...source.matchAll(LICENSE_RE)];
  console.log(`Found ${matches.length} license: fields in the source file; `
    + `${registry.all().length} entries loaded via loadRegistry().`);

  let cursor = 0;
  let out = '';
  let applied = 0;
  let skipped = 0;

  for (const m of matches) {
    const literalText = m[1];
    const licenseValue = evalStringLiteral(literalText);
    const entry = byLicenseText.get(licenseValue);
    out += source.slice(cursor, m.index + m[0].length);
    cursor = m.index + m[0].length;

    if (!entry) {
      console.log(`  WARNING: no registry entry matched a license: field at offset ${m.index} -- leaving untouched.`);
      skipped++;
      continue;
    }
    if (entry.attribution.license_status !== undefined) {
      skipped++;
      continue; // already classified -- idempotent re-run
    }

    const cls = classifyLicenseText(licenseValue);
    const indent = '        '; // matches this file's existing 8-space attribution-field indent
    const lines = [
      `${indent}license_status: '${cls.license_status}',`,
      `${indent}commercial_use_status: '${cls.commercial_use_status}',`,
      `${indent}redistribution_status: '${cls.redistribution_status}',`,
      `${indent}attribution_required: ${cls.attribution_required === null ? 'null' : cls.attribution_required},`,
      `${indent}confidence_level: '${cls.confidence_level}',`,
      `${indent}reviewed_date: '2026-08-19',`,
    ];
    out += '\n' + lines.join('\n');
    applied++;
  }
  out += source.slice(cursor);

  console.log(`Applied structured license fields to ${applied} entries; ${skipped} skipped `
    + `(already classified or unmatched).`);

  if (dryRun) {
    console.log('--dry-run: not writing.');
    return;
  }
  if (applied === 0) {
    console.log('Nothing to write.');
    return;
  }
  writeFileSync(REGISTRY_PATH, out);
  console.log(`Wrote ${REGISTRY_PATH}. Run tests/parcel.test.js and check_registry_integrity.mjs now.`);
}

main();
