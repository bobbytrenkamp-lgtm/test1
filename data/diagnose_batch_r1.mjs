// Temporary diagnostic, batch round 1: quick-win reuse checks for the next
// 3 highest-priority counties in the parcel coverage queue, each of which
// can likely reuse an ALREADY-PROVEN-LIVE registry service rather than
// needing fresh discovery:
//
// - Essex County NJ (34013): the statewide Cadastral service already used
//   for Hudson County NJ (maps.nj.gov/.../Framework/Cadastral/MapServer/0,
//   where: "COUNTY = 'HUDSON'") should also cover Essex via
//   where: "COUNTY = 'ESSEX'".
// - Baltimore City MD (24510) and Prince George's County MD (24033): the
//   statewide MD_ParcelBoundaries service already used (with NO where
//   filter) for Montgomery County MD and Howard County MD is described in
//   its own attribution as Maryland's full statewide parcel layer — a
//   bbox query within each county's location should confirm real parcel
//   data exists there too, with the exact same fieldMap already verified
//   for Montgomery/Howard.
//
// Deleted once this round's findings are wired into the registry or
// documented as unavailable.

const TIMEOUT_MS = 25000;

async function fetchJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const elapsed = Date.now() - start;
    const status = res.status;
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`HTTP ${status} in ${elapsed}ms`);
    if (body) {
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (Array.isArray(body.features)) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features.slice(0, 2)) {
          console.log('  attributes:', JSON.stringify(f.attributes));
        }
      }
    } else {
      console.log('Body (text, first 300 chars):', text.slice(0, 300));
    }
    return { ok: true, status, body, text };
  } catch (e) {
    const elapsed = Date.now() - start;
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`FAILED after ${elapsed}ms: ${e.message || e}`);
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

// ── Essex County NJ via the Hudson-proven statewide Cadastral service ──
await fetchJson(
  "https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0/query?where=COUNTY+%3D+'ESSEX'&outFields=*&resultRecordCount=1&f=json",
  "NJ statewide Cadastral - where COUNTY='ESSEX'"
);

// ── Baltimore City MD via the Montgomery/Howard-proven statewide MD service ──
// Bounding box roughly covering Baltimore City (WGS84 lon/lat envelope).
await fetchJson(
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0/query?" +
  "geometry=-76.71%2C39.20%2C-76.53%2C39.37&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects" +
  "&outFields=*&resultRecordCount=2&f=json",
  "MD statewide ParcelBoundaries - bbox over Baltimore City"
);

// ── Prince George's County MD via the same statewide MD service ──
await fetchJson(
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0/query?" +
  "geometry=-77.05%2C38.70%2C-76.70%2C39.00&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects" +
  "&outFields=*&resultRecordCount=2&f=json",
  "MD statewide ParcelBoundaries - bbox over Prince George's County"
);

console.log('\nDone.');
