// Temporary diagnostic, round 2: Alameda County CA parcel service
// field schema.
//
// Round 1 found a decisive candidate: Alameda County's own official
// open-data DCAT catalog (data.acgov.org) directly lists a "Parcels"
// dataset backed by:
//   https://services5.arcgis.com/ROBnTHSNjoZ2Wm1P/arcgis/rest/services/Parcels/FeatureServer/0
// The same URL/org (ROBnTHSNjoZ2Wm1P) was independently confirmed via
// ArcGIS Online item search under two account names
// (watersheds_ACCWP and thayes_cofgis - "cofgis" reads as "County of
// [Alameda] GIS"), and the same org also hosts a multi-year series of
// "Assessor Office Deleted Parcel List" datasets, confirming an
// active County Assessor's Office presence.
//
// This round probes the FeatureServer root + layer 0 schema (fields,
// description, copyrightText).
//
// Deleted once Alameda County CA is either added or documented as
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
      if (Array.isArray(body.layers)) {
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (typeof body.description === 'string') console.log('description:', body.description.slice(0, 500));
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

await fetchJson(
  'https://services5.arcgis.com/ROBnTHSNjoZ2Wm1P/arcgis/rest/services/Parcels/FeatureServer?f=json',
  'Alameda County CA - Parcels - FeatureServer root'
);

await fetchJson(
  'https://services5.arcgis.com/ROBnTHSNjoZ2Wm1P/arcgis/rest/services/Parcels/FeatureServer/0?f=json',
  'Alameda County CA - Parcels - layer 0 schema'
);

console.log('\nDone.');
