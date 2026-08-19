"""tests/test_remediate_citations.py -- data/remediate_citations.py's
pure fix-selection and apply logic.

All tests are offline, synthetic fixtures only -- doesn't touch the real
committed data/source_link_health.json or data/restrictions_raw.json.

Run: python3 -m pytest tests/test_remediate_citations.py -q
"""
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
sys.path.insert(0, DATA_DIR)

from remediate_citations import (   # noqa: E402
    find_redirect_fixes, find_queue_candidates, apply_redirect_fixes,
)


def test_find_redirect_fixes_only_includes_ok_with_final_url():
    health = {"urls": {
        "http://a.gov/x": {"ok": True, "final_url": "http://a.gov/y", "checked_at": "2026-08-19"},
        "http://a.gov/no-redirect": {"ok": True, "final_url": None, "checked_at": "2026-08-19"},
        "http://a.gov/dead": {"ok": False, "final_url": None, "checked_at": "2026-08-19"},
    }}
    fixes = find_redirect_fixes(health)
    assert list(fixes.keys()) == ["http://a.gov/x"]
    assert fixes["http://a.gov/x"]["new_url"] == "http://a.gov/y"


def test_find_redirect_fixes_ignores_dead_urls_even_with_a_final_url_field():
    # check_url() never actually sets final_url on a failure path (that's
    # what the endpoint_diagnostics fix addressed separately) but this
    # function must not trust it for remediation purposes even if some
    # future bug produced one -- only ok:true is a directly-observed,
    # safe-to-apply redirect.
    health = {"urls": {
        "http://a.gov/x": {"ok": False, "final_url": "http://a.gov/y", "checked_at": "2026-08-19"},
    }}
    assert find_redirect_fixes(health) == {}


def test_find_queue_candidates_requires_a_lead():
    health = {"urls": {
        "http://a.gov/dead-no-lead": {"ok": False, "counties": 2},
        "http://a.gov/dead-with-suggestion": {
            "ok": False, "counties": 1,
            "suggested_replacement": {"url": "http://a.gov/new", "score": 3, "found_via": "sitemap"},
        },
        "http://a.gov/dead-with-archive": {
            "ok": False, "counties": 5,
            "archive": {"url": "http://web.archive.org/...", "timestamp": "20260101"},
        },
        "http://a.gov/reachable": {"ok": True, "counties": 9},
    }}
    candidates = find_queue_candidates(health)
    urls = [c["url"] for c in candidates]
    assert "http://a.gov/dead-no-lead" not in urls
    assert "http://a.gov/reachable" not in urls
    assert "http://a.gov/dead-with-suggestion" in urls
    assert "http://a.gov/dead-with-archive" in urls


def test_find_queue_candidates_sorted_by_counties_descending():
    health = {"urls": {
        "http://a.gov/low": {"ok": False, "counties": 1, "archive": {"url": "x"}},
        "http://a.gov/high": {"ok": False, "counties": 10, "archive": {"url": "x"}},
        "http://a.gov/mid": {"ok": False, "counties": 5, "archive": {"url": "x"}},
    }}
    candidates = find_queue_candidates(health)
    assert [c["url"] for c in candidates] == ["http://a.gov/high", "http://a.gov/mid", "http://a.gov/low"]


def test_apply_redirect_fixes_updates_url_and_records_provenance():
    restrictions = {"restrictions": [
        {"fips": "04013", "sources": [
            {"label": "Old page", "url": "http://a.gov/old"},
            {"label": "Unrelated", "url": "http://b.gov/unrelated"},
        ]},
    ]}
    fixes = {"http://a.gov/old": {"new_url": "http://a.gov/new", "checked_at": "2026-08-19T00:00:00"}}
    applied = apply_redirect_fixes(restrictions, fixes)

    assert applied == 1
    source = restrictions["restrictions"][0]["sources"][0]
    assert source["url"] == "http://a.gov/new"
    assert source["replacement_history"][0]["old_value"] == "http://a.gov/old"
    assert source["replacement_history"][0]["new_value"] == "http://a.gov/new"
    assert "reason" in source["replacement_history"][0]
    assert "verified_via" in source["replacement_history"][0]
    # The unrelated source is untouched.
    assert restrictions["restrictions"][0]["sources"][1]["url"] == "http://b.gov/unrelated"


def test_apply_redirect_fixes_handles_the_same_url_cited_by_multiple_counties():
    restrictions = {"restrictions": [
        {"fips": "1", "sources": [{"label": "A", "url": "http://shared.gov/old"}]},
        {"fips": "2", "sources": [{"label": "B", "url": "http://shared.gov/old"}]},
    ]}
    fixes = {"http://shared.gov/old": {"new_url": "http://shared.gov/new", "checked_at": "2026-08-19"}}
    applied = apply_redirect_fixes(restrictions, fixes)
    assert applied == 2
    assert all(r["sources"][0]["url"] == "http://shared.gov/new" for r in restrictions["restrictions"])


def test_apply_redirect_fixes_no_fixes_changes_nothing():
    restrictions = {"restrictions": [{"fips": "1", "sources": [{"label": "A", "url": "http://x.gov/y"}]}]}
    applied = apply_redirect_fixes(restrictions, {})
    assert applied == 0
    assert restrictions["restrictions"][0]["sources"][0]["url"] == "http://x.gov/y"
    assert "replacement_history" not in restrictions["restrictions"][0]["sources"][0]
