# US DC & AI Policy Tracker — Massive Data Sweep: Round 7

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** Illinois expansion, NY university/IBM hubs, NJ completion, CA secondary, Michigan industrial, TX semiconductor corridor, NC military

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 624 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 624 |
| Validation errors | 0 |
| Validation warnings | 411 |

---

## Phase 1 — Repository Audit

### Findings

**Illinois (11 entering)**: Major state with significant gaps — Peoria (3rd largest city, Caterpillar HQ), Quad Cities IL side (John Deere HQ), Chicago exurb counties (McHenry, Kankakee), LaSalle I-80 nuclear corridor all missing.

**New York (20 entering)**: Cornell (Tompkins) and IBM Poughkeepsie (Dutchess) both absent — two of the most significant computing sites in the Northeast. Rockland County (NYC near suburb) and Chautauqua (Lake Erie/NYPA) also missing.

**New Jersey (12 entering)**: Passaic County (Paterson — large industrial NJ) and Gloucester County (Philadelphia south corridor) not yet covered. After these additions NJ reaches near-complete coverage for market-relevant counties.

**California (26 entering)**: Solano County (I-80/Travis AFB corridor between SF and Sacramento), Sonoma County (North Bay tech), and Butte County (Chico/CSU) not yet documented.

**Michigan (15 entering)**: Midland County (Dow Chemical global HQ, nuclear power history), Calhoun County (Battle Creek — Kellogg's, Fort Custer), Eaton County (Lansing west suburb) all missing.

**Texas (30 entering)**: Grayson County (Sherman-Denison semiconductor hub — TI and GlobalFoundries fabs) not documented despite being one of the most significant advanced manufacturing and data infrastructure builds in the US.

**North Carolina (30 entering)**: Craven County (New Bern/MCAS Cherry Point) not documented.

**FIPS error caught:**
| Bad FIPS | Attempted Name | Actual County at That FIPS | Resolution |
|---|---|---|---|
| 26023 | Calhoun County MI | Branch County MI (Coldwater) | Fixed in place → 26025 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 19 net new entries (20 planned, 1 FIPS corrected in-place, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 06007 | Butte County | California | -1 | Chico/CSU/PG&E North Valley |
| 06095 | Solano County | California | -1 | I-80 corridor/Travis AFB |
| 06097 | Sonoma County | California | -1 | North Bay tech/PG&E |
| 17091 | Kankakee County | Illinois | -1 | Chicago south exurb/ComEd |
| 17099 | LaSalle County | Illinois | -1 | I-80/nuclear corridor/Exelon |
| 17111 | McHenry County | Illinois | -1 | Chicago NW exurb/ComEd |
| 17143 | Peoria County | Illinois | -1 | Caterpillar HQ/Ameren IL |
| 17161 | Rock Island County | Illinois | -1 | Quad Cities/John Deere |
| 26025 | Calhoun County | Michigan | -1 | Battle Creek/Kellogg's |
| 26045 | Eaton County | Michigan | -1 | Lansing suburb/Consumers Energy |
| 26111 | Midland County | Michigan | -1 | Dow Chemical/Consumers Energy nuclear |
| 34015 | Gloucester County | New Jersey | -1 | Philadelphia south NJ/PSEG |
| 34031 | Passaic County | New Jersey | -1 | Paterson/PSEG industrial |
| 36013 | Chautauqua County | New York | -1 | Lake Erie/NYPA hydro power |
| 36027 | Dutchess County | New York | -1 | IBM Poughkeepsie/Hudson Valley |
| 36087 | Rockland County | New York | -1 | NYC near suburb/OR&L |
| 36109 | Tompkins County | New York | -1 | Cornell/Ithaca/AI research |
| 37049 | Craven County | North Carolina | -1 | MCAS Cherry Point/New Bern |
| 48181 | Grayson County | Texas | -1 | Sherman-Denison/TI/GlobalFoundries |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 19 net new county records
- `data/map_data.json` — regenerated (643 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-7.md` — this document (new)

---

## Notable Additions

**Grayson County TX (48181 — Sherman-Denison semiconductor hub)**: Texas Instruments announced a 300mm semiconductor fab in Sherman in 2021; GlobalFoundries expansion and other semiconductor investments followed. This is one of the largest concentrations of advanced semiconductor manufacturing investment outside the traditional hubs, driving massive power infrastructure build and creating a natural data center adjacent market. A very significant omission now corrected.

**Dutchess County NY (36027 — IBM Poughkeepsie)**: IBM's world headquarters and one of its most significant mainframe and enterprise computing campuses sits in Dutchess County. The Hudson Valley IBM corridor is a historic computing site with ongoing enterprise data infrastructure relevance.

**Tompkins County NY (36109 — Cornell)**: Cornell University's computing and AI research programs are among the most significant in the US. Cornell Tech (Roosevelt Island) draws attention, but the main campus Ithaca computing infrastructure is substantial.

**Midland County MI (26111 — Dow Chemical)**: Dow Chemical's global headquarters, combined with the county's legacy nuclear power infrastructure (Midland Nuclear → Midland Cogeneration), represents unusually significant industrial power and IT infrastructure density for a mid-sized county.

---

## Validation Results (Post-Sweep)

- Critical: 0 (1 FIPS error fixed in-place)
- Errors: 0
- Warnings: 418 (up 7 from 411 — all cosmetic pre-existing pattern)
- All FIPS codes verified against 3,143-county reference

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] 1 FIPS error caught and fixed in-place (26023→26025, Calhoun County MI)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json
- [x] 0 critical errors post-validation
