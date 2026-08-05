// Temporary diagnostic: Maryland statewide MD_ParcelBoundaries service --
// find the exact JURSCODE values for Baltimore City (24510) and Prince
// George's County (24033).
//
// A prior round's bounding-box queries for both counties returned the
// WRONG jurisdiction's parcels (Anne Arundel "ANNE" and Montgomery
// "MONT" respectively) -- a bbox near a county line just returns the
// first N matching records anywhere the envelope intersects, not
// necessarily the intended interior county. The service has its own
// JURSCODE attribute identifying which MD jurisdiction each parcel
// belongs to, so the correct fix is a where=JURSCODE='<code>' filter,
// once the exact codes are confirmed here.
//
// Deleted once Baltimore City / Prince George's County are either wired
// into the registry via a confirmed JURSCODE, or documented as still
// unresolved.

const TIMEOUT_MS = 25000;
const BASE = 'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0';

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
      console.log('Body:', JSON.stringify(body).slice(0, 4000));
    } else {
      console.log('Body (text, first 800 chars):', text.slice(0, 800));
    }
    return { ok: res.ok && !body?.error, status, body, text };
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

// Round A: distinct JURSCODE values via returnDistinctValues.
const distinct = await fetchJson(
  `${BASE}/query?where=1%3D1&outFields=JURSCODE&returnGeometry=false&returnDistinctValues=true&f=json`,
  'Distinct JURSCODE values (returnDistinctValues)'
);

// Round B fallback: groupBy statistics query, in case distinct-values
// isn't supported cleanly by this service.
if (!distinct.ok || !distinct.body?.features?.length) {
  const statsDef = encodeURIComponent(JSON.stringify([
    { statisticType: 'count', onStatisticField: 'OBJECTID', outStatisticFieldName: 'cnt' },
  ]));
  await fetchJson(
    `${BASE}/query?where=1%3D1&outFields=JURSCODE&groupByFieldsForStatistics=JURSCODE&outStatistics=${statsDef}&f=json`,
    'JURSCODE group-by statistics (fallback)'
  );
}

// Round C: once we have the code list, sample one real record each for
// Baltimore City and Prince George's County using plausible codes, to
// see actual attribute values (address/owner) confirming correct
// jurisdiction -- educated guesses only, clearly labeled, never wired
// into the registry without a real confirming sample.
const guesses = {
  'Baltimore city': ['BACI', 'BALT', 'BCIT', 'BCITY'],
  "Prince George's County": ['PRIN', 'PG', 'PRGE', 'PGEO'],
};

for (const [name, codes] of Object.entries(guesses)) {
  for (const code of codes) {
    const r = await fetchJson(
      `${BASE}/query?where=JURSCODE%3D%27${code}%27&outFields=*&returnGeometry=false&resultRecordCount=1&f=json`,
      `Sample record for ${name} guess JURSCODE='${code}'`
    );
    if (r.ok && r.body?.features?.length) {
      console.log(`>>> JURSCODE='${code}' returned a real record for ${name} guess -- inspect ADDRESS/owner fields above to confirm.`);
    }
  }
}
