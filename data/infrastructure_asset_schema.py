#!/usr/bin/env python3
"""data/infrastructure_asset_schema.py — the common infrastructure asset data model.

Every infrastructure category this project touches — substations,
transmission lines, power plants, fiber segments, water/wastewater
facilities, utility territories — has so far been represented as its own
ad-hoc dict shape in data/sample_layers.json, with no shared notion of
provenance or evidence quality. That made it easy for a record to carry an
implicit, unstated confidence ("this is just what the file says") instead
of an explicit one, and gave every new data category its own chance to
reinvent (or skip) the OBSERVED/MODELED/UNKNOWN distinction the platform's
core philosophy requires: unknown is not zero, missing is not false, near
infrastructure does not mean capacity exists.

This module is that shared contract: a base InfrastructureAsset shape every
category's records are checked against, plus a small set of type-specific
extensions for the categories this project currently has (or is about to
build) an ingestion path for.

WHAT THIS MODULE DOES NOT DO
-----------------------------
It does not migrate data/sample_layers.json's existing substation/
transmission/utility-territory records to comply. Those records were
fetched before this schema existed and do not carry a real per-record
source/evidence_tier/last_verified triple — inventing one now would be
exactly the kind of manufactured coverage the project's rules forbid.
data/validate_infrastructure_assets.py instead runs a read-only compliance
report against them, so the gap is documented, not hidden and not
papered over. Every NEW infrastructure record this project ingests from
here forward (Phase 5+: grid intelligence, fiber, water) is expected to
satisfy this schema for real, with a genuine source URL and evidence tier
per record.

JS MIRROR
---------
js/infrastructure/asset-schema.js carries the same enums for browser-side
use (rendering an evidence badge, filtering by asset type). This Python
module is the canonical source; tests/test_infrastructure_asset_schema_sync.mjs
shells out to `python3 -m data.infrastructure_asset_schema --dump-enums` and
diffs the result against the JS file's constants so the two can never
silently drift apart, the same discipline
data/parcel_pipeline/check_registry_integrity.mjs already applies to the
parcel connector-type enum.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from typing import Any, Optional

# ── Vocabulary ──────────────────────────────────────────────────────────
# Categories this project has (or is actively building, per the national
# data foundation phase plan) an ingestion path for. Additional categories
# named in that plan (iso_rto_zone, interconnection_queue_entry, planned_
# generation, planned_transmission, retirement) are intentionally NOT listed
# here yet -- adding a type to this enum without a real field-validation
# rule set below would let a caller "validate" against a type nothing
# actually checks, which is worse than no validation at all. Extend
# ASSET_TYPES and TYPE_SCHEMAS together, never one without the other.
ASSET_TYPES = (
    "substation",
    "transmission_line",
    "power_plant",
    "fiber_segment",
    "water_facility",
    "wastewater_facility",
    "utility_territory",
)

# General-purpose evidence tier for most asset types: is this a directly
# observed fact from an authoritative source, a modeled/derived estimate, or
# genuinely unknown? Never "assumed positive" as a fourth option.
EVIDENCE_TIERS = ("OBSERVED", "MODELED", "UNKNOWN")

# Fiber gets its own, finer-grained evidence vocabulary per the explicit
# requirement that FCC broadband availability is NOT physical fiber
# infrastructure -- collapsing those into generic OBSERVED/MODELED would
# recreate exactly the confusion that requirement exists to prevent.
FIBER_EVIDENCE_TIERS = (
    "KNOWN_ROUTE",
    "APPROXIMATE_ROUTE",
    "SERVICE_AREA",
    "PROVIDER_PRESENCE",
    "BROADBAND_AVAILABILITY",
    "UNKNOWN",
)

GEOMETRY_TYPES = ("Point", "LineString", "Polygon", "MultiPolygon")

STATUS_VALUES = (
    "existing", "planned", "under_construction", "retired", "proposed", "unknown",
)

BASE_REQUIRED_FIELDS = (
    "id", "asset_type", "name", "geometry", "source", "evidence_tier", "last_verified",
)

SOURCE_REQUIRED_FIELDS = ("publisher", "url", "retrieved_at")


@dataclass
class ValidationResult:
    ok: bool
    errors: list = field(default_factory=list)

    def __bool__(self) -> bool:
        return self.ok


def _type_error(path: str, expected: str, value: Any) -> str:
    return f"{path}: expected {expected}, got {type(value).__name__} ({value!r})"


def _validate_geometry(geometry: Any, path: str = "geometry") -> list:
    errors = []
    if not isinstance(geometry, dict):
        return [_type_error(path, "object", geometry)]
    gtype = geometry.get("type")
    if gtype not in GEOMETRY_TYPES:
        errors.append(f"{path}.type: must be one of {GEOMETRY_TYPES}, got {gtype!r}")
    if "coordinates" not in geometry:
        errors.append(f"{path}.coordinates: missing")
    return errors


def _validate_source(source: Any, path: str = "source") -> list:
    errors = []
    if not isinstance(source, dict):
        return [_type_error(path, "object", source)]
    for f in SOURCE_REQUIRED_FIELDS:
        if not source.get(f):
            errors.append(f"{path}.{f}: missing or empty -- a source without a real "
                           f"publisher/url/retrieved_at cannot be trusted; never invent one")
    return errors


# ── Type-specific extensions ───────────────────────────────────────────
# Each entry: required field -> validator(value) -> True/False, plus an
# optional set purely for documentation (not enforced, since an optional
# field's absence is not an error).
def _is_number(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _is_nonempty_str(v: Any) -> bool:
    return isinstance(v, str) and v.strip() != ""


def _is_in(allowed):
    return lambda v: v in allowed


TYPE_SCHEMAS = {
    "substation": {
        "required": {"voltage_kv": _is_number},
        "optional": {"substation_type", "owner"},
    },
    "transmission_line": {
        "required": {"voltage_kv": _is_number},
        "optional": {"owner", "circuit_count"},
    },
    "power_plant": {
        "required": {
            "capacity_mw": _is_number,
            "fuel_type": _is_nonempty_str,
        },
        "optional": {"plant_status"},
    },
    "fiber_segment": {
        # Fiber's evidence tier is the whole point of this type -- it must
        # be present AND drawn from the fiber-specific vocabulary, not the
        # general OBSERVED/MODELED/UNKNOWN one, so a record can never claim
        # "KNOWN_ROUTE" confidence by accident just because it set the base
        # evidence_tier to OBSERVED.
        "required": {"evidence_classification": _is_in(FIBER_EVIDENCE_TIERS)},
        "optional": {"provider"},
    },
    "water_facility": {
        "required": {"facility_type": _is_nonempty_str},
        "optional": {"capacity_mgd"},
    },
    "wastewater_facility": {
        "required": {"facility_type": _is_nonempty_str},
        "optional": {"capacity_mgd"},
    },
    "utility_territory": {
        "required": {
            "utility_name": _is_nonempty_str,
            "fips_list": lambda v: isinstance(v, list) and len(v) > 0,
        },
        "optional": set(),
    },
}


def validate_asset(asset: dict) -> ValidationResult:
    """Validates one asset dict against the base schema plus its type's
    extension. Never raises -- always returns a ValidationResult so a batch
    validator can collect every asset's errors instead of stopping at the
    first bad record."""
    errors: list = []
    if not isinstance(asset, dict):
        return ValidationResult(False, [f"asset must be an object, got {type(asset).__name__}"])

    for f in BASE_REQUIRED_FIELDS:
        if f not in asset or asset[f] in (None, ""):
            errors.append(f"{f}: missing or empty")

    asset_type = asset.get("asset_type")
    if asset_type is not None and asset_type not in ASSET_TYPES:
        errors.append(f"asset_type: must be one of {ASSET_TYPES}, got {asset_type!r}")

    evidence_tier = asset.get("evidence_tier")
    if evidence_tier is not None and evidence_tier not in EVIDENCE_TIERS:
        errors.append(f"evidence_tier: must be one of {EVIDENCE_TIERS}, got {evidence_tier!r}")

    if "geometry" in asset:
        errors.extend(_validate_geometry(asset["geometry"]))
    if "source" in asset:
        errors.extend(_validate_source(asset["source"]))

    status = asset.get("status")
    if status is not None and status not in STATUS_VALUES:
        errors.append(f"status: must be one of {STATUS_VALUES}, got {status!r}")

    if asset_type in TYPE_SCHEMAS:
        for f, check in TYPE_SCHEMAS[asset_type]["required"].items():
            if f not in asset:
                errors.append(f"{f}: required for asset_type={asset_type!r}, missing")
            elif not check(asset[f]):
                errors.append(f"{f}: invalid value for asset_type={asset_type!r}: {asset[f]!r}")

    return ValidationResult(len(errors) == 0, errors)


def validate_collection(assets: list) -> dict:
    """Validates a list of assets. Returns a summary dict rather than raising,
    so a caller (a CI compliance report, a future ingestion pipeline) can
    decide what to do with partial validity instead of losing every result
    to the first bad record."""
    seen_ids: dict = {}
    duplicate_ids = set()
    per_asset_errors = []
    for i, asset in enumerate(assets):
        result = validate_asset(asset)
        if not result.ok:
            per_asset_errors.append({"index": i, "id": asset.get("id") if isinstance(asset, dict) else None,
                                      "errors": result.errors})
        aid = asset.get("id") if isinstance(asset, dict) else None
        if aid is not None:
            if aid in seen_ids:
                duplicate_ids.add(aid)
            seen_ids[aid] = i

    return {
        "total": len(assets),
        "valid": len(assets) - len(per_asset_errors),
        "invalid": len(per_asset_errors),
        "duplicate_ids": sorted(duplicate_ids),
        "errors": per_asset_errors,
    }


def _dump_enums() -> dict:
    return {
        "asset_types": list(ASSET_TYPES),
        "evidence_tiers": list(EVIDENCE_TIERS),
        "fiber_evidence_tiers": list(FIBER_EVIDENCE_TIERS),
        "geometry_types": list(GEOMETRY_TYPES),
        "status_values": list(STATUS_VALUES),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dump-enums", action="store_true",
                         help="print the shared vocabulary as JSON (used by the JS-sync test)")
    args = parser.parse_args()
    if args.dump_enums:
        print(json.dumps(_dump_enums(), indent=2))
        return 0
    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
