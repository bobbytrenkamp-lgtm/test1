#!/usr/bin/env node
/* data/parcel_pipeline/discover_enrichment.mjs
 *
 * Finds CAMA/assessment join candidates for jurisdictions ALREADY in
 * production, whose parcel service publishes geometry but little else.
 *
 *   node data/parcel_pipeline/discover_enrichment.mjs --fips 51107,51153
 *   node data/parcel_pipeline/discover_enrichment.mjs --gaps 10
 *   node data/parcel_pipeline/discover_enrichment.mjs --gaps 5 --dry-run
 *
 * This is the sibling of discover_batch.mjs. That one answers "which
 * jurisdictions have a parcel service at all"; this one answers "for the
 * jurisdictions we already serve, where does the rest of the data live".
 * Both write drafts for human review and neither edits registry.js.
 *
 * WHY THIS IS A SEPARATE, NETWORK-BOUND TOOL
 * ------------------------------------------
 * A proposed enrichment source cannot be written from a desk. Its whole
 * correctness rests on one empirical fact -- that the candidate table's
 * identifier genuinely refers to the same parcels as the geometry layer's --
 * and the only way to establish that is to pull real parcel ids from the live
 * service and see how many come back from the candidate. A join that looks
 * right and is wrong does not render a blank row; it renders another
 * property's owner and assessed value under this parcel's address.
 *
 * So this tool never proposes a source it has not measured. Every draft
 * carries the match rate, the sample size, and the exact normalization the
 * match required, and anything below the threshold is written out as
 * rejected-with-a-number rather than omitted.
 *
 * Output (never registry.js):
 *   data/parcel_pipeline/output/enrichment-<run-id>/summary.json
 *   data/parcel_pipeline/output/enrichment-<run-id>/summary.md
 *   data/parcel_pipeline/output/enrichment-<run-id>/drafts/<fips>.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry } from './lib/load_registry.mjs';
import { mapFields } from './field_mapper.mjs';
import { inspectArcGISService } from './discovery/schema.mjs';
import {
  rankJoinCandidates, sampleBaseKeys, evaluateCandidate, toEnrichmentSource,
  MIN_MATCH_RATE, DEFAULT_SAMPLE_SIZE,
} from './discovery/enrichment_candidates.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_ROOT = join(ROOT, 'data', 'parcel_pipeline', 'output');

/* Canonical fields worth chasing a second source for. Deliberately excludes
   geometry and area (the parcel layer is authoritative for those) and the
   three fields field_mapper.mjs will only resolve from a human-verified
   synonym -- proposing those from an unfamiliar service is precisely the
   guessing the mapper's tiering exists to prevent. */
const ENRICHMENT_TARGET_FIELDS = [
  'owner', 'zoning_code', 'land_use_code', 'land_use_desc',
  'building_count', 'year_built', 'gross_floor_area',
  'assessed_value', 'land_value', 'improvement_value', 'tax_year',
  'last_sale_date', 'last_sale_price', 'deed_book', 'deed_page',
];

/* Derives the base service root from a layer URL: .../MapServer/3 ->
   .../MapServer. Sibling layers and tables live under that root, which is
   where a county's CAMA companion almost always is. */
export function serviceRootOf(layerUrl) {
  const m = String(layerUrl || '').match(/^(.*\/(?:Map|Feature)Server)(?:\/(\d+))?\/?$/i);
  if (!m) return { root: null, layerId: null };
  return { root: m[1], layerId: m[2] != null ? m[2] : null };
}

/* Which canonical fields is this jurisdiction missing that a secondary source
   could plausibly supply? Reads the entry's own declarations rather than
   inferring: notProvidedBySource is the registry's explicit record of known
   gaps, and anything simply absent from fieldMap is a gap too. */
export function missingFieldsFor(entry) {
  const provided = new Set(Object.keys(entry.fieldMap || {}));
  return ENRICHMENT_TARGET_FIELDS.filter(f => !provided.has(f));
}

/* Ranks production jurisdictions by how much they stand to gain. Facility
   count is the tiebreaker the rest of this pipeline already uses: enriching
   the county with 40 data centers is worth more than one with none. */
export function rankGapJurisdictions(registry, facilityCounts = {}) {
  return registry.all()
    .map(entry => ({
      fips: entry.fips,
      id: entry.id,
      name: entry.name,
      missing: missingFieldsFor(entry),
      facilities: facilityCounts[entry.fips] || 0,
    }))
    .filter(j => j.missing.length > 0)
    .sort((a, b) =>
      b.facilities - a.facilities ||
      b.missing.length - a.missing.length ||
      a.fips.localeCompare(b.fips));
}

function loadFacilityCounts() {
  try {
    const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'facilities_index.json'), 'utf8'));
    const list = Array.isArray(raw) ? raw : (raw.facilities || []);
    const counts = {};
    for (const f of list) {
      const fips = f.county_fips || f.fips;
      if (fips) counts[String(fips).padStart(5, '0')] = (counts[String(fips).padStart(5, '0')] || 0) + 1;
    }
    return counts;
  } catch {
    // Facility counts only affect ORDERING. Their absence must not stop
    // discovery, so this degrades to unordered rather than failing.
    return {};
  }
}

function loadSynonyms() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'data', 'parcel_field_synonyms.json'), 'utf8'));
  } catch {
    return {};
  }
}

/* Investigates one jurisdiction end to end. Never throws: a jurisdiction that
   cannot be investigated is reported with a reason, because a batch of 20
   must not be lost to one dead server. */
export async function investigate(entry, opts = {}, ctx = {}) {
  const report = {
    fips: entry.fips,
    id: entry.id,
    name: entry.name,
    serviceUrl: entry.serviceUrl,
    missingFields: missingFieldsFor(entry),
    status: 'no-candidates',
    why: null,
    candidates: [],
    proposed: null,
  };

  if (entry.connector !== 'arcgis') {
    report.status = 'unsupported-connector';
    report.why = `enrichment discovery currently only understands ArcGIS services (this entry is '${entry.connector}')`;
    return report;
  }

  const baseJoinSourceField = (entry.fieldMap || {}).parcel_id;
  if (!baseJoinSourceField || baseJoinSourceField === '__computed__') {
    // Without a real identifier column on the parcel layer there is nothing
    // to join FROM, and a computed id exists only in the browser.
    report.status = 'no-base-join-field';
    report.why = 'entry has no concrete parcel_id source column to join from';
    return report;
  }

  const { root, layerId } = serviceRootOf(entry.serviceUrl);
  if (!root) {
    report.status = 'unparseable-service-url';
    report.why = `could not derive a service root from ${entry.serviceUrl}`;
    return report;
  }

  const svc = await inspectArcGISService(root, ctx);
  if (!svc.ok) {
    report.status = 'service-unreachable';
    report.why = svc.why || svc.errorType;
    return report;
  }

  const candidates = rankJoinCandidates(svc, { excludeLayerId: layerId });
  if (!candidates.length) {
    report.why = 'no sibling layer or table on this service looks like assessment data';
    return report;
  }

  const sample = await sampleBaseKeys(entry.serviceUrl, baseJoinSourceField, ctx,
    opts.sampleSize || DEFAULT_SAMPLE_SIZE);
  if (!sample.ok) {
    report.status = 'base-sample-failed';
    report.why = `could not sample parcel ids from the base layer: ${sample.why}`;
    return report;
  }
  report.sampleSize = sample.keys.length;

  const synonyms = ctx.synonyms || {};
  for (const candidate of candidates.slice(0, opts.maxCandidates || 5)) {
    const candidateUrl = `${root}/${candidate.id}`;
    const evaluated = await evaluateCandidate(candidate, {
      candidateUrl,
      baseJoinSourceField,
      sampleKeys: sample.keys,
      missingCanonicalFields: report.missingFields,
      mapFieldsFn: ctx.mapFieldsFn || mapFields,
      synonyms,
    }, ctx);

    report.candidates.push(evaluated);

    if (evaluated.status === 'verified' && !report.proposed) {
      report.status = 'proposed';
      report.proposed = toEnrichmentSource(evaluated, {
        jurisdictionId: entry.id,
        label: `${entry.name} — ${evaluated.name}`,
        baseField: 'parcel_id',
      });
      break;   // one verified source is enough for a reviewable draft
    }
  }

  if (report.status !== 'proposed' && report.candidates.length) {
    report.status = 'candidates-unverified';
    report.why = `${report.candidates.length} candidate(s) probed, none reached the ` +
      `${(MIN_MATCH_RATE * 100).toFixed(0)}% join match threshold`;
  }

  return report;
}

export function renderMarkdown(reports, meta) {
  const lines = [];
  lines.push(`# Parcel enrichment discovery — ${meta.runId}`);
  lines.push('');
  lines.push(`Investigated ${reports.length} production jurisdiction(s) whose parcel service`);
  lines.push('publishes geometry but not ownership/assessment data.');
  lines.push('');
  lines.push(`Join match threshold: **${(MIN_MATCH_RATE * 100).toFixed(0)}%** of a live parcel-id sample.`);
  lines.push('');

  const proposed = reports.filter(r => r.status === 'proposed');
  lines.push(`## Verified proposals (${proposed.length})`);
  lines.push('');
  if (!proposed.length) {
    lines.push('_None._');
  } else {
    lines.push('| FIPS | Jurisdiction | Candidate | Join field | Match | Fields gained |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of proposed) {
      const c = r.candidates.find(x => x.status === 'verified');
      lines.push(`| ${r.fips} | ${r.name} | ${c.name} | \`${c.joinField}\` | ` +
        `${(c.matchRate * 100).toFixed(0)}% of ${c.sampled} | ${Object.keys(c.fieldMap).length} |`);
    }
  }
  lines.push('');

  const others = reports.filter(r => r.status !== 'proposed');
  lines.push(`## Not proposed (${others.length})`);
  lines.push('');
  if (!others.length) {
    lines.push('_None._');
  } else {
    lines.push('| FIPS | Jurisdiction | Status | Why |');
    lines.push('|---|---|---|---|');
    for (const r of others) {
      lines.push(`| ${r.fips} | ${r.name} | ${r.status} | ${r.why || ''} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Nothing here is applied automatically.** Each proposal is a draft');
  lines.push('`enrichment.sources[]` block for review; promoting one means pasting it into');
  lines.push('`js/parcel/registry.js`, where `check_registry_integrity.mjs` validates it.');
  lines.push('');
  lines.push('Before promoting, confirm the match rate is high enough to be a real join');
  lines.push('rather than a coincidence, and spot-check one parcel against the county\'s');
  lines.push('public property lookup — the owner and assessed value shown for a known');
  lines.push('address should be the ones this join produces.');

  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { fips: null, gaps: null, dryRun: false, sampleSize: DEFAULT_SAMPLE_SIZE, maxCandidates: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fips') args.fips = String(argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--gaps') args.gaps = parseInt(argv[++i], 10);
    else if (a === '--sample-size') args.sampleSize = parseInt(argv[++i], 10);
    else if (a === '--max-candidates') args.maxCandidates = parseInt(argv[++i], 10);
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = loadRegistry();
  const facilityCounts = loadFacilityCounts();

  let targets;
  if (args.fips) {
    targets = args.fips.map(f => registry.get(f)).filter(Boolean);
    const missing = args.fips.filter(f => !registry.get(f));
    if (missing.length) console.error(`WARN: not in the registry, skipped: ${missing.join(', ')}`);
  } else {
    const ranked = rankGapJurisdictions(registry, facilityCounts);
    targets = ranked.slice(0, args.gaps || 5).map(j => registry.get(j.fips));
  }

  if (!targets.length) {
    console.log('No target jurisdictions. Use --fips or --gaps.');
    return;
  }

  console.log(`Investigating ${targets.length} jurisdiction(s) for enrichment sources...\n`);

  if (args.dryRun) {
    for (const entry of targets) {
      const missing = missingFieldsFor(entry);
      console.log(`  ${entry.fips}  ${entry.name}`);
      console.log(`      missing ${missing.length} field(s): ${missing.join(', ') || '(none)'}`);
      console.log(`      service root: ${serviceRootOf(entry.serviceUrl).root || '(unparseable)'}`);
    }
    console.log('\nDry run — no network requests made.');
    return;
  }

  const ctx = { synonyms: loadSynonyms(), timeoutMs: 12000, maxRetries: 2 };
  const reports = [];
  for (const entry of targets) {
    process.stdout.write(`  ${entry.fips} ${entry.name} ... `);
    const report = await investigate(entry, args, ctx);
    reports.push(report);
    console.log(report.status === 'proposed'
      ? `PROPOSED (${(report.candidates.find(c => c.status === 'verified').matchRate * 100).toFixed(0)}% match)`
      : `${report.status}${report.why ? ` — ${report.why}` : ''}`);
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = join(OUTPUT_ROOT, `enrichment-${runId}`);
  mkdirSync(join(outDir, 'drafts'), { recursive: true });

  writeFileSync(join(outDir, 'summary.json'),
    JSON.stringify({ runId, generatedAt: new Date().toISOString(), minMatchRate: MIN_MATCH_RATE, reports }, null, 2));
  writeFileSync(join(outDir, 'summary.md'), renderMarkdown(reports, { runId }));

  for (const r of reports) {
    if (r.proposed) {
      writeFileSync(join(outDir, 'drafts', `${r.fips}.json`), JSON.stringify(r.proposed, null, 2));
    }
  }

  const proposed = reports.filter(r => r.status === 'proposed').length;
  console.log(`\n${proposed} verified proposal(s) of ${reports.length} investigated.`);
  console.log(`Output: ${outDir}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
