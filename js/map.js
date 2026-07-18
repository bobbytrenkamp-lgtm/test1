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

/* ── Layer definitions — sourced from window.LAYER_REGISTRY (js/layer-registry.js) ── */
const LAYER_DEFS = window.LAYER_REGISTRY;

const SAMPLE_DISCLAIMER = "Approximate route — exact alignment unverified.";

/* ── Global state ── */
let leafletMap      = null;
let countyGeoLayer  = null;
let stateGeoLayer   = null;
let annotationGroup = null;
let baseTileLayers  = {};
let activeTile      = "satellite";
let hybridLabels    = null;

const countyLayerByFips  = {};
const leafletLayerGroups = {};

/* ── GIS tools state ── */
let measureMode      = false;
let measurePoints    = [];
let measureLayers    = [];
let minimapInstance  = null;
let minimapRect      = null;
let _proximityCircle = null;   // L.circle drawn for spatial proximity view
let _proximityRadius = 0;      // active radius in miles (0 = off)
let minimapVisible   = false;
let _toastTimer      = null;
let locMarker        = null;
let _ctxLatLng       = null;
let bookmarksVisible = false;
let countyFillOpacity = 1.0;

/* ── Draw / Pin tool state ── */
let drawMode         = false;
let drawPoints       = [];
let drawLayers       = [];
let drawAreaUnit     = (function(){ try { return localStorage.getItem('draw-area-unit') || 'mi2'; } catch(_){ return 'mi2'; } })();
let candidatePinMode = false;
let _candidatePin    = null;

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
  annotations:     true,
  zoning_districts: false,
  zoning_overlays:  false,
};

let mapData         = {};
let sampleLayers    = null;
let stateRegData    = {};
let legendOpen      = true;  // true=visible, false=collapsed to restore button
let politicalRiskData = {};   // fips → risk record from political_risk.json
let showPoliticalRisk = false;
let selectedFips    = null;
let cityLabelsLayer = null;

/* ── Floating-panel saved state ──
   Preserved across open/close so the panel re-opens where the user left it. */
let fpSavedPos  = null;  // {left, top} for Map Layers panel
let fpSavedSize = null;  // {width, maxHeight} for Map Layers panel
let lgSavedPos  = null;  // {left, top} for Legend
let lgSavedSize = null;  // {width, height} for Legend

/* ── Layer panel state ── */
let _layerGroupState = {};  // groupName → true (expanded) / false (collapsed)
let _layerSearch     = "";  // current search query in the layer panel

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
const activeTypeFilters     = new Set();  // policy type keys e.g. "data_center", "ai"
let   typeFilterMode        = "any";       // "any" (OR) | "all" (AND) for activeTypeFilters
const activeStatusFilters   = new Set();  // "active" | "proposed" | "pending"

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
  if (activeTypeFilters.size > 0) {
    const countyTypes = county?.types || [];
    if (typeFilterMode === "all") {
      for (const t of activeTypeFilters) { if (!countyTypes.includes(t)) return false; }
    } else {
      let hasAny = false;
      for (const t of activeTypeFilters) { if (countyTypes.includes(t)) { hasAny = true; break; } }
      if (!hasAny) return false;
    }
  }
  if (activeStatusFilters.size > 0) {
    const status = county?.status || "active";
    if (!activeStatusFilters.has(status)) return false;
  }
  return true;
}

function hasActiveMapFilters() {
  return activeRestrictFilters.size > 0 || activeStateFilter !== "" ||
         activeTypeFilters.size > 0 || activeStatusFilters.size > 0;
}

/* ── Helpers ── */
function fipsKey(id) { return String(id).padStart(5, "0"); }

function getColor(fips) {
  const county = mapData[fips];
  return county ? getSeverityColor(county) : themeColors().noData;
}

const RISK_COLORS = {
  1: "#1a9850",
  2: "#5aac44",
  3: "#b8860b",
  4: "#d75e00",
  5: "#d73027",
};

function getRiskColor(fips) {
  const r = politicalRiskData[fips];
  return r ? (RISK_COLORS[r.risk_score] || themeColors().noData) : themeColors().noData;
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
  const isSat  = activeTile === "satellite" || activeTile === "hybrid";
  const tc     = themeColors();

  // Fade out county fills when zoomed into street level so satellite imagery is visible
  const zoom     = leafletMap ? leafletMap.getZoom() : 7;
  const zoomFade = zoom >= 13 ? 0 : zoom <= 10 ? 1 : (13 - zoom) / 3;

  if (showPoliticalRisk) {
    const hasRisk = !!politicalRiskData[fips];
    return {
      fillColor:   getRiskColor(fips),
      fillOpacity: hasRisk ? (isSat ? 0.72 * zoomFade : 0.78 * zoomFade) : (isSat ? 0 : 0.06 * zoomFade),
      color:       tc.countyBorder,
      weight:      0.35,
    };
  }

  if (!layerState.restrictions) {
    return { fillColor: tc.noData, fillOpacity: isSat ? 0 : 0.12 * zoomFade, color: tc.countyBorder, weight: 0.35 };
  }

  const county     = mapData[fips];
  const sevKey     = getSeverityKey(county);
  const hasData    = sevKey !== "none";

  if (hasActiveMapFilters() && !countyMatchesFilters(fips)) {
    return {
      fillColor:   tc.noData,
      fillOpacity: isSat ? 0 : 0.08 * zoomFade * countyFillOpacity,
      color:       tc.countyBorder,
      weight:      0.2,
    };
  }

  return {
    fillColor:   getColor(fips),
    fillOpacity: isSat ? (hasData ? 0.70 * zoomFade * countyFillOpacity : 0) : 0.75 * zoomFade * countyFillOpacity,
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
  const [data, sample, stateReg, newsData, riskRaw] = await Promise.all([
    get("data/map_data.json"),
    get("data/sample_layers.json").catch(() => null),
    get("data/state_regulations.json").catch(() => ({ states: {} })),
    fetch("data/ai_news.json", { cache: "no-store" }).then(r => r.json()).catch(() => ({ articles: [] })),
    get("data/political_risk.json").catch(() => ({ scores: [] })),
  ]);
  // Index risk scores by fips for O(1) lookup
  const riskByFips = {};
  for (const rec of (riskRaw.scores || [])) {
    if (rec.fips) riskByFips[String(rec.fips).padStart(5, "0")] = rec;
  }
  return { data, sample, stateReg, newsData, riskByFips };
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
    initDetailSheetSwipe();
    initTopToggle();
    initLegendControls();
    setDetailEmpty();
    // Wire results panel row click → selectCounty, and do initial data load
    window.RESULTS_PANEL?.onRowClick(selectCounty);
    window.RESULTS_PANEL?.update(mapData, () => true);
    if (loadEl) loadEl.style.display = "none";
    // Staggered invalidateSize calls catch iOS Safari layout finalization at
    // different stages: after layers paint, after first user interaction window,
    // and well after any address-bar animation settles.
    [400, 900, 1800].forEach(ms =>
      setTimeout(() => leafletMap && leafletMap.invalidateSize({ animate: false }), ms)
    );
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
  baseTileLayers.terrain = L.tileLayer(
    "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
      maxZoom: 16,
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
  } else if (type === "terrain") {
    baseTileLayers.terrain.addTo(leafletMap);
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

  let level;
  if (showPoliticalRisk) {
    const rr = politicalRiskData[fips];
    const RISK_LABELS = {1:"Very Favorable", 2:"Mostly Favorable", 3:"Mixed/Neutral", 4:"Elevated Political Risk", 5:"High Political Risk"};
    level = rr ? `Risk Score ${rr.risk_score} — ${rr.score_label || RISK_LABELS[rr.risk_score] || ""}` : "No political risk data";
  } else {
    level = county
      ? (county.level === -1 ? "Pro Data Center" : `Level ${county.level} — ${LEVEL_LABELS[county.level]}`)
      : "No restriction data";
  }

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
  if (measureMode) return;
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
  if (measureMode) return; // let click bubble to map for measure point placement
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

  /* Notify zoning module if the zoning layer is active */
  if (layerState.zoning_districts && window.ZONING_MAP) {
    window.ZONING_MAP.onCountySelected(fips);
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
  } else if (id === "zoning_districts" || id === "zoning_overlays") {
    if (window.ZONING_MAP) {
      window.ZONING_MAP.onLayerToggle(id, visible, selectedFips);
    }
    const panel = document.getElementById("zoning-panel");
    if (panel) panel.setAttribute("aria-hidden", visible ? "false" : "true");
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

/* ── Toast ── */
function showMapToast(msg, ms = 2500) {
  const el = document.getElementById("map-toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/* ── Measure tool ── */
function _formatDistance(meters) {
  const mi = meters / 1609.344;
  const km = meters / 1000;
  if (mi < 0.1) return `${Math.round(meters)} m`;
  return `${mi.toFixed(2)} mi  (${km.toFixed(2)} km)`;
}

function _updateMeasureReadout() {
  let total = 0;
  for (let i = 1; i < measurePoints.length; i++) {
    total += measurePoints[i - 1].distanceTo(measurePoints[i]);
  }
  const distEl = document.getElementById("measure-dist-val");
  const ptsEl  = document.getElementById("measure-pts-val");
  if (!distEl) return;
  if (measurePoints.length === 0) {
    distEl.textContent = "Click map to start";
    if (ptsEl) ptsEl.textContent = "";
  } else if (measurePoints.length === 1) {
    distEl.textContent = "Click again to measure";
    if (ptsEl) ptsEl.textContent = "1 pt";
  } else {
    distEl.textContent = _formatDistance(total);
    if (ptsEl) ptsEl.textContent = `${measurePoints.length} pts`;
  }
}

function addMeasurePoint(latlng) {
  measurePoints.push(latlng);

  const dot = L.circleMarker(latlng, {
    radius: 5, fillColor: "#4874e8", color: "#fff",
    weight: 1.5, fillOpacity: 1, interactive: false,
  }).addTo(leafletMap);
  measureLayers.push(dot);

  // Remove old polyline, redraw with all points
  const oldLine = measureLayers.find(l => l instanceof L.Polyline);
  if (oldLine) { leafletMap.removeLayer(oldLine); measureLayers.splice(measureLayers.indexOf(oldLine), 1); }

  if (measurePoints.length >= 2) {
    const line = L.polyline(measurePoints, {
      color: "#4874e8", weight: 2, dashArray: "6,4", opacity: 0.85, interactive: false,
    }).addTo(leafletMap);
    measureLayers.push(line);
  }
  _updateMeasureReadout();
}

function clearMeasure() {
  measureLayers.forEach(l => leafletMap.removeLayer(l));
  measureLayers = [];
  measurePoints = [];
  const readout = document.getElementById("measure-readout");
  if (readout) readout.hidden = true;
}

function toggleMeasure() {
  measureMode = !measureMode;
  const btn   = document.getElementById("gis-measure");
  const mapEl = document.getElementById("leaflet-map");
  if (btn)   { btn.classList.toggle("active", measureMode); btn.setAttribute("aria-pressed", String(measureMode)); }
  if (mapEl) mapEl.classList.toggle("measure-active", measureMode);

  if (measureMode) {
    const readout = document.getElementById("measure-readout");
    if (readout) { readout.hidden = false; _updateMeasureReadout(); }
  } else {
    clearMeasure();
  }
}

/* ── Polygon draw tool ── */
function _polygonAreaSqM(latlngs) {
  if (latlngs.length < 3) return 0;
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  let area = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += (toRad(latlngs[j].lng) - toRad(latlngs[i].lng)) *
            (Math.sin(toRad(latlngs[i].lat)) + Math.sin(toRad(latlngs[j].lat)));
  }
  return Math.abs(area) * R * R / 2;
}

function _formatArea(sqM) {
  if (drawAreaUnit === 'km2')   return `${(sqM / 1_000_000).toFixed(2)} km²`;
  if (drawAreaUnit === 'acres') return `${(sqM / 4046.856).toFixed(1)} ac`;
  return `${(sqM / 2_589_988).toFixed(2)} mi²`;
}

function _updateDrawReadout() {
  const distVal = document.getElementById('draw-area-val');
  const ptsVal  = document.getElementById('draw-pts-val');
  if (!distVal) return;
  if (drawPoints.length === 0) {
    distVal.textContent = 'Click map to start polygon';
    if (ptsVal) ptsVal.textContent = '';
  } else if (drawPoints.length < 3) {
    distVal.textContent = `${drawPoints.length} point${drawPoints.length > 1 ? 's' : ''}`;
    if (ptsVal) ptsVal.textContent = 'Need 3+ to close';
  } else {
    distVal.textContent = _formatArea(_polygonAreaSqM(drawPoints));
    if (ptsVal) ptsVal.textContent = `${drawPoints.length} pts · dbl-click to close`;
  }
}

function _redrawPolygonPreview() {
  drawLayers.forEach(l => leafletMap && leafletMap.removeLayer(l));
  drawLayers = [];
  if (!drawPoints.length) return;
  drawPoints.forEach(pt => {
    const dot = L.circleMarker(pt, {
      radius: 5, fillColor: '#a855f7', color: '#fff',
      weight: 1.5, fillOpacity: 1, interactive: false,
    }).addTo(leafletMap);
    drawLayers.push(dot);
  });
  if (drawPoints.length >= 3) {
    const poly = L.polygon(drawPoints, {
      color: '#a855f7', weight: 2, opacity: 0.9,
      fillColor: '#a855f7', fillOpacity: 0.1, interactive: false,
    }).addTo(leafletMap);
    drawLayers.push(poly);
  } else if (drawPoints.length === 2) {
    const line = L.polyline(drawPoints, {
      color: '#a855f7', weight: 2, dashArray: '6,4', opacity: 0.85, interactive: false,
    }).addTo(leafletMap);
    drawLayers.push(line);
  }
  _updateDrawReadout();
}

function _closeDrawPolygon() {
  drawMode = false;
  if (leafletMap && leafletMap.doubleClickZoom) leafletMap.doubleClickZoom.enable();
  const btn   = document.getElementById('gis-draw');
  const mapEl = document.getElementById('leaflet-map');
  if (btn)   { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
  if (mapEl) mapEl.classList.remove('draw-active');
  _redrawPolygonPreview();
  if (drawPoints.length >= 3) {
    const ptsVal = document.getElementById('draw-pts-val');
    if (ptsVal) ptsVal.textContent = `${drawPoints.length} pts`;
  } else {
    clearDraw();
  }
}

function clearDraw() {
  drawLayers.forEach(l => leafletMap && leafletMap.removeLayer(l));
  drawLayers = [];
  drawPoints = [];
  const el = document.getElementById('draw-readout');
  if (el && !candidatePinMode) el.hidden = true;
}

function toggleDraw() {
  if (measureMode) toggleMeasure();
  if (candidatePinMode) { _exitCandidatePinMode(); }
  drawMode = !drawMode;
  const btn   = document.getElementById('gis-draw');
  const mapEl = document.getElementById('leaflet-map');
  if (btn)   { btn.classList.toggle('active', drawMode); btn.setAttribute('aria-pressed', String(drawMode)); }
  if (mapEl) mapEl.classList.toggle('draw-active', drawMode);
  if (drawMode) {
    if (leafletMap && leafletMap.doubleClickZoom) leafletMap.doubleClickZoom.disable();
    clearDraw();
    const el = document.getElementById('draw-readout');
    if (el) { el.hidden = false; _updateDrawReadout(); }
  } else {
    if (leafletMap && leafletMap.doubleClickZoom) leafletMap.doubleClickZoom.enable();
    clearDraw();
  }
}

/* ── Candidate pin tool ── */
function _nearestCountyForLatLng(latlng) {
  let best = null, bestDist = Infinity;
  for (const fips of Object.keys(countyLayerByFips)) {
    const layer = countyLayerByFips[fips];
    if (!layer) continue;
    const c = layer.getBounds().getCenter();
    const d = latlng.distanceTo(c);
    if (d < bestDist) { bestDist = d; best = fips; }
  }
  return best;
}

function _placeCandidatePin(latlng) {
  if (_candidatePin && leafletMap) { leafletMap.removeLayer(_candidatePin); _candidatePin = null; }
  const icon = L.divIcon({
    className: 'candidate-pin-icon',
    html: '<svg width="22" height="28" viewBox="0 0 22 28" xmlns="http://www.w3.org/2000/svg"><path d="M11 0C5.48 0 1 4.48 1 10c0 7.25 10 18 10 18S21 17.25 21 10c0-5.52-4.48-10-10-10z" fill="#a855f7"/><circle cx="11" cy="10" r="4" fill="#fff" opacity="0.9"/></svg>',
    iconSize: [22, 28], iconAnchor: [11, 28],
  });
  _candidatePin = L.marker(latlng, { icon, interactive: false }).addTo(leafletMap);

  const el      = document.getElementById('draw-readout');
  const distVal = document.getElementById('draw-area-val');
  const ptsVal  = document.getElementById('draw-pts-val');
  if (el) el.hidden = false;
  if (distVal) {
    const lat = latlng.lat.toFixed(5);
    const lon = Math.abs(latlng.lng).toFixed(5);
    const dir = latlng.lng >= 0 ? 'E' : 'W';
    distVal.textContent = `${lat}°N, ${lon}°${dir}`;
  }
  if (ptsVal) {
    const nearFips   = _nearestCountyForLatLng(latlng);
    const nearCounty = nearFips ? mapData[nearFips] : null;
    ptsVal.textContent = nearCounty
      ? `Candidate site — ${nearCounty.name}, ${nearCounty.state}`
      : 'Candidate site';
  }
  _exitCandidatePinMode();
}

function _exitCandidatePinMode() {
  candidatePinMode = false;
  const btn   = document.getElementById('gis-pin');
  const mapEl = document.getElementById('leaflet-map');
  if (btn)   { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
  if (mapEl) mapEl.classList.remove('pin-active');
}

function _clearCandidatePin() {
  if (_candidatePin && leafletMap) { leafletMap.removeLayer(_candidatePin); _candidatePin = null; }
  if (!drawMode) {
    const el = document.getElementById('draw-readout');
    if (el) el.hidden = true;
  }
}

function toggleCandidatePin() {
  if (measureMode) toggleMeasure();
  if (drawMode) toggleDraw();
  if (_candidatePin) _clearCandidatePin();
  candidatePinMode = !candidatePinMode;
  const btn   = document.getElementById('gis-pin');
  const mapEl = document.getElementById('leaflet-map');
  if (btn)   { btn.classList.toggle('active', candidatePinMode); btn.setAttribute('aria-pressed', String(candidatePinMode)); }
  if (mapEl) mapEl.classList.toggle('pin-active', candidatePinMode);
  const el = document.getElementById('draw-readout');
  if (candidatePinMode) {
    if (el) {
      el.hidden = false;
      const distVal = document.getElementById('draw-area-val');
      const ptsVal  = document.getElementById('draw-pts-val');
      if (distVal) distVal.textContent = 'Click map to place site pin';
      if (ptsVal)  ptsVal.textContent  = '';
    }
  } else {
    if (el) el.hidden = true;
  }
}

/* ── CSV Export ── */
function exportCountiesCSV() {
  if (!mapData || Object.keys(mapData).length === 0) { showMapToast("No data loaded yet"); return; }

  const headers = ["FIPS","County","State","Level","Severity","Status","Policy Title","Effective Date","Types","Notes"];
  const rows    = [headers];
  const active  = hasActiveMapFilters();

  Object.entries(mapData)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([fips, c]) => {
      if (active && !countyMatchesFilters(fips)) return;
      rows.push([
        fips, c.name || "", c.state || "",
        c.level ?? "",
        LEVEL_LABELS[c.level] || LEVEL_LABELS[String(c.level)] || "",
        c.status || "", c.title || "", c.effective_date || "",
        (c.types || []).map(t => TYPE_LABELS[t] || t).join("; "),
        c.notes || "",
      ]);
    });

  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: `dc-restrictions-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  showMapToast(`Exported ${rows.length - 1} ${active ? "filtered " : ""}counties`);
}

/* ── Share URL ── */
function shareCurrentView() {
  const c   = leafletMap.getCenter();
  const url = `${location.origin}${location.pathname}#@${c.lat.toFixed(4)},${c.lng.toFixed(4)},${leafletMap.getZoom()}`;
  const done = () => showMapToast("Share link copied!");
  const fail = () => {
    const ta = Object.assign(document.createElement("textarea"), { value: url, style: "position:fixed;opacity:0" });
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); done(); } catch { showMapToast("Could not copy link"); }
    ta.remove();
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(fail);
  else fail();
}

/* ── Minimap ── */
function updateMinimapRect() {
  if (!minimapInstance) return;
  try {
    if (minimapRect) minimapInstance.removeLayer(minimapRect);
    minimapRect = L.rectangle(leafletMap.getBounds(), {
      color: "#4874e8", weight: 1.5, fillColor: "#4874e8", fillOpacity: 0.22, interactive: false,
    }).addTo(minimapInstance);
  } catch (_) { /* ignore if called before map is ready */ }
}

function initMinimap() {
  const el = document.getElementById("minimap");
  if (!el || minimapInstance) return;

  minimapInstance = L.map("minimap", {
    center: [39, -96], zoom: 2, zoomControl: false, attributionControl: false,
    scrollWheelZoom: false, dragging: false, keyboard: false,
    touchZoom: false, doubleClickZoom: false, boxZoom: false,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 4 }
  ).addTo(minimapInstance);

  updateMinimapRect();
  leafletMap.on("moveend zoomend", updateMinimapRect);
  minimapInstance.on("click", e => leafletMap.panTo(e.latlng));
}

function toggleMinimap() {
  minimapVisible = !minimapVisible;
  const wrap = document.getElementById("minimap-wrap");
  const btn  = document.getElementById("gis-minimap");
  if (wrap) wrap.hidden = !minimapVisible;
  if (btn)  { btn.classList.toggle("active", minimapVisible); btn.setAttribute("aria-pressed", String(minimapVisible)); }
  if (minimapVisible) {
    if (!minimapInstance) initMinimap();
    else { minimapInstance.invalidateSize(); updateMinimapRect(); }
  }
}

/* ── Fullscreen ── */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function togglePoliticalRiskLayer() {
  showPoliticalRisk = !showPoliticalRisk;
  const btn = document.getElementById("gis-political-risk");
  if (btn) {
    btn.classList.toggle("active", showPoliticalRisk);
    btn.setAttribute("aria-pressed", String(showPoliticalRisk));
  }
  if (countyGeoLayer) {
    countyGeoLayer.setStyle(countyStyle);
    if (selectedFips && countyLayerByFips[selectedFips]) {
      countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
    }
  }
  renderLegend();
}

/* ── GPS location ── */
function locateMe() {
  if (!navigator.geolocation) { showMapToast("Geolocation not supported by this browser"); return; }
  const btn = document.getElementById("gis-locate");
  if (btn) btn.classList.add("active");
  navigator.geolocation.getCurrentPosition(
    pos => {
      if (btn) btn.classList.remove("active");
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      if (locMarker) leafletMap.removeLayer(locMarker);
      locMarker = L.circleMarker([lat, lng], {
        radius: 7, fillColor: "#4874e8", color: "#fff",
        weight: 2.5, fillOpacity: 1, interactive: false,
      }).bindTooltip(`Your location (±${Math.round(accuracy)} m)`, { permanent: false }).addTo(leafletMap);
      leafletMap.flyTo([lat, lng], Math.max(leafletMap.getZoom(), 11), { duration: 0.9 });
      showMapToast("Located");
    },
    err => {
      if (btn) btn.classList.remove("active");
      const msgs = { 1: "Location access denied", 2: "Could not determine location", 3: "Location request timed out" };
      showMapToast(msgs[err.code] || "Location unavailable");
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

/* ── Zoom to (filtered) counties ── */
function zoomToFiltered() {
  const fipsSet = Object.keys(mapData).filter(fips => {
    if (hasActiveMapFilters()) return countyMatchesFilters(fips);
    return (mapData[fips].level || 0) >= 1; // all counties with any restriction
  });
  if (!fipsSet.length) { showMapToast("No matching counties"); return; }
  const layers = fipsSet.map(f => countyLayerByFips[f]).filter(Boolean);
  if (!layers.length) { showMapToast("Map not ready"); return; }
  const bounds = layers.reduce((b, l) => b.extend(l.getBounds()), L.latLngBounds([]));
  if (bounds.isValid()) {
    leafletMap.flyToBounds(bounds, { duration: 0.9, padding: [40, 40], maxZoom: 9 });
    showMapToast(hasActiveMapFilters() ? `Zoomed to ${fipsSet.length} filtered counties` : `Zoomed to ${fipsSet.length} restricted counties`);
  }
}

/* ── Print ── */
function printMap() {
  showMapToast("Preparing print…", 1800);
  setTimeout(() => window.print(), 700);
}

/* ── Right-click context menu ── */
function initContextMenu() {
  const menu  = document.getElementById("map-ctx-menu");
  const mapEl = document.getElementById("leaflet-map");
  if (!menu || !mapEl) return;

  function closeMenu() { menu.hidden = true; }

  leafletMap.on("contextmenu", e => {
    _ctxLatLng = e.latlng;
    const rect = mapEl.getBoundingClientRect();
    let x = e.originalEvent.clientX - rect.left;
    let y = e.originalEvent.clientY - rect.top;
    menu.hidden = false;
    const mw = menu.offsetWidth  || 200;
    const mh = menu.offsetHeight || 130;
    if (x + mw > rect.width)  x = Math.max(0, rect.width  - mw - 4);
    if (y + mh > rect.height) y = Math.max(0, rect.height - mh - 4);
    menu.style.left = Math.max(0, x) + "px";
    menu.style.top  = Math.max(0, y) + "px";
  });

  leafletMap.on("click", closeMenu);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  document.getElementById("map-container")?.addEventListener("click", e => {
    if (!menu.contains(e.target)) closeMenu();
  });

  document.getElementById("ctx-copy-coords")?.addEventListener("click", () => {
    if (!_ctxLatLng) return;
    const text = `${_ctxLatLng.lat.toFixed(5)}, ${_ctxLatLng.lng.toFixed(5)}`;
    const done = () => showMapToast("Coordinates copied!");
    const fail = () => {
      const ta = Object.assign(document.createElement("textarea"), { value: text, style: "position:fixed;opacity:0" });
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); done(); } catch (_) { showMapToast("Copy not supported"); }
      ta.remove();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fail);
    else fail();
    closeMenu();
  });

  document.getElementById("ctx-open-google")?.addEventListener("click", () => {
    if (!_ctxLatLng) return;
    window.open(`https://www.google.com/maps?q=${_ctxLatLng.lat.toFixed(5)},${_ctxLatLng.lng.toFixed(5)}`, "_blank", "noopener,noreferrer");
    closeMenu();
  });

  document.getElementById("ctx-measure-from")?.addEventListener("click", () => {
    if (!_ctxLatLng) return;
    if (!measureMode) toggleMeasure();
    addMeasurePoint(_ctxLatLng);
    closeMenu();
  });

  document.getElementById("ctx-zoom-in")?.addEventListener("click",  () => { leafletMap.zoomIn();  closeMenu(); });
  document.getElementById("ctx-zoom-out")?.addEventListener("click", () => { leafletMap.zoomOut(); closeMenu(); });
}

/* ── Bookmarks ── */
const BOOKMARKS_KEY = "dc-map-bookmarks-v1";

function _loadBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || []; } catch { return []; }
}

function _saveBookmarks(list) {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list)); } catch {}
}

function renderBookmarksList() {
  const listEl = document.getElementById("bookmarks-list");
  if (!listEl) return;
  const bmarks = _loadBookmarks();
  if (!bmarks.length) {
    listEl.innerHTML = `<div class="bookmarks-empty">No saved views yet.<br>Navigate somewhere and tap "Save current view".</div>`;
    return;
  }
  listEl.innerHTML = "";
  bmarks.forEach((bm, idx) => {
    const row = document.createElement("div");
    row.className = "bookmark-row";
    row.innerHTML = `
      <button class="bookmark-go" title="Fly to this view">${escHtml(bm.name)}</button>
      <button class="bookmark-del" aria-label="Delete bookmark">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    row.querySelector(".bookmark-go").addEventListener("click", () => {
      leafletMap.flyTo([bm.lat, bm.lng], bm.zoom, { duration: 0.9 });
      showMapToast(`Flew to "${bm.name}"`);
    });
    row.querySelector(".bookmark-del").addEventListener("click", () => {
      _saveBookmarks(_loadBookmarks().filter((_, i) => i !== idx));
      renderBookmarksList();
    });
    listEl.appendChild(row);
  });
}

function saveCurrentViewAsBookmark() {
  const c    = leafletMap.getCenter();
  const zoom = leafletMap.getZoom();
  const bmarks = _loadBookmarks();
  const d = new Date();
  const name = `${d.toLocaleDateString("en-US",{month:"short",day:"numeric"})} z${zoom}`;
  bmarks.push({ name, lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4), zoom });
  _saveBookmarks(bmarks);
  renderBookmarksList();
  showMapToast(`Saved "${name}"`);
}

function toggleBookmarks() {
  bookmarksVisible = !bookmarksVisible;
  const panel = document.getElementById("bookmarks-panel");
  const btn   = document.getElementById("gis-bookmarks");
  if (panel) panel.hidden = !bookmarksVisible;
  if (btn)   { btn.classList.toggle("active", bookmarksVisible); btn.setAttribute("aria-pressed", String(bookmarksVisible)); }
  if (bookmarksVisible) renderBookmarksList();
}

function initBookmarks() {
  document.getElementById("gis-bookmarks")    ?.addEventListener("click", toggleBookmarks);
  document.getElementById("bookmarks-close")  ?.addEventListener("click", toggleBookmarks);
  document.getElementById("bookmark-save-btn")?.addEventListener("click", saveCurrentViewAsBookmark);
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

  // Scale bar (imperial + metric) — standard GIS element
  L.control.scale({ imperial: true, metric: true, position: "bottomleft" }).addTo(leafletMap);

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

  leafletMap.on("click", e => {
    if (isDraggingMap || Date.now() < suppressClickUntil) return;
    if (measureMode)      { addMeasurePoint(e.latlng); return; }
    if (drawMode)         { drawPoints.push(e.latlng); _redrawPolygonPreview(); return; }
    if (candidatePinMode) { _placeCandidatePin(e.latlng); return; }
    if (selectedFips && countyLayerByFips[selectedFips]) {
      countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
    }
    selectedFips = null;
    setDetailEmpty();
  });

  leafletMap.on("dblclick", e => {
    if (!drawMode) return;
    // The preceding single-click already pushed a point; remove it so dblclick closes cleanly
    if (drawPoints.length > 0) drawPoints.pop();
    _closeDrawPolygon();
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

  // Coordinate display — updates on mouse move (desktop)
  const coordEl = document.getElementById("coord-display");
  if (coordEl) {
    leafletMap.on("mousemove", e => {
      const lat = Math.abs(e.latlng.lat).toFixed(4);
      const lng = Math.abs(e.latlng.lng).toFixed(4);
      coordEl.textContent = `${lat}°${e.latlng.lat >= 0 ? "N" : "S"}  ${lng}°${e.latlng.lng >= 0 ? "E" : "W"}`;
    });
    leafletMap.on("mouseout", () => { coordEl.textContent = ""; });
  }

  // GIS toolbar button wiring
  document.getElementById("gis-fullscreen")    ?.addEventListener("click", toggleFullscreen);
  document.getElementById("gis-locate")        ?.addEventListener("click", locateMe);
  document.getElementById("gis-zoom-filtered") ?.addEventListener("click", zoomToFiltered);
  document.getElementById("gis-measure")       ?.addEventListener("click", toggleMeasure);
  document.getElementById("gis-draw")          ?.addEventListener("click", toggleDraw);
  document.getElementById("gis-pin")           ?.addEventListener("click", toggleCandidatePin);
  document.getElementById("gis-export")        ?.addEventListener("click", exportCountiesCSV);
  document.getElementById("gis-share")         ?.addEventListener("click", shareCurrentView);
  document.getElementById("gis-print")         ?.addEventListener("click", printMap);
  document.getElementById("gis-minimap")       ?.addEventListener("click", toggleMinimap);
  document.getElementById("gis-political-risk")?.addEventListener("click", togglePoliticalRiskLayer);
  document.getElementById("gis-results")        ?.addEventListener("click", () => window.RESULTS_PANEL?.toggle());
  const _clearBtn = document.getElementById("measure-clear-btn");
  if (_clearBtn) {
    const _doClear = () => {
      if (measureMode) toggleMeasure(); // turns off mode + calls clearMeasure internally
      else clearMeasure();              // mode already off, just clear points
      // Belt-and-suspenders: force-hide readout on iOS where hidden attr can lag
      const readout = document.getElementById("measure-readout");
      if (readout) readout.hidden = true;
    };
    _clearBtn.addEventListener("click", _doClear);
    // iOS Safari: grab touchstart first so Leaflet's map-container listener never
    // sees the gesture; then confirm the action on touchend.
    _clearBtn.addEventListener("touchstart", e => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    _clearBtn.addEventListener("touchend",   e => { e.preventDefault(); e.stopPropagation(); _doClear(); }, { passive: false });
  }
  // Prevent Leaflet from intercepting pointer/touch events on the measure readout
  const _readoutEl = document.getElementById("measure-readout");
  if (_readoutEl) L.DomEvent.disableClickPropagation(_readoutEl);

  // Draw readout — unit toggle + clear button
  const _drawReadoutEl = document.getElementById('draw-readout');
  if (_drawReadoutEl) {
    _drawReadoutEl.querySelectorAll('.draw-unit-opt').forEach(unitBtn => {
      unitBtn.classList.toggle('active', unitBtn.dataset.unit === drawAreaUnit);
      unitBtn.addEventListener('click', () => {
        drawAreaUnit = unitBtn.dataset.unit;
        try { localStorage.setItem('draw-area-unit', drawAreaUnit); } catch (_) {}
        _drawReadoutEl.querySelectorAll('.draw-unit-opt').forEach(b => b.classList.toggle('active', b === unitBtn));
        _updateDrawReadout();
      });
    });
    L.DomEvent.disableClickPropagation(_drawReadoutEl);
  }
  const _drawClearBtn = document.getElementById('draw-clear-btn');
  if (_drawClearBtn) {
    const _doClearDraw = () => {
      if (drawMode) toggleDraw();
      clearDraw();
      _clearCandidatePin();
      _exitCandidatePinMode();
      const el = document.getElementById('draw-readout');
      if (el) el.hidden = true;
    };
    _drawClearBtn.addEventListener('click', _doClearDraw);
    _drawClearBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    _drawClearBtn.addEventListener('touchend',   e => { e.preventDefault(); e.stopPropagation(); _doClearDraw(); }, { passive: false });
  }

  // Fullscreen state sync
  document.addEventListener("fullscreenchange", () => {
    const btn  = document.getElementById("gis-fullscreen");
    const isFs = !!document.fullscreenElement;
    if (btn) { btn.classList.toggle("active", isFs); btn.setAttribute("aria-pressed", String(isFs)); }
    setTimeout(() => leafletMap && leafletMap.invalidateSize({ animate: false }), 100);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", e => {
    if (!leafletMap) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey) toggleMeasure();
    if ((e.key === "d" || e.key === "D") && !e.ctrlKey && !e.metaKey) toggleDraw();
    if ((e.key === "p" || e.key === "P") && !e.ctrlKey && !e.metaKey) toggleCandidatePin();
    if ((e.key === "l" || e.key === "L") && !e.ctrlKey && !e.metaKey) window.RESULTS_PANEL?.toggle();
    if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) toggleFullscreen();
    if (e.key === "Escape" && measureMode)      toggleMeasure();
    if (e.key === "Escape" && drawMode)         toggleDraw();
    if (e.key === "Escape" && candidatePinMode) toggleCandidatePin();
  });

  initContextMenu();
  initBookmarks();

  // Prevent Leaflet from intercepting touch/click events on all map overlay elements.
  // Without this, Leaflet's touchstart handler on the map can swallow taps on
  // absolutely-positioned controls on iOS Safari.
  [
    "map-gis-bar", "measure-readout", "draw-readout", "bookmarks-panel", "map-ctx-menu",
    "minimap-wrap", "legend", "legend-restore", "stats-bar", "filter-status",
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) L.DomEvent.disableClickPropagation(el);
  });
  // Prevent scroll-wheel/pinch inside overlay panels from zooming the map
  ["bookmarks-list", "legend"].forEach(id => {
    const el = document.getElementById(id);
    if (el) L.DomEvent.disableScrollPropagation(el);
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
    const chip = document.createElement("button");
    chip.className = "stat-chip" + (activeRestrictFilters.has(key) ? " active" : "");
    chip.dataset.key    = key;
    chip.dataset.statSev = key;
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
  activeTypeFilters.clear();
  activeStatusFilters.clear();
  _saveFilterState();
  applyFilters();
  syncAdvancedFilterUI();
}

function _saveFilterState() {
  try {
    localStorage.setItem("dc-advanced-filters-v1", JSON.stringify({
      restrict: [...activeRestrictFilters],
      state:    activeStateFilter,
      types:    [...activeTypeFilters],
      typeMode: typeFilterMode,
      status:   [...activeStatusFilters],
    }));
  } catch (_) {}
}

function _loadFilterState() {
  try {
    const raw = localStorage.getItem("dc-advanced-filters-v1");
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Array.isArray(s.restrict)) s.restrict.forEach(k => activeRestrictFilters.add(k));
    if (typeof s.state === "string") activeStateFilter = s.state;
    if (Array.isArray(s.types))   s.types.forEach(t => activeTypeFilters.add(t));
    if (s.typeMode === "all" || s.typeMode === "any") typeFilterMode = s.typeMode;
    if (Array.isArray(s.status))  s.status.forEach(t => activeStatusFilters.add(t));
  } catch (_) {}
}

function applyFilters() {
  _saveFilterState();
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
  window.RESULTS_PANEL?.update(mapData, fips => !hasActiveMapFilters() || countyMatchesFilters(fips));
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
  if (activeTypeFilters.size > 0) {
    const modeLabel = typeFilterMode === "all" ? "ALL of" : "";
    const typeLabels = [...activeTypeFilters].map(t => TYPE_LABELS[t] || t).join(", ");
    parts.push(modeLabel ? `${modeLabel}: ${typeLabels}` : typeLabels);
  }
  if (activeStatusFilters.size > 0) {
    const stLabels = [...activeStatusFilters].map(s => STATUS_LABELS[s] || s).join(", ");
    parts.push(stLabels);
  }

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

  if (showPoliticalRisk) {
    const rh = document.createElement("h3");
    rh.textContent = "Political Risk Scale";
    legendBody.appendChild(rh);
    const riskItems = [
      { score: 1, label: "Very Favorable",       color: RISK_COLORS[1] },
      { score: 2, label: "Mostly Favorable",      color: RISK_COLORS[2] },
      { score: 3, label: "Mixed / Neutral",       color: RISK_COLORS[3] },
      { score: 4, label: "Elevated Risk",         color: RISK_COLORS[4] },
      { score: 5, label: "High Political Risk",   color: RISK_COLORS[5] },
    ];
    for (const ri of riskItems) {
      const el = document.createElement("div");
      el.className = "legend-item";
      el.innerHTML = `
        <div class="legend-swatch" style="background:${ri.color};"></div>
        <div>
          <div class="legend-label-main">${ri.score} — ${ri.label}</div>
        </div>`;
      legendBody.appendChild(el);
    }
    const rd = document.createElement("div");
    rd.style.cssText = "border-top:1px solid var(--border); margin:8px 0;";
    legendBody.appendChild(rd);
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
      const reg   = (window.LAYER_REGISTRY || []).find(r => r.id === key);
      const statusCfg = reg ? _dataStatusConfig(reg.data_status) : null;
      const statusBadge = statusCfg
        ? `<span class="ds-badge ds-${reg.data_status}" title="${escHtml(statusCfg.title)}" style="margin-left:auto;">${statusCfg.label}</span>`
        : "";
      const el    = document.createElement("div");
      el.className = "legend-item";
      el.style.cssText = "display:flex;align-items:center;gap:6px;";
      el.innerHTML = `${legendSwatchHtml(entry)}<div class="legend-label-main" style="flex:1;">${entry.label}</div>${statusBadge}`;
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

/* ── Filter Panel helpers ── */

function _loadLayerGroupState() {
  try {
    const raw = localStorage.getItem("dc-layer-groups-v1");
    if (raw) _layerGroupState = JSON.parse(raw);
  } catch (_) {}
}

function _saveLayerGroupState() {
  try {
    localStorage.setItem("dc-layer-groups-v1", JSON.stringify(_layerGroupState));
  } catch (_) {}
}

function _dataStatusConfig(status) {
  const cfg = {
    verified:    { label: "Verified",   title: "Verified from official or authoritative sources" },
    partial:     { label: "Partial",    title: "Partially verified — city-level accuracy, some estimates" },
    estimated:   { label: "Estimated",  title: "Algorithmically estimated — not officially verified" },
    sample:      { label: "Sample",     title: "Sample / demonstration data — not for production use" },
    unavailable: { label: "No Data",    title: "No data available for this layer yet" },
    stale:       { label: "Stale",      title: "Data may be out of date" },
  };
  return cfg[status] || cfg.unavailable;
}

/* In-place show/hide of rows and groups based on _layerSearch.
 * Called on every search-input keystroke — never re-renders the panel. */
function _applyLayerSearch() {
  const q = _layerSearch.toLowerCase();
  const body = document.getElementById("filter-panel-body");
  if (!body) return;
  const searching = !!q;
  let anyResultShown = false;

  body.querySelectorAll(".filter-group-header").forEach(header => {
    const groupBody = header.nextElementSibling;
    if (!groupBody || !groupBody.classList.contains("filter-group-body")) return;

    if (!searching) {
      // Clear search overrides — CSS class (.collapsed or not) governs again
      header.style.display = "";
      groupBody.style.display = "";
      groupBody.querySelectorAll(".filter-row").forEach(row => { row.style.display = ""; });
      const totalRows = groupBody.querySelectorAll(".filter-row").length;
      const countEl = header.querySelector(".filter-group-count");
      if (countEl) countEl.textContent = totalRows;
      return;
    }

    // Searching: show rows that match, hide the rest
    let visibleInGroup = 0;
    groupBody.querySelectorAll(".filter-row").forEach(row => {
      const label = (row.dataset.layerLabel || "").toLowerCase();
      const show = label.includes(q);
      row.style.display = show ? "" : "none";
      if (show) { visibleInGroup++; anyResultShown = true; }
    });

    if (visibleInGroup > 0) {
      header.style.display = "";
      // Force-show group body even if it is in collapsed state
      groupBody.style.display = "block";
      const countEl = header.querySelector(".filter-group-count");
      if (countEl) countEl.textContent = visibleInGroup;
    } else {
      header.style.display = "none";
      groupBody.style.display = "none";
    }
  });

  // No-results message
  let emptyEl = body.querySelector(".layer-search-empty");
  if (searching && !anyResultShown) {
    if (!emptyEl) {
      emptyEl = document.createElement("div");
      emptyEl.className = "layer-search-empty";
      body.appendChild(emptyEl);
    }
    emptyEl.textContent = `No layers match "${q}"`;
    emptyEl.style.display = "";
  } else if (emptyEl) {
    emptyEl.style.display = "none";
  }
}

/* ── Filter Panel ── */
function renderFilterPanel() {
  const body = document.getElementById("filter-panel-body");
  body.innerHTML = "";

  // ── Basemap chips ──
  const bmLabel = document.createElement("div");
  bmLabel.className = "filter-group-label";
  bmLabel.textContent = "Basemap";
  body.appendChild(bmLabel);

  const bmRow = document.createElement("div");
  bmRow.className = "basemap-chips";
  ["standard", "satellite", "hybrid", "terrain"].forEach(type => {
    const btn = document.createElement("button");
    btn.className = "basemap-chip" + (activeTile === type ? " active" : "");
    btn.dataset.basemap = type;
    btn.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    btn.addEventListener("click", () => switchBasemap(type));
    bmRow.appendChild(btn);
  });
  body.appendChild(bmRow);

  // ── County fill opacity slider ──
  const opLabel = document.createElement("div");
  opLabel.className = "filter-group-label";
  opLabel.textContent = "County Fill Opacity";
  body.appendChild(opLabel);

  const opRow = document.createElement("div");
  opRow.className = "opacity-slider-row";
  const pct = Math.round(countyFillOpacity * 100);
  opRow.innerHTML = `
    <input type="range" id="county-opacity-slider" min="0" max="100" value="${pct}" step="5" aria-label="County fill opacity">
    <span id="county-opacity-val">${pct}%</span>`;
  body.appendChild(opRow);

  opRow.querySelector("#county-opacity-slider").addEventListener("input", function() {
    countyFillOpacity = this.value / 100;
    const valEl = document.getElementById("county-opacity-val");
    if (valEl) valEl.textContent = this.value + "%";
    if (countyGeoLayer) {
      countyGeoLayer.setStyle(countyStyle);
      if (selectedFips && countyLayerByFips[selectedFips]) {
        countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
      }
    }
  });

  // ── Layer search ──
  const searchWrap = document.createElement("div");
  searchWrap.className = "layer-search-wrap";

  const searchIcon = document.createElement("span");
  searchIcon.className = "layer-search-icon";
  searchIcon.setAttribute("aria-hidden", "true");
  searchIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5"/><line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "layer-search-input";
  searchInput.id = "layer-search-input";
  searchInput.placeholder = "Search layers…";
  searchInput.value = _layerSearch;
  searchInput.setAttribute("autocomplete", "off");
  searchInput.setAttribute("spellcheck", "false");
  searchInput.setAttribute("aria-label", "Search layers");

  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInput);
  body.appendChild(searchWrap);

  const onSearchChange = () => {
    _layerSearch = searchInput.value.trim();
    _applyLayerSearch();
  };
  searchInput.addEventListener("input", onSearchChange);
  // "search" event fires when the native × button clears the field
  searchInput.addEventListener("search", onSearchChange);

  // ── Layer groups ──
  const groups = [];
  for (const def of LAYER_DEFS) {
    let g = groups.find(x => x.name === def.group);
    if (!g) { g = { name: def.group, items: [] }; groups.push(g); }
    g.items.push(def);
  }

  for (const group of groups) {
    const expanded = _layerGroupState[group.name] !== false; // default: expanded

    // Group header (replaces plain .filter-group-label; now interactive)
    const header = document.createElement("div");
    header.className = "filter-group-header";
    header.dataset.groupName = group.name;
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", String(expanded));
    header.setAttribute("aria-label", `${group.name} layers`);

    const nameSpan = document.createElement("span");
    nameSpan.className = "filter-group-name";
    nameSpan.textContent = group.name;

    const countSpan = document.createElement("span");
    countSpan.className = "filter-group-count";
    countSpan.textContent = group.items.length;

    const caretSpan = document.createElement("span");
    caretSpan.className = "filter-group-caret" + (expanded ? " expanded" : "");
    caretSpan.setAttribute("aria-hidden", "true");
    caretSpan.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,3 5,7 8,3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    header.appendChild(nameSpan);
    header.appendChild(countSpan);
    header.appendChild(caretSpan);
    body.appendChild(header);

    // Group body — collapsible container
    const groupBody = document.createElement("div");
    groupBody.className = "filter-group-body" + (expanded ? "" : " collapsed");
    body.appendChild(groupBody);

    const toggleGroup = () => {
      const nowExpanded = _layerGroupState[group.name] !== false;
      _layerGroupState[group.name] = !nowExpanded;
      _saveLayerGroupState();
      header.setAttribute("aria-expanded", String(!nowExpanded));
      caretSpan.classList.toggle("expanded", !nowExpanded);
      groupBody.classList.toggle("collapsed", nowExpanded);
    };
    header.addEventListener("click", toggleGroup);
    header.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(); }
    });

    // Layer rows
    for (const def of group.items) {
      const statusCfg = _dataStatusConfig(def.data_status);

      const row = document.createElement("label");
      row.className = "filter-row" + (def.noData ? " filter-row-disabled" : "");
      row.dataset.layerLabel = def.label; // used by _applyLayerSearch

      // Left side: dot + text stack + status badge
      const labelSpan = document.createElement("span");
      labelSpan.className = "filter-row-label";

      const dot = document.createElement("span");
      dot.className = "filter-row-dot";
      dot.style.background = def.color;

      const textSpan = document.createElement("span");
      textSpan.className = "filter-row-text";

      const nameEl = document.createElement("span");
      nameEl.className = "name";
      nameEl.textContent = def.label;
      textSpan.appendChild(nameEl);

      if (def.source_name) {
        const sourceEl = document.createElement("span");
        sourceEl.className = "layer-source-line";
        sourceEl.textContent = def.source_name;
        textSpan.appendChild(sourceEl);
      }

      const badge = document.createElement("span");
      badge.className = `ds-badge ds-${def.data_status || "unavailable"}`;
      badge.textContent = statusCfg.label;
      badge.title = statusCfg.title;

      labelSpan.appendChild(dot);
      labelSpan.appendChild(textSpan);
      labelSpan.appendChild(badge);

      // Right side: toggle switch
      const toggleSwitch = document.createElement("span");
      toggleSwitch.className = "toggle-switch";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.layer = def.id;
      if (layerState[def.id]) checkbox.checked = true;
      if (def.noData) checkbox.disabled = true;
      const slider = document.createElement("span");
      slider.className = "toggle-slider";
      toggleSwitch.appendChild(checkbox);
      toggleSwitch.appendChild(slider);

      row.appendChild(labelSpan);
      row.appendChild(toggleSwitch);

      if (!def.noData) {
        const handleToggle = () => {
          const newState = !checkbox.checked;
          checkbox.checked = newState;
          setLayerVisible(def.id, newState);
        };
        // iOS Safari doesn't forward label taps to wrapped inputs when
        // -webkit-user-select:none is set on the label. Use touchend directly.
        row.addEventListener("touchend", e => {
          handleToggle();
          e.preventDefault(); // suppress the synthetic click that would double-fire
        }, { passive: false });
        // Desktop: e.preventDefault() stops the browser's native label→input
        // click-forwarding, which would otherwise fire handleToggle twice.
        row.addEventListener("click", e => {
          if (e.defaultPrevented) return;
          e.preventDefault();
          handleToggle();
        });
      }

      groupBody.appendChild(row);
    }
  }

  // Apply any active search filter (in case the panel was re-rendered mid-search)
  if (_layerSearch) _applyLayerSearch();
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

/* ── Detail sheet swipe-to-dismiss ── */
function initDetailSheetSwipe() {
  const panel  = document.getElementById("detail-panel");
  const handle = document.getElementById("detail-panel-handle");
  const header = document.getElementById("detail-header");
  if (!panel || !handle || !header) return;

  // Selector for elements that should handle their own taps (not start a drag).
  const INTERACTIVE = "a, button, input, select, textarea, [role='button'], [role='link'], .source-gov-badge";

  let dragging = false, startY = 0, startTime = 0, curDY = 0;

  function tryStart(y, target) {
    if (!panel.classList.contains("sheet-open")) return;
    if (_sheetClosing) return;
    if (target !== handle && target.closest(INTERACTIVE)) return;
    // When expanded the content scrolls normally — restrict dismiss drag to the handle.
    if (panel.classList.contains("sheet-expanded") && target !== handle) return;
    dragging   = true;
    startY     = y;
    startTime  = Date.now();
    curDY      = 0;
    panel.classList.add("is-dragging");
    panel.style.willChange = "transform";
  }

  function onMove(y) {
    if (!dragging) return;
    const raw = y - startY;
    if (raw < 0) {
      // Upward: apply light resistance; no movement if already fully expanded.
      curDY = panel.classList.contains("sheet-expanded") ? 0 : raw * 0.3;
    } else {
      curDY = raw;
    }
    panel.style.transform = `translateY(${curDY}px)`;
  }

  function onEnd(y) {
    if (!dragging) return;
    dragging = false;
    const raw      = y - startY;
    const elapsed  = Math.max(1, Date.now() - startTime);
    const velocity = raw / elapsed; // positive = down, negative = up

    panel.classList.remove("is-dragging");
    panel.style.willChange = "";

    const shouldDismiss = raw > 80 || velocity > 0.35;
    const shouldExpand  = !panel.classList.contains("sheet-expanded") && (raw < -80 || velocity < -0.35);

    if (shouldDismiss) {
      // Animate the panel downward, then run the full close logic.
      _sheetClosing = true;
      const panelH  = panel.getBoundingClientRect().height || window.innerHeight;
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = prefersReduced ? 10 : 260;
      panel.style.transition = `transform ${duration}ms ease-out`;
      panel.style.transform  = `translateY(${panelH + 20}px)`;
      setTimeout(() => {
        panel.style.transition = "none";
        panel.style.transform  = "";
        _sheetClosing = false;
        requestCloseDetailSheet();
      }, duration);
    } else if (shouldExpand) {
      // Snap to full-screen: clear inline styles so the CSS transition handles height.
      panel.style.transition = "";
      panel.style.transform  = "";
      panel.classList.add("sheet-expanded");
      document.documentElement.style.setProperty("--sheet-top", "0px");
    } else {
      // Snap back to current state.
      panel.style.transition = "transform 0.24s ease-out";
      panel.style.transform  = "translateY(0)";
      setTimeout(() => {
        panel.style.transition = "";
        panel.style.transform  = "";
      }, 240);
    }
  }

  function onCancel(y) { onEnd(y ?? startY + curDY); }

  // Attach to both handle and header so the user can drag from either.
  handle.addEventListener("touchstart", e => tryStart(e.touches[0].clientY, e.target), { passive: true });
  header.addEventListener("touchstart", e => tryStart(e.touches[0].clientY, e.target), { passive: true });

  // Move and end are on the panel so the gesture tracks even if the finger
  // moves outside the handle/header during a fast drag.
  panel.addEventListener("touchmove",   e => { if (dragging) onMove(e.touches[0].clientY); },   { passive: true });
  panel.addEventListener("touchend",    e => onEnd(e.changedTouches[0].clientY),                { passive: true });
  panel.addEventListener("touchcancel", e => onCancel(e.changedTouches[0]?.clientY),            { passive: true });
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

  // X button: single reliable close path that also clears county/facility selection.
  if (detailClose) {
    detailClose.addEventListener("click", requestCloseDetailSheet);
    // iOS Safari needs explicit touchstart+touchend to beat Leaflet's map gesture capture.
    detailClose.addEventListener("touchstart", e => { e.stopPropagation(); }, { passive: false });
    detailClose.addEventListener("touchend",   e => { e.preventDefault(); e.stopPropagation(); requestCloseDetailSheet(); }, { passive: false });
  }

  // Swipe-to-dismiss is initialised separately via initDetailSheetSwipe() (called from init).

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

  // ── Legend drag ──
  let lgDragging = false, lgDragStartX, lgDragStartY, lgDragStartLeft, lgDragStartTop;

  legend.addEventListener("pointerdown", e => {
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
    const tag  = card.sample ? `<span class="ds-badge ds-partial" style="margin-left:6px;" title="Partially verified — pipeline-populated, capacity figures are estimates">Partial</span>` : "";
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

// True when the layout is in mobile bottom-sheet mode.
function isMobileSheet() { return window.innerWidth <= 700; }

// Keeps closeMobileSheet from double-firing during an animated swipe dismissal.
let _sheetClosing = false;

function openMobileSheet() {
  const p = document.getElementById("detail-panel");
  if (!p) return;
  _sheetClosing = false;
  // Clear any inline styles left from a swipe gesture so the CSS transition takes over.
  p.style.transform  = "";
  p.style.transition = "";
  p.style.willChange = "";
  p.classList.remove("is-dragging", "is-closing", "sheet-expanded");
  p.classList.add("sheet-open");
  document.body.classList.add("detail-sheet-open");
  // Set --sheet-top after the CSS transition settles so the toolbar clip is accurate.
  if (isMobileSheet()) {
    const vh = window.innerHeight;
    // Estimate immediately for a quick first clip, then refine after transition.
    document.documentElement.style.setProperty("--sheet-top", Math.round(vh * 0.28) + "px");
    setTimeout(() => {
      const r = document.getElementById("detail-panel")?.getBoundingClientRect();
      if (r && r.top > 0) document.documentElement.style.setProperty("--sheet-top", Math.round(r.top) + "px");
    }, 300);
  }
}

function closeMobileSheet() {
  if (_sheetClosing) return;
  const p = document.getElementById("detail-panel");
  if (!p) return;
  p.classList.remove("sheet-open", "is-dragging", "is-closing", "sheet-expanded");
  p.style.transform  = "";
  p.style.transition = "";
  p.style.willChange = "";
  document.body.classList.remove("detail-sheet-open");
  document.documentElement.style.removeProperty("--sheet-top");
}

// Single reliable close path for the X button and swipe gesture.
// Clears county/facility selection state in addition to hiding the sheet.
function requestCloseDetailSheet() {
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
  }
  selectedFips = null;
  setDetailEmpty(); // resets panel content and calls closeMobileSheet()
}

/* ── Spatial analysis helpers ── */

function _clearProximityCircle() {
  if (_proximityCircle && leafletMap) {
    leafletMap.removeLayer(_proximityCircle);
    _proximityCircle = null;
  }
}

function _setProximityCircle(center, radiusMiles) {
  _clearProximityCircle();
  if (!leafletMap || !radiusMiles) return;
  _proximityCircle = L.circle(center, {
    radius:      radiusMiles * 1609.34,
    color:       "#5b8def",
    weight:      1.5,
    opacity:     0.8,
    fillColor:   "#5b8def",
    fillOpacity: 0.06,
    dashArray:   "4,3",
  }).addTo(leafletMap);
}

function _buildNearbyFacilitiesHtml(fips, radiusMiles) {
  if (!sampleLayers) return "";
  const layer = countyLayerByFips[fips];
  if (!layer) return "";
  const center = layer.getBounds().getCenter();
  const maxDist = (radiusMiles || 100) * 1609.34;

  const candidates = [
    ...(sampleLayers.data_centers || [])
        .filter(f => f.lat && f.lon)
        .map(f => ({ name: f.name, lat: f.lat, lon: f.lon, kind: "dc", color: "#5b8def", cap: f.capacity_mw ? `${f.capacity_mw} MW` : "" })),
    ...(sampleLayers.ai_campuses || [])
        .filter(f => f.lat && f.lon)
        .map(f => ({ name: f.name, lat: f.lat, lon: f.lon, kind: "ai", color: "#a78bfa", cap: "" })),
  ];

  const nearby = candidates
    .map(f => ({ ...f, distM: L.latLng(f.lat, f.lon).distanceTo(center) }))
    .filter(f => f.distM <= maxDist)
    .sort((a, b) => a.distM - b.distM)
    .slice(0, 6);

  if (!nearby.length) {
    return `<div class="nearby-empty">No facilities within ${radiusMiles || 100} miles.</div>`;
  }

  const rows = nearby.map(f => {
    const miles = (f.distM / 1609.34).toFixed(0);
    const sub   = [f.cap, `${miles} mi`].filter(Boolean).join(" · ");
    return `<div class="nearby-row">
      <span class="nearby-dot" style="background:${f.color}"></span>
      <span class="nearby-name">${escHtml(f.name)}</span>
      <span class="nearby-dist">${escHtml(sub)}</span>
    </div>`;
  }).join("");

  return rows;
}

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

  const regFor = (id) => (window.LAYER_REGISTRY || []).find(r => r.id === id) || {};

  const _badge = (id) => {
    const r = regFor(id);
    const cfg = _dataStatusConfig(r.data_status);
    return `<span class="ds-badge ds-${r.data_status || "unavailable"}" title="${escHtml(cfg.title)}">${cfg.label}</span>`;
  };

  let html = `<div class="divider"></div>`;

  if (facilities.length) {
    const dcReg = regFor("dc_existing");
    html += `
    <div class="detail-section">
      <div class="detail-label">Infrastructure ${_badge("dc_existing")}</div>
      <div class="detail-value">${facilities.map(f => `${escHtml(f.name)} — ${f.capacity_mw} MW (${f.status})`).join("<br>")}</div>
      ${dcReg.disclaimer ? `<div class="layer-data-disclaimer">${escHtml(dcReg.disclaimer)}</div>` : ""}
    </div>`;
  }

  const operators = [...new Set([...facilities, ...campuses].map(f => f.operator))];
  if (operators.length) html += `
    <div class="detail-section">
      <div class="detail-label">Major Operators</div>
      <div class="type-chips">${operators.map(o => `<span class="type-chip">${escHtml(o)}</span>`).join("")}</div>
    </div>`;

  if (campuses.length) {
    const acReg = regFor("ai_campus");
    html += `
    <div class="detail-section">
      <div class="detail-label">AI Campuses ${_badge("ai_campus")}</div>
      <div class="detail-value">${campuses.map(c => escHtml(c.name)).join("<br>")}</div>
      ${acReg.disclaimer ? `<div class="layer-data-disclaimer">${escHtml(acReg.disclaimer)}</div>` : ""}
    </div>`;
  }

  if (wLevel !== undefined || hasTax || utility) {
    html += `
    <div class="detail-section">
      <div class="detail-label">Site Factors <span class="ds-badge ds-estimated" title="Algorithmically estimated — not officially verified">Estimated</span></div>
      <div class="detail-value">
        ${wLevel !== undefined ? `Water availability: ${WATER_STRESS_LABELS[wLevel]}<br>` : ""}
        ${utility ? `Utility territory: ${escHtml(utility.name)}<br>` : ""}
        ${hasTax ? "Tax incentive area: Yes" : ""}
      </div>
      <div class="layer-data-disclaimer">Site factor data is algorithmically estimated and has not been independently verified.</div>
    </div>`;
  }

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

const _RISK_SIGNAL_WEIGHT_TIER = {
  ban_enacted: "w-high", moratorium_enacted: "w-high", moratorium_proposed: "w-high",
  draft_ordinance: "w-med", public_hearing_opposition: "w-med", organized_campaign: "w-med",
  election_issue: "w-med", large_petition: "w-med",
  small_petition: "w-low", advocacy_group_active: "w-low", planning_commission_study: "w-low",
  water_concern_official: "w-low", grid_concern_official: "w-low",
  news_opposition: "w-low", public_comment_opposition: "w-low", environmental_group: "w-low",
  tax_incentive_enacted: "w-favor", economic_dev_support: "w-favor",
  council_pro_vote: "w-favor", state_incentive_program: "w-favor", dedicated_zoning_created: "w-favor",
};

function buildPoliticalRiskSectionHtml(fips) {
  const rec = politicalRiskData[fips];
  const RISK_LABELS = {1:"Very Favorable", 2:"Mostly Favorable", 3:"Mixed/Neutral", 4:"Elevated Political Risk", 5:"High Political Risk"};
  if (!rec) {
    return `<div class="risk-section">
      <div class="risk-section-header">
        <span class="risk-section-title">Political Risk</span>
      </div>
      <p class="risk-no-data">No documented political risk signals on record for this county.</p>
    </div>`;
  }
  const badge = `<span class="risk-score-badge risk-${rec.risk_score}">Score ${rec.risk_score} — ${escHtml(rec.score_label || RISK_LABELS[rec.risk_score] || "")}</span>`;
  const summary = rec.evidence_summary ? `<div class="risk-evidence-summary">${escHtml(rec.evidence_summary)}</div>` : "";
  const signals = (rec.signals || []).map(s => {
    const tier = _RISK_SIGNAL_WEIGHT_TIER[s.type] || "w-low";
    const dateStr = s.detected_date ? ` <span class="risk-signal-date">(${s.detected_date.slice(0,7)})</span>` : "";
    const linkPart = s.source_url ? ` <a href="${escHtml(s.source_url)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-size:10px;">source</a>` : "";
    return `<li class="risk-signal-item">
      <span class="risk-signal-dot ${tier}"></span>
      <span><span class="risk-signal-label">${escHtml(s.label || s.type)}</span>${dateStr} — ${escHtml(s.description || "")}${linkPart}</span>
    </li>`;
  }).join("");
  const confTag = rec.confidence ? `<span style="font-size:10px;color:var(--text-muted);margin-left:6px;">${rec.confidence} confidence</span>` : "";
  return `<div class="risk-section">
    <div class="risk-section-header">
      <span class="risk-section-title">Political Risk</span>
      <span class="ds-badge ds-estimated" title="Algorithmically estimated from documented political signals" style="margin-left:4px;">Estimated</span>
      ${confTag}
    </div>
    ${badge}
    ${summary}
    ${signals ? `<ul class="risk-signals-list" style="margin-top:6px;">${signals}</ul>` : ""}
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
  _clearProximityCircle();
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
  window.RESULTS_PANEL?.highlightFips(null);
}

function _renderProximitySectionForCounty(fips) {
  const placeholder = document.getElementById("detail-proximity-section");
  if (!placeholder) return;

  const layer = countyLayerByFips[fips];
  const center = layer ? layer.getBounds().getCenter() : null;

  function render(radius) {
    _proximityRadius = radius;
    if (center) _setProximityCircle(center, radius || 0);
    const radiusOpts = [0, 25, 50, 100];
    const chips = radiusOpts.map(r => {
      const label = r === 0 ? "Off" : `${r} mi`;
      return `<button class="spatial-radius-chip${r === radius ? " active" : ""}" data-radius="${r}">${label}</button>`;
    }).join("");
    const bodyHtml = radius > 0
      ? `<div class="nearby-facilities-list">${_buildNearbyFacilitiesHtml(fips, radius)}</div>`
      : "";
    placeholder.innerHTML = `
      <div class="divider"></div>
      <div class="detail-section">
        <div class="detail-label">Proximity Ring</div>
        <div class="spatial-radius-row">${chips}</div>
        ${bodyHtml}
      </div>`;
    placeholder.querySelectorAll(".spatial-radius-chip").forEach(btn => {
      btn.addEventListener("click", () => render(Number(btn.dataset.radius)));
    });
  }

  render(_proximityRadius);
}

async function _renderZoningSummaryForCounty(fips) {
  if (!window.ZONING?.hasCoverage(fips)) return;
  const placeholder = document.getElementById("detail-zoning-summary");
  if (!placeholder) return;

  placeholder.innerHTML = '<div class="zoning-summary-loading">Loading zoning data…</div>';

  let data;
  try {
    data = await window.ZONING.loadByFips(fips);
  } catch (_) {
    placeholder.innerHTML = '<div class="zoning-summary-error">Zoning data unavailable.</div>';
    return;
  }
  if (!data) { placeholder.innerHTML = ""; return; }

  const districts = data.districts || {};
  const rows = Object.values(districts).map(d => {
    const assess = window.ZONING.assessmentStyle(d.dc_analysis?.overall_assessment);
    const conf   = d.dc_analysis?.confidence_level || d.confidence_level || "low";
    return `<div class="zoning-summary-row">
      <code class="zoning-district-code">${escHtml(d.district_code)}</code>
      <span class="${assess.cls} zoning-assess-chip">${escHtml(assess.icon)} ${escHtml(assess.label)}</span>
      <span class="zoning-conf">${escHtml(conf)}</span>
    </div>`;
  }).join("");

  const disclaimer = data.disclaimer ||
    "Zoning information is provided for preliminary research only. Confirm all requirements with the controlling jurisdiction before relying on this information.";

  placeholder.innerHTML = `
    <div class="divider"></div>
    <div class="detail-section">
      <div class="detail-label">Zoning — DC Eligibility <span class="ds-badge ds-partial" title="Pilot coverage — partial district data">Partial</span></div>
      <div class="detail-value zoning-summary-table">${rows}</div>
      <div class="zoning-summary-disclaimer">${escHtml(disclaimer)}</div>
      <button class="zoning-open-btn">View full zoning details →</button>
    </div>`;

  placeholder.querySelector(".zoning-open-btn")?.addEventListener("click", () => {
    setLayerVisible("zoning_districts", true, true);
  });
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
    <div class="policy-divider"></div>
    ${buildPoliticalRiskSectionHtml(fips)}
    ${buildSampleInfraHtml(fips)}
    <div id="detail-proximity-section"></div>
    <div id="detail-zoning-summary"></div>`;
  openMobileSheet();
  _renderProximitySectionForCounty(fips);
  _renderZoningSummaryForCounty(fips);
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
    <div class="policy-divider"></div>
    ${fips ? buildPoliticalRiskSectionHtml(fips) : ""}
    ${fips ? buildSampleInfraHtml(fips) : ""}
    ${fips ? '<div id="detail-proximity-section"></div>' : ""}
    ${fips ? '<div id="detail-zoning-summary"></div>' : ""}`;
  openMobileSheet();
  if (fips) _renderProximitySectionForCounty(fips);
  if (fips) _renderZoningSummaryForCounty(fips);
}

const FACILITY_KIND_LABELS = {
  dc_existing: "Data Center — Existing",
  dc_planned:  "Data Center — Planned",
  ai_campus:   "AI Campus",
  power:       "Power Infrastructure",
};

function setDetailFacility(facility, kind) {
  /* ── Coordinate county outline selection ── */
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
  }
  selectedFips = facility.county_fips || null;
  if (selectedFips) {
    setLocationHash(selectedFips);
    if (countyLayerByFips[selectedFips]) {
      countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
      countyLayerByFips[selectedFips].bringToFront();
    }
  }

  setSevClass(null);
  document.getElementById("detail-header").querySelector("h2").textContent = facility.name;
  document.getElementById("detail-state").textContent = FACILITY_KIND_LABELS[kind] || "";
  const county = mapData[facility.county_fips];

  const reg = (window.LAYER_REGISTRY || []).find(r => r.id === kind) || {};
  const statusCfg = _dataStatusConfig(reg.data_status);
  const dataQualityHtml = reg.data_status ? `
    <div class="detail-section data-quality-notice">
      <div class="detail-label">Data Quality</div>
      <div class="detail-value">
        <span class="ds-badge ds-${reg.data_status}" title="${escHtml(statusCfg.title)}">${statusCfg.label}</span>
        ${reg.source_name ? `<span class="dq-source">${escHtml(reg.source_name)}</span>` : ""}
        ${reg.disclaimer  ? `<div class="layer-data-disclaimer">${escHtml(reg.disclaimer)}</div>` : ""}
      </div>
    </div>` : "";

  /* ── County context block ── */
  const countyContextHtml = county ? (() => {
    const sevKey   = getSeverityKey(county);
    const sevLabel = SEVERITY[sevKey].label;
    return `
    <div class="divider"></div>
    <div class="detail-section">
      <div class="detail-label">County Regulatory Context</div>
      <div class="detail-value" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span class="restriction-badge badge-${sevKey}" style="font-size:10px;padding:2px 7px;margin:0;">${escHtml(sevLabel)}</span>
        <span style="font-size:11px;color:var(--text-muted);">${escHtml(county.name)}, ${escHtml(county.state)}</span>
      </div>
      <button class="zoning-open-btn" data-action="view-county" data-fips="${escHtml(facility.county_fips)}" style="margin-top:6px;">View county details →</button>
    </div>`;
  })() : "";

  document.getElementById("detail-body").innerHTML = `
    ${facility.operator  ? `<div class="detail-section"><div class="detail-label">Operator</div><div class="detail-value">${escHtml(facility.operator)}</div></div>` : ""}
    ${facility.capacity_mw ? `<div class="detail-section"><div class="detail-label">Capacity</div><div class="detail-value">${facility.capacity_mw.toLocaleString("en-US")} MW</div></div>` : ""}
    ${facility.status    ? `<div class="detail-section"><div class="detail-label">Status</div><div class="detail-value" style="text-transform:capitalize;">${facility.status}</div></div>` : ""}
    ${facility.year_built   ? `<div class="detail-section"><div class="detail-label">Year Built</div><div class="detail-value">${facility.year_built}</div></div>` : ""}
    ${facility.year_planned ? `<div class="detail-section"><div class="detail-label">Target Year</div><div class="detail-value">${facility.year_planned}</div></div>` : ""}
    ${facility.type      ? `<div class="detail-section"><div class="detail-label">Type</div><div class="detail-value" style="text-transform:capitalize;">${facility.type}</div></div>` : ""}
    ${facility.notes     ? `<div class="detail-section"><div class="detail-label">Notes</div><div class="detail-value">${escHtml(facility.notes)}</div></div>` : ""}
    ${facility.sources && facility.sources.length ? `<div class="detail-section"><div class="detail-label">Sources</div><ul class="sources-list">${facility.sources.map(s => {
      if (s && typeof s === "object" && s.url) {
        const isGov = GOV_URL_RE.test(s.url);
        const govBadge = isGov ? `<span class="source-gov-badge">Gov</span>` : "";
        return `<li>${govBadge}<a href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escHtml(s.label)}</a></li>`;
      }
      return `<li>${escHtml(typeof s === "string" ? s : s.label || "")}</li>`;
    }).join("")}</ul></div>` : ""}
    ${dataQualityHtml}
    ${countyContextHtml}`;

  document.getElementById("detail-body").querySelector("[data-action='view-county']")
    ?.addEventListener("click", e => {
      selectCounty(e.currentTarget.dataset.fips);
    });

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
  const hash = window.location.hash.slice(1); // strip leading #

  // Share-view format: #@lat,lng,zoom  (set by shareCurrentView())
  const viewMatch = hash.match(/^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+)$/);
  if (viewMatch && leafletMap) {
    switchTab("map");
    leafletMap.setView([parseFloat(viewMatch[1]), parseFloat(viewMatch[2])], parseInt(viewMatch[3]));
    return false; // view restored but no county selected
  }

  // County FIPS permalink: #12345
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

/* ── Keyboard shortcut overlay ── */
function initKbOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "kb-overlay";
  overlay.className = "kb-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Keyboard shortcuts");
  overlay.innerHTML = `<div class="kb-modal">
    <div class="kb-modal-hdr">
      <span class="kb-modal-title">Keyboard Shortcuts</span>
      <button class="kb-close" id="kb-close-btn">Esc</button>
    </div>
    <div class="kb-section">Navigation</div>
    <div class="kb-row"><span class="kb-desc">Focus search</span><span class="kb-keys"><kbd>/</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Home tab</span><span class="kb-keys"><kbd>1</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Map tab</span><span class="kb-keys"><kbd>2</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">AI News tab</span><span class="kb-keys"><kbd>3</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">AI Stocks tab</span><span class="kb-keys"><kbd>4</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Analytics tab</span><span class="kb-keys"><kbd>5</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">About tab</span><span class="kb-keys"><kbd>6</kbd></span></div>
    <div class="kb-section">Map Tools</div>
    <div class="kb-row"><span class="kb-desc">Toggle fullscreen</span><span class="kb-keys"><kbd>F</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Toggle measure mode</span><span class="kb-keys"><kbd>M</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Toggle polygon draw</span><span class="kb-keys"><kbd>D</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Drop candidate site pin</span><span class="kb-keys"><kbd>P</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Toggle results panel</span><span class="kb-keys"><kbd>L</kbd></span></div>
    <div class="kb-section">General</div>
    <div class="kb-row"><span class="kb-desc">Show this help</span><span class="kb-keys"><kbd>?</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Close / dismiss</span><span class="kb-keys"><kbd>Esc</kbd></span></div>
  </div>`;
  document.body.appendChild(overlay);

  const closeOverlay = () => overlay.classList.remove("open");
  overlay.addEventListener("click", e => { if (e.target === overlay) closeOverlay(); });
  document.getElementById("kb-close-btn").addEventListener("click", closeOverlay);
  document.getElementById("kb-help-btn")?.addEventListener("click", () => overlay.classList.add("open"));

  return {
    open:  () => overlay.classList.add("open"),
    close: closeOverlay,
    isOpen: () => overlay.classList.contains("open"),
  };
}

/* ── Keyboard shortcuts ── */
function initKeyboardShortcuts() {
  const kbOverlay = initKbOverlay();
  const TAB_KEYS  = { "1": "home", "2": "map", "3": "news", "4": "stocks", "5": "analytics", "6": "about" };

  document.addEventListener("keydown", e => {
    const inField = e.target.matches("input, textarea, select, [contenteditable]");

    // Close overlay first on Escape regardless of context
    if (e.key === "Escape" && kbOverlay.isOpen()) { kbOverlay.close(); return; }

    // `/` focuses search
    if (e.key === "/" && !inField) {
      e.preventDefault();
      const searchInput = document.getElementById("search-input");
      if (searchInput) { searchInput.focus(); searchInput.select(); }
      return;
    }

    // `?` opens shortcut overlay
    if ((e.key === "?" || (e.key === "/" && e.shiftKey)) && !inField) {
      e.preventDefault();
      kbOverlay.open();
      return;
    }

    // 1–6 switch tabs
    if (TAB_KEYS[e.key] && !inField && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      switchTab(TAB_KEYS[e.key]);
      return;
    }

    if (e.key !== "Escape") return;
    // Escape: close panels / detail sheet
    const filterOpen = document.getElementById("filter-panel").classList.contains("open");
    const sheetOpen  = document.getElementById("detail-panel").classList.contains("sheet-open");
    if (filterOpen) {
      closeFilterPanel();
    } else if (sheetOpen || selectedFips) {
      requestCloseDetailSheet();
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
  window.RESULTS_PANEL?.highlightFips(fips);
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

  let kbIdx = -1;
  function highlightSearchItem(idx) {
    const items = results.querySelectorAll(".search-result-item");
    items.forEach((it, i) => it.classList.toggle("kb-active", i === idx));
    if (items[idx]) items[idx].scrollIntoView({ block: "nearest" });
    kbIdx = idx;
  }

  input.addEventListener("input", () => {
    kbIdx = -1;
    const q = input.value.trim().toLowerCase();
    if (!q) { results.style.display = "none"; return; }
    renderResults(index.filter(c => c.searchText.includes(q)).slice(0, 8));
  });
  input.addEventListener("focus", () => { if (input.value.trim()) input.dispatchEvent(new Event("input")); });
  input.addEventListener("blur",  () => { setTimeout(() => { results.style.display = "none"; kbIdx = -1; }, 100); });

  input.addEventListener("keydown", e => {
    const items = results.querySelectorAll(".search-result-item");
    if (e.key === "Escape") {
      input.value = "";
      results.style.display = "none";
      kbIdx = -1;
      input.blur();
      return;
    }
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightSearchItem(Math.min(kbIdx + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (kbIdx > 0) { highlightSearchItem(kbIdx - 1); }
      else { highlightSearchItem(-1); items.forEach(it => it.classList.remove("kb-active")); }
    } else if (e.key === "Enter" && kbIdx >= 0 && items[kbIdx]) {
      e.preventDefault();
      items[kbIdx].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    }
  });
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
  // Sync type chips
  document.querySelectorAll("#adv-type-chips .adv-chip").forEach(chip => {
    chip.classList.toggle("active", activeTypeFilters.has(chip.dataset.type));
  });
  // Sync type mode toggle
  document.querySelectorAll(".adv-mode-opt").forEach(opt => {
    opt.classList.toggle("active", opt.dataset.val === typeFilterMode);
  });
  // Sync status chips
  document.querySelectorAll("#adv-status-chips .adv-chip").forEach(chip => {
    chip.classList.toggle("active", activeStatusFilters.has(chip.dataset.status));
  });
  // Sync clear button visibility
  const clearBtn = document.getElementById("adv-filter-clear");
  if (clearBtn) clearBtn.hidden = !hasActiveMapFilters();
  // Sync adv-filter-toggle button + active count badge
  const advBtn = document.getElementById("adv-filter-toggle");
  if (advBtn) {
    advBtn.classList.toggle("active", hasActiveMapFilters());
    const filterCount = activeRestrictFilters.size + (activeStateFilter ? 1 : 0) +
                        activeTypeFilters.size + activeStatusFilters.size;
    if (filterCount > 0) advBtn.setAttribute("data-count", filterCount);
    else advBtn.removeAttribute("data-count");
  }
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

  // Policy type chips + AND/OR mode toggle
  const typeRow = document.getElementById("adv-type-chips");
  if (typeRow) {
    const typeDefs = [
      { key: "data_center", color: "#5b8def" },
      { key: "ai",          color: "#a78bfa" },
      { key: "crypto",      color: "#fbbf24" },
      { key: "energy",      color: "#34d399" },
      { key: "water",       color: "#60a5fa" },
    ];
    for (const def of typeDefs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "adv-chip" + (activeTypeFilters.has(def.key) ? " active" : "");
      btn.dataset.type = def.key;
      btn.innerHTML = `<span class="adv-chip-dot" style="background:${def.color}"></span>${TYPE_LABELS[def.key] || def.key}`;
      btn.addEventListener("click", () => {
        if (activeTypeFilters.has(def.key)) activeTypeFilters.delete(def.key);
        else activeTypeFilters.add(def.key);
        applyFilters();
      });
      typeRow.appendChild(btn);
    }
  }

  // AND/OR mode toggle for type filter
  const modeToggle = document.getElementById("adv-type-mode-toggle");
  if (modeToggle) {
    modeToggle.querySelectorAll(".adv-mode-opt").forEach(opt => {
      opt.addEventListener("click", () => {
        typeFilterMode = opt.dataset.val;
        applyFilters();
      });
    });
  }

  // Lifecycle status chips
  const statusRow = document.getElementById("adv-status-chips");
  if (statusRow) {
    const statusDefs = [
      { key: "active",   color: "#4ade80" },
      { key: "proposed", color: "#eab308" },
      { key: "pending",  color: "#f97316" },
    ];
    for (const def of statusDefs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "adv-chip" + (activeStatusFilters.has(def.key) ? " active" : "");
      btn.dataset.status = def.key;
      btn.innerHTML = `<span class="adv-chip-dot" style="background:${def.color}"></span>${STATUS_LABELS[def.key] || def.key}`;
      btn.addEventListener("click", () => {
        if (activeStatusFilters.has(def.key)) activeStatusFilters.delete(def.key);
        else activeStatusFilters.add(def.key);
        applyFilters();
      });
      statusRow.appendChild(btn);
    }
  }

  // Quick presets
  const presetsRow = document.getElementById("adv-presets");
  if (presetsRow) {
    const PRESETS = [
      { label: "Active Bans",      restrict: ["ban"],                status: ["active"],   types: [],           typeMode: "any" },
      { label: "High Risk Active", restrict: ["ban","high"],          status: ["active"],   types: [],           typeMode: "any" },
      { label: "Proposed Only",    restrict: ["proposed"],            status: ["proposed"], types: [],           typeMode: "any" },
      { label: "AI Rules",         restrict: [],                      status: [],           types: ["ai"],       typeMode: "any" },
    ];
    for (const preset of PRESETS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "adv-chip adv-preset-chip";
      btn.textContent = preset.label;
      btn.title = "Apply filter preset: " + preset.label;
      btn.addEventListener("click", () => {
        activeRestrictFilters.clear();
        preset.restrict.forEach(k => activeRestrictFilters.add(k));
        activeStateFilter = "";
        activeTypeFilters.clear();
        preset.types.forEach(t => activeTypeFilters.add(t));
        activeStatusFilters.clear();
        preset.status.forEach(s => activeStatusFilters.add(s));
        typeFilterMode = preset.typeMode;
        applyFilters();
      });
      presetsRow.appendChild(btn);
    }
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
    if (homeEl) { homeEl.hidden = false; triggerViewEnter(homeEl); }
    searchBar.classList.add("news-mode");
    if (typeof renderHomePage === "function") renderHomePage();
  } else if (tab === "news") {
    newsEl.hidden = false; triggerViewEnter(newsEl);
    searchBar.classList.add("news-mode");
    renderNews();
  } else if (tab === "stocks") {
    if (stocksEl) { stocksEl.hidden = false; triggerViewEnter(stocksEl); }
    searchBar.classList.add("news-mode");
    if (typeof initStocksPage === "function") initStocksPage();
  } else if (tab === "analytics") {
    if (analyticsEl) { analyticsEl.hidden = false; triggerViewEnter(analyticsEl); }
    searchBar.classList.add("news-mode");
    if (typeof renderAnalyticsPage === "function") renderAnalyticsPage();
  } else if (tab === "about") {
    if (aboutEl) { aboutEl.hidden = false; triggerViewEnter(aboutEl); }
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

function triggerViewEnter(el) {
  if (!el) return;
  el.classList.remove("view-enter");
  void el.offsetWidth;
  el.classList.add("view-enter");
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

  // Expose for cross-module use (account.js preferences tab)
  window._applyTheme = applyTheme;

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
  _loadLayerGroupState();
  _loadFilterState();
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
    const { data, sample, stateReg, newsData, riskByFips } = await loadCoreData();

    mapData           = data.counties || {};
    sampleLayers      = sample || null;
    stateRegData      = stateReg.states || {};
    newsArticles      = (newsData && newsData.articles) ? newsData.articles : [];
    politicalRiskData = riskByFips || {};

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
  window.MapWorkspace?.init();
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
