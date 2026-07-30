#!/usr/bin/env python3
"""Build data/facilities_index.json — the slim facility file the browser loads.

WHY THIS EXISTS
facilities_master.json is the authoritative record and has grown past 4.4 MB
(5.7 MB on disk pretty-printed). The Pipeline tab and the Jurisdiction page were
downloading all of it just to render a table, a map, and a detail panel, none of
which touch the provenance and bookkeeping fields that make up most of the bulk.

This emits only the fields the UI actually references, minified, cutting the
download by roughly two thirds. The master file is never modified — it stays the
source of truth for the pipeline and for any analysis.

KEEPING THE FIELD LIST HONEST
UI_FIELDS below must cover every field the frontend reads. --check re-derives the
list from the JS source and fails if the two have drifted, so adding a field to a
template without adding it here is caught in CI rather than silently rendering
blank.

Usage:
    python3 data/build_facilities_index.py [--check]

    --check   verify the index is current and covers every field the UI reads
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
MASTER = ROOT / "data" / "facilities_master.json"
INDEX = ROOT / "data" / "facilities_index.json"
JS_SOURCES = [ROOT / "js" / "pipeline.js", ROOT / "js" / "jurisdiction.js"]

# Every field the frontend renders. Ordered roughly as the UI uses them.
UI_FIELDS = [
    "facility_id",
    "name", "operator", "owner", "parent_company",
    "city", "county", "county_fips", "state", "state_abbr",
    "latitude", "longitude",
    "operational_status", "facility_type",
    "is_hyperscale", "is_colocation", "is_enterprise", "is_edge",
    "capacity_mw_known", "capacity_mw_planned", "campus_total_mw",
    "building_sqft", "land_area_acres",
    "cooling_method", "power_utility", "water_utility",
    "operational_date", "construction_date", "planned_date",
    "last_verified_date", "confidence_score", "confidence_tier",
    "primary_source",
]


def load_master():
    with open(MASTER, encoding="utf-8") as f:
        return json.load(f)


def fields_referenced_in_js(master_keys):
    """Re-derive which record fields the JS actually touches, so the curated
    list above cannot silently fall behind the templates."""
    src = "".join(p.read_text(encoding="utf-8") for p in JS_SOURCES if p.exists())
    # Facility records are bound to d / f / r in the render paths.
    found = set()
    for var in ("d", "f", "r"):
        found |= set(re.findall(rf"\b{var}\.([a-zA-Z_][a-zA-Z_0-9]*)", src))
    return {k for k in found if k in master_keys}


def build(records):
    out = []
    for rec in records:
        slim = {}
        for k in UI_FIELDS:
            v = rec.get(k)
            # Drop empties — they are the JSON's single biggest source of bulk
            # and the UI already treats missing and empty identically.
            if v is None or v == "" or v == [] or v == {}:
                continue
            slim[k] = v
        out.append(slim)
    return out


def main():
    check_only = "--check" in sys.argv

    if not MASTER.exists():
        print(f"FAIL: {MASTER} not found")
        return 1

    records = load_master()
    if not isinstance(records, list):
        print("FAIL: facilities_master.json is not a list")
        return 1

    master_keys = {k for r in records for k in r}

    # Guard: the curated list must cover everything the JS reads.
    referenced = fields_referenced_in_js(master_keys)
    missing = sorted(referenced - set(UI_FIELDS))
    if missing:
        print("FAIL: the UI reads fields the index does not include:")
        for m in missing:
            print(f"  - {m}")
        print("Add them to UI_FIELDS in this script, then rebuild.")
        return 1

    index = build(records)
    payload = json.dumps(index, separators=(",", ":"), ensure_ascii=False)

    if check_only:
        if not INDEX.exists():
            print("FAIL: facilities_index.json is missing — run this script")
            return 1
        if INDEX.read_text(encoding="utf-8") != payload:
            print("FAIL: facilities_index.json is stale — run this script")
            return 1
        print(f"facilities_index.json is up to date ({len(index)} records)")
        return 0

    INDEX.write_text(payload, encoding="utf-8")

    master_bytes = MASTER.stat().st_size
    index_bytes = INDEX.stat().st_size
    print(f"facilities_index.json written: {len(index)} records")
    print(f"  master {master_bytes/1024/1024:.2f} MB -> index {index_bytes/1024/1024:.2f} MB "
          f"({100 - index_bytes / master_bytes * 100:.0f}% smaller)")
    print(f"  fields kept: {len(UI_FIELDS)} of {len(master_keys)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
