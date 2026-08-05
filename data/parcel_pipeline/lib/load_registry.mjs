/* data/parcel_pipeline/lib/load_registry.mjs — shared registry/schema loader.
 *
 * js/parcel/registry.js and js/parcel/schema.js are classic scripts that
 * assign to `window` (they run in the browser with no bundler). Every
 * Node-side tool that needs the real, shipped data — not a hand-copied
 * duplicate that can drift — loads them the same way
 * data/check_parcel_services.mjs already established: give the file a fake
 * `window` to assign to, then read the result back off it.
 *
 * Centralized here so the pipeline scripts (seed_catalog_from_registry.mjs,
 * extract_field_synonyms.mjs, check_registry_integrity.mjs, changed_fips.mjs)
 * share one implementation instead of three near-identical copies.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const REGISTRY_PATH = join(ROOT, 'js/parcel/registry.js');
export const SCHEMA_PATH = join(ROOT, 'js/parcel/schema.js');

function loadWindowScript(path, globalName) {
  const src = readFileSync(path, 'utf8');
  const sandboxWindow = {};
  new Function('window', src)(sandboxWindow);
  const value = sandboxWindow[globalName];
  if (!value) {
    throw new Error(`${path} did not define window.${globalName}`);
  }
  return value;
}

/** Returns the live window.PARCEL_REGISTRY object ({ get, has, all, JURISDICTIONS }). */
export function loadRegistry() {
  const reg = loadWindowScript(REGISTRY_PATH, 'PARCEL_REGISTRY');
  if (typeof reg.all !== 'function') {
    throw new Error('registry.js did not define window.PARCEL_REGISTRY.all()');
  }
  return reg;
}

/** Raw registry.js source text, for diff/line-range based tooling. */
export function loadRegistrySource() {
  return readFileSync(REGISTRY_PATH, 'utf8');
}

/** Returns the 30 canonical field ids from js/parcel/schema.js, in declared order. */
export function loadSchemaFieldIds() {
  const schema = loadWindowScript(SCHEMA_PATH, 'PARCEL_SCHEMA');
  if (!Array.isArray(schema.FIELDS)) {
    throw new Error('schema.js did not define window.PARCEL_SCHEMA.FIELDS');
  }
  return schema.FIELDS.map(f => f.id);
}

/** Returns the canonical field ids schema.js marks required: true (today,
 * only parcel_id — schema.js's own validate() hard-fails without it). */
export function loadRequiredSchemaFieldIds() {
  const schema = loadWindowScript(SCHEMA_PATH, 'PARCEL_SCHEMA');
  if (!Array.isArray(schema.FIELDS)) {
    throw new Error('schema.js did not define window.PARCEL_SCHEMA.FIELDS');
  }
  return schema.FIELDS.filter(f => f.required).map(f => f.id);
}
