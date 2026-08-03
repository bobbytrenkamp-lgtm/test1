// Temporary diagnostic: find a live parcel service for Los Angeles County
// CA (#6 in the facility-count priority list, 64 facilities), the next
// county after Franklin OH / King WA.
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

// Candidate 1: LA County's own Public GIS portal
await fetchText(
  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer?f=json',
  'LA County Public GIS - LACounty_Parcel MapServer root'
);
await fetchText(
  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0?f=json',
  'LA County Public GIS - LACounty_Parcel layer 0 definition'
);

// Candidate 2: LA County Assessor Portal
await fetchText(
  'https://maps.assessor.lacounty.gov/GVH_2/rest/services/GVH_Parcels/MapServer?f=json',
  'LA County Assessor - GVH_Parcels MapServer root (guess)'
);

// Candidate 3: ArcGIS Online catalog search
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=Los%20Angeles%20County%20parcels&f=json&num=10',
  'ArcGIS Online catalog search for LA County parcels'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:LACounty&f=json&num=10',
  'ArcGIS Online search scoped to LACounty owner'
);
await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=parcels%20AND%20owner:lacounty_gis&f=json&num=10',
  'ArcGIS Online search scoped to lacounty_gis owner'
);

console.log('\nDone.');
