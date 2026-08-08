#!/usr/bin/env node
/* data/parcel_pipeline/promote_batch.mjs
 *
 *   node data/parcel_pipeline/promote_batch.mjs --results <run-dir> --approve-fips <csv> [--write] [--allow-weak]
 *
 * The ONE tool in this pipeline allowed to write to js/parcel/registry.js.
 * Every other pipeline script (discover_batch.mjs, build_batch_drafts.mjs,
 * generate_entry.mjs) is draft-only by design -- this is the single,
 * explicit, safety-gated exception, and it is deliberately hard to misuse:
 *
 *   - Dry-run by default. Nothing is written unless --write is passed.
 *   - --approve-fips is REQUIRED and is the only thing that can ever be
 *     written -- there is no "promote everything above some score" mode.
 *     A human names exactly which FIPS they've reviewed and approved.
 *   - Every candidate still has to clear every gate in evaluatePromotion()
 *     even if it's on the approved list: duplicate FIPS, wrong/uncertain
 *     jurisdiction match, any unresolved requiresReview item, a failing
 *     mapping validation, or (unless --allow-weak) a 'weak' score band all
 *     hard-block promotion regardless of what a human typed on the CLI.
 *   - Never touches a FIPS with no existing catalog record -- adding a
 *     brand-new catalog record is a separate, human-reviewed step.
 *   - NEVER commits, pushes, opens, or merges a PR. --write only edits the
 *     two files on disk; committing/pushing/opening the PR remains a
 *     separate, visible action a human (or an agent acting on explicit
 *     instruction) takes afterward, same as every other change in this repo.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, REGISTRY_PATH, loadRegistry } from './lib/load_registry.mjs';
import { buildEntryBody } from './generate_entry.mjs';

const CATALOG_PATH = join(ROOT, 'data', 'parcel_source_catalog.json');
const JURISDICTIONS_CLOSE_RE = /^ {2}\};\s*$/m;

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

/**
 * Pure. The full promotion gate, exported for direct unit testing without
 * any file I/O. Returns { approved, reason }. Checked in order -- the
 * FIRST failing gate is the reported reason, so a human always sees the
 * single most fundamental problem rather than a dump of every issue.
 */
export function evaluatePromotion(target, candidate, opts = {}) {
  const { registryHasFips = () => false, catalogRecord = null, allowWeak = false } = opts;

  if (!candidate) {
    return { approved: false, reason: `no best candidate found (target status: ${target.status})` };
  }
  if (candidate.rejected) {
    return { approved: false, reason: `best candidate was rejected: ${candidate.rejectReason}` };
  }
  if (registryHasFips(target.fips)) {
    return { approved: false, reason: 'FIPS already exists in js/parcel/registry.js -- refusing to create a duplicate' };
  }
  if (candidate.jurisdictionMatch !== 'exact') {
    return {
      approved: false,
      reason: `jurisdictionMatch is '${candidate.jurisdictionMatch}', not 'exact' -- never promote on partial, ` +
        'unknown, or bbox-only evidence (see determineJurisdictionMatch in discover_batch.mjs)',
    };
  }
  const requiresReview = candidate.fieldMapPreview?.requiresReview || [];
  if (requiresReview.length > 0) {
    return {
      approved: false,
      reason: `${requiresReview.length} unresolved requiresReview item(s) ` +
        `(${requiresReview.map(r => r.canonicalId || r.sourceField).join(', ')}) -- resolve by hand first, ` +
        'this tool never guesses ambiguous field mappings',
    };
  }
  const validation = candidate.mappingValidation;
  // Checked before the generic ok/not-ok gate below: requiredMissing is the
  // single most actionable reason (schema.js hard-rejects a record without
  // it), so it must never get shadowed by a vaguer "not clean" message when
  // it's the only real problem (an empty `missing` array is still truthy in
  // JS, so `validation.missing || validation` previously always reported
  // `missing` even when the actual failure was requiredMissing/extra/overlap).
  if (validation?.requiredMissing?.length) {
    return { approved: false, reason: `required field(s) not mapped: ${validation.requiredMissing.join(', ')}` };
  }
  if (!validation || !validation.ok) {
    const problems = [];
    if (validation?.missing?.length) problems.push(`missing: ${validation.missing.join(', ')}`);
    if (validation?.extra?.length) problems.push(`unrecognized: ${validation.extra.join(', ')}`);
    if (validation?.overlap?.length) problems.push(`overlap: ${validation.overlap.join(', ')}`);
    return {
      approved: false,
      reason: `mapping validation is not clean${problems.length ? ' (' + problems.join('; ') + ')' : ' (no mappingValidation present)'}`,
    };
  }
  if (candidate.band === 'weak' && !allowWeak) {
    return { approved: false, reason: `best candidate band is 'weak' (score ${candidate.score}) -- pass --allow-weak to override (not recommended)` };
  }
  if (!catalogRecord) {
    return { approved: false, reason: 'no existing catalog record for this FIPS -- add one to data/parcel_source_catalog.json first (out of scope for promote_batch.mjs)' };
  }
  if (catalogRecord.status === 'production') {
    return { approved: false, reason: 'catalog record is already status=production' };
  }

  return { approved: true, reason: null };
}

/* Pure. Builds the catalogRecord shape build_batch_drafts.mjs also builds,
   duplicated narrowly here (not imported) because promote_batch.mjs's
   version additionally needs the pre-existing catalog record's id/notes/
   facility_count/priority_rank preserved -- it UPDATES a record in place,
   it doesn't invent one. */
export function mergeCatalogRecordForPromotion(existingRecord, target, candidate) {
  const isArcGIS = !!(candidate.serviceUrl && /FeatureServer|MapServer/i.test(candidate.serviceUrl));
  // Matches the existing convention across every already-production catalog
  // record (confirmed against Jefferson County AL/DuPage County IL): this
  // is a plain count of resolved canonical fields, not a percentage or the
  // overall discover_batch.mjs score (that goes in confidence_score below).
  const mappedFieldCount = Object.keys(candidate.fieldMapPreview?.fieldMap || {})
    .filter(k => k !== 'county_fips').length;
  return {
    ...existingRecord,
    source_type: isArcGIS ? 'arcgis_featureserver' : (candidate.source || existingRecord.source_type),
    service_url: candidate.serviceUrl,
    official_publisher: candidate.publisherName || existingRecord.official_publisher,
    portal_url: candidate.portalUrl || existingRecord.portal_url,
    geometry_type: candidate.geometryType || existingRecord.geometry_type,
    query_support: candidate.queryable ?? existingRecord.query_support,
    available_fields: (candidate.fields || []).map(f => f.name),
    county_filter_field: candidate.sharedServiceMatch?.filterField || existingRecord.county_filter_field,
    county_filter_value: candidate.sharedServiceMatch?.filterValue || existingRecord.county_filter_value,
    confidence_score: candidate.score,
    field_coverage_score: mappedFieldCount,
    status: 'production',
    rejection_reason: null,
    last_verified: new Date().toISOString().slice(0, 10),
    notes: `${existingRecord.notes ? existingRecord.notes + ' ' : ''}Promoted via promote_batch.mjs ` +
      `(score ${candidate.score}, band ${candidate.band}) from discover_batch.mjs candidate ${candidate.candidateId}.`,
  };
}

/* Pure. Splices a formatted entry body in just before the JURISDICTIONS
   closing brace -- the same append-at-the-end convention every hand-added
   entry this session already follows (confirmed against the real file:
   entries are not kept in FIPS-sorted order, new ones are appended last).
   Exported for direct unit testing against synthetic registry-shaped text,
   never against the real file in a test. */
export function insertRegistryEntry(registrySource, entryBody) {
  if (!JURISDICTIONS_CLOSE_RE.test(registrySource)) {
    throw new Error('Could not find the JURISDICTIONS closing brace ("  };") in js/parcel/registry.js -- refusing to guess where to insert.');
  }
  // buildEntryBody()'s key line ("'fips': {") starts at column 0 (it's also
  // used standalone in a draft .js file, where that's correct); every real
  // entry's key line inside JURISDICTIONS is indented 4 spaces. Every OTHER
  // line in the body already carries its own correct absolute indentation
  // (confirmed against real registry.js: body lines sit at 6+ spaces
  // relative to column 0, matching the template literal as written) -- only
  // the first line needs the extra 4 spaces added here.
  const indented = `    ${entryBody}`;
  return registrySource.replace(JURISDICTIONS_CLOSE_RE, `${indented}\n\n  };`);
}

function parseArgs(argv) {
  const args = { results: null, approveFips: null, write: false, allowWeak: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--results') args.results = argv[++i];
    else if (argv[i] === '--approve-fips') args.approveFips = argv[++i];
    else if (argv[i] === '--write') args.write = true;
    else if (argv[i] === '--allow-weak') args.allowWeak = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.results || !args.approveFips) {
    console.error('Usage: node promote_batch.mjs --results <run-dir> --approve-fips <csv> [--write] [--allow-weak]');
    process.exit(2);
  }

  const approveFips = new Set(args.approveFips.split(',').map(s => s.trim()).filter(Boolean));
  const runDir = args.results;
  const targets = loadRunTargets(runDir).filter(t => approveFips.has(t.fips));

  const missingFips = [...approveFips].filter(fips => !targets.some(t => t.fips === fips));
  for (const fips of missingFips) {
    console.log(`SKIP  ${fips} -- not found in ${runDir}/targets/ (typo, or this run never covered it)`);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const registry = loadRegistry();
  const registryHasFips = fips => registry.has(fips);

  const approved = [];
  for (const target of targets) {
    const candidate = target.bestCandidateId ? loadCandidate(runDir, target.bestCandidateId) : null;
    const catalogRecord = catalog.jurisdictions[target.fips] || null;
    const evaluation = evaluatePromotion(target, candidate, { registryHasFips, catalogRecord, allowWeak: args.allowWeak });

    if (!evaluation.approved) {
      console.log(`REJECT ${target.fips} ${target.name || ''} -- ${evaluation.reason}`);
      continue;
    }

    console.log(`APPROVE ${target.fips} ${target.name || ''} -- score ${candidate.score} (${candidate.band}), ` +
      `jurisdictionMatch=exact, mapping validated clean`);
    approved.push({ target, candidate, catalogRecord });
  }

  console.log(`\n${approved.length} of ${targets.length} requested FIPS approved for promotion.`);

  if (!args.write) {
    console.log(approved.length
      ? '\nDry run (no --write passed) -- nothing was changed. Re-run with --write to apply.'
      : '\nDry run -- nothing to write even if --write were passed.');
    return;
  }

  if (!approved.length) {
    console.log('\n--write passed but nothing was approved -- nothing to do.');
    return;
  }

  let registrySource = readFileSync(REGISTRY_PATH, 'utf8');
  for (const { target, candidate } of approved) {
    const mergedRecord = mergeCatalogRecordForPromotion(catalog.jurisdictions[target.fips], target, candidate);
    const note = `Promoted via promote_batch.mjs on ${mergedRecord.last_verified} ` +
      `(score ${candidate.score}, band ${candidate.band}; automated discovery + field mapping, not hand-verified).`;
    const entryBody = buildEntryBody(mergedRecord, candidate.fieldMapPreview, note);
    registrySource = insertRegistryEntry(registrySource, entryBody);
    catalog.jurisdictions[target.fips] = mergedRecord;
  }

  writeFileSync(REGISTRY_PATH, registrySource);
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');

  console.log(`\nWrote ${approved.length} entry(ies) to ${REGISTRY_PATH} and updated ${CATALOG_PATH}.`);
  console.log('Next: run node data/parcel_pipeline/check_registry_integrity.mjs, python3 data/validate_parcel_catalog.py, ' +
    'and node tests/parcel.test.js, then review the diff by hand before committing.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
