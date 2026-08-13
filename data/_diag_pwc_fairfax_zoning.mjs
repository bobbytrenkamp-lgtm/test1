// DISPOSABLE DIAGNOSTIC — round 3.
// Round 2 found PWC's Planning/Zoning/MapServer has 14 layers including
// real targets: 5="Zoning Districts", 7="Overlay District Data Center
// Opportunity Zone" -- but the script's find() picked the wrong layer
// (13="Zoning Appeals Variances", also matched /zoning/i and came first in
// array order). This round explicitly targets layers 5 and 7. Also
// probing Fairfax's GIS/OPA/LDS folders since DPZ only had a comp-plan
// layer, not zoning.
async function getJson(url, label, { printBody = false, limit = 2500 } = {}) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" } });
    const text = await res.text();
    console.log(`\n--- ${label} ---`);
    console.log("url:", url);
    console.log("status:", res.status, "bytes:", text.length);
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

console.log("========== PRINCE WILLIAM COUNTY VA — layer 5 (Zoning Districts) ==========");
const l5 = await getJson("https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/5?f=json",
  "layer 5 metadata", { printBody: false });
if (l5 && l5.fields) {
  console.log("\nfield names:", l5.fields.map((f) => `${f.name}(${f.type})`).join(", "));
  console.log("geometryType:", l5.geometryType);
}
await getJson("https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/5/query?where=1%3D1&returnCountOnly=true&f=json",
  "layer 5 count", { printBody: true });
await getJson("https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/5/query?where=1%3D1&outFields=*&resultRecordCount=3&f=geojson",
  "layer 5 sample (3 records)", { printBody: true, limit: 3000 });

console.log("\n\n========== PRINCE WILLIAM COUNTY VA — layer 7 (Data Center Opportunity Zone overlay) ==========");
const l7 = await getJson("https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/7?f=json",
  "layer 7 metadata", { printBody: false });
if (l7 && l7.fields) {
  console.log("\nfield names:", l7.fields.map((f) => `${f.name}(${f.type})`).join(", "));
}
await getJson("https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/7/query?where=1%3D1&returnCountOnly=true&f=json",
  "layer 7 count", { printBody: true });
await getJson("https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/7/query?where=1%3D1&outFields=*&resultRecordCount=3&f=geojson",
  "layer 7 sample (3 records)", { printBody: true, limit: 3000 });

console.log("\n\n========== FAIRFAX COUNTY VA — GIS / OPA / LDS folders ==========");
for (const folder of ["GIS", "OPA", "LDS"]) {
  await getJson(`https://www.fairfaxcounty.gov/mercator/rest/services/${folder}?f=json`,
    `Fairfax folder: ${folder}`, { printBody: true, limit: 3000 });
}
