#!/usr/bin/env node
/* data/parcel_pipeline/build_national_site_index.mjs — precomputed,
 * multi-jurisdiction parcel size index for Find Sites.
 *
 * WHY THIS EXISTS
 * js/parcel/find-sites.js's search has always been strictly per-viewport: it
 * evaluates only whatever parcels are currently rendered on the map for the
 * one county the user has panned/zoomed into (see that file's own header
 * comment). That is an honest design — there is no bulk "all parcels in the
 * US" store anywhere in this system — but it means a user cannot ask "show
 * me every 20+ acre parcel across all wired jurisdictions" without visiting
 * each of the 58 registry counties one at a time.
 *
 * This script closes that gap the same way every other batch job in this
 * pipeline does: a scheduled, free GitHub Actions job (not a live per-query
 * fetch) that walks js/parcel/registry.js's real, already-verified
 * jurisdictions and writes a small static JSON file the browser can load
 * once and search against with the SAME js/parcel/site-search.js engine
 * (see js/parcel/site-search-index.js).
 *
 * WHY SIZE-FILTERED, NOT EVERY PARCEL
 * A full parcel dump across 58 counties would be gigabytes and would hammer
 * free government ArcGIS services with slow, impolite pagination -- neither
 * is "zero-cost". Instead, each jurisdiction's query is filtered SERVER-SIDE
 * to parcels at or above `--threshold-acres` (default 5), using the raw
 * source field name js/parcel/registry.js's own fieldMap.area_acres or
 * area_sqft already carries (no new field investigation needed -- fieldMap
 * already maps canonical -> real source attribute name for every production
 * jurisdiction). This is also the right filter for the product's actual use
 * case: a large-site search tool should not be indexing quarter-acre
 * residential lots.
 *
 * 13 of 58 jurisdictions carry neither field (confirmed via
 * js/parcel/registry.js itself, not assumed) and cannot be filtered
 * server-side. Those are still indexed, capped at `--cap` records with NO
 * size filter, and flagged `sizeFiltered: false` per-jurisdiction in the
 * output so a reader can tell an "every large parcel in this county" result
 * from an "an arbitrary sample of this county's parcels" result -- silently
 * blending the two would misrepresent coverage.
 *
 * WHAT IS DELIBERATELY NOT IN THIS INDEX
 * Proximity (transmission/substation/interstate distance) and environmental
 * constraint (floodplain/wetland) analysis are NOT precomputed here. Running
 * those live per-parcel query for every indexed parcel across 58
 * jurisdictions would be a much larger, slower, and more failure-prone live
 * network job than this one -- and PARCEL_SITE_SEARCH already has a correct,
 * tested answer for "this criterion's data is not on the candidate":
 * 'indeterminate', not a silent false pass. A user who wants proximity or
 * constraint filtering opens a specific matched parcel for live analysis,
 * same as today.
 *
 * Usage:
 *   node data/parcel_pipeline/build_national_site_index.mjs
 *   node data/parcel_pipeline/build_national_site_index.mjs --threshold-acres 10
 *   node data/parcel_pipeline/build_national_site_index.mjs --fips 51107,24031
 *   node data/parcel_pipeline/build_national_site_index.mjs --cap 500 --concurrency 5
 *
 * Network is required, so this cannot run in a sandbox -- meant for CI or a
 * developer machine. See .github/workflows/build_site_search_index.yml.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadRegistry } from './lib/load_registry.mjs';

export const DEFAULT_THRESHOLD_ACRES = 5;
export const DEFAULT_CAP_PER_JURISDICTION = 2000;
export const DEFAULT_CONCURRENCY = 3;
export const OUTPUT_PATH = join(ROOT, 'data/site_search_index.json');

/* Pure: decides the server-side size filter for one jurisdiction from its
   already-verified fieldMap. Reuses the raw source attribute name directly
   -- no new per-jurisdiction investigation, no guessed field names. */
export function computeSizeWhere(fieldMap, thresholdAcres) {
  if (fieldMap && fieldMap.area_acres) {
    return {
      where: `${fieldMap.area_acres} >= ${thresholdAcres}`,
      sizeFiltered: true,
      filterField: fieldMap.area_acres,
      filterUnit: 'acres',
    };
  }
  if (fieldMap && fieldMap.area_sqft) {
    const sqft = thresholdAcres * 43560;
    return {
      where: `${fieldMap.area_sqft} >= ${sqft}`,
      sizeFiltered: true,
      filterField: fieldMap.area_sqft,
      filterUnit: 'sqft',
    };
  }
  return { where: '1=1', sizeFiltered: false, filterField: null, filterUnit: null };
}

/* Pure: which raw source fields this index actually needs from a
   jurisdiction, derived from its own fieldMap (canonical -> raw source
   name) rather than requesting outFields=* (every attribute the service
   carries). A first real live dispatch of this script requested '*' and
   produced a 168MB file (GitHub's push limit is 100MB) across just 55
   jurisdictions -- most of that from attributes this index has no use for
   (legal descriptions, deed references, dozens of assessment fields no
   PARCEL_SITE_SEARCH structural criterion reads). Only the fields the
   structural (non-proximity/constraint) CRITERIA in js/parcel/site-search.js
   can evaluate are requested. */
const STRUCTURAL_CANONICAL_FIELDS = [
  'parcel_id', 'pin', 'area_acres', 'area_sqft',
  'zoning_code', 'land_use_code', 'owner', 'assessed_value',
];

export function structuralOutFields(fieldMap) {
  const raw = new Set();
  for (const canonical of STRUCTURAL_CANONICAL_FIELDS) {
    const source = fieldMap && fieldMap[canonical];
    if (source && source !== '__computed__') raw.add(source);
  }
  // Every production jurisdiction maps parcel_id or pin (schema.js requires
  // parcel_id) -- an empty set here would mean a malformed registry entry,
  // not a real jurisdiction; '*' is a defensive fallback, not the norm.
  return raw.size ? [...raw] : ['*'];
}

/* Pure: mirrors js/parcel/connector-arcgis.js's _buildQueryUrl, but this is
   a Node script with no DOM/browser fetch context to share it with.
   geometryPrecision + maxAllowableOffset deliberately request simplified,
   low-precision geometry: centroidFromGeometry() below only needs a
   bounding box, not the exact parcel boundary (a user gets the real,
   precise geometry live when they open that specific parcel, same as
   today) -- full-precision polygons were the other major contributor to
   the 168MB first-run file alongside outFields=*.

   opts.outFieldsOverride bypasses structuralOutFields() entirely -- see
   fetchJurisdictionRecords()'s fallback below for why this exists: live-
   probed against the real registry (2026-08-10), New Castle County DE and
   Clark County NV both reject a restricted outFields list with a generic
   "Failed to execute query." even though every named field is confirmed
   present in the service's own metadata, while outFields=* against the
   IDENTICAL where clause succeeds. This is a live ArcGIS Server backend
   quirk, not a bug in how the field list is built. */
export function buildQueryUrl(jurisdiction, whereInfo, cap, opts = {}) {
  const url = new URL(jurisdiction.serviceUrl + '/query');
  const p = url.searchParams;
  p.set('where', whereInfo.where);
  p.set('outFields', opts.outFieldsOverride || structuralOutFields(jurisdiction.fieldMap).join(','));
  p.set('returnGeometry', 'true');
  p.set('geometryPrecision', '4');       // ~11m at the equator -- ample for a centroid
  p.set('maxAllowableOffset', '0.001');  // degrees; generalizes/simplifies the polygon
  p.set('inSR', '4326');
  p.set('outSR', '4326');
  p.set('resultRecordCount', String(cap));
  p.set('f', 'geojson');
  return url.toString();
}

/* Pure: bounding-box-center centroid from arbitrary GeoJSON coordinates
   (Polygon or MultiPolygon). A bbox-center is not a true area centroid, but
   is precise enough for an index entry that only needs to place a parcel on
   a map for a follow-up click -- the real geometry is fetched live when a
   user opens that parcel, exactly as it is today. */
export function centroidFromGeometry(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  const walk = (node) => {
    if (Array.isArray(node) && typeof node[0] === 'number' && typeof node[1] === 'number') {
      const [lon, lat] = node;
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    if (Array.isArray(node)) node.forEach(walk);
  };
  walk(geometry.coordinates);
  if (!Number.isFinite(minLon)) return null;
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

/* Pure: one ArcGIS feature -> one index record, in the exact
   { id, geometry, properties } candidate shape js/parcel/site-search.js's
   search()/evaluateCandidate() already expects -- so the browser module
   that loads this index can hand records straight to the existing,
   already-tested engine with no parallel evaluation logic. */
export function normalizeFeature(feature, jurisdiction) {
  const raw = feature.properties || {};
  const reverse = {};
  for (const [canonical, source] of Object.entries(jurisdiction.fieldMap || {})) {
    if (source && source !== '__computed__') reverse[String(source).toUpperCase()] = canonical;
  }
  const props = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonicalKey = reverse[k.toUpperCase()] || k.toLowerCase();
    props[canonicalKey] = v;
  }
  props.county_fips = jurisdiction.fips;
  props.state = jurisdiction.state;
  props._source = 'national-site-index';
  if (!props.parcel_id) {
    props.parcel_id = props.pin || props.objectid || null;
  }
  const centroid = centroidFromGeometry(feature.geometry);
  return {
    id: `${jurisdiction.fips}:${props.parcel_id ?? ''}`,
    geometry: centroid ? { type: 'Point', coordinates: centroid } : null,
    properties: props,
  };
}

/* One attempt at one jurisdiction's live query. Network/JSON errors come
   back as a result, never thrown -- one dead service must not abort the
   whole batch (same principle as check_parcel_services.mjs). `retryable`
   is set only for an in-body ArcGIS query error (the service responded and
   specifically rejected THIS query) -- a transport failure, HTTP error, or
   malformed body means retrying with different query params would not
   plausibly help, so those are never retried. */
async function _runQuery(jurisdiction, whereInfo, cap, fetchImpl, queryOpts = {}) {
  const url = buildQueryUrl(jurisdiction, whereInfo, cap, queryOpts);

  let res;
  try {
    res = await fetchImpl(url);
  } catch (e) {
    return { ok: false, fips: jurisdiction.fips, name: jurisdiction.name, error: e.message, sizeFiltered: whereInfo.sizeFiltered, records: [], retryable: false };
  }
  if (!res.ok) {
    return { ok: false, fips: jurisdiction.fips, name: jurisdiction.name, error: `HTTP ${res.status}`, sizeFiltered: whereInfo.sizeFiltered, records: [], retryable: false };
  }
  let json;
  try {
    json = await res.json();
  } catch {
    return { ok: false, fips: jurisdiction.fips, name: jurisdiction.name, error: 'non-JSON response', sizeFiltered: whereInfo.sizeFiltered, records: [], retryable: false };
  }
  if (json && json.error) {
    return {
      ok: false, fips: jurisdiction.fips, name: jurisdiction.name,
      error: json.error.message || JSON.stringify(json.error),
      sizeFiltered: whereInfo.sizeFiltered, records: [], retryable: true,
    };
  }
  const features = json.features || [];
  return {
    ok: true, fips: jurisdiction.fips, name: jurisdiction.name,
    sizeFiltered: whereInfo.sizeFiltered, filterField: whereInfo.filterField,
    records: features.map(f => normalizeFeature(f, jurisdiction)),
    truncated: features.length >= cap,
  };
}

/* One jurisdiction's live query, with one automatic fallback retry.
 *
 * Live-probed against the real registry (2026-08-10): New Castle County DE
 * and Clark County NV both reject the primary query (restricted outFields
 * + size-filtered where) with a generic ArcGIS "Failed to execute query.",
 * but outFields=* against the SAME where clause succeeds -- confirmed by
 * testing every other query parameter (geometryPrecision, maxAllowableOffset,
 * inSR/outSR, returnGeometry) in isolation; only the restricted outFields
 * list reproduces the failure. Marion County IN fails differently: its
 * ACREAGE field exists (confirmed via live service metadata) but cannot be
 * numerically compared with `>=` at all -- "Unable to complete operation."
 * on ANY where clause that filters it, even though a bare where=1=1 count
 * query against the same service succeeds -- the classic signature of a
 * field stored as text despite holding numeric-looking values.
 *
 * A single fallback (outFields=*, where=1=1) covers both failure classes
 * without needing to diagnose which one a given jurisdiction hit: it is
 * exactly the same sizeFiltered:false/capped-sample treatment the 13
 * jurisdictions with no area field mapped at all already receive (see this
 * file's own module docstring) -- a jurisdiction whose primary query fails
 * just discovers that fallback dynamically instead of being flagged for it
 * ahead of time via an absent fieldMap entry. If the fallback ALSO fails,
 * the PRIMARY error is reported, since it describes the actually-intended
 * query, not the fallback's. */
export async function fetchJurisdictionRecords(jurisdiction, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const thresholdAcres = opts.thresholdAcres ?? DEFAULT_THRESHOLD_ACRES;
  const cap = opts.cap ?? DEFAULT_CAP_PER_JURISDICTION;

  const whereInfo = computeSizeWhere(jurisdiction.fieldMap, thresholdAcres);
  const primary = await _runQuery(jurisdiction, whereInfo, cap, fetchImpl);
  if (primary.ok || !primary.retryable) return primary;

  const fallbackWhere = { where: '1=1', sizeFiltered: false, filterField: null, filterUnit: null };
  const fallback = await _runQuery(jurisdiction, fallbackWhere, cap, fetchImpl, { outFieldsOverride: '*' });
  if (fallback.ok) {
    return { ...fallback, fallbackApplied: true, primaryError: primary.error };
  }
  return primary;
}

/* Orchestrates the batch with bounded concurrency (polite to free government
   services, and keeps the job inside a reasonable CI time budget). Exported
   as a pure-ish async function taking an injectable fetchImpl so it is
   testable without real network -- the same "pure function + thin CLI"
   split every other pipeline script in this directory uses. */
export async function buildIndex(jurisdictions, opts = {}) {
  const thresholdAcres = opts.thresholdAcres ?? DEFAULT_THRESHOLD_ACRES;
  const cap = opts.cap ?? DEFAULT_CAP_PER_JURISDICTION;
  const fetchImpl = opts.fetchImpl || fetch;
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);

  const results = new Array(jurisdictions.length);
  let next = 0;
  async function worker() {
    while (next < jurisdictions.length) {
      const i = next++;
      results[i] = await fetchJurisdictionRecords(jurisdictions[i], { fetchImpl, thresholdAcres, cap });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jurisdictions.length) }, worker));

  const parcels = [];
  const jurisdictionSummaries = [];
  let sizeFilteredCount = 0, sampledCount = 0, failedCount = 0;
  const truncatedFips = [];

  for (const r of results) {
    if (!r.ok) {
      failedCount++;
      jurisdictionSummaries.push({ fips: r.fips, name: r.name, status: 'failed', error: r.error });
      continue;
    }
    if (r.sizeFiltered) sizeFilteredCount++; else sampledCount++;
    if (r.truncated) truncatedFips.push(r.fips);
    parcels.push(...r.records);
    jurisdictionSummaries.push({
      fips: r.fips, name: r.name, status: 'ok',
      recordCount: r.records.length, sizeFiltered: r.sizeFiltered,
      filterField: r.filterField || null, truncated: !!r.truncated,
      fallbackApplied: !!r.fallbackApplied,
    });
  }

  return {
    meta: {
      generated_at: new Date().toISOString(),
      threshold_acres: thresholdAcres,
      cap_per_jurisdiction: cap,
      jurisdictions_attempted: jurisdictions.length,
      jurisdictions_ok: jurisdictions.length - failedCount,
      jurisdictions_failed: failedCount,
      jurisdictions_size_filtered: sizeFilteredCount,
      jurisdictions_unfiltered_sample: sampledCount,
      jurisdictions_truncated: truncatedFips,
      total_parcels: parcels.length,
      caveat:
        "This index covers only this project's wired jurisdictions (see js/parcel/registry.js), " +
        'not every US county, and was built by a scheduled batch job, not a live query. ' +
        'jurisdictions_unfiltered_sample entries are a capped SAMPLE of parcels (not filtered by ' +
        'size) because that jurisdiction publishes no acreage/sqft field this pipeline could filter ' +
        'on server-side -- see jurisdiction_summaries for which. Proximity and environmental-' +
        'constraint criteria cannot be evaluated from this index; open a specific matched parcel ' +
        'for live per-parcel analysis.',
    },
    jurisdiction_summaries: jurisdictionSummaries,
    parcels,
  };
}

function parseArgs(argv) {
  const args = { thresholdAcres: DEFAULT_THRESHOLD_ACRES, cap: DEFAULT_CAP_PER_JURISDICTION, concurrency: DEFAULT_CONCURRENCY, fips: null, output: OUTPUT_PATH };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--threshold-acres') args.thresholdAcres = Number(argv[++i]);
    else if (argv[i] === '--cap') args.cap = Number(argv[++i]);
    else if (argv[i] === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (argv[i] === '--fips') args.fips = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (argv[i] === '--output') args.output = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let jurisdictions;
  try {
    jurisdictions = loadRegistry().all();
  } catch (e) {
    console.error('FATAL: ' + e.message);
    process.exit(2);
  }
  if (args.fips) {
    const wanted = new Set(args.fips);
    jurisdictions = jurisdictions.filter(j => wanted.has(j.fips));
  }

  console.log(`Building national site index: ${jurisdictions.length} jurisdiction(s), ` +
    `threshold ${args.thresholdAcres} acres, cap ${args.cap}/jurisdiction\n`);

  const index = await buildIndex(jurisdictions, {
    thresholdAcres: args.thresholdAcres, cap: args.cap, concurrency: args.concurrency,
  });

  for (const s of index.jurisdiction_summaries) {
    if (s.status === 'failed') {
      console.log(`FAILED  ${s.fips} ${s.name} — ${s.error}`);
    } else {
      console.log(`OK      ${s.fips} ${s.name} — ${s.recordCount} record(s)` +
        (s.sizeFiltered ? ` (size-filtered on ${s.filterField})` : ' (UNFILTERED SAMPLE — no size field)') +
        (s.truncated ? ' [TRUNCATED at cap]' : ''));
    }
  }

  console.log(`\n${index.meta.total_parcels} total parcel(s) across ` +
    `${index.meta.jurisdictions_ok}/${index.meta.jurisdictions_attempted} jurisdiction(s).`);

  writeFileSync(args.output, JSON.stringify(index, null, 2) + '\n');
  console.log(`Wrote ${args.output}`);

  if (index.meta.jurisdictions_failed === jurisdictions.length && jurisdictions.length > 1) {
    console.log('\nEVERY jurisdiction failed -- likely a broken-network runner, not 58 dead services.');
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
