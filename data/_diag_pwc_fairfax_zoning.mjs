// DISPOSABLE DIAGNOSTIC — round 4.
// Rounds 1-3 confirmed the real PWC zoning geometry service (Planning/
// Zoning/MapServer layer 5 "Zoning Districts", field ZoningDistrict, 2,227
// features) and that Fairfax has no discoverable zoning geometry service.
// Before wiring PWC live, validate_zoning.py's data-quality gate requires
// at least one real districts.json entry (it correctly blocks export with
// zero entries) -- this round fetches the REAL distinct ZoningDistrict
// values (returnGeometry=false keeps this a small, fast query) so a real,
// non-fabricated starter districts.json can be built.
async function getJson(url, label, { printBody = false, limit = 6000 } = {}) {
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

const distinct = await getJson(
  "https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/5/query?" +
  "where=1%3D1&outFields=ZoningDistrict&returnGeometry=false&returnDistinctValues=true&orderByFields=ZoningDistrict&f=json",
  "PWC layer 5 distinct ZoningDistrict values", { printBody: true, limit: 8000 }
);
if (distinct && distinct.features) {
  console.log("\ndistinct count:", distinct.features.length);
}

// Also a few real sample records with non-geometry fields only, to see
// ZoningCaseName/PROFFERS content shape for the most common codes.
await getJson(
  "https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/5/query?" +
  "where=1%3D1&outFields=ZoningDistrict,ZoningCaseNumber,ZoningCaseName&returnGeometry=false&resultRecordCount=10&f=json",
  "PWC layer 5 sample non-geometry fields (10 records)", { printBody: true, limit: 4000 }
);
