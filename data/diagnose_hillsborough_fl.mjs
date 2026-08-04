// Temporary diagnostic, round 2: Hillsborough County FL (Tampa metro)
// parcel service.
//
// Round 1 found the county's own GeoHub DCAT catalog exposes only
// Cities/Zoning/Map-viewer layers (no direct parcel FeatureServer), and
// a direct guess at gis.hcpafl.org/arcgis/rest/services/OpenData/Parcels
// 500'd ("Service ... not found"). A web search surfaced the City of
// Tampa's own ArcGIS Server, which per its item description contains
// "Hillsborough County Property Appraiser Data for City and county
// Parcels" - i.e. possibly a county-wide dataset despite being hosted
// on the city's domain. This round probes that layer directly, plus a
// couple of other candidates from the same search (tpcmaps.org, and
// Hillsborough County's own Map Hillsborough ArcGIS Server host guess).
//
// Deleted once Hillsborough County FL is either added or documented as
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
  'https://arcgis.tampagov.net/arcgis/rest/services/Parcels/TaxParcel/FeatureServer/0?f=json',
  'City of Tampa ArcGIS Server - Parcels/TaxParcel layer 0 (described as county-wide HCPA data)'
);

await fetchText(
  'https://gis.tpcmaps.org/arcgis/rest/services/Parcels/MapServer/2?f=json',
  'tpcmaps.org - Parcels MapServer layer 2'
);

await fetchText(
  'https://maps.hillsboroughcounty.org/arcgis/rest/services?f=json',
  'Guess - Hillsborough County own ArcGIS Server catalog root (Map Hillsborough host)'
);

await fetchText(
  'https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services?f=json',
  'Hillsborough County GeoHub AGOL org - full services catalog (same org as Cities/Zoning layers)'
);

console.log('\nDone.');
