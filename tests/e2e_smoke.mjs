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
  const facOnHome = atPaint.filter(f => f.startsWith('facilities_'));
  console.log('facility files on home   :', facOnHome.length ? `${facOnHome} <-- WASTE` : 'none (good)');
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

/* 9. Pipeline map view — filters must drive both views, and re-entering the
      map must not re-initialize Leaflet. */
await run('Pipeline map view', async (p) => {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.click('#tab-pipeline');
  await p.waitForSelector('#pipeline-table tbody tr', { timeout: 45000 });

  await p.click('#pl-view-map');
  await p.waitForTimeout(3000);
  console.log('map visible              :', await p.isVisible('#pipeline-map-wrap'));
  console.log('table hidden             :', !(await p.isVisible('#pipeline-table-wrap')));
  console.log('leaflet initialized      :', await p.evaluate(() => !!document.querySelector('#pipeline-map .leaflet-pane')));
  console.log('aria-pressed map/table   :',
    await p.getAttribute('#pl-view-map', 'aria-pressed'), '/',
    await p.getAttribute('#pl-view-table', 'aria-pressed'));
  console.log('plotted note             :', (await p.textContent('[data-plotted]')).trim());
  const fills = await p.evaluate(() => {
    const m = document.getElementById('pipeline-map').getBoundingClientRect();
    const b = document.getElementById('pipeline-body').getBoundingClientRect();
    return Math.abs(m.width - b.width) < 3;
  });
  console.log('map fills body width     :', fills);

  // A filter must re-plot, not just re-render the table.
  await p.selectOption('#pl-filter-state', 'VA');
  await p.waitForTimeout(1800);
  console.log('after VA filter          :', (await p.textContent('[data-plotted]')).trim());

  await p.click('#pl-view-table');
  await p.waitForTimeout(1000);
  console.log('back to table            :', await p.$$eval('#pipeline-tbody tr', n => n.length) + ' rows');
  await p.click('#pl-view-map');
  await p.waitForTimeout(1800);
  console.log('re-entered map           :', await p.isVisible('#pipeline-map-wrap'));
});

/* 10. AI Stocks layout — this page had a workspace collapsed to height:0 whose
       content painted over every section below it, and error blocks that
       overflowed short containers and clipped their own text. Both are
       layout-only failures that jsdom cannot see. */
await run('AI Stocks layout', async (p) => {
  for (const [w, h, label] of [[1440, 950, 'desktop'], [1180, 900, 'small-desktop'], [900, 800, 'tablet']]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2200);
    await p.click('#tab-stocks');
    await p.waitForTimeout(4500);

    const r = await p.evaluate(() => {
      const clipped = [];
      document.querySelectorAll('#stocks-view *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const own = [...el.childNodes].filter(n => n.nodeType === 3)
          .map(n => n.textContent.trim()).join('').trim();
        if (!own) return;
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          clipped.push((el.className || el.tagName) + ' :: ' + own.slice(0, 32));
        }
      });
      const v = document.getElementById('stocks-view');
      const secs = [...v.children]
        .filter(k => getComputedStyle(k).position !== 'fixed' && k.getBoundingClientRect().height > 0)
        .map(k => { const b = k.getBoundingClientRect(); return { id: k.id, t: b.top, b: b.bottom }; });
      const overlaps = [];
      for (let i = 0; i < secs.length; i++) {
        for (let j = i + 1; j < secs.length; j++) {
          if (Math.min(secs[i].b, secs[j].b) - Math.max(secs[i].t, secs[j].t) > 1) {
            overlaps.push(secs[i].id + ' x ' + secs[j].id);
          }
        }
      }
      const ws = document.getElementById('stocks-workspace');
      return {
        clipped, overlaps,
        workspaceH: ws ? Math.round(ws.getBoundingClientRect().height) : 0,
        groups: document.querySelectorAll('.stocks-wl-group').length,
        firstNames: [...document.querySelectorAll('.stocks-wl-name')].slice(0, 3).map(n => n.textContent),
      };
    });

    console.log(`  ${label.padEnd(14)} clipped=${r.clipped.length} overlaps=${r.overlaps.length} ` +
      `workspaceH=${r.workspaceH} categoryHeaders=${r.groups}` +
      (r.workspaceH < 100 ? '  <-- WORKSPACE COLLAPSED' : '') +
      (r.clipped.length || r.overlaps.length ? '  <-- REGRESSION' : ''));
    if (r.clipped.length) console.log('     clipped:', r.clipped.slice(0, 3));
    if (r.overlaps.length) console.log('     overlaps:', r.overlaps.slice(0, 3));
    if (label === 'desktop') {
      // Full company names, not the abbreviated shortName that read as clipping.
      console.log('     names:', r.firstNames.join(' | '));
    }
  }
});

/* 11. Favicon assets — every declared icon must return 200 and decode. Paths
       are relative because this deploys to a GitHub Pages *project* site at
       /test1/; a root-absolute "/favicon.ico" would 404 there, which is the
       exact regression this guards. Also asserts the header branding is
       untouched, since the mark was extracted from it. */
await run('Favicon + header branding', async (p) => {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);

  const declared = await p.evaluate(() =>
    [...document.querySelectorAll('link[rel*="icon"], link[rel="manifest"]')]
      .map(el => el.getAttribute('href')));
  console.log('declared assets     :', declared.length);

  const rootAbsolute = declared.filter(h => h.startsWith('/'));
  console.log('root-absolute paths :', rootAbsolute.length === 0
    ? 'none (correct for a project site)' : `${rootAbsolute} <-- WILL 404 ON GITHUB PAGES`);

  // NOTE: the global URL constructor is shadowed by this file's URL constant,
  // so relative hrefs are resolved against the page's directory by hand.
  const dir = p.url().replace(/[^/]*$/, '');
  let bad = [];
  for (const href of declared) {
    const r = await p.request.get(dir + href);
    if (r.status() !== 200 || (await r.body()).length === 0) bad.push(`${r.status()} ${href}`);
  }
  console.log('non-200 assets      :', bad.length ? bad : 'none');

  const decoded = await p.evaluate(async () => {
    const urls = ['favicon.ico', 'assets/branding/brand-mark.svg',
                  'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'];
    const out = [];
    for (const u of urls) {
      const ok = await new Promise(res => {
        const i = new Image();
        i.onload = () => res(i.naturalWidth > 0);
        i.onerror = () => res(false);
        i.src = u + '?cb=' + Date.now();
      });
      if (!ok) out.push(u);
    }
    return out;
  });
  console.log('failed to decode    :', decoded.length ? decoded : 'none');

  const man = await (await p.request.get(dir + 'site.webmanifest')).json();
  console.log('manifest icons      :', man.icons.map(i => i.sizes).join(', '));

  // The favicon was derived from the header mark — the header must still show it.
  const hdr = await p.evaluate(() => {
    const l = document.getElementById('header-logo');
    return {
      logo: !!l,
      polygon: !!(l && l.querySelector('polygon')),
      wordmark: document.querySelector('#header-wordmark h1')?.textContent.trim(),
      tagline: document.getElementById('header-tagline')?.textContent.trim(),
    };
  });
  console.log('header preserved    :', `logo=${hdr.logo} polygon=${hdr.polygon} ` +
    `wordmark="${hdr.wordmark}" tagline="${hdr.tagline}"`);
});

await b.close();
