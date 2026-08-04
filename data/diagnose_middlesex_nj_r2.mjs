// Temporary diagnostic, round 2: Middlesex County NJ parcel service.
//
// Round 1's ArcGIS Online item search surfaced three genuinely NJ-
// specific candidates: the county's own GIS portal service
// (mcgisportal.co.middlesex.nj.us — an official government domain),
// and two ArcGIS Online hosted services ("Middlesex_County_NJ_Parcel_
// data" and "middlesex_county_nj_parcels", the latter part of an
// org that also hosts Cape May and Monmouth County NJ parcel layers,
// suggesting a systematic statewide series). This round probes all
// three for layer catalog / field schema.
//
// Deleted once Middlesex County NJ is either added or documented as
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
      if (Array.isArray(body.layers)) {
        console.log('Layer count:', body.layers.length);
        for (const l of body.layers) {
          console.log(`  [${l.id}] ${l.name} (${l.geometryType || 'no geometry'})`);
        }
      }
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
  'https://mcgisportal.co.middlesex.nj.us/server/rest/services/GIS/Parcels_Public/MapServer?f=json',
  'Middlesex County own GIS portal - Parcels_Public MapServer'
);

await fetchJson(
  'https://services.arcgis.com/BnY3izA2Kwu6jVHq/arcgis/rest/services/Middlesex_County_NJ_Parcel_data/FeatureServer?f=json',
  'Middlesex_County_NJ_Parcel_data - full layer catalog'
);

await fetchJson(
  'https://services6.arcgis.com/drkDXByy6E3bYW3a/arcgis/rest/services/middlesex_county_nj_parcels/FeatureServer?f=json',
  'middlesex_county_nj_parcels - full layer catalog'
);

console.log('\nDone.');
