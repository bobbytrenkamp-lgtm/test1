"""DataCenterMap.com adapter.

DataCenterMap provides a public directory of data centers.  Their robots.txt
permits crawling; this adapter fetches only their publicly accessible
search/listing pages and is rate-limited to stay within polite crawl limits.

No authentication or API key is required.
"""
from __future__ import annotations

import re
import time
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields, normalize_state
from . import BaseAdapter

BASE_URL = "https://www.datacentermap.com"
US_INDEX_URL = f"{BASE_URL}/usa/"

# Rate limit: 1 request per 2 seconds (well within polite crawl limits).
# A real 2026-07-30 CI run showed every single request getting HTTP 429
# despite this delay (confirmed via the logging added below — previously
# this was invisible, silently swallowed as "0 new records"). Retrying a
# 429 with backoff is the correct response regardless of root cause; if the
# site is rate-limiting per request rather than by pace, or blocking the
# shared CI IP range outright, the retries will exhaust and log that too,
# rather than going silent again.
_REQUEST_DELAY = 2.0
_MAX_429_RETRIES = 3

_STATE_SLUGS: list[str] = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
    "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
    "missouri", "montana", "nebraska", "nevada", "new-hampshire", "new-jersey",
    "new-mexico", "new-york", "north-carolina", "north-dakota", "ohio",
    "oklahoma", "oregon", "pennsylvania", "rhode-island", "south-carolina",
    "south-dakota", "tennessee", "texas", "utah", "vermont", "virginia",
    "washington", "west-virginia", "wisconsin", "wyoming",
    "district-of-columbia",
]


def _get(session, url: str) -> "requests.Response | None":
    for attempt in range(1, _MAX_429_RETRIES + 2):    # + the initial try
        try:
            time.sleep(_REQUEST_DELAY)
            r = session.get(url, timeout=30)
            if r.status_code == 429:
                retry_after = r.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else 5.0 * attempt
                if attempt <= _MAX_429_RETRIES:
                    print(f"  [datacentermap] 429 for {url}, retrying in {wait:.0f}s "
                          f"(attempt {attempt}/{_MAX_429_RETRIES})")
                    time.sleep(wait)
                    continue
            r.raise_for_status()
            return r
        except Exception as e:                       # noqa: BLE001
            # This used to swallow the exception with no trace at all, which
            # is indistinguishable from "the state page legitimately has
            # nothing new" — confirmed via CI run history that this adapter
            # had fetched exactly 0 records on every run since it was added,
            # including the very first unbounded backfill, which a genuine
            # empty result set would not explain. The real cause, once
            # visible: every request was getting HTTP 429. Print (not raise)
            # since a single dead page out of ~50 state pages + per-facility
            # pages is expected and shouldn't abort the whole crawl — but it
            # must be visible, not silent.
            print(f"  [datacentermap] request failed for {url}: {type(e).__name__}: {e}")
            return None
    print(f"  [datacentermap] gave up on {url} after {_MAX_429_RETRIES} retries (still 429)")
    return None


def _parse_facility_page(html: str, url: str, source_id: str) -> FacilityRecord | None:
    """Extract structured data from a DCM facility detail page."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise RuntimeError("beautifulsoup4 is required: pip install beautifulsoup4")

    soup = BeautifulSoup(html, "html.parser")

    name_el = soup.find("h1")
    name = name_el.get_text(strip=True) if name_el else ""
    if not name:
        return None

    r = FacilityRecord()
    r.name = name
    r.source_urls.append(url)

    # Try to extract structured address from schema.org markup or visible text
    schema = soup.find("script", {"type": "application/ld+json"})
    if schema:
        import json
        try:
            ld = json.loads(schema.string or "")
            addr = ld.get("address", {})
            r.street_address = addr.get("streetAddress", "")
            r.city = addr.get("addressLocality", "")
            raw_state = addr.get("addressRegion", "")
            full, abbr = normalize_state(raw_state)
            r.state = full or raw_state
            r.state_abbr = abbr
            r.zip_code = addr.get("postalCode", "")
            r.operator = ld.get("name", name)

            geo = ld.get("geo", {})
            if geo.get("latitude") and geo.get("longitude"):
                try:
                    r.latitude = float(geo["latitude"])
                    r.longitude = float(geo["longitude"])
                except (TypeError, ValueError):
                    pass
        except (json.JSONDecodeError, AttributeError):
            pass

    # Fallback: look for address in visible page text
    if not r.city:
        addr_block = soup.find(class_=re.compile(r"address|location", re.I))
        if addr_block:
            text = addr_block.get_text(" ", strip=True)
            r.street_address = text[:100]

    r.primary_source = source_id
    r.confidence_tier = 2

    # Try to extract DCM listing ID from URL
    m = re.search(r"/datacenters/([^/]+)/?$", url)
    if m:
        r.dcm_id = m.group(1)

    normalize_record_fields(r)
    return r


def _discover_listing_urls(session, state_slug: str) -> list[str]:
    """Return facility detail URLs listed under a state page."""
    url = f"{BASE_URL}/usa/{state_slug}/"
    resp = _get(session, url)
    if not resp:
        return []
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []
    soup = BeautifulSoup(resp.text, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/datacenters/" in href:
            full = href if href.startswith("http") else BASE_URL + href
            if full not in links:
                links.append(full)
    if not links:
        # The request succeeded (status 2xx) but nothing matched the
        # /datacenters/ link pattern — either this state page genuinely
        # lists none, or the site's markup changed and the selector no
        # longer matches anything. Print so a systemic pattern (every
        # state, every run) is visible rather than reading as normal.
        print(f"  [datacentermap] no /datacenters/ links found on {url} "
              f"(page fetched OK, len={len(resp.text)})")
    return links


class DataCenterMapAdapter(BaseAdapter):
    """Scrapes publicly available data center listings from DataCenterMap.com."""

    def __init__(self, source: FacilitySource):
        super().__init__(source)

    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        try:
            import requests
            from bs4 import BeautifulSoup  # noqa: F401 — verify it's installed
        except ImportError as e:
            raise RuntimeError(
                f"Missing dependency: {e}. Install with: pip install requests beautifulsoup4"
            )

        session = requests.Session()
        session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (compatible; US-DC-Map-Bot/1.0; "
                "+https://github.com/bobbytrenkamp-lgtm/test1)"
            )
        })

        seen_urls: set[str] = set()

        for state_slug in _STATE_SLUGS:
            listing_urls = _discover_listing_urls(session, state_slug)
            for url in listing_urls:
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                resp = _get(session, url)
                if not resp:
                    continue
                record = _parse_facility_page(resp.text, url, self.source_id)
                if record:
                    yield self._stamp(record)
