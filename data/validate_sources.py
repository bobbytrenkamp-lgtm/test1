#!/usr/bin/env python3
"""
Validate all source URLs in the data files and report broken links.
Runs weekly via GitHub Actions and writes results to map_data.json
under the 'validation_report' key so the frontend can surface them.

Exit codes:
  0 — all URLs OK (or no URLs to check)
  1 — one or more URLs broken
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
MAP_DATA_PATH = os.path.join(DATA_DIR, "map_data.json")
SAMPLE_LAYERS_PATH = os.path.join(DATA_DIR, "sample_layers.json")
STATE_REGS_PATH = os.path.join(DATA_DIR, "state_regulations.json")

TIMEOUT = 10
MAX_WORKERS = 8
USER_AGENT = (
    "Mozilla/5.0 (compatible; DataCenterRestrictionsMap/1.0; "
    "+https://github.com/bobbytrenkamp-lgtm/test1)"
)


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
        with open(MAP_DATA_PATH) as f:
            md = json.load(f)
        for fips, county in md.get("counties", {}).items():
            ctx = f"map_data.json / {fips} ({county['name']})"
            for url, c in extract_urls_from_sources(county.get("sources", []), ctx):
                urls.append((url, c))
    except Exception as e:
        print(f"[WARN] Could not read map_data.json: {e}", file=sys.stderr)

    # sample_layers.json — facility sources
    try:
        with open(SAMPLE_LAYERS_PATH) as f:
            sl = json.load(f)
        for category in ("data_centers", "ai_campuses", "power_infrastructure"):
            for item in sl.get(category, []):
                ctx = f"sample_layers.json / {category} / {item.get('id','?')} ({item.get('name','?')})"
                for url, c in extract_urls_from_sources(item.get("sources", []), ctx):
                    urls.append((url, c))
    except Exception as e:
        print(f"[WARN] Could not read sample_layers.json: {e}", file=sys.stderr)

    # state_regulations.json — state sources
    try:
        with open(STATE_REGS_PATH) as f:
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


def check_url(url, context):
    """HEAD request with fallback to GET. Returns (url, context, status, error)."""
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("User-Agent", USER_AGENT)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return url, context, resp.status, None
    except urllib.error.HTTPError as e:
        if e.code in (405, 403):
            # Some servers block HEAD — retry with GET
            req2 = urllib.request.Request(url, method="GET")
            req2.add_header("User-Agent", USER_AGENT)
            try:
                with urllib.request.urlopen(req2, timeout=TIMEOUT) as resp2:
                    return url, context, resp2.status, None
            except urllib.error.HTTPError as e2:
                return url, context, e2.code, str(e2)
            except Exception as e2:
                return url, context, None, str(e2)
        return url, context, e.code, str(e)
    except Exception as e:
        return url, context, None, str(e)


def run_validation():
    urls = collect_all_urls()
    print(f"Checking {len(urls)} unique source URLs...")

    results = {"ok": [], "broken": [], "warning": []}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(check_url, url, ctx): (url, ctx) for url, ctx in urls}
        for i, future in enumerate(as_completed(futures), 1):
            url, context, status, error = future.result()
            label = f"[{i:3d}/{len(urls)}]"
            if error is None and status and 200 <= status < 400:
                print(f"{label} OK  {status}  {url}")
                results["ok"].append({"url": url, "status": status, "context": context})
            elif status and 400 <= status < 500 and status != 404:
                # 4xx other than 404 (e.g. 429 rate-limit) — treat as warning
                print(f"{label} WARN {status}  {url}  ({context})")
                results["warning"].append({"url": url, "status": status, "context": context, "error": error})
            else:
                code = status if status else "ERR"
                print(f"{label} FAIL {code}  {url}  ({context})")
                results["broken"].append({"url": url, "status": status, "context": context, "error": error})

    return results


def write_report_to_map_data(results):
    """Embed the validation report in map_data.json so the frontend can expose it."""
    try:
        with open(MAP_DATA_PATH) as f:
            md = json.load(f)
    except Exception:
        md = {}

    md["validation_report"] = {
        "last_run": datetime.now(timezone.utc).isoformat(),
        "total_checked": len(results["ok"]) + len(results["broken"]) + len(results["warning"]),
        "ok": len(results["ok"]),
        "broken": len(results["broken"]),
        "warnings": len(results["warning"]),
        "broken_urls": results["broken"],
        "warning_urls": results["warning"],
    }

    with open(MAP_DATA_PATH, "w") as f:
        json.dump(md, f, indent=2)

    print(f"\nValidation report written to map_data.json")


def main():
    start = time.time()
    results = run_validation()
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

    return 1 if results["broken"] else 0


if __name__ == "__main__":
    sys.exit(main())
