/* tests/test_parcel_report_intelligence.mjs — js/parcel/report.js's Site
   Intelligence section (Phase 14: due-diligence export) and
   js/parcel/panel.js's _reportIntel() that feeds it.

   report.js predates the panel's Intelligence tab entirely -- confirmed by
   grepping it for PARCEL_SUITABILITY/PARCEL_PROXIMITY/PARCEL_CONSTRAINTS/
   PARCEL_SALES before this change: zero matches. A printed/exported
   due-diligence report was silently missing everything the on-screen panel
   now shows (suitability score, infrastructure proximity, environmental
   constraints, sales history). This tests the new
   _siteIntelligenceSectionHtml(intel) the report gained (same additive
   contract as the existing scene3d parameter: absent/empty intel produces
   '', not a broken or misleading section) and panel.js's _reportIntel()
   (assembles that intel object from whatever's already been computed --
   never triggers a new network fetch just because the user clicked
   "Report").

   Run:  node tests/test_parcel_report_intelligence.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

require('../js/parcel/report.js');
require('../js/parcel/panel.js');
const REPORT = global.window.PARCEL_REPORT;
const PANEL = global.window.PARCEL_PANEL;

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

// ── _siteIntelligenceSectionHtml ────────────────────────────────────────
{
  ok('no intel at all produces no section -- report renders exactly as before this feature existed',
    REPORT._siteIntelligenceSectionHtml(null) === '');
  ok('an empty intel object with nothing scored/found also produces no section',
    REPORT._siteIntelligenceSectionHtml({}) === '');
}
{
  const html = REPORT._siteIntelligenceSectionHtml({
    suitability: {
      scorable: true, overall: 77,
      basis: 'Weighted mean of 4 component(s) covering 68% of the total weight.',
      disclaimer: 'Screening score only.',
      components: [{ label: 'Power Proximity', score: 90, weight: 25 }],
      omitted: [{ label: 'Market Context', why: 'not available' }],
    },
  });
  ok('a scorable suitability result shows the section title', html.includes('Site Intelligence'));
  ok('a scorable suitability result shows the headline score', html.includes('77/100'));
  ok('a scorable suitability result lists a scored component', html.includes('Power Proximity'));
  ok('a scorable suitability result lists an omitted component, not silently dropped', html.includes('Market Context'));
  ok('a scorable suitability result carries its disclaimer', html.includes('Screening score only.'));
}
{
  const html = REPORT._siteIntelligenceSectionHtml({
    suitability: { scorable: false, why: 'None of the inputs this score needs were available.' },
  });
  ok('a not-scorable suitability result explains why rather than showing a fake score',
    html.includes('None of the inputs'));
}
{
  global.window.PARCEL_PROXIMITY = { formatDistance: (mi) => `${mi.toFixed(1)} mi` };
  const html = REPORT._siteIntelligenceSectionHtml({
    proximity: { results: [
      { layerId: 'substations', label: 'Substations', nearest: { distanceMiles: 1.4 } },
      { layerId: 'power-plants', label: 'Power Plants', error: 'HTTP 503' },
    ] },
  });
  ok('proximity results include a found layer with distance', html.includes('Substations') && html.includes('1.4 mi'));
  ok('a failed proximity layer is not listed as if it were found', !html.includes('Power Plants'));
}
{
  const html = REPORT._siteIntelligenceSectionHtml({
    constraints: { summary: { constrainedAcres: 2.1, constrainedPct: 12.4, disclaimer: 'Mapped constraints only.' } },
  });
  ok('constraint acreage/pct is reported', html.includes('2.1 ac') && html.includes('12.4%'));
  ok('constraint disclaimer is carried through', html.includes('Mapped constraints only.'));
}
{
  const html = REPORT._siteIntelligenceSectionHtml({
    sales: { count: 1, sales: [{ sale_date: '2024-05-01', sale_price: 3000000, classification: 'market' }] },
  });
  ok('a real sale shows its date, price, and classification',
    html.includes('2024-05-01') && html.includes('$3,000,000') && html.includes('market'));
}
{
  const html = REPORT._siteIntelligenceSectionHtml({
    suitability: { scorable: true, overall: 1, basis: '<script>evil()</script>', disclaimer: 'd', components: [], omitted: [] },
  });
  ok('a hostile basis string is escaped, not injected as markup', !html.includes('<script>evil()'));
}

// ── PARCEL_PANEL._reportIntel ────────────────────────────────────────────
{
  delete global.window.PARCEL_SUITABILITY;
  delete global.window.PARCEL_SALES;
  const feature = { properties: { parcel_id: '1', county_fips: '51107', area_acres: 40 }, geometry: null };
  const intel = PANEL._reportIntel(feature);
  ok('missing PARCEL_SUITABILITY/PARCEL_SALES degrades to null fields, not a crash',
    intel.suitability === null && intel.sales === null);
  ok('no cached Intelligence-tab data means proximity/constraints are null, not fabricated', intel.proximity === null && intel.constraints === null);
}
{
  global.window.PARCEL_SUITABILITY = { score: (ctx) => ({ scorable: true, overall: 50, inputs: ctx }) };
  global.window.PARCEL_SALES = { buildHistory: (props) => ({ count: 0, sales: [], properties: props }) };
  const feature = { properties: { parcel_id: '2', county_fips: '51107', area_acres: 40 }, geometry: null };
  const intel = PANEL._reportIntel(feature);
  ok('when the engines ARE loaded, _reportIntel computes suitability fresh (cheap/synchronous)',
    intel.suitability && intel.suitability.overall === 50);
  ok('_reportIntel computes sales history fresh (cheap/synchronous)', intel.sales && intel.sales.count === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
