"""tests/test_split_sample_layers.py — data/split_sample_layers.py's
split_layers() (pure) and --check freshness gate.

Run:  python3 -m pytest tests/test_split_sample_layers.py -q
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

import split_sample_layers as sp  # noqa: E402


SAMPLE = {
    "_disclaimer": "test data",
    "_last_updated": "2026-08-09T00:00:00Z",
    "data_centers": [{"id": "dc1"}, {"id": "dc2"}],
    "power_infrastructure": [{"id": "p1"}],
    "wastewater_facilities": [{"id": "w1"}, {"id": "w2"}, {"id": "w3"}],
    "water_stress": {"51107": 2.1},
    "tax_incentive_counties": ["51107"],
    "utility_territories": [{"fips_list": ["51107"]}],
    "fiber_network": [],
}


def test_core_keys_are_combined_into_one_file():
    out = sp.split_layers(SAMPLE)
    core = out["data/layers/core.json"]
    assert core["water_stress"] == {"51107": 2.1}
    assert core["tax_incentive_counties"] == ["51107"]
    assert core["utility_territories"] == [{"fips_list": ["51107"]}]


def test_non_core_keys_each_get_their_own_file():
    out = sp.split_layers(SAMPLE)
    assert out["data/layers/data_centers.json"] == SAMPLE["data_centers"]
    assert out["data/layers/power_infrastructure.json"] == SAMPLE["power_infrastructure"]
    assert out["data/layers/wastewater_facilities.json"] == SAMPLE["wastewater_facilities"]
    assert out["data/layers/fiber_network.json"] == []


def test_meta_keys_are_not_written_as_their_own_layer_file():
    out = sp.split_layers(SAMPLE)
    assert "data/layers/_disclaimer.json" not in out
    assert "data/layers/_last_updated.json" not in out


def test_manifest_records_every_layer_with_real_counts():
    out = sp.split_layers(SAMPLE)
    manifest = out["data/layers/manifest.json"]
    layers = manifest["layers"]
    assert layers["data_centers"]["record_count"] == 2
    assert layers["wastewater_facilities"]["record_count"] == 3
    assert layers["power_infrastructure"]["file"] == "data/layers/power_infrastructure.json"
    assert layers["water_stress"]["file"] == "data/layers/core.json"


def test_manifest_marks_core_keys_eager_and_others_not():
    out = sp.split_layers(SAMPLE)
    layers = out["data/layers/manifest.json"]["layers"]
    assert layers["water_stress"]["eager"] is True
    assert layers["tax_incentive_counties"]["eager"] is True
    assert layers["power_infrastructure"]["eager"] is False
    assert layers["wastewater_facilities"]["eager"] is False


def test_manifest_carries_source_meta_and_generated_at():
    out = sp.split_layers(SAMPLE)
    manifest = out["data/layers/manifest.json"]
    assert manifest["generated_at"] == "2026-08-09T00:00:00Z"
    assert manifest["source_meta"]["_disclaimer"] == "test data"


def test_no_records_are_dropped_across_all_split_files():
    out = sp.split_layers(SAMPLE)
    total_split = sum(
        m["record_count"] for m in out["data/layers/manifest.json"]["layers"].values()
    )
    total_source = sum(
        sp._record_count(v) for k, v in SAMPLE.items()
        if k not in sp.META_KEYS
    )
    assert total_split == total_source


def test_check_flag_matches_committed_split_files():
    # Mirrors tests/test_data_health.py's test_committed_artifacts_are_current
    # pattern: this asserts the real, committed data/layers/ files are in
    # sync with the real, committed data/sample_layers.json -- run this
    # after `python3 data/split_sample_layers.py` any time sample_layers.json
    # changes, exactly like data_catalog.json/data_health.json.
    result = subprocess.run(
        [sys.executable, "data/split_sample_layers.py", "--check"],
        cwd=str(ROOT), capture_output=True, text=True,
    )
    assert result.returncode == 0, (
        f"data/layers/ is stale -- regenerate with 'python3 data/split_sample_layers.py'.\n"
        f"{result.stdout}\n{result.stderr}"
    )
