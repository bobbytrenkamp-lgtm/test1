// Temporary diagnostic, round 2: Suffolk County MA (Boston metro)
// parcel service.
//
// Round 1's guessed FeatureServer name (L3_TAXPAR_POLY_ASSESS_gdb
// under org hGdibHYSPO59RG1h) returned an ArcGIS "Invalid URL" error
// -- a wrong guess. The same web search also surfaced an alternate,
// state-hosted proxy service for the same statewide Level 3 parcels
// dataset. This round probes that alternate URL directly.
//
// Deleted once Suffolk County MA is either added or documented as
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
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.layers) console.log('Layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
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

await fetchText(
  'https://gisprpxy.itd.state.ma.us/arcgisserver/rest/services/AGOL/L3_Parcels_FeatureService_4326/FeatureServer?f=json',
  'MA state-hosted proxy - L3_Parcels_FeatureService_4326 layer catalog'
);

await fetchText(
  'https://gisprpxy.itd.state.ma.us/arcgisserver/rest/services/AGOL/L3_Parcels_FeatureService_4326/FeatureServer/0?f=json',
  'MA state-hosted proxy - L3_Parcels_FeatureService_4326 layer 0'
);

console.log('\nDone.');
