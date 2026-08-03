// Temporary diagnostic, round 1: Philadelphia PA parcel service.
//
// Philadelphia is a consolidated city-county (Philadelphia County IS
// the City of Philadelphia). Web search found a very promising
// candidate: the City's Office of Property Assessment (OPA) publishes
// an "OPA PROPERTIES PUBLIC" dataset on the city's open data portal
// (data-phl.opendata.arcgis.com), explicitly described as containing
// property characteristics, ownership information, and the most
// recent assessment -- exactly the rich fields this registry wants.
// This round fetches the portal's own DCAT catalog to find the real
// FeatureServer distribution URL directly (the same successful pattern
// used for Salt Lake County UT and Multnomah County OR), rather than
// guessing an org ID.
//
// Deleted once Philadelphia is either added or documented as
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
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 400));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.dataset && Array.isArray(body.dataset)) {
        const hits = body.dataset.filter(d => /opa|propert|parcel/i.test(d.title || ''));
        console.log(`DCAT dataset count: ${body.dataset.length}, OPA/property/parcel matches: ${hits.length}`);
        for (const hit of hits.slice(0, 8)) {
          console.log('  DCAT match title:', hit.title);
          console.log('  DCAT match distribution:', JSON.stringify((hit.distribution || []).map(d => ({ format: d.format, url: d.accessURL || d.downloadURL }))));
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
  'https://data-phl.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  "Philadelphia's own open data portal - DCAT catalog"
);

console.log('\nDone.');
