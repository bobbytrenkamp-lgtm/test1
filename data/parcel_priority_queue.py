#!/usr/bin/env python3
"""Rank the next parcel jurisdictions to investigate, by facility count.

Groups data/facilities_index.json by county FIPS (no precomputed per-county
aggregate exists anywhere in the repo, so this always groups fresh),
excludes counties already covered (status=production in the catalog) and
counties that are blocked/rejected without a due retry, ranks what's left by
facility count, and groups the top N by state so a batch run can try
existing statewide/regional coverage before starting fresh discovery.

Read-only. No side effects, no network. This is the ranking half of the
`--next N` batch pipeline (data/parcel_pipeline/discover_batch.mjs +
record_batch_results.mjs) -- this script only answers "what should be
looked at next and why," it does not investigate anything.

A record's status alone (candidate/requires-review/thin) does NOT exclude
it here by design -- those statuses mean "a human should look at this,"
not "done." But that means a county whose best automated-discovery
candidate wasn't good enough to promote stays status=candidate and would
otherwise resurface at the SAME rank on the very next --next N call,
forever. --exclude-attempted breaks that loop: it additionally skips any
record whose notes contain record_batch_results.mjs's standardized
"automated discovery:" marker, i.e. a county this exact pipeline has
already looked at (regardless of outcome) -- use it when picking the next
batch to run through discover_batch.mjs; omit it for the plain "what's
never been touched at all" view.

Usage:
    python3 data/parcel_priority_queue.py --next 25
    python3 data/parcel_priority_queue.py --next 10 --json
    python3 data/parcel_priority_queue.py --next 15 --exclude-attempted
"""
import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
FACILITIES_PATH = ROOT / "data" / "facilities_index.json"
CATALOG_PATH = ROOT / "data" / "parcel_source_catalog.json"


def load_facility_counts():
    with open(FACILITIES_PATH, encoding="utf-8") as f:
        facilities = json.load(f)
    counts = Counter()
    names = {}
    states = {}
    for fac in facilities:
        fips = fac.get("county_fips")
        if not fips:
            continue
        fips = str(fips).zfill(5)
        counts[fips] += 1
        names.setdefault(fips, fac.get("county"))
        states.setdefault(fips, fac.get("state_abbr"))
    return counts, names, states


def load_catalog():
    if not CATALOG_PATH.exists():
        return {}
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f).get("jurisdictions", {})


def is_retry_due(record, today):
    """A blocked/rejected record is excluded unless it's explicitly
    retry_eligible AND (no last_verified date to gate on, OR that many days
    have actually passed)."""
    if not record.get("retry_eligible"):
        return False
    last_verified = record.get("last_verified")
    retry_after_days = record.get("retry_after_days")
    if not last_verified or not retry_after_days:
        return True
    try:
        verified_date = datetime.strptime(last_verified, "%Y-%m-%d").date()
    except ValueError:
        return True
    return (today - verified_date).days >= retry_after_days


def find_reusable_state_coverage(catalog, state):
    """Production entries in the same state whose source is statewide/
    regional and has a county-filter field -- the existing `where`-clause
    reuse pattern (NJ MOD-IV, NYC MAPPLUTO, Hennepin MN regional) already
    proven in js/parcel/connector-arcgis.js. Surfaced as a hint only; this
    script does not attempt to confirm the filter actually covers the new
    county."""
    hits = []
    for fips, rec in catalog.items():
        if rec.get("state") != state or rec.get("status") != "production":
            continue
        if rec.get("source_scope") in ("statewide", "regional") and rec.get("county_filter_field"):
            hits.append({
                "fips": fips,
                "name": rec.get("name"),
                "service_url": rec.get("service_url"),
                "county_filter_field": rec.get("county_filter_field"),
                "official_publisher": rec.get("official_publisher"),
            })
    return hits


ATTEMPTED_MARKER = "automated discovery:"


def already_attempted(rec):
    """True if record_batch_results.mjs has already logged a real
    discover_batch.mjs outcome for this record, regardless of what that
    outcome was."""
    return ATTEMPTED_MARKER in (rec.get("notes") or "")


def build_queue(next_n, today=None, state=None, exclude_attempted=False):
    today = today or date.today()
    counts, names, states = load_facility_counts()
    catalog = load_catalog()

    candidates = []
    for fips, count in counts.items():
        rec = catalog.get(fips)
        if rec is not None:
            status = rec.get("status")
            if status == "production":
                continue
            if status in ("blocked", "rejected") and not is_retry_due(rec, today):
                continue
            if exclude_attempted and already_attempted(rec):
                continue
        candidate_state = (rec.get("state") if rec else None) or states.get(fips)
        if state and (candidate_state or "").upper() != state.upper():
            continue
        candidates.append({
            "fips": fips,
            "name": (rec.get("name") if rec else None) or names.get(fips),
            "state": candidate_state,
            "facility_count": count,
            "catalog_status": rec.get("status") if rec else "not-investigated",
        })

    candidates.sort(key=lambda c: c["facility_count"], reverse=True)
    top = candidates[:next_n]

    by_state = defaultdict(list)
    for c in top:
        by_state[c["state"]].append(c)

    result = {
        "generated_at": today.isoformat(),
        "requested": next_n,
        "returned": len(top),
        "candidates": [],
    }
    for rank, c in enumerate(top, start=1):
        reusable = find_reusable_state_coverage(catalog, c["state"]) if c["state"] else []
        result["candidates"].append({
            "rank": rank,
            **c,
            "reusable_statewide_regional_sources": reusable,
        })
    return result


def print_human(result):
    print(f"Next {result['returned']} of {result['requested']} requested "
          f"(generated {result['generated_at']}):\n")
    for c in result["candidates"]:
        reuse = c["reusable_statewide_regional_sources"]
        reuse_note = ""
        if reuse:
            names = ", ".join(f"{r['name']} ({r['fips']})" for r in reuse)
            reuse_note = f"  [reusable {c['state']} source(s): {names}]"
        print(f"  #{c['rank']:<3} {c['fips']}  {c['name'] or '(unknown name)':<40} "
              f"{c['state'] or '??':<3} {c['facility_count']:>4} facilities  "
              f"[{c['catalog_status']}]{reuse_note}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--next", type=int, default=25, help="how many jurisdictions to return")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of a human-readable report")
    parser.add_argument("--state", type=str, default=None, help="scope the candidate pool to one state (2-letter abbreviation) before ranking")
    parser.add_argument("--exclude-attempted", action="store_true", help="also skip records record_batch_results.mjs has already logged a discover_batch.mjs outcome for, regardless of status")
    args = parser.parse_args()

    result = build_queue(args.next, state=args.state, exclude_attempted=args.exclude_attempted)
    if args.json:
        json.dump(result, sys.stdout, indent=2)
        print()
    else:
        print_human(result)


if __name__ == "__main__":
    main()
