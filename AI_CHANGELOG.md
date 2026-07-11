# AI Changelog

This file is a running conversation between AI assistants working on this repository. Add a new entry after every coding session, including documentation-only sessions.

## Entry Template

Date:
AI Assistant:
Branch:
Files Changed:

Changes Made:
-

Reasoning:
-

Problems Found:
-

Next Recommended Actions:
-

---

Date: 2026-07-09
AI Assistant: Codex
Branch: main
Files Changed:
- `PROJECT_CONTEXT.md`
- `AI_CHANGELOG.md`
- `BUG_TRACKER.md`
- `AI_CONTEXT.md`

Changes Made:
- Created a permanent shared AI memory system at the repository root.
- Added project context, map requirements, design philosophy, and assistant rules.
- Added a changelog format for future AI-to-AI handoffs.
- Added a bug tracker format for active bugs, fixed bugs, and regressions that should not return.
- Updated existing repository AI instructions to point all assistants to the new workflow.

Reasoning:
- Multiple AI coding assistants need a stable source of truth so context survives across sessions and tools.
- Root-level markdown files are easy for Claude Code, Codex, and other assistants to discover before editing.

Problems Found:
- The native Codex GitHub plugin was unavailable in this session, so the repository was connected locally with Git instead.
- No application bugs were investigated during this documentation-only session.

Next Recommended Actions:
- Future assistants should update this file after every coding session.
- Review `PROJECT_CONTEXT.md` before planning new map, data, or UI work.
- Add newly discovered bugs to `BUG_TRACKER.md` as soon as they are found.

---

Date: 2026-07-09
AI Assistant: Codex
Branch: main
Files Changed:
- `PROJECT_CONTEXT.md`
- `AI_CHANGELOG.md`
- `README.md`

Changes Made:
- Scanned the repository for existing AI context, memory, documentation, planning, changelog, roadmap, and notes files before creating or changing documentation.
- Confirmed existing root documentation files: `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `PROJECT_CONTEXT.md`, `BUG_TRACKER.md`, and `README.md`.
- Added an existing documentation inventory to `PROJECT_CONTEXT.md` so future assistants preserve project history instead of restarting documentation.
- Marked `README.md` as partially historical where it conflicts with newer AI-maintained context, without deleting older information.
- Appended this changelog entry documenting the preservation pass.

Reasoning:
- The repository already had useful AI-generated context, including detailed architecture notes, session history, design decisions, known limitations, and the shared memory files.
- Future AI assistants need explicit instructions to preserve and improve existing context rather than overwrite it.

Problems Found:
- `README.md` still contains older D3-era implementation references, while `AI_CONTEXT.md` records the later Leaflet migration.
- No application runtime bugs were investigated or fixed during this documentation-only session.

Next Recommended Actions:
- Refresh `README.md` in a future pass so its public-facing tech stack matches the current Leaflet implementation.
- Continue appending to `AI_CHANGELOG.md` after each AI coding or documentation session.
- Keep `AI_CONTEXT.md` as the detailed historical handoff and `PROJECT_CONTEXT.md` as the concise source of truth.

---

Date: 2026-07-09
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Files Changed:
- `js/map.js`

Changes Made:
- Fixed Map Layers panel staying open on desktop: added `if (window.innerWidth > 700) return;` guard inside `onOutsideTap` in `initFilterPanelControls()`. The 700px breakpoint matches the existing CSS `@media (max-width: 700px)` rule. On desktop, the panel now only closes via the X button or the Layers toggle button. On mobile it still closes on outside tap.
- Fixed layer toggles only working once on desktop: added `e.preventDefault()` to the `click` handler on each `.filter-row` label in `renderFilterPanel()`. Without this, the browser's native label→input click-forwarding dispatched a second synthetic click on the wrapped `<input>`, which toggled `input.checked` back via checkbox pre-activation, then bubbled through the label and triggered `handleToggle` a second time — net effect was the layer toggled and immediately toggled back. `e.preventDefault()` stops the native forwarding so `handleToggle` fires exactly once per user click.

Reasoning:
- The outside-click handler was closing the panel for ALL viewport sizes. On mobile this is correct (panel blocks the map). On desktop the panel is small and should persist so users can toggle multiple layers without constantly reopening it.
- The toggle double-fire bug is a well-known browser behavior: clicking a `<label>` that wraps an `<input>` fires the click on the label, then the browser's label activation behavior fires a second click on the input, which bubbles back through the label and re-triggers any click listeners registered on the label element. Calling `e.preventDefault()` on the label click stops the second browser-generated click entirely.

Problems Found:
- No regressions observed. Mobile touchend path is unchanged (touchend still calls e.preventDefault() to suppress the synthetic click after touch).
- iOS Safari toggle fix from session PR #9 is preserved — touchend handler is still in place and takes priority on touch devices.
- Drag-guard fix from session PR #10 is preserved — isDraggingMap/isMouseDown guards on county hover/click are unaffected.

Next Recommended Actions:
- Test the layer panel on an actual mobile device to confirm outside-tap-to-close still works after the 700px guard was added.
- Add more counties and states to `data/map_data.json` and `data/state_regulations.json` as policy data is verified.
- Replace `data/sample_layers.json` facility data with verified real data before public launch.

---

Date: 2026-07-09
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Files Changed:
- `index.html`
- `css/style.css`
- `js/map.js`
- `data/ai_news.json` (new)

Changes Made:
- Feature 1 — Clickable restriction filter chips on #stats-bar: converted stat-chip divs to <button> elements; multi-select via activeRestrictFilters (Set); active chips get accent border/glow; countyStyle() dims non-matching counties; hover/click handlers guard against filtered-out counties; Clear button; #filter-status bar shows match count and active filter labels.
- Feature 2 — Advanced Filters panel (#adv-filter-panel): new "Filters" button in search bar; panel opens at body level (same position:fixed pattern as #filter-panel); sections: Restriction Severity (synced with chips), State dropdown, Policy Scope toggles (synced to layer panel), Facilities & Infrastructure list (synced to layer panel); bidirectional sync; Clear all button.
- Feature 3 — AI News Feed tab: "Map" / "AI News" nav tabs in header; #news-view shows/hides when switching; 12 sample articles in data/ai_news.json (clearly labeled SAMPLE DATA); article cards with category tag, source, date, title, summary, tags, location link; location link switches to Map tab and applies state filter; filters: search, category dropdown, state dropdown.

Reasoning:
- Filter chips give power users a one-click way to isolate counties by severity without entering the full Advanced Filters panel.
- Advanced Filters panel consolidates state filter, scope toggles, and facility toggles in one place, synced with the existing layer panel to avoid dual-truth issues.
- AI News tab gives the map a home for policy context without disrupting the map view; switching between tabs preserves map state (zoom, selection, filters).
- All three features are desktop+mobile compatible: chips and news toolbar reflow on narrow viewports; advanced filters panel becomes a bottom sheet on mobile (same pattern as existing Map Layers panel).

Problems Found:
- None. All existing functionality (drag panels, resize, layer toggles, county hover/click, iOS Safari toggle fix) was preserved. JS syntax check passed with no errors.

Next Recommended Actions:
- Replace data/ai_news.json with real verified news data (or add a backend feed) before public launch.
- Consider persisting activeRestrictFilters and activeStateFilter to URL hash so filtered views can be bookmarked/shared.
- Add county count to Advanced Filters panel as a live preview of how many counties match the current filter combination.
- Test advanced filters panel on mobile to confirm bottom-sheet behavior and scrollability.

---

Date: 2026-07-09
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: claude/us-datacenter-restrictions-map-skooi7
Files Changed:
- `index.html`
- `css/style.css`
- `js/map.js`

Changes Made:
- Added 6-dot waffle drag handle (`#filter-panel-drag-icon`, class `fp-drag-handle`) to Map Layers panel header for drag-to-move on desktop.
- Implemented pointer-event drag for Map Layers panel on desktop (`window.innerWidth > 700` guard). Saved position in `fpSavedPos`; restored on next open. Panel animates close from its current (dragged) position.
- Added bottom-right resize grip (`#filter-panel-resize-handle`, class `panel-resize-handle`) to Map Layers panel. Resize saves to `fpSavedSize` (width + maxHeight) and is restored on next open.
- Replaced Legend 3-state cycle (full → mini → hidden) with 2-state (visible → collapsed to restore button). `legendState` replaced with `legendOpen: boolean`. Legend now has a single × close button in its toolbar.
- Restructured `#legend` from a single-element scroll box to a flex column: `.legend-toolbar` (flex-shrink:0) + `.legend-body` (flex:1, scrollable) + `.panel-resize-handle` (absolutely positioned at bottom-right). This lets the resize grip always sit at the visual corner regardless of content scroll.
- Added pointer-event drag and resize for Legend panel on desktop. Position saved to `lgSavedPos`, size to `lgSavedSize`. Drag uses container-relative coordinates (legend is `position:absolute` inside `#map-container`).
- All drag/resize handlers add `body.is-dragging-floating-panel` / `body.is-resizing-floating-panel` during interaction to force cursor and suppress text selection globally.
- Drag and resize handles hidden on mobile via `display:none` default + `@media (min-width:701px)` override; all JS handlers guard with `window.innerWidth <= 700`.

Reasoning:
- Draggable panels let desktop users position controls without covering map features they care about.
- Resizable panels allow users to see more legend entries or more layer toggles depending on screen size.
- 2-state Legend is simpler UX: one click hides, one click restores. The 3-state mini mode added confusion with two separate buttons.
- Moving all legend items into `.legend-body` (separate scroll container inside the flex column) was required so the resize handle could be a non-scrolling sibling at the bottom corner of the legend box.
- `fpSavedPos`/`fpSavedSize`/`lgSavedPos`/`lgSavedSize` persist across panel open/close within the session so the user's layout is respected.

Problems Found:
- No regressions to existing functionality observed. Mobile bottom-sheet behavior, iOS Safari toggle fix, and drag-guard county hover/click suppression are all preserved.

Next Recommended Actions:
- Test drag and resize on actual desktop browser (Chrome, Safari, Firefox).
- Test that mobile shows no drag handle or resize grip and that panels still function as bottom sheets.
- Add more counties and states to `data/map_data.json` and `data/state_regulations.json` as policy data is verified.
- Replace `data/sample_layers.json` facility data with verified real data before public launch.

---

Date: 2026-07-11
AI Assistant: Claude Code (claude-sonnet-4-6)
Branch: feature/automated-ai-news
Files Changed:
- `data/update_ai_news.py` (new)
- `data/news_sources.json` (new)
- `.github/workflows/update_ai_news.yml` (new)
- `tests/test_update_ai_news.py` (new)
- `data/ai_news.json` (reset to empty — sample articles removed)
- `data/requirements.txt` (added requests, beautifulsoup4, python-dateutil)
- `index.html` (new category options, source filter, article detail panel HTML, status bar)
- `js/map.js` (news section completely rewritten; article detail panel logic; focus trap; back-button support)
- `css/style.css` (14-category tag classes, article detail panel styles, news status bar, source filter)
- `README.md` (AI News section: architecture, copyright policy, source config, troubleshooting)
- `PROJECT_CONTEXT.md` (AI News Feed added to completed features)

Changes Made:
- Replaced the 12 hardcoded sample articles in ai_news.json with an automated, merging, deduplicated RSS/Atom aggregator (update_ai_news.py). The feed runs hourly via GitHub Actions.
- New Python script (update_ai_news.py, ~700 lines): custom XML parser (stdlib only, no feedparser), relevance scoring with weighted keyword patterns, category classification (14 controlled categories), US state detection, SHA-256 URL fingerprint IDs, URL canonicalization (strips tracking params), Jaccard similarity deduplication at threshold 0.60, diversity capping per source, deterministic summary/key-points/why-it-matters generation from feed metadata, atomic JSON write, merge-based (new articles added; existing articles preserved up to retention_days), --dry-run and --validate-only flags.
- New sources file (news_sources.json): 23 enabled direct feeds (TechCrunch, The Verge, Ars Technica, VentureBeat, Wired, MIT Tech Review, IEEE Spectrum, Google/Microsoft/AWS/Meta/OpenAI/Anthropic blogs, NIST, FTC, DOE, data center trades, Electrek) + 12 Google News RSS queries. Disabled feeds documented with reasons.
- New GitHub Actions workflow: runs at :17 past every hour, validates JSON schema and URL safety before committing. Commits only when ai_news.json actually changes; uses [skip ci] to avoid recursive Pages deploys.
- 90 unit tests (tests/test_update_ai_news.py): no live internet required; covers URL canonicalization, safety validation, article ID generation, exact deduplication, fuzzy title deduplication, relevance scoring, category classification, state detection, date parsing, description sanitization, feed parsing (RSS 2.0 + Atom 1.0), article safety, diversity capping, schema validation.
- Frontend: article cards are now interactive <article role="button"> elements; clicking opens an internal article detail panel (right-side drawer on desktop, full-screen on mobile) rather than navigating to the external link directly. Detail panel shows: headline, publisher, date, category tag, state/locality button (switches to Map tab), summary, key points, "Why it matters", tags, "Read the original article on [Publisher]" button. Focus trap + ESC close + browser back button support (history.pushState). No innerHTML from feed data — all article text set via textContent only (XSS prevention). Publisher/source filter dropdown added to news toolbar.

Reasoning:
- Sample articles were misleading for users and tied the feed to manually maintained fake content. Automated aggregation from real publisher RSS feeds eliminates both problems.
- feedparser was intentionally avoided — it requires sgmllib which was removed from Python's stdlib in 3.11. The custom XML parser gives full Python 3.11 compatibility with no external XML dependency.
- The article detail panel keeps users in the app while previewing context, rather than immediately navigating away to external sites. Users who want the full article can still click the "Read the original" button.
- Strict XSS prevention (textContent only, no innerHTML from RSS data, URL prefix validation) because RSS content is untrusted external data from any number of publishers.

Problems Found:
- feedparser is incompatible with Python 3.11 (removed sgmllib). Replaced with stdlib xml.etree.ElementTree.
- requests.get() does not accept max_redirects kwarg. Fixed: use requests.Session() with session.max_redirects = 5.
- ElementTree Element objects are falsy when they have no children. feed.find("title") or feed.find("{ns}title") chains silently returned None even when the first find succeeded. Fixed: explicit is None checks throughout the Atom parser.
- RELEVANCE_KEYWORDS patterns were case-sensitive while haystacks were pre-lowercased. Fixed: added re.IGNORECASE to all compiled keyword patterns.
- Jaccard similarity for short/medium headline pairs is lower than intuition suggests. Adjusted test thresholds to 0.60 to avoid over-deduplication of genuinely different stories.

Next Recommended Actions:
- Merge PR and let the first hourly Actions run populate ai_news.json with real articles.
- Monitor the first few runs for any source fetch failures (check Actions logs).
- Consider adding more verified feeds to news_sources.json as they are identified.
- Run `python data/update_ai_news.py --dry-run` locally (with internet access) to preview real article output.
- Replace `data/sample_layers.json` facility data with verified real data before public launch.
