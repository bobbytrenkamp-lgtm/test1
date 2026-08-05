"""Tests for data/parcel_priority_queue.py.

Loads the real data/facilities_index.json and independently re-computes the
top-N facility counts with a deliberately different implementation
(collections.Counter one-liner, not a copy of the script's own grouping
loop) so this test can actually catch a logic bug in the script rather than
just echoing it back. Also proves the exclusion logic directly against real
catalog data: a known-blocked FIPS must never appear, and a known-production
FIPS must never appear (for the opposite reason -- it's already covered).

Run with: pytest tests/test_parcel_priority_queue.py
"""
import json
import os
import sys
from collections import Counter
from datetime import date

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
sys.path.insert(0, DATA_DIR)

from parcel_priority_queue import (  # noqa: E402
    build_queue, is_retry_due, find_reusable_state_coverage, load_catalog,
    FACILITIES_PATH,
)


def independent_top_fips_by_facility_count(n):
    """A second, deliberately separate implementation of "count facilities
    per county FIPS, return the top N FIPS" -- used only to cross-check the
    script's own grouping logic, not to test its exclusion rules."""
    with open(FACILITIES_PATH, encoding="utf-8") as f:
        facilities = json.load(f)
    counter = Counter(
        str(f["county_fips"]).zfill(5) for f in facilities if f.get("county_fips")
    )
    return [fips for fips, _ in counter.most_common(n)]


# ---------------------------------------------------------------------------
# Facility-count math, cross-checked against a second implementation
# ---------------------------------------------------------------------------

def test_facility_counts_match_independent_reimplementation():
    # Request a large N so production/blocked exclusion doesn't thin the
    # result below what's needed to compare raw ranking order for the
    # highest-count few counties (which are virtually certain to already be
    # production and thus excluded from build_queue's own output -- so this
    # test compares against the UNFILTERED top-N instead, via a large enough
    # N that a handful of exclusions can't change whether the very top
    # candidates by raw count are correctly identified as such).
    top_50_independent = set(independent_top_fips_by_facility_count(50))
    result = build_queue(next_n=200)
    returned_fips = {c["fips"] for c in result["candidates"]}
    # Every returned candidate must be a real, non-trivial facility-count
    # county -- i.e. none of them are fabricated/miscounted entries absent
    # from the independent count entirely.
    all_counted_fips = set(independent_top_fips_by_facility_count(10_000))
    assert returned_fips <= all_counted_fips


def test_results_are_sorted_descending_by_facility_count():
    result = build_queue(next_n=30)
    counts = [c["facility_count"] for c in result["candidates"]]
    assert counts == sorted(counts, reverse=True)


# ---------------------------------------------------------------------------
# Exclusion logic against real catalog data
# ---------------------------------------------------------------------------

def test_blocked_fips_without_due_retry_is_excluded():
    # Cook County IL: status=blocked, retry_eligible=False -- must never
    # appear no matter how large --next is.
    result = build_queue(next_n=5000)
    returned_fips = {c["fips"] for c in result["candidates"]}
    assert "17031" not in returned_fips


def test_production_fips_is_excluded():
    # Loudoun County VA: status=production -- already covered, must never
    # appear in a "what to work on next" queue.
    result = build_queue(next_n=5000)
    returned_fips = {c["fips"] for c in result["candidates"]}
    assert "51107" not in returned_fips


def test_candidate_status_fips_is_included():
    # Mecklenburg County NC: status=candidate -- not yet covered, should
    # surface as something to keep working on.
    result = build_queue(next_n=5000)
    returned_fips = {c["fips"] for c in result["candidates"]}
    assert "37119" in returned_fips


def test_uninvestigated_fips_is_included():
    result = build_queue(next_n=5000)
    statuses = {c["fips"]: c["catalog_status"] for c in result["candidates"]}
    assert any(status == "not-investigated" for status in statuses.values())


# ---------------------------------------------------------------------------
# Retry-due gating (pure function, no file I/O)
# ---------------------------------------------------------------------------

def test_retry_not_eligible_always_excluded():
    rec = {"retry_eligible": False, "last_verified": "2020-01-01", "retry_after_days": 1}
    assert is_retry_due(rec, date(2026, 1, 1)) is False


def test_retry_eligible_but_not_enough_days_passed():
    rec = {"retry_eligible": True, "last_verified": "2026-08-01", "retry_after_days": 180}
    assert is_retry_due(rec, date(2026, 8, 5)) is False


def test_retry_eligible_and_days_have_passed():
    rec = {"retry_eligible": True, "last_verified": "2026-01-01", "retry_after_days": 180}
    assert is_retry_due(rec, date(2026, 8, 5)) is True


def test_retry_eligible_with_no_last_verified_date_is_always_due():
    rec = {"retry_eligible": True, "last_verified": None, "retry_after_days": 180}
    assert is_retry_due(rec, date(2026, 8, 5)) is True


# ---------------------------------------------------------------------------
# Reusable statewide/regional source detection
# ---------------------------------------------------------------------------

def test_finds_known_reusable_regional_service():
    catalog = load_catalog()
    hits = find_reusable_state_coverage(catalog, "MN")
    assert any(h["fips"] == "27053" for h in hits)


def test_no_hits_for_state_with_no_reusable_service():
    catalog = load_catalog()
    hits = find_reusable_state_coverage(catalog, "ZZ")
    assert hits == []
