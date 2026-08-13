/* Analytics & About Pages */

/* ─────────────────────────────────────────────────────────────── */
/* Utilities                                                         */
/* ─────────────────────────────────────────────────────────────── */


function barChart(rows, colorFn) {
  const max = Math.max(...rows.map(r => r.count), 1);
  return `<div class="bar-chart">${rows.map((r, i) => `
    <div class="bar-row">
      <div class="bar-row-label" title="${escHtml(r.label)}">${escHtml(r.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.count/max*100)}%;background:${colorFn ? colorFn(r) : 'var(--accent)'};--bar-delay:${i * 40}ms"></div></div>
      <div class="bar-count">${r.count}</div>
    </div>`).join('')}</div>`;
}

function analyticsIcon(name) {
  const icons = {
    county:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
    restrict: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    state:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    news:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
    company:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
    energy:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    pro:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    clock:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    pipeline: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
    server:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
    zap:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    fiber:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12c0-3.87 3.13-7 7-7"/><path d="M19 12c0 3.87-3.13 7-7 7"/><path d="M12 5v2"/><path d="M12 17v2"/><circle cx="12" cy="12" r="3"/><path d="M3 12h2"/><path d="M19 12h2"/></svg>`,
  };
  return icons[name] || icons.county;
}

/* ─────────────────────────────────────────────────────────────── */
/* Analytics Page                                                    */
/* ─────────────────────────────────────────────────────────────── */

function exportCountiesCSV() {
  const counties = mapData || {};
  const wsData   = window.DC_WATER_STRESS_FULL || {};
  const incData  = window.DC_INCENTIVES_FIPS   || {};
  const WS_LABELS = ["Low","Low-Med","Med-High","High","Extreme"];
  const LVL_LABELS = window.LEVEL_LABELS;
  const TYPE_MAP = { data_center:"Data Center", ai:"AI Regulation", energy:"Energy / Grid", crypto:"Crypto / HPC", water:"Water Use" };

  const csvCell = v => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const header = ["FIPS","County","State","Restriction Level","Level Label","Status","Effective Date","Policy Types","Suitability Score","Suitability Grade","Water Stress","Water Stress Label","Incentive Programs","Description"];

  const rows = Object.keys(counties).sort().map(fips => {
    const c    = counties[fips];
    const lvl  = c.level ?? 0;
    const ws   = (wsData[fips] !== undefined && wsData[fips] !== null) ? wsData[fips] : "";
    const wsLabel = ws !== "" ? (WS_LABELS[ws] || String(ws)) : "";
    const incProgs = (incData[fips] || []).map(p => p.program_name || p.name || "").filter(Boolean).join("; ");
    const types    = (c.types || []).map(t => TYPE_MAP[t] || t).join("; ");
    let suit = { score: "", grade: "" };
    if (typeof computeSuitabilityScore === "function") {
      try { suit = computeSuitabilityScore(fips, c); } catch (_) {}
    }
    return [
      fips,
      c.name || "",
      c.state || "",
      lvl,
      LVL_LABELS[String(lvl)] || String(lvl),
      c.status || "active",
      c.effective_date || c.date || "",
      types,
      suit.score,
      suit.grade,
      ws,
      wsLabel,
      incProgs,
      (c.description || "").replace(/\s+/g, " ").trim(),
    ].map(csvCell).join(",");
  });

  const csv  = [header.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url,
    download: `dc-ai-policy-tracker-${new Date().toISOString().slice(0,10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function renderAnalyticsPage() {
  const el = document.getElementById('analytics-view');
  if (!el) return;

  /* ── Compute stats ── */
  const counties = mapData || {};
  const articles = (typeof newsArticles !== 'undefined' ? newsArticles : []);

  const totalCounties = Object.keys(counties).length;

  const statesWithPolicy = new Set();
  const statesWithRestrict = new Set();
  const statesHubs = new Set();
  const levelCounts = { '-1': 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const typeCounts  = {};
  const stateCountMap = {};

  for (const fips in counties) {
    const c = counties[fips];
    const st = c.state || 'Unknown';
    if (c.level >= 1) { statesWithPolicy.add(st); statesWithRestrict.add(st); }
    if (c.level === -1) statesHubs.add(st);
    const lvl = String(c.level);
    if (lvl in levelCounts) levelCounts[lvl]++;
    for (const t of (c.types || [])) typeCounts[t] = (typeCounts[t] || 0) + 1;

    // State restriction counts (level >= 1)
    if (c.level >= 1) {
      stateCountMap[st] = (stateCountMap[st] || 0) + 1;
    }
  }

  const activeRestrict = levelCounts[2] + levelCounts[3] + levelCounts[4];
  const aiCompanyCount = (typeof AI_COMPANIES !== 'undefined' ? AI_COMPANIES.length : 50);

  // News by category
  const newsCats = {};
  for (const a of articles) newsCats[a.category || 'Other'] = (newsCats[a.category || 'Other'] || 0) + 1;

  // Top restricted states
  const topStates = Object.entries(stateCountMap).sort((a,b) => b[1]-a[1]).slice(0,10);

  // Policy type bar data
  const typeLabels = { data_center:'Data Center', ai:'AI Regulation', energy:'Energy / Grid', crypto:'Crypto / HPC', water:'Water Use' };
  const typeColors = { data_center:'#dc2626', ai:'#8b5cf6', energy:'#f59e0b', crypto:'#f97316', water:'#3b82f6' };
  const typeRows = Object.entries(typeCounts).map(([k,v]) => ({ key: k, label: typeLabels[k]||k, count: v })).sort((a,b)=>b.count-a.count);

  // Level distribution
  const levelLabels = window.LEVEL_LABELS;
  const levelColors = { '-1':'#4ade80', 1:'#86efac', 2:'#f97316', 3:'#dc2626', 4:'#7f1d1d' };

  // News category top 8
  const newsCatRows = Object.entries(newsCats).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({ label:k, count:v }));

  // Proposed restrictions (pending legislation)
  const proposedCounties = Object.entries(counties)
    .filter(([, c]) => {
      const s = c.status || "active";
      return s === "proposed" || s === "pending" || (c.lifecycle_stage === "proposed");
    })
    .map(([fips, c]) => ({ fips, ...c }))
    .sort((a, b) => {
      // Sort by effective_date ascending (soonest first), then by level desc
      const da = a.effective_date || a.date || "9999";
      const db = b.effective_date || b.date || "9999";
      if (da !== db) return da.localeCompare(db);
      return (b.level || 0) - (a.level || 0);
    });

  // Opportunity gap analysis
  const oppGemList = [];
  const oppOpenList = [];
  if (typeof computeSuitabilityScore === "function") {
    for (const fips in counties) {
      const c = counties[fips];
      const suit = computeSuitabilityScore(fips, c);
      if (!suit) continue;
      const lvl = c.level ?? 0;
      if (suit.grade === "A" || suit.grade === "B") {
        if (lvl >= 2) oppGemList.push({ fips, name: c.name, state: c.state, level: lvl, score: suit.score, grade: suit.grade });
      }
      if (suit.grade === "A" && lvl <= 0) {
        oppOpenList.push({ fips, name: c.name, state: c.state, level: lvl, score: suit.score, grade: suit.grade });
      }
    }
    oppGemList.sort((a, b) => b.score - a.score);
    oppOpenList.sort((a, b) => b.score - a.score);
  }

  // State Risk Ranking — aggregate per-state metrics
  const stateRisk = {};
  const stateNames = typeof STATE_NAMES !== "undefined" ? STATE_NAMES : {};
  const stFipMap   = typeof STATE_FIPS   !== "undefined" ? STATE_FIPS   : {};
  for (const fips in counties) {
    const c   = counties[fips];
    const st  = c.state || "Unknown";
    if (!stateRisk[st]) stateRisk[st] = { state: st, bans: 0, high: 0, moderate: 0, proposed: 0, proDev: 0, total: 0, suitSum: 0, suitN: 0 };
    const r = stateRisk[st];
    r.total++;
    const lvl = c.level ?? 0;
    if (lvl === 4) r.bans++;
    else if (lvl === 3) r.high++;
    else if (lvl === 2) r.moderate++;
    else if (lvl === 1) r.proposed++;
    else if (lvl === -1) r.proDev++;
    if (typeof computeSuitabilityScore === "function") {
      const suit = computeSuitabilityScore(fips, c);
      if (suit) { r.suitSum += suit.score; r.suitN++; }
    }
  }
  const stateRankRows = Object.values(stateRisk)
    .map(r => ({
      ...r,
      restricted: r.bans + r.high + r.moderate,
      avgSuit: r.suitN ? Math.round(r.suitSum / r.suitN) : null,
    }))
    .sort((a, b) => b.restricted - a.restricted || b.bans - a.bans);

  /* ── Render ── */
  el.innerHTML = `
    <div class="page-hero">
      <h2 class="page-hero-title">Policy <span>Analytics</span></h2>
      <!-- researchedCount() excludes the 597 descriptive_only records, which hold a
           county description but no policy research. totalCounties (every record)
           would overstate this from 28% to 47%. -->
      <div class="page-hero-sub">Policy coverage summary derived from ${(window.researchedCount ? window.researchedCount() : totalCounties).toLocaleString()} manually researched jurisdictions (${typeof window.coveragePct === 'function' ? window.coveragePct() : Math.round(totalCounties/3143*100)}% of 3,143 US counties). Policy data verified from official government sources — not real-time.</div>
      <button class="analytics-export-btn" id="analytics-export-csv" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export All Counties CSV
      </button>
    </div>

    <div class="page-section">
      <div class="page-section-title">Platform Coverage</div>
      <div class="analytics-kpi-grid">
        <div class="analytics-kpi-card">
          <div class="analytics-kpi-card-icon" style="background:rgba(239,68,68,0.12);color:#ef4444">${analyticsIcon('restrict')}</div>
          <div class="analytics-kpi-label">Active Restrictions</div>
          <div class="analytics-kpi-value">${activeRestrict}</div>
          <div class="analytics-kpi-meta">counties with enacted policy</div>
        </div>
        <div class="analytics-kpi-card">
          <div class="analytics-kpi-card-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">${analyticsIcon('county')}</div>
          <div class="analytics-kpi-label">Counties Researched</div>
          <div class="analytics-kpi-value">${(window.researchedCount ? window.researchedCount() : totalCounties).toLocaleString()}</div>
          <div class="analytics-kpi-meta">with known policy data</div>
        </div>
        <div class="analytics-kpi-card">
          <div class="analytics-kpi-card-icon" style="background:rgba(72,116,232,0.12);color:var(--accent)">${analyticsIcon('state')}</div>
          <div class="analytics-kpi-label">States with Legislation</div>
          <div class="analytics-kpi-value">${statesWithRestrict.size}</div>
          <div class="analytics-kpi-meta">of 50 states covered</div>
        </div>
        <div class="analytics-kpi-card">
          <div class="analytics-kpi-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e">${analyticsIcon('pro')}</div>
          <div class="analytics-kpi-label">Pro-Business Hubs</div>
          <div class="analytics-kpi-value">${levelCounts['-1']}</div>
          <div class="analytics-kpi-meta">counties with active incentives</div>
        </div>
        <div class="analytics-kpi-card">
          <div class="analytics-kpi-card-icon" style="background:rgba(96,165,250,0.12);color:#60a5fa">${analyticsIcon('news')}</div>
          <div class="analytics-kpi-label">AI News Articles</div>
          <div class="analytics-kpi-value">${articles.length}</div>
          <div class="analytics-kpi-meta">updated every hour</div>
        </div>
        <div class="analytics-kpi-card">
          <div class="analytics-kpi-card-icon" style="background:rgba(167,139,250,0.12);color:#a78bfa">${analyticsIcon('company')}</div>
          <div class="analytics-kpi-label">Companies Monitored</div>
          <div class="analytics-kpi-value">${aiCompanyCount}</div>
          <div class="analytics-kpi-meta">publicly traded AI stocks</div>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Policy Distribution</div>
      <div class="analytics-card-grid">

        <div class="analytics-card">
          <div class="analytics-card-header">
            <div class="analytics-card-title">Restriction Severity</div>
            <span class="status-badge neutral">${totalCounties} counties</span>
          </div>
          <div class="analytics-card-body">
            <div class="ring-stats">
              ${Object.entries(levelCounts).filter(([k,v])=>v>0).map(([k,v])=>`
              <div class="ring-stat-item">
                <div class="ring-stat-dot" style="background:${levelColors[k]||'var(--border)'}"></div>
                <div class="ring-stat-label">${escHtml(levelLabels[k]||k)}</div>
                <div class="ring-stat-val">${v}</div>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-header">
            <div class="analytics-card-title">Restriction Type Breakdown</div>
          </div>
          <div class="analytics-card-body">
            ${barChart(typeRows, r => typeColors[r.key] || 'var(--accent)')}
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-header">
            <div class="analytics-card-title">Most Restricted States</div>
            <span class="status-badge danger">${statesWithRestrict.size} states</span>
          </div>
          <div class="analytics-card-body">
            <div class="ranked-list" id="analytics-top-states-list">
              ${topStates.map(([st,n],i) => `
              <div class="ranked-item ranked-item-clickable" data-state="${escHtml(st)}" role="button" tabindex="0" title="View ${escHtml(st)} counties">
                <div class="rank-num">${i+1}</div>
                <div class="rank-name rank-name-link">${escHtml(st)}</div>
                <div class="rank-bar-wrap">
                  <div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(n/topStates[0][1]*100)}%;background:#dc2626;--bar-delay:${i*40}ms"></div></div>
                </div>
                <div class="rank-count">${n}</div>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-header">
            <div class="analytics-card-title">News by Category</div>
            <span class="status-badge info">${articles.length} articles</span>
          </div>
          <div class="analytics-card-body">
            ${barChart(newsCatRows, () => 'var(--accent)')}
          </div>
        </div>

      </div>
    </div>

    <div class="page-section">
      <div class="callout info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div class="callout-body">
          <strong>Data coverage note:</strong> This dataset focuses on jurisdictions with known policy activity.
          Counties not shown have no confirmed restrictions or incentives on record as of the last data update.
          Data is maintained manually and updated as policies change.
        </div>
      </div>
    </div>

    ${proposedCounties.length ? `
    <div class="page-section">
      <div class="page-section-title">Proposed Restrictions Monitor
        <span class="pmon-badge">${proposedCounties.length}</span>
      </div>
      <p class="pmon-desc">Counties with pending or proposed legislation — these restrictions are not yet enacted but may become active. Click any row to open the county on the map.</p>
      <div class="pmon-table-wrap">
        <table class="pmon-table" role="grid">
          <thead>
            <tr>
              <th class="pmon-th">County</th>
              <th class="pmon-th">State</th>
              <th class="pmon-th">Type</th>
              <th class="pmon-th">Proposed Level</th>
              <th class="pmon-th pmon-th-date">Proposed Date</th>
              <th class="pmon-th pmon-th-watch"><span class="sr-only">Watch</span></th>
            </tr>
          </thead>
          <tbody>
            ${proposedCounties.map(c => {
              const typeLabels2 = { data_center:'Data Center', ai:'AI', energy:'Energy', crypto:'Crypto', water:'Water' };
              const types = (c.types || []).map(t => escHtml(typeLabels2[t] || t)).join(', ');
              const lvl   = c.level ?? 1;
              const lvlLbl = lvl >= 4 ? "Ban / Moratorium" : lvl === 3 ? "Significant" : lvl === 2 ? "Moderate" : "Light";
              const lvlColor = lvl >= 4 ? "#7f1d1d" : lvl === 3 ? "#dc2626" : lvl === 2 ? "#f97316" : "#eab308";
              const dateStr = c.effective_date || c.date || "";
              const fmtDate = dateStr ? new Date(dateStr + "T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "Unknown";
              return `<tr class="pmon-row" role="row" data-fips="${escHtml(c.fips)}" tabindex="0">
                <td class="pmon-county">${escHtml(c.name || c.fips)}</td>
                <td class="pmon-state">${escHtml(c.state || "")}</td>
                <td class="pmon-type">${types || "—"}</td>
                <td class="pmon-level"><span class="pmon-level-dot" style="background:${lvlColor}"></span>${escHtml(lvlLbl)}</td>
                <td class="pmon-date">${escHtml(fmtDate)}</td>
                <td class="pmon-watch-cell">
                  <button class="pmon-watch-btn" data-fips="${escHtml(c.fips)}" aria-label="Watch ${escHtml(c.name || c.fips)}" title="Watch county" type="button">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>` : ""}

    ${(oppGemList.length || oppOpenList.length) ? `
    <div class="page-section">
      <div class="page-section-title">Opportunity Gap Analysis</div>
      <p class="pmon-desc">Counties where market conditions diverge sharply from policy reality — revealing underserved locations worth watching.</p>
      <div class="opp-gap-grid">

        ${oppGemList.length ? `
        <div class="opp-gap-card">
          <div class="opp-gap-card-hdr">
            <span class="opp-gap-icon opp-gem-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <div>
              <div class="opp-gap-card-title">Restricted Gems</div>
              <div class="opp-gap-card-sub">A/B-grade counties with active restrictions — high potential, policy headwinds</div>
            </div>
            <span class="opp-gap-count">${oppGemList.length}</span>
          </div>
          <div class="opp-gap-table-wrap">
            <table class="opp-gap-table">
              <thead><tr>
                <th>County</th><th>State</th><th>Grade</th><th>Score</th><th>Restriction</th>
              </tr></thead>
              <tbody>
                ${oppGemList.slice(0, 12).map(c => {
                  const GRADE_COLOR = { A: "#22c55e", B: "#22d3ee", C: "#eab308", D: "#f97316", F: "#ef4444" };
                  const lvlLbl = c.level >= 4 ? "Ban" : c.level === 3 ? "High" : c.level === 2 ? "Moderate" : "Light";
                  const lvlColor = c.level >= 4 ? "#ef4444" : c.level === 3 ? "#dc2626" : c.level === 2 ? "#f97316" : "#eab308";
                  return `<tr class="opp-gap-row" data-fips="${escHtml(c.fips)}" tabindex="0" role="button" aria-label="${escHtml(c.name)}, ${escHtml(c.state)}">
                    <td class="opp-gap-name">${escHtml(c.name || c.fips)}</td>
                    <td class="opp-gap-state">${escHtml(c.state || "")}</td>
                    <td class="opp-gap-grade" style="color:${GRADE_COLOR[c.grade] || "var(--accent)"}">${escHtml(c.grade)}</td>
                    <td class="opp-gap-score">${c.score}</td>
                    <td class="opp-gap-lvl" style="color:${lvlColor}">${escHtml(lvlLbl)}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>` : ""}

        ${oppOpenList.length ? `
        <div class="opp-gap-card">
          <div class="opp-gap-card-hdr">
            <span class="opp-gap-icon opp-open-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </span>
            <div>
              <div class="opp-gap-card-title">Policy-Free Opportunities</div>
              <div class="opp-gap-card-sub">A-grade counties with no restrictions — best open markets right now</div>
            </div>
            <span class="opp-gap-count opp-open-count">${oppOpenList.length}</span>
          </div>
          <div class="opp-gap-table-wrap">
            <table class="opp-gap-table">
              <thead><tr>
                <th>County</th><th>State</th><th>Grade</th><th>Score</th><th>Status</th>
              </tr></thead>
              <tbody>
                ${oppOpenList.slice(0, 12).map(c => {
                  const lvlLbl = c.level === -1 ? "Pro-Dev" : "Open";
                  const lvlColor = c.level === -1 ? "#22c55e" : "var(--text-muted)";
                  return `<tr class="opp-gap-row" data-fips="${escHtml(c.fips)}" tabindex="0" role="button" aria-label="${escHtml(c.name)}, ${escHtml(c.state)}">
                    <td class="opp-gap-name">${escHtml(c.name || c.fips)}</td>
                    <td class="opp-gap-state">${escHtml(c.state || "")}</td>
                    <td class="opp-gap-grade" style="color:#22c55e">${escHtml(c.grade)}</td>
                    <td class="opp-gap-score">${c.score}</td>
                    <td class="opp-gap-lvl" style="color:${lvlColor}">${escHtml(lvlLbl)}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>` : ""}

      </div>
    </div>` : ""}

    <div class="page-section">
      <div class="page-section-title">State Risk Ranking</div>
      <p class="pmon-desc">All states with tracked county-level policy activity, ranked by total active restrictions. Click column headers to sort. Click any row to view state-level details.</p>
      <div class="srr-table-wrap">
        <table class="srr-table" id="analytics-srr-table">
          <thead>
            <tr>
              <th class="srr-th srr-th-sort" data-col="restricted" data-dir="desc"># Restricted <span class="srr-sort-icon">↓</span></th>
              <th class="srr-th srr-th-state">State</th>
              <th class="srr-th srr-th-sort" data-col="bans" data-dir="asc">Bans</th>
              <th class="srr-th srr-th-sort" data-col="high" data-dir="asc">High</th>
              <th class="srr-th srr-th-sort" data-col="moderate" data-dir="asc">Moderate</th>
              <th class="srr-th srr-th-sort" data-col="proDev" data-dir="asc">Pro-Dev</th>
              <th class="srr-th srr-th-sort" data-col="avgSuit" data-dir="asc">Avg Suit.</th>
              <th class="srr-th srr-th-sort" data-col="total" data-dir="asc">Total Tracked</th>
            </tr>
          </thead>
          <tbody id="analytics-srr-tbody">
            ${(function() {
              return stateRankRows.map(r => {
                const riskPct = r.total > 0 ? (r.restricted / r.total) * 100 : 0;
                const riskColor = riskPct >= 50 ? "#dc2626" : riskPct >= 25 ? "#f97316" : riskPct >= 10 ? "#eab308" : "#22c55e";
                const suitColor = r.avgSuit !== null ? (r.avgSuit >= 80 ? "#22c55e" : r.avgSuit >= 65 ? "#22d3ee" : r.avgSuit >= 45 ? "#eab308" : "#ef4444") : "var(--text-muted)";
                return `<tr class="srr-row" data-state="${escHtml(r.state)}">
                  <td class="srr-td srr-td-restricted">
                    <div class="srr-bar-wrap">
                      <div class="srr-bar" style="width:${Math.min(100, riskPct).toFixed(1)}%;background:${riskColor}"></div>
                    </div>
                    <span class="srr-num" style="color:${riskColor}">${r.restricted}</span>
                  </td>
                  <td class="srr-td srr-td-name">${escHtml(r.state)}</td>
                  <td class="srr-td srr-td-num">${r.bans || "—"}</td>
                  <td class="srr-td srr-td-num">${r.high || "—"}</td>
                  <td class="srr-td srr-td-num">${r.moderate || "—"}</td>
                  <td class="srr-td srr-td-num srr-pro">${r.proDev || "—"}</td>
                  <td class="srr-td srr-td-suit" style="color:${suitColor}">${r.avgSuit !== null ? r.avgSuit : "—"}</td>
                  <td class="srr-td srr-td-num srr-muted">${r.total}</td>
                </tr>`;
              }).join("");
            })()}
          </tbody>
        </table>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Policy Type Adoption by Year</div>
      <p class="pmon-desc">Restrictions enacted per year, broken down by regulated technology category. Only counties with known enactment dates are counted.</p>
      ${(function() {
        const TYPE_ORDER = ["data_center", "ai", "crypto", "energy", "water"];
        const TYPE_LABELS2 = { data_center: "Data Center", ai: "AI", crypto: "Crypto / HPC", energy: "Energy", water: "Water" };
        const TYPE_COLORS2 = { data_center: "#dc2626", ai: "#8b5cf6", crypto: "#f97316", energy: "#f59e0b", water: "#3b82f6" };
        const yearTypeMap = {};
        let minYr = 2020, maxYr = new Date().getFullYear();
        for (const fips in counties) {
          const c = counties[fips];
          if (!c.types || !c.types.length) continue;
          const dateStr = c.effective_date || c.date || "";
          if (!dateStr) continue;
          const yr = parseInt(dateStr.slice(0, 4), 10);
          if (isNaN(yr) || yr < 2010 || yr > maxYr) continue;
          if (yr < minYr) minYr = yr;
          if (!yearTypeMap[yr]) yearTypeMap[yr] = {};
          for (const t of c.types) {
            yearTypeMap[yr][t] = (yearTypeMap[yr][t] || 0) + 1;
          }
        }
        const years = [];
        for (let y = minYr; y <= maxYr; y++) years.push(y);
        if (!years.length) return "<p class='empty-note'>No dated policy records found.</p>";
        const maxVal = Math.max(1, ...Object.values(yearTypeMap).flatMap(m => Object.values(m)));
        const rows = years.map(yr => {
          const ym = yearTypeMap[yr] || {};
          const cells = TYPE_ORDER.map(t => {
            const v = ym[t] || 0;
            const barPct = Math.round((v / maxVal) * 100);
            return `<td class="pty-td">
              <div class="pty-cell-wrap">
                ${v > 0 ? `<div class="pty-bar" style="height:${barPct}%;background:${TYPE_COLORS2[t]}" title="${v} ${TYPE_LABELS2[t]} restrictions in ${yr}"></div><span class="pty-num">${v}</span>` : `<span class="pty-zero">—</span>`}
              </div>
            </td>`;
          }).join("");
          return `<tr class="pty-row"><td class="pty-yr">${yr}</td>${cells}</tr>`;
        }).join("");
        const headers = TYPE_ORDER.map(t =>
          `<th class="pty-th" style="color:${TYPE_COLORS2[t]}">${TYPE_LABELS2[t]}</th>`
        ).join("");
        return `<div class="pty-table-wrap"><table class="pty-table">
          <thead><tr><th class="pty-th pty-th-yr">Year</th>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`;
      })()}
    </div>

    <div class="page-section">
      <div class="page-section-title">Policy Timeline</div>
      <div id="analytics-policy-timeline">
        ${_buildPolicyTimelineHtml(counties)}
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Restriction Enactment Velocity</div>
      <div id="analytics-velocity-section">
        ${_buildVelocityChartHtml(counties)}
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Cumulative Regulatory Pressure</div>
      <div id="analytics-cumulative-section">
        ${_buildCumulativeChartHtml(counties)}
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Monthly Enactment Heatmap</div>
      <div id="analytics-heatmap-section">
        ${_buildMonthlyHeatmapHtml(counties)}
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Regulatory Momentum — Last 12 Months</div>
      <div id="analytics-momentum-section">
        ${_buildRegulatoryMomentumHtml(counties)}
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">County Suitability Rankings</div>
      <div id="analytics-rankings-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Computing suitability scores…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Suitability Score Distribution</div>
      <div id="analytics-score-dist-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Computing score distribution…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Investment Hotspots</div>
      <div id="analytics-hotspots-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Identifying investment-grade counties…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Political Risk Intelligence</div>
      <div id="analytics-political-risk-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading political risk signals…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">State Regulatory Scorecard</div>
      <div id="analytics-state-scorecard">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading state regulations…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">State Opportunity Matrix</div>
      <div id="analytics-state-matrix">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Computing state opportunity scores…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Conflict Zone Analysis</div>
      <div id="analytics-conflict-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Computing conflict zones…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">AI Campus Operator Risk Profile</div>
      <div id="analytics-operator-risk-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading operator exposure data…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Facility Capacity Intelligence</div>
      <div id="analytics-capacity-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading facility data…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Infrastructure Pipeline</div>
      <div id="analytics-pipeline-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading pipeline data…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Power Intelligence</div>
      <div id="analytics-power-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading power data…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Fiber Intelligence</div>
      <div id="analytics-fiber-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading fiber data…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Grid Readiness Overview</div>
      <div id="analytics-grid-readiness-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading grid readiness data…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Parcel Data Coverage</div>
      <div id="analytics-parcel-coverage-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading parcel coverage data…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Development Scenario Builder</div>
      <div id="analytics-scenario-section"></div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Tax Incentive Explorer</div>
      <div id="analytics-incentives-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading incentive programs…</span>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Economic Context</div>
      <div id="analytics-economic-section">
        <div class="analytics-pipeline-loading">
          <div class="spinner"></div>
          <span>Loading economic data…</span>
        </div>
      </div>
    </div>

    <div id="analytics-footer-target"></div>
  `;

  // Inject footer
  renderPageFooter('analytics-footer-target');

  // Async fill pipeline stats
  _fillPipelineStats();
  _fillPowerStats();
  _fillFiberStats();
  _fillGridReadinessStats();
  _fillParcelCoverageStats();
  _renderScenarioBuilder();
  _renderCountyRankings();
  _renderInvestmentHotspots();
  _renderPoliticalRisk();
  _renderStateScorecard();
  _renderStateOpportunityMatrix();
  _fillScoreDist();
  _fillOperatorRisk();
  _fillConflictZones();
  _fillCapacityIntelligence();
  _fillIncentiveExplorer();
  _fillEconomicContext();

  el.querySelector("#analytics-export-csv")?.addEventListener("click", exportCountiesCSV);

  // State drill-down: click any row in "Most Restricted States" chart
  el.querySelector("#analytics-top-states-list")?.addEventListener("click", e => {
    const item = e.target.closest(".ranked-item-clickable[data-state]");
    if (item) _showStateModal(item.dataset.state);
  });
  el.querySelector("#analytics-top-states-list")?.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      const item = e.target.closest(".ranked-item-clickable[data-state]");
      if (item) { e.preventDefault(); _showStateModal(item.dataset.state); }
    }
  });

  // Proposed restrictions monitor: row click → map, watch button
  el.querySelectorAll(".pmon-row[data-fips]").forEach(row => {
    const nav = () => {
      const fips = row.dataset.fips;
      if (!fips) return;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    row.addEventListener("click", e => {
      if (e.target.closest(".pmon-watch-btn")) return;
      nav();
    });
    row.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".pmon-watch-btn")) {
        e.preventDefault(); nav();
      }
    });
  });
  el.querySelectorAll(".pmon-watch-btn[data-fips]").forEach(btn => {
    const fips = btn.dataset.fips;
    const updateBtn = () => {
      const watched = typeof toggleWatchCounty !== "undefined" &&
        !!(window.WATCHLIST && window.WATCHLIST.has(fips));
      btn.classList.toggle("pmon-watch-btn-active", watched);
      btn.title = watched ? "Remove from watchlist" : "Watch county";
      btn.querySelector("svg")?.setAttribute("fill", watched ? "currentColor" : "none");
    };
    updateBtn();
    btn.addEventListener("click", e => {
      e.stopPropagation();
      if (typeof toggleWatchCounty === "function") toggleWatchCounty(fips);
      updateBtn();
    });
  });

  // Opportunity gap rows → map navigation
  el.querySelectorAll(".opp-gap-row[data-fips]").forEach(row => {
    const nav = () => {
      const fips = row.dataset.fips;
      if (!fips) return;
      switchTab("map");
      (typeof mapInitPromise !== "undefined" && mapInitPromise
        ? mapInitPromise : Promise.resolve()
      ).then(() => { selectCounty(fips); zoomToFeature(fips); });
    };
    row.addEventListener("click",   nav);
    row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav(); } });
  });

  // State Risk Ranking: sortable columns + row click → state modal
  const srrTable = el.querySelector("#analytics-srr-table");
  if (srrTable) {
    let _srrSortCol = "restricted", _srrSortDir = -1;
    const tbody = el.querySelector("#analytics-srr-tbody");
    function _srrSort(col, dir) {
      _srrSortCol = col; _srrSortDir = dir;
      const rows = Array.from(tbody.querySelectorAll(".srr-row"));
      rows.sort((a, b) => {
        const getVal = r => {
          if (col === "state") return r.dataset.state || "";
          const td = r.querySelector(`.srr-td-${col === "restricted" ? "restricted" : col === "state" ? "name" : "num"}`);
          if (!td) return 0;
          const txt = td.textContent.trim();
          if (txt === "—") return dir * -Infinity;
          const n = parseFloat(txt);
          return isNaN(n) ? txt : n;
        };
        const av = getVal(a), bv = getVal(b);
        if (typeof av === "number" && typeof bv === "number") return dir * (bv - av);
        return dir * String(av).localeCompare(String(bv));
      });
      rows.forEach(r => tbody.appendChild(r));
      srrTable.querySelectorAll(".srr-th-sort").forEach(th => {
        const isCur = th.dataset.col === col;
        const icon = th.querySelector(".srr-sort-icon");
        if (icon) icon.textContent = isCur ? (dir === -1 ? "↓" : "↑") : "";
        th.classList.toggle("srr-th-active", isCur);
      });
    }
    srrTable.querySelectorAll(".srr-th-sort").forEach(th => {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        const newDir = (col === _srrSortCol && _srrSortDir === -1) ? 1 : -1;
        _srrSort(col, newDir);
      });
    });
    tbody.querySelectorAll(".srr-row[data-state]").forEach(row => {
      row.addEventListener("click", () => {
        if (typeof _showStateModal === "function") _showStateModal(row.dataset.state);
      });
    });
  }
}

/* ── State county drill-down modal ── */
function _showStateModal(stateName) {
  const counties = mapData || {};
  const wsData   = window.DC_WATER_STRESS_FULL || {};
  const incData  = window.DC_INCENTIVES_FIPS   || {};
  const WS_LABELS = ["Low","Low-Med","Med-High","High","Extreme"];

  const LVL_LABELS = window.LEVEL_SHORT;
  const LVL_COLORS = {"-1":"#22c55e","0":"#6b7280","1":"#86efac","2":"#f97316","3":"#dc2626","4":"#7f1d1d"};

  const rows = [];
  for (const fips in counties) {
    const c = counties[fips];
    if (c.state !== stateName) continue;
    const lvl  = c.level ?? 0;
    const ws   = (wsData[fips] !== undefined && wsData[fips] !== null) ? wsData[fips] : null;
    let suit   = { score: null, grade: "—" };
    if (typeof computeSuitabilityScore === "function") {
      try { suit = computeSuitabilityScore(fips, c); } catch (_) {}
    }
    const hasInc = !!(incData[fips] && incData[fips].length);
    rows.push({ fips, name: c.name, lvl, date: c.effective_date || c.date || "", status: c.status || "active", suit, ws, wsLabel: ws !== null ? (WS_LABELS[ws] || String(ws)) : "—", hasInc });
  }
  rows.sort((a, b) => {
    if (b.lvl !== a.lvl) return b.lvl - a.lvl;
    return (b.suit.score ?? 0) - (a.suit.score ?? 0);
  });

  const esc = s => escHtml(String(s ?? ""));
  const GRADE_COLOR = { A:"#22c55e", B:"#22d3ee", C:"#eab308", D:"#f97316", F:"#ef4444" };
  const WS_COLOR    = (ws) => ws !== null ? (ws <= 1 ? "#22c55e" : ws === 2 ? "#eab308" : "#ef4444") : "var(--text-muted)";

  const tableRows = rows.map((r, i) => `
    <tr class="sdm-row" data-fips="${esc(r.fips)}" role="button" tabindex="0" title="Open ${esc(r.name)} on the map">
      <td class="sdm-rank">${i + 1}</td>
      <td class="sdm-county">${esc(r.name)}</td>
      <td class="sdm-lvl">
        <span class="sdm-badge" style="background:${LVL_COLORS[String(r.lvl)]||"#6b7280"}22;color:${LVL_COLORS[String(r.lvl)]||"#6b7280"};border:1px solid ${LVL_COLORS[String(r.lvl)]||"#6b7280"}44">
          ${esc(LVL_LABELS[String(r.lvl)] || String(r.lvl))}
        </span>
      </td>
      <td class="sdm-suit" style="color:${GRADE_COLOR[r.suit.grade]||"var(--text-muted)"}">
        ${r.suit.grade !== "—" ? `${r.suit.grade} <span class="sdm-score">${r.suit.score}pt</span>` : "—"}
      </td>
      <td class="sdm-ws" style="color:${WS_COLOR(r.ws)}">${esc(r.wsLabel)}</td>
      <td class="sdm-date">${esc(r.date ? r.date.slice(0,10) : "")}</td>
      ${r.hasInc ? '<td class="sdm-inc">✓</td>' : '<td class="sdm-inc sdm-inc-empty">—</td>'}
    </tr>`).join("");

  const totalR  = rows.filter(r => r.lvl >= 1).length;
  const totalP  = rows.filter(r => r.lvl === -1).length;
  const totalNR = rows.filter(r => r.lvl <= 0 && r.lvl !== -1).length;

  const html = `
<div id="state-modal-overlay" class="sdm-overlay" role="dialog" aria-modal="true" aria-label="${esc(stateName)} county breakdown">
  <div class="sdm-modal">
    <div class="sdm-hdr">
      <div class="sdm-hdr-left">
        <div class="sdm-title">${esc(stateName)}</div>
        <div class="sdm-subtitle">${rows.length} counties tracked &nbsp;·&nbsp; <span style="color:#ef4444">${totalR} restricted</span> &nbsp;·&nbsp; <span style="color:#22c55e">${totalP} pro-dev</span> &nbsp;·&nbsp; ${totalNR} no restrictions</div>
      </div>
      <div class="sdm-hdr-right">
        <button class="sdm-map-btn" id="sdm-map-btn" type="button">View on map</button>
        <button class="sdm-close" id="sdm-close" type="button" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="sdm-body">
      <div class="sdm-table-wrap">
        <table class="sdm-table">
          <thead>
            <tr>
              <th class="sdm-rank">#</th>
              <th class="sdm-county">County</th>
              <th class="sdm-lvl">Restriction</th>
              <th class="sdm-suit">Suitability</th>
              <th class="sdm-ws">Water Stress</th>
              <th class="sdm-date">Effective Date</th>
              <th class="sdm-inc">Incentives</th>
            </tr>
          </thead>
          <tbody>${tableRows || '<tr><td colspan="7" class="sdm-empty">No county data for this state.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </div>
</div>`;

  document.getElementById("state-modal-overlay")?.remove();
  document.body.insertAdjacentHTML("beforeend", html);

  const overlay = document.getElementById("state-modal-overlay");
  const _sNames = (typeof STATE_NAMES !== "undefined" ? STATE_NAMES : {});
  const _sFips  = (typeof STATE_FIPS  !== "undefined" ? STATE_FIPS  : {});
  const stAbbr  = Object.entries(_sNames).find(([, name]) => name === stateName)?.[0] || "";
  const fips2   = stAbbr ? Object.entries(_sFips).find(([, abbr]) => abbr === stAbbr)?.[0] : null;

  function closeModal() { overlay?.remove(); }

  overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
  document.getElementById("sdm-close")?.addEventListener("click", closeModal);
  document.getElementById("sdm-map-btn")?.addEventListener("click", () => {
    closeModal();
    switchTab("map");
    setTimeout(() => {
      if (typeof stateGeoLayer !== "undefined" && stateGeoLayer && fips2) {
        const stLayer = stateGeoLayer.getLayers().find(l => String(l.feature.id).padStart(2,"0") === fips2);
        if (stLayer && typeof leafletMap !== "undefined") {
          leafletMap.flyToBounds(stLayer.getBounds(), { duration: 0.6, padding: [20, 20] });
        }
      }
      if (typeof showStateDetail === "function" && fips2) showStateDetail(fips2);
    }, 300);
  });

  // Row click → navigate to county on map
  overlay.querySelector(".sdm-table tbody")?.addEventListener("click", e => {
    const row = e.target.closest(".sdm-row[data-fips]");
    if (!row) return;
    closeModal();
    switchTab("map");
    setTimeout(() => {
      if (typeof selectCounty === "function") selectCounty(row.dataset.fips);
      if (typeof zoomToFeature === "function") zoomToFeature(row.dataset.fips);
    }, 300);
  });
  overlay.querySelector(".sdm-table tbody")?.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      const row = e.target.closest(".sdm-row[data-fips]");
      if (row) { e.preventDefault(); row.click(); }
    }
  });

  const keyHandler = e => { if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", keyHandler); } };
  document.addEventListener("keydown", keyHandler);

  // Focus modal for accessibility
  setTimeout(() => overlay.querySelector(".sdm-modal")?.focus(), 50);
}

function _buildVelocityChartHtml(counties) {
  // Aggregate enactments by year + restriction level
  const SEV_COLORS = {
    "-1": "#22c55e",  // Pro-business
    "1":  "#86efac",  // Light
    "2":  "#f97316",  // Moderate
    "3":  "#dc2626",  // Significant
    "4":  "#7f1d1d",  // Ban
  };
  const SEV_LABELS = {
    "-1": "Pro-Business / Incentive",
    "1":  "Light",
    "2":  "Moderate",
    "3":  "Significant",
    "4":  "Moratorium / Ban",
  };
  const LEVELS = ["-1", "1", "2", "3", "4"];
  const YEARS  = ["2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026"];

  const yearLevel = {};
  for (const yr of YEARS) yearLevel[yr] = {};

  for (const fips in counties) {
    const c  = counties[fips];
    const lv = String(c.level ?? 0);
    if (!LEVELS.includes(lv)) continue;
    const raw = c.effective_date || c.date || c.last_updated || "";
    if (!raw || raw.length < 4) continue;
    const yr = raw.slice(0, 4);
    if (!YEARS.includes(yr)) continue;
    yearLevel[yr][lv] = (yearLevel[yr][lv] || 0) + 1;
  }

  // Compute max total per year for scaling
  const totals = YEARS.map(yr => Object.values(yearLevel[yr]).reduce((s, v) => s + v, 0));
  const maxTotal = Math.max(...totals, 1);

  // Chart dimensions
  const W = 620, H = 220, PAD_L = 36, PAD_R = 16, PAD_T = 24, PAD_B = 56;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const barW   = Math.floor(chartW / YEARS.length * 0.7);
  const barGap  = chartW / YEARS.length;

  // Y-axis gridlines
  const gridSteps = 4;
  const gridLines = [];
  for (let i = 0; i <= gridSteps; i++) {
    const val = Math.round(maxTotal * i / gridSteps);
    const y   = PAD_T + chartH - (chartH * i / gridSteps);
    gridLines.push(`
      <line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="var(--border)" stroke-width="0.7" stroke-dasharray="${i > 0 ? '3,3' : ''}"/>
      <text x="${PAD_L - 4}" y="${y + 4}" text-anchor="end" font-size="9" fill="var(--text-muted)" font-family="inherit">${val}</text>
    `);
  }

  // Bars (stacked)
  const bars = [];
  const labels = [];
  YEARS.forEach((yr, xi) => {
    const x = PAD_L + xi * barGap + (barGap - barW) / 2;
    let yBottom = PAD_T + chartH;
    const total = totals[xi];

    for (const lv of LEVELS) {
      const count = yearLevel[yr][lv] || 0;
      if (!count) continue;
      const barH = Math.max(2, (count / maxTotal) * chartH);
      yBottom -= barH;
      bars.push(`<rect x="${x.toFixed(1)}" y="${yBottom.toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" fill="${SEV_COLORS[lv]}" rx="1">
        <title>${YEARS[xi]} · ${SEV_LABELS[lv]}: ${count} enactments</title>
      </rect>`);
    }

    // X label
    labels.push(`<text x="${(x + barW / 2).toFixed(1)}" y="${PAD_T + chartH + 14}" text-anchor="middle" font-size="9.5" fill="var(--text-muted)" font-family="inherit">${yr}</text>`);

    // Total above bar
    if (total > 0) {
      const topY = PAD_T + chartH - (total / maxTotal) * chartH - 3;
      labels.push(`<text x="${(x + barW / 2).toFixed(1)}" y="${topY.toFixed(1)}" text-anchor="middle" font-size="8.5" fill="var(--text-muted)" font-family="inherit">${total}</text>`);
    }
  });

  // Legend
  const legendItems = LEVELS.map((lv, i) =>
    `<g transform="translate(${i * 110}, 0)">
      <rect width="10" height="10" rx="2" fill="${SEV_COLORS[lv]}"/>
      <text x="14" y="9" font-size="9" fill="var(--text-muted)" font-family="inherit">${SEV_LABELS[lv]}</text>
    </g>`
  ).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible" role="img" aria-label="Restriction enactment velocity chart">
      ${gridLines.join("")}
      ${bars.join("")}
      ${labels.join("")}
    </svg>
    <svg viewBox="0 0 560 16" width="100%" style="max-width:560px;display:block;margin-top:6px" aria-hidden="true">
      ${legendItems}
    </svg>
    <p class="vel-note">County-level policy enactments by year, colored by restriction severity. Includes both new restrictions (levels 1–4) and new incentive programs (−1). Pre-2018 data is sparse — many records lack precise dates. 2026 is partial-year.</p>
  `;
}

function _buildCumulativeChartHtml(counties) {
  const YEARS  = ["2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026"];
  // Track by severity: restrictive (1-4) vs. pro-business (-1) vs. no-restriction (0/null)
  const SEV_COLOR = {
    pro:      "#22c55e",
    restrict: "#ef4444",
    total:    "#4874e8",
  };

  // Count counties with a dated entry per year per category
  // For cumulative: once a county has a policy by year Y, it counts in Y and all subsequent years
  const dated = {};   // fips → year string (first dated policy)
  const datePro  = {}; // fips → year (pro-business)
  const dateRestr = {}; // fips → year (restriction)

  for (const fips in counties) {
    const c = counties[fips];
    const raw = c.effective_date || c.date || c.last_updated || "";
    if (!raw || raw.length < 4) continue;
    const yr = raw.slice(0, 4);
    if (!YEARS.includes(yr)) continue;
    if (c.level === -1) {
      if (!datePro[fips] || yr < datePro[fips]) datePro[fips] = yr;
    } else if (c.level >= 1) {
      if (!dateRestr[fips] || yr < dateRestr[fips]) dateRestr[fips] = yr;
    }
  }

  // Cumulative counts per year
  const cumPro    = [];
  const cumRestr  = [];
  const cumTotal  = [];
  for (const yr of YEARS) {
    const proCount  = Object.values(datePro).filter(y => y <= yr).length;
    const restrCount = Object.values(dateRestr).filter(y => y <= yr).length;
    cumPro.push(proCount);
    cumRestr.push(restrCount);
    cumTotal.push(proCount + restrCount);
  }

  const maxVal  = Math.max(...cumTotal, 1);
  const W = 620, H = 240, PAD_L = 40, PAD_R = 20, PAD_T = 28, PAD_B = 52;
  const chartW  = W - PAD_L - PAD_R;
  const chartH  = H - PAD_T - PAD_B;

  const xPos  = i => PAD_L + (i / (YEARS.length - 1)) * chartW;
  const yPos  = v => PAD_T + chartH - (v / maxVal) * chartH;

  // Y gridlines
  const gridSteps = 4;
  const gridLines = [];
  for (let i = 0; i <= gridSteps; i++) {
    const val = Math.round(maxVal * i / gridSteps);
    const y   = yPos(val);
    gridLines.push(`
      <line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="${i===0 ? 1 : 0.6}" stroke-dasharray="${i>0 ? '3,3' : ''}"/>
      <text x="${PAD_L - 5}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--text-muted)" font-family="inherit">${val}</text>
    `);
  }

  // Build SVG polyline point strings
  const ptStr = arr => YEARS.map((_, i) => `${xPos(i).toFixed(1)},${yPos(arr[i]).toFixed(1)}`).join(" ");

  // Area fills
  const closedPath = (arr, col) => {
    const pts = YEARS.map((_, i) => `${xPos(i).toFixed(1)},${yPos(arr[i]).toFixed(1)}`).join(" ");
    const baseLeft  = `${PAD_L},${(PAD_T + chartH).toFixed(1)}`;
    const baseRight = `${(PAD_L + chartW).toFixed(1)},${(PAD_T + chartH).toFixed(1)}`;
    return `<polygon points="${baseLeft} ${pts} ${baseRight}" fill="${col}" fill-opacity="0.12"/>`;
  };

  // Endpoint labels
  const lastI   = YEARS.length - 1;
  const endLabels = [
    { arr: cumTotal,  col: SEV_COLOR.total,    dy: -8 },
    { arr: cumRestr,  col: SEV_COLOR.restrict,  dy: -8 },
    { arr: cumPro,    col: SEV_COLOR.pro,       dy: -8 },
  ].map(({ arr, col, dy }) => {
    const x = xPos(lastI), y = yPos(arr[lastI]);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${col}"/>
            <text x="${(x+6).toFixed(1)}" y="${(y+3).toFixed(1)}" font-size="9" fill="${col}" font-family="inherit" font-weight="600">${arr[lastI]}</text>`;
  }).join("");

  // X labels
  const xLabels = YEARS.map((yr, i) =>
    `<text x="${xPos(i).toFixed(1)}" y="${(PAD_T + chartH + 14).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="var(--text-muted)" font-family="inherit">${yr}</text>`
  ).join("");

  const legendW = 420;
  const lgItems = [
    { col: SEV_COLOR.total,   label: "Total (restrictions + incentives)" },
    { col: SEV_COLOR.restrict, label: "Active Restrictions (levels 1–4)" },
    { col: SEV_COLOR.pro,     label: "Pro-Business / Incentive Hubs" },
  ].map((d, i) => `<g transform="translate(${i * 140}, 0)">
    <line x1="0" y1="6" x2="14" y2="6" stroke="${d.col}" stroke-width="2"/>
    <circle cx="7" cy="6" r="2.5" fill="${d.col}"/>
    <text x="18" y="10" font-size="9" fill="var(--text-muted)" font-family="inherit">${d.label}</text>
  </g>`).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible" role="img" aria-label="Cumulative regulatory pressure chart">
      ${gridLines.join("")}
      ${closedPath(cumTotal,  SEV_COLOR.total)}
      ${closedPath(cumRestr,  SEV_COLOR.restrict)}
      ${closedPath(cumPro,    SEV_COLOR.pro)}
      <polyline points="${ptStr(cumTotal)}"  fill="none" stroke="${SEV_COLOR.total}"    stroke-width="2"   stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${ptStr(cumRestr)}"  fill="none" stroke="${SEV_COLOR.restrict}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${ptStr(cumPro)}"    fill="none" stroke="${SEV_COLOR.pro}"      stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
      ${endLabels}
      ${xLabels}
    </svg>
    <svg viewBox="0 0 ${legendW} 16" width="100%" style="max-width:${legendW}px;display:block;margin-top:6px" aria-hidden="true">
      ${lgItems}
    </svg>
    <p class="vel-note">Running total of counties with dated policy records, accumulated by year. Shows the compound trajectory of regulatory exposure — not just new enactments, but the cumulative count in effect at any point in time. Pre-2018 data is sparse; 2026 is partial-year.</p>
  `;
}

function _buildMonthlyHeatmapHtml(counties) {
  const YEARS  = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const restricCount = {};
  const proCount     = {};

  for (const fips in counties) {
    const c   = counties[fips];
    const raw = c.effective_date || c.date || "";
    if (!raw || raw.length < 7) continue;
    const yr  = parseInt(raw.slice(0, 4), 10);
    const mo  = parseInt(raw.slice(5, 7), 10);
    if (!YEARS.includes(yr) || mo < 1 || mo > 12) continue;
    const key = `${yr}-${mo}`;
    if (c.level >= 1)        restricCount[key] = (restricCount[key] || 0) + 1;
    else if (c.level === -1) proCount[key]     = (proCount[key]     || 0) + 1;
  }

  const maxR = Math.max(...Object.values(restricCount), 1);
  const maxP = Math.max(...Object.values(proCount),     1);

  function cellColor(count, type) {
    if (!count) return "var(--surface-2)";
    const frac = count / (type === 'r' ? maxR : maxP);
    if (type === 'r') {
      if (frac < 0.25) return "#fca5a5";
      if (frac < 0.50) return "#f87171";
      if (frac < 0.75) return "#ef4444";
      return "#dc2626";
    } else {
      if (frac < 0.25) return "#86efac";
      if (frac < 0.50) return "#4ade80";
      if (frac < 0.75) return "#22c55e";
      return "#16a34a";
    }
  }

  const CELL_W = 42, CELL_H = 21, GAP = 3;
  const PAD_L  = 42, PAD_T  = 20;
  const gridW  = 12 * (CELL_W + GAP) - GAP;
  const gridH  = YEARS.length * (CELL_H + GAP) - GAP;
  const W      = PAD_L + gridW + 16;
  const SEC_GAP = 40;
  const totalH = PAD_T + gridH + SEC_GAP + PAD_T + gridH + 12;

  const now        = new Date();
  const thisYear   = now.getFullYear();
  const thisMonth  = now.getMonth() + 1;

  function renderGrid(counts, type, offsetY) {
    const parts = [];
    MONTHS.forEach((m, mi) => {
      const x = PAD_L + mi * (CELL_W + GAP);
      parts.push(`<text x="${x + CELL_W / 2}" y="${offsetY - 5}" text-anchor="middle" font-size="9" fill="var(--text-muted)" font-family="inherit">${m}</text>`);
    });
    YEARS.forEach((yr, yi) => {
      const rowY = offsetY + yi * (CELL_H + GAP);
      parts.push(`<text x="${PAD_L - 6}" y="${rowY + CELL_H / 2 + 3}" text-anchor="end" font-size="9" fill="var(--text-muted)" font-family="inherit">${yr}</text>`);
      for (let mo = 1; mo <= 12; mo++) {
        const isFuture = yr > thisYear || (yr === thisYear && mo > thisMonth);
        const key      = `${yr}-${mo}`;
        const count    = isFuture ? 0 : (counts[key] || 0);
        const x        = PAD_L + (mo - 1) * (CELL_W + GAP);
        if (isFuture) {
          parts.push(`<rect x="${x}" y="${rowY}" width="${CELL_W}" height="${CELL_H}" rx="3" fill="var(--surface-2)" opacity="0.3"/>`);
          continue;
        }
        const fill    = cellColor(count, type);
        const tip     = `${MONTHS[mo - 1]} ${yr}${count ? `: ${count} enactment${count > 1 ? "s" : ""}` : ": no activity"}`;
        parts.push(`<rect x="${x}" y="${rowY}" width="${CELL_W}" height="${CELL_H}" rx="3" fill="${fill}"><title>${escHtml(tip)}</title></rect>`);
        if (count > 0) {
          const frac      = count / (type === 'r' ? maxR : maxP);
          const textFill  = frac >= 0.5 ? "#fff" : (type === 'r' ? "#7f1d1d" : "#14532d");
          parts.push(`<text x="${x + CELL_W / 2}" y="${rowY + CELL_H / 2 + 3.5}" text-anchor="middle" font-size="8.5" fill="${textFill}" font-weight="600" font-family="inherit" pointer-events="none">${count}</text>`);
        }
      }
    });
    return parts.join("");
  }

  const sec2Y = PAD_T + gridH + SEC_GAP;

  return `
    <p class="vel-note" style="margin-bottom:16px">Policy enactments per calendar month, Jan 2020 – present. Hover a cell for the exact count. Faded cells are future months. Months with no dated records are shown in the panel background color.</p>
    <div style="overflow-x:auto">
    <svg viewBox="0 0 ${W} ${totalH}" width="100%" style="min-width:420px;max-width:${W}px;display:block;overflow:visible" role="img" aria-label="Monthly policy enactment heatmap 2020–2026">
      <text x="${PAD_L}" y="11" font-size="9.5" font-weight="700" letter-spacing="0.06em" fill="var(--text-muted)" font-family="inherit">RESTRICTIONS (LEVEL 1–4)</text>
      ${renderGrid(restricCount, 'r', PAD_T)}
      <text x="${PAD_L}" y="${sec2Y - 8}" font-size="9.5" font-weight="700" letter-spacing="0.06em" fill="var(--text-muted)" font-family="inherit">PRO-BUSINESS / INCENTIVE PROGRAMS</text>
      ${renderGrid(proCount, 'p', sec2Y + PAD_T - 16)}
    </svg>
    </div>
  `;
}

function _buildRegulatoryMomentumHtml(counties) {
  const now       = new Date();
  const cutoff    = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const newRestrict = {};
  const newPro      = {};

  for (const fips in counties) {
    const c    = counties[fips];
    const date = c.effective_date || c.date || "";
    if (!date || date < cutoffStr) continue;
    const st = c.state || "Unknown";
    if ((c.level ?? 0) >= 1)   newRestrict[st] = (newRestrict[st] || 0) + 1;
    else if (c.level === -1)   newPro[st]      = (newPro[st]      || 0) + 1;
  }

  const topR   = Object.entries(newRestrict).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topP   = Object.entries(newPro).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totR   = Object.values(newRestrict).reduce((s, v) => s + v, 0);
  const totP   = Object.values(newPro).reduce((s, v) => s + v, 0);

  function renderList(rows, barColor, emptyMsg) {
    if (!rows.length) return `<div class="mom-empty">${escHtml(emptyMsg)}</div>`;
    const maxN = rows[0][1];
    return rows.map(([st, n], i) =>
      `<div class="mom-row">
        <div class="mom-rank">${i + 1}</div>
        <div class="mom-state">${escHtml(st)}</div>
        <div class="mom-bar-wrap"><div class="mom-bar" style="width:${Math.round(n / maxN * 100)}%;background:${barColor}"></div></div>
        <div class="mom-count">${n}</div>
      </div>`
    ).join("");
  }

  return `
    <p class="vel-note" style="margin-bottom:14px">States ranked by the number of new county-level policy enactments in the trailing 12 months, split by direction. Counties are counted once at their <em>effective_date</em>. Total: ${totR + totP} new enactments recorded.</p>
    <div class="mom-grid">
      <div class="mom-col">
        <div class="mom-col-hdr mom-hdr-restrict">Trending Restrictive <span class="mom-hdr-count">${totR} counties</span></div>
        <div class="mom-list">${renderList(topR, "#ef4444", "No new restrictions in the last 12 months.")}</div>
      </div>
      <div class="mom-col">
        <div class="mom-col-hdr mom-hdr-pro">Trending Pro-Business <span class="mom-hdr-count">${totP} counties</span></div>
        <div class="mom-list">${renderList(topP, "#22c55e", "No new incentive programs in the last 12 months.")}</div>
      </div>
    </div>
  `;
}

function _buildPolicyTimelineHtml(counties) {
  const SEV_COLORS = { "-1": "#16a34a", "0": "#6b7280", "1": "#86efac", "2": "#f97316", "3": "#dc2626", "4": "#7f1d1d" };
  const SEV_LABELS = { "-1": "Pro-Business Hub", "0": "No Restriction", "1": "Light", "2": "Moderate", "3": "Significant", "4": "Ban" };
  const TYPE_MAP   = { data_center: "DC", ai: "AI", energy: "Energy", crypto: "Crypto", water: "Water" };

  const entries = [];
  for (const fips in counties) {
    const c = counties[fips];
    const date = c.effective_date || c.date || c.last_updated || null;
    if (!date) continue;
    entries.push({ fips, name: c.name, state: c.state, level: String(c.level), date, types: c.types || [] });
  }

  if (!entries.length) {
    return `<p class="empty-note" style="font-size:12px;color:var(--text-muted);padding:8px 0;">No dated policy records available.</p>`;
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  const recent = entries.slice(0, 30);

  const rows = recent.map(e => {
    const col   = SEV_COLORS[e.level] || "#6b7280";
    const lbl   = SEV_LABELS[e.level] || "Unknown";
    const types = e.types.map(t => TYPE_MAP[t] || t).join(", ") || "—";
    return `<div class="ptl-row">
      <div class="ptl-date">${escHtml(e.date.slice(0, 10))}</div>
      <div class="ptl-dot-col"><div class="ptl-dot" style="background:${escHtml(col)}"></div><div class="ptl-line"></div></div>
      <div class="ptl-content">
        <div class="ptl-county">${escHtml(e.name)}, <span class="ptl-state">${escHtml(e.state)}</span></div>
        <div class="ptl-meta">
          <span class="ptl-badge" style="color:${escHtml(col)};border-color:${escHtml(col)}20;background:${escHtml(col)}12">${escHtml(lbl)}</span>
          <span class="ptl-types">${escHtml(types)}</span>
        </div>
      </div>
    </div>`;
  }).join("");

  const more = entries.length > 30 ? `<div class="ptl-more">+${entries.length - 30} older records not shown</div>` : "";
  return `<div class="ptl-list">${rows}${more}</div>`;
}

async function _fillPipelineStats() {
  const container = document.getElementById("analytics-pipeline-section");
  if (!container || !window.PIPELINE) return;

  const s = await window.PIPELINE.stats();
  if (!s) {
    container.innerHTML = `<div class="callout warning" style="margin:0">Pipeline data unavailable.</div>`;
    return;
  }

  const fmtMw = mw => {
    if (!mw) return "—";
    if (mw >= 1000) return (mw / 1000).toFixed(1).replace(/\.0$/, "") + " GW";
    return mw.toFixed(0) + " MW";
  };

  const operational = s.statusCounts["operational"] || 0;
  const construction = s.statusCounts["construction"] || 0;
  const planned      = s.statusCounts["planned"] || 0;

  const statusColors = { operational: "#22c55e", construction: "#f59e0b", planned: "#60a5fa", decommissioned: "#9ca3af", unknown: "#6b7280" };
  const typeColors   = { Hyperscale: "#4874e8", Colocation: "#a78bfa", Enterprise: "#34d399", Edge: "#f59e0b", "AI Campus": "#60a5fa" };

  const statusRows = Object.entries(s.statusCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({
    label: k.charAt(0).toUpperCase() + k.slice(1), count: v, key: k
  }));
  const typeRows = Object.entries(s.typeCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({
    label: k, count: v, key: k
  }));

  container.innerHTML = `
    <div class="analytics-kpi-grid" style="margin-bottom:20px">
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(72,116,232,0.12);color:#4874e8">${analyticsIcon('server')}</div>
        <div class="analytics-kpi-label">Total Projects</div>
        <div class="analytics-kpi-value">${s.total.toLocaleString()}</div>
        <div class="analytics-kpi-meta">tracked data centers</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e">${analyticsIcon('zap')}</div>
        <div class="analytics-kpi-label">Total Known Capacity</div>
        <div class="analytics-kpi-value">${fmtMw(s.totalMw)}</div>
        <div class="analytics-kpi-meta">${s.knownMwCount.toLocaleString()} projects with known MW</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e">${analyticsIcon('pro')}</div>
        <div class="analytics-kpi-label">Operational</div>
        <div class="analytics-kpi-value">${operational.toLocaleString()}</div>
        <div class="analytics-kpi-meta">live data centers</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">${analyticsIcon('clock')}</div>
        <div class="analytics-kpi-label">Under Construction</div>
        <div class="analytics-kpi-value">${construction.toLocaleString()}</div>
        <div class="analytics-kpi-meta">projects in construction</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(96,165,250,0.12);color:#60a5fa">${analyticsIcon('pipeline')}</div>
        <div class="analytics-kpi-label">Planned</div>
        <div class="analytics-kpi-value">${planned.toLocaleString()}</div>
        <div class="analytics-kpi-meta">announced projects</div>
      </div>
    </div>
    <div class="analytics-card-grid">
      <div class="analytics-card">
        <div class="analytics-card-header"><div class="analytics-card-title">By Status</div></div>
        <div class="analytics-card-body">
          ${barChart(statusRows, r => statusColors[r.key] || "#9ca3af")}
        </div>
      </div>
      <div class="analytics-card">
        <div class="analytics-card-header"><div class="analytics-card-title">By Facility Type</div></div>
        <div class="analytics-card-body">
          ${barChart(typeRows, r => typeColors[r.label] || "#9ca3af")}
        </div>
      </div>
      <div class="analytics-card">
        <div class="analytics-card-header"><div class="analytics-card-title">Top Operators by Count</div></div>
        <div class="analytics-card-body">
          ${barChart(s.topOperators.map(([label,count])=>({label,count})), () => "#4874e8")}
        </div>
      </div>
      <div class="analytics-card">
        <div class="analytics-card-header"><div class="analytics-card-title">Top States by Known MW</div></div>
        <div class="analytics-card-body">
          <div class="ranked-list">
            ${s.topStatesMw.map(([st,mw],i) => `
            <div class="ranked-item">
              <div class="rank-num">${i+1}</div>
              <div class="rank-name">${escHtml(st)}</div>
              <div class="rank-bar-wrap">
                <div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(mw/s.topStatesMw[0][1]*100)}%;background:#4874e8;--bar-delay:${i*40}ms"></div></div>
              </div>
              <div class="rank-count">${fmtMw(mw)}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

async function _fillPowerStats() {
  const container = document.getElementById("analytics-power-section");
  if (!container || !window.PIPELINE) return;

  const facilities = await window.PIPELINE.stats().then(() => window.PIPELINE.getData()).catch(() => null);
  if (!facilities) {
    container.innerHTML = `<div class="callout warning" style="margin:0">Power data unavailable.</div>`;
    return;
  }

  const fmtMw = mw => {
    if (!mw) return "—";
    if (mw >= 1000) return (mw / 1000).toFixed(1).replace(/\.0$/, "") + " GW";
    return Math.round(mw).toLocaleString() + " MW";
  };

  // Aggregate by state: total MW known + planned
  const stateKnown   = {};
  const statePlanned = {};
  const topMwFacilities = [];

  facilities.forEach(f => {
    const st = f.state_abbr || f.state || "?";
    if (f.capacity_mw_known > 0)   stateKnown[st]   = (stateKnown[st]   || 0) + f.capacity_mw_known;
    if (f.capacity_mw_planned > 0) statePlanned[st]  = (statePlanned[st] || 0) + f.capacity_mw_planned;
    if (f.capacity_mw_known > 0 || f.capacity_mw_planned > 0) topMwFacilities.push(f);
  });

  topMwFacilities.sort((a, b) => {
    const mwA = (a.capacity_mw_known || 0) + (a.capacity_mw_planned || 0);
    const mwB = (b.capacity_mw_known || 0) + (b.capacity_mw_planned || 0);
    return mwB - mwA;
  });

  const totalKnown   = Object.values(stateKnown).reduce((s,v) => s+v, 0);
  const totalPlanned = Object.values(statePlanned).reduce((s,v) => s+v, 0);
  const withMw       = facilities.filter(f => f.capacity_mw_known > 0).length;

  // Top 8 states by combined MW
  const topStatesMw = Object.keys(stateKnown).map(st => ({
    st, known: stateKnown[st] || 0, planned: statePlanned[st] || 0,
    total: (stateKnown[st] || 0) + (statePlanned[st] || 0),
  })).sort((a, b) => b.total - a.total).slice(0, 8);

  const maxTotal = topStatesMw[0] ? topStatesMw[0].total : 1;

  // Top 5 facilities by MW
  const top5 = topMwFacilities.slice(0, 5);

  const stateRows = topStatesMw.map((r, i) => {
    const knownPct   = Math.round(r.known / maxTotal * 100);
    const plannedPct = Math.round(r.planned / maxTotal * 100);
    return `<div class="ranked-item">
      <div class="rank-num">${i + 1}</div>
      <div class="rank-name">${escHtml(r.st)}</div>
      <div class="rank-bar-wrap" style="flex:1;display:flex;flex-direction:column;gap:2px">
        <div class="bar-track" style="flex:1">
          <div class="bar-fill" style="width:${knownPct}%;background:#22c55e;--bar-delay:${i*40}ms" title="Known: ${fmtMw(r.known)}"></div>
        </div>
        <div class="bar-track" style="flex:1">
          <div class="bar-fill" style="width:${plannedPct}%;background:#f59e0b;--bar-delay:${i*40+20}ms" title="Planned: ${fmtMw(r.planned)}"></div>
        </div>
      </div>
      <div class="rank-count">${fmtMw(r.total)}</div>
    </div>`;
  }).join("");

  const facilityRows = top5.map(f => {
    const mw = (f.capacity_mw_known || 0) + (f.capacity_mw_planned || 0);
    const knownPct = f.capacity_mw_known > 0 ? Math.round(f.capacity_mw_known / mw * 100) : 0;
    return `<div class="pw-facility-row">
      <div class="pw-facility-name">${escHtml(f.name || "Unknown")}</div>
      <div class="pw-facility-loc">${escHtml([f.city, f.state_abbr].filter(Boolean).join(", "))}</div>
      <div class="pw-facility-bar">
        <div class="bar-track" style="flex:1">
          <div class="bar-fill" style="width:${knownPct}%;background:#22c55e" title="Known: ${fmtMw(f.capacity_mw_known)}"></div>
        </div>
      </div>
      <div class="pw-facility-mw">${fmtMw(mw)}</div>
    </div>`;
  }).join("");

  container.innerHTML = `
    <div class="power-intel-note callout info" style="margin-bottom:16px;font-size:12px">
      Power capacity data is derived from the facility pipeline. Figures represent known and announced
      megawatt draw from public sources. Infrastructure points (substations, plants) are a sample set only.
    </div>
    <div class="analytics-kpi-grid" style="margin-bottom:20px">
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e">${analyticsIcon('zap')}</div>
        <div class="analytics-kpi-label">Known IT Load</div>
        <div class="analytics-kpi-value">${fmtMw(totalKnown)}</div>
        <div class="analytics-kpi-meta">${withMw.toLocaleString()} facilities with known MW</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">${analyticsIcon('pipeline')}</div>
        <div class="analytics-kpi-label">Planned Capacity</div>
        <div class="analytics-kpi-value">${fmtMw(totalPlanned)}</div>
        <div class="analytics-kpi-meta">announced but not yet operational</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(72,116,232,0.12);color:#4874e8">${analyticsIcon('server')}</div>
        <div class="analytics-kpi-label">Combined Pipeline</div>
        <div class="analytics-kpi-value">${fmtMw(totalKnown + totalPlanned)}</div>
        <div class="analytics-kpi-meta">known + planned IT load</div>
      </div>
    </div>
    <div class="analytics-card-grid">
      <div class="analytics-card">
        <div class="analytics-card-header">
          <div class="analytics-card-title">Top States by Capacity</div>
          <div class="analytics-card-legend">
            <span class="pw-legend-dot" style="background:#22c55e"></span> Known
            <span class="pw-legend-dot" style="background:#f59e0b;margin-left:8px"></span> Planned
          </div>
        </div>
        <div class="analytics-card-body">
          <div class="ranked-list">${stateRows}</div>
        </div>
      </div>
      <div class="analytics-card">
        <div class="analytics-card-header"><div class="analytics-card-title">Largest Facilities by MW</div></div>
        <div class="analytics-card-body">
          <div class="pw-facility-list">${facilityRows}</div>
          <div class="pw-disclaimer" style="font-size:11px;color:var(--text-muted);margin-top:10px">
            Known + planned capacity combined. Top 5 of ${topMwFacilities.length.toLocaleString()} facilities with MW data.
          </div>
        </div>
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────────────────────── */
/* Development Scenario Builder                                      */
/* ─────────────────────────────────────────────────────────────── */

const SCENARIO_PROFILES = [
  {
    id: "hyperscale",
    label: "Hyperscale Campus",
    desc: "Optimizes for zero regulatory friction and stable long-term political environment.",
    icon: "server",
    color: "#4874e8",
    weights: { reg: 0.60, pol: 0.30, scope: 0.10 },
  },
  {
    id: "colocation",
    label: "Colocation Facility",
    desc: "Balanced approach — regulatory clarity matters most, political risk a secondary concern.",
    icon: "pipeline",
    color: "#a78bfa",
    weights: { reg: 0.50, pol: 0.25, scope: 0.25 },
  },
  {
    id: "edge",
    label: "Edge Deployment",
    desc: "Distributed sites tolerate moderate restrictions if scope is narrow.",
    icon: "zap",
    color: "#34d399",
    weights: { reg: 0.35, pol: 0.20, scope: 0.45 },
  },
  {
    id: "ai_campus",
    label: "AI Campus",
    desc: "Zero tolerance for AI-specific legislation; political signals weighted heavily.",
    icon: "pro",
    color: "#f59e0b",
    weights: { reg: 0.45, pol: 0.40, scope: 0.15 },
  },
];

function _scenarioScore(fips, county, weights) {
  if (typeof computeSuitabilityScore !== "function") return null;
  const base = computeSuitabilityScore(fips, county);
  if (!base) return null;
  const { reg, pol, scope } = weights;
  const [f0, f1, f2] = base.factors;
  const raw = (f0.pts / f0.max) * reg * 100
            + (f1.pts / f1.max) * pol * 100
            + (f2.pts / f2.max) * scope * 100;
  const score = Math.round(Math.min(100, raw));
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : score >= 25 ? "D" : "F";
  const label = { A: "Highly Suitable", B: "Suitable", C: "Proceed with Caution", D: "High Risk", F: "Not Suitable" }[grade];
  return { score, grade, label, base };
}

function _renderScenarioBuilder() {
  const container = document.getElementById("analytics-scenario-section");
  if (!container) return;

  if (typeof mapData === "undefined" || !Object.keys(mapData).length) {
    container.innerHTML = `<div class="callout warning" style="margin:0">Policy data not yet loaded. Navigate to the map first, then return to Analytics.</div>`;
    return;
  }

  if (typeof computeSuitabilityScore !== "function") {
    container.innerHTML = `<div class="callout warning" style="margin:0">Suitability scoring unavailable.</div>`;
    return;
  }

  function renderProfile(profile) {
    const results = [];
    for (const fips in mapData) {
      const county = mapData[fips];
      const s = _scenarioScore(fips, county, profile.weights);
      if (s) results.push({ fips, county, s });
    }
    results.sort((a, b) => b.s.score - a.s.score);
    const top10 = results.slice(0, 10);

    const gradeColors = { A: "#22c55e", B: "#22d3ee", C: "#eab308", D: "#f97316", F: "#ef4444" };
    const rows = top10.map((r, i) => {
      const col = gradeColors[r.s.grade] || "#4874e8";
      return `<div class="scenario-county-row" data-fips="${escHtml(r.fips)}">
        <div class="scenario-rank">${i + 1}</div>
        <div class="scenario-county-info">
          <div class="scenario-county-name">${escHtml(r.county.name || r.fips)}</div>
          <div class="scenario-county-state">${escHtml(r.county.state || "")}</div>
        </div>
        <div class="scenario-bar-wrap">
          <div class="bar-track"><div class="bar-fill" style="width:${r.s.score}%;background:${col};--bar-delay:${i*40}ms"></div></div>
        </div>
        <div class="scenario-grade" style="color:${col}">${r.s.grade}</div>
        <div class="scenario-score">${r.s.score}</div>
      </div>`;
    }).join("");

    const wt = profile.weights;
    const wtBars = [
      { label: "Regulatory", pct: Math.round(wt.reg * 100), col: "#4874e8" },
      { label: "Political",  pct: Math.round(wt.pol * 100), col: "#f59e0b" },
      { label: "Scope",      pct: Math.round(wt.scope * 100), col: "#a78bfa" },
    ].map(w => `<div class="scenario-wt-row">
      <div class="scenario-wt-label">${w.label}</div>
      <div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${w.pct}%;background:${w.col}"></div></div>
      <div class="scenario-wt-pct">${w.pct}%</div>
    </div>`).join("");

    return `<div class="scenario-results" id="scenario-results-${profile.id}">
      <div class="scenario-weights-panel">
        <div class="scenario-weights-title">Factor Weights</div>
        ${wtBars}
      </div>
      <div class="scenario-county-list">${rows || '<div class="empty-note">No matching counties.</div>'}</div>
    </div>`;
  }

  const tabs = SCENARIO_PROFILES.map((p, i) =>
    `<button class="scenario-tab${i === 0 ? " active" : ""}" data-scenario="${p.id}" style="${i === 0 ? `--tab-col:${p.color}` : ''}">
      ${analyticsIcon(p.icon)}
      ${escHtml(p.label)}
    </button>`
  ).join("");

  container.innerHTML = `
    <div class="scenario-intro">
      Select a development profile to see the top-ranked counties under that scenario's weighting of
      regulatory, political, and scope risk factors.
    </div>
    <div class="scenario-tabs">${tabs}</div>
    <div class="scenario-profile-desc" id="scenario-profile-desc">${escHtml(SCENARIO_PROFILES[0].desc)}</div>
    <div id="scenario-profile-content">${renderProfile(SCENARIO_PROFILES[0])}</div>`;

  container.querySelectorAll(".scenario-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".scenario-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const pid = btn.dataset.scenario;
      const prof = SCENARIO_PROFILES.find(p => p.id === pid);
      if (!prof) return;
      btn.style.setProperty("--tab-col", prof.color);
      document.getElementById("scenario-profile-desc").textContent = prof.desc;
      document.getElementById("scenario-profile-content").innerHTML = renderProfile(prof);
    });
  });

  container.querySelectorAll(".scenario-county-row").forEach(row => {
    row.addEventListener("click", () => {
      const fips = row.dataset.fips;
      if (fips && typeof switchTab === "function") switchTab("map");
      if (fips && typeof selectCounty === "function") selectCounty(fips);
    });
  });
}

/* Regional fiber datasets wired into the parcel proximity engine
   (js/parcel/proximity-layers.js). Both are LIVE query sources — no local
   copy is stored — so this section queries each one's real feature count
   at page-load time via returnCountOnly, the same public ArcGIS REST
   endpoints the parcel engine itself queries. A failed count query
   degrades to "count unavailable right now", never a fabricated number. */
const FIBER_REGIONS = [
  {
    id: "ca-middle-mile",
    name: "California middle-mile broadband corridor",
    scope: "SCAG region only — Los Angeles, Orange, Riverside, San Bernardino, Ventura, Imperial counties",
    publisher: "California Public Utilities Commission, republished by SCAG",
    caveat: "This is a PLANNED/SELECTED corridor alignment, not confirmed as-built lit fiber.",
    countUrl: "https://maps.scag.ca.gov/scaggis/rest/services/Broadband/Broadband/MapServer/2/query?where=1%3D1&returnCountOnly=true&f=json",
  },
  {
    id: "tx-fiberlight",
    name: "Texas Fiberlight fiber network",
    scope: "Texas only — 9 real markets (Austin, Dallas-Fort Worth, El Paso, Houston, Panhandle, San Antonio, South Texas, Waco, West Texas)",
    publisher: "Fiberlight (commercial carrier), published via TxDOT's ArcGIS hosted feature service",
    caveat: "ONE CARRIER'S network, not all Texas fiber, and a dated snapshot (“clip received on 3/15/22” per the source), not continuously refreshed.",
    countUrl: "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/Fiberlight_Network/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json",
  },
];

async function _fillFiberStats() {
  const container = document.getElementById("analytics-fiber-section");
  if (!container) return;

  const counts = await Promise.all(FIBER_REGIONS.map(async r => {
    try {
      const res = await fetch(r.countUrl);
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.count === "number" ? data.count : null;
    } catch (_) {
      return null;
    }
  }));

  const regionCards = FIBER_REGIONS.map((r, i) => {
    const count = counts[i];
    const countLabel = count === null
      ? '<span class="fiber-count-unavailable">count unavailable right now</span>'
      : `<strong>${count.toLocaleString()}</strong> real segments (live count)`;
    return `<div class="fiber-route-card">
      <div class="fiber-route-header">
        <div class="fiber-route-icon">${analyticsIcon('fiber')}</div>
        <div class="fiber-route-name">${escHtml(r.name)}</div>
        <div class="fiber-sample-badge">REGIONAL</div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin:6px 0 8px">
        ${countLabel} &middot; ${escHtml(r.publisher)}
      </div>
      <div style="font-size:12px;margin-bottom:4px"><strong>Coverage:</strong> ${escHtml(r.scope)}</div>
      <div style="font-size:11.5px;color:var(--text-muted)">${escHtml(r.caveat)}</div>
    </div>`;
  }).join("");

  container.innerHTML = `
    <div class="callout info" style="margin-bottom:16px;font-size:12px">
      No free nationwide as-built fiber dataset exists, so the nationwide fiber layer stays
      honestly unavailable everywhere on this platform. These are two narrower, real, regional
      additions instead of a fabricated national claim — each queried live from its own public
      government-hosted service, not stored or cached locally.
    </div>
    <div class="fiber-routes-grid">${regionCards}</div>`;
}

/* Grid Readiness v1 (data/generate_grid_readiness.py) is the platform's
   most complete real "is this county commercially ready" screening
   signal so far — a disclosed, omission-aware weighted score over real
   substation and interconnection-queue data (see docs/GRID_READINESS.md
   for full methodology). This section surfaces it nationally rather than
   only on individual jurisdiction pages. County names come from
   data/economy/census_county.json (3,222 counties) since grid_readiness.json
   itself is keyed by FIPS only, to keep the same real-source discipline as
   every other cross-reference on this page. */
async function _fillGridReadinessStats() {
  const container = document.getElementById("analytics-grid-readiness-section");
  if (!container) return;

  let readiness, namesDoc;
  try {
    [readiness, namesDoc] = await Promise.all([
      fetch("data/grid_readiness.json").then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch("data/economy/census_county.json").then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).catch(() => null),
    ]);
  } catch (_) {
    container.innerHTML = `<div class="callout warning" style="margin:0">Grid readiness data unavailable.</div>`;
    return;
  }

  const names = (namesDoc && namesDoc.counties) || {};
  const counties = readiness.counties || {};
  const fipsList = Object.keys(counties);
  const scored = fipsList.map(fips => ({ fips, ...counties[fips] })).filter(c => typeof c.overall === "number");

  const meanOverall = scored.length
    ? Math.round(scored.reduce((s, c) => s + c.overall, 0) / scored.length * 10) / 10
    : 0;
  const queueAvailable = !!(readiness.meta && readiness.meta.interconnection_queue_data_available);
  const highConfidence = scored.filter(c => c.confidence === "high").length;

  const top15 = scored.slice().sort((a, b) => b.overall - a.overall).slice(0, 15);
  const maxOverall = top15.length ? top15[0].overall : 100;

  const rankRows = top15.map((c, i) => {
    const rec = names[c.fips] || {};
    const label = rec.name ? `${rec.name}${rec.state ? ", " + rec.state : ""}` : `FIPS ${c.fips}`;
    const pct = maxOverall ? Math.round(c.overall / maxOverall * 100) : 0;
    return `<div class="ranked-item">
      <div class="rank-num">${i + 1}</div>
      <div class="rank-name">${escHtml(label)}</div>
      <div class="rank-bar-wrap" style="flex:1">
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:#22c55e;--bar-delay:${i * 30}ms" title="${escHtml(String(c.confidence || ""))} confidence"></div>
        </div>
      </div>
      <div class="rank-count">${Math.round(c.overall)}/100</div>
    </div>`;
  }).join("");

  container.innerHTML = `
    <div class="callout info" style="margin-bottom:16px;font-size:12px">
      Grid Readiness v1 is a county-level screening score over real mapped substation infrastructure
      and interconnection-queue activity — see
      <a href="docs/GRID_READINESS.md" target="_blank" rel="noopener noreferrer">the methodology doc</a>
      for exactly how each component is computed and what is deliberately not yet included
      (transmission-line and ISO/RTO proximity). It is not a statement about available capacity or
      utility willingness to serve.
    </div>
    <div class="analytics-kpi-grid" style="margin-bottom:20px">
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e">${analyticsIcon('county')}</div>
        <div class="analytics-kpi-label">Counties Scored</div>
        <div class="analytics-kpi-value">${scored.length.toLocaleString()}</div>
        <div class="analytics-kpi-meta">appearing in at least one real dataset</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(96,165,250,0.12);color:#60a5fa">${analyticsIcon('zap')}</div>
        <div class="analytics-kpi-label">Mean Overall Score</div>
        <div class="analytics-kpi-value">${meanOverall}</div>
        <div class="analytics-kpi-meta">out of 100, across all scored counties</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">${analyticsIcon('pro')}</div>
        <div class="analytics-kpi-label">High Confidence</div>
        <div class="analytics-kpi-value">${highConfidence.toLocaleString()}</div>
        <div class="analytics-kpi-meta">counties with both components available</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:${queueAvailable ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'};color:${queueAvailable ? '#22c55e' : '#ef4444'}">${analyticsIcon('pipeline')}</div>
        <div class="analytics-kpi-label">Interconnection Data</div>
        <div class="analytics-kpi-value">${queueAvailable ? "Available" : "Omitted"}</div>
        <div class="analytics-kpi-meta">${queueAvailable ? "this run's interconnection component was scored" : "component omitted, weight renormalized"}</div>
      </div>
    </div>
    <div class="page-section-subtitle" style="font-size:12.5px;color:var(--text-muted);margin-bottom:8px">
      Top 15 counties by overall Grid Readiness score
    </div>
    <div class="ranked-list">${rankRows}</div>`;
}

/* data/parcel_coverage_metrics.json is entirely derived (see that file's own
   generator, data/parcel_pipeline/generate_coverage_metrics.mjs) from
   js/parcel/registry.js + data/parcel_source_catalog.json +
   data/facilities_index.json, and was already regenerated on every relevant
   PR this session — but until now nothing rendered it: it fed only a docs
   file (docs/PARCEL_COVERAGE.md) and a CI --check gate, never the product.
   This section is the missing consumer, following the same
   fetch-JSON/compute/innerHTML pattern as Grid Readiness above it. */
async function _fillParcelCoverageStats() {
  const container = document.getElementById("analytics-parcel-coverage-section");
  if (!container) return;

  let metrics;
  try {
    metrics = await fetch("data/parcel_coverage_metrics.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  } catch (_) {
    container.innerHTML = `<div class="callout warning" style="margin:0">Parcel coverage data unavailable.</div>`;
    return;
  }

  const cov = metrics.coverage || {};
  const tiers = metrics.tierDistribution || {};
  const opportunities = Array.isArray(metrics.opportunities) ? metrics.opportunities : [];

  const TIER_COLORS = {
    "full-intelligence": "#22c55e", rich: "#4ade80", standard: "#60a5fa",
    basic: "#f59e0b", "boundary-only": "#94a3b8", degraded: "#f97316",
    blocked: "#ef4444", unsupported: "#64748b",
  };
  const tierOrder = ["full-intelligence", "rich", "standard", "basic", "boundary-only", "degraded", "blocked", "unsupported"];
  const tierTotal = tierOrder.reduce((s, t) => s + (tiers[t] || 0), 0) || 1;
  const tierBar = tierOrder.filter(t => tiers[t] > 0).map(t => {
    const pct = Math.round((tiers[t] || 0) / tierTotal * 100);
    return `<div style="width:${pct}%;background:${TIER_COLORS[t] || "#64748b"}" title="${escHtml(t)}: ${tiers[t]} jurisdiction(s)"></div>`;
  }).join("");
  const tierLegend = tierOrder.filter(t => tiers[t] > 0).map(t =>
    `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:14px;font-size:11px;color:var(--text-muted)">
      <span style="width:8px;height:8px;border-radius:2px;background:${TIER_COLORS[t] || "#64748b"};display:inline-block"></span>
      ${escHtml(t)} (${tiers[t]})
    </span>`).join("");

  const topOpp = opportunities.slice().sort((a, b) => (b.facilities || 0) - (a.facilities || 0)).slice(0, 12);
  const maxFac = topOpp.length ? Math.max(...topOpp.map(o => o.facilities || 0)) : 1;
  const EFFORT_COLOR = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
  const oppRows = topOpp.map((o, i) => {
    const pct = maxFac ? Math.round((o.facilities || 0) / maxFac * 100) : 0;
    const label = `${o.name}${o.state ? ", " + o.state : ""}`;
    return `<div class="ranked-item">
      <div class="rank-num">${i + 1}</div>
      <div class="rank-name">${escHtml(label)}</div>
      <div class="rank-bar-wrap" style="flex:1">
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${EFFORT_COLOR[o.effort] || "#94a3b8"}" title="${escHtml(o.status || "")} — ${escHtml(o.effort || "unknown")} effort"></div>
        </div>
      </div>
      <div class="rank-count">${(o.facilities || 0).toLocaleString()}</div>
    </div>`;
  }).join("");

  container.innerHTML = `
    <div class="callout info" style="margin-bottom:16px;font-size:12px">
      Facility-weighted coverage counts real data centers sitting inside a jurisdiction with a
      configured parcel source, not raw county counts — a handful of counties (Loudoun VA among
      them) hold more facilities than most states, so plain "N of 3,143 counties" understates
      how much of the real footprint is covered. See
      <a href="docs/PARCEL_COVERAGE.md" target="_blank" rel="noopener noreferrer">the full coverage report</a>
      for per-field depth and the complete opportunity queue. This is an engineering coverage
      signal, not a measure of data accuracy or freshness.
    </div>
    <div class="analytics-kpi-grid" style="margin-bottom:20px">
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e">${analyticsIcon('county')}</div>
        <div class="analytics-kpi-label">Production Jurisdictions</div>
        <div class="analytics-kpi-value">${(cov.productionJurisdictions || 0).toLocaleString()}</div>
        <div class="analytics-kpi-meta">of ${(cov.cataloguedJurisdictions || 0).toLocaleString()} catalogued</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(96,165,250,0.12);color:#60a5fa">${analyticsIcon('zap')}</div>
        <div class="analytics-kpi-label">Facility-Weighted Coverage</div>
        <div class="analytics-kpi-value">${cov.facilityWeightedCoveragePct != null ? cov.facilityWeightedCoveragePct + "%" : "—"}</div>
        <div class="analytics-kpi-meta">${(cov.facilitiesInCoveredJurisdictions || 0).toLocaleString()} of ${(cov.totalFacilities || 0).toLocaleString()} facilities</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">${analyticsIcon('pro')}</div>
        <div class="analytics-kpi-label">Jurisdiction Coverage</div>
        <div class="analytics-kpi-value">${cov.jurisdictionCoveragePct != null ? cov.jurisdictionCoveragePct + "%" : "—"}</div>
        <div class="analytics-kpi-meta">of ${(cov.facilityBearingJurisdictions || 0).toLocaleString()} facility-bearing jurisdictions</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(239,68,68,0.12);color:#ef4444">${analyticsIcon('server')}</div>
        <div class="analytics-kpi-label">Unattributed Facilities</div>
        <div class="analytics-kpi-value">${(cov.facilitiesUnattributed || 0).toLocaleString()}</div>
        <div class="analytics-kpi-meta">in jurisdictions with no configured source</div>
      </div>
    </div>
    ${tierOrder.some(t => tiers[t] > 0) ? `
    <div class="page-section-subtitle" style="font-size:12.5px;color:var(--text-muted);margin-bottom:8px">
      Jurisdictions by data-depth tier
    </div>
    <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin-bottom:8px">${tierBar}</div>
    <div style="margin-bottom:20px">${tierLegend}</div>` : ""}
    ${oppRows ? `
    <div class="page-section-subtitle" style="font-size:12.5px;color:var(--text-muted);margin-bottom:8px">
      Top uncovered opportunities by facility count (bar color = investigation effort: green=low, amber=medium, red=high)
    </div>
    <div class="ranked-list">${oppRows}</div>` : ""}`;
}

/* ─────────────────────────────────────────────────────────────── */
/* About Page                                                        */
/* ─────────────────────────────────────────────────────────────── */

function renderAboutPage() {
  const el = document.getElementById('about-view');
  if (!el || el.dataset.built === '1') return;
  el.dataset.built = '1';

  el.innerHTML = `
    <div class="page-hero">
      <h2 class="page-hero-title">About the <span>Platform</span></h2>
      <div class="page-hero-sub">The US Data Center &amp; AI Policy Tracker is an open-source intelligence platform that monitors state and county-level regulations affecting artificial intelligence deployment and data center infrastructure across all 50 US states.</div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Mission &amp; Scope</div>
      <div class="about-two-col">
        <div class="about-card">
          <div class="about-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Mission
          </div>
          <p>To provide infrastructure decision-makers, policy researchers, and technology teams with a single source of truth for data center and AI regulatory activity across the United States.</p>
          <p>This platform tracks where AI is being restricted, where it is being incentivized, and what is in the regulatory pipeline — so teams can make informed decisions about where to deploy infrastructure.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            Coverage
          </div>
          <ul>
            <li>County-level data center construction restrictions</li>
            <li>State AI deployment and use regulations</li>
            <li>Energy and grid impact requirements</li>
            <li>Water use restrictions affecting facilities</li>
            <li>Crypto/high-intensity computing moratoriums</li>
            <li>Active tax incentive and enterprise zones</li>
            <li>Planned and existing data center infrastructure</li>
            <li>AI campus and hyperscaler deployments</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="page-section" id="methodology-section">
      <div class="page-section-title">Methodology</div>
      <!-- Live coverage + data-quality figures, populated from
           data/platform_metadata.json by renderDataQualityPanel(). -->
      <div id="about-data-quality"></div>
      <div class="about-two-col">
        <div class="about-card">
          <div class="about-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Data Collection
          </div>
          <p>All policy data is manually researched and verified from primary government sources including state legislature databases, county council records, utility commission filings, and official government websites.</p>
          <p>Each record receives a confidence score (Verified / High / Medium / Low) based on the tier of source used and corroboration across multiple sources.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Update Frequency
          </div>
          <ul>
            <li><strong>AI News feed:</strong> Every hour via automated aggregation</li>
            <li><strong>County policy data:</strong> Manually updated as laws change</li>
            <li><strong>State regulations:</strong> Reviewed quarterly and on major changes</li>
            <li><strong>Infrastructure data:</strong> Updated quarterly from public filings</li>
            <li><strong>AI Stock data:</strong> Quotes via TradingView, delayed 15 minutes</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Data Sources</div>
      <div class="about-card" style="margin-bottom:18px">
        <table class="sources-table">
          <thead>
            <tr>
              <th style="width:200px">Source</th>
              <th>Type</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><span class="src-name">State legislature databases</span></td><td class="callout-body">Statutory law, pending bills, regulatory filings</td><td><span class="src-freq">Quarterly</span></td></tr>
            <tr><td><span class="src-name">County council records</span></td><td class="callout-body">Zoning decisions, moratoriums, resolutions</td><td><span class="src-freq">As needed</span></td></tr>
            <tr><td><span class="src-name">FERC / State PUCs</span></td><td class="callout-body">Power interconnection, utility territory data</td><td><span class="src-freq">Quarterly</span></td></tr>
            <tr><td><span class="src-name">Google News RSS</span></td><td class="callout-body">AI industry news, policy announcements</td><td><span class="src-freq">Hourly</span></td></tr>
            <tr><td><span class="src-name">TradingView</span></td><td class="callout-body">AI company stock data (delayed 15 min, not investment advice)</td><td><span class="src-freq">Delayed 15 min</span></td></tr>
            <tr><td><span class="src-name">US Census TIGER/Line</span></td><td class="callout-body">County boundary geometry for choropleth map</td><td><span class="src-freq">Annual</span></td></tr>
            <tr><td><span class="src-name">Water utility reports</span></td><td class="callout-body">Water availability stress indices by county</td><td><span class="src-freq">Annual</span></td></tr>
            <tr><td><span class="src-name">Federal Reserve Economic Data (FRED)</span></td><td class="callout-body">National economic indicators — rates, credit, inflation, housing starts, energy prices</td><td><span class="src-freq">Daily pipeline run</span></td></tr>
            <tr><td><span class="src-name">US Census Bureau (ACS 5-Year Estimates)</span></td><td class="callout-body">County/state demographics, income, housing, labor force, broadband — 13 metrics</td><td><span class="src-freq">Annual vintage</span></td></tr>
            <tr><td><span class="src-name">US Census Bureau (Building Permits Survey)</span></td><td class="callout-body">County-level residential construction activity, via FRED's per-county series</td><td><span class="src-freq">Monthly (30-day gate)</span></td></tr>
            <tr><td><span class="src-name">US Energy Information Administration (EIA)</span></td><td class="callout-body">State industrial electricity retail price — the standard site-selection proxy for a large power buyer</td><td><span class="src-freq">Monthly (30-day gate)</span></td></tr>
            <tr><td><span class="src-name">US Bureau of Labor Statistics (QCEW)</span></td><td class="callout-body">County average weekly wage, covered employment — needs no API key</td><td><span class="src-freq">Annual (90-day gate)</span></td></tr>
          </tbody>
        </table>
      </div>
      <div id="about-economic-sources"></div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Roadmap</div>
      <div class="about-card">
        <div class="roadmap-list">
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Interactive County Policy Map</div>
              <div class="roadmap-desc">Leaflet.js choropleth with 98+ tracked jurisdictions, severity scale, and detailed county panels.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">AI News Feed</div>
              <div class="roadmap-desc">Hourly aggregated AI policy and industry news with category filters and article detail panels.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">AI Stocks Dashboard</div>
              <div class="roadmap-desc">44 publicly traded AI companies with TradingView charts (delayed 15 min), watchlist, and market heatmap.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Analytics Dashboard</div>
              <div class="roadmap-desc">Policy distribution, state rankings, and coverage summary derived from manually researched data.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Infrastructure Pipeline Database</div>
              <div class="roadmap-desc">3,700+ tracked data center and AI campus projects with searchable table, filters, detail panels, and CSV export.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Policy Simulator</div>
              <div class="roadmap-desc">County attractiveness scoring with "what if restriction removed" scenario modeling in the detail panel.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Due-Diligence Report Generator</div>
              <div class="roadmap-desc">One-click printable county intelligence reports covering policy, risk, water, incentives, and pipeline data.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Parcel Intelligence</div>
              <div class="roadmap-desc">Live parcel data for ${window.PARCEL_REGISTRY ? window.PARCEL_REGISTRY.all().length : 5} counties with DC feasibility scoring, zoning analysis, and proximity assessment.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Political Risk &amp; Water Stress Layers</div>
              <div class="roadmap-desc">Algorithmically-scored political risk and water stress overlays for 100+ counties on the main map.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot planned"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Public API</div>
              <div class="roadmap-desc">REST API for developers to query policy data by FIPS code, state, or restriction type.</div>
            </div>
            <span class="roadmap-badge planned">Planned</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot planned"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Email Alerts</div>
              <div class="roadmap-desc">Subscribe to state or county policy updates delivered directly to your inbox.</div>
            </div>
            <span class="roadmap-badge planned">Planned</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot planned"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Opportunity Zone &amp; FEMA Flood Integration</div>
              <div class="roadmap-desc">Federal Opportunity Zones and FEMA NFHL flood zone boundaries integrated as map layers.</div>
            </div>
            <span class="roadmap-badge planned">Planned</span>
          </div>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Known Limitations</div>
      <div class="about-two-col">
        <div class="about-card">
          <div class="about-card-title">Coverage Gaps</div>
          <ul>
            <li>Only counties with confirmed policy activity are tracked — thousands of counties with no known restrictions are not shown</li>
            <li>City and municipal ordinances are partially covered; this is an active area of expansion</li>
            <li>Proposed legislation may change or fail to pass</li>
            <li>Some rural jurisdictions lack digitized public records</li>
          </ul>
        </div>
        <div class="about-card">
          <div class="about-card-title">Data Freshness</div>
          <ul>
            <li>Policy data reflects the last manual update and may lag real-world changes by days or weeks</li>
            <li>News articles are aggregated automatically and may contain duplicate or low-quality sources</li>
            <li>AI stock data is delayed approximately 15 minutes and is for research purposes only</li>
            <li>Infrastructure data (data centers, AI campuses) is sample data and not comprehensive</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="callout warning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div class="callout-body">
          <strong>Disclaimer:</strong> This platform is for research and informational purposes only. Policy information may be incomplete, outdated, or inaccurate. This is not legal advice. Always consult primary sources and legal counsel before making decisions based on this data. Market data on the AI Stocks tab is delayed and is not investment advice.
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Open Source</div>
      <div class="about-card">
        <div class="about-card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          GitHub Repository
        </div>
        <p>This project is open source. Contributions, issue reports, and data corrections are welcome.</p>
        <p><a href="https://github.com/bobbytrenkamp-lgtm/test1" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:none;font-weight:600">github.com/bobbytrenkamp-lgtm/test1 →</a></p>
      </div>
    </div>

    <div id="about-footer-target"></div>
  `;

  renderPageFooter('about-footer-target');
  renderDataQualityPanel();
  renderEconomicSourcesPanel();
}

/* ── Economic Intelligence sources panel ─────────────────────────────────
   The static Data Sources table above is honest about frequency but cannot
   say whether a source actually ran, when, or how much it covers -- that
   only exists as live pipeline output. Reads economic_metadata.json (via
   window.ECONOMY, the same cached fetch every other economy surface uses,
   so this costs nothing extra) and renders each source's real availability,
   last successful update, and coverage count, plus the sources array the
   pipeline already writes (publisher, URL, update cadence, attribution
   note) rather than re-describing them by hand a second time. Scoped to
   the Economic Intelligence pipeline specifically -- the policy/GIS sources
   above have no equivalent machine-readable provenance to read yet. */
function renderEconomicSourcesPanel() {
  const host = document.getElementById('about-economic-sources');
  if (!host || !window.ECONOMY) return;
  const E = window.ECONOMY;

  E.load('meta').then(meta => {
    if (!meta || !meta.generated_at) {
      host.innerHTML = `<div class="about-card" style="margin-bottom:0">
        <p style="font-size:12.5px;color:var(--text-muted);margin:0">
          Economic Intelligence pipeline status is unavailable until the first
          data run completes.</p></div>`;
      return;
    }

    const fmtWhen = (iso) => iso ? new Date(iso).toLocaleDateString('en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }) : 'never';

    const row = (name, available, when, coverage) => `
      <tr>
        <td><span class="src-name">${escHtml(name)}</span></td>
        <td><span class="econ-src-status econ-src-status-${available ? 'ok' : 'off'}">
          ${available ? '● available' : '○ not yet available'}</span></td>
        <td>${escHtml(fmtWhen(when))}</td>
        <td>${coverage != null ? escHtml(coverage.toLocaleString()) : '—'}</td>
      </tr>`;

    const rows = [
      row('US Census ACS (demographics)', !!meta.census && !!meta.census.last_successful_update,
          meta.census && meta.census.last_successful_update, meta.county_count),
      row('Building Permits Survey', meta.permits_available,
          meta.permits_last_successful_update, meta.permits_county_count),
      row('EIA electricity price', meta.eia_available,
          meta.eia_last_successful_update, meta.eia_state_count),
      row('BLS QCEW average wage', meta.bls_available,
          meta.bls_last_successful_update, meta.bls_county_count),
    ].join('');

    const attribution = Array.isArray(meta.sources) ? meta.sources.map(s => `
      <div class="econ-src-attr">
        <div class="econ-src-attr-name">${escHtml(s.name || s.id)}${s.publisher ? ` <span class="econ-src-attr-pub">— ${escHtml(s.publisher)}</span>` : ''}</div>
        ${s.note ? `<div class="econ-src-attr-note">${escHtml(s.note)}</div>` : ''}
        ${s.url ? `<a href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escHtml(s.url)}</a>` : ''}
      </div>`).join('') : '';

    host.innerHTML = `
      <div class="about-card" style="margin-bottom:0">
        <div class="about-card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Economic Intelligence — live pipeline status
        </div>
        <p class="dq-lead">
          These four sources feed the Economy tab. Unlike the table above, this
          is read live from <code>data/economy/economic_metadata.json</code>,
          not hand-maintained prose — so "not yet available" here means the
          module genuinely has not produced usable data yet, not that this page
          forgot to mention it.
        </p>
        <table class="sources-table">
          <thead><tr><th style="width:220px">Source</th><th>Status</th><th>Last updated</th><th>Coverage</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${attribution ? `<div class="econ-src-attrs">${attribution}</div>` : ''}
      </div>`;
  });
}

/* ── Data quality & coverage panel (Phase 5 — commercial readiness) ─────────
   Renders the real coverage and quality figures from platform_metadata.json
   rather than prose claims, plus the canonical disclaimer list. Everything
   here is read from the metadata file so it can never drift from the data. */
function renderDataQualityPanel() {
  const host = document.getElementById('about-data-quality');
  if (!host) return;

  const paint = () => {
    const stat = window.platformStat;
    if (typeof stat !== 'function' || !window.PLATFORM_META) {
      host.innerHTML = `<div class="about-card" style="margin-bottom:18px">
        <p style="font-size:12.5px;color:var(--text-muted);margin:0">
          Coverage statistics are currently unavailable.</p></div>`;
      return;
    }

    // Not counties_in_database: 597 records are research_status=descriptive_only
    // (a description, no policy research) and must not count as "researched" —
    // this cell used to disagree with the "Not yet researched" cell right next
    // to it (1,467 + 2,273 = 3,740, not 3,143) because of exactly this mixup.
    const inDb    = window.researchedCount ? window.researchedCount() : stat('coverage.counties_in_database', 0);
    const total   = stat('coverage.total_us_counties', 3143);
    const unres   = stat('coverage.counties_not_yet_researched', 0);
    const pct     = typeof window.coveragePct === 'function' ? window.coveragePct() : 0;
    const broken  = stat('data_quality.broken_source_urls', 0);
    const checked = stat('data_quality.total_source_urls_checked', 0);
    const through = stat('freshness.policy_data_through', null);
    const brokenPct = checked ? Math.round(broken / checked * 100) : 0;
    const disclaimers = Array.isArray(window.PLATFORM_META.disclaimers)
      ? window.PLATFORM_META.disclaimers : [];

    const cell = (n, label, note) => `
      <div class="dq-cell">
        <div class="dq-n">${escHtml(String(n))}</div>
        <div class="dq-l">${escHtml(label)}</div>
        ${note ? `<div class="dq-note">${escHtml(note)}</div>` : ''}
      </div>`;

    host.innerHTML = `
      <div class="about-card dq-card">
        <div class="about-card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Coverage &amp; Data Quality
        </div>
        <p class="dq-lead">
          These are the platform's actual measured figures, published so you can judge
          how far to trust any given answer. They are read directly from
          <code>data/platform_metadata.json</code>.
        </p>
        <div class="dq-grid">
          ${cell(inDb.toLocaleString(), 'Counties researched', `of ${total.toLocaleString()} US counties`)}
          ${cell(pct + '%', 'Coverage', 'share of US counties reviewed')}
          ${cell(unres.toLocaleString(), 'Not yet researched', 'no data collected — not "no restrictions"')}
          ${cell(brokenPct + '%', 'Broken source links', `${broken.toLocaleString()} of ${checked.toLocaleString()} checked`)}
        </div>
        ${through ? `<p class="dq-through">Policy data current through
          <strong>${escHtml(String(through).slice(0, 10))}</strong> &middot;
          manually researched, not automatically updated.</p>` : ''}
        <p class="dq-through">Citation links are re-checked weekly. Where a source has
          moved, the county page links to an archived copy alongside the original,
          and flags links that did not respond when last checked.</p>
        ${disclaimers.length ? `
          <div class="dq-disc">
            <div class="dq-disc-h">Limitations you should read before relying on this data</div>
            <ul>${disclaimers.map(d => `<li>${escHtml(d)}</li>`).join('')}</ul>
          </div>` : ''}
      </div>`;
  };

  // Metadata may still be in flight on first paint.
  if (window.PLATFORM_META) paint();
  else if (typeof window.loadPlatformMeta === 'function') window.loadPlatformMeta().then(paint);
  else paint();
}

/* ─────────────────────────────────────────────────────────────── */
/* Conflict Zone Analysis                                              */
/* ─────────────────────────────────────────────────────────────── */

async function _fillConflictZones() {
  const container = document.getElementById("analytics-conflict-section");
  if (!container) return;

  let camps, dcs;
  try {
    [camps, dcs] = await Promise.all([
      fetch("data/ai_campuses.json").then(r => r.json()).then(d => d.ai_campuses || []),
      fetch("data/data_centers.json").then(r => r.json()).then(d => d.data_centers || []),
    ]);
  } catch (_) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Conflict zone data unavailable.</p>`;
    return;
  }

  // We need mapData and politicalRiskData — both are globals from map.js
  const counties  = (typeof mapData !== "undefined") ? mapData : {};
  const riskIndex = (typeof window !== "undefined" && window.DC_RISK_BY_FIPS) ? window.DC_RISK_BY_FIPS : {};

  // Build FIPS-indexed lookups
  const campsByFips = {};
  for (const c of camps) {
    const f = c.county_fips;
    if (!f) continue;
    campsByFips[f] = (campsByFips[f] || []);
    campsByFips[f].push(c);
  }
  const dcsByFips = {};
  for (const d of dcs) {
    const f = d.county_fips;
    if (!f) continue;
    dcsByFips[f] = (dcsByFips[f] || []);
    dcsByFips[f].push(d);
  }

  const SEV_LABEL = { 1: "Light", 2: "Moderate", 3: "Significant", 4: "Ban" };
  const SEV_COLOR = { 1: "#86efac", 2: "#f97316", 3: "#dc2626", 4: "#7f1d1d" };
  const PR_COLOR  = { 1: "#22c55e", 2: "#84cc16", 3: "#eab308", 4: "#f97316", 5: "#ef4444" };

  // Find all FIPS in either AI campuses or DCs
  const candidateFips = new Set([...Object.keys(campsByFips), ...Object.keys(dcsByFips)]);

  const conflicts = [];
  for (const fips of candidateFips) {
    const county = counties[fips];
    const level  = county ? county.level : null;
    if (level === null || level === undefined || level < 1) continue;

    const campList = campsByFips[fips] || [];
    const dcList   = dcsByFips[fips]   || [];
    const pr       = riskIndex[fips];

    conflicts.push({
      fips,
      name:        (county && county.name) || fips,
      state:       (county && county.state) || "—",
      level,
      status:      (county && county.status) || "active",
      ai_campuses: campList,
      dcs:         dcList,
      pr_score:    pr ? pr.risk_score : null,
      pr_label:    pr ? pr.score_label : null,
      total_infra: campList.length + dcList.length,
    });
  }

  conflicts.sort((a, b) => b.level - a.level || b.total_infra - a.total_infra);

  if (!conflicts.length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">No conflict zones identified with current data.</p>`;
    return;
  }

  // Summary KPIs
  const totalConflict = conflicts.length;
  const highRisk = conflicts.filter(c => c.level >= 3).length;
  const totalAI  = conflicts.reduce((s, c) => s + c.ai_campuses.length, 0);
  const totalDC  = conflicts.reduce((s, c) => s + c.dcs.length, 0);

  let _expanded = null;

  function rowHtml(c) {
    const isOpen = _expanded === c.fips;
    const sevColor = SEV_COLOR[c.level] || "#9ca3af";
    const prChip = c.pr_score
      ? `<span class="cz-pr-chip" style="color:${PR_COLOR[c.pr_score] || '#9ca3af'};border-color:${PR_COLOR[c.pr_score] || '#9ca3af'}">PR ${c.pr_score}</span>`
      : "";

    const campHtml = c.ai_campuses.map(cam =>
      `<div class="cz-infra-item">🤖 ${escHtml(cam.name)} <span class="cz-infra-status">${escHtml(cam.status || "")}</span></div>`
    ).join("");
    const dcHtml = c.dcs.slice(0, 8).map(d =>
      `<div class="cz-infra-item">🏢 ${escHtml(d.name)} ${d.capacity_mw ? `<span class="cz-infra-status">${d.capacity_mw} MW</span>` : ""}</div>`
    ).join("");
    const moreNote = c.dcs.length > 8
      ? `<div class="cz-infra-more">+${c.dcs.length - 8} more data centers</div>` : "";

    return `<div class="cz-row${isOpen ? " expanded" : ""}" data-fips="${escHtml(c.fips)}">
      <div class="cz-row-header">
        <div class="cz-sev-dot" style="background:${sevColor}" title="Level ${c.level}: ${escHtml(SEV_LABEL[c.level] || '')}"></div>
        <div class="cz-row-info">
          <div class="cz-row-name">${escHtml(c.name)}, ${escHtml(c.state)}</div>
          <div class="cz-row-sub">
            <span class="cz-sev-chip" style="color:${sevColor};border-color:${sevColor}">${escHtml(SEV_LABEL[c.level] || `Level ${c.level}`)}</span>
            ${prChip}
            ${c.ai_campuses.length ? `<span class="cz-infra-chip cz-ai">${c.ai_campuses.length} AI campus${c.ai_campuses.length>1?"es":""}</span>` : ""}
            ${c.dcs.length ? `<span class="cz-infra-chip cz-dc">${c.dcs.length} data center${c.dcs.length>1?"s":""}</span>` : ""}
          </div>
        </div>
        <button class="cz-expand-btn" data-fips="${escHtml(c.fips)}" aria-expanded="${isOpen}">${isOpen ? "▲" : "▼"}</button>
      </div>
      ${isOpen ? `<div class="cz-row-body">
        <div class="cz-infra-list">${campHtml}${dcHtml}${moreNote}</div>
        <div class="cz-row-actions">
          <button class="cz-map-btn" data-fips="${escHtml(c.fips)}">View on map</button>
        </div>
      </div>` : ""}
    </div>`;
  }

  function render() {
    const rows = conflicts.map(rowHtml).join("");
    container.innerHTML = `
      <div class="cz-kpi-row">
        <div class="cz-kpi"><span class="cz-kpi-val">${totalConflict}</span><span class="cz-kpi-label">Conflict zone counties</span></div>
        <div class="cz-kpi"><span class="cz-kpi-val" style="color:#dc2626">${highRisk}</span><span class="cz-kpi-label">High / Significant restriction</span></div>
        <div class="cz-kpi"><span class="cz-kpi-val">${totalAI}</span><span class="cz-kpi-label">AI campuses at risk</span></div>
        <div class="cz-kpi"><span class="cz-kpi-val">${totalDC}</span><span class="cz-kpi-label">Data centers at risk</span></div>
      </div>
      <div class="cz-list">${rows}</div>
      <p class="cz-note">Counties where documented data center or AI campus infrastructure exists alongside active restrictive policy (level ≥ 1). Political Risk (PR) score where available. Sorted by restriction severity then infrastructure count.</p>
    `;
    wireEvents();
  }

  function wireEvents() {
    container.querySelectorAll(".cz-row-header, .cz-expand-btn").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest(".cz-map-btn")) return;
        const row = e.target.closest(".cz-row");
        if (!row) return;
        const fips = row.dataset.fips;
        _expanded = _expanded === fips ? null : fips;
        render();
      });
    });
    container.querySelectorAll(".cz-map-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const fips = btn.dataset.fips;
        if (!fips) return;
        if (typeof switchTab === "function") switchTab("map");
        setTimeout(() => {
          if (typeof selectCounty === "function") selectCounty(fips);
          if (typeof zoomToFeature === "function") zoomToFeature(fips);
        }, 150);
      });
    });
  }

  render();
}

/* ─────────────────────────────────────────────────────────────── */
/* Facility Capacity Intelligence                                      */
/* ─────────────────────────────────────────────────────────────── */

async function _fillCapacityIntelligence() {
  const container = document.getElementById("analytics-capacity-section");
  if (!container) return;

  let facilities;
  try {
    facilities = await fetch("data/facilities_index.json").then(r => r.json());
  } catch (_) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Facility data unavailable.</p>`;
    return;
  }

  if (!Array.isArray(facilities) || !facilities.length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">No facility records found.</p>`;
    return;
  }

  // Aggregate
  let totalMW = 0, opMW = 0, planMW = 0, opCount = 0, planCount = 0;
  let hyperCount = 0, coloCount = 0, edgeCount = 0;
  const stateMW    = {};
  const stateCount = {};
  const stateName  = {};

  for (const f of facilities) {
    const mw  = f.capacity_mw_known || 0;
    const st  = f.state_abbr || "—";
    const stn = f.state || st;
    totalMW += mw;
    stateMW[st]    = (stateMW[st]    || 0) + mw;
    stateCount[st] = (stateCount[st] || 0) + 1;
    stateName[st]  = stn;
    if (f.operational_status === "operational") { opMW += mw; opCount++; }
    else if (f.operational_status === "planned") { planMW += mw; planCount++; }
    if (f.is_hyperscale) hyperCount++;
    if (f.is_colocation) coloCount++;
    if (f.is_edge)       edgeCount++;
  }

  const fmt = n => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(Math.round(n));
  const fmtMW = n => n >= 1000 ? `${(n/1000).toFixed(1)}K MW` : `${Math.round(n)} MW`;

  // Top 20 states by MW (exclude XX = unknown state)
  const topStates = Object.entries(stateMW)
    .filter(([k]) => k !== "XX" && k !== "—")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  const maxStateMW = topStates[0]?.[1] || 1;

  const stateRows = topStates.map(([abbr, mw], i) => {
    const pct = (mw / maxStateMW * 100).toFixed(1);
    const cnt = stateCount[abbr] || 0;
    return `<div class="cap-state-row">
      <span class="cap-state-rank">${i + 1}</span>
      <span class="cap-state-abbr">${escHtml(abbr)}</span>
      <div class="cap-state-bar-wrap">
        <div class="cap-state-bar" style="width:${pct}%"></div>
      </div>
      <span class="cap-state-mw">${escHtml(fmtMW(mw))}</span>
      <span class="cap-state-cnt">${cnt} facilit${cnt===1?"y":"ies"}</span>
    </div>`;
  }).join("");

  // Status split bar
  const knownMW = opMW + planMW;
  const opPct   = knownMW > 0 ? (opMW / knownMW * 100).toFixed(1) : "50";
  const plPct   = knownMW > 0 ? (planMW / knownMW * 100).toFixed(1) : "50";

  container.innerHTML = `
    <div class="cap-kpi-row">
      <div class="cap-kpi">
        <div class="cap-kpi-val">${escHtml(fmtMW(totalMW))}</div>
        <div class="cap-kpi-label">Total tracked capacity</div>
      </div>
      <div class="cap-kpi">
        <div class="cap-kpi-val" style="color:#22c55e">${escHtml(fmtMW(opMW))}</div>
        <div class="cap-kpi-label">Operational (${escHtml(fmt(opCount))} facilities)</div>
      </div>
      <div class="cap-kpi">
        <div class="cap-kpi-val" style="color:#60a5fa">${escHtml(fmtMW(planMW))}</div>
        <div class="cap-kpi-label">Planned (${escHtml(fmt(planCount))} facilities)</div>
      </div>
      <div class="cap-kpi">
        <div class="cap-kpi-val">${escHtml(fmt(hyperCount))}</div>
        <div class="cap-kpi-label">Hyperscale facilities</div>
      </div>
      <div class="cap-kpi">
        <div class="cap-kpi-val">${escHtml(fmt(coloCount))}</div>
        <div class="cap-kpi-label">Colocation facilities</div>
      </div>
    </div>

    <div class="cap-split-label">Operational vs. Planned (by known MW)</div>
    <div class="cap-split-bar">
      <div class="cap-split-op"  style="width:${opPct}%" title="Operational: ${fmtMW(opMW)}"></div>
      <div class="cap-split-plan" style="width:${plPct}%" title="Planned: ${fmtMW(planMW)}"></div>
    </div>
    <div class="cap-split-legend">
      <span><span class="cap-dot" style="background:#22c55e"></span>Operational ${opPct}%</span>
      <span><span class="cap-dot" style="background:#60a5fa"></span>Planned ${plPct}%</span>
    </div>

    <div class="cap-states-title" id="cap-states-title">Top States by Known Capacity</div>
    <div class="cap-states-list" tabindex="0" role="region" aria-labelledby="cap-states-title">${stateRows}</div>
    <p class="cap-note">Known capacity only — many facilities do not publicly disclose MW figures. Total tracked: ${escHtml(String(facilities.length))} facilities, aggregated from public sources via automated pipeline and not independently verified.</p>
  `;
}

/* ─────────────────────────────────────────────────────────────── */
/* State Regulatory Scorecard                                          */
/* ─────────────────────────────────────────────────────────────── */

async function _renderStateScorecard() {
  const container = document.getElementById("analytics-state-scorecard");
  if (!container) return;

  let statesRaw;
  try {
    const raw = await fetch("data/state_regulations.json").then(r => r.json());
    statesRaw = raw.states || {};
  } catch (_) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">State regulation data unavailable.</p>`;
    return;
  }

  // Flatten to array and normalise
  const states = Object.entries(statesRaw).map(([fips2, s]) => ({
    fips2,
    name:    s.name,
    abbr:    s.abbr || "",
    level:   s.level,
    status:  s.status || "active",
    summary: s.summary || "",
    types:   s.types  || [],
    sources: s.sources || [],
  }));

  const LEVEL_META = {
    "-1": { label: "Pro-Business",    color: "#22c55e", cls: "sr-lv--1" },
    "0":  { label: "No Known Restrictions", color: "#6b7280", cls: "sr-lv-0"  },
    "1":  { label: "Light",           color: "#86efac", cls: "sr-lv-1"  },
    "2":  { label: "Moderate",        color: "#f97316", cls: "sr-lv-2"  },
    "3":  { label: "Significant",     color: "#dc2626", cls: "sr-lv-3"  },
    "4":  { label: "Moratorium/Ban",  color: "#7f1d1d", cls: "sr-lv-4"  },
  };

  const TYPE_LABELS = { data_center: "Data Center", ai: "AI", energy: "Energy", crypto: "Crypto", water: "Water" };
  const ALL_TYPES   = ["data_center", "ai", "energy", "crypto", "water"];

  let _filterType  = "all";
  let _filterLevel = "all";
  let _search      = "";
  let _sortKey     = "level";
  let _sortDir     = -1;  // -1 = desc (most restrictive first)
  let _expandedAbbr = null;

  function sorted(arr) {
    return [...arr].sort((a, b) => {
      let av = a[_sortKey], bv = b[_sortKey];
      if (_sortKey === "name") return _sortDir * av.localeCompare(bv);
      return _sortDir * (Number(av) - Number(bv));
    });
  }

  function buildHtml() {
    const filtered = states.filter(s => {
      if (_filterType  !== "all" && !s.types.includes(_filterType)) return false;
      if (_filterLevel !== "all" && String(s.level) !== _filterLevel) return false;
      if (_search) {
        const q = _search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.summary.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const rows = sorted(filtered).map(s => {
      const lv   = LEVEL_META[String(s.level)] || LEVEL_META["0"];
      const isOpen = _expandedAbbr === s.abbr;
      const typeChips = s.types.map(t =>
        `<span class="sr-type-chip">${escHtml(TYPE_LABELS[t] || t)}</span>`
      ).join("");

      const sourceLinks = s.sources.length
        ? s.sources.map(src =>
            `<a class="sr-source-link" href="${escHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escHtml(src.label || src.url)}</a>`
          ).join("")
        : "";

      return `<div class="sr-row${isOpen ? " expanded" : ""}" data-abbr="${escHtml(s.abbr)}">
        <div class="sr-row-header">
          <div class="sr-abbr">${escHtml(s.abbr)}</div>
          <div class="sr-row-info">
            <div class="sr-row-name">${escHtml(s.name)}</div>
            <div class="sr-row-summary">${escHtml(s.summary.slice(0, 120))}${s.summary.length > 120 ? "…" : ""}</div>
          </div>
          <div class="sr-chips">${typeChips}</div>
          <div class="sr-lv-badge ${escHtml(lv.cls)}" style="--lv-color:${lv.color}">${escHtml(lv.label)}</div>
          <button class="sr-expand-btn" data-abbr="${escHtml(s.abbr)}" aria-expanded="${isOpen}" title="${isOpen ? "Collapse" : "Expand"}">${isOpen ? "▲" : "▼"}</button>
        </div>
        ${isOpen ? `<div class="sr-row-body">
          <p class="sr-full-summary">${escHtml(s.summary)}</p>
          ${sourceLinks ? `<div class="sr-sources"><span class="sr-sources-label">Official sources:</span>${sourceLinks}</div>` : ""}
          <div class="sr-row-actions">
            <button class="sr-map-btn" data-fips2="${escHtml(s.fips2)}">View counties on map</button>
          </div>
        </div>` : ""}
      </div>`;
    }).join("");

    const levelOpts = ["-1","0","1","2","3"].map(v =>
      `<option value="${v}"${_filterLevel === v ? " selected" : ""}>${escHtml(LEVEL_META[v]?.label || v)}</option>`
    ).join("");

    const typeOpts = ALL_TYPES.map(t =>
      `<option value="${t}"${_filterType === t ? " selected" : ""}>${escHtml(TYPE_LABELS[t])}</option>`
    ).join("");

    const countNote = filtered.length === states.length
      ? `All <strong>${states.length}</strong> states`
      : `<strong>${filtered.length}</strong> of ${states.length} states`;

    return `
      <div class="sr-toolbar">
        <input class="sr-search" id="sr-search" type="search" placeholder="Search state or policy text…" value="${escHtml(_search)}" />
        <select class="sr-sel" id="sr-type-sel" aria-label="Filter by policy type">
          <option value="all">All Policy Types</option>
          ${typeOpts}
        </select>
        <select class="sr-sel" id="sr-level-sel" aria-label="Filter by restriction level">
          <option value="all">All Levels</option>
          ${levelOpts}
        </select>
        <div class="sr-sort-btns">
          <button class="sr-sort-btn${_sortKey === "level" ? " active" : ""}" data-sort="level">By Level</button>
          <button class="sr-sort-btn${_sortKey === "name"  ? " active" : ""}" data-sort="name">A–Z</button>
        </div>
        <span class="sr-count">${countNote}</span>
      </div>
      <div class="sr-list">${rows || `<div class="sr-empty">No states match the current filters.</div>`}</div>
      <p class="sr-note">State-level regulatory posture. Level −1 = active incentive hub; Level 3+ = enacted moratorium or ban. County-level data may differ — see map for detail.</p>
    `;
  }

  function render() {
    container.innerHTML = buildHtml();
    wireEvents();
  }

  function wireEvents() {
    container.querySelector("#sr-search")?.addEventListener("input", e => {
      _search = e.target.value.trim();
      _expandedAbbr = null;
      render();
    });
    container.querySelector("#sr-type-sel")?.addEventListener("change", e => {
      _filterType = e.target.value;
      _expandedAbbr = null;
      render();
    });
    container.querySelector("#sr-level-sel")?.addEventListener("change", e => {
      _filterLevel = e.target.value;
      _expandedAbbr = null;
      render();
    });
    container.querySelectorAll(".sr-sort-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.sort;
        if (_sortKey === key) { _sortDir *= -1; }
        else { _sortKey = key; _sortDir = key === "level" ? -1 : 1; }
        render();
      });
    });
    container.querySelectorAll(".sr-expand-btn, .sr-row-header").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest(".sr-map-btn") || e.target.closest(".sr-source-link")) return;
        const row = e.target.closest(".sr-row");
        if (!row) return;
        const abbr = row.dataset.abbr;
        _expandedAbbr = _expandedAbbr === abbr ? null : abbr;
        render();
      });
    });
    container.querySelectorAll(".sr-map-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (typeof switchTab === "function") switchTab("map");
      });
    });
  }

  render();
}

/* ─────────────────────────────────────────────────────────────── */
/* Political Risk Intelligence                                         */
/* ─────────────────────────────────────────────────────────────── */

async function _renderPoliticalRisk() {
  const container = document.getElementById("analytics-political-risk-section");
  if (!container) return;

  let prData;
  try {
    const raw = await fetch("data/political_risk.json").then(r => r.json());
    prData = raw;
  } catch (_) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Political risk data unavailable.</p>`;
    return;
  }

  const scores = prData.scores || [];
  if (!scores.length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">No political risk records found.</p>`;
    return;
  }

  const RISK_LABEL = { 1: "Very Favorable", 2: "Mostly Favorable", 3: "Mixed/Neutral", 4: "Elevated Risk", 5: "High Risk" };
  const RISK_COLOR = { 1: "#22c55e", 2: "#84cc16", 3: "#eab308", 4: "#f97316", 5: "#ef4444" };
  const RISK_CLS   = { 1: "pr-score-1", 2: "pr-score-2", 3: "pr-score-3", 4: "pr-score-4", 5: "pr-score-5" };

  // Collect all unique signal types
  const allSignalTypes = new Set();
  scores.forEach(r => (r.signals || []).forEach(s => allSignalTypes.add(s.type)));
  const signalTypes = Array.from(allSignalTypes).sort();

  // Collect all states
  const allStates = Array.from(new Set(scores.map(r => r.state))).sort();

  let _filterScore = "all";
  let _filterState = "All States";
  let _filterSig   = "all";
  let _search      = "";
  let _expandedFips = null;

  function buildHtml() {
    const filtered = scores.filter(r => {
      if (_filterScore !== "all" && String(r.risk_score) !== _filterScore) return false;
      if (_filterState !== "All States" && r.state !== _filterState) return false;
      if (_filterSig !== "all" && !(r.signals || []).some(s => s.type === _filterSig)) return false;
      if (_search) {
        const q = _search.toLowerCase();
        const hit = r.name.toLowerCase().includes(q) ||
                    r.state.toLowerCase().includes(q) ||
                    (r.evidence_summary || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    const stateOpts = allStates.map(s => `<option${s === _filterState ? " selected" : ""}>${escHtml(s)}</option>`).join("");
    const sigOpts   = signalTypes.map(t => `<option value="${escHtml(t)}"${t === _filterSig ? " selected" : ""}>${escHtml(t.replace(/_/g, " "))}</option>`).join("");

    const scoreBtn = (v, lbl) =>
      `<button class="pr-score-btn${_filterScore === v ? " active" : ""}" data-score="${escHtml(v)}">${escHtml(lbl)}</button>`;

    const rows = filtered.sort((a, b) => b.risk_score - a.risk_score || a.name.localeCompare(b.name)).map(r => {
      const isOpen = _expandedFips === r.fips;
      const sigHtml = (r.signals || []).map(s => {
        const dt = s.detected_date ? ` <span class="pr-sig-date">${escHtml(s.detected_date.slice(0,7))}</span>` : "";
        const srcLink = s.source_url
          ? ` <a class="pr-sig-src" href="${escHtml(s.source_url)}" target="_blank" rel="noopener noreferrer">source</a>`
          : "";
        return `<div class="pr-signal">
          <span class="pr-sig-type">${escHtml(s.label || s.type.replace(/_/g," "))}</span>${dt}${srcLink}
          <div class="pr-sig-desc">${escHtml(s.description || "")}</div>
        </div>`;
      }).join("");

      return `<div class="pr-row${isOpen ? " expanded" : ""}" data-fips="${escHtml(r.fips)}">
        <div class="pr-row-header">
          <div class="pr-score-chip ${escHtml(RISK_CLS[r.risk_score] || "pr-score-3")}">${r.risk_score}</div>
          <div class="pr-row-info">
            <div class="pr-row-name">${escHtml(r.name)}, ${escHtml(r.state)}</div>
            <div class="pr-row-summary">${escHtml(r.evidence_summary || r.score_label || "")}</div>
          </div>
          <div class="pr-row-meta">
            <span class="pr-conf-badge pr-conf-${escHtml(r.confidence || "low")}">${escHtml(r.confidence || "low")}</span>
            <span class="pr-sig-count">${(r.signals || []).length} signal${(r.signals||[]).length===1?"":"s"}</span>
          </div>
          <button class="pr-expand-btn" data-fips="${escHtml(r.fips)}" aria-expanded="${isOpen}" title="${isOpen ? "Collapse" : "Expand"} signals">
            ${isOpen ? "▲" : "▼"}
          </button>
        </div>
        ${isOpen ? `<div class="pr-row-body">
          <div class="pr-signals-list">${sigHtml || "<em style='color:var(--text-muted);font-size:11px'>No signals recorded.</em>"}</div>
          <div class="pr-row-actions">
            <button class="pr-map-btn" data-fips="${escHtml(r.fips)}">View on map</button>
          </div>
        </div>` : ""}
      </div>`;
    }).join("");

    const meta = prData.meta || {};
    const countNote = filtered.length === scores.length
      ? `Showing all <strong>${scores.length}</strong> scored counties`
      : `<strong>${filtered.length}</strong> of ${scores.length} counties`;

    return `
      <div class="pr-toolbar">
        <input class="pr-search" id="pr-search" type="search" placeholder="Search county, state, or description…" value="${escHtml(_search)}" />
        <select class="pr-sel" id="pr-state-sel" aria-label="Filter by state">
          <option value="All States">All States</option>
          ${stateOpts}
        </select>
        <select class="pr-sel" id="pr-sig-sel" aria-label="Filter by signal type">
          <option value="all">All Signal Types</option>
          ${sigOpts}
        </select>
        <div class="pr-score-btns">
          ${scoreBtn("all","All")}
          ${scoreBtn("5","Risk 5")}
          ${scoreBtn("4","Risk 4")}
          ${scoreBtn("3","Mixed")}
          ${scoreBtn("2","Risk 2")}
          ${scoreBtn("1","Favorable")}
        </div>
        <span class="pr-count">${countNote}</span>
      </div>
      <div class="pr-list">${rows || `<div class="pr-empty">No counties match the current filters.</div>`}</div>
      <p class="pr-note">Scale: 1 = Very Favorable → 5 = High Political Risk. Coverage: ${meta.total_scored || scores.length} counties with documented public evidence. Unscored counties have insufficient data and are not assumed favorable. Last updated: ${escHtml(meta.last_updated || "—")}.</p>
    `;
  }

  function render() {
    container.innerHTML = buildHtml();
    wireEvents();
  }

  function wireEvents() {
    container.querySelector("#pr-search")?.addEventListener("input", e => {
      _search = e.target.value.trim();
      _expandedFips = null;
      render();
    });
    container.querySelector("#pr-state-sel")?.addEventListener("change", e => {
      _filterState = e.target.value;
      _expandedFips = null;
      render();
    });
    container.querySelector("#pr-sig-sel")?.addEventListener("change", e => {
      _filterSig = e.target.value;
      _expandedFips = null;
      render();
    });
    container.querySelectorAll(".pr-score-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        _filterScore = btn.dataset.score;
        _expandedFips = null;
        render();
      });
    });
    container.querySelectorAll(".pr-expand-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const fips = btn.dataset.fips;
        _expandedFips = _expandedFips === fips ? null : fips;
        render();
      });
    });
    container.querySelectorAll(".pr-row-header").forEach(hdr => {
      hdr.addEventListener("click", e => {
        if (e.target.closest(".pr-expand-btn")) return;
        const row = hdr.closest(".pr-row");
        if (!row) return;
        const fips = row.dataset.fips;
        _expandedFips = _expandedFips === fips ? null : fips;
        render();
      });
    });
    container.querySelectorAll(".pr-map-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const fips = btn.dataset.fips;
        if (!fips) return;
        if (typeof switchTab === "function") switchTab("map");
        setTimeout(() => {
          if (typeof selectCounty === "function") selectCounty(fips);
          if (typeof zoomToFeature === "function") zoomToFeature(fips);
        }, 150);
      });
    });
  }

  render();
}

/* ─────────────────────────────────────────────────────────────── */
/* County Suitability Rankings                                        */
/* ─────────────────────────────────────────────────────────────── */

function _renderCountyRankings() {
  const container = document.getElementById("analytics-rankings-section");
  if (!container) return;

  if (typeof computeSuitabilityScore !== "function" || !mapData || !Object.keys(mapData).length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted);padding:8px 0;">Suitability data not available — load the map first.</p>`;
    return;
  }

  // Build and score county list
  const fipsSet = new Set(Object.keys(mapData));
  // Include any risk-data FIPS not in mapData (counties scored by political risk only)
  const riskData = window.DC_RISK_BY_FIPS || {};
  for (const f of Object.keys(riskData)) {
    if (!fipsSet.has(f)) fipsSet.add(f);
  }

  const ranked = [];
  for (const fips of fipsSet) {
    const county = mapData[fips] || null;
    const s = computeSuitabilityScore(fips, county);
    const name  = county ? county.name  : (riskData[fips] ? riskData[fips].county_name || fips : fips);
    const state = county ? county.state : (riskData[fips] ? riskData[fips].state || "" : "");
    const level = county ? county.level : 0;
    ranked.push({ fips, name, state, score: s.score, grade: s.grade, label: s.label, level });
  }
  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  // Collect states for filter
  const stateSet = new Set(ranked.map(r => r.state).filter(Boolean));
  const states   = ["All States", ...Array.from(stateSet).sort()];

  const GRADE_COLORS = { A: "#22c55e", B: "#22d3ee", C: "#eab308", D: "#f97316", F: "#ef4444" };
  const LEVEL_CHIPS  = {
    "-1": { lbl: "Pro-DC Hub",    col: "#22c55e" },
    "0":  { lbl: "No Restriction", col: "#6b7280" },
    "1":  { lbl: "Light",          col: "#86efac" },
    "2":  { lbl: "Moderate",       col: "#f97316" },
    "3":  { lbl: "Significant",    col: "#dc2626" },
    "4":  { lbl: "Ban",            col: "#7f1d1d" },
  };

  function rowHtml(r, rank) {
    const gc  = GRADE_COLORS[r.grade] || "#9ca3af";
    const lv  = LEVEL_CHIPS[String(r.level)] || { lbl: "Unknown", col: "#9ca3af" };
    const bar = Math.round(r.score);
    return `<tr class="rnk-row" data-fips="${escHtml(r.fips)}" tabindex="0" role="button" aria-label="Open ${escHtml(r.name)}, ${escHtml(r.state)} on the map">
      <td class="rnk-rank">${rank}</td>
      <td class="rnk-county">${escHtml(r.name)}</td>
      <td class="rnk-state">${escHtml(r.state)}</td>
      <td class="rnk-grade"><span class="rnk-grade-chip" style="background:${gc}22;color:${gc};border-color:${gc}44">${r.grade}</span></td>
      <td class="rnk-score">
        <div class="rnk-bar-wrap">
          <div class="rnk-bar" style="width:${bar}%;background:${gc}"></div>
        </div>
        <span class="rnk-score-val">${r.score}</span>
      </td>
      <td class="rnk-restrict"><span class="rnk-lv-chip" style="color:${lv.col}">${escHtml(lv.lbl)}</span></td>
    </tr>`;
  }

  // State for filtering
  let _filterGrade = "All";
  let _filterState = "All States";
  let _filterSearch = "";
  let _page = 0;
  const PAGE_SIZE = 50;

  function filtered() {
    return ranked.filter(r => {
      if (_filterGrade !== "All" && r.grade !== _filterGrade) return false;
      if (_filterState !== "All States" && r.state !== _filterState) return false;
      if (_filterSearch) {
        const q = _filterSearch.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.state.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const rows = filtered();
    const page = rows.slice(0, (_page + 1) * PAGE_SIZE);
    const tbody = container.querySelector("#rnk-tbody");
    const countEl = container.querySelector("#rnk-count");
    const moreBtn = container.querySelector("#rnk-more-btn");
    if (tbody)   tbody.innerHTML = page.map((r, i) => rowHtml(r, i + 1)).join("");
    if (countEl) countEl.textContent = `${rows.length} counties`;
    if (moreBtn) {
      const hasMore = rows.length > page.length;
      moreBtn.hidden = !hasMore;
      moreBtn.textContent = `Load more (${rows.length - page.length} remaining)`;
    }
    // Re-wire row clicks after re-render
    tbody?.querySelectorAll(".rnk-row").forEach(tr => {
      const handler = () => {
        const fips = tr.dataset.fips;
        if (!fips) return;
        if (typeof switchTab === "function") switchTab("map");
        setTimeout(() => {
          if (typeof selectCounty === "function") selectCounty(fips);
          if (typeof zoomToFeature === "function") zoomToFeature(fips);
        }, 150);
      };
      tr.addEventListener("click", handler);
      tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
    });
  }

  container.innerHTML = `
    <div class="rnk-toolbar">
      <input id="rnk-search" class="rnk-search" type="text" placeholder="Search county or state…" autocomplete="off" />
      <div class="rnk-grade-btns" role="group" aria-label="Filter by grade">
        ${["All","A","B","C","D","F"].map(g => `<button class="rnk-grade-btn${g === "All" ? " active" : ""}" data-grade="${g}">${g === "All" ? "All grades" : "Grade " + g}</button>`).join("")}
      </div>
      <select id="rnk-state-sel" class="rnk-state-sel" aria-label="Filter by state">
        ${states.map(s => `<option>${escHtml(s)}</option>`).join("")}
      </select>
      <span id="rnk-count" class="rnk-count">${ranked.length} counties</span>
    </div>
    <div class="rnk-table-wrap">
      <table class="rnk-table">
        <thead>
          <tr>
            <th class="rnk-th-rank">#</th>
            <th>County</th>
            <th>State</th>
            <th>Grade</th>
            <th>Score</th>
            <th>Restriction Level</th>
          </tr>
        </thead>
        <tbody id="rnk-tbody"></tbody>
      </table>
    </div>
    <button id="rnk-more-btn" class="rnk-more-btn" hidden>Load more</button>
    <p class="rnk-note">Suitability score combines regulatory environment (50%), political climate (30%), and restriction scope (20%). Click any row to open that county on the map.</p>
  `;

  renderTable();

  container.querySelector("#rnk-search")?.addEventListener("input", e => {
    _filterSearch = e.target.value.trim();
    _page = 0;
    renderTable();
  });

  container.querySelectorAll(".rnk-grade-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".rnk-grade-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _filterGrade = btn.dataset.grade;
      _page = 0;
      renderTable();
    });
  });

  container.querySelector("#rnk-state-sel")?.addEventListener("change", e => {
    _filterState = e.target.value;
    _page = 0;
    renderTable();
  });

  container.querySelector("#rnk-more-btn")?.addEventListener("click", () => {
    _page++;
    renderTable();
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Investment Hotspots                                                */
/* ─────────────────────────────────────────────────────────────── */

function _renderInvestmentHotspots() {
  const container = document.getElementById("analytics-hotspots-section");
  if (!container) return;

  if (typeof computeSuitabilityScore !== "function" || !mapData || !Object.keys(mapData).length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted);padding:8px 0;">Map data required — navigate to the Map tab first.</p>`;
    return;
  }

  const wsData  = window.DC_WATER_STRESS_FULL || {};
  const incData = window.DC_INCENTIVES_FIPS   || {};

  // A hotspot must pass all three green signals:
  //  1. No active restriction (level ≤ 0 i.e. pro or none)
  //  2. Water stress ≤ 2 (medium-high or lower)
  //  3. Has at least one tax incentive program
  const hotspots = [];

  for (const fips in mapData) {
    const county = mapData[fips];
    const level  = county.level ?? 0;

    const sigRestrict = level <= 0;
    const wsLevel     = wsData[fips];
    const sigWater    = wsLevel !== undefined && wsLevel !== null && wsLevel <= 2;
    const sigInc      = !!incData[fips];

    if (!sigRestrict || !sigWater || !sigInc) continue;

    const suit = computeSuitabilityScore(fips, county);
    if (suit.grade === "D" || suit.grade === "F") continue;

    hotspots.push({ fips, county, suit, wsLevel, sigRestrict, sigWater, sigInc });
  }

  hotspots.sort((a, b) => b.suit.score - a.suit.score);

  const total = hotspots.length;
  const show  = hotspots.slice(0, 24);

  if (total === 0) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted);padding:8px 0;">No counties currently meet all three green-signal criteria (no restriction + low water stress + tax incentive).</p>`;
    return;
  }

  const WS_LABELS = ["Low", "Low-Med", "Med-High", "High", "Ext High"];
  const WS_COLORS = ["#2563eb", "#60a5fa", "#facc15", "#f97316", "#dc2626"];

  const gradeColor = { A: "#16a34a", B: "#22c55e", C: "#eab308", D: "#f97316", F: "#dc2626" };

  const cards = show.map(h => {
    const incCount = (incData[h.fips] || []).length;
    const wsLabel  = WS_LABELS[h.wsLevel] || "Unknown";
    const wsColor  = WS_COLORS[h.wsLevel] || "#888";
    const sevLabel = window.LEVEL_SHORT[String(h.county.level)] || window.LEVEL_SHORT["0"];
    const sevColor = h.county.level === -1 ? "#16a34a" : "#22c55e";
    return `
      <div class="hs-card" data-fips="${escHtml(h.fips)}">
        <div class="hs-card-top">
          <div class="hs-grade" style="color:${gradeColor[h.suit.grade] || '#888'};background:${gradeColor[h.suit.grade] || '#888'}18">${escHtml(h.suit.grade)}</div>
          <div class="hs-name-block">
            <div class="hs-name">${escHtml(h.county.name || h.fips)}</div>
            <div class="hs-state">${escHtml(h.county.state || "")}</div>
          </div>
          <div class="hs-score">${h.suit.score}</div>
        </div>
        <div class="hs-signals">
          <span class="hs-sig hs-sig-green" title="No active restrictions">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ${escHtml(sevLabel)}
          </span>
          <span class="hs-sig hs-sig-water" style="--ws-color:${wsColor}" title="Water stress: ${wsLabel}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            ${escHtml(wsLabel)}
          </span>
          <span class="hs-sig hs-sig-green" title="${incCount} tax incentive program${incCount !== 1 ? 's' : ''}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            ${incCount} incentive${incCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button class="hs-map-btn" data-fips="${escHtml(h.fips)}">View on Map</button>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="hs-header">
      <div class="hs-header-desc">Counties passing all three green signals: no active restriction, water stress ≤ medium-high, and at least one tax incentive program. Ranked by suitability score.</div>
      <div class="hs-badge">${total} qualifying counties</div>
    </div>
    <div class="hs-legend">
      <span class="hs-legend-item"><span class="hs-sig hs-sig-green" style="display:inline-flex;align-items:center;gap:3px;font-size:10px">✓</span> = green signal</span>
      <span class="hs-legend-item" style="color:var(--text-muted);font-size:10.5px">Score = suitability 0–100</span>
    </div>
    <div class="hs-grid">${cards}</div>
    ${total > 24 ? `<p class="hs-overflow">Showing top 24 of ${total} qualifying counties. Use the Site Screener on the Map tab to explore all matches.</p>` : ""}
  `;

  container.addEventListener("click", e => {
    const btn = e.target.closest(".hs-map-btn, .hs-card");
    if (!btn) return;
    const fips = btn.dataset.fips;
    if (!fips) return;
    switchTab("map");
    setTimeout(() => {
      if (typeof selectCounty === "function") selectCounty(fips);
      if (typeof zoomToFeature === "function") zoomToFeature(fips);
    }, 120);
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* State Opportunity Matrix                                           */
/* ─────────────────────────────────────────────────────────────── */

async function _renderStateOpportunityMatrix() {
  const container = document.getElementById("analytics-state-matrix");
  if (!container) return;

  if (!mapData || !Object.keys(mapData).length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Map data required.</p>`;
    return;
  }

  // Fetch state regulations for state-level policy info
  let stateRegs = {};
  try {
    const res = await fetch("data/state_regulations.json");
    const raw = await res.json();
    stateRegs = raw.states || {};
  } catch (_) {}

  // Build per-state aggregates from county data
  const wsData  = window.DC_WATER_STRESS_FULL || {};
  const incData = window.DC_INCENTIVES_FIPS   || {};

  const byState = {};
  for (const fips in mapData) {
    const c  = mapData[fips];
    const st = c.state;
    if (!st) continue;
    if (!byState[st]) byState[st] = { counties: 0, restricted: 0, suitTotal: 0, wsTotal: 0, wsCount: 0, incCounties: 0 };
    const s = byState[st];
    s.counties++;
    if ((c.level ?? 0) >= 1) s.restricted++;
    if (typeof computeSuitabilityScore === "function") {
      const suit = computeSuitabilityScore(fips, c);
      s.suitTotal += suit.score;
    }
    const ws = wsData[fips];
    if (ws !== undefined && ws !== null) { s.wsTotal += ws; s.wsCount++; }
    if (incData[fips]) s.incCounties++;
  }

  // Map state FIPS to abbr for stateRegs lookup
  const STATE_FIPS_MAP = {
    "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
    "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
    "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
    "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
    "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
    "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
    "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
    "55":"WI","56":"WY",
  };
  // Build abbr → state reg info
  const stateRegByAbbr = {};
  for (const fips2 in stateRegs) {
    const rec = stateRegs[fips2];
    if (rec.abbr) stateRegByAbbr[rec.abbr] = rec;
  }

  // Compute composite opportunity score for each state
  // Score = avgSuit - 15*(restrictRatio) - 5*(avgWS) + 5*(incRatio > 0 ? 1 : 0) + (stateLevel === -1 ? 8 : 0)
  const rows = Object.entries(byState).map(([st, s]) => {
    const restrictRatio = s.counties > 0 ? s.restricted / s.counties : 0;
    const avgSuit       = s.counties > 0 ? s.suitTotal / s.counties : 0;
    const avgWS         = s.wsCount > 0  ? s.wsTotal  / s.wsCount  : 2;
    const incRatio      = s.counties > 0 ? s.incCounties / s.counties : 0;
    const reg           = stateRegByAbbr[st] || {};
    const stateLevel    = reg.level ?? 0;

    const oppScore = Math.round(
      avgSuit
      - 15 * restrictRatio
      - 5  * avgWS
      + 5  * (incRatio > 0 ? 1 : 0)
      + (stateLevel === -1 ? 8 : 0)
      - (stateLevel >= 2  ? 5 : 0)
    );

    const tier =
      oppScore >= 55 ? "high" :
      oppScore >= 40 ? "medium" :
      oppScore >= 25 ? "low" :
      "caution";

    return { st, s, restrictRatio, avgSuit, avgWS, incRatio, stateLevel, oppScore, tier, reg };
  });

  rows.sort((a, b) => b.oppScore - a.oppScore);

  const TIER_LABELS = { high: "High Opportunity", medium: "Moderate", low: "Limited", caution: "Caution" };
  const TIER_COLORS = { high: "#16a34a", medium: "#eab308", low: "#f97316", caution: "#dc2626" };
  const WS_LABELS   = ["Low", "Low-Med", "Med-High", "High", "Ext High"];

  let _sortCol = "opp";
  let _sortDir = -1;

  const renderTable = (data) => {
    const cols = [
      { key: "st",    label: "State",          title: "State abbreviation" },
      { key: "opp",   label: "Opp. Score",     title: "Composite opportunity score (higher = better)" },
      { key: "tier",  label: "Tier",           title: "Opportunity tier" },
      { key: "suit",  label: "Avg Suitability",title: "Average suitability score across counties in this state" },
      { key: "rest",  label: "Restriction %",  title: "% of tracked counties with active restrictions" },
      { key: "ws",    label: "Avg Water",      title: "Average water stress (0=Low, 4=Extreme)" },
      { key: "inc",   label: "Inc. Counties",  title: "Counties with at least one tax incentive program" },
      { key: "state", label: "State Policy",   title: "State-level policy posture" },
    ];

    const th = cols.map(c =>
      `<th data-scol="${c.key}" title="${c.title}" style="cursor:pointer">
        ${escHtml(c.label)}${_sortCol===c.key ? (_sortDir<0?" ↓":" ↑") : ""}
      </th>`
    ).join("");

    const tbody = data.map(r => {
      const tier = r.tier;
      const wsAvg = r.avgWS;
      const wsRnd = Math.round(wsAvg);
      const wsLabel = WS_LABELS[Math.min(wsRnd, 4)] || "—";
      const wsColor = ["#2563eb","#60a5fa","#facc15","#f97316","#dc2626"][Math.min(wsRnd, 4)];
      const stateLabel = r.reg.name ? escHtml(r.reg.name) : escHtml(r.st);
      const statePol = r.reg.level !== undefined
        ? (r.reg.level === -1 ? "Pro-DC" : r.reg.level >= 3 ? "Restrictive" : r.reg.level >= 1 ? "Moderate" : "Neutral")
        : "—";
      const statePolColor = r.reg.level === -1 ? "#16a34a" : r.reg.level >= 3 ? "#dc2626" : r.reg.level >= 1 ? "#f97316" : "var(--text-muted)";

      return `<tr data-st="${escHtml(r.st)}">
        <td class="som-st">${escHtml(r.st)}<span class="som-stname">${stateLabel}</span></td>
        <td class="som-score" style="font-variant-numeric:tabular-nums">${r.oppScore}</td>
        <td><span class="som-tier" style="color:${TIER_COLORS[tier]};background:${TIER_COLORS[tier]}18">${escHtml(TIER_LABELS[tier])}</span></td>
        <td style="font-variant-numeric:tabular-nums">${Math.round(r.avgSuit)}</td>
        <td style="font-variant-numeric:tabular-nums">${Math.round(r.restrictRatio*100)}%</td>
        <td><span style="color:${wsColor};font-weight:600;font-size:11px">${escHtml(wsLabel)}</span></td>
        <td style="font-variant-numeric:tabular-nums">${r.s.incCounties}</td>
        <td><span style="color:${statePolColor};font-size:11px;font-weight:600">${escHtml(statePol)}</span></td>
      </tr>`;
    }).join("");

    return `<div class="som-wrap">
      <table class="som-table">
        <thead><tr>${th}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>`;
  };

  const sortAndRender = () => {
    const KEY_MAP = {
      st:    r => r.st,
      opp:   r => r.oppScore,
      tier:  r => ({ high:0, medium:1, low:2, caution:3 })[r.tier],
      suit:  r => r.avgSuit,
      rest:  r => r.restrictRatio,
      ws:    r => r.avgWS,
      inc:   r => r.s.incCounties,
      state: r => r.stateLevel,
    };
    const sortFn = KEY_MAP[_sortCol] || (r => r.oppScore);
    const sorted = [...rows].sort((a, b) => _sortDir * (sortFn(b) - sortFn(a)));
    const tableEl = container.querySelector(".som-wrap");
    if (tableEl) tableEl.outerHTML = renderTable(sorted);
    else container.innerHTML = `
      <p class="som-desc">Composite score combines average county suitability, restriction exposure, water stress, incentive coverage, and state-level policy. Higher = more favorable for data center investment.</p>
      ${renderTable(sorted)}
    `;
    // Re-attach sort listener
    container.querySelector(".som-table thead")?.addEventListener("click", e => {
      const th = e.target.closest("th[data-scol]");
      if (!th) return;
      const col = th.dataset.scol;
      if (_sortCol === col) _sortDir *= -1; else { _sortCol = col; _sortDir = -1; }
      sortAndRender();
    });
  };

  container.innerHTML = `
    <p class="som-desc">Composite score combines average county suitability, restriction exposure, water stress, incentive coverage, and state-level policy. Higher = more favorable for data center investment. Click any column header to sort.</p>
    <div class="som-wrap"><table class="som-table"><thead><tr><th>Computing…</th></tr></thead><tbody></tbody></table></div>
  `;
  sortAndRender();

  container.querySelector(".som-table tbody")?.addEventListener("click", e => {
    const row = e.target.closest("tr[data-st]");
    if (!row) return;
    const st = row.dataset.st;
    switchTab("map");
    setTimeout(() => {
      if (typeof leafletMap !== "undefined" && leafletMap) {
        // Find a county in this state to zoom to
        for (const fips in mapData) {
          if (mapData[fips].state === st) {
            if (typeof zoomToFeature === "function") zoomToFeature(fips);
            break;
          }
        }
      }
    }, 120);
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Tax Incentive Explorer                                             */
/* ─────────────────────────────────────────────────────────────── */

async function _fillIncentiveExplorer() {
  const container = document.getElementById("analytics-incentives-section");
  if (!container) return;

  let programs;
  try {
    const raw = await fetch("data/tax_incentives.json").then(r => r.json());
    programs = raw.tax_incentives || [];
  } catch (_) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Incentive data unavailable.</p>`;
    return;
  }

  if (!programs.length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">No incentive programs found.</p>`;
    return;
  }

  // Collect unique states and incentive types for filters
  const states  = ["All States", ...Array.from(new Set(programs.map(p => p.state))).sort()];
  const rawTypes = Array.from(new Set(programs.map(p => p.incentive_type || "Other"))).sort();
  // Simplified type buckets
  const typeBuckets = {
    "Sales Tax":    p => (p.incentive_type || "").toLowerCase().includes("sales"),
    "Property Tax": p => (p.incentive_type || "").toLowerCase().includes("property"),
    "Income / B&O": p => (p.incentive_type || "").toLowerCase().match(/income|b&o|franchise/),
    "Grant":        p => (p.incentive_type || "").toLowerCase().includes("grant"),
    "Other":        p => true,
  };

  const TIER_LABELS = [
    { label: "Any amount",  test: () => true },
    { label: "< $10M",      test: p => !p.min_investment_m || p.min_investment_m < 10 },
    { label: "$10M–$50M",   test: p => p.min_investment_m >= 10 && p.min_investment_m <= 50 },
    { label: "> $50M",      test: p => p.min_investment_m > 50 },
  ];

  // county name lookup (from mapData if available)
  function countyLabel(fips) {
    const county = (typeof mapData !== "undefined") ? mapData[fips] : null;
    return county ? `${county.name}, ${county.state}` : fips;
  }

  let _filterState = "All States";
  let _filterType  = "All Types";
  let _filterTier  = "Any amount";
  let _filterSearch = "";
  let _expandedIdx = -1;

  function filtered() {
    return programs.filter(p => {
      if (_filterState !== "All States" && p.state !== _filterState) return false;
      if (_filterType !== "All Types") {
        const fn = typeBuckets[_filterType];
        if (fn && !fn(p)) return false;
      }
      const tierFn = TIER_LABELS.find(t => t.label === _filterTier)?.test;
      if (tierFn && !tierFn(p)) return false;
      if (_filterSearch) {
        const q = _filterSearch.toLowerCase();
        if (!p.program_name.toLowerCase().includes(q) &&
            !(p.state || "").toLowerCase().includes(q) &&
            !(p.incentive_type || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function progCard(p, idx, expanded) {
    const counties = (p.fips_list || []).slice(0, expanded ? 999 : 0);
    const minStr   = p.min_investment_m ? `$${p.min_investment_m}M+` : "No minimum";
    const typeCol  = (p.incentive_type || "").toLowerCase().includes("sales") ? "#4874e8"
                   : (p.incentive_type || "").toLowerCase().includes("property") ? "#f59e0b"
                   : (p.incentive_type || "").toLowerCase().includes("grant") ? "#22c55e"
                   : "#a78bfa";
    const fipsCount = (p.fips_list || []).length;
    const countyHtml = expanded && fipsCount > 0
      ? `<div class="inc-county-list">${(p.fips_list || []).map(f => {
          const lbl = countyLabel(f);
          return `<button class="inc-county-btn" data-fips="${escHtml(f)}">${escHtml(lbl)}</button>`;
        }).join("")}</div>`
      : "";
    return `<div class="inc-card${expanded ? " inc-card-expanded" : ""}" data-idx="${idx}">
      <div class="inc-card-header">
        <div class="inc-card-left">
          <span class="inc-state-badge">${escHtml(p.state)}</span>
          <div class="inc-name">${escHtml(p.program_name)}</div>
        </div>
        <div class="inc-card-right">
          <span class="inc-type-chip" style="color:${typeCol};border-color:${typeCol}33;background:${typeCol}11">${escHtml(p.incentive_type || "Incentive")}</span>
          <span class="inc-min">${escHtml(minStr)}</span>
          <span class="inc-county-count">${fipsCount} ${fipsCount === 1 ? "county" : "counties"}</span>
          <button class="inc-expand-btn" aria-expanded="${expanded}" data-idx="${idx}">${expanded ? "▲ Collapse" : "▼ Details"}</button>
        </div>
      </div>
      ${expanded ? `<div class="inc-card-body">
        ${p.notes ? `<p class="inc-notes">${escHtml(p.notes)}</p>` : ""}
        ${countyHtml}
      </div>` : ""}
    </div>`;
  }

  function renderCards() {
    const rows = filtered();
    const grid = container.querySelector("#inc-grid");
    const count = container.querySelector("#inc-count");
    if (count) count.textContent = `${rows.length} programs`;
    if (grid) {
      grid.innerHTML = rows.map((p, i) => progCard(p, i, i === _expandedIdx)).join("");
      // Wire expand buttons
      grid.querySelectorAll(".inc-expand-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx, 10);
          _expandedIdx = _expandedIdx === idx ? -1 : idx;
          renderCards();
        });
      });
      // Wire county buttons
      grid.querySelectorAll(".inc-county-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const fips = btn.dataset.fips;
          if (!fips) return;
          if (typeof switchTab === "function") switchTab("map");
          setTimeout(() => {
            if (typeof selectCounty === "function") selectCounty(fips);
            if (typeof zoomToFeature === "function") zoomToFeature(fips);
          }, 150);
        });
      });
    }
  }

  container.innerHTML = `
    <div class="inc-toolbar">
      <input id="inc-search" class="inc-search" type="text" placeholder="Search programs…" autocomplete="off" />
      <select id="inc-state-sel" class="inc-state-sel" aria-label="Filter by state">
        ${states.map(s => `<option>${escHtml(s)}</option>`).join("")}
      </select>
      <select id="inc-type-sel" class="inc-type-sel" aria-label="Filter by incentive type">
        <option>All Types</option>
        ${Object.keys(typeBuckets).map(t => `<option>${escHtml(t)}</option>`).join("")}
      </select>
      <select id="inc-tier-sel" class="inc-tier-sel" aria-label="Filter by tier">
        ${TIER_LABELS.map(t => `<option>${escHtml(t.label)}</option>`).join("")}
      </select>
      <span id="inc-count" class="inc-count">${programs.length} programs</span>
    </div>
    <div id="inc-grid" class="inc-grid"></div>
    <p class="inc-disclaimer">Incentive data is approximate. Verify eligibility and amounts with state economic development agencies before making investment decisions.</p>
  `;

  renderCards();

  container.querySelector("#inc-search")?.addEventListener("input", e => {
    _filterSearch = e.target.value.trim();
    _expandedIdx = -1;
    renderCards();
  });
  container.querySelector("#inc-state-sel")?.addEventListener("change", e => {
    _filterState = e.target.value;
    _expandedIdx = -1;
    renderCards();
  });
  container.querySelector("#inc-type-sel")?.addEventListener("change", e => {
    _filterType = e.target.value;
    _expandedIdx = -1;
    renderCards();
  });
  container.querySelector("#inc-tier-sel")?.addEventListener("change", e => {
    _filterTier = e.target.value;
    _expandedIdx = -1;
    renderCards();
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Suitability Score Distribution                                   */
/* ─────────────────────────────────────────────────────────────── */

function _fillScoreDist() {
  const container = document.getElementById("analytics-score-dist-section");
  if (!container) return;
  const counties = (typeof mapData !== "undefined") ? mapData : {};
  if (!Object.keys(counties).length || typeof computeSuitabilityScore !== "function") {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Score data unavailable.</p>`;
    return;
  }

  const bins = new Array(10).fill(0);
  const scores = [];
  const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  for (const fips in counties) {
    const c = counties[fips];
    const s = computeSuitabilityScore(fips, c);
    if (!s) continue;
    scores.push(s.score);
    const bin = Math.min(9, Math.floor(s.score / 10));
    bins[bin]++;
    gradeCount[s.grade] = (gradeCount[s.grade] || 0) + 1;
  }

  if (!scores.length) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">No scores computed.</p>`;
    return;
  }

  scores.sort((a, b) => a - b);
  const mean   = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  const median = scores[Math.floor(scores.length / 2)];
  const maxBin = Math.max(...bins, 1);
  const total  = scores.length;

  const ZONE_COLORS  = ["#ef4444","#ef4444","#ef4444","#f97316","#f97316","#eab308","#eab308","#84cc16","#22c55e","#22c55e"];
  const GRADE_ZONES  = ["F","F","F","D","D","C","C","B","A","A"];
  const RANGE_LABELS = ["0–9","10–19","20–29","30–39","40–49","50–59","60–69","70–79","80–89","90–100"];

  const bars = bins.map((count, i) => {
    const heightPct  = (count / maxBin * 100).toFixed(1);
    const color      = ZONE_COLORS[i];
    const zone       = GRADE_ZONES[i];
    const pctOfTotal = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
    return `<div class="score-hist-col" title="${RANGE_LABELS[i]}: ${count} counties (${pctOfTotal}%)">
      <div class="score-hist-bar-wrap">
        <div class="score-hist-bar" style="height:${heightPct}%;background:${color}"></div>
      </div>
      <div class="score-hist-count">${count}</div>
      <div class="score-hist-label">${RANGE_LABELS[i]}</div>
      <div class="score-hist-zone-label" style="color:${color}">${zone}</div>
    </div>`;
  }).join("");

  const gradePills = Object.entries(gradeCount)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => "ABCDF".indexOf(a) - "ABCDF".indexOf(b))
    .map(([g, n]) => `<span class="score-hist-grade-pill grade-${g}">${g}: ${n} <small>(${((n/total)*100).toFixed(0)}%)</small></span>`)
    .join("");

  container.innerHTML = `
    <div class="score-hist-stats">
      <div class="score-hist-stat"><span class="score-hist-stat-val">${total.toLocaleString()}</span><span class="score-hist-stat-label">Counties scored</span></div>
      <div class="score-hist-stat"><span class="score-hist-stat-val">${mean}</span><span class="score-hist-stat-label">Mean score</span></div>
      <div class="score-hist-stat"><span class="score-hist-stat-val">${median}</span><span class="score-hist-stat-label">Median score</span></div>
    </div>
    <div class="score-hist-grade-row">${gradePills}</div>
    <div class="score-hist-wrap"><div class="score-hist-grid">${bars}</div></div>
    <p class="cap-note" style="margin-top:8px">Distribution of computed suitability scores across all tracked counties. Scores derived from restriction severity, political risk, infrastructure density, water stress, and tax incentives.</p>
  `;
}

/* ─────────────────────────────────────────────────────────────── */
/* AI Campus Operator Risk Profile                                  */
/* ─────────────────────────────────────────────────────────────── */

async function _fillOperatorRisk() {
  const container = document.getElementById("analytics-operator-risk-section");
  if (!container) return;

  let camps;
  try {
    camps = await fetch("data/ai_campuses.json").then(r => r.json()).then(d => d.ai_campuses || []);
  } catch (_) {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Operator data unavailable.</p>`;
    return;
  }

  const counties = (typeof mapData !== "undefined") ? mapData : {};

  const operatorMap = {};
  for (const cam of camps) {
    const op = cam.operator || "Unknown";
    if (!operatorMap[op]) operatorMap[op] = [];
    operatorMap[op].push(cam);
  }

  const opRows = [];
  for (const [op, camList] of Object.entries(operatorMap)) {
    let restricted = 0, banned = 0, open = 0, suitSum = 0, suitN = 0;
    const fipsSet = new Set(camList.map(c => c.county_fips).filter(Boolean));
    for (const fips of fipsSet) {
      const county = counties[fips];
      if (!county) continue;
      const lvl = county.level ?? 0;
      if (lvl >= 4) banned++;
      else if (lvl >= 1) restricted++;
      else open++;
      if (typeof computeSuitabilityScore === "function") {
        const s = computeSuitabilityScore(fips, county);
        if (s) { suitSum += s.score; suitN++; }
      }
    }
    const atRisk   = restricted + banned;
    const avgSuit  = suitN ? Math.round(suitSum / suitN) : null;
    const avgGrade = avgSuit !== null ? (avgSuit >= 80 ? "A" : avgSuit >= 65 ? "B" : avgSuit >= 45 ? "C" : avgSuit >= 25 ? "D" : "F") : null;
    opRows.push({ op, total: camList.length, uniqueFips: fipsSet.size, restricted, banned, open, atRisk, avgSuit, avgGrade, camps: camList });
  }

  opRows.sort((a, b) => b.atRisk - a.atRisk || b.total - a.total);

  const totalCamps  = camps.length;
  const totalAtRisk = camps.filter(c => { const co = counties[c.county_fips]; return co && (co.level ?? 0) >= 1; }).length;
  const totalBanned = camps.filter(c => { const co = counties[c.county_fips]; return co && (co.level ?? 0) >= 4; }).length;
  const uniqueOps   = opRows.length;

  let _expanded = null;

  const GRADE_COLORS = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };

  function rowHtml(r) {
    const isOpen    = _expanded === r.op;
    const maxAtRisk = opRows[0] ? opRows[0].atRisk : 1;
    const barPct    = maxAtRisk > 0 ? (r.atRisk / maxAtRisk * 100).toFixed(0) : 0;
    const riskColor = r.banned > 0 ? "#dc2626" : r.restricted > 0 ? "#f97316" : "#22c55e";
    const gradeColor = GRADE_COLORS[r.avgGrade] || "#9ca3af";

    const campDetails = [...r.camps]
      .sort((a, b) => ((counties[b.county_fips]?.level ?? 0) - (counties[a.county_fips]?.level ?? 0)))
      .slice(0, 10)
      .map(cam => {
        const co  = counties[cam.county_fips];
        const lvl = co ? (co.level ?? 0) : null;
        const cls = lvl !== null && lvl >= 4 ? "op-risk-camp-ban" : lvl >= 1 ? "op-risk-camp-restricted" : "op-risk-camp-open";
        return `<div class="op-risk-camp-item ${cls}">
          <span class="op-risk-camp-name">${escHtml(cam.name)}</span>
          ${co ? `<span class="op-risk-camp-loc">${escHtml(co.name)}, ${escHtml(co.state)}</span>` : ""}
          <span class="op-risk-camp-status">${escHtml(cam.status || "")}</span>
          ${cam.county_fips ? `<button class="op-risk-map-btn" data-fips="${escHtml(cam.county_fips)}">View</button>` : ""}
        </div>`;
      }).join("");
    const moreNote = r.camps.length > 10 ? `<div class="op-risk-more">+${r.camps.length - 10} more</div>` : "";

    return `<tr class="op-risk-row${isOpen ? " expanded" : ""}" data-op="${escHtml(r.op)}">
      <td class="op-risk-td op-risk-name">
        <span class="op-risk-expand-icon">${isOpen ? "▲" : "▼"}</span>
        ${escHtml(r.op)}
        ${isOpen ? `<div class="op-risk-detail">${campDetails}${moreNote}</div>` : ""}
      </td>
      <td class="op-risk-td op-risk-num">${r.total}</td>
      <td class="op-risk-td">
        <div class="op-risk-bar-wrap"><div class="op-risk-bar" style="width:${barPct}%;background:${riskColor}"></div></div>
        <span class="op-risk-num" style="color:${riskColor}">${r.atRisk}</span>
      </td>
      <td class="op-risk-td op-risk-num" style="color:#dc2626">${r.banned || "—"}</td>
      <td class="op-risk-td">
        ${r.avgGrade ? `<span class="op-risk-grade-badge" style="color:${gradeColor};border-color:${gradeColor}">${r.avgGrade}</span>` : ""}
        ${r.avgSuit !== null ? `<span class="op-risk-num" style="color:var(--text-muted)">${r.avgSuit}</span>` : ""}
      </td>
    </tr>`;
  }

  function render() {
    container.innerHTML = `
      <div class="op-risk-kpi-row">
        <div class="op-risk-kpi"><span class="op-risk-kpi-val">${totalCamps}</span><span class="op-risk-kpi-label">AI campuses tracked</span></div>
        <div class="op-risk-kpi"><span class="op-risk-kpi-val" style="color:#f97316">${totalAtRisk}</span><span class="op-risk-kpi-label">In restricted counties</span></div>
        <div class="op-risk-kpi"><span class="op-risk-kpi-val" style="color:#dc2626">${totalBanned}</span><span class="op-risk-kpi-label">In ban zones</span></div>
        <div class="op-risk-kpi"><span class="op-risk-kpi-val">${uniqueOps}</span><span class="op-risk-kpi-label">Operators tracked</span></div>
      </div>
      <div class="op-risk-table-wrap">
        <table class="op-risk-table">
          <thead>
            <tr>
              <th class="op-risk-th op-risk-th-op">Operator</th>
              <th class="op-risk-th">Campuses</th>
              <th class="op-risk-th">At Risk</th>
              <th class="op-risk-th">Ban Zone</th>
              <th class="op-risk-th">Avg. Suit.</th>
            </tr>
          </thead>
          <tbody>${opRows.map(rowHtml).join("")}</tbody>
        </table>
      </div>
      <p class="cap-note">AI campuses cross-referenced with county restriction data. "At Risk" = campuses in counties with any active restriction (level ≥ 1). "Ban Zone" = ban or moratorium (level ≥ 4). Click a row to expand campus details. Source: ai_campuses.json (${totalCamps} campuses, public data).</p>
    `;
    container.querySelectorAll(".op-risk-row .op-risk-name").forEach(td => {
      td.addEventListener("click", () => {
        const row = td.closest(".op-risk-row");
        if (!row) return;
        const op = row.dataset.op;
        _expanded = _expanded === op ? null : op;
        render();
      });
    });
    container.querySelectorAll(".op-risk-map-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const fips = btn.dataset.fips;
        if (!fips) return;
        if (typeof switchTab === "function") switchTab("map");
        setTimeout(() => {
          if (typeof selectCounty === "function") selectCounty(fips);
          if (typeof zoomToFeature === "function") zoomToFeature(fips);
        }, 150);
      });
    });
  }

  render();
}

/* ─────────────────────────────────────────────────────────────── */
/* Shared footer renderer                                            */
/* ─────────────────────────────────────────────────────────────── */

function renderPageFooter(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const footerEl = document.createElement('footer');
  footerEl.id = 'site-footer';
  footerEl.innerHTML = `
    <div id="footer-inner">
      <div id="footer-brand">
        <span class="footer-brand-name">US DC &amp; AI <span>Policy Tracker</span></span>
        <span class="footer-brand-sub">An open-source intelligence platform monitoring data center regulations and AI policy across all 50 US states. For research and informational purposes only.</span>
      </div>
      <div class="footer-links">
        <span class="footer-col-title">Platform</span>
        <button class="footer-link" onclick="switchTab('map')">Map</button>
        <button class="footer-link" onclick="switchTab('news')">AI News</button>
        <button class="footer-link" onclick="switchTab('stocks')">AI Stocks</button>
        <button class="footer-link" onclick="switchTab('analytics')">Analytics</button>
        <button class="footer-link" onclick="switchTab('about')">About</button>
      </div>
      <div class="footer-links">
        <span class="footer-col-title">Resources</span>
        <button class="footer-link" onclick="switchTab('about')">Methodology</button>
        <button class="footer-link" onclick="switchTab('about')">Data Sources</button>
        <a href="https://github.com/bobbytrenkamp-lgtm/test1" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>
      </div>
      <div class="footer-links">
        <span class="footer-col-title">Legal</span>
        <button class="footer-link" onclick="switchTab('about')">Disclaimer</button>
        <button class="footer-link" onclick="switchTab('about')">Data Limitations</button>
      </div>
    </div>
    <div id="footer-bottom">
      <span>© 2026 US DC &amp; AI Policy Tracker</span>
      <span id="footer-version">v2.1</span>
      <span>Market data delayed ~15 min · Not investment advice · Not legal advice</span>
    </div>
  `;
  target.replaceWith(footerEl);
}

/* ─────────────────────────────────────────────────────────────── */
/* Economic Context (Analytics tab)                                  */
/*                                                                   */
/* Exploratory comparison of policy restriction level and political   */
/* risk against county economic metrics.                             */
/*                                                                   */
/* WHAT THIS DELIBERATELY DOES NOT DO                                */
/* It does not claim, imply, or rank any causal relationship. A       */
/* county's economic profile did not "cause" its restriction level,   */
/* and a correlation across ~1,465 researched counties cannot         */
/* establish direction of effect: policy responds to development,     */
/* development responds to policy, and both respond to unobserved     */
/* local factors. The correlation figure is labelled exploratory and  */
/* the disclaimer is not dismissible.                                */
/* ─────────────────────────────────────────────────────────────── */

const ECON_AN_STATE = { xMetric: "median_household_income", yMode: "level", minLevel: 0 };

function _fillEconomicContext() {
  const container = document.getElementById("analytics-economic-section");
  if (!container || !window.ECONOMY) return;

  const E = window.ECONOMY;

  Promise.all([E.load("county"), E.load("meta")]).then(([cData, meta]) => {
    if (!E.hasCounty(cData)) {
      container.innerHTML = `
        <div class="callout info" style="font-size:12px">
          <strong>Economic data has not been generated for this deployment yet.</strong>
          The economic pipeline has not completed a run, so there is nothing to compare against.
          This is different from finding no relationship — nothing has been measured.
          A maintainer can populate it by running the <code>Update Economic Data</code> workflow.
        </div>`;
      return;
    }

    const counties = cData.counties || {};
    const vintage = cData.acs_vintage;

    /* Join economic records to policy records on FIPS. Only counties present in
       BOTH datasets can be compared; the count is displayed so the reader knows
       the sample size rather than assuming national coverage. */
    const rows = [];
    for (const fips in counties) {
      const pol = (mapData || {})[fips];
      if (!pol) continue;                      // no researched policy record
      const risk = (window.DC_RISK_BY_FIPS || {})[fips];
      rows.push({
        fips,
        name: counties[fips].name,
        state: counties[fips].state,
        level: typeof pol.level === "number" ? pol.level : null,
        risk: risk ? risk.risk_score : null,
        econ: counties[fips],
      });
    }

    const metricOptions = E.EXPLORER_METRICS.map(m =>
      `<option value="${m}"${m === ECON_AN_STATE.xMetric ? " selected" : ""}>${escHtml(E.METRICS[m].label)}</option>`
    ).join("");

    container.innerHTML = `
      <div class="econ-controls" style="margin-bottom:14px">
        <div class="econ-control">
          <label class="econ-label" for="econ-an-metric">Economic metric</label>
          <select id="econ-an-metric" class="econ-select">${metricOptions}</select>
        </div>
        <div class="econ-control">
          <label class="econ-label" for="econ-an-ymode">Compare against</label>
          <select id="econ-an-ymode" class="econ-select">
            <option value="level"${ECON_AN_STATE.yMode === "level" ? " selected" : ""}>Policy restriction level</option>
            <option value="risk"${ECON_AN_STATE.yMode === "risk" ? " selected" : ""}>Political risk score</option>
          </select>
        </div>
      </div>

      <div id="econ-an-scatter" class="econ-an-scatter"></div>
      <div class="econ-corr-row" id="econ-an-corr"></div>

      <p class="econ-an-note">
        <strong>Correlation does not establish causation.</strong>
        These are exploratory comparisons across counties that appear in both the policy
        dataset and the ACS economic dataset. A relationship in this chart does not mean an
        economic characteristic caused a restriction, approval, moratorium, or political
        outcome — nor the reverse. Policy and development influence each other over time, and
        both are shaped by local factors this platform does not measure. Only
        ${rows.length.toLocaleString()} of ${Object.keys(counties).length.toLocaleString()}
        counties with economic data also have a researched policy record, so this is not a
        national sample.
      </p>

      <div class="page-section-title" style="margin-top:22px;font-size:12px">County Economic Ranking</div>
      <div class="econ-controls" style="margin-bottom:10px">
        <div class="econ-control">
          <label class="econ-label" for="econ-an-rank-metric">Rank by</label>
          <select id="econ-an-rank-metric" class="econ-select">${metricOptions}</select>
        </div>
        <div class="econ-control">
          <label class="econ-label" for="econ-an-rank-filter">Policy filter</label>
          <select id="econ-an-rank-filter" class="econ-select">
            <option value="0">All counties</option>
            <option value="1">Level 1+ (any restriction)</option>
            <option value="2">Level 2+ (moderate or higher)</option>
            <option value="3">Level 3+ (significant or higher)</option>
            <option value="-1">Pro-development hubs only</option>
          </select>
        </div>
      </div>
      <div class="econ-rank-table-wrap"><table class="econ-rank-table" id="econ-an-rank"></table></div>

      <p class="econ-detail-src" style="margin-top:12px">
        Economic figures: U.S. Census Bureau, American Community Survey ${escHtml(String(vintage))}
        5-Year Estimates. Policy levels: this platform's curated government-source dataset.
        Political risk: <code>data/political_risk.json</code>, scored 1–5.
      </p>`;

    drawEconScatter(rows);
    drawEconRanking(rows);

    document.getElementById("econ-an-metric")?.addEventListener("change", (e) => {
      ECON_AN_STATE.xMetric = e.target.value;
      drawEconScatter(rows);
    });
    document.getElementById("econ-an-ymode")?.addEventListener("change", (e) => {
      ECON_AN_STATE.yMode = e.target.value;
      drawEconScatter(rows);
    });
    document.getElementById("econ-an-rank-metric")?.addEventListener("change", () => drawEconRanking(rows));
    document.getElementById("econ-an-rank-filter")?.addEventListener("change", () => drawEconRanking(rows));
  }).catch(err => {
    container.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Economic data unavailable (${escHtml(err.message)}).</p>`;
  });
}

/* Pearson correlation. Returns null rather than a number when the sample is too
   small for the figure to mean anything. */
function _pearson(pairs) {
  const n = pairs.length;
  if (n < 12) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of pairs) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx  += (x - mx) ** 2;
    dy  += (y - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;     // no variance -> undefined
  return num / Math.sqrt(dx * dy);
}

function drawEconScatter(rows) {
  const host = document.getElementById("econ-an-scatter");
  const corrHost = document.getElementById("econ-an-corr");
  if (!host) return;
  const E = window.ECONOMY;
  const metric = ECON_AN_STATE.xMetric;
  const meta = E.METRICS[metric];
  const yMode = ECON_AN_STATE.yMode;

  const pts = [];
  for (const r of rows) {
    const x = E.metricValue(r.econ, metric, "value");
    const y = yMode === "level" ? r.level : r.risk;
    if (x === null || x === undefined || y === null || y === undefined) continue;
    pts.push({ x, y, r });
  }

  if (pts.length < 3) {
    host.innerHTML = `<p class="empty-note" style="font-size:12px;color:var(--text-muted)">Not enough counties have both values to plot.</p>`;
    if (corrHost) corrHost.innerHTML = "";
    return;
  }

  const W = Math.max(320, host.clientWidth || 640), H = 320;
  const M = { t: 14, r: 18, b: 44, l: 62 };
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = v => M.l + (W - M.l - M.r) * ((v - x0) / Math.max(1e-9, x1 - x0));
  const py = v => M.t + (H - M.t - M.b) * (1 - (v - y0) / Math.max(1e-9, y1 - y0));

  const LEVEL_COLOR = { "-1": "#4ade80", 0: "#6b7280", 1: "#86efac", 2: "#f97316", 3: "#dc2626", 4: "#7f1d1d" };
  const RISK_COLOR = { 1: "#1a9850", 2: "#5aac44", 3: "#b8860b", 4: "#d75e00", 5: "#d73027" };

  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const v = y0 + (y1 - y0) * f;
    return `<line x1="${M.l}" x2="${W - M.r}" y1="${py(v).toFixed(1)}" y2="${py(v).toFixed(1)}" stroke="var(--border)" stroke-width="0.5" opacity="0.5"/>
            <text x="${M.l - 8}" y="${(py(v) + 3.5).toFixed(1)}" text-anchor="end" class="econ-chart-axis">${yMode === "level" ? Math.round(v) : v.toFixed(1)}</text>`;
  }).join("");

  const xTicks = [0, 0.5, 1].map((f, i) => {
    const v = x0 + (x1 - x0) * f;
    return `<text x="${px(v).toFixed(1)}" y="${H - 22}" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}" class="econ-chart-axis">${escHtml(E.fmtValue(v, meta.unit, meta.dec))}</text>`;
  }).join("");

  const dots = pts.map(p => {
    const color = yMode === "level" ? (LEVEL_COLOR[String(p.y)] || "#6b7280") : (RISK_COLOR[p.y] || "#6b7280");
    const label = `${p.r.name}, ${p.r.state}: ${E.fmtValue(p.x, meta.unit, meta.dec)}, ${yMode === "level" ? "level " + p.y : "risk " + p.y}`;
    return `<circle class="econ-scatter-dot" cx="${px(p.x).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="3.2"
             fill="${color}" fill-opacity="0.62" data-fips="${escHtml(p.r.fips)}"><title>${escHtml(label)}</title></circle>`;
  }).join("");

  host.innerHTML = `<svg class="econ-scatter-svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img"
      aria-label="Scatter plot of ${escHtml(meta.label)} against ${yMode === "level" ? "policy restriction level" : "political risk score"} for ${pts.length} counties">
    ${grid}${xTicks}${dots}
    <text x="${(M.l + (W - M.r)) / 2}" y="${H - 6}" text-anchor="middle" class="econ-chart-axis">${escHtml(meta.label)}</text>
  </svg>`;

  host.querySelectorAll(".econ-scatter-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      const fips = dot.dataset.fips;
      if (window.Router) window.Router.navigate("jurisdiction", { fips });
    });
  });

  const r = _pearson(pts.map(p => [p.x, p.y]));
  if (corrHost) {
    corrHost.innerHTML = `
      <span class="econ-corr-stat">Counties plotted: <strong>${pts.length.toLocaleString()}</strong></span>
      <span class="econ-corr-stat">Exploratory correlation (r): <strong>${r === null ? "—" : r.toFixed(3)}</strong></span>
      <span class="econ-corr-stat">${r === null
        ? "Sample too small or no variance for a meaningful figure"
        : (Math.abs(r) < 0.2 ? "Little or no linear relationship"
          : Math.abs(r) < 0.4 ? "Weak linear relationship"
          : Math.abs(r) < 0.6 ? "Moderate linear relationship"
          : "Strong linear relationship") + " — descriptive only"}</span>`;
  }
}

function drawEconRanking(rows) {
  const table = document.getElementById("econ-an-rank");
  if (!table) return;
  const E = window.ECONOMY;
  const metric = document.getElementById("econ-an-rank-metric")?.value || ECON_AN_STATE.xMetric;
  const filter = document.getElementById("econ-an-rank-filter")?.value || "0";
  const meta = E.METRICS[metric];

  let pool = rows.filter(r => {
    const v = E.metricValue(r.econ, metric, "value");
    if (v === null || v === undefined) return false;
    if (filter === "-1") return r.level === -1;
    return (r.level || 0) >= Number(filter);
  });

  const desc = meta.good !== "down";     // lower is better for unemployment
  pool.sort((a, b) => {
    const av = E.metricValue(a.econ, metric, "value");
    const bv = E.metricValue(b.econ, metric, "value");
    return desc ? bv - av : av - bv;
  });
  const top = pool.slice(0, 25);

  const LEVEL_SHORT = window.LEVEL_SHORT || {};
  table.innerHTML = `
    <thead><tr>
      <th>#</th><th>County</th><th>State</th>
      <th>${escHtml(meta.label)}</th><th>5-yr</th><th>Policy level</th>
    </tr></thead>
    <tbody>${top.map((r, i) => {
      const v = E.metricValue(r.econ, metric, "value");
      const c5 = E.metricValue(r.econ, metric, "change_5y");
      return `<tr tabindex="0" data-fips="${escHtml(r.fips)}" role="button"
                  aria-label="${escHtml(r.name)}, ${escHtml(r.state)} — open jurisdiction profile">
        <td>${i + 1}</td>
        <td>${escHtml(r.name)}</td>
        <td>${escHtml(r.state)}</td>
        <td class="econ-num">${escHtml(E.fmtValue(v, meta.unit, meta.dec))}</td>
        <td class="econ-num">${c5 === null || c5 === undefined ? "—" : escHtml(E.fmtPct(c5))}</td>
        <td>${r.level === null ? "—" : escHtml(String(LEVEL_SHORT[r.level] || r.level))}</td>
      </tr>`;
    }).join("")}</tbody>`;

  if (!top.length) {
    table.innerHTML = `<tbody><tr><td colspan="6" style="text-align:center;padding:18px;color:var(--text-muted);font-style:italic">No counties match this filter with a value for the selected metric.</td></tr></tbody>`;
    return;
  }

  const go = (fips) => { if (window.Router) window.Router.navigate("jurisdiction", { fips }); };
  table.querySelectorAll("tbody tr[data-fips]").forEach(tr => {
    tr.addEventListener("click", () => go(tr.dataset.fips));
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(tr.dataset.fips); }
    });
  });
}
