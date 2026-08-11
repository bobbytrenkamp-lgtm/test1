"""CyrusOne data center locations adapter.

Scrapes CyrusOne's public data center location pages:
  https://cyrusone.com/data-centers/

CyrusOne's detail pages carry no JSON-LD address/geo schema (confirmed via
a live probe, 2026-08-11) -- unlike Equinix/Digital Realty, location comes
from the page's own <h1>/<title>, which consistently reads "<City>, <ST>:
<facility codes>" (e.g. "Chandler, AZ: PHX1-PHX8"), confirmed live against
a real detail page. Facility identity comes from the URL slug (one campus
page can host multiple named buildings, e.g. PHX1-PHX8) and the facility
codes parsed out of the title/h1.

Tier: 1 (company_official) -- the operator's own published pages, but
confidence is set slightly below Equinix/Digital Realty's 0.92 since
location is heuristically parsed from page text rather than a structured
PostalAddress/geo schema.

Rate limit: 1 request per 2 seconds.
"""
from __future__ import annotations

import re
import time
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields, normalize_state
from . import BaseAdapter

BASE_URL = "https://cyrusone.com"
US_LOCATIONS_URL = f"{BASE_URL}/data-centers/"

_REQUEST_DELAY = 2.0

# "Chandler, AZ: PHX1-PHX8" -> city="Chandler", state_abbr="AZ", codes="PHX1-PHX8"
_TITLE_RE = re.compile(r"^\s*([A-Za-z .'\-]+?),\s*([A-Z]{2})\s*:\s*(.+?)\s*$")


def _get(session, url: str):
    try:
        time.sleep(_REQUEST_DELAY)
        r = session.get(url, timeout=30)
        r.raise_for_status()
        return r
    except Exception as e:                          # noqa: BLE001
        print(f"  [cyrusone] request failed for {url}: {type(e).__name__}: {e}")
        return None


def _parse_facility_page(html: str, url: str, source_id: str) -> FacilityRecord | None:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise RuntimeError("beautifulsoup4 required: pip install beautifulsoup4")

    soup = BeautifulSoup(html, "html.parser")

    h1 = soup.find("h1")
    h1_text = h1.get_text(strip=True) if h1 else ""
    if not h1_text:
        title = soup.find("title")
        if title:
            h1_text = title.get_text(strip=True).split("|")[0].strip()
    if not h1_text:
        return None

    m = _TITLE_RE.match(h1_text)

    r = FacilityRecord()
    r.operator = "CyrusOne"
    r.source_urls.append(url)

    if m:
        city, state_abbr, codes = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        r.city = city
        full, abbr = normalize_state(state_abbr)
        r.state = full or state_abbr
        r.state_abbr = abbr or state_abbr
        r.name = f"CyrusOne {codes}"
    else:
        # Slug still identifies the campus even if the title format varies --
        # never silently drop a real page just because the title regex missed.
        slug = url.rstrip("/").rsplit("/", 1)[-1]
        r.name = f"CyrusOne {slug.replace('-', ' ').title()}"

    if not r.name and not r.city:
        return None

    r.facility_type = "colocation"
    r.is_colocation = True
    r.operational_status = "operational"
    r.primary_source = source_id
    r.confidence_tier = 1
    r.confidence_score = 0.85

    normalize_record_fields(r)
    return r


def _discover_facility_urls(session) -> list[str]:
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
        # Confirmed live pattern: /data-centers/north-america/<slug>[?hsLang=en]
        if re.search(r"/data-centers/north-america/[^/?]+", href):
            full = href.split("?")[0]
            if not full.startswith("http"):
                full = BASE_URL + full
            if full not in urls:
                urls.append(full)

    return urls


class CyrusOneAdapter(BaseAdapter):
    """Fetches CyrusOne data center locations from their public website.

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

            resp = _get(session, url)
            if not resp:
                continue

            record = _parse_facility_page(resp.text, url, self.source_id)
            if record:
                yield self._stamp(record)
