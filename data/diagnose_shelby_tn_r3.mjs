// Temporary diagnostic, round 3: Shelby County TN (Memphis) parcel
// service.
//
// Round 2 findings: tnmap.tn.gov's ArcGIS REST root has ZERO services
// and its folder list (ADMINISTRATIVE_BOUNDARIES, BASEMAPS, COMMUNITY,
// ELEVATION, ENVIRONMENTAL, HEALTH, HISTORICAL,
// HISTORICAL_IMAGERY_BASEMAPS, LOCATORS, PUBLIC_SAFETY, SAFETY,
// STRUCTURES, TABLEAU, TRANSPORTATION, Utilities) contains nothing
// parcel/assessment-related - the "TN Property Viewer" web app must be
// backed by a REST service hosted elsewhere. The shelbycounty911 org's
// full 24-item catalog is confirmed to contain zero parcels layers
// (only address points, road centerlines, 911/emergency infrastructure).
// gis.shelbycountytn.gov is Cloudflare-blocked; maps.shelbycountytn.gov
// doesn't resolve.
//
// This round: (1) find items owned by tnmap_oir (the TN Property
// Viewer's actual owner account) to locate its underlying feature
// service directly, (2) search ArcGIS Online for Tennessee Comptroller
// Division of Property Assessments (the state agency that actually
// oversees county assessors in TN), (3) probe the confirmed-live
// gis.shelbycounty911.org Hub Site's own ArcGIS REST services root
// (distinct domain from the Cloudflare-blocked gis.shelbycountytn.gov).
//
// Deleted once Shelby County TN is either added or documented as
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
    try { body = JSON.parse(text); } catch { body = null; }
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`HTTP ${status} in ${elapsed}ms`);
    if (body) {
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (Array.isArray(body.results)) {
        console.log('ArcGIS Online results:', body.results.length, 'of total', body.total);
        for (const r of body.results.slice(0, 15)) {
          console.log('  -', r.title, '|', r.type, '|', r.owner, '|', r.url || '(no url)');
        }
      }
      if (Array.isArray(body.services)) {
        console.log('Services:', body.services.length);
        for (const s of body.services) console.log('  -', s.name, '(', s.type, ')');
      }
      if (Array.isArray(body.folders)) {
        console.log('Folders:', body.folders.join(', '));
      }
    } else {
      console.log('Body (text, first 500 chars):', text.slice(0, 500));
    }
    return { ok: true, status, body, text };
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

// 1. Items owned by tnmap_oir (TN Property Viewer's owner account).
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:tnmap_oir&f=json&num=50',
  'ArcGIS Online item search - all items owned by tnmap_oir'
);

// 2. TN Comptroller / Division of Property Assessments.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=Tennessee%20Comptroller%20property%20assessment%20parcels&f=json',
  'ArcGIS Online item search - TN Comptroller property assessment'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22Shelby%22%20title:%22parcel%22&f=json',
  'ArcGIS Online item search - title Shelby AND title parcel'
);

// 3. The confirmed-live shelbycounty911 Hub Site's own domain (distinct
// from the Cloudflare-blocked gis.shelbycountytn.gov).
await fetchJson(
  'https://gis.shelbycounty911.org/arcgis/rest/services?f=json',
  'gis.shelbycounty911.org ArcGIS REST services root'
);

console.log('\nDone.');
