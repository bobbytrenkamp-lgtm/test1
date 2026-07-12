"""Open data portal adapter — query CKAN/Socrata portals for policy datasets.

Covers: data.gov (CKAN), state and municipal Socrata portals.
Does not require API keys for public datasets.
"""
from __future__ import annotations
import json
from ..fetch import fetch_url, FetchError
from ..normalize import normalize_rss_entries
from ..models import PolicyCandidate, PolicySource
from ..classify import classify_policy_types, classify_lifecycle_stage, score_relevance
from ..normalize import _TRIGGER_RE, EXCERPT_LEN
from datetime import datetime, timezone
import hashlib
import re

# data.gov CKAN search
DATAGOV_SEARCH = "https://catalog.data.gov/api/3/action/package_search?q={query}&rows=10"

SEARCH_QUERIES = ["data+center+zoning", "data+center+ordinance", "AI+policy+local"]


def _make_id(source_id: str, resource_id: str) -> str:
    digest = hashlib.sha256(f"{source_id}:{resource_id}".encode()).hexdigest()[:12]
    return f"{re.sub(r'[^a-z0-9]', '-', source_id)[:20]}-{digest}"


def _search_datagov(source: PolicySource) -> list[PolicyCandidate]:
    """Search data.gov CKAN for relevant datasets."""
    candidates: list[PolicyCandidate] = []
    for query in SEARCH_QUERIES[:2]:
        url = DATAGOV_SEARCH.format(query=query)
        try:
            _status, body = fetch_url(url, check_robots=False)
        except FetchError:
            continue
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            continue
        results = data.get("result", {}).get("results", [])
        for pkg in results:
            title = pkg.get("title", "")
            notes = pkg.get("notes", "")
            combined = f"{title} {notes}"
            if not _TRIGGER_RE.search(combined):
                continue
            conf = score_relevance(combined, source.policy_types)
            if conf < 0.2:
                continue
            pkg_id = pkg.get("id", "")
            candidates.append(PolicyCandidate(
                candidate_id=_make_id(source.id, pkg_id),
                source_id=source.id,
                discovered_at=datetime.now(timezone.utc).isoformat(),
                jurisdiction_name=source.jurisdiction_name,
                state=source.state,
                state_abbr=source.state_abbr,
                fips=source.fips,
                title=title,
                description=notes[:EXCERPT_LEN],
                signal_url=f"https://catalog.data.gov/dataset/{pkg.get('name', pkg_id)}",
                lifecycle_stage=classify_lifecycle_stage(combined),
                policy_types=classify_policy_types(combined) or source.policy_types,
                confidence=conf,
                evidence=combined[:EXCERPT_LEN],
                existing_fips_match=None,
                review_status="pending",
            ))
    return candidates


def run(source: PolicySource) -> tuple[list[PolicyCandidate], str | None]:
    """Search the appropriate open data portal."""
    candidates = _search_datagov(source)

    if not candidates and source.url:
        from . import generic_html
        return generic_html.run(source)

    return candidates, None
