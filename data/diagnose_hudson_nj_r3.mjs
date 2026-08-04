// Temporary diagnostic, round 3: Hudson County NJ parcel service.
//
// Round 2 found that "NJ_Parcel_Boundaries_Simplified" is actually
// Hudson-County-specific (per its description/copyrightText), but only
// has 13 thin fields (PAMS_PIN, MUN, BLOCK, LOT, QCODE, LASTUPDATE,
// County, plus geology/geometry fields) - essentially just parcel_id.
//
// Round 2 also surfaced NJ's official statewide MOD-IV composite
// service ("Parcels and MOD-IV Composite of New Jersey", hosted
// directly by the state at maps.nj.gov), which is likely the same rich
// MOD-IV schema already confirmed for Middlesex County NJ this session
// (PAMS_PIN/OwnersName/PropLoc/PropClass/etc.), just statewide instead
// of pre-filtered to one county. Since the connector supports a static
// `where` clause (already used for NYC MAPPLUTO and a Washington County
// taxlots layer in this registry), a statewide service filtered to
// Hudson County via `where` could be usable if it has a county-name
// field.
//
// This round probes that statewide service's actual field list.
//
// Deleted once Hudson County NJ is either added or documented as
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
      if (body.description) console.log('description:', body.description.slice(0, 800));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (Array.isArray(body.layers)) {
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      }
      if (Array.isArray(body.features)) {
        console.log('Sample feature count:', body.features.length);
        if (body.features[0]) console.log('Sample attributes:', JSON.stringify(body.features[0].attributes));
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
  'https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0?f=json',
  'NJ statewide MOD-IV Composite (maps.nj.gov Framework/Cadastral/0) - fields'
);

await fetchJson(
  "https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0/query?where=COUNTY%3D'HUDSON'&outFields=*&resultRecordCount=1&f=json",
  'NJ statewide MOD-IV Composite - sample query WHERE COUNTY=HUDSON'
);

await fetchJson(
  "https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0/query?where=CNTY_NAME%3D'HUDSON'&outFields=*&resultRecordCount=1&f=json",
  'NJ statewide MOD-IV Composite - sample query WHERE CNTY_NAME=HUDSON'
);

await fetchJson(
  'https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/Parcels_Composite_NJ_WM/FeatureServer/0?f=json',
  'Parcels_Composite_NJ_WM (ArcGIS Online hosted copy) - fields'
);

console.log('\nDone.');
