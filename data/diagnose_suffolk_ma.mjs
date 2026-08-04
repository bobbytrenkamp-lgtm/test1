// Temporary diagnostic, round 5: Suffolk County MA (Boston metro)
// parcel service.
//
// Round 4 confirmed FeatureServer/4 ("GISDATA.L3_ASSESS") is real and
// rich (41 fields, including full owner data) -- but its JSON response
// has no geometryType/extent/spatialReference at all, meaning it's a
// non-spatial table, not the boundary layer. The DCAT catalog's own
// title for this service ("Massachusetts Property Tax Parcels (4
// Layers)") confirms this is a multi-layer service. This round lists
// the full FeatureServer catalog to find which layer (0-3) carries the
// actual Polygon parcel boundaries, and whether it shares a common key
// with the assessing table (PROP_ID/LOC_ID) for a possible where-based
// scoping -- the same investigation pattern used for Polk County IA's
// multi-table CAMA schema.
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
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.layers) console.log('Layers:', body.layers.map(l => `${l.id}:${l.name}(${l.type||'?'}, geom=${l.geometryType||'n/a'})`).join(', '));
      if (body.tables) console.log('Tables:', body.tables.map(t => `${t.id}:${t.name}`).join(', '));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 300));
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
  'https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/MassachusettsPropertyTaxParcels/FeatureServer?f=json',
  'MassachusettsPropertyTaxParcels FeatureServer - full layer/table catalog'
);

console.log('\nDone.');
