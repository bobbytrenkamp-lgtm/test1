# US DC & AI Policy Tracker — Massive Data Sweep: Round 23

**Sweep Date:** 2026-07-17  
**Conducted By:** Claude Code (claude-sonnet-4-6)  
**Branch:** claude/us-datacenter-restrictions-map-skooi7  
**Scope:** ND/CO/WI/KY/TX/MO/IA/MN/VA — Aspen, Century Aluminum, Brewster largest TX county, Appomattox surrender site

---

## Baseline (Pre-Sweep)

| Metric | Count |
|---|---|
| County restriction records | 943 |
| States in state_regulations.json | 51 (50 + DC) |
| Unique FIPS codes | 943 |
| Validation errors | 0 |
| Validation warnings | 766 |

---

## Phase 9 — Data Integration

### Records Added

**County restrictions (restrictions_raw.json):** 20 net new entries (20 added, 0 FIPS errors, 0 removed)

| FIPS | Name | State | Level | Theme |
|---|---|---|---|---|
| 38025 | Dunn County | North Dakota | -1 | Killdeer/Bakken western ND oil patch |
| 38009 | Bottineau County | North Dakota | -1 | Bottineau/International Peace Garden |
| 38029 | Emmons County | North Dakota | -1 | Linton/south-central ND/Standing Rock adjacent |
| 08117 | Summit County | Colorado | -1 | Breckenridge/Keystone/ski resort tech hub |
| 08045 | Garfield County | Colorado | -1 | Glenwood Springs/Piceance oil/I-70 mountain corridor |
| 08097 | Pitkin County | Colorado | -1 | Aspen/Aspen Institute/global leadership enclave |
| 55005 | Barron County | Wisconsin | -1 | Rice Lake/NW Wisconsin commercial hub |
| 55051 | Iron County | Wisconsin | -1 | Hurley/Gogebic Iron Range/UP border mining legacy |
| 55053 | Jackson County | Wisconsin | -1 | Black River Falls/Ho-Chunk Nation/tribal broadband |
| 21133 | Letcher County | Kentucky | -1 | Whitesburg/Appalshop/eastern KY coal |
| 21183 | Ohio County | Kentucky | -1 | Hartford/western KY coal belt/Green River |
| 21091 | Hancock County | Kentucky | -1 | Hawesville/Century Aluminum smelter/Ohio River industrial |
| 48043 | Brewster County | Texas | -1 | Alpine/Big Bend NP/largest Texas county/Trans-Pecos |
| 29135 | Moniteau County | Missouri | -1 | California MO/US-50 mid-Missouri corridor |
| 19009 | Audubon County | Iowa | -1 | Audubon/west Iowa agricultural corridor |
| 19023 | Butler County | Iowa | -1 | Allison/north-central Iowa/Shell Rock River hub |
| 27005 | Becker County | Minnesota | -1 | Detroit Lakes/NW MN resort lakes/White Earth Nation |
| 27043 | Faribault County | Minnesota | -1 | Blue Earth/Green Giant legacy/south MN wind corridor |
| 51011 | Appomattox County | Virginia | -1 | Appomattox Court House NHP/Civil War surrender site |
| 51117 | Mecklenburg County | Virginia | -1 | South Hill/Kerr Reservoir/southside VA data center corridor |

---

## Phase 10 — Documentation

Files changed:
- `data/restrictions_raw.json` — 20 net new county records
- `data/map_data.json` — regenerated (963 counties)
- `AI_CHANGELOG.md` — sweep entry added
- `docs/data-sweeps/2026-07-massive-sweep-round-23.md` — this document (new)

---

## Notable Additions

**Hancock County KY (21091 — Century Aluminum/Hawesville)**: Primary aluminum smelting is one of the most electricity-intensive industrial processes in existence — a smelter of Century Aluminum's scale consumes hundreds of megawatts continuously, 24 hours a day. Kentucky Utilities provides power under long-term industrial contracts specifically structured to support Hancock County's extraordinary baseload demand. The Ohio River provides both cooling water and barge access for alumina and aluminum shipments. In a county of only 9,000 people, the smelter's power draw creates electrical grid infrastructure scaled for a small city, with all the associated SCADA, process control, and industrial IT that heavy manufacturing requires.

**Pitkin County CO (21097 — Aspen/Aspen Institute)**: Pitkin County has the highest median home price of any US county in most years. The Aspen Institute — a leading global think tank and leadership forum — and the Aspen Ideas Festival annually convene the world's top technology executives, policymakers, and investors in Aspen. Other Aspen-based gatherings (Health Ideas, Security Forum, Tech Policy Hub) reinforce the county's status as a convening point for consequential technology decisions. The ultra-high-bandwidth connectivity demands of Aspen's globally connected resident and visitor base have made Holy Cross Energy and private providers prioritize fiber infrastructure in this mountain enclave.

**Brewster County TX (48043 — Alpine/Big Bend)**: At 6,193 square miles, Brewster County is larger than Connecticut and Rhode Island combined — making it the largest county in Texas and one of the largest in the contiguous US. Sul Ross State University in Alpine provides higher education for a vast Trans-Pecos region that stretches hundreds of miles in every direction. Big Bend National Park occupies the southern portion of the county and generates National Park Service administrative IT and USBP surveillance infrastructure. Rio Grande Electric Cooperative's challenge of electrifying this enormous, remote territory has produced innovative rural electrification solutions that serve as a model for remote area IT infrastructure.

**Mecklenburg County VA (51117 — Southside VA Data Center Corridor)**: Mecklenburg County, along with adjacent Halifax and Brunswick counties in southside Virginia, has emerged as an area of active data center development consideration. Dominion Energy's data center incentive program covers this region, and the low land costs, available power infrastructure from Kerr Reservoir hydroelectric generation, and rail access have attracted developer interest. The county's proximity to the growing Research Triangle Park market in North Carolina (~75 miles south) adds to its data center location profile.

**Faribault County MN (27043 — Blue Earth/Green Giant Legacy)**: The Jolly Green Giant mascot was created for the canning operations in Blue Earth, Minnesota — which branded their sweet corn and peas under the brand that became Green Giant (now B&G Foods). The 55-foot statue of the Green Giant in Blue Earth is one of the Midwest's most distinctive roadside attractions. The county's food processing heritage created industrial IT for canning operations. More recently, southern Minnesota's strongest wind corridor overlays Faribault County, creating substantial renewable energy infrastructure and grid management complexity in what is otherwise a quiet agricultural county.

---

## Validation Results (Post-Sweep)

- Critical: 0
- Errors: 0
- Warnings: 798 (up 32 — cosmetic consistency patterns)
- All 20 FIPS codes verified clean on first validation run (twelfth consecutive clean round)

---

## Confirmation Checklist

- [x] Existing records not deleted or overwritten
- [x] No exact duplicates introduced
- [x] No FIPS errors (twelfth consecutive clean validation run)
- [x] All new records level=-1 (favorable/no restrictions)
- [x] All JSON validated before commit
- [x] process_data.py regenerated map_data.json (963 counties)
- [x] 0 critical errors post-validation
