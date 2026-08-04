// Temporary diagnostic, round 4: Suffolk County MA (Boston metro)
// parcel service.
//
// Round 3's DCAT catalog search on MassGIS's own open-data portal
// found the real dataset directly among 295 "parcel" matches:
// "GISDATA.L3 ASSESS" / "Massachusetts Property Tax Parcels" -- the
// standardized statewide assessors' parcel mapping dataset, with a
// genuine ArcGIS GeoServices REST distribution URL on a host neither
// of the first two rounds' guesses used
// (arcgisserver.digital.mass.gov). This round probes that confirmed
// URL directly to get its real field schema, description, and
// copyrightText.
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
  'https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/MassachusettsPropertyTaxParcels/FeatureServer/4?f=json',
  'Confirmed real - Massachusetts Property Tax Parcels FeatureServer layer 4'
);

console.log('\nDone.');
