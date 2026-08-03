// Temporary diagnostic, round 3: Polk County IA (Des Moines) parcel
// service -- checking for a richer companion layer/table.
//
// Round 2 confirmed the "Cadastral Parcels" layer (FeatureServer/1) is
// real, live, Polygon geometry -- but very thin: only 8 fields
// (Parcel_Number, Alternate_Parcel, HouseNo, plus IDs/geometry
// metadata), no owner or assessed-value data. This round lists the
// FeatureServer's full layer/table catalog to check for a richer
// companion (e.g. an Assessor/CAMA table joinable by Parcel_Number),
// the same pattern used for Sacramento County CA's separate Assessor
// Parcel Viewer.
//
// Deleted once Polk County is either added or documented as
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
      if (body.layers) {
        console.log('Layers:', body.layers.map(l => `${l.id}:${l.name}(${l.type||'?'}, geom=${l.geometryType||'n/a'})`).join(', '));
      }
      if (body.tables) {
        console.log('Tables:', body.tables.map(t => `${t.id}:${t.name}`).join(', '));
      }
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
  'https://gis4.polkcountyiowa.gov/server/rest/services/Public/Polk_County_Parcels/FeatureServer?f=json',
  'Polk_County_Parcels FeatureServer - full layer/table catalog'
);

console.log('\nDone.');
