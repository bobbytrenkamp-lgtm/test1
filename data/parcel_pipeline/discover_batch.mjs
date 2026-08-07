#!/usr/bin/env node
/* data/parcel_pipeline/discover_batch.mjs — permanent batch parcel-source
 * discovery command. Replaces the one-temp-diagnostic-per-round pattern
 * (data/diagnose_batch_rN.mjs + .github/workflows/_diagnose_batch_rN.yml,
 * used across ~10 manual rounds this session) for ordinary discovery.
 *
 * Usage:
 *   node data/parcel_pipeline/discover_batch.mjs --next 25
 *   node data/parcel_pipeline/discover_batch.mjs --fips 17043,01073
 *   node data/parcel_pipeline/discover_batch.mjs --next 10 --state IL
 *   node data/parcel_pipeline/discover_batch.mjs --resume 2026-08-05T12-00-00-ab12
 *   node data/parcel_pipeline/discover_batch.mjs --next 10 --dry-run
 *
 * DISCOVERY ORDER (checked per jurisdiction, in this order):
 *   1. shared_services  — the reusable-service registry (data/parcel_source_
 *      catalog.json's `shared_services` key). A statewide service covering
 *      twenty counties is more valuable than twenty independent connectors,
 *      so this is always checked first. A confident shared_services match
 *      short-circuits the rest of the source order for that jurisdiction
 *      (recorded in sourcesSkipped, not silently dropped).
 *   2. arcgis_online     — ArcGIS Online item search. Proven this session to
 *      repeatedly find real, county-owned services (Mecklenburg NC, DuPage
 *      IL, Jefferson AL) after blind URL guessing kept dead-ending.
 *   3. arcgis_server     — direct REST-catalog folder listing, for when a
 *      server root is already known/guessable.
 *   4. dcat / ckan / socrata — open-data catalog formats, in that order
 *      (DCAT is the most common shape for ArcGIS Hub portals, which this
 *      session's manual rounds encountered far more often than CKAN/Socrata).
 *
 * Every network call an adapter makes routes through
 * discovery/network.mjs's fetchJsonCached(), so --resume/--refresh apply
 * uniformly without any adapter needing its own cache logic.
 *
 * STRUCTURED OUTPUT — this permanently fixes the "console output truncated"
 * problem the ad-hoc diagnostic rounds kept hitting. Every run writes:
 *   data/parcel_pipeline/output/<run-id>/summary.json
 *   data/parcel_pipeline/output/<run-id>/summary.md
 *   data/parcel_pipeline/output/<run-id>/targets/<fips>.json
 *   data/parcel_pipeline/output/<run-id>/candidates/<candidate-id>.json
 *   data/parcel_pipeline/output/<run-id>/raw/<safe-name>.json
 * All gitignored — meant to be uploaded as a CI artifact (PR C), never
 * committed. --dry-run runs the full pipeline and prints the summary but
 * writes nothing to disk.
 *
 * This command never writes to js/parcel/registry.js, never changes catalog
 * status, never promotes anything to production. See the deferred
 * build_batch_drafts.mjs / promote_batch.mjs (PR C) for that.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { fetchJsonCached } from './discovery/network.mjs';
import { inspectArcGISService, fetchSampleRecords, rankLayersByNameKeywords } from './discovery/schema.mjs';
import { scoreCandidate } from './discovery/scoring.mjs';
import { matchSharedServices, verifySharedServiceMatch } from './discovery/shared_services.mjs';
import { flagStaticDownloadCandidates } from './discovery/static_downloads.mjs';
import { tagMappingConfidence } from './discovery/mapping_confidence.mjs';
import { mapFields } from './field_mapper.mjs';
import { validateMapping } from './validate_field_mapping.mjs';
import { loadRegistry, loadSchemaFieldIds, loadRequiredSchemaFieldIds } from './lib/load_registry.mjs';
import { searchArcGISOnline } from './discovery/arcgis_online.mjs';
import { findLikelyParcelServices } from './discovery/arcgis_server.mjs';
import { searchDcat } from './discovery/dcat.mjs';
import { searchCkan } from './discovery/ckan.mjs';
import { searchSocrata } from './discovery/socrata.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CATALOG_PATH = join(ROOT, 'data', 'parcel_source_catalog.json');
const SYNONYMS_PATH = join(ROOT, 'data', 'parcel_field_synonyms.json');
const OUTPUT_ROOT = join(ROOT, 'data', 'parcel_pipeline', 'output');

export const DEFAULT_SOURCE_ORDER = ['shared_services', 'arcgis_online', 'arcgis_server', 'dcat', 'ckan', 'socrata'];

/* The real adapters, wired up as the default. discover_batch.mjs's core
   orchestration (runDiscovery) accepts an override so tests can inject
   stubs and exercise ordering/concurrency/resume logic without any real
   network access. */
export const defaultAdapters = {
  async shared_services(jurisdiction, ctx) {
    const match = matchSharedServices(jurisdiction, ctx.sharedServicesRegistry);
    if (!match) return { ok: true, attempts: 0, candidates: [] };
    const verified = await verifySharedServiceMatch(match, ctx);
    if (!verified.serviceStillLive) return { ok: true, attempts: 1, candidates: [] };
    const service = verified.service;
    return {
      ok: true,
      attempts: 1,
      candidates: [{
        candidateId: `${jurisdiction.fips}-shared_services-${service.service_id}`,
        source: 'shared_services',
        fips: jurisdiction.fips,
        jurisdictionName: jurisdiction.name,
        state: jurisdiction.state,
        serviceUrl: service.service_url,
        portalUrl: null,
        publisherType: 'official',
        publisherName: service.publisher,
        jurisdictionMatch: verified.confidence === 'known-fips' ? 'exact' : 'unknown',
        geometryType: service.geometry_type || null,
        queryable: true,
        isTileOnly: false,
        requiresAuth: false,
        fields: verified.inspected.ok ? verified.inspected.fields : null,
        sampleRecords: null,
        sampleNullRatio: null,
        staticDownloadOnly: false,
        ingested: false,
        sharedServiceMatch: verified,
        raw: { sharedService: service },
      }],
      // A confident (known-fips) match is strong enough to skip the rest of
      // the source order for this jurisdiction — recorded explicitly by
      // the caller, not silently dropped.
      shortCircuit: verified.confidence === 'known-fips',
    };
  },
  async arcgis_online(jurisdiction, ctx) {
    return searchArcGISOnline(jurisdiction, ctx);
  },
  async arcgis_server(jurisdiction, ctx) {
    if (!jurisdiction.serverRootUrl) return { ok: true, attempts: 0, candidates: [] };
    return findLikelyParcelServices(jurisdiction.serverRootUrl, jurisdiction, ctx);
  },
  async dcat(jurisdiction, ctx) {
    const res = await searchDcat(jurisdiction, ctx);
    if (res.candidates) res.candidates = flagStaticDownloadCandidates(res.candidates);
    return res;
  },
  async ckan(jurisdiction, ctx) {
    const res = await searchCkan(jurisdiction, ctx);
    if (res.candidates) res.candidates = flagStaticDownloadCandidates(res.candidates);
    return res;
  },
  async socrata(jurisdiction, ctx) {
    const res = await searchSocrata(jurisdiction, ctx);
    if (res.candidates) res.candidates = flagStaticDownloadCandidates(res.candidates);
    return res;
  },
};

function mkdirp(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeJsonIfEnabled(path, data, { dryRun }) {
  if (dryRun) return;
  mkdirp(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

const JURISDICTION_TYPE_WORDS = new Set(['county', 'parish', 'borough']);

/* Lowercases, strips punctuation, and drops generic locality-type words
   (county/parish/borough) so "Lake County" and "Salt Lake County" don't
   collapse to the same thing via a shared word -- see the word-array
   comparison below for why that distinction matters. */
function normalizeJurisdictionWords(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !JURISDICTION_TYPE_WORDS.has(w));
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((w, i) => w === b[i]);
}

function containsWordSequence(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

/* Pure-ish (only reads already-fetched candidate data, never fetches). A
   deliberately conservative heuristic — never trusts bbox/geometry-only
   evidence (the exact class of mistake the Baltimore City/PG County MD
   bbox investigation made this session). Prefers, in order: an exact FIPS/
   county-name/jurisdiction-code field value in a real sample record; a
   jurisdiction name match in the service's own title/owner/description; no
   evidence either way (unknown, never assumed positive). Evidence the
   service is for a different, wrong jurisdiction (e.g. sample records'
   state field doesn't match) downgrades to 'wrong'.

   The sample-record comparison is exact-word-sequence, not substring
   containment: a live batch run matched "Utah Salt Lake County Parcels
   LIR" (published by UtahAGRC for Salt Lake County, UT) as jurisdictionMatch
   'exact' against a target named "Lake County" (IL, FIPS 17097) purely
   because the sample records' own "COUNTY" field read "Salt Lake", and
   "salt lake".includes("lake") is true. Comparing the full normalized word
   sequence instead correctly treats that as evidence of the WRONG
   jurisdiction, while a trailing state-abbreviation token (only the
   target's own actual state, never an arbitrary word) is still tolerated
   so formatting variants like "Lake, IL" keep matching. */
export function determineJurisdictionMatch(candidate, jurisdiction, sampleRecords) {
  const nameWords = normalizeJurisdictionWords(jurisdiction.name);
  const stateAbbr = String(jurisdiction.state || '').toLowerCase();

  if (Array.isArray(sampleRecords) && sampleRecords.length) {
    for (const record of sampleRecords) {
      for (const [key, value] of Object.entries(record)) {
        if (value == null) continue;
        const keyLower = key.toLowerCase();
        const valueStr = String(value).toLowerCase();
        const looksLikeJurisdictionField = /county|jurisdiction|jurscode|fips|munic/i.test(keyLower);
        if (!looksLikeJurisdictionField || !nameWords.length) continue;

        let valueWords = normalizeJurisdictionWords(valueStr);
        if (!valueWords.length) continue;
        if (stateAbbr && valueWords[valueWords.length - 1] === stateAbbr) {
          valueWords = valueWords.slice(0, -1);
        }
        if (arraysEqual(valueWords, nameWords)) return 'exact';
        // A jurisdiction-shaped field with a real, non-matching value is
        // real evidence of the WRONG jurisdiction, not just "no match yet".
        return 'wrong';
      }
    }
  }

  const titleWords = normalizeJurisdictionWords(
    [candidate.itemTitle, candidate.publisherName, candidate.accessInformation].filter(Boolean).join(' ')
  );
  if (containsWordSequence(titleWords, nameWords)) return 'partial';

  return 'unknown';
}

/* Enriches an un-scored ArcGIS-shaped candidate stub with real schema +
   sample data, then determines jurisdictionMatch from that real evidence.
   Candidates with no serviceUrl (a bare portal link from dcat/ckan/socrata,
   or a static-download-only candidate) are returned unchanged — there is
   nothing to inspect. */
async function enrichCandidate(candidate, jurisdiction, ctx) {
  if (!candidate.serviceUrl || candidate.staticDownloadOnly) {
    return candidate;
  }

  const inspected = await inspectArcGISService(candidate.serviceUrl, ctx);
  if (!inspected.ok) {
    return { ...candidate, inspectionError: { errorType: inspected.errorType, why: inspected.why } };
  }

  let resolvedUrl = candidate.serviceUrl;
  let fields = inspected.fields;
  let geometryType = inspected.geometryType;

  // A service root with sub-layers (no direct field list) — rank them by
  // keyword and inspect the top candidate. Still requires geometry+sample
  // confirmation below before being trusted, per the "title alone is never
  // sufficient" rule.
  if (!fields && Array.isArray(inspected.layers) && inspected.layers.length) {
    const ranked = rankLayersByNameKeywords(inspected.layers);
    if (ranked.length) {
      resolvedUrl = `${candidate.serviceUrl.replace(/\/+$/, '')}/${ranked[0].id}`;
      const layerInspected = await inspectArcGISService(resolvedUrl, ctx);
      if (layerInspected.ok) {
        fields = layerInspected.fields;
        geometryType = layerInspected.geometryType;
      }
    }
  }

  const sampleResult = fields ? await fetchSampleRecords(resolvedUrl, ctx, 3) : { ok: false, records: null };
  const sampleRecords = sampleResult.ok ? sampleResult.records : null;

  let sampleNullRatio = null;
  if (sampleRecords && sampleRecords.length && fields) {
    let total = 0, nullCount = 0;
    for (const record of sampleRecords) {
      for (const field of fields) {
        total++;
        if (record[field.name] == null || record[field.name] === '') nullCount++;
      }
    }
    sampleNullRatio = total ? nullCount / total : null;
  }

  const enriched = {
    ...candidate,
    serviceUrl: resolvedUrl,
    fields,
    geometryType: geometryType || candidate.geometryType,
    queryable: (inspected.capabilities || []).includes('Query') || candidate.queryable,
    isTileOnly: (inspected.capabilities || []).length > 0 && !(inspected.capabilities || []).includes('Query'),
    requiresAuth: inspected.errorType === 'auth',
    sampleRecords,
    sampleNullRatio,
    publisherType: candidate.publisherType === 'unknown' && inspected.owner ? 'official' : candidate.publisherType,
    publisherName: candidate.publisherName || inspected.owner || null,
    raw: { ...candidate.raw, serviceDescriptor: inspected, sampleFetch: sampleResult },
  };
  enriched.jurisdictionMatch = determineJurisdictionMatch(enriched, jurisdiction, sampleRecords);
  return enriched;
}

/* Builds the field-mapping preview + confidence tags for a candidate that
   has a real field list, and folds the field-coverage evidence into the
   candidate before scoring. Candidates with no field list yet (couldn't be
   inspected) skip this — they'll simply score lower via missing evidence,
   never guessed. */
function attachMappingPreview(candidate, canonicalFieldIds, requiredFieldIds, synonyms, sharedServiceCanonicalIds) {
  if (!candidate.fields || !candidate.fields.length) return candidate;

  const sourceFieldNames = candidate.fields.map(f => f.name);
  const mapperResult = mapFields(sourceFieldNames, canonicalFieldIds, synonyms);
  const validation = validateMapping(
    mapperResult.fieldMap, mapperResult.notProvidedBySource, canonicalFieldIds, requiredFieldIds,
  );
  const sampleRecord = (candidate.sampleRecords && candidate.sampleRecords[0]) || null;
  const mappingConfidence = tagMappingConfidence(mapperResult, {
    synonyms,
    sampleRecord,
    sharedServiceCanonicalIds,
  });

  return {
    ...candidate,
    fieldMapPreview: mapperResult,
    mappingValidation: validation,
    mappingConfidence,
    totalCanonicalFieldCount: canonicalFieldIds.length,
  };
}

/* Processes exactly one jurisdiction through the full source order,
   respecting maxCandidates and shortCircuit. Never throws — a source
   adapter's failure is recorded in target.errors and the loop moves on.
   Returns the target record (see file header for its required-fields
   list) plus the list of scored candidate records to persist. */
async function processJurisdiction(jurisdiction, ctx) {
  const startedAt = new Date().toISOString();
  const sourcesChecked = [];
  const sourcesSkipped = [];
  const errors = [];
  let allCandidates = [];

  for (const sourceName of DEFAULT_SOURCE_ORDER) {
    if (allCandidates.length >= ctx.maxCandidates) {
      sourcesSkipped.push({ source: sourceName, why: `--max-candidates (${ctx.maxCandidates}) already reached` });
      continue;
    }
    const adapter = ctx.adapters[sourceName];
    if (!adapter) continue;

    sourcesChecked.push(sourceName);
    let sourceResult;
    try {
      sourceResult = await adapter(jurisdiction, ctx);
    } catch (e) {
      errors.push({ source: sourceName, errorType: 'unknown', why: e.message });
      continue;
    }

    if (!sourceResult.ok) {
      errors.push({ source: sourceName, errorType: sourceResult.errorType, why: sourceResult.why });
      continue;
    }

    allCandidates.push(...(sourceResult.candidates || []));

    if (sourceResult.shortCircuit) {
      const remaining = DEFAULT_SOURCE_ORDER.slice(DEFAULT_SOURCE_ORDER.indexOf(sourceName) + 1);
      for (const skipped of remaining) {
        sourcesSkipped.push({ source: skipped, why: `${sourceName} matched confidently, remaining sources not needed` });
      }
      break;
    }
  }

  allCandidates = allCandidates.slice(0, ctx.maxCandidates);

  // Enrich (real schema + samples), attach field-mapping preview, then
  // score. Sequential per candidate within a jurisdiction — --concurrency
  // bounds cross-jurisdiction parallelism only, keeping this simple and
  // gentle on any one government server.
  const scoredCandidates = [];
  for (const stub of allCandidates) {
    const enriched = stub.source === 'shared_services'
      ? stub // already inspected inside the shared_services adapter itself
      : await enrichCandidate(stub, jurisdiction, ctx);
    const sharedServiceCanonicalIds = stub.source === 'shared_services' && stub.sharedServiceMatch
      ? new Set(Object.keys(stub.sharedServiceMatch.service.canonical_mapping_template || {}))
      : new Set();
    const withPreview = attachMappingPreview(
      enriched, ctx.canonicalFieldIds, ctx.requiredFieldIds, ctx.synonyms, sharedServiceCanonicalIds,
    );
    const scoring = scoreCandidate(withPreview);
    scoredCandidates.push({ ...withPreview, ...scoring, discoveredAt: new Date().toISOString() });
  }

  scoredCandidates.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const best = scoredCandidates.find(c => !c.rejected) || null;

  const finishedAt = new Date().toISOString();
  const target = {
    fips: jurisdiction.fips,
    name: jurisdiction.name,
    state: jurisdiction.state,
    facility_count: jurisdiction.facility_count ?? null,
    priority_rank: jurisdiction.priority_rank ?? null,
    status: errors.length && !scoredCandidates.length ? 'failed' : (scoredCandidates.length ? 'complete' : 'partial'),
    sourcesChecked,
    sourcesSkipped,
    candidateIds: scoredCandidates.map(c => c.candidateId),
    bestCandidateId: best ? best.candidateId : null,
    bestScore: best ? best.score : null,
    bestBand: best ? best.band : null,
    errors,
    startedAt,
    finishedAt,
  };

  return { target, candidates: scoredCandidates };
}

/* Bounded-concurrency map over jurisdictions. Exported so
   tests/test_parcel_discover_batch.mjs can assert peak in-flight count
   stays within `concurrency` using an injected counting adapter, without
   needing a real thread/worker model. */
export async function runDiscovery(jurisdictions, opts = {}) {
  const {
    adapters = defaultAdapters,
    maxCandidates = 8,
    concurrency = 3,
    cacheDir = null,
    outputDir = null,
    dryRun = false,
    resumeCompletedFips = new Set(),
    sharedServicesRegistry = null,
    synonyms = {},
    canonicalFieldIds = [],
    requiredFieldIds = [],
    timeoutMs,
    maxRetries,
  } = opts;

  const ctx = {
    adapters, maxCandidates, cacheDir, sharedServicesRegistry, synonyms,
    canonicalFieldIds, requiredFieldIds, timeoutMs, maxRetries,
    refresh: opts.refresh,
  };

  const toProcess = jurisdictions.filter(j => !resumeCompletedFips.has(j.fips));
  const skippedAlreadyComplete = jurisdictions
    .filter(j => resumeCompletedFips.has(j.fips))
    .map(j => ({
      target: { fips: j.fips, name: j.name, state: j.state, status: 'skipped-already-covered', candidateIds: [] },
      candidates: [],
    }));

  const results = new Array(toProcess.length);
  let nextIndex = 0;
  let peakInFlight = 0;
  let inFlight = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= toProcess.length) return;
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      try {
        results[i] = await processJurisdiction(toProcess[i], ctx);
      } finally {
        inFlight--;
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, toProcess.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const allResults = [...skippedAlreadyComplete, ...results];

  for (const { target, candidates } of allResults) {
    if (target.status === 'skipped-already-covered') continue;
    writeJsonIfEnabled(join(outputDir || '', 'targets', `${target.fips}.json`), target, { dryRun });
    for (const candidate of candidates) {
      writeJsonIfEnabled(join(outputDir || '', 'candidates', `${candidate.candidateId}.json`), candidate, { dryRun });
    }
  }

  return { results: allResults, peakInFlight };
}

/* Pure. Builds the human-readable summary.md content from a summary.json-
   shaped object. */
export function buildSummaryMarkdown(summary) {
  const lines = [];
  lines.push(`# Parcel discovery run ${summary.runId}`);
  lines.push('');
  lines.push(`Started: ${summary.startedAt}  `);
  lines.push(`Finished: ${summary.finishedAt}  `);
  lines.push(`Flags: \`${JSON.stringify(summary.flags)}\``);
  lines.push('');
  lines.push(`Targets processed: ${summary.targets.length}. Total candidates found: ${summary.totalCandidates}.`);
  lines.push('');
  lines.push('| FIPS | Name | State | Status | Best score | Band |');
  lines.push('|---|---|---|---|---|---|');
  for (const t of summary.targets) {
    lines.push(`| ${t.fips} | ${t.name || ''} | ${t.state || ''} | ${t.status} | ${t.bestScore ?? '-'} | ${t.bestBand ?? '-'} |`);
  }
  lines.push('');
  lines.push('## Counts by status');
  for (const [status, count] of Object.entries(summary.counts?.byStatus || {})) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');
  lines.push('## Counts by band');
  for (const [band, count] of Object.entries(summary.counts?.byBand || {})) {
    lines.push(`- ${band}: ${count}`);
  }
  return lines.join('\n') + '\n';
}

function buildSummary(runId, flags, allResults, startedAt) {
  const targets = allResults.map(r => ({
    fips: r.target.fips, name: r.target.name, state: r.target.state,
    status: r.target.status, bestScore: r.target.bestScore, bestBand: r.target.bestBand,
  }));
  const byStatus = {};
  const byBand = {};
  let totalCandidates = 0;
  for (const r of allResults) {
    byStatus[r.target.status] = (byStatus[r.target.status] || 0) + 1;
    if (r.target.bestBand) byBand[r.target.bestBand] = (byBand[r.target.bestBand] || 0) + 1;
    totalCandidates += r.candidates.length;
  }
  return {
    runId, startedAt, finishedAt: new Date().toISOString(), flags,
    targets, counts: { byStatus, byBand }, totalCandidates,
  };
}

function loadCatalog() {
  if (!existsSync(CATALOG_PATH)) return { meta: {}, shared_services: {}, jurisdictions: {} };
  return JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
}

function loadSynonyms() {
  if (!existsSync(SYNONYMS_PATH)) return {};
  const raw = JSON.parse(readFileSync(SYNONYMS_PATH, 'utf8'));
  return raw.synonyms || {};
}

function loadPriorityQueue({ next, state }) {
  const args = [join(ROOT, 'data', 'parcel_priority_queue.py'), '--next', String(next), '--json'];
  if (state) args.push('--state', state);
  const raw = execFileSync('python3', args, { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse(raw);
}

export function buildFipsJurisdictions(fipsCsv) {
  const fipsList = fipsCsv.split(',').map(s => s.trim()).filter(Boolean);
  let facilityMeta = {};
  const facilitiesPath = join(ROOT, 'data', 'facilities_index.json');
  if (existsSync(facilitiesPath)) {
    const facilities = JSON.parse(readFileSync(facilitiesPath, 'utf8'));
    for (const fac of facilities) {
      const fips = String(fac.county_fips || '').padStart(5, '0');
      if (!fips || fips === '00000') continue;
      if (!facilityMeta[fips]) facilityMeta[fips] = { name: null, state: null, count: 0 };
      // Not "first record for this FIPS wins": some facility records have
      // county/state_abbr blank even when county_fips is populated (e.g.
      // an early Skybox Hutto TX entry with county=null, state_abbr=null),
      // and grouping is unordered across records for the same FIPS -- a
      // real value should never be overwritten by a blank one encountered
      // later, and a blank placeholder should always be replaceable by a
      // real value found later. Same bug, independently, as
      // parcel_priority_queue.py's load_facility_counts().
      if (fac.county && !facilityMeta[fips].name) facilityMeta[fips].name = fac.county;
      if (fac.state_abbr && !facilityMeta[fips].state) facilityMeta[fips].state = fac.state_abbr;
      facilityMeta[fips].count++;
    }
  }
  return fipsList.map(fips => {
    const meta = facilityMeta[fips];
    if (!meta) {
      console.error(`WARNING: --fips ${fips} has no entry in facilities_index.json (no name/state known)`);
    }
    return {
      fips, name: meta ? meta.name : null, state: meta ? meta.state : null,
      facility_count: meta ? meta.count : null, priority_rank: null,
    };
  });
}

function parseArgs(argv) {
  const args = {
    next: null, fips: null, state: null, resume: null,
    maxCandidates: 8, concurrency: 3, output: null, refresh: false, dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--next') args.next = Number(argv[++i]);
    else if (a === '--fips') args.fips = argv[++i];
    else if (a === '--state') args.state = argv[++i];
    else if (a === '--resume') args.resume = argv[++i];
    else if (a === '--max-candidates') args.maxCandidates = Number(argv[++i]);
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--refresh') args.refresh = true;
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

function makeRunId() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputRoot = args.output || OUTPUT_ROOT;

  let runId = args.resume || makeRunId();
  const outputDir = join(outputRoot, runId);

  let resumeCompletedFips = new Set();
  if (args.resume) {
    if (!existsSync(outputDir)) {
      console.error(`FATAL: --resume ${args.resume} — no such run directory at ${outputDir}`);
      process.exit(2);
    }
    const targetsDir = join(outputDir, 'targets');
    if (existsSync(targetsDir)) {
      for (const file of readdirSync(targetsDir)) {
        if (!file.endsWith('.json')) continue;
        try {
          const t = JSON.parse(readFileSync(join(targetsDir, file), 'utf8'));
          if (t.status === 'complete') resumeCompletedFips.add(t.fips);
        } catch { /* corrupt target file — treat as not-yet-complete, will retry */ }
      }
    }
    console.log(`Resuming run ${runId}: ${resumeCompletedFips.size} FIPS already complete, skipping.`);
  }

  let jurisdictions;
  if (args.fips) {
    jurisdictions = buildFipsJurisdictions(args.fips);
  } else if (args.next) {
    const queue = loadPriorityQueue({ next: args.next, state: args.state });
    jurisdictions = queue.candidates.map(c => ({
      fips: c.fips, name: c.name, state: c.state,
      facility_count: c.facility_count, priority_rank: c.rank,
    }));
  } else {
    console.error('FATAL: one of --next or --fips is required.');
    process.exit(2);
  }

  const catalog = loadCatalog();
  const synonyms = loadSynonyms();
  const canonicalFieldIds = loadSchemaFieldIds();
  const requiredFieldIds = loadRequiredSchemaFieldIds();

  console.log(`Discovering parcel sources for ${jurisdictions.length} jurisdiction(s)` +
    (args.dryRun ? ' [DRY RUN — nothing will be written]' : ` -> ${outputDir}`));

  const startedAt = new Date().toISOString();
  const { results: allResults } = await runDiscovery(jurisdictions, {
    maxCandidates: args.maxCandidates,
    concurrency: args.concurrency,
    cacheDir: args.dryRun ? null : outputDir,
    outputDir,
    dryRun: args.dryRun,
    resumeCompletedFips,
    sharedServicesRegistry: catalog.shared_services,
    synonyms,
    canonicalFieldIds,
    requiredFieldIds,
    refresh: args.refresh,
  });

  const summary = buildSummary(runId, args, allResults, startedAt);
  const summaryMd = buildSummaryMarkdown(summary);

  writeJsonIfEnabled(join(outputDir, 'summary.json'), summary, { dryRun: args.dryRun });
  if (!args.dryRun) {
    mkdirp(outputDir);
    writeFileSync(join(outputDir, 'summary.md'), summaryMd);
  }

  console.log('\n' + summaryMd);
  if (!args.dryRun) {
    console.log(`Full results written to ${outputDir}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error('FATAL:', e.stack || e.message);
    process.exit(2);
  });
}
