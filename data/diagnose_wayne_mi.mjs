// Temporary diagnostic, round 1: Wayne County MI (Detroit) parcel
// service.
//
// Next candidate in the facility-count priority queue after Tarrant
// County TX (23 facilities, tied with DC). Web search found two
// candidate open-data portals: the county Auditor's own GIS portal
// (auditor-waynecountygis.opendata.arcgis.com, under Assessment &
// Equalization / GIS Parcel Data) and a general county open-data site
// (data-wayne.opendata.arcgis.com).
//
// This round checks the Auditor's own DCAT catalog first (most likely
// to host the real parcel dataset given its department scope), then
// falls back to the general county open-data portal's DCAT catalog.
//
// Deleted once Wayne County MI is either added or documented as
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

async function checkDcat(url, label) {
  const dcat = await fetchText(url, label);
  if (dcat.ok && dcat.body && Array.isArray(dcat.body.dataset)) {
    const matches = dcat.body.dataset.filter(d =>
      /parcel/i.test(d.title || '') || /parcel/i.test(d.description || '')
    );
    console.log(`\nDCAT datasets matching "parcel": ${matches.length}`);
    for (const d of matches) {
      console.log(`\n--- ${d.title} ---`);
      console.log('description:', (d.description || '').slice(0, 300));
      const dist = (d.distribution || []).map(x => `${x.format}: ${x.accessURL || x.downloadURL}`);
      console.log('distribution:', dist.join(' | '));
    }
  } else {
    console.log('\nDCAT catalog lookup failed or had no dataset array.');
  }
}

await checkDcat(
  'https://auditor-waynecountygis.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Wayne County Auditor GIS own DCAT catalog'
);

await checkDcat(
  'https://data-wayne.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Wayne County general Open Data DCAT catalog'
);

console.log('\nDone.');
