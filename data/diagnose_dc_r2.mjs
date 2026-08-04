// Temporary diagnostic, round 2: District of Columbia parcel service.
//
// Round 1's DCAT catalog surfaced a "Tax Exempt Properties" dataset
// distributed from a "Property_and_Land_WebMercator" FeatureServer
// (maps2.dcgis.dc.gov) — a strong signal this service's other layers
// include the actual real-property parcel/CAMA data. This round lists
// that service's full layer catalog, and separately re-filters the
// DCAT catalog for more targeted real-property keywords (integrated
// tax system, computer assisted mass appraisal, real property,
// assessment) that round 1's generic "parcel"/"property" filter may
// have buried among unrelated hits.
//
// Deleted once DC is either added or documented as unavailable.

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

const svc = await fetchJson(
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer?f=json',
  'Property_and_Land_WebMercator - full layer catalog'
);
if (svc.body && Array.isArray(svc.body.layers)) {
  console.log('Layer count:', svc.body.layers.length);
  for (const l of svc.body.layers) {
    console.log(`  [${l.id}] ${l.name} (${l.geometryType || 'no geometry'})`);
  }
}

const dcat = await fetchJson(
  'https://opendata.dc.gov/api/feed/dcat-us/1.1.json',
  'DC OCTO DCAT catalog (re-fetch for targeted keyword filter)'
);
if (dcat.body && Array.isArray(dcat.body.dataset)) {
  const keywords = /integrated tax system|computer assisted mass appraisal|\bcama\b|real property|assessment|square.*suffix.*lot|parcel.*boundar|tax.*lot/i;
  const hits = dcat.body.dataset.filter(d => keywords.test(d.title || '') || keywords.test(d.description || ''));
  console.log('Targeted keyword hits:', hits.length);
  for (const h of hits.slice(0, 20)) {
    console.log('  -', h.title);
    const dist = (h.distribution || []).map(d => d.accessURL || d.downloadURL).filter(Boolean);
    for (const u of dist) console.log('     dist:', u);
  }
}

console.log('\nDone.');
