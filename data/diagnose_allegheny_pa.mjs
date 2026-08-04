// Temporary diagnostic, round 2: Allegheny County PA (Pittsburgh
// metro) parcel service.
//
// Round 1 confirmed via the county's own DCAT catalog that a real
// "Allegheny County Parcel Boundaries" dataset exists and points to
// PASDA. The direct guess at maps.pasda.psu.edu's AlleghenyCountyParcels
// MapServer/0 returned a real ArcGIS 500 "Service ... not started" -
// a cold/idle service state that sometimes resolves on retry (same
// pattern seen with Harris County TX earlier this session). The other
// candidate, mapservices.pasda.psu.edu's pasda/AlleghenyCounty
// MapServer, is live but round 1 didn't print its layers/tables
// arrays. This round retries the first and lists the second's full
// layer catalog to find the parcels layer.
//
// Deleted once Allegheny County PA is either added or documented as
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
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.layers) {
        console.log('layers:', body.layers.map(l => `[${l.id}] ${l.name} (${l.type || 'Layer'})`).join(' | '));
      }
      if (body.tables) {
        console.log('tables:', body.tables.map(t => `[${t.id}] ${t.name}`).join(' | '));
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

// Retry #1
await fetchText(
  'https://maps.pasda.psu.edu/server/rest/services/AlleghenyCountyParcels/MapServer/0?f=json',
  'PASDA - AlleghenyCountyParcels MapServer layer 0 (retry)'
);
// Retry #2 after a short pause, in case the service is spinning up
await new Promise(r => setTimeout(r, 4000));
await fetchText(
  'https://maps.pasda.psu.edu/server/rest/services/AlleghenyCountyParcels/MapServer/0?f=json',
  'PASDA - AlleghenyCountyParcels MapServer layer 0 (retry 2, after 4s)'
);

await fetchText(
  'https://mapservices.pasda.psu.edu/server/rest/services/pasda/AlleghenyCounty/MapServer?f=json',
  'PASDA - pasda/AlleghenyCounty MapServer root (full layer catalog)'
);

console.log('\nDone.');
