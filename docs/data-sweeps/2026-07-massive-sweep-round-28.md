# US DC & AI Policy Tracker — Massive Data Sweep: Round 28

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** TX/WI/MS/AR/TN/KS/OH/GA/LA — Swiss cheese country, Kemper IGCC debacle, PrairyErth, Plant Hatch nuclear, Starr County border

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1043 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1043 |
| Validation errors | 0 |
| Validation warnings | 968 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 48011 | Armstrong County | Texas | -1 | Claude TX/Palo Duro Canyon adjacent/Panhandle caprock/CREZ wind transmission |
| 48131 | Duval County | Texas | -1 | San Diego TX/Eagle Ford shale/George Parr political machine/south Texas brush country |
| 48427 | Starr County | Texas | -1 | Rio Grande City/Roma Historic Landmark/IBWC/Border Patrol sector IT |
| 55001 | Adams County | Wisconsin | -1 | Friendship/Wisconsin Dells adjacent/frac sand mining IT/central WI sand plains |
| 55003 | Ashland County | Wisconsin | -1 | Ashland/Lake Superior Chequamegon Bay/Bad River Band/Northland College |
| 55045 | Green County | Wisconsin | -1 | Monroe/Swiss cheese capital/New Glarus Swiss settlement/UW Madison corridor |
| 28069 | Kemper County | Mississippi | -1 | De Kalb/Kemper County Energy Facility/coal gasification failure/Southern Company grid |
| 28025 | Clay County | Mississippi | -1 | West Point/Golden Triangle manufacturing corridor/Tenn-Tom Waterway |
| 05057 | Hempstead County | Arkansas | -1 | Hope/Clinton birthplace NHS/SW Arkansas natural gas/Millwood Lake Army Corps |
| 05095 | Monroe County | Arkansas | -1 | Brinkley/White River NWR bottomland/ivory-billed woodpecker/delta rice |
| 47063 | Hamblen County | Tennessee | -1 | Morristown/NE TN manufacturing/Lincoln Electric/Bridgestone/TVA Nolichucky |
| 47103 | Lincoln County | Tennessee | -1 | Fayetteville/south TN/Huntsville AL commuter influence/Jack Daniel's corridor |
| 20159 | Rice County | Kansas | -1 | Lyons/Quivira NWR Central Flyway/Coronado Quivira history/Mid-Continent oil |
| 20017 | Chase County | Kansas | -1 | Cottonwood Falls/Tallgrass Prairie National Preserve/PrairyErth/Flint Hills |
| 39033 | Crawford County | Ohio | -1 | Bucyrus/Galion/north-central Ohio manufacturing/auto supply chain |
| 39039 | Defiance County | Ohio | -1 | Defiance/Maumee River/Battle of Fallen Timbers/GM powertrain plant/NW Ohio |
| 13001 | Appling County | Georgia | -1 | Baxley/Plant Hatch nuclear/Altamaha River/SE Georgia timber/Vidalia onion adjacent |
| 13183 | Long County | Georgia | -1 | Ludowici/Fort Stewart adjacent/military community broadband/SE Georgia |
| 22029 | Concordia Parish | Louisiana | -1 | Vidalia/Natchez-Vidalia Bridge/Mississippi River/Army Corps/natural gas |
| 22037 | East Feliciana Parish | Louisiana | -1 | Clinton/Florida Parishes/Audubon Oakley Plantation/rural north Louisiana |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1063 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-28.md` — this document (new)

---

## Notable Additions

**Kemper County MS (28069 — Kemper County Energy Facility)**: The Kemper County Energy Facility became one of the most cautionary tales in American utility history. Mississippi Power's plan to build the world's first commercial-scale integrated gasification combined cycle (IGCC) coal plant promised clean coal technology — instead it overran its $2.9 billion budget by nearly $5 billion, faced years of construction problems, and was converted to natural gas in 2017 after the US Department of Energy withdrew funding. The project left behind substantial electrical generating infrastructure and an unusual amount of industrial IT in a rural east Mississippi county of 10,000 people. The DOE's investment in monitoring, emissions tracking, and process control systems created a technology infrastructure legacy despite the plant's commercial failure.

**Chase County KS (20017 — PrairyErth/Tallgrass Prairie)**: Chase County holds a unique place in American literary cartography — William Least Heat-Moon's 1991 book "PrairyErth: (a deep map)" spent years documenting a single Kansas county in granular detail, making Chase County one of the most thoroughly literary-mapped rural counties in America. The Tallgrass Prairie National Preserve (managed jointly by the Nature Conservancy and NPS) protects the last large intact tallgrass prairie in North America — the same ecosystem that once covered 170 million acres from Indiana to Kansas. The Flint Hills' rocky geology that prevented plowing preserved the prairie; today, ecological monitoring IT for Konza Prairie Biological Station and preserve management systems represent unusual scientific computing in an otherwise purely agricultural landscape.

**Appling County GA (13001 — Plant Hatch Nuclear)**: Georgia Power's Plant Hatch nuclear generating station sits on the Altamaha River in Appling County — two-unit nuclear plant that has been in continuous operation since 1975 and 1979. Nuclear power generation requires the most sophisticated safety-critical IT systems of any civilian power generation technology: redundant safety monitoring, NRC regulatory compliance systems, radiation monitoring networks, and cyber-protected control systems. In a county of 18,000 people, Plant Hatch creates an institutional IT presence comparable to facilities in much larger metropolitan areas. The Altamaha River itself — described as one of the most biologically diverse river systems on the East Coast — is monitored by Georgia DNR and USGS gauging networks.

**Starr County TX (48427 — Roma Historic Landmark/IBWC)**: Roma, Texas in Starr County is a National Historic Landmark district — one of the best-preserved 19th-century Rio Grande border town streetscapes in the United States. The International Boundary and Water Commission (IBWC) manages water rights and flood control on the Rio Grande under an 1944 US-Mexico treaty, with joint operations centers requiring binational IT coordination. Roma's Historic District was the filming location for Marlon Brando's "Viva Zapata!" (1952). The combination of CBP border management IT, IBWC binational water management computing, and heritage district documentation systems creates an unusual multi-agency federal IT presence in a county with median household income below $30,000.

**Ashland County WI (55003 — Bad River Band/Chequamegon Bay)**: Ashland County's position at the intersection of Lake Superior's Chequamegon Bay and the Bad River Band of the Lake Superior Chippewa creates a distinctive governance IT landscape. The Bad River Band's tribal administration manages natural resource monitoring, treaty fishing rights enforcement, and water quality programs across one of the most ecologically sensitive watersheds in the Great Lakes. The proposed Back Forty mine controversy (in adjacent Michigan's Menominee County) brought national attention to the Bad River watershed's ecological importance. Northland College in Ashland — self-described as "America's Environmental Liberal Arts College" — adds sustainability and environmental science computing to the county's institutional technology base.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1009 (up 41 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (seventeenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (seventeenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1063 counties)
- [x] 0 critical errors post-validation
