"""Tests for the sitemap-based "may have moved to" suggestion logic in
data/check_source_links.py.

All tests are offline — no live network calls. The tokenizer and scorer are
pure functions, tested directly against hand-built candidate lists so no
mock HTTP server is needed. Run with: pytest tests/test_check_source_links.py
"""
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
sys.path.insert(0, DATA_DIR)

from check_source_links import (       # noqa: E402
    _tokenize_path, _parse_sitemap_xml, best_sitemap_match,
)


# ---------------------------------------------------------------------------
# _tokenize_path
# ---------------------------------------------------------------------------

def test_tokenize_splits_on_non_letters():
    assert _tokenize_path("https://example.gov/planning/data-center-zoning") == {
        "planning", "data", "center", "zoning",
    }


def test_tokenize_drops_short_and_stopword_tokens():
    # 'id', 'pw' too short; 'aspx', 'view', 'default' are boilerplate stopwords
    tokens = _tokenize_path("https://example.gov/PW-Digital-Gateway.aspx?id=42&view=default")
    assert tokens == {"digital", "gateway"}


def test_tokenize_includes_query_string():
    tokens = _tokenize_path("https://example.gov/DocumentCenter/View?fileID=zoning-ordinance")
    assert "zoning" in tokens
    assert "ordinance" in tokens


def test_tokenize_empty_path_yields_empty_set():
    assert _tokenize_path("https://example.gov/") == set()


# ---------------------------------------------------------------------------
# best_sitemap_match
# ---------------------------------------------------------------------------

def test_finds_strong_keyword_match():
    dead = "https://example.gov/2019/zoning-ordinance-datacenters.html"
    candidates = [
        "https://example.gov/about/mission.html",
        "https://example.gov/2026/zoning-ordinance-data-centers-updated.html",
        "https://example.gov/parks/trails.html",
    ]
    result = best_sitemap_match(dead, candidates)
    assert result is not None
    assert result["url"] == "https://example.gov/2026/zoning-ordinance-data-centers-updated.html"
    assert result["found_via"] == "sitemap"
    assert result["score"] >= 2


def test_no_match_below_overlap_threshold():
    # No shared keywords at all ('departments' is filtered as a boilerplate
    # stopword on both sides) — nothing should be suggested.
    dead = "https://example.gov/departments/planning-zoning-office.html"
    candidates = ["https://example.gov/departments/parks-and-recreation.html"]
    assert best_sitemap_match(dead, candidates) is None


def test_single_keyword_dead_path_can_still_match():
    # A short dead path only yields one token, so the required overlap drops to 1.
    dead = "https://example.gov/rogo.html"
    candidates = ["https://example.gov/permits/rogo-annual-allocation.html"]
    result = best_sitemap_match(dead, candidates)
    assert result is not None
    assert result["score"] == 1


def test_ignores_self_match():
    dead = "https://example.gov/zoning-ordinance.html"
    candidates = [dead]
    assert best_sitemap_match(dead, candidates) is None


def test_empty_candidate_list_returns_none():
    assert best_sitemap_match("https://example.gov/zoning.html", []) is None


def test_picks_highest_scoring_candidate():
    dead = "https://example.gov/planning/data-center-zoning-ordinance.html"
    candidates = [
        "https://example.gov/planning/zoning-overview.html",             # overlap: planning, zoning = 2
        "https://example.gov/planning/data-center-zoning-rules-2026.html",  # overlap: planning, data, center, zoning = 4
    ]
    result = best_sitemap_match(dead, candidates)
    assert result["url"] == candidates[1]
    assert result["score"] == 4


# ---------------------------------------------------------------------------
# _parse_sitemap_xml
# ---------------------------------------------------------------------------

def test_parse_urlset():
    xml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.gov/a.html</loc></url>
      <url><loc>https://example.gov/b.html</loc></url>
    </urlset>"""
    kind, locs = _parse_sitemap_xml(xml)
    assert kind == "urlset"
    assert locs == ["https://example.gov/a.html", "https://example.gov/b.html"]


def test_parse_sitemapindex():
    xml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap><loc>https://example.gov/sitemap-pages.xml</loc></sitemap>
      <sitemap><loc>https://example.gov/sitemap-news.xml</loc></sitemap>
    </sitemapindex>"""
    kind, locs = _parse_sitemap_xml(xml)
    assert kind == "sitemapindex"
    assert len(locs) == 2


def test_parse_malformed_xml_returns_none():
    kind, locs = _parse_sitemap_xml(b"not xml at all <<<")
    assert kind is None
    assert locs == []


def test_parse_empty_urlset():
    xml = b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    kind, locs = _parse_sitemap_xml(xml)
    assert kind == "urlset"
    assert locs == []


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
