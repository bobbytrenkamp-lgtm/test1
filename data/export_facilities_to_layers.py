#!/usr/bin/env python3
"""Export facilities_master.json → sample_layers.json (data_centers + ai_campuses sections).

Reads the canonical facility master dataset and writes the data_centers and
ai_campuses sections into sample_layers.json, which is what the frontend map
reads. All other sections in sample_layers.json (infrastructure layers, etc.)
are preserved unchanged.

Usage:
    python data/export_facilities_to_layers.py
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_PATH = os.path.join(DATA_DIR, "facilities_master.json")
LAYERS_PATH = os.path.join(DATA_DIR, "sample_layers.json")

_STATUS_MAP = {
    "operational": "existing",
    "under_construction": "planned",
    "planned": "planned",
    "decommissioned": "decommissioned",
    "mothballed": "decommissioned",
}


def _to_layer_record(r: dict) -> dict:
    """Convert a facilities_master record to sample_layers data_centers format."""
    status = _STATUS_MAP.get(r.get("operational_status", ""), "existing")

    capacity = r.get("capacity_mw_known") or r.get("campus_total_mw")

    sources = []
    for url in r.get("source_urls", []):
        if url:
            sources.append({"label": r.get("operator") or r.get("name") or "Source", "url": url})

    record = {
        "id": r.get("facility_id", ""),
        "name": r.get("name") or r.get("operator") or "",
        "operator": r.get("operator") or "",
        "status": status,
        "county_fips": r.get("county_fips") or "",
        "notes": r.get("notes") or "",
        "lat": r.get("latitude"),
        "lon": r.get("longitude"),
    }

    if capacity:
        record["capacity_mw"] = capacity

    if sources:
        record["sources"] = sources

    return record


def main() -> None:
    with open(MASTER_PATH) as f:
        master = json.load(f)

    with open(LAYERS_PATH) as f:
        layers = json.load(f)

    data_centers = []
    ai_campuses = []

    for r in master:
        if r.get("latitude") is None or r.get("longitude") is None:
            continue
        if r.get("is_candidate"):
            continue

        layer_rec = _to_layer_record(r)

        if r.get("is_hyperscale"):
            ai_campuses.append(layer_rec)
        else:
            data_centers.append(layer_rec)

    layers["data_centers"] = data_centers
    layers["ai_campuses"] = ai_campuses
    layers["_facilities_exported_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(LAYERS_PATH, "w") as f:
        json.dump(layers, f, indent=2, ensure_ascii=False)

    print(f"Exported {len(data_centers)} data centers + {len(ai_campuses)} AI campuses → {LAYERS_PATH}")


if __name__ == "__main__":
    main()
