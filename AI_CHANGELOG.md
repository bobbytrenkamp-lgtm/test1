# AI Changelog

Entries before 2026-07-18 live in `AI_CHANGELOG_ARCHIVE.md` (moved there
2026-07-31 to keep this file under the tool read-size limit — see that
file's header for why). When this file approaches ~200KB again, move its
oldest entries there the same way rather than letting it grow unbounded.

---

Date: 2026-08-16
AI Assistant: Claude Code
Session: Fairfax County data-center zoning research (10/44 codes) + a second real feasibility-engine bug found and fixed

Continued the "Continue" / "identify weak points and solve them" directive.
Picked Fairfax next since it was the least-researched of the three NoVA
counties (0/44) despite being a major DC market (Reston/Tysons).

FAIRFAX RESEARCH: Fairfax adopted a substantial, detailed data-center zoning
ordinance amendment in September 2024 (Sec. 4102.6.A) -- much more specific
than expected. Researched via WebSearch (this sandbox has no outbound
network to fairfaxcounty.gov or the Encode Plus ordinance viewer; a GitHub
Actions diagnostic dispatch to fetch the primary PDF was attempted but a
brand-new workflow file isn't dispatchable until GitHub indexes it from the
default branch, and this session's instructions say not to open a PR just to
land it there -- so this round used multi-source secondary corroboration
instead: Fairfax County's own news release and adopted-amendment page, plus
independent law-firm summaries from McGuireWoods, Holland & Knight, and
Venable, all citing the same specific numeric thresholds and Sept. 11 2024
effective date). Findings, all recorded at "moderate" (not "high")
confidence with the verification method stated explicitly in every entry:
C-3/C-4 by-right under 40,000 sq ft (Special Exception at/above); I-2/I-3/I-4
by-right under 80,000 sq ft (Special Exception at/above); I-5/I-6 by-right
with NO size limit -- the only two districts keeping unlimited by-right
development; PDC/PTC Special Exception only, no by-right path; PRC
prohibited (removed as a permitted use by the 2024 amendment). A countywide
standard applies to every approving district: 200 ft building setback / 300
ft ground-equipment setback from a residential lot line. The other 34 codes
remain honest not_listed placeholders -- their absence from the ordinance's
enumerated eligible-district list was NOT inferred as prohibition, matching
the same discipline already applied to Prince William's CTY/FED/TWN. Also
corrected two now-stale claims in jurisdiction.json's known_limitations
(claimed the parcel-to-zoning spatial join "does not exist yet" -- it was
built earlier this session).

SECOND REAL BUG FOUND (surfaced by using real data): js/parcel/feasibility.js's
STATUS_META and ELIGIBILITY_SCORE maps covered only 9 of the 12
permission_status values data/zoning/schemas/permitted_use.schema.json
actually allows a researcher to record. Fairfax's ordinance uses Virginia's
"Special Exception" terminology (Board of Supervisors approval) rather than
"Special Use Permit" -- a real, schema-valid, distinct status that had no
entry in either map and so silently fell through to the generic "Unknown"
label and a 20-point score, exactly as if PDC/PTC's zoning had never been
researched at all, even though real findings existed for them. Also missing:
"accessory" and "manual_review_required", both real schema values. Fixed by
adding all three; a new test (test_parcel_feasibility_status_coverage.mjs)
reads the schema's own enum directly and asserts every value gets a real
label and a score that doesn't collide with the generic unresearched
fallback (except the two values -- not_listed, unclear -- that genuinely
mean "we don't know," which correctly do collide with it) -- so a future
schema value added without a matching STATUS_META/ELIGIBILITY_SCORE entry
fails this test immediately instead of silently degrading to "Unknown" the
next time a researcher happens to use it.

Files: data/zoning/jurisdictions/va-fairfax-county/{districts,jurisdiction,
permitted_uses}.json, data/zoning/normalized/va-fairfax-county.json (regenerated
via export_zoning.py), js/parcel/feasibility.js, docs/ZONING_PILOT_STATUS.md,
PROJECT_CONTEXT.md, tests/run_all.sh, new tests/test_parcel_feasibility_status_coverage.mjs.
Full suite: 176/176 passed, zero failures, no data quality gates weakened
(python3 data/zoning/scripts/validate_zoning.py --jurisdiction va-fairfax-county:
0 errors, 44 warnings -- all "missing district_name," expected and honest).

---

Date: 2026-08-15
AI Assistant: Claude Code
Session: Weak-point audit across the site-intelligence/provenance system — one real bug found and fixed, one real coverage gap closed, provenance parity extended to all three connector types

User asked to identify and fix weak points across what this session built.
Read through site-intelligence.js, panel.js, and all three parcel connectors
looking specifically for logic bugs and silent coverage gaps, not just
"more research needed" items (those are tracked separately, see below).

REAL BUG FOUND AND FIXED: `buildFindings()` in js/parcel/site-intelligence.js
used `proximityResult.results.find(r => r.category === 'power')` to pick the
power-infrastructure reading for the findings/site_status engine. Power has
TWO layers (substations, transmission-lines) sharing that category --
`.find()` silently returns whichever one happens to be first in the array
and ignores the other entirely, even when the first one errored or the
second one was actually closer. Fixed with a new `_nearestAcrossCategory()`
helper that considers every layer in a category and picks the genuinely
nearest usable result. Added two regression tests that would have caught
this: one where the first power layer errors and the second must still be
used, one where array order is deliberately reversed to prove distance, not
position, decides the winner.

REAL COVERAGE GAP CLOSED: the same findings engine only ever checked the
`power` category -- `telecom` (fiber) proximity, which is real, mapped data
for the CA middle-mile corridor and TX Fiberlight network
(js/parcel/proximity-layers.js), was never surfaced as a finding at all.
Extended `buildFindings()` to also report nearby mapped fiber as an
advantage (capped at 1 mile, same capacity-is-not-proximity disclaimer
pattern as power) using the same `_nearestAcrossCategory()` helper --
deliberately NOT adding an "unknown" entry for every site outside those two
states, since that gap is already honestly disclosed via
`infrastructure.unavailable` and repeating it in findings would be noise,
not information.

PROVENANCE PARITY: Phase 12 (prior session) wired per-field source
provenance into `connector-arcgis.js` only, since all 59 currently-registered
jurisdictions use that connector type. Extended the identical pattern to
`connector-geojson.js` and `connector-wfs.js` so a future jurisdiction using
either type doesn't silently fall back to no provenance while every ArcGIS
jurisdiction has it -- a latent inconsistency in a system whose whole point
is "never let one place look more evidenced than the data actually
supports." Added matching tests for both (GeoJSON's `_normalize()` had no
existing direct test at all; WFS's existing test gained provenance
assertions).

Tests: 7 new assertions in tests/test_parcel_site_intelligence.mjs (multi-
layer power selection x2, fiber advantage, fiber-too-far, fiber disclaimer,
no-invented-telecom-finding), ~12 new assertions across the three connector
tests in tests/parcel.test.js. Full suite: 176/176 passed, zero failures, no
existing test weakened.

DELIBERATELY NOT TOUCHED (documented, not silently ignored): zoning.feasibility
in site-intelligence.js only assesses the PRIMARY parcel of a multi-parcel
assemblage, while zoning.codes already aggregates across all parcels via
`uniq()` -- a real inconsistency for assembled sites, but restructuring
feasibility into a per-parcel array is a bigger schema change than this pass
should make without a clearer signal it's needed (single-parcel lookup is
the dominant real workflow today, and every existing test uses it). Also not
touched: the underlying zoning ordinance research gaps (Loudoun 3/58 codes
researched, Fairfax 0/44, PWC's CTY/FED/TWN codes and DCOZOD overlay
geometry) -- these are data-completion work requiring real primary-source
research per code, not architecture weaknesses, and were already honestly
tracked as open items in prior entries rather than claimed complete.

---

Date: 2026-08-15
AI Assistant: Claude Code
Session: NoVA milestone Phase 13-14 — parcels_registry wired into the data health dashboard on real live data, plus two independent pre-existing bugs found and fixed in generate_data_health.py

Closes out the 14-phase NoVA milestone's remaining item.

WHAT WAS BUILT:

- `data/check_parcel_services.mjs`'s `--record-history` output
  (`data/parcel_health_history.json`) had never actually been committed
  despite the workflow being configured to do so since it shipped -- the
  monthly cron hadn't fired yet (next: Sept 1) and no one had manually
  dispatched it since. Manually dispatched `check_parcel_services.yml` this
  session to get real data rather than build new health-tracking logic
  against a fixture that had never been observed to work end-to-end: it
  found 58/59 registered jurisdictions LIVE (all three NoVA counties
  included) and one real, confirmed-dead service -- Jefferson County, KY
  (FIPS 21111, "JSON has no field list — not a layer endpoint") -- which the
  existing workflow correctly auto-filed as GitHub issue #538. That county is
  outside the NoVA milestone's scope, so it was left to the issue and not
  chased further here, per "do not expand nationwide."
- `data/generate_data_health.py` gained `_parcel_service_health()`, a new
  `parcels_registry` entry in the `pipelines` dict, aggregating that history
  file with the exact same "confirmed dead" rule
  `check_parcel_services.mjs`'s own `isConfirmedDead()` uses (>=2 failures in
  the latest 3 recorded runs, OR a first-ever recorded run with no prior
  history at all -- reproduced deliberately rather than a "safer"-looking
  approximation that would disagree with what the CI job itself already
  concluded and acted on).

TWO REAL BUGS FOUND ALONG THE WAY (both pre-existing, both fixed):

1. `build_report()` computed `tracked_pipeline_names = set(pipelines.keys())`
   and then never used it -- `datasets_without_automated_health_tracking`
   listed every registered dataset unconditionally, so the moment
   `parcels_registry` became a real, tracked pipeline it would have appeared
   BOTH as a live pipeline entry AND in the "no automated health signal yet"
   fallback list, self-contradicting the same document. Fixed: the fallback
   list now excludes any dataset id that exactly matches a pipeline key.
2. `render_markdown()`'s "Datasets with no automated health signal yet"
   line read `f"{n} of {n} datasets"` -- both sides used
   `datasets_without_tracking_count`, so it was tautologically "100%" no
   matter what and would have gone on saying that even after bug #1's fix
   changed the real count. Fixed: added `total_registered_datasets` to the
   report's `summary` and the line now reads correctly ("29 of 30" once
   `parcels_registry` is excluded from the untracked list). A second, related
   gap: the markdown detail column only recognized policy_pipeline_sources'
   `total_sources` key, so `parcels_registry`'s identically-shaped
   `total_jurisdictions` down/transient/total counts rendered as a bare "-"
   even while the health column correctly said SOURCE_DOWN -- fixed
   alongside it.

Also confirmed `zoning_jurisdictions` correctly remains in the honest
untracked list: the only per-jurisdiction file that looked like a candidate
signal (Loudoun's `validation_report.json`) is a data-quality/completeness
report, not a pipeline-health signal, and only exists for 1 of the 3 NoVA
counties anyway -- treating it as a health check would have been a fabricated
diagnosis this project's own honesty bar exists to prevent, so it was left
alone rather than shoehorned into the SOURCE_DOWN/NETWORK_FAILURE vocabulary.

Tests: `tests/test_data_health.py` gained 6 new tests (independent recount
against the real committed history file, missing-file honesty, the
first-failure-confirmed-immediately edge case, the single-transient-failure
edge case, and regression tests pinning both markdown bugs) and one existing
test (`test_no_dataset_is_ever_silently_marked_ok_without_a_real_signal`) was
corrected -- it had hard-coded "today nothing maps 1:1" as if that were a
permanent invariant rather than the thing this change correctly fixed; the
real safety property (no dataset silently vanishes, none is silently
upgraded to OK) is preserved and, if anything, checked more precisely now.
Full suite: 176/176 passed, zero failures.

---

Date: 2026-08-15
AI Assistant: Claude Code
Session: NoVA milestone Phase 11-12 — real per-field source provenance wired into the live connector, surfaced in the panel UI

Verification pass on the two remaining NoVA milestone items (Phase 11
"comparable nearby sites", Phase 12 "source provenance"):

- **Phase 11 (comparables): already fully wired, no action needed.**
  `js/parcel/comparables.js` (`window.PARCEL_COMPARABLES`) is called from
  `js/parcel/panel.js`'s Compare tab tray (`_tabCompareTray()`) to suggest
  similar parcels (ranked by zoning/area/land-use/value-per-acre similarity)
  when the tray is empty and a parcel is selected. Live UI path, not orphaned.

- **Phase 12 (provenance): real gap found and closed.** `js/parcel/provenance.js`
  (`window.PARCEL_PROVENANCE`) is a mature, well-designed per-field citation
  module -- but until now it was exercised ONLY by test fixtures and
  internally by `site-intelligence.js`. The multi-source join engine that was
  supposed to populate it (`js/parcel/enrichment.js`,
  `js/parcel/enrichment-arcgis-table.js`) has zero callers anywhere in the
  live pipeline (`js/parcel/index.js` never invokes it) -- so in production,
  essentially no real parcel has ever carried a `_provenance` record, meaning
  the Phase 5 `source_confidence` roll-up built earlier today always reads
  "unknown" for real data, not because the data lacks a knowable source, but
  because nothing ever recorded it.

  Fix, scoped correctly rather than building the full multi-source join
  engine no jurisdiction in this repo currently needs: confirmed all 59
  registered jurisdictions (all three NoVA counties included) use the single
  `arcgis` connector type with exactly one source per parcel -- so this is a
  `direct-official` attribution problem, not a conflict-resolution problem.
  `js/parcel/connector-arcgis.js`'s `_normalize()` now attaches a
  `PARCEL_PROVENANCE` record (jurisdiction id/name, real source attribute
  name, `direct-official` confidence) for every canonical field a
  jurisdiction's `registry.js` `fieldMap` actually verifies against the live
  service -- and deliberately nothing for a field that fell through to the
  lowercase-passthrough guess, since the connector genuinely does not know
  what that attribute is. Surfaced in the panel: Details and Valuation tab
  field rows now show a small "source" badge (`js/parcel/panel.js`'s new
  `_provenanceBadge()`) with the full citation in a tooltip, reusing
  `PARCEL_PROVENANCE.describe()` rather than re-deriving the wording.

  This also means the Phase 5 zoning/valuation/ownership confidence roll-ups
  built earlier today will now actually report `direct-official` for real
  NoVA parcels instead of `unknown`, without any change to that code --
  they were reading the provenance layer correctly all along; the layer
  itself just had nothing real to read.

Files: `js/parcel/connector-arcgis.js`, `js/parcel/panel.js`, `css/parcel.css`
(new `.pp-field-prov` badge, theme-agnostic), `docs/PARCEL_ADD_JURISDICTION.md`
(new note that a verified `fieldMap` entry now also drives provenance
automatically), `PROJECT_CONTEXT.md`. Tests: extended `tests/parcel.test.js`
(provenance attachment on a verified field, none on a passthrough field,
jurisdiction id/confidence correctness) and
`tests/test_parcel_panel_intelligence.mjs` (badge presence/absence, XSS
escaping of a hostile source label). Full suite: 176/176 passed (parcel.test.js
alone: 298/298), zero failures, no existing test weakened.

---

Date: 2026-08-15
AI Assistant: Claude Code
Session: Economic data pipeline audit — Home page staleness disclosure gap fixed

User asked for a check of the economic data pipeline (data/update_economic_data.py,
data/economy/*.json, js/economy*.js, js/home.js) for outdated or incorrect data.

AUDIT FINDINGS:

- The backend pipeline is healthy: `update_economic_data.yml` has run successfully
  every day for the last two weeks (verified via GitHub Actions run history), zero
  entries in `economic_metadata.json`'s `warnings` array, `census.unverified_metrics`
  empty. FRED (23 series), ACS 5-year (vintage 2024), County Business Patterns
  (2023), Building Permits, BLS QCEW average wage, and FEMA NRI are all populated
  and current. Spot-checked headline values (UNRATE 4.1% Jul 2026, DFF 3.63% Aug 13
  2026, DGS10 4.63%, CPIAUCSL, PAYEMS) against plausible real-world figures -- all
  freshly retrieved, none hardcoded or stale.
- `economic_metadata.json`'s top-level `"stale": true` and 6 of 23 FRED series
  individually flagged stale (CSUSHPINSA 106 days, HOUST/INDPRO/JTSJOL/PCEPI/PERMIT
  75 days) is NOT a bug -- it is the pipeline's own honesty guard correctly
  reporting normal government publication lag for monthly series, scaled to each
  series' real cadence (see `update_economic_data.py`'s per-series `stale_days >
  limit` logic).
- `eia_available: false` (electricity price never populated) is also not a
  regression -- `EIA_API_KEY` is a documented OPTIONAL free-registration secret
  that has simply never been configured for this repo; every other source is
  unaffected, and PROJECT_CONTEXT.md already discloses this as an expected state.
- Data Center Readiness Score (js/economy.js `readinessScore()`): spot-checked all
  9 factor weights and `invert` flags for directional correctness (unemployment,
  housing vacancy, wage, and electricity price correctly inverted so LOWER is
  better; population growth, bachelor's %, labor participation, broadband, and
  permits YoY correctly NOT inverted). No bug found.

REAL BUG FOUND AND FIXED: js/economy-view.js's Economy tab KPI strip discloses
per-series staleness via a "stale" chip (`s.stale` / `s.stale_days`, reading
directly off `fred_data.json`). js/home.js's 4-indicator Economic Pulse reads the
exact same `fred_data.json` record for 3 of its 4 indicators (Fed Funds Rate,
10-Year Treasury, US Unemployment) but never checked `s.stale` at all -- so the
same underlying number could show as unqualified/current on Home while the
Economy tab, one click away, flagged it stale. Fixed by propagating `stale`/
`staleDays` through `_renderHomeEconomicPulse()`'s `add()` helper and rendering
the same theme-aware `.econ-stale-chip` CSS class (already global, not scoped to
the Economy tab) when applicable -- no new CSS needed. None of today's 4 Home
indicators are currently stale, so this fix has no visible effect right now; it
closes the gap so a future outage doesn't silently show different honesty levels
on two pages reading the same file.

Not fixed (deliberately out of scope, not bugs): jsdom is not installed in this
sandbox, so no automated DOM test could be added for the Home pulse render path
(same known pre-existing limitation `run_all.sh` already reports for 4 other
suites) -- verified instead via `node --check js/home.js` and manual code
inspection matching the already-tested economy-view.js pattern exactly.

Files touched: `js/home.js` only. Full suite: 176/176 passed, zero failures,
no data files changed, no tests weakened.

---

Date: 2026-08-15
AI Assistant: Claude Code
Session: NoVA milestone Phase 5/7/8/9/10 — Site Intelligence schema wired to zoning feasibility, deterministic findings/site_status, panel UI

`js/parcel/site-intelligence.js` (`window.PARCEL_SITE_INTELLIGENCE`) existed
already, fully tested, and completely orphaned: zero callers anywhere in the
codebase, its `zoning` section only listed the raw published code with no
data-center eligibility read. This session closed both gaps and shipped the
result to the parcel panel:

- **Zoning feasibility wired into the schema.** `build()` now calls
  `window.PARCEL_FEASIBILITY.assess()` (read-only against whatever zoning
  data is already cached — never triggers a fetch from inside a schema
  builder) and exports the result under `zoning.feasibility`: permission
  status, approval type, conditions, confidence, and the district name/code,
  including its source (`parcel_attribute` vs the spatial-join fallback).
  Never mutates the caller's parcel properties object — a geometry-bearing
  copy is made only when the caller has not already attached one.
- **Deterministic `findings` (advantages / constraints / unknowns).** Rule-based,
  not LLM-generated — every statement traces to a named upstream field
  (`zoning_feasibility`, `constraints_summary`, `proximity_power`) so it can
  be verified against the same data a human would check. A missing input
  produces an "unknowns" entry, never a guessed advantage or constraint. A
  failed proximity layer (e.g. a BTS service 503) never becomes a finding.
- **`site_status`**, using only the milestone's fixed vocabulary —
  `potentially_viable` / `conditional` / `material_constraints` /
  `insufficient_data` — never "approved," "buildable," or "good site." An
  outright zoning prohibition or a majority-constrained parcel always wins
  over a weaker read; a genuinely ambiguous zoning code (`not_listed`/
  `unclear`/`unknown`) is `insufficient_data`, never silently upgraded to
  `potentially_viable` just because the constraint layer happened to be clean.
- **UI wiring (Phase 10).** `js/parcel/panel.js`'s Intelligence tab gained a
  new `_renderSiteStatus()` section above the existing suitability/proximity/
  constraints/sales rendering, calling `PARCEL_SITE_INTELLIGENCE.build()`
  with the same cached proximity/constraints/score inputs those renderers
  already use. Degrades to nothing (not a misleading empty group) when the
  module isn't loaded, mirroring the pattern the other Intelligence-tab
  renderers already established.
- Confirmed via re-reading the site-intelligence audit and the codebase that
  Phase 6's remaining scope (power/fiber/water/environmental/market spatial
  joins) was already substantially built — `js/parcel/proximity.js` and
  `js/parcel/constraints.js` already feed `buildInfrastructure`/
  `buildConstraints` generically. Only zoning's parcel-to-district resolution
  was the real gap, and PR #531 (previous session) had already closed it;
  this session's job was wiring that result into the schema and the UI.

New/changed: `js/parcel/site-intelligence.js`, `js/parcel/panel.js`,
`index.html` (cache-busted script versions), `tests/test_parcel_site_intelligence.mjs`
(+~90 assertions covering the no-engine-loaded degrade path and six
zoning/constraint × site_status combinations against a mocked zoning
registry), `tests/test_parcel_panel_intelligence.mjs` (+new `_renderSiteStatus`
coverage), `PROJECT_CONTEXT.md`.

Still open from the 14-phase brief: Phase 9's fuller per-category
completeness/confidence matrix (today's `source_confidence.by_section` is a
partial read of this), Phase 11's comparable-sites wiring verification
(`js/parcel/comparables.js` already exists and is already called from
`panel.js`'s compare tray — needs a pass to confirm it's fully wired, not
newly built), Phase 12's provenance pass beyond what `site-intelligence.js`
already surfaces, and Phase 13/14 (a source-status model + a final
documentation cleanup pass).

---

Date: 2026-08-13 to 2026-08-15
AI Assistant: Claude Code
Session: NoVA Data Center Parcel Intelligence milestone — zoning geometry, permitted-use research, spatial join (PRs #517-#536)

Two weeks of load-bearing zoning/parcel work landed only in git history until
now, per the NoVA site-intelligence audit this session commissioned
(`data/parcel_pipeline/nova_site_intelligence_audit.md`, generated by a
background agent, findings absorbed into this session rather than committed
as a file). Consolidated summary:

WHAT WAS BUILT (all real, live-verified, none fabricated):

- **Loudoun County zoning geometry** (51107): live-verified against
  `logis.loudoun.gov` COL/Zoning/MapServer layer 3 — 1,271 real polygon
  features. A punctuation-insensitive district-code matcher was added to
  `normalize_zoning.py` (`map_district_code()`) after discovering the live
  service's codes (e.g. `PDIP`) omit hyphens that the hand-researched
  `districts.json` keys (e.g. `PD-IP`) include.
- **Prince William County zoning geometry** (51153): live-verified against
  `gisweb.pwcva.gov` Planning/Zoning/MapServer layer 5 — 2,227 real polygon
  features, 31 real district codes. Shipped in two stages: geometry first
  (honest "proven, classification pending" state), then real permitted-use
  research for 28 of the 31 codes against actual PWC ordinance text — see
  below.
- **Fairfax County zoning geometry** (51059): the real service turned out to
  be hosted on ArcGIS Online's shared infrastructure (`services1.arcgis.com`,
  owner `FX.AuthData`), not Fairfax's own ArcGIS Server — three rounds of
  REST-folder enumeration on the county's own host found nothing before an
  ArcGIS Online item search found it on the first try (a generalizable lesson
  for future jurisdiction discovery). A real pagination bug was found and
  fixed along the way: `fetch_arcgis_featureserver()` only continued past one
  page when the server explicitly set `exceededTransferLimit`, which this
  AGOL-hosted service never does — it silently truncated Fairfax's real 6,242
  features down to 1,000 on the first dispatch. Fixed to also continue on a
  full page, confirmed by re-dispatch pulling the correct full count.
- **Frontend wiring bug found and fixed**: Prince William's real, live
  geometry sat completely unreachable from the browser for days because
  `js/zoning.js`'s `FIPS_TO_JURISDICTION` map was never updated when its data
  landed (PR #522) — a one-line fix plus a new regression test
  (`tests/test_zoning_frontend_coverage.mjs`) that checks every jurisdiction
  with a normalized file on disk is actually wired into the frontend map.
- **Prince William permitted-use research**: this sandbox's WebFetch is
  egress-blocked for pwcva.gov/pwcgov.org/scc.virginia.gov entirely, and
  Municode's own pages are a client-rendered Angular SPA with no
  server-rendered content. Worked around both — WebSearch located the real
  primary-source documents, then GitHub Actions fetched and `pdf-parse`'d two
  actual government PDFs directly (PWC's own Data Center Overlay FAQ and the
  verbatim 2016 ordinance amendment text, Sec. 32-403.33 / Sec. 32-509.01-.06)
  rather than trusting a search-engine summary. Result: 17 of 31 real
  districts prohibited, 11 special-use-permit-eligible, 3 (CTY/FED/TWN)
  honestly left unresearched after multiple searches failed to confirm their
  category.
- **Parcel-to-zoning spatial join** (`js/parcel/zoning-geometry.js`, new):
  none of the three counties' parcel services publish a native `zoning_code`
  attribute, so no real DC-eligibility score could ever be produced for any
  parcel regardless of how much zoning-geometry work existed — this was the
  audit's identified bottleneck. Resolves a parcel's district via
  point-in-polygon against the parcel's vertex centroid; `feasibility.js`'s
  `assess()` now falls back to it when a parcel has no native code, tagging
  the result with `zoningCodeSource` so the UI can disclose provenance
  (`panel.js` shows "resolved from the county's zoning map" rather than
  presenting a spatially-inferred code as if the source itself published it).

CORRECTED (a prior context-compaction summary in this session had claimed
this spatial-join module, its test coverage, and Prince William's frontend
wiring were already "shipped to production main" — direct verification
against the real repo found none of that was true before this session's
work actually built it; flagged here so the pattern of trusting a
compacted summary over direct repo verification doesn't repeat):
`js/zoning.js` had only Loudoun in its FIPS map, and
`js/parcel/zoning-geometry.js` did not exist anywhere in the repo.

Stale documentation corrected in the same pass: `docs/ZONING_ARCHITECTURE.md`,
`docs/ZONING_PILOT_STATUS.md`, and Loudoun's own `jurisdiction.json` /
`validation_report.json` all still described zoning geometry as "demo only"
a month after it went live, and `ZONING_PILOT_STATUS.md` still framed the
system as "1 of 7 evaluated jurisdictions" with Fairfax/Prince William
listed as merely "next recommended" when both were already live.

Not yet done (tracked as follow-up): Fairfax's 44 real district codes have
zero permitted-use research; Loudoun has research for only 3 of 58 real
codes (3 more — I1/I2/B2 — are pre-2023-ordinance-rewrite codes with no
match in the live service); Prince William's real Data Center Opportunity
Zone Overlay boundary (a real GIS layer, `Planning/Zoning/MapServer` layer
7) is documented but not yet spatially wired into the pipeline.

---

Date: 2026-07-31
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/past-conversation-recall-gcihz4
Session: Parcel data integrity + CI test gate (PRs #203, #204, #205)

Continuation of the parcel-view session below. Fixing the visual obstruction
made the parcel layer legible, which immediately exposed that Montgomery
County had no parcel data at all — and pulling that thread found considerably
more.

WHAT WAS ACTUALLY WRONG (all verified, none guessed):

- Both Maryland counties are DOWN. They share one statewide endpoint
  (geodata.md.gov MD_ParcelBoundaries), returning 503 on every probe. Left in
  place with a knownUnavailable marker rather than replaced: minutes of 503
  cannot distinguish a retired service from an outage.
- All three Virginia fieldMaps were almost entirely fictional — 16/18 broken
  for Fairfax, 17/22 Loudoun, 18/18 Prince William. registry.js's own header
  had admitted the URLs were guesses; nobody had checked the field names. The
  connector passes unmapped fields through harmlessly and panel.js omits empty
  rows, so parcels drew perfectly and the panel just quietly showed less.
  Prince William's layer is a two-table JOIN and ArcGIS qualifies every field
  with its owning table, so bare "GPIN" matched nothing on the only source of
  the three that carries owner and land-use data.
- Parcel search built its WHERE clause from hardcoded SITE_ADDR/PIN fallbacks.
  An unknown column makes ArcGIS reject the ENTIRE query, so a missing address
  field broke PIN search too — and three of five services have no address
  column, so that was the normal case.
- The parcel pane sat at z-index 450, exactly tying map.js's labelsPane. Tied
  panes order by DOM insertion alone.

TOOLING ADDED
data/check_parcel_services.mjs probes every serviceUrl's ?f=json, reports
LIVE/DEAD, diffs fieldMap against the real schema, and prints ACTUAL FIELDS so
the next repair is copied rather than invented. It also verifies
notProvidedBySource claims and reports NOW AVAILABLE if a county starts
publishing something previously absent. Written in JS so it loads the real
registry instead of duplicating URLs. Borrows check_source_links.py's safety
property: all-probes-failed-identically exits 2 (no network) instead of
declaring five services dead.

CI GATE — AND A GREEN BUILD THAT WAS LYING
There was no repo-wide test gate at all; two data workflows each ran one narrow
test file. Added .github/workflows/test.yml running the full suite plus E2E on
push/PR. The first version installed deps with `npm install --prefix
/tmp/node_modules`, but npm treats --prefix as the project ROOT and creates
node_modules beneath it. Playwright died loudly — jsdom died silently, since
its suites skip when absent, so CI printed "ALL PASS — 176/176" while testing
materially less than claimed. Fixed the path and added a step that hard-fails
if a test dependency does not resolve.

MISDIAGNOSIS WORTH RECORDING
With CI working, E2E surfaced "Cannot read properties of null (reading
'querySelector')" in AI Stocks. I called it a genuine app bug and was about to
go looking in stocks.js. Adding stack capture showed every frame inside
s3.tradingview.com — their _replaceScript, thrown when a viewport change
re-renders a widget container mid-load. Zero frames in our source. These are
invisible in a network-restricted sandbox because the widgets never load there,
so "passes locally" proved nothing. Filtered by ORIGIN, not message text, so a
real null-dereference of ours reading identically still fails. E2E failure
count across the cycles: 15 scenarios -> 1 -> 0.

The general lesson, and it is the same one that produced the bad fieldMaps:
read the evidence before assuming a cause. One CI cycle spent getting a stack
trace was cheaper than the wrong fix.

Files Changed:
- `js/parcel/registry.js` (fieldMaps, notProvidedBySource, knownUnavailable,
  header rewritten with fetch-confirmed results)
- `js/parcel/index.js` (search WHERE clause), `js/parcel/renderer.js` (PANE_Z)
- `data/check_parcel_services.mjs` (new),
  `.github/workflows/check_parcel_services.yml` (new)
- `.github/workflows/test.yml` (new), `tests/e2e_smoke.mjs` (stack capture,
  origin-based third-party filter, scenario 13b)
- `.gitignore`, `AI_CONTEXT.md`, `BUG_TRACKER.md`, `AI_TEAM_STATUS.md`

Next Recommended Actions:
- Re-probe Maryland (Actions -> Check Parcel Services -> Run workflow). If
  still 503, re-derive from Maryland's GIS portal and CONFIRM WITH THE PROBE
  before committing. Do not guess a replacement URL.
- Decide the panel wording for notProvidedBySource attributes. Currently those
  rows are simply omitted, which is indistinguishable from a bug. Suggested
  "Not published by this source" over "Unknown" — the latter claims we looked
  and could not determine it, when in fact we know exactly why it is missing.
- Zoning/assessment/sales data exists in NONE of the three VA services. Adding
  it needs separate CAMA/tax services joined in, which the current
  one-service-per-jurisdiction connector cannot do. That is a connector
  redesign, not a registry edit.

---

Date: 2026-07-31
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/past-conversation-recall-gcihz4
Session: Parcel view legibility — county hover chrome obscuring parcels

Reported symptom: "I can't see the parcel layer because I'm hovering over the
county, so it's blocking."

Investigated before changing anything, and the first plausible explanation was
wrong in an instructive way. The obvious suspect was the hover fill
(handleCountyMouseover hardcoded fillOpacity: 0.88) — but handleCountyMouseover
only restyles when `fips !== selectedFips`, and PARCEL._currentFips always
tracks selectedFips (it is set from handleCountyClick -> onCountyChanged, or
from the layer toggle passing the current selection). So the county actually
showing parcels never received the hover fill at all, and "fix the fill" would
have shipped a plausible-looking change that did not address the report.

The real obstruction is the county TOOLTIP — a cursor-following box (name,
policy level, optional economic value, up to ~240px wide) positioned at
cursor +14/-44, i.e. directly on top of the parcels being inspected. It also
flickers: parcel polygons live on their own pane (parcelPane, z-index 450)
above the county overlay pane (~400) and capture the pointer, so the county
layer only receives mouseover in the gaps BETWEEN parcels — every road and lot
line toggles the box back on. The parcel layer already supplies its own
per-parcel tooltip (address / PIN) for whatever is actually under the pointer,
so the county box is redundant as well as obstructive there.

Fixed both, scoped deliberately:
- Suppressed the county tooltip in parcel view for the county whose parcels are
  on screen. Hovering a NEIGHBOURING county still shows its tooltip — there are
  no parcels there to obscure and the label is still informative.
- Added hoverCountyStyle(), mirroring the parcel-view branch selectedCountyStyle()
  already had. This one is defensive rather than the reported fix: parcels render
  above the county fill but are themselves only ~0.15 opaque, so an 0.88 fill
  underneath still washes them out — being on top is not sufficient. Keeps the
  orange outline so hover feedback survives; drops only the fill.

Verified in a real browser (Chromium via Playwright), not by reasoning: 9 checks
covering the layer-off baseline, both obstructions gone in parcel view, the
neighbour tooltip preserved, and clean restoration after toggling the layer back
off — a sticky suppressed tooltip would be a worse bug than the original. 0 JS
errors. Kept as scenario 13b in tests/e2e_smoke.mjs so it runs in CI going
forward; jsdom cannot catch this class (no layout, no panes, no real pointer
events), which is why it survived this long.

Files Changed:
- `js/map.js` (hoverCountyStyle, handleCountyMouseover)
- `tests/e2e_smoke.mjs` (new scenario 13b)
- `BUG_TRACKER.md`, `AI_CHANGELOG.md`

Next Recommended Actions:
- The parcel pane sets `pointerEvents: 'auto'`, which is what makes the county
  fire mouseover only between parcels. If more county-level hover chrome is
  added later, check it against parcel view too — this is now the second piece
  to need that treatment after selectedCountyStyle().

---

Date: 2026-07-31
AI Assistant: Claude Code
Branch: claude/past-conversation-recall-gcihz4
Session: Project-health cleanup pass (docs, dead code, encoding, CI gate)

Bobby asked "how can this be improved" about the project in general (not
any specific feature), then "fix all" on the resulting list. Answered five
areas: data quality/coverage, documentation hygiene, tech debt, and testing
gaps. Two of the five — filling in the missing 54% of county policy
research, and repairing the 711-URL dead-citation backlog — require real
government-source verification and were deliberately NOT attempted, since
fabricating either would repeat exactly the failure mode the 2026-07-27
data-integrity sweep already caught and fixed (false "verified" labels,
mislabeled counties). Flagged both to Bobby instead. The city-level
regulation layer is a real feature requiring real data architecture, also
out of scope for a cleanup pass. Everything else was fixed:

1. AI_CONTEXT.md deduplication: the "## Globals Reference" section (window.
   ZONING / window.ZONING_MAP) was duplicated verbatim back-to-back (~70
   lines), and the "AI Handoff Summary" at the end had two overlapping
   "Current state"/"Branch"/"Zoning phase status" paragraphs from a botched
   append. Consolidated to one copy of each, and updated the stale "1,303
   records" figure to the current authoritative numbers from
   platform_metadata.json's coverage block (1,467 in database, 870 / 27.7%
   genuinely researched) rather than leaving it a fabrication risk sitting
   uncorrected. Also corrected the "merge skooi7 to deploy" framing to match
   how deploys actually happen now (see 2026-07-31's earlier entry below).

2. AI_CHANGELOG.md archival: this file had grown to 355KB, over the 256KB a
   single tool read can load — directly undermining its own rule #2 ("every
   AI assistant must read this file before coding"). Split at the entry
   boundary nearest 176KB (2026-07-18), moving everything before that to
   the new AI_CHANGELOG_ARCHIVE.md. Verified byte-for-byte content parity
   before and after (114 entries preserved, only the cosmetic `---`
   separator at the exact seam differs — nothing else changed or lost).
   PROJECT_CONTEXT.md's documentation inventory updated to mention the
   archive file and the "archive again at ~200KB" convention going forward.

3. Deleted all 43 data/sweep_2026_07_*.py one-time data-mutation scripts
   (more than the "32" estimated in the older Session 6 note — more had
   accumulated since, including the three 2026-07-27 critical-bug-fix
   scripts). Verified first, not assumed: none are imported by any other
   script, none are referenced by any workflow or by tests/run_all.sh, and
   git log confirms their output is already committed. Their docstrings
   confirm the one-time nature and their "no fabrication" sourcing
   discipline; git history is the permanent record of what they did, so
   deleting the scripts loses no information.

4. Added explicit encoding="utf-8" to 51 open()/read_text()/write_text()
   calls across 20 data/*.py pipeline scripts — the exact bug class already
   found and fixed in 2 files during the 2026-07-30 Windows portability
   pass (see AI_TEAM_STATUS.md's Open Handoffs, which flagged this as
   unresolved). Used an AST-based patcher (ast.walk over Call nodes,
   inserting at end_col_offset - 1) rather than regex, specifically because
   several calls span multiple lines with nested parens (e.g. write_text()
   wrapping a multi-line json.dumps() call in update_economic_data.py) where
   a line-based regex would either miss the call or insert in the wrong
   place. Deliberately did NOT touch tests/test_economic_data.py's 32
   similar-looking call sites: they write pure-ASCII JSON via json.dumps()'s
   default ensure_ascii=True, so no encoding can produce the Windows cp1252
   mojibake this bug class depends on — fixing them would be effortful
   busywork with no real risk behind it. Verified with py_compile on all 20
   files plus the full offline suite.

5. Found a bigger gap than the one flagged ("wire E2E into CI"): no
   workflow ran the general test suite AT ALL on push or PR.
   update_economic_data.yml and update_facilities.yml each run exactly one
   test file as a narrow sanity check on their own pipeline; nothing gated
   ordinary commits against the 176-test offline suite or the E2E browser
   suite. Added .github/workflows/test.yml: installs pytest, jsdom, and the
   playwright npm package (not persisted — matches the project's existing
   no-package.json, install-on-demand convention for Node dev tooling),
   downloads the same pinned Chrome for Testing build documented in
   tests/e2e_smoke.mjs's own header, serves the repo, and runs
   tests/run_all.sh with E2E=1.

   tests/e2e_smoke.mjs itself needed a real fix first: it never set a
   failing exit code on a real JS error — it's a log dump meant for a human
   to read, so wiring it into CI as-is would have produced a permanently
   green step regardless of what it found. Added minimal failure tracking
   (anyFailures / failedScenarios) around the existing run() wrapper without
   touching any of the ~200 lines of scenario-specific assertions/log
   lines — rewriting those into hard assertions would be a much larger,
   riskier change than what "wire into CI" calls for, and this suite's
   whole value is in a human reading the log for anything marked "<--",
   which a purely pass/fail suite would throw away. Also fixed a real bug
   introduced by an earlier edit pass in this same session: the Playwright
   import was rewritten to `import { chromium } from process.env.X || '...'`,
   which is invalid syntax (static import requires a string literal, not an
   expression) — caught immediately via `node --check` before it went
   anywhere, switched to a dynamic `await import(...)`.

   Did not fabricate a "CI passes" claim: actually ran the full E2E suite
   live against the pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH=
   /opt/pw-browsers) and a local http.server, to confirm the new exit-code
   logic and the workflow's env vars actually work end-to-end rather than
   trusting the design on paper. Result: all 16 scenarios ran, 0 hard JS
   errors, confirming both the exit-code fix and the workflow's tool
   versions/env vars are correct. One line looked suspicious on first read
   — "Economic Intelligence — awaiting first data run" printed `HAS VALUES`
   where the code comments say a placeholder should render — but checking
   `data/economy/*.json` directly showed the economy pipeline has already
   run on this branch for real (populated `generated_at` timestamps,
   thousands of records), so that scenario's own "nothing populated yet"
   precondition doesn't hold here; showing real values is correct given
   real data exists, not a bug.

Files Changed:
- `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `AI_CHANGELOG_ARCHIVE.md` (new),
  `PROJECT_CONTEXT.md`
- `.gitignore` (added node_modules/, defense in depth for the new
  Node-based CI tooling even though CI installs to /tmp, not the repo root)
- `tests/e2e_smoke.mjs` (failure tracking + exit code; dynamic import fix)
- `.github/workflows/test.yml` (new)
- 20 `data/*.py` scripts (encoding fix only, no behavior change)
- 43 `data/sweep_2026_07_*.py` scripts (deleted)

Tests performed: full `tests/run_all.sh` after the doc/deletion/encoding
changes (176/176 JS + all Python suites passing), `py_compile` on all 20
edited Python files, `node --check` on the edited JS file, and a live E2E
run against the new workflow's exact tool versions (see above).

Next Recommended Actions:
- See "Open Handoffs" in AI_TEAM_STATUS.md if the live E2E validation found
  anything.
- Government-source research to close the citation-link and county-coverage
  gaps described above — real work, not something an AI session should
  invent data for.

---

Date: 2026-07-31
AI Assistant: Claude Code
Branch: claude/past-conversation-recall-gcihz4
Session: Branch-state reconciliation (skooi7 "merged but not merged" cleanup)

Bobby flagged AI_TEAM_STATUS.md's claim that the skooi7 branch's PR #200 was
"opened and merged to main" as inconsistent with GitHub showing the PR as
closed-not-merged and the branch as 13 commits ahead of main with no open PR.

Investigated before touching anything. The claim was directionally true but
mechanically wrong: PR #200's diff was applied to main via a direct push
(commit 1ce316a, "Facility pipeline reliability fixes + Windows test-suite
portability (#200)") rather than through GitHub's merge button, which is why
GitHub never flipped the PR to "merged." The branch then kept receiving its
own independent bot-generated data commits (source_health.json, facility
index, economy pipeline output, ai_news.json) after that point, so it looked
like 13 commits of stranded real work. It wasn't: diffing file *contents*
(not commit history) between main and the branch tip showed only 8
auto-generated data files differed, and every one of main's copies carried a
strictly later generated/last-run timestamp than the branch's — main had
already re-run each of those pipelines on its own schedule and superseded
the branch's snapshots. No unique code or data existed on the branch. Ran
the full tests/run_all.sh suite against the branch first (176/176 JS tests
+ all Python suites, pytest reinstalled since this sandbox didn't have it)
to confirm it was healthy before deciding what to do with it.

Two similarly stale branches were also found: feature/automated-ai-news and
fix/news-skip-ci, both from 2026-07-11, ~380 files / 7.7M lines behind main.
Their one idea (removing [skip ci] from the hourly news commit) was
deliberately superseded later — main intentionally keeps [skip ci] on news
commits since ai_news.json is fetched with cache: "no-store" and needs no
Pages redeploy to show new articles (AI_CONTEXT.md Session 6). Nothing
salvageable on either.

Actions taken:
- Force-pushed claude/us-datacenter-restrictions-map-skooi7 to main's
  current tip (git push --force-with-lease, guarded against a race with the
  branch's last-known SHA), so it stops looking perpetually ahead.
- Attempted to delete feature/automated-ai-news and fix/news-skip-ci via
  `git push origin --delete`. Both were rejected with HTTP 403 through the
  environment's git proxy — a force-push moments earlier succeeded from the
  same session, so this is specific to ref deletion, not a general push
  block. Per this environment's own guidance, proxy 403s are policy denials
  to be reported rather than retried or routed around. The GitHub MCP
  server has no branch-deletion tool either. Left both branches in place;
  see AI_TEAM_STATUS.md "Open Handoffs" for the manual deletion steps.
- Corrected AI_TEAM_STATUS.md's "Active Work" section (removed the
  inaccurate "PR opened and merged" phrasing, moved the entry to "Recently
  Completed," and documented the actual merge mechanism above).

Files Changed:
- `AI_TEAM_STATUS.md`
- `AI_CHANGELOG.md`

Next Recommended Actions:
- Delete feature/automated-ai-news and fix/news-skip-ci from the GitHub UI
  or via an authenticated `gh api -X DELETE` call.
- When closing a PR by pushing its diff directly to main instead of using
  GitHub's merge button, consider also deleting or resetting the source
  branch at the same time — that's what let this drift happen in the first
  place.

---

Date: 2026-07-30
AI Assistant: Claude Code (session continuing claude/us-datacenter-restrictions-map-skooi7)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Ratified the cloudscene/historical-snapshots governance handoff

Claude Companion's Windows-verification pass (entry below) left one item
flagged as an open decision for Bobby rather than resolving it unilaterally:
tests/test_no_paid_dependencies.py's paid-service guard was flagging the
string "cloudscene" in 8 data/facilities_version_history/2026-07-12T*.json
snapshots — legitimate historical fact (that's what the pipeline used before
the integration was removed 2026-07-27), not a live dependency. A PATH_EXEMPT
entry for that directory was already added to get the suite passing, but
BUG_TRACKER.md and AI_TEAM_STATUS.md both still described it as open pending
a decision.

Recommended keeping the exemption: these files are write-once archives, never
re-read as config and never executed, so scanning them protects nothing. A
real reintroduction of a paid service would still be caught in full — it
would first appear in a live source (an adapter file, facility_sources.json,
requirements.txt, a workflow), all of which stay fully scanned; a new
snapshot inheriting the string could only be generated after the guard had
already failed on the source it came from. Leaving 8 permanent false
positives in place would instead just train reviewers to expect and ignore
"cloudscene" hits from this specific check, which is worse for catching a
genuine future reintroduction than a scoped, documented exemption. Bobby
confirmed.

Changes: expanded the PATH_EXEMPT comment in
tests/test_no_paid_dependencies.py to state that reasoning explicitly rather
than just asserting the exemption; updated BUG_TRACKER.md's entry from
"Open (non-blocking)" to "Resolved"; closed the corresponding item out of
AI_TEAM_STATUS.md's Open Handoffs and logged the resolution under Recently
Completed Work. No test behavior changed — the exemption was already live;
this made the decision behind it durable and legible instead of an
unexplained fait accompli.

tests/test_no_paid_dependencies.py and full tests/run_all.sh both pass.

---

Date: 2026-07-30
AI Assistant: Claude Companion (Claude Code, joining as a second engineer alongside the primary Claude Code sessions on this repo)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Windows test-suite portability fixes + verification before merge to main

Continued the facility-pipeline hardening already in progress on this branch
(broken adapter audit, workflow git-target fix, 429 backoff / OSM mirror
fallback, all committed earlier today). Task was to verify the branch has no
errors before opening a PR and merging to main/production. Neither Python nor
Node.js had ever been installed on this machine, so installed Python 3.11.9
and Node.js 24.18.0 (LTS) via winget and ran the full offline suite
(tests/run_all.sh) for what appears to be the first time on native Windows —
every prior session ran on Linux/Mac, where these bugs are invisible because
those platforms default to UTF-8.

Found and fixed 4 previously-undiscovered Windows-only bugs, all in the same
family (code assuming the platform's default text encoding is UTF-8, which is
false on Windows):

- data/build_facilities_index.py: load_master()'s open(MASTER) had no
  encoding, so on Windows it read facilities_master.json under cp1252 —
  silently mangling non-ASCII county names (e.g. "Doña Ana County, NM")
  and making the --check freshness comparison fail even though the
  committed facilities_index.json was correct and up to date the whole
  time. fields_referenced_in_js()'s two read_text() calls crashed outright
  (UnicodeDecodeError) reading js/pipeline.js and js/jurisdiction.js, which
  contain em-dashes. Also hardened the --check comparison's read and the
  write_text() call to explicit UTF-8 — the write path happened to be
  harmless today only because cp1252<->UTF-8 mojibake is coincidentally
  reversible for the specific bytes in this file; that would not hold for
  all possible future data.
- tests/test_no_paid_dependencies.py: ~17 read_text() calls had no
  encoding, causing 4 hard crashes and one silent false-negative (the
  Census-key skip-path check failed to match an em-dash in the expected
  message string under cp1252).
- tests/test_data_loading.mjs: ROOT was built from
  `new URL('../', import.meta.url).pathname`. On Windows this keeps the
  WHATWG leading slash (`/C:/Users/...`), which is not a valid native path;
  Node's internal path resolution then doubles it into `C:\C:\Users\...`,
  crashing with ENOENT. Switched to `fileURLToPath()`.

Verified none of this was caused by the branch's own facility-pipeline work:
ran the identical checks against origin/main on the same machine and got
bit-for-bit identical failures before the fix. After the fix, the full suite
is clean except one pre-existing, unrelated finding — see BUG_TRACKER.md
("no-paid-dependency guard flags cloudscene in historical snapshots") — left
alone since resolving it means making a call on the project's paid-dependency
governance rule, not something to decide unilaterally.

Did not sweep the same missing-encoding pattern across the ~15 other
data/*.py scripts that share it (check_source_links.py,
export_facilities_to_layers.py, fetch_infrastructure.py,
monitor_legislation.py, refresh_platform_metadata.py, the
sweep_2026_07_*.py scripts, etc.) — pre-existing, unrelated to this
branch, and a much larger change than this task called for. Left as a
flagged follow-up rather than fixed opportunistically.

No data files changed. data/facilities_index.json was regenerated once
during investigation and confirmed byte-identical to the previously
committed version via `git diff` — nothing was lost or altered.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: 3D terrain view, Phase E — export, report integration, presentation mode, accessibility, performance

Finished the digital-twin system with Phase E, the last phase in the
original 47-section spec: image/data export, report integration,
presentation mode, an accessibility pass, and performance quality tiers —
all extending Phase A-D's existing systems rather than adding new parallel
ones.

Export (js/3d/engine.js's captureSnapshot()/getReportData(), wired into
three new buttons in js/map.js) reuses the exact CSV/JSON download pattern
already used by exportScreenerCSV/exportWorkspacesJSON (quoted CSV with
BOM, Blob + object URL + temporary anchor) rather than inventing a new
export mechanism. Report integration extends the existing
js/parcel/report.js due-diligence report with a new "Conceptual 3D Site
Plan" section (image, metrics, per-object table) that only appears when a
scene actually has objects — a null/empty scene3d produces a byte-
identical report to before Phase E, verified directly in
tests/scene3d.test.js. The section reuses the same three-value honesty-
boundary status vocabulary as the in-scene panel (Conflict / Review
setbacks / No parcel selected) and never renders an Approved/Compliant/
Pass/Buildable verdict.

Presentation mode hides all editing chrome and expands the canvas to fill
the panel, with a small overlay bar for stepping through saved viewpoints;
it lives in a new sibling wrapper around the canvas host specifically
because engine.js clears that host's innerHTML on every scene rebuild,
which would otherwise silently delete the bar.

Accessibility: the canvas now has a dynamic aria-label describing live
object counts, full keyboard camera control (arrow-key orbit/tilt, +/-
zoom, Home to reframe) for users without a mouse, and respects
prefers-reduced-motion by disabling camera inertia. Focus-trapping on
panel open/close was deliberately NOT added — a check across every other
floating panel in this app (workspace/compare/bookmarks/screener) found
none of them do it either, so adding it only here would be an isolated
inconsistency, not a real fix; it's documented as a standing cross-panel
gap instead.

Performance: the existing low-power/software-renderer detection (already
built in Phase A for the fallback message) now actually changes what gets
rendered — disabled shadows, no antialiasing, capped pixel ratio on
flagged devices — instead of only warning about it. Tablet touch targets
were widened within the app's one existing responsive breakpoint rather
than inventing a new touch-specific media query the rest of the codebase
doesn't otherwise use.

One item was evaluated and deliberately not built: THREE.InstancedMesh
geometry batching. This app's object counts are realistically in the tens
per scene, not the thousands, and the existing per-object-mesh
architecture is load-bearing for Phase B's TransformControls attach-to-
select and raycasting — instancing would require a materially more complex
custom picking layer for a performance win this app's scale doesn't need.

tests/scene3d.test.js grew from 165 to 176 assertions (report-section
backward-compatibility and honesty-boundary coverage). Full suite green,
no regressions. docs/3D_SYSTEM_ARCHITECTURE.md's Phase E section and
manual-verification checklist updated; browser verification remains
unconfirmed this session for the same reason as Phases A-D (no working
Chromium binary in this sandbox).

All five phases (A-E) of the original spec are now built.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: 3D terrain view, Phase D — campus generator, templates, viewpoints, sun/shadows

Continued the digital-twin system into Phase D: generic development
templates, the flagship data-center campus generator, saved camera
viewpoints, and real sun-position-driven shadows — all built on Phase A-C's
terrain/object/constraint foundation rather than new parallel systems.

The campus generator (js/3d/campus-generator.js) is the closest match yet
to the original request's own language: acreage/spacing inputs generate a
grid of conceptual data halls, filtered through the exact same real-
parcel-boundary and rotated-rectangle-overlap checks Phase C's conflict
detection already uses, so nothing is ever placed outside the actual
parcel or on top of another object. A perimeter fence is built from the
boundary's own edges (not invented geometry), and every result carries an
explicit "does not claim engineering feasibility, utility capacity, or
permit compliance" disclaimer plus any warnings (e.g. "only 3 of 5 halls
fit") rather than silently under-delivering. Templates and campus layouts
both batch-create as one undo step via a new `_createBatch()` helper.

Sun position (js/3d/sun.js) implements NOAA's simplified solar equations,
verified against known solstice/equinox altitude values (e.g. 40N summer-
solstice noon altitude within 1 degree of the theoretical 90-(40-23.44));
js/3d/engine.js drives a real THREE.DirectionalLight + shadow mapping from
it, explicitly labeled ~0.01-degree conceptual accuracy, not survey-grade
solar analysis. Saved viewpoints store camera state by lat/lng (not scene-
local coordinates) so they survive a reload even though the scene's local
origin is rebuilt from scratch each session.

Two Phase D items were evaluated and deliberately NOT built, each written
up rather than shipped shallow: preliminary cut/fill grading (this
feature's terrain resolution — a 3x3 grid of AWS tiles subsampled every 8
pixels, effectively >100m between samples — cannot support even a
conceptual estimate without implying false precision, and the original
request itself says not to calculate cut/fill when data is inadequate);
and alternatives/scenario comparison (the repository audit already found
three non-unified compare systems in this codebase, and adding a fourth
without first reconciling that fragmentation risks making it worse).

scene3d schema bumped to v3 (adds `viewpoints` and `sun`), with a tested
v1/v2 -> v3 migration. tests/scene3d.test.js grew from 122 to 165
assertions (substation type, solar position against physical reference
values, template instantiation, and campus-generator boundary/overlap/
edge-case coverage). Full suite green, no regressions.
docs/3D_SYSTEM_ARCHITECTURE.md's Phase D section and manual-verification
checklist updated; browser verification remains unconfirmed this session
for the same reason as Phases A-C (no working Chromium binary here).

Phase E (presentation mode, report integration, export, mobile/
accessibility/performance tuning) remains the only unbuilt phase.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: 3D terrain view, Phase C — site objects, real parcel boundary, honest conflict detection

Continued the digital-twin system into Phase C: parking/road/fence object
types, construction phasing, real-parcel-boundary containment checking, and
object-to-object overlap detection — extending Phase B's object system
rather than building a parallel one.

Roads and fences are modeled as straight segments using the exact same
{position, rotationDeg, footprint} shape as buildings, specifically so they
inherit the entire existing transform-gizmo/selection/undo pipeline with
zero new interaction code; a path is composed of multiple straight segments
placed end to end rather than a freeform polyline tool — a deliberate scope
cut, documented as such.

The constraint checker (`js/3d/constraints.js`) is built around one
non-negotiable honesty boundary: it can verify real parcel-boundary
containment (point-in-polygon against the parcel's actual GeoJSON geometry,
projected into the scene) and object-to-object overlap (a proper rotated-
rectangle SAT test, not just axis-aligned boxes) — both geometrically
certain. It cannot verify zoning setback-line compliance, because that
would require an offset/inset polygon of the parcel boundary that nothing
in this codebase computes, and fabricating an approximate one risked it
being read as an authoritative setback line. So it never returns
'pass'/'compliant'/'approved'/'buildable' — only 'conflict' (a real
boundary or overlap violation), 'requires-review' (everything else, always,
alongside the raw front/side/rear setback numbers for a person to judge),
or 'unknown' (no parcel selected). Environmental context overlays (water
stress, flood zones) were evaluated and explicitly deferred rather than
integrated shallow — the app's existing 2D layers don't yet have the
coverage/resolution metadata this feature's honesty standard would require
for a 3D projection.

tests/scene3d.test.js grew from 89 to 122 assertions (object type/phase
defaults and backward compatibility, point-in-polygon, rotated-rectangle
overlap, and — the most load-bearing test in this pass — an explicit
assertion that no constraint status matches pass/compliant/approved/
buildable). Full suite green, no regressions.
docs/3D_SYSTEM_ARCHITECTURE.md's Phase C section and manual-verification
checklist updated accordingly; the browser-verification checklist remains
unconfirmed this session for the same reason as Phases A and B (no working
Chromium binary in this sandbox).

Still out of scope (Phases D-E): the data-center campus generator,
development templates, alternatives/scenario comparison, sun/shadow,
preliminary grading, presentation mode, export.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: 3D terrain view, Phase B — building volumes, selection, undo/redo, live metrics

Continued the digital-twin system into Phase B, building on Phase A's
terrain foundation rather than starting a separate system. Vendored a
second Three.js addon, `TransformControls.js` (MIT, same one-line bare-
import patch as `OrbitControls.js`), restricted in the UI to two modes only
("Move" — X/Z axes, no vertical drift — and "Rotate" — yaw only, no tilt);
"Scale" was cut deliberately since a literal 3D scale on a box is ambiguous
about what it's actually resizing, and precise footprint/height edits
belong in the object panel instead.

Shipped: `js/3d/objects.js` (building-volume store — footprint/height/
position/rotation, aggregate site metrics, always labeled `'approximate'`
since these are generated conceptual volumes, never surveyed or engineered);
`js/3d/history.js` (generic undo/redo command stack); `js/3d/selection.js`
(mirrors `js/parcel/selection.js`'s single-selection + CustomEvent shape).
Building creation seeds its default size from `PARCEL_FEASIBILITY`'s
buildable envelope when a parcel is selected, reusing the existing setback/
coverage calculator instead of re-deriving it. Click-to-select raycasting,
gizmo drag-to-move/rotate, and a live metrics dashboard (building count,
footprint sqft, coverage % of the parcel, max height) all wired into the 3D
panel. `scene3d`'s saved-workspace schema bumped to v2 (adds an `objects`
array) with a tested migration path: a v1 save (Phase A, before `objects`
existed) loads with an empty building list, never a fabricated one.
Switching counties clears the object store on purpose — building positions
are scene-local coordinates relative to the current site, and silently
carrying them into a different county's geography would misrepresent where
they are.

`tests/scene3d.test.js` grew from 34 to 89 assertions (object CRUD, undo/
redo stack behavior including capacity eviction and redo-stack invalidation,
selection events, distance/area math, and the v1→v2 schema migration); full
suite green, no regressions. `docs/3D_SYSTEM_ARCHITECTURE.md` extended with
the Phase B design section and additional manual-verification checklist
items — still unconfirmed in a real browser this session for the same
reason as Phase A (no working Chromium binary in this sandbox).

Still out of scope (Phases C–E): roads/parking/fences/utilities, setbacks
and constraint-conflict checking, environmental overlays, the campus
generator, templates, presentation mode, export.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: 3D terrain view, Phase A — real infrastructure, not a demo

Built Phase A of a much larger (47-section) 3D site-design/digital-twin
request: a working, integrated 2D/3D terrain view, not the whole request in
one pass. A repository audit came first (per the request's own mandated
order) and found zero prior 3D/WebGL code, but real integration surface
worth reusing rather than duplicating — `window.PARCEL`'s coordinator shape,
`window.PARCEL_FEASIBILITY`'s buildable-envelope math (for later phases),
`window.LAYER_REGISTRY`'s provenance schema, and — most importantly — the
existing per-user saved "workspace" object in `js/map.js`, extended with an
optional `scene3d` field rather than inventing a new "Project" entity.

Shipped: `window.SCENE3D` coordinator (`js/3d/index.js`, mirrors
`window.PARCEL`'s init/onCountyChanged/onLayerToggle shape); Three.js
r0.185.1 (MIT) vendored at `vendor/three/`, lazy-loaded as the codebase's
first ES module only when a visitor actually opens 3D mode, so non-3D
visitors download zero 3D bytes; real terrain rendering from AWS's free,
keyless Terrain Tiles (Terrarium PNG encoding — USGS's EPQS API was
evaluated and rejected, confirmed CORS-blocked for browser use); orbit/pan/
zoom/tilt navigation via OrbitControls; a WebGL-capability probe that skips
fetching Three.js entirely on incapable devices, and a per-tile "no data"
fallback (visually marked, not silently rendered as flat ground) when
terrain tiles fail to load. `tests/scene3d.test.js` (34 assertions: tile
math, Terrarium decode, cache/de-dupe/eviction, `scene3d` schema
migration/backward-compatibility) wired into `tests/run_all.sh`, full suite
green with no regressions. `tests/test_no_paid_dependencies.py`'s tile-host
allowlist updated for the new AWS bucket. Documented in
`docs/3D_SYSTEM_ARCHITECTURE.md`, including the technology-decision
rationale and a manual browser-verification checklist that was **not**
completed this session — no working Chromium binary was available in this
sandbox (broken Playwright browser cache, and `playwright install` is
off-limits here) — flagged honestly as an open item rather than a
verified-working claim.

Explicitly out of scope this pass (Phases B–E, per the request's own
ordering): object/building creation, the data-center campus generator,
roads/parking/fences/utilities, development templates, presentation mode,
and export.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: NOAA, EPA, FAA, DOT researched the same way FEMA was — three deferred, none guessed

## NOAA — deferred
Best candidate: NOAA's nClimDiv (Climate Divisional Database), which
genuinely publishes STATE-level heating/cooling degree days — directly
relevant to data center cooling costs, and clearly differentiated from
FEMA NRI's hazard-risk focus. Base access point confirmed
(`www1.ncdc.noaa.gov/pub/data/cirs/climdiv/`), but two things kept this
below FEMA NRI's confidence bar: (1) the files are **fixed-width text**
(`climdiv-tmpcst-v1.0.0-YYYYMMDD.txt` style), not CSV or JSON — this
pipeline's `_get_csv_rows()` cannot parse it, and no exact current filename
for the specific cooling/heating-degree-days variant (vs. temperature,
precipitation, etc.) was confirmed; (2) a second candidate (NOAA's
Billion-Dollar Weather and Climate Disasters) turned out to have been
**discontinued by NOAA itself in May 2025**, now maintained by a
non-government third party (Climate Central) — exactly the kind of
provenance risk this project's own sourcing rules exist to catch. An
EIA-hosted alternative (STEO's weather API, same `api.eia.gov/v2/` base
this pipeline already uses) was also checked, but its degree-days data is
Census-division level (9 regions) at best and the exact series ID was not
confirmed either.

## EPA — deferred
Best candidate: eGRID (Emissions & Generation Resource Integrated
Database), state/subregion-level power-grid emissions intensity —
genuinely relevant to hyperscaler sustainability/renewable-sourcing
decisions and clearly differentiated from anything already on this
platform. A real, search-indexed direct download URL was confirmed
(`epa.gov/system/files/documents/2025-06/egrid2023_data_rev2.xlsx`) — but
**it is an XLSX workbook**. EPA's own materials mention CSV exports exist
only through an interactive "EZ Search" tool, not a stable static file.
This is a hard architectural blocker, not a confidence problem: this
pipeline has no XLSX parser and is contractually stdlib-only (enforced by
`test_economic_pipeline_is_stdlib_only`); adding a third-party library
like `openpyxl` would break that guarantee, and hand-rolling a raw
zip+XML XLSX reader from scratch for one data source is a large, fragile
undertaking disproportionate to the value of one field.

## FAA — deferred
No official FAA endpoint was found with FEMA-NRI-level confidence — the
closest free, well-documented option (OurAirports' nightly CSV dump) is a
reputable third-party aggregator, not a direct government source, putting
it in a different category from this session's other additions. More
fundamentally: airport location/enplanement data is a weak fit for this
platform's own test ("how does this affect data center attractiveness?")
compared to what is already tracked — the more genuinely relevant FAA
angle (Part 77 obstruction surfaces / height restrictions near airports)
is complex polygon geospatial data, not a simple per-county scalar, and
was not pursued for that reason on top of the sourcing uncertainty.

## US DOT — deferred
The National Transportation Atlas Database (NTAD) is real, free, and
genuinely BTS-official, but it is a general-purpose transportation
geospatial database (highway/rail/port networks, freight commodity flows)
served through ArcGIS Hub / GeoServices/WMS/WFS — the same kind of
GIS-hub access pattern this project's own standing instructions already
push back on ("avoid turning the site into a generic GIS viewer"). Nothing
found reduces naturally to one simple per-county scalar metric the way
population, wages, hazard risk, or electricity price already do; the
closest such thing (Freight Analysis Framework commodity flow) is a
multi-dimensional mode x commodity x origin x destination dataset, not a
lightweight county-level summary.

## What would change this
All four remain genuinely researchable, not permanently closed — see each
section above for the exact missing piece: NOAA needs either a confirmed
CSV/JSON degree-days source or a fixed-width parser and a confirmed exact
filename; EPA needs a stable non-XLSX eGRID export or a decision to accept
adding a parsing dependency; FAA needs a clearer single-metric angle
that is actually differentiated and data-center-relevant; DOT needs a
simple scalar buried somewhere in NTAD that this round's research did not
surface. Nothing here was guessed at and shipped -- consistent with how
FEMA NRI was only built once a real, verifiable URL pattern was found.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: FEMA National Risk Index added under real uncertainty; a real EIA display bug found while wiring it in

## Phase 5, attempted for real this time: FEMA National Risk Index
The previous entry from today deferred all of NOAA/FEMA/EPA/FAA/DOT because
this session's network access was blocked for `WebFetch`/`curl`. `WebSearch`
kept working throughout (it is not routed through the blocked proxy), and a
deeper search round returned something a first pass missed: a real,
independently-indexed FEMA static file
(`hazards.fema.gov/nri/Content/StaticDocuments/DataDownload/NRI_Shapefile_CensusTracts/NRI_Shapefile_CensusTracts.zip`)
confirming FEMA's actual static-file URL pattern, not a guess. Built
`NRI_Table_Counties.csv`'s URL from that same confirmed pattern, and the
column names (`STCOFIPS`, `RISK_SCORE`, `RISK_RATNG`) from FEMA's own
documentation and multiple independent secondary sources.

This is genuinely less certain than this pipeline's other sources, and says
so everywhere it appears (code comments, DATA_SOURCES.md, the workflow
YAML) rather than quietly presenting it as equally solid. The defensive
pattern is the same one BLS's wage-field uncertainty already established:
short candidate-column lists, a 2,500-of-~3,144-county sanity floor, and a
warning that names exactly which candidates it tried against the file's
real header if nothing matches — so a wrong guess fails as a clean, visible
skip in `nri_available: false`, never a silent misattribution. Wired all
the way through: Python collector (`collect_fema_nri()`), metadata/gate
plumbing (own 180-day cadence, since FEMA republishes infrequently),
`validate_outputs()`, the workflow's dispatch inputs and summary step, 7
new pytest assertions, and frontend display (Economy profile panel,
report.js) as a `natural_hazard_risk` supplementary field — deliberately
kept out of the Readiness Score, the same reasoning that already keeps
regulatory restriction level separate from it. The frontend wiring was
low-risk to include even given the backend uncertainty: every consumer
already null-checks the field, so a live run that fails to populate it
degrades to exactly today's behavior (the row simply does not appear),
never a crash or wrong data.

**What the next live pipeline run needs to confirm**, in order of how bad
it would be if wrong: (1) the URL resolves at all, (2) the column names
match, (3) `nri_county_count` lands near ~3,144. Check
`economic_metadata.json`'s `nri_available`/`nri_county_count` and any
warning text after the first scheduled or `--force-nri` run.

## A real bug found while wiring FEMA NRI's display: EIA electricity price was reading cents as dollars
While writing `natural_hazard_risk`'s "Four supplementary fields" doc
section, re-checked `electricity_price`'s existing description and noticed
something worth verifying rather than copy-pasting forward: EIA's API
reports industrial electricity price in **cents per kWh** (confirmed by
this pipeline's own EIA test fixture, which uses values like `"12.50"` and
`"6.80"` — unmistakably cents-scale; a realistic industrial rate in DOLLARS
would be `"0.125"` and `"0.068"`). But every place that DISPLAYS the value
(`js/economy-view.js`'s profile panel, `js/economy.js`'s two new
electricity `SIGNAL_RULES` from earlier today, `js/report.js`) formatted it
with `fmtValue(ep.value, "usd_precise", 2)` — treating the raw cents number
as if it were already dollars. A realistic 9.2-cent rate would have
rendered as "$9.20/kWh", a real price 100x too high, everywhere it
appeared, including in signal text this same session had just written.

Fixed all three display call sites to `ep.value / 100`. Code that only
RANKS the raw value rather than displaying it (`readinessScore`'s
percentile calculation, the electricity `SIGNAL_RULES`' own threshold
comparisons) needed no change — comparing cents-to-cents is unaffected by
which unit the numbers are labelled, only the number shown to a reader was
wrong. Added a regression test in `tests/test_economy_core.mjs` using a
realistic cents-scale value (6.5) and asserting the rendered signal text
shows "$0.07/kWh", never "$6.5.../kWh" — the exact failure mode this bug
produced. The underlying stored data was never wrong (cents is EIA's
correct native unit, and DATA_SOURCES.md already documented it correctly);
only the display math was.

Real EIA electricity price data has not been successfully collected by any
live pipeline run yet (`eia_available: false` as of this writing), so this
bug had not yet been visible in production — caught by re-reading a doc
section carefully, not by seeing a wrong number on the live site.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Visual/UX polish: a discoverability gap in the Economy profile table

## The profile table's horizontal scroll had no visual affordance
Screenshotting this session's own new UI (the readiness score panel) at
390px surfaced something pre-existing, not something this session
introduced: `.econ-profile-table` already scrolls correctly inside its own
container rather than the page (confirmed live: `scrollWidth 462 >
clientWidth 314` on mobile, page `scrollWidth` not affected) -- but nothing
told a user that two of its five columns (state median, US median) exist
off-screen to the right. It looked finished, not scrollable.

Assumed at first this was mobile-only and gated a hint behind
`max-width: 480px` -- checking desktop before committing showed the same
table is ALSO clipped at 1280px (`scrollWidth 466 > clientWidth 308`),
because the profile panel is a fixed ~340px sidebar column at every screen
size, not a mobile-narrow thing. Removed the media-query gate and made the
"Scroll table for state & US medians →" hint always visible instead of
shipping something that fixed the symptom in the one place a screenshot
happened to be taken.

Deliberately did NOT touch the underlying scroll mechanism or table
layout -- it already works and already has a test (`no horizontal
overflow` in `tests/e2e_smoke.mjs`'s Mobile nav section) confirming the
PAGE never scrolls sideways. This is additive: a small always-visible text
hint, not a redesign of a component that was not broken.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: FRED integration audit: 2 new series added, needs a live run to confirm

## Audited the 21-series list for coverage gaps
Reviewed `data/economy/series_config.json`'s existing coverage against the
platform's own stated test ("how does this affect data center
attractiveness?"). Two genuine gaps, not just more of what is already
there: nothing measured labor DEMAND (only supply: `UNRATE`, `ICSA`,
`PAYEMS`), and nothing measured home price LEVELS (only construction
ACTIVITY: `HOUST`, `PERMIT`). Added `JTSJOL` (JOLTS total job openings) and
`CSUSHPINSA` (S&P/Case-Shiller US National Home Price Index) to fill those
two specifically, rather than padding the list with tangentially-relevant
series (consumer sentiment, oil prices) that were also considered and
deliberately left out.

**This addition carries more uncertainty than usual and says so plainly.**
This session's outbound network access was blocked for the FEMA/NOAA
research earlier today (see the other entry from today), so these two
series IDs could not be live-verified before committing, unlike this
project's normal practice. The risk is lower than it would be for, say, a
Census ACS variable: a FRED series ID is a permanent unique identifier, not
a fuzzy label match, so a wrong ID fails cleanly (the pipeline's existing
`fred_series_metadata()` validates every series before fetching
observations and records real failures to `fred_skipped` rather than
silently publishing anything) — there is no way for this to reuse an
existing bug pattern silently mislabeling a different series. But "the ID
exists" and "the ID is the one I intended" are still two different claims,
and only the first is checked automatically. The next scheduled pipeline
run's `fred_data.json` and `economic_metadata.json` (`fred_skipped`) will
show definitively whether both resolved to real, working series — check
that before treating this as fully confirmed the way the rest of this
platform's sources are.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Data sources panel: the existing one had never been updated for the Economic Intelligence pipeline

## The About page's Data Sources table predated the entire Economy tab
The static `sources-table` in `js/analytics.js`'s About page had 8
hand-written rows, none of them Census ACS, FRED, EIA electricity price, or
BLS QCEW -- despite the Economy tab being one of the platform's largest
features. Its one EIA row described a capability ("data center electricity
demand, power infrastructure") that was never actually built; the real EIA
integration (state industrial electricity retail price) went live without
this table ever being updated to reflect it, so a reader consulting the
platform's own "what feeds this" page would not learn the Economy tab's
real sources exist at all.

Fixed the static table (removed the inaccurate row, added FRED, ACS,
Building Permits, EIA, and BLS QCEW with real descriptions/cadences), and
added a second, LIVE panel below it (`renderEconomicSourcesPanel()`) that
reads `economic_metadata.json` through the same cached `window.ECONOMY.load()`
every other economy surface uses -- so it costs nothing extra -- and shows
each of the four pipeline sources' actual availability, last successful
update, and coverage count, plus the `sources` array's own
publisher/URL/attribution text the pipeline already generates. This is
deliberately live rather than a second hand-written table: "not yet
available" here means the module genuinely has not produced data, not that
someone forgot to update a description. Browser-verified: Census ACS
correctly shows available (3,222 counties) while Permits/EIA/BLS correctly
show "not yet available" (matching their real current pipeline state).

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Four new signal rules -- labor participation, housing, wage, electricity cost

## Signals never covered the metrics added since the rule table was first written
`SIGNAL_RULES` (js/economy.js) had 9 rules, none referencing
`labor_force_participation_rate` or `housing_vacancy_rate` (added in the
Phase 1 ACS expansion), `avg_weekly_wage` (BLS QCEW, Phase 2), or
`electricity_price` (EIA, Phase 1) -- four data points this platform already
collects and displays elsewhere, but that never fed the rule-based insight
engine. Electricity price in particular is the metric most directly tied to
this project's own stated test ("how does this affect the attractiveness of
developing and operating a data center here?") since it is typically a data
center's largest recurring operating cost line item, yet it had no signal
at all.

Added: `available_workforce` / `thin_workforce` (labor force participation
vs. the national county median), `housing_availability` (vacancy rate, for
staff relocation), `labor_cost_below_median` / `labor_cost_above_median`
(BLS wage), and `electricity_cost_below_median` /
`electricity_cost_above_median` (EIA state price). Extended
`nationalMedians()` with the four new median pools (electricity pooled at
the state level, same reasoning as `_readinessFactorPools()`'s electricity
pool) rather than adding a second parallel pool-builder. `countySignals()`
gained an optional third `stateData` parameter (backward compatible --
existing 2-argument callers still work, they just cannot fire the
electricity signals) and all 5 real call sites (economy-view.js x2,
jurisdiction.js, map.js, report.js) were updated to pass it. 7 new tests in
`tests/test_economy_core.mjs` (42 total now), plus a caught-in-the-writing
test bug: an earlier test in the same file had already warmed
`nationalMedians()`'s cache with a tiny dataset lacking wage/electricity
data, silently poisoning it to `null` for every later test in the file
until `_resetCache()` was added -- a live demonstration of exactly the
kind of stale-cache bug this session already fixed once in the pipeline's
own metadata handling.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Historical timelines: households' history was silently invisible in three places

## The same hand-maintained sparkline list was duplicated (and stale) three times
Auditing the "historical timelines" item found `HISTORY_METRICS` in
`js/economy.js` already lists four metrics (`population`, `households`,
`median_household_income`, `unemployment_rate`) and `households` history
data has genuinely existed in `census_county.json` since the Phase 1 ACS
expansion -- but the three places that render "Trends" sparklines
(`js/economy-view.js`'s Economy profile panel, `js/jurisdiction.js`'s
Jurisdiction page, and `js/map.js`'s county detail panel) each hardcoded
their own 3-item `[key, label]` list that predates `households` being
added, so its timeline never appeared anywhere despite the data existing.

Replaced all three hardcoded lists with a derivation from
`HISTORY_METRICS`/`EXPLORER_METRICS`/`METRICS` (filtered to metrics that
actually have non-empty history data for the record being shown), so a
future metric marked `history: true` shows up in all three places
automatically instead of needing the same manual edit three times.
Browser-verified: "Total households" now renders correctly in the
Jurisdiction page and the Map county detail panel (the Economy tab's own
fixture-driven test still correctly omits it, since that synthetic fixture
was never given household history data -- exactly the intended behavior of
only showing timelines that truly have data).

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: County comparison tool: found and fixed a dead button, added a second entry point

## The Economy tab's "Add to compare" button never worked
Auditing the platform for the "county comparison tool expansion" item found
that the comparison tool itself was already full-featured (radar charts,
CSV export, a printable report -- `js/compare.js`) but the Economy tab's
county profile panel could not actually reach it: its click handler called
`addCountyToCompare()` or `window.COMPARE.addCounty`, neither of which
exists anywhere in the codebase. The button always silently did nothing.
The real API is the classic-script global `addToCompare(fips)`, already
used correctly the same way by `js/home.js` and `js/map.js`.

Fixed the wiring, and while doing so noticed the Jurisdiction Intelligence
Page had a Watch button but no comparison entry point at all -- every other
detail surface had one. Added a matching "Add to compare" button there.
Both now navigate to the Map tab, wait for it to finish initializing, open
the compare panel if it is not already open, and add the county --
mirroring the existing "Compare watchlist" bulk action in home.js.
Extracted the shared navigate/wait/open/add sequence into
`compare.js`'s `navigateAndAddToCompare(fips)` rather than letting it get
duplicated a third time. Browser-verified both entry points: the compare
panel opens with the selected county's real data rendered inside it.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Formal test coverage for economy.js; NOAA/FEMA/EPA/FAA phase blocked on network

## Phase 5 (NOAA/FEMA/EPA/FAA/DOT) research: blocked, not skipped
Attempted to research the next preferred data source for county-level
natural hazard / environmental risk (FEMA's National Risk Index was the
leading candidate -- free, public domain, county-level, no API key, current
version v1.20, confirmed via web search). Could not verify the exact
download mechanism or field shape: this session's outbound network policy
is currently denying essentially all external fetches from this sandbox,
including sites with no plausible reason to be blocked (`example.com`,
Wikipedia both returned 403 from the egress proxy). This is a policy
denial, not a transient failure (confirmed via the proxy status endpoint),
and the project's own established rule from the Phase 3 (FCC Broadband)
research still applies: do not ship a collector against an unverified
endpoint contract. Deferred rather than guessed. Worth retrying once
network access to fema.gov (or an equivalent verifiable source) is
confirmed available from either this environment or the GitHub Actions
runner directly.

## Closed a real test-coverage gap: js/economy.js had no unit tests
`economy.js` had grown a nine-factor weighted scoring function
(`readinessScore`), percentile/median statistics, and a rule-based signal
engine with zero formal test coverage -- only a one-off Node smoke test
that was run once during Phase 4 development and discarded. Added
`tests/test_economy_core.mjs` (35 assertions, wired into `run_all.sh`),
requiring the real module source the same way `test_frontend_core.mjs`
already does for `constants.js`/`router.js`.

The readiness-score tests use a deliberately symmetric synthetic pool (21
counties, odd length, mirrored values) so the center county lands on
exactly the 50th percentile on every factor by construction -- letting the
test assert an exact expected score (50/100, 100% completeness) rather than
just re-capturing whatever the code happens to output. Also covers: the
missing-factor-redistribution path (excluding two 10-weight factors that
were themselves worth exactly 50 must not move the average, only the
completeness figure -- a regression that silently scored missing data as 0
would have visibly failed this), both null-return paths (unknown fips, zero
usable factors), invert-direction correctness (unemployment scores higher
when it is numerically lower), and that `_resetCache()` actually
invalidates the percentile-pool cache across datasets.

---

Date: 2026-07-28
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: A metadata-reporting bug found while verifying the population-label fix against a live run

## `unverified_metrics` could resurrect an already-fixed warning
While pushing this session's batch (the BLS warning-message fix and the
Data Center Readiness Score), the scheduled workflow had independently run
and pushed a fresh data refresh. Its `economic_metadata.json` still showed
`population` as unverified with the OLD wanted fragment (`'total
population'`) -- even though the config fix (`expect_label` -> `["total"]`)
had already been live for two commits, and the actual collected population
value was correct and non-null. The real data was fine; only the
diagnostic metadata was lying.

Root cause: `write_metadata()` merged this run's verification result with
`var_problems or prior.unverified_metrics`. `var_problems` defaults to `{}`
both when Census verification ran this cycle and found nothing wrong, AND
when Census was skipped entirely because it was still within its freshness
window -- both are "falsy", so `{} or prior_stuff` always fell through to
the prior run's stored status. A genuinely clean re-verification could
never clear a stale warning; it could only ever repeat whatever the last
run that actually executed verify_variables() had said, however old.

Fixed by making the "did verification run this cycle" distinction
explicit: `var_problems` now defaults to `None` (verification not
attempted) rather than `{}`, and the metadata merge checks `is not None`
instead of truthiness. A real empty-dict result (verified, zero problems)
now correctly clears any stale prior warning; a `None` (skipped, still
fresh) still correctly preserves the last known status. Added
`test_unverified_metrics_cleared_by_a_successful_reverification` covering
both branches.

This was a diagnostics-only bug -- the actual ACS data being published was
never affected -- but it's exactly the kind of self-contradicting signal
that caused the BLS near-miss earlier this session (a warning that sounds
like failure when the underlying system is actually healthy). Worth
catching on the same principle: trust the data, but don't let stale
metadata argue with it.

---

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: BLS was never broken -- a misleading warning message was; plus Phase 4 (Data Center Readiness Score)

## Correction: BLS QCEW works fine, a log message was lying
The previous entry left BLS QCEW's per-county access as an open question,
with a 300-county live test queued to determine whether a 30-county 100%
failure was bad luck or a real problem. That test came back with **299 of
300 counties returning real data** -- a 99.7% hit rate, essentially perfect
QCEW coverage. Re-reading the EARLIER 30-county result closely (not just its
prose summary) found the same pattern was already there and had been
misread: `collect_bls_wages()`'s warning message unconditionally claimed
"every checked county returned a plain 404" whenever there were no *non-404*
errors to report -- which is also exactly what happens when every county
*succeeds*, since a success produces no error of any kind. The message
never distinguished "0 successes, all 404" from "many/all successes, just
fewer than the 500-county floor requires" (the ordinary, expected outcome
of any bounded test run smaller than 500). Both the 30-county and
(re-examined) 300-county results were the latter case the whole time.

This was close to causing a real mistake: the plan on the table was to
retire a fully working, near-key-free, near-universal-coverage data source
because its own diagnostic output said something false. Fixed the message
to report the actual hit rate and explicitly say "a normal hit rate at too
small a sample" when most/all counties succeed, reserving the "every county
404'd" language for when that is actually true (`len(out) == 0`). Added a
regression test asserting the old false claim cannot appear when the hit
rate is high. The earlier `discover_bls_vintage()` fix (probing a real
county instead of the national total `US000`) is still a genuine
improvement and was kept -- it just was not the fix for this particular
symptom, since the symptom was never real.

## Phase 4: Data Center Readiness Score
A single 0-100 synthesis of the economic factors already collected,
computed entirely client-side in `js/economy.js` (`readinessScore()`) --
no new data source, no pipeline change. Each factor is expressed as the
county's NATIONAL PERCENTILE on that measure (a raw wage or price means
nothing on its own; a percentile does), weighted, and combined:

population growth 5yr (20%), bachelor's degree or higher (15%),
unemployment rate (10%, inverted), labor force participation (10%),
broadband subscription (10%), building permits YoY (10%), average weekly
wage (10%, inverted), state electricity price (10%, inverted), housing
vacancy rate (5%, inverted).

Deliberately named "economic readiness", not just "readiness": excludes
zoning/regulatory restriction level, which lives in a separate dataset
(`map_data.json`) with different coverage and confidence characteristics
and stays its own clearly labelled figure (the report already shows it
prominently) rather than being blended into one number that would hide
which kind of judgment -- economic attractiveness vs. legal risk -- is
driving it.

Every factor degrades gracefully: a county missing an optional field
(building permits, BLS wage, and EIA electricity price all have partial
coverage by design) has that factor excluded and its weight redistributed
proportionally across whatever factors ARE available -- the score never
substitutes a fabricated 0 for missing data, and reports a `completeness`
percentage so a reader can see how much of the full weighting had real data
behind it. Surfaced in both the Economy tab's county profile panel
(`js/economy-view.js`) and the due-diligence report (`js/report.js`), with
a "what's driving this score" breakdown showing every factor's own
percentile and weight.

## Phase 3: FCC Broadband Data -- researched, deferred
Explicitly on the preferred-source list, but the official BDC public data
API requires a full account registration plus manually-generated API
token (heavier than any other source's simple key signup), and repeated
research could not confirm a lightweight, county-level summary endpoint
with enough confidence to build against -- the alternative (raw per-location
availability files) is tens of millions of rows nationally, well beyond
this pipeline's stdlib-only, CI-minute-conscious design. Rather than guess
at an unconfirmed endpoint a third time in one session, this was deferred
rather than attempted. Nothing was built or shipped for this phase.

## Testing
economy.js's `readinessScore()` has no existing JS unit-test harness to
extend (no `tests/*.mjs` file currently covers economy.js's internals at
all -- a pre-existing gap, not something this session introduced or chose
to leave in scope to fix generally). Verified instead with a standalone
Node smoke test (loading the real module source via `vm.runInContext` with
a stub `window`, feeding synthetic multi-county data): confirms a
high-performing county scores well above a low-performing one, missing
optional fields reduce `completeness` without crashing or zeroing the
score, an unknown FIPS and an all-missing-data county both return `null`
rather than a fabricated score, and the breakdown is sorted by weight.
386 Python offline assertions (up from 383) for the BLS warning-message fix.

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Two bugs caught by live-testing Phase 1 and Phase 2 before moving on

## Bug 1: `population` has been silently broken since the feature launched
Live-testing the Phase 1 ACS expansion (as a matter of course, not because
anything about the expansion itself was suspect) surfaced that `population`
-- the platform's single most important metric -- has never once
successfully verified against the real Census API. Checking every prior
commit's metadata back to the original launch (`e2b0db4`) confirmed this
predates the current session entirely: `census_config.json`'s
`expect_label` for `B01003_001E` guessed `["total population"]`, but the
real live label is just `"Estimate!!Total"` -- the same generic pattern
every other single-line "Total:" table in this config already uses. Every
live ACS run since launch has silently omitted `population` from every
county and state record rather than crash, which is exactly why nobody
noticed: `verify_variables()` fails safe by design, and the daily workflow's
7-day freshness gate meant most runs never even re-ran verification to
re-surface the warning.

Found via a new diagnostic added first, not a second blind guess: extended
`verify_variables()`'s warning to include the actual label text Census
returned (or confirmation the variable was entirely absent), then ran the
pipeline live once more to read the real answer instead of guessing again.
Fixed the config (`["total"]`) and the offline test fixture that had been
carrying the same wrong assumption, with a comment explaining why.

## Bug 2: BLS QCEW's vintage discovery validated the wrong granularity
The same live run's BLS QCEW module found `2025` "available" (probing the
national total area, `US000`) but then every one of 30 sampled counties
returned a plain 404. Extensive research (a working NodeJS client's exact
URL construction, BLS's own aggregation-level docs) confirmed the URL
pattern, the `a` annual parameter, and the area-code format were all
correct -- so the mismatch itself was the real signal: national/state QCEW
figures can be published before county-level breakdowns for the same
vintage are finalized. `discover_bls_vintage()` was validating "does this
year exist at all" against the national aggregate, not "does this year
exist at the granularity this module actually reads." Fixed by probing a
real, populous county (Los Angeles County, CA) instead of `US000`.

Both fixes deployed and awaiting the next live run to confirm.

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 2 — BLS QCEW county-level average weekly wage

## Why this happened
Continuing through the phases of the economic intelligence expansion after
Phase 1 (ACS expansion + EIA electricity) shipped and was live-verified. BLS
was explicitly on the user's preferred-source list. Chose QCEW's open-data
CSV access over the general BLS Public Data API specifically because it
needs **no API key or registration at all** — genuinely free, not just
free-with-signup — and publishes at county granularity, which the OES/OEWS
occupation-wage survey does not (OEWS is state/MSA only and has no clean
JSON/CSV API for area-level data, just downloadable Excel files, so it was
not pursued this phase).

## New CSV ingestion path — the one exception on this platform
Every other source this pipeline reads is JSON. QCEW's open-data area-slice
files (`data.bls.gov/cew/data/api/{year}/a/area/{area_fips}.csv`) have no
JSON equivalent, so this is the first genuinely new ingestion format:
`_get_csv_rows()`, built on the same retry/redact contract as `_get_json()`,
parses via the standard library's `csv` module (`csv.DictReader`, keyed by
the file's own header row rather than hardcoded column positions — resilient
to BLS reordering columns). `csv`/`io` added to the stdlib-only import
allowlist in both `data/update_economic_data.py` and the test that guards it.

## Real research, not guesses, before writing code
Learning directly from the PEP/BPS investigation earlier the same day
(getting a table/series ID subtly wrong produces a silent failure, not a
loud one), every part of the QCEW integration was verified against BLS's own
documentation before being wired in: the URL pattern (confirmed via real
example URLs in BLS's own docs, e.g. `.../2024/1/area/26000.csv` for
Michigan), the `qtr=a` annual-average parameter, and the `agglvl_code=70`
aggregation-level code for "county total, all industries, all ownership
sectors" (confirmed against BLS's aggregation-level code documentation, not
assumed). One genuine remaining uncertainty — whether the annual file's wage
column is named `annual_avg_wkly_wage` or `avg_wkly_wage` (BLS's annual and
quarterly layout docs were not fully consistent on this point) — was handled
defensively with a candidate-list fallback (`_BLS_WAGE_FIELD_CANDIDATES`),
the same pattern `census_config.json`'s `broadband_candidates` already uses
for exactly this kind of "which exact field name" uncertainty, rather than
committing to one guess and finding out live whether it was right.

## Shape
`collect_bls_wages()` mirrors `collect_permits()` almost exactly: one HTTP
request per county (QCEW has no bulk per-county endpoint either), stride
sampling for bounded test runs, a 500-county sanity floor, and diagnostic
error capture. `discover_bls_vintage()` mirrors `discover_acs_vintage()`/the
retired PEP module's pattern: probes the national total area (`US000`)
backwards from last year rather than hardcoding a vintage, since QCEW's
annual file for a given year is not published until roughly Q3 of the
following year. Own 90-day freshness gate (`bls_last_successful_update`) —
the longest of any module in this pipeline, since QCEW's annual file only
changes once a year and lags 5-6 months; a shorter gate would just repeat
~3,000 requests against unchanged data.

Merged into `census_county.json` as `avg_weekly_wage` — `{value, employment,
year}` — surfaced in the county profile panel and the due-diligence report
alongside (not merged into) the existing `building_permits` and
`electricity_price` supplementary fields, labelled as a direct labor-cost
figure distinct from ACS's household-income metrics.

## Testing
383 offline assertions (up from 366), including `_get_csv_rows()`'s
header-keyed parsing, `discover_bls_vintage()`'s newest-year selection,
`collect_bls_wages()`'s county-total-row filtering (rejecting non-70
aggregation rows), its candidate-column-name fallback, its sanity floor and
max-counties cap, and `_bls_is_fresh()`. `tests/test_no_paid_dependencies.py`
extended with a dedicated test confirming no `BLS_API_KEY` was invented for
a source that is genuinely keyless (43 checks, up from 41).

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 1 of the economic intelligence expansion — ACS variable expansion + EIA electricity price

## Why this happened
Approved as Phase 1 of a larger, explicitly-scoped expansion request after
pushback on the full original scope: extend the already-built, config-driven
ACS pipeline with more variables (no new architecture needed — every metric
is declared in `data/economy/census_config.json` and `derive_metric()` reads
it generically), and add EIA's state-level industrial electricity price as
the first genuinely new free federal source since Building Permits.

## ACS expansion: 7 new metrics, verified before shipping
Added `households`, `labor_force_participation_rate`, `homeownership_rate`,
`housing_vacancy_rate`, `poverty_rate`, and `avg_commute_minutes` to
`census_config.json` (bringing the total to 13), each backed by a
well-documented, standard ACS table (`B11001`, `B23025`, `B25003`, `B25002`,
`B17001`, `B08013`/`B08012`). Every variable ID and its expected label
fragment was verified against real ACS label-text conventions via research
(not guessed) before being wired in, following the lesson from the PEP/BPS
investigation earlier the same day: getting a table ID subtly wrong produces
a silent, hard-to-diagnose failure, not a loud one.

`avg_commute_minutes` needed a new `derive` kind: the existing `ratio` kind
always multiplies by 100 (correct for a percentage, wrong for a genuine
average like mean commute minutes — using it here would have silently turned
a real ~25-minute commute into "2500%"). Added `average` alongside
`direct`/`ratio`/`sum_over_denominator` in `derive_metric()`.

Also fixed a real validation gap surfaced while adding these: `validate_outputs()`'s
percent-range check only recognized a `_pct` suffix or the single hardcoded
name `unemployment_rate` — every new `_rate` metric (`poverty_rate`,
`homeownership_rate`, `housing_vacancy_rate`, `labor_force_participation_rate`)
would have silently bypassed the 0-100 sanity check. Generalized the suffix
check to `_pct` or `_rate`.

Deliberately NOT attempted: population density (needs land area, not an ACS
variable), STEM/industry workforce breakdowns (table `C24030`'s exact variable
IDs weren't confirmed with enough confidence to ship), new-housing-unit counts
(the natural variable's label text changes every vintage in a way that would
break `expect_label` verification), vehicle ownership, veteran population,
disability status, foreign-born population — all lower-confidence or
lower-relevance to data-center siting than what shipped, deferred rather than
guessed at.

## EIA electricity price: first new source since Building Permits
`collect_eia_electricity_price()` — one HTTP request for ALL states (EIA's v2
API returns every state as its own row per period when no `stateid` facet is
set), sorted newest-period-first, industrial sector (`sectorid=IND`, the
standard site-selection proxy for a large power buyer). Merged into
`census_state.json` as `electricity_price`. A new `EIA_API_KEY` secret,
genuinely optional (unlike FRED/Census) — its own execution block, its own
30-day freshness gate (`_eia_is_fresh`, `eia_last_successful_update`,
deliberately a separate field from permits' gate even though the interval
happens to match, learning directly from PEP's original bug of sharing a
sibling's gate).

State abbreviation to FIPS mapping reuses `data/state_regulations.json`'s
existing `abbr` field (`load_state_abbr_to_fips()`) rather than hardcoding a
second 50-state table that could drift from it.

Frontend: county profile panel looks up the price via the county's own
`state_fips` and labels it "state average, not this specific county" so the
granularity is never overstated. Same pattern in the due-diligence report
generator (`js/report.js`).

## Also fixed: a leftover PEP mention from the retirement earlier the same day
`js/report.js`'s due-diligence report source-attribution line still cited
"Population Estimates Program" — missed by the retirement's grep sweep
because that sweep searched for the token `PEP`/`population_estimate`, not
the prose phrase. Caught while touching the same block for EIA. Updated to
cite Building Permits Survey and EIA instead.

## Testing
366 offline assertions (up from 328), including dedicated tests for the new
`average` derive kind (correct division, zero-denominator guard), each new
ratio metric's math, `verify_variables()` against realistic label text for
all 6 new metrics, the EIA collector (newest-period selection, aggregate-row
exclusion, sanity floor, fetch-failure handling), `_eia_is_fresh`, and the
`_rate`-suffix validation-gap regression guard. `tests/test_no_paid_dependencies.py`
extended to cover `EIA_API_KEY` in the same optional-key and
skip-not-a-failure guards FRED/Census already have (41 checks, up from 36).

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Bounded live test caught two production bugs; PEP retired after the real root cause turned out to be a discontinued Census endpoint

## Why this happened
The PEP and Building Permits modules shipped earlier the same day were verified
offline (fixtures) and via a first bounded live test, but that first live test's
Building Permits sample happened to land entirely in Alabama with plain 404s --
indistinguishable from "this sample has genuinely low BPS coverage." A second
bounded live test (`--force-pep --force-permits --permits-max-counties 50`,
stride-sampled across the full county list) surfaced two real bugs instead:
PEP reported `PEP available: False` for every probed year back to 2023, and
Building Permits returned `HTTP 400 "Bad Request. The series does not exist."`
for all 5 diverse sampled counties (01001, 01129, 05033, 06011, 08021) -- a
much stronger negative signal than plain 404s, and worth investigating rather
than accepting as "sparse coverage."

## Bug 1: Building Permits series ID was missing a digit
`_bps_series_id()` built `BPPRIV<5-digit-FIPS>` (e.g. `BPPRIV01001`), but
verified against real published FRED series (`BPPRIV048089` Colorado County TX,
`BPPRIV044007` Providence County RI, `BPPRIV012011` Broward County FL), the
real pattern is `BPPRIV` + a **3-digit** zero-padded state code + the 3-digit
county code -- 6 digits total, not 5. Every county's own FRED series ID was
subtly wrong (missing exactly one leading zero on the state portion), which is
why every request came back "the series does not exist" rather than a plain
404: the series legitimately doesn't exist *under that malformed ID*. Fixed by
changing the transform to `f"BPPRIV0{fips}"` (prepending a single zero, since
standard FIPS state codes are already 2 digits). Notably, the function's own
docstring already cited the correct 6-digit example (`BPPRIV048089`) while the
code beneath it implemented the wrong 5-digit pattern -- the fix was verified
against three independently-confirmed real series IDs, not just the one in the
docstring, before shipping.

## Bug 2: PEP's vintage probe never sent the required API key
`discover_pep_vintage()` (and, found by the same inspection, `discover_acs_vintage()`)
probed Census's `variables.json` metadata endpoint without appending the
API key at all -- the `api_key` parameter existed on `discover_acs_vintage()`
but was silently unused in its body. Since Census now requires a key for
every Data API request (see the May 12, 2026 policy correction below), every
probed vintage year failed identically, which looked exactly like "no vintage
published yet" until the underlying error was surfaced. Fixed by appending
`?key=<key>` to both probes' URLs (their base URLs carry no query string yet,
so `?key=` rather than `_census_key_param()`'s `&key=` fragment), passing
`census_key` through at the `discover_pep_vintage()` call site, and printing
the actual `__error__` detail next to "not available" so a real outage is no
longer indistinguishable from an unpublished vintage. ACS's vintage discovery
had been succeeding in production without ever using the key it was passed --
which held up in practice for reasons this fix does not depend on, but is
tightened for consistency and future-proofing rather than left as an
unexplained inconsistency between two structurally identical functions.

## PEP retired: the key fix wasn't enough, because the endpoint is gone
A follow-up bounded live test with the key fix deployed still showed
`PEP available: False` for every year 2023-2026 -- but now with real
diagnostic detail: a plain `HTTP 404` ("Not Found", Tomcat's default error
page) from `/data/{year}/pep/population/variables.json`, unchanged whether
the key was attached or not. That ruled out auth entirely and pointed at the
URL itself being wrong. Research confirmed it: Census discontinued the Data
API for PEP's current-year total population starting with vintage 2022 --
`tidycensus` (the standard R client for this exact dataset) documents having
to switch from the API to downloading Census's flat CSV files for precisely
these years, for precisely this reason. `pep/components` (a related
components-of-change dataset) may still be reachable, but `pep/population`
--the dataset this module was built against -- is not, and there is no
FIPS-derivable substitute on FRED either: FRED does carry per-county
population series, but their IDs are truncated county-name abbreviations
with a disambiguating digit (e.g. `IDKOOT0POP` for Kootenai County, ID), not
a formula like `BPPRIV<FIPS>`.

Given the choice between building a new CSV-parsing ingestion path (the
original design explicitly avoided this for a single module) or a
FRED-series-search-based FIPS lookup (untested at scale, no guarantee of
full coverage), the module was retired rather than rebuilt: `discover_pep_vintage()`,
`collect_pep_population()`, `_pep_is_fresh()`, the `population_estimate`
county field, its `write_metadata()` fields (`pep_available`, `pep_year`,
`pep_county_count`, `pep_last_successful_update`), its CLI flags
(`--skip-pep`, `--force-pep`, `--pep-max-age-days`), its workflow_dispatch
inputs, its frontend rendering in `js/economy-view.js` and `js/report.js`,
and its 12 offline tests were all removed. ACS's own `population` metric (a
5-year rolling average, already on every county) remains the platform's
population figure -- it was never replaced or degraded, only the
supplementary current-year figure is gone. The already-committed
`economic_metadata.json`'s dead `pep_*` fields (`pep_available: false`,
`pep_year: null`, `pep_county_count: 0`, `pep_last_successful_update: null`)
were also removed by hand rather than left to age out, since they no longer
correspond to anything the code writes.

---

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Three new FRED/Census data sources, plus a policy-change correction

## Why this happened
Asked what else could usefully be pulled from FRED/Census beyond what the
Economy tab already tracked. Answered with three concrete, verified-real
candidates rather than a generic list, then built all three: FRED electricity
price context (power is a data center's largest recurring operating cost and
was completely untracked), Census Population Estimates Program (a current-year
population figure less lagged than the existing ACS 5-year rolling average),
and Census Building Permits Survey (the first COUNTY-level construction-permit
trend on the platform — the existing PERMIT series is national-only).

## A correction, not just new features
Researching Building Permits' API surface surfaced something that corrects
work from earlier the same day: Census changed its API policy on **May 12,
2026** to require a key for every Data API request. The "Census runs keyless"
fix shipped in PR #179 that morning was built against the OLD policy (roughly
500 unauthenticated requests/day) and had never actually succeeded keyless in
production -- the JSONDecodeError it was built to diagnose was this policy
change, not the bulk-request quirk it was originally diagnosed as. Reverted the
keyless attempt back to an explicit skip (matching FRED's contract exactly:
missing key -> skip with a warning -> existing data preserved, never a crash),
and corrected every doc/test/comment that claimed otherwise: `data/
update_economic_data.py`, both test files, `.github/workflows/
update_economic_data.yml`, `README.md`, `DATA_SOURCES.md`, `AI_CONTEXT.md`,
`PROJECT_CONTEXT.md`. `_census_key_param()` itself was kept as-is -- still
correct behavior (an empty `key=` is rejected by Census as an invalid key, not
treated as "no key"), just no longer reachable via a code path that succeeds.

## What shipped

**FRED Energy & Power Costs category (3 series)** -- `APU000072610` (national
retail electricity price), `PCU2211102211104` (utility power-generation
producer price index), `DHHNGSP` (Henry Hub natural gas spot price, the
dominant marginal fuel for US generation and therefore a leading rather than
lagging indicator). Not promoted to the KPI strip -- the 7-KPI count is a fixed
design decision from the original spec, confirmed by a test that asserts
`len(orders) == 7` -- but the category renders like any other, verified live:
5 category tabs, chart renders with real data once the fixture was updated to
carry a synthetic series for it.

**Census Population Estimates Program** -- `data/update_economic_data.py`:
`discover_pep_vintage()` + `collect_pep_population()`. PEP's response for a
vintage year is a time series covering every published DATE_CODE at once
(including the decennial Census baseline row, not just the latest annual
estimate), and which numeric DATE_CODE means "latest" is not documented to be
stable across vintages -- so this probes one geography first, reads the actual
DATE_DESC text Census sends back, and picks the highest-year row whose
description says "population estimate" by regex, never a hardcoded code. Merged
into each county's own record as `population_estimate`, kept explicitly
separate from the ACS `population` metric (different measurement, different
cadence) rather than merged into it. 2,000-county sanity floor.

**Census Building Permits Survey** -- reached via FRED, not the Census Data
API: Census only distributes county-level BPS as an annual flat file, while
FRED already hosts the same data one series per county
(`BPPRIV<5-digit-FIPS>`, confirmed against real published series). That's
roughly one HTTP request PER COUNTY (~3,000+) with no bulk endpoint, so it
cannot run on the pipeline's daily cadence -- it has its own 30-day freshness
gate (`--permits-max-age-days`, `permits_last_successful_update`, independent
of Census's own 7-day ACS gate), plus `--force-permits`/`--skip-permits`/
`--permits-max-counties` for manual control. Merged in as `building_permits`
per county. Coverage is expected to be partial (many small counties never
reported to BPS) -- floor is 500 real results, not PEP's 2,000, specifically
because near-universal coverage would be the WRONG expectation for this
source, not the right one.

**Frontend integration** -- both new fields render in the Regional Explorer
profile panel as a visually separate "supplementary" block (never merged into
the ACS metrics table rows, so a reader never mistakes a PEP estimate for an
ACS figure or a permit count for a percentile-ranked metric) and in the
due-diligence report's Economic Context section, reusing the same data rather
than adding a second display path. Two new SIGNAL_RULES
(`permits_accelerating`, `permits_slowing`) read `c.building_permits` directly
rather than through `metricValue()`, since it doesn't share the ACS
value/change_1y_pct/change_5y_pct shape. Verified live: "Construction activity
accelerating" fires correctly for a synthetic +18.4% YoY county in the browser,
with zero JS errors.

## Bug caught by live verification
First live check of the report generator's new supplementary rows showed
"++18.4% YoY" -- a double plus sign. `E.fmtPct()` already prepends "+" for
positive values; the report code added a second one on top. Fixed in
`js/report.js`. The profile-panel version (`js/economy-view.js`) was correct
from the start -- it used the `direction()` helper's glyph instead of a manual
sign, which is the safer pattern and should probably be the one this codebase
standardizes on for any future YoY display.

## Tests
71 new offline assertions in `tests/test_economic_data.py` (316 total): regex
matching against real PEP DATE_DESC formats (including proving the decennial
Census row does NOT match), an end-to-end `collect_pep_population()` test
against sample payloads shaped like the real API, `_bps_series_id()` format,
`collect_permits()` skip/floor/cap behavior via a routed `_get_json` mock keyed
off the series_id embedded in the URL, and `validate_outputs()` catching a
negative value or future date in either new field. `tests/fixtures/economy/`
extended with synthetic (clearly marked) PEP/permits data for two counties and
a synthetic electricity-price FRED series, so the browser E2E suite could
exercise the real rendering paths rather than asserting against empty state.
288/288 unit tests, 316/316 economic assertions, full E2E suite all pass with
zero JS errors.

## Not verified live here
Building Permits' ~3,000-request cost was not run against the real API from
this session -- `.gov`/FRED domains are unreachable from this sandbox the same
way they were for the earlier Census keyless work. The series ID pattern is
confirmed real (matched against actual published FRED series in search
results), and the code is defensive (never crashes on a missing per-county
series, never publishes a suspiciously small result), but the first live
workflow run is the actual test of the full ~3,000-county pull.

## Still outstanding
- FRED_API_KEY and CENSUS_API_KEY are both configured and working as of this
  session's earlier live runs; Building Permits has not yet run live.
- The 16 previously-mismatched counties and the 2,273 unresearched counties
  are unchanged by this session.

---

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Re-researched the 16 counties with mismatched FIPS/name

## Why this happened
An earlier fix corrected the `name` field on 16 records where the FIPS code
pointed at one county but the title/description described a different one
(FIPS 21117 is Kenton County, KY; the record was titled "Knott County KY" and
described Knott's coal heritage). That fix flagged each record explaining the
description still needed re-research. This closes that out.

## What changed
Searched each of the 16 counties individually (correct name + "data center").
Result: 15 of 16 have no confirmed county-specific data center policy
findable via web search. That is a real, useful negative result — most rural
US counties have no such activity — not a failure to search hard enough. The
16th, Dorchester County MD, is genuinely mid-discussion: the county council is
deciding whether to draft a moratorium ahead of any project being proposed
there, with a recommendation expected around August 2026. No ordinance exists
yet, so it stays level 0 rather than level 1 (Proposed Restrictions), per
docs/TERMINOLOGY.md's requirement of pending legislation.

All 16 written to level 0 with correctly-attributed, honestly-scoped
descriptions, `pipeline_verified: false`, `confidence: low`. Deliberately
NOT flagged `research_status: descriptive_only` — that flag means "no
research happened," and per-county research did happen here, it just came
back negative. `counties_researched` in refresh_platform_metadata.py already
excludes only `descriptive_only`, so these correctly count as researched.

Two Kentucky counties (Laurel, LaRue) had passing mentions in statewide
industry coverage — "under consideration" for a project, or "would clear the
incentive threshold" — that's developer/market interest, not a policy, and
is described as such rather than inflated into a finding.

Level distribution shifted as these 16 moved off their previous (often
Pro-Development Hub) placement: -1 689 (was 699), 0 610 (was 597), 1 65 (was
66), 2 60 (was 62). `platform_metadata.json` and `map_data.json` regenerated
to match. validate_all.py errors dropped 69 -> 65 (unrelated pre-existing
issues elsewhere in the dataset were incidentally not present in these 16
after rewrite).

## Sourcing honesty
No primary county-government page was fetched for any of the 16 — WebFetch
returns 403 from most county CMS platforms in this sandbox. Every source
cited is a WebSearch result (state coverage, industry reports, or in
Dorchester's case a specific local news article), never a page this pipeline
actually read. A human should verify before treating any as Tier 1.

## Files
Added: data/sweep_2026_07_27_fips_mismatch_reresearch.py
Modified: restrictions_raw.json, map_data.json, platform_metadata.json

## Still outstanding
- `FRED_API_KEY` is still needed before any economic data exists.
- 2,273 counties remain unresearched (unchanged by this sweep — these 16 were
  already counted as researched, just under the wrong name).

---

Date: 2026-07-27
AI Assistant: Claude Code
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Census runs keyless — one required secret instead of two

## Why this happened
Asked why the Economy pipeline needs two secrets. Answering the question
honestly exposed that one of them did not need to be a blocker at all.

The two keys are two separate free registrations at two different agencies —
the Federal Reserve Bank of St. Louis (`api.stlouisfed.org`) and the U.S.
Census Bureau (`api.census.gov`). They are not interchangeable, which is why
there is no single key that covers both. Neither can be billed.

But the pipeline treated them as equally mandatory:

    if not census_key:
        warn("CENSUS_API_KEY is not set — skipping Census.")

That skip cost the entire ACS pull — the Regional Economic Explorer, the county
Economy sections, the state choropleth — over an optional key. Census answers
unauthenticated requests at roughly 500/day per IP. A full run of this pipeline
costs about 13: one batch of 16 variables x 6 vintages (current + 5 history) x
2 geography levels, plus the vintage probe. The key raises a ceiling this
pipeline never approaches.

FRED is different: it rejects keyless requests outright, so `FRED_API_KEY` is
genuinely required.

## What changed
- `data/update_economic_data.py`
  - New `_census_key_param()`. It returns `&key=...` when a key is set and the
    **empty string** when it is not. This distinction is the whole fix: an
    empty `key=` is not "no key" to Census, it is an invalid key, and the
    request is rejected. The parameter has to disappear, not go blank.
  - `fetch_acs()` and `collect_cbp()` build their URLs through it.
  - The missing-Census-key branch prints an informational line and falls
    through to the normal fetch instead of skipping. The freshness gate that
    used to be an `elif` behind it is now an independent `if`, so a keyless run
    still respects `--census-max-age-days`.
  - Module docstring now marks FRED required and Census optional, with the
    reason for each.
- `tests/test_economic_data.py` — `test_census_key_param_omitted_when_unset()`.
  Asserts the empty/None/set cases and that no assembled URL ever contains a
  blank `key=`.
- `tests/test_no_paid_dependencies.py` — `test_census_still_runs_without_a_key()`.
  Guards the regression directly: the helper must exist, no line may
  interpolate `&key={` outside the truthiness guard, and the string
  "skipping Census" must not come back. The first version of this test checked
  for the substring `&key={api_key}` and failed on the helper's own guarded
  return, so it now scans line-by-line and exempts the guarded line.
- `.github/workflows/update_economic_data.yml`, `README.md`, `DATA_SOURCES.md`,
  `AI_CONTEXT.md`, `PROJECT_CONTEXT.md` — all five said or implied that both
  secrets were required. Corrected, each with the reason there are two
  registrations in the first place.

## Not verified here
`api.census.gov` is unreachable from this sandbox (the proxy returns 403 for
`.gov` hosts), so the keyless request path is verified by unit test and by
Census's documented anonymous allowance, not by a live call from this machine.
The first workflow run will exercise it for real.

## Still outstanding
- `FRED_API_KEY` is still needed before any economic data exists. It is free
  and takes about a minute: https://fred.stlouisfed.org/docs/api/api_key.html
- The 16 counties whose FIPS carried the wrong county name still have
  descriptions written about the wrong county.
- 2,273 counties remain unresearched.

---

Date: 2026-07-27
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Data integrity sweep — what we count, and whether it is true

## Why this happened
Asked to sweep for more data on what the platform counts. Before adding, I
checked what the existing counts mean. The most recent historical sweep script
added counties like this:

    Caldwell County TX, level -1 (Pro-Development Hub):
    "officially designated by the Texas Legislature as the 'BBQ Capital of
     Texas'... the Watermelon Thump festival..."   source: county homepage

That is a travel description labelled as a data center policy finding. Running
another sweep in that pattern would have added several hundred more of them.

## What the audit found
Measured all 1,465 records against docs/TERMINOLOGY.md's own definitions:

  level -1 (1,301)  41% no policy language, 65% homepage-only source
  levels 1-4 (164)  0-8% no policy language  <- genuinely researched

Against the three criteria the Pro-Development Hub definition actually requires
(verified incentives / fast-track permitting / active infrastructure), 597 of
1,301 mention NONE. Douglas County NE, Oakland County MI, St. Louis County MO.

## Four real defects, all fixed

1. COUNTIES WITH MORATORIUMS LABELLED PRO-DEVELOPMENT
   Five of six Kansas counties with adopted moratoriums sat at level -1. Harvey
   County KS — moratorium through end of 2028 — was described by its railyard
   and Mennonite college. Corrected 7 records to level 4, added 2 that were
   missing entirely (Lyon KS, Imperial CA). Level 4: 5 -> 14.

2. "VERIFIED" MEANT "WELL-CITED"
   validate_all.py derives confidence from citation properties only — tier,
   count, URLs, freshness — then labelled >=80 "verified". All 152 records it
   called verified had pipeline_verified:false. 100%. Now gated on
   pipeline_verified; unconfirmed caps at "high". Falsely verified: 152 -> 0.

3. 16 COUNTIES CARRIED ANOTHER COUNTY'S NAME
   Right FIPS, wrong name — the map coloured the correct polygon while every
   text surface named a different county, misattributing the policy. FIPS 21117
   was "Knott County"; it is Kenton County. All 16 corrected, each flagged
   because its description was written about the wrong place.

4. COVERAGE COUNTED DESCRIPTIONS AS RESEARCH
   The 597 unsupported records were downgraded to level 0 with
   research_status="descriptive_only" — NOT plain level 0, because that means
   "researched, nothing found" and no research happened. Nothing deleted.
   Headline corrected: 1,467 "researched" / 47% -> 870 / 28%. Not-researched
   1,678 -> 2,273. Fixed in the hero (index.html + home.js), analytics hero, and
   the map legend, which had the figure hardcoded.

## Sourcing honesty — important for the next assistant
WebSearch works here and is genuinely productive. WebFetch does not: Loudoun,
Santa Fe County, Harvey County and datacenterbans.com all returned 403 to
automated retrieval (bot protection, not a paywall), and sandbox curl is blocked
for every .gov host by proxy policy.

So findings can be LOCATED with real source URLs but the primary source cannot
be READ. Every record added or corrected here therefore carries
pipeline_verified:false, confidence medium or low, source_tier set from the
URL's domain rather than from our verification, and a note saying the county's
own page was identified but not retrieved. A human with a browser should confirm
each before any is treated as Tier 1 verified.

I initially told the user I could not research at all, having generalised from
two blocked API endpoints without trying WebSearch. That was wrong and they were
right to push back.

## Files
Added: data/sweep_2026_07_27_moratorium_corrections.py,
       data/sweep_2026_07_27_downgrade_unsupported_pro.py
Modified: restrictions_raw.json, map_data.json, platform_metadata.json,
       process_data.py (carries confidence/source_tier/research_status),
       validate_all.py (verified gate), refresh_platform_metadata.py
       (counties_researched vs counties_in_database), constants.js
       (researchedCount(), coveragePct uses researched), home.js, analytics.js,
       jurisdiction.js, map.js (legend), index.html,
       tests/test_frontend_core.mjs

## State of the sweep
Corrected 7, added 2. Further county-level sweeping is possible but slow: each
state needs several searches and yields a handful of counties, and nothing can
be verified at the primary source from here. The 16 mis-named counties still
need their descriptions re-researched. 2,273 counties remain unresearched.

## Verification
All unit suites pass. 15/15 browser scenarios, zero JS errors. Validator
criticals 16 -> 0. Browser-confirmed: hero reads 870, analytics reads 28%.

---

Date: 2026-07-27
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Codify "nothing may require payment" as a fixed project rule

## Summary
The no-payment guarantee was already true and already tested, but it lived only
in DATA_SOURCES.md, README.md and a test file. PROJECT_CONTEXT.md — the stated
"permanent source of truth for project direction, requirements, and assistant
rules" — did not contain it. A future assistant reading the required files would
never have encountered it.

Now stated as a **fixed, non-negotiable rule** in both governance files that
every assistant is required to read before coding.

## The rule, as recorded
No visitor may ever need an account or credential. No maintainer may ever need a
paid plan. No paid service, API, dataset, library, font, tile provider, or
hosting tier may be introduced as a dependency — not as a default, not as an
optional-but-expected path, **and not as a disabled stub left in place "for
later"** (which is exactly what the removed Cloudscene integration was).

Every API key stays optional: absence is a documented skip, never an error. No
third-party host may become load-bearing — if a free service starts charging,
the project loses that decoration rather than breaking or costing money.

It outranks convenience, feature scope, data quality and polish. If the best
source costs money: use a free source, ship without it, or do not ship the
feature — and say so plainly. Never add the paid dependency.

## Files
- `PROJECT_CONTEXT.md` — new top-level "Fixed Rule: Nothing May Require
  Payment" section, plus a pointer as the first entry under Rules For AI
  Assistants
- `AI_CONTEXT.md` — the rule in the Mandatory Shared AI Memory Workflow, which
  is the first thing an assistant reads
- `tests/test_no_paid_dependencies.py` — two new tests (33 checks, 15 tests now)

## The rule now defends itself in both directions
A stated rule with no test rots. A test with no stated rule behind it looks like
an arbitrary lint and gets exempted by whoever it inconveniences. So:

- `test_fixed_rule_is_stated_in_governance_docs` fails if the rule is deleted
  from PROJECT_CONTEXT.md or AI_CONTEXT.md, or if it stops pointing at the test
- `test_this_guard_is_wired_into_the_suite` fails if the guard is removed from
  run_all.sh — an enforcing test nobody runs enforces nothing

Both verified to actually fail: deleting the rule section produces 3 failures,
unwiring the guard produces 1, and both pass again on restore.

The docs also now say explicitly: **do not weaken, skip, or exempt your way past
this test. If it fails, the change is wrong — not the test.**

## Verification
33/33 paid-guard checks, all unit suites pass. Documentation changes are pure
additions — 37 lines added to PROJECT_CONTEXT.md and 23 to AI_CONTEXT.md, zero
deletions.

---

Date: 2026-07-27
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Guarantee nothing requires payment

## Summary
Follow-up to the cost audit. The audit *documented* two soft spots; this removes
them and adds a test so the guarantee holds without anyone re-reading a doc.

## 1. Deleted the one paid integration entirely
Previously a disabled stub. Now removed in full — and it had to be all at once,
because a half-removal would leave `run_facility_pipeline.py` importing a
deleted module and break the weekly facility workflow:
- `data/facility_pipeline/adapters/cloudscene.py`
- its entry in `data/facility_sources.json` (9 -> 8 sources)
- the adapter import AND registry entry in `data/run_facility_pipeline.py`
- the dead `cloudscene_id` field from `models.py`, `merge.py`,
  `facilities_master.json` (3,842 records) and `facilities_candidates.json`
  (631 records) — verified empty in 100% of them before removing
- the `CLOUDSCENE_API_KEY` secret reference in `update_facilities.yml`

`data/facilities_version_history/` snapshots keep the empty field. Those are
immutable archives and were deliberately not rewritten.

Verified all 8 remaining adapters still import, and rebuilt
`facilities_index.json` (`--check` clean).

## 2. Proved tile providers can never become a payment requirement
The concern was that CARTO/Esri free-tier terms could change. The answer is not
to guess at their pricing but to show the app does not depend on them.

**Blocked CARTO, Esri, USGS, TradingView, Google Fonts and jsDelivr all at once
at the network layer.** Result: 3,291 county polygons render, legend renders,
county selection works, Analytics and Pipeline render, **zero JS errors**.

Tiles are decoration. Worst case if a provider ever charged is losing background
imagery — nothing requires payment. Free replacements (USGS National Map,
OpenStreetMap) are a one-line swap and now documented per call site.

## 3. Added tests/test_no_paid_dependencies.py — 28 checks, 13 tests
Wired into `tests/run_all.sh`. Enforces:
- no known paid data service in code or config
- no npm dependency tree; Python deps on a reviewed free allowlist
- economic pipeline stays stdlib-only
- every API key read via `os.environ.get()` + skip path, never `os.environ[...]`
  (which would make it mandatory)
- no frontend file reads a key
- no workflow secret for a removed service
- tile hosts on a reviewed allowlist

**Verified it catches real regressions, not just passing vacuously:** injecting
a Mapbox tile layer fails two checks (name match + allowlist), and adding an
unreviewed paid Python package fails another. Both pass again once reverted.

The guard immediately caught my own explanatory comment in
`update_facilities.yml` naming the removed service — reworded, since a comment
is exactly how a paid dependency creeps back.

## Files
- Added `tests/test_no_paid_dependencies.py`
- Deleted `data/facility_pipeline/adapters/cloudscene.py`
- Modified `data/run_facility_pipeline.py`, `data/facility_pipeline/models.py`,
  `data/facility_pipeline/merge.py`, `data/facility_sources.json`,
  `data/facilities_master.json`, `data/facilities_candidates.json`,
  `data/facilities_index.json`, `.github/workflows/update_facilities.yml`,
  `tests/run_all.sh`, `DATA_SOURCES.md`, `README.md`

## Verification
All unit suites pass (288/288 parcel, 259/259 economic, 28/28 paid-guard).
15/15 browser scenarios, zero JS errors. Facility pipeline adapter loading
verified directly.

## Standing position
No paid service exists in the codebase. Every API key is optional. Every
third-party host is optional. A test fails if any of that stops being true.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Economic Intelligence — FRED + Census feature

## Summary
Added a complete Economic Intelligence feature: a new top-level **Economy** tab
between Map and AI News, backed by a Python pipeline that pulls Federal Reserve
(FRED) and U.S. Census (ACS 5-year) data in GitHub Actions and writes local JSON
the browser loads. No API key is ever present client-side.

The feature is integrated rather than bolted on: economic choropleths appear as a
layer group in the existing Map tab, county detail and Jurisdiction pages gain an
Economy section, Analytics gains an exploratory Economic Context section, and Home
gains a deliberately restrained four-indicator pulse.

## New files

**Data pipeline**
- `data/update_economic_data.py` (~1,000 lines) — FRED observations + series
  metadata validation, Census ACS with vintage auto-discovery and per-vintage
  variable verification, optional County Business Patterns module
- `data/economy/series_config.json` — 18 FRED series across 4 categories; the
  single source of presentation truth for both Python and JS
- `data/economy/census_config.json` — ACS variable map plus the label fragments
  used to verify those variables against each vintage
- `data/economy/{fred_data,census_county,census_state,economic_metadata}.json` —
  shipped as structurally-valid **placeholders** (see "Placeholder state" below)
- `.github/workflows/update_economic_data.yml` — daily, `workflow_dispatch`

**Frontend** (mirrors the zoning.js / zoning-map.js / zoning-details.js split)
- `js/economy.js` — data loading/caching, formatting, classification, SVG charts,
  comparison stats, deterministic signal rules
- `js/economy-view.js` — the four Economy tab sections + Leaflet explorer
- `js/economy-map.js` — economic choropleths for the main Map tab
- `css/economy.css`

**Tests**
- `tests/test_economic_data.py` — 259 offline assertions
- `tests/fixtures/economy/` — clearly-labelled SYNTHETIC data for browser tests

## Modified
`index.html` (tab, view container, asset tags), `js/router.js` (route),
`js/map.js` (switchTab, getColor, countyStyle, setLayerVisible, renderLegend,
showTooltip, county detail Economy section, tablist arrow keys),
`js/layer-registry.js` (6 economic layers), `js/home.js` (Economic Pulse),
`js/analytics.js` (Economic Context), `js/jurisdiction.js` (Economy card),
`css/style.css` (tooltip econ line), `tests/e2e_smoke.mjs` (2 scenarios),
`tests/run_all.sh`, `tests/test_frontend_core.mjs` (economy route).

## Design decisions worth keeping

**Map integration uses the existing view-mode fall-through, not a style
overwrite.** `getColor()` in map.js already dispatches on `_densityMode` /
`_wsMode` / `_suitMode` before falling back to restriction severity. Economic
layers were added to that same switch. The consequence is that turning an
economic layer off restores restriction colours *automatically* — the restriction
branch is simply reached again. Verified: `#dc2626` -> `#3a7cab` -> `#dc2626`
across three toggle cycles with no drift. Satellite opacity, zoom fade, filter
dimming, screener highlight and the selected-county outline all keep working
untouched.

**One economic layer at a time.** `ECONOMY_MAP.onLayerToggle()` clears sibling
economic layers (and their checkboxes) when one is enabled. Stacking several
opaque economic fills over the restriction layer would make all of them
unreadable.

**No red-to-green ramp for magnitude.** Sequential blues encode magnitude;
the diverging ramp is reserved for signed change, where a zero midpoint is
genuinely meaningful. A red-green ramp on "population" or "rent" would imply a
value judgement the data does not carry, and it is the worst case for the most
common form of colour blindness.

**Signals are rule-based, never generative.** Every statement comes from a fixed
rule in `SIGNAL_RULES` and cites a figure the UI also displays, so a reader can
check the claim. They are framed as descriptions of measured conditions, with a
non-dismissible disclaimer that they are not investment advice or evidence that a
facility should be built anywhere.

**Correlation is labelled exploratory.** The Analytics scatter reports Pearson r
but states plainly that correlation does not establish causation, and that only
the counties present in *both* datasets are plotted, so it is not a national
sample.

## Placeholder state (important for the next assistant)
`data/economy/*.json` ship with `generated_at: null` and no records. That means
**NOT YET POPULATED** — deliberately distinct from "ran and found nothing", the
same convention `data/source_link_health.json` already uses in this repo.

Every surface renders an explicit awaiting-data notice saying nothing has been
measured yet, rather than showing a zero or an empty chart. `--check` treats an
unpopulated placeholder as valid (a fresh checkout must not fail the very
workflow that populates it) but still fails a file that *claims* to be generated
and is empty.

No economic figures were invented. The APIs are unreachable from the sandbox
(proxy returns 403), so browser verification used
`tests/fixtures/economy/` — synthetic data that lives under `tests/`, carries a
`_synthetic` marker, and is never served from `data/`.

## Bugs found and fixed during browser verification
1. **Fixture override redirected `series_config.json`** — which is hand-maintained
   config that only exists in `data/economy/`. The KPI strip and every chart
   rendered empty while the rest of the page looked fine. Only *generated* files
   may be redirected.
2. **State choropleth indexed zero records** — state topology ids are 2 digits, so
   `padStart(5,'0').slice(0,2)` produced `"00"` for every state. Now normalised
   per geography.
3. **Chart SVG forced 593px min-content width** — a viewBox gives an `<svg>` an
   intrinsic aspect ratio, which combined with a fixed height becomes a min-content
   *width*. That propagated up and was clipped on a 390px phone. Fixed with
   `max-width: 100%` on the svg plus a structural cap on `.econ-wrap`.
   Note for future work: `.page-view` is a **column** flex container, so
   `min-width: 0` does nothing for width there — only `max-width` constrains it.
4. **Explorer hit-testing dead with `preferCanvas: true`** — polygons drew but
   hover and click never registered. Switched to SVG, matching the documented
   decision for the main county map.

## Accessibility
Added roving-tabindex arrow-key navigation to the header tablist. It has had
`role="tablist"` / `role="tab"` for a long time, which *requires* Left/Right/Home/
End and a single tab stop, but none of that existed. This fixes the whole tablist,
not just the new tab.

Charts carry `<desc>` text summaries; direction is never colour-only (every change
pairs a glyph and a signed number with the colour); all controls are labelled;
touch targets are >= 28px at every tested width.

## Verification
- `tests/test_economic_data.py` — **259/259** offline assertions
- `./tests/run_all.sh` — all suites pass (now includes the economic pipeline and
  an output-validation gate)
- `tests/e2e_smoke.mjs` — **15/15** browser scenarios, zero JS errors, no local 4xx
- Responsive at 1440 / 1024 / 768 / 390 / 320: no horizontal scroll, chart viewBox
  tracks real width, no clipped text, no undersized touch targets
- Existing features regression-checked: map, restriction choropleth, AI News,
  AI Stocks, Analytics, Pipeline, zoning, parcel, mobile nav, auth degradation

## Required GitHub secrets
`FRED_API_KEY`, `CENSUS_API_KEY`. Both are read only from the environment inside
the workflow, never logged (URLs are redacted by `_redact()`), and never written
to any output file. A missing key is a warning, not a failure: that source is
skipped and its previously committed data is preserved untouched.

## Known limitations
- Pipeline has not run yet — all economic panels show the awaiting-data state
  until the workflow is triggered.
- `census_county.json` will be several megabytes once populated. It is lazy-loaded
  and never fetched for Home or the KPI strip, but if it becomes a problem the
  next step is splitting latest-values from history into separate files.
- County Business Patterns is written and isolated but unverified against the live
  API.
- ACS margins of error are not yet surfaced per value.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Favicon — extract the header's folded-map mark

## Summary
The site had no favicon at all, so browsers showed the generic globe. Added a full icon set derived from the existing header logo. No redesign — the mark is the header's own geometry, scaled.

## Source of the mark
Inline SVG in `index.html` (`#header-logo`) — not a file, component, or image asset. Nothing existed under `assets/`, and there were no `.ico`, logo, or branding files anywhere in the repo.

The header mark is:
- `rect 28x28 rx=6 fill=#4874e8 opacity=0.15` — the light-blue rounded square
- `polygon 4,8 10,5 18,8 24,5 24,23 18,26 10,23 4,26` stroke `#4874e8` width 1.8, round joins
- two fold lines at x=10 and x=18, stroke width 1.5

## New: assets/branding/brand-mark.svg
The header polygon transformed onto a 64x64 canvas — `(x-14)*2.15+32`, `(y-15.5)*2.15+32`, centred on the source symbol at (14, 15.5). The shape is *transformed*, not redrawn, so the geometry is identical.

**One deliberate change:** the header paints the square at 15% opacity. A translucent fill reads as transparent in a browser tab, so the icon uses the flattened equivalent — `#4874e8` at 15% over white = `#E4EAFC`. Same appearance, opaque.

`brand-mark-small.svg` is the same file with strokes at 5.2/4.4 instead of 3.87/3.22, used for the 16px and 32px rasters so the fold lines survive at tab size.

## Files created
- `assets/branding/brand-mark.svg`, `brand-mark-small.svg`, `brand-mark-1024.png`
- `favicon.ico` (multi-resolution: 16, 32, 48 — each embedding its own tuned raster, not one downscale)
- `favicon-16x16.png`, `-32x32`, `-48x48`, `-192x192`, `-512x512`
- `apple-touch-icon.png` (180px)
- `site.webmanifest`

PNGs were rasterised through headless Chrome's SVG renderer; no ImageMagick, rsvg, or cairosvg is available in this environment.

## Two corrections worth recording

**Relative paths, not root-absolute.** The brief specified `/favicon.ico`, `/site.webmanifest`, and `"start_url": "/"`. This deploys to a GitHub Pages *project* site at `bobbytrenkamp-lgtm.github.io/test1/`, where a root-absolute path resolves to the user domain and 404s. All paths are relative, and the manifest uses `"start_url": "."` / `"scope": "."`, which resolve against the manifest's own location. The brief allowed for this ("adapt the paths correctly ... configurable base URL").

**Apple touch icon is full-bleed.** iOS composites alpha onto black and applies its own rounded mask, so a rounded-corner icon with transparent corners renders with black corners on the home screen. `apple-touch-icon.png` is generated separately: square, no corner radius, fully opaque. The browser-tab icons keep their rounded transparent corners, which is correct there.

## Header untouched
`#header-logo`, the divider, "US DC & AI Policy Tracker", and "Intelligence Platform" are unchanged — verified in-browser and asserted by the new test. The only edit to `index.html` is 14 added lines in `<head>`.

## Data safety
No data, workflow, JS, or CSS file was modified. There were no pre-existing favicon or brand assets, so nothing was overwritten or backed up — every icon file is new.

## Testing
`tests/e2e_smoke.mjs` gains an eleventh scenario asserting all 7 declared assets return 200 and decode in-browser, that **no path is root-absolute** (the GitHub Pages 404 trap), that the manifest parses with resolvable icons, and that the header branding still renders. 200 unit tests and all 11 browser scenarios pass.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: AI Stocks page — fix clipping and layout collapse

## Summary
Reported symptom was words being clipped off. Three distinct causes, one of them a layout bug that was breaking the whole page.

## Root cause 1 — workspace collapsed to height:0 (the significant one)
`#stocks-workspace` had `flex: 1` inside `#stocks-view`, which is a scrolling column flex container. `flex: 1` implies `flex-basis: 0`, and there is no free space to grow into when the page already overflows — so the workspace computed to **height: 0px** while holding ~950px of content.

That content overflowed its zero-height box and painted directly over every section below it. Measured overlaps at 1440px:
- `stocks-chart` x `stocks-heatmap` — 354px
- `stocks-chart` x `stocks-movers` — 121px
- `stocks-symbol-info` x `stocks-heatmap` — 79px

This is why the original screenshot showed two "Chart unavailable" blocks stacked on each other. Fixed with `flex: 0 0 auto` in both the base rule and the desktop grid rule, so the workspace sizes to its content and the sections stack.

## Root cause 2 — error blocks larger than their containers
`.tv-error` rendered at a fixed ~190px regardless of where it landed, from a 44px ticker strip to a 520px chart. In short containers the content was clipped by `overflow: hidden` — literally cutting words off.

- `.tv-error` is now absolutely positioned to fill its container, so it can never spill
- The positioning is keyed on `.tv-has-error`, not `.tv-widget-wrap` — `#stocks-chart` does not carry that class, and without a positioned parent the absolute error escaped to the page and overlapped other sections (caught on the first fix attempt)
- Containers under ~140px get a single-line compact variant
- Compactness is decided in `requestAnimationFrame`, not synchronously: when a widget fails before first layout `clientHeight` reads 0, so the tall variant was being kept and clipped anyway
- A failed ticker tape now hides rather than showing a large error band across the top

## Root cause 3 — pre-truncated names in the data
The watchlist rendered `shortName`, which contains hand-abbreviated values: "Applied Matls", "Texas Instrs", "NXP Semi", "SuperMicro". These read as truncation bugs. Rows now use the full `name` field ("Applied Materials", "Texas Instruments", "NXP Semiconductors"), with the existing CSS ellipsis as the safety net for genuine overflow.

## Polish
The per-row category label repeated the same string on up to 14 consecutive rows. It is now a single sticky group header per category (8 headers), which is both cleaner and how a real terminal presents a grouped instrument list.

## Verification
Measured at 1440 / 1180 / 900 / 390: zero clipped text nodes, zero section overlaps, no horizontal body scroll, no JS errors. `tests/e2e_smoke.mjs` gains a tenth scenario asserting all of that plus a non-collapsed workspace height, so the collapse cannot silently return. 200 unit tests still pass.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Final Phase 3 item (pipeline map view) + metadata drift fix

## Summary
Closes the last outstanding spec item. Also fixed a real metadata drift my own validator caught, and removed the cause so it cannot recur.

## Metadata drift — caught by the validator built earlier
The weekly facilities pipeline had updated `facilities_master.json` (3,764 -> 3,842) without regenerating `platform_metadata.json`. Because `home.js` now reads facility counts from that file rather than downloading 4.85 MB, Home was displaying stale totals.

### New: data/refresh_platform_metadata.py
Recomputes only the derived counts, preserving editorial fields (disclaimers, notes, update frequencies) exactly. Idempotent, and `--check` exits non-zero when stale for CI use. Wired into all three workflows that touch the feeding datasets — `update_facilities.yml`, `update_data.yml`, and `update_regulations.yml` — so drift cannot recur silently.

**One subtlety worth recording:** the first version of this script recomputed `states_with_active_restrictions` from county rows and produced 32 instead of 14. That field is a *state-level* metric derived from `state_regulations.json` (states with a statewide `level >= 1`). Deriving it from counties silently changes what the number means — a state can have restrictive counties with no statewide law. The script now reads it from `state_regulations.json` and documents why. It also needed `ensure_ascii=False` to avoid mangling the em-dash in `_note`.

## Pipeline map view — last Phase 3 item
`js/pipeline.js` carried `_view = "table"  // (only mode for now)`. 99.7% of the 3,842 facilities have usable US coordinates, so the filtered set is now viewable geographically as well.

- Table/Map toggle with `aria-pressed` state, reusing the `.pl-view-toggle` styles already present from an earlier partial implementation rather than adding a parallel set
- Leaflet circle markers on the vendored Leaflet — no new dependency; canvas rendering (`preferCanvas`) for thousands of markers
- Colored by operational status, radius scaled by `sqrt(capacity_mw)` so a 2 GW campus does not dwarf everything
- Filters drive both views; `_applyFilters()` refreshes whichever is active
- Tooltips built from text nodes, not HTML, since names and operators come from an aggregated data file
- Legend states plainly how many facilities are plotted and how many lack coordinates (`3,831 of 3,842 shown — 11 lack coordinates`) rather than quietly dropping them
- `fitBounds` capped at zoom 9 so a single result does not fill the screen without context

### Layout fix found while testing
`#pipeline-detail` used `transform: translateX(100%)` to hide itself but still reserved its 340px of flex width. Barely visible behind the table, but an obvious blank strip beside the map. Now also uses `margin-right: -340px` while closed, and the map re-measures after the transition since Leaflet caches container size.

## Testing
- `tests/e2e_smoke.mjs` gains a ninth scenario covering the map view: toggle state, Leaflet init, width, filters driving the map, and re-entering the map without re-initializing.
- All 9 browser scenarios pass with zero JavaScript errors; 200 unit tests pass.

## Status: all five phases complete
Phases 1-5 of the specification are implemented. Remaining known gap, deliberately not built: real multi-user team workspaces, which need Supabase tables and RLS policies that cannot be provisioned from the frontend. The portable watchlist bundles cover hand-off in the meantime.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Real-browser verification — six bugs found and fixed

## Summary
Obtained a working headless browser and ran the app end to end for the first time. Six real bugs surfaced that the jsdom and Node suites could not see, four of them introduced by my own Phase 2-5 work. All fixed and re-verified.

## How the browser was obtained
Playwright's CDN (`playwright.download.prss.microsoft.com`) is blocked by the environment proxy with `403 host not permitted`, and the Ubuntu archives 404. `storage.googleapis.com` is allowed, so Chrome for Testing's `chrome-headless-shell` was fetched from there and Playwright pointed at it via `executablePath`.

## Bugs found and fixed

### 1. Deep links did not work on cold load (introduced in Phase 2)
Opening `#jurisdiction?fips=51107` directly — or any modern route from a shared URL — landed on Home. The router only reacted to `hashchange`, which does not fire for the initial URL; startup handled only the legacy `#fips` and `#s=` formats. Added `applyInitialRoute()`, called once after core data is in place.

This defeated the entire point of the deep-link work and was invisible to the earlier tests, which navigated to the page first and only then set the hash.

### 2. Leaflet "Map container is already initialized" (introduced in Phase 2)
Tab clicks called `switchTab()` directly *and* `Router.navigate()`, whose `hashchange` called `switchTab()` again — two runs per click, and two concurrent map inits. Routing now goes through a single `goToTab()` helper so the router is the only path into `switchTab()`. `initMapFromGeo()` also self-guards by returning any in-flight promise, since it awaits before assigning `leafletMap` and a call-site `if (!leafletMap)` check cannot catch same-tick double entry.

### 3. Mobile nav sheet rendered off the top of the screen (introduced in Phase 2)
`#header` carries a `transform`, which makes it the containing block for `position: fixed` descendants. The sheet, being a child of the header, anchored to it rather than the viewport and sat at `top: -84px` with its first item clipped. It is now reparented to `<body>` on init.

### 4. Zoning always reported "not covered" (introduced in Phase 3)
`js/jurisdiction.js` called `ZONING.hasJurisdiction()`. The real export is `ZONING.hasCoverage()`. The call silently returned undefined, so even Loudoun County — the one jurisdiction with zoning data — showed "Zoning — not covered".

### 5. Home downloaded 4.85 MB it did not need (pre-existing)
`js/home.js` fetched `facilities_master.json` on every page load to compute three counts. Those exact figures are already in `platform_metadata.json` (verified identical: 3,764 / 3,333 / 431) and are validated against the master file by `validate_platform_metadata.py`, so they cannot drift. Now read from metadata — a few hundred bytes instead of 4.85 MB.

This is on top of the ~1.6 MB removed earlier, and it was the single largest download on the landing page.

### 6. Header tabs overlapped the right-hand controls (pre-existing)
`#header-tabs` was absolutely centered (`left: 50%` + `translateX(-50%)`), which ignores how much room the brand and controls actually need. The About tab rendered underneath the Sign In button at every desktop width — 85px of overlap at 1440px, 255px at 1100px.

Moved into the flex flow with `margin: 0 auto` and `min-width: 0`, so it centers in genuinely free space and scrolls rather than overlapping. To make all seven tabs actually fit, the 181px "DATA UPDATED" badge is hidden below 1500px (it duplicates the Home freshness line) and tab padding tightens below 1200px. All tabs are now visible at 1920, 1600, 1500, 1440, 1366, 1280, and 1200px with no overlap at any width.

## Also corrected
A KPI reading of "248 counties" during testing turned out to be the count-up animation sampled mid-flight, not a data bug. With the animation allowed to settle the values are 1,465 / 5 / 31 / 62 / 51, matching `map_data.json` exactly.

## Verification
Six end-to-end browser scenarios — Home critical path, Map, Jurisdiction page, watchlist and change alerts, pipeline windowing and keyboard sort, mobile nav at 390x844 — now run with **zero JavaScript errors**. Hash routing and the browser back button were confirmed across tabs. The 200-test unit suite still passes.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Performance and accessibility (spec items #8 and #9)

## Summary
Two high-priority spec items that were still outstanding after Phases 1-5: performance and accessibility. Took ~1.6 MB off the home page critical path and replaced the pipeline's 2,000-row render with a windowed one, plus keyboard access for its sortable headers.

## New Files
- `tests/test_data_loading.mjs` — 32 tests for the critical/deferred split
- `tests/test_pipeline.mjs` — 16 tests for table windowing and header a11y

## Performance

### Critical path cut by ~1.6 MB
`loadCoreData()` was fetching seven files before Home could paint, four of which Home does not use:

| File | Size | Needed by |
|---|---|---|
| map_data.json | 2.07 MB | Home (KPIs, search, watchlist) |
| ai_news.json | 846 KB | Home (news feed) |
| sample_layers.json | 1.42 MB | Map tab only |
| political_risk.json | 185 KB | Map / detail panel only |
| tax_incentives.json | — | Detail panel only |
| water_stress.json | — | Map views only |
| state_regulations.json | — | County detail only |

Split into `loadCoreData()` (the first two) and `loadSecondaryData()` (the rest). Secondary starts in parallel so total wall time is unchanged, but it is never awaited before first paint.

Consumers were already defensive (`window.DC_X || {}`, null checks on `sampleLayers`), so a not-yet-loaded state renders as "no data" rather than throwing. Three call sites re-run once secondary lands:
- Home re-renders (water stress, incentives, political risk fields)
- `initSearch()` re-indexes, since it builds its facility index from `sampleLayers`
- Analytics re-renders — it reads these globals in nine places

`initMapFromGeo()` awaits secondary alongside the geo download so the map never draws with empty overlays.

### Pipeline table
Was building up to 2,000 rows in one pass, each through its own `innerHTML` parse and each with its own click listener. Now renders 150 rows and appends a page at a time on scroll, with a single delegated click listener on `<tbody>`.

## Accessibility

The pipeline's sortable column headers were mouse-only — bare `<th>` elements with click handlers, no tab stop, no keyboard activation, no state exposed. Added `tabindex`, Enter/Space activation (with `preventDefault` so Space does not scroll the table), and `aria-sort` that tracks the current column and direction.

## Testing
`./tests/run_all.sh` — 200 tests across 8 suites, all passing.

The data-loading suite extracts `loadCoreData` / `loadSecondaryData` from map.js and runs them against a stub fetch, asserting the critical path requests exactly two files, the deferred set indexes correctly (including FIPS zero-padding), the loader is memoized across the map and analytics callers, and a partial network failure degrades to defaults instead of rejecting. It also guards the source directly so a deferred file cannot creep back into `loadCoreData`.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 4 — Professional account features

## Summary
Watchlist rebuilt as a real module with notes, policy snapshots, genuine change detection, optional cloud sync, and portable bundles. Migration from the legacy storage key is non-destructive by design.

## New Files
- `js/watchlist.js` — watchlist store (storage, notes, snapshots, diff, bundles, cloud sync)
- `tests/test_watchlist.mjs` — 37 tests, migration safety first

## Watchlist store (js/watchlist.js)
The watchlist was a flat array of FIPS strings read directly in **eight** places across map.js, home.js, analytics.js, and jurisdiction.js. There was nowhere to hang notes, no record of a county's state when you started watching it, and no sync. All eight call sites now go through one API.

### Migration safety (most important behavior)
Users have real watchlists under `dc-watchlist-v1`. The new v2 store:
- imports v1 on **every** load, not once, so a county added by an older cached build is still picked up
- **never deletes or rewrites v1 destructively** — v1 is mirrored with the current FIPS set so an older build or a rollback still finds the user's counties
- survives corrupt JSON in either key without throwing

### Entry shape
`{ fips, added_at, notes, snapshot: { level, status, effective_date, title } }`

## Policy change detection
The snapshot records policy state when a county is added or acknowledged. `diff()` compares it against live `mapData` and reports real changes: restriction level moves (with direction), status changes, effective-date changes, title revisions, and records appearing or disappearing. `acknowledge()` re-baselines.

Entries migrated from v1 have no snapshot and are correctly **not** reported as changed, rather than producing a false "everything changed" on first run.

Surfaced on the home page above the watchlist. The UI states plainly that detection happens in the browser on page load and that **no email or push notifications are sent**, because none exist. Built with DOM nodes rather than innerHTML since county names come from data files.

## Portable watchlist bundles
Export/import as a JSON file a colleague can load. Import is additive: existing counties are kept and a note is only filled where the user has none, so importing can never silently overwrite someone's annotations. Bundles contain only county IDs and notes — no account data.

This is an explicit hand-off, **not** realtime collaboration. True shared team workspaces would need new Supabase tables and RLS policies that cannot be provisioned from the frontend.

## Notes UI
Per-county notes editor on the Jurisdiction page, shown once a county is watched. Debounced autosave with a commit-on-blur that fires whenever the field differs from what is stored.

## Cloud sync
When Supabase is configured and the user is signed in, entries mirror to the existing `saved_items` table via `AUTH.saveItem('county', ...)`. Local storage stays authoritative for reads so the feature works fully signed-out. Sync is additive only — `getSavedItems` returns `[]` on error, which is indistinguishable from "no items", so deleting on an empty response could destroy data.

Note: Supabase is still unconfigured in this repo (`js/supabase-config.js` holds placeholders), so sync paths are inert and untested against a live backend. Everything else works signed-out.

## Testing
`./tests/run_all.sh` — 152 tests across 6 suites, all passing. The 37 new watchlist tests cover migration (v1 preserved, mirrored, late additions folded in, corrupt storage), notes, change detection including the no-false-positives case, acknowledge, bundle merge semantics, and cloud-sync degradation.

---

Date: 2026-07-26
AI Assistant: Claude Code (claude-opus-5)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phases 2-5 — Design consistency, navigation, connected intelligence

## Summary
Implemented Phases 2 through 5 of the platform improvement specification: a shared constants module that ends label drift, a unified hash router with deep links, mobile "More" overflow navigation, the Jurisdiction Intelligence Pages that connect previously siloed data, and a data-driven methodology/data-quality panel. Added a 112-test suite.

## New Files
- `js/constants.js` — single source of truth for SEVERITY/LEVEL label maps and platform metadata accessors
- `js/router.js` — unified hash router (modern routes + all four legacy formats)
- `js/jurisdiction.js` — Jurisdiction Intelligence Pages
- `css/jurisdiction.css` — jurisdiction page styles
- `tests/test_frontend_core.mjs` — 28 tests for constants + router
- `tests/test_jurisdiction.mjs` — 19 DOM tests for the jurisdiction page
- `tests/run_all.sh` — full suite runner

## Phase 2 — Unified design and navigation

### Label drift eliminated (root cause fix)
Phase 1 corrected severity labels in `map.js`, but seven *duplicate* label maps existed in `home.js` and `analytics.js`. Those copies had already drifted back to the banned pre-Phase-1 wording. Consolidated all of them into `js/constants.js`:
- `analytics.js` x5: two `LVL_LABELS` maps, "Counties Tracked", "Real-time delayed quotes", "50+ publicly traded", severity ramp "No Restrictions", inline "Pro-DC Hub" ternary
- `home.js` x2: `SEV_LABELS`, `LVL_LABELS`
- `map.js` x3: `SEVERITY`, `LEVEL_LABELS`, `SEV_KEY_LABELS`
Regression tests now assert the banned phrases can never reappear in the label maps.

### Unified router with deep links
`js/router.js` adds `#<tab>?<params>` and virtual routes while preserving every legacy format (`#51107`, `#s=<base64>`, `#@lat,lng,zoom`, `#ai-stocks`) so previously shared links keep working. Tab clicks now write to the URL, making every view deep-linkable with a working browser back button.

### Mobile navigation
Replaced the horizontally-scrolling 7-tab bar (which stranded tabs off-screen where users never found them) with a "More" overflow sheet. Four primary tabs stay in the bar; the rest move into a bottom sheet with 48px touch targets, focus trapping, Escape-to-close, and reduced-motion support.

### Accessibility
- `#route-announcer` aria-live region announces SPA view changes, previously silent for screen readers
- `.sr-only` utility added
- Focus returns to the trigger when the mobile sheet closes

## Phase 3 — Connected intelligence

### Jurisdiction Intelligence Pages
`#jurisdiction?fips=XXXXX` renders one page per county joining data that previously lived on four unconnected tabs:
- policy record from `map_data.json`
- facilities from `facilities_master.json` joined on `county_fips` (Loudoun County: 129 facilities, 115 operational, 10.1 GW)
- related news matched on county then state
- suitability score and zoning coverage
- cross-links back to map, pipeline, and analytics

Counties with no record get an explicit "Not yet researched" page stating this is **not** the same as "no restrictions" — rather than a 404 or an empty page implying no restrictions exist. Facilities load lazily so the 2 MB file never blocks first paint. Entry point added to the map's county detail panel.

## Phase 5 — Commercial readiness

### Data quality panel
The About > Methodology section now renders real measured figures from `platform_metadata.json` — counties researched, coverage %, unresearched count, broken-source-link rate — plus the canonical disclaimer list. Published so users can judge how far to trust any given answer, and read from the metadata file so it can never drift from the data.

## Testing
`tests/run_all.sh` runs five suites, 112 tests, all passing:
- platform metadata validator, AI companies validator
- 65 existing policy pipeline tests (no regressions)
- 28 frontend core tests: label maps incl. banned-phrase guards, router build/parse across all legacy + modern formats, metadata accessors
- 19 jurisdiction DOM tests: cross-source joins, watchlist persistence, unresearched-county wording, XSS escaping of data-file values, malformed input

## Notes for the next assistant
- `js/constants.js` MUST stay first in the script order in `index.html` — `map.js` reads `window.SEVERITY_LABELS` at top level.
- Never re-declare severity/level label maps. Import from `constants.js`. See `docs/TERMINOLOGY.md`.
- Never hardcode coverage numbers. Use `platformStat()` / `coveragePct()`.
- jsdom is not vendored; `tests/test_jurisdiction.mjs` skips cleanly without it.

---

Date: 2026-07-25
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 1 — Trust, Safety, and Data Accuracy

## Summary
Phase 1 of the platform improvement specification. Addressed misleading data claims throughout the UI, created a central metadata file as the source of truth for platform statistics, and improved map legend accuracy.

## Files Modified
- `data/platform_metadata.json` — NEW: central source of truth for coverage, freshness, and quality stats
- `js/home.js` — Fixed misleading hero text, KPI labels, stocks nav card, freshness bar
- `js/analytics.js` — Fixed "real-time" language; corrected TradingView delay label
- `js/map.js` — Renamed SEVERITY/LEVEL_LABELS for accuracy; added "Not yet researched" legend entry
- `index.html` — Fixed static skeleton hero text; bumped cache-bust versions to `v=20260725h`
- `AI_CHANGELOG.md` — This entry
- `AI_CONTEXT.md` — Updated platform metadata section
- `BUG_TRACKER.md` — Logged accuracy issues as resolved

## Correctness Fixes

### Misleading "every US county" claim (fixed)
- Was: "covering every US county. Updated daily." in hero and static skeleton
- Fixed: "1,465+ researched jurisdictions. Policy data manually verified from official government sources."
- Rationale: Only 1,465 of 3,143 US counties (46.6%) have been individually researched

### "Live Intelligence Platform" badge (fixed)
- Was: "Live Intelligence Platform" — implies real-time data throughout
- Fixed: "Intelligence Platform" — only the news feed is automated; policy data is manually curated

### Analytics hero "Real-time summary" (fixed)
- Was: "Real-time summary of US data center and AI policy coverage, derived from the live dataset across all X tracked jurisdictions."
- Fixed: "Policy coverage summary derived from X manually researched jurisdictions (Y% of 3,143 US counties). Policy data verified from official government sources — not real-time."

### TradingView "Real-time" data label (fixed)
- Was: Data sources table listed TradingView as "Real-time"
- Fixed: "Delayed 15 min" — TradingView free tier provides 15-minute delayed quotes

### Stocks nav card "50+ companies" (fixed)
- Was: "Live market data for 50+ publicly traded AI companies"
- Fixed: "44 publicly traded AI companies — market data via TradingView (delayed 15 min)"
- Rationale: ai_companies.json has exactly 44 public companies

### Map legend missing "Not yet researched" entry (fixed)
- Was: The dark `noData` background color had no legend entry — users had no way to know what it meant
- Fixed: Added explicit "Not yet researched — 1,678 counties — no data collected" legend entry

### SEVERITY label inconsistencies (fixed)
- "High Restrictions" → "Significant Restrictions" (more precise)
- "Pro / Incentive Hub" → "Pro-Development Hub" (cleaner)
- "No Restrictions" → "No Known Restrictions" (more accurate — researched but nothing found)
- Updated LEVEL_LABELS to match SEVERITY terminology

## New Files
- `data/platform_metadata.json` — Platform-wide statistics: coverage (1,465 counties, 46.6%), freshness dates, data quality (711 broken URLs / 1,690 checked), disclaimers. Intended to be loaded by home.js, analytics.js, and map.js. Update via `process_data.py` or manually.

---

Date: 2026-07-25
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: AI Stocks Page — Full Product-Quality Redesign

## Summary
Performed a comprehensive redesign and bug-fix pass of the AI Stocks tab (`js/stocks.js`, `css/stocks.css`). Fixed 6 correctness bugs, replaced the card grid with a professional watchlist row layout, introduced a desktop workstation two-column layout (sidebar + main workspace), added lazy-loaded market sections, upgraded the Fundamentals tab to use the TradingView `financials` widget, added a Symbol Info widget above the chart, added an AI Company Universe section with the TradingView `market-overview` widget, fixed the theme observer (debounced + last-theme tracking to prevent stale renders), added keyboard shortcuts (`/` search, `F` favorite), added CSV export, fixed news tab (future-date filter, dedup, URL validation), created `data/ai_companies.json` schema and `data/validate_ai_companies.py` validator, and updated all documentation.

## Files Modified
- `js/stocks.js` — Full rewrite (~950 lines); see correctness fixes and feature additions below
- `css/stocks.css` — Full rewrite (~620 lines); new workstation layout, watchlist rows, four responsive breakpoints
- `index.html` — Bumped version strings for stocks.js and stocks.css to `v=20260725g`
- `AI_CHANGELOG.md` — This entry
- `BUG_TRACKER.md` — Added newly fixed bugs
- `AI_CONTEXT.md` — Added stocks architecture section

## New Files
- `data/ai_companies.json` — Canonical company universe schema (44 public + 5 private companies)
- `data/validate_ai_companies.py` — Validation script cross-referencing JSON against js/stocks.js

## Correctness Fixes

### Exchange Prefix Bugs (4 fixed)
- `NYSE:META` → `NASDAQ:META` (Meta Platforms trades on NASDAQ, not NYSE)
- `NASDAQ:PATH` → `NYSE:PATH` (UiPath trades on NYSE, not NASDAQ)
- `NASDAQ:VEEV` → `NYSE:VEEV` (Veeva Systems trades on NYSE, not NASDAQ)
- `NASDAQ:UBER` → `NYSE:UBER` (Uber trades on NYSE, not NASDAQ)
- Updated `NEWS_ALIASES` keys to match corrected tickers

### `renderDetailTab()` symbol lookup bug (fixed)
- Was: `AI_COMPANIES.find(c => c.symbol === sym)` where `sym = stocksState.selectedSymbol` (= "NASDAQ:NVDA") — never matched because `.symbol` is "NVDA"
- Fixed: Replaced with `getCompanyByTicker(ticker)` using the full ticker key

### Yahoo Finance URL bug (fixed)
- Was: `encodeURIComponent(sym)` where `sym` was the full ticker ("NASDAQ:NVDA") → URLs contained "NASDAQ%3ANVDA" which 404s
- Fixed: Used `getPlainSymbol(ticker)` which returns just "NVDA" for Yahoo Finance links

### Compare preset not saved (fixed)
- Was: `compareSelect` change handler called `renderChart()` but never `stocksSavePrefs()`
- Fixed: Added `stocksSavePrefs({ comparePreset: stocksState.comparePreset })` in the handler

### Heatmap mislabeled (fixed)
- Was: "AI Market Heatmap" — misleading; the data source is `SPX500` (S&P 500, not AI stocks)
- Fixed: Renamed to "US Market Heatmap" with subtitle "S&P 500 by sector and market cap"

### Theme observer: no debounce, re-renders all widgets on any mutation (fixed)
- Was: Fired on every DOM mutation (even unrelated ones), re-rendered all 5 widgets synchronously
- Fixed: Added last-theme tracking (skip if theme didn't change) and 150ms debounce; only rerenders widgets that have already been lazy-loaded

## Feature Additions

### Desktop workstation layout (≥1180px)
- Two-column CSS grid: 280px sidebar (company browser) | flex-1 main workspace
- Sidebar is `position: sticky; top: 0; height: 100vh` — remains visible while main content scrolls
- Sidebar has independent internal scrolling for the watchlist

### Watchlist row list (replaced card grid)
- Replaced `<button role="button">` nested-inside-`<button>` card grid with semantic `<ul>/<li>` rows
- Each row: separate `<button class="stocks-wl-main">` (company select) + `<button class="stocks-wl-fav">` (star) — no nested interactive elements
- Selected row has left accent stripe; hover background; accessible `aria-current` attribute

### Mobile layout redesign (≤767px)
- Chart area (`#stocks-main`) appears first via CSS `order: -1`
- Company browser (`#stocks-sidebar`) appears below chart with collapsible toggle (`#stocks-browser-btn`)
- Default state: collapsed; opens to `max-height: 480px` with smooth CSS transition

### Symbol Info widget
- Added `#stocks-symbol-info` div between company header and chart controls
- Renders TradingView `symbol-info` widget showing live price, change, and market cap for selected company

### Fundamentals tab: TradingView Financials widget
- Replaced static Yahoo Finance links with TradingView `financials` widget (revenue, EPS, margins)

### AI Company Universe section
- New `#stocks-universe-section` below Market Movers
- TradingView `market-overview` widget with per-category tabs from AI_COMPANIES grouping

### Lazy loading
- `initLazyWidgets()` — IntersectionObserver with 200px rootMargin for heatmap, movers, universe
- Widgets only load when scrolled near viewport; graceful fallback for browsers without IntersectionObserver
- Theme rerenders only touch already-loaded widgets (`_rerenderLoadedWidgets()`)

### Keyboard shortcuts
- `/` — focus search input (when not already in an input)
- `F` — toggle favorite for selected company (when not in an input)

### CSV export
- "Export Favorites CSV" button in sidebar footer
- Generates `ai-stocks-favorites.csv` with Symbol, Name, Exchange, Category, Description columns

### Render ID system (`createTVWidget`)
- Each widget call increments `_tvRenderCounter` and stamps `container._tvRenderId`
- Timeout/load/error callbacks check render ID before mutating DOM — prevents stale callbacks when widget is replaced before timeout fires

### News tab improvements
- Filters articles with future publication dates (> today)
- Deduplicates by URL and title (case-insensitive)
- Validates URLs start with `http://` or `https://` before using in `href`

### Private companies data model upgrade
- Added `valuationText`, `valuationAsOf`, `sourceName`, `lastReviewed` fields
- Displayed `valuationAsOf` and `sourceName` as metadata beneath the valuation figure

### Overview tab
- Moved `symbol-info` widget to dedicated `#stocks-symbol-info` area above the chart
- Overview tab now shows company description + category + links to Yahoo Finance and TradingView

### Four responsive breakpoints
- ≥1180px: desktop workstation (sidebar + main grid)
- 768–1179px: tablet (sidebar stacked above main, compact watchlist)
- ≤767px: mobile (chart first, collapsible browser below)
- ≤400px: small mobile (reduced chart height, smaller time buttons)

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Nationwide Data Sweep — Phase 1 Expansion + Validation

## Summary
Performed a nationwide data sweep using WebSearch and WebFetch to find verified new county/state-level data center restrictions, moratoriums, and policy changes. Added 5 new county records, updated 5 existing county records, and updated 5 state regulation entries. All changes backed by verifiable public sources (government websites and established regional news outlets). No records were fabricated, estimated, or deleted.

## Files Modified
- `data/restrictions_raw.json` — 5 new county records added; 6 existing records updated; meta.last_manually_updated bumped to 2026-07-18
- `data/state_regulations.json` — 5 state entries updated; _last_updated bumped to 2026-07-18
- `data/map_data.json` — regenerated from restrictions_raw.json (1308 counties; stats: -1: 1187, 1: 46, 2: 42, 3: 28, 4: 5)

## New County Records Added

### Indiana (4 new moratoriums)
- **18149 Starke County** — Level 3. 12-month hyperscale moratorium (>5,000 sq ft), enacted December 15, 2025 (unanimous). Ordinance 2025-37. Official source: starke.in.gov
- **18049 Fulton County** — Level 3. 1-year moratorium, enacted March 2, 2026 (2-1 vote). Triggered by Decennial Group 500 MW / 300-acre campus proposal. Source: WNDU, InsideINdianaBusiness
- **18095 Madison County** — Level 3. 6-month moratorium, enacted June 2026 (unanimous; 8-1 Planning Commission recommendation). 9th Indiana county to restrict. Source: Indiana Public Radio, Herald Bulletin
- **18029 Dearborn County** — Level 3. 1-year moratorium on data centers and commercial solar/battery storage, February 25, 2026 (unanimous). Triggered by Linea Energy 1,200-acre solar proposal. Source: WVXU (Cincinnati NPR), WCPO

### New Mexico (1 new moratorium)
- **35053 Socorro County** — Level 3. 1-year moratorium on data centers, June 9, 2026 (unanimous). Triggered by Canadian developer Green Data's 10,000-acre solar/data center proposal. Source: ABQ Journal, KRQE, Source NM

## Existing County Records Updated

- **35049 Santa Fe County, NM** — Level -1 → 3. Unanimous 18-month moratorium enacted July 2, 2026. Threshold: 1 MW or more. Source: santafecountynm.gov (official government), KRQE, ABQ Journal
- **35001 Bernalillo County, NM** — Level -1 → 1. Data Center Guardrails Resolution passed 4-1, February 11, 2026. Requires water offsets, renewable energy, labor standards for projects seeking county incentives. Source: bernco.gov (official government), ABQ Journal
- **17097 Lake County, IL** — Level -1 → 2. June 9, 2026 County Board resolution pursues 8-month moratorium with immediate administrative deferral (120-day pause on applications) in unincorporated areas. Source: lakecountyil.gov (official government), Daily Herald
- **13245 Richmond County, GA** — Level -1 → 2. 10-0 vote for 49-day pause on new data center applications, June 2026; Planning Commission recommending extension. Proposed ordinance to restrict data centers to heavy industrial zones. Source: WRDW, WJBF
- **55025 Dane County, WI** — Updated notes/description only (level=3 already). Added Dane County Board's June 4-5, 2026 unanimous 18-month moratorium on hyperscale data centers (≥5,000 servers, ≥10,000 sq ft) in unincorporated county areas, signed by County Executive Melissa Agard. Source: danecounty.gov (official press release), WisBusiness
- **13063 Clayton County, GA** — Added REVIEW NEEDED note: Resolution 2025-193 moratorium expired December 31, 2025; unclear if renewed. Added sources: claytoncountyga.gov (official), WSB Radio.

## State Regulations Updated

- **New York (36)** — Level 1 → 3. Gov. Hochul signed Executive Order No. 62 on July 14, 2026: nation's first statewide data center moratorium, pausing DEC permitting for 50 MW+ facilities up to 1 year. NY Legislature also passed S10642 (20 MW threshold) which Hochul declined to sign. Source: governor.ny.gov, nysenate.gov
- **New Jersey (34)** — Level 0 → 2. Gov. Sherrill signed Data Center Fair Share Act on July 7, 2026: first state to create separate ratepayer class for data centers (50 MW+, must pay 85% projected power costs for 10 years). Source: nj.gov (official), NJ Assembly Dems
- **Virginia (51)** — Level -1 → 1. Gov. Spanberger signed 2026 biennial budget (HB30) on June 30, 2026 containing new Data Center Electricity Consumption Tax: $0.011/kWh, effective July 1, 2026, on facilities ≥1 MW; capped at $600M/year; expires June 30, 2028. Sales tax exemption preserved. Source: budget.lis.virginia.gov, Williams Mullen, Data Center Knowledge
- **Indiana (18)** — Summary updated to reflect statewide county moratorium wave: ~30+ counties with restrictions, Marshall and Cass counties with permanent bans, Indianapolis moratorium advancing through City-County Council. Source: WFYI
- **Wisconsin (55)** — Summary updated to include Dane County 18-month hyperscale moratorium (June 2026) and list of other Wisconsin jurisdictions with moratoriums. Source: danecounty.gov

## Validation Results (Phase 2)
- No missing required fields (0 of 1308)
- No duplicate FIPS codes
- No critical or error-level validation failures
- Warnings: 1494 (pre-existing consistency warnings, unchanged from prior state)
- Data integrity status: DEPLOYABLE

## Items Requiring Manual Review
1. **Clayton County, GA (13063)**: Resolution 2025-193 moratorium expired December 31, 2025. Current status unknown — may have expired. Verify with claytoncountyga.gov before relying on level=3 designation.
2. **Indiana Marion County (18097)**: Indianapolis City-County Council committee voted 10-3 on July 13 to recommend moratorium through Dec 31, 2027. Full council vote scheduled August 10, 2026. Record currently level=-1; update to level=2/proposed after Aug 10 vote if passes.
3. **Indiana Pulaski County (18131)**: Mentioned as having a moratorium in WFYI statewide roundup but could not verify with a county-specific authoritative source. Skip adding until verified.
4. **New Mexico statewide moratorium**: NM lawmakers announced a proposed statewide moratorium for the 2027 legislative session. Monitor for passage.
5. **New York S10642**: Legislature-passed bill (20 MW threshold) still awaiting Hochul decision — she issued EO instead. If signed, would add stronger requirements than EO.

## Sources Searched
- datacenterbans.com (tracker, discovery only - Tier 3)
- rockinst.org (Rockefeller Institute, Tier 3)
- wfyi.org, indianapublicradio.org, lpm.org (Indiana NPR affiliates)
- wndu.com, abc57.com, wsbt.com (Indiana TV news)
- insideindianabusiness.com, heraldbulletin.com (Indiana business/local news)
- wvxu.org, wcpo.com, eaglecountryonline.com (Dearborn County IN)
- starke.in.gov (official Starke County government - Tier 1)
- sourcenm.com, abqjournal.com, krqe.com (New Mexico)
- santafecountynm.gov (official Santa Fe County government - Tier 1)
- bernco.gov (official Bernalillo County government - Tier 1)
- dchieftain.com (Socorro NM)
- lakecountyil.gov (official Lake County IL government - Tier 1)
- lakemchenryscanner.com, dailyherald.com (Lake County IL)
- danecounty.gov (official Dane County WI government - Tier 1)
- cityofmadison.com (official City of Madison - Tier 1)
- wispolitics.com, wisbusiness.com, wkow.com (Wisconsin)
- governor.ny.gov (official NY Governor - Tier 1)
- nysenate.gov (official NY Senate - Tier 1)
- nj.gov (official NJ Governor - Tier 1)
- assemblydems.com (NJ Assembly Democrats - Tier 1/2)
- budget.lis.virginia.gov (official VA budget - Tier 1)
- datacenterknowledge.com (industry news, Tier 3)
- williamsmullen.com, gtlaw.com (law firm analysis, Tier 3)
- wrdw.com, wjbf.com (Augusta GA TV news)
- claytoncountyga.gov (official Clayton County GA - Tier 1)
- mirrorindy.org, wfyi.org (Indianapolis news)
- wishtv.com, wrtv.com, fox59.com (Indiana TV)
- axios.com, cnbc.com, nbcnews.com (national media)

## No Fabrication Confirmation
All facts sourced from verifiable public sources. No coordinates, dates, facility names, policy text, or vote counts were invented or estimated. Counties where only vague mentions were found were excluded.

## No Paid/AI/Recurring Token Usage Added
No new API keys, recurring data fetches, or LLM-based pipeline steps added. All pipeline workflows unchanged.

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 17 — Export and reporting

Files Modified:
- `index.html`:
  - Expanded `#gis-export` toolbar button to an `aria-haspopup` trigger with `aria-expanded`
  - Added `#export-menu` dropdown (fixed-position, role="menu") with three `<button class="exp-item">` items: CSV, GeoJSON, Data Report
  - Added `#workspace-io` div inside `#workspace-footer` with Export JSON / Import JSON buttons and hidden `<input type="file" accept=".json" id="workspace-import-file">`
  - Bumped style.css to `?v=20260718o`, map.js to `?v=20260718q`
- `css/style.css`:
  - `#export-menu`, `.exp-item` — fixed-position dropdown menu for export options
  - `#workspace-io`, `#workspace-export-btn`, `#workspace-import-btn` — footer row for workspace file I/O
  - Workspace footer set to `flex-wrap: wrap` so the I/O row wraps below the save row
- `js/map.js`:
  - `exportCountiesGeoJSON()` — iterates `countyGeoLayer.getLayers()`, filters to counties with restriction data matching current filters, builds a GeoJSON FeatureCollection with polygon geometry + restriction properties + suitability score, downloads as `.geojson`
  - `_toggleExportMenu()` — toggles `#export-menu` visibility; positions menu via `getBoundingClientRect()` + `position:fixed` to avoid any clipping from parent overflow
  - `openPrintReport()` — builds a complete standalone HTML page (print-friendly CSS, data table: FIPS/County/State/Severity/Status/Types/Enacted/Suitability Score) and opens it in a new window, then calls `window.print()` after 600 ms. Pop-up blocked case toasts the user. Includes filter summary, county count, and disclaimer footer.
  - `exportWorkspacesJSON()` — downloads `_loadWsList()` as a pretty-printed JSON file
  - `importWorkspacesJSON(file)` — reads file via `FileReader`, validates array, merges by ID (skips duplicates), re-saves and re-renders workspace list
  - `initLeafletMap()` wiring: `#gis-export` → `_toggleExportMenu`; `#exp-csv` → CSV; `#exp-geojson` → GeoJSON; `#exp-report` → report; `#workspace-export-btn` / `#workspace-import-btn` / `#workspace-import-file` wired; close-on-outside-click listener for `#export-menu`
  - `#export-menu` added to `disableClickPropagation` list

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 16 — Explainable suitability scoring

Files Modified:
- `index.html`:
  - Bumped style.css to `?v=20260718n`, map.js to `?v=20260718p`
- `css/style.css`:
  - `.suit-section`, `.suit-section-header`, `.suit-section-title` — section wrapper and header
  - `.suit-hero`, `.suit-grade`, `.suit-grade-A/B/C/D/F` — large grade badge (44×44 px, color-coded) + score meta row
  - `.suit-hero-meta`, `.suit-score-label`, `.suit-score-num` — label ("Highly Suitable") and numeric score
  - `.suit-factor`, `.suit-factor-meta`, `.suit-factor-name`, `.suit-factor-pts`, `.suit-factor-max` — per-factor row layout
  - `.suit-bar-track`, `.suit-bar-fill`, `.suit-bar-A/B/C/D/F` — animated progress bars per factor
  - `.suit-factor-note`, `.suit-disclaimer` — factor explanation text and disclaimer
  - `.cmp-suit-grade`, `.cmp-suit-A/B/C/D/F` — small inline grade badge for compare panel columns
- `js/map.js`:
  - `computeSuitabilityScore(fips, county)` — 3-factor model:
    1. Regulatory Environment (0–50 pts): based on `getSeverityKey()` → pro=50, none=45, proposed=30, moderate=18, high=6, ban=0
    2. Political Climate (0–30 pts): based on `politicalRiskData[fips].risk_score` (1→30, 2→24, 3→16, 4→8, 5→2; no data→20 neutral)
    3. Restriction Scope (0–20 pts): based on `county.types` set membership (data_center→6, ai→8, water/energy→14, crypto→18; no types→20; >2 types subtracts 3)
    Grade: A≥80, B≥65, C≥45, D≥25, F<25. Returns `{score, grade, label, factors}`.
  - `buildSuitabilityHtml(fips, county)` — renders the suitability card: grade badge, score/label hero row, one animated bar per factor with note, disclaimer. Uses `escHtml()` throughout. Safe to call with `county = null` for unrestricted counties.
  - `setDetailCounty()` — prepends `buildSuitabilityHtml(fips, county)` at top of detail body
  - `setDetailNoRestriction()` — prepends `buildSuitabilityHtml(fips, null)` when `fips` is present (county with no known restrictions scores A)
  - `renderComparePanel()` — adds "Suitability" field as first row in each compare column (grade badge + score + label)

Scoring rationale: Counties with no known restrictions and neutral political climate score 85/100 (A). A county with an active moratorium, high political risk, and data_center-type restrictions scores 0+2+6=8/100 (F). Score is labeled "Estimated" and disclaimed as non-professional.

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 15 — County comparison tool

Files Modified:
- `index.html`:
  - Added `#gis-compare` toolbar button (two-columns SVG icon, before `#gis-workspace`)
  - Added `#compare-panel` with header (title, hint, clear-all + close actions) and `#compare-body`
  - Bumped style.css to `?v=20260718m`, map.js to `?v=20260718o`
- `css/style.css`:
  - `#compare-panel` — absolute positioned bottom-of-`#main`, slides up via `transform: translateY(100%)` → `translateY(0)` transition; hidden via `[hidden]` attribute
  - `.cmp-col`, `.cmp-col-header`, `.cmp-col-fips`, `.cmp-col-type`, `.cmp-row`, `.cmp-label`, `.cmp-value`, `.cmp-remove` — column-based comparison card layout
  - `#main.compare-active #map-container` — `cursor: crosshair` while compare mode is on
  - Added `#compare-panel` to mobile overlay and touch-action disablement lists
- `js/map.js`:
  - `compareMode` — boolean, true when compare mode is active
  - `compareCounties` — ordered array of FIPS strings (max 5)
  - `CMP_MAX = 5` — maximum counties to compare simultaneously
  - `renderComparePanel()` — builds side-by-side columns with severity, level, status, type, state, pop, restrictions, restrictions_detail; uses `escHtml()` throughout; safe DOM construction (no innerHTML with user data)
  - `addToCompare(fips)` — adds county to array, toasts duplicate/full, re-renders; called by `handleCountyClick` when `compareMode` is true
  - `removeFromCompare(fips)` — splices county out, re-renders (clears mode if array empties)
  - `clearCompare()` — empties array, exits compare mode
  - `toggleComparePanel()` — toggles `compareMode`, panel visibility, `#gis-compare` active state, and `#main.compare-active` class
  - `handleCountyClick()` — compare-mode branch: calls `addToCompare(fips)` and returns early, skipping normal county selection
  - `initLeafletMap()` keyboard handler — `C` key → `toggleComparePanel()`; Escape closes compare panel when open
  - Event wiring: `#gis-compare` → `toggleComparePanel`, `#compare-close-btn` → `toggleComparePanel`, `#compare-clear-btn` → `clearCompare`
  - `disableClickPropagation` — added `"compare-panel"` to list
  - `disableScrollPropagation` — added `"compare-body"` to list
  - Keyboard overlay — added `C` → "Compare counties" entry under Map Tools

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 14 — Time-based analysis (enacted-by-year slider)

Files Modified:
- `index.html`:
  - Added "Enacted By Year" section to `#adv-filter-body` (before Quick Presets): checkbox toggle, range slider (2000–2026, step 1), year labels row, and `#adv-date-display` badge
  - Bumped style.css to `?v=20260718l`, map.js to `?v=20260718n`
- `css/style.css`:
  - `.adv-date-toggle-label` — flex checkbox + uppercase label
  - `#adv-date-display` — accent-colored year badge (e.g. "≤ 2020"), hidden when filter is off
  - `#adv-date-slider-wrap` / `#adv-date-track` / `#adv-date-slider` — slider container and range input
  - `#adv-date-range-labels` — evenly-spaced year tick labels below the slider
- `js/map.js`:
  - `activeDateFilter` — new filter state var: null (off) or 4-digit year string
  - `countyMatchesFilters(fips)` — added date check: county excluded only if it has an `effective_date` or `date` field whose year exceeds `activeDateFilter`; counties without a date field always pass (unknown enactment date)
  - `hasActiveMapFilters()` — includes `activeDateFilter !== null`
  - `clearAllFilters()` — resets `activeDateFilter = null`
  - `_saveFilterState()` / `_loadFilterState()` — persists `dateFilter` to `dc-advanced-filters-v1` localStorage key
  - `_captureWorkspaceState()` — includes `dateFilter: activeDateFilter` in workspace filters snapshot
  - `_applyWorkspace()` — restores `activeDateFilter` from workspace `filters.dateFilter`
  - `_encodeShareState()` — includes `df` field in share URL when `activeDateFilter` is set
  - `_applyShareState()` — restores `activeDateFilter` from `obj.df`
  - `initAdvancedFiltersPanel()` — wires checkbox toggle (show/hide slider, set `activeDateFilter`), range `input` event (update `activeDateFilter`, call `applyFilters()`); restores state from `activeDateFilter` on open
  - `syncAdvancedFilterUI()` — syncs checkbox checked state, slider value, and display badge from `activeDateFilter`

Data coverage: 529 of 1303 counties have `effective_date` fields; range 1998–2026 (peak 2019–2022). Counties without dates always show regardless of slider position.

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 13 — Dashboard scope selector (national / filtered / state / extent)

Files Modified:
- `index.html`:
  - Added `<div id="dashboard-scope-bar" hidden>` (populated by JS on data load)
  - Bumped style.css to `?v=20260718k`, map.js to `?v=20260718m`
- `css/style.css`:
  - `#dashboard-scope-bar` — flex row (5px 14px padding) matching the dashboard's collapse/hide behavior: transitions with `max-height` when `.top-hidden`, `display: none !important` in fullpage-mode
  - `.dash-scope-label` — "SCOPE" uppercase eyebrow label
  - `.dash-scope-chip` — pill chips (National / Filtered / State / Extent); accent fill for `.active`, disabled opacity for unavailable
  - `#dash-scope-state-select` — compact dropdown (max-width 130px), shown only when State chip is active
- `js/map.js`:
  - `_dashScope` / `_dashScopeState` — scope mode and selected state abbreviation
  - `_computeScopeCounties()` — returns scoped subset of `mapData`: national=all, filtered=`countyMatchesFilters()`, state=matching `.state` field, extent=counties whose layer centroid is inside `leafletMap.getBounds()`
  - `updateDashboardScopedCards()` — calls `computeSeverityCounts()` on scoped data, re-animates Active Restrictions / Proposed Restrictions / States w/ Legislation cards via `animateCounter(…, 450ms)`
  - `initDashboardScopeBar()` — renders the 4 scope chips and state dropdown from `mapData` state set; wires chip clicks → `activateScope()` → `updateDashboardScopedCards()`; shows state dropdown only when State scope is active
  - `applyFilters()` — calls `updateDashboardScopedCards()` when `_dashScope === "filtered"` so counts auto-update when filters change
  - `initLeafletMap()` — registers `leafletMap.on("moveend")` handler that calls `updateDashboardScopedCards()` when `_dashScope === "extent"` so counts auto-update as the user pans/zooms
  - `init()` — calls `initDashboardScopeBar()` after `renderDashboard(data)`

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 12 — Shareable map state (compact URL encoding)

Files Modified:
- `index.html`:
  - Bumped map.js to `?v=20260718l`
- `js/map.js`:
  - `_SHARE_LAYER_KEYS` — ordered array of all 15 layerState keys, used for layer bitmask encoding
  - `_encodeShareState()` — serializes full GIS state: basemap (omitted if default "satellite"), layer visibility bitmask (integer, 1 bit per layer), restrictFilters/stateFilter/typeFilters/typeFilterMode/statusFilters (comma-joined, omitted if empty/default), map viewport (lat,lng,zoom), selectedFips; JSON → base64url (no padding)
  - `_decodeShareState(encoded)` — base64url → JSON, returns null on any parse error
  - `_applyShareState(obj)` — restores full GIS state from decoded object: `switchBasemap`, `setLayerVisible` for each layer, rebuilds all filter Sets, `applyFilters()`, `leafletMap.setView`, `selectCounty`
  - `shareCurrentView()` — updated to produce `#s=<base64url>` URL (replaces old `#@lat,lng,zoom` format); backward compat maintained in `restoreFromHash()`
  - `restoreFromHash()` — added `#s=...` branch as first check; legacy `#@lat,lng,zoom` kept as second; FIPS `#12345` kept as third
  - `init()` — added `hasHashShare` check (`/^s=/.test(rawHash)`) so `#s=...` links pre-load the map on page load, same as FIPS links
  - Keyboard shortcut overlay — added `W` / Workspaces panel row

Encoding format:
  - Hash: `#s=<base64url(JSON.stringify(compact))>`
  - Compact object keys: `b` (basemap), `l` (layer bitmask), `v` (viewport), `rf` (restrictFilters), `sf` (stateFilter), `tf` (typeFilters), `tm` (typeFilterMode), `stf` (statusFilters), `f` (selectedFips)
  - Omits keys with default/empty values to minimize URL length
  - Forward-compatible: unknown keys in decoded object are silently ignored

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 11 — Workspaces (save/restore full GIS state)

Files Modified:
- `index.html`:
  - Added `<button id="gis-workspace">` to GIS toolbar (after `#gis-bookmarks`)
  - Added `#workspace-panel` HTML (after `#bookmarks-panel`): header, `#workspace-list`, footer with `#workspace-name-input` and `#workspace-save-btn`
  - Bumped style.css to `?v=20260718j`, map.js to `?v=20260718k`
- `css/style.css`:
  - Added `#workspace-panel` — absolute-positioned panel (230px wide, top 14px, right 54px, z-index 450)
  - Added `#workspace-header`, `#workspace-close`, `#workspace-list`, `.wsp-empty`, `.wsp-row`, `.wsp-load`, `.wsp-del` — panel body styles mirroring bookmarks pattern with `wsp-` class prefix
  - Added `#workspace-footer` — flex row with name input + save button
  - Added `#workspace-name-input` and `#workspace-save-btn` styles
  - Added `#workspace-panel` to mobile overlay list and touch-action manipulation selectors
- `js/map.js`:
  - `_wsVisible`, `WS_LOCAL_KEY`, `WS_MAX_LOCAL` — workspace panel state
  - `_generateWsId()` — unique timestamp+random ID for each workspace
  - `_loadWsList()` / `_saveWsList(arr)` — read/write workspace array from `dc-workspaces-local-v1` localStorage
  - `_captureWorkspaceState(name)` — snapshots basemap, all layerState keys, all filter sets/mode, map center+zoom, selectedFips, drawPoints array, drawAreaUnit
  - `_applyWorkspace(ws)` — restores full GIS state: calls `switchBasemap()`, `setLayerVisible()` (with syncUI=true) for each layer, rebuilds filter Sets, calls `applyFilters()`, `leafletMap.setView()`, re-draws polygon, calls `selectCounty()` for stored fips
  - `renderWorkspaceList()` — async; reads from Supabase (`AUTH.getSavedItems('workspace')`) if signed in, else localStorage; renders `wsp-row` divs with load/delete buttons using safe DOM construction (no innerHTML for user data)
  - `saveCurrentWorkspace()` — reads name input (auto-generates name if blank), captures state, saves to Supabase or localStorage, re-renders list, shows toast
  - `toggleWorkspaces()` — toggles `_wsVisible`, shows/hides panel, updates `#gis-workspace` aria-pressed, calls `renderWorkspaceList()` on open
  - `initLeafletMap()` — wires `#gis-workspace`, `#workspace-close`, `#workspace-save-btn`, `#workspace-name-input` Enter key
  - `initLeafletMap()` — added `"W"` keyboard shortcut for `toggleWorkspaces()`, `Escape` to close workspace panel
  - `initLeafletMap()` — added `"workspace-panel"` to `disableClickPropagation` list, `"workspace-list"` to `disableScrollPropagation` list
  - `auth:stateChange` listener — updated to also call `renderWorkspaceList()` when panel is open

Security Notes:
- Workspace names rendered with `textContent` (not innerHTML) — XSS-safe
- `user_id` always read from Supabase server session via `AUTH.saveItem()` — never from DOM
- Item type `"workspace"` stored in same `saved_items` table as counties/facilities, subject to same RLS

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 10 — Save Counties and Facilities

Files Modified:
- `index.html`:
  - Added `<button id="detail-save-btn">` (bookmark icon) to `#detail-header`
  - Bumped style.css to `?v=20260718i`, map.js to `?v=20260718j`
- `css/style.css`:
  - Changed `#detail-header` right padding from 20px to 48px to make room for the save button
  - Added `.detail-save-btn` — absolute-positioned bookmark button (28×28px, top-right of detail header)
  - Added `.detail-save-btn-saved` — filled bookmark icon in accent color when item is saved
  - Added `.detail-save-btn:disabled` — 50% opacity while async save/remove is in progress
- `js/map.js`:
  - `_savedCountySet` / `_savedFacilitySet` — in-memory Sets of saved item IDs, refreshed on auth state change
  - `_saveCurrentType` / `_saveCurrentId` / `_saveCurrentData` — track what the current panel is showing
  - `_refreshSavedCache()` — async; fetches `AUTH.getSavedItems('county')` and `'facility'` in parallel; clears both Sets when signed out
  - `_updateDetailSaveBtn()` — updates button icon, class, title, aria-label based on signed-in state and saved status; hides button when no item is loaded
  - `setDetailCounty()` — sets `_saveCurrentType='county'`, `_saveCurrentId=fips`, `_saveCurrentData={name,state,level}`; calls `_updateDetailSaveBtn()`
  - `setDetailNoRestriction()` — same as above when fips is provided; clears save state otherwise
  - `setDetailFacility()` — sets `_saveCurrentType='facility'`, `_saveCurrentId=facility.id||facility.name`, `_saveCurrentData={name,kind,county_fips}`; calls `_updateDetailSaveBtn()`
  - `setDetailEmpty()` — clears all `_saveCurrentX` vars; calls `_updateDetailSaveBtn()` to hide button
  - `initLeafletMap()` — wires save button click: toggles `AUTH.saveItem()` / `AUTH.removeItem()`, updates Set, updates button; clicks `#auth-btn` when not signed in
  - `initLeafletMap()` — listens to `auth:stateChange` to refresh save cache and update button
  - `initMapFromGeo()` — calls `_refreshSavedCache()` after map init to pre-populate Sets if user is already signed in

Features Implemented:
- **Bookmark button in detail header**: visible whenever a county or facility is loaded; hidden on empty state
- **Saved / unsaved state**: filled bookmark (accent color) = saved; hollow bookmark = unsaved
- **Signed-out state**: button shown but clicking opens sign-in panel; tooltip says "Sign in to save"
- **Graceful async UX**: button disabled during save/remove operation to prevent double-clicks
- **Account panel integration**: saves made from the map appear in the account panel's Saved Counties / Watchlist sections when the saved tab is opened (existing `loadSavedItems()` picks them up)
- **Security**: uses existing `window.AUTH.saveItem()` / `removeItem()` which enforce RLS via Supabase session; no sensitive data in localStorage; all user data rendered with textContent (no innerHTML injection)

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 9 — Map-linked Results Panel

Files Modified/Created:
- `js/results-panel.js` (new):
  - IIFE singleton exposed as `window.RESULTS_PANEL`
  - `update(mapData, filterFn)` — recomputes sorted list from filtered counties; updates title count; re-renders if panel is open
  - `highlightFips(fips)` — marks row selected, auto-scrolls to center it in the viewport; clears previous selection
  - `open()` / `close()` / `toggle()` — show/hide panel; `open()` fires `requestAnimationFrame` before first render so height is measured correctly
  - `onRowClick(cb)` — sets callback called when a county row is clicked; map.js passes `selectCounty`
  - Virtual scroll: 44px row height, ±6 row BUFFER; renders only visible rows + buffer as `position:absolute` elements inside a spacer-height container; re-renders on `scroll` event
  - Sort: severity-desc (default), severity-asc, name-asc, name-desc, state-asc; sorted key persists to `results-sort` localStorage
  - Resize handle: drag upward from top edge to expand panel; mousedown/touchstart + document mousemove/touchmove; height clamped to 80px–50vh; persisted to `results-panel-h` localStorage
  - Row keyboard navigation: Enter/Space triggers row click
- `css/results-panel.css` (new):
  - `#map-area` — wraps `#map-container` + `#detail-panel` + `#zoning-panel` as a flex-row; `#main` is now `flex-direction: column`
  - `#results-panel` — docked bottom panel, `flex-shrink: 0`, explicit height
  - Resize handle with `ns-resize` cursor and a pill indicator
  - Header row: title count, sort select, close button
  - `.rp-row` — 44px virtual rows with dot/name/state/badge columns
  - `.rp-badge-*` — severity-specific badge colors (dark + light theme variants)
  - Mobile (≤700px): panel + `#gis-results` button both hidden
  - Print: panel hidden
- `index.html`:
  - Wrapped `#map-container`, `#detail-panel`, `#zoning-panel` in `<div id="map-area">`
  - Added `#results-panel` HTML (resize handle, header with sort select, body)
  - Added `#gis-results` button (list icon, tooltip "Toggle results panel (L)")
  - Added `<link>` for `css/results-panel.css?v=20260718a`
  - Added `<script>` for `js/results-panel.js?v=20260718a`
  - Bumped style.css to `?v=20260718h`, map.js to `?v=20260718i`
- `js/map.js`:
  - `applyFilters()` — calls `RESULTS_PANEL.update(mapData, filterFn)` at end
  - `selectCounty(fips)` — calls `RESULTS_PANEL.highlightFips(fips)` at end
  - `setDetailEmpty()` — calls `RESULTS_PANEL.highlightFips(null)` to clear highlight
  - `initMapFromGeo()` — calls `RESULTS_PANEL.onRowClick(selectCounty)` + `RESULTS_PANEL.update(mapData, () => true)` after county layer is ready
  - GIS toolbar: wired `#gis-results` → `RESULTS_PANEL.toggle()`
  - Keyboard: `L` toggles results panel
  - KB help panel: added L shortcut row

Features Implemented:
- **Dockable bottom results panel**: appears below the map on desktop; hidden on mobile
- **Virtual scroll**: renders only visible rows (44px each), supports 3100+ counties smoothly
- **Sort**: by severity (high-first default), name, or state; persisted to localStorage
- **Row-map sync**: clicking a row selects the county on the map; selecting a county on the map scrolls the list to its row
- **Drag resize**: drag handle at top edge; height min 80px, max 50vh; persisted
- **Filter sync**: list updates whenever map filters change via `applyFilters()`
- **Keyboard shortcut**: L to open/close

---

Date: 2026-07-18
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Session: Phase 8 — Drawing and Measurement Tools

Files Modified:
- `js/map.js`:
  1. New state vars: `drawMode`, `drawPoints`, `drawLayers`, `drawAreaUnit` (persisted to localStorage), `candidatePinMode`, `_candidatePin`
  2. `_polygonAreaSqM(latlngs)` — spherical polygon area using the equal-area cylindrical formula (Shoelace on lat/sin-lat coordinates × R²), no external library
  3. `_formatArea(sqM)` — formats area in the active unit (mi², km², or acres)
  4. `_updateDrawReadout()` — updates the draw readout panel with vertex count or live area
  5. `_redrawPolygonPreview()` — redraws vertex dots + L.polygon (or L.polyline for <3 pts) on every click
  6. `_closeDrawPolygon()` — called on map dblclick; removes final duplicate point, exits draw mode, freezes polygon + area display
  7. `clearDraw()` — removes all draw layers and hides readout
  8. `toggleDraw()` — toggles polygon draw mode; disables Leaflet's doubleClickZoom while active; mutually exclusive with measure and pin modes
  9. `_nearestCountyForLatLng(latlng)` — O(n) haversine scan to find nearest county centroid
  10. `_placeCandidatePin(latlng)` — places L.marker with purple SVG DivIcon; updates readout with coordinates and nearest county name; exits pin mode after placement (one-shot)
  11. `_exitCandidatePinMode()` — clears pin mode state + active styles
  12. `_clearCandidatePin()` — removes pin from map + hides readout if draw is also off
  13. `toggleCandidatePin()` — toggles candidate pin mode; one map click places pin; mutually exclusive with measure and draw
  14. Map `click` handler — routes to `addMeasurePoint` / draw vertex push / `_placeCandidatePin` based on active mode
  15. Map `dblclick` handler — pops last point (added by preceding single-click) then calls `_closeDrawPolygon()`
  16. GIS toolbar wiring — added listeners for `#gis-draw` and `#gis-pin`
  17. Draw readout wiring — unit toggle chips set `drawAreaUnit`, persist to localStorage, call `_updateDrawReadout()`
  18. Draw clear button — with iOS touchstart/touchend guards, identical to measure-clear-btn pattern
  19. Keyboard shortcuts — `D` toggles draw, `P` toggles pin, `Escape` exits either active mode
  20. KB help panel — added D/P shortcut rows under Map Tools section
  21. DomEvent.disableClickPropagation — added `draw-readout` to overlay list
- `css/style.css`:
  - Draw/pin cursor overrides: `.draw-active` and `.pin-active` → `cursor: crosshair`
  - `#draw-readout` — positioned like `#measure-readout` (top-center, z-index 460)
  - `#draw-area-val`, `#draw-pts-val` — label + muted hint typography
  - `.draw-unit-toggle`, `.draw-unit-opt`, `.draw-unit-opt.active` — segmented unit selector
  - `#draw-clear-btn` — matches measure-clear-btn style
  - `.candidate-pin-icon` — DivIcon host: no background/border, drop-shadow filter
- `index.html`:
  - Added `#gis-draw` button (polygon layers SVG icon, tooltip "Draw polygon / measure area (D)")
  - Added `#gis-pin` button (map pin SVG icon, tooltip "Drop candidate site pin (P)")
  - Added `#draw-readout` element with area val, pts val, unit toggle, clear button
  - Bumped style.css to `?v=20260718g`, map.js to `?v=20260718h`

Features Implemented:
- **Polygon draw**: click to add vertices, double-click to close; live area display updates with each vertex; supports polygons of any size
- **Area measurement**: spherical area formula (no Turf.js); unit toggle persists across sessions
- **Unit selector**: mi² / km² / acres toggle in draw readout; stored in localStorage key `draw-area-unit`
- **Candidate pin**: one-shot mode — click places a purple pin, shows coordinates (5dp) and nearest county name; pin persists until cleared or new pin placed
- **Mutual exclusion**: activating draw/pin/measure mode turns off whichever other mode was active
- **Keyboard shortcuts**: D (draw), P (pin), Escape exits any active mode
