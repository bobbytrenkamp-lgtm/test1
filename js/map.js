/* US Data Center & AI Restrictions Map */

const LEVEL_COLORS = {
  0: "#1e2235",
  1: "#5c3317",
  2: "#a0410d",
  3: "#c62a00",
  4: "#8b0000",
};

const LEVEL_LABELS = {
  0: "No Known Restrictions",
  1: "Light Regulations",
  2: "Moderate Restrictions",
  3: "Significant Restrictions",
  4: "Ban / Moratorium",
};

const TYPE_LABELS = {
  data_center: "Data Center",
  ai: "AI Regulation",
  crypto: "Crypto / HPC",
  energy: "Energy / Grid",
  water: "Water Use",
};

const STATUS_LABELS = {
  active: "Active",
  pending: "Pending",
  proposed: "Proposed",
  expired: "Expired / Lapsed",
};

let mapData = {};
let selectedFips = null;

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
  return LEVEL_COLORS[county.level] || LEVEL_COLORS[0];
}

function renderMap(us) {
  const container = document.getElementById("map-container");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const projection = d3
    .geoAlbersUsa()
    .scale(Math.min(width, height) * 1.4)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const svg = d3
    .select("#map-svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g");

  const counties = topojson.feature(us, us.objects.counties);
  const stateMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
  const nationMesh = topojson.mesh(us, us.objects.nation);

  // Draw counties
  g.selectAll("path.county")
    .data(counties.features)
    .join("path")
    .attr("class", "county")
    .attr("d", path)
    .attr("fill", (d) => getColor(fipsKey(d.id)))
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

  // Zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([1, 10])
    .translateExtent([
      [-width * 0.3, -height * 0.3],
      [width * 1.3, height * 1.3],
    ])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Double-click to reset zoom
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
    { level: 4, label: "Ban / Moratorium" },
    { level: 3, label: "Significant" },
    { level: 2, label: "Moderate" },
    { level: 1, label: "Light Regs" },
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

  for (const [lvl, label] of Object.entries(LEVEL_LABELS)) {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <div class="legend-swatch" style="background:${LEVEL_COLORS[lvl]}"></div>
      <span>${label}</span>
    `;
    legend.appendChild(item);
  }
}

function setDetailEmpty() {
  const body = document.getElementById("detail-body");
  document.getElementById("detail-header").querySelector("h2").textContent =
    "County Details";
  document.getElementById("detail-state").textContent = "";
  body.innerHTML = `
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
  const header = document.getElementById("detail-header");
  header.querySelector("h2").textContent = county.name;
  document.getElementById("detail-state").textContent = county.state;

  const level = county.level;
  const types = county.types || [];
  const status = county.status || "active";

  const body = document.getElementById("detail-body");
  body.innerHTML = `
    <div class="restriction-badge badge-${level}">
      ${levelDot(level)}
      Level ${level} — ${LEVEL_LABELS[level]}
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
      <div class="detail-label">Restriction Types</div>
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
  const header = document.getElementById("detail-header");
  header.querySelector("h2").textContent = name || "Unknown County";
  document.getElementById("detail-state").textContent = state || "";

  document.getElementById("detail-body").innerHTML = `
    <div class="restriction-badge badge-0">
      ${levelDot(0)}
      Level 0 — No Known Restrictions
    </div>
    <div class="detail-section">
      <div class="detail-value" style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">
        No specific data center or AI restrictions have been identified for this county.<br><br>
        This county follows standard state and federal regulations only.
      </div>
    </div>
  `;
}

function levelDot(level) {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${LEVEL_COLORS[level]};border:1px solid rgba(255,255,255,0.2)"></span>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr) {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// Tooltip
const tooltip = document.getElementById("tooltip");

function onMouseMove(event, d) {
  const fips = fipsKey(d.id);
  const county = mapData[fips];

  if (!county) {
    tooltip.style.display = "none";
    return;
  }

  tooltip.style.display = "block";
  tooltip.querySelector(".tip-name").textContent = `${county.name}, ${county.state}`;
  tooltip.querySelector(".tip-level").textContent = `Level ${county.level} — ${LEVEL_LABELS[county.level]}`;

  const rect = document.getElementById("map-container").getBoundingClientRect();
  let x = event.clientX - rect.left + 12;
  let y = event.clientY - rect.top - 40;

  if (x + 230 > rect.width) x = event.clientX - rect.left - 230;
  if (y < 0) y = event.clientY - rect.top + 12;

  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function onMouseLeave() {
  tooltip.style.display = "none";
}

function onCountyClick(event, d) {
  const fips = fipsKey(d.id);
  const county = mapData[fips];

  // Deselect previous
  d3.selectAll(".county").classed("selected", false);
  d3.select(this).classed("selected", true);
  selectedFips = fips;

  if (county) {
    setDetailCounty(fips, county);
  } else {
    setDetailNoRestriction();
  }
}

function setLastUpdated(data) {
  const el = document.getElementById("last-updated");
  if (data.generated_at) {
    const d = new Date(data.generated_at);
    el.textContent = `Data updated ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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
    console.error("Failed to load map data:", err);
    document.getElementById("loading").innerHTML = `
      <div style="color:#e05252;font-size:14px;">Failed to load map data. Please refresh.</div>
      <div style="color:#888;font-size:12px;margin-top:8px;">${escHtml(err.message)}</div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", init);
