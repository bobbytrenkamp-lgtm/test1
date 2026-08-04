// Temporary diagnostic, round 3: Douglas County NE (Omaha metro)
// parcel service.
//
// Round 2 confirmed the real service and account: Nataliya2 owns
// "Douglas County, NE - Air Quality" (douglascountyairquality.com)
// and "Douglas County NE Ortho Tiles" - decisive geographic
// confirmation this is the genuine Nebraska Douglas County (Omaha
// metro), not one of the many other-state Douglas Counties. dcgis.org
// is confirmed as the county's own ArcGIS Server (services named
// "Douglas_County_NE_2022_Imagery", "Omaha_NE_1958_Imagery", etc.).
// Parcels_for_BOE (Board of Equalization), owned by Nataliya2, has a
// very rich 60-field schema (PIN, OWNER_NAME, address components,
// ACRES, SQ_FEET, BLDG_SF, BLDG_YRBLT, NUMBLDGS, CLASS, DCAACCTYPE,
// TAX_DIST, LEGAL1-4, ADDITION_N/BLOCK/LOT).
//
// This round fetches real populated sample records (filtered to avoid
// null-placeholder rows, per this session's established diligence) to
// confirm actual field values and semantics before mapping.
//
// Deleted once Douglas County NE is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const LAYER = 'https://services.arcgis.com/pDAi2YK0L0QxVJHj/arcgis/rest/services/Parcels_for_BOE/FeatureServer/0';

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
      if (typeof body.count === 'number') console.log('Count:', body.count);
      if (Array.isArray(body.features)) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features.slice(0, 3)) {
          console.log('  attrs:', JSON.stringify(f.attributes));
        }
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

// 1. Total record count.
await fetchJson(`${LAYER}/query?where=1=1&returnCountOnly=true&f=json`, 'Parcels_for_BOE - total record count');

// 2. Real, populated sample records (owner not null, to avoid placeholder rows).
await fetchJson(
  `${LAYER}/query?where=OWNER_NAME+IS+NOT+NULL&outFields=*&returnGeometry=false&resultRecordCount=3&f=json`,
  'Parcels_for_BOE - sample records (owner not null)'
);

console.log('\nDone.');
