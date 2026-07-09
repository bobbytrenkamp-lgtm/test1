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
