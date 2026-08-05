/* tests/test_parcel_mapping_validator.mjs — unit tests for
   data/parcel_pipeline/validate_field_mapping.mjs's pure validateMapping()
   function: the generalized version of this session's disposable
   per-county 30-field gap/overlap/unknown checkers.

   Run:  node tests/test_parcel_mapping_validator.mjs
*/
import { validateMapping } from '../data/parcel_pipeline/validate_field_mapping.mjs';

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}

const canonical = ['parcel_id', 'pin', 'address', 'county_fips'];

// ── Complete, non-overlapping coverage passes ──
{
  const result = validateMapping(
    { parcel_id: 'APN', county_fips: '__computed__' },
    ['pin', 'address'],
    canonical
  );
  t('complete coverage: ok', result.ok, true);
  t('complete coverage: no missing', result.missing, []);
  t('complete coverage: no extra', result.extra, []);
  t('complete coverage: no overlap', result.overlap, []);
}

// ── A gap (neither mapped nor declared absent) fails ──
{
  const result = validateMapping(
    { parcel_id: 'APN', county_fips: '__computed__' },
    ['pin'], // 'address' is in neither list
    canonical
  );
  t('gap: not ok', result.ok, false);
  t('gap: missing lists address', result.missing, ['address']);
}

// ── An overlap (claimed both mapped and absent) fails ──
{
  const result = validateMapping(
    { parcel_id: 'APN', pin: 'PIN', county_fips: '__computed__' },
    ['pin', 'address'], // 'pin' is contradictorily in both lists
    canonical
  );
  t('overlap: not ok', result.ok, false);
  t('overlap: lists pin', result.overlap, ['pin']);
}

// ── An unrecognized field id (not a real canonical field) fails ──
{
  const result = validateMapping(
    { parcel_id: 'APN', not_a_real_field: 'X', county_fips: '__computed__' },
    ['pin', 'address'],
    canonical
  );
  t('unknown field: not ok', result.ok, false);
  t('unknown field: lists not_a_real_field', result.extra, ['not_a_real_field']);
}

// ── Empty inputs against an empty canonical list is trivially ok ──
{
  const result = validateMapping({}, [], []);
  t('empty everything: ok', result.ok, true);
}

// ── A required field (parcel_id) landing in notProvidedBySource is a hard failure ──
{
  const result = validateMapping(
    { pin: 'PIN', county_fips: '__computed__' },
    ['parcel_id', 'address'], // parcel_id wrongly claimed absent instead of mapped
    canonical,
    ['parcel_id']
  );
  t('required field missing: not ok', result.ok, false);
  t('required field missing: reported', result.requiredMissing, ['parcel_id']);
}

// ── A required field that IS mapped passes, even with other gaps flagged ──
{
  const result = validateMapping(
    { parcel_id: 'APN', county_fips: '__computed__' },
    ['pin', 'address'],
    canonical,
    ['parcel_id']
  );
  t('required field present: ok', result.ok, true);
  t('required field present: no requiredMissing', result.requiredMissing, []);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
