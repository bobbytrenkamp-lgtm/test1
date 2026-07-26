#!/usr/bin/env bash
# tests/run_all.sh — run the full test suite (Python data validators + JS tests).
#
#   ./tests/run_all.sh
#
# jsdom-dependent tests skip cleanly when jsdom is not installed. To enable them:
#   npm i jsdom
# If jsdom lives outside the repo, point NODE_PATH at it, e.g.
#   NODE_PATH=/tmp/node_modules ./tests/run_all.sh

set -uo pipefail
cd "$(dirname "$0")/.."

status=0
run() {
  echo ""
  echo "=== $1 ==="
  shift
  if "$@"; then :; else
    echo "  ^ FAILED"
    status=1
  fi
}

run "platform metadata validator" python3 data/validate_platform_metadata.py
run "AI companies validator"      python3 data/validate_ai_companies.py
run "policy pipeline unit tests"  python3 -m pytest tests/test_policy_pipeline.py -q
run "frontend core (constants + router)" node tests/test_frontend_core.mjs
run "jurisdiction page (DOM)"     node tests/test_jurisdiction.mjs
run "watchlist (migration + alerts)" node tests/test_watchlist.mjs

echo ""
if [ "$status" -eq 0 ]; then
  echo "All suites passed."
else
  echo "One or more suites FAILED."
fi
exit "$status"
