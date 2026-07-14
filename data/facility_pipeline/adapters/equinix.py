"""Equinix IBX data center locations adapter.

Scrapes Equinix's public data center location pages — no authentication
required. All Equinix IBX locations are published publicly at:
  https://www.equinix.com/data-centers/americas-colocation/united-states-colocation/

Each IBX page contains: name, city, state, address, and sometimes power/sqft.

Tier: 1 (company_official) — this is the operator's own published information.

Rate limit: 1 request per 2 seconds (polite crawl).
"""
from __future__ import annotations

import re
import time
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields, normalize_state
from . import BaseAdapter

BASE_URL = "https://www.equinix.com"
US_ROOT = f"{BASE_URL}/data-centers/americas-colocation/united-states-colocation/"

_REQUEST_DELAY = 2.0

# Equinix IBX codes by US state slug (as they appear in URLs)
# Full list maintained at equinix.com; update as new IBXs open.
_STATE_SLUGS = [
    "arizona-data-centers",
    "california-data-centers",
    "colorado-data-centers",
    "florida-data-centers",
    "georgia-data-centers",
    "illinois-data-centers",
    "maryland-data-centers",
    "massachusetts-data-centers",
    "michigan-data-centers",
    "minnesota-data-centers",
    "new-jersey-data-centers",
    "new-york-data-centers",
    "north-carolina-data-centers",
    "ohio-data-centers",
    "oregon-data-centers",
    "pennsylvania-data-centers",
    "texas-data-centers",
    "utah-data-centers",
    "virginia-data-centers",
    "washington-data-centers",
    "washington-dc-data-centers",
]


def _get(session, url: str):
    try:
        time.sleep(_REQUEST_DELAY)
        r = session.get(url, timeout=30)
        r.raise_for_status()
        return r
    except Exception:
        return None


def _ibx_page_to_record(html: str, url: str, source_id: str) -> FacilityRecord | None:
    """Extract facility record from an Equinix IBX detail page."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise RuntimeError("beautifulsoup4 required: pip install beautifulsoup4")

    soup = BeautifulSoup(html, "html.parser")

    # IBX name from page title or h1
    name = ""
    h1 = soup.find("h1")
    if h1:
        name = h1.get_text(strip=True)
    if not name:
        title = soup.find("title")
        if title:
            name = title.get_text(strip=True).split("|")[0].strip()

    if not name:
        return None

    r = FacilityRecord()
    r.name = name
    r.operator = "Equinix"
    r.source_urls.append(url)

    # Try structured data first
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            import json
            ld = json.loads(script.string or "")
            if not isinstance(ld, dict):
                continue
            addr = ld.get("address", {})
            if addr:
                r.street_address = addr.get("streetAddress", "")
                r.city = addr.get("addressLocality", "")
                raw_st = addr.get("addressRegion", "")
                full, abbr = normalize_state(raw_st)
                r.state = full or raw_st
                r.state_abbr = abbr
                r.zip_code = addr.get("postalCode", "")
            geo = ld.get("geo", {})
            if geo:
                try:
                    r.latitude = float(geo["latitude"])
                    r.longitude = float(geo["longitude"])
                except (KeyError, TypeError, ValueError):
                    pass
        except Exception:
            continue

    # Fallback: extract IBX code from URL
    ibx_match = re.search(r"/([a-z]{2}\d+)/?$", url, re.IGNORECASE)
    if ibx_match:
        ibx_code = ibx_match.group(1).upper()
        if not r.name or r.name == name:
            # Prefix IBX code if not already in name
            if ibx_code not in r.name:
                r.name = f"Equinix {ibx_code}"

    # Extract state from URL slug if not found in page
    if not r.state:
        url_parts = url.lower().split("/")
        for part in url_parts:
            if "-data-centers" in part:
                state_slug = part.replace("-data-centers", "").replace("-", " ")
                full, abbr = normalize_state(state_slug)
                if full:
                    r.state = full
                    r.state_abbr = abbr
                break

    # Try to extract power capacity from page text
    text = soup.get_text(" ", strip=True)
    mw_m = re.search(r"(\d[\d,]*(?:\.\d+)?)\s*MW\b", text, re.IGNORECASE)
    if mw_m:
        try:
            r.capacity_mw_known = float(mw_m.group(1).replace(",", ""))
        except ValueError:
            pass

    # Facility classification
    r.facility_type = "colocation"
    r.is_colocation = True
    r.is_hyperscale = False
    r.operational_status = "operational"
    r.primary_source = source_id
    r.confidence_tier = 1
    r.confidence_score = 0.92

    normalize_record_fields(r)
    return r


def _discover_ibx_urls(session, state_url: str) -> list[str]:
    """Find IBX detail page URLs from a state listing page."""
    resp = _get(session, state_url)
    if not resp:
        return []
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    urls = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # IBX pages end in patterns like /ny6/ or /sv1/
        if re.search(r"/[a-z]{2}\d+/?$", href, re.IGNORECASE):
            full = href if href.startswith("http") else BASE_URL + href
            if full not in urls and "equinix.com" in full:
                urls.append(full)
    return urls


class EquinixAdapter(BaseAdapter):
    """Fetches Equinix IBX data center locations from their public website.

    This is a Tier-1 (company_official) source. Records are added directly
    to master (no candidate review required) because they come from the
    operator's own published pages.
    """

    def __init__(self, source: FacilitySource):
        super().__init__(source)

    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        try:
            import requests
            from bs4 import BeautifulSoup  # noqa: F401
        except ImportError as e:
            raise RuntimeError(f"Missing dependency: {e}. Run: pip install requests beautifulsoup4")

        session = requests.Session()
        session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (compatible; US-AI-Infrastructure-Map/1.0; "
                "research/datacenter-map)"
            ),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        })

        seen: set[str] = set()

        for state_slug in _STATE_SLUGS:
            state_url = f"{US_ROOT}{state_slug}/"
            ibx_urls = _discover_ibx_urls(session, state_url)

            for url in ibx_urls:
                if url in seen:
                    continue
                seen.add(url)

                resp = _get(session, url)
                if not resp:
                    continue

                record = _ibx_page_to_record(resp.text, url, self.source_id)
                if record and (record.name or record.city):
                    yield self._stamp(record)
