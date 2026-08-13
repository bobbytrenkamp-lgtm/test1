# Data Coverage

**Generated file — do not edit by hand.**
Run `python3 data/generate_data_catalog.py` to regenerate.
Declared metadata (sources, URLs, known issues) lives in `data/catalog/dataset_registry.json`.

> record_count, ui_consumed, ci_tested, and automated_update_workflows are computed from the current repository state every run. Everything else (source_org, source_url, license, known_coverage_holes, known_quality_issues) is declared once in dataset_registry.json and requires a human to update when it changes. A dataset with has_data:false means this repository currently holds zero records for it, whatever the engine built to consume it can do.

## Totals

| | |
|---|---|
| Datasets catalogued | 30 |
| Datasets with actual data (has_data) | 20 |
| Datasets wired into the production UI | 11 |
| Datasets with dedicated CI coverage | 6 |
| Datasets on an automated refresh workflow | 17 |

## Refresh cadence (computed from each workflow's own cron schedule, not declared)

| Cadence | Datasets |
|---|---|
| daily | 1 |
| hourly | 1 |
| monthly | 2 |
| none | 1 |
| not_automated | 13 |
| weekly | 12 |

## By category

| Category | Datasets | With data | Total records | UI-consumed | Automated |
|---|---|---|---|---|---|
| ASSESSMENT | 1 | 0 | 0 | 0 | 0 |
| DATA CENTERS | 2 | 2 | 4,465 | 1 | 1 |
| ECONOMIC DATA | 2 | 2 | 14 | 0 | 0 |
| FIBER | 4 | 0 | 0 | 1 | 1 |
| FLOOD | 1 | 0 | 0 | 1 | 0 |
| INTERCONNECTION QUEUES | 1 | 1 | 36,425 | 0 | 1 |
| ISO/RTO | 1 | 1 | 94 | 0 | 1 |
| NEWS | 1 | 1 | 600 | 1 | 1 |
| PARCELS | 3 | 3 | 89,672 | 1 | 3 |
| POLICY/REGULATION | 2 | 2 | 1,579 | 1 | 2 |
| POWER PLANTS | 1 | 1 | 1,290 | 0 | 1 |
| PROTECTED LAND | 1 | 0 | 0 | 0 | 0 |
| RAIL | 1 | 0 | 0 | 0 | 0 |
| ROADS | 1 | 0 | 0 | 0 | 0 |
| SUBSTATIONS | 1 | 1 | 53,826 | 1 | 1 |
| TRANSMISSION | 1 | 1 | 1,892 | 1 | 1 |
| UTILITY TERRITORIES | 1 | 1 | 6 | 1 | 1 |
| WASTEWATER | 1 | 1 | 18,885 | 0 | 1 |
| WATER | 1 | 1 | 79 | 1 | 1 |
| WATER INFRASTRUCTURE | 1 | 1 | 44,612 | 0 | 0 |
| WETLANDS | 1 | 0 | 0 | 0 | 0 |
| ZONING | 1 | 1 | 1 | 1 | 1 |

## Every dataset

`has_data: false` means an engine or architecture may exist for this dataset, but the repository currently holds zero real records for it — see `known_coverage_holes` for why.

### ASSESSMENT

**Parcel assessment/sales/ownership (via multi-source enrichment)** (parcel_assessment_sales_ownership) — ⛔ no data

- Records: 0
- Source: County CAMA/assessor services (per jurisdiction, joined by the enrichment engine)
- Geographic scope (declared): 0 of 58 production jurisdictions currently declare a live enrichment source
- Update frequency (declared): live, per parcel fetch, where configured
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** ENGINE EXISTS, ZERO PRODUCTION DATA. js/parcel/enrichment.js and enrichment-arcgis-table.js are built and tested (89 + 47 assertions), and data/parcel_pipeline/discover_enrichment.mjs can find and empirically verify CAMA join candidates — but no registry.js entry has an enrichment block yet, because this session's sandbox could not reach county GIS hosts to run the discovery workflow. The pilot PR (Loudoun/Prince William/Fairfax VA) is unblocked but unexecuted.

### DATA CENTERS

**Facility index (production, map-consumed)** (data_centers) — ✅ has data

- Records: 4455
- Source: Multiple (see facility_sources.json)
- Geographic scope (declared): United States
- Update frequency (declared): weekly (update_facilities.yml)
- Authoritative: False
- UI-consumed: True
- CI-tested: True
- Automated update workflow(s): update_facilities.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** Below the ~6,000-facility target discussed for a comprehensive national census. No explicit campus→building parent/child hierarchy yet — campus_total_mw and campus_size_acres exist as flat per-record fields, so a multi-building campus is not guaranteed to be modeled as one entity with children.
- **Known quality issues:** Locations are approximate (city-level accuracy per the dataset's own disclaimer); capacity figures are publicly reported estimates that may be stale.

**Facility pipeline source registry** (facility_sources) — ✅ has data

- Records: 10
- Source: OSM Overpass, DataCenterMap, Equinix, Digital Realty, FERC, SEC EDGAR, hyperscaler press feeds
- Geographic scope (declared): United States
- Update frequency (declared): weekly, per-source
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** Only 8 sources configured; no state PUC filings, no CBRE/JLL/Datacenter Dynamics market reports (paid or ToS-restricted).
- **Known quality issues:** Confidence tiers are self-declared per source, not independently audited.

### ECONOMIC DATA

**Census County Business Patterns + County demographic/economic indicators** (economic_census) — ✅ has data

- Records: 8
- Source: US Census Bureau
- Geographic scope (declared): United States, county-level
- Update frequency (declared): per update_economic_data.yml schedule
- Authoritative: True
- UI-consumed: False
- CI-tested: True
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_

**FRED macroeconomic series** (fred_data) — ✅ has data

- Records: 6
- Source: Federal Reserve Bank of St. Louis (FRED)
- Geographic scope (declared): National/state series
- Update frequency (declared): per update_economic_data.yml schedule
- Authoritative: True
- UI-consumed: False
- CI-tested: True
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_

### FIBER

**Fiber routes (none — removed)** (fiber_network) — ⛔ no data

- Records: 0
- Source: Hand-authored, not sourced from any carrier or public fiber-route dataset
- Geographic scope (declared): None. The 3 fabricated entries this dataset used to hold were removed.
- Update frequency (declared): manual
- Authoritative: False
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** REMEDIATED. This dataset used to hold 3 hardcoded named routes ("Zayo Northern Virginia Dark Fiber Ring", "Lumen/CenturyLink Iowa Backbone", "Zayo Pacific NW Fiber Route") with hand-typed coordinate paths attributed to real carriers with no evidence. They were removed rather than kept as "illustrative" -- attributing an invented path to a named company by name is a fabrication risk a map tooltip disclaimer does not resolve. No free, reliable, NATIONWIDE fiber-route dataset is known to exist (see js/parcel/proximity-layers.js's fiber registerUnavailable(), which this file still matches). data/validate_sources.py and tests/test_fiber_network_honesty.py now require any future entry to carry a real, checked source URL before it may name a carrier.

**California middle-mile broadband corridor alignment (SCAG region only)** (ca_middle_mile_corridor) — ⛔ no data

- Records: 0
- Source: California Public Utilities Commission (CPUC), republished by SCAG (Southern California Association of Governments)
- Source URL: https://maps.scag.ca.gov/scaggis/rest/services/Broadband/Broadband/MapServer/2/query
- Geographic scope (declared): REGIONAL ONLY — the SCAG six-county area (Los Angeles, Orange, Riverside, San Bernardino, Ventura, Imperial). No coverage anywhere else in the country.
- Update frequency (declared): live (queried per-parcel bounding box at analysis time, no local cache)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** ENGINE EXISTS, LIVE, WIRED (verified 2026-08-09 via a real GitHub Actions dispatch against maps.scag.ca.gov -- confirmed MapServer layer 2 ('CPUCAnchorBuilds') returns real polyline features with ROUTE/ROUTE_ID/ALIGNMENT/STATUS/MILES_GIS/BB4ALL_ID fields). This is the first regional (not nationwide) fiber-adjacent dataset in the repository, wired into js/parcel/proximity-layers.js as 'ca-middle-mile-corridor'. It does NOT replace the nationwide 'fiber' registerUnavailable() -- that stays unavailable because no free nationwide as-built fiber dataset exists; this is a narrower, honestly-scoped regional addition, not a broader claim. A same-tier Maryland candidate (OMBN, the state's own as-built inter-county fiber network, https://geodata.md.gov/appdata/rest/services/OMBN/MD_OneMarylandBroadbandNetwork/MapServer/0) was dispatched twice on a real GitHub Actions runner and returned HTTP 503 both times -- not wired in, left as an open candidate for re-probing later rather than guessed working.
- **Known quality issues:** This is a PLANNED/SELECTED middle-mile corridor alignment (CPUC's own shapefile of where it intends to build, tied to the state's Federal Funding Account broadband initiative), not confirmed as-built, in-service lit fiber -- a materially weaker claim than 'fiber exists here', and the layer's own measures text says so explicitly. STATUS/YEAR field values were not individually decoded (no live sample-value inspection was performed, only field names/types via ogrinfo -so); a reader should treat STATUS as informational, not authoritative, without further confirmation from CPUC or the carrier.

**Texas Fiberlight fiber network (TxDOT-published, TX only)** (tx_fiberlight_network) — ⛔ no data

- Records: 0
- Source: Fiberlight (commercial dark-fiber carrier), published via TxDOT's ArcGIS hosted feature service
- Source URL: https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/Fiberlight_Network/FeatureServer/0/query
- Geographic scope (declared): REGIONAL ONLY -- Texas. The service's own distinct-Market probe (2026-08-12) returned 9 real markets: AUS, DFW, ELP, HOU, PAN, SAN, STX, WAC, WTX. No coverage anywhere else in the country.
- Update frequency (declared): live (queried per-parcel bounding box at analysis time, no local cache); the underlying TxDOT service's own description says the data itself is a dated snapshot, not continuously refreshed (see known_quality_issues).
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** ENGINE EXISTS, LIVE, WIRED (verified 2026-08-12 via three real GitHub Actions dispatches: round 1 discovered the service by scanning TxDOT's full hosted-org service directory for fiber/conduit/broadband keyword matches; round 2 confirmed its serviceDescription ('Selected Fiberlight Network clip received on 3/15/22'), a real record count of 8,106, and the 9 real distinct Market values; round 3 confirmed the exact f=geojson bbox query shape the production provider uses returns real LineString features (40 in a real Houston bbox) with populated CABLE_NAME/USED_FOR/INVENTORY_/PLACEMENTT/FIBERCOUNT attributes. Wired into js/parcel/proximity-layers.js as 'tx-fiberlight-network'. It does NOT replace the nationwide 'fiber' registerUnavailable() -- that stays unavailable because no free nationwide as-built fiber dataset exists; this is a second, narrower, honestly-scoped regional addition (Texas), alongside the existing California middle-mile corridor. Two other TxDOT-org candidates found in the same round-1 scan were evaluated and rejected: TxDOT_Statewide_Connectivity_Corridors (real live layer, 559 records, but its actual description confirms it is a highway-funding-eligibility corridor network -- Texas Trunk System/NHS/freight routes for Category 4 funding -- not a fiber or telecom dataset despite the word 'Connectivity' in its name) and Memphis, TN's municipal fiber lines inventory (FeatureServer returned an auth/access error, not real data). Arizona ADOT's published fiber-and-conduit-along-I-17/I-19/I-40W assets (a real, described physical asset per ADOT's own broadband-office page) were investigated but no queryable REST service exposing them was found -- ADOT's own GIS services directory and its 'Utilities' folder (round 2's targeted follow-up check) contain only generic GeometryServer/GPServer utility tools, and the broader AZGEO statewide GIS directory scan also produced no fiber/conduit keyword match. Left as an open, unresolved candidate (documented here, not guessed) rather than fabricated or silently dropped, matching the existing Maryland OMBN precedent above.
- **Known quality issues:** This is ONE CARRIER'S network (Fiberlight), not an exhaustive map of Texas fiber -- other carriers (AT&T, Lumen, Zayo, etc.) may also serve the same area with no representation here, so absence of a nearby result is not evidence of no fiber access. The data is explicitly a dated snapshot per the source service's own description ('clip received on 3/15/22'), not continuously refreshed -- segments built, retired, or re-routed since then will not be reflected. USED_FOR carries 11 real distinct values (BACKBONE, CUSTOMER LATERAL, JUMP, LATERAL, Lateral, PIGTAIL, RISER, STUB, TIECABLE, Virtual, 'third party lit only'), so the presence of a segment does not by itself mean backbone capacity is available there -- USED_FOR is passed through in feature properties but not filtered, consistent with this project's general policy of disclosing rather than silently filtering ambiguous sub-categories (mirroring the substations TYPE-disclosure precedent, except that layer DOES filter server-side on TYPE='SUBSTATION' for scoring purposes -- this layer does not filter USED_FOR, since 'nearest fiber segment' is a weaker, purely-locational claim, not an interconnection-readiness claim).

**FCC broadband fiber availability by county** (fcc_broadband_fiber_pct) — ⛔ no data

- Records: 0
- Source: FCC National Broadband Map / Broadband Data Collection (BDC)
- Source URL: https://broadbandmap.fcc.gov/home
- Geographic scope (declared): United States, county-level, if the fetcher succeeds
- Update frequency (declared): n/a — currently non-functional
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** NOT CURRENTLY WORKING. fetch_infrastructure.py's fetch_fiber_coverage() targets an FCC county endpoint that now requires a registered API token this adapter does not send (HTTP 405/token error, documented in the script). Even if fixed, this measures MARKETED RESIDENTIAL BROADBAND AVAILABILITY, not physical long-haul/metro fiber routes or dark-fiber availability — the two must never be conflated, and this dataset should never be labeled as 'fiber infrastructure' if revived. A candidate replacement was investigated 2026-08-09 (live GitHub Actions dispatch against pdi.scinet.usda.gov/hosting/rest/services/Hosted/FCC477andCDL/FeatureServer/0) and rejected: it IS a real, live, queryable county-polygon layer with named provider-count-by-speed-tier fields (providers25398_201906 etc.), but it is a USDA research mirror joining stale June-2019 FCC Form 477 data with Cropland Data Layer agriculture variables — not an official/current FCC product — several of its fields have no real name (auto-generated f0/f1/f2/f3/f5/f22/f23/f24 by the GeoJSON export) and its meaning could not be confirmed, and Form 477's county table is technology-agnostic (all fixed broadband combined) rather than fiber-specific. Wiring 7-year-stale, partially-unlabeled, non-authoritative data in as 'fiber coverage' would violate this project's source-honesty rules. A genuinely current, official, free source (FCC BDC with a registered no-cost API token, or a verified current ArcGIS Living Atlas mirror) still needs to be found.

### FLOOD

**FEMA National Flood Hazard Layer** (fema_flood) — ⛔ no data

- Records: 0
- Source: FEMA
- Source URL: https://hazards.fema.gov/gis/nfhl/rest/services
- Geographic scope (declared): United States (target)
- Update frequency (declared): live (queried per-parcel bounding box at analysis time, no local cache)
- Authoritative: True
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** ENGINE EXISTS, LIVE, WIRED (verified 2026-08-08 via a real GitHub Actions dispatch against hazards.fema.gov -- confirmed layer 28, real fields FLD_ZONE/ZONE_SUBTY/SFHA_TF/STATIC_BFE). No local record count applies -- this is a live per-parcel query, not stored data, so has_data is reported false even though the wiring is real (see data_catalog ALLOWED_WITH_NO_DATA). FEMA does not map 100% of US counties; an area with no mapped floodplain returns zero intersecting features honestly, indistinguishable at the API level from an area FEMA has simply never studied.
- **Known quality issues:** FEMA flood panels are regulatory products of varying age -- many effective panels are a decade or more old. See the caveat text in constraint-layers.js.

### INTERCONNECTION QUEUES

**Generator interconnection queue positions** (interconnection_queues) — ✅ has data

- Records: 36425
- Source: Lawrence Berkeley National Laboratory (LBNL) "Queued Up" -- compiled from 7 ISO/RTOs and 50+ non-ISO balancing areas, ~98% of US generating capacity
- Source URL: https://emp.lbl.gov/queues
- Geographic scope (declared): National
- Update frequency (declared): Monthly (data/national_data_ingestion/interconnection_queue.py via update_interconnection_queue.yml)
- Authoritative: True
- UI-consumed: False
- CI-tested: True
- Automated update workflow(s): update_interconnection_queue.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): monthly
- **Known coverage holes:** RESOLVED 2026-08-12 (was declared but never actually fetched): verified via a real GitHub Actions dispatch (run 31556489776) -- 38,201 real rows in the source workbook, 36,425 usable records kept (1,776 excluded for having no resolvable county location, 0 excluded for missing queue status). Real queue_status distribution: withdrawn 22,863, active 8,423, operational 4,464, suspended 666, unknown 9. 2,633 distinct counties represented. The first live dispatch attempt (run 31555581932) crashed on a real production bug -- openpyxl returns a bare float (not a string) for a numeric-looking or NaN cell in what is normally a text column (poi_name and others), which a naive .strip() call cannot handle; fixed in interconnection_queue.py's _str_cell() helper before this successful run. The 'ferc_queue' facility source in facility_sources.json still separately feeds the DATA CENTER pipeline (detecting large-load interconnection requests) -- distinct from this dataset. LBNL publishes county + state text only, never per-project coordinates, so every record's location is a county-level bbox centroid (evidence_tier=MODELED), not the true project site. Records whose county cannot be resolved to a real FIPS centroid are excluded and counted in the output's meta.excluded_no_resolvable_county_location, never silently dropped. The source is behind Cloudflare's managed challenge, so ingestion requires a real headless-browser download (see data/national_data_ingestion/interconnection_queue_download.mjs) rather than a plain HTTP fetch.
- **Known quality issues:** queue_status uses the source's own vocabulary (e.g. active/withdrawn/operational), intentionally distinct from InfrastructureAsset's generic existing/planned/retired status field -- withdrawn (never built) and retired (built, then decommissioned) are different facts.

### ISO/RTO

**Electric planning-authority regions (ISO/RTO + utility balancing areas)** (iso_rto) — ✅ has data

- Records: 94
- Source: HIFLD Electric Planning Areas (FERC 714 / EIA-860 / EIA-861 / Census TIGER-sourced), via a verified no-token HDR Inc. mirror of the pre-shutdown HIFLD Open dataset
- Source URL: https://services5.arcgis.com/HDRa0B57OVrv2E1q/arcgis/rest/services/Electric_Planning_Areas/FeatureServer/0
- Geographic scope (declared): National (94 planning authorities: the 7 major RTOs/ISOs plus every individual utility/municipal/co-op balancing authority)
- Update frequency (declared): Weekly (data/fetch_infrastructure.py --layers iso_rto via update_infrastructure.yml)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** RESOLVED 2026-08-11. EIA's own US Energy Atlas RTO_Regions FeatureServer (services7.arcgis.com/FGr1D95XCGALKXqM) was confirmed dead-end via 6 rounds of live GitHub Actions dispatch: it returns 'Token Required' (ArcGIS error 499) for every access path, including a publicly-discoverable AGOL search result whose own 'url' field points at the same token-gated service -- being discoverable in search does not mean the underlying service is open. The real replacement is HIFLD's 'Electric Planning Areas' layer, found on the SAME no-token HDR Inc. mirror this project already uses for substations/transmission/power plants, confirmed live with a real query (count=94, real field schema: ID/NAME/ABBRV/COUNTRY/NAICS_DESC/SOURCE/YEAR/PEAK_LOAD/PEAK_RANGE/WEBSITE). This is a superset of the 7-region layer originally sought -- every electric planning authority nationwide, not just the 7 largest RTOs/ISOs -- which is more directly useful for site selection (knowing the specific planning authority governing a candidate site's interconnection, not just which of 7 super-regions it falls in).
- **Known quality issues:** PEAK_LOAD/PEAK_RANGE are each authority's own historical system-wide peak (MW), not a per-site available-capacity figure -- being inside a planning authority's boundary says nothing about whether the grid there currently has spare interconnection capacity (see the interconnection queue dataset for that question). Boundaries are the authority's own reported service territory, not always legally precise -- some can overlap or leave small gaps.

### NEWS

**AI/data-center industry news feed** (ai_news) — ✅ has data

- Records: 600
- Source: Multiple public news/press RSS sources (see news_sources.json)
- Geographic scope (declared): National
- Update frequency (declared): per update_ai_news.yml schedule
- Authoritative: False
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_ai_news.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): hourly

### PARCELS

**Parcel service registry (production)** (parcels_registry) — ✅ has data

- Records: 59
- Source: 58 individual county/city GIS departments
- Geographic scope (declared): 58 production jurisdictions, primarily data-center-bearing counties
- Update frequency (declared): live (fetched per map viewport from each jurisdiction's own service)
- Authoritative: True
- UI-consumed: True
- CI-tested: True
- Automated update workflow(s): check_parcel_services.yml, parcel_batch_discovery.yml, parcel_enrichment_discovery.yml, parcel_pr_check.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): monthly
- **Known coverage holes:** Geometry coverage is 58 of ~3,000+ US counties. Most jurisdictions provide geometry + identity only; ownership/assessment/sales/zoning require the multi-source enrichment engine, which currently has zero production jurisdictions with a declared enrichment block.
- **Known quality issues:** Field depth varies enormously by jurisdiction; see data/parcel_coverage_metrics.json for the per-category breakdown this file does not duplicate.

**National multi-jurisdiction site search index (large parcels only)** (national_site_search_index) — ✅ has data

- Records: 89446
- Source: The same 58 county/city GIS departments as parcels_registry, walked in one batch
- Geographic scope (declared): The same 58 wired jurisdictions as parcels_registry -- not every US county, and explicitly labeled as such in the index's own meta.caveat field.
- Update frequency (declared): weekly, scheduled (build_site_search_index.yml)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): build_site_search_index.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** ENGINE EXISTS, LIVE, WIRED (confirmed 2026-08-09 via the first real build_site_search_index.yml dispatch: 86,811 real parcels across 55/58 jurisdictions, 42.2MB; Marion County IN, Montgomery County MD, and Baltimore city MD failed that run and were isolated correctly, not silently dropped). Closes the gap js/parcel/find-sites.js's own header long documented: Find Sites searched only whatever parcels were currently rendered on the map (one county at a time), with no way to search across all wired jurisdictions at once. data/parcel_pipeline/build_national_site_index.mjs walks all 58 registry jurisdictions and server-side-filters each to parcels at or above a configurable acreage threshold (default 5 acres) using each jurisdiction's own already-verified fieldMap.area_acres/area_sqft source field -- no new per-jurisdiction field investigation. 13 of 58 jurisdictions have neither field and are indexed as an unfiltered, capped SAMPLE instead, flagged sizeFiltered:false per-jurisdiction so a reader can tell 'every large parcel in this county' apart from 'an arbitrary sample of this county's parcels'. As of 2026-08-10, data/parcel_pipeline/split_site_search_index.mjs derives data/site_search/manifest.json + data/site_search/states/<ST>.json (31 state partitions) from this same file -- both stay committed (STORE EVERYTHING), but js/parcel/site-search-index.js now fetches only the state(s) a search actually needs instead of this whole 42MB file, with bounded concurrency, an in-memory LRU cache, progress reporting, and AbortController-based cancellation of a superseded search. js/parcel/site-search-index.js reuses PARCEL_SITE_SEARCH.search() UNCHANGED -- no parallel evaluation logic.
- **Known quality issues:** Proximity (transmission/substation/interstate distance) and environmental-constraint (floodplain/wetland) criteria are NOT precomputed in this index -- running those live for every large parcel across 58 jurisdictions would be a far larger, slower live-network job than this one. PARCEL_SITE_SEARCH already answers 'this criterion's data is absent from this candidate' correctly (indeterminate, never a silent pass), so a national-scope search on those criteria returns every parcel as indeterminate rather than a wrong answer -- a user opens a specific matched parcel for live per-parcel proximity/constraint analysis, same as today. Record counts and truncation status per jurisdiction are in the index's own jurisdiction_summaries array, not duplicated here.

**Parcel source catalog (candidates + production + rejected)** (parcel_source_catalog) — ✅ has data

- Records: 167
- Source: Various state/county GIS portals, ArcGIS Hub, ArcGIS Online
- Geographic scope (declared): National discovery queue
- Update frequency (declared): manual dispatch (parcel_batch_discovery.yml, parcel_enrichment_discovery.yml)
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): parcel_pr_check.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): none
- **Known coverage holes:** Candidate entries are catalogued but unverified until promoted to the registry; most entries are still 'candidate' status.
- **Known quality issues:** A catalogued service's geographic coverage is not independently confirmed until a human promotes it — sample-matching a few parcels inside a county is not proof of full-county coverage (see BUG_TRACKER.md's Shorewood/Will County case).

### POLICY/REGULATION

**County-level data-center political risk score** (political_risk) — ✅ has data

- Records: 112
- Source: Derived from restrictions_raw.json + state_regulations tracking (in-house scoring model)
- Geographic scope (declared): 112 counties scored
- Update frequency (declared): per update_political_risk.yml schedule
- Authoritative: False
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_political_risk.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** 112 of ~3,000 counties. This is the index the parcel suitability score's 'policy' component reads.
- **Known quality issues:** A forward-looking risk indicator, not a record of current law — already labeled as such everywhere it is consumed (see js/parcel/suitability.js's policy component rule text).

**Tracked data-center policy restrictions/moratoria** (restrictions_raw) — ✅ has data

- Records: 1467
- Source: State/local legislation and ordinance tracking (government_sources.json registry)
- Geographic scope (declared): 1,467 tracked restriction records
- Update frequency (declared): per monitor_legislation.yml / update_regulations.yml schedule
- Authoritative: True
- UI-consumed: False
- CI-tested: True
- Automated update workflow(s): update_data.yml, update_policy_sources.yml, update_regulations.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): daily

### POWER PLANTS

**Power generation facilities** (power_plants) — ✅ has data

- Records: 1290
- Source: EPA Facility Registry Service (EIA-860 generator data joined with FRS)
- Source URL: https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_PowerPlants/MapServer/12
- Geographic scope (declared): United States (1,295 operating plants across 49 states/territories, as of the first live fetch 2026-08-09; coverage relative to the full EIA-860 fleet has not been independently verified -- this may be a curated FRS subset rather than every operating generator)
- Update frequency (declared): weekly (update_infrastructure.yml, layers=power)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** ENGINE EXISTS, LIVE, WIRED, REAL DATA (1,295 records, 49 states, first populated 2026-08-09 via update_infrastructure.yml). This source has NO nameplate-capacity field of any kind -- plant identity, location, operating status, and primary fuel source are real and populated; capacity_mw is always None, never fabricated. Whether 1,295 represents the full national operating fleet or a curated subset of this FRS layer has not been independently cross-checked against EIA-860 totals.
- **Known quality issues:** Source is one row per GENERATOR, deduplicated to one record per PLANT_CODE by this pipeline -- a plant with many small generators and a plant with one large generator are indistinguishable without capacity data.

### PROTECTED LAND

**USGS Protected Areas Database of the United States** (pad_us_protected_lands) — ⛔ no data

- Records: 0
- Source: USGS
- Geographic scope (declared): United States (target)
- Update frequency (declared): n/a — endpoint not yet verified
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** ENGINE EXISTS, NO DATA. Registered unavailable in js/parcel/constraint-layers.js. Two INDEPENDENT delivery mechanisms have now been live-investigated and both are confirmed non-functional, not merely unguessed: (1) LIVE ARCGIS QUERY (2026-08-09): four real candidate URLs dispatched and confirmed dead/erroring -- gis1.usgs.gov/.../PAD_US_Fee_Topology (HTTP 502), maps4.arcgisonline.com/.../DOI/PAD-US_Land_and_Marine_Protected_Areas (HTTP 503), and the Esri Living Atlas services.arcgis.com/.../USA_Protected_Areas_State FeatureServer (tried with and without a spatial filter -- both times a suspicious ~103-byte response, too small to be real GeoJSON). (2) STATIC SCIENCEBASE DOWNLOAD (2026-08-12, two rounds): USGS's own documented alternate delivery mechanism is per-state static downloads via ScienceBase's public catalog. A real GitHub Actions dispatch found every ScienceBase call -- the catalog search API, a known real PAD-US 2.1 by-State-GeoJSON item (sciencebase.gov/catalog/item/6025985bd34eb12031138e21), and even a plain fetch of sciencebase.gov's own root page used as a domain-reachability control -- timed out identically. Round 2 re-ran with a 90s timeout (up from round 1's 30s) specifically to rule out 'just slow': every call still hung for exactly the full timeout window (30.1s at a 30s timeout, 90.1s at a 90s timeout, across two different Azure runner regions, eastus and westus) rather than completing at some real but slow duration in between -- the signature of a hard network-level block (e.g. ScienceBase filtering traffic from cloud/datacenter IP ranges), not a genuinely slow server. No replacement guessed; both confirmed-dead mechanisms are recorded here rather than one being silently retried forever or a stale/mirrored copy being substituted without disclosure.

### RAIL

**Rail network** (rail) — ⛔ no data

- Records: 0
- Source: _not applicable — no data_
- Geographic scope (declared): _none_
- Update frequency (declared): n/a — not implemented
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** NOT IMPLEMENTED. Deprioritized — rail is a lower-value signal for data center siting than power/fiber/water/road access; noted for completeness per the requested category list.

### ROADS

**Interstate highways for proximity analysis** (roads) — ⛔ no data

- Records: 0
- Source: US Census Bureau (TIGERweb)
- Source URL: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer/2
- Geographic scope (declared): United States
- Update frequency (declared): live (queried per-parcel bounding box at analysis time, no local cache)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** ENGINE EXISTS, LIVE, WIRED (verified 2026-08-09 via a real GitHub Actions dispatch against tigerweb.geo.census.gov -- confirmed layer 2 'Primary Roads', real fields BASENAME/NAME/MTFCC/RTTYP). js/parcel/proximity-layers.js's 'interstates' layer queries this live, filtered server-side to RTTYP='I' so only interstates (not every primary/state road the layer also carries) are returned. No local record count applies -- this is a live per-parcel query, not stored data.
- **Known quality issues:** Straight-line distance to the nearest interstate route only, not drive time or nearest interchange. Local/state highways and other road classes are not queried by this layer even though the same TIGERweb service also carries them.

### SUBSTATIONS

**Electric power substations** (substations) — ✅ has data

- Records: 53826
- Source: HIFLD Electric Substations, via a surviving third-party ArcGIS mirror (HDR Inc., an engineering firm) after DHS's HIFLD Open portal was shut down in August 2025
- Source URL: https://services5.arcgis.com/HDRa0B57OVrv2E1q/arcgis/rest/services/Electric_Substations/FeatureServer/0
- Geographic scope (declared): United States (all 50 states + DC + Puerto Rico confirmed; also touches Guam/N. Mariana Islands/US Virgin Islands but those had zero records surviving the >=69kV filter)
- Update frequency (declared): weekly (update_infrastructure.yml)
- Authoritative: False
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** RESOLVED 2026-08-09 (was CONFIRMED SEVERE, ~25 US records): switched from the dead G4S1dGvn7PIgYd6Y mirror to this HDR mirror, verified via a real live fetch (GitHub Actions run 31323117374) -- 74,922 raw US records, 53,826 kept after the >=69kV filter, across all 50 states + DC + PR. Real per-state counts (>=69kV): AK 133, AL 1822, AR 875, AZ 702, CA 1917, CO 1127, CT 249, DC 17, DE 138, FL 1985, GA 1874, GU 3, HI 67, IA 1043, ID 788, IL 1204, IN 1426, KS 919, KY 1856, LA 833, MA 490, MD 455, ME 178, MI 1079, MN 1855, MO 1315, MS 893, MT 1190, NC 1752, ND 653, NE 910, NH 117, NJ 208, NM 559, NV 296, NY 1465, OH 1204, OK 1831, OR 1321, PA 1339, PR 91, RI 94, SC 1845, SD 698, TN 1396, TX 4460, UT 1269, VA 987, VT 80, WA 1968, WI 1679, WV 455, WY 716. This is a strong, apparently-genuine national layer, not a subset -- but it is a static mirror of a dataset whose origin (HIFLD Open) no longer exists, so there is no confirmed ongoing update cadence behind it; real-world grid changes since the mirror's last refresh will not appear here, and that refresh date is unknown (SOURCEDATE/VAL_DATE fields exist on this mirror's schema but were not fetched by this pass -- a follow-up should pull them to know how stale this really is). ~46.8% of records carry a generic 'UnknownNNNNN'-pattern NAME (a real placeholder value in the source data itself, not fabricated by this pipeline, but it means visual/search identification by name will fail for roughly half of all substations).
- **Known quality issues:** TYPE is passed through unfiltered and is NOT exclusively 'SUBSTATION' -- of the 53,826 kept records, 37,891 are TYPE=SUBSTATION, 15,349 are TYPE=TAP (a transmission-line branch point, not a switching facility), plus small counts of RISER/DEAD END/NOT AVAILABLE. Consumers wanting strictly substations, not taps, must filter on type themselves; this is not done in the fetcher because HIFLD's own convention includes TAP under this same layer and silently dropping it would itself be an undocumented coverage decision. As of 2026-08-12, js/parcel/proximity-layers.js's substations layer (the parcel 'nearest substation' scoring input) does exactly that filtering, so a nearby TAP can no longer satisfy a site's nearest-substation distance; js/map.js's general map rendering deliberately still shows the full unfiltered dataset. STATUS is passed through as-reported (confirmed real enum on this mirror: IN SERVICE 51,786 / NOT AVAILABLE 2,031 / UNDER CONST 9) rather than filtered, since only the schema (not real values) was confirmed before the first live fetch. Schema differs from the original dead HIFLD org (MAX_VOLT/MIN_VOLT instead of one VOLTAGE field, COUNTYFIPS instead of COUNTY_FIPS) -- handled in the adapter, but any future source swap must re-verify field names rather than assume the original schema. As of 2026-08-10, data/split_layer_by_state.py additionally geo-partitions this layer (only this one -- water_systems/wastewater_facilities have zero map consumers today, confirmed by grep, so partitioning them would be premature) into data/layers/power_infrastructure/manifest.json + states/<ST>.json, each state entry carrying a bbox; js/map.js's power layer toggle now fetches only the state(s) intersecting the current map viewport instead of all 53,826 US records, loading newly-panned-into states on moveend and caching previously-seen ones (bounded LRU, 15 states). As of 2026-08-12, every record also carries a real per-record quality_tier ('high'/'medium'/'low') and quality_flags, stamped by fetch_infrastructure.py's classify_substation_quality() from the same TYPE/STATUS/NAME fields described above (a flag for each of: not TYPE=SUBSTATION, not STATUS=IN SERVICE, or a generic UnknownNNNNN NAME) -- real distribution: high 12,339 (22.9%, all three signals clean), medium 39,918 (74.2%, exactly one signal missing -- overwhelmingly a real in-service substation with only a generic name), low 1,569 (2.9%, two or more signals missing). This is a record-completeness classification, not a claim about where the value came from -- every field is directly source-reported, so it deliberately does not reuse the OBSERVED/MODELED/UNKNOWN evidence-tier vocabulary from data/infrastructure_asset_schema.py, which answers a different question. js/map.js renders the tier as marker opacity (dimmer = less-documented) rather than a second color, so the map stays readable at a glance.

### TRANSMISSION

**Electric transmission lines** (transmission_lines) — ✅ has data

- Records: 1892
- Source: HIFLD (Homeland Infrastructure Foundation-Level Data)
- Source URL: https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0
- Geographic scope (declared): United States
- Update frequency (declared): weekly (update_infrastructure.yml)
- Authoritative: True
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** None documented beyond normal HIFLD reporting lag.
- **Known quality issues:** None currently documented; this HIFLD endpoint has stayed live (see fetch_infrastructure.py header comment for the substations/power-plants endpoints that did not).

### UTILITY TERRITORIES

**Utility service territories** (utility_territories) — ✅ has data

- Records: 6
- Source: Hand-curated (illustrative, not sourced from a utility territory GIS layer)
- Geographic scope (declared): 6 illustrative utility footprints, not a national layer
- Update frequency (declared): manual
- Authoritative: False
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** NOT A REAL DATASET YET. 6 hand-typed FIPS-list entries (e.g. "Dominion Energy (Virginia)") stand in for what should be a real utility service-territory polygon layer. HIFLD publishes an Electric Retail Service Territories layer that has not yet been evaluated/ingested.
- **Known quality issues:** Presented on the map without a distinct 'illustrative' visual treatment from verified layers — flagged as a UI honesty gap, see docs/DATA_COVERAGE.md.

### WASTEWATER

**Wastewater treatment infrastructure** (wastewater) — ✅ has data

- Records: 18885
- Source: EPA Office of Environmental Information (OEI) FRS/ICIS-NPDES
- Source URL: https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_Wastewater/MapServer/1/query
- Geographic scope (declared): US NPDES-permitted wastewater treatment facilities -- 18,885 real records across 56 states/territories and 3,014 counties (as of 2026-08-09 dispatch; count varies per fetch since this queries the live service, not a fixed dataset)
- Update frequency (declared): weekly (update_infrastructure.yml, fetch_wastewater_facilities())
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** No capacity/flow-rate field (capacity_mgd is always null, genuinely absent from this source -- see fetch_wastewater_facilities() docstring). Only records with real FAC_LAT/FAC_LONG are included. Permit status is passed through unfiltered since only the schema, not real CWP_PERMIT_STATUS_CODE enum values, was confirmed via live dispatch -- some records may be terminated/inactive permits, not just currently-operating plants.
- **Known quality issues:** This layer indexes NPDES-permitted facilities (major/minor/other), not the EPA Clean Watersheds Needs Survey's broader treatment-plant inventory -- coverage may differ from CWNS totals, which have not been cross-checked.

### WATER

**County-level water stress index** (water_stress) — ✅ has data

- Records: 79
- Source: Derived proxy (exact upstream methodology not separately documented in-repo)
- Geographic scope (declared): 79 counties
- Update frequency (declared): weekly (update_infrastructure.yml, fetch_water_stress())
- Authoritative: False
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** Only 79 of ~3,000 US counties have a water stress value. This is an index/score (0–4 scale), not a water utility service territory, treatment plant, or main dataset — none of those exist in the repository yet.
- **Known quality issues:** A single scalar stress index cannot answer utility capacity questions; the parcel suitability/proximity engines correctly treat proximity as distinct from capacity, but no water infrastructure PROXIMITY layer (mains, treatment plants, service areas) exists to feed that distinction yet.

### WATER INFRASTRUCTURE

**Community water system service areas** (water_systems) — ✅ has data

- Records: 44612
- Source: EPA Community Water System Service Area Boundaries (national drinking-water dataset)
- Source URL: https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Water_System_Boundaries/FeatureServer/0
- Geographic scope (declared): United States -- 44,612 real community water systems ingested 2026-08-09, all 50 states + DC + PR + GU + MP + tribal/EPA-region-administered systems (numeric Primacy_Agency codes 1/4/5/6/8/9/10)
- Update frequency (declared): weekly (update_infrastructure.yml)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** RESOLVED 2026-08-09 (was NOT YET INGESTED -- found live but blocked by a pagination stall). Root cause confirmed: this layer's 44,000+ underlying polygons made deep offset-based pagination (`resultOffset`) progressively expensive server-side regardless of page size -- four earlier full-scan dispatches (full-resolution polygons, geometry-generalized polygons, centroids at 2000/page, centroids at 100/page) each ran 15+ minutes and had to be cancelled. Fix: fetch_water_systems() now discovers the real Primacy_Agency partition values live via a single distinct-values query (61 real values: 50 states + DC + PR/GU/MP + 7 numeric EPA-region/tribal codes -- never a hardcoded list), then fetches each partition independently with per-partition failure isolation and PWSID dedup. A real dispatch against this exact code (GitHub Actions run 31340008732, 2026-08-09) completed in ~90 seconds: 44,612 records, 61/61 partitions succeeded, 1 PWSID collision deduped, 54 states represented in the output (CA 2,798; TX 4,582; WA 2,123; NC 1,841 the largest).
- **Known quality issues:** A service-area centroid/boundary answers "which utility's territory reaches here," not whether that utility has spare capacity, and carries no main-size/location or treatment-plant-location data (see the wastewater dataset for the wastewater side of the picture). State is inferred from the PWSID's 2-letter prefix (a documented EPA convention, not independently re-verified against every real PWSID in this specific layer).

### WETLANDS

**USFWS National Wetlands Inventory** (nwi_wetlands) — ⛔ no data

- Records: 0
- Source: US Fish & Wildlife Service (USGS-hosted mirror)
- Source URL: https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0
- Geographic scope (declared): United States (target)
- Update frequency (declared): live (queried per-parcel bounding box at analysis time, no local cache)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** ENGINE EXISTS, LIVE, WIRED (verified 2026-08-09 via a real GitHub Actions dispatch -- confirmed layer 0, real fields Wetlands.ATTRIBUTE/WETLAND_TYPE/ACRES plus the joined NWI_Wetland_Codes lookup table). No local record count applies -- this is a live per-parcel query, not stored data. The FWS's own www.fws.gov/wetlands candidate returned HTTP 404 (retired/moved); this USGS-hosted mirror of the same NWI data is what's actually live.
- **Known quality issues:** NWI is a mapping product, not a jurisdictional wetland determination. See the caveat text in constraint-layers.js.

### ZONING

**Zoning district standards (pilot)** (zoning_jurisdictions) — ✅ has data

- Records: 1
- Source: Individual county zoning ordinances (manually researched)
- Geographic scope (declared): 1 jurisdiction (Loudoun County, VA)
- Update frequency (declared): manual
- Authoritative: True
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_zoning.yml
- Actual refresh cadence (computed from the workflow's own cron schedule): weekly
- **Known coverage holes:** 1 of 58 production parcel jurisdictions has structured zoning district/setback/permitted-use data. This is the input the conceptual buildable envelope and suitability land-use scoring depend on for anything beyond the raw zoning_code string.
- **Known quality issues:** Hand-transcription from ordinance text carries transcription-error risk; docs/ZONING_VERIFICATION.md documents the verification process for this one jurisdiction.
