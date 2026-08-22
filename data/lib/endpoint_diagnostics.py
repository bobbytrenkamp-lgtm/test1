"""data/lib/endpoint_diagnostics.py — shared "is this URL reachable, and if
not, why" engine.

Before this file existed, three scripts each reimplemented the same
HEAD-then-GET-with-fallback HTTP check independently:
data/check_source_links.py (county citations), data/validate_sources.py
(map_data/sample_layers/state_regulations citations), and
data/policy_pipeline/fetch.py (policy source reachability). Only
check_source_links.py had grown real capability on top of that check —
per-host throttling, a Wayback Machine archive lookup for dead links, and a
sitemap-keyword-overlap "may have moved to" suggestion — leaving
validate_sources.py's citations (a *larger* corpus than check_source_links.py's:
county pages plus every facility-layer and state-regulation source) stuck
with a strictly weaker checker for citations that are otherwise identical in
kind. This module is the single place that logic lives now; the checker
scripts import it rather than each keeping their own copy.

It also adds one new thing none of the three had: a pure, offline
classifier (classify_down_reason) that turns a raw check result into *why*
a source is failing, not just *that* it's failing:

  TRANSIENT_FAILURE     first/occasional failure, not yet persistent
  SOURCE_MOVED           still resolves, but redirected to a different domain
  SOURCE_RETIRED         confirmed gone (404/410) with no replacement lead
  ACCESS_BLOCKED         reachable but a bot-wall/challenge page, not the
                         real content (Cloudflare/Akamai/Incapsula/PerimeterX
                         style block, or 403/999 with no other explanation)
  REPLACEMENT_REQUIRED   confirmed dead, but a same-domain replacement
                         candidate exists (sitemap match or Wayback capture)
                         for a human to confirm

This is a *reason* layered on top of data/generate_data_health.py's existing
project-wide health-state vocabulary (OK/SOURCE_DOWN/NETWORK_FAILURE/...),
not a replacement for it — a citation or source is still either "down" or
not per that vocabulary; this module explains why, so the remediation path
differs (a moved source can potentially be auto-repointed once verified, a
retired one can't).
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from threading import Lock

UA = "USDataCenterPolicyTracker-LinkCheck/1.0 (+https://bobbytrenkamp-lgtm.github.io/test1/)"
WAYBACK_API = "https://archive.org/wayback/available?url="

# Be a good citizen: never hit the same host concurrently without a gap.
HOST_DELAY_S = 1.0
_host_last: dict[str, float] = defaultdict(float)
_host_lock = Lock()


def _throttle(host: str) -> None:
    """Space out requests per host without serialising the whole run."""
    while True:
        with _host_lock:
            now = time.monotonic()
            wait = _host_last[host] + HOST_DELAY_S - now
            if wait <= 0:
                _host_last[host] = now
                return
        time.sleep(min(wait, 2.0))


def _request(url: str, method: str, timeout: int):
    req = urllib.request.Request(url, method=method, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    })
    return urllib.request.urlopen(req, timeout=timeout)


def check_url(url: str, timeout: int) -> dict:
    """Return a health record. HEAD first; many government servers reject
    it, so fall back to GET before believing a failure. This is the one
    canonical implementation — check_source_links.py and validate_sources.py
    both call this instead of keeping their own copy."""
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
            # HTTPError.url reflects the request that actually raised it --
            # for a redirect chain that ends in an error, urllib's own
            # HTTPRedirectHandler has already updated it to the final
            # (redirected-to) URL, not the one originally requested. Capturing
            # it here is what makes classify_down_reason's SOURCE_MOVED
            # branch able to fire at all: a URL that redirects to a different
            # domain and *that* domain 404s is "moved to somewhere now also
            # broken," not "never moved" -- distinct, useful information a
            # bare final_url=None would have thrown away.
            final_url = getattr(e, "url", None)
            if final_url == url:
                final_url = None
            return {"ok": False, "status": e.code, "final_url": final_url,
                    "error": f"HTTP {e.code}"}
        except Exception as e:                      # noqa: BLE001 - network is messy
            if method == "HEAD":
                continue
            return {"ok": False, "status": None, "final_url": None,
                    "error": f"{type(e).__name__}: {e}" if str(e) else type(e).__name__}

    return {"ok": False, "status": None, "final_url": None, "error": "unreachable"}


def wayback(url: str, timeout: int):
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

_sitemap_cache: dict[str, list] = {}
_sitemap_lock = Lock()


def _tokenize_path(url: str) -> set:
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


def _fetch_sitemap_urls(domain: str, timeout: int) -> list:
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


def best_sitemap_match(dead_url: str, candidate_urls):
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


def find_replacement_candidate(dead_url: str, timeout: int):
    """For a confirmed-dead URL, suggest a same-domain page that may be its
    replacement. Heuristic and best-effort: a human should confirm before
    ever citing it as fact — callers surface this as a suggestion, never
    apply it automatically to a citation record."""
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


# ---------------------------------------------------------------------------
# down_reason classification — pure, offline, no network calls.
# ---------------------------------------------------------------------------

TRANSIENT_FAILURE = "TRANSIENT_FAILURE"
SOURCE_MOVED = "SOURCE_MOVED"
SOURCE_RETIRED = "SOURCE_RETIRED"
ACCESS_BLOCKED = "ACCESS_BLOCKED"
REPLACEMENT_REQUIRED = "REPLACEMENT_REQUIRED"

DOWN_REASONS = (TRANSIENT_FAILURE, SOURCE_MOVED, SOURCE_RETIRED, ACCESS_BLOCKED, REPLACEMENT_REQUIRED)

# Text seen on bot-wall / challenge-interstitial pages served by common gov
# WAFs and CDNs. A 403 or 999 alone is ambiguous (plenty of real 403s are
# just "you're not authorized"); a marker actually present in the response
# body is much stronger evidence the request was blocked as automated
# traffic rather than legitimately rejected.
_ACCESS_BLOCKED_MARKERS = (
    "cf-browser-verification", "checking your browser", "captcha",
    "access denied", "request blocked", "akamai", "incapsula", "perimeterx",
    "attention required", "cloudflare",
)
_ACCESS_BLOCKED_STATUSES = (403, 429, 999)


def is_access_blocked(status, body_snippet: str | None = None) -> bool:
    if status not in _ACCESS_BLOCKED_STATUSES:
        return False
    if status == 999:
        # 999 has no legitimate meaning other than "you look like a bot" —
        # it's not a standard HTTP status at all, only ever seen from a
        # handful of anti-bot vendors.
        return True
    if body_snippet:
        low = body_snippet.lower()
        return any(marker in low for marker in _ACCESS_BLOCKED_MARKERS)
    return False


def _domain(url: str) -> str:
    return urllib.parse.urlparse(url).netloc.lower()


def classify_down_reason(
    *,
    status,
    error,
    final_url=None,
    original_url=None,
    consecutive_failures=0,
    body_snippet=None,
    has_replacement_candidate=False,
):
    """Given one check result plus a little failure-window context, classify
    *why* a URL is currently failing. Returns None if the check succeeded
    (status is a real success — not this function's concern).

    Pure and offline: every input is data the caller already collected (a
    check_url()/HTTPError result, an optional recent-failure count, an
    optional sitemap/wayback lookup result) — this function makes no
    requests of its own, which is what makes it fully unit-testable.
    """
    if status is not None and 200 <= status < 400:
        return None

    if is_access_blocked(status, body_snippet):
        return ACCESS_BLOCKED

    if final_url and original_url and _domain(final_url) and _domain(final_url) != _domain(original_url):
        # Resolved, but to a different domain than the one we asked for —
        # the resource itself moved somewhere else entirely (e.g. a county
        # GIS portal migrated to a new vendor domain).
        return SOURCE_MOVED

    if status in (404, 410):
        return REPLACEMENT_REQUIRED if has_replacement_candidate else SOURCE_RETIRED

    if (consecutive_failures or 0) < 3:
        return TRANSIENT_FAILURE

    return REPLACEMENT_REQUIRED if has_replacement_candidate else TRANSIENT_FAILURE
