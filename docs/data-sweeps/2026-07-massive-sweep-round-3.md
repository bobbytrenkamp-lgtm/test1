# US DC & AI Policy Tracker — Massive Data Sweep: Round 3

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** Market gap-fill and thin-state expansion — key metro corridors, secondary markets, underrepresented states

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 529 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 529 |
| Duplicate FIPS | 0 |
| Validation errors | 0 |
| Validation warnings | 393 |

---

## Phase 1 — Repository Audit

### Findings

**State coverage distribution (consolidated, accounting for abbreviation/full-name mixing):**
All 50 states + DC had at least 1 county record entering this round. States with < 5 records:
- Delaware (3): All 3 counties already covered — Delaware has only 3 counties total. Fully covered by definition.
- South Dakota (3): Minnehaha (Sioux Falls), Pennington (Rapid City), Lincoln — needed 2 more
- Hawaii (4): All 4 main counties (Honolulu, Maui, Hawaii, Kauai) — fully covered by definition
- Vermont (4): Chittenden, Washington, Rutland, Windsor — needed Franklin + one more
- Alaska (4): Anchorage, Fairbanks, Matanuska-Susitna, Kenai Peninsula — needed Juneau at minimum
- New Mexico (4): Bernalillo, Valencia, Santa Fe, Doña Ana — needed 2 more

**Key market gaps identified:**
- Richmond VA corridor: Hanover County not yet covered (Henrico was; Chesterfield was)
- Jacksonville FL: Nassau County missing
- Tampa Bay: Manatee and Hernando counties not covered
- Gainesville FL: Alachua County (UF HiPerGator) missing
- South Houston: Brazoria County 48039 already covered, 48046 was a wrong FIPS (fixed)
- San Antonio expansion: Guadalupe County (48187) missing (FIPS 48163 was wrong)
- Chicago north: Lake County and Kendall County not covered
- Charlotte west: Gaston County not covered
- Raleigh NE: Franklin County not covered
- Minneapolis east: Washington County MN not covered
- Kansas City north: Clay County MO not covered
- Columbus exurb: Perry and Hocking counties (AEP territory) missing
- Denver exurb: Elbert County (IREA) missing
- Arizona cooler-climate: Yavapai County missing
- Nashville west: Cheatham County missing
- Park City UT: Summit County missing
- Georgia NW (Chattanooga): Walker, Murray, Catoosa counties missing
- Eastern West Virginia: Jefferson County (DC spillover market) missing
- Appalachian Ohio River WV: Wood County already covered (54107)
- Louisiana Northshore: St. Tammany (22103) already covered; 22087 was wrong FIPS (fixed)

**FIPS errors found and fixed in this round:**
| Bad FIPS | Intended | Correct FIPS | Resolution |
|---|---|---|---|
| 48046 | Brazoria County TX | 48039 (already in DB) | Removed duplicate |
| 48163 | Guadalupe County TX | 48187 | Fixed FIPS in place |
| 22087 | St. Tammany Parish LA | 22103 (already in DB) | Removed duplicate |
| 54103 | Wood County WV | 54107 (already in DB) | Removed duplicate |

---

## Phase 2 — State Sweep (Round 3)

### State-by-State Changes

| State | Reviewed | Key Finding | Records Added |
|---|---|---|---|
| Virginia | ✓ | Hanover County (Richmond north suburb) added | 1 |
| Florida | ✓ | Nassau (Jacksonville), Manatee, Hernando, Alachua (UF) added | 4 |
| Texas | ✓ | Guadalupe (48187) added; Bastrop added | 2 |
| Illinois | ✓ | Lake County (Chicago north) and Kendall County added | 2 |
| North Carolina | ✓ | Franklin (Raleigh NE) and Gaston (Charlotte west) added | 2 |
| Minnesota | ✓ | Washington County (Minneapolis east, Woodbury/Cottage Grove) added | 1 |
| Missouri | ✓ | Clay County (KC north) added | 1 |
| Ohio | ✓ | Perry and Hocking (AEP territory) added | 2 |
| Colorado | ✓ | Elbert County (IREA territory, Denver exurb) added | 1 |
| Arizona | ✓ | Yavapai County (Prescott, cooler climate) added | 1 |
| Tennessee | ✓ | Cheatham County (Nashville west, TVA) added | 1 |
| Utah | ✓ | Summit County (Park City) added | 1 |
| South Dakota | ✓ | Codington (Watertown) and Brown (Aberdeen) added — now 5 records | 2 |
| New Mexico | ✓ | Torrance and Otero counties added — now 6 records | 2 |
| Nevada | ✓ | Nye County (Pahrump) added | 1 |
| Georgia | ✓ | Walker, Murray, Catoosa counties (NW GA/Chattanooga) added | 3 |
| Alabama | ✓ | Lee County (Auburn/Auburn University) added | 1 |
| Pennsylvania | ✓ | Chester County (Philadelphia west, pharma corridor) added | 1 |
| Louisiana | ✓ | St. Tammany already at 22103; confirmed no change needed | 0 |
| Kentucky | ✓ | Boyd County (Ashland, Ohio River industrial) added | 1 |
| Vermont | ✓ | Franklin County (St. Albans, cross-border) added — now 5 records | 1 |
| Alaska | ✓ | Juneau City and Borough added — now 5 records | 1 |
| West Virginia | ✓ | Jefferson County (Eastern Panhandle, DC spillover) added | 1 |

---

## Phase 3 — Market Coverage Analysis

### Key Metro Market Coverage After Round 3

| Market | Counties Checked | Covered | Coverage |
|---|---|---|---|
| Boston MA | 5 | 5 | 100% |
| Houston TX | 4 | 4 | 100% |
| Miami FL | 3 | 3 | 100% |
| Orlando FL | 3 | 3 | 100% |
| Portland OR/WA | 4 | 4 | 100% |
| Seattle WA | 4 | 4 | 100% |
| Northern Virginia | 8 | 6 | 75% |
| Dallas metro | 6 | 5 | 83% |
| Denver CO | 5 | 5 | 100% |
| Chicago metro | 4 | 4 | 100% |
| Columbus OH | 4 | 3 | 75% |
| Minneapolis MN | 4 | 4 | 100% |
| Nashville TN | 4 | 4 | 100% |
| Charlotte NC | 3 | 3 | 100% |
| Raleigh NC | 3 | 3 | 100% |
| Atlanta GA | — | 27 counties | Strong |
| Tampa FL | 3 | 3 | 100% |
| Jacksonville FL | 3 | 2 | 67% |
| Salt Lake City UT | 4 | 4 | 100% |
| San Antonio TX | 3 | 2 | 67% |
| Las Vegas NV | 3 | 2 | 67% |
| Kansas City MO/KS | 4 | 4 | 100% |
| Richmond VA | 3 | 3 | 100% |

---

## Phase 4 — Validation Results (Post-Sweep)

Run after fixes and regeneration:
- **Critical errors: 0** (4 FIPS errors found and fixed during this sweep)
- **Errors: 0**
- **Warnings: 399** (up 6 from 393 baseline — all cosmetic, same pre-existing pattern for level=-1 entries)
- **Info: 450**
- All FIPS codes verified against 3,143-county reference
- All lifecycle_stage values valid
- State regulations schema valid

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 33 net new entries (36 attempted, 3 removed as duplicates after FIPS error detection)

| FIPS | Name | State | Level | Type |
|---|---|---|---|---|
| 01081 | Lee County | Alabama | -1 | data_center, ai |
| 02110 | Juneau City and Borough | Alaska | -1 | data_center |
| 04025 | Yavapai County | Arizona | -1 | data_center, energy |
| 08039 | Elbert County | Colorado | -1 | data_center, energy |
| 12001 | Alachua County | Florida | -1 | data_center, ai |
| 12053 | Hernando County | Florida | -1 | data_center |
| 12081 | Manatee County | Florida | -1 | data_center |
| 12089 | Nassau County | Florida | -1 | data_center |
| 13047 | Catoosa County | Georgia | -1 | data_center, energy |
| 13213 | Murray County | Georgia | -1 | data_center, energy |
| 13295 | Walker County | Georgia | -1 | data_center, energy |
| 17093 | Kendall County | Illinois | -1 | data_center |
| 17097 | Lake County | Illinois | -1 | data_center |
| 21019 | Boyd County | Kentucky | -1 | data_center, energy |
| 27163 | Washington County | Minnesota | -1 | data_center |
| 29047 | Clay County | Missouri | -1 | data_center |
| 32023 | Nye County | Nevada | -1 | data_center, energy |
| 35035 | Otero County | New Mexico | -1 | data_center, energy |
| 35057 | Torrance County | New Mexico | -1 | data_center |
| 37069 | Franklin County | North Carolina | -1 | data_center |
| 37071 | Gaston County | North Carolina | -1 | data_center, energy |
| 39073 | Hocking County | Ohio | -1 | data_center, energy |
| 39127 | Perry County | Ohio | -1 | data_center, energy |
| 42029 | Chester County | Pennsylvania | -1 | data_center |
| 46013 | Brown County | South Dakota | -1 | data_center |
| 46029 | Codington County | South Dakota | -1 | data_center |
| 47021 | Cheatham County | Tennessee | -1 | data_center, energy |
| 48021 | Bastrop County | Texas | -1 | data_center, energy |
| 48187 | Guadalupe County | Texas | -1 | data_center |
| 49043 | Summit County | Utah | -1 | data_center |
| 50011 | Franklin County | Vermont | -1 | data_center |
| 51085 | Hanover County | Virginia | -1 | data_center |
| 54037 | Jefferson County | West Virginia | -1 | data_center |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 33 net new county records (36 added, 3 duplicates removed)
- `data/map_data.json` — regenerated (562 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-3.md` — this document (new)

---

## FIPS Quality Lessons

This round caught 4 FIPS mismatches. The errors followed a pattern: when looking up county FIPS codes from memory, off-by-one or off-by-few errors occur in large states with many counties (TX has 254 counties, LA has 64 parishes, WV has 55 counties). Future sweeps should cross-reference a county list or use the validate_all.py output to catch these before generating entries.

Verified error-prone cases:
- Brazoria County TX = 48039 (not 48046)
- Guadalupe County TX = 48187 (not 48163)
- St. Tammany Parish LA = 22103 (not 22087)
- Wood County WV = 54107 (not 54103)

---

## Unresolved Gaps

1. **Northern Virginia completeness**: Manassas Park city (51685) and Falls Church city (51610) remain uncovered — both very small independent cities; less impactful than the covered major counties.
2. **Jacksonville FL**: Nassau County added; St. Johns County (12109) and Baker County (12003) still not covered.
3. **San Antonio TX**: Guadalupe County (48187) added; Comal County (48091) and Medina County (48325) not yet covered.
4. **Las Vegas NV outskirts**: Nye County (Pahrump) added; Clark County (Las Vegas) and Washoe County (Reno) already documented.
5. **Crypto/mining distinction**: Still unresolved across many records (see previous rounds).
6. **AI policy 2025 updates**: Colorado SB 24-205, NY proposed AI legislation, FL, TX 2025 session outcomes need individual record-level review.

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] Stable FIPS IDs preserved
- [x] No exact duplicates introduced
- [x] 4 FIPS errors detected and corrected
- [x] All new records level=-1 (pro data center / no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py run to regenerate map_data.json
- [x] 0 critical errors post-validation
- [x] State regulations unchanged (no new state-level entries needed)
- [x] All previous sweep records preserved
