// Temporary diagnostic, round 3: Jackson County MO (Kansas City) parcel
// service.
//
// Round 1+2 exhausted plausible guesses without finding a real
// assessor/CAMA parcel service: Cadastral/ParcelsAndAddresses and
// ParcelViewer/Parcels and Cadastral/Parcels all return real 404s;
// Cadastral/LotsAndDimensions turned out to be entirely CAD/survey
// layers (Builder Block Numbers, Property Dimensions, Lot Corners, Lot
// Numbers, Lot Annotation, Lots) -- a surveying/plat service, not a
// general parcel data layer with owner/value/address fields. Rather
// than keep guessing names, this round lists the services root
// directory directly to see the real folder/service structure.
//
// Deleted once Jackson County is either added or documented as
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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
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
  'https://jcgis.jacksongov.org/arcgis/rest/services?f=json',
  'Root services directory listing'
);

await fetchText(
  'https://jcgis.jacksongov.org/arcgis/rest/services/Cadastral?f=json',
  'Cadastral folder listing'
);

console.log('\nDone.');
