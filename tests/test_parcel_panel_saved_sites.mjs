/* tests/test_parcel_panel_saved_sites.mjs — js/parcel/panel.js's Save
   button and Saved Sites section (Phase 13: saved sites + comparison).

   Tests the two pure render helpers panel.js exposes for this feature
   (_saveButtonHtml, _renderSavedSites -- data/globals in, HTML string out,
   no DOM APIs used inside them): the save button reflects SAVED_SITES.has()
   correctly, degrades to '' when SAVED_SITES isn't loaded or the feature
   has no stable key, and the Saved Sites list renders every entry with
   both a "+ Compare" action (loads into the ephemeral compare tray) and a
   remove action (deletes from persistent storage) -- two different actions
   on two different stores, kept visibly distinct.

   Run:  node tests/test_parcel_panel_saved_sites.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

require('../js/parcel/panel.js');
const PANEL = global.window.PARCEL_PANEL;

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

function feature(overrides) {
  return {
    type: 'Feature',
    properties: { parcel_id: '1', county_fips: '51107', address: '100 Main St', ...overrides },
  };
}

// ── _saveButtonHtml ──────────────────────────────────────────────────────
{
  delete global.window.SAVED_SITES;
  ok('save button is absent when SAVED_SITES was never loaded', PANEL._saveButtonHtml(feature()) === '');
}
{
  global.window.SAVED_SITES = { keyFor: () => null, has: () => false };
  ok('save button is absent when the feature has no stable key', PANEL._saveButtonHtml(feature()) === '');
}
{
  global.window.SAVED_SITES = { keyFor: () => '51107:1', has: () => false };
  const html = PANEL._saveButtonHtml(feature());
  ok('an unsaved parcel shows the outline-star "Save" label', html.includes('☆ Save'));
  ok('an unsaved parcel is not marked active', !html.includes('pp-action-save-active'));
  ok('an unsaved parcel reports aria-pressed="false"', html.includes('aria-pressed="false"'));
}
{
  global.window.SAVED_SITES = { keyFor: () => '51107:1', has: () => true };
  const html = PANEL._saveButtonHtml(feature());
  ok('a saved parcel shows the filled-star "Saved" label', html.includes('★ Saved'));
  ok('a saved parcel is marked active', html.includes('pp-action-save-active'));
  ok('a saved parcel reports aria-pressed="true"', html.includes('aria-pressed="true"'));
}

// ── _renderSavedSites ────────────────────────────────────────────────────
{
  delete global.window.SAVED_SITES;
  ok('saved sites section is absent when SAVED_SITES was never loaded', PANEL._renderSavedSites() === '');
}
{
  global.window.SAVED_SITES = { list: () => [] };
  ok('saved sites section is absent when nothing is saved (no empty group shown)', PANEL._renderSavedSites() === '');
}
{
  global.window.SAVED_SITES = {
    list: () => [
      { key: '51107:1', properties: { address: '100 Main St', area_acres: 42, zoning_code: 'I-1' } },
      { key: '24031:9', properties: { pin: 'PIN-9', area_acres: 10 } },
    ],
  };
  const html = PANEL._renderSavedSites();
  ok('the section header shows the real count', html.includes('Saved Sites (2)'));
  ok('an entry with an address shows it', html.includes('100 Main St'));
  ok('an entry with acreage and zoning shows both', html.includes('42.0 ac') && html.includes('I-1'));
  ok('an entry with only a pin falls back to it as the label', html.includes('PIN-9'));
  ok('each entry has a "+ Compare" action to load it into the ephemeral tray',
    (html.match(/\+ Compare/g) || []).length === 2);
  ok('each entry has its own remove action, distinct from the compare action',
    (html.match(/_unsave/g) || []).length === 2);
  ok('a CSV export action is offered for the saved list', html.includes('_exportSavedCSV'));
  ok('each entry carries its own key for the click handlers to target', html.includes('51107:1') && html.includes('24031:9'));
}
{
  global.window.SAVED_SITES = {
    list: () => [{ key: '1', properties: { address: '<script>evil()</script>' } }],
  };
  const html = PANEL._renderSavedSites();
  ok('a hostile saved-site address is escaped, not injected as markup', !html.includes('<script>evil()'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
