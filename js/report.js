/* ── Due-Diligence Report Generator ── */
/* Generates a printable HTML report for a county and opens it in a new tab. */
window.REPORT = (function () {

  const SEV_LABELS = { "-1": "Pro-Business Hub", "0": "No Known Restriction", "1": "Light Regulations", "2": "Moderate Restrictions", "3": "Significant Restrictions", "4": "Ban / Moratorium" };
  const SEV_COLORS = { "-1": "#16a34a", "0": "#6b7280", "1": "#15803d", "2": "#c2410c", "3": "#b91c1c", "4": "#7f1d1d" };
  const SEV_BG     = { "-1": "#f0fdf4", "0": "#f9fafb", "1": "#f0fdf4", "2": "#fff7ed", "3": "#fef2f2", "4": "#450a0a" };

  const RISK_LABELS = ["No Data", "Low", "Moderate", "Elevated", "High"];
  const RISK_COLORS = ["#9ca3af", "#16a34a", "#d97706", "#dc2626", "#7f1d1d"];

  const WATER_LABELS = ["No Stress", "Low Stress", "Moderate Stress", "High Stress", "Very High Stress"];
  const WATER_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7f1d1d"];

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
    const wsRaw      = window.DC_WATER_STRESS || {};
    const waterLevel = wsRaw[padded] ?? wsRaw[fips] ?? null;
    const incentives = (window.DC_INCENTIVES_FIPS || {})[padded] || [];
    let facilities   = [];
    if (window.PIPELINE) {
      try { facilities = await window.PIPELINE.getByFips(fips); } catch (_) {}
    }

    const html = _buildHtml(fips, name, state, countyData, { risk, waterLevel, incentives, facilities });
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

  /* ── Build the full HTML document ── */
  function _buildHtml(fips, name, state, county, { risk, waterLevel, incentives, facilities }) {
    const date     = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const padded   = String(fips).padStart(5, "0");
    const level    = county ? String(county.level) : "0";
    const sevLabel = SEV_LABELS[level] || "Unknown";
    const sevColor = SEV_COLORS[level] || "#6b7280";
    const sevBg    = SEV_BG[level]    || "#f9fafb";
    const types    = county?.types    || [];

    const riskScore  = risk?.risk_score  ?? null;
    const riskLabel  = riskScore != null ? (RISK_LABELS[riskScore] || "Unknown") : "No Data";
    const riskColor  = riskScore != null ? (RISK_COLORS[riskScore] || "#9ca3af") : "#9ca3af";
    const riskSummary = risk?.evidence_summary || "";

    const waterIdx   = waterLevel != null ? Math.min(waterLevel, 4) : null;
    const waterLabel = waterIdx != null ? WATER_LABELS[waterIdx] : "No Data";
    const waterColor = waterIdx != null ? WATER_COLORS[waterIdx] : "#9ca3af";

    const facilitiesHtml = facilities.length
      ? `<table class="data-table">
           <thead><tr><th>Project Name</th><th>Operator</th><th>Status</th><th>Capacity</th><th>Confidence</th></tr></thead>
           <tbody>${facilities.slice(0, 25).map(f => `
             <tr>
               <td>${_esc(f.name)}</td>
               <td>${_esc(f.operator || f.owner || "—")}</td>
               <td>${_esc(f.operational_status || "—")}</td>
               <td>${f.capacity_mw_known != null ? _esc(String(f.capacity_mw_known)) + " MW" : "—"}</td>
               <td>${_esc(f.confidence_tier || "—")}</td>
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

    const policyDetails = county ? (() => {
      const descs = county.descriptions || [];
      return `
        <section class="section">
          <h2 class="section-title">Policy Details</h2>
          ${types.length ? `<p><strong>Restriction Types:</strong> ${types.map(t => TYPE_LABELS[t] || t).map(_esc).join(", ")}</p>` : ""}
          ${county.summary  ? `<p><strong>Summary:</strong> ${_esc(county.summary)}</p>` : ""}
          ${descs.length
            ? `<ul class="policy-list">${descs.map(d => `<li>${_esc(d)}</li>`).join("")}</ul>`
            : ""}
          ${county.source_url ? `<p><a href="${_esc(county.source_url)}" class="source-link" target="_blank" rel="noopener noreferrer">View primary source →</a></p>` : ""}
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
      <div class="summary-card-sub">${riskScore != null ? "Score: " + _esc(String(riskScore)) + " / 4" : "Insufficient data"}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Water Stress</div>
      <div class="summary-card-value" style="color:${_esc(waterColor)}">${_esc(waterLabel)}</div>
      <div class="summary-card-sub">${waterIdx != null ? "Level " + _esc(String(waterIdx)) + " / 4" : "Insufficient data"}</div>
    </div>
  </div>

  ${policyDetails}

  <section class="section">
    <h2 class="section-title">Site Risk Factors</h2>
    <div class="risk-grid">
      <div class="risk-item">
        <div class="risk-item-label">Political Risk</div>
        <div class="risk-item-value" style="color:${_esc(riskColor)}">${_esc(riskLabel)}</div>
        ${riskSummary ? `<div class="risk-item-note">${_esc(riskSummary)}</div>` : ""}
      </div>
      <div class="risk-item">
        <div class="risk-item-label">Water Stress</div>
        <div class="risk-item-value" style="color:${_esc(waterColor)}">${_esc(waterLabel)}</div>
        <div class="risk-item-note">${waterIdx != null ? "Index: " + _esc(String(waterIdx)) + " / 4 (USGS Water Supply Stress Index)" : "No water stress data available for this county."}</div>
      </div>
    </div>
    ${risk?.signals?.length ? `
    <div class="section">
      <strong>Risk Signals:</strong>
      <ul class="policy-list">${(risk.signals || []).map(sig => `<li>${_esc(sig)}</li>`).join("")}</ul>
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
