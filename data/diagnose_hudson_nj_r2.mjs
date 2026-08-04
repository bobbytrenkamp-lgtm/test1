// Temporary diagnostic, round 2: Hudson County NJ parcel service.
//
// Round 1 found no live county-hosted feature service for Hudson County
// specifically (its DCAT feed is dead, and NJGIN's own Hudson County
// parcel distribution is a shapefile/fgdb .zip download, not a REST
// service). It did find a statewide "NJ_Parcel_Boundaries_Simplified"
// FeatureServer on ArcGIS Online. This round probes that service's
// fields directly (to check if it's usable despite being "simplified"),
// and searches ArcGIS Online more broadly for a full-attribute
// NJGIN/NJOGIS statewide parcels service, since Middlesex County NJ's
// own service was much richer than what a "simplified" statewide layer
// would likely offer.
//
// Deleted once Hudson County NJ is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;

async function fetchJson(url, label) {
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
      if (Array.isArray(body.results)) {
        console.log('ArcGIS Online results:', body.results.length);
        for (const r of body.results.slice(0, 10)) {
          console.log('  -', r.title, '|', r.type, '|', r.url || '(no url)');
        }
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (Array.isArray(body.layers)) {
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
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

await fetchJson(
  'https://services8.arcgis.com/gaqmegz7qPj113v0/arcgis/rest/services/NJ_Parcel_Boundaries_Simplified/FeatureServer?f=json',
  'NJ_Parcel_Boundaries_Simplified - FeatureServer root'
);

await fetchJson(
  'https://services8.arcgis.com/gaqmegz7qPj113v0/arcgis/rest/services/NJ_Parcel_Boundaries_Simplified/FeatureServer/0?f=json',
  'NJ_Parcel_Boundaries_Simplified - layer 0 fields'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=NJGIN%20parcels%20MOD-IV&f=json',
  'ArcGIS Online item search - NJGIN parcels MOD-IV'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22New%20Jersey%20Parcels%22&f=json',
  'ArcGIS Online item search - title New Jersey Parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:NJOGIS&f=json',
  'ArcGIS Online item search - owner NJOGIS'
);

console.log('\nDone.');
