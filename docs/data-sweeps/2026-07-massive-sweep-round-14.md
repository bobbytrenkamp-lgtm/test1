# US DC & AI Policy Tracker — Massive Data Sweep: Round 14

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** IA/KS/ND/ID/NE/AR/MT/MS/MO depth — meatpacking corridors, military bases, oil field digitalization, university towns, river hubs

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 763 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 763 |
| Validation errors | 0 |
| Validation warnings | 459 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 1 FIPS error caught and corrected, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 19127 | Marshall County | Iowa | -1 | Marshalltown/JBS Turkey/Emerson Fisher Controls |
| 19111 | Lee County | Iowa | -1 | Keokuk/Fort Madison/Iowa Army Ammunition Plant |
| 19125 | Marion County | Iowa | -1 | Knoxville/Pella Corp manufacturing hub |
| 19181 | Warren County | Iowa | -1 | Indianola/Des Moines south suburb growth |
| 20037 | Crawford County | Kansas | -1 | Pittsburg/Pittsburg State University/SE Kansas |
| 20057 | Ford County | Kansas | -1 | Dodge City/Tyson/Cargill dual beef processing |
| 20113 | McPherson County | Kansas | -1 | McPherson/HF Sinclair oil refinery hub |
| 38053 | McKenzie County | North Dakota | -1 | Watford City/Bakken core SCADA |
| 38093 | Stutsman County | North Dakota | -1 | Jamestown/University of Jamestown/ND central hub |
| 16057 | Latah County | Idaho | -1 | Moscow/University of Idaho/WSU cross-border |
| 16039 | Elmore County | Idaho | -1 | Mountain Home AFB/F-15E Strike Eagle |
| 31067 | Gage County | Nebraska | -1 | Beatrice/SE Nebraska agricultural hub/NPPD |
| 31131 | Otoe County | Nebraska | -1 | Nebraska City/Arbor Day/I-29 corridor |
| 05069 | Jefferson County | Arkansas | -1 | Pine Bluff/UAPB/Pine Bluff Arsenal |
| 05085 | Lonoke County | Arkansas | -1 | Cabot/Little Rock NE fastest-growing suburb |
| 30083 | Richland County | Montana | -1 | Sidney/Montana Bakken oil/eastern MT hub |
| 30041 | Hill County | Montana | -1 | Havre/MSU Northern/BNSF hi-line corridor |
| 28067 | Jones County | Mississippi | -1 | Laurel/Sanderson Farms/south-central MS |
| 29097 | Jasper County | Missouri | -1 | Joplin/4th largest MO city/tri-state hub |
| 28151 | Washington County | Mississippi | -1 | Greenville/Delta hub/Port of Greenville |

**FIPS error caught and corrected:**
- `05081` initially assigned to Lonoke County AR → actually Little River County AR → corrected to `05085`

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (783 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-14.md` — this document (new)

---

## Notable Additions

**Ford County KS (20057 — Dodge City dual beef)**: Dodge City hosts both Tyson Fresh Meats and Cargill Meat Solutions, making it one of the most concentrated beef processing locations in the world. The combined daily cattle throughput of these two plants drives extraordinary Evergy substation capacity in a southwest Kansas city of ~30,000. Kansas wind energy from surrounding counties adds renewable energy access. Ford County represents the archetype of an industrial electrical load market that is often overlooked because the underlying industry — beef slaughter — doesn't fit the typical data center narrative.

**McKenzie County ND (38053 — Bakken core)**: Watford City is the "heart of the Bakken" — at the geographic center of North Dakota's Williston Basin oil play. Unlike Williams County (Williston), McKenzie County is further from the larger cities and represents the pure oil field digital infrastructure market: well monitoring, SCADA, production data analytics, and field services IT. As Bakken operators have digitalized their operations, the computing density in McKenzie County has grown well beyond what the population suggests.

**Latah County ID (16057 — Moscow/WSU cross-border)**: The University of Idaho and Washington State University are separated by 8 miles across the state line, creating an unusually concentrated academic computing corridor in the Palouse. Idaho Power's hydropower-backed rates are among the lowest available to academic institutions in the US. The Moscow-Pullman corridor's bi-state nature — two land-grant universities sharing faculty, students, and research infrastructure — makes it a distinctive and underappreciated data infrastructure market.

**Elmore County ID (16039 — Mountain Home AFB)**: Mountain Home Air Force Base is the home of the 366th Fighter Wing, one of the Air Force's premier composite wings capable of deploying a full strike package independently. F-15E Strike Eagle operations require sophisticated command, control, and intelligence systems. Idaho Power's hydro-backed electricity at Mountain Home provides a competitive cost basis for the federal IT infrastructure. Elmore County is another example of a rural county with genuine high-tier federal computing requirements driven by the military installation.

**Jasper County MO (29097 — Joplin tri-state)**: Joplin is the fourth-largest city in Missouri and the undisputed commercial hub of the Missouri-Kansas-Oklahoma tri-state area. The Joplin metro serves a regional population far larger than its city population, with Mercy Hospital Joplin and Freeman Health System anchoring a major healthcare IT concentration. Missouri Southern State University and the I-44/US-71 corridor through Joplin make it a genuine regional nexus for data and communications infrastructure.

---

## Validation Results (Post-Sweep)

- Critical: 0 (1 FIPS error caught and fixed — 05081→05085 for Lonoke County AR)
- Errors: 0
- Warnings: 489 (up 30 from 459 — cosmetic consistency patterns)
- All 20 final FIPS codes verified clean

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] 1 FIPS error caught and fixed in-place (05081→05085)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (783 counties)
- [x] 0 critical errors post-validation
