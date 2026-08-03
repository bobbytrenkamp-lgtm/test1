// Temporary diagnostic, round 1: Mecklenburg County NC / Charlotte parcel service.
//
// Next candidate in the facility-count priority queue after San
// Francisco CA (documented as blocked). Mecklenburg County (39
// facilities) is home to Charlotte. A web search found two real leads
// instead of blind subdomain guessing:
//   1. gis.charlottenc.gov/arcgis/rest/services/CountyData/Parcels/
//      MapServer/0 -- a search result cited its real field list: 13
//      fields (OBJECTID, MAP_BOOK, MAP_PAGE, MAP_BLOCK, LOT_NUM, NC_PIN,
//      PID, PARCEL_TYPE, CONDO_TOWN_FLAG, Legal_From, Shape) -- boundary/
//      legal-reference data, explicitly noted as NOT exposing owner
//      name or address on this public endpoint.
//   2. polaris3g.mecklenburgcountync.gov/polarisv/rest/services --
//      Mecklenburg County's own "POLARIS" real estate mapping platform
//      (assessed values, sales, property info per its own description),
//      hosting at least two known services (basemap, basemap_aerial).
//      Probing its services root to find the real parcel/assessment
//      service name, which could carry richer valuation data than the
//      Charlotte-hosted layer even if owner names are also excluded
//      there.
//
// Deleted once Mecklenburg County is either added or documented as
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
  'https://gis.charlottenc.gov/arcgis/rest/services/CountyData/Parcels/MapServer/0?f=json',
  'gis.charlottenc.gov CountyData/Parcels - layer 0 field schema'
);

await fetchText(
  'https://polaris3g.mecklenburgcountync.gov/polarisv/rest/services?f=json',
  'polaris3g.mecklenburgcountync.gov - services root directory'
);

console.log('\nDone.');
