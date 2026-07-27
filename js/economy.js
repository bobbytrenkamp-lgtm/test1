/* js/economy.js — Economic Intelligence.
 *
 * WHY THIS IS A SEPARATE MODULE
 * map.js was 8,347 lines before it started being broken up, and the cost of
 * that showed up as real bugs. This feature is self-contained behind
 * window.ECONOMY so the Economy tab, the economic map layers, the county
 * panels, and the Analytics section all share one loader, one cache, and one
 * set of formatters.
 *
 * DATA CONTRACT
 * Everything is read from generated local JSON under data/economy/. No API key
 * is ever present in the browser — the FRED and Census calls happen in
 * data/update_economic_data.py during CI. See AI_CONTEXT.md.
 *
 * BEFORE FIRST PIPELINE RUN
 * The shipped JSON files are structurally-valid placeholders with
 * generated_at:null and no records. That means NOT YET POPULATED, which is
 * deliberately distinct from "ran and found nothing". Every surface renders an
 * explicit awaiting-data state instead of an empty chart or a zero.
 *
 * PERFORMANCE RULES ENFORCED HERE
 *  - Nothing is fetched until a consumer asks for it (lazy, per-file).
 *  - Each file is fetched at most once; concurrent callers share one promise.
 *  - county data (the largest file) is NEVER fetched for Home or the KPI strip.
 *  - Charts are built once per container and only re-laid-out on resize.
 *  - Listeners registered by a render pass are torn down before the next one.
 */
window.ECONOMY = (function () {
  'use strict';

  /* ── Paths (relative — this deploys to a GitHub Pages *project* site at
        /test1/, where a root-absolute path resolves to the user domain) ── */
  const BASE = "data/economy/";
  const FILES = {
    series:   BASE + "series_config.json",
    fred:     BASE + "fred_data.json",
    county:   BASE + "census_county.json",
    state:    BASE + "census_state.json",
    meta:     BASE + "economic_metadata.json",
    cbp:      BASE + "census_cbp.json",
  };

  /* Files the pipeline GENERATES. Only these may be redirected to a fixture —
     series_config.json is hand-maintained configuration, not generated output,
     and it lives only in data/economy/. Redirecting it silently produced an
     empty config, which killed the KPI strip and every chart while the rest of
     the page still rendered. */
  const GENERATED = new Set(["fred", "county", "state", "meta", "cbp"]);

  /* Test hook: tests/fixtures/economy holds clearly-labelled synthetic data so
     the rendering paths can be verified without inventing numbers in the real
     data files. Never set in production. */
  function _url(key) {
    const override = window.__ECONOMY_FIXTURE_BASE__;
    if (override && GENERATED.has(key)) return override + FILES[key].slice(BASE.length);
    return FILES[key];
  }

  /* ── Cache: one in-flight promise per file, shared by all callers ── */
  const _cache = {};
  const _inflight = {};

  function load(key) {
    if (_cache[key] !== undefined) return Promise.resolve(_cache[key]);
    if (_inflight[key]) return _inflight[key];
    _inflight[key] = fetch(_url(key), { cache: "no-store" })
      .then(r => {
        // 404 on the optional CBP file is expected and must not reject.
        if (!r.ok) throw new Error(`${key}: HTTP ${r.status}`);
        return r.json();
      })
      .then(json => { _cache[key] = json; delete _inflight[key]; return json; })
      .catch(err => {
        delete _inflight[key];
        // Cache the failure as null so a missing optional file is not re-fetched
        // on every interaction, but do not poison required files permanently.
        if (key === "cbp") _cache[key] = null;
        console.warn("ECONOMY load failed:", key, err.message);
        return null;
      });
    return _inflight[key];
  }

  /* Loads only what the national sections need — deliberately excludes the
     multi-megabyte county file. */
  function loadNational() {
    return Promise.all([load("series"), load("fred"), load("meta")])
      .then(([series, fred, meta]) => ({ series, fred, meta }));
  }

  function loadRegional() {
    return Promise.all([load("series"), load("county"), load("state"), load("meta")])
      .then(([series, county, state, meta]) => ({ series, county, state, meta }));
  }

  /* ── Population state ──────────────────────────────────────────────────── */

  /* A payload is "populated" when the pipeline actually filled it. Callers must
     branch on this rather than on emptiness, so "not run yet" never renders as
     "no economic activity". */
  function isPopulated(payload, recordKey) {
    if (!payload || !payload.generated_at) return false;
    const node = payload[recordKey];
    return !!node && Object.keys(node).length > 0;
  }

  const hasFred    = (f) => isPopulated(f, "series");
  const hasCounty  = (c) => isPopulated(c, "counties");
  const hasState   = (s) => isPopulated(s, "states");

  /* ── Formatting ────────────────────────────────────────────────────────── */

  const _nf = (min, max) => new Intl.NumberFormat("en-US",
    { minimumFractionDigits: min, maximumFractionDigits: max });

  function fmtValue(value, unitType, decimals) {
    if (value === null || value === undefined) return "—";
    const d = decimals === undefined || decimals === null ? 2 : decimals;
    switch (unitType) {
      case "percent":
      case "percentage_points":
        return _nf(d, d).format(value) + "%";
      case "usd":
        return "$" + _nf(0, 0).format(Math.round(value));
      case "usd_precise":
        // For sub-dollar or few-dollar values (electricity $/kWh, natural gas
        // $/MMBtu) where rounding to whole dollars via "usd" would collapse
        // a real $0.1723 -> $0.17 price signal down to "$0".
        return "$" + _nf(d, d).format(value);
      case "billions_usd":
        return "$" + _nf(d, d).format(value) + "B";
      case "millions_usd":
        return "$" + _nf(0, 0).format(Math.round(value)) + "M";
      case "thousands":
        return _nf(0, 0).format(Math.round(value)) + "K";
      case "count":
        return _nf(0, 0).format(Math.round(value));
      case "years":
        return _nf(d, d).format(value) + " yrs";
      case "index":
        return _nf(d, d).format(value);
      default:
        return _nf(0, Math.max(0, d)).format(value);
    }
  }

  function fmtChange(value, unitType) {
    if (value === null || value === undefined) return "—";
    const sign = value > 0 ? "+" : "";
    if (unitType === "percent" || unitType === "percentage_points") {
      return sign + _nf(2, 2).format(value) + " pp";
    }
    return sign + _nf(1, 1).format(value) + "%";
  }

  function fmtPct(value, decimals) {
    if (value === null || value === undefined) return "—";
    const d = decimals === undefined ? 1 : decimals;
    return (value > 0 ? "+" : "") + _nf(d, d).format(value) + "%";
  }

  /* Human date from an ISO yyyy-mm-dd. Formatted from the parts rather than via
     new Date(), which treats a bare ISO date as UTC and can render the previous
     day west of Greenwich. */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    if (!iso) return "—";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return String(iso).slice(0, 10);
    return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  }
  function fmtDateTime(iso) {
    if (!iso) return "—";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    return m ? fmtDate(iso) : String(iso);
  }

  /* Direction is never conveyed by colour alone — every caller pairs this glyph
     with the sign in the text, per the accessibility requirement. */
  function direction(change, invert) {
    if (change === null || change === undefined || change === 0) {
      return { glyph: "→", cls: "econ-flat", word: "unchanged" };
    }
    const up = change > 0;
    const good = invert ? !up : up;
    return {
      glyph: up ? "▲" : "▼",
      cls: good ? "econ-up-good" : "econ-up-bad",
      word: up ? "up" : "down",
    };
  }

  /* ── Metric registry for county/state metrics ──────────────────────────── */

  /* Mirrors data/economy/census_config.json. Kept here (rather than fetched)
     because the map layer and county panel need it synchronously while styling
     thousands of polygons; the census config is still the pipeline's source of
     truth for which variables back each metric. */
  const METRICS = {
    population:              { label: "Population",              unit: "count",   dec: 0, good: "up",      scale: "sequential" },
    median_age:              { label: "Median age",              unit: "years",   dec: 1, good: "neutral", scale: "sequential" },
    median_household_income: { label: "Median household income", unit: "usd",     dec: 0, good: "up",      scale: "sequential" },
    per_capita_income:       { label: "Per capita income",        unit: "usd",     dec: 0, good: "up",      scale: "sequential" },
    unemployment_rate:       { label: "Unemployment rate",        unit: "percent", dec: 1, good: "down",    scale: "sequential" },
    bachelors_or_higher_pct: { label: "Bachelor's or higher",     unit: "percent", dec: 1, good: "up",      scale: "sequential" },
    median_home_value:       { label: "Median home value",        unit: "usd",     dec: 0, good: "neutral", scale: "sequential" },
    median_gross_rent:       { label: "Median gross rent",        unit: "usd",     dec: 0, good: "neutral", scale: "sequential" },
    broadband_pct:           { label: "Broadband subscription",   unit: "percent", dec: 1, good: "up",      scale: "sequential" },
  };

  /* Metrics offered in the explorer / map selectors, in presentation order. */
  const EXPLORER_METRICS = [
    "population", "median_household_income", "unemployment_rate",
    "bachelors_or_higher_pct", "median_home_value", "median_gross_rent",
    "broadband_pct",
  ];

  /* Which measures each metric supports. change_5y only exists where the
     pipeline computed history, so offering it elsewhere would show all "—". */
  const MEASURES = {
    value:     { label: "Latest value",  key: "value" },
    change_1y: { label: "1-year change", key: "change_1y_pct" },
    change_5y: { label: "5-year change", key: "change_5y_pct" },
  };
  const HISTORY_METRICS = new Set(["population", "median_household_income", "unemployment_rate"]);

  function metricValue(record, metric, measure) {
    if (!record) return null;
    const m = (record.metrics || {})[metric];
    if (!m) return null;
    const key = (MEASURES[measure] || MEASURES.value).key;
    const v = m[key];
    return (v === undefined) ? null : v;
  }

  function supportsMeasure(metric, measure) {
    if (measure === "value") return true;
    return HISTORY_METRICS.has(metric);
  }

  /* ── Classification (choropleth breaks) ────────────────────────────────── */

  /* Quantile breaks over the actual present values. Missing values are excluded
     entirely rather than treated as zero — including them would drag every
     break downward and make well-populated counties look like outliers. */
  function quantileBreaks(values, classes) {
    const nums = values.filter(v => v !== null && v !== undefined && isFinite(v))
                       .slice().sort((a, b) => a - b);
    if (nums.length === 0) return null;
    const k = Math.max(2, Math.min(classes || 5, nums.length));
    const breaks = [];
    for (let i = 1; i < k; i++) {
      const pos = (nums.length - 1) * (i / k);
      const lo = Math.floor(pos), hi = Math.ceil(pos);
      breaks.push(lo === hi ? nums[lo] : nums[lo] + (nums[hi] - nums[lo]) * (pos - lo));
    }
    return { breaks, min: nums[0], max: nums[nums.length - 1], count: nums.length };
  }

  /* Colour ramps.
     A red->green ramp is NOT used for magnitude: it implies a value judgement
     that "high population" or "high rent" does not carry, and it is the worst
     case for the most common form of colour blindness. Sequential ramps encode
     magnitude; the diverging ramp is reserved for signed change, where a zero
     midpoint is genuinely meaningful. */
  const RAMP_SEQUENTIAL = ["#0d2a4a", "#17456f", "#256f9c", "#4a9dc4", "#8fcadd"];
  const RAMP_SEQ_LIGHT  = ["#dceaf5", "#a9cfe6", "#6ba6cd", "#3a7cab", "#1a5183"];
  const RAMP_DIVERGING  = ["#b2432c", "#d98f6d", "#e8e2d8", "#7faac0", "#2d6b8f"];
  const NO_DATA_DARK    = "#232733";
  const NO_DATA_LIGHT   = "#e5e7eb";

  function isLight() {
    try {
      return typeof isDarkTheme === "function" ? !isDarkTheme()
        : document.documentElement.getAttribute("data-theme") === "light";
    } catch (_) { return false; }
  }

  function rampFor(measure) {
    if (measure && measure !== "value") return RAMP_DIVERGING;
    return isLight() ? RAMP_SEQ_LIGHT : RAMP_SEQUENTIAL;
  }

  function noDataColor() { return isLight() ? NO_DATA_LIGHT : NO_DATA_DARK; }

  /* Build a reusable classifier: value -> {color, className, index}. */
  function makeClassifier(values, measure) {
    const q = quantileBreaks(values, 5);
    const ramp = rampFor(measure);
    const diverging = measure && measure !== "value";
    return {
      breaks: q ? q.breaks : [],
      min: q ? q.min : null,
      max: q ? q.max : null,
      count: q ? q.count : 0,
      ramp,
      diverging,
      color(v) {
        if (v === null || v === undefined || !isFinite(v)) return noDataColor();
        if (!q) return noDataColor();
        if (diverging) {
          // Anchor on zero so "no change" reads as the neutral middle band and
          // the sign of a change is never ambiguous.
          if (v <= -10) return ramp[0];
          if (v < -2)   return ramp[1];
          if (v <= 2)   return ramp[2];
          if (v <= 10)  return ramp[3];
          return ramp[4];
        }
        let i = 0;
        while (i < q.breaks.length && v > q.breaks[i]) i++;
        return ramp[Math.min(i, ramp.length - 1)];
      },
    };
  }

  /* Legend rows for a classifier, as {color, label}. */
  function legendRows(cls, metric, measure) {
    const meta = METRICS[metric] || {};
    const f = (v) => measure && measure !== "value"
      ? fmtPct(v, 1)
      : fmtValue(v, meta.unit, meta.dec);
    if (cls.diverging) {
      return [
        { color: cls.ramp[0], label: "≤ −10%" },
        { color: cls.ramp[1], label: "−10% to −2%" },
        { color: cls.ramp[2], label: "−2% to +2%" },
        { color: cls.ramp[3], label: "+2% to +10%" },
        { color: cls.ramp[4], label: "> +10%" },
        { color: noDataColor(), label: "No data" },
      ];
    }
    if (!cls.breaks.length) return [{ color: noDataColor(), label: "No data" }];
    const rows = [];
    let lo = cls.min;
    for (let i = 0; i < cls.breaks.length; i++) {
      rows.push({ color: cls.ramp[i], label: `${f(lo)} – ${f(cls.breaks[i])}` });
      lo = cls.breaks[i];
    }
    rows.push({ color: cls.ramp[cls.breaks.length], label: `${f(lo)} – ${f(cls.max)}` });
    rows.push({ color: noDataColor(), label: "No data" });
    return rows;
  }

  /* ── Comparison statistics ─────────────────────────────────────────────── */

  function median(values) {
    const n = values.filter(v => v !== null && v !== undefined && isFinite(v))
                    .slice().sort((a, b) => a - b);
    if (!n.length) return null;
    const mid = Math.floor(n.length / 2);
    return n.length % 2 ? n[mid] : (n[mid - 1] + n[mid]) / 2;
  }

  /* Percentile rank, or null when it would not be meaningful.
     Requires a real value and a reference set large enough for a percentile to
     say anything — reporting "72nd percentile of 4 counties" is noise. */
  function percentileRank(value, values, minSample) {
    if (value === null || value === undefined || !isFinite(value)) return null;
    const n = values.filter(v => v !== null && v !== undefined && isFinite(v));
    if (n.length < (minSample || 20)) return null;
    const below = n.filter(v => v < value).length;
    const equal = n.filter(v => v === value).length;
    return Math.round(((below + equal / 2) / n.length) * 100);
  }

  /* National and state context for one county metric. */
  function comparisons(countyData, stateData, fips, metric, measure) {
    const counties = (countyData && countyData.counties) || {};
    const rec = counties[fips];
    const value = metricValue(rec, metric, measure);

    const allValues = [];
    const stateValues = [];
    const st = fips ? fips.slice(0, 2) : null;
    for (const f in counties) {
      const v = metricValue(counties[f], metric, measure);
      if (v === null) continue;
      allValues.push(v);
      if (st && f.slice(0, 2) === st) stateValues.push(v);
    }

    const stateRec = st ? ((stateData && stateData.states) || {})[st] : null;

    return {
      value,
      us_median: median(allValues),
      us_count: allValues.length,
      state_median: stateValues.length >= 3 ? median(stateValues) : null,
      state_count: stateValues.length,
      state_value: metricValue(stateRec, metric, measure),
      percentile: percentileRank(value, allValues, 20),
      state_percentile: percentileRank(value, stateValues, 20),
    };
  }

  /* ── Lightweight SVG charts ────────────────────────────────────────────── */

  /* The repository has no charting library and vendors only Leaflet and
     topojson (see AI_CONTEXT.md), so these are hand-built SVG. Deliberately
     small: a line/area path builder, a hover readout, and a sparkline. */

  const SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    for (const k in (attrs || {})) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* Split a series into contiguous runs of real values.
     This is what prevents a straight line being drawn across a gap in the data,
     which would invent observations that do not exist. */
  function segments(points) {
    const out = [];
    let cur = [];
    for (const p of points) {
      if (p.v === null || p.v === undefined || !isFinite(p.v)) {
        if (cur.length) { out.push(cur); cur = []; }
      } else {
        cur.push(p);
      }
    }
    if (cur.length) out.push(cur);
    return out;
  }

  const SERIES_COLORS = ["#5b8def", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

  /* Draw a multi-series time-series chart into `host`.
     series: [{ id, label, unitType, decimals, points:[{t:Date, v:number|null}] }]
     Returns a handle with .resize() and .destroy() so the caller can re-lay-out
     on viewport change without rebuilding, and detach listeners on teardown. */
  function timeSeriesChart(host, series, opts) {
    opts = opts || {};
    host.innerHTML = "";
    host.classList.add("econ-chart");

    const state = { series, opts, hidden: new Set(), tip: null, ro: null };

    const svg = svgEl("svg", { class: "econ-chart-svg", role: "img" });
    const desc = svgEl("desc");
    svg.appendChild(desc);
    host.appendChild(svg);

    const tip = document.createElement("div");
    tip.className = "econ-chart-tip";
    tip.setAttribute("role", "status");
    tip.hidden = true;
    host.appendChild(tip);
    state.tip = tip;

    function visible() {
      return state.series.filter(s => !state.hidden.has(s.id));
    }

    function draw() {
      const W = Math.max(240, host.clientWidth || 320);
      const H = Math.max(160, opts.height || 260);
      const M = { t: 12, r: 14, b: 26, l: 54 };
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", String(H));
      while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild);

      const vis = visible();
      const all = [];
      let tMin = Infinity, tMax = -Infinity;
      for (const s of vis) {
        for (const p of s.points) {
          if (p.t < tMin) tMin = p.t;
          if (p.t > tMax) tMax = p.t;
          if (p.v !== null && p.v !== undefined && isFinite(p.v)) all.push(p.v);
        }
      }
      if (!all.length || !isFinite(tMin)) {
        const t = svgEl("text", { x: W / 2, y: H / 2, "text-anchor": "middle",
                                  class: "econ-chart-empty-text" });
        t.textContent = "No observations in this range";
        svg.appendChild(t);
        desc.textContent = "Chart has no data in the selected range.";
        return;
      }

      let vMin = Math.min.apply(null, all);
      let vMax = Math.max.apply(null, all);
      if (vMin === vMax) { vMin -= 1; vMax += 1; }
      // Include zero when the series legitimately crosses it (yield spread,
      // financial conditions), so the sign is readable.
      if (opts.zeroReference) { vMin = Math.min(vMin, 0); vMax = Math.max(vMax, 0); }
      const pad = (vMax - vMin) * 0.08;
      vMin -= pad; vMax += pad;

      const x = (t) => M.l + (W - M.l - M.r) * ((t - tMin) / Math.max(1, tMax - tMin));
      const y = (v) => M.t + (H - M.t - M.b) * (1 - (v - vMin) / (vMax - vMin));

      /* Gridlines + y labels */
      const gridG = svgEl("g", { class: "econ-chart-grid" });
      for (let i = 0; i <= 4; i++) {
        const v = vMin + (vMax - vMin) * (i / 4);
        const yy = y(v);
        gridG.appendChild(svgEl("line", { x1: M.l, x2: W - M.r, y1: yy, y2: yy }));
        const lbl = svgEl("text", { x: M.l - 8, y: yy + 3.5, "text-anchor": "end",
                                    class: "econ-chart-axis" });
        const ref = vis[0] || {};
        lbl.textContent = fmtValue(v, ref.unitType, ref.decimals);
        gridG.appendChild(lbl);
      }
      if (opts.zeroReference && vMin < 0 && vMax > 0) {
        gridG.appendChild(svgEl("line", {
          x1: M.l, x2: W - M.r, y1: y(0), y2: y(0), class: "econ-chart-zero" }));
      }
      svg.appendChild(gridG);

      /* X labels — first, middle, last */
      const xg = svgEl("g");
      [tMin, tMin + (tMax - tMin) / 2, tMax].forEach((t, i) => {
        const lbl = svgEl("text", {
          x: x(t), y: H - 8, class: "econ-chart-axis",
          "text-anchor": i === 0 ? "start" : i === 2 ? "end" : "middle" });
        const d = new Date(t);
        lbl.textContent = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        xg.appendChild(lbl);
      });
      svg.appendChild(xg);

      /* Series paths — one path per contiguous run, so gaps stay gaps */
      vis.forEach((s, si) => {
        const color = s.color || SERIES_COLORS[si % SERIES_COLORS.length];
        const g = svgEl("g", { class: "econ-chart-series" });
        for (const seg of segments(s.points)) {
          if (seg.length === 1) {
            g.appendChild(svgEl("circle", { cx: x(seg[0].t), cy: y(seg[0].v), r: 2, fill: color }));
            continue;
          }
          const d = seg.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
          g.appendChild(svgEl("path", { d, fill: "none", stroke: color,
                                        "stroke-width": 1.8, "stroke-linejoin": "round" }));
        }
        svg.appendChild(g);
      });

      /* Hover readout. One listener on the svg, removed in destroy(). */
      const marker = svgEl("line", { class: "econ-chart-marker", y1: M.t, y2: H - M.b,
                                     x1: -99, x2: -99 });
      svg.appendChild(marker);

      function onMove(ev) {
        const rect = svg.getBoundingClientRect();
        const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
        const scaled = px * (W / Math.max(1, rect.width));
        if (scaled < M.l || scaled > W - M.r) { tip.hidden = true; marker.setAttribute("x1", -99); marker.setAttribute("x2", -99); return; }
        const t = tMin + (tMax - tMin) * ((scaled - M.l) / (W - M.l - M.r));
        marker.setAttribute("x1", scaled); marker.setAttribute("x2", scaled);

        const rows = [];
        let stamp = null;
        for (const s of visible()) {
          let best = null, bestD = Infinity;
          for (const p of s.points) {
            if (p.v === null || p.v === undefined) continue;
            const d = Math.abs(p.t - t);
            if (d < bestD) { bestD = d; best = p; }
          }
          if (best) {
            stamp = stamp || best.t;
            rows.push(`<span class="econ-tip-row"><span class="econ-tip-dot" style="background:${s.color || SERIES_COLORS[state.series.indexOf(s) % SERIES_COLORS.length]}"></span>${escapeText(s.label)}: <strong>${escapeText(fmtValue(best.v, s.unitType, s.decimals))}</strong></span>`);
          }
        }
        if (!rows.length) { tip.hidden = true; return; }
        tip.innerHTML = `<div class="econ-tip-date">${escapeText(fmtDate(new Date(stamp).toISOString().slice(0, 10)))}</div>${rows.join("")}`;
        tip.hidden = false;
        // Keep the tooltip on screen: flip sides near the right edge.
        const half = tip.offsetWidth / 2;
        let left = px;
        if (left - half < 4) left = half + 4;
        if (left + half > rect.width - 4) left = rect.width - half - 4;
        tip.style.left = left + "px";
      }
      function onLeave() {
        tip.hidden = true;
        marker.setAttribute("x1", -99); marker.setAttribute("x2", -99);
      }
      svg.addEventListener("mousemove", onMove);
      svg.addEventListener("mouseleave", onLeave);
      svg.addEventListener("touchmove", onMove, { passive: true });
      svg.addEventListener("touchend", onLeave);
      state._detach = () => {
        svg.removeEventListener("mousemove", onMove);
        svg.removeEventListener("mouseleave", onLeave);
        svg.removeEventListener("touchmove", onMove);
        svg.removeEventListener("touchend", onLeave);
      };

      /* Accessible text summary — a chart must not be the only representation. */
      desc.textContent = vis.map(s => {
        const reals = s.points.filter(p => p.v !== null && p.v !== undefined);
        if (!reals.length) return `${s.label}: no data.`;
        const a = reals[0], b = reals[reals.length - 1];
        const dir = b.v > a.v ? "rose" : b.v < a.v ? "fell" : "was unchanged";
        return `${s.label} ${dir} from ${fmtValue(a.v, s.unitType, s.decimals)} on ` +
               `${fmtDate(new Date(a.t).toISOString().slice(0, 10))} to ` +
               `${fmtValue(b.v, s.unitType, s.decimals)} on ` +
               `${fmtDate(new Date(b.t).toISOString().slice(0, 10))}.`;
      }).join(" ");
      svg.setAttribute("aria-label", desc.textContent);
    }

    draw();

    /* Re-lay-out on container resize without rebuilding the chart object. */
    if (typeof ResizeObserver === "function") {
      let raf = null;
      state.ro = new ResizeObserver(() => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { if (state._detach) state._detach(); draw(); });
      });
      state.ro.observe(host);
    }

    return {
      redraw: draw,
      toggle(id) {
        if (state.hidden.has(id)) state.hidden.delete(id); else state.hidden.add(id);
        if (state._detach) state._detach();
        draw();
      },
      isHidden: (id) => state.hidden.has(id),
      destroy() {
        if (state._detach) state._detach();
        if (state.ro) state.ro.disconnect();
        host.innerHTML = "";
      },
    };
  }

  /* Tiny inline sparkline. Static markup, no interaction, safe to inline. */
  function sparklineSvg(points, opts) {
    opts = opts || {};
    const W = opts.width || 96, H = opts.height || 26;
    const reals = (points || []).filter(p => p && p[1] !== null && p[1] !== undefined && isFinite(p[1]));
    if (reals.length < 2) {
      return `<svg class="econ-spark" width="${W}" height="${H}" role="img" aria-label="Not enough data for a trend line"><text x="${W / 2}" y="${H / 2 + 3}" text-anchor="middle" class="econ-spark-empty">no trend data</text></svg>`;
    }
    const xs = reals.map(p => p[0]), ys = reals.map(p => p[1]);
    const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    let y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    const px = (v) => 2 + (W - 4) * ((v - x0) / Math.max(1, x1 - x0));
    const py = (v) => 2 + (H - 4) * (1 - (v - y0) / (y1 - y0));
    const d = reals.map((p, i) => `${i ? "L" : "M"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join("");
    const rising = ys[ys.length - 1] >= ys[0];
    const color = opts.color || (rising ? "#22c55e" : "#ef4444");
    const label = `${opts.label || "Trend"}: ${rising ? "rising" : "falling"} from ` +
                  `${reals[0][1]} in ${reals[0][0]} to ${reals[reals.length - 1][1]} in ${reals[reals.length - 1][0]}`;
    return `<svg class="econ-spark" width="${W}" height="${H}" role="img" aria-label="${escapeText(label)}">` +
           `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>` +
           `<circle cx="${px(reals[reals.length - 1][0]).toFixed(1)}" cy="${py(reals[reals.length - 1][1]).toFixed(1)}" r="2" fill="${color}"/>` +
           `</svg>`;
  }

  /* ── Escaping ──────────────────────────────────────────────────────────── */
  /* County names, state names, and FRED series titles all come from data files
     and are untrusted for HTML purposes. */
  function escapeText(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ── Infrastructure-relevant signals ──────────────────────────────────── */

  /* Deterministic, rule-based statements. No generative text: every sentence is
     produced by a rule below and every number in it is one the UI also displays,
     so a reader can always check the claim against the metric.
     These describe conditions. They are explicitly NOT recommendations, and the
     UI states that alongside them. */
  const SIGNAL_RULES = [
    {
      id: "population_momentum",
      title: "Population momentum",
      test: (c, ctx) => {
        const v = metricValue(c, "population", "change_5y");
        if (v === null || ctx.medians.population_5y === null) return null;
        if (v <= ctx.medians.population_5y) return null;
        return { strength: v > 10 ? "strong" : "moderate",
                 text: `Population increased ${fmtPct(v)} over five years, above the national county median of ${fmtPct(ctx.medians.population_5y)}.` };
      },
    },
    {
      id: "population_decline",
      title: "Population decline",
      test: (c) => {
        const v = metricValue(c, "population", "change_5y");
        if (v === null || v >= 0) return null;
        return { strength: "caution",
                 text: `Population declined ${fmtPct(v)} over five years, which can constrain local labor supply.` };
      },
    },
    {
      id: "income_growth",
      title: "Income growth",
      test: (c, ctx) => {
        const v = metricValue(c, "median_household_income", "change_5y");
        if (v === null || ctx.medians.income_5y === null) return null;
        if (v <= ctx.medians.income_5y) return null;
        return { strength: "moderate",
                 text: `Median household income grew ${fmtPct(v)} over five years, above the national county median of ${fmtPct(ctx.medians.income_5y)}.` };
      },
    },
    {
      id: "skilled_workforce",
      title: "Skilled workforce",
      test: (c, ctx) => {
        const v = metricValue(c, "bachelors_or_higher_pct", "value");
        if (v === null || ctx.medians.bachelors === null) return null;
        if (v <= ctx.medians.bachelors) return null;
        return { strength: v > 40 ? "strong" : "moderate",
                 text: `${fmtValue(v, "percent", 1)} of residents aged 25 and over hold a bachelor's degree or higher, above the national county median of ${fmtValue(ctx.medians.bachelors, "percent", 1)}.` };
      },
    },
    {
      id: "broadband",
      title: "Broadband adoption",
      test: (c, ctx) => {
        const v = metricValue(c, "broadband_pct", "value");
        if (v === null || ctx.medians.broadband === null) return null;
        if (v <= ctx.medians.broadband) return null;
        return { strength: "moderate",
                 text: `${fmtValue(v, "percent", 1)} of households subscribe to broadband, above the national county median of ${fmtValue(ctx.medians.broadband, "percent", 1)}.` };
      },
    },
    {
      id: "tight_labor",
      title: "Tight labor market",
      test: (c, ctx) => {
        const v = metricValue(c, "unemployment_rate", "value");
        if (v === null || ctx.medians.unemployment === null) return null;
        if (v >= ctx.medians.unemployment) return null;
        return { strength: "mixed",
                 text: `Unemployment is ${fmtValue(v, "percent", 1)}, below the national county median of ${fmtValue(ctx.medians.unemployment, "percent", 1)}. A tight labor market can raise construction and operations hiring costs.` };
      },
    },
    {
      id: "weak_labor",
      title: "Available labor",
      test: (c, ctx) => {
        const v = metricValue(c, "unemployment_rate", "value");
        if (v === null || ctx.medians.unemployment === null) return null;
        if (v <= ctx.medians.unemployment * 1.25) return null;
        return { strength: "mixed",
                 text: `Unemployment is ${fmtValue(v, "percent", 1)}, well above the national county median of ${fmtValue(ctx.medians.unemployment, "percent", 1)}. That can mean more available labor and also weaker local demand.` };
      },
    },
    {
      id: "housing_cost",
      title: "Housing cost pressure",
      test: (c, ctx) => {
        const v = metricValue(c, "median_home_value", "value");
        if (v === null || ctx.medians.home_value === null) return null;
        if (v <= ctx.medians.home_value * 1.5) return null;
        return { strength: "caution",
                 text: `Median home value is ${fmtValue(v, "usd", 0)}, more than 50% above the national county median of ${fmtValue(ctx.medians.home_value, "usd", 0)}. High housing costs can complicate workforce relocation.` };
      },
    },
    /* building_permits lives at the top level of a county record (merged in
       by the pipeline's collect_permits()), not inside .metrics like the ACS
       figures above -- it is Census Building Permits Survey data reached
       through FRED's per-county series, not the Census Data API, and does
       not carry the same value/change_1y_pct/change_5y_pct shape metricValue()
       expects. Read directly. Threshold-based rather than compared against a
       national median: unlike the ACS metrics above, not every county has a
       permits series at all, so a national median across only the counties
       that DO report would not mean what a reader assumes it means. */
    {
      id: "permits_accelerating",
      title: "Construction activity accelerating",
      test: (c) => {
        const bp = c.building_permits;
        if (!bp || bp.change_yoy_pct === null || bp.change_yoy_pct === undefined) return null;
        if (bp.change_yoy_pct <= 15) return null;
        return { strength: "mixed",
                 text: `County-issued building permits rose ${fmtPct(bp.change_yoy_pct)} year-over-year (latest: ${fmtValue(bp.value, "count", 0)} units, as of ${fmtDate(bp.as_of)}). More local construction activity can mean more competition for contractors and materials.` };
      },
    },
    {
      id: "permits_slowing",
      title: "Construction activity slowing",
      test: (c) => {
        const bp = c.building_permits;
        if (!bp || bp.change_yoy_pct === null || bp.change_yoy_pct === undefined) return null;
        if (bp.change_yoy_pct >= -15) return null;
        return { strength: "moderate",
                 text: `County-issued building permits fell ${fmtPct(bp.change_yoy_pct)} year-over-year (latest: ${fmtValue(bp.value, "count", 0)} units, as of ${fmtDate(bp.as_of)}). Less local construction activity can mean easier access to contractors and materials.` };
      },
    },
  ];

  /* National signals derived from FRED rather than a county. */
  function nationalSignals(fred) {
    if (!hasFred(fred)) return [];
    const s = fred.series;
    const out = [];

    const cre = s.CREACBM027NBOG;
    if (cre && cre.change_yoy_pct !== null && cre.change_yoy_pct !== undefined) {
      out.push({
        title: "Commercial credit",
        strength: cre.change_yoy_pct > 0 ? "moderate" : "caution",
        text: cre.change_yoy_pct > 0
          ? `Commercial real estate lending is up ${fmtPct(cre.change_yoy_pct)} year over year, indicating credit is available for this asset class.`
          : `Commercial real estate lending is down ${fmtPct(cre.change_yoy_pct)} year over year, indicating tighter credit for this asset class.`,
        metric: "CRE Loans",
      });
    }

    const ff = s.DFF;
    if (ff && ff.latest_value !== null && ff.change_yoy_abs !== null && ff.change_yoy_abs !== undefined) {
      const falling = ff.change_yoy_abs < 0;
      out.push({
        title: "Financing cost",
        strength: falling ? "moderate" : "caution",
        text: `The federal funds rate is ${fmtValue(ff.latest_value, "percent", 2)}, ` +
              `${falling ? "down" : "up"} ${fmtValue(Math.abs(ff.change_yoy_abs), "percentage_points", 2)} over the past year. ` +
              `${falling ? "Falling" : "Rising"} policy rates ${falling ? "reduce" : "raise"} the cost of financing capital-intensive construction.`,
        metric: "Fed Funds Rate",
      });
    }

    const curve = s.T10Y2Y;
    if (curve && curve.latest_value !== null && curve.latest_value !== undefined) {
      const inverted = curve.latest_value < 0;
      out.push({
        title: "Yield curve",
        strength: inverted ? "caution" : "moderate",
        text: inverted
          ? `The 10-year minus 2-year Treasury spread is ${fmtValue(curve.latest_value, "percentage_points", 2)}, an inverted curve. Historically this has often preceded recessions, but it is a signal rather than a forecast.`
          : `The 10-year minus 2-year Treasury spread is ${fmtValue(curve.latest_value, "percentage_points", 2)}, a normal upward-sloping curve.`,
        metric: "Yield Curve",
      });
    }

    const permit = s.PERMIT;
    if (permit && permit.change_yoy_pct !== null && permit.change_yoy_pct !== undefined) {
      out.push({
        title: "Construction pipeline",
        strength: permit.change_yoy_pct > 0 ? "moderate" : "caution",
        text: `Residential building permits are ${permit.change_yoy_pct > 0 ? "up" : "down"} ${fmtPct(Math.abs(permit.change_yoy_pct))} year over year, a leading indicator of regional construction capacity and trade labor competition.`,
        metric: "Building Permits",
      });
    }

    return out;
  }

  /* Compute the national medians the county rules compare against, once. */
  let _medianCache = null;
  function nationalMedians(countyData) {
    if (_medianCache) return _medianCache;
    const counties = (countyData && countyData.counties) || {};
    const acc = { population_5y: [], income_5y: [], bachelors: [],
                  broadband: [], unemployment: [], home_value: [] };
    for (const f in counties) {
      const c = counties[f];
      const push = (arr, v) => { if (v !== null && v !== undefined && isFinite(v)) arr.push(v); };
      push(acc.population_5y, metricValue(c, "population", "change_5y"));
      push(acc.income_5y,     metricValue(c, "median_household_income", "change_5y"));
      push(acc.bachelors,     metricValue(c, "bachelors_or_higher_pct", "value"));
      push(acc.broadband,     metricValue(c, "broadband_pct", "value"));
      push(acc.unemployment,  metricValue(c, "unemployment_rate", "value"));
      push(acc.home_value,    metricValue(c, "median_home_value", "value"));
    }
    _medianCache = {
      population_5y: median(acc.population_5y),
      income_5y:     median(acc.income_5y),
      bachelors:     median(acc.bachelors),
      broadband:     median(acc.broadband),
      unemployment:  median(acc.unemployment),
      home_value:    median(acc.home_value),
    };
    return _medianCache;
  }

  function countySignals(countyData, fips) {
    const counties = (countyData && countyData.counties) || {};
    const rec = counties[fips];
    if (!rec) return [];
    const ctx = { medians: nationalMedians(countyData) };
    const out = [];
    for (const rule of SIGNAL_RULES) {
      let res = null;
      try { res = rule.test(rec, ctx); } catch (_) { res = null; }
      if (res) out.push({ id: rule.id, title: rule.title, ...res });
    }
    return out;
  }

  /* ── Public API ────────────────────────────────────────────────────────── */
  return {
    FILES,
    load, loadNational, loadRegional,
    isPopulated, hasFred, hasCounty, hasState,
    fmtValue, fmtChange, fmtPct, fmtDate, fmtDateTime, direction, escapeText,
    METRICS, EXPLORER_METRICS, MEASURES, HISTORY_METRICS,
    metricValue, supportsMeasure,
    quantileBreaks, makeClassifier, legendRows, noDataColor, rampFor, isLight,
    median, percentileRank, comparisons, nationalMedians,
    timeSeriesChart, sparklineSvg, segments,
    nationalSignals, countySignals, SIGNAL_RULES,
    /* Test/diagnostic surface */
    _resetCache() {
      for (const k in _cache) delete _cache[k];
      for (const k in _inflight) delete _inflight[k];
      _medianCache = null;
    },
  };
})();
