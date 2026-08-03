// Temporary diagnostic, round 4: Philadelphia PA parcel service.
//
// Round 3 confirmed OPA_PROPERTIES_PUBLIC is real and exceptionally
// rich (78 fields: owner, address, market/taxable value, sale history,
// building characteristics -- among the cleanest field naming of any
// source this session) but its geometryType is esriGeometryPoint, not
// Polygon. This registry's Leaflet renderer (js/parcel/renderer.js)
// draws parcels via L.geoJSON with a polygon fillColor/weight style;
// Point features would fall back to Leaflet's default marker
// rendering instead, breaking visual consistency with every other
// jurisdiction -- the same architectural blocker that ruled out Clark
// County NV's BOE_Parcels earlier this session (real point-geometry
// dataset with real data, but wrong geometry type for this connector's
// rendering model).
//
// This round checks PASDA's "CityPhilly" service (surfaced in round
// 1's web search, described as "the entire City of Philadelphia's
// parcels based on their legal descriptions") for a genuine polygon
// boundary layer, since a boundary-only add (thin, no owner/value)
// would still be usable under this architecture -- the same pattern
// already used for Travis County TX's thin 7-field layer.
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
  'https://mapservices.pasda.psu.edu/server/rest/services/pasda/CityPhilly/MapServer?f=json',
  'PASDA - CityPhilly MapServer sub-layer listing'
);

await fetchText(
  'https://mapservices.pasda.psu.edu/server/rest/services/pasda/CityPhilly/MapServer/0?f=json',
  'PASDA - CityPhilly MapServer layer 0'
);

console.log('\nDone.');
