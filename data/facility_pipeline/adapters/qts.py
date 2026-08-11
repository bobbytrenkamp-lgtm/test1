"""QTS Data Centers locations adapter.

Scrapes QTS's public data center location pages:
  https://www.qtsdatacenters.com/data-centers

QTS's detail pages carry a JSON-LD block, but it's generic WordPress/Yoast
SEO markup (WebPage/Organization/BreadcrumbList) -- confirmed via a live
probe, 2026-08-11 -- not a PostalAddress/geo schema like Equinix/Digital
Realty's. City/state instead comes from the page's og:description meta
tag, which QTS's CMS consistently templates as "...'s <City>, <State>
data center campus..." (confirmed live against a real detail page).
Facility name comes from the <h1> (a clean campus name, e.g. "Ashburn 1").

Tier: 1 (company_official) -- the operator's own published pages, but
confidence is set slightly below Equinix/Digital Realty's 0.92 since
location is heuristically parsed from templated description text rather
than a structured PostalAddress/geo schema.

Rate limit: 1 request per 2 seconds.
"""
from __future__ import annotations

import re
import time
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields, normalize_state
from . import BaseAdapter

BASE_URL = "https://www.qtsdatacenters.com"
US_LOCATIONS_URL = f"{BASE_URL}/data-centers"

_REQUEST_DELAY = 2.0

# "...'s Ashburn, Virginia data center campus..." -> city="Ashburn", state="Virginia"
# Deliberately not anchored on the possessive apostrophe itself: QTS's real
# page used a curly quote (U+2019), not the ASCII one, so anchoring there
# would be one encoding surprise away from silently matching nothing. The
# city capture requires an initial capital letter so a stray trailing "s "
# from an unmatched apostrophe (either quote style) can't leak into it --
# real city names are always capitalized, "s Ashburn" never is.
_OG_DESC_RE = re.compile(
    r"([A-Z][a-zA-Z .\-]*?),\s+([A-Za-z]+)\s+data center campus"
)


def _get(session, url: str):
    try:
        time.sleep(_REQUEST_DELAY)
        r = session.get(url, timeout=30)
        r.raise_for_status()
        return r
    except Exception as e:                          # noqa: BLE001
        print(f"  [qts] request failed for {url}: {type(e).__name__}: {e}")
        return None


def _parse_facility_page(html: str, url: str, source_id: str) -> FacilityRecord | None:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise RuntimeError("beautifulsoup4 required: pip install beautifulsoup4")

    soup = BeautifulSoup(html, "html.parser")

    r = FacilityRecord()
    r.operator = "QTS Data Centers"
    r.source_urls.append(url)

    h1 = soup.find("h1")
    if h1:
        r.name = h1.get_text(strip=True)
    if not r.name:
        slug = url.rstrip("/").rsplit("/", 1)[-1]
        r.name = f"QTS {slug.replace('-', ' ').title()}"
    r.name = f"QTS {r.name}" if not r.name.upper().startswith("QTS") else r.name

    og_desc_tag = soup.find("meta", {"property": "og:description"})
    og_desc = og_desc_tag.get("content", "") if og_desc_tag else ""
    m = _OG_DESC_RE.search(og_desc)
    if m:
        city, state_name = m.group(1).strip(), m.group(2).strip()
        r.city = city
        full, abbr = normalize_state(state_name)
        r.state = full or state_name
        r.state_abbr = abbr

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
        # Confirmed live pattern: /data-centers/<slug>/ (both q.com and
        # qtsdatacenters.com host the same content; normalize to the
        # requesting domain since q.com is QTS's own canonical short-domain).
        m = re.search(r"/data-centers/([a-z0-9\-]+)/?$", href, re.IGNORECASE)
        if not m:
            continue
        slug = m.group(1)
        if slug in ("feed",):  # confirmed noise: /data-centers/feed/ (RSS)
            continue
        full = f"{BASE_URL}/data-centers/{slug}/"
        if full not in urls:
            urls.append(full)

    return urls


class QTSAdapter(BaseAdapter):
    """Fetches QTS Data Centers locations from their public website.

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
