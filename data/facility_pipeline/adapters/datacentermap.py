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

# Rate limit: 1 request per 2 seconds (well within polite crawl limits)
_REQUEST_DELAY = 2.0

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
    try:
        time.sleep(_REQUEST_DELAY)
        r = session.get(url, timeout=30)
        r.raise_for_status()
        return r
    except Exception:
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
