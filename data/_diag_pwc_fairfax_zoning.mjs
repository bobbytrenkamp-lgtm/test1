// DISPOSABLE DIAGNOSTIC — round 2.
// Round 1 found: PWC has Planning/Zoning MapServer (real lead, not yet
// inspected). Fairfax's Zoning/Planning folders 404'd, but DPZ (Department
// of Planning and Zoning) was never probed -- the obvious real candidate.
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

console.log("========== PRINCE WILLIAM COUNTY VA — Planning/Zoning/MapServer ==========");
const pwcZoningSvc = await getJson("https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer?f=json",
  "PWC Planning/Zoning MapServer metadata", { printBody: true, limit: 3000 });
if (pwcZoningSvc && pwcZoningSvc.layers) {
  console.log("\nlayers:", pwcZoningSvc.layers.map((l) => `${l.id}:${l.name}`).join(", "));
}
// Inspect the most promising layer (id 0, or whichever name contains "zoning").
if (pwcZoningSvc && pwcZoningSvc.layers && pwcZoningSvc.layers.length) {
  const zoningLayer = pwcZoningSvc.layers.find((l) => /zoning/i.test(l.name)) || pwcZoningSvc.layers[0];
  const layerMeta = await getJson(`https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/${zoningLayer.id}?f=json`,
    `PWC layer ${zoningLayer.id} (${zoningLayer.name}) metadata`, { printBody: false });
  if (layerMeta && layerMeta.fields) {
    console.log("\nfield names:", layerMeta.fields.map((f) => `${f.name}(${f.type})`).join(", "));
    console.log("geometryType:", layerMeta.geometryType);
  }
  await getJson(`https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/${zoningLayer.id}/query?where=1%3D1&returnCountOnly=true&f=json`,
    `PWC layer ${zoningLayer.id} count`, { printBody: true });
  await getJson(`https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer/${zoningLayer.id}/query?where=1%3D1&outFields=*&resultRecordCount=3&f=geojson`,
    `PWC layer ${zoningLayer.id} sample (3 records)`, { printBody: true, limit: 2500 });
}

console.log("\n\n========== FAIRFAX COUNTY VA — DPZ folder ==========");
const ffxDpz = await getJson("https://www.fairfaxcounty.gov/mercator/rest/services/DPZ?f=json",
  "Fairfax DPZ folder", { printBody: true, limit: 3000 });
