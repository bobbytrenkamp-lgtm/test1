// Temporary diagnostic, round 2: Honolulu County HI parcel service.
//
// Round 1 directly surfaced "Parcels - Honolulu County (Island of
// Oahu)" hosted by Hawaii's own state GIS portal (geodata.hawaii.gov),
// layer 11 of a ParcelsZoning MapServer that also has sibling layers
// for Hawaii Statewide (25), Hawaii County (5), TMK Zone/Section/Plat
// (26-28), etc. This round probes layer 11 directly for its field
// list and a sample record.
//
// Deleted once Honolulu County HI is either added or documented as
// unavailable.

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
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (Array.isArray(body.features)) {
        console.log('Sample feature count:', body.features.length);
        for (const f of body.features) console.log('Sample attributes:', JSON.stringify(f.attributes));
      }
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
  'https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/11?f=json',
  'Parcels - Honolulu County (Island of Oahu) - layer 11 fields'
);

await fetchJson(
  'https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/11/query?where=1%3D1&outFields=*&resultRecordCount=1&f=json',
  'Parcels - Honolulu County - layer 11 sample record'
);

console.log('\nDone.');
