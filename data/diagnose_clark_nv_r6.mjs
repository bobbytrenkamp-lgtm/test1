// Temporary diagnostic, round 6: Clark County NV - check the last
// untested candidate schema, and pull a real sample record from the
// best candidate found so far.
//
// Round 5 found Assessor/ParcelHistory sub-layer 3 "ParcelPoly" (16
// fields: APN, LOC_STRDIR/STRNO/STRNAME/STRTYPE/STRUNIT/CITY, Shape,
// ESRI_OID, OWNER, OWNER2, DOCNO, LEGAL_DESCR1/2/3, COMMENTS) is a
// superset of the same-named layer under Assessor/CommonArea (11
// fields) - confirming it's the canonical Assessor parcel table. But
// its situs address is split across 6 components and legal
// description across 3 lines, with no combined field for either, so
// under this session's no-concatenation discipline only APN
// (parcel_id) and OWNER (owner) are real mappable canonical fields.
//
// This round: (a) checks the still-untested Assessor/Layers sub-layer
// 1 "Parcels" schema in case it's richer, and (b) pulls a real sample
// record from ParcelHistory's ParcelPoly with a populated OWNER to
// confirm real, sensible data before deciding whether to add it.
//
// Deleted once Clark County NV is either added or re-documented as
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
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (typeof body.count === 'number') console.log('Count:', body.count);
      if (Array.isArray(body.features)) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features) {
          console.log('  Attributes:', JSON.stringify(f.attributes, null, 2));
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

await fetchJson(
  'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/Layers/MapServer/1?f=json',
  'Assessor/Layers sub-layer 1 "Parcels" schema'
);

const BASE = 'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/ParcelHistory/MapServer/3/query';
await fetchJson(
  `${BASE}?where=OWNER+IS+NOT+NULL+AND+OWNER%3C%3E%27%27&outFields=*&resultRecordCount=1&f=json`,
  'ParcelHistory ParcelPoly - real sample record with populated OWNER'
);

console.log('\nDone.');
