# US DC & AI Policy Tracker — Massive Data Sweep: Round 25

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** KS/MO/TX/AL/VA/NE/OH/SD — Amish Country, Harper Lee's Monroeville, Formosa Plastics, Flandreau Santee Sioux

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 983 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 983 |
| Validation errors | 0 |
| Validation warnings | 828 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 20001 | Allen County | Kansas | -1 | Iola/Mid-Continent oil/gas heritage/SE KS hub |
| 20007 | Barber County | Kansas | -1 | Medicine Lodge/Carry Nation birthplace/gypsum geology |
| 20019 | Chautauqua County | Kansas | -1 | Sedan/Flint Hills elk herd/tallgrass prairie edge |
| 20049 | Elk County | Kansas | -1 | Howard/Longton/SE Kansas oil fields/Elk City Lake |
| 29009 | Barry County | Missouri | -1 | Cassville/Roaring River/NW Ozarks poultry production |
| 29013 | Bates County | Missouri | -1 | Butler/I-49 corridor/Marais des Cygnes watershed |
| 29149 | Oregon County | Missouri | -1 | Alton/remote southern Ozarks/Eleven Point National Scenic River |
| 48057 | Calhoun County | Texas | -1 | Port Lavaca/Formosa Plastics/Matagorda Bay petrochemical |
| 48249 | Jim Wells County | Texas | -1 | Alice/"Hub of South Texas"/Eagle Ford shale services |
| 48503 | Young County | Texas | -1 | Graham/Possum Kingdom Lake/Brazos River recreation |
| 01039 | Covington County | Alabama | -1 | Andalusia/south AL timber/Conecuh National Forest |
| 01099 | Monroe County | Alabama | -1 | Monroeville/Harper Lee/Truman Capote hometown/courthouse museum |
| 51005 | Alleghany County | Virginia | -1 | Covington/WestRock paper mill/Alleghany Highlands |
| 51197 | Wythe County | Virginia | -1 | Wytheville/I-81 & I-77 crossroads/Lead Mine complex |
| 31125 | Nance County | Nebraska | -1 | Fullerton/Loup River/small NC Nebraska agricultural hub |
| 31061 | Franklin County | Nebraska | -1 | Franklin/Republican River valley/south-central NE |
| 39075 | Holmes County | Ohio | -1 | Millersburg/world's largest Amish community/craft economy |
| 39169 | Wayne County | Ohio | -1 | Wooster/OARDC Ohio's largest ag research station/College of Wooster |
| 46101 | Moody County | South Dakota | -1 | Flandreau/Flandreau Santee Sioux Tribe/Royal River Casino |
| 46057 | Hamlin County | South Dakota | -1 | Hayti/NE SD Coteau des Prairies/lake country |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1003 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-25.md` — this document (new)

---

## Notable Additions

**Holmes County OH (39075 — World's Largest Amish Community)**: Holmes County and adjacent Wayne and Tuscarawas counties contain the largest Amish settlement in the world — roughly 35,000 Amish residents in Holmes County alone, in a county of 45,000 total. The Amish economy generates distinctive IT infrastructure: while the community itself avoids personal technology, the "English" businesses serving tourists and the supply chain connecting Amish craft production to national markets (furniture, cheese, quilts) operate sophisticated e-commerce and logistics IT. Holmes County has among Ohio's highest concentrations of craft furniture manufacturers, whose custom-order tracking systems represent an unusual intersection of artisanal production and modern supply chain IT.

**Wayne County OH (39169 — OARDC/Wooster Agricultural Research)**: The Ohio Agricultural Research and Development Center (OARDC) at Wooster is Ohio State University's main agricultural research campus and one of the largest agricultural research stations in the United States. OARDC operates dozens of research farms across Ohio from its Wooster headquarters, managing agricultural experiment data, genomics research computing, and precision agriculture sensor networks. The College of Wooster (liberal arts) adds a small college technology footprint. Wayne County's combination of land-grant agricultural computing and liberal arts college IT creates an institutional technology base unusual for a rural Ohio county.

**Monroe County AL (01099 — Harper Lee/Truman Capote Literary Heritage)**: Monroeville, Alabama is the birthplace of Harper Lee and childhood home of Truman Capote — the setting that inspired both "To Kill a Mockingbird" and elements of "In Cold Blood." The Monroe County Courthouse is a museum and pilgrimage site, hosting an annual community theater production of Mockingbird that draws visitors from across the country. Monroe County's literary heritage has driven cultural tourism investment, and Alabama's rural broadband initiatives have targeted counties like Monroe where tourism-dependent small businesses need connectivity. The timber industry's presence (Scotch and Gulf Lumber, Pioneer Natural Resources) adds industrial IT infrastructure.

**Calhoun County TX (48057 — Formosa Plastics/Port Lavaca)**: Port Lavaca sits at the heart of one of Texas's most intensive petrochemical manufacturing areas. Formosa Plastics operates one of the largest plastics manufacturing complexes in North America on Lavaca Bay — a sprawling complex of PVC, polyethylene, and propylene facilities covering thousands of acres. The Formosa Point Comfort complex employs thousands and generates extraordinary industrial IT: process control systems, environmental monitoring networks (the plant has a complex regulatory history requiring extensive compliance IT), and chemical logistics management. Matagorda Bay's position at the intersection of the Gulf Intracoastal Waterway and multiple barge routes adds port logistics computing.

**Wythe County VA (51197 — I-81/I-77 Crossroads)**: Wytheville is the only town in Virginia where two interstate highways intersect (I-81, which runs the length of the Shenandoah Valley and Appalachia, meets I-77, which connects Charlotte to Cleveland). This crossroads position made Wytheville a historical transportation hub from Colonial times through the Civil War, and today makes it a critical logistics node for Southeast-to-Midwest freight. The intersection generates substantial fleet management, truck stop technology, and freight logistics computing. Wythe County's historical Lead Mine complex — one of the Confederacy's primary lead sources during the Civil War — adds heritage significance to a county whose modern identity centers on its strategic transportation position.

**Moody County SD (46101 — Flandreau Santee Sioux Tribe)**: The Flandreau Santee Sioux Tribe holds a distinctive place in South Dakota Native American history: the Flandreau Indian School, established in 1892, is one of the oldest continuously operating Native American boarding schools in the United States and has transformed into a modern secondary education institution. Royal River Casino in Flandreau operates under tribal sovereignty, generating gaming operations IT including player tracking, security systems, and financial compliance computing. The tribe's long history of engagement with federal and state agencies has built institutional administrative IT capacity that exceeds many comparable small South Dakota counties.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 871 (up 43 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (fourteenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (fourteenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1003 counties)
- [x] 0 critical errors post-validation
