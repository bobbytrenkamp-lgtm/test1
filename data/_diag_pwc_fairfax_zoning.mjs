// DISPOSABLE DIAGNOSTIC. Discovering real zoning geometry sources for
// Prince William County VA and Fairfax County VA, following the same
// methodology that found Loudoun's COL/Zoning/MapServer: query the REST
// services root of the same host family as the already-verified parcel
// service, list folders/services, then inspect layers for a real
// countywide zoning polygon layer (never trust a title search alone).
async function getJson(url, label, { printBody = false, limit = 2000 } = {}) {
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

console.log("========== PRINCE WILLIAM COUNTY VA ==========");
// Parcel service host: gisweb.pwcva.gov/arcgis/rest/services/AGOL/AGOL/MapServer/13
// Enrichment host: gisweb.pwcva.gov/arcgis/rest/services/GTS/Cadastral/MapServer/5
const pwcRoot = await getJson("https://gisweb.pwcva.gov/arcgis/rest/services?f=json", "PWC REST services root", { printBody: true, limit: 4000 });
if (pwcRoot && pwcRoot.folders) {
  console.log("\nfolders:", pwcRoot.folders.join(", "));
}
// Try likely folder names directly.
for (const folder of ["Zoning", "Planning", "GTS", "AGOL"]) {
  await getJson(`https://gisweb.pwcva.gov/arcgis/rest/services/${folder}?f=json`, `PWC folder: ${folder}`, { printBody: true, limit: 3000 });
}

console.log("\n\n========== FAIRFAX COUNTY VA ==========");
// Parcel service host: www.fairfaxcounty.gov/mercator/rest/services/OpenData/OpenData_A9/FeatureServer/0
const ffxRoot = await getJson("https://www.fairfaxcounty.gov/mercator/rest/services?f=json", "Fairfax REST services root", { printBody: true, limit: 4000 });
if (ffxRoot && ffxRoot.folders) {
  console.log("\nfolders:", ffxRoot.folders.join(", "));
}
for (const folder of ["OpenData", "Zoning", "Planning"]) {
  await getJson(`https://www.fairfaxcounty.gov/mercator/rest/services/${folder}?f=json`, `Fairfax folder: ${folder}`, { printBody: true, limit: 3000 });
}
