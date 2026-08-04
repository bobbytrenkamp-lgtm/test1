// Temporary diagnostic, round 2: Shelby County TN (Memphis) parcel
// service.
//
// Round 1 found: City of Memphis DCAT has no real parcel data; ArcGIS
// Online searches surfaced "Certified Parcels" (Collierville only, too
// narrow), "Site & Structure Address Points" / "Shelby County Boundary"
// (owner shelbycounty911 - confirms real county GIS presence but these
// specific items aren't parcels), and "TN Property Viewer" web mapping
// app at tnmap.tn.gov/assessment/ (owner tnmap_oir) - a promising
// state-level lead not yet explored.
//
// This round: (1) probe tnmap.tn.gov's likely ArcGIS REST services
// directory for a statewide/Shelby-filterable parcels layer, (2) list
// all items owned by shelbycounty911 to check for a parcels layer
// beyond what round 1's title-filtered search surfaced, (3) try a
// direct URL guess for Shelby County's own ArcGIS services directory.
//
// Deleted once Shelby County TN is either added or documented as
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
      if (Array.isArray(body.results)) {
        console.log('ArcGIS Online results:', body.results.length, 'of total', body.total);
        for (const r of body.results.slice(0, 15)) {
          console.log('  -', r.title, '|', r.type, '|', r.owner, '|', r.url || '(no url)');
        }
      }
      if (Array.isArray(body.services)) {
        console.log('Services:', body.services.length);
        for (const s of body.services) console.log('  -', s.name, '(', s.type, ')');
      }
      if (Array.isArray(body.folders)) {
        console.log('Folders:', body.folders.join(', '));
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.currentVersion) console.log('currentVersion:', body.currentVersion);
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

// 1. TN Property Viewer's likely ArcGIS REST services directory.
await fetchJson(
  'https://tnmap.tn.gov/arcgis/rest/services?f=json',
  'tnmap.tn.gov ArcGIS REST services root'
);

await fetchJson(
  'https://tnmap.tn.gov/arcgis/rest/services/assessment?f=json',
  'tnmap.tn.gov assessment folder'
);

// 2. All items owned by shelbycounty911 (confirmed-real county GIS org).
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:shelbycounty911&f=json&num=50',
  'ArcGIS Online item search - all items owned by shelbycounty911'
);

// 3. Direct URL guesses for Shelby County's own ArcGIS services directory.
await fetchJson(
  'https://gis.shelbycountytn.gov/arcgis/rest/services?f=json',
  'Shelby County TN direct ArcGIS services guess (gis.shelbycountytn.gov)'
);

await fetchJson(
  'https://maps.shelbycountytn.gov/arcgis/rest/services?f=json',
  'Shelby County TN direct ArcGIS services guess (maps.shelbycountytn.gov)'
);

console.log('\nDone.');
