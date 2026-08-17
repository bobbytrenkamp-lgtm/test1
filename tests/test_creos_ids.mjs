/* tests/test_creos_ids.mjs — tests for js/creos-ids.js (CREOS universal
   entity ID utility, Phase 4 integration boundary only — see that file's
   header comment and docs/CREOS_IDS.md).

   Known-timestamp vectors are the same ones test4 (CREOS Enterprise)
   verified independently in Python against the ULID spec's own reference
   algorithm (repeated `divmod(n, 32)`, most-significant digit first) —
   see test4/src/domain/ids.test.ts and test4/BUG_TRACKER.md's BUG-005.
   Re-checking the same vectors here catches this port drifting from the
   spec-verified original, not just from itself.

   Run:  node tests/test_creos_ids.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
require('../js/creos-ids.js');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail) console.log(`   ${detail}`);
}

/* ── known timestamp vectors (BUG-005 regression, ported) ───────────── */
const KNOWN_TIMESTAMP_VECTORS = [
  [0, '0000000000'],
  [1, '0000000001'],
  [31, '000000000Z'],
  [32, '0000000010'],
  [1000, '00000000Z8'],
  [1700000000000, '01HF7YAT00'],
  [window.MAX_CREOS_ULID_TIMESTAMP_MS, '7ZZZZZZZZZ'],
];

for (const [ts, expectedPrefix] of KNOWN_TIMESTAMP_VECTORS) {
  const ulid = window.generateCreosUlid(ts);
  ok(
    `generateCreosUlid(${ts}) timestamp prefix`,
    ulid.slice(0, 10) === expectedPrefix,
    `got: ${ulid.slice(0, 10)}  want: ${expectedPrefix}  (full: ${ulid})`,
  );
  ok(`generateCreosUlid(${ts}) is 26 chars`, ulid.length === 26);
}

/* ── overflow / invalid input rejection ──────────────────────────────── */
try {
  window.generateCreosUlid(window.MAX_CREOS_ULID_TIMESTAMP_MS + 1);
  ok('generateCreosUlid rejects timestamp above max', false, 'did not throw');
} catch {
  ok('generateCreosUlid rejects timestamp above max', true);
}
try {
  window.generateCreosUlid(-1);
  ok('generateCreosUlid rejects negative timestamp', false, 'did not throw');
} catch {
  ok('generateCreosUlid rejects negative timestamp', true);
}
try {
  window.generateCreosUlid(1.5);
  ok('generateCreosUlid rejects non-integer timestamp', false, 'did not throw');
} catch {
  ok('generateCreosUlid rejects non-integer timestamp', true);
}

/* ── isValidCreosUlid ─────────────────────────────────────────────────── */
ok('isValidCreosUlid accepts a freshly generated ulid', window.isValidCreosUlid(window.generateCreosUlid()));
ok('isValidCreosUlid rejects too-short string', !window.isValidCreosUlid('01ARZ3NDEK'));
ok('isValidCreosUlid rejects lowercase', !window.isValidCreosUlid('01arz3ndektsv4rrffq69g5fav'));
ok('isValidCreosUlid rejects excluded letters (I, L, O, U)', !window.isValidCreosUlid('0IARZ3NDEKTSV4RRFFQ69G5FAV'));
ok('isValidCreosUlid rejects non-string', !window.isValidCreosUlid(12345));
const ULID_TAIL_25 = '1ARZ3NDEKTSV4RRFFQ69G5FAV'; // 25 chars, from a real valid ULID minus its first char
ok('test fixture sanity: tail is 25 chars', ULID_TAIL_25.length === 25);
for (const c of ['0', '1', '7']) {
  const candidate = c + ULID_TAIL_25;
  ok(`isValidCreosUlid accepts first char '${c}' (in-range timestamp)`, window.isValidCreosUlid(candidate), `candidate: ${candidate} (len ${candidate.length})`);
}
for (const c of ['8', '9', 'A', 'H', 'Z']) {
  const candidate = c + ULID_TAIL_25;
  ok(`isValidCreosUlid rejects first char '${c}' (timestamp overflow)`, !window.isValidCreosUlid(candidate), `candidate: ${candidate} (len ${candidate.length})`);
}

/* ── collision check ──────────────────────────────────────────────────── */
{
  const ids = new Set();
  for (let i = 0; i < 5000; i++) ids.add(window.generateCreosUlid());
  ok('5000 generated ulids are all unique', ids.size === 5000, `got ${ids.size} unique of 5000`);
}

/* ── creosDisplayId ───────────────────────────────────────────────────── */
{
  const ulid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
  ok('creosDisplayId formats CREOS-<PREFIX>-<last 5>', window.creosDisplayId('PROP', ulid) === 'CREOS-PROP-G5FAV');
}
try {
  window.creosDisplayId('PROP', 'not-a-ulid');
  ok('creosDisplayId throws on invalid ulid', false, 'did not throw');
} catch {
  ok('creosDisplayId throws on invalid ulid', true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
