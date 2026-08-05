#!/usr/bin/env python3
"""Validate data/parcel_source_catalog.json.

Checks the catalog's own schema (required keys, allowed status enum, FIPS
keying), then cross-checks it against the live js/parcel/registry.js so the
catalog can never silently drift from what's actually shipped: every
registry entry must have a status="production" catalog record, and every
status="production" catalog record must exist in the registry. Also guards
the exact fixture FIPS codes tests/parcel.test.js depends on, so a future
automated catalog rewrite can't silently break the JS test suite without
this Python suite failing too.

Usage:
    python3 data/validate_parcel_catalog.py
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
CATALOG_PATH = ROOT / "data" / "parcel_source_catalog.json"
REGISTRY_PATH = ROOT / "js" / "parcel" / "registry.js"

# The same 5 FIPS tests/parcel.test.js hardcodes as required-present, plus the
# deliberate negative-control FIPS that must never appear anywhere.
FRAGILE_FIPS = ["51107", "51153", "51059", "24031", "24027"]
FORBIDDEN_FIPS = ["17999"]

REQUIRED_KEYS = {
    "id", "name", "state", "fips", "facility_count", "priority_rank",
    "source_scope", "source_type", "service_url", "portal_url",
    "official_publisher", "geometry_type", "query_support", "record_count",
    "available_fields", "geographic_extent", "county_filter_field",
    "county_filter_value", "update_frequency", "licensing_notes",
    "confidence_score", "field_coverage_score", "status", "rejection_reason",
    "last_verified", "retry_eligible", "retry_after_days", "notes",
}

ALLOWED_STATUSES = {
    "production", "candidate", "thin", "blocked", "rejected",
    "temporarily-unavailable", "requires-review",
}

errors = []
warnings = []


def err(msg):
    errors.append(f"  ERROR: {msg}")


def warn(msg):
    warnings.append(f"  WARN:  {msg}")


def validate(catalog, registry_fips):
    """Runs every check against an in-memory catalog dict + a list of live
    registry FIPS codes (or None if the registry couldn't be loaded),
    returning (errors, warnings) freshly each call — the module-level
    accumulators above are reset here so this is safe to call repeatedly
    (e.g. from a test suite) without state leaking between calls."""
    errors.clear()
    warnings.clear()

    meta = catalog.get("meta")
    if not isinstance(meta, dict):
        err("missing or invalid top-level 'meta' object")
    jurisdictions = catalog.get("jurisdictions")
    if not isinstance(jurisdictions, dict):
        err("missing or invalid top-level 'jurisdictions' object")
        jurisdictions = {}

    for fips, rec in jurisdictions.items():
        if not isinstance(fips, str) or len(fips) != 5 or not fips.isdigit():
            err(f"jurisdiction key {fips!r} is not a 5-digit FIPS string")

        missing_keys = REQUIRED_KEYS - set(rec.keys())
        extra_keys = set(rec.keys()) - REQUIRED_KEYS
        if missing_keys:
            err(f"{fips}: missing required key(s): {sorted(missing_keys)}")
        if extra_keys:
            err(f"{fips}: unexpected key(s) not in schema: {sorted(extra_keys)}")

        if rec.get("fips") != fips:
            err(f"{fips}: record's own 'fips' field ({rec.get('fips')!r}) "
                f"does not match its object key")

        status = rec.get("status")
        if status not in ALLOWED_STATUSES:
            err(f"{fips}: status {status!r} not in allowed enum {sorted(ALLOWED_STATUSES)}")

        if status == "blocked" and not rec.get("rejection_reason"):
            warn(f"{fips}: status=blocked but rejection_reason is empty")
        if status == "rejected" and not rec.get("rejection_reason"):
            warn(f"{fips}: status=rejected but rejection_reason is empty")

    for forbidden in FORBIDDEN_FIPS:
        if forbidden in jurisdictions:
            err(f"FIPS {forbidden} must never appear in the catalog "
                f"(reserved as tests/parcel.test.js's negative control)")

    if registry_fips is not None:
        registry_set = set(registry_fips)
        catalog_production = {
            fips for fips, rec in jurisdictions.items() if rec.get("status") == "production"
        }

        missing_from_catalog = registry_set - catalog_production
        if missing_from_catalog:
            err(f"registry.js has {len(missing_from_catalog)} FIPS with no "
                f"status=production catalog record: {sorted(missing_from_catalog)} "
                f"-- run data/parcel_pipeline/seed_catalog_from_registry.mjs")

        stale_production = catalog_production - registry_set
        if stale_production:
            err(f"catalog has {len(stale_production)} status=production record(s) "
                f"with no matching registry.js entry: {sorted(stale_production)} "
                f"-- either re-run the seed script or the status is now wrong")

        for fips in FRAGILE_FIPS:
            if fips not in registry_set:
                err(f"FIPS {fips} is missing from registry.js -- tests/parcel.test.js "
                    f"hardcodes this as required-present")
            rec = jurisdictions.get(fips)
            if not rec or rec.get("status") != "production":
                err(f"FIPS {fips} must have a status=production catalog record "
                    f"(tests/parcel.test.js regression guard)")
    else:
        warn("skipping registry cross-consistency checks -- registry failed to load")

    return list(errors), list(warnings)


def load_catalog():
    if not CATALOG_PATH.exists():
        print(f"FAIL: {CATALOG_PATH} not found")
        sys.exit(1)
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_registry_fips():
    """Loads the live registry.js the same safe way check_parcel_services.mjs
    and the parcel_pipeline/lib loader do (never a hand-duplicated URL list),
    via a tiny Node subprocess that dumps registry.all() FIPS as JSON."""
    script = (
        "const { readFileSync } = require('fs');"
        f"const src = readFileSync({json.dumps(str(REGISTRY_PATH))}, 'utf8');"
        "const w = {}; new Function('window', src)(w);"
        "console.log(JSON.stringify(w.PARCEL_REGISTRY.all().map(j => j.fips)));"
    )
    result = subprocess.run(
        ["node", "-e", script], capture_output=True, text=True, cwd=ROOT
    )
    if result.returncode != 0:
        print(f"  (could not load js/parcel/registry.js via Node: {result.stderr.strip()})")
        return None
    return json.loads(result.stdout)


def main():
    catalog = load_catalog()
    print(f"Validating {CATALOG_PATH.relative_to(ROOT)} ...")

    registry_fips = load_registry_fips()
    found_errors, found_warnings = validate(catalog, registry_fips)

    if found_warnings:
        print("\nWarnings:")
        for w in found_warnings:
            print(w)

    if found_errors:
        print("\nErrors:")
        for e in found_errors:
            print(e)
        print(f"\n  {len(found_errors)} error(s), {len(found_warnings)} warning(s)")
        sys.exit(1)

    jurisdictions = catalog.get("jurisdictions", {})
    print(f"  OK -- {len(jurisdictions)} catalog entries validated "
          f"({len(found_warnings)} warning(s))")


if __name__ == "__main__":
    main()
