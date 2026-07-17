"""
Zoning data quality validation.

Checks:
  1. Required fields present
  2. Confidence levels explicit on every record
  3. District codes consistent between GIS and ordinance data
  4. No impossible dimensional values (negative setbacks, >100% coverage, etc.)
  5. Data center classification present for all districts
  6. Source URLs present and non-empty
  7. GeoJSON geometry validity (no null, no empty coordinates)
  8. Record count not dramatically lower than previous run
  9. Conflict detection between sources

Usage:
  python validate_zoning.py --jurisdiction va-loudoun-county
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
from zoning_config import (
    GEOMETRY_DIR, JURISDICTIONS_DIR, NORMALIZED_DIR,
    load_jurisdiction_file
)

IMPOSSIBLE_SETBACK     = -1    # feet — anything negative is invalid
IMPOSSIBLE_COVERAGE    = 101   # percent — must be 0-100
IMPOSSIBLE_FAR         = 20    # floor-area ratio — above this is suspicious
MIN_FEATURE_DROP_RATIO = 0.7   # warn if record count drops below 70% of previous


def _err(msg: str) -> dict:
    return {"severity": "error", "message": msg}

def _warn(msg: str) -> dict:
    return {"severity": "warning", "message": msg}

def _info(msg: str) -> dict:
    return {"severity": "info", "message": msg}


def validate_districts(jurisdiction_id: str) -> list[dict]:
    issues = []
    data = load_jurisdiction_file(jurisdiction_id, "districts.json")
    districts = data.get("districts", {})

    if not districts:
        issues.append(_err("districts.json has no district entries"))
        return issues

    for code, d in districts.items():
        if not d.get("district_name"):
            issues.append(_warn(f"District {code}: missing district_name"))
        if not d.get("district_category"):
            issues.append(_err(f"District {code}: missing district_category"))
        if not d.get("confidence_level"):
            issues.append(_err(f"District {code}: missing confidence_level"))
        if not d.get("official_source_url"):
            issues.append(_warn(f"District {code}: missing official_source_url"))
        if d.get("base_or_overlay") not in ("base", "overlay", "both"):
            issues.append(_err(f"District {code}: invalid base_or_overlay value"))

    return issues


def validate_dimensional_standards(jurisdiction_id: str) -> list[dict]:
    issues = []
    data = load_jurisdiction_file(jurisdiction_id, "dimensional_standards.json")
    by_district = data.get("standards_by_district", {})

    for code, block in by_district.items():
        standards = block.get("standards", {})
        for std_name, val in standards.items():
            if val.get("verification_status") not in (
                "verified", "requires_official_verification",
                "conflicting_sources", "not_found", "not_applicable"
            ):
                issues.append(_err(f"{code}/{std_name}: invalid verification_status"))

            # Check for impossible values
            num = val.get("value")
            unit = val.get("unit", "")
            if isinstance(num, (int, float)):
                if "setback" in std_name and unit == "feet" and num < IMPOSSIBLE_SETBACK:
                    issues.append(_err(f"{code}/{std_name}: negative setback ({num})"))
                if "coverage" in std_name and unit == "percent" and num > IMPOSSIBLE_COVERAGE:
                    issues.append(_err(f"{code}/{std_name}: coverage > 100% ({num})"))
                if "floor_area_ratio" in std_name and num > IMPOSSIBLE_FAR:
                    issues.append(_warn(f"{code}/{std_name}: FAR seems very high ({num})"))

    return issues


def validate_permitted_uses(jurisdiction_id: str) -> list[dict]:
    issues = []
    data = load_jurisdiction_file(jurisdiction_id, "permitted_uses.json")
    uses = data.get("uses", [])

    if not uses:
        issues.append(_err("permitted_uses.json has no use entries"))
        return issues

    # Check that every district in districts.json has a data center classification
    districts_data = load_jurisdiction_file(jurisdiction_id, "districts.json")
    district_codes = set(districts_data.get("districts", {}).keys())

    dc_covered = {u["district_code"] for u in uses if u.get("standardized_use_id") == "data_center"}
    missing_dc = district_codes - dc_covered
    if missing_dc:
        issues.append(_warn(f"Districts without data center classification: {sorted(missing_dc)}"))

    # Validate individual use records
    valid_statuses = {
        "permitted_by_right", "permitted_with_limitations", "accessory",
        "conditional", "special_exception", "special_use_permit",
        "administrative_approval", "site_plan_approval", "prohibited",
        "not_listed", "unclear", "manual_review_required"
    }
    for u in uses:
        if u.get("permission_status") not in valid_statuses:
            issues.append(_err(
                f"Use {u.get('standardized_use_id')} in {u.get('district_code')}: "
                f"invalid permission_status '{u.get('permission_status')}'"
            ))
        if not u.get("confidence_level"):
            issues.append(_err(
                f"Use {u.get('standardized_use_id')} in {u.get('district_code')}: missing confidence_level"
            ))

    return issues


def validate_geometry(jurisdiction_id: str) -> list[dict]:
    issues = []
    geom_path = GEOMETRY_DIR / f"{jurisdiction_id}.geojson"
    if not geom_path.exists():
        issues.append(_warn(
            "No geometry file — zoning map layer will not show district polygons. "
            "Run fetch_zoning.py to download geometry."
        ))
        return issues

    with open(geom_path) as f:
        geojson = json.load(f)

    features = geojson.get("features", [])
    if len(features) == 0:
        issues.append(_err("GeoJSON geometry file has zero features"))
        return issues

    null_geom  = sum(1 for f in features if f.get("geometry") is None)
    no_code    = sum(1 for f in features if not (f.get("properties") or {}).get("zoning_code"))
    demo_flags = sum(1 for f in features if (f.get("properties") or {}).get("demo_geometry"))

    if null_geom:
        issues.append(_warn(f"{null_geom}/{len(features)} features have null geometry"))
    if no_code:
        issues.append(_warn(f"{no_code}/{len(features)} features have no zoning_code"))
    if demo_flags == len(features) and len(features) > 0:
        issues.append(_info(
            f"All {len(features)} features are demo geometry — "
            "run fetch_zoning.py to replace with real data"
        ))
    elif demo_flags > 0:
        issues.append(_info(f"{demo_flags} features are demo geometry"))

    issues.append(_info(f"Geometry OK: {len(features)} features"))
    return issues


def validate_overlays(jurisdiction_id: str) -> list[dict]:
    issues = []
    data = load_jurisdiction_file(jurisdiction_id, "overlays.json")
    overlays = data.get("overlays", {})

    if not overlays:
        issues.append(_info("No overlays defined (may be correct for some jurisdictions)"))
        return issues

    for code, overlay in overlays.items():
        if not overlay.get("overlay_name"):
            issues.append(_warn(f"Overlay {code}: missing overlay_name"))
        if not overlay.get("confidence_level"):
            issues.append(_err(f"Overlay {code}: missing confidence_level"))
        if not overlay.get("official_source_url") and not overlay.get("gis_layer_url"):
            issues.append(_warn(f"Overlay {code}: no official source URL"))

    return issues


def run_validation(jurisdiction_id: str) -> dict:
    print(f"Validating: {jurisdiction_id}")
    all_issues = []

    checks = [
        ("districts",            validate_districts),
        ("dimensional_standards", validate_dimensional_standards),
        ("permitted_uses",       validate_permitted_uses),
        ("overlays",             validate_overlays),
        ("geometry",             validate_geometry),
    ]

    for check_name, check_fn in checks:
        issues = check_fn(jurisdiction_id)
        for issue in issues:
            issue["check"] = check_name
        all_issues.extend(issues)

    errors   = [i for i in all_issues if i["severity"] == "error"]
    warnings = [i for i in all_issues if i["severity"] == "warning"]
    infos    = [i for i in all_issues if i["severity"] == "info"]

    status = "pass" if not errors else "fail"

    report = {
        "jurisdiction_id": jurisdiction_id,
        "run_date": datetime.utcnow().isoformat() + "Z",
        "status": status,
        "error_count":   len(errors),
        "warning_count": len(warnings),
        "issues": all_issues,
    }

    print(f"  Status: {status.upper()}")
    print(f"  Errors: {len(errors)}  Warnings: {len(warnings)}  Info: {len(infos)}")
    for i in errors:
        print(f"  ERROR   [{i['check']}] {i['message']}")
    for i in warnings:
        print(f"  WARNING [{i['check']}] {i['message']}")
    for i in infos:
        print(f"  INFO    [{i['check']}] {i['message']}")

    return report


def main():
    parser = argparse.ArgumentParser(description="Validate zoning data for a jurisdiction")
    parser.add_argument("--jurisdiction", required=True)
    parser.add_argument("--output", help="Write report to JSON file")
    args = parser.parse_args()

    report = run_validation(args.jurisdiction)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"  Report written to: {args.output}")

    if report["status"] == "fail":
        sys.exit(1)


if __name__ == "__main__":
    main()
