/* tests/test_watchlist.mjs — tests for js/watchlist.js (Phase 4).

   The highest-stakes behavior here is MIGRATION SAFETY. Users have real
   watchlists stored under the legacy `dc-watchlist-v1` key. The v2 store must
   import them without ever destroying v1, and must keep v1 populated so an
   older cached build or a rollback still finds the user's counties.

   Also covers: notes, policy-snapshot change detection, acknowledge
   re-baselining, and portable bundle export/import merge semantics.

   Requires jsdom (for localStorage). Skips cleanly when absent.
       node tests/test_watchlist.mjs
*/
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch {
  console.log('SKIP  jsdom not installed — run `npm i jsdom` to enable these tests');
  process.exit(0);
}

const ROOT = new URL('../', import.meta.url).pathname;
const rd = (p) => readFileSync(ROOT + p, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   got: ${detail}`);
}

/* Build a fresh window with a given starting localStorage state, then load
   constants.js + watchlist.js as classic scripts sharing one global scope. */
function newEnv(seed) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
    { url: 'http://localhost/', runScripts: 'dangerously' });
  const { window } = dom;
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  for (const [k, v] of Object.entries(seed || {})) window.localStorage.setItem(k, v);

  const inject = (code) => {
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
  };
  // Counties the tests reference, mirroring map.js's top-level `let mapData`.
  window.__md = {
    '51107': { name: 'Loudoun County', state: 'Virginia', level: 3, status: 'active',
               effective_date: '2023-03-15', title: 'Data Center Overlay Zone Restrictions' },
    '51059': { name: 'Fairfax County', state: 'Virginia', level: 2, status: 'active',
               effective_date: '2024-01-01', title: 'Moderate limits' },
  };
  inject('var mapData = window.__md;');
  inject(rd('js/constants.js'));
  inject(rd('js/watchlist.js'));
  return window;
}

/* ── Migration from the legacy flat array ── */
{
  const legacy = JSON.stringify(['51107', '51059']);
  const w = newEnv({ 'dc-watchlist-v1': legacy });
  const W = w.WATCHLIST;

  ok('migrates legacy entries', W.count() === 2, W.count());
  ok('legacy fips present', W.has('51107') && W.has('51059'));

  const v1After = w.localStorage.getItem('dc-watchlist-v1');
  ok('v1 key still exists after migration', v1After !== null);
  const v1Parsed = JSON.parse(v1After);
  ok('v1 still contains every original fips',
     ['51107', '51059'].every((f) => v1Parsed.includes(f)), v1After);
  ok('v2 key written', w.localStorage.getItem('dc-watchlist-v2') !== null);

  // Adding via v2 must keep the legacy mirror in sync for older code paths.
  W.add('06037');
  ok('new add mirrored into v1',
     JSON.parse(w.localStorage.getItem('dc-watchlist-v1')).includes('06037'));

  // Removal must not resurrect on reload.
  W.remove('06037');
  ok('removal drops from v1 mirror',
     !JSON.parse(w.localStorage.getItem('dc-watchlist-v1')).includes('06037'));
}

/* ── A county added by an older build later is still picked up ── */
{
  const w = newEnv({ 'dc-watchlist-v1': JSON.stringify(['51107']) });
  w.WATCHLIST.count();                                    // force initial load
  // Simulate an older cached build appending directly to the legacy key,
  // then a fresh page load reading it.
  w.localStorage.setItem('dc-watchlist-v1', JSON.stringify(['51107', '51059']));
  const w2 = newEnv({
    'dc-watchlist-v1': w.localStorage.getItem('dc-watchlist-v1'),
    'dc-watchlist-v2': w.localStorage.getItem('dc-watchlist-v2'),
  });
  ok('late legacy addition is folded in on next load', w2.WATCHLIST.has('51059'));
}

/* ── Corrupt storage must not throw ── */
{
  const w = newEnv({ 'dc-watchlist-v1': '{not json', 'dc-watchlist-v2': 'also broken' });
  ok('survives corrupt storage', w.WATCHLIST.count() === 0, w.WATCHLIST.count());
  ok('still writable after corruption', w.WATCHLIST.add('51107') === true);
}

/* ── Notes ── */
{
  const w = newEnv({});
  const W = w.WATCHLIST;
  W.add('51107');
  ok('notes default empty', W.get('51107').notes === '');
  W.setNotes('51107', 'Board vote scheduled for March');
  ok('notes persist', W.get('51107').notes === 'Board vote scheduled for March');
  ok('setNotes on unknown fips is a no-op', W.setNotes('00000', 'x') === false);
}

/* ── Change detection against the policy snapshot ── */
{
  const w = newEnv({});
  const W = w.WATCHLIST;
  W.add('51107');
  ok('no changes immediately after add', W.diff().length === 0, JSON.stringify(W.diff()));

  // Escalate the county's restriction level, as a data refresh would.
  w.__md['51107'].level = 4;
  const d = W.diff();
  ok('detects level change', d.length === 1, JSON.stringify(d));
  ok('reports direction increased', d[0] && d[0].changes[0].dir === 'increased',
     d[0] && JSON.stringify(d[0].changes));
  ok('uses canonical labels', /Ban \/ Moratorium/.test(d[0].changes[0].text), d[0].changes[0].text);
  ok('includes county name', d[0].name === 'Loudoun County', d[0].name);

  // Acknowledging re-baselines the snapshot and clears the change.
  W.acknowledge('51107');
  ok('acknowledge clears the change', W.diff().length === 0);

  // Status and effective-date changes are reported too.
  w.__md['51107'].status = 'proposed';
  w.__md['51107'].effective_date = '2027-01-01';
  const d2 = W.diff();
  ok('detects status + date changes', d2[0] && d2[0].changes.length === 2,
     d2[0] && JSON.stringify(d2[0].changes));

  // A record disappearing is a real, reportable event.
  W.acknowledge();
  delete w.__md['51107'];
  const d3 = W.diff();
  ok('detects record removal', /removed/i.test(d3[0].changes[0].text), JSON.stringify(d3));
}

/* ── Migrated entries have no snapshot and must not be reported as changed ── */
{
  const w = newEnv({ 'dc-watchlist-v1': JSON.stringify(['51107']) });
  w.__md['51107'].level = 0;   // differs from anything a snapshot would hold
  ok('migrated entry without snapshot reports no false change',
     w.WATCHLIST.diff().length === 0, JSON.stringify(w.WATCHLIST.diff()));
}

/* ── Portable bundles ── */
{
  const w = newEnv({});
  const W = w.WATCHLIST;
  W.add('51107'); W.setNotes('51107', 'my note');
  W.add('51059');
  const bundle = W.exportBundle();

  ok('bundle has schema', bundle._schema === 'watchlist_bundle_v1');
  ok('bundle has both entries', bundle.entries.length === 2, bundle.entries.length);
  ok('bundle carries notes',
     bundle.entries.find((e) => e.fips === '51107').notes === 'my note');
  ok('bundle contains no account data',
     !JSON.stringify(bundle).match(/user_id|email|token|password/i));

  // Import into a different environment.
  const w2 = newEnv({});
  const r = w2.WATCHLIST.importBundle(bundle);
  ok('import succeeds', r.ok && r.added === 2, JSON.stringify(r));
  ok('imported notes carried over', w2.WATCHLIST.get('51107').notes === 'my note');

  // Import must never clobber the importer's own notes.
  const w3 = newEnv({});
  w3.WATCHLIST.add('51107');
  w3.WATCHLIST.setNotes('51107', 'MY OWN NOTE');
  const r3 = w3.WATCHLIST.importBundle(bundle);
  ok('existing note preserved on import',
     w3.WATCHLIST.get('51107').notes === 'MY OWN NOTE', w3.WATCHLIST.get('51107').notes);
  ok('import still adds the new county', w3.WATCHLIST.has('51059'));
  ok('import reports counts', r3.added === 1, JSON.stringify(r3));

  // Malformed input is rejected, not thrown on.
  ok('rejects non-bundle', w3.WATCHLIST.importBundle({ foo: 1 }).ok === false);
  ok('rejects null', w3.WATCHLIST.importBundle(null).ok === false);
  const bad = { _schema: 'watchlist_bundle_v1', entries: [{ fips: 'abc' }, { fips: '51107' }] };
  const rb = w3.WATCHLIST.importBundle(bad);
  ok('skips invalid fips in bundle', rb.skipped === 1, JSON.stringify(rb));
}

/* ── Cloud sync degrades silently when Supabase is not configured ── */
{
  const w = newEnv({});
  ok('add works with no AUTH present', w.WATCHLIST.add('51107') === true);
  const r = await w.WATCHLIST.syncFromCloud();
  ok('syncFromCloud reports not-signed-in', r.ok === false && r.reason === 'not-signed-in',
     JSON.stringify(r));
  const p = await w.WATCHLIST.pushAllToCloud();
  ok('pushAllToCloud reports not-signed-in', p.ok === false, JSON.stringify(p));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
