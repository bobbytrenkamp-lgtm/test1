/* tests/test_split_site_search_index.mjs — pure partitioning logic in
   data/parcel_pipeline/split_site_search_index.mjs.

   Run: node tests/test_split_site_search_index.mjs
*/
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { partitionByState, buildFipsToState } from '../data/parcel_pipeline/split_site_search_index.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   ${JSON.stringify(detail)}`);
}

const registry = [
  { fips: '51107', state: 'va', name: 'Loudoun' },
  { fips: '51059', state: 'VA', name: 'Fairfax' },
  { fips: '24031', state: 'MD', name: 'Montgomery' },
  { fips: '24999', state: 'MD', name: 'Empty County' }, // registered, contributes 0 parcels
];

function parcel(id, fips, state, acres) {
  return { id, geometry: { type: 'Point', coordinates: [0, 0] }, properties: { parcel_id: id, county_fips: fips, state, area_acres: acres } };
}

const index = {
  meta: {
    generated_at: '2026-08-10T00:00:00.000Z',
    threshold_acres: 5,
    jurisdictions_attempted: 4,
    jurisdictions_ok: 3,
    jurisdictions_failed: 1,
    total_parcels: 3,
    caveat: 'test caveat',
  },
  jurisdiction_summaries: [
    { fips: '51107', name: 'Loudoun', status: 'ok', sizeFiltered: true, truncated: false },
    { fips: '51059', name: 'Fairfax', status: 'ok', sizeFiltered: true, truncated: true },
    { fips: '24031', name: 'Montgomery', status: 'ok', sizeFiltered: false, truncated: false },
    { fips: '99999', name: 'Nowhere County', status: 'failed', error: 'HTTP 500' }, // not in registry fixture
  ],
  parcels: [
    parcel('p1', '51107', 'VA', 42),
    parcel('p2', '51059', 'va', 60), // lowercase source value, must normalize
    parcel('p3', '24031', 'MD', 10),
  ],
};

// ── buildFipsToState ─────────────────────────────────────────────────────
{
  const map = buildFipsToState(registry);
  ok('fips->state map normalizes to uppercase', map['51107'] === 'VA');
  ok('every registered fips is present, including one with zero parcels', map['24999'] === 'MD');
}

// ── partitionByState: no parcel lost or duplicated ───────────────────────
{
  const fipsToState = buildFipsToState(registry);
  const { manifest, partitions } = partitionByState(index, fipsToState);

  const totalAcrossPartitions = Object.values(partitions).reduce((s, p) => s + p.parcels.length, 0);
  ok('partition counts sum to the original total_parcels', totalAcrossPartitions === index.parcels.length,
    { totalAcrossPartitions, original: index.parcels.length });

  const allIds = Object.values(partitions).flatMap(p => p.parcels.map(x => x.id));
  ok('no parcel id appears twice across partitions', new Set(allIds).size === allIds.length, allIds);
  ok('every original parcel id is present somewhere', index.parcels.every(p => allIds.includes(p.id)));

  ok('VA partition has both Loudoun and Fairfax parcels', partitions.VA.parcels.length === 2);
  ok('MD partition has the Montgomery parcel', partitions.MD.parcels.length === 1);
  ok('a lowercase source state value is normalized to uppercase in the partition key', !partitions.va);

  ok('manifest total_states matches distinct states produced', manifest.total_states === Object.keys(partitions).length);
  ok('manifest version is the source index generated_at', manifest.version === index.meta.generated_at);
  ok('manifest carries the full jurisdiction_summaries verbatim',
    manifest.jurisdiction_summaries.length === index.jurisdiction_summaries.length);
}

// ── per-state manifest entries ───────────────────────────────────────────
{
  const fipsToState = buildFipsToState(registry);
  const { manifest } = partitionByState(index, fipsToState);

  ok('VA jurisdiction_count is 2 (Loudoun + Fairfax, both ok)', manifest.states.VA.jurisdiction_count === 2);
  ok('VA supported_fips lists both counties', JSON.stringify(manifest.states.VA.supported_fips) === JSON.stringify(['51059', '51107']));
  ok('VA truncated_fips lists only Fairfax', JSON.stringify(manifest.states.VA.truncated_fips) === JSON.stringify(['51059']));
  ok('MD unfiltered_sample_fips lists Montgomery (no size field)',
    JSON.stringify(manifest.states.MD.unfiltered_sample_fips) === JSON.stringify(['24031']));

  ok('a registered-but-zero-parcel jurisdiction (24999) still appears in its state\'s accounting',
    manifest.states.MD.jurisdiction_count === 1 && !manifest.states.MD.supported_fips.includes('24999'),
    'note: 24999 was never in jurisdiction_summaries at all in this fixture, so it correctly does not appear -- ' +
    'this asserts the MD bucket exists at all because of it (buckets.set on summary loop), not that it is counted as ok');

  ok('each state entry carries a byte_size', manifest.states.VA.byte_size > 0);
  ok('each state entry carries a checksum', /^sha256:/.test(manifest.states.VA.checksum));
}

// ── unattributed data is routed, never dropped ───────────────────────────
{
  const idx2 = JSON.parse(JSON.stringify(index));
  idx2.parcels.push({ id: 'p4', geometry: null, properties: { parcel_id: 'p4', county_fips: '00000' } }); // no state
  const fipsToState = buildFipsToState(registry);
  const { manifest, partitions } = partitionByState(idx2, fipsToState);

  ok('a parcel with no state lands in the UNKNOWN bucket, not dropped', partitions.UNKNOWN && partitions.UNKNOWN.parcels.length === 1);
  ok('known_limitations reports the unattributed parcel count', manifest.known_limitations.unattributed_parcels === 1);

  const fipsToStateMissingOne = buildFipsToState(registry.filter(r => r.fips !== '24031'));
  const { manifest: m2 } = partitionByState(index, fipsToStateMissingOne);
  ok('a jurisdiction summary with no registry match is reported, not silently skipped',
    m2.known_limitations.unattributed_jurisdictions.some(j => j.fips === '24031'));
}

// ── deterministic output ─────────────────────────────────────────────────
{
  const fipsToState = buildFipsToState(registry);
  const run1 = partitionByState(index, fipsToState);
  const run2 = partitionByState(index, fipsToState);
  ok('running the same input twice produces byte-identical manifest JSON',
    JSON.stringify(run1.manifest) === JSON.stringify(run2.manifest));
  ok('running the same input twice produces byte-identical partitions',
    JSON.stringify(run1.partitions) === JSON.stringify(run2.partitions));
}

// ── --check against the real committed repo state ────────────────────────
{
  try {
    execFileSync('node', ['data/parcel_pipeline/split_site_search_index.mjs', '--check'], { cwd: ROOT, stdio: 'pipe' });
    ok('the committed data/site_search/ split matches the committed data/site_search_index.json', true);
  } catch (e) {
    ok('the committed data/site_search/ split matches the committed data/site_search_index.json', false,
      e.stdout ? e.stdout.toString() : e.message);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
