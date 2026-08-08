/* tests/test_parcel_sales.mjs — transaction intelligence.

   The failure this module exists to prevent: treating a $1 quitclaim to a
   family trust as a comparable sale. One such record in a comparable set
   computes to $0.03/acre and drags a land value estimate to nonsense, so most
   of these tests are about classification and about refusing to compute
   ratios on transfers that were not market sales.

   Run:  node tests/test_parcel_sales.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

global.window = global;
global.document = { dispatchEvent: () => true, addEventListener: () => {}, getElementById: () => null };

require('../js/parcel/geo.js');
require('../js/parcel/sales.js');
const S = global.PARCEL_SALES;

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

const cls = (sale) => S.classifyTransaction(sale).classification;

// ── Transaction classification ─────────────────────────────────────────────
{
  t('a warranty deed at a real price is a market sale',
    cls({ deed_type: 'WARRANTY DEED', sale_price: 2400000 }), 'market');
  t('a grant deed is a market sale',
    cls({ deed_type: 'Grant Deed', sale_price: 850000 }), 'market');
  t('a bargain and sale deed is a market sale',
    cls({ deed_type: 'Deed of Bargain and Sale', sale_price: 500000 }), 'market');

  // The headline cases.
  t('a quitclaim is nominal', cls({ deed_type: 'QUIT CLAIM DEED', sale_price: 500000 }), 'nominal');
  t('a transfer to a trust is nominal', cls({ deed_type: 'Deed to Trustee', sale_price: 900000 }), 'nominal');
  t('a gift deed is nominal', cls({ deed_type: 'GIFT DEED', sale_price: 750000 }), 'nominal');
  t('a corrective deed is nominal', cls({ deed_type: 'Corrective Deed', sale_price: 300000 }), 'nominal');

  t('a foreclosure is distressed', cls({ deed_type: 'FORECLOSURE DEED', sale_price: 400000 }), 'distressed');
  t('a tax deed is distressed', cls({ deed_type: 'Tax Deed', sale_price: 22000 }), 'distressed');
  t('a sheriff sale is distressed', cls({ deed_type: "SHERIFF'S DEED", sale_price: 180000 }), 'distressed');

  // A nominal PRICE overrides a market-sounding deed type. A "warranty deed"
  // for $1 is not a market sale.
  t('a warranty deed for $1 is nominal despite the deed type',
    cls({ deed_type: 'WARRANTY DEED', sale_price: 1 }), 'nominal');
  t('a zero price is nominal', cls({ deed_type: 'WARRANTY DEED', sale_price: 0 }), 'nominal');
  t('a $10 recording price is nominal', cls({ deed_type: 'Grant Deed', sale_price: 10 }), 'nominal');
  ok('the reason explains a zero price',
    S.classifyTransaction({ sale_price: 0 }).why.includes('transfer rather than a purchase'));

  // Unknown must never be assumed market.
  t('an unrecognized deed type is unknown, not market',
    cls({ deed_type: 'ZZ SPECIAL INSTRUMENT', sale_price: 500000 }), 'unknown');
  t('no deed type at all is unknown', cls({ sale_price: 500000 }), 'unknown');
  ok('and the reason says it cannot be confirmed',
    S.classifyTransaction({ sale_price: 500000 }).why.includes('cannot be confirmed as a market sale'));

  // An explicit publisher flag is honoured when present.
  t('an explicit arms-length flag makes it market',
    cls({ sale_price: 500000, arms_length: true }), 'market');
  t('an explicit non-arms-length flag makes it nominal',
    cls({ sale_price: 500000, arms_length: false }), 'nominal');
}

// ── Missing price is not a zero price ──────────────────────────────────────
{
  // Number(null) is 0, which would classify a missing price as nominal and
  // quietly discard the record as though we had checked it.
  const noPrice = S.normalizeSale({ deed_type: 'WARRANTY DEED', sale_date: '2024-01-15' });
  t('a missing price stays null, not zero', noPrice.sale_price, null);
  t('and the deed type still classifies it as market', noPrice.classification, 'market');
  ok('but it is not usable as a comparable without a price', !noPrice.usableAsComparable);

  const emptyPrice = S.normalizeSale({ sale_price: '', deed_type: 'WARRANTY DEED', sale_date: '2024-01-15' });
  t('an empty-string price is also null', emptyPrice.sale_price, null);

  t('a formatted price parses', S.normalizeSale({ sale_price: '$2,400,000' }).sale_price, 2400000);
}

// ── Sale history ───────────────────────────────────────────────────────────
{
  const history = S.buildHistory({
    sales_history: [
      { sale_date: '2019-06-01', sale_price: 1200000, deed_type: 'WARRANTY DEED' },
      { sale_date: '2024-03-15', sale_price: 2400000, deed_type: 'WARRANTY DEED' },
      { sale_date: '2021-02-01', sale_price: 1, deed_type: 'QUIT CLAIM DEED' },
    ],
  });

  t('all records are kept', history.count, 3);
  t('newest first', history.sales[0].sale_date, '2024-03-15');
  t('only market sales count as usable', history.marketSaleCount, 2);
  t('and the excluded count is reported', history.excludedCount, 1);
  t('the most recent market sale skips the quitclaim',
    history.mostRecentMarketSale.sale_date, '2024-03-15');

  // A parcel with transfers but no market sale is visibly different from one
  // with no records.
  const transfersOnly = S.buildHistory({
    sales_history: [{ sale_date: '2022-01-01', sale_price: 1, deed_type: 'QUIT CLAIM' }],
  });
  t('a parcel with only transfers has no market sale', transfersOnly.mostRecentMarketSale, null);
  t('but does have a record', transfersOnly.count, 1);
  ok('and the latest record is exposed as a transfer, not a sale',
    transfersOnly.lastTransferDate === '2022-01-01');

  const none = S.buildHistory({});
  t('a parcel with no records has none', none.count, 0);
  t('and no most-recent', none.mostRecent, null);

  // Falls back to the summary fields when no structured history exists.
  const summaryOnly = S.buildHistory({
    last_sale_date: '2023-08-01', last_sale_price: 900000, deed_type: 'WARRANTY DEED',
  });
  t('summary fields become a one-entry history', summaryOnly.count, 1);
  t('and are usable when they classify as market', summaryOnly.marketSaleCount, 1);
}

// ── Derived metrics ────────────────────────────────────────────────────────
{
  const sale = S.normalizeSale({ sale_date: '2024-03-15', sale_price: 2400000, deed_type: 'WARRANTY DEED' });
  const d = S.deriveMetrics(sale, { area_acres: 40 }, { now: '2026-03-15' });

  t('price per acre is computed', d.metrics.price_per_acre.value, 60000);
  t('and records its inputs', d.metrics.price_per_acre.derivedFrom, ['sale_price', 'area_acres']);
  ok('price per land square foot is computed', d.metrics.price_per_land_sqft.value > 0);
  t('years since sale is computed', d.metrics.years_since_sale.value, 2);

  // The refusal that matters.
  const nominal = S.normalizeSale({ sale_date: '2021-02-01', sale_price: 1, deed_type: 'QUIT CLAIM DEED' });
  const dn = S.deriveMetrics(nominal, { area_acres: 40 });
  t('no metrics are derived from a nominal transfer', Object.keys(dn.metrics).length, 0);
  ok('and the omission explains why',
    dn.omitted[0].why.includes('was not a market sale'));

  // $1 / 40 acres would have been $0.03 per acre.
  ok('specifically, no price-per-acre is invented', dn.metrics.price_per_acre === undefined);

  const noAcres = S.deriveMetrics(sale, {});
  ok('price per acre is omitted when acreage is missing', noAcres.metrics.price_per_acre === undefined);
  ok('with a reason', noAcres.omitted.some(o => o.metric === 'price_per_acre' && o.why.includes('not published')));

  const zeroAcres = S.deriveMetrics(sale, { area_acres: 0 });
  ok('and when acreage is zero, rather than dividing by zero',
    zeroAcres.metrics.price_per_acre === undefined);

  ok('building price is omitted for raw land, noted as expected',
    noAcres.omitted.some(o => o.metric === 'price_per_building_sqft' && o.why.includes('unimproved')));

  const improved = S.deriveMetrics(sale, { area_acres: 40, gross_floor_area: 120000 });
  t('price per building sqft is computed when there is a building',
    improved.metrics.price_per_building_sqft.value, 20);
}

// ── Appreciation ───────────────────────────────────────────────────────────
{
  const history = S.buildHistory({
    sales_history: [
      { sale_date: '2019-03-15', sale_price: 1200000, deed_type: 'WARRANTY DEED' },
      { sale_date: '2024-03-15', sale_price: 2400000, deed_type: 'WARRANTY DEED' },
    ],
  });
  const a = S.appreciation(history);

  ok('appreciation between two market sales is available', a.available);
  t('total appreciation is 100%', a.totalPct, 100);
  t('over five years', a.years, 5);
  ok('annualized is roughly 15%', Math.abs(a.annualizedPct - 14.9) < 0.5);
  t('and records its inputs', a.derivedFrom, ['sale_price', 'sale_date']);

  // A $1 trust transfer followed by a $2M sale is not appreciation.
  const withTransfer = S.buildHistory({
    sales_history: [
      { sale_date: '2019-03-15', sale_price: 1, deed_type: 'QUIT CLAIM DEED' },
      { sale_date: '2024-03-15', sale_price: 2400000, deed_type: 'WARRANTY DEED' },
    ],
  });
  const at = S.appreciation(withTransfer);
  ok('a nominal transfer is not used as the prior sale', !at.available);
  ok('and the reason says only one market sale exists',
    at.why.includes('Only one market sale'));

  const single = S.appreciation(S.buildHistory({ last_sale_price: 900000, last_sale_date: '2023-01-01', deed_type: 'WD' }));
  ok('one sale is not enough', !single.available);

  // Annualizing over months would overstate wildly.
  const quick = S.appreciation(S.buildHistory({
    sales_history: [
      { sale_date: '2024-01-01', sale_price: 1000000, deed_type: 'WARRANTY DEED' },
      { sale_date: '2024-07-01', sale_price: 1200000, deed_type: 'WARRANTY DEED' },
    ],
  }));
  ok('a six-month gap still reports total appreciation', quick.totalPct === 20);
  t('but does not annualize it', quick.annualizedPct, null);
  ok('and says why', quick.annualizedOmittedWhy.includes('less than a year'));
}

// ── Comparables ────────────────────────────────────────────────────────────
{
  const subject = {
    id: 'SUBJ',
    properties: { parcel_id: 'SUBJ', area_acres: 50, land_use_code: 'I', zoning_code: 'I-1' },
  };
  const candidates = [
    { id: 'good', distanceMiles: 1, properties: { area_acres: 55, land_use_code: 'I', zoning_code: 'I-1',
      last_sale_date: '2025-06-01', last_sale_price: 3000000, deed_type: 'WARRANTY DEED' } },
    { id: 'far-different', distanceMiles: 9, properties: { area_acres: 2, land_use_code: 'R', zoning_code: 'R-1',
      last_sale_date: '2021-01-01', last_sale_price: 400000, deed_type: 'WARRANTY DEED' } },
    { id: 'quitclaim-next-door', distanceMiles: 0.2, properties: { area_acres: 52, land_use_code: 'I', zoning_code: 'I-1',
      last_sale_date: '2025-05-01', last_sale_price: 1, deed_type: 'QUIT CLAIM DEED' } },
    { id: 'no-sales', distanceMiles: 0.5, properties: { area_acres: 48, land_use_code: 'I' } },
  ];

  const res = S.findComparables(subject, candidates, { now: '2026-01-01', maxYears: 5 });

  // The central assertion: nearby is not enough.
  ok('a $1 quitclaim next door is NOT a comparable',
    !res.comparables.some(c => c.id === 'quitclaim-next-door'));
  ok('but it is reported as excluded rather than vanishing',
    res.excluded.some(e => e.id === 'quitclaim-next-door'));
  ok('with the reason that none of its transfers is a market sale',
    res.excluded.find(e => e.id === 'quitclaim-next-door').why.includes('none classified as a market sale'));

  ok('a parcel with no sale records is excluded with its own reason',
    res.excluded.find(e => e.id === 'no-sales').why.includes('no sale records'));

  // A similar parcel a mile away beats a dissimilar one nine miles away.
  t('the most similar parcel ranks first', res.comparables[0].id, 'good');
  ok('and outranks the far dissimilar one',
    res.comparables[0].relevance > res.comparables.find(c => c.id === 'far-different').relevance);

  // Transparency.
  const top = res.comparables[0];
  ok('every relevance factor is reported', Object.keys(top.factors).length >= 4);
  ok('each factor carries its weight', Object.values(top.factors).every(f => typeof f.weight === 'number'));
  ok('the proximity factor shows the distance', top.factors.proximity.distanceMiles === 1);
  ok('the acreage factor shows the ratio', top.factors.acreage.ratio > 0.9);
  ok('derived metrics accompany each comparable', top.metrics.price_per_acre.value > 0);

  ok('the basis states that only market sales are included',
    res.basis.includes('Only transfers classified as market sales'));
  ok('and that excluded ones are listed', res.basis.includes('listed separately'));

  t('candidate and comparable counts are both reported', res.counts.candidates, 4);
  t('with the exclusions counted', res.counts.excludedNoMarketSale, 2);
}

{
  // Filters.
  const subject = { id: 'S', properties: { area_acres: 50 } };
  const candidates = [
    { id: 'small', distanceMiles: 1, properties: { area_acres: 5, last_sale_date: '2025-01-01', last_sale_price: 200000, deed_type: 'WD' } },
    { id: 'big', distanceMiles: 1, properties: { area_acres: 60, last_sale_date: '2025-01-01', last_sale_price: 3000000, deed_type: 'WD' } },
    { id: 'old', distanceMiles: 1, properties: { area_acres: 55, last_sale_date: '2015-01-01', last_sale_price: 900000, deed_type: 'WD' } },
  ];

  const byAcres = S.findComparables(subject, candidates, { minAcres: 40, now: '2026-01-01' });
  ok('an acreage filter excludes the small parcel', !byAcres.comparables.some(c => c.id === 'small'));

  const bySince = S.findComparables(subject, candidates, { since: '2020-01-01', now: '2026-01-01' });
  ok('a date filter excludes the old sale', !bySince.comparables.some(c => c.id === 'old'));

  const limited = S.findComparables(subject, candidates, { limit: 1, now: '2026-01-01' });
  t('a limit caps the returned list', limited.comparables.length, 1);
  ok('but the full count is still reported', limited.counts.comparables >= 1);
}

{
  // Factor coverage: a candidate missing zoning is scored on what exists,
  // not penalized to zero.
  const subject = { id: 'S', properties: { area_acres: 50, zoning_code: 'I-1' } };
  const sparse = [{ id: 'sparse', distanceMiles: 1,
    properties: { area_acres: 50, last_sale_date: '2025-01-01', last_sale_price: 2000000, deed_type: 'WD' } }];
  const res = S.findComparables(subject, sparse, { now: '2026-01-01' });

  ok('a candidate missing zoning is still comparable', res.comparables.length === 1);
  ok('and its factor coverage is reported as below 100', res.comparables[0].factorCoveragePct < 100);
  ok('the zoning factor is absent rather than scored zero',
    res.comparables[0].factors.zoning === undefined);
}

// ── Weights ────────────────────────────────────────────────────────────────
{
  const total = Object.values(S.COMP_WEIGHTS).reduce((a, b) => a + b, 0);
  t('comparable weights sum to 100', total, 100);
  ok('proximity is the heaviest factor',
    S.COMP_WEIGHTS.proximity === Math.max(...Object.values(S.COMP_WEIGHTS)));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
