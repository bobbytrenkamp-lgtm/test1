"""tests/test_data_catalog.py — the generated data catalog.

This file gets read to answer "how good is test1's data, really" for
category counts and coverage claims, so the tests concentrate on the two
ways a generated catalog can lie: reporting a count that doesn't match what's
actually in the file, and reporting automation/UI wiring that isn't real
(the two bugs a hand-check of the first generated output actually caught —
see the header comment on _automated_workflows in generate_data_catalog.py).

Run:  python3 -m pytest tests/test_data_catalog.py -q
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

import generate_data_catalog as gdc  # noqa: E402


def test_registry_every_dataset_has_required_fields():
    registry = json.loads(gdc.REGISTRY_PATH.read_text())
    required = {"id", "category", "name", "file", "source_org", "source_url",
                "geographic_scope_declared", "update_frequency_declared",
                "authoritative", "direct_or_derived", "license",
                "known_coverage_holes", "known_quality_issues"}
    seen_ids = set()
    for entry in registry["datasets"]:
        missing = required - set(entry.keys())
        assert not missing, f"{entry.get('id')} is missing fields: {missing}"
        assert entry["id"] not in seen_ids, f"duplicate dataset id {entry['id']}"
        seen_ids.add(entry["id"])


def test_every_registry_entry_has_a_record_count_rule():
    # A dataset with no rule silently reports null forever, which is
    # indistinguishable from "the file legitimately has zero records" in the
    # rendered doc. Every declared dataset must have an explicit rule, even
    # if that rule is `lambda: 0` for a genuinely unimplemented dataset.
    registry = json.loads(gdc.REGISTRY_PATH.read_text())
    for entry in registry["datasets"]:
        assert entry["id"] in gdc.RECORD_COUNT_RULES, \
            f"{entry['id']} has no RECORD_COUNT_RULES entry"


def test_record_counts_match_the_actual_files():
    # Cross-checks a handful of known, stable counts directly against the
    # source file, independent of the generator's own extraction code — a
    # test that called the same function it's testing would not catch the
    # function reading the wrong key.
    catalog = gdc.build_catalog()
    by_id = {d["id"]: d for d in catalog["datasets"]}

    facilities = json.loads((ROOT / "data" / "facilities_index.json").read_text())
    assert by_id["data_centers"]["record_count"] == len(facilities)

    layers = json.loads((ROOT / "data" / "sample_layers.json").read_text())
    assert by_id["transmission_lines"]["record_count"] == len(layers["transmission_lines"])
    assert by_id["substations"]["record_count"] == len(layers["power_infrastructure"])
    assert by_id["fiber_network"]["record_count"] == len(layers["fiber_network"])
    assert by_id["water_stress"]["record_count"] == len(layers["water_stress"])

    risk = json.loads((ROOT / "data" / "political_risk.json").read_text())
    assert by_id["political_risk"]["record_count"] == len(risk["scores"])


def test_parcel_registry_count_is_read_live_not_hardcoded():
    # The whole point of computing this rather than declaring it: it must
    # track js/parcel/registry.js without anyone touching this file.
    catalog = gdc.build_catalog()
    by_id = {d["id"]: d for d in catalog["datasets"]}
    count = by_id["parcels_registry"]["record_count"]
    assert isinstance(count, int) and count > 0

    out = subprocess.run(
        ["node", "data/parcel_pipeline/check_registry_integrity.mjs"],
        cwd=ROOT, capture_output=True, text=True, timeout=30,
    )
    # check_registry_integrity.mjs prints "OK -- N jurisdictions, ..."
    assert f"{count} jurisdictions" in out.stdout, (
        f"catalog says {count} parcel jurisdictions but the integrity check reports: {out.stdout}"
    )


def test_datasets_with_no_data_are_never_reported_as_ui_consumed_or_automated():
    # An engine can exist for a dataset that has zero records (constraint
    # layers registered "unavailable" is the canonical case). It must not
    # ALSO claim to be on an automated refresh workflow, or the catalog would
    # misrepresent an unimplemented dataset as a working one.
    #
    # UI-consumed is NOT included in this blanket check. "Wired into the UI
    # but currently zero records" is a real, distinct, honest state — e.g.
    # fiber_network: the map's rendering code path genuinely exists and would
    # draw real routes if any were present, it simply holds none right now
    # after the fabricated placeholder entries were removed. That is a
    # meaningfully different fact from "no UI code path exists at all" (true
    # of most zero-record datasets), and collapsing the two would hide
    # exactly the kind of half-finished wiring this catalog exists to surface.
    # Automation is allowed the same documented exception, for the same
    # underlying reason: fiber_network is one key inside sample_layers.json,
    # and update_infrastructure.yml genuinely does refresh that whole file
    # every week. The workflow is real; it just has nothing to write into
    # this particular key because no source populates it.
    catalog = gdc.build_catalog()
    # fema_flood: genuinely live-queried per parcel bounding box (see
    # js/parcel/constraint-layers.js) -- there is no local record count
    # concept for a live nationwide polygon service, so has_data is
    # honestly false even though the wiring is real and automated_update_
    # workflows/ui_consumed are correctly true. power_plants no longer
    # needs this exception -- 1,295 real records landed 2026-08-09.
    ALLOWED_WITH_NO_DATA = {"fiber_network", "fema_flood"}
    for d in catalog["datasets"]:
        if not d["has_data"]:
            if d["ui_consumed"] or d["automated_update_workflows"]:
                assert d["id"] in ALLOWED_WITH_NO_DATA, (
                    f"{d['id']} has no data but claims ui_consumed={d['ui_consumed']} / "
                    f"automated={d['automated_update_workflows']}, and is not in the documented "
                    f"allow-list of datasets with a real-but-currently-empty pipeline"
                )


def test_automated_workflow_detection_does_not_match_bare_common_words():
    # Regression for the exact bug caught by hand: a directory path like
    # "data/zoning/jurisdictions" must not match on the bare word
    # "jurisdictions" appearing in an unrelated workflow's UI text.
    matches = gdc._automated_workflows("data/zoning/jurisdictions")
    for wf in matches:
        text = (ROOT / ".github" / "workflows" / wf).read_text()
        assert "data/zoning/jurisdictions" in text, (
            f"{wf} matched zoning_jurisdictions on something other than the full path"
        )


def test_automated_workflow_detection_prefers_the_real_automation():
    # Regression: data/sample_layers.json is genuinely updated by
    # update_infrastructure.yml. A coincidental mention of the same filename
    # inside an unrelated workflow's error-message string must not be the
    # ONLY thing reported -- both may legitimately appear, but the real one
    # must never be silently shadowed by picking just the first match.
    matches = gdc._automated_workflows("data/sample_layers.json#transmission_lines")
    assert "update_infrastructure.yml" in matches


def test_categories_summary_totals_match_the_dataset_list():
    catalog = gdc.build_catalog()
    total_from_categories = sum(c["dataset_count"] for c in catalog["categories"])
    assert total_from_categories == len(catalog["datasets"])

    for cat in catalog["categories"]:
        items = [d for d in catalog["datasets"] if d["category"] == cat["category"]]
        assert cat["datasets_with_data"] == sum(1 for d in items if d["has_data"])
        assert cat["total_records"] == sum(d["record_count"] or 0 for d in items if d["has_data"])


def test_json_path_counter_distinguishes_shapes():
    # A bare list, a dict-of-lists, and a dict-keyed-by-id must each be
    # counted correctly rather than assuming one shape for every file.
    import tempfile
    import os as _os
    with tempfile.TemporaryDirectory() as td:
        old_root = gdc.ROOT
        try:
            gdc.ROOT = Path(td)
            (Path(td) / "data").mkdir()
            (Path(td) / "data" / "a.json").write_text(json.dumps([1, 2, 3]))
            (Path(td) / "data" / "b.json").write_text(json.dumps({"items": [1, 2]}))
            (Path(td) / "data" / "c.json").write_text(json.dumps({"x": 1, "y": 2, "z": 3}))
            assert gdc._count_json_path("data/a.json") == 3
            assert gdc._count_json_path("data/b.json", "items") == 2
            assert gdc._count_json_path("data/c.json") == 3
            # A key that does not exist must report None, not crash or
            # silently return the count of some other node.
            assert gdc._count_json_path("data/b.json", "nonexistent") is None
            assert gdc._count_json_path("data/does_not_exist.json") is None
        finally:
            gdc.ROOT = old_root


def test_markdown_states_the_has_data_false_meaning():
    catalog = gdc.build_catalog()
    md = gdc.render_markdown(catalog)
    assert "engine or architecture may exist" in md
    assert "zero real records" in md
    # At least one dataset with no data must actually be rendered as such.
    assert "⛔ no data" in md


def test_check_mode_detects_staleness_and_matches_after_regeneration(tmp_path, monkeypatch):
    # End-to-end: mutate the committed artifact, confirm --check fails,
    # regenerate, confirm --check passes. Mirrors how CI actually uses this.
    original = gdc.CATALOG_PATH.read_text()
    try:
        mutated = json.loads(original)
        mutated["totals"]["dataset_count"] = 999999
        gdc.CATALOG_PATH.write_text(json.dumps(mutated, indent=2) + "\n")

        result = subprocess.run(
            [sys.executable, "data/generate_data_catalog.py", "--check"],
            cwd=ROOT, capture_output=True, text=True,
        )
        assert result.returncode != 0
        assert "stale" in result.stdout.lower()
    finally:
        gdc.CATALOG_PATH.write_text(original)

    result = subprocess.run(
        [sys.executable, "data/generate_data_catalog.py", "--check"],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stdout
