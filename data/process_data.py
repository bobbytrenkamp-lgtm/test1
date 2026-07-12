#!/usr/bin/env python3
"""
Rebuild map_data.json from restrictions_raw.json.
Runs on schedule via GitHub Actions. Also invoked by validate_sources.py.
"""

import json
import os
import sys
from datetime import datetime, timezone


RAW_DATA_PATH = os.path.join(os.path.dirname(__file__), "restrictions_raw.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "map_data.json")


def load_raw_data():
    with open(RAW_DATA_PATH, "r") as f:
        return json.load(f)


def build_county_map(restrictions):
    counties = {}
    for r in restrictions:
        fips = r["fips"].zfill(5)
        entry = {
            "name": r["name"],
            "state": r["state"],
            "level": r["level"],
            "types": r.get("types", []),
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "effective_date": r.get("effective_date", ""),
            "status": r.get("status", "active"),
            "notes": r.get("notes", ""),
            "sources": r.get("sources", []),
        }
        # Lifecycle fields — added by the policy pipeline; optional for backward compat
        if "lifecycle_stage" in r:
            entry["lifecycle_stage"] = r["lifecycle_stage"]
        if "pipeline_verified" in r:
            entry["pipeline_verified"] = r["pipeline_verified"]
        if "last_reviewed" in r:
            entry["last_reviewed"] = r["last_reviewed"]
        counties[fips] = entry
    return counties


def compute_stats(counties, meta):
    level_counts = {"-1": 0, "0": 0, "1": 0, "2": 0, "3": 0, "4": 0}
    for c in counties.values():
        lvl = str(c["level"])
        level_counts[lvl] = level_counts.get(lvl, 0) + 1

    type_counts = {}
    for c in counties.values():
        for t in c["types"]:
            type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "total_counties_tracked": len(counties),
        "by_level": level_counts,
        "by_type": type_counts,
        "level_labels": meta.get("levels", {}),
        "type_labels": meta.get("types", {}),
    }


def load_existing_output():
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, "r") as f:
            return json.load(f)
    return None


def main():
    print("Loading raw restriction data...")
    raw = load_raw_data()

    restrictions = raw.get("restrictions", [])
    meta = raw.get("meta", {})

    print(f"Found {len(restrictions)} county restriction entries.")

    counties = build_county_map(restrictions)
    stats = compute_stats(counties, meta)

    existing = load_existing_output()
    prev_validation = existing.get("validation_report") if existing else None

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_last_updated": meta.get("last_manually_updated", "unknown"),
        "stats": stats,
        "counties": counties,
    }

    if prev_validation:
        output["validation_report"] = prev_validation

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written map_data.json with {len(counties)} counties.")
    print(f"Stats: {stats['by_level']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
