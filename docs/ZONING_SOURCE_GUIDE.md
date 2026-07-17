# Zoning Intelligence — Source Guide

How to find, evaluate, and add official zoning data for a new jurisdiction.

---

## Source Tiers

| Tier | Type | Examples | Trust Level |
|---|---|---|---|
| 1 | Official government GIS | ArcGIS FeatureServer at logis.loudoun.gov, county open data portals, .gov GeoJSON | Authoritative |
| 1 | Official ordinance text | Municode, American Legal Publishing, county/city .gov websites | Authoritative |
| 2 | Aggregated open data | OpenStreetMap (buildings only), Census TIGER (boundaries only) | Reference only |
| 3 | Commercial/derived | CoStar, Regrid, OpenZoning, LLM inference | Do not use |

**Rule:** Only Tier 1 sources may be used as the basis for zoning district data. Tier 2 sources may be used for geographic reference (checking whether a parcel is in a county boundary) but not for zoning classifications. Tier 3 sources must never be ingested.

---

## Finding Official GIS Sources

### Step 1: ArcGIS REST Catalog

Most counties and municipalities publish zoning polygons through ArcGIS FeatureServer. To find it:

1. Search: `[county name] ArcGIS REST services` or `[county name] GIS open data`
2. Common URL patterns:
   - `https://gis.{county}.gov/arcgis/rest/services/`
   - `https://{county}gis.opendata.arcgis.com/`
   - `https://services{N}.arcgis.com/.../{county}.../FeatureServer`
3. Look for a layer containing "Zoning" in the name
4. Verify it's a FeatureServer (not MapServer) — FeatureServer supports feature queries
5. Confirm the layer returns `{ "type": "FeatureCollection" }` at `/query?where=1%3D1&f=geojson`

### Step 2: Direct GeoJSON / Shapefile Download

Many counties offer bulk downloads from their open data portals:
- Search: `[county name] open data zoning GeoJSON`
- ArcHub portals: `[county].opendata.arcgis.com`
- Socrata portals: `data.[county].gov/browse?q=zoning`
- CKAN portals: similar search

Prefer GeoJSON over Shapefile — it loads directly without conversion.

### Step 3: Official Zoning Ordinance

Required for dimensional standards and permitted uses. Sources:
- **Municode:** `library.municode.com` — largest collection of US municipal codes
- **American Legal Publishing:** `codelibrary.amlegal.com`
- County/city planning department website (search "zoning ordinance" or "unified development code")

---

## Source Registry Format

Add the source to `data/zoning/sources/source_registry.json`:

```json
"va-{county}-county": {
  "sources": [
    {
      "source_id": "{jurisdiction_id}-ordinance",
      "source_type": "ordinance",
      "jurisdiction_id": "{jurisdiction_id}",
      "name": "{County} Zoning Ordinance",
      "url": "https://library.municode.com/...",
      "tier": 1,
      "last_verified": "YYYY-MM-DD",
      "notes": ""
    },
    {
      "source_id": "{jurisdiction_id}-gis",
      "source_type": "gis_services",
      "jurisdiction_id": "{jurisdiction_id}",
      "name": "{County} GIS Services",
      "url": "https://gis.{county}.gov/arcgis/rest/services/",
      "tier": 1,
      "last_verified": "YYYY-MM-DD",
      "notes": "ArcGIS FeatureServer available at /Zoning/0"
    }
  ]
}
```

---

## Adding a New Jurisdiction

### 1. Create the jurisdiction directory

```
data/zoning/jurisdictions/{state-abbrv}-{county-name}/
```

Follow the pattern: `va-loudoun-county`, `md-montgomery-county`, `va-fairfax-county`.

### 2. Create jurisdiction.json

Copy from `va-loudoun-county/jurisdiction.json` and fill in:
- `jurisdiction_id` — matches directory name
- `jurisdiction_name` — full official name
- `fips` — 5-digit FIPS code (zero-padded)
- `state` — 2-letter abbreviation
- `controlling_authority` — full name of the authority that adopts the zoning ordinance
- `gis_service_url` — ArcGIS REST root or GeoJSON download URL
- `open_data_portal_url` — if separate from gis_service_url
- `official_zoning_page_url` — the planning department's zoning page
- `data_center_relevance` — critical / high / moderate / low
- `verification_status` — start at "unverified"; advance as data is verified
- `known_limitations` — list all gaps and caveats

### 3. Configure fetch in zoning_config.py

Add an entry to `JURISDICTION_CONFIGS`:

```python
"va-{name}-county": {
    "jurisdiction_id": "va-{name}-county",
    "gis_type":        "arcgis_featureserver",  # or "geojson_download"
    "gis_url":         "https://...",
    "layer_index":     0,
    "district_code_field":  "ZONING",   # field name in GIS attributes
    "district_name_field":  "ZONING_DESC",  # optional
    "where_clause":    "1=1",
    "min_expected_features": 50,
}
```

### 4. Create districts.json

Populate from the official zoning ordinance. Required fields per district:
- `district_name` — full official name
- `district_category` — from the schema enum
- `base_or_overlay` — "base", "overlay", or "both"
- `confidence_level` — start at "low" or "unverified" until verified
- `official_source_url` — URL to the section of the ordinance defining this district

Do NOT invent district names or categories. If you can't confirm a district's category from the ordinance, use "unclassified".

### 5. Create dimensional_standards.json

Populate from the zoning schedule / dimensional standards table in the ordinance. For every value:
- Set `verification_status: "requires_official_verification"`
- Set `manual_review_required: true`
- Record `original_text` — the exact text from the ordinance
- Record `source_section` — e.g., "§ 4-302(A)"

Do NOT guess or interpolate values. If a value can't be found in the ordinance, omit the field or set `verification_status: "not_found"`.

### 6. Create permitted_uses.json

For each district, create a use entry for `data_center` (or the equivalent use in the local ordinance). Use the official use name from the use table, not a generic term.

If data centers aren't separately defined, find the closest analog (e.g., "Computer and Electronic Manufacturing," "Technology Campus," "Utility/Industrial Use"). Note the analog in `use_taxonomy_note`.

If the use is simply not listed and there's no analog, set `permission_status: "not_listed"` and `confidence_level: "low"`.

### 7. Create overlays.json

List any overlay districts that may affect data center development:
- Noise/utility overlays
- Airport height restriction areas
- Historic preservation overlays
- Flood zones (FEMA)
- Environmental conservation overlays
- Specific use overlays (e.g., Loudoun's DCOD)

### 8. Run the pipeline

```bash
cd data/zoning/scripts
python run_zoning_pipeline.py --jurisdiction {id}
```

Review the validation output. All errors must be resolved before the export goes to production.

### 9. Register the FIPS in js/zoning.js

Add to `FIPS_TO_JURISDICTION`:
```js
"51059": "va-fairfax-county",
```

### 10. Test

1. Open the map in a browser
2. Toggle "Zoning Districts" in the Layers panel
3. Click on the newly covered county
4. Verify the panel opens and shows the district browser
5. If geometry was fetched, click a polygon and verify the district detail view

---

## Data Quality Standards

Before adding a jurisdiction to production coverage:

- [ ] All districts have `district_name`, `district_category`, `confidence_level`
- [ ] All districts have `official_source_url` pointing to the controlling ordinance
- [ ] Data center classification present for all districts (even if `not_listed`)
- [ ] At least one Tier 1 source URL confirmed accessible and non-login-gated
- [ ] `jurisdiction.json` has `known_limitations` documenting all unresolved gaps
- [ ] `validation_report.json` shows no errors (warnings are acceptable)
- [ ] Disclaimer is propagated to the normalized export

---

## What NOT to Do

- **Do not use LLM inference** to fill in zoning details. Hallucinated values could cause real harm to site-selection decisions.
- **Do not use commercial real-estate data** (CoStar, LoopNet, Regrid, etc.) as a data source — these are derived, often outdated, and not authoritative.
- **Do not infer** that a use is permitted because similar uses are permitted — zoning law does not work that way.
- **Do not overwrite production data** with partial downloads, error pages, or empty responses — the pipeline has safety checks; don't bypass them.
- **Do not omit the disclaimer** from any data exported to the frontend.
