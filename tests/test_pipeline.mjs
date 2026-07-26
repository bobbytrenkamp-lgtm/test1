/* tests/test_pipeline.mjs — pipeline table rendering and accessibility.

   The table previously built up to 2,000 rows in one pass, each via its own
   innerHTML parse plus its own click listener. Rows are now windowed and
   appended on scroll, and clicks go through one delegated listener.

   Its sortable column headers were also mouse-only: <th> elements with click
   handlers, no tab stop, no keyboard activation, no aria-sort.

   Requires jsdom. Skips cleanly when absent.
       node tests/test_pipeline.mjs
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

/* Synthesize more facilities than one page holds so windowing is observable. */
const N = 500;
const facilities = Array.from({ length: N }, (_, i) => ({
  facility_id: `fc-${i}`,
  name: `Facility ${i}`,
  operator: `Operator ${i % 7}`,
  city: 'Ashburn',
  county: 'Loudoun County',
  county_fips: '51107',
  state: 'Virginia',
  state_abbr: i % 2 ? 'VA' : 'TX',
  operational_status: i % 3 === 0 ? 'planned' : 'operational',
  capacity_mw_known: (i % 50) * 10,
  last_verified_date: '2026-01-15',
  facility_type: 'unknown',
}));

const dom = new JSDOM('<!doctype html><html><body><div id="pipeline-view"></div></body></html>',
  { url: 'http://localhost/', runScripts: 'dangerously' });
const { window } = dom;
window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(facilities) });

const s = window.document.createElement('script');
s.textContent = rd('js/pipeline.js');
window.document.body.appendChild(s);

window.PIPELINE.init();
await new Promise((r) => setTimeout(r, 100));

const doc = window.document;
const tbody = doc.getElementById('pipeline-tbody');
const rows = () => tbody.querySelectorAll('tr').length;

/* ── Windowed rendering ── */
ok('renders a first window, not everything', rows() > 0 && rows() < N, rows());
ok('first window is one page', rows() === 150, rows());

const wrap = doc.getElementById('pipeline-table-wrap');
ok('scroll container wired', wrap.dataset.scrollWired === '1');

/* jsdom has no layout, so drive the scroll thresholds directly. */
Object.defineProperty(wrap, 'scrollHeight', { value: 5000, configurable: true });
Object.defineProperty(wrap, 'clientHeight', { value: 600, configurable: true });
wrap.scrollTop = 4200;                       // within 400px of the end
wrap.dispatchEvent(new window.Event('scroll'));
ok('appends another page on scroll', rows() === 300, rows());

wrap.scrollTop = 4600;
wrap.dispatchEvent(new window.Event('scroll'));
ok('keeps appending', rows() === 450, rows());

/* ── Delegated row clicks (one listener, not one per row) ── */
ok('tbody marked delegated', tbody.dataset.delegated === '1');
const firstRow = tbody.querySelector('tr[data-id]');
firstRow.dispatchEvent(new window.Event('click', { bubbles: true }));
const detailName = doc.getElementById('pipeline-detail-name').textContent;
ok('clicking a row opens its detail', /Facility/.test(detailName), detailName);

/* ── Sorting resets the window ── */
const th = doc.querySelector('#pipeline-table thead th[data-col="name"]');
th.dispatchEvent(new window.Event('click', { bubbles: true }));
ok('sort resets to a single page', rows() === 150, rows());

/* ── Accessibility of sortable headers ── */
const ths = [...doc.querySelectorAll('#pipeline-table thead th[data-col]')];
ok('every sortable header is focusable', ths.every((t) => t.tabIndex === 0),
   ths.map((t) => t.tabIndex).join(','));
ok('active header exposes aria-sort', th.getAttribute('aria-sort') !== 'none',
   th.getAttribute('aria-sort'));
ok('inactive headers report aria-sort none',
   ths.filter((t) => t !== th).every((t) => t.getAttribute('aria-sort') === 'none'));

/* Keyboard activation must toggle direction the same way a click does. */
const before = th.getAttribute('aria-sort');
const ev = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
th.dispatchEvent(ev);
ok('Enter toggles sort direction', th.getAttribute('aria-sort') !== before,
   `${before} -> ${th.getAttribute('aria-sort')}`);

const before2 = th.getAttribute('aria-sort');
th.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
ok('Space toggles sort direction', th.getAttribute('aria-sort') !== before2,
   `${before2} -> ${th.getAttribute('aria-sort')}`);

th.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
const afterOther = th.getAttribute('aria-sort');
th.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
ok('unrelated keys do not sort', th.getAttribute('aria-sort') === afterOther);

/* ── Filtering re-windows correctly ── */
const stateSel = doc.getElementById('pl-filter-state');
stateSel.value = 'VA';
stateSel.dispatchEvent(new window.Event('change', { bubbles: true }));
ok('filter applied', rows() > 0 && rows() <= 150, rows());
const countText = doc.getElementById('pipeline-count').textContent;
ok('count reflects filtered total, not rendered rows', /of 500 projects/.test(countText), countText);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
