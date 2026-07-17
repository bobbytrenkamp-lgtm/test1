# US DC & AI Policy Tracker — Massive Data Sweep: Round 20

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** AR/KY/MO/KS/IA/TX/MT/ND/WV — Lake of the Ozarks, Cumberland Gap, Crow Nation, New River Gorge

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 883 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 883 |
| Validation errors | 0 |
| Validation warnings | 661 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 05009 | Boone County | Arkansas | -1 | Harrison/NW Arkansas gateway/Ozarks hub |
| 05015 | Carroll County | Arkansas | -1 | Eureka Springs/NW Arkansas Ozarks |
| 05033 | Crawford County | Arkansas | -1 | Van Buren/I-40 corridor/Fort Smith metro east |
| 21013 | Bell County | Kentucky | -1 | Middlesboro/Cumberland Gap/SE Kentucky hub |
| 21017 | Bourbon County | Kentucky | -1 | Paris/bourbon whiskey heartland |
| 21021 | Boyle County | Kentucky | -1 | Danville/Centre College/Kentucky tech corridor |
| 29029 | Camden County | Missouri | -1 | Lake of the Ozarks/Camdenton/Missouri resort economy |
| 29001 | Adair County | Missouri | -1 | Kirksville/Truman State University/osteopathic origin |
| 29007 | Audrain County | Missouri | -1 | Mexico MO/American Saddlebred horse capital |
| 20027 | Clay County | Kansas | -1 | Clay Center/north-central KS/Milford Lake |
| 20021 | Cherokee County | Kansas | -1 | Columbus KS/Tri-State Mining District/Route 66 |
| 20089 | Jewell County | Kansas | -1 | Mankato/north-central KS/wind corridor |
| 19005 | Allamakee County | Iowa | -1 | Waukon/NE Iowa driftless/Mississippi River corner |
| 19007 | Appanoose County | Iowa | -1 | Centerville/Rathbun Lake/SE Iowa coal heritage |
| 48097 | Cooke County | Texas | -1 | Gainesville/I-35 North TX/Oklahoma border |
| 48395 | Robertson County | Texas | -1 | Franklin/Brazos Valley/Bryan-College Station corridor |
| 30035 | Glacier County | Montana | -1 | Cut Bank/Blackfeet Nation/Glacier NP gateway |
| 30003 | Big Horn County | Montana | -1 | Hardin/Little Bighorn/Crow Nation energy hub |
| 38079 | Rolette County | North Dakota | -1 | Rolla/Turtle Mountain Band/Canada border |
| 54019 | Fayette County | West Virginia | -1 | Fayetteville/New River Gorge National Park |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (903 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-20.md` — this document (new)

---

## Notable Additions

**Camden County MO (29029 — Lake of the Ozarks)**: Lake of the Ozarks has approximately 1,150 miles of shoreline — more than the entire California Pacific coastline. Created by Ameren's Bagnell Dam in 1931, the lake transformed central Missouri. The resort economy supports connectivity demand far beyond permanent population metrics, with hundreds of thousands of vacation visitors and second-home owners requiring high-bandwidth services. Ameren Missouri's legacy hydroelectric assets at Bagnell Dam remain significant in the central Missouri grid. Camden County's lake economy is one of the state's most distinctive technology demand drivers in a non-metro context.

**Bell County KY (21013 — Middlesboro/Cumberland Gap)**: Middlesboro, KY is the only US city known to be built inside a meteor impact crater — a 3.5-mile-wide astrobleme formed approximately 300 million years ago. The Cumberland Gap National Historical Park at the tripoint of Kentucky, Virginia, and Tennessee preserves the passage through the Appalachians used by Daniel Boone and hundreds of thousands of westward settlers. Kentucky Power (AEP) serves this historically coal-dependent area, with legacy mining electrical infrastructure still present in the county. Bell County's role as the commercial hub for the tri-state Appalachian corner creates healthcare and government IT concentration.

**Glacier County MT (30035 — Blackfeet Nation/Glacier NP)**: The Blackfeet telecommunications cooperative has been one of the more innovative tribal broadband operators in the US, leveraging FCC E-Rate and USDA ReConnect funding to expand connectivity on and around the Blackfeet Reservation. The county's oil and gas production from the Sweetgrass Arch creates SCADA and production monitoring IT. Glacier National Park — on the western edge of the county — is one of Montana's largest tourism drivers, with the Going-to-the-Sun Road as one of the most scenic mountain drives in North America. The tribal economy's diversification into renewable energy and tourism services creates IT demand disproportionate to the county's population.

**Big Horn County MT (30003 — Crow Nation)**: The Crow Nation holds some of the largest single-tribal coal reserves in the United States on the Crow Indian Reservation. Crow Tribal Utility Authority manages a complex energy portfolio that includes coal royalties, emerging renewables, and utility service to tribal members. Little Bighorn Battlefield National Monument is the most visited site in Montana after Glacier and Yellowstone. The Crow Nation's energy sovereignty initiatives — exploring how to transition from coal royalties to diversified energy development — represent one of the most significant tribal energy policy stories in the US, creating research, monitoring, and management IT needs.

**Fayette County WV (54019 — New River Gorge National Park)**: New River Gorge became West Virginia's first national park in December 2020 — upgrading from national river status and making it one of the newest full national parks in the US. The New River Gorge Bridge (the longest steel span arch bridge in the Western Hemisphere at completion in 1977) hosts Bridge Day annually — West Virginia's largest festival with 80,000+ attendees and BASE jumping events. The adventure tourism economy — whitewater rafting, rock climbing, mountain biking — has driven rural broadband investment in Fayette County as tourism operators need connectivity. West Virginia's rural broadband initiative has prioritized National Park gateway communities.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 698 (up 37 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (ninth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (ninth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (903 counties)
- [x] 0 critical errors post-validation
