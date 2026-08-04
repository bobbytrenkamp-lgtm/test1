// Temporary diagnostic, round 3: District of Columbia parcel service.
//
// Round 2's full layer catalog on the Property_and_Land_WebMercator
// FeatureServer confirmed two real Polygon parcel-geometry layers:
// [33] "Parcel Lots" and [39] "Tax Lots". Round 2's targeted DCAT
// keyword search also surfaced likely CAMA/assessment layers on the
// same service ([25] Computer Assisted Mass Appraisal - Residential,
// [57] Tax System Property Sales CAMA) and a standalone "Integrated
// Tax System Public Extract" ArcGIS Online service (a different org,
// services.arcgis.com/neT9SoYxizqTHZPH) that may carry owner/
// assessment data joined to geometry. This round probes all of them
// directly for field schema and geometry type.
//
// Deleted once DC is either added or documented as unavailable.

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
      if (body.description) console.log('description:', body.description.slice(0, 500));
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
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer/33?f=json',
  'Property_and_Land_WebMercator layer 33 - Parcel Lots'
);

await fetchJson(
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer/39?f=json',
  'Property_and_Land_WebMercator layer 39 - Tax Lots'
);

await fetchJson(
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer/25?f=json',
  'Property_and_Land_WebMercator layer 25 - CAMA Residential'
);

await fetchJson(
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer/57?f=json',
  'Property_and_Land_WebMercator layer 57 - Tax System Property Sales CAMA'
);

await fetchJson(
  'https://services.arcgis.com/neT9SoYxizqTHZPH/arcgis/rest/services/OCFO_ITSPE_view_05212026/FeatureServer/53?f=json',
  'OCFO Integrated Tax System Public Extract'
);

console.log('\nDone.');
