// Temporary diagnostic, round 5 -- schema-confirmation follow-up on
// round 4's leads.
//
// Arapahoe County CO: ArapahoeAdmin-owned "Parcel_Sales_2023_gdb" --
// county-owned but tags suggest sales-transaction data specifically;
// need the real layer list/schema to know if it's general parcels or
// just a sales subset.
// DuPage County IL: Kevin.Piraino_DuPage-owned "ParcelsWithRealEstateCC"
// at the county's own gis.dupageco.org -- the most promising find this
// round, multiple independent items point at the same service.
// Jefferson County AL: jdougturner-owned "Parcels" at jccgis.jccal.org
// (Jefferson County Commission's own domain).
// Durham County NC: no confirmed county-owned general parcel service
// yet -- follow up by searching the Durham_GIS org directly (the real
// Durham NC government ArcGIS Online account) for a broader "parcel"
// term instead of the compound query that missed it.
//
// Deleted once this round's findings are wired into the registry or
// documented as still unresolved.

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
      if (body.results) {
        console.log(`Search results: total=${body.total}, showing ${body.results.length}`);
        for (const r of body.results) {
          console.log(`  - [${r.type}] "${r.title}" owner=${r.owner} url=${r.url || '(no url field)'} tags=${(r.tags||[]).slice(0,6).join(',')}`);
        }
      } else {
        console.log('Body (truncated 2500):', JSON.stringify(body).slice(0, 2500));
      }
    } else {
      console.log('Body (text, first 400 chars):', text.slice(0, 400));
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

// Arapahoe County CO: layer list, then layer 0's schema + sample.
await fetchJson(
  'https://services2.arcgis.com/OSbOBWdLkmvu5I9F/arcgis/rest/services/Parcel_Sales_2023_gdb/FeatureServer?f=json',
  'Arapahoe CO Parcel_Sales_2023_gdb: service/layer list'
);

// DuPage County IL: real schema + sample record.
await fetchJson(
  'https://gis.dupageco.org/arcgis/rest/services/DuPage_County_IL/ParcelsWithRealEstateCC/FeatureServer/0?f=json',
  'DuPage IL ParcelsWithRealEstateCC: layer schema'
);
await fetchJson(
  'https://gis.dupageco.org/arcgis/rest/services/DuPage_County_IL/ParcelsWithRealEstateCC/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=1&f=json',
  'DuPage IL ParcelsWithRealEstateCC: sample record'
);

// Jefferson County AL: real schema + sample record.
await fetchJson(
  'https://jccgis.jccal.org/server/rest/services/Basemap/Parcels/MapServer/0?f=json',
  'Jefferson County AL Parcels: layer schema'
);
await fetchJson(
  'https://jccgis.jccal.org/server/rest/services/Basemap/Parcels/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=1&f=json',
  'Jefferson County AL Parcels: sample record'
);

// Durham County NC: search the real Durham_GIS org directly.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner%3ADurham_GIS%20AND%20parcel&f=json&num=15',
  'Durham NC: Durham_GIS org search for parcel'
);
