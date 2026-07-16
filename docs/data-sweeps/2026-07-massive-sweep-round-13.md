# US DC & AI Policy Tracker — Massive Data Sweep: Round 13

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** IL military/industrial, NE beef/rail depth, KS ranch-belt processing, OK energy HQs, IA Mississippi corridor, SD military/dams, AR/MS/MT secondary

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 743 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 743 |
| Validation errors | 0 |
| Validation warnings | 448 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 05091 | Miller County | Arkansas | -1 | Texarkana AR/ArkLaTex bi-state hub |
| 05145 | White County | Arkansas | -1 | Searcy/Harding University/LR north |
| 17115 | Macon County | Illinois | -1 | Decatur/ADM HQ/agricultural processing |
| 17119 | Madison County | Illinois | -1 | Alton/Granite City/St. Louis Metro East |
| 17163 | St. Clair County | Illinois | -1 | Belleville/Scott AFB/US TRANSCOM |
| 19045 | Clinton County | Iowa | -1 | Clinton/DuPont-Chemours/Mississippi River |
| 19139 | Muscatine County | Iowa | -1 | Muscatine/HNI/Grain Processing/MS River |
| 20055 | Finney County | Kansas | -1 | Garden City/Tyson Fresh Meats/massive load |
| 20061 | Geary County | Kansas | -1 | Junction City/Fort Riley/1st Infantry Div |
| 20079 | Harvey County | Kansas | -1 | Newton/BNSF hub/Wichita north suburb |
| 28149 | Warren County | Mississippi | -1 | Vicksburg/ERDC/Army CoE research |
| 30081 | Ravalli County | Montana | -1 | Hamilton/Bitterroot Valley/USFS Research |
| 31001 | Adams County | Nebraska | -1 | Hastings/mid-Nebraska hub |
| 31047 | Dawson County | Nebraska | -1 | Lexington/JBS beef processing/NPPD |
| 31157 | Scotts Bluff County | Nebraska | -1 | Scottsbluff/Western NE panhandle hub |
| 31185 | York County | Nebraska | -1 | York/I-80 fiber route waypoint |
| 40071 | Kay County | Oklahoma | -1 | Ponca City/Phillips 66 refinery |
| 40147 | Washington County | Oklahoma | -1 | Bartlesville/Phillips 66 global HQ |
| 46093 | Meade County | South Dakota | -1 | Sturgis/Ellsworth AFB/B-1B Lancer |
| 46135 | Yankton County | South Dakota | -1 | Yankton/Gavins Point Dam/WAPA hydro |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (763 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-13.md` — this document (new)

---

## Notable Additions

**St. Clair County IL (17163 — Scott AFB/TRANSCOM)**: US Transportation Command coordinates all military global logistics — the Pentagon's shipping nerve center. TRANSCOM's computing infrastructure for managing global military supply chains, air transport, and sealift operations at Scott AFB represents one of the most significant federal IT concentrations in the Midwest outside Northern Virginia. A significant omission now corrected.

**Macon County IL (17115 — ADM Decatur)**: Archer Daniels Midland processes more agricultural commodities by volume than nearly any other company in the world. ADM's Decatur campus — corn wet milling, soybean crushing, ethanol production — is among the most electrically intensive industrial complexes in Illinois, driving massive Ameren substation buildout. A data center adjacent to ADM's Decatur operations would have access to exceptional industrial power infrastructure.

**Dawson County NE (31047 — JBS Lexington)**: JBS USA's Lexington beef plant processes thousands of cattle daily and employs 5,000+ workers — making it one of the largest single-site food processing operations in the US. The industrial electrical load from this facility creates high-capacity NPPD substation infrastructure in a rural Nebraska county. Nebraska Public Power District's very low rates make this county attractive for large data center users who prioritize power cost.

**Warren County MS (28149 — ERDC Vicksburg)**: The US Army Engineer Research and Development Center is the Army Corps' primary science laboratory. ERDC's hydraulics, geotechnical, and environmental research requires significant high-performance computing. The Waterways Experiment Station has operated in Vicksburg since World War II, making it one of the longest-running federal research computing sites in the South.

**Finney County KS (20055 — Tyson Garden City)**: Tyson's Garden City plant processes approximately 5,500 head of cattle per day. The industrial electrical load from beef slaughter and processing operations in Finney County is among the highest per-capita of any Kansas county, driven through Evergy's southwest Kansas transmission infrastructure. Kansas's wind belt surrounds the county, giving it potential renewable energy access at favorable pricing.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 459 (up 11 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (fourth consecutive clean round)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json
- [x] 0 critical errors post-validation
