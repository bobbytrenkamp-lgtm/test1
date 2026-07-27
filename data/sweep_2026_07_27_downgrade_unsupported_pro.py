#!/usr/bin/env python3
"""Downgrade level -1 records that do not meet the Pro-Development Hub definition.

THE PROBLEM
docs/TERMINOLOGY.md defines level -1 as:

    pro | Pro-Development Hub | Verified tax incentives, fast-track permitting,
        | or active development infrastructure in place.

An audit of the 1,296 level -1 records found 597 that mention NONE of those
three things. They are geographic descriptions — a county's railyard, its
university, its barbecue tradition, its interstate access — carrying a policy
label the text does not support, typically citing only the county's homepage.

Examples: Douglas County NE, Oakland County MI, St. Louis County MO.

WHY NOT JUST SET THEM TO LEVEL 0
Level 0 is "No Known Restrictions — Researched jurisdiction, no active or
proposed restrictions found at time of research." For these records no research
happened; nobody looked for restrictions. Setting them to 0 would swap one
unsupported claim ("verified incentives here") for another ("we researched this
and found nothing"). Both mislead, just in different directions.

WHAT THIS DOES INSTEAD
  - level -1 -> 0, which stops the false pro-development claim
  - adds research_status: "descriptive_only" so the state is explicit and
    countable, and can be reported separately from genuinely researched counties
  - keeps the description, sources and every other field. Nothing is deleted.
    The text has some value as context; it just is not a policy finding.
  - records why, in notes, so the next person does not have to re-derive it

This is reversible: restrictions_raw.json retains everything, and the marker
makes the affected set trivially selectable if a different decision is made.

NOT TOUCHED
  - the 699 level -1 records that DO cite at least one of the three criteria
  - every level 1-4 restriction record
  - the nine moratorium corrections from the companion sweep

Usage:
    python3 data/sweep_2026_07_27_downgrade_unsupported_pro.py [--dry-run]
Then:
    python3 data/process_data.py && python3 data/refresh_platform_metadata.py
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
RAW = ROOT / "data" / "restrictions_raw.json"
REVIEW_DATE = "2026-07-27"

# The three criteria from the published definition, as text patterns.
# Deliberately generous — a record only has to MENTION one of these to be
# spared, so anything downgraded here really does lack all three.
INCENTIVE = re.compile(r'\b(tax (abatement|exemption|incentive|credit)|abatement|chapter 313|'
                       r'enterprise zone|opportunity zone|freeport|payment in lieu|pilot program)\b', re.I)
PERMIT    = re.compile(r'\b(fast.?track|expedited|by.?right|pre.?approved|shovel.?ready|'
                       r'streamlined permit|permit.{0,20}process)\b', re.I)
INFRA     = re.compile(r'\b(data cent|datacent|hyperscale|colocation|substation|'
                       r'transmission|fiber|megawatt|\bMW\b|campus)\b', re.I)

NOTE = (
    "[RECLASSIFIED 2026-07-27: previously level -1 (Pro-Development Hub). "
    "docs/TERMINOLOGY.md requires verified tax incentives, fast-track permitting, "
    "or active development infrastructure for that level, and this record cites "
    "none of the three — its text is a general description of the county rather "
    "than a policy finding. Downgraded to level 0 and marked "
    "research_status=descriptive_only, which means NOT YET RESEARCHED for data "
    "center policy — it is not a finding that no restrictions exist. Original "
    "description and sources retained unchanged.]"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="only process N records (for inspection)")
    args = ap.parse_args()

    data = json.loads(RAW.read_text())
    rows = data["restrictions"]

    downgraded, spared = [], 0
    for r in rows:
        if r.get("level") != -1:
            continue
        text = " ".join(str(r.get(k) or "") for k in ("title", "description", "notes"))
        if INCENTIVE.search(text) or PERMIT.search(text) or INFRA.search(text):
            spared += 1
            continue
        if args.limit and len(downgraded) >= args.limit:
            continue

        r["level"] = 0
        r["research_status"] = "descriptive_only"
        r["last_reviewed"] = REVIEW_DATE
        # Never claim verification for a record we just established is unverified.
        r["pipeline_verified"] = False
        existing = (r.get("notes") or "").strip()
        if "RECLASSIFIED 2026-07-27" not in existing:
            r["notes"] = (existing + " " + NOTE).strip()
        downgraded.append(f"{r['fips']} {r.get('name','?')}, {r.get('state','?')}")

    print(f"level -1 records examined : {spared + len(downgraded)}")
    print(f"  spared (cite >=1 criterion) : {spared}")
    print(f"  downgraded to level 0       : {len(downgraded)}")
    print("\n  first 12 downgraded:")
    for line in downgraded[:12]:
        print(f"    {line}")

    if args.dry_run:
        print("\n--dry-run: nothing written")
        return 0

    data.setdefault("meta", {})["last_updated"] = REVIEW_DATE
    RAW.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"\nwrote {RAW.relative_to(ROOT)}")
    print("Now run: python3 data/process_data.py && python3 data/refresh_platform_metadata.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
