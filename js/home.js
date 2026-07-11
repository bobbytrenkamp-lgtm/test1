/* ── home.js — Command Center Homepage ── */

const HOME_ICONS = {
  map: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
  news: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
  stocks: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  analytics: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  about: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  arrow: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
  location: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  external: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  alert: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  mail: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
};

const SEV_LABELS = { 4: "Ban / Moratorium", 3: "Significant", 2: "Moderate", 1: "Light", 0: "No Restrictions", "-1": "Pro-Development" };
const SEV_CLASSES = { 4: "badge-ban", 3: "badge-high", 2: "badge-moderate", 1: "badge-proposed", 0: "badge-none", "-1": "badge-pro" };

const TYPE_LABELS = { data_center: "Data Center", ai: "AI Policy", crypto: "Crypto", energy: "Energy", water: "Water" };

/* Featured jurisdictions drawn from ANNOTATIONS (Hood River, Loudoun, Chelan, Umatilla, Berkeley, Cedar Rapids) */
const FEATURED_FIPS = ["41027", "51107", "53007", "41059", "45015", "19113"];

/* ── Home search ── */
function initHomeSearch() {
  const input   = document.getElementById("home-search-input");
  const results = document.getElementById("home-search-results");
  if (!input || !results) return;

  /* Build unified search index */
  const countyIndex = Object.keys(mapData || {}).map(fips => ({
    kind: "county", fips,
    name: mapData[fips].name,
    state: mapData[fips].state,
    level: mapData[fips].level,
    searchText: `${mapData[fips].name} ${mapData[fips].state}`.toLowerCase(),
  }));

  const stateIndex = Object.entries(STATE_FIPS || {}).map(([fips2, abbr]) => ({
    kind: "state", fips2, abbr,
    name: STATE_NAMES[abbr] || abbr,
    searchText: `${STATE_NAMES[abbr] || ""} ${abbr}`.toLowerCase(),
  }));

  const newsIndex = (newsArticles || []).slice(0, 500).map((art, i) => ({
    kind: "news", idx: i,
    title: art.title,
    source: art.source,
    category: art.category,
    art,
    searchText: `${art.title} ${art.source} ${art.category}`.toLowerCase(),
  }));

  const companyIndex = (typeof AI_COMPANIES !== "undefined" ? AI_COMPANIES : []).map(co => ({
    kind: "company",
    ticker: co.ticker,
    name: co.name,
    category: co.category,
    searchText: `${co.name} ${co.ticker} ${co.category}`.toLowerCase(),
  }));

  const allIndex = [...countyIndex, ...stateIndex, ...newsIndex, ...companyIndex];

  function renderHomeResults(matches) {
    results.innerHTML = "";
    if (!matches.length) { results.hidden = true; return; }

    /* Group by kind */
    const groups = { county: [], state: [], news: [], company: [] };
    for (const m of matches) { if (groups[m.kind]) groups[m.kind].push(m); }

    const groupMeta = [
      { key: "county",  label: "Counties" },
      { key: "state",   label: "States" },
      { key: "news",    label: "News" },
      { key: "company", label: "Companies" },
    ];

    for (const { key, label } of groupMeta) {
      const items = groups[key];
      if (!items.length) continue;
      const hdr = document.createElement("div");
      hdr.className = "home-sr-group";
      hdr.textContent = label;
      results.appendChild(hdr);

      for (const m of items) {
        const item = document.createElement("div");
        item.className = "home-sr-item";
        item.setAttribute("role", "option");
        item.setAttribute("tabindex", "-1");

        if (m.kind === "county") {
          const lvl = m.level;
          item.innerHTML = `<span class="home-sr-icon">${HOME_ICONS.location}</span>
            <span class="home-sr-label">${escHtml(m.name)}, <em>${escHtml(m.state)}</em></span>
            <span class="sev-badge ${SEV_CLASSES[lvl] || ""}">${escHtml(SEV_LABELS[lvl] ?? "")}</span>`;
          item.addEventListener("pointerdown", e => {
            e.preventDefault();
            closeHomeSearch();
            switchTab("map");
            setTimeout(() => { selectCounty(m.fips); zoomToFeature(m.fips); }, 100);
          });
        } else if (m.kind === "state") {
          item.innerHTML = `<span class="home-sr-icon">${HOME_ICONS.map}</span>
            <span class="home-sr-label">${escHtml(m.name)}</span>
            <span class="home-sr-tag">State</span>`;
          item.addEventListener("pointerdown", e => {
            e.preventDefault();
            closeHomeSearch();
            switchTab("map");
            setTimeout(() => {
              const stLayer = stateGeoLayer && stateGeoLayer.getLayers().find(l => String(l.feature.id).padStart(2, "0") === m.fips2);
              if (stLayer) leafletMap.flyToBounds(stLayer.getBounds(), { duration: 0.6, padding: [20, 20] });
              showStateDetail(m.fips2);
            }, 100);
          });
        } else if (m.kind === "news") {
          item.innerHTML = `<span class="home-sr-icon">${HOME_ICONS.news}</span>
            <span class="home-sr-label">${escHtml(m.title)}</span>
            <span class="home-sr-tag">${escHtml(m.source || "")}</span>`;
          item.addEventListener("pointerdown", e => {
            e.preventDefault();
            closeHomeSearch();
            switchTab("news");
            setTimeout(() => openArticleDetail && openArticleDetail(m.art, null), 200);
          });
        } else if (m.kind === "company") {
          item.innerHTML = `<span class="home-sr-icon">${HOME_ICONS.stocks}</span>
            <span class="home-sr-label">${escHtml(m.name)} <span class="home-sr-ticker">${escHtml(m.ticker)}</span></span>
            <span class="home-sr-tag">${escHtml(m.category || "")}</span>`;
          item.addEventListener("pointerdown", e => {
            e.preventDefault();
            closeHomeSearch();
            switchTab("stocks");
            setTimeout(() => typeof selectCompany === "function" && selectCompany(m.ticker), 300);
          });
        }

        results.appendChild(item);
      }
    }
    results.hidden = false;
  }

  function closeHomeSearch() {
    results.hidden = true;
    input.value = "";
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.hidden = true; return; }
    const matches = allIndex.filter(c => c.searchText.includes(q)).slice(0, 20);
    renderHomeResults(matches);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2) input.dispatchEvent(new Event("input"));
  });

  input.addEventListener("blur", () => setTimeout(() => { results.hidden = true; }, 120));

  document.getElementById("home-search-btn")?.addEventListener("click", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { input.focus(); return; }
    input.dispatchEvent(new Event("input"));
  });
}

/* ── Recent regulations (highest-level non-pro counties) ── */
function buildRecentRegs() {
  if (!mapData) return [];
  return Object.entries(mapData)
    .filter(([, c]) => c.level >= 2)
    .sort((a, b) => {
      /* Sort by level desc, then by effective_date desc */
      if (b[1].level !== a[1].level) return b[1].level - a[1].level;
      const da = a[1].effective_date || "0";
      const db = b[1].effective_date || "0";
      return db.localeCompare(da);
    })
    .slice(0, 6)
    .map(([fips, c]) => ({ fips, ...c }));
}

/* ── Latest news (most recent 6) ── */
function buildLatestNews() {
  if (!newsArticles || !newsArticles.length) return [];
  return [...newsArticles]
    .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""))
    .slice(0, 6);
}

/* ── Market snapshot companies ── */
function buildMarketSnap() {
  if (typeof AI_COMPANIES === "undefined") return [];
  /* One per category, first ticker */
  const seen = new Set();
  const out = [];
  for (const co of AI_COMPANIES) {
    if (!seen.has(co.category)) {
      seen.add(co.category);
      out.push(co);
    }
    if (out.length >= 8) break;
  }
  return out;
}

/* ── Featured jurisdictions ── */
function buildFeatured() {
  return FEATURED_FIPS.map(fips => {
    const c = mapData && mapData[fips];
    if (!c) return null;
    return { fips, ...c };
  }).filter(Boolean);
}

/* ── KPI summary ── */
function buildKPIs() {
  if (!mapData) return { total: 0, bans: 0, high: 0, moderate: 0, states: 0 };
  const counties = Object.values(mapData);
  const bans     = counties.filter(c => c.level === 4).length;
  const high     = counties.filter(c => c.level === 3).length;
  const moderate = counties.filter(c => c.level === 2).length;
  const stSet    = new Set(counties.map(c => c.state));
  return { total: counties.length, bans, high, moderate, states: stSet.size };
}

/* ── Format relative date ── */
function fmtRelDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const now  = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs  = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Render ticker tape (TradingView) ── */
function renderHomeTicker(container) {
  const companies = typeof AI_COMPANIES !== "undefined"
    ? AI_COMPANIES.filter(c => c.ticker && !c.ticker.startsWith("OTC")).slice(0, 30)
    : [];

  const symbols = companies.map(c => ({
    "proName": `NASDAQ:${c.ticker}`,
    "title":   c.ticker,
  }));

  if (!symbols.length) { container.hidden = true; return; }

  const theme = typeof isDarkTheme === "function" && isDarkTheme() ? "dark" : "light";

  /* Clear and inject the widget */
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "tradingview-widget-container__widget";
  container.appendChild(wrapper);

  const script = document.createElement("script");
  script.type  = "text/javascript";
  script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
  script.async = true;
  script.textContent = JSON.stringify({
    symbols,
    showSymbolLogo:     true,
    isTransparent:      true,
    displayMode:        "adaptive",
    colorTheme:         theme,
    locale:             "en",
  });
  container.appendChild(script);
}

/* ── Skeleton placeholder for data-dependent sections ── */
function homeSkeletonRows(n) {
  return Array.from({ length: n }, () =>
    `<div class="home-skeleton-row"><div class="home-skel home-skel-line"></div><div class="home-skel home-skel-short"></div></div>`
  ).join("");
}

/* ── Main render ── */
function renderHomePage() {
  const view = document.getElementById("home-view");
  if (!view) return;
  if (view.dataset.built === "1") {
    /* Re-render ticker on theme changes */
    renderHomeTicker(view.querySelector(".home-ticker-inner") || document.createElement("div"));
    return;
  }

  /* If core data isn't loaded yet, show skeleton so the page is immediately visible */
  const dataReady = mapData && Object.keys(mapData).length > 0;
  if (!dataReady) {
    view.innerHTML = `
<div class="home-wrap">
  <section class="home-hero">
    <div class="home-hero-inner">
      <div class="home-live-row">
        <span class="home-live-dot"></span>
        <span class="home-live-label">Live Intelligence Platform</span>
      </div>
      <h1 class="home-hero-title">US Data Center &amp; AI<br>Policy Intelligence</h1>
      <p class="home-hero-sub">Track construction restrictions, AI regulations, and computing moratoriums across every US county. Updated daily.</p>
      <div class="home-search-wrap">
        <div class="home-search-box">
          ${HOME_ICONS.search}
          <input id="home-search-input" type="text" placeholder="Search counties, states, companies, news…" autocomplete="off" aria-label="Global search" disabled />
          <button class="home-search-submit" disabled>Search</button>
        </div>
      </div>
    </div>
  </section>
  <section class="home-kpi-strip">
    ${["Counties Tracked","Active Bans","Significant","Moderate","States"].map(l =>
      `<div class="home-kpi-card"><div class="home-skel home-skel-num"></div><div class="home-kpi-label">${l}</div></div>`
    ).join("")}
  </section>
  <section class="home-section home-nav-section">
    <h2 class="home-section-title">Explore the Platform</h2>
    <div class="home-nav-grid">
      <button class="home-nav-card home-nav-map"       onclick="switchTab('map')"       type="button"><span class="home-nav-icon">${HOME_ICONS.map}</span><span class="home-nav-name">Policy Map</span><span class="home-nav-desc">County-level choropleth of data center &amp; AI restrictions</span><span class="home-nav-arrow">${HOME_ICONS.arrow}</span></button>
      <button class="home-nav-card home-nav-news"      onclick="switchTab('news')"      type="button"><span class="home-nav-icon">${HOME_ICONS.news}</span><span class="home-nav-name">AI News</span><span class="home-nav-desc">Curated AI regulation &amp; industry news</span><span class="home-nav-arrow">${HOME_ICONS.arrow}</span></button>
      <button class="home-nav-card home-nav-stocks"    onclick="switchTab('stocks')"    type="button"><span class="home-nav-icon">${HOME_ICONS.stocks}</span><span class="home-nav-name">AI Stocks</span><span class="home-nav-desc">Live market data for 50+ publicly traded AI companies</span><span class="home-nav-arrow">${HOME_ICONS.arrow}</span></button>
      <button class="home-nav-card home-nav-analytics" onclick="switchTab('analytics')" type="button"><span class="home-nav-icon">${HOME_ICONS.analytics}</span><span class="home-nav-name">Analytics</span><span class="home-nav-desc">Policy distribution, state rankings, and trend analysis</span><span class="home-nav-arrow">${HOME_ICONS.arrow}</span></button>
    </div>
  </section>
  <section class="home-section home-two-col">
    <div class="home-col">
      <div class="home-col-header"><h2 class="home-section-title">Recent Restrictions</h2></div>
      <div class="home-reg-list home-skeleton-list">${homeSkeletonRows(4)}</div>
    </div>
    <div class="home-col">
      <div class="home-col-header"><h2 class="home-section-title">Latest News</h2></div>
      <div class="home-news-list home-skeleton-list">${homeSkeletonRows(4)}</div>
    </div>
  </section>
</div>`;
    /* Don't set dataset.built — allows re-render when real data arrives */
    return;
  }

  const kpis     = buildKPIs();
  const regs     = buildRecentRegs();
  const news     = buildLatestNews();
  const featured = buildFeatured();
  const newsTS   = newsArticles && newsArticles.length
    ? fmtRelDate(
        [...newsArticles].sort((a,b) => (b.published_at||"").localeCompare(a.published_at||""))[0]?.published_at
      )
    : null;

  view.innerHTML = `
<div class="home-wrap">

  <!-- Hero -->
  <section class="home-hero">
    <div class="home-hero-inner">
      <div class="home-live-row">
        <span class="home-live-dot"></span>
        <span class="home-live-label">Live Intelligence Platform</span>
      </div>
      <h1 class="home-hero-title">US Data Center &amp; AI<br>Policy Intelligence</h1>
      <p class="home-hero-sub">Track construction restrictions, AI regulations, and computing moratoriums across every US county. Updated daily.</p>

      <!-- Search -->
      <div class="home-search-wrap">
        <div class="home-search-box" role="combobox" aria-expanded="false" aria-haspopup="listbox">
          ${HOME_ICONS.search}
          <input id="home-search-input" type="text" placeholder="Search counties, states, companies, news…" autocomplete="off" aria-label="Global search" aria-autocomplete="list" aria-controls="home-search-results" />
          <button id="home-search-btn" class="home-search-submit" aria-label="Search">Search</button>
        </div>
        <div id="home-search-results" class="home-search-results" role="listbox" hidden></div>
      </div>
    </div>
  </section>

  <!-- KPI strip -->
  <section class="home-kpi-strip">
    <div class="home-kpi-card">
      <div class="home-kpi-num">${kpis.total}</div>
      <div class="home-kpi-label">Counties Tracked</div>
    </div>
    <div class="home-kpi-card home-kpi-ban">
      <div class="home-kpi-num">${kpis.bans}</div>
      <div class="home-kpi-label">Active Bans</div>
    </div>
    <div class="home-kpi-card home-kpi-high">
      <div class="home-kpi-num">${kpis.high}</div>
      <div class="home-kpi-label">Significant Restrictions</div>
    </div>
    <div class="home-kpi-card home-kpi-moderate">
      <div class="home-kpi-num">${kpis.moderate}</div>
      <div class="home-kpi-label">Moderate Restrictions</div>
    </div>
    <div class="home-kpi-card">
      <div class="home-kpi-num">${kpis.states}</div>
      <div class="home-kpi-label">States with Activity</div>
    </div>
  </section>

  <!-- Quick nav cards -->
  <section class="home-section home-nav-section">
    <h2 class="home-section-title">Explore the Platform</h2>
    <div class="home-nav-grid">
      <button class="home-nav-card home-nav-map" onclick="switchTab('map')" type="button">
        <span class="home-nav-icon">${HOME_ICONS.map}</span>
        <span class="home-nav-name">Policy Map</span>
        <span class="home-nav-desc">County-level choropleth of data center &amp; AI restrictions</span>
        <span class="home-nav-arrow">${HOME_ICONS.arrow}</span>
      </button>
      <button class="home-nav-card home-nav-news" onclick="switchTab('news')" type="button">
        <span class="home-nav-icon">${HOME_ICONS.news}</span>
        <span class="home-nav-name">AI News</span>
        <span class="home-nav-desc">Curated AI regulation &amp; industry news${newsTS ? `, updated ${newsTS}` : ""}</span>
        <span class="home-nav-arrow">${HOME_ICONS.arrow}</span>
      </button>
      <button class="home-nav-card home-nav-stocks" onclick="switchTab('stocks')" type="button">
        <span class="home-nav-icon">${HOME_ICONS.stocks}</span>
        <span class="home-nav-name">AI Stocks</span>
        <span class="home-nav-desc">Live market data for 50+ publicly traded AI companies</span>
        <span class="home-nav-arrow">${HOME_ICONS.arrow}</span>
      </button>
      <button class="home-nav-card home-nav-analytics" onclick="switchTab('analytics')" type="button">
        <span class="home-nav-icon">${HOME_ICONS.analytics}</span>
        <span class="home-nav-name">Analytics</span>
        <span class="home-nav-desc">Policy distribution, state rankings, and trend analysis</span>
        <span class="home-nav-arrow">${HOME_ICONS.arrow}</span>
      </button>
    </div>
  </section>

  <!-- Two-column: recent regulations + latest news -->
  <section class="home-section home-two-col">

    <!-- Recent regulations -->
    <div class="home-col">
      <div class="home-col-header">
        <h2 class="home-section-title">Recent Restrictions</h2>
        <button class="home-col-link" onclick="switchTab('map')" type="button">View map ${HOME_ICONS.arrow}</button>
      </div>
      <div class="home-reg-list">
        ${regs.length ? regs.map(c => `
        <div class="home-reg-item" role="button" tabindex="0" data-fips="${escHtml(c.fips)}" aria-label="${escHtml(c.name)}, ${escHtml(c.state)}">
          <div class="home-reg-top">
            <span class="home-reg-name">${escHtml(c.name)}, <span class="home-reg-state">${escHtml(c.state)}</span></span>
            <span class="sev-badge ${SEV_CLASSES[c.level] || ""}">${escHtml(SEV_LABELS[c.level] ?? "")}</span>
          </div>
          <div class="home-reg-title">${escHtml(c.title || "")}</div>
          <div class="home-reg-meta">
            ${(c.types || []).map(t => `<span class="home-type-chip">${escHtml(TYPE_LABELS[t] || t)}</span>`).join("")}
            ${c.effective_date ? `<span class="home-reg-date">${escHtml(c.effective_date)}</span>` : ""}
          </div>
        </div>`).join("") : '<div class="home-empty">No high-restriction counties found.</div>'}
      </div>
    </div>

    <!-- Latest news -->
    <div class="home-col">
      <div class="home-col-header">
        <h2 class="home-section-title">Latest News</h2>
        <button class="home-col-link" onclick="switchTab('news')" type="button">All news ${HOME_ICONS.arrow}</button>
      </div>
      <div class="home-news-list">
        ${news.length ? news.map((art, i) => `
        <div class="home-news-item" role="button" tabindex="0" data-newsidx="${i}" aria-label="${escHtml(art.title)}">
          <div class="home-news-cat">${escHtml(art.category || "")}</div>
          <div class="home-news-title">${escHtml(art.title)}</div>
          <div class="home-news-meta">
            <span class="home-news-src">${escHtml(art.source || "")}</span>
            <span class="home-news-ts">${fmtRelDate(art.published_at)}</span>
          </div>
        </div>`).join("") : '<div class="home-empty">No articles loaded yet. Check the News tab after the hourly feed runs.</div>'}
      </div>
    </div>

  </section>

  <!-- Market ticker -->
  <section class="home-section home-ticker-section">
    <div class="home-col-header">
      <h2 class="home-section-title">AI Market Pulse</h2>
      <button class="home-col-link" onclick="switchTab('stocks')" type="button">Full dashboard ${HOME_ICONS.arrow}</button>
    </div>
    <div class="home-ticker-wrap">
      <div class="home-ticker-inner tradingview-widget-container"></div>
    </div>
  </section>

  <!-- Featured jurisdictions -->
  ${featured.length ? `
  <section class="home-section">
    <div class="home-col-header">
      <h2 class="home-section-title">Featured Jurisdictions</h2>
      <button class="home-col-link" onclick="switchTab('map')" type="button">Explore map ${HOME_ICONS.arrow}</button>
    </div>
    <div class="home-featured-grid">
      ${featured.map(c => `
      <div class="home-featured-card" role="button" tabindex="0" data-fips="${escHtml(c.fips)}" aria-label="${escHtml(c.name)}, ${escHtml(c.state)}">
        <div class="home-featured-top">
          <span class="home-featured-name">${escHtml(c.name)}</span>
          <span class="sev-badge ${SEV_CLASSES[c.level] || ""}">${escHtml(SEV_LABELS[c.level] ?? "")}</span>
        </div>
        <div class="home-featured-state">${escHtml(c.state)}</div>
        <div class="home-featured-desc">${escHtml((c.description || "").slice(0, 120))}${(c.description || "").length > 120 ? "…" : ""}</div>
        <div class="home-featured-types">${(c.types || []).map(t => `<span class="home-type-chip">${escHtml(TYPE_LABELS[t] || t)}</span>`).join("")}</div>
      </div>`).join("")}
    </div>
  </section>` : ""}

  <!-- Newsletter placeholder -->
  <section class="home-section">
    <div class="home-newsletter-card">
      <div class="home-newsletter-icon">${HOME_ICONS.mail}</div>
      <div class="home-newsletter-body">
        <div class="home-newsletter-title">Policy Digest</div>
        <div class="home-newsletter-sub">Weekly summary of new data center restrictions, AI regulations, and policy developments. Coming soon.</div>
      </div>
      <button class="home-newsletter-btn" type="button" disabled aria-disabled="true">Notify Me</button>
    </div>
  </section>

  <!-- Footer -->
  <footer id="site-footer">
    <div id="footer-inner">
      <div id="footer-brand">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="6" fill="#4874e8" opacity="0.15"/>
          <polygon points="4,8 10,5 18,8 24,5 24,23 18,26 10,23 4,26" stroke="#4874e8" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
          <line x1="10" y1="5" x2="10" y2="23" stroke="#4874e8" stroke-width="1.5"/>
          <line x1="18" y1="8" x2="18" y2="26" stroke="#4874e8" stroke-width="1.5"/>
        </svg>
        <div>
          <div id="footer-brand-name">US DC &amp; AI Policy Tracker</div>
          <div id="footer-brand-tagline">Intelligence Platform</div>
        </div>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Platform</div>
        <button class="footer-link" onclick="switchTab('map')"    type="button">Policy Map</button>
        <button class="footer-link" onclick="switchTab('news')"   type="button">AI News</button>
        <button class="footer-link" onclick="switchTab('stocks')" type="button">AI Stocks</button>
        <button class="footer-link" onclick="switchTab('analytics')" type="button">Analytics</button>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Data</div>
        <button class="footer-link" onclick="switchTab('about')"  type="button">Methodology</button>
        <button class="footer-link" onclick="switchTab('about')"  type="button">Data Sources</button>
        <button class="footer-link" onclick="switchTab('about')"  type="button">About</button>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Restriction Levels</div>
        <div class="footer-legend-row"><span class="sev-badge badge-ban">Ban</span> Active moratorium</div>
        <div class="footer-legend-row"><span class="sev-badge badge-high">Significant</span> Density limits / zone bans</div>
        <div class="footer-legend-row"><span class="sev-badge badge-moderate">Moderate</span> Pending legislation</div>
        <div class="footer-legend-row"><span class="sev-badge badge-proposed">Light</span> Minor requirements</div>
        <div class="footer-legend-row"><span class="sev-badge badge-pro">Pro-Dev</span> Incentives / fast-track</div>
      </div>
    </div>
    <div id="footer-bottom">
      <span>Data updated daily. Not legal advice.</span>
      <span id="footer-year"></span>
    </div>
  </footer>

</div><!-- /.home-wrap -->
`;

  view.dataset.built = "1";

  /* Set footer year */
  const fyEl = view.querySelector("#footer-year");
  if (fyEl) fyEl.textContent = `© ${new Date().getFullYear()} US DC & AI Policy Tracker`;

  /* Ticker tape */
  const tickerInner = view.querySelector(".home-ticker-inner");
  if (tickerInner) renderHomeTicker(tickerInner);

  /* Bind regulation item clicks → map tab + county select */
  view.querySelectorAll(".home-reg-item[data-fips]").forEach(el => {
    const handler = () => {
      const fips = el.dataset.fips;
      switchTab("map");
      setTimeout(() => { selectCounty(fips); zoomToFeature(fips); }, 100);
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Bind featured card clicks */
  view.querySelectorAll(".home-featured-card[data-fips]").forEach(el => {
    const handler = () => {
      const fips = el.dataset.fips;
      switchTab("map");
      setTimeout(() => { selectCounty(fips); zoomToFeature(fips); }, 100);
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Bind news item clicks */
  const homeNewsItems = view.querySelectorAll(".home-news-item[data-newsidx]");
  homeNewsItems.forEach(el => {
    const idx = parseInt(el.dataset.newsidx, 10);
    const art = news[idx];
    if (!art) return;
    const handler = () => {
      switchTab("news");
      setTimeout(() => openArticleDetail && openArticleDetail(art, null), 200);
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Init home search */
  initHomeSearch();
}
