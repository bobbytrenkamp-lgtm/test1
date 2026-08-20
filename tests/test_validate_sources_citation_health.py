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


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
