# Data Coverage

**Generated file — do not edit by hand.**
Run `python3 data/generate_data_catalog.py` to regenerate.
Declared metadata (sources, URLs, known issues) lives in `data/catalog/dataset_registry.json`.

> record_count, ui_consumed, ci_tested, and automated_update_workflows are computed from the current repository state every run. Everything else (source_org, source_url, license, known_coverage_holes, known_quality_issues) is declared once in dataset_registry.json and requires a human to update when it changes. A dataset with has_data:false means this repository currently holds zero records for it, whatever the engine built to consume it can do.

## Totals

| | |
|---|---|
| Datasets catalogued | 26 |
| Datasets with actual data (has_data) | 14 |
| Datasets wired into the production UI | 11 |
| Datasets with dedicated CI coverage | 5 |
| Datasets on an automated refresh workflow | 13 |

## By category

| Category | Datasets | With data | Total records | UI-consumed | Automated |
|---|---|---|---|---|---|
| ASSESSMENT | 1 | 0 | 0 | 0 | 0 |
| DATA CENTERS | 2 | 2 | 4,329 | 1 | 1 |
| ECONOMIC DATA | 2 | 2 | 14 | 0 | 0 |
| FIBER | 2 | 0 | 0 | 1 | 1 |
| FLOOD | 1 | 0 | 0 | 1 | 0 |
| INTERCONNECTION QUEUES | 1 | 0 | 0 | 0 | 0 |
| ISO/RTO | 1 | 0 | 0 | 0 | 0 |
| NEWS | 1 | 1 | 600 | 1 | 1 |
| PARCELS | 2 | 2 | 225 | 1 | 2 |
| POLICY/REGULATION | 2 | 2 | 1,579 | 1 | 2 |
| POWER PLANTS | 1 | 0 | 0 | 0 | 1 |
| PROTECTED LAND | 1 | 0 | 0 | 0 | 0 |
| RAIL | 1 | 0 | 0 | 0 | 0 |
| ROADS | 1 | 0 | 0 | 0 | 0 |
| SUBSTATIONS | 1 | 1 | 25 | 1 | 1 |
| TRANSMISSION | 1 | 1 | 1,892 | 1 | 1 |
| UTILITY TERRITORIES | 1 | 1 | 6 | 1 | 1 |
| WASTEWATER | 1 | 0 | 0 | 0 | 0 |
| WATER | 1 | 1 | 79 | 1 | 1 |
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
- **Known coverage holes:** ENGINE EXISTS, ZERO PRODUCTION DATA. js/parcel/enrichment.js and enrichment-arcgis-table.js are built and tested (89 + 47 assertions), and data/parcel_pipeline/discover_enrichment.mjs can find and empirically verify CAMA join candidates — but no registry.js entry has an enrichment block yet, because this session's sandbox could not reach county GIS hosts to run the discovery workflow. The pilot PR (Loudoun/Prince William/Fairfax VA) is unblocked but unexecuted.

### DATA CENTERS

**Facility index (production, map-consumed)** (data_centers) — ✅ has data

- Records: 4321
- Source: Multiple (see facility_sources.json)
- Geographic scope (declared): United States
- Update frequency (declared): weekly (update_facilities.yml)
- Authoritative: False
- UI-consumed: True
- CI-tested: True
- Automated update workflow(s): update_facilities.yml
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

**FRED macroeconomic series** (fred_data) — ✅ has data

- Records: 6
- Source: Federal Reserve Bank of St. Louis (FRED)
- Geographic scope (declared): National/state series
- Update frequency (declared): per update_economic_data.yml schedule
- Authoritative: True
- UI-consumed: False
- CI-tested: True
- Automated update workflow(s): _none_

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
- **Known coverage holes:** REMEDIATED. This dataset used to hold 3 hardcoded named routes ("Zayo Northern Virginia Dark Fiber Ring", "Lumen/CenturyLink Iowa Backbone", "Zayo Pacific NW Fiber Route") with hand-typed coordinate paths attributed to real carriers with no evidence. They were removed rather than kept as "illustrative" -- attributing an invented path to a named company by name is a fabrication risk a map tooltip disclaimer does not resolve. No free, reliable, nationwide fiber-route dataset is known to exist (see js/parcel/proximity-layers.js's fiber registerUnavailable(), which this file now matches). data/validate_sources.py and tests/test_fiber_network_honesty.py now require any future entry to carry a real, checked source URL before it may name a carrier.

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
- **Known coverage holes:** NOT CURRENTLY WORKING. fetch_infrastructure.py's fetch_fiber_coverage() targets an FCC county endpoint that now requires a registered API token this adapter does not send (HTTP 405/token error, documented in the script). Even if fixed, this measures MARKETED RESIDENTIAL BROADBAND AVAILABILITY, not physical long-haul/metro fiber routes or dark-fiber availability — the two must never be conflated, and this dataset should never be labeled as 'fiber infrastructure' if revived.

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
- **Known coverage holes:** The 'ferc_queue' facility source in facility_sources.json feeds the DATA CENTER pipeline (detecting large-load interconnection requests), not a standalone interconnection-queue dataset. LBNL's free public interconnection queue database (queues.lbl.gov) is a plausible richer source that has not been evaluated.

### ISO/RTO

**ISO/RTO regions** (iso_rto) — ⛔ no data

- Records: 0
- Source: _not applicable — no data_
- Geographic scope (declared): _none_
- Update frequency (declared): n/a — not implemented
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- **Known coverage holes:** NOT IMPLEMENTED. No ISO/RTO region layer exists anywhere in the repository. FERC and most ISOs (PJM, MISO, ERCOT, CAISO, SPP, ISO-NE, NYISO) publish free boundary maps/data; none are currently ingested.

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
- **Known coverage holes:** Geometry coverage is 58 of ~3,000+ US counties. Most jurisdictions provide geometry + identity only; ownership/assessment/sales/zoning require the multi-source enrichment engine, which currently has zero production jurisdictions with a declared enrichment block.
- **Known quality issues:** Field depth varies enormously by jurisdiction; see data/parcel_coverage_metrics.json for the per-category breakdown this file does not duplicate.

**Parcel source catalog (candidates + production + rejected)** (parcel_source_catalog) — ✅ has data

- Records: 167
- Source: Various state/county GIS portals, ArcGIS Hub, ArcGIS Online
- Geographic scope (declared): National discovery queue
- Update frequency (declared): manual dispatch (parcel_batch_discovery.yml, parcel_enrichment_discovery.yml)
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): parcel_pr_check.yml
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

### POWER PLANTS

**Power generation facilities** (power_plants) — ⛔ no data

- Records: n/a
- Source: EPA Facility Registry Service (EIA-860 generator data joined with FRS)
- Source URL: https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_PowerPlants/MapServer/12
- Geographic scope (declared): United States (target, not achieved)
- Update frequency (declared): weekly (update_infrastructure.yml, layers=power)
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- **Known coverage holes:** This source has NO nameplate-capacity field of any kind -- plant identity, location, operating status, and primary fuel source are real and populated; capacity_mw is always None, never fabricated. A capacity-bearing free source (e.g. a verified EIA-860 bulk download) has not yet been found/verified.
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
- **Known coverage holes:** ENGINE EXISTS, NO DATA. Same status as fema_flood.

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
- **Known coverage holes:** NOT IMPLEMENTED. Deprioritized — rail is a lower-value signal for data center siting than power/fiber/water/road access; noted for completeness per the requested category list.

### ROADS

**Interstate/major road network for proximity analysis** (roads) — ⛔ no data

- Records: 0
- Source: BTS National Highway Planning Network (target, not yet ingested)
- Geographic scope (declared): United States (target)
- Update frequency (declared): n/a — not implemented
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- **Known coverage holes:** NOT IMPLEMENTED as a dataset the proximity engine can query. js/parcel/proximity-layers.js declares 'interstates' as PENDING_VERIFICATION with no endpoint attached — the base map's road tiles (OSM basemap) are visual only and are not queryable for distance calculations.

### SUBSTATIONS

**Electric power substations** (substations) — ✅ has data

- Records: 25
- Source: HIFLD (via a third-party ArcGIS mirror after the original HIFLD org's service was retired)
- Source URL: https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/HIFLD_electric_power_substations/FeatureServer/0
- Geographic scope (declared): United States (nominal)
- Update frequency (declared): weekly (update_infrastructure.yml)
- Authoritative: False
- UI-consumed: True
- CI-tested: False
- Automated update workflow(s): update_data.yml, update_facilities.yml, update_infrastructure.yml
- **Known coverage holes:** CONFIRMED SEVERE: this mirror returns only ~25 US substations after the >=69kV filter, nationwide. The real HIFLD substations dataset has tens of thousands of records. This is real, correctly-fetched data — not fabricated — but is NOT equivalent coverage to a full national substation layer. Documented in fetch_infrastructure.py and BUG_TRACKER.md; a full-coverage replacement has not been found.
- **Known quality issues:** Schema differs from the original HIFLD org (MAX_VOLT/MIN_VOLT instead of one VOLTAGE field, COUNTYFIPS instead of COUNTY_FIPS) — handled in the adapter, but any future source swap must re-verify field names rather than assume the original schema.

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
- **Known coverage holes:** NOT A REAL DATASET YET. 6 hand-typed FIPS-list entries (e.g. "Dominion Energy (Virginia)") stand in for what should be a real utility service-territory polygon layer. HIFLD publishes an Electric Retail Service Territories layer that has not yet been evaluated/ingested.
- **Known quality issues:** Presented on the map without a distinct 'illustrative' visual treatment from verified layers — flagged as a UI honesty gap, see docs/DATA_COVERAGE.md.

### WASTEWATER

**Wastewater treatment infrastructure** (wastewater) — ⛔ no data

- Records: 0
- Source: _not applicable — no data_
- Geographic scope (declared): _none_
- Update frequency (declared): n/a — not implemented
- Authoritative: False
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- **Known coverage holes:** NOT IMPLEMENTED. EPA's Clean Watersheds Needs Survey and the EPA Facility Registry Service both publish free wastewater facility data that has not yet been evaluated.

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
- **Known coverage holes:** Only 79 of ~3,000 US counties have a water stress value. This is an index/score (0–4 scale), not a water utility service territory, treatment plant, or main dataset — none of those exist in the repository yet.
- **Known quality issues:** A single scalar stress index cannot answer utility capacity questions; the parcel suitability/proximity engines correctly treat proximity as distinct from capacity, but no water infrastructure PROXIMITY layer (mains, treatment plants, service areas) exists to feed that distinction yet.

### WETLANDS

**USFWS National Wetlands Inventory** (nwi_wetlands) — ⛔ no data

- Records: 0
- Source: US Fish & Wildlife Service
- Geographic scope (declared): United States (target)
- Update frequency (declared): n/a — endpoint not yet verified
- Authoritative: True
- UI-consumed: False
- CI-tested: False
- Automated update workflow(s): _none_
- **Known coverage holes:** ENGINE EXISTS, NO DATA. Same status as fema_flood: registered unavailable pending endpoint verification in js/parcel/constraint-layers.js.

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
- **Known coverage holes:** 1 of 58 production parcel jurisdictions has structured zoning district/setback/permitted-use data. This is the input the conceptual buildable envelope and suitability land-use scoring depend on for anything beyond the raw zoning_code string.
- **Known quality issues:** Hand-transcription from ordinance text carries transcription-error risk; docs/ZONING_VERIFICATION.md documents the verification process for this one jurisdiction.
