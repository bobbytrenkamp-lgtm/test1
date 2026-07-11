"""
Unit tests for data/update_ai_news.py

Run with: python -m pytest tests/ -v
Does NOT require internet access. All feed data is inline or mocked.
"""
import sys
import os
import json
import pytest
from datetime import datetime, timezone, timedelta

# Make the data/ directory importable from the tests/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "data"))
import update_ai_news as mod


# ── URL canonicalization ───────────────────────────────────────────────────
class TestCanonicalizeUrl:
    def test_strips_utm_params(self):
        url = "https://example.com/article?utm_source=twitter&utm_medium=social"
        assert "utm_source" not in mod.canonicalize_url(url)
        assert "utm_medium" not in mod.canonicalize_url(url)

    def test_strips_multiple_tracking_params(self):
        url = "https://example.com/a?utm_campaign=x&gclid=abc123&fbclid=def&real=keep"
        result = mod.canonicalize_url(url)
        assert "utm_campaign" not in result
        assert "gclid" not in result
        assert "real=keep" in result

    def test_preserves_non_tracking_params(self):
        url = "https://example.com/search?q=AI+regulation&page=2"
        result = mod.canonicalize_url(url)
        assert "q=" in result
        assert "page=2" in result

    def test_normalizes_host_to_lowercase(self):
        url = "https://Example.COM/Article"
        result = mod.canonicalize_url(url)
        assert "example.com" in result

    def test_removes_trailing_slash(self):
        a = mod.canonicalize_url("https://example.com/article/")
        b = mod.canonicalize_url("https://example.com/article")
        assert a == b

    def test_removes_fragment(self):
        url = "https://example.com/article#section1"
        assert "#section1" not in mod.canonicalize_url(url)

    def test_passthrough_for_non_http(self):
        url = "ftp://example.com/file"
        assert mod.canonicalize_url(url) == url

    def test_handles_malformed_url(self):
        url = "not a url at all"
        # Should not raise
        result = mod.canonicalize_url(url)
        assert isinstance(result, str)


# ── is_safe_url ────────────────────────────────────────────────────────────
class TestIsSafeUrl:
    def test_http_is_safe(self):
        assert mod.is_safe_url("http://example.com/article")

    def test_https_is_safe(self):
        assert mod.is_safe_url("https://example.com/article")

    def test_javascript_is_not_safe(self):
        assert not mod.is_safe_url("javascript:alert(1)")

    def test_data_uri_is_not_safe(self):
        assert not mod.is_safe_url("data:text/html,<h1>hi</h1>")

    def test_hash_is_not_safe(self):
        assert not mod.is_safe_url("#")

    def test_empty_string_is_not_safe(self):
        assert not mod.is_safe_url("")

    def test_bare_path_is_not_safe(self):
        assert not mod.is_safe_url("/relative/path")


# ── make_article_id ────────────────────────────────────────────────────────
class TestMakeArticleId:
    def test_same_url_same_id(self):
        url = "https://example.com/article"
        assert mod.make_article_id(url) == mod.make_article_id(url)

    def test_url_with_utm_same_as_clean(self):
        a = mod.make_article_id("https://example.com/article?utm_source=x")
        b = mod.make_article_id("https://example.com/article")
        assert a == b

    def test_different_urls_different_ids(self):
        a = mod.make_article_id("https://example.com/article-one")
        b = mod.make_article_id("https://example.com/article-two")
        assert a != b

    def test_id_is_16_chars(self):
        assert len(mod.make_article_id("https://example.com/x")) == 16


# ── Exact duplicate detection ──────────────────────────────────────────────
class TestDeduplicateExact:
    def _art(self, title, url):
        return {
            "id": mod.make_article_id(url),
            "title": title,
            "url": mod.canonicalize_url(url),
            "source": "Test", "category": "Other AI News",
            "published_at": "2026-07-11T12:00:00+00:00",
        }

    def test_removes_exact_url_duplicate(self):
        a1 = self._art("AI Regulation Bill Passes", "https://example.com/article1")
        a2 = self._art("AI Regulation Bill Passes", "https://example.com/article1")
        result = mod.deduplicate([a1, a2])
        assert len(result) == 1

    def test_removes_url_with_tracking_dupe(self):
        a1 = self._art("AI Article", "https://example.com/a?utm_source=x")
        a2 = self._art("AI Article", "https://example.com/a")
        result = mod.deduplicate([a1, a2])
        assert len(result) == 1

    def test_different_urls_kept(self):
        a1 = self._art("AI Article One", "https://example.com/art1")
        a2 = self._art("AI Article Two", "https://example.com/art2")
        result = mod.deduplicate([a1, a2])
        assert len(result) == 2

    def test_prefers_direct_publisher_over_google_news(self):
        direct = self._art("AI Bill Advances", "https://techcrunch.com/ai-bill")
        gnews  = self._art("AI Bill Advances", "https://news.google.com/rss/articles/abc")
        result = mod.deduplicate([gnews, direct])
        assert len(result) == 1
        assert "techcrunch.com" in result[0]["url"]


# ── Fuzzy headline deduplication ───────────────────────────────────────────
class TestFuzzyTitleSimilarity:
    def test_identical_titles(self):
        assert mod.fuzzy_title_similarity("AI Bill Passes Senate", "AI Bill Passes Senate") == 1.0

    def test_high_overlap_syndicated(self):
        # Jaccard for these two titles = intersection/union = 6/9 = 0.67
        a = "Senate Passes Major AI Regulation Bill in Historic Vote"
        b = "Senate Passes Major AI Regulation Bill"
        assert mod.fuzzy_title_similarity(a, b) >= 0.60

    def test_low_overlap_different_topics(self):
        a = "OpenAI Announces New Model Release"
        b = "Amazon Quarterly Earnings Beat Expectations"
        assert mod.fuzzy_title_similarity(a, b) < 0.30

    def test_empty_strings(self):
        assert mod.fuzzy_title_similarity("", "") == 0.0

    def test_removes_fuzzy_duplicate_in_dedup(self):
        a1 = {
            "id": "aaa", "title": "Senate Passes Major AI Regulation Bill in Historic Vote",
            "url": "https://techcrunch.com/ai-bill",
            "source": "TechCrunch", "category": "Federal Policy",
            "published_at": "2026-07-11T12:00:00+00:00",
        }
        a2 = {
            "id": "bbb", "title": "Senate Passes Major AI Regulation Bill",
            "url": "https://wired.com/ai-bill",
            "source": "Wired", "category": "Federal Policy",
            "published_at": "2026-07-11T12:00:00+00:00",
        }
        result = mod.deduplicate([a1, a2], fuzzy_threshold=0.60)
        assert len(result) == 1


# ── Standalone "AI" matching ───────────────────────────────────────────────
class TestRelevanceScoring:
    def test_standalone_ai_is_relevant(self):
        assert mod.is_relevant("AI regulation passes Senate", "", threshold=2)

    def test_ai_in_title_scores_higher(self):
        score_title = mod.relevance_score("AI regulation bill advances", "")
        score_desc  = mod.relevance_score("", "AI regulation bill advances")
        assert score_title > score_desc

    def test_does_not_match_ai_inside_word(self):
        # "Spain" contains "ai" but not as standalone word
        score = mod.relevance_score("Spain passes tourism bill", "")
        assert score == 0

    def test_does_not_match_paid_as_ai(self):
        score = mod.relevance_score("Paid search advertising market grows", "")
        assert score == 0

    def test_artificial_intelligence_is_highly_relevant(self):
        score = mod.relevance_score("artificial intelligence regulation", "")
        assert score >= 4

    def test_data_center_regulation_is_relevant(self):
        assert mod.is_relevant("Data center zoning rules tightened", "", threshold=3)

    def test_generic_laptop_article_is_not_relevant(self):
        # Only mentions "AI features" once in passing
        title = "Best Windows laptops for 2026"
        desc  = "These laptops have AI features built in. Great for productivity."
        assert not mod.is_relevant(title, desc, threshold=3)

    def test_generative_ai_scores_high(self):
        score = mod.relevance_score("generative AI startup raises $500M", "")
        assert score >= 4

    def test_openai_is_relevant(self):
        assert mod.is_relevant("OpenAI releases GPT-5", "New model from OpenAI.", threshold=3)

    def test_hyphenated_ai_matched(self):
        # "AI-powered" — "AI" is still matched by \bAI\b
        score = mod.relevance_score("AI-powered data center opens in Texas", "")
        assert score >= 2


# ── Category classification ────────────────────────────────────────────────
class TestCategoryClassification:
    def test_federal_policy(self):
        cat = mod.classify_category("Senate passes AI bill", "Congress voted today")
        assert cat == "Federal Policy"

    def test_state_local_policy(self):
        cat = mod.classify_category("Hood River County reaffirms data center ban", "")
        assert cat == "State/Local Policy"

    def test_ai_safety(self):
        cat = mod.classify_category("AI alignment research faces new challenges", "")
        assert cat == "AI Safety"

    def test_data_centers(self):
        cat = mod.classify_category("New hyperscale data center opens in Virginia", "")
        assert cat == "Data Centers"

    def test_energy(self):
        cat = mod.classify_category("ERCOT warns of power grid strain from data centers", "")
        assert cat == "Energy & Environment"

    def test_chips(self):
        cat = mod.classify_category("NVIDIA GPU export controls tightened", "")
        assert cat == "Chips & Infrastructure"

    def test_legal(self):
        cat = mod.classify_category("OpenAI faces copyright lawsuit over training data", "")
        assert cat == "Legal & Copyright"

    def test_fallback_other(self):
        cat = mod.classify_category("Weather in San Francisco today", "")
        assert cat == "Other AI News"

    def test_valid_category_list(self):
        # All returned categories must be in the controlled list
        test_cases = [
            ("AI ethics researcher warns about risks", ""),
            ("Microsoft invests $10B in OpenAI", ""),
            ("California AB 2013 passes committee", ""),
            ("Google DeepMind releases new paper", ""),
        ]
        for title, desc in test_cases:
            cat = mod.classify_category(title, desc)
            assert cat in mod.VALID_CATEGORIES, f"Invalid category {cat!r} for {title!r}"


# ── State detection ────────────────────────────────────────────────────────
class TestStateDetection:
    def test_full_state_name(self):
        assert mod.detect_state("Virginia passes new data center rules") == "VA"

    def test_full_state_name_case_insensitive(self):
        assert mod.detect_state("texas grid under strain from AI demand") == "TX"

    def test_state_in_context_phrase(self):
        result = mod.detect_state("NY law requires AI impact assessments")
        assert result == "NY"

    def test_no_false_positive_from_company_name(self):
        # "Google" is headquartered in California but this article has no CA reference
        result = mod.detect_state("Google announces new AI model")
        assert result is None

    def test_no_state_for_federal(self):
        result = mod.detect_state("Senate passes AI regulation bill")
        assert result is None

    def test_returns_none_when_no_state(self):
        result = mod.detect_state("OpenAI raises $1 billion in new funding")
        assert result is None

    def test_washington_state_detected(self):
        result = mod.detect_state("Washington state PUD lifts moratorium on data centers")
        assert result == "WA"

    def test_valid_state_abbr_returned(self):
        result = mod.detect_state("Oregon bans commercial data centers in Hood River County")
        assert result in mod.STATE_ABBR


# ── Date parsing ───────────────────────────────────────────────────────────
class TestDateParsing:
    def test_rfc2822_date(self):
        result = mod.parse_date("Fri, 11 Jul 2026 12:00:00 +0000")
        assert result is not None
        assert "2026-07-11" in result

    def test_iso8601_date(self):
        result = mod.parse_date("2026-07-11T12:00:00Z")
        assert result is not None
        assert "2026-07-11" in result

    def test_date_without_time(self):
        result = mod.parse_date("2026-07-11")
        assert result is not None
        assert "2026-07-11" in result

    def test_empty_date_returns_none(self):
        assert mod.parse_date("") is None
        assert mod.parse_date(None) is None

    def test_invalid_date_returns_none(self):
        assert mod.parse_date("not a date") is None

    def test_output_is_utc(self):
        result = mod.parse_date("Fri, 11 Jul 2026 12:00:00 -0500")
        assert result is not None
        assert "+00:00" in result or "Z" in result or "17:00" in result  # adjusted to UTC


# ── Description sanitization ───────────────────────────────────────────────
class TestDescriptionSanitization:
    def test_strips_html_tags(self):
        result = mod.clean_description("<p>This is an <strong>article</strong>.</p>")
        assert "<p>" not in result
        assert "<strong>" not in result
        assert "article" in result

    def test_decodes_html_entities(self):
        result = mod.clean_description("Congress &amp; Senate passed the bill")
        assert "&amp;" not in result
        assert "Congress & Senate" in result

    def test_truncates_at_max_chars(self):
        long_text = "This is a very long description. " * 20
        result = mod.clean_description(long_text, max_chars=300)
        assert len(result) <= 305  # some tolerance for ellipsis

    def test_does_not_cut_mid_word(self):
        text = "A" * 280 + " ThisWordShouldNotBeCut"
        result = mod.clean_description(text, max_chars=280)
        assert "ThisWordShouldNotBeCut" not in result or result.endswith("…")

    def test_removes_read_more_boilerplate(self):
        result = mod.clean_description("Article content. Read more at our site.")
        assert "Read more" not in result

    def test_handles_empty_string(self):
        assert mod.clean_description("") == ""

    def test_no_raw_html_in_summary(self):
        art_desc = "<div><p>Summary with <b>bold</b> and <a href='x'>link</a></p></div>"
        summary = mod.generate_summary("AI Title", art_desc, "Other AI News", [])
        assert "<div>" not in summary["summary"]
        assert "<b>" not in summary["summary"]

    def test_missing_summary_fails_gracefully(self):
        summary = mod.generate_summary("AI Title", "", "Other AI News", [])
        assert summary["summary_method"] in ("title-only", "unavailable")
        assert isinstance(summary["key_points"], list)
        assert isinstance(summary["why_it_matters"], str)


# ── RSS feed parsing ───────────────────────────────────────────────────────
SAMPLE_RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tech News</title>
    <link>https://example.com</link>
    <description>Tech news feed</description>
    <item>
      <title>AI Regulation Bill Advances in Congress</title>
      <link>https://example.com/ai-bill-congress</link>
      <description>Congress is moving forward with a sweeping AI regulation bill that would require companies to conduct impact assessments.</description>
      <pubDate>Fri, 11 Jul 2026 12:00:00 +0000</pubDate>
      <guid>https://example.com/ai-bill-congress</guid>
    </item>
    <item>
      <title>Generic Consumer Electronics Review</title>
      <link>https://example.com/electronics-review</link>
      <description>We review the latest consumer electronics for 2026.</description>
      <pubDate>Thu, 10 Jul 2026 08:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Data Center Moratorium Lifted in Oregon</title>
      <link>https://example.com/dc-moratorium-oregon</link>
      <description>Oregon county ends its two-year ban on commercial data centers.</description>
      <pubDate>Wed, 09 Jul 2026 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>"""

SAMPLE_ATOM = b"""<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>AI Research Feed</title>
  <link href="https://research.example.com" />
  <entry>
    <title>New Large Language Model Achieves State-of-the-Art Results</title>
    <link href="https://research.example.com/llm-sota" rel="alternate" type="text/html"/>
    <updated>2026-07-11T09:00:00Z</updated>
    <summary>Researchers have released a new large language model that sets a new benchmark.</summary>
  </entry>
  <entry>
    <title>Quarterly Sales Report Q2 2026</title>
    <link href="https://research.example.com/sales-q2" rel="alternate" type="text/html"/>
    <updated>2026-07-10T09:00:00Z</updated>
    <summary>Quarterly sales for consumer products increased in Q2 2026.</summary>
  </entry>
</feed>"""


class TestFeedParsing:
    def test_rss_parse_returns_items(self):
        items = mod.parse_rss_feed(SAMPLE_RSS, "Example", "https://example.com")
        assert len(items) == 3

    def test_rss_parse_extracts_title(self):
        items = mod.parse_rss_feed(SAMPLE_RSS, "Example", "https://example.com")
        titles = [i["title"] for i in items]
        assert any("AI Regulation" in t for t in titles)

    def test_rss_parse_extracts_url(self):
        items = mod.parse_rss_feed(SAMPLE_RSS, "Example", "https://example.com")
        urls = [i["url"] for i in items]
        assert "https://example.com/ai-bill-congress" in urls

    def test_atom_parse_returns_entries(self):
        items = mod.parse_atom_feed(SAMPLE_ATOM, "Research", "https://research.example.com")
        assert len(items) == 2

    def test_atom_parse_extracts_title(self):
        items = mod.parse_atom_feed(SAMPLE_ATOM, "Research", "https://research.example.com")
        assert any("Large Language Model" in i["title"] for i in items)

    def test_parse_feed_detects_atom_auto(self):
        items = mod.parse_feed(SAMPLE_ATOM, "Research", "https://research.example.com")
        assert len(items) == 2

    def test_relevance_filters_out_non_ai(self):
        items = mod.parse_rss_feed(SAMPLE_RSS, "Example", "https://example.com")
        settings = {"relevance_threshold": 3, "request_timeout_seconds": 20,
                    "max_response_bytes": 2097152, "user_agent": "Test/1.0"}
        now = datetime.now(timezone.utc).isoformat()
        articles = []
        for raw in items:
            art = mod.build_article(raw, settings, now)
            if art:
                articles.append(art)
        titles = [a["title"] for a in articles]
        assert not any("Consumer Electronics" in t for t in titles)
        assert any("AI Regulation" in t for t in titles)

    def test_empty_content_returns_empty_list(self):
        assert mod.parse_rss_feed(b"", "Test", "https://test.com") == []

    def test_malformed_xml_does_not_crash(self):
        bad_xml = b"<rss><channel><item><title>broken</title>"
        result = mod.parse_feed(bad_xml, "Test", "https://test.com")
        # Should not raise; may return empty or partial
        assert isinstance(result, list)


# ── Article detail view safety ─────────────────────────────────────────────
class TestArticleSafety:
    def test_rejects_hash_url(self):
        assert not mod.is_safe_url("#")

    def test_rejects_javascript_url_in_build(self):
        settings = {"relevance_threshold": 2, "request_timeout_seconds": 20,
                    "max_response_bytes": 2097152, "user_agent": "Test/1.0"}
        now = datetime.now(timezone.utc).isoformat()
        raw = {
            "title": "AI regulation passes",
            "url": "javascript:alert(1)",
            "description": "artificial intelligence regulation passes",
            "raw_date": "2026-07-11",
            "source": "Test",
            "source_url": "https://test.com",
        }
        result = mod.build_article(raw, settings, now)
        assert result is None

    def test_sample_articles_removed_on_load(self, tmp_path):
        sample_data = {
            "articles": [
                {"id": "s1", "title": "Sample", "url": "#",
                 "source": "S", "category": "Other AI News"},
                {"id": "r1", "title": "Real", "url": "https://example.com/real",
                 "source": "S", "category": "Other AI News"},
            ]
        }
        p = tmp_path / "ai_news.json"
        p.write_text(json.dumps(sample_data))
        existing = mod.load_existing(str(p))
        assert len(existing) == 1
        assert existing[0]["id"] == "r1"


# ── Diversity cap ──────────────────────────────────────────────────────────
class TestDiversityCap:
    def _make_articles(self, source, count):
        return [
            {"id": f"{source}-{i}", "title": f"Article {i}", "source": source,
             "url": f"https://example.com/{source}/{i}", "category": "Other AI News",
             "published_at": "2026-07-11T12:00:00+00:00"}
            for i in range(count)
        ]

    def test_caps_single_source(self):
        arts = self._make_articles("TechCrunch", 30)
        result = mod.apply_diversity_cap(arts, max_per_source=25)
        assert len(result) == 25

    def test_allows_multiple_sources(self):
        arts = self._make_articles("TechCrunch", 10) + self._make_articles("Wired", 10)
        result = mod.apply_diversity_cap(arts, max_per_source=25)
        assert len(result) == 20


# ── Output validation ──────────────────────────────────────────────────────
class TestValidation:
    def _valid_art(self, **kwargs):
        base = {
            "id": "abc123", "title": "AI Bill Advances",
            "url": "https://example.com/ai-bill",
            "source": "TechCrunch", "category": "Federal Policy",
            "published_at": "2026-07-11T12:00:00+00:00",
            "location": {"state": None, "county": None},
        }
        base.update(kwargs)
        return base

    def test_valid_article_no_errors(self):
        errors = mod.validate_article(self._valid_art())
        assert errors == []

    def test_missing_title_error(self):
        errors = mod.validate_article(self._valid_art(title=""))
        assert any("title" in e for e in errors)

    def test_invalid_url_error(self):
        errors = mod.validate_article(self._valid_art(url="javascript:x"))
        assert any("url" in e for e in errors)

    def test_invalid_category_error(self):
        errors = mod.validate_article(self._valid_art(category="Fake Category"))
        assert any("category" in e for e in errors)

    def test_invalid_state_error(self):
        errors = mod.validate_article(self._valid_art(
            location={"state": "XX", "county": None}
        ))
        assert any("state" in e for e in errors)

    def test_valid_state_no_error(self):
        errors = mod.validate_article(self._valid_art(
            location={"state": "CA", "county": None}
        ))
        assert errors == []

    def test_sample_placeholder_url_error(self):
        errors = mod.validate_article(self._valid_art(url="#"))
        assert any("placeholder" in e or "url" in e for e in errors)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
