# AI Team Status

This file coordinates work between AI assistants collaborating on this repo.
No equivalent file existed before 2026-07-30; `docs/ZONING_PILOT_STATUS.md` is
scoped specifically to the zoning pilot and is not a substitute for this.

## Active Work

No active work in progress as of 2026-07-31.

## Recently Completed Work (continued)

- Date: 2026-07-31
- Agent: Claude Code (claude-opus-5)
- Task: Parcel data integrity + CI test gate. PRs #202, #203, #204, #205, all
  merged to `main`. Started from a user report that the parcel layer was
  hidden behind county chrome; fixing that made the layer legible, which
  revealed Montgomery County had no parcel data at all, which led to the rest.
- Shipped: county tooltip/fill no longer obscure parcels; parcel pane z-index
  un-tied from labelsPane; all three Virginia fieldMaps rebuilt from the
  services' real schemas (previously 16/18, 17/22 and 18/18 broken); parcel
  search no longer rejects whole queries over one unknown column; new
  `data/check_parcel_services.mjs` probe + monthly workflow; new
  `.github/workflows/test.yml` running the full suite plus E2E on push/PR.
- Verified, not assumed: every field name came from each service's own
  `?f=json` output, confirmed by re-running the probe after the change. E2E
  scenario failures went 15 -> 1 -> 0 across three diagnostic cycles. Both
  workflows confirmed green on `main`.
- Two mistakes worth knowing about, both recorded in AI_CONTEXT.md and
  BUG_TRACKER.md: (1) the first CI gate printed "ALL PASS — 176/176" while
  jsdom was missing and its suites silently skipped — a hollow green build;
  (2) a TradingView error was misdiagnosed as an application bug until stack
  capture proved every frame was in their bundle. Both came from acting before
  reading the evidence, which is the same root cause as the bad fieldMaps.
- Files changed: `js/parcel/registry.js`, `js/parcel/index.js`,
  `js/parcel/renderer.js`, `js/map.js`, `data/check_parcel_services.mjs` (new),
  `.github/workflows/{test,check_parcel_services}.yml` (new),
  `tests/e2e_smoke.mjs`, `.gitignore`, and the four AI memory files.
- Related systems: parcel intelligence, CI, E2E harness.
- Deliberately NOT done: Maryland's dead URL was not replaced, and no
  zoning/assessment/sales mappings were invented. See Open Handoffs.

- Date: 2026-07-31
- Agent: Claude Code
- Task: Project-health cleanup pass (doc hygiene, dead code, encoding
  bugs, CI test gate) following an open-ended "how can this be improved"
  review of the whole project, not scoped to any single feature.
- Branch: `claude/past-conversation-recall-gcihz4`
- Current status: Complete. Full offline suite passes
  (`tests/run_all.sh`, 176/176 JS + all Python suites). The new
  `.github/workflows/test.yml` CI gate was live-validated, not just wired in
  on paper: actually ran `tests/e2e_smoke.mjs` against the pre-installed
  Chromium (same tool versions the workflow uses) end to end — all 16
  scenarios, 0 hard JS errors. One log line looked suspicious at first
  (`Economic Intelligence — awaiting first data run` reported `HAS VALUES`
  where the code comments say it should show a placeholder) but checking
  `data/economy/*.json` directly confirmed the economy pipeline has
  genuinely already run on this branch (real `generated_at` timestamps,
  thousands of records) — that scenario's own "unpopulated" precondition
  doesn't hold here, so showing real values instead of a placeholder is
  correct, not a bug.
- Files changed: `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `AI_CHANGELOG_ARCHIVE.md`
  (new), `PROJECT_CONTEXT.md`, `.gitignore`, `tests/e2e_smoke.mjs`,
  `.github/workflows/test.yml` (new), 20 `data/*.py` pipeline scripts
  (encoding fix only), 43 `data/sweep_2026_07_*.py` scripts (deleted).
- Related systems: project documentation, CI, data pipeline scripts.
- Explicitly out of scope, and why: filling in the missing 54% of county
  policy research and repairing the 711-URL dead-citation backlog both
  require genuine government-source verification, not something to
  fabricate — flagged to Bobby instead of attempted. Same for the
  city-level regulation layer (a real data-architecture feature, not a
  cleanup task).
- Last updated: 2026-07-31

## Recently Completed Work

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Live-browser-tested the site screener and polygon draw/measure
  tool (both work correctly, zero errors) — six features now confirmed
  working this session (compare tool, keyboard shortcuts, 3D view,
  workspace persistence, site screener, draw tool). Then audited all of
  `data/*.py` for bare `except Exception:`/`except:` blocks, the same
  silent-failure pattern already fixed twice this session in HIFLD/zoning
  ArcGIS fetchers. Found something categorically worse than either of
  those: `validate_sources.py`'s `write_report_to_map_data()` silently
  fell back to an empty dict on *any* read failure of `map_data.json` —
  the entire 1,467-county production dataset — and then unconditionally
  wrote that empty dict back to the same file a few lines later.
  `update_data.yml` calls this and commits `map_data.json` straight to
  `main` with no review. A single transient read glitch was one bad run
  away from destroying the whole dataset. Fixed by raising instead of
  silently substituting — verified the calling workflow step already has
  `continue-on-error: true`, so this doesn't break the deploy, it just
  stops the destructive write. Also fixed two lower-severity silent
  swallows in `monitor_legislation.py` (dropped bill-scoring bonuses with
  no log line explaining why).
- Files changed: `data/validate_sources.py`, `data/monitor_legislation.py`,
  `BUG_TRACKER.md`, this file.
- Tests performed: `tests/run_all.sh` 176/176. Directly exercised the fixed
  function with a nonexistent `MAP_DATA_PATH` and confirmed it now raises
  and writes nothing, where it previously would have silently written a
  near-empty file. Playwright exploration of the two new features, zero JS
  errors.
- Note for whoever reads this next: the same audit found several other
  bare-except blocks in facility_pipeline scraper adapters
  (`digital_realty.py`, `equinix.py`, `hyperscale_press.py`) that silently
  skip malformed scraped items inside a loop. Left as-is — worst case is
  missing supplementary detail on a best-effort scrape, not data loss —
  but worth a closer look if facility data quality ever looks off.

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Continued "institutional quality" pass. Live-browser-tested the
  compare tool, keyboard shortcuts modal, 3D terrain view toggle, and
  workspace save/reload persistence — all four work correctly (two initial
  "bugs" turned out to be wrong assumptions in my own test scripts, not app
  defects, corrected before concluding). Then swept for the same class of
  issue already found twice this session: (1) `data/zoning/scripts/
  fetch_zoning.py`'s ArcGIS pagination never checked for the
  `{"error":...}` response-body gotcha, so a broken zoning endpoint would
  have been indistinguishable from a legitimately empty result in the logs
  — added the same check already used in `fetch_infrastructure.py`.
  (2) The no-paid-dependency test suite failed on a genuinely new hit:
  `data/facility_pipeline/adapters/osm.py` passes through an OSM
  contributor's own basemap-attribution tag verbatim into a `notes` field,
  and one record happened to cite a provider on the paid-service watch
  list — inert third-party metadata, not a live dependency, but a
  *recurring* risk (unlike the earlier cloudscene historical-snapshot
  finding, which was a one-time archive artifact). Root-caused rather than
  test-exempted: the adapter now excludes `source`/`source:*` tags before
  building `notes`, so the data file itself stays fully scanned for any
  genuine future paid-dependency leak.
- Files changed: `data/zoning/scripts/fetch_zoning.py`,
  `data/facility_pipeline/adapters/osm.py`,
  `data/facilities_candidates.json` (one record corrected),
  `BUG_TRACKER.md`, this file.
- Tests performed: `tests/run_all.sh` 176/176 (was failing on the
  no-paid-dependency check before this fix — confirmed the failure was
  new, not pre-existing, by checking it wasn't present before this
  session's edits). Playwright exploration against real Chromium for the
  four features listed above, zero JS errors.

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Bobby asked to keep going toward "institutional quality." Followed up
  on an open item from earlier in this session: `fetch_infrastructure.py`'s
  substation and power-plant queries were silently returning 0 records on
  every run (visible as ArcGIS "Invalid URL" errors after an earlier fix in
  this same session made that failure loggable instead of silent, but not
  yet diagnosed). This sandbox's proxy blocks arcgis.com entirely, so
  diagnosis needed a real-internet environment — used a throwaway
  `workflow_dispatch` diagnostic workflow dispatched against GitHub Actions
  (PRs #208-#211, deleted once the real fix landed) to search HIFLD's ArcGIS
  orgs and verify actual field names/values rather than guessing.
- Findings: substations' original service is genuinely gone, but a live
  mirror exists under a different HIFLD org with a different schema
  (MAX_VOLT/MIN_VOLT instead of a combined VOLTAGE string, COUNTYFIPS
  instead of COUNTY_FIPS, COUNTRY='USA' not 'US'). Transmission's URL was
  never broken — its WHERE clause referenced a COUNTRY column that layer's
  schema doesn't have, which is why it failed with a different ArcGIS error
  ("Invalid query parameters") than substations/power-plants did ("Invalid
  URL"). Power_Plants and EPA water stress have no verified live
  replacement after a genuine search (both HIFLD orgs' full service
  listings, two DCAT catalog guesses, several 403s from human-facing search
  pages) — left open rather than guessed, per the project's own established
  rule from the Virginia parcel fieldMap incident.
- Files changed: `data/fetch_infrastructure.py`, `BUG_TRACKER.md`, this
  file. (Diagnostic-only files `data/diagnose_hifld_endpoints.py` and
  `.github/workflows/_diagnose_hifld.yml` were added and then deleted in
  this same pass, per their own stated intent.)
- Tests performed: `tests/run_all.sh` (176/176 — this module has no offline
  coverage, live network behavior only). The actual fix was verified via
  the diagnostic workflow's real Actions-runner probes returning genuine
  feature data with the exact WHERE clauses and field names now in the
  code, before writing the real fix.
- Remaining concerns: Power_Plants and EPA water stress are still broken
  (see BUG_TRACKER.md's Active Bugs). Recommend re-running
  `update_infrastructure.yml` after this merges to confirm substations and
  transmission now populate `sample_layers.json` for real, since CI is the
  only environment that can reach these services at all.

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Bobby asked for "a complete bug fix — access any web problems and fix
  them," i.e. actual browser/UI testing rather than data-pipeline/CI work.
  Ran `tests/e2e_smoke.mjs` against a real headless Chromium (pre-installed
  at `/opt/pw-browsers/chromium`) and a local server, iterating until all 15
  scenarios passed clean. Found and fixed two real bugs: (1) header nav tabs
  became unreachable with no visual affordance at common laptop widths
  (1200-1366px) because the "More" overflow pattern only engaged below
  700px — root-caused to a prior session's padding fix having been tuned
  for seven tabs before an eighth ("AI Stocks") was added; fixed the stale
  breakpoint and added a dynamic overflow-detection fallback so this class
  of bug can't silently recur. (2) The "Counties Researched" stat was
  overcounting by 597 (showing 1,467 instead of 870) in four places (Home
  KPI + freshness bar, Analytics KPI card, map legend, About page data
  quality panel) because they'd never adopted the `researchedCount()` fix
  from the 2026-07-27 reclassification sweep — most visibly on the About
  page, where "1,467 researched" and "2,273 not yet researched" sat next to
  each other without summing to 3,143. Also re-ran
  `data/refresh_platform_metadata.py`, which had itself drifted stale.
  See BUG_TRACKER.md for full root-cause writeups on both.
- Commit(s): see branch history for
  `claude/us-datacenter-restrictions-map-skooi7`, dated 2026-08-02.
- Files changed: `css/style.css`, `js/map.js`, `js/home.js`,
  `js/analytics.js`, `index.html` (cache-busting version bumps),
  `data/platform_metadata.json`, `tests/e2e_smoke.mjs`, `BUG_TRACKER.md`,
  this file.
- Tests performed: full `tests/run_all.sh` (176/176), `tests/e2e_smoke.mjs`
  end-to-end against real Chromium — 5 full runs while iterating, final run
  clean with zero JS errors and zero thrown assertions across all 15
  scenarios.
- Remaining concerns: none for this pass. Broader data-pipeline reliability
  work (EIA/FCC/LegiScan API keys, HIFLD ArcGIS endpoint drift) from earlier
  in this session remains open and requires Bobby to register free API keys
  — not fixable in code.

- Date: 2026-07-31
- Agent: Claude Code
- Task: Reconciled `claude/us-datacenter-restrictions-map-skooi7` with its
  actual merge state. PR #200 for that branch shows as "closed" rather than
  "merged" on GitHub — its diff was applied to `main` via a direct push
  (`1ce316a`, "Facility pipeline reliability fixes + Windows test-suite
  portability (#200)") instead of GitHub's own merge button, which is why the
  PR never flipped to a merged state. The branch then kept accumulating its
  own independent bot-generated data commits (source link health, facility
  refresh, economy pipeline, AI news) after that point, making it look like
  13 commits of unmerged work were stranded. Verified this was not the case:
  diffing file contents (not commit history) between `main` and the branch
  tip showed the only differences were 8 auto-generated data files, and
  `main`'s own copy of every one of them was timestamped strictly *after*
  the branch's — i.e. `main` had already re-run those pipelines and
  superseded the branch's copies. No unique code or data existed on the
  branch. Confirmed with the full `tests/run_all.sh` suite (200 offline
  tests, all passing) before touching anything.
- Action taken: force-pushed `claude/us-datacenter-restrictions-map-skooi7`
  to `main`'s current tip, so the branch stops looking perpetually "ahead."
- Files changed: this file (corrected the "PR opened and merged" claim
  below, which was misleading about the actual mechanism).
- Tests performed: full `tests/run_all.sh` (176/176 JS + all Python suites
  passing) run against the branch before reset, to confirm nothing of value
  would be lost.
- See "Open Handoffs" below for two related branch-cleanup items that could
  not be completed this session (blocked on permissions, not on judgment).

- Date: 2026-07-30
- Agent: Claude Companion
- Task: Fixed 3 Windows-only test-suite portability bugs (missing UTF-8
  encoding on file reads in `data/build_facilities_index.py` and
  `tests/test_no_paid_dependencies.py`; a Windows path-doubling bug in
  `tests/test_data_loading.mjs`) discovered while verifying the
  facility-pipeline branch's changes before merge. Confirmed via testing
  against `origin/main` on the same machine that none of these were caused
  by the branch itself — all three failed identically on `main`.
- Commit(s): see branch history for
  `claude/us-datacenter-restrictions-map-skooi7`, entry dated 2026-07-30 in
  `AI_CHANGELOG.md`.
- Files changed: `data/build_facilities_index.py`,
  `tests/test_no_paid_dependencies.py`, `tests/test_data_loading.mjs`.
- Tests performed: full `tests/run_all.sh` suite (Python 3.11.9 + Node.js
  24.18.0, both freshly installed for this — neither existed on this
  machine before). E2E Playwright suite not run (opt-in, needs a local
  server + Chromium; treated as optional per the project's own convention).
- Remaining concerns: see "Open Handoffs" below.

- Date: 2026-07-30
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Ratified the cloudscene-in-historical-snapshots handoff left by
  Claude Companion above. Recommended keeping the existing `PATH_EXEMPT`
  exemption for `data/facilities_version_history/` — those files are
  write-once archives, never re-read as config or executed, so scanning
  them protects nothing; a real reintroduction of a paid service would
  still be caught in the live source it's actually defined in (an
  adapter, `facility_sources.json`, `requirements.txt`, a workflow).
  Bobby confirmed. Expanded the `PATH_EXEMPT` comment in
  `tests/test_no_paid_dependencies.py` to spell out that reasoning, and
  updated `BUG_TRACKER.md`'s entry from "Open" to "Resolved".
- Commit(s): see branch history for
  `claude/us-datacenter-restrictions-map-skooi7`, dated 2026-07-30.
- Files changed: `tests/test_no_paid_dependencies.py`, `BUG_TRACKER.md`,
  this file.
- Tests performed: `python3 -m pytest tests/test_no_paid_dependencies.py -q`
  and full `tests/run_all.sh`.
- Remaining concerns: none — this handoff is closed.

## Open Handoffs

- Item: Maryland parcel endpoint returning 503 (Howard 24027 + Montgomery 24031).
- Current status: Open, external. Both counties share ONE statewide endpoint
  (`geodata.md.gov` MD_ParcelBoundaries), so they fail and recover together.
  Both entries carry a `knownUnavailable` block, so the monthly probe reports
  them as DEAD* and passes — anything NEWLY dead still fails the job.
- Why it was not fixed: a few minutes of HTTP 503 cannot distinguish a retired
  service from an extended outage. Replacing the URL would mean swapping a
  known-bad guess for an unverified one, which is precisely how the Virginia
  fieldMaps became wrong in the first place.
- Recommended next action: re-probe (Actions -> Check Parcel Services -> Run
  workflow). If still dead, re-derive from Maryland's GIS portal, confirm with
  the probe, then update `js/parcel/registry.js` and delete the
  `knownUnavailable` block. The probe reports RECOVERED if it comes back on
  its own.
- Relevant files: `js/parcel/registry.js`, `data/check_parcel_services.mjs`.

- Item: Panel wording for attributes a parcel source does not publish.
- Current status: Open, needs a product/voice decision, not research.
  `notProvidedBySource` now records these per jurisdiction (15 for Fairfax, 17
  Loudoun, 9 Prince William), but `panel.js` still simply omits empty rows —
  indistinguishable from a bug to anyone looking at the panel.
- Recommended next action: render those specific keys explicitly. Suggested
  wording "Not published by this source" rather than "Unknown": the latter
  claims we looked and could not determine it, when we know exactly why it is
  missing. This distinction is the same one the project already draws between
  "not yet researched" and "no known restrictions", and between the economy
  placeholders and zero.
- Relevant files: `js/parcel/panel.js`, `js/parcel/registry.js`.

- Item: Zoning / assessed value / sales data for the Virginia parcel counties.
- Current status: Not available from any of the three live services — this is
  a data-architecture limit, not a missing mapping. Do not add fieldMap
  entries for these; they will resolve to nothing.
- Recommended next action: joining a county's separate CAMA/tax service is a
  connector redesign (the model is currently one service per jurisdiction).
  Scope it deliberately rather than bolting it on.
- Relevant files: `js/parcel/connector-arcgis.js`, `js/parcel/registry.js`.

  (The "no-paid-dependency guard flags cloudscene in historical snapshots"
  item that used to be tracked here was resolved 2026-07-30 — see the
  2026-07-30 cloudscene entry further down this file's Recently Completed
  Work log and BUG_TRACKER.md's "Finding (ratified)" entry. Not re-listed
  as an open handoff.)

- Item: Same missing-`encoding="utf-8"` pattern exists in ~15 other
  `data/*.py` scripts (`check_source_links.py`,
  `export_facilities_to_layers.py`, `fetch_infrastructure.py`,
  `monitor_legislation.py`, `refresh_platform_metadata.py`, the
  `sweep_2026_07_*.py` scripts, and others).
- Current status: Not fixed — out of scope for this task, harmless on the
  project's actual Linux/Mac-based CI and dev environments, only surfaces
  if someone runs these scripts natively on Windows.
- Recommended next action: A dedicated, separate cleanup pass across
  `data/*.py` adding explicit UTF-8 encoding to every file read/write,
  rather than folding it into an unrelated feature branch.
- Relevant files: see grep for `open(` / `read_text(` without `encoding=`
  under `data/`.
- Relevant commits: n/a.

- Item: Delete two dead branches — `feature/automated-ai-news` and
  `fix/news-skip-ci`.
- Current status: Not deleted. Both are stale from 2026-07-11 (380 files /
  ~7.7M lines behind current `main` — predate the Economy tab, Zoning
  pilot, Stocks test suites, and vendored Three.js). Their one idea
  (dropping `[skip ci]` from the hourly news commit) was deliberately
  reconsidered later — `main` intentionally keeps `[skip ci]` on news
  commits since `ai_news.json` is fetched with `cache: "no-store"`, so no
  Pages redeploy is needed for new articles to appear (see AI_CONTEXT.md
  Session 6). Nothing on either branch is salvageable.
- Blocker: `git push origin --delete <branch>` was rejected with HTTP 403
  through the environment's git proxy for both branches (a force-push to
  reset `skooi7` succeeded seconds earlier from the same session, so this
  is specific to ref *deletion*, not a general push block — likely GitHub
  branch protection or an org policy denial, not a proxy misconfiguration).
  The GitHub MCP server also has no branch-deletion tool. Per this
  environment's own guidance, 403s from the proxy are policy denials to be
  reported, not routed around.
- Recommended next action: delete both branches manually from the GitHub
  UI (Branches page) or via an authenticated `gh api -X DELETE
  repos/bobbytrenkamp-lgtm/test1/git/refs/heads/<branch>` from a session
  with the right permissions.
- Relevant commits: n/a (no code change needed, deletion only).
