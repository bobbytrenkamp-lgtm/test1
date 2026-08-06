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
skipped=0
skipped_names=()
run() {
  echo ""
  echo "=== $1 ==="
  local name="$1"
  shift
  local tmp
  tmp="$(mktemp)"
  "$@" 2>&1 | tee "$tmp"
  local rc="${PIPESTATUS[0]}"
  if [ "$rc" -ne 0 ]; then
    echo "  ^ FAILED"
    status=1
  elif grep -q "^SKIP" "$tmp"; then
    skipped=$((skipped + 1))
    skipped_names+=("$name")
  fi
  rm -f "$tmp"
}

run "facilities index freshness" python3 data/build_facilities_index.py --check
run "platform metadata validator" python3 data/validate_platform_metadata.py
run "AI companies validator"      python3 data/validate_ai_companies.py
run "policy pipeline unit tests"  python3 -m pytest tests/test_policy_pipeline.py -q
run "source link move-suggestion logic" python3 -m pytest tests/test_check_source_links.py -q
run "economic data pipeline"      python3 tests/test_economic_data.py
run "economic output validation"  python3 data/update_economic_data.py --check
run "no paid dependencies"        python3 tests/test_no_paid_dependencies.py
run "parcel source catalog validator" python3 data/validate_parcel_catalog.py
run "parcel catalog + priority queue tests" python3 -m pytest tests/test_parcel_catalog.py tests/test_parcel_priority_queue.py -q
run "parcel registry integrity check" node data/parcel_pipeline/check_registry_integrity.mjs
run "parcel changed-FIPS diff mapper" node tests/test_parcel_changed_fips.mjs
run "parcel field mapper (ground-truth regression)" node tests/test_parcel_field_mapper.mjs
run "parcel field mapping validator" node tests/test_parcel_mapping_validator.mjs
run "parcel discovery: network (classify/backoff/cache)" node tests/test_parcel_discovery_network.mjs
run "parcel discovery: schema (ArcGIS inspection)" node tests/test_parcel_discovery_schema.mjs
run "parcel discovery: scoring (deterministic scorer)" node tests/test_parcel_discovery_scoring.mjs
run "parcel discovery: adapters (pure parsers)" node tests/test_parcel_discovery_adapters.mjs
run "parcel discovery: shared services registry" node tests/test_parcel_shared_services.mjs
run "parcel discovery: mapping confidence tagging" node tests/test_parcel_mapping_confidence.mjs
run "parcel discovery: discover_batch orchestration" node tests/test_parcel_discover_batch.mjs
run "frontend core (constants + router)" node tests/test_frontend_core.mjs
run "economy core (readiness score, signals, stats)" node tests/test_economy_core.mjs
run "economy map (layer-toggle race safety)" node tests/test_economy_map_race.mjs
run "jurisdiction page (DOM)"     node tests/test_jurisdiction.mjs
run "watchlist (migration + alerts)" node tests/test_watchlist.mjs
run "data loading (critical/deferred)" node tests/test_data_loading.mjs
run "pipeline (windowing + a11y)"   node tests/test_pipeline.mjs
run "parcel intelligence (schema, connectors, registry)" node tests/parcel.test.js
run "3D terrain view (tile math, decode, cache, scene state)" node tests/scene3d.test.js

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
  if [ "$skipped" -gt 0 ]; then
    echo "All RUN suites passed, but $skipped suite(s) were SKIPPED, not run:"
    for n in "${skipped_names[@]}"; do echo "  - $n"; done
    echo "This is NOT a full pass. Run \`npm i jsdom\` and re-run to actually cover them."
  else
    echo "All suites passed."
  fi
else
  echo "One or more suites FAILED."
fi
exit "$status"
