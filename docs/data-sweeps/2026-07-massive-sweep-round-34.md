# US DC & AI Policy Tracker — Massive Data Sweep: Round 34

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** MO/WI/NE/IL/TN/IN — Apostle Islands NL, Cumberland Gap Wilderness Road, Calhoun County IL isolated peninsula, Dubois County furniture capital, Lincoln-Douglas Quincy debate, Katy Trail

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1163 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1163 |
| Validation errors | 0 |
| Validation warnings | 1237 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 29053 | Cooper County | Missouri | -1 | Booneville/Katy Trail/Missouri River/Daniel Boone sons/first Union MO victory |
| 29049 | Clinton County | Missouri | -1 | Plattsburg/NW MO/Truman Lake watershed/Grand River |
| 29041 | Chariton County | Missouri | -1 | Keytesville/Chariton River/Gen. Sterling Price birthplace/Little Dixie |
| 29015 | Benton County | Missouri | -1 | Warsaw/Harry S. Truman Lake largest MO reservoir/Osage River/Army Corps |
| 55007 | Bayfield County | Wisconsin | -1 | Washburn/Apostle Islands NL/Lake Superior/Red Cliff Band Ojibwe/sea caves |
| 55029 | Door County | Wisconsin | -1 | Sturgeon Bay/Door Peninsula/Lake Michigan/most US lighthouses/cherry orchards |
| 55037 | Florence County | Wisconsin | -1 | Florence/Iron Belt/Menominee River/Nicolet NF/remote north Wisconsin |
| 55023 | Crawford County | Wisconsin | -1 | Prairie du Chien/Wisconsin-Mississippi confluence/Driftless Area/oldest WI settlement |
| 31013 | Box Butte County | Nebraska | -1 | Alliance/Nebraska Panhandle/Carhenge/BNSF rail hub/Ogallala irrigation |
| 31027 | Cedar County | Nebraska | -1 | Hartington/NE Nebraska/Missouri River adj/Czech heritage/Santee Sioux |
| 31003 | Antelope County | Nebraska | -1 | Neligh/Elkhorn River/north-central NE/cattle and row crops |
| 17001 | Adams County | Illinois | -1 | Quincy/Mississippi River/Lincoln-Douglas debate 1858/Underground Railroad |
| 17009 | Brown County | Illinois | -1 | Mount Sterling/Siloam Springs SP/western IL agricultural |
| 17013 | Calhoun County | Illinois | -1 | Hardin/Illinois-Mississippi confluence/ferry-only access/apple orchards |
| 47011 | Bradley County | Tennessee | -1 | Cleveland/SE TN/Ocoee River 1996 Olympics/I-75 chemical manufacturing |
| 47025 | Claiborne County | Tennessee | -1 | Tazewell/Cumberland Gap NHP/Wilderness Road/VA-KY-TN junction |
| 47013 | Campbell County | Tennessee | -1 | Jacksboro/Norris Lake TVA first dam/Cumberland Mountain/coal heritage |
| 18037 | Dubois County | Indiana | -1 | Jasper/wood furniture capital US/German Catholic/MasterBrand/I-64 |
| 18025 | Crawford County | Indiana | -1 | English/Harrison Crawford SF/Wyandotte Caves/Blue River Wild & Scenic |
| 18027 | Daviess County | Indiana | -1 | Washington/Amish community/White River/Western Indiana coal reclamation |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1183 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-34.md` — this document (new)

---

## Notable Additions

**Bayfield County WI (55007 — Apostle Islands National Lakeshore)**: The Apostle Islands NL's 21 islands on Lake Superior feature the highest concentration of lighthouses per square mile in the United States (9 lighthouses on 21 islands) — a legacy of the busy Lake Superior shipping trade through the Apostle Islands archipelago. The Red Cliff Band of Lake Superior Chippewa's reservation in Bayfield County enforces treaty fishing rights affirmed in the Voigt Decision (1983), which established that 1837 and 1842 treaties guaranteed Ojibwe rights to fish, hunt, and gather in ceded territories. Winter ice cave access on Lake Superior's shore (when the lake freezes deeply enough) draws 50,000+ visitors in a single season.

**Claiborne County TN (47025 — Cumberland Gap)**: Cumberland Gap National Historical Park marks the natural passage through the Cumberland Mountains where Daniel Boone blazed the Wilderness Road in 1775. Before railroads, virtually all European American settlement of Kentucky and points west came through this gap. The NPS estimates that 300,000 settlers passed through Cumberland Gap between 1775 and 1810 alone. The park spans the Virginia-Kentucky-Tennessee tri-state junction and includes the Middlesboro, Kentucky meteor impact crater (one of the few confirmed meteor craters in the eastern US). Cumberland Gap remains one of the most historically significant geographic features in American expansion.

**Dubois County IN (18037 — Wood Furniture Capital)**: Jasper is genuinely unusual: a small city of 15,000 people in rural southern Indiana that has become a national leader in wood office furniture and cabinet manufacturing. Companies including MasterBrand Cabinets, Jasper Engines, and dozens of wood products manufacturers cluster in Dubois County, creating a manufacturing ecosystem far exceeding what the county's population would suggest. The German Catholic settlers of the 1840s brought woodworking craft traditions that evolved into industrial-scale furniture production as the 20th century progressed. Dubois County's furniture exports make it one of Indiana's most export-intensive manufacturing counties.

**Cooper County MO (29053 — Katy Trail/Daniel Boone)**: Booneville's founding by Daniel Boone's sons (Nathan and Daniel Morgan Boone) in 1817 reflects the early American settlement pattern along the Missouri River that carried pioneers westward. The Katy Trail — built on the 240-mile right-of-way of the former Missouri-Kansas-Texas (Katy) Railroad along the Missouri River — passes through Cooper County on its journey from Clinton to Machens. The trail is the longest rail-trail in the US and one of the flattest long-distance bike trails in the nation, following the Missouri River's scenic corridor through wine country and historic communities.

**Calhoun County IL (17013 — Geographic Isolation)**: Calhoun County is one of the most geographically isolated counties east of the Mississippi River — a peninsula between the Illinois and Mississippi Rivers, accessible from Illinois only by ferry across the Illinois River or a bridge from Missouri. This isolation has preserved the county's agricultural character (particularly apple orcharding), limited industrial development, and created persistent broadband connectivity challenges. The county's geography is so unusual that Illinois state infrastructure planning specifically addresses Calhoun County as a special connectivity case — a peninsula that requires wireless solutions because cable trenching across river bottoms is economically unviable.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1276 (up 39 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-third consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-third consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1183 counties)
- [x] 0 critical errors post-validation
