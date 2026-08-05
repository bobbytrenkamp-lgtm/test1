// Temporary diagnostic, round 4: real Hennepin-specific sample record
// from the Metropolitan Council's regional parcels service.
//
// Round 3 confirmed the outage from 2026-08-03 was transient - both
// candidate layers are now live. The unversioned "Parcels" layer
// turned out to be scoped to Anoka County only (its own metadata says
// "Layer name: Anoka County Parcels"), so it is NOT the right layer
// for Hennepin. The real candidate is "Parcels_Aggregate" ("Layer
// name: Metropolitan 7-County Parcels"), which covers all 7 Twin
// Cities metro counties (Hennepin, Ramsey, Dakota, Anoka, Washington,
// Carver, Scott) and has a CO_NAME field for filtering to one county.
// 95-field schema confirmed.
//
// This round queries specifically for CO_NAME = 'Hennepin' with a
// populated owner name to confirm real, sensible values and rule out
// a null/placeholder record.
//
// Deleted once Hennepin County MN is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const BASE = 'https://arcgis.metc.state.mn.us/data1/rest/services/parcels/Parcels_Aggregate/FeatureServer/0/query';

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
  `${BASE}?where=CO_NAME%3D%27Hennepin%27&returnCountOnly=true&f=json`,
  'Parcels_Aggregate - Hennepin County record count'
);

await fetchJson(
  `${BASE}?where=CO_NAME%3D%27Hennepin%27+AND+OWNER_NAME+IS+NOT+NULL+AND+EMV_TOTAL+%3E+100000&outFields=*&resultRecordCount=1&f=json`,
  'Parcels_Aggregate - real Hennepin sample record with populated owner + value'
);

console.log('\nDone.');
