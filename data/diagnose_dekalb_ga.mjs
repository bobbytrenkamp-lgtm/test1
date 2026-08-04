// Temporary diagnostic, round 1: DeKalb County GA (Atlanta metro)
// parcel service.
//
// Next uninvestigated candidate in the facility-count priority list
// (18 facilities). IMPORTANT: "DeKalb County" is a name shared by
// counties in multiple states (GA, IL, IN, TN, MO, AL) - any
// candidate found here must be confirmed as the Georgia one (Atlanta
// metro, near Decatur/Tucker/Chamblee/Stone Mountain) via
// description/owner/sample-data content, not just a title match. This
// round checks DeKalb County's/Atlanta's own open data portal DCAT
// feed (if any), then falls back to ArcGIS Online's public
// item-search API for a DeKalb-County-GA-specific parcel/assessor/tax
// layer.
//
// Deleted once DeKalb County GA is either added or documented as
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
        console.log('ArcGIS Online results:', body.results.length, 'of total', body.total);
        for (const r of body.results.slice(0, 10)) {
          console.log('  -', r.title, '|', r.type, '|', r.owner, '|', r.url || '(no url)');
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
  'https://gisdata.dekalbcountyga.gov/api/feed/dcat-us/1.1.json',
  'DeKalb County GA open data portal - DCAT catalog'
);

await fetchJson(
  'https://opendata.atlantaga.gov/api/feed/dcat-us/1.1.json',
  'City of Atlanta open data portal - DCAT catalog'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=%22DeKalb%20County%22%20Georgia%20parcels&f=json',
  'ArcGIS Online item search - DeKalb County GA parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22DeKalb%22%20title:%22parcel%22&f=json',
  'ArcGIS Online item search - title DeKalb AND title parcel'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=DeKalb%20County%20Georgia%20Assessor%20tax%20parcels&f=json',
  'ArcGIS Online item search - DeKalb County GA Assessor tax parcels'
);

console.log('\nDone.');
