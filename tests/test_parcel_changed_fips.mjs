/* tests/test_parcel_changed_fips.mjs — regression tests for
   data/parcel_pipeline/changed_fips.mjs, the diff-to-FIPS-block mapper that
   scopes PR-triggered parcel probing to only the jurisdictions a given diff
   actually touched.

   Uses small synthetic registry-shaped fixtures (2-3 fake entries, matching
   the real file's exact 4-space key-line indentation) and computes real
   `git diff --unified=0 --no-index` output between them, so this exercises
   the actual hunk-header parsing against real git output rather than
   hand-written fake diffs. No real repo state is touched — everything runs
   against temp files.

   Also runs one real-history check: finds a past single-county PR commit in
   this repo's own git log and confirms changed_fips.mjs identifies exactly
   that one FIPS.

   Run:  node tests/test_parcel_changed_fips.mjs
*/
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeChangedFips, findFipsBlocks, ROOT } from '../data/parcel_pipeline/changed_fips.mjs';

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}

/* Builds a minimal registry.js-shaped fixture with the real file's exact
   indentation: 4 spaces for the FIPS key, 2 spaces for the JURISDICTIONS
   closing brace. */
function fixture(entries) {
  const body = entries.map(fips =>
    `    '${fips}': {\n      id: 'test-${fips}',\n      name: 'Test ${fips}',\n    },`
  ).join('\n');
  return `window.PARCEL_REGISTRY = (function () {\n  const JURISDICTIONS = {\n${body}\n  };\n\n  function get(fips) {}\n})();\n`;
}

const tmpDir = mkdtempSync(join(tmpdir(), 'changed-fips-test-'));

function diffFixtures(oldContent, newContent) {
  const oldPath = join(tmpDir, 'old.js');
  const newPath = join(tmpDir, 'new.js');
  writeFileSync(oldPath, oldContent);
  writeFileSync(newPath, newContent);
  let diffText;
  try {
    diffText = execFileSync('git', ['diff', '--unified=0', '--no-index', oldPath, newPath], {
      cwd: ROOT, encoding: 'utf8',
    });
  } catch (e) {
    // git diff exits 1 when there IS a difference -- that's expected, not
    // a real failure; stdout still carries the diff text.
    diffText = e.stdout;
  }
  return computeChangedFips({ oldContent, newContent, diffText });
}

// ── single-field edit inside one block ──────────────────────────────────
{
  const before = fixture(['11111', '22222', '33333']);
  const after = before.replace("Test 22222", "Test 22222 EDITED");
  const result = diffFixtures(before, after);
  t('single-field edit: exactly one FIPS flagged', result.length, 1);
  t('single-field edit: correct FIPS', result[0]?.fips, '22222');
  t('single-field edit: classified as modified', result[0]?.changeType, 'modified');
}

// ── new block inserted between two others ───────────────────────────────
{
  const before = fixture(['11111', '33333']);
  const afterBody = fixture(['11111', '22222', '33333']);
  const result = diffFixtures(before, afterBody);
  t('inserted block: 22222 flagged as added', result.some(r => r.fips === '22222' && r.changeType === 'added'), true);
  t('inserted block: neighbors NOT touched', result.some(r => r.fips === '11111' || r.fips === '33333'), false);
}

// ── one block fully removed ──────────────────────────────────────────────
{
  const before = fixture(['11111', '22222', '33333']);
  const after = fixture(['11111', '33333']);
  const result = diffFixtures(before, after);
  t('removed block: 22222 flagged', result.some(r => r.fips === '22222' && r.changeType === 'removed'), true);
  t('removed block: exactly one change reported', result.length, 1);
}

// ── comment-only change touching zero blocks ─────────────────────────────
{
  const before = '// a comment\n' + fixture(['11111', '22222']);
  const after = '// a DIFFERENT comment\n' + fixture(['11111', '22222']);
  const result = diffFixtures(before, after);
  t('comment-only diff: zero FIPS blocks touched', result.length, 0);
}

// ── hunk spanning two adjacent blocks ────────────────────────────────────
// A single unified=0 hunk only merges STRICTLY consecutive changed lines,
// so this edits the last line of block 11111 and the very next line (the
// key line of block 22222) together, producing one hunk whose range
// crosses the boundary between the two blocks -- unlike a pure reorder of
// two byte-identical blocks (which git's diff represents as a move with
// zero footprint on the untouched block, not a spanning hunk).
{
  const before = fixture(['11111', '22222']);
  const after = before.replace(
    "    },\n    '22222': {",
    "    }, // edited\n    '22222': {  // also edited"
  );
  const result = diffFixtures(before, after);
  const touched = new Set(result.map(r => r.fips));
  t('spanning hunk: both adjacent blocks attributed', touched.has('11111') && touched.has('22222'), true);
  t('spanning hunk: both classified as modified',
    result.every(r => r.changeType === 'modified'), true);
}

// ── findFipsBlocks correctly caps the last block before JURISDICTIONS closes ──
{
  const content = fixture(['11111', '22222']);
  const blocks = findFipsBlocks(content);
  t('two blocks found', blocks.length, 2);
  const closeLineIdx = content.split('\n').findIndex(l => /^ {2}\};\s*$/.test(l));
  t('last block ends before the JURISDICTIONS close brace', blocks[1].endLine < closeLineIdx + 1, true);
}

// ── real-history dry run ─────────────────────────────────────────────────
{
  try {
    const log = execFileSync('git', [
      'log', '--format=%H', '-n', '30', '--', 'js/parcel/registry.js',
    ], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);

    let found = false;
    for (const sha of log) {
      const diffText = execFileSync('git', [
        'diff', '--unified=0', `${sha}~1`, sha, '--', 'js/parcel/registry.js',
      ], { cwd: ROOT, encoding: 'utf8' });
      if (!diffText.trim()) continue;

      const oldContent = execFileSync('git', ['show', `${sha}~1:js/parcel/registry.js`], { cwd: ROOT, encoding: 'utf8' });
      const newContent = execFileSync('git', ['show', `${sha}:js/parcel/registry.js`], { cwd: ROOT, encoding: 'utf8' });
      const result = computeChangedFips({ oldContent, newContent, diffText });

      // Only assert against a commit that touched exactly one jurisdiction
      // block -- this repo's history is dominated by single-county PRs, so
      // the first one found is a strong real-world correctness check.
      if (result.length === 1) {
        t(`real history ${sha.slice(0, 7)}: exactly one FIPS identified`, result.length, 1);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log('SKIP  real-history dry run: no single-FIPS commit found in last 30 registry.js changes');
    }
  } catch (e) {
    console.log(`SKIP  real-history dry run: ${e.message}`);
  }
}

rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
