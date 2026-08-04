// Temporary diagnostic, round 3: Duval County FL (Jacksonville) parcel
// service.
//
// Round 2 confirmed "Jacksonville Parcels" (services1.arcgis.com,
// item CtMjdUqInecbPao9) has one real Polygon layer named
// "jackonsville-fl-parcels" [sic, source's own typo]. The other
// candidate probed in round 2, "Jacksonville Interactive Parcel
// Map_WFL1", turned out to be a false positive from the ArcGIS
// Online title search: its layer names (Jville_UGB = Urban Growth
// Boundary, a term specific to Oregon-style land-use planning,
// Jville_Comp_Plan, Jville_Zones) indicate it's actually Jacksonville,
// OREGON — a small town in Jackson County, OR — not Jacksonville, FL.
// This round probes only the real Duval County FL candidate's layer
// 0 directly for field schema.
//
// Deleted once Duval County FL is either added or documented as
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
      if (body.description) console.log('description:', body.description.slice(0, 600));
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
  'https://services1.arcgis.com/CtMjdUqInecbPao9/arcgis/rest/services/Jacksonville_Parcels/FeatureServer/0?f=json',
  'Jacksonville Parcels layer 0 - jackonsville-fl-parcels'
);

console.log('\nDone.');
