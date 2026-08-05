// Temporary diagnostic, round 6 -- disambiguation follow-up.
//
// Arapahoe County CO: round 5's FeatureServer root response was
// truncated before showing the actual "layers" array -- need the real
// layer list to know if Parcel_Sales_2023_gdb has a general parcel
// boundary/attribute layer or is genuinely sales-transaction-only.
//
// DuPage County IL: round 5's field list was truncated -- need the
// complete field list plus real sample VALUES to confirm which fields
// are populated and usable.
//
// Jefferson County AL: round 5 showed 3 plausible identifier fields
// (PID, PARCELID, ParcelNo) and composite-looking address fields
// (ADDR_PSPR, ADDR_APR) alongside split components -- need real sample
// VALUES (not just field names/types) to tell which is genuinely the
// clean identifier and whether the ADDR_* fields are populated,
// combined address strings or something else.
//
// Deleted once this round's findings are wired into the registry or
// documented as still unresolved.

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
      if (body.layers) {
        console.log(`Layers: ${body.layers.map(l => `[${l.id}] ${l.name}`).join(', ')}`);
      }
      if (body.fields) {
        console.log(`Field count: ${body.fields.length}`);
        console.log('Fields:', body.fields.map(f => f.name).join(', '));
      }
      if (body.features) {
        console.log('Sample record attributes:', JSON.stringify(body.features[0]?.attributes, null, 1));
      }
      if (!body.layers && !body.fields && !body.features) {
        console.log('Body (truncated 2000):', JSON.stringify(body).slice(0, 2000));
      }
    } else {
      console.log('Body (text, first 400 chars):', text.slice(0, 400));
    }
    return { ok: res.ok && !body?.error, status, body, text };
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
  'https://services2.arcgis.com/OSbOBWdLkmvu5I9F/arcgis/rest/services/Parcel_Sales_2023_gdb/FeatureServer?f=json',
  'Arapahoe CO Parcel_Sales_2023_gdb: layer list'
);

await fetchJson(
  'https://gis.dupageco.org/arcgis/rest/services/DuPage_County_IL/ParcelsWithRealEstateCC/FeatureServer/0?f=json',
  'DuPage IL ParcelsWithRealEstateCC: full field list'
);
await fetchJson(
  'https://gis.dupageco.org/arcgis/rest/services/DuPage_County_IL/ParcelsWithRealEstateCC/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=1&f=json',
  'DuPage IL ParcelsWithRealEstateCC: sample record values'
);

await fetchJson(
  'https://jccgis.jccal.org/server/rest/services/Basemap/Parcels/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=1&f=json',
  'Jefferson County AL Parcels: sample record values'
);
