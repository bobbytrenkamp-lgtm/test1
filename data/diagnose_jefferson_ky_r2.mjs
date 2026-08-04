// Temporary diagnostic, round 2: Jefferson County KY (Louisville) parcel
// service.
//
// Round 1's ArcGIS Online item search directly surfaced "Jefferson
// County KY Parcels" pointing at gis.lojic.org's LojicSolutions/
// OpenDataPVA MapServer, layer 1. "PVA" (Property Valuation
// Administrator) is Kentucky's standard county-assessor terminology,
// and "LojicSolutions" matches LOJIC (Louisville/Jefferson County
// Information Consortium) confirmed in round 1's DCAT results — a
// genuine match, not a same-named false positive. This round probes
// it directly for field schema.
//
// Deleted once Jefferson County KY is either added or documented as
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
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 600));
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
  'https://gis.lojic.org/maps/rest/services/LojicSolutions/OpenDataPVA/MapServer/1?f=json',
  'Jefferson County KY Parcels - OpenDataPVA MapServer layer 1'
);

console.log('\nDone.');
