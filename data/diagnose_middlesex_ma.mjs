// Temporary diagnostic, round 1: Middlesex County MA (Boston metro
// suburbs incl. Cambridge) parcel service.
//
// Next candidate in the facility-count priority queue after
// Hillsborough County FL (26 facilities). Suffolk County MA/Boston was
// already added using MassGIS's statewide "Massachusetts Property Tax
// Parcels" ArcGIS service (arcgisserver.digital.mass.gov), whose layer
// 1 ("Tax Parcels") is a real Polygon boundary layer covering the
// whole state. This round re-probes that same layer's field list to
// check for a county- or town-scoping field (the same `where`-clause
// pattern already used for Washington County OR / Oregon Metro's
// multi-county service and NYC's multi-borough service), then runs a
// sample query scoped to Middlesex to confirm real Middlesex parcels
// come back.
//
// Deleted once Middlesex County MA is either added or documented as
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
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.features) {
        console.log('Feature count:', body.features.length);
        if (body.features[0]) console.log('Sample attributes:', JSON.stringify(body.features[0].attributes || body.features[0].properties));
      }
      if (body.count != null) console.log('count:', body.count);
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

const LAYER = 'https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/MassachusettsPropertyTaxParcels/FeatureServer/1';

await fetchText(`${LAYER}?f=json`, 'Tax Parcels layer - full field list');

// Common candidate scoping field names for a MassGIS statewide layer.
for (const field of ['COUNTY', 'TOWN_ID', 'CITY_TOWN', 'MUNI_ID']) {
  await fetchText(
    `${LAYER}/query?where=${encodeURIComponent(`UPPER(${field}) LIKE '%MIDDLESEX%'`)}&outFields=*&resultRecordCount=1&f=json`,
    `Sample query - ${field} LIKE MIDDLESEX`
  );
}

// Also try scoping by a known Middlesex town name (Cambridge) in case
// there's no COUNTY field at all, only a town/city field.
await fetchText(
  `${LAYER}/query?where=${encodeURIComponent(`UPPER(CITY_TOWN) = 'CAMBRIDGE'`)}&outFields=*&resultRecordCount=1&f=json`,
  'Sample query - CITY_TOWN = CAMBRIDGE'
);

console.log('\nDone.');
