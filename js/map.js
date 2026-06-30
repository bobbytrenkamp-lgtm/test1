/* US Data Center & AI Restrictions Map */

// Severity buckets drive map fill, legend, stats, and badges.
// Derived from each county's level (-1..4) plus its enactment status.
const SEVERITY = {
  pro:      { color: "#4ade80", label: "Pro / Incentive Hub" },
  none:     { color: "#16a34a", label: "No Restrictions" },
  proposed: { color: "#eab308", label: "Proposed Restrictions" },
  moderate: { color: "#f97316", label: "Moderate Restrictions" },
  high:     { color: "#dc2626", label: "High Restrictions" },
  ban:      { color: "#7f1d1d", label: "Moratorium / Ban" },
};

function getSeverityKey(county) {
  if (!county) return "none";
  const level  = county.level;
  const status = county.status || "active";
  if (level === -1) return "pro";
  if (level <= 0) return "none";
  if (status === "proposed" || status === "pending") return "proposed";
  if (level >= 4) return "ban";
  if (level === 3) return "high";
  return "moderate"; // levels 1-2, active
}

function getSeverityColor(county) {
  return SEVERITY[getSeverityKey(county)].color;
}

function computeSeverityCounts(counties) {
  const counts = {};
  for (const key of Object.keys(SEVERITY)) counts[key] = 0;
  for (const fips in counties) {
    counts[getSeverityKey(counties[fips])]++;
  }
  return counts;
}

const LEVEL_LABELS = {
  "-1": "Pro Data Center",
  0:    "No Specific Law",
  1:    "Light Regulations",
  2:    "Moderate Restrictions",
  3:    "Significant Restrictions",
  4:    "Ban / Moratorium",
};

const TYPE_LABELS = {
  data_center: "Data Center",
  ai:          "AI Regulation",
  crypto:      "Crypto / HPC",
  energy:      "Energy / Grid",
  water:       "Water Use",
};

const STATUS_LABELS = {
  active:   "Active",
  pending:  "Pending",
  proposed: "Proposed",
  expired:  "Expired / Lapsed",
};

// Counties to annotate — 3 most restrictive, 3 most pro
const ANNOTATIONS = [
  { fips: "41027", label: "Hood River, OR",   sub: "Only U.S. data center ban",     type: "restrictive", dx: -115, dy: -45 },
  { fips: "51107", label: "Loudoun Co., VA",  sub: "Strictest zoning restrictions", type: "restrictive", dx:   75, dy: -35 },
  { fips: "53007", label: "Chelan Co., WA",   sub: "PUD moratorium",                type: "restrictive", dx:  -95, dy: -30 },
  { fips: "41059", label: "Umatilla, OR",     sub: "Google mega-campus",            type: "pro",         dx:  -95, dy:   55 },
  { fips: "45015", label: "Berkeley Co., SC", sub: "Amazon/AWS + SC incentives",   type: "pro",         dx:   75, dy:   20 },
  { fips: "19113", label: "Cedar Rapids, IA", sub: "Iowa 0% equipment tax",         type: "pro",         dx:   10, dy:  -65 },
];

let mapData = {};
let selectedFips = null;
let currentK = 1;
let mapHandles = null;
let countyFipsIndex = {};

async function loadData() {
  const [us, data] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"),
    d3.json("data/map_data.json"),
  ]);
  return { us, data };
}

function fipsKey(id) {
  return String(id).padStart(5, "0");
}

function getColor(fips) {
  return getSeverityColor(mapData[fips]);
}

function addArrowMarkers(svg) {
  const defs = svg.append("defs");

  const makeMarker = (id, color) => {
    defs.append("marker")
      .attr("id", id)
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 6)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4Z")
      .attr("fill", color);
  };

  makeMarker("arrow-restrictive", "#ef4444");
  makeMarker("arrow-pro",         "#22c55e");
}

function addAnnotations(g, counties, path) {
  const fipsMap = {};
  counties.features.forEach(f => {
    fipsMap[fipsKey(f.id)] = f;
  });

  const annGroup = g.append("g").attr("class", "annotations");

  for (const ann of ANNOTATIONS) {
    const feature = fipsMap[ann.fips];
    if (!feature) continue;

    const centroid = path.centroid(feature);
    if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) continue;

    const [cx, cy] = centroid;
    const lx = cx + ann.dx;
    const ly = cy + ann.dy;

    const color  = ann.type === "pro" ? "#22c55e" : "#ef4444";
    const marker = ann.type === "pro" ? "url(#arrow-pro)" : "url(#arrow-restrictive)";

    const g_ann = annGroup.append("g").attr("class", `annotation annotation-${ann.type}`);

    // Connector line
    g_ann.append("line")
      .attr("class", "annotation-line")
      .attr("x1", lx).attr("y1", ly)
      .attr("x2", cx).attr("y2", cy)
      .attr("stroke", color)
      .attr("stroke-width", 0.8)
      .attr("stroke-dasharray", "3,2")
      .attr("marker-end", marker)
      .attr("opacity", 0.85);

    // Label background
    const bgW = 110, bgH = 28;
    const bgX = ann.dx < 0 ? lx - bgW : lx;
    g_ann.append("rect")
      .attr("x", bgX - 3)
      .attr("y", ly - 20)
      .attr("width", bgW + 6)
      .attr("height", bgH)
      .attr("rx", 3)
      .attr("fill", "#0f1117")
      .attr("opacity", 0.75);

    // Label text
    const anchor = ann.dx < 0 ? "end" : "start";
    const tx = ann.dx < 0 ? lx - 2 : lx + 2;

    const txt = g_ann.append("text")
      .attr("class", "annotation-text")
      .attr("x", tx)
      .attr("y", ly - 8)
      .attr("text-anchor", anchor)
      .attr("font-family", "'Inter', system-ui, sans-serif")
      .attr("fill", color);

    txt.append("tspan")
      .text(ann.label)
      .attr("font-size", "9px")
      .attr("font-weight", "700");

    txt.append("tspan")
      .text(ann.sub)
      .attr("x", tx)
      .attr("dy", "11px")
      .attr("font-size", "7.5px")
      .attr("font-weight", "400")
      .attr("opacity", 0.85);
  }
}

function renderMap(us) {
  const container = document.getElementById("map-container");
  const width  = container.clientWidth;
  const height = container.clientHeight;

  const projection = d3.geoAlbersUsa()
    .scale(Math.min(width, height) * 1.4)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const svg = d3.select("#map-svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  addArrowMarkers(svg);

  const g = svg.append("g");

  const counties  = topojson.feature(us, us.objects.counties);
  const stateMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
  const nationMesh = topojson.mesh(us, us.objects.nation);

  // Index features by FIPS for search/zoom-to lookups
  countyFipsIndex = {};
  counties.features.forEach(f => { countyFipsIndex[fipsKey(f.id)] = f; });

  // Counties
  g.selectAll("path.county")
    .data(counties.features)
    .join("path")
    .attr("class", "county")
    .attr("d", path)
    .attr("fill", d => getColor(fipsKey(d.id)))
    .attr("stroke", "#05060a")
    .attr("stroke-width", 0.35)
    .on("mousemove", onMouseMove)
    .on("mouseleave", onMouseLeave)
    .on("click", onCountyClick);

  // State borders
  g.append("path")
    .datum(stateMesh)
    .attr("class", "state-borders")
    .attr("d", path);

  // Nation border
  g.append("path")
    .datum(nationMesh)
    .attr("class", "nation-border")
    .attr("d", path);

  // Annotations (arrows + labels)
  addAnnotations(g, counties, path);

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([
      [-width * 0.3, -height * 0.3],
      [width * 1.3, height * 1.3],
    ])
    .on("zoom", event => {
      const k = event.transform.k;
      currentK = k;
      g.attr("transform", event.transform);
      // Keep annotation text + lines at consistent visual size
      g.selectAll(".annotation-text").attr("font-size", null);
      g.selectAll(".annotation-text tspan:first-child").attr("font-size", `${9 / k}px`);
      g.selectAll(".annotation-text tspan:last-child").attr("font-size", `${7.5 / k}px`);
      g.selectAll(".annotation-line").attr("stroke-width", `${0.8 / k}px`);
      g.selectAll(".annotations rect")
        .attr("width", (110 + 6) / k)
        .attr("height", 28 / k)
        .attr("rx", 3 / k);
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });

  return { svg, g, path, zoom, width, height };
}

function renderStats(data) {
  const counts = computeSeverityCounts(mapData);
  const bar = document.getElementById("stats-bar");
  bar.innerHTML = "";

  const order = ["ban", "high", "moderate", "proposed", "pro"];

  for (const key of order) {
    const count = counts[key] || 0;
    if (count === 0) continue;
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    chip.innerHTML = `
      <div class="dot" style="background:${SEVERITY[key].color}"></div>
      <strong>${count}</strong> ${SEVERITY[key].label}
    `;
    bar.appendChild(chip);
  }

  const total = document.createElement("div");
  total.className = "stat-chip";
  total.innerHTML = `<strong>${data.stats.total_counties_tracked}</strong>&nbsp;counties tracked`;
  bar.appendChild(total);
}

function renderLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = `<h3>Restriction Severity</h3>`;

  const items = [
    { key: "ban",      sub: "Outright prohibition" },
    { key: "high",      sub: "Active, significant limits" },
    { key: "moderate",  sub: "Active, light-to-moderate limits" },
    { key: "proposed",  sub: "Pending / not yet enacted" },
    { key: "none",      sub: "No known restrictions" },
    { key: "pro",        sub: "Tax incentives / major hub" },
  ];

  for (const item of items) {
    const el = document.createElement("div");
    el.className = "legend-item";

    el.innerHTML = `
      <div class="legend-swatch" style="background:${SEVERITY[item.key].color};"></div>
      <div>
        <div class="legend-label-main">${SEVERITY[item.key].label}</div>
        <div class="legend-label-sub">${item.sub}</div>
      </div>
    `;
    legend.appendChild(el);
  }

  // Arrow key
  const divider = document.createElement("div");
  divider.style.cssText = "border-top:1px solid #2e3352; margin: 8px 0;";
  legend.appendChild(divider);

  const arrows = [
    { color: "#ef4444", label: "Most restrictive areas" },
    { color: "#22c55e", label: "Most pro-data-center areas" },
  ];
  for (const a of arrows) {
    const el = document.createElement("div");
    el.className = "legend-item";
    el.innerHTML = `
      <svg width="18" height="10" viewBox="0 0 18 10" style="flex-shrink:0">
        <line x1="0" y1="5" x2="12" y2="5" stroke="${a.color}" stroke-width="1.5" stroke-dasharray="3,2"/>
        <polygon points="12,1 18,5 12,9" fill="${a.color}"/>
      </svg>
      <div class="legend-label-main" style="font-size:10px">${a.label}</div>
    `;
    legend.appendChild(el);
  }
}

function animateCounter(el, target, duration = 900) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString("en-US");
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderDashboard(data) {
  const counts = computeSeverityCounts(mapData);
  const activeRestrictions = counts.moderate + counts.high + counts.ban;
  const proposedRestrictions = counts.proposed;

  const statesWithLegislation = new Set();
  for (const fips in mapData) {
    if (mapData[fips].level >= 1) statesWithLegislation.add(mapData[fips].state);
  }

  let lastUpdated = "Unknown";
  if (data.generated_at) {
    lastUpdated = new Date(data.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const cards = [
    { label: "Counties — Active Restrictions",   value: activeRestrictions },
    { label: "Counties — Proposed Restrictions", value: proposedRestrictions },
    { label: "States w/ AI / DC Legislation",    value: statesWithLegislation.size },
    { label: "Existing Data Center Capacity",    text: "Not yet tracked" },
    { label: "Planned Capacity",                 text: "Not yet tracked" },
    { label: "Last Updated",                     text: lastUpdated },
  ];

  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  for (const card of cards) {
    const el = document.createElement("div");
    el.className = "stat-card";
    if (card.text) {
      el.innerHTML = `<div class="stat-card-value stat-card-text">${card.text}</div><div class="stat-card-label">${card.label}</div>`;
    } else {
      el.innerHTML = `<div class="stat-card-value">0</div><div class="stat-card-label">${card.label}</div>`;
    }
    dashboard.appendChild(el);
    if (!card.text) {
      animateCounter(el.querySelector(".stat-card-value"), card.value);
    }
  }
}

function setDetailEmpty() {
  document.getElementById("detail-header").querySelector("h2").textContent = "County Details";
  document.getElementById("detail-state").textContent = "";
  document.getElementById("detail-body").innerHTML = `
    <div id="detail-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
      <p>Click any county on the map to see its restriction details.</p>
    </div>
  `;
}

function setDetailCounty(fips, county) {
  document.getElementById("detail-header").querySelector("h2").textContent = county.name;
  document.getElementById("detail-state").textContent = county.state;

  const level  = county.level;
  const types  = county.types || [];
  const status = county.status || "active";

  const severityKey = getSeverityKey(county);

  document.getElementById("detail-body").innerHTML = `
    <div class="restriction-badge badge-${severityKey}">
      ${levelDot(level, status)}
      ${level === -1 ? "Pro Data Center" : `Level ${level} — ${LEVEL_LABELS[level]}`}
    </div>

    ${county.title ? `
    <div class="detail-section">
      <div class="detail-label">Restriction / Policy</div>
      <div class="detail-value">${escHtml(county.title)}</div>
    </div>` : ""}

    ${county.description ? `
    <div class="detail-section">
      <div class="detail-label">Description</div>
      <div class="detail-value">${escHtml(county.description)}</div>
    </div>` : ""}

    ${types.length ? `
    <div class="detail-section">
      <div class="detail-label">Types</div>
      <div class="type-chips">
        ${types.map(t => `<span class="type-chip ${t}">${TYPE_LABELS[t] || t}</span>`).join("")}
      </div>
    </div>` : ""}

    <div class="divider"></div>

    <div class="detail-section">
      <div class="detail-label">Status</div>
      <div class="detail-value">
        <span class="status-indicator">
          <span class="status-dot ${status}"></span>
          ${STATUS_LABELS[status] || status}
        </span>
      </div>
    </div>

    ${county.effective_date ? `
    <div class="detail-section">
      <div class="detail-label">Effective Date</div>
      <div class="detail-value">${formatDate(county.effective_date)}</div>
    </div>` : ""}

    ${county.notes ? `
    <div class="detail-section">
      <div class="detail-label">Notes</div>
      <div class="detail-value">${escHtml(county.notes)}</div>
    </div>` : ""}

    ${county.sources && county.sources.length ? `
    <div class="detail-section">
      <div class="detail-label">Sources</div>
      <ul class="sources-list">
        ${county.sources.map(s => `<li>${escHtml(s)}</li>`).join("")}
      </ul>
    </div>` : ""}
  `;
}

function setDetailNoRestriction(name, state) {
  document.getElementById("detail-header").querySelector("h2").textContent = name || "Unknown County";
  document.getElementById("detail-state").textContent = state || "";
  document.getElementById("detail-body").innerHTML = `
    <div class="restriction-badge badge-none">
      ${levelDot(0, "active")}
      No Specific Law
    </div>
    <div class="detail-section">
      <div class="detail-value" style="color:var(--text-muted);font-size:13px;line-height:1.6;">
        No specific data center or AI restrictions have been identified for this county.<br><br>
        Standard state and federal regulations apply only.
      </div>
    </div>
  `;
}

function levelDot(level, status) {
  const col = SEVERITY[getSeverityKey({ level, status })].color;
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};border:1px solid rgba(255,255,255,0.2)"></span>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDate(d) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  } catch { return d; }
}

// Tooltip
const tooltip = document.getElementById("tooltip");

function onMouseMove(event, d) {
  const fips   = fipsKey(d.id);
  const county = mapData[fips];
  if (!county) { tooltip.style.display = "none"; return; }

  tooltip.style.display = "block";
  tooltip.querySelector(".tip-name").textContent  = `${county.name}, ${county.state}`;
  tooltip.querySelector(".tip-level").textContent =
    county.level === -1 ? "Pro Data Center" : `Level ${county.level} — ${LEVEL_LABELS[county.level]}`;

  const rect = document.getElementById("map-container").getBoundingClientRect();
  let x = event.clientX - rect.left + 12;
  let y = event.clientY - rect.top  - 40;
  if (x + 230 > rect.width)  x = event.clientX - rect.left - 230;
  if (y < 0)                  y = event.clientY - rect.top  + 12;
  tooltip.style.left = x + "px";
  tooltip.style.top  = y + "px";
}

function onMouseLeave() { tooltip.style.display = "none"; }

function onCountyClick(event, d) {
  const fips   = fipsKey(d.id);
  const county = mapData[fips];
  d3.selectAll(".county").classed("selected", false);
  d3.select(this).classed("selected", true);
  selectedFips = fips;
  county ? setDetailCounty(fips, county) : setDetailNoRestriction();
}

function setLastUpdated(data) {
  const el = document.getElementById("last-updated");
  if (data.generated_at) {
    const d = new Date(data.generated_at);
    el.textContent = `Data updated ${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
  }
}

function zoomToFeature(feature) {
  if (!mapHandles) return;
  const { svg, path, zoom, width, height } = mapHandles;
  const [[x0, y0], [x1, y1]] = path.bounds(feature);
  const dx = x1 - x0, dy = y1 - y0;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const scale = Math.max(1, Math.min(8, 0.85 / Math.max(dx / width, dy / height)));
  const translate = [width / 2 - scale * cx, height / 2 - scale * cy];
  svg.transition().duration(700)
    .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
}

function selectCounty(fips) {
  const county = mapData[fips];
  d3.selectAll(".county").classed("selected", false);
  d3.selectAll(".county").filter(d => fipsKey(d.id) === fips).classed("selected", true);
  selectedFips = fips;
  county ? setDetailCounty(fips, county) : setDetailNoRestriction(county?.name, county?.state);
}

function initSearch() {
  const input   = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  const index = Object.keys(mapData).map(fips => ({
    fips,
    name: mapData[fips].name,
    state: mapData[fips].state,
  }));

  function renderResults(matches) {
    results.innerHTML = "";
    if (!matches.length) { results.style.display = "none"; return; }
    for (const m of matches) {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.textContent = `${m.name}, ${m.state}`;
      item.addEventListener("mousedown", () => {
        input.value = `${m.name}, ${m.state}`;
        results.style.display = "none";
        const feature = countyFipsIndex[m.fips];
        if (feature) zoomToFeature(feature);
        selectCounty(m.fips);
      });
      results.appendChild(item);
    }
    results.style.display = "block";
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.style.display = "none"; return; }
    const matches = index
      .filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
      .slice(0, 8);
    renderResults(matches);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) input.dispatchEvent(new Event("input"));
  });

  input.addEventListener("blur", () => {
    setTimeout(() => { results.style.display = "none"; }, 100);
  });
}

async function init() {
  try {
    const { us, data } = await loadData();
    mapData = data.counties || {};
    renderDashboard(data);
    renderLegend();
    renderStats(data);
    mapHandles = renderMap(us);
    initSearch();
    setDetailEmpty();
    setLastUpdated(data);
    document.getElementById("loading").style.display = "none";
  } catch (err) {
    console.error(err);
    document.getElementById("loading").innerHTML = `
      <div style="color:#e05252;font-size:14px;">Failed to load map data. Please refresh.</div>
      <div style="color:#888;font-size:12px;margin-top:8px;">${escHtml(err.message)}</div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", init);
