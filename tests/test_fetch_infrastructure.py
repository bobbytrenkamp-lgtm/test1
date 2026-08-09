"""tests/test_fetch_infrastructure.py — data/fetch_infrastructure.py's power
plant fetcher.

fetch_power_plants() was broken for a long time (POWER_PLANT_URL pointed at
a retired HIFLD service). This tests the fix against a real, verified field
schema (confirmed 2026-08-08 via a live GitHub Actions dispatch against
geodata.epa.gov/arcgis/rest/services/OEI/FRS_PowerPlants/MapServer/12) --
not an imagined one. The two properties that matter most: a multi-generator
plant is deduplicated to one record, and capacity_mw is always None (this
source genuinely has no capacity field) rather than silently defaulted to 0
or fabricated from something else.

Run:  python3 -m pytest tests/test_fetch_infrastructure.py -q
"""
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

import fetch_infrastructure as fi  # noqa: E402


def _feature(plant_code, lon, lat, **overrides):
    attrs = {
        "PLANT_CODE": plant_code, "PLANT_NAME": f"Plant {plant_code}",
        "PRIMARY_NAME": f"Plant {plant_code}", "STATE_CODE": "VA",
        "COUNTY_NAME": "Loudoun", "FIPS_CODE": "51107", "STATUS": "OP",
        "OPERATING_YEAR": 2010, "ENERGY_SOURCE_1": "NG", "SECTOR_NAME": "Electric Utility",
    }
    attrs.update(overrides)
    return {"attributes": attrs, "geometry": {"x": lon, "y": lat}}


def test_multi_generator_plant_deduplicated_to_one_record():
    # Real layer is one row per GENERATOR -- a 3-unit plant must collapse
    # to a single power-plant record, not appear 3 times.
    raw = [
        _feature("1001", -77.49, 39.04, GENERATOR_ID="1"),
        _feature("1001", -77.49, 39.04, GENERATOR_ID="2"),
        _feature("1001", -77.49, 39.04, GENERATOR_ID="3"),
        _feature("1002", -77.50, 39.05),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    ids = sorted(r["id"] for r in result)
    assert ids == ["pp-1001", "pp-1002"]


def test_capacity_mw_is_always_none_never_fabricated():
    raw = [_feature("2001", -77.0, 39.0)]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    assert result[0]["capacity_mw"] is None


def test_real_fields_are_mapped_correctly():
    raw = [_feature("3001", -77.1, 39.1, PLANT_NAME="Test Generating Station",
                     ENERGY_SOURCE_1="SUN", STATE_CODE="CA", FIPS_CODE="06073")]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    r = result[0]
    assert r["name"] == "Test Generating Station"
    assert r["fuel_type"] == "SUN"
    assert r["state"] == "CA"
    assert r["county_fips"] == "06073"
    assert r["lon"] == -77.1
    assert r["lat"] == 39.1


def test_records_missing_coordinates_are_skipped_not_zeroed():
    raw = [
        {"attributes": {"PLANT_CODE": "4001", "PLANT_NAME": "No Coords"}, "geometry": {}},
        _feature("4002", -77.2, 39.2),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    assert len(result) == 1
    assert result[0]["id"] == "pp-4002"


def test_empty_upstream_response_returns_empty_list_not_error():
    with patch.object(fi, "_arcgis_paginate", return_value=[]):
        result = fi.fetch_power_plants()
    assert result == []


def test_records_missing_plant_code_are_skipped():
    raw = [
        {"attributes": {"PLANT_NAME": "No Code"}, "geometry": {"x": -77.3, "y": 39.3}},
        _feature("5001", -77.4, 39.4),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    assert len(result) == 1
    assert result[0]["id"] == "pp-5001"
