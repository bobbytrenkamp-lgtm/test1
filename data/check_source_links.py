#!/usr/bin/env python3
"""Check the health of every county citation URL and record an archive fallback.

WHY THIS EXISTS
The platform's core claim is that policy records are "verified from primary
government sources", and every county detail panel links out to those sources.
A validation run found 711 of 1,690 checked source URLs unreachable — roughly
two in five citations. A reader who clicks through to check the work hits a dead
page far too often, which undermines the one thing the site is asserting.

Government sites reorganise constantly, so most of these are moved rather than
gone. This script records, per URL:
  - whether it currently resolves, and the final URL after redirects
  - a Wayback Machine snapshot, so a moved page still has a readable citation

The result is written to data/source_link_health.json and read by the frontend
(js/jurisdiction.js), which warns before sending a reader to a known-dead link
and offers the archived copy instead.

Government sites don't just go offline, they also reorganise: a CMS
migration or site redesign moves a page to a new path with no redirect,
which is indistinguishable from "gone" to a plain HTTP check. For a dead
URL, this script also makes a best-effort attempt to find where the page
went by pulling the domain's XML sitemap (if it has one — many gov sites
do) and looking for a same-domain page whose path shares keywords with the
dead one (see find_replacement_candidate()). This is a heuristic suggestion
for a human to confirm, surfaced in the frontend as "may have moved to" —
it is never written back into restrictions_raw.json automatically, since
citations there must stay human-curated and this method can and will guess
wrong sometimes.

IMPORTANT: this never modifies map_data.json or restrictions_raw.json. Link
health is derived, separate, and disposable; the citations themselves are
human-curated and stay authoritative.

Network is required, so this is intended to run in CI (see
.github/workflows/check_source_links.yml), not in a sandbox.

Usage:
    python3 data/check_source_links.py [options]

    --limit N          check at most N URLs this run (default: all)
    --max-age-days N   skip URLs checked within the last N days (default 14)
    --workers N        concurrent requests (default 8)
    --timeout N        per-request timeout in seconds (default 15)
    --no-archive       skip Wayback lookups
    --no-suggest       skip sitemap-based "may have moved to" lookups
    --report-only      print the current summary without making requests
"""
import argparse
import json
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock

ROOT = Path(__file__).parent.parent
MAP_DATA = ROOT / "data" / "map_data.json"
HEALTH = ROOT / "data" / "source_link_health.json"

UA = "USDataCenterPolicyTracker-LinkCheck/1.0 (+https://bobbytrenkamp-lgtm.github.io/test1/)"
WAYBACK_API = "https://archive.org/wayback/available?url="

# Be a good citizen: never hit the same host concurrently without a gap.
HOST_DELAY_S = 1.0
_host_last: dict[str, float] = defaultdict(float)
_host_lock = Lock()


def collect_urls():
    """Every citation URL in map_data.json, mapped to the counties citing it."""
    with open(MAP_DATA, encoding="utf-8") as f:
        counties = json.load(f)["counties"]

    by_url: dict[str, list[str]] = defaultdict(list)
    textual_only: list[str] = []          # citations with no URL at all

    for fips, county in counties.items():
        srcs = county.get("sources") or []
        has_url = False
        for s in srcs:
            url = s if isinstance(s, str) else (s or {}).get("url")
            if isinstance(url, str) and url.startswith(("http://", "https://")):
                by_url[url.strip()].append(fips)
                has_url = True
        if srcs and not has_url:
            textual_only.append(fips)

    return by_url, textual_only


def _throttle(host):
    """Space out requests per host without serialising the whole run."""
    while True:
        with _host_lock:
            now = time.monotonic()
            wait = _host_last[host] + HOST_DELAY_S - now
            if wait <= 0:
                _host_last[host] = now
                return
        time.sleep(min(wait, 2.0))


def _request(url, method, timeout):
    req = urllib.request.Request(url, method=method, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    })
    return urllib.request.urlopen(req, timeout=timeout)


def check_url(url, timeout):
    """Return a health record. HEAD first; many government servers reject it,
    so fall back to GET before believing a failure."""
    host = urllib.parse.urlparse(url).netloc
    _throttle(host)

    for method in ("HEAD", "GET"):
        try:
            with _request(url, method, timeout) as resp:
                return {
                    "ok": 200 <= resp.status < 400,
                    "status": resp.status,
                    "final_url": resp.url if resp.url != url else None,
                    "error": None,
                }
        except urllib.error.HTTPError as e:
            # 4xx/5xx to HEAD is often method-not-allowed; retry with GET.
            if method == "HEAD" and e.code in (400, 403, 405, 501):
                continue
            return {"ok": False, "status": e.code, "final_url": None,
                    "error": f"HTTP {e.code}"}
        except Exception as e:                      # noqa: BLE001 - network is messy
            if method == "HEAD":
                continue
            # type(e).__name__ alone (e.g. "URLError") throws away the actual
            # reason (DNS failure vs TLS cert error vs connection refused vs
            # timeout) — str(e) carries that detail, same as
            # data/policy_pipeline/fetch.py already does. Without it, a run
            # against this file's ~2000 URLs leaves roughly half the failures
            # completely undiagnosable after the fact — confirmed by
            # inspecting a real run's output during a 2026-07-29 audit.
            return {"ok": False, "status": None, "final_url": None,
                    "error": f"{type(e).__name__}: {e}" if str(e) else type(e).__name__}

    return {"ok": False, "status": None, "final_url": None, "error": "unreachable"}


def wayback(url, timeout):
    """Nearest Wayback snapshot, or None. Failures here are never fatal — an
    archive lookup is a bonus, not a requirement."""
    try:
        _throttle("archive.org")
        with _request(WAYBACK_API + urllib.parse.quote(url, safe=""), "GET", timeout) as resp:
            data = json.loads(resp.read().decode("utf-8", "replace"))
        snap = (data.get("archived_snapshots") or {}).get("closest") or {}
        if snap.get("available") and snap.get("url"):
            return {"url": snap["url"], "timestamp": snap.get("timestamp")}
    except Exception:                                # noqa: BLE001
        pass
    return None


# ---------------------------------------------------------------------------
# "May have moved to" — sitemap-based replacement suggestion for dead links.
# ---------------------------------------------------------------------------

_SITEMAP_PATHS = ("/sitemap.xml", "/sitemap_index.xml")
_SITEMAP_TAG_RE = re.compile(r"\{[^}]*\}")   # strips the XML namespace off a tag name
_SITEMAP_FETCH_CAP = 2_000_000               # bytes; some gov sitemaps are huge
_SITEMAP_URL_CAP = 3000                      # stop collecting <loc> entries past this
_SITEMAP_CHILD_CAP = 5                       # child sitemaps to follow from an index

_STOPWORDS = {
    "www", "com", "gov", "org", "net", "html", "htm", "aspx", "asp", "php",
    "index", "home", "page", "pages", "view", "viewer", "docid", "default",
    "content", "public", "portal", "site", "sites", "department", "departments",
}

_sitemap_cache = {}
_sitemap_lock = Lock()


def _tokenize_path(url):
    """Lowercase keyword tokens from a URL's path + query, for keyword-overlap
    matching against sitemap entries. Splits on any non-letter run, so
    'PW-Digital-Gateway.aspx?id=42' -> {'digital', 'gateway'} ('pw' and 'id'
    are too short, 'aspx' is filtered as boilerplate)."""
    parsed = urllib.parse.urlparse(url)
    raw = (parsed.path + " " + parsed.query).lower()
    parts = re.split(r"[^a-z]+", raw)
    return {p for p in parts if len(p) >= 4 and p not in _STOPWORDS}


def _parse_sitemap_xml(xml_bytes):
    """Return (kind, urls) for a sitemap.xml payload: kind is 'urlset' (a
    page listing) or 'sitemapindex' (a listing of other sitemaps), or
    (None, []) if the payload isn't parseable XML."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return None, []
    kind = _SITEMAP_TAG_RE.sub("", root.tag)
    locs = [(el.text or "").strip() for el in root.iter()
            if _SITEMAP_TAG_RE.sub("", el.tag) == "loc" and (el.text or "").strip()]
    return kind, locs


def _fetch_sitemap_urls(domain, timeout):
    """Best-effort list of page URLs from a domain's sitemap(s). Most gov
    sites don't have one at a standard path, or the fetch fails for some
    other reason — that's not an error, it just means no suggestions are
    available for that domain this run."""
    for path in _SITEMAP_PATHS:
        try:
            _throttle(domain)
            with _request(f"https://{domain}{path}", "GET", timeout) as resp:
                body = resp.read(_SITEMAP_FETCH_CAP)
        except Exception:                            # noqa: BLE001
            continue

        kind, locs = _parse_sitemap_xml(body)
        if kind == "urlset" and locs:
            return locs[:_SITEMAP_URL_CAP]

        if kind == "sitemapindex" and locs:
            urls = []
            for child in locs[:_SITEMAP_CHILD_CAP]:
                try:
                    _throttle(domain)
                    with _request(child, "GET", timeout) as resp:
                        cbody = resp.read(_SITEMAP_FETCH_CAP)
                except Exception:                    # noqa: BLE001
                    continue
                urls.extend(_parse_sitemap_xml(cbody)[1])
                if len(urls) >= _SITEMAP_URL_CAP:
                    break
            if urls:
                return urls[:_SITEMAP_URL_CAP]

    return []


def best_sitemap_match(dead_url, candidate_urls):
    """Pure scoring logic, separated out so it's testable without network:
    of candidate_urls, which (if any) shares enough path keywords with
    dead_url to be worth suggesting as its likely new location? Requires at
    least 2 shared keywords (or the single keyword available, for very short
    paths) so a generic term like a county name alone can't match everything
    on that county's own site."""
    dead_tokens = _tokenize_path(dead_url)
    if not dead_tokens:
        return None

    min_overlap = 2 if len(dead_tokens) >= 2 else 1
    best_url, best_score = None, 0
    for cand in candidate_urls:
        if cand == dead_url:
            continue
        score = len(dead_tokens & _tokenize_path(cand))
        if score > best_score:
            best_url, best_score = cand, score

    if best_url and best_score >= min_overlap:
        return {"url": best_url, "score": best_score, "found_via": "sitemap"}
    return None


def find_replacement_candidate(dead_url, timeout):
    """For a confirmed-dead URL, suggest a same-domain page that may be its
    replacement. Heuristic and best-effort: a human should confirm before
    ever citing it as fact, which is why this is surfaced as a suggestion in
    source_link_health.json / the frontend rather than written into
    restrictions_raw.json directly."""
    domain = urllib.parse.urlparse(dead_url).netloc
    if not domain:
        return None

    with _sitemap_lock:
        cached = domain in _sitemap_cache
        urls = _sitemap_cache.get(domain)
    if not cached:
        urls = _fetch_sitemap_urls(domain, timeout)
        with _sitemap_lock:
            _sitemap_cache[domain] = urls

    if not urls:
        return None
    return best_sitemap_match(dead_url, urls)


def load_health():
    if HEALTH.exists():
        try:
            return json.loads(HEALTH.read_text(encoding="utf-8"))
        except Exception:                            # noqa: BLE001
            print("warning: existing health file unreadable, starting fresh")
    return {"_schema": "source_link_health_v1", "checked_at": None, "urls": {}}


def summarise(health, by_url, textual_only):
    urls = health.get("urls", {})
    checked = [r for r in urls.values() if r.get("status") is not None or r.get("error")]
    ok = [r for r in checked if r.get("ok")]
    dead = [r for r in checked if not r.get("ok")]
    archived = [r for r in dead if r.get("archive")]
    suggested = [r for r in dead if r.get("suggested_replacement")]
    return {
        "total_citation_urls": len(by_url),
        "checked": len(checked),
        "reachable": len(ok),
        "unreachable": len(dead),
        "unreachable_pct": round(len(dead) / len(checked) * 100, 1) if checked else 0,
        "unreachable_with_archive": len(archived),
        "unreachable_with_suggested_replacement": len(suggested),
        "counties_with_textual_only_citations": len(textual_only),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--max-age-days", type=int, default=14)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--timeout", type=int, default=15)
    ap.add_argument("--no-archive", action="store_true")
    ap.add_argument("--no-suggest", action="store_true",
                     help="skip sitemap-based \"may have moved to\" lookups")
    ap.add_argument("--report-only", action="store_true")
    args = ap.parse_args()

    by_url, textual_only = collect_urls()
    health = load_health()
    urls = health.setdefault("urls", {})

    if args.report_only:
        s = summarise(health, by_url, textual_only)
        print(json.dumps(s, indent=2))
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=args.max_age_days)
    stale = []
    for url in by_url:
        rec = urls.get(url)
        if not rec or not rec.get("checked_at"):
            stale.append(url)
            continue
        try:
            if datetime.fromisoformat(rec["checked_at"]) < cutoff:
                stale.append(url)
        except Exception:                            # noqa: BLE001
            stale.append(url)

    random.shuffle(stale)                            # spread load across hosts
    if args.limit:
        stale = stale[:args.limit]

    print(f"{len(by_url)} citation URLs; {len(stale)} due for check "
          f"(workers={args.workers}, timeout={args.timeout}s)")
    if not stale:
        print("nothing to do")
        return 0

    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(check_url, u, args.timeout): u for u in stale}
        for fut in as_completed(futures):
            url = futures[fut]
            try:
                res = fut.result()
            except Exception as e:                   # noqa: BLE001
                res = {"ok": False, "status": None, "final_url": None,
                       "error": f"{type(e).__name__}: {e}" if str(e) else type(e).__name__}

            prev = urls.get(url, {})
            rec = {
                "ok": res["ok"],
                "status": res["status"],
                "error": res["error"],
                "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "counties": len(by_url[url]),
            }
            if res["final_url"]:
                rec["final_url"] = res["final_url"]
            # Keep any archive we already had; only look one up for dead links.
            if prev.get("archive"):
                rec["archive"] = prev["archive"]
            if not res["ok"] and not args.no_archive and not rec.get("archive"):
                snap = wayback(url, args.timeout)
                if snap:
                    rec["archive"] = snap
            # Re-attempt on every dead check, not just once: the domain's
            # sitemap is cached in-run so this is cheap, and unlike an
            # archive snapshot (which only gets better with time), a live
            # replacement page found today is more useful than one guessed
            # at weeks ago.
            if not res["ok"] and not args.no_suggest:
                suggestion = find_replacement_candidate(url, args.timeout)
                if suggestion:
                    rec["suggested_replacement"] = suggestion
                else:
                    rec.pop("suggested_replacement", None)
            urls[url] = rec

            done += 1
            if done % 25 == 0 or done == len(stale):
                print(f"  {done}/{len(stale)} checked")

    # SAFETY: refuse to record a run that looks like a local network failure.
    # Every check failing at the connection layer (no HTTP status at all) means
    # the checker could not reach anything — a proxy block, DNS outage, or CI
    # network blip. Writing that would mark thousands of live citations dead and
    # plaster false warnings across the site. A genuine mass-outage of
    # government hosts is not plausible; a broken runner is.
    fresh = [urls.get(u) for u in stale if urls.get(u)]
    no_status = [r for r in fresh if r.get("status") is None]
    if fresh and len(no_status) == len(fresh) and len(fresh) >= 3:
        print(f"\nABORTED: all {len(fresh)} checks failed at the connection layer "
              f"with no HTTP status — the network looks unavailable, not the sites.")
        print("Nothing written. Re-run where outbound HTTPS works (CI).")
        return 2

    # Drop entries for URLs no longer cited anywhere.
    for gone in set(urls) - set(by_url):
        del urls[gone]

    health["_schema"] = "source_link_health_v1"
    health.pop("_note", None)          # the shipped placeholder note is obsolete once real data exists
    health["checked_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    health["summary"] = summarise(health, by_url, textual_only)
    health["counties_with_textual_only_citations"] = sorted(textual_only)

    HEALTH.write_text(json.dumps(health, indent=1, sort_keys=True) + "\n", encoding="utf-8")

    s = health["summary"]
    print(f"\nwrote {HEALTH.relative_to(ROOT)}")
    print(f"  reachable   : {s['reachable']}")
    print(f"  unreachable : {s['unreachable']} ({s['unreachable_pct']}%)"
          f" — {s['unreachable_with_archive']} have an archived copy,"
          f" {s['unreachable_with_suggested_replacement']} have a suggested replacement")
    print(f"  citations with no URL at all: {s['counties_with_textual_only_citations']} counties")
    status = Counter(r.get("status") for r in urls.values())
    print("  status codes:", dict(sorted(status.items(), key=lambda kv: -kv[1])[:6]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
