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

*Last updated: 2026-07-12*
