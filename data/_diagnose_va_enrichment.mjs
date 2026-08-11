/* TEMP diagnostic: live-verify CAMA/assessment enrichment join candidates
 * for the three Virginia data-center pilot counties (Loudoun, Prince
 * William, Fairfax). Per docs/PARCEL_MULTI_SOURCE_ARCHITECTURE.md section 7,
 * a candidate is never promoted on a promising name -- it must be measured
 * against real sampled parcel ids from the live base layer.
 *
 * Two passes per county:
 *   1. discover_enrichment.mjs's own investigate() -- finds sibling layers
 *      on the SAME ArcGIS service as the base parcel layer.
 *   2. A manual evaluateCandidate() run against specific cross-service URLs
 *      already named (from research, not guesses) in registry.js's own
 *      comments -- these live on a DIFFERENT host/service than the base
 *      parcel layer, so investigate()'s sibling-only search can't reach them.
 *
 * For Loudoun, no candidate URL is named anywhere yet, so this also browses
 * the ArcGIS REST services directory on logis.loudoun.gov looking for a
 * CAMA/assessment service alongside the known parcel one.
 */
import { loadRegistry } from './parcel_pipeline/lib/load_registry.mjs';
import { inspectArcGISService } from './parcel_pipeline/discovery/schema.mjs';
import {
  rankJoinCandidates, sampleBaseKeys, evaluateCandidate,
} from './parcel_pipeline/discovery/enrichment_candidates.mjs';
import { investigate, missingFieldsFor } from './parcel_pipeline/discover_enrichment.mjs';

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

async function passOne(fips) {
  const entry = registry.get(fips);
  console.log(`\n\n########## PASS 1 (sibling-layer auto-discovery): ${fips} ${entry.name} ##########`);
  console.log(`missing fields: ${missingFieldsFor(entry).join(', ')}`);
  const report = await investigate(entry, { maxCandidates: 8 }, {});
  console.log(JSON.stringify(report, null, 2));
}

let _mapFields = null;
let _synonyms = null;
async function loadMapperDeps() {
  if (!_mapFields) _mapFields = (await import('./parcel_pipeline/field_mapper.mjs')).mapFields;
  if (!_synonyms) {
    const fs = await import('node:fs/promises');
    _synonyms = JSON.parse(await fs.readFile('data/parcel_field_synonyms.json', 'utf8')).synonyms;
  }
  return { mapFields: _mapFields, synonyms: _synonyms };
}

async function evalManualCandidate(fips, baseJoinSourceField, candidateUrl, label) {
  const entry = registry.get(fips);
  console.log(`\n\n########## PASS 2 (named cross-service candidate): ${fips} ${entry.name} -- ${label} ##########`);
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
  console.log(`  sampled ${sample.keys.length} real ${baseJoinSourceField} values from the base layer: ${sample.keys.slice(0, 5).join(', ')}...`);

  const { mapFields, synonyms } = await loadMapperDeps();
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

async function browseLoudounServices() {
  console.log(`\n\n########## Loudoun: browsing ArcGIS REST services directory for a CAMA candidate ##########`);
  await fetchJson('https://logis.loudoun.gov/gis/rest/services?f=json', 'root services directory');
  await fetchJson('https://logis.loudoun.gov/gis/rest/services/COL?f=json', 'COL folder');
}

async function browseFairfaxOrgServices() {
  console.log(`\n\n########## Fairfax: browsing the ioennV6PpG5Xodq0 ArcGIS Online org's real service list ##########`);
  // The registry.js comment's OpenData_A5=Sales / OpenData_A6=Assessed-Values
  // guess turned out wrong on live data (A6 = "Questionable Split Parcels",
  // A5 = "Common Areas") -- so enumerate the org's actual services rather
  // than trusting the layer-number guess further.
  const list = await fetchJson(
    'https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services?f=json',
    '51059 ioennV6PpG5Xodq0 org -- service list');
  if (list && Array.isArray(list.services)) {
    console.log(`  services (${list.services.length}): ${list.services.map(s => `${s.name} (${s.type})`).join(', ')}`);
    return list.services;
  }
  return [];
}

async function main() {
  await passOne('51107'); // Loudoun
  await passOne('51153'); // Prince William
  await passOne('51059'); // Fairfax

  const fairfaxServices = await browseFairfaxOrgServices();
  const salesOrAssessedLike = fairfaxServices.filter(s =>
    /sale|assess|value|tax|cama|real.?estate/i.test(s.name));
  console.log(`  name-filtered candidates: ${salesOrAssessedLike.map(s => s.name).join(', ') || '(none)'}`);
  for (const s of salesOrAssessedLike.slice(0, 6)) {
    const root = `https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services/${s.name}/${s.type}`;
    const info = await fetchJson(`${root}?f=json`, `Fairfax candidate service ${s.name}`);
    const layers = (info && (info.layers || (info.type ? [{ id: 0, name: info.name }] : []))) || [];
    for (const l of (Array.isArray(layers) ? layers : [])) {
      await evalManualCandidate('51059', 'PARCEL_KEY',
        `${root}/${l.id != null ? l.id : 0}`,
        `${s.name} layer ${l.id != null ? l.id : 0} (${l.name || ''})`);
    }
  }

  // Prince William's named "Parcel CAMA Public" service root (registry.js:165-167)
  const pwcCamaSvc = await fetchJson(
    'https://gisweb.pwcva.gov/arcgis/rest/services/GTS/Cadastral/MapServer?f=json',
    '51153 GTS/Cadastral MapServer -- layer listing');
  if (pwcCamaSvc && Array.isArray(pwcCamaSvc.layers)) {
    console.log(`  layers: ${pwcCamaSvc.layers.map(l => `${l.id}:${l.name}`).join(', ')}`);
    for (const l of pwcCamaSvc.layers) {
      await evalManualCandidate('51153', 'GISPROD.VECTOR.Parcels.GPIN',
        `https://gisweb.pwcva.gov/arcgis/rest/services/GTS/Cadastral/MapServer/${l.id}`,
        `GTS/Cadastral layer ${l.id} (${l.name})`);
    }
  }

  await browseLoudounServices();
}

main();
