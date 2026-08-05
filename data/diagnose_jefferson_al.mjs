// Temporary diagnostic: round 6's sample record for Jefferson County AL
// (jccgis.jccal.org's Parcels service) came back with every field null
// except GIS_ACRES and the Shape metrics -- OBJECTID=1 was apparently
// an unrepresentative sparse/edge-case record. This queries for a
// record with a real, non-null OWNERNAME instead, to get genuine
// values for disambiguating PID vs PARCELID vs ParcelNo and whether
// ADDR_PSPR/ADDR_APR are populated composite address strings.
//
// Deleted once resolved.

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
      if (body.features) {
        console.log(`Feature count: ${body.features.length}`);
        for (const f of body.features) {
          console.log('Record:', JSON.stringify(f.attributes, null, 1));
        }
      } else {
        console.log('Body (truncated 1500):', JSON.stringify(body).slice(0, 1500));
      }
    } else {
      console.log('Body (text, first 400 chars):', text.slice(0, 400));
    }
    return { ok: res.ok && !body?.error, status, body, text };
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
  "https://jccgis.jccal.org/server/rest/services/Basemap/Parcels/MapServer/0/query?where=OWNERNAME+IS+NOT+NULL&outFields=*&returnGeometry=false&resultRecordCount=3&f=json",
  'Jefferson County AL Parcels: 3 records with non-null OWNERNAME'
);
