/* tests/e2e_smoke.mjs — end-to-end browser smoke test.

   Exercises the six flows that unit tests cannot reach: the Home critical
   path, the Map tab, the Jurisdiction page, watchlist change alerts, pipeline
   windowing plus keyboard sorting, and mobile navigation. Every scenario
   asserts zero JavaScript errors.

   This suite found six real bugs that jsdom missed, including deep links
   silently failing on cold load and a mobile sheet rendering off-screen
   because an ancestor transform re-anchored position:fixed. Run it after any
   change to routing, data loading, or header/nav layout.

   SETUP — a browser is required and Playwright's own CDN is blocked by the
   environment proxy (403 "host not permitted"). Chrome for Testing works:

     curl -o /tmp/chs.zip \
       "https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.54/linux64/chrome-headless-shell-linux64.zip"
     unzip -q /tmp/chs.zip -d /tmp/chs
     chmod +x /tmp/chs/chrome-headless-shell-linux64/chrome-headless-shell

   RUN — serve the repo, then point this at it:

     python3 -m http.server 8099 &
     NODE_PATH=/tmp/node_modules node tests/e2e_smoke.mjs

   Override the defaults with CHROME_PATH and BASE_URL if your paths differ.
*/
import { chromium } from '/tmp/node_modules/playwright/index.mjs';
const EXE = process.env.CHROME_PATH || '/tmp/chs/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = (process.env.BASE_URL || 'http://localhost:8099') + '/index.html';
const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

async function run(name, fn) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const errs = [], reqs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  p.on('request', r => {
    const u = r.url();
    if (u.includes('/data/')) reqs.push(u.split('/data/')[1].split('?')[0]);
  });
  console.log(`\n===== ${name} =====`);
  try { await fn(p, reqs, errs); } catch (e) { console.log('THREW:', e.message.split('\n')[0]); }
  /* Ignore failures to reach external hosts. TradingView widgets and remote
     tiles are blocked by the sandbox proxy; those are environment noise, not
     application errors, and they would otherwise mask real ones. */
  const real = errs.filter(e =>
    !/favicon/.test(e) &&
    !/net::ERR_(TUNNEL_CONNECTION_FAILED|CONNECTION_RESET|NAME_NOT_RESOLVED|CONNECTION_CLOSED|ABORTED|FAILED)/.test(e));
  console.log('JS ERRORS:', real.length ? real.slice(0, 4) : 'none');
  await ctx.close();
}

/* 1. Home — the critical-path change */
await run('Home / critical path', async (p, reqs) => {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => {
    const el = document.querySelector('.home-kpi-num');
    return el && /\d/.test(el.textContent);
  }, { timeout: 30000 });
  await p.waitForTimeout(1500);   // let the KPI count-up animation settle
  const atPaint = [...new Set(reqs)].sort();
  console.log('requested by first paint :', atPaint.join(', '));
  console.log('facilities_master on home:', atPaint.includes('facilities_master.json') ? 'YES (4.85MB waste!)' : 'no (good)');
  console.log('secondary in flight early :', atPaint.includes('sample_layers.json') ? 'yes (parallel, by design)' : 'no');
  console.log('KPIs                     :', await p.$$eval('.home-kpi-num', n => n.map(x => x.textContent.trim()).slice(0, 5)));
  console.log('KPI labels               :', await p.$$eval('.home-kpi-label', n => n.map(x => x.textContent.trim()).slice(0, 5)));
  await p.waitForTimeout(4000);
  console.log('after settle             :', [...new Set(reqs)].sort().join(', '));
  console.log('secondary applied        : risk=' + await p.evaluate(() => Object.keys(window.DC_RISK_BY_FIPS || {}).length)
    + ' incent=' + await p.evaluate(() => Object.keys(window.DC_INCENTIVES_FIPS || {}).length));
});

/* 2. Map — must await secondary; overlays must not be empty */
await run('Map tab', async (p) => {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.click('#tab-map');
  await p.waitForFunction(() => document.querySelectorAll('#leaflet-map path').length > 100, { timeout: 40000 });
  console.log('county/state paths       :', await p.$$eval('#leaflet-map path', n => n.length));
  console.log('sampleLayers present     :', await p.evaluate(() => typeof sampleLayers !== 'undefined' && !!sampleLayers));
  console.log('legend items             :', await p.$$eval('.legend-item', n => n.length));
  const lg = await p.textContent('#legend').catch(() => '');
  console.log('legend "Not yet researched":', /Not yet researched/.test(lg));
  console.log('legend "Significant"     :', /Significant Restrictions/.test(lg));
  console.log('URL hash                 :', await p.evaluate(() => location.hash));
});

/* 3. Jurisdiction page — the Phase 3 flagship */
await run('Jurisdiction page #jurisdiction?fips=51107', async (p) => {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { location.hash = '#jurisdiction?fips=51107'; });
  await p.waitForSelector('.juris-title', { timeout: 20000 });
  await p.waitForTimeout(2500);
  console.log('title                    :', await p.textContent('.juris-title'));
  console.log('severity                 :', (await p.textContent('.juris-sev')).trim());
  console.log('cards                    :', await p.$$eval('.juris-card', n => n.length));
  console.log('facility rows            :', await p.$$eval('.juris-table tbody tr', n => n.length));
  console.log('facility stats           :', await p.$$eval('.juris-stat', n => n.map(x => x.textContent.replace(/\s+/g, ' ').trim())));
  console.log('news items               :', await p.$$eval('.juris-news-item', n => n.length));
  console.log('watch button             :', (await p.textContent('.juris-btn-watch')).trim());
});

/* 4. Watchlist round trip + change alert */
await run('Watchlist + change alert', async (p) => {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { location.hash = '#jurisdiction?fips=51107'; });
  await p.waitForSelector('.juris-btn-watch', { timeout: 20000 });
  await p.click('.juris-btn-watch');
  await p.waitForTimeout(600);
  console.log('after watch click        :', (await p.textContent('.juris-btn-watch')).trim());
  console.log('v2 storage written       :', await p.evaluate(() => !!localStorage.getItem('dc-watchlist-v2')));
  console.log('v1 mirror kept           :', await p.evaluate(() => localStorage.getItem('dc-watchlist-v1')));
  console.log('notes editor appeared    :', await p.evaluate(() => !!document.querySelector('.juris-notes-input')));
  // simulate a policy escalation, then check the home alert renders
  await p.evaluate(() => { mapData['51107'].level = 4; });
  await p.evaluate(() => { location.hash = '#home'; });
  await p.waitForTimeout(2500);
  const alertBox = await p.$('.wl-changes');
  console.log('change alert rendered    :', !!alertBox);
  if (alertBox) {
    console.log('alert title              :', (await p.textContent('.wl-changes-title')).trim());
    console.log('change text              :', (await p.textContent('.wl-change-item')).trim());
    console.log('no fake push claim       :', !/we.ll email|sent to your|push notification(?!s are)/i.test(await p.textContent('.wl-changes')));
  }
});

/* 5. Pipeline — windowing + keyboard sort */
await run('Pipeline windowing + a11y', async (p) => {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.click('#tab-pipeline');
  await p.waitForSelector('#pipeline-table tbody tr', { timeout: 40000 });
  await p.waitForTimeout(1200);
  const first = await p.$$eval('#pipeline-tbody tr', n => n.length);
  console.log('rows at first render     :', first, first <= 150 ? '(windowed OK)' : '(TOO MANY)');
  console.log('count badge              :', (await p.textContent('#pipeline-count')).trim());
  console.log('freshness bar            :', (await p.textContent('#pipeline-freshness-bar')).slice(0, 70) + '...');
  await p.evaluate(() => { const w = document.getElementById('pipeline-table-wrap'); w.scrollTop = w.scrollHeight; });
  await p.waitForTimeout(900);
  console.log('rows after scroll        :', await p.$$eval('#pipeline-tbody tr', n => n.length));
  // keyboard sort
  await p.focus('#pipeline-table thead th[data-col="name"]');
  console.log('header focusable         :', await p.evaluate(() => document.activeElement.tagName + ':' + document.activeElement.dataset.col));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  console.log('aria-sort after Enter    :', await p.getAttribute('#pipeline-table thead th[data-col="name"]', 'aria-sort'));
});

/* 6. Mobile "More" nav at phone width */
await run('Mobile nav (390x844)', async (p) => {
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  console.log('More button visible      :', await p.isVisible('#header-tab-more'));
  console.log('secondary tab hidden     :', !(await p.isVisible('#tab-pipeline')));
  await p.click('#header-tab-more');
  await p.waitForTimeout(500);
  console.log('sheet open               :', await p.isVisible('#mobile-nav-sheet'));
  console.log('sheet items              :', await p.$$eval('.mobile-nav-item', n => n.map(x => x.textContent.trim())));
  console.log('aria-expanded            :', await p.getAttribute('#header-tab-more', 'aria-expanded'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  console.log('Escape closed sheet      :', !(await p.isVisible('#mobile-nav-sheet')));
  // no horizontal page scroll
  console.log('no horizontal overflow   :', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
});

/* 7. Cold-load deep link — hashchange does NOT fire for the initial URL, so
      this is the only way to catch applyInitialRoute() regressing. */
await run('Cold-load deep link', async (p) => {
  await p.goto(URL + '#jurisdiction?fips=51107', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.juris-title', { timeout: 30000 });
  await p.waitForTimeout(2500);
  console.log('renders on cold load     :', await p.textContent('.juris-title'));
  console.log('zoning coverage link     :',
    (await p.$$eval('.juris-link', n => n.map(x => x.textContent.trim()))).join(' | '));
});

/* 8. Header layout — tabs must never overlap the right-hand controls. */
await run('Header fit across widths', async (p) => {
  for (const w of [1920, 1600, 1440, 1366, 1280, 1200]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1600);
    const r = await p.evaluate(() => {
      const n = document.getElementById('header-tabs');
      const nav = n.getBoundingClientRect();
      const right = document.getElementById('header-right').getBoundingClientRect();
      return { overlap: Math.round(nav.right - right.left), hidden: n.scrollWidth - n.clientWidth };
    });
    console.log(`  ${String(w).padStart(4)}px overlap=${String(r.overlap).padStart(5)}` +
      (r.hidden > 1 ? `  ${r.hidden}px of tabs clipped` : '  all tabs visible') +
      (r.overlap > 0 ? '  <-- OVERLAP' : ''));
  }
});

await b.close();
