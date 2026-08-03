// Temporary diagnostic, round 1: Bexar County TX / San Antonio parcel service.
//
// Next candidate in the facility-count priority queue after Miami-Dade
// FL (40). Bexar County (39 facilities) is home to San Antonio. A web
// search found two specific, high-confidence leads instead of blind
// subdomain guessing:
//   - services7.arcgis.com/BUFM2kw4MpxDUJVh/.../Bexar_CAD_Parcels/
//     FeatureServer/3 -- a search result titled "Layer: Bexar CAD
//     Parcels (ID:3)", display field OWNER_NAME, polygon geometry.
//   - maps.bexar.org/arcgis/rest/services/Parcels/MapServer -- the
//     county's own GIS host, described as providing "identification and
//     location information about structures on parcels, parcel owners,
//     assessed values, and tax map characteristics."
// This round fetches both candidates' real field schemas directly.
//
// Deleted once Bexar County is either added or documented as unavailable.

const TIMEOUT_MS = 25000;

async function fetchText(url, label) {
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
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 400));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
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

await fetchText(
  'https://services7.arcgis.com/BUFM2kw4MpxDUJVh/ArcGIS/rest/services/Bexar_CAD_Parcels/FeatureServer/3?f=json',
  'Bexar_CAD_Parcels - layer 3 field schema (search result: display field OWNER_NAME)'
);

await fetchText(
  'https://maps.bexar.org/arcgis/rest/services/Parcels/MapServer?f=json',
  'maps.bexar.org - Parcels MapServer root'
);

console.log('\nDone.');
