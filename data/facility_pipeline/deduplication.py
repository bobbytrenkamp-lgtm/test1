"""Geo, address, and name-based deduplication for facility records."""
from __future__ import annotations

import math
import re
from difflib import SequenceMatcher
from typing import Iterator

from .models import FacilityRecord, MergeCandidate

# Geo threshold: records within 500 m are considered a potential match
GEO_THRESHOLD_M = 500.0

# Name similarity threshold (0–1)
NAME_SIM_THRESHOLD = 0.75


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in metres between two WGS-84 points."""
    R = 6_371_000.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _street_key(address: str) -> str:
    """Reduce a street address to its numeric + first-word key for fuzzy ZIP matching."""
    if not address:
        return ""
    s = re.sub(r"[^a-z0-9 ]", "", address.lower())
    tokens = s.split()
    return " ".join(tokens[:3]) if tokens else ""


def geo_match(a: FacilityRecord, b: FacilityRecord) -> tuple[bool, float | None]:
    """Return (matched, distance_m). matched is True if within GEO_THRESHOLD_M."""
    if None in (a.latitude, a.longitude, b.latitude, b.longitude):
        return (False, None)
    dist = _haversine_m(a.latitude, a.longitude, b.latitude, b.longitude)
    return (dist <= GEO_THRESHOLD_M, dist)


def address_match(a: FacilityRecord, b: FacilityRecord) -> bool:
    """True if ZIP codes match AND street keys are similar."""
    if not a.zip_code or not b.zip_code or a.zip_code != b.zip_code:
        return False
    ka = _street_key(a.street_address)
    kb = _street_key(b.street_address)
    if not ka or not kb:
        return False
    return SequenceMatcher(None, ka, kb).ratio() >= 0.80


def _name_key(record: FacilityRecord) -> str:
    """Build a comparison string from operator + city."""
    op = re.sub(r"[^a-z0-9 ]", "", (record.operator or record.name or "").lower())
    city = (record.city or "").lower()
    return f"{op.strip()} {city.strip()}".strip()


def name_match(a: FacilityRecord, b: FacilityRecord) -> tuple[bool, float]:
    """True if operator+city fuzzy similarity >= NAME_SIM_THRESHOLD."""
    ka, kb = _name_key(a), _name_key(b)
    if not ka or not kb:
        return (False, 0.0)
    sim = SequenceMatcher(None, ka, kb).ratio()
    return (sim >= NAME_SIM_THRESHOLD, sim)


def build_merge_candidate(a: FacilityRecord, b: FacilityRecord) -> MergeCandidate:
    """Evaluate all dedup signals and return a scored MergeCandidate."""
    geo_ok, dist = geo_match(a, b)
    addr_ok = address_match(a, b)
    name_ok, name_sim = name_match(a, b)

    score = sum([geo_ok, addr_ok, name_ok])

    return MergeCandidate(
        record_a_id=a.facility_id,
        record_b_id=b.facility_id,
        geo_match=geo_ok,
        address_match=addr_ok,
        name_match=name_ok,
        geo_distance_m=dist,
        name_similarity=round(name_sim, 4),
        match_score=score,
        auto_mergeable=score >= 2,
        review_required=score == 1,
    )


def find_candidates(
    records: list[FacilityRecord],
    existing: list[FacilityRecord] | None = None,
) -> list[MergeCandidate]:
    """Find all merge candidates in a combined record list.

    If `existing` is supplied, compare each new record only against existing
    records (avoids O(n²) comparisons when ingesting a single source batch).
    """
    candidates: list[MergeCandidate] = []
    seen: set[frozenset[str]] = set()

    pool = existing if existing is not None else records
    incoming = records

    for a in incoming:
        for b in pool:
            if a.facility_id == b.facility_id:
                continue
            pair = frozenset((a.facility_id, b.facility_id))
            if pair in seen:
                continue
            seen.add(pair)

            mc = build_merge_candidate(a, b)
            if mc.match_score >= 1:
                candidates.append(mc)

    return candidates


def iter_auto_merge(
    candidates: list[MergeCandidate],
) -> Iterator[MergeCandidate]:
    """Yield candidates that can be merged automatically (score ≥ 2)."""
    for c in candidates:
        if c.auto_mergeable and not c.merged:
            yield c


def iter_review_required(
    candidates: list[MergeCandidate],
) -> Iterator[MergeCandidate]:
    """Yield candidates that need human review (score == 1)."""
    for c in candidates:
        if c.review_required and not c.merged:
            yield c
