// Temporary diagnostic, round 1: Sacramento County CA parcel service.
//
// Web search found Sacramento County's own official open data portal
// (data-sacramentocounty.opendata.arcgis.com) hosting a "Parcels"
// dataset and an "Assessor Parcel Viewer" dataset. This round fetches
// the portal's own DCAT catalog to find the real FeatureServer
// distribution URL directly -- the same pattern that worked for Salt
// Lake County UT, Multnomah County OR, and Philadelphia PA.
//
// Deleted once Sacramento County is either added or documented as
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
      if (body.dataset && Array.isArray(body.dataset)) {
        const hits = body.dataset.filter(d => /\bparcel/i.test(d.title || ''));
        console.log(`DCAT dataset count: ${body.dataset.length}, "parcel" title matches: ${hits.length}`);
        for (const hit of hits) {
          console.log('  DCAT match title:', hit.title);
          console.log('  DCAT match distribution:', JSON.stringify((hit.distribution || []).map(d => ({ format: d.format, url: d.accessURL || d.downloadURL }))));
        }
      } else {
        console.log('Body (JSON keys):', Object.keys(body));
        if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
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
  'https://data-sacramentocounty.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  "Sacramento County's own open data portal - DCAT catalog, filtered for 'parcel'"
);

console.log('\nDone.');
