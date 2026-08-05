// Temporary diagnostic, round 4: Clark County NV (Las Vegas) parcel
// service.
//
// Rounds 1-3 (2026-08-03) established that maps.clarkcountynv.gov is
// genuinely live with a real "Assessor" folder listing 25+ services.
// Two named candidates were ruled out on their actual structure:
// Assessor_Base_Map is a cached tile basemap with no queryable
// attributes; BOE_Parcels is a sparse 8-field point layer (Board of
// Equalization appeal cases), not parcel boundary data. ~20 more
// services in the folder were never tried.
//
// This round re-fetches the full Assessor folder listing (to get
// exact current service names/URLs) and then probes the most
// plausible remaining candidates for a general-purpose parcel
// boundary/cadastral layer with real polygon geometry and rich
// owner/address/value fields.
//
// Deleted once Clark County NV is either added or re-documented as
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
      if (Array.isArray(body.services)) {
        console.log('Services:', body.services.map(s => `${s.name}(${s.type})`).join(', '));
      }
      if (Array.isArray(body.layers)) {
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}(${l.geometryType || '?'})`).join(', '));
      }
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.type) console.log('Layer type:', body.type);
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.description) console.log('description:', String(body.description).slice(0, 300));
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

// Re-fetch the full Assessor folder listing for exact current names.
await fetchJson(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor?f=json',
  'Clark County NV - Assessor folder full listing'
);

// Most plausible untried candidates for a general parcel boundary layer.
const candidates = [
  'added_current', 'AOSubdivisions', 'CommonArea', 'LandApp',
  'ParcelHistory', 'ParcelDrafter', 'clarktrs_qq_p',
];
for (const name of candidates) {
  await fetchJson(
    `https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/${name}/MapServer?f=json`,
    `Clark County NV - Assessor/${name} (MapServer)`
  );
}

console.log('\nDone.');
