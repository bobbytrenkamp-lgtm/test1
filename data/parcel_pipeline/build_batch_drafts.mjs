#!/usr/bin/env node
/* data/parcel_pipeline/build_batch_drafts.mjs
 *
 *   node data/parcel_pipeline/build_batch_drafts.mjs --results <run-dir> [--fips <csv>] [--min-band marginal]
 *
 * Turns a discover_batch.mjs run's output (data/parcel_pipeline/output/<run-id>/)
 * into human-reviewable draft registry.js entries, reusing generate_entry.mjs's
 * exact `buildDraft()` — the same draft format a human has been reviewing all
 * session, just fed from a batch run's best candidate per jurisdiction instead
 * of a single hand-invoked candidate.
 *
 * THIS SCRIPT NEVER WRITES TO js/parcel/registry.js OR data/parcel_source_
 * catalog.json. It only writes to data/parcel_pipeline/drafts/<fips>.js, same
 * as generate_entry.mjs. Promotion is promote_batch.mjs's job, and that tool
 * has its own, stricter safety gates -- a draft being generated here is NOT
 * an endorsement that the candidate is ready to promote.
 *
 * For each target in the run:
 *   - skipped-already-covered / failed / no candidates -> skipped, reason printed
 *   - best candidate rejected (scoring.mjs hard-reject) -> skipped, reason printed
 *   - best candidate's band is below --min-band (default: marginal) -> skipped
 *   - otherwise: draft written, with a summary of open requiresReview items
 *     printed so a human knows exactly what's left before this is promotable
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/load_registry.mjs';
import { buildDraft } from './generate_entry.mjs';

const DRAFTS_DIR = join(ROOT, 'data', 'parcel_pipeline', 'drafts');

// Matches scoring.mjs's BANDS order (best judgement: a batch draft run
// shouldn't produce paperwork for weak candidates by default -- a human can
// still explicitly override with --min-band weak to see everything).
const BAND_RANK = { strong: 3, good: 2, marginal: 1, weak: 0 };

function loadRunTargets(runDir) {
  const targetsDir = join(runDir, 'targets');
  if (!existsSync(targetsDir)) {
    throw new Error(`${targetsDir} does not exist -- is ${runDir} a real discover_batch.mjs output directory?`);
  }
  return readdirSync(targetsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(targetsDir, f), 'utf8')));
}

function loadCandidate(runDir, candidateId) {
  const path = join(runDir, 'candidates', `${candidateId}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

/* Pure. Builds the generate_entry.mjs-shaped "catalogRecord" object from a
   discover_batch.mjs target + its best candidate, so buildDraft() can be
   reused unmodified. Exported for direct unit testing. */
export function buildCatalogRecordFromCandidate(target, candidate) {
  const isArcGIS = !!(candidate.serviceUrl && /FeatureServer|MapServer/i.test(candidate.serviceUrl));
  const filterField = candidate.sharedServiceMatch?.filterField || null;
  const filterValue = candidate.sharedServiceMatch?.filterValue || null;

  return {
    id: `TODO-${target.fips}`,
    name: target.name,
    state: target.state,
    fips: target.fips,
    source_type: isArcGIS ? 'arcgis_featureserver' : (candidate.source || null),
    service_url: candidate.serviceUrl,
    county_filter_field: filterField,
    county_filter_value: filterValue,
    official_publisher: candidate.publisherName || null,
    portal_url: candidate.portalUrl || null,
    licensing_notes: candidate.licenseInfo || null,
    status: 'candidate',
  };
}

/* Pure. Decides whether a target's best candidate is even eligible for a
   draft to be generated -- never whether it's ready to PROMOTE (that's
   promote_batch.mjs's much stricter gate). Returns { eligible, reason }. */
export function evaluateTargetForDraft(target, candidate, minBand) {
  if (target.status === 'skipped-already-covered') {
    return { eligible: false, reason: 'already covered (skipped by --resume)' };
  }
  if (!candidate) {
    return { eligible: false, reason: `no best candidate found (target status: ${target.status})` };
  }
  if (candidate.rejected) {
    return { eligible: false, reason: `best candidate was rejected: ${candidate.rejectReason}` };
  }
  const minRank = BAND_RANK[minBand] ?? BAND_RANK.marginal;
  const candidateRank = BAND_RANK[candidate.band] ?? -1;
  if (candidateRank < minRank) {
    return { eligible: false, reason: `best candidate band '${candidate.band}' (score ${candidate.score}) is below --min-band '${minBand}'` };
  }
  return { eligible: true, reason: null };
}

function parseArgs(argv) {
  const args = { results: null, fips: null, minBand: 'marginal' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--results') args.results = argv[++i];
    else if (argv[i] === '--fips') args.fips = argv[++i];
    else if (argv[i] === '--min-band') args.minBand = argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.results) {
    console.error('Usage: node build_batch_drafts.mjs --results <run-dir> [--fips <csv>] [--min-band marginal]');
    process.exit(2);
  }
  if (!(args.minBand in BAND_RANK)) {
    console.error(`--min-band must be one of ${Object.keys(BAND_RANK).join(', ')}, got '${args.minBand}'`);
    process.exit(2);
  }

  const runDir = args.results;
  let targets = loadRunTargets(runDir);
  if (args.fips) {
    const wanted = new Set(args.fips.split(',').map(s => s.trim()).filter(Boolean));
    targets = targets.filter(t => wanted.has(t.fips));
  }

  mkdirSync(DRAFTS_DIR, { recursive: true });

  let written = 0, skipped = 0;
  for (const target of targets) {
    const candidate = target.bestCandidateId ? loadCandidate(runDir, target.bestCandidateId) : null;
    const evaluation = evaluateTargetForDraft(target, candidate, args.minBand);

    if (!evaluation.eligible) {
      console.log(`SKIP  ${target.fips} ${target.name || ''} -- ${evaluation.reason}`);
      skipped++;
      continue;
    }

    const catalogRecord = buildCatalogRecordFromCandidate(target, candidate);
    const validation = candidate.mappingValidation
      || { ok: false, missing: [], extra: [], overlap: [], requiredMissing: [] };
    const draft = buildDraft(catalogRecord, candidate.fieldMapPreview || { fieldMap: {}, notProvidedBySource: [], requiresReview: [] }, validation);

    const outPath = join(DRAFTS_DIR, `${target.fips}.js`);
    writeFileSync(outPath, draft);
    written++;

    const reviewCount = (candidate.fieldMapPreview?.requiresReview || []).length;
    console.log(`DRAFT ${target.fips} ${target.name || ''} -- score ${candidate.score} (${candidate.band}), ` +
      `${reviewCount} item(s) need review, validation ${validation.ok ? 'PASS' : 'INCOMPLETE'} -> ${outPath}`);
  }

  console.log(`\n${written} draft(s) written, ${skipped} target(s) skipped.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
