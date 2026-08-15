/* tests/test_parcel_panel_intelligence.mjs — js/parcel/panel.js's new
   "Intelligence" tab (Phase 11: UI integration).

   proximity.js, constraints.js, suitability.js, and sales.js were each
   built and unit-tested in isolation, but had zero UI consumer before this
   tab existed -- a real "DATA EXISTS but is not UI INTEGRATED" gap in this
   project's own five-state completion model. This tests the four pure
   render helpers panel.js now exposes (data in, HTML string out -- no DOM
   APIs touched inside them), covering: the scorable/not-scorable suitability
   split, proximity's found/error/unavailable rows, constraints' intersecting
   layers, sales history capped at 5 with non-market sales labelled, and
   that each section degrades to '' rather than a misleading empty group
   when its backing module was never loaded on the page.

   Run:  node tests/test_parcel_panel_intelligence.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

global.polygonClipping = require('../js/vendor/polygon-clipping.umd.min.js');
require('../js/parcel/schema.js');
require('../js/parcel/provenance.js');
require('../js/parcel/geo.js');
require('../js/parcel/sales.js');
require('../js/parcel/site-intelligence.js');
require('../js/parcel/panel.js');
const PANEL = global.window.PARCEL_PANEL;

const geom = { type: 'Polygon', coordinates: [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]] };

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

// ── Suitability ──────────────────────────────────────────────────────────
{
  ok('null suitability result renders nothing', PANEL._renderSuitability(null) === '');
}
{
  const html = PANEL._renderSuitability({
    scorable: false,
    why: 'None of the inputs this score needs were available for this parcel.',
  });
  ok('not-scorable result shows the why, not a fake score', html.includes('None of the inputs'));
  ok('not-scorable result has no score bar', !html.includes('pf-score-bar-wrap'));
}
{
  const html = PANEL._renderSuitability({
    scorable: true,
    overall: 82,
    basis: 'Weighted mean of 3 component(s) covering 57% of the total weight.',
    disclaimer: 'Screening score only.',
    components: [
      { label: 'Power Proximity', score: 90, weight: 25, rule: 'Distance curve.' },
    ],
    omitted: [
      { label: 'Market Context', weight: 10, why: 'the data this component needs was not available' },
    ],
  });
  ok('scorable result shows the headline number', html.includes('82'));
  ok('scorable result shows the basis sentence', html.includes('Weighted mean of 3'));
  ok('scorable result lists a scored component', html.includes('Power Proximity'));
  ok('scorable result lists an omitted component, not silently dropped', html.includes('Market Context'));
  ok('scorable result carries the disclaimer', html.includes('Screening score only.'));
}

// ── Proximity ────────────────────────────────────────────────────────────
{
  delete global.window.PARCEL_PROXIMITY;
  ok('proximity section is empty when PARCEL_PROXIMITY was never loaded', PANEL._renderProximity(null) === '');
}
{
  global.window.PARCEL_PROXIMITY = { formatDistance: (mi) => `${mi.toFixed(1)} mi` };
  ok('proximity shows a loading state before the fetch resolves',
    PANEL._renderProximity(null).includes('Loading proximity data'));
}
{
  const html = PANEL._renderProximity({
    results: [
      { layerId: 'substations', label: 'Substations', nearest: { distanceMiles: 2.3, name: 'Ashburn Sub' } },
      { layerId: 'power-plants', label: 'Power Plants', error: 'HTTP 503' },
    ],
    unavailable: [
      { layerId: 'transmission-lines', reason: 'no live source registered' },
    ],
  });
  ok('proximity shows a found layer with distance and name', html.includes('2.3 mi') && html.includes('Ashburn Sub'));
  ok('proximity shows a failed layer as unavailable, not silently dropped', html.includes('HTTP 503'));
  ok('proximity shows an unregistered layer\'s reason', html.includes('no live source registered'));
}
{
  const html = PANEL._renderProximity({ results: [], unavailable: [] });
  ok('proximity with genuinely nothing nearby says so explicitly', html.includes('No infrastructure found'));
}

// ── Constraints ──────────────────────────────────────────────────────────
{
  delete global.window.PARCEL_CONSTRAINTS;
  ok('constraints section is empty when PARCEL_CONSTRAINTS was never loaded', PANEL._renderConstraints(null) === '');
  global.window.PARCEL_CONSTRAINTS = {};
}
{
  ok('constraints shows a loading state before the fetch resolves',
    PANEL._renderConstraints(null).includes('Loading constraint data'));
}
{
  const html = PANEL._renderConstraints({
    summary: {
      constrainedAcres: 1.2, constrainedPct: 15.5,
      unconstrainedByCheckedLayersAcres: 6.5,
      disclaimer: 'Mapped constraints only, not a survey.',
    },
    results: [
      { label: 'FEMA Flood Zone', intersects: true, pctOfParcel: 15.5, caveat: 'Map vintage varies.' },
      { label: 'NWI Wetlands', intersects: false, pctOfParcel: 0 },
    ],
  });
  ok('constraints shows constrained acreage/pct', html.includes('1.2 ac') && html.includes('15.5%'));
  ok('constraints lists an intersecting layer with its caveat', html.includes('FEMA Flood Zone') && html.includes('Map vintage varies.'));
  ok('constraints does not list a non-intersecting layer', !html.includes('NWI Wetlands'));
  ok('constraints carries its disclaimer', html.includes('Mapped constraints only'));
}

// ── Sales ────────────────────────────────────────────────────────────────
{
  ok('null sales history renders nothing', PANEL._renderSales(null) === '');
  ok('zero-count sales history renders nothing', PANEL._renderSales({ count: 0, sales: [] }) === '');
}
{
  const sales = { count: 2, sales: [
    { sale_date: '2024-05-01', sale_price: 4200000, classification: 'market' },
    { sale_date: '2019-01-15', sale_price: 1, classification: 'nominal' },
  ] };
  const html = PANEL._renderSales(sales);
  ok('sales shows the count in the group label', html.includes('Sales History (2)'));
  ok('sales formats a market-sale price with commas', html.includes('$4,200,000'));
  ok('sales labels a non-market transfer explicitly, not as a comparable sale', html.includes('(nominal)'));
}
{
  const many = { count: 7, sales: Array.from({ length: 7 }, (_, i) => (
    { sale_date: `202${i}-01-01`, sale_price: 100 + i, classification: 'market' }
  )) };
  const html = PANEL._renderSales(many);
  const rowCount = (html.match(/pp-field-label/g) || []).length;
  ok('sales history is capped at 5 rows even when more exist', rowCount === 5);
}

// ── Site Status (Phase 5/7/8: canonical schema + deterministic findings) ──
{
  const html = PANEL._renderSiteStatus(
    { parcel_id: 'X-1', county_fips: '51107' },
    { geometry: geom },
    null, // no cached proximity/constraints yet
    null, // no suitability score yet
    'X-1',
  );
  ok('site status renders even with nothing else resolved yet', html.includes('Site Status'));
  ok('with no zoning or constraint data, site status reads as Insufficient Data', html.includes('Insufficient Data'));
  ok('an unassessed zoning read shows up under unknowns', html.includes('Unknowns'));
}
{
  const html = PANEL._renderSiteStatus(
    { parcel_id: 'X-2', county_fips: '51107' },
    { geometry: geom },
    { constraints: { parcelAcres: 10, results: [], summary: { constrainedPct: 5, partial: false } } },
    null,
    'X-2',
  );
  ok('a disclaimer distinguishes this from a developability determination',
    html.includes('Not a determination of developability or entitlement'));
}
{
  const originalSI = global.window.PARCEL_SITE_INTELLIGENCE;
  delete global.window.PARCEL_SITE_INTELLIGENCE;
  ok('site status section is empty when PARCEL_SITE_INTELLIGENCE was never loaded',
    PANEL._renderSiteStatus({ parcel_id: 'X-3' }, { geometry: geom }, null, null, 'X-3') === '');
  global.window.PARCEL_SITE_INTELLIGENCE = originalSI;
}

// ── XSS safety ───────────────────────────────────────────────────────────
{
  const html = PANEL._renderProximity({
    results: [{ layerId: 'x', label: '<script>evil()</script>', nearest: { distanceMiles: 1, name: null } }],
    unavailable: [],
  });
  ok('a hostile layer label is escaped, not injected as markup', !html.includes('<script>evil()'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
