# US DC & AI Policy Tracker — Massive Data Sweep: Round 12

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** IA/SD/KS/MS/WV/KY/TX thin-state depth — regional hubs, military installations, university cities, border trade

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 723 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 723 |
| Validation errors | 0 |
| Validation warnings | 445 |

---

## Phase 1 — Repository Audit

**Iowa (9/99 = 9%)**: Woodbury (Sioux City — 3rd largest Iowa city, Siouxland hub), Cerro Gordo (Mason City — north Iowa hub), Webster (Fort Dodge) absent.

**South Dakota (6/66 = 9%)**: Clay (Vermillion/University of South Dakota — state's flagship law school), Davison (Mitchell — I-90 crossroads hub), Lawrence (Lead/Deadwood — Sanford Underground Research Facility, deepest US laboratory) all missing.

**Kansas (10/105 = 10%)**: Saline (Salina — I-70/I-135 junction, Kansas geographic crossroads) and Ellis (Hays — Fort Hays State, fastest-growing KS university, major online education data infrastructure) absent.

**Mississippi (10/82 = 12%)**: Forrest (Hattiesburg/USM — Carnegie R2 research), Lee (Tupelo — Toyota Motor Manufacturing, largest rural hospital in US), Lauderdale (Meridian — NAS Meridian pilot training) all missing.

**West Virginia (7/55 = 13%)**: Marion (Fairmont — NETL-adjacent, WVU corridor) and Putnam (Teays Valley — fastest-growing WV county, Charleston west suburb) absent.

**Kentucky (16/120 = 13%)**: Franklin (Frankfort — state capital government IT), Bullitt (Shepherdsville — Louisville south suburb/Amazon/I-65), Pulaski (Somerset/Lake Cumberland — south-central KY hub) missing.

**Texas (39/254 = 15%)**: Webb (Laredo — busiest land port of entry in Western Hemisphere), Tom Green (San Angelo — wind corridor/Goodfellow AFB), Nacogdoches (SFA University/East Texas), Victoria (Formosa Plastics/Gulf Coast petrochemical hub) absent.

**No FIPS errors** — all 20 codes verified clean on first run.

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 19033 | Cerro Gordo County | Iowa | -1 | Mason City/north Iowa hub/IPL |
| 19187 | Webster County | Iowa | -1 | Fort Dodge/gypsum belt/MidAmerican Energy |
| 19193 | Woodbury County | Iowa | -1 | Sioux City/Siouxland hub/MidAmerican |
| 20051 | Ellis County | Kansas | -1 | Hays/Fort Hays State/I-70 western KS |
| 20169 | Saline County | Kansas | -1 | Salina/I-70 & I-135 crossroads |
| 21029 | Bullitt County | Kentucky | -1 | Shepherdsville/Louisville south/Amazon |
| 21073 | Franklin County | Kentucky | -1 | Frankfort/state capital/government IT |
| 21199 | Pulaski County | Kentucky | -1 | Somerset/Lake Cumberland/south-central KY |
| 28035 | Forrest County | Mississippi | -1 | Hattiesburg/USM/Southern Mississippi |
| 28075 | Lauderdale County | Mississippi | -1 | Meridian/NAS Meridian/Key Field |
| 28081 | Lee County | Mississippi | -1 | Tupelo/Toyota/North MS Medical Center |
| 46027 | Clay County | South Dakota | -1 | Vermillion/University of South Dakota |
| 46035 | Davison County | South Dakota | -1 | Mitchell/I-90 crossroads |
| 46081 | Lawrence County | South Dakota | -1 | Lead/Deadwood/SURF underground lab |
| 48347 | Nacogdoches County | Texas | -1 | SFA University/East Texas timber/SWEPCO |
| 48451 | Tom Green County | Texas | -1 | San Angelo/Goodfellow AFB/wind corridor |
| 48469 | Victoria County | Texas | -1 | Victoria/Formosa Plastics/Gulf petrochem |
| 48479 | Webb County | Texas | -1 | Laredo/busiest land port/border trade |
| 54049 | Marion County | West Virginia | -1 | Fairmont/NETL-adjacent/WVU corridor |
| 54079 | Putnam County | West Virginia | -1 | Teays Valley/Hurricane/Charleston W suburb |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (743 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-12.md` — this document (new)

---

## Notable Additions

**Lawrence County SD (46081 — SURF)**: The Sanford Underground Research Facility sits in the former Homestake Gold Mine at 1.5-mile depth — the deepest underground science lab in the US. SURF hosts the LUX-ZEPLIN dark matter experiment and is the far detector site for the DUNE/LBNF neutrino program. Federal DOE computing support for these experiments flows through the Black Hills fiber infrastructure. Lawrence County is an unusual case of a rural county with high-end scientific computing requirements.

**Webb County TX (48479 — Laredo)**: The busiest land port of entry in the Western Hemisphere by cargo value. The volume of customs processing, supply chain management, logistics IT, and trade finance running through Laredo's crossing infrastructure is genuinely massive. As manufacturing nearshoring from China to Mexico accelerates, the data infrastructure serving Webb County's trade corridor will only grow in importance.

**Franklin County KY (21073 — Frankfort state capital)**: The Kentucky Commonwealth Office of Technology is concentrated in Frankfort. State government IT consolidation means data centers, DR systems, and cybersecurity infrastructure for state agencies are disproportionately located here. State capital counties are systematically underrepresented in data center databases that focus on commercial markets; Frankfort's government IT profile is real and substantial.

**Fort Hays State (Ellis County KS)**: FHSU serves over 14,000 online students nationally, making its online education platform one of the largest in the Great Plains. The computing infrastructure required to deliver online education at that scale — video delivery, learning management systems, student data systems — is a distinctive and underappreciated source of data center demand in a western Kansas county.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 448 (up 3 from 445 — all cosmetic pre-existing patterns)
- All FIPS codes verified clean on first validation run

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (third clean round overall)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json
- [x] 0 critical errors post-validation
