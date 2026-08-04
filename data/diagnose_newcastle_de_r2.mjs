// Temporary diagnostic, round 2: New Castle County DE (Wilmington
// metro) parcel service.
//
// Round 1 found the real candidate: "Delaware New Castle County
// Parcels", owned by FirstMap@De (Delaware's official FirstMap GIS
// program account), hosted directly on the county's own domain
// (gis.nccde.org):
//   https://gis.nccde.org/agsserver/rest/services/BaseMaps/Base_Layers/MapServer/0
// Confirmed independently by two other third-party items referencing
// layer 0 of the same service as "Parcels" - one owned by
// Sharon.Ungerer_DNREC (Delaware's Dept of Natural Resources and
// Environmental Control, a real state agency).
//
// This round fetches the service's field schema and a real populated
// sample record to confirm coverage and prepare a field mapping.
//
// Deleted once New Castle County DE is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const LAYER = 'https://gis.nccde.org/agsserver/rest/services/BaseMaps/Base_Layers/MapServer/0';

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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 800));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (Array.isArray(body.features)) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features.slice(0, 3)) {
          console.log('  attrs:', JSON.stringify(f.attributes));
        }
      }
      if (typeof body.count === 'number') console.log('Count:', body.count);
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

// 1. Layer schema.
await fetchJson(`${LAYER}?f=json`, 'New Castle County Parcels - layer schema');

// 2. Total record count.
await fetchJson(`${LAYER}/query?where=1=1&returnCountOnly=true&f=json`, 'New Castle County Parcels - total record count');

// 3. Real, populated sample records.
await fetchJson(
  `${LAYER}/query?where=1=1&outFields=*&returnGeometry=false&resultRecordCount=3&f=json`,
  'New Castle County Parcels - sample records'
);

console.log('\nDone.');
