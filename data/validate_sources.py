#!/usr/bin/env python3
"""
Validate all source URLs in the data files and report broken links.
Runs weekly via GitHub Actions and writes results to map_data.json
under the 'validation_report' key so the frontend can surface them.

This checker covers a larger citation corpus than data/check_source_links.py
(county pages plus every facility-layer and state-regulation source), but
used to be a strictly weaker implementation of the same idea: no retry, no
per-host throttling, no Wayback fallback, no "may have moved to" suggestion.
It now shares data/lib/endpoint_diagnostics.py's checker with
check_source_links.py, so this corpus gets the same capability instead of
staying the more primitive of the two, and gains the same down_reason
classification (TRANSIENT_FAILURE / SOURCE_MOVED / SOURCE_RETIRED /
ACCESS_BLOCKED / REPLACEMENT_REQUIRED) on every broken/warning URL.

Also writes data/map_data_citation_health.json: a per-URL record for EVERY
checked URL (not just broken/warning ones), including final_url on a
successful-but-redirected request. map_data.json's own validation_report
only keeps broken/warning entries (it's embedded in a file the frontend
reads, so it stays small) -- but data/remediate_citations.py needs the OK
entries too, specifically ones where the request succeeded only after a
redirect, so it can apply the same directly-observed-redirect auto-fix this
already does for county citations via source_link_health.json. Without a
separate file, that signal was discarded the moment a redirect landed
somewhere live, which is why map_data_citations never got the same
remediation-loop treatment county_page_citations did.

Exit codes:
  0 — all URLs OK (or no URLs to check)
  1 — one or more URLs broken
"""

import argparse
import json
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.endpoint_diagnostics import (   # noqa: E402
    check_url as _shared_check_url, wayback, find_replacement_candidate,
    classify_down_reason,
)

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
MAP_DATA_PATH = os.path.join(DATA_DIR, "map_data.json")
SAMPLE_LAYERS_PATH = os.path.join(DATA_DIR, "sample_layers.json")
STATE_REGS_PATH = os.path.join(DATA_DIR, "state_regulations.json")
CITATION_HEALTH_PATH = os.path.join(DATA_DIR, "map_data_citation_health.json")

TIMEOUT = 10
MAX_WORKERS = 8


def extract_urls_from_sources(sources, context=""):
    """Walk a sources list (strings or {label,url} dicts) and yield (url, context) pairs."""
    if not sources:
        return
    for s in sources:
        if isinstance(s, dict) and "url" in s:
            yield s["url"], context


def collect_all_urls():
    """Return a list of (url, context_label) tuples from all data files."""
    urls = []

    # map_data.json — county sources
    try:
        with open(MAP_DATA_PATH, encoding="utf-8") as f:
            md = json.load(f)
        for fips, county in md.get("counties", {}).items():
            ctx = f"map_data.json / {fips} ({county['name']})"
            for url, c in extract_urls_from_sources(county.get("sources", []), ctx):
                urls.append((url, c))
    except Exception as e:
        print(f"[WARN] Could not read map_data.json: {e}", file=sys.stderr)

    # sample_layers.json — facility sources
    try:
        with open(SAMPLE_LAYERS_PATH, encoding="utf-8") as f:
            sl = json.load(f)
        for category in ("data_centers", "ai_campuses", "power_infrastructure", "fiber_network"):
            for item in sl.get(category, []):
                ctx = f"sample_layers.json / {category} / {item.get('id','?')} ({item.get('name','?')})"
                for url, c in extract_urls_from_sources(item.get("sources", []), ctx):
                    urls.append((url, c))
    except Exception as e:
        print(f"[WARN] Could not read sample_layers.json: {e}", file=sys.stderr)

    # state_regulations.json — state sources
    try:
        with open(STATE_REGS_PATH, encoding="utf-8") as f:
            sr = json.load(f)
        for fips2, state in sr.get("states", {}).items():
            ctx = f"state_regulations.json / {fips2} ({state.get('name', '?')})"
            for url, c in extract_urls_from_sources(state.get("sources", []), ctx):
                urls.append((url, c))
    except Exception as e:
        print(f"[WARN] Could not read state_regulations.json: {e}", file=sys.stderr)

    # Deduplicate while preserving first context
    seen = {}
    deduped = []
    for url, ctx in urls:
        if url not in seen:
            seen[url] = ctx
            deduped.append((url, ctx))
    return deduped


def check_url(url, context, timeout):
    """Delegates to the shared HEAD->GET-fallback, per-host-throttled checker
    in lib/endpoint_diagnostics.py. Returns (url, context, status, error)."""
    res = _shared_check_url(url, timeout)
    return url, context, res["status"], res["error"], res["final_url"]


def load_citation_health():
    """Existing data/map_data_citation_health.json, or an empty shell.
    Used to know which URLs are already fresh enough to skip this run."""
    if os.path.exists(CITATION_HEALTH_PATH):
        try:
            with open(CITATION_HEALTH_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:                            # noqa: BLE001
            print(f"[WARN] existing {CITATION_HEALTH_PATH} unreadable, starting fresh: {e}",
                  file=sys.stderr)
    return {"_schema": "map_data_citation_health_v1", "checked_at": None, "urls": {}}


def _bucket_for_stored_record(rec):
    """Which of ok/warning/broken a previously-stored per-URL record
    belongs in -- lets a skipped-this-run (still-fresh) URL be carried
    forward into the final tallies without re-checking it."""
    if rec.get("ok"):
        return "ok"
    status = rec.get("status")
    if status and 400 <= status < 500 and status != 404:
        return "warning"
    return "broken"


def _stored_record_to_result(url, ctx, rec):
    # context comes from the current collect_all_urls() pass (ctx), not the
    # stored record -- a county/entry name can be edited between runs, and
    # the freshly-collected context is always the accurate one. checked_at
    # IS carried over unchanged -- this URL was skipped this run precisely
    # because it was still fresh, so re-stamping it "now" would defeat the
    # whole point of the staleness window on the next run.
    keys = ("status", "error", "final_url", "down_reason", "suggested_replacement",
            "archive", "checked_at")
    result = {"url": url, "context": ctx}
    for k in keys:
        if rec.get(k):
            result[k] = rec[k]
    return result


def run_validation(limit=0, max_age_days=0, workers=MAX_WORKERS, timeout=TIMEOUT):
    """Checks whichever URLs are "stale": never checked, or (when
    max_age_days > 0) checked more than max_age_days ago. Everything else
    is carried forward from data/map_data_citation_health.json as-is, same
    rolling-window approach check_source_links.py already uses for county
    citations -- this corpus is ~3x larger and re-checking all of it every
    single run doesn't fit in a normal CI job's time budget (confirmed
    2026-08-20: two live dispatches, one at a 30-minute and one at a
    50-minute job timeout, both got cancelled mid-run before finishing a
    full pass). max_age_days=0 (the default) disables staleness filtering
    entirely and checks every URL every run -- preserves the exact behavior
    update_data.yml has always relied on for its own unbounded weekly job.

    Returns the full ok/warning/broken tallies across the WHOLE corpus (not
    just the freshly-checked subset), so map_data.json's validation_report
    and the citation health file both always reflect the complete current
    picture."""
    all_urls = collect_all_urls()
    existing = load_citation_health()
    existing_urls = existing.get("urls", {})

    if max_age_days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        stale = []
        for url, ctx in all_urls:
            rec = existing_urls.get(url)
            if not rec or not rec.get("checked_at"):
                stale.append((url, ctx))
                continue
            try:
                if datetime.fromisoformat(rec["checked_at"]) < cutoff:
                    stale.append((url, ctx))
            except Exception:                              # noqa: BLE001
                stale.append((url, ctx))
        random.shuffle(stale)                              # spread load across hosts
    else:
        stale = list(all_urls)

    if limit:
        stale = stale[:limit]

    stale_urls = {url for url, _ in stale}
    print(f"{len(all_urls)} unique source URLs; {len(stale)} due for check "
          f"(workers={workers}, timeout={timeout}s)")

    results = {"ok": [], "broken": [], "warning": []}

    if stale:
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(check_url, url, ctx, timeout): (url, ctx) for url, ctx in stale}
            for i, future in enumerate(as_completed(futures), 1):
                url, context, status, error, final_url = future.result()
                label = f"[{i:3d}/{len(stale)}]"
                if error is None and status and 200 <= status < 400:
                    print(f"{label} OK  {status}  {url}")
                    ok_record = {"url": url, "status": status, "context": context}
                    if final_url:
                        ok_record["final_url"] = final_url
                    results["ok"].append(ok_record)
                    continue

                # Broken/warning: enrich with the same archive lookup + sitemap
                # "may have moved to" suggestion + down_reason classification
                # check_source_links.py already provides for county citations,
                # so this larger corpus (facility layers + state regs) isn't
                # stuck with a weaker signal for citations of the same kind.
                archive = wayback(url, timeout)
                suggestion = find_replacement_candidate(url, timeout)
                down_reason = classify_down_reason(
                    status=status, error=error, final_url=final_url, original_url=url,
                    consecutive_failures=3,  # single-pass checker has no history to consult
                    has_replacement_candidate=bool(suggestion or archive),
                )
                record = {"url": url, "status": status, "context": context, "error": error,
                          "down_reason": down_reason}
                if final_url:
                    record["final_url"] = final_url
                if archive:
                    record["archive"] = archive
                if suggestion:
                    record["suggested_replacement"] = suggestion

                if status and 400 <= status < 500 and status != 404:
                    # 4xx other than 404 (e.g. 429 rate-limit) — treat as warning
                    print(f"{label} WARN {status}  {url}  ({context})")
                    results["warning"].append(record)
                else:
                    code = status if status else "ERR"
                    print(f"{label} FAIL {code}  {url}  ({context})")
                    results["broken"].append(record)

    # Carry forward every URL that's still fresh (or that a limit skipped
    # this run) from the previous health file, so the returned tallies
    # cover the whole current corpus, not just what was freshly checked.
    for url, ctx in all_urls:
        if url in stale_urls:
            continue
        rec = existing_urls.get(url)
        if not rec:
            continue
        results[_bucket_for_stored_record(rec)].append(_stored_record_to_result(url, ctx, rec))

    return results


def write_report_to_map_data(results):
    """Embed the validation report in map_data.json so the frontend can expose it."""
    try:
        with open(MAP_DATA_PATH, encoding="utf-8") as f:
            md = json.load(f)
    except Exception as e:
        # This file holds all 1,467 county records — the entire production
        # dataset. Silently falling back to an empty dict here and then
        # writing it below (as this used to do) would overwrite map_data.json
        # with nothing but a validation_report, destroying every record, on
        # nothing more than a transient read glitch. update_data.yml calls
        # this and unconditionally commits the result straight to main, so
        # this failure mode was one bad read away from wiping the dataset in
        # production. Abort instead — a validation report that never got
        # embedded is recoverable next run; a destroyed map_data.json is not.
        print(f"ERROR: could not read {MAP_DATA_PATH}, refusing to write "
              f"(would destroy all county records): {e}", file=sys.stderr)
        raise

    md["validation_report"] = {
        "last_run": datetime.now(timezone.utc).isoformat(),
        "total_checked": len(results["ok"]) + len(results["broken"]) + len(results["warning"]),
        "ok": len(results["ok"]),
        "broken": len(results["broken"]),
        "warnings": len(results["warning"]),
        "broken_urls": results["broken"],
        "warning_urls": results["warning"],
    }

    with open(MAP_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(md, f, indent=2)

    print(f"\nValidation report written to map_data.json")


def write_citation_health(results):
    """Every checked URL (OK included), for data/remediate_citations.py to
    consume -- map_data.json's own validation_report deliberately drops OK
    entries to stay small, but the remediation engine needs exactly those to
    find requests that succeeded only after a redirect.

    A record carried forward from a previous run (run_validation() skipped
    it this time because it was still fresh) keeps its OWN checked_at
    rather than being re-stamped with this run's time -- otherwise the
    staleness window in run_validation() would never let a URL go stale
    again, since every run would make every URL look freshly-checked."""
    run_checked_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    urls = {}
    for bucket in ("ok", "warning", "broken"):
        for rec in results[bucket]:
            entry = {
                "ok": bucket == "ok",
                "status": rec.get("status"),
                "context": rec.get("context"),
                "checked_at": rec.get("checked_at") or run_checked_at,
            }
            if rec.get("final_url"):
                entry["final_url"] = rec["final_url"]
            if rec.get("error"):
                entry["error"] = rec["error"]
            if rec.get("down_reason"):
                entry["down_reason"] = rec["down_reason"]
            if rec.get("suggested_replacement"):
                entry["suggested_replacement"] = rec["suggested_replacement"]
            if rec.get("archive"):
                entry["archive"] = rec["archive"]
            urls[rec["url"]] = entry

    health = {
        "_schema": "map_data_citation_health_v1",
        "checked_at": run_checked_at,
        "urls": urls,
    }
    with open(CITATION_HEALTH_PATH, "w", encoding="utf-8") as f:
        json.dump(health, f, indent=2)
        f.write("\n")
    print(f"Citation health for {len(urls)} URL(s) written to {CITATION_HEALTH_PATH}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=0,
                    help="max URLs to check this run, 0 = no cap (default: 0)")
    ap.add_argument("--max-age-days", type=int, default=0,
                    help="skip URLs checked within this many days, 0 = always check every URL "
                         "(default: 0, matches this script's historical behavior)")
    ap.add_argument("--workers", type=int, default=MAX_WORKERS)
    ap.add_argument("--timeout", type=int, default=TIMEOUT)
    args = ap.parse_args()

    start = time.time()
    results = run_validation(limit=args.limit, max_age_days=args.max_age_days,
                              workers=args.workers, timeout=args.timeout)
    elapsed = time.time() - start

    total = len(results["ok"]) + len(results["broken"]) + len(results["warning"])
    print(f"\n{'='*60}")
    print(f"Validation complete in {elapsed:.1f}s")
    print(f"  OK:       {len(results['ok'])}/{total}")
    print(f"  Warnings: {len(results['warning'])}/{total}")
    print(f"  Broken:   {len(results['broken'])}/{total}")

    if results["broken"]:
        print("\nBROKEN URLs:")
        for b in results["broken"]:
            print(f"  [{b.get('status','ERR')}] {b['url']}")
            print(f"        Context: {b['context']}")
            if b.get("error"):
                print(f"        Error:   {b['error']}")

    write_report_to_map_data(results)
    write_citation_health(results)

    return 1 if results["broken"] else 0


if __name__ == "__main__":
    sys.exit(main())
