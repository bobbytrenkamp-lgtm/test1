// DISPOSABLE DIAGNOSTIC — deleted once findings are captured.
// Investigates Vermont's statewide standardized parcel dataset (VCGI) as a
// candidate for data/parcel_pipeline/static_ingestion/sources.json, whose
// registry is currently empty (infrastructure built, zero real sources
// populated). Goal: find the real direct download URL, format, and CRS.
async function getJson(url, label) {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" } });
    const elapsed = Date.now() - start;
    const text = await res.text();
    console.log(`\n--- ${label} ---`);
    console.log("url:", url);
    console.log("status:", res.status, "elapsed_ms:", elapsed, "bytes:", text.length);
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { console.log("NOT JSON, snippet:", text.slice(0, 300)); }
    return parsed;
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "FETCH ERROR:", e.message);
    return null;
  }
}

// 1. Search ArcGIS Online for the VCGI statewide parcel item.
const search = await getJson(
  "https://www.arcgis.com/sharing/rest/search?q=" +
    encodeURIComponent('title:"Standardized Parcel Data" AND owner:VCGI') +
    "&f=json&num=10",
  "ArcGIS Online search: VCGI standardized parcel data"
);
if (search && search.results) {
  console.log(`\nfound ${search.results.length} result(s):`);
  for (const r of search.results) {
    console.log(`- id=${r.id} title="${r.title}" type=${r.type} owner=${r.owner} url=${r.url || "(none)"}`);
  }
}

let itemId = search && search.results && search.results[0] && search.results[0].id;

if (itemId) {
  // 2. Full item detail — description, licenseInfo, extent.
  const item = await getJson(
    `https://www.arcgis.com/sharing/rest/content/items/${itemId}?f=json`,
    "item detail"
  );
  if (item) {
    console.log("\nitem summary: type=" + item.type + " url=" + item.url);
    console.log("licenseInfo:", (item.licenseInfo || "").slice(0, 300));
  }

  // 3. If it's a Feature Service, get layer 0's fields + a sample record.
  if (item && item.url) {
    const layer0 = await getJson(`${item.url}/0?f=json`, "layer 0 metadata");
    if (layer0 && layer0.fields) {
      console.log("\nfield names:", layer0.fields.map((f) => f.name).join(", "));
      console.log("geometryType:", layer0.geometryType);
      console.log("extent spatialReference wkid:", layer0.extent && layer0.extent.spatialReference && layer0.extent.spatialReference.wkid);
    }
    const count = await getJson(
      `${item.url}/0/query?where=1%3D1&returnCountOnly=true&f=json`,
      "layer 0 count"
    );
    if (count) console.log("record count:", count.count);
  }

  // 4. Try the Hub "downloads" API for a real static file link (shp/geojson).
  await getJson(
    `https://opendata.arcgis.com/api/v3/datasets/${itemId}_0/downloads/data?format=geojson&spatialRefId=4326&redirect=false`,
    "Hub download API (geojson, redirect=false)"
  );
}

// 5. Fallback: query the Hub dataset-by-slug API directly using the known
// human-readable slug from the "about" page URL.
await getJson(
  "https://hub.arcgis.com/api/v3/datasets?filter[slug]=VCGI::vt-data-statewide-standardized-parcel-data-parcel-polygons-1",
  "Hub v3 datasets by slug"
);
