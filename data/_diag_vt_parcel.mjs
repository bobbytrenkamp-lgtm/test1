// DISPOSABLE DIAGNOSTIC — round 3. Round 2 confirmed the real item:
// id=09cf47e1cf82465e99164762a04f3ce6, title "VT Data - Statewide
// Standardized Parcel Data - parcel polygons", type=Feature Service,
// owner=Services_VCGI. This round pulls its item detail, layer 0 schema +
// count, the DCAT feed's own entry for this exact item (full distribution
// objects, not just downloadURL), and the Hub downloads API.
const ITEM_ID = "09cf47e1cf82465e99164762a04f3ce6";

async function getJson(url, label, { printBody = false, limit = 3000 } = {}) {
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
    if (printBody && parsed) console.log("body:", JSON.stringify(parsed, null, 2).slice(0, limit));
    return parsed;
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "FETCH ERROR:", e.message);
    return null;
  }
}

// 1. Item detail.
const item = await getJson(
  `https://www.arcgis.com/sharing/rest/content/items/${ITEM_ID}?f=json`,
  "item detail", { printBody: true }
);

// 2. Layer 0 schema.
if (item && item.url) {
  const layer0 = await getJson(`${item.url}/0?f=json`, "layer 0 metadata");
  if (layer0 && layer0.fields) {
    console.log("\nfield names:", layer0.fields.map((f) => `${f.name}(${f.type})`).join(", "));
    console.log("geometryType:", layer0.geometryType);
    console.log("extent spatialReference wkid:", layer0.extent && layer0.extent.spatialReference && layer0.extent.spatialReference.wkid);
  }
  const count = await getJson(`${item.url}/0/query?where=1%3D1&returnCountOnly=true&f=json`, "layer 0 count");
  if (count) console.log("record count:", count.count);

  // Sample record to see COUNTY-style filter fields and real field values.
  const sample = await getJson(`${item.url}/0/query?where=1%3D1&outFields=*&resultRecordCount=1&f=json`, "layer 0 sample record", { printBody: true, limit: 2500 });
}

// 3. Hub downloads API using the real item id.
await getJson(
  `https://opendata.arcgis.com/api/v3/datasets/${ITEM_ID}_0/downloads/data?format=geojson&redirect=false`,
  "Hub download API (geojson, redirect=false)", { printBody: true }
);
await getJson(
  `https://opendata.arcgis.com/api/v3/datasets/${ITEM_ID}_0/downloads/data?format=shp&redirect=false`,
  "Hub download API (shapefile, redirect=false)", { printBody: true }
);

// 4. Find this exact item's DCAT entry (full distribution objects).
const dcat = await getJson("https://geodata.vermont.gov/api/feed/dcat-us/1.1.json", "Vermont DCAT feed (looking for exact item)");
if (dcat && Array.isArray(dcat.dataset)) {
  const match = dcat.dataset.find((d) => (d.identifier || "").includes(ITEM_ID));
  if (match) {
    console.log("\nFOUND exact DCAT entry:");
    console.log(JSON.stringify(match, null, 2).slice(0, 3000));
  } else {
    console.log(`\nNo DCAT entry found containing item id ${ITEM_ID}`);
  }
}
