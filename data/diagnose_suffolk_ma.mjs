// Temporary diagnostic, round 3: Suffolk County MA (Boston metro)
// parcel service.
//
// Round 1 guessed a FeatureServer name under the wrong ArcGIS org
// (Invalid URL). Round 2's alternate state-hosted proxy URL
// (gisprpxy.itd.state.ma.us) failed with a real DNS/connection error
// -- likely an internal-only host not reachable from outside the
// state network. This round checks MassGIS's own open-data portal DCAT
// catalog directly (gis.data.mass.gov, an ArcGIS Hub site) for the
// real "Level 3 Parcels" distribution URL, the same pattern that has
// reliably surfaced the right ArcGIS REST URL for every county this
// session with its own open-data portal.
//
// Deleted once Suffolk County MA is either added or documented as
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
      if (Array.isArray(body.dataset)) {
        const matches = body.dataset.filter(d =>
          /parcel/i.test(d.title || '') || /parcel/i.test(d.description || '')
        );
        console.log(`DCAT datasets matching "parcel": ${matches.length}`);
        for (const d of matches) {
          console.log(`\n--- ${d.title} ---`);
          console.log('description:', (d.description || '').slice(0, 300));
          const dist = (d.distribution || []).map(x => `${x.format}: ${x.accessURL || x.downloadURL}`);
          console.log('distribution:', dist.join(' | '));
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
  'https://gis.data.mass.gov/api/feed/dcat-us/1.1.json',
  'MassGIS Data Hub own DCAT catalog'
);

console.log('\nDone.');
