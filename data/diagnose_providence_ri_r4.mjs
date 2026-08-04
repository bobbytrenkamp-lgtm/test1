// Temporary diagnostic, round 4 (final): Providence County RI parcel
// service.
//
// Round 3 confirmed RIGIS's DCAT catalog is real and substantial (387
// datasets), but the first "parcel" text match was just a description
// mentioning "parcels of land" in an unrelated conservation-lands
// dataset, not the actual titled Parcels dataset. This round filters
// the dataset array specifically for entries whose title contains
// "parcel", and prints their real distribution URLs (to check if any
// is a live ArcGIS/WFS REST endpoint vs. a download-only shapefile).
//
// Deleted once Providence County RI is either added or documented as
// unavailable.

const TIMEOUT_MS = 25000;

async function main() {
  const url = 'https://www.rigis.org/api/feed/dcat-us/1.1.json';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const elapsed = Date.now() - start;
    console.log(`URL: ${url}`);
    console.log(`HTTP ${res.status} in ${elapsed}ms`);
    const body = await res.json();
    const datasets = body.dataset || [];
    console.log('Total datasets:', datasets.length);

    const titleHits = datasets.filter(d => /parcel/i.test(d.title || ''));
    console.log('\nDatasets with "parcel" in title:', titleHits.length);
    for (const d of titleHits) {
      console.log('\n---');
      console.log('title:', d.title);
      console.log('description:', (d.description || '').slice(0, 300));
      console.log('modified:', d.modified);
      const dist = d.distribution || [];
      for (const dd of dist) {
        console.log('  distribution format:', dd.mediaType || dd.format, '| url:', dd.accessURL || dd.downloadURL);
      }
    }
  } catch (e) {
    const elapsed = Date.now() - start;
    console.log(`FAILED after ${elapsed}ms: ${e.message || e}`);
  } finally {
    clearTimeout(timer);
  }
}

await main();
console.log('\nDone.');
