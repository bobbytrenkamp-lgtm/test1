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
- **Series tracked (18)**: configured in `data/economy/series_config.json`, not
  hardcoded. Rates & Credit (`DFF`, `DGS2`, `DGS10`, `T10Y2Y`, `MORTGAGE30US`,
  `NFCI`, `BUSLOANS`, `CREACBM027NBOG`), Inflation & Growth (`CPIAUCSL`, `PCEPI`,
  `GDPC1`, `INDPRO`), Labor & Demand (`UNRATE`, `PAYEMS`, `ICSA`, `RSAFS`),
  Housing & Construction (`HOUST`, `PERMIT`).

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
- **Key**: `CENSUS_API_KEY` repository secret. Server-side only.
- **Update frequency**: one new vintage per year. The pipeline checks weekly
  (skips if refreshed within 7 days) and **auto-discovers** the newest available
  vintage rather than hardcoding a year.
- **Output**: `data/economy/census_county.json`, `data/economy/census_state.json`
- **Join key**: 5-character zero-padded county FIPS (state 2 + county 3), matching
  every other dataset on this platform.
- **Metrics**: population and growth (`B01003`), median age (`B01002`), household
  and per-capita income (`B19013`, `B19301`), labor force (`B23025`), educational
  attainment (`B15003`), home value and rent (`B25077`, `B25064`), broadband
  subscription (`B28002`).

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
