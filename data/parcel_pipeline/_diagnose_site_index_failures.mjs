/* TEMP diagnostic script, round 3 -- isolates exactly which query parameter
 * is causing "Failed to execute query." for New Castle County DE and Clark
 * County NV, which both fail identically with the real build script's
 * query (restricted outFields + geometryPrecision=4 + maxAllowableOffset=
 * 0.001 + f=geojson) but succeeded in round 1 with outFields=*/no geometry
 * simplification/f=json. Tests each parameter removed one at a time.
 * Deleted once the real root cause is found and fixed.
 */
const TARGETS = [
  { fips: '10003', name: 'New Castle County, DE', serviceUrl: 'https://gis.nccde.org/agsserver/rest/services/BaseMaps/Base_Layers/MapServer/0', where: 'LOTSZ >= 5', outFields: 'PRCLID,PARCELNO,LOTSZ,CNTCTLAST' },
  { fips: '32003', name: 'Clark County, NV', serviceUrl: 'https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor/ParcelHistory/MapServer/3', where: '1=1', outFields: 'APN,OWNER' },
];

async function tryQuery(label, url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    const body = await res.json();
    const elapsed = Date.now() - t0;
    if (body.error) {
      console.log(`  ${label}: FAILED (${elapsed}ms) — ${JSON.stringify(body.error)}`);
    } else {
      console.log(`  ${label}: OK (${elapsed}ms) — ${(body.features || []).length} features`);
    }
  } catch (e) {
    console.log(`  ${label}: THREW (${Date.now() - t0}ms) — ${e.message}`);
  }
}

for (const t of TARGETS) {
  console.log(`\n${'='.repeat(70)}\n${t.fips}  ${t.name}\n${'='.repeat(70)}`);
  const base = `${t.serviceUrl}/query`;

  const full = new URL(base);
  full.searchParams.set('where', t.where);
  full.searchParams.set('outFields', t.outFields);
  full.searchParams.set('returnGeometry', 'true');
  full.searchParams.set('geometryPrecision', '4');
  full.searchParams.set('maxAllowableOffset', '0.001');
  full.searchParams.set('inSR', '4326');
  full.searchParams.set('outSR', '4326');
  full.searchParams.set('resultRecordCount', '2000');
  full.searchParams.set('f', 'json');
  await tryQuery('A: exact real query (restricted outFields + geom simplification), f=json', full.toString());

  const noGeomSimplify = new URL(full);
  noGeomSimplify.searchParams.delete('geometryPrecision');
  noGeomSimplify.searchParams.delete('maxAllowableOffset');
  await tryQuery('B: restricted outFields, NO geometryPrecision/maxAllowableOffset', noGeomSimplify.toString());

  const starFields = new URL(full);
  starFields.searchParams.set('outFields', '*');
  await tryQuery('C: outFields=*, WITH geometryPrecision/maxAllowableOffset', starFields.toString());

  const noReturnGeom = new URL(full);
  noReturnGeom.searchParams.set('returnGeometry', 'false');
  noReturnGeom.searchParams.delete('geometryPrecision');
  noReturnGeom.searchParams.delete('maxAllowableOffset');
  await tryQuery('D: restricted outFields, returnGeometry=false (no geometry params at all)', noReturnGeom.toString());

  const noInOutSR = new URL(full);
  noInOutSR.searchParams.delete('inSR');
  noInOutSR.searchParams.delete('outSR');
  await tryQuery('E: restricted outFields + geom simplification, NO inSR/outSR', noInOutSR.toString());
}
