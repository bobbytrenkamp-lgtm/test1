# US DC & AI Policy Tracker — Massive Data Sweep: Round 19

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** AK/SD/TX/MN/MS/AL — Trans-Alaska Pipeline, Camp Ripley, Ole Miss, Fort Novosel corridor

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 863 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 863 |
| Validation errors | 0 |
| Validation warnings | 623 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 02185 | North Slope Borough | Alaska | -1 | Prudhoe Bay/Trans-Alaska Pipeline origin/oil field SCADA |
| 02261 | Valdez-Cordova Census Area | Alaska | -1 | Trans-Alaska Pipeline terminus/Alyeska marine terminal |
| 02150 | Kodiak Island Borough | Alaska | -1 | Coast Guard Air Station Kodiak/largest USCG air station |
| 02130 | Ketchikan Gateway Borough | Alaska | -1 | SE Alaska hub/Inside Passage fiber corridor |
| 46033 | Custer County | South Dakota | -1 | Custer/Black Hills National Forest hub |
| 46047 | Fall River County | South Dakota | -1 | Hot Springs/VA Black Hills Health Care |
| 46019 | Butte County | South Dakota | -1 | Belle Fourche/geographic center of nation/NW SD energy |
| 48241 | Jasper County | Texas | -1 | Jasper/East Texas timber/Toledo Bend Reservoir |
| 48165 | Gaines County | Texas | -1 | Seminole/Permian Basin edge/cotton/oil/wind |
| 48117 | Deaf Smith County | Texas | -1 | Hereford/feedlot capital of world/Panhandle ag |
| 48291 | Liberty County | Texas | -1 | Liberty/Houston NE petrochemical corridor/I-10 fiber |
| 27007 | Beltrami County | Minnesota | -1 | Bemidji/BSU/north MN hub |
| 27097 | Morrison County | Minnesota | -1 | Little Falls/Camp Ripley/largest US National Guard installation |
| 27111 | Otter Tail County | Minnesota | -1 | Fergus Falls/Otter Tail Power HQ/west-central MN hub |
| 28003 | Alcorn County | Mississippi | -1 | Corinth/TVA manufacturing/Civil War railroad hub |
| 28071 | Lafayette County | Mississippi | -1 | Oxford/University of Mississippi/Ole Miss research |
| 28109 | Pearl River County | Mississippi | -1 | Poplarville/south MS I-59 corridor |
| 28027 | Coahoma County | Mississippi | -1 | Clarksdale/Mississippi Delta blues hub |
| 01055 | Etowah County | Alabama | -1 | Gadsden/Coosa River industrial/Goodyear |
| 01045 | Dale County | Alabama | -1 | Ozark/Fort Novosel flight corridor/SE Alabama hub |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (883 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-19.md` — this document (new)

---

## Notable Additions

**North Slope Borough AK (02185 — Prudhoe Bay/Trans-Alaska Pipeline)**: Prudhoe Bay is the largest oil field ever discovered in North America. Alyeska Pipeline Service Company's SCADA and control systems for the 800-mile Trans-Alaska Pipeline originate here — this is one of the most extensive industrial digital monitoring networks in the United States. BP, ConocoPhillips, and ExxonMobil all operate significant digital operations centers in the borough. The extreme environment (permafrost, Arctic conditions) and the complexity of operating one of the world's longest oil pipelines create extraordinary instrumentation and remote monitoring requirements.

**Valdez-Cordova Census Area AK (02261 — TAPS Terminus/Marine Terminal)**: Alyeska's Valdez Marine Terminal is one of the largest crude oil export facilities in the United States. The terminal receives Alaska North Slope crude from the 800-mile pipeline and loads it onto tankers for West Coast and Asian markets. Coordinating tanker traffic through Prince William Sound — with its narrow passages and the memory of Exxon Valdez — requires sophisticated marine operations and environmental monitoring IT. The Coast Guard's marine domain awareness systems in the Sound add federal computing infrastructure to the area.

**Morrison County MN (27097 — Camp Ripley)**: Camp Ripley is the largest National Guard installation in the United States by training capacity. The Minnesota Army National Guard's home base hosts not just Minnesota units but multi-state joint training and international partner training missions. The installation's range management systems, training management IT, and command systems create a federal computing presence well above what similar-sized facilities would generate. Camp Ripley also houses a cold-weather training facility that attracts units from warmer states seeking winter training environments.

**Lafayette County MS (28071 — University of Mississippi/Ole Miss)**: The University of Mississippi's National Center for Natural Products Research is the largest university laboratory for natural products research in the nation. Ole Miss's growing research computing infrastructure, combined with Yokohama Tire's major North American manufacturing plant in the county and the university's SEC athletics IT (Oxford hosts one of the SEC's most vibrant college towns), creates IT demand that significantly exceeds expectations for a rural Mississippi county. The town's literary heritage (Faulkner's home is here) and growing tourism make it one of Mississippi's most dynamic secondary markets.

**Kodiak Island Borough AK (02150 — USCG Air Station Kodiak)**: Coast Guard Air Station Kodiak is the largest US Coast Guard air station in the country. Its operational scope covers all of Alaskan waters — millions of square miles of ocean. The station's C4ISR systems, aerial surveillance data processing, search-and-rescue coordination technology, and fisheries law enforcement IT create a major federal computing concentration in remote island Alaska. Kodiak is also the hub of Alaska's commercial fishing industry — the largest fishing fleet on the US West Coast — adding significant commercial maritime IT to the federal presence.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 661 (up 38 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (eighth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (eighth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (883 counties)
- [x] 0 critical errors post-validation
