/* tests/test_parcel_discovery_adapters.mjs — unit tests for the pure
   parser half of every discovery adapter (arcgis_online, arcgis_server,
   dcat, ckan, socrata), against canned fixture JSON under
   tests/fixtures/parcel_discovery/. No network access — only the
   *Response/*Catalog parsing functions and other pure helpers are
   exercised here; the async search()/list() functions (which call
   fetchJsonCached) are covered by test_parcel_discover_batch.mjs with
   stubbed adapters instead.

   Run:  node tests/test_parcel_discovery_adapters.mjs
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildSearchQuery, parseArcGISOnlineSearchResponse } from '../data/parcel_pipeline/discovery/arcgis_online.mjs';
import { buildCandidateFromService } from '../data/parcel_pipeline/discovery/arcgis_server.mjs';
import { PARCEL_KEYWORD_RE, parseDcatCatalog } from '../data/parcel_pipeline/discovery/dcat.mjs';
import { parseCkanSearchResponse } from '../data/parcel_pipeline/discovery/ckan.mjs';
import { parseSocrataDiscoveryResponse } from '../data/parcel_pipeline/discovery/socrata.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures', 'parcel_discovery');
function loadFixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

const jurisdiction = { fips: '99999', name: 'Example County', state: 'EX' };

// ── arcgis_online.mjs ──
t('buildSearchQuery: quotes county name and ORs default keywords',
  buildSearchQuery({ countyName: 'Mecklenburg County', stateAbbr: 'NC' }),
  '"Mecklenburg County" AND (parcel OR parcels OR cadastral OR taxlot OR assessor OR cama)');

{
  const results = parseArcGISOnlineSearchResponse(loadFixture('arcgis_online_search.json'), jurisdiction);
  t('arcgis_online: items with no url (Web Map) are dropped', results.length, 2);
  ok('arcgis_online: real feature service candidate present', results.some(r => r.serviceUrl.includes('/Parcels/FeatureServer/0')));
  ok('arcgis_online: every candidate stamped with the jurisdiction fips', results.every(r => r.fips === '99999'));
  ok('arcgis_online: jurisdictionMatch always starts unknown, never assumed from title', results.every(r => r.jurisdictionMatch === 'unknown'));
  ok('arcgis_online: publisherType always starts unknown (title/tags alone can\'t confirm official)', results.every(r => r.publisherType === 'unknown'));
  t('arcgis_online: source tagged correctly', results[0].source, 'arcgis_online');
}
t('arcgis_online: no results array returns empty, not a throw', parseArcGISOnlineSearchResponse({}, jurisdiction), []);
t('arcgis_online: null json returns empty, not a throw', parseArcGISOnlineSearchResponse(null, jurisdiction), []);

// ── arcgis_server.mjs ──
{
  const serviceDescriptor = {
    url: 'https://gis.example.gov/arcgis/rest/services/Parcels/MapServer',
    name: 'Parcels', owner: 'examplecounty', copyrightText: 'Example County GIS',
    capabilities: ['Query', 'Data'], fields: null,
    geometryType: 'esriGeometryPolygon',
  };
  const layerDescriptor = { id: 0, name: 'Tax Parcels', geometryType: 'polygon', keywordScore: 2 };
  const candidate = buildCandidateFromService(serviceDescriptor, layerDescriptor, jurisdiction);
  t('arcgis_server: layer url appends layer id to the service url',
    candidate.serviceUrl, 'https://gis.example.gov/arcgis/rest/services/Parcels/MapServer/0');
  ok('arcgis_server: queryable true when capabilities include Query', candidate.queryable === true);
  ok('arcgis_server: not flagged tile-only when Query capability present', candidate.isTileOnly === false);
  t('arcgis_server: geometryType taken from the layer descriptor', candidate.geometryType, 'polygon');
}
{
  // A service with capabilities present but NOT including Query (tile-cache
  // only) must be flagged isTileOnly -- this is what scoring.mjs's hard
  // reject / TILE_ONLY penalty depends on.
  const tileOnlyDescriptor = {
    url: 'https://gis.example.gov/arcgis/rest/services/ParcelsCache/MapServer',
    name: 'ParcelsCache', owner: 'examplecounty', copyrightText: null,
    capabilities: ['Map'], fields: null, geometryType: null,
  };
  const candidate = buildCandidateFromService(tileOnlyDescriptor, null, jurisdiction);
  ok('arcgis_server: tile-cache-only service (capabilities present, no Query) flagged isTileOnly', candidate.isTileOnly === true);
  ok('arcgis_server: tile-cache-only service not flagged queryable', candidate.queryable === false);
}

// ── dcat.mjs ──
t('dcat: PARCEL_KEYWORD_RE matches "parcel"', PARCEL_KEYWORD_RE.test('County Parcels dataset'), true);
t('dcat: PARCEL_KEYWORD_RE matches "tax parcel"', PARCEL_KEYWORD_RE.test('Tax Parcel Boundaries'), true);
t('dcat: PARCEL_KEYWORD_RE does not match unrelated dataset title', PARCEL_KEYWORD_RE.test('Street Centerlines'), false);
{
  const stubs = parseDcatCatalog(loadFixture('dcat_catalog.json'), jurisdiction);
  t('dcat: non-parcel dataset (Street Centerlines) excluded entirely', stubs.some(s => s.itemTitle === 'Street Centerlines'), false);
  t('dcat: one stub per distribution of the matched dataset', stubs.length, 3);
  const arcgisStub = stubs.find(s => /FeatureServer/.test(s.portalUrl));
  ok('dcat: ArcGIS-shaped distribution gets a real serviceUrl (queryable)', arcgisStub.serviceUrl !== null && arcgisStub.queryable === true);
  ok('dcat: ArcGIS-shaped distribution NOT flagged staticDownloadOnly', arcgisStub.staticDownloadOnly === false);
  const shpStub = stubs.find(s => s.resourceFormat === 'Shapefile');
  ok('dcat: Shapefile distribution flagged staticDownloadOnly', shpStub.staticDownloadOnly === true);
  ok('dcat: Shapefile distribution has no serviceUrl (not queryable)', shpStub.serviceUrl === null && shpStub.queryable === false);
  const csvStub = stubs.find(s => s.resourceFormat === 'CSV');
  ok('dcat: CSV distribution flagged staticDownloadOnly', csvStub.staticDownloadOnly === true);
}
t('dcat: missing dataset array returns empty, not a throw', parseDcatCatalog({}, jurisdiction), []);

// ── ckan.mjs ──
{
  const stubs = parseCkanSearchResponse(loadFixture('ckan_search.json'), jurisdiction);
  t('ckan: one stub per resource across both matched packages', stubs.length, 3);
  const esriStub = stubs.find(s => s.resourceFormat === 'Esri REST');
  ok('ckan: Esri REST resource gets a real serviceUrl (queryable)', esriStub.serviceUrl !== null && esriStub.queryable === true);
  ok('ckan: Esri REST resource NOT flagged staticDownloadOnly', esriStub.staticDownloadOnly === false);
  const geojsonStub = stubs.find(s => s.resourceFormat === 'GeoJSON');
  ok('ckan: GeoJSON resource flagged staticDownloadOnly', geojsonStub.staticDownloadOnly === true);
  ok('ckan: publisherName pulled from organization.title', stubs.every(s => s.publisherName === 'Example County GIS' || s.publisherName === 'Example County Planning'));
}
t('ckan: success:false response returns empty, not a throw', parseCkanSearchResponse({ success: false }, jurisdiction), []);
t('ckan: missing result.results returns empty, not a throw', parseCkanSearchResponse({ success: true, result: {} }, jurisdiction), []);

// ── socrata.mjs ──
{
  const stubs = parseSocrataDiscoveryResponse(loadFixture('socrata_discovery.json'), jurisdiction);
  t('socrata: one stub per discovery result', stubs.length, 2);
  ok('socrata: serviceUrl always null (landing pages aren\'t queryable REST endpoints)', stubs.every(s => s.serviceUrl === null));
  ok('socrata: portalUrl populated from permalink', stubs.every(s => s.portalUrl && s.portalUrl.startsWith('https://data.example.gov')));
  ok('socrata: queryable always false', stubs.every(s => s.queryable === false));
  ok('socrata: never speculatively flagged staticDownloadOnly', stubs.every(s => s.staticDownloadOnly === false));
  t('socrata: publisherName pulled from metadata.domain', stubs[0].publisherName, 'data.example.gov');
}
t('socrata: missing results array returns empty, not a throw', parseSocrataDiscoveryResponse({}, jurisdiction), []);

// ── cross-adapter invariant: every candidate-stub shape carries the same core keys ──
{
  const allStubs = [
    ...parseArcGISOnlineSearchResponse(loadFixture('arcgis_online_search.json'), jurisdiction),
    ...parseDcatCatalog(loadFixture('dcat_catalog.json'), jurisdiction),
    ...parseCkanSearchResponse(loadFixture('ckan_search.json'), jurisdiction),
    ...parseSocrataDiscoveryResponse(loadFixture('socrata_discovery.json'), jurisdiction),
  ];
  const requiredKeys = [
    'candidateId', 'source', 'fips', 'jurisdictionName', 'state', 'serviceUrl', 'portalUrl',
    'publisherType', 'publisherName', 'jurisdictionMatch', 'geometryType', 'queryable',
    'isTileOnly', 'requiresAuth', 'fields', 'sampleRecords', 'sampleNullRatio',
    'staticDownloadOnly', 'ingested', 'raw',
  ];
  ok('every adapter\'s stubs carry the full common candidate-stub key set',
    allStubs.every(s => requiredKeys.every(k => k in s)));
  ok('every stub has a unique candidateId', new Set(allStubs.map(s => s.candidateId)).size === allStubs.length);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
