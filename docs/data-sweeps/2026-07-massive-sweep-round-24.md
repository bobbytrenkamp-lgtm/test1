# US DC & AI Policy Tracker — Massive Data Sweep: Round 24

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** WV/IL/TX/GA/TN/AR/MT/MS — Laughlin AFB, Dahlonega first US gold rush, Beartooth Pass, Berkeley Springs first US spa

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 963 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 963 |
| Validation errors | 0 |
| Validation warnings | 798 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 54007 | Braxton County | West Virginia | -1 | Sutton/Elk River/Burnsville Lake/central WV hub |
| 54009 | Brooke County | West Virginia | -1 | Wellsburg/northernmost WV/Ohio River/Marcellus gas |
| 54005 | Boone County | West Virginia | -1 | Madison/Big Coal River/longwall mining MSHA IT |
| 54065 | Morgan County | West Virginia | -1 | Berkeley Springs/first US spa/DC market second homes |
| 17029 | Coles County | Illinois | -1 | Charleston/Eastern Illinois University/Lincoln heritage |
| 17023 | Clark County | Illinois | -1 | Marshall/I-70 IL-IN border/Darwin oil field heritage |
| 17117 | Macoupin County | Illinois | -1 | Carlinville/Gillespie/coal labor history |
| 48465 | Val Verde County | Texas | -1 | Del Rio/Laughlin AFB/Amistad Reservoir/US-Mexico border |
| 48019 | Bandera County | Texas | -1 | Bandera/Cowboy Capital of the World/Hill Country |
| 13241 | Rabun County | Georgia | -1 | Clayton/NE GA mountains/Chattooga/lake resort community |
| 13281 | Towns County | Georgia | -1 | Hiawassee/Chatuge Lake/NE GA mountains |
| 13187 | Lumpkin County | Georgia | -1 | Dahlonega/first US gold rush/military college/wine country |
| 47069 | Hardeman County | Tennessee | -1 | Bolivar/west TN/Hatchie NWR/state hospital |
| 47151 | Scott County | Tennessee | -1 | Huntsville TN/Cumberland Plateau/Big South Fork |
| 05049 | Fulton County | Arkansas | -1 | Salem/Spring River Ozarks/north-central AR |
| 05073 | Lafayette County | Arkansas | -1 | Lewisville/SW Arkansas tri-state border |
| 30021 | Dawson County | Montana | -1 | Glendive/Makoshika dinosaur fossils/Yellowstone River |
| 30009 | Carbon County | Montana | -1 | Red Lodge/Beartooth Pass/Yellowstone gateway |
| 28113 | Pike County | Mississippi | -1 | McComb/I-55 south MS hub/civil rights heritage |
| 28163 | Yazoo County | Mississippi | -1 | Yazoo City/Mississippi Delta edge/natural gas heritage |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (983 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-24.md` — this document (new)

---

## Notable Additions

**Val Verde County TX (48465 — Del Rio/Laughlin AFB)**: Laughlin Air Force Base is the US Air Force's premier pilot training base — producing more rated military pilots than any other installation. The base's flight training management systems, simulator IT, and large training fleet create a major federal computing presence in a remote border county. Del Rio also manages the US side of Amistad International Reservoir — one of the largest US-Mexico joint water projects, with binational operations management IT. The Border Patrol's Del Rio sector covers a vast stretch of the Rio Grande, with surveillance systems and command infrastructure adding to the federal IT footprint.

**Lumpkin County GA (13187 — Dahlonega/First US Gold Rush)**: The United States' first major gold rush occurred in Lumpkin County, Georgia in 1829 — two decades before California. The US Branch Mint at Dahlonega produced over $6 million in gold coins before closing at the Civil War's start. Today, the University of North Georgia at Dahlonega is a senior military college — one of six in the US that feeds Army ROTC officer candidates. The county also has 30+ wineries in the emerging North Georgia wine appellation. Three distinct technology demand drivers (federal gold history, military education, wine agritourism) make Lumpkin County one of Georgia's most multifaceted small counties.

**Boone County WV (54005 — Coal/MSHA Mining IT)**: Underground coal mining generates some of the most regulation-intensive industrial IT in the US. MSHA (Mine Safety and Health Administration) requires continuous atmospheric monitoring (methane, CO2, oxygen), real-time miner tracking systems, underground communications networks, and emergency communications redundancy — all in explosive-atmosphere-rated equipment. Longwall mining operations' programmable logic controllers and conveyor management systems create sophisticated SCADA networks underground. The Big Coal River valley's mining heritage represents decades of investment in specialized industrial IT that serves as unusual technical infrastructure for a rural Appalachian county.

**Morgan County WV (54065 — Berkeley Springs/First US Spa)**: Berkeley Springs (Bath, WV) is America's oldest spa — George Washington was a regular visitor, and the springs attracted wealthy colonials before the Revolution. The town has maintained its spa identity for 250+ years, making it one of the oldest continuous tourism destinations in the US. Morgan County's proximity to the DC metro area — about 120 miles west — has made it a weekend retreat and second-home market. The influx of DC-area tech and government professionals as second-home owners has driven broadband investment in this small (16,000 population) Eastern Panhandle county well above its permanent residential needs.

**Carbon County MT (30009 — Red Lodge/Beartooth Highway)**: The Beartooth Highway (US-212) is the highest paved highway in the United States, climbing to 10,947 feet above sea level at Beartooth Pass. The highway connects Red Lodge to Yellowstone National Park's northeast entrance and is widely cited as America's most scenic highway. Carbon County's coal mining past (Red Lodge was a significant late 19th/early 20th century coal producer) created electrical infrastructure that has supported the county's tourism and recreation transition. NorthWestern Energy's transmission infrastructure through the Beartooth region serves both the coal legacy loads and the growing tourism economy.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 828 (up 30 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (thirteenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (thirteenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (983 counties)
- [x] 0 critical errors post-validation
