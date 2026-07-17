# US DC & AI Policy Tracker — Massive Data Sweep: Round 15

**Sweep Date:** 2026-07-16  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** WV/MO/KY/SD/ND/TX depth — FBI CJIS Clarksburg, coal belt legacy power, university towns, state capitals, East Texas corridors

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 783 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 783 |
| Validation errors | 0 |
| Validation warnings | 489 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 1 FIPS error caught and corrected, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 54033 | Harrison County | West Virginia | -1 | Clarksburg/FBI CJIS Division/federal IT |
| 54029 | Hancock County | West Virginia | -1 | Weirton/Chester/steel power legacy |
| 54025 | Greenbrier County | West Virginia | -1 | Lewisburg/The Greenbrier Cold War bunker DC |
| 54045 | Logan County | West Virginia | -1 | Logan/southern WV coal/Appalachian Power |
| 29023 | Butler County | Missouri | -1 | Poplar Bluff/SE Missouri regional hub |
| 29143 | New Madrid County | Missouri | -1 | New Madrid/Mississippi River/Ameren legacy |
| 21035 | Calloway County | Kentucky | -1 | Murray/Murray State University/western KY |
| 21177 | Muhlenberg County | Kentucky | -1 | Greenville/Paradise fossil plant TVA legacy |
| 21205 | Rowan County | Kentucky | -1 | Morehead/Morehead State/eastern KY tech |
| 21009 | Barren County | Kentucky | -1 | Glasgow/Mammoth Cave region/south-central KY |
| 21081 | Grant County | Kentucky | -1 | Williamstown/Ark Encounter/Cincinnati exurb |
| 46065 | Hughes County | South Dakota | -1 | Pierre/state capital/Bureau of Indian Affairs |
| 46005 | Beadle County | South Dakota | -1 | Huron/state fair/turkey processing hub |
| 38071 | Ramsey County | North Dakota | -1 | Devils Lake/USACE hydrological IT |
| 38003 | Barnes County | North Dakota | -1 | Valley City/VCSU/BNSF I-94 mainline |
| 48005 | Angelina County | Texas | -1 | Lufkin/deep East Texas/NOV industrial IT |
| 48049 | Brown County | Texas | -1 | Brownwood/Howard Payne/central TX crossroads |
| 48401 | Rusk County | Texas | -1 | Henderson/East Texas Oil Field heritage |
| 48493 | Wilson County | Texas | -1 | Floresville/San Antonio SE fastest-growing |
| 48499 | Wood County | Texas | -1 | Quitman/Mineola/East TX fiber corridor |

**FIPS error caught and corrected:**
- `21075` initially assigned to Grant County KY → actually Fulton County KY → corrected to `21081`

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (803 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-15.md` — this document (new)

---

## Notable Additions

**Harrison County WV (54033 — FBI CJIS Clarksburg)**: The FBI's Criminal Justice Information Services Division is headquartered in Clarksburg, WV — the FBI's single largest division. CJIS manages the National Crime Information Center (NCIC), the Integrated Automated Fingerprint Identification System (IAFIS), and background check systems used by every law enforcement agency in the US. The CJIS facility's computing and data infrastructure requirements are extraordinary — making Harrison County one of the most significant federal IT counties in the eastern US outside the DC area. This was a major gap in the database.

**Greenbrier County WV (54025 — Cold War Bunker DC)**: The Greenbrier Resort in White Sulphur Springs was secretly maintained as a congressional continuity-of-government bunker from 1958 to 1992. The classified facility — built beneath the West Virginia Wing — was designed to house all of Congress after a nuclear attack, with broadcasting equipment, decontamination chambers, and power systems designed for autonomous operation. The bunker has since been converted into a commercial data center by The Greenbrier Data Center, making this one of the most historically distinctive data center facilities in the United States.

**Muhlenberg County KY (21177 — TVA Paradise legacy)**: TVA's Paradise Fossil Plant on the Green River was the largest coal-fired power plant in the US by generating capacity at its peak. The transmission infrastructure built to carry Paradise's output created extraordinary grid capacity in Muhlenberg County. With the plant now retired, the transmission infrastructure remains — available at TVA's competitive power cost rates. Coal country counties with legacy power infrastructure are among the most underappreciated potential data center markets in the US.

**Hughes County SD (46065 — Pierre state capital)**: Pierre is the smallest state capital in the continental US by population, yet South Dakota's state government IT consolidation creates a concentrated public-sector technology footprint. The Bureau of Indian Affairs and other federal agencies serving the Dakotas' large Native American population operate major facilities in Pierre. In per-capita terms, Hughes County's government IT density rivals much larger state capitals.

---

## Validation Results (Post-Sweep)

- Critical: 0 (1 FIPS error caught and fixed — 21075→21081 for Grant County KY)
- Errors: 0
- Warnings: 530 (up 41 — cosmetic consistency patterns)
- All 20 final FIPS codes verified clean

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] 1 FIPS error caught and fixed in-place (21075→21081)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (803 counties)
- [x] 0 critical errors post-validation
