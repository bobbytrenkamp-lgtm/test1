// Temporary diagnostic, round 3: retry Hennepin County MN's parcel
// candidate after a transient-looking outage.
//
// Round 1 found the Metropolitan Council (Metro GIS)'s "Metropolitan
// 7-County Parcel Polygons" dataset (covers the whole Twin Cities
// metro, including Hennepin), hosted at arcgis.metc.state.mn.us,
// owner "commons_etl_user". Round 2 confirmed this is the correct
// candidate but every endpoint returned HTTP 500 "Application Error"
// from the ArcGIS Web Adaptor itself - a server-side fault, not a 404
// or wrong-URL guess. That was 2026-08-03; two days have now passed,
// worth retrying in case it was transient. If still down, also try
// the MN Geospatial Commons dataset landing page for an updated/
// alternate resource link.
//
// Deleted once Hennepin County MN is either added or documented as
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
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (body.description) console.log('description:', body.description);
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

await fetchJson(
  'https://arcgis.metc.state.mn.us/data1/rest/services/parcels/Parcels/FeatureServer?f=json',
  'RETRY: Metropolitan 7-County Parcel Polygons (unversioned) FeatureServer root'
);
await fetchJson(
  'https://arcgis.metc.state.mn.us/data1/rest/services/parcels/Parcels/FeatureServer/0?f=json',
  'RETRY: Metropolitan 7-County Parcel Polygons (unversioned) layer 0 definition'
);
await fetchJson(
  'https://arcgis.metc.state.mn.us/data1/rest/services/parcels/Parcels_Aggregate/FeatureServer/0?f=json',
  'RETRY: Metropolitan 7-County Parcel Polygons - Aggregate layer 0 definition'
);

await fetchJson(
  'https://gisdata.mn.gov/api/3/action/package_show?id=us-mn-state-metc-plan-parcels-open',
  'MN Geospatial Commons CKAN API - parcels-open dataset metadata (for alternate resource links)'
);

console.log('\nDone.');
