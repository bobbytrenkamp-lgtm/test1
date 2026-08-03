// Temporary diagnostic, round 1: Salt Lake County UT parcel service.
//
// Web search found a specific, real-looking candidate: UGRC (Utah
// Geospatial Resource Center) hosts a "Parcels_SaltLake_LIR"
// (Land Information Record) FeatureServer layer maintained in
// coordination with the Salt Lake County Assessor, described as
// exposing parcel_id, address, tax district, and total market value
// fields -- but explicitly NOT owner name (that's only in the county's
// own internal Parcel Viewer app). This round confirms the UGRC LIR
// layer's real field schema, and also checks Salt Lake County's own
// open data portal (gisdata-slco.opendata.arcgis.com) for a richer,
// county-native alternative that might carry owner/value data the
// statewide LIR layer omits.
//
// Deleted once Salt Lake County is either added or documented as
// unavailable.

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
      if (body.folders) console.log('Folders:', body.folders.join(', '));
      if (body.services) console.log('Services:', body.services.map(s => `${s.name} (${s.type})`).join(', '));
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
  'https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0?f=json',
  'UGRC - Parcels_SaltLake_LIR FeatureServer layer 0'
);

await fetchText(
  'https://gisdata-slco.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  "Salt Lake County's own open data portal - DCAT catalog"
);

await fetchText(
  'https://gis.saltlakecounty.gov/arcgis/rest/services?f=json',
  'Salt Lake County GIS host - services root listing guess'
);

console.log('\nDone.');
