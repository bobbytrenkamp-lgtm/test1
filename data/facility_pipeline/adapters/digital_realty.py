"""Digital Realty Trust data center locations adapter.

Scrapes Digital Realty's public data center location pages:
  https://www.digitalrealty.com/data-centers/

Each facility page includes: name, city, state, address, and sometimes
power capacity and square footage.

Tier: 1 (company_official)
Rate limit: 1 request per 2 seconds.
"""
from __future__ import annotations

import json
import re
import time
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields, normalize_state
from . import BaseAdapter

BASE_URL = "https://www.digitalrealty.com"
US_LOCATIONS_URL = f"{BASE_URL}/data-centers/"

_REQUEST_DELAY = 2.0


def _get(session, url: str):
    try:
        time.sleep(_REQUEST_DELAY)
        r = session.get(url, timeout=30)
        r.raise_for_status()
        return r
    except Exception:
        return None


def _parse_facility_page(html: str, url: str, source_id: str) -> FacilityRecord | None:
    """Extract a FacilityRecord from a Digital Realty facility detail page."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise RuntimeError("beautifulsoup4 required: pip install beautifulsoup4")

    soup = BeautifulSoup(html, "html.parser")

    r = FacilityRecord()
    r.operator = "Digital Realty"
    r.source_urls.append(url)

    # Try JSON-LD structured data
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            ld = json.loads(script.string or "")
            if not isinstance(ld, dict):
                continue
            r.name = ld.get("name", "")
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

    # Fall back to h1 for name
    if not r.name:
        h1 = soup.find("h1")
        if h1:
            r.name = h1.get_text(strip=True)

    # Extract DLR campus code from URL (e.g. IAD-19, DFW-5)
    campus_match = re.search(r"/([A-Z]{2,3}-\d+)/?$", url, re.IGNORECASE)
    if campus_match:
        campus_code = campus_match.group(1).upper()
        r.name = r.name or f"Digital Realty {campus_code}"

    if not r.name and not r.city:
        return None

    # Extract capacity from page text
    text = soup.get_text(" ", strip=True)
    mw_m = re.search(r"(\d[\d,]*(?:\.\d+)?)\s*(?:MW|megawatt)", text, re.IGNORECASE)
    if mw_m:
        try:
            r.capacity_mw_known = float(mw_m.group(1).replace(",", ""))
        except ValueError:
            pass

    sqft_m = re.search(r"([\d,]+)\s*(?:sq(?:uare)?\s*f(?:ee)?t|SF)\b", text, re.IGNORECASE)
    if sqft_m:
        try:
            r.building_sqft = float(sqft_m.group(1).replace(",", ""))
        except ValueError:
            pass

    r.facility_type = "colocation"
    r.is_colocation = True
    r.operational_status = "operational"
    r.primary_source = source_id
    r.confidence_tier = 1
    r.confidence_score = 0.92

    normalize_record_fields(r)
    return r


def _discover_facility_urls(session) -> list[str]:
    """Find US facility detail page URLs from the Digital Realty locations page."""
    resp = _get(session, US_LOCATIONS_URL)
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
        # Facility pages typically match /data-centers/<location>/<campus>/
        if re.search(r"/data-centers/[^/]+/[^/]+/?$", href):
            full = href if href.startswith("http") else BASE_URL + href
            # Filter to US facilities only
            if "digitalrealty.com" in full or not href.startswith("http"):
                if full not in urls:
                    urls.append(full)

    return urls


class DigitalRealtyAdapter(BaseAdapter):
    """Fetches Digital Realty Trust data center locations from their public website.

    Tier 1 (company_official). Records are added directly to master.
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
        })

        seen: set[str] = set()
        urls = _discover_facility_urls(session)

        for url in urls:
            if url in seen:
                continue
            seen.add(url)

            # Skip non-US URLs if detectable from URL structure
            if any(
                region in url.lower()
                for region in ["/europe/", "/apac/", "/asia/", "/emea/", "/africa/"]
            ):
                continue

            resp = _get(session, url)
            if not resp:
                continue

            record = _parse_facility_page(resp.text, url, self.source_id)
            if record:
                yield self._stamp(record)
