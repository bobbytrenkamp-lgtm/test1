"""Legistar adapter — query the Legistar legislative management API.

Many city and county councils use Legistar (a Granicus product) to manage
legislation. The public API is at https://webapi.legistar.com/v1/{client}/...
and requires no authentication for public records.
"""
from __future__ import annotations
import json
import re
from ..fetch import fetch_url, FetchError
from ..normalize import normalize_rss_entries, _TRIGGER_RE, EXCERPT_LEN
from ..classify import classify_policy_types, classify_lifecycle_stage, score_relevance
from ..models import PolicyCandidate, PolicySource
from datetime import datetime, timezone
import hashlib

LEGISTAR_BASE = "https://webapi.legistar.com/v1"

# Well-known Legistar client slugs for covered jurisdictions
LEGISTAR_CLIENTS: dict[str, str] = {
    "nashville":    "nashville",
    "minneapolis":  "minneapolis",
    "austin":       "austin",
    "sfgov":        "sfgov",
}

SEARCH_KEYWORDS = [
    "data center", "moratorium", "ban", "restriction", "cryptocurrency",
    "artificial intelligence", "zoning", "energy efficiency", "water use",
]


def _client_from_source(source: PolicySource) -> str | None:
    """Map a PolicySource to a Legistar client slug, or return None."""
    name = source.id.lower()
    for key, client in LEGISTAR_CLIENTS.items():
        if key in name:
            return client
    # Derive from jurisdiction name
    slug = re.sub(r"[^a-z0-9]", "", source.jurisdiction_name.lower())
    # Try common patterns
    for key, client in LEGISTAR_CLIENTS.items():
        if key in slug:
            return client
    return None


def _make_candidate_id(source_id: str, matter_id: str) -> str:
    digest = hashlib.sha256(f"{source_id}:{matter_id}".encode()).hexdigest()[:12]
    return f"{re.sub(r'[^a-z0-9]', '-', source_id.lower())[:24]}-{digest}"


def run(source: PolicySource) -> tuple[list[PolicyCandidate], str | None]:
    """Search Legistar for policy-relevant matters in the jurisdiction."""
    client = _client_from_source(source)
    if not client:
        # Fall back to generic HTML for unknown clients
        from . import generic_html
        return generic_html.run(source)

    candidates: list[PolicyCandidate] = []
    for keyword in SEARCH_KEYWORDS[:5]:  # Limit API calls per run
        url = f"{LEGISTAR_BASE}/{client}/matters?$filter=contains(MatterTitle,'{keyword}')&$top=20"
        try:
            _status, body = fetch_url(url, check_robots=False)
        except FetchError:
            continue
        try:
            matters = json.loads(body)
        except json.JSONDecodeError:
            continue
        if not isinstance(matters, list):
            continue

        for m in matters:
            title = m.get("MatterTitle", "")
            summary = m.get("MatterBodyName", "") + " " + m.get("MatterStatusName", "")
            combined = f"{title} {summary}"
            if not _TRIGGER_RE.search(combined):
                continue
            confidence = score_relevance(combined, source.policy_types)
            if confidence < 0.2:
                continue
            matter_id = str(m.get("MatterId", ""))
            link = f"https://legistar.com/{client}/matters/{matter_id}"
            candidates.append(PolicyCandidate(
                candidate_id=_make_candidate_id(source.id, matter_id),
                source_id=source.id,
                discovered_at=datetime.now(timezone.utc).isoformat(),
                jurisdiction_name=source.jurisdiction_name,
                state=source.state,
                state_abbr=source.state_abbr,
                fips=source.fips,
                title=title,
                description=summary[:EXCERPT_LEN],
                signal_url=link,
                lifecycle_stage=classify_lifecycle_stage(combined),
                policy_types=classify_policy_types(combined) or source.policy_types,
                confidence=confidence,
                evidence=combined[:EXCERPT_LEN],
                existing_fips_match=None,
                review_status="pending",
            ))

    return candidates, None
