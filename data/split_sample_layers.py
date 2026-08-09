#!/usr/bin/env python3
"""data/split_sample_layers.py

    python3 data/split_sample_layers.py
    python3 data/split_sample_layers.py --check

Splits data/sample_layers.json (25MB+ and growing -- power_infrastructure
alone is 53,826 records / ~9.3MB, wastewater_facilities 18,885 / ~7.0MB)
into data/layers/manifest.json plus one file per layer, so the browser can
fetch only the layer a user actually toggles on instead of the whole file
on every Map tab load.

WHY THIS EXISTS
----------------
js/map.js's loadSecondaryData() used to fetch the entire sample_layers.json
unconditionally as soon as the Map tab opened, then renderSampleMarkerLayers()
built EVERY layer's Leaflet markers eagerly -- including power_infrastructure
(53,826 circleMarkers) -- even though every one of those layer toggles
(layerState.power, .transmission, .fiber, .ai_campus, .dc_existing,
.dc_planned, .tax) defaults to OFF. A real user opening the Map tab for the
first time paid the full 25MB+ download and a 50,000+-object render cost
for layers they had not asked to see. Two layers inside that file --
power_plants and wastewater_facilities -- are not rendered by any client
code at all (confirmed by grepping every js/*.js file), so their ~7.3MB
combined was pure dead weight on every load.

Nothing here reduces coverage: every record in sample_layers.json is still
present, split across files rather than deleted or filtered. The parent
file is not touched -- Python pipelines that already read/write it
(fetch_infrastructure.py, build_facilities_index.py) are unaffected. This
is purely a derived, browser-facing projection, the same relationship
data_catalog.json has to dataset_registry.json.

OUTPUT SHAPE
------------
data/layers/manifest.json:
    { "generated_at": ISO8601, "layers": { "<key>": {
        "file": "data/layers/<key>.json", "record_count": int, "bytes": int,
        "eager": bool } } }

data/layers/core.json: the small keys real UI code reads unconditionally
    (not behind a layer toggle) -- water_stress, tax_incentive_counties,
    utility_territories -- kept as one small combined fetch rather than
    three separate ones, since together they are under 2KB.

data/layers/<key>.json for every other top-level array/dict key in
    sample_layers.json (power_infrastructure, transmission_lines,
    data_centers, ai_campuses, fiber_network, power_plants,
    wastewater_facilities): the raw value, unmodified, written standalone
    so a client fetch of one layer never touches another's bytes.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_LAYERS_PATH = ROOT / "data" / "sample_layers.json"
LAYERS_DIR = ROOT / "data" / "layers"
MANIFEST_PATH = LAYERS_DIR / "manifest.json"

# Keys folded into core.json: small, and read unconditionally by client code
# (not gated behind a layerState toggle), so splitting them out individually
# would just be three tiny fetches instead of one.
CORE_KEYS = ("water_stress", "tax_incentive_counties", "utility_territories")

# Meta/documentation keys that describe the file rather than holding data --
# not split into their own layer file, carried into manifest.json instead so
# the information isn't lost, just relocated.
META_KEYS = ("_disclaimer", "_facilities_exported_at", "_last_updated", "_fiber_network_note")


def _record_count(value) -> int:
    if isinstance(value, list):
        return len(value)
    if isinstance(value, dict):
        return len(value)
    return 0


def split_layers(data: dict) -> dict[str, object]:
    """Pure: sample_layers.json's parsed contents -> {relative_path: content}
    for every file this script writes. No filesystem I/O -- kept separate
    from main() so this is directly unit-testable."""
    outputs: dict[str, object] = {}
    manifest_layers: dict[str, dict] = {}
    meta = {k: data[k] for k in META_KEYS if k in data}

    core = {k: data[k] for k in CORE_KEYS if k in data}
    outputs["data/layers/core.json"] = core
    for k in CORE_KEYS:
        if k in data:
            manifest_layers[k] = {
                "file": "data/layers/core.json",
                "record_count": _record_count(data[k]),
                "bytes": len(json.dumps(data[k])),
                "eager": True,
            }

    for key, value in data.items():
        if key in CORE_KEYS or key in META_KEYS:
            continue
        rel = f"data/layers/{key}.json"
        outputs[rel] = value
        manifest_layers[key] = {
            "file": rel,
            "record_count": _record_count(value),
            "bytes": len(json.dumps(value)),
            "eager": False,
        }

    outputs["data/layers/manifest.json"] = {
        "generated_at": meta.get("_last_updated"),
        "source_meta": meta,
        "layers": manifest_layers,
    }
    return outputs


def _write_all(outputs: dict[str, object]) -> None:
    LAYERS_DIR.mkdir(parents=True, exist_ok=True)
    for rel_path, content in outputs.items():
        path = ROOT / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(content, indent=2) + "\n")


def main() -> int:
    check = "--check" in sys.argv

    if not SAMPLE_LAYERS_PATH.exists():
        print(f"FATAL: {SAMPLE_LAYERS_PATH} does not exist.")
        return 2

    data = json.loads(SAMPLE_LAYERS_PATH.read_text())
    outputs = split_layers(data)

    if check:
        stale = []
        for rel_path, content in outputs.items():
            path = ROOT / rel_path
            expected = json.dumps(content, indent=2) + "\n"
            if not path.exists() or path.read_text() != expected:
                stale.append(rel_path)
        if stale:
            print("Layer split artifacts are stale:")
            for s in stale:
                print(f"  - {s}")
            print("\nRun: python3 data/split_sample_layers.py")
            return 1
        print(f"OK — {len(outputs)} layer split file(s) match current data/sample_layers.json.")
        return 0

    _write_all(outputs)
    total_bytes = sum(len(json.dumps(v)) for v in outputs.values())
    print(f"Wrote {len(outputs)} file(s) under data/layers/ ({total_bytes / 1024 / 1024:.2f} MB total)")
    for key, meta in sorted(outputs["data/layers/manifest.json"]["layers"].items()):
        print(f"  {key}: {meta['record_count']} record(s), {meta['bytes'] / 1024:.1f} KB"
              f"{' [eager/core]' if meta['eager'] else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
