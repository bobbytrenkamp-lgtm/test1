// Temporary diagnostic, round 1: San Francisco County CA parcel service.
//
// Next candidate in the facility-count priority queue after Bexar
// County TX (39). San Francisco (39 facilities, tied with Bexar) is a
// consolidated city-county. A web search did NOT find a direct ArcGIS
// FeatureServer URL this time (unlike Travis/Bexar/Miami-Dade) -- SF's
// parcel data lives primarily on DataSF, a Socrata open-data portal
// (data.sfgov.org), not an ArcGIS REST service. Two candidates:
//   1. DataSF's "Parcels - Active and Retired" dataset (Socrata SODA
//      API, dataset id acdm-wktn) -- Socrata supports a .geojson output
//      format, which this app's 'geojson' connector type could
//      potentially use directly.
//   2. An ArcGIS Online item found via search
//      (hub.arcgis.com/datasets/84008d4afef24dc3baabb2e73528a263) --
//      resolving its real item metadata via the ArcGIS sharing API to
//      find the actual backing FeatureServer URL, if any.
//
// Deleted once San Francisco County is either added or documented as
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
      if (Array.isArray(body)) {
        console.log('Body is array, length:', body.length);
        if (body[0]) console.log('First item keys:', Object.keys(body[0]));
        if (body[0]) console.log('First item sample:', JSON.stringify(body[0]).slice(0, 800));
      } else {
        console.log('Body (JSON keys):', Object.keys(body));
        if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
        if (body.url) console.log('url field:', body.url);
        if (body.type) console.log('type field:', body.type);
        if (body.title) console.log('title field:', body.title);
        if (body.owner) console.log('owner field:', body.owner);
        if (body.fields) {
          console.log('Field count:', body.fields.length);
          console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
        }
        if (body.features) console.log('Feature count:', body.features.length);
      }
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
  'https://data.sfgov.org/resource/acdm-wktn.json?$limit=1',
  'DataSF Socrata SODA API - Parcels Active and Retired (sample record)'
);

await fetchText(
  'https://www.arcgis.com/sharing/rest/content/items/84008d4afef24dc3baabb2e73528a263?f=json',
  'ArcGIS Online item metadata (San Francisco Open Data Portal parcels)'
);

console.log('\nDone.');
