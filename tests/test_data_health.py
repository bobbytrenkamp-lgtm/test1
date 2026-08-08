"""tests/test_data_health.py — the project-wide data health dashboard.

Concentrates on the two ways this dashboard could quietly lie: reporting OK
when there is actually no signal (NOT_YET_TRACKED must never be silently
upgraded to OK), and reporting a health state that doesn't match what the
real underlying files (source_health.json, source_link_health.json,
map_data.json's validation_report) actually say.

Run:  python3 -m pytest tests/test_data_health.py -q
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

import generate_data_health as gdh  # noqa: E402


def test_every_pipeline_health_is_a_real_state():
    report = gdh.build_report()
    for name, p in report["pipelines"].items():
        assert p["health"] in gdh.HEALTH_STATES, f"{name} has an unrecognized health state {p['health']}"


def test_not_yet_tracked_is_never_silently_upgraded_to_ok():
    # static_parcel_ingestion has zero registered sources in the real repo
    # right now -- this must show up as NOT_YET_TRACKED, never OK, since "no
    # signal" and "signal says healthy" are not the same claim.
    report = gdh.build_report()
    static = report["pipelines"]["static_parcel_ingestion"]
    sources_registry = json.loads((ROOT / "data" / "parcel_pipeline" / "static_ingestion" / "sources.json").read_text())
    if not sources_registry.get("sources"):
        assert static["health"] == gdh.NOT_YET_TRACKED


def test_missing_report_file_is_not_yet_tracked_not_ok(tmp_path):
    result = gdh._citation_link_health(None, "fake_pipeline")
    assert result["health"] == gdh.NOT_YET_TRACKED


def test_policy_source_health_matches_independent_recount():
    # Re-derive the down/transient counts independently from the real
    # source_health.json file (not by calling the function under test twice)
    # so this can actually catch a bug in the classification logic.
    data = json.loads((ROOT / "data" / "source_health.json").read_text())
    sources = data["sources"]
    down = [sid for sid, s in sources.items()
            if not s["reachable"] and (s.get("consecutive_failures") or 0) >= gdh.PERSISTENT_FAILURE_THRESHOLD]
    transient = [sid for sid, s in sources.items()
                 if not s["reachable"] and (s.get("consecutive_failures") or 0) < gdh.PERSISTENT_FAILURE_THRESHOLD]

    report = gdh.build_report()
    p = report["pipelines"]["policy_pipeline_sources"]
    assert sorted(p["persistently_down"]) == sorted(down)
    assert sorted(p["transiently_unreachable"]) == sorted(transient)
    if down:
        assert p["health"] == gdh.SOURCE_DOWN
    elif transient:
        assert p["health"] == gdh.NETWORK_FAILURE
    else:
        assert p["health"] == gdh.OK


def test_citation_health_ratio_above_threshold_is_validation_failure():
    result = gdh._citation_link_health({"summary": {"checked": 100, "unreachable": 20}}, "test")
    assert result["health"] == gdh.VALIDATION_FAILURE
    assert result["unreachable_ratio"] == 0.2


def test_citation_health_ratio_below_threshold_is_ok():
    result = gdh._citation_link_health({"summary": {"checked": 100, "unreachable": 5}}, "test")
    assert result["health"] == gdh.OK


def test_citation_health_handles_map_data_shape_directly():
    # map_data.json's validation_report has no nested "summary" key -- the
    # counts are at the top level. This must be handled without a KeyError.
    result = gdh._citation_link_health({"total_checked": 50, "broken": 30, "last_run": "x"}, "map_data_citations")
    assert result["health"] == gdh.VALIDATION_FAILURE
    assert result["total_urls_checked"] == 50
    assert result["unreachable"] == 30


def test_no_dataset_is_ever_silently_marked_ok_without_a_real_signal():
    report = gdh.build_report()
    registry = json.loads((ROOT / "data" / "catalog" / "dataset_registry.json").read_text())
    all_ids = {d["id"] for d in registry["datasets"]}
    untracked = set(report["datasets_without_automated_health_tracking"])
    # Every dataset must be accounted for: either it's in the untracked list,
    # or there is a real reason it's covered by name in `pipelines` -- today
    # nothing maps 1:1, so every dataset must currently appear untracked.
    assert untracked == all_ids


def test_summary_counts_match_pipeline_entries():
    report = gdh.build_report()
    recount = {}
    for p in report["pipelines"].values():
        recount[p["health"]] = recount.get(p["health"], 0) + 1
    assert report["summary"]["counts_by_health"] == recount
    assert report["summary"]["pipelines_tracked"] == len(report["pipelines"])


def test_markdown_never_claims_full_tracking_when_gaps_exist():
    report = gdh.build_report()
    md = gdh.render_markdown(report)
    if report["datasets_without_automated_health_tracking"]:
        assert "no automated health signal" in md.lower()
        for d in report["datasets_without_automated_health_tracking"]:
            assert d in md


def test_committed_artifacts_are_current():
    result = subprocess.run(
        [sys.executable, "data/generate_data_health.py", "--check"],
        cwd=str(ROOT), capture_output=True, text=True,
    )
    assert result.returncode == 0, (
        f"data/data_health.json or docs/DATA_HEALTH.md is stale -- regenerate with "
        f"'python3 data/generate_data_health.py'.\n{result.stdout}\n{result.stderr}"
    )
