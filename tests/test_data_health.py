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


def test_parcel_service_health_matches_independent_recount():
    # Re-derive down/transient status independently from the real
    # data/parcel_health_history.json (written by check_parcel_services.mjs's
    # scheduled/dispatch runs), reimplementing isConfirmedDead's exact rule
    # (>=2 failures in the latest 3 recorded runs for a FIPS, OR a first-ever
    # recorded run with no prior history at all) rather than calling the
    # function under test twice, so this can actually catch a divergence
    # between the dashboard and the CI job that produced the data it reads.
    history_path = ROOT / "data" / "parcel_health_history.json"
    if not history_path.exists():
        return  # honestly nothing to check yet -- see the NOT_YET_TRACKED test below
    data = json.loads(history_path.read_text())
    down, transient = [], []
    for fips, runs in data.get("history", {}).items():
        if not runs or runs[-1].get("ok"):
            continue
        prior = runs[:-1][-(gdh.PARCEL_CONFIRMATION_WINDOW - 1):]
        if not prior:
            confirmed = True
        else:
            confirmed = (sum(1 for r in prior if not r.get("ok")) + 1) >= gdh.PARCEL_CONFIRMATION_THRESHOLD
        (down if confirmed else transient).append(fips)

    report = gdh.build_report()
    p = report["pipelines"]["parcels_registry"]
    assert sorted(p["persistently_down"]) == sorted(down)
    assert sorted(p["transiently_unreachable"]) == sorted(transient)
    if down:
        assert p["health"] == gdh.SOURCE_DOWN
    elif transient:
        assert p["health"] == gdh.NETWORK_FAILURE
    else:
        assert p["health"] == gdh.OK


def test_parcel_service_health_is_not_yet_tracked_without_a_history_file(tmp_path, monkeypatch):
    monkeypatch.setattr(gdh, "DATA_DIR", tmp_path)
    result = gdh._parcel_service_health()
    assert result["health"] == gdh.NOT_YET_TRACKED


def test_parcel_service_health_first_ever_failure_counts_as_confirmed(tmp_path, monkeypatch):
    # Mirrors data/check_parcel_services.mjs's own isConfirmedDead(): a FIPS
    # whose only recorded run ever is a failure has no prior runs to weigh
    # against, and the source script treats that as confirmed immediately
    # rather than waiting for a second data point -- this dashboard must
    # reach the same conclusion the CI job already acted on (tracking issue,
    # failed build), not a more lenient one that looks safer but disagrees.
    (tmp_path / "parcel_health_history.json").write_text(json.dumps({
        "meta": {"last_updated": "2026-01-01T00:00:00Z"},
        "history": {"99999": [{"timestamp": "2026-01-01T00:00:00Z", "ok": False, "errorType": "unknown"}]},
    }))
    monkeypatch.setattr(gdh, "DATA_DIR", tmp_path)
    result = gdh._parcel_service_health()
    assert result["health"] == gdh.SOURCE_DOWN
    assert result["persistently_down"] == ["99999"]


def test_parcel_service_health_single_unconfirmed_failure_is_transient(tmp_path, monkeypatch):
    # Two clean prior runs, then one failure -- only 1 failure in the window,
    # below the >=2 confirmation threshold, so this must NOT be reported as
    # SOURCE_DOWN (that would open a tracking issue for a possible blip).
    (tmp_path / "parcel_health_history.json").write_text(json.dumps({
        "meta": {"last_updated": "2026-01-01T00:00:00Z"},
        "history": {"99999": [
            {"timestamp": "2025-11-01T00:00:00Z", "ok": True, "errorType": None},
            {"timestamp": "2025-12-01T00:00:00Z", "ok": True, "errorType": None},
            {"timestamp": "2026-01-01T00:00:00Z", "ok": False, "errorType": "timeout"},
        ]},
    }))
    monkeypatch.setattr(gdh, "DATA_DIR", tmp_path)
    result = gdh._parcel_service_health()
    assert result["health"] == gdh.NETWORK_FAILURE
    assert result["transiently_unreachable"] == ["99999"]
    assert result["persistently_down"] == []


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
    pipeline_names = set(report["pipelines"].keys())
    # Every dataset must be accounted for exactly once: either it's in the
    # untracked list, or its id exactly matches a real pipeline key (which
    # reports its own honest health -- possibly NOT_YET_TRACKED itself, but
    # that's then visible via `pipelines` rather than silently dropped from
    # both places). A dataset must never appear in neither, and never in both.
    assert untracked | (pipeline_names & all_ids) == all_ids
    assert untracked.isdisjoint(pipeline_names)


def test_summary_counts_match_pipeline_entries():
    report = gdh.build_report()
    recount = {}
    for p in report["pipelines"].values():
        recount[p["health"]] = recount.get(p["health"], 0) + 1
    assert report["summary"]["counts_by_health"] == recount
    assert report["summary"]["pipelines_tracked"] == len(report["pipelines"])


def test_markdown_detail_column_is_not_blank_for_a_down_count_pipeline():
    # Regression: render_markdown() originally only recognized the
    # "total_sources" key (policy_pipeline_sources' shape), so
    # parcels_registry's identically-shaped "total_jurisdictions" down/
    # transient/total counts silently rendered as a bare "-" even while the
    # health column said SOURCE_DOWN -- a real finding, just invisible.
    report = gdh.build_report()
    md = gdh.render_markdown(report)
    p = report["pipelines"]["parcels_registry"]
    if "total_jurisdictions" in p:
        line = next(l for l in md.splitlines() if l.startswith("| parcels_registry "))
        assert " - |" not in line, "parcels_registry's down/transient/total detail must not render blank"
        assert str(p["total_jurisdictions"]) in line


def test_untracked_dataset_count_is_never_reported_as_of_itself():
    # Regression: the markdown literally said "N of N datasets have no
    # health check" using datasets_without_tracking_count on both sides of
    # "of" -- always tautologically 100%, and wrong the moment any dataset
    # id gained a real pipeline signal (as parcels_registry now has).
    report = gdh.build_report()
    md = gdh.render_markdown(report)
    n = report["summary"]["datasets_without_tracking_count"]
    total = report["summary"]["total_registered_datasets"]
    assert f"{n} of {total} datasets" in md
    if n != total:
        assert f"{n} of {n} datasets" not in md


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
