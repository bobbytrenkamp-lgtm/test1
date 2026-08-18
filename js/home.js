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

/* Compact level labels — defined in js/constants.js (see docs/TERMINOLOGY.md). */
const SEV_LABELS = window.LEVEL_SHORT;
const SEV_CLASSES = { 4: "badge-ban", 3: "badge-high", 2: "badge-moderate", 1: "badge-proposed", 0: "badge-none", "-1": "badge-pro" };

/* Featured jurisdictions drawn from ANNOTATIONS (Hood River, Loudoun, Chelan, Umatilla, Berkeley, Cedar Rapids) */
const FEATURED_FIPS = ["41027", "51107", "53007", "41059", "45015", "19113"];

/* ── Facility statistics (loaded async from data files) ── */
let _dcStats = null;

/* Read the three facility counts from platform_metadata.json (a few hundred
   bytes) rather than downloading facilities_master.json, which is 4.85 MB and
   was being fetched on every page load — including on Home, which only needs
   these totals. The metadata file is the declared source of truth for them and
   is validated against facilities_master.json by
   data/validate_platform_metadata.py, so the numbers cannot silently drift. */
(function loadFacilityStats() {
  const apply = () => {
    const stat = window.platformStat;
    if (typeof stat !== "function") return;
    const total = stat("freshness.facilities_total", null);
    if (total == null) return;
    _dcStats = {
      existing: stat("freshness.facilities_operational", 0),
      proposed: stat("freshness.facilities_planned", 0),
      total,
    };
    const view = document.getElementById("home-view");
    if (view && view.dataset.built === "1") {
      view.dataset.built = "";
      renderHomePage();
    }
  };
  if (window.PLATFORM_META) apply();
  else if (typeof window.loadPlatformMeta === "function") window.loadPlatformMeta().then(apply);
}());

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

  let kbIdx = -1;
  function highlightHomeItem(idx) {
    const items = results.querySelectorAll(".home-sr-item");
    items.forEach((it, i) => it.classList.toggle("kb-active", i === idx));
    if (items[idx]) items[idx].scrollIntoView({ block: "nearest" });
    kbIdx = idx;
  }

  input.addEventListener("input", () => {
    kbIdx = -1;
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.hidden = true; return; }
    const matches = allIndex.filter(c => c.searchText.includes(q)).slice(0, 20);
    renderHomeResults(matches);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2) input.dispatchEvent(new Event("input"));
  });

  input.addEventListener("blur", () => setTimeout(() => { results.hidden = true; kbIdx = -1; }, 120));

  input.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeHomeSearch();
      kbIdx = -1;
      input.blur();
      return;
    }
    const items = results.querySelectorAll(".home-sr-item");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightHomeItem(Math.min(kbIdx + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (kbIdx > 0) { highlightHomeItem(kbIdx - 1); }
      else { highlightHomeItem(-1); items.forEach(it => it.classList.remove("kb-active")); }
    } else if (e.key === "Enter" && kbIdx >= 0 && items[kbIdx]) {
      e.preventDefault();
      items[kbIdx].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    }
  });

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

/* ── Top development sites: no restrictions, B+ suitability, sorted by score ── */
function buildTopSites() {
  if (typeof computeSuitabilityScore !== "function" || !mapData) return [];
  const wsData  = window.DC_WATER_STRESS_FULL || {};
  const incData = window.DC_INCENTIVES_FIPS   || {};
  const WS_LABELS = ["Low", "Low-Med", "Med-High", "High", "Extreme"];

  const results = [];
  for (const fips in mapData) {
    const c = mapData[fips];
    if ((c.level || 0) > 0) continue;
    const suit = computeSuitabilityScore(fips, c);
    if (suit.score < 65) continue;
    const ws     = (wsData[fips] !== undefined && wsData[fips] !== null) ? wsData[fips] : null;
    const hasInc = !!(incData[fips]);
    results.push({ fips, name: c.name, state: c.state, level: c.level, suit, ws, wsLabel: ws !== null ? (WS_LABELS[ws] || String(ws)) : null, hasInc });
  }

  results.sort((a, b) => {
    if (b.suit.score !== a.suit.score) return b.suit.score - a.suit.score;
    const wa = a.ws !== null ? a.ws : 99;
    const wb = b.ws !== null ? b.ws : 99;
    if (wa !== wb) return wa - wb;
    return (b.hasInc ? 1 : 0) - (a.hasInc ? 1 : 0);
  });

  return results.slice(0, 10);
}

/* ── Recently reviewed counties (using last_reviewed field) ── */
function buildRecentlyReviewed() {
  if (!mapData) return [];
  return Object.entries(mapData)
    .filter(([, c]) => c.last_reviewed)
    .sort((a, b) => (b[1].last_reviewed || "").localeCompare(a[1].last_reviewed || ""))
    .slice(0, 6)
    .map(([fips, c]) => ({ fips, ...c }));
}

/* ── Recently visited counties (set by map.js selectCounty) ── */
function buildRecentlyVisited() {
  if (!mapData) return [];
  let fipsArr;
  try { fipsArr = JSON.parse(localStorage.getItem("dc-recent-counties-v1") || "[]"); }
  catch (_) { fipsArr = []; }
  return fipsArr.slice(0, 8).map(fips => {
    const c = mapData[fips];
    return { fips, name: c ? c.name : fips, state: c ? c.state : "", level: c ? (c.level ?? 0) : 0 };
  });
}

/* ── Watchlist portfolio health summary ── */
function _buildWatchlistPortfolio(watchlist) {
  if (!watchlist.length || typeof computeSuitabilityScore !== "function" || !mapData) return null;
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let scoreSum = 0, scoreN = 0;
  let bans = 0, restricted = 0, open = 0, pro = 0;
  for (const w of watchlist) {
    const county = mapData[w.fips];
    if (!county) continue;
    const s = computeSuitabilityScore(w.fips, county);
    if (s) { grades[s.grade] = (grades[s.grade] || 0) + 1; scoreSum += s.score; scoreN++; }
    const lvl = w.level;
    if (lvl >= 4) bans++;
    else if (lvl >= 1) restricted++;
    else if (lvl === -1) pro++;
    else open++;
  }
  if (!scoreN) return null;
  const avgScore = Math.round(scoreSum / scoreN);
  const avgGrade = avgScore >= 80 ? "A" : avgScore >= 65 ? "B" : avgScore >= 45 ? "C" : avgScore >= 25 ? "D" : "F";
  return { grades, avgScore, avgGrade, bans, restricted, open, pro, total: watchlist.length };
}

/* ── County watchlist (reads from localStorage written by map.js) ── */
function buildWatchlist() {
  if (!mapData) return [];
  let fipsArr;
  fipsArr = window.WATCHLIST ? window.WATCHLIST.fipsList() : [];
  const wsData  = window.DC_WATER_STRESS_FULL || {};
  const WS_LABELS = ["Low", "Low-Med", "Med-High", "High", "Extreme"];
  return fipsArr.map(fips => {
    const c = mapData[fips];
    const ws = (wsData[fips] !== undefined && wsData[fips] !== null) ? wsData[fips] : null;
    return {
      fips,
      name:    c ? c.name  : fips,
      state:   c ? c.state : "",
      level:   c ? (c.level ?? 0) : 0,
      wsLabel: ws !== null ? (WS_LABELS[ws] || String(ws)) : null,
    };
  });
}

/* ── Recent policy activity (most recently dated entries, any level) ── */
function buildRecentActivity() {
  if (!mapData) return [];
  return Object.entries(mapData)
    .filter(([, c]) => c.effective_date || c.date)
    .map(([fips, c]) => ({ fips, ...c, _date: c.effective_date || c.date }))
    .sort((a, b) => b._date.localeCompare(a._date))
    .slice(0, 10);
}

/* ── KPI summary ── */
function buildKPIs() {
  if (!mapData) return { total: 0, bans: 0, high: 0, moderate: 0, states: 0, dcExisting: null, dcProposed: null, dataDate: null };
  const counties = Object.values(mapData);
  const bans     = counties.filter(c => c.level === 4).length;
  const high     = counties.filter(c => c.level === 3).length;
  const moderate = counties.filter(c => c.level === 2).length;
  const stSet    = new Set(counties.map(c => c.state));
  // Most recent effective_date/date in the dataset
  let dataDate = null;
  for (const c of counties) {
    const d = c.effective_date || c.date;
    if (d && (!dataDate || d > dataDate)) dataDate = d;
  }
  return {
    // Not counties.length: 597 records are research_status=descriptive_only
    // (a general description, no policy research ever done) and must not be
    // counted in a "researched" claim — see js/constants.js researchedCount().
    total: window.researchedCount ? window.researchedCount() : counties.length,
    bans, high, moderate, states: stSet.size,
    dcExisting: _dcStats ? _dcStats.existing : null,
    dcProposed: _dcStats ? _dcStats.proposed : null,
    dataDate,
  };
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
    "proName": c.ticker,
    "title":   c.symbol,
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

/* Any watchlist change invalidates the cached Home render. Without this, a
   county watched from the Jurisdiction page did not appear on Home until a
   full reload, because renderHomePage() early-returns once dataset.built is
   set. Subscribing centrally covers every caller, not just the map's
   toggleWatchCounty(). */
if (window.WATCHLIST && typeof window.WATCHLIST.onChange === "function") {
  window.WATCHLIST.onChange(() => {
    const view = document.getElementById("home-view");
    if (!view) return;
    delete view.dataset.built;
    if (!view.hidden) renderHomePage();
  });
}

/* ── Policy change alerts (Phase 4) ───────────────────────────────────────
   Renders real changes detected by comparing each watched county's stored
   policy snapshot against the current dataset. This is in-app detection that
   runs when the page loads — deliberately NOT described as email or push,
   because no such delivery exists. Built with DOM nodes rather than innerHTML
   since county names and policy titles come from data files. */
/* ── Home Economic Pulse ─────────────────────────────────────────────────────
   FOUR indicators and a link. Home is a landing page, not a second dashboard,
   so this is deliberately minimal.

   PERFORMANCE: reads only fred_data.json and census_state.json. It must NEVER
   fetch data/economy/census_county.json — that file carries per-county history
   for ~3,140 counties and would undo the critical-path work documented in
   AI_CONTEXT.md. tests/e2e_smoke.mjs's "Economic Intelligence" section
   asserts this (checks performance.getEntriesByType('resource') on Home). */
function _renderHomeEconomicPulse(view) {
  const strip = view.querySelector("#home-econ-strip");
  const note  = view.querySelector("#home-econ-note");
  const section = view.querySelector("#home-econ-pulse");
  if (!strip || !window.ECONOMY) { if (section) section.hidden = true; return; }

  const E = window.ECONOMY;

  Promise.all([E.load("fred"), E.load("state"), E.load("meta")])
    .then(([fred, stateData, meta]) => {
      if (!E.hasFred(fred) && !E.hasState(stateData)) {
        // Nothing generated yet. Keep it to one quiet line rather than a large
        // awaiting-data block — this is Home, and the Economy tab explains it.
        strip.innerHTML = "";
        if (note) {
          note.textContent = "Economic indicators have not been generated for this deployment yet. " +
            "Open Economic Intelligence for details.";
        }
        return;
      }

      const items = [];

      const add = (id, label, opts) => {
        const s = (fred && fred.series) ? fred.series[id] : null;
        if (!s || s.latest_value === null || s.latest_value === undefined) return;
        const o = opts || {};
        const value = o.yoy ? s.change_yoy_pct : s.latest_value;
        if (value === null || value === undefined) return;
        const dir = E.direction(o.yoy ? s.change_yoy_pct : s.change_abs, o.invert);
        items.push({
          label,
          value: E.fmtValue(value, o.yoy ? "percent" : o.unit, o.dec),
          change: o.yoy ? "year over year"
            : (s.change_abs === null || s.change_abs === undefined ? ""
               : `${dir.glyph} ${E.fmtChange(s.change_abs, o.unit)}`),
          cls: dir.cls,
          date: E.fmtDate(s.latest_date),
          // Same staleness the Economy tab's KPI strip discloses per series
          // (js/economy-view.js renderKpis) -- Home reads the same fred_data.json
          // record, so it must not present a number as current that the Economy
          // tab would flag as stale. Without this, the two surfaces could show
          // the same indicator with different honesty, which is worse than
          // showing it nowhere.
          stale: !!s.stale,
          staleDays: s.stale_days,
        });
      };

      add("DFF",    "Fed Funds Rate",       { unit: "percent", dec: 2 });
      add("DGS10",  "10-Year Treasury",     { unit: "percent", dec: 2 });
      add("UNRATE", "US Unemployment",      { unit: "percent", dec: 1, invert: true });

      /* Fourth slot: 5-year population growth for the featured jurisdiction.
         Uses the STATE file, not the county file, to keep Home's payload small. */
      const states = (stateData && stateData.states) || {};
      const featuredFips = "51";   // Virginia — the platform's densest DC market
      const st = states[featuredFips];
      const g5 = st ? E.metricValue(st, "population", "change_5y") : null;
      if (g5 !== null && g5 !== undefined) {
        const dir = E.direction(g5, false);
        items.push({
          label: `${st.name} Population (5-yr)`,
          value: E.fmtPct(g5),
          change: `${dir.glyph} ACS ${stateData.acs_vintage}`,
          cls: dir.cls,
          date: `ACS ${stateData.acs_vintage} 5-year estimates`,
        });
      }

      if (!items.length) {
        strip.innerHTML = "";
        if (note) note.textContent = "No economic indicators are available yet.";
        return;
      }

      strip.innerHTML = items.slice(0, 4).map(it => `
        <div class="home-econ-item">
          <div class="home-econ-label">${escHtml(it.label)}</div>
          <div class="home-econ-value">${escHtml(it.value)}</div>
          ${it.change ? `<div class="home-econ-change ${it.cls}">${escHtml(it.change)}</div>` : ""}
          <div class="home-econ-date">${escHtml(it.date)}
            ${it.stale ? `<span class="econ-stale-chip" title="No new observation for ${escHtml(String(it.staleDays))} days">stale</span>` : ""}
          </div>
        </div>`).join("");

      if (note) {
        note.textContent = "Latest available values — Federal Reserve Economic Data (FRED), " +
          "Federal Reserve Bank of St. Louis, and U.S. Census Bureau ACS 5-Year Estimates. " +
          "Not real-time.";
      }
    })
    .catch(() => {
      strip.innerHTML = "";
      if (note) note.textContent = "Economic indicators could not be loaded.";
    });
}

function _renderWatchlistChanges(view) {
  const host = view.querySelector("#home-watchlist-changes");
  if (!host || !window.WATCHLIST) return;
  host.textContent = "";

  const changed = window.WATCHLIST.diff();
  if (!changed.length) return;

  const total = changed.reduce((n, c) => n + c.changes.length, 0);

  const box = document.createElement("div");
  box.className = "wl-changes";
  box.setAttribute("role", "status");

  const head = document.createElement("div");
  head.className = "wl-changes-head";

  const title = document.createElement("div");
  title.className = "wl-changes-title";
  title.textContent = `${total} policy ${total === 1 ? "change" : "changes"} since you last checked`;

  const ack = document.createElement("button");
  ack.type = "button";
  ack.className = "wl-changes-ack";
  ack.textContent = "Mark all reviewed";
  ack.addEventListener("click", () => {
    window.WATCHLIST.acknowledge();
    host.textContent = "";
    if (typeof showMapToast === "function") showMapToast("Watchlist changes marked reviewed");
  });

  head.append(title, ack);
  box.appendChild(head);

  const list = document.createElement("ul");
  list.className = "wl-changes-list";
  for (const c of changed) {
    const li = document.createElement("li");

    const link = document.createElement("a");
    link.className = "wl-changes-county";
    link.href = `#jurisdiction?fips=${encodeURIComponent(c.fips)}`;
    link.textContent = c.state ? `${c.name}, ${c.state}` : c.name;
    li.appendChild(link);

    const ul = document.createElement("ul");
    for (const ch of c.changes) {
      const d = document.createElement("li");
      d.className = "wl-change-item" + (ch.dir ? ` wl-change-${ch.dir}` : "");
      d.textContent = ch.text;
      ul.appendChild(d);
    }
    li.appendChild(ul);
    list.appendChild(li);
  }
  box.appendChild(list);

  const note = document.createElement("div");
  note.className = "wl-changes-note";
  note.textContent = "Detected in your browser when this page loads by comparing each county "
    + "against its state when you added it. No email or push notifications are sent.";
  box.appendChild(note);

  host.appendChild(box);
}

/* ── Portable watchlist bundles (Phase 4) ─────────────────────────────────
   A downloadable file a colleague can import. Not realtime collaboration —
   there is no shared backend; this is an explicit hand-off. */
function _shareWatchlistBundle() {
  if (!window.WATCHLIST || !window.WATCHLIST.count()) {
    if (typeof showMapToast === "function") showMapToast("Watchlist is empty");
    return;
  }
  const bundle = window.WATCHLIST.exportBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `watchlist-${new Date().toISOString().slice(0, 10)}.json`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (typeof showMapToast === "function") {
    showMapToast(`Exported ${bundle.count} counties — share this file with your team`);
  }
}

function _importWatchlistBundle() {
  if (!window.WATCHLIST) return;
  const input = Object.assign(document.createElement("input"), {
    type: "file",
    accept: "application/json,.json",
  });
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(String(reader.result)); }
      catch (_) {
        if (typeof showMapToast === "function") showMapToast("That file is not valid JSON");
        return;
      }
      const r = window.WATCHLIST.importBundle(parsed);
      if (!r.ok) {
        if (typeof showMapToast === "function") showMapToast(r.error || "Import failed");
        return;
      }
      if (typeof showMapToast === "function") {
        const parts = [];
        if (r.added) parts.push(`${r.added} added`);
        if (r.notesFilled) parts.push(`${r.notesFilled} notes merged`);
        if (r.skipped) parts.push(`${r.skipped} skipped`);
        showMapToast(parts.length ? `Imported: ${parts.join(", ")}` : "Nothing new to import");
      }
      // Rebuild home so the watchlist section reflects the import.
      const homeEl = document.getElementById("home-view");
      if (homeEl) { delete homeEl.dataset.built; renderHomePage(); }
    };
    reader.readAsText(file);
  });
  input.click();
}

/* ── Export watchlist as CSV ── */
function _exportWatchlistCSV() {
  if (!mapData) return;
  let fipsArr;
  fipsArr = window.WATCHLIST ? window.WATCHLIST.fipsList() : [];
  if (!fipsArr.length) { showMapToast && showMapToast("Watchlist is empty"); return; }

  const wsData   = window.DC_WATER_STRESS_FULL || {};
  const incData  = window.DC_INCENTIVES_FIPS   || {};
  const WS_LABELS = ["Low","Low-Med","Med-High","High","Extreme"];
  const LVL_LABELS = window.LEVEL_LABELS;
  const TYPE_MAP  = { data_center:"Data Center", ai:"AI Regulation", energy:"Energy / Grid", crypto:"Crypto / HPC", water:"Water Use" };

  const csvCell = v => {
    let s = String(v ?? "");
    // CSV/formula injection guard: incentive-program/notes text is sourced
    // from policy documents, not written by us, so a leading =/+/-/@ can't
    // be assumed safe -- Excel/Sheets would interpret it as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return (s.includes(",") || s.includes('"') || s.includes("\n")) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const header = ["FIPS","County","State","Restriction Level","Level Label","Status","Effective Date","Policy Types","Suitability Score","Suitability Grade","Water Stress","Water Stress Label","Incentive Programs"];
  const rows = fipsArr.map(fips => {
    const c   = mapData[fips] || {};
    const lvl = c.level ?? 0;
    const ws  = (wsData[fips] !== undefined && wsData[fips] !== null) ? wsData[fips] : "";
    const wsLabel = ws !== "" ? (WS_LABELS[ws] || String(ws)) : "";
    const incProgs = (incData[fips] || []).map(p => p.program_name || p.name || "").filter(Boolean).join("; ");
    const types    = (c.types || []).map(t => TYPE_MAP[t] || t).join("; ");
    let suit = { score: "", grade: "" };
    if (typeof computeSuitabilityScore === "function") {
      try { suit = computeSuitabilityScore(fips, c); } catch (_) {}
    }
    return [fips, c.name||fips, c.state||"", lvl, LVL_LABELS[String(lvl)]||String(lvl), c.status||"active",
      c.effective_date||c.date||"", types, suit.score, suit.grade, ws, wsLabel, incProgs].map(csvCell).join(",");
  });

  const csv  = [header.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url, download: `dc-watchlist-${new Date().toISOString().slice(0,10)}.csv`,
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ── Policy change detection ── */
let _policySnapshot = null;

(function _initSnapshot() {
  try {
    const raw = localStorage.getItem("dc-policy-snapshot-v1");
    if (raw) _policySnapshot = JSON.parse(raw);
  } catch (_) {}
}());

function _detectPolicyChanges() {
  if (!_policySnapshot || !_policySnapshot.data || !mapData || !Object.keys(mapData).length) return [];
  const snap  = _policySnapshot.data;
  const out   = [];
  for (const fips in mapData) {
    const cur  = mapData[fips].level ?? 0;
    const prev = snap[fips];
    if (prev !== undefined && prev !== cur) {
      out.push({ fips, name: mapData[fips].name, state: mapData[fips].state, oldLevel: prev, newLevel: cur });
    }
  }
  // Sort: biggest change first (abs diff), then by newLevel desc
  out.sort((a, b) => {
    const da = Math.abs(b.newLevel - b.oldLevel);
    const db = Math.abs(a.newLevel - a.oldLevel);
    if (da !== db) return da - db;
    return b.newLevel - a.newLevel;
  });
  return out.slice(0, 12);
}

function _savePolicySnapshot() {
  if (!mapData || !Object.keys(mapData).length) return;
  try {
    const data = {};
    for (const fips in mapData) data[fips] = mapData[fips].level ?? 0;
    const snap = { ts: new Date().toISOString().slice(0, 10), data };
    localStorage.setItem("dc-policy-snapshot-v1", JSON.stringify(snap));
    _policySnapshot = snap;
  } catch (_) {}
}

/* ── Navigate map to a state (used by state chips) ── */
function _jumpToState(abbr) {
  // Build abbr → fips2 reverse map from STATE_FIPS (const in map.js scope)
  const sfMap = typeof STATE_FIPS !== "undefined" ? STATE_FIPS : {};
  const fips2 = Object.keys(sfMap).find(k => sfMap[k] === abbr);
  if (!fips2) return;
  switchTab("map");
  (typeof mapInitPromise !== "undefined" && mapInitPromise
    ? mapInitPromise : Promise.resolve()
  ).then(() => {
    if (typeof stateGeoLayer !== "undefined" && stateGeoLayer && typeof leafletMap !== "undefined" && leafletMap) {
      const layer = stateGeoLayer.getLayers().find(l => String(l.feature.id).padStart(2,"0") === fips2);
      if (layer) leafletMap.flyToBounds(layer.getBounds(), { duration: 0.7, padding: [30, 30] });
    }
    if (typeof showStateDetail === "function") showStateDetail(fips2);
  });
}

/* ── Live Policy Digest ── */
function _buildPolicyDigest() {
  if (!mapData || !Object.keys(mapData).length) return null;
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const recent = [];
  const openA   = [];
  const proposed = [];
  for (const fips in mapData) {
    const c = mapData[fips];
    const dateStr = c.effective_date || c.date || "";
    if (dateStr) {
      const d = new Date(dateStr + "T00:00:00").getTime();
      if (!isNaN(d) && now - d <= ninetyDays && (c.level ?? 0) >= 1) {
        recent.push({ fips, name: c.name, state: c.state, level: c.level, date: dateStr });
      }
    }
    const st = c.status || "active";
    if (st === "proposed" || st === "pending" || c.lifecycle_stage === "proposed") {
      proposed.push({ fips, name: c.name, state: c.state, level: c.level ?? 1 });
    }
    if ((c.level ?? 0) <= 0 && typeof computeSuitabilityScore === "function") {
      const suit = computeSuitabilityScore(fips, c);
      if (suit && suit.grade === "A") openA.push({ fips, name: c.name, state: c.state, score: suit.score });
    }
  }
  recent.sort((a, b) => b.date.localeCompare(a.date));
  openA.sort((a, b) => b.score - a.score);
  return { recent: recent.slice(0, 3), openA: openA.slice(0, 3), proposedCount: proposed.length };
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
        <span class="home-live-label">Intelligence Platform</span>
      </div>
      <h1 class="home-hero-title">US Data Center &amp; AI<br>Policy Intelligence</h1>
      <p class="home-hero-sub">Track construction restrictions, AI regulations, and computing moratoriums across ${(window.researchedCount ? window.researchedCount() : 870).toLocaleString()} researched jurisdictions. Policy data manually verified from official government sources.</p>
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
    ${["Counties Researched","Active Bans","Significant Restrictions","Moderate Restrictions","States with Activity","Data Centers","Proposed"].map(l =>
      `<div class="home-kpi-card"><div class="home-skel home-skel-num"></div><div class="home-kpi-label">${l}</div></div>`
    ).join("")}
  </section>
  <section class="home-section home-nav-section">
    <h2 class="home-section-title">Explore the Platform</h2>
    <div class="home-nav-grid">
      <button class="home-nav-card home-nav-map"       onclick="switchTab('map')"       type="button"><span class="home-nav-icon">${HOME_ICONS.map}</span><span class="home-nav-name">Policy Map</span><span class="home-nav-desc">County-level choropleth of data center &amp; AI restrictions</span><span class="home-nav-arrow">${HOME_ICONS.arrow}</span></button>
      <button class="home-nav-card home-nav-news"      onclick="switchTab('news')"      type="button"><span class="home-nav-icon">${HOME_ICONS.news}</span><span class="home-nav-name">AI News</span><span class="home-nav-desc">Curated AI regulation &amp; industry news</span><span class="home-nav-arrow">${HOME_ICONS.arrow}</span></button>
      <button class="home-nav-card home-nav-stocks"    onclick="switchTab('stocks')"    type="button"><span class="home-nav-icon">${HOME_ICONS.stocks}</span><span class="home-nav-name">AI Stocks</span><span class="home-nav-desc">44 publicly traded AI companies — market data via TradingView (delayed 15 min)</span><span class="home-nav-arrow">${HOME_ICONS.arrow}</span></button>
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

  const kpis           = buildKPIs();
  const regs           = buildRecentRegs();
  const news           = buildLatestNews();
  const featured       = buildFeatured();
  const recentActivity = buildRecentActivity();
  const topSites           = buildTopSites();
  const watchlist          = buildWatchlist();
  const portfolio          = _buildWatchlistPortfolio(watchlist);
  const recentlyVisited    = buildRecentlyVisited();
  const recentlyReviewed   = buildRecentlyReviewed();
  const digest             = _buildPolicyDigest();
  const policyChanges      = _detectPolicyChanges();
  if (!policyChanges.length) _savePolicySnapshot();  // keep baseline current when no changes
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
        <span class="home-live-label">Intelligence Platform</span>
      </div>
      <h1 class="home-hero-title">US Data Center &amp; AI<br>Policy Intelligence</h1>
      <p class="home-hero-sub">Track construction restrictions, AI regulations, and computing moratoriums across ${(window.researchedCount ? window.researchedCount() : 870).toLocaleString()} researched jurisdictions. Policy data manually verified from official government sources.</p>

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
      <div class="home-kpi-label">Counties Researched</div>
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
    <div class="home-kpi-card home-kpi-dc">
      <div class="home-kpi-num">${kpis.dcExisting !== null ? kpis.dcExisting : '<span class="home-skel home-skel-num" style="display:inline-block;width:36px;height:28px;border-radius:4px"></span>'}</div>
      <div class="home-kpi-label">Data Centers</div>
    </div>
    <div class="home-kpi-card home-kpi-proposed">
      <div class="home-kpi-num">${kpis.dcProposed !== null ? kpis.dcProposed : '<span class="home-skel home-skel-num" style="display:inline-block;width:36px;height:28px;border-radius:4px"></span>'}</div>
      <div class="home-kpi-label">Proposed</div>
    </div>
  </section>
  <div class="home-freshness-bar">
    <span class="home-freshness-dot"></span>
    ${kpis.dataDate ? `Policy data through: <strong>${escHtml(kpis.dataDate.slice(0, 10))}</strong>` : "Policy data verified from official sources"}
    &nbsp;·&nbsp; Manually researched — not real-time
    &nbsp;·&nbsp; ${kpis.total.toLocaleString()} of 3,143 US counties researched (${Math.round(kpis.total/3143*100)}%)
  </div>

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
        <span class="home-nav-desc">44 publicly traded AI companies — market data via TradingView (delayed 15 min)</span>
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

  <!-- Policy Change Alerts -->
  ${policyChanges.length ? `
  <section class="home-section home-alerts-section" id="home-policy-alerts">
    <div class="home-alerts-hdr">
      <div class="home-alerts-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Policy Updates Since Your Last Visit
        <span class="home-alerts-count">${policyChanges.length}</span>
      </div>
      <button class="home-alerts-dismiss" id="home-alerts-dismiss" type="button" aria-label="Mark changes as reviewed">Mark as reviewed</button>
    </div>
    <div class="home-alerts-list">
      ${policyChanges.map(ch => {
        const oldCls  = SEV_CLASSES[ch.oldLevel] || SEV_CLASSES[0];
        const oldLbl  = SEV_LABELS[ch.oldLevel]  ?? SEV_LABELS[0];
        const newCls  = SEV_CLASSES[ch.newLevel] || SEV_CLASSES[0];
        const newLbl  = SEV_LABELS[ch.newLevel]  ?? SEV_LABELS[0];
        const arrow   = ch.newLevel > ch.oldLevel ? "↑" : "↓";
        const dir     = ch.newLevel > ch.oldLevel ? "home-alert-up" : "home-alert-down";
        return `<div class="home-alert-row" role="button" tabindex="0" data-fips="${escHtml(ch.fips)}" aria-label="${escHtml(ch.name)}, ${escHtml(ch.state)}">
          <span class="home-alert-arrow ${dir}">${arrow}</span>
          <div class="home-alert-info">
            <span class="home-alert-name">${escHtml(ch.name)}</span>
            <span class="home-alert-state">${escHtml(ch.state)}</span>
          </div>
          <span class="sev-badge ${oldCls}" style="opacity:0.6">${escHtml(oldLbl)}</span>
          <span class="home-alert-to">→</span>
          <span class="sev-badge ${newCls}">${escHtml(newLbl)}</span>
        </div>`;
      }).join("")}
    </div>
  </section>` : ""}

  <!-- Economic Pulse — deliberately restrained: four indicators and a link.
       Populated by _renderHomeEconomicPulse() after render, which reads only
       the small FRED and state files. The multi-megabyte county file is never
       fetched for Home. -->
  <section class="home-section home-econ-section" id="home-econ-pulse">
    <div class="home-col-header">
      <h2 class="home-section-title">Economic Pulse</h2>
      <button class="home-col-link" onclick="switchTab('economy')" type="button">Explore Economic Intelligence ${HOME_ICONS.arrow}</button>
    </div>
    <div class="home-econ-strip" id="home-econ-strip"></div>
    <p class="home-econ-note" id="home-econ-note"></p>
  </section>

  <!-- State Quick Navigation -->
  <section class="home-section home-state-nav-section">
    <div class="home-col-header">
      <h2 class="home-section-title">Browse by State</h2>
      <button class="home-col-link" onclick="switchTab('map')" type="button">Open map ${HOME_ICONS.arrow}</button>
    </div>
    <div class="home-state-chips" role="group" aria-label="States">
      ${(typeof STATE_NAMES !== "undefined" ? Object.entries(STATE_NAMES) : []).sort((a,b)=>a[1].localeCompare(b[1])).map(([abbr, name]) => {
        // Count restricted counties in this state
        let restrictCount = 0;
        if (mapData) {
          const sfMap = typeof STATE_FIPS !== "undefined" ? STATE_FIPS : {};
          const fips2 = Object.keys(sfMap).find(k => sfMap[k] === abbr);
          if (fips2) {
            for (const fips in mapData) {
              if (fips.startsWith(fips2) && (mapData[fips].level || 0) >= 1) restrictCount++;
            }
          }
        }
        const hasPolicies = restrictCount > 0;
        return `<button class="home-state-chip${hasPolicies ? " home-state-chip-active" : ""}"
          data-abbr="${escHtml(abbr)}" type="button"
          title="${escHtml(name)}${hasPolicies ? ` — ${restrictCount} restricted county${restrictCount === 1 ? "" : "s"}` : ""}">
          ${escHtml(abbr)}
          ${hasPolicies ? `<span class="home-state-chip-dot" aria-hidden="true"></span>` : ""}
        </button>`;
      }).join("")}
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
            ${c.effective_date ? `<span class="home-reg-date">${escHtml(new Date(c.effective_date + "T00:00:00").toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric"}))}</span>` : ""}
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

  <!-- Recent Policy Activity timeline strip -->
  ${recentActivity.length ? `
  <section class="home-section">
    <div class="home-col-header">
      <h2 class="home-section-title">Recent Policy Activity</h2>
      <button class="home-col-link" onclick="switchTab('map')" type="button">View all ${HOME_ICONS.arrow}</button>
    </div>
    <div class="home-activity-strip">
      ${recentActivity.map(c => {
        const sevCls = SEV_CLASSES[c.level] || "";
        const sevLbl = SEV_LABELS[c.level] ?? "";
        const dateStr = c._date ? c._date.slice(0, 10) : "";
        const types = (c.types || []).map(t => `<span class="home-type-chip">${escHtml(TYPE_LABELS[t] || t)}</span>`).join("");
        return `<div class="home-activity-card" role="button" tabindex="0" data-fips="${escHtml(c.fips)}" aria-label="${escHtml(c.name)}, ${escHtml(c.state)}">
          <div class="home-activity-date">${escHtml(dateStr)}</div>
          <div class="home-activity-name">${escHtml(c.name)}</div>
          <div class="home-activity-state">${escHtml(c.state)}</div>
          <div class="home-activity-badge"><span class="sev-badge ${escHtml(sevCls)}">${escHtml(sevLbl)}</span></div>
          ${types ? `<div class="home-activity-types">${types}</div>` : ""}
        </div>`;
      }).join("")}
    </div>
  </section>` : ""}

  <!-- Recently Visited Counties (user's own browsing history) -->
  ${recentlyVisited.length ? `
  <section class="home-section" id="home-recently-visited">
    <div class="home-col-header">
      <h2 class="home-section-title">Recently Visited</h2>
      <button class="home-col-link home-rv-clear" type="button">Clear history</button>
    </div>
    <div class="home-reviewed-grid">
      ${recentlyVisited.map(c => {
        const lvl    = c.level ?? 0;
        const sevCls = SEV_CLASSES[lvl] || SEV_CLASSES[0];
        const sevLbl = SEV_LABELS[lvl]  ?? SEV_LABELS[0];
        return `<div class="home-reviewed-card" role="button" tabindex="0" data-fips="${escHtml(c.fips)}" aria-label="${escHtml(c.name)}, ${escHtml(c.state)}">
          <div class="home-reviewed-top">
            <span class="home-reviewed-name">${escHtml(c.name)}</span>
            <span class="sev-badge ${escHtml(sevCls)}">${escHtml(sevLbl)}</span>
          </div>
          <div class="home-reviewed-meta">
            <span class="home-reviewed-state">${escHtml(c.state)}</span>
          </div>
        </div>`;
      }).join("")}
    </div>
  </section>` : ""}

  <!-- Recently Reviewed Counties -->
  ${recentlyReviewed.length ? `
  <section class="home-section">
    <div class="home-col-header">
      <h2 class="home-section-title">Recently Reviewed</h2>
      <button class="home-col-link" onclick="switchTab('analytics')" type="button">Full analytics ${HOME_ICONS.arrow}</button>
    </div>
    <p class="home-sites-desc">Counties where policy records were most recently verified or updated by the research team.</p>
    <div class="home-reviewed-grid">
      ${recentlyReviewed.map(c => {
        const lvl    = c.level ?? 0;
        const sevCls = SEV_CLASSES[lvl] || SEV_CLASSES[0];
        const sevLbl = SEV_LABELS[lvl]  ?? SEV_LABELS[0];
        const reviewed = c.last_reviewed ? c.last_reviewed.slice(0, 10) : "";
        const daysAgo = reviewed ? Math.round((Date.now() - new Date(reviewed + "T00:00:00").getTime()) / 86400000) : null;
        const daysStr = daysAgo !== null ? (daysAgo === 0 ? "today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`) : "";
        return `<div class="home-reviewed-card" role="button" tabindex="0" data-fips="${escHtml(c.fips)}" aria-label="${escHtml(c.name)}, ${escHtml(c.state)}">
          <div class="home-reviewed-top">
            <span class="home-reviewed-name">${escHtml(c.name)}</span>
            <span class="sev-badge ${escHtml(sevCls)}">${escHtml(sevLbl)}</span>
          </div>
          <div class="home-reviewed-meta">
            <span class="home-reviewed-state">${escHtml(c.state)}</span>
            ${daysStr ? `<span class="home-reviewed-date">${escHtml(daysStr)}</span>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>
  </section>` : ""}

  <!-- Top Development Sites -->
  ${topSites.length ? `
  <section class="home-section">
    <div class="home-col-header">
      <h2 class="home-section-title">Top Development Sites</h2>
      <button class="home-col-link" onclick="switchTab('map'); setTimeout(()=>document.getElementById('gis-screener')?.click(),300)" type="button">Full screener ${HOME_ICONS.arrow}</button>
    </div>
    <p class="home-sites-desc">Best counties for data center development — B+ suitability grade (≥65 pts), no active restrictions, ranked by composite score. Click any row to open on the map.</p>
    <div class="home-sites-list">
      ${topSites.map((s, i) => {
        const GRADE_COLOR = { A: "#22c55e", B: "#22d3ee", C: "#eab308", D: "#f97316", F: "#ef4444" };
        const wsColor = s.ws !== null ? (s.ws <= 1 ? "#22c55e" : s.ws === 2 ? "#eab308" : "#ef4444") : "var(--text-muted)";
        const incLevel = s.level === -1 ? "Pro-Dev" : (s.hasInc ? "Incentives" : "");
        return `<div class="home-site-row" role="button" tabindex="0" data-fips="${escHtml(s.fips)}" aria-label="${escHtml(s.name)}, ${escHtml(s.state)}">
          <div class="home-site-rank">${i + 1}</div>
          <div class="home-site-info">
            <div class="home-site-name">${escHtml(s.name)}</div>
            <div class="home-site-state">${escHtml(s.state)}</div>
          </div>
          <div class="home-site-metrics">
            <span class="home-site-grade" style="color:${GRADE_COLOR[s.suit.grade] || "var(--accent)"};">${s.suit.grade}</span>
            <span class="home-site-score">${s.suit.score}pts</span>
            ${s.wsLabel !== null ? `<span class="home-site-ws" style="color:${wsColor}">${escHtml(s.wsLabel)}</span>` : ""}
            ${incLevel ? `<span class="home-site-inc">${escHtml(incLevel)}</span>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>
  </section>` : ""}

  <!-- Watched Counties -->
  ${watchlist.length ? `
  <section class="home-section" id="home-watchlist-section">
    <div class="home-col-header">
      <h2 class="home-section-title">Watched Counties</h2>
      <div class="home-watchlist-actions">
        ${watchlist.length >= 2 ? `
        <button class="home-watchlist-compare-btn" id="home-watchlist-compare" type="button" title="Open county compare panel with all watched counties">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
          Compare All
        </button>` : ""}
        <button class="home-watchlist-export-btn" id="home-watchlist-export" type="button" title="Export watched counties as CSV" aria-label="Export watchlist CSV">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
        <button class="home-watchlist-export-btn" id="home-watchlist-share" type="button" title="Export watchlist as a shareable file a colleague can import" aria-label="Share watchlist">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.7" x2="15.4" y2="6.3"/><line x1="8.6" y1="13.3" x2="15.4" y2="17.7"/></svg>
          Share
        </button>
        <button class="home-watchlist-export-btn" id="home-watchlist-import" type="button" title="Import a watchlist file shared by a colleague" aria-label="Import watchlist">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import
        </button>
        <span class="home-watchlist-count" id="home-watchlist-count">${watchlist.length} watched</span>
      </div>
    </div>
    <!-- Policy change alerts — populated by _renderWatchlistChanges() -->
    <div id="home-watchlist-changes"></div>
    ${portfolio ? `<div class="home-wl-portfolio">
      <div class="home-wl-port-stat">
        <span class="home-wl-port-label">Avg. Suitability</span>
        <div class="home-wl-port-val">
          <span class="home-wl-port-grade home-wl-grade-${escHtml(portfolio.avgGrade)}">${escHtml(portfolio.avgGrade)}</span>
          <span class="home-wl-port-score">${portfolio.avgScore}/100</span>
        </div>
      </div>
      <div class="home-wl-port-stat">
        <span class="home-wl-port-label">Grade Mix</span>
        <div class="home-wl-port-grades">
          ${["A","B","C","D","F"].filter(g => portfolio.grades[g]).map(g =>
            `<span class="home-wl-port-grade-pill grade-${g}">${g}<small>${portfolio.grades[g]}</small></span>`
          ).join("")}
        </div>
      </div>
      <div class="home-wl-port-stat">
        <span class="home-wl-port-label">Risk Exposure</span>
        <div class="home-wl-port-risk">
          ${portfolio.bans       ? `<span class="home-wl-port-risk-chip ban">${portfolio.bans} ban</span>` : ""}
          ${portfolio.restricted ? `<span class="home-wl-port-risk-chip restricted">${portfolio.restricted} restricted</span>` : ""}
          ${portfolio.open       ? `<span class="home-wl-port-risk-chip open">${portfolio.open} open</span>` : ""}
          ${portfolio.pro        ? `<span class="home-wl-port-risk-chip pro">${portfolio.pro} pro-dev</span>` : ""}
        </div>
      </div>
    </div>` : ""}
    <div class="home-watchlist" id="home-watchlist-list">
      ${watchlist.map(w => {
        const lvl = w.level;
        const sevCls = SEV_CLASSES[lvl] || SEV_CLASSES[0];
        const sevLbl = SEV_LABELS[lvl]  ?? SEV_LABELS[0];
        return `<div class="home-watch-row" role="button" tabindex="0" data-fips="${escHtml(w.fips)}" aria-label="${escHtml(w.name)}, ${escHtml(w.state)}">
          <div class="home-watch-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="home-watch-info">
            <span class="home-watch-name">${escHtml(w.name)}</span>
            <span class="home-watch-state">${escHtml(w.state)}</span>
          </div>
          <span class="sev-badge ${sevCls}">${escHtml(sevLbl)}</span>
          ${w.wsLabel !== null ? `<span class="home-watch-ws">${escHtml(w.wsLabel)}</span>` : ""}
          <button class="home-watch-remove" data-fips="${escHtml(w.fips)}" type="button" aria-label="Remove ${escHtml(w.name)} from watchlist" title="Remove from watchlist">×</button>
        </div>`;
      }).join("")}
    </div>
  </section>` : ""}

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

  <!-- Policy Digest (live computed) -->
  ${digest ? `
  <section class="home-section home-digest-section">
    <div class="home-col-header">
      <h2 class="home-section-title">Policy Digest</h2>
      <span class="home-digest-badge">Live</span>
    </div>
    <div class="home-digest-grid">

      ${digest.recent.length ? `
      <div class="home-digest-card">
        <div class="home-digest-card-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Recent Enactments <span class="home-digest-sub">(last 90 days)</span>
        </div>
        ${digest.recent.map(c => {
          const lvl = c.level ?? 0;
          const lvlCls = SEV_CLASSES[lvl] || SEV_CLASSES[0];
          const lvlLbl = SEV_LABELS[lvl] ?? SEV_LABELS[0];
          return `<div class="home-digest-row" role="button" tabindex="0" data-fips="${escHtml(c.fips)}">
            <span class="sev-badge ${escHtml(lvlCls)}">${escHtml(lvlLbl)}</span>
            <span class="home-digest-name">${escHtml(c.name)}, ${escHtml(c.state)}</span>
            <span class="home-digest-date">${escHtml(c.date.slice(0,10))}</span>
          </div>`;
        }).join("")}
      </div>` : ""}

      ${digest.openA.length ? `
      <div class="home-digest-card">
        <div class="home-digest-card-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          Top Open Sites <span class="home-digest-sub">(A-grade, unrestricted)</span>
        </div>
        ${digest.openA.map(c => {
          return `<div class="home-digest-row" role="button" tabindex="0" data-fips="${escHtml(c.fips)}">
            <span class="sev-badge badge-none">Open</span>
            <span class="home-digest-name">${escHtml(c.name)}, ${escHtml(c.state)}</span>
            <span class="home-digest-score">${c.score}pts</span>
          </div>`;
        }).join("")}
      </div>` : ""}

      <div class="home-digest-card home-digest-stat-card">
        <div class="home-digest-card-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Pending Decisions
        </div>
        <div class="home-digest-stat">${digest.proposedCount}</div>
        <div class="home-digest-stat-label">proposed restrictions awaiting enactment</div>
        ${digest.proposedCount > 0 ? `<button class="home-digest-link" onclick="switchTab('analytics')" type="button">View monitor ${HOME_ICONS.arrow}</button>` : ""}
      </div>

    </div>
  </section>` : ""}

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
      <span>Policy data manually researched — not real-time. Not legal advice.</span>
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
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise
        : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Bind activity card clicks */
  view.querySelectorAll(".home-activity-card[data-fips]").forEach(el => {
    const handler = () => {
      const fips = el.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise
        : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Bind top-sites row clicks */
  view.querySelectorAll(".home-site-row[data-fips]").forEach(el => {
    const handler = () => {
      const fips = el.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise
        : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Bind featured card clicks */
  view.querySelectorAll(".home-featured-card[data-fips]").forEach(el => {
    const handler = () => {
      const fips = el.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise
        : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Bind recently-reviewed card clicks */
  view.querySelectorAll(".home-reviewed-card[data-fips]").forEach(el => {
    const handler = () => {
      const fips = el.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise
        : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    el.addEventListener("click",   handler);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
  });

  /* Bind watchlist row clicks and remove buttons */
  view.querySelectorAll(".home-watch-row[data-fips]").forEach(rowEl => {
    const nav = () => {
      const fips = rowEl.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise
        : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    rowEl.addEventListener("click", e => {
      if (e.target.closest(".home-watch-remove")) return;
      nav();
    });
    rowEl.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".home-watch-remove")) {
        e.preventDefault(); nav();
      }
    });
  });

  view.querySelectorAll(".home-watch-remove[data-fips]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const fips = btn.dataset.fips;
      if (typeof toggleWatchCounty === "function") toggleWatchCounty(fips);
      const row = btn.closest(".home-watch-row");
      if (row) {
        row.style.transition = "opacity 0.15s";
        row.style.opacity = "0";
        setTimeout(() => {
          row.remove();
          const list = view.querySelector("#home-watchlist-list");
          const countEl = view.querySelector("#home-watchlist-count");
          if (list && !list.querySelector(".home-watch-row")) {
            view.querySelector("#home-watchlist-section")?.remove();
          } else if (countEl) {
            const remaining = list?.querySelectorAll(".home-watch-row").length || 0;
            countEl.textContent = `${remaining} watched`;
          }
        }, 160);
      }
    });
  });

  /* Bind watchlist CSV export */
  view.querySelector("#home-watchlist-export")?.addEventListener("click", () => {
    _exportWatchlistCSV();
  });

  /* Economic Pulse (four indicators only — see _renderHomeEconomicPulse) */
  _renderHomeEconomicPulse(view);

  /* Policy change alerts + portable watchlist bundles (Phase 4) */
  _renderWatchlistChanges(view);
  view.querySelector("#home-watchlist-share")?.addEventListener("click", _shareWatchlistBundle);
  view.querySelector("#home-watchlist-import")?.addEventListener("click", _importWatchlistBundle);

  /* Compare All watched counties → open compare panel */
  view.querySelector("#home-watchlist-compare")?.addEventListener("click", () => {
    let fipsArr;
    fipsArr = window.WATCHLIST ? window.WATCHLIST.fipsList() : [];
    if (!fipsArr.length) return;
    switchTab("map");
    (typeof mapInitPromise !== "undefined" && mapInitPromise
      ? mapInitPromise : Promise.resolve()
    ).then(() => {
      if (typeof clearCompare === "function") clearCompare();
      if (typeof toggleComparePanel === "function" && !compareMode) toggleComparePanel();
      for (const fips of fipsArr.slice(0, 4)) {
        if (typeof addToCompare === "function") addToCompare(fips);
      }
    });
  });

  /* Bind policy alert rows → map navigation */
  view.querySelectorAll(".home-alert-row[data-fips]").forEach(rowEl => {
    const nav = () => {
      const fips = rowEl.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    rowEl.addEventListener("click",   nav);
    rowEl.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav(); } });
  });

  /* Dismiss policy alerts → update baseline snapshot */
  view.querySelector("#home-alerts-dismiss")?.addEventListener("click", () => {
    _savePolicySnapshot();
    const sec = view.querySelector("#home-policy-alerts");
    if (sec) {
      sec.style.transition = "opacity 0.2s";
      sec.style.opacity = "0";
      setTimeout(() => sec.remove(), 220);
    }
  });

  /* Recently visited — card clicks → county, clear button */
  view.querySelectorAll("#home-recently-visited .home-reviewed-card[data-fips]").forEach(card => {
    const nav = () => {
      const fips = card.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    card.addEventListener("click",   nav);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav(); } });
  });
  view.querySelector(".home-rv-clear")?.addEventListener("click", () => {
    try { localStorage.removeItem("dc-recent-counties-v1"); } catch (_) {}
    const sec = view.querySelector("#home-recently-visited");
    if (sec) { sec.style.transition = "opacity 0.2s"; sec.style.opacity = "0"; setTimeout(() => sec.remove(), 220); }
  });

  /* Policy Digest rows → county navigation */
  view.querySelectorAll(".home-digest-row[data-fips]").forEach(row => {
    const nav = () => {
      const fips = row.dataset.fips;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    row.addEventListener("click",   nav);
    row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav(); } });
  });

  /* State chip clicks → map + state detail */
  view.querySelectorAll(".home-state-chip[data-abbr]").forEach(chip => {
    chip.addEventListener("click", () => _jumpToState(chip.dataset.abbr));
    chip.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); _jumpToState(chip.dataset.abbr); }
    });
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

  /* KPI count-up */
  initKpiCountUp(view);
}

function initKpiCountUp(container) {
  container.querySelectorAll(".home-kpi-num").forEach(el => {
    if (el.querySelector(".home-skel")) return;
    const raw = el.textContent.trim();
    const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || num <= 1) return;
    const dur = Math.min(900, 200 + Math.sqrt(num) * 20);
    const t0  = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(num * eased).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = raw;
    };
    requestAnimationFrame(tick);
  });
}
