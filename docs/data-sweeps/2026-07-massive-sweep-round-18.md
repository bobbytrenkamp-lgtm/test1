# US DC & AI Policy Tracker — Massive Data Sweep: Round 18

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** MO/NE/ID/MI/TN/GA/OK/KY — Fort Leonard Wood, Vogtle nuclear, GM Spring Hill, Cherokee Nation, Sun Valley tech, Traverse City

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 843 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 843 |
| Validation errors | 0 |
| Validation warnings | 597 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 29069 | Dunklin County | Missouri | -1 | Kennett/Bootheel poultry/cotton processing |
| 29201 | Scott County | Missouri | -1 | Sikeston/SE Missouri commercial hub |
| 29169 | Pulaski County | Missouri | -1 | Waynesville/Fort Leonard Wood |
| 31159 | Seward County | Nebraska | -1 | Seward/Concordia/Lincoln NW exurb |
| 31155 | Saunders County | Nebraska | -1 | Wahoo/Omaha-Lincoln corridor |
| 31025 | Cass County | Nebraska | -1 | Plattsmouth/Omaha south/Missouri River |
| 16069 | Nez Perce County | Idaho | -1 | Lewiston/inland port/Snake River terminus |
| 16013 | Blaine County | Idaho | -1 | Sun Valley/Hailey/tech executive community |
| 26055 | Grand Traverse County | Michigan | -1 | Traverse City/northern MI hub/StartUp TC |
| 26075 | Jackson County | Michigan | -1 | Jackson/Consumers Energy HQ/I-94 corridor |
| 47119 | Maury County | Tennessee | -1 | Columbia/Spring Hill GM Assembly/auto IT |
| 47189 | Wilson County | Tennessee | -1 | Lebanon/Nashville NE fastest-growing suburb |
| 47141 | Putnam County | Tennessee | -1 | Cookeville/Tennessee Tech/Upper Cumberland |
| 13073 | Columbia County | Georgia | -1 | Evans/Cyber Center of Excellence adjacent |
| 13033 | Burke County | Georgia | -1 | Waynesboro/Vogtle Nuclear Plant Units 3&4 |
| 13115 | Floyd County | Georgia | -1 | Rome/Berry College/NW Georgia hub |
| 13127 | Glynn County | Georgia | -1 | Brunswick/Golden Isles/vehicle port |
| 40123 | Pontotoc County | Oklahoma | -1 | Ada/Chickasaw Nation HQ/East Central |
| 40115 | Ottawa County | Oklahoma | -1 | Miami OK/Cherokee Nation/Tar Creek EPA |
| 21049 | Clark County | Kentucky | -1 | Winchester/Bluegrass horse country/Lex exurb |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (863 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-18.md` — this document (new)

---

## Notable Additions

**Burke County GA (13033 — Vogtle Nuclear)**: Plant Vogtle in Burke County is the first new nuclear facility licensed and constructed in the United States in more than three decades. Georgia Power's Units 3 and 4 at Vogtle — completed in 2023-2024 — represent the largest capital investment in a single power plant in US history. Four operational reactors at Vogtle make it one of the largest nuclear generating stations in the US. The Southern Company transmission infrastructure built to deliver Vogtle's output creates extraordinary grid capacity in rural Burke County, far exceeding any local commercial demand. This is one of the most significant electrical infrastructure investments in the southeast US in decades.

**Pulaski County MO (29169 — Fort Leonard Wood)**: Fort Leonard Wood trains more soldiers annually than any other Army installation in the US — over 85,000 graduates per year from Engineer, Military Police, and Chemical schools. The base's simulation, training management, and command systems represent a major federal computing footprint in the Missouri Ozarks. The Wood's throughput volume (comparable to a small city's population cycling through yearly) creates civilian and contractor technology demand beyond what the county's permanent population metrics suggest.

**Columbia County GA (13073 — Cyber Center of Excellence)**: Columbia County is the bedroom community for Fort Eisenhower (formerly Fort Gordon) — the Army's Cyber Center of Excellence. Fort Eisenhower hosts Army Cyber Command and the Army's cybersecurity training schools. The Army's cyber workforce — the largest government cybersecurity employer in the US — concentrates in Augusta/Columbia County. This makes the Augusta metro one of the most significant federal cybersecurity IT markets in the US, with Columbia County participating directly in that ecosystem.

**Burke County GA (13033 — Vogtle Nuclear)**: See above. Worth repeating: this is the first new nuclear in the US in decades and creates Southern Company's most significant new transmission build in a generation.

**Blaine County ID (16013 — Sun Valley tech community)**: The Allen & Company Sun Valley Conference annually brings the top tier of US technology, media, and finance leadership to Hailey/Sun Valley. Blaine County has become a permanent residence for a significant number of tech executives and investors. The resulting demand for secure high-bandwidth connectivity in the Wood River Valley has driven broadband infrastructure investment far beyond what the resident population alone justifies.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 623 (up 26 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (seventh consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (seventh consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (863 counties)
- [x] 0 critical errors post-validation
