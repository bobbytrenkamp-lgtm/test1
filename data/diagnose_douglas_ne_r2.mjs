// Temporary diagnostic, round 2: Douglas County NE (Omaha metro)
// parcel service.
//
// Round 1 found no clearly official candidate yet, but a promising
// lead: dcgis.org (likely "Douglas County GIS") hosts an "Omaha
// Zoning" layer, owned by Nataliya2, who also owns "Parcels_for_BOE"
// (Board of Equalization - a real government property-tax-appeals
// term) and "Political_Subdivisions". This round: (1) lists all items
// owned by Nataliya2 to find a parcels-specific layer, (2) probes
// dcgis.org's own ArcGIS REST services root directly, (3) inspects
// Parcels_for_BOE's schema directly since its name suggests it may be
// the real assessment-purposes parcel layer.
//
// IMPORTANT: any candidate must still be confirmed as genuinely
// Nebraska (Omaha metro), not one of the many other-state Douglas
// Counties, via content not just title.
//
// Deleted once Douglas County NE is either added or documented as
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
        for (const r of body.results.slice(0, 20)) {
          console.log('  -', r.title, '|', r.type, '|', r.owner, '|', r.url || '(no url)');
        }
      }
      if (Array.isArray(body.folders)) {
        console.log('Folders:', body.folders.join(', '));
      }
      if (Array.isArray(body.services)) {
        console.log('Services:', body.services.map(s => `${s.name}(${s.type})`).join(', '));
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
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

// 1. All items owned by Nataliya2.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:Nataliya2&f=json&num=50',
  'ArcGIS Online item search - all items owned by Nataliya2'
);

// 2. Direct URL guess for dcgis.org's own ArcGIS REST services root.
await fetchJson(
  'https://dcgis.org/server/rest/services?f=json',
  'dcgis.org ArcGIS REST services root'
);

await fetchJson(
  'https://dcgis.org/server/rest/services/Hosted?f=json',
  'dcgis.org Hosted folder'
);

// 3. Parcels_for_BOE schema.
await fetchJson(
  'https://services.arcgis.com/pDAi2YK0L0QxVJHj/arcgis/rest/services/Parcels_for_BOE/FeatureServer/0?f=json',
  'Parcels_for_BOE - layer 0 schema'
);

console.log('\nDone.');
