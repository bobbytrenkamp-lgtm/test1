/* js/economy-view.js — renders the Economy tab (#economy-view).
 *
 * Four sections, per the product spec:
 *   1. National Economic Pulse       KPI strip from FRED
 *   2. National Trends               SVG time-series charts, category tabs + ranges
 *   3. Regional Economic Explorer    Leaflet county/state choropleth + profile panel
 *   4. Infrastructure-Relevant Signals  deterministic rule output
 *
 * Split from js/economy.js the same way zoning-map.js/zoning-details.js are
 * split from zoning.js: economy.js owns data, formatting and math; this file
 * owns DOM. Follows the repo convention of classic scripts sharing one global
 * scope, so escHtml/switchTab/Router resolve by bare name.
 *
 * RENDER LIFECYCLE
 * renderEconomyPage() is called by switchTab("economy") on every entry. It is
 * idempotent: the shell is built once (dataset.built), charts are created once
 * and kept in _charts so returning to the tab does NOT rebuild them, and any
 * listeners a render pass added are torn down by _teardown() before the next.
 */
(function () {
  'use strict';

  const E = () => window.ECONOMY;

  /* Live UI state. Persisted to localStorage so a return visit keeps context. */
  const PREF_KEY = "dc-economy-prefs-v1";
  const state = {
    category: "rates",
    range: "5Y",
    geo: "county",
    metric: "population",
    measure: "value",
    selectedFips: null,
    search: "",
  };

  const _charts = {};          // category -> chart handle (built once)
  let _cleanups = [];          // listener teardowns for the current render
  let _explorerMap = null;     // Leaflet map for section 3
  let _explorerLayer = null;
  let _explorerByFips = {};
  let _loadToken = 0;          // guards against a stale fetch applying after nav

  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        category: state.category, range: state.range,
        geo: state.geo, metric: state.metric, measure: state.measure,
      }));
    } catch (_) {}
  }
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      for (const k of ["category", "range", "geo", "metric", "measure"]) {
        if (p[k]) state[k] = p[k];
      }
    } catch (_) {}
  }

  function on(el, ev, fn, opts) {
    if (!el) return;
    el.addEventListener(ev, fn, opts);
    _cleanups.push(() => el.removeEventListener(ev, fn, opts));
  }
  function _teardown() {
    _cleanups.forEach(fn => { try { fn(); } catch (_) {} });
    _cleanups = [];
  }

  /* ── Range windows for the trend charts ── */
  const RANGES = {
    "1Y":  365, "3Y": 365 * 3, "5Y": 365 * 5, "10Y": 365 * 10, "Max": null,
  };

  /* ── Shell ─────────────────────────────────────────────────────────────── */

  function shell() {
    return `
<div class="econ-wrap">
  <header class="econ-hero">
    <div class="econ-hero-main">
      <h1 class="econ-title">Economic Intelligence</h1>
      <p class="econ-sub">Federal Reserve, Census, labor, population, housing, and regional growth
        indicators for data center and AI infrastructure planning.</p>
    </div>
    <div class="econ-hero-meta" id="econ-hero-meta"></div>
  </header>

  <section class="econ-section" id="econ-pulse-section" aria-labelledby="econ-pulse-h">
    <div class="econ-section-head">
      <h2 class="econ-section-title" id="econ-pulse-h">National Economic Pulse</h2>
      <span class="econ-section-note" id="econ-pulse-note"></span>
    </div>
    <div class="econ-kpi-strip" id="econ-kpi-strip"></div>
    <p class="econ-source" id="econ-pulse-source"></p>
  </section>

  <section class="econ-section" id="econ-trends-section" aria-labelledby="econ-trends-h">
    <div class="econ-section-head">
      <h2 class="econ-section-title" id="econ-trends-h">National Trends</h2>
      <div class="econ-range-group" role="group" aria-label="Chart time range">
        ${Object.keys(RANGES).map(r =>
          `<button type="button" class="econ-range-btn" data-range="${r}" aria-pressed="false">${r}</button>`).join("")}
      </div>
    </div>
    <div class="econ-cat-tabs" role="tablist" aria-label="Trend categories" id="econ-cat-tabs"></div>
    <p class="econ-cat-desc" id="econ-cat-desc"></p>
    <div class="econ-chart-host" id="econ-chart-host"></div>
    <div class="econ-legend-row" id="econ-chart-legend"></div>
    <p class="econ-source" id="econ-trends-source"></p>
  </section>

  <section class="econ-section" id="econ-explorer-section" aria-labelledby="econ-explorer-h">
    <div class="econ-section-head">
      <h2 class="econ-section-title" id="econ-explorer-h">Regional Economic Explorer</h2>
      <span class="econ-section-note" id="econ-explorer-note"></span>
    </div>

    <div class="econ-controls">
      <div class="econ-control">
        <label class="econ-label" for="econ-metric-select">Metric</label>
        <select id="econ-metric-select" class="econ-select"></select>
      </div>
      <div class="econ-control">
        <label class="econ-label" for="econ-measure-select">Measure</label>
        <select id="econ-measure-select" class="econ-select"></select>
      </div>
      <div class="econ-control">
        <label class="econ-label" for="econ-geo-select">Geography</label>
        <select id="econ-geo-select" class="econ-select">
          <option value="county">Counties</option>
          <option value="state">States</option>
        </select>
      </div>
      <div class="econ-control econ-control-grow">
        <label class="econ-label" for="econ-search">Search</label>
        <input id="econ-search" class="econ-input" type="search" autocomplete="off"
               placeholder="County or state name" aria-describedby="econ-search-hint" />
        <span id="econ-search-hint" class="econ-hint">Type at least two characters</span>
        <div class="econ-search-results" id="econ-search-results" role="listbox" hidden></div>
      </div>
      <div class="econ-control econ-control-actions">
        <button type="button" class="econ-btn" id="econ-reset-view">Reset view</button>
        <button type="button" class="econ-btn econ-btn-ghost" id="econ-clear-layer">Clear layer</button>
      </div>
    </div>

    <div class="econ-explorer-body">
      <div class="econ-map-col">
        <div id="econ-explorer-map" class="econ-map" role="application"
             aria-label="Economic choropleth map"></div>
        <div class="econ-map-legend" id="econ-map-legend"></div>
        <p class="econ-source" id="econ-explorer-source"></p>
      </div>
      <aside class="econ-profile" id="econ-profile" aria-live="polite">
        <div class="econ-profile-empty">
          <p>Select a county or state on the map to see its economic profile,
             with United States and state comparisons.</p>
        </div>
      </aside>
    </div>
  </section>

  <section class="econ-section" id="econ-signals-section" aria-labelledby="econ-signals-h">
    <div class="econ-section-head">
      <h2 class="econ-section-title" id="econ-signals-h">Infrastructure-Relevant Signals</h2>
    </div>
    <p class="econ-signals-intro">
      Conditions relevant to data center and AI infrastructure planning, derived
      from the metrics shown on this page. Each statement is produced by a fixed
      rule and cites the figure it is based on.
    </p>
    <div class="econ-signal-grid" id="econ-signal-grid"></div>
    <p class="econ-disclaimer" id="econ-signals-disclaimer">
      These are descriptions of measured economic conditions, not investment
      advice, a site recommendation, or evidence that a facility should or should
      not be built in any location. Economic conditions are one input among
      regulatory, land, power, water, and community factors.
    </p>
  </section>

  <details class="econ-method">
    <summary>Methodology and sources</summary>
    <div class="econ-method-body" id="econ-method-body"></div>
  </details>
</div>`;
  }

  /* Awaiting-data notice. Distinct from "no economic activity" — the copy has to
     say the pipeline has not run, because those are different facts. */
  function awaitingBlock(what) {
    return `<div class="econ-awaiting" role="status">
      <strong>${E().escapeText(what)} not yet available.</strong>
      <p>The economic data pipeline has not completed a run in this deployment yet, so no
         ${E().escapeText(what.toLowerCase())} have been generated. That is different from a
         value of zero and different from an absence of economic activity — nothing has been
         measured yet.</p>
      <p class="econ-awaiting-how">A maintainer can populate it by running the
         <code>Update Economic Data</code> GitHub Actions workflow, which requires the
         <code>FRED_API_KEY</code> and <code>CENSUS_API_KEY</code> repository secrets.</p>
    </div>`;
  }

  /* ── 1. KPI strip ──────────────────────────────────────────────────────── */

  function renderKpis(cfg, fred) {
    const host = document.getElementById("econ-kpi-strip");
    const note = document.getElementById("econ-pulse-note");
    const src  = document.getElementById("econ-pulse-source");
    if (!host) return;

    if (!E().hasFred(fred)) {
      host.innerHTML = awaitingBlock("National indicators");
      if (note) note.textContent = "";
      if (src) src.textContent = "";
      return;
    }

    const kpis = (cfg.series || [])
      .filter(s => s.kpi)
      .sort((a, b) => (a.kpi_order || 99) - (b.kpi_order || 99));

    host.innerHTML = kpis.map(spec => {
      const s = fred.series[spec.id];
      if (!s) {
        return `<div class="econ-kpi econ-kpi-missing">
          <div class="econ-kpi-label">${E().escapeText(spec.short_label)}</div>
          <div class="econ-kpi-value">—</div>
          <div class="econ-kpi-sub">Series unavailable this run</div></div>`;
      }
      /* Some KPIs are most meaningful as a rate of change rather than a level:
         an index value of 320.4 for CPI tells a reader nothing, "3.1% YoY" does. */
      const asYoy = spec.kpi_display === "yoy";
      const value = asYoy ? s.change_yoy_pct : s.latest_value;
      const unit  = asYoy ? "percent" : spec.unit_type;
      const dec   = asYoy ? 1 : spec.decimals;
      const change = asYoy ? null
        : (spec.change_basis === "yoy" ? s.change_yoy_pct : s.change_abs);
      const changeUnit = (spec.change_basis === "yoy") ? "pct" : spec.unit_type;
      const dir = E().direction(asYoy ? s.change_yoy_pct : change, spec.invert_direction);

      const changeText = asYoy
        ? "year over year"
        : (change === null || change === undefined ? "no change figure"
            : `${dir.glyph} ${E().escapeText(
                changeUnit === "pct" ? E().fmtPct(change) : E().fmtChange(change, spec.unit_type))} ` +
              `${spec.change_basis === "yoy" ? "YoY" : "vs prior"}`);

      return `<div class="econ-kpi" tabindex="0"
                   aria-label="${E().escapeText(spec.label)}: ${E().escapeText(E().fmtValue(value, unit, dec))}, ${E().escapeText(dir.word)}. Latest available ${E().escapeText(E().fmtDate(s.latest_date))}. ${E().escapeText(spec.tooltip)}">
        <div class="econ-kpi-label">${E().escapeText(spec.short_label)}
          <span class="econ-kpi-info" aria-hidden="true" title="${E().escapeText(spec.tooltip)}">i</span>
        </div>
        <div class="econ-kpi-value">${E().escapeText(E().fmtValue(value, unit, dec))}</div>
        <div class="econ-kpi-change ${dir.cls}">${changeText}</div>
        <div class="econ-kpi-sub">
          <span class="econ-kpi-date">Latest available ${E().escapeText(E().fmtDate(s.latest_date))}</span>
          ${s.stale ? `<span class="econ-stale-chip" title="No new observation for ${s.stale_days} days">stale</span>` : ""}
        </div>
        <div class="econ-kpi-src">${E().escapeText(s.source_agency || "FRED")}</div>
        <div class="econ-kpi-tip" role="tooltip">${E().escapeText(spec.tooltip)}</div>
      </div>`;
    }).join("");

    const updated = fred.generated_at;
    if (note) note.textContent = `${kpis.length} indicators · latest available values`;
    if (src) {
      src.innerHTML = `Source: Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis. ` +
        `FRED hosts series produced by several agencies; each card shows its originating release. ` +
        `Pipeline last updated ${E().escapeText(E().fmtDateTime(updated))}.`;
    }
  }

  /* ── 2. Trend charts ───────────────────────────────────────────────────── */

  function renderCategoryTabs(cfg) {
    const host = document.getElementById("econ-cat-tabs");
    if (!host) return;
    host.innerHTML = (cfg.categories || []).map(c =>
      `<button type="button" class="econ-cat-tab" role="tab"
               data-cat="${E().escapeText(c.id)}"
               aria-selected="${c.id === state.category}"
               tabindex="${c.id === state.category ? 0 : -1}">${E().escapeText(c.label)}</button>`
    ).join("");
  }

  function seriesForCategory(cfg, fred, category) {
    const specs = (cfg.series || []).filter(s => s.category === category);
    const cutoffDays = RANGES[state.range];
    const cutoff = cutoffDays ? Date.now() - cutoffDays * 86400000 : null;

    return specs.map((spec, i) => {
      const s = fred.series[spec.id];
      if (!s) return null;
      const points = (s.observations || []).map(([d, v]) => ({
        t: Date.parse(d + "T00:00:00Z"), v,
      })).filter(p => isFinite(p.t) && (cutoff === null || p.t >= cutoff));
      return {
        id: spec.id,
        label: spec.short_label || spec.label,
        fullLabel: spec.label,
        unitType: spec.unit_type,
        decimals: spec.decimals,
        color: null,
        defaultOn: !!spec.chart_default,
        zeroReference: !!spec.zero_reference,
        points,
      };
    }).filter(Boolean);
  }

  function renderTrends(cfg, fred) {
    const host = document.getElementById("econ-chart-host");
    const legend = document.getElementById("econ-chart-legend");
    const desc = document.getElementById("econ-cat-desc");
    const src = document.getElementById("econ-trends-source");
    if (!host) return;

    const cat = (cfg.categories || []).find(c => c.id === state.category);
    if (desc) desc.textContent = cat ? cat.description : "";

    if (!E().hasFred(fred)) {
      host.innerHTML = awaitingBlock("Trend data");
      if (legend) legend.innerHTML = "";
      if (src) src.textContent = "";
      return;
    }

    const all = seriesForCategory(cfg, fred, state.category);
    if (!all.length) {
      host.innerHTML = `<div class="econ-empty">No series configured for this category.</div>`;
      if (legend) legend.innerHTML = "";
      return;
    }

    /* Rebuild only when the category or range changed; otherwise reuse. Charts
       are expensive relative to everything else on this page and returning to
       the tab must not re-create them. */
    const key = `${state.category}|${state.range}`;
    if (_charts._key !== key) {
      if (_charts.handle) _charts.handle.destroy();
      const zeroRef = all.some(s => s.zeroReference);
      _charts.handle = E().timeSeriesChart(host, all, { height: 280, zeroReference: zeroRef });
      _charts._key = key;
      _charts._series = all;
      // Apply the config's default visibility.
      all.forEach(s => { if (!s.defaultOn) _charts.handle.toggle(s.id); });
    }

    if (legend) {
      const COLORS = ["#5b8def", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];
      legend.innerHTML = all.map((s, i) => {
        const off = _charts.handle.isHidden(s.id);
        return `<button type="button" class="econ-legend-item${off ? " econ-legend-off" : ""}"
                        data-series="${E().escapeText(s.id)}"
                        aria-pressed="${!off}"
                        title="${E().escapeText(s.fullLabel)}">
          <span class="econ-legend-swatch" style="background:${COLORS[i % COLORS.length]}"></span>
          <span class="econ-legend-text">${E().escapeText(s.label)}</span>
        </button>`;
      }).join("");
    }

    if (src) {
      const agencies = [...new Set(all.map(s => (fred.series[s.id] || {}).source_agency).filter(Boolean))];
      src.innerHTML = `Source: Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis` +
        (agencies.length ? ` — originating releases: ${E().escapeText(agencies.join("; "))}` : "") +
        `. Gaps in a line are observations the source did not publish; they are not interpolated.`;
    }
  }

  /* ── 3. Regional explorer ──────────────────────────────────────────────── */

  function renderExplorerControls() {
    const ms = document.getElementById("econ-metric-select");
    const xs = document.getElementById("econ-measure-select");
    const gs = document.getElementById("econ-geo-select");
    if (ms) {
      ms.innerHTML = E().EXPLORER_METRICS.map(m =>
        `<option value="${m}"${m === state.metric ? " selected" : ""}>${E().escapeText(E().METRICS[m].label)}</option>`
      ).join("");
    }
    if (xs) {
      xs.innerHTML = Object.keys(E().MEASURES).map(k => {
        const ok = E().supportsMeasure(state.metric, k);
        return `<option value="${k}"${k === state.measure ? " selected" : ""}${ok ? "" : " disabled"}>` +
               `${E().escapeText(E().MEASURES[k].label)}${ok ? "" : " (no history)"}</option>`;
      }).join("");
    }
    if (gs) gs.value = state.geo;
  }

  function activeDataset(data) {
    return state.geo === "county"
      ? { records: (data.county && data.county.counties) || {}, vintage: (data.county || {}).acs_vintage,
          populated: E().hasCounty(data.county), payload: data.county }
      : { records: (data.state && data.state.states) || {}, vintage: (data.state || {}).acs_vintage,
          populated: E().hasState(data.state), payload: data.state };
  }

  function renderExplorer(data) {
    const note = document.getElementById("econ-explorer-note");
    const src = document.getElementById("econ-explorer-source");
    const mapEl = document.getElementById("econ-explorer-map");
    const legendEl = document.getElementById("econ-map-legend");
    if (!mapEl) return;

    const ds = activeDataset(data);

    if (!ds.populated) {
      mapEl.innerHTML = awaitingBlock("Regional economic data");
      mapEl.classList.add("econ-map-awaiting");
      if (legendEl) legendEl.innerHTML = "";
      if (note) note.textContent = "";
      if (src) src.textContent = "";
      return;
    }
    mapEl.classList.remove("econ-map-awaiting");

    if (note) {
      note.textContent = `${Object.keys(ds.records).length.toLocaleString()} ` +
        `${state.geo === "county" ? "counties" : "states"} · ACS ${ds.vintage} 5-year estimates`;
    }
    if (src) {
      const meta = E().METRICS[state.metric] || {};
      src.innerHTML = `Source: U.S. Census Bureau, American Community Survey ` +
        `${E().escapeText(String(ds.vintage))} 5-Year Estimates. ` +
        (meta.unit === "usd" ? `Dollar values are ACS ${E().escapeText(String(ds.vintage))} inflation-adjusted dollars and are not comparable across vintages. ` : "") +
        (state.metric === "unemployment_rate" ? `This ACS survey estimate is separate from the more frequently updated national unemployment rate shown above, which comes from FRED. ` : "") +
        `Classification: quantile breaks over counties with data; missing values are excluded from the breaks rather than treated as zero.`;
    }

    buildExplorerMap(ds);
    renderExplorerLegend(ds);
  }

  function buildExplorerMap(ds) {
    const el = document.getElementById("econ-explorer-map");
    if (!el || typeof L === "undefined") return;

    const values = Object.keys(ds.records)
      .map(f => E().metricValue(ds.records[f], state.metric, state.measure));
    const cls = E().makeClassifier(values, state.measure);
    _explorerByFips = {};

    /* Reuse the topology the main map already vendors — no second download. */
    /* Normalise a topology feature id to the key its dataset is stored under.
       County ids are 4-5 digits and pad to 5. STATE ids are already 2 digits, so
       padding them to 5 first and then slicing produced "00" for every state and
       indexed nothing at all. Handle the two id shapes separately. */
    function featureKey(feature) {
      const raw = String(feature.id);
      return state.geo === "county" ? raw.padStart(5, "0") : raw.padStart(2, "0").slice(0, 2);
    }

    function style(feature) {
      const key = featureKey(feature);
      const rec = ds.records[key];
      const v = E().metricValue(rec, state.metric, state.measure);
      return {
        fillColor: cls.color(v),
        fillOpacity: v === null || v === undefined ? 0.25 : 0.82,
        color: E().isLight() ? "#9aa3b2" : "#39405a",
        weight: 0.3,
      };
    }

    function eachFeature(feature, layer) {
      const key = featureKey(feature);
      const rec = ds.records[key];
      if (rec) _explorerByFips[key] = layer;
      const meta = E().METRICS[state.metric];
      const v = E().metricValue(rec, state.metric, state.measure);
      const valText = v === null || v === undefined
        ? "No data"
        : (state.measure === "value" ? E().fmtValue(v, meta.unit, meta.dec) : E().fmtPct(v));
      /* Text nodes, not HTML — names come from a data file. */
      const tip = document.createElement("div");
      tip.className = "econ-map-tip";
      const nm = document.createElement("strong");
      nm.textContent = rec ? `${rec.name}${rec.state && state.geo === "county" ? ", " + rec.state : ""}` : `FIPS ${key}`;
      const vv = document.createElement("div");
      vv.textContent = `${meta.label}: ${valText}`;
      tip.appendChild(nm); tip.appendChild(vv);
      layer.bindTooltip(tip, { sticky: true, className: "econ-leaflet-tip" });
      layer.on("click", () => selectRegion(key));
    }

    if (_explorerMap && _explorerLayer) {
      _explorerLayer.setStyle(style);
      // Rebind tooltips so the value shown matches the newly selected metric.
      _explorerLayer.eachLayer(l => {
        l.unbindTooltip();
        eachFeature(l.feature, l);
      });
      return;
    }

    if (_explorerMap) { _explorerMap.remove(); _explorerMap = null; }
    el.innerHTML = "";
    _explorerMap = L.map(el, {
      center: [39.5, -98.35], zoom: 4, minZoom: 3, maxZoom: 9,
      /* SVG, not canvas. AI_CONTEXT.md records this decision for the main county
         map — "preferCanvas: false to keep SVG rendering (better for
         interaction)" — and it matters here for the same reason: with the canvas
         renderer the polygons drew but hover and click hit-testing did not
         register at all. The main map already proves ~3,200 SVG county paths
         perform acceptably. */
      preferCanvas: false,
      zoomControl: true, attributionControl: true,
      scrollWheelZoom: false,   // page scroll must not be hijacked mid-page
    });
    /* {s} subdomain rotation matches the rest of the app (js/map.js) and spreads
       tile requests across CARTO's hosts. CARTO's no-key basemaps are free for
       light use with attribution — see the Cost & Licensing section in
       DATA_SOURCES.md before raising traffic. */
    L.tileLayer(
      E().isLight()
        ? "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap, &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 9,
      }
    ).addTo(_explorerMap);

    const render = (geo) => {
      _explorerLayer = L.geoJSON(geo, { style, onEachFeature: eachFeature }).addTo(_explorerMap);
      /* Leaflet caches container size at construction. This map is built while
         the tab may still be mid-transition, so an un-invalidated map leaves the
         canvas renderer sized 0x0: the layer exists, nothing paints, and nothing
         is hit-testable for hover. Invalidate as soon as the layer is attached. */
      requestAnimationFrame(() => { if (_explorerMap) _explorerMap.invalidateSize(); });
    };

    /* The raw topology is cached on window so switching geography or revisiting
       the tab does not re-download 823 KB. */
    if (window._US_TOPO_RAW) {
      const t = window._US_TOPO_RAW;
      const obj = state.geo === "county" ? t.objects.counties : t.objects.states;
      render(topojson.feature(t, obj));
    } else {
      fetch("vendor/counties-10m.json", { cache: "force-cache" })
        .then(r => r.json())
        .then(t => {
          window._US_TOPO_RAW = t;
          const obj = state.geo === "county" ? t.objects.counties : t.objects.states;
          render(topojson.feature(t, obj));
        })
        .catch(err => {
          el.innerHTML = `<div class="econ-empty">County boundaries could not be loaded (${E().escapeText(err.message)}).</div>`;
        });
    }
  }

  function renderExplorerLegend(ds) {
    const host = document.getElementById("econ-map-legend");
    if (!host) return;
    const values = Object.keys(ds.records)
      .map(f => E().metricValue(ds.records[f], state.metric, state.measure));
    const cls = E().makeClassifier(values, state.measure);
    const rows = E().legendRows(cls, state.metric, state.measure);
    const meta = E().METRICS[state.metric];
    host.innerHTML =
      `<div class="econ-legend-title">${E().escapeText(meta.label)}` +
      `${state.measure !== "value" ? ` — ${E().escapeText(E().MEASURES[state.measure].label)}` : ""}</div>` +
      `<div class="econ-legend-scale">` +
      rows.map(r => `<span class="econ-legend-key">
        <span class="econ-legend-chip" style="background:${r.color}"></span>
        <span class="econ-legend-lbl">${E().escapeText(r.label)}</span></span>`).join("") +
      `</div>` +
      `<div class="econ-legend-foot">${cls.count.toLocaleString()} of ` +
      `${Object.keys(ds.records).length.toLocaleString()} ` +
      `${state.geo === "county" ? "counties" : "states"} have a value for this metric</div>`;
  }

  function selectRegion(key) {
    state.selectedFips = key;
    renderProfile();
    // County signals are scoped to the selection, so section 4 changes with it.
    if (_lastData) renderSignals(_lastData);
  }

  /* Profile panel for the selected region. */
  function renderProfile() {
    const host = document.getElementById("econ-profile");
    if (!host) return;
    const cData = _lastData && _lastData.county;
    const sData = _lastData && _lastData.state;
    const key = state.selectedFips;
    if (!key) return;

    const isCounty = key.length === 5;
    const rec = isCounty
      ? ((cData && cData.counties) || {})[key]
      : ((sData && sData.states) || {})[key];
    if (!rec) {
      host.innerHTML = `<div class="econ-profile-empty"><p>No economic record for this area.</p></div>`;
      return;
    }

    const vintage = (isCounty ? cData : sData || {}).acs_vintage;

    const rows = E().EXPLORER_METRICS.map(m => {
      const meta = E().METRICS[m];
      const cmp = isCounty
        ? E().comparisons(cData, sData, key, m, "value")
        : { value: E().metricValue(rec, m, "value"), us_median: null, state_median: null, percentile: null };
      const v = cmp.value;
      const has = v !== null && v !== undefined;
      const ch5 = E().metricValue(rec, m, "change_5y");

      return `<tr>
        <th scope="row">${E().escapeText(meta.label)}</th>
        <td class="econ-num">${has ? E().escapeText(E().fmtValue(v, meta.unit, meta.dec)) : `<span class="econ-nodata">No data</span>`}</td>
        <td class="econ-num">${ch5 === null || ch5 === undefined ? "—" : E().escapeText(E().fmtPct(ch5))}</td>
        <td class="econ-num">${cmp.us_median === null ? "—" : E().escapeText(E().fmtValue(cmp.us_median, meta.unit, meta.dec))}</td>
        <td class="econ-num">${cmp.state_median === null ? "—" : E().escapeText(E().fmtValue(cmp.state_median, meta.unit, meta.dec))}</td>
        <td class="econ-num">${cmp.percentile === null ? `<span class="econ-nodata" title="Not enough counties with data for a meaningful percentile">—</span>` : E().escapeText(cmp.percentile + "th")}</td>
      </tr>`;
    }).join("");

    const hist = rec.history || {};
    const sparks = [
      ["population", "Population"],
      ["median_household_income", "Median household income"],
      ["unemployment_rate", "Unemployment rate"],
    ].map(([k, label]) => `
      <div class="econ-spark-row">
        <span class="econ-spark-label">${E().escapeText(label)}</span>
        ${E().sparklineSvg(hist[k], { label, color: null })}
      </div>`).join("");

    const signals = isCounty ? E().countySignals(cData, key) : [];

    // Supplementary and a DIFFERENT measurement from anything in the table
    // above — never merged into that table's rows, so a reader never mistakes
    // a permits count, a wage figure, or a state electricity price for an ACS
    // metric. building_permits and avg_weekly_wage are county-only (that's
    // the geography BPS/QCEW report at). electricity_price is EIA's own
    // state-level figure: shown directly on a state profile, and looked up
    // via the county's own state_fips on a county profile (a county profile
    // does not carry the field itself).
    const bp = isCounty ? rec.building_permits : null;
    const wg = isCounty ? rec.avg_weekly_wage : null;
    const ep = isCounty
      ? (((sData && sData.states) || {})[rec.state_fips] || {}).electricity_price
      : rec.electricity_price;
    const supplementary = (bp || wg || ep) ? `
      <div class="econ-profile-supplementary">
        ${bp ? (() => {
          const hasYoy = bp.change_yoy_pct !== null && bp.change_yoy_pct !== undefined;
          // Rising or falling local permit activity is not unambiguously
          // "good" or "bad" for a site-selector (see the mixed framing in
          // SIGNAL_RULES), so this shows plain direction, not a value
          // judgment — no invert flag, no colour tied to "favorable".
          const dir = hasYoy ? E().direction(bp.change_yoy_pct, null) : null;
          return `<div class="econ-profile-supp-row">
            <span class="econ-profile-supp-label">Building permits issued</span>
            <span class="econ-profile-supp-value">${E().escapeText(E().fmtValue(bp.value, "count", 0))}${
              hasYoy ? ` <span class="econ-flat">${dir.glyph} ${E().escapeText(E().fmtPct(bp.change_yoy_pct))} YoY</span>` : ""
            }</span>
            <span class="econ-profile-supp-note">Census Building Permits Survey (via FRED), as of ${E().escapeText(E().fmtDate(bp.as_of))}</span>
          </div>`;
        })() : ""}
        ${wg ? `<div class="econ-profile-supp-row">
          <span class="econ-profile-supp-label">Average weekly wage</span>
          <span class="econ-profile-supp-value">${E().escapeText(E().fmtValue(wg.value, "usd", 0))}</span>
          <span class="econ-profile-supp-note">BLS QCEW, all industries and ownership, ${E().escapeText(String(wg.year))} — a direct labor-cost figure, distinct from ACS household income above</span>
        </div>` : ""}
        ${ep ? `<div class="econ-profile-supp-row">
          <span class="econ-profile-supp-label">${isCounty ? "State industrial electricity price" : "Industrial electricity price"}</span>
          <span class="econ-profile-supp-value">${E().escapeText(E().fmtValue(ep.value, "usd_precise", 2))}/kWh</span>
          <span class="econ-profile-supp-note">EIA, ${E().escapeText(ep.as_of)}${isCounty ? " — state average, not this specific county" : ""}</span>
        </div>` : ""}
      </div>` : "";

    host.innerHTML = `
      <div class="econ-profile-head">
        <h3 class="econ-profile-name">${E().escapeText(rec.name)}</h3>
        <div class="econ-profile-state">${E().escapeText(isCounty ? (rec.state || "") : "State")}</div>
        <div class="econ-profile-fips">FIPS ${E().escapeText(key)}</div>
      </div>

      <table class="econ-profile-table">
        <caption class="econ-sr-only">Economic metrics with United States and state comparisons</caption>
        <thead><tr>
          <th scope="col">Metric</th><th scope="col">Value</th><th scope="col">5-yr</th>
          <th scope="col">US median</th><th scope="col">State median</th><th scope="col">Pctl</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>

      ${supplementary}

      <details class="econ-profile-more" open>
        <summary>Trends</summary>
        <div class="econ-sparks">${sparks}</div>
      </details>

      ${signals.length ? `<details class="econ-profile-more">
        <summary>Infrastructure-relevant signals (${signals.length})</summary>
        <ul class="econ-profile-signals">
          ${signals.map(s => `<li class="econ-sig-${E().escapeText(s.strength)}">
            <strong>${E().escapeText(s.title)}:</strong> ${E().escapeText(s.text)}</li>`).join("")}
        </ul>
      </details>` : ""}

      <div class="econ-profile-actions">
        ${isCounty ? `<a class="econ-btn econ-btn-primary" href="#jurisdiction?fips=${E().escapeText(key)}">Full intelligence report</a>` : ""}
        ${isCounty ? `<button type="button" class="econ-btn" id="econ-profile-watch" data-fips="${E().escapeText(key)}">Add to watchlist</button>` : ""}
        ${isCounty ? `<button type="button" class="econ-btn" id="econ-profile-compare" data-fips="${E().escapeText(key)}">Add to compare</button>` : ""}
        ${isCounty ? `<button type="button" class="econ-btn econ-btn-ghost" id="econ-profile-map" data-fips="${E().escapeText(key)}">Open on map</button>` : ""}
      </div>

      <p class="econ-profile-source">
        U.S. Census Bureau, American Community Survey ${E().escapeText(String(vintage))} 5-Year Estimates.
        Percentile is computed only where at least 20 comparable areas have a value.
        Unemployment here is an ACS survey estimate, not the monthly national rate.
      </p>`;

    wireProfileActions(key);
  }

  function wireProfileActions(fips) {
    const w = document.getElementById("econ-profile-watch");
    on(w, "click", () => {
      if (!window.WATCHLIST) return;
      window.WATCHLIST.toggle(fips);
      w.textContent = window.WATCHLIST.has(fips) ? "In watchlist ✓" : "Add to watchlist";
    });
    if (w && window.WATCHLIST && window.WATCHLIST.has(fips)) w.textContent = "In watchlist ✓";

    on(document.getElementById("econ-profile-compare"), "click", () => {
      // Reuse the existing comparison workflow rather than inventing a parallel one.
      if (typeof addCountyToCompare === "function") addCountyToCompare(fips);
      else if (window.COMPARE && window.COMPARE.addCounty) window.COMPARE.addCounty(fips);
    });

    on(document.getElementById("econ-profile-map"), "click", () => {
      if (window.Router) window.Router.navigate("map", { fips });
      else if (typeof switchTab === "function") switchTab("map");
      if (typeof selectCounty === "function") setTimeout(() => selectCounty(fips), 350);
    });
  }

  /* ── 4. Signals ────────────────────────────────────────────────────────── */

  function renderSignals(data) {
    const host = document.getElementById("econ-signal-grid");
    if (!host) return;

    const nat = E().nationalSignals(data.fred);
    const county = state.selectedFips && state.selectedFips.length === 5
      ? E().countySignals(data.county, state.selectedFips) : [];

    if (!nat.length && !county.length) {
      host.innerHTML = E().hasFred(data.fred) || E().hasCounty(data.county)
        ? `<div class="econ-empty">No signals met their thresholds with the data currently available.</div>`
        : awaitingBlock("Signal data");
      return;
    }

    const card = (s, scope) => `<div class="econ-signal econ-sig-${E().escapeText(s.strength)}">
      <div class="econ-signal-head">
        <span class="econ-signal-scope">${E().escapeText(scope)}</span>
        <span class="econ-signal-title">${E().escapeText(s.title)}</span>
      </div>
      <p class="econ-signal-text">${E().escapeText(s.text)}</p>
      ${s.metric ? `<div class="econ-signal-metric">Based on: ${E().escapeText(s.metric)}</div>` : ""}
    </div>`;

    const countyName = county.length
      ? (((data.county && data.county.counties) || {})[state.selectedFips] || {}).name || "Selected county"
      : null;

    host.innerHTML =
      nat.map(s => card(s, "National")).join("") +
      county.map(s => card(s, countyName)).join("") +
      (!county.length && E().hasCounty(data.county)
        ? `<div class="econ-signal econ-signal-hint">
             <p class="econ-signal-text">Select a county in the Regional Economic Explorer above to add
                county-level signals here.</p></div>`
        : "");
  }

  /* ── Methodology ───────────────────────────────────────────────────────── */

  function renderMethodology(data) {
    const host = document.getElementById("econ-method-body");
    const heroMeta = document.getElementById("econ-hero-meta");
    if (!host) return;
    const meta = data.meta || {};

    if (heroMeta) {
      const bits = [];
      if (meta.latest_observation_date) bits.push(`Latest observation ${E().fmtDate(meta.latest_observation_date)}`);
      if (meta.acs_vintage) bits.push(`ACS ${meta.acs_vintage}`);
      if (meta.generated_at) bits.push(`Updated ${E().fmtDateTime(meta.generated_at)}`);
      heroMeta.innerHTML = bits.length
        ? bits.map(b => `<span class="econ-meta-chip">${E().escapeText(b)}</span>`).join("") +
          (meta.stale ? `<span class="econ-meta-chip econ-meta-stale">Some series stale</span>` : "")
        : `<span class="econ-meta-chip econ-meta-stale">Awaiting first data run</span>`;
    }

    const sources = (meta.sources || []).map(s => `
      <li><strong>${E().escapeText(s.name)}</strong> — ${E().escapeText(s.publisher)}.
        ${E().escapeText(s.note || "")}
        <br><span class="econ-method-freq">Update frequency: ${E().escapeText(s.update_frequency || "—")}</span>
        ${s.url ? ` · <a href="${E().escapeText(s.url)}" target="_blank" rel="noopener noreferrer">Source site</a>` : ""}
      </li>`).join("");

    const unverified = (meta.census && meta.census.unverified_metrics) || {};
    const unverifiedKeys = Object.keys(unverified);

    host.innerHTML = `
      <ul class="econ-method-sources">${sources || "<li>No source metadata available yet.</li>"}</ul>
      <h4>How the figures are produced</h4>
      <ul class="econ-method-list">
        <li>All API requests run server-side in GitHub Actions. No API key is present in the browser.</li>
        <li>Missing observations are preserved as missing. They are never converted to zero, and chart
            lines break across gaps rather than interpolating through them.</li>
        <li>Percent change and compound growth are omitted rather than estimated when an endpoint is
            missing or a denominator is zero.</li>
        <li>Choropleth classes are quantile breaks computed only over areas that have a value.</li>
        <li>Percentile ranks appear only where at least 20 comparable areas have a value.</li>
        <li>ACS dollar figures are in the vintage's inflation-adjusted dollars and are not comparable
            across vintages.</li>
        <li>The ACS county unemployment estimate and the FRED national unemployment rate are different
            measurements on different schedules and are labelled separately throughout.</li>
      </ul>
      ${meta.fred_skipped && meta.fred_skipped.length ? `
        <h4>Series unavailable in the most recent run</h4>
        <ul class="econ-method-list">${meta.fred_skipped.map(s =>
          `<li><code>${E().escapeText(s.series_id)}</code> — ${E().escapeText(s.reason)}</li>`).join("")}</ul>` : ""}
      ${unverifiedKeys.length ? `
        <h4>Census metrics omitted this vintage</h4>
        <p class="econ-method-note">These variables could not be verified against the selected ACS
           vintage's own variable metadata, so the metric was omitted rather than populated from a
           variable that may mean something different.</p>
        <ul class="econ-method-list">${unverifiedKeys.map(k =>
          `<li><code>${E().escapeText(k)}</code> — ${E().escapeText((unverified[k] || []).join(", "))}</li>`).join("")}</ul>` : ""}
      ${meta.warnings && meta.warnings.length ? `
        <h4>Pipeline warnings (${meta.warnings.length})</h4>
        <ul class="econ-method-list">${meta.warnings.slice(0, 12).map(w =>
          `<li>${E().escapeText(w)}</li>`).join("")}</ul>` : ""}
      <p class="econ-method-note">Pipeline version ${E().escapeText(String(meta.pipeline_version || "—"))}.
         Counties: ${E().escapeText(String(meta.county_count || 0))} ·
         States: ${E().escapeText(String(meta.state_count || 0))} ·
         FRED series: ${E().escapeText(String(meta.fred_series_count || 0))}.</p>`;
  }

  /* ── Wiring ────────────────────────────────────────────────────────────── */

  let _lastData = null;

  function wire(cfg) {
    /* Range buttons */
    document.querySelectorAll("#econ-trends-section .econ-range-btn").forEach(btn => {
      btn.setAttribute("aria-pressed", String(btn.dataset.range === state.range));
      on(btn, "click", () => {
        state.range = btn.dataset.range;
        savePrefs();
        document.querySelectorAll("#econ-trends-section .econ-range-btn").forEach(b =>
          b.setAttribute("aria-pressed", String(b.dataset.range === state.range)));
        renderTrends(cfg, _lastData.fred);
      });
    });

    /* Category tabs, with arrow-key support per the tablist pattern */
    const tabs = [...document.querySelectorAll("#econ-cat-tabs .econ-cat-tab")];
    tabs.forEach((btn, i) => {
      on(btn, "click", () => activateCategory(cfg, btn.dataset.cat));
      on(btn, "keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (!next) return;
        e.preventDefault();
        next.focus();
        activateCategory(cfg, next.dataset.cat);
      });
    });

    /* Legend show/hide */
    const legend = document.getElementById("econ-chart-legend");
    on(legend, "click", (e) => {
      const btn = e.target.closest(".econ-legend-item");
      if (!btn || !_charts.handle) return;
      _charts.handle.toggle(btn.dataset.series);
      const off = _charts.handle.isHidden(btn.dataset.series);
      btn.classList.toggle("econ-legend-off", off);
      btn.setAttribute("aria-pressed", String(!off));
    });

    /* Explorer selects */
    on(document.getElementById("econ-metric-select"), "change", (e) => {
      state.metric = e.target.value;
      if (!E().supportsMeasure(state.metric, state.measure)) state.measure = "value";
      savePrefs();
      renderExplorerControls();
      renderExplorer(_lastData);
      if (state.selectedFips) renderProfile();
    });
    on(document.getElementById("econ-measure-select"), "change", (e) => {
      state.measure = e.target.value;
      savePrefs();
      renderExplorer(_lastData);
    });
    on(document.getElementById("econ-geo-select"), "change", (e) => {
      state.geo = e.target.value;
      state.selectedFips = null;
      savePrefs();
      // Counties and states are different topology objects, so the Leaflet layer
      // must be rebuilt. _US_TOPO_RAW is deliberately KEPT — it holds both
      // objects, so switching geography costs no new download.
      if (_explorerMap) { _explorerMap.remove(); _explorerMap = null; _explorerLayer = null; }
      _explorerByFips = {};
      renderExplorer(_lastData);
      const p = document.getElementById("econ-profile");
      if (p) p.innerHTML = `<div class="econ-profile-empty"><p>Select an area on the map to see its economic profile.</p></div>`;
    });

    on(document.getElementById("econ-reset-view"), "click", () => {
      if (_explorerMap) _explorerMap.setView([39.5, -98.35], 4);
    });
    on(document.getElementById("econ-clear-layer"), "click", () => {
      state.selectedFips = null;
      if (_explorerLayer) _explorerLayer.setStyle({ fillOpacity: 0, weight: 0.2 });
      const l = document.getElementById("econ-map-legend");
      if (l) l.innerHTML = `<div class="econ-legend-foot">Economic layer cleared. Change the metric to redraw it.</div>`;
      const p = document.getElementById("econ-profile");
      if (p) p.innerHTML = `<div class="econ-profile-empty"><p>Economic layer cleared.</p></div>`;
    });

    /* Search */
    const search = document.getElementById("econ-search");
    const results = document.getElementById("econ-search-results");
    let searchTimer = null;
    on(search, "input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(search.value), 160);
    });
    _cleanups.push(() => clearTimeout(searchTimer));
    on(results, "click", (e) => {
      const row = e.target.closest("[data-fips]");
      if (!row) return;
      results.hidden = true;
      if (search) search.value = "";
      focusRegion(row.dataset.fips);
    });
    on(document, "click", (e) => {
      if (results && !results.hidden && !e.target.closest(".econ-control-grow")) results.hidden = true;
    });
  }

  function activateCategory(cfg, cat) {
    state.category = cat;
    savePrefs();
    document.querySelectorAll("#econ-cat-tabs .econ-cat-tab").forEach(b => {
      const on_ = b.dataset.cat === cat;
      b.setAttribute("aria-selected", String(on_));
      b.tabIndex = on_ ? 0 : -1;
    });
    renderTrends(cfg, _lastData.fred);
  }

  function runSearch(q) {
    const results = document.getElementById("econ-search-results");
    if (!results) return;
    const term = String(q || "").trim().toLowerCase();
    if (term.length < 2) { results.hidden = true; results.innerHTML = ""; return; }
    const ds = activeDataset(_lastData);
    const hits = [];
    for (const f in ds.records) {
      const r = ds.records[f];
      const label = `${r.name}${r.state && state.geo === "county" ? ", " + r.state : ""}`;
      if (label.toLowerCase().includes(term)) hits.push({ fips: f, label });
      if (hits.length >= 12) break;
    }
    results.innerHTML = hits.length
      ? hits.map(h => `<button type="button" class="econ-search-row" role="option" data-fips="${E().escapeText(h.fips)}">${E().escapeText(h.label)}</button>`).join("")
      : `<div class="econ-search-none">No match</div>`;
    results.hidden = false;
  }

  function focusRegion(fips) {
    selectRegion(fips);
    const layer = _explorerByFips[fips];
    if (layer && _explorerMap) {
      try { _explorerMap.fitBounds(layer.getBounds(), { maxZoom: 7, padding: [24, 24] }); } catch (_) {}
      try { layer.setStyle({ color: "#ffffff", weight: 2 }); } catch (_) {}
    }
  }

  /* ── Entry point ───────────────────────────────────────────────────────── */

  function renderEconomyPage() {
    const view = document.getElementById("economy-view");
    if (!view || !window.ECONOMY) return;

    if (!view.dataset.built) {
      loadPrefs();
      view.innerHTML = shell();
      view.dataset.built = "1";
    }

    const token = ++_loadToken;

    /* National first so the KPI strip paints without waiting on the large
       county file; regional loads after and is ignored if the user navigated
       away in the meantime. */
    E().loadNational().then(nat => {
      if (token !== _loadToken) return;          // stale response, discard
      _lastData = Object.assign({ county: null, state: null }, _lastData || {}, nat);
      renderKpis(nat.series || {}, nat.fred);
      renderCategoryTabs(nat.series || {});
      renderTrends(nat.series || {}, nat.fred);
      renderMethodology(_lastData);
      renderSignals(_lastData);
      _teardown();
      wire(nat.series || {});

      return E().loadRegional();
    }).then(reg => {
      if (!reg || token !== _loadToken) return;
      _lastData = Object.assign({}, _lastData || {}, reg);
      renderExplorerControls();
      renderExplorer(_lastData);
      renderSignals(_lastData);
      renderMethodology(_lastData);
      _teardown();
      wire(reg.series || {});
      // Leaflet caches container size; the map was built while hidden.
      setTimeout(() => { if (_explorerMap) _explorerMap.invalidateSize(); }, 120);
    }).catch(err => {
      console.error("Economy page render failed:", err);
      const host = document.getElementById("econ-kpi-strip");
      if (host && !host.innerHTML) {
        host.innerHTML = `<div class="econ-empty">Economic data could not be loaded (${E().escapeText(err.message)}).</div>`;
      }
    });
  }

  /* Expose for switchTab() and for tests. */
  window.renderEconomyPage = renderEconomyPage;
  window.ECONOMY_VIEW = {
    render: renderEconomyPage,
    state,
    selectRegion,
    invalidate() { if (_explorerMap) _explorerMap.invalidateSize(); },
    /* Diagnostics for the browser test suite — no production caller. */
    _debug() {
      return {
        hasMap: !!_explorerMap,
        hasLayer: !!_explorerLayer,
        features: _explorerLayer ? _explorerLayer.getLayers().length : 0,
        indexed: Object.keys(_explorerByFips).length,
        size: _explorerMap ? _explorerMap.getSize() : null,
        metric: state.metric, measure: state.measure, geo: state.geo,
      };
    },
    destroy() {
      _teardown();
      if (_charts.handle) { _charts.handle.destroy(); delete _charts.handle; delete _charts._key; }
      if (_explorerMap) { _explorerMap.remove(); _explorerMap = null; _explorerLayer = null; }
    },
  };
})();
