// Temporary diagnostic, round 2: Hamilton County OH (Cincinnati metro)
// parcel service.
//
// Round 1's CAGIS Open Data Hub DCAT catalog returned HTTP 403 "Feeds
// have been disabled for this site" - the DCAT-catalog-first pattern
// that has worked for most counties this session doesn't apply here.
// Falls back to ArcGIS Online's public, unauthenticated item-search
// REST API to find the "Hamilton County Parcel Polygons" item's real
// service URL directly, plus a couple of directly-guessed common
// service names on CAGIS's own ArcGIS Server as a second fallback.
//
// Deleted once Hamilton County OH is either added or documented as
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
      if (body.results) {
        console.log('Result count:', body.results.length);
        for (const r of body.results.slice(0, 10)) {
          console.log(`  - "${r.title}" type=${r.type} url=${r.url} owner=${r.owner}`);
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

await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=' + encodeURIComponent('title:"Hamilton County Parcel Polygons"') + '&f=json',
  'ArcGIS Online public search - Hamilton County Parcel Polygons'
);

await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=' + encodeURIComponent('Hamilton County parcel Cincinnati CAGIS') + '&f=json&num=10',
  'ArcGIS Online public search - broader Hamilton/CAGIS parcel query'
);

console.log('\nDone.');
