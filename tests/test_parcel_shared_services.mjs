/* tests/test_parcel_shared_services.mjs — unit tests for
   data/parcel_pipeline/discovery/shared_services.mjs's matchSharedServices,
   run against the REAL data/parcel_source_catalog.json shared_services
   registry (currently seeded with nj-mod-iv-composite and
   md-parcelboundaries, transcribed from already-verified session data) —
   not synthetic fixtures, so this doubles as a regression check that the
   seed data itself still matches what it claims to cover.

   Run:  node tests/test_parcel_shared_services.mjs
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchSharedServices } from '../data/parcel_pipeline/discovery/shared_services.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'data', 'parcel_source_catalog.json'), 'utf8'));
const sharedServices = catalog.shared_services;

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

ok('catalog has a shared_services key to test against', sharedServices && Object.keys(sharedServices).length >= 2);

// ── known-fips matches: exactly the FIPS the seed data claims to cover ──
{
  const hudson = matchSharedServices({ fips: '34017', state: 'NJ', name: 'Hudson County' }, sharedServices);
  t('Hudson County NJ (34017) matches nj-mod-iv-composite as known-fips', hudson?.serviceId, 'nj-mod-iv-composite');
  t('Hudson County NJ: confidence is known-fips (not just state-match)', hudson?.confidence, 'known-fips');
  t('Hudson County NJ: filterValue resolved from known_filter_values', hudson?.filterValue, 'HUDSON');
  t('Hudson County NJ: filterField is the service\'s county_filter_field', hudson?.filterField, 'COUNTY');
}
{
  const essex = matchSharedServices({ fips: '34013', state: 'NJ', name: 'Essex County' }, sharedServices);
  t('Essex County NJ (34013) matches nj-mod-iv-composite as known-fips', essex?.serviceId, 'nj-mod-iv-composite');
  t('Essex County NJ: filterValue resolved correctly', essex?.filterValue, 'ESSEX');
}
{
  const baci = matchSharedServices({ fips: '24510', state: 'MD', name: 'Baltimore city' }, sharedServices);
  t('Baltimore City MD (24510) matches md-parcelboundaries as known-fips', baci?.serviceId, 'md-parcelboundaries');
  t('Baltimore City MD: filterValue is BACI', baci?.filterValue, 'BACI');
}
{
  const pg = matchSharedServices({ fips: '24033', state: 'MD', name: 'Prince George\'s County' }, sharedServices);
  t('Prince George\'s County MD (24033) matches md-parcelboundaries as known-fips', pg?.serviceId, 'md-parcelboundaries');
  t('Prince George\'s County MD: filterValue is PRIN', pg?.filterValue, 'PRIN');
}

// ── state-match-only: covered_fips includes it but no known_filter_values entry ──
// (Montgomery/Howard MD are bbox-scoped in the real seed data -- covered by
// covered_fips but with no known_filter_values entry, per the catalog's own
// known_caveats warning about that being a weaker scoping method.)
{
  const montgomery = matchSharedServices({ fips: '24031', state: 'MD', name: 'Montgomery County' }, sharedServices);
  t('Montgomery County MD (24031) matches md-parcelboundaries', montgomery?.serviceId, 'md-parcelboundaries');
  t('Montgomery County MD: known-fips (listed in covered_fips) even with no known_filter_values entry',
    montgomery?.confidence, 'known-fips');
  t('Montgomery County MD: no known_filter_values entry -> filterValue is null (never guessed)', montgomery?.filterValue, null);
}

// ── state-match-only: state covered, but this specific fips isn't in covered_fips ──
{
  const otherNJ = matchSharedServices({ fips: '34001', state: 'NJ', name: 'Atlantic County' }, sharedServices);
  t('Atlantic County NJ (34001, not in covered_fips) still matches nj-mod-iv-composite via state', otherNJ?.serviceId, 'nj-mod-iv-composite');
  t('Atlantic County NJ: confidence is state-match-only, not known-fips', otherNJ?.confidence, 'state-match-only');
  t('Atlantic County NJ: no known_filter_values entry -> filterValue null (never guessed)', otherNJ?.filterValue, null);
}

// ── no match: neither fips nor state covered by anything ──
{
  const uncovered = matchSharedServices({ fips: '06037', state: 'CA', name: 'Los Angeles County' }, sharedServices);
  t('Los Angeles County CA (uncovered state/fips) matches nothing', uncovered, null);
}
t('null sharedServicesRegistry returns null, not a throw',
  matchSharedServices({ fips: '34017', state: 'NJ', name: 'Hudson' }, null), null);
t('empty sharedServicesRegistry object returns null', matchSharedServices({ fips: '34017', state: 'NJ', name: 'Hudson' }, {}), null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
