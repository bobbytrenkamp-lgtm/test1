#!/usr/bin/env python3
"""Main runner for the government-source policy discovery pipeline.

Usage:
  python data/run_policy_pipeline.py [--check-health-only] [--dry-run] [--state AZ]

What it does:
  1. Loads government_sources.json
  2. For each active source with a URL, checks reachability (updates source_health.json)
  3. Runs the appropriate adapter to discover policy signals
  4. Normalizes signals into PolicyCandidate objects
  5. Deduplicates against existing candidates and restrictions_raw.json entries
  6. Validates candidates and adds the valid new ones to policy_candidates.json
  7. Appends change events to policy_change_log.json
  8. Prints a run summary

Candidates in policy_candidates.json are for HUMAN REVIEW.
They are NEVER automatically written to restrictions_raw.json or map_data.json.

Exit codes:
  0 — pipeline completed, no errors
  1 — some sources failed or new candidates found requiring review
  2 — critical error (e.g. government_sources.json not found)
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(DATA_DIR))

from policy_pipeline.source_registry import SourceRegistry
from policy_pipeline.models import SourceHealth, PolicyCandidate, load_json_file
from policy_pipeline.fetch import check_url_reachable, FetchError
from policy_pipeline.deduplicate import deduplicate_candidates, find_existing_fips_match
from policy_pipeline.validation import filter_valid_candidates
from policy_pipeline.lifecycle import migrate_restrictions_file
from policy_pipeline.reporting import (
    load_source_health, save_source_health, update_source_health_entry,
    load_candidates, save_candidates, build_run_summary, append_change_log,
    health_report_summary,
)
import policy_pipeline.adapters.generic_html as generic_html_adapter
import policy_pipeline.adapters.rss_atom as rss_atom_adapter
import policy_pipeline.adapters.sitemap as sitemap_adapter
import policy_pipeline.adapters.legistar as legistar_adapter
import policy_pipeline.adapters.granicus as granicus_adapter
import policy_pipeline.adapters.state_legislature as state_legislature_adapter
import policy_pipeline.adapters.open_data as open_data_adapter

RAW_PATH = os.path.join(DATA_DIR, "restrictions_raw.json")
CANDIDATES_PATH = os.path.join(DATA_DIR, "policy_candidates.json")

ADAPTER_MAP = {
    "generic_html":      generic_html_adapter,
    "rss_atom":          rss_atom_adapter,
    "sitemap":           sitemap_adapter,
    "legistar":          legistar_adapter,
    "granicus":          granicus_adapter,
    "state_legislature": state_legislature_adapter,
    "open_data":         open_data_adapter,
}

MAX_HEALTH_WORKERS = 8
MAX_ADAPTER_WORKERS = 4


def load_existing_entries() -> list[dict]:
    raw = load_json_file(RAW_PATH)
    if raw is None:
        return []
    return raw.get("restrictions", [])


def run_health_checks(registry: SourceRegistry) -> dict:
    """Check URL reachability for all active sources in parallel."""
    health_data = load_source_health()
    sources = list(registry.iter_checkable())
    print(f"Checking reachability of {len(sources)} source URLs...")

    results: dict[str, SourceHealth] = {}

    def check(source):
        reachable, status, error, ms = check_url_reachable(source.url)
        return source, SourceHealth(
            source_id=source.id,
            url=source.url,
            last_checked=datetime.now(timezone.utc).isoformat(),
            http_status=status,
            reachable=reachable,
            response_ms=ms,
            error=error,
            robots_allowed=True,  # We only check reachability here, not robots
        )

    with ThreadPoolExecutor(max_workers=MAX_HEALTH_WORKERS) as ex:
        futures = {ex.submit(check, s): s for s in sources}
        ok = fail = 0
        for future in as_completed(futures):
            source, health = future.result()
            update_source_health_entry(health_data, health)
            if health.reachable:
                ok += 1
            else:
                fail += 1
                print(f"  FAIL [{health.http_status or 'ERR'}] {source.id}: {health.error or ''}")

    save_source_health(health_data)
    print(f"Health check: {ok} reachable, {fail} unreachable")
    return health_data


def run_adapters(
    registry: SourceRegistry,
    health_data: dict,
    state_filter: str | None,
    dry_run: bool,
) -> list[PolicyCandidate]:
    """Run adapters for sources that passed health checks."""
    sources = [
        s for s in registry.active_sources()
        if s.url
        and health_data.get("sources", {}).get(s.id, {}).get("reachable", False)
        and (state_filter is None or s.state_abbr == state_filter)
    ]
    print(f"Running adapters on {len(sources)} reachable sources...")

    all_candidates: list[PolicyCandidate] = []

    def run_one(source):
        adapter_module = ADAPTER_MAP.get(source.adapter, generic_html_adapter)
        try:
            candidates, error = adapter_module.run(source)
            return source, candidates, error
        except Exception as e:
            return source, [], str(e)

    with ThreadPoolExecutor(max_workers=MAX_ADAPTER_WORKERS) as ex:
        futures = {ex.submit(run_one, s): s for s in sources}
        for future in as_completed(futures):
            source, candidates, error = future.result()
            if error:
                print(f"  [{source.id}] adapter error: {error}")
            elif candidates:
                print(f"  [{source.id}] found {len(candidates)} signal(s)")
                all_candidates.extend(candidates)

    return all_candidates


def migrate_lifecycle_fields() -> None:
    """Ensure all restrictions_raw.json entries have lifecycle fields."""
    raw = load_json_file(RAW_PATH)
    if raw is None:
        return
    updated = migrate_restrictions_file(raw)
    with open(RAW_PATH, "w") as f:
        json.dump(updated, f, indent=2)
    print("Lifecycle fields migrated in restrictions_raw.json")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Government-source policy discovery pipeline")
    parser.add_argument("--check-health-only", action="store_true",
                        help="Only check source URL health, do not run adapters")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run adapters but do not write new candidates")
    parser.add_argument("--state", metavar="ABBR",
                        help="Only process sources for this state (e.g. VA)")
    parser.add_argument("--migrate-lifecycle", action="store_true",
                        help="Add lifecycle fields to restrictions_raw.json and exit")
    args = parser.parse_args(argv)

    start = time.time()

    if args.migrate_lifecycle:
        migrate_lifecycle_fields()
        return 0

    # Load registry
    try:
        registry = SourceRegistry()
    except FileNotFoundError as e:
        print(f"CRITICAL: {e}", file=sys.stderr)
        return 2

    summary = registry.summary()
    print(f"Source registry: {summary['total']} sources ({summary['active']} active, "
          f"{summary['with_url']} with URL)")

    # Health checks
    health_data = run_health_checks(registry)

    if args.check_health_only:
        report = health_report_summary(health_data)
        print(f"\nHealth report: {report['reachable']}/{report['total_sources']} reachable")
        if report["chronic_failures"]:
            print(f"Chronic failures (3+ consecutive): {report['chronic_failures']}")
        return 0 if not report["unreachable"] else 1

    # Run adapters
    raw_candidates = run_adapters(registry, health_data, args.state, args.dry_run)
    print(f"Raw candidates discovered: {len(raw_candidates)}")

    # Deduplicate
    existing_entries = load_existing_entries()
    prior_candidates = load_candidates()
    new_candidates, duplicates = deduplicate_candidates(
        raw_candidates, existing_entries, prior_candidates
    )
    print(f"After dedup: {len(new_candidates)} new, {len(duplicates)} duplicates skipped")

    # Validate
    valid, invalid = filter_valid_candidates(new_candidates)
    if invalid:
        print(f"Validation: {len(invalid)} candidate(s) failed validation:")
        for cand, errors in invalid:
            for err in errors:
                print(f"  [{cand.candidate_id}] {err}")

    print(f"Valid new candidates: {len(valid)}")

    elapsed = time.time() - start
    run_summary = build_run_summary(
        sources_checked=summary["with_url"],
        sources_reachable=sum(1 for s in health_data.get("sources", {}).values() if s.get("reachable")),
        sources_failed=sum(1 for s in health_data.get("sources", {}).values() if not s.get("reachable")),
        new_candidates=len(valid),
        duplicates_skipped=len(duplicates),
        invalid_skipped=len(invalid),
        elapsed_seconds=elapsed,
    )

    if not args.dry_run and valid:
        save_candidates(valid)
        print(f"Saved {len(valid)} new candidate(s) to policy_candidates.json")
        change_entries = [{
            "log_id": f"run-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}-{i:04d}",
            "source_id": c.source_id,
            "detected_at": c.discovered_at,
            "change_type": "new_document",
            "url": c.signal_url,
            "summary": f"New candidate: {c.title} ({c.jurisdiction_name})",
            "acted_on": False,
        } for i, c in enumerate(valid)]
        append_change_log(change_entries)
    elif args.dry_run:
        print("[dry-run] Would have saved candidates — skipping write")

    print(f"\nRun complete in {elapsed:.1f}s")
    print(json.dumps(run_summary, indent=2))

    return 1 if valid else 0


if __name__ == "__main__":
    sys.exit(main())
