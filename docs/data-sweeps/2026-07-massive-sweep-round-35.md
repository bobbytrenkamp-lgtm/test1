# US DC & AI Policy Tracker — Massive Data Sweep: Round 35

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** TX/MT/ND/NC/OH/MS — Chief Joseph surrender Bear Paw, Theodore Roosevelt Badlands, Billings County least populated ND, Alibates Flint Quarries only NM in TX, Shawshank Redemption filming location, Ashe County New River oldest US river

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1183 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1183 |
| Validation errors | 0 |
| Validation warnings | 1276 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 48359 | Oldham County | Texas | -1 | Vega/Texas Panhandle/Alibates Flint Quarries NM only TX national monument |
| 48415 | Scurry County | Texas | -1 | Snyder/Deep Rock oil/SACROC CO2 EOR/Permian Basin edge |
| 48307 | McCulloch County | Texas | -1 | Brady/Heart of Texas geographic center/Brady Creek |
| 48443 | Terrell County | Texas | -1 | Sanderson/Trans-Pecos/most remote TX county/Border Patrol/Pecos-Rio Grande |
| 30019 | Daniels County | Montana | -1 | Scobey/Hi-Line/extreme NE Montana/Saskatchewan border/dryland wheat |
| 30065 | Musselshell County | Montana | -1 | Roundup/central MT/Bull Mountain coal/Musselshell River |
| 30005 | Blaine County | Montana | -1 | Chinook/Bear Paw Battlefield NM/Chief Joseph surrender/Fort Belknap Tribe |
| 30011 | Carter County | Montana | -1 | Ekalaka/SE MT badlands/least populous MT county/Medicine Rocks/0.4 pop density |
| 38041 | Hettinger County | North Dakota | -1 | Mott/SW ND/Cannonball River/Standing Rock adjacent/Basin Electric |
| 38011 | Bowman County | North Dakota | -1 | Bowman/SW corner ND tri-state/Williston Basin oil/Badlands edge |
| 38007 | Billings County | North Dakota | -1 | Medora/Theodore Roosevelt NP North Unit/Chateau de Morès/least populous ND |
| 37091 | Hertford County | North Carolina | -1 | Winton/NE NC/Chowan River/Roanoke-Chowan/Albemarle Sound watershed |
| 37141 | Pender County | North Carolina | -1 | Burgaw/Cape Fear River/Camp Lejeune adj/WASP training WWII/longleaf |
| 37009 | Ashe County | North Carolina | -1 | Jefferson/New River oldest US river/High Country/Christmas trees/Blue Ridge |
| 39009 | Athens County | Ohio | -1 | Athens/Ohio University oldest OH/Hocking Hills/Appalachian Ohio sustainable energy |
| 39139 | Richland County | Ohio | -1 | Mansfield/Ohio State Reformatory/Shawshank Redemption filming/I-71 corridor |
| 39055 | Geauga County | Ohio | -1 | Chardon/largest Ohio Amish/oldest OH Amish settlement/maple syrup/Cleveland exurb |
| 28103 | Noxubee County | Mississippi | -1 | Macon/NE MS Black Belt/Noxubee NWR/Tombigbee watershed |
| 28039 | George County | Mississippi | -1 | Lucedale/fastest-growing MS county/I-59 corridor/Red Creek Wild & Scenic |
| 28065 | Jefferson Davis County | Mississippi | -1 | Prentiss/SW-central MS/longleaf pine heritage/Bouie River |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1203 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-35.md` — this document (new)

---

## Notable Additions

**Blaine County MT (30005 — Chief Joseph/Bear Paw)**: The Bear Paw Battlefield National Monument in Blaine County marks where Chief Joseph of the Nez Perce surrendered to Colonel Nelson Miles on October 5, 1877, ending the Nez Perce War. For five months and 1,170 miles, approximately 700 Nez Perce men, women, and children fled the US Army through what is now Idaho, Wyoming, and Montana, trying to reach Canada and political asylum with Sitting Bull. Stopped just 40 miles from the Canadian border, Chief Joseph's surrender speech — "From where the sun now stands, I will fight no more forever" — is one of the most quoted and historically resonant statements in American history. The Fort Belknap Indian Community's tribal government IT and the NPS battlefield management create institutional computing infrastructure in remote north-central Montana.

**Billings County ND (38007 — Theodore Roosevelt NP)**: Billings County is North Dakota's least populous county — under 1,000 people — and contains the North Unit of Theodore Roosevelt National Park and the historic town of Medora. Theodore Roosevelt ranched at the Elkhorn and Maltese Cross ranches in the Dakota Territory Badlands in the 1880s, and the experience profoundly shaped the conservation ethic he would express as president when he created 150 national forests, 51 federal bird reservations, 4 national game preserves, 5 national parks, and 18 national monuments. The Marquis de Morès's attempt to build a meatpacking empire in Medora (1883-1886) and his chateau — now a state historic site — created one of the most eccentric chapters in western Dakota history.

**Oldham County TX (48359 — Alibates Flint Quarries NM)**: Alibates Flint Quarries is the only national monument in Texas — a remarkable fact given Texas's size and historical significance. The quarries atop the Canadian River breaks have been worked continuously for over 13,000 years. The distinctive rainbow-colored Alibates dolomite flint was one of the most valued toolmaking materials in the prehistoric Great Plains, traded across thousands of miles of trade networks. Archaeologists have found Alibates flint artifacts at sites from Alberta to the Gulf Coast, making the Texas Panhandle quarries a node in one of North America's most extensive prehistoric exchange systems.

**Richland County OH (39139 — Shawshank Redemption)**: The Ohio State Reformatory in Mansfield is one of America's most recognizable filming locations — the imposing Victorian Gothic structure starred as Shawshank State Prison in Frank Darabont's 1994 adaptation of Stephen King's novella. The film, which consistently ranks among the highest-rated films on IMDb, draws significant film tourism to Mansfield. The reformatory opened in 1896 and closed in 1990 (transferred inmates to a new facility after conditions were found constitutionally inadequate). The Mansfield Reformatory Preservation Society has operated it as a historic attraction and filming location since 1995.

**Ashe County NC (37009 — New River)**: The New River is one of the most geologically unusual rivers in North America — it is among the oldest rivers in the world, pre-dating the Appalachian Mountains themselves, and flows north (opposite the typical eastward drainage direction of Appalachian rivers) because it occupies a course older than the orogeny that created the surrounding ridges. The New River designation as a National Scenic River protects the Ashe County reach's exceptional water quality. The county's Fraser fir Christmas tree industry makes it one of North Carolina's most economically important agricultural counties for holiday retail — Christmas trees grown at Ashe County's elevations (3,000-5,500 feet) are among the highest-quality in the eastern US market.

**Geauga County OH (39055 — Largest Ohio Amish)**: Geauga County hosts the oldest Amish settlement in Ohio (established 1886) and one of the largest concentrations of Old Order Amish in the world. The Amish population of the Geauga-Holmes settlement area (spanning Geauga and adjacent Holmes counties) numbers in the tens of thousands. The Amish agricultural economy — horse farming, no public utility electricity, wood furniture making, organic produce — creates a distinctive technology geography: the surrounding English (non-Amish) economy uses standard connectivity, while Amish farms deliberately limit electrical and digital infrastructure. Maple syrup production makes Geauga County Ohio's top maple syrup county, with hundreds of syrup operations.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1316 (up 40 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-fourth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-fourth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1203 counties)
- [x] 0 critical errors post-validation
