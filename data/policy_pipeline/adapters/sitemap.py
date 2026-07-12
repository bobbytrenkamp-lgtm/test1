"""XML sitemap adapter — discover new ordinance and zoning pages."""
from __future__ import annotations
import re
import xml.etree.ElementTree as ET
from ..fetch import fetch_url, FetchError
from ..normalize import normalize_html_page
from ..models import PolicyCandidate, PolicySource

SM_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"

# Paths that suggest policy-relevant documents
POLICY_PATH_PATTERNS = re.compile(
    r"(ordinance|zoning|moratorium|regulation|data.center|ai|crypto|energy|water|"
    r"resolution|minutes|agenda|legislation|policy|restriction|permit)",
    re.I,
)

MAX_URLS_TO_FETCH = 20   # Limit to avoid excessive requests per run


def _parse_sitemap_urls(xml_text: str) -> list[str]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    urls = []
    for url_el in root.findall(f"{{{SM_NS}}}url"):
        loc = url_el.findtext(f"{{{SM_NS}}}loc")
        if loc:
            urls.append(loc.strip())
    return urls


def run(source: PolicySource) -> tuple[list[PolicyCandidate], str | None]:
    """Fetch sitemap, find policy-relevant URLs, spot-fetch up to MAX_URLS_TO_FETCH."""
    if not source.url:
        return [], "No URL configured for this source"

    try:
        _status, xml_text = fetch_url(source.url)
    except FetchError as e:
        return [], str(e)

    all_urls = _parse_sitemap_urls(xml_text)
    relevant_urls = [u for u in all_urls if POLICY_PATH_PATTERNS.search(u)][:MAX_URLS_TO_FETCH]

    candidates: list[PolicyCandidate] = []
    for url in relevant_urls:
        try:
            _status, html = fetch_url(url)
        except FetchError:
            continue
        found = normalize_html_page(
            html=html,
            source_id=source.id,
            source_url=url,
            jurisdiction_name=source.jurisdiction_name,
            state=source.state,
            state_abbr=source.state_abbr,
            fips=source.fips,
            source_policy_types=source.policy_types,
        )
        candidates.extend(found)

    return candidates, None
