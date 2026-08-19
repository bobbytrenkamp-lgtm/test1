#!/usr/bin/env python3
"""data/remediate_citations.py

Citation checking (data/check_source_links.py, data/validate_sources.py,
both now sharing data/lib/endpoint_diagnostics.py) has always been purely
diagnostic -- it detects and records a dead/redirected citation, but
nothing ever closed the loop by actually fixing one. That's the real
reason the citation backlog reached ~45% unreachable: detection existed,
remediation never did. This script is that missing piece.

It applies exactly ONE class of fix automatically, because it is the only
one that is directly OBSERVED fact rather than a heuristic guess: a
citation URL that check_source_links.py's real HTTP request followed
through a redirect to a live (2xx-399) final URL. That's not a
suggestion -- the checker actually made the request and watched the
server redirect it, the same as a human clicking the link in a browser
and landing somewhere else. Updating the citation to point at where it
actually, verifiably ends up is not a guess.

Everything else -- a sitemap-keyword-overlap "may have moved to"
suggestion, an archived-but-otherwise-dead link -- is NEVER auto-applied.
Those go into a remediation queue report for a human or a future,
separately-reviewed pass to confirm, exactly like
check_source_links.py's own docstring already insists for its suggestion
feature ("a human should confirm before ever citing it as fact").

Only touches data/restrictions_raw.json (the human-curated source of
truth for county citations) -- never data/map_data.json directly, which
is a generated artifact; this script re-runs data/process_data.py after
any change so map_data.json stays in sync, the same order
.github/workflows/update_data.yml already uses.

Usage:
    python3 data/remediate_citations.py [--check] [--queue-out PATH] [--dry-run]

    --check      exit 1 if applying fixes would change restrictions_raw.json
                 (nothing is written)
    --dry-run    print what would change, write nothing
    --queue-out  where to write the remediation queue report
                 (default: data/citation_remediation_queue.json)
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
RESTRICTIONS_PATH = ROOT / "data" / "restrictions_raw.json"
HEALTH_PATH = ROOT / "data" / "source_link_health.json"
QUEUE_PATH = ROOT / "data" / "citation_remediation_queue.json"


def find_redirect_fixes(health: dict) -> dict[str, dict]:
    """URLs the checker directly observed redirecting to a live final URL.
    Pure function of the health data -- no file I/O, so it's independently
    testable against a synthetic health dict."""
    fixes = {}
    for url, rec in health.get("urls", {}).items():
        if rec.get("ok") and rec.get("final_url"):
            fixes[url] = {
                "new_url": rec["final_url"],
                "checked_at": rec.get("checked_at"),
            }
    return fixes


def find_queue_candidates(health: dict) -> list[dict]:
    """Every unreachable URL with SOME lead (a suggested replacement or an
    archived copy) worth a human/agent review pass -- never auto-applied.
    Also includes down_reason so a reviewer can triage SOURCE_RETIRED
    (probably needs a real replacement search) differently from
    ACCESS_BLOCKED (probably needs no URL change at all, just a note)."""
    candidates = []
    for url, rec in health.get("urls", {}).items():
        if rec.get("ok"):
            continue
        if not (rec.get("suggested_replacement") or rec.get("archive")):
            continue
        candidates.append({
            "url": url,
            "down_reason": rec.get("down_reason"),
            "status": rec.get("status"),
            "consecutive_failures": rec.get("consecutive_failures"),
            "suggested_replacement": rec.get("suggested_replacement"),
            "archive": rec.get("archive"),
            "counties": rec.get("counties"),
        })
    # Most-affected-counties first -- a citation shared by many county
    # records is worth reviewing before one used by a single record.
    candidates.sort(key=lambda c: -(c.get("counties") or 0))
    return candidates


def apply_redirect_fixes(restrictions: dict, fixes: dict[str, dict]) -> int:
    """Mutates restrictions['restrictions'] in place. Returns the number of
    individual source URLs updated. Every update appends a
    replacement_history entry (old_value/new_value/changed_at/reason/
    verified_via) rather than silently overwriting the url -- same
    provenance convention as js/parcel/registry.js's replacementHistory and
    government_sources.json's PolicySource.replacement_history."""
    applied = 0
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for record in restrictions.get("restrictions", []):
        for source in record.get("sources") or []:
            url = source.get("url") if isinstance(source, dict) else None
            if not url or url not in fixes:
                continue
            fix = fixes[url]
            source.setdefault("replacement_history", []).append({
                "old_value": url,
                "new_value": fix["new_url"],
                "changed_at": today,
                "reason": "HTTP redirect observed and followed live by check_source_links.py "
                          f"(checked_at={fix['checked_at']}) -- not a guess, an actually-followed request.",
                "verified_via": "data/source_link_health.json",
            })
            source["url"] = fix["new_url"]
            applied += 1
    return applied


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--queue-out", default=str(QUEUE_PATH))
    args = ap.parse_args()

    if not HEALTH_PATH.exists():
        print(f"No {HEALTH_PATH.relative_to(ROOT)} yet -- nothing to remediate. "
              f"Run data/check_source_links.py first.")
        return 0

    health = json.loads(HEALTH_PATH.read_text())
    restrictions = json.loads(RESTRICTIONS_PATH.read_text())

    fixes = find_redirect_fixes(health)
    before = json.dumps(restrictions, sort_keys=True)
    applied = apply_redirect_fixes(restrictions, fixes)
    after = json.dumps(restrictions, sort_keys=True)
    changed = before != after

    queue = find_queue_candidates(health)
    queue_report = {
        "_meta": {
            "description": "Citations that are unreachable AND have some lead (a sitemap-based "
                            "\"may have moved to\" suggestion or a Wayback archive snapshot) but were "
                            "NOT auto-applied -- a heuristic suggestion is not verified fact, so these "
                            "need a human or a separately-reviewed pass to confirm before restrictions_raw.json "
                            "is touched. Sorted by how many county records cite the URL, most first.",
            "generated_by": "data/remediate_citations.py",
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source_link_health_checked_at": health.get("checked_at"),
        },
        "count": len(queue),
        "candidates": queue,
    }

    if args.check:
        stale = changed or (args.queue_out == str(QUEUE_PATH) and (
            not QUEUE_PATH.exists() or QUEUE_PATH.read_text() != json.dumps(queue_report, indent=2) + "\n"
        ))
        if stale:
            print(f"FAIL: remediation would apply {applied} redirect fix(es) and/or the queue report is stale.")
            return 1
        print("OK: nothing to remediate, queue report is current.")
        return 0

    print(f"{len(fixes)} directly-observed redirect(s) found; {applied} source URL(s) would be updated.")
    print(f"{len(queue)} unreachable citation(s) queued for review (suggestion or archive available, not applied).")

    if args.dry_run:
        return 0

    if applied:
        RESTRICTIONS_PATH.write_text(json.dumps(restrictions, indent=2) + "\n")
        print(f"Wrote {RESTRICTIONS_PATH.relative_to(ROOT)} ({applied} citation(s) repointed).")
        result = subprocess.run([sys.executable, str(ROOT / "data" / "process_data.py")], cwd=ROOT)
        if result.returncode != 0:
            print("::error::process_data.py failed after remediation -- map_data.json may be out of sync.")
            return 1
        print("Regenerated data/map_data.json from the updated restrictions_raw.json.")

    Path(args.queue_out).write_text(json.dumps(queue_report, indent=2) + "\n")
    print(f"Wrote {args.queue_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
