// Temporary diagnostic, round 3: Hamilton County OH (Cincinnati metro)
// parcel service.
//
// Round 2's ArcGIS Online public search found several real candidates.
// The most promising is "Hamilton County Parcel Polygons", owned by
// the "CagisCoreLayers" AGOL account (CAGIS's own official core-layers
// publishing account) and hosted on CAGIS's own ArcGIS Server
// (cagisonline.hamilton-co.org) - not a third-party mirror. A second
// official candidate, "Hamilton County Parcels - Open Data" (owner
// cagisopendata, also an official CAGIS account), is layer 0 of the
// Open_Data_Feature_Collection service. This round probes both
// directly for field schema/geometryType/description/copyrightText.
//
// Deleted once Hamilton County OH is either added or documented as
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
      if (body.extent) console.log('extent:', JSON.stringify(body.extent));
      if (body.description) console.log('description:', body.description.slice(0, 800));
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
  'https://cagisonline.hamilton-co.org/arcgis/rest/services/HCE/Cadastral/MapServer/0?f=json',
  'CAGIS own ArcGIS Server - HCE/Cadastral layer 0 (Hamilton County Parcel Polygons, owner CagisCoreLayers)'
);

await fetchText(
  'https://services.arcgis.com/JyZag7oO4NteHGiq/arcgis/rest/services/Open_Data_Feature_Collection/FeatureServer/0?f=json',
  'CAGIS Open Data Hub AGOL - Open_Data_Feature_Collection layer 0 (Hamilton County Parcels - Open Data, owner cagisopendata)'
);

console.log('\nDone.');
