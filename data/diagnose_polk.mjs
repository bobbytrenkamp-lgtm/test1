// Temporary diagnostic, round 1: Polk County IA (Des Moines) parcel
// service.
//
// Next candidate in the facility-count priority queue after Wake
// County NC (28 facilities). This round checks Polk County's own
// open-data portal DCAT catalog for a "parcel" dataset first (the
// pattern that has reliably surfaced the real ArcGIS distribution URL
// directly for Salt Lake, Multnomah, Philadelphia, Sacramento,
// Cuyahoga, and Wake), then falls back to a couple of directly-guessed
// common service names if the catalog lookup doesn't turn up a usable
// URL.
//
// Deleted once Polk County is either added or documented as
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

// Round 1a: Polk County's own open-data portal DCAT catalog.
const dcat = await fetchText(
  'https://data.polkcountyiowa.gov/api/feed/dcat-us/1.1.json',
  'Polk County open-data portal DCAT catalog (guess 1: data.polkcountyiowa.gov)'
);

const dcat2 = await fetchText(
  'https://gis-polkcountyiowa.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Polk County open-data portal DCAT catalog (guess 2: gis-polkcountyiowa.opendata.arcgis.com)'
);

for (const [label, result] of [['guess 1', dcat], ['guess 2', dcat2]]) {
  if (result.ok && result.body && Array.isArray(result.body.dataset)) {
    const matches = result.body.dataset.filter(d =>
      /parcel/i.test(d.title || '') || /parcel/i.test(d.description || '')
    );
    console.log(`\n${label} DCAT datasets matching "parcel": ${matches.length}`);
    for (const d of matches) {
      console.log(`\n--- ${d.title} ---`);
      console.log('description:', (d.description || '').slice(0, 300));
      const dist = (d.distribution || []).map(x => `${x.format}: ${x.accessURL || x.downloadURL}`);
      console.log('distribution:', dist.join(' | '));
    }
  }
}

// Round 1b: direct-guess fallbacks in case the catalog lookups above
// don't surface a usable URL.
await fetchText(
  'https://gis.polkcountyiowa.gov/arcgis/rest/services/Assessor/Parcels/MapServer/0?f=json',
  'Guess - Polk County ArcGIS Server Assessor/Parcels MapServer layer 0'
);

await fetchText(
  'https://maps.polkcountyiowa.gov/arcgis/rest/services/Parcels/MapServer/0?f=json',
  'Guess - Polk County ArcGIS Server Parcels MapServer layer 0'
);

console.log('\nDone.');
