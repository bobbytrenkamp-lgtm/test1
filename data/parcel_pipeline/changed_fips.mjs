/* data/parcel_pipeline/changed_fips.mjs
 *
 * CLI:
 *   node data/parcel_pipeline/changed_fips.mjs --base <ref> --head <ref>
 *
 * Determines which FIPS blocks in js/parcel/registry.js were actually
 * touched between two git refs, so a PR-triggered probe can scope itself to
 * only the jurisdictions a given diff changed instead of re-probing all 50+
 * every time. Outputs a JSON array of { fips, changeType } to stdout, where
 * changeType is 'added' | 'modified' | 'removed'.
 *
 * ALGORITHM
 * `git diff --unified=0` gives hunk headers with no context lines, which is
 * exactly what's needed to get exact changed-line ranges on both sides of a
 * diff without also parsing unrelated surrounding lines. Each hunk's new-
 * side range (`+c,d`) is mapped against the HEAD version of registry.js's
 * FIPS block boundaries (found by scanning for the exact `    'FIPS': {`
 * key-line pattern); the old-side range (`-a,b`) is mapped the same way
 * against the BASE version. A FIPS touched only on the old side, and no
 * longer present in the head file's blocks at all, is 'removed'. A FIPS
 * touched on the new side that didn't exist in the base file's blocks at
 * all is 'added'. Everything else touched is 'modified'.
 *
 * EDGE CASES (see tests/test_parcel_changed_fips.mjs)
 * - A diff that only touches the top-of-file comment block, or anything
 *   before the first FIPS key line, matches zero blocks -- callers must
 *   treat an empty result as "nothing to probe", never fall back to
 *   probing everything (that would defeat the entire point of scoping).
 * - A hunk spanning two adjacent blocks (e.g. inserting a new entry between
 *   two existing ones) is handled naturally by per-line containment: each
 *   touched line independently resolves to whichever block's range
 *   contains it, so a hunk touching lines in two blocks correctly
 *   attributes both without special-case logic.
 * - A block edited in place shows up as changed lines on BOTH sides of the
 *   diff (an old-side removal hunk and a new-side addition hunk covering
 *   the same conceptual edit) -- this resolves to 'modified', not
 *   'added'+'removed', because the FIPS still exists in both the base and
 *   head block lists.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY_RELATIVE_PATH = 'js/parcel/registry.js';

const KEY_LINE_RE = /^\s*'(\d{5})':\s*\{/;
const JURISDICTIONS_CLOSE_RE = /^ {2}\};\s*$/;

/** Finds every top-level FIPS entry in registry.js source text, returning
 * an ordered array of { fips, startLine, endLine } (1-indexed, inclusive).
 * The last entry's endLine is capped at the line closing the JURISDICTIONS
 * object (the `  };` right before `function get(fips)`), so lines that
 * belong to the get/has/all helper functions are never misattributed to
 * whichever FIPS happens to be defined last. */
export function findFipsBlocks(content) {
  const lines = content.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = KEY_LINE_RE.exec(lines[i]);
    if (m) starts.push({ fips: m[1], startLine: i + 1 });
  }

  let closeLine = lines.length;
  if (starts.length > 0) {
    for (let i = starts[starts.length - 1].startLine; i < lines.length; i++) {
      if (JURISDICTIONS_CLOSE_RE.test(lines[i])) {
        closeLine = i + 1;
        break;
      }
    }
  }

  return starts.map((entry, idx) => {
    const nextStart = idx + 1 < starts.length ? starts[idx + 1].startLine : closeLine;
    return { fips: entry.fips, startLine: entry.startLine, endLine: nextStart - 1 };
  });
}

/** Returns the set of FIPS whose [startLine, endLine] range contains at
 * least one of the given line numbers. */
export function linesToFips(blocks, lineNumbers) {
  const hit = new Set();
  for (const line of lineNumbers) {
    for (const b of blocks) {
      if (line >= b.startLine && line <= b.endLine) hit.add(b.fips);
    }
  }
  return hit;
}

/** Parses `@@ -a[,b] +c[,d] @@` unified-diff hunk headers, returning
 * { oldStart, oldLines, newStart, newLines } per hunk. A count omitted from
 * the header means 1 line (standard unified-diff shorthand); an explicit
 * 0 (a pure insertion or pure deletion hunk) is preserved as 0. */
export function parseHunkHeaders(diffText) {
  const re = /^@@ -(\d+)(?:,(\d+))?\s\+(\d+)(?:,(\d+))?\s@@/gm;
  const hunks = [];
  let m;
  while ((m = re.exec(diffText)) !== null) {
    hunks.push({
      oldStart: Number(m[1]),
      oldLines: m[2] === undefined ? 1 : Number(m[2]),
      newStart: Number(m[3]),
      newLines: m[4] === undefined ? 1 : Number(m[4]),
    });
  }
  return hunks;
}

function expandRange(start, count) {
  if (count === 0) return [];
  const out = [];
  for (let i = 0; i < count; i++) out.push(start + i);
  return out;
}

/** Pure function: given the old and new full contents of registry.js plus a
 * unified=0 diff between them, returns [{ fips, changeType }]. No git or
 * filesystem access -- this is what tests/test_parcel_changed_fips.mjs
 * exercises directly with synthetic fixtures. */
export function computeChangedFips({ oldContent, newContent, diffText }) {
  const oldBlocks = findFipsBlocks(oldContent);
  const newBlocks = findFipsBlocks(newContent);
  const oldFipsSet = new Set(oldBlocks.map(b => b.fips));
  const newFipsSet = new Set(newBlocks.map(b => b.fips));

  const hunks = parseHunkHeaders(diffText);
  const oldTouchedLines = hunks.flatMap(h => expandRange(h.oldStart, h.oldLines));
  const newTouchedLines = hunks.flatMap(h => expandRange(h.newStart, h.newLines));

  const touchedOldFips = linesToFips(oldBlocks, oldTouchedLines);
  const touchedNewFips = linesToFips(newBlocks, newTouchedLines);

  const results = new Map();
  for (const fips of touchedNewFips) {
    results.set(fips, oldFipsSet.has(fips) ? 'modified' : 'added');
  }
  for (const fips of touchedOldFips) {
    if (results.has(fips)) continue; // already classified via the new side
    results.set(fips, newFipsSet.has(fips) ? 'modified' : 'removed');
  }

  return [...results.entries()]
    .map(([fips, changeType]) => ({ fips, changeType }))
    .sort((a, b) => a.fips.localeCompare(b.fips));
}

function runGit(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function loadFromGit(baseRef, headRef) {
  const oldContent = runGit(['show', `${baseRef}:${REGISTRY_RELATIVE_PATH}`]);
  let newContent;
  try {
    newContent = runGit(['show', `${headRef}:${REGISTRY_RELATIVE_PATH}`]);
  } catch {
    // headRef may be the working tree (e.g. "HEAD" fails if uncommitted);
    // fall back to reading the file directly for that case.
    newContent = readFileSync(join(ROOT, REGISTRY_RELATIVE_PATH), 'utf8');
  }
  const diffText = runGit([
    'diff', '--unified=0', baseRef, headRef, '--', REGISTRY_RELATIVE_PATH,
  ]);
  return { oldContent, newContent, diffText };
}

function parseArgs(argv) {
  const args = { base: null, head: 'HEAD' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--head') args.head = argv[++i];
  }
  return args;
}

function main() {
  const { base, head } = parseArgs(process.argv.slice(2));
  if (!base) {
    console.error('Usage: node changed_fips.mjs --base <ref> [--head <ref>]');
    process.exit(2);
  }
  const { oldContent, newContent, diffText } = loadFromGit(base, head);
  const changed = computeChangedFips({ oldContent, newContent, diffText });
  console.log(JSON.stringify(changed));

  if (process.env.GITHUB_OUTPUT) {
    const csv = changed.map(c => c.fips).join(',');
    appendFileSync(process.env.GITHUB_OUTPUT, `fips_csv=${csv}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${changed.length > 0}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
