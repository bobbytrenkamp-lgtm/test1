"""
Export normalized jurisdiction data to the frontend-ready combined JSON.

Merges districts, dimensional_standards, permitted_uses, and overlays
into a single data/zoning/normalized/{jurisdiction_id}.json file that
the frontend (zoning.js) loads on demand.

Usage:
  python export_zoning.py --jurisdiction va-loudoun-county [--dry-run]
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from zoning_config import (
    load_jurisdiction_file, write_normalized, DISCLAIMER, GEOMETRY_DIR
)


def build_district_dc_analysis(district_code: str, uses: list[dict],
                                overlays: dict) -> dict:
    """Build the data-center eligibility analysis for one district."""
    dc_use = next(
        (u for u in uses
         if u.get("district_code") == district_code
         and u.get("standardized_use_id") == "data_center"),
        None
    )

    base_status = dc_use["permission_status"] if dc_use else "not_listed"
    confidence  = dc_use["confidence_level"]  if dc_use else "unavailable"

    analysis = {
        "base_zoning_status":    base_status,
        "official_use_name":     dc_use["official_use_name"] if dc_use else "",
        "approval_type":         dc_use.get("approval_type") if dc_use else None,
        "conditions":            dc_use["conditions"] if dc_use else [],
        "confidence_level":      confidence,
        "manual_review_required":dc_use["manual_review_required"] if dc_use else True,
        "notes":                 dc_use.get("notes") if dc_use else None,
        "applicable_overlays":   [],
        "overall_assessment":    None,
    }

    # Note which overlays may apply (all overlays in this jurisdiction potentially
    # apply to all districts — precise overlay intersection requires GIS geometry)
    for ov_code, ov in overlays.items():
        analysis["applicable_overlays"].append({
            "overlay_code": ov_code,
            "overlay_name": ov.get("overlay_name", ""),
            "what_it_affects": ov.get("what_it_affects", []),
            "confidence_level": ov.get("confidence_level", "low"),
            "note": "Overlay applicability to a specific parcel requires GIS boundary verification",
        })

    # Overall assessment
    eligible_statuses = {
        "permitted_by_right",
        "permitted_with_limitations",
        "conditional",
        "special_use_permit",
    }
    if base_status in eligible_statuses:
        assessment = "potentially_eligible"
    elif base_status == "prohibited":
        assessment = "not_eligible"
    elif base_status in ("not_listed", "unclear"):
        assessment = "unclear"
    else:
        assessment = "requires_review"

    analysis["overall_assessment"] = assessment
    return analysis


def export_jurisdiction(jurisdiction_id: str, dry_run: bool = False) -> dict:
    print(f"Exporting: {jurisdiction_id}")

    jurisdiction    = load_jurisdiction_file(jurisdiction_id, "jurisdiction.json")
    districts_data  = load_jurisdiction_file(jurisdiction_id, "districts.json")
    standards_data  = load_jurisdiction_file(jurisdiction_id, "dimensional_standards.json")
    uses_data       = load_jurisdiction_file(jurisdiction_id, "permitted_uses.json")
    overlays_data   = load_jurisdiction_file(jurisdiction_id, "overlays.json")
    validation      = load_jurisdiction_file(jurisdiction_id, "validation_report.json")

    uses     = uses_data.get("uses", [])
    overlays = overlays_data.get("overlays", {})

    # Build merged district records
    merged_districts = {}
    for code, district in districts_data.get("districts", {}).items():
        standards_block = (
            standards_data.get("standards_by_district", {}).get(code, {})
        )

        # Uses for this district
        district_uses = [u for u in uses if u.get("district_code") == code]

        # DC analysis
        dc_analysis = build_district_dc_analysis(code, uses, overlays)

        merged_districts[code] = {
            **district,
            "standards":    standards_block.get("standards", {}),
            "conditional_rules": standards_block.get("conditional_rules", []),
            "standards_confidence":   standards_block.get("confidence_level", "unavailable"),
            "standards_source":       standards_block.get("source_url"),
            "standards_source_section": standards_block.get("source_section"),
            "uses":         district_uses,
            "dc_analysis":  dc_analysis,
        }

    has_geometry = (GEOMETRY_DIR / f"{jurisdiction_id}.geojson").exists()

    normalized = {
        "jurisdiction_id": jurisdiction_id,
        "exported_at":     datetime.utcnow().isoformat() + "Z",
        "disclaimer":      DISCLAIMER,
        "jurisdiction":    jurisdiction,
        "districts":       merged_districts,
        "overlays":        overlays,
        "geometry_available": has_geometry,
        "validation_summary": {
            "status":        validation.get("overall_status"),
            "warnings":      validation.get("warnings", []),
            "required_actions": validation.get("required_actions", []),
        },
    }

    if dry_run:
        print(f"  [dry-run] Would export {len(merged_districts)} districts")
        return normalized

    out_path = write_normalized(jurisdiction_id, normalized)
    print(f"  Exported to: {out_path}")
    print(f"  Districts: {len(merged_districts)}")
    print(f"  Has geometry: {has_geometry}")
    return normalized


def main():
    parser = argparse.ArgumentParser(description="Export jurisdiction to normalized JSON")
    parser.add_argument("--jurisdiction", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    export_jurisdiction(args.jurisdiction, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
