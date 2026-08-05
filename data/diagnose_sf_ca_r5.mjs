// Temporary diagnostic, round 5: San Francisco County CA - pull a real
// sample record from the confirmed-genuine "Active Parcels (from DataSF,
// pulled daily)" FeatureServer (vll_sfgis, mirrors DataSF's Socrata parcel
// dataset into ArcGIS daily; round 4 confirmed lastEditDate 2026-08-04,
// 39 real fields, no owner/value fields present anywhere - consistent
// with California law prohibiting SF's Assessor-Recorder from posting
// ownership info online).
//
// This round checks the FeatureServer's spatialReference (needed to know
// whether Shape__Area is usable as area_sqft or is in unusable geographic
// degrees) and pulls one real record filtered on a populated field to see
// actual values for mapblklot/blklot/zoning_code/zoning_district/etc.
//
// Deleted once San Francisco County CA is either added or re-documented
// as unavailable/deliberately excluded.

const TIMEOUT_MS = 25000;
const BASE = 'https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/Active_Parcels_from_DataSF_pulled_daily_/FeatureServer/0';

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
      if (body.spatialReference) console.log('spatialReference:', JSON.stringify(body.spatialReference));
      if (body.units) console.log('units:', body.units);
      if (Array.isArray(body.features)) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features) {
          console.log('  attributes:', JSON.stringify(f.attributes, null, 2));
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

// Layer root again, this time to read spatialReference/units.
await fetchJson(`${BASE}?f=json`, 'Layer 0 root (spatialReference/units)');

// One real sample record, filtered for a populated mapblklot.
await fetchJson(
  `${BASE}/query?where=mapblklot+IS+NOT+NULL&outFields=*&resultRecordCount=1&f=json`,
  'Sample record where mapblklot IS NOT NULL'
);

console.log('\nDone.');
