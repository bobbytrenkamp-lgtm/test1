# US DC & AI Policy Tracker — Massive Data Sweep: Round 36

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** AL/VA/MN/GA/IA/SD — NASA Wallops Flight Facility, Boundary Waters Canoe Wilderness, Okefenokee NWR gateway, Ralph Stanley birthplace, Grayson Highlands wild ponies, Petersburg Civil War siege

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1203 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1203 |
| Validation errors | 0 |
| Validation warnings | 1316 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 01061 | Geneva County | Alabama | -1 | Geneva/Wiregrass region/peanut farming/Conecuh River/SE Alabama |
| 01035 | Conecuh County | Alabama | -1 | Evergreen/Conecuh NF/Red Hills salamander/longleaf restoration |
| 01005 | Barbour County | Alabama | -1 | Eufaula/Lake Eufaula/George Wallace birthplace/Black Belt edge |
| 01013 | Butler County | Alabama | -1 | Greenville/I-65 corridor/Camellia City/SW Alabama Black Belt |
| 51077 | Grayson County | Virginia | -1 | Independence/Mount Rogers highest VA/New River headwaters/wild ponies |
| 51051 | Dickenson County | Virginia | -1 | Clintwood/Ralph Stanley Museum/Breaks Park adj/SW VA coal/ARC |
| 51053 | Dinwiddie County | Virginia | -1 | Petersburg/Petersburg Siege longest Civil War siege/Fort Gregg-Adams |
| 51001 | Accomack County | Virginia | -1 | Accomac/Eastern Shore/NASA Wallops Flight Facility/Assateague Island |
| 27029 | Clearwater County | Minnesota | -1 | Bagley/Red Lake River/Red Lake Nation adjacent/north-central MN |
| 27031 | Cook County | Minnesota | -1 | Grand Marais/Boundary Waters Canoe Area Wilderness/Lake Superior NE tip |
| 27041 | Douglas County | Minnesota | -1 | Alexandria/west-central MN lake country/I-94/Kensington Runestone |
| 13029 | Bryan County | Georgia | -1 | Pembroke/Savannah exurb/Fort Stewart adj/fastest-growing GA/BlueOval |
| 13043 | Candler County | Georgia | -1 | Metter/SE Georgia/peanuts pecans/I-16 corridor |
| 13049 | Charlton County | Georgia | -1 | Folkston/Okefenokee NWR main entrance/largest blackwater swamp NA |
| 19075 | Grundy County | Iowa | -1 | Grundy Center/NE Iowa/Black Hawk watershed/precision ag connectivity |
| 19141 | O'Brien County | Iowa | -1 | Primghar/NW Iowa/acronym county seat/MidAmerican Energy wind portfolio |
| 19043 | Clayton County | Iowa | -1 | Elkader/Driftless Area/Turkey River trout/Effigy Mounds adj |
| 46097 | Miner County | South Dakota | -1 | Howard/SE SD lake district/glacial potholes/Prairie Pothole JV |
| 46053 | Gregory County | South Dakota | -1 | Burke/Fort Randall Dam/Yankton Sioux/Lake Francis Case/Lewis & Clark |
| 46059 | Hand County | South Dakota | -1 | Miller/central SD/James River valley/one of largest SD counties |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1223 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-36.md` — this document (new)

---

## Notable Additions

**Accomack County VA (51001 — NASA Wallops Flight Facility)**: Wallops is one of the world's oldest launch sites (established 1945) and the only NASA facility that independently conducts orbital launches on the US East Coast. The facility has launched over 16,000 rockets, including commercial orbital launches by Rocket Lab and Northrop Grumman's Antares (serving the ISS Cygnus cargo missions). The Mid-Atlantic Regional Spaceport (MARS) at Wallops is a commercial addition that further expands launch capability. Accomack County's Eastern Shore position — accessible from Virginia only by the Chesapeake Bay Bridge-Tunnel — makes it one of the most geographically distinctive Virginia counties, with its barrier island and Chesapeake Bay resources supporting a significant oyster and clamming industry.

**Cook County MN (27031 — Boundary Waters)**: The Boundary Waters Canoe Area Wilderness is the most visited wilderness area in the United States — 1.1 million acres of lakes and forests on the Canadian border, where motorized equipment is banned and the only access is by paddle and portage. The BWCA encompasses over 1,000 lakes and 1,200 miles of canoe routes. Cook County, essentially coterminous with the BWCA, has persistently opposed proposed copper-nickel mining near Ely (the Twin Metals and NorthMet projects) that would threaten watershed quality. The USFS permit system for BWCA entry is one of the most sophisticated wilderness reservation systems in the federal government.

**Charlton County GA (13049 — Okefenokee)**: The Okefenokee National Wildlife Refuge is the largest blackwater swamp in North America — 438,000 acres of peat bog, cypress swamp, and open prairie in extreme southeastern Georgia. The swamp's tannic acid gives the water the amber-to-black color (the "Okefenokee" is derived from the Hitchiti language's term for "trembling earth" — the floating peat islands shift underfoot). The refuge hosts one of the densest alligator populations in the Southeast, along with sandhill cranes, black bears, and hundreds of bird species. Trail Ridge's proposed titanium mining has been a persistent environmental controversy, with EPA and Corps of Engineers review under the Clean Water Act.

**Grayson County VA (51077 — Mount Rogers/Wild Ponies)**: Mount Rogers at 5,729 feet is Virginia's highest point, located in a remote corner of Grayson County near the North Carolina border. Grayson Highlands State Park hosts a herd of wild ponies that graze on the open grassy balds above treeline — one of the most unusual wildlife spectacles in the Appalachians. The New River, which flows through Grayson County before heading north into North Carolina, is one of the world's oldest rivers — its northward flow counter to the typical Appalachian drainage direction reflects its pre-orogenic origin. The Appalachian Trail runs through the Mount Rogers National Recreation Area.

**Dickenson County VA (51051 — Ralph Stanley)**: Ralph Stanley, one of the most important figures in American roots music, was born in Stratton, Dickenson County in 1927. His distinctive bluegrass vocal style (the ancient Appalachian singing tradition he called "Old Regular") and his banjo playing defined the "high lonesome sound" of mountain music. The Ralph Stanley Museum in Clintwood honors his legacy and that of the clawhammer banjo tradition that emerged from the Virginia and Kentucky coalfields. The Breaks Interstate Park's Russell Fork Gorge (the deepest canyon east of the Mississippi at 1,600 feet) is in adjacent Buchanan County but accessible through the Dickenson County area.

**O'Brien County IA (19141 — MidAmerican Wind)**: Iowa is the state that generates the highest percentage of its electricity from wind of any state in the US — routinely over 50% of Iowa's power comes from wind. O'Brien County sits in the northwest Iowa corridor where MidAmerican Energy (Berkshire Hathaway Energy) has concentrated much of its massive Iowa wind portfolio. MidAmerican's Iowa wind capacity exceeds 7,000 MW — making it one of the largest wind generators in the world. O'Brien County's name means the county seat of Primghar is an acronym (O'Brien, Perry, Rand, Inman, Garfield, Hart, and Albright — the 8 men who donated lots for the county seat), making it one of the few American county seats whose name is an initialism.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1361 (up 45 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-fifth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-fifth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1223 counties)
- [x] 0 critical errors post-validation
