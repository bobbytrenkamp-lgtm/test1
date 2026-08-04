// Temporary diagnostic, round 2: DeKalb County GA (Atlanta metro)
// parcel service.
//
// Round 1 found the real candidate, confirmed as genuinely Georgia
// (not the same-named counties in IL/IN/TN/MO/AL) via multiple
// corroborating signals: results reference "Tucker" (a real DeKalb
// County GA city) and are owned by "decatur_admin" - Decatur is
// literally DeKalb County GA's county seat. The county's own official
// GIS admin account (DeKalbGISAdmin) publishes yearly-versioned "Tax
// Parcels" feature services:
//   https://services2.arcgis.com/IxVN2oUE9EYLSnPE/arcgis/rest/services/Tax_Parcels_2025/FeatureServer
//
// This round fetches the service's field schema and a real populated
// sample record to confirm coverage and prepare a field mapping.
//
// Deleted once DeKalb County GA is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const BASE = 'https://services2.arcgis.com/IxVN2oUE9EYLSnPE/arcgis/rest/services/Tax_Parcels_2025/FeatureServer';

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
      if (Array.isArray(body.layers)) {
        console.log('Layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      }
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

// 1. Service-level layer list.
await fetchJson(`${BASE}?f=json`, 'DeKalb County GA Tax Parcels 2025 - service root (layer list)');

// 2. Layer 0 field schema.
await fetchJson(`${BASE}/0?f=json`, 'DeKalb County GA Tax Parcels 2025 - layer 0 schema');

// 3. Total record count.
await fetchJson(`${BASE}/0/query?where=1=1&returnCountOnly=true&f=json`, 'DeKalb County GA Tax Parcels 2025 - total record count');

// 4. Real, populated sample records.
await fetchJson(
  `${BASE}/0/query?where=1=1&outFields=*&returnGeometry=false&resultRecordCount=3&f=json`,
  'DeKalb County GA Tax Parcels 2025 - sample records'
);

console.log('\nDone.');
