// Temporary diagnostic, round 3: Washington County OR (Hillsboro/
// Portland metro) parcel service.
//
// Round 2 resolved the "Taxlots (Public) - Download" item, but it
// turned out to be a static Shapefile download item (type: Shapefile),
// not a live queryable ArcGIS REST service -- it has no `url` field.
// The RLIS Discovery site itself mentioned "the original feature
// layers" exist separately for viewing in ArcGIS Online. This round
// checks the RLIS Discovery site's own DCAT catalog directly (ArcGIS
// Hub sites expose this same feed pattern even on a custom domain,
// not just *.opendata.arcgis.com) to find the real Feature Layer
// distribution URL.
//
// Deleted once Washington County OR is either added or documented as
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
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (Array.isArray(body.dataset)) {
        const matches = body.dataset.filter(d =>
          /taxlot|parcel/i.test(d.title || '') || /taxlot|parcel/i.test(d.description || '')
        );
        console.log(`DCAT datasets matching "taxlot"/"parcel": ${matches.length}`);
        for (const d of matches) {
          console.log(`\n--- ${d.title} ---`);
          console.log('description:', (d.description || '').slice(0, 300));
          const dist = (d.distribution || []).map(x => `${x.format}: ${x.accessURL || x.downloadURL}`);
          console.log('distribution:', dist.join(' | '));
        }
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 500));
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

await fetchText(
  'https://rlisdiscovery.oregonmetro.gov/api/feed/dcat-us/1.1.json',
  'RLIS Discovery own DCAT catalog (custom domain)'
);

console.log('\nDone.');
