// Temporary diagnostic, round 2: Clark County NV / Las Vegas parcel service.
//
// Round 1 confirmed maps.clarkcountynv.gov is LIVE with a real Assessor
// folder listing 25+ services. Two strong candidates for a general-
// purpose parcel layer:
//   - Assessor/Assessor_Base_Map (MapServer) -- per the web search that
//     found this host, described as showing "Parcel Polygons, Easements,
//     Lotlines, Subdivisions lines, and Right of Way"
//   - Assessor/BOE_Parcels (FeatureServer + MapServer) -- name literally
//     says "Parcels" (BOE likely = Board of Equalization)
// (gisgate.co.clark.nv.us, the alternate/older host, failed at the
// connection level on both attempts -- likely retired in favor of
// maps.clarkcountynv.gov, not investigated further.)
// This round fetches both candidates' MapServer roots to find the real
// parcel sub-layer index and field schema.
//
// Deleted once Clark County is either added or documented as unavailable.

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
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/Assessor_Base_Map/MapServer?f=json',
  'Assessor_Base_Map - MapServer root'
);

await fetchText(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/BOE_Parcels/FeatureServer?f=json',
  'BOE_Parcels - FeatureServer root'
);

console.log('\nDone.');
