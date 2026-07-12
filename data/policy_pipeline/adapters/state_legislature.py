"""State legislature adapter — search bill databases for relevant legislation.

Each state has a different web-based bill search. This adapter builds
keyword-based search URLs for known state legislature sites and parses
the resulting HTML. Falls back to generic HTML if a state-specific
approach is not implemented.
"""
from __future__ import annotations
import re
from ..fetch import fetch_url, FetchError
from ..normalize import normalize_html_page
from ..models import PolicyCandidate, PolicySource

# Search URL templates for states with predictable keyword search patterns.
# {keyword} is replaced with a URL-encoded search term.
# These patterns are built from well-documented public legislature search APIs.
SEARCH_TEMPLATES: dict[str, str] = {
    "AZ": "https://www.azleg.gov/bills/?view=all&q={keyword}",
    "CA": "https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml?session_year=20252026&house=Both&author=All&lawCode=All&billNumber=&searchKeywords={keyword}&x=0&y=0",
    "CO": "https://leg.colorado.gov/bills?field_subjects_tid=All&field_bill_type_value=All&search_api_views_fulltext={keyword}&per_page=20",
    "CT": "https://www.cga.ct.gov/asp/cgabillstatus/cgabillstatus.asp?selBillType=Bill&bill_num={keyword}&which_year=2025",
    "IL": "https://www.ilga.gov/legislation/grplist.asp?num1=1&num2=9999&GA=104&TypeID=SB&SessionID=117",
    "IN": "https://iga.in.gov/legislative/2025/bills/search#section=bills&keyword={keyword}",
    "IA": "https://www.legis.iowa.gov/legislation/BillBook?ba={keyword}&ga=91",
    "NC": "https://www.ncleg.gov/Search/BillText/{keyword}",
    "TN": "https://www.legislature.tn.gov/Legislation/BillInfo?BillNumber={keyword}",
    "TX": "https://capitol.texas.gov/Search/TextSearchResults.aspx?LegSess=89R&SearchText={keyword}",
    "VA": "https://lis.virginia.gov/cgi-bin/legp604.exe?251+ful+CHAP0001",
    "WA": "https://app.leg.wa.gov/billsummary?BillNumber={keyword}&Year=2025",
}

SEARCH_KEYWORDS = [
    "data+center", "moratorium", "artificial+intelligence",
    "cryptocurrency+mining", "energy+efficiency", "water+use",
]


def run(source: PolicySource) -> tuple[list[PolicyCandidate], str | None]:
    """Search the state's bill database for relevant legislation."""
    abbr = source.state_abbr
    template = SEARCH_TEMPLATES.get(abbr) if abbr else None

    if not template:
        # No template for this state — use generic HTML on the legislature homepage
        from . import generic_html
        return generic_html.run(source)

    all_candidates: list[PolicyCandidate] = []
    for keyword in SEARCH_KEYWORDS[:3]:  # Limit requests per run
        search_url = template.format(keyword=keyword)
        try:
            _status, html = fetch_url(search_url)
        except FetchError:
            continue
        found = normalize_html_page(
            html=html,
            source_id=source.id,
            source_url=search_url,
            jurisdiction_name=source.jurisdiction_name,
            state=source.state,
            state_abbr=abbr,
            fips=source.fips,
            source_policy_types=source.policy_types,
        )
        all_candidates.extend(found)

    if not all_candidates and source.url:
        # Fall back to the legislature homepage
        from . import generic_html
        return generic_html.run(source)

    return all_candidates, None
