// Temporary diagnostic: find a live Santa Clara County CA parcel service.
//
// Round 1 (see AI_TEAM_STATUS.md) confirmed the direct service candidate
// (webgis.sccgov.org) is genuinely dead -- "fetch failed" (connection/DNS
// failure) on two endpoints even with a 25s timeout, not just slow.
//
// Round 2: the ArcGIS Hub site is reachable but a keyword search only
// returns a generic dataset listing, not a schema. This drills into that
// listing and the ArcGIS Online catalog to find an actual live Feature
// Service URL, then fetches its real layer definition.
//
// Deleted once Santa Clara is either added or documented as unavailable.

const TIMEOUT_MS = 25000;

async function fetchJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const elapsed = Date.now() - start;
    const status = res.status;
    let body;
    try { body = await res.json(); } catch { body = await res.text(); }
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`HTTP ${status} in ${elapsed}ms`);
    return { ok: true, status, body };
  } catch (e) {
    const elapsed = Date.now() - start;
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`FAILED after ${elapsed}ms: ${e.message || e}`);
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

// Round 2a: ArcGIS Hub OGC API - Features dataset search, but print the
// actual feature list (titles + links) instead of just top-level keys.
const hubSearch = await fetchJson(
  'https://gisdata-sccplanning.hub.arcgis.com/api/search/v1/collections/dataset/items?q=parcel',
  'Santa Clara ArcGIS Hub dataset search (detail)'
);
if (hubSearch.ok && typeof hubSearch.body === 'object' && Array.isArray(hubSearch.body.features)) {
  console.log(`numberMatched: ${hubSearch.body.numberMatched}, numberReturned: ${hubSearch.body.numberReturned}`);
  for (const f of hubSearch.body.features.slice(0, 10)) {
    const p = f.properties || {};
    console.log(`- id=${f.id} title="${p.title}" type="${p.type}" url="${p.url || p.landingPage}"`);
  }
}

// Round 2b: ArcGIS Online catalog search, print titles/ids/urls/types of
// results instead of just top-level keys.
const agoSearch = await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=Santa%20Clara%20County%20parcels&f=json&num=10',
  'ArcGIS Online catalog search for Santa Clara parcels (detail)'
);
if (agoSearch.ok && typeof agoSearch.body === 'object' && Array.isArray(agoSearch.body.results)) {
  console.log(`total: ${agoSearch.body.total}`);
  for (const r of agoSearch.body.results) {
    console.log(`- id=${r.id} title="${r.title}" type="${r.type}" owner="${r.owner}" url="${r.url}"`);
  }
}

// Round 2c: the County's official open data ArcGIS Online org, searched
// directly for a parcel Feature Service (owner org: SantaClaraCounty /
// sccplanning per the Hub subdomain found in round 1).
const orgSearch = await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:SCCPlanning&f=json&num=10',
  'ArcGIS Online search scoped to SCCPlanning owner'
);
if (orgSearch.ok && typeof orgSearch.body === 'object' && Array.isArray(orgSearch.body.results)) {
  console.log(`total: ${orgSearch.body.total}`);
  for (const r of orgSearch.body.results) {
    console.log(`- id=${r.id} title="${r.title}" type="${r.type}" owner="${r.owner}" url="${r.url}"`);
  }
}

console.log('\nDone.');
