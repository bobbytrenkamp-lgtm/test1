# Data Coverage

**Generated file — do not edit by hand.**
Run `python3 data/generate_data_catalog.py` to regenerate.
Declared metadata (sources, URLs, known issues) lives in `data/catalog/dataset_registry.json`.

> record_count, ui_consumed, ci_tested, and automated_update_workflows are computed from the current repository state every run. Everything else (source_org, source_url, license, known_coverage_holes, known_quality_issues) is declared once in dataset_registry.json and requires a human to update when it changes. A dataset with has_data:false means this repository currently holds zero records for it, whatever the engine built to consume it can do.

## Totals

| | |
|---|---|
| Datasets catalogued | 29 |
| Datasets with actual data (has_data) | 18 |
| Datasets wired into the production UI | 11 |
| Datasets with dedicated CI coverage | 5 |
| Datasets on an automated refresh workflow | 15 |

## Refresh cadence (computed from each workflow's own cron schedule, not declared)

| Cadence | Datasets |
|---|---|
| daily | 1 |
| hourly | 1 |
| monthly | 1 |
| none | 1 |
| not_automated | 14 |
| weekly | 11 |

## By category

| Category | Datasets | With data | Total records | UI-consumed | Automated |
|---|---|---|---|---|---|
| ASSESSMENT | 1 | 0 | 0 | 0 | 0 |
| DATA CENTERS | 2 | 2 | 4,463 | 1 | 1 |
| ECONOMIC DATA | 2 | 2 | 14 | 0 | 0 |
| FIBER | 3 | 0 | 0 | 1 | 1 |
| FLOOD | 1 | 0 | 0 | 1 | 0 |
| INTERCONNECTION QUEUES | 1 | 0 | 0 | 0 | 0 |
| ISO/RTO | 1 | 0 | 0 | 0 | 0 |
| NEWS | 1 | 1 | 600 | 1 | 1 |
| PARCELS | 3 | 3 | 87,036 | 1 | 3 |
| POLICY/REGULATION | 2 | 2 | 1,579 | 1 | 2 |
| POWER PLANTS | 1 | 1 | 1,295 | 0 | 1 |
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

- Records: 8
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

**Generator interconnection queue positions** (interconnection_queues) — ⛔ no data

- Records: 0
- Source: FERC (registered as a facility-pipeline source, not yet feeding a dedicated dataset)
- Source URL: https://www.ferc.gov/media/3423/download
- Geographic scope (declared): _none_
- Update frequency (declared): n/a — registered as a facility source only
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** The 'ferc_queue' facility source in facility_sources.json feeds the DATA CENTER pipeline (detecting large-load interconnection requests), not a standalone interconnection-queue dataset. LBNL's free public interconnection queue database (queues.lbl.gov) is a plausible richer source that has not been evaluated.

### ISO/RTO

**ISO/RTO regions** (iso_rto) — ⛔ no data

- Records: 0
- Source: EIA (US Energy Atlas) -- candidate found, not yet ingestable
- Source URL: https://services7.arcgis.com/FGr1D95XCGALKXqM/ArcGIS/rest/services/RTO_Regions/FeatureServer/0
- Geographic scope (declared): _none_
- Update frequency (declared): n/a — not implemented
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- Actual refresh cadence (computed from the workflow's own cron schedule): _not applicable — no automated workflow_
- **Known coverage holes:** STILL NOT IMPLEMENTED, but no longer un-investigated. EIA's US Energy Atlas publishes a 7-region RTO/ISO boundary layer (atlas.eia.gov/maps/eia::rto-regions), discovered via web search 2026-08-09. The underlying ArcGIS FeatureServer was dispatched twice on a real GitHub Actions runner (both /query with outFields=* and the bare layer-metadata endpoint) and both returned 'Token Required' -- this specific service requires an ArcGIS auth token this project does not have, despite being publicly discoverable and publicly downloadable through the Hub UI (which proxies its own token). fetch_iso_rto_regions() in fetch_infrastructure.py is written and wired into update_infrastructure.yml's 'iso_rto' layer, but currently returns zero records and logs the real auth error rather than faking data -- so this is scaffolding waiting on either (a) a public non-token-gated mirror of the same 7 regions, or (b) the Hub's public-download proxy endpoint (opendata.arcgis.com download API) being identified and wired in instead of the raw FeatureServer query.
- **Known quality issues:** EIA's own documentation notes RTO/ISO boundaries are illustrative, not legally precise -- RTOs don't have crisp borders the way states do, and shapefiles can overlap or leave gaps. Not yet relevant since no data has been ingested.

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

- Records: 58
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

- Records: 86811
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

- Records: 1295
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
- **Known coverage holes:** ENGINE EXISTS, NO DATA. Registered unavailable in js/parcel/constraint-layers.js. Four real candidate URLs dispatched and confirmed dead/erroring as of 2026-08-09: gis1.usgs.gov/.../PAD_US_Fee_Topology (HTTP 502), maps4.arcgisonline.com/.../DOI/PAD-US_Land_and_Marine_Protected_Areas (HTTP 503), and the Esri Living Atlas services.arcgis.com/.../USA_Protected_Areas_State FeatureServer (tried with and without a spatial filter -- both times a suspicious ~103-byte response, too small to be real GeoJSON, likely a rejected query or an access restriction rather than a working anonymous endpoint). No replacement guessed.

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
- **Known quality issues:** TYPE is passed through unfiltered and is NOT exclusively 'SUBSTATION' -- of the 53,826 kept records, 37,891 are TYPE=SUBSTATION, 15,349 are TYPE=TAP (a transmission-line branch point, not a switching facility), plus small counts of RISER/DEAD END/NOT AVAILABLE. Consumers wanting strictly substations, not taps, must filter on type themselves; this is not done in the fetcher because HIFLD's own convention includes TAP under this same layer and silently dropping it would itself be an undocumented coverage decision. STATUS is passed through as-reported (confirmed real enum on this mirror: IN SERVICE 51,786 / NOT AVAILABLE 2,031 / UNDER CONST 9) rather than filtered, since only the schema (not real values) was confirmed before the first live fetch. Schema differs from the original dead HIFLD org (MAX_VOLT/MIN_VOLT instead of one VOLTAGE field, COUNTYFIPS instead of COUNTY_FIPS) -- handled in the adapter, but any future source swap must re-verify field names rather than assume the original schema. As of 2026-08-10, data/split_layer_by_state.py additionally geo-partitions this layer (only this one -- water_systems/wastewater_facilities have zero map consumers today, confirmed by grep, so partitioning them would be premature) into data/layers/power_infrastructure/manifest.json + states/<ST>.json, each state entry carrying a bbox; js/map.js's power layer toggle now fetches only the state(s) intersecting the current map viewport instead of all 53,826 US records, loading newly-panned-into states on moveend and caching previously-seen ones (bounded LRU, 15 states).

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
