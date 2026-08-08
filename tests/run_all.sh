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
run "fiber_network honesty guard" python3 -m pytest tests/test_fiber_network_honesty.py -q
run "data catalog: generator + registry tests" python3 -m pytest tests/test_data_catalog.py -q
# The generated data catalog must match current repository state -- same
# staleness discipline as the parcel coverage metrics.
run "data catalog: committed artifacts are current" python3 data/generate_data_catalog.py --check
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
run "parcel batch: build_batch_drafts" node tests/test_parcel_build_batch_drafts.mjs
run "parcel batch: promote_batch (safety gates)" node tests/test_parcel_promote_batch.mjs
run "parcel batch: record_batch_results" node tests/test_parcel_record_batch_results.mjs
run "parcel multi-source enrichment (joins, provenance, health)" node tests/test_parcel_enrichment.mjs
run "parcel enrichment: arcgis-table join executor" node tests/test_parcel_enrichment_arcgis.mjs
run "parcel geo + infrastructure proximity engine" node tests/test_parcel_proximity.mjs
run "parcel proximity: real transmission/substation data wiring" node tests/test_parcel_proximity_layers.mjs
run "parcel environmental/development constraint intersections" node tests/test_parcel_constraints.mjs
run "parcel conceptual buildable envelope" node tests/test_parcel_envelope.mjs
run "parcel assemblage + owner adjacency" node tests/test_parcel_assemblage.mjs
run "parcel large-site discovery filters" node tests/test_parcel_site_search.mjs
run "parcel site suitability score (explainable)" node tests/test_parcel_suitability.mjs
run "parcel sales history + comparable transactions" node tests/test_parcel_sales.mjs
run "parcel site-intelligence export object (test3/test2 contract)" node tests/test_parcel_site_intelligence.mjs
run "parcel enrichment: CAMA join discovery + verification" node tests/test_parcel_enrichment_discovery.mjs
run "parcel coverage: classification + metrics rules" node tests/test_parcel_coverage_metrics.mjs
# The generated coverage artifacts must match what current repository data
# produces. A stale coverage number is worse than none: it gets quoted.
run "parcel coverage: committed artifacts are current" node data/parcel_pipeline/generate_coverage_metrics.mjs --check
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
