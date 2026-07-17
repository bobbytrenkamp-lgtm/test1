# US DC & AI Policy Tracker — Massive Data Sweep: Round 37

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** TX/KS/CO/AR/VT/NM — Goliad Massacre Texas Revolution, Last Indian Raid in Kansas 1878, Crowley County water collapse, Stuttgart Rice and Duck Capital, Battle of Bennington 1777, Orleans County Northeast Kingdom, Roswell 1947 UFO, Carlsbad Caverns/WIPP nuclear

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1223 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1223 |
| Validation errors | 0 |
| Validation warnings | 1361 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 48287 | Lee County | Texas | -1 | Giddings/Texas Czech heritage/Austin metro exurb/Fayette adj/oil |
| 48013 | Atascosa County | Texas | -1 | Jourdanton/Eagle Ford Shale/South Texas oil/San Antonio metro exurb |
| 48025 | Bee County | Texas | -1 | Beeville/Chase Field NAS legacy/South Texas/Coastal Bend |
| 48175 | Goliad County | Texas | -1 | Goliad/Presidio La Bahia/Goliad Massacre 1836/Texas Revolution |
| 20023 | Cheyenne County | Kansas | -1 | St. Francis/NW Kansas/Colorado border/dryland wheat/tri-state |
| 20039 | Decatur County | Kansas | -1 | Oberlin/Last Indian Raid in Kansas 1878/Republican River |
| 20053 | Ellsworth County | Kansas | -1 | Ellsworth/Smoky Hill River/Chisholm Trail cattle era/Wild West |
| 20029 | Cloud County | Kansas | -1 | Concordia/Republican River/north-central KS/Cloud County College |
| 08063 | Kit Carson County | Colorado | -1 | Burlington/eastern CO plains/Burlington Carousel NHL/I-70 gateway |
| 08025 | Crowley County | Colorado | -1 | Ordway/SE Colorado/water rights loss/agricultural collapse |
| 08003 | Alamosa County | Colorado | -1 | Alamosa/San Luis Valley/Great Sand Dunes NP adj/Adams State |
| 05059 | Hot Spring County | Arkansas | -1 | Malvern/Brick Capital of the World/Ouachita River/central AR |
| 05001 | Arkansas County | Arkansas | -1 | Stuttgart/Rice and Duck Capital/White River NWR/Post of Arkansas 1686 |
| 05013 | Calhoun County | Arkansas | -1 | Hampton/SW Arkansas/Ouachita NF adj/timber/El Dorado exurb |
| 50003 | Bennington County | Vermont | -1 | Bennington/Battle of Bennington 1777/Robert Frost grave/ski |
| 50017 | Orange County | Vermont | -1 | Chelsea/east-central VT/Connecticut River watershed/dairy farms |
| 50019 | Orleans County | Vermont | -1 | Newport/Northeast Kingdom/Lake Memphremagog/Canadian border |
| 35006 | Cibola County | New Mexico | -1 | Grants/El Malpais NM/uranium legacy/Zuni Nation/I-40 |
| 35005 | Chaves County | New Mexico | -1 | Roswell/1947 UFO incident/Pecos River/Permian Basin oil |
| 35015 | Eddy County | New Mexico | -1 | Carlsbad/Carlsbad Caverns NP/WIPP nuclear waste/Permian Basin |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1243 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-37.md` — this document (new)

---

## Notable Additions

**Goliad County TX (48175 — Goliad Massacre/Texas Revolution)**: The Goliad Massacre of March 27, 1836, in which Mexican General Santa Anna ordered the execution of 342 Texas Revolution prisoners, killed twice as many Texans as died at the Alamo and generated the battle cry "Remember Goliad!" alongside "Remember the Alamo!" Presidio La Bahia in Goliad is the most completely restored Spanish colonial fortress in America — a National Historic Landmark that preserves the fort where the massacre occurred. The San Antonio River flows through Goliad County, and Goliad State Park surrounds Mission Espíritu Santo. Goliad County is one of Texas's original 23 counties, established when Texas gained independence in 1836.

**Decatur County KS (20039 — Last Indian Raid)**: Oberlin in Decatur County was the site of the Last Indian Raid in Kansas (September 30, 1878), when a band of Northern Cheyenne under Dull Knife and Little Wolf, fleeing the Indian Territory reservation they had been forcibly removed to, killed settlers in a desperate journey north toward their homeland in Montana. The raid created a period of settler terror across northwest Kansas and ended an era of violent frontier conflict in the state. The Decatur County Museum in Oberlin documents the incident in extraordinary detail, including individual gravestones for each settler killed — one of the most complete records of a specific frontier confrontation.

**Crowley County CO (08025 — Water Rights Collapse)**: Crowley County is one of the starkest examples of water policy consequences in the American West. In the early 20th century, irrigated farms in the Arkansas River Valley made Crowley County productive and prosperous. But a century of selling water rights to upstream Front Range cities left over 90% of the county's agricultural land fallowed and dry. The population collapsed from over 6,000 in the mid-20th century to under 6,000 today, with much of that number residing in the Crowley County Correctional Facility. The county's cautionary tale has shaped Colorado water law debates over the legality and ethics of buy-and-dry transactions — purchasing agricultural water rights and transferring them to municipal use.

**Arkansas County AR (05001 — Rice Capital)**: Arkansas is the largest rice-producing state in the US, and Arkansas County is the state's top rice county. Stuttgart, the county seat, hosts the World's Championship Duck Calling Contest every Thanksgiving and is the center of the agricultural duck hunting industry built on the flooded rice fields of the Grand Prairie. The White River National Wildlife Refuge (over 160,000 acres) provides wintering habitat for millions of mallard ducks — the largest mallard wintering concentration in North America. Post of Arkansas, established by the French explorer Henri de Tonti in 1686, was one of the earliest European settlements in the interior Mississippi Valley.

**Bennington County VT (50003 — Battle of Bennington/Robert Frost)**: The Battle of Bennington (August 16, 1777) was one of the turning points of the Revolutionary War — American militia under General John Stark, with Vermont Green Mountain Boys, routed a British and Hessian force sent to seize supplies at Bennington. The victory undermined General Burgoyne's Saratoga campaign and helped secure France's decision to ally with the American cause. The Bennington Battle Monument stands 306 feet tall — the tallest battle monument in the world. Robert Frost, who considered Vermont his home state, is buried in the Old First Church cemetery in Bennington; his grave is a literary pilgrimage destination.

**Orleans County VT (50019 — Northeast Kingdom/Lake Memphremagog)**: The Northeast Kingdom (Orleans, Essex, and Caledonia Counties) is one of the most remote and culturally distinct regions in the eastern US — a landscape of dairy farms, spruce forests, and small towns that has resisted the suburbanization affecting most of New England. Newport on Lake Memphremagog sits at a glacially carved lake straddling the Vermont-Quebec border, creating a cross-border economy with distinct CBP infrastructure at Derby Line. The Haskell Free Library and Opera House at Derby Line straddles the international border — the reading room is in Vermont but the stage is in Canada, making it one of the most unusual civic buildings in the world.

**Eddy County NM (35015 — Carlsbad Caverns/WIPP)**: Carlsbad Caverns National Park contains the Big Room — the largest single cave chamber in North America at 8.2 acres — and hosts the nightly bat flight of over a million Mexican free-tailed bats emerging from the cave entrance, one of the most dramatic wildlife spectacles in North America. The WIPP (Waste Isolation Pilot Plant) in the Permian Basin salt beds 26 miles east of Carlsbad is the world's first geological repository licensed to permanently dispose of transuranic nuclear waste — the long-lived radioactive material from nuclear weapons production. WIPP requires extraordinary radiation monitoring, seismic sensing, and institutional control IT that will need to function for 10,000 years.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1401 (up 40 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-sixth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-sixth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1243 counties)
- [x] 0 critical errors post-validation
