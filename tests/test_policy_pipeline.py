"""Tests for the government-source policy pipeline.

All tests are offline — no live network calls. Fixtures provide mock HTML,
RSS XML, and JSON payloads. Run with: pytest tests/test_policy_pipeline.py
"""
import json
import os
import sys
import tempfile
import pytest

# Allow imports from data/ directory
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
sys.path.insert(0, DATA_DIR)

from policy_pipeline.models import (
    PolicyCandidate, PolicySource, LifecycleEvent,
    LIFECYCLE_STAGES, STATUS_TO_LIFECYCLE, LIFECYCLE_TO_STATUS,
    load_json_file, save_json_file,
)
from policy_pipeline.classify import (
    classify_policy_types, classify_level, classify_lifecycle_stage, score_relevance,
)
from policy_pipeline.lifecycle import (
    map_status_to_stage, map_stage_to_status, build_lifecycle_event,
    is_terminal_stage, should_escalate, add_lifecycle_fields_to_entry,
    migrate_restrictions_file,
)
from policy_pipeline.validation import validate_candidate, is_valid, filter_valid_candidates
from policy_pipeline.deduplicate import (
    is_duplicate_of_existing, is_duplicate_of_candidate,
    deduplicate_candidates, mark_fips_match,
)
from policy_pipeline.normalize import (
    normalize_html_page, normalize_rss_entries, _make_candidate_id,
    extract_date_from_text,
)
from policy_pipeline.adapters.rss_atom import _parse_rss2, _parse_atom, _parse_feed
import xml.etree.ElementTree as ET


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_source(**kwargs) -> PolicySource:
    defaults = dict(
        id="test-source",
        jurisdiction_type="county",
        jurisdiction_name="Test County",
        state="Virginia",
        state_abbr="VA",
        state_fips="51",
        fips="51059",
        title="Test County Planning",
        url="https://example.gov/planning",
        url_verified=False,
        last_checked=None,
        tier=1,
        adapter="generic_html",
        active=True,
        policy_types=["data_center"],
        notes="",
    )
    defaults.update(kwargs)
    return PolicySource(**defaults)


def make_candidate(**kwargs) -> PolicyCandidate:
    defaults = dict(
        candidate_id="test-county-abc123456789",
        source_id="test-source",
        discovered_at="2026-07-12T00:00:00+00:00",
        jurisdiction_name="Test County",
        state="Virginia",
        state_abbr="VA",
        fips="51059",
        title="Test County Data Center Moratorium",
        description="The board of supervisors enacted a moratorium on new data centers.",
        signal_url="https://example.gov/ordinance/12345",
        lifecycle_stage="effective",
        policy_types=["data_center"],
        confidence=0.75,
        evidence="enacted a moratorium on new data centers",
        existing_fips_match=None,
        review_status="pending",
    )
    defaults.update(kwargs)
    return PolicyCandidate(**defaults)


MORATORIUM_HTML = """
<html><head><title>Test County - Data Center Moratorium Ordinance</title></head>
<body>
<h1>Ordinance 2024-07: Data Center Moratorium</h1>
<p>The Board of Supervisors has enacted a temporary moratorium on new data center
developments in Test County effective July 2024. The moratorium addresses concerns
about energy grid capacity and water use impacts.</p>
</body></html>
"""

RSS_XML = """<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test County Board of Supervisors</title>
    <link>https://example.gov/board</link>
    <item>
      <title>Data Center Moratorium Ordinance 2024-07</title>
      <link>https://example.gov/ordinance/12345</link>
      <description>Board enacts moratorium on new data center construction.</description>
      <pubDate>Tue, 01 Jul 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Road Maintenance Schedule</title>
      <link>https://example.gov/roads</link>
      <description>Quarterly road maintenance update.</description>
    </item>
  </channel>
</rss>"""

ATOM_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test City Council</title>
  <entry>
    <title>AI Surveillance Restriction Ordinance</title>
    <link href="https://example.gov/ai-ordinance"/>
    <summary>Council votes to restrict government use of facial recognition AI.</summary>
  </entry>
  <entry>
    <title>Parks Department Budget</title>
    <link href="https://example.gov/parks"/>
    <summary>Annual parks department budget review.</summary>
  </entry>
</feed>"""


# ---------------------------------------------------------------------------
# Test group 1: classify.py
# ---------------------------------------------------------------------------

class TestClassify:
    def test_classify_data_center(self):
        types = classify_policy_types("new data center development moratorium")
        assert "data_center" in types

    def test_classify_ai(self):
        types = classify_policy_types("facial recognition artificial intelligence ban")
        assert "ai" in types

    def test_classify_crypto(self):
        types = classify_policy_types("cryptocurrency mining ban proof-of-work")
        assert "crypto" in types

    def test_classify_energy(self):
        types = classify_policy_types("grid capacity energy efficiency megawatt demand response")
        assert "energy" in types

    def test_classify_water(self):
        types = classify_policy_types("groundwater depletion water use restrictions aquifer")
        assert "water" in types

    def test_classify_multiple_types(self):
        types = classify_policy_types("data center water use ban moratorium")
        assert "data_center" in types
        assert "water" in types

    def test_classify_level_ban(self):
        assert classify_level("outright ban prohibit data centers") == 4

    def test_classify_level_moratorium(self):
        assert classify_level("moratorium on new developments") == 3

    def test_classify_level_proposed(self):
        assert classify_level("proposed enhanced review requirements") == 2

    def test_classify_level_incentive(self):
        assert classify_level("tax exemption enterprise zone incentive program") == -1

    def test_classify_level_default(self):
        assert classify_level("unrelated text about road maintenance") == 0

    def test_lifecycle_stage_enacted(self):
        assert classify_lifecycle_stage("ordinance adopted by council resolution") == "enacted"

    def test_lifecycle_stage_effective(self):
        assert classify_lifecycle_stage("currently in effect enforcement active") == "effective"

    def test_lifecycle_stage_failed(self):
        assert classify_lifecycle_stage("bill failed to pass vote defeated") == "failed"

    def test_score_relevance_high(self):
        score = score_relevance(MORATORIUM_HTML, ["data_center", "energy"])
        assert score > 0.4

    def test_score_relevance_low_irrelevant(self):
        score = score_relevance("Quarterly road maintenance schedule update.", ["data_center"])
        assert score < 0.3


# ---------------------------------------------------------------------------
# Test group 2: lifecycle.py
# ---------------------------------------------------------------------------

class TestLifecycle:
    def test_map_status_active(self):
        assert map_status_to_stage("active") == "effective"

    def test_map_status_proposed(self):
        assert map_status_to_stage("proposed") == "proposed"

    def test_map_status_expired(self):
        assert map_status_to_stage("expired") == "expired"

    def test_map_stage_to_status(self):
        assert map_stage_to_status("effective") == "active"
        assert map_stage_to_status("expired") == "expired"
        assert map_stage_to_status("repealed") == "expired"

    def test_build_lifecycle_event(self):
        event = build_lifecycle_event("proposed", "effective", "manual_review")
        assert event.from_stage == "proposed"
        assert event.to_stage == "effective"
        assert event.trigger == "manual_review"

    def test_build_lifecycle_event_invalid_stage(self):
        with pytest.raises(ValueError, match="Unknown lifecycle stage"):
            build_lifecycle_event(None, "nonexistent", "pipeline_discovery")

    def test_is_terminal_stage(self):
        assert is_terminal_stage("expired") is True
        assert is_terminal_stage("repealed") is True
        assert is_terminal_stage("failed") is True
        assert is_terminal_stage("effective") is False

    def test_should_escalate_discovered(self):
        assert should_escalate("discovered", 31) is True
        assert should_escalate("discovered", 10) is False

    def test_should_escalate_proposed(self):
        assert should_escalate("proposed", 181) is True
        assert should_escalate("proposed", 90) is False

    def test_add_lifecycle_fields(self):
        entry = {"fips": "51059", "status": "active", "title": "Test"}
        result = add_lifecycle_fields_to_entry(entry)
        assert result["lifecycle_stage"] == "effective"
        assert result["pipeline_verified"] is False
        assert "last_reviewed" in result

    def test_add_lifecycle_fields_idempotent(self):
        entry = {"fips": "51059", "status": "active", "lifecycle_stage": "enacted"}
        result = add_lifecycle_fields_to_entry(entry)
        assert result["lifecycle_stage"] == "enacted"  # Not overwritten

    def test_migrate_restrictions_file(self):
        raw = {
            "meta": {},
            "restrictions": [
                {"fips": "51059", "status": "active"},
                {"fips": "51107", "status": "proposed"},
                {"fips": "44007", "status": "expired"},
            ]
        }
        result = migrate_restrictions_file(raw)
        stages = [r["lifecycle_stage"] for r in result["restrictions"]]
        assert stages == ["effective", "proposed", "expired"]


# ---------------------------------------------------------------------------
# Test group 3: validation.py
# ---------------------------------------------------------------------------

class TestValidation:
    def test_valid_candidate_passes(self):
        c = make_candidate()
        errors = validate_candidate(c)
        assert errors == []

    def test_missing_title(self):
        c = make_candidate(title="short")
        errors = validate_candidate(c)
        assert any("Title too short" in str(e) for e in errors)

    def test_invalid_lifecycle_stage(self):
        c = make_candidate(lifecycle_stage="totally_wrong")
        errors = validate_candidate(c)
        assert any("lifecycle_stage" in str(e) for e in errors)

    def test_invalid_policy_type(self):
        c = make_candidate(policy_types=["data_center", "aliens"])
        errors = validate_candidate(c)
        assert any("aliens" in str(e) for e in errors)

    def test_invalid_fips(self):
        c = make_candidate(fips="999")
        errors = validate_candidate(c)
        assert any("FIPS" in str(e) for e in errors)

    def test_low_confidence(self):
        c = make_candidate(confidence=0.05)
        errors = validate_candidate(c)
        assert any("confidence" in str(e).lower() for e in errors)

    def test_filter_separates_valid_invalid(self):
        valid_c = make_candidate()
        invalid_c = make_candidate(title="x", candidate_id="bad")
        valid, invalid = filter_valid_candidates([valid_c, invalid_c])
        assert len(valid) == 1
        assert len(invalid) == 1


# ---------------------------------------------------------------------------
# Test group 4: deduplicate.py
# ---------------------------------------------------------------------------

class TestDeduplicate:
    EXISTING = [
        {"fips": "51059", "title": "Fairfax County Comprehensive Plan Data Center Restrictions"},
        {"fips": "51107", "title": "Loudoun County Data Center Overlay Zone Restrictions"},
    ]

    def test_existing_fips_not_duplicate_different_title(self):
        c = make_candidate(fips="51059", title="Fairfax County New Energy Moratorium 2026")
        assert not is_duplicate_of_existing(c, self.EXISTING)

    def test_existing_fips_duplicate_similar_title(self):
        c = make_candidate(
            fips="51059",
            title="Fairfax County Comprehensive Plan Data Center Restrictions Update"
        )
        assert is_duplicate_of_existing(c, self.EXISTING)

    def test_no_fips_not_duplicate(self):
        c = make_candidate(fips=None)
        assert not is_duplicate_of_existing(c, self.EXISTING)

    def test_prior_candidate_duplicate(self):
        prior = [make_candidate().to_dict()]
        c = make_candidate()  # Same candidate_id
        assert is_duplicate_of_candidate(c, prior)

    def test_deduplicate_separates_correctly(self):
        new_c = make_candidate(candidate_id="new-unique-abc123456789", fips="51153")
        dup_c = make_candidate()  # Same as prior
        prior = [make_candidate().to_dict()]
        new, dups = deduplicate_candidates([new_c, dup_c], self.EXISTING, prior)
        assert len(new) == 1
        assert len(dups) == 1
        assert new[0].candidate_id == "new-unique-abc123456789"

    def test_mark_fips_match_annotates(self):
        c = make_candidate(fips="51059", existing_fips_match=None)
        c2 = mark_fips_match(c, self.EXISTING)
        assert c2.existing_fips_match == "51059"


# ---------------------------------------------------------------------------
# Test group 5: normalize.py
# ---------------------------------------------------------------------------

class TestNormalize:
    def test_normalize_html_finds_moratorium(self):
        source = make_source()
        results = normalize_html_page(
            html=MORATORIUM_HTML,
            source_id=source.id,
            source_url=source.url,
            jurisdiction_name=source.jurisdiction_name,
            state=source.state,
            state_abbr=source.state_abbr,
            fips=source.fips,
            source_policy_types=source.policy_types,
        )
        assert len(results) > 0
        assert results[0].lifecycle_stage in LIFECYCLE_STAGES
        assert "data_center" in results[0].policy_types

    def test_normalize_html_irrelevant_returns_empty(self):
        source = make_source()
        results = normalize_html_page(
            html="<html><body><p>Road maintenance schedule for Q3.</p></body></html>",
            source_id=source.id,
            source_url=source.url,
            jurisdiction_name=source.jurisdiction_name,
            state=source.state,
            state_abbr=source.state_abbr,
            fips=source.fips,
            source_policy_types=source.policy_types,
        )
        assert results == []

    def test_normalize_rss_filters_irrelevant(self):
        source = make_source()
        root = ET.fromstring(RSS_XML)
        entries = _parse_rss2(root)
        results = normalize_rss_entries(
            entries=entries,
            source_id=source.id,
            jurisdiction_name=source.jurisdiction_name,
            state=source.state,
            state_abbr=source.state_abbr,
            fips=source.fips,
            source_policy_types=source.policy_types,
        )
        # Should find the data center item but not the road maintenance item
        assert len(results) >= 1
        assert all("data_center" in r.policy_types or "energy" in r.policy_types for r in results)

    def test_extract_iso_date(self):
        assert extract_date_from_text("Effective date: 2024-07-01.") == "2024-07-01"

    def test_extract_us_date(self):
        assert extract_date_from_text("Adopted on 7/1/2024.") == "2024-07-01"

    def test_candidate_id_deterministic(self):
        id1 = _make_candidate_id("source-a", "Title One", "51059")
        id2 = _make_candidate_id("source-a", "Title One", "51059")
        assert id1 == id2

    def test_candidate_id_varies_by_title(self):
        id1 = _make_candidate_id("source-a", "Title One", "51059")
        id2 = _make_candidate_id("source-a", "Title Two", "51059")
        assert id1 != id2


# ---------------------------------------------------------------------------
# Test group 6: RSS/Atom parsing
# ---------------------------------------------------------------------------

class TestRssParsing:
    def test_parse_rss2(self):
        root = ET.fromstring(RSS_XML)
        entries = _parse_rss2(root)
        assert len(entries) == 2
        assert entries[0]["title"] == "Data Center Moratorium Ordinance 2024-07"
        assert "moratorium" in entries[0]["description"].lower()

    def test_parse_atom(self):
        root = ET.fromstring(ATOM_XML)
        entries = _parse_atom(root)
        assert len(entries) == 2
        assert "AI" in entries[0]["title"] or "facial" in entries[0].get("summary", "").lower()

    def test_parse_feed_rss(self):
        entries = _parse_feed(RSS_XML)
        assert len(entries) == 2

    def test_parse_feed_atom(self):
        entries = _parse_feed(ATOM_XML)
        assert len(entries) == 2

    def test_parse_feed_invalid(self):
        entries = _parse_feed("not valid xml <<<")
        assert entries == []


# ---------------------------------------------------------------------------
# Test group 7: models / serialization
# ---------------------------------------------------------------------------

class TestModels:
    def test_policy_source_roundtrip(self):
        source = make_source()
        d = source.to_dict()
        restored = PolicySource.from_dict(d)
        assert restored.id == source.id
        assert restored.fips == source.fips

    def test_policy_candidate_roundtrip(self):
        c = make_candidate()
        d = c.to_dict()
        restored = PolicyCandidate.from_dict(d)
        assert restored.candidate_id == c.candidate_id
        assert restored.lifecycle_stage == c.lifecycle_stage

    def test_save_load_json(self):
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            fname = f.name
        try:
            save_json_file(fname, {"key": "value", "list": [1, 2, 3]})
            data = load_json_file(fname)
            assert data["key"] == "value"
            assert data["list"] == [1, 2, 3]
        finally:
            os.unlink(fname)

    def test_load_json_missing_returns_none(self):
        result = load_json_file("/nonexistent/path/file.json")
        assert result is None


# ---------------------------------------------------------------------------
# Test group 8: government_sources.json integrity
# ---------------------------------------------------------------------------

class TestGovernmentSourcesJson:
    SOURCES_PATH = os.path.join(DATA_DIR, "government_sources.json")

    def test_file_exists(self):
        assert os.path.exists(self.SOURCES_PATH), "government_sources.json not found"

    def test_valid_json(self):
        with open(self.SOURCES_PATH) as f:
            data = json.load(f)
        assert "sources" in data
        assert "meta" in data

    def test_minimum_source_count(self):
        with open(self.SOURCES_PATH) as f:
            data = json.load(f)
        assert len(data["sources"]) >= 75, f"Expected ≥75 sources, got {len(data['sources'])}"

    def test_all_sources_have_required_fields(self):
        required = {"id", "jurisdiction_type", "jurisdiction_name", "title", "tier", "adapter", "active"}
        with open(self.SOURCES_PATH) as f:
            data = json.load(f)
        for s in data["sources"]:
            missing = required - set(s.keys())
            assert not missing, f"Source {s.get('id','?')} missing fields: {missing}"

    def test_no_duplicate_ids(self):
        with open(self.SOURCES_PATH) as f:
            data = json.load(f)
        ids = [s["id"] for s in data["sources"]]
        assert len(ids) == len(set(ids)), "Duplicate source IDs found"

    def test_valid_tiers(self):
        with open(self.SOURCES_PATH) as f:
            data = json.load(f)
        for s in data["sources"]:
            assert s["tier"] in (1, 2, 3), f"Invalid tier {s['tier']} in source {s['id']}"

    def test_valid_adapters(self):
        valid_adapters = {"generic_html", "rss_atom", "sitemap", "legistar",
                          "granicus", "state_legislature", "open_data"}
        with open(self.SOURCES_PATH) as f:
            data = json.load(f)
        for s in data["sources"]:
            assert s["adapter"] in valid_adapters, \
                f"Unknown adapter {s['adapter']!r} in source {s['id']}"

    def test_url_verified_is_bool(self):
        with open(self.SOURCES_PATH) as f:
            data = json.load(f)
        for s in data["sources"]:
            if "url_verified" in s:
                assert isinstance(s["url_verified"], bool), \
                    f"url_verified must be bool in source {s['id']}"
