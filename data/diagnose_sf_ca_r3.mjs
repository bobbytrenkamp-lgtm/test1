// Temporary diagnostic, round 3: San Francisco County CA parcel
// service.
//
// Rounds 1-2 (2026-08-03) found San Francisco is structurally
// different from every other county investigated this session: a
// real, live, well-documented DataSF Socrata dataset ("Parcels -
// Active and Retired", data.sfgov.org, id acdm-wktn) has genuine
// parcel_id/address/zoning fields but zero owner/value/legal fields,
// because California state law prohibits SF's Assessor-Recorder from
// posting ownership information online at all. Round 2 searched the
// ArcGIS Online account behind SF's open-data portal (sfgov_agofo,
// 247 items) with no Assessor-native hit.
//
// This round checks whether the "ASR Mapping" hub
// (assessor-mapping-sfgov.hub.arcgis.com), the original lead never
// confirmed to be sfgov_agofo's account, is a genuine ArcGIS-native
// SF Assessor-Recorder service - which would let this addition use
// the existing, proven 'arcgis' connector (with its query-based
// maxFeatures cap) instead of the geojson connector's unproven/
// unfinished pagination for a ~200k-parcel citywide dataset.
//
// Deleted once San Francisco County CA is either added or
// re-documented as unavailable/deliberately excluded.

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
        for (const r of body.results.slice(0, 10)) {
          console.log('  -', r.title, '|', r.type, '|', r.owner, '|', r.url || '(no url)');
        }
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.description) console.log('description:', String(body.description).slice(0, 400));
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

// Check the ASR Mapping hub's real owner account and content.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22ASR%20Mapping%22&f=json',
  'ArcGIS Online item search - title "ASR Mapping"'
);
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=San%20Francisco%20Assessor%20Recorder%20parcels&f=json',
  'ArcGIS Online item search - SF Assessor Recorder parcels'
);
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:sfassessor&f=json',
  'ArcGIS Online item search - owner:sfassessor'
);
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:SF_Assessor&f=json',
  'ArcGIS Online item search - owner:SF_Assessor'
);

console.log('\nDone.');
