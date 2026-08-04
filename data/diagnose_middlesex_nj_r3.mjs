// Temporary diagnostic, round 3: Middlesex County NJ parcel service.
//
// Round 2 confirmed two real, publicly-accessible Polygon parcel
// layers: the county's own GIS portal ("Parcels", layer 2 of
// Parcels_Public MapServer) and an ArcGIS Online hosted service
// ("Middlesex_County_NJ_Parcel_data") with an official description
// naming Civil Solutions, the Middlesex County Office of Information
// Technology, and NJ's Office of GIS (NJOGIS) as sources, updated
// monthly from the state's MOD-IV assessor database. The third
// round-2 candidate requires an auth token and is not usable. This
// round probes both viable candidates directly for field schema.
//
// Deleted once Middlesex County NJ is either added or documented as
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
  'https://mcgisportal.co.middlesex.nj.us/server/rest/services/GIS/Parcels_Public/MapServer/2?f=json',
  'Middlesex County own GIS portal - Parcels layer 2'
);

await fetchJson(
  'https://services.arcgis.com/BnY3izA2Kwu6jVHq/arcgis/rest/services/Middlesex_County_NJ_Parcel_data/FeatureServer/0?f=json',
  'Middlesex_County_NJ_Parcel_data layer 0 - Parcels'
);

console.log('\nDone.');
