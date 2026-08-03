// Temporary diagnostic, round 1: Wake County NC (Raleigh) parcel service.
//
// Next candidate in the facility-count priority queue after Cuyahoga
// County OH (29 facilities). Wake County runs its own open-data portal
// (maps.wake.gov / Wake County GIS). This round checks that portal's
// own DCAT catalog for a "parcel" dataset first (the pattern that has
// reliably surfaced the real ArcGIS distribution URL directly for Salt
// Lake, Multnomah, Philadelphia, Sacramento, and Cuyahoga), then falls
// back to a couple of directly-guessed common service names if the
// catalog lookup doesn't turn up a usable URL.
//
// Deleted once Wake County is either added or documented as
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
      console.log('Body (text, first 800 chars):', text.slice(0, 800));
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

// Round 1a: Wake County's own open-data portal DCAT catalog.
const dcat = await fetchText(
  'https://data-wake.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Wake County open-data portal DCAT catalog'
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

// Round 1b: a couple of common direct-guess fallbacks in case the
// catalog lookup above doesn't surface a usable URL.
await fetchText(
  'https://maps.wake.gov/arcgis/rest/services/Property/Parcels/MapServer/0?f=json',
  'Guess - Wake County ArcGIS Server Property/Parcels MapServer layer 0'
);

await fetchText(
  'https://services1.arcgis.com/YuT7fDpMvV8SXsuh/arcgis/rest/services/Parcels/FeatureServer/0?f=json',
  'Guess - Wake County hosted FeatureServer (org id unconfirmed)'
);

console.log('\nDone.');
