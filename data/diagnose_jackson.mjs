// Temporary diagnostic, round 2: Jackson County MO (Kansas City) parcel
// service.
//
// Round 1 found two problems with its guesses: Cadastral/
// ParcelsAndAddresses does not exist at all (a genuine ArcGIS 404, not
// a guess-gone-wrong -- the web search snippet that suggested it was
// stale/misleading). Cadastral/LotsAndDimensions/MapServer/0 is real
// and live, but turned out to be "Builder Block Numbers" -- a CAD
// text-annotation layer (FontName/FontSize/Bold/TextString/MSLINK_DMRS
// fields indicate a MicroStation/Bentley GIS annotation layer), not
// parcel polygons. This round lists LotsAndDimensions' actual
// sub-layers to find the real parcel layer index, and also tries the
// jcgis.jacksongov.org host's "ParcelViewer" app-backing service path
// (the public Parcel Viewer at jcgis.jacksongov.org/parcelviewer/ must
// query some real service).
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
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
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
  'https://jcgis.jacksongov.org/arcgis/rest/services/Cadastral/LotsAndDimensions/MapServer?f=json',
  'LotsAndDimensions - full sub-layer listing'
);

await fetchText(
  'https://jcgis.jacksongov.org/arcgis/rest/services/ParcelViewer/Parcels/MapServer?f=json',
  'ParcelViewer/Parcels - sub-layer listing guess'
);

await fetchText(
  'https://jcgis.jacksongov.org/arcgis/rest/services/Cadastral/Parcels/MapServer?f=json',
  'Cadastral/Parcels - simple name guess'
);

console.log('\nDone.');
