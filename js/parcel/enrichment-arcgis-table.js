/* js/parcel/enrichment-arcgis-table.js
 * Registers the 'arcgis-table' executor with window.PARCEL_ENRICHMENT.
 *
 * This is the executor that unlocks the split geometry/CAMA architecture the
 * Virginia data center counties use, and which registry.js's own comments
 * have flagged for months: the parcel *boundary* service carries polygons and
 * plat metadata, while ownership, valuation, land use, and building
 * characteristics live in a separate non-spatial table on the same (or a
 * sibling) ArcGIS server. Prince William's "Parcel CAMA Public" layer and
 * Fairfax's Tax Administration Real Estate services are the canonical cases.
 *
 * An ArcGIS "table" here is any queryable layer accessed with
 * returnGeometry=false. It does not need to be a true non-spatial table —
 * joining against a second *feature* layer by attribute works identically,
 * and is often how a county actually publishes its assessment data.
 *
 * SCOPE: this file does network I/O and nothing else. Joining, conflict
 * resolution, provenance, caching, and health reporting all live in
 * enrichment.js and are identical for every source type. Anything added here
 * that is not "turn a list of keys into a list of records" belongs there
 * instead.
 *
 * Depends on: window.PARCEL_ENRICHMENT (required).
 */
(function () {
  'use strict';

  const ENR = window.PARCEL_ENRICHMENT;
  if (!ENR) {
    console.warn('[parcel] enrichment-arcgis-table.js loaded before enrichment.js — arcgis-table joins unavailable');
    return;
  }

  /* ArcGIS servers vary wildly in the URL length they accept, and a county
     viewport can easily hold 500+ parcels. Keys are therefore requested in
     batches. 100 is conservative enough to stay well inside even a strict
     server's limit with long alphanumeric parcel ids, while keeping a full
     viewport to a handful of round trips. */
  const DEFAULT_BATCH_SIZE = 100;

  /* Retries cover the transient failures that make county GIS servers
     frustrating rather than unusable: a momentary 503, a connection reset
     under load. Deliberately short and few — enrichment is a progressive
     enhancement running behind an already-rendered map, so it must not spend
     30 seconds retrying while the user pans away. */
  const MAX_ATTEMPTS = 3;
  const BACKOFF_MS = [400, 1200];

  /* Escapes a value for an ArcGIS SQL WHERE clause. Only ever used for
     government identifiers matched against a numeric or short-text column,
     but doubling embedded quotes is not optional: a parcel id containing an
     apostrophe would otherwise produce a syntactically broken query at best,
     and at worst inject SQL into a public endpoint. */
  function sqlQuote(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /* Builds the IN(...) predicate.

     `numericJoin` matters more than it looks: quoting a value against an
     integer column makes some ArcGIS/SQL Server backends fail outright and
     others silently return zero rows — which the engine would then correctly
     but unhelpfully report as `joined-none`. It is declared per source rather
     than guessed from the data, because a purely-numeric-looking parcel id
     stored as text ('0012345') must still be quoted, and unquoting it would
     drop the leading zeros the county actually stores. */
  function buildWhere(source, rawValues) {
    const field = source.joinField;
    if (source.numericJoin) {
      const nums = rawValues
        .map(v => Number(String(v).replace(/,/g, '')))
        .filter(n => Number.isFinite(n));
      if (!nums.length) return null;
      return `${field} IN (${nums.join(',')})`;
    }
    if (!rawValues.length) return null;
    return `${field} IN (${rawValues.map(sqlQuote).join(',')})`;
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function buildUrl(source, where) {
    const base = String(source.url).replace(/\/+$/, '');
    const url = new URL(`${base}/query`);
    const p = url.searchParams;
    p.set('where', where);
    // The join column itself must always come back, whatever the source's
    // fieldMap asks for — without it the response cannot be matched to the
    // parcels that requested it.
    const outFields = new Set([source.joinField, ...Object.values(source.fieldMap || {})]);
    p.set('outFields', Array.from(outFields).join(','));
    p.set('returnGeometry', 'false');
    p.set('returnDistinctValues', 'false');
    p.set('resultRecordCount', String(source.resultRecordCount || 1000));
    p.set('f', 'json');
    return url.toString();
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function fetchBatch(source, where, ctx) {
    const url = buildUrl(source, where);
    let lastErr = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (ctx.signal && ctx.signal.aborted) throw new Error('aborted');
      try {
        const res = await fetch(url, ctx.signal ? { signal: ctx.signal } : {});
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        let json;
        try {
          json = await res.json();
        } catch {
          // A county portal that has been retired or put behind a login
          // typically answers 200 with an HTML sign-in page. Reporting that
          // as "not JSON" is far more actionable than a parser stack trace.
          throw new Error('service returned a non-JSON response (an HTML error or login page?)');
        }

        // ArcGIS reports application-level failures — bad field name, invalid
        // WHERE, layer not found — inside a 200 response body. Not checking
        // this is how a misconfigured join looks like an empty result.
        if (json.error) {
          const details = Array.isArray(json.error.details) && json.error.details.length
            ? ` (${json.error.details.join('; ')})` : '';
          throw new Error(`ArcGIS error ${json.error.code || ''}: ${json.error.message || 'unknown'}${details}`.trim());
        }

        return json.features || [];
      } catch (err) {
        // An abort is the user panning away, not a service failure: it must
        // propagate immediately rather than burn two retries on a request
        // nobody is waiting for.
        if ((err && err.name === 'AbortError') || (ctx.signal && ctx.signal.aborted)) throw err;
        lastErr = err;
        if (attempt < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[attempt]);
      }
    }
    throw lastErr || new Error('request failed');
  }

  /* The executor. Returns records keyed by NORMALIZED join key, because that
     is what the engine indexes parcels by. The value coming back from the
     server is re-normalized with the source's own rules, so a county that
     stores '0123-45-6789' in its CAMA table and '0123456789' on its parcel
     layer still lands in the same bucket. */
  async function arcgisTableExecutor(source, keys, ctx) {
    if (!source.url) throw new Error(`enrichment source '${source.id}' has no url`);

    const rawByKey = (ctx && ctx.rawByKey) || new Map();
    // Query on the ORIGINAL values the parcel layer holds — normalization is
    // lossy and the server stores the raw form.
    const rawValues = [];
    for (const key of keys) {
      const raws = rawByKey.get(key);
      if (raws && raws.length) rawValues.push(...raws);
      else rawValues.push(key);   // no raw recorded: the normalized form is all we have
    }

    const records = Object.create(null);
    let matchedAny = false;

    for (const batch of chunk(Array.from(new Set(rawValues)), source.batchSize || DEFAULT_BATCH_SIZE)) {
      if (ctx.signal && ctx.signal.aborted) throw new Error('aborted');
      const where = buildWhere(source, batch);
      if (!where) continue;

      const features = await fetchBatch(source, where, ctx);

      for (const feat of features) {
        const attrs = (feat && feat.attributes) || {};
        const key = ENR.normalizeKey(attrs[source.joinField], source.joinNormalize);
        if (key == null) continue;
        matchedAny = true;
        // First record wins for a duplicated key. ArcGIS assessment tables
        // legitimately carry multiple rows per parcel (one per building, one
        // per owner of record), and silently merging them would fabricate a
        // parcel that matches no single official row. Picking one and saying
        // so is honest; the multi-row cases that matter — sales history,
        // building lists — need their own array-valued handling rather than
        // being flattened here.
        if (!(key in records)) records[key] = attrs;
      }
    }

    return {
      records,
      // Only claim a vintage the service actually published. Inventing
      // "fetched just now" as the data's age would be exactly the "do not
      // display current if the publisher's vintage is unknown" failure.
      sourceUpdatedAt: matchedAny ? (source.sourceUpdatedAt || null) : null,
    };
  }

  ENR.registerExecutor('arcgis-table', arcgisTableExecutor);

  // Exported for tests; not part of the executor contract.
  window.PARCEL_ENRICHMENT_ARCGIS = { buildWhere, buildUrl, sqlQuote, chunk, arcgisTableExecutor, DEFAULT_BATCH_SIZE };
})();
