// Temporary diagnostic, round 1: Hillsborough County FL (Tampa metro)
// parcel service.
//
// Next candidate in the facility-count priority queue after Suffolk
// County MA (27 facilities, tied with Polk County IA and Suffolk
// County MA, both already added). Web search found the county's own
// GeoHub ArcGIS Hub portal (Hillsborough County GeoHub) and the
// Hillsborough County Property Appraiser's own GIS site (gis.hcpafl.org).
// This round checks the GeoHub's own DCAT catalog for a "parcel"
// dataset first (the pattern that has reliably surfaced the real
// ArcGIS distribution URL directly for most counties this session),
// then falls back to a couple of directly-guessed common service names
// on the Property Appraiser's own host.
//
// Deleted once Hillsborough County FL is either added or documented as
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
  'https://gis2017-01-10t133755357z-hillsborough.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Hillsborough County GeoHub own DCAT catalog'
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

await fetchText(
  'https://gis.hcpafl.org/arcgis/rest/services/OpenData/Parcels/MapServer/0?f=json',
  'Guess - Hillsborough County Property Appraiser ArcGIS Server OpenData/Parcels MapServer layer 0'
);

console.log('\nDone.');
