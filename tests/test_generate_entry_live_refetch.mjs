/* tests/test_generate_entry_live_refetch.mjs
 *
 * Unit tests for data/parcel_pipeline/generate_entry.mjs's
 * liveRefetchFields() -- its offline guard branches (no service_url, wrong
 * source_type) that never need to make a network call. The actual live
 * ArcGIS fetch path is exercised manually (this sandbox has no outbound
 * network to arbitrary domains), same as this whole pipeline's other
 * network-touching functions.
 *
 * Run: node tests/test_generate_entry_live_refetch.mjs
 */
import { liveRefetchFields } from '../data/parcel_pipeline/generate_entry.mjs';

let pass = 0, fail = 0;
async function t(name, actualPromise, expected) {
  const actual = await actualPromise;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log(`FAIL  ${name}\n   got:  ${a}\n   want: ${e}`); }
}

await t('no service_url on the catalog record -- fields null with a clear reason',
  liveRefetchFields({ service_url: null }),
  { fields: null, why: 'catalog record has no service_url to refetch' });

await t('a non-ArcGIS source_type is rejected without attempting a fetch',
  liveRefetchFields({ service_url: 'https://example.com/data.geojson', source_type: 'geojson' }),
  { fields: null, why: "--live-refetch only supports ArcGIS sources, this is 'geojson'" });

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
