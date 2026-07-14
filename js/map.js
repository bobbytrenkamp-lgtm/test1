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

/* ── Theme helpers ── */
function isDarkTheme() {
  const t = localStorage.getItem('theme') || 'system';
  if (t === 'dark')  return true;
  if (t === 'light') return false;
  return !window.matchMedia('(prefers-color-scheme: light)').matches;
}

function themeColors() {
  const dark = isDarkTheme();
  return {
    noData:          dark ? '#0d1228' : '#d2d9ee',
    countyBorder:    dark ? '#030408' : '#a8b2cc',
    stateBorder:     dark ? '#2d3868' : '#7880b0',
    selectedOutline: dark ? '#e8ecf8' : '#0c1020',
    dotBorder:       dark ? 'rgba(200,210,255,0.18)' : 'rgba(0,0,0,0.14)',
  };
}

function selectedCountyStyle() {
  return { color: themeColors().selectedOutline, weight: 2.5, fillOpacity: 0.92 };
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
  { fips: "19113", label: "Linn Co., IA",      sub: "18-month moratorium (Jul 2026)", type: "restrictive" },
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
let activeTile      = "satellite";
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
let legendOpen      = true;  // true=visible, false=collapsed to restore button
let selectedFips    = null;
let cityLabelsLayer = null;

/* ── Floating-panel saved state ──
   Preserved across open/close so the panel re-opens where the user left it. */
let fpSavedPos  = null;  // {left, top} for Map Layers panel
let fpSavedSize = null;  // {width, maxHeight} for Map Layers panel
let lgSavedPos  = null;  // {left, top} for Legend
let lgSavedSize = null;  // {width, height} for Legend

/* ── Drag-guard state ──
   Prevents county hover/selection from firing while the user pans the map.
   hoveredCountyLayer tracks the single layer with transient hover styling so
   it can be cleanly reset on mouseout, dragstart, and dragend. */
let isMouseDown        = false;
let isDraggingMap      = false;
let suppressClickUntil = 0;
let hoveredCountyLayer = null;

/* ── Filter state ── */
const activeRestrictFilters = new Set();  // severity keys e.g. "high", "ban"
let   activeStateFilter     = "";          // 2-letter state abbr or ""
const activeScopeFilters    = new Set();   // "restrictions", "state_policy", "city_policy"

/* ── Tab / news state ── */
let activeTab      = "map";
let mapInitPromise = null;   // promise from initMapFromGeo(), awaited when restoring a FIPS hash
let newsArticles   = [];
let newsFilters    = { search: "", category: "", state: "", source: "" };

/* ── Filter helpers ── */
function countyMatchesFilters(fips) {
  const county = mapData[fips];
  if (activeRestrictFilters.size > 0) {
    const sevKey = getSeverityKey(county);
    if (!activeRestrictFilters.has(sevKey)) return false;
  }
  if (activeStateFilter) {
    const stAbbr = STATE_FIPS[fips.slice(0, 2)] || "";
    if (stAbbr !== activeStateFilter) return false;
  }
  return true;
}

function hasActiveMapFilters() {
  return activeRestrictFilters.size > 0 || activeStateFilter !== "";
}

/* ── Helpers ── */
function fipsKey(id) { return String(id).padStart(5, "0"); }

function getColor(fips) {
  const county = mapData[fips];
  return county ? getSeverityColor(county) : themeColors().noData;
}

function getStateColor(fips2) {
  const st = stateRegData[fips2];
  return st ? SEVERITY[getSeverityKey(st)].color : themeColors().noData;
}

function capacityRadius(mw) {
  return 3 + 13 * Math.sqrt(Math.max(0, Math.min(800, mw || 0)) / 800);
}

const UTILITY_COLORS = ["#f472b6", "#fb923c", "#38bdf8", "#a3e635"];

/* ── County / state style functions ── */
function countyStyle(feature) {
  const fips   = fipsKey(feature.id);
  const isSat  = activeTile !== "standard";
  const tc     = themeColors();

  // Fade out county fills when zoomed into street level so satellite imagery is visible
  const zoom     = leafletMap ? leafletMap.getZoom() : 7;
  const zoomFade = zoom >= 13 ? 0 : zoom <= 10 ? 1 : (13 - zoom) / 3;

  if (!layerState.restrictions) {
    return { fillColor: tc.noData, fillOpacity: isSat ? 0 : 0.12 * zoomFade, color: tc.countyBorder, weight: 0.35 };
  }

  const county     = mapData[fips];
  const sevKey     = getSeverityKey(county);
  const hasData    = sevKey !== "none";

  if (hasActiveMapFilters() && !countyMatchesFilters(fips)) {
    return {
      fillColor:   tc.noData,
      fillOpacity: isSat ? 0 : 0.08 * zoomFade,
      color:       tc.countyBorder,
      weight:      0.2,
    };
  }

  return {
    fillColor:   getColor(fips),
    fillOpacity: isSat ? (hasData ? 0.70 * zoomFade : 0) : 0.75 * zoomFade,
    color:       tc.countyBorder,
    weight:      0.35,
  };
}

function stateStyle(feature) {
  const fips2 = String(feature.id).padStart(2, "0");
  const has   = !!stateRegData[fips2];
  const tc    = themeColors();
  return {
    fillColor:   getStateColor(fips2),
    fillOpacity: layerState.state_policy ? (has ? 0.28 : 0.06) : 0,
    color:       tc.stateBorder,
    weight:      layerState.state_policy ? 0.7 : 0,
    opacity:     layerState.state_policy ? 0.6 : 0,
  };
}

/* ── Data loading ── */
/* Core data (small JSON files) — loaded immediately on page start */
async function loadCoreData() {
  const get = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
  const [data, sample, stateReg, newsData] = await Promise.all([
    get("data/map_data.json"),
    get("data/sample_layers.json").catch(() => null),
    get("data/state_regulations.json").catch(() => ({ states: {} })),
    fetch("data/ai_news.json", { cache: "no-store" }).then(r => r.json()).catch(() => ({ articles: [] })),
  ]);
  return { data, sample, stateReg, newsData };
}

/* County TopoJSON (~2 MB) — lazy-loaded only when Map tab is opened */
let _geoPromise = null;
function fetchGeoData() {
  if (!_geoPromise) {
    _geoPromise = fetch("vendor/counties-10m.json")
      .then(r => { if (!r.ok) throw new Error("vendor/counties-10m.json"); return r.json(); });
  }
  return _geoPromise;
}

/* Initialize Leaflet map from already-fetched geo data */
async function initMapFromGeo() {
  const loadEl = document.getElementById("loading");
  if (loadEl) loadEl.style.display = "";
  try {
    const us = await fetchGeoData();
    // Yield to the browser so it can apply the flex layout for #main before
    // Leaflet reads the container height. When fetchGeoData() resolves from
    // cache it resolves as a microtask — before the browser has had a chance
    // to re-compute the flex layout after mainEl.hidden was set to false.
    // Two nested RAFs give iOS Safari enough time to finalize the layout.
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const countiesGeoJSON = topojson.feature(us, us.objects.counties);
    const statesGeoJSON   = topojson.feature(us, us.objects.states);
    initLeafletMap();
    initStateLayer(statesGeoJSON);
    initCountyLayer(countiesGeoJSON);
    renderSampleMarkerLayers(countiesGeoJSON);
    addAnnotations(countiesGeoJSON);
    renderFilterPanel();
    renderLegend();
    renderStats();
    initFilterPanelControls();
    initTopToggle();
    initLegendControls();
    setDetailEmpty();
    if (loadEl) loadEl.style.display = "none";
    // Belt-and-suspenders: a second invalidateSize after all layers are added
    // catches any iOS Safari viewport settling that happened during GeoJSON parsing.
    setTimeout(() => leafletMap && leafletMap.invalidateSize(), 400);
  } catch (err) {
    console.error(err);
    if (loadEl) loadEl.innerHTML = `
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#e05252" stroke-width="1.5" style="flex-shrink:0;margin-bottom:4px">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      <div style="color:#e05252;font-size:15px;font-weight:600;text-align:center;">Map could not be loaded</div>
      <div style="color:#8a8fa8;font-size:12px;margin-top:8px;text-align:center;max-width:280px;line-height:1.6;padding:0 16px;">${escHtml(err.message)}</div>
      <button onclick="location.reload()" style="margin-top:20px;padding:11px 28px;background:#5b8def;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Retry</button>`;
  }
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

  baseTileLayers.satellite.addTo(leafletMap);
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
      countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
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
function clearHoveredCounty() {
  tooltip.style.display = "none";
  if (hoveredCountyLayer) {
    const hFips = hoveredCountyLayer.feature ? fipsKey(hoveredCountyLayer.feature.id) : null;
    if (countyGeoLayer && (!hFips || hFips !== selectedFips)) {
      countyGeoLayer.resetStyle(hoveredCountyLayer);
    }
    hoveredCountyLayer = null;
  }
}

function handleCountyMouseover(e, fips) {
  if (isDraggingMap || isMouseDown) return;
  if (hasActiveMapFilters() && !countyMatchesFilters(fips)) return;

  // Clear any previously hovered layer before setting the new one
  if (hoveredCountyLayer && hoveredCountyLayer !== e.target) {
    clearHoveredCounty();
  }

  hoveredCountyLayer = e.target;
  if (fips !== selectedFips) {
    e.target.setStyle({ color: "#f97316", weight: 2, fillOpacity: 0.88 });
    e.target.bringToFront();
  }
  showTooltip(e.originalEvent, fips);
}

function handleCountyMousemove(e) {
  if (isDraggingMap || isMouseDown) {
    tooltip.style.display = "none";
    return;
  }
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

function handleCountyMouseout(e) {
  if (hoveredCountyLayer === e.target) {
    clearHoveredCounty();
  }
}

function handleCountyClick(e, fips) {
  if (isDraggingMap || Date.now() < suppressClickUntil) return;
  if (hasActiveMapFilters() && !countyMatchesFilters(fips)) return;
  L.DomEvent.stopPropagation(e);
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
  }
  selectedFips = fips;
  setLocationHash(fips);
  clearHoveredCounty();
  e.target.setStyle(selectedCountyStyle());
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
        mouseout:  e => handleCountyMouseout(e),
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

  // Show annotations only at regional zoom (5–8); hide at national overview or when zoomed into a county
  const ANNOTATION_MIN_ZOOM = 5;
  const ANNOTATION_MAX_ZOOM = 8;
  function syncAnnotationVisibility() {
    if (!annotationGroup || !layerState.annotations) return;
    const z = leafletMap.getZoom();
    if (z >= ANNOTATION_MIN_ZOOM && z <= ANNOTATION_MAX_ZOOM) {
      if (!leafletMap.hasLayer(annotationGroup)) annotationGroup.addTo(leafletMap);
    } else {
      leafletMap.removeLayer(annotationGroup);
    }
  }
  leafletMap.on("zoomend", syncAnnotationVisibility);
  syncAnnotationVisibility();
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
        countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
      }
    }
  } else if (id === "state_policy") {
    if (stateGeoLayer) {
      stateGeoLayer.setStyle(stateStyle);
    }
  } else if (id === "annotations") {
    if (annotationGroup) {
      if (!visible) {
        leafletMap.removeLayer(annotationGroup);
      } else {
        const z = leafletMap.getZoom();
        if (z >= 5 && z <= 8) annotationGroup.addTo(leafletMap);
        // outside 5–8 zoom range, syncAnnotationVisibility handles it on next zoomend
      }
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

  // Drag-guard: set/clear flags so county hover/select is suppressed during pan
  leafletMap.on("mousedown", () => { isMouseDown = true; });
  leafletMap.on("mouseup",   () => { isMouseDown = false; });
  leafletMap.on("dragstart", () => {
    isDraggingMap = true;
    clearHoveredCounty();
  });
  leafletMap.on("dragend", () => {
    isDraggingMap      = false;
    isMouseDown        = false;
    suppressClickUntil = Date.now() + 150; // swallow the synthetic click that follows dragend
    clearHoveredCounty();
  });

  leafletMap.on("click", () => {
    if (isDraggingMap || Date.now() < suppressClickUntil) return;
    if (selectedFips && countyLayerByFips[selectedFips]) {
      countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
    }
    selectedFips = null;
    setDetailEmpty();
  });

  // Re-apply county fill opacity when zoom changes (fades out at street level)
  leafletMap.on("zoomend", () => {
    if (countyGeoLayer) {
      countyGeoLayer.setStyle(countyStyle);
      if (selectedFips && countyLayerByFips[selectedFips]) {
        countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
      }
    }
  });

  // Primary: ResizeObserver fires after CSS layout so Leaflet reads the correct size.
  // This catches iOS Safari address-bar show/hide reliably without timing guesswork.
  const mapContainer = document.getElementById("map-container");
  if (window.ResizeObserver && mapContainer) {
    let _roTimer = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(_roTimer);
      _roTimer = setTimeout(() => { if (leafletMap) leafletMap.invalidateSize({ animate: false }); }, 50);
    });
    ro.observe(mapContainer);
  }

  // Fallback for browsers without ResizeObserver.
  let _resizeTimer = null;
  const onResize = () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => { if (leafletMap) leafletMap.invalidateSize({ animate: false }); }, 150);
  };
  window.addEventListener("resize", onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onResize);
  }
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
    const chip = document.createElement("button");
    chip.className = "stat-chip" + (activeRestrictFilters.has(key) ? " active" : "");
    chip.dataset.key = key;
    chip.setAttribute("type", "button");
    chip.setAttribute("title", `Filter map to ${SEVERITY[key].label}`);
    chip.innerHTML = `<div class="dot" style="background:${SEVERITY[key].color}"></div><strong>${count}</strong> ${SEVERITY[key].label}`;
    chip.addEventListener("click", () => toggleRestrictFilter(key));
    bar.appendChild(chip);
  }

  // Clear button
  let clearBtn = document.getElementById("stats-bar-clear");
  if (!clearBtn) {
    clearBtn = document.createElement("button");
    clearBtn.id = "stats-bar-clear";
    clearBtn.setAttribute("type", "button");
    clearBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Clear`;
    clearBtn.addEventListener("click", clearAllFilters);
    bar.parentNode.insertBefore(clearBtn, bar.nextSibling);
  }
  clearBtn.classList.toggle("visible", hasActiveMapFilters());
}

/* ── Filter actions ── */
function toggleRestrictFilter(key) {
  if (activeRestrictFilters.has(key)) {
    activeRestrictFilters.delete(key);
  } else {
    activeRestrictFilters.add(key);
  }
  applyFilters();
}

function clearAllFilters() {
  activeRestrictFilters.clear();
  activeStateFilter = "";
  applyFilters();
  syncAdvancedFilterUI();
}

function applyFilters() {
  if (countyGeoLayer) {
    countyGeoLayer.setStyle(countyStyle);
    // Re-apply selected county highlight if still visible
    if (selectedFips) {
      if (hasActiveMapFilters() && !countyMatchesFilters(selectedFips)) {
        // Selected county is now filtered out — clear detail panel
        if (countyLayerByFips[selectedFips]) countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
        selectedFips = null;
        setDetailEmpty();
      } else if (countyLayerByFips[selectedFips]) {
        countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
      }
    }
  }
  renderStats();
  renderFilterStatus();
  syncAdvancedFilterUI();
}

function renderFilterStatus() {
  const el = document.getElementById("filter-status");
  if (!el) return;

  if (!hasActiveMapFilters()) {
    el.hidden = true;
    return;
  }

  // Count matching counties
  let matchCount = 0;
  for (const fips in mapData) {
    if (countyMatchesFilters(fips)) matchCount++;
  }

  let parts = [];
  if (activeRestrictFilters.size > 0) {
    const labels = [...activeRestrictFilters].map(k => SEVERITY[k].label).join(", ");
    parts.push(labels);
  }
  if (activeStateFilter) parts.push(STATE_NAMES[activeStateFilter] || activeStateFilter);

  el.hidden = false;
  if (matchCount === 0) {
    el.textContent = `No areas match: ${parts.join(" · ")}`;
  } else {
    el.textContent = `Showing ${matchCount} area${matchCount !== 1 ? "s" : ""} — ${parts.join(" · ")}`;
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
  const legend  = document.getElementById("legend");
  const restore = document.getElementById("legend-restore");

  if (!legendOpen) {
    legend.style.display = "none";
    if (restore) restore.classList.add("visible");
    return;
  }

  legend.innerHTML = "";
  legend.style.display = "";
  if (restore) restore.classList.remove("visible");

  // Apply user-saved size when legend has been resized
  if (lgSavedSize) {
    legend.style.width  = lgSavedSize.width;
    legend.style.height = lgSavedSize.height;
    legend.style.maxHeight = "none";
  }

  // Toolbar: drag handle + title + close button
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
    <button class="legend-close-btn" title="Hide legend" aria-label="Hide legend">&times;</button>
  `;
  legend.appendChild(toolbar);

  // Scrollable body containing all legend items
  const legendBody = document.createElement("div");
  legendBody.className = "legend-body";

  if (layerState.restrictions) {
    const h = document.createElement("h3");
    h.textContent = "Restriction Severity";
    legendBody.appendChild(h);

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
      legendBody.appendChild(el);
    }

    const div = document.createElement("div");
    div.style.cssText = "border-top:1px solid var(--border); margin:8px 0;";
    legendBody.appendChild(div);
  }

  if (layerState.restrictions || layerState.state_policy) {
    const sh = document.createElement("h3");
    sh.textContent = "Policy Scope";
    legendBody.appendChild(sh);

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
      legendBody.appendChild(el);
    }
    const sd = document.createElement("div");
    sd.style.cssText = "border-top:1px solid var(--border); margin:8px 0;";
    legendBody.appendChild(sd);
  }

  const activeOverlays = Object.keys(SAMPLE_LEGEND_ENTRIES).filter(k => layerState[k]);
  if (activeOverlays.length) {
    const h = document.createElement("h3");
    h.textContent = "Active Layers";
    legendBody.appendChild(h);
    for (const key of activeOverlays) {
      const entry = SAMPLE_LEGEND_ENTRIES[key];
      const el    = document.createElement("div");
      el.className = "legend-item";
      el.innerHTML = `${legendSwatchHtml(entry)}<div class="legend-label-main">${entry.label}</div>`;
      legendBody.appendChild(el);
    }
  }

  if (!legendBody.children.length) {
    const empty = document.createElement("div");
    empty.className = "legend-label-sub";
    empty.textContent = "No layers active.";
    legendBody.appendChild(empty);
  }

  legend.appendChild(legendBody);

  // Resize handle (visible on desktop via CSS)
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "panel-resize-handle";
  resizeHandle.id = "legend-resize-handle";
  legend.appendChild(resizeHandle);
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

      if (!def.noData) {
        const input = row.querySelector("input[type='checkbox']");
        const handleToggle = () => {
          const newState = !input.checked;
          input.checked = newState;
          setLayerVisible(def.id, newState);
        };
        // iOS Safari doesn't forward label taps to wrapped inputs when
        // -webkit-user-select:none is set on the label. Use touchend directly.
        row.addEventListener("touchend", e => {
          handleToggle();
          e.preventDefault(); // suppress the synthetic click that would double-fire
        }, { passive: false });
        // Desktop fallback: mouse click (not preceded by touch, so not prevented).
        // e.preventDefault() stops the browser's native label→input click-forwarding,
        // which would otherwise dispatch a second synthetic click on the wrapped
        // <input>, flip input.checked back via pre-activation, then bubble to this
        // handler again — causing handleToggle to fire twice and undo the first call.
        row.addEventListener("click", e => {
          if (e.defaultPrevented) return;
          e.preventDefault();
          handleToggle();
        });
      }

      body.appendChild(row);
    }
  }
}

/* ── Panel open/close ── */
function openFilterPanel() {
  const panel = document.getElementById("filter-panel");
  const mc    = document.getElementById("map-container");
  if (mc) {
    const rect = mc.getBoundingClientRect();
    if (window.innerWidth > 700) {
      // Restore user-dragged position or default to top-left of map area
      panel.style.left = fpSavedPos ? fpSavedPos.left : (rect.left + 20) + "px";
      panel.style.top  = fpSavedPos ? fpSavedPos.top  : (rect.top  + 12) + "px";
      if (fpSavedSize) {
        panel.style.width     = fpSavedSize.width;
        panel.style.maxHeight = fpSavedSize.maxHeight;
        panel.style.height    = "";
      } else {
        panel.style.width     = "";
        panel.style.height    = "";
        panel.style.maxHeight = (rect.height - 24) + "px";
      }
    } else {
      // Mobile: bottom sheet — CSS handles left/right/bottom; just cap height
      panel.style.left = panel.style.top = "";
      panel.style.width = panel.style.height = "";
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
  // Position/size styles are left in place so the close animation plays from
  // the panel's current location. openFilterPanel() always re-applies them on
  // next open (from fpSavedPos/fpSavedSize or defaults).
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
      // Desktop: keep the panel open when the user clicks elsewhere on the map.
      // Mobile (≤700px): allow outside tap to close because the panel covers the full screen.
      if (window.innerWidth > 700) return;
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

  // ── Map Layers panel drag (desktop only) ──
  let fpDragging = false, fpDragStartX, fpDragStartY, fpDragStartLeft, fpDragStartTop;

  panel.addEventListener("pointerdown", e => {
    if (window.innerWidth <= 700) return;
    if (!e.target.closest("#filter-panel-drag-icon")) return;
    e.preventDefault();
    e.stopPropagation();
    fpDragging = true;
    const pr = panel.getBoundingClientRect();
    fpDragStartX    = e.clientX;
    fpDragStartY    = e.clientY;
    fpDragStartLeft = pr.left;
    fpDragStartTop  = pr.top;
    panel.setPointerCapture(e.pointerId);
    document.body.classList.add("is-dragging-floating-panel");
  });

  panel.addEventListener("pointermove", e => {
    if (!fpDragging) return;
    const pr = panel.getBoundingClientRect();
    const nl = Math.max(0, Math.min(fpDragStartLeft + (e.clientX - fpDragStartX), window.innerWidth  - pr.width));
    const nt = Math.max(0, Math.min(fpDragStartTop  + (e.clientY - fpDragStartY), window.innerHeight - pr.height));
    panel.style.left = nl + "px";
    panel.style.top  = nt + "px";
    fpSavedPos = { left: panel.style.left, top: panel.style.top };
  });

  const endFpDrag = () => {
    if (!fpDragging) return;
    fpDragging = false;
    document.body.classList.remove("is-dragging-floating-panel");
  };
  panel.addEventListener("pointerup",     endFpDrag);
  panel.addEventListener("pointercancel", endFpDrag);

  // ── Map Layers panel resize (desktop only) ──
  let fpResizing = false, fpResizeStartX, fpResizeStartY, fpResizeStartW, fpResizeStartH;

  panel.addEventListener("pointerdown", e => {
    if (window.innerWidth <= 700) return;
    if (!e.target.closest("#filter-panel-resize-handle")) return;
    e.preventDefault();
    e.stopPropagation();
    fpResizing = true;
    const pr = panel.getBoundingClientRect();
    fpResizeStartX = e.clientX;
    fpResizeStartY = e.clientY;
    fpResizeStartW = pr.width;
    fpResizeStartH = pr.height;
    panel.setPointerCapture(e.pointerId);
    document.body.classList.add("is-resizing-floating-panel");
  });

  panel.addEventListener("pointermove", e => {
    if (!fpResizing) return;
    const pr = panel.getBoundingClientRect();
    const minW = 220, minH = 200;
    const nw = Math.max(minW, Math.min(fpResizeStartW + (e.clientX - fpResizeStartX), window.innerWidth  - pr.left));
    const nh = Math.max(minH, Math.min(fpResizeStartH + (e.clientY - fpResizeStartY), window.innerHeight - pr.top));
    panel.style.width     = nw + "px";
    panel.style.maxHeight = nh + "px";
    panel.style.height    = "";
    fpSavedSize = { width: panel.style.width, maxHeight: panel.style.maxHeight };
  });

  const endFpResize = () => {
    if (!fpResizing) return;
    fpResizing = false;
    document.body.classList.remove("is-resizing-floating-panel");
  };
  panel.addEventListener("pointerup",     endFpResize);
  panel.addEventListener("pointercancel", endFpResize);
}

function initTopToggle() {
  const btn = document.getElementById("top-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const hidden = document.getElementById("app").classList.toggle("top-hidden");
    btn.setAttribute("aria-label", hidden ? "Show header" : "Hide header");
    btn.title = hidden ? "Show header" : "Hide header";
  });
}

/* ── Legend controls (2-state open/close + drag + resize) ── */
function initLegendControls() {
  const legend  = document.getElementById("legend");
  const restore = document.getElementById("legend-restore");
  if (!legend) return;

  const container = document.getElementById("map-container");

  function closeLegend() {
    legendOpen = false;
    legend.style.display = "none";
    if (restore) {
      restore.classList.add("visible");
      restore.style.left = legend.style.left || "";
      restore.style.top  = legend.style.top  || "";
    }
  }

  function showLegend() {
    legendOpen = true;
    if (lgSavedPos)  { legend.style.left = lgSavedPos.left; legend.style.top = lgSavedPos.top; }
    if (restore) restore.classList.remove("visible");
    renderLegend(); // rebuild with current layer state and apply lgSavedSize
  }

  // Close/restore button events — delegated since toolbar is rebuilt by renderLegend()
  legend.addEventListener("click", e => {
    if (e.target.closest(".legend-close-btn")) closeLegend();
  });
  if (restore) restore.addEventListener("click", showLegend);

  // ── Legend drag (desktop only) ──
  let lgDragging = false, lgDragStartX, lgDragStartY, lgDragStartLeft, lgDragStartTop;

  legend.addEventListener("pointerdown", e => {
    if (window.innerWidth <= 700) return;
    if (!e.target.closest(".legend-drag-handle")) return;
    e.preventDefault();
    e.stopPropagation();
    lgDragging = true;
    const lr = legend.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    lgDragStartX    = e.clientX;
    lgDragStartY    = e.clientY;
    lgDragStartLeft = lr.left - cr.left;
    lgDragStartTop  = lr.top  - cr.top;
    legend.setPointerCapture(e.pointerId);
    document.body.classList.add("is-dragging-floating-panel");
  });

  legend.addEventListener("pointermove", e => {
    if (!lgDragging) return;
    const cr = container.getBoundingClientRect();
    const lr = legend.getBoundingClientRect();
    const nl = Math.max(0, Math.min(lgDragStartLeft + (e.clientX - lgDragStartX), cr.width  - lr.width));
    const nt = Math.max(0, Math.min(lgDragStartTop  + (e.clientY - lgDragStartY), cr.height - lr.height));
    legend.style.left = nl + "px";
    legend.style.top  = nt + "px";
    lgSavedPos = { left: legend.style.left, top: legend.style.top };
    if (restore) { restore.style.left = legend.style.left; restore.style.top = legend.style.top; }
  });

  const endLgDrag = () => {
    if (!lgDragging) return;
    lgDragging = false;
    document.body.classList.remove("is-dragging-floating-panel");
  };
  legend.addEventListener("pointerup",     endLgDrag);
  legend.addEventListener("pointercancel", endLgDrag);

  // ── Legend resize (desktop only) ──
  let lgResizing = false, lgResizeStartX, lgResizeStartY, lgResizeStartW, lgResizeStartH;

  legend.addEventListener("pointerdown", e => {
    if (window.innerWidth <= 700) return;
    if (!e.target.closest(".panel-resize-handle")) return;
    e.preventDefault();
    e.stopPropagation();
    lgResizing = true;
    const lr = legend.getBoundingClientRect();
    lgResizeStartX = e.clientX;
    lgResizeStartY = e.clientY;
    lgResizeStartW = lr.width;
    lgResizeStartH = lr.height;
    legend.setPointerCapture(e.pointerId);
    document.body.classList.add("is-resizing-floating-panel");
  });

  legend.addEventListener("pointermove", e => {
    if (!lgResizing) return;
    const cr = container.getBoundingClientRect();
    const lr = legend.getBoundingClientRect();
    const minW = 180, minH = 150;
    const maxW = cr.width  - (lr.left - cr.left);
    const maxH = cr.height - (lr.top  - cr.top);
    const nw = Math.max(minW, Math.min(lgResizeStartW + (e.clientX - lgResizeStartX), maxW));
    const nh = Math.max(minH, Math.min(lgResizeStartH + (e.clientY - lgResizeStartY), maxH));
    legend.style.width     = nw + "px";
    legend.style.height    = nh + "px";
    legend.style.maxHeight = "none";
    lgSavedSize = { width: legend.style.width, height: legend.style.height };
  });

  const endLgResize = () => {
    if (!lgResizing) return;
    lgResizing = false;
    document.body.classList.remove("is-resizing-floating-panel");
  };
  legend.addEventListener("pointerup",     endLgResize);
  legend.addEventListener("pointercancel", endLgResize);
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

  const articleCount = (typeof newsArticles !== 'undefined' ? newsArticles.length : 0);
  const companyCount = (typeof AI_COMPANIES !== 'undefined' ? AI_COMPANIES.length : 50);

  const I = {
    ban:       `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    clock:     `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    home:      `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    bolt:      `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    chart:     `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    news:      `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
    briefcase: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
    map:       `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
  };

  const cards = [
    { label: "Active Restrictions",   value: counts.moderate + counts.high + counts.ban, metric: "restrictions", icon: I.ban },
    { label: "Proposed Restrictions", value: counts.proposed, metric: "proposed", icon: I.clock },
    { label: "States w/ Legislation", value: statesWithLegislation.size, metric: "legislation", icon: I.home },
    { label: "Existing Capacity",     text: `${existingDCs.length} sites · ${(existingMW / 1000).toFixed(1)} GW`, sample: true, metric: "capacity", icon: I.bolt },
    { label: "Planned Data Centers",  text: `${plannedDCs.length} sites · ${(plannedMW / 1000).toFixed(1)} GW`, sample: true, metric: "planned", icon: I.chart },
    { label: "AI News Articles",      value: articleCount, metric: "articles", icon: I.news },
    { label: "Companies Monitored",   value: companyCount, metric: "companies", icon: I.briefcase },
    { label: "Data Last Updated",     text: lastUpdated, metric: "updated", icon: I.map },
  ];

  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";
  for (const card of cards) {
    const el  = document.createElement("div");
    el.className = "stat-card";
    if (card.metric) el.dataset.metric = card.metric;
    const tag  = card.sample ? `<span class="sample-tag" style="margin-left:6px;">Sample</span>` : "";
    const icon = card.icon   ? `<div class="stat-card-icon" aria-hidden="true">${card.icon}</div>` : "";
    if (card.text) {
      el.innerHTML = `${icon}<div class="stat-card-label">${card.label}${tag}</div><div class="stat-card-value stat-card-text">${card.text}</div>`;
    } else {
      el.innerHTML = `${icon}<div class="stat-card-label">${card.label}</div><div class="stat-card-value">0</div>`;
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

const LIFECYCLE_LABELS = {
  effective:  "In Effect",
  enacted:    "Enacted",
  proposed:   "Proposed",
  discovered: "Signal",
  expired:    "Expired",
  repealed:   "Repealed",
  failed:     "Not Enacted",
};

const LIFECYCLE_BADGE_CLASS = {
  effective:  "lc-effective",
  enacted:    "lc-enacted",
  proposed:   "lc-proposed",
  discovered: "lc-discovered",
  expired:    "lc-expired",
  repealed:   "lc-expired",
  failed:     "lc-expired",
};

const GOV_URL_RE = /\.gov(\/|$)|\.mil(\/|$)|state\.[a-z]{2}\.us/i;

function buildConfidenceBadgeHtml(county) {
  const conf  = county.confidence || "low";
  const score = county.confidence_score;
  const tier  = county.source_tier;
  const stage = county.lifecycle_stage;

  const label     = CONFIDENCE_LABELS[conf] || conf;
  const tierLabel = TIER_LABELS[tier] || "";
  const scoreText = typeof score === "number" ? `${score}/100` : "";
  const stageLabel = stage ? (LIFECYCLE_LABELS[stage] || stage) : "";
  const stageCls   = stage ? (LIFECYCLE_BADGE_CLASS[stage] || "lc-proposed") : "";

  const verifiedMark = county.pipeline_verified
    ? `<span class="pipeline-verified-badge" title="Verified by policy pipeline">&#10003; Pipeline verified</span>`
    : "";

  const reviewedText = county.last_reviewed
    ? `<span class="conf-tier-label">Reviewed: <span>${escHtml(formatCountyDate(county.last_reviewed))}</span></span>`
    : "";

  return `<div class="confidence-info-row">
    <div class="confidence-bar">
      <span class="confidence-badge conf-${conf}">
        <span class="confidence-dot"></span>
        ${escHtml(label)} Confidence
      </span>
      ${scoreText ? `<span class="confidence-score-text">${escHtml(scoreText)}</span>` : ""}
      ${stageLabel ? `<span class="lifecycle-badge ${stageCls}">${escHtml(stageLabel)}</span>` : ""}
    </div>
    ${tierLabel ? `<span class="conf-tier-label">Source tier: <span>${escHtml(tierLabel)}</span></span>` : ""}
    ${verifiedMark}
    ${reviewedText}
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
    ${county.effective_date ? `<div class="detail-section"><div class="detail-label">Effective Date</div><div class="detail-value">${formatCountyDate(county.effective_date)}</div></div>` : ""}
    ${county.notes ? `<div class="detail-section"><div class="detail-label">Notes</div><div class="detail-value">${escHtml(county.notes)}</div></div>` : ""}
    ${county.sources && county.sources.length ? `<div class="detail-section"><div class="detail-label">Sources</div><ul class="sources-list">${county.sources.map(s => {
      if (s && typeof s === "object" && s.url) {
        const isGov = GOV_URL_RE.test(s.url);
        const govBadge = isGov ? `<span class="source-gov-badge">Gov</span>` : "";
        return `<li>${govBadge}<a href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escHtml(s.label)}</a></li>`;
      }
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

function setSevClass(key) {
  const panel = document.getElementById("detail-panel");
  panel.className = panel.className.split(" ").filter(c => !c.startsWith("sev-")).join(" ");
  if (key) panel.classList.add("sev-" + key);
}

function setDetailEmpty() {
  setSevClass(null);
  setLocationHash(null);
  document.getElementById("detail-header").querySelector("h2").textContent = "County Details";
  document.getElementById("detail-state").textContent = "";
  document.getElementById("detail-body").innerHTML = `
    <div id="detail-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
      <p>${window.matchMedia("(pointer: coarse)").matches ? "Tap" : "Click"} any county on the map to see statewide, county, and city regulations.</p>
    </div>`;
  closeMobileSheet();
}

function setDetailCounty(fips, county) {
  setSevClass(getSeverityKey(county));
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
  setSevClass("none");
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
  setSevClass(null);
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
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};border:1px solid ${themeColors().dotBorder}"></span>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatCountyDate(d) {
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
    switchTab("map");
    // Force Leaflet to recalculate its container size synchronously before
    // fitBounds — required when the map was initialized while #main was hidden.
    if (leafletMap) leafletMap.invalidateSize();
    selectCounty(hash);
    zoomToFeature(hash);
    return true;
  }
  return false;
}

/* ── Keyboard shortcuts ── */
function initKeyboardShortcuts() {
  document.addEventListener("keydown", e => {
    // `/` focuses search (unless already in a text field)
    if (e.key === "/" && !e.target.matches("input, textarea, select, [contenteditable]")) {
      e.preventDefault();
      const searchInput = document.getElementById("search-input");
      if (searchInput) { searchInput.focus(); searchInput.select(); }
      return;
    }
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
  setSevClass(null);
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
    layer.setStyle(selectedCountyStyle());
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

/* ── Advanced Filters Panel ── */
function syncAdvancedFilterUI() {
  // Sync severity chips
  document.querySelectorAll("#adv-severity-chips .adv-chip").forEach(chip => {
    chip.classList.toggle("active", activeRestrictFilters.has(chip.dataset.key));
  });
  // Sync state select
  const stSel = document.getElementById("adv-state-select");
  if (stSel) stSel.value = activeStateFilter;
  // Sync clear button visibility
  const clearBtn = document.getElementById("adv-filter-clear");
  if (clearBtn) clearBtn.hidden = !hasActiveMapFilters();
  // Sync adv-filter-toggle button
  const advBtn = document.getElementById("adv-filter-toggle");
  if (advBtn) advBtn.classList.toggle("active", hasActiveMapFilters());
  // Update Done button label with live match count
  const doneBtn = document.getElementById("adv-filter-done");
  if (doneBtn) {
    if (hasActiveMapFilters()) {
      let n = 0;
      for (const fips in mapData) { if (countyMatchesFilters(fips)) n++; }
      doneBtn.textContent = n === 0 ? "No areas match" : `Show ${n} area${n !== 1 ? "s" : ""}`;
    } else {
      doneBtn.textContent = "Done";
    }
  }
}

function initAdvancedFiltersPanel() {
  const panel    = document.getElementById("adv-filter-panel");
  const backdrop = document.getElementById("adv-filter-backdrop");
  const closeBtn = document.getElementById("adv-filter-close");
  const clearBtn = document.getElementById("adv-filter-clear");
  const openBtn  = document.getElementById("adv-filter-toggle");

  function openPanel() {
    panel.classList.add("open");
    backdrop.classList.add("open");
    openBtn.classList.add("active");
    openBtn.setAttribute("aria-expanded", "true");
    syncAdvancedFilterUI();
  }
  function closePanel() {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
    openBtn.setAttribute("aria-expanded", "false");
    if (!hasActiveMapFilters()) openBtn.classList.remove("active");
  }

  const doneBtn = document.getElementById("adv-filter-done");
  if (doneBtn) doneBtn.addEventListener("click", closePanel);

  openBtn.addEventListener("click", () => {
    panel.classList.contains("open") ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);

  // Clear all
  clearBtn.addEventListener("click", () => {
    clearAllFilters();
    clearBtn.hidden = true;
  });

  // Severity chips
  const chipRow = document.getElementById("adv-severity-chips");
  const order   = ["ban", "high", "moderate", "proposed", "pro"];
  for (const key of order) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adv-chip" + (activeRestrictFilters.has(key) ? " active" : "");
    btn.dataset.key = key;
    btn.title = SEVERITY[key].label;
    btn.innerHTML = `<span class="adv-chip-dot" style="background:${SEVERITY[key].color}"></span>${SEVERITY[key].label}`;
    btn.addEventListener("click", () => {
      toggleRestrictFilter(key);
      btn.classList.toggle("active", activeRestrictFilters.has(key));
      clearBtn.hidden = !hasActiveMapFilters();
      if (!hasActiveMapFilters()) openBtn.classList.remove("active");
      else openBtn.classList.add("active");
    });
    chipRow.appendChild(btn);
  }

  // State select
  const stSel = document.getElementById("adv-state-select");
  for (const abbr of Object.values(STATE_FIPS).sort()) {
    const opt = document.createElement("option");
    opt.value = abbr;
    opt.textContent = `${STATE_NAMES[abbr] || abbr} (${abbr})`;
    stSel.appendChild(opt);
  }
  stSel.addEventListener("change", () => {
    activeStateFilter = stSel.value;
    applyFilters();
  });

  // Policy scope toggles (synced to layer panel)
  const scopeRow = document.getElementById("adv-scope-toggles");
  const scopeDefs = [
    { id: "restrictions", label: "County", color: "#dc2626" },
    { id: "state_policy", label: "State",  color: "#8b5cf6" },
    { id: "city_policy",  label: "City",   color: "#3b82f6" },
  ];
  for (const def of scopeDefs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adv-chip" + (layerState[def.id] ? " active" : "");
    btn.dataset.scope = def.id;
    btn.innerHTML = `<span class="adv-chip-dot" style="background:${def.color}"></span>${def.label}`;
    btn.addEventListener("click", () => {
      setLayerVisible(def.id, !layerState[def.id], true);
      btn.classList.toggle("active", layerState[def.id]);
    });
    scopeRow.appendChild(btn);
  }

}

/* ── Nav Tabs ── */
function switchTab(tab) {
  activeTab = tab;
  const mainEl      = document.getElementById("main");
  const homeEl      = document.getElementById("home-view");
  const newsEl      = document.getElementById("news-view");
  const stocksEl    = document.getElementById("stocks-view");
  const analyticsEl = document.getElementById("analytics-view");
  const aboutEl     = document.getElementById("about-view");
  const searchBar   = document.getElementById("search-bar");
  const appEl       = document.getElementById("app");

  document.querySelectorAll(".header-tab").forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  // Restore header whenever leaving the map — top-toggle is hidden on other tabs on mobile
  if (tab !== "map") appEl.classList.remove("top-hidden");

  appEl.classList.toggle("stocks-mode",   tab === "stocks");
  appEl.classList.toggle("fullpage-mode", tab === "analytics" || tab === "about" || tab === "home");

  // Hide all views, show the active one
  mainEl.hidden = true;
  newsEl.hidden = true;
  if (homeEl)      homeEl.hidden      = true;
  if (stocksEl)    stocksEl.hidden    = true;
  if (analyticsEl) analyticsEl.hidden = true;
  if (aboutEl)     aboutEl.hidden     = true;

  if (tab === "home") {
    if (homeEl) homeEl.hidden = false;
    searchBar.classList.add("news-mode");
    if (typeof renderHomePage === "function") renderHomePage();
  } else if (tab === "news") {
    newsEl.hidden = false;
    searchBar.classList.add("news-mode");
    renderNews();
  } else if (tab === "stocks") {
    if (stocksEl) stocksEl.hidden = false;
    searchBar.classList.add("news-mode");
    if (typeof initStocksPage === "function") initStocksPage();
  } else if (tab === "analytics") {
    if (analyticsEl) analyticsEl.hidden = false;
    searchBar.classList.add("news-mode");
    if (typeof renderAnalyticsPage === "function") renderAnalyticsPage();
  } else if (tab === "about") {
    if (aboutEl) aboutEl.hidden = false;
    searchBar.classList.add("news-mode");
    if (typeof renderAboutPage === "function") renderAboutPage();
  } else {
    mainEl.hidden = false;
    searchBar.classList.remove("news-mode");
    if (!leafletMap) {
      mapInitPromise = initMapFromGeo();
    } else {
      setTimeout(() => leafletMap && leafletMap.invalidateSize(), 200);
    }
  }
}

function initNavTabs() {
  document.querySelectorAll(".header-tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  /* Logo / brand click → Home */
  document.getElementById("header-brand")?.addEventListener("click", () => switchTab("home"));
}

/* ── AI News Feed ── */
function categoryClass(cat) {
  return "cat-" + (cat || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

function formatDate(iso) {
  if (!iso) return "";
  // Handle both "2026-07-11" (old schema) and full ISO strings (new schema)
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T12:00:00Z");
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* Populate the State and Publisher filter dropdowns from actual article data */
function initNewsDynamicDropdowns() {
  const stateSel  = document.getElementById("news-state-filter");
  const sourceSel = document.getElementById("news-source-filter");
  if (!stateSel || !sourceSel) return;

  // Remove old options (keep "All X" first option)
  while (stateSel.options.length > 1) stateSel.remove(1);
  while (sourceSel.options.length > 1) sourceSel.remove(1);

  const states  = new Set();
  const sources = new Set();
  for (const a of newsArticles) {
    if (a.location?.state) states.add(a.location.state);
    if (a.source) sources.add(a.source);
  }

  for (const abbr of [...states].sort()) {
    const opt = document.createElement("option");
    opt.value = abbr;
    opt.textContent = `${STATE_NAMES[abbr] || abbr} (${abbr})`;
    stateSel.appendChild(opt);
  }
  for (const src of [...sources].sort()) {
    const opt = document.createElement("option");
    opt.value = src;
    opt.textContent = src;
    sourceSel.appendChild(opt);
  }
}

function filterNewsArticles() {
  return newsArticles.filter(a => {
    if (newsFilters.category && a.category !== newsFilters.category) return false;
    if (newsFilters.state && a.location?.state !== newsFilters.state) return false;
    if (newsFilters.source && a.source !== newsFilters.source) return false;
    if (newsFilters.search) {
      const q = newsFilters.search.toLowerCase();
      const haystack = [
        a.title, a.description, a.summary, a.source, a.category,
        a.location?.state, a.location?.county,
        ...(a.tags || []),
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/* ── Article detail panel ── */
let detailOpenArticle  = null;
let detailFocusReturn  = null;
let detailReleaseFocus = null;  // cleanup fn for focus trap

function openArticleDetail(art, returnEl) {
  detailOpenArticle = art;
  detailFocusReturn = returnEl || null;

  const panel    = document.getElementById("article-detail");
  const backdrop = document.getElementById("article-detail-backdrop");

  // Populate fields (only set text content — no innerHTML from article data)
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "";
  };

  const catEl = document.getElementById("article-detail-cat");
  if (catEl) {
    catEl.textContent  = art.category || "";
    catEl.className    = `news-category-tag ${categoryClass(art.category)}`;
  }
  setTxt("article-detail-source", art.source || "");
  setTxt("article-detail-date",   formatDate(art.published_at || art.publishedAt));
  setTxt("article-detail-title",  art.title || "");

  // Location
  const locEl = document.getElementById("article-detail-location");
  if (locEl) {
    const state  = art.location?.state  || null;
    const county = art.location?.county || null;
    if (state) {
      const btn = document.createElement("button");
      btn.className = "news-location-link";
      btn.textContent = state + (county ? ` – ${county}` : "");
      btn.addEventListener("click", () => {
        activeStateFilter = state;
        applyFilters();
        switchTab("map");
        closeArticleDetail();
      });
      locEl.innerHTML = "";
      locEl.appendChild(btn);
    } else {
      locEl.innerHTML = "";
    }
  }

  // Summary section
  const summaryText = art.summary || art.description || "";
  setTxt("article-detail-summary", summaryText);

  const kpList = document.getElementById("article-detail-keypoints");
  if (kpList) {
    kpList.innerHTML = "";
    const points = art.key_points || [];
    // If no key points and no summary, hide the section
    points.forEach(pt => {
      const li = document.createElement("li");
      li.textContent = pt;
      kpList.appendChild(li);
    });
    kpList.hidden = points.length === 0;
  }

  const mattersLbl = document.getElementById("article-detail-matters-label");
  const mattersEl  = document.getElementById("article-detail-matters");
  if (mattersEl) {
    const matters = art.why_it_matters || "";
    mattersEl.textContent = matters;
    mattersEl.hidden = !matters;
    if (mattersLbl) mattersLbl.hidden = !matters;
  }

  // Attribution note — only show if we know this is deterministically generated
  const attrEl = document.getElementById("article-detail-attribution");
  if (attrEl) {
    const method = art.summary_method || "unavailable";
    attrEl.hidden = method === "unavailable";
  }

  // Tags
  const tagsEl = document.getElementById("article-detail-tags");
  if (tagsEl) {
    tagsEl.innerHTML = "";
    (art.tags || []).forEach(tag => {
      const sp = document.createElement("span");
      sp.className   = "news-tag";
      sp.textContent = tag;
      tagsEl.appendChild(sp);
    });
  }

  // Original article link
  const linkEl = document.getElementById("article-detail-link");
  if (linkEl) {
    if (art.url && art.url.startsWith("http")) {
      linkEl.href = art.url;
      linkEl.textContent = "";
      linkEl.textContent = `Read the original article on ${art.source || "the publisher's site"}`;
      // Re-append the SVG icon
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "13"); svg.setAttribute("height", "13");
      svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2.5");
      svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>';
      linkEl.appendChild(svg);
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
    }
  }

  // Show panel — unhide first, then add "open" in next frame so CSS transition fires
  panel.hidden = false;
  backdrop.classList.add("open");
  requestAnimationFrame(() => panel.classList.add("open"));

  // Prevent background scroll on mobile
  document.body.classList.add("detail-open");

  // Push history state for back-button support
  history.pushState({ articleDetail: true }, "");

  // Focus trap
  const closeBtn = document.getElementById("article-detail-close");
  if (closeBtn) closeBtn.focus();
  detailReleaseFocus = _trapFocus(panel);
}

function closeArticleDetail() {
  if (!detailOpenArticle) return;
  detailOpenArticle = null;

  const panel    = document.getElementById("article-detail");
  const backdrop = document.getElementById("article-detail-backdrop");

  panel.classList.remove("open");
  backdrop.classList.remove("open");
  // Wait for transition then hide
  setTimeout(() => { if (!detailOpenArticle) panel.hidden = true; }, 300);

  document.body.classList.remove("detail-open");

  if (detailReleaseFocus) { detailReleaseFocus(); detailReleaseFocus = null; }

  if (detailFocusReturn) {
    detailFocusReturn.focus();
    detailFocusReturn = null;
  }
}

function _trapFocus(container) {
  const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  function handler(e) {
    if (e.key !== "Tab") return;
    const els   = [...container.querySelectorAll(FOCUSABLE)];
    const first = els[0];
    const last  = els[els.length - 1];
    if (!first) return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }
  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}

function renderNews() {
  const grid     = document.getElementById("news-grid");
  const empty    = document.getElementById("news-empty");
  const errorEl  = document.getElementById("news-error");
  if (!grid) return;

  const matches = filterNewsArticles();
  grid.innerHTML = "";

  // Update status bar count and clear-filters visibility
  updateNewsStatusCount(matches.length, newsArticles.length);
  const clearBtn = document.getElementById("news-clear-filters");
  if (clearBtn) {
    const isFiltered = newsFilters.search || newsFilters.category || newsFilters.state || newsFilters.source;
    clearBtn.hidden = !isFiltered;
  }

  if (newsArticles.length === 0) {
    // No articles yet — either feed hasn't run or all were filtered out
    empty.hidden = false;
    empty.textContent = "No recent AI news articles. The feed updates every hour — check back shortly.";
    if (errorEl) errorEl.hidden = true;
    return;
  }

  empty.hidden = matches.length > 0;
  if (matches.length === 0) {
    empty.textContent = "No articles match your filters.";
  }
  if (errorEl) errorEl.hidden = true;

  for (const art of matches) {
    const catCls    = categoryClass(art.category);
    const dateStr   = formatDate(art.published_at || art.publishedAt);
    const descText  = art.description || art.summary || "";
    const tagsHtml  = (art.tags || []).slice(0, 5).map(t => `<span class="news-tag">${escHtml(t)}</span>`).join("");
    const locHtml   = art.location?.state
      ? `<button class="news-location-link" data-state="${escHtml(art.location.state)}" type="button">${escHtml(art.location.state)}${art.location.county ? " – " + escHtml(art.location.county) : ""}</button>`
      : "";

    const card = document.createElement("article");
    card.className = "news-card";
    card.dataset.catcls = catCls;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Read more: ${art.title}`);

    // Build meta row
    const meta = document.createElement("div");
    meta.className = "news-card-meta";
    const catSpan = document.createElement("span");
    catSpan.className = `news-category-tag ${catCls}`;
    catSpan.textContent = art.category || "";
    const srcSpan = document.createElement("span");
    srcSpan.className = "news-source";
    srcSpan.textContent = art.source || "";
    const dateSpan = document.createElement("span");
    dateSpan.className = "news-date";
    dateSpan.textContent = dateStr;
    meta.append(catSpan, srcSpan, dateSpan);

    const titleDiv = document.createElement("div");
    titleDiv.className = "news-card-title";
    titleDiv.textContent = art.title || "";

    const summDiv = document.createElement("div");
    summDiv.className = "news-card-summary";
    summDiv.textContent = descText;

    const tagsDiv = document.createElement("div");
    tagsDiv.className = "news-card-tags";
    tagsDiv.innerHTML = tagsHtml + locHtml;

    card.append(meta, titleDiv, summDiv, tagsDiv);

    // Location → map filter (stop propagation so it doesn't open detail)
    const locBtn = card.querySelector(".news-location-link");
    if (locBtn) {
      locBtn.addEventListener("click", e => {
        e.stopPropagation();
        activeStateFilter = locBtn.dataset.state;
        applyFilters();
        switchTab("map");
      });
    }

    // Card click → open detail panel
    const openDetail = () => openArticleDetail(art, card);
    card.addEventListener("click", e => {
      if (e.target === locBtn || locBtn?.contains(e.target)) return;
      openDetail();
    });
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(); }
    });

    grid.appendChild(card);
  }
}

function renderNewsStatusBar(newsData) {
  const bar = document.getElementById("news-status-bar");
  if (!bar) return;
  if (newsData && newsData.generated_at) {
    const d = new Date(newsData.generated_at);
    if (!isNaN(d)) {
      const fmt = d.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      });
      bar.dataset.baseText = `Automatically updated from public news feeds. Last updated ${fmt}.`;
      bar.hidden = false;
      return;
    }
  }
  bar.hidden = true;
}

function updateNewsStatusCount(shown, total) {
  const bar = document.getElementById("news-status-bar");
  if (!bar || bar.hidden || !bar.dataset.baseText) return;
  const isFiltered = shown !== total;
  const countText = isFiltered ? `${shown} of ${total} articles` : `${total} articles`;
  bar.textContent = `${countText} · ${bar.dataset.baseText}`;
}

function initNewsView() {
  initNewsDynamicDropdowns();

  // Mobile filter panel toggle
  const filtersToggle = document.getElementById("news-filters-toggle");
  if (filtersToggle) {
    filtersToggle.addEventListener("click", () => {
      const toolbar = document.getElementById("news-toolbar");
      const open = toolbar.classList.toggle("filters-open");
      filtersToggle.setAttribute("aria-expanded", open ? "true" : "false");
      filtersToggle.setAttribute("aria-label", open ? "Hide filters" : "Show filters");
    });
  }

  const newsClearBtn = document.getElementById("news-clear-filters");
  if (newsClearBtn) {
    newsClearBtn.addEventListener("click", () => {
      newsFilters = { search: "", category: "", state: "", source: "" };
      document.getElementById("news-search").value = "";
      document.getElementById("news-cat-filter").value = "";
      document.getElementById("news-state-filter").value = "";
      const srcSel = document.getElementById("news-source-filter");
      if (srcSel) srcSel.value = "";
      newsClearBtn.hidden = true;
      renderNews();
    });
  }

  document.getElementById("news-search").addEventListener("input", e => {
    newsFilters.search = e.target.value.trim();
    renderNews();
  });
  document.getElementById("news-cat-filter").addEventListener("change", e => {
    newsFilters.category = e.target.value;
    renderNews();
  });
  document.getElementById("news-state-filter").addEventListener("change", e => {
    newsFilters.state = e.target.value;
    renderNews();
  });
  const srcSel = document.getElementById("news-source-filter");
  if (srcSel) {
    srcSel.addEventListener("change", e => {
      newsFilters.source = e.target.value;
      renderNews();
    });
  }

  // Article detail close
  const closeBtn = document.getElementById("article-detail-close");
  if (closeBtn) closeBtn.addEventListener("click", () => { closeArticleDetail(); history.back(); });

  const backdrop = document.getElementById("article-detail-backdrop");
  if (backdrop) backdrop.addEventListener("click", () => { closeArticleDetail(); history.back(); });

  // Escape key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && detailOpenArticle) { closeArticleDetail(); history.back(); }
  });

  // Back button support
  window.addEventListener("popstate", () => {
    if (detailOpenArticle) closeArticleDetail();
  });
}

/* ── Last updated label ── */
function setLastUpdated(data) {
  const el = document.getElementById("last-updated");
  if (data.generated_at) {
    const d = new Date(data.generated_at);
    el.textContent = `Data updated ${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
  }
}

/* ── Theme toggle ── */
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const SVG = {
    system: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    light:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    dark:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  };
  const LABELS  = { system: 'System', light: 'Light', dark: 'Dark' };
  const THEMES  = ['system', 'light', 'dark'];

  function applyTheme(t) {
    const el = document.documentElement;
    const light = t === 'light' || (t === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
    if (t === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', t);
    el.classList.toggle('is-light-theme', light);
    btn.innerHTML = SVG[t];
    btn.title = `Appearance: ${LABELS[t]}`;
    btn.setAttribute('aria-label', `Color theme: ${LABELS[t]}`);
    // Re-apply Leaflet layer styles so map colors update immediately
    if (countyGeoLayer) {
      countyGeoLayer.setStyle(countyStyle);
      if (selectedFips && countyLayerByFips[selectedFips]) {
        countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
      }
    }
    if (stateGeoLayer) stateGeoLayer.setStyle(stateStyle);
  }

  btn.addEventListener('click', () => {
    const cur = localStorage.getItem('theme') || 'system';
    const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    localStorage.setItem('theme', next);
    applyTheme(next);
  });

  // Respond to OS theme changes when in system mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('theme') || 'system') === 'system') {
      applyTheme('system');
    }
  });

  // Apply saved theme on init (inline script already set data-theme / .is-light-theme,
  // but we still need to set the button icon and label)
  applyTheme(localStorage.getItem('theme') || 'system');
}

/* ── Init ── */
async function init() {
  initThemeToggle();
  initNavTabs();
  initKeyboardShortcuts();

  const hasHashFips = /^\d{5}$/.test(window.location.hash.replace("#", ""));

  // Always show home immediately — skeleton renders while data loads.
  // This prevents the map loading spinner from blocking the UI even when
  // the URL contains a saved county hash from a prior session.
  switchTab("home");
  // Pre-fetch geo data in the background so the Map tab opens quickly.
  fetchGeoData();

  try {
    const { data, sample, stateReg, newsData } = await loadCoreData();

    mapData      = data.counties || {};
    sampleLayers = sample || null;
    stateRegData = stateReg.states || {};
    newsArticles = (newsData && newsData.articles) ? newsData.articles : [];

    // Re-render home with real data (clears skeleton state)
    const hv = document.getElementById("home-view");
    if (hv) delete hv.dataset.built;
    if (typeof renderHomePage === "function") renderHomePage();

    initSearch();
    initAdvancedFiltersPanel();
    initNewsView();
    renderNewsStatusBar(newsData);
    setLastUpdated(data);
    renderDashboard(data);

    // If URL had a FIPS hash, initialize the map silently while home stays
    // visible — #main is hidden so the loading spinner never shows.
    // fetchGeoData() above already started the 2 MB download in parallel,
    // so by the time loadCoreData() finished the geo file may be ready or close.
    // When initMapFromGeo() resolves, restoreFromHash() snaps to the map
    // and county instantly with no loading overlay.
    if (hasHashFips) {
      await initMapFromGeo();
      restoreFromHash();
    }

  } catch (err) {
    console.error("Core data failed:", err);
    const hv = document.getElementById("home-view");
    if (hv && !hv.dataset.built) {
      hv.innerHTML = `<div style="padding:40px 24px;text-align:center;color:#e05252;">
        <p style="font-size:15px;font-weight:600;">Could not load data</p>
        <p style="font-size:13px;margin-top:8px;color:#8a8fa8;">${escHtml(err.message)}</p>
        <button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:#4874e8;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Retry</button>
      </div>`;
    }
  }
}

// Set the flag here (module level) so the retry-button detector in index.html
// knows this script executed, even if DOMContentLoaded fires late or is missed.
window._pageInitialized = true;

// With defer the DOM is already parsed when this runs (readyState "interactive"),
// so call init() directly rather than waiting for DOMContentLoaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
