# US DC & AI Policy Tracker — Massive Data Sweep: Round 8

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** Texas Gulf/West expansion, Florida nuclear/growth, Georgia South, New England completion, Ohio industrial, Missouri state capital

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 643 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 643 |
| Validation errors | 0 |
| Validation warnings | 418 |

---

## Phase 1 — Repository Audit

### Findings

**Texas (31 entering)**: Major Gulf Coast and West Texas markets not documented — Nueces (Corpus Christi/Port/petrochemical), Hidalgo (McAllen/Rio Grande Valley — one of the fastest-growing US metros), Potter (Amarillo — Xcel Energy/Southwestern Public Service's extreme wind surplus), Jefferson (Beaumont/Port Arthur petrochemical hub), Wichita (Wichita Falls/Sheppard AFB).

**Florida (27 entering)**: Citrus County (Crystal River nuclear decommission — exceptional power infrastructure), Flagler County (Palm Coast — fast growing), Clay County (Orange Park/Jacksonville SW).

**Georgia (29 entering)**: Whitfield County (Dalton — carpet manufacturing, TVA/MEAG power with some of the lowest industrial rates in GA), Lowndes County (Valdosta, South GA hub), Walton County (Monroe — Atlanta east exurb growing rapidly).

**Connecticut (7 of 8 entering)**: Litchfield County (NW corner) not documented — adding to complete CT's 8-county coverage.

**New Hampshire (5 entering)**: Grafton County (Hanover/Dartmouth) absent despite being a significant AI research hub.

**Maine (5 entering)**: Androscoggin County (Lewiston-Auburn — 2nd largest ME metro), York County (southern ME, fastest growing, Boston spillover).

**Ohio (21 entering)**: Medina County (fast-growing Cleveland-Akron suburb), Wood County (Bowling Green/Perrysburg — Toledo south suburb), Trumbull County (Warren/Youngstown north) not documented.

**Missouri (15 entering)**: Cole County (Jefferson City — state capital government IT) and Phelps County (Rolla/Missouri S&T university research) not documented.

**FIPS error caught:**
| Bad FIPS | Attempted Name | Actual County at That FIPS | Resolution |
|---|---|---|---|
| 13301 | Whitfield County GA | Warren County GA (Warrenton) | Fixed in place → 13313 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 1 FIPS corrected in-place, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 09005 | Litchfield County | Connecticut | -1 | NW CT completion/Eversource |
| 12017 | Citrus County | Florida | -1 | Crystal River nuclear infrastructure |
| 12019 | Clay County | Florida | -1 | Orange Park/Jacksonville SW |
| 12035 | Flagler County | Florida | -1 | Palm Coast/NE FL growth |
| 13185 | Lowndes County | Georgia | -1 | Valdosta/Moody AFB |
| 13297 | Walton County | Georgia | -1 | Monroe/Atlanta east exurb |
| 13313 | Whitfield County | Georgia | -1 | Dalton/carpet power/TVA-MEAG |
| 23001 | Androscoggin County | Maine | -1 | Lewiston-Auburn/CMP |
| 23031 | York County | Maine | -1 | Southern ME/Boston spillover |
| 29051 | Cole County | Missouri | -1 | Jefferson City/state capital IT |
| 29161 | Phelps County | Missouri | -1 | Rolla/Missouri S&T/Fort Leonard Wood |
| 33009 | Grafton County | New Hampshire | -1 | Dartmouth/Upper Valley tech |
| 39103 | Medina County | Ohio | -1 | Cleveland-Akron exurb/FirstEnergy |
| 39155 | Trumbull County | Ohio | -1 | Warren-Niles/AEP industrial |
| 39173 | Wood County | Ohio | -1 | Bowling Green-Perrysburg/AEP |
| 48215 | Hidalgo County | Texas | -1 | McAllen/RGV/AEP Texas |
| 48245 | Jefferson County | Texas | -1 | Beaumont/petrochemical/Entergy TX |
| 48355 | Nueces County | Texas | -1 | Corpus Christi/Port/AEP Texas |
| 48375 | Potter County | Texas | -1 | Amarillo/Xcel wind/Pantex |
| 48485 | Wichita County | Texas | -1 | Wichita Falls/Sheppard AFB |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (663 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-8.md` — this document (new)

---

## Notable Additions

**Potter County TX (48375 — Amarillo/Xcel wind)**: Southwestern Public Service (Xcel Energy) serves the Texas Panhandle with some of the lowest commercial electricity rates in the US, driven by extraordinary wind generation capacity. The Texas Panhandle is among the windiest places in the country, giving Potter County a structural cost advantage for power-intensive data center workloads — particularly relevant for AI training compute.

**Citrus County FL (12017 — Crystal River nuclear infrastructure)**: The decommissioned Crystal River Nuclear Plant left behind exceptional high-power transmission substations and power delivery infrastructure. Duke Energy Florida's large-capacity grid in the county represents a distinctive opportunity for large-load data center developers seeking nuclear-grade power infrastructure in Florida.

**Whitfield County GA (13313 — Dalton carpet industry)**: The global carpet manufacturing capital has some of the highest industrial power loads per capita of any small metro in Georgia. TVA power through MEAG provides competitive industrial rates that have historically attracted large-load users. The data center appeal here is unique: high-capacity substations already serving heavy industrial loads in a county with very favorable power pricing.

---

## Validation Results (Post-Sweep)

- Critical: 0 (1 FIPS error fixed in-place)
- Errors: 0
- Warnings: 418 (unchanged from pre-sweep — new entries carry good source quality)
- All FIPS codes verified against 3,143-county reference

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] 1 FIPS error caught and fixed in-place (13301→13313, Whitfield County GA)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json
- [x] 0 critical errors post-validation
