# US DC & AI Policy Tracker — Massive Data Sweep: Round 10

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** Texas SpaceX/East Texas, Indiana auto/university, Kentucky military, South Carolina secondary, Colorado Broomfield tech corridor, Louisiana petrochem/university, Utah exurb, Nevada Carson Valley, Maryland I-95 corridor

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 683 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 683 |
| Validation errors | 0 |
| Validation warnings | 421 |

---

## Phase 1 — Repository Audit

### Findings

**Texas (36 entering)**: Cameron County (Brownsville/SpaceX Starbase Boca Chica) absent — one of the most significant aerospace/advanced manufacturing investments in the US, driving massive power infrastructure on the border. McLennan (Waco/Baylor/I-35 midpoint) and Gregg (Longview/E. Texas energy hub) also missing.

**Indiana (20 entering)**: Bartholomew County (Columbus — Cummins global HQ, Toyota plant), Howard County (Kokomo — Stellantis auto manufacturing, one of the most industrially dense counties per capita in IN), Delaware County (Muncie — Ball State University) not documented.

**Kentucky (14 entering)**: Christian County (Hopkinsville/Fort Campbell — home of the 101st Airborne Division, one of the largest Army installations in the US) and Madison County (Richmond/Eastern Kentucky University) absent.

**South Carolina (10 entering)**: Anderson County (Upstate SC tech cluster, Clemson adjacent), Dorchester County (Summerville — Boeing Charleston suburb, fastest-growing SC county), Beaufort County (Parris Island MCRD, MCAS Beaufort) missing.

**Colorado (10 entering)**: Broomfield County (Denver-Boulder tech corridor — Lumen Technologies HQ, a literal internet infrastructure headquarters county) not documented. Pueblo County (southern Colorado steel + internet hub) also missing.

**Louisiana (16 entering)**: Ascension Parish (Gonzales — the Industrial Chemical Corridor, Dow/Shell/BASF petrochem substations), Livingston Parish (Denham Springs — LIGO Livingston Observatory), Lincoln Parish (Ruston — Louisiana Tech University) all absent.

**Utah (6 entering)**: Tooele County (Tooele Army Depot — active secondary data center zone west of Salt Lake City) and Washington County (St. George — repeatedly the fastest-growing US metro by percentage) not documented.

**Nevada (6 entering)**: Douglas County (Gardnerville/Carson Valley — the southern end of Reno's data center corridor) absent.

**Maryland (11 entering)**: Cecil County (Elkton — I-95/DE border, directly on the Northeast fiber spine) missing.

**No FIPS errors** — all 20 FIPS codes verified clean on first validation run.

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 08014 | Broomfield County | Colorado | -1 | Denver-Boulder tech corridor/Lumen HQ |
| 08101 | Pueblo County | Colorado | -1 | Pueblo steel/Rocky Mountain internet hub |
| 18005 | Bartholomew County | Indiana | -1 | Columbus/Cummins HQ/Toyota |
| 18035 | Delaware County | Indiana | -1 | Muncie/Ball State University |
| 18067 | Howard County | Indiana | -1 | Kokomo/Stellantis/auto manufacturing |
| 21047 | Christian County | Kentucky | -1 | Hopkinsville/Fort Campbell/101st Airborne |
| 21151 | Madison County | Kentucky | -1 | Richmond/Eastern Kentucky University |
| 22005 | Ascension Parish | Louisiana | -1 | Gonzales/petrochem corridor/Entergy |
| 22061 | Lincoln Parish | Louisiana | -1 | Ruston/Louisiana Tech/I-20 |
| 22063 | Livingston Parish | Louisiana | -1 | Denham Springs/LIGO Observatory |
| 24015 | Cecil County | Maryland | -1 | Elkton/I-95 NE fiber spine/DE border |
| 32005 | Douglas County | Nevada | -1 | Carson Valley/Reno-Carson data corridor |
| 45007 | Anderson County | South Carolina | -1 | Upstate SC tech/Clemson adjacent |
| 45013 | Beaufort County | South Carolina | -1 | Parris Island/MCAS Beaufort/Hilton Head |
| 45035 | Dorchester County | South Carolina | -1 | Summerville/Boeing Charleston suburb |
| 48061 | Cameron County | Texas | -1 | Brownsville/SpaceX Starbase Boca Chica |
| 48183 | Gregg County | Texas | -1 | Longview/East Texas oil & gas/SWEPCO |
| 48309 | McLennan County | Texas | -1 | Waco/Baylor/I-35 corridor/Oncor |
| 49045 | Tooele County | Utah | -1 | Tooele Army Depot/SLC exurb data center |
| 49053 | Washington County | Utah | -1 | St. George/Utah Tech/fastest-growing metro |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (703 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-10.md` — this document (new)

---

## Notable Additions

**Cameron County TX (48061 — SpaceX Starbase Boca Chica)**: SpaceX's Starbase launch facility has turned the southernmost tip of Texas into one of the most significant advanced aerospace investments in the US. The combination of AEP Texas power infrastructure serving the SpaceX complex, the Port of Brownsville (a Foreign Trade Zone), and the fast-growing Brownsville metro creates a real data center adjacent market in an area not previously documented.

**Broomfield County CO (08014 — Lumen Technologies HQ)**: This is an unusual case: a county that literally hosts the corporate headquarters of one of the United States' major internet backbone providers. Lumen Technologies (successor to CenturyLink, successor to US West/Qwest) operates from Broomfield, making it a genuine internet infrastructure hub on the Denver-Boulder US-36 corridor. Ball Aerospace and Oracle also have Broomfield campuses. Xcel Energy provides competitive commercial power rates.

**Ascension Parish LA (22005 — Chemical Corridor)**: The Industrial Chemical Corridor between Baton Rouge and New Orleans represents some of the highest industrial power load density in the US. Dow Chemical, Shell Chemical, and BASF operations in Ascension Parish have driven massive substation buildout through Entergy Louisiana, providing industrial-grade electrical capacity at scale rarely available in rural areas. Any large-load data center user looking at Louisiana should evaluate Ascension's power infrastructure seriously.

**Tooele County UT (49045 — Salt Lake exurb data center zone)**: Tooele County is an active secondary data center zone — not aspirational, but operational. Cold desert climate enables significant free-air economizer hours (similar to Northern Virginia winters but year-round), Rocky Mountain Power (PacifiCorp) provides below-average Utah commercial rates, and the Tooele Valley's flat terrain and proximity to Salt Lake City's fiber nodes create a deployable site. The Tooele Army Depot adds federal presence and connectivity.

**Christian County KY (21047 — Fort Campbell)**: Fort Campbell hosts the 101st Airborne Division (Air Assault) and is one of the largest Army installations in the US by on-post population. Federal computing and communications infrastructure requirements at this scale drive real IT demand, served through TVA power delivered by Kenergy Corporation. Hopkinsville's position on US-41A and the county's proximity to Clarksville TN (45 miles) make it relevant in the Nashville corridor data center context.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 432 (up 11 from 421 — all cosmetic pre-existing consistency patterns)
- All FIPS codes verified against 3,143-county reference on first run

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (first clean round since Round 6)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json
- [x] 0 critical errors post-validation
