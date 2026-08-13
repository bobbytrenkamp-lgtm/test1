// DISPOSABLE DIAGNOSTIC — deleted once findings are captured.
// Checks whether FEMA's National Risk Index is reachable via the Esri-hosted
// ArcGIS FeatureServer (services.arcgis.com/XG15cJAlne2vxtgt/...) as an
// alternative to the hazards.fema.gov CSV download, which is confirmed
// blocked (HTTP 403, WAF-style) from GitHub Actions runners as of 2026-08-13.
const CANDIDATES = [
  {
    label: "NRI Counties FeatureServer (arcgis.com hosted)",
    metaUrl: "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0?f=json",
    countUrl: "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json",
    sampleUrl: "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query?where=1%3D1&outFields=*&resultRecordCount=2&f=json",
  },
];

async function check(url, label) {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" } });
    const elapsed = Date.now() - start;
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    console.log(`\n--- ${label} ---`);
    console.log("url:", url);
    console.log("status:", res.status, "elapsed_ms:", elapsed, "bytes:", text.length);
    if (parsed) {
      console.log("json_top_level_keys:", Object.keys(parsed));
      if (parsed.error) console.log("error:", JSON.stringify(parsed.error));
    } else {
      console.log("body_snippet:", text.slice(0, 500));
    }
    return { url, status: res.status, elapsed, bytes: text.length, parsed };
  } catch (e) {
    const elapsed = Date.now() - start;
    console.log(`\n--- ${label} ---`);
    console.log("url:", url);
    console.log("FETCH ERROR:", e.message, "elapsed_ms:", elapsed);
    return { url, error: e.message, elapsed };
  }
}

for (const c of CANDIDATES) {
  await check(c.metaUrl, c.label + " [metadata]");
  await check(c.countUrl, c.label + " [count]");
  const sample = await check(c.sampleUrl, c.label + " [sample 2 records]");
  if (sample.parsed && sample.parsed.features) {
    console.log("\nSAMPLE FEATURE ATTRIBUTES (field names):");
    console.log(JSON.stringify(sample.parsed.features[0]?.attributes, null, 2));
  }
}

// Also re-confirm the existing CSV download is still blocked (control).
await check(
  "https://hazards.fema.gov/nri/Content/StaticDocuments/DataDownload/NRI_Table_Counties/NRI_Table_Counties.csv",
  "CONTROL: existing hazards.fema.gov CSV (expected still 403)"
);
