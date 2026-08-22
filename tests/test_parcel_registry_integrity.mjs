/* tests/test_parcel_registry_integrity.mjs
 *
 * Unit tests for check_registry_integrity.mjs's validateReplacementHistory(),
 * the shape-check added for js/parcel/registry.js entries' optional
 * replacementHistory field. Synthetic fixtures only -- doesn't touch the
 * real registry.js, which currently has zero entries carrying this field.
 *
 * Run: node tests/test_parcel_registry_integrity.mjs
 */
import { validateReplacementHistory, validateLicenseFields } from '../data/parcel_pipeline/check_registry_integrity.mjs';

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

// ---------------------------------------------------------------------------
// validateLicenseFields
// ---------------------------------------------------------------------------

t('an attribution object with no license_status has no problems (not yet classified)',
  validateLicenseFields({}), []);

t('a fully-shaped TERMS_UNCLEAR record passes with zero problems',
  validateLicenseFields({
    license: 'A real disclaimer was found but made no explicit statement on commercial use.',
    license_status: 'TERMS_UNCLEAR', commercial_use_status: 'unknown',
    redistribution_status: 'unknown', attribution_required: null, confidence_level: 'none',
  }), []);

t('an invalid license_status value is flagged',
  validateLicenseFields({ license_status: 'TOTALLY_FREE' }).length > 0, true);

t('an invalid commercial_use_status value is flagged',
  validateLicenseFields({ license_status: 'OPEN', commercial_use_status: 'sort-of' }).length > 0, true);

t('attribution_required as a string instead of boolean/null is flagged',
  validateLicenseFields({ license_status: 'OPEN', attribution_required: 'yes' }).length > 0, true);

t('attribution_required as null is valid',
  validateLicenseFields({ license_status: 'UNKNOWN', attribution_required: null }), []);

t('RESTRICTED with no supporting license text is flagged',
  validateLicenseFields({ license_status: 'RESTRICTED' }).length > 0, true);

t('RESTRICTED with real supporting license text is not flagged for missing evidence',
  validateLicenseFields({
    license_status: 'RESTRICTED',
    license: 'The county explicitly prohibits resale of this dataset without a separate written agreement.',
  }), []);

t('TERMS_UNCLEAR with no license text is fine (no evidence requirement for an honest unknown)',
  validateLicenseFields({ license_status: 'TERMS_UNCLEAR' }), []);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
