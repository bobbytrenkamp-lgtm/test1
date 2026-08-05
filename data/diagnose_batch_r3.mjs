// Temporary diagnostic, round 3 -- follow-up on round 2's findings.
//
// Mecklenburg NC: round 2's ArcGIS Online search surfaced a genuine,
// county-government-owned ("MecklenburgCoNC") Feature Service, "Tax
// Parcel Boundaries", far more promising than the thin
// gis.charlottenc.gov layer -- fetch its real field schema and a
// sample record to confirm before wiring in.
//
// Denver CO: round 2's blind ArcGIS Online org listing (services1.
// arcgis.com/zdB7qR0BtYrg0Xpl) returned hundreds of services with no
// obvious parcel match in the truncated output -- this round does a
// properly scoped ArcGIS Online item search instead (org-filtered,
// "parcel"/"cadastral" keyword) to find the right one directly.
//
// Jackson County MO: round 2's 3 folder guesses (ParcelViewer,
// Land_Records_Management, Auditor) were dead ends (404/404/wrong
// layer) -- not retried this round.
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
      console.log('Body (truncated 3500):', JSON.stringify(body).slice(0, 3500));
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

// Mecklenburg NC: real schema + sample record for the county-owned
// "Tax Parcel Boundaries" service.
await fetchJson(
  'https://meckgis.mecklenburgcountync.gov/server/rest/services/TaxParcelBoundaries/FeatureServer/0?f=json',
  'Mecklenburg TaxParcelBoundaries: layer schema'
);
await fetchJson(
  'https://meckgis.mecklenburgcountync.gov/server/rest/services/TaxParcelBoundaries/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=1&f=json',
  'Mecklenburg TaxParcelBoundaries: sample record'
);

// Denver CO: targeted ArcGIS Online item search, org-scoped.
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=%22Denver%22%20AND%20(parcel%20OR%20cadastral%20OR%20assessor)&f=json&num=15',
  'Denver ArcGIS Online search: parcel/cadastral/assessor'
);
await fetchJson(
  'https://www.arcgis.com/sharing/rest/search?q=orgid%3AzdB7qR0BtYrg0Xpl%20AND%20parcel&f=json&num=15',
  'Denver ArcGIS Online search: org-scoped q=parcel'
);
