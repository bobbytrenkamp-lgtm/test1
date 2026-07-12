/* Analytics & About Pages */

/* ─────────────────────────────────────────────────────────────── */
/* Utilities                                                         */
/* ─────────────────────────────────────────────────────────────── */


function barChart(rows, colorFn) {
  const max = Math.max(...rows.map(r => r.count), 1);
  return `<div class="bar-chart">${rows.map(r => `
    <div class="bar-row">
      <div class="bar-row-label" title="${escHtml(r.label)}">${escHtml(r.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.count/max*100)}%;background:${colorFn ? colorFn(r) : 'var(--accent)'}"></div></div>
      <div class="bar-count">${r.count}</div>
    </div>`).join('')}</div>`;
}

function analyticsIcon(name) {
  const icons = {
    county:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
    restrict:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    state:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    news:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
    company: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
    energy:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    pro:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    clock:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  };
  return icons[name] || icons.county;
}

/* ─────────────────────────────────────────────────────────────── */
/* Analytics Page                                                    */
/* ─────────────────────────────────────────────────────────────── */

function renderAnalyticsPage() {
  const el = document.getElementById('analytics-view');
  if (!el) return;
  if (el.dataset.built) return;
  el.dataset.built = "1";

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

  const activeRestrict = levelCounts[1] + levelCounts[2] + levelCounts[3] + levelCounts[4];
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
                  <div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(n/topStates[0][1]*100)}%;background:#dc2626"></div></div>
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

    <div id="analytics-footer-target"></div>
  `;

  // Inject footer
  renderPageFooter('analytics-footer-target');
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
            <div class="roadmap-dot wip"></div>
            <div class="roadmap-content">
              <div class="roadmap-title">Policy Timeline</div>
              <div class="roadmap-desc">Chronological view of legislation, court decisions, and zoning changes with date filtering.</div>
            </div>
            <span class="roadmap-badge wip">In Progress</span>
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
              <div class="roadmap-title">Data Export</div>
              <div class="roadmap-desc">Download county policy data as CSV, GeoJSON, or Shapefile for GIS analysis.</div>
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
