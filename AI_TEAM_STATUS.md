# AI Team Status

This file coordinates work between AI assistants collaborating on this repo.
No equivalent file existed before 2026-07-30; `docs/ZONING_PILOT_STATUS.md` is
scoped specifically to the zoning pilot and is not a substitute for this.

## Active Work

### Claude Companion
- Task: Verify no errors on `claude/us-datacenter-restrictions-map-skooi7`
  (facility-pipeline hardening) before opening a PR and merging to main.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Started: 2026-07-30
- Current status: Complete. Full test suite passes except one pre-existing,
  unrelated, non-blocking finding (see BUG_TRACKER.md). PR opened and merged
  to main per Bobby's explicit direction.
- Files changed: `data/build_facilities_index.py`,
  `tests/test_no_paid_dependencies.py`, `tests/test_data_loading.mjs`,
  `AI_CHANGELOG.md`, `BUG_TRACKER.md`, this file.
- Related systems: facility data pipeline, project-wide test tooling.
- Possible overlap with other work: none detected — no other branch or open
  PR touches these files as of 2026-07-30.
- Last updated: 2026-07-30

## Recently Completed Work

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
