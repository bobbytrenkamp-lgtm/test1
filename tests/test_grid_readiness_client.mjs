/* tests/test_grid_readiness_client.mjs — js/grid-readiness.js's
   fetch-and-cache wrapper around data/grid_readiness.json.

   Same lazy-fetch-once-cache-forever discipline already proven for
   js/parcel/proximity-layers.js's loadInfrastructureLayers(): one fetch
   serves every subsequent lookup, a failed fetch does not poison future
   attempts, and a county absent from the data resolves to null rather
   than throwing (a jurisdiction-page card must degrade gracefully, never
   crash the page).

   Run:  node tests/test_grid_readiness_client.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}
function t(name, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  same ? pass++ : fail++;
  console.log(`${same ? 'PASS' : 'FAIL'}  ${name}`);
  if (!same) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}

function stubFetch(handler) {
  global.fetch = async (url) => {
    const body = handler(String(url));
    if (body === null) return { ok: false, status: 404, json: async () => { throw new Error('no body'); } };
    return { ok: true, status: 200, json: async () => body };
  };
}

const sampleDoc = {
  meta: { counties_scored: 1, interconnection_queue_data_available: true },
  counties: {
    '51107': { fips: '51107', overall: 67, confidence: 'high', components: [], omitted: [] },
  },
};

function freshModule() {
  delete require.cache[require.resolve('../js/grid-readiness.js')];
  delete global.GRID_READINESS;
  require('../js/grid-readiness.js');
  return global.GRID_READINESS;
}

async function main() {
  // ── getByFips resolves a real county record ──────────────────────────
  {
    stubFetch(() => sampleDoc);
    const G = freshModule();
    const rec = await G.getByFips('51107');
    t('resolves the real county record', rec, sampleDoc.counties['51107']);
  }

  // ── a county absent from the data resolves to null, not an error ────
  {
    stubFetch(() => sampleDoc);
    const G = freshModule();
    const rec = await G.getByFips('99999');
    ok('an unscored county resolves to null, not undefined or a throw', rec === null);
  }

  // ── one fetch serves multiple lookups ────────────────────────────────
  {
    let calls = 0;
    stubFetch(() => { calls++; return sampleDoc; });
    const G = freshModule();
    await G.getByFips('51107');
    await G.getByFips('51107');
    await G.getByFips('99999');
    t('exactly one fetch serves three lookups', calls, 1);
  }

  // ── a failed fetch does not poison future attempts ───────────────────
  {
    let calls = 0;
    stubFetch(() => { calls++; return calls === 1 ? null : sampleDoc; });
    const G = freshModule();
    const first = await G.getByFips('51107');
    ok('a failed first fetch resolves to null, not a thrown error', first === null);
    const second = await G.getByFips('51107');
    t('a subsequent call retries rather than staying poisoned', second, sampleDoc.counties['51107']);
    t('exactly two fetch attempts were made (one failed, one succeeded)', calls, 2);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
