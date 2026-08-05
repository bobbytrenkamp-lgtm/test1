// Temporary diagnostic, round 3: real sample record from Manassas
// city VA's official parcels service.
//
// Round 2 confirmed the winning candidate: manassas_gis's
// "Manassas_Parcels" (description "City of Manassas Taxable
// Parcels", copyrightText "City of Manassas") - public, no token
// required, 26 fields. The other round-1 candidate
// (wharcgisdeveloper's manassas_city_va_parcels) requires an auth
// token ("499 Token Required") and is not usable.
//
// This round queries for a real record with a populated OWNER_NAME
// to avoid a null/placeholder OBJECTID-1 record (the same pattern
// seen with Collin County TX).
//
// Deleted once Manassas city VA is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const BASE = 'https://services1.arcgis.com/3wpOgOChiWXPeFWB/arcgis/rest/services/Manassas_Parcels/FeatureServer/0/query';

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
  'Manassas_Parcels - total record count'
);

await fetchJson(
  `${BASE}?where=OWNER_NAME+IS+NOT+NULL+AND+OWNER_NAME%3C%3E%27%27+AND+TOTAL_ASSESSED_VALUE%3E100000&outFields=*&resultRecordCount=1&f=json`,
  'Manassas_Parcels - real sample record with populated owner + assessed value'
);

console.log('\nDone.');
