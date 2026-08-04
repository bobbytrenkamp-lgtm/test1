// Temporary diagnostic, round 1: Providence County RI parcel service.
//
// Next uninvestigated candidate in the facility-count priority list
// (20 facilities, tied with Honolulu HI). This round checks
// Providence County's/Rhode Island's own open data portal DCAT feed
// (if any), then falls back to ArcGIS Online's public item-search API
// for a Providence-County-specific RI parcel layer, and also checks
// for a statewide Rhode Island GIS (RIGIS) parcels service since
// small states have centralized their GIS data this session (Hawaii,
// New Jersey).
//
// Deleted once Providence County RI is either added or documented as
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
      if (Array.isArray(body.dataset)) {
        console.log('Dataset count:', body.dataset.length);
        const hits = body.dataset.filter(d =>
          /parcel|property|assessor/i.test(d.title || '') ||
          /parcel|property|assessor/i.test(d.description || '')
        );
        console.log('Parcel-ish hits:', hits.length);
        for (const h of hits.slice(0, 15)) {
          console.log('  -', h.title);
          const dist = (h.distribution || []).map(d => d.accessURL || d.downloadURL).filter(Boolean);
          for (const u of dist) console.log('     dist:', u);
        }
      }
      if (Array.isArray(body.results)) {
        console.log('ArcGIS Online results:', body.results.length);
        for (const r of body.results.slice(0, 10)) {
          console.log('  -', r.title, '|', r.type, '|', r.url || '(no url)');
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
  'https://data.providenceri.gov/api/feed/dcat-us/1.1.json',
  'City of Providence RI open data portal - DCAT catalog'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=%22Providence%20County%22%20Rhode%20Island%20parcels&f=json',
  'ArcGIS Online item search - Providence County RI parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22Providence%22%20Rhode%20Island%20parcels&f=json',
  'ArcGIS Online item search - title Providence Rhode Island parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=RIGIS%20parcels&f=json',
  'ArcGIS Online item search - RIGIS parcels'
);

console.log('\nDone.');
