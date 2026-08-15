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
  elif grep -q "^SKIP" "$tmp" || grep -qE "^[0-9]+ (passed, )?[0-9]+ skipped|^[0-9]+ skipped in" "$tmp"; then
    # Two skip shapes to catch: this repo's own JS tests print a "SKIP ..."
    # line (the original pattern this checked); pytest's own skipif marker
    # instead prints a summary line like "30 skipped in 0.13s" or "5 passed,
    # 2 skipped in 0.4s", never a line starting with "SKIP". Without this
    # second pattern, a whole pytest module skipped by its own skipif (e.g.
    # tests/test_static_ingestion.py without gdal-bin installed) would exit
    # 0 and vanish from this summary entirely instead of being reported as
    # not-fully-covered, the same transparency gap the jsdom-skip note below
    # exists to prevent.
    skipped=$((skipped + 1))
    skipped_names+=("$name")
  fi
  rm -f "$tmp"
}

run "facilities index freshness" python3 data/build_facilities_index.py --check
run "platform metadata validator" python3 data/validate_platform_metadata.py
run "facility pipeline sync state (stale error clearing)" python3 -m pytest tests/test_facility_sync_state.py -q
run "facility pipeline: QTS/CyrusOne operator adapters" python3 -m pytest tests/test_facility_pipeline_operator_adapters.py -q
run "AI companies validator"      python3 data/validate_ai_companies.py
run "policy pipeline unit tests"  python3 -m pytest tests/test_policy_pipeline.py -q
run "source link move-suggestion logic" python3 -m pytest tests/test_check_source_links.py -q
run "economic data pipeline"      python3 tests/test_economic_data.py
run "economic output validation"  python3 data/update_economic_data.py --check
run "no paid dependencies"        python3 tests/test_no_paid_dependencies.py
run "fiber_network honesty guard" python3 -m pytest tests/test_fiber_network_honesty.py -q
run "static parcel ingestion pipeline" python3 -m pytest tests/test_static_ingestion.py -q
run "national data ingestion: candidate source prober" python3 -m pytest tests/test_national_data_ingestion.py -q
run "infrastructure asset schema (base model + type extensions)" python3 -m pytest tests/test_infrastructure_asset_schema.py -q
run "infrastructure asset schema: JS/Python enum sync" node tests/test_infrastructure_asset_schema_sync.mjs
run "county geometry: TopoJSON bbox-centroid decoder" python3 -m pytest tests/test_county_geometry.py -q
run "interconnection queue ingestion (LBNL Queued Up parser)" python3 -m pytest tests/test_interconnection_queue.py -q
run "data catalog: generator + registry tests" python3 -m pytest tests/test_data_catalog.py -q
run "data health dashboard: generator + honesty tests" python3 -m pytest tests/test_data_health.py -q
# The generated data catalog must match current repository state -- same
# staleness discipline as the parcel coverage metrics.
run "data catalog: committed artifacts are current" python3 data/generate_data_catalog.py --check
run "grid readiness v1: generator + omission-vs-real-zero tests" python3 -m pytest tests/test_grid_readiness.py -q
run "grid readiness v1: committed artifacts are current" python3 data/generate_grid_readiness.py --check
run "grid readiness v1: client fetch-and-cache wrapper" node tests/test_grid_readiness_client.mjs
run "sample_layers split: generator tests" python3 -m pytest tests/test_split_sample_layers.py -q
run "sample_layers split: committed artifacts are current" python3 data/split_sample_layers.py --check
run "power layer geo-partitioning: generator tests" python3 -m pytest tests/test_split_layer_by_state.py -q
run "power layer geo-partitioning: committed artifacts are current" python3 data/split_layer_by_state.py --check
run "power layer viewport-aware loading (bbox intersection, cache, concurrency)" node tests/test_map_power_viewport.mjs
run "zoning normalization: punctuation-insensitive district code matching" python3 -m pytest tests/test_zoning_normalize.py -q
run "zoning frontend: FIPS_TO_JURISDICTION coverage matches normalized data on disk" node tests/test_zoning_frontend_coverage.mjs
run "zoning fetch: ArcGIS pagination doesn't truncate on unreliable exceededTransferLimit" python3 -m pytest tests/test_zoning_fetch_pagination.py -q
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
run "parcel constraint layers: real FEMA flood wiring" node tests/test_parcel_constraint_layers.mjs
run "parcel conceptual buildable envelope" node tests/test_parcel_envelope.mjs
run "parcel assemblage + owner adjacency" node tests/test_parcel_assemblage.mjs
run "parcel large-site discovery filters" node tests/test_parcel_site_search.mjs
run "national site index: build script (WHERE filters, centroid, normalization, orchestration)" node tests/test_build_national_site_index.mjs
run "national site index: state-partition split (manifest, no loss/dup, --check)" node tests/test_split_site_search_index.mjs
run "national site index: state-partition split committed artifacts are current" node data/parcel_pipeline/split_site_search_index.mjs --check
run "national site index: browser loader/wrapper around PARCEL_SITE_SEARCH (partitioned fetch, cache, concurrency, abort)" node tests/test_parcel_site_search_index.mjs
run "national site index: Web Worker dispatch layer (id routing, progress, abort, crash fallback)" node tests/test_parcel_site_search_worker_dispatch.mjs
run "find sites panel: form/search/render wiring" node tests/test_parcel_find_sites.mjs
run "find sites panel: result virtualization (windowed scroll-append)" node tests/test_find_sites_virtualization.mjs
run "parcel site suitability score (explainable)" node tests/test_parcel_suitability.mjs
run "parcel sales history + comparable transactions" node tests/test_parcel_sales.mjs
run "parcel site-intelligence export object (test3/test2 contract)" node tests/test_parcel_site_intelligence.mjs
run "parcel click panel: Intelligence tab (proximity/constraints/suitability/sales wiring)" node tests/test_parcel_panel_intelligence.mjs
run "saved sites: persistent parcel bookmarks" node tests/test_parcel_saved_sites.mjs
run "parcel click panel: Save button + Saved Sites section" node tests/test_parcel_panel_saved_sites.mjs
run "parcel report: Site Intelligence section (due-diligence export)" node tests/test_parcel_report_intelligence.mjs
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
run "map point clustering (grid clustering for large point layers)" node tests/test_map_point_clustering.mjs
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
