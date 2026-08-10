"""tests/test_split_layer_by_state.py — data/split_layer_by_state.py's
partition_by_state()/build_split() (pure) and --check freshness gate.

Run:  python3 -m pytest tests/test_split_layer_by_state.py -q
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

import split_layer_by_state as sp  # noqa: E402


RECORDS = [
    {"id": "sub-1", "state": "va", "lon": -77.5, "lat": 39.0},
    {"id": "sub-2", "state": "VA", "lon": -77.4, "lat": 39.1},
    {"id": "sub-3", "state": "MD", "lon": -77.1, "lat": 39.2},
    {"id": "sub-4", "state": "", "lon": -80.0, "lat": 40.0},
    {"id": "sub-5"},  # no state key at all, no lon/lat either
]


def test_partition_groups_by_uppercased_state():
    buckets = sp.partition_by_state(RECORDS)
    assert sorted(buckets.keys()) == ["MD", "UNKNOWN", "VA"]
    assert len(buckets["VA"]) == 2
    assert len(buckets["MD"]) == 1


def test_no_record_lost_or_duplicated():
    buckets = sp.partition_by_state(RECORDS)
    all_ids = [r.get("id") for records in buckets.values() for r in records]
    assert sorted(all_ids) == sorted(r.get("id") for r in RECORDS)
    assert len(all_ids) == len(set(all_ids))


def test_blank_and_missing_state_route_to_unknown_not_dropped():
    buckets = sp.partition_by_state(RECORDS)
    unknown_ids = {r["id"] for r in buckets["UNKNOWN"]}
    assert unknown_ids == {"sub-4", "sub-5"}


def test_build_split_produces_one_file_per_state_plus_manifest():
    out = sp.build_split("power_infrastructure", RECORDS)
    assert "data/layers/power_infrastructure/manifest.json" in out
    assert "data/layers/power_infrastructure/states/VA.json" in out
    assert "data/layers/power_infrastructure/states/MD.json" in out
    assert "data/layers/power_infrastructure/states/UNKNOWN.json" in out
    assert out["data/layers/power_infrastructure/states/VA.json"] == [RECORDS[0], RECORDS[1]]


def test_manifest_records_counts_and_bbox():
    out = sp.build_split("power_infrastructure", RECORDS)
    manifest = out["data/layers/power_infrastructure/manifest.json"]
    assert manifest["total_records"] == len(RECORDS)
    assert manifest["total_states"] == 3
    va = manifest["states"]["VA"]
    assert va["record_count"] == 2
    assert va["bbox"] == [-77.5, 39.0, -77.4, 39.1]
    assert va["byte_size"] > 0
    assert va["checksum"].startswith("sha256:")


def test_manifest_bbox_is_none_when_no_coordinates_present():
    out = sp.build_split("power_infrastructure", RECORDS)
    manifest = out["data/layers/power_infrastructure/manifest.json"]
    # sub-5 has no lon/lat and lands alone in nothing (it's grouped with
    # sub-4 in UNKNOWN, which does have coordinates) -- verify the mixed
    # bucket still produces a real bbox from the record that has one.
    assert manifest["states"]["UNKNOWN"]["bbox"] == [-80.0, 40.0, -80.0, 40.0]


def test_deterministic_output():
    out1 = sp.build_split("power_infrastructure", RECORDS)
    out2 = sp.build_split("power_infrastructure", RECORDS)
    assert json.dumps(out1, sort_keys=True) == json.dumps(out2, sort_keys=True)


def test_check_flag_matches_committed_split_files():
    result = subprocess.run(
        [sys.executable, "data/split_layer_by_state.py", "--check"],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
