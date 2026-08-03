/* TEMPORARY diagnostic script — to be removed after use.
 * Investigates a replacement for the dead Maryland parcel endpoint
 * (geodata.md.gov MD_ParcelBoundaries, HTTP 503 since 2026-07-31).
 * Runs on a GitHub Actions runner with real outbound network (this dev
 * sandbox cannot reach arcgis.com/*.md.gov directly).
 */
const TIMEOUT_MS = 20000;

async function fetchJson(url, label) {
  console.log(`\n── ${label}`);
  console.log(`   ${url}`);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const resp = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (diagnostic probe)' } });
    clearTimeout(t);
    console.log(`   HTTP ${resp.status}`);
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    if (json && json.error) {
      console.log(`   ERROR: ${JSON.stringify(json.error).slice(0, 300)}`);
      return null;
    }
    if (json) {
      console.log(`   OK — keys: ${Object.keys(json).slice(0, 15).join(', ')}`);
      return json;
    }
    console.log(`   NON-JSON (${text.length} chars): ${text.slice(0, 200)}`);
    return null;
  } catch (e) {
    console.log(`   FETCH FAILED: ${e.message}`);
    return null;
  }
}

async function main() {
  // 1. Candidate direct-service URLs (alternate hostname vs. the known-dead one)
  const candidates = [
    ['https://geodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0?f=json', 'CURRENT (known dead) — geodata.md.gov'],
    ['https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0?f=json', 'ALTERNATE hostname — mdgeodata.md.gov'],
  ];
  for (const [url, label] of candidates) {
    const j = await fetchJson(url, label);
    if (j && j.fields) {
      console.log(`   FIELDS (${j.fields.length}): ${j.fields.map(f => f.name).join(', ')}`);
    }
  }

  // 2. Search the ArcGIS Online catalog for the Hub-hosted version of this
  //    dataset — hosted feature layers are generally far more reliable than
  //    an agency's own on-prem MapServer, which is what's currently down.
  const searchUrl = 'https://www.arcgis.com/sharing/rest/search?' +
    new URLSearchParams({
      q: 'title:"Maryland Parcel Boundaries" AND owner:Maryland',
      f: 'json',
      num: '10',
    });
  const search = await fetchJson(searchUrl, 'ArcGIS Online catalog search');
  if (search && search.results) {
    for (const r of search.results) {
      console.log(`   RESULT: id=${r.id} title="${r.title}" type=${r.type} owner=${r.owner}`);
      console.log(`     url=${r.url || '(none — not a hosted service item)'}`);
      console.log(`     modified=${new Date(r.modified).toISOString()}`);
    }
    // Probe the first hosted-service result's layer 0 directly
    const svc = search.results.find(r => r.url && /FeatureServer|MapServer/.test(r.url));
    if (svc) {
      await fetchJson(`${svc.url}/0?f=json`, `Hosted service layer 0 — ${svc.title}`);
    }
  } else {
    console.log('   No results or search failed.');
  }

  // 3. Also check the county-only alternative some MD counties run
  //    independently of the statewide feed, in case a per-county fallback
  //    is more reliable than either statewide option.
  const perCounty = [
    ['https://gis.howardcountymd.gov/arcgis/rest/services', 'Howard County GIS services root (discovery)'],
    ['https://gis.montgomerycountymd.gov/arcgis/rest/services', 'Montgomery County GIS services root (discovery)'],
  ];
  for (const [url, label] of perCounty) {
    await fetchJson(url + '?f=json', label);
  }

  console.log('\n══ DONE ══');
}

main();
