# Zoning Intelligence — NoVA Production Status

**Last updated:** 2026-08-15
**Phase:** NoVA milestone (Loudoun, Prince William, Fairfax) — zoning geometry live for all three; permitted-use research complete for Loudoun and Prince William's real district codes, in progress for Fairfax
**Coverage:** 3 of 3 in-scope jurisdictions have live geometry; the milestone is explicitly scoped to these three counties only (see `PROJECT_CONTEXT.md`) — do not expand nationwide until this workflow is proven here

---

## Jurisdiction Summary

| County | FIPS | Real district codes | Classified (DC eligibility researched) | District names on file | Geometry |
|---|---|---|---|---|---|
| Loudoun | 51107 | 58 | 3 (PD-IP, AR1, JLMA-3) | 7 (3 match a live code; I1/I2/B2 are pre-2023-rewrite codes with no live match) | Live (1,271 features) |
| Prince William | 51153 | 31 | 28 | 5 (SR-1/SR-1C/SR-5 "Semi-Rural Residential", RPC "Residential Planned Community", MXD-U "Mixed Use District-Urban") | Live (2,227 features) |
| Fairfax | 51059 | 44 | 0 | 0 | Live (6,242 features) |

"Classified" means a district has an actual data-center permitted-use determination (by-right / special use permit / conditional / prohibited) verified against real ordinance text — not merely a name or category. An unclassified district is `not_listed`: genuinely unresearched, never treated as prohibited.

None of the three counties' parcel services publish a native `zoning_code` attribute — `js/parcel/zoning-geometry.js` resolves a parcel's district via point-in-polygon spatial join against this geometry (see `PARCEL_ADD_JURISDICTION.md` / the module's own docstring).

---

## Loudoun County, VA (51107)

| Attribute | Value |
|---|---|
| Verification Status | Geometry live-verified 2026-08-13; only 3 of 58 real district codes have DC-eligibility research |
| Geometry | Live — `logis.loudoun.gov` COL/Zoning/MapServer layer 3, 1,271 polygon features |
| Known code-mismatch | Loudoun's 2023 Zoning Ordinance rewrite changed the code set; I1, I2, and B2 (three of the seven district codes with a researched name) do not match any current live code and never resolve on a real parcel |

### Districts with DC-eligibility research

| Code | Name | Category | DC Status | Confidence | Matches a live code? |
|---|---|---|---|---|---|
| PD-IP | Planned Development — Industrial Park | planned_development | Permitted by right | moderate | Yes |
| AR1 | Agricultural Rural | agricultural | Prohibited | moderate | Yes |
| JLMA-3 | Joint Land Management Area | residential | Prohibited | moderate | Yes |
| I1 | General Industrial | light_industrial | (researched, but code is legacy) | low | No — no live match |
| I2 | Heavy Industrial | heavy_industrial | (researched, but code is legacy) | low | No — no live match |
| B2 | Community Business | commercial | Unclear | low | No — no live match |
| PD-OP | Planned Development — Office Park | office | Unclear | low | Matches "PD-OP" in live data, `not_listed` for DC use |

### Known Limitations

1. 51 of 58 real live district codes have no research at all — `not_listed`, not prohibited.
2. Dimensional standards require verification against the current (2023-rewrite) ordinance; values on file are low confidence.
3. PD-IP standards are primarily controlled by individual development proffers, not the base ordinance.
4. Data Center Overlay District (DCOD) boundary not yet mapped from GIS — parcel-level overlay membership can't be checked.
5. I1/I2/B2's legacy-code mismatch (see above) means their research, while real, currently applies to zero live parcels until reconciled against the 2023 code set.

### Required Actions

1. Research the remaining 51 of 58 real live district codes against the current ordinance.
2. Reconcile or retire I1/I2/B2 — determine each legacy code's real current-ordinance equivalent, if any.
3. Map the DCOD overlay boundary from official GIS and wire it into the pipeline the way Prince William's Data Center Opportunity Zone Overlay District is documented (see below) — Loudoun's has not yet had its GIS layer located.

---

## Prince William County, VA (51153)

| Attribute | Value |
|---|---|
| Verification Status | Geometry and 28-of-31 permitted-use research live-verified 2026-08-15 |
| Geometry | Live — `gisweb.pwcva.gov` Planning/Zoning/MapServer layer 5, 2,227 polygon features |
| Overlay | Data Center Opportunity Zone Overlay District — real ordinance text verified (Sec. 32-509), real GIS boundary layer found (layer 7) but not yet spatially wired |

28 of 31 real district codes are classified: 17 prohibited (agricultural, residential, and named carve-outs PMR/B-2/B-3/V), 11 special-use-permit-eligible outside the Overlay (several upgrade to by-right inside it). CTY, FED, TWN remain genuinely unresearched. See `data/zoning/jurisdictions/va-prince-william-county/districts.json`, `permitted_uses.json`, and `overlays.json` for full per-code detail and ordinance citations.

### Known Limitations

1. The Data Center Opportunity Zone Overlay's real boundary geometry is not yet fetched/wired as a queryable spatial layer — classifications conservatively use the outside-overlay (Special Use Permit) level everywhere, which understates eligibility for parcels actually inside the Overlay but never overstates it.
2. CTY, FED, TWN could not be matched to an official category via primary-source research.
3. Dimensional standards have not been researched for any district — no buildable-envelope estimate is possible yet.
4. Most district codes' exact official titles remain unconfirmed even though their category and DC-eligibility are verified.

---

## Fairfax County, VA (51059)

| Attribute | Value |
|---|---|
| Verification Status | Geometry live-verified 2026-08-15; zero permitted-use research done |
| Geometry | Live — ArcGIS Online (`services1.arcgis.com`), Zoning/FeatureServer layer 0, filtered to `JURISDICTION='FAIRFAX COUNTY'`, 6,242 polygon features |

All 44 real district codes are `not_listed` (unresearched, not prohibited). This is the next research priority to bring Fairfax to parity with Prince William.

---

## Architecture Notes

- Each jurisdiction has a directory: `data/zoning/jurisdictions/{id}/`
- Component files: `jurisdiction.json`, `districts.json`, `dimensional_standards.json`, `permitted_uses.json`, `overlays.json`, `validation_report.json`
- Normalized export: `data/zoning/normalized/{id}.json` (frontend-ready merged file)
- Geometry: `data/zoning/geometry/{id}.geojson` (fetched by pipeline)
- Frontend FIPS mapping: `js/zoning.js` → `FIPS_TO_JURISDICTION` constant (and `js/parcel/zoning-geometry.js` → `FIPS_TO_JURISDICTION` for the parcel-level spatial join — kept as an intentionally separate copy, guarded by `tests/test_zoning_frontend_coverage.mjs`)
- Pipeline: `data/zoning/scripts/run_zoning_pipeline.py --jurisdiction {id}`
- CI/CD: `.github/workflows/update_zoning.yml` (weekly Wednesday 05:00 UTC, or manual dispatch with a `jurisdiction` input)

## Criteria for Adding a Jurisdiction (once the NoVA workflow is proven)

1. Public ArcGIS FeatureServer or direct GeoJSON download available (no login required) — try the host's own REST folder catalog first, then ArcGIS Online's public item-search API if that fails (some counties host on shared AGOL infrastructure rather than their own server).
2. Official online zoning ordinance accessible (Municode, city website, or similar) — note that many Municode-hosted codes are client-rendered SPAs with no server-side content; primary-source PDF documents (FAQs, ordinance amendment text, board packets) are often a more tractable path for a sandboxed research agent.
3. Data center use definition present or analog use identifiable in the ordinance.
4. FIPS code maps to one county or equivalent jurisdiction.
5. Data center market activity confirmed (existing facilities or active proposals).
