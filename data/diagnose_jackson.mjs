// Temporary diagnostic, round 1: Jackson County MO (Kansas City) parcel
// service.
//
// Web search found Jackson County's own GIS host (jcgis.jacksongov.org)
// hosting several Cadastral services. The most promising two:
// Cadastral/ParcelsAndAddresses (combined parcel + address data,
// probed first as the likely richest candidate) and
// Cadastral/LotsAndDimensions (described as lot-dimension data,
// updated weekly on Saturdays -- likely a thinner boundary-only
// layer, probed as a fallback/comparison).
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
  'https://jcgis.jacksongov.org/arcgis/rest/services/Cadastral/ParcelsAndAddresses/MapServer?f=json',
  'Primary candidate - Cadastral/ParcelsAndAddresses (sub-layer listing)'
);

await fetchText(
  'https://jcgis.jacksongov.org/arcgis/rest/services/Cadastral/ParcelsAndAddresses/MapServer/0?f=json',
  'Primary candidate - Cadastral/ParcelsAndAddresses layer 0'
);

await fetchText(
  'https://jcgis.jacksongov.org/arcgis/rest/services/Cadastral/LotsAndDimensions/MapServer/0?f=json',
  'Fallback - Cadastral/LotsAndDimensions layer 0'
);

console.log('\nDone.');
