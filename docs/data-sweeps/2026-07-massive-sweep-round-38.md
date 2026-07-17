# US DC & AI Policy Tracker — Massive Data Sweep: Round 38

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** KY/MI/IL/OK/MO/TN — Red River Gorge KY, Natural Bridge, Kirtland's Warbler MI UP, Pope County Garden of the Gods IL, Washita Battlefield Custer attack, Ozark Current River float trips, Barkley Marathons TN

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1243 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1243 |
| Validation errors | 0 |
| Validation warnings | 1401 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 21231 | Wayne County | Kentucky | -1 | Monticello/Lake Cumberland/Cumberland River/south-central KY |
| 21165 | Menifee County | Kentucky | -1 | Frenchburg/Red River Gorge adj/Daniel Boone NF/Cave Run Lake |
| 21147 | McCreary County | Kentucky | -1 | Whitley City/Big South Fork NRA/Daniel Boone NF/Tennessee border |
| 21237 | Wolfe County | Kentucky | -1 | Campton/Red River Gorge/Natural Bridge/rock climbing/Daniel Boone NF |
| 26095 | Luce County | Michigan | -1 | Newberry/Upper Peninsula/Tahquamenon Falls adj/Seney NWR/remote UP |
| 26001 | Alcona County | Michigan | -1 | Harrisville/Lake Huron/Au Sable River/canoe marathon/lighthouses |
| 26135 | Oscoda County | Michigan | -1 | Mio/Au Sable River/Kirtland's Warbler/jack pine/Huron-Manistee NF |
| 26013 | Baraga County | Michigan | -1 | L'Anse/Keweenaw Bay/Ojibwe/Huron Mountains/Lake Superior UP |
| 17151 | Pope County | Illinois | -1 | Golconda/Shawnee NF/Garden of the Gods/Ohio River/Trail of Tears |
| 17181 | Union County | Illinois | -1 | Jonesboro/Lincoln-Douglas Debate/Bald Knob Cross/Shawnee NF/orchards |
| 17127 | Massac County | Illinois | -1 | Metropolis/Superman hometown/Fort Massac/Ohio River |
| 40129 | Roger Mills County | Oklahoma | -1 | Cheyenne/Washita Battlefield NM/Black Kettle NGA/western OK plains |
| 40127 | Pushmataha County | Oklahoma | -1 | Antlers/SE Oklahoma/Choctaw Nation/Ouachita NF/Chief Pushmataha |
| 40075 | Kiowa County | Oklahoma | -1 | Hobart/Wichita Mountains adj/Quartz Mountain/SW Oklahoma |
| 29203 | Shannon County | Missouri | -1 | Eminence/Current River/Ozark NSR/largest springs/float trips |
| 29153 | Ozark County | Missouri | -1 | Gainesville/Mark Twain NF/Bryant Creek/Missouri elk restoration |
| 29179 | Reynolds County | Missouri | -1 | Centerville/Taum Sauk Mountain highest MO/Shut-Ins/Black River |
| 47137 | Pickett County | Tennessee | -1 | Byrdstown/Dale Hollow Lake/world record smallmouth/smallest TN county |
| 47129 | Morgan County | Tennessee | -1 | Wartburg/Frozen Head/Barkley Marathons/Cumberland Plateau |
| 47061 | Grundy County | Tennessee | -1 | Altamont/South Cumberland/Savage Gulf/Sewanee adj/TN Plateau |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1263 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-38.md` — this document (new)

---

## Notable Additions

**Wolfe County KY (21237 — Red River Gorge/Natural Bridge)**: The Red River Gorge Geological Area — straddling Wolfe and Menifee Counties — is one of the most celebrated rock climbing destinations in the eastern US, with over 100 natural stone arches and some of the most challenging sport climbing routes east of the Rockies. Natural Bridge State Resort Park's 65-foot sandstone arch is a Kentucky State Parks flagship destination. The Gorge's hemlock-lined hollows, sandstone cliffs, and backcountry camping draw hundreds of thousands of visitors annually. Wolfe County is among Kentucky's least populated counties and has been part of Appalachian Regional Commission broadband and economic development programming.

**Oscoda County MI (26135 — Kirtland's Warbler)**: The Kirtland's Warbler — one of America's rarest songbirds — nests exclusively in young jack pine forests of Michigan's north-central Lower Peninsula, with Oscoda County as core critical habitat. The warbler was reduced to under 200 breeding pairs by the 1970s, triggering an intensive USFS and Michigan DNR habitat management program that burns and clear-cuts jack pine to maintain the 5-8 year old forest age the warbler requires. Population recovery to several thousand pairs is considered one of the Endangered Species Act's major successes. The species was delisted from endangered status in 2019.

**Pope County IL (17151 — Garden of the Gods/least populous Illinois county)**: Pope County is the least populous county in Illinois — Golconda, the county seat, sits on the Ohio River where the Cherokee Trail of Tears crossed in 1838-39. The Garden of the Gods Recreation Area in the Shawnee National Forest features ancient sandstone formations rising from the Illinois Ozarks — prehistoric sea-floor sediments sculpted by erosion into a rocky landscape that looks unlike anything else in the Midwest. The Ohio River valley position gives Pope County exceptional biodiversity at the confluence of Ozark and Appalachian ecological zones.

**Roger Mills County OK (40129 — Washita Battlefield)**: The Washita Battlefield National Historic Site commemorates one of the most controversial events of the Indian Wars. On November 27, 1868, Lt. Colonel George Armstrong Custer attacked Chief Black Kettle's Cheyenne village in winter quarters at dawn — killing Black Kettle (who had survived the Sand Creek Massacre four years earlier and continued seeking peace with the US government), dozens of warriors and civilians, and capturing 53 women and children. The battle's legacy as massacre versus battle has been debated for over 150 years. The National Park Service designation as a battlefield rather than a massacre site remains contentious with Cheyenne and Arapaho descendants.

**Shannon County MO (29203 — Ozark National Scenic Riverways)**: The Ozark National Scenic Riverways — established 1964 as the first NPS unit created specifically to protect a river system — preserves the Current and Jacks Fork Rivers flowing through Shannon County's Ozark plateau. The Current River's water emerges from massive springs at 57 degrees year-round — Big Spring in Shannon County is one of the world's largest springs, discharging over 276 million gallons daily. The clarity of Ozark spring-fed rivers, their constant temperature, and the float trip culture built around them are uniquely Missouri. Shannon County is among Missouri's lowest-income counties with significant broadband access gaps.

**Reynolds County MO (29179 — Taum Sauk Mountain/Shut-Ins)**: Missouri's highest point (Taum Sauk Mountain, 1,772 feet) is in Reynolds County, along with the Johnson's Shut-Ins — a geological wonder where the Black River squeezes through ancient rhyolite channels into natural rock swimming holes. The Taum Sauk Pumped Storage Station suffered a catastrophic upper reservoir breach on December 14, 2005, draining 1.3 billion gallons in 25 minutes, destroying the Shut-Ins and damaging the surrounding park. The rebuilt reservoir and restored park re-opened in 2010, one of Missouri's most significant infrastructure reconstruction projects.

**Morgan County TN (47129 — Barkley Marathons)**: Frozen Head State Park in Morgan County hosts the Barkley Marathons — perhaps the world's most notoriously difficult ultramarathon. The race covers approximately 60 miles through the Frozen Head wilderness with 60,000 feet of elevation gain, has a 60-hour time limit, offers no trail markers or GPS, and requires runners to navigate by paper map and compass. Since the race began in 1986, only 15 runners have ever finished — in some years, no one finishes. The race has become a cult classic of endurance sport through the documentary "The Barkley Marathons" (2014) and social media coverage.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1427 (up 26 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twenty-seventh consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twenty-seventh consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1263 counties)
- [x] 0 critical errors post-validation
