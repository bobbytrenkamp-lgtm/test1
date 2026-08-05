// Temporary diagnostic, round 4 -- fresh discovery for 5 new
// candidates from the priority queue: Arapahoe County CO (08005, 17
// facilities), DuPage County IL (17043, 16), Jefferson County AL
// (01073, 16), St. Louis city MO (29510, 15), Durham County NC
// (37063, 14).
//
// Primary approach per county: a targeted ArcGIS Online item search
// (worked well for Mecklenburg NC this session -- surfaced a genuine
// county-owned service after blind subdomain guessing dead-ended).
// Secondary: the county's own open-data DCAT catalog, if it runs an
// ArcGIS Hub portal.
//
// Deleted once this round's findings are wired into the registry or
// documented as still unresolved.

const TIMEOUT_MS = 25000;

async function fetchJson(url, label) {
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
      if (body.error) console.log('ArcGIS error:', JSON.stringify(body.error));
      if (body.results) {
        console.log(`Search results: total=${body.total}, showing ${body.results.length}`);
        for (const r of body.results) {
          console.log(`  - [${r.type}] "${r.title}" owner=${r.owner} url=${r.url || '(no url field)'} tags=${(r.tags||[]).slice(0,6).join(',')}`);
        }
      } else if (body.dataset) {
        const matches = body.dataset.filter(d => /parcel|cadastral|assessor|tax/i.test(d.title || '') || /parcel|cadastral|assessor/i.test(d.description || ''));
        console.log(`DCAT datasets matching parcel/cadastral/assessor/tax: ${matches.length}`);
        for (const d of matches) {
          console.log(`  - "${d.title}": ${(d.description||'').slice(0,150)}`);
          console.log(`    dist: ${(d.distribution||[]).map(x=>`${x.format}:${x.accessURL||x.downloadURL}`).join(' | ')}`);
        }
      } else {
        console.log('Body (truncated 800):', JSON.stringify(body).slice(0, 800));
      }
    } else {
      console.log('Body (text, first 400 chars):', text.slice(0, 400));
    }
    return { ok: res.ok && !body?.error, status, body, text };
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

const counties = [
  { name: 'Arapahoe County CO', q: '"Arapahoe County" AND (parcel OR cadastral OR assessor OR "tax parcel")', dcatSlug: null },
  { name: 'DuPage County IL', q: '"DuPage County" AND (parcel OR cadastral OR assessor OR "tax parcel")', dcatSlug: 'dupage' },
  { name: 'Jefferson County AL', q: '"Jefferson County" AND Alabama AND (parcel OR cadastral OR assessor OR "tax parcel")', dcatSlug: null },
  { name: 'St. Louis city MO', q: '"St. Louis" AND city AND Missouri AND (parcel OR cadastral OR assessor OR "tax parcel")', dcatSlug: null },
  { name: 'Durham County NC', q: '"Durham County" AND (parcel OR cadastral OR assessor OR "tax parcel")', dcatSlug: 'durham' },
];

for (const c of counties) {
  await fetchJson(
    `https://www.arcgis.com/sharing/rest/search?q=${encodeURIComponent(c.q)}&f=json&num=10`,
    `${c.name}: ArcGIS Online search`
  );
  if (c.dcatSlug) {
    await fetchJson(
      `https://data-${c.dcatSlug}.opendata.arcgis.com/api/feed/dcat-us/1.1.json`,
      `${c.name}: own DCAT catalog`
    );
  }
}
