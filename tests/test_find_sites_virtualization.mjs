/* tests/test_find_sites_virtualization.mjs — js/parcel/find-sites.js result
   virtualization (PR B).

   The results list used to hard-cap at 200 entries with a dead-end "…and N
   more, narrow your search" message -- result #201 was permanently
   unreachable without changing criteria. Results now stream into the DOM a
   page at a time as the user scrolls #fs-results, the same windowed-append
   pattern js/pipeline.js already uses (see tests/test_pipeline.mjs) and the
   same PAGE_SIZE convention (150).

   Drives the real end-to-end flow (form submit -> runSearch ->
   PARCEL_SITE_SEARCH.search -> renderResults -> DOM), not a reimplementation
   of it, with window.PARCEL_RENDERER stubbed as the candidate source (the
   only external dependency runSearch() has).

   Requires jsdom. Skips cleanly when absent.
       node tests/test_find_sites_virtualization.mjs
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

const N = 340; // more than two pages (150 + 150 + 40), fewer than three full pages
const candidates = Array.from({ length: N }, (_, i) => ({
  id: `c${i}`,
  properties: { address: `${i} Main St`, area_acres: 10 + i, state: 'VA' },
}));

const html = `<!doctype html><html><body>
  <aside id="find-sites-panel" aria-hidden="true">
    <form id="fs-form">
      <fieldset id="fs-scope-fieldset">
        <label><input type="radio" name="scope" value="viewport" checked> viewport</label>
        <label><input type="radio" name="scope" value="national"> national</label>
      </fieldset>
      <input type="number" name="minAcres" value="0">
      <button type="submit">Search</button>
    </form>
    <div id="fs-results"></div>
  </aside>
</body></html>`;

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
const { window } = dom;
window.PARCEL_RENDERER = { getFeatures: () => candidates };

for (const file of ['js/parcel/site-search.js', 'js/parcel/find-sites.js']) {
  const s = window.document.createElement('script');
  s.textContent = rd(file);
  window.document.body.appendChild(s);
}

const doc = window.document;
const wrap = doc.getElementById('fs-results');
const rows = () => wrap.querySelectorAll('.fs-result-item').length;

const form = doc.getElementById('fs-form');
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise((r) => setTimeout(r, 50));

/* ── First page only, not everything ── */
ok('renders a first window, not everything', rows() > 0 && rows() < N, rows());
ok('first window is exactly one page', rows() === 150, rows());

const status = () => doc.getElementById('fs-load-more');
ok('a "Showing X of Y" status line appears while more remain', !!status() && /Showing 150 of 340/.test(status().textContent), status() && status().textContent);

/* ── Scroll container wired on #fs-results itself (already overflow:auto) ── */
ok('scroll container wired', wrap.dataset.scrollWired === '1');

/* jsdom has no layout, so drive the scroll thresholds directly, same
   convention as tests/test_pipeline.mjs. */
Object.defineProperty(wrap, 'scrollHeight', { value: 5000, configurable: true });
Object.defineProperty(wrap, 'clientHeight', { value: 600, configurable: true });
wrap.scrollTop = 4200; // within 400px of the end
wrap.dispatchEvent(new window.Event('scroll'));
ok('appends another page on scroll', rows() === 300, rows());
ok('status line updates to reflect the new rendered count', /Showing 300 of 340/.test(status().textContent), status().textContent);

wrap.scrollTop = 4600;
wrap.dispatchEvent(new window.Event('scroll'));
ok('the final, partial page (the last 40 of 340) renders exactly the remainder', rows() === 340, rows());
ok('the status line disappears once every result is rendered — no permanently-unreachable results',
  status() === null);

/* Scrolling again once everything is rendered must not throw or duplicate rows. */
wrap.dispatchEvent(new window.Event('scroll'));
ok('scrolling past the end is a no-op, not a crash or a duplicate append', rows() === 340, rows());

/* ── Row content and click-to-focus index survive across pages ──
 * search() sorts matched results largest-acreage-first, so entry #339 (the
 * last one rendered, on the final scroll-triggered page) is the SMALLEST
 * candidate -- area_acres 10, i.e. "0 Main St" (candidate index 0), not
 * "339 Main St". */
const lastRow = wrap.querySelectorAll('.fs-result-item')[339];
ok('a row appended on a later page carries the correct global data-fs-idx',
  lastRow.dataset.fsIdx === '339', lastRow.dataset.fsIdx);
ok('a row appended on a later page renders real candidate data, not a placeholder',
  lastRow.textContent.includes('0 Main St') && lastRow.textContent.includes('10.0 ac'), lastRow.textContent);

/* ── A second, smaller search resets the window cleanly ── */
const minAcresInput = form.querySelector('[name=minAcres]');
minAcresInput.value = '400'; // above every candidate's area_acres -> zero matches
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise((r) => setTimeout(r, 50));
ok('a new search with a different result set does not retain the old rows', rows() === 0, rows());
ok('re-submitting does not re-wire (and thus double-fire) the scroll listener',
  wrap.dataset.scrollWired === '1');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
