// Temporary diagnostic, round 3: Allegheny County PA (Pittsburgh
// metro) parcel service.
//
// Round 2 confirmed the AlleghenyCountyParcels MapServer stays dead
// ("not started") even after two retries, but the alternate
// mapservices.pasda.psu.edu pasda/AlleghenyCounty MapServer's full
// layer catalog (41 layers) includes layer [25] "Allegheny County
// Parcels 20260727" - a live, currently-dated parcels layer. This
// round probes that specific layer directly for its field schema.
//
// Deleted once Allegheny County PA is either added or documented as
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
      if (body.extent) console.log('extent:', JSON.stringify(body.extent));
      if (body.description) console.log('description:', body.description.slice(0, 800));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
    } else {
      console.log('Body (text, first 800 chars):', text.slice(0, 800));
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
  'https://mapservices.pasda.psu.edu/server/rest/services/pasda/AlleghenyCounty/MapServer/25?f=json',
  'PASDA pasda/AlleghenyCounty MapServer - layer 25 (Allegheny County Parcels 20260727)'
);

console.log('\nDone.');
