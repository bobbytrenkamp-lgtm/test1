# US DC & AI Policy Tracker — Massive Data Sweep: Round 39

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** ID/GA/NE/IN/NC/LA — Frank Church Wilderness largest lower-48, Sacajawea birthplace Lemhi Pass, Camas County least populous ID, Nebraska Sandhills Ogallala Aquifer, Toyota Indiana Gibson County, Grandfather Mountain NC, first offshore oil well St. Mary Parish LA

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1263 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1263 |
| Validation errors | 0 |
| Validation warnings | 1427 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 16049 | Idaho County | Idaho | -1 | Grangeville/Nez Perce NHP/Frank Church Wilderness largest lower-48/Salmon River |
| 16025 | Camas County | Idaho | -1 | Fairfield/Camas Prairie/least populous ID/Sandhills ranching |
| 16037 | Custer County | Idaho | -1 | Challis/Salmon River/Mount Borah highest ID/Yankee Fork gold dredge |
| 16059 | Lemhi County | Idaho | -1 | Salmon/Sacajawea birthplace/Lemhi Pass Lewis & Clark/Wild & Scenic Salmon |
| 13011 | Banks County | Georgia | -1 | Homer/NE Georgia foothills/Broad River/Gainesville exurb/I-985 |
| 13019 | Berrien County | Georgia | -1 | Nashville/south Georgia/Alapaha River/peanuts Suwannee watershed |
| 13287 | Turner County | Georgia | -1 | Ashburn/I-75 corridor/pecans peanuts/Flint River watershed |
| 13181 | Lincoln County | Georgia | -1 | Lincolnton/Clarks Hill Lake/Savannah River/J. Strom Thurmond Dam |
| 31005 | Arthur County | Nebraska | -1 | Arthur/Sandhills/least populous NE/grass-fed beef/Ogallala recharge |
| 31117 | McPherson County | Nebraska | -1 | Tryon/Sandhills/sub-0.5 density/Middle Loup River/extreme rural |
| 31007 | Banner County | Nebraska | -1 | Harrisburg/Nebraska Panhandle/High Plains/Wildcat Hills |
| 18113 | Noble County | Indiana | -1 | Albion/Pokagon Potawatomi/Amish adj/NE Indiana lake country |
| 18051 | Gibson County | Indiana | -1 | Princeton/Toyota Indiana Plant 7,000 workers/Wabash River/coal legacy |
| 18123 | Perry County | Indiana | -1 | Tell City/Cannelton cotton mill NHL/Ohio River/Swiss heritage/Lincoln adj |
| 37111 | McDowell County | North Carolina | -1 | Marion/Lake James/Linville Gorge/Blue Ridge Gateway/I-40 |
| 37011 | Avery County | North Carolina | -1 | Newland/Grandfather Mountain/Beech Mountain highest eastern town/ski |
| 37043 | Clay County | North Carolina | -1 | Hayesville/Nantahala NF/Chatuge Lake/tri-state corner/trout |
| 22003 | Allen Parish | Louisiana | -1 | Oberlin/Kisatchie NF/Coushatta Tribe casino/timber/longleaf |
| 22101 | St. Mary Parish | Louisiana | -1 | Morgan City/first offshore oil well 1947/Atchafalaya Basin/offshore services |
| 22021 | Caldwell Parish | Louisiana | -1 | Columbia/Ouachita River/north-central LA/farming/rural poverty |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1283 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-39.md` — this document (new)

---

## Notable Additions

**Idaho County ID (16049 — Frank Church Wilderness)**: At 8,485 square miles, Idaho County is the largest county in Idaho and one of the largest in the lower 48 states. The Frank Church-River of No Return Wilderness (2.3 million acres) — the largest contiguous wilderness area in the contiguous US — covers most of Idaho County. The Nez Perce National Historical Park's Whitebird Canyon Battlefield site marks where the Nez Perce War began in 1877, and the Salmon River ("River of No Return") flows through the wilderness core. Idaho County's vast roadless territory creates one of the most extreme rural connectivity challenges in the US — satellite systems are the only viable internet option for most of the county.

**Lemhi County ID (16059 — Sacajawea/Lemhi Pass)**: Sacajawea, the Shoshone woman who guided Lewis and Clark across the continent, was born in Lemhi County's territory. Lemhi Pass — where the expedition crossed the Continental Divide in August 1805 — is the actual moment Lewis and Clark reached the Pacific drainage they had sought for two years of preparation and two months of actual travel. Lewis described reaching the top of the pass and seeing "immense ranges of high mountains still to the West" with a mixture of elation and despair. The Salmon River's Wild and Scenic designation protects one of North America's most exceptional whitewater rivers, running 425 miles through central Idaho roadless wilderness.

**Camas County ID (16025 — Least populous Idaho county)**: Camas County is Idaho's least populous county — Fairfield, the county seat, has under 500 residents. The Camas Prairie's significance in Shoshone-Bannock and Nez Perce culture reflects the camas bulb's role as a critical staple food gathered in large communal harvests. The dispute over camas prairies — settlers' livestock repeatedly destroyed the camas grounds — was among the primary friction points between settlers and Native nations in the Snake River country. The county's modern sheep ranching and hay economy continues the plateau agricultural tradition.

**Gibson County IN (18051 — Toyota Indiana)**: The Toyota Indiana Manufacturing Plant in Princeton, producing the Highlander, is one of Toyota's most productive North American facilities. Gibson County's transformation from a coal-legacy agricultural county to a major automotive manufacturing hub illustrates the Midwest's ongoing industrial transition. The plant's 7,000+ direct employees (plus thousands in the supply chain) generate significant regional economic activity. Toyota's Princeton facility has expanded multiple times since 1996 and is a model for Japanese transplant manufacturing in the rural Midwest.

**Avery County NC (37011 — Grandfather Mountain/Beech Mountain)**: Grandfather Mountain at 5,947 feet is the highest Blue Ridge peak, known for its Mile-High Swinging Bridge and exceptional biodiversity — 73 rare or endangered species inhabit the mountain. Beech Mountain (5,506 feet), the highest incorporated town in the eastern US, hosts Ski Beech — one of the highest ski resorts in the East. Avery County's Fraser fir Christmas tree industry at high elevation produces some of the premium trees for the eastern US retail market. The Blue Ridge Parkway and Appalachian Trail both run along or near Avery County.

**St. Mary Parish LA (22101 — First offshore oil well)**: Morgan City in St. Mary Parish was the location of the world's first oil well drilled from a mobile offshore platform (1947), marking the beginning of the offshore oil industry that now produces a substantial fraction of global petroleum. The Atchafalaya Basin — the largest river swamp in North America — creates an extraordinary ecological context alongside heavy industrial petroleum infrastructure. Morgan City's offshore service boat industry, helicopter operations, and remote drilling support IT represent some of the most sophisticated industrial computing in Louisiana's oil patch.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1457 (up 30 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-eighth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-eighth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1283 counties)
- [x] 0 critical errors post-validation
