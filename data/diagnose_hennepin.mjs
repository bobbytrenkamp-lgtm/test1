// Temporary diagnostic: find a live parcel service for Hennepin County MN
// (#7 in the facility-count priority list, 63 facilities), the next
// county after Los Angeles CA.
// Deleted once this is either added to the registry or documented as
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
      if (body.layers) console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      if (Array.isArray(body.results)) {
        console.log(`total: ${body.total}`);
        for (const r of body.results.slice(0, 10)) {
          console.log(`- id=${r.id} title="${r.title}" type="${r.type}" owner="${r.owner}" url="${r.url}"`);
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

// Candidate 1: Hennepin County's own GIS Open Data ArcGIS Server
await fetchText(
  'https://gis.hennepin.us/arcgis/rest/services/Public/Parcels/MapServer?f=json',
  'Hennepin County GIS - Public/Parcels MapServer root (guess)'
);
await fetchText(
  'https://gis.hennepin.us/arcgis/rest/services/Public/Parcels/MapServer/0?f=json',
  'Hennepin County GIS - Public/Parcels layer 0 definition (guess)'
);

// Candidate 2: Metro GIS / Metropolitan Council regional parcel dataset
// (Minnesota's 7-county Twin Cities metro often publishes a shared
// regional parcel layer via the Metropolitan Council)
await fetchText(
  'https://gis.metc.state.mn.us/arcgis/rest/services/Parcels/Parcels_2024/FeatureServer?f=json',
  'Metropolitan Council regional parcels FeatureServer (guess)'
);

// Candidate 3: ArcGIS Online catalog search, general + scoped to likely owners
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=Hennepin%20County%20parcels&f=json&num=10',
  'ArcGIS Online catalog search for Hennepin County parcels'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:HennepinCounty&f=json&num=10',
  'ArcGIS Online search scoped to HennepinCounty owner'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:Hennepin_GIO&f=json&num=10',
  'ArcGIS Online search scoped to Hennepin_GIO owner'
);

console.log('\nDone.');
