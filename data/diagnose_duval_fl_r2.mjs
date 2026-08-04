// Temporary diagnostic, round 2: Duval County FL (Jacksonville) parcel
// service.
//
// Round 1's DCAT catalog on data.coj.net failed to resolve (DNS/fetch
// failure), but ArcGIS Online's public item search directly surfaced
// "Jacksonville Parcels" (appearing twice in results, same URL) as
// the strongest candidate, plus "Jacksonville Interactive Parcel
// Map_WFL1" and the Florida Statewide Cadastral as fallbacks. This
// round probes each for layer catalog / field schema.
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
      if (Array.isArray(body.layers)) {
        console.log('Layer count:', body.layers.length);
        for (const l of body.layers) {
          console.log(`  [${l.id}] ${l.name} (${l.geometryType || 'no geometry'})`);
        }
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

await fetchJson(
  'https://services1.arcgis.com/CtMjdUqInecbPao9/arcgis/rest/services/Jacksonville_Parcels/FeatureServer?f=json',
  'Jacksonville Parcels - full layer catalog'
);

await fetchJson(
  'https://services7.arcgis.com/ULDicaHfvMRD52nd/arcgis/rest/services/Jacksonville_Interactive_Parcel_Map_WFL1/FeatureServer?f=json',
  'Jacksonville Interactive Parcel Map - full layer catalog'
);

console.log('\nDone.');
