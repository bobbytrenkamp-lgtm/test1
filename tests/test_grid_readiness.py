"""tests/test_grid_readiness.py — data/generate_grid_readiness.py's
county-level Grid Readiness v1 score.

Concentrates on the properties that matter most for an explainable score:
a missing data SOURCE (interconnection_queue.json absent) must omit that
component's weight for every county, never score it zero; a county with
zero matching records in a present dataset gets a real zero, never an
omission (see the module's own header for why those are different facts);
the weighted mean always renormalizes over exactly the available weight;
and the curves are pure, deterministic, and monotonic.

Run:  python3 -m pytest tests/test_grid_readiness.py -q
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

import generate_grid_readiness as ggr  # noqa: E402


def _sub(fips, quality_tier="high", type_="SUBSTATION"):
    return {"county_fips": fips, "type": type_, "quality_tier": quality_tier}


def _queue_entry(fips, status="active", mw=100):
    return {"county_fips": fips, "queue_status": status, "capacity_mw": mw}


# ── interpolate() ────────────────────────────────────────────────────────

def test_interpolate_flat_below_first_breakpoint():
    assert ggr.interpolate(-5, ggr.SUBSTATION_COUNT_CURVE) == 0


def test_interpolate_flat_above_last_breakpoint():
    assert ggr.interpolate(10000, ggr.SUBSTATION_COUNT_CURVE) == 100


def test_interpolate_exact_breakpoint_values():
    for x, y in ggr.SUBSTATION_COUNT_CURVE:
        assert ggr.interpolate(x, ggr.SUBSTATION_COUNT_CURVE) == y


def test_interpolate_none_input_is_none_output():
    assert ggr.interpolate(None, ggr.SUBSTATION_COUNT_CURVE) is None


def test_curves_are_monotonically_non_decreasing():
    for curve in (ggr.SUBSTATION_COUNT_CURVE, ggr.QUEUE_ACTIVE_COUNT_CURVE, ggr.QUEUE_ACTIVE_MW_CURVE):
        ys = [y for _, y in curve]
        assert ys == sorted(ys), f"curve is not monotonic: {curve}"


# ── score_substation_component ───────────────────────────────────────────

def test_substation_component_zero_records_is_a_real_zero_not_none():
    result = ggr.score_substation_component([])
    assert result["score"] == 0
    assert result["inputs"]["substationCount"] == 0
    assert result["inputs"]["highTierFraction"] is None


def test_substation_component_counts_only_real_records_passed_in():
    records = [_sub("51107"), _sub("51107", quality_tier="low")]
    result = ggr.score_substation_component(records)
    assert result["inputs"]["substationCount"] == 2
    assert result["inputs"]["highTierFraction"] == 0.5


def test_substation_component_high_tier_fraction_never_blended_into_score():
    all_high = ggr.score_substation_component([_sub("X", "high") for _ in range(10)])
    all_low = ggr.score_substation_component([_sub("X", "low") for _ in range(10)])
    # Same count, different tier mix -- score must be identical because
    # tier mix is disclosed, not scored (see this component's own rule text).
    assert all_high["score"] == all_low["score"]


# ── score_queue_component ────────────────────────────────────────────────

def test_queue_component_excludes_withdrawn_and_operational():
    entries = [
        _queue_entry("X", status="active", mw=500),
        _queue_entry("X", status="withdrawn", mw=9999),
        _queue_entry("X", status="operational", mw=9999),
        _queue_entry("X", status="suspended", mw=9999),
    ]
    result = ggr.score_queue_component(entries)
    assert result["inputs"]["activeQueueEntries"] == 1
    assert result["inputs"]["activeQueueCapacityMw"] == 500
    assert result["inputs"]["totalQueueEntries"] == 4


def test_queue_component_missing_capacity_mw_treated_as_zero_not_dropped():
    entries = [{"county_fips": "X", "queue_status": "active"}]  # no capacity_mw key
    result = ggr.score_queue_component(entries)
    assert result["inputs"]["activeQueueEntries"] == 1
    assert result["inputs"]["activeQueueCapacityMw"] == 0


def test_queue_component_zero_active_entries_is_a_real_zero():
    result = ggr.score_queue_component([_queue_entry("X", status="withdrawn")])
    assert result["score"] == 0


# ── score_county: the omission-vs-real-zero distinction ─────────────────

def test_missing_queue_dataset_omits_the_whole_component_for_every_county():
    result = ggr.score_county("51107", [_sub("51107")], queue_entries=None, queue_available=False)
    component_ids = [c["component"] for c in result["components"]]
    omitted_ids = [o["component"] for o in result["omitted"]]
    assert "interconnection_activity" not in component_ids
    assert "interconnection_activity" in omitted_ids
    assert result["coverage"]["availableWeight"] == ggr.WEIGHTS["substation_infrastructure"]


def test_present_queue_dataset_with_zero_entries_scores_zero_not_omitted():
    result = ggr.score_county("51107", [_sub("51107")], queue_entries=[], queue_available=True)
    component_ids = [c["component"] for c in result["components"]]
    assert "interconnection_activity" in component_ids
    assert result["omitted"] == []
    q = next(c for c in result["components"] if c["component"] == "interconnection_activity")
    assert q["score"] == 0


def test_overall_is_weighted_mean_renormalized_over_available_weight():
    result = ggr.score_county("X", [_sub("X") for _ in range(200)], queue_entries=[], queue_available=True)
    sub = next(c for c in result["components"] if c["component"] == "substation_infrastructure")
    q = next(c for c in result["components"] if c["component"] == "interconnection_activity")
    expected = round(
        (sub["score"] * sub["weight"] + q["score"] * q["weight"])
        / (sub["weight"] + q["weight"])
    )
    assert result["overall"] == expected


def test_overall_never_none_when_substation_component_always_present():
    # substation_infrastructure never omits, so overall must always be a
    # real number even with the interconnection dataset entirely missing.
    result = ggr.score_county("X", [], queue_entries=None, queue_available=False)
    assert result["overall"] is not None
    assert result["overall"] == 0


def test_confidence_band_matches_available_pct():
    full = ggr.score_county("X", [_sub("X")], queue_entries=[], queue_available=True)
    assert full["confidence"] == "high"
    partial = ggr.score_county("X", [_sub("X")], queue_entries=None, queue_available=False)
    # 60/100 = 60% -> moderate band (>=60, <85)
    assert partial["confidence"] == "moderate"


# ── build_report: only real counties, no fabricated universe ────────────

def test_build_report_only_includes_counties_with_real_data(monkeypatch):
    monkeypatch.setattr(ggr, "load_substations_by_county", lambda: {"11111": [_sub("11111")]})
    monkeypatch.setattr(ggr, "load_queue_by_county", lambda: {"22222": [_queue_entry("22222")]})
    report = ggr.build_report()
    assert set(report["counties"].keys()) == {"11111", "22222"}
    assert report["meta"]["counties_scored"] == 2


def test_build_report_reflects_missing_queue_dataset_in_meta(monkeypatch):
    monkeypatch.setattr(ggr, "load_substations_by_county", lambda: {"11111": [_sub("11111")]})
    monkeypatch.setattr(ggr, "load_queue_by_county", lambda: None)
    report = ggr.build_report()
    assert report["meta"]["interconnection_queue_data_available"] is False
    for county in report["counties"].values():
        assert any(o["component"] == "interconnection_activity" for o in county["omitted"])


def test_county_in_queue_only_gets_a_real_zero_substation_score_not_omitted(monkeypatch):
    monkeypatch.setattr(ggr, "load_substations_by_county", lambda: {})
    monkeypatch.setattr(ggr, "load_queue_by_county", lambda: {"33333": [_queue_entry("33333")]})
    report = ggr.build_report()
    county = report["counties"]["33333"]
    sub = next(c for c in county["components"] if c["component"] == "substation_infrastructure")
    assert sub["score"] == 0
    assert sub["inputs"]["substationCount"] == 0
    assert county["omitted"] == []  # substation is a real zero, never omitted


# ── Committed artifacts are current ──────────────────────────────────────

def test_committed_artifacts_are_current():
    report = ggr.build_report()
    fresh_json = json.dumps(report, indent=2, sort_keys=True) + "\n"
    fresh_md = ggr.render_markdown(report)
    assert ggr.OUTPUT_JSON_PATH.read_text() == fresh_json, (
        "data/grid_readiness.json is stale -- run "
        "'python3 data/generate_grid_readiness.py' and commit the result."
    )
    assert ggr.OUTPUT_DOC_PATH.read_text() == fresh_md, (
        "docs/GRID_READINESS.md is stale -- run "
        "'python3 data/generate_grid_readiness.py' and commit the result."
    )
