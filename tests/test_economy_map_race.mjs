/* tests/test_economy_map_race.mjs — Node regression test for
   js/economy-map.js's layer-toggle race safety.

   Root cause this guards against: activate() used to gate itself with a
   single `_loading` boolean. Toggling economic layer A, then layer B before
   A's fetch resolved, made B's activate() call return false immediately
   (indistinguishable from a genuine failure) while A's original promise
   later resolved and won anyway — leaving the map showing A's data while
   *neither* checkbox ended up checked. Fixed with a monotonic _requestGen
   counter: a superseded activate() call now discards its own result
   silently instead of rolling back a checkbox a newer toggle already owns.

   This test drives that exact sequence with controllable promises (no real
   network, no real DOM) and asserts the final state is self-consistent.

   Run:  node tests/test_economy_map_race.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
function check(cond, name, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail) console.log(`   ${detail}`);
}

/* ── Minimal environment: no jsdom, just enough to satisfy economy-map.js's
   function-scoped (not module-scope) references to document/window.ECONOMY. */
global.window = global;

const checkboxes = {}; // selector -> { checked }
global.document = {
  querySelector(sel) { return checkboxes[sel] || null; },
};
function checkbox(layerId) {
  const sel = `#filter-panel-body input[data-layer="${layerId}"]`;
  return (checkboxes[sel] ??= { checked: false });
}

/* Deferred, individually-resolvable promises so the test controls exactly
   when each activate() call's fetch "completes", regardless of call order. */
const pending = [];
window.ECONOMY = {
  METRICS: { median_household_income: { label: 'Income', unit: '$', dec: 0 },
             unemployment_rate:       { label: 'Unemployment', unit: '%', dec: 1 } },
  load(kind) {
    return new Promise(resolve => { pending.push(resolve); });
  },
  hasCounty: () => true,
  metricValue: () => 42,
  makeClassifier: () => ({ count: 1 }),
};
window.layerStateRef = { econ_income: false, econ_unemployment: false };

require('../js/economy-map.js');
const M = window.ECONOMY_MAP;

async function main() {
  // 1. Toggle layer A on. Its activate() call starts but does not resolve —
  //    `pending[0]` now holds A's resolver.
  window.layerStateRef.econ_income = true;
  checkbox('econ_income').checked = true;
  M.onLayerToggle('econ_income', true);
  await Promise.resolve(); // let the load() call happen and register

  check(pending.length === 1, 'layer A activate() called load() once');

  // 2. Toggle layer B on BEFORE A resolves. The exclusivity logic turns A's
  //    checkbox off; B's own activate() call starts (`pending[1]`).
  window.layerStateRef.econ_unemployment = true;
  checkbox('econ_unemployment').checked = true;
  M.onLayerToggle('econ_unemployment', true);
  await Promise.resolve();

  check(pending.length === 2, 'layer B activate() called load() once');
  check(checkbox('econ_income').checked === false,
    'B\'s exclusivity logic unchecked A\'s checkbox');

  // 3. Resolve A's (now-stale) request FIRST, simulating the real-world race
  //    where the slower first request finishes after a second one started.
  pending[0]({ counties: {}, acs_vintage: '2022' });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

  check(M.activeLayerId() !== 'econ_income',
    'stale A resolution did not become the active layer',
    `activeLayerId() = ${M.activeLayerId()}`);
  check(checkbox('econ_income').checked === false,
    'stale A resolution did not re-check A\'s checkbox (no rollback-as-failure)');

  // 4. Resolve B's request. This one is NOT stale — it should win normally.
  pending[1]({ counties: {}, acs_vintage: '2022' });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

  check(M.activeLayerId() === 'econ_unemployment',
    'B (the later, non-stale request) became the active layer',
    `activeLayerId() = ${M.activeLayerId()}`);
  check(checkbox('econ_unemployment').checked === true,
    'B\'s checkbox remains checked');
  check(checkbox('econ_income').checked === false,
    'A\'s checkbox remains unchecked — final state is self-consistent');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
