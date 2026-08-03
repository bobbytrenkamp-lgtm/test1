// Temporary diagnostic, round 1: Clark County NV / Las Vegas parcel service.
//
// Next candidate in the facility-count priority queue after Travis
// County TX (45). Clark County (43 facilities) is home to Las Vegas.
// A web search (this sandbox can search but can't fetch) found real
// leads instead of blind subdomain guessing:
//   - maps.clarkcountynv.gov/arcgis/rest/services -- has an "Assessor"
//     folder per search snippet ("Assessor Base Map shows Parcel
//     Polygons... maintained by the Clark County Assessors Department")
//   - gisgate.co.clark.nv.us/arcgis/rest/services -- an alternate/older
//     REST endpoint, also with an "Assessor" folder mentioned
//   - hub.arcgis.com/datasets/ccgismo::parcels -- an ArcGIS Hub dataset
//     page for a "Parcels" layer owned by "ccgismo" (Clark County GIS
//     Management Office), exact FeatureServer URL not yet known
// This round fetches the services directory listings to find the real
// service/layer names before guessing specific paths.
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
      if (body.folders) console.log('Folders:', body.folders.join(', '));
      if (body.services) console.log('Services:', body.services.map(s => `${s.name} (${s.type})`).join(', '));
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
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
  'https://maps.clarkcountynv.gov/arcgis/rest/services?f=json',
  'maps.clarkcountynv.gov - services root directory'
);

await fetchText(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor?f=json',
  'maps.clarkcountynv.gov - Assessor folder directory'
);

await fetchText(
  'https://gisgate.co.clark.nv.us/arcgis/rest/services?f=json',
  'gisgate.co.clark.nv.us - services root directory'
);

await fetchText(
  'https://gisgate.co.clark.nv.us/arcgis/rest/services/Assessor?f=json',
  'gisgate.co.clark.nv.us - Assessor folder directory'
);

console.log('\nDone.');
