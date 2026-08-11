/* TEMP diagnostic: verify jurisdiction match + inspect real field schema
 * and a real sample record for 5 "weak"/"marginal"-scored parcel
 * candidates already found by discover_batch.mjs on 2026-08-07 but never
 * promoted (jurisdictionMatch unknown/partial, or unresolved field
 * ambiguity) -- see data/parcel_source_catalog.json's notes for each.
 *
 * Candidates (service URL, layer id from the catalog's own notes):
 *   46099 Minnehaha County SD -- gis.siouxfalls.gov/.../Data/Property/MapServer/1 (score 57, closest to promotable)
 *   09001 Fairfield County CT -- services2.arcgis.com/l7yscduqyc7biss6/.../ParcelBoundaries/FeatureServer/1
 *   40109 Oklahoma County    -- services8.arcgis.com/euhkr1dajeqbijv0/.../TaxParcelsPublicsView/FeatureServer/1
 *   06073 San Diego County   -- services8.arcgis.com/j9lw6chydxcsrygi/.../Parcels_20241115/FeatureServer/13
 *   40143 Tulsa County       -- services3.arcgis.com/vq3oyhypnynk3zqb/.../find_locations_in_Parcels_Tulsa_County/FeatureServer/1
 */
const candidates = [
  { fips: '46099', name: 'Minnehaha County', state: 'SD',
    url: 'https://gis.siouxfalls.gov/arcgis/rest/services/Data/Property/MapServer/1' },
  { fips: '09001', name: 'Fairfield County', state: 'CT',
    url: 'https://services2.arcgis.com/l7yscduqyC7biSS6/arcgis/rest/services/ParcelBoundaries/FeatureServer/1' },
  { fips: '40109', name: 'Oklahoma County', state: 'OK',
    url: 'https://services8.arcgis.com/eUHKR1DAjEQBiJv0/arcgis/rest/services/TaxParcelsPublicsView/FeatureServer/1' },
  { fips: '06073', name: 'San Diego County', state: 'CA',
    url: 'https://services8.arcgis.com/j9LW6cHydXCSrygi/arcgis/rest/services/Parcels_20241115/FeatureServer/13' },
  { fips: '40143', name: 'Tulsa County', state: 'OK',
    url: 'https://services3.arcgis.com/vQ3oYHYpNYnK3zQB/arcgis/rest/services/find_locations_in_Parcels_Tulsa_County/FeatureServer/1' },
];

async function fetchJson(url, label) {
  console.log(`\n=== ${label} ===\n${url}`);
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

async function main() {
  for (const c of candidates) {
    console.log(`\n\n########## ${c.fips} ${c.name}, ${c.state} ##########`);
    const meta = await fetchJson(`${c.url}?f=json`, `${c.fips} layer metadata`);
    if (meta) {
      if (meta.error) {
        console.log(`  ERROR: ${JSON.stringify(meta.error)}`);
        continue;
      }
      console.log(`  name=${meta.name} geometryType=${meta.geometryType}`);
      const fields = (meta.fields || []).map(f => f.name);
      console.log(`  fields (${fields.length}): ${fields.join(', ')}`);
    }
    await new Promise(r => setTimeout(r, 500));

    const sample = await fetchJson(
      `${c.url}/query?where=1%3D1&outFields=*&resultRecordCount=2&f=json`,
      `${c.fips} sample records (2)`
    );
    if (sample && sample.features) {
      for (const feat of sample.features) {
        console.log(`  sample attrs: ${JSON.stringify(feat.attributes)}`);
      }
    } else if (sample && sample.error) {
      console.log(`  ERROR: ${JSON.stringify(sample.error)}`);
    }
    await new Promise(r => setTimeout(r, 500));

    const count = await fetchJson(
      `${c.url}/query?where=1%3D1&returnCountOnly=true&f=json`,
      `${c.fips} record count`
    );
    if (count) console.log(`  count result: ${JSON.stringify(count)}`);
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
