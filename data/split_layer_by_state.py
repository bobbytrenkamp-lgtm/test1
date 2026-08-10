#!/usr/bin/env python3
"""data/split_layer_by_state.py

    python3 data/split_layer_by_state.py
    python3 data/split_layer_by_state.py --check

Second-stage split, downstream of data/split_sample_layers.py: takes an
already-layer-split file under data/layers/<key>.json and further
partitions it by state, for the specific layers whose map toggle currently
fetches the WHOLE national file regardless of what's on screen.

WHY ONLY power_infrastructure (SUBSTATIONS) RIGHT NOW
------------------------------------------------------
The "PERFORMANCE + SCALE" milestone named three candidates for geographic
partitioning: substations, water_systems, wastewater_facilities. Checked
each against real client code (grep across js/*.js, not assumed) before
building anything:

  - power_infrastructure (53,826 records, 11.5MB): has a real map toggle
    (layerState.power / js/map.js's _buildPowerLayer()) that a user
    switches on today. Toggling it currently downloads all 53,826 US
    substations even when the map is showing one state -- this is the
    real, measurable bottleneck the milestone's "viewport-aware loading"
    section describes.
  - water_systems (44,612, 16.8MB) and wastewater_facilities (18,885,
    8.2MB): confirmed via grep to have ZERO client consumers anywhere --
    no layer toggle, no renderer, nothing reads them today (the same
    "pure dead weight" finding PR #470 already made for wastewater and
    power_plants). Partitioning data nothing fetches would be exactly the
    kind of framework-without-a-consumer work the milestone's own
    "measure first" / "don't build ahead of a real need" instruction
    argues against. GEO_PARTITIONED_KEYS below is a tuple specifically so
    adding one of these later (once it has a real map toggle) is a
    one-line change, not a new script.

OUTPUT SHAPE
------------
data/layers/<key>/manifest.json:
    { "generated_at", "source_layer", "total_records",
      "states": { "<ST>": { "file", "record_count", "byte_size",
                             "checksum", "bbox": [minLon,minLat,maxLon,maxLat] } } }

data/layers/<key>/states/<ST>.json: a plain array of that layer's own
    record shape, unmodified (same records data/layers/<key>.json already
    has -- just grouped) -- so the browser-side fetch needs no reshaping,
    only a different URL per state instead of the one national file.

A record with no state (or a value that isn't a real state) lands in an
UNKNOWN.json partition rather than being dropped -- STORE EVERYTHING,
never silently lose a record because it doesn't fit the model cleanly.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAYERS_DIR = ROOT / "data" / "layers"

# See the module docstring for why only this one key is here today.
GEO_PARTITIONED_KEYS = ("power_infrastructure",)

UNKNOWN_STATE = "UNKNOWN"


def _checksum(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def _bbox(records: list[dict]) -> list[float] | None:
    lons = [r["lon"] for r in records if isinstance(r.get("lon"), (int, float))]
    lats = [r["lat"] for r in records if isinstance(r.get("lat"), (int, float))]
    if not lons or not lats:
        return None
    return [min(lons), min(lats), max(lons), max(lats)]


def partition_by_state(records: list[dict]) -> dict[str, list[dict]]:
    """Pure: a flat record list -> {state: [records]}, uppercase state keys,
    a record with no/blank state routed to UNKNOWN rather than dropped."""
    buckets: dict[str, list[dict]] = {}
    for r in records:
        raw = (r.get("state") or "").strip().upper()
        state = raw if raw else UNKNOWN_STATE
        buckets.setdefault(state, []).append(r)
    return buckets


def build_split(key: str, records: list[dict]) -> dict[str, object]:
    """Pure: one layer's records -> {relative_path: content} for every file
    this script writes for that layer, mirroring split_sample_layers.py's
    split_layers()/main() split so the two scripts read the same way."""
    buckets = partition_by_state(records)
    outputs: dict[str, object] = {}
    manifest_states: dict[str, dict] = {}

    for state in sorted(buckets):
        state_records = buckets[state]
        rel = f"data/layers/{key}/states/{state}.json"
        content_json = json.dumps(state_records, indent=2) + "\n"
        outputs[rel] = state_records
        manifest_states[state] = {
            "file": rel,
            "record_count": len(state_records),
            "byte_size": len(content_json.encode("utf-8")),
            "checksum": _checksum(content_json),
            "bbox": _bbox(state_records),
        }

    outputs[f"data/layers/{key}/manifest.json"] = {
        "source_layer": key,
        "total_records": len(records),
        "total_states": len(buckets),
        "states": manifest_states,
    }
    return outputs


def _write_all(outputs: dict[str, object]) -> None:
    for rel_path, content in outputs.items():
        path = ROOT / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(content, indent=2) + "\n")


def main() -> int:
    check = "--check" in sys.argv

    all_outputs: dict[str, object] = {}
    for key in GEO_PARTITIONED_KEYS:
        source_path = LAYERS_DIR / f"{key}.json"
        if not source_path.exists():
            print(f"FATAL: {source_path} does not exist (run data/split_sample_layers.py first).")
            return 2
        records = json.loads(source_path.read_text())
        all_outputs.update(build_split(key, records))

    if check:
        stale = []
        for rel_path, content in all_outputs.items():
            path = ROOT / rel_path
            expected = json.dumps(content, indent=2) + "\n"
            if not path.exists() or path.read_text() != expected:
                stale.append(rel_path)
        # An orphaned state file (removed from a fresh split, e.g. a state's
        # only records were reclassified) is also staleness -- the browser
        # would fetch it for nothing, or a stale search could "cover" a
        # state that dropped out of the real data.
        for key in GEO_PARTITIONED_KEYS:
            states_dir = LAYERS_DIR / key / "states"
            if states_dir.exists():
                expected_files = {f"data/layers/{key}/states/{p.name}" for p in states_dir.glob("*.json")}
                produced_files = {p for p in all_outputs if p.startswith(f"data/layers/{key}/states/")}
                for orphan in expected_files - produced_files:
                    stale.append(f"{orphan} (orphaned)")
        if stale:
            print("Geo-partitioned layer split is stale:")
            for s in stale:
                print(f"  - {s}")
            print("\nRun: python3 data/split_layer_by_state.py")
            return 1
        print(f"OK — geo-partitioned split matches current data/layers/ for: {', '.join(GEO_PARTITIONED_KEYS)}.")
        return 0

    _write_all(all_outputs)
    total_bytes = sum(len(json.dumps(v)) for v in all_outputs.values())
    print(f"Wrote {len(all_outputs)} file(s) under data/layers/<key>/ ({total_bytes / 1024 / 1024:.2f} MB total)")
    for key in GEO_PARTITIONED_KEYS:
        manifest = all_outputs[f"data/layers/{key}/manifest.json"]
        print(f"  {key}: {manifest['total_records']} record(s) across {manifest['total_states']} state(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
