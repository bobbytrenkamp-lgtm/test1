// Temporary diagnostic, round 5: Philadelphia PA parcel service.
//
// Round 4 confirmed PASDA's CityPhilly MapServer is real and live, but
// layer 0 (the guessed index) is "Philadelphia Buildings 2017", a
// building-footprint layer, not parcels. Its own sub-layer listing
// named the real candidate directly: layer 14, "Philadelphia DOR
// Parcels 202402" (DOR = Department of Revenue, Philadelphia's
// assessment authority; 202402 = a February 2024 update, i.e. actively
// maintained). This round probes that specific layer index for its
// real field schema, description, and copyrightText.
//
// Deleted once Philadelphia is either added or documented as
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
  'https://mapservices.pasda.psu.edu/server/rest/services/pasda/CityPhilly/MapServer/14?f=json',
  'Confirmed real - Philadelphia DOR Parcels 202402 (layer 14)'
);

console.log('\nDone.');
