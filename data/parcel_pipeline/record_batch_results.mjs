#!/usr/bin/env node
/* data/parcel_pipeline/record_batch_results.mjs
 *
 *   node data/parcel_pipeline/record_batch_results.mjs --results <run-dir> [--write]
 *
 * Every prior round of manual investigation this session logged its
 * findings into a catalog record's `notes` field by hand, one paragraph
 * per county. That doesn't scale once discover_batch.mjs is producing
 * dozens of counties' results per batch. This is the standardized
 * replacement: for every target in a run, append one compact, consistent
 * note to its catalog record (creating a minimal one if none exists yet)
 * summarizing what automated discovery found and, critically, WHY it
 * wasn't promoted -- so the next person (human or agent) picking this FIPS
 * back up starts from a real trail instead of from zero.
 *
 * THIS SCRIPT NEVER TOUCHES js/parcel/registry.js and never sets
 * status=production -- that remains promote_batch.mjs's job alone, gated
 * on evaluatePromotion(). This script only keeps the catalog's own
 * investigation trail current. Dry-run by default; --write applies it.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/load_registry.mjs';
import { evaluatePromotion } from './promote_batch.mjs';

const CATALOG_PATH = join(ROOT, 'data', 'parcel_source_catalog.json');
const FACILITIES_PATH = join(ROOT, 'data', 'facilities_index.json');

function loadRunTargets(runDir) {
  const targetsDir = join(runDir, 'targets');
  return readdirSync(targetsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(targetsDir, f), 'utf8')));
}

function loadCandidate(runDir, candidateId) {
  if (!candidateId) return null;
  const path = join(runDir, 'candidates', `${candidateId}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function countFacilities(facilities, fips) {
  return facilities.filter(f => f.county_fips === fips).length;
}

const REQUIRED_KEYS = [
  'id', 'name', 'state', 'fips', 'facility_count', 'priority_rank',
  'source_scope', 'source_type', 'service_url', 'portal_url',
  'official_publisher', 'geometry_type', 'query_support', 'record_count',
  'available_fields', 'geographic_extent', 'county_filter_field',
  'county_filter_value', 'update_frequency', 'licensing_notes',
  'confidence_score', 'field_coverage_score', 'status', 'rejection_reason',
  'last_verified', 'retry_eligible', 'retry_after_days', 'notes',
];

function blankRecord(target, facilityCount) {
  const rec = {};
  for (const k of REQUIRED_KEYS) rec[k] = null;
  Object.assign(rec, {
    id: null, name: target.name, state: target.state, fips: target.fips,
    facility_count: facilityCount, priority_rank: null, source_scope: 'county',
    available_fields: [], geographic_extent: 'county', retry_eligible: true,
    retry_after_days: 30, notes: '',
  });
  return rec;
}

/* Pure. Builds the one-line note + status/rejection_reason update for a
   single target's outcome, given its best candidate and the same
   evaluatePromotion() gate promote_batch.mjs itself uses -- so the note
   always says the exact same thing a promotion attempt would have found. */
export function summarizeOutcome(target, candidate, evaluation, today) {
  if (!candidate) {
    return {
      note: `${today} automated discovery: no candidate found (target status: ${target.status}).`,
      status: 'rejected',
      rejection_reason: `Automated discovery (discover_batch.mjs) found no usable parcel data candidate (target status: ${target.status}).`,
    };
  }
  if (candidate.rejected) {
    return {
      note: `${today} automated discovery: best candidate rejected -- ${candidate.rejectReason}.`,
      status: 'rejected',
      rejection_reason: `Automated discovery's best candidate was rejected: ${candidate.rejectReason}.`,
    };
  }
  if (evaluation.approved) {
    // Should not normally reach here -- an approved candidate gets promoted
    // by promote_batch.mjs, not just noted. Kept for completeness/tests.
    return {
      note: `${today} automated discovery: candidate cleared every promotion gate (score ${candidate.score}, band ${candidate.band}) -- see promote_batch.mjs.`,
      status: 'candidate',
      rejection_reason: null,
    };
  }
  return {
    note: `${today} automated discovery: found ${candidate.candidateId} (score ${candidate.score}, band ${candidate.band}), ` +
      `not promoted -- ${evaluation.reason}`,
    status: 'candidate',
    rejection_reason: null,
  };
}

function parseArgs(argv) {
  const args = { results: null, write: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--results') args.results = argv[++i];
    else if (argv[i] === '--write') args.write = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.results) {
    console.error('Usage: node record_batch_results.mjs --results <run-dir> [--write]');
    process.exit(2);
  }

  const targets = loadRunTargets(args.results);
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const facilities = JSON.parse(readFileSync(FACILITIES_PATH, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);

  let updated = 0, created = 0, skippedProduction = 0;
  for (const target of targets) {
    const existing = catalog.jurisdictions[target.fips];
    if (existing && existing.status === 'production') {
      console.log(`SKIP  ${target.fips} ${target.name || ''} -- already status=production, not touching`);
      skippedProduction++;
      continue;
    }

    const candidate = loadCandidate(args.results, target.bestCandidateId);
    const evaluation = evaluatePromotion(target, candidate, {
      registryHasFips: () => false, catalogRecord: existing || null, allowWeak: false,
    });
    const outcome = summarizeOutcome(target, candidate, evaluation, today);

    const record = existing || blankRecord(target, countFacilities(facilities, target.fips));
    record.notes = record.notes ? `${record.notes} ${outcome.note}` : outcome.note;
    record.last_verified = today;
    if (!existing) {
      record.status = outcome.status;
      record.rejection_reason = outcome.rejection_reason;
      created++;
    } else {
      updated++;
    }
    // Bring forward whatever real signal the candidate carries, even when
    // not promotable -- helps the next round skip straight to review
    // instead of rediscovering the same service from scratch.
    if (candidate && !candidate.rejected) {
      record.official_publisher = record.official_publisher || candidate.publisherName || null;
      record.portal_url = record.portal_url || candidate.portalUrl || null;
      record.geometry_type = record.geometry_type || candidate.geometryType || null;
    }

    console.log(`${existing ? 'UPDATE' : 'CREATE'} ${target.fips} ${target.name || ''} -- ${outcome.note}`);
    catalog.jurisdictions[target.fips] = record;
  }

  console.log(`\n${created} record(s) created, ${updated} updated, ${skippedProduction} already-production skipped.`);

  if (!args.write) {
    console.log('\nDry run (no --write passed) -- nothing was changed.');
    return;
  }

  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`\nWrote updates to ${CATALOG_PATH}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
