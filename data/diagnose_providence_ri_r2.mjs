// Temporary diagnostic, round 2: Providence County RI parcel service.
//
// Round 1 found no unified Providence-County-wide service. Rhode
// Island counties have no county government (they're just
// census/judicial boundaries), so parcel data is published town-by-
// town via vendors like AxisGIS - not aggregated at the county level.
// Round 1's "CT" naming in several results ("City of Providence CT
// Parcels", "East Providence CT Parcels", "Cranston CT Parcels")
// looked initially like a Connecticut false-positive risk, but East
// Providence and Cranston are genuine Rhode Island municipalities (no
// Connecticut town shares those names), so "CT" is likely a vendor's
// internal naming convention, not the state abbreviation.
//
// This round searches more specifically for a genuine RIGIS (Rhode
// Island Geographic Information System) statewide parcels layer that
// might support county-level filtering via a where clause, following
// the precedent already used this session for NJ (Hudson/Middlesex)
// and Hawaii (Honolulu).
//
// Deleted once Providence County RI is either added or documented as
// unavailable.

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
      if (Array.isArray(body.results)) {
        console.log('ArcGIS Online results:', body.results.length);
        for (const r of body.results.slice(0, 10)) {
          console.log('  -', r.title, '|', r.type, '|', r.owner, '|', r.url || '(no url)');
        }
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
        console.log('Fields:', body.fields.map(f => `${f.name}(${f.type})`).join(', '));
      }
      if (body.name) console.log('Layer name:', body.name);
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
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

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=title:%22Rhode%20Island%20Statewide%20Parcels%22&f=json',
  'ArcGIS Online item search - title Rhode Island Statewide Parcels'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=owner:RIGIS_RI&f=json',
  'ArcGIS Online item search - owner RIGIS_RI'
);

await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=%22e911%20sites%20and%20structures%22%20OR%20%22RI%20parcels%22&f=json',
  'ArcGIS Online item search - RI parcels E911'
);

await fetchJson(
  'https://gis.rigis.org/arcgis/rest/services?f=json',
  'RIGIS own ArcGIS REST services directory (direct URL guess)'
);

await fetchJson(
  'https://www.rigis.org/api/feed/dcat-us/1.1.json',
  'RIGIS open data portal - DCAT catalog (direct URL guess)'
);

console.log('\nDone.');
