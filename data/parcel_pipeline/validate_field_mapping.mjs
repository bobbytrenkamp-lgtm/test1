/* data/parcel_pipeline/validate_field_mapping.mjs
 *
 *   node data/parcel_pipeline/validate_field_mapping.mjs <path-to-json>
 *
 * Generalizes the disposable per-county `validate_<county>.mjs` scripts
 * written by hand for roughly a dozen counties this session (Manassas VA,
 * Hennepin MN, Clark NV, San Francisco CA, ...) into one reusable checker:
 * confirms a candidate fieldMap + notProvidedBySource pair covers every one
 * of the 30 canonical fields in js/parcel/schema.js with zero gaps, zero
 * overlaps, and zero unrecognized entries — the exact check every one of
 * those disposable scripts re-implemented from scratch.
 *
 * The input JSON file shape: { "fieldMap": {...}, "notProvidedBySource": [...] }
 * — the same shape data/parcel_pipeline/generate_entry.mjs produces and
 * field_mapper.mjs's `fieldMap`/`notProvidedBySource` output already is.
 */

import { readFileSync } from 'node:fs';
import { loadSchemaFieldIds, loadRequiredSchemaFieldIds } from './lib/load_registry.mjs';

/** Pure function — no file I/O, directly unit-testable. requiredFieldIds is
 * optional (defaults to none checked) — when passed, any required field
 * (today, only parcel_id) that ended up in notProvidedBySource rather than
 * fieldMap is a hard failure, not just an incompleteness: schema.js's own
 * validate() hard-rejects a parcel record with no parcel_id, so an entry
 * missing it isn't "thin," it's non-functional. */
export function validateMapping(fieldMap, notProvidedBySource, canonicalFieldIds, requiredFieldIds = []) {
  const mappedSet = new Set(Object.keys(fieldMap || {}));
  const notProvidedSet = new Set(notProvidedBySource || []);

  const overlap = [...mappedSet].filter(f => notProvidedSet.has(f));
  const union = new Set([...mappedSet, ...notProvidedSet]);
  const missing = canonicalFieldIds.filter(f => !union.has(f));
  const extra = [...union].filter(f => !canonicalFieldIds.includes(f));
  const requiredMissing = requiredFieldIds.filter(f => !mappedSet.has(f));

  return {
    ok: overlap.length === 0 && missing.length === 0 && extra.length === 0 && requiredMissing.length === 0,
    missing,         // canonical fields covered by neither fieldMap nor notProvidedBySource
    extra,           // entries that aren't real canonical field ids at all
    overlap,         // fields claimed as BOTH mapped and confirmed-absent — contradictory
    requiredMissing, // required fields (parcel_id) not actually in fieldMap — a hard failure
  };
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node validate_field_mapping.mjs <path-to-json>');
    process.exit(2);
  }
  const input = JSON.parse(readFileSync(path, 'utf8'));
  const canonicalFieldIds = loadSchemaFieldIds();
  const requiredFieldIds = loadRequiredSchemaFieldIds();
  const result = validateMapping(input.fieldMap, input.notProvidedBySource, canonicalFieldIds, requiredFieldIds);

  console.log(`Canonical fields: ${canonicalFieldIds.length}`);
  console.log(`Mapped: ${Object.keys(input.fieldMap || {}).length}, ` +
    `notProvidedBySource: ${(input.notProvidedBySource || []).length}`);
  if (result.missing.length) console.log(`Missing (in neither list): ${result.missing.join(', ')}`);
  if (result.extra.length) console.log(`Extra (not a real canonical field): ${result.extra.join(', ')}`);
  if (result.overlap.length) console.log(`Overlap (in both lists): ${result.overlap.join(', ')}`);
  if (result.requiredMissing.length) {
    console.log(`REQUIRED field(s) not actually mapped (hard failure): ${result.requiredMissing.join(', ')}`);
  }

  console.log(result.ok ? 'PASS' : 'FAIL');
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
