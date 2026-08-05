// Temporary diagnostic, round 4: San Francisco County CA - two
// promising leads from round 3.
//
// Lead 1: "ASR Mapping" (assessor-mapping-sfgov.hub.arcgis.com) is a
// real ArcGIS Hub Initiative owned by account "david.josefovsky_asr"
// - the "_asr" suffix strongly suggests this is genuinely the SF
// Assessor-Recorder's own staff account, not a general city GIS
// account. This round searches that account's full item list to find
// the actual underlying parcel/cadastral data service (a Hub
// Initiative page itself is just a landing page, not data).
//
// Lead 2: "Active Parcels (from DataSF, pulled daily)" - a Feature
// Service owned by third-party account "vll_sfgis" that explicitly
// mirrors DataSF's Socrata parcel data into ArcGIS format daily. If
// this is a faithful, current mirror, it would let San Francisco use
// the proven 'arcgis' connector (with real query-based pagination)
// instead of connector-geojson.js's unfinished pagination for a
// ~200k-parcel citywide dataset, while still carrying the same field
// set already known from DataSF (parcel_id/address/zoning, no owner/
// value due to CA law). This round checks its live schema and
// freshness.
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
        for (const r of body.results.slice(0, 15)) {
          console.log('  -', r.title, '|', r.type, '|', r.owner, '|', r.url || '(no url)', '| modified:', r.modified ? new Date(r.modified).toISOString() : '?');
        }
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.description) console.log('description:', String(body.description).slice(0, 400));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.editingInfo?.lastEditDate) console.log('lastEditDate:', new Date(body.editingInfo.lastEditDate).toISOString());
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

// Lead 1: explore david.josefovsky_asr's full item list.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:david.josefovsky_asr&num=50&f=json',
  'ArcGIS Online - items owned by david.josefovsky_asr'
);

// Lead 2: check the DataSF-mirror FeatureServer's schema.
await fetchJson(
  'https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/Active_Parcels_from_DataSF_pulled_daily_/FeatureServer?f=json',
  'Active Parcels (from DataSF, pulled daily) - FeatureServer root'
);
await fetchJson(
  'https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/Active_Parcels_from_DataSF_pulled_daily_/FeatureServer/0?f=json',
  'Active Parcels (from DataSF, pulled daily) - layer 0 schema'
);

console.log('\nDone.');
