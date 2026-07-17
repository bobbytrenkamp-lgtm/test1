"""
Normalize fetched zoning geometry — join GIS attributes to the structured
district data and produce a clean GeoJSON with canonical field names.

Usage:
  python normalize_zoning.py --jurisdiction va-loudoun-county [--dry-run]
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from zoning_config import (
    GEOMETRY_DIR, JURISDICTIONS_DIR, JURISDICTION_CONFIGS,
    SIMPLIFY_TOLERANCE, load_jurisdiction_file, write_geometry
)

# Canonical GeoJSON property names in normalized output
CANONICAL_FIELDS = {
    "zoning_code":        "zoning_code",
    "zoning_name":        "zoning_name",
    "zoning_category":    "zoning_category",
    "jurisdiction_id":    "jurisdiction_id",
    "dc_eligible":        "dc_eligible",
    "dc_classification":  "dc_classification",
    "confidence_level":   "confidence_level",
    "verified":           "verified",
    "ordinance_url":      "ordinance_url",
}

DC_STATUS_ORDER = [
    "permitted_by_right",
    "permitted_with_limitations",
    "conditional",
    "special_use_permit",
    "unclear",
    "not_listed",
    "prohibited",
]


def map_district_code(raw_code: str, jurisdiction_id: str) -> str:
    """Normalize raw GIS district code to match districts.json keys."""
    cfg = JURISDICTION_CONFIGS.get(jurisdiction_id, {})
    # Try direct lookup first
    return raw_code.strip().upper()


def get_dc_classification(uses: list[dict], district_code: str) -> dict:
    """Extract data center classification for a district from uses list."""
    for use in uses:
        if (use.get("district_code") == district_code
                and use.get("standardized_use_id") == "data_center"):
            return {
                "permission_status": use.get("permission_status", "unclear"),
                "official_use_name": use.get("official_use_name", ""),
                "conditions":        use.get("conditions", []),
                "confidence_level":  use.get("confidence_level", "low"),
                "manual_review":     use.get("manual_review_required", True),
                "notes":             use.get("notes"),
            }
    return {
        "permission_status": "not_listed",
        "official_use_name": "",
        "conditions":        [],
        "confidence_level":  "unavailable",
        "manual_review":     True,
        "notes":             "Data center use not found in this pilot dataset",
    }


def normalize_geometry_for_jurisdiction(jurisdiction_id: str, dry_run: bool = False) -> dict | None:
    geom_path = GEOMETRY_DIR / f"{jurisdiction_id}.geojson"
    if not geom_path.exists():
        print(f"  No geometry file found at {geom_path}")
        print("  Run fetch_zoning.py first")
        return None

    print(f"  Loading geometry: {geom_path}")
    with open(geom_path) as f:
        raw_geojson = json.load(f)

    # Load structured data
    districts_data = load_jurisdiction_file(jurisdiction_id, "districts.json")
    uses_data      = load_jurisdiction_file(jurisdiction_id, "permitted_uses.json")
    jurisdiction   = load_jurisdiction_file(jurisdiction_id, "jurisdiction.json")

    districts = districts_data.get("districts", {})
    uses      = uses_data.get("uses", [])

    cfg = JURISDICTION_CONFIGS.get(jurisdiction_id, {})
    code_field = cfg.get("district_code_field", "ZONING")
    name_field = cfg.get("district_name_field", "ZONING_DESC")

    normalized_features = []
    unknown_codes = set()

    for feature in raw_geojson.get("features", []):
        props = feature.get("properties") or {}
        raw_code = props.get(code_field) or props.get("ZONING") or props.get("zoning") or ""
        normalized_code = map_district_code(raw_code, jurisdiction_id)

        district = districts.get(normalized_code, {})
        dc_class = get_dc_classification(uses, normalized_code)

        if not district:
            unknown_codes.add(normalized_code)

        new_props = {
            "jurisdiction_id":   jurisdiction_id,
            "zoning_code":       normalized_code,
            "original_code":     raw_code,
            "zoning_name":       district.get("district_name") or props.get(name_field, ""),
            "zoning_category":   district.get("district_category", "unclassified"),
            "zoning_description":district.get("district_description", ""),
            "dc_eligible":       dc_class["permission_status"] in (
                                     "permitted_by_right",
                                     "permitted_with_limitations",
                                     "conditional",
                                     "special_use_permit",
                                 ),
            "dc_classification": dc_class["permission_status"],
            "dc_official_use_name": dc_class["official_use_name"],
            "dc_conditions":     dc_class["conditions"],
            "dc_confidence":     dc_class["confidence_level"],
            "dc_manual_review":  dc_class["manual_review"],
            "confidence_level":  district.get("confidence_level", "low"),
            "ordinance_url":     district.get("official_source_url", jurisdiction.get("official_ordinance_url")),
            "dc_eligibility_summary": district.get("dc_eligibility_summary"),
        }

        normalized_features.append({
            "type":       "Feature",
            "geometry":   feature.get("geometry"),
            "properties": new_props,
        })

    if unknown_codes:
        print(f"  Unknown district codes (not in districts.json): {sorted(unknown_codes)}")
        print("  Add these to jurisdictions/{id}/districts.json to get full detail")

    result = {
        "type": "FeatureCollection",
        "features": normalized_features,
        "jurisdiction_id": jurisdiction_id,
        "normalized": True,
    }

    if dry_run:
        print(f"  [dry-run] Would write {len(normalized_features)} normalized features")
        return result

    out_path = write_geometry(jurisdiction_id, result)
    print(f"  Wrote normalized geometry: {out_path} ({len(normalized_features)} features)")
    return result


def main():
    parser = argparse.ArgumentParser(description="Normalize zoning geometry for a jurisdiction")
    parser.add_argument("--jurisdiction", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"Normalizing: {args.jurisdiction}")
    normalize_geometry_for_jurisdiction(args.jurisdiction, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
