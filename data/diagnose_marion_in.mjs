// Temporary diagnostic, round 2: Marion County IN (Indianapolis)
// parcel service.
//
// Round 1's DCAT catalog directly surfaced "Parcels w/ Owner
// Information & Assessed Values" - a promising rich dataset - plus a
// plainer "Parcels" (boundary + address only) dataset as a fallback.
// This round probes both directly for field schema/geometryType/
// description/copyrightText.
//
// Deleted once Marion County IN is either added or documented as
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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 800));
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
  'https://gis.indy.gov/server/rest/services/MapIndy/MapIndyProperty/MapServer/10?f=json',
  'MapIndyProperty layer 10 - Parcels w/ Owner Information & Assessed Values'
);

await fetchText(
  'https://gis.indy.gov/server/rest/services/Accela/AGIS_INDIANAPOLIS/MapServer/15?f=json',
  'AGIS_INDIANAPOLIS layer 15 - Parcels (boundary + address, fallback)'
);

console.log('\nDone.');
