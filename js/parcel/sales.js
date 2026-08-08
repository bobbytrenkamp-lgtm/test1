/* js/parcel/sales.js
 * window.PARCEL_SALES — transaction intelligence.
 *
 * Upgrades "last sale price" into structured sale history with derived
 * metrics and transparently-ranked comparables.
 *
 * THE DISTINCTION THIS MODULE IS BUILT AROUND: A TRANSFER IS NOT A SALE
 * --------------------------------------------------------------------
 * County records are full of deed transfers that are not market
 * transactions: quitclaims between family members, transfers into a trust or
 * an LLC for estate planning, foreclosure and tax deeds, corrections,
 * partition of an estate. Many record a price of $0, $1, or $10.
 *
 * Treating those as comparable sales is not a rounding error. A $1 transfer
 * on a 40-acre parcel computes to $0.03 per acre, and one such record in a
 * comparable set drags an average land value to nonsense. So:
 *
 *   - Deed types are classified, and nominal/non-market transfers are
 *     EXCLUDED from comparables and from derived price metrics.
 *   - A transfer whose type is unknown is marked `unknown`, never assumed
 *     arms-length. Unknown is not the same as verified.
 *   - Price-per-acre is not computed when either the price or the
 *     transaction classification is unreliable — a ratio built on a bad
 *     numerator is worse than no ratio, because it looks usable.
 *
 * Every derived number records `derivedFrom`, so a user can see that
 * $125,000/acre came from sale_price and area_acres rather than appearing
 * from nowhere.
 *
 * Depends on: window.PARCEL_GEO (optional, for distance ranking),
 *             window.PARCEL_PROVENANCE (optional, for derivation metadata).
 */
window.PARCEL_SALES = (function () {
  'use strict';

  /* Deed type classification.
   *
   * Keys are matched as normalized substrings of whatever the county
   * publishes, because deed type fields are free text with no standard: one
   * county says "WARRANTY DEED", another "WD", another "Deed of Bargain and
   * Sale". Substring matching on a curated list is the honest middle ground
   * between an enum that matches nothing and accepting everything. */
  const DEED_CLASSES = {
    /* Ordinary market conveyances. */
    market: [
      'warranty', 'grant deed', 'bargain and sale', 'special warranty',
      'general warranty', 'limited warranty', 'wd', 'gwd', 'swd',
    ],
    /* Transfers that move title without a market price being agreed. */
    nominal: [
      'quit claim', 'quitclaim', 'qc', 'gift', 'love and affection',
      'trust', 'trustee', 'estate', 'inheritance', 'devise', 'heir',
      'correction', 'corrective', 'affidavit', 'name change', 'partition',
      'interspousal', 'divorce', 'life estate',
    ],
    /* Distressed or compelled transfers: real prices, but not market ones. */
    distressed: [
      'foreclosure', 'trustee sale', 'sheriff', 'tax deed', 'tax sale',
      'certificate of sale', 'deed in lieu', 'bankruptcy', 'referee',
    ],
  };

  /* Below this, a recorded price is a recording formality rather than
     consideration. $1 and $10 are the classic ones; a genuine market sale of
     developable land is never a three-figure number. */
  const NOMINAL_PRICE_CEILING = 1000;

  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  /* Classifies one transaction. Returns one of:
       'market'      — an ordinary conveyance, usable as a comparable
       'nominal'     — a non-market transfer (gift, trust, correction)
       'distressed'  — foreclosure, tax deed, and similar
       'unknown'     — we cannot tell; NEVER treated as market
   */
  function classifyTransaction(sale) {
    const s = sale || {};
    const price = numeric(s.sale_price);

    // A nominal price is decisive regardless of what the deed type says: a
    // "warranty deed" for $1 is not a market sale.
    if (price != null && price <= NOMINAL_PRICE_CEILING) {
      return {
        classification: 'nominal',
        why: price === 0
          ? 'Recorded price is zero, which indicates a transfer rather than a purchase.'
          : `Recorded price of ${price} is a nominal consideration, not a market price.`,
      };
    }

    const deed = norm(s.deed_type);
    if (deed) {
      for (const cls of ['distressed', 'nominal', 'market']) {
        for (const token of DEED_CLASSES[cls]) {
          if (deed.includes(token)) {
            return {
              classification: cls,
              why: cls === 'market'
                ? `Deed type "${s.deed_type}" is an ordinary market conveyance.`
                : `Deed type "${s.deed_type}" indicates a ${cls} transfer, not a market sale.`,
            };
          }
        }
      }
    }

    // An explicit arms-length flag from the publisher, where one exists.
    if (s.arms_length === true) {
      return { classification: 'market', why: 'The source records this transfer as arms-length.' };
    }
    if (s.arms_length === false) {
      return { classification: 'nominal', why: 'The source records this transfer as not arms-length.' };
    }

    return {
      classification: 'unknown',
      why: deed
        ? `Deed type "${s.deed_type}" is not recognized, so this transfer cannot be confirmed as a market sale.`
        : 'No deed type published, so this transfer cannot be confirmed as a market sale.',
    };
  }

  function numeric(v) {
    // Number(null) is 0 and Number('') is 0, so the explicit test matters: a
    // missing price must not become a $0 sale, which would then be classified
    // as nominal and quietly discarded as though we had checked it.
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/[$,]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function parseDate(v) {
    if (v == null || v === '') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /* Normalizes one raw sale record into the canonical shape, classifying it
     on the way. */
  function normalizeSale(raw) {
    const s = raw || {};
    const { classification, why } = classifyTransaction(s);
    const price = numeric(s.sale_price);
    const date = parseDate(s.sale_date);

    return {
      sale_date: date ? date.toISOString().slice(0, 10) : null,
      sale_price: price,
      deed_type: s.deed_type != null ? String(s.deed_type) : null,
      buyer: s.buyer != null ? String(s.buyer) : null,
      seller: s.seller != null ? String(s.seller) : null,
      source: s.source != null ? String(s.source) : null,
      classification,
      classificationReason: why,
      // Only a positively-classified market transfer is usable. 'unknown'
      // deliberately does not qualify.
      usableAsComparable: classification === 'market' && price != null && date != null,
    };
  }

  /* Builds sale history from whatever the parcel carries: a structured
     `sales_history` array where the source publishes one, or the summary
     last_sale_* fields where it does not.

     Sorted newest first, which is the order every downstream consumer wants
     and the order a user expects to read. */
  function buildHistory(props) {
    const p = props || {};
    const raw = Array.isArray(p.sales_history) && p.sales_history.length
      ? p.sales_history
      : (p.last_sale_date != null || p.last_sale_price != null
          ? [{ sale_date: p.last_sale_date, sale_price: p.last_sale_price, deed_type: p.deed_type }]
          : []);

    const sales = raw.map(normalizeSale)
      .sort((a, b) => String(b.sale_date || '').localeCompare(String(a.sale_date || '')));

    const marketSales = sales.filter(s => s.usableAsComparable);

    return {
      sales,
      count: sales.length,
      marketSaleCount: marketSales.length,
      /* Reported separately so a parcel with six transfers and no market
         sale is visibly different from one with no records at all. */
      excludedCount: sales.length - marketSales.length,
      mostRecent: sales.length ? sales[0] : null,
      mostRecentMarketSale: marketSales.length ? marketSales[0] : null,
      // Kept for the panel's summary row, which shows the latest record of
      // any kind — labelled as a transfer, not a sale, when it is not one.
      lastTransferDate: sales.length ? sales[0].sale_date : null,
      lastTransferPrice: sales.length ? sales[0].sale_price : null,
    };
  }

  /* Derived metrics for one sale.
   *
   * Every metric is either computed with its inputs recorded, or omitted with
   * a reason. Nothing is computed from an unreliable numerator or a missing
   * denominator — a ratio that looks usable and is not is worse than none. */
  function deriveMetrics(sale, props, opts) {
    const o = opts || {};
    const now = o.now ? new Date(o.now) : new Date();
    const result = { metrics: {}, omitted: [] };

    if (!sale) return result;

    if (!sale.usableAsComparable) {
      result.omitted.push({
        metric: 'all',
        why: `This is classified as a ${sale.classification} transfer, so price-derived ` +
             `metrics would describe a transaction that was not a market sale.`,
      });
      return result;
    }

    const price = sale.sale_price;
    const acres = numeric((props || {}).area_acres);
    const buildingSqft = numeric((props || {}).gross_floor_area);

    if (acres != null && acres > 0) {
      result.metrics.price_per_acre = {
        value: Math.round(price / acres),
        derivedFrom: ['sale_price', 'area_acres'],
      };
      result.metrics.price_per_land_sqft = {
        value: Math.round((price / (acres * 43560)) * 100) / 100,
        derivedFrom: ['sale_price', 'area_acres'],
      };
    } else {
      result.omitted.push({
        metric: 'price_per_acre',
        why: acres == null ? 'parcel acreage is not published' : 'parcel acreage is zero',
      });
    }

    if (buildingSqft != null && buildingSqft > 0) {
      result.metrics.price_per_building_sqft = {
        value: Math.round((price / buildingSqft) * 100) / 100,
        derivedFrom: ['sale_price', 'gross_floor_area'],
      };
    } else {
      // Not an error for raw land — most data center sites are unimproved.
      result.omitted.push({
        metric: 'price_per_building_sqft',
        why: 'no building area published (expected for unimproved land)',
      });
    }

    const saleDate = parseDate(sale.sale_date);
    if (saleDate) {
      const years = (now - saleDate) / (365.25 * 24 * 3600 * 1000);
      result.metrics.years_since_sale = {
        value: Math.round(years * 10) / 10,
        derivedFrom: ['sale_date'],
      };
    }

    return result;
  }

  /* Appreciation between two market sales of the SAME parcel.
     Refuses when either end is not a market sale, because a change from a $1
     trust transfer to a $2M sale is not appreciation — it is two different
     kinds of event. */
  function appreciation(history, opts) {
    const marketSales = (history.sales || []).filter(s => s.usableAsComparable);
    if (marketSales.length < 2) {
      return {
        available: false,
        why: marketSales.length === 1
          ? 'Only one market sale is on record; appreciation needs two.'
          : 'No pair of market sales is on record.',
      };
    }

    const [current, prior] = marketSales;   // already newest-first
    const currentDate = parseDate(current.sale_date);
    const priorDate = parseDate(prior.sale_date);
    if (!currentDate || !priorDate || currentDate <= priorDate) {
      return { available: false, why: 'Sale dates are missing or out of order.' };
    }

    const years = (currentDate - priorDate) / (365.25 * 24 * 3600 * 1000);
    const totalPct = ((current.sale_price - prior.sale_price) / prior.sale_price) * 100;

    return {
      available: true,
      fromDate: prior.sale_date,
      toDate: current.sale_date,
      fromPrice: prior.sale_price,
      toPrice: current.sale_price,
      totalPct: Math.round(totalPct * 10) / 10,
      years: Math.round(years * 10) / 10,
      annualizedPct: years >= 1
        ? Math.round(((Math.pow(current.sale_price / prior.sale_price, 1 / years) - 1) * 100) * 10) / 10
        : null,
      // Annualizing over a few months produces absurd figures, so it is
      // omitted rather than published as though meaningful.
      annualizedOmittedWhy: years < 1
        ? 'The two sales are less than a year apart; annualizing that would overstate the trend.'
        : null,
      derivedFrom: ['sale_price', 'sale_date'],
    };
  }

  /* ── Comparables ─────────────────────────────────────────────────────────
   *
   * Relevance is a transparent weighted sum over documented factors, each
   * reported individually. "Nearby" alone is never enough to make something a
   * comparable — the whole point of scoring is that a similar parcel two
   * miles away beats a dissimilar one next door. */
  const COMP_WEIGHTS = Object.freeze({
    proximity: 30,
    acreage:   25,
    recency:   20,
    landUse:   15,
    zoning:    10,
  });

  function similarityRatio(a, b) {
    if (a == null || b == null || a <= 0 || b <= 0) return null;
    return Math.min(a, b) / Math.max(a, b);
  }

  function scoreComparable(subject, candidate, opts) {
    const o = opts || {};
    const factors = {};
    let weighted = 0, availableWeight = 0;

    // Proximity.
    let distanceMiles = null;
    if (candidate.distanceMiles != null) {
      distanceMiles = candidate.distanceMiles;
    } else if (window.PARCEL_GEO && subject.geometry && candidate.geometry) {
      const c = window.PARCEL_GEO.vertexCentroid(candidate.geometry);
      if (c) {
        const km = window.PARCEL_GEO.pointToPolygonKm(c, subject.geometry);
        if (km != null) distanceMiles = window.PARCEL_GEO.kmToMiles(km);
      }
    }
    if (distanceMiles != null) {
      const maxMiles = o.maxDistanceMiles || 10;
      const v = Math.round(Math.max(0, 100 * (1 - distanceMiles / maxMiles)));
      factors.proximity = { score: v, weight: COMP_WEIGHTS.proximity, distanceMiles: Math.round(distanceMiles * 10) / 10 };
      weighted += v * COMP_WEIGHTS.proximity; availableWeight += COMP_WEIGHTS.proximity;
    }

    // Acreage similarity.
    const acreRatio = similarityRatio(numeric(subject.properties?.area_acres), numeric(candidate.properties?.area_acres));
    if (acreRatio != null) {
      const v = Math.round(acreRatio * 100);
      factors.acreage = { score: v, weight: COMP_WEIGHTS.acreage, ratio: Math.round(acreRatio * 100) / 100 };
      weighted += v * COMP_WEIGHTS.acreage; availableWeight += COMP_WEIGHTS.acreage;
    }

    // Recency.
    const sale = candidate.sale;
    if (sale && sale.sale_date) {
      const years = (new Date(o.now || Date.now()) - parseDate(sale.sale_date)) / (365.25 * 24 * 3600 * 1000);
      const maxYears = o.maxYears || 5;
      const v = Math.round(Math.max(0, 100 * (1 - years / maxYears)));
      factors.recency = { score: v, weight: COMP_WEIGHTS.recency, yearsAgo: Math.round(years * 10) / 10 };
      weighted += v * COMP_WEIGHTS.recency; availableWeight += COMP_WEIGHTS.recency;
    }

    // Land use and zoning: exact-prefix agreement, since the codes are
    // hierarchical strings.
    for (const [key, field, weight] of [
      ['landUse', 'land_use_code', COMP_WEIGHTS.landUse],
      ['zoning', 'zoning_code', COMP_WEIGHTS.zoning],
    ]) {
      const a = subject.properties?.[field];
      const b = candidate.properties?.[field];
      if (a && b) {
        const sa = String(a).toUpperCase(), sb = String(b).toUpperCase();
        const v = sa === sb ? 100 : (sa[0] === sb[0] ? 60 : 0);
        factors[key] = { score: v, weight, subject: sa, candidate: sb };
        weighted += v * weight; availableWeight += weight;
      }
    }

    if (!availableWeight) return { score: null, factors, why: 'no comparable factors could be evaluated' };

    return {
      score: Math.round(weighted / availableWeight),
      factors,
      // Same renormalization discipline as the suitability score: a factor we
      // could not evaluate is omitted, not scored zero.
      coveragePct: Math.round((availableWeight / Object.values(COMP_WEIGHTS).reduce((a, b) => a + b, 0)) * 1000) / 10,
    };
  }

  /* Finds comparable SALES (not merely nearby parcels) for a subject.
   *
   * candidates: [{ id, geometry, properties, distanceMiles? }]
   * Each candidate's own sale history is built and only its market sales are
   * considered.
   */
  function findComparables(subject, candidates, opts) {
    const o = opts || {};
    const results = [];
    const excluded = [];

    for (const c of (candidates || [])) {
      if (!c || c === subject) continue;
      const history = buildHistory(c.properties);
      const sale = history.mostRecentMarketSale;

      if (!sale) {
        // Recorded rather than dropped: "nearby parcels exist but none has a
        // usable market sale" is a real and useful finding.
        excluded.push({
          id: c.id ?? c.properties?.parcel_id ?? null,
          why: history.count
            ? `${history.count} transfer(s) on record, none classified as a market sale`
            : 'no sale records published for this parcel',
        });
        continue;
      }

      // Filters.
      if (o.minAcres != null && !(numeric(c.properties?.area_acres) >= o.minAcres)) continue;
      if (o.maxAcres != null && !(numeric(c.properties?.area_acres) <= o.maxAcres)) continue;
      if (o.since && String(sale.sale_date) < String(o.since)) continue;
      if (o.minPrice != null && !(sale.sale_price >= o.minPrice)) continue;
      if (o.maxPrice != null && !(sale.sale_price <= o.maxPrice)) continue;

      const scored = scoreComparable(subject, { ...c, sale }, o);
      if (scored.score == null) continue;
      if (o.minRelevance != null && scored.score < o.minRelevance) continue;

      const derived = deriveMetrics(sale, c.properties, o);

      results.push({
        id: c.id ?? c.properties?.parcel_id ?? null,
        sale,
        relevance: scored.score,
        factors: scored.factors,
        factorCoveragePct: scored.coveragePct,
        metrics: derived.metrics,
        metricsOmitted: derived.omitted,
        acres: numeric(c.properties?.area_acres),
      });
    }

    results.sort((a, b) => b.relevance - a.relevance);

    return {
      comparables: o.limit ? results.slice(0, o.limit) : results,
      excluded,
      counts: {
        candidates: (candidates || []).length,
        comparables: results.length,
        excludedNoMarketSale: excluded.length,
      },
      weights: COMP_WEIGHTS,
      basis:
        'Relevance is a weighted sum of geographic proximity, acreage similarity, ' +
        'transaction recency, and land-use/zoning agreement — each factor and its weight ' +
        'is shown. Only transfers classified as market sales are included; nominal, ' +
        'distressed, and unclassifiable transfers are excluded and listed separately.',
    };
  }

  return {
    classifyTransaction, normalizeSale, buildHistory,
    deriveMetrics, appreciation,
    findComparables, scoreComparable,
    COMP_WEIGHTS, DEED_CLASSES, NOMINAL_PRICE_CEILING,
  };
})();
