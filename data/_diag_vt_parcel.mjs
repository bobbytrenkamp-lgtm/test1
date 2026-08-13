// DISPOSABLE DIAGNOSTIC — round 4. Round 3 confirmed the real layer
// (services1.arcgis.com/BkFxaEFNwHqX3tAw/.../FeatureServer/0, 343,876
// records, wkid 32145) and that the Hub download API needs spatialRefId.
// This round supplies spatialRefId and inspects response headers WITHOUT
// downloading the full (likely huge) body, to check whether it's a direct
// stream or an async job, and what its real Content-Length/type are.
const ITEM_ID = "09cf47e1cf82465e99164762a04f3ce6";

async function peek(url, label, { maxBytes = 4096 } = {}) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const res = await fetch(url, {
      headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" },
      signal: controller.signal,
    });
    console.log(`\n--- ${label} ---`);
    console.log("url:", url);
    console.log("status:", res.status, "elapsed_to_headers_ms:", Date.now() - start);
    console.log("content-type:", res.headers.get("content-type"));
    console.log("content-length:", res.headers.get("content-length"));
    console.log("content-disposition:", res.headers.get("content-disposition"));
    console.log("redirected:", res.redirected, "final url:", res.url);

    // Read only the first maxBytes of the body, then abort — enough to
    // confirm real file content (not an HTML error page) without pulling
    // a potentially huge full statewide export into this diagnostic run.
    if (res.body) {
      const reader = res.body.getReader();
      let received = 0;
      const chunks = [];
      while (received < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
      }
      controller.abort();
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      console.log("bytes_peeked:", buf.length);
      console.log("snippet:", buf.toString("utf8", 0, Math.min(500, buf.length)));
    }
    return res;
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "FETCH/ABORT ERROR:", e.message);
    return null;
  }
}

// WGS84 lon/lat (EPSG:4326) — spatialRefId is the numeric EPSG code per
// ArcGIS Hub's own download API convention.
await peek(
  `https://opendata.arcgis.com/api/v3/datasets/${ITEM_ID}_0/downloads/data?format=geojson&spatialRefId=4326&redirect=false`,
  "Hub download API (geojson, spatialRefId=4326, redirect=false) — inspect metadata only"
);

await peek(
  `https://opendata.arcgis.com/api/v3/datasets/${ITEM_ID}_0/downloads/data?format=geojson&spatialRefId=4326`,
  "Hub download API (geojson, spatialRefId=4326, default redirect) — peek first bytes only"
);
