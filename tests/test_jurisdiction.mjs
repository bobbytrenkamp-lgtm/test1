/* tests/test_jurisdiction.mjs — DOM tests for the Jurisdiction Intelligence Page.

   Renders js/jurisdiction.js against the real data files in a jsdom document
   and asserts the cross-source joins actually produce content: policy record
   from map_data.json, facilities joined on county_fips, related news, and the
   distinct "not yet researched" state for counties with no record.

   Also guards the XSS boundary: county names and source labels come from data
   files and are interpolated into innerHTML, so they must always be escaped.

   Requires jsdom. Skips cleanly (exit 0) when it is not installed:
       npm i jsdom
       node tests/test_jurisdiction.mjs
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

/* runScripts:'dangerously' gives injected <script> elements a real shared
   global scope — the same semantics classic scripts have in the browser. */
const dom = new JSDOM(
  `<!doctype html><html><body><div id="jurisdiction-view"></div></body></html>`,
  { url: 'http://localhost/', runScripts: 'dangerously' }
);
const { window } = dom;

/* Execute a source string as if it were a classic <script> tag. */
function injectScript(code) {
  const s = window.document.createElement('script');
  s.textContent = code;
  window.document.body.appendChild(s);
}

const meta       = JSON.parse(rd('data/platform_metadata.json'));
const mapData    = JSON.parse(rd('data/map_data.json'));
const facilities = JSON.parse(rd('data/facilities_master.json'));
const news       = JSON.parse(rd('data/ai_news.json'));

window.fetch = (u) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(
    String(u).includes('platform_metadata') ? meta
      : String(u).includes('facilities_master') ? facilities
        : {}),
});

/* Classic scripts share one global scope. map.js declares `let mapData` and
   `escHtml`/`getSeverityKey` at top level; jurisdiction.js reads them by bare
   name. Injecting them as a <script> recreates that arrangement so the test
   exercises the same identifier-resolution path the browser uses. */
window.__md = mapData.counties;
window.__na = news.articles || [];
injectScript(`
  var mapData = window.__md;
  var newsArticles = window.__na;
  var escHtml = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var getSeverityKey = function (c) {
    if (!c) return 'none';
    var l = c.level, s = c.status || 'active';
    if (l === -1) return 'pro';
    if (l <= 0) return 'none';
    if (s === 'proposed' || s === 'pending') return 'proposed';
    if (l >= 4) return 'ban';
    if (l === 3) return 'high';
    return 'moderate';
  };
`);
injectScript(rd('js/constants.js'));
/* jurisdiction.js delegates watch state to window.WATCHLIST (js/watchlist.js),
   which index.html loads first. Mirror that ordering here. */
injectScript(rd('js/watchlist.js'));
injectScript(rd('js/jurisdiction.js'));

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   got: ${detail}`);
}

const J = window.JURISDICTION;
const view = window.document.getElementById('jurisdiction-view');
const txt = (sel) => view.querySelector(sel)?.textContent?.trim();

await J.loadFacilities();

/* ── A researched county with facilities: Loudoun County, VA ── */
J.render('51107');
await new Promise((r) => setTimeout(r, 150));

ok('renders county name',   txt('.juris-title') === 'Loudoun County', txt('.juris-title'));
ok('renders state + FIPS',  /Virginia/.test(txt('.juris-sub') || ''), txt('.juris-sub'));
ok('severity from constants', txt('.juris-sev') === 'Significant Restrictions', txt('.juris-sev'));
ok('renders all four cards', view.querySelectorAll('.juris-card').length === 4,
   view.querySelectorAll('.juris-card').length);

const facRows = view.querySelectorAll('.juris-table tbody tr').length;
ok('joins facilities on county_fips', facRows > 0, facRows);
const statText = [...view.querySelectorAll('.juris-stat')].map((s) => s.textContent).join(' ');
ok('shows operational count', /Operational/.test(statText));
ok('shows planned count',     /Planned/.test(statText));
ok('shows known capacity',    /Known capacity/.test(statText));

ok('renders policy sources', view.querySelectorAll('.juris-sources li').length > 0);
ok('renders cross-links',    view.querySelectorAll('.juris-link').length >= 3);
ok('watch button present',   /Watch/.test(txt('.juris-btn-watch') || ''));

/* ── Watchlist round-trips to localStorage ── */
view.querySelector('.juris-btn-watch').dispatchEvent(new window.Event('click'));
const stored = JSON.parse(window.localStorage.getItem('dc-watchlist-v1') || '[]');
ok('watch toggle persists fips', stored.includes('51107'), JSON.stringify(stored));

/* ── Notes editor is tied to watch state (Phase 4) ── */
J.render('51059');
ok('no notes editor when unwatched', !view.querySelector('.juris-notes-input'));
window.WATCHLIST.add('51059');
J.render('51059');
const notesEl = view.querySelector('.juris-notes-input');
ok('notes editor appears once watched', !!notesEl);
if (notesEl) {
  notesEl.value = 'Board vote in March';
  notesEl.dispatchEvent(new window.Event('blur'));
  ok('notes persist to watchlist',
     window.WATCHLIST.get('51059').notes === 'Board vote in March',
     window.WATCHLIST.get('51059').notes);
} else {
  ok('notes persist to watchlist', false, 'editor missing');
}

/* ── An unresearched county must NOT read as "no restrictions" ── */
J.render('99999');
ok('unresearched badge', txt('.juris-sev') === 'Not yet researched', txt('.juris-sev'));
ok('distinguishes from no-restrictions', /not the same as/i.test(view.textContent));
ok('cites coverage numbers', /3,143|3143/.test(view.textContent));

/* ── Escaping: data-file values are interpolated into innerHTML ── */
window.__md['00001'] = {
  name: '<img src=x onerror=alert(1)>',
  state: 'Virginia',
  level: 2,
  title: '"><script>bad()</script>',
  sources: [{ label: '<b>bold</b>', url: 'https://example.gov/x' }],
};
J.render('00001');
const html = view.innerHTML;
ok('does not inject raw <img>',    !html.includes('<img src=x'));
ok('does not inject raw <script>', !/<script>bad/.test(html));
ok('escapes markup in county name', html.includes('&lt;img'));

/* ── Invalid input is handled, not thrown ── */
J.render('abc');
ok('rejects malformed fips', /Invalid county identifier/.test(view.textContent));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
