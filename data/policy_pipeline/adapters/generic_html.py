"""Generic HTML page adapter — fetch and keyword-scan a government web page."""
from __future__ import annotations
from ..fetch import fetch_url, FetchError
from ..normalize import normalize_html_page
from ..models import PolicyCandidate, PolicySource


def run(source: PolicySource) -> tuple[list[PolicyCandidate], str | None]:
    """Fetch source.url and return (candidates, error_message).

    Returns an empty list and an error string if fetching fails.
    """
    if not source.url:
        return [], "No URL configured for this source"

    try:
        _status, html = fetch_url(source.url)
    except FetchError as e:
        return [], str(e)

    candidates = normalize_html_page(
        html=html,
        source_id=source.id,
        source_url=source.url,
        jurisdiction_name=source.jurisdiction_name,
        state=source.state,
        state_abbr=source.state_abbr,
        fips=source.fips,
        source_policy_types=source.policy_types,
    )
    return candidates, None
