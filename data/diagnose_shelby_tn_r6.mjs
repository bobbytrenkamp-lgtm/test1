// Temporary diagnostic, round 6 (final): Shelby County TN (Memphis)
// parcel service.
//
// Round 5 found COUNTY_NAME='Shelby' returns a record COUNT of 0
// against the TN Comptroller's statewide "Tennessee Property
// Boundaries Public Use" layer - a decisive (non-timeout) zero
// result. This is consistent with rounds 1-3's finding that Shelby
// County (TN's most populous, home to Memphis) appears to run its own
// independent assessor/CAMA system not federated into the state
// layer, unlike smaller counties (Anderson, Decatur, Henderson,
// Madison all confirmed present).
//
// This final round rules out a spelling/case mismatch before
// concluding Shelby County TN is unavailable via this service: (1) a
// LIKE query for any county name containing "hel", (2) a distinct
// COUNTY_NAME list via groupBy statistics, to see the full roster of
// covered counties.
//
// Deleted once Shelby County TN is either added or documented as
// unavailable.

const TIMEOUT_MS = 28000;
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
        for (const f of body.features) {
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

// 1. LIKE query for anything containing "hel" (case-sensitive backend, but
// covers "Shelby" if stored with any capitalization variant using this
// substring, e.g. "SHELBY", "shelby").
await fetchJson(
  `${LAYER}/query?where=COUNTY_NAME+LIKE+%27%25hel%25%27&returnCountOnly=true&f=json`,
  'Count where COUNTY_NAME LIKE %hel% (lowercase)'
);

await fetchJson(
  `${LAYER}/query?where=COUNTY_NAME+LIKE+%27%25HEL%25%27&returnCountOnly=true&f=json`,
  'Count where COUNTY_NAME LIKE %HEL% (uppercase)'
);

// 2. Full distinct-county roster via groupBy statistics, to see which
// counties are actually present in this layer.
await fetchJson(
  `${LAYER}/query?where=1=1&outFields=COUNTY_NAME&returnDistinctValues=true&orderByFields=COUNTY_NAME&resultRecordCount=100&f=json`,
  'Distinct COUNTY_NAME values (up to 100)'
);

console.log('\nDone.');
