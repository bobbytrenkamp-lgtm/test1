# US DC & AI Policy Tracker — Massive Data Sweep: Round 29

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** CO/AL/VA/MI/ND/NM/TX/MT — Muscle Shoals sound, San Luis oldest CO town, PrairyErth, Freestone lignite plant brownfield, Helen Keller birthplace

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1063 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1063 |
| Validation errors | 0 |
| Validation warnings | 1009 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 08103 | Rio Blanco County | Colorado | -1 | Meeker/White River oil shale/Rangely oil field/Flat Tops wilderness |
| 08011 | Bent County | Colorado | -1 | Las Animas/Bent's Fort NHS/Santa Fe Trail/Comanche National Grassland |
| 08023 | Costilla County | Colorado | -1 | San Luis/oldest CO town/San Luis Valley/Spanish land grant/Sangre de Cristo |
| 08053 | Hinsdale County | Colorado | -1 | Lake City/least populous CO county/San Juan Mountains/Alferd Packer |
| 01077 | Lauderdale County | Alabama | -1 | Florence/W.C. Handy birthplace/Wilson Dam TVA/Muscle Shoals adjacent |
| 01009 | Blount County | Alabama | -1 | Oneonta/Covered Bridge Capital/Birmingham exurb/south Appalachian foothills |
| 01033 | Colbert County | Alabama | -1 | Muscle Shoals/FAME Studios/Helen Keller birthplace Tuscumbia/TVA Wilson Dam |
| 51049 | Cumberland County | Virginia | -1 | Cumberland CH/central VA/James River watershed/Richmond influence zone |
| 51143 | Pittsylvania County | Virginia | -1 | Chatham/Danville adjacent/tobacco transition/Microsoft data center/I-85 corridor |
| 51155 | Pulaski County | Virginia | -1 | Pulaski/Volvo Trucks Dublin/Radford AAP adjacent/New River Valley industrial |
| 26119 | Montmorency County | Michigan | -1 | Atlanta MI/largest MI elk herd east of Mississippi/AuSable River headwaters |
| 26047 | Emmet County | Michigan | -1 | Petoskey/Harbor Springs/Little Traverse Bay resort/Bay Harbor brownfield |
| 38049 | McHenry County | North Dakota | -1 | Towner/Souris River/north-central ND/Basin Electric grid/USDA ReConnect |
| 38067 | Pembina County | North Dakota | -1 | Cavalier/oldest ND settlement/Canadian border crossings/CBP commercial IT |
| 35047 | San Miguel County | New Mexico | -1 | Las Vegas NM/NM Highlands University/Santa Fe Trail/Victorian heritage |
| 35023 | Hidalgo County | New Mexico | -1 | Lordsburg/extreme SW NM/Chiricahua Apache history/FCC broadband gap priority |
| 48161 | Freestone County | Texas | -1 | Fairfield/Big Brown Power Plant brownfield/ERCOT transmission/lignite legacy |
| 48285 | Lavaca County | Texas | -1 | Hallettsville/Shiner Bock/Czech heritage/Gulf Coastal Plain/Eagle Ford periphery |
| 30079 | Prairie County | Montana | -1 | Terry/Yellowstone River/eastern MT badlands/Fort Keogh adjacent/oil exploration |
| 30101 | Toole County | Montana | -1 | Shelby/Sweetgrass-Coutts border crossing/Dempsey-Gibbons fight/Blackfeet adjacent |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1083 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-29.md` — this document (new)

---

## Notable Additions

**Colbert County AL (01033 — Muscle Shoals Sound/Helen Keller)**: FAME Studios in Muscle Shoals recorded some of the most important soul and rock music of the 20th century — Aretha Franklin recorded "I Never Loved a Man the Way I Love You" here in 1967, beginning a run of recordings that defined American soul music. The Rolling Stones, Wilson Pickett, Paul Simon, and dozens of other artists recorded at FAME and Muscle Shoals Sound Studio. Tuscumbia — Colbert County's second-largest city — is the birthplace of Helen Keller, whose family home Ivy Green is a pilgrimage site. TVA's Wilson Dam (also partly in adjacent Lauderdale County) provides the industrial-scale power that attracted manufacturers to the Shoals region, and Colbert County's energy infrastructure reflects the TVA era's legacy.

**Pittsylvania County VA (51143 — Danville/Data Center Corridor)**: Pittsylvania County is Virginia's largest county by area and is emerging as a significant data center development location. Microsoft has invested in the Danville area, and the Southern Virginia Technology Park positions Pittsylvania County within a growing data center corridor extending south from Northern Virginia. The county's tobacco heritage (historically among Virginia's highest tobacco-producing counties) has given way to a mixed economy, with economic development focusing on data infrastructure, advanced manufacturing, and the legacy Dan River textile industry. Dominion Energy's data center incentive programs apply to the Danville-Pittsylvania region, making it one of Virginia's most actively marketed data center destinations outside Northern Virginia.

**Hinsdale County CO (08053 — Least Populous CO County)**: With approximately 800 permanent residents, Hinsdale County is Colorado's least populous county — and one of the least connected. Lake City sits at nearly 9,000 feet elevation, surrounded by 14,000-foot peaks. Alferd Packer's 1874 case — in which he allegedly killed and consumed his five companions during a winter crossing of the San Juan Mountains — made Hinsdale County the site of America's most infamous frontier cannibalism trial. Despite its tiny population, Colorado's BEAD broadband program includes Hinsdale County in its most challenging access tier. The county's Alpine Loop backcountry 4WD route and high-altitude wilderness generate US Forest Service management IT and emergency communications infrastructure.

**Freestone County TX (48161 — Big Brown Brownfield/ERCOT)**: The Big Brown Power Plant in Freestone County was once one of the largest lignite coal-fired generating facilities in Texas — burning surface-mined lignite coal from the adjacent Big Brown Mine. The plant's 2018 closure created a significant brownfield opportunity: existing transmission lines, cooling water infrastructure, and grid connections that are difficult and expensive to replicate. In Texas's deregulated ERCOT power market, legacy generation sites with existing grid connections are increasingly valuable for data center, battery storage, and clean energy development. Freestone County's grid infrastructure legacy and competitive land costs have placed it in data center industry site selection discussions.

**Toole County MT (30101 — Sweetgrass Border Crossing)**: The Sweetgrass-Coutts Port of Entry is one of the busiest commercial truck crossings on the northern US-Canada border — a major point of entry for Canadian oil, potash, and grain moving southward and American agricultural products moving north. Shelby, Montana is the Toole County seat and a commercial hub for the Sweetgrass Hills region. The 1923 Dempsey-Gibbons heavyweight boxing match in Shelby — a fight that nearly bankrupted the town — is one of the most storied events in Montana sports history. CBP commercial vehicle inspection systems, agricultural commodity tracking, and cross-border trade IT create federal computing infrastructure in this remote northern Montana county.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1056 (up 47 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (eighteenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (eighteenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1083 counties)
- [x] 0 critical errors post-validation
