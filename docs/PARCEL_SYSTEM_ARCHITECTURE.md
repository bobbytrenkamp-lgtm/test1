# Parcel Intelligence System — Architecture Reference

This document describes every module in the parcel intelligence system, its public interface, internal data flow, and known extension points. It was generated as part of the Phase 5 completion pass (2026-07-21).

---

## Overview

The parcel intelligence system adds a viewport-loaded, click-to-inspect parcel layer on top of the county-level data center restriction map. When a user selects a county that has parcel coverage, individual land parcels are fetched for the visible map area, rendered as color-coded polygons, and exposed through a feature panel with DC feasibility scoring, comparable parcel analysis, polygon area selection, and printable reports.

All modules are JavaScript IIFEs that expose a singleton on `window`. There is no build step; modules communicate through DOM `CustomEvent` dispatches and direct `window.*` references.

```
index.html
  └── <script defer> for each module in dependency order:
        parcel/schema.js       → window.PARCEL_SCHEMA
        parcel/registry.js     → window.PARCEL_REGISTRY
        parcel/connector-arcgis.js  → window.ArcGISParcelConnector
        parcel/connector-geojson.js → window.GeoJSONParcelConnector
        parcel/connector-wfs.js     → window.WFSParcelConnector
        parcel/selection.js    → window.PARCEL_SELECTION
        parcel/renderer.js     → window.PARCEL_RENDERER
        parcel/feasibility.js  → window.PARCEL_FEASIBILITY
        parcel/comparables.js  → window.PARCEL_COMPARABLES
        parcel/search.js       → window.PARCEL_SEARCH
        parcel/draw-tool.js    → window.PARCEL_DRAW_TOOL
        parcel/massing.js      → window.PARCEL_MASSING
        parcel/report.js       → window.PARCEL_REPORT
        parcel/panel.js        → window.PARCEL_PANEL
        parcel/index.js        (coordinator, no public API)
```

---

## Module Reference

### `parcel/schema.js` → `window.PARCEL_SCHEMA`

**Purpose:** Defines the canonical 30-field schema that all connectors normalise to.

**Key exports:**
- `FIELD_MAP` — `{ [fieldId]: { label, group, type, format? } }` — used by the panel renderer and CSV exporter
- `GROUPS` — ordered array of group names (`identity`, `zoning`, `physical`, `valuation`, `transaction`, `legal`)

**Extension:** Add new canonical fields here and add corresponding entries in each connector's `fieldMap`.

---

### `parcel/registry.js` → `window.PARCEL_REGISTRY`

**Purpose:** Maps county FIPS codes to jurisdiction configurations. The connector type, endpoint URL, field mappings, and attribution for each supported county live here.

**Key exports:**
- `get(fips)` → config object or `null`
- `has(fips)` → boolean
- `all()` → array of all config objects

**Config fields per jurisdiction:**

| Field | Description |
|---|---|
| `id` | Short slug (matches zoning jurisdiction folders) |
| `name` | Human-readable display name |
| `state` | 2-letter state abbreviation |
| `fips` | 5-digit county FIPS string |
| `connector` | `'arcgis'` \| `'geojson'` \| `'wfs'` |
| `serviceUrl` | Primary data endpoint |
| `minZoom` | Leaflet zoom level below which parcels are hidden (default 14) |
| `maxFeatures` | Max features per viewport request |
| `fieldMap` | `{ canonical_field_id: 'SOURCE_FIELD_NAME' }` — `'__computed__'` means the connector derives it |
| `outFields` | Array of source field names to request, or `null` for all |
| `attribution` | `{ name, url, portal, license, note }` |

**Currently registered jurisdictions:**

| FIPS | Jurisdiction | Connector |
|---|---|---|
| 51107 | Loudoun County, VA | arcgis |
| 51153 | Prince William County, VA | arcgis |
| 51059 | Fairfax County, VA | arcgis |
| 24031 | Montgomery County, MD | arcgis |
| 24027 | Howard County, MD | arcgis |

See `docs/PARCEL_ADD_JURISDICTION.md` for step-by-step instructions for adding a new county.

---

### Connector modules

All three connectors implement the same interface:

```
fetchViewport(bounds: L.LatLngBounds, signal: AbortSignal) → Promise<GeoJSON FeatureCollection>
searchByQuery(query: string, signal: AbortSignal) → Promise<GeoJSON FeatureCollection>
fetchById(id: string|number, signal: AbortSignal) → Promise<GeoJSON FeatureCollection>
```

After fetching, each connector normalises the GeoJSON properties to the canonical schema via `_normalize()`, which applies the jurisdiction's `fieldMap` in reverse (source → canonical), sets `county_fips`, and stamps `_source` with the connector type.

#### `connector-arcgis.js` → `window.ArcGISParcelConnector`

Uses the ArcGIS FeatureServer REST API. `fetchViewport` constructs a bbox envelope query. `searchByQuery` uses a `where` clause. Field list is controlled by `outFields`.

#### `connector-geojson.js` → `window.GeoJSONParcelConnector`

Fetches a static GeoJSON file once, caches it in memory, and performs client-side bbox filtering for `fetchViewport` and text filtering for `searchByQuery`. Suitable for small (<5 000 feature) datasets.

#### `connector-wfs.js` → `window.WFSParcelConnector`

Supports OGC WFS 2.0.0 and 1.1.0. `fetchViewport` builds a `BBOX` parameter (axis order differs between versions). `searchByQuery` uses `CQL_FILTER`. `fetchById` constructs an equality CQL expression. Output format is always `application/json`.

---

### `parcel/selection.js` → `window.PARCEL_SELECTION`

**Purpose:** Owns selected-parcel and compare-tray state. Dispatches `parcel:selected`, `parcel:deselected`, and `parcel:compare-updated` CustomEvents.

**Key exports:**
- `select(feature, jurisdictionId)` — sets the active selection, fires `parcel:selected`
- `deselect()` — clears selection, fires `parcel:deselected`
- `getSelected()` → `{ feature, jurisdictionId }` or `null`
- `addToCompare(feature, jurisdictionId)` → boolean (false if tray full)
- `removeFromCompare(parcelId)`
- `getCompared()` → array of `{ feature, jurisdictionId }`
- `isInCompare(parcelId)` → boolean
- `MAX_COMPARE` — constant (currently 6)

---

### `parcel/renderer.js` → `window.PARCEL_RENDERER`

**Purpose:** Manages the Leaflet parcel polygon layer. Handles viewport-gated fetch, debouncing, AbortController cancellation, hover/select/compare highlight styles, and the parcel count status bar.

**Key exports:**
- `init(map)` — creates the `parcelPane` at zIndex 450, wires `moveend`/`zoomend` listeners
- `setActive(fips, active)` — enables/disables the layer; instantiates the correct connector via `_makeConnector(config)`
- `refresh()` — forces a re-fetch
- `clearHighlight()` — removes the selected highlight without touching selection state
- `onCompareChanged()` — re-syncs compare highlight styles after the tray changes
- `getFeatures()` → array of all GeoJSON features currently rendered on the map

**Connector factory:** `_makeConnector(config)` dispatches on `config.connector`:

```js
case 'geojson': return new window.GeoJSONParcelConnector(config);
case 'wfs':     return new window.WFSParcelConnector(config);
case 'arcgis':
default:        return new window.ArcGISParcelConnector(config);
```

**Style priority:** selected > compare > hover > default. Default fill colour is derived from `land_use_code` (residential → green, commercial → orange, industrial → blue, etc.).

---

### `parcel/feasibility.js` → `window.PARCEL_FEASIBILITY`

**Purpose:** Scores each parcel for DC-area data center development feasibility on a 0–100 composite scale.

**Composite formula:**

| Factor | Weight |
|---|---|
| Zoning eligibility | 40% |
| Site size adequacy | 25% |
| Land use compatibility | 20% |
| DC market strength | 15% |

**Key exports:**
- `assess(props, fips)` → feasibility object (synchronous; uses already-cached zoning data)
- `assessAsync(props, fips)` → Promise — loads zoning if not yet cached, then calls `assess`
- `STATUS_META` — eligibility status → `{ label, cls, icon }` map
- `DC_MARKET_SCORES` — FIPS → 0–100 market strength score

**Feasibility object shape:**

```js
{
  available: true,
  score: 82,                // 0–100 composite
  status: 'eligible',       // 'eligible'|'conditional'|'prohibited'|'unknown'
  statusMeta: { label, cls, icon },
  confidence: 'high',       // 'high'|'medium'|'low'
  factors: [{ label, score, weight, note }],
  envelope: {
    footprintSqft, footprintAcres,
    maxCoverage_pct, maxHeight_ft,
    estimatedGFA_sqft,
    setbacks: { front, side, rear },
  },
  approvalType: 'By-Right',
  conditions: ['...'],
  dcSummary: '...',
}
```

**Dependency:** calls `window.ZONING?.getCachedByFips(fips)` for zoning district standards.

---

### `parcel/comparables.js` → `window.PARCEL_COMPARABLES`

**Purpose:** Finds similar parcels within the current map viewport for side-by-side comparison.

**Key exports:**
- `find(subject, options)` → array of `{ feature, score, deltas }` (sorted descending by score)
  - `options`: `{ maxResults=5, minAreaRatio=0.20, maxAreaRatio=5.00 }`
- `diff(subjectProps, candidateProps)` → `{ [fieldId]: { delta, delta_pct } }` for numeric fields

**Scoring formula:**

| Criterion | Weight |
|---|---|
| Zoning code match | 40 |
| Area proximity (log-ratio) | 30 |
| Land use category match | 20 |
| Value-per-acre proximity | 10 |

**Data source:** reads from `window.PARCEL_RENDERER.getFeatures()` — only parcels currently visible in the viewport are considered.

---

### `parcel/search.js` → `window.PARCEL_SEARCH`

**Purpose:** Augments the site-wide search box with parcel-specific results (address, PIN, parcel ID) when a parcel jurisdiction is active.

**Key exports:**
- `setContext(active, fips)` — enables/disables parcel search augmentation

**Behaviour:** hooks into `#search-input` with a 400 ms debounce. On match, inserts a `#parcel-search-results-section` into `#search-results`. Clicking a result calls `window.PARCEL?.focusParcel(feature)`.

---

### `parcel/draw-tool.js` → `window.PARCEL_DRAW_TOOL`

**Purpose:** Polygon drawing tool for multi-parcel area selection. Draws a free-form polygon on the map; on close, finds all parcels whose centroids fall inside it and shows a stats card.

**Key exports:**
- `init(map)` — must be called once before use
- `activate()` / `deactivate()` / `isActive()` — toggle drawing mode
- `_addAllToCompare()` — moves all parcels found in the last query to the compare tray
- `_exportSelection()` — downloads matched parcels as CSV

**Point-in-polygon:** ray-casting algorithm in `_pointInPolygon(lat, lng, vertices)`.

**Spatial index:** `_buildIndex(features, bbox)` partitions feature centroids into a 20×20 grid so the query pre-filters candidates to only those cells overlapping the polygon bbox before running the full ray-cast. This reduces per-polygon work from O(n) to roughly O(n × coverage_fraction).

**Keyboard:**
- `Escape` — cancel / deactivate
- `Enter` — close polygon and run query

---

### `parcel/massing.js` → `window.PARCEL_MASSING`

**Purpose:** Renders an isometric 3-D SVG block diagram of the parcel's buildable envelope (ground plane + setback collar + extruded building mass + height label + GFA annotation).

**Key exports:**
- `render(container, envelope, opts)` — clears `container` and inserts an `<svg>` element
  - `envelope` — object from `PARCEL_FEASIBILITY` (footprintSqft, maxHeight_ft, lotCoveragePct, setbacks, estimatedGFA_sqft)
  - `opts.theme` — `'dark'` (default) or `'light'`

**Projection:** standard 2:1 isometric (30° axis angle). Three visible faces: ground plane, left face (depth axis), right face (width axis), top face. All coordinates computed analytically — no SVG path hand-authoring.

**Theme support:** dark and light palettes, auto-detected from `data-theme` attribute.

---

### `parcel/report.js` → `window.PARCEL_REPORT`

**Purpose:** Generates a self-contained printable HTML report for a single parcel and opens it in a new tab.

**Key exports:**
- `html(feature, jurisdictionId)` → full HTML string with inline CSS
- `open(feature, jurisdictionId)` — creates a Blob URL, opens it, revokes after 10 s

**Report sections:** feasibility badge + score + factors → buildable envelope stats → identity / zoning / physical / valuation field groups → disclaimer with ordinance link.

---

### `parcel/panel.js` → `window.PARCEL_PANEL`

**Purpose:** The right-side parcel detail panel. Renders four tabs: Overview, Zoning (with feasibility + massing diagram), Compare (with comparable suggestions), and Legal.

**Key exports:**
- `show(feature, jurisdictionId)` — renders and opens the panel
- `refresh()` — re-renders with the last feature (called after zoning loads)
- `close()` — hides the panel, deselects the parcel
- `_addToCompare()` — adds current parcel to compare tray
- `_openZoning(fips, zoningCode)` — switches to zoning panel and highlights district
- `_loadAndRefresh(fips, zoningCode)` — async: loads zoning then refreshes feasibility
- `_exportCSV()` — downloads compare tray as 16-field CSV
- `_openReport()` — opens printable report via `PARCEL_REPORT`

**Massing diagram wiring:** after `panel.innerHTML` is set, the panel queries all `.pf-massing[data-massing-envelope]` containers and calls `PARCEL_MASSING.render()` on each.

**Mobile swipe-to-dismiss:** touch handlers detect a downward swipe ≥ 90 px from inside the panel and call `close()`.

**CustomEvents listened:**
- `parcel:selected` → calls `show()`
- `parcel:deselected` → calls `_close()`
- `parcel:compare-updated` → refreshes compare tab badge

---

### `parcel/index.js` (coordinator)

**Purpose:** Top-level coordinator. Wires all modules together and responds to map/county events from the rest of the application.

**Responsibilities:**
- Calls `PARCEL_RENDERER.init(map)` and `PARCEL_DRAW_TOOL.init(map)`
- Listens for layer-toggle and county-changed events from the map shell
- Calls `PARCEL_RENDERER.setActive(fips, active)` and `PARCEL_SEARCH.setContext(active, fips)`
- Listens for `zoning:jurisdiction-loaded` CustomEvent and calls `PARCEL_PANEL.refresh()` to fill in feasibility after zoning data loads

---

## Data flow: parcel click to panel render

```
User clicks polygon
  → PARCEL_RENDERER._onClick()
  → PARCEL_SELECTION.select(feature, jurisdictionId)
  → dispatches CustomEvent 'parcel:selected'
  → PARCEL_PANEL.show(feature, jurisdictionId)
      ├─ _tabOverview(props)  — formatted field groups
      ├─ _tabZoning(props)
      │     └─ PARCEL_FEASIBILITY.assess(props, fips)
      │           └─ ZONING.getCachedByFips(fips)   (may be null first time)
      │     └─ _renderFeasibility(f)
      │           └─ embeds data-massing-envelope JSON in .pf-massing div
      ├─ _tabCompare(props)
      │     └─ PARCEL_COMPARABLES.find(feature) → ranked suggestions
      └─ after innerHTML set:
            └─ panel.querySelectorAll('.pf-massing') → PARCEL_MASSING.render()

If zoning was not yet cached:
  → user (or _loadAndRefresh) triggers ZONING.loadByFips(fips)
  → ZONING fires 'zoning:jurisdiction-loaded'
  → index.js listener → PARCEL_PANEL.refresh()
  → re-renders feasibility with real zoning standards
```

---

## CustomEvent bus

| Event name | Fired by | Payload (`detail`) | Listeners |
|---|---|---|---|
| `parcel:selected` | PARCEL_SELECTION | `{ feature, jurisdictionId }` | PARCEL_PANEL |
| `parcel:deselected` | PARCEL_SELECTION | — | PARCEL_PANEL |
| `parcel:compare-updated` | PARCEL_SELECTION | — | PARCEL_PANEL, PARCEL_RENDERER |
| `zoning:jurisdiction-loaded` | ZONING module | `{ fips }` | parcel/index.js |

---

## Adding a new connector type

1. Create `js/parcel/connector-<type>.js` exposing a class on `window.<ClassName>ParcelConnector` with `fetchViewport`, `searchByQuery`, and `fetchById`.
2. Add `case '<type>': return new window.<ClassName>ParcelConnector(config);` to `_makeConnector()` in `renderer.js`.
3. Add the script tag to `index.html` before `renderer.js`.
4. Set `connector: '<type>'` in the registry entry.

---

## Performance notes

- **Debounce:** PARCEL_RENDERER debounces viewport fetches at 350 ms after each `moveend`/`zoomend`.
- **AbortController:** every in-flight fetch is cancelled on the next fetch, preventing stale responses from overwriting newer data.
- **Zoom gate:** parcels are hidden below `minZoom` (default 14) to avoid loading hundreds of thousands of features at county scale.
- **Spatial index:** PARCEL_DRAW_TOOL pre-filters centroid candidates with a 20×20 lat/lng grid index before the full ray-cast, reducing per-polygon work to roughly O(n × bbox_coverage_fraction).
- **GeoJSON connector cache:** GeoJSONParcelConnector fetches the source file once and filters client-side on subsequent calls.
