/* tests/test_zoning_frontend_coverage.mjs
 *
 * js/zoning.js's FIPS_TO_JURISDICTION map is the single gate the browser
 * uses to decide whether a county's zoning data is reachable at all
 * (window.ZONING.hasCoverage, the Zoning Districts map layer in
 * js/zoning-map.js, and the parcel panel's zoning tab all key off it).
 * Prince William County's real, live-verified zoning geometry (2,227
 * features, data/zoning/normalized/va-prince-william-county.json,
 * data/zoning/geometry/va-prince-william-county.geojson) shipped to disk
 * in PR #522 but was never added to this map -- the data existed and was
 * completely unreachable from the UI. This test pins the fix and guards
 * against the same class of regression for any jurisdiction that already
 * has a normalized file on disk.
 *
 * Run:  node tests/test_zoning_frontend_coverage.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

function loadWindowScript(path, globalName) {
  const src = readFileSync(path, 'utf8');
  const sandboxWindow = {};
  new Function('window', src)(sandboxWindow);
  return sandboxWindow[globalName];
}

const ZONING = loadWindowScript(join(ROOT, 'js', 'zoning.js'), 'ZONING');

ok('js/zoning.js exports window.ZONING', !!ZONING);
ok('ZONING exposes hasCoverage()', typeof ZONING.hasCoverage === 'function');
ok('ZONING exposes FIPS_TO_JURISDICTION for zoning-map.js to key off',
  !!ZONING.FIPS_TO_JURISDICTION && typeof ZONING.FIPS_TO_JURISDICTION === 'object');

ok('Loudoun County (51107) has coverage', ZONING.hasCoverage('51107'));
ok('Prince William County (51153) has coverage', ZONING.hasCoverage('51153'));
ok('Fairfax County (51059) has coverage', ZONING.hasCoverage('51059'));
ok('An uncovered county (e.g. Montgomery County MD 24031, never wired) correctly reports no coverage -- never guessed',
  !ZONING.hasCoverage('24031'));

// ── Regression guard: every jurisdiction with a real normalized file on
// disk must be reachable via FIPS_TO_JURISDICTION. This is exactly the gap
// PR #522 left open for Prince William -- catch it mechanically instead of
// relying on someone noticing the map is stale.
const normalizedDir = join(ROOT, 'data', 'zoning', 'normalized');
const normalizedIds = existsSync(normalizedDir)
  ? readdirSync(normalizedDir).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''))
  : [];
ok('At least one normalized zoning file exists on disk to check against', normalizedIds.length > 0);

const wiredIds = new Set(Object.values(ZONING.FIPS_TO_JURISDICTION || {}));
for (const jid of normalizedIds) {
  ok(`Jurisdiction with real normalized data on disk (${jid}) is wired into FIPS_TO_JURISDICTION`,
    wiredIds.has(jid));
}

// ── Regression guard: the "no zoning data available" panel (js/zoning-
// details.js's renderNoCoverage) used to hardcode "Pilot coverage: Loudoun
// County, VA (FIPS 51107)" as prose -- stale the moment Prince William and
// Fairfax were wired in above. It was switched to build its coverage line
// from ZONING.coveredJurisdictionLabels() instead. Pin that every wired
// jurisdiction has a real label (not its raw id) so the message can never
// silently regress to showing "va-loudoun-county" or go stale again.
ok('ZONING exposes coveredJurisdictionLabels() for the no-coverage panel',
  typeof ZONING.coveredJurisdictionLabels === 'function');
ok('ZONING exposes JURISDICTION_LABELS', !!ZONING.JURISDICTION_LABELS && typeof ZONING.JURISDICTION_LABELS === 'object');

for (const jid of wiredIds) {
  ok(`Wired jurisdiction (${jid}) has a human-readable display label, not just its raw id`,
    typeof ZONING.JURISDICTION_LABELS[jid] === 'string' && ZONING.JURISDICTION_LABELS[jid] !== jid);
}

const labels = ZONING.coveredJurisdictionLabels();
ok('coveredJurisdictionLabels() returns one label per wired jurisdiction',
  labels.length === wiredIds.size);
ok('coveredJurisdictionLabels() output never contains a raw jurisdiction id',
  !labels.some(l => wiredIds.has(l)));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
