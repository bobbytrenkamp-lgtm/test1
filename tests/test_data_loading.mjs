/* tests/test_data_loading.mjs — verifies the critical/deferred data split.

   Home previously waited on ~4.5 MB before it could paint, including four
   map-only payloads (sample_layers.json alone is 1.4 MB). loadCoreData() now
   fetches only what Home needs; loadSecondaryData() fetches the rest in
   parallel without blocking first paint.

   This test extracts those two functions from js/map.js and runs them against
   a stub fetch, asserting:
     - loadCoreData requests ONLY the critical files
     - loadSecondaryData requests the deferred ones and indexes them correctly
     - loadSecondaryData is memoized (the map tab and analytics tab both call it)
     - a failing secondary fetch degrades to defaults instead of rejecting

   Run: node tests/test_data_loading.mjs
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const src = readFileSync(ROOT + 'js/map.js', 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   got: ${detail}`);
}

/* Pull a top-level function declaration (and its body) out of map.js by brace
   matching from the first brace after the signature. */
function extract(signature) {
  const i = src.indexOf(signature);
  if (i === -1) throw new Error(`not found: ${signature}`);
  let depth = 0;
  const start = src.indexOf('{', i);
  for (let k = start; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  throw new Error(`unbalanced braces: ${signature}`);
}

/* Brace matching does not work for a statement whose first brace belongs to a
   nested arrow body (e.g. `const f = url => fetch(url).then(r => { ... });`).
   For those, take the whole statement up to its terminating semicolon. */
function extractStatement(signature) {
  const i = src.indexOf(signature);
  if (i === -1) throw new Error(`not found: ${signature}`);
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const ch = src[k];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if (ch === ';' && depth === 0) return src.slice(i, k + 1);
  }
  throw new Error(`no statement end: ${signature}`);
}

const CRITICAL = ['data/map_data.json', 'data/ai_news.json'];
const DEFERRED = [
  'data/sample_layers.json',
  'data/state_regulations.json',
  'data/political_risk.json',
  'data/tax_incentives.json',
  'data/water_stress.json',
];

/* Build a sandbox exposing the globals these two functions assign to. */
function makeEnv(opts) {
  const requested = [];
  const failures = (opts && opts.failUrls) || [];

  const payloads = {
    'data/map_data.json': { counties: { '51107': { name: 'Loudoun County', level: 3 } } },
    'data/ai_news.json': { articles: [{ title: 'a' }] },
    'data/sample_layers.json': { data_centers: [{ name: 'dc' }], water_stress: { '51107': 2 } },
    'data/state_regulations.json': { states: { '51': { name: 'Virginia' } } },
    'data/political_risk.json': { scores: [{ fips: '1107', risk: 4 }] },   // note: unpadded
    'data/tax_incentives.json': { tax_incentives: [{ id: 'p1', fips_list: ['51107', 1059] }] },
    'data/water_stress.json': { water_stress: { '51107': 3 } },
  };

  const ctx = {
    console,
    sampleLayers: null,
    stateRegData: {},
    politicalRiskData: {},
    window: {},
    fetch(url) {
      requested.push(url);
      if (failures.includes(url)) return Promise.reject(new Error('network'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payloads[url]) });
    },
  };

  const code = `
    ${extractStatement('const _fetchJSON =')}
    ${extract('async function loadCoreData()')}
    ${extractStatement('let _secondaryPromise = null')}
    ${extract('function loadSecondaryData()')}
    return { loadCoreData, loadSecondaryData };
  `;
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'console', 'fetch', 'window',
    `let sampleLayers = null, stateRegData = {}, politicalRiskData = {};
     ${code}`
  );
  const api = factory(ctx.console, ctx.fetch, ctx.window);
  return { api, requested, win: ctx.window };
}

/* ── loadCoreData fetches only the critical files ── */
{
  const { api, requested } = makeEnv();
  const core = await api.loadCoreData();

  ok('core returns county data', !!(core.data && core.data.counties), JSON.stringify(core.data));
  ok('core returns news', Array.isArray(core.newsData.articles));
  ok('core requests exactly 2 files', requested.length === 2, JSON.stringify(requested));
  for (const u of CRITICAL) {
    ok(`core requests ${u}`, requested.includes(u), JSON.stringify(requested));
  }
  for (const u of DEFERRED) {
    ok(`core does NOT request ${u}`, !requested.includes(u), JSON.stringify(requested));
  }
}

/* ── loadSecondaryData fetches the deferred set and indexes it ── */
{
  const { api, requested, win } = makeEnv();
  const res = await api.loadSecondaryData();

  ok('secondary resolves', !!res);
  for (const u of DEFERRED) {
    ok(`secondary requests ${u}`, requested.includes(u), JSON.stringify(requested));
  }
  ok('risk indexed and zero-padded to 5 digits',
     !!win.DC_RISK_BY_FIPS && !!win.DC_RISK_BY_FIPS['01107'],
     JSON.stringify(win.DC_RISK_BY_FIPS));
  ok('incentives indexed by fips', Array.isArray(win.DC_INCENTIVES_FIPS['51107']),
     JSON.stringify(win.DC_INCENTIVES_FIPS));
  ok('numeric fips in incentives padded', Array.isArray(win.DC_INCENTIVES_FIPS['01059']),
     Object.keys(win.DC_INCENTIVES_FIPS).join(','));
  ok('full water stress exposed', win.DC_WATER_STRESS_FULL['51107'] === 3,
     JSON.stringify(win.DC_WATER_STRESS_FULL));
  ok('sample water stress exposed', win.DC_WATER_STRESS['51107'] === 2,
     JSON.stringify(win.DC_WATER_STRESS));
}

/* ── Memoized: map tab and analytics tab both call it ── */
{
  const { api, requested } = makeEnv();
  await Promise.all([api.loadSecondaryData(), api.loadSecondaryData()]);
  await api.loadSecondaryData();
  ok('secondary fetches each file once despite 3 calls',
     requested.length === DEFERRED.length, JSON.stringify(requested));
}

/* ── A failing deferred fetch degrades rather than rejecting ── */
{
  const { api, win } = makeEnv({ failUrls: ['data/sample_layers.json', 'data/political_risk.json'] });
  let threw = false;
  let res;
  try { res = await api.loadSecondaryData(); } catch (_) { threw = true; }

  ok('secondary does not reject on partial failure', threw === false);
  ok('secondary still resolves truthy', !!res);
  ok('missing sample layers degrades to empty water stress',
     JSON.stringify(win.DC_WATER_STRESS) === '{}', JSON.stringify(win.DC_WATER_STRESS));
  ok('missing risk degrades to empty index',
     JSON.stringify(win.DC_RISK_BY_FIPS) === '{}', JSON.stringify(win.DC_RISK_BY_FIPS));
  ok('unaffected payloads still indexed',
     Array.isArray(win.DC_INCENTIVES_FIPS['51107']), JSON.stringify(win.DC_INCENTIVES_FIPS));
}

/* ── Guard: the deferred files must not creep back into the critical path ── */
{
  const coreSrc = extract('async function loadCoreData()');
  for (const u of DEFERRED) {
    ok(`loadCoreData source does not mention ${u}`, !coreSrc.includes(u));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
