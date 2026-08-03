// Temporary diagnostic: find live parcel services for the next batch of
// counties in the facility-count priority list: Franklin County OH (82
// facilities) and King County WA (71 facilities).
// Deleted once these are either added to the registry or documented as
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
    let body;
    try { body = await res.json(); } catch { body = await res.text(); }
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`HTTP ${status} in ${elapsed}ms`);
    if (typeof body === 'string') {
      console.log('Body (text, first 500 chars):', body.slice(0, 500));
    } else {
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (Array.isArray(body.results)) {
        console.log(`total: ${body.total}`);
        for (const r of body.results.slice(0, 10)) {
          console.log(`- id=${r.id} title="${r.title}" type="${r.type}" owner="${r.owner}" url="${r.url}"`);
        }
      }
    }
    return { ok: true, status, body };
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

// --- Franklin County, OH (FIPS 39049) ---
// Franklin County Auditor's real property GIS.
await fetchJson(
  'https://apps.franklincountyauditor.com/GIS_ArcGIS/rest/services/Parcels/MapServer?f=json',
  'Franklin County OH auditor GIS - Parcels service root'
);
await fetchJson(
  'https://apps.franklincountyauditor.com/GIS_ArcGIS/rest/services/Parcels/MapServer/0?f=json',
  'Franklin County OH auditor GIS - Parcels layer 0 definition'
);
// Ohio statewide OGRIP/Location Based Services parcel catalog, as a fallback
// discovery route if the county's own service isn't reachable at that path.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=Franklin%20County%20Ohio%20parcels&f=json&num=10',
  'ArcGIS Online catalog search for Franklin County OH parcels'
);

// --- King County, WA (FIPS 53033) ---
// King County's official open data / GIS Feature Server.
await fetchJson(
  'https://gismaps.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property___parcel/MapServer?f=json',
  'King County WA GIS - property/parcel service root'
);
await fetchJson(
  'https://gismaps.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property___parcel/MapServer/0?f=json',
  'King County WA GIS - property/parcel layer 0 definition'
);
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=King%20County%20Washington%20parcels&f=json&num=10',
  'ArcGIS Online catalog search for King County WA parcels'
);

console.log('\nDone.');
