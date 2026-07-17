# Zoning Intelligence — Architecture

## Overview

The zoning intelligence layer adds district-level zoning data to the existing map. It is implemented as an opt-in overlay — the zoning layer is off by default and loads data only when the user toggles it on. All data is sourced from official government GIS services and public zoning ordinances; no paid APIs are used.

---

## Data Flow

```
Official GIS (ArcGIS FeatureServer / GeoJSON download)
    ↓  fetch_zoning.py
data/zoning/geometry/{id}.geojson   (polygon boundaries)
    ↓  normalize_zoning.py
Component files in data/zoning/jurisdictions/{id}/
    ↓  validate_zoning.py
    ↓  export_zoning.py
data/zoning/normalized/{id}.json    (frontend-ready merged JSON)
    ↓  GitHub Actions (update_zoning.yml, weekly)
    ↓  GitHub Pages CDN
    ↓  js/zoning.js (fetch on demand)
    ↓  js/zoning-details.js (render panel)
```

---

## Directory Structure

```
data/zoning/
├── schemas/                    JSON Schema definitions (validation reference)
│   ├── jurisdiction.schema.json
│   ├── district.schema.json
│   ├── dimensional_standards.schema.json
│   └── permitted_use.schema.json
├── sources/
│   └── source_registry.json    Official GIS source URLs per jurisdiction
├── jurisdictions/
│   └── {jurisdiction_id}/      One directory per covered jurisdiction
│       ├── jurisdiction.json       Jurisdiction metadata
│       ├── districts.json          District definitions
│       ├── dimensional_standards.json  Setbacks, heights, FAR, etc.
│       ├── permitted_uses.json     Use permissions per district
│       ├── overlays.json           Overlay district definitions
│       └── validation_report.json  Last validation run results
├── normalized/
│   └── {id}.json               Frontend-ready merged export
├── geometry/
│   └── {id}.geojson            GIS polygon data (fetched by pipeline)
├── validation/
│   └── pilot_matrix.json       Multi-jurisdiction evaluation scores
└── scripts/
    ├── zoning_config.py        Shared paths, constants, helpers
    ├── fetch_zoning.py         ArcGIS / GeoJSON geometry download
    ├── normalize_zoning.py     GIS attribute normalization
    ├── validate_zoning.py      Data quality validation
    ├── export_zoning.py        Build normalized/{id}.json
    └── run_zoning_pipeline.py  End-to-end orchestrator

js/
├── zoning.js          Core module: FIPS lookup, data loading, events
├── zoning-map.js      Leaflet layer: polygon rendering, click → select
└── zoning-details.js  Panel renderer: tabs, DC banner, standards table

css/
└── zoning.css         All zoning panel styles (uses existing CSS vars)

docs/
├── ZONING_ARCHITECTURE.md      (this file)
├── ZONING_SOURCE_GUIDE.md      How to find and add new jurisdictions
├── ZONING_VERIFICATION.md      Data verification workflow
├── ZONING_PILOT_STATUS.md      Coverage status and known gaps
└── ZONING_FIELD_DICTIONARY.md  Schema field definitions

.github/workflows/
└── update_zoning.yml   Weekly pipeline + commit + CI skip
```

---

## Frontend Modules

### js/zoning.js — `window.ZONING`

Core data module. Exposes a single `window.ZONING` singleton.

**Key responsibilities:**
- `FIPS_TO_JURISDICTION` mapping (county FIPS → jurisdiction ID)
- Lazy-load `data/zoning/normalized/{id}.json` on demand
- Session-level cache (one fetch per jurisdiction per page load)
- Emit `CustomEvent` on `document` for all state transitions
- Helper functions for formatting values and mapping enums to display classes

**Events emitted:**

| Event | Detail | Trigger |
|---|---|---|
| `zoning:loading` | `{ fips }` | Data fetch started |
| `zoning:jurisdiction-loaded` | `{ fips, jurisdictionId, data }` | Data fetched successfully |
| `zoning:district-selected` | `{ jurisdictionId, districtCode, district, data }` | User picks a district |
| `zoning:load-error` | `{ fips, error }` | Fetch failed |
| `zoning:no-coverage` | `{ fips }` | FIPS not in FIPS_TO_JURISDICTION |
| `zoning:cleared` | `{}` | Panel closed |

### js/zoning-map.js — `window.ZONING_MAP`

Leaflet layer manager. Integrates with the existing `layerState` system in map.js.

**Key responsibilities:**
- `onLayerToggle(layerId, enabled, fips)` — called by `setLayerVisible()` in map.js
- `onCountySelected(fips)` — called by `handleCountyClick()` in map.js when zoning layer is active
- Load GeoJSON geometry from `data/zoning/geometry/{id}.geojson`
- Render L.geoJSON layer with district fill colors by category
- Handle polygon click → call `ZONING.selectDistrict(code)`
- Manage `#zoning-panel` open/close state

**Geometry availability:** If no GeoJSON file exists for a jurisdiction, the panel still opens in district-browser mode (list of districts without map polygons). This is the current state for Loudoun County until the fetch pipeline is run.

### js/zoning-details.js

Panel renderer. Listens for `window.ZONING` events and builds panel HTML.

**Tabs:**
- **Overview:** DC eligibility banner + district summary (or district browser list)
- **Standards:** Dimensional standards table with confidence badges and unverified warnings
- **Uses:** Permitted uses list with search filter and status pills
- **Overlays:** Overlay district list with what-it-affects and confidence
- **Sources:** Official source URLs + validation warnings

---

## Data Model

### Jurisdiction (jurisdiction.json)

Top-level metadata about a covered jurisdiction.

Key fields: `jurisdiction_id`, `jurisdiction_name`, `state`, `fips`, `controlling_authority`, `gis_service_url`, `official_zoning_page_url`, `data_center_relevance`, `verification_status`, `known_limitations`.

### Districts (districts.json)

One entry per zoning district. Key fields: `district_name`, `district_category`, `base_or_overlay`, `confidence_level`, `official_source_url`, `dc_eligibility_summary`.

**district_category enum:** residential, multifamily_residential, mixed_use, commercial, office, industrial, light_industrial, heavy_industrial, agricultural, institutional, planned_development, form_based, transit_oriented, conservation, special_purpose, overlay, unclassified

### Dimensional Standards (dimensional_standards.json)

Standards are nested under `standards_by_district → {code} → standards → {name}`.

Each value is a **ZoningValue object:**
```json
{
  "value": 40,
  "unit": "feet",
  "original_text": "40 feet minimum",
  "conditions": ["May increase to 50 ft adjacent to residential"],
  "exceptions": [],
  "source_section": "§ 4-302(A)",
  "confidence_level": "low",
  "verification_status": "requires_official_verification",
  "manual_review_required": true,
  "notes": null
}
```

**verification_status values:** verified / requires_official_verification / conflicting_sources / not_found / not_applicable

Variable standards use a **ConditionalRule object** instead of a single ZoningValue. This handles setbacks that change based on proximity to residential, lot size, etc.

### Permitted Uses (permitted_uses.json)

Array of use records under `"uses"`. Each entry covers one `(district_code, standardized_use_id)` pair.

**permission_status values (12):** permitted_by_right / permitted_with_limitations / accessory / conditional / special_exception / special_use_permit / administrative_approval / site_plan_approval / prohibited / not_listed / unclear / manual_review_required

**standardized_use_id** normalizes across jurisdictions (e.g., every county's data center use maps to `"data_center"`).

### Normalized Export (normalized/{id}.json)

Produced by `export_zoning.py`. Merges all component files into a single JSON with:
- `districts` object: each district includes merged standards, uses, and `dc_analysis`
- `dc_analysis` per district: `{ base_zoning_status, overall_assessment, approval_type, conditions, confidence_level, applicable_overlays }`
- `overall_assessment` values: potentially_eligible / not_eligible / unclear / requires_review
- `disclaimer` string (required on all UI)
- `geometry_available` boolean

---

## Layer Registration in map.js

Two new entries in `LAYER_DEFS`:
```js
{ id: "zoning_districts", label: "Zoning Districts", group: "Zoning", color: "#7c3aed", sample: false },
{ id: "zoning_overlays",  label: "Zoning Overlays",  group: "Zoning", color: "#db2777", sample: false, noData: true },
```

`zoning_overlays` is marked `noData: true` (checkbox disabled) until overlay geometry is implemented.

The `setLayerVisible()` function in map.js calls `ZONING_MAP.onLayerToggle(id, visible, selectedFips)` for these two layer IDs.

---

## CI/CD

**Workflow:** `.github/workflows/update_zoning.yml`  
**Schedule:** Weekly, Wednesday 05:00 UTC  
**Trigger:** `workflow_dispatch` with optional `jurisdiction` and `skip_fetch` inputs  

The pipeline commits with `[skip ci]` to prevent a Pages redeploy for data-only changes. GitHub Pages serves the JSON files statically — the frontend fetches them at runtime with `cache: "no-store"`.

---

## Performance Considerations

- **No nationwide geometry at startup.** Zoning GeoJSON is loaded only when the user toggles the zoning layer and selects a county with coverage.
- **Session cache.** Once loaded, a jurisdiction's normalized JSON is cached in memory for the page session.
- **Lazy panel.** `#zoning-panel` starts with `width: 0` and expands only when opened.
- **GeoJSON size.** Loudoun County has ~hundreds of zoning district polygons. GeoJSON for a county should be under 5 MB after Shapely simplification (tolerance 0.001°).

---

## Security Notes

- All data is static JSON served from GitHub Pages. No server-side processing.
- No user input reaches any backend. Use search in the Uses tab is client-side only.
- `escHtml()` / `esc()` is applied to all data before inserting into innerHTML.
- No credentials, API keys, or service-role secrets are used in the zoning pipeline.
- Source data comes only from official government URLs (.gov, municode.com).
