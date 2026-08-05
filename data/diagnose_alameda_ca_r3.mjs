// Temporary diagnostic, round 3: real sample record from Alameda
// County CA's official parcels service.
//
// Round 2 confirmed the layer is official: description reads
// "Alameda County Parcel Boundaries. Maintained by Alameda County
// Information Technology Department." 42 fields, but notably no
// owner-name field and no separate area/acreage field (California
// counties often strip owner PII from public GIS feeds) - values,
// site/mailing addresses, use code, and deed book/page are present.
//
// This round queries for a real record with a populated
// TotalNetValue to avoid a null/placeholder OBJECTID-1 record (the
// same pattern seen with Collin County TX and Manassas VA).
//
// Deleted once Alameda County CA is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const BASE = 'https://services5.arcgis.com/ROBnTHSNjoZ2Wm1P/arcgis/rest/services/Parcels/FeatureServer/0/query';

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
      if (typeof body.count === 'number') console.log('Count:', body.count);
      if (Array.isArray(body.features)) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features) {
          console.log('  Attributes:', JSON.stringify(f.attributes, null, 2));
        }
      }
    } else {
      console.log('Body (text, first 1000 chars):', text.slice(0, 1000));
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
  `${BASE}?where=1%3D1&returnCountOnly=true&f=json`,
  'Alameda Parcels - total record count'
);

await fetchJson(
  `${BASE}?where=TotalNetValue+%3E+100000+AND+SitusAddress+IS+NOT+NULL&outFields=*&resultRecordCount=1&f=json`,
  'Alameda Parcels - real sample record with populated value + situs address'
);

console.log('\nDone.');
