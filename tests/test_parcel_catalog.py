"""Tests for data/validate_parcel_catalog.py.

Exercises the real, committed data/parcel_source_catalog.json directly (not
a fixture) so CI genuinely validates what's shipped, plus targeted negative
tests against small in-memory fixture dicts to prove specific checks
actually catch the class of bug they're meant to catch.

Run with: pytest tests/test_parcel_catalog.py
"""
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, DATA_DIR)

from validate_parcel_catalog import (  # noqa: E402
    validate, validate_shared_services, load_catalog, load_registry_fips, load_schema_field_ids,
    FRAGILE_FIPS, FORBIDDEN_FIPS, REQUIRED_KEYS, SHARED_SERVICE_REQUIRED_KEYS,
)


def minimal_record(fips, status="production", **overrides):
    rec = {k: None for k in REQUIRED_KEYS}
    rec.update({
        "id": f"test-{fips}",
        "name": f"Test County {fips}",
        "state": "ZZ",
        "fips": fips,
        "facility_count": 1,
        "priority_rank": None,
        "available_fields": [],
        "query_support": True,
        "field_coverage_score": 0,
        "status": status,
        "retry_eligible": False,
        "retry_after_days": None,
        "notes": "",
    })
    rec.update(overrides)
    return rec


# ---------------------------------------------------------------------------
# Real committed catalog
# ---------------------------------------------------------------------------

def test_real_catalog_validates_clean():
    catalog = load_catalog()
    registry_fips = load_registry_fips()
    errors, warnings = validate(catalog, registry_fips)
    assert errors == [], f"real catalog has validation errors: {errors}"


def test_real_catalog_has_no_duplicate_or_forbidden_fips():
    catalog = load_catalog()
    jurisdictions = catalog["jurisdictions"]
    for forbidden in FORBIDDEN_FIPS:
        assert forbidden not in jurisdictions

    # JSON objects can't literally duplicate a key, but every record's own
    # 'fips' field must agree with its key -- this is what would catch a
    # copy-paste record inserted under the wrong key.
    for fips, rec in jurisdictions.items():
        assert rec["fips"] == fips


def test_real_catalog_covers_all_fragile_fips_as_production():
    catalog = load_catalog()
    jurisdictions = catalog["jurisdictions"]
    for fips in FRAGILE_FIPS:
        assert fips in jurisdictions, f"{fips} missing from catalog"
        assert jurisdictions[fips]["status"] == "production"


def test_real_catalog_every_record_has_full_schema():
    catalog = load_catalog()
    for fips, rec in catalog["jurisdictions"].items():
        assert set(rec.keys()) == REQUIRED_KEYS, f"{fips} schema mismatch"


# ---------------------------------------------------------------------------
# Negative tests against small in-memory fixtures
# ---------------------------------------------------------------------------

def test_catches_bad_status_enum():
    catalog = {"meta": {}, "jurisdictions": {"51107": minimal_record("51107", status="bogus")}}
    errors, _ = validate(catalog, ["51107"])
    assert any("not in allowed enum" in e for e in errors)


def test_catches_fips_key_mismatch():
    rec = minimal_record("51107")
    rec["fips"] = "99999"
    catalog = {"meta": {}, "jurisdictions": {"51107": rec}}
    errors, _ = validate(catalog, ["51107"])
    assert any("does not match its object key" in e for e in errors)


def test_catches_forbidden_fips():
    catalog = {"meta": {}, "jurisdictions": {"17999": minimal_record("17999")}}
    errors, _ = validate(catalog, [])
    assert any("17999" in e and "negative control" in e for e in errors)


def test_catches_missing_required_key():
    rec = minimal_record("51107")
    del rec["licensing_notes"]
    catalog = {"meta": {}, "jurisdictions": {"51107": rec}}
    errors, _ = validate(catalog, ["51107"])
    assert any("missing required key" in e for e in errors)


def test_catches_registry_fips_with_no_production_record():
    # registry has 51107, but the catalog doesn't mention it at all
    catalog = {"meta": {}, "jurisdictions": {}}
    errors, _ = validate(catalog, ["51107"])
    assert any("no status=production catalog record" in e for e in errors)


def test_catches_stale_production_record_not_in_registry():
    catalog = {"meta": {}, "jurisdictions": {"51107": minimal_record("51107", status="production")}}
    errors, _ = validate(catalog, [])  # registry no longer has 51107
    assert any("no matching registry.js entry" in e for e in errors)


def test_missing_registry_load_is_a_soft_warning_not_an_error():
    catalog = {"meta": {}, "jurisdictions": {}}
    errors, warnings = validate(catalog, None)
    assert errors == []
    assert any("registry cross-consistency" in w for w in warnings)


def test_repeated_calls_do_not_leak_state():
    # validate() always checks the full FRAGILE_FIPS set regardless of what's
    # passed in, so a "clean" fixture needs all 5 present as production for
    # zero errors -- otherwise a real (correct) error about a genuinely
    # missing fragile FIPS would look like leaked state from the prior call.
    bad_catalog = {"meta": {}, "jurisdictions": {"51107": minimal_record("51107", status="bogus")}}
    good_catalog = {
        "meta": {},
        "jurisdictions": {fips: minimal_record(fips, status="production") for fips in FRAGILE_FIPS},
    }

    errors1, _ = validate(bad_catalog, FRAGILE_FIPS)
    assert len(errors1) >= 1

    errors2, _ = validate(good_catalog, FRAGILE_FIPS)
    assert errors2 == [], f"errors from the previous call leaked into this one: {errors2}"


# ---------------------------------------------------------------------------
# validate_shared_services -- the shared/reusable-service registry
# ---------------------------------------------------------------------------

def minimal_shared_service(service_id, **overrides):
    rec = {
        "service_id": service_id,
        "scope": "statewide",
        "covered_states": ["ZZ"],
        "covered_fips": ["99999"],
        "service_url": "https://example.gov/arcgis/rest/services/Parcels/MapServer/0",
        "layer_id": 0,
        "county_filter_field": "COUNTY",
        "known_filter_values": {"99999": "EXAMPLE"},
        "geometry_type": "polygon",
        "publisher": "Example State GIS",
        "update_frequency": "unknown",
        "canonical_mapping_template": {},
        "attribution_template": {},
        "exclusions": [],
        "known_caveats": "",
        "last_verified": "2026-08-05",
    }
    rec.update(overrides)
    return rec


def test_real_catalog_shared_services_validates_clean():
    catalog = load_catalog()
    registry_fips = load_registry_fips()
    schema_field_ids = load_schema_field_ids()
    errors, _ = validate(catalog, registry_fips, schema_field_ids)
    assert errors == [], f"real catalog shared_services has validation errors: {errors}"


def test_real_catalog_has_shared_services_seeded():
    catalog = load_catalog()
    shared_services = catalog.get("shared_services", {})
    assert "nj-mod-iv-composite" in shared_services
    assert "md-parcelboundaries" in shared_services
    for service_id, rec in shared_services.items():
        assert rec["service_id"] == service_id
        assert set(SHARED_SERVICE_REQUIRED_KEYS).issubset(rec.keys())


def test_shared_services_catches_service_id_key_mismatch():
    rec = minimal_shared_service("my-service")
    rec["service_id"] = "different-id"
    errors, _ = validate_shared_services({"my-service": rec}, {})
    assert any("does not match its object key" in e for e in errors)


def test_shared_services_catches_missing_required_key():
    rec = minimal_shared_service("my-service")
    del rec["geometry_type"]
    errors, _ = validate_shared_services({"my-service": rec}, {})
    assert any("missing required key" in e for e in errors)


def test_shared_services_catches_non_5_digit_fips_in_covered_fips():
    rec = minimal_shared_service("my-service", covered_fips=["123"])
    errors, _ = validate_shared_services({"my-service": rec}, {})
    assert any("not a 5-digit FIPS string" in e for e in errors)


def test_shared_services_catches_known_filter_value_fips_not_in_covered_fips():
    rec = minimal_shared_service("my-service", covered_fips=["99999"], known_filter_values={"88888": "OTHER"})
    errors, _ = validate_shared_services({"my-service": rec}, {})
    assert any("not in covered_fips" in e for e in errors)


def test_shared_services_catches_empty_service_url():
    rec = minimal_shared_service("my-service", service_url="")
    errors, _ = validate_shared_services({"my-service": rec}, {})
    assert any("service_url' is empty" in e for e in errors)


def test_shared_services_warns_on_unrecognized_geometry_type():
    rec = minimal_shared_service("my-service", geometry_type="esriGeometryPolygon")
    _, warnings = validate_shared_services({"my-service": rec}, {})
    assert any("unrecognized" in w and "geometry_type" in w for w in warnings)


def test_shared_services_catches_unknown_canonical_field_in_mapping_template():
    rec = minimal_shared_service("my-service", canonical_mapping_template={"not_a_real_canonical_field": "SRC_FIELD"})
    errors, _ = validate_shared_services({"my-service": rec}, {}, schema_field_ids=["parcel_id", "owner"])
    assert any("unknown canonical field id" in e for e in errors)


def test_shared_services_skips_canonical_field_check_when_schema_field_ids_not_supplied():
    rec = minimal_shared_service("my-service", canonical_mapping_template={"not_a_real_canonical_field": "SRC_FIELD"})
    errors, _ = validate_shared_services({"my-service": rec}, {}, schema_field_ids=None)
    assert not any("unknown canonical field id" in e for e in errors)


def test_shared_services_warns_when_covered_fips_has_no_jurisdiction_record_yet():
    rec = minimal_shared_service("my-service", covered_fips=["99999"])
    _, warnings = validate_shared_services({"my-service": rec}, {})  # empty jurisdictions dict
    assert any("no corresponding jurisdictions record" in w for w in warnings)


def test_shared_services_no_warning_when_covered_fips_matches_a_real_jurisdiction():
    rec = minimal_shared_service("my-service", covered_fips=["99999"])
    _, warnings = validate_shared_services({"my-service": rec}, {"99999": {}})
    assert not any("no corresponding jurisdictions record" in w for w in warnings)


def test_shared_services_valid_record_produces_zero_errors():
    rec = minimal_shared_service("my-service")
    errors, _ = validate_shared_services({"my-service": rec}, {"99999": {}}, schema_field_ids=[])
    assert errors == []
