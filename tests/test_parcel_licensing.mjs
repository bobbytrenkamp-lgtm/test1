/* tests/test_parcel_licensing.mjs
 *
 * Unit tests for data/parcel_pipeline/classify_licensing.mjs's
 * classifyLicenseText() -- the conservative textual classifier that maps
 * a jurisdiction's free-text license research into a structured
 * license_status. Fixture strings only; does not touch the real registry.
 *
 * Includes a regression fixture for a real false-positive caught during
 * development: Fulton County GA's actual license text describes another
 * dataset as "freely usable" but explicitly concludes "unverified" for the
 * one actually in use -- an early version of this classifier wrongly
 * called that OPEN.
 *
 * Run: node tests/test_parcel_licensing.mjs
 */
import { classifyLicenseText, LICENSE_STATUSES } from '../data/parcel_pipeline/classify_licensing.mjs';

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log(`FAIL  ${name}\n   got:  ${a}\n   want: ${e}`); }
}

t('empty string is UNKNOWN', classifyLicenseText('').license_status, 'UNKNOWN');
t('null-ish is UNKNOWN', classifyLicenseText(undefined).license_status, 'UNKNOWN');

t('an explicit [Unresearched: ...] marker is UNKNOWN',
  classifyLicenseText('Public government data. [Unresearched: checked X and Y, no terms page found. Not verified.]').license_status,
  'UNKNOWN');

t('an explicit "public domain" statement is PUBLIC_DOMAIN',
  classifyLicenseText('Alameda County releases its open datasets under a Public Domain license — no commercial-use restriction was found.').license_status,
  'PUBLIC_DOMAIN');

t('an explicit CC BY license is ATTRIBUTION_REQUIRED, not just OPEN',
  classifyLicenseText('SGID data is licensed under Creative Commons Attribution 4.0 International (CC BY 4.0) — commercial use is permitted provided the source is credited.').license_status,
  'ATTRIBUTION_REQUIRED');
t('ATTRIBUTION_REQUIRED implies attribution_required: true',
  classifyLicenseText('Data must be credited to the county in any derived product.').attribution_required,
  true);

t('an explicit resale prohibition is RESTRICTED',
  classifyLicenseText('The service is "as is" with no warranty; nobody may sell the data except under a separate written agreement.').license_status,
  'RESTRICTED');
t('a bulk-transfer restriction is RESTRICTED even alongside a public-domain statement',
  classifyLicenseText('The data is in the public domain and distributed without warranty, but the site is not intended for the bulk transfer of data — verify before any large-scale automated pull.').license_status,
  'RESTRICTED');

t('a generic "no warranty" disclaimer with no explicit commercial-use statement is TERMS_UNCLEAR, not OPEN',
  classifyLicenseText('The county disclaims all warranties of accuracy or completeness. No explicit commercial-use or redistribution clause was found via web search; verify directly before commercial use.').license_status,
  'TERMS_UNCLEAR');

// Regression fixture: real text from this registry (Fulton County GA) that
// an earlier, looser version of the OPEN_SIGNALS list misclassified.
t('a permissive phrase describing a DIFFERENT dataset, followed by an explicit "unverified" conclusion, is TERMS_UNCLEAR not OPEN',
  classifyLicenseText(
    "Fulton County's data disclaimer says its data contains known errors/inconsistencies and the county in no way "
    + "ensures, represents, or warrants accuracy or reliability for any purpose; individual datasets have been "
    + "described elsewhere as freely usable with credit, but no blanket commercial-use or redistribution policy "
    + "for the current gisdata.fultoncountyga.gov portal was found via web search. Treat commercial-use terms as unverified."
  ).license_status,
  'TERMS_UNCLEAR');

t('an explicit "no license required" statement is OPEN',
  classifyLicenseText('The county states its GIS data is public information with no license required to use it.').license_status,
  'OPEN');
t('OPEN via this classifier is only medium confidence, never high (no formal grant was found)',
  classifyLicenseText('The county states its GIS data is public information with no license required to use it.').confidence_level,
  'medium');

t('an explicit noncommercial-only clause is NONCOMMERCIAL',
  classifyLicenseText('This dataset is licensed for noncommercial use only.').license_status,
  'NONCOMMERCIAL');

t('every classification uses a real enum value from LICENSE_STATUSES', (() => {
  const samples = [
    '', 'public domain', 'CC BY 4.0 required', 'nobody may sell', 'noncommercial use only',
    'no license required', 'a completely generic disclaimer with no explicit statement',
  ];
  return samples.every((s) => LICENSE_STATUSES.includes(classifyLicenseText(s).license_status));
})(), true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
