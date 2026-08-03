// Temporary diagnostic, round 2: Washington County OR (Hillsboro/
// Portland metro) parcel service.
//
// Round 1's guessed county-hosted URLs all failed (wrong domains). A
// web search found that Oregon Metro (the Portland tri-county regional
// government covering Multnomah, Washington, and Clackamas) publishes
// a standardized "Taxlots (Public)" dataset compiled from each
// county assessor's own records, via its RLIS Discovery ArcGIS Hub
// portal (rlisdiscovery.oregonmetro.gov, ArcGIS org namespace
// "drcMetro"), item id 9d3c396ffad44649bc7451465aa300f0. This round
// queries that item's own metadata via the ArcGIS sharing API to find
// its real hosted FeatureServer URL, then probes that URL directly.
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
      if (body.url) console.log('Item service url:', body.url);
      if (body.title) console.log('Item title:', body.title);
      if (body.type) console.log('Item type:', body.type);
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.layers) console.log('Layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
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

const item = await fetchText(
  'https://www.arcgis.com/sharing/rest/content/items/9d3c396ffad44649bc7451465aa300f0?f=json',
  'Metro RLIS Discovery Taxlots (Public) - item metadata'
);

if (item.ok && item.body && item.body.url) {
  await fetchText(`${item.body.url}?f=json`, 'Resolved service URL - layer root');
  await fetchText(`${item.body.url}/0?f=json`, 'Resolved service URL - layer 0');
}

console.log('\nDone.');
