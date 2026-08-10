/* TEMP diagnostic script, round 2 -- uses the REAL build script's own
 * functions (computeSizeWhere/buildQueryUrl/fetchJurisdictionRecords)
 * against the 4 currently-failing jurisdictions, instead of a simplified
 * hand-rolled query. Round 1 (f=json, outFields=*, resultRecordCount=1)
 * showed misleading "it works" results for jurisdictions where the REAL
 * script's f=geojson + restricted outFields + resultRecordCount=2000 +
 * returnGeometry=true + no-pagination-at-all behaves differently. Deleted
 * once the real root cause is found and fixed.
 *
 * Run only in CI (this sandbox has no outbound access to these domains).
 */
import { loadRegistry } from './lib/load_registry.mjs';
import {
  computeSizeWhere, buildQueryUrl, fetchJurisdictionRecords,
  DEFAULT_THRESHOLD_ACRES, DEFAULT_CAP_PER_JURISDICTION,
} from './build_national_site_index.mjs';

const TARGET_FIPS = ['24031', '18097', '10003', '32003'];

const registry = loadRegistry();
const byFips = new Map(registry.all().map(j => [j.fips, j]));

for (const fips of TARGET_FIPS) {
  const j = byFips.get(fips);
  console.log(`\n${'='.repeat(70)}\n${fips}  ${j ? j.name : 'NOT FOUND IN REGISTRY'}\n${'='.repeat(70)}`);
  if (!j) continue;

  const whereInfo = computeSizeWhere(j.fieldMap, DEFAULT_THRESHOLD_ACRES);
  const url = buildQueryUrl(j, whereInfo, DEFAULT_CAP_PER_JURISDICTION);
  console.log('REAL query URL:', url);

  const t0 = Date.now();
  const result = await fetchJurisdictionRecords(j, { thresholdAcres: DEFAULT_THRESHOLD_ACRES, cap: DEFAULT_CAP_PER_JURISDICTION });
  const elapsed = Date.now() - t0;
  console.log(`elapsed: ${elapsed}ms`);
  console.log('ok:', result.ok);
  if (result.ok) {
    console.log('records:', result.records.length, ' truncated:', result.truncated, ' sizeFiltered:', result.sizeFiltered);
  } else {
    console.log('error:', result.error);
  }

  // Also try the exact same query but with f=json instead of f=geojson,
  // to isolate whether the geojson output format itself is the problem.
  const urlJson = new URL(url);
  urlJson.searchParams.set('f', 'json');
  console.log('\n-- same query, f=json instead of f=geojson --');
  const t1 = Date.now();
  try {
    const res = await fetch(urlJson.toString());
    const body = await res.json();
    console.log(`elapsed: ${Date.now() - t1}ms  HTTP ${res.status}`);
    if (body.error) console.log('ERROR (full):', JSON.stringify(body.error, null, 2));
    else console.log('features:', (body.features || []).length, ' exceededTransferLimit:', body.exceededTransferLimit);
  } catch (e) {
    console.log('fetch threw:', e.message);
  }
}
