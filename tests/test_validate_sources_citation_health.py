"""tests/test_validate_sources_citation_health.py -- validate_sources.py's
write_citation_health(): the per-URL health file that lets
data/remediate_citations.py find directly-observed redirects in the larger
map_data_citations corpus (county + sample_layers.json + state_regulations.json),
the same way source_link_health.json already lets it do that for county
citations alone.

Offline only -- writes to a temp path, never touches the real committed
data/map_data_citation_health.json.

Run: python3 -m pytest tests/test_validate_sources_citation_health.py -q
"""
import importlib
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))
import validate_sources  # noqa: E402


def _run_and_capture(tmp_path, monkeypatch, results):
    out = tmp_path / "map_data_citation_health.json"
    monkeypatch.setattr(validate_sources, "CITATION_HEALTH_PATH", str(out))
    validate_sources.write_citation_health(results)
    return json.loads(out.read_text())


def test_ok_entries_are_included_with_final_url_when_redirected(tmp_path, monkeypatch):
    results = {
        "ok": [
            {"url": "http://a.gov/x", "status": 200, "context": "sample_layers.json / data_centers / fc-1 (X)",
             "final_url": "https://a.gov/x"},
            {"url": "http://a.gov/plain", "status": 200, "context": "state_regulations.json / 04 (Arizona)"},
        ],
        "warning": [],
        "broken": [],
    }
    health = _run_and_capture(tmp_path, monkeypatch, results)
    assert health["_schema"] == "map_data_citation_health_v1"
    assert health["urls"]["http://a.gov/x"]["ok"] is True
    assert health["urls"]["http://a.gov/x"]["final_url"] == "https://a.gov/x"
    assert "final_url" not in health["urls"]["http://a.gov/plain"]


def test_broken_entries_carry_down_reason_and_context(tmp_path, monkeypatch):
    results = {
        "ok": [],
        "warning": [],
        "broken": [{"url": "http://a.gov/dead", "status": 404, "context": "sample_layers.json / data_centers / fc-2 (Y)",
                     "error": "HTTP Error 404", "down_reason": "SOURCE_RETIRED"}],
    }
    health = _run_and_capture(tmp_path, monkeypatch, results)
    rec = health["urls"]["http://a.gov/dead"]
    assert rec["ok"] is False
    assert rec["down_reason"] == "SOURCE_RETIRED"
    assert rec["context"].startswith("sample_layers.json")


def test_every_checked_url_appears_exactly_once(tmp_path, monkeypatch):
    results = {
        "ok": [{"url": "http://a.gov/1", "status": 200, "context": "c1"}],
        "warning": [{"url": "http://a.gov/2", "status": 429, "context": "c2"}],
        "broken": [{"url": "http://a.gov/3", "status": 500, "context": "c3"}],
    }
    health = _run_and_capture(tmp_path, monkeypatch, results)
    assert set(health["urls"].keys()) == {"http://a.gov/1", "http://a.gov/2", "http://a.gov/3"}


# ---------------------------------------------------------------------------
# run_validation()'s rolling-window staleness gating -- added after a live
# dispatch (2026-08-20) showed checking the full ~2,949-URL corpus every
# single run doesn't fit a normal CI job's time budget (confirmed against
# both a 30-minute and a 50-minute job timeout, both got cancelled mid-run).
# Mirrors check_source_links.py's already-proven --limit/--max-age-days
# design instead of duplicating a second bespoke slicing scheme.
# ---------------------------------------------------------------------------

def _seed_health(path, entries):
    path.write_text(json.dumps({"_schema": "map_data_citation_health_v1",
                                 "checked_at": "2026-08-01T00:00:00+00:00",
                                 "urls": entries}))


def test_max_age_days_zero_checks_every_url_regardless_of_freshness(tmp_path, monkeypatch):
    # Default/back-compat behavior: update_data.yml calls this script with
    # no flags at all and has always relied on a full pass every time.
    health_path = tmp_path / "map_data_citation_health.json"
    _seed_health(health_path, {
        "http://a.gov/fresh": {"ok": True, "status": 200, "context": "c",
                                "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds")},
    })
    monkeypatch.setattr(validate_sources, "CITATION_HEALTH_PATH", str(health_path))
    monkeypatch.setattr(validate_sources, "collect_all_urls",
                         lambda: [("http://a.gov/fresh", "c")])
    checked = []

    def fake_check_url(url, ctx, timeout):
        checked.append(url)
        return url, ctx, 200, None, None

    monkeypatch.setattr(validate_sources, "check_url", fake_check_url)
    validate_sources.run_validation(max_age_days=0)
    assert checked == ["http://a.gov/fresh"]


def test_max_age_days_positive_skips_a_url_checked_recently(tmp_path, monkeypatch):
    health_path = tmp_path / "map_data_citation_health.json"
    _seed_health(health_path, {
        "http://a.gov/fresh": {"ok": True, "status": 200, "context": "c",
                                "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds")},
    })
    monkeypatch.setattr(validate_sources, "CITATION_HEALTH_PATH", str(health_path))
    monkeypatch.setattr(validate_sources, "collect_all_urls",
                         lambda: [("http://a.gov/fresh", "c")])
    checked = []

    def fake_check_url(url, ctx, timeout):
        checked.append(url)
        return url, ctx, 200, None, None

    monkeypatch.setattr(validate_sources, "check_url", fake_check_url)
    results = validate_sources.run_validation(max_age_days=14)
    assert checked == []  # skipped -- still fresh
    # ...but it's still carried forward into the returned tallies.
    assert any(r["url"] == "http://a.gov/fresh" for r in results["ok"])


def test_max_age_days_positive_rechecks_a_url_checked_long_ago(tmp_path, monkeypatch):
    health_path = tmp_path / "map_data_citation_health.json"
    old = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(timespec="seconds")
    _seed_health(health_path, {
        "http://a.gov/stale": {"ok": True, "status": 200, "context": "c", "checked_at": old},
    })
    monkeypatch.setattr(validate_sources, "CITATION_HEALTH_PATH", str(health_path))
    monkeypatch.setattr(validate_sources, "collect_all_urls",
                         lambda: [("http://a.gov/stale", "c")])
    checked = []

    def fake_check_url(url, ctx, timeout):
        checked.append(url)
        return url, ctx, 200, None, None

    monkeypatch.setattr(validate_sources, "check_url", fake_check_url)
    validate_sources.run_validation(max_age_days=14)
    assert checked == ["http://a.gov/stale"]


def test_a_never_checked_url_is_always_due(tmp_path, monkeypatch):
    health_path = tmp_path / "map_data_citation_health.json"
    _seed_health(health_path, {})
    monkeypatch.setattr(validate_sources, "CITATION_HEALTH_PATH", str(health_path))
    monkeypatch.setattr(validate_sources, "collect_all_urls",
                         lambda: [("http://a.gov/new", "c")])
    checked = []

    def fake_check_url(url, ctx, timeout):
        checked.append(url)
        return url, ctx, 200, None, None

    monkeypatch.setattr(validate_sources, "check_url", fake_check_url)
    validate_sources.run_validation(max_age_days=14)
    assert checked == ["http://a.gov/new"]


def test_limit_caps_how_many_stale_urls_are_checked_this_run(tmp_path, monkeypatch):
    health_path = tmp_path / "map_data_citation_health.json"
    _seed_health(health_path, {})
    urls = [(f"http://a.gov/{i}", "c") for i in range(10)]
    monkeypatch.setattr(validate_sources, "CITATION_HEALTH_PATH", str(health_path))
    monkeypatch.setattr(validate_sources, "collect_all_urls", lambda: urls)
    checked = []

    def fake_check_url(url, ctx, timeout):
        checked.append(url)
        return url, ctx, 200, None, None

    monkeypatch.setattr(validate_sources, "check_url", fake_check_url)
    results = validate_sources.run_validation(max_age_days=14, limit=3)
    assert len(checked) == 3
    # The remaining 7 have no prior record (never checked, no health entry
    # to carry forward) so they simply don't appear in this run's tallies --
    # not marked broken, not fabricated as ok. They'll be picked up by the
    # limit on a future run.
    total_in_results = len(results["ok"]) + len(results["warning"]) + len(results["broken"])
    assert total_in_results == 3


def test_a_url_excluded_by_a_limit_with_no_prior_record_is_not_fabricated(tmp_path, monkeypatch):
    # 2 URLs, both never checked before (no prior health record), limit=1 --
    # the one that gets skipped this run must not show up as a fabricated
    # ok/warning/broken result just because it exists in collect_all_urls().
    health_path = tmp_path / "map_data_citation_health.json"
    _seed_health(health_path, {})
    monkeypatch.setattr(validate_sources, "CITATION_HEALTH_PATH", str(health_path))
    monkeypatch.setattr(validate_sources, "collect_all_urls",
                         lambda: [("http://a.gov/checked", "c"), ("http://a.gov/skipped", "c")])

    def fake_check_url(url, ctx, timeout):
        return url, ctx, 200, None, None

    monkeypatch.setattr(validate_sources, "check_url", fake_check_url)
    results = validate_sources.run_validation(max_age_days=14, limit=1)
    # Which of the two (shuffled) candidates got picked is not deterministic,
    # but exactly one must appear -- the other must not be fabricated into
    # the tallies just because it exists in collect_all_urls().
    all_urls = {r["url"] for bucket in results.values() for r in bucket}
    assert len(all_urls) == 1
    assert all_urls <= {"http://a.gov/checked", "http://a.gov/skipped"}


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
