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
