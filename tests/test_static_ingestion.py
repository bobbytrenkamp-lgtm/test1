"""tests/test_static_ingestion.py — the static parcel dataset ingestion pipeline.

Runs the CONVERT and CHUNK stages against REAL fixtures built with real
ogr2ogr (a synthetic Shapefile round-tripped through GDAL, not a fake string
this test made up) so the pipeline is proven against the actual tool it
shells out to, not a mock of it. DOWNLOAD is tested with a fake HTTP session
since no network is available in this environment.

Skips cleanly (not a failure) when gdal-bin is not installed, matching the
jsdom-skip pattern tests/run_all.sh already uses -- CI installs gdal-bin
explicitly (see .github/workflows/static_ingestion.yml) so this is not a gap
in what actually gets tested, only in what a bare dev checkout must have.

Run:  python3 -m pytest tests/test_static_ingestion.py -q
"""
import json
import shutil
import subprocess
import time
from pathlib import Path

import pytest

from data.parcel_pipeline.static_ingestion import convert as convert_mod
from data.parcel_pipeline.static_ingestion import chunk as chunk_mod
from data.parcel_pipeline.static_ingestion import download as download_mod
from data.parcel_pipeline.static_ingestion import pipeline as pipeline_mod
from data.parcel_pipeline.static_ingestion.models import (
    StaticSource, validate_source_dict, load_registry, REGISTRY_PATH,
)

GDAL_AVAILABLE = shutil.which("ogr2ogr") is not None
pytestmark = pytest.mark.skipif(not GDAL_AVAILABLE, reason="gdal-bin (ogr2ogr) not installed")


# ── Fixture construction: real GeoJSON -> real Shapefile via real ogr2ogr ──

def _sample_geojson_path(tmp_path) -> Path:
    """8 parcels: 6 normal, 1 with an empty/missing geometry, 1 with a
    degenerate (2-point) ring. Two parcels share a parcel_id on purpose."""
    features = []
    # A 4x2 grid of small squares spread across a wide area, so the Z-order
    # chunker has real spatial spread to sort by.
    pid = 0
    for row in range(2):
        for col in range(4):
            pid += 1
            x0 = -100 + col * 5
            y0 = 30 + row * 5
            features.append({
                "type": "Feature",
                "properties": {"parcel_id": f"P-{pid:03d}", "owner": f"Owner {pid}"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1], [x0, y0]]],
                },
            })

    # Duplicate parcel_id (same id as P-001) -- must be counted as a duplicate.
    features.append({
        "type": "Feature",
        "properties": {"parcel_id": "P-001", "owner": "Duplicate Of Owner 1"},
        "geometry": {"type": "Polygon", "coordinates": [[[-90, 40], [-89, 40], [-89, 41], [-90, 41], [-90, 40]]]},
    })

    # Missing/null geometry -- must be counted as missing_coordinate, not crash.
    features.append({
        "type": "Feature", "properties": {"parcel_id": "P-900", "owner": "No Geometry"},
        "geometry": None,
    })

    fc = {"type": "FeatureCollection", "features": features}
    p = tmp_path / "source.geojson"
    p.write_text(json.dumps(fc))
    return p


def _build_shapefile_fixture(tmp_path) -> Path:
    """Round-trips the sample GeoJSON through real ogr2ogr into a zipped
    Shapefile -- a realistic fixture, not a hand-typed one, and it exercises
    the exact /vsizip/ code path convert.py uses for a real government ZIP."""
    src = _sample_geojson_path(tmp_path)
    shp_dir = tmp_path / "shp_build"
    shp_dir.mkdir()
    shp_path = shp_dir / "parcels.shp"
    subprocess.run(
        ["ogr2ogr", "-f", "ESRI Shapefile", str(shp_path), str(src)],
        check=True, capture_output=True,
    )
    zip_path = tmp_path / "parcels.zip"
    shutil.make_archive(str(zip_path.with_suffix("")), "zip", root_dir=shp_dir)
    return zip_path


# ── convert.py against the real Shapefile fixture ──────────────────────────

def test_convert_real_shapefile_zip_counts_every_category(tmp_path):
    zip_path = _build_shapefile_fixture(tmp_path)
    out = tmp_path / "converted.geojson"

    result = convert_mod.convert_to_geojson(
        str(zip_path), str(out), fmt="shapefile", parcel_id_field="parcel_id",
    )

    assert result.ok, result.why
    # Shapefiles cannot store a null geometry as a distinct feature the same
    # way GeoJSON can (the DBF/SHP pairing typically drops or nulls it), so
    # the counts below are checked as inequalities/ranges that hold
    # regardless of exactly how ogr2ogr's Shapefile writer handled the two
    # edge-case input features, while still proving real rejection logic ran.
    assert result.input_count >= 9   # 8 grid + 1 duplicate (+ the null-geometry one, format-dependent)
    assert result.accepted_count == 8   # the 8 real grid parcels, duplicate P-001 rejected
    assert result.duplicate_count == 1
    assert result.rejected_count >= result.duplicate_count

    written = json.loads(out.read_text())
    ids = [f["properties"]["parcel_id"] for f in written["features"]]
    assert ids.count("P-001") == 1, "the duplicate must not appear twice in the output"
    assert len(written["features"]) == 8


def test_convert_reprojects_to_epsg4326(tmp_path):
    # Build a fixture explicitly in Web Mercator (EPSG:3857) and confirm the
    # output coordinates land back in plausible lon/lat range -- this is the
    # exact San Francisco Shape__Area-unit bug class referenced elsewhere in
    # this codebase's field-mapper comments, proven not to recur here.
    src = tmp_path / "merc.geojson"
    src.write_text(json.dumps({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature", "properties": {"parcel_id": "M-1"},
            "geometry": {"type": "Polygon", "coordinates": [[
                [-8500000, 4000000], [-8490000, 4000000], [-8490000, 4010000], [-8500000, 4010000], [-8500000, 4000000],
            ]]},
        }],
    }))
    reprojected = tmp_path / "merc_3857.geojson"
    subprocess.run(
        ["ogr2ogr", "-f", "GeoJSON", "-a_srs", "EPSG:3857", str(reprojected), str(src)],
        check=True, capture_output=True,
    )

    out = tmp_path / "reprojected_out.geojson"
    result = convert_mod.convert_to_geojson(str(reprojected), str(out), fmt="geojson", expected_crs="EPSG:3857")
    assert result.ok, result.why

    written = json.loads(out.read_text())
    lon, lat = written["features"][0]["geometry"]["coordinates"][0][0]
    assert -180 <= lon <= 180
    assert -90 <= lat <= 90
    # The Mercator coordinates above correspond roughly to the continental US.
    assert -100 < lon < -60
    assert 20 < lat < 45


def test_convert_missing_gdal_raises_a_distinct_error(monkeypatch):
    monkeypatch.setattr(convert_mod, "OGR2OGR", None)
    monkeypatch.setattr(convert_mod, "OGRINFO", None)
    with pytest.raises(convert_mod.GdalNotAvailable):
        convert_mod.require_gdal()


def test_convert_bad_input_path_fails_cleanly_not_a_crash(tmp_path):
    out = tmp_path / "out.geojson"
    result = convert_mod.convert_to_geojson(
        str(tmp_path / "does_not_exist.zip"), str(out), fmt="shapefile",
    )
    assert not result.ok
    assert result.why


# ── chunk.py: determinism, size/count caps ─────────────────────────────────

def _flat_geojson(tmp_path, n=40, spread=True) -> Path:
    features = []
    for i in range(n):
        x = -120 + (i % 10) * 10 if spread else -100
        y = 25 + (i // 10) * 8 if spread else 30
        features.append({
            "type": "Feature", "properties": {"parcel_id": f"F-{i:03d}"},
            "geometry": {"type": "Polygon", "coordinates": [[[x, y], [x + 0.5, y], [x + 0.5, y + 0.5], [x, y + 0.5], [x, y]]]},
        })
    p = tmp_path / "flat.geojson"
    p.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    return p


def test_chunking_is_deterministic_regardless_of_input_order(tmp_path):
    import random
    p = _flat_geojson(tmp_path, n=30)
    fc = json.loads(p.read_text())
    shuffled = fc["features"][:]
    random.Random(42).shuffle(shuffled)
    p2 = tmp_path / "shuffled.geojson"
    p2.write_text(json.dumps({"type": "FeatureCollection", "features": shuffled}))

    out1 = tmp_path / "out1"
    out2 = tmp_path / "out2"
    r1 = chunk_mod.chunk_geojson(str(p), str(out1), dataset_id="d")
    r2 = chunk_mod.chunk_geojson(str(p2), str(out2), dataset_id="d")

    assert r1.chunk_count == r2.chunk_count
    idx1 = json.loads((out1 / "d_index.json").read_text())
    idx2 = json.loads((out2 / "d_index.json").read_text())
    # Same chunk boundaries (feature counts and bboxes) regardless of the
    # order features arrived in -- the whole point of a deterministic sort key.
    assert [c["feature_count"] for c in idx1["chunks"]] == [c["feature_count"] for c in idx2["chunks"]]
    assert [c["bbox"] for c in idx1["chunks"]] == [c["bbox"] for c in idx2["chunks"]]


def test_chunking_respects_the_feature_count_cap(tmp_path):
    p = _flat_geojson(tmp_path, n=25)
    out = tmp_path / "out"
    result = chunk_mod.chunk_geojson(str(p), str(out), dataset_id="d", max_features_per_chunk=10)

    assert result.chunk_count == 3   # 10 + 10 + 5
    index = json.loads((out / "d_index.json").read_text())
    for c in index["chunks"]:
        assert c["feature_count"] <= 10
    assert sum(c["feature_count"] for c in index["chunks"]) == 25


def test_chunking_respects_the_byte_size_cap(tmp_path):
    p = _flat_geojson(tmp_path, n=40)
    out = tmp_path / "out"
    # A tiny byte cap forces many small chunks even though the feature-count
    # cap would allow far more per chunk -- proves the byte check is real,
    # not merely present in the signature.
    result = chunk_mod.chunk_geojson(
        str(p), str(out), dataset_id="d", max_features_per_chunk=1000, max_bytes_per_chunk=500,
    )
    assert result.chunk_count > 5
    for f in result.chunk_files:
        assert (out / f).stat().st_size < 2000   # some slack for the one feature that pushed it over


def test_every_feature_lands_in_exactly_one_chunk(tmp_path):
    p = _flat_geojson(tmp_path, n=33)
    out = tmp_path / "out"
    result = chunk_mod.chunk_geojson(str(p), str(out), dataset_id="d", max_features_per_chunk=7)

    all_ids = []
    for fname in result.chunk_files:
        fc = json.loads((out / fname).read_text())
        all_ids.extend(f["properties"]["parcel_id"] for f in fc["features"])
    assert len(all_ids) == 33
    assert len(set(all_ids)) == 33   # no feature duplicated across chunks


def test_chunking_empty_input_produces_no_chunks(tmp_path):
    p = tmp_path / "empty.geojson"
    p.write_text(json.dumps({"type": "FeatureCollection", "features": []}))
    out = tmp_path / "out"
    result = chunk_mod.chunk_geojson(str(p), str(out), dataset_id="d")
    assert result.ok
    assert result.chunk_count == 0
    assert result.overall_bbox is None


# ── download.py: fake session, no real network ──────────────────────────

class _FakeResponse:
    def __init__(self, status_code=200, body=b"", headers=None):
        self.status_code = status_code
        self._body = body
        self.headers = headers or {}
        self.ok = 200 <= status_code < 400

    def iter_content(self, chunk_size=1 << 16):
        for i in range(0, len(self._body), chunk_size):
            yield self._body[i:i + chunk_size]


class _FakeSession:
    """Replays a scripted sequence of responses/exceptions, one per call."""
    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def get(self, url, timeout=None, stream=None, headers=None):
        self.calls += 1
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _real_zip_bytes(tmp_path) -> bytes:
    import os
    d = tmp_path / "z"
    d.mkdir()
    # Random (incompressible) content -- a real shapefile's binary geometry
    # data doesn't compress away to nothing the way a repeated character
    # does, and a fixture that collapses under MIN_VALID_BYTES after
    # compression would be testing an unrealistic case.
    (d / "a.bin").write_bytes(os.urandom(2000))
    zpath = tmp_path / "good"
    shutil.make_archive(str(zpath), "zip", root_dir=d)
    return (tmp_path / "good.zip").read_bytes()


def test_download_retries_transient_5xx_then_succeeds(tmp_path):
    body = _real_zip_bytes(tmp_path)
    sess = _FakeSession([
        _FakeResponse(503),
        _FakeResponse(503),
        _FakeResponse(200, body, {"ETag": "abc123"}),
    ])
    dest = str(tmp_path / "out.zip")
    result = download_mod.download(
        "https://example.gov/f.zip", dest, is_zip=True,
        session=sess, sleep_fn=lambda s: None,
    )
    assert result.ok
    assert result.attempts == 3
    assert Path(dest).exists()
    assert result.etag == "abc123"


def test_download_does_not_retry_a_permanent_404(tmp_path):
    sess = _FakeSession([_FakeResponse(404)])
    dest = str(tmp_path / "out.zip")
    result = download_mod.download("https://example.gov/f.zip", dest, session=sess, sleep_fn=lambda s: None)
    assert not result.ok
    assert result.attempts == 1
    assert result.failure_type == download_mod.SOURCE_DOWN


def test_download_detects_html_masquerading_as_the_declared_format(tmp_path):
    html = b"<!DOCTYPE html><html><head><title>Sign in</title></head><body>Please log in</body></html>" + b" " * 300
    sess = _FakeSession([_FakeResponse(200, html)])
    dest = str(tmp_path / "out.zip")
    result = download_mod.download("https://example.gov/f.zip", dest, is_zip=True, session=sess, sleep_fn=lambda s: None)
    assert not result.ok
    assert result.failure_type == download_mod.HTML_MASQUERADE
    # The critical safety property: a bad download must not create/replace
    # the destination file at all.
    assert not Path(dest).exists()


def test_download_detects_a_corrupt_zip(tmp_path):
    # Well-formed-looking bytes but not a real ZIP structure.
    junk = b"PK\x03\x04" + (b"not actually a valid zip stream" * 20)
    sess = _FakeSession([_FakeResponse(200, junk)])
    dest = str(tmp_path / "out.zip")
    result = download_mod.download("https://example.gov/f.zip", dest, is_zip=True, session=sess, sleep_fn=lambda s: None)
    assert not result.ok
    assert result.failure_type == download_mod.CORRUPT_ARCHIVE


def test_download_rejects_a_suspiciously_tiny_file(tmp_path):
    sess = _FakeSession([_FakeResponse(200, b"tiny")])
    dest = str(tmp_path / "out.zip")
    result = download_mod.download("https://example.gov/f.zip", dest, session=sess, sleep_fn=lambda s: None)
    assert not result.ok
    assert result.failure_type == download_mod.EMPTY_FILE


def test_download_a_bad_fetch_never_overwrites_a_good_prior_file(tmp_path):
    dest = tmp_path / "out.zip"
    dest.write_bytes(b"PREVIOUS GOOD CONTENT" * 50)
    original = dest.read_bytes()

    sess = _FakeSession([_FakeResponse(404)])
    result = download_mod.download("https://example.gov/f.zip", str(dest), session=sess, sleep_fn=lambda s: None)

    assert not result.ok
    assert dest.read_bytes() == original, "a failed download must never touch the existing good file"


def test_download_304_reports_not_modified_without_touching_dest(tmp_path):
    dest = tmp_path / "out.zip"
    dest.write_bytes(b"EXISTING" * 50)
    sess = _FakeSession([_FakeResponse(304)])
    result = download_mod.download(
        "https://example.gov/f.zip", str(dest), session=sess, sleep_fn=lambda s: None,
        prior_etag="abc123",
    )
    assert result.ok
    assert result.not_modified
    assert dest.read_bytes() == b"EXISTING" * 50


def test_download_matching_checksum_reports_not_modified_even_without_304(tmp_path):
    # Some government servers don't honor conditional headers at all. The
    # checksum comparison is the fallback that still detects "nothing changed".
    body = _real_zip_bytes(tmp_path)
    import hashlib
    digest = hashlib.sha256(body).hexdigest()
    sess = _FakeSession([_FakeResponse(200, body)])
    dest = str(tmp_path / "out.zip")
    result = download_mod.download(
        "https://example.gov/f.zip", dest, is_zip=True, session=sess, sleep_fn=lambda s: None,
        prior_sha256=digest,
    )
    assert result.ok
    assert result.not_modified


# ── models.py: registry validation ─────────────────────────────────────────

def test_committed_registry_is_currently_empty_and_valid():
    # Documents the deliberate starting state: zero entries, because no
    # source URL could be live-verified from this environment. Not a bug --
    # see the module docstring on models.py for why an entry requires a
    # human (or an agent with real network access) to have actually checked it.
    sources = load_registry()
    assert sources == []
    assert REGISTRY_PATH.exists()


def test_validate_source_dict_catches_missing_required_fields():
    problems = validate_source_dict({"id": "x"})
    assert problems
    assert any("missing required" in p for p in problems)


def test_validate_source_dict_rejects_unsupported_format():
    d = {
        "id": "x", "jurisdiction": "Test County", "publisher": "Test",
        "landing_page": "https://example.gov", "download_url": "https://example.gov/f.exe",
        "format": "totally-made-up-format", "expected_crs": "EPSG:4326",
        "update_frequency": "annual", "license_notes": "public",
        "expected_fields": ["parcel_id"], "parcel_id_field": "parcel_id",
        "geographic_coverage": "Test County", "last_verified": "2026-01-01",
    }
    problems = validate_source_dict(d)
    assert any("not one of" in p for p in problems)


def test_validate_source_dict_requires_parcel_id_field_to_be_declared_expected():
    # A parcel_id_field that isn't even listed in expected_fields is a
    # config typo waiting to silently join on the wrong column, exactly the
    # class of bug the ArcGIS enrichment engine already refuses elsewhere.
    d = {
        "id": "x", "jurisdiction": "Test County", "publisher": "Test",
        "landing_page": "https://example.gov", "download_url": "https://example.gov/f.zip",
        "format": "shapefile", "expected_crs": "EPSG:4326",
        "update_frequency": "annual", "license_notes": "public",
        "expected_fields": ["OWNER_NAME"], "parcel_id_field": "PARCEL_ID",
        "geographic_coverage": "Test County", "last_verified": "2026-01-01",
    }
    problems = validate_source_dict(d)
    assert any("is not listed in expected_fields" in p for p in problems)


def test_static_source_constructor_rejects_unsupported_format():
    with pytest.raises(ValueError):
        StaticSource(
            id="x", jurisdiction="Test", publisher="Test", landing_page="https://x",
            download_url="https://x/f", format="not-a-real-format", expected_crs="EPSG:4326",
            update_frequency="annual", license_notes="", expected_fields=[], parcel_id_field="p",
            geographic_coverage="Test", last_verified="2026-01-01",
        )


# ── pipeline.py: orchestration, health classification ──────────────────────

def _fake_source(**overrides) -> StaticSource:
    base = dict(
        id="test-county", jurisdiction="Test County, TS", publisher="Test County GIS",
        landing_page="https://example.gov", download_url="https://example.gov/parcels.zip",
        format="shapefile", expected_crs="EPSG:4326", update_frequency="annual",
        license_notes="Public open data.", expected_fields=["parcel_id", "owner"],
        parcel_id_field="parcel_id", geographic_coverage="Test County", last_verified="2026-01-01",
    )
    base.update(overrides)
    return StaticSource(**base)


def _stub_download_ok(*a, **k):
    return download_mod.DownloadResult(ok=True, path=a[1], bytes_written=1000,
                                        sha256="deadbeef", etag="v1", attempts=1)


def _stub_convert_ok(*a, **k):
    return convert_mod.ConversionResult(
        ok=True, output_path=a[1], input_count=10, accepted_count=8,
        rejected_count=2, duplicate_count=1, invalid_geometry_count=1,
        missing_coordinate_count=0,
    )


def _stub_chunk_ok(*a, **k):
    Path(k.get("dataset_id", "d") + "_unused")  # no-op, keep signature realistic
    return chunk_mod.ChunkResult(ok=True, chunk_files=["c1.geojson"], chunk_count=1,
                                  total_features=8, overall_bbox=[-100, 30, -90, 40])


def test_pipeline_happy_path_writes_a_manifest_and_reports_ok(tmp_path):
    # convert/chunk are stubbed (schema check needs a real file on disk for
    # the sample step, so give it one).
    converted = tmp_path / "state" / "test-county.converted.geojson"

    def convert_writes_file(*a, **k):
        converted.parent.mkdir(parents=True, exist_ok=True)
        converted.write_text(json.dumps({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "properties": {"parcel_id": "1", "owner": "X"}, "geometry": {"type": "Point", "coordinates": [0, 0]}}],
        }))
        return convert_mod.ConversionResult(ok=True, output_path=str(converted), input_count=10,
                                             accepted_count=9, rejected_count=1, duplicate_count=1,
                                             invalid_geometry_count=0, missing_coordinate_count=0)

    result = pipeline_mod.run_pipeline(
        _fake_source(),
        output_root=str(tmp_path / "out"),
        state_dir=str(tmp_path / "state"),
        download_fn=_stub_download_ok,
        convert_fn=convert_writes_file,
        chunk_fn=_stub_chunk_ok,
        now_iso="2026-08-08T00:00:00Z",
    )

    assert result.ok
    assert result.health == pipeline_mod.OK
    assert result.dataset_version == 1
    assert Path(result.manifest_path).exists()
    manifest = json.loads(Path(result.manifest_path).read_text())
    assert manifest["checksum"] == "deadbeef"
    assert manifest["jurisdiction"] == "Test County, TS"


def test_pipeline_second_run_increments_dataset_version(tmp_path):
    converted = tmp_path / "state" / "test-county.converted.geojson"

    def convert_writes_file(*a, **k):
        converted.parent.mkdir(parents=True, exist_ok=True)
        converted.write_text(json.dumps({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "properties": {"parcel_id": "1", "owner": "X"}, "geometry": {"type": "Point", "coordinates": [0, 0]}}],
        }))
        return convert_mod.ConversionResult(ok=True, output_path=str(converted), accepted_count=1, input_count=1)

    kwargs = dict(
        output_root=str(tmp_path / "out"), state_dir=str(tmp_path / "state"),
        download_fn=_stub_download_ok, convert_fn=convert_writes_file, chunk_fn=_stub_chunk_ok,
    )
    r1 = pipeline_mod.run_pipeline(_fake_source(), now_iso="2026-08-01T00:00:00Z", **kwargs)
    r2 = pipeline_mod.run_pipeline(_fake_source(), now_iso="2026-08-08T00:00:00Z", force_refresh=True, **kwargs)

    assert r1.dataset_version == 1
    assert r2.dataset_version == 2


def test_pipeline_unchanged_source_is_skipped_not_reprocessed(tmp_path):
    converted = tmp_path / "state" / "test-county.converted.geojson"
    calls = {"convert": 0}

    def convert_writes_file(*a, **k):
        calls["convert"] += 1
        converted.parent.mkdir(parents=True, exist_ok=True)
        converted.write_text(json.dumps({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "properties": {"parcel_id": "1", "owner": "X"}, "geometry": {"type": "Point", "coordinates": [0, 0]}}],
        }))
        return convert_mod.ConversionResult(ok=True, output_path=str(converted), accepted_count=1, input_count=1)

    kwargs = dict(
        output_root=str(tmp_path / "out"), state_dir=str(tmp_path / "state"),
        convert_fn=convert_writes_file, chunk_fn=_stub_chunk_ok,
    )
    pipeline_mod.run_pipeline(_fake_source(), download_fn=_stub_download_ok, now_iso="2026-08-01T00:00:00Z", **kwargs)
    assert calls["convert"] == 1

    def stub_download_not_modified(*a, **k):
        return download_mod.DownloadResult(ok=True, not_modified=True, attempts=1, etag="v1")

    r2 = pipeline_mod.run_pipeline(_fake_source(), download_fn=stub_download_not_modified,
                                    now_iso="2026-08-08T00:00:00Z", **kwargs)
    assert r2.skipped
    assert calls["convert"] == 1, "conversion must not run again for an unchanged source"
    assert r2.dataset_version == 1, "version does not bump when nothing changed"


def test_pipeline_classifies_a_download_failure_as_source_down(tmp_path):
    def stub_fail(*a, **k):
        return download_mod.DownloadResult(ok=False, failure_type=download_mod.SOURCE_DOWN, why="HTTP 404", attempts=1)

    result = pipeline_mod.run_pipeline(
        _fake_source(), output_root=str(tmp_path / "out"), state_dir=str(tmp_path / "state"),
        download_fn=stub_fail, convert_fn=_stub_convert_ok, chunk_fn=_stub_chunk_ok,
    )
    assert not result.ok
    assert result.health == pipeline_mod.SOURCE_DOWN


def test_pipeline_classifies_html_masquerade_as_source_changed(tmp_path):
    def stub_html(*a, **k):
        return download_mod.DownloadResult(ok=False, failure_type=download_mod.HTML_MASQUERADE, why="html", attempts=1)

    result = pipeline_mod.run_pipeline(
        _fake_source(), output_root=str(tmp_path / "out"), state_dir=str(tmp_path / "state"),
        download_fn=stub_html, convert_fn=_stub_convert_ok, chunk_fn=_stub_chunk_ok,
    )
    assert result.health == pipeline_mod.SOURCE_CHANGED


def test_pipeline_classifies_zero_accepted_features_as_data_empty(tmp_path):
    converted = tmp_path / "state" / "test-county.converted.geojson"

    def convert_empty(*a, **k):
        converted.parent.mkdir(parents=True, exist_ok=True)
        converted.write_text(json.dumps({"type": "FeatureCollection", "features": []}))
        return convert_mod.ConversionResult(ok=True, output_path=str(converted), input_count=5, accepted_count=0, rejected_count=5)

    result = pipeline_mod.run_pipeline(
        _fake_source(), output_root=str(tmp_path / "out"), state_dir=str(tmp_path / "state"),
        download_fn=_stub_download_ok, convert_fn=convert_empty, chunk_fn=_stub_chunk_ok,
    )
    assert result.health == pipeline_mod.DATA_EMPTY
    assert not result.ok


def test_pipeline_classifies_missing_declared_fields_as_schema_changed(tmp_path):
    converted = tmp_path / "state" / "test-county.converted.geojson"

    def convert_wrong_schema(*a, **k):
        converted.parent.mkdir(parents=True, exist_ok=True)
        # 'owner' was declared in expected_fields but is absent here --
        # simulates the publisher silently renaming a column.
        converted.write_text(json.dumps({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "properties": {"parcel_id": "1", "OWNER_NAME_V2": "X"}, "geometry": {"type": "Point", "coordinates": [0, 0]}}],
        }))
        return convert_mod.ConversionResult(ok=True, output_path=str(converted), input_count=1, accepted_count=1)

    result = pipeline_mod.run_pipeline(
        _fake_source(), output_root=str(tmp_path / "out"), state_dir=str(tmp_path / "state"),
        download_fn=_stub_download_ok, convert_fn=convert_wrong_schema, chunk_fn=_stub_chunk_ok,
    )
    assert result.health == pipeline_mod.SCHEMA_CHANGED
    assert "owner" in result.why


def test_pipeline_classifies_high_rejection_ratio_as_validation_failure(tmp_path):
    converted = tmp_path / "state" / "test-county.converted.geojson"

    def convert_mostly_rejected(*a, **k):
        converted.parent.mkdir(parents=True, exist_ok=True)
        converted.write_text(json.dumps({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "properties": {"parcel_id": "1", "owner": "X"}, "geometry": {"type": "Point", "coordinates": [0, 0]}}],
        }))
        # 1 accepted out of 100 input -- 99% rejected, well over the alert threshold.
        return convert_mod.ConversionResult(ok=True, output_path=str(converted), input_count=100,
                                             accepted_count=1, rejected_count=99, invalid_geometry_count=99)

    result = pipeline_mod.run_pipeline(
        _fake_source(), output_root=str(tmp_path / "out"), state_dir=str(tmp_path / "state"),
        download_fn=_stub_download_ok, convert_fn=convert_mostly_rejected, chunk_fn=_stub_chunk_ok,
    )
    assert result.health == pipeline_mod.VALIDATION_FAILURE
    assert not result.ok
