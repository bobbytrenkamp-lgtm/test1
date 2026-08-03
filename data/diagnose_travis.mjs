// Temporary diagnostic, round 2: Travis County TX / Austin parcel service.
//
// Round 1's blind subdomain guesses mostly failed: gis.traviscad.org and
// maps.traviscad.org didn't even resolve (DNS failure), tnris.org and
// data.austintexas.gov resolved but 404'd at the guessed paths. One real
// signal: gis.traviscountytx.gov resolved with a normal IIS 404 (not a
// DNS failure), meaning the host is real, just not at /arcgis/rest/services.
//
// A web search (this sandbox can search but can't fetch) surfaced the
// real, specific candidates instead of more blind guessing:
//   - gis.traviscountytx.gov/server1/rest/services/... (note "server1",
//     not "arcgis" -- explains round 1's 404 on that host)
//   - taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer
//     (DBO.Parcels layer)
//   - TCAD's own site is traviscad.org/maps and traviscad.org/propertysearch,
//     which search results describe as a "prodigycad.com"-hosted map tool
//     (travis.prodigycad.com/maps) -- a third-party CAMA vendor product,
//     not a self-hosted ArcGIS REST service, so not probed here.
// This round fetches the specific real endpoints found.
//
// Deleted once Travis County is either added or documented as unavailable.

const TIMEOUT_MS = 25000;

async function fetchText(url, label) {
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
      console.log('Body (JSON keys):', Object.keys(body));
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.layers) {
        console.log('Sub-layers:', body.layers.map(l => `${l.id}:${l.name}`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 400));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
      if (body.features) {
        console.log('Feature count:', body.features.length);
        for (const f of body.features.slice(0, 3)) {
          console.log('  attributes:', JSON.stringify(f.attributes));
        }
      }
    } else {
      console.log('Body (text, first 500 chars):', text.slice(0, 500));
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

await fetchText(
  'https://gis.traviscountytx.gov/server1/rest/services/Boundaries_and_Jurisdictions/TCAD_public/MapServer/0?f=json',
  'TCAD_public layer 0 (search result: "Layer: TCAD Parcels")'
);

await fetchText(
  'https://gis.traviscountytx.gov/server1/rest/services/Boundaries_and_Jurisdictions/TCAD/MapServer?f=json',
  'TCAD MapServer root'
);

await fetchText(
  'https://gis.traviscountytx.gov/server1/rest/services/Boundaries_and_Jurisdictions/TCAD_Travis_County_Property/MapServer?f=json',
  'TCAD_Travis_County_Property MapServer root'
);

await fetchText(
  'https://taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer?f=json',
  'taxmaps.traviscountytx.gov Parcels MapServer root'
);

console.log('\nDone.');
