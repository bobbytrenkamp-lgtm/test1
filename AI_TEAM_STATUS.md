# AI Team Status

This file coordinates work between AI assistants collaborating on this repo.
No equivalent file existed before 2026-07-30; `docs/ZONING_PILOT_STATUS.md` is
scoped specifically to the zoning pilot and is not a substitute for this.

## Active Work

No active work in progress as of 2026-07-31.

## Recently Completed Work (continued)

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

## Open Handoffs

- Item: `no-paid-dependency guard flags cloudscene in historical snapshots`
  (see BUG_TRACKER.md "Finding (not fixed, needs a decision)").
- Current status: Open, non-blocking, pre-existing on `main`.
- Recommended next action: Bobby decides whether
  `data/facilities_version_history/` should be exempted from the
  paid-dependency scan (it's archived audit history, not live config) or
  whether flagging it forever is the intended, stricter behavior. Whoever
  implements the decision should update
  `tests/test_no_paid_dependencies.py` accordingly and close this entry.
- Relevant files: `tests/test_no_paid_dependencies.py`,
  `data/facilities_version_history/2026-07-12T*.json` (8 files).
- Relevant commits: n/a (pre-existing, not tied to a specific introducing
  commit).

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
