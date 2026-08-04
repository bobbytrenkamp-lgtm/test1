// Temporary diagnostic, round 1: Middlesex County NJ parcel service.
//
// New Jersey publishes a statewide MOD-IV parcel database via NJGIN
// (NJ Geographic Information Network), often mirrored county-by-
// county on ArcGIS Online. This round checks Middlesex County NJ's
// own open data portal DCAT feed (if any), then falls back to
// ArcGIS Online's public item-search API for county-specific or
// statewide NJ parcel layers.
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
      if (Array.isArray(body.dataset)) {
        console.log('Dataset count:', body.dataset.length);
        const hits = body.dataset.filter(d =>
          /parcel|property|tax\s*map|mod.?iv/i.test(d.title || '') ||
          /parcel|property/i.test(d.description || '')
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
  'https://data.middlesexcountynj.gov/api/feed/dcat-us/1.1.json',
  'Middlesex County NJ open data portal - DCAT catalog'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=%22Middlesex%20County%22%20New%20Jersey%20parcels&f=json',
  'ArcGIS Online item search - Middlesex County NJ parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22NJ%20Parcels%22&f=json',
  'ArcGIS Online item search - NJ statewide parcels'
);

console.log('\nDone.');
