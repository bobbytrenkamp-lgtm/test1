// Temporary diagnostic, round 4: Polk County IA (Des Moines) parcel
// service -- probing the richer companion tables found in round 3.
//
// Round 3 listed the full FeatureServer catalog: alongside the thin
// "Cadastral Parcels" boundary layer (id 1), the service also exposes
// four non-spatial tables likely joinable by parcel number: "Parcel"
// (2), "Situs Address" (3), "Value" (4), "Owners Mail" (5) -- a
// standard normalized CAMA schema. This round probes each table's
// real field schema directly.
//
// Deleted once Polk County is either added or documented as
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
      if (body.name) console.log('Name:', body.name);
      if (body.type) console.log('Type:', body.type);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 300));
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

const base = 'https://gis4.polkcountyiowa.gov/server/rest/services/Public/Polk_County_Parcels/FeatureServer';

await fetchText(`${base}/2?f=json`, 'Table 2: Parcel');
await fetchText(`${base}/3?f=json`, 'Table 3: Situs Address');
await fetchText(`${base}/4?f=json`, 'Table 4: Value');
await fetchText(`${base}/5?f=json`, 'Table 5: Owners Mail');

console.log('\nDone.');
