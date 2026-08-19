#!/usr/bin/env python3
"""data/policy_pipeline/backfill_source_health_down_reason.py

One-time (idempotent) migration: data/source_health.json predates the
down_reason/first_failure_at fields added to SourceHealth in the reliability
architecture milestone. update_source_health_entry() computes both correctly
on every future pipeline run, but the 17 entries already recorded as
unreachable had neither -- this backfills them from already-recorded data
(status/error/consecutive_failures), no live network required, so the
existing real failures become diagnosable immediately rather than waiting
for the next scheduled run.

first_failure_at is backfilled as an honest approximation, not a fact: the
real first-failure date was never recorded before this migration, so this
uses last_checked (the most recent observation) rather than inventing an
earlier date -- explicitly annotated as such in each entry's notes rather
than presented as if it were known.

Usage:
    python3 data/policy_pipeline/backfill_source_health_down_reason.py [--check]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT / "data"))
from lib.endpoint_diagnostics import classify_down_reason  # noqa: E402

SOURCE_HEALTH_PATH = ROOT / "data" / "source_health.json"


def backfill(data: dict) -> int:
    """Mutates data in place. Returns the number of entries changed."""
    changed = 0
    for source_id, s in data.get("sources", {}).items():
        if s.get("reachable"):
            continue
        if s.get("down_reason") is not None:
            continue  # already classified (e.g. by a real run since this migration)
        reason = classify_down_reason(
            status=s.get("http_status"), error=s.get("error"), final_url=None,
            original_url=s.get("url"), consecutive_failures=s.get("consecutive_failures") or 0,
        )
        s["down_reason"] = reason
        if not s.get("first_failure_at"):
            s["first_failure_at"] = s.get("last_checked")
            s["first_failure_at_is_approximate"] = True
        changed += 1
    return changed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                     help="report what would change without writing")
    args = ap.parse_args()

    data = json.loads(SOURCE_HEALTH_PATH.read_text())
    before = json.dumps(data, sort_keys=True)
    changed = backfill(data)
    after = json.dumps(data, sort_keys=True)

    if args.check:
        print(f"{changed} entries would be backfilled" if before != after else "nothing to backfill")
        return 1 if before != after else 0

    if before == after:
        print("nothing to backfill")
        return 0

    SOURCE_HEALTH_PATH.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Backfilled down_reason for {changed} unreachable source(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
