// Temporary diagnostic, round 5: Clark County NV field schemas for
// the most promising candidates found in round 4.
//
// Round 4's full Assessor folder listing + 7 candidate probes found
// several esriGeometryPolygon sub-layers worth checking directly:
//   - Assessor/CommonArea sub-layer 6 "ParcelPoly"
//   - Assessor/ParcelHistory sub-layer 3 "ParcelPoly" (same name -
//     likely the same canonical table reused across services)
//   - Assessor/ParcelDrafter sub-layer 1 "Parcels"
//   - Assessor/LandApp sub-layer 9 "Parcels"
// Also checking the generically-named "Layers" and "TraverseTool"
// services not yet probed.
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
      if (Array.isArray(body.layers)) {
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}(${l.geometryType || '?'})`).join(', '));
      }
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
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

await fetchJson(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/CommonArea/MapServer/6?f=json',
  'Assessor/CommonArea layer 6 "ParcelPoly" schema'
);
await fetchJson(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/ParcelHistory/MapServer/3?f=json',
  'Assessor/ParcelHistory layer 3 "ParcelPoly" schema'
);
await fetchJson(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/ParcelDrafter/MapServer/1?f=json',
  'Assessor/ParcelDrafter layer 1 "Parcels" schema'
);
await fetchJson(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/LandApp/MapServer/9?f=json',
  'Assessor/LandApp layer 9 "Parcels" schema'
);
await fetchJson(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/Layers/MapServer?f=json',
  'Assessor/Layers service root'
);

console.log('\nDone.');
