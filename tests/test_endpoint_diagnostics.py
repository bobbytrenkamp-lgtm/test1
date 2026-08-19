"""tests/test_endpoint_diagnostics.py — data/lib/endpoint_diagnostics.py's
down_reason classifier.

All tests are offline: classify_down_reason() and is_access_blocked() take
already-collected check results (status/error/final_url/etc.) as plain
arguments and make no network calls of their own, so every branch of the
TRANSIENT_FAILURE / SOURCE_MOVED / SOURCE_RETIRED / ACCESS_BLOCKED /
REPLACEMENT_REQUIRED taxonomy is testable with synthetic fixtures.

Run: python3 -m pytest tests/test_endpoint_diagnostics.py -q
"""
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
sys.path.insert(0, DATA_DIR)

from lib.endpoint_diagnostics import (       # noqa: E402
    classify_down_reason, is_access_blocked, DOWN_REASONS,
    TRANSIENT_FAILURE, SOURCE_MOVED, SOURCE_RETIRED, ACCESS_BLOCKED,
    REPLACEMENT_REQUIRED,
)


# ---------------------------------------------------------------------------
# classify_down_reason
# ---------------------------------------------------------------------------

def test_success_status_is_not_a_down_reason():
    assert classify_down_reason(status=200, error=None) is None
    assert classify_down_reason(status=301, error=None) is None  # redirect, still 2xx-399


def test_first_failure_is_transient():
    assert classify_down_reason(status=500, error="HTTP 500", consecutive_failures=1) == TRANSIENT_FAILURE


def test_second_failure_is_still_transient():
    assert classify_down_reason(status=500, error="HTTP 500", consecutive_failures=2) == TRANSIENT_FAILURE


def test_third_consecutive_failure_with_no_replacement_stays_transient_not_retired():
    # A 500 (not 404/410) with no replacement candidate and >=3 consecutive
    # failures has nowhere better to go than a generic "still transient" --
    # it is neither confirmed retired (that's only for 404/410) nor a
    # replacement-ready case.
    result = classify_down_reason(status=500, error="HTTP 500", consecutive_failures=5)
    assert result == TRANSIENT_FAILURE


def test_third_consecutive_failure_with_replacement_is_replacement_required():
    result = classify_down_reason(
        status=500, error="HTTP 500", consecutive_failures=5,
        has_replacement_candidate=True,
    )
    assert result == REPLACEMENT_REQUIRED


def test_404_with_no_replacement_is_source_retired():
    assert classify_down_reason(status=404, error="HTTP 404") == SOURCE_RETIRED


def test_410_with_no_replacement_is_source_retired():
    assert classify_down_reason(status=410, error="HTTP 410") == SOURCE_RETIRED


def test_404_with_a_replacement_candidate_is_replacement_required():
    result = classify_down_reason(
        status=404, error="HTTP 404", has_replacement_candidate=True,
    )
    assert result == REPLACEMENT_REQUIRED


def test_redirect_to_a_different_domain_is_source_moved():
    result = classify_down_reason(
        status=404, error="HTTP 404",
        final_url="https://newvendor.example.com/parcels",
        original_url="https://oldvendor.example.com/parcels",
    )
    assert result == SOURCE_MOVED


def test_redirect_within_the_same_domain_is_not_source_moved():
    # A same-domain redirect (e.g. http -> https, or a path change on the
    # same host) is not "moved to a different source" -- classify on the
    # other signals instead (here: a plain 404 with nothing else to go on).
    result = classify_down_reason(
        status=404, error="HTTP 404",
        final_url="https://example.gov/new-path",
        original_url="https://example.gov/old-path",
    )
    assert result == SOURCE_RETIRED


def test_403_is_transient_without_a_blocked_body_signature():
    result = classify_down_reason(status=403, error="HTTP 403", consecutive_failures=1)
    assert result == TRANSIENT_FAILURE


def test_403_with_blocked_body_signature_is_access_blocked():
    result = classify_down_reason(
        status=403, error="HTTP 403",
        body_snippet="<html>Please complete the captcha to continue</html>",
    )
    assert result == ACCESS_BLOCKED


def test_access_blocked_takes_priority_over_source_moved():
    # If a request was blocked, a coincidental domain change on the final
    # response URL (some WAFs redirect to a challenge subdomain) must not
    # be reported as the resource having moved.
    result = classify_down_reason(
        status=403, error="HTTP 403",
        final_url="https://challenges.example.com/",
        original_url="https://example.gov/data",
        body_snippet="Attention Required! | Cloudflare",
    )
    assert result == ACCESS_BLOCKED


# ---------------------------------------------------------------------------
# is_access_blocked
# ---------------------------------------------------------------------------

def test_999_status_is_always_access_blocked():
    assert is_access_blocked(999) is True
    assert is_access_blocked(999, body_snippet="") is True


def test_403_without_body_is_not_access_blocked():
    assert is_access_blocked(403) is False


def test_403_with_unrelated_body_is_not_access_blocked():
    assert is_access_blocked(403, body_snippet="<html>Forbidden: insufficient permissions</html>") is False


def test_404_is_never_access_blocked_even_with_a_matching_marker_in_body():
    # 404 is not in the access-blocked status set at all -- a captcha-like
    # word appearing incidentally in a real 404 page shouldn't reclassify it.
    assert is_access_blocked(404, body_snippet="captcha") is False


def test_all_down_reasons_are_distinct_and_match_the_public_tuple():
    values = {TRANSIENT_FAILURE, SOURCE_MOVED, SOURCE_RETIRED, ACCESS_BLOCKED, REPLACEMENT_REQUIRED}
    assert len(values) == 5
    assert set(DOWN_REASONS) == values


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-q"]))
