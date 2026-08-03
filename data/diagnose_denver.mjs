// Temporary diagnostic: find a live parcel service for Denver County CO
// (#8 in the facility-count priority list, 62 facilities), the next
// county after Hennepin MN (blocked on a server-side error, see
// AI_TEAM_STATUS.md Open Handoffs).
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

// Candidate 1: Denver's own GIS ArcGIS Server (city-county open data)
await fetchText(
  'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_PARCEL_P/FeatureServer?f=json',
  'Denver open data - ODC_PARCEL_P FeatureServer root (guess)'
);
await fetchText(
  'https://gis.denvergov.org/arcgis/rest/services/OpenData/OpenData_Property/MapServer?f=json',
  'Denver GIS - OpenData_Property MapServer root (guess)'
);

// Candidate 2: ArcGIS Online catalog search, general + scoped to likely owners
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=Denver%20County%20parcels&f=json&num=10',
  'ArcGIS Online catalog search for Denver County parcels'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:DenverGov&f=json&num=10',
  'ArcGIS Online search scoped to DenverGov owner'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:CityofDenver&f=json&num=10',
  'ArcGIS Online search scoped to CityofDenver owner'
);

console.log('\nDone.');
