# Zoning Intelligence — Field Dictionary

Reference for every field in the zoning data model.

---

## jurisdiction.json

| Field | Type | Required | Description |
|---|---|---|---|
| `jurisdiction_id` | string | ✓ | Unique ID: `{state}-{county}-county` (e.g., `va-loudoun-county`) |
| `jurisdiction_name` | string | ✓ | Full official name (e.g., "Loudoun County, Virginia") |
| `jurisdiction_type` | string | ✓ | "county", "city", "town", "municipality", "district" |
| `state` | string | ✓ | 2-letter US state abbreviation |
| `fips` | string | ✓ | 5-digit FIPS code (zero-padded) |
| `controlling_authority` | string | | Body that adopts the zoning ordinance |
| `official_planning_department_name` | string | | Full name of the planning department |
| `planning_department_url` | string | | URL to planning department website |
| `official_zoning_page_url` | string | | Direct URL to the zoning ordinance or zoning page |
| `gis_service_url` | string | | ArcGIS REST root or GeoJSON base URL |
| `open_data_portal_url` | string | | URL to county open data portal |
| `data_coverage_status` | string | | "full", "partial", "stub", "empty" |
| `geometry_coverage_status` | string | | "full", "partial", "demo_only", "unavailable" |
| `dimensional_standard_coverage` | string | | "full", "partial", "stub" |
| `permitted_use_coverage` | string | | "full", "partial", "stub" |
| `overlay_coverage` | string | | "full", "partial", "stub" |
| `verification_status` | string | ✓ | "verified", "high_confidence", "moderate_confidence", "low_confidence", "unverified" |
| `data_current_as_of` | string | | ISO date — when ordinance was last read |
| `data_center_relevance` | string | | "critical", "high", "moderate", "low" |
| `known_limitations` | array | | List of known gaps, caveats, or inaccuracies |
| `source_urls` | array | | Objects with `{type, url, last_verified}` |

---

## districts.json

Top-level structure: `{ "jurisdiction_id": "...", "districts": { "{code}": {...} } }`

| Field | Type | Required | Description |
|---|---|---|---|
| `district_name` | string | ✓ | Full official district name |
| `district_category` | string | ✓ | See enum below |
| `base_or_overlay` | string | ✓ | "base", "overlay", or "both" |
| `confidence_level` | string | ✓ | See confidence levels |
| `official_source_url` | string | | URL to the ordinance section defining this district |
| `description` | string | | Brief description from the ordinance's statement of purpose |
| `dc_eligibility_summary` | string | | Plain-language summary of data center eligibility |
| `reviewer_notes` | string | | Internal notes for data curators |

**district_category values:**
residential, multifamily_residential, mixed_use, commercial, office, industrial, light_industrial, heavy_industrial, agricultural, institutional, planned_development, form_based, transit_oriented, conservation, special_purpose, overlay, unclassified

---

## dimensional_standards.json

Top-level structure: `{ "jurisdiction_id": "...", "standards_by_district": { "{code}": { "standards": {...}, "conditional_rules": [...] } } }`

### ZoningValue Object (standards entries)

| Field | Type | Required | Description |
|---|---|---|---|
| `value` | number or null | ✓ | Numeric value, or null if unknown |
| `unit` | string | ✓ | "feet", "acres", "square_feet", "percent", "dwelling_units_per_acre", "dimensionless" |
| `original_text` | string | ✓ | Exact text from the ordinance |
| `conditions` | array | | Conditions under which the value changes |
| `exceptions` | array | | Named exceptions or variances |
| `source_section` | string | | Ordinance section number (e.g., "§ 4-302(A)") |
| `confidence_level` | string | ✓ | See confidence levels |
| `verification_status` | string | ✓ | See verification status values |
| `manual_review_required` | boolean | ✓ | True if the value requires case-by-case analysis |
| `notes` | string | | Additional context |

**verification_status values:**
- `verified` — confirmed from official source with section cited
- `requires_official_verification` — value found but needs confirmation
- `conflicting_sources` — two official sources disagree
- `not_found` — searched but not in ordinance
- `not_applicable` — this standard does not apply to this district

### ConditionalRule Object (conditional_rules entries)

Used for dimensional standards that can't be expressed as a single number (e.g., setbacks that vary by adjacency to residential).

| Field | Type | Required | Description |
|---|---|---|---|
| `rule_type` | string | ✓ | "setback_increase", "height_reduction", "coverage_reduction", "lot_size_increase", "custom" |
| `base_value` | number | | Default value before condition applies |
| `alternate_value` | number | | Value when condition is met |
| `condition_field` | string | | The factor that triggers the alternate value |
| `condition_operator` | string | | "adjacent_to", "greater_than", "less_than", "equals" |
| `formula` | string | | For complex calculations (e.g., "1:1 for each foot of height over 45ft") |
| `original_text` | string | ✓ | Exact ordinance text |
| `manual_review_required` | boolean | ✓ | Almost always true for conditional rules |

---

## permitted_uses.json

Top-level structure: `{ "jurisdiction_id": "...", "uses": [...] }`

Each use record:

| Field | Type | Required | Description |
|---|---|---|---|
| `district_code` | string | ✓ | Matches a key in districts.json |
| `standardized_use_id` | string | ✓ | See use enum below |
| `official_use_name` | string | ✓ | Exact name from the jurisdiction's use table |
| `permission_status` | string | ✓ | See permission_status enum |
| `approval_type` | string | | If additional approval is needed (e.g., "special_use_permit") |
| `conditions` | array | | Conditions attached to the use |
| `confidence_level` | string | ✓ | See confidence levels |
| `manual_review_required` | boolean | ✓ | True if determination requires local analysis |
| `notes` | string | | Additional context |
| `use_taxonomy_note` | string | | Explains how the official use maps to standardized_use_id |
| `official_source_url` | string | | URL to the use table section |
| `source_section` | string | | Section number |

**permission_status values (12):**
permitted_by_right, permitted_with_limitations, accessory, conditional, special_exception, special_use_permit, administrative_approval, site_plan_approval, prohibited, not_listed, unclear, manual_review_required

**standardized_use_id values (selected):**
data_center, telecommunications_facility, battery_storage, renewable_energy, electric_substation, natural_gas_facility, warehouse, logistics_facility, light_manufacturing, heavy_manufacturing, research_development, office, data_center_overlay, utility, industrial_park, colocation_facility, hyperscale_data_center, modular_data_center, edge_computing_facility

---

## overlays.json

Top-level structure: `{ "jurisdiction_id": "...", "overlays": { "{code}": {...} } }`

| Field | Type | Required | Description |
|---|---|---|---|
| `overlay_name` | string | ✓ | Official overlay name |
| `overlay_type` | string | | "noise", "height", "design", "environmental", "use_restriction", "special_purpose" |
| `what_it_affects` | array | ✓ | List of what the overlay regulates |
| `confidence_level` | string | ✓ | See confidence levels |
| `official_source_url` | string | | URL to the overlay chapter in the ordinance |
| `gis_layer_url` | string | | URL to the GIS layer showing the overlay boundary |
| `key_requirements` | object | | Key restrictions imposed by the overlay |
| `interaction_with_base_zoning` | string | | How the overlay interacts with base districts |
| `note` | string | | Additional context |

---

## normalized/{id}.json (export)

Produced by `export_zoning.py`. Frontend-ready merged format.

| Field | Type | Description |
|---|---|---|
| `jurisdiction_id` | string | |
| `exported_at` | string | ISO timestamp |
| `disclaimer` | string | Required legal disclaimer (always display) |
| `jurisdiction` | object | From jurisdiction.json |
| `districts` | object | Merged: district + standards + uses + dc_analysis |
| `overlays` | object | From overlays.json |
| `geometry_available` | boolean | True if GeoJSON file exists |
| `validation_summary` | object | From validation_report.json |

### dc_analysis object (per district in the export)

| Field | Type | Description |
|---|---|---|
| `base_zoning_status` | string | permission_status for the data_center use |
| `official_use_name` | string | Exact official name |
| `approval_type` | string | Additional approval required |
| `conditions` | array | Attached conditions |
| `confidence_level` | string | Confidence in this determination |
| `manual_review_required` | boolean | |
| `notes` | string | |
| `applicable_overlays` | array | All overlays in the jurisdiction (GIS check required for parcel applicability) |
| `overall_assessment` | string | See values below |

**overall_assessment values:**
- `potentially_eligible` — base zoning permits data centers (by right, conditional, or SUP)
- `not_eligible` — explicitly prohibited
- `unclear` — use not listed or determination requires local interpretation
- `requires_review` — complex situation requiring professional analysis

---

## Confidence Levels (all schemas)

| Value | Description |
|---|---|
| `verified` | Confirmed with exact ordinance citation |
| `high` | Pulled from official source; cross-checked |
| `moderate` | From official source; not cross-checked |
| `low` | Based on general knowledge; not confirmed |
| `unverified` | Source unknown or unofficial |
| `unavailable` | Not yet researched |
