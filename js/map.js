/* US Data Center & AI Restrictions Map */

const LEVEL_COLORS = {
  "-1": "#16a34a",  // green  — pro data center
  0:    "#f1f5f9",  // near-white — no law (no fill)
  1:    "#fca5a5",  // light red
  2:    "#f87171",  // medium red
  3:    "#dc2626",  // red
  4:    "#7f1d1d",  // dark blood red — ban
};

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
  const county = mapData[fips];
  if (!county) return LEVEL_COLORS[0];
  const lvl = String(county.level);
  return LEVEL_COLORS[lvl] ?? LEVEL_COLORS[0];
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

  // Counties
  g.selectAll("path.county")
    .data(counties.features)
    .join("path")
    .attr("class", "county")
    .attr("d", path)
    .attr("fill", d => getColor(fipsKey(d.id)))
    .attr("stroke", d => {
      const level = (mapData[fipsKey(d.id)] || {}).level ?? 0;
      return level === 0 ? "#9ca3af" : "#0f1117";
    })
    .attr("stroke-width", 0.3)
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
      g.selectAll(".annotations rect").each(function() {
        const el = d3.select(this);
        const w = parseFloat(el.attr("width"));
        const h = parseFloat(el.attr("height"));
        el.attr("width", (110 + 6) / k).attr("height", 28 / k)
          .attr("y", d => el.attr("y"))
          .attr("rx", 3 / k);
      });
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });

  return { svg, g, path, zoom };
}

function renderStats(data) {
  const stats = data.stats;
  const bar = document.getElementById("stats-bar");
  bar.innerHTML = "";

  const items = [
    { level: 4,  label: "Ban / Moratorium" },
    { level: 3,  label: "Significant" },
    { level: 2,  label: "Moderate" },
    { level: 1,  label: "Light Regs" },
    { level: -1, label: "Pro Data Center" },
  ];

  for (const item of items) {
    const count = stats.by_level[item.level] || 0;
    if (count === 0) continue;
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    chip.innerHTML = `
      <div class="dot" style="background:${LEVEL_COLORS[item.level]}"></div>
      <strong>${count}</strong> ${item.label}
    `;
    bar.appendChild(chip);
  }

  const total = document.createElement("div");
  total.className = "stat-chip";
  total.innerHTML = `<strong>${stats.total_counties_tracked}</strong>&nbsp;counties tracked`;
  bar.appendChild(total);
}

function renderLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = `<h3>Restriction Level</h3>`;

  const items = [
    { key: "4",  label: "Most Restrictive",      sub: "Ban / Moratorium" },
    { key: "3",  label: "Significant Restrictions" },
    { key: "2",  label: "Moderate Restrictions" },
    { key: "1",  label: "Light Regulations" },
    { key: "0",  label: "No Specific Law",        nofill: true },
    { key: "-1", label: "Pro Data Center",         sub: "Tax incentives / major hub" },
  ];

  for (const item of items) {
    const el = document.createElement("div");
    el.className = "legend-item";

    const swatchStyle = item.nofill
      ? `background:#f1f5f9; border: 1px solid #9ca3af;`
      : `background:${LEVEL_COLORS[item.key]};`;

    el.innerHTML = `
      <div class="legend-swatch" style="${swatchStyle}"></div>
      <div>
        <div class="legend-label-main">${item.label}</div>
        ${item.sub ? `<div class="legend-label-sub">${item.sub}</div>` : ""}
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

  document.getElementById("detail-body").innerHTML = `
    <div class="restriction-badge badge-${level < 0 ? "neg1" : level}">
      ${levelDot(level)}
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
    <div class="restriction-badge badge-0">
      ${levelDot(0)}
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

function levelDot(level) {
  const col = LEVEL_COLORS[String(level)] ?? LEVEL_COLORS[0];
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

async function init() {
  try {
    const { us, data } = await loadData();
    mapData = data.counties || {};
    renderLegend();
    renderStats(data);
    renderMap(us);
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
