// Temporary diagnostic, round 3: finish investigating Franklin County OH
// and King County WA parcel candidates.
//
// Round 2 found: Franklin County's real auditor-owned Feature Service
// (gis.franklincountyohio.gov), not yet schema-checked; and King County's
// PARCEL_ADDRESS_PUB_AREA_3069 layer, a rich 69-field schema that's the
// clear best candidate over the thinner PUBLIC_PARCELS_AREA_2598 layer.
//
// Round 3 fetches Franklin's real layer definition, plus King County's
// GIS open data terms of use (to check for redistribution restrictions,
// learning from the Cook County IL lesson where a similar-looking
// service turned out to be license-restricted).
//
// Deleted once these are either added to the registry or documented as
// unavailable.

const TIMEOUT_MS = 25000;

async function fetchText(url, label, { maxChars = 2000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const elapsed = Date.now() - start;
    const status = res.status;
    const text = await res.text();
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`HTTP ${status} in ${elapsed}ms`);
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    if (body) {
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description);
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.serviceDescription) console.log('serviceDescription:', body.serviceDescription);
    } else {
      console.log(`Body (text, first ${maxChars} chars):`, text.slice(0, maxChars));
    }
    return { ok: true, status, text, body };
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

// --- Franklin County, OH: the real service found via scoped catalog search ---
await fetchText(
  'https://gis.franklincountyohio.gov/hosting/rest/services/ParcelFeatures/Parcel_Features/MapServer/0?f=json',
  'Franklin County OH - Parcel_Features MapServer layer 0 definition'
);

// --- King County, WA: licensing / terms of use for the GIS open data ---
await fetchText(
  'https://gis-kingcounty.opendata.arcgis.com/pages/terms-of-use',
  'King County GIS Open Data - terms of use page',
  { maxChars: 4000 }
);
await fetchText(
  'https://kingcounty.gov/en/legacy/services/gis/GISData/gis-tou.aspx',
  'King County GIS data terms of use (legacy page)',
  { maxChars: 4000 }
);
// The service's own copyrightText / description, straight from the REST API,
// as a fallback if the terms-of-use pages above aren't reachable.
await fetchText(
  'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer?f=json',
  'King County WA - PARCEL_ADDRESS_PUB_AREA_3069 service description/copyright (re-check)',
  { maxChars: 3000 }
);

console.log('\nDone.');
