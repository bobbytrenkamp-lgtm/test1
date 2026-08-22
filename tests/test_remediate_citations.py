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
    find_map_data_redirect_fixes, find_map_data_queue_candidates,
    apply_sample_layers_fixes, apply_state_regs_fixes,
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


# ---------------------------------------------------------------------------
# map_data_citation_health.json support -- validate_sources.py's larger
# corpus (county + sample_layers.json facility sources + state_regulations.json
# state sources), added so map_data_citations gets the same auto-remediation
# loop county_page_citations already had.
# ---------------------------------------------------------------------------

def test_find_map_data_redirect_fixes_only_includes_ok_with_final_url():
    citation_health = {"urls": {
        "http://a.gov/x": {"ok": True, "final_url": "http://a.gov/y",
                            "checked_at": "2026-08-20", "context": "sample_layers.json / data_centers / fc-1 (X)"},
        "http://a.gov/dead": {"ok": False, "final_url": None, "checked_at": "2026-08-20",
                               "context": "state_regulations.json / 04 (Arizona)"},
    }}
    fixes = find_map_data_redirect_fixes(citation_health)
    assert list(fixes.keys()) == ["http://a.gov/x"]
    assert fixes["http://a.gov/x"]["new_url"] == "http://a.gov/y"
    assert fixes["http://a.gov/x"]["context"].startswith("sample_layers.json")


def test_apply_sample_layers_fixes_updates_facility_source_and_records_provenance():
    sample_layers = {"data_centers": [
        {"id": "fc-1", "name": "X", "sources": [{"label": "Old", "url": "http://a.gov/old"}]},
    ], "ai_campuses": [], "power_infrastructure": [], "fiber_network": []}
    fixes = {"http://a.gov/old": {"new_url": "http://a.gov/new", "checked_at": "2026-08-20",
                                   "context": "sample_layers.json / data_centers / fc-1 (X)"}}
    applied = apply_sample_layers_fixes(sample_layers, fixes)
    assert applied == 1
    source = sample_layers["data_centers"][0]["sources"][0]
    assert source["url"] == "http://a.gov/new"
    assert source["replacement_history"][0]["old_value"] == "http://a.gov/old"
    assert source["replacement_history"][0]["verified_via"] == "data/map_data_citation_health.json"


def test_apply_state_regs_fixes_updates_state_source():
    state_regs = {"states": {
        "04": {"name": "Arizona", "sources": [{"label": "AZ DOR", "url": "http://azdor.gov/old"}]},
    }}
    fixes = {"http://azdor.gov/old": {"new_url": "http://azdor.gov/new", "checked_at": "2026-08-20",
                                       "context": "state_regulations.json / 04 (Arizona)"}}
    applied = apply_state_regs_fixes(state_regs, fixes)
    assert applied == 1
    assert state_regs["states"]["04"]["sources"][0]["url"] == "http://azdor.gov/new"


def test_apply_sample_layers_fixes_no_fixes_changes_nothing():
    sample_layers = {"data_centers": [
        {"id": "fc-1", "sources": [{"label": "X", "url": "http://a.gov/y"}]},
    ], "ai_campuses": [], "power_infrastructure": [], "fiber_network": []}
    applied = apply_sample_layers_fixes(sample_layers, {})
    assert applied == 0
    assert "replacement_history" not in sample_layers["data_centers"][0]["sources"][0]


def test_main_resplits_sample_layers_after_writing_it():
    # Regression guard: a real fix landed in sample_layers.json on
    # 2026-08-20 and sat invisible to users for a full session because
    # nothing re-split data/layers/*.json (what js/map.js actually fetches)
    # after the write -- only data/split_sample_layers.py --check running
    # in the FULL test suite caught the drift. Cheap source-inspection
    # check, matching test_fiber_network_honesty.py's own convention,
    # since exercising this via subprocess end-to-end needs a lot of
    # fixture setup for little extra confidence.
    src = open(os.path.join(DATA_DIR, "remediate_citations.py")).read()
    applied_sl_block = src[src.index("if applied_sl:"):src.index("if applied_sr:")]
    assert "split_sample_layers.py" in applied_sl_block, (
        "sample_layers.json is written but data/layers/*.json (what the "
        "frontend actually serves) is never re-derived from it"
    )


def test_find_map_data_queue_candidates_excludes_map_data_json_context():
    # map_data.json-context (county) candidates are already surfaced by
    # find_queue_candidates via source_link_health.json -- must not double-list.
    citation_health = {"urls": {
        "http://a.gov/county-dead": {"ok": False, "context": "map_data.json / 04013 (X County)",
                                      "archive": {"url": "http://web.archive.org/..."}},
        "http://a.gov/facility-dead": {"ok": False, "context": "sample_layers.json / data_centers / fc-1 (Y)",
                                        "suggested_replacement": {"url": "http://a.gov/new"}},
        "http://a.gov/no-lead": {"ok": False, "context": "state_regulations.json / 04 (Arizona)"},
        "http://a.gov/reachable": {"ok": True, "context": "sample_layers.json / data_centers / fc-2 (Z)"},
    }}
    candidates = find_map_data_queue_candidates(citation_health)
    urls = [c["url"] for c in candidates]
    assert "http://a.gov/county-dead" not in urls
    assert "http://a.gov/no-lead" not in urls
    assert "http://a.gov/reachable" not in urls
    assert "http://a.gov/facility-dead" in urls
