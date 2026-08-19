/* tests/test_parcel_registry_integrity.mjs
 *
 * Unit tests for check_registry_integrity.mjs's validateReplacementHistory(),
 * the shape-check added for js/parcel/registry.js entries' optional
 * replacementHistory field. Synthetic fixtures only -- doesn't touch the
 * real registry.js, which currently has zero entries carrying this field.
 *
 * Run: node tests/test_parcel_registry_integrity.mjs
 */
import { validateReplacementHistory } from '../data/parcel_pipeline/check_registry_integrity.mjs';

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log(`FAIL  ${name}\n   got:  ${a}\n   want: ${e}`); }
}

t('undefined-shaped non-array input is rejected',
  validateReplacementHistory('not-an-array').length > 0, true);

t('empty array is valid (no entries yet)',
  validateReplacementHistory([]), []);

const complete = {
  old_value: 'https://old.example.gov/service', new_value: 'https://new.example.gov/service',
  changed_at: '2026-08-19', reason: 'endpoint migrated to new vendor domain',
  verified_via: 'github-actions-dispatch-probe-2026-08-19',
};
t('a fully-shaped record passes with zero problems',
  validateReplacementHistory([complete]), []);

t('a record missing reason and verified_via is flagged with exactly those two keys',
  validateReplacementHistory([{ old_value: 'a', new_value: 'b', changed_at: '2026-08-19' }]),
  ["replacementHistory[0] missing keys: [\"reason\",\"verified_via\"]"]);

t('a completely empty record object is flagged with all five keys',
  validateReplacementHistory([{}]).length, 1);

t('two records: one valid, one broken -- only the broken one is reported',
  validateReplacementHistory([complete, { old_value: 'x' }]).length, 1);

t('multiple broken records each get their own indexed problem',
  validateReplacementHistory([{}, {}]).length, 2);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
