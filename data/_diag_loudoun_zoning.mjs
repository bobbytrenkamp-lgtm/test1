// DISPOSABLE DIAGNOSTIC — deleted once findings are captured.
// Loudoun County's zoning data currently ships with geometry_available:false
// (data/zoning/normalized/va-loudoun-county.json) — district standards exist
// but no polygon geometry, so the zoning subsystem cannot resolve a parcel's
// zoning_code and stays disconnected from the parcel/feasibility panel.
// A web search surfaced two real-looking leads on Loudoun's own GIS
// infrastructure (same host family as the already-verified parcel layer):
//   - https://logis.loudoun.gov/gis/rest/services/COL/Zoning/MapServer
//   - https://geohub-loudoungis.opendata.arcgis.com/datasets/LoudounGIS::loudoun-zoning/about
// This confirms both live and captures real schema/field names.
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

// 1. MapServer service directory — list its layers.
const mapserver = await getJson(
  "https://logis.loudoun.gov/gis/rest/services/COL/Zoning/MapServer?f=json",
  "COL/Zoning MapServer service info"
);
if (mapserver && mapserver.layers) {
  console.log("\nlayers:", mapserver.layers.map((l) => `${l.id}:${l.name}`).join(", "));
}

// 2. Layer 0 (guess) schema + count.
const layerUrl = "https://logis.loudoun.gov/gis/rest/services/COL/Zoning/MapServer/0";
const layer0 = await getJson(`${layerUrl}?f=json`, "layer 0 metadata");
if (layer0 && layer0.fields) {
  console.log("\nfield names:", layer0.fields.map((f) => `${f.name}(${f.type})`).join(", "));
  console.log("geometryType:", layer0.geometryType);
}
const count0 = await getJson(`${layerUrl}/query?where=1%3D1&returnCountOnly=true&f=json`, "layer 0 count");

// 3. Sample record.
await getJson(`${layerUrl}/query?where=1%3D1&outFields=*&resultRecordCount=2&f=geojson`,
  "layer 0 sample (2 records, geojson)", { printBody: true, limit: 2500 });

// 4. ArcGIS Online item search for the GeoHub dataset (real item id + owner).
const search = await getJson(
  "https://www.arcgis.com/sharing/rest/search?q=" + encodeURIComponent("loudoun zoning owner:LoudounGIS") + "&f=json&num=10",
  "ArcGIS Online search: loudoun zoning owner:LoudounGIS"
);
if (search && search.results) {
  for (const r of search.results) console.log(`- id=${r.id} title="${r.title}" type=${r.type} owner=${r.owner} url=${r.url || "(none)"}`);
}
