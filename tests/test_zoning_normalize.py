"""
Tests for data/zoning/scripts/normalize_zoning.py's map_district_code().

Real-data motivation (2026-08-13): Loudoun County's live zoning GIS service
returns raw district codes without hyphens ('PDIP', 'JLMA3'), while
districts.json's hand-transcribed keys include them ('PD-IP', 'JLMA-3').
Without punctuation-insensitive matching, 56 real parcels (44 'PDIP' + 12
'JLMA3', counted from the live-fetched geometry on 2026-08-13) silently fell
through to "unclassified" even though their district is fully documented
under a differently-punctuated key. This is a real bug found from real data,
not a synthetic scenario.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data" / "zoning" / "scripts"))

import normalize_zoning as nz  # noqa: E402
import zoning_config as zc     # noqa: E402


def test_exact_match_untouched():
    known = {"PD-IP", "I1", "I2", "AR1", "JLMA-3", "B2", "PD-OP"}
    assert nz.map_district_code("I1", "va-loudoun-county", known) == "I1"


def test_hyphen_omitted_in_source_matches_hyphenated_known_code():
    known = {"PD-IP", "I1", "I2", "AR1", "JLMA-3", "B2", "PD-OP"}
    assert nz.map_district_code("PDIP", "va-loudoun-county", known) == "PD-IP"
    assert nz.map_district_code("JLMA3", "va-loudoun-county", known) == "JLMA-3"


def test_lowercase_and_whitespace_normalized():
    known = {"PD-IP"}
    assert nz.map_district_code(" pd-ip ", "va-loudoun-county", known) == "PD-IP"
    assert nz.map_district_code("pdip", "va-loudoun-county", known) == "PD-IP"


def test_genuinely_unmatched_code_returned_as_is_not_guessed():
    # 'IP' (Loudoun's real, common current-ordinance code, live-verified
    # 2026-08-13) must NOT be coerced to 'PD-IP' just because they share a
    # substring after punctuation-stripping -- that would be conflating two
    # different real district codes on a guess. It has no punctuation-
    # insensitive match against this known set, so it stays 'IP'.
    known = {"PD-IP", "I1", "I2", "AR1", "JLMA-3", "B2", "PD-OP"}
    assert nz.map_district_code("IP", "va-loudoun-county", known) == "IP"


def test_no_known_codes_falls_back_to_exact_uppercase():
    assert nz.map_district_code("ip", "va-loudoun-county", None) == "IP"
    assert nz.map_district_code("ip", "va-loudoun-county", set()) == "IP"


def test_two_known_codes_differing_only_by_punctuation_both_still_distinct_after_stripping():
    # A jurisdiction whose districts.json genuinely has two codes that would
    # collide after stripping punctuation would be a real data-quality
    # problem in that jurisdiction's own file, not something this function
    # should paper over -- verify Loudoun's real committed set has no such
    # collision so the punctuation-insensitive fallback is well-defined
    # in practice.
    districts_path = (
        ROOT / "data" / "zoning" / "jurisdictions" / "va-loudoun-county" / "districts.json"
    )
    import json

    data = json.loads(districts_path.read_text(encoding="utf-8"))
    codes = list(data.get("districts", {}).keys())
    stripped = [nz._punctuation_stripped(c) for c in codes]
    assert len(stripped) == len(set(stripped)), (
        "Loudoun districts.json has two codes that collide once punctuation "
        "is stripped -- map_district_code's fallback would be ambiguous"
    )


# ── dc_eligible coverage (regression) ───────────────────────────────────────
# Real bug found 2026-08-16: normalize_geometry_for_jurisdiction() computed
# dc_eligible from a hardcoded 4-status tuple that didn't include
# "special_exception" -- the exact term Fairfax County's own 2024 data-center
# ordinance amendment uses for the same kind of approval "special_use_permit"
# names elsewhere. The live map's geometry (data/zoning/geometry/*.geojson,
# what the Leaflet polygon layer and its tooltip actually render) reported
# dc_eligible: false for Fairfax's PDC/PTC districts even though real
# research says they ARE eligible, just conditionally.

def test_dc_eligible_statuses_include_special_exception():
    # The literal bug: this status is Virginia-specific terminology real
    # jurisdictions in this project's own dataset actually use.
    assert "special_exception" in nz.DC_ELIGIBLE_STATUSES


def test_dc_eligible_statuses_exclude_accessory():
    # An accessory-use permission means the use is allowed only when
    # subordinate to a different primary use -- not what "this district
    # supports a standalone data center" should claim.
    assert "accessory" not in nz.DC_ELIGIBLE_STATUSES


def test_dc_eligible_statuses_exclude_genuinely_negative_or_unknown_statuses():
    for status in ("prohibited", "not_listed", "unclear", "manual_review_required"):
        assert status not in nz.DC_ELIGIBLE_STATUSES, (
            f'"{status}" must never compute dc_eligible=True'
        )


def test_dc_eligible_statuses_cover_every_positive_schema_status_except_accessory():
    # Reads the real schema file directly (not a copy of its enum) so this
    # fails the moment the schema gains a new status this list hasn't been
    # taught about -- the same class of drift that caused the original bug.
    import json
    schema_path = ROOT / "data" / "zoning" / "schemas" / "permitted_use.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    all_statuses = set(schema["properties"]["permission_status"]["enum"])
    negative_or_ambiguous = {"prohibited", "not_listed", "unclear", "manual_review_required", "accessory"}
    expected_positive = all_statuses - negative_or_ambiguous
    assert nz.DC_ELIGIBLE_STATUSES == expected_positive


# ── Geometry simplification (regression) ────────────────────────────────────
# Real bug found 2026-08-16: SIMPLIFY_TOLERANCE was defined, documented in
# docs/ZONING_ARCHITECTURE.md as an already-applied step, and imported into
# this module -- but never actually called on any geometry. The live
# consequence: data/zoning/geometry/va-fairfax-county.geojson was 19.9 MB
# and va-prince-william-county.geojson was 16.1 MB, both roughly 3-4x the
# architecture doc's own stated 5 MB target, fetched in full by the browser
# every time a user toggles the Zoning Districts layer for those counties.

def test_douglas_peucker_keeps_endpoints():
    points = [(0.0, 0.0), (0.5, 0.5), (1.0, 0.0)]
    result = zc.douglas_peucker(points, tolerance=10.0)  # tolerance far above any real deviation
    assert result[0] == points[0]
    assert result[-1] == points[-1]


def test_douglas_peucker_drops_a_point_on_a_near_straight_line():
    # (0.5, 0.0001) deviates from the 0,0 -> 1,0 line by far less than a
    # generous tolerance -- it should be dropped.
    points = [(0.0, 0.0), (0.5, 0.0001), (1.0, 0.0)]
    result = zc.douglas_peucker(points, tolerance=0.001)
    assert result == [(0.0, 0.0), (1.0, 0.0)]


def test_douglas_peucker_keeps_a_point_that_is_a_real_corner():
    points = [(0.0, 0.0), (0.5, 0.5), (1.0, 0.0)]
    result = zc.douglas_peucker(points, tolerance=0.001)
    assert (0.5, 0.5) in result


def test_simplify_ring_never_produces_an_invalid_polygon_ring():
    # A tiny near-square ring, tolerance large enough that naive
    # simplification would try to collapse it below 4 points -- the floor
    # must hold regardless.
    ring = [[0, 0], [0, 0.0001], [0.0001, 0.0001], [0.0001, 0], [0, 0]]
    result = zc.simplify_ring(ring, tolerance=10.0)
    assert len(result) >= 4
    assert result[0] == result[-1], "a simplified ring must stay closed"


def test_simplify_geometry_shrinks_a_dense_polygon():
    # A ring with many collinear-ish points along one edge -- a real
    # simplifier should meaningfully reduce the point count at a normal
    # tolerance.
    dense_edge = [[i * 0.0001, 0.0] for i in range(200)]
    ring = dense_edge + [[0.02, 0.02], [0.0, 0.02], [0.0, 0.0]]
    geometry = {"type": "Polygon", "coordinates": [ring]}
    simplified = zc.simplify_geometry(geometry, zc.SIMPLIFY_TOLERANCE)
    original_points = sum(len(r) for r in geometry["coordinates"])
    simplified_points = sum(len(r) for r in simplified["coordinates"])
    assert simplified_points < original_points


def test_simplify_geometry_handles_multipolygon():
    poly_a = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]
    poly_b = [[2, 2], [2, 3], [3, 3], [3, 2], [2, 2]]
    geometry = {"type": "MultiPolygon", "coordinates": [[poly_a], [poly_b]]}
    simplified = zc.simplify_geometry(geometry, zc.SIMPLIFY_TOLERANCE)
    assert simplified["type"] == "MultiPolygon"
    assert len(simplified["coordinates"]) == 2


def test_simplify_geometry_passes_through_non_polygon_types_unchanged():
    point = {"type": "Point", "coordinates": [1.0, 2.0]}
    assert zc.simplify_geometry(point, zc.SIMPLIFY_TOLERANCE) == point


def test_simplify_geometry_handles_none():
    assert zc.simplify_geometry(None, zc.SIMPLIFY_TOLERANCE) is None


# ── Re-normalizing already-normalized output must refuse, not corrupt ──────
# Real incident, 2026-08-16: fetch_zoning.py and normalize_geometry_for_
# jurisdiction() share one file path -- fetch writes raw ArcGIS geometry
# there, normalize overwrites it in place with canonical properties. Running
# normalize a second time standalone (without a fresh fetch first) reads its
# own already-normalized properties, finds none of the raw ArcGIS field
# names it's looking for, and silently rewrote every one of Loudoun's 1,271
# real features to zoning_code: "" -- discovered only because a diff check
# caught it before it was committed. This pins the refuse-and-explain guard
# added in response, using a real committed geometry file so the test fails
# if that guard is ever relaxed or removed.

def test_refuses_to_renormalize_already_normalized_geometry(tmp_path, monkeypatch):
    import shutil
    geometry_dir = tmp_path / "geometry"
    geometry_dir.mkdir()
    real_file = ROOT / "data" / "zoning" / "geometry" / "va-loudoun-county.geojson"
    shutil.copy(real_file, geometry_dir / "va-loudoun-county.geojson")

    monkeypatch.setattr(nz, "GEOMETRY_DIR", geometry_dir)
    result = nz.normalize_geometry_for_jurisdiction("va-loudoun-county", dry_run=True)

    assert result is None, "must refuse rather than silently re-normalizing already-normalized data"
    # And -- the actual regression -- the file on disk must be untouched.
    import json
    after = json.loads((geometry_dir / "va-loudoun-county.geojson").read_text())
    codes = {f["properties"].get("zoning_code") for f in after["features"]}
    assert codes != {""}, "the real bug: every feature's zoning_code silently wiped to empty string"
    assert len(codes) > 1, "real district-code variety must survive untouched"
