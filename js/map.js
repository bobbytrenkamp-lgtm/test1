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

// Layer toggle definitions for the filter panel. "Restrictions" is the only
// layer backed by real curated data — everything else ships as clearly
// labeled sample/placeholder data until verified sources are wired in.
const LAYER_DEFS = [
  { id: "restrictions", label: "Restrictions",               group: "Core",            color: "#dc2626", sample: false },
  { id: "dc_existing",  label: "Existing Data Centers",       group: "Facilities",      color: "#5b8def", sample: true  },
  { id: "dc_planned",   label: "Planned Data Centers",        group: "Facilities",      color: "#5b8def", sample: true  },
  { id: "ai_campus",    label: "AI Campuses",                 group: "Facilities",      color: "#a78bfa", sample: true  },
  { id: "power",        label: "Power Infrastructure",        group: "Infrastructure",  color: "#34d399", sample: true  },
  { id: "transmission", label: "Transmission Lines",          group: "Infrastructure",  color: "#fbbf24", sample: true  },
  { id: "fiber",        label: "Fiber Network",                group: "Infrastructure",  color: "#60a5fa", sample: true  },
  { id: "water",        label: "Water Availability",          group: "Land & Policy",   color: "#1d4ed8", sample: true  },
  { id: "utility",      label: "Utility Service Territories", group: "Land & Policy",   color: "#f472b6", sample: true  },
  { id: "tax",          label: "Tax Incentive Areas",         group: "Land & Policy",   color: "#fbbf24", sample: true  },
];

const SAMPLE_DISCLAIMER = "Sample data — for UI demonstration only. Replace with verified source before public release.";

let mapData = {};
let sampleLayers = null;
let selectedFips = null;
let currentK = 1;
let mapHandles = null;
let countyFipsIndex = {};
let countySelection = null;
const layerGroups = {};
const layerState = {
  restrictions: true,
  dc_existing: false,
  dc_planned: false,
  ai_campus: false,
  power: false,
  transmission: false,
  fiber: false,
  water: false,
  utility: false,
  tax: false,
};

async function loadData() {
  const [us, data, sample] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"),
    d3.json("data/map_data.json"),
    d3.json("data/sample_layers.json"),
  ]);
  return { us, data, sample };
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

const UTILITY_COLORS = ["#f472b6", "#fb923c", "#38bdf8", "#a3e635"];
function utilityColor(territoryId) {
  const idx = (sampleLayers.utility_territories || []).findIndex(t => t.id === territoryId);
  return UTILITY_COLORS[idx % UTILITY_COLORS.length];
}

const capacityRadius = d3.scaleSqrt().domain([0, 800]).range([3, 16]).clamp(true);

function renderSampleMarkerLayers(g, projection) {
  const project = ([lon, lat]) => projection([lon, lat]) || [-9999, -9999];

  // Transmission lines
  const transmissionGroup = g.append("g").attr("class", "layer-group layer-transmission").style("display", "none");
  layerGroups.transmission = transmissionGroup;
  const lineGen = d3.line().x(d => d[0]).y(d => d[1]);
  transmissionGroup.selectAll("path")
    .data(sampleLayers.transmission_lines || [])
    .join("path")
    .attr("class", "layer-line line-transmission")
    .attr("data-sw", 1.1)
    .attr("stroke-width", 1.1)
    .attr("d", d => lineGen(d.path.map(project)))
    .append("title")
    .text(d => `${d.name} (${d.voltage_kv} kV) — ${SAMPLE_DISCLAIMER}`);

  // Fiber network
  const fiberGroup = g.append("g").attr("class", "layer-group layer-fiber").style("display", "none");
  layerGroups.fiber = fiberGroup;
  fiberGroup.selectAll("path")
    .data(sampleLayers.fiber_network || [])
    .join("path")
    .attr("class", "layer-line line-fiber")
    .attr("data-sw", 1)
    .attr("stroke-width", 1)
    .attr("d", d => lineGen(d.path.map(project)))
    .append("title")
    .text(d => `${d.name} — ${SAMPLE_DISCLAIMER}`);

  // Power infrastructure (fixed-size circles)
  const powerGroup = g.append("g").attr("class", "layer-group layer-power").style("display", "none");
  layerGroups.power = powerGroup;
  powerGroup.selectAll("circle")
    .data(sampleLayers.power_infrastructure || [])
    .join("circle")
    .attr("class", "map-marker marker-power")
    .attr("data-r", 5)
    .attr("r", 5)
    .attr("cx", d => project([d.lon, d.lat])[0])
    .attr("cy", d => project([d.lon, d.lat])[1])
    .on("click", (event, d) => { event.stopPropagation(); setDetailFacility(d, "power"); })
    .append("title")
    .text(d => `${d.name} — ${SAMPLE_DISCLAIMER}`);

  // AI campuses
  const aiGroup = g.append("g").attr("class", "layer-group layer-ai_campus").style("display", "none");
  layerGroups.ai_campus = aiGroup;
  aiGroup.selectAll("circle")
    .data(sampleLayers.ai_campuses || [])
    .join("circle")
    .attr("class", "map-marker marker-ai-campus")
    .attr("data-r", 6)
    .attr("r", 6)
    .attr("cx", d => project([d.lon, d.lat])[0])
    .attr("cy", d => project([d.lon, d.lat])[1])
    .on("click", (event, d) => { event.stopPropagation(); setDetailFacility(d, "ai_campus"); })
    .append("title")
    .text(d => `${d.name} — ${SAMPLE_DISCLAIMER}`);

  // Planned data centers (drawn before existing so existing sits on top)
  const plannedGroup = g.append("g").attr("class", "layer-group layer-dc_planned").style("display", "none");
  layerGroups.dc_planned = plannedGroup;
  plannedGroup.selectAll("circle")
    .data((sampleLayers.data_centers || []).filter(d => d.status === "planned"))
    .join("circle")
    .attr("class", "map-marker marker-dc-planned")
    .attr("data-r", d => capacityRadius(d.capacity_mw))
    .attr("r", d => capacityRadius(d.capacity_mw))
    .attr("cx", d => project([d.lon, d.lat])[0])
    .attr("cy", d => project([d.lon, d.lat])[1])
    .on("click", (event, d) => { event.stopPropagation(); setDetailFacility(d, "dc_planned"); })
    .append("title")
    .text(d => `${d.name} — ${SAMPLE_DISCLAIMER}`);

  // Existing data centers
  const existingGroup = g.append("g").attr("class", "layer-group layer-dc_existing").style("display", "none");
  layerGroups.dc_existing = existingGroup;
  existingGroup.selectAll("circle")
    .data((sampleLayers.data_centers || []).filter(d => d.status === "existing"))
    .join("circle")
    .attr("class", "map-marker marker-dc-existing")
    .attr("data-r", d => capacityRadius(d.capacity_mw))
    .attr("r", d => capacityRadius(d.capacity_mw))
    .attr("cx", d => project([d.lon, d.lat])[0])
    .attr("cy", d => project([d.lon, d.lat])[1])
    .on("click", (event, d) => { event.stopPropagation(); setDetailFacility(d, "dc_existing"); })
    .append("title")
    .text(d => `${d.name} — ${SAMPLE_DISCLAIMER}`);
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
  countySelection = g.selectAll("path.county")
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

  // Water / utility / tax overlays — appended after counties so they paint on top
  const waterGroup = g.append("g").attr("class", "layer-group layer-water").style("display", "none");
  layerGroups.water = waterGroup;

  const utilityGroup = g.append("g").attr("class", "layer-group layer-utility").style("display", "none");
  layerGroups.utility = utilityGroup;

  const taxGroup = g.append("g").attr("class", "layer-group layer-tax").style("display", "none");
  layerGroups.tax = taxGroup;

  if (sampleLayers) {
    const waterStress = sampleLayers.water_stress || {};
    const waterOpacity = { 0: 0, 1: 0.16, 2: 0.32, 3: 0.5 };
    waterGroup.selectAll("path")
      .data(counties.features.filter(f => waterStress[fipsKey(f.id)] !== undefined))
      .join("path")
      .attr("class", "water-overlay")
      .attr("d", path)
      .attr("fill", "#1d4ed8")
      .attr("opacity", d => waterOpacity[waterStress[fipsKey(d.id)]] || 0);

    (sampleLayers.utility_territories || []).forEach(territory => {
      const fipsSet = new Set(territory.fips_list);
      const color = utilityColor(territory.id);
      utilityGroup.selectAll(`path.ut-${territory.id}`)
        .data(counties.features.filter(f => fipsSet.has(fipsKey(f.id))))
        .join("path")
        .attr("class", `utility-overlay ut-${territory.id}`)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.3);
    });

    const taxSet = new Set(sampleLayers.tax_incentive_counties || []);
    taxGroup.selectAll("path")
      .data(counties.features.filter(f => taxSet.has(fipsKey(f.id))))
      .join("path")
      .attr("class", "tax-overlay")
      .attr("d", path);
  }

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

  // Sample facility / infrastructure layers (points + lines)
  if (sampleLayers) renderSampleMarkerLayers(g, projection);

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
      // Keep markers + lines at consistent visual size while zoomed
      g.selectAll(".map-marker[data-r]").attr("r", function() {
        return (+this.getAttribute("data-r")) / k;
      });
      g.selectAll(".layer-line").attr("stroke-width", function() {
        return (+this.getAttribute("data-sw")) / k;
      });
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });

  return { svg, g, path, projection, zoom, width, height };
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

const SAMPLE_LEGEND_ENTRIES = {
  dc_existing:  { swatch: "circle", color: "#5b8def", label: "Data Center (existing)" },
  dc_planned:   { swatch: "ring",   color: "#5b8def", label: "Data Center (planned)" },
  ai_campus:    { swatch: "circle", color: "#a78bfa", label: "AI Campus" },
  power:        { swatch: "circle", color: "#34d399", label: "Power Infrastructure" },
  transmission: { swatch: "line",   color: "#fbbf24", label: "Transmission Line" },
  fiber:        { swatch: "line",   color: "#60a5fa", label: "Fiber Route" },
  water:        { swatch: "square", color: "#1d4ed8", label: "Water Stress" },
  utility:      { swatch: "outline",color: "#f472b6", label: "Utility Territory" },
  tax:          { swatch: "outline",color: "#fbbf24", label: "Tax Incentive Area" },
};

function legendSwatchHtml(entry) {
  if (entry.swatch === "line") {
    return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><line x1="1" y1="7" x2="13" y2="7" stroke="${entry.color}" stroke-width="2" stroke-dasharray="3,2"/></svg>`;
  }
  if (entry.swatch === "ring") {
    return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><circle cx="7" cy="7" r="5" fill="none" stroke="${entry.color}" stroke-width="1.6" stroke-dasharray="2,1.5"/></svg>`;
  }
  if (entry.swatch === "outline") {
    return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="none" stroke="${entry.color}" stroke-width="1.6"/></svg>`;
  }
  return `<div class="legend-swatch" style="background:${entry.color};"></div>`;
}

function renderLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";

  if (layerState.restrictions) {
    const header = document.createElement("h3");
    header.textContent = "Restriction Severity";
    legend.appendChild(header);

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

  // Active sample-layer entries
  const activeSampleKeys = Object.keys(SAMPLE_LEGEND_ENTRIES).filter(k => layerState[k]);
  if (activeSampleKeys.length) {
    if (legend.children.length) {
      const divider = document.createElement("div");
      divider.style.cssText = "border-top:1px solid #2e3352; margin: 8px 0;";
      legend.appendChild(divider);
    }
    const header = document.createElement("h3");
    header.innerHTML = `Active Layers <span class="sample-tag" style="margin-left:4px;">Sample</span>`;
    legend.appendChild(header);

    for (const key of activeSampleKeys) {
      const entry = SAMPLE_LEGEND_ENTRIES[key];
      const el = document.createElement("div");
      el.className = "legend-item";
      el.innerHTML = `${legendSwatchHtml(entry)}<div class="legend-label-main">${entry.label}</div>`;
      legend.appendChild(el);
    }
  }

  if (!legend.children.length) {
    legend.innerHTML = `<div class="legend-label-sub">No layers active. Use the Layers panel to add one.</div>`;
  }
}

function renderFilterPanel() {
  const body = document.getElementById("filter-panel-body");
  body.innerHTML = "";

  const groups = [];
  for (const def of LAYER_DEFS) {
    let group = groups.find(g => g.name === def.group);
    if (!group) { group = { name: def.group, items: [] }; groups.push(group); }
    group.items.push(def);
  }

  let sampleBannerAdded = false;

  for (const group of groups) {
    const label = document.createElement("div");
    label.className = "filter-group-label";
    label.textContent = group.name;
    body.appendChild(label);

    for (const def of group.items) {
      if (def.sample && !sampleBannerAdded) {
        const banner = document.createElement("div");
        banner.className = "sample-banner";
        banner.style.margin = "4px 8px 8px";
        banner.innerHTML = `<span>⚠</span><span>${SAMPLE_DISCLAIMER}</span>`;
        body.appendChild(banner);
        sampleBannerAdded = true;
      }

      const row = document.createElement("div");
      row.className = "filter-row";
      row.innerHTML = `
        <label class="filter-row-label">
          <span class="filter-row-dot" style="background:${def.color}"></span>
          <span class="name">${def.label}</span>
          ${def.sample ? '<span class="sample-tag">Sample</span>' : ""}
        </label>
        <span class="toggle-switch">
          <input type="checkbox" data-layer="${def.id}" ${layerState[def.id] ? "checked" : ""} />
          <span class="toggle-slider"></span>
        </span>
      `;
      body.appendChild(row);
    }
  }

  body.querySelectorAll('input[type="checkbox"][data-layer]').forEach(input => {
    input.addEventListener("change", () => {
      setLayerVisible(input.dataset.layer, input.checked);
    });
  });
}

function setLayerVisible(id, visible, syncUI = false) {
  layerState[id] = visible;

  if (id === "restrictions") {
    if (countySelection) {
      countySelection.attr("fill", d => visible ? getColor(fipsKey(d.id)) : "#1e2235");
    }
  } else if (layerGroups[id]) {
    layerGroups[id].style("display", visible ? null : "none");
  }

  if (syncUI) {
    const input = document.querySelector(`#filter-panel-body input[data-layer="${id}"]`);
    if (input) input.checked = visible;
  }

  renderLegend();
}

function openFilterPanel() {
  document.getElementById("filter-panel").classList.add("open");
  document.getElementById("filter-panel-backdrop").classList.add("open");
  document.getElementById("filter-toggle").classList.add("active");
  document.getElementById("filter-toggle").setAttribute("aria-expanded", "true");
}

function closeFilterPanel() {
  document.getElementById("filter-panel").classList.remove("open");
  document.getElementById("filter-panel-backdrop").classList.remove("open");
  document.getElementById("filter-toggle").classList.remove("active");
  document.getElementById("filter-toggle").setAttribute("aria-expanded", "false");
}

function initFilterPanelControls() {
  const toggleBtn = document.getElementById("filter-toggle");
  const closeBtn  = document.getElementById("filter-panel-close");
  const backdrop  = document.getElementById("filter-panel-backdrop");
  const panel     = document.getElementById("filter-panel");

  toggleBtn.addEventListener("click", () => {
    panel.classList.contains("open") ? closeFilterPanel() : openFilterPanel();
  });
  closeBtn.addEventListener("click", closeFilterPanel);
  backdrop.addEventListener("click", closeFilterPanel);

  document.getElementById("detail-panel-close").addEventListener("click", closeMobileSheet);
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

  const dcs = (sampleLayers && sampleLayers.data_centers) || [];
  const existingMW = dcs.filter(d => d.status === "existing").reduce((s, d) => s + d.capacity_mw, 0);
  const plannedMW  = dcs.filter(d => d.status === "planned").reduce((s, d) => s + d.capacity_mw, 0);

  const cards = [
    { label: "Counties — Active Restrictions",   value: activeRestrictions },
    { label: "Counties — Proposed Restrictions", value: proposedRestrictions },
    { label: "States w/ AI / DC Legislation",    value: statesWithLegislation.size },
    { label: "Existing Data Center Capacity",    text: `${(existingMW / 1000).toFixed(1)} GW`, sample: true },
    { label: "Planned Capacity",                 text: `${(plannedMW / 1000).toFixed(1)} GW`, sample: true },
    { label: "Last Updated",                     text: lastUpdated },
  ];

  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  for (const card of cards) {
    const el = document.createElement("div");
    el.className = "stat-card";
    const tag = card.sample ? `<span class="sample-tag" style="margin-left:6px;">Sample</span>` : "";
    if (card.text) {
      el.innerHTML = `<div class="stat-card-value stat-card-text">${card.text}${tag}</div><div class="stat-card-label">${card.label}</div>`;
    } else {
      el.innerHTML = `<div class="stat-card-value">0</div><div class="stat-card-label">${card.label}</div>`;
    }
    dashboard.appendChild(el);
    if (!card.text) {
      animateCounter(el.querySelector(".stat-card-value"), card.value);
    }
  }
}

function openMobileSheet() {
  document.getElementById("detail-panel").classList.add("sheet-open");
}

function closeMobileSheet() {
  document.getElementById("detail-panel").classList.remove("sheet-open");
}

const WATER_STRESS_LABELS = { 0: "Low stress", 1: "Moderate stress", 2: "Elevated stress", 3: "High stress" };

function buildSampleInfraHtml(fips) {
  if (!sampleLayers) return "";

  const facilities = (sampleLayers.data_centers || []).filter(d => d.county_fips === fips);
  const campuses    = (sampleLayers.ai_campuses || []).filter(d => d.county_fips === fips);
  const waterLevel  = sampleLayers.water_stress ? sampleLayers.water_stress[fips] : undefined;
  const hasTaxIncentive = (sampleLayers.tax_incentive_counties || []).includes(fips);
  const utility = (sampleLayers.utility_territories || []).find(t => t.fips_list.includes(fips));

  if (!facilities.length && !campuses.length && waterLevel === undefined && !hasTaxIncentive && !utility) {
    return "";
  }

  let html = `
    <div class="divider"></div>
    <div class="sample-banner">
      <span>⚠</span><span>${SAMPLE_DISCLAIMER}</span>
    </div>
  `;

  if (facilities.length) {
    html += `
    <div class="detail-section">
      <div class="detail-label">Infrastructure <span class="sample-tag">Sample</span></div>
      <div class="detail-value">
        ${facilities.map(f => `${escHtml(f.name)} — ${f.capacity_mw} MW (${f.status})`).join("<br>")}
      </div>
    </div>`;
  }

  const operators = [...new Set([...facilities, ...campuses].map(f => f.operator))];
  if (operators.length) {
    html += `
    <div class="detail-section">
      <div class="detail-label">Major Operators <span class="sample-tag">Sample</span></div>
      <div class="type-chips">
        ${operators.map(o => `<span class="type-chip">${escHtml(o)}</span>`).join("")}
      </div>
    </div>`;
  }

  if (campuses.length) {
    html += `
    <div class="detail-section">
      <div class="detail-label">AI Campuses <span class="sample-tag">Sample</span></div>
      <div class="detail-value">${campuses.map(c => escHtml(c.name)).join("<br>")}</div>
    </div>`;
  }

  if (waterLevel !== undefined || hasTaxIncentive || utility) {
    html += `
    <div class="detail-section">
      <div class="detail-label">Site Factors <span class="sample-tag">Sample</span></div>
      <div class="detail-value">
        ${waterLevel !== undefined ? `Water availability: ${WATER_STRESS_LABELS[waterLevel]}<br>` : ""}
        ${utility ? `Utility territory: ${escHtml(utility.name)}<br>` : ""}
        ${hasTaxIncentive ? `Tax incentive area: Yes` : ""}
      </div>
    </div>`;
  }

  return html;
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
  closeMobileSheet();
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

    ${buildSampleInfraHtml(fips)}
  `;
  openMobileSheet();
}

function setDetailNoRestriction(name, state, fips) {
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

    ${fips ? buildSampleInfraHtml(fips) : ""}
  `;
  openMobileSheet();
}

const FACILITY_KIND_LABELS = {
  dc_existing: "Data Center — Existing",
  dc_planned:  "Data Center — Planned",
  ai_campus:   "AI Campus",
  power:       "Power Infrastructure",
};

function setDetailFacility(facility, kind) {
  document.getElementById("detail-header").querySelector("h2").textContent = facility.name;
  document.getElementById("detail-state").textContent = FACILITY_KIND_LABELS[kind] || "";

  const county = mapData[facility.county_fips];

  document.getElementById("detail-body").innerHTML = `
    <div class="sample-banner">
      <span>⚠</span><span>${SAMPLE_DISCLAIMER}</span>
    </div>

    ${facility.operator ? `
    <div class="detail-section">
      <div class="detail-label">Operator</div>
      <div class="detail-value">${escHtml(facility.operator)}</div>
    </div>` : ""}

    ${facility.capacity_mw ? `
    <div class="detail-section">
      <div class="detail-label">Capacity</div>
      <div class="detail-value">${facility.capacity_mw.toLocaleString("en-US")} MW</div>
    </div>` : ""}

    ${facility.status ? `
    <div class="detail-section">
      <div class="detail-label">Status</div>
      <div class="detail-value" style="text-transform:capitalize;">${facility.status}</div>
    </div>` : ""}

    ${facility.year_built ? `
    <div class="detail-section">
      <div class="detail-label">Year Built</div>
      <div class="detail-value">${facility.year_built}</div>
    </div>` : ""}

    ${facility.type ? `
    <div class="detail-section">
      <div class="detail-label">Type</div>
      <div class="detail-value" style="text-transform:capitalize;">${facility.type}</div>
    </div>` : ""}

    ${facility.notes ? `
    <div class="detail-section">
      <div class="detail-label">Notes</div>
      <div class="detail-value">${escHtml(facility.notes)}</div>
    </div>` : ""}

    ${county ? `
    <div class="detail-section">
      <div class="detail-label">County</div>
      <div class="detail-value">${escHtml(county.name)}, ${escHtml(county.state)}</div>
    </div>` : ""}
  `;
  openMobileSheet();
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
  county ? setDetailCounty(fips, county) : setDetailNoRestriction(undefined, undefined, fips);
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
  county ? setDetailCounty(fips, county) : setDetailNoRestriction(county?.name, county?.state, fips);
}

function initSearch() {
  const input   = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  const countyIndex = Object.keys(mapData).map(fips => ({
    kind: "county",
    fips,
    name: mapData[fips].name,
    state: mapData[fips].state,
    searchText: `${mapData[fips].name} ${mapData[fips].state}`.toLowerCase(),
  }));

  const facilityIndex = [];
  if (sampleLayers) {
    const facilityKindOf = d => (d.status === "planned" ? "dc_planned" : "dc_existing");
    (sampleLayers.data_centers || []).forEach(d => facilityIndex.push({
      kind: "facility", facilityKind: facilityKindOf(d), raw: d,
      name: d.name, sub: d.operator, fips: d.county_fips,
      searchText: `${d.name} ${d.operator}`.toLowerCase(),
    }));
    (sampleLayers.ai_campuses || []).forEach(d => facilityIndex.push({
      kind: "facility", facilityKind: "ai_campus", raw: d,
      name: d.name, sub: d.operator, fips: d.county_fips,
      searchText: `${d.name} ${d.operator}`.toLowerCase(),
    }));
  }

  const index = [...countyIndex, ...facilityIndex];

  function renderResults(matches) {
    results.innerHTML = "";
    if (!matches.length) { results.style.display = "none"; return; }
    for (const m of matches) {
      const item = document.createElement("div");
      item.className = "search-result-item";
      if (m.kind === "county") {
        item.textContent = `${m.name}, ${m.state}`;
      } else {
        item.innerHTML = `${escHtml(m.name)} <span class="sample-tag" style="margin-left:6px;">Sample</span>`;
      }
      item.addEventListener("mousedown", () => {
        input.value = m.kind === "county" ? `${m.name}, ${m.state}` : m.name;
        results.style.display = "none";
        const feature = countyFipsIndex[m.fips];
        if (feature) zoomToFeature(feature);
        if (m.kind === "county") {
          selectCounty(m.fips);
        } else {
          setLayerVisible(m.facilityKind, true, true);
          selectedFips = null;
          d3.selectAll(".county").classed("selected", false);
          setDetailFacility(m.raw, m.facilityKind);
        }
      });
      results.appendChild(item);
    }
    results.style.display = "block";
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.style.display = "none"; return; }
    const matches = index
      .filter(c => c.searchText.includes(q))
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
    const { us, data, sample } = await loadData();
    mapData = data.counties || {};
    sampleLayers = sample || null;
    renderDashboard(data);
    renderFilterPanel();
    renderLegend();
    renderStats(data);
    mapHandles = renderMap(us);
    initFilterPanelControls();
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
