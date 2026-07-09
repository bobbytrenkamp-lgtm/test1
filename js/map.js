/* US Data Center & AI Restrictions Map — Leaflet Edition */

/* ── Severity model ── */
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
  if (level <= 0)   return "none";
  if (status === "proposed" || status === "pending") return "proposed";
  if (level >= 4)   return "ban";
  if (level === 3)  return "high";
  return "moderate";
}

function getSeverityColor(county) {
  return SEVERITY[getSeverityKey(county)].color;
}

function computeSeverityCounts(counties) {
  const counts = {};
  for (const key of Object.keys(SEVERITY)) counts[key] = 0;
  for (const fips in counties) counts[getSeverityKey(counties[fips])]++;
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

const STATE_FIPS = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY",
};

const STATE_NAMES = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California",
  CO:"Colorado", CT:"Connecticut", DE:"Delaware", DC:"District of Columbia",
  FL:"Florida", GA:"Georgia", HI:"Hawaii", ID:"Idaho", IL:"Illinois",
  IN:"Indiana", IA:"Iowa", KS:"Kansas", KY:"Kentucky", LA:"Louisiana",
  ME:"Maine", MD:"Maryland", MA:"Massachusetts", MI:"Michigan", MN:"Minnesota",
  MS:"Mississippi", MO:"Missouri", MT:"Montana", NE:"Nebraska", NV:"Nevada",
  NH:"New Hampshire", NJ:"New Jersey", NM:"New Mexico", NY:"New York",
  NC:"North Carolina", ND:"North Dakota", OH:"Ohio", OK:"Oklahoma",
  OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina",
  SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont",
  VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming",
};

/* ── Annotations (callout labels, togglable) ── */
const ANNOTATIONS = [
  { fips: "41027", label: "Hood River, OR",   sub: "Only U.S. data center ban",     type: "restrictive" },
  { fips: "51107", label: "Loudoun Co., VA",  sub: "Strictest zoning restrictions", type: "restrictive" },
  { fips: "53007", label: "Chelan Co., WA",   sub: "PUD moratorium",                type: "restrictive" },
  { fips: "41059", label: "Umatilla, OR",     sub: "Google mega-campus",            type: "pro" },
  { fips: "45015", label: "Berkeley Co., SC", sub: "Amazon/AWS + SC incentives",    type: "pro" },
  { fips: "19113", label: "Cedar Rapids, IA", sub: "Iowa 0% equipment tax",         type: "pro" },
];

/* ── Layer definitions ── */
const LAYER_DEFS = [
  { id: "restrictions",  label: "County Policy",              group: "Policy Scope",   color: "#dc2626", sample: false },
  { id: "state_policy",  label: "State Policy",               group: "Policy Scope",   color: "#8b5cf6", sample: false },
  { id: "city_policy",   label: "City Policy",                group: "Policy Scope",   color: "#3b82f6", sample: false, noData: true },
  { id: "dc_existing",   label: "Existing Data Centers",      group: "Facilities",     color: "#5b8def", sample: false },
  { id: "dc_planned",    label: "Planned Data Centers",       group: "Facilities",     color: "#f59e0b", sample: false },
  { id: "ai_campus",     label: "AI Campuses",                group: "Facilities",     color: "#a78bfa", sample: false },
  { id: "power",         label: "Power Infrastructure",       group: "Infrastructure", color: "#34d399", sample: false },
  { id: "transmission",  label: "Transmission Lines",         group: "Infrastructure", color: "#fbbf24", sample: true  },
  { id: "fiber",         label: "Fiber Network",              group: "Infrastructure", color: "#60a5fa", sample: true  },
  { id: "water",         label: "Water Availability",         group: "Land & Policy",  color: "#1d4ed8", sample: false },
  { id: "utility",       label: "Utility Territories",        group: "Land & Policy",  color: "#f472b6", sample: false },
  { id: "tax",           label: "Tax Incentive Areas",        group: "Land & Policy",  color: "#fbbf24", sample: false },
  { id: "annotations",  label: "Best & Worst Markets",       group: "Highlights",     color: "#e4e6f0", sample: false },
];

const SAMPLE_DISCLAIMER = "Approximate route — exact alignment unverified.";

/* ── Global state ── */
let leafletMap      = null;
let countyGeoLayer  = null;
let stateGeoLayer   = null;
let annotationGroup = null;
let baseTileLayers  = {};
let activeTile      = "standard";
let hybridLabels    = null;

const countyLayerByFips = {};
const leafletLayerGroups = {};

const layerState = {
  restrictions: true,
  state_policy: true,
  city_policy:  false,  // no data yet
  dc_existing:  false,
  dc_planned:   false,
  ai_campus:    false,
  power:        false,
  transmission: false,
  fiber:        false,
  water:        false,
  utility:      false,
  tax:          false,
  annotations:  true,
};

let mapData         = {};
let sampleLayers    = null;
let stateRegData    = {};
let legendState     = 0; // 0=full, 1=mini, 2=hidden
let selectedFips    = null;
let cityLabelsLayer = null;

/* ── Helpers ── */
function fipsKey(id) { return String(id).padStart(5, "0"); }

function getColor(fips) {
  const county = mapData[fips];
  return county ? getSeverityColor(county) : "#1e2235";
}

function getStateColor(fips2) {
  const st = stateRegData[fips2];
  return st ? SEVERITY[getSeverityKey(st)].color : "#1e2235";
}

function capacityRadius(mw) {
  return 3 + 13 * Math.sqrt(Math.max(0, Math.min(800, mw || 0)) / 800);
}

const UTILITY_COLORS = ["#f472b6", "#fb923c", "#38bdf8", "#a3e635"];

/* ── County / state style functions ── */
function countyStyle(feature) {
  const fips   = fipsKey(feature.id);
  const isSat  = activeTile !== "standard";

  if (!layerState.restrictions) {
    return { fillColor: "#1e2235", fillOpacity: isSat ? 0 : 0.12, color: "#05060a", weight: 0.35 };
  }

  const county     = mapData[fips];
  const sevKey     = getSeverityKey(county);
  const hasData    = sevKey !== "none";  // pro/proposed/moderate/high/ban are all visible on satellite

  return {
    fillColor:   getColor(fips),
    fillOpacity: isSat ? (hasData ? 0.70 : 0) : 0.75,
    color:       "#05060a",
    weight:      0.35,
  };
}

function stateStyle(feature) {
  const fips2 = String(feature.id).padStart(2, "0");
  const has   = !!stateRegData[fips2];
  return {
    fillColor:   getStateColor(fips2),
    fillOpacity: layerState.state_policy ? (has ? 0.28 : 0.06) : 0,
    color:       "#4a5180",
    weight:      layerState.state_policy ? 0.7 : 0,
    opacity:     layerState.state_policy ? 0.6 : 0,
  };
}

/* ── Data loading ── */
async function loadData() {
  const load = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
  const [us, data, sample, stateReg] = await Promise.all([
    load("vendor/counties-10m.json"),
    load("data/map_data.json"),
    load("data/sample_layers.json"),
    load("data/state_regulations.json"),
  ]);
  return { us, data, sample, stateReg };
}

/* ── Basemap management ── */
function initBasemaps() {
  baseTileLayers.standard = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }
  );
  baseTileLayers.satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "&copy; Esri, DigitalGlobe, GeoEye, USDA FSA, USGS, AeroGRID, IGN, and the GIS User Community",
      maxZoom: 19,
    }
  );
  hybridLabels = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 20, pane: "tooltipPane" }
  );

  // City/place labels always visible above county fills regardless of basemap
  cityLabelsLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 20, pane: "labelsPane", opacity: 0.9 }
  );
  cityLabelsLayer.addTo(leafletMap);

  baseTileLayers.standard.addTo(leafletMap);
}

function switchBasemap(type) {
  activeTile = type;
  Object.values(baseTileLayers).forEach(l => { if (leafletMap.hasLayer(l)) leafletMap.removeLayer(l); });
  if (leafletMap.hasLayer(hybridLabels)) leafletMap.removeLayer(hybridLabels);

  if (type === "standard") {
    baseTileLayers.standard.addTo(leafletMap);
  } else if (type === "satellite") {
    baseTileLayers.satellite.addTo(leafletMap);
  } else {
    baseTileLayers.satellite.addTo(leafletMap);
    hybridLabels.addTo(leafletMap);
  }

  document.querySelectorAll(".basemap-chip").forEach(b => {
    b.classList.toggle("active", b.dataset.basemap === type);
  });

  // Re-apply county opacity rules (satellite hides "no restriction" fills)
  if (countyGeoLayer) {
    countyGeoLayer.setStyle(countyStyle);
    if (selectedFips && countyLayerByFips[selectedFips]) {
      countyLayerByFips[selectedFips].setStyle({ color: "#ffffff", weight: 2.5, fillOpacity: 0.92 });
    }
  }
}

/* ── Tooltip ── */
const tooltip = document.getElementById("tooltip");

function showTooltip(mouseEvent, fips) {
  const county = mapData[fips];
  const stAbbr = STATE_FIPS[fips.slice(0, 2)] || "";
  const name   = county ? `${county.name}, ${county.state}` : (stAbbr ? `County, ${stAbbr}` : fips);
  const level  = county
    ? (county.level === -1 ? "Pro Data Center" : `Level ${county.level} — ${LEVEL_LABELS[county.level]}`)
    : "No restriction data";

  tooltip.querySelector(".tip-name").textContent  = name;
  tooltip.querySelector(".tip-level").textContent = level;
  tooltip.style.display = "block";

  const rect = document.getElementById("map-container").getBoundingClientRect();
  let x = mouseEvent.clientX - rect.left + 14;
  let y = mouseEvent.clientY - rect.top  - 44;
  if (x + 240 > rect.width) x = mouseEvent.clientX - rect.left - 240;
  if (y < 0)                 y = mouseEvent.clientY - rect.top  + 14;
  tooltip.style.left = x + "px";
  tooltip.style.top  = y + "px";
}

/* ── County interactions ── */
function handleCountyMouseover(e, fips) {
  if (fips !== selectedFips) {
    e.target.setStyle({ color: "#f97316", weight: 2, fillOpacity: 0.88 });
    e.target.bringToFront();
  }
  showTooltip(e.originalEvent, fips);
}

function handleCountyMousemove(e) {
  if (tooltip.style.display === "block") {
    const rect = document.getElementById("map-container").getBoundingClientRect();
    let x = e.originalEvent.clientX - rect.left + 14;
    let y = e.originalEvent.clientY - rect.top  - 44;
    if (x + 240 > rect.width) x = e.originalEvent.clientX - rect.left - 240;
    if (y < 0)                 y = e.originalEvent.clientY - rect.top  + 14;
    tooltip.style.left = x + "px";
    tooltip.style.top  = y + "px";
  }
}

function handleCountyMouseout(e, fips) {
  tooltip.style.display = "none";
  if (fips !== selectedFips) {
    countyGeoLayer.resetStyle(e.target);
  }
}

function handleCountyClick(e, fips) {
  L.DomEvent.stopPropagation(e);
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
  }
  selectedFips = fips;
  setLocationHash(fips);
  e.target.setStyle({ color: "#ffffff", weight: 2.5, fillOpacity: 0.92 });
  e.target.bringToFront();

  const county = mapData[fips];
  if (county) {
    setDetailCounty(fips, county);
  } else {
    const stAbbr = STATE_FIPS[fips.slice(0, 2)] || "";
    setDetailNoRestriction(null, stAbbr, fips);
  }
}

/* ── County layer init ── */
function initCountyLayer(countiesGeoJSON) {
  countyGeoLayer = L.geoJSON(countiesGeoJSON, {
    style:         countyStyle,
    onEachFeature: (feature, layer) => {
      const fips = fipsKey(feature.id);
      countyLayerByFips[fips] = layer;
      layer.on({
        mouseover: e => handleCountyMouseover(e, fips),
        mousemove: e => handleCountyMousemove(e),
        mouseout:  e => handleCountyMouseout(e, fips),
        click:     e => handleCountyClick(e, fips),
      });
    },
  });
  countyGeoLayer.addTo(leafletMap);
}

/* ── State layer init ── */
function initStateLayer(statesGeoJSON) {
  stateGeoLayer = L.geoJSON(statesGeoJSON, {
    style:       stateStyle,
    interactive: false,
  });
  stateGeoLayer.addTo(leafletMap);
}

/* ── Annotations ── */
function addAnnotations(countiesGeoJSON) {
  if (annotationGroup) { leafletMap.removeLayer(annotationGroup); }
  annotationGroup = L.layerGroup();

  const fipsMap = {};
  countiesGeoJSON.features.forEach(f => { fipsMap[fipsKey(f.id)] = f; });

  for (const ann of ANNOTATIONS) {
    const feature = fipsMap[ann.fips];
    if (!feature) continue;

    const bounds = L.geoJSON(feature).getBounds();
    const center = bounds.getCenter();

    const marker = L.circleMarker(center, { radius: 0, fillOpacity: 0, stroke: false, interactive: false });
    marker.bindTooltip(
      `<strong>${ann.label}</strong><span class="ann-sub">${ann.sub}</span>`,
      {
        permanent:   true,
        className:   `ann-tooltip ann-${ann.type}`,
        direction:   "top",
        offset:      [0, -2],
        interactive: false,
      }
    );
    annotationGroup.addLayer(marker);
  }

  if (layerState.annotations) annotationGroup.addTo(leafletMap);
}

/* ── Sample overlay layers ── */
function renderSampleMarkerLayers(countiesGeoJSON) {
  if (!sampleLayers) return;

  const project = ([lng, lat]) => [lat, lng];

  // Transmission lines
  const transmissionGroup = L.layerGroup();
  (sampleLayers.transmission_lines || []).forEach(d => {
    L.polyline(d.path.map(project), {
      color: "#fbbf24", weight: 1.1, opacity: 0.85, dashArray: "4,2",
    })
      .bindTooltip(`${d.name} (${d.voltage_kv} kV) — ${SAMPLE_DISCLAIMER}`)
      .addTo(transmissionGroup);
  });
  leafletLayerGroups.transmission = transmissionGroup;

  // Fiber
  const fiberGroup = L.layerGroup();
  (sampleLayers.fiber_network || []).forEach(d => {
    L.polyline(d.path.map(project), {
      color: "#60a5fa", weight: 1, opacity: 0.85, dashArray: "1,2",
    })
      .bindTooltip(`${d.name} — ${SAMPLE_DISCLAIMER}`)
      .addTo(fiberGroup);
  });
  leafletLayerGroups.fiber = fiberGroup;

  // Power infrastructure
  const powerGroup = L.layerGroup();
  (sampleLayers.power_infrastructure || []).forEach(d => {
    L.circleMarker([d.lat, d.lon], { radius: 5, color: "#0b0d14", weight: 0.8, fillColor: "#34d399", fillOpacity: 1 })
      .bindTooltip(d.name)
      .on("click", () => setDetailFacility(d, "power"))
      .addTo(powerGroup);
  });
  leafletLayerGroups.power = powerGroup;

  // AI campuses
  const aiGroup = L.layerGroup();
  (sampleLayers.ai_campuses || []).forEach(d => {
    L.circleMarker([d.lat, d.lon], { radius: 6, color: "#0b0d14", weight: 1, fillColor: "#a78bfa", fillOpacity: 0.9 })
      .bindTooltip(d.name)
      .on("click", e => { L.DomEvent.stopPropagation(e); setDetailFacility(d, "ai_campus"); })
      .addTo(aiGroup);
  });
  leafletLayerGroups.ai_campus = aiGroup;

  // Planned data centers
  const plannedGroup = L.layerGroup();
  (sampleLayers.data_centers || []).filter(d => d.status === "planned").forEach(d => {
    const r = capacityRadius(d.capacity_mw);
    L.circleMarker([d.lat, d.lon], { radius: r, color: "#f59e0b", weight: 1.8, fillColor: "rgba(245,158,11,0.15)", fillOpacity: 1, dashArray: "3,2" })
      .bindTooltip(`${d.name}${d.year_planned ? ` (target ${d.year_planned})` : ""}`)
      .on("click", e => { L.DomEvent.stopPropagation(e); setDetailFacility(d, "dc_planned"); })
      .addTo(plannedGroup);
  });
  leafletLayerGroups.dc_planned = plannedGroup;

  // Existing data centers
  const existingGroup = L.layerGroup();
  (sampleLayers.data_centers || []).filter(d => d.status === "existing").forEach(d => {
    const r = capacityRadius(d.capacity_mw);
    L.circleMarker([d.lat, d.lon], { radius: r, color: "#0b0d14", weight: 1, fillColor: "#5b8def", fillOpacity: 0.88 })
      .bindTooltip(d.name)
      .on("click", e => { L.DomEvent.stopPropagation(e); setDetailFacility(d, "dc_existing"); })
      .addTo(existingGroup);
  });
  leafletLayerGroups.dc_existing = existingGroup;

  // Water stress (county fill overlay)
  const waterGroup = L.layerGroup();
  const waterStress   = sampleLayers.water_stress || {};
  const waterOpacity  = { 0: 0, 1: 0.15, 2: 0.30, 3: 0.48 };
  countiesGeoJSON.features
    .filter(f => waterStress[fipsKey(f.id)] !== undefined)
    .forEach(f => {
      const level = waterStress[fipsKey(f.id)];
      if (!level) return;
      L.geoJSON(f, {
        style: { fillColor: "#1d4ed8", fillOpacity: waterOpacity[level] || 0, color: "none", weight: 0 },
        interactive: false,
      }).addTo(waterGroup);
    });
  leafletLayerGroups.water = waterGroup;

  // Utility territories
  const utilityGroup = L.layerGroup();
  (sampleLayers.utility_territories || []).forEach((territory, idx) => {
    const color  = UTILITY_COLORS[idx % UTILITY_COLORS.length];
    const fipsSet = new Set(territory.fips_list);
    countiesGeoJSON.features
      .filter(f => fipsSet.has(fipsKey(f.id)))
      .forEach(f => {
        L.geoJSON(f, {
          style: { fill: false, color, weight: 1.3, opacity: 0.8 },
          interactive: false,
        }).addTo(utilityGroup);
      });
  });
  leafletLayerGroups.utility = utilityGroup;

  // Tax incentive areas
  const taxGroup = L.layerGroup();
  const taxSet   = new Set(sampleLayers.tax_incentive_counties || []);
  countiesGeoJSON.features
    .filter(f => taxSet.has(fipsKey(f.id)))
    .forEach(f => {
      L.geoJSON(f, {
        style: { fill: false, color: "#fbbf24", weight: 1.6, opacity: 0.8 },
        interactive: false,
      }).addTo(taxGroup);
    });
  leafletLayerGroups.tax = taxGroup;
}

/* ── Layer visibility toggle ── */
function setLayerVisible(id, visible, syncUI = false) {
  layerState[id] = visible;

  if (id === "restrictions") {
    if (countyGeoLayer) {
      countyGeoLayer.setStyle(countyStyle);
      if (selectedFips && countyLayerByFips[selectedFips]) {
        countyLayerByFips[selectedFips].setStyle({ color: "#ffffff", weight: 2.5, fillOpacity: 0.92 });
      }
    }
  } else if (id === "state_policy") {
    if (stateGeoLayer) {
      stateGeoLayer.setStyle(stateStyle);
    }
  } else if (id === "annotations") {
    if (annotationGroup) {
      if (visible) annotationGroup.addTo(leafletMap);
      else leafletMap.removeLayer(annotationGroup);
    }
  } else {
    const group = leafletLayerGroups[id];
    if (group) {
      if (visible) group.addTo(leafletMap);
      else leafletMap.removeLayer(group);
    }
  }

  if (syncUI) {
    const input = document.querySelector(`#filter-panel-body input[data-layer="${id}"]`);
    if (input) input.checked = visible;
  }
  renderLegend();
}

/* ── Map init ── */
function initLeafletMap() {
  leafletMap = L.map("leaflet-map", {
    center:       [38, -96],
    zoom:         4,
    maxZoom:      18,
    minZoom:      3,
    zoomControl:  false,
    preferCanvas: false,
  });

  L.control.zoom({ position: "bottomright" }).addTo(leafletMap);
  leafletMap.fitBounds([[24.5, -125], [49.5, -66.5]]);

  // Home button — resets view to full US
  const HomeControl = L.Control.extend({
    options: { position: "bottomright" },
    onAdd() {
      const btn = L.DomUtil.create("button", "leaflet-bar leaflet-control map-home-btn");
      btn.title = "Reset view to full US";
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
      L.DomEvent.on(btn, "click", e => {
        L.DomEvent.stopPropagation(e);
        leafletMap.flyToBounds([[24.5, -125], [49.5, -66.5]], { duration: 0.7 });
      });
      return btn;
    },
  });
  new HomeControl().addTo(leafletMap);

  // Pane for city/place labels sitting above county fills but below markers
  leafletMap.createPane("labelsPane");
  leafletMap.getPane("labelsPane").style.zIndex = 450;
  leafletMap.getPane("labelsPane").style.pointerEvents = "none";

  initBasemaps();

  leafletMap.on("click", () => {
    if (selectedFips && countyLayerByFips[selectedFips]) {
      countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
    }
    selectedFips = null;
    setDetailEmpty();
  });
}

/* ── Stats bar ── */
function renderStats() {
  const counts = computeSeverityCounts(mapData);
  const bar    = document.getElementById("stats-bar");
  bar.innerHTML = "";
  const order  = ["ban", "high", "moderate", "proposed", "pro"];
  for (const key of order) {
    const count = counts[key] || 0;
    if (!count) continue;
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    chip.innerHTML = `<div class="dot" style="background:${SEVERITY[key].color}"></div><strong>${count}</strong> ${SEVERITY[key].label}`;
    bar.appendChild(chip);
  }
}

/* ── Legend ── */
const SAMPLE_LEGEND_ENTRIES = {
  state_policy:  { swatch: "square",  color: "#8b5cf6", label: "State Policy" },
  dc_existing:   { swatch: "circle",  color: "#5b8def", label: "Data Center (existing)" },
  dc_planned:    { swatch: "ring",    color: "#f59e0b", label: "Data Center (planned)" },
  ai_campus:     { swatch: "circle",  color: "#a78bfa", label: "AI Campus" },
  power:         { swatch: "circle",  color: "#34d399", label: "Power Infrastructure" },
  transmission:  { swatch: "line",    color: "#fbbf24", label: "Transmission Line" },
  fiber:         { swatch: "line",    color: "#60a5fa", label: "Fiber Route" },
  water:         { swatch: "square",  color: "#1d4ed8", label: "Water Stress" },
  utility:       { swatch: "outline", color: "#f472b6", label: "Utility Territory" },
  tax:           { swatch: "outline", color: "#fbbf24", label: "Tax Incentive Area" },
};

function legendSwatchHtml(entry) {
  if (entry.swatch === "line")
    return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><line x1="1" y1="7" x2="13" y2="7" stroke="${entry.color}" stroke-width="2" stroke-dasharray="3,2"/></svg>`;
  if (entry.swatch === "ring")
    return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><circle cx="7" cy="7" r="5" fill="none" stroke="${entry.color}" stroke-width="1.6" stroke-dasharray="2,1.5"/></svg>`;
  if (entry.swatch === "outline")
    return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="none" stroke="${entry.color}" stroke-width="1.6"/></svg>`;
  if (entry.swatch === "circle")
    return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><circle cx="7" cy="7" r="5" fill="${entry.color}"/></svg>`;
  return `<div class="legend-swatch" style="background:${entry.color};"></div>`;
}

function renderLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";

  const isMini    = legendState === 1;
  const expandDsp = isMini ? "flex" : "none";
  const minIcon   = isMini
    ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

  const toolbar = document.createElement("div");
  toolbar.className = "legend-toolbar";
  toolbar.innerHTML = `
    <span class="legend-drag-handle" title="Drag to reposition">
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3" cy="3"  r="1.5"/><circle cx="9" cy="3"  r="1.5"/>
        <circle cx="3" cy="8"  r="1.5"/><circle cx="9" cy="8"  r="1.5"/>
        <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
      </svg>
    </span>
    <span class="legend-toolbar-title">Legend</span>
    <button class="legend-expand-btn" style="display:${expandDsp}" title="Expand legend">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <button class="legend-minimize-btn" title="${isMini ? "Hide legend" : "Minimize legend"}">${minIcon}</button>
  `;
  legend.appendChild(toolbar);
  legend.classList.toggle("legend-mini",   isMini);
  legend.classList.toggle("legend-hidden", legendState === 2);

  if (layerState.restrictions) {
    const h = document.createElement("h3");
    h.textContent = "Restriction Severity";
    legend.appendChild(h);

    const items = [
      { key: "ban",      sub: "Outright prohibition" },
      { key: "high",     sub: "Active, significant limits" },
      { key: "moderate", sub: "Active, light-to-moderate limits" },
      { key: "proposed", sub: "Pending / not yet enacted" },
      { key: "none",     sub: "No known restrictions" },
      { key: "pro",      sub: "Tax incentives / major hub" },
    ];
    for (const item of items) {
      const el = document.createElement("div");
      el.className = "legend-item";
      el.innerHTML = `
        <div class="legend-swatch" style="background:${SEVERITY[item.key].color};"></div>
        <div>
          <div class="legend-label-main">${SEVERITY[item.key].label}</div>
          <div class="legend-label-sub">${item.sub}</div>
        </div>`;
      legend.appendChild(el);
    }

    const div = document.createElement("div");
    div.style.cssText = "border-top:1px solid #2e3352; margin:8px 0;";
    legend.appendChild(div);
  }

  // Policy scope section
  if (layerState.restrictions || layerState.state_policy) {
    const sh = document.createElement("h3");
    sh.textContent = "Policy Scope";
    legend.appendChild(sh);

    const scopeItems = [
      { color: "#8b5cf6", opacity: 0.32, label: "Statewide",  sub: "State-level overlay" },
      { color: "#dc2626", opacity: 0.75, label: "Countywide", sub: "County restriction" },
      { color: "#3b82f6", opacity: 0.75, label: "Citywide",   sub: "Municipal (no data yet)" },
    ];
    for (const s of scopeItems) {
      const el = document.createElement("div");
      el.className = "legend-item";
      el.innerHTML = `
        <div class="legend-swatch" style="background:${s.color};opacity:${s.opacity};border:1px solid ${s.color};"></div>
        <div>
          <div class="legend-label-main">${s.label}</div>
          <div class="legend-label-sub">${s.sub}</div>
        </div>`;
      legend.appendChild(el);
    }
    const sd = document.createElement("div");
    sd.style.cssText = "border-top:1px solid #2e3352; margin:8px 0;";
    legend.appendChild(sd);
  }

  const activeOverlays = Object.keys(SAMPLE_LEGEND_ENTRIES).filter(k => layerState[k]);
  if (activeOverlays.length) {
    const h = document.createElement("h3");
    h.innerHTML = `Active Layers`;
    legend.appendChild(h);
    for (const key of activeOverlays) {
      const entry = SAMPLE_LEGEND_ENTRIES[key];
      const el    = document.createElement("div");
      el.className = "legend-item";
      el.innerHTML = `${legendSwatchHtml(entry)}<div class="legend-label-main">${entry.label}</div>`;
      legend.appendChild(el);
    }
  }

  if (!legend.children.length || (legend.children.length === 1 && legend.querySelector(".legend-toolbar"))) {
    const empty = document.createElement("div");
    empty.className = "legend-label-sub";
    empty.textContent = "No layers active.";
    legend.appendChild(empty);
  }

  const expandBtn = legend.querySelector(".legend-expand-btn");
  if (expandBtn) expandBtn.style.display = legendState === 1 ? "flex" : "none";
}

/* ── Filter Panel ── */
function renderFilterPanel() {
  const body = document.getElementById("filter-panel-body");
  body.innerHTML = "";

  const bmLabel = document.createElement("div");
  bmLabel.className = "filter-group-label";
  bmLabel.textContent = "Basemap";
  body.appendChild(bmLabel);

  const bmRow = document.createElement("div");
  bmRow.className = "basemap-chips";
  ["standard", "satellite", "hybrid"].forEach(type => {
    const btn = document.createElement("button");
    btn.className = "basemap-chip" + (activeTile === type ? " active" : "");
    btn.dataset.basemap = type;
    btn.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    btn.addEventListener("click", () => switchBasemap(type));
    bmRow.appendChild(btn);
  });
  body.appendChild(bmRow);

  const groups = [];
  for (const def of LAYER_DEFS) {
    let g = groups.find(x => x.name === def.group);
    if (!g) { g = { name: def.group, items: [] }; groups.push(g); }
    g.items.push(def);
  }

  let sampleBannerShown = false;

  for (const group of groups) {
    const label = document.createElement("div");
    label.className = "filter-group-label";
    label.textContent = group.name;
    body.appendChild(label);

    for (const def of group.items) {
      if (def.sample && !sampleBannerShown) {
        const banner = document.createElement("div");
        banner.className = "sample-banner";
        banner.style.margin = "4px 8px 8px";
        banner.innerHTML = `<span>⚠</span><span>${SAMPLE_DISCLAIMER}</span>`;
        body.appendChild(banner);
        sampleBannerShown = true;
      }

      // Use <label> as the row so tapping anywhere on the row toggles the checkbox
      const row = document.createElement("label");
      row.className = "filter-row" + (def.noData ? " filter-row-disabled" : "");
      row.innerHTML = `
        <span class="filter-row-label">
          <span class="filter-row-dot" style="background:${def.color}"></span>
          <span class="name">${def.label}</span>
          ${def.sample  ? '<span class="sample-tag">Sample</span>' : ""}
          ${def.noData  ? '<span class="no-data-tag">No data</span>' : ""}
        </span>
        <span class="toggle-switch">
          <input type="checkbox" data-layer="${def.id}" ${layerState[def.id] ? "checked" : ""} ${def.noData ? "disabled" : ""} />
          <span class="toggle-slider"></span>
        </span>`;
      body.appendChild(row);
    }
  }

  body.querySelectorAll('input[type="checkbox"][data-layer]:not([disabled])').forEach(input => {
    input.addEventListener("change", () => setLayerVisible(input.dataset.layer, input.checked));
  });
}

/* ── Panel open/close ── */
function openFilterPanel() {
  const panel = document.getElementById("filter-panel");
  const mc    = document.getElementById("map-container");
  if (mc) {
    const rect = mc.getBoundingClientRect();
    if (window.innerWidth > 700) {
      // Desktop: float the panel over the map at the same position it had
      // when it was absolutely-positioned inside #map-container.
      panel.style.left      = (rect.left + 20) + "px";
      panel.style.top       = (rect.top  + 12) + "px";
      panel.style.maxHeight = (rect.height - 24) + "px";
    } else {
      // Mobile: bottom sheet — CSS handles left/right/bottom; just cap height
      // so the panel never slides up over the search bar.
      panel.style.left      = "";
      panel.style.top       = "";
      panel.style.maxHeight = rect.height + "px";
    }
  }
  panel.classList.add("open");
  document.getElementById("filter-panel-backdrop").classList.add("open");
  document.getElementById("filter-toggle").classList.add("active");
  document.getElementById("filter-toggle").setAttribute("aria-expanded", "true");
}
function closeFilterPanel() {
  const panel = document.getElementById("filter-panel");
  panel.style.left = panel.style.top = panel.style.maxHeight = "";
  panel.classList.remove("open");
  document.getElementById("filter-panel-backdrop").classList.remove("open");
  document.getElementById("filter-toggle").classList.remove("active");
  document.getElementById("filter-toggle").setAttribute("aria-expanded", "false");
}

function initFilterPanelControls() {
  const toggleBtn   = document.getElementById("filter-toggle");
  const closeBtn    = document.getElementById("filter-panel-close");
  const panel       = document.getElementById("filter-panel");
  const detailClose = document.getElementById("detail-panel-close");

  // Stop propagation on BOTH touchstart AND click so neither reaches the
  // document-level outside-tap handler (touchstart fires before click on mobile,
  // causing an open-then-immediately-close race if not stopped).
  if (toggleBtn) {
    toggleBtn.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
    toggleBtn.addEventListener("click", e => {
      e.stopPropagation();
      panel.classList.contains("open") ? closeFilterPanel() : openFilterPanel();
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeFilterPanel);

  // Backdrop is pointer-events:none (CSS) — purely visual.
  // Close-on-outside-tap is handled here at document level to avoid the iOS
  // position:fixed hit-testing bug where the backdrop intercepts all touches
  // regardless of z-index when both elements share a position:fixed ancestor.
  const onOutsideTap = e => {
    if (panel && panel.classList.contains("open") && !panel.contains(e.target)) {
      closeFilterPanel();
    }
  };
  document.addEventListener("click",      onOutsideTap);
  document.addEventListener("touchstart", onOutsideTap, { passive: true });

  // Stop events inside the panel from bubbling to the document close handler.
  if (panel) {
    panel.addEventListener("click",      e => e.stopPropagation());
    panel.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
    const body = document.getElementById("filter-panel-body");
    if (body) {
      body.addEventListener("touchmove", e => e.stopPropagation(), { passive: true });
    }
  }

  if (detailClose) detailClose.addEventListener("click", closeMobileSheet);
}

function initTopToggle() {
  const btn = document.getElementById("top-toggle");
  if (btn) btn.addEventListener("click", () => document.getElementById("app").classList.toggle("top-hidden"));
}

/* ── Legend controls (drag + minimize) ── */
function initLegendControls() {
  const legend  = document.getElementById("legend");
  const restore = document.getElementById("legend-restore");
  if (!legend) return;

  function applyLegendState() {
    legend.classList.toggle("legend-mini",   legendState === 1);
    legend.classList.toggle("legend-hidden", legendState === 2);
    if (restore) {
      restore.classList.toggle("visible", legendState === 2);
      restore.style.left = legend.style.left || "";
      restore.style.top  = legend.style.top  || "";
    }
    const expandBtn = legend.querySelector(".legend-expand-btn");
    if (expandBtn) expandBtn.style.display = legendState === 1 ? "flex" : "none";
    const minBtn = legend.querySelector(".legend-minimize-btn");
    if (minBtn) {
      const isMin = legendState === 1;
      minBtn.title = isMin ? "Hide legend" : "Minimize legend";
      minBtn.innerHTML = isMin
        ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
        : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    }
  }

  legend.addEventListener("click", e => {
    if (e.target.closest(".legend-expand-btn"))  { legendState = 0; applyLegendState(); }
    else if (e.target.closest(".legend-minimize-btn")) { legendState = (legendState + 1) % 3; applyLegendState(); }
  });

  if (restore) restore.addEventListener("click", () => { legendState = 0; applyLegendState(); });

  const container = document.getElementById("map-container");
  let dragging = false, startPX, startPY, startLeft, startTop;

  legend.addEventListener("pointerdown", e => {
    if (!e.target.closest(".legend-drag-handle")) return;
    e.preventDefault();
    dragging  = true;
    const lr  = legend.getBoundingClientRect();
    const cr  = container.getBoundingClientRect();
    startPX   = e.clientX; startPY = e.clientY;
    startLeft = lr.left - cr.left; startTop = lr.top - cr.top;
    legend.setPointerCapture(e.pointerId);
    legend.style.cursor = "grabbing";
  });
  legend.addEventListener("pointermove", e => {
    if (!dragging) return;
    const cr = container.getBoundingClientRect();
    const lr = legend.getBoundingClientRect();
    let nl = Math.max(0, Math.min(startLeft + (e.clientX - startPX), cr.width  - lr.width));
    let nt = Math.max(0, Math.min(startTop  + (e.clientY - startPY), cr.height - lr.height));
    legend.style.left = nl + "px";
    legend.style.top  = nt + "px";
    if (restore) { restore.style.left = legend.style.left; restore.style.top = legend.style.top; }
  });
  legend.addEventListener("pointerup",     () => { dragging = false; legend.style.cursor = ""; });
  legend.addEventListener("pointercancel", () => { dragging = false; legend.style.cursor = ""; });
}

/* ── Dashboard ── */
function animateCounter(el, target, duration = 900) {
  const t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

function renderDashboard(data) {
  const counts = computeSeverityCounts(mapData);
  const statesWithLegislation = new Set();
  for (const fips in mapData) {
    if (mapData[fips].level >= 1) statesWithLegislation.add(mapData[fips].state);
  }

  const lastUpdated = data.generated_at
    ? new Date(data.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Unknown";

  const dcs = (sampleLayers && sampleLayers.data_centers) || [];
  const existingDCs  = dcs.filter(d => d.status === "existing");
  const plannedDCs   = dcs.filter(d => d.status === "planned");
  const existingMW   = existingDCs.reduce((s, d) => s + d.capacity_mw, 0);
  const plannedMW    = plannedDCs .reduce((s, d) => s + d.capacity_mw, 0);

  const cards = [
    { label: "Counties — Active Restrictions",   value: counts.moderate + counts.high + counts.ban },
    { label: "Counties — Proposed Restrictions", value: counts.proposed },
    { label: "States w/ AI / DC Legislation",   value: statesWithLegislation.size },
    { label: "Existing Capacity",               text: `${existingDCs.length} sites · ${(existingMW / 1000).toFixed(1)} GW`, sample: true },
    { label: "Planned Data Centers",            text: `${plannedDCs.length} sites · ${(plannedMW / 1000).toFixed(1)} GW`, sample: true },
    { label: "Last Updated",                    text: lastUpdated },
  ];

  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";
  for (const card of cards) {
    const el  = document.createElement("div");
    el.className = "stat-card";
    const tag = card.sample ? `<span class="sample-tag" style="margin-left:6px;">Sample</span>` : "";
    if (card.text) {
      el.innerHTML = `<div class="stat-card-value stat-card-text">${card.text}${tag}</div><div class="stat-card-label">${card.label}</div>`;
    } else {
      el.innerHTML = `<div class="stat-card-value">0</div><div class="stat-card-label">${card.label}</div>`;
      dashboard.appendChild(el);
      animateCounter(el.querySelector(".stat-card-value"), card.value);
      continue;
    }
    dashboard.appendChild(el);
  }
}

/* ── Mobile sheet ── */
function openMobileSheet()  { document.getElementById("detail-panel").classList.add("sheet-open"); }
function closeMobileSheet() { document.getElementById("detail-panel").classList.remove("sheet-open"); }

/* ── Detail panel ── */
const WATER_STRESS_LABELS = { 0: "Low stress", 1: "Moderate stress", 2: "Elevated stress", 3: "High stress" };

function buildSampleInfraHtml(fips) {
  if (!sampleLayers) return "";
  const facilities = (sampleLayers.data_centers     || []).filter(d => d.county_fips === fips);
  const campuses   = (sampleLayers.ai_campuses      || []).filter(d => d.county_fips === fips);
  const wLevel     = sampleLayers.water_stress ? sampleLayers.water_stress[fips] : undefined;
  const hasTax     = (sampleLayers.tax_incentive_counties || []).includes(fips);
  const utility    = (sampleLayers.utility_territories  || []).find(t => t.fips_list.includes(fips));

  if (!facilities.length && !campuses.length && wLevel === undefined && !hasTax && !utility) return "";

  let html = `<div class="divider"></div>`;

  if (facilities.length) html += `
    <div class="detail-section">
      <div class="detail-label">Infrastructure</div>
      <div class="detail-value">${facilities.map(f => `${escHtml(f.name)} — ${f.capacity_mw} MW (${f.status})`).join("<br>")}</div>
    </div>`;

  const operators = [...new Set([...facilities, ...campuses].map(f => f.operator))];
  if (operators.length) html += `
    <div class="detail-section">
      <div class="detail-label">Major Operators</div>
      <div class="type-chips">${operators.map(o => `<span class="type-chip">${escHtml(o)}</span>`).join("")}</div>
    </div>`;

  if (campuses.length) html += `
    <div class="detail-section">
      <div class="detail-label">AI Campuses</div>
      <div class="detail-value">${campuses.map(c => escHtml(c.name)).join("<br>")}</div>
    </div>`;

  if (wLevel !== undefined || hasTax || utility) html += `
    <div class="detail-section">
      <div class="detail-label">Site Factors</div>
      <div class="detail-value">
        ${wLevel !== undefined ? `Water availability: ${WATER_STRESS_LABELS[wLevel]}<br>` : ""}
        ${utility ? `Utility territory: ${escHtml(utility.name)}<br>` : ""}
        ${hasTax ? "Tax incentive area: Yes" : ""}
      </div>
    </div>`;

  return html;
}

/* ── Policy section builders ── */
function buildStatePolicySectionHtml(stateFips2) {
  const st = stateRegData[stateFips2];
  const header = `<div class="policy-scope-header">
    <span class="scope-label scope-label-state">ST</span>
    <span class="scope-title">Statewide Policy</span>
    ${st ? `<span class="restriction-badge badge-${getSeverityKey(st)}" style="margin:0;font-size:10px;padding:2px 7px;">${SEVERITY[getSeverityKey(st)].label}</span>` : ""}
  </div>`;

  if (!st) return `<div class="policy-scope-section">${header}<p class="policy-scope-none">No known statewide policy found.</p></div>`;

  const types  = st.types || [];
  const status = st.status || "active";
  return `<div class="policy-scope-section">
    ${header}
    ${st.summary ? `<div class="detail-section"><div class="detail-value">${escHtml(st.summary)}</div></div>` : ""}
    ${types.length ? `<div class="detail-section"><div class="detail-label">Types</div><div class="type-chips">${types.map(t => `<span class="type-chip ${t}">${TYPE_LABELS[t]||t}</span>`).join("")}</div></div>` : ""}
    <div class="detail-section"><div class="detail-label">Status</div><div class="detail-value"><span class="status-indicator"><span class="status-dot ${status}"></span>${STATUS_LABELS[status]||status}</span></div></div>
    ${st.sources && st.sources.length ? `<div class="detail-section"><div class="detail-label">Sources</div><ul class="sources-list">${st.sources.map(s => {
      if (s && typeof s === "object" && s.url) return `<li><a href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escHtml(s.label)}</a></li>`;
      return `<li>${escHtml(typeof s === "string" ? s : s.label || "")}</li>`;
    }).join("")}</ul></div>` : ""}
  </div>`;
}

const CONFIDENCE_LABELS = {
  verified: "Verified",
  high:     "High",
  medium:   "Medium",
  low:      "Low",
};

const TIER_LABELS = {
  1: "Government / Official",
  2: "Industry / Press",
  3: "Community / News",
};

function buildConfidenceBadgeHtml(county) {
  const conf  = county.confidence || "low";
  const score = county.confidence_score;
  const tier  = county.source_tier;

  const label     = CONFIDENCE_LABELS[conf] || conf;
  const tierLabel = TIER_LABELS[tier] || "";
  const scoreText = typeof score === "number" ? `${score}/100` : "";

  return `<div class="confidence-info-row">
    <div class="confidence-bar">
      <span class="confidence-badge conf-${conf}">
        <span class="confidence-dot"></span>
        ${escHtml(label)} Confidence
      </span>
      ${scoreText ? `<span class="confidence-score-text">${escHtml(scoreText)}</span>` : ""}
    </div>
    ${tierLabel ? `<span class="conf-tier-label">Source tier: <span>${escHtml(tierLabel)}</span></span>` : ""}
  </div>`;
}

function buildCountyPolicySectionHtml(fips, county) {
  const sevKey = getSeverityKey(county);
  const level  = county.level;
  const status = county.status || "active";
  const types  = county.types || [];
  const header = `<div class="policy-scope-header">
    <span class="scope-label scope-label-county">CO</span>
    <span class="scope-title">Countywide Policy</span>
    <span class="restriction-badge badge-${sevKey}" style="margin:0;font-size:10px;padding:2px 7px;">${level === -1 ? "Pro Data Center" : LEVEL_LABELS[level]}</span>
  </div>`;

  return `<div class="policy-scope-section">
    ${header}
    ${county.confidence ? buildConfidenceBadgeHtml(county) : ""}
    ${county.title ? `<div class="detail-section"><div class="detail-label">Restriction / Policy</div><div class="detail-value">${escHtml(county.title)}</div></div>` : ""}
    ${county.description ? `<div class="detail-section"><div class="detail-label">Description</div><div class="detail-value">${escHtml(county.description)}</div></div>` : ""}
    ${types.length ? `<div class="detail-section"><div class="detail-label">Types</div><div class="type-chips">${types.map(t => `<span class="type-chip ${t}">${TYPE_LABELS[t]||t}</span>`).join("")}</div></div>` : ""}
    <div class="detail-section"><div class="detail-label">Status</div><div class="detail-value"><span class="status-indicator"><span class="status-dot ${status}"></span>${STATUS_LABELS[status]||status}</span></div></div>
    ${county.effective_date ? `<div class="detail-section"><div class="detail-label">Effective Date</div><div class="detail-value">${formatDate(county.effective_date)}</div></div>` : ""}
    ${county.notes ? `<div class="detail-section"><div class="detail-label">Notes</div><div class="detail-value">${escHtml(county.notes)}</div></div>` : ""}
    ${county.sources && county.sources.length ? `<div class="detail-section"><div class="detail-label">Sources</div><ul class="sources-list">${county.sources.map(s => {
      if (s && typeof s === "object" && s.url) return `<li><a href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escHtml(s.label)}</a></li>`;
      return `<li>${escHtml(typeof s === "string" ? s : s.label || "")}</li>`;
    }).join("")}</ul></div>` : ""}
  </div>`;
}

function buildCityPolicySectionHtml() {
  return `<div class="policy-scope-section">
    <div class="policy-scope-header">
      <span class="scope-label scope-label-city">CT</span>
      <span class="scope-title">Citywide Policy</span>
    </div>
    <p class="policy-scope-none">No known city or municipal policy found.</p>
  </div>`;
}

function buildNoCountyPolicySectionHtml() {
  return `<div class="policy-scope-section">
    <div class="policy-scope-header">
      <span class="scope-label scope-label-county">CO</span>
      <span class="scope-title">Countywide Policy</span>
    </div>
    <p class="policy-scope-none">No specific county restrictions identified. Standard state and federal regulations apply.</p>
  </div>`;
}

function setDetailEmpty() {
  setLocationHash(null);
  document.getElementById("detail-header").querySelector("h2").textContent = "County Details";
  document.getElementById("detail-state").textContent = "";
  document.getElementById("detail-body").innerHTML = `
    <div id="detail-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
      <p>Tap any county on the map to see statewide, county, and city regulations.</p>
    </div>`;
  closeMobileSheet();
}

function setDetailCounty(fips, county) {
  document.getElementById("detail-header").querySelector("h2").textContent = county.name;
  document.getElementById("detail-state").textContent = county.state;

  const stateFips2 = fips.slice(0, 2);

  document.getElementById("detail-body").innerHTML = `
    ${buildStatePolicySectionHtml(stateFips2)}
    <div class="policy-divider"></div>
    ${buildCountyPolicySectionHtml(fips, county)}
    <div class="policy-divider"></div>
    ${buildCityPolicySectionHtml()}
    ${buildSampleInfraHtml(fips)}`;
  openMobileSheet();
}

function setDetailNoRestriction(name, state, fips) {
  document.getElementById("detail-header").querySelector("h2").textContent = name || "County";
  document.getElementById("detail-state").textContent = state || "";
  const stateFips2 = fips ? fips.slice(0, 2) : null;
  document.getElementById("detail-body").innerHTML = `
    ${stateFips2 ? buildStatePolicySectionHtml(stateFips2) : ""}
    ${stateFips2 ? '<div class="policy-divider"></div>' : ""}
    ${buildNoCountyPolicySectionHtml()}
    <div class="policy-divider"></div>
    ${buildCityPolicySectionHtml()}
    ${fips ? buildSampleInfraHtml(fips) : ""}`;
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
    ${facility.operator  ? `<div class="detail-section"><div class="detail-label">Operator</div><div class="detail-value">${escHtml(facility.operator)}</div></div>` : ""}
    ${facility.capacity_mw ? `<div class="detail-section"><div class="detail-label">Capacity</div><div class="detail-value">${facility.capacity_mw.toLocaleString("en-US")} MW</div></div>` : ""}
    ${facility.status    ? `<div class="detail-section"><div class="detail-label">Status</div><div class="detail-value" style="text-transform:capitalize;">${facility.status}</div></div>` : ""}
    ${facility.year_built   ? `<div class="detail-section"><div class="detail-label">Year Built</div><div class="detail-value">${facility.year_built}</div></div>` : ""}
    ${facility.year_planned ? `<div class="detail-section"><div class="detail-label">Target Year</div><div class="detail-value">${facility.year_planned}</div></div>` : ""}
    ${facility.type      ? `<div class="detail-section"><div class="detail-label">Type</div><div class="detail-value" style="text-transform:capitalize;">${facility.type}</div></div>` : ""}
    ${facility.notes     ? `<div class="detail-section"><div class="detail-label">Notes</div><div class="detail-value">${escHtml(facility.notes)}</div></div>` : ""}
    ${county ? `<div class="detail-section"><div class="detail-label">County</div><div class="detail-value">${escHtml(county.name)}, ${escHtml(county.state)}</div></div>` : ""}`;
  openMobileSheet();
}

/* ── Utilities ── */
function levelDot(level, status) {
  const col = SEVERITY[getSeverityKey({ level, status })].color;
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};border:1px solid rgba(255,255,255,0.2)"></span>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDate(d) {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}); }
  catch { return d; }
}

/* ── URL hash permalink ── */
function setLocationHash(fips) {
  if (history.replaceState) {
    history.replaceState(null, "", fips ? `#${fips}` : window.location.pathname + window.location.search);
  }
}

function restoreFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (/^\d{5}$/.test(hash)) {
    selectCounty(hash);
    zoomToFeature(hash);
  }
}

/* ── Keyboard shortcuts ── */
function initKeyboardShortcuts() {
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const filterOpen = document.getElementById("filter-panel").classList.contains("open");
    const sheetOpen  = document.getElementById("detail-panel").classList.contains("sheet-open");
    if (filterOpen) {
      closeFilterPanel();
    } else if (sheetOpen) {
      closeMobileSheet();
      if (selectedFips && countyLayerByFips[selectedFips]) countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
      selectedFips = null;
      setDetailEmpty();
    } else if (selectedFips) {
      if (countyLayerByFips[selectedFips]) countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
      selectedFips = null;
      setDetailEmpty();
    }
  });
}

/* ── State detail ── */
function showStateDetail(fips2) {
  const abbr = STATE_FIPS[fips2] || "";
  const name = STATE_NAMES[abbr] || abbr;
  document.getElementById("detail-header").querySelector("h2").textContent = name;
  document.getElementById("detail-state").textContent = "State Policy";
  document.getElementById("detail-body").innerHTML = buildStatePolicySectionHtml(fips2);
  openMobileSheet();
}

/* ── County selection / zoom ── */
function zoomToFeature(fips) {
  const layer = countyLayerByFips[fips];
  if (layer) leafletMap.flyToBounds(layer.getBounds(), { duration: 0.5, maxZoom: 10 });
}

function selectCounty(fips) {
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
  }
  selectedFips = fips;
  setLocationHash(fips);
  const layer  = countyLayerByFips[fips];
  if (layer) {
    layer.setStyle({ color: "#ffffff", weight: 2.5, fillOpacity: 0.92 });
    layer.bringToFront();
  }
  const county = mapData[fips];
  if (county) setDetailCounty(fips, county);
  else {
    const stAbbr = STATE_FIPS[fips.slice(0, 2)] || "";
    setDetailNoRestriction(null, stAbbr, fips);
  }
}

/* ── Search ── */
function initSearch() {
  const input   = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  const countyIndex = Object.keys(mapData).map(fips => ({
    kind: "county", fips,
    name: mapData[fips].name, state: mapData[fips].state,
    searchText: `${mapData[fips].name} ${mapData[fips].state}`.toLowerCase(),
  }));

  const facilityIndex = [];
  if (sampleLayers) {
    const kindOf = d => d.status === "planned" ? "dc_planned" : "dc_existing";
    (sampleLayers.data_centers || []).forEach(d => facilityIndex.push({
      kind: "facility", facilityKind: kindOf(d), raw: d,
      name: d.name, fips: d.county_fips,
      searchText: `${d.name} ${d.operator}`.toLowerCase(),
    }));
    (sampleLayers.ai_campuses || []).forEach(d => facilityIndex.push({
      kind: "facility", facilityKind: "ai_campus", raw: d,
      name: d.name, fips: d.county_fips,
      searchText: `${d.name} ${d.operator}`.toLowerCase(),
    }));
  }

  // State entries — type a state name or abbreviation to zoom + show state policy
  const stateIndex = Object.entries(STATE_FIPS).map(([fips2, abbr]) => ({
    kind: "state", fips2, abbr,
    name: STATE_NAMES[abbr] || abbr,
    searchText: `${STATE_NAMES[abbr] || ""} ${abbr}`.toLowerCase(),
  }));

  const index = [...countyIndex, ...stateIndex, ...facilityIndex];

  function renderResults(matches) {
    results.innerHTML = "";
    if (!matches.length) { results.style.display = "none"; return; }
    for (const m of matches) {
      const item = document.createElement("div");
      item.className = "search-result-item";
      if (m.kind === "county") {
        item.textContent = `${m.name}, ${m.state}`;
      } else if (m.kind === "state") {
        item.innerHTML = `${escHtml(m.name)} <span class="search-result-tag">State</span>`;
      } else {
        item.innerHTML = `${escHtml(m.name)} <span class="sample-tag" style="margin-left:6px;">Sample</span>`;
      }
      item.addEventListener("pointerdown", e => {
        e.preventDefault();
        input.value = m.kind === "county" ? `${m.name}, ${m.state}` : m.name;
        results.style.display = "none";
        if (m.kind === "county") {
          zoomToFeature(m.fips);
          selectCounty(m.fips);
        } else if (m.kind === "state") {
          const stLayer = stateGeoLayer.getLayers().find(l => String(l.feature.id).padStart(2, "0") === m.fips2);
          if (stLayer) leafletMap.flyToBounds(stLayer.getBounds(), { duration: 0.6, padding: [20, 20] });
          showStateDetail(m.fips2);
        } else {
          zoomToFeature(m.fips);
          setLayerVisible(m.facilityKind, true, true);
          selectedFips = null;
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
    renderResults(index.filter(c => c.searchText.includes(q)).slice(0, 8));
  });
  input.addEventListener("focus", () => { if (input.value.trim()) input.dispatchEvent(new Event("input")); });
  input.addEventListener("blur",  () => { setTimeout(() => { results.style.display = "none"; }, 100); });
}

/* ── Last updated label ── */
function setLastUpdated(data) {
  const el = document.getElementById("last-updated");
  if (data.generated_at) {
    const d = new Date(data.generated_at);
    el.textContent = `Data updated ${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
  }
}

/* ── Init ── */
async function init() {
  const loadEl = document.getElementById("loading");
  const setMsg = msg => { const s = loadEl.querySelector("span"); if (s) s.textContent = msg; };

  try {
    setMsg("Loading county data…");
    const { us, data, sample, stateReg } = await loadData();

    setMsg("Processing map data…");
    mapData      = data.counties || {};
    sampleLayers = sample || null;
    stateRegData = stateReg.states || {};

    const countiesGeoJSON = topojson.feature(us, us.objects.counties);
    const statesGeoJSON   = topojson.feature(us, us.objects.states);

    setMsg("Rendering map…");
    initLeafletMap();

    // z-order: state (bottom) → counties → markers (top)
    initStateLayer(statesGeoJSON);
    initCountyLayer(countiesGeoJSON);
    renderSampleMarkerLayers(countiesGeoJSON);
    addAnnotations(countiesGeoJSON);

    renderDashboard(data);
    renderFilterPanel();
    renderLegend();
    renderStats();

    initFilterPanelControls();
    initTopToggle();
    initLegendControls();
    initKeyboardShortcuts();
    initSearch();
    setDetailEmpty();
    setLastUpdated(data);
    restoreFromHash();

    loadEl.style.display = "none";
  } catch (err) {
    console.error(err);
    loadEl.innerHTML = `
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#e05252" stroke-width="1.5" style="flex-shrink:0;margin-bottom:4px">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      <div style="color:#e05252;font-size:15px;font-weight:600;text-align:center;">Map data could not be loaded</div>
      <div style="color:#8a8fa8;font-size:12px;margin-top:8px;text-align:center;max-width:280px;line-height:1.6;padding:0 16px;">
        ${escHtml(err.message)}<br>Check the data file path or browser console for details.
      </div>
      <button onclick="location.reload()" style="margin-top:20px;padding:11px 28px;background:#5b8def;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:0.02em;">
        Retry
      </button>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
