// Temporary diagnostic, round 5: Shelby County TN (Memphis) parcel
// service.
//
// Round 4 confirmed the real service: TN Comptroller of the Treasury -
// Division of Property Assessments' "Tennessee Property Boundaries
// Public Use" statewide feature layer, covering all 95 TN counties.
// The county field guesses (CountyName, County) were both wrong - the
// real field, from the layer schema, is COUNTY_NAME. This round
// queries specifically for Shelby County records using the correct
// field name, to get a genuine populated sample before adding to the
// registry.
//
// Deleted once Shelby County TN is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;
const LAYER = 'https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0';

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
        console.log('Feature count:', body.features.length);
        for (const f of body.features.slice(0, 5)) {
          console.log('  attrs:', JSON.stringify(f.attributes));
        }
      }
      if (typeof body.count === 'number') console.log('Count:', body.count);
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

// 1. Count of Shelby County records (confirm coverage).
await fetchJson(
  `${LAYER}/query?where=COUNTY_NAME%3D%27Shelby%27&returnCountOnly=true&f=json`,
  'Shelby County record count'
);

// 2. A handful of real Shelby County sample records, owner not blank.
await fetchJson(
  `${LAYER}/query?where=COUNTY_NAME%3D%27Shelby%27+AND+OWNER+IS+NOT+NULL&outFields=*&returnGeometry=false&resultRecordCount=5&f=json`,
  'Shelby County sample records (owner not null)'
);

console.log('\nDone.');
