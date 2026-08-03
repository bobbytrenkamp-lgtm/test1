// Temporary diagnostic, round 2: Mecklenburg County NC / Charlotte parcel service.
//
// Round 1 confirmed gis.charlottenc.gov/CountyData/Parcels/MapServer/0
// is LIVE exactly as a search result described: 13 real fields
// (OBJECTID, MAP_BOOK, MAP_PAGE, MAP_BLOCK, LOT_NUM, NC_PIN, PID,
// PARCEL_TYPE, CONDO_TOWN_FLAG, Legal_From, Shape) -- boundary/legal-
// reference only, no owner/address/value. Round 1's attempt to list
// polaris3g.mecklenburgcountync.gov's services root directory got a
// generic app-level "Internal Error" page (not a standard ArcGIS JSON
// error), even though a web search had already indexed two real,
// correctly-structured service URLs under that same host+path
// (.../polarisv/rest/services/basemap/MapServer and .../basemap_aerial/
// MapServer) -- so the host and path structure are real, only the bare
// root-listing request choked. This round guesses a plausible parcel-
// named service directly under that same confirmed-real path instead.
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
  'https://polaris3g.mecklenburgcountync.gov/polarisv/rest/services/parcels/MapServer?f=json',
  'POLARIS - "parcels" MapServer guess (lowercase)'
);

await fetchText(
  'https://polaris3g.mecklenburgcountync.gov/polarisv/rest/services/Parcels/MapServer?f=json',
  'POLARIS - "Parcels" MapServer guess (capitalized)'
);

await fetchText(
  'https://polaris3g.mecklenburgcountync.gov/polarisv/rest/services/RealEstate/MapServer?f=json',
  'POLARIS - "RealEstate" MapServer guess'
);

console.log('\nDone.');
