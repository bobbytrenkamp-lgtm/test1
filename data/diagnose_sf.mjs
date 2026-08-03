// Temporary diagnostic, round 2: San Francisco County CA parcel service.
//
// Round 1 found DataSF's "Parcels - Active and Retired" Socrata dataset
// genuinely live with real fields (mapblklot/blklot, address components,
// zoning_code, zoning_district, administrative districts) -- but zero
// owner/value/legal fields, and no composite address field. A web
// search after round 1 found the real reason: California state law
// prohibits SF's Assessor-Recorder from posting ownership information
// online at all (available only for purchase / in-person at the
// office) -- this isn't a data gap, it's a legal restriction specific
// to this source. Round 1's ArcGIS Online item lead was a dead end (a
// Web Mapping Application, not a feature layer; its url field just
// pointed back to the DataSF portal homepage).
//
// The same search found a second, more promising lead: "ASR Mapping",
// an ArcGIS Online hub specifically for SF's Assessor-Recorder
// (assessor-mapping-sfgov.hub.arcgis.com). The DataSF portal item from
// round 1 was owned by ArcGIS Online user "sfgov_agofo" (likely the
// Assessor-Recorder's own account -- "AGOFO" ~ Assessor-Recorder). This
// round searches that user's public content for a real parcel/
// assessment FeatureServer that might carry genuine valuation data
// (even with ownership names legally excluded).
//
// Deleted once San Francisco County is either added or documented as
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
      if (Array.isArray(body)) {
        console.log('Body is array, length:', body.length);
        if (body[0]) console.log('First item keys:', Object.keys(body[0]));
        if (body[0]) console.log('First item sample:', JSON.stringify(body[0]).slice(0, 800));
      } else {
        console.log('Body (JSON keys):', Object.keys(body));
        if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
        if (body.url) console.log('url field:', body.url);
        if (body.type) console.log('type field:', body.type);
        if (body.title) console.log('title field:', body.title);
        if (body.owner) console.log('owner field:', body.owner);
        if (body.fields) {
          console.log('Field count:', body.fields.length);
          console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
        }
        if (body.features) console.log('Feature count:', body.features.length);
        if (body.results) {
          console.log('Search total:', body.total, '  results returned:', body.results.length);
          for (const item of body.results) {
            console.log(`  - [${item.type}] "${item.title}" owner=${item.owner} url=${item.url || '(none)'} id=${item.id}`);
          }
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

await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=owner:sfgov_agofo&f=json&num=50',
  "ArcGIS Online content search - items owned by sfgov_agofo (SF Assessor-Recorder's likely account)"
);

await fetchText(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22parcel%22+AND+owner:sfgov_agofo&f=json&num=25',
  'ArcGIS Online content search - "parcel" items owned by sfgov_agofo'
);

console.log('\nDone.');
