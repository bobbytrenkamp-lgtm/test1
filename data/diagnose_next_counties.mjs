/* TEMPORARY diagnostic script — to be removed after use.
 * Verifies candidate parcel-service URLs for the next batch of counties
 * (Maricopa AZ, Dallas TX, Santa Clara CA, Fulton GA) before wiring them
 * into js/parcel/registry.js. Runs on a GitHub Actions runner with real
 * outbound network (this dev sandbox cannot reach arcgis.com/*.gov).
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
      return json;
    }
    console.log(`   NON-JSON (${text.length} chars): ${text.slice(0, 200)}`);
    return null;
  } catch (e) {
    console.log(`   FETCH FAILED: ${e.message}`);
    return null;
  }
}

function printLayerInfo(j) {
  if (!j) return;
  console.log(`   OK — name="${j.name}" type=${j.type} geometryType=${j.geometryType}`);
  if (j.fields) console.log(`   FIELDS (${j.fields.length}): ${j.fields.map(f => f.name).join(', ')}`);
}

function printServiceRoot(j) {
  if (!j) return;
  if (j.layers) console.log(`   LAYERS: ${j.layers.map(l => `${l.id}:${l.name}`).join(', ')}`);
  if (j.services) console.log(`   SERVICES (${j.services.length}): ${j.services.slice(0, 20).map(s => s.name).join(', ')}`);
  if (j.folders) console.log(`   FOLDERS: ${j.folders.join(', ')}`);
}

async function main() {
  // ── Maricopa County, AZ ──
  console.log('\n════ MARICOPA COUNTY, AZ ════');
  await fetchJson('https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer?f=json', 'Service root').then(printServiceRoot);
  await fetchJson('https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0?f=json', 'Layer 0').then(printLayerInfo);

  // ── Dallas, TX (two candidates) ──
  console.log('\n════ DALLAS ════');
  await fetchJson('https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/FeatureServer?f=json', 'City of Dallas — DallasTaxParcels root').then(printServiceRoot);
  await fetchJson('https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/FeatureServer/0?f=json', 'City of Dallas — DallasTaxParcels layer 0').then(printLayerInfo);
  await fetchJson('https://maps.dcad.org/arcgis/rest/services?f=json', 'DCAD (Dallas Central Appraisal District) service directory root').then(printServiceRoot);

  // ── Santa Clara County, CA ──
  console.log('\n════ SANTA CLARA COUNTY, CA ════');
  await fetchJson('https://webgis.sccgov.org/gis/rest/services/opendata/SCCGISHUBFeatureService/MapServer?f=json', 'Service root').then(printServiceRoot);

  // ── Fulton County, GA ──
  console.log('\n════ FULTON COUNTY, GA ════');
  await fetchJson('https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/PropertyMapViewer/PropertyMapViewer/MapServer?f=json', 'Service root').then(printServiceRoot);
  await fetchJson('https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/PropertyMapViewer/PropertyMapViewer/MapServer/11?f=json', 'Layer 11 (from web search)').then(printLayerInfo);

  console.log('\n══ DONE ══');
}

main();
