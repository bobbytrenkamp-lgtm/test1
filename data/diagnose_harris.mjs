// Temporary diagnostic, round 4: Harris County TX parcel service.
//
// Round 3's fetch of Harris_County_Parcels/FeatureServer/1 returned
// "fetch failed" on the exact same domain (services.arcgis.com) whose
// FeatureServer root was confirmed LIVE in round 2, with layer 1
// explicitly named in its own sub-layers list ("1:Harris County
// Parcels"). Nothing about the URL changed between rounds -- this reads
// as a transient network blip on that runner, not a real dead link.
// One more minimal, targeted retry of just this URL with a longer
// timeout before concluding either way.
//
// Deleted once Harris is either added or documented as unavailable.

const TIMEOUT_MS = 30000;

async function fetchText(url, label, attempts = 2) {
  for (let i = 1; i <= attempts; i++) {
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
      console.log(`\n=== ${label} (attempt ${i}/${attempts}) ===`);
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
      clearTimeout(timer);
      return { ok: true, status, body, text };
    } catch (e) {
      const elapsed = Date.now() - start;
      console.log(`\n=== ${label} (attempt ${i}/${attempts}) ===`);
      console.log(`URL: ${url}`);
      console.log(`FAILED after ${elapsed}ms: ${e.message || e}`);
      clearTimeout(timer);
      if (i === attempts) return { ok: false, error: String(e) };
    }
  }
}

await fetchText(
  'https://services.arcgis.com/su8ic9KbA7PYVxPS/arcgis/rest/services/Harris_County_Parcels/FeatureServer/1?f=json',
  'Harris County Parcels - layer 1 definition (retry with 2 attempts)'
);

console.log('\nDone.');
