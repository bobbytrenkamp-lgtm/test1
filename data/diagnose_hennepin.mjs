// Temporary diagnostic, round 2: Hennepin County MN parcel service.
//
// Round 1's direct URL guesses (gis.hennepin.us, gis.metc.state.mn.us)
// both 404'd, but an ArcGIS Online catalog search found the real thing:
// the Metropolitan Council (Metro GIS) publishes a "Metropolitan 7-County
// Parcel Polygons" dataset covering the whole Twin Cities metro
// (including Hennepin), hosted at arcgis.metc.state.mn.us, owner
// "commons_etl_user". This fetches the two most promising candidates'
// real schemas: the unversioned/latest layer and the "Aggregate" layer.
//
// Deleted once Hennepin is either added or documented as unavailable.

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
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (body.description) console.log('description:', body.description);
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

await fetchText(
  'https://arcgis.metc.state.mn.us/data1/rest/services/parcels/Parcels/FeatureServer?f=json',
  'Metropolitan 7-County Parcel Polygons (unversioned) FeatureServer root'
);
await fetchText(
  'https://arcgis.metc.state.mn.us/data1/rest/services/parcels/Parcels/FeatureServer/0?f=json',
  'Metropolitan 7-County Parcel Polygons (unversioned) layer 0 definition'
);
await fetchText(
  'https://arcgis.metc.state.mn.us/data1/rest/services/parcels/Parcels_Aggregate/FeatureServer/0?f=json',
  'Metropolitan 7-County Parcel Polygons - Aggregate layer 0 definition'
);

// Terms of use / licensing for the Metropolitan Council's open data.
await fetchText(
  'https://gisdata.mn.gov/dataset/us-mn-state-metc-plan-parcels-open',
  'MN Geospatial Commons dataset page for the parcels-open dataset'
);

console.log('\nDone.');
