#!/usr/bin/env python3
"""One-time seed script: load existing data_centers.json + ai_campuses.json into
facilities_master.json with permanent facility IDs.

Run once to bootstrap the canonical dataset.  Subsequent updates go through
run_facility_pipeline.py.

Usage:
    python data/seed_facilities.py
"""
from __future__ import annotations

import os
import sys

# Allow running from repo root or from data/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.facility_pipeline.adapters.existing_datasets import ExistingDatasetsAdapter
from data.facility_pipeline.models import FacilitySource, load_json
from data.facility_pipeline.reporting import (
    CANDIDATES_PATH,
    CHANGELOG_PATH,
    MASTER_PATH,
    save_candidates,
    save_master,
    snapshot_master,
)
from data.facility_pipeline.sync import SYNC_STATE_PATH

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCES_PATH = os.path.join(DATA_DIR, "facility_sources.json")


def main() -> None:
    raw = load_json(SOURCES_PATH)
    if not raw:
        print(f"ERROR: facility_sources.json not found at {SOURCES_PATH}")
        sys.exit(1)

    seed_entry = next(
        (s for s in raw.get("sources", []) if s["id"] == "existing_data_centers"), None
    )
    if not seed_entry:
        print("ERROR: 'existing_data_centers' source not found in facility_sources.json")
        sys.exit(1)

    source = FacilitySource.from_dict(seed_entry)
    adapter = ExistingDatasetsAdapter(source)

    records = list(adapter.fetch())
    print(f"Seeding {len(records)} records from existing datasets...")

    # Check for existing master to avoid clobbering
    existing = load_json(MASTER_PATH)
    if existing:
        print(
            f"WARNING: {MASTER_PATH} already exists with {len(existing)} records. "
            "Skipping to avoid overwrite. Delete facilities_master.json to re-seed."
        )
        sys.exit(0)

    save_master(records)
    print(f"Wrote {len(records)} records to {MASTER_PATH}")

    # Initialise empty support files if absent
    for path, default in [
        (CANDIDATES_PATH, []),
        (CHANGELOG_PATH, []),
        (SYNC_STATE_PATH, {}),
    ]:
        if not os.path.exists(path):
            import json
            with open(path, "w") as f:
                json.dump(default, f, indent=2)
            print(f"Initialised {path}")

    snap = snapshot_master()
    print(f"Snapshot saved: {snap}")
    print("Seed complete.")


if __name__ == "__main__":
    main()
