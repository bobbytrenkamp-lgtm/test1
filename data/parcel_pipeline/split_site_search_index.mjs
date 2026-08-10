#!/usr/bin/env node
/* data/parcel_pipeline/split_site_search_index.mjs — splits the monolithic
 * data/site_search_index.json (42MB+, 86,811 parcels, one file) into
 * data/site_search/manifest.json + one file per state under
 * data/site_search/states/<ST>.json.
 *
 * WHY
 * js/parcel/find-sites.js's national search (runSearchNational) used to
 * fetch data/site_search_index.json in full on every national search --
 * even a single-state "just Virginia" search downloaded all 86,811 parcels
 * across every wired jurisdiction. This mirrors the exact precedent
 * data/split_sample_layers.py already established for
 * data/sample_layers.json in the PR #470 performance pass: keep the
 * canonical monolithic file as the single build artifact
 * (build_national_site_index.mjs writes it, unchanged), and derive a
 * committed, freshness-checked split from it. STORE EVERYTHING (both the
 * canonical file and the split stay committed) -- only what the BROWSER
 * fetches changes.
 *
 * PARTITION KEY: state
 * Every parcel record already carries `properties.state` (a 2-letter USPS
 * abbreviation -- confirmed via direct inspection of the committed index,
 * not assumed) because build_national_site_index.mjs's normalizeFeature()
 * stamps it from the jurisdiction's own registry entry. A parcel with no
 * state recorded (should not happen given the above, but handled rather
 * than assumed impossible) goes into a synthetic "UNKNOWN" bucket -- routed,
 * never dropped.
 *
 * fips -> state comes from js/parcel/registry.js itself (via
 * lib/load_registry.mjs), not from the parcels array, so a jurisdiction
 * that is registered but contributed zero index records this run (a
 * size-filtered county with genuinely no large parcels, or a jurisdiction
 * that failed this build) still gets attributed to the correct state in
 * the manifest's per-state jurisdiction accounting -- deriving the mapping
 * from parcels alone would silently under-report jurisdiction coverage for
 * any county with zero matching records.
 *
 * MANIFEST STAYS TINY
 * jurisdiction_summaries (58 short records) is small regardless of parcel
 * count and is copied into the manifest verbatim, so callers that want the
 * old full per-jurisdiction detail (sizeFiltered, truncated, error) still
 * have it without a second fetch. Only `parcels` (the genuinely large part)
 * is split out.
 *
 * Usage:
 *   node data/parcel_pipeline/split_site_search_index.mjs
 *   node data/parcel_pipeline/split_site_search_index.mjs --check
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, loadRegistry } from './lib/load_registry.mjs';

export const SOURCE_PATH = join(ROOT, 'data/site_search_index.json');
export const OUTPUT_DIR = join(ROOT, 'data/site_search');
export const MANIFEST_PATH = join(OUTPUT_DIR, 'manifest.json');
export const STATES_DIR = join(OUTPUT_DIR, 'states');

const UNKNOWN_STATE = 'UNKNOWN';

function sha256(text) {
  return 'sha256:' + createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** Pure: js/parcel/registry.js jurisdictions -> { fips: state } (uppercase). */
export function buildFipsToState(jurisdictions) {
  const map = {};
  for (const j of (jurisdictions || [])) {
    if (j && j.fips && j.state) map[j.fips] = String(j.state).toUpperCase();
  }
  return map;
}

/** Pure: splits one index's parcels into per-state buckets, in stable
 * (first-seen) state order, and builds the manifest describing them.
 * Never drops a parcel or a jurisdiction summary -- every input record is
 * attributable in the output. Takes fipsToState as an explicit argument
 * (rather than loading the registry itself) so this is unit-testable with
 * a synthetic fixture, matching every other pure-function-plus-thin-CLI
 * script in this directory. */
export function partitionByState(index, fipsToState) {
  const meta = index.meta || {};
  const jurisdictionSummaries = index.jurisdiction_summaries || [];
  const parcels = index.parcels || [];

  const buckets = new Map(); // state -> parcels[]
  let unattributedParcels = 0;
  for (const p of parcels) {
    const raw = p && p.properties && p.properties.state;
    const state = raw ? String(raw).toUpperCase() : UNKNOWN_STATE;
    if (state === UNKNOWN_STATE) unattributedParcels++;
    if (!buckets.has(state)) buckets.set(state, []);
    buckets.get(state).push(p);
  }

  // Every jurisdiction (ok or failed) attributed to its state, even one that
  // contributed zero parcels this run -- otherwise a size-filtered county
  // with a real zero-large-parcel result, or a failed jurisdiction, would
  // silently vanish from that state's coverage accounting.
  const summariesByState = new Map(); // state -> summaries[]
  const unattributedJurisdictions = [];
  for (const s of jurisdictionSummaries) {
    const state = fipsToState[s.fips];
    if (!state) { unattributedJurisdictions.push(s); continue; }
    if (!buckets.has(state)) buckets.set(state, []); // e.g. a state with only a failed/empty jurisdiction
    if (!summariesByState.has(state)) summariesByState.set(state, []);
    summariesByState.get(state).push(s);
  }

  const states = {};
  const partitions = {};
  for (const state of [...buckets.keys()].sort()) {
    const stateParcels = buckets.get(state) || [];
    const summaries = summariesByState.get(state) || [];
    const ok = summaries.filter(s => s.status === 'ok');
    const failed = summaries.filter(s => s.status === 'failed');

    const partition = {
      state,
      source_generated_at: meta.generated_at || null,
      record_count: stateParcels.length,
      parcels: stateParcels,
    };
    partitions[state] = partition;

    const partitionJson = JSON.stringify(partition, null, 2) + '\n';
    states[state] = {
      file: `states/${state}.json`,
      record_count: stateParcels.length,
      byte_size: Buffer.byteLength(partitionJson, 'utf8'),
      checksum: sha256(partitionJson),
      jurisdiction_count: ok.length,
      supported_fips: ok.map(s => s.fips).sort(),
      size_filtered_fips: ok.filter(s => s.sizeFiltered).map(s => s.fips).sort(),
      unfiltered_sample_fips: ok.filter(s => !s.sizeFiltered).map(s => s.fips).sort(),
      truncated_fips: ok.filter(s => s.truncated).map(s => s.fips).sort(),
      failed_fips: failed.map(s => s.fips).sort(),
    };
  }

  const manifest = {
    // Deliberately no "when this split ran" timestamp -- see
    // generate_coverage_metrics.mjs's identical rationale: it would make
    // --check fail on every run for no real change. version is instead the
    // SOURCE index's own generated_at, which only changes when
    // build_national_site_index.mjs actually rebuilds the data.
    version: meta.generated_at || null,
    source_generated_at: meta.generated_at || null,
    threshold_acres: meta.threshold_acres ?? null,
    total_parcels: parcels.length,
    total_states: Object.keys(states).length,
    jurisdictions_attempted: meta.jurisdictions_attempted ?? null,
    jurisdictions_ok: meta.jurisdictions_ok ?? null,
    jurisdictions_failed: meta.jurisdictions_failed ?? null,
    caveat: meta.caveat || null,
    known_limitations: {
      unattributed_parcels: unattributedParcels,
      unattributed_jurisdictions: unattributedJurisdictions.map(s => ({ fips: s.fips, name: s.name })),
    },
    // Small (currently 58 records) regardless of parcel volume -- kept in
    // full so a caller that wants old-style per-jurisdiction detail
    // (sizeFiltered/truncated/error) never needs a second fetch.
    jurisdiction_summaries: jurisdictionSummaries,
    states,
  };

  return { manifest, partitions };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeIfChanged(path, content, dryRunDiffs) {
  let current = null;
  try { current = readFileSync(path, 'utf8'); } catch { /* missing is fine */ }
  if (current === content) return false;
  if (dryRunDiffs) { dryRunDiffs.push(path); return true; }
  writeFileSync(path, content);
  return true;
}

function main() {
  const check = process.argv.includes('--check');

  const index = readJson(SOURCE_PATH);
  const fipsToState = buildFipsToState(loadRegistry().all());
  const { manifest, partitions } = partitionByState(index, fipsToState);

  const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
  const partitionJsons = {};
  for (const [state, partition] of Object.entries(partitions)) {
    partitionJsons[state] = JSON.stringify(partition, null, 2) + '\n';
  }

  if (check) {
    const stale = [];
    try {
      if (readFileSync(MANIFEST_PATH, 'utf8') !== manifestJson) stale.push('data/site_search/manifest.json');
    } catch { stale.push('data/site_search/manifest.json (missing)'); }

    for (const [state, json] of Object.entries(partitionJsons)) {
      const path = join(STATES_DIR, `${state}.json`);
      try {
        if (readFileSync(path, 'utf8') !== json) stale.push(`data/site_search/states/${state}.json`);
      } catch { stale.push(`data/site_search/states/${state}.json (missing)`); }
    }

    // An orphaned partition file (a state present on disk but no longer
    // produced -- e.g. its only jurisdiction was removed from the
    // registry) is also staleness: a browser would fetch it for nothing,
    // or worse, a stale search could still "cover" a state that dropped
    // out of the real index.
    let onDisk = [];
    try { onDisk = readdirSync(STATES_DIR).filter(f => f.endsWith('.json')); } catch { /* no dir yet */ }
    for (const f of onDisk) {
      const state = f.replace(/\.json$/, '');
      if (!partitionJsons[state]) stale.push(`data/site_search/states/${f} (orphaned)`);
    }

    if (stale.length) {
      console.error('National site index split is stale:\n' + stale.map(s => `  - ${s}`).join('\n'));
      console.error('\nRun: node data/parcel_pipeline/split_site_search_index.mjs');
      process.exit(1);
    }
    console.log(`OK -- split matches ${SOURCE_PATH} (${manifest.total_states} states, ${manifest.total_parcels} parcels).`);
    return;
  }

  if (!existsSync(STATES_DIR)) mkdirSync(STATES_DIR, { recursive: true });
  writeIfChanged(MANIFEST_PATH, manifestJson);
  for (const [state, json] of Object.entries(partitionJsons)) {
    writeIfChanged(join(STATES_DIR, `${state}.json`), json);
  }

  // Remove orphaned partition files so a stale state doesn't linger as a
  // fetchable-but-wrong file after a jurisdiction leaves the registry.
  let onDisk = [];
  try { onDisk = readdirSync(STATES_DIR).filter(f => f.endsWith('.json')); } catch { /* no dir yet */ }
  for (const f of onDisk) {
    const state = f.replace(/\.json$/, '');
    if (!partitionJsons[state]) {
      unlinkSync(join(STATES_DIR, f));
      console.log(`Removed orphaned partition: data/site_search/states/${f}`);
    }
  }

  console.log(`Wrote data/site_search/manifest.json (${manifest.total_states} states, ${manifest.total_parcels} parcels)`);
  for (const [state, entry] of Object.entries(manifest.states)) {
    console.log(`  ${state}: ${entry.record_count} parcel(s), ${(entry.byte_size / 1024).toFixed(1)} KB`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
