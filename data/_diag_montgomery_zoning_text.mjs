// DISPOSABLE DIAGNOSTIC — round 2.
// Round 1 got real primary-source content from the county's own press
// release confirming ZTA 26-01's substance, but codelibrary.amlegal.com
// (the actual ordinance text/use table) returned HTTP 403 (site-level bot
// block, not the sandbox egress proxy -- the Actions runner reached it).
// Trying the parcel service's own ZONING field domain instead -- ArcGIS
// services often expose a full coded-value list (code + full name) for a
// domain-constrained field, which would be a real, structured, primary
// source for Maryland's zoning codes without needing to scrape the
// ordinance HTML at all.
async function getJson(url, label, { printBody = false, limit = 4000 } = {}) {
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

const meta = await getJson(
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0?f=json",
  "MD_ParcelBoundaries layer 0 full metadata", { printBody: false }
);
if (meta && meta.fields) {
  const zoningField = meta.fields.find((f) => f.name === "ZONING");
  console.log("\nZONING field definition:", JSON.stringify(zoningField, null, 2));
  if (zoningField && zoningField.domain) {
    console.log("\nZONING domain type:", zoningField.domain.type);
    if (zoningField.domain.codedValues) {
      console.log("codedValues count:", zoningField.domain.codedValues.length);
      for (const cv of zoningField.domain.codedValues) console.log(`  ${cv.code} -> ${cv.name}`);
    }
  } else {
    console.log("\nNo domain on ZONING field (free-text, not a coded-value list).");
  }
}

// Also try a distinct-values query restricted to Montgomery County (JURSCODE)
// as a fallback if there's no field domain -- real values actually in use,
// even without full names attached.
const distinct = await getJson(
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0/query?" +
  "where=JURSCODE%3D%27MONT%27&outFields=ZONING&returnDistinctValues=true&orderByFields=ZONING&f=json",
  "Distinct ZONING values for Montgomery County (JURSCODE=MONT)", { printBody: true, limit: 4000 }
);

// One more ordinance-text attempt via a mirror/alternate host that sometimes
// isn't behind the same bot-block as codelibrary.amlegal.com's dynamic pages.
await getJson(
  "https://www.montgomerycountymd.gov/DPS/Resources/Files/permitting_files/zoning/Zoning_Ordinance.pdf",
  "Alternate: county DPS-hosted zoning ordinance PDF (if it exists)", { printBody: false }
);
