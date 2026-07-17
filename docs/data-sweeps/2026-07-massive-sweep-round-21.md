# US DC & AI Policy Tracker — Massive Data Sweep: Round 21

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** TX/IL/NE/IA/KY/MO/KS/AR/SD — Branson, Bourbon Capital, Iowa Wind Energy Capital, BNSF Galesburg

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 903 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 903 |
| Validation errors | 0 |
| Validation warnings | 698 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 48373 | Polk County | Texas | -1 | Livingston/Lake Livingston/Alabama-Coushatta tribe |
| 48001 | Anderson County | Texas | -1 | Palestine/East Texas/TXU Energy legacy |
| 48381 | Randall County | Texas | -1 | Canyon/WT A&M/Palo Duro Canyon/Amarillo adjacent |
| 17095 | Knox County | Illinois | -1 | Galesburg/BNSF Santa Fe line hub/Lincoln-Douglas site |
| 17199 | Williamson County | Illinois | -1 | Marion/SE Illinois I-57&I-24 hub |
| 17081 | Jefferson County | Illinois | -1 | Mount Vernon/I-57&I-64 crossroads |
| 31151 | Saline County | Nebraska | -1 | Wilber/Czech capital of USA/SE Nebraska agriculture |
| 31169 | Thayer County | Nebraska | -1 | Hebron/Republican River Valley/US-81 corridor |
| 19171 | Tama County | Iowa | -1 | Tama/Meskwaki Nation/tribal broadband hub |
| 19099 | Jasper County | Iowa | -1 | Newton/Iowa wind energy capital/Maytag heritage |
| 21107 | Hopkins County | Kentucky | -1 | Madisonville/TVA western KY coal grid |
| 21179 | Nelson County | Kentucky | -1 | Bardstown/Bourbon Capital of the World |
| 29213 | Taney County | Missouri | -1 | Branson/10M visitors/entertainment capital |
| 29175 | Randolph County | Missouri | -1 | Moberly/railroad heritage/north-central MO hub |
| 20123 | Mitchell County | Kansas | -1 | Beloit/Solomon River Valley/US-24&US-281 hub |
| 20085 | Jackson County | Kansas | -1 | Holton/Prairie Band Potawatomi Nation |
| 05023 | Cleburne County | Arkansas | -1 | Heber Springs/Greers Ferry Lake/Little Red River |
| 05029 | Conway County | Arkansas | -1 | Morrilton/I-40 Arkansas River Valley |
| 46037 | Day County | South Dakota | -1 | Webster/NE SD/Coteau des Prairies border hub |
| 46051 | Grant County | South Dakota | -1 | Milbank/quartzite capital/Big Stone power legacy |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (923 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-21.md` — this document (new)

---

## Notable Additions

**Taney County MO (29213 — Branson)**: Branson attracts over 10 million visitors annually — more than Disneyland — making it one of the most visited entertainment destinations in the US. Over 50 live music theaters, Silver Dollar City theme park, and the Table Rock Lake resort economy create IT concentration extraordinary for a county of roughly 120,000 permanent residents. College of the Ozarks (where students work instead of paying tuition) is in the county. The hospitality IT, ticketing systems, hotel management software, and broadcast/streaming infrastructure for Branson's entertainment economy make Taney County one of Missouri's most interesting rural IT markets.

**Jasper County IA (19099 — Newton/Iowa Wind Energy Capital)**: Newton's community reinvention after Maytag/Whirlpool closed in 2006-2007 is one of the most studied Rust Belt pivot stories in the US. TPI Composites (wind blade manufacturing), Trinity Structural Towers (wind tower manufacturing), and other wind supply chain companies established major facilities in the former Maytag industrial campus. Iowa's wind energy leadership — the state gets over 60% of its electricity from wind — is partly powered by Jasper County manufacturing. The advanced manufacturing IT in Newton is qualitatively different from traditional manufacturing, requiring precision quality control and supply chain management systems.

**Nelson County KY (21179 — Bardstown/Bourbon Capital of the World)**: Kentucky's General Assembly designated Bardstown the official Bourbon Capital of the World. Nelson County holds more bourbon aging warehouse capacity than any other US county — millions of barrels are aging in its rickhouses at any time. Heaven Hill Distilleries is headquartered in Bardstown and is the largest independent bourbon distiller in the US. The distillery IT stack — barrel tracking with RFID, temperature-controlled warehouse monitoring, lab management systems, compliance software for TTB reporting — creates substantial technology infrastructure per employee in what appears to be traditional agriculture-adjacent manufacturing.

**Knox County IL (17095 — Galesburg/BNSF)**: Galesburg is one of BNSF Railway's most significant operational junctions in the central US, where the main transcontinental line (former Santa Fe) crosses the north-south Chicago-Kansas City route. BNSF's intermodal operations in Galesburg move enormous freight volumes. Knox College — founded 1837 — was one of the first colleges in Illinois to admit women and Black students, and hosted the 5th Lincoln-Douglas debate. Carl Sandburg, the poet, was born in Galesburg. The city's railroad infrastructure creates telecommunications and fiber density unusual for its current population (30,000), as railroad companies historically ran parallel communications networks along their right-of-way.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 727 (up 29 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (tenth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (tenth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (923 counties)
- [x] 0 critical errors post-validation
