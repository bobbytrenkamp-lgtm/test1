"""tests/test_national_data_ingestion.py — the read-only candidate-source
prober for national (non-parcel) datasets.

Uses real GDAL/ogrinfo throughout (skips cleanly if gdal-bin isn't
installed, same discipline as test_static_ingestion.py) so the field/
geometry-type parsing is proven against real ogrinfo output, not an
imagined format. Network is faked (no real HTTP), same pattern
test_static_ingestion.py already established for download.py.

Run:  python3 -m pytest tests/test_national_data_ingestion.py -q
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

GDAL_AVAILABLE = shutil.which("ogrinfo") is not None
pytestmark = pytest.mark.skipif(not GDAL_AVAILABLE, reason="gdal-bin (ogrinfo) not installed")

from data.national_data_ingestion.probe_source import probe, _parse_ogrinfo_layers  # noqa: E402


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
    def __init__(self, script):
        self.script = list(script)

    def get(self, url, timeout=None, stream=None, headers=None):
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _sample_geojson_bytes() -> bytes:
    fc = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature",
             "properties": {"Plant_Code": 1001, "Plant_Name": "Test Plant", "Capacity_MW": 500.5, "Fuel_Type": "GAS"},
             "geometry": {"type": "Point", "coordinates": [-95.0, 39.0]}},
            {"type": "Feature",
             "properties": {"Plant_Code": 1002, "Plant_Name": "Test Plant 2", "Capacity_MW": 200.0, "Fuel_Type": "SOLAR"},
             "geometry": {"type": "Point", "coordinates": [-96.0, 38.0]}},
        ],
    }
    return json.dumps(fc).encode()


def test_parse_ogrinfo_layers_against_real_ogrinfo_output(tmp_path):
    path = tmp_path / "plants.geojson"
    path.write_bytes(_sample_geojson_bytes())
    out = subprocess.run(["ogrinfo", "-al", "-so", "-ro", str(path)],
                          capture_output=True, text=True, check=True).stdout
    layers = _parse_ogrinfo_layers(out)
    assert len(layers) == 1
    layer = layers[0]
    assert layer["geometry_type"] == "Point"
    assert layer["feature_count"] == 2
    field_names = [f["name"] for f in layer["fields"]]
    assert field_names == ["Plant_Code", "Plant_Name", "Capacity_MW", "Fuel_Type"]


def test_parse_ogrinfo_layers_excludes_wkt_srs_block_lines():
    # The SRS WKT block contains many colon-bearing lines (DATUM[...],
    # ANGLEUNIT[...], etc.) that must never be misparsed as field
    # definitions -- this is the real failure mode a naive "line has a
    # colon" heuristic would hit.
    fake_ogrinfo = """Layer name: test
Geometry: Point
Feature Count: 1
Layer SRS WKT:
GEOGCRS["WGS 84",
    DATUM["World Geodetic System 1984",
        ELLIPSOID["WGS 84",6378137,298.257223563]],
    ID["EPSG",4326]]
Data axis to CRS axis mapping: 2,1
REAL_FIELD: String (80.0)
"""
    layers = _parse_ogrinfo_layers(fake_ogrinfo)
    assert len(layers) == 1
    field_names = [f["name"] for f in layers[0]["fields"]]
    assert field_names == ["REAL_FIELD"]


def test_parse_ogrinfo_layers_handles_multiple_layers():
    fake_ogrinfo = """Layer name: layer_a
Geometry: Point
Feature Count: 3
FIELD_A: String (10.0)

Layer name: layer_b
Geometry: Polygon
Feature Count: 7
FIELD_B: Integer (0.0)
"""
    layers = _parse_ogrinfo_layers(fake_ogrinfo)
    assert [l["name"] for l in layers] == ["layer_a", "layer_b"]
    assert layers[0]["feature_count"] == 3
    assert layers[1]["feature_count"] == 7
    assert [f["name"] for f in layers[0]["fields"]] == ["FIELD_A"]
    assert [f["name"] for f in layers[1]["fields"]] == ["FIELD_B"]


def test_probe_never_raises_when_gdal_missing(monkeypatch):
    import data.national_data_ingestion.probe_source as ps
    monkeypatch.setattr(ps, "require_gdal", lambda: (_ for _ in ()).throw(
        ps.GdalNotAvailable("not found")))
    result = probe("https://example.gov/data.zip", "shapefile")
    assert result["ok"] is False
    assert result["stage"] == "gdal_check"


def test_probe_reports_download_failure_without_raising(monkeypatch):
    import data.national_data_ingestion.probe_source as ps
    fake_download = lambda *a, **kw: __import__(
        "data.parcel_pipeline.static_ingestion.download", fromlist=["DownloadResult"]
    ).DownloadResult(ok=False, failure_type="source_down", why="HTTP 404")
    monkeypatch.setattr(ps, "download", fake_download)
    result = probe("https://example.gov/missing.zip", "shapefile")
    assert result["ok"] is False
    assert result["stage"] == "download"
    assert result["failure_type"] == "source_down"


def test_probe_end_to_end_with_fake_session_real_gdal(tmp_path, monkeypatch):
    # Real download.py logic (atomic write, sha256, etag) against a fake
    # HTTP session, then real ogrinfo against the downloaded real bytes --
    # only the network transport is faked.
    import data.national_data_ingestion.probe_source as ps
    body = _sample_geojson_bytes()
    sess = _FakeSession([_FakeResponse(200, body, {"ETag": '"abc"'})])

    def fake_download(url, dest, *, is_zip, timeout_s):
        from data.parcel_pipeline.static_ingestion.download import download as real_download
        return real_download(url, dest, is_zip=is_zip, timeout_s=timeout_s, session=sess)

    monkeypatch.setattr(ps, "download", fake_download)
    result = probe("https://example.gov/plants.geojson", "geojson", is_zip=False)
    assert result["ok"] is True
    assert result["bytes_downloaded"] == len(body)
    assert result["sha256"]
    assert result["layers"][0]["geometry_type"] == "Point"
    field_names = [f["name"] for f in result["layers"][0]["fields"]]
    assert "Plant_Code" in field_names
    assert "Fuel_Type" in field_names


def test_probe_reports_ogrinfo_failure_for_unparseable_download(tmp_path, monkeypatch):
    import data.national_data_ingestion.probe_source as ps
    garbage = b"this is not a geospatial file at all, just plain text padding" * 10
    sess = _FakeSession([_FakeResponse(200, garbage)])

    def fake_download(url, dest, *, is_zip, timeout_s):
        from data.parcel_pipeline.static_ingestion.download import download as real_download
        return real_download(url, dest, is_zip=is_zip, timeout_s=timeout_s, session=sess)

    monkeypatch.setattr(ps, "download", fake_download)
    result = probe("https://example.gov/not-really-geojson.geojson", "geojson", is_zip=False)
    assert result["ok"] is False
    assert result["stage"] == "ogrinfo"


def test_cli_never_writes_to_repository_files():
    # Structural guard: this module must never open any registry file for
    # writing -- it is investigation-only. Checks actual code lines (not the
    # module's own docstring, which legitimately explains this property in
    # prose) for a Path(...).write_text(...) call outside the optional
    # --output flag's own write.
    src = (ROOT / "data" / "national_data_ingestion" / "probe_source.py").read_text()
    code_lines = [ln for ln in src.splitlines() if not ln.strip().startswith(("#", '"""', "'''"))]
    write_calls = [ln for ln in code_lines if ".write_text(" in ln]
    assert all("args.output" in ln or "Path(args.output)" in ln for ln in write_calls), write_calls
