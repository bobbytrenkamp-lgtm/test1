// Temporary diagnostic, round 2: Harris County TX parcel service.
//
// Round 1's direct guesses failed, but a search scoped to the real,
// authoritative "HarrisCountyGIS" ArcGIS owner (confirmed genuine by
// other clearly-official layers from the same account: "Harris County",
// "HC_Boundary", "City_Limits") found two strong candidates: "Harris
// County Parcels" (ArcGIS Online hosted) and "HCAD Parcels Layer"
// (self-hosted at hcusgis.hctx.net -- Harris County's own domain; HCAD
// is the Harris County Appraisal District, likely the richer valuation
// source). This fetches both real schemas to pick the best one.
//
// Deleted once Harris is either added or documented as unavailable.

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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
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
  'https://services.arcgis.com/su8ic9KbA7PYVxPS/arcgis/rest/services/Harris_County_Parcels/FeatureServer?f=json',
  'Harris County Parcels - FeatureServer root'
);
await fetchText(
  'https://services.arcgis.com/su8ic9KbA7PYVxPS/arcgis/rest/services/Harris_County_Parcels/FeatureServer/0?f=json',
  'Harris County Parcels - layer 0 definition'
);
await fetchText(
  'https://hcusgis.hctx.net/hosting/rest/services/Hosted/HCAD_Parcels_Layer/FeatureServer?f=json',
  'HCAD Parcels Layer - FeatureServer root'
);
await fetchText(
  'https://hcusgis.hctx.net/hosting/rest/services/Hosted/HCAD_Parcels_Layer/FeatureServer/0?f=json',
  'HCAD Parcels Layer - layer 0 definition'
);

console.log('\nDone.');
