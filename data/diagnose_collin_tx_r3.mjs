// Temporary diagnostic, round 3: Collin County TX parcel service.
//
// Round 2 found gis.collincountytx.gov (the county's own GIS server)
// unreachable ("fetch failed"). It confirmed "CCAD_Parcel_Feature_Set"
// as genuinely official (copyrightText "Collin Central Appraisal
// District", description confirms nightly-refreshed appraisal and
// ownership data joined to the parcel layer) with sub-layers including
// id 4 "Parcels" - the one we want. This round probes that layer
// directly for its field list.
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
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (Array.isArray(body.features)) {
        console.log('Sample feature count:', body.features.length);
        if (body.features[0]) console.log('Sample attributes:', JSON.stringify(body.features[0].attributes));
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
  'https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4?f=json',
  'CCAD Parcel Feature Set - layer 4 (Parcels) - fields'
);

await fetchJson(
  'https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4/query?where=1%3D1&outFields=*&resultRecordCount=1&f=json',
  'CCAD Parcel Feature Set - layer 4 sample record'
);

console.log('\nDone.');
