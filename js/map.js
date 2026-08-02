/* US Data Center & AI Restrictions Map — Leaflet Edition */

/* ── Severity model ── */
/* Severity colors + labels come from js/constants.js (single source of truth).
   Do not hardcode label text here — see docs/TERMINOLOGY.md. */
const SEVERITY = Object.fromEntries(
  Object.keys(window.SEVERITY_LABELS).map(k => [
    k, { color: window.SEVERITY_COLORS[k], label: window.SEVERITY_LABELS[k] },
  ])
);

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
  // Parcel view: the county-level choropleth fill has nothing to add once
  // you're looking at individual parcels, and at high opacity it washes out
  // both the satellite basemap and the parcel boundaries drawn on top of it.
  // Drop back to an outline-only highlight so parcel geometry stays legible.
  if (window.PARCEL?.isActiveWithData?.()) {
    return { color: themeColors().selectedOutline, weight: 2.5, fillOpacity: 0.04 };
  }
  return { color: themeColors().selectedOutline, weight: 2.5, fillOpacity: 0.92 };
}

/* Transient hover highlight. Same parcel-view reasoning as selectedCountyStyle():
   parcels render on their own pane ABOVE the county fill, but their own fill is
   only ~0.15 opaque, so an 0.88-opaque county fill underneath still washes them
   out — the parcels are on top and still unreadable. Hovering is the common case
   while panning around a parcel map, so without this the layer looks broken
   whenever the pointer is anywhere over the county. Keep the orange outline for
   hover feedback; drop only the fill. */
function hoverCountyStyle() {
  if (window.PARCEL?.isActiveWithData?.()) {
    return { color: "#f97316", weight: 2, fillOpacity: 0.04 };
  }
  return { color: "#f97316", weight: 2, fillOpacity: 0.88 };
}

/* LEVEL_LABELS is defined in js/constants.js and exposed on window. Aliased here
   so existing bare references keep working. */
const LEVEL_LABELS = window.LEVEL_LABELS;

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
window._STATE_NAMES = STATE_NAMES; // exposed for command-palette.js

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
let bookmarksVisible  = false;
let _wsVisible        = false;
let _scene3dVisible   = false;
const WS_LOCAL_KEY    = "dc-workspaces-local-v1";
const WS_MAX_LOCAL    = 10;
let compareMode       = false;
const compareCounties   = []; // array of fips strings
const compareFacilities = []; // array of pipeline facility objects
let countyFillOpacity = 1.0;

/* ── Draw / Pin tool state ── */
let drawMode         = false;
let drawPoints       = [];
let drawLayers       = [];
let drawAreaUnit     = (function(){ try { return localStorage.getItem('draw-area-unit') || 'mi2'; } catch(_){ return 'mi2'; } })();
let candidatePinMode = false;
let _candidatePin    = null;

/* ── Radius buffer tool state ── */
let radiusMode    = false;
let radiusCenter  = null;
let radiusLayers  = [];
let _radiusKm     = 16.09; // default 10 miles

/* ── Save button state ── */
let _savedCountySet   = new Set();
let _savedFacilitySet = new Set();
let _saveCurrentType  = null;
let _saveCurrentId    = null;
let _saveCurrentData  = null;

/* ── County watchlist ──
   Backed by js/watchlist.js (window.WATCHLIST), which owns storage, notes,
   policy snapshots, and optional cloud sync. These wrappers exist so the
   surrounding map code keeps its original call signatures. */
const WATCHLIST_MAX = 50;

function _isWatched(fips) {
  return !!(window.WATCHLIST && window.WATCHLIST.has(fips));
}

function toggleWatchCounty(fips) {
  if (!fips || !window.WATCHLIST) return;
  if (window.WATCHLIST.has(fips)) {
    window.WATCHLIST.remove(fips);
    showMapToast("Removed from watchlist");
  } else {
    if (window.WATCHLIST.count() >= WATCHLIST_MAX) {
      showMapToast(`Watchlist full (max ${WATCHLIST_MAX})`);
      return;
    }
    window.WATCHLIST.add(fips);
    const c = mapData[fips];
    showMapToast(c ? `Watching ${c.name}` : "Added to watchlist");
  }
  _updateDetailWatchBtn(fips);
  // Invalidate home page so watchlist section reflects the change on next visit
  const homeEl = document.getElementById("home-view");
  if (homeEl) delete homeEl.dataset.built;
}

function _updateDetailWatchBtn(fips) {
  const btn  = document.getElementById("detail-watch-btn");
  const icon = document.getElementById("detail-watch-icon");
  if (!btn) return;
  if (!fips) { btn.hidden = true; return; }
  btn.hidden = false;
  const watched = _isWatched(fips);
  btn.setAttribute("title", watched ? "Remove from watchlist" : "Watch county");
  btn.setAttribute("aria-label", watched ? "Remove from watchlist" : "Add to watchlist");
  btn.classList.toggle("detail-watch-btn-active", watched);
  if (icon) icon.setAttribute("fill", watched ? "currentColor" : "none");
}

/* ── Share/Permalink helper ── */
function _copyCountyLink(fips) {
  const url = fips
    ? `${window.location.origin}${window.location.pathname}${window.location.search}#${fips}`
    : window.location.href;
  const done = () => showMapToast("Link copied!");
  const fail = () => {
    const ta = Object.assign(document.createElement("textarea"), { value: url, style: "position:fixed;opacity:0" });
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); done(); } catch (_) { showMapToast("Copy failed — check browser permissions"); }
    ta.remove();
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(fail);
  else fail();
}

function _updateDetailShareBtn(fips) {
  const btn = document.getElementById("detail-share-btn");
  if (!btn) return;
  btn.hidden = !fips;
}

/* ── County notes (localStorage, never uploaded) ── */
const NOTES_KEY = "dc-county-notes-v1";

function _loadNote(fips) {
  try {
    const notes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
    return (typeof notes[fips] === "string") ? notes[fips] : "";
  } catch (_) { return ""; }
}

function _saveNote(fips, text) {
  if (!fips) return;
  try {
    const notes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
    if (text.trim()) notes[fips] = text;
    else delete notes[fips];
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (_) {}
}

/* ── Recently-viewed county tracking (stored locally, never uploaded) ── */
const COUNTY_VISIT_KEY = "dc-recent-counties-v1";
function _trackRecentCounty(fips) {
  if (!fips) return;
  try {
    let list = JSON.parse(localStorage.getItem(COUNTY_VISIT_KEY) || "[]");
    list = [fips, ...list.filter(f => f !== fips)].slice(0, 20);
    localStorage.setItem(COUNTY_VISIT_KEY, JSON.stringify(list));
  } catch (_) {}
}

function _renderNotesSection(fips) {
  const container = document.getElementById("detail-notes-section");
  if (!container || !fips) return;
  const note = _loadNote(fips);
  container.innerHTML = `
    <div class="policy-divider"></div>
    <div class="detail-notes-wrap">
      <div class="detail-notes-hdr">
        <span class="detail-label">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-right:4px;vertical-align:-1px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Notes
        </span>
        <span class="detail-notes-status" id="detail-notes-status">${note ? "Saved" : ""}</span>
      </div>
      <textarea id="detail-notes-ta" class="detail-notes-ta"
        placeholder="Private analyst notes — saved only on this device…"
        rows="3" aria-label="County analyst notes"></textarea>
      <div class="detail-notes-hint">Auto-saved locally · never uploaded</div>
    </div>`;
  const ta     = container.querySelector("#detail-notes-ta");
  const status = container.querySelector("#detail-notes-status");
  ta.value = note;
  let _noteTimer = null;
  ta.addEventListener("input", () => {
    clearTimeout(_noteTimer);
    status.textContent = "";
    _noteTimer = setTimeout(() => {
      _saveNote(fips, ta.value);
      status.textContent = ta.value.trim() ? "Saved" : "";
    }, 700);
  });
  ta.addEventListener("blur", () => {
    clearTimeout(_noteTimer);
    _saveNote(fips, ta.value);
    status.textContent = ta.value.trim() ? "Saved" : "";
  });
}

/* ── Similar Counties (same restriction level, comparable suitability) ── */
function _renderSimilarCounties(fips, county) {
  const container = document.getElementById("detail-similar-section");
  if (!container || !fips || !county || !mapData) return;
  container.innerHTML = "";
  const targetSuit = computeSuitabilityScore(fips, county);
  if (!targetSuit) return;
  const targetLvl = county.level ?? 0;
  const targetState = county.state || "";
  const SCORE_WINDOW = 8;
  const similar = [];
  for (const f in mapData) {
    if (f === fips) continue;
    const c = mapData[f];
    if ((c.level ?? 0) !== targetLvl) continue;
    if (c.state === targetState) continue;
    const s = computeSuitabilityScore(f, c);
    if (!s) continue;
    const diff = Math.abs(s.score - targetSuit.score);
    if (diff <= SCORE_WINDOW) similar.push({ fips: f, name: c.name, state: c.state, level: c.level ?? 0, score: s.score, grade: s.grade, diff });
  }
  if (!similar.length) return;
  similar.sort((a, b) => a.diff - b.diff || b.score - a.score);
  const top = similar.slice(0, 5);
  const GRADE_COLOR = { A: "#22c55e", B: "#22d3ee", C: "#eab308", D: "#f97316", F: "#ef4444" };
  const SEV_KEY_LABELS = window.SEVERITY_SHORT;
  container.innerHTML = `
    <div class="policy-divider"></div>
    <div class="detail-similar-wrap">
      <div class="detail-label" style="margin-bottom:8px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-right:4px;vertical-align:-1px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Similar Counties
      </div>
      <div class="detail-similar-list">
        ${top.map(c => {
          const sevKey = getSeverityKey(mapData[c.fips]);
          const sevLbl = SEV_KEY_LABELS[sevKey] || window.SEVERITY_SHORT.none;
          return `<button class="detail-similar-item" data-fips="${escHtml(c.fips)}" type="button" title="View ${escHtml(c.name)}, ${escHtml(c.state)}">
            <span class="detail-similar-grade" style="color:${GRADE_COLOR[c.grade] || 'var(--accent)'}">${escHtml(c.grade)}</span>
            <span class="detail-similar-info">
              <span class="detail-similar-name">${escHtml(c.name)}</span>
              <span class="detail-similar-state">${escHtml(c.state)}</span>
            </span>
            <span class="detail-similar-score">${c.score}pts</span>
          </button>`;
        }).join("")}
      </div>
    </div>`;
  container.querySelectorAll(".detail-similar-item[data-fips]").forEach(btn => {
    btn.addEventListener("click", () => { selectCounty(btn.dataset.fips); zoomToFeature(btn.dataset.fips); });
  });
}

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
  political_risk: false,
  water:        false,
  utility:      false,
  tax:          false,
  annotations:        true,
  zoning_districts:   false,
  zoning_overlays:    false,
  opportunity_zones:  false, // roadmap — no data yet
  fema_flood:         false, // roadmap — no data yet
  enterprise_zones:   false, // roadmap — no data yet
  parcels:            false, // parcel-level data (zoom ≥14; pilot: Loudoun County VA)
  terrain_3d:         true,  // 3D view's terrain mesh toggle (only affects the 3D panel)
  contours_slope:     false, // roadmap — no data yet
  /* Economic choropleths — mutually exclusive, enforced in ECONOMY_MAP.onLayerToggle().
     Only one may colour counties at a time; stacking opaque economic fills over
     the restriction layer would make all of them unreadable. */
  econ_population_growth: false,
  econ_income:            false,
  econ_unemployment:      false,
  econ_workforce:         false,
  econ_housing_cost:      false,
  econ_broadband:         false,
};

/* js/economy-map.js needs to clear sibling economic layers when one is enabled.
   Exposed rather than reaching into map.js's closure, and named *Ref to make it
   obvious this is the live object, not a copy. */
window.layerStateRef = layerState;

let mapData         = {};
let sampleLayers    = null;
let stateRegData    = {};
let legendOpen      = true;  // true=visible, false=collapsed to restore button
let politicalRiskData = {};   // fips → risk record from political_risk.json
let showPoliticalRisk = false;
let _suitMode       = false;
let _wsMode         = false;
let _densityMode    = false;
let _densityCache   = null;   // fips → facility count, loaded lazily
let _screenerActive = false;
let _screenerMatches = new Set();
let _screenerRanked  = [];   // full sorted results array for CSV export
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
let   activeDateFilter      = null;        // null = off, 4-digit year string e.g. "2020"
let   activeWsMaxFilter    = null;        // null = off, 0–4 = max allowed water stress level
let   activeSuitMinFilter  = null;        // null = off, minimum suitability score (45=C+, 65=B+, 80=A)

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
  if (activeDateFilter) {
    const effDate = county?.effective_date || county?.date;
    // Counties with a date that exceeds the filter year are excluded.
    // Counties without a date are kept (we don't know their enactment date).
    if (effDate && effDate.slice(0, 4) > activeDateFilter) return false;
  }
  if (activeWsMaxFilter !== null) {
    const ws = (window.DC_WATER_STRESS_FULL || {})[fips];
    if (ws !== undefined && ws !== null && ws > activeWsMaxFilter) return false;
  }
  if (activeSuitMinFilter !== null) {
    const suit = computeSuitabilityScore(fips, county);
    if (suit.score < activeSuitMinFilter) return false;
  }
  return true;
}

function hasActiveMapFilters() {
  return activeRestrictFilters.size > 0 || activeStateFilter !== "" ||
         activeTypeFilters.size > 0 || activeStatusFilters.size > 0 ||
         activeDateFilter !== null || activeWsMaxFilter !== null || activeSuitMinFilter !== null;
}

/* ── Helpers ── */
function fipsKey(id) { return String(id).padStart(5, "0"); }

const SUIT_GRADE_COLORS = {
  A: "#22c55e",
  B: "#22d3ee",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

function getSuitabilityColor(fips) {
  const county = mapData[fips];
  const s = computeSuitabilityScore(fips, county || null);
  return SUIT_GRADE_COLORS[s.grade] || themeColors().noData;
}

const WATER_STRESS_COLORS = [
  "#2563eb", // 0 Low
  "#0ea5e9", // 1 Low-Medium
  "#eab308", // 2 Medium-High
  "#f97316", // 3 High
  "#dc2626", // 4 Extremely High
];

function getWaterStressColor(fips) {
  const ws = window.DC_WATER_STRESS_FULL || {};
  const level = ws[fips];
  if (level === undefined || level === null) return themeColors().noData;
  return WATER_STRESS_COLORS[level] || themeColors().noData;
}

const DENSITY_TIERS = [
  { min: 1,   max: 1,   color: "#bfdbfe", label: "1 facility"       },
  { min: 2,   max: 5,   color: "#60a5fa", label: "2–5 facilities"   },
  { min: 6,   max: 20,  color: "#3b82f6", label: "6–20 facilities"  },
  { min: 21,  max: 50,  color: "#2563eb", label: "21–50 facilities" },
  { min: 51,  max: Infinity, color: "#1e3a8a", label: "51+ facilities"  },
];

function getDensityTier(count) {
  for (const t of DENSITY_TIERS) {
    if (count >= t.min && count <= t.max) return t;
  }
  return null;
}

function getDensityColor(fips) {
  const d = _densityCache || {};
  const count = d[fips] || 0;
  if (!count) return themeColors().noData;
  const t = getDensityTier(count);
  return t ? t.color : themeColors().noData;
}

function getColor(fips) {
  // Economic layers participate in the same view-mode switch as density/water/
  // suitability. Because this is a fall-through rather than a style overwrite,
  // turning the economic layer off restores restriction colours automatically —
  // the restriction branch below is simply reached again.
  if (window.ECONOMY_MAP && window.ECONOMY_MAP.isActive()) {
    const c = window.ECONOMY_MAP.colorFor(fips);
    if (c) return c;
  }
  if (_densityMode) return getDensityColor(fips);
  if (_wsMode)      return getWaterStressColor(fips);
  if (_suitMode)    return getSuitabilityColor(fips);
  const county = mapData[fips];
  return county ? getSeverityColor(county) : themeColors().noData;
}

/* True when an economic choropleth is driving county colours. */
function _econModeActive() {
  return !!(window.ECONOMY_MAP && window.ECONOMY_MAP.isActive());
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

  const style = {
    fillColor:   getColor(fips),
    fillOpacity: isSat ? ((hasData || _suitMode || _wsMode || _densityMode
                            || (_econModeActive() && window.ECONOMY_MAP.hasValue(fips)))
                          ? 0.70 * zoomFade * countyFillOpacity : 0)
                       : 0.75 * zoomFade * countyFillOpacity,
    color:       tc.countyBorder,
    weight:      0.35,
  };

  if (_screenerActive) {
    if (_screenerMatches.has(fips)) {
      style.color  = "#22c55e";
      style.weight = 2;
      style.fillOpacity = Math.max(style.fillOpacity, isSat ? 0.65 : 0.75);
    } else {
      style.fillOpacity = style.fillOpacity * 0.12;
    }
  }

  return style;
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
const _fetchJSON = url =>
  fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });

/* ── Critical data ──────────────────────────────────────────────────────────
   Only what the Home tab needs to render: county records (KPIs, search,
   watchlist) and the news feed. Everything else was previously fetched here
   too, putting ~1.6 MB of map-only payloads on the critical path before the
   home page could paint. See loadSecondaryData(). */
async function loadCoreData() {
  const [data, newsData] = await Promise.all([
    _fetchJSON("data/map_data.json"),
    fetch("data/ai_news.json", { cache: "no-store" }).then(r => r.json()).catch(() => ({ articles: [] })),
  ]);
  return { data, newsData };
}

/* ── Secondary data ─────────────────────────────────────────────────────────
   Map overlays and enrichment layers. Started in parallel with the critical
   fetches so total wall time is unchanged, but never awaited before first
   paint. The Map tab awaits this; Home renders without it and re-renders when
   it lands. Every consumer already guards with `window.DC_X || {}` or a null
   check on `sampleLayers`, so a not-yet-loaded state renders as "no data"
   rather than throwing. */
let _secondaryPromise = null;

function loadSecondaryData() {
  if (_secondaryPromise) return _secondaryPromise;

  _secondaryPromise = Promise.all([
    _fetchJSON("data/sample_layers.json").catch(() => null),
    _fetchJSON("data/state_regulations.json").catch(() => ({ states: {} })),
    _fetchJSON("data/political_risk.json").catch(() => ({ scores: [] })),
    _fetchJSON("data/tax_incentives.json").catch(() => ({ tax_incentives: [] })),
    _fetchJSON("data/water_stress.json").catch(() => ({ water_stress: {} })),
  ]).then(([sample, stateReg, riskRaw, incentivesRaw, waterRaw]) => {
    // Index risk scores by fips for O(1) lookup
    const riskByFips = {};
    for (const rec of (riskRaw.scores || [])) {
      if (rec.fips) riskByFips[String(rec.fips).padStart(5, "0")] = rec;
    }
    // Index tax incentive programs by FIPS for O(1) lookup
    const incentivesByFips = {};
    for (const prog of (incentivesRaw.tax_incentives || [])) {
      for (const fips of (prog.fips_list || [])) {
        const key = String(fips).padStart(5, "0");
        if (!incentivesByFips[key]) incentivesByFips[key] = [];
        incentivesByFips[key].push(prog);
      }
    }

    sampleLayers      = sample || null;
    stateRegData      = (stateReg && stateReg.states) || {};
    politicalRiskData = riskByFips;

    window.DC_RISK_BY_FIPS      = riskByFips;
    window.DC_WATER_STRESS      = (sample && sample.water_stress) ? sample.water_stress : {};
    window.DC_WATER_STRESS_FULL = (waterRaw && waterRaw.water_stress) || {};
    window.DC_INCENTIVES_FIPS   = incentivesByFips;

    return { sample, stateReg, riskByFips, incentivesByFips };
  }).catch(err => {
    console.error("Secondary data failed:", err);
    return null;
  });

  return _secondaryPromise;
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
  // Guard against concurrent invocation. initMapFromGeo() awaits before it
  // assigns leafletMap, so a `if (!leafletMap)` check at the call site is not
  // enough — two callers in the same tick would both pass it and Leaflet would
  // throw "Map container is already initialized". Returning the in-flight
  // promise makes repeat calls harmless.
  if (mapInitPromise) return mapInitPromise;
  mapInitPromise = _initMapFromGeo();
  return mapInitPromise;
}

async function _initMapFromGeo() {
  const loadEl = document.getElementById("loading");
  if (loadEl) loadEl.style.display = "";
  try {
    // The map draws overlay layers from sampleLayers / risk / incentives, which
    // are deferred off the critical path. Wait for them here so the map never
    // renders with empty overlays. Both downloads run in parallel.
    const [us] = await Promise.all([fetchGeoData(), loadSecondaryData()]);
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
    initLegendControls();
    setDetailEmpty();
    // Wire results panel row click → selectCounty, and do initial data load
    window.RESULTS_PANEL?.onRowClick(selectCounty);
    window.RESULTS_PANEL?.update(mapData, () => true);
    // Pre-populate save cache if user is already signed in at load time
    _refreshSavedCache();
    // Initialize parcel intelligence module
    window.PARCEL?.init(leafletMap);
    // Initialize 3D terrain view coordinator (Three.js itself loads lazily
    // on first activation — this call never fetches 3D bytes)
    window.SCENE3D?.init(leafletMap);
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

  /* When an economic layer is driving the fill, show its value too — otherwise
     the county is coloured by something the tooltip never mentions. The policy
     level stays on the line above, so policy context is never lost. */
  let econEl = tooltip.querySelector(".tip-econ");
  if (_econModeActive()) {
    const ev = window.ECONOMY_MAP.valueText(fips);
    if (!econEl) {
      econEl = document.createElement("div");
      econEl.className = "tip-econ";
      tooltip.appendChild(econEl);
    }
    econEl.textContent = ev ? `${ev.label}: ${ev.text}` : "";
    econEl.style.display = "";
  } else if (econEl) {
    econEl.style.display = "none";
  }

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
  if (measureMode || drawMode || candidatePinMode) return;
  if (isDraggingMap || isMouseDown) return;
  if (hasActiveMapFilters() && !countyMatchesFilters(fips)) return;

  // Clear any previously hovered layer before setting the new one
  if (hoveredCountyLayer && hoveredCountyLayer !== e.target) {
    clearHoveredCounty();
  }

  hoveredCountyLayer = e.target;
  if (fips !== selectedFips) {
    e.target.setStyle(hoverCountyStyle());
    e.target.bringToFront();
  }

  /* Parcel view: the county tooltip is a cursor-following box drawn directly
     over the parcels being inspected, and the parcel layer already supplies a
     richer per-parcel tooltip (address / PIN) for the thing actually under the
     pointer. It also flickers constantly here, because parcel polygons sit on
     their own higher pane and capture the pointer, so the county only receives
     mouseover in the gaps *between* parcels — every road and lot line toggles
     the box back on. Suppress it for the county whose parcels are on screen;
     hovering a neighbouring county still explains what you are pointing at. */
  if (window.PARCEL?.isActiveWithData?.() && fips === selectedFips) {
    tooltip.style.display = "none";
    return;
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
  if (measureMode || drawMode || candidatePinMode) return; // let click bubble to map for tool placement
  if (isDraggingMap || Date.now() < suppressClickUntil) return;
  if (hasActiveMapFilters() && !countyMatchesFilters(fips)) return;
  L.DomEvent.stopPropagation(e);
  if (compareMode) { addToCompare(fips); return; }
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
  }
  selectedFips = fips;
  setLocationHash(fips);
  clearHoveredCounty();

  /* Notify zoning/parcel/3D modules BEFORE styling the selected county —
   * selectedCountyStyle() reads parcel-view state (window.PARCEL.isActiveWithData()),
   * which window.PARCEL.onCountyChanged() below is what updates for the newly
   * clicked county. Styling first would read the previous county's stale state. */
  if (layerState.zoning_districts && window.ZONING_MAP) {
    window.ZONING_MAP.onCountySelected(fips);
  }
  if (window.PARCEL) {
    window.PARCEL.onCountyChanged(fips);
  }
  window.SCENE3D?.onCountyChanged(fips);

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

  // Political risk overlay (county fill by risk_score 0-4)
  const riskLayerGroup = L.layerGroup();
  const riskColors = { 0: null, 1: "#16a34a", 2: "#d97706", 3: "#dc2626", 4: "#7f1d1d" };
  const riskOpacity = { 0: 0, 1: 0.20, 2: 0.30, 3: 0.42, 4: 0.55 };
  if (politicalRiskData) {
    countiesGeoJSON.features.forEach(f => {
      const rec = politicalRiskData[fipsKey(f.id)];
      if (!rec || rec.risk_score === 0) return;
      const col = riskColors[rec.risk_score];
      if (!col) return;
      L.geoJSON(f, {
        style: { fillColor: col, fillOpacity: riskOpacity[rec.risk_score] || 0.2, color: col, weight: 0.5, opacity: 0.3 },
        interactive: false,
      }).addTo(riskLayerGroup);
    });
  }
  leafletLayerGroups.political_risk = riskLayerGroup;

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
  } else if (id === "parcels") {
    if (window.PARCEL) {
      window.PARCEL.onLayerToggle(id, visible, selectedFips);
    }
    // Re-apply the selected county's style immediately — selectedCountyStyle()
    // now reads parcel-view state, so toggling this checkbox changes how that
    // county is drawn (heavy choropleth fill vs. outline-only) without
    // requiring the user to re-click the county.
    if (selectedFips && countyLayerByFips[selectedFips]) {
      countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
    }
  } else if (id === "terrain_3d") {
    window.SCENE3D?.onLayerToggle(id, visible, selectedFips);
  } else if (window.ECONOMY_MAP && window.ECONOMY_MAP.LAYER_METRIC[id]) {
    // ECONOMY_MAP restyles the county layer and refreshes the legend itself,
    // because activation is async (the county file is lazy-loaded).
    window.ECONOMY_MAP.onLayerToggle(id, visible);
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

  // Warn when a sample/estimated layer is enabled
  if (visible) {
    const reg = (window.LAYER_REGISTRY || []).find(r => r.id === id);
    if (reg && reg.data_status === "sample") {
      showMapToast(`⚠ ${reg.label}: sample data — not verified`, 4500);
    } else if (reg && reg.data_status === "estimated") {
      showMapToast(`ℹ ${reg.label}: estimated data — accuracy unverified`, 3500);
    }
  }

  renderLegend();
  _saveLayerState();
}

const LAYER_STATE_KEY = "dc-layer-state-v1";
function _saveLayerState() {
  try { localStorage.setItem(LAYER_STATE_KEY, JSON.stringify(layerState)); } catch (_) {}
}
function _loadLayerState() {
  try {
    const raw = localStorage.getItem(LAYER_STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    for (const k of Object.keys(layerState)) {
      if (typeof s[k] === "boolean") layerState[k] = s[k];
    }
  } catch (_) {}
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

/* ── Radius buffer tool ── */
function clearRadius() {
  radiusLayers.forEach(l => { if (l && leafletMap) leafletMap.removeLayer(l); });
  radiusLayers = [];
  radiusCenter = null;
  const readout = document.getElementById('radius-readout');
  if (readout) readout.hidden = true;
}

function _highlightRadiusCounties() {
  if (!radiusCenter || !countyGeoLayer) {
    const countEl = document.getElementById('radius-count-val');
    if (countEl) countEl.textContent = '';
    return;
  }
  const radiusM = _radiusKm * 1000;
  let count = 0;
  countyGeoLayer.eachLayer(layer => {
    try {
      const c = layer.getBounds().getCenter();
      if (radiusCenter.distanceTo(c) <= radiusM) count++;
    } catch (_) {}
  });
  const countEl = document.getElementById('radius-count-val');
  if (countEl) countEl.textContent = count > 0 ? `${count} counti${count === 1 ? 'y' : 'es'} in range` : '';
}

function _updateRadiusReadout() {
  const distEl = document.getElementById('radius-dist-val');
  if (distEl) {
    if (!radiusCenter) {
      distEl.textContent = 'Click map to place center';
    } else {
      const mi = (_radiusKm * 0.621371).toFixed(0);
      const km = _radiusKm.toFixed(0);
      distEl.textContent = `${mi} mi  (${km} km)`;
    }
  }
  document.querySelectorAll('.radius-preset').forEach(btn => {
    btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.km) - _radiusKm) < 0.01);
  });
  _highlightRadiusCounties();
}

function _placeRadiusCenter(latlng) {
  clearRadius();
  radiusCenter = latlng;

  const marker = L.circleMarker(latlng, {
    radius: 5, fillColor: '#f59e0b', color: '#fff',
    weight: 1.5, fillOpacity: 1, interactive: false,
  }).addTo(leafletMap);
  radiusLayers.push(marker);

  const circle = L.circle(latlng, {
    radius: _radiusKm * 1000,
    color: '#f59e0b', weight: 1.5, opacity: 0.85,
    fillColor: '#f59e0b', fillOpacity: 0.06,
    interactive: false,
  }).addTo(leafletMap);
  radiusLayers.push(circle);

  _updateRadiusReadout();
}

function setRadiusFromPreset(km) {
  _radiusKm = km;
  if (radiusCenter && radiusLayers.length >= 2) {
    const oldCircle = radiusLayers[1];
    if (oldCircle && leafletMap) leafletMap.removeLayer(oldCircle);
    const circle = L.circle(radiusCenter, {
      radius: km * 1000,
      color: '#f59e0b', weight: 1.5, opacity: 0.85,
      fillColor: '#f59e0b', fillOpacity: 0.06,
      interactive: false,
    }).addTo(leafletMap);
    radiusLayers[1] = circle;
  }
  _updateRadiusReadout();
}

function toggleRadius() {
  if (measureMode)      toggleMeasure();
  if (drawMode)         toggleDraw();
  if (candidatePinMode) { _clearCandidatePin(); candidatePinMode = false; }

  radiusMode = !radiusMode;
  const btn   = document.getElementById('gis-radius');
  const mapEl = document.getElementById('leaflet-map');
  if (btn)   { btn.classList.toggle('active', radiusMode); btn.setAttribute('aria-pressed', String(radiusMode)); }
  if (mapEl) mapEl.classList.toggle('radius-active', radiusMode);

  if (radiusMode) {
    const readout = document.getElementById('radius-readout');
    if (readout) { readout.hidden = false; _updateRadiusReadout(); }
    showMapToast('Click map to place radius center');
  } else {
    clearRadius();
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

/* ── GeoJSON Export ── */
function exportCountiesGeoJSON() {
  if (!countyGeoLayer) { showMapToast("Map data not loaded yet"); return; }
  const active   = hasActiveMapFilters();
  const features = [];
  countyGeoLayer.getLayers().forEach(layer => {
    const fips = fipsKey(layer.feature.id);
    const c    = mapData[fips];
    if (!c) return;
    if (active && !countyMatchesFilters(fips)) return;
    const suit = computeSuitabilityScore(fips, c);
    features.push({
      type: "Feature",
      id:   fips,
      geometry:   layer.feature.geometry,
      properties: {
        fips, name: c.name, state: c.state,
        level:    c.level,
        severity: SEVERITY[getSeverityKey(c)].label,
        status:   c.status || "active",
        types:    (c.types || []).join(", "),
        title:    c.title || "",
        effective_date: c.effective_date || "",
        notes:    c.notes || "",
        suitability_score: suit.score,
        suitability_grade: suit.grade,
        suitability_label: suit.label,
      },
    });
  });
  if (!features.length) { showMapToast("No counties with restriction data match current filters"); return; }
  const geojson = JSON.stringify({ type: "FeatureCollection", features }, null, 2);
  const blob = new Blob([geojson], { type: "application/geo+json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url, download: `dc-restrictions-${new Date().toISOString().slice(0, 10)}.geojson`,
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  showMapToast(`Exported ${features.length} ${active ? "filtered " : ""}counties as GeoJSON`);
}

/* ── Export dropdown toggle ── */
function _toggleExportMenu() {
  const menu = document.getElementById("export-menu");
  const btn  = document.getElementById("gis-export");
  if (!menu || !btn) return;
  const opening = menu.hidden;
  menu.hidden = !opening;
  btn.setAttribute("aria-expanded", String(opening));
  if (!opening) return;
  const rect = btn.getBoundingClientRect();
  menu.style.top  = (rect.bottom + 4) + "px";
  menu.style.left = rect.left + "px";
}

/* ── Print report ── */
function openPrintReport() {
  if (!mapData || Object.keys(mapData).length === 0) { showMapToast("No data loaded yet"); return; }
  const active   = hasActiveMapFilters();
  const counties = Object.entries(mapData)
    .filter(([fips]) => !active || countyMatchesFilters(fips))
    .sort(([, a], [, b]) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

  const filterSummary = (() => {
    const parts = [];
    if (activeStateFilter) parts.push(`State: ${activeStateFilter}`);
    if (activeRestrictFilters.size) parts.push(`Severity: ${[...activeRestrictFilters].join(", ")}`);
    if (activeTypeFilters.size)    parts.push(`Type: ${[...activeTypeFilters].map(t => TYPE_LABELS[t]||t).join(", ")}`);
    if (activeStatusFilters.size)  parts.push(`Status: ${[...activeStatusFilters].join(", ")}`);
    if (activeDateFilter)          parts.push(`Enacted by: ${activeDateFilter}`);
    return parts.length ? parts.join(" · ") : "All counties with restrictions";
  })();

  const rows = counties.map(([fips, c]) => {
    const sevKey = getSeverityKey(c);
    const suit   = computeSuitabilityScore(fips, c);
    const esc    = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const types  = (c.types||[]).map(t => TYPE_LABELS[t]||t).join(", ")||"—";
    const SWATCH = { pro:"#16a34a", none:"#16a34a", proposed:"#b45309", moderate:"#c2410c", high:"#b91c1c", ban:"#7f1d1d" };
    const GRADE_COLOR = { A:"#16a34a", B:"#0891b2", C:"#b45309", D:"#c2410c", F:"#b91c1c" };
    return `<tr>
      <td><code>${esc(fips)}</code></td>
      <td>${esc(c.name)}</td>
      <td>${esc(c.state)}</td>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${SWATCH[sevKey]||"#999"};margin-right:4px;vertical-align:middle"></span>${esc(SEVERITY[sevKey]?.label||"")}</td>
      <td style="text-transform:capitalize">${esc(c.status||"active")}</td>
      <td>${esc(types)}</td>
      <td>${esc(c.effective_date||"—")}</td>
      <td><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:${GRADE_COLOR[suit.grade]};color:#fff;font-weight:800;font-size:11px;margin-right:4px">${suit.grade}</span>${suit.score}/100</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>DC &amp; AI Policy Report — ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;color:#111;padding:24px 32px;line-height:1.5}
  h1{font-size:18px;font-weight:700;margin-bottom:4px}
  .meta{font-size:11px;color:#666;margin-bottom:16px}
  .filter-bar{background:#f4f4f5;border:1px solid #e4e4e7;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:11px;color:#444}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{text-align:left;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#666;border-bottom:2px solid #ddd;padding:6px 8px;white-space:nowrap}
  td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top}
  tr:nth-child(even) td{background:#fafafa}
  code{font-size:10px;background:#f0f0f0;padding:1px 4px;border-radius:3px;font-family:monospace}
  .footer{margin-top:20px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}
  @media print{body{padding:12px 16px}@page{margin:1.5cm}}
</style>
</head><body>
<h1>US Data Center &amp; AI Policy Tracker — Restriction Report</h1>
<div class="meta">Generated ${new Date().toLocaleString("en-US")} · ${counties.length} ${active?"filtered ":""}counties</div>
<div class="filter-bar"><strong>Filters:</strong> ${filterSummary}</div>
<table>
  <thead><tr>
    <th>FIPS</th><th>County</th><th>State</th><th>Severity</th>
    <th>Status</th><th>Types</th><th>Enacted</th><th>Suitability</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">US DC &amp; AI Policy Tracker · Data is algorithmically compiled and may be incomplete. Verify with official sources before making site selection decisions.</div>
</body></html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { showMapToast("Pop-up blocked — allow pop-ups and try again"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
  showMapToast(`Report opened: ${counties.length} counties`);
}

/* ── Workspace JSON export / import ── */
function exportWorkspacesJSON() {
  const list = _loadWsList();
  if (!list.length) { showMapToast("No workspaces to export"); return; }
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url, download: `dc-workspaces-${new Date().toISOString().slice(0,10)}.json`,
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  showMapToast(`Exported ${list.length} workspace${list.length !== 1 ? "s" : ""}`);
}

function importWorkspacesJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let imported;
    try { imported = JSON.parse(e.target.result); } catch (_) { showMapToast("Invalid JSON file"); return; }
    if (!Array.isArray(imported)) { showMapToast("JSON must be an array of workspaces"); return; }
    const valid = imported.filter(w => w && typeof w === "object" && w.id && w.name);
    if (!valid.length) { showMapToast("No valid workspaces found in file"); return; }
    const existing = _loadWsList();
    const existingIds = new Set(existing.map(w => w.id));
    const toAdd = valid.filter(w => !existingIds.has(w.id));
    const merged = [...existing, ...toAdd].slice(0, WS_MAX_LOCAL);
    _saveWsList(merged);
    renderWorkspaceList();
    showMapToast(`Imported ${toAdd.length} workspace${toAdd.length !== 1 ? "s" : ""}${toAdd.length < valid.length ? ` (${valid.length - toAdd.length} duplicate${valid.length - toAdd.length !== 1 ? "s" : ""} skipped)` : ""}`);
  };
  reader.readAsText(file);
}

/* ── Share URL (full GIS state) ── */
const _SHARE_LAYER_KEYS = [
  "restrictions", "state_policy", "city_policy", "dc_existing", "dc_planned",
  "ai_campus", "power", "transmission", "fiber", "political_risk", "water",
  "utility", "tax", "annotations", "zoning_districts", "zoning_overlays",
];

function _encodeShareState() {
  const c = leafletMap.getCenter();
  // Pack layer visibility into an integer bitmask
  let lm = 0;
  _SHARE_LAYER_KEYS.forEach((k, i) => { if (layerState[k]) lm |= (1 << i); });
  const obj = {
    b:  activeTile !== "satellite" ? activeTile : undefined,
    l:  lm,
    v:  `${c.lat.toFixed(4)},${c.lng.toFixed(4)},${leafletMap.getZoom()}`,
  };
  if (activeRestrictFilters.size) obj.rf  = [...activeRestrictFilters].join(",");
  if (activeStateFilter)           obj.sf  = activeStateFilter;
  if (activeTypeFilters.size)      obj.tf  = [...activeTypeFilters].join(",");
  if (typeFilterMode !== "any")    obj.tm  = typeFilterMode;
  if (activeStatusFilters.size)    obj.stf = [...activeStatusFilters].join(",");
  if (activeDateFilter)            obj.df  = activeDateFilter;
  if (selectedFips)                obj.f   = selectedFips;
  // Remove undefined keys
  Object.keys(obj).forEach(k => { if (obj[k] === undefined) delete obj[k]; });
  // Base64url-encode (no padding)
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function _decodeShareState(encoded) {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64 + "=".repeat((4 - b64.length % 4) % 4)));
  } catch (_) { return null; }
}

function _applyShareState(obj) {
  if (!obj) return;
  if (obj.b) switchBasemap(obj.b);
  if (obj.l !== undefined) {
    _SHARE_LAYER_KEYS.forEach((k, i) => setLayerVisible(k, !!(obj.l & (1 << i)), true));
  }
  activeRestrictFilters.clear();
  if (obj.rf)  obj.rf.split(",").filter(Boolean).forEach(k => activeRestrictFilters.add(k));
  activeStateFilter = obj.sf || "";
  activeTypeFilters.clear();
  if (obj.tf)  obj.tf.split(",").filter(Boolean).forEach(k => activeTypeFilters.add(k));
  typeFilterMode = obj.tm || "any";
  activeStatusFilters.clear();
  if (obj.stf) obj.stf.split(",").filter(Boolean).forEach(k => activeStatusFilters.add(k));
  activeDateFilter = (typeof obj.df === "string" && /^\d{4}$/.test(obj.df)) ? obj.df : null;
  applyFilters();
  if (obj.v) {
    const parts = obj.v.split(",");
    const lat = parseFloat(parts[0]), lng = parseFloat(parts[1]), zoom = parseInt(parts[2], 10);
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) leafletMap.setView([lat, lng], zoom, { animate: false });
  }
  if (obj.f) selectCounty(obj.f);
}

function shareCurrentView() {
  const encoded = _encodeShareState();
  const url  = `${location.origin}${location.pathname}#s=${encoded}`;
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

  document.getElementById("ctx-share-county")?.addEventListener("click", () => {
    _copyCountyLink(selectedFips);
    closeMenu();
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
      _updateBookmarksBadge();
    });
    listEl.appendChild(row);
  });
}

function _updateBookmarksBadge() {
  const badge = document.getElementById("bm-count-badge");
  if (!badge) return;
  const n = _loadBookmarks().length;
  badge.textContent = n > 0 ? String(n) : "";
  badge.hidden = n === 0;
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
  _updateBookmarksBadge();
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

/* ── Workspace panel ── */
function _generateWsId() {
  return "ws-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function _loadWsList() {
  try { return JSON.parse(localStorage.getItem(WS_LOCAL_KEY) || "[]"); }
  catch (_) { return []; }
}

function _saveWsList(arr) {
  try { localStorage.setItem(WS_LOCAL_KEY, JSON.stringify(arr)); } catch (_) {}
}

function _captureWorkspaceState(name) {
  const c = leafletMap.getCenter();
  const ws = {
    id:          _generateWsId(),
    name:        name,
    created:     Date.now(),
    basemap:     activeTile,
    layers:      Object.assign({}, layerState),
    filters: {
      restrictFilters: [...activeRestrictFilters],
      stateFilter:     activeStateFilter,
      typeFilters:     [...activeTypeFilters],
      typeFilterMode:  typeFilterMode,
      statusFilters:   [...activeStatusFilters],
      dateFilter:      activeDateFilter,
      wsMax:           activeWsMaxFilter,
      suitMin:         activeSuitMinFilter,
    },
    mapView: { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), zoom: leafletMap.getZoom() },
    selectedFips: selectedFips || null,
    drawPoints:   drawPoints.map(p => [+p.lat.toFixed(6), +p.lng.toFixed(6)]),
    drawAreaUnit: drawAreaUnit,
  };
  // Only attach scene3d when 3D was actually activated this session, so a
  // user who never opens 3D mode doesn't get a stub key on every save.
  const scene3d = window.SCENE3D?.captureState();
  if (scene3d) ws.scene3d = scene3d;
  return ws;
}

function _applyWorkspace(ws) {
  if (!ws) return;
  if (ws.basemap) switchBasemap(ws.basemap);
  if (ws.layers) {
    Object.keys(layerState).forEach(id => {
      const visible = ws.layers[id] !== undefined ? ws.layers[id] : layerState[id];
      setLayerVisible(id, visible, true);
    });
  }
  if (ws.filters) {
    activeRestrictFilters.clear();
    (ws.filters.restrictFilters || []).forEach(k => activeRestrictFilters.add(k));
    activeStateFilter = ws.filters.stateFilter || "";
    activeTypeFilters.clear();
    (ws.filters.typeFilters || []).forEach(k => activeTypeFilters.add(k));
    typeFilterMode = ws.filters.typeFilterMode || "any";
    activeStatusFilters.clear();
    (ws.filters.statusFilters || []).forEach(k => activeStatusFilters.add(k));
    activeDateFilter = (typeof ws.filters.dateFilter === "string" && /^\d{4}$/.test(ws.filters.dateFilter))
      ? ws.filters.dateFilter : null;
    activeWsMaxFilter   = (typeof ws.filters.wsMax === "number" && ws.filters.wsMax >= 0 && ws.filters.wsMax <= 4)
      ? ws.filters.wsMax : null;
    activeSuitMinFilter = (typeof ws.filters.suitMin === "number" && ws.filters.suitMin >= 0)
      ? ws.filters.suitMin : null;
    applyFilters();
  }
  if (ws.mapView) {
    leafletMap.setView([ws.mapView.lat, ws.mapView.lng], ws.mapView.zoom, { animate: false });
  }
  if (ws.drawPoints && ws.drawPoints.length > 0) {
    clearDraw();
    drawPoints.push(...ws.drawPoints.map(([lat, lng]) => L.latLng(lat, lng)));
    drawAreaUnit = ws.drawAreaUnit || drawAreaUnit;
    _redrawPolygonPreview();
    _updateDrawReadout();
  } else {
    clearDraw();
  }
  if (ws.selectedFips && mapData[ws.selectedFips]) {
    selectCounty(ws.selectedFips);
  }
  // A workspace saved before the 3D system existed has no scene3d key —
  // that must load with no error and must not force 3D mode open or closed.
  if (ws.scene3d) {
    window.SCENE3D?.applyState(ws.scene3d);
    renderScene3dObjectPanel();
    renderScene3dViewpoints();
    renderScene3dSunInfo();
  }
}

async function renderWorkspaceList() {
  const listEl = document.getElementById("workspace-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  let items = [];
  const auth = window.AUTH;
  if (auth && auth.state === "signedIn") {
    const saved = await auth.getSavedItems("workspace");
    items = (saved || [])
      .map(r => ({ ...r.item_data, _supaId: r.item_id }))
      .sort((a, b) => (b.created || 0) - (a.created || 0));
  } else {
    items = _loadWsList().sort((a, b) => (b.created || 0) - (a.created || 0));
  }

  if (!items.length) {
    const em = document.createElement("div");
    em.className = "wsp-empty";
    em.textContent = "No saved workspaces yet.";
    listEl.appendChild(em);
    return;
  }

  items.forEach(ws => {
    const row = document.createElement("div");
    row.className = "wsp-row";

    const loadBtn = document.createElement("button");
    loadBtn.className = "wsp-load";
    loadBtn.type = "button";
    loadBtn.textContent = ws.name || "Unnamed";
    loadBtn.title = ws.name || "Unnamed";
    loadBtn.addEventListener("click", () => {
      _applyWorkspace(ws);
      toggleWorkspaces();
      showMapToast("Workspace loaded");
    });

    const delBtn = document.createElement("button");
    delBtn.className = "wsp-del";
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", "Delete workspace");
    delBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    delBtn.addEventListener("click", async () => {
      if (auth && auth.state === "signedIn") {
        await auth.removeItem("workspace", ws._supaId || ws.id);
      } else {
        const list = _loadWsList().filter(w => w.id !== ws.id);
        _saveWsList(list);
      }
      renderWorkspaceList();
    });

    row.appendChild(loadBtn);
    row.appendChild(delBtn);
    listEl.appendChild(row);
  });
}

async function saveCurrentWorkspace() {
  const input  = document.getElementById("workspace-name-input");
  const saveBtn = document.getElementById("workspace-save-btn");
  const rawName = input ? input.value.trim() : "";
  const name    = rawName || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const ws      = _captureWorkspaceState(name);
  const auth    = window.AUTH;

  if (saveBtn) saveBtn.disabled = true;
  if (auth && auth.state === "signedIn") {
    await auth.saveItem("workspace", ws.id, ws);
  } else {
    const list = _loadWsList();
    list.unshift(ws);
    if (list.length > WS_MAX_LOCAL) list.splice(WS_MAX_LOCAL);
    _saveWsList(list);
  }
  if (input) input.value = "";
  if (saveBtn) saveBtn.disabled = false;
  renderWorkspaceList();
  showMapToast(`Saved "${name}"`);
}

function toggleWorkspaces() {
  _wsVisible = !_wsVisible;
  const panel = document.getElementById("workspace-panel");
  const btn   = document.getElementById("gis-workspace");
  if (panel) panel.hidden = !_wsVisible;
  if (btn)   { btn.classList.toggle("active", _wsVisible); btn.setAttribute("aria-pressed", String(_wsVisible)); }
  if (_wsVisible) renderWorkspaceList();
}

/* ── 3D terrain view ── */
function toggleScene3D() {
  _scene3dVisible = !_scene3dVisible;
  const panel = document.getElementById("scene3d-panel");
  const btn   = document.getElementById("gis-3d");
  if (panel) panel.hidden = !_scene3dVisible;
  if (btn)   { btn.classList.toggle("active", _scene3dVisible); btn.setAttribute("aria-pressed", String(_scene3dVisible)); }
  if (!_scene3dVisible && _scene3dPresenting) toggleScene3dPresentationMode(); // don't reopen straight into presentation mode
  if (_scene3dVisible) {
    if (!window.SCENE3D) {
      showMapToast("3D view isn't available — the module didn't load.");
      return;
    }
    const cap = window.SCENE3D.isAvailable();
    if (!cap.ok && btn) {
      btn.title = (window.SCENE3D_FALLBACK && window.SCENE3D_FALLBACK.MESSAGES[cap.reason]) || "3D view isn't available on this device.";
    }
    window.SCENE3D.activate().then(() => {
      renderScene3dObjectPanel();
      renderScene3dViewpoints();
      populateScene3dTemplates();
      renderScene3dSunInfo();
    });
  }
}

function populateScene3dTemplates() {
  const select = document.getElementById("scene3d-template-select");
  if (!select || !window.SCENE3D || select.dataset.populated) return;
  const templates = window.SCENE3D.listTemplates();
  select.innerHTML = templates.map(t => `<option value="${t.id}" title="${t.description}">${t.label}</option>`).join("");
  select.dataset.populated = "1";
}

function renderScene3dViewpoints() {
  const listEl = document.getElementById("scene3d-viewpoints-list");
  if (!listEl || !window.SCENE3D) return;
  const viewpoints = window.SCENE3D.listViewpoints();
  listEl.innerHTML = "";
  if (!viewpoints.length) {
    const em = document.createElement("div");
    em.className = "scene3d-vp-empty";
    em.textContent = "No saved viewpoints yet.";
    listEl.appendChild(em);
    return;
  }
  viewpoints.forEach(vp => {
    const row = document.createElement("div");
    row.className = "scene3d-vp-row";
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "scene3d-vp-load";
    loadBtn.textContent = vp.name;
    loadBtn.title = vp.name;
    loadBtn.addEventListener("click", () => window.SCENE3D.applyViewpoint(vp.id));
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "scene3d-vp-del";
    delBtn.setAttribute("aria-label", `Delete viewpoint ${vp.name}`);
    delBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    delBtn.addEventListener("click", () => { window.SCENE3D.deleteViewpoint(vp.id); renderScene3dViewpoints(); });
    row.appendChild(loadBtn);
    row.appendChild(delBtn);
    listEl.appendChild(row);
  });
}

function renderScene3dSunInfo() {
  const infoEl = document.getElementById("scene3d-sun-info");
  if (!infoEl || !window.SCENE3D) return;
  const info = window.SCENE3D.getSunInfo();
  if (!info) { infoEl.textContent = ""; return; }
  const altitude = Math.round(info.altitudeDeg);
  const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(info.azimuthDeg / 45) % 8];
  infoEl.textContent = info.daylight
    ? `☀ ${altitude}° above horizon, ${compass}`
    : `☾ below horizon (night)`;
}

function exportScene3dImage() {
  const dataUrl = window.SCENE3D?.captureSnapshot();
  if (!dataUrl) { showMapToast("Open 3D mode first to export a view."); return; }
  const a = Object.assign(document.createElement("a"), {
    href: dataUrl, download: `3d-view-${new Date().toISOString().slice(0, 10)}.png`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  showMapToast("3D view exported as PNG");
}

function exportScene3dObjectsCSV() {
  const objects = window.SCENE3D?.listObjects() || [];
  if (!objects.length) { showMapToast("No 3D objects to export"); return; }
  const headers = ["Label", "Type", "Phase", "Width (ft, approx.)", "Depth (ft, approx.)", "Height (ft, approx.)", "Rotation (deg)", "Footprint (sq ft, approx.)", "Length (ft, approx.)", "Constraint Status"];
  const rows = [headers];
  objects.forEach(o => {
    const wFt = Math.round((o.footprint.width || 0) * METERS_TO_FEET_3D);
    const dFt = Math.round((o.footprint.depth || 0) * METERS_TO_FEET_3D);
    const hFt = Math.round((o.height || 0) * METERS_TO_FEET_3D);
    rows.push([
      o.label, o.type, o.phase, wFt, dFt, hFt, Math.round(o.rotationDeg || 0),
      o.metrics.footprintSqft != null ? o.metrics.footprintSqft : "",
      o.metrics.lengthFt != null ? o.metrics.lengthFt : "",
      (o.constraint && o.constraint.status) || "unknown",
    ]);
  });
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: `3d-site-objects-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  showMapToast(`Exported ${objects.length} object${objects.length !== 1 ? "s" : ""}`);
}

function exportScene3dJSON() {
  const state = window.SCENE3D?.captureState();
  if (!state) { showMapToast("Open 3D mode first to export the scene."); return; }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: `3d-scene-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  showMapToast("3D scene exported as JSON");
}

let _scene3dPresenting = false;
let _scene3dPresentIndex = 0;

/* Hides every editing control, expands the panel to fill most of the
 * viewport, and shows a minimal overlay bar for stepping through saved
 * viewpoints — for showing the current 3D layout to someone without the
 * toolbar/object-list clutter. Does not use the Fullscreen API (the panel
 * itself already becomes near-fullscreen via CSS); that keeps this simple
 * and avoids interacting with the main map's own fullscreen toggle. */
function toggleScene3dPresentationMode() {
  _scene3dPresenting = !_scene3dPresenting;
  const panel = document.getElementById("scene3d-panel");
  const bar   = document.getElementById("scene3d-present-bar");
  const btn   = document.getElementById("scene3d-present");
  if (panel) panel.classList.toggle("scene3d-presenting", _scene3dPresenting);
  if (bar)   bar.hidden = !_scene3dPresenting;
  if (btn)   btn.textContent = _scene3dPresenting ? "Exit Present" : "Present";
  if (_scene3dPresenting) {
    _scene3dPresentIndex = 0;
    renderScene3dPresentBar();
  }
}

function renderScene3dPresentBar() {
  const nameEl = document.getElementById("scene3d-present-vp-name");
  if (!nameEl || !window.SCENE3D) return;
  const vps = window.SCENE3D.listViewpoints();
  if (!vps.length) { nameEl.textContent = "No saved viewpoints — orbit freely"; return; }
  if (_scene3dPresentIndex >= vps.length) _scene3dPresentIndex = 0;
  nameEl.textContent = `${vps[_scene3dPresentIndex].name} (${_scene3dPresentIndex + 1}/${vps.length})`;
}

function _scene3dPresentStep(delta) {
  const vps = window.SCENE3D?.listViewpoints() || [];
  if (!vps.length) return;
  _scene3dPresentIndex = (_scene3dPresentIndex + delta + vps.length) % vps.length;
  window.SCENE3D.applyViewpoint(vps[_scene3dPresentIndex].id);
  renderScene3dPresentBar();
}

function _syncScene3dModeButtons(mode) {
  const moveBtn   = document.getElementById("scene3d-mode-move");
  const rotateBtn = document.getElementById("scene3d-mode-rotate");
  if (moveBtn)   { moveBtn.classList.toggle("active", mode === "translate"); moveBtn.setAttribute("aria-pressed", String(mode === "translate")); }
  if (rotateBtn) { rotateBtn.classList.toggle("active", mode === "rotate"); rotateBtn.setAttribute("aria-pressed", String(mode === "rotate")); }
}

const METERS_TO_FEET_3D = 3.28084;

const SCENE3D_CONSTRAINT_LABELS = {
  conflict: "⚠ Conflict",
  "requires-review": "Review setbacks",
  unknown: "No parcel selected",
};

/* Re-renders the object list + phase filter + setback readout + live
 * metrics + undo/redo/delete button state inside the 3D panel. Called after
 * any object create/edit/delete/undo/redo, on selection change, and after
 * activate()/applyState() so a reopened or restored scene shows its objects
 * immediately rather than an empty list. */
function renderScene3dObjectPanel() {
  const listEl = document.getElementById("scene3d-object-list");
  const metricsEl = document.getElementById("scene3d-metrics");
  const undoBtn = document.getElementById("scene3d-undo");
  const redoBtn = document.getElementById("scene3d-redo");
  const delBtn  = document.getElementById("scene3d-delete");
  const phaseSelect = document.getElementById("scene3d-phase-filter");
  const setbacksEl = document.getElementById("scene3d-setbacks");
  if (!listEl || !window.SCENE3D) return;

  const objects = window.SCENE3D.listObjects();
  listEl.innerHTML = "";
  if (!objects.length) {
    const em = document.createElement("div");
    em.className = "scene3d-obj-empty";
    em.textContent = "No objects yet — use the buttons above to add a conceptual building, parking lot, road, or fence.";
    listEl.appendChild(em);
  } else {
    objects.forEach(obj => {
      const row = document.createElement("div");
      row.className = "scene3d-obj-row" + (obj.selected ? " selected" : "");

      const typeLabel = obj.type.charAt(0).toUpperCase() + obj.type.slice(1);
      let dims;
      if (obj.type === "road" || obj.type === "fence") {
        const lenFt = Math.round((obj.footprint.depth || 0) * METERS_TO_FEET_3D);
        dims = `${lenFt}′ long (approx.)`;
      } else {
        const wFt = Math.round((obj.footprint.width || 0) * METERS_TO_FEET_3D);
        const dFt = Math.round((obj.footprint.depth || 0) * METERS_TO_FEET_3D);
        const hFt = Math.round((obj.height || 0) * METERS_TO_FEET_3D);
        dims = `${wFt}′ × ${dFt}′ × ${hFt}′ (approx.)`;
      }
      const constraintStatus = (obj.constraint && obj.constraint.status) || "unknown";
      const constraintLabel = SCENE3D_CONSTRAINT_LABELS[constraintStatus] || "";
      const constraintTitle = (obj.constraint && obj.constraint.reasons || []).join(" ");

      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "scene3d-obj-select";
      selectBtn.title = constraintTitle;
      selectBtn.innerHTML =
        `<span class="scene3d-obj-label">${obj.label} <span class="scene3d-obj-type">${typeLabel} · Phase ${obj.phase}</span></span>` +
        `<span class="scene3d-obj-dims">${dims}</span>` +
        (constraintStatus === "conflict" ? `<span class="scene3d-obj-flag scene3d-obj-flag-conflict">${constraintLabel}</span>` : "");
      selectBtn.addEventListener("click", () => window.SCENE3D.selectObject(obj.id));

      const delRowBtn = document.createElement("button");
      delRowBtn.type = "button";
      delRowBtn.className = "scene3d-obj-del";
      delRowBtn.setAttribute("aria-label", `Delete ${obj.label}`);
      delRowBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      delRowBtn.addEventListener("click", () => {
        window.SCENE3D.selectObject(obj.id);
        window.SCENE3D.deleteSelected();
      });

      row.appendChild(selectBtn);
      row.appendChild(delRowBtn);
      listEl.appendChild(row);
    });
  }

  if (phaseSelect) {
    const phases = window.SCENE3D.listPhases();
    const currentVal = phaseSelect.value;
    phaseSelect.innerHTML = `<option value="">All phases</option>` +
      phases.map(p => `<option value="${p}">Phase ${p}</option>`).join("");
    if (phases.some(p => String(p) === currentVal)) phaseSelect.value = currentVal;
  }

  if (metricsEl) {
    const m = window.SCENE3D.getMetrics();
    if (!m || (m.buildingCount === 0 && m.parkingCount === 0 && m.roadCount === 0 && m.fenceCount === 0)) {
      metricsEl.innerHTML = "";
    } else {
      const coverage = typeof m.coveragePct === "number" ? `${m.coveragePct}% of site (approx.)` : "site area unavailable";
      const parts = [];
      if (m.buildingCount) parts.push(`<span>${m.buildingCount} building${m.buildingCount === 1 ? "" : "s"}, ${m.totalFootprintSqft.toLocaleString()} sq ft footprint (approx.)</span>`);
      if (m.buildingCount) parts.push(`<span>${coverage}</span>`);
      if (m.buildingCount) parts.push(`<span>Max height ${m.maxHeightFt.toLocaleString()} ft (approx.)</span>`);
      if (m.parkingCount) parts.push(`<span>${m.parkingCount} parking area${m.parkingCount === 1 ? "" : "s"}</span>`);
      if (m.roadCount) parts.push(`<span>${m.roadCount} road segment${m.roadCount === 1 ? "" : "s"}, ${m.roadLengthFt.toLocaleString()} ft total (approx.)</span>`);
      if (m.fenceCount) parts.push(`<span>${m.fenceCount} fence segment${m.fenceCount === 1 ? "" : "s"}, ${m.fenceLengthFt.toLocaleString()} ft total (approx.)</span>`);
      metricsEl.innerHTML = parts.join("");
    }

    if (setbacksEl) {
      if (m && m.setbacks) {
        const s = m.setbacks;
        setbacksEl.hidden = false;
        setbacksEl.innerHTML = `Zoning setbacks for manual review — front ${s.front ?? "—"}′, side ${s.side ?? "—"}′, rear ${s.rear ?? "—"}′. Not verified against object positions geometrically.`;
      } else {
        setbacksEl.hidden = true;
        setbacksEl.innerHTML = "";
      }
    }
  }

  const counts = window.SCENE3D.historyCounts();
  if (undoBtn) undoBtn.disabled = !counts.undo;
  if (redoBtn) redoBtn.disabled = !counts.redo;
  if (delBtn)  delBtn.disabled = !objects.some(o => o.selected);
}

/* ── Suitability mode ── */
function toggleSuitabilityMode() {
  _suitMode = !_suitMode;
  if (_suitMode && _wsMode)      { _wsMode = false; _syncWsBtn(); }
  if (_suitMode && _densityMode) { _densityMode = false; _syncDensityBtn(); }
  const btn = document.getElementById("gis-suitability");
  if (btn) {
    btn.classList.toggle("active", _suitMode);
    btn.setAttribute("aria-pressed", String(_suitMode));
    btn.setAttribute("title", _suitMode ? "Suitability mode — click to restore restriction view (S)" : "Suitability score view — color counties by A–F grade (S)");
  }
  if (countyGeoLayer) countyGeoLayer.setStyle(countyStyle);
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
  }
  renderLegend();
  _syncMapModeBar();
  showMapToast(_suitMode
    ? "Suitability mode: counties colored A (green) → F (red)"
    : "Restriction view restored");
}

function _syncMapModeBar() {
  const bar = document.getElementById("map-mode-bar");
  if (!bar) return;
  const active = _densityMode ? "density" : _wsMode ? "water" : _suitMode ? "suitability" : "severity";
  bar.querySelectorAll(".map-mode-chip").forEach(chip => {
    const on = chip.dataset.mode === active;
    chip.classList.toggle("active", on);
    chip.setAttribute("aria-pressed", String(on));
  });
}

function _syncWsBtn() {
  const btn = document.getElementById("gis-water-stress");
  if (!btn) return;
  btn.classList.toggle("active", _wsMode);
  btn.setAttribute("aria-pressed", String(_wsMode));
  btn.setAttribute("title", _wsMode
    ? "Water stress mode — click to restore restriction view (V)"
    : "Water stress view — color counties by WRI stress level (V)");
}

function toggleWaterStressMode() {
  _wsMode = !_wsMode;
  if (_wsMode && _suitMode) { _suitMode = false; const sb = document.getElementById("gis-suitability"); if (sb) { sb.classList.remove("active"); sb.setAttribute("aria-pressed","false"); } }
  if (_wsMode && _densityMode) { _densityMode = false; _syncDensityBtn(); }
  _syncWsBtn();
  if (countyGeoLayer) countyGeoLayer.setStyle(countyStyle);
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
  }
  renderLegend();
  _syncMapModeBar();
  showMapToast(_wsMode
    ? "Water stress mode: Low (blue) → Extremely High (red)"
    : "Restriction view restored");
}

function _syncDensityBtn() {
  const btn = document.getElementById("gis-infrastructure-density");
  if (!btn) return;
  btn.classList.toggle("active", _densityMode);
  btn.setAttribute("aria-pressed", String(_densityMode));
  btn.setAttribute("title", _densityMode
    ? "Density mode — click to restore restriction view (I)"
    : "Infrastructure density — color counties by facility count (I)");
}

async function toggleDensityMode() {
  _densityMode = !_densityMode;
  if (_densityMode && _suitMode) { _suitMode = false; const sb = document.getElementById("gis-suitability"); if (sb) { sb.classList.remove("active"); sb.setAttribute("aria-pressed","false"); } }
  if (_densityMode && _wsMode)   { _wsMode   = false; _syncWsBtn(); }

  if (_densityMode && !_densityCache) {
    showMapToast("Loading infrastructure data…");
    try {
      const [dcRes, campRes] = await Promise.all([
        fetch("data/data_centers.json"),
        fetch("data/ai_campuses.json"),
      ]);
      // Both files are objects with the records nested under a key, not bare
      // arrays — spreading the raw response threw "dcs is not iterable" and the
      // Infrastructure Density view mode failed on every click. js/analytics.js
      // already unwraps these correctly; this now matches.
      const dcJson   = await dcRes.json();
      const campJson = await campRes.json();
      const dcs   = Array.isArray(dcJson)   ? dcJson   : (dcJson.data_centers  || []);
      const camps = Array.isArray(campJson) ? campJson : (campJson.ai_campuses || []);
      const cache  = {};
      for (const f of [...dcs, ...camps]) {
        const fips = f.fips || f.county_fips;
        if (fips) cache[fips] = (cache[fips] || 0) + 1;
      }
      _densityCache = cache;
      window.DC_DENSITY_BY_FIPS = cache;
    } catch (err) {
      console.error("Density load failed:", err);
      _densityMode = false;
      _syncDensityBtn();
      showMapToast("Failed to load facility data");
      return;
    }
  }

  _syncDensityBtn();
  if (countyGeoLayer) countyGeoLayer.setStyle(countyStyle);
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
  }
  renderLegend();
  _syncMapModeBar();
  showMapToast(_densityMode
    ? "Infrastructure density: darker blue = more facilities"
    : "Restriction view restored");
}

/* ── Site Screener ── */
function toggleSiteScreener() {
  const panel = document.getElementById("screener-panel");
  const btn   = document.getElementById("gis-screener");
  if (!panel) return;
  const opening = panel.hidden;
  panel.hidden = !opening;
  if (btn) {
    btn.classList.toggle("active", opening);
    btn.setAttribute("aria-pressed", String(opening));
  }
  if (opening) _populateScreenerStates();
}

function _populateScreenerStates() {
  const sel = document.getElementById("scr-state");
  if (!sel || sel.options.length > 1) return;
  const seen = new Set();
  for (const fips in mapData) seen.add(mapData[fips].state);
  const states = [...seen].sort();
  for (const st of states) {
    const opt = document.createElement("option");
    opt.value = st;
    opt.textContent = st;
    sel.appendChild(opt);
  }
}

function runSiteScreener() {
  const restrictionVal = document.getElementById("scr-restriction")?.value || "any";
  const suitVal        = document.getElementById("scr-suitability")?.value || "any";
  const wsVal          = document.getElementById("scr-water-stress")?.value || "any";
  const stateVal       = document.getElementById("scr-state")?.value || "";
  const requireInc     = document.getElementById("scr-require-incentive")?.checked || false;

  const wsData  = window.DC_WATER_STRESS_FULL || {};
  const incData = window.DC_INCENTIVES_FIPS   || {};
  const matches = new Set();
  const ranked  = [];

  for (const fips in mapData) {
    const county = mapData[fips];

    // State filter
    if (stateVal && county.state !== stateVal) continue;

    // Restriction level filter
    if (restrictionVal !== "any") {
      const sevKey = getSeverityKey(county);
      if (restrictionVal === "no-ban"      && sevKey === "ban")                         continue;
      if (restrictionVal === "no-high"     && (sevKey === "ban" || sevKey === "high"))  continue;
      if (restrictionVal === "no-moderate" && !["none","pro","proposed"].includes(sevKey)) continue;
      if (restrictionVal === "pro-none"    && !["none","pro"].includes(sevKey))         continue;
    }

    // Water stress filter
    if (wsVal !== "any") {
      const level = wsData[fips];
      if (level === undefined || level === null || level > parseInt(wsVal, 10)) continue;
    }

    // Incentive filter
    if (requireInc && !incData[fips]) continue;

    // Suitability filter — uses computeSuitabilityScore (cached)
    const suit = computeSuitabilityScore(fips, county);
    if (suitVal !== "any") {
      const minScore = { A: 80, B: 65, C: 45 }[suitVal] || 0;
      if (suit.score < minScore) continue;
    }

    matches.add(fips);
    ranked.push({ fips, county, score: suit.score, grade: suit.grade });
  }

  _screenerMatches = matches;
  _screenerActive  = matches.size > 0;
  ranked.sort((a, b) => b.score - a.score);
  _screenerRanked  = ranked;

  if (countyGeoLayer) countyGeoLayer.setStyle(countyStyle);
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
  }

  // Render results
  const resultsEl  = document.getElementById("screener-results");
  const countEl    = document.getElementById("screener-count");
  const listEl     = document.getElementById("screener-list");
  const exportBtn  = document.getElementById("screener-export-csv");
  if (!resultsEl || !countEl || !listEl) return;

  const total = ranked.length;
  const show  = ranked.slice(0, 15);

  countEl.textContent = total === 0
    ? "No counties match your criteria"
    : `${total.toLocaleString()} matching ${total === 1 ? "county" : "counties"}`;

  if (exportBtn) exportBtn.hidden = total === 0;

  listEl.innerHTML = "";
  for (const r of show) {
    const row = document.createElement("div");
    row.className = "scr-result-row";
    row.dataset.fips = r.fips;
    const gradeClass = { A: "scr-grade-a", B: "scr-grade-b", C: "scr-grade-c", D: "scr-grade-d", F: "scr-grade-f" }[r.grade] || "";
    row.innerHTML =
      `<span class="scr-result-grade ${gradeClass}">${escHtml(r.grade)}</span>` +
      `<span class="scr-result-name">${escHtml(r.county.name || r.fips)}</span>` +
      `<span class="scr-result-state">${escHtml(r.county.state || "")}</span>`;
    row.addEventListener("click", () => {
      selectCounty(r.fips);
      zoomToFeature(r.fips);
    });
    listEl.appendChild(row);
  }

  if (total > 15) {
    const more = document.createElement("div");
    more.className = "scr-result-more";
    more.textContent = `+${total - 15} more — download CSV to see all`;
    listEl.appendChild(more);
  }

  resultsEl.hidden = false;
  if (total === 0) showMapToast("No counties match those criteria");
  else showMapToast(`${total} matching ${total === 1 ? "county" : "counties"} highlighted`);
}

function clearSiteScreener() {
  _screenerMatches = new Set();
  _screenerActive  = false;
  _screenerRanked  = [];
  if (countyGeoLayer) countyGeoLayer.setStyle(countyStyle);
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
  }
  const resultsEl = document.getElementById("screener-results");
  if (resultsEl) resultsEl.hidden = true;
  showMapToast("Screener cleared");
}

function exportScreenerCSV() {
  if (!_screenerRanked.length) { showMapToast("Run the screener first"); return; }
  const wsData  = window.DC_WATER_STRESS_FULL || {};
  const incData = window.DC_INCENTIVES_FIPS   || {};
  const WS_LABELS = ["Low","Low-Medium","Medium-High","High","Extreme High"];
  const headers = ["Rank","FIPS","County","State","Suitability Score","Suitability Grade","Restriction Severity","Policy Types","Water Stress","Has Incentive","Effective Date"];
  const rows = [headers];
  _screenerRanked.forEach(({ fips, county, score, grade }, i) => {
    const sevKey = getSeverityKey(county);
    const ws     = wsData[fips];
    rows.push([
      i + 1,
      fips,
      county.name || "",
      county.state || "",
      score,
      grade,
      SEVERITY[sevKey]?.label || "",
      (county.types || []).map(t => TYPE_LABELS[t] || t).join("; "),
      ws !== undefined && ws !== null ? `${ws} – ${WS_LABELS[ws] || ws}` : "",
      incData[fips] ? "Yes" : "No",
      county.effective_date || "",
    ]);
  });
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: `screener-results-${new Date().toISOString().slice(0,10)}.csv` });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  showMapToast(`Exported ${_screenerRanked.length} screener matches`);
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
  window.leafletMap = leafletMap; // expose for parcel renderer and other cross-module consumers

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
    if (radiusMode)       { _placeRadiusCenter(e.latlng); return; }
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

  // Auto-persist map view to localStorage so reload restores last position
  const MAP_VIEW_KEY = "dc-map-view-v1";
  function _saveMapView() {
    try {
      const c = leafletMap.getCenter();
      localStorage.setItem(MAP_VIEW_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, z: leafletMap.getZoom() }));
    } catch (_) {}
  }
  function _restoreMapView() {
    try {
      const raw = localStorage.getItem(MAP_VIEW_KEY);
      if (!raw) return false;
      const { lat, lng, z } = JSON.parse(raw);
      if (typeof lat === "number" && typeof lng === "number" && typeof z === "number") {
        leafletMap.setView([lat, lng], z, { animate: false });
        return true;
      }
    } catch (_) {}
    return false;
  }
  // Restore on first load if no hash permalink is present
  if (!window.location.hash) _restoreMapView();
  leafletMap.on("moveend zoomend", _saveMapView);

  // Update dashboard extent scope when the viewport changes
  leafletMap.on("moveend", () => {
    if (_dashScope === "extent") updateDashboardScopedCards();
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
  document.getElementById("gis-radius")        ?.addEventListener("click", toggleRadius);
  document.getElementById("gis-export")        ?.addEventListener("click", _toggleExportMenu);
  document.getElementById("exp-csv")           ?.addEventListener("click", () => { document.getElementById("export-menu").hidden = true; exportCountiesCSV(); });
  document.getElementById("exp-geojson")       ?.addEventListener("click", () => { document.getElementById("export-menu").hidden = true; exportCountiesGeoJSON(); });
  document.getElementById("exp-report")        ?.addEventListener("click", () => { document.getElementById("export-menu").hidden = true; openPrintReport(); });
  document.getElementById("gis-share")         ?.addEventListener("click", shareCurrentView);
  document.getElementById("gis-print")         ?.addEventListener("click", printMap);
  document.getElementById("gis-minimap")       ?.addEventListener("click", toggleMinimap);
  document.getElementById("gis-political-risk")?.addEventListener("click", togglePoliticalRiskLayer);
  document.getElementById("gis-suitability")?.addEventListener("click", toggleSuitabilityMode);
  document.getElementById("gis-water-stress")?.addEventListener("click", toggleWaterStressMode);
  document.getElementById("gis-infrastructure-density")?.addEventListener("click", toggleDensityMode);
  document.getElementById("gis-screener")?.addEventListener("click", toggleSiteScreener);

  // Map mode bar chip clicks
  document.getElementById("map-mode-bar")?.addEventListener("click", e => {
    const chip = e.target.closest(".map-mode-chip");
    if (!chip) return;
    const mode = chip.dataset.mode;
    if (mode === "severity") {
      if (_suitMode)    toggleSuitabilityMode();
      else if (_wsMode) toggleWaterStressMode();
      else if (_densityMode) toggleDensityMode();
    } else if (mode === "suitability") {
      if (!_suitMode) toggleSuitabilityMode();
    } else if (mode === "water") {
      if (!_wsMode) toggleWaterStressMode();
    } else if (mode === "density") {
      if (!_densityMode) toggleDensityMode();
    }
  });
  _syncMapModeBar();
  document.getElementById("gis-results")        ?.addEventListener("click", () => window.RESULTS_PANEL?.toggle());

  // Save button: toggle save/unsave for current county or facility
  const _saveBtnEl = document.getElementById('detail-save-btn');
  if (_saveBtnEl) {
    _saveBtnEl.addEventListener('click', async () => {
      const auth = window.AUTH;
      if (!auth || auth.state !== 'signedIn') {
        document.getElementById('auth-btn')?.click();
        return;
      }
      if (!_saveCurrentType || !_saveCurrentId) return;
      const savedSet = _saveCurrentType === 'county' ? _savedCountySet : _savedFacilitySet;
      const isSaved  = savedSet.has(_saveCurrentId);
      _saveBtnEl.disabled = true;
      if (isSaved) {
        await auth.removeItem(_saveCurrentType, _saveCurrentId);
        savedSet.delete(_saveCurrentId);
      } else {
        await auth.saveItem(_saveCurrentType, _saveCurrentId, _saveCurrentData || {});
        savedSet.add(_saveCurrentId);
      }
      _saveBtnEl.disabled = false;
      _updateDetailSaveBtn();
    });
  }

  // Report button: generate county due-diligence report
  const _reportBtnEl = document.getElementById("detail-report-btn");
  if (_reportBtnEl) {
    _reportBtnEl.addEventListener("click", () => {
      if (_reportFips && window.REPORT) {
        window.REPORT.generate(_reportFips, _reportName, _reportState, _reportCounty);
      }
    });
  }

  // Watch button: toggle county watchlist (localStorage, no auth required)
  document.getElementById("detail-watch-btn")?.addEventListener("click", () => {
    if (selectedFips) toggleWatchCounty(selectedFips);
  });

  // Share button: copy county permalink to clipboard
  document.getElementById("detail-share-btn")?.addEventListener("click", () => {
    _copyCountyLink(selectedFips);
  });

  // Refresh save cache when auth state changes
  document.addEventListener('auth:stateChange', ({ detail }) => {
    _refreshSavedCache().then(() => _updateDetailSaveBtn());
    if (_wsVisible) renderWorkspaceList();
  });

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

  // Radius readout — preset buttons + clear button
  const _radiusReadoutEl = document.getElementById('radius-readout');
  if (_radiusReadoutEl) {
    _radiusReadoutEl.querySelectorAll('.radius-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const km = parseFloat(btn.dataset.km);
        if (!isNaN(km)) setRadiusFromPreset(km);
      });
    });
    L.DomEvent.disableClickPropagation(_radiusReadoutEl);
  }
  const _radiusClearBtn = document.getElementById('radius-clear-btn');
  if (_radiusClearBtn) {
    const _doClearRadius = () => {
      if (radiusMode) toggleRadius();
      else clearRadius();
    };
    _radiusClearBtn.addEventListener('click', _doClearRadius);
    _radiusClearBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    _radiusClearBtn.addEventListener('touchend',   e => { e.preventDefault(); e.stopPropagation(); _doClearRadius(); }, { passive: false });
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
    if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey) toggleRadius();
    if ((e.key === "l" || e.key === "L") && !e.ctrlKey && !e.metaKey) window.RESULTS_PANEL?.toggle();
    if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) toggleFullscreen();
    if ((e.key === "w" || e.key === "W") && !e.ctrlKey && !e.metaKey) toggleWorkspaces();
    if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey) toggleScene3D();
    if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey) toggleComparePanel();
    if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey) toggleSuitabilityMode();
    if ((e.key === "v" || e.key === "V") && !e.ctrlKey && !e.metaKey) toggleWaterStressMode();
    if ((e.key === "i" || e.key === "I") && !e.ctrlKey && !e.metaKey) toggleDensityMode();
    if ((e.key === "x" || e.key === "X") && !e.ctrlKey && !e.metaKey) toggleSiteScreener();
    if (e.key === "Escape" && measureMode)      toggleMeasure();
    if (e.key === "Escape" && drawMode)         toggleDraw();
    if (e.key === "Escape" && candidatePinMode) toggleCandidatePin();
    if (e.key === "Escape" && radiusMode)       toggleRadius();
    if (e.key === "Escape" && _wsVisible)       toggleWorkspaces();
    if (e.key === "Escape" && _scene3dVisible)  toggleScene3D();
    if (e.key === "Escape" && compareMode)      toggleComparePanel();
  });

  initContextMenu();
  initBookmarks();

  // Compare panel wiring
  document.getElementById("gis-compare")       ?.addEventListener("click", toggleComparePanel);
  document.getElementById("compare-close-btn") ?.addEventListener("click", toggleComparePanel);
  document.getElementById("compare-clear-btn") ?.addEventListener("click", clearCompare);
  document.getElementById("compare-report-btn")?.addEventListener("click", generateCompareReport);
  document.getElementById("compare-csv-btn")   ?.addEventListener("click", exportCompareCsv);

  document.getElementById("detail-compare-btn")?.addEventListener("click", () => {
    if (_compareBtnFips) {
      addToCompare(_compareBtnFips);
      _updateDetailCompareBtn(_compareBtnFips);
    } else if (_compareBtnFacility) {
      addFacilityToCompare(_compareBtnFacility);
      _updateDetailFacilityCompareBtn(_compareBtnFacility);
    }
  });

  // Workspace panel wiring
  document.getElementById("gis-workspace")    ?.addEventListener("click", toggleWorkspaces);
  document.getElementById("workspace-close")  ?.addEventListener("click", toggleWorkspaces);
  document.getElementById("workspace-save-btn")?.addEventListener("click", saveCurrentWorkspace);
  document.getElementById("workspace-name-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); saveCurrentWorkspace(); }
  });

  // 3D terrain view panel wiring
  document.getElementById("gis-3d")           ?.addEventListener("click", toggleScene3D);
  document.getElementById("scene3d-close")    ?.addEventListener("click", toggleScene3D);
  document.getElementById("scene3d-terrain-toggle")?.addEventListener("change", e => {
    setLayerVisible("terrain_3d", e.target.checked, true);
  });
  document.getElementById("scene3d-exaggeration")?.addEventListener("input", e => {
    const exaggeration = Number(e.target.value) || 1.5;
    const state = window.SCENE3D?.captureState();
    if (state) window.SCENE3D.applyState(Object.assign({}, state, { exaggeration }));
  });

  // 3D object toolbar (Phase B/C — building/parking/road/fence, selection, undo/redo)
  document.getElementById("scene3d-add-building")?.addEventListener("click", () => {
    window.SCENE3D?.createObject("building");
  });
  document.getElementById("scene3d-add-parking")?.addEventListener("click", () => {
    window.SCENE3D?.createObject("parking");
  });
  document.getElementById("scene3d-add-road")?.addEventListener("click", () => {
    window.SCENE3D?.createObject("road");
  });
  document.getElementById("scene3d-add-fence")?.addEventListener("click", () => {
    window.SCENE3D?.createObject("fence");
  });
  document.getElementById("scene3d-phase-filter")?.addEventListener("change", e => {
    const val = e.target.value;
    window.SCENE3D?.setPhaseFilter(val === "" ? null : Number(val));
  });
  document.getElementById("scene3d-mode-move")?.addEventListener("click", () => {
    window.SCENE3D?.setTransformMode("translate");
    _syncScene3dModeButtons("translate");
  });
  document.getElementById("scene3d-mode-rotate")?.addEventListener("click", () => {
    window.SCENE3D?.setTransformMode("rotate");
    _syncScene3dModeButtons("rotate");
  });
  document.getElementById("scene3d-undo")?.addEventListener("click", () => window.SCENE3D?.undo());
  document.getElementById("scene3d-redo")?.addEventListener("click", () => window.SCENE3D?.redo());
  document.getElementById("scene3d-delete")?.addEventListener("click", () => window.SCENE3D?.deleteSelected());
  ["scene3d:objects-changed", "scene3d:object-selected", "scene3d:object-deselected"].forEach(evt => {
    document.addEventListener(evt, renderScene3dObjectPanel);
  });

  // 3D templates + campus generator (Phase D)
  document.getElementById("scene3d-template-add")?.addEventListener("click", () => {
    const select = document.getElementById("scene3d-template-select");
    if (select && select.value) window.SCENE3D?.instantiateTemplate(select.value);
  });
  document.getElementById("scene3d-campus-generate")?.addEventListener("click", () => {
    const num = id => Number(document.getElementById(id)?.value) || 0;
    const checked = id => !!document.getElementById(id)?.checked;
    const result = window.SCENE3D?.generateCampus({
      hallWidth: num("scene3d-campus-hall-width"),
      hallDepth: num("scene3d-campus-hall-depth"),
      hallHeight: num("scene3d-campus-hall-height"),
      spacing: num("scene3d-campus-spacing"),
      marginM: num("scene3d-campus-margin"),
      targetHallCount: num("scene3d-campus-count"),
      includeSubstation: checked("scene3d-campus-substation"),
      includeFence: checked("scene3d-campus-fence"),
      includeAccessRoad: checked("scene3d-campus-road"),
    });
    const resultEl = document.getElementById("scene3d-campus-result");
    if (resultEl && result) {
      resultEl.hidden = false;
      const lines = [];
      if (result.createdCount) lines.push(`Generated ${result.halls.length} data hall(s), ${result.substations.length} substation(s), ${result.fences.length} fence segment(s), ${result.roads.length} road stub(s).`);
      (result.warnings || []).forEach(w => lines.push("⚠ " + w));
      if (result.disclaimer) lines.push(result.disclaimer);
      resultEl.innerHTML = lines.map(l => `<div>${l}</div>`).join("");
    }
  });

  // 3D saved viewpoints (Phase D)
  document.getElementById("scene3d-viewpoint-save")?.addEventListener("click", () => {
    window.SCENE3D?.saveViewpoint();
    renderScene3dViewpoints();
  });

  // 3D sun position (Phase D)
  document.getElementById("scene3d-sun-datetime")?.addEventListener("change", e => {
    const val = e.target.value; // "YYYY-MM-DDTHH:mm", interpreted as local time by the browser
    if (!val) return;
    const date = new Date(val);
    if (!isNaN(date)) { window.SCENE3D?.setSunTime(date.toISOString()); renderScene3dSunInfo(); }
  });
  document.getElementById("scene3d-sun-now")?.addEventListener("click", () => {
    const input = document.getElementById("scene3d-sun-datetime");
    if (input) input.value = "";
    window.SCENE3D?.setSunTime(null);
    renderScene3dSunInfo();
  });

  // 3D export (Phase E)
  document.getElementById("scene3d-export-image")?.addEventListener("click", exportScene3dImage);
  document.getElementById("scene3d-export-csv")  ?.addEventListener("click", exportScene3dObjectsCSV);
  document.getElementById("scene3d-export-json") ?.addEventListener("click", exportScene3dJSON);
  document.getElementById("scene3d-present")     ?.addEventListener("click", toggleScene3dPresentationMode);
  document.getElementById("scene3d-present-prev")?.addEventListener("click", () => _scene3dPresentStep(-1));
  document.getElementById("scene3d-present-next")?.addEventListener("click", () => _scene3dPresentStep(1));
  document.getElementById("scene3d-present-exit")?.addEventListener("click", toggleScene3dPresentationMode);

  document.getElementById("workspace-export-btn")?.addEventListener("click", exportWorkspacesJSON);
  document.getElementById("workspace-import-btn")?.addEventListener("click", () => {
    document.getElementById("workspace-import-file")?.click();
  });
  document.getElementById("workspace-import-file")?.addEventListener("change", e => {
    importWorkspacesJSON(e.target.files?.[0]);
    e.target.value = "";
  });

  // Screener panel wiring
  document.getElementById("screener-close")      ?.addEventListener("click", toggleSiteScreener);
  document.getElementById("screener-run")        ?.addEventListener("click", runSiteScreener);
  document.getElementById("screener-clear")      ?.addEventListener("click", clearSiteScreener);
  document.getElementById("screener-export-csv") ?.addEventListener("click", exportScreenerCSV);

  // Close export menu when clicking outside it
  document.addEventListener("click", e => {
    const menu = document.getElementById("export-menu");
    const btn  = document.getElementById("gis-export");
    if (menu && !menu.hidden && !menu.contains(e.target) && e.target !== btn) {
      menu.hidden = true;
      btn?.setAttribute("aria-expanded", "false");
    }
  });

  // Prevent Leaflet from intercepting touch/click events on all map overlay elements.
  // Without this, Leaflet's touchstart handler on the map can swallow taps on
  // absolutely-positioned controls on iOS Safari.
  [
    "map-gis-bar", "measure-readout", "draw-readout", "bookmarks-panel", "workspace-panel", "compare-panel", "screener-panel", "export-menu", "map-ctx-menu",
    "ws-settings-panel", "ws-settings-backdrop",
    "minimap-wrap", "legend", "legend-restore", "stats-bar", "filter-status",
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) L.DomEvent.disableClickPropagation(el);
  });
  // Prevent scroll-wheel/pinch inside overlay panels from zooming the map
  ["bookmarks-list", "workspace-list", "compare-body", "screener-results", "legend"].forEach(id => {
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
  activeStateFilter  = "";
  activeTypeFilters.clear();
  activeStatusFilters.clear();
  activeDateFilter   = null;
  activeWsMaxFilter  = null;
  activeSuitMinFilter = null;
  _saveFilterState();
  applyFilters();
  syncAdvancedFilterUI();
}

function _saveFilterState() {
  try {
    localStorage.setItem("dc-advanced-filters-v1", JSON.stringify({
      restrict:   [...activeRestrictFilters],
      state:      activeStateFilter,
      types:      [...activeTypeFilters],
      typeMode:   typeFilterMode,
      status:     [...activeStatusFilters],
      dateFilter: activeDateFilter,
      wsMax:      activeWsMaxFilter,
      suitMin:    activeSuitMinFilter,
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
    if (typeof s.dateFilter === "string" && /^\d{4}$/.test(s.dateFilter)) activeDateFilter = s.dateFilter;
    if (typeof s.wsMax === "number" && s.wsMax >= 0 && s.wsMax <= 4) activeWsMaxFilter = s.wsMax;
    if (typeof s.suitMin === "number" && s.suitMin >= 0) activeSuitMinFilter = s.suitMin;
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
  if (_dashScope === "filtered") updateDashboardScopedCards();
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
  if (activeWsMaxFilter !== null) {
    const WS_LABELS = ["Low", "Low-Med", "Med-High", "High", "Extreme"];
    parts.push(`Water ≤ ${WS_LABELS[activeWsMaxFilter] || activeWsMaxFilter}`);
  }
  if (activeSuitMinFilter !== null) {
    const g = activeSuitMinFilter >= 80 ? "A" : activeSuitMinFilter >= 65 ? "B" : "C";
    parts.push(`Suitability ≥ ${g}`);
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
    /* Economic layer takes precedence in the legend for the same reason it does
       in getColor(): while it is on, it is what the county fills mean. Turning
       it off falls through to whichever mode was previously active, so the
       restriction legend returns on its own. */
    if (_econModeActive()) {
      const lg = window.ECONOMY_MAP.legend();
      const h = document.createElement("h2");
      h.textContent = lg ? lg.title : "Economic Data";
      legendBody.appendChild(h);

      for (const row of (lg ? lg.rows : [])) {
        const el = document.createElement("div");
        el.className = "legend-item";
        const sw = document.createElement("div");
        sw.className = "legend-swatch";
        sw.style.background = row.color;
        const wrap = document.createElement("div");
        const lbl = document.createElement("div");
        lbl.className = "legend-label-main";
        lbl.textContent = row.label;     // textContent: values are formatted data
        wrap.appendChild(lbl);
        el.appendChild(sw);
        el.appendChild(wrap);
        legendBody.appendChild(el);
      }

      const note = document.createElement("div");
      note.className = "legend-suit-note";
      note.textContent = lg
        ? `${lg.source} — ${lg.count.toLocaleString()} counties with a value. Quantile breaks.`
        : "Economic data unavailable";
      legendBody.appendChild(note);

      const note2 = document.createElement("div");
      note2.className = "legend-suit-note";
      note2.textContent = "Turn the layer off in Layers to restore the policy restriction colours.";
      legendBody.appendChild(note2);
    } else if (_densityMode) {
      const h = document.createElement("h2");
      h.textContent = "Infrastructure Density";
      legendBody.appendChild(h);

      for (const t of DENSITY_TIERS) {
        const el = document.createElement("div");
        el.className = "legend-item";
        el.innerHTML = `
          <div class="legend-swatch" style="background:${t.color};"></div>
          <div>
            <div class="legend-label-main">${t.label}</div>
          </div>`;
        legendBody.appendChild(el);
      }

      const noDataEl = document.createElement("div");
      noDataEl.className = "legend-item";
      noDataEl.innerHTML = `
        <div class="legend-swatch" style="background:${themeColors().noData};"></div>
        <div><div class="legend-label-main">No facilities</div></div>`;
      legendBody.appendChild(noDataEl);

      const note = document.createElement("div");
      note.className = "legend-suit-note";
      note.textContent = "Source: Data Centers + AI Campus locations (~3,300 facilities)";
      legendBody.appendChild(note);
    } else if (_wsMode) {
      const h = document.createElement("h2");
      h.textContent = "Water Stress Level";
      legendBody.appendChild(h);

      const wsItems = [
        { level: 0, color: WATER_STRESS_COLORS[0], label: "Low",             sub: "Score 0 — minimal demand vs. supply" },
        { level: 1, color: WATER_STRESS_COLORS[1], label: "Low-Medium",       sub: "Score 1 — manageable stress" },
        { level: 2, color: WATER_STRESS_COLORS[2], label: "Medium-High",      sub: "Score 2 — elevated competition" },
        { level: 3, color: WATER_STRESS_COLORS[3], label: "High",             sub: "Score 3 — significant supply risk" },
        { level: 4, color: WATER_STRESS_COLORS[4], label: "Extremely High",   sub: "Score 4 — critical water scarcity" },
      ];
      for (const item of wsItems) {
        const el = document.createElement("div");
        el.className = "legend-item";
        el.innerHTML = `
          <div class="legend-swatch" style="background:${item.color};"></div>
          <div>
            <div class="legend-label-main">${item.label}</div>
            <div class="legend-label-sub">${item.sub}</div>
          </div>`;
        legendBody.appendChild(el);
      }

      const note = document.createElement("div");
      note.className = "legend-suit-note";
      note.textContent = "Source: WRI Aqueduct · USGS Water Use · EPA drought data (approx.)";
      legendBody.appendChild(note);
    } else if (_suitMode) {
      const h = document.createElement("h2");
      h.textContent = "Suitability Score";
      legendBody.appendChild(h);

      const suitItems = [
        { grade: "A", label: "Highly Suitable",     sub: "Score 80–100" },
        { grade: "B", label: "Suitable",             sub: "Score 65–79" },
        { grade: "C", label: "Proceed with Caution", sub: "Score 45–64" },
        { grade: "D", label: "High Risk",            sub: "Score 25–44" },
        { grade: "F", label: "Not Suitable",         sub: "Score 0–24" },
      ];
      for (const item of suitItems) {
        const el = document.createElement("div");
        el.className = "legend-item";
        el.innerHTML = `
          <div class="legend-swatch" style="background:${SUIT_GRADE_COLORS[item.grade]};"></div>
          <div>
            <div class="legend-label-main">${item.grade} — ${item.label}</div>
            <div class="legend-label-sub">${item.sub}</div>
          </div>`;
        legendBody.appendChild(el);
      }

      const note = document.createElement("div");
      note.className = "legend-suit-note";
      note.textContent = "Factors: Regulatory 50% · Political 30% · Scope 20%";
      legendBody.appendChild(note);
    } else {
      const h = document.createElement("h2");
      h.textContent = "Restriction Severity";
      legendBody.appendChild(h);

      const items = [
        { key: "ban",      sub: "Outright prohibition or moratorium" },
        { key: "high",     sub: "Active, significant limits — verified" },
        { key: "moderate", sub: "Active, light-to-moderate limits — verified" },
        { key: "proposed", sub: "Pending / not yet enacted" },
        { key: "none",     sub: "Researched — no known restrictions found" },
        { key: "pro",      sub: "Verified tax incentives or active development hub" },
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

      // Add "Not yet researched" entry so the dark background color is explained
      const noResEl = document.createElement("div");
      noResEl.className = "legend-item";
      noResEl.innerHTML = `
        <div class="legend-swatch" style="background:${themeColors().noData};border:1px solid var(--border);"></div>
        <div>
          <div class="legend-label-main">Not yet researched</div>
          <!-- Read from metadata rather than hardcoded. This said 1,678 while the
               real figure is 2,273: it counted the 597 descriptive_only records
               as researched when they carry no policy research at all. -->
          <div class="legend-label-sub">${(window.platformStat
              ? window.platformStat("coverage.counties_not_yet_researched", 2273)
              : 2273).toLocaleString()} counties — no policy data collected</div>
        </div>`;
      legendBody.appendChild(noResEl);

      const coverNote = document.createElement("div");
      coverNote.className = "legend-suit-note";
      coverNote.style.cssText = "margin-top:4px;";
      // Same distinction as the "Not yet researched" note above: descriptive_only
      // records aren't researched, so this can't be Object.keys(mapData).length.
      coverNote.textContent = `${(window.researchedCount ? window.researchedCount() : Object.keys(mapData).length).toLocaleString()} of 3,143 US counties researched`;
      legendBody.appendChild(coverNote);
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

  let _lsDebounce = null;
  const onSearchChange = () => {
    _layerSearch = searchInput.value.trim();
    clearTimeout(_lsDebounce);
    if (!_layerSearch) { _applyLayerSearch(); return; } // clear immediately
    _lsDebounce = setTimeout(_applyLayerSearch, 80); // debounce: 80ms delay for keystrokes
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
        const applyToggle = newState => {
          checkbox.checked = newState;
          setLayerVisible(def.id, newState);
        };
        // A click/tap that lands directly on the switch (it's a real,
        // fully-opaque-to-hit-testing <input> covering the whole toggle-switch
        // area) is handled by the browser's own native checkbox activation —
        // no custom logic needed, and nothing here can race or cancel it out.
        checkbox.addEventListener("change", () => applyToggle(checkbox.checked));
        // Tapping the row OUTSIDE the switch itself (name text, badge, source
        // line) relies on label->control forwarding, which iOS Safari doesn't
        // reliably do when -webkit-user-select:none is set on the label — so
        // handle that case manually. Guarded to e.target !== checkbox so a
        // direct hit on the switch is never double-handled by both this and
        // the native 'change' listener above.
        row.addEventListener("touchend", e => {
          if (e.target === checkbox) return;
          applyToggle(!checkbox.checked);
          e.preventDefault();
        }, { passive: false });
        row.addEventListener("click", e => {
          if (e.target === checkbox) return;
          if (e.defaultPrevented) return;
          e.preventDefault();
          applyToggle(!checkbox.checked);
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
      // FLIP expand: apply expanded state immediately, invert with transform,
      // then animate transform to 0 — keeps height change off the critical path
      // so the whole motion is GPU-accelerated transform only.
      const first = panel.getBoundingClientRect().top;
      panel.style.transition = "none";
      panel.style.transform  = "";
      panel.classList.add("sheet-expanded");
      void panel.getBoundingClientRect(); // force reflow
      panel.style.transform  = `translateY(${first}px)`;

      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dur = prefersReduced ? 10 : 420;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.style.willChange = "transform";
          panel.style.transition = prefersReduced
            ? "transform 10ms, border-radius 10ms"
            : `transform ${dur}ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.3s ease`;
          panel.style.transform  = "translateY(0)";
        });
      });

      // After animation: clean up inline styles and compact the header
      let _flipDone = false;
      const _flipCleanup = () => {
        if (_flipDone) return;
        _flipDone = true;
        panel.removeEventListener("transitionend", _onFlipEnd);
        panel.style.transition = "";
        panel.style.transform  = "";
        panel.style.willChange = "";
        panel.classList.add("sheet-compact");
      };
      const _onFlipEnd = e => { if (e.propertyName === "transform") _flipCleanup(); };
      panel.addEventListener("transitionend", _onFlipEnd);
      setTimeout(_flipCleanup, dur + 80); // fallback

      document.documentElement.style.setProperty("--sheet-top", "0px");
    } else {
      // Snap back to current state.
      panel.style.transition = "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)";
      panel.style.transform  = "translateY(0)";
      setTimeout(() => {
        panel.style.transition = "";
        panel.style.transform  = "";
      }, 340);
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
    try { localStorage.setItem("fp-pos", JSON.stringify(fpSavedPos)); } catch (_) {}
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
    try { localStorage.setItem("fp-size", JSON.stringify(fpSavedSize)); } catch (_) {}
  };
  panel.addEventListener("pointerup",     endFpResize);
  panel.addEventListener("pointercancel", endFpResize);
}

function initDashboardToggle() {
  const btn = document.getElementById("dashboard-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const hidden = document.getElementById("app").classList.toggle("top-hidden");
    btn.setAttribute("aria-label", hidden ? "Expand dashboard" : "Minimize dashboard");
    btn.title = hidden ? "Expand dashboard" : "Minimize dashboard";
    localStorage.setItem("topHidden", hidden ? "1" : "0");
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
    try { localStorage.setItem("lg-pos", JSON.stringify(lgSavedPos)); } catch (_) {}
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

/* ── Dashboard scope ── */
let _dashScope      = "national"; // "national" | "filtered" | "state" | "extent"
let _dashScopeState = "";

function _computeScopeCounties() {
  if (_dashScope === "national") return mapData;

  if (_dashScope === "filtered") {
    const out = {};
    for (const fips in mapData) { if (countyMatchesFilters(fips)) out[fips] = mapData[fips]; }
    return out;
  }

  if (_dashScope === "state" && _dashScopeState) {
    const out = {};
    for (const fips in mapData) { if (mapData[fips].state === _dashScopeState) out[fips] = mapData[fips]; }
    return out;
  }

  if (_dashScope === "extent" && leafletMap) {
    const bounds = leafletMap.getBounds();
    const out = {};
    for (const fips in mapData) {
      const layer = countyLayerByFips[fips];
      if (!layer) continue;
      try {
        const center = layer.getBounds().getCenter();
        if (bounds.contains(center)) out[fips] = mapData[fips];
      } catch (_) {}
    }
    return out;
  }

  return mapData;
}

function updateDashboardScopedCards() {
  const scoped = _computeScopeCounties();
  const counts = computeSeverityCounts(scoped);
  const statesWithLeg = new Set();
  for (const fips in scoped) { if (scoped[fips].level >= 1) statesWithLeg.add(scoped[fips].state); }

  const db = document.getElementById("dashboard");
  if (!db) return;
  const targets = {
    restrictions: counts.moderate + counts.high + counts.ban,
    proposed:     counts.proposed,
    legislation:  statesWithLeg.size,
  };
  for (const [metric, value] of Object.entries(targets)) {
    const card = db.querySelector(`[data-metric="${metric}"]`);
    if (card) {
      const valEl = card.querySelector(".stat-card-value");
      if (valEl) animateCounter(valEl, value, 450);
    }
  }
}

function initDashboardScopeBar() {
  const bar = document.getElementById("dashboard-scope-bar");
  if (!bar) return;

  const stateSet = new Set();
  for (const fips in mapData) { if (mapData[fips].state) stateSet.add(mapData[fips].state); }
  const states = [...stateSet].sort();

  const stateOptions = states.map(s => {
    const el = document.createElement("option");
    el.value = s; el.textContent = s;
    return el.outerHTML;
  }).join("");

  bar.innerHTML = [
    `<span class="dash-scope-label">Scope</span>`,
    `<button class="dash-scope-chip active" data-scope="national" type="button">National</button>`,
    `<button class="dash-scope-chip" data-scope="filtered" type="button">Filtered</button>`,
    `<button class="dash-scope-chip" data-scope="state" type="button">State</button>`,
    `<button class="dash-scope-chip" data-scope="extent" type="button">Extent</button>`,
    `<select id="dash-scope-state-select" aria-label="Select state" hidden>`,
    `<option value="">Select state…</option>`,
    stateOptions,
    `</select>`,
    `<button id="scope-info-btn" type="button" aria-label="What does Scope mean?" title="What does Scope mean?">ⓘ</button>`,
    `<div id="scope-info-popover" hidden role="tooltip">`,
    `<div class="scope-info-row"><span class="scope-info-key">National</span><span class="scope-info-val">All counties across the US</span></div>`,
    `<div class="scope-info-row"><span class="scope-info-key">Filtered</span><span class="scope-info-val">Only counties matching active filters</span></div>`,
    `<div class="scope-info-row"><span class="scope-info-key">State</span><span class="scope-info-val">Counties within the selected state</span></div>`,
    `<div class="scope-info-row"><span class="scope-info-key">Extent</span><span class="scope-info-val">Counties visible in the current map view</span></div>`,
    `</div>`,
  ].join("");

  const chips       = bar.querySelectorAll(".dash-scope-chip");
  const stateSelect = bar.querySelector("#dash-scope-state-select");

  function activateScope(scope) {
    _dashScope = scope;
    chips.forEach(c => c.classList.toggle("active", c.dataset.scope === scope));
    if (stateSelect) stateSelect.hidden = (scope !== "state");
    if (scope === "state" && !_dashScopeState) return; // wait for state selection
    updateDashboardScopedCards();
  }

  chips.forEach(chip => chip.addEventListener("click", () => activateScope(chip.dataset.scope)));

  if (stateSelect) {
    stateSelect.addEventListener("change", () => {
      _dashScopeState = stateSelect.value;
      if (_dashScopeState) updateDashboardScopedCards();
    });
  }

  const infoBtn = bar.querySelector("#scope-info-btn");
  const infoPopover = bar.querySelector("#scope-info-popover");
  if (infoBtn && infoPopover) {
    infoBtn.addEventListener("click", e => {
      e.stopPropagation();
      infoPopover.hidden = !infoPopover.hidden;
    });
    document.addEventListener("click", () => { if (infoPopover) infoPopover.hidden = true; }, true);
  }

  bar.hidden = false;
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
  p.classList.remove("is-dragging", "is-closing", "sheet-expanded", "sheet-compact");
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
  p.classList.remove("sheet-open", "is-dragging", "is-closing", "sheet-expanded", "sheet-compact");
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

/* ── Suitability scoring ── */
const _suitabilityCache = new Map();

function computeSuitabilityScore(fips, county) {
  if (_suitabilityCache.has(fips)) return _suitabilityCache.get(fips);
  const result = _computeSuitabilityScore(fips, county);
  _suitabilityCache.set(fips, result);
  return result;
}

function _computeSuitabilityScore(fips, county) {
  // Factor 1: Regulatory Environment (max 50)
  const sevKey = county ? getSeverityKey(county) : "none";
  const regPts = { pro: 50, none: 45, proposed: 30, moderate: 18, high: 6, ban: 0 }[sevKey] ?? 45;
  const regNote = {
    pro:      "Pro Data Center designation — active incentives",
    none:     "No active restrictions on record",
    proposed: "Restriction(s) under consideration — not yet enacted",
    moderate: "Moderate restrictions in effect",
    high:     "Significant restrictions in effect",
    ban:      "Moratorium or ban in effect",
  }[sevKey] ?? "No active restrictions";

  // Factor 2: Political Climate (max 30)
  const riskRec = politicalRiskData[fips];
  let polPts, polNote;
  if (!riskRec) {
    polPts  = 20;
    polNote = "No documented political signals — neutral assumed";
  } else {
    polPts  = [0, 30, 24, 16, 8, 2][riskRec.risk_score] ?? 16;
    polNote = riskRec.score_label || `Risk score ${riskRec.risk_score}/5`;
  }

  // Factor 3: Restriction Scope (max 20)
  let scopePts  = 20;
  let scopeNote = "No restrictions identified";
  if (county && county.types && county.types.length > 0) {
    const typeSet  = new Set(county.types);
    const minArr   = [];
    if (typeSet.has("data_center")) minArr.push(6);
    if (typeSet.has("ai"))          minArr.push(8);
    if (typeSet.has("water"))       minArr.push(14);
    if (typeSet.has("energy"))      minArr.push(14);
    if (typeSet.has("crypto"))      minArr.push(18);
    if (minArr.length) {
      scopePts = Math.min(...minArr);
      if (county.types.length > 2) scopePts = Math.max(0, scopePts - 3);
    }
    scopeNote = county.types.map(t => TYPE_LABELS[t] || t).join(", ");
  }

  const score = regPts + polPts + scopePts;
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : score >= 25 ? "D" : "F";
  const label = { A: "Highly Suitable", B: "Suitable", C: "Proceed with Caution", D: "High Risk", F: "Not Suitable" }[grade];
  return {
    score, grade, label,
    factors: [
      { name: "Regulatory Environment", pts: regPts,   max: 50, note: regNote  },
      { name: "Political Climate",       pts: polPts,   max: 30, note: polNote  },
      { name: "Restriction Scope",       pts: scopePts, max: 20, note: scopeNote },
    ],
  };
}

function _radarSvg(s) {
  const cx = 80, cy = 54, R = 38;
  const gradeColors = { A: "#22c55e", B: "#22d3ee", C: "#eab308", D: "#f97316", F: "#ef4444" };
  const col = gradeColors[s.grade] || "#4874e8";
  const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  const ox = (a, r) => (cx + r * Math.cos(a)).toFixed(1);
  const oy = (a, r) => (cy + r * Math.sin(a)).toFixed(1);
  const poly = r => angles.map(a => `${ox(a, r)},${oy(a, r)}`).join(" ");
  const grids = [0.25, 0.5, 0.75, 1].map((f, i) =>
    `<polygon points="${poly(R * f)}" fill="none" stroke="var(--radar-grid)" stroke-width="${i === 3 ? 0.7 : 0.5}" ${i < 3 ? 'stroke-dasharray="2 2"' : ""}/>`
  ).join("");
  const axisLines = angles.map(a =>
    `<line x1="${cx}" y1="${cy}" x2="${ox(a, R)}" y2="${oy(a, R)}" stroke="var(--radar-grid)" stroke-width="0.5"/>`
  ).join("");
  const dataPoly = s.factors.map((f, i) => {
    const r = Math.max(2, (f.pts / f.max) * R);
    return `${ox(angles[i], r)},${oy(angles[i], r)}`;
  }).join(" ");
  const dots = s.factors.map((f, i) => {
    const r = Math.max(2, (f.pts / f.max) * R);
    return `<circle cx="${ox(angles[i], r)}" cy="${oy(angles[i], r)}" r="2.4" fill="${col}"/>`;
  }).join("");
  const lo = R + 10;
  const lbl = (ai, txt, anc, dy) =>
    `<text x="${ox(angles[ai], lo)}" y="${oy(angles[ai], lo)}" dy="${dy}" text-anchor="${anc}" font-size="7.5" font-family="system-ui,sans-serif" fill="var(--text-muted)">${txt}</text>`;
  return `<svg class="suit-radar" viewBox="0 0 170 100" aria-hidden="true">
    ${grids}${axisLines}
    <polygon points="${dataPoly}" fill="${col}" fill-opacity="0.18" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>
    ${dots}${lbl(0,"Regulatory","middle","0")}${lbl(1,"Political","start","4")}${lbl(2,"Scope","end","4")}
  </svg>`;
}

function buildSuitabilityHtml(fips, county) {
  const s = computeSuitabilityScore(fips, county);
  const barsHtml = s.factors.map(f => {
    const pct = Math.round((f.pts / f.max) * 100);
    return `<div class="suit-factor">
      <div class="suit-factor-meta">
        <span class="suit-factor-name">${escHtml(f.name)}</span>
        <span class="suit-factor-pts">${f.pts}<span class="suit-factor-max"> / ${f.max}</span></span>
      </div>
      <div class="suit-bar-track"><div class="suit-bar-fill suit-bar-${s.grade}" style="width:${pct}%"></div></div>
      <div class="suit-factor-note">${escHtml(f.note)}</div>
    </div>`;
  }).join("");
  return `<div class="suit-section" role="region" aria-label="Suitability Score">
    <div class="suit-section-header">
      <span class="suit-section-title">Suitability Score</span>
      <span class="ds-badge ds-estimated" title="Algorithmically estimated from regulatory and political signals. Not a professional site assessment.">Estimated</span>
    </div>
    <div class="suit-hero">
      <span class="suit-grade suit-grade-${s.grade}">${s.grade}</span>
      <div class="suit-hero-meta">
        <span class="suit-score-label">${escHtml(s.label)}</span>
        <span class="suit-score-num">${s.score}<span class="suit-score-denom"> / 100</span></span>
      </div>
    </div>
    ${_radarSvg(s)}
    ${barsHtml}
    <p class="suit-disclaimer">Estimated from restriction severity, political risk signals, and restriction scope. Not a professional site assessment.</p>
  </div>`;
}

/* ── County Timeline ── */
function buildCountyTimelineHtml(fips, county) {
  const events = [];

  // Effective date of the ordinance
  if (county.effective_date) {
    const sevKey = getSeverityKey(county);
    const dotCls = { ban: "tl-dot-ban", high: "tl-dot-high", moderate: "tl-dot-moderate",
                     proposed: "tl-dot-proposed", pro: "tl-dot-pro", none: "tl-dot-none" }[sevKey] || "tl-dot-none";
    events.push({ date: county.effective_date, dotCls,
      label: county.title || LEVEL_LABELS[county.level] || "Policy enacted",
      sub:   STATUS_LABELS[county.status || "active"] });
  }

  // Political risk signals
  const riskRec = politicalRiskData[fips];
  if (riskRec && riskRec.signals) {
    for (const sig of riskRec.signals) {
      if (!sig.detected_date) continue;
      const favor = (sig.type || "").includes("incentive") || (sig.type || "").includes("pro") ||
                    (sig.type || "").includes("support") || (sig.type || "").includes("enacted") && !((sig.type||"").includes("ban") || (sig.type||"").includes("moratorium"));
      events.push({ date: sig.detected_date,
        dotCls: favor ? "tl-dot-pro" : "tl-dot-risk",
        label: sig.label || sig.type,
        sub:   sig.description || "" });
    }
  }

  // Last reviewed
  if (county.last_reviewed) {
    events.push({ date: county.last_reviewed, dotCls: "tl-dot-reviewed",
      label: "Policy reviewed", sub: "Data quality check performed" });
  }

  if (!events.length) return "";

  events.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  const items = events.map(ev => `
    <div class="tl-item">
      <div class="tl-dot-wrap"><div class="tl-dot ${escHtml(ev.dotCls)}"></div><div class="tl-line"></div></div>
      <div class="tl-content">
        <div class="tl-date">${escHtml(ev.date)}</div>
        <div class="tl-label">${escHtml(ev.label)}</div>
        ${ev.sub ? `<div class="tl-sub">${escHtml(ev.sub)}</div>` : ""}
      </div>
    </div>`).join("");

  return `<div class="tl-section">
    <div class="tl-section-title">Policy Timeline</div>
    <div class="tl-list">${items}</div>
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

/* ── Policy Simulator ── */
function buildPolicySimulatorHtml(fips, county) {
  if (!county || county.level < 1) return "";

  const padded     = String(fips).padStart(5, "0");
  const riskRec    = politicalRiskData[fips];
  const riskScore  = riskRec ? (riskRec.risk_score || 0) : null;
  const wsRaw      = window.DC_WATER_STRESS || {};
  const waterLevel = wsRaw[padded] ?? wsRaw[fips] ?? null;
  const incentives = (window.DC_INCENTIVES_FIPS || {})[padded] || [];

  const regScore     = Math.max(0, 35 - (county.level / 4) * 35);
  const riskPct      = riskScore != null ? Math.max(0, 25 - (riskScore / 4) * 25) : 12.5;
  const waterPct     = waterLevel != null ? Math.max(0, 20 - (waterLevel / 4) * 20) : 10;
  const incentivePct = incentives.length > 0 ? 10 : 0;

  const currentScore = Math.round(regScore + riskPct + waterPct + incentivePct + 10);
  const simScore     = Math.round(35       + riskPct + waterPct + incentivePct + 10);
  const delta        = simScore - currentScore;

  const scoreCol = v => v >= 70 ? "#16a34a" : v >= 50 ? "#d97706" : v >= 30 ? "#dc2626" : "#7f1d1d";

  return `<div class="policy-simulator">
    <div class="policy-simulator-header">
      <span class="policy-simulator-title">Policy Simulator</span>
      <span class="ds-badge ds-estimated" title="Indicative score — not a certified site assessment" style="margin-left:4px;">Estimated</span>
    </div>
    <div class="sim-scores">
      <div class="sim-score-block">
        <div class="sim-score-label">Current Score</div>
        <div class="sim-score-value" style="color:${scoreCol(currentScore)}">${currentScore}</div>
        <div class="sim-score-sub">/ 100</div>
      </div>
      <svg class="sim-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      <div class="sim-score-block">
        <div class="sim-score-label">Restriction Removed</div>
        <div class="sim-score-value" style="color:${scoreCol(simScore)}">${simScore}</div>
        <div class="sim-score-sub">/ 100 <span class="sim-delta">+${delta}</span></div>
      </div>
    </div>
    <div class="sim-factors">
      ${_simFactor("Regulatory stance", regScore, 35, 35)}
      ${_simFactor("Political risk",    riskPct,  25, riskPct)}
      ${_simFactor("Water stress",      waterPct, 20, waterPct)}
      ${_simFactor("Tax incentives",    incentivePct, 10, incentivePct)}
    </div>
    <p class="sim-disclaimer">Indicative only. Does not constitute a professional site assessment.</p>
  </div>`;
}

function _simFactor(label, current, max, sim) {
  const changed = Math.round(current) !== Math.round(sim);
  return `<div class="sim-factor-row">
    <div class="sim-factor-label">${escHtml(label)}</div>
    <div class="sim-factor-bar-track">
      <div class="sim-factor-bar-fill" style="width:${Math.round(current / max * 100)}%"></div>
      ${changed ? `<div class="sim-factor-bar-sim" style="width:${Math.round(sim / max * 100)}%"></div>` : ""}
    </div>
    <div class="sim-factor-score">${Math.round(current)}/${max}${changed ? ` <span class="sim-factor-arrow">→ ${Math.round(sim)}</span>` : ""}</div>
  </div>`;
}

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

/* ── Tax Incentives Section ── */
function buildIncentivesSectionHtml(fips) {
  const programs = (window.DC_INCENTIVES_FIPS || {})[String(fips).padStart(5, "0")];
  if (!programs || programs.length === 0) return "";

  const items = programs.slice(0, 5).map(p => {
    const minInvest = p.min_investment_m ? `$${p.min_investment_m}M+ required` : "";
    return `<div class="incentive-item">
      <div class="incentive-name">${escHtml(p.program_name)}</div>
      <div class="incentive-meta">
        <span class="incentive-type-tag">${escHtml(p.incentive_type || "")}</span>
        ${minInvest ? `<span class="incentive-min-invest">${escHtml(minInvest)}</span>` : ""}
      </div>
      ${p.notes ? `<div class="incentive-notes">${escHtml(p.notes)}</div>` : ""}
    </div>`;
  }).join("");

  const more = programs.length > 5 ? `<div class="incentive-more">+${programs.length - 5} more programs</div>` : "";

  return `<div class="divider"></div><div class="incentive-section">
    <div class="incentive-section-header">
      <span class="incentive-section-title">Tax Incentives</span>
      <span class="ds-badge ds-estimated" title="Estimated — verify with state economic development agency">Estimated</span>
    </div>
    ${items}
    ${more}
    <p class="incentive-disclaimer">Incentive eligibility and amounts vary. Verify requirements with the applicable state or local agency before relying on these figures.</p>
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
  _saveCurrentType = null;
  _saveCurrentId   = null;
  _saveCurrentData = null;
  _updateDetailSaveBtn();
  _updateDetailWatchBtn(null);
  _updateDetailShareBtn(null);
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

/* ── Save button helpers ── */
async function _refreshSavedCache() {
  if (!window.AUTH || window.AUTH.state !== 'signedIn') {
    _savedCountySet   = new Set();
    _savedFacilitySet = new Set();
    return;
  }
  const [counties, facilities] = await Promise.all([
    window.AUTH.getSavedItems('county'),
    window.AUTH.getSavedItems('facility')
  ]);
  _savedCountySet   = new Set((counties   || []).map(i => i.item_id));
  _savedFacilitySet = new Set((facilities || []).map(i => i.item_id));
}

let _reportFips  = null;
let _reportName  = null;
let _reportState = null;
let _reportCounty= null;

function _updateDetailReportBtn(fips, name, state, countyData) {
  const btn = document.getElementById("detail-report-btn");
  if (!btn) return;
  if (!fips || !window.REPORT) { btn.hidden = true; return; }
  _reportFips   = fips;
  _reportName   = name;
  _reportState  = state;
  _reportCounty = countyData || null;
  btn.hidden = false;
}

let _compareBtnFips     = null;
let _compareBtnFacility = null;

function _updateDetailCompareBtn(fips) {
  const btn = document.getElementById("detail-compare-btn");
  if (!btn) return;
  _compareBtnFacility = null; // clear facility mode
  if (!fips) { btn.hidden = true; return; }
  _compareBtnFips = fips;
  const already = compareCounties.includes(fips);
  btn.hidden = false;
  btn.setAttribute("title", already ? "Already in Compare" : "Add to Compare");
  btn.setAttribute("aria-label", already ? "Already in Compare" : "Add to Compare");
  btn.classList.toggle("detail-compare-btn-active", already);
}

function _updateDetailFacilityCompareBtn(facility) {
  const btn = document.getElementById("detail-compare-btn");
  if (!btn) return;
  _compareBtnFips = null; // clear county mode
  _compareBtnFacility = facility;
  const id = facility.facility_id || facility.id || facility.name;
  const already = compareFacilities.some(f => (f.facility_id || f.id || f.name) === id);
  btn.hidden = false;
  btn.setAttribute("title", already ? "Already in Compare" : "Add to Compare");
  btn.setAttribute("aria-label", already ? "Already in Compare" : "Add to Compare");
  btn.classList.toggle("detail-compare-btn-active", already);
}

function _updateDetailSaveBtn() {
  const btn = document.getElementById('detail-save-btn');
  if (!btn) return;
  if (!_saveCurrentType || !_saveCurrentId) { btn.hidden = true; return; }
  const auth     = window.AUTH;
  const signedIn = auth && auth.state === 'signedIn';
  const savedSet = _saveCurrentType === 'county' ? _savedCountySet : _savedFacilitySet;
  const isSaved  = signedIn && savedSet.has(_saveCurrentId);
  const svgEmpty = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
  const svgFill  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
  btn.hidden    = false;
  btn.innerHTML = isSaved ? svgFill : svgEmpty;
  btn.classList.toggle('detail-save-btn-saved', isSaved);
  if (!signedIn) {
    btn.setAttribute('title', 'Sign in to save');
    btn.setAttribute('aria-label', 'Sign in to save');
  } else if (isSaved) {
    btn.setAttribute('title', 'Remove from saved');
    btn.setAttribute('aria-label', 'Remove from saved');
  } else {
    btn.setAttribute('title', 'Save to account');
    btn.setAttribute('aria-label', 'Save to account');
  }
}

function setDetailCounty(fips, county) {
  setSevClass(getSeverityKey(county));
  document.getElementById("detail-header").querySelector("h2").textContent = county.name;
  document.getElementById("detail-state").textContent = county.state;
  _saveCurrentType = 'county';
  _saveCurrentId   = fips;
  _saveCurrentData = { name: county.name, state: county.state, level: county.level };
  _updateDetailSaveBtn();
  _updateDetailReportBtn(fips, county.name, county.state, county);
  _updateDetailCompareBtn(fips);
  _updateDetailWatchBtn(fips);
  _updateDetailShareBtn(fips);

  const stateFips2 = fips.slice(0, 2);

  const _timelineHtml = buildCountyTimelineHtml(fips, county);
  document.getElementById("detail-body").innerHTML = `
    <a class="detail-juris-link" href="#jurisdiction?fips=${escHtml(fips)}">
      <span>Full intelligence report</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
    ${buildSuitabilityHtml(fips, county)}
    <div class="policy-divider"></div>
    ${buildStatePolicySectionHtml(stateFips2)}
    <div class="policy-divider"></div>
    ${buildCountyPolicySectionHtml(fips, county)}
    <div class="policy-divider"></div>
    ${buildCityPolicySectionHtml()}
    <div class="policy-divider"></div>
    ${buildPoliticalRiskSectionHtml(fips)}
    ${buildIncentivesSectionHtml(fips)}
    ${buildPolicySimulatorHtml(fips, county)}
    ${_timelineHtml ? `<div class="policy-divider"></div>${_timelineHtml}` : ""}
    ${buildSampleInfraHtml(fips)}
    <div id="detail-proximity-section"></div>
    <div id="detail-similar-section"></div>
    <div id="detail-zoning-summary"></div>
    <div id="detail-economy-section"></div>
    <div id="detail-notes-section"></div>`;
  openMobileSheet();
  _renderProximitySectionForCounty(fips);
  _renderSimilarCounties(fips, county);
  _renderZoningSummaryForCounty(fips);
  _renderEconomySectionForCounty(fips);
  _renderNotesSection(fips);
}

/* ── Economy section in the county detail panel ──────────────────────────────
   Progressive disclosure: a six-cell summary grid is always visible, and the
   trends and signals live behind <details> so the panel does not become a wall
   of charts. The county economic file is several megabytes, so it is only
   fetched when a county is actually opened — never on Home or first paint. */
function _renderEconomySectionForCounty(fips) {
  const host = document.getElementById("detail-economy-section");
  if (!host || !window.ECONOMY) return;

  host.innerHTML = `
    <div class="policy-divider"></div>
    <div class="econ-detail-section">
      <h3 class="detail-section-title">Economic Context</h3>
      <div class="econ-detail-loading">Loading…</div>
    </div>`;

  Promise.all([window.ECONOMY.load("county"), window.ECONOMY.load("state")])
    .then(([cData, sData]) => {
      // The user may have selected a different county while this was in flight.
      if (selectedFips !== fips) return;

      if (!window.ECONOMY.hasCounty(cData)) {
        host.innerHTML = `
          <div class="policy-divider"></div>
          <div class="econ-detail-section">
            <h3 class="detail-section-title">Economic Context</h3>
            <p class="econ-detail-src">Economic data has not been generated for this deployment yet.
               A maintainer can populate it by running the Update Economic Data workflow.</p>
          </div>`;
        return;
      }

      const rec = (cData.counties || {})[fips];
      if (!rec) {
        host.innerHTML = `
          <div class="policy-divider"></div>
          <div class="econ-detail-section">
            <h3 class="detail-section-title">Economic Context</h3>
            <p class="econ-detail-src">No ACS record for this county.</p>
          </div>`;
        return;
      }

      const E = window.ECONOMY;
      const cells = [
        ["population", "change_5y"],
        ["median_household_income", "value"],
        ["unemployment_rate", "value"],
        ["bachelors_or_higher_pct", "value"],
        ["median_home_value", "value"],
        ["broadband_pct", "value"],
      ].map(([metric, measure]) => {
        const meta = E.METRICS[metric];
        const cmp  = E.comparisons(cData, sData, fips, metric, "value");
        const v    = measure === "value" ? cmp.value : E.metricValue(rec, metric, measure);
        const text = v === null || v === undefined
          ? `<span class="econ-nodata">No data</span>`
          : escHtml(measure === "value" ? E.fmtValue(v, meta.unit, meta.dec) : E.fmtPct(v));
        const label = measure === "value" ? meta.label : meta.label + " (5-yr)";
        const cmpText = cmp.us_median !== null && measure === "value"
          ? `US median ${E.fmtValue(cmp.us_median, meta.unit, meta.dec)}`
          : "";
        return `<div class="econ-detail-cell">
          <div class="econ-detail-label">${escHtml(label)}</div>
          <div class="econ-detail-value">${text}</div>
          ${cmpText ? `<div class="econ-detail-cmp">${escHtml(cmpText)}</div>` : ""}
        </div>`;
      }).join("");

      const hist = rec.history || {};
      // Derived from HISTORY_METRICS, not a hand-maintained list — see
      // js/economy-view.js's identical fix for why (households silently
      // never appeared here despite the pipeline collecting its history).
      const sparks = E.EXPLORER_METRICS
        .filter(m => E.HISTORY_METRICS.has(m) && hist[m] && hist[m].length)
        .map(m => `
        <div class="econ-spark-row">
          <span class="econ-spark-label">${escHtml(E.METRICS[m].label)}</span>
          ${E.sparklineSvg(hist[m], { label: E.METRICS[m].label })}
        </div>`).join("");

      const signals = E.countySignals(cData, fips, sData);
      const vintage = cData.acs_vintage;

      host.innerHTML = `
        <div class="policy-divider"></div>
        <div class="econ-detail-section">
          <h3 class="detail-section-title">Economic Context</h3>
          <div class="econ-detail-grid">${cells}</div>

          <details class="econ-profile-more">
            <summary>Trends (5 years)</summary>
            <div class="econ-sparks">${sparks}</div>
          </details>

          ${signals.length ? `<details class="econ-profile-more">
            <summary>Infrastructure-relevant signals (${signals.length})</summary>
            <ul class="econ-profile-signals">
              ${signals.map(s => `<li class="econ-sig-${escHtml(s.strength)}">
                <strong>${escHtml(s.title)}:</strong> ${escHtml(s.text)}</li>`).join("")}
            </ul>
          </details>` : ""}

          <p class="econ-detail-src">
            U.S. Census Bureau, American Community Survey ${escHtml(String(vintage))} 5-Year Estimates.
            Survey estimates with margins of error, not administrative counts.
            Unemployment here is an ACS estimate, separate from the monthly national rate.
          </p>
        </div>`;
    })
    .catch(err => {
      if (selectedFips !== fips) return;
      host.innerHTML = `
        <div class="policy-divider"></div>
        <div class="econ-detail-section">
          <h3 class="detail-section-title">Economic Context</h3>
          <p class="econ-detail-src">Economic data could not be loaded (${escHtml(err.message)}).</p>
        </div>`;
    });
}

function setDetailNoRestriction(name, state, fips) {
  setSevClass("none");
  document.getElementById("detail-header").querySelector("h2").textContent = name || "County";
  document.getElementById("detail-state").textContent = state || "";
  if (fips) {
    _saveCurrentType = 'county';
    _saveCurrentId   = fips;
    _saveCurrentData = { name: name || '', state: state || '', level: 0 };
  } else {
    _saveCurrentType = null;
    _saveCurrentId   = null;
    _saveCurrentData = null;
  }
  _updateDetailSaveBtn();
  _updateDetailReportBtn(fips, name, state, null);
  _updateDetailCompareBtn(fips);
  _updateDetailWatchBtn(fips);
  _updateDetailShareBtn(fips);
  const stateFips2 = fips ? fips.slice(0, 2) : null;
  document.getElementById("detail-body").innerHTML = `
    ${fips ? buildSuitabilityHtml(fips, null) : ""}
    ${fips ? '<div class="policy-divider"></div>' : ""}
    ${stateFips2 ? buildStatePolicySectionHtml(stateFips2) : ""}
    ${stateFips2 ? '<div class="policy-divider"></div>' : ""}
    ${buildNoCountyPolicySectionHtml()}
    <div class="policy-divider"></div>
    ${buildCityPolicySectionHtml()}
    <div class="policy-divider"></div>
    ${fips ? buildPoliticalRiskSectionHtml(fips) : ""}
    ${fips ? buildIncentivesSectionHtml(fips) : ""}
    ${fips ? buildSampleInfraHtml(fips) : ""}
    ${fips ? '<div id="detail-proximity-section"></div>' : ""}
    ${fips ? '<div id="detail-zoning-summary"></div>' : ""}
    ${fips ? '<div id="detail-notes-section"></div>' : ""}`;
  openMobileSheet();
  if (fips) _renderProximitySectionForCounty(fips);
  if (fips) _renderZoningSummaryForCounty(fips);
  if (fips) _renderNotesSection(fips);
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
  _saveCurrentType = 'facility';
  _saveCurrentId   = facility.id || facility.name;
  _saveCurrentData = { name: facility.name, kind: kind, county_fips: facility.county_fips || '' };
  _updateDetailSaveBtn();
  _updateDetailReportBtn(null, null, null, null);
  _updateDetailFacilityCompareBtn(facility);
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
  if (!history.replaceState) return;
  // Deselecting used to strip the hash entirely, which lost the current tab
  // from the URL and broke the back button for the Map view. Fall back to
  // "#map" instead of an empty hash.
  history.replaceState(null, "", fips ? `#${fips}` : "#map");
}

function restoreFromHash() {
  const hash = window.location.hash.slice(1); // strip leading #

  // Full GIS state share link: #s=<base64url>
  const sMatch = hash.match(/^s=(.+)$/);
  if (sMatch && leafletMap) {
    const obj = _decodeShareState(sMatch[1]);
    if (obj) {
      switchTab("map");
      if (leafletMap) leafletMap.invalidateSize();
      _applyShareState(obj);
      return !!(obj.f);
    }
  }

  // Legacy share-view format: #@lat,lng,zoom
  const viewMatch = hash.match(/^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+)$/);
  if (viewMatch && leafletMap) {
    switchTab("map");
    leafletMap.setView([parseFloat(viewMatch[1]), parseFloat(viewMatch[2])], parseInt(viewMatch[3]));
    return false;
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
    <div class="kb-row"><span class="kb-desc">Pipeline tab</span><span class="kb-keys"><kbd>6</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">About tab</span><span class="kb-keys"><kbd>7</kbd></span></div>
    <div class="kb-section">Map Tools</div>
    <div class="kb-row"><span class="kb-desc">Toggle fullscreen</span><span class="kb-keys"><kbd>F</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Toggle measure mode</span><span class="kb-keys"><kbd>M</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Toggle polygon draw</span><span class="kb-keys"><kbd>D</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Drop candidate site pin</span><span class="kb-keys"><kbd>P</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Radius buffer tool</span><span class="kb-keys"><kbd>R</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Toggle results panel</span><span class="kb-keys"><kbd>L</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Workspaces panel</span><span class="kb-keys"><kbd>W</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Compare counties</span><span class="kb-keys"><kbd>C</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Suitability score view</span><span class="kb-keys"><kbd>S</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Water stress view</span><span class="kb-keys"><kbd>V</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Infrastructure density view</span><span class="kb-keys"><kbd>I</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Site screener</span><span class="kb-keys"><kbd>X</kbd></span></div>
    <div class="kb-section">General</div>
    <div class="kb-row"><span class="kb-desc">Command palette</span><span class="kb-keys"><kbd>Ctrl</kbd><kbd>K</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Show this help</span><span class="kb-keys"><kbd>?</kbd></span></div>
    <div class="kb-row"><span class="kb-desc">Close / dismiss</span><span class="kb-keys"><kbd>Esc</kbd></span></div>
  </div>`;
  document.body.appendChild(overlay);

  let _kbPrevFocus = null;

  const openOverlay = () => {
    _kbPrevFocus = document.activeElement;
    overlay.classList.add("open");
    requestAnimationFrame(() => document.getElementById("kb-close-btn")?.focus());
  };

  const closeOverlay = () => {
    overlay.classList.remove("open");
    _kbPrevFocus?.focus();
    _kbPrevFocus = null;
  };

  // Focus trap: only the close button is interactive; keep focus there
  overlay.addEventListener("keydown", e => {
    if (e.key === "Tab") { e.preventDefault(); document.getElementById("kb-close-btn")?.focus(); }
  });

  overlay.addEventListener("click", e => { if (e.target === overlay) closeOverlay(); });
  document.getElementById("kb-close-btn").addEventListener("click", closeOverlay);
  document.getElementById("kb-help-btn")?.addEventListener("click", openOverlay);

  return {
    open:   openOverlay,
    close:  closeOverlay,
    isOpen: () => overlay.classList.contains("open"),
  };
}

/* ── Keyboard shortcuts ── */
function initKeyboardShortcuts() {
  const kbOverlay = initKbOverlay();
  const TAB_KEYS  = { "1": "home", "2": "map", "3": "news", "4": "stocks", "5": "analytics", "6": "pipeline", "7": "about" };

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

function _pulseCountyLayer(layer) {
  const path = layer?._path;
  if (!path) return;
  path.classList.remove("county-pulse");
  // Force reflow so re-adding the class restarts the animation
  void path.offsetWidth;
  path.classList.add("county-pulse");
  const cleanup = () => path.classList.remove("county-pulse");
  path.addEventListener("animationend", cleanup, { once: true });
  setTimeout(cleanup, 900);
}

function selectCounty(fips) {
  if (selectedFips && countyLayerByFips[selectedFips]) {
    countyGeoLayer.resetStyle(countyLayerByFips[selectedFips]);
  }
  selectedFips = fips;
  _trackRecentCounty(fips);
  setLocationHash(fips);
  const layer  = countyLayerByFips[fips];
  if (layer) {
    layer.setStyle(selectedCountyStyle());
    layer.bringToFront();
    _pulseCountyLayer(layer);
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

  function _scoredPipeline(q) {
    const pl = window.PIPELINE ? window.PIPELINE.getData() : null;
    if (!pl) return [];
    return pl.filter(d => {
      const hay = [d.name, d.operator, d.city, d.state, d.state_abbr, d.county, d.parent_company]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 3).map(d => ({
      kind: "pipeline", raw: d, name: d.name,
      sub: [d.city, d.state_abbr, d.operational_status].filter(Boolean).join(" · "),
    }));
  }

  function _scoredNews(q) {
    const arr = typeof newsArticles !== "undefined" ? newsArticles : [];
    return arr.filter(a => {
      const hay = [a.title, a.source, a.category].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 2).map(a => ({
      kind: "news", raw: a, name: a.title, sub: a.source || "",
    }));
  }

  /* Recent searches */
  const RECENT_KEY = "dc-search-recent-v1";
  const MAX_RECENT = 6;
  function _loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }
  function _saveRecent(list) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {} }
  function _addRecent(label) {
    const list = _loadRecent().filter(r => r !== label);
    list.unshift(label);
    _saveRecent(list.slice(0, MAX_RECENT));
  }

  /* Fuzzy scoring — tolerates partial token matches */
  function _searchScore(item, q) {
    const t = item.searchText;
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 60;
    // Token prefix matching: "ho riv" → "hood river county"
    const qTokens = q.split(/\s+/);
    const tTokens = t.split(/\s+/);
    const allTokensMatch = qTokens.every(qt => tTokens.some(tt => tt.startsWith(qt)));
    if (allTokensMatch) return 40;
    // Character subsequence
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length ? 10 : 0;
  }

  function renderResults(matches, isRecent) {
    results.innerHTML = "";
    if (!matches.length) {
      results.style.display = "none";
      input.setAttribute("aria-expanded", "false");
      return;
    }
    if (isRecent) {
      const hdr = document.createElement("div");
      hdr.className = "search-recent-hdr";
      hdr.textContent = "Recent";
      results.appendChild(hdr);
    }
    for (const m of matches) {
      if (m.kind === "section") {
        const hdr = document.createElement("div");
        hdr.className = "search-section-hdr";
        hdr.textContent = m.label;
        results.appendChild(hdr);
        continue;
      }
      const item = document.createElement("div");
      item.className = "search-result-item";
      if (m.kind === "recent") {
        const ico = document.createElement("span");
        ico.className = "search-recent-icon";
        ico.setAttribute("aria-hidden", "true");
        ico.textContent = "↩";
        item.appendChild(ico);
        const lbl = document.createElement("span");
        lbl.textContent = m.label;
        item.appendChild(lbl);
      } else if (m.kind === "county") {
        item.textContent = `${m.name}, ${m.state}`;
      } else if (m.kind === "state") {
        const n = document.createElement("span");
        n.textContent = m.name;
        item.appendChild(n);
        const tag = document.createElement("span");
        tag.className = "search-result-tag";
        tag.textContent = "State";
        item.appendChild(tag);
      } else if (m.kind === "pipeline" || m.kind === "news") {
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;flex-direction:column;gap:1px;min-width:0";
        const n = document.createElement("span");
        n.textContent = m.name;
        n.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        wrap.appendChild(n);
        if (m.sub) {
          const s = document.createElement("span");
          s.textContent = m.sub;
          s.style.cssText = "font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
          wrap.appendChild(s);
        }
        item.appendChild(wrap);
        const tag = document.createElement("span");
        tag.className = "search-result-tag";
        tag.style.cssText = "flex-shrink:0;margin-left:6px";
        tag.textContent = m.kind === "pipeline" ? "Project" : "News";
        item.appendChild(tag);
        item.style.alignItems = "flex-start";
      } else {
        const n = document.createElement("span");
        n.textContent = m.name;
        item.appendChild(n);
        const tag = document.createElement("span");
        tag.className = "sample-tag";
        tag.style.marginLeft = "6px";
        tag.textContent = "Facility";
        item.appendChild(tag);
      }
      item.addEventListener("pointerdown", e => {
        e.preventDefault();
        if (m.kind === "recent") {
          input.value = m.label;
          results.style.display = "none";
          input.dispatchEvent(new Event("input"));
          return;
        }
        const displayVal = m.kind === "county" ? `${m.name}, ${m.state}` : m.name;
        input.value = "";
        results.style.display = "none";
        input.setAttribute("aria-expanded", "false");
        if (m.kind !== "pipeline" && m.kind !== "news") _addRecent(displayVal);
        if (m.kind === "county") {
          zoomToFeature(m.fips);
          selectCounty(m.fips);
        } else if (m.kind === "state") {
          const stLayer = stateGeoLayer.getLayers().find(l => String(l.feature.id).padStart(2, "0") === m.fips2);
          if (stLayer) leafletMap.flyToBounds(stLayer.getBounds(), { duration: 0.6, padding: [20, 20] });
          showStateDetail(m.fips2);
        } else if (m.kind === "pipeline") {
          if (window.PIPELINE) window.PIPELINE.searchAndOpen(m.raw.name);
        } else if (m.kind === "news") {
          switchTab("news");
          setTimeout(() => {
            const newsSearchEl = document.getElementById("news-search");
            if (newsSearchEl) { newsSearchEl.value = m.raw.title.slice(0, 40); newsSearchEl.dispatchEvent(new Event("input")); }
          }, 300);
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
    input.setAttribute("aria-expanded", "true");
  }

  function showRecentSearches() {
    const recent = _loadRecent();
    if (!recent.length) { results.style.display = "none"; input.setAttribute("aria-expanded", "false"); return; }
    renderResults(recent.map(r => ({ kind: "recent", label: r })), true);
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
    const raw = input.value.trim();
    const q   = raw.toLowerCase();
    if (!q) { showRecentSearches(); return; }

    // FIPS direct lookup: 5-digit code → jump straight to county
    if (/^\d{5}$/.test(raw)) {
      const fipsMatch = mapData[raw]
        ? [{ kind: "county", fips: raw, name: mapData[raw].name, state: mapData[raw].state, searchText: "" }]
        : countyIndex.filter(c => c.fips === raw);
      if (fipsMatch.length) { renderResults(fipsMatch, false); return; }
    }

    const scoredMain = index
      .map(c => ({ m: c, s: _searchScore(c, q) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map(x => x.m);

    const plResults   = _scoredPipeline(q);
    const newsResults = _scoredNews(q);

    const combined = [];
    if (scoredMain.length)   { combined.push({ kind: "section", label: "Locations" }); combined.push(...scoredMain); }
    if (plResults.length)    { combined.push({ kind: "section", label: "Pipeline Projects" }); combined.push(...plResults); }
    if (newsResults.length)  { combined.push({ kind: "section", label: "News" }); combined.push(...newsResults); }

    renderResults(combined.length ? combined : scoredMain, false);
  });
  input.addEventListener("focus", () => {
    if (input.value.trim()) input.dispatchEvent(new Event("input"));
    else showRecentSearches();
  });
  input.addEventListener("blur",  () => { setTimeout(() => { results.style.display = "none"; input.setAttribute("aria-expanded","false"); kbIdx = -1; }, 100); });

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
  // Sync water stress max select
  const wsMaxSel = document.getElementById("adv-ws-max");
  if (wsMaxSel) wsMaxSel.value = activeWsMaxFilter !== null ? String(activeWsMaxFilter) : "";
  // Sync min suitability select
  const suitMinSel = document.getElementById("adv-suit-min");
  if (suitMinSel) suitMinSel.value = activeSuitMinFilter !== null ? String(activeSuitMinFilter) : "";
  // Sync date filter
  const _dcb = document.getElementById("adv-date-enabled");
  const _dsl = document.getElementById("adv-date-slider");
  const _dsw = document.getElementById("adv-date-slider-wrap");
  const _ddp = document.getElementById("adv-date-display");
  if (_dcb) {
    const active = activeDateFilter !== null;
    _dcb.checked = active;
    if (_dsw) _dsw.hidden = !active;
    if (active) {
      if (_dsl) _dsl.value = activeDateFilter;
      if (_ddp) { _ddp.textContent = `≤ ${activeDateFilter}`; _ddp.hidden = false; }
    } else {
      if (_ddp) _ddp.hidden = true;
    }
  }
  // Sync clear button visibility
  const clearBtn = document.getElementById("adv-filter-clear");
  if (clearBtn) clearBtn.hidden = !hasActiveMapFilters();
  // Sync export button visibility
  const expBtn = document.getElementById("adv-filter-export");
  if (expBtn) expBtn.hidden = !hasActiveMapFilters();
  // Sync adv-filter-toggle button + active count badge
  const advBtn = document.getElementById("adv-filter-toggle");
  if (advBtn) {
    advBtn.classList.toggle("active", hasActiveMapFilters());
    const filterCount = activeRestrictFilters.size + (activeStateFilter ? 1 : 0) +
                        activeTypeFilters.size + activeStatusFilters.size +
                        (activeWsMaxFilter !== null ? 1 : 0) + (activeSuitMinFilter !== null ? 1 : 0);
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

  const doneBtn   = document.getElementById("adv-filter-done");
  if (doneBtn) doneBtn.addEventListener("click", closePanel);

  const exportBtn = document.getElementById("adv-filter-export");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const rows = [["FIPS", "County", "State", "Level", "Severity", "Types", "Suitability Grade", "Suitability Score", "Water Stress", "Effective Date"]];
      const wsData = window.DC_WATER_STRESS_FULL || {};
      const WS_LABELS_EXP = ["Low", "Low-Med", "Med-High", "High", "Extreme"];
      for (const fips in mapData) {
        if (!countyMatchesFilters(fips)) continue;
        const c = mapData[fips];
        const suit = computeSuitabilityScore(fips, c);
        const ws = wsData[fips] !== undefined ? (WS_LABELS_EXP[wsData[fips]] || String(wsData[fips])) : "";
        rows.push([
          fips, c.name || "", c.state || "",
          String(c.level ?? 0),
          getSeverityKey(c),
          (c.types || []).join("; "),
          suit.grade, String(suit.score),
          ws,
          c.effective_date || c.date || "",
        ]);
      }
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
        download: `dc-policy-filter-export-${new Date().toISOString().slice(0,10)}.csv`,
      });
      document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 1000);
    });
  }

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

  // Water Stress max level select
  const wsMaxSel = document.getElementById("adv-ws-max");
  if (wsMaxSel) {
    if (activeWsMaxFilter !== null) wsMaxSel.value = String(activeWsMaxFilter);
    wsMaxSel.addEventListener("change", () => {
      activeWsMaxFilter = wsMaxSel.value === "" ? null : Number(wsMaxSel.value);
      clearBtn.hidden = !hasActiveMapFilters();
      if (!hasActiveMapFilters()) openBtn.classList.remove("active");
      else openBtn.classList.add("active");
      applyFilters();
    });
  }

  // Min suitability grade select
  const suitMinSel = document.getElementById("adv-suit-min");
  if (suitMinSel) {
    if (activeSuitMinFilter !== null) suitMinSel.value = String(activeSuitMinFilter);
    suitMinSel.addEventListener("change", () => {
      activeSuitMinFilter = suitMinSel.value === "" ? null : Number(suitMinSel.value);
      clearBtn.hidden = !hasActiveMapFilters();
      if (!hasActiveMapFilters()) openBtn.classList.remove("active");
      else openBtn.classList.add("active");
      applyFilters();
    });
  }

  // Date filter (Enacted By Year)
  const dateCheckbox  = document.getElementById("adv-date-enabled");
  const dateSliderWrap = document.getElementById("adv-date-slider-wrap");
  const dateSlider    = document.getElementById("adv-date-slider");
  const dateDisplay   = document.getElementById("adv-date-display");

  function _syncDateSliderDisplay() {
    if (!dateSlider || !dateDisplay) return;
    const yr = dateSlider.value;
    dateDisplay.textContent = `≤ ${yr}`;
    dateDisplay.hidden = false;
  }

  function _applyDateFilter() {
    if (!dateCheckbox || !dateSlider) return;
    if (dateCheckbox.checked) {
      activeDateFilter = dateSlider.value;
      _syncDateSliderDisplay();
    } else {
      activeDateFilter = null;
      if (dateDisplay) dateDisplay.hidden = true;
    }
    applyFilters();
  }

  if (dateCheckbox) {
    // Restore state from activeDateFilter if already set (e.g. loaded from storage)
    if (activeDateFilter) {
      dateCheckbox.checked = true;
      if (dateSlider) dateSlider.value = activeDateFilter;
      _syncDateSliderDisplay();
      if (dateSliderWrap) dateSliderWrap.hidden = false;
    }
    dateCheckbox.addEventListener("change", () => {
      if (dateSliderWrap) dateSliderWrap.hidden = !dateCheckbox.checked;
      _applyDateFilter();
    });
  }
  if (dateSlider) {
    dateSlider.addEventListener("input", _applyDateFilter);
  }

}

/* ── Nav Tabs ── */
function switchTab(tab) {
  activeTab = tab;
  const mainEl      = document.getElementById("main");
  const homeEl      = document.getElementById("home-view");
  const newsEl      = document.getElementById("news-view");
  const stocksEl    = document.getElementById("stocks-view");
  const economyEl   = document.getElementById("economy-view");
  const analyticsEl = document.getElementById("analytics-view");
  const pipelineEl  = document.getElementById("pipeline-view");
  const aboutEl     = document.getElementById("about-view");
  const jurisEl     = document.getElementById("jurisdiction-view");
  const searchBar   = document.getElementById("search-bar");
  const appEl       = document.getElementById("app");

  document.querySelectorAll(".header-tab").forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  // Fullpage tabs (home/analytics/pipeline/about) always show the header expanded;
  // map, news, and stocks restore the user's saved collapsed preference.
  // "jurisdiction" is a virtual route with no header tab but renders fullpage.
  const isFullpage = tab === "analytics" || tab === "about" || tab === "home"
                  || tab === "pipeline" || tab === "jurisdiction" || tab === "economy";
  if (isFullpage) appEl.classList.remove("top-hidden");

  appEl.classList.toggle("stocks-mode",   tab === "stocks");
  appEl.classList.toggle("fullpage-mode", isFullpage);

  // Hide all views, show the active one
  mainEl.hidden = true;
  newsEl.hidden = true;
  if (homeEl)      homeEl.hidden      = true;
  if (stocksEl)    stocksEl.hidden    = true;
  if (economyEl)   economyEl.hidden   = true;
  if (analyticsEl) analyticsEl.hidden = true;
  if (pipelineEl)  pipelineEl.hidden  = true;
  if (aboutEl)     aboutEl.hidden     = true;
  if (jurisEl)     jurisEl.hidden     = true;

  const savedHidden = () => appEl.classList.toggle("top-hidden", localStorage.getItem("topHidden") === "1");

  if (tab === "home") {
    if (homeEl) { homeEl.hidden = false; triggerViewEnter(homeEl); }
    searchBar.classList.add("news-mode");
    if (typeof renderHomePage === "function") renderHomePage();
  } else if (tab === "news") {
    newsEl.hidden = false; triggerViewEnter(newsEl);
    searchBar.classList.add("news-mode");
    renderNews();
    savedHidden();
  } else if (tab === "stocks") {
    if (stocksEl) { stocksEl.hidden = false; triggerViewEnter(stocksEl); }
    searchBar.classList.add("news-mode");
    if (typeof initStocksPage === "function") initStocksPage();
    savedHidden();
  } else if (tab === "economy") {
    if (economyEl) { economyEl.hidden = false; triggerViewEnter(economyEl); }
    searchBar.classList.add("news-mode");
    // renderEconomyPage() is idempotent: it builds the shell once and reuses
    // existing charts, so returning to this tab does not rebuild them.
    if (typeof renderEconomyPage === "function") renderEconomyPage();
    // The explorer's Leaflet map was sized while the view was hidden.
    if (window.ECONOMY_VIEW) setTimeout(() => window.ECONOMY_VIEW.invalidate(), 180);
  } else if (tab === "analytics") {
    if (analyticsEl) { analyticsEl.hidden = false; triggerViewEnter(analyticsEl); }
    searchBar.classList.add("news-mode");
    if (typeof renderAnalyticsPage === "function") renderAnalyticsPage();
    // Analytics reads water-stress, incentives, and political-risk data, which
    // are deferred off the critical path. Re-render once they arrive so those
    // sections are not left empty when the tab is opened early.
    if (typeof loadSecondaryData === "function" && !window.DC_RISK_BY_FIPS) {
      loadSecondaryData().then(res => {
        if (!res || !analyticsEl || analyticsEl.hidden) return;
        delete analyticsEl.dataset.built;
        if (typeof renderAnalyticsPage === "function") renderAnalyticsPage();
      });
    }
  } else if (tab === "pipeline") {
    if (pipelineEl) { pipelineEl.hidden = false; triggerViewEnter(pipelineEl); }
    searchBar.classList.add("news-mode");
    if (window.PIPELINE) window.PIPELINE.init();
  } else if (tab === "about") {
    if (aboutEl) { aboutEl.hidden = false; triggerViewEnter(aboutEl); }
    searchBar.classList.add("news-mode");
    if (typeof renderAboutPage === "function") renderAboutPage();
  } else if (tab === "jurisdiction") {
    // Virtual route — content is rendered by the router, which knows the fips.
    if (jurisEl) { jurisEl.hidden = false; triggerViewEnter(jurisEl); }
    searchBar.classList.add("news-mode");
  } else {
    mainEl.hidden = false;
    searchBar.classList.remove("news-mode");
    savedHidden();
    if (!leafletMap) {
      initMapFromGeo();          // self-guarding; returns any in-flight promise
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

/* Navigate to a tab through the router so there is exactly ONE path into
   switchTab(). Calling switchTab() here *and* navigating ran it twice per
   click — harmless for most tabs, but it started two concurrent map inits and
   Leaflet threw "Map container is already initialized". */
function goToTab(tab) {
  if (!window.Router) { switchTab(tab); return; }
  const before = window.location.hash;
  window.Router.navigate(tab, {});
  // navigate() is a no-op when the hash is already correct, in which case no
  // hashchange fires and nothing would drive the view — switch directly.
  if (window.location.hash === before) switchTab(tab);
}

function initNavTabs() {
  document.querySelectorAll(".header-tab").forEach(btn => {
    if (!btn.dataset.tab) return;   // skips the mobile "More" trigger
    btn.addEventListener("click", () => goToTab(btn.dataset.tab));
  });
  /* Logo / brand click → Home */
  document.getElementById("header-brand")?.addEventListener("click", () => goToTab("home"));

  /* Roving-tabindex arrow navigation.
     #header-tabs is role="tablist" with role="tab" children, and the ARIA tabs
     pattern requires Left/Right (plus Home/End) to move between them — the
     tablist should be ONE tab stop, not seven. This was missing entirely; adding
     it here fixes the whole tablist rather than only the new Economy tab.
     Only visible tabs participate, so the mobile "More" overflow is skipped. */
  const tablist = document.getElementById("header-tabs");
  if (tablist) {
    const tabButtons = () => [...tablist.querySelectorAll(".header-tab[data-tab]")]
      .filter(b => b.offsetParent !== null);

    const syncTabIndex = () => {
      tabButtons().forEach(b => {
        b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1;
      });
    };
    syncTabIndex();
    // Keep the roving index correct when switchTab() changes aria-selected.
    new MutationObserver(syncTabIndex).observe(tablist, {
      subtree: true, attributes: true, attributeFilter: ["aria-selected"],
    });

    tablist.addEventListener("keydown", (e) => {
      const btns = tabButtons();
      const i = btns.indexOf(document.activeElement);
      if (i === -1) return;
      let next = null;
      if (e.key === "ArrowRight") next = btns[(i + 1) % btns.length];
      else if (e.key === "ArrowLeft") next = btns[(i - 1 + btns.length) % btns.length];
      else if (e.key === "Home") next = btns[0];
      else if (e.key === "End") next = btns[btns.length - 1];
      if (!next) return;
      e.preventDefault();
      next.tabIndex = 0;
      next.focus();
      // Follow-focus activation, which is the expected behaviour for a tablist
      // whose panels are already loaded.
      goToTab(next.dataset.tab);
    });
  }

  initRouterBinding();
  initMobileNav();
}

/* ── Mobile "More" overflow navigation ──────────────────────────────────────
   Tabs beyond the first four are hidden from the mobile bar (CSS) and mirrored
   into a bottom sheet, so nothing is stranded off-screen in a scroll area. */
const MOBILE_PRIMARY_TABS = ["home", "map", "news", "analytics"];

function initMobileNav() {
  const tabsNav  = document.getElementById("header-tabs");
  const moreBtn  = document.getElementById("header-tab-more");
  const sheet    = document.getElementById("mobile-nav-sheet");
  const backdrop = document.getElementById("mobile-nav-backdrop");
  if (!tabsNav || !moreBtn || !sheet || !backdrop) return;

  const secondary = [...tabsNav.querySelectorAll(".header-tab[data-tab]")]
    .filter(b => !MOBILE_PRIMARY_TABS.includes(b.dataset.tab));
  if (!secondary.length) return;

  secondary.forEach(b => b.setAttribute("data-mobile-secondary", "1"));
  moreBtn.hidden = false;

  /* Collapse to the More pattern whenever the strip actually overflows its
     available width, not just below a fixed phone-width breakpoint. A fixed
     700px breakpoint left common laptop widths (1200-1366px) in a dead
     zone: 8 tabs don't fit there either, but #header-tabs hides its own
     scrollbar, so the overflowing tabs were reachable only by an
     undiscoverable horizontal drag. Measure for real instead. */
  function updateNavOverflow() {
    const wasOverflowing = tabsNav.classList.contains("tabs-overflow");
    if (wasOverflowing) tabsNav.classList.remove("tabs-overflow");
    const overflowing = tabsNav.scrollWidth > tabsNav.clientWidth + 1;
    tabsNav.classList.toggle("tabs-overflow", overflowing);
  }
  updateNavOverflow();
  // Inter loads with font-display:swap; the swap can change tab widths enough
  // to flip the overflow verdict after the initial (fallback-font) measurement.
  document.fonts?.ready?.then(updateNavOverflow).catch(() => {});
  let _navOverflowTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(_navOverflowTimer);
    _navOverflowTimer = setTimeout(updateNavOverflow, 150);
  });

  /* #header carries a transform, which makes it the containing block for any
     position:fixed descendant — the sheet was anchoring to the header instead
     of the viewport and rendering off the top of the screen. Reparent both
     elements to <body> so "inset: auto 0 0 0" means the actual viewport. */
  if (sheet.parentElement !== document.body) document.body.appendChild(sheet);
  if (backdrop.parentElement !== document.body) document.body.appendChild(backdrop);

  /* Mirror each secondary tab into the sheet, reusing its icon and label. */
  sheet.innerHTML = `<div class="mobile-nav-grip"></div>
    <div class="mobile-nav-list" role="menu"></div>`;
  const list = sheet.querySelector(".mobile-nav-list");

  secondary.forEach(src => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "mobile-nav-item";
    item.setAttribute("role", "menuitem");
    item.dataset.tab = src.dataset.tab;
    const icon = src.querySelector("svg");
    if (icon) item.appendChild(icon.cloneNode(true));
    const span = document.createElement("span");
    span.textContent = src.querySelector("span")?.textContent || src.dataset.tab;
    item.appendChild(span);
    item.addEventListener("click", () => {
      close();
      goToTab(item.dataset.tab);
    });
    list.appendChild(item);
  });

  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    sheet.hidden = false;
    void sheet.offsetWidth;                 // force reflow so the transition runs
    backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
    moreBtn.setAttribute("aria-expanded", "true");
    syncActive();
    list.querySelector(".mobile-nav-item")?.focus();
    document.addEventListener("keydown", onKey);
  }

  function close() {
    backdrop.classList.remove("is-open");
    sheet.classList.remove("is-open");
    moreBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKey);
    const done = () => { sheet.hidden = true; backdrop.hidden = true; };
    // Respect reduced-motion: no transition fires, so hide immediately.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) done();
    else setTimeout(done, 300);
    lastFocus?.focus?.();
  }

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    // Trap focus inside the sheet while it is modal.
    const items = [...list.querySelectorAll(".mobile-nav-item")];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* Keep the sheet's active row and the More button's highlight in sync with
     whichever tab is currently showing. */
  function syncActive() {
    const active = document.querySelector(".header-tab.active")?.dataset.tab;
    list.querySelectorAll(".mobile-nav-item").forEach(i =>
      i.classList.toggle("active", i.dataset.tab === active));
    moreBtn.classList.toggle("has-active",
      !!active && !MOBILE_PRIMARY_TABS.includes(active));
  }

  moreBtn.addEventListener("click", () =>
    sheet.classList.contains("is-open") ? close() : open());
  backdrop.addEventListener("click", close);

  // Reflect tab changes made elsewhere (keyboard shortcuts, router, deep links).
  window.Router?.onChange(syncActive);
  syncActive();
}

/* ── Router → view binding ──────────────────────────────────────────────────
   Handles modern routes (#news, #jurisdiction?fips=...). Legacy hash formats
   (#51107, #s=..., #@lat,lng,zoom) continue to be handled by restoreFromHash()
   so old shared links keep working. */
function initRouterBinding() {
  if (!window.Router) return;

  window.Router.onChange(r => {
    // Legacy formats are owned by restoreFromHash(); don't double-handle them.
    if (r.legacy) { restoreFromHash(); return; }

    if (r.route === "jurisdiction") {
      switchTab("jurisdiction");
      if (window.JURISDICTION) window.JURISDICTION.init(r.params);
      announceView(`Jurisdiction detail`);
      return;
    }
    if (r.route === "methodology") {
      switchTab("about");
      if (typeof renderAboutPage === "function") renderAboutPage();
      document.getElementById("methodology-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    switchTab(r.route);
    const label = document.getElementById("tab-" + r.route)?.textContent?.trim();
    if (label) announceView(label);
  });
}

/* Dispatch whatever route the page was loaded with. hashchange does not fire
   for the initial URL, so a cold load of a deep link needs this explicitly.
   Called once, after core data is in place so the target view can render. */
function applyInitialRoute() {
  if (!window.Router) return;
  const r = window.Router.parse();
  if (r.legacy) return;                 // handled by restoreFromHash()
  if (r.route === "home") return;       // already showing

  if (r.route === "jurisdiction") {
    switchTab("jurisdiction");
    if (window.JURISDICTION) window.JURISDICTION.init(r.params);
    return;
  }
  if (r.route === "methodology") {
    switchTab("about");
    if (typeof renderAboutPage === "function") renderAboutPage();
    document.getElementById("methodology-section")?.scrollIntoView();
    return;
  }
  switchTab(r.route);
}

/* Announce view changes to screen readers. Tab buttons update aria-selected,
   but SPA view swaps are otherwise silent for assistive tech. */
function announceView(name) {
  let el = document.getElementById("route-announcer");
  if (!el) {
    el = document.createElement("div");
    el.id = "route-announcer";
    el.className = "sr-only";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
  }
  el.textContent = `${name} view loaded`;
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
    // Brief spin animation (skip if user prefers reduced motion)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      btn.classList.remove('spinning');
      void btn.offsetWidth; // force reflow to restart animation
      btn.classList.add('spinning');
      btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    }
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
  _loadLayerState(); // restore persisted layer visibility
  // Restore filter-panel position/size across sessions
  try {
    const sp = localStorage.getItem("fp-pos");
    const ss = localStorage.getItem("fp-size");
    const lp = localStorage.getItem("lg-pos");
    if (sp) fpSavedPos  = JSON.parse(sp);
    if (ss) fpSavedSize = JSON.parse(ss);
    if (lp) lgSavedPos  = JSON.parse(lp);
  } catch (_) {}
  initThemeToggle();
  initNavTabs();
  initKeyboardShortcuts();

  const _rawHash    = window.location.hash.slice(1);
  const hasHashFips = /^\d{5}$/.test(_rawHash);
  const hasHashShare = /^s=/.test(_rawHash);

  // Always show home immediately — skeleton renders while data loads.
  // This prevents the map loading spinner from blocking the UI even when
  // the URL contains a saved county hash from a prior session.
  switchTab("home");
  // Pre-fetch geo data in the background so the Map tab opens quickly.
  fetchGeoData();

  try {
    // Start the map/enrichment payloads now so they download alongside the
    // critical ones, but do not await them — Home must not wait on ~1.6 MB it
    // does not need to paint.
    const secondary = loadSecondaryData();

    const { data, newsData } = await loadCoreData();

    mapData      = data.counties || {};
    newsArticles = (newsData && newsData.articles) ? newsData.articles : [];

    // Re-render home with real data (clears skeleton state)
    const hv = document.getElementById("home-view");
    if (hv) delete hv.dataset.built;
    if (typeof renderHomePage === "function") renderHomePage();

    // When the enrichment layers land, refresh Home so fields that depend on
    // them (water stress, tax incentives, political risk) fill in.
    secondary.then(res => {
      if (!res) return;
      const homeEl = document.getElementById("home-view");
      if (homeEl && !homeEl.hidden && typeof renderHomePage === "function") {
        delete homeEl.dataset.built;
        renderHomePage();
      }
      // initSearch() indexes facilities out of sampleLayers, which was still
      // null when it first ran. Rebuild the index now that they exist.
      initSearch();
    });

    initSearch();
    initAdvancedFiltersPanel();
    initNewsView();
    renderNewsStatusBar(newsData);
    setLastUpdated(data);
    renderDashboard(data);
    initDashboardScopeBar();
    initDashboardToggle();

    // If URL had a FIPS hash, initialize the map silently while home stays
    // visible — #main is hidden so the loading spinner never shows.
    // fetchGeoData() above already started the 2 MB download in parallel,
    // so by the time loadCoreData() finished the geo file may be ready or close.
    // When initMapFromGeo() resolves, restoreFromHash() snaps to the map
    // and county instantly with no loading overlay.
    if (hasHashFips || hasHashShare) {
      await initMapFromGeo();
      restoreFromHash();
    } else {
      // Modern routes (#jurisdiction?fips=…, #news, #analytics, …) were only
      // ever handled by the router's hashchange listener, which does not fire
      // on a cold load. Without this, every deep link landed on Home when
      // opened directly or from a shared URL.
      applyInitialRoute();
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
