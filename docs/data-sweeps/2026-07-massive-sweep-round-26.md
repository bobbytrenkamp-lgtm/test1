# US DC & AI Policy Tracker — Massive Data Sweep: Round 26

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** KY/IA/TX/GA/MI/SC/IN/TN — Appalachian KY coal counties, Nucor Georgetown steel, Porcupine Mountains, Edgefield pottery

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1003 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1003 |
| Validation errors | 0 |
| Validation warnings | 871 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 21195 | Pike County | Kentucky | -1 | Pikeville/Big Sandy River/Appalachian coal capital/University of Pikeville |
| 21025 | Breathitt County | Kentucky | -1 | Jackson/North Fork KY River/ARC broadband investment/deep Appalachian |
| 21063 | Elliott County | Kentucky | -1 | Sandy Hook/remote Appalachian/ARC connectivity grants |
| 21189 | Owsley County | Kentucky | -1 | Booneville/historically lowest-income US county/federal broadband equity priority |
| 19041 | Clay County | Iowa | -1 | Spencer/Iowa Great Lakes gateway/Clay County Fair/NW Iowa hub |
| 19011 | Benton County | Iowa | -1 | Vinton/east-central IA/Iowa Braille School/Cedar Rapids-Iowa City corridor |
| 19027 | Carroll County | Iowa | -1 | Carroll/west-central Iowa/Iowa Premium Beef/Lincoln Highway |
| 19123 | Mahaska County | Iowa | -1 | Oskaloosa/William Penn University/Quaker entrepreneurial tradition |
| 48089 | Colorado County | Texas | -1 | Columbus/oldest Anglo colony TX/Austin original land grant/Gulf corridor |
| 48277 | Lamar County | Texas | -1 | Paris TX/NE Texas regional center/Texas Eiffel Tower |
| 13061 | Clay County | Georgia | -1 | Fort Gaines/Lake Walter F. George/Army Corps dam/SW Georgia |
| 13209 | Montgomery County | Georgia | -1 | Mount Vernon/Brewton-Parker College/Oconee River |
| 13271 | Telfair County | Georgia | -1 | McRae-Helena/Little Ocmulgee/birthplace of two Georgia governors |
| 26053 | Gogebic County | Michigan | -1 | Ironwood/Porcupine Mountains Wilderness/Lake Superior UP iron range |
| 26071 | Iron County | Michigan | -1 | Crystal Falls/Ottawa National Forest/UP mining to recreation transition |
| 45037 | Edgefield County | South Carolina | -1 | Edgefield/Strom Thurmond birthplace/alkaline glaze pottery/I-20 data center corridor |
| 45043 | Georgetown County | South Carolina | -1 | Georgetown/Nucor Steel mini-mill/Waccamaw Neck/colonial rice heritage |
| 18135 | Randolph County | Indiana | -1 | Winchester/Indiana-Ohio border/natural gas boom legacy |
| 18015 | Carroll County | Indiana | -1 | Delphi/Wabash River/Potawatomi Trail of Death/Tippecanoe corridor |
| 47029 | Cocke County | Tennessee | -1 | Newport/Great Smoky Mountains gateway/Pigeon River/TVA hydro |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1023 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-26.md` — this document (new)

---

## Notable Additions

**Owsley County KY (21189 — Poorest County/Federal Broadband Priority)**: Owsley County has consistently ranked among the lowest-income counties in the United States across multiple census cycles — a distinction that has made it a priority target for federal broadband equity programs. The BEAD (Broadband Equity, Access, and Deployment) program and its predecessors specifically flag counties like Owsley for investment, and the county appears in federal connectivity gap analyses as a case study in rural Appalachian digital access challenges. ARC's investment history in Owsley County spans decades of broadband, transportation, and workforce development grants. Understanding which counties lack connectivity is as institutionally important as understanding which counties have it.

**Pike County KY (21195 — Largest KY County/Coal Capital)**: Pike County is Kentucky's largest county by area and historically its most productive coal county. Pikeville — the county seat — is surrounded by ridgelines that required the famous Pikeville Cut-Through (1983), a massive earthmoving project that moved a mountain, a river, and a highway to create a new downtown. The University of Pikeville and Pikeville Medical Center serve a multi-county Appalachian region with health and education IT. Pike County's coal industry records management, regulatory compliance systems, and mine safety monitoring IT represent one of the most specialized industrial computing environments in Appalachia.

**Georgetown County SC (45043 — Nucor Steel/Colonial Rice Heritage)**: Georgetown County's colonial rice economy made it one of the wealthiest places in the Western Hemisphere before the Civil War — the antebellum plantation economy left a profound demographic and cultural legacy. Today, Nucor Steel's Georgetown facility (established 1969) is one of the original electric arc furnace mini-mills in the United States, continuously modernizing its process control and quality management IT. The facility's scrap steel sourcing logistics, EAF process control systems, and bar products quality tracking represent sophisticated industrial IT that contrasts with the county's resort and natural environment identity. The Waccamaw Neck's resort development (Pawleys Island, Litchfield Beach) south of Myrtle Beach adds second-home broadband demand.

**Edgefield County SC (45037 — Alkaline Pottery/Political Heritage)**: Edgefield County has produced more South Carolina governors than any other county — a political heritage rooted in the antebellum planter class. More remarkably, Edgefield County was the center of the Edgefield pottery tradition, in which enslaved African-American potters developed a distinctive alkaline-glazed stoneware in the early 19th century. Dave Drake (David Drake), an enslaved man at the Lewis Miles Pottery, signed his large storage jars with verses and his name — extraordinary acts of self-assertion that have made his work prized by American folk art collectors. Edgefield pottery is now collected by the Smithsonian and major art museums. The county's position near Augusta's data center growth corridor adds modern technology relevance.

**Gogebic County MI (26053 — Porcupine Mountains/Iron Range)**: The Gogebic Iron Range stretches from Michigan's western Upper Peninsula into Wisconsin's Penokee Hills — one of the great iron ore belts of the Great Lakes region. Ironwood, Gogebic County's largest city, was a major iron ore shipping and processing point in the late 19th and early 20th centuries. Porcupine Mountains Wilderness State Park is one of the largest state parks east of the Mississippi, stretching along Lake Superior's Presque Isle shore. The park's wilderness designation, combined with Michigan Tech's UP research networks and AT&T's UP fiber backbone, creates a distinctive mix of remote wilderness and institutional connectivity in the same county.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 915 (up 44 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (fifteenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (fifteenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1023 counties)
- [x] 0 critical errors post-validation
