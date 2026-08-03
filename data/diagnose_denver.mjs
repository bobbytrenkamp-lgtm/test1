// Temporary diagnostic, round 2: Denver County CO parcel service.
//
// Round 1's direct URL guesses both failed (invalid service ID / fetch
// failed), and a general keyword search returned mostly noise: Aurora CO
// (a different city, not Denver), Esri training sample data, and a
// third-party aggregator. But it surfaced a real signal: the owner
// "210919_geospatialDenver" on a Denver-published dataset (Middle
// Housing Stock) — likely Denver's actual ArcGIS Online org account.
// This searches scoped to that owner for parcels, plus Denver's open
// data portal directly.
//
// Deleted once Denver is either added or documented as unavailable.

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
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (Array.isArray(body.results)) {
        console.log(`total: ${body.total}`);
        for (const r of body.results.slice(0, 10)) {
          console.log(`- id=${r.id} title="${r.title}" type="${r.type}" owner="${r.owner}" url="${r.url}"`);
        }
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
  'https://www.arcgis.com/sharing/rest/search?q=parcel%20AND%20owner:210919_geospatialDenver&f=json&num=10',
  'ArcGIS Online search scoped to 210919_geospatialDenver owner (parcel)'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=owner:210919_geospatialDenver&f=json&num=20',
  'ArcGIS Online search scoped to 210919_geospatialDenver owner (all content)'
);

console.log('\nDone.');
