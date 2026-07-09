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
