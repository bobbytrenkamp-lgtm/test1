// DISPOSABLE DIAGNOSTIC — round 2. Round 1 confirmed COL/Zoning/MapServer has
// 6 layers: 0=Leesburg Zoning, 1=1972 Zoning Ordinance, 2=Zoning: Labels,
// 3=Zoning, 4=Rezoning-ZMAP: Labels, 5=Rezoning-ZMAP. Round 1 queried layer 0
// by mistake (LB_-prefixed fields confirm it's Leesburg-town-specific, not
// countywide). Layer 3 "Zoning" is the real target. Also checking layer 1
// (1972 ordinance — likely superseded/historical) for contrast.
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

const BASE = "https://logis.loudoun.gov/gis/rest/services/COL/Zoning/MapServer";

// Layer 3 — the real "Zoning" layer.
const layer3 = await getJson(`${BASE}/3?f=json`, "layer 3 (Zoning) metadata");
if (layer3 && layer3.fields) {
  console.log("\nfield names:", layer3.fields.map((f) => `${f.name}(${f.type})`).join(", "));
  console.log("geometryType:", layer3.geometryType);
  console.log("extent spatialReference wkid:", layer3.extent && layer3.extent.spatialReference && layer3.extent.spatialReference.wkid);
}
const count3 = await getJson(`${BASE}/3/query?where=1%3D1&returnCountOnly=true&f=json`, "layer 3 count", { printBody: true });

await getJson(`${BASE}/3/query?where=1%3D1&outFields=*&resultRecordCount=3&f=geojson`,
  "layer 3 sample (3 records, geojson)", { printBody: true, limit: 3000 });

// Layer 1 for contrast (likely historical/superseded).
const layer1 = await getJson(`${BASE}/1?f=json`, "layer 1 (1972 Zoning Ordinance) metadata");
if (layer1 && layer1.fields) {
  console.log("\nfield names:", layer1.fields.map((f) => f.name).join(", "));
}
const count1 = await getJson(`${BASE}/1/query?where=1%3D1&returnCountOnly=true&f=json`, "layer 1 count", { printBody: true });

// Also fetch the service description text if present (top-level MapServer info
// often states which layer is "official"/current).
const svcInfo = await getJson(`${BASE}?f=json`, "service info (description/serviceDescription)", { printBody: false });
if (svcInfo) {
  console.log("\ndescription:", (svcInfo.description || "").slice(0, 800));
  console.log("serviceDescription:", (svcInfo.serviceDescription || "").slice(0, 500));
  console.log("copyrightText:", svcInfo.copyrightText);
}
