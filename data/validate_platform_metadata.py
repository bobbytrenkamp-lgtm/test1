#!/usr/bin/env python3
"""Validate data/platform_metadata.json against live data files.

Checks that the statistics in platform_metadata.json match what is actually
in the data files. Run after any data update to catch stale numbers.

Usage:
    python3 data/validate_platform_metadata.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
META_PATH        = ROOT / "data" / "platform_metadata.json"
MAP_DATA_PATH    = ROOT / "data" / "map_data.json"
FACILITIES_PATH  = ROOT / "data" / "facilities_master.json"
AI_COMPANIES_PATH = ROOT / "data" / "ai_companies.json"

errors = []
warnings = []


def err(msg):
    errors.append(f"  ERROR: {msg}")


def warn(msg):
    warnings.append(f"  WARN:  {msg}")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# Load metadata
if not META_PATH.exists():
    print(f"FAIL: {META_PATH} not found")
    sys.exit(1)

meta  = load(META_PATH)
cov   = meta.get("coverage", {})
fresh = meta.get("freshness", {})

print(f"Validating {META_PATH.relative_to(ROOT)} ...")

# Schema key checks
required_keys = ["_schema", "coverage", "freshness", "data_quality", "disclaimers"]
for k in required_keys:
    if k not in meta:
        err(f"Missing top-level key: {k}")

required_coverage = [
    "total_us_counties", "counties_in_database", "counties_coverage_pct",
    "counties_with_active_restrictions", "counties_with_bans",
    "counties_with_high_restrictions", "counties_with_moderate_restrictions",
    "counties_with_proposed_restrictions", "counties_pro_development",
    "counties_not_yet_researched", "states_total", "states_in_database",
    "states_with_active_restrictions",
]
for k in required_coverage:
    if k not in cov:
        err(f"Missing coverage key: {k}")

required_freshness = [
    "policy_data_through", "facilities_total", "facilities_operational",
    "facilities_planned", "ai_companies_public", "ai_companies_private",
]
for k in required_freshness:
    if k not in fresh:
        err(f"Missing freshness key: {k}")

# Cross-check map_data.json (county records)
if MAP_DATA_PATH.exists():
    raw_map = load(MAP_DATA_PATH)
    counties = raw_map.get("counties", raw_map) if isinstance(raw_map, dict) and "counties" in raw_map else raw_map
    if isinstance(counties, dict):
        actual_in_db = len(counties)
        meta_in_db   = cov.get("counties_in_database", 0)
        if actual_in_db != meta_in_db:
            err(f"counties_in_database: metadata says {meta_in_db}, "
                f"but map_data.json has {actual_in_db} records")

        level_counts = {}
        for v in counties.values():
            lvl = v.get("level", 0)
            level_counts[lvl] = level_counts.get(lvl, 0) + 1

        actual_bans = level_counts.get(4, 0)
        actual_high = level_counts.get(3, 0)
        actual_mod  = level_counts.get(2, 0)
        actual_prop = level_counts.get(1, 0)
        actual_pro  = level_counts.get(-1, 0)

        # research_status=descriptive_only records hold a county description but
        # no policy research was ever done — counting them as "researched" is the
        # exact overstatement (1,467 vs the true 870) that refresh_platform_metadata.py
        # excludes and js/constants.js's researchedCount() exists to prevent on the
        # frontend. This validator must use the same excluding definition, not
        # actual_in_db, wherever the word "researched" appears below.
        actual_descriptive = sum(1 for v in counties.values()
                                  if v.get("research_status") == "descriptive_only")
        actual_researched = actual_in_db - actual_descriptive

        for field, actual, label in [
            ("counties_with_bans",                actual_bans, "level 4 (ban)"),
            ("counties_with_high_restrictions",   actual_high, "level 3 (high)"),
            ("counties_with_moderate_restrictions", actual_mod, "level 2 (moderate)"),
            ("counties_with_proposed_restrictions", actual_prop, "level 1 (proposed)"),
            ("counties_pro_development",           actual_pro, "level -1 (pro)"),
            ("counties_descriptive_only",          actual_descriptive, "research_status=descriptive_only"),
            ("counties_researched",                actual_researched, "in_database minus descriptive_only"),
        ]:
            meta_val = cov.get(field, 0)
            if meta_val != actual:
                warn(f"{field}: metadata={meta_val}, actual {label}={actual}")

        actual_active = actual_bans + actual_high + actual_mod + actual_prop
        meta_active   = cov.get("counties_with_active_restrictions", 0)
        if meta_active != actual_active:
            warn(f"counties_with_active_restrictions: metadata={meta_active}, "
                 f"computed={actual_active}")

        total_us = cov.get("total_us_counties", 3143)
        # Not "total_us - actual_in_db": this field is defined against the
        # researched count (see above), not raw in-database. Using in_db here
        # under-reports "not yet researched" by exactly the 597 descriptive_only
        # records — this validator disagreeing with refresh_platform_metadata.py's
        # own formula is what makes a *correct* metadata file look stale.
        actual_unresearched = total_us - actual_researched
        meta_unresearched   = cov.get("counties_not_yet_researched", 0)
        if meta_unresearched != actual_unresearched:
            warn(f"counties_not_yet_researched: metadata={meta_unresearched}, "
                 f"computed={actual_unresearched} ({total_us} - {actual_researched})")

        # counties_coverage_pct is deliberately the raw in-database share (see
        # refresh_platform_metadata.py); counties_researched_pct below is the
        # researched-only figure. Different fields, different denominators —
        # both are checked, neither is "the" coverage number on its own.
        actual_pct = round(actual_in_db / total_us * 100, 1)
        meta_pct   = cov.get("counties_coverage_pct", 0)
        if abs(meta_pct - actual_pct) > 0.2:
            warn(f"counties_coverage_pct: metadata={meta_pct}, computed={actual_pct}")

        actual_researched_pct = round(actual_researched / total_us * 100, 1)
        meta_researched_pct   = cov.get("counties_researched_pct", 0)
        if abs(meta_researched_pct - actual_researched_pct) > 0.2:
            warn(f"counties_researched_pct: metadata={meta_researched_pct}, "
                 f"computed={actual_researched_pct}")
    else:
        warn("map_data.json counties is not a dict -- skipping county cross-check")
else:
    warn(f"map_data.json not found at {MAP_DATA_PATH} -- skipping county cross-check")

# Cross-check facilities_master.json
if FACILITIES_PATH.exists():
    facilities = load(FACILITIES_PATH)
    if isinstance(facilities, list):
        actual_total = len(facilities)
        actual_op    = sum(1 for f in facilities if f.get("operational_status") == "operational")
        actual_pl    = sum(1 for f in facilities if f.get("operational_status") == "planned")

        meta_total = fresh.get("facilities_total", 0)
        meta_op    = fresh.get("facilities_operational", 0)
        meta_pl    = fresh.get("facilities_planned", 0)

        if meta_total != actual_total:
            warn(f"facilities_total: metadata={meta_total}, actual={actual_total}")
        if meta_op != actual_op:
            warn(f"facilities_operational: metadata={meta_op}, actual={actual_op}")
        if meta_pl != actual_pl:
            warn(f"facilities_planned: metadata={meta_pl}, actual={actual_pl}")
    else:
        warn("facilities_master.json is not a list -- skipping cross-check")
else:
    warn(f"facilities_master.json not found -- skipping facilities cross-check")

# Cross-check ai_companies.json
if AI_COMPANIES_PATH.exists():
    companies_raw = load(AI_COMPANIES_PATH)
    if isinstance(companies_raw, dict):
        actual_pub  = len(companies_raw.get("public_companies",  []))
        actual_priv = len(companies_raw.get("private_companies", []))
    elif isinstance(companies_raw, list):
        actual_pub  = sum(1 for c in companies_raw if c.get("public", False))
        actual_priv = sum(1 for c in companies_raw if not c.get("public", True))
    else:
        warn("ai_companies.json has unexpected type -- skipping cross-check")
        actual_pub = actual_priv = None

    if actual_pub is not None:
        meta_pub  = fresh.get("ai_companies_public", 0)
        meta_priv = fresh.get("ai_companies_private", 0)
        if meta_pub != actual_pub:
            warn(f"ai_companies_public: metadata={meta_pub}, actual={actual_pub}")
        if meta_priv != actual_priv:
            warn(f"ai_companies_private: metadata={meta_priv}, actual={actual_priv}")
else:
    warn("ai_companies.json not found -- skipping companies cross-check")

# Sanity checks
total_us_in_meta = cov.get("total_us_counties", 0)
if total_us_in_meta != 3143:
    warn(f"total_us_counties is {total_us_in_meta}, expected 3143")

if not meta.get("disclaimers"):
    err("disclaimers array is empty or missing")

# Report
if warnings:
    print("\nWarnings (stale numbers -- update platform_metadata.json):")
    for w in warnings:
        print(w)

if errors:
    print("\nErrors (structural problems -- fix before deploying):")
    for e in errors:
        print(e)
    sys.exit(1)

if not warnings and not errors:
    print("  OK -- all statistics match live data files")
else:
    print(f"\n  {len(errors)} error(s), {len(warnings)} warning(s)")
    if errors:
        sys.exit(1)
