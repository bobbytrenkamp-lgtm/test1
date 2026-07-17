# US DC & AI Policy Tracker — Massive Data Sweep: Round 17

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** KS/IL/AR/CO/TX/MT/MS depth — refining corridors, Dresden nuclear, Big River Steel, Grand Junction, Fort Cavazos

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 823 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 823 |
| Validation errors | 0 |
| Validation warnings | 560 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 20125 | Montgomery County | Kansas | -1 | Independence/Coffeyville Resources refinery |
| 20035 | Cowley County | Kansas | -1 | Arkansas City/Winfield/Cowley College |
| 20009 | Barton County | Kansas | -1 | Great Bend/central KS oil/Barton CC |
| 20059 | Franklin County | Kansas | -1 | Ottawa/Ottawa University/I-35 KC corridor |
| 17063 | Grundy County | Illinois | -1 | Morris/Dresden Nuclear/I-80 ComEd corridor |
| 17183 | Vermilion County | Illinois | -1 | Danville/I-74 IL-IN border corridor |
| 17179 | Tazewell County | Illinois | -1 | Pekin/Morton/Illinois River ag processing |
| 17177 | Stephenson County | Illinois | -1 | Freeport/NW Illinois manufacturing heritage |
| 05093 | Mississippi County | Arkansas | -1 | Blytheville/Big River Steel/advanced EAF mill |
| 08077 | Mesa County | Colorado | -1 | Grand Junction/western slope's largest city |
| 08067 | La Plata County | Colorado | -1 | Durango/Fort Lewis College/Four Corners |
| 08085 | Montrose County | Colorado | -1 | Montrose/Uncompahgre/western slope service |
| 08075 | Logan County | Colorado | -1 | Sterling/NE Colorado hub/I-76 fiber |
| 48099 | Coryell County | Texas | -1 | Copperas Cove/Fort Cavazos/Army's largest base |
| 48257 | Kaufman County | Texas | -1 | Terrell/DFW SE fastest-growing exurb |
| 48213 | Henderson County | Texas | -1 | Athens/East Texas lakes/US-175 corridor |
| 30017 | Custer County | Montana | -1 | Miles City/eastern MT hub/livestock auction |
| 30027 | Fergus County | Montana | -1 | Lewistown/geographic center of Montana |
| 28001 | Adams County | Mississippi | -1 | Natchez/SW Mississippi hub/river corridor |
| 28043 | Grenada County | Mississippi | -1 | Grenada/I-55 north MS corridor/GE legacy |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (843 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-17.md` — this document (new)

---

## Notable Additions

**Mississippi County AR (05093 — Big River Steel)**: The former Blytheville Air Force Base has been repurposed into one of the most significant industrial redevelopment success stories in the US South. Big River Steel (now US Steel Arkansas) is a next-generation electric arc furnace flat-rolled steel mill — described at opening as the most technologically advanced flat-rolled steel facility in North America. EAF steel production is among the most power-intensive industrial processes, and Entergy Arkansas's transmission infrastructure in Mississippi County has been substantially expanded to serve the mill. This is one of the most genuinely high-load industrial counties in Arkansas.

**Grundy County IL (17063 — Dresden Nuclear)**: Dresden Nuclear Generating Station in Morris is the first US nuclear plant built entirely with private financing — and one of the oldest still operating under Exelon. Dresden's two boiling water reactors represent significant generation capacity in Grundy County. ComEd's transmission infrastructure to carry Dresden's output creates grid capacity far in excess of local commercial demand, creating favorable conditions for large industrial load co-location along the I-80 corridor.

**Mesa County CO (08077 — Grand Junction)**: Grand Junction is the largest city on Colorado's western slope — ~170K metro population — and the commercial, healthcare, and energy hub for western Colorado, eastern Utah, and northwest New Mexico. The county's Piceance Basin oil and gas production creates SCADA and production IT demand. BLM's Grand Junction field office manages the most federal land area of any BLM office in the lower 48. This was the most significant gap remaining in Colorado's coverage.

**Coryell County TX (48099 — Fort Cavazos)**: Fort Hood, redesignated Fort Cavazos in 2023, is the largest US Army installation in the world by area. Home of III Corps and the 1st Cavalry Division, Fort Cavazos hosts extraordinary C4ISR, simulation, and command systems. The Army's 'Network at the Tactical Edge' and major training simulation infrastructure are concentrated here. Bell County (Killeen, already in DB) covers the primary civilian community, but Copperas Cove in Coryell County is the second-largest community serving the base.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 597 (up 37 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (sixth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (sixth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (843 counties)
- [x] 0 critical errors post-validation
