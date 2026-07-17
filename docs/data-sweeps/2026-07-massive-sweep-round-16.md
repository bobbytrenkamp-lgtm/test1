# US DC & AI Policy Tracker — Massive Data Sweep: Round 16

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** AL/NM/OK/MN/NE/IA/MO depth — Army bases, Intel semiconductor fab, tribal nation HQs, army ammunition, lakes region, I-29 corridor

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 803 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 803 |
| Validation errors | 0 |
| Validation warnings | 530 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 01069 | Houston County | Alabama | -1 | Dothan/Wiregrass hub/SE Alabama commerce |
| 01113 | Russell County | Alabama | -1 | Phenix City/Fort Moore(Benning)/cross-border |
| 01049 | DeKalb County | Alabama | -1 | Fort Payne/sock capital/textile power load |
| 01031 | Coffee County | Alabama | -1 | Enterprise/Fort Novosel/Army aviation IT |
| 35043 | Sandoval County | New Mexico | -1 | Rio Rancho/Intel fab/NM 3rd largest city |
| 35031 | McKinley County | New Mexico | -1 | Gallup/Route 66/Navajo Nation hub |
| 35045 | San Juan County | New Mexico | -1 | Farmington/San Juan Basin natural gas |
| 35055 | Taos County | New Mexico | -1 | Taos/arts colony/LANL spillover/Kit Carson |
| 40121 | Pittsburg County | Oklahoma | -1 | McAlester AAP/Army primary ordnance plant |
| 40013 | Bryan County | Oklahoma | -1 | Durant/Choctaw Nation HQ/WinStar Casino |
| 40019 | Carter County | Oklahoma | -1 | Ardmore/Ardmore Basin oil/Chickasaw Nation |
| 27067 | Kandiyohi County | Minnesota | -1 | Willmar/Jennie-O Turkey/CentraCare west MN |
| 27035 | Crow Wing County | Minnesota | -1 | Brainerd/lakes region tourism IT/Camp Ripley |
| 27025 | Chisago County | Minnesota | -1 | North Branch/Twin Cities NE exurban growth |
| 31043 | Dakota County | Nebraska | -1 | South Sioux City/Tyson/Sioux City metro NE |
| 31037 | Colfax County | Nebraska | -1 | Schuyler/Tyson pork/Columbus NE adjacent |
| 19085 | Harrison County | Iowa | -1 | Missouri Valley/I-29 corridor/Omaha-SC fiber |
| 19067 | Floyd County | Iowa | -1 | Charles City/north-central IA ag processing |
| 19017 | Bremer County | Iowa | -1 | Waverly/Wartburg College/Cedar River corridor |
| 29225 | Webster County | Missouri | -1 | Marshfield/I-44 corridor/Springfield east |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (823 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-16.md` — this document (new)

---

## Notable Additions

**Sandoval County NM (35043 — Rio Rancho/Intel)**: Rio Rancho is New Mexico's third-largest city and home to one of Intel's largest US semiconductor fabrication campuses. Intel's Rio Rancho operations employ thousands and represent the most power-intensive industrial complex in New Mexico outside of Los Alamos. PNM's substation build-out in Rio Rancho to serve Intel's fab is among the most significant industrial electrical investments in the state. The adjacency to Sandia National Labs and Kirtland AFB extends the high-tech ecosystem north from Albuquerque. This was a significant gap in the database — Sandoval County is more relevant to data center infrastructure than many in-database counties.

**Coffee County AL (01031 — Fort Novosel/Army aviation)**: Fort Rucker, now redesignated Fort Novosel, is the home of the US Army Aviation Center of Excellence. Every Army pilot learns to fly here. The base's flight simulation infrastructure — immersive flight simulators, terrain databases, avionics training systems — is among the most sophisticated in the military. Alabama Power's electrical service to the base creates a meaningful federal load in rural Coffee County, well beyond what the region's civilian economy would otherwise support.

**Pittsburg County OK (40121 — McAlester AAP)**: McAlester Army Ammunition Plant is the US Army's primary facility for manufacturing conventional bombs and artillery shells. MCAAP produces the majority of the ordnance used by US forces in combat, and its production management, quality control, and inventory systems represent critical and specialized federal IT infrastructure. The plant's isolated rural location is intentional for safety reasons — and its computing requirements are substantial relative to the surrounding economy.

**Bryan County OK (40013 — Choctaw Nation/WinStar)**: Durant hosts the Choctaw Nation of Oklahoma's tribal headquarters — the third-largest tribe in the US by enrollment. The Nation's tribal government IT, healthcare system, and massive gaming enterprise (WinStar World Casino is the world's largest casino by gambling floor area) create genuine concentrated IT demand unusual for a county of Durant's population. Tribal nations are systematically underrepresented in commercial data center analyses; Bryan County is a case where the tribal IT footprint substantially exceeds what the general population metrics suggest.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 560 (up 30 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (fifth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (fifth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (823 counties)
- [x] 0 critical errors post-validation
