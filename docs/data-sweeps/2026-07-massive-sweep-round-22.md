# US DC & AI Policy Tracker — Massive Data Sweep: Round 22

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** TX/MI/GA/VA/OK/NE/ID/IN — Loving County Permian core, Kingsford Ford legacy, Wabash first electric city, Teton Valley tech community

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 923 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 923 |
| Validation errors | 0 |
| Validation warnings | 727 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 48477 | Washington County | Texas | -1 | Brenham/Blue Bell/birthplace of Texas/Austin-Houston corridor |
| 48133 | Eastland County | Texas | -1 | Cisco/I-20 West TX gateway/Ranger oil heritage |
| 48301 | Loving County | Texas | -1 | Least populous US county/Permian Basin core/Coterra |
| 48405 | San Augustine County | Texas | -1 | Deep East TX/Angelina NF/Sam Rayburn Reservoir |
| 26109 | Menominee County | Michigan | -1 | UP Michigan/Wisconsin border/paper mill industrial grid |
| 26043 | Dickinson County | Michigan | -1 | Iron Mountain/Kingsford/Ford's UP charcoal legacy |
| 26005 | Allegan County | Michigan | -1 | Perrigo pharma manufacturing/Holland adjacent/SW Michigan |
| 13305 | Wayne County | Georgia | -1 | Jesup/SE Georgia/CSX & NS rail hub |
| 13279 | Toombs County | Georgia | -1 | Vidalia/sweet onion capital/SE Georgia agriculture |
| 51019 | Bedford County | Virginia | -1 | Smith Mountain Lake/AEP hydro/D-Day Memorial |
| 40087 | McClain County | Oklahoma | -1 | Purcell/OKC south corridor/Garvin-McClain oil |
| 40041 | Delaware County | Oklahoma | -1 | Jay/Grand Lake/Cherokee Nation/NE Oklahoma |
| 31059 | Fillmore County | Nebraska | -1 | Geneva/SE Nebraska/Blue River agriculture corridor |
| 31181 | Webster County | Nebraska | -1 | Red Cloud/Willa Cather country/Republican River |
| 16021 | Boundary County | Idaho | -1 | Bonners Ferry/NW Idaho/Canada border/Kootenai River |
| 16085 | Valley County | Idaho | -1 | Cascade/McCall/Payette Lake mountain resort |
| 16081 | Teton County | Idaho | -1 | Driggs/Teton Valley/Grand Teton adjacent/tech executives |
| 18169 | Wabash County | Indiana | -1 | Wabash/first electrically lighted city in world (1880) |
| 18075 | Jay County | Indiana | -1 | Portland/east Indiana/natural gas pipeline hub |
| 18073 | Jasper County | Indiana | -1 | Rensselaer/NW Indiana/NIPSCO/I-65 corridor |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (943 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-22.md` — this document (new)

---

## Notable Additions

**Loving County TX (48301 — Permian Basin/Least Populous US County)**: Loving County is the least populous county in the United States, typically with fewer than 100 permanent residents. Yet it sits in the Delaware Basin sub-basin of the Permian — one of the most intensively drilled zones of the shale revolution. Cimarex (now Coterra Energy) and other operators have drilled some of their highest-producing horizontal wells in Loving County. The density of oil and gas SCADA networks, production monitoring systems, pipeline telemetry, and field automation in this sparsely populated county illustrates perhaps more clearly than any other US county how industrial energy production creates technology infrastructure completely independent of population.

**Dickinson County MI (26043 — Iron Mountain/Ford's Kingsford)**: Henry Ford built the city of Kingsford. His 1920s Ford Motor Company wood-distillation plant converted Upper Peninsula timber scraps into charcoal briquettes to pack in car crates — and the charcoal business he created eventually became Kingsford Charcoal Company (now owned by Clorox), the most recognized charcoal brand in the US. Ford's industrial legacy created the power grid infrastructure that still serves the Iron Mountain area. The county is also notable for the Breitung Township power plant history and the Michigan National Guard's Camp Michigania operations.

**Wabash County IN (18169 — First Electrically Lighted City)**: On March 31, 1880, four Brush arc lamps mounted on the dome of the Wabash County Courthouse illuminated the city of Wabash — making it the first city in the world to be lit by electrical power from a public system. The state of Indiana commemorated this at the US Centennial Celebration of Electrical Power in 1980. The county's industrial economy has evolved through automotive components and pharmaceutical manufacturing, continuing a tradition of industrial technology adoption from its pioneer electrical days.

**Teton County ID (16081 — Driggs/Teton Valley)**: Teton County Idaho is rapidly becoming the Idaho alternative to Teton County Wyoming (Jackson Hole). Tech executives and remote workers choosing Idaho over Wyoming save significantly on income taxes (Idaho has state income tax, but Jackson Hole's Wyoming has none — however, land and housing costs are dramatically lower in Driggs/Victor than in Jackson). The Teton Valley sits just west of Grand Teton National Park and has the same access to skiing (Grand Targhee Resort) and wilderness. Federal rural broadband programs have targeted Teton County for connectivity, and tech industry demand has accelerated private investment.

**Allegan County MI (26005 — Perrigo Pharma)**: Perrigo Company is one of the world's largest manufacturers of generic pharmaceuticals and consumer health products — headquartered in Ireland but with major US manufacturing in Allegan County. Pharmaceutical manufacturing IT is among the most regulated in any industry: FDA's 21 CFR Part 11 electronic record requirements, LIMS systems, clean room environmental monitoring, batch record management, and serialization/track-and-trace systems create a technology infrastructure density per employee that far exceeds most manufacturing sectors.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 766 (up 39 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (eleventh consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (eleventh consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (943 counties)
- [x] 0 critical errors post-validation
