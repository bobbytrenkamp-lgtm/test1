// Temporary diagnostic, round 1: Multnomah County OR (Portland) parcel
// service.
//
// Web search found Multnomah County's own open data portal
// (gis-multco.opendata.arcgis.com) hosts a "Taxlot Parcels" dataset
// sourced from the county's Department of Assessment, Recording and
// Taxation, and repeatedly surfaced a specific candidate FeatureServer
// URL (services3.arcgis.com/tNPgIZWOB0Efvm0g/.../Tax_Lots/FeatureServer)
// across multiple searches. This round confirms that candidate's real
// field schema directly, and also fetches the open data portal's own
// DCAT catalog as a fallback source of the canonical dataset URL in
// case the guessed org/service name is wrong.
//
// Deleted once Multnomah County is either added or documented as
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
      if (body.folders) console.log('Folders:', body.folders.join(', '));
      if (body.services) console.log('Services:', body.services.map(s => `${s.name} (${s.type})`).join(', '));
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 400));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.dataset && Array.isArray(body.dataset)) {
        const hit = body.dataset.find(d => /taxlot|parcel/i.test(d.title || ''));
        if (hit) {
          console.log('DCAT match title:', hit.title);
          console.log('DCAT match distribution:', JSON.stringify((hit.distribution || []).map(d => ({ format: d.format, url: d.accessURL || d.downloadURL }))));
        } else {
          console.log('DCAT dataset count:', body.dataset.length, '(no taxlot/parcel title match)');
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

await fetchText(
  'https://services3.arcgis.com/tNPgIZWOB0Efvm0g/ArcGIS/rest/services/Tax_Lots/FeatureServer/0?f=json',
  'Candidate - Tax_Lots FeatureServer layer 0'
);

await fetchText(
  'https://gis-multco.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  "Multnomah County's own open data portal - DCAT catalog"
);

console.log('\nDone.');
