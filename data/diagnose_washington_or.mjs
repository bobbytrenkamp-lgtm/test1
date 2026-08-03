// Temporary diagnostic, round 1: Washington County OR (Hillsboro/
// Portland metro) parcel service.
//
// Discovered as a gap in the facility-count priority queue: 36
// facilities (more than Wake County NC's 28 or Cuyahoga County OH's
// 29, both already added), never previously investigated. Home to a
// major data center cluster (Hillsboro), adjacent to Multnomah County
// OR (already added via its own Taxlot_Parcels FeatureServer).
//
// This round checks Washington County's own open-data portal DCAT
// catalog for a "parcel"/"taxlot" dataset first (the pattern that has
// reliably surfaced the real ArcGIS distribution URL directly for Salt
// Lake, Multnomah, Philadelphia, Sacramento, Cuyahoga, and Wake), then
// falls back to a couple of directly-guessed common service names.
//
// Deleted once Washington County OR is either added or documented as
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

const dcat = await fetchText(
  'https://data-washingtoncountyor.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Washington County OR open-data portal DCAT catalog'
);

if (dcat.ok && dcat.body && Array.isArray(dcat.body.dataset)) {
  const matches = dcat.body.dataset.filter(d =>
    /parcel|taxlot/i.test(d.title || '') || /parcel|taxlot/i.test(d.description || '')
  );
  console.log(`\nDCAT datasets matching "parcel"/"taxlot": ${matches.length}`);
  for (const d of matches) {
    console.log(`\n--- ${d.title} ---`);
    console.log('description:', (d.description || '').slice(0, 300));
    const dist = (d.distribution || []).map(x => `${x.format}: ${x.accessURL || x.downloadURL}`);
    console.log('distribution:', dist.join(' | '));
  }
} else {
  console.log('\nDCAT catalog lookup failed or had no dataset array.');
}

await fetchText(
  'https://gis.co.washington.or.us/arcgis/rest/services/Public/Taxlots/MapServer/0?f=json',
  'Guess - Washington County ArcGIS Server Public/Taxlots MapServer layer 0'
);

await fetchText(
  'https://www.co.washington.or.us/arcgis/rest/services/Taxlots/MapServer/0?f=json',
  'Guess - Washington County ArcGIS Server Taxlots MapServer layer 0 (alt host)'
);

console.log('\nDone.');
