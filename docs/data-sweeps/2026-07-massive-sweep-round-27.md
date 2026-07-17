# US DC & AI Policy Tracker — Massive Data Sweep: Round 27

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** OK/UT/MN/TX/VA/IL/MO/NE — Salt Plains crystals, Cairo confluence, Topaz incarceration camp, Boundary Waters, Branson tourism

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1023 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1023 |
| Validation errors | 0 |
| Validation warnings | 915 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 40003 | Alfalfa County | Oklahoma | -1 | Cherokee/Great Salt Plains/selenite crystals/NW Oklahoma wheat belt |
| 40029 | Coal County | Oklahoma | -1 | Coalgate/Arbuckle Mountains/Choctaw Nation territory/SE Oklahoma |
| 40049 | Garvin County | Oklahoma | -1 | Pauls Valley/Washita River/I-35 mid-Oklahoma corridor/Chickasaw Nation |
| 40055 | Greer County | Oklahoma | -1 | Mangum/disputed Texas annexation history/Quartz Mountain Arts Center |
| 49013 | Duchesne County | Utah | -1 | Roosevelt/Uinta Basin oil/Ute tribal lands/Rocky Mountain Power |
| 49027 | Millard County | Utah | -1 | Delta/Topaz WWII incarceration camp/Sevier Desert/largest UT county area |
| 49031 | Piute County | Utah | -1 | Junction/Southern Paiute heritage/one of smallest US county populations |
| 27009 | Benton County | Minnesota | -1 | Foley/St. Cloud metro adjacent/St. Cloud State University corridor |
| 27075 | Lake County | Minnesota | -1 | Two Harbors/Lake Superior ore docks/Boundary Waters gateway/North Shore |
| 27033 | Cottonwood County | Minnesota | -1 | Windom/SW Minnesota wind corridor/Lake Shetek/Buffalo Ridge extension |
| 48185 | Grimes County | Texas | -1 | Anderson/Navasota/Brazos River/Houston-Bryan corridor |
| 48217 | Hill County | Texas | -1 | Hillsboro/I-35 central Texas/DFW-Waco corridor/Oncor ERCOT grid |
| 51169 | Scott County | Virginia | -1 | Gate City/Daniel Boone Wilderness Trail/SW Virginia coalfields/ARC broadband |
| 51173 | Smyth County | Virginia | -1 | Marion/Holston River/Mount Rogers proximity/I-81 Appalachian spine/TVA |
| 17069 | Hardin County | Illinois | -1 | Elizabethtown/smallest IL county/Ohio River/Shawnee National Forest |
| 17003 | Alexander County | Illinois | -1 | Cairo/confluence Mississippi-Ohio rivers/Civil War supply base/Army Corps |
| 29223 | Wayne County | Missouri | -1 | Greenville/Current River/Ozark National Scenic Riverways/Clearwater Lake |
| 29209 | Stone County | Missouri | -1 | Galena/Table Rock Lake/Branson adjacent/Silver Dollar City/Ozark tourism |
| 31137 | Phelps County | Nebraska | -1 | Holdrege/Republican River/CNPPID irrigation district SCADA hub |
| 31147 | Richardson County | Nebraska | -1 | Falls City/NE-KS-MO tri-state corner/Big Nemaha River watershed |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1043 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-27.md` — this document (new)

---

## Notable Additions

**Alexander County IL (17003 — Cairo/Mississippi-Ohio Confluence)**: Cairo, Illinois occupies a physical geography unlike almost any other city in America — it sits on a narrow peninsula at the precise confluence of the Mississippi and Ohio rivers, surrounded by water on three sides and protected by a complex system of levees, floodwalls, and pumping stations operated by the US Army Corps of Engineers. During the Civil War, Cairo was Ulysses S. Grant's headquarters for the western campaigns and one of the Union's most critical logistics bases. The city's dramatic population decline from 21,000 (1900) to under 2,500 (2020) reflects decades of flood risk, racial tension, and deindustrialization. The Army Corps' Cairo District water management computing infrastructure remains significant relative to the county's current population.

**Millard County UT (49027 — Topaz Incarceration Camp)**: Topaz War Relocation Center (1942-1945) operated in Millard County's Sevier Desert — one of ten major WWII Japanese-American incarceration camps. At peak, Topaz held over 11,000 people, making it one of the ten largest "cities" in Utah during the war. The Topaz Museum in Delta preserves this history with digital collections, oral history databases, and archival IT. Millard County is also Utah's largest county by area — its vast desert territory along US-6 (connecting Salt Lake City to Las Vegas) is a natural fiber backbone corridor.

**Lake County MN (27075 — Two Harbors/Boundary Waters/Iron Range)**: Lake County stretches from Two Harbors on Lake Superior to the Canadian border — encompassing both the world-famous Boundary Waters Canoe Area Wilderness and the taconite shipping infrastructure of Two Harbors' ore docks. Two Harbors was built specifically as an iron ore port — the Duluth, Missabe and Iron Range Railway delivered taconite pellets to massive ore docks that loaded lake freighters bound for steel mills. The BWCA is one of the most visited wilderness areas in the US, generating Boundary Waters Permit Area IT and outfitter logistics systems. Lake Superior's shoreline fiber infrastructure provides connectivity despite the county's remote character.

**Greer County OK (40055 — Disputed Texas Annexation History)**: Greer County has one of the most unusual legal histories of any US county — it was claimed by Texas after the Civil War based on an 1819 treaty misinterpretation, and Texas administered it as an unorganized county for years before the US Supreme Court ruled in 1896 that the Red River's North Fork (not South Fork) was the correct boundary, awarding the territory to Oklahoma Territory instead. Quartz Mountain State Park in Greer County hosts the Quartz Mountain Arts and Conference Center — one of Oklahoma's premier arts education and conference facilities. Remote but institutionally distinctive.

**Phelps County NE (31137 — CNPPID Irrigation SCADA)**: The Central Nebraska Public Power and Irrigation District (CNPPID) operates one of the most extensive agricultural water management systems in the Great Plains — a network of canals, reservoirs, and pumping stations delivering water to hundreds of thousands of irrigated acres in the Republican and Platte River basins. Holdrege serves as a hub for this system. CNPPID's SCADA infrastructure monitors water levels, canal flows, and pump operations across a multi-county territory in real time. This level of water management computing complexity — in a county of 9,000 people — represents exactly the kind of non-obvious institutional IT that the tracker is designed to document.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 968 (up 53 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (sixteenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (sixteenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1043 counties)
- [x] 0 critical errors post-validation
