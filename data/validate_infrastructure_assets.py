#!/usr/bin/env python3
"""data/validate_infrastructure_assets.py — infrastructure schema compliance report.

Runs every infrastructure-shaped category already in data/sample_layers.json
through data/infrastructure_asset_schema.py's validator and writes an honest
compliance report to data/infrastructure_asset_compliance.json.

This is deliberately a REPORT, not a gate: the existing power_infrastructure/
transmission_lines/utility_territories/fiber_network records were fetched
before the shared schema existed and do not carry a real per-record source/
evidence_tier/last_verified triple. Failing compliance today is the honest,
expected state -- inventing those fields to make old records "pass" would be
exactly the manufactured-coverage failure mode this project's rules forbid.
The report exists so that gap is documented and trackable over time (ratio
should only go up as Phase 5+ ingestion replaces these categories with
schema-compliant records), never hidden.

Usage:
    python3 data/validate_infrastructure_assets.py            # regenerate the report
    python3 data/validate_infrastructure_assets.py --check    # staleness gate (CI)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SAMPLE_LAYERS_PATH = ROOT / "data" / "sample_layers.json"
REPORT_PATH = ROOT / "data" / "infrastructure_asset_compliance.json"

sys.path.insert(0, str(ROOT))
from data.infrastructure_asset_schema import validate_collection  # noqa: E402

# Maps a data/sample_layers.json top-level key to the asset_type its records
# should eventually carry, plus a pure best-effort adapter that reshapes the
# EXISTING record into the new schema's field names -- filling in only what
# the old record genuinely already has, never inventing a value the old
# shape doesn't carry (a missing source/evidence_tier stays missing, and is
# reported as a compliance gap, not silently defaulted).
def _adapt_substation(rec: dict) -> dict:
    out = dict(rec)
    out["asset_type"] = "substation"
    if "lon" in rec and "lat" in rec:
        out["geometry"] = {"type": "Point", "coordinates": [rec["lon"], rec["lat"]]}
    return out


def _adapt_transmission_line(rec: dict) -> dict:
    out = dict(rec)
    out["asset_type"] = "transmission_line"
    if "path" in rec:
        out["geometry"] = {"type": "LineString", "coordinates": rec["path"]}
    return out


def _adapt_utility_territory(rec: dict) -> dict:
    out = dict(rec)
    out["asset_type"] = "utility_territory"
    out["utility_name"] = rec.get("name")
    return out


def _adapt_fiber_segment(rec: dict) -> dict:
    out = dict(rec)
    out["asset_type"] = "fiber_segment"
    if "path" in rec:
        out["geometry"] = {"type": "LineString", "coordinates": rec["path"]}
    return out


CATEGORY_ADAPTERS = {
    "power_infrastructure": ("substation", _adapt_substation),
    "transmission_lines": ("transmission_line", _adapt_transmission_line),
    "utility_territories": ("utility_territory", _adapt_utility_territory),
    "fiber_network": ("fiber_segment", _adapt_fiber_segment),
}


def build_report() -> dict:
    layers = json.loads(SAMPLE_LAYERS_PATH.read_text())
    categories = {}
    for category, (asset_type, adapter) in CATEGORY_ADAPTERS.items():
        records = layers.get(category) or []
        adapted = [adapter(r) for r in records if isinstance(r, dict)]
        summary = validate_collection(adapted)
        # Tally the most common missing-field reasons so the report is
        # actionable ("every substation is missing source/evidence_tier"),
        # not just a bare pass/fail count.
        missing_field_counts: dict = {}
        for e in summary["errors"]:
            for msg in e["errors"]:
                field_name = msg.split(":", 1)[0]
                missing_field_counts[field_name] = missing_field_counts.get(field_name, 0) + 1
        categories[category] = {
            "asset_type": asset_type,
            "total": summary["total"],
            "schema_compliant": summary["valid"],
            "non_compliant": summary["invalid"],
            "duplicate_ids": summary["duplicate_ids"],
            "most_common_gaps": sorted(
                ({"field": f, "count": c} for f, c in missing_field_counts.items()),
                key=lambda x: (-x["count"], x["field"]),
            ),
        }

    return {
        "_meta": {
            "description": (
                "Compliance report: how many existing infrastructure records in "
                "data/sample_layers.json satisfy data/infrastructure_asset_schema.py's "
                "InfrastructureAsset contract. Low/zero compliance today is expected and "
                "honest -- these records predate the schema and were never assigned a "
                "real per-record source/evidence_tier. This is a report, not a gate."
            ),
            "generator": "data/validate_infrastructure_assets.py",
        },
        "categories": categories,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                         help="fail if the committed report is stale relative to sample_layers.json")
    args = parser.parse_args()

    report = build_report()
    fresh = json.dumps(report, indent=2, sort_keys=True) + "\n"

    if args.check:
        if not REPORT_PATH.exists():
            print(f"ERROR: {REPORT_PATH} does not exist. Run without --check to generate it.")
            return 1
        current = REPORT_PATH.read_text()
        if current != fresh:
            print(f"ERROR: {REPORT_PATH} is stale. Run 'python3 {Path(__file__).name}' and commit the result.")
            return 1
        print("OK: infrastructure asset compliance report is up to date.")
        return 0

    REPORT_PATH.write_text(fresh)
    print(f"Wrote {REPORT_PATH}")
    for category, c in report["categories"].items():
        print(f"  {category}: {c['schema_compliant']}/{c['total']} schema-compliant")
    return 0


if __name__ == "__main__":
    sys.exit(main())
