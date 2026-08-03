// Temporary diagnostic, round 3: Harris County TX parcel service.
//
// Round 2 found: "Harris County Parcels" FeatureServer root is live and
// confirms its actual layer is index 1 ("1:Harris County Parcels"), not
// 0 as guessed -- that's why /0 404'd. The self-hosted "HCAD Parcels
// Layer" at hcusgis.hctx.net failed at the connection level both times
// ("fetch failed") -- likely unreachable from this network, not
// confirmed dead by an HTTP response. This fetches the correct layer 1
// definition.
//
// Deleted once Harris is either added or documented as unavailable.

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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description);
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
  'https://services.arcgis.com/su8ic9KbA7PYVxPS/arcgis/rest/services/Harris_County_Parcels/FeatureServer/1?f=json',
  'Harris County Parcels - layer 1 definition (correct layer id)'
);

// Retry the self-hosted HCAD service once more with a longer implicit
// wait via the runner's own DNS resolution, in case the prior failures
// were transient rather than a genuine block.
await fetchText(
  'https://hcusgis.hctx.net/hosting/rest/services/Hosted/HCAD_Parcels_Layer/FeatureServer?f=json',
  'HCAD Parcels Layer - FeatureServer root (retry)'
);

console.log('\nDone.');
