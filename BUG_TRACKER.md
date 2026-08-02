# Active Bugs

No active bugs. (One pre-existing, non-blocking test finding is tracked
below rather than in Active Bugs, since it needs a governance decision, not
a code fix — see "no-paid-dependency guard flags cloudscene in historical
snapshots".)

---

# Recently Fixed Bugs (2026-08-01/02 — live-app browser bugs)

---

Bug: header nav tabs became unreachable at common laptop widths (1200-1366px)
Priority: HIGH
Affected Files: `css/style.css`, `js/map.js`, `tests/e2e_smoke.mjs`
Root Cause: The "More" overflow pattern (a bottom sheet mirroring tabs that
don't fit in the header bar) only activated below a hardcoded 700px
breakpoint. Above that, `#header-tabs` hides its own scrollbar
(`scrollbar-width:none`), so when the strip didn't fit — which it hadn't,
at 1200/1280/1366px, since an eighth tab ("AI Stocks") was added after a
prior session's own padding-tightening fix was tuned for seven tabs — the
overflowing tabs (e.g. About, Pipeline) were reachable only by an
undiscoverable horizontal drag, with zero visual indication more tabs
existed. Confirmed via `tests/e2e_smoke.mjs`'s "Header fit across widths"
scenario, which had been reporting the clipping all along without anyone
reading past "no overlap."
Fix: Two layers. (1) Root cause: widened the existing tab-padding/badge-hide
tightening from a 1200px to a 1400px breakpoint so all 8 tabs fit normally
at common desktop/laptop widths again, instead of re-deriving a hardcoded
pixel threshold from today's tab count (the exact thing that went stale
last time). (2) Safety net: the "More" collapse now also triggers from a
real `scrollWidth > clientWidth` measurement (`updateNavOverflow()` in
map.js, re-run on resize and on webfont swap) rather than only the fixed
700px breakpoint, so a 9th tab, a longer label, or browser zoom degrades
gracefully into the same tested, accessible overflow sheet instead of
silently clipping again. Updated `tests/e2e_smoke.mjs` with a `clickTab()`
helper so scenarios that vary viewport width keep working whether a tab is
in the visible strip or behind "More".
Fixed By: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
Date Fixed: 2026-08-02
Status: Fixed

---

Bug: "Counties Researched" stats overcounted by including descriptive-only records
Priority: HIGH
Affected Files: `js/home.js`, `js/analytics.js`, `js/map.js`
Root Cause: The 2026-07-27 reclassification sweep introduced
`research_status=descriptive_only` for 597 counties that hold a general
description but no actual policy research, and added `researchedCount()` /
`coveragePct()` in `js/constants.js` specifically so no user-facing
"researched" claim would count them. Several call sites predating (or
written alongside, in one case) that fix never adopted it and kept using
the raw in-database count instead: the Home page's headline "Counties
Researched" KPI card and freshness-bar sentence (showing 1,467 instead of
870 — a 69% overstatement), the same KPI card on the Analytics page (whose
own hero subtitle two lines above it *did* use the fix — an internal
inconsistency on one screen), the map legend's coverage note, and the
About page's "Data Quality" panel, where it was especially visible: that
panel showed "1,467 Counties researched" and "2,273 Not yet researched" on
the same screen, which don't sum to 3,143 and directly contradicted the
correctly-computed "28% Coverage" cell right next to them.
Fix: Switched all of the above to `window.researchedCount()` (with the
existing in-database count as a fallback for older metadata files, matching
the pattern already used correctly elsewhere). Also ran
`data/refresh_platform_metadata.py`, which was itself stale (its own output
had drifted from `map_data.json`) so `validate_platform_metadata.py` now
reports 0 warnings instead of 3.
Fixed By: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
Date Fixed: 2026-08-02
Status: Fixed

---

# Recently Fixed Bugs (2026-07-30 — Windows test-suite portability)

---

Bug: facilities index freshness check crashes or silently misreports on Windows
Priority: MEDIUM
Affected Files: `data/build_facilities_index.py`
Root Cause: Three separate file reads in this script relied on Windows'
default locale encoding (cp1252) instead of UTF-8. `load_master()`'s
`open(MASTER)` silently mangled non-ASCII county names (e.g. "Doña Ana
County, NM") when read on Windows, making the `--check` freshness
comparison report the committed `facilities_index.json` as stale even
though it was correct and current the whole time.
`fields_referenced_in_js()`'s two `read_text()` calls crashed outright with
`UnicodeDecodeError` reading `js/pipeline.js`/`js/jurisdiction.js` (which
contain em-dashes). This had never surfaced before because every prior
session ran on Linux/Mac, where the default encoding is already UTF-8.
Fix: Added explicit `encoding="utf-8"` to all four reads/writes in this
file (`load_master`, both `fields_referenced_in_js` reads, the `--check`
comparison read, and the `write_text` call — the last one was coincidentally
harmless before since cp1252<->UTF-8 mojibake happens to round-trip
losslessly for this file's specific bytes, which is not guaranteed for all
future data).
Fixed By: Claude Companion
Date Fixed: 2026-07-30
Status: Fixed

---

Bug: no-paid-dependency guard crashes on Windows (4 of its own checks)
Priority: MEDIUM
Affected Files: `tests/test_no_paid_dependencies.py`
Root Cause: ~17 `read_text()` calls across this file had no explicit
encoding, so on Windows they read under cp1252 instead of UTF-8. Four
checks (`test_cost_audit_documented`, `test_fixed_rule_is_stated_in_governance_docs`,
`test_no_orphaned_workflow_secrets`, `test_tile_independence_documented`)
crashed with `UnicodeDecodeError` reading docs containing em-dashes. A
fifth check (the Census-key skip-path assertion in
`test_census_key_is_required_and_degrades_gracefully`) failed silently
(not a crash) because the em-dash in its expected string literal never
matched the mojibake produced by decoding the real source file under
cp1252.
Fix: Added explicit `encoding="utf-8"` to all `read_text()` calls in this
file (kept `errors="replace"` where it already existed, now combined with
the correct encoding).
Fixed By: Claude Companion
Date Fixed: 2026-07-30
Status: Fixed

---

Bug: data-loading test crashes on Windows with a doubled drive letter
Priority: MEDIUM
Affected Files: `tests/test_data_loading.mjs`
Root Cause: `ROOT` was built via `new URL('../', import.meta.url).pathname`.
On Windows, a `file://` URL's `.pathname` keeps the WHATWG leading slash
(e.g. `/C:/Users/bobby/repos/test1/`), which is not a valid native Windows
path. Node's internal path resolution (inside `readFileSync`) then
resolves that leading `/` against the current drive, doubling the drive
letter into `C:\C:\Users\bobby\repos\test1\js\map.js` and crashing with
ENOENT. Never surfaced before because this suite had never run on Windows.
Fix: Replaced the manual `.pathname` construction with Node's
`fileURLToPath()`, which correctly converts a file URL to a native path on
every platform.
Fixed By: Claude Companion
Date Fixed: 2026-07-30
Status: Fixed

---

Finding (ratified): no-paid-dependency guard flags cloudscene in
historical snapshots
Priority: LOW
Affected Files: `tests/test_no_paid_dependencies.py`,
`data/facilities_version_history/2026-07-12T*.json` (8 files)
Root Cause: The guard scans every tracked file for paid-service names,
including `data/facilities_version_history/`, which stores dated,
point-in-time audit snapshots. Eight snapshots from 2026-07-12/13 (before
the Cloudscene integration was removed on 2026-07-27) legitimately contain
the string `cloudscene`, since that's what the pipeline actually used at
that point in time.
Decision: Historical snapshots are exempted (already implemented via
`PATH_EXEMPT` in `tests/test_no_paid_dependencies.py`, ratified 2026-07-30
by Bobby). Rationale: these files are write-once archives, never re-read
as config or executed, so scanning them protects nothing — a real
reintroduction of a paid service would appear first in a live source
(an adapter, `facility_sources.json`, `requirements.txt`, a workflow),
all of which remain fully scanned. Leaving 8 permanent false positives in
place would only train reviewers to expect and ignore "cloudscene" hits
from this check, which is worse for actually catching a real
reintroduction than a scoped, documented exemption. Comment in
`tests/test_no_paid_dependencies.py` spells out the reasoning in full.
Fixed By: Claude Companion (implementation), ratified by Bobby 2026-07-30
Date Fixed: 2026-07-30
Status: Resolved

---

# Recently Fixed Bugs (2026-07-27 — data integrity sweep)

---

Bug: Counties with active moratoriums labeled "Pro-Development Hub"
Priority: CRITICAL
Affected Files: `data/restrictions_raw.json`, `data/map_data.json`
Root Cause: Historical sweep scripts added counties in bulk at level -1 with
descriptive prose rather than policy research. Five of the six Kansas counties
with adopted data center moratoriums were labeled Pro-Development Hub. Harvey
County KS was described by its BNSF railyard and Mennonite college while the
commission had adopted a moratorium running through the end of 2028.
Fix: Seven records corrected to level 4 (Harvey, Geary, Leavenworth, Saline,
Sedgwick KS; Santa Fe NM; Linn IA) and two added that were missing entirely
(Lyon KS, Imperial CA). Level 4 count 5 -> 14.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

Bug: 100% of records labeled "verified" had never been verified
Priority: CRITICAL
Affected Files: `data/validate_all.py`
Root Cause: `confidence_score()` derives its label purely from citation
properties — domain tier, source count, URL presence, freshness — then called
anything scoring >=80 "verified". That measures how WELL-CITED a record is, not
whether anyone confirmed it. All 152 records labeled "verified" carried
`pipeline_verified: false`.
Fix: The label is now gated on `pipeline_verified`. Well-cited but unconfirmed
caps at "high". Falsely-verified records: 152 -> 0.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

Bug: 16 counties carried the wrong name for their FIPS code
Priority: CRITICAL
Affected Files: `data/restrictions_raw.json`
Root Cause: Records held a valid FIPS with a different county's name, so the map
colored the correct polygon (it keys on FIPS) while the detail panel, search and
reports all named a different county — misattributing the policy. FIPS 21117 was
"Knott County" but is Kenton County.
Fix: All 16 corrected against `data/county_names.json`. Each flagged in notes
because the title and description were written about the wrong county and need
re-researching. Validator criticals: 16 -> 0.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed (names corrected; 16 descriptions still need re-research)

---

Bug: Coverage claim counted county descriptions as policy research
Priority: High
Affected Files: `index.html`, `js/home.js`, `js/analytics.js`, `js/map.js`,
`js/constants.js`, `data/refresh_platform_metadata.py`
Root Cause: 597 level -1 records met none of the three criteria in the platform's
own Pro-Development Hub definition. Counting them as researched inflated the
headline claim to "1,465+ researched jurisdictions / 47% coverage" when the true
researched figure was 870 / 28%. The map legend's "1,678 counties not yet
researched" was hardcoded and understated the real 2,273.
Fix: Those 597 downgraded to level 0 with `research_status: "descriptive_only"`,
retaining all original content. Metadata reports `counties_researched` separately
from `counties_in_database`. Every user-facing surface now reads the honest
figure; the legend reads from metadata instead of a literal.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

Bug: process_data.py silently dropped provenance fields
Priority: Medium
Affected Files: `data/process_data.py`
Root Cause: `confidence`, `confidence_score`, `source_tier` and `research_status`
were not copied from the raw file into `map_data.json`, so a low-confidence
record arrived at the frontend indistinguishable from a verified one.
Fix: All four fields now carried through.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

Bug: A test asserted hardcoded data values rather than behavior
Priority: Low
Affected Files: `tests/test_frontend_core.mjs`
Root Cause: `platformStat counties` asserted a literal 1465 and `coveragePct`
a literal 47, so the test checked the DATA rather than the accessor and broke on
any legitimate county addition.
Fix: Both now read expected values from `platform_metadata.json`, with
coveragePct compared against `counties_researched_pct` rather than the inflated
`counties_coverage_pct`.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

# Recently Fixed Bugs (2026-07-27 — Economic Intelligence feature)

These four were found by driving the new Economy feature in a real browser. All
were introduced during this feature's development and fixed before merge; they
are recorded because each represents a trap that would recur.

---

Bug: Chart SVG forced a 593px minimum width and clipped on mobile
Priority: High
Affected Files: `css/economy.css` (`.econ-chart-svg`, `.econ-wrap`)
Root Cause: An `<svg>` with a `viewBox` has an intrinsic aspect ratio. Combined
with a fixed height that becomes a min-content **width**, which propagated up and
made the whole trends section 593px min-content. On a 390px viewport that
overflowed and was silently clipped by `.page-view { overflow-x: hidden }`.
Compounding it: `.page-view` is a **column** flex container, so the `min-width: 0`
already on `.econ-wrap` did nothing — that property only relaxes the automatic
minimum on the main axis, which is vertical there.
Fix: `max-width: 100%` on the chart svg (removes it from intrinsic width
contribution; the ResizeObserver redraw keeps the viewBox matched), plus
`max-width: min(1500px, 100%)` on `.econ-wrap` and `max-width: 100%` on its
children as a structural cap.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

Bug: State choropleth indexed zero regions
Priority: High
Affected Files: `js/economy-view.js` (`featureKey`, `style`, `eachFeature`)
Root Cause: County topology ids are 4–5 digits and pad to 5; **state** ids are
already 2 digits. Applying `String(feature.id).padStart(5,'0').slice(0,2)`
uniformly turned `"51"` into `"00051"` then `"00"`, so every state resolved to the
same non-existent key. The layer rendered 56 features and indexed 0 records, so
the state view was blank with no error.
Fix: `featureKey()` normalises per geography — counties pad to 5, states pad to 2.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

Bug: Explorer map hover and click did nothing
Priority: High
Affected Files: `js/economy-view.js` (Leaflet map options)
Root Cause: The explorer was created with `preferCanvas: true`. Polygons drew
correctly but pointer hit-testing never registered, so tooltips and county
selection were dead. `AI_CONTEXT.md` already documents the opposite choice for the
main county map — "preferCanvas: false to keep SVG rendering (better for
interaction)" — and the same reasoning applies here.
Fix: `preferCanvas: false`. The main map already demonstrates ~3,200 SVG county
paths perform acceptably.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

Bug: KPI strip and all charts rendered empty under the test fixture
Priority: Medium
Affected Files: `js/economy.js` (`_url`, `GENERATED`)
Root Cause: The `__ECONOMY_FIXTURE_BASE__` test hook redirected **every**
economy file, including `series_config.json`. That file is hand-maintained
configuration and exists only in `data/economy/`, so the fetch 404'd and the
config came back empty. The KPI strip and every chart silently rendered nothing
while the explorer, signals, and Home pulse all still worked — making it look like
a chart bug rather than a config-loading bug.
Fix: Only files the pipeline *generates* may be redirected (`GENERATED` set).
Configuration always loads from `data/economy/`.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

# Pre-existing Gap Closed (2026-07-27)

---

Gap: Header tablist had no keyboard arrow navigation
Priority: Medium (accessibility)
Affected Files: `js/map.js` (`initNavTabs`)
Root Cause: `#header-tabs` has carried `role="tablist"` with `role="tab"` children
for a long time. The ARIA tabs pattern requires Left/Right (and Home/End) to move
between tabs, with the tablist forming a **single** tab stop. None of that
existed — all seven tabs were separate tab stops and arrow keys did nothing, so
the markup promised a keyboard interaction the app did not implement.
Fix: Roving-tabindex arrow navigation with Home/End, synced to `aria-selected` via
a MutationObserver so it stays correct when `switchTab()` changes the active tab.
Only visible tabs participate, so the mobile "More" overflow is skipped. This
fixes the whole tablist, not only the new Economy tab.
Fixed By: Claude Code (claude-opus-5)
Date Fixed: 2026-07-27
Status: Fixed

---

# Recently Fixed Bugs (2026-07-25 — Phase 1 accuracy pass)

---

Bug: Map legend missing "Not yet researched" entry
Priority: High
Affected Files: `js/map.js` (renderLegend)
Root Cause: The dark `noData` background color used for counties not in the database had no corresponding legend entry. Users had no way to know what the dark counties represented.
Fix: Added explicit "Not yet researched — 1,678 counties — no data collected" legend item with the `noData` swatch color and a coverage note showing how many counties have been researched.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: Misleading "every US county / Updated daily" claim throughout UI
Priority: High
Affected Files: `index.html` (static skeleton), `js/home.js` (skeleton + loaded states)
Root Cause: Hero text claimed the platform covers "every US county" and data is "Updated daily." In reality only 1,465 of 3,143 US counties (46.6%) have been researched, and policy data is manually curated — not automatically updated.
Fix: Replaced with "1,465+ researched jurisdictions. Policy data manually verified from official government sources." everywhere. Removed "Live" from "Live Intelligence Platform" badge.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: Analytics tab "Real-time summary" language
Priority: Medium
Affected Files: `js/analytics.js` (buildAnalyticsDashboard)
Root Cause: Hero subtitle said "Real-time summary of US data center and AI policy coverage." Policy data is manually curated, not real-time.
Fix: Updated to "Policy coverage summary derived from X manually researched jurisdictions (Y% of 3,143 US counties). Policy data verified from official government sources — not real-time."
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: TradingView labeled "Real-time" in data sources table
Priority: Medium
Affected Files: `js/analytics.js` (data sources table)
Root Cause: Data sources table listed TradingView update frequency as "Real-time." TradingView's free tier provides 15-minute delayed quotes.
Fix: Changed to "Delayed 15 min."
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: Stocks nav card claimed "50+ publicly traded AI companies"
Priority: Low
Affected Files: `js/home.js` (stocks nav card — skeleton and loaded states)
Root Cause: Nav card said "50+ publicly traded AI companies" but ai_companies.json has exactly 44 public companies.
Fix: Updated to "44 publicly traded AI companies — market data via TradingView (delayed 15 min)."
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: SEVERITY labels "High Restrictions" and "No Restrictions" imprecise
Priority: Low
Affected Files: `js/map.js` (SEVERITY, LEVEL_LABELS objects)
Root Cause: "High Restrictions" understates severity; "No Restrictions" implies certainty when the meaning is "researched and found no restrictions." "Pro / Incentive Hub" was unnecessarily slash-heavy.
Fix: Renamed: "High" → "Significant Restrictions"; "No Restrictions" → "No Known Restrictions"; "Pro / Incentive Hub" → "Pro-Development Hub". Updated LEVEL_LABELS to match.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

# Recently Fixed Bugs (2026-07-25)

---

Bug: AI Stocks — Wrong exchange prefix for META, PATH, VEEV, UBER
Priority: High
Affected Files: `js/stocks.js` (AI_COMPANIES array, lines 28/35/45/63)
Root Cause: Four tickers had wrong exchange prefixes: `NYSE:META` (should be `NASDAQ:META`), `NASDAQ:PATH` (should be `NYSE:PATH`), `NASDAQ:VEEV` (should be `NYSE:VEEV`), `NASDAQ:UBER` (should be `NYSE:UBER`). Wrong prefixes caused TradingView widgets to either fail to load or display incorrect data.
Fix: Corrected all four tickers. Updated `NEWS_ALIASES` keys to match. Updated `data/ai_companies.json`.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — renderDetailTab() company lookup never matched
Priority: High
Affected Files: `js/stocks.js` (renderDetailTab, ~line 538)
Root Cause: `AI_COMPANIES.find(c => c.symbol === sym)` where `sym = stocksState.selectedSymbol` = "NASDAQ:NVDA", but `.symbol` field is just "NVDA". The find always returned undefined, breaking the Fundamentals and Profile tabs.
Fix: Added `getCompanyByTicker(ticker)` helper that looks up by `.ticker` (the full "EXCHANGE:SYMBOL" format). Replaced all broken `.find(c => c.symbol === sym)` calls.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Yahoo Finance URLs contained encoded exchange prefix
Priority: Medium
Affected Files: `js/stocks.js` (renderDetailTab, ~lines 544-548)
Root Cause: `encodeURIComponent(sym)` where `sym = "NASDAQ:NVDA"` → URL became `finance.yahoo.com/quote/NASDAQ%3ANVDA/` which returns a 404.
Fix: Added `getPlainSymbol(ticker)` helper that strips the exchange prefix. All Yahoo Finance links now use just the plain symbol (e.g., "NVDA").
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Compare preset not persisted across sessions
Priority: Medium
Affected Files: `js/stocks.js` (bindStocksEvents, compareSelect handler ~line 779)
Root Cause: The `compareSelect` change handler updated `stocksState.comparePreset` and called `renderChart()` but never called `stocksSavePrefs()`. On page reload, the comparison always reset to "None".
Fix: Added `stocksSavePrefs({ comparePreset: stocksState.comparePreset })` to the handler.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Heatmap section misleadingly labeled "AI Market Heatmap"
Priority: Low
Affected Files: `js/stocks.js` (buildStocksUI), `css/stocks.css`
Root Cause: The TradingView `stock-heatmap` widget was configured with `dataSource: 'SPX500'` (the S&P 500 universe), but the heading said "AI Market Heatmap", implying it showed AI stocks specifically.
Fix: Renamed to "US Market Heatmap" with subtitle "S&P 500 by sector and market cap".
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Theme observer re-rendered all widgets on every DOM mutation
Priority: Medium
Affected Files: `js/stocks.js` (initStocksThemeObserver)
Root Cause: The MutationObserver fired on any `data-theme` or `class` attribute change and immediately re-rendered all 5 TradingView widgets, even if the theme didn't actually change (e.g., from a CSS class toggle for something unrelated).
Fix: Added last-theme tracking (`_lastTheme`) to short-circuit if the theme is unchanged. Added 150ms debounce. Only rerenders lazy-loaded widgets that have already been rendered.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Nested interactive elements (span[role="button"] inside button)
Priority: Medium
Affected Files: `js/stocks.js` (renderCompanyGrid), `css/stocks.css`
Root Cause: The old card grid used `<button class="stocks-co-card">` containing `<span role="button" tabindex="0" class="stocks-fav-star">`. Nested interactive elements are invalid HTML and cause screen reader / keyboard focus issues.
Fix: Replaced card grid entirely with a semantic `<ul>/<li>` watchlist row layout. Each row has two separate `<button>` elements (company select + favorite star) as siblings — no nesting.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — News tab did not filter future-dated or duplicate articles
Priority: Low
Affected Files: `js/stocks.js` (renderNewsTab)
Root Cause: (1) Articles with `published_at` dates in the future were shown. (2) Articles with duplicate URLs or titles could appear multiple times. (3) Articles with non-HTTP URLs were used in `href` attributes (potential XSS vector).
Fix: Added future-date filter (`pubDate > today`), URL scheme validation (`http://` or `https://`), and deduplication by URL and normalized title.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

# Recently Fixed Bugs (pre-2026-07-25)

---

Bug: togglePoliticalRiskLayer() references undefined variable `countyLayer`
Priority: Medium
Affected Files: `js/map.js` (line ~991)
Root Cause: `togglePoliticalRiskLayer()` was calling `countyLayer.setStyle(...)`, but `countyLayer` is never defined. The correct variable is `countyGeoLayer`.
Fix: Replaced `countyLayer` with `countyGeoLayer`; also added re-apply of `selectedCountyStyle()` to preserve selected county outline after restyle.
Discovered By: Claude Code (claude-sonnet-4-6) during ARCGIS_FEATURE_GAP_AUDIT pass
Date Discovered: 2026-07-18
Fixed By: Claude Code (claude-sonnet-4-6) — Phase 2 session
Date Fixed: 2026-07-18
Status: Fixed

---

Bug: Legend panel position not persisted to localStorage across sessions
Priority: Low
Affected Files: `js/map.js` (endLgDrag, initLeafletMap)
Root Cause: `lgSavedPos` was updated on drag but never written to localStorage. Filter panel (`fp-pos`) was already persisted correctly, but legend was missed.
Fix: Added `localStorage.setItem("lg-pos", ...)` in `endLgDrag`; added `lg-pos` read in the init block.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

# Recently Fixed Bugs (2026-07-16)

---

Bug: Mobile detail-sheet close button (×) does not respond to tap
Priority: High
Affected Files: `js/map.js`, `css/style.css`
Root Cause: Two compounding issues. (1) The `#detail-panel` had no `pointer-events: none` when off-screen (`translateY(110%)`), so element geometry could intercept touches in edge cases. (2) The detailClose listener only called `closeMobileSheet()` (class removal) without clearing `selectedFips` or resetting county style; additionally, iOS Safari sometimes swallows click events on elements inside Leaflet's map context before they reach the button. A `touchend` handler was present on `#measure-clear-btn` but was missing the crucial `touchstart` preventDefault to block Leaflet's own gesture recogniser from consuming the gesture first.
Fix: (1) Added `pointer-events: none; visibility: hidden` to the closed-state `#detail-panel` CSS in the mobile media query; restoring both on `.sheet-open`. (2) Replaced `closeMobileSheet` listener on detailClose with `requestCloseDetailSheet()` — a single function that also clears `selectedFips` and resets county style. (3) Added explicit `touchstart` (stopPropagation) + `touchend` (preventDefault + stopPropagation) handlers on the close button.
Testing Performed: Code inspection; confirmed correct CSS specificity and JS call chain.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

Bug: "Click map to start" empty-state card floats visibly on mobile load
Priority: Medium
Affected Files: `css/style.css`
Root Cause: `#detail-panel` is `position: fixed; transform: translateY(110%)` on mobile. While `translateY(110%)` positions the panel off-screen, the element had no `pointer-events: none; visibility: hidden` guard in the closed state. On some iOS Safari viewport sizes the panel top-edge could be visible near the bottom of the map area, and ghost-touches were still being absorbed by the panel.
Fix: Added `pointer-events: none; visibility: hidden` to `#detail-panel` in `@media (max-width: 700px)`, and `pointer-events: auto; visibility: visible` to `#detail-panel.sheet-open`. `visibility` uses a `transition: visibility 0s linear Xs` delay so it hides only after the slide-down animation finishes and appears immediately on open.
Testing Performed: Code inspection.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

Bug: GIS toolbar buttons overlap the county bottom-sheet header and close button on mobile
Priority: High
Affected Files: `css/style.css`, `js/map.js`
Root Cause: `#map-gis-bar` (`z-index: 450`, `position: absolute`) is inside `#map-container`. `#detail-panel.sheet-open` was `z-index: 500` (already raised in PR #100). However, on some iOS Safari versions stacking context rendering for position:fixed children of position:fixed parents may not strictly follow z-index order, allowing the GIS bar to visually or touch-intercept the sheet header. Additionally, there was no mechanism to clip the GIS bar height when the sheet was open, so its buttons extended down into the sheet's visible area.
Fix: When the sheet is open, `body.detail-sheet-open` class is added. CSS `body.detail-sheet-open #map-gis-bar { max-height: calc(var(--sheet-top, 30dvh) - 28px); overflow: hidden; }` clips toolbar buttons that would overlap the sheet. `--sheet-top` is set from JS in `openMobileSheet()` (estimated immediately, refined after the 0.28s transition). The `#detail-panel-close` button also gets explicit `pointer-events: auto; position: relative; z-index: 1` so no pseudo-elements or overlays can shadow it.
Testing Performed: Code inspection.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

Bug: Swipe-down gesture on detail sheet handle only checked threshold, gave no visual feedback
Priority: High
Affected Files: `js/map.js`
Root Cause: The prior implementation (added in PR #100) only checked `dy > 60` on `touchend` and called `closeMobileSheet()`. The panel never followed the user's finger during the gesture.
Fix: Replaced the old handle-only handler with `initDetailSheetSwipe()` — a new function called from `init()`. The gesture listens to `touchstart` on both `#detail-panel-handle` and `#detail-header` (excluding interactive children via INTERACTIVE selector), then `touchmove`/`touchend`/`touchcancel` on the panel itself. During drag the panel's `transform: translateY(px)` is set in real-time with `transition: none`. On release: if `dy > 80` OR swipe velocity `> 0.35 px/ms`, a 260 ms `ease-out` animation slides the panel out before calling `requestCloseDetailSheet()`; otherwise the panel snaps back to `translateY(0)` in 240 ms. `_sheetClosing` flag prevents re-entrant calls during the animation.
Testing Performed: Code inspection; node syntax check passed.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

# Fixed Bugs

Bug: Map Layers panel closes when clicking outside on desktop
Solution: Added `if (window.innerWidth > 700) return;` guard inside `onOutsideTap` in `initFilterPanelControls()`. Matches existing 700px CSS breakpoint. Mobile tap-to-close preserved.
Files Changed: `js/map.js`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Layer toggles only work once — clicking a toggle twice has no visible effect
Solution: Added `e.preventDefault()` to the desktop `click` handler on each `.filter-row` label inside `renderFilterPanel()`. The browser's native label→input click-forwarding was dispatching a second synthetic click on the wrapped checkbox, which toggled `input.checked` via pre-activation, bubbled back through the label, and fired `handleToggle` a second time — undoing the first toggle. `e.preventDefault()` stops the native forwarding so each user click results in exactly one `handleToggle` call.
Files Changed: `js/map.js`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Orange county outline trail appears when click-dragging across the map on desktop
Solution: Added drag-guard state variables (isMouseDown, isDraggingMap, suppressClickUntil, hoveredCountyLayer). Hooked Leaflet dragstart/dragend/mousedown/mouseup. mouseover/mousemove return early when drag is in progress. clearHoveredCounty() called on dragstart and dragend.
Files Changed: `js/map.js`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Filter panel toggles non-interactive on iOS Safari
Solution: Replaced document-level change listener with per-row touchend handler that calls handleToggle() directly, bypassing iOS Safari's broken label→input click-forwarding when -webkit-user-select:none is set on the label.
Files Changed: `js/map.js`, `css/style.css`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Filter panel overlapping search bar on mobile
Solution: Dynamic maxHeight capping in openFilterPanel() using map-container.getBoundingClientRect().height.
Files Changed: `js/map.js`
Fixed By: Claude Code
Date: 2026-07-09

Bug: Filter panel at wrong stacking level — iOS touch hit-area clipped by overflow:hidden ancestor
Solution: Moved #filter-panel and #filter-panel-backdrop to body level (outside #app and #map-container). Both now position:fixed in root stacking context.
Files Changed: `index.html`, `css/style.css`, `js/map.js`
Fixed By: Claude Code
Date: 2026-07-09

# Do Not Reintroduce

- Do not let Leaflet panes render above application UI controls. Preserve the `#leaflet-map` stacking/isolation behavior documented in `AI_CONTEXT.md`.
- Do not lose the selected county highlight after toggling layers. Re-apply selected county styling after broad county style resets.
- Do not regress mobile map usability. Detail panels, layer controls, legend behavior, and dashboard collapse must remain usable on phone-sized screens.
- Do not replace verified or vendored dependencies with CDN-only dependencies without documenting the deployment tradeoff.
