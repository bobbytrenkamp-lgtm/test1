// Temporary diagnostic, round 1: Hamilton County OH (Cincinnati metro)
// parcel service.
//
// Next candidate in the facility-count priority queue after Middlesex
// County MA (25 facilities, tied with Allegheny County PA). Web search
// found the Cincinnati Area Geographic Information System (CAGIS) Open
// Data Hub (data-cagisportal.opendata.arcgis.com), whose own map gallery
// lists a "Hamilton County Parcel Polygons" item directly - CAGIS is
// the joint city-county GIS authority for Hamilton County OH and
// Cincinnati. NOTE: a same-named "HamCoParcelsPublic" service exists at
// gis1.hamiltoncounty.in.gov, but that's Hamilton County, INDIANA - a
// different state entirely, not a candidate here.
//
// This round checks CAGIS's own DCAT catalog for a "parcel" dataset
// distribution URL first (the pattern that has reliably surfaced the
// real ArcGIS distribution URL directly for most counties this
// session).
//
// Deleted once Hamilton County OH is either added or documented as
// unavailable.

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
      if (body.name) console.log('Layer name:', body.name);
      if (body.geometryType) console.log('Geometry type:', body.geometryType);
      if (body.description) console.log('description:', body.description.slice(0, 500));
      if (body.copyrightText) console.log('copyrightText:', body.copyrightText);
    } else {
      console.log('Body (text, first 800 chars):', text.slice(0, 800));
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

const dcat = await fetchText(
  'https://data-cagisportal.opendata.arcgis.com/api/feed/dcat-us/1.1.json',
  'CAGIS Open Data Hub own DCAT catalog'
);

if (dcat.ok && dcat.body && Array.isArray(dcat.body.dataset)) {
  const matches = dcat.body.dataset.filter(d =>
    /parcel/i.test(d.title || '') || /parcel/i.test(d.description || '')
  );
  console.log(`\nDCAT datasets matching "parcel": ${matches.length}`);
  for (const d of matches) {
    console.log(`\n--- ${d.title} ---`);
    console.log('description:', (d.description || '').slice(0, 300));
    const dist = (d.distribution || []).map(x => `${x.format}: ${x.accessURL || x.downloadURL}`);
    console.log('distribution:', dist.join(' | '));
  }
} else {
  console.log('\nDCAT catalog lookup failed or had no dataset array.');
}

console.log('\nDone.');
