// DISPOSABLE DIAGNOSTIC — round 2. Round 1's exact-title ArcGIS Online search
// returned 0 results and the Hub v3 slug lookup returned only 668 bytes with
// no printed content. This round broadens the search and prints full bodies.
async function getJson(url, label, { printBody = false } = {}) {
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
    if (printBody && parsed) console.log("body:", JSON.stringify(parsed, null, 2).slice(0, 3000));
    return parsed;
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "FETCH ERROR:", e.message);
    return null;
  }
}

// 1. Broader ArcGIS Online search — no exact title match, just keyword + owner.
const s1 = await getJson(
  "https://www.arcgis.com/sharing/rest/search?q=" + encodeURIComponent("parcel owner:VCGI") + "&f=json&num=20",
  "search: parcel owner:VCGI"
);
if (s1 && s1.results) {
  console.log(`found ${s1.results.length} result(s):`);
  for (const r of s1.results) console.log(`- id=${r.id} title="${r.title}" type=${r.type} owner=${r.owner}`);
}

// 2. Even broader — just "parcel" + "vermont", any owner.
const s2 = await getJson(
  "https://www.arcgis.com/sharing/rest/search?q=" + encodeURIComponent('parcel AND vermont') + "&f=json&num=20",
  "search: parcel AND vermont (any owner)"
);
if (s2 && s2.results) {
  console.log(`found ${s2.results.length} result(s):`);
  for (const r of s2.results) console.log(`- id=${r.id} title="${r.title}" type=${r.type} owner=${r.owner}`);
}

// 3. Hub v3 slug lookup, full body this time.
await getJson(
  "https://hub.arcgis.com/api/v3/datasets?filter[slug]=VCGI::vt-data-statewide-standardized-parcel-data-parcel-polygons-1",
  "Hub v3 datasets by slug (full body)",
  { printBody: true }
);

// 4. Vermont's own open-data DCAT feed — a well-known ArcGIS Hub pattern that
// lists every dataset with a real, direct downloadURL per distribution.
const dcat = await getJson(
  "https://geodata.vermont.gov/api/feed/dcat-us/1.1.json",
  "Vermont geodata.vermont.gov DCAT-US 1.1 feed"
);
if (dcat && Array.isArray(dcat.dataset)) {
  console.log(`\nDCAT feed has ${dcat.dataset.length} datasets total`);
  const parcelHits = dcat.dataset.filter(d =>
    /parcel/i.test(d.title || "") || /parcel/i.test(d.description || ""));
  console.log(`${parcelHits.length} dataset(s) match /parcel/i in title or description:`);
  for (const d of parcelHits.slice(0, 5)) {
    console.log(`\n  title: ${d.title}`);
    console.log(`  identifier: ${d.identifier}`);
    console.log(`  landingPage: ${d.landingPage}`);
    if (Array.isArray(d.distribution)) {
      for (const dist of d.distribution) {
        console.log(`  distribution: format=${dist.format} mediaType=${dist.mediaType} downloadURL=${dist.downloadURL}`);
      }
    }
  }
}
