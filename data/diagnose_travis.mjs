// Temporary diagnostic, round 1: Travis County TX / Austin parcel service.
//
// Next candidate in the facility-count priority queue after New York
// County NY (52). Travis County (45 facilities) is home to Austin, a
// major Texas data center market. Candidates to check:
//   1. Travis Central Appraisal District (TCAD) — the county's own
//      appraisal district, likely GIS host for parcel/CAMA data.
//   2. City of Austin's open data / GIS portal (data.austintexas.gov,
//      austin ArcGIS Online org) — sometimes county-adjacent cities
//      publish their own parcel layers.
//   3. Travis County's own GIS (traviscountytx.gov / capcog.org regional
//      GIS) as a fallback.
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

// TCAD (Travis Central Appraisal District, traviscad.org) — common ArcGIS
// hosting subdomain patterns for a county appraisal district.
await fetchText(
  'https://gis.traviscad.org/arcgis/rest/services?f=json',
  'TCAD - services directory (gis.traviscad.org guess)'
);

await fetchText(
  'https://maps.traviscad.org/arcgis/rest/services?f=json',
  'TCAD - services directory (maps.traviscad.org guess)'
);

// Travis County's own GIS.
await fetchText(
  'https://gis.traviscountytx.gov/arcgis/rest/services?f=json',
  'Travis County GIS - services directory (guess)'
);

await fetchText(
  'https://tnris.org/arcgis/rest/services?f=json',
  'TNRIS (Texas Natural Resources Info System) - services directory (guess)'
);

// City of Austin's open data / GIS hub.
await fetchText(
  'https://data.austintexas.gov/resource/data.json',
  'City of Austin open data portal - dataset catalog (Socrata, not ArcGIS)'
);

console.log('\nDone.');
