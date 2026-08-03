// Temporary diagnostic: find a live parcel service for New York County NY
// (Manhattan, FIPS 36061), #10 in the facility-count priority list not
// yet handled (52 facilities) -- Cook County IL, Santa Clara CA,
// Hennepin MN, and Denver CO are already documented/blocked.
// NYC's well-known parcel dataset is "MapPLUTO", published by the NYC
// Department of City Planning.
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

// Candidate 1: NYC DCP's own GIS ArcGIS server
await fetchText(
  'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer?f=json',
  'NYC DCP - MAPPLUTO FeatureServer root (guess)'
);
await fetchText(
  'https://maps.nyc.gov/arcgis/rest/services/DCP/mappluto/MapServer?f=json',
  'NYC maps.nyc.gov - DCP/mappluto MapServer root (guess)'
);

// Candidate 2: ArcGIS Online catalog search, general + scoped to likely owners
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=MapPLUTO&f=json&num=10',
  'ArcGIS Online catalog search for MapPLUTO'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:NYC_DCP&f=json&num=10',
  'ArcGIS Online search scoped to NYC_DCP owner'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:NYCDCP&f=json&num=10',
  'ArcGIS Online search scoped to NYCDCP owner'
);

console.log('\nDone.');
