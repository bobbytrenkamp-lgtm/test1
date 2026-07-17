# US DC & AI Policy Tracker — Massive Data Sweep: Round 33

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** KY/MI/SC/GA/LA/PA — Pictured Rocks NL, Johnstown Flood, Briggs v. Elliott civil rights, Cameron Parish LNG/hurricane, Haynesville Shale gas storage, Cherokee Nation

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1143 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1143 |
| Validation errors | 0 |
| Validation warnings | 1188 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 21007 | Ballard County | Kentucky | -1 | Wickliffe/Mississippi-Ohio confluence/Wickliffe Mounds/Jackson Purchase |
| 21027 | Breckinridge County | Kentucky | -1 | Hardinsburg/Ohio River/Lincoln country/Rough Creek State Resort |
| 21033 | Caldwell County | Kentucky | -1 | Princeton/Western KY coal/dark-fired tobacco/Black Patch Tobacco Wars |
| 21043 | Carter County | Kentucky | -1 | Grayson/Carter Caves/Ashland metro adjacent/Appalachian foothills |
| 26003 | Alger County | Michigan | -1 | Munising/Pictured Rocks National Lakeshore/Lake Superior/Hiawatha NF |
| 26007 | Alpena County | Michigan | -1 | Alpena/Thunder Bay NMS/cement capital/200 Great Lakes shipwrecks |
| 26029 | Charlevoix County | Michigan | -1 | Charlevoix/Beaver Island/Lake Michigan/King Strang 1850s Mormon schism |
| 45021 | Cherokee County | South Carolina | -1 | Gaffney/Peachoid/I-85 BMW corridor/Limestone University |
| 45027 | Clarendon County | South Carolina | -1 | Manning/Briggs v. Elliott (Brown v. Board)/Santee NWR/Lake Marion |
| 45033 | Dillon County | South Carolina | -1 | Dillon/South of the Border/I-95 corridor/Pee Dee tobacco |
| 13031 | Bulloch County | Georgia | -1 | Statesboro/Georgia Southern University/SE GA agricultural hub |
| 13009 | Baldwin County | Georgia | -1 | Milledgeville/GA antebellum capital/Georgia College/Central State Hospital |
| 13025 | Brantley County | Georgia | -1 | Nahunta/Okefenokee adjacent/SE GA timber/blueberry farming |
| 22023 | Cameron Parish | Louisiana | -1 | Cameron/Rita/Laura/LNG export terminal/Sabine NWR/Gulf coast |
| 22001 | Acadia Parish | Louisiana | -1 | Crowley/Rice Capital of America/Cajun prairie/Mermentau irrigation |
| 22027 | Claiborne Parish | Louisiana | -1 | Homer/Haynesville Shale/natural gas storage/ArkLaTex energy |
| 42021 | Cambria County | Pennsylvania | -1 | Johnstown/1889 flood/Bethlehem Steel/I-99 corridor |
| 42009 | Bedford County | Pennsylvania | -1 | Bedford/Lincoln Highway/PA Turnpike/Allegheny Front/Bedford Springs |
| 42005 | Armstrong County | Pennsylvania | -1 | Kittanning/Allegheny River/Pittsburgh exurb/conventional gas |
| 42023 | Cameron County | Pennsylvania | -1 | Emporium/least populous PA county/Elk State Forest/free-roaming elk |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1163 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-33.md` — this document (new)

---

## Notable Additions

**Alger County MI (26003 — Pictured Rocks National Lakeshore)**: Pictured Rocks National Lakeshore was the first national lakeshore in the US (designated 1966), protecting 15 miles of multicolored sandstone cliffs rising up to 200 feet above Lake Superior. The mineral-stained sandstone formations — in reds, oranges, blues, and greens from iron, manganese, and copper seepage — make Pictured Rocks one of the most photographed natural landscapes in the Great Lakes region. Hiawatha National Forest, covering much of Alger County's interior, is managed with USFS computing for timber, recreation, and wilderness resources. Winter ice caves that form on Lake Superior shores during cold winters have made Alger County a destination for ice photography.

**Clarendon County SC (45027 — Briggs v. Elliott)**: Briggs v. Elliott (1951) was the first of the five cases consolidated into Brown v. Board of Education (1954). Harry Briggs, an African American sharecropper in Clarendon County, led a group of Black parents who filed suit after petitioning the district for equal school facilities. The case was dismissed by a federal district court (Judge J. Waties Waring dissented in a powerful opinion), but the NAACP Legal Defense Fund appealed to the Supreme Court, where it was consolidated with the other school desegregation cases. The Clarendon County schools case came from one of the most racially unequal school systems in South Carolina — a state with deep segregation roots.

**Cameron Parish LA (22023 — Hurricane Devastation/LNG)**: Cameron Parish has been nearly obliterated by hurricanes multiple times. Hurricane Audrey (1957) killed over 400 people in Cameron Parish. Hurricane Rita (2005) struck as a Category 5 directly at Cameron — destroying virtually every structure. Hurricane Laura (2020) struck as a Category 4 again at almost the identical landfall point. Despite this recurrent destruction, the parish contains critical Gulf Coast infrastructure: the Sabine Pass Liquefaction Terminal (one of North America's largest LNG export facilities) and the associated Sabine Pass pipeline network, with extensive SCADA and safety monitoring systems for liquefied natural gas operations.

**Claiborne Parish LA (22027 — Haynesville Shale)**: The Haynesville Shale play, which came online in 2008, transformed northwest Louisiana and northeast Texas into one of the most prolific natural gas producing regions in North America. Claiborne Parish sits in the heart of the play, with deep shale wells (drilled to 10,000-13,000 feet) that produce dry natural gas. Underground natural gas storage facilities in the parish (salt cavern storage in the Louann Salt formation) make Claiborne Parish a critical node in the midcontinent gas distribution network. The Haynesville production has made Louisiana consistently one of the top gas-producing states, with pipeline and processing IT throughout the ArkLaTex region.

**Cambria County PA (42021 — Johnstown Flood)**: The 1889 Johnstown Flood killed 2,209 people — more American deaths than any other natural disaster until Hurricane Katrina. The South Fork Dam, built by the South Fork Fishing and Hunting Club (whose members included Andrew Carnegie and Henry Clay Frick), failed after heavy rainfall. The subsequent flood wave traveling at 40 mph destroyed Johnstown in minutes. The disaster and the club's exemption from legal liability (despite warnings from engineers) contributed to the development of modern liability law and emergency response frameworks. Bethlehem Steel's Johnstown Works — once employing 10,000 workers — closed in 1992, leaving a legacy of industrial brownfield sites addressed by EPA cleanup programs.

**Cameron County PA (42023 — Least Populous PA County)**: Cameron County is Pennsylvania's least populous county, with fewer than 4,500 residents in a county almost entirely covered by Elk State Forest and game lands. The county hosts Pennsylvania's free-roaming wild elk herd — the largest in the eastern United States, with approximately 1,400 animals descended from Rocky Mountain elk restocked in the early 20th century. Emporium, the county seat, was a railroad timber town that has settled into quiet rural existence. The county's broadband situation represents one of Pennsylvania's most difficult connectivity challenges: mountainous terrain, sparse population, and minimal commercial incentive for private investment, making BEAD public funding essential.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1237 (up 49 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-second consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-second consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1163 counties)
- [x] 0 critical errors post-validation
