/* tests/test_frontend_core.mjs — Node regression tests for the browser modules
   that have no DOM dependency: js/constants.js and js/router.js.

   These two files are load-bearing: constants.js is the single source of the
   severity/level label maps (map.js, home.js, and analytics.js all read it at
   top level), and router.js must keep parsing the four legacy hash formats
   that older shared links still use.

   Run:  node tests/test_frontend_core.mjs
*/
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/* Minimal browser globals so the two modules can be require()'d as-is. */
global.window = global;
global.location = { hash: '' };
global.history = { replaceState() {} };
global.addEventListener = () => {};
global.fetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(JSON.parse(readFileSync('data/platform_metadata.json', 'utf8'))),
});

require('../js/constants.js');
require('../js/router.js');

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}

/* ── constants.js: canonical labels (see docs/TERMINOLOGY.md) ── */
t('SEVERITY high',  window.SEVERITY_LABELS.high, 'Significant Restrictions');
t('SEVERITY none',  window.SEVERITY_LABELS.none, 'No Known Restrictions');
t('SEVERITY pro',   window.SEVERITY_LABELS.pro,  'Pro-Development Hub');
t('SEVERITY ban',   window.SEVERITY_LABELS.ban,  'Moratorium / Ban');
t('LEVEL_LABELS 3', window.LEVEL_LABELS['3'],    'Significant Restrictions');
t('LEVEL_LABELS 0', window.LEVEL_LABELS['0'],    'No Known Restrictions');
t('LEVEL_SHORT -1', window.LEVEL_SHORT['-1'],    'Pro-Dev');
t('TOTAL_US_COUNTIES', window.TOTAL_US_COUNTIES, 3143);

/* Banned phrases must never reappear in the label maps. */
const allLabels = JSON.stringify([window.SEVERITY_LABELS, window.LEVEL_LABELS, window.LEVEL_SHORT]);
for (const banned of ['No Restrictions"', 'High Restrictions', 'Pro / Incentive']) {
  t(`no banned phrase: ${banned}`, allLabels.includes(banned), false);
}

/* ── router.js: build ── */
const R = window.Router;
t('build tab',         R.build('news', {}),                     '#news');
t('build params',      R.build('jurisdiction', { fips: '51107' }), '#jurisdiction?fips=51107');
t('build drops empty', R.build('news', { q: '', cat: 'ai' }),   '#news?cat=ai');
t('build encodes',     R.build('news', { q: 'a b&c' }),         '#news?q=a%20b%26c');

/* ── router.js: parse, including all four legacy formats ── */
const P = (h) => { global.location.hash = h; return R.parse(); };
t('parse empty',      P(''),                          { route: 'home', params: {}, raw: '', legacy: null });
t('legacy fips',      P('#51107'),                     { route: 'map', params: { fips: '51107' }, raw: '51107', legacy: 'fips' });
t('legacy share',     P('#s=abc123').legacy,           'share');
t('legacy viewport',  P('#@38.9,-77.4,8').legacy,      'viewport');
t('legacy ai-stocks', P('#ai-stocks').route,           'stocks');
t('modern tab',       P('#pipeline').route,            'pipeline');
t('modern params',    P('#jurisdiction?fips=51107').params, { fips: '51107' });
t('multi params',     P('#news?q=x&cat=ai').params,    { q: 'x', cat: 'ai' });
t('decodes params',   P('#news?q=a%20b').params,       { q: 'a b' });
t('unknown -> home',  P('#bogus').route,               'home');

/* Economy tab. It must be a real route rather than falling through to home —
   an unregistered tab name silently routes to Home, which is how a new tab can
   look wired up while every shared link to it lands on the wrong page. */
t('economy route',    P('#economy').route,             'economy');
t('economy build',    R.build('economy', {}),          '#economy');
t('economy w/ params', P('#economy?metric=population').params, { metric: 'population' });
t('economy not legacy', P('#economy').legacy,          null);

/* ── platform metadata accessors (async load) ── */
setTimeout(() => {
  t('platformStat counties', window.platformStat('coverage.counties_in_database', 0), 1465);
  t('platformStat fallback', window.platformStat('missing.path', 'fb'), 'fb');
  t('coveragePct', window.coveragePct(), 47);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 50);
