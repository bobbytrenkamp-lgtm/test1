/* js/parcel/report.js
 * Parcel Intelligence Report Builder — generates a printable/shareable
 * HTML report for a parcel, including feasibility, buildable envelope,
 * valuation, and market context.
 *
 * window.PARCEL_REPORT.open(feature, jurisdictionId) — opens report in new tab
 * window.PARCEL_REPORT.html(feature, jurisdictionId) → HTML string
 *
 * The report is entirely self-contained HTML with inline styles so it
 * renders correctly when printed (no external dependencies).
 *
 * Depends on: PARCEL_SCHEMA, PARCEL_FEASIBILITY (optional), PARCEL_REGISTRY
 */
window.PARCEL_REPORT = (function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(fieldId, value) {
    return esc(window.PARCEL_SCHEMA?.format(fieldId, value) ?? (value == null ? '—' : String(value)));
  }

  function fmtCurrency(v) {
    const n = Number(v);
    if (!n) return '—';
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  /* ── Inline styles for the report document ── */
  const REPORT_CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
      background: #f8fafc;
      padding: 24px;
    }
    .report-page {
      max-width: 780px;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.10);
      overflow: hidden;
    }
    .report-header {
      background: #0f172a;
      color: #fff;
      padding: 24px 28px 20px;
    }
    .report-eyebrow {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #4874e8;
      margin-bottom: 6px;
    }
    .report-title {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 6px;
      color: #fff;
    }
    .report-subtitle {
      font-size: 13px;
      color: #94a3b8;
    }
    .report-meta {
      display: flex;
      gap: 16px;
      margin-top: 14px;
      flex-wrap: wrap;
    }
    .report-meta-item {
      font-size: 11px;
      color: #64748b;
    }
    .report-meta-item strong { color: #cbd5e1; }
    .report-body { padding: 24px 28px; }
    .report-section { margin-bottom: 24px; }
    .report-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #4874e8;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 12px;
    }
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }
    .report-field {}
    .report-field-label {
      font-size: 10.5px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .report-field-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    /* Feasibility block */
    .report-feas {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e2e8f0;
    }
    .report-feas-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 14px;
    }
    .feas-eligible   { background: #d1fae5; color: #065f46; }
    .feas-conditional{ background: #fef3c7; color: #92400e; }
    .feas-prohibited { background: #fee2e2; color: #991b1b; }
    .feas-unknown    { background: #f1f5f9; color: #475569; }
    .report-score-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .report-score-num {
      font-size: 40px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
      min-width: 60px;
    }
    .report-score-bar-wrap {
      flex: 1;
    }
    .report-score-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }
    .report-score-bar-bg {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .report-score-bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .score-high { background: #10b981; }
    .score-mid  { background: #f59e0b; }
    .score-low  { background: #ef4444; }
    .report-factors {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .report-factor {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      padding: 4px 8px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .report-factor-label { color: #475569; }
    .report-factor-score { font-weight: 700; color: #0f172a; }
    /* Envelope */
    .report-envelope-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 10px;
    }
    .report-env-stat {
      text-align: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 8px;
    }
    .report-env-val {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .report-env-lbl {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    /* Conditions */
    .report-conditions-list {
      margin: 0;
      padding-left: 16px;
      color: #334155;
    }
    .report-conditions-list li { margin-bottom: 4px; line-height: 1.45; }
    /* Disclaimer */
    .report-disclaimer {
      background: #fef9c3;
      border: 1px solid #fde047;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 11px;
      color: #713f12;
      line-height: 1.5;
    }
    /* Footer */
    .report-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 12px 28px;
      font-size: 10.5px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .report-page { box-shadow: none; border-radius: 0; }
    }
  `;

  /* ── Build HTML report ── */
  function html(feature, jurisdictionId) {
    const props = feature.properties || {};
    const schema = window.PARCEL_SCHEMA;
    const fips   = props.county_fips;
    const f      = window.PARCEL_FEASIBILITY?.assess(props, fips);
    const regCfg = jurisdictionId ? window.PARCEL_REGISTRY?.all().find(j => j.id === jurisdictionId) : null;

    const address  = props.address || props.pin || props.parcel_id || 'Parcel';
    const owner    = props.owner || '';
    const jurisName = regCfg?.name || (f?.jurisdictionName ?? 'Unknown Jurisdiction');
    const genDate  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Feasibility badge class
    const feasBadgeCls = (() => {
      if (!f?.available) return 'feas-unknown';
      const s = f.permissionStatus;
      if (s === 'permitted_by_right' || s === 'permitted_with_limitations') return 'feas-eligible';
      if (s === 'prohibited') return 'feas-prohibited';
      if (s === 'unknown' || s === 'not_listed') return 'feas-unknown';
      return 'feas-conditional';
    })();

    // Score bar class
    const scoreCls = (!f?.available) ? '' : f.score >= 75 ? 'score-high' : f.score >= 45 ? 'score-mid' : 'score-low';

    // Build section HTML helpers
    function fieldRow(id, value) {
      const field = schema?.FIELD_MAP[id];
      if (!field) return '';
      const displayed = schema.format(id, value);
      if (!displayed || displayed === '—') return '';
      return `<div class="report-field">
        <div class="report-field-label">${esc(field.label)}</div>
        <div class="report-field-value">${esc(displayed)}</div>
      </div>`;
    }

    // Identity fields
    const identityFields = [
      fieldRow('pin', props.pin),
      fieldRow('address', props.address),
      fieldRow('owner', props.owner),
      fieldRow('county_fips', props.county_fips),
      fieldRow('subdivision', props.subdivision),
    ].filter(Boolean).join('');

    // Physical
    const physicalFields = [
      fieldRow('area_acres', props.area_acres),
      fieldRow('area_sqft', props.area_sqft),
      fieldRow('year_built', props.year_built),
      fieldRow('building_count', props.building_count),
      fieldRow('gross_floor_area', props.gross_floor_area),
    ].filter(Boolean).join('');

    // Zoning
    const zoningFields = [
      fieldRow('zoning_code', props.zoning_code),
      fieldRow('zoning_desc', props.zoning_desc),
      fieldRow('land_use_code', props.land_use_code),
      fieldRow('land_use_desc', props.land_use_desc),
    ].filter(Boolean).join('');

    // Valuation
    const valuationFields = [
      fieldRow('assessed_value', props.assessed_value),
      fieldRow('land_value', props.land_value),
      fieldRow('improvement_value', props.improvement_value),
      fieldRow('last_sale_price', props.last_sale_price),
      fieldRow('last_sale_date', props.last_sale_date),
      fieldRow('tax_year', props.tax_year),
    ].filter(Boolean).join('');

    // Feasibility section
    let feasHtml = '';
    if (f?.available) {
      const condHtml = f.conditions?.length
        ? `<ul class="report-conditions-list">${f.conditions.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`
        : '';

      const envHtml = (() => {
        const e = f.envelope;
        if (!e) return '';
        const stats = [
          e.footprintAcres  != null ? `<div class="report-env-stat"><div class="report-env-val">${Number(e.footprintAcres).toFixed(2)} ac</div><div class="report-env-lbl">Max Footprint</div></div>` : '',
          e.maxCoverage_pct != null ? `<div class="report-env-stat"><div class="report-env-val">${e.maxCoverage_pct}%</div><div class="report-env-lbl">Lot Coverage</div></div>` : '',
          e.maxHeight_ft    != null ? `<div class="report-env-stat"><div class="report-env-val">${e.maxHeight_ft} ft</div><div class="report-env-lbl">Max Height</div></div>` : '',
          e.estimatedGFA_sqft != null ? `<div class="report-env-stat"><div class="report-env-val">${(e.estimatedGFA_sqft/1000).toFixed(0)}k sqft</div><div class="report-env-lbl">Est. GFA</div></div>` : '',
        ].filter(Boolean).join('');
        if (!stats) return '';
        return `<div class="report-section">
          <div class="report-section-title">Buildable Envelope (Estimated)</div>
          <div class="report-envelope-grid">${stats}</div>
          ${e.setbacks?.front != null ? `<p style="margin-top:8px;font-size:11px;color:#64748b">Setbacks — Front: ${e.setbacks.front} ft · Side: ${e.setbacks.side ?? '—'} ft · Rear: ${e.setbacks.rear ?? '—'} ft</p>` : ''}
        </div>`;
      })();

      feasHtml = `<div class="report-section">
        <div class="report-section-title">DC Development Feasibility</div>
        <div class="report-feas">
          <div class="report-feas-badge ${feasBadgeCls}">
            ${esc(f.statusMeta.icon)} ${esc(f.statusMeta.label)}
          </div>
          <div class="report-score-wrap">
            <div class="report-score-num">${f.score}</div>
            <div class="report-score-bar-wrap">
              <div class="report-score-label">Development Potential Score</div>
              <div class="report-score-bar-bg">
                <div class="report-score-bar-fill ${scoreCls}" style="width:${f.score}%"></div>
              </div>
            </div>
          </div>
          <div class="report-factors">
            ${f.factors.map(fac => `<div class="report-factor">
              <span class="report-factor-label">${esc(fac.label)}</span>
              <span class="report-factor-score">${fac.score}</span>
            </div>`).join('')}
          </div>
          ${f.approvalType ? `<p style="margin-top:12px;font-size:12px"><strong>Approval required:</strong> ${esc(f.approvalType)}</p>` : ''}
          ${condHtml ? `<div style="margin-top:10px">${condHtml}</div>` : ''}
          ${f.dcSummary ? `<p style="margin-top:10px;font-size:12px;color:#475569;font-style:italic">${esc(f.dcSummary)}</p>` : ''}
        </div>
      </div>
      ${envHtml}`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Parcel Report — ${esc(address)}</title>
  <style>${REPORT_CSS}</style>
</head>
<body>
<div class="report-page">
  <div class="report-header">
    <div class="report-eyebrow">Parcel Intelligence Report</div>
    <div class="report-title">${esc(address)}</div>
    ${owner ? `<div class="report-subtitle">${esc(owner)}</div>` : ''}
    <div class="report-meta">
      <div class="report-meta-item"><strong>Jurisdiction</strong> ${esc(jurisName)}</div>
      ${props.zoning_code ? `<div class="report-meta-item"><strong>Zoning</strong> ${esc(props.zoning_code)}</div>` : ''}
      ${props.area_acres  ? `<div class="report-meta-item"><strong>Area</strong> ${Number(props.area_acres).toFixed(3)} ac</div>` : ''}
      <div class="report-meta-item"><strong>Generated</strong> ${esc(genDate)}</div>
    </div>
  </div>

  <div class="report-body">
    ${feasHtml}

    ${identityFields ? `<div class="report-section">
      <div class="report-section-title">Identification</div>
      <div class="report-grid">${identityFields}</div>
    </div>` : ''}

    ${zoningFields ? `<div class="report-section">
      <div class="report-section-title">Zoning &amp; Land Use</div>
      <div class="report-grid">${zoningFields}</div>
    </div>` : ''}

    ${physicalFields ? `<div class="report-section">
      <div class="report-section-title">Physical Characteristics</div>
      <div class="report-grid">${physicalFields}</div>
    </div>` : ''}

    ${valuationFields ? `<div class="report-section">
      <div class="report-section-title">Valuation &amp; Sales</div>
      <div class="report-grid">${valuationFields}</div>
    </div>` : ''}

    <div class="report-disclaimer">
      ⚠ This report is for preliminary research purposes only. Zoning eligibility,
      dimensional standards, and feasibility estimates are low-confidence unless
      otherwise noted. Parcel data must be confirmed with official county records
      before relying on any figure for investment, legal, or development decisions.
      ${f?.available && f.ordinanceUrl ? `Official ordinance: <a href="${esc(f.ordinanceUrl)}">${esc(f.ordinanceUrl)}</a>` : ''}
    </div>
  </div>

  <div class="report-footer">
    <span>US Data Center &amp; AI Policy Tracker — Parcel Intelligence</span>
    <span>${esc(genDate)}</span>
  </div>
</div>
</body>
</html>`;
  }

  /* Open the report in a new browser tab */
  function open(feature, jurisdictionId) {
    const reportHtml = html(feature, jurisdictionId);
    const blob       = new Blob([reportHtml], { type: 'text/html' });
    const url        = URL.createObjectURL(blob);
    const win        = window.open(url, '_blank', 'noopener');
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  return { html, open };
})();
