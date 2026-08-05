// Temporary diagnostic, round 3: Denver County CO parcel service.
//
// Round 1 (2026-08-03) found direct URL guesses at Denver's GIS host
// failed outright, with gis.denvergov.org returning a raw fetch
// failure (not a 404) - meaning reachability was never actually
// confirmed one way or the other. Round 2 enumerated Denver's real
// ArcGIS Online org (210919_geospatialDenver, confirmed genuine) in
// full (101 items) but every parcel-related dataset in it is a
// derived planning-department analysis layer (e.g. "Single Family
// Residential Parcels - Building Size"), not a general-purpose
// cadastral/parcel boundary service with owner/address/land-use/
// value attributes.
//
// This round: (a) retries gis.denvergov.org directly with a few
// common ArcGIS REST root/folder guesses, to determine whether that
// host is reachable at all from GitHub Actions network, and (b)
// checks Denver's Open Data Catalog (data.denvergov.org) DCAT feed,
// which is more human-browsable and may surface a base assessor/
// cadastral layer that ArcGIS Online owner-searches missed.
//
// Deleted once Denver County CO is either added or re-documented as
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
      if (Array.isArray(body.folders)) console.log('Folders:', body.folders.join(', '));
      if (Array.isArray(body.services)) console.log('Services:', body.services.map(s => `${s.name} (${s.type})`).join(', '));
      if (Array.isArray(body.dataset)) {
        console.log('Dataset count:', body.dataset.length);
        const hits = body.dataset.filter(d =>
          /parcel|property|cadastral|assessor/i.test(d.title || '') ||
          /parcel|property|cadastral|assessor/i.test(d.description || '')
        );
        console.log('Parcel-ish hits:', hits.length);
        for (const h of hits.slice(0, 15)) {
          console.log('  -', h.title);
          const dist = (h.distribution || []).map(d => d.accessURL || d.downloadURL).filter(Boolean);
          for (const u of dist) console.log('     dist:', u);
        }
      }
      if (body.fields) {
        console.log('Field count:', body.fields.length);
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

// (a) Direct reachability + common REST root/folder guesses at Denver's own GIS host.
await fetchJson('https://gis.denvergov.org/arcgis/rest/services?f=json', 'gis.denvergov.org - ArcGIS REST services root');
await fetchJson('https://gis.denvergov.org/arcgis/rest/services/Parcels?f=json', 'gis.denvergov.org - Parcels folder (guess)');
await fetchJson('https://gis.denvergov.org/arcgis/rest/services/Assessor?f=json', 'gis.denvergov.org - Assessor folder (guess)');
await fetchJson('https://gis.denvergov.org/', 'gis.denvergov.org - bare host root (reachability check)');

// (b) Denver's Open Data Catalog DCAT feed.
await fetchJson('https://data.denvergov.org/api/feed/dcat-us/1.1.json', 'Denver Open Data Catalog - DCAT catalog');
await fetchJson('https://denvergov.org/opendata/api/feed/dcat-us/1.1.json', 'Denver Open Data (alt host) - DCAT catalog');

console.log('\nDone.');
