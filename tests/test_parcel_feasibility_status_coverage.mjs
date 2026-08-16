/* tests/test_parcel_feasibility_status_coverage.mjs
 *
 * Regression guard for a real bug found during a weak-point audit: STATUS_META
 * and ELIGIBILITY_SCORE in js/parcel/feasibility.js only covered 9 of the 12
 * permission_status values data/zoning/schemas/permitted_use.schema.json
 * actually allows a researcher to record. A status outside that smaller set
 * (e.g. "special_exception" -- the term Virginia counties like Fairfax use
 * for the same kind of legislative-body approval "special_use_permit"
 * names elsewhere) silently fell through to the generic "Unknown" bucket
 * and a 20-point score, exactly as if the district had never been
 * researched at all -- even though a human had recorded a real, specific
 * finding for it.
 *
 * This test reads the real schema file's enum directly, so it fails the
 * moment either list drifts out of sync again, in either direction.
 *
 * Run: node tests/test_parcel_feasibility_status_coverage.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) console.log(`   (see: ${name})`);
}

const schema = JSON.parse(readFileSync(
  join(ROOT, 'data', 'zoning', 'schemas', 'permitted_use.schema.json'), 'utf8'));
const schemaStatuses = schema.properties.permission_status.enum;
ok('the schema file actually has a non-empty permission_status enum to check against',
  Array.isArray(schemaStatuses) && schemaStatuses.length > 0);

const FEASIBILITY_SRC = readFileSync(join(ROOT, 'js', 'parcel', 'feasibility.js'), 'utf8');
const sandboxWindow = {};
new Function('window', FEASIBILITY_SRC)(sandboxWindow);
const F = sandboxWindow.PARCEL_FEASIBILITY;

ok('PARCEL_FEASIBILITY loaded', !!F);
ok('STATUS_META is exported for testing', !!F.STATUS_META);

for (const status of schemaStatuses) {
  ok(`STATUS_META has a real (non-"unknown") entry for schema status "${status}"`,
    !!F.STATUS_META[status] && F.STATUS_META[status] !== F.STATUS_META.unknown);
}

// ELIGIBILITY_SCORE isn't exported publicly, so this exercises it the way a
// real caller does: through assess()'s composite score, using a mock
// window.ZONING dataset with one district per schema status. A status
// wired into STATUS_META but not ELIGIBILITY_SCORE would silently score as
// if unresearched (the `?? 20` fallback in _eligibilityScore) -- this
// catches that half of the same class of bug.
sandboxWindow.ZONING = {
  hasCoverage: () => true,
  getCachedByFips: () => ({
    districts: Object.fromEntries(schemaStatuses.map(status => [
      `D-${status}`,
      { uses: [{ standardized_use_id: 'data_center', permission_status: status, confidence_level: 'high' }] },
    ])),
    jurisdiction: { jurisdiction_name: 'Test County' },
  }),
};

// Statuses that genuinely SHOULD land on the same 20-point score as "we
// don't know" -- they are, semantically, some flavor of "we don't know".
// Every other schema status must NOT collide with that value, or it is
// indistinguishable from an unresearched district.
const GENUINELY_AMBIGUOUS = new Set(['not_listed', 'unclear', 'manual_review_required']);

for (const status of schemaStatuses) {
  const result = F.assess({ county_fips: '51999', zoning_code: `D-${status}`, area_acres: 10 }, '51999');
  const eligibilityFactor = result.available && (result.factors || []).find(f => f.id === 'eligibility');
  ok(`assess() computes an eligibility factor for status "${status}"`, !!eligibilityFactor);
  if (!eligibilityFactor) continue;

  if (status === 'prohibited') {
    ok('prohibited scores exactly 0', eligibilityFactor.score === 0);
  } else if (status === 'permitted_by_right') {
    ok('permitted_by_right scores exactly 100', eligibilityFactor.score === 100);
  } else if (GENUINELY_AMBIGUOUS.has(status)) {
    ok(`"${status}" is genuinely ambiguous and correctly scores 20`, eligibilityFactor.score === 20);
  } else {
    ok(`a specifically-researched status ("${status}") does not collide with the generic 20-point unresearched score`,
      eligibilityFactor.score !== 20);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
