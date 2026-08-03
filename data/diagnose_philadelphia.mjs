// Temporary diagnostic, round 2: Philadelphia PA parcel service.
//
// Round 1's DCAT catalog fetch worked (848 datasets, 47 loose property/
// parcel/opa title matches) but the broad regex match returned mostly
// unrelated datasets (KOZ parcels, PWD test parcels, L&I property
// history, etc.) within its first-8 print limit -- the specific "OPA
// PROPERTIES PUBLIC" dataset wasn't among them. This round searches
// specifically for "opa" in the dataset title with no result-count
// limit, to find the real FeatureServer URL for the Office of Property
// Assessment's public properties dataset directly.
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
      if (body.dataset && Array.isArray(body.dataset)) {
        const hits = body.dataset.filter(d => /\bopa\b/i.test(d.title || ''));
        console.log(`DCAT dataset count: ${body.dataset.length}, "opa" title matches: ${hits.length}`);
        for (const hit of hits) {
          console.log('  DCAT match title:', hit.title);
          console.log('  DCAT match description:', (hit.description || '').slice(0, 200));
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
  "Philadelphia's own open data portal - DCAT catalog, filtered for 'opa'"
);

console.log('\nDone.');
