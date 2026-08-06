/* tests/test_parcel_discover_batch.mjs — orchestration-only unit tests for
   data/parcel_pipeline/discover_batch.mjs's runDiscovery(), with every
   adapter STUBBED (no real network access): source-precedence ordering,
   shortCircuit skipping, --max-candidates cap, --concurrency actually
   bounding in-flight jurisdictions, --resume skip/retry behavior,
   --dry-run writes nothing to disk, plus determineJurisdictionMatch()'s
   anti-bbox-trust rules and buildSummaryMarkdown()'s pure rendering.

   Run:  node tests/test_parcel_discover_batch.mjs
*/
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runDiscovery, determineJurisdictionMatch, buildSummaryMarkdown, DEFAULT_SOURCE_ORDER,
} from '../data/parcel_pipeline/discover_batch.mjs';

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

function stubCandidate(source, jurisdiction, overrides = {}) {
  return {
    candidateId: `${jurisdiction.fips}-${source}-stub`,
    source, fips: jurisdiction.fips, jurisdictionName: jurisdiction.name, state: jurisdiction.state,
    serviceUrl: null, portalUrl: null,
    publisherType: 'official', publisherName: 'Stub Publisher',
    jurisdictionMatch: 'exact', geometryType: 'polygon', queryable: true,
    isTileOnly: false, requiresAuth: false, fields: null, sampleRecords: null, sampleNullRatio: null,
    staticDownloadOnly: false, ingested: false, raw: {},
    ...overrides,
  };
}

function emptyAdapter() {
  return async () => ({ ok: true, attempts: 1, candidates: [] });
}

function candidateAdapter(source, overrides = {}) {
  return async (jurisdiction) => ({ ok: true, attempts: 1, candidates: [stubCandidate(source, jurisdiction, overrides)] });
}

// ── determineJurisdictionMatch: anti-bbox-trust rules (no geometry/bbox input exists to trust) ──
{
  const jurisdiction = { fips: '99999', name: 'Example County', state: 'EX' };
  t('exact county-name value in a jurisdiction-shaped field -> exact',
    determineJurisdictionMatch({}, jurisdiction, [{ COUNTY_NAME: 'Example' }]), 'exact');
  t('non-matching value in a jurisdiction-shaped field -> wrong (real evidence, not just absence)',
    determineJurisdictionMatch({}, jurisdiction, [{ COUNTY_NAME: 'Some Other County' }]), 'wrong');
  t('no sample records, but title mentions the county name -> partial',
    determineJurisdictionMatch({ itemTitle: 'Example County Parcels' }, jurisdiction, null), 'partial');
  t('no sample records, no title match -> unknown (never assumed positive)',
    determineJurisdictionMatch({ itemTitle: 'Regional Parcels' }, jurisdiction, null), 'unknown');
  t('sample records present but no jurisdiction-shaped field at all -> falls through to title check',
    determineJurisdictionMatch({ itemTitle: 'Example County Parcels' }, jurisdiction, [{ PIN: '123', OWNER: 'JOHN DOE' }]), 'partial');
  ok('geometry/bbox fields are never inspected -- passing a bbox-shaped candidate never wins on their own',
    determineJurisdictionMatch({ itemTitle: '', raw: { bbox: [0, 0, 1, 1] } }, jurisdiction, null) === 'unknown');
}

// ── runDiscovery: source-precedence ordering + shortCircuit skips remaining sources ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const calledSources = [];
  const adapters = {
    shared_services: async (j, ctx) => {
      calledSources.push('shared_services');
      return { ok: true, attempts: 1, candidates: [stubCandidate('shared_services', j)], shortCircuit: true };
    },
    arcgis_online: async (j) => { calledSources.push('arcgis_online'); return { ok: true, attempts: 1, candidates: [] }; },
    arcgis_server: async (j) => { calledSources.push('arcgis_server'); return { ok: true, attempts: 1, candidates: [] }; },
    dcat: async (j) => { calledSources.push('dcat'); return { ok: true, attempts: 1, candidates: [] }; },
    ckan: async (j) => { calledSources.push('ckan'); return { ok: true, attempts: 1, candidates: [] }; },
    socrata: async (j) => { calledSources.push('socrata'); return { ok: true, attempts: 1, candidates: [] }; },
  };
  const { results } = await runDiscovery(
    [{ fips: '11111', name: 'Test County', state: 'TS' }],
    { adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 1 },
  );
  t('a confident shared_services shortCircuit means only shared_services is ever called', calledSources, ['shared_services']);
  t('the skipped sources are recorded, not silently dropped', results[0].target.sourcesSkipped.map(s => s.source),
    DEFAULT_SOURCE_ORDER.slice(1));
  t('shared_services candidate is still recorded as the best candidate', results[0].target.bestCandidateId, '11111-shared_services-stub');
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: without a shortCircuit, every source in DEFAULT_SOURCE_ORDER runs ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const calledSources = [];
  const adapters = Object.fromEntries(DEFAULT_SOURCE_ORDER.map(name => [
    name, async (j) => { calledSources.push(name); return { ok: true, attempts: 1, candidates: [] }; },
  ]));
  await runDiscovery(
    [{ fips: '22222', name: 'No Match County', state: 'TS' }],
    { adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 1 },
  );
  t('every source is checked in DEFAULT_SOURCE_ORDER when nothing short-circuits', calledSources, DEFAULT_SOURCE_ORDER);
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: --max-candidates caps total candidates and skips remaining sources once reached ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const adapters = {
    shared_services: emptyAdapter(),
    arcgis_online: async (j) => ({
      ok: true, attempts: 1,
      candidates: [stubCandidate('arcgis_online', j, { candidateId: 'a' }), stubCandidate('arcgis_online', j, { candidateId: 'b' })],
    }),
    arcgis_server: candidateAdapter('arcgis_server', { candidateId: 'c' }),
    dcat: candidateAdapter('dcat', { candidateId: 'd' }),
    ckan: candidateAdapter('ckan', { candidateId: 'e' }),
    socrata: candidateAdapter('socrata', { candidateId: 'f' }),
  };
  const { results } = await runDiscovery(
    [{ fips: '33333', name: 'Capped County', state: 'TS' }],
    { adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 1, maxCandidates: 2 },
  );
  t('candidates are capped at maxCandidates', results[0].target.candidateIds.length, 2);
  ok('sources beyond the cap are recorded as skipped for that reason',
    results[0].target.sourcesSkipped.some(s => /max-candidates/.test(s.why)));
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: --concurrency actually bounds peak in-flight jurisdictions ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  let liveCount = 0, observedPeak = 0;
  const slowAdapter = async () => {
    liveCount++;
    observedPeak = Math.max(observedPeak, liveCount);
    await new Promise(r => setTimeout(r, 20));
    liveCount--;
    return { ok: true, attempts: 1, candidates: [] };
  };
  const adapters = Object.fromEntries(DEFAULT_SOURCE_ORDER.map(name => [name, slowAdapter]));
  const jurisdictions = Array.from({ length: 6 }, (_, i) => ({ fips: String(40000 + i), name: `County ${i}`, state: 'TS' }));
  const { peakInFlight } = await runDiscovery(jurisdictions, {
    adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 2,
  });
  t('peakInFlight never exceeds the requested concurrency', peakInFlight <= 2, true);
  ok('concurrency actually parallelizes (peak > 1, not accidentally serial)', observedPeak > 1);
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: --resume skips FIPS already marked complete, retries the rest ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const calledFips = [];
  const adapters = Object.fromEntries(DEFAULT_SOURCE_ORDER.map(name => [
    name, async (j) => { calledFips.push(j.fips); return { ok: true, attempts: 1, candidates: [] }; },
  ]));
  const jurisdictions = [
    { fips: '50001', name: 'Already Done', state: 'TS' },
    { fips: '50002', name: 'Still Pending', state: 'TS' },
  ];
  const { results } = await runDiscovery(jurisdictions, {
    adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 2,
    resumeCompletedFips: new Set(['50001']),
  });
  ok('an already-complete FIPS is never re-passed to any adapter', !calledFips.includes('50001'));
  ok('a not-yet-complete FIPS is processed normally', calledFips.includes('50002'));
  const skippedTarget = results.find(r => r.target.fips === '50001');
  t('the skipped FIPS is recorded with status skipped-already-covered', skippedTarget.target.status, 'skipped-already-covered');
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: --dry-run writes nothing to disk ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const adapters = { ...Object.fromEntries(DEFAULT_SOURCE_ORDER.map(n => [n, emptyAdapter()])), arcgis_online: candidateAdapter('arcgis_online') };
  await runDiscovery(
    [{ fips: '60001', name: 'Dry Run County', state: 'TS' }],
    { adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 1 },
  );
  ok('dry-run leaves the output directory completely empty', !existsSync(join(dir, 'targets')) && !existsSync(join(dir, 'candidates')));
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: without --dry-run, targets/candidates are actually written ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const adapters = { ...Object.fromEntries(DEFAULT_SOURCE_ORDER.map(n => [n, emptyAdapter()])), arcgis_online: candidateAdapter('arcgis_online') };
  await runDiscovery(
    [{ fips: '60002', name: 'Written County', state: 'TS' }],
    { adapters, cacheDir: null, outputDir: dir, dryRun: false, concurrency: 1 },
  );
  ok('non-dry-run writes a target file', existsSync(join(dir, 'targets', '60002.json')));
  ok('non-dry-run writes a candidate file', readdirSync(join(dir, 'candidates')).length === 1);
  const written = JSON.parse(readFileSync(join(dir, 'targets', '60002.json'), 'utf8'));
  t('written target status is complete (a candidate was found)', written.status, 'complete');
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: an adapter that throws is recorded in errors, never crashes the run ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const adapters = {
    ...Object.fromEntries(DEFAULT_SOURCE_ORDER.map(n => [n, emptyAdapter()])),
    arcgis_online: async () => { throw new Error('simulated network crash'); },
  };
  const { results } = await runDiscovery(
    [{ fips: '70001', name: 'Crashy County', state: 'TS' }],
    { adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 1 },
  );
  ok('adapter throw is caught and recorded as an error, not propagated', results[0].target.errors.some(e => e.source === 'arcgis_online' && /simulated network crash/.test(e.why)));
  t('a jurisdiction with only a thrown adapter and no candidates is marked failed', results[0].target.status, 'failed');
  rmSync(dir, { recursive: true, force: true });
}

// ── runDiscovery: an adapter returning ok:false is recorded as a clean error, not a crash ──
{
  const dir = mkdtempSync(join(tmpdir(), 'discover-batch-test-'));
  const adapters = {
    ...Object.fromEntries(DEFAULT_SOURCE_ORDER.map(n => [n, emptyAdapter()])),
    dcat: async () => ({ ok: false, errorType: 'timeout', why: 'simulated timeout', attempts: 2, candidates: [] }),
  };
  const { results } = await runDiscovery(
    [{ fips: '70002', name: 'Timeout County', state: 'TS' }],
    { adapters, cacheDir: null, outputDir: dir, dryRun: true, concurrency: 1 },
  );
  ok('a clean ok:false adapter result is recorded with its errorType', results[0].target.errors.some(e => e.source === 'dcat' && e.errorType === 'timeout'));
  rmSync(dir, { recursive: true, force: true });
}

// ── buildSummaryMarkdown: pure rendering ──
{
  const summary = {
    runId: 'test-run-1', startedAt: '2026-08-06T00:00:00Z', finishedAt: '2026-08-06T00:05:00Z',
    flags: { next: 5 }, totalCandidates: 3,
    targets: [
      { fips: '11111', name: 'County A', state: 'TS', status: 'complete', bestScore: 90, bestBand: 'strong' },
      { fips: '22222', name: 'County B', state: 'TS', status: 'partial', bestScore: null, bestBand: null },
    ],
    counts: { byStatus: { complete: 1, partial: 1 }, byBand: { strong: 1 } },
  };
  const md = buildSummaryMarkdown(summary);
  ok('summary markdown includes the run id', md.includes('test-run-1'));
  ok('summary markdown includes a row per target', md.includes('| 11111 |') && md.includes('| 22222 |'));
  ok('summary markdown renders a missing score/band as a dash, not "null"', md.includes('| partial | - | - |'));
  ok('summary markdown includes status and band counts', md.includes('- complete: 1') && md.includes('- strong: 1'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
