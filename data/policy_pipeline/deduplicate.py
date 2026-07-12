"""Deduplicate new pipeline candidates against existing records and prior candidates."""
from __future__ import annotations
import re
from difflib import SequenceMatcher
from .models import PolicyCandidate

FIPS_MATCH_THRESHOLD = 0.65     # Minimum title similarity to flag as duplicate


def _normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", title.lower().strip())


def _title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize_title(a), _normalize_title(b)).ratio()


def find_existing_fips_match(candidate: PolicyCandidate, existing_fips_set: set[str]) -> str | None:
    """Return the FIPS code if this candidate matches an existing county entry."""
    if candidate.fips and candidate.fips in existing_fips_set:
        return candidate.fips
    return None


def is_duplicate_of_existing(
    candidate: PolicyCandidate,
    existing_entries: list[dict],
) -> bool:
    """Return True if candidate is substantively covered by an existing restriction entry.

    Matches on: same FIPS and similar title, or same FIPS and same lifecycle stage.
    Does NOT reject candidates just because their FIPS is covered — new information
    at the same FIPS (e.g. a status change) is still valuable.
    """
    if not candidate.fips:
        return False
    for entry in existing_entries:
        if entry.get("fips") != candidate.fips:
            continue
        sim = _title_similarity(candidate.title, entry.get("title", ""))
        if sim >= FIPS_MATCH_THRESHOLD:
            return True
    return False


def is_duplicate_of_candidate(
    candidate: PolicyCandidate,
    prior_candidates: list[dict],
) -> bool:
    """Return True if this candidate is substantially the same as a prior one."""
    for prior in prior_candidates:
        if prior.get("candidate_id") == candidate.candidate_id:
            return True
        if (prior.get("fips") == candidate.fips
                and _title_similarity(candidate.title, prior.get("title", "")) >= FIPS_MATCH_THRESHOLD):
            return True
    return False


def mark_fips_match(
    candidate: PolicyCandidate,
    existing_entries: list[dict],
) -> PolicyCandidate:
    """Annotate candidate with existing_fips_match if applicable."""
    for entry in existing_entries:
        if entry.get("fips") == candidate.fips:
            candidate.existing_fips_match = candidate.fips
            break
    return candidate


def deduplicate_candidates(
    new_candidates: list[PolicyCandidate],
    existing_entries: list[dict],
    prior_candidates: list[dict],
) -> tuple[list[PolicyCandidate], list[PolicyCandidate]]:
    """Separate candidates into (genuinely_new, duplicates).

    A candidate is a duplicate if it matches a prior candidate by ID or title+FIPS.
    Candidates that match an existing restriction entry are NOT duplicates — they
    may represent status changes — but are annotated with existing_fips_match.
    """
    genuinely_new = []
    duplicates = []
    seen_ids: set[str] = set()

    for c in new_candidates:
        if c.candidate_id in seen_ids:
            duplicates.append(c)
            continue
        if is_duplicate_of_candidate(c, prior_candidates):
            c.review_status = "duplicate"
            duplicates.append(c)
            continue
        mark_fips_match(c, existing_entries)
        seen_ids.add(c.candidate_id)
        genuinely_new.append(c)

    return genuinely_new, duplicates
