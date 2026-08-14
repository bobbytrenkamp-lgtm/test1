// DISPOSABLE DIAGNOSTIC — Montgomery County MD, round 3.
// Round 1 got real primary-source content from the county's own press
// release (ZTA 26-01: Data Center is now a conditional use restricted to
// industrial zones). Round 2 found the parcel service's ZONING field is
// free-text (no coded-value domain) and a distinct-values query failed
// (ArcGIS DISTINCT + geometry conflict, since fixed here with
// returnGeometry=false). This round: (a) get real sample ZONING values
// actually in use for Montgomery County parcels, (b) try Montgomery's own
// GIS REST catalog directly for a zoning service (same successful pattern
// as Loudoun/PWC -- search the county's own ArcGIS Server rather than a
// statewide mirror or a blocked legal-code site).
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function getJson(url, label, { printBody = false, limit = 5000 } = {}) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" } });
    const text = await res.text();
    console.log(`\n--- ${label} ---`);
    console.log("url:", url);
    console.log("status:", res.status, "content-type:", res.headers.get("content-type"), "bytes:", text.length);
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {
      if (printBody) console.log("NOT JSON, extracted text (first", limit, "chars):\n", stripHtml(text).slice(0, limit));
      else console.log("NOT JSON, snippet:", text.slice(0, 300));
    }
    if (printBody && parsed) console.log("body:", JSON.stringify(parsed, null, 2).slice(0, limit));
    return parsed;
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "FETCH ERROR:", e.message);
    return null;
  }
}

// (a) Real distinct ZONING values in use for Montgomery County, fixed query.
await getJson(
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0/query?" +
  "where=JURSCODE%3D%27MONT%27&outFields=ZONING&returnGeometry=false&returnDistinctValues=true&orderByFields=ZONING&f=json",
  "Montgomery distinct ZONING values (returnGeometry=false)", { printBody: true, limit: 6000 }
);

// (b) Montgomery's own GIS REST catalog -- does the county publish its own
// zoning service directly, same pattern as Loudoun/PWC?
const mocoRoot = await getJson(
  "https://gis.montgomerycountymd.gov/arcgis/rest/services?f=json",
  "Montgomery County GIS REST services root", { printBody: true, limit: 4000 }
);
if (mocoRoot && mocoRoot.folders) console.log("\nfolders:", mocoRoot.folders.join(", "));

// (c) Montgomery Planning's own ArcGIS instance (separate agency, common
// in MD for planning departments to run independent GIS).
const planningRoot = await getJson(
  "https://mcatlas.org/arcgis/rest/services?f=json",
  "Montgomery Planning (mcatlas) GIS REST services root", { printBody: true, limit: 4000 }
);
if (planningRoot && planningRoot.folders) console.log("\nfolders:", planningRoot.folders.join(", "));
