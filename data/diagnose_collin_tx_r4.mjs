// Temporary diagnostic, round 4: Collin County TX parcel service.
//
// Round 3 confirmed CCAD_Parcel_Feature_Set layer 4 ("Parcels") is
// real, official (copyrightText "Collin Central Appraisal District /
// https://collincad.org"), and has a rich 114-field schema. But the
// unfiltered sample record (OBJECTID 1) came back with nearly every
// attribute null - likely a placeholder/edge feature rather than a
// real parcel. This round queries specifically for a record with a
// populated ownerName, to confirm real field values before building
// the registry entry and its Playwright test case.
//
// Deleted once Collin County TX is either added or documented as
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
      if (Array.isArray(body.features)) {
        console.log('Sample feature count:', body.features.length);
        for (const f of body.features) console.log('Sample attributes:', JSON.stringify(f.attributes));
      }
    } else {
      console.log('Body (text, first 800 chars):', text.slice(0, 800));
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

const fields = [
  'PROP_ID', 'geoID', 'ownerName', 'situsConcat', 'propUseCode',
  'landSizeAcres', 'landSizeSqft', 'imprvYearBuilt', 'imprvMainArea',
  'currValAssessed', 'currValLand', 'currValImprv', 'currValYear',
  'deedFileDate', 'deedBook', 'deedPage', 'legalAbsSubName', 'legalDescription',
].join(',');

await fetchJson(
  `https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4/query?where=ownerName+IS+NOT+NULL&outFields=${fields}&resultRecordCount=3&f=json`,
  'CCAD Parcel Feature Set - layer 4 - populated sample records (ownerName IS NOT NULL)'
);

console.log('\nDone.');
