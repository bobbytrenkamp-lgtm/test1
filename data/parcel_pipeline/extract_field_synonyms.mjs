/* data/parcel_pipeline/extract_field_synonyms.mjs
 *
 *   node data/parcel_pipeline/extract_field_synonyms.mjs
 *
 * Generates data/parcel_field_synonyms.json — the exact-match synonym seed
 * corpus for a future field-mapper — by walking every fieldMap already in
 * js/parcel/registry.js. This is a SEED CORPUS ONLY: an exact-match
 * dictionary of source attribute names that have already been verified (by
 * a human, against a real sample record) to mean a given canonical field.
 * No matching/inference logic lives here or is implied by this file —
 * that's Phase 2's field_mapper.mjs, which doesn't exist yet.
 *
 * Committed output, not regenerated at CI/runtime — re-run this by hand
 * (or via a --check mode in a future PR) whenever registry.js gains a new
 * verified mapping, so the corpus grows alongside real, human-verified
 * additions rather than silently drifting out of sync.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadRegistry } from './lib/load_registry.mjs';

const OUTPUT_PATH = join(ROOT, 'data/parcel_field_synonyms.json');

function main() {
  const registry = loadRegistry();
  const synonyms = {};

  for (const entry of registry.all()) {
    for (const [canonical, source] of Object.entries(entry.fieldMap || {})) {
      if (!source || source === '__computed__') continue;
      const name = String(source).toUpperCase();
      if (!synonyms[canonical]) synonyms[canonical] = new Map();
      const bucket = synonyms[canonical];
      if (!bucket.has(name)) bucket.set(name, new Set());
      bucket.get(name).add(entry.fips);
    }
  }

  const output = {
    meta: {
      description: 'Exact-match seed corpus of verified source-field-name -> canonical-field synonyms, ' +
        'extracted from every fieldMap in js/parcel/registry.js. Every entry here has been human-verified ' +
        'against a real live service, not inferred. Consumed by a future tiered field-mapper (Phase 2) as ' +
        'its first, highest-confidence resolution tier, before normalized-name matching or sample-value ' +
        'inspection are attempted.',
      generated_by: 'data/parcel_pipeline/extract_field_synonyms.mjs',
      generated_from: 'js/parcel/registry.js',
      last_regenerated: new Date().toISOString().slice(0, 10),
    },
    synonyms: {},
  };

  for (const canonical of Object.keys(synonyms).sort()) {
    const bucket = synonyms[canonical];
    output.synonyms[canonical] = [...bucket.entries()]
      .map(([name, fipsSet]) => ({ name, seen_in: [...fipsSet].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');

  const totalSynonyms = Object.values(output.synonyms).reduce((n, list) => n + list.length, 0);
  console.log(`Wrote ${Object.keys(output.synonyms).length} canonical fields, ${totalSynonyms} distinct synonyms to ${OUTPUT_PATH}`);
}

main();
