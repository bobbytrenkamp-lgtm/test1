"""Normalize raw fetched content into PolicyCandidate objects."""
from __future__ import annotations
import hashlib
import re
from datetime import datetime, timezone
from typing import Optional
from .models import PolicyCandidate
from .classify import classify_policy_types, classify_level, classify_lifecycle_stage, score_relevance

# Keywords that signal policy-relevant content worth flagging
TRIGGER_KEYWORDS = [
    "moratorium", "ban", "prohibit", "restriction", "ordinance", "zoning",
    "data center", "datacenter", "cryptocurrency mining", "crypto mining",
    "artificial intelligence", r"\bai\b", "facial recognition",
    "energy efficiency", "demand response", "water use", "groundwater",
    "high.intensity computing", "tax exemption", "incentive program",
    "environmental review", "ceqa", "sepa", "impact assessment",
]
_TRIGGER_RE = re.compile("|".join(TRIGGER_KEYWORDS), re.I)

# Minimum confidence to add to candidates
MIN_CONFIDENCE = 0.25

# Max excerpt length for evidence field
EXCERPT_LEN = 500


def _make_candidate_id(source_id: str, title: str, fips: Optional[str]) -> str:
    raw = f"{source_id}:{title}:{fips or ''}"
    digest = hashlib.sha256(raw.encode()).hexdigest()[:12]
    safe_source = re.sub(r"[^a-z0-9]", "-", source_id.lower())[:30]
    return f"{safe_source}-{digest}"


def _extract_text(html: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _find_surrounding_excerpt(text: str, keyword_match_pos: int, window: int = 250) -> str:
    start = max(0, keyword_match_pos - window)
    end = min(len(text), keyword_match_pos + window)
    excerpt = text[start:end].strip()
    if start > 0:
        excerpt = "…" + excerpt
    if end < len(text):
        excerpt = excerpt + "…"
    return excerpt[:EXCERPT_LEN]


def extract_date_from_text(text: str) -> Optional[str]:
    """Try to pull an ISO-format or common US date from text."""
    iso = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    if iso:
        return iso.group(1)
    us = re.search(r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b", text)
    if us:
        m, d, y = us.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"
    return None


def normalize_html_page(
    html: str,
    source_id: str,
    source_url: str,
    jurisdiction_name: str,
    state: Optional[str],
    state_abbr: Optional[str],
    fips: Optional[str],
    source_policy_types: list[str],
) -> list[PolicyCandidate]:
    """Scan an HTML page for policy signals and return zero or more candidates."""
    text = _extract_text(html)
    if not _TRIGGER_RE.search(text):
        return []

    confidence = score_relevance(text, source_policy_types)
    if confidence < MIN_CONFIDENCE:
        return []

    match = _TRIGGER_RE.search(text)
    evidence = _find_surrounding_excerpt(text, match.start()) if match else text[:EXCERPT_LEN]

    policy_types = classify_policy_types(text) or source_policy_types
    stage = classify_lifecycle_stage(text)
    level = classify_level(text)

    title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
    page_title = title_match.group(1).strip() if title_match else f"Policy signal from {jurisdiction_name}"

    candidate_id = _make_candidate_id(source_id, page_title, fips)

    return [PolicyCandidate(
        candidate_id=candidate_id,
        source_id=source_id,
        discovered_at=datetime.now(timezone.utc).isoformat(),
        jurisdiction_name=jurisdiction_name,
        state=state,
        state_abbr=state_abbr,
        fips=fips,
        title=page_title,
        description=evidence,
        signal_url=source_url,
        lifecycle_stage=stage,
        policy_types=policy_types,
        confidence=confidence,
        evidence=evidence,
        existing_fips_match=None,
        review_status="pending",
    )]


def normalize_rss_entries(
    entries: list[dict],
    source_id: str,
    jurisdiction_name: str,
    state: Optional[str],
    state_abbr: Optional[str],
    fips: Optional[str],
    source_policy_types: list[str],
) -> list[PolicyCandidate]:
    """Normalize a list of RSS entry dicts into PolicyCandidates."""
    candidates = []
    for entry in entries:
        title = entry.get("title", "")
        summary = entry.get("summary", "") or entry.get("description", "")
        link = entry.get("link", "")
        combined = f"{title} {summary}"

        if not _TRIGGER_RE.search(combined):
            continue

        confidence = score_relevance(combined, source_policy_types)
        if confidence < MIN_CONFIDENCE:
            continue

        match = _TRIGGER_RE.search(combined)
        evidence = _find_surrounding_excerpt(combined, match.start()) if match else combined[:EXCERPT_LEN]
        policy_types = classify_policy_types(combined) or source_policy_types
        stage = classify_lifecycle_stage(combined)
        candidate_id = _make_candidate_id(source_id, title, fips)

        candidates.append(PolicyCandidate(
            candidate_id=candidate_id,
            source_id=source_id,
            discovered_at=datetime.now(timezone.utc).isoformat(),
            jurisdiction_name=jurisdiction_name,
            state=state,
            state_abbr=state_abbr,
            fips=fips,
            title=title,
            description=summary[:EXCERPT_LEN],
            signal_url=link,
            lifecycle_stage=stage,
            policy_types=policy_types,
            confidence=confidence,
            evidence=evidence,
            existing_fips_match=None,
            review_status="pending",
        ))
    return candidates
