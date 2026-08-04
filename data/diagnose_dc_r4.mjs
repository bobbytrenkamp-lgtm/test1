// Temporary diagnostic, round 4: District of Columbia parcel service.
//
// Round 3 confirmed real Polygon geometry on layers 33 (Parcel Lots)
// and 39 (Tax Lots), but each layer's own description reveals it
// covers a narrow edge case: Parcel Lots is land that was NEVER
// subdivided into Record or Tax Lots (a residual historical
// category), and Tax Lots only exist when a property's tax lot
// diverges from its record lot (a "combine" or "split" edge case).
// Round 2's full layer catalog also listed layer 35 "Record Lots" —
// DC's standard platted-lot cadastral layer, which most ordinary
// developed properties (including data center sites) would actually
// belong to. This round probes it directly for field schema.
//
// Deleted once DC is either added or documented as unavailable.

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
      if (body.description) console.log('description:', body.description.slice(0, 600));
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
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer/35?f=json',
  'Property_and_Land_WebMercator layer 35 - Record Lots'
);

console.log('\nDone.');
