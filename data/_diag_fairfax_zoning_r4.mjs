// DISPOSABLE DIAGNOSTIC — Fairfax County VA zoning, round 5.
// Round 4 found the real service via ArcGIS Online item search (not
// discoverable via Fairfax's own REST folder catalog because it's hosted
// on ArcGIS Online's shared infrastructure, a different host):
//   https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services/Zoning/FeatureServer
// owner FX.AuthData (Fairfax's official AGOL org), contentStatus
// "public_authoritative", description: "Approved zoning districts for
// Fairfax County, Town of Herndon, and Town of Vienna. This layer contains
// the zoning code, the zoning category, the jurisdiction, a proffer flag,
// and a public land flag." This round inspects the real layer metadata.
async function getJson(url, label, { printBody = false, limit = 3000 } = {}) {
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

const BASE = "https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services/Zoning/FeatureServer";

const svc = await getJson(`${BASE}?f=json`, "FeatureServer metadata", { printBody: true, limit: 2500 });
if (svc && svc.layers) {
  console.log("\nlayers:", svc.layers.map((l) => `${l.id}:${l.name}`).join(", "));
}

const layer0 = await getJson(`${BASE}/0?f=json`, "layer 0 metadata", { printBody: false });
if (layer0 && layer0.fields) {
  console.log("\nfield names:", layer0.fields.map((f) => `${f.name}(${f.type})`).join(", "));
  console.log("geometryType:", layer0.geometryType);
  const zoningField = layer0.fields.find((f) => /zon/i.test(f.name));
  if (zoningField && zoningField.domain) {
    console.log("\nzoning-related field domain:", JSON.stringify(zoningField.domain).slice(0, 2000));
  }
}

await getJson(`${BASE}/0/query?where=1%3D1&returnCountOnly=true&f=json`, "layer 0 count", { printBody: true });

await getJson(`${BASE}/0/query?where=1%3D1&outFields=*&resultRecordCount=3&f=geojson`,
  "layer 0 sample (3 records)", { printBody: true, limit: 3000 });
