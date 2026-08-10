/* TEMP diagnostic script -- probes the 4 jurisdictions the national site
 * index build currently reports as failed, with VERBOSE raw output (full
 * ArcGIS error JSON, service metadata, field list) instead of the terse
 * classify()'d error the real build script keeps for its manifest. Deleted
 * once the real root cause is found and fixed -- same disposable-diagnostic
 * pattern used throughout this session's parcel batch work.
 *
 * Run only in CI (this sandbox has no outbound access to these domains).
 */
const TARGETS = [
  { fips: '24031', name: 'Montgomery County, MD', serviceUrl: 'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0', areaField: 'ACRES' },
  { fips: '18097', name: 'Marion County, IN', serviceUrl: 'https://gis.indy.gov/server/rest/services/MapIndy/MapIndyProperty/MapServer/10', areaField: 'ACREAGE' },
  { fips: '10003', name: 'New Castle County, DE', serviceUrl: 'https://gis.nccde.org/agsserver/rest/services/BaseMaps/Base_Layers/MapServer/0', areaField: 'LOTSZ' },
  { fips: '32003', name: 'Clark County, NV', serviceUrl: 'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/ParcelHistory/MapServer/3', areaField: null },
];

async function fetchJson(url) {
  const res = await fetch(url);
  const status = res.status;
  let json = null, text = null;
  try { json = await res.json(); } catch { try { text = await res.text(); } catch {} }
  return { status, json, text };
}

for (const t of TARGETS) {
  console.log(`\n${'='.repeat(70)}\n${t.fips}  ${t.name}\n${'='.repeat(70)}`);

  console.log(`\n-- Service/layer metadata (${t.serviceUrl}?f=json) --`);
  const meta = await fetchJson(`${t.serviceUrl}?f=json`);
  console.log('HTTP status:', meta.status);
  if (meta.json) {
    console.log('name:', meta.json.name);
    console.log('type:', meta.json.type);
    console.log('maxRecordCount:', meta.json.maxRecordCount);
    console.log('capabilities:', meta.json.capabilities);
    console.log('supportedQueryFormats:', meta.json.supportedQueryFormats);
    if (meta.json.error) console.log('SERVICE ERROR:', JSON.stringify(meta.json.error));
    if (Array.isArray(meta.json.fields)) {
      const names = meta.json.fields.map(f => f.name);
      console.log('field count:', names.length);
      if (t.areaField) console.log(`area field '${t.areaField}' present:`, names.includes(t.areaField));
      console.log('fields:', names.join(', '));
    } else {
      console.log('NO fields array in metadata response');
    }
  } else {
    console.log('non-JSON metadata response, first 500 chars:', (meta.text || '').slice(0, 500));
  }

  const where = t.areaField ? `${t.areaField} >= 5` : '1=1';
  const queryUrl = `${t.serviceUrl}/query?where=${encodeURIComponent(where)}&outFields=*&f=json&resultRecordCount=1`;
  console.log(`\n-- Real query the build script would issue (capped to 1 record here) --`);
  console.log('WHERE:', where);
  console.log('URL:', queryUrl);
  const q = await fetchJson(queryUrl);
  console.log('HTTP status:', q.status);
  if (q.json) {
    if (q.json.error) {
      console.log('QUERY ERROR (full):', JSON.stringify(q.json.error, null, 2));
    } else {
      console.log('features returned:', Array.isArray(q.json.features) ? q.json.features.length : 'n/a');
      console.log('exceededTransferLimit:', q.json.exceededTransferLimit);
    }
  } else {
    console.log('non-JSON query response, first 500 chars:', (q.text || '').slice(0, 500));
  }

  // Also try the simplest possible query (1=1, no area filter, count only)
  // to separate "the WHERE clause itself is broken" from "the service is
  // down/misconfigured regardless of what we ask".
  const countUrl = `${t.serviceUrl}/query?where=1%3D1&returnCountOnly=true&f=json`;
  console.log(`\n-- Bare count query (where=1=1, returnCountOnly) --`);
  const c = await fetchJson(countUrl);
  console.log('HTTP status:', c.status);
  console.log('response:', JSON.stringify(c.json || c.text || {}).slice(0, 300));
}
