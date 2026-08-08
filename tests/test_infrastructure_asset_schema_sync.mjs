/* tests/test_infrastructure_asset_schema_sync.mjs
 *
 * js/infrastructure/asset-schema.js hand-mirrors the enum vocabulary
 * data/infrastructure_asset_schema.py defines, for synchronous browser-side
 * use (a badge/filter that can't wait on an async fetch). Two independent
 * copies of the same vocabulary can only stay honest if something actually
 * checks they match -- this shells out to the Python module's own
 * `--dump-enums` output (the same source of truth the schema's tests
 * already trust) and diffs it against the JS file's constants, the same
 * discipline check_registry_integrity.mjs already applies to the parcel
 * connector-type enum.
 *
 * Run:  node tests/test_infrastructure_asset_schema_sync.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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

// Load the JS mirror the same window-shim way load_registry.mjs already
// loads js/parcel/registry.js -- these are classic scripts, not ES modules.
function loadWindowScript(path, globalName) {
  const src = readFileSync(path, 'utf8');
  const sandboxWindow = {};
  new Function('window', src)(sandboxWindow);
  return sandboxWindow[globalName];
}

const jsSchema = loadWindowScript(join(ROOT, 'js', 'infrastructure', 'asset-schema.js'), 'INFRA_ASSET_SCHEMA');

let pyEnums;
try {
  const raw = execFileSync('python3', ['-m', 'data.infrastructure_asset_schema', '--dump-enums'], {
    cwd: ROOT, encoding: 'utf8',
  });
  pyEnums = JSON.parse(raw);
} catch (e) {
  console.log(`SKIP  python3 -m data.infrastructure_asset_schema not runnable here: ${e.message}`);
  console.log('\n0 passed, 0 failed (skipped)');
  process.exit(0);
}

ok('JS mirror exports INFRA_ASSET_SCHEMA', !!jsSchema);

t('asset_types match the Python module exactly', jsSchema.ASSET_TYPES, pyEnums.asset_types);
t('evidence_tiers match the Python module exactly', jsSchema.EVIDENCE_TIERS, pyEnums.evidence_tiers);
t('fiber_evidence_tiers match the Python module exactly', jsSchema.FIBER_EVIDENCE_TIERS, pyEnums.fiber_evidence_tiers);
t('geometry_types match the Python module exactly', jsSchema.GEOMETRY_TYPES, pyEnums.geometry_types);
t('status_values match the Python module exactly', jsSchema.STATUS_VALUES, pyEnums.status_values);

// ── helper functions behave consistently with the enums they wrap ──────
ok('isAssetType true for a real type', jsSchema.isAssetType('substation'));
ok('isAssetType false for an unknown type', !jsSchema.isAssetType('nuclear_reactor'));
ok('isEvidenceTier true for OBSERVED', jsSchema.isEvidenceTier('OBSERVED'));
ok('isEvidenceTier false for a fiber-only tier (wrong vocabulary)', !jsSchema.isEvidenceTier('KNOWN_ROUTE'));
ok('isFiberEvidenceTier true for KNOWN_ROUTE', jsSchema.isFiberEvidenceTier('KNOWN_ROUTE'));
ok('isFiberEvidenceTier false for a generic tier (wrong vocabulary)', !jsSchema.isFiberEvidenceTier('OBSERVED'));

t('evidenceTierLabel never claims a route is known for BROADBAND_AVAILABILITY',
  jsSchema.evidenceTierLabel('BROADBAND_AVAILABILITY').toLowerCase().includes('not physical fiber'), true);
ok('evidenceTierLabel has some fallback for an unrecognized tier',
  typeof jsSchema.evidenceTierLabel('made_up') === 'string' && jsSchema.evidenceTierLabel('made_up').length > 0);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
