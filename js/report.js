/* ── Due-Diligence Report Generator ── */
/* Generates a printable HTML report for a county and opens it in a new tab. */
window.REPORT = (function () {

  const SEV_LABELS = { "-1": "Pro-Business Hub", "0": "No Known Restriction", "1": "Light Regulations", "2": "Moderate Restrictions", "3": "Significant Restrictions", "4": "Ban / Moratorium" };
  const SEV_COLORS = { "-1": "#16a34a", "0": "#6b7280", "1": "#15803d", "2": "#c2410c", "3": "#b91c1c", "4": "#7f1d1d" };
  const SEV_BG     = { "-1": "#f0fdf4", "0": "#f9fafb", "1": "#f0fdf4", "2": "#fff7ed", "3": "#fef2f2", "4": "#450a0a" };

  /* Political risk is scored 1–5, not 0–4 — see the scoring_model block in
     data/political_risk.json: "clamp(1, 5, round(1.0 + Σ(signal_weight)))".
     Indexing a 0-based array with it mislabelled every county and left score 5
     (the highest risk) rendering as "Unknown". Keyed by score, and each record
     also carries its own score_label, which we prefer when present. */
  const RISK_LABELS = { 1: "Low", 2: "Moderate", 3: "Elevated", 4: "High", 5: "Very High" };
  const RISK_COLORS = { 1: "#16a34a", 2: "#d97706", 3: "#ea580c", 4: "#dc2626", 5: "#7f1d1d" };
  const RISK_MAX    = 5;

  /* Labels are the dataset's own scale, verbatim from the _scale field in
     data/water_stress.json ("0=Low, 1=Low-Medium, ..."). The previous list
     called level 0 "No Stress", which asserts more than the source does. */
  const WATER_LABELS = ["Low", "Low-Medium", "Medium-High", "High", "Extremely High"];
  const WATER_COLORS = ["#16a34a", "#65a30d", "#d97706", "#dc2626", "#7f1d1d"];

  /* Provenance of a facility record, not a quality score — a bare "5" reads as
     better than "2" when it means the opposite. Mirrors SOURCE_TIER_LABELS in
     data/run_quality_report.py. */
  const FACILITY_TIER_LABELS = {
    1: "Company official",
    2: "Hand-curated",
    3: "OpenStreetMap",
    4: "Permit / filing",
    5: "News — unverified",
  };

  const TYPE_LABELS = {
    data_center: "Data Center Restriction",
    ai:          "AI Regulation",
    energy:      "Energy / Grid Requirement",
    crypto:      "Crypto / HPC Moratorium",
    water:       "Water Use Restriction",
  };

  /* ── Public entry point ── */
  async function generate(fips, name, state, countyData) {
    const padded     = String(fips).padStart(5, "0");
    const risk       = (window.DC_RISK_BY_FIPS || {})[padded];
    // DC_WATER_STRESS is a 79-county sample used by the map's demo layer;
    // DC_WATER_STRESS_FULL is the real 1,988-county dataset that every other
    // module reads. Reading the sample reported the wrong level for most
    // counties (Loudoun came back 0 against a real value of 2).
    const wsRaw      = window.DC_WATER_STRESS_FULL || window.DC_WATER_STRESS || {};
    const waterLevel = wsRaw[padded] ?? wsRaw[fips] ?? null;
    const incentives = (window.DC_INCENTIVES_FIPS || {})[padded] || [];
    let facilities   = [];
    if (window.PIPELINE) {
      try { facilities = await window.PIPELINE.getByFips(fips); } catch (_) {}
    }

    // Economic context: population, income, labor, housing, broadband, each
    // shown with national/state percentile rank rather than a bare number, so
    // "median income $58,200" reads as "34th percentile nationally" — the
    // comparison a site-selection reader actually needs. Loaded lazily here
    // (not at page load) since census_county.json is several MB; ECONOMY
    // caches it, so a second report in the same session is instant.
    let econ = null;
    if (window.ECONOMY) {
      try {
        const E = window.ECONOMY;
        const { county, state: stateData, meta } = await E.loadRegional();
        if (E.hasCounty(county)) {
          const metrics = E.EXPLORER_METRICS.map(key => ({
            key,
            def: E.METRICS[key],
            cmp: E.comparisons(county, stateData, padded, key, "value"),
          })).filter(m => m.cmp.value !== null);
          const signals = E.countySignals(county, padded);
          // Supplementary, a distinct measurement from anything in `metrics`
          // above (a county permit count with no ACS equivalent) -- kept as
          // its own field rather than folded into `metrics` so the report
          // never implies it's the same kind of figure.
          const rec = (county.counties || {})[padded];
          const buildingPermits = rec && rec.building_permits;
          if (metrics.length || signals.length || buildingPermits) {
            econ = { metrics, signals, buildingPermits,
                     vintage: meta && meta.acs_vintage };
          }
        }
      } catch (_) { /* Economic data is supplementary — never block the report on it. */ }
    }

    const html = _buildHtml(fips, name, state, countyData, { risk, waterLevel, incentives, facilities, econ });
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank", "noopener");
    if (!win) {
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `dc-report-${padded}-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* Percentile rank as a phrase, not a bare number — "34th percentile" reads
     ambiguously (of what? better how?) without saying which direction is
     favorable for the metric in question. */
  function _percentilePhrase(pct, good) {
    if (pct === null || pct === undefined) return null;
    const ord = pct % 10 === 1 && pct !== 11 ? "st"
      : pct % 10 === 2 && pct !== 12 ? "nd"
      : pct % 10 === 3 && pct !== 13 ? "rd" : "th";
    if (good === "neutral") return `${pct}${ord} percentile`;
    const favorable = good === "up" ? pct >= 50 : pct <= 50;
    return `${pct}${ord} percentile${favorable ? " (favorable)" : ""}`;
  }

  function _econSection(econ) {
    if (!econ) {
      return `
        <section class="section">
          <h2 class="section-title">Economic Context</h2>
          <p class="empty-note">Economic data has not yet been measured for this county, or the pipeline has not run. This is distinct from a value of zero — no economic claim is being made either way.</p>
        </section>`;
    }
    const E = window.ECONOMY;
    const rows = econ.metrics.map(({ key, def, cmp }) => {
      const valueStr = E.fmtValue(cmp.value, def.unit, def.dec);
      const usPhrase = _percentilePhrase(cmp.percentile, def.good);
      const stPhrase = _percentilePhrase(cmp.state_percentile, def.good);
      const context = [
        usPhrase ? `US: ${usPhrase}` : (cmp.us_median != null ? `US median: ${E.fmtValue(cmp.us_median, def.unit, def.dec)}` : null),
        stPhrase ? `State: ${stPhrase}` : null,
      ].filter(Boolean).join(" · ");
      return `<tr>
        <th>${_esc(def.label)}</th>
        <td>${_esc(valueStr)}</td>
        <td class="note">${_esc(context || "Insufficient peer data for a percentile")}</td>
      </tr>`;
    }).join("");

    const signalsHtml = econ.signals.length
      ? `<h3 class="sub-title">Infrastructure-Relevant Signals (${econ.signals.length})</h3>
         <ul class="signal-list">${econ.signals.map(s => `
           <li>
             <div class="signal-head">${_esc(s.title)}</div>
             <div class="signal-desc">${_esc(s.text)}</div>
           </li>`).join("")}</ul>`
      : "";

    // A distinct measurement from anything in the metrics table above, so
    // rendered as its own labelled row rather than mixed into that table —
    // a reader should never mistake a raw permit count for a table metric
    // with a percentile.
    const bp = econ.buildingPermits;
    const supplementaryHtml = bp ? `
      <table class="kv-table" style="margin-top:8px">
        <tbody>
          <tr><th>Building permits issued</th><td>${_esc(E.fmtValue(bp.value, "count", 0))}${
            bp.change_yoy_pct == null ? "" : ` (${_esc(E.fmtPct(bp.change_yoy_pct))} YoY)`
          } <span class="note">(Census BPS via FRED, as of ${_esc(E.fmtDate(bp.as_of))})</span></td></tr>
        </tbody>
      </table>` : "";

    return `
      <section class="section">
        <h2 class="section-title">Economic Context</h2>
        <table class="kv-table" style="width:100%">
          <thead><tr><th>Metric</th><th>Value</th><th>Percentile context</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${supplementaryHtml}
        ${signalsHtml}
        <p class="note" style="margin-top:8px">Source: U.S. Census Bureau ACS 5-Year Estimates${econ.vintage ? ` (${_esc(String(econ.vintage))})` : ""}, Population Estimates Program, Building Permits Survey, and Federal Reserve Economic Data (FRED). Percentiles are computed against all US counties with data for that metric (minimum 20-county sample) and are descriptive, not predictive. Not investment advice.</p>
      </section>`;
  }

  /* ── Build the full HTML document ── */
  function _buildHtml(fips, name, state, county, { risk, waterLevel, incentives, facilities, econ }) {
    const date     = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const padded   = String(fips).padStart(5, "0");
    const level    = county ? String(county.level) : "0";
    const sevLabel = SEV_LABELS[level] || "Unknown";
    const sevColor = SEV_COLORS[level] || "#6b7280";
    const sevBg    = SEV_BG[level]    || "#f9fafb";
    const types    = county?.types    || [];

    const riskScore  = risk?.risk_score  ?? null;
    const riskLabel  = riskScore != null
      ? (risk.score_label || RISK_LABELS[riskScore] || "Unrated")
      : "Not scored";
    const riskColor  = riskScore != null ? (RISK_COLORS[riskScore] || "#9ca3af") : "#9ca3af";
    const riskSummary = risk?.evidence_summary || "";
    const riskConf    = risk?.confidence || "";

    const waterIdx   = waterLevel != null ? Math.min(Math.max(waterLevel, 0), 4) : null;
    const waterLabel = waterIdx != null ? WATER_LABELS[waterIdx] : "No Data";
    const waterColor = waterIdx != null ? WATER_COLORS[waterIdx] : "#9ca3af";

    const facilitiesHtml = facilities.length
      ? `<table class="data-table">
           <thead><tr><th>Project Name</th><th>Operator</th><th>Status</th><th>Capacity</th><th>Source Type</th></tr></thead>
           <tbody>${facilities.slice(0, 25).map(f => `
             <tr>
               <td>${_esc(f.name)}</td>
               <td>${_esc(f.operator || f.owner || "—")}</td>
               <td>${_esc(f.operational_status || "—")}</td>
               <td>${f.capacity_mw_known != null ? _esc(String(f.capacity_mw_known)) + " MW" : "—"}</td>
               <td>${_esc(_facilityTier(f.confidence_tier))}</td>
             </tr>`).join("")}
           </tbody>
         </table>
         ${facilities.length > 25 ? `<p class="note">${facilities.length - 25} additional projects not shown.</p>` : ""}`
      : `<p class="empty-note">No tracked data center projects found in this county.</p>`;

    const incentivesHtml = incentives.length
      ? incentives.slice(0, 10).map(p => `
          <div class="incentive-row">
            <div class="incentive-row-name">${_esc(p.program_name)}</div>
            <div class="incentive-row-meta">
              <span class="tag">${_esc(p.incentive_type || "")}</span>
              ${p.min_investment_m ? `<span class="tag tag-gray">Min. $${_esc(String(p.min_investment_m))}M</span>` : ""}
            </div>
            ${p.notes ? `<div class="incentive-row-notes">${_esc(p.notes)}</div>` : ""}
          </div>`).join("")
      : `<p class="empty-note">No tracked tax incentive programs for this county.</p>`;

    /* The field names here are the ones map_data.json actually uses. The
       previous version read county.summary / county.descriptions /
       county.source_url — none of which exist — so every report silently
       shipped without the policy text, its dates, or a single citation, on a
       platform whose central claim is primary-source verification. */
    const policyDetails = county ? (() => {
      const sources = (county.sources || [])
        .map(s => (typeof s === "string" ? { label: s, url: s } : (s || {})))
        .filter(s => s.label || s.url);
      const meta = [
        county.status         ? ["Status",        _titleCase(county.status)] : null,
        county.effective_date ? ["Effective",     _fmtDate(county.effective_date)] : null,
        county.lifecycle_stage? ["Stage",         _titleCase(county.lifecycle_stage)] : null,
        county.confidence     ? ["Record confidence", _titleCase(county.confidence)] : null,
        county.last_reviewed  ? ["Last reviewed", _fmtDate(county.last_reviewed)] : null,
      ].filter(Boolean);

      return `
        <section class="section">
          <h2 class="section-title">Policy Details</h2>
          ${county.title ? `<p class="policy-title">${_esc(county.title)}</p>` : ""}
          ${types.length ? `<p><strong>Restriction Types:</strong> ${types.map(t => TYPE_LABELS[t] || t).map(_esc).join(", ")}</p>` : ""}
          ${county.description ? `<p>${_esc(county.description)}</p>` : ""}
          ${county.notes ? `<p><strong>Notes:</strong> ${_esc(county.notes)}</p>` : ""}
          ${meta.length ? `<table class="kv-table"><tbody>${meta.map(([k, v]) =>
            `<tr><th>${_esc(k)}</th><td>${_esc(v)}</td></tr>`).join("")}</tbody></table>` : ""}
          <h3 class="sub-title">Primary Sources (${sources.length})</h3>
          ${sources.length
            ? `<ol class="source-list">${sources.map(s => `<li>${
                s.url
                  ? `<a href="${_esc(s.url)}" class="source-link" target="_blank" rel="noopener noreferrer">${_esc(s.label || s.url)}</a>
                     <div class="source-url">${_esc(s.url)}</div>`
                  : _esc(s.label)
              }</li>`).join("")}</ol>`
            : `<p class="empty-note">No source citation is recorded for this county. Treat the policy details above as unverified.</p>`}
        </section>`;
    })() : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Due-Diligence Report — ${_esc(name || "County")}, ${_esc(state || "")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: letter; margin: 0.75in; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.55;
      color: #111827;
      background: #fff;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 40px 60px;
    }
    /* ── Report header ── */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #1e40af;
      margin-bottom: 28px;
    }
    .report-brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1e40af;
    }
    .report-meta {
      font-size: 11px;
      color: #6b7280;
      text-align: right;
    }
    .report-title-block { margin-bottom: 28px; }
    .report-county {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }
    .report-county span { color: #6b7280; font-weight: 400; }
    .report-fips { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    /* ── Executive summary card ── */
    .exec-summary {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 32px;
    }
    .summary-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .summary-card-label { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
    .summary-card-value { font-size: 15px; font-weight: 700; }
    .summary-card-sub   { font-size: 11px; color: #6b7280; margin-top: 3px; }
    /* ── Sections ── */
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #374151;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 14px;
    }
    .section p { margin-bottom: 8px; }
    /* ── Status badge ── */
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
    }
    /* ── Risk indicators ── */
    .risk-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .risk-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
    .risk-item-label { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px; }
    .risk-item-value { font-size: 14px; font-weight: 700; }
    .risk-item-note  { font-size: 11px; color: #6b7280; margin-top: 4px; }
    /* ── Tables ── */
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .data-table th { background: #f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; padding: 7px 10px; text-align: left; border: 1px solid #e5e7eb; }
    .data-table td { padding: 7px 10px; border: 1px solid #e5e7eb; font-size: 12px; vertical-align: top; }
    .data-table tr:nth-child(even) td { background: #f9fafb; }
    /* ── Incentive rows ── */
    .incentive-row { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .incentive-row:last-child { border-bottom: none; }
    .incentive-row-name  { font-weight: 600; font-size: 12.5px; margin-bottom: 4px; }
    .incentive-row-meta  { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
    .incentive-row-notes { font-size: 11px; color: #6b7280; }
    .tag { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 600; background: #dbeafe; color: #1d4ed8; }
    .tag-gray { background: #f3f4f6; color: #6b7280; }
    /* ── Policy list ── */
    .policy-list { margin: 8px 0 8px 20px; }
    .policy-list li { margin-bottom: 4px; }
    .policy-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 6px; }
    .sub-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; color: #6b7280;
      margin: 16px 0 8px;
    }
    /* ── Key/value metadata ── */
    .kv-table { border-collapse: collapse; margin: 10px 0; }
    .kv-table th {
      text-align: left; font-size: 11px; font-weight: 700; color: #6b7280;
      padding: 3px 14px 3px 0; white-space: nowrap; vertical-align: top;
    }
    .kv-table td { font-size: 12px; padding: 3px 0; }
    /* ── Citations ── */
    .source-list { margin: 4px 0 4px 20px; }
    .source-list li { margin-bottom: 8px; }
    .source-url {
      font-size: 10px; color: #9ca3af; word-break: break-all; line-height: 1.4;
    }
    /* ── Risk signals ── */
    .signal-list { list-style: none; margin: 4px 0; }
    .signal-list li {
      padding: 8px 0 8px 12px;
      border-left: 2px solid #e5e7eb;
      margin-bottom: 6px;
    }
    .signal-head {
      font-size: 12.5px; font-weight: 600; color: #111827;
      display: flex; justify-content: space-between; gap: 10px; align-items: baseline;
    }
    .signal-date { font-size: 10.5px; font-weight: 400; color: #9ca3af; white-space: nowrap; }
    .signal-desc { font-size: 11.5px; color: #4b5563; margin-top: 2px; }
    .signal-src  { font-size: 10px; margin-top: 3px; word-break: break-all; }
    /* ── Source link ── */
    .source-link { color: #1d4ed8; }
    /* ── Notes ── */
    .note       { font-size: 11px; color: #6b7280; }
    .empty-note { font-size: 12px; color: #9ca3af; font-style: italic; }
    /* ── Disclaimer ── */
    .disclaimer {
      margin-top: 40px;
      padding: 14px 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 11px;
      color: #6b7280;
      line-height: 1.5;
    }
    /* ── Print ── */
    @media print {
      body { padding: 0; }
      .exec-summary { grid-template-columns: repeat(3, 1fr); }
      .risk-grid    { grid-template-columns: 1fr 1fr; }
      .no-print     { display: none !important; }
    }
    /* ── Print button (screen only) ── */
    .print-btn {
      position: fixed;
      top: 20px; right: 20px;
      padding: 8px 14px;
      background: #1d4ed8;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .print-btn:hover { background: #1e40af; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="report-header">
    <div class="report-brand">US Data Center &amp; AI Policy Tracker</div>
    <div class="report-meta">
      <div>County Due-Diligence Report</div>
      <div>Generated: ${_esc(date)}</div>
      <div>FIPS: ${_esc(padded)}</div>
    </div>
  </div>

  <div class="report-title-block">
    <div class="report-county">${_esc(name || "County")} <span>${_esc(state || "")}</span></div>
    <div class="report-fips">County FIPS: ${_esc(padded)} &nbsp;·&nbsp; Report date: ${_esc(date)}</div>
  </div>

  <div class="exec-summary">
    <div class="summary-card">
      <div class="summary-card-label">Regulatory Status</div>
      <div class="summary-card-value"><span class="status-badge" style="background:${_esc(sevColor)}">${_esc(sevLabel)}</span></div>
      <div class="summary-card-sub">Level ${_esc(level)} restriction</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Political Risk</div>
      <div class="summary-card-value" style="color:${_esc(riskColor)}">${_esc(riskLabel)}</div>
      <div class="summary-card-sub">${riskScore != null ? "Score: " + _esc(String(riskScore)) + " / " + RISK_MAX : "No documented signals — not scored"}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Water Stress</div>
      <div class="summary-card-value" style="color:${_esc(waterColor)}">${_esc(waterLabel)}</div>
      <div class="summary-card-sub">${waterIdx != null ? "Level " + _esc(String(waterIdx)) + " / 4" : "Insufficient data"}</div>
    </div>
  </div>

  ${policyDetails}

  ${_econSection(econ)}

  <section class="section">
    <h2 class="section-title">Site Risk Factors</h2>
    <div class="risk-grid">
      <div class="risk-item">
        <div class="risk-item-label">Political Risk</div>
        <div class="risk-item-value" style="color:${_esc(riskColor)}">${_esc(riskLabel)}</div>
        <div class="risk-item-note">${riskScore != null
          ? `Score ${_esc(String(riskScore))} of ${RISK_MAX}${riskConf ? ` · ${_esc(_titleCase(riskConf))} confidence` : ""}`
          : "No political-risk signals are documented for this county, so it is not scored. Absence of a score is not evidence of low risk."}</div>
        ${riskSummary ? `<div class="risk-item-note">${_esc(riskSummary)}</div>` : ""}
      </div>
      <div class="risk-item">
        <div class="risk-item-label">Water Stress</div>
        <div class="risk-item-value" style="color:${_esc(waterColor)}">${_esc(waterLabel)}</div>
        <!-- Attribution matches the _sources/_disclaimer in data/water_stress.json.
             This was previously credited solely to a "USGS Water Supply Stress
             Index", which is not what the dataset is. -->
        <div class="risk-item-note">${waterIdx != null
          ? "Index: " + _esc(String(waterIdx)) + " / 4 — approximate, derived from WRI Aqueduct, USGS water-use reports and EPA drought indicators. County-level granularity is estimated."
          : "No water stress data available for this county."}</div>
      </div>
    </div>
    ${risk?.signals?.length ? `
    <div class="section">
      <h3 class="sub-title">Documented Risk Signals (${risk.signals.length})</h3>
      <ul class="signal-list">${risk.signals.map(_signalItem).join("")}</ul>
    </div>` : ""}
  </section>

  <section class="section">
    <h2 class="section-title">Tax Incentive Programs (${incentives.length})</h2>
    ${incentivesHtml}
    ${incentives.length ? `<p class="note" style="margin-top:8px">⚠ Incentive data is estimated. Verify eligibility requirements with the relevant state/county authority before relying on this data.</p>` : ""}
  </section>

  <section class="section">
    <h2 class="section-title">Known Data Center Projects in County (${facilities.length})</h2>
    ${facilitiesHtml}
    ${facilities.length ? `<p class="note" style="margin-top:8px">Source: US DC &amp; AI Policy Tracker facilities_master dataset. Capacity figures represent known MW only; actual deployed capacity may differ.</p>` : ""}
  </section>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is generated automatically from the US Data Center &amp; AI Policy Tracker dataset and is intended for research and informational purposes only. Policy information may be incomplete, outdated, or inaccurate. Incentive data is estimated and not verified with official sources. Infrastructure data is sourced from public records and may not reflect current conditions. This is not legal, financial, or investment advice. Always consult primary government sources and qualified legal counsel before making decisions based on this report. Market and policy data are subject to change without notice.
  </div>
</body>
</html>`;
  }

  /* Signals are objects — {type, label, description, detected_date,
     source_url} — so passing one to _esc() printed "[object Object]" in every
     report. Each one carries its own citation, which belongs in the output. */
  function _signalItem(sig) {
    if (sig == null) return "";
    if (typeof sig === "string") return `<li>${_esc(sig)}</li>`;
    const title = sig.label || _titleCase(String(sig.type || "").replace(/_/g, " ")) || "Signal";
    const when  = sig.detected_date ? _fmtDate(sig.detected_date) : "";
    return `<li>
      <div class="signal-head">${_esc(title)}${when ? `<span class="signal-date">${_esc(when)}</span>` : ""}</div>
      ${sig.description ? `<div class="signal-desc">${_esc(sig.description)}</div>` : ""}
      ${sig.source_url ? `<div class="signal-src"><a href="${_esc(sig.source_url)}" class="source-link" target="_blank" rel="noopener noreferrer">${_esc(sig.source_url)}</a></div>` : ""}
    </li>`;
  }

  function _facilityTier(tier) {
    if (tier == null || tier === "") return "—";
    return FACILITY_TIER_LABELS[Number(tier)] || String(tier);
  }

  function _titleCase(s) {
    return String(s || "").replace(/\b[a-z]/g, ch => ch.toUpperCase());
  }

  /* Dates in the dataset are ISO yyyy-mm-dd. Parsing them with new Date()
     treats them as UTC and can render the previous day in western timezones,
     so format the parts directly. */
  function _fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return String(iso || "");
    const MONTHS = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
    return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  }

  function _esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { generate };
})();
