# Platform Terminology Guide

This document defines the terminology used throughout the US Data Center & AI Policy Tracker.
Consistent use of these terms across all UI text, documentation, and data files is required.

---

## Restriction Level Labels

The platform uses a six-level classification system for county policy status. These labels appear
in the map legend, county detail panels, filter controls, and analytics summaries.

| Code | UI Label | Meaning |
|------|----------|---------|
| `ban` | **Moratorium / Ban** | An active ordinance prohibiting new data center construction or significantly restricting operations. |
| `high` | **Significant Restrictions** | Active, enforced restrictions that materially limit data center development — verified from primary government sources. |
| `moderate` | **Moderate Restrictions** | Active, enforced restrictions with lighter impact — e.g., notification requirements, limited siting restrictions. Verified. |
| `proposed` | **Proposed Restrictions** | Legislation or ordinance pending; not yet enacted. May become active. |
| `none` | **No Known Restrictions** | Researched jurisdiction — no active or proposed restrictions found at time of research. Does NOT mean restrictions are impossible or will never exist. |
| `pro` | **Pro-Development Hub** | Verified tax incentives, fast-track permitting, or active development infrastructure in place. |

**Do not use**: "High Restrictions" (use "Significant Restrictions"), "No Restrictions" (use "No Known Restrictions"),
"Pro / Incentive Hub" (use "Pro-Development Hub").

---

## "Not Yet Researched" vs "No Known Restrictions"

These two states are distinct and must not be confused:

- **Not yet researched** (dark map color, no database record): The county has not been individually
  investigated. No data has been collected. The county CANNOT be assumed to be restriction-free.
  As of 2026-07-25, this applies to 1,678 of 3,143 US counties (53.4%).

- **No Known Restrictions** (`none` level, green map color): The county HAS been individually
  researched. Researchers reviewed county council records, ordinances, and related sources and
  found no active or proposed restrictions at the time of research. The county may have restrictions
  that were missed or that were passed after the research date.

---

## Data Freshness Terms

| Term | Meaning |
|------|---------|
| **Policy data through: [date]** | The most recent date that policy records in the database were verified or updated. Records are manually curated — this date does NOT auto-update. |
| **Manually researched** | County restriction data was reviewed by a human researcher from primary government sources (county council minutes, state legislature databases, utility commission filings). It is not scraped or auto-generated. |
| **Auto-updated hourly** | News feed articles are fetched by a GitHub Actions workflow on an hourly schedule. |
| **Updated weekly** | Facilities data (facilities_master.json) is refreshed by an automated pipeline on a weekly schedule. |
| **Delayed 15 min** | TradingView market data (stock prices, charts) is provided with a 15-minute delay on the free tier. It is NOT real-time. |

---

## Coverage Terms

| Term | Meaning |
|------|---------|
| **Counties researched** | Counties with at least one record in the database, regardless of restriction level. Use "counties researched" in KPI labels — not "counties tracked" (too vague) and not "counties covered" (implies complete coverage). |
| **Coverage %** | `counties_in_database / total_us_counties * 100`. As of 2026-07-25: 1,465 / 3,143 = 46.6%. |
| **US counties total** | 3,143 — the fixed total number of US counties and county-equivalents. |

---

## Data Quality Terms

| Term | Meaning |
|------|---------|
| **Verified** | Data sourced directly from a primary government document (ordinance text, council resolution, utility commission filing). Includes a `source_url`. |
| **Partial** | Data is partially verified — e.g., a restriction is confirmed but the exact text or effective date is unknown. |
| **Estimated** | Algorithmically derived or inferred — e.g., site risk scores, capacity figures from satellite imagery. Not officially verified. |
| **Sample** | Demonstration or placeholder data. Not for production use or decision-making. |
| **Broken source URL** | A `source_url` in the database that returns an HTTP error or is unreachable. As of 2026-07-25: 711 of 1,690 source URLs checked are broken. |

---

## Market Data Terms

| Term | Meaning |
|------|---------|
| **TradingView** | Third-party charting and market data provider. All stock prices, charts, and financial data on the platform come from TradingView widgets. |
| **Delayed 15 min** | TradingView's standard disclosure for non-real-time quote data. |
| **Not investment advice** | Required disclaimer for any market data display. The platform does not provide investment recommendations. |

---

## Do Not Use

The following phrases must NOT appear in any user-facing UI text:

- "every US county" — only 1,465 of 3,143 counties are in the database
- "Updated daily" — policy data is manually curated, not on a daily schedule
- "Real-time" for policy data — it is manually curated
- "Real-time" for TradingView data — it is delayed 15 min
- "Live" for policy data — only the news feed is auto-updated
- "50+" for AI companies — the count is 44 public + 5 private (49 total)
- "No Restrictions" — use "No Known Restrictions"
- "High Restrictions" — use "Significant Restrictions"
- "Counties Tracked" — use "Counties Researched"
