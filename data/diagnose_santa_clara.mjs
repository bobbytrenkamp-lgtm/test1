// Temporary diagnostic: retry Santa Clara County CA parcel service candidates
// with a longer timeout, plus probe an ArcGIS Hub alternate if the direct
// service is genuinely unreachable rather than just slow.
// Deleted once Santa Clara is either added or documented as unavailable.

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

// Candidate 1: original direct ArcGIS REST service (timed out on first probe)
await fetchJson(
  'https://webgis.sccgov.org/gis/rest/services/opendata/SCCGISHUBFeatureService/MapServer?f=json',
  'Santa Clara direct service root (longer timeout retry)'
);

// Candidate 2: same service, layer 0 definition (skip if root failed, but try anyway)
await fetchJson(
  'https://webgis.sccgov.org/gis/rest/services/opendata/SCCGISHUBFeatureService/MapServer/0?f=json',
  'Santa Clara direct service, layer 0 definition'
);

// Candidate 3: ArcGIS Hub open data search for Santa Clara parcels
await fetchJson(
  'https://gisdata-sccplanning.hub.arcgis.com/api/search/v1/collections/dataset/items?q=parcel',
  'Santa Clara ArcGIS Hub dataset search'
);

// Candidate 4: statewide/countywide ArcGIS Online item search as fallback
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=Santa%20Clara%20County%20parcels&f=json&num=10',
  'ArcGIS Online catalog search for Santa Clara parcels'
);

console.log('\nDone.');
