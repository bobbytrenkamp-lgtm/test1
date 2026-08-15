// DISPOSABLE DIAGNOSTIC — Fairfax County VA zoning, round 6.
// Round 5 confirmed the real service (services1.arcgis.com/ioennV6PpG5Xodq0/
// .../Zoning/FeatureServer, layer 0 "Zoning", 6,440 features, fields
// ZONECODE/PROFFER/ZONETYPE/PUBLIC_LAND/JURISDICTION, geometryType
// esriGeometryPolygon) but that count spans THREE jurisdictions merged into
// one layer via the JURISDICTION field: "FAIRFAX COUNTY", and (per the
// service description) Town of Herndon and Town of Vienna. This round
// gets the Fairfax-County-only feature count and the real distinct
// ZONECODE/ZONETYPE values for that jurisdiction only, so zoning_config.py
// can filter with a where clause instead of ingesting town codes as if they
// were county codes, and so expected_min_features reflects a real verified
// number rather than a guess.
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

const LAYER = "https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services/Zoning/FeatureServer/0";

// Distinct JURISDICTION values actually present (confirms exact string to filter on).
await getJson(
  `${LAYER}/query?where=1%3D1&outFields=JURISDICTION&returnDistinctValues=true&returnGeometry=false&f=json`,
  "distinct JURISDICTION values", { printBody: true }
);

// Fairfax-County-only feature count.
await getJson(
  `${LAYER}/query?where=JURISDICTION%3D%27FAIRFAX+COUNTY%27&returnCountOnly=true&f=json`,
  "Fairfax County-only count", { printBody: true }
);

// Fairfax-County-only distinct ZONECODE values.
await getJson(
  `${LAYER}/query?where=JURISDICTION%3D%27FAIRFAX+COUNTY%27&outFields=ZONECODE&returnDistinctValues=true&returnGeometry=false&orderByFields=ZONECODE&f=json`,
  "Fairfax County-only distinct ZONECODE values", { printBody: true, limit: 6000 }
);

// Fairfax-County-only distinct ZONETYPE values (category-level grouping, not a per-code name).
await getJson(
  `${LAYER}/query?where=JURISDICTION%3D%27FAIRFAX+COUNTY%27&outFields=ZONETYPE&returnDistinctValues=true&returnGeometry=false&f=json`,
  "Fairfax County-only distinct ZONETYPE values", { printBody: true }
);

// Confirm no null/empty ZONECODE records slip through for the county filter.
await getJson(
  `${LAYER}/query?where=JURISDICTION%3D%27FAIRFAX+COUNTY%27+AND+(ZONECODE+IS+NULL+OR+ZONECODE%3D%27%27)&returnCountOnly=true&f=json`,
  "Fairfax County-only null/empty ZONECODE count", { printBody: true }
);
