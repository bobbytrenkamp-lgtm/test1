// Temporary diagnostic, round 2: Collin County TX parcel service.
//
// Round 1 surfaced two promising, genuinely-named candidates (not
// same-name false positives - both are clearly Collin County, TX
// specific): the county's own GIS server hosting a "Parcels (Collin
// County, TX)" layer, and "CCAD Parcel Feature Set" (CCAD = Collin
// Central Appraisal District, the county's official appraisal
// district). This round probes both directly for field lists.
//
// Deleted once Collin County TX is either added or documented as
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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 800));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (Array.isArray(body.layers)) {
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
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

await fetchJson(
  'https://gis.collincountytx.gov/arcgis/rest/services/county/IdentifyParcels/MapServer/0?f=json',
  'Collin County\'s own GIS server - IdentifyParcels layer 0 - fields'
);

await fetchJson(
  'https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer?f=json',
  'CCAD Parcel Feature Set - FeatureServer root - sub-layers'
);

await fetchJson(
  'https://services3.arcgis.com/GJeZXOPygZAo5bHm/arcgis/rest/services/Collin_County_Parcels/FeatureServer?f=json',
  'Collin_County_Parcels (services3 copy) - FeatureServer root - sub-layers'
);

console.log('\nDone.');
