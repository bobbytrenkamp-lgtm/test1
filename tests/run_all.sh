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

run "facilities index freshness" python3 data/build_facilities_index.py --check
run "platform metadata validator" python3 data/validate_platform_metadata.py
run "AI companies validator"      python3 data/validate_ai_companies.py
run "policy pipeline unit tests"  python3 -m pytest tests/test_policy_pipeline.py -q
run "economic data pipeline"      python3 tests/test_economic_data.py
run "economic output validation"  python3 data/update_economic_data.py --check
run "no paid dependencies"        python3 tests/test_no_paid_dependencies.py
run "frontend core (constants + router)" node tests/test_frontend_core.mjs
run "jurisdiction page (DOM)"     node tests/test_jurisdiction.mjs
run "watchlist (migration + alerts)" node tests/test_watchlist.mjs
run "data loading (critical/deferred)" node tests/test_data_loading.mjs
run "pipeline (windowing + a11y)"   node tests/test_pipeline.mjs
run "parcel intelligence (schema, connectors, registry)" node tests/parcel.test.js

# End-to-end browser suite. Needs a served copy of the repo and a Chrome
# binary, so it is opt-in rather than part of the default run:
#   python3 -m http.server 8099 &
#   E2E=1 NODE_PATH=/tmp/node_modules ./tests/run_all.sh
# See the header of tests/e2e_smoke.mjs for how to obtain the browser.
if [ "${E2E:-}" = "1" ]; then
  run "end-to-end browser smoke" node tests/e2e_smoke.mjs
else
  echo ""
  echo "=== end-to-end browser smoke ==="
  echo "  SKIPPED (set E2E=1 with a server on :8099 to run it)"
fi

echo ""
if [ "$status" -eq 0 ]; then
  echo "All suites passed."
else
  echo "One or more suites FAILED."
fi
exit "$status"
