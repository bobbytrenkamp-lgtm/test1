// Temporary diagnostic, round 1: Davidson County TN (Nashville) parcel
// service.
//
// Web search found a specific, real-looking candidate on Nashville's
// own MetroGIS host: maps.nashville.gov/arcgis/rest/services/Cadastral/
// Parcels/MapServer, described directly as "Parcel Boundaries for
// Nashville/Davidson County" with an "Ownership Parcels" feature layer
// -- a search result snippet already showed live JSON output
// (currentVersion 10.81), suggesting a first-probe success is likely.
// This round lists the MapServer's sub-layers to find the right layer
// index, then probes it directly for the real field schema. A second
// candidate, Parcels_SP (State Plane projection variant), is probed as
// a fallback in case the first MapServer's layer structure differs
// from expected.
//
// Deleted once Davidson County is either added or documented as
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
  'https://maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels/MapServer?f=json',
  'Candidate - Cadastral/Parcels MapServer (sub-layer listing)'
);

await fetchText(
  'https://maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels/MapServer/0?f=json',
  'Candidate - Cadastral/Parcels MapServer layer 0'
);

await fetchText(
  'https://maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels_SP/MapServer/0?f=json',
  'Fallback - Cadastral/Parcels_SP MapServer layer 0'
);

console.log('\nDone.');
