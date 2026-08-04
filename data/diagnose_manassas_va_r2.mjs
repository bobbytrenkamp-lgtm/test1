// Temporary diagnostic, round 2: Manassas city VA parcel service
// field schema.
//
// Round 1 surfaced two Manassas-city-specific candidates (not the
// separate Manassas Park city, correctly excluded):
//   - "Manassas City VA Parcels" (owner wharcgisdeveloper)
//     https://services6.arcgis.com/drkDXByy6E3bYW3a/arcgis/rest/services/manassas_city_va_parcels/FeatureServer
//   - "Manassas_Parcels" (owner manassas_gis - looks like the city's
//     own official GIS account)
//     https://services1.arcgis.com/3wpOgOChiWXPeFWB/arcgis/rest/services/Manassas_Parcels/FeatureServer
// Also found: "City of Manassas GIS Hub Site" at
// gis-cityofmanassas.hub.arcgis.com and a "Manassas Parcel &
// Assessment Finder App", both owned by Mmontgomery_COM - suggesting
// Mmontgomery_COM is the city's own GIS staff account.
//
// This round probes both FeatureServer root + sub-layer(s) to compare
// field schemas, descriptions, and copyrightText, to determine which
// is more authoritative and richer for field mapping.
//
// Deleted once Manassas city VA is either added or documented as
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
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (typeof body.description === 'string') console.log('description:', body.description.slice(0, 500));
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
  'https://services6.arcgis.com/drkDXByy6E3bYW3a/arcgis/rest/services/manassas_city_va_parcels/FeatureServer?f=json',
  'wharcgisdeveloper - Manassas City VA Parcels - FeatureServer root'
);

await fetchJson(
  'https://services6.arcgis.com/drkDXByy6E3bYW3a/arcgis/rest/services/manassas_city_va_parcels/FeatureServer/0?f=json',
  'wharcgisdeveloper - Manassas City VA Parcels - layer 0 schema'
);

await fetchJson(
  'https://services1.arcgis.com/3wpOgOChiWXPeFWB/arcgis/rest/services/Manassas_Parcels/FeatureServer?f=json',
  'manassas_gis - Manassas_Parcels - FeatureServer root'
);

await fetchJson(
  'https://services1.arcgis.com/3wpOgOChiWXPeFWB/arcgis/rest/services/Manassas_Parcels/FeatureServer/0?f=json',
  'manassas_gis - Manassas_Parcels - layer 0 schema'
);

console.log('\nDone.');
