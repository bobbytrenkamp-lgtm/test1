// Temporary diagnostic, round 2 for 3 already-partially-investigated
// high-value candidates (Denver CO 62 facilities, Mecklenburg NC 39,
// Jackson MO 34) -- each has a documented dead end from an earlier
// round, and each has a specific unexplored lead worth one more try
// before falling back to either a thin partial add or leaving as
// requires-review/candidate. See data/parcel_source_catalog.json's
// notes for each FIPS for the full prior-round trail.
//
// Deleted once this round's findings are wired into the registry or
// documented as still unresolved.

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
      console.log('Body (truncated 2500):', JSON.stringify(body).slice(0, 2500));
    } else {
      console.log('Body (text, first 600 chars):', text.slice(0, 600));
    }
    return { ok: res.ok && !body?.error, status, body, text };
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

// ── Denver CO: proper Socrata discovery API (not blind DCAT guesses) ──
await fetchJson(
  'https://data.denvergov.org/api/catalog/v1?q=parcel&limit=10',
  'Denver Socrata catalog discovery API: q=parcel'
);
await fetchJson(
  'https://www.denvergov.org/media/gis/DataCatalog/parcels/shape/parcels.zip',
  'Denver GIS data catalog: direct parcels shapefile guess (existence check only)'
);
await fetchJson(
  'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services?f=json',
  'Denver ArcGIS Online org services root guess (services1, zdB7qR0BtYrg0Xpl)'
);

// ── Mecklenburg NC: broader ArcGIS Online item search for CAMA/tax terms ──
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=%22Mecklenburg%22%20AND%20(CAMA%20OR%20%22tax%20parcel%22%20OR%20assessor)&f=json&num=15',
  'Mecklenburg ArcGIS Online search: CAMA/tax parcel/assessor'
);
await fetchJson(
  'https://polaris3g.mecklenburgcountync.gov/polarisv/rest/services/Assessment/MapServer?f=json',
  'Mecklenburg polaris3g: Assessment folder guess'
);
await fetchJson(
  'https://polaris3g.mecklenburgcountync.gov/polarisv/rest/services/PropertyRecordCard/MapServer?f=json',
  'Mecklenburg polaris3g: PropertyRecordCard folder guess'
);

// ── Jackson County MO: unexplored folders under jcgis.jacksongov.org ──
await fetchJson(
  'https://jcgis.jacksongov.org/arcgis/rest/services/ParcelViewer/MapServer?f=json',
  'Jackson MO: ParcelViewer folder'
);
await fetchJson(
  'https://jcgis.jacksongov.org/arcgis/rest/services/Land_Records_Management/MapServer?f=json',
  'Jackson MO: Land_Records_Management folder'
);
await fetchJson(
  'https://jcgis.jacksongov.org/arcgis/rest/services/Auditor/MapServer?f=json',
  'Jackson MO: Auditor folder'
);
