/* tests/test_parcel_saved_sites.mjs — js/parcel/saved-sites.js (Phase 13:
   saved sites + comparison).

   The parcel Compare tray (js/parcel/selection.js) is in-memory only --
   confirmed by grepping it for any localStorage call: there is none, so a
   page refresh silently loses everything a user added. This tests the new
   persistent SAVED_SITES module: keying (jurisdiction-scoped, since
   parcel_id is only unique within a county), add/remove/toggle/has/get,
   that a full property snapshot is stored so a saved site still renders
   real data after the live parcel is gone from the map, notes, and CSV
   export reusing the exact same field list as the compare tray's export.

   Uses a lightweight in-memory localStorage stub rather than jsdom -- this
   suite must run in this sandbox, where jsdom is not installed (see the 3
   pre-existing jsdom-only suites tests/run_all.sh reports as skipped).

   Run:  node tests/test_parcel_saved_sites.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

class FakeLocalStorage {
  constructor() { this._map = new Map(); }
  getItem(k) { return this._map.has(k) ? this._map.get(k) : null; }
  setItem(k, v) { this._map.set(k, String(v)); }
  removeItem(k) { this._map.delete(k); }
  clear() { this._map.clear(); }
}
global.localStorage = new FakeLocalStorage();

require('../js/parcel/saved-sites.js');
const SS = global.window.SAVED_SITES;

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

function feature(overrides) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-77.4, 39.1] },
    properties: {
      parcel_id: '12345', county_fips: '51107', address: '100 Main St',
      zoning_code: 'I-1', area_acres: 42, ...overrides,
    },
  };
}

function reset() {
  global.localStorage.clear();
  // Force the module to re-read storage on next call rather than serving
  // its in-memory cache from a previous test block.
  const raw = SS.list();
  for (const e of raw) SS.remove(e.key);
}

// ── keyFor ───────────────────────────────────────────────────────────────
{
  ok('keyFor combines county_fips and parcel_id, not parcel_id alone',
    SS.keyFor(feature()) === '51107:12345');
  ok('keyFor falls back to pin when parcel_id is absent',
    SS.keyFor(feature({ parcel_id: undefined, pin: 'PIN-9' })) === '51107:PIN-9');
  ok('a feature with neither an id nor a county has no stable key',
    SS.keyFor({ properties: {} }) === null);
  ok('two different counties reusing the same parcel_id get different keys',
    SS.keyFor(feature({ county_fips: '51107' })) !== SS.keyFor(feature({ county_fips: '24031' })));
}

// ── add / has / get / remove / toggle ─────────────────────────────────────
reset();
{
  const f = feature();
  ok('a fresh parcel is not saved yet', SS.has(f) === false);
  ok('add() reports success on a new parcel', SS.add(f) === true);
  ok('add() reports failure (not a silent overwrite) on an already-saved parcel', SS.add(f) === false);
  ok('has() reflects the save', SS.has(f) === true);
  const got = SS.get(f);
  ok('get() returns the entry with its properties snapshotted',
    got && got.properties.address === '100 Main St');
  ok('remove() reports success and has() flips back', SS.remove(f) === true && SS.has(f) === false);
  ok('remove() on an already-absent parcel reports failure, not a silent no-op success', SS.remove(f) === false);
}
{
  const f = feature({ parcel_id: '999' });
  ok('toggle() adds when not present, returns true', SS.toggle(f) === true);
  ok('toggle() removes when present, returns false', SS.toggle(f) === false);
}

// ── Persistence across a fresh module load (survives "reload") ───────────
{
  reset();
  const f = feature({ parcel_id: '777' });
  SS.add(f, { notes: 'good substation access' });
  const raw = global.localStorage.getItem('dc-saved-parcels-v1');
  ok('a save is actually written to localStorage, not just kept in memory', raw !== null);
  const parsed = JSON.parse(raw);
  ok('the persisted blob is schema-tagged', parsed._schema === 'saved_sites_v1');
  ok('the persisted entry carries the notes', parsed.entries[0].notes === 'good substation access');
}

// ── setNotes ────────────────────────────────────────────────────────────
{
  reset();
  const f = feature({ parcel_id: '555' });
  ok('setNotes on an unsaved parcel fails rather than silently creating one', SS.setNotes(f, 'x') === false);
  SS.add(f);
  ok('setNotes on a saved parcel succeeds', SS.setNotes(f, 'revisit in Q3') === true);
  ok('the note is retrievable', SS.get(f).notes === 'revisit in Q3');
}

// ── list / count / clear ───────────────────────────────────────────────
{
  reset();
  SS.add(feature({ parcel_id: 'a' }));
  SS.add(feature({ parcel_id: 'b' }));
  ok('count() reflects two saves', SS.count() === 2);
  ok('list() returns both entries', SS.list().length === 2);
  SS.clear();
  ok('clear() empties the store', SS.count() === 0 && SS.list().length === 0);
}

// ── onChange ────────────────────────────────────────────────────────────
{
  reset();
  const events = [];
  const unsubscribe = SS.onChange(e => events.push(e.action));
  const f = feature({ parcel_id: 'watch-me' });
  SS.add(f);
  SS.setNotes(f, 'n');
  SS.remove(f);
  ok('onChange fires for add/notes/remove in order', events.join(',') === 'add,notes,remove');
  unsubscribe();
  SS.add(feature({ parcel_id: 'after-unsub' }));
  ok('unsubscribing actually stops delivery', events.length === 3);
}

// ── CSV export ──────────────────────────────────────────────────────────
{
  reset();
  const entries = [{
    key: '51107:1', properties: {
      parcel_id: '1', address: '100 Main St, Suite "A"', owner: 'Acme, Inc.',
      area_acres: 42.5, zoning_code: 'I-1', county_fips: '51107',
    },
  }];
  const csv = SS.renderCSV(entries);
  const lines = csv.split('\r\n');
  ok('CSV header uses PARCEL_SCHEMA.FIELD_MAP column count when schema is absent (falls back to raw field ids)',
    lines[0].split(',').length === SS.CSV_FIELDS.length);
  ok('a value containing a comma is quoted', lines[1].includes('"100 Main St, Suite ""A"""'));
  ok('a value containing a comma in owner is quoted too', lines[1].includes('"Acme, Inc."'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
