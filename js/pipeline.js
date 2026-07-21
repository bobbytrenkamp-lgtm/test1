/* ── Data Center Project Pipeline ── */
/* Lazy-loads data/facilities_master.json and renders a searchable, filterable
   table of 3,700+ data center projects with a detail side panel. */
window.PIPELINE = (function () {

  /* ── State ── */
  let _data      = null;     // raw array from facilities_master.json
  let _filtered  = [];       // currently displayed rows
  let _selected  = null;     // active facility record
  let _sortKey   = "name";
  let _sortDir   = 1;        // 1 = asc, -1 = desc
  let _query     = "";
  let _filters   = { status: "", state: "", type: "", mw: "" };
  let _view      = "table";  // "table" (only mode for now)
  let _inited    = false;

  const MAX_MW   = 4000;     // cap for MW bar scaling

  /* ── Public: called once when Pipeline tab is first opened ── */
  function init() {
    if (_inited) { _render(); return; }
    _inited = true;
    _buildShell();
    _loadData();
  }

  /* ── Build the static HTML shell ── */
  function _buildShell() {
    const view = document.getElementById("pipeline-view");
    if (!view) return;
    view.innerHTML = `
      <div id="pipeline-toolbar">
        <input id="pipeline-search" type="text" placeholder="Search name, city, operator, county…" autocomplete="off" />
        <select id="pl-filter-status" class="pl-select">
          <option value="">All Status</option>
          <option value="operational">Operational</option>
          <option value="construction">Under Construction</option>
          <option value="planned">Planned</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
        <select id="pl-filter-state" class="pl-select">
          <option value="">All States</option>
        </select>
        <select id="pl-filter-type" class="pl-select">
          <option value="">All Types</option>
          <option value="hyperscale">Hyperscale</option>
          <option value="colocation">Colocation</option>
          <option value="enterprise">Enterprise</option>
          <option value="edge">Edge</option>
          <option value="ai_campus">AI Campus</option>
        </select>
        <select id="pl-filter-mw" class="pl-select">
          <option value="">Any Capacity</option>
          <option value="1">1+ MW</option>
          <option value="50">50+ MW</option>
          <option value="200">200+ MW</option>
          <option value="500">500+ MW</option>
          <option value="1000">1,000+ MW</option>
        </select>
        <span id="pipeline-count"></span>
        <button id="pipeline-export-btn" class="pl-export-btn" title="Export filtered results as CSV">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>
      <div id="pipeline-body">
        <div id="pipeline-table-wrap">
          <div id="pipeline-loading">
            <div class="spinner"></div>
            <span>Loading pipeline data…</span>
          </div>
          <div id="pipeline-empty" hidden>No projects match your filters.</div>
          <div id="pipeline-error" hidden>Failed to load pipeline data.</div>
          <table id="pipeline-table" hidden>
            <thead>
              <tr>
                <th data-col="name">Project Name</th>
                <th data-col="operator">Operator</th>
                <th data-col="city">City</th>
                <th data-col="state">State</th>
                <th data-col="operational_status">Status</th>
                <th data-col="_type">Type</th>
                <th data-col="capacity_mw_known">Capacity (MW)</th>
                <th data-col="last_verified_date">Verified</th>
              </tr>
            </thead>
            <tbody id="pipeline-tbody"></tbody>
          </table>
        </div>
        <div id="pipeline-detail">
          <div id="pipeline-detail-header">
            <div id="pipeline-detail-name">—</div>
            <button id="pipeline-detail-close" aria-label="Close detail">&times;</button>
          </div>
          <div id="pipeline-detail-body"></div>
        </div>
      </div>`;

    _wireToolbar();
  }

  /* ── Wire toolbar events ── */
  function _wireToolbar() {
    document.getElementById("pipeline-search")?.addEventListener("input", e => {
      _query = e.target.value.trim().toLowerCase();
      _applyFilters();
    });
    ["pl-filter-status","pl-filter-state","pl-filter-type","pl-filter-mw"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", e => {
        const key = id.replace("pl-filter-","");
        _filters[key] = e.target.value;
        _applyFilters();
      });
    });

    document.getElementById("pipeline-detail-close")?.addEventListener("click", _closeDetail);
    document.getElementById("pipeline-export-btn")?.addEventListener("click", _exportCsv);

    document.getElementById("pipeline-table")?.querySelectorAll("thead th[data-col]").forEach(th => {
      th.addEventListener("click", () => _sortBy(th.dataset.col));
    });
  }

  /* ── Load data ── */
  async function _loadData() {
    try {
      const r = await fetch("data/facilities_master.json");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      _data = await r.json();
      _populateStateFilter();
      _applyFilters();
    } catch (err) {
      console.error("[Pipeline] load error:", err);
      document.getElementById("pipeline-loading").hidden = true;
      document.getElementById("pipeline-error").hidden   = false;
    }
  }

  /* ── Populate state dropdown from data ── */
  function _populateStateFilter() {
    const sel   = document.getElementById("pl-filter-state");
    if (!sel || !_data) return;
    const abbrs = [...new Set(_data.map(d => d.state_abbr).filter(Boolean))].sort();
    abbrs.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a;
      sel.appendChild(opt);
    });
  }

  /* ── Filter + sort ── */
  function _applyFilters() {
    if (!_data) return;

    const mwMin = _filters.mw ? parseFloat(_filters.mw) : 0;

    _filtered = _data.filter(d => {
      if (_filters.status && d.operational_status !== _filters.status) return false;
      if (_filters.state  && d.state_abbr !== _filters.state) return false;
      if (_filters.mw     && (d.capacity_mw_known || 0) < mwMin) return false;
      if (_filters.type) {
        const t = _filters.type;
        if (t === "hyperscale"  && !d.is_hyperscale)  return false;
        if (t === "colocation"  && !d.is_colocation)  return false;
        if (t === "enterprise"  && !d.is_enterprise)  return false;
        if (t === "edge"        && !d.is_edge)        return false;
        if (t === "ai_campus"   && d.facility_type !== "ai_campus") return false;
      }
      if (_query) {
        const hay = [d.name, d.operator, d.city, d.county, d.state, d.state_abbr, d.parent_company]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(_query)) return false;
      }
      return true;
    });

    _sortFiltered();
    _renderTable();
    _updateCount();
  }

  function _sortBy(col) {
    if (_sortKey === col) {
      _sortDir *= -1;
    } else {
      _sortKey = col;
      _sortDir = 1;
    }
    _sortFiltered();
    _renderTable();
    _updateSortHeaders();
  }

  function _sortFiltered() {
    const k = _sortKey;
    _filtered.sort((a, b) => {
      let av = a[k] ?? "";
      let bv = b[k] ?? "";
      if (k === "_type")           { av = _typeLabel(a); bv = _typeLabel(b); }
      if (k === "capacity_mw_known") {
        av = typeof av === "number" ? av : 0;
        bv = typeof bv === "number" ? bv : 0;
        return (av - bv) * _sortDir;
      }
      return String(av).localeCompare(String(bv)) * _sortDir;
    });
  }

  /* ── Render table rows ── */
  function _renderTable() {
    const tableEl   = document.getElementById("pipeline-table");
    const loadingEl = document.getElementById("pipeline-loading");
    const emptyEl   = document.getElementById("pipeline-empty");
    const tbody     = document.getElementById("pipeline-tbody");
    if (!tableEl) return;

    loadingEl.hidden = true;

    if (_filtered.length === 0) {
      tableEl.hidden = true;
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    tableEl.hidden = false;

    _updateSortHeaders();

    const frag = document.createDocumentFragment();
    _filtered.slice(0, 2000).forEach(d => {
      const tr = document.createElement("tr");
      if (_selected && _selected.facility_id === d.facility_id) tr.classList.add("selected");
      tr.dataset.id = d.facility_id;
      tr.innerHTML = _rowHTML(d);
      tr.addEventListener("click", () => _openDetail(d));
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
  }

  function _rowHTML(d) {
    const mw     = d.capacity_mw_known;
    const mwHtml = mw
      ? `<div class="pl-mw-bar-wrap">
           <div class="pl-mw-bar"><div class="pl-mw-bar-fill" style="width:${Math.min(100,(mw/MAX_MW)*100)}%"></div></div>
           <span class="pl-mw-val">${_fmtMw(mw)}</span>
         </div>`
      : `<span class="pl-mw-val" style="opacity:0.4">—</span>`;

    const date   = d.last_verified_date ? d.last_verified_date.slice(0,7) : "—";

    return `
      <td title="${_esc(d.name)}">${_esc(d.name)}</td>
      <td title="${_esc(d.operator)}">${_esc(d.operator || d.owner || "—")}</td>
      <td>${_esc(d.city || "—")}</td>
      <td>${_esc(d.state_abbr || "—")}</td>
      <td>${_statusChip(d.operational_status)}</td>
      <td>${_typeBadge(d)}</td>
      <td>${mwHtml}</td>
      <td>${_esc(date)}</td>`;
  }

  /* ── Status chip ── */
  function _statusChip(s) {
    const cls = {
      operational:     "pl-status-operational",
      construction:    "pl-status-construction",
      planned:         "pl-status-planned",
      decommissioned:  "pl-status-decommissioned",
    }[s] || "pl-status-unknown";
    const label = {
      operational: "Operational", construction: "Construction",
      planned: "Planned", decommissioned: "Decommissioned",
    }[s] || (s || "Unknown");
    return `<span class="pl-status ${cls}"><span class="pl-status-dot"></span>${_esc(label)}</span>`;
  }

  /* ── Type badge ── */
  function _typeLabel(d) {
    if (d.is_hyperscale) return "Hyperscale";
    if (d.is_colocation) return "Colocation";
    if (d.is_enterprise) return "Enterprise";
    if (d.is_edge)       return "Edge";
    if (d.facility_type === "ai_campus") return "AI Campus";
    return d.facility_type || "—";
  }
  function _typeBadge(d) {
    const label = _typeLabel(d);
    if (label === "—") return `<span style="opacity:0.4">—</span>`;
    const color = {
      Hyperscale: "#4874e8", Colocation: "#a78bfa", Enterprise: "#34d399",
      Edge: "#f59e0b", "AI Campus": "#60a5fa",
    }[label] || "#9ca3af";
    return `<span class="pl-type-badge" style="color:${color}">${_esc(label)}</span>`;
  }

  /* ── Sort header indicators ── */
  function _updateSortHeaders() {
    const ths = document.querySelectorAll("#pipeline-table thead th[data-col]");
    ths.forEach(th => {
      th.classList.toggle("sort-asc",  th.dataset.col === _sortKey && _sortDir === 1);
      th.classList.toggle("sort-desc", th.dataset.col === _sortKey && _sortDir === -1);
    });
  }

  /* ── Count badge ── */
  function _updateCount() {
    const el = document.getElementById("pipeline-count");
    if (!el) return;
    const total = _data ? _data.length : 0;
    const shown = _filtered.length;
    if (shown === total) {
      el.innerHTML = `<strong>${total.toLocaleString()}</strong> projects`;
    } else {
      el.innerHTML = `<strong>${shown.toLocaleString()}</strong> of ${total.toLocaleString()} projects`;
    }
  }

  /* ── Detail panel ── */
  function _openDetail(d) {
    _selected = d;
    document.querySelectorAll("#pipeline-tbody tr").forEach(tr => {
      tr.classList.toggle("selected", tr.dataset.id === d.facility_id);
    });
    const panel   = document.getElementById("pipeline-detail");
    const nameEl  = document.getElementById("pipeline-detail-name");
    const bodyEl  = document.getElementById("pipeline-detail-body");
    if (!panel) return;
    nameEl.textContent = d.name;
    bodyEl.innerHTML   = _detailHTML(d);

    bodyEl.querySelector(".pl-map-link")?.addEventListener("click", () => {
      _jumpToMap(d);
    });

    panel.classList.add("open");
  }

  function _closeDetail() {
    _selected = null;
    document.querySelectorAll("#pipeline-tbody tr.selected").forEach(tr => tr.classList.remove("selected"));
    document.getElementById("pipeline-detail")?.classList.remove("open");
  }

  function _detailHTML(d) {
    const conf = _confBar(d.confidence_tier || d.confidence_score);

    const capacityBlock = (d.capacity_mw_known || d.capacity_mw_planned || d.campus_total_mw)
      ? `<div class="pl-cap-row">
           ${d.capacity_mw_known  != null ? `<div class="pl-cap-stat"><div class="pl-cap-val">${_fmtMw(d.capacity_mw_known)}</div><div class="pl-cap-unit">MW Known</div></div>` : ""}
           ${d.capacity_mw_planned != null ? `<div class="pl-cap-stat"><div class="pl-cap-val">${_fmtMw(d.capacity_mw_planned)}</div><div class="pl-cap-unit">MW Planned</div></div>` : ""}
           ${d.campus_total_mw != null ? `<div class="pl-cap-stat"><div class="pl-cap-val">${_fmtMw(d.campus_total_mw)}</div><div class="pl-cap-unit">MW Campus</div></div>` : ""}
         </div>` : "";

    const rows = [
      ["Operator",    d.operator || d.owner || null],
      ["Parent Co.",  d.parent_company || null],
      ["County",      d.county || null],
      ["State",       d.state || null],
      ["County FIPS", d.county_fips || null],
      ["Status",      d.operational_status ? _statusChip(d.operational_status) : null, true],
      ["Type",        _typeBadge(d), true],
      ["Facility Type", d.facility_type && d.facility_type !== "unknown" ? _esc(d.facility_type) : null],
      ["Op. Date",    d.operational_date || null],
      ["Const. Date", d.construction_date || null],
      ["Planned Date",d.planned_date || null],
      ["Power Utility", d.power_utility || null],
      ["Water Utility", d.water_utility || null],
      ["Cooling",     d.cooling_method || null],
      ["Land (ac)",   d.land_area_acres != null ? d.land_area_acres.toLocaleString() : null],
      ["Bldg (sqft)", d.building_sqft != null ? d.building_sqft.toLocaleString() : null],
      ["Source",      d.primary_source || null],
      ["Verified",    d.last_verified_date ? d.last_verified_date.slice(0,10) : null],
    ].filter(r => r[1] != null);

    const rowsHTML = rows.map(([k, v, raw]) =>
      `<div class="pl-detail-row">
         <div class="pl-detail-row-key">${_esc(k)}</div>
         <div class="pl-detail-row-val">${raw ? v : _esc(v)}</div>
       </div>`
    ).join("");

    return `
      <div class="pl-detail-section">
        <div class="pl-detail-section-label">Capacity</div>
        ${capacityBlock || '<div style="opacity:0.4;font-size:12px">No capacity data</div>'}
      </div>
      <div class="pl-detail-section">
        <div class="pl-detail-section-label">Data Confidence</div>
        ${conf}
      </div>
      <div class="pl-detail-section">
        <div class="pl-detail-section-label">Details</div>
        ${rowsHTML}
      </div>
      <button class="pl-map-link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
        View on Map
      </button>`;
  }

  function _confBar(tier) {
    const tiers = {
      high:   { pips: 3, label: "High confidence",   cls: "filled-high" },
      medium: { pips: 2, label: "Medium confidence",  cls: "filled-medium" },
      low:    { pips: 1, label: "Low confidence",     cls: "filled-low" },
    };
    const t = tiers[String(tier).toLowerCase()] || tiers.medium;
    const pips = [1,2,3].map(i =>
      `<div class="pl-conf-pip ${i <= t.pips ? t.cls : ''}"></div>`
    ).join("");
    return `<div class="pl-conf-bar">${pips}<span class="pl-conf-label">${_esc(t.label)}</span></div>`;
  }

  /* ── Jump to Map tab and fly to facility ── */
  function _jumpToMap(d) {
    if (!d.latitude || !d.longitude) return;
    if (typeof switchTab === "function") {
      switchTab("map");
      setTimeout(() => {
        if (typeof leafletMap !== "undefined" && leafletMap) {
          leafletMap.flyTo([d.latitude, d.longitude], 13, { duration: 1.2 });
        }
      }, 400);
    }
  }

  /* ── CSV export ── */
  function _exportCsv() {
    if (!_filtered.length) return;
    const fields = [
      ["Name",              d => d.name],
      ["Operator",          d => d.operator || d.owner || ""],
      ["Parent Company",    d => d.parent_company || ""],
      ["City",              d => d.city || ""],
      ["County",            d => d.county || ""],
      ["State",             d => d.state || ""],
      ["State Abbr",        d => d.state_abbr || ""],
      ["County FIPS",       d => d.county_fips || ""],
      ["Status",            d => d.operational_status || ""],
      ["Type",              d => _typeLabel(d)],
      ["Facility Type",     d => d.facility_type || ""],
      ["Is Hyperscale",     d => d.is_hyperscale ? "Yes" : "No"],
      ["Is Colocation",     d => d.is_colocation ? "Yes" : "No"],
      ["Is Enterprise",     d => d.is_enterprise ? "Yes" : "No"],
      ["Is Edge",           d => d.is_edge ? "Yes" : "No"],
      ["Capacity MW Known", d => d.capacity_mw_known ?? ""],
      ["Capacity MW Planned",d=> d.capacity_mw_planned ?? ""],
      ["Campus Total MW",   d => d.campus_total_mw ?? ""],
      ["Confidence Tier",   d => d.confidence_tier || ""],
      ["Last Verified",     d => d.last_verified_date || ""],
      ["Power Utility",     d => d.power_utility || ""],
      ["Water Utility",     d => d.water_utility || ""],
      ["Cooling Method",    d => d.cooling_method || ""],
      ["Land Area (ac)",    d => d.land_area_acres ?? ""],
      ["Building (sqft)",   d => d.building_sqft ?? ""],
      ["Latitude",          d => d.latitude ?? ""],
      ["Longitude",         d => d.longitude ?? ""],
    ];

    const csvCell = v => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const header = fields.map(([h]) => csvCell(h)).join(",");
    const rows   = _filtered.map(d => fields.map(([, fn]) => csvCell(fn(d))).join(","));
    const csv    = [header, ...rows].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `dc-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /* ── Helpers ── */
  function _fmtMw(v) {
    if (v == null) return "—";
    if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + " GW";
    return v % 1 === 0 ? v.toFixed(0) + " MW" : v.toFixed(1) + " MW";
  }

  function _esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Re-render (called when tab is re-opened) ── */
  function _render() {
    if (_data) {
      _renderTable();
      _updateCount();
    }
  }

  /* ── Public stats API — loads data if not yet loaded ── */
  async function stats() {
    if (!_data) {
      try {
        const r = await fetch("data/facilities_master.json");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        _data = await r.json();
      } catch (_) {
        return null;
      }
    }
    const statusCounts = {};
    const typeCounts   = {};
    const stateMw      = {};
    const operatorCounts = {};
    let totalMw = 0;
    let knownMwCount = 0;

    for (const d of _data) {
      const s = d.operational_status || "unknown";
      statusCounts[s] = (statusCounts[s] || 0) + 1;

      const t = _typeLabel(d);
      typeCounts[t] = (typeCounts[t] || 0) + 1;

      const st = d.state_abbr || d.state || "Unknown";
      if (d.capacity_mw_known) {
        stateMw[st] = (stateMw[st] || 0) + d.capacity_mw_known;
        totalMw += d.capacity_mw_known;
        knownMwCount++;
      }

      const op = d.operator || d.owner || "Unknown";
      operatorCounts[op] = (operatorCounts[op] || 0) + 1;
    }

    const topOperators = Object.entries(operatorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topStatesMw  = Object.entries(stateMw).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return {
      total: _data.length,
      totalMw,
      knownMwCount,
      statusCounts,
      typeCounts,
      topOperators,
      topStatesMw,
    };
  }

  /* ── Return all facilities for a given county FIPS ── */
  async function getByFips(fips) {
    if (!_data) {
      try {
        const r = await fetch("data/facilities_master.json");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        _data = await r.json();
      } catch (_) {
        return [];
      }
    }
    const key = String(fips).padStart(5, "0");
    return _data.filter(d => String(d.county_fips).padStart(5, "0") === key);
  }

  /* ── Return raw data array (null if not yet loaded) ── */
  function getData() { return _data; }

  /* ── Filter pipeline to a query and open the tab ── */
  function searchAndOpen(query) {
    const searchEl = document.getElementById("pipeline-search");
    if (searchEl) {
      searchEl.value = query;
      _query = query.toLowerCase();
      _applyFilters();
    }
    if (typeof switchTab === "function") switchTab("pipeline");
    if (!_inited) init();
  }

  return { init, stats, getByFips, getData, searchAndOpen };
})();
