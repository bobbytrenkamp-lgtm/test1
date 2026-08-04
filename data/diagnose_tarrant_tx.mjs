// Temporary diagnostic, round 1: Tarrant County TX (Fort Worth)
// parcel service.
//
// Next candidate in the facility-count priority queue after Marion
// County IN (23 facilities). Web search found the county's own
// ArcGIS Server (mapit.tarrantcounty.com), with a very promising
// "Tax/TCProperty" layer directly named and described (56 fields
// including TAXPIN, OWNER_NAME, SITUS_ADDR, DEED_DATE/BOOK/PAGE,
// YEAR_BUILT, LAND_ACRES, APPRAISEDV, LAND_VALUE, IMPR_VALUE,
// TOTAL_VALU - a Tarrant Appraisal District CAMA export), plus a
// "Dynamic/TADParcels" FeatureServer as an alternate.
//
// This round probes both directly for field schema, geometry type,
// description, and copyright text.
//
// Deleted once Tarrant County TX is either added or documented as
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
  'https://mapit.tarrantcounty.com/arcgis/rest/services/Tax/TCProperty/MapServer/0?f=json',
  'Tarrant County GIS Server - Tax/TCProperty layer 0 (TAD CAMA export, primary candidate)'
);

await fetchText(
  'https://mapit.tarrantcounty.com/arcgis/rest/services/Dynamic/TADParcels/FeatureServer/0?f=json',
  'Tarrant County GIS Server - Dynamic/TADParcels layer 0 (alternate)'
);

console.log('\nDone.');
