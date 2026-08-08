#!/usr/bin/env python3
"""data/parcel_pipeline/static_ingestion/run_ingestion.py

CLI entry point the GitHub Actions workflow (and a human) calls to actually
run the pipeline for one or all registered static sources.

    python3 -m data.parcel_pipeline.static_ingestion.run_ingestion --all
    python3 -m data.parcel_pipeline.static_ingestion.run_ingestion --source some-county
    python3 -m data.parcel_pipeline.static_ingestion.run_ingestion --all --force-refresh

Output layout:
  data/parcel_pipeline/static_ingestion/state/<source_id>.manifest.json  (provenance, not published)
  data/generated/static_parcels/<source_id>/<source_id>_chunk_NNNN.geojson
  data/generated/static_parcels/<source_id>/<source_id>_index.json

Exit code is non-zero if ANY source's health is not OK/skipped, so a CI job
fails loudly rather than silently publishing a degraded dataset -- but each
source's result is still reported (never abandons the rest of the run
because one source failed, matching the per-service isolation the rest of
this pipeline already relies on for live ArcGIS connectors).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .models import load_registry, get_source
from .pipeline import run_pipeline, OK

ROOT = Path(__file__).resolve().parent.parent.parent.parent
STATE_DIR = Path(__file__).resolve().parent / "state"
OUTPUT_ROOT = ROOT / "data" / "generated" / "static_parcels"


def main():
    ap = argparse.ArgumentParser()
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="run every registered source")
    group.add_argument("--source", help="run one source by id")
    ap.add_argument("--force-refresh", action="store_true",
                     help="ignore the conditional-download shortcut and reprocess even if unchanged")
    args = ap.parse_args()

    if args.all:
        sources = load_registry()
        if not sources:
            print("No static sources are registered yet in sources.json -- nothing to do.")
            print("See models.py's module docstring for what verification a new entry needs.")
            return
    else:
        s = get_source(args.source)
        if not s:
            print(f"No registered static source with id '{args.source}'", file=sys.stderr)
            sys.exit(2)
        sources = [s]

    results = []
    any_bad = False
    for source in sources:
        print(f"\n=== {source.id} ({source.jurisdiction}) ===")
        result = run_pipeline(
            source,
            output_root=str(OUTPUT_ROOT),
            state_dir=str(STATE_DIR),
            force_refresh=args.force_refresh,
        )
        results.append(result)
        status = "SKIPPED (unchanged)" if result.skipped else result.health
        print(f"  {status} -- accepted={result.accepted_count} rejected={result.rejected_count} "
              f"chunks={result.chunk_count}")
        if result.why:
            print(f"  {result.why}")
        if not result.ok and not result.skipped:
            any_bad = True

    summary_path = STATE_DIR / "last_run_summary.json"
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(
        [{"source_id": r.source_id, "health": r.health, "skipped": r.skipped,
          "accepted_count": r.accepted_count, "chunk_count": r.chunk_count} for r in results],
        indent=2,
    ))

    print(f"\n{len(results)} source(s) processed, "
          f"{sum(1 for r in results if r.health == OK or r.skipped)} healthy.")
    if any_bad:
        sys.exit(1)


if __name__ == "__main__":
    main()
