# Zoning Intelligence — Pilot Status

**Last updated:** 2026-07-17  
**Phase:** Pilot complete (Phase 1)  
**Coverage:** 1 of 7 evaluated jurisdictions

---

## Pilot Jurisdiction: Loudoun County, VA

| Attribute | Value |
|---|---|
| FIPS | 51107 |
| Jurisdiction ID | `va-loudoun-county` |
| State | Virginia |
| Data Center Relevance | **Critical** — world's largest data center market |
| Verification Status | Low confidence (pending official verification) |
| Geometry | Demo-only — real geometry requires ArcGIS pipeline run |
| Pipeline Status | Export complete; geometry fetch pending |

### Coverage Matrix

| Dimension | Status |
|---|---|
| District names | ✓ Pass |
| Dimensional standards | ⚠ Fail (low confidence, unverified) |
| Permitted uses | ⚠ Fail (moderate/low confidence) |
| Data center classification | ✓ Pass (7/7 districts) |
| Overlay data | ⚠ Fail (low confidence) |
| Official source links | ✓ Pass |
| Source metadata | ✓ Pass |
| Confidence levels | ✓ Pass |
| GeoJSON geometry | ✗ Fail (demo only) |

### Districts on File

| Code | Name | Category | DC Status | Confidence |
|---|---|---|---|---|
| PD-IP | Planned Development — Industrial Park | planned_development | Potentially Eligible (by right) | moderate |
| I1 | General Industrial | light_industrial | Conditional (SUP required) | low |
| I2 | Heavy Industrial | heavy_industrial | Potentially Eligible (by right) | low |
| AR1 | Agricultural Rural | agricultural | Not Eligible (prohibited) | moderate |
| JLMA-3 | Joint Land Management Area | residential | Not Eligible (prohibited) | moderate |
| B2 | Community Business | commercial | Unclear | low |
| PD-OP | Planned Development — Office Park | office | Unclear | low |

### Key Zoning Facts

- **"Data Center Facility"** is an explicitly defined land use in Loudoun's ordinance — not an analogy to another use type.
- **Data Center Overlay District (DCOD)** imposes noise limits, screening requirements, generator restrictions, and residential buffer requirements on top of base zoning.
- **PD-IP** (Planned Development — Industrial Park) is the dominant zone for Loudoun's data center corridor. Most development is controlled by site-specific proffers, not base ordinance setbacks.
- **Airport Overlay** applies near Dulles International Airport (IAD) — height restrictions affect tall infrastructure.

### Known Limitations

1. Dimensional standards require verification against current Loudoun zoning ordinance. All values are low confidence.
2. PD-IP standards are primarily controlled by individual development plans, not the base ordinance. Standards on file are for illustrative purposes only.
3. GeoJSON polygon geometry not yet fetched — the ArcGIS pipeline must be run against Loudoun's LOGIS FeatureServer to obtain real district boundaries.
4. Data Center Overlay District boundary not yet mapped — parcel-level analysis requires GIS intersection.
5. Permitted uses for B2 (commercial) and PD-OP (office) districts are low confidence — research required.
6. Amendment tracking not yet implemented — zoning ordinances change and the data may be outdated.

### Required Actions

1. Run `fetch_zoning.py` against the Loudoun ArcGIS FeatureServer to download real district polygon geometry.
2. Verify all dimensional standards against Loudoun County Zoning Ordinance (Chapter 4).
3. Verify permitted uses for B2 and PD-OP districts.
4. Map DCOD overlay boundary from the official GIS layer.
5. Establish a review cadence for ordinance amendments.

---

## Next Recommended Jurisdictions (Phase 2)

Based on the pilot evaluation matrix (`data/zoning/validation/pilot_matrix.json`):

| Priority | Jurisdiction | FIPS | Score | Reason |
|---|---|---|---|---|
| 1 | Fairfax County, VA | 51059 | 21/24 | Adjacent to Loudoun; hyperscale data centers; excellent GIS |
| 2 | Montgomery County, MD | 24031 | 21/24 | Mid-Atlantic hub; data center growth corridor |
| 3 | Prince William County, VA | 51153 | — | Northern Virginia DC corridor; PD-I zones |
| 4 | Wake County, NC | 37183 | 19/24 | Research Triangle data center market |
| 5 | DC (District of Columbia) | 11001 | 23/24 | Highest data quality; complex regulatory environment |

### Criteria for Adding a Jurisdiction

1. Public ArcGIS FeatureServer or direct GeoJSON download available (no login required)
2. Official online zoning ordinance accessible (Municode, city website, or OpenOrd)
3. Data center use definition present or analog use identifiable in the ordinance
4. FIPS code maps to one county or equivalent jurisdiction
5. Data center market activity confirmed (existing facilities or active proposals)

---

## Architecture Notes

- Each jurisdiction has a directory: `data/zoning/jurisdictions/{id}/`
- Component files: `jurisdiction.json`, `districts.json`, `dimensional_standards.json`, `permitted_uses.json`, `overlays.json`, `validation_report.json`
- Normalized export: `data/zoning/normalized/{id}.json` (frontend-ready merged file)
- Geometry: `data/zoning/geometry/{id}.geojson` (fetched by pipeline, not committed if large)
- Frontend FIPS mapping: `js/zoning.js` → `FIPS_TO_JURISDICTION` constant
- Pipeline: `data/zoning/scripts/run_zoning_pipeline.py --jurisdiction {id}`
- CI/CD: `.github/workflows/update_zoning.yml` (weekly Wednesday 05:00 UTC)
