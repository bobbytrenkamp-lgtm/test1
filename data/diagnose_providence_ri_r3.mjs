// Temporary diagnostic, round 3: Providence County RI parcel service.
//
// Round 2 found rigis.org's own DCAT feed responds HTTP 200 (unlike
// Providence's own portal's 404), but the response didn't match the
// expected { dataset: [...] } DCAT-US 1.1 shape closely enough for
// round 2's generic printer to show anything useful. This round
// fetches the raw response and searches its full text for "parcel"
// mentions, plus checks a couple of direct RIGIS hub/ArcGIS URL
// patterns.
//
// Deleted once Providence County RI is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;

async function fetchRaw(url, label, searchTerm) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const elapsed = Date.now() - start;
    const status = res.status;
    const text = await res.text();
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`HTTP ${status} in ${elapsed}ms`);
    console.log(`Body length: ${text.length} chars`);
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (parsed) {
      console.log('Top-level keys:', Object.keys(parsed).join(', '));
      if (Array.isArray(parsed.dataset)) {
        console.log('dataset array length:', parsed.dataset.length);
      }
    }
    if (searchTerm) {
      const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
      console.log(`First "${searchTerm}" mention at index:`, idx);
      if (idx >= 0) {
        console.log('Context:', text.slice(Math.max(0, idx - 100), idx + 400));
      }
    }
    return { ok: true, status, text };
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

await fetchRaw(
  'https://www.rigis.org/api/feed/dcat-us/1.1.json',
  'RIGIS DCAT feed - raw body, searching for "parcel"',
  'parcel'
);

await fetchRaw(
  'https://www.rigis.org/api/3/action/package_search?q=parcels',
  'RIGIS CKAN package_search API - q=parcels (direct URL guess, RIGIS is CKAN-based per rigis.org)',
  null
);

console.log('\nDone.');
