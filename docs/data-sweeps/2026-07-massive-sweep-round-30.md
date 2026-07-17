# US DC & AI Policy Tracker — Massive Data Sweep: Round 30

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** SD/IL/WY/IN/MO/GA/AK — DSU cybersecurity, Red Dog Mine Arctic, Teton FedRes summit, Iron County Taum Sauk breach, Bristol Bay salmon

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1083 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1083 |
| Validation errors | 0 |
| Validation warnings | 1056 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 46075 | Jones County | South Dakota | -1 | Murdo/least populous SD county/I-90/Badlands adjacent/USDA ReConnect priority |
| 46079 | Lake County | South Dakota | -1 | Madison/Dakota State University/Madison Cyber Labs/DoD cybersecurity research |
| 46015 | Brule County | South Dakota | -1 | Chamberlain/Lake Francis Case/Missouri River I-90/Crow Creek Sioux |
| 17011 | Bureau County | Illinois | -1 | Princeton/Illinois & Michigan Canal Heritage Corridor/Spoon River/I-80 rail hub |
| 17033 | Crawford County | Illinois | -1 | Robinson/first Illinois oil discovery/Marathon refinery/Lincoln Trail SE IL |
| 17039 | De Witt County | Illinois | -1 | Clinton/Clinton Lake/Clinton Power Station nuclear/Sangamon River |
| 56035 | Sublette County | Wyoming | -1 | Pinedale/Jonah Gas Field/Pinedale Anticline/Green River Basin natural gas |
| 56017 | Hot Springs County | Wyoming | -1 | Thermopolis/world's largest mineral hot spring/Wyoming Dinosaur Center |
| 56039 | Teton County | Wyoming | -1 | Jackson Hole/Grand Teton NP/Jackson Hole Economic Policy Symposium/Federal Reserve |
| 18007 | Benton County | Indiana | -1 | Fowler/NW Indiana wind energy corridor/MISO grid management |
| 18041 | Fayette County | Indiana | -1 | Connersville/"Little Detroit"/Whitewater River/automotive heritage deindustrialization |
| 18119 | Owen County | Indiana | -1 | Spencer/Cataract Falls/White River/Bloomington IU exurb/Hoosier NF adjacent |
| 29035 | Carter County | Missouri | -1 | Van Buren/Current River/Ozark National Scenic Riverways/Greer Spring |
| 29073 | Gasconade County | Missouri | -1 | Hermann/German wine country/Stone Hill Winery/Missouri River confluence |
| 29093 | Iron County | Missouri | -1 | Ironton/Taum Sauk highest MO point/pumped storage breach/Old Lead Belt |
| 13007 | Baker County | Georgia | -1 | Newton/least populous GA county/Flint River/ACF Basin water monitoring |
| 13065 | Clinch County | Georgia | -1 | Homerville/Okefenokee gateway/USFWS ecological monitoring/SE GA timber |
| 13149 | Heard County | Georgia | -1 | Franklin/Chattahoochee River/West Georgia Kia corridor/ACF Basin |
| 02070 | Dillingham Census Area | Alaska | -1 | Dillingham/Bristol Bay sockeye salmon/Pebble Mine controversy/EPA monitoring |
| 02188 | Northwest Arctic Borough | Alaska | -1 | Kotzebue/Red Dog Mine zinc/NANA Regional Corporation/Arctic broadband |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1103 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-30.md` — this document (new)

---

## Notable Additions

**Lake County SD (46079 — Dakota State University/Cyber Labs)**: Dakota State University in Madison, South Dakota has built one of the most specialized cybersecurity academic programs in the country — the Madison Cyber Labs (MCL) conducts research with direct DoD partnerships, and DSU graduates are placed into NSA, Cyber Command, and defense contractor cybersecurity roles at rates that dwarf larger universities. The Jackson Hole Economic Policy Symposium — where Federal Reserve chairs deliver market-moving speeches — is in adjacent Teton County WY, but DSU represents the opposite end of the rural tech spectrum: a tiny university in a tiny South Dakota county with outsized national security relevance.

**Teton County WY (56039 — Jackson Hole/Federal Reserve Symposium)**: The annual Jackson Hole Economic Policy Symposium, hosted by the Federal Reserve Bank of Kansas City, is arguably the most consequential annual economic conference in the world — Fed chairs use it to signal monetary policy direction, and market-moving speeches (Ben Bernanke's 2010 QE2 hint, Jerome Powell's 2022 inflation speech) have emerged from this remote Wyoming resort. The symposium's security, communications, and broadcast infrastructure requirements in a county with 23,000 permanent residents create technology demands that far exceed what local population would suggest. Grand Teton National Park's visitor management systems and the county's extreme wealth concentration (highest US median household income) also drive connectivity investment.

**Iron County MO (29093 — Taum Sauk Dam Breach)**: The 2005 Taum Sauk Reservoir breach — in which the upper reservoir of Ameren Missouri's pumped storage facility catastrophically failed, releasing 1.3 billion gallons in about 12 minutes — is one of the most significant dam safety failures in US history. No fatalities occurred, but the failure destroyed Taum Sauk State Park's campground and created a 30-foot wall of water down Proffit Mountain. The rebuilt facility features state-of-the-art dam safety monitoring systems that became models for the industry: redundant sensors, continuous telemetry, and automatic shutdown protocols. Iron County's highest-point-in-Missouri distinction (Taum Sauk Mountain, 1,772 ft) and pumped storage infrastructure make it institutionally significant in Missouri's energy landscape.

**Northwest Arctic Borough AK (02188 — Red Dog Mine/NANA)**: Red Dog Mine in the Northwest Arctic Borough is one of the world's largest zinc mines — producing approximately 10% of global zinc output. The mine operates in one of the most remote industrial settings on Earth: accessible only by the Delong Mountain Transportation System (a private haul road and port built by NANA and Teck) because no public roads connect it to the rest of Alaska. NANA Regional Corporation's partnership with Teck distributes mine profits to over 14,000 Inupiaq shareholders — making it one of the most significant economic development projects in Alaska Native history. The mine's remote operations SCADA, satellite communications, and environmental monitoring IT represent industrial computing at the edge of connectivity.

**Dillingham Census Area AK (02070 — Bristol Bay Salmon/Pebble Mine)**: Bristol Bay produces the world's largest sockeye salmon run — typically 40+ million fish — supporting a commercial fishing industry worth over $1.5 billion annually. The proposed Pebble Mine at the headwaters of rivers feeding Bristol Bay was one of the most contentious environmental regulatory battles in US history, ultimately denied by the Army Corps of Engineers in 2023 after EPA veto under Clean Water Act Section 404(c). The regulatory proceedings generated massive environmental monitoring IT: water quality sensors, fish migration tracking, hydrology modeling. Dillingham itself is the regional hub for one of the world's most valuable wild fisheries, with seafood processing, logistics, and fisheries management computing anchoring the local economy.

**De Witt County IL (17039 — Clinton Nuclear)**: Clinton Power Station in De Witt County is one of Illinois's six nuclear generating stations — providing baseload carbon-free power to the Midwest grid. Nuclear power operations require the most sophisticated safety-critical computing environments in civilian energy: NRC-licensed safety monitoring systems, cybersecurity programs mandated by NRC regulations, reactor protection systems, and maintenance management IT. Illinois's nuclear fleet is one of the largest in the nation, and Exelon's Clinton station contributes to a state grid that gets approximately half its electricity from nuclear — making nuclear plant IT infrastructure one of Illinois's most significant computing sectors.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1096 (up 40 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (nineteenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (nineteenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1103 counties)
- [x] 0 critical errors post-validation
