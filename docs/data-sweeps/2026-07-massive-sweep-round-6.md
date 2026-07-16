# US DC & AI Policy Tracker — Massive Data Sweep: Round 6

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** Ohio industrial gaps, Pennsylvania Harrisburg, Florida secondary markets, Wisconsin/Minnesota expansion, Gulf Coast, Michigan industrial

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 604 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 604 |
| Validation errors | 0 |
| Validation warnings | 409 |

---

## Phase 1 — Repository Audit

### Findings

State coverage analysis (normalized for abbreviation/full-name mixing) showed all states at 5+ counties post-Round 5. Round 6 targeted remaining metro market gaps and secondary markets in well-covered states.

Key gaps identified:
- **Ohio (18)**: Lucas County (Toledo — 4th largest OH city) and Stark County (Canton) not documented; Butler County (Cincinnati north) missing
- **Pennsylvania (20)**: Harrisburg metro (Dauphin and Cumberland counties) not documented despite being the state capital and a significant government IT hub
- **Florida (22)**: Lee County (Fort Myers — fastest growing FL metro), Osceola County (Kissimmee/Orlando south), St. Lucie County (Treasure Coast), Sarasota County, Volusia County (Daytona/Deltona) all missing
- **Wisconsin (16)**: Brown County (Green Bay — 3rd largest WI city) and La Crosse County not covered
- **Minnesota (10)**: Stearns County (St. Cloud) notably missing — actual Microsoft Azure data center campus site; St. Louis County (Duluth — low-cost hydro); Blue Earth County (Mankato)
- **Alabama (11)**: Baldwin County (Daphne/Fairhope — fastest growing AL county) not documented
- **Michigan (13)**: Monroe County (SE Michigan/Toledo border) and Muskegon County (Lake Michigan renewable hub) missing
- **Tennessee (21)**: Madison County (Jackson — western TN regional hub) not covered
- **Kentucky (13)**: Oldham County (Louisville NE) not documented

**No FIPS errors found this round** — all 20 FIPS codes passed Layer 2+3 validation on first run.

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 attempted, 0 errors, 0 skipped)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 01003 | Baldwin County | Alabama | -1 | Gulf Coast growth/PowerSouth |
| 12071 | Lee County | Florida | -1 | Fort Myers-Cape Coral/FPL |
| 12097 | Osceola County | Florida | -1 | Kissimmee/Orlando south |
| 12111 | St. Lucie County | Florida | -1 | Port St. Lucie/Treasure Coast |
| 12115 | Sarasota County | Florida | -1 | Gulf Coast financial services |
| 12127 | Volusia County | Florida | -1 | Daytona-Deltona/Duke Energy FL |
| 21185 | Oldham County | Kentucky | -1 | Louisville NE suburb/LG&E |
| 26115 | Monroe County | Michigan | -1 | SE Michigan/DTE industrial |
| 26121 | Muskegon County | Michigan | -1 | Lake Michigan/Consumers Energy wind |
| 27013 | Blue Earth County | Minnesota | -1 | Mankato/Southern MN |
| 27137 | St. Louis County | Minnesota | -1 | Duluth/Minnesota Power hydro |
| 27145 | Stearns County | Minnesota | -1 | St. Cloud/Microsoft Azure/Xcel |
| 39017 | Butler County | Ohio | -1 | Cincinnati north/Duke Energy |
| 39095 | Lucas County | Ohio | -1 | Toledo/Toledo Edison/AEP |
| 39151 | Stark County | Ohio | -1 | Canton-Massillon/AEP |
| 42041 | Cumberland County | Pennsylvania | -1 | Camp Hill-Carlisle/PPL |
| 42043 | Dauphin County | Pennsylvania | -1 | Harrisburg state capital/PPL |
| 47113 | Madison County | Tennessee | -1 | Jackson/TVA/western TN hub |
| 55009 | Brown County | Wisconsin | -1 | Green Bay/WPS-Integrys |
| 55063 | La Crosse County | Wisconsin | -1 | La Crosse/Dairyland Power |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (624 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-6.md` — this document (new)

---

## Notable Addition

**Stearns County MN (27145 — St. Cloud)**: This is one of the most significant data center clusters in the Upper Midwest and a major Microsoft Azure campus location. Microsoft selected the St. Cloud area for its Xcel Energy access, cold-climate natural cooling advantages, renewable power portfolio, and competitive rates. This was a significant real-world data center site not previously documented in the tracker.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 411 (up 2 from 409 — all cosmetic pre-existing pattern)
- All FIPS codes verified against 3,143-county reference

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] 0 FIPS errors — all passed on first run
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json
- [x] 0 critical errors post-validation
