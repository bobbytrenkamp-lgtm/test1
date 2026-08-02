# AI Team Status

This file coordinates work between AI assistants collaborating on this repo.
No equivalent file existed before 2026-07-30; `docs/ZONING_PILOT_STATUS.md` is
scoped specifically to the zoning pilot and is not a substitute for this.

## Active Work

No active work in progress as of 2026-08-02.

## Recently Completed Work (continued)

- Date: 2026-08-02
- Agent: Claude Code
- Task: Picked up two already-scoped items straight from Open Handoffs
  below rather than running a fourth research survey: the parcel panel's
  wording for attributes a source doesn't publish, and verifying whether
  the `data/*.py` missing-`encoding="utf-8"` handoff was still real.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/panel.js`'s `_fmtFieldRow()` (used by the Details,
  Zoning, and Valuation tabs alike) previously just omitted a row
  whenever a field's value was empty — indistinguishable to a user from
  a bug, whether the parcel genuinely has no value or the source never
  publishes that field type at all (`registry.js`'s `notProvidedBySource`
  already recorded the distinction, but nothing surfaced it). Now checks
  the current parcel's jurisdiction (via `props.county_fips` →
  `PARCEL_REGISTRY.get()`) and, for a field explicitly listed as not
  provided, renders "Not published by this source" instead of nothing.
  Also fixed the Zoning tab's zoning-code badge specifically, which had
  no fallback at all when absent — it now shows "Zoning code not
  published by this source" rather than the badge silently vanishing,
  the single most visually prominent instance of this gap. New
  `.pp-field-na` style (muted, italic) added to `parcel.css`.
- Verified, not assumed: since `panel.js` is deliberately excluded from
  the unit suite (touches the live document/Leaflet), and this sandbox
  cannot reach the real ArcGIS parcel services to select a live parcel,
  called `window.PARCEL_PANEL.show()` directly in a live browser with a
  synthetic feature shaped exactly like Loudoun County's real props
  (only the fields its real `fieldMap` actually provides present; all
  17 of its `notProvidedBySource` fields genuinely absent). Confirmed
  all 17 render "Not published by this source" across Details/Zoning/
  Valuation, confirmed the zoning-code badge fallback specifically, and
  separately confirmed genuinely-provided fields (parcel ID, area,
  subdivision) still render their real values unaffected. Full
  `tests/run_all.sh` 176/176 passing.
- Also: re-checked the `encoding="utf-8"` handoff below with a script
  scanning every `open()`/`read_text()`/`write_text()` call under
  `data/` recursively (the original handoff only appears to have
  checked the top level) — it's already fully resolved, zero calls
  missing `encoding=`. Removed the stale handoff entry; see the note
  left in its place for detail.
- Files changed: `js/parcel/panel.js`, `css/parcel.css`,
  `BUG_TRACKER.md`, this file.
- Related systems: the parcel intelligence panel (all three data tabs),
  every jurisdiction currently in the registry.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed two bugs found in a third codebase survey after PRs
  #216-#220 merged: a `javascript:`/`data:` URI scheme-validation gap
  across six `href` render sites, and three unguarded theme-change
  `localStorage.setItem` calls that could throw uncaught or leave an
  unhandled promise rejection. Also removed one small piece of dead
  code found in the same pass.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped:
  - Every file's local `esc()`/`escHtml()` helper HTML-encodes `& < >
    "` but none of them block a dangerous URL *scheme* — six
    `href="${esc(url)}"` sites in `report.js` (source citations, signal
    source URLs), `jurisdiction.js` (policy sources, archived-copy
    links, suggested-replacement links, related-news links), and
    `stocks.js` (related-news links) rendered `href` straight from
    automated scraper/RSS-adapter data with no scheme check. Added a
    single `safeHref(url)` to `js/constants.js` — this codebase's
    established home for de-duplicating site-wide helpers — that
    passes through real `http(s)` URLs and reduces anything else
    (`javascript:`, `data:`, empty, malformed) to a safe `"#"`. Applied
    at all six sites, composed with (not replacing) each file's
    existing escaping call.
  - Three `localStorage.setItem('theme', ...)` call sites (the header
    theme-toggle button in `map.js`, both branches of
    `applyThemeValue()` in `account.js`, and `auth.js`'s
    `setPreference()`) had no try/catch, unlike every other
    `localStorage` write site in the codebase. In a quota-exceeded or
    Safari-private-browsing environment, `setItem` throws — in
    `map.js` this happened *before* the theme actually changed, so the
    toggle button would silently do nothing on click; in `auth.js`'s
    `async setPreference()` (called with no `await`/`.catch()`
    anywhere) it would instead surface as an unhandled promise
    rejection on every theme change. Wrapped all four call sites (plus
    the paired `getItem` read) in `try {} catch {}`, matching the
    pattern already used everywhere else in this codebase for
    best-effort persistence.
  - Removed an unused `summIsDupe` computation in `js/news.js`
    (`_renderLeadCard` — computed but never referenced; the actual
    gating condition a few lines below is a different, simpler check).
- Verified, not assumed: exercised `safeHref()` directly in-browser
  against real URLs, dangerous schemes, and edge cases (empty,
  `undefined`, whitespace-padded, relative paths) — all resolved
  correctly. Loaded the Jurisdiction detail page live and confirmed
  every rendered source/archive/news `href` is still a real, correct
  URL (including Google News RSS redirect links), unaffected by the
  new guard. Clicked the header theme-toggle button live and confirmed
  it still correctly changes `data-theme`. Full `tests/run_all.sh`
  176/176 passing.
- Files changed: `js/constants.js`, `js/report.js`, `js/jurisdiction.js`,
  `js/stocks.js`, `js/map.js`, `js/account.js`, `js/auth.js`,
  `js/news.js`, `BUG_TRACKER.md`, this file.
- Related systems: every page that renders scraper/API-sourced links
  (Jurisdiction detail, county reports, AI Stocks news panel); the
  site-wide theme toggle (header button and the Account panel's theme
  selector).

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed two bugs found in the same codebase survey as the
  monitor_legislation fix below: a race condition in `js/economy-map.js`
  (rapid economic-layer toggling could desync the map from its own
  checkbox UI) and a listener/memory leak in `js/economy-view.js`
  (`selectRegion()`/`renderProfile()` never called `_teardown()`,
  contradicting the file's own documented render-lifecycle invariant).
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped:
  - `economy-map.js`'s `activate()` used a single `_loading` boolean as
    a mutex. Toggling layer A, then layer B before A's fetch resolved,
    made B's `activate()` call return `false` immediately (mutex still
    held) — indistinguishable from a genuine failure — while A's
    original promise later resolved and won anyway, leaving the map
    showing A's data with *neither* checkbox checked (B's toggle
    rolled back as "failed"; A's own checkbox had already been
    unchecked by B's "turn off other economic layers" exclusivity
    logic before A's promise resolved). Replaced the boolean mutex with
    a monotonic `_requestGen` counter: every toggle bumps it, and each
    in-flight `activate()` call compares its captured generation against
    the current one when its promise resolves — a stale/superseded
    request now returns `null` and is silently discarded (no checkbox
    rollback, no restyle), rather than being treated as a failure.
  - `economy-view.js`: every click in the Regional Explorer calls
    `selectRegion()` → `renderProfile()`, which replaces `#econ-profile`'s
    `innerHTML` (detaching its buttons) and rewires fresh listeners via
    `wireProfileActions()` — but nothing tore down the *previous*
    selection's listeners, so their closures (holding references to
    now-detached nodes) accumulated unboundedly in the module-level
    `_cleanups` array for the life of the page view. Fixed with a
    separately-scoped `_profileCleanups`/`onProfile()`/`_teardownProfile()`
    trio (mirroring the existing `_cleanups`/`on()`/`_teardown()`
    pattern) so the profile panel's own listeners are torn down before
    every re-render, without touching the still-live listeners other
    sections (KPI strip, trends, signals, search) registered through
    the shared `_cleanups`. Also caught and fixed two more call sites
    that bypass `renderProfile()` entirely (the geo-toggle and
    metric-clear handlers, which reset `#econ-profile`'s content
    directly) — both would have leaked through the same gap and needed
    their own `_teardownProfile()` call.
- Verified, not assumed: reviewed the diff in full before accepting it,
  then independently reproduced both bugs' *fixed* behavior live rather
  than trusting the diff alone. Race condition: throttled the county
  data fetch via Playwright route interception, rapidly toggled two
  layers within the resulting race window, and confirmed the final
  state is self-consistent (whichever layer ended up active matches
  its checkbox and `layerStateRef`) — plus confirmed ordinary
  single-toggle on/off still works normally. Memory leak: called
  `selectRegion()` 8 times in a row via the exposed
  `window.ECONOMY_VIEW.selectRegion()`/`_debug()` API and confirmed
  `profileListenerCount` stays flat at 3 across all 8 calls (would have
  grown to 24 before the fix), then specifically checked for a stale-
  closure symptom — selected county A, then county B, then clicked the
  watchlist button once, and confirmed only B (the current selection)
  got watchlisted, not A. Full `tests/run_all.sh` 176/176 passing.
- Files changed: `js/economy-map.js`, `js/economy-view.js`,
  `BUG_TRACKER.md`, this file.
- Related systems: the Economy tab's map-layer toggle UI and Regional
  Explorer profile panel. No other page's code touched.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed a truthfulness bug in `monitor_legislation.yml`/
  `monitor_legislation.py` (a monitor-script crash could be misreported
  as "new legislation flagged" or a clean "no new items" run) and
  removed a dead, unwired-up `ISO_QUEUE_URLS` dict in `ferc_queue.py`.
  Found while surveying the codebase for the next round of work after
  the accessibility PRs (#216/#217/#218) merged.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `main()` in `monitor_legislation.py` now wraps its call to
  `run_monitoring()` in `try`/`except` — an uncaught exception returns
  `2`, distinct from `0` (no new items) and `1` (new items found),
  where previously it would have fallen through to Python's own default
  exit code of `1` for an unhandled exception, identical to the
  deliberate "found something" signal. The workflow's "Print summary"
  step now treats `2` as a real failure (fails the step so the job
  shows red, instead of continuing to show green under
  `continue-on-error`), and a new step files/updates a GitHub issue
  tagged `data-validation` — a label that was already defined in this
  workflow but never actually used anywhere in it — mirroring the
  pattern `update_data.yml` already used correctly for its own
  validator-failure case. `ISO_QUEUE_URLS` (7 per-ISO URLs, zero
  references anywhere) removed from `ferc_queue.py`; the same
  information already exists as prose in the file's docstring.
- Verified, not assumed: monkeypatched `run_monitoring()` to exercise
  all three `main()` outcomes directly (crash → `2` with traceback +
  marker printed; empty list → `0`; populated list → `1` with the
  issue-body markers intact) rather than just reading the code and
  assuming it was right. Validated the workflow YAML still parses.
  Confirmed `ISO_QUEUE_URLS` had zero references anywhere in the repo
  before removing it. Full `tests/run_all.sh` 176/176 passing
  (unaffected — no existing test exercises `monitor_legislation.py`
  directly).
- Files changed: `data/monitor_legislation.py`,
  `.github/workflows/monitor_legislation.yml`,
  `data/facility_pipeline/adapters/ferc_queue.py`, `BUG_TRACKER.md`,
  this file.
- Related systems: the legislative-monitoring GitHub Action (runs Mon/
  Thu 08:00 UTC), the FERC interconnection-queue facility adapter (Tier
  4 discovery source).
- Deliberately NOT done: did not try to actually make the monitor more
  robust against the underlying failure modes that could crash it (bad
  API responses, network errors) — this fix is specifically about the
  workflow/exit-code signal being honest when a crash *does* happen, not
  about preventing every possible crash. `data/monitor_legislation.py`'s
  individual fetch functions already have their own error handling from
  an earlier pass this session.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed the News tab's own pre-existing WCAG accessibility
  violations (`aria-allowed-role`, `aria-prohibited-attr`,
  `color-contrast`, `nested-interactive`) — the open handoff logged
  below by the site-wide accessibility pass (#216), which never covered
  `#tab-news`.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped:
  - Every clickable news card (`.news-lead`, `.news-row`,
    `.news-dev-item`, `.news-wire-item`, `.news-mi-item`, the section
    "featured" block) no longer has `role="button"`+`tabindex` bolted
    onto its `<article>`/`<section>`/`<div>` container. Instead each
    card's headline is a real `<button>` (new `_makeHeadlineBtn()` in
    `js/news.js`) — natively keyboard-operable, no manual keydown code
    needed — and the container keeps only a plain "click anywhere on
    the card" mouse listener (new `_wireCardClick()`), no role/tabindex.
    This fixed both `aria-allowed-role` (69 nodes — `<article>`/
    `<section>` don't allow `role="button"` in the ARIA-in-HTML spec)
    and `nested-interactive` (27 nodes — the cards' real nested
    `.news-location-link` buttons were focusable descendants of another
    focusable, role="button" element).
  - `.news-status-dot` (the "auto-updated" indicator) now gets
    `aria-hidden="true"` instead of an invalid, redundant `aria-label`
    on a bare `<span>` (`aria-prohibited-attr`, 1 node) — the adjacent
    "Auto-updated hourly" text already conveys the same thing visibly.
  - All 14 category-tag chip colors (`.cat-data-centers`, etc. in
    `css/style.css`) re-tuned for contrast: 1 (Legal & Copyright)
    needed a dark-theme fix, and — checking all 14, not just the ones
    that happened to be in that day's live feed — every one of them
    failed in light theme (as low as 1.41:1), since these colors had no
    light-theme override at all. Added one, in both the
    `html[data-theme="light"]` block and the `@media
    (prefers-color-scheme: light) { html:not([data-theme="dark"])
    {...} }` block — the same dual-block pattern already found missing
    in `economy.css`/`parcel.css`/`pipeline.css` during the site-wide
    pass. Colors computed via the WCAG relative-luminance formula
    against each chip's actual axe-computed blended background (its
    rgba tint over the real `--surface`), same hue, darkened/lightened
    until ≥4.5:1, then verified in-browser.
- Verified, not assumed: local `python3 -m http.server 8099` +
  Playwright (Chromium) + axe-core loop scanning `#tab-news`
  specifically (`wcag2a`/`wcag2aa`/`best-practice`), same method the
  handoff asked for. Before: `aria-allowed-role` (69),
  `aria-prohibited-attr` (1), `color-contrast` (6), `nested-interactive`
  (27). Fixed one violation class at a time, re-scanning after each —
  all four cleared to zero, confirmed again with one final full sweep.
  Separately swept all 14 category colors (not just whichever were live
  that day) against both themes programmatically — all pass. Confirmed
  click/keyboard behavior didn't regress: card-whitespace click, Tab +
  Enter on the headline button, and the nested location-link button
  (still filters the map, still doesn't also open the article detail)
  all work correctly. Full `tests/run_all.sh` 176/176 passing; `E2E=1`
  browser smoke suite passing.
- Files changed: `js/news.js`, `css/style.css`, `BUG_TRACKER.md`,
  `AI_TEAM_STATUS.md`.
- Related systems: none outside the News tab — the headline-button
  restructuring only touches `js/news.js`'s card-builder functions and
  the CSS handles matching classes; no other page's markup pattern was
  touched.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed `tests/run_all.sh` reporting "All suites passed" when
  jsdom-dependent suites were actually silently skipped — the same
  hollow-pass bug class fixed once already (2026-07-31) in the CI
  workflow's dependency step, found while surveying the codebase for
  the next round of work after the accessibility PR (#216) merged.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `run()` now checks each suite's output for a `SKIP` marker in
  addition to its exit code, and the final summary explicitly lists any
  skipped suites and states "This is NOT a full pass" instead of
  claiming an unqualified pass. Exit code unchanged.
- Verified, not assumed: reproduced the bug directly (ran the script in
  this sandbox, which has no jsdom, and got the old false "All suites
  passed"), then confirmed the fix in both states — jsdom absent (new
  summary correctly lists the 3 skipped suites) and jsdom present via a
  throwaway `npm install --prefix` (summary reverts to plain "All
  suites passed" and the 3 suites actually run and pass) — plus
  confirmed a deliberately-failing command is still caught.
- Files changed: `tests/run_all.sh`, `BUG_TRACKER.md`, this file.
- Related systems: local dev test workflow (does not affect CI, which
  already installs jsdom as of the 2026-07-31 fix).

- Date: 2026-08-02
- Agent: Claude Code
- Task: Site-wide WCAG 2 AA accessibility audit (axe-core, `wcag2a`/
  `wcag2aa`/`best-practice` tags) across every page. Not scoped to a bug
  report — a systematic sweep following the standing "keep improving,
  institutional quality" instruction.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: a `<main>` landmark now wraps every page view (previously the
  app had none, so axe's `region` rule failed almost everywhere); the
  missing `@media (prefers-color-scheme: light)` mirror block was added
  to `economy.css`/`parcel.css`/`pipeline.css` (root cause of 46 of
  Pipeline's `color-contrast` violations — OS-preference light-mode
  users, not just users who explicitly toggle the theme, were getting
  unreadable dark-theme colors); theme-aware CSS custom properties
  replaced hardcoded severity/status colors reused verbatim across both
  themes (`--color-danger`/`--color-info`, `.juris-sev`'s inline
  severity color, `.ds-badge`'s five status colors); 18 unlabeled
  `<select>` elements got `aria-label`s; heading levels that jumped from
  `h1` straight to `h3` (Map/Stocks/Pipeline/Analytics) were fixed by
  promoting each page's first real heading to `h2`. Full writeup with
  root causes in `BUG_TRACKER.md`.
- Verified, not assumed: every fix re-confirmed via a fresh axe-core
  scan after the change, not just reasoning about the CSS. The `<main>`
  wrapper work in particular needed three iterations before it was
  right — the first attempt (`display:contents` alone) still exposed
  every *inactive* tab's empty `<main>` as a second simultaneous
  landmark, and a nesting mistake while restructuring the Map tab's
  wrapper briefly put `<main>` inside `<main>`. Both were caught by
  re-running the scan rather than assuming the fix worked, and are
  recorded in `AI_CONTEXT.md`. Confirmed page layout is pixel-for-pixel
  unaffected on every tab (dimensions checked directly), confirmed
  theme colors actually swap at runtime (not just correct on paper), and
  ran the full `E2E=1` browser smoke suite (zero JS errors) plus
  `tests/run_all.sh` (176/176) before pushing.
- Files changed: `index.html`, `css/style.css`, `css/jurisdiction.css`,
  `css/economy.css`, `css/parcel.css`, `css/pipeline.css`,
  `css/stocks.css`, `js/map.js`, `js/pipeline.js`, `js/analytics.js`,
  `js/home.js`, `js/jurisdiction.js`, `js/stocks.js`,
  `js/economy-view.js`, `tests/e2e_smoke.mjs`.
- Related systems: every page's DOM landmark structure, theming
  (dark/light), Pipeline's badge coloring, the E2E smoke suite's
  Economy-tab legend diagnostic (one selector updated to match the new
  heading level).
- Deliberately NOT done: Pipeline's two remaining `color-contrast`
  nodes (`#pl-view-table`/`#pipeline-export-btn`, 4.25:1) were left as
  `--accent` is a brand color used site-wide — a bigger design call than
  the rest of this pass. The News tab's pre-existing, unrelated
  accessibility issues (`aria-allowed-role`, `aria-prohibited-attr`,
  `color-contrast`, `nested-interactive` — never previously audited,
  not caused by this change) were found but are out of scope for this
  PR; confirmed this pass did not regress or touch them. See Open
  Handoffs.

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

  (The "panel wording for attributes a parcel source does not publish"
  item that used to be tracked here was resolved 2026-08-02, using
  exactly the wording this entry recommended ("Not published by this
  source") — see this file's Recently Completed Work log and
  BUG_TRACKER.md's parcel panel entry. Not re-listed as an open handoff.)

  (The "same missing-`encoding=\"utf-8\"` pattern exists in ~15 other
  `data/*.py` scripts" item that used to be tracked here is resolved —
  verified 2026-08-02 with a full script over every `open()`/`read_text()`/
  `write_text()` call under `data/` (recursively, not just the top level):
  zero calls are missing `encoding=` (excluding the handful of correct
  binary-mode `"rb"`/`"wb"` opens, which don't take one). Every file this
  item originally named already has it. Unclear exactly which prior fix
  closed this out — likely an incidental side effect of other work rather
  than a dedicated pass — but the gap doesn't exist anymore, so it's not
  re-listed as an open handoff.)

  (The "News tab has its own unrelated, pre-existing WCAG accessibility
  issues" item that used to be tracked here was resolved 2026-08-02 —
  see this file's Recently Completed Work log and BUG_TRACKER.md's News
  tab entry. Not re-listed as an open handoff.)

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
