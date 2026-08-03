// Temporary diagnostic: find live parcel services for the next batch of
// counties in the facility-count priority list: Franklin County OH (82
// facilities) and King County WA (71 facilities).
//
// Round 1 (see AI_TEAM_STATUS.md / job logs) found real ArcGIS Online
// catalog results but the guessed direct King County URL was a 404
// (wrong service name), and the guessed Franklin County URL hit a bug in
// this script's own fetch helper (double-read of the response body on a
// JSON parse failure), not a real network signal.
//
// Round 2: fixes the fetch helper (read text once, then try JSON.parse),
// and fetches the specific live Feature Service candidates the round-1
// catalog search surfaced for King County (owner: KingCounty, org
// Ej0PsM5Aw677QF1W), plus a scoped search for Franklin County's actual
// auditor-owned parcel service.
//
// Deleted once these are either added to the registry or documented as
// unavailable.

const TIMEOUT_MS = 25000;

async function fetchJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const elapsed = Date.now() - start;
    const status = res.status;
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`HTTP ${status} in ${elapsed}ms`);
    if (typeof body === 'string') {
      console.log('Body (text, first 500 chars):', body.slice(0, 500));
    } else {
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (Array.isArray(body.results)) {
        console.log(`total: ${body.total}`);
        for (const r of body.results.slice(0, 10)) {
          console.log(`- id=${r.id} title="${r.title}" type="${r.type}" owner="${r.owner}" url="${r.url}"`);
        }
      }
    }
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

// --- Franklin County, OH (FIPS 39049) ---
// Fixed URL retry (round 1's failure was a script bug, not a real signal).
await fetchJson(
  'https://apps.franklincountyauditor.com/GIS_ArcGIS/rest/services/Parcels/MapServer?f=json',
  'Franklin County OH auditor GIS - Parcels service root (retry)'
);
// Scoped catalog search for the auditor's own hosted service, since round 1's
// general keyword search only surfaced a Web Map with no direct URL.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:FranklinCountyAuditor&f=json&num=10',
  'ArcGIS Online search scoped to FranklinCountyAuditor owner'
);

// --- King County, WA (FIPS 53033) ---
// Round 1 catalog search found these live, KingCounty-owned candidates.
// Fetch each Feature Server root, then layer 0, of the two best general-
// purpose candidates.
await fetchJson(
  'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PUBLIC_PARCELS_AREA_2598/FeatureServer?f=json',
  'King County WA - Public Parcels in King County (FeatureServer root)'
);
await fetchJson(
  'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PUBLIC_PARCELS_AREA_2598/FeatureServer/0?f=json',
  'King County WA - Public Parcels in King County (layer 0 definition)'
);
await fetchJson(
  'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer?f=json',
  'King County WA - Parcels with Address/Property/Ownership (Public) (FeatureServer root)'
);
await fetchJson(
  'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0?f=json',
  'King County WA - Parcels with Address/Property/Ownership (Public) (layer 0 definition)'
);

console.log('\nDone.');
