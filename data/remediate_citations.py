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
MAP_DATA_HEALTH_PATH = ROOT / "data" / "map_data_citation_health.json"
SAMPLE_LAYERS_PATH = ROOT / "data" / "sample_layers.json"
STATE_REGS_PATH = ROOT / "data" / "state_regulations.json"
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


def find_map_data_redirect_fixes(citation_health: dict) -> dict[str, dict]:
    """Same idea as find_redirect_fixes, but for
    data/map_data_citation_health.json (validate_sources.py's per-URL
    output, which covers county sources plus sample_layers.json's facility
    sources and state_regulations.json's state sources). context tells the
    caller which underlying file a given URL actually lives in, since this
    checker's corpus spans three separate source-of-truth files unlike
    check_source_links.py's county-only one."""
    fixes = {}
    for url, rec in citation_health.get("urls", {}).items():
        if rec.get("ok") and rec.get("final_url"):
            fixes[url] = {
                "new_url": rec["final_url"],
                "checked_at": rec.get("checked_at"),
                "context": rec.get("context", ""),
            }
    return fixes


def _apply_fixes_to_sources_list(sources_list, fixes: dict[str, dict], today: str,
                                  reason: str, verified_via: str) -> int:
    """Shared apply logic for any [{label, url}, ...] sources list --
    restrictions_raw.json records, sample_layers.json items, and
    state_regulations.json states all use this identical leaf shape."""
    applied = 0
    for source in sources_list or []:
        url = source.get("url") if isinstance(source, dict) else None
        if not url or url not in fixes:
            continue
        fix = fixes[url]
        source.setdefault("replacement_history", []).append({
            "old_value": url,
            "new_value": fix["new_url"],
            "changed_at": today,
            "reason": reason.format(checked_at=fix.get("checked_at")),
            "verified_via": verified_via,
        })
        source["url"] = fix["new_url"]
        applied += 1
    return applied


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


def find_map_data_queue_candidates(citation_health: dict) -> list[dict]:
    """Same idea as find_queue_candidates, for map_data_citation_health.json.
    Only surfaces sample_layers.json / state_regulations.json citations --
    map_data.json-context (county) candidates are already covered by
    find_queue_candidates via source_link_health.json, which additionally
    knows how many counties cite each URL; skipping the overlap here avoids
    listing the same county citation twice under two different sources."""
    candidates = []
    for url, rec in citation_health.get("urls", {}).items():
        if rec.get("ok"):
            continue
        context = rec.get("context", "")
        if context.startswith("map_data.json /"):
            continue
        if not (rec.get("suggested_replacement") or rec.get("archive")):
            continue
        candidates.append({
            "url": url,
            "context": context,
            "down_reason": rec.get("down_reason"),
            "status": rec.get("status"),
            "suggested_replacement": rec.get("suggested_replacement"),
            "archive": rec.get("archive"),
        })
    candidates.sort(key=lambda c: c["url"])
    return candidates


def apply_redirect_fixes(restrictions: dict, fixes: dict[str, dict],
                          verified_via: str = "data/source_link_health.json") -> int:
    """Mutates restrictions['restrictions'] in place. Returns the number of
    individual source URLs updated. Every update appends a
    replacement_history entry (old_value/new_value/changed_at/reason/
    verified_via) rather than silently overwriting the url -- same
    provenance convention as js/parcel/registry.js's replacementHistory and
    government_sources.json's PolicySource.replacement_history."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    applied = 0
    reason = ("HTTP redirect observed and followed live (checked_at={checked_at}) "
              "-- not a guess, an actually-followed request.")
    for record in restrictions.get("restrictions", []):
        applied += _apply_fixes_to_sources_list(
            record.get("sources"), fixes, today, reason, verified_via)
    return applied


def apply_sample_layers_fixes(sample_layers: dict, fixes: dict[str, dict]) -> int:
    """Same directly-observed-redirect fix, applied to sample_layers.json's
    facility (data center / AI campus / power / fiber) source citations."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    applied = 0
    reason = ("HTTP redirect observed and followed live by validate_sources.py "
              "(checked_at={checked_at}) -- not a guess, an actually-followed request.")
    for category in ("data_centers", "ai_campuses", "power_infrastructure", "fiber_network"):
        for item in sample_layers.get(category, []):
            applied += _apply_fixes_to_sources_list(
                item.get("sources"), fixes, today, reason,
                "data/map_data_citation_health.json")
    return applied


def apply_state_regs_fixes(state_regs: dict, fixes: dict[str, dict]) -> int:
    """Same directly-observed-redirect fix, applied to state_regulations.json's
    per-state source citations."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    applied = 0
    reason = ("HTTP redirect observed and followed live by validate_sources.py "
              "(checked_at={checked_at}) -- not a guess, an actually-followed request.")
    for state in state_regs.get("states", {}).values():
        applied += _apply_fixes_to_sources_list(
            state.get("sources"), fixes, today, reason,
            "data/map_data_citation_health.json")
    return applied


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--queue-out", default=str(QUEUE_PATH))
    args = ap.parse_args()

    if not HEALTH_PATH.exists() and not MAP_DATA_HEALTH_PATH.exists():
        print(f"Neither {HEALTH_PATH.relative_to(ROOT)} nor {MAP_DATA_HEALTH_PATH.relative_to(ROOT)} "
              f"exist yet -- nothing to remediate. Run data/check_source_links.py and/or "
              f"data/validate_sources.py first.")
        return 0

    health = json.loads(HEALTH_PATH.read_text()) if HEALTH_PATH.exists() else {"urls": {}}
    map_data_health = (json.loads(MAP_DATA_HEALTH_PATH.read_text())
                        if MAP_DATA_HEALTH_PATH.exists() else {"urls": {}})
    restrictions = json.loads(RESTRICTIONS_PATH.read_text())

    # county fixes: source_link_health.json's own findings, plus
    # map_data_citation_health.json's findings for the same underlying file
    # (context "map_data.json / ...") -- these two checkers cover an
    # overlapping URL set, so a redirect either one directly observed is
    # equally verified fact. source_link_health.json wins on conflict since
    # it's the more specialized, more frequently-run county checker.
    county_fixes_map_data = {
        url: fix for url, fix in find_map_data_redirect_fixes(map_data_health).items()
        if fix.get("context", "").startswith("map_data.json /")
    }
    fixes = {**county_fixes_map_data, **find_redirect_fixes(health)}
    before = json.dumps(restrictions, sort_keys=True)
    applied = apply_redirect_fixes(restrictions, fixes)
    after = json.dumps(restrictions, sort_keys=True)
    changed = before != after

    all_map_data_fixes = find_map_data_redirect_fixes(map_data_health)
    sample_layers_fixes = {
        url: fix for url, fix in all_map_data_fixes.items()
        if fix.get("context", "").startswith("sample_layers.json /")
    }
    state_regs_fixes = {
        url: fix for url, fix in all_map_data_fixes.items()
        if fix.get("context", "").startswith("state_regulations.json /")
    }

    sample_layers = json.loads(SAMPLE_LAYERS_PATH.read_text())
    before_sl = json.dumps(sample_layers, sort_keys=True)
    applied_sl = apply_sample_layers_fixes(sample_layers, sample_layers_fixes)
    changed_sl = json.dumps(sample_layers, sort_keys=True) != before_sl

    state_regs = json.loads(STATE_REGS_PATH.read_text())
    before_sr = json.dumps(state_regs, sort_keys=True)
    applied_sr = apply_state_regs_fixes(state_regs, state_regs_fixes)
    changed_sr = json.dumps(state_regs, sort_keys=True) != before_sr

    queue = find_queue_candidates(health) + find_map_data_queue_candidates(map_data_health)
    queue_report = {
        "_meta": {
            "description": "Citations that are unreachable AND have some lead (a sitemap-based "
                            "\"may have moved to\" suggestion or a Wayback archive snapshot) but were "
                            "NOT auto-applied -- a heuristic suggestion is not verified fact, so these "
                            "need a human or a separately-reviewed pass to confirm before the underlying "
                            "file is touched. County candidates (from source_link_health.json) are sorted "
                            "by how many county records cite the URL, most first; facility/state candidates "
                            "(from map_data_citation_health.json) follow, sorted by URL.",
            "generated_by": "data/remediate_citations.py",
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source_link_health_checked_at": health.get("checked_at"),
            "map_data_citation_health_checked_at": map_data_health.get("checked_at"),
        },
        "count": len(queue),
        "candidates": queue,
    }

    if args.check:
        stale = changed or changed_sl or changed_sr or (args.queue_out == str(QUEUE_PATH) and (
            not QUEUE_PATH.exists() or QUEUE_PATH.read_text() != json.dumps(queue_report, indent=2) + "\n"
        ))
        if stale:
            print(f"FAIL: remediation would apply {applied + applied_sl + applied_sr} redirect fix(es) "
                  f"and/or the queue report is stale.")
            return 1
        print("OK: nothing to remediate, queue report is current.")
        return 0

    print(f"{len(fixes)} directly-observed county redirect(s) found; {applied} source URL(s) updated in restrictions_raw.json.")
    print(f"{len(sample_layers_fixes)} directly-observed facility redirect(s) found; {applied_sl} source URL(s) updated in sample_layers.json.")
    print(f"{len(state_regs_fixes)} directly-observed state redirect(s) found; {applied_sr} source URL(s) updated in state_regulations.json.")
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

    if applied_sl:
        SAMPLE_LAYERS_PATH.write_text(json.dumps(sample_layers, indent=2) + "\n")
        print(f"Wrote {SAMPLE_LAYERS_PATH.relative_to(ROOT)} ({applied_sl} citation(s) repointed).")
        # sample_layers.json is the pipeline's source of truth, but the
        # frontend never reads it directly -- js/map.js fetches
        # data/layers/*.json instead (see data/split_sample_layers.py's own
        # docstring). A real citation fix landed here (2026-08-20) sat
        # invisible to users for a full session because nothing re-split
        # after this write, until data/split_sample_layers.py --check
        # caught the drift in the next full test run. Re-split every time
        # so a citation fix here can never again go live in the source file
        # while the site keeps serving the stale URL.
        split_result = subprocess.run(
            [sys.executable, str(ROOT / "data" / "split_sample_layers.py")], cwd=ROOT)
        if split_result.returncode != 0:
            print("::error::split_sample_layers.py failed after remediation -- "
                  "data/layers/*.json may be out of sync with sample_layers.json.")
            return 1
        print("Regenerated data/layers/*.json from the updated sample_layers.json.")

    if applied_sr:
        STATE_REGS_PATH.write_text(json.dumps(state_regs, indent=2) + "\n")
        print(f"Wrote {STATE_REGS_PATH.relative_to(ROOT)} ({applied_sr} citation(s) repointed).")

    Path(args.queue_out).write_text(json.dumps(queue_report, indent=2) + "\n")
    print(f"Wrote {args.queue_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
