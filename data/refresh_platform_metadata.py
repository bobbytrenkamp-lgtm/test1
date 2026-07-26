#!/usr/bin/env python3
"""Recompute the derived counts in data/platform_metadata.json from the data files.

WHY THIS EXISTS
platform_metadata.json is the declared source of truth for platform-wide stats,
and the frontend reads coverage and facility figures from it rather than
downloading multi-megabyte datasets to count rows itself. That only holds if the
file is regenerated whenever the underlying data changes. The weekly facilities
pipeline updated facilities_master.json without touching it, so Home displayed
stale totals until validate_platform_metadata.py flagged the drift.

Run this after any data update — it is wired into .github/workflows/update_facilities.yml.

Only derived counts are rewritten. Editorial fields (disclaimers, notes, update
frequencies, methodology text) are preserved exactly as written.

Usage:
    python3 data/refresh_platform_metadata.py [--check]

    --check   exit 1 if the file would change, without writing (for CI)
"""
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
META = ROOT / "data" / "platform_metadata.json"
MAP_DATA = ROOT / "data" / "map_data.json"
FACILITIES = ROOT / "data" / "facilities_master.json"
AI_COMPANIES = ROOT / "data" / "ai_companies.json"
STATE_REGS = ROOT / "data" / "state_regulations.json"

TOTAL_US_COUNTIES = 3143


def load(path):
    with open(path) as f:
        return json.load(f)


def main():
    check_only = "--check" in sys.argv

    if not META.exists():
        print(f"FAIL: {META} not found")
        return 1

    meta = load(META)
    before = json.dumps(meta, indent=2, sort_keys=True, ensure_ascii=False)

    # ── Counties ───────────────────────────────────────────────────────────────
    if MAP_DATA.exists():
        raw = load(MAP_DATA)
        counties = raw.get("counties", raw) if isinstance(raw, dict) else raw
        if isinstance(counties, dict):
            levels = Counter(c.get("level") for c in counties.values())
            in_db = len(counties)
            bans = levels.get(4, 0)
            high = levels.get(3, 0)
            mod = levels.get(2, 0)
            prop = levels.get(1, 0)
            pro = levels.get(-1, 0)

            cov = meta.setdefault("coverage", {})
            cov["total_us_counties"] = TOTAL_US_COUNTIES
            cov["counties_in_database"] = in_db
            cov["counties_coverage_pct"] = round(in_db / TOTAL_US_COUNTIES * 100, 1)
            cov["counties_with_bans"] = bans
            cov["counties_with_high_restrictions"] = high
            cov["counties_with_moderate_restrictions"] = mod
            cov["counties_with_proposed_restrictions"] = prop
            cov["counties_pro_development"] = pro
            cov["counties_no_known_restrictions"] = levels.get(0, 0)
            cov["counties_with_active_restrictions"] = bans + high + mod + prop
            cov["counties_not_yet_researched"] = TOTAL_US_COUNTIES - in_db

            states = {c.get("state") for c in counties.values() if c.get("state")}
            cov["states_in_database"] = len(states)

    # ── States ─────────────────────────────────────────────────────────────────
    # states_with_active_restrictions counts STATE-level policies in
    # state_regulations.json. It is deliberately not derived from county rows:
    # a state can have restrictive counties without any statewide law, and
    # conflating the two silently changes what the number means.
    if STATE_REGS.exists():
        sr = load(STATE_REGS)
        states_map = sr.get("states", {}) if isinstance(sr, dict) else {}
        if states_map:
            cov = meta.setdefault("coverage", {})
            cov["states_total"] = len(states_map)
            cov["states_with_active_restrictions"] = sum(
                1 for v in states_map.values() if (v.get("level") or 0) >= 1
            )

    # ── Facilities ─────────────────────────────────────────────────────────────
    if FACILITIES.exists():
        fac = load(FACILITIES)
        if isinstance(fac, list):
            statuses = Counter(r.get("operational_status") for r in fac)
            fresh = meta.setdefault("freshness", {})
            fresh["facilities_total"] = len(fac)
            fresh["facilities_operational"] = statuses.get("operational", 0)
            fresh["facilities_planned"] = statuses.get("planned", 0)

    # ── AI companies ───────────────────────────────────────────────────────────
    if AI_COMPANIES.exists():
        comp = load(AI_COMPANIES)
        fresh = meta.setdefault("freshness", {})
        if isinstance(comp, dict):
            fresh["ai_companies_public"] = len(comp.get("public_companies", []))
            fresh["ai_companies_private"] = len(comp.get("private_companies", []))

    after = json.dumps(meta, indent=2, sort_keys=True, ensure_ascii=False)
    changed = before != after

    if not changed:
        print("platform_metadata.json is already up to date")
        return 0

    if check_only:
        print("platform_metadata.json is STALE — run: python3 data/refresh_platform_metadata.py")
        return 1

    # Only stamp the generation time when something actually changed, so the
    # file does not churn on every workflow run.
    meta["_generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(META, "w") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("platform_metadata.json updated:")
    cov = meta.get("coverage", {})
    fresh = meta.get("freshness", {})
    print(f"  counties in database : {cov.get('counties_in_database')} "
          f"({cov.get('counties_coverage_pct')}% of {cov.get('total_us_counties')})")
    print(f"  facilities           : {fresh.get('facilities_total')} total, "
          f"{fresh.get('facilities_operational')} operational, "
          f"{fresh.get('facilities_planned')} planned")
    return 0


if __name__ == "__main__":
    sys.exit(main())
