# Project Overview

This application is an interactive US map for tracking data center construction restrictions, AI regulations, high-intensity computing limits, moratoriums, tax incentives, and related infrastructure context at state, county, and city levels.

The intended user experience is a polished, fast, Google Maps-like regulatory map. Users should be able to pan, zoom, search, toggle layers, select a county, and immediately understand the full regulatory picture that applies to that location.

The long-term vision is to become a reliable nationwide intelligence tool for data center and AI infrastructure planning. The map should combine verified regulation data, facility and infrastructure overlays, source citations, and mobile-friendly exploration so users can compare jurisdictions without losing geographic context.

# Tech Stack

- Framework: No frontend framework; static single-page application.
- Languages: HTML, CSS, JavaScript, Python for data processing and validation.
- Mapping libraries: Leaflet.js v1.9.4, topojson-client v3, us-atlas county/state TopoJSON.
- UI libraries: No major UI framework; custom responsive CSS and native browser controls.
- Data sources: Curated local JSON files in `data/`, including county restrictions, state regulations, sample facility/infrastructure overlays, tax incentives, water stress, county names, and monitoring reports.
- Deployment method: GitHub Pages from the `main` branch, with GitHub Actions for Pages deployment, data updates, and legislation monitoring.

# Design Philosophy

- The application should feel like Google Maps: familiar pan/zoom behavior, natural basemap details, and smooth location exploration.
- Prioritize mobile-first design. Map selection, panels, filters, and legends must remain usable on phone-sized screens.
- Maintain a polished professional interface suitable for planning, policy, and infrastructure research.
- Avoid fixing one feature by breaking another. Treat map behavior, layer toggles, search, mobile layout, and detail panels as connected systems.
- Keep UI consistent across desktop and mobile. Controls may adapt, but visual language and feature availability should remain coherent.

# Current Major Features

## Completed Features

- Leaflet-based interactive US map with native pan, zoom, and touch support.
- County-level choropleth layer for restriction severity.
- State-level regulation layer beneath counties.
- Basemap modes for standard, satellite, and hybrid views.
- Layer toggles for sample data centers, AI campuses, power infrastructure, transmission, fiber, water stress, utilities, and tax incentives.
- County and facility search with autocomplete.
- Clickable counties with detail panel content.
- Responsive dashboard, legend, layer panel, stats bar, and mobile bottom-sheet detail panel.
- Vendored map dependencies for more reliable static deployment.
- AI News Feed tab: hourly-updated real news articles aggregated from 23+ public RSS/Atom feeds via GitHub Actions; article detail panel with summary, key points, "why it matters", source link; publisher and category filters; location link switches to Map tab with state filter applied. See `data/news_sources.json`, `data/update_ai_news.py`, `.github/workflows/update_ai_news.yml`, and the README AI News section for full architecture.
- AI Stocks tab: 50+ publicly-traded AI companies, TradingView widgets, favorites (localStorage), recently viewed, company detail tabs, market heatmap, search/filter, share button. No API keys. See `js/stocks.js`, `css/stocks.css`.
- Analytics tab: policy analytics and data visualizations. See `js/analytics.js`.
- Home / Command Center tab: landing page with KPI strip, global search (counties, states, news, companies), recent regulations feed, latest news, TradingView ticker, featured jurisdictions, navigation cards. See `js/home.js`.
- Government-source data pipeline: Python package (`data/policy_pipeline/`) that monitors 130+ official government URLs daily and writes policy signals to `policy_candidates.json` for human review. Never auto-writes to authoritative map data. See `data/run_policy_pipeline.py`, `DATA_SOURCES.md`.
- Legislative monitoring: `data/monitor_legislation.py` monitors US Congress and optional LegiScan API (LEGISCAN_API_KEY secret) for relevant bills. Runs Monday/Thursday via `monitor_legislation.yml`.
- Facility pipeline: `data/run_facility_pipeline.py` aggregates data center facility data from multiple sources into `data/facilities_master.json`. Runs weekly (Sunday) via `update_facilities.yml`.
- Infrastructure layer fetching: `data/fetch_infrastructure.py` pulls substations, transmission, power, fiber, water layers into `sample_layers.json`. Runs weekly via `update_infrastructure.yml`.
- Political Risk layer: `data/political_risk_pipeline.py` generates county-level risk scores in `data/political_risk.json`. Toggle via GIS toolbar in the Map tab. Runs weekly via `update_political_risk.yml`.
- GIS Toolbar: fullscreen, geolocation, zoom-to-restricted, distance measure, CSV export, share link, print, bookmarks, minimap overview, political risk layer toggle.
- Supabase Authentication: sign-in, sign-up, forgot-password, password-reset via email link, account profile panel (4 tabs: Profile, Preferences, Saved, Security), preference sync (theme, stock favorites, map bookmarks) between localStorage and cloud, saved-items scaffolding (counties, articles, stocks). Gracefully degrades when Supabase is not configured (auth button stays hidden). See `js/auth.js`, `js/account.js`, `css/account.css`, `data/supabase_schema.sql`, `SUPABASE_SETUP.md`.
- Economic Intelligence (Economy tab): Federal Reserve (FRED) and U.S. Census (ACS 5-year) data integrated into the platform for infrastructure planning context. Top-level **Economy** tab between Map and AI News with four sections — National Economic Pulse (7 KPI indicators), National Trends (SVG time-series charts across Rates & Credit / Inflation & Growth / Labor & Demand / Housing & Construction / Energy & Power Costs, with 1Y–Max ranges), Regional Economic Explorer (county/state choropleth with metric selector across 13 ACS metrics — population, households, income, labor force participation, unemployment, education, home value, rent, homeownership, housing vacancy, broadband, commute time, poverty rate — quantile breaks, and a per-region profile panel that also surfaces supplementary fields where available: county-level Building Permits Survey data reached via FRED's per-county series, county-level BLS QCEW average weekly wage (needs no API key at all), and state-level EIA industrial electricity price, each explicitly distinct from the ACS metrics beside it), and Infrastructure-Relevant Signals (deterministic rule-based statements, each traceable to a displayed metric). Integrated across the platform rather than isolated: an **Economic Data** layer group in the Map tab's Layers panel (six mutually-exclusive choropleths that never permanently overwrite restriction styles), an Economy section in county detail and Jurisdiction pages, an exploratory Economic Context section in Analytics, and a restrained four-indicator pulse on Home. All API calls happen in Python during GitHub Actions — no API key is ever client-side. See `js/economy.js`, `js/economy-view.js`, `js/economy-map.js`, `css/economy.css`, `data/update_economic_data.py`, `data/economy/`, `.github/workflows/update_economic_data.yml`. Requires the free `FRED_API_KEY` and `CENSUS_API_KEY` repository secrets — both required (Census allowed keyless requests until it began requiring a key for every Data API request on May 12, 2026) — plus an optional `EIA_API_KEY` for the electricity price module (BLS QCEW needs no key). All are free registrations at separate agencies and none can be billed. Until the workflow first runs, every economic panel shows an explicit "not yet measured" state rather than zeros.
- Zoning Intelligence Layer (Phase 1 pilot): district-level zoning data for Loudoun County, VA (FIPS 51107 — world's largest data center market). Complete data architecture with 4 JSON schemas, full Python pipeline (fetch → normalize → validate → export), weekly GitHub Actions update workflow, and frontend integration (window.ZONING, window.ZONING_MAP, zoning-details.js panel with 5 tabs). Zoning Districts layer in the Layers panel; clicking Loudoun County with the layer active opens a zoning intelligence panel showing DC eligibility by district, dimensional standards, permitted uses, overlays, and sources. All data labeled with confidence levels; required legal disclaimer on all output. See `docs/ZONING_ARCHITECTURE.md`, `docs/ZONING_PILOT_STATUS.md`, `data/zoning/`, `js/zoning*.js`, `css/zoning.css`.

## Partially Completed Features

- City regulation layer: required by product direction, but not yet fully represented as a distinct verified data layer.
- Real facility and infrastructure datasets: current overlay files include sample or placeholder content that should be replaced or verified.
- State-level detail content: state regulations are shown as a layer, but selected county details need richer state policy integration.
- County name coverage: `data/county_names.json` exists, but future work should verify all fallback behavior.

## Planned Features

- Verified city-level regulation data and display.
- Overlapping regulation display that combines state, county, and city rules in one selected-place view.
- Deeper Google Maps-like zoom behavior with natural city and landmark visibility.
- Shareable links for selected counties, layers, and map positions.
- More complete verified data center, utility, water, tax, power, and fiber datasets.

# Map Requirements

- The map must support a statewide regulation layer.
- The map must support a county regulation layer.
- The map must support a city regulation layer.
- The map must be able to display overlapping regulations.
- A selected county should show:
  1. State regulations.
  2. County regulations.
  3. City regulations inside that county, when available.
- The map should support deeper zooming like Google Maps.
- Cities and landmarks should appear naturally when zooming.

# Fixed Rule: Nothing May Require Payment

**This is a complete and fixed rule. It is not a preference, a default, or a
starting point for negotiation. It does not expire and it is not subject to
convenience.**

Nothing in this project may require payment to function.

- **No visitor may ever need an account, subscription, or credential** to use
  any part of the site.
- **No maintainer may ever need a paid plan** to run the data pipelines,
  workflows, tests, or deployment.
- **No paid service, API, dataset, library, font, tile provider, or hosting
  tier may be introduced as a dependency** — not as a default, not as an
  optional-but-expected path, and not as a disabled stub left in place "for
  later".
- **Every API key must remain optional.** A key may improve results. Its
  absence must be a documented skip, never an error, never a blank screen, and
  never a degraded state presented as a failure.
- **No third-party host may become load-bearing.** If a free service ever
  starts charging, the correct outcome is that the project loses that
  service's decoration — never that it stops working or starts costing money.

This rule outranks convenience, feature scope, data quality, and visual
polish. If the best available source for something costs money, the correct
answer is to use a free source, ship the feature without it, or **not ship the
feature** — and say so plainly. It is never to add the paid dependency.

**Enforcement:** `tests/test_no_paid_dependencies.py` (28 checks, wired into
`tests/run_all.sh`) fails the suite if a paid service, paid dependency,
mandatory API key, client-side key read, orphaned workflow secret, or
unreviewed tile host appears. Do not weaken, skip, or exempt your way past
this test. If it fails, the change is wrong — not the test.

Full audit and reasoning: the **Cost & Licensing Audit** in `DATA_SOURCES.md`.

# Rules For AI Assistants

- **Never introduce anything that requires payment. See the fixed rule above.**
- Always read `PROJECT_CONTEXT.md` before coding.
- Always read `AI_CHANGELOG.md` before coding.
- Always read `BUG_TRACKER.md` before coding.
- Never remove existing functionality without explaining why.
- Preserve working features.
- Make targeted changes and avoid large rewrites unless explicitly justified.
- Update `AI_CHANGELOG.md` after every coding session.
- Update `BUG_TRACKER.md` when fixing or discovering bugs.
- Leave clear instructions for the next AI assistant.

# Existing Documentation Inventory

These files existed before the current documentation-preservation pass and must be treated as project history:

- `AI_CONTEXT.md`: Detailed AI handoff notes, architecture, feature history, design decisions, known limitations, and session log. This is the richest historical record and must be preserved.
- `AI_CHANGELOG.md`: Shared AI session log introduced for cross-assistant collaboration. New AI work should append entries rather than replacing prior entries.
- `BUG_TRACKER.md`: Shared active/fixed/regression bug tracker. Existing "Do Not Reintroduce" items should be preserved unless they are intentionally superseded with explanation.
- `PROJECT_CONTEXT.md`: Permanent source of truth for project direction, requirements, and assistant rules.
- `README.md`: Public-facing project README. Some implementation details in this file may lag behind `AI_CONTEXT.md`; when conflicts exist, mark outdated sections clearly instead of deleting useful history.

Preservation rules:

- Do not restart or replace AI documentation when improving it.
- Preserve previous decisions, completed work, known bugs, limitations, and design choices.
- Reorganize only when it improves readability and keeps the historical meaning intact.
- Mark outdated information explicitly and point to the current source of truth.
