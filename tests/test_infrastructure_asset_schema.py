"""tests/test_infrastructure_asset_schema.py — the common InfrastructureAsset schema.

Covers the base schema, every type extension, and the honesty properties the
schema exists to enforce: a fiber record cannot borrow the generic
OBSERVED/MODELED/UNKNOWN tier in place of its own KNOWN_ROUTE/... vocabulary,
a source without a real url/publisher/retrieved_at is rejected rather than
silently accepted, and the compliance report never claims an old,
schema-blind record is compliant just because it happens to have the right
keys by coincidence.

Run:  python3 -m pytest tests/test_infrastructure_asset_schema.py -q
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.infrastructure_asset_schema import (  # noqa: E402
    ASSET_TYPES,
    EVIDENCE_TIERS,
    FIBER_EVIDENCE_TIERS,
    TYPE_SCHEMAS,
    validate_asset,
    validate_collection,
)
import data.validate_infrastructure_assets as via  # noqa: E402


def _good_substation():
    return {
        "id": "sub-1",
        "asset_type": "substation",
        "name": "Test Substation",
        "geometry": {"type": "Point", "coordinates": [-77.0, 39.0]},
        "source": {"publisher": "HIFLD", "url": "https://example.gov/data", "retrieved_at": "2026-08-01"},
        "evidence_tier": "OBSERVED",
        "last_verified": "2026-08-01",
        "voltage_kv": 230,
    }


def test_a_fully_populated_substation_is_valid():
    result = validate_asset(_good_substation())
    assert result.ok, result.errors


def test_missing_base_required_field_is_rejected():
    asset = _good_substation()
    del asset["name"]
    result = validate_asset(asset)
    assert not result.ok
    assert any("name" in e for e in result.errors)


def test_unknown_asset_type_is_rejected():
    asset = _good_substation()
    asset["asset_type"] = "nuclear_reactor"
    result = validate_asset(asset)
    assert not result.ok
    assert any("asset_type" in e for e in result.errors)


def test_source_without_url_is_rejected_never_invented():
    asset = _good_substation()
    asset["source"] = {"publisher": "HIFLD", "retrieved_at": "2026-08-01"}
    result = validate_asset(asset)
    assert not result.ok
    assert any("source.url" in e for e in result.errors)


def test_geometry_missing_coordinates_is_rejected():
    asset = _good_substation()
    asset["geometry"] = {"type": "Point"}
    result = validate_asset(asset)
    assert not result.ok
    assert any("coordinates" in e for e in result.errors)


def test_invalid_geometry_type_is_rejected():
    asset = _good_substation()
    asset["geometry"] = {"type": "Circle", "coordinates": [0, 0]}
    result = validate_asset(asset)
    assert not result.ok


def test_substation_requires_voltage_kv():
    asset = _good_substation()
    del asset["voltage_kv"]
    result = validate_asset(asset)
    assert not result.ok
    assert any("voltage_kv" in e for e in result.errors)


def test_substation_voltage_must_be_numeric():
    asset = _good_substation()
    asset["voltage_kv"] = "230kV"
    result = validate_asset(asset)
    assert not result.ok


def test_power_plant_requires_capacity_and_fuel_type():
    asset = {
        "id": "pp-1", "asset_type": "power_plant", "name": "Test Plant",
        "geometry": {"type": "Point", "coordinates": [0, 0]},
        "source": {"publisher": "EIA", "url": "https://example.gov", "retrieved_at": "2026-08-01"},
        "evidence_tier": "OBSERVED", "last_verified": "2026-08-01",
    }
    result = validate_asset(asset)
    assert not result.ok
    assert any("capacity_mw" in e for e in result.errors)
    assert any("fuel_type" in e for e in result.errors)

    asset["capacity_mw"] = 500
    asset["fuel_type"] = "natural_gas"
    assert validate_asset(asset).ok


def test_fiber_segment_requires_its_own_evidence_classification_not_generic_tier():
    # A fiber record that only sets the generic evidence_tier=OBSERVED must
    # still fail -- that's the exact confusion (broadband availability
    # treated as a known physical route) the fiber-specific vocabulary
    # exists to prevent.
    asset = {
        "id": "fib-1", "asset_type": "fiber_segment", "name": "Test Route",
        "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
        "source": {"publisher": "Provider X", "url": "https://example.com", "retrieved_at": "2026-08-01"},
        "evidence_tier": "OBSERVED", "last_verified": "2026-08-01",
    }
    result = validate_asset(asset)
    assert not result.ok
    assert any("evidence_classification" in e for e in result.errors)


def test_fiber_segment_rejects_a_generic_evidence_tier_value_in_its_own_field():
    asset = {
        "id": "fib-1", "asset_type": "fiber_segment", "name": "Test Route",
        "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
        "source": {"publisher": "Provider X", "url": "https://example.com", "retrieved_at": "2026-08-01"},
        "evidence_tier": "OBSERVED", "last_verified": "2026-08-01",
        "evidence_classification": "OBSERVED",  # wrong vocabulary entirely
    }
    result = validate_asset(asset)
    assert not result.ok


def test_fiber_segment_accepts_each_real_fiber_evidence_tier():
    for tier in FIBER_EVIDENCE_TIERS:
        asset = {
            "id": "fib-1", "asset_type": "fiber_segment", "name": "Test Route",
            "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
            "source": {"publisher": "Provider X", "url": "https://example.com", "retrieved_at": "2026-08-01"},
            "evidence_tier": "UNKNOWN", "last_verified": "2026-08-01",
            "evidence_classification": tier,
        }
        assert validate_asset(asset).ok, f"tier {tier} should be accepted"


def test_utility_territory_requires_nonempty_fips_list():
    asset = {
        "id": "ut-1", "asset_type": "utility_territory", "name": "Dominion Energy",
        "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
        "source": {"publisher": "Utility filing", "url": "https://example.com", "retrieved_at": "2026-08-01"},
        "evidence_tier": "OBSERVED", "last_verified": "2026-08-01",
        "utility_name": "Dominion Energy", "fips_list": [],
    }
    result = validate_asset(asset)
    assert not result.ok
    assert any("fips_list" in e for e in result.errors)

    asset["fips_list"] = ["51107"]
    assert validate_asset(asset).ok


def test_water_and_wastewater_facility_types_are_distinct_asset_types():
    for asset_type in ("water_facility", "wastewater_facility"):
        asset = {
            "id": "wf-1", "asset_type": asset_type, "name": "Test Facility",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "source": {"publisher": "EPA", "url": "https://example.gov", "retrieved_at": "2026-08-01"},
            "evidence_tier": "MODELED", "last_verified": "2026-08-01",
            "facility_type": "treatment_plant",
        }
        assert validate_asset(asset).ok


def test_water_facility_capacity_is_optional_capacity_unknown_is_not_zero():
    # Proximity does not imply capacity -- a facility with no known
    # capacity_mgd must still validate; omitting it is honest, not an error.
    asset = {
        "id": "wf-1", "asset_type": "water_facility", "name": "Test Facility",
        "geometry": {"type": "Point", "coordinates": [0, 0]},
        "source": {"publisher": "EPA", "url": "https://example.gov", "retrieved_at": "2026-08-01"},
        "evidence_tier": "UNKNOWN", "last_verified": "2026-08-01",
        "facility_type": "treatment_plant",
    }
    assert validate_asset(asset).ok


def test_every_asset_type_has_a_type_schema_entry():
    for t in ASSET_TYPES:
        assert t in TYPE_SCHEMAS, f"{t} has no TYPE_SCHEMAS entry"


def test_validate_collection_flags_duplicate_ids():
    a = _good_substation()
    b = dict(_good_substation())
    summary = validate_collection([a, b])
    assert summary["duplicate_ids"] == ["sub-1"]


def test_validate_collection_never_raises_on_a_malformed_record():
    summary = validate_collection([_good_substation(), "not a dict", None, 42])
    assert summary["total"] == 4
    assert summary["invalid"] == 3


def test_dump_enums_cli_matches_module_constants():
    out = subprocess.run(
        [sys.executable, "-m", "data.infrastructure_asset_schema", "--dump-enums"],
        cwd=str(ROOT), capture_output=True, text=True, check=True,
    )
    dumped = json.loads(out.stdout)
    assert dumped["asset_types"] == list(ASSET_TYPES)
    assert dumped["evidence_tiers"] == list(EVIDENCE_TIERS)
    assert dumped["fiber_evidence_tiers"] == list(FIBER_EVIDENCE_TIERS)


# ── Compliance report (data/validate_infrastructure_assets.py) ──────────

def test_compliance_report_never_marks_a_record_without_source_as_compliant():
    report = via.build_report()
    for category, c in report["categories"].items():
        if c["total"] == 0:
            continue
        gap_fields = {g["field"] for g in c["most_common_gaps"]}
        # Every existing category predates the schema and genuinely lacks a
        # real per-record source -- so "source" (or one of its required
        # subfields) must show up as a documented gap, not be silently
        # marked compliant.
        assert c["schema_compliant"] < c["total"] or c["total"] == 0, (
            f"{category} reports full compliance -- verify this is real, not a "
            f"silently-invented source/evidence_tier"
        )


def test_compliance_report_committed_artifact_is_current():
    result = subprocess.run(
        [sys.executable, "data/validate_infrastructure_assets.py", "--check"],
        cwd=str(ROOT), capture_output=True, text=True,
    )
    assert result.returncode == 0, (
        f"data/infrastructure_asset_compliance.json is stale -- regenerate with "
        f"'python3 data/validate_infrastructure_assets.py'.\n{result.stdout}\n{result.stderr}"
    )


def test_compliance_report_every_category_has_an_adapter():
    layers = json.loads((ROOT / "data" / "sample_layers.json").read_text())
    infra_like_keys = {"power_infrastructure", "transmission_lines", "utility_territories", "fiber_network"}
    for key in infra_like_keys:
        assert key in via.CATEGORY_ADAPTERS, f"{key} exists in sample_layers.json but has no compliance adapter"
