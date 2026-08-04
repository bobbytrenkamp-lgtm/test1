// Temporary diagnostic, round 4: Shelby County TN (Memphis) parcel
// service.
//
// Round 3 found the real candidate: "Tennessee Property Boundaries
// Public Use" feature service, owned by tnmap_oir (Tennessee's state
// GIS office), at:
//   https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer
// Multiple third-party items ("Decatur County Parcels", "Henderson
// County Parcels", "Madison County Parcels") all reference this exact
// same FeatureServer URL, confirming it's a real statewide parcels
// service, filterable by county - the same architecture pattern
// already used for NJ (MOD-IV statewide, filtered by COUNTY) and other
// states in this registry.
//
// This round: fetch the service's layer list and field schema, then
// query for a real Shelby County sample record to confirm coverage and
// field mappings.
//
// Deleted once Shelby County TN is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const BASE = 'https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer';

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
      if (Array.isArray(body.value)) {
        console.log('Distinct values:', JSON.stringify(body.value));
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

// 1. Service-level layer list.
await fetchJson(`${BASE}?f=json`, 'Tennessee Property Boundaries - service root (layer list)');

// 2. Layer 0 field schema (most services expose the parcel layer as layer 0).
await fetchJson(`${BASE}/0?f=json`, 'Tennessee Property Boundaries - layer 0 schema');

// 3. Try to find the county field's distinct values (guessing common field names).
await fetchJson(
  `${BASE}/0/query?where=1=1&outFields=*&returnGeometry=false&resultRecordCount=1&f=json`,
  'Tennessee Property Boundaries - layer 0 sample record (any county)'
);

// 4. Try filtering directly for Shelby County by a few likely field/value guesses.
await fetchJson(
  `${BASE}/0/query?where=CountyName%3D%27Shelby%27&outFields=*&returnGeometry=false&resultRecordCount=1&f=json`,
  'Tennessee Property Boundaries - filter CountyName=Shelby'
);

await fetchJson(
  `${BASE}/0/query?where=County%3D%27Shelby%27&outFields=*&returnGeometry=false&resultRecordCount=1&f=json`,
  'Tennessee Property Boundaries - filter County=Shelby'
);

console.log('\nDone.');
