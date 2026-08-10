/* tests/test_map_power_viewport.mjs — js/map.js's viewport-aware
   partitioned loading for the power (substation) layer: bbox intersection,
   the manifest-driven fetch, the bounded LRU partition cache, and that a
   viewport with N intersecting states only fetches those N partitions
   (never every state in the manifest).

   Extracts the real source (not a reimplementation) from js/map.js via
   brace matching, same technique tests/test_data_loading.mjs already
   uses, and runs it against a stub fetch + a stub leafletMap.getBounds().

   Run: node tests/test_map_power_viewport.mjs
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const src = readFileSync(ROOT + 'js/map.js', 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   got: ${JSON.stringify(detail)}`);
}
function t(name, actual, expected) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected });
}

function extractFrom(startMarker, endFunctionSignature) {
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`start marker not found: ${startMarker}`);
  const fnStart = src.indexOf(endFunctionSignature, start);
  if (fnStart === -1) throw new Error(`end function not found: ${endFunctionSignature}`);
  let depth = 0;
  const braceStart = src.indexOf('{', fnStart);
  for (let k = braceStart; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(start, k + 1); }
  }
  throw new Error('unbalanced braces');
}

const code = extractFrom(
  'const POWER_MANIFEST_URL',
  'async function _loadPowerDataForCurrentView()',
);

function makeEnv() {
  const calls = [];
  const fetchImpl = (url) => {
    calls.push(url);
    if (url === '/manifest-fail') return Promise.reject(new Error('network'));
    const body = FIXTURES[url];
    if (body === undefined) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    return Promise.resolve({ ok: true, status: 200, json: async () => body });
  };
  const _fetchJSON = url =>
    Promise.resolve(fetchImpl(url)).then(r => { if (!r.ok) throw new Error(url); return r.json(); });

  let boundsValue = null;
  const leafletMap = { getBounds: () => boundsValue };

  const factory = new Function('_fetchJSON', 'leafletMap', `
    let _powerRawData = null;
    ${code}
    return {
      loadPowerDataForCurrentView: _loadPowerDataForCurrentView,
      getRawData: () => _powerRawData,
      cache: _powerStateCache,
      bboxIntersectsBounds: _bboxIntersectsBounds,
      statesInView: _statesInView,
    };
  `);
  const api = factory(_fetchJSON, leafletMap);
  return { api, calls, setBounds: (b) => { boundsValue = b; } };
}

const FIXTURES = {
  'data/layers/power_infrastructure/manifest.json': {
    states: {
      VA: { file: 'data/layers/power_infrastructure/states/VA.json', bbox: [-83.7, 37.5, -75.2, 39.5] },
      NC: { file: 'data/layers/power_infrastructure/states/NC.json', bbox: [-84.3, 33.8, -75.4, 35.5] },
      CA: { file: 'data/layers/power_infrastructure/states/CA.json', bbox: [-124.4, 32.5, -114.1, 42.0] },
    },
  },
  'data/layers/power_infrastructure/states/VA.json': [{ id: 'va1', lat: 38.9, lon: -77.5, state: 'VA' }],
  'data/layers/power_infrastructure/states/NC.json': [{ id: 'nc1', lat: 35.8, lon: -78.6, state: 'NC' }],
  'data/layers/power_infrastructure/states/CA.json': [{ id: 'ca1', lat: 37.0, lon: -120.0, state: 'CA' }],
};

function boundsBox(west, south, east, north) {
  return { getWest: () => west, getSouth: () => south, getEast: () => east, getNorth: () => north };
}

// ── _bboxIntersectsBounds (pure) ─────────────────────────────────────────
{
  const { api } = makeEnv();
  const bounds = boundsBox(-80, 36, -76, 40);
  ok('an overlapping bbox intersects', api.bboxIntersectsBounds([-83.7, 36.5, -75.2, 39.5], bounds));
  ok('a disjoint bbox (California) does not intersect a Virginia-area view', !api.bboxIntersectsBounds([-124.4, 32.5, -114.1, 42.0], bounds));
  ok('a missing bbox never intersects', !api.bboxIntersectsBounds(null, bounds));
}

// ── _statesInView ─────────────────────────────────────────────────────────
{
  const { api } = makeEnv();
  const manifest = FIXTURES['data/layers/power_infrastructure/manifest.json'];
  const bounds = boundsBox(-80, 36, -76, 40); // Virginia-ish
  const states = api.statesInView(manifest, bounds);
  t('only the intersecting states are selected (VA, not CA)', states.sort(), ['VA']);
  t('no bounds available falls back to every state (safe over-fetch, never renders nothing)',
    api.statesInView(manifest, null).sort(), ['CA', 'NC', 'VA']);
  t('an empty/missing manifest yields no states', api.statesInView(null, bounds), []);
}

// ── loadPowerDataForCurrentView: fetches only intersecting states ────────
{
  const { api, calls, setBounds } = makeEnv();
  setBounds(boundsBox(-80, 36, -76, 40)); // VA only
  await api.loadPowerDataForCurrentView();
  ok('the manifest is fetched', calls.includes('data/layers/power_infrastructure/manifest.json'));
  ok('VA partition is fetched', calls.some(u => u.includes('states/VA.json')));
  ok('CA partition (not in view) is never fetched', !calls.some(u => u.includes('states/CA.json')));
  t('rawData reflects only the in-view state', api.getRawData().map(r => r.id), ['va1']);
}

// ── loadPowerDataForCurrentView: caching -- a state already cached is not refetched ──
{
  const { api, calls, setBounds } = makeEnv();
  setBounds(boundsBox(-80, 36, -76, 40));
  await api.loadPowerDataForCurrentView();
  const callsAfterFirst = calls.length;
  await api.loadPowerDataForCurrentView(); // same viewport again
  t('no new network calls on an unchanged, already-cached viewport', calls.length, callsAfterFirst);
}

// ── loadPowerDataForCurrentView: panning to a new state fetches only the new one ──
{
  const { api, calls, setBounds } = makeEnv();
  setBounds(boundsBox(-80, 36, -76, 40)); // VA
  await api.loadPowerDataForCurrentView();
  setBounds(boundsBox(-82, 34, -76, 37)); // pan south into NC (still overlapping VA's south edge is fine either way)
  await api.loadPowerDataForCurrentView();
  ok('NC is now fetched after panning into it', calls.some(u => u.includes('states/NC.json')));
  ok('VA was fetched only once total despite two loads', calls.filter(u => u.includes('states/VA.json')).length <= 1);
}

// ── loadPowerDataForCurrentView: render set reflects only the CURRENT view, not every cached state ──
{
  const { api, setBounds } = makeEnv();
  setBounds(boundsBox(-80, 36, -76, 40)); // VA
  await api.loadPowerDataForCurrentView();
  setBounds(boundsBox(-124, 32, -114, 42)); // pan all the way to California
  await api.loadPowerDataForCurrentView();
  t('rawData after panning to CA no longer includes the cached-but-off-screen VA point',
    api.getRawData().map(r => r.id), ['ca1']);
  ok('VA data is still cached in memory (not evicted just for being off-screen)', api.cache.has('VA'));
}

// ── loadPowerDataForCurrentView: a failed manifest degrades to an empty layer, not a throw ──
{
  const { api } = makeEnv();
  // Point the manifest URL fetch at a guaranteed-failing path by wiring a
  // fresh env whose only fixture is the failure.
  const failFetchImpl = () => Promise.reject(new Error('network down'));
  const _fetchJSON = () => Promise.resolve(failFetchImpl()).catch(() => { throw new Error('manifest HTTP 503'); });
  const factory = new Function('_fetchJSON', 'leafletMap', `
    let _powerRawData = null;
    ${code}
    return { loadPowerDataForCurrentView: _loadPowerDataForCurrentView, getRawData: () => _powerRawData };
  `);
  const failApi = factory(_fetchJSON, { getBounds: () => boundsBox(-80, 36, -76, 40) });
  let threw = false;
  try { await failApi.loadPowerDataForCurrentView(); } catch { threw = true; }
  ok('a failed manifest load does not throw out of loadPowerDataForCurrentView', !threw);
  t('rawData degrades to an empty array rather than staying null', failApi.getRawData(), []);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
