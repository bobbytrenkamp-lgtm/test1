// Temporary diagnostic, round 2: Polk County IA (Des Moines) parcel
// service.
//
// Round 1's DCAT-catalog and direct-guess attempts all failed (wrong
// domains: data.polkcountyiowa.gov and gis.polkcountyiowa.gov don't
// resolve; gis-polkcountyiowa.opendata.arcgis.com and
// maps.polkcountyiowa.gov both real 404s). A web search found the
// real host: gis4.polkcountyiowa.gov, serving a "Polk_County_Parcels"
// FeatureServer/MapServer with a "Cadastral Parcels" layer (id 1),
// Polygon geometry, maintained by the county's own GIS webmaster
// (giswebmaster@polkcountyiowa.gov per county GIS support contact).
// This round probes that confirmed URL directly to get its real field
// schema, description, and copyrightText.
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
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
    } else {
      console.log('Body (text, first 800 chars):', text.slice(0, 800));
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

await fetchText(
  'https://gis4.polkcountyiowa.gov/server/rest/services/Public/Polk_County_Parcels/FeatureServer/1?f=json',
  'Confirmed real - Polk_County_Parcels FeatureServer layer 1 (Cadastral Parcels)'
);

console.log('\nDone.');
