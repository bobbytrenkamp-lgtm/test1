# Data Sources

This document describes the data sources used by the US Datacenter Restrictions Map, the verification process for each, and the pipeline that monitors official government sources for policy changes.

---

## Source Tiers

| Tier | Description | Examples |
|------|-------------|---------|
| **Tier 1** | Official government sources. Authoritative — required for map entries. | State legislature websites, county board of supervisors, .gov agency pages, PUD orders |
| **Tier 2** | Reputable code publishers and official utility/industry bodies. Corroborating — can supplement Tier 1. | FERC orders, utility commission filings, NCSL tracker |
| **Tier 3** | News, advocacy, or community sources. Discovery only — never authoritative. | Data Center Dynamics, datacenterbans.com, local news |

A map entry requires at least one Tier 1 source with a verified URL.

---

## Data Files

### `data/restrictions_raw.json`
County-level restriction and incentive data. Manually curated and periodically reviewed.

- **Edited by**: Humans with verified government sources
- **Written by pipeline**: Never — the pipeline only populates `policy_candidates.json`
- **Format**: `{ "meta": {...}, "restrictions": [{fips, name, state, level, types, title, description, effective_date, status, lifecycle_stage, pipeline_verified, last_reviewed, sources}] }`

### `data/state_regulations.json`
State-level policy summary. Manually curated.

- **Format**: `{ "states": { "FIPS2": { name, abbr, level, status, summary, types, sources } } }`

### `data/government_sources.json`
Configuration-driven registry of official government sources the pipeline monitors.

- **Format**: `{ "meta": {...}, "sources": [{id, jurisdiction_type, jurisdiction_name, state, fips, title, url, url_verified, tier, adapter, active, policy_types, notes}] }`
- **Coverage**: ~130 sources across 31 priority states and ~90 local jurisdictions
- **URL note**: All URLs are drawn from official government domains or existing `restrictions_raw.json` source objects. `url_verified: false` means the URL has not been live-checked in the current session — the pipeline verifies on each run.

### `data/policy_candidates.json`
Policy signals discovered by the pipeline from official government sources. **Awaiting human review.**

- **Written by**: Pipeline (automated)
- **Human action required**: Each entry must be independently verified before consideration for `restrictions_raw.json`
- **Never copy directly to map data**: Candidates are signals, not verified facts

### `data/policy_review_queue.json`
Candidates promoted after initial human triage. Still need full verification.

### `data/policy_change_log.json`
Log of detected changes in monitored government sources.

### `data/source_health.json`
URL reachability status for every configured source. Updated on each pipeline run.

### `data/policy_documents.json`
Archive of official government policy document metadata.

### `data/map_data.json`
Generated output — do not edit directly. Produced by `data/process_data.py` from `restrictions_raw.json`.

---

## Government Source Pipeline

The pipeline (`data/policy_pipeline/`) discovers policy signals from official government sources:

```
government_sources.json
        │
        ▼
Source Registry → Health Check → Adapter (generic_html / rss_atom / legistar / etc.)
                                         │
                                         ▼
                              Normalize → Classify → Deduplicate → Validate
                                                                        │
                                                                        ▼
                                                           policy_candidates.json
                                                           (HUMAN REVIEW REQUIRED)
                                                                        │
                                                             (after verification)
                                                                        │
                                                                        ▼
                                                           restrictions_raw.json
                                                                        │
                                                                        ▼
                                                                   map_data.json
```

### Running the pipeline

```bash
# Check source URL health only
python data/run_policy_pipeline.py --check-health-only

# Full discovery run (dry-run, no writes)
python data/run_policy_pipeline.py --dry-run

# Full discovery run for one state
python data/run_policy_pipeline.py --state VA

# Add lifecycle fields to existing records (safe, idempotent)
python data/run_policy_pipeline.py --migrate-lifecycle

# Full run
python data/run_policy_pipeline.py
```

### Scheduled execution
GitHub Actions runs the pipeline daily via `.github/workflows/update_policy_sources.yml`.

---

## Adding a New Source

1. Identify the official government URL for the jurisdiction.
2. Verify the URL exists and is publicly accessible.
3. Add an entry to `data/government_sources.json` with `"url_verified": false`.
4. Set `"active": true` and choose the appropriate `"adapter"`.
5. Run `python data/run_policy_pipeline.py --check-health-only` to verify reachability.
6. If reachable, set `"url_verified": true` and commit.

---

## Policy Lifecycle

Entries in `restrictions_raw.json` track a `lifecycle_stage` field:

| Stage | Meaning | `status` equivalent |
|-------|---------|---------------------|
| `discovered` | Signal found, not yet validated | `proposed` |
| `proposed` | Formal proposal introduced | `proposed` |
| `enacted` | Passed but not yet effective | `proposed` |
| `effective` | In effect | `active` |
| `expired` | Time-limited rule that has lapsed | `expired` |
| `repealed` | Explicitly repealed | `expired` |
| `failed` | Proposed but did not pass | `expired` |

---

## Security Constraints

- **No API keys or credentials in any committed file.** All configured sources use public, unauthenticated government URLs.
- **No user accounts, authentication, or paid services.**
- **No automated writes to `restrictions_raw.json` or `map_data.json`.** Only human editors update authoritative data.
- **robots.txt respected.** The fetch module checks `robots.txt` before crawling any URL.
- **No invented URLs.** Every URL in `government_sources.json` is drawn from an official government domain or an existing `restrictions_raw.json` source object. Uncertain URLs are marked `url_verified: false`.

---

## Economic Data (FRED + U.S. Census)

Economic context for the Economy tab, map layers, and county profiles. These are
**third-party statistical sources**, distinct from the Tier 1–3 policy source model
above: they are authoritative for their own statistics but say nothing about
regulation, and are never used to infer a policy record.

### Federal Reserve Economic Data (FRED)
- **Publisher**: Federal Reserve Bank of St. Louis
- **Endpoints**: `https://api.stlouisfed.org/fred/series/observations`,
  `/fred/series` (metadata validation), `/fred/series/release` (originating agency)
- **Key**: `FRED_API_KEY` repository secret. Server-side only.
- **Update frequency**: pipeline runs daily; individual series update on their own
  publication schedules (daily for Treasury yields, monthly for CPI and payrolls,
  quarterly for GDP).
- **Output**: `data/economy/fred_data.json`
- **Series tracked (23)**: configured in `data/economy/series_config.json`, not
  hardcoded. Rates & Credit (`DFF`, `DGS2`, `DGS10`, `T10Y2Y`, `MORTGAGE30US`,
  `NFCI`, `BUSLOANS`, `CREACBM027NBOG`), Inflation & Growth (`CPIAUCSL`, `PCEPI`,
  `GDPC1`, `INDPRO`), Labor & Demand (`UNRATE`, `PAYEMS`, `ICSA`, `JTSJOL`,
  `RSAFS`), Housing & Construction (`HOUST`, `PERMIT`, `CSUSHPINSA`), Energy &
  Power Costs (`APU000072610`, `PCU2211102211104`, `DHHNGSP`). Power is
  typically a data center's largest recurring operating cost and was
  previously untracked; the three energy series give a national retail
  electricity price, a producer-side utility-generation cost index, and the
  Henry Hub natural gas spot price (the dominant marginal fuel for US
  electricity generation, so a leading indicator rather than a lagging one).
  `JTSJOL` (JOLTS job openings) and `CSUSHPINSA` (Case-Shiller national home
  price index) were added later: UNRATE/ICSA measure labor SUPPLY while
  JTSJOL measures labor DEMAND, and HOUST/PERMIT measure construction
  ACTIVITY while CSUSHPINSA measures home price LEVELS — each fills a gap the
  existing series in its category could not answer. None of the 23 is
  promoted to the KPI strip — the 7-KPI National Economic Pulse count is a
  fixed design decision — but each category's chart is shown by default like
  every other category.

**Attribution note:** FRED *hosts* series produced by other agencies — BLS
(`CPIAUCSL`, `UNRATE`, `PAYEMS`), BEA (`GDPC1`, `PCEPI`), Census (`HOUST`,
`PERMIT`, `RSAFS`), Freddie Mac (`MORTGAGE30US`). The pipeline records each
series' originating release and the UI displays it. Do not present all
FRED-hosted series as Federal Reserve products.

Every series is validated through the metadata endpoint before its observations
are requested. A renamed or discontinued series is recorded in
`economic_metadata.json` under `fred_skipped` and omitted — it never crashes the
run and never publishes an empty chart.

### U.S. Census Bureau — American Community Survey (ACS) 5-Year Estimates
- **Publisher**: U.S. Census Bureau
- **Endpoints**: `https://api.census.gov/data/{year}/acs/acs5`,
  `.../acs5/variables.json` (per-vintage variable verification)
- **Key**: `CENSUS_API_KEY` repository secret, server-side only — **required**.
  Census allowed roughly 500 unauthenticated requests/day until May 12, 2026,
  when it began requiring a key for every Data API request. Without the key,
  Census (ACS, CBP) is skipped with a warning and existing data is
  preserved — the pipeline never crashes, it just does not refresh. Note that
  an *empty* `key=` is not the same as no key — Census rejects a blank one, so
  `_census_key_param()` omits the parameter entirely rather than sending it empty.
- **Update frequency**: one new vintage per year. The pipeline checks weekly
  (skips if refreshed within 7 days) and **auto-discovers** the newest available
  vintage rather than hardcoding a year.
- **Output**: `data/economy/census_county.json`, `data/economy/census_state.json`
- **Join key**: 5-character zero-padded county FIPS (state 2 + county 3), matching
  every other dataset on this platform.
- **Metrics**: population and growth (`B01003`), total households (`B11001`),
  median age (`B01002`), household and per-capita income (`B19013`, `B19301`),
  labor force participation and unemployment (`B23025`), educational attainment
  (`B15003`), home value and rent (`B25077`, `B25064`), homeownership (`B25003`),
  housing vacancy (`B25002`), broadband subscription (`B28002`), poverty rate
  (`B17001`), and mean commute time (`B08013`/`B08012`). Every metric is
  config-driven from `data/economy/census_config.json` — adding one is a config
  change plus a verified variable ID, not a code change (see
  `derive_metric()` and its `direct`/`ratio`/`average`/`sum_over_denominator`
  derive kinds).

**Vintage comparability:** ACS dollar values are expressed in the vintage's own
inflation-adjusted dollars and are **not** comparable across vintages. The UI
states this wherever dollar figures appear.

**Variable verification:** ACS variable IDs are reused across vintages but tables
are occasionally restructured (B28002's broadband line has moved). Before
requesting data the pipeline loads the vintage's own variables metadata and checks
that each ID exists *and* that its label matches an expected fragment. A variable
that cannot be verified causes the metric to be **omitted** and recorded under
`census.unverified_metrics` — never silently substituted with an unrelated
variable.

**ACS vs FRED unemployment:** the county unemployment figure is an ACS 5-year
survey estimate. It is a different measurement on a different schedule from the
monthly national unemployment rate (`UNRATE`) and the two are labelled separately
throughout the UI.

### U.S. Census Bureau — County Business Patterns (optional module)
- **Endpoint**: `https://api.census.gov/data/{year}/cbp`
- **Output**: `data/economy/census_cbp.json`
- **Status**: implemented and isolated, but not yet verified against the live API.
- Tracks establishments, employment, annual payroll, the Information sector, and
  NAICS 518210 (computing infrastructure, data processing, hosting).
- **Disclosure suppression** is respected: suppressed cells are recorded as `null`
  with a `_suppressed` flag, displayed as "Not disclosed", and excluded from
  rankings and percent-change calculations. They are never coerced to 0.
- A CBP failure cannot break the Economy page — it is fetched separately and
  wrapped so an exception is logged and ignored.

### U.S. Census Bureau — Population Estimates Program (PEP) — RETIRED
A module merging a current-year `population_estimate` field (distinct from the
ACS `population` 5-year rolling average) into each county was built and
shipped, then retired. A live bounded test showed every vintage year
(2023-2026) returning a plain HTTP 404 on `/data/{year}/pep/population` —
sending the required API key made no difference, ruling out an auth problem.
Research confirmed why: Census discontinued this endpoint from the Data API
for current-year total population starting with vintage 2022 — even
`tidycensus` (the standard R client for this data) had to switch to
downloading Census's flat CSV files instead of the API for exactly this
reason, for exactly these years. Rebuilding it properly would mean either a
new CSV-parsing ingestion path or a FIPS-to-FRED-series lookup (FRED does
have per-county population series, but the IDs are truncated county-name
abbreviations, not derivable from FIPS the way `BPPRIV<FIPS>` is). Retired
instead: ACS's own `population` metric (a 5-year rolling average, already on
every county) remains the platform's population figure. See
`AI_CHANGELOG.md` for the full investigation.

### Building Permits Survey (BPS, optional module, via FRED)
- **Endpoint**: FRED's per-county series, `BPPRIV` + a 3-digit zero-padded
  state code + the 3-digit county code (6 digits total — one more leading
  zero than the plain 5-digit FIPS)
  (e.g. `BPPRIV048089` for Colorado County, TX, FIPS 48089) — **not** the Census Data API.
  Census distributes county-level BPS only as an annual flat file, not a JSON API;
  FRED already hosts the same data one series per county, so this stays on the
  same HTTP+JSON code path as every other FRED series in this pipeline instead of
  adding a second, CSV-parsing ingestion path for one module.
- **Output**: merged into each county's own record as `building_permits` — new
  private housing units authorized by permit, with a year-over-year change figure.
  This is genuinely new information, not a duplicate of the platform's existing
  national `PERMIT` FRED series: that one is a single national aggregate with no
  way to tell whether any specific county's permitting activity is accelerating or
  slowing, which speaks directly to local construction/contractor capacity.
- **Own cadence, not the daily one**: unlike everything else in this pipeline,
  this makes roughly one HTTP request *per county* (~3,000+) since FRED has no
  bulk per-county endpoint. BPS also publishes annually. Both reasons mean it
  cannot run on FRED's own daily cadence — it has an independent 30-day freshness
  gate (`--permits-max-age-days`, `permits_last_successful_update` in the
  metadata) so the ~3,000-request cost is paid rarely, not every day.
- **Coverage is expected to be partial**, not universal: many small/rural counties
  have never reported to BPS. A low floor (500 counties with real data) catches a
  total failure — wrong series ID pattern, rejected key — without demanding
  near-universal coverage the source itself does not have.
- A Building Permits failure cannot break the ACS county data it supplements —
  isolated the same way CBP is.

### U.S. Energy Information Administration — Electricity Retail Sales (optional module)
- **Publisher**: U.S. Energy Information Administration (EIA)
- **Endpoint**: `https://api.eia.gov/v2/electricity/retail-sales/data/`
- **Key**: `EIA_API_KEY` repository secret, server-side only — **optional**.
  Free registration at https://www.eia.gov/opendata/register.php. Missing key
  skips the module with a warning; every other source is unaffected.
- **Output**: merged into each state's own record in `data/economy/census_state.json`
  as `electricity_price` — `{value, as_of, sector}`, cents per kWh, industrial
  sector (`sectorid=IND`). Industrial rate is the standard site-selection proxy
  for a large power buyer such as a data center — a real utility contract rate
  varies by facility and is not covered by this state average. Shown on a
  county's own profile as "state average, not this specific county" to keep
  that distinction visible rather than implied.
- **One request for all states**, not one per state: EIA's v2 API returns every
  state as its own row per period when no `stateid` facet is set, so a single
  page (sorted newest-period-first, `length=5000`) covers the whole country —
  unlike Building Permits, which genuinely has no bulk endpoint on FRED.
- **Own cadence**: EIA publishes monthly, not daily or annually, so this has
  its own 30-day freshness gate (`--eia-max-age-days`,
  `eia_last_successful_update` in the metadata) — a coincidentally identical
  interval to Building Permits' gate, but a fully independent timestamp field
  (PEP's retirement was partly caused by a module sharing a sibling's gate
  instead of having its own).
- **Sanity floor**: fewer than 40 states/territories returned is treated as a
  broken response and discarded rather than published as a partial dataset.
- An EIA failure cannot break the ACS state data it supplements — isolated the
  same way CBP and Building Permits are.

### U.S. Bureau of Labor Statistics — Quarterly Census of Employment and Wages (optional module)
- **Publisher**: U.S. Bureau of Labor Statistics (BLS)
- **Endpoint**: `https://data.bls.gov/cew/data/api/{year}/a/area/{area_fips}.csv`
  — QCEW's open-data area-slice files, one per county per year, annual
  average (`a` for the quarter parameter). **No API key or registration
  required at all** — the only source on this platform, alongside a handful
  of unauthenticated government pages, that needs neither a key nor payment.
- **Output**: merged into each county's own record as `avg_weekly_wage` —
  `{value, employment, year}`, filtered to the `agglvl_code=70` row (county
  total across all industries and ownership sectors — confirmed against BLS's
  own aggregation-level code documentation, not guessed). A direct labor-cost
  figure for the local workforce, genuinely distinct from ACS's
  household-income metrics (household income aggregates ALL household income
  sources; this is per-worker pay from covered employment specifically).
- **CSV, not JSON**: unlike every other source this pipeline reads, QCEW's
  open-data access has no JSON equivalent. Parsed with Python's standard
  library `csv` module (`_get_csv_rows()`), keyed by the file's own header
  row via `csv.DictReader` rather than hardcoded column positions — resilient
  to BLS reordering columns the same way this pipeline already tolerates
  payload shape drift elsewhere. The exact wage-column name was not confirmed
  with full certainty from documentation alone (BLS's annual and quarterly
  layouts use slightly different naming conventions), so the pipeline tries
  a short list of candidate column names in order and uses whichever is
  actually present, the same defensive pattern `broadband_candidates` uses in
  `census_config.json` for the same kind of uncertainty.
- **Vintage discovery**: probes a real, populous county (Los Angeles County,
  CA) backwards from last year to find the newest annual file that responds
  AT COUNTY LEVEL, rather than hardcoding a year or trusting a national
  aggregate as a proxy. A live run found national and county-level data can
  disagree: the national total area (`US000`) responded for a vintage where
  every single sampled county still 404'd, meaning national/state QCEW
  figures can be published before county-level breakdowns for the same year
  are finalized — probing the actual granularity this module reads is what
  makes "vintage detected" trustworthy.
- **One request PER COUNTY** (~3,000+), the same shape as Building Permits,
  since QCEW's open-data access has no bulk endpoint either — stride-sampled
  and sanity-floored (500 counties) the same way. Own 90-day freshness gate
  (`--bls-max-age-days`, `bls_last_successful_update`), the longest of any
  module here, since QCEW's annual file only changes once a year and
  publishes with a 5-6 month lag.
- A BLS failure cannot break the ACS county data it supplements — isolated
  the same way CBP, Building Permits, and EIA are.

### Federal Emergency Management Agency — National Risk Index (NRI) (optional module)
- **Publisher**: Federal Emergency Management Agency (FEMA)
- **Endpoint**: `https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query`
  — FEMA's own Esri-hosted ArcGIS FeatureServer, free and no key required,
  covering all ~3,144 US counties across 18 natural hazard types (flood,
  hurricane, wildfire, earthquake, winter weather, and more), queried in
  ~2,000-row pages and merged into one composite risk score plus a
  plain-language rating per county.
- **Why this endpoint and not FEMA's static CSV download**
  (`hazards.fema.gov/nri/Content/StaticDocuments/DataDownload/NRI_Table_Counties/NRI_Table_Counties.csv`):
  the CSV is confirmed soft-blocked from GitHub Actions runners as of
  2026-08-13 — it returns HTTP 200 but an HTML interstitial page instead of
  CSV data, so a naive fetch would silently get zero usable rows. A
  disposable diagnostic workflow dispatch that same day (GitHub Actions run
  31671943640) confirmed the ArcGIS FeatureServer, on `services.arcgis.com`
  infrastructure rather than `fema.gov`, returns real data instead: a live
  record for Autauga County AL with `STCOFIPS "01001"`, `RISK_SCORE 57.57`,
  `RISK_RATNG "Relatively Low"`, `NRI_VER "December 2025"` — confirming both
  the endpoint and the exact attribute names this module reads.
- If `nri_available` stays `false` after a `--force-nri` run, the warning
  text names exactly which candidate attribute names it tried against the
  service's real response, which is the first place to look.
- **Output**: merged into each county's own record as `natural_hazard_risk`
  — `{score, rating, as_of}`, filtered to counties matching one of a short
  list of candidate column names (`_NRI_FIPS_FIELD_CANDIDATES`,
  `_NRI_SCORE_FIELD_CANDIDATES`, `_NRI_RATING_FIELD_CANDIDATES`), the same
  defensive pattern `broadband_candidates` and BLS's wage-field candidates
  already use for genuine column-naming uncertainty.
- **One bulk request for the whole country**, not one per county — like
  EIA's electricity price, unlike BLS/Building Permits, since FEMA publishes
  NRI as a single table rather than per-area slices. Own 180-day freshness
  gate (`--nri-max-age-days`, `nri_last_successful_update`), the longest of
  any module here, since FEMA republishes NRI only roughly annually.
- **Deliberately not folded into the Data Center Readiness Score**: natural
  hazard risk is a different kind of judgment (physical/environmental risk —
  insurance cost, uptime risk, construction requirements) from that score's
  nine economic-attractiveness factors, the same reasoning that already
  keeps the regulatory restriction level separate from it.
- A FEMA NRI failure cannot break the ACS county data it supplements —
  isolated the same way CBP, Building Permits, EIA, and BLS are.

### Data Center Readiness Score — derived, not a data source
- Not a new data source: a client-side composite score (`js/economy.js`,
  `readinessScore()`) computed in the browser from nine factors already
  published by the sources above — population growth, unemployment,
  bachelor's degree attainment, labor force participation, broadband
  subscription, housing vacancy, building permits YoY change, average weekly
  wage, and state electricity price. No new HTTP request, no new pipeline
  output field, nothing to fetch, cache, or go stale independently of its
  inputs.
- Each factor is expressed as this county's percentile rank against every
  other county nationally (state-level for electricity price), not a raw
  value, so factors with very different units and scales combine on the same
  0-100 footing. "Lower is better" factors (unemployment, housing vacancy,
  wage, electricity price — all cost/risk signals) are inverted before
  weighting.
- Missing factors are excluded rather than treated as zero, and the
  remaining weights are redistributed proportionally — a county missing
  BLS wage data (a smaller sample than population/ACS coverage) is still
  scored on the other eight factors, with a reported completeness
  percentage rather than a silently penalized score.
- Deliberately excludes the regulatory/zoning restriction level
  (`map_data.json`) and FEMA's National Risk Index (`natural_hazard_risk`):
  both answer a different question (legal risk and physical/environmental
  risk, respectively) than economic attractiveness. All three are shown as
  separate figures everywhere they appear, never blended into one hidden
  number.

### Pipeline and safety
- **Script**: `data/update_economic_data.py` (Python standard library only)
- **Workflow**: `.github/workflows/update_economic_data.yml` — daily at 06:20 UTC
  plus `workflow_dispatch`
- **Missing values are preserved as missing, never converted to 0.** Zero is a real
  value for several tracked series, so a fabricated zero would be
  indistinguishable from data.
- **A failed run never degrades good data.** `_safe_write()` refuses to replace a
  populated file with an empty one, or to accept a >20% record-count drop. A
  missing API key skips that source and preserves its existing output.
- **Output is validated before commit.** `--check` verifies FIPS format,
  chronological history, absence of future dates, plausible percentage ranges, and
  required metadata. The workflow fails rather than committing corrupt data.
- **No key is ever logged.** `_redact()` strips `api_key`/`key` from any URL that
  could reach a log line.

### Before the first run
`data/economy/*.json` ship as structurally-valid placeholders with
`generated_at: null`. That means *not yet populated* — deliberately distinct from
"checked and found nothing", the same convention `source_link_health.json` uses.
Every economic panel shows an explicit "nothing has been measured yet" state
rather than a zero.

---

## Cost & Licensing Audit

Every external service this project touches, and whether it costs anything.
Audited 2026-07-27. **Nothing in the running application requires a paid
account.** Re-run the audit with:

    grep -rhoE "https?://[a-zA-Z0-9._-]+" js/ data/ index.html | sort -u

### Free, no account or key needed

| Service | Used for | Terms |
|---|---|---|
| Leaflet 1.9.4 (vendored) | Map rendering | BSD-2-Clause |
| topojson-client v3 (vendored) | TopoJSON to GeoJSON | BSD-3-Clause |
| us-atlas counties-10m (vendored) | County/state boundaries | Public domain (US Census TIGER) |
| ~130 government policy sources | Policy pipeline | Public `.gov` pages, unauthenticated |
| County ArcGIS parcel services | Parcel layer (5 pilot counties) | Public government GIS |
| archive.org Wayback | Dead-link fallback | Free public API |
| TradingView embeddable widgets | AI Stocks tab | Free tier, attribution required (present). Quotes delayed 15 min |
| Google Fonts (Inter) | Typography | Free (SIL OFL) |
| jsDelivr CDN | Supabase JS client delivery | Free public CDN |
| USGS `basemap.nationalmap.gov` | Topo basemap option | Free US government service |
| BLS QCEW open-data CSV (`data.bls.gov/cew`) | County average weekly wage | Free US government service, no key or registration |
| GitHub Pages + Actions | Hosting and all scheduled jobs | Free with **unlimited** Actions minutes on public repositories |

No `package.json` and no build step, so there is no npm dependency tree to
license-audit. Python needs only `requests`, `beautifulsoup4` and
`python-dateutil` (all permissively licensed); the economic pipeline uses the
**standard library only**.

### Free, but require a free API key

| Key | Service | Cost | If absent |
|---|---|---|---|
| `FRED_API_KEY` | Federal Reserve Economic Data | Free, unlimited | FRED skipped; existing data preserved. FRED rejects keyless requests. |
| `CENSUS_API_KEY` | Census ACS / CBP | Free, unlimited | Census skipped; existing data preserved. Census required no key until May 12, 2026; it now requires one for every request, same as FRED. |
| `EIA_API_KEY` | EIA electricity retail price | Free, registration required | EIA module skipped; existing data preserved. Genuinely optional, unlike FRED/Census — the rest of the Economy tab is unaffected. |
| `CONGRESS_API_KEY` | Congress.gov | Free via api.data.gov | Falls back to `DEMO_KEY` — works, just rate-limited |
| `LEGISCAN_API_KEY` | LegiScan state bills | Free tier (30k queries/month) | Logged as `[skip]`, monitor continues |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Optional accounts | Free tier | Auth button hidden; site fully functional signed-out |

Every one of these degrades gracefully. **No key is required for the site to
work** — a visitor never needs one, and an unconfigured deployment shows honest
"not configured" / "not yet measured" states rather than breaking.

### Paid — REMOVED

The project's one paid integration (a commercial colocation database) was
**deleted on 2026-07-27**, not merely disabled. Removed together, because a
half-removal would have left the pipeline importing a deleted module:

- the adapter file
- its entry in `facility_sources.json`
- the dead `cloudscene_id` field (empty in all 3,842 master and 631 candidate
  records) from `models.py`, `merge.py` and both datasets
- the workflow secret reference in `update_facilities.yml`
- the adapter import and registry entry in `run_facility_pipeline.py`

`data/facilities_version_history/` snapshots still contain the empty field. Those
are immutable archives and are deliberately left untouched.

**There is now no paid service anywhere in the codebase**, and
`tests/test_no_paid_dependencies.py` fails if one reappears.

### Third-party tile providers — free, and not required either way

Two basemap providers are used **without an API key**: CARTO
(`{s}.basemaps.cartocdn.com`) and Esri (`server.arcgisonline.com`). Both are free
for light use with attribution, which is present. Neither is an unlimited
free-forever commitment, so the important property is not their pricing page —
it is that **the application does not depend on them**.

**Verified 2026-07-27:** with CARTO, Esri, USGS, TradingView, Google Fonts and
jsDelivr *all* blocked at the network layer, the app remains fully functional —
3,291 county polygons render, the legend renders, county selection works, and
Analytics and Pipeline both render, with zero JavaScript errors. Tiles are
background decoration; every feature works without them.

So a tile provider changing its terms could never make this project *require*
payment. The worst case is losing background imagery. If that ever happens, the
free replacements are already available — **USGS `basemap.nationalmap.gov`**
(US federal, public domain, already one of the basemap options) and
**OpenStreetMap** standard tiles. Swapping is one line per `L.tileLayer` call in
`js/map.js`, `js/pipeline.js` and `js/economy-view.js`.

`tests/test_no_paid_dependencies.py` keeps tile hosts on a reviewed allowlist, so
a usage-priced provider such as Mapbox or MapTiler cannot be dropped in
unnoticed.

### Rule for future work — enforced by a test

Do not add a dependency, data source, or service that requires payment to
function.

`tests/test_no_paid_dependencies.py` (wired into `tests/run_all.sh`) enforces
this with 28 checks across 13 tests:

- no known paid data service appears in code or config
- no npm dependency tree exists; Python deps are on a reviewed free allowlist
- the economic pipeline stays standard-library only
- every API key is read with `os.environ.get()` plus a skip path — never
  `os.environ[...]`, which would make it mandatory
- no frontend file reads a key (naming one in maintainer-facing copy is allowed)
- workflows contain no secret for a removed service
- tile hosts stay on the reviewed allowlist

Verified to catch real regressions: injecting a Mapbox tile layer or an
unreviewed paid Python package both fail the suite.

If a paid source is ever genuinely the best option, it must be an explicit,
documented decision — not something that arrives with a convenient import.

---

## Priority Coverage

### Priority States (31)
AZ, CA, CO, CT, GA, IL, IN, IA, LA, MA, MD, MI, MN, MT, NE, NV, NJ, NY, NC, OH, OR, PA, RI, SC, TN, TX, UT, VA, WA, WI, WY

### Notable Local Jurisdictions
- **Virginia**: Loudoun County (Data Center Alley), Fairfax County, Prince William County
- **North Carolina**: Chatham, Orange, Rowan counties (2024 moratorium wave)
- **Tennessee**: Anderson, Hamilton, Washington counties (TVA capacity moratoriums)
- **Washington State**: Chelan, Douglas, Grant, Okanogan PUDs (crypto moratoriums)
- **Georgia**: Clayton, Troup counties (active moratoriums); Fulton (major hub)
- **Nevada**: Washoe County (Reno moratorium)
- **Oregon**: Hood River County (permanent ban)
- **Rhode Island**: Providence County / Smithfield (permanent ban)

---

*Last updated: 2026-07-27*
