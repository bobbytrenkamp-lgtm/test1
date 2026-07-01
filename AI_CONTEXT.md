# AI_CONTEXT.md — US Data Center & AI Restrictions Map

> **Purpose:** This file is the authoritative handoff document for AI-assisted development. Update it at the end of every significant session. Any AI assistant should be able to pick up work immediately by reading this file.

---

## Project Overview

| Field | Value |
|---|---|
| **Project name** | US Data Center & AI Restrictions Map |
| **Repository** | `bobbytrenkamp-lgtm/test1` |
| **Production URL** | GitHub Pages off `main` branch |
| **Purpose** | Interactive US county-level choropleth showing data center and AI regulation restrictions, overlaid with infrastructure layers (data centers, AI campuses, power, fiber, water stress, tax incentives) |
| **Target users** | Policy researchers, real estate analysts, data center operators, journalists, investors |
| **Long-term vision** | Become the go-to reference map for where AI infrastructure is being built vs. where it faces regulatory headwinds. Integrate real-time news, timeline sliders, and an AI Readiness Score per county. |
| **Current phase** | Phase 2 complete — all core UI built, working on real data integration |

---

## Current Architecture

| Concern | Technology |
|---|---|
| **Language** | Vanilla JavaScript (ES2020+), no build step |
| **Mapping library** | D3.js v7 (CDN) + TopoJSON client v3 (CDN) |
| **County geometry** | `us-atlas@3/counties-10m.json` (jsdelivr CDN) |
| **Projection** | `d3.geoAlbersUsa().fitExtent(...)` — dynamically sized to container |
| **Styling** | Plain CSS (`css/style.css`), CSS custom properties (variables), no preprocessor |
| **Fonts** | Inter (Google Fonts CDN) |
| **Hosting** | GitHub Pages, static — no server, no build pipeline |
| **State management** | Module-level JS variables (`mapData`, `layerState`, `legendState`, `selectedFips`) |
| **Data flow** | `loadData()` → `Promise.all([us-atlas, map_data.json, sample_layers.json])` → `renderMap()` → `renderLegend()` → `renderDashboard()` |

### Folder structure

```
test1/
├── index.html                  # Single page — all UI scaffolding
├── css/
│   └── style.css               # All styles (~800 lines)
├── js/
│   └── map.js                  # All application logic (~900 lines)
├── data/
│   ├── map_data.json           # REAL curated restriction data (48 counties)
│   ├── sample_layers.json      # Placeholder overlay data (drives current UI)
│   ├── county_names.json       # 3,143 counties FIPS → {name, state} lookup
│   ├── data_centers.json       # 59 real hyperscale data centers (AWS, Azure, GCP, Meta…)
│   ├── ai_campuses.json        # 22 real AI training campuses (OpenAI, xAI, DOE labs…)
│   ├── water_stress.json       # ~1,988 counties, 0–4 WRI Aqueduct stress scale
│   ├── tax_incentives.json     # 20 state programs, 130+ counties
│   └── restrictions_raw.json   # Raw source for map_data.json (not loaded by app)
└── AI_CONTEXT.md               # This file
```

### Key constants in `map.js`

```javascript
// Severity classification — drives county fill color
const SEVERITY = {
  pro:      { color: "#4ade80", label: "Pro / Incentive Hub" },
  none:     { color: "#16a34a", label: "No Restrictions" },
  proposed: { color: "#eab308", label: "Proposed Restrictions" },
  moderate: { color: "#f97316", label: "Moderate Restrictions" },
  high:     { color: "#dc2626", label: "High Restrictions" },
  ban:      { color: "#7f1d1d", label: "Moratorium / Ban" },
};

// 11 toggleable layers
const layerState = {
  restrictions: true,   // real data
  annotations: true,    // real data (always-on callouts)
  dc_existing: false,   // sample → needs data_centers.json wired in
  dc_planned: false,    // sample → needs data_centers.json wired in
  ai_campus: false,     // sample → needs ai_campuses.json wired in
  power: false,         // sample
  transmission: false,  // sample
  fiber: false,         // sample
  water: false,         // sample → needs water_stress.json wired in
  utility: false,       // sample
  tax: false,           // sample → needs tax_incentives.json wired in
};

// Legend state machine
let legendState = 0; // 0 = full, 1 = mini, 2 = hidden
```

---

## Features Completed

- ✓ Interactive US county-level choropleth (D3 + TopoJSON, Albers USA projection)
- ✓ 6-bucket severity color model: pro / none / proposed / moderate / high / ban
- ✓ County hover tooltip (name, state, severity label)
- ✓ County click → detail panel (restrictions list, sources as hotlinks, notes)
- ✓ Detail panel with close button and mobile drag handle
- ✓ Search bar (searches county name, state, facility name)
- ✓ Filter panel / Layers toggle (11 layers in 4 groups)
- ✓ Filter panel scrolls when content overflows (flex scroll fix applied)
- ✓ Dashboard stat cards (total counties, counts per severity bucket)
- ✓ Top-section collapse tab (hides dashboard; title bar always stays visible)
- ✓ Legend with 3-state minimize cycle (full → mini → hidden)
- ✓ Legend expand (+) button shown only in mini state
- ✓ Legend drag-to-reposition (pointer capture API, constrained to map container)
- ✓ Legend restore button (appears when legend is hidden)
- ✓ Arrow annotations layer for 3 most-restrictive + 3 most-pro counties
- ✓ Annotations as toggleable map layer (not just default-on)
- ✓ County sources rendered as clickable hotlinks (`<a target="_blank">`)
- ✓ Sample data disclaimer shown on all placeholder layer tooltips
- ✓ All 9 overlay layer types wired: water, utility, tax, power, fiber, transmission, dc_existing, dc_planned, ai_campus
- ✓ Zoom + pan (D3 zoom, scale 1–10x, marker sizes adjust on zoom)
- ✓ State borders and nation border drawn above counties
- ✓ Mobile responsive layout (detail panel slides up from bottom)
- ✓ `county_names.json` — 3,143 counties FIPS lookup (committed, not yet used in UI)
- ✓ `data_centers.json` — 59 real data centers (committed, not yet wired into map)
- ✓ `ai_campuses.json` — 22 real AI campuses (committed, not yet wired into map)
- ✓ `water_stress.json` — ~1,988 counties (committed, not yet wired into map)
- ✓ `tax_incentives.json` — 20 state programs (committed, not yet wired into map)

---

## Features In Progress

### Real data files not yet wired into `map.js`

The following JSON files exist in `/data/` but the app still reads from `sample_layers.json` for overlay layers. They need to be loaded in `loadData()` and passed to the render functions.

| File | Status | Remaining work |
|---|---|---|
| `data_centers.json` | Committed, not loaded | Wire into `loadData()`, replace `sampleLayers.data_centers` with real data |
| `ai_campuses.json` | Committed, not loaded | Wire into `loadData()`, replace `sampleLayers.ai_campuses` |
| `water_stress.json` | Committed, not loaded | Wire into `renderMap()`, replace `sampleLayers.water_stress` |
| `tax_incentives.json` | Committed, not loaded | Wire into `renderMap()`, replace `sampleLayers.tax_incentive_counties` |
| `county_names.json` | Committed, not loaded | Use for tooltip / detail panel county name lookup fallback |

**Known issue:** `water_stress.json` uses a 0–4 scale but `sample_layers.json` uses 0–3. Update opacity mapping when switching.

---

## Development Roadmap

Priority order:

1. **Wire real data files into map.js** — replace sample overlay data with committed real datasets (data_centers, ai_campuses, water_stress, tax_incentives, county_names)
2. **AI Readiness Score** — composite county score (restrictions + water stress + tax incentives + power access) displayed in detail panel and as optional choropleth layer
3. **Timeline slider** — animate restriction changes by year; `map_data.json` counties have year fields
4. **News integration** — pull recent legislative news per county/state (RSS or API) into detail panel
5. **Transmission line layer** — real EIA transmission data (currently placeholder 3-line sample)
6. **Fiber network layer** — real FCC broadband data (currently placeholder 3-route sample)
7. **Utility service territories** — real EIA Form 861 data (currently 4 placeholder territories)
8. **Export / share** — copy shareable URL with current map state (zoom, selected county, active layers)
9. **Print / screenshot** — download current map view as PNG or PDF

---

## Important Design Decisions

### Why vanilla JS, no framework
No build step means GitHub Pages deploys instantly on every push to `main`. Adding React/Vue/Svelte would require CI/CD pipeline, package management, and bundler config — not worth it for a single-page map tool.

### Why `sample_layers.json` still drives overlay data
The 5 real data files (`data_centers.json`, etc.) were committed as a data-collection step but wiring them into the app is a separate task with more complexity (loading 5 extra fetches, handling the 0–4 water scale change, etc.). The sample file continues to drive the UI so the app stays working while the wiring is deferred.

### Why `legendState` uses an integer not a boolean
The legend has 3 states (full / mini / hidden) not 2. Using 0/1/2 allows simple modular arithmetic: `legendState = (legendState + 1) % 3`. Each state is expressed via CSS classes (`legend-mini`, `legend-hidden`) plus the `#legend-restore` button's `.visible` class.

### Why legend expand button visibility is controlled by inline style, not CSS
The toolbar is built as an `innerHTML` string inside `renderLegend()`, which is called every time layers change. CSS class-based display toggling was fighting the cascade and not working reliably across re-renders. Baking `style="display:${expandDsp}"` directly into the HTML string guarantees the correct initial display every time, and `applyLegendState()` then updates it via `expandBtn.style.display`.

### Why only `#dashboard` collapses (not `#header`)
User explicitly requested "I prefer the title to stay when I hide the county summary." The `.top-hidden` CSS previously targeted both elements; it now only targets `#dashboard`.

### Why sources use `{label, url}` objects not plain strings
`map_data.json` was initially written with plain strings. After the user requested hotlinks, all 48 counties' sources were converted to `{label, url}` objects. The renderer handles both gracefully (plain string falls back to text display).

### Why pointer capture for legend drag
`setPointerCapture()` ensures mousemove events keep firing even when the pointer leaves the legend element (fast drag). Without it, drag tracking stops when the cursor moves faster than the DOM can follow, creating a "stuck" legend.

### Flexbox scroll pattern
`flex: 1; min-height: 0` is required on any scrollable child inside a flex container. Without `min-height: 0`, browsers default flex children to `min-height: auto` which lets them grow past the container, breaking overflow scroll.

---

## UI / UX Standards

| Property | Value |
|---|---|
| **Theme** | Dark "Bloomberg terminal" — near-black backgrounds, muted borders |
| **Background** | `#0f1117` |
| **Surface** | `#1a1d27` (cards, panels) |
| **Surface-2** | `#22263a` (hover states, nested surfaces) |
| **Border** | `#2e3352` |
| **Text** | `#e4e6f0` (primary), `#8a8fa8` (muted) |
| **Accent** | `#5b8def` (links, active states, buttons) |
| **Font** | Inter (400, 500, 600, 700) |
| **Base font size** | 13–14px in panels, 11–12px for labels/badges |
| **Border radius** | 6–8px for cards, 4px for badges/buttons |
| **Animations** | Subtle — 0.15–0.32s ease transitions only; no bouncing or heavy motion |
| **County hover** | Stroke thickens to 2px + orange stroke color; tooltip appears near cursor |
| **Selected county** | Stroke thickens to 2.5px + white stroke; stays until another county clicked or panel closed |
| **Mobile breakpoint** | 768px — detail panel moves to bottom sheet, filter panel slides in from left |
| **Z-index layers** | Counties (0) → overlays (1) → state borders (2) → annotations (3) → legend (5) → filter panel (50) → tooltip (100) |

---

## Data Sources

| Dataset | Source | Status | Notes |
|---|---|---|---|
| County restrictions | Manual curation + state legislative records | ✅ Live (`map_data.json`) | 48 counties, all sources hotlinked |
| County geometry | us-atlas@3 (jsdelivr CDN) | ✅ Live | TopoJSON counties-10m.json |
| County names/FIPS | kjhealy/fips-codes (GitHub) | ✅ Committed, not wired | `county_names.json` |
| Data centers | Operator press releases, DCknowledge.com, public filings | ✅ Committed, not wired | 59 facilities in `data_centers.json` |
| AI campuses | News/press releases, DOE announcements | ✅ Committed, not wired | 22 campuses in `ai_campuses.json` |
| Water stress | WRI Aqueduct / USGS | ✅ Committed, not wired | 0–4 scale, ~1,988 counties in `water_stress.json` |
| Tax incentives | NCSL, state revenue dept websites | ✅ Committed, not wired | 20 programs, 130+ counties in `tax_incentives.json` |
| Power infrastructure | Sample placeholder | ⚠️ Placeholder | `sample_layers.json → power_infrastructure` |
| Transmission lines | Sample placeholder | ⚠️ Placeholder | EIA data needed to replace |
| Fiber network | Sample placeholder | ⚠️ Placeholder | FCC broadband maps needed |
| Utility territories | Sample placeholder | ⚠️ Placeholder | EIA Form 861 needed |

---

## Known Issues

| Issue | Severity | Status | Notes |
|---|---|---|---|
| Overlay layers still use `sample_layers.json` | Medium | Open | Real data files committed but not yet loaded/wired |
| Water stress scale mismatch | Low | Pending | `sample_layers.json` uses 0–3; `water_stress.json` uses 0–4 — opacity map needs update when switching |
| Legend position resets on window resize | Low | Open | `legend.style.left/top` are pixel values; no reflow logic on resize |
| Zoom resets on window resize | Low | Open | `renderMap()` is not called on resize — SVG viewBox is static |
| No keyboard navigation for map | Low | Open | Counties are not tabbable; screen reader unfriendly |
| `county_names.json` not used | Low | Open | Tooltip falls back to TopoJSON feature ID; names would be more friendly |

---

## Session Log

### 2026-06-?? — Phase 1: Initial map build
**Summary:** Created initial choropleth map with D3 + TopoJSON, severity color model, hover tooltip, click-to-detail, basic CSS.
**Files modified:** `index.html`, `css/style.css`, `js/map.js`, `data/map_data.json`
**Major decisions:** Albers USA projection fitExtent, 6-bucket severity model, dark Bloomberg theme.

---

### 2026-06-?? — Phase 2: Filter panel, layer system, detail panel, mobile UX
**Summary:** Added 11-layer toggle system, expanded detail panel, mobile responsive layout, dashboard stat cards.
**Files modified:** `index.html`, `css/style.css`, `js/map.js`
**Major decisions:** `LAYER_DEFS` array drives both the filter panel UI and `layerState`; `renderSampleMarkerLayers()` handles all point/line overlays.

---

### 2026-06-?? — UI fixes: colors, centering, search, tooltip
**Summary:** Fixed county fill colors, map centering, tooltip positioning, search results, click handling on all counties.
**Files modified:** `js/map.js`, `css/style.css`

---

### 2026-06-?? — Top-section collapse tab
**Summary:** Added toggle button in search bar to show/hide the dashboard section above. Title bar always stays visible.
**Files modified:** `index.html`, `css/style.css`, `js/map.js`
**Key decision:** Only `#dashboard` gets `max-height: 0` transition — `#header` is excluded from `.top-hidden` rule.

---

### 2026-07-01 — Real data files + legend clipping + header persistence
**Summary:** Added 5 new real public dataset files. Fixed legend clipping at bottom (moved anchor from bottom to top). Kept header title bar visible when dashboard collapses.
**Files modified:** `data/county_names.json` (new), `data/data_centers.json` (new), `data/ai_campuses.json` (new), `data/water_stress.json` (new), `data/tax_incentives.json` (new), `css/style.css`, `js/map.js`
**Commit:** `50d588b`, `dce2941`

---

### 2026-07-01 — Legend minimize/drag + expand button
**Summary:** Added 3-state legend minimize cycle (full → mini → hidden). Added drag-to-reposition with pointer capture. Added expand (+) button in mini state. Added #legend-restore button for hidden state. Fixed expand button display using inline style in innerHTML string.
**Files modified:** `index.html`, `css/style.css`, `js/map.js`
**Major decisions:** Inline `style="display:${expandDsp}"` baked into toolbar HTML to avoid CSS cascade fights. Pointer capture for reliable drag tracking.
**Commits:** `23a49d4`, `4dc05ea`, `4583c33`, `ce4341a`

---

### 2026-07-01 — Sources as hotlinks
**Summary:** Converted all 48 counties in `map_data.json` from plain-string sources to `{label, url}` objects. Updated renderer to output `<a>` tags. Added link hover styles.
**Files modified:** `data/map_data.json`, `js/map.js`, `css/style.css`
**Commit:** `5f138ef`

---

### 2026-07-01 — Filter panel scroll + annotations as layer
**Summary:** Fixed filter panel body not scrolling (added `flex:1; min-height:0`). Capped panel max-height to `min(520px, calc(100%-24px))`. Made county annotations a toggleable layer (was always-on).
**Files modified:** `css/style.css`, `js/map.js`
**Key decisions:** `flex: 1; min-height: 0` is the required flexbox scroll pattern. `addAnnotations()` now returns its D3 group, stored in `layerGroups["annotations"]`.
**Commit:** `ccd9d2a`

---

### 2026-07-01 — AI_CONTEXT.md created
**Summary:** Created this file to serve as persistent AI handoff document.
**Files modified:** `AI_CONTEXT.md` (new)

---

## AI Handoff Summary

**Current branch:** `main` (= production on GitHub Pages)
**Latest commit:** `ccd9d2a` — "Add annotations as toggleable layer; fix filter panel scroll and size"
**Working tree:** Clean (no uncommitted changes before this session's file)

**What works right now:**
- Full interactive choropleth with 48 real restriction counties
- All 11 layers toggleable in the filter panel (9 currently show sample data)
- Legend minimize/drag/hide/restore
- County click → detail panel with hotlinked sources
- Search, zoom/pan, dashboard stat cards, top-section collapse, mobile layout

**What's blocked / placeholder:**
- 5 real data files are committed (`data_centers.json`, `ai_campuses.json`, `water_stress.json`, `tax_incentives.json`, `county_names.json`) but NOT loaded by the app — it still reads `sample_layers.json` for overlay data

**Recommended next task:**
Wire the real data files into `map.js`. The `loadData()` function currently fetches only 3 things:
```javascript
const [us, data, sample] = await Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"),
  d3.json("data/map_data.json"),
  d3.json("data/sample_layers.json"),
]);
```
Add fetches for `data/data_centers.json`, `data/ai_campuses.json`, `data/water_stress.json`, `data/tax_incentives.json`, and `data/county_names.json`. Then replace each `sampleLayers.X` reference with the real data. Note the water stress scale change: `sample_layers.json` uses 0–3 (opacity map: `{0:0, 1:0.16, 2:0.32, 3:0.5}`), but `water_stress.json` uses 0–4 (update opacity map to `{0:0, 1:0.12, 2:0.25, 3:0.40, 4:0.55}`).

**Suggested prompt for next session:**
> "Wire the real data files into map.js. Load data_centers.json, ai_campuses.json, water_stress.json, tax_incentives.json, and county_names.json in loadData(). Replace all references to sampleLayers.data_centers, sampleLayers.ai_campuses, sampleLayers.water_stress, sampleLayers.tax_incentive_counties with the real data. Update the water opacity scale from 0–3 to 0–4. Keep sample_layers.json loaded for power_infrastructure, transmission_lines, fiber_network, and utility_territories which don't yet have real data. Use county_names.json as a fallback name lookup in the tooltip and detail panel. Commit and push when done."
