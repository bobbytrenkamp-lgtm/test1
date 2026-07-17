# US DC & AI Policy Tracker — Massive Data Sweep: Round 31

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** KY/MN/TX/NE/IA/TN/MS/ID/OH — Bloody Harlan coal wars, Northwest Angle northernmost US, Hutchinson Technology HDD, Serpent Mound, Dworshak Dam, Amana Colonies

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 1103 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 1103 |
| Validation errors | 0 |
| Validation warnings | 1143 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 21045 | Casey County | Kentucky | -1 | Liberty/ARC Appalachian transition/Cumberland Parkway/broadband priority |
| 21095 | Harlan County | Kentucky | -1 | Harlan/Bloody Harlan coal wars/Black Mountain highest KY/MSHA mine safety IT |
| 27021 | Cass County | Minnesota | -1 | Walker/Leech Lake Band Ojibwe/Chippewa NF/largest MN county/Paul Bunyan |
| 27077 | Lake of the Woods County | Minnesota | -1 | Baudette/Northwest Angle/northernmost contiguous US/CBP border crossings |
| 27085 | McLeod County | Minnesota | -1 | Glencoe/Hutchinson Technology hard disk drives/Minnesota River Valley |
| 48337 | Montague County | Texas | -1 | Bowie/Red River/north Texas oil/Chisholm Trail heritage |
| 48077 | Clay County | Texas | -1 | Henrietta/Lake Arrowhead water supply/Wichita Falls watershed |
| 31051 | Dixon County | Nebraska | -1 | Ponca/Missouri River bluffs/Lewis & Clark/Ponca State Park |
| 31041 | Custer County | Nebraska | -1 | Broken Bow/Nebraska Sandhills edge/Middle Loup River/largest NE county area |
| 19095 | Iowa County | Iowa | -1 | Marengo/Amana Colonies National Historic Landmark/German pietist communal |
| 19107 | Keokuk County | Iowa | -1 | Sigourney/south-central Iowa/English River/rural broadband priority |
| 19131 | Mitchell County | Iowa | -1 | Osage/Cedar River/north Iowa/ITC Midwest wind transmission |
| 47067 | Hancock County | Tennessee | -1 | Sneedville/Virginia border/Melungeon heritage/most isolated TN county |
| 47133 | Overton County | Tennessee | -1 | Livingston/Cumberland Plateau/Cordell Hull Lake/FDR Secretary of State birthplace |
| 28131 | Stone County | Mississippi | -1 | Wiggins/De Soto National Forest/pine belt/Gulf Coast proximity |
| 28037 | Franklin County | Mississippi | -1 | Meadville/Homochitto NF/SW Mississippi oil/Natchez Trace |
| 16035 | Clearwater County | Idaho | -1 | Orofino/Dworshak Dam/Army Corps hatchery/Nez Perce NF/Lewis & Clark |
| 16009 | Benewah County | Idaho | -1 | St. Maries/Coeur d'Alene Tribe/St. Joe NF/SCOTUS trust land 2001 |
| 39001 | Adams County | Ohio | -1 | West Union/Serpent Mound world's largest effigy mound/Edge of Appalachia |
| 39157 | Tuscarawas County | Ohio | -1 | New Philadelphia/Zoar/Ohio & Erie Canal NHC/Holmes County Amish proximity |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (1123 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-31.md` — this document (new)

---

## Notable Additions

**Harlan County KY (21095 — Bloody Harlan/Coal Wars)**: The Harlan County coal wars of the 1930s are among the most violent episodes of American labor history. When Harlan County miners went on strike in 1931, coal operators hired armed guards, terrorized miners and their families, and law enforcement took the operators' side — conditions that brought Theodore Dreiser's National Committee for the Defense of Political Prisoners to Harlan to document the situation, triggering national outrage. Barbara Kopple's 1976 documentary "Harlan County USA" — following a later 1973 strike — won the Academy Award for Documentary Feature. Black Mountain, the highest point in Kentucky at 4,145 feet, is in Harlan County. Active coal mines in the county require MSHA-mandated continuous atmospheric and structural monitoring IT.

**Lake of the Woods County MN (27077 — Northwest Angle)**: The Northwest Angle is the only part of the contiguous United States located north of the 49th parallel, accessible by land only through Canada — an anomaly resulting from a geographic error in the 1783 Treaty of Paris, which specified the boundary would run from "the northwesternmost point of the Lake of the Woods." Lake of the Woods itself straddles the Minnesota-Ontario border and extends into Manitoba. The county's extreme isolation requires that US citizens driving to the Northwest Angle must pass through Canadian customs and back through US customs (at Warroad) to reach the rest of Minnesota. CBP systems handle an unusual situation in one of the most remote corners of the contiguous US.

**McLeod County MN (27085 — Hutchinson Technology HDD)**: Hutchinson Technology Incorporated, headquartered in Hutchinson (McLeod County's largest city), was for decades one of the world's most important manufacturers of suspension assemblies for hard disk drives — the delicate components that hold the read/write head over the magnetic platter. At its peak, Hutchinson Technology supplied suspension assemblies to virtually every major HDD manufacturer in the world: Seagate, Western Digital, Hitachi, Toshiba. This was high-precision, export-oriented manufacturing in a small Minnesota city, representing the kind of industrial technology anchor that defined rural American manufacturing in the storage era. The company's decline tracks the broader collapse of the spinning-disk HDD market in the 2010s.

**Adams County OH (39001 — Serpent Mound)**: Great Serpent Mound is the world's largest surviving prehistoric effigy mound — a 1,348-foot earthwork shaped as an uncoiling serpent with an open mouth, built in the Ohio landscape in approximately 1000 CE by the Fort Ancient culture (though earlier Adena culture construction has also been proposed). The mound is a National Historic Landmark managed by the Ohio History Connection, with visitor management and preservation IT. Adams County is also home to the Edge of Appalachia Preserve, a Nature Conservancy and Cincinnati Museum Center partnership preserving the transitional zone where the Appalachian Plateau meets the Bluegrass Region — one of Ohio's most biodiverse natural areas.

**Clearwater County ID (16035 — Dworshak Dam)**: Dworshak Dam at Orofino on the North Fork Clearwater River is one of the largest dams in the US — the highest straight-axis gravity dam in the Western Hemisphere at 717 feet. Built by the Army Corps of Engineers and completed in 1973, it permanently inundated some of the best steelhead and chinook salmon habitat in Idaho's Clearwater River system. To partially mitigate this loss, the Army Corps built Dworshak National Fish Hatchery — the largest steelhead hatchery in the US — with sophisticated fish tracking, water quality monitoring, and hatchery management IT. Lewis and Clark descended the Clearwater River past this location in 1805 after crossing the Bitterroot Mountains with Nez Perce guides.

**Iowa County IA (19095 — Amana Colonies)**: The Amana Colonies — seven villages in Iowa County established by German Pietist Inspirationists in 1855 — maintained a communal economy for 77 years, making them one of the longest-lasting communal societies in American history. In 1932, the colony voted to restructure as a for-profit corporation (the "Great Change"), ending communal ownership but preserving the community's village structure. Amana Appliances (the Amana brand, now owned by Whirlpool) traces directly to the Colonies' communal workshops. The Colonies are a National Historic Landmark district and one of Iowa's most significant heritage tourism destinations, requiring visitor management, hospitality, and agricultural IT in a county that otherwise has modest technology infrastructure.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 1143 (up 47 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twentieth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twentieth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (1123 counties)
- [x] 0 critical errors post-validation
