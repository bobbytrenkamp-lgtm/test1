// Temporary diagnostic, round 4: New York County NY parcel service.
//
// Round 1 confirmed the first guess was right: MAPPLUTO FeatureServer
// at services5.arcgis.com/GfwWNkhOj9bNBqoJ/.../MAPPLUTO/FeatureServer is
// LIVE, and independently confirmed by an ArcGIS Online catalog search
// as the real official dataset owned by "DCP_GIS" (NYC Department of
// City Planning's real GIS account). Sub-layers list showed "0:MAPPLUTO"
// -- layer index 0, matching the guess. Round 2 fetched the real field
// schema for layer 0: 103 real fields including Borough, BoroCode, BBL,
// Address, OwnerName, ZoneDist1, LandUse, LotArea, AssessTot, etc.
// MAPPLUTO is a citywide 5-borough dataset (Manhattan/Bronx/Brooklyn/
// Queens/Staten Island all in one layer), so New York County (Manhattan)
// needs a where-clause filter on Borough/BoroCode to stay scoped to the
// right FIPS. Round 3 tried to fetch sample records to confirm the
// actual encoded Borough/BoroCode values, but the logging helper only
// printed the query response's field *schema*, not the actual feature
// attribute values -- a real bug, not a dead end. This round fixes that
// by logging body.features[].attributes directly.
//
// Deleted once NYC is either added or documented as unavailable.

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
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description);
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.features) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features) {
          console.log('  attributes:', JSON.stringify(f.attributes));
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
  'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query?where=BoroCode%3D1&outFields=Borough,BoroCode,BBL,Address,ZoneDist1&resultRecordCount=3&f=json',
  'MAPPLUTO - sample records where BoroCode=1'
);

await fetchText(
  'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query?where=Borough%3D%27MN%27&outFields=Borough,BoroCode,BBL,Address&resultRecordCount=3&f=json',
  "MAPPLUTO - sample records where Borough='MN'"
);

console.log('\nDone.');
