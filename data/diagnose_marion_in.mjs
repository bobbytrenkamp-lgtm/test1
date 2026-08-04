// Temporary diagnostic, round 1: Marion County IN (Indianapolis)
// parcel service.
//
// Next candidate in the facility-count priority queue after Allegheny
// County PA (24 facilities). Indianapolis and Marion County have a
// consolidated city-county government ("Unigov"); web search found
// the "Open Indy Data Portal" (data-indygis.opendata.arcgis.com), an
// ArcGIS Hub site with a "Parcels" dataset (IndyGIS::parcels,
// ~348,321 records) directly in its own gallery listing.
//
// This round checks the portal's own DCAT catalog for a "parcel"
// dataset distribution URL first (the pattern that has reliably
// surfaced the real ArcGIS distribution URL directly for most
// counties this session).
//
// Deleted once Marion County IN is either added or documented as
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

const dcat = await fetchText(
  'https://data-indygis.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Open Indy Data Portal own DCAT catalog'
);

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

console.log('\nDone.');
