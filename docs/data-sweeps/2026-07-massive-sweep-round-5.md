# US DC & AI Policy Tracker — Massive Data Sweep: Round 5

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** Defense/cyber hubs, EV manufacturing corridors, university supercomputing, NJ/NY expansion, industrial power transition

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 583 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 583 |
| Validation errors | 0 |
| Validation warnings | 403 |

---

## Phase 1 — Repository Audit

### Findings

Key market gaps identified entering Round 5:

- **Georgia**: Richmond County (Augusta — Fort Eisenhower/ARCYBER) not yet documented; one of the most significant defense cyber infrastructure sites in the Southeast. Chatham County (Savannah port) also missing.
- **Alabama**: Tuscaloosa County (UA, Mercedes-Benz) uncovered
- **Arkansas**: Crittenden County (West Memphis, Memphis MSA cross-river) missing
- **Kentucky**: Only Fayette and Jefferson covered. Scott (Georgetown/Toyota), Jessamine (Nicholasville/Lexington south), Warren (Bowling Green/GM EV) all missing
- **Mississippi**: Lamar County (Hattiesburg/Pine Belt) uncovered
- **Nebraska**: Washington County (Blair, NPPD territory north of Omaha) missing
- **Kansas**: Pottawatomie County (Manhattan/Kansas State) missing
- **Oklahoma**: Rogers County (Claremore/Tulsa east) missing
- **Ohio**: Portage County (Kent/Kent State NE Ohio industrial) missing
- **Tennessee**: Blount County (Alcoa/Maryville, TVA industrial power) missing
- **Illinois**: Champaign County (UIUC/NCSA supercomputing) not yet documented despite being one of the most significant research computing sites in the US
- **Indiana**: Allen County (Fort Wayne, I&M/AEP) missing
- **New Jersey**: Burlington County and Ocean County not yet covered
- **New York**: Broome County (Binghamton/IBM legacy) and Niagara County (hydro power) missing
- **Massachusetts**: Bristol County (New Bedford/Taunton) uncovered
- **Wisconsin**: Winnebago County (Oshkosh/Fox Valley paper mill transition) missing

**FIPS errors caught this round:**
| Bad FIPS | Attempted Name | Actual County at That FIPS | Resolution |
|---|---|---|---|
| 28075 | Lamar County MS | Lauderdale County MS (Meridian) | Fixed in place → 28073 |
| 20151 | Pottawatomie County KS | Pratt County KS | Fixed in place → 20149 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 21 net new entries (21 attempted, 2 FIPS corrected in-place, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 01125 | Tuscaloosa County | Alabama | -1 | UA/Mercedes-Benz tech corridor |
| 05035 | Crittenden County | Arkansas | -1 | West Memphis/Memphis metro |
| 17019 | Champaign County | Illinois | -1 | UIUC/NCSA supercomputing |
| 18003 | Allen County | Indiana | -1 | Fort Wayne/I&M service |
| 13051 | Chatham County | Georgia | -1 | Savannah port logistics |
| 13245 | Richmond County | Georgia | -1 | Fort Eisenhower/ARCYBER |
| 20149 | Pottawatomie County | Kansas | -1 | Manhattan/Kansas State |
| 21113 | Jessamine County | Kentucky | -1 | Nicholasville/Lexington south |
| 21209 | Scott County | Kentucky | -1 | Georgetown/Toyota |
| 21227 | Warren County | Kentucky | -1 | Bowling Green/GM EV |
| 28073 | Lamar County | Mississippi | -1 | Hattiesburg/Pine Belt |
| 25005 | Bristol County | Massachusetts | -1 | New Bedford/Taunton |
| 31177 | Washington County | Nebraska | -1 | Blair/Omaha north/NPPD |
| 34005 | Burlington County | New Jersey | -1 | I-295 corridor/PSE&G |
| 34029 | Ocean County | New Jersey | -1 | Toms River/JCP&L |
| 36007 | Broome County | New York | -1 | Binghamton/IBM legacy |
| 36063 | Niagara County | New York | -1 | Niagara Falls hydropower |
| 39133 | Portage County | Ohio | -1 | Kent State/NE Ohio industrial |
| 40131 | Rogers County | Oklahoma | -1 | Claremore/Tulsa east |
| 47009 | Blount County | Tennessee | -1 | Alcoa/Maryville/TVA |
| 55139 | Winnebago County | Wisconsin | -1 | Oshkosh/Fox Valley |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 21 net new county records
- `data/map_data.json` — regenerated (604 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-5.md` — this document (new)

---

## Validation Results (Post-Sweep)

- Critical: 0 (2 FIPS errors caught and fixed in-place)
- Errors: 0
- Warnings: 409 (up 6 from 403 — all cosmetic pre-existing pattern)
- All FIPS codes verified against 3,143-county reference

---

## Notable Additions

**Richmond County GA (13245 — Fort Eisenhower/ARCYBER)**: This is one of the most significant US cyber and defense data infrastructure locations in the entire country. Home to US Army Cyber Command (ARCYBER), the National Security Agency's Georgia node, and the Cyber Center of Excellence. Despite its national significance, it was not previously documented in the tracker. This is now corrected.

**Champaign County IL (17019 — UIUC/NCSA)**: The National Center for Supercomputing Applications at the University of Illinois Urbana-Champaign hosts Delta, one of the most powerful academic supercomputing systems in the US, and has historically been the site of NCSA Mosaic (the first web browser). A significant omission now corrected.

**Niagara County NY (36063 — Niagara Falls hydro)**: NYPA targets this low-cost renewable power specifically for data center development. Former aluminum smelter sites provide high-power industrial infrastructure for conversion. This is a strategically important location for power-intensive workloads.

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] 2 FIPS errors caught and fixed in-place
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json
- [x] 0 critical errors post-validation
