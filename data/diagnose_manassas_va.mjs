// Temporary diagnostic, round 1: Manassas city VA (Northern Virginia,
// DC exurbs) parcel service.
//
// Next uninvestigated candidate in the facility-count priority list
// (18 facilities). Manassas is an independent city, not a county
// (Virginia has many independent cities that function as their own
// county-equivalent for GIS/assessor purposes - same precedent as DC
// and Suffolk MA earlier in this session). Note Manassas city is also
// distinct from the separate, adjacent Manassas Park city and from
// Prince William County (which surrounds but does not contain either
// city) - any candidate found here must be confirmed as Manassas
// CITY specifically, not Manassas Park or Prince William County.
// This round checks the city's own open data portal DCAT feed (if
// any), then falls back to ArcGIS Online's public item-search API for
// a Manassas-city-specific parcel/assessor layer.
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
  'https://data-manassascity.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Manassas city VA open data portal - DCAT catalog'
);

await fetchJson(
  'https://gisdata-manassascity.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'Manassas city VA GIS open data portal - DCAT catalog (alt)'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=%22Manassas%20City%22%20Virginia%20parcels&f=json',
  'ArcGIS Online item search - Manassas City VA parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22Manassas%22%20parcels&f=json',
  'ArcGIS Online item search - title Manassas parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=Manassas%20City%20Virginia%20Assessor%20parcels&f=json',
  'ArcGIS Online item search - Manassas City VA Assessor parcels'
);

console.log('\nDone.');
