/* TEMP diagnostic round 4: Loudoun's COL folder (browsed in round 3) surfaced
 * three real, specifically-named candidate services that were never probed --
 * COL/LandRecords, COL/LandRecordData, COL/LMIS_ParcelsPlatfile. "LandRecords"
 * is a much stronger CAMA/assessment name-signal than anything tried in
 * rounds 1-2 (which only found a tax-district boundary layer via the base
 * service's own siblings). This round inspects and, if a join field exists,
 * verifies each against real sampled Loudoun parcel ids (PA_MCPI).
 */
import { loadRegistry } from './parcel_pipeline/lib/load_registry.mjs';
import { inspectArcGISService } from './parcel_pipeline/discovery/schema.mjs';
import { sampleBaseKeys, evaluateCandidate } from './parcel_pipeline/discovery/enrichment_candidates.mjs';
import { missingFieldsFor } from './parcel_pipeline/discover_enrichment.mjs';

const registry = loadRegistry();

async function fetchJson(url, label) {
  console.log(`\n--- ${label} ---\n${url}`);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research)' } });
    const text = await resp.text();
    console.log(`status=${resp.status} length=${text.length}`);
    try {
      return JSON.parse(text);
    } catch {
      console.log(`body[:300]=${text.slice(0, 300)}`);
      return null;
    }
  } catch (e) {
    console.log(`EXCEPTION: ${e.constructor.name}: ${e.message}`);
    return null;
  }
}

async function evalManualCandidate(fips, baseJoinSourceField, candidateUrl, label) {
  const entry = registry.get(fips);
  console.log(`\n\n########## ${fips} ${entry.name} -- ${label} ##########`);
  console.log(candidateUrl);

  const svc = await inspectArcGISService(candidateUrl, {});
  if (!svc.ok) {
    console.log(`  service inspect FAILED: ${svc.errorType} ${svc.why}`);
    return;
  }
  console.log(`  name=${svc.name} fields (${(svc.fields || []).length}): ${(svc.fields || []).map(f => f.name).join(', ')}`);

  const sample = await sampleBaseKeys(entry.serviceUrl, baseJoinSourceField, {}, 25);
  if (!sample.ok) {
    console.log(`  base sample FAILED: ${sample.why}`);
    return;
  }
  console.log(`  sampled ${sample.keys.length} real ${baseJoinSourceField} values: ${sample.keys.slice(0, 5).join(', ')}...`);

  const fs = await import('node:fs/promises');
  const { mapFields } = await import('./parcel_pipeline/field_mapper.mjs');
  const synonyms = JSON.parse(await fs.readFile('data/parcel_field_synonyms.json', 'utf8')).synonyms;

  const candidate = { id: null, name: svc.name || label, fields: svc.fields, geometryType: svc.geometryType };
  const evaluated = await evaluateCandidate(candidate, {
    candidateUrl,
    baseJoinSourceField,
    sampleKeys: sample.keys,
    missingCanonicalFields: missingFieldsFor(entry),
    mapFieldsFn: mapFields,
    synonyms,
  }, {});
  console.log(JSON.stringify(evaluated, null, 2));
}

async function main() {
  for (const name of ['LandRecords', 'LandRecordData', 'LMIS_ParcelsPlatfile']) {
    const root = `https://logis.loudoun.gov/gis/rest/services/COL/${name}/MapServer`;
    const info = await fetchJson(`${root}?f=json`, `Loudoun COL/${name} -- service info`);
    if (!info) continue;
    const layers = info.layers || [];
    const tables = info.tables || [];
    console.log(`  layers: ${layers.map(l => `${l.id}:${l.name}`).join(', ') || '(none)'}`);
    console.log(`  tables: ${tables.map(t => `${t.id}:${t.name}`).join(', ') || '(none)'}`);
    for (const l of [...layers, ...tables]) {
      await evalManualCandidate('51107', 'PA_MCPI', `${root}/${l.id}`, `COL/${name} layer ${l.id} (${l.name})`);
    }
  }
}

main();
