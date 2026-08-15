// DISPOSABLE DIAGNOSTIC — Fairfax County VA zoning, round 4.
// Rounds 1-3 (see zoning_config.py's Fairfax entry comment) exhaustively
// enumerated Fairfax's ArcGIS REST folder catalog
// (www.fairfaxcounty.gov/mercator/rest/services) with no zoning geometry
// service found. This round tries three different real-world discovery
// paths instead of more folder guessing: (a) the open data portal's own
// DCAT catalog feed (a W3C standard many ArcGIS Hub sites expose, listing
// every dataset with a real resolvable URL -- more reliable than guessing
// folder names), (b) a direct ArcGIS Online public search for
// Fairfax-owned zoning items, (c) the open data portal's Hub search API.
async function getJson(url, label, { printBody = false, limit = 4000 } = {}) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" } });
    const text = await res.text();
    console.log(`\n--- ${label} ---`);
    console.log("url:", url);
    console.log("status:", res.status, "content-type:", res.headers.get("content-type"), "bytes:", text.length);
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

// (a) DCAT catalog feed -- lists every dataset the portal publishes with
// real resolvable distribution URLs, regardless of internal folder naming.
const dcat = await getJson(
  "https://opendata.fairfaxcounty.gov/api/feed/dcat-us/1.1.json",
  "Fairfax open data DCAT-US catalog feed", { printBody: false }
);
if (dcat && dcat.dataset) {
  console.log("\ntotal datasets in catalog:", dcat.dataset.length);
  const zoningDatasets = dcat.dataset.filter((d) =>
    /zon(e|ing)/i.test(d.title || "") || /zon(e|ing)/i.test(d.description || "")
  );
  console.log("datasets matching /zon(e|ing)/i in title or description:", zoningDatasets.length);
  for (const d of zoningDatasets.slice(0, 10)) {
    console.log(`\n  title: ${d.title}`);
    console.log(`  identifier: ${d.identifier}`);
    console.log(`  landingPage: ${d.landingPage}`);
    if (d.distribution) {
      for (const dist of d.distribution) {
        console.log(`    distribution: format=${dist.format} accessURL=${dist.accessURL || dist.downloadURL}`);
      }
    }
  }
}

// (b) Direct ArcGIS Online public search for Fairfax-owned zoning items.
await getJson(
  "https://www.arcgis.com/sharing/rest/search?q=zoning%20fairfax%20county%20virginia&f=json&num=15",
  "ArcGIS Online public search: zoning fairfax county virginia", { printBody: true, limit: 5000 }
);

// (c) The open data portal's own Hub search API (different from the
// generic ArcGIS Hub API path already tried in earlier VCGI/PWC rounds).
await getJson(
  "https://opendata.fairfaxcounty.gov/api/search/v1?q=zoning",
  "Fairfax open data Hub search API v1", { printBody: true, limit: 4000 }
);
