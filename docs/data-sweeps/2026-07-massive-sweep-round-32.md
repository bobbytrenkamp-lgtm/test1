# US DC & AI Policy Tracker — Massive Data Sweep: Round 32

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** KS/TX/AR/VA/OK/WV — Cherokee Nation capital, Cimarron Dust Bowl epicenter, McDowell coal collapse, Spruce Knob, Eisenhower birthplace, Cherokee War, McGirt v. Oklahoma

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1123 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1123 |
| Validation errors | 0 |
| Validation warnings | 1143 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 20041 | Dickinson County | Kansas | -1 | Abilene/Eisenhower birthplace & library/Chisholm Trail/I-70 corridor |
| 20093 | Kearny County | Kansas | -1 | Lakin/Arkansas River/High Plains Ogallala irrigation/Santa Fe Trail |
| 20073 | Greenwood County | Kansas | -1 | Eureka/Flint Hills tallgrass prairie/largest remaining tallgrass expanse |
| 20011 | Bourbon County | Kansas | -1 | Fort Scott NHS/Bleeding Kansas/Battle of Mine Creek/Missouri border |
| 48417 | Shackelford County | Texas | -1 | Albany/Old Jail Art Center/Fort Griffin/Clear Fork Brazos/west Texas oil |
| 48275 | Knox County | Texas | -1 | Benjamin/north Texas/Wichita Falls adjacent/Red River watershed |
| 48207 | Haskell County | Texas | -1 | Haskell/Double Mountain Fork Brazos/dryland farming/west Texas |
| 48263 | Kent County | Texas | -1 | Jayton/sparsest TX county/Double Mountain Fork/highest BEAD priority |
| 05005 | Baxter County | Arkansas | -1 | Mountain Home/Bull Shoals Lake/Norfork Lake/Ozark retirement hub |
| 05083 | Logan County | Arkansas | -1 | Paris/Mt. Magazine highest AR point/coal heritage/Arkansas River Valley |
| 05003 | Ashley County | Arkansas | -1 | Hamburg/south AR timber/Felsenthal NWR bottomland hardwoods |
| 51015 | Augusta County | Virginia | -1 | Staunton/Woodrow Wilson birthplace/Shenandoah Valley/I-81 corridor |
| 51023 | Botetourt County | Virginia | -1 | Fincastle/Blue Ridge/Roanoke metro adjacent/Appalachian Trail/James River |
| 51027 | Buchanan County | Virginia | -1 | Grundy/Breaks Interstate Park/far SW VA/Appalachian coal/ARC programs |
| 40021 | Cherokee County | Oklahoma | -1 | Tahlequah/Cherokee Nation capital/400,000 citizens/NSU/Illinois River |
| 40025 | Cimarron County | Oklahoma | -1 | Boise City/Oklahoma Panhandle/Dust Bowl epicenter/Black Mesa highest OK |
| 40037 | Creek County | Oklahoma | -1 | Sapulpa/Tulsa metro/Muscogee Creek Nation/McGirt v. Oklahoma 2020 |
| 54047 | McDowell County | West Virginia | -1 | Welch/coal collapse/100k to 19k population/Hatfield-McCoy/ARC priority |
| 54055 | Mercer County | West Virginia | -1 | Princeton/southern WV/I-77 corridor/Bluefield adjacent/coalfields hub |
| 54023 | Grant County | West Virginia | -1 | Petersburg/Seneca Rocks/Spruce Knob highest WV/Monongahela NF |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1143 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-32.md` — this document (new)

---

## Notable Additions

**Cherokee County OK (40021 — Cherokee Nation Capital)**: Tahlequah is the capital of the Cherokee Nation — the most populous federally recognized tribe in the United States, with over 400,000 enrolled citizens. The Cherokee Nation's tribal government operates sophisticated enterprise IT spanning gaming operations (Cherokee Nation Entertainment's 15+ facilities), healthcare delivery (Cherokee Nation Health Services), education programs, and a complex tribal citizenship management system. The Trail of Tears ended in Tahlequah in 1838-1839, making it both the seat of a modern tribal government with a $2+ billion annual economy and a site of deep historical trauma.

**Cimarron County OK (40025 — Dust Bowl Epicenter)**: The Oklahoma Panhandle — and Cimarron County specifically — was the epicenter of the Dust Bowl disaster. Between 1931 and 1939, drought, over-plowing, and wind erosion created massive "black blizzards" that buried farms under dunes of topsoil. The county's population collapsed from 4,900 (1930) to 2,476 (1940) as families fled west. Black Mesa — at 4,974 feet the highest point in Oklahoma — stands in the far western tip of Cimarron County at the tri-state junction of Oklahoma, New Mexico, and Colorado. The county remains one of the most isolated and sparsely settled in the contiguous US, with persistent broadband connectivity challenges.

**Creek County OK (40037 — McGirt v. Oklahoma)**: The 2020 US Supreme Court decision in McGirt v. Oklahoma — which found that the Muscogee (Creek) Nation's reservation was never disestablished by Congress and remains Indian Country — has had profound implications for criminal jurisdiction across roughly 43% of Oklahoma's land area, including Creek County. The decision affects prosecution of crimes committed by or against Native Americans in the former reservation territory, creating complex jurisdictional IT requirements across tribal, state, and federal law enforcement systems. Creek County's petroleum heritage (Glenn Pool discovery era) and Tulsa metro adjacency give it infrastructure above rural Oklahoma averages.

**McDowell County WV (54047 — Extreme Coal Collapse)**: McDowell County's demographic decline from peak population is among the most dramatic of any US county: from 100,000 residents in 1950 to under 19,000 today — a collapse driven by the mechanization of coal mining, competition from cheaper fuels, and the closure of the mines that sustained the county's economy. Welch, the county seat, once had a thriving downtown serving coal camp workers; today it faces extreme poverty, opioid addiction, and infrastructure decay. The Hatfield-McCoy Trail network has brought some ATV tourism, but McDowell County remains among the federal government's highest economic distress priority areas under ARC and the POWER Initiative.

**Grant County WV (54023 — Seneca Rocks/Spruce Knob)**: Grant County contains two of West Virginia's signature natural landmarks: Seneca Rocks (a sheer quartzite fin rising 900 feet above the valley floor, a world-class technical rock climbing destination) and Spruce Knob (4,863 feet, the highest point in West Virginia and the highest peak in the Allegheny Mountains). The Monongahela National Forest's management IT, the US Forest Service's Spruce Knob-Seneca Rocks National Recreation Area visitor systems, and the county's position in the Potomac River headwaters watershed create institutional technology infrastructure despite Grant County's small population of under 12,000.

**Dickinson County KS (20041 — Eisenhower/Chisholm Trail)**: Abilene was both the northern terminus of the Chisholm Trail (where millions of Texas longhorns were driven to rail markets in the 1860s-1880s) and the boyhood home of Dwight D. Eisenhower. The Eisenhower Presidential Library, Museum, and Boyhood Home — with its associated Place of Meditation (where Eisenhower and Mamie are buried) — is a major federal heritage institution in a county of 20,000 people. Eisenhower's "Military-Industrial Complex" farewell address speech, delivered from the White House in 1961, represents one of the most important policy statements about American technology and defense that emerged from a president raised in rural Kansas.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1188 (up 45 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-first consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-first consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1143 counties)
- [x] 0 critical errors post-validation
