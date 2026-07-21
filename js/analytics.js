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
  const levelLabels = { '-1':'Pro / Incentive Hub', 1:'Light Regulations', 2:'Moderate Restrictions', 3:'Significant Restrictions', 4:'Ban / Moratorium' };
  const levelColors = { '-1':'#4ade80', 1:'#86efac', 2:'#f97316', 3:'#dc2626', 4:'#7f1d1d' };

  // News category top 8
  const newsCatRows = Object.entries(newsCats).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({ label:k, count:v }));

  /* ── Render ── */
  el.innerHTML = `
    <div class="page-hero">
      <div class="page-hero-title">Policy <span>Analytics</span></div>
      <div class="page-hero-sub">Real-time summary of US data center and AI policy coverage, derived from the live dataset across all ${totalCounties} tracked jurisdictions.</div>
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
          <div class="analytics-kpi-label">Counties Tracked</div>
          <div class="analytics-kpi-value">${totalCounties}</div>
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
            <div class="ranked-list">
              ${topStates.map(([st,n],i) => `
              <div class="ranked-item">
                <div class="rank-num">${i+1}</div>
                <div class="rank-name">${escHtml(st)}</div>
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

    <div class="page-section">
      <div class="page-section-title">Policy Timeline</div>
      <div id="analytics-policy-timeline">
        ${_buildPolicyTimelineHtml(counties)}
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
      <div class="page-section-title">Development Scenario Builder</div>
      <div id="analytics-scenario-section"></div>
    </div>

    <div id="analytics-footer-target"></div>
  `;

  // Inject footer
  renderPageFooter('analytics-footer-target');

  // Async fill pipeline stats
  _fillPipelineStats();
  _fillPowerStats();
  _fillFiberStats();
  _renderScenarioBuilder();
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

async function _fillFiberStats() {
  const container = document.getElementById("analytics-fiber-section");
  if (!container) return;

  let sl = (typeof sampleLayers !== "undefined" ? sampleLayers : null);
  if (!sl || !sl.fiber_network) {
    try {
      const resp = await fetch("data/sample_layers.json");
      sl = await resp.json();
    } catch (_) {}
  }
  const fiberRoutes = sl ? (sl.fiber_network || []) : [];

  if (!fiberRoutes.length) {
    container.innerHTML = `<div class="callout warning" style="margin:0">Fiber data unavailable.</div>`;
    return;
  }

  // Haversine distance in km between two [lon, lat] points
  function haversineKm([lon1, lat1], [lon2, lat2]) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Calculate total length of each route in km
  const routeStats = fiberRoutes.map(r => {
    let km = 0;
    const pts = r.path || [];
    for (let i = 1; i < pts.length; i++) km += haversineKm(pts[i-1], pts[i]);
    return { ...r, km: Math.round(km), pts };
  });

  const totalKm = routeStats.reduce((s, r) => s + r.km, 0);

  // Find nearby facilities for each route (within ~100 km of any point)
  const facilities = window.PIPELINE ? window.PIPELINE.getData() : null;

  function routeMinDistKm(route, lat, lon) {
    let minD = Infinity;
    for (const [rlon, rlat] of route.pts) {
      const d = haversineKm([rlon, rlat], [lon, lat]);
      if (d < minD) minD = d;
    }
    return minD;
  }

  const routeCards = routeStats.map(r => {
    let nearbyCount = 0;
    let nearbyMw = 0;
    if (facilities) {
      facilities.forEach(f => {
        if (!f.latitude || !f.longitude) return;
        const d = routeMinDistKm(r, f.latitude, f.longitude);
        if (d <= 100) {
          nearbyCount++;
          nearbyMw += f.capacity_mw_known || 0;
        }
      });
    }
    const kmLabel = r.km >= 1000 ? (r.km/1000).toFixed(1) + "k km" : r.km + " km";
    const mwLabel = nearbyMw >= 1000 ? (nearbyMw/1000).toFixed(1) + " GW" : Math.round(nearbyMw) + " MW";
    return `<div class="fiber-route-card">
      <div class="fiber-route-header">
        <div class="fiber-route-icon">${analyticsIcon('fiber')}</div>
        <div class="fiber-route-name">${escHtml(r.name || r.id)}</div>
        <div class="fiber-sample-badge">SAMPLE</div>
      </div>
      <div class="fiber-route-stats">
        <div class="fiber-stat"><div class="fiber-stat-val">${escHtml(kmLabel)}</div><div class="fiber-stat-lbl">Route Length</div></div>
        <div class="fiber-stat"><div class="fiber-stat-val">${nearbyCount.toLocaleString()}</div><div class="fiber-stat-lbl">Nearby Facilities</div></div>
        <div class="fiber-stat"><div class="fiber-stat-val">${escHtml(mwLabel)}</div><div class="fiber-stat-lbl">Nearby Known MW</div></div>
        <div class="fiber-stat"><div class="fiber-stat-val">${r.pts.length}</div><div class="fiber-stat-lbl">Path Points</div></div>
      </div>
    </div>`;
  }).join("");

  container.innerHTML = `
    <div class="callout info" style="margin-bottom:16px;font-size:12px">
      Fiber network routes are sample data only — exact alignments are unverified. Nearby facility counts
      use a 100 km proximity radius from any point on the route.
    </div>
    <div class="analytics-kpi-grid" style="margin-bottom:20px">
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(96,165,250,0.12);color:#60a5fa">${analyticsIcon('fiber')}</div>
        <div class="analytics-kpi-label">Sample Routes</div>
        <div class="analytics-kpi-value">${fiberRoutes.length}</div>
        <div class="analytics-kpi-meta">mapped fiber corridors</div>
      </div>
      <div class="analytics-kpi-card">
        <div class="analytics-kpi-card-icon" style="background:rgba(96,165,250,0.12);color:#60a5fa">${analyticsIcon('zap')}</div>
        <div class="analytics-kpi-label">Total Route Length</div>
        <div class="analytics-kpi-value">${totalKm >= 1000 ? (totalKm/1000).toFixed(1) + "k" : totalKm} km</div>
        <div class="analytics-kpi-meta">approximate sample coverage</div>
      </div>
    </div>
    <div class="fiber-routes-grid">${routeCards}</div>`;
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
      <div class="page-hero-title">About the <span>Platform</span></div>
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

    <div class="page-section">
      <div class="page-section-title">Methodology</div>
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
            <li><strong>AI Stock data:</strong> Real-time delayed quotes via TradingView</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="page-section">
      <div class="page-section-title">Data Sources</div>
      <div class="about-card" style="margin-bottom:0">
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
            <tr><td><span class="src-name">EIA (Energy Information Administration)</span></td><td class="callout-body">Data center electricity demand, power infrastructure</td><td><span class="src-freq">Quarterly</span></td></tr>
            <tr><td><span class="src-name">Google News RSS</span></td><td class="callout-body">AI industry news, policy announcements</td><td><span class="src-freq">Hourly</span></td></tr>
            <tr><td><span class="src-name">TradingView</span></td><td class="callout-body">AI company stock data (delayed 15 min)</td><td><span class="src-freq">Real-time</span></td></tr>
            <tr><td><span class="src-name">US Census TIGER/Line</span></td><td class="callout-body">County boundary geometry for choropleth map</td><td><span class="src-freq">Annual</span></td></tr>
            <tr><td><span class="src-name">Water utility reports</span></td><td class="callout-body">Water availability stress indices by county</td><td><span class="src-freq">Annual</span></td></tr>
          </tbody>
        </table>
      </div>
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
              <div class="roadmap-desc">50+ publicly traded AI companies with TradingView charts, watchlist, and market heatmap.</div>
            </div>
            <span class="roadmap-badge done">Live</span>
          </div>
          <div class="roadmap-item">
            <div class="roadmap-dot done"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Analytics Dashboard</div>
              <div class="roadmap-desc">Real-time policy distribution, state rankings, and coverage summary from live data.</div>
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
              <div class="roadmap-desc">Live parcel data for 5 counties with DC feasibility scoring, zoning analysis, and proximity assessment.</div>
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
