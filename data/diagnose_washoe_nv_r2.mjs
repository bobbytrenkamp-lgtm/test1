// Temporary diagnostic, round 2: Washoe County NV (Reno metro) parcel
// service.
//
// Round 1 found the real candidate immediately: Washoe County's own
// open data portal (opendata.washoecounty.gov) lists a "Parcels"
// dataset owned directly by the county's own ArcGIS org ("washoe"),
// at:
//   https://services.arcgis.com/iCGWaR7ZHc5saRIl/arcgis/rest/services/Nightly_OpenData_Update/FeatureServer/1
// Confirmed independently by both the county's DCAT catalog and an
// ArcGIS Online search (owner: washoe). A companion "Parcel
// LandUseCodes Table" (also owned by washoe) exists too.
//
// This round fetches the service's field schema and a real populated
// sample record to confirm coverage and prepare a field mapping.
//
// Deleted once Washoe County NV is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const LAYER = 'https://services.arcgis.com/iCGWaR7ZHc5saRIl/arcgis/rest/services/Nightly_OpenData_Update/FeatureServer/1';

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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 800));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (Array.isArray(body.features)) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features.slice(0, 3)) {
          console.log('  attrs:', JSON.stringify(f.attributes));
        }
      }
      if (typeof body.count === 'number') console.log('Count:', body.count);
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

// 1. Layer schema.
await fetchJson(`${LAYER}?f=json`, 'Washoe County Parcels - layer schema');

// 2. Total record count.
await fetchJson(`${LAYER}/query?where=1=1&returnCountOnly=true&f=json`, 'Washoe County Parcels - total record count');

// 3. A real, populated sample record (owner not null).
await fetchJson(
  `${LAYER}/query?where=1=1&outFields=*&returnGeometry=false&resultRecordCount=3&f=json`,
  'Washoe County Parcels - sample records'
);

console.log('\nDone.');
