/* tests/test_parcel_find_sites.mjs — js/parcel/find-sites.js (Phase 12: Find
   Sites UI wiring).

   PARCEL_SITE_SEARCH was built and unit-tested (tests/test_parcel_site_search.mjs)
   but had zero UI consumer -- confirmed by grepping the whole repo for its
   export name outside its own module and test file. This tests the pure
   functions find-sites.js adds on top of it: buildCriteriaFromForm() (raw
   form values -> a PARCEL_SITE_SEARCH criteria object, with blank fields
   omitted rather than coerced into an accidental filter), runSearch()
   (wires form fields -> criteria -> PARCEL_RENDERER.getFeatures() as the
   candidate set -> PARCEL_SITE_SEARCH.search()), and renderResults()
   (search result -> results-list HTML, preserving the matched/rejected/
   indeterminate distinction and never hiding the "0 parcels loaded" case
   behind a bare "no matches").

   Run:  node tests/test_parcel_find_sites.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

// find-sites.js self-inits at load time (safe no-op against the document
// stub above, since getElementById always returns null) and depends on
// PARCEL_SITE_SEARCH for runSearch() -- load that for real rather than
// re-implementing its logic in a stub.
require('../js/parcel/site-search.js');
require('../js/parcel/find-sites.js');
const FS = global.window.FIND_SITES;

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

// ── buildCriteriaFromForm ───────────────────────────────────────────────
{
  const { criteria, errors } = FS.buildCriteriaFromForm({});
  t('empty form produces empty criteria, no errors', { criteria, errors }, { criteria: {}, errors: [] });
}
{
  const { criteria, errors } = FS.buildCriteriaFromForm({
    minAcres: '25', maxAcres: '', states: 'va, md', zoningCodes: 'I, M-1',
  });
  ok('numeric field is coerced to a number', criteria.minAcres === 25);
  ok('blank numeric field is omitted, not coerced to 0/NaN', !('maxAcres' in criteria));
  t('comma-list field is split and trimmed', criteria.states, ['va', 'md']);
  t('a second comma-list field works independently', criteria.zoningCodes, ['I', 'M-1']);
  ok('no errors on a well-formed form', errors.length === 0);
}
{
  const { criteria, errors } = FS.buildCriteriaFromForm({ minAcres: 'not-a-number' });
  ok('a non-numeric value in a numeric field is rejected, not silently dropped or coerced to 0', errors.length === 1);
  ok('the rejected field never lands in criteria', !('minAcres' in criteria));
}
{
  const { errors } = FS.buildCriteriaFromForm({ minAcres: '100', maxAcres: '10' });
  ok('min > max is caught before it reaches the search engine', errors.some(e => e.includes('greater than')));
}
{
  const { criteria } = FS.buildCriteriaFromForm({ ownerKnown: true });
  ok('boolean ownerKnown is passed through', criteria.ownerKnown === true);
}
{
  const { criteria } = FS.buildCriteriaFromForm({ states: '  ' });
  ok('a whitespace-only list field is omitted, not an empty-array filter that matches nothing', !('states' in criteria));
}

// ── runSearch ────────────────────────────────────────────────────────────
{
  const result = FS.runSearch({});
  ok('no criteria at all is rejected with a clear error, not run as "match everything"',
    result.error === 'Enter at least one search criterion.');
}
{
  const result = FS.runSearch({ minAcres: 'nope' });
  ok('a validation error from buildCriteriaFromForm propagates to runSearch', typeof result.error === 'string' && result.error.includes('must be a number'));
}
{
  global.window.PARCEL_RENDERER = {
    getFeatures: () => [
      { type: 'Feature', properties: { parcel_id: 'p1', area_acres: 80, state: 'VA' }, geometry: null },
      { type: 'Feature', properties: { parcel_id: 'p2', area_acres: 5,  state: 'VA' }, geometry: null },
    ],
  };
  const result = FS.runSearch({ minAcres: '50' });
  ok('runSearch pulls candidates from PARCEL_RENDERER.getFeatures()', result.counts.evaluated === 2);
  ok('the >=50-acre parcel matches', result.matched.length === 1 && result.matched[0].id === 'p1');
  ok('the <50-acre parcel is rejected, not matched', result.rejected.length === 1 && result.rejected[0].id === 'p2');
}
{
  global.window.PARCEL_RENDERER = { getFeatures: () => [] };
  const result = FS.runSearch({ minAcres: '50' });
  ok('an empty map (nothing loaded yet) is a real, distinct zero -- not an error', !result.error && result.counts.evaluated === 0);
}
{
  const savedEngine = global.window.PARCEL_SITE_SEARCH;
  delete global.window.PARCEL_SITE_SEARCH;
  const result = FS.runSearch({ minAcres: '50' });
  ok('missing PARCEL_SITE_SEARCH is a clear error, not a silent crash', result.error === 'Site search engine unavailable.');
  global.window.PARCEL_SITE_SEARCH = savedEngine;
}

// ── runSearchNational ────────────────────────────────────────────────────
{
  const result = await FS.runSearchNational({});
  ok('no criteria at all is rejected with a clear error, same as viewport scope',
    result.error === 'Enter at least one search criterion.');
}
{
  const savedIndex = global.window.PARCEL_SITE_SEARCH_INDEX;
  delete global.window.PARCEL_SITE_SEARCH_INDEX;
  const result = await FS.runSearchNational({ minAcres: '50' });
  ok('missing PARCEL_SITE_SEARCH_INDEX is a clear error, not a silent crash',
    result.error === 'National site index unavailable.');
  global.window.PARCEL_SITE_SEARCH_INDEX = savedIndex;
}
{
  global.window.PARCEL_SITE_SEARCH_INDEX = {
    searchNational: async () => { throw new Error('HTTP 503'); },
  };
  const result = await FS.runSearchNational({ minAcres: '50' });
  ok('an index load failure is surfaced as a readable error, not thrown',
    typeof result.error === 'string' && result.error.includes('HTTP 503'));
}
{
  global.window.PARCEL_SITE_SEARCH_INDEX = {
    searchNational: async (criteria) => ({
      matched: [], rejected: [], indeterminate: [], results: [],
      counts: { evaluated: 3, matched: 1, rejected: 2, indeterminate: 0 },
      meta: { generated_at: '2026-08-09T00:00:00Z', jurisdictions_ok: 2, caveat: 'index caveat text' },
    }),
  };
  const result = await FS.runSearchNational({ minAcres: '50' });
  t('runSearchNational delegates to PARCEL_SITE_SEARCH_INDEX.searchNational', result.counts.evaluated, 3);
  ok('the index metadata flows through to the caller', !!result.meta);
}

// ── renderResults ────────────────────────────────────────────────────────
{
  ok('null result shows a prompt to search, not an empty screen', FS.renderResults(null).includes('Enter search criteria'));
}
{
  const html = FS.renderResults({ error: 'Enter at least one search criterion.' });
  ok('an error result surfaces the error text', html.includes('Enter at least one search criterion.'));
}
{
  const html = FS.renderResults({
    counts: { evaluated: 0, matched: 0, rejected: 0, indeterminate: 0 }, results: [], matched: [], rejected: [], indeterminate: [],
  });
  ok('zero parcels loaded gets an explanatory message distinct from "no matches"',
    html.includes('No parcels are loaded on the map yet'));
}
{
  const html = FS.renderResults({
    counts: { evaluated: 5, matched: 0, rejected: 5, indeterminate: 0 }, results: [], matched: [], rejected: [], indeterminate: [],
  });
  ok('real evaluated-but-zero-matches gets a different message than zero-loaded',
    html.includes('No loaded parcels matched') && !html.includes('No parcels are loaded on the map yet'));
}
{
  const candidate = { id: 'p1', properties: { address: '100 Main St', area_acres: 80, zoning_code: 'I-1' } };
  const entry = { id: 'p1', candidate, outcome: 'matched', acres: 80 };
  const html = FS.renderResults({
    counts: { evaluated: 1, matched: 1, rejected: 0, indeterminate: 0 },
    results: [entry], matched: [entry], rejected: [], indeterminate: [], caveat: null,
  });
  ok('a matched parcel shows its address', html.includes('100 Main St'));
  ok('a matched parcel shows its acreage', html.includes('80.0 ac'));
  ok('a matched parcel shows its zoning code', html.includes('I-1'));
  ok('each result row carries its list index for click-to-focus wiring', html.includes('data-fs-idx="0"'));
}
{
  const html = FS.renderResults({
    counts: { evaluated: 1, matched: 0, rejected: 0, indeterminate: 1 },
    results: [], matched: [], rejected: [],
    indeterminate: [{ id: 'p1', candidate: { properties: {} }, outcome: 'indeterminate', acres: null }],
    caveat: '1 parcel(s) could not be fully evaluated because the data needed for one or more criteria is not available for them. They are excluded from results, not silently treated as passing.',
  });
  ok('an indeterminate-parcel caveat is surfaced verbatim, not summarized away', html.includes('could not be fully evaluated'));
}
{
  const html = FS.renderResults({
    counts: { evaluated: 3, matched: 1, rejected: 2, indeterminate: 0 },
    results: [], matched: [], rejected: [], indeterminate: [], caveat: null,
    meta: { generated_at: '2026-08-09T00:00:00Z', jurisdictions_ok: 2, caveat: 'This index covers only wired jurisdictions.' },
  });
  ok('a national-index result describes the index, not "currently loaded on the map"',
    html.includes('precomputed national index') && !html.includes('currently loaded on the map'));
  ok('the index generation date is shown', html.includes('2026-08-09T00:00:00Z'));
  ok('the jurisdiction count is shown', html.includes('2 jurisdiction'));
  ok('the index metadata caveat is surfaced', html.includes('This index covers only wired jurisdictions.'));
}
{
  const html = FS.renderResults({
    counts: { evaluated: 0, matched: 0, rejected: 0, indeterminate: 0 }, results: [], matched: [], rejected: [], indeterminate: [],
    meta: { generated_at: '2026-08-09T00:00:00Z', jurisdictions_ok: 2 },
  });
  ok('a zero-parcel national index result gets index-specific copy, not the viewport "pan/zoom" message',
    html.includes('national index has no parcels') && !html.includes('Pan or zoom'));
}
{
  const hostile = { id: 'p1', properties: { address: '<img src=x onerror=alert(1)>' } };
  const entry = { id: 'p1', candidate: hostile, outcome: 'matched', acres: 1 };
  const html = FS.renderResults({
    counts: { evaluated: 1, matched: 1, rejected: 0, indeterminate: 0 },
    results: [entry], matched: [entry], rejected: [], indeterminate: [], caveat: null,
  });
  ok('a hostile address value is escaped, not injected as markup', !html.includes('<img src=x'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
