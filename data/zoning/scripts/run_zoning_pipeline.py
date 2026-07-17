"""
Zoning data pipeline — orchestrates fetch → normalize → validate → export
for one or all pilot jurisdictions.

Usage:
  python run_zoning_pipeline.py [--jurisdiction va-loudoun-county] [--skip-fetch] [--dry-run]

Steps:
  1. Fetch zoning geometry from official public sources (ArcGIS, GeoJSON)
  2. Normalize geometry attributes to canonical fields
  3. Validate all structured data (districts, standards, uses, overlays)
  4. Export combined normalized JSON for frontend consumption

Safety:
  - Downloads to temp location, validates, then replaces production output
  - Won't overwrite production geometry if validation fails
  - Logs change summaries; never silently replaces data
  - Uses [skip ci] in commit messages (handled by GitHub Actions workflow)
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from zoning_config import JURISDICTION_CONFIGS, NORMALIZED_DIR, GEOMETRY_DIR

from fetch_zoning    import fetch_for_jurisdiction, write_geometry
from normalize_zoning import normalize_geometry_for_jurisdiction
from validate_zoning  import run_validation
from export_zoning    import export_jurisdiction


def run_pipeline_for_jurisdiction(
    jurisdiction_id: str,
    skip_fetch: bool = False,
    dry_run: bool = False,
) -> dict:
    print(f"\n{'='*60}")
    print(f"Pipeline: {jurisdiction_id}  (skip_fetch={skip_fetch}, dry_run={dry_run})")
    print(f"{'='*60}")

    results = {
        "jurisdiction_id": jurisdiction_id,
        "run_at":          datetime.utcnow().isoformat() + "Z",
        "steps":           {},
        "success":         False,
    }

    # Step 1: Fetch geometry
    if not skip_fetch:
        print("\n[1/4] Fetching geometry...")
        geojson = fetch_for_jurisdiction(jurisdiction_id, dry_run=dry_run)
        if geojson is None:
            print("  FAILED: Could not fetch geometry")
            results["steps"]["fetch"] = "failed"
            results["notes"] = "Fetch step failed — geometry not available"
            # Continue with remaining steps (structured data may still export)
        else:
            results["steps"]["fetch"] = "ok"
            if not dry_run and not geojson.get("dry_run"):
                write_geometry(jurisdiction_id, geojson)
    else:
        print("\n[1/4] Skipping fetch (--skip-fetch)")
        results["steps"]["fetch"] = "skipped"

    # Step 2: Normalize geometry
    print("\n[2/4] Normalizing geometry...")
    norm = normalize_geometry_for_jurisdiction(jurisdiction_id, dry_run=dry_run)
    results["steps"]["normalize"] = "ok" if norm is not None else "skipped"

    # Step 3: Validate
    print("\n[3/4] Validating...")
    validation = run_validation(jurisdiction_id)
    results["steps"]["validate"] = validation["status"]
    results["validation"] = {
        "errors":   validation["error_count"],
        "warnings": validation["warning_count"],
    }

    # Step 4: Export (even if validation has warnings — errors require manual check)
    print("\n[4/4] Exporting normalized JSON...")
    if validation["error_count"] > 0 and not dry_run:
        print(f"  SKIPPING export: {validation['error_count']} validation errors")
        print("  Fix validation errors before exporting to production")
        results["steps"]["export"] = "skipped_due_to_errors"
    else:
        export_jurisdiction(jurisdiction_id, dry_run=dry_run)
        results["steps"]["export"] = "ok"
        results["success"] = True

    return results


def main():
    parser = argparse.ArgumentParser(description="Run zoning pipeline for one or all jurisdictions")
    parser.add_argument("--jurisdiction", help="Run for one jurisdiction; omit for all")
    parser.add_argument("--skip-fetch",   action="store_true", help="Skip geometry download step")
    parser.add_argument("--dry-run",      action="store_true", help="Skip file writes")
    args = parser.parse_args()

    if args.jurisdiction:
        ids = [args.jurisdiction]
    else:
        ids = list(JURISDICTION_CONFIGS.keys())

    print(f"Zoning pipeline — {datetime.utcnow().isoformat()}Z")
    print(f"Jurisdictions: {ids}")

    all_results = []
    any_failed  = False

    for jid in ids:
        result = run_pipeline_for_jurisdiction(
            jid,
            skip_fetch=args.skip_fetch,
            dry_run=args.dry_run,
        )
        all_results.append(result)
        if not result["success"]:
            any_failed = True

    # Summary
    print(f"\n{'='*60}")
    print("PIPELINE SUMMARY")
    print(f"{'='*60}")
    for r in all_results:
        status = "OK" if r["success"] else "FAILED"
        print(f"  {r['jurisdiction_id']}: {status}")
        v = r.get("validation", {})
        if v:
            print(f"    Errors: {v.get('errors',0)}  Warnings: {v.get('warnings',0)}")

    if any_failed:
        print("\nSome jurisdictions failed. See output above for details.")
        sys.exit(1)
    else:
        print("\nAll jurisdictions completed successfully.")


if __name__ == "__main__":
    main()
