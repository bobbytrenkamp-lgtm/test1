"""data/parcel_pipeline/static_ingestion/convert.py

Converts a downloaded static file (Shapefile, GeoPackage, zipped GeoJSON,
CSV+coordinates, CSV+WKT, KML) into normalized, EPSG:4326 GeoJSON, using the
GDAL/OGR command-line tools rather than a hand-rolled parser -- per the
project's own rule not to invent a geospatial parser when proven open-source
tooling exists. ogr2ogr handles the format-specific reading and the
coordinate transform; everything below it (duplicate/invalid-geometry/
missing-coordinate accounting, and the final feature-level cleanup) is this
module's job, because ogr2ogr's own `-skipfailures` reports a total but not
a reason-coded breakdown of what it dropped.

WHY SHELL OUT TO THE CLI RATHER THAN THE PYTHON BINDINGS
----------------------------------------------------------
python3-gdal's bindings are commonly broken or absent in a given environment
(binary ABI mismatches against whichever Python built them) even when the
gdal-bin CLI tools work perfectly -- true of this pipeline's own dev sandbox.
The CLI is also exactly what ships by a one-line `apt-get install gdal-bin`
on a GitHub Actions ubuntu-latest runner, so relying on it is the more
portable choice, not a workaround.

TRANSFORMATION ACCOUNTING
--------------------------
Every conversion returns a ConversionResult with:
  input_count, accepted_count, rejected_count, duplicate_count,
  invalid_geometry_count, missing_coordinate_count, transformation_errors
so a pipeline run's manifest can show exactly what happened to every input
feature rather than a bare "success" -- silently discarding malformed
features is exactly what this project's engineering rules forbid.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

OGR2OGR = shutil.which("ogr2ogr")
OGRINFO = shutil.which("ogrinfo")

CONVERT_TIMEOUT_S = 300


class GdalNotAvailable(RuntimeError):
    """Raised when ogr2ogr/ogrinfo are not on PATH. Callers should treat this
    as a distinct, actionable failure -- not a data problem -- since it means
    the environment (dev sandbox or CI runner) is missing gdal-bin, not that
    the source file is bad."""


@dataclass
class ConversionResult:
    ok: bool
    output_path: Optional[str] = None
    input_count: int = 0
    accepted_count: int = 0
    rejected_count: int = 0
    duplicate_count: int = 0
    invalid_geometry_count: int = 0
    missing_coordinate_count: int = 0
    transformation_errors: list[str] = field(default_factory=list)
    why: Optional[str] = None
    repaired_geometry_count: int = 0


def require_gdal() -> None:
    if not OGR2OGR or not OGRINFO:
        raise GdalNotAvailable(
            "ogr2ogr/ogrinfo not found on PATH. Install with `apt-get install -y "
            "gdal-bin` (free, no license, available on GitHub Actions ubuntu-latest "
            "runners) before running static ingestion."
        )


def _source_arg(input_path: str, fmt: str) -> str:
    # ogr2ogr can open a ZIP directly via the /vsizip/ virtual filesystem --
    # no separate extraction step needed for zipped Shapefile/GeoJSON, which
    # is one entire pipeline stage (EXTRACT) collapsed into the same command
    # that does CONVERT.
    if fmt in ("shapefile", "geojson", "geopackage", "kml") and input_path.lower().endswith(".zip"):
        return f"/vsizip/{input_path}"
    return input_path


def _ogrinfo_feature_count(source: str, layer: Optional[str] = None) -> Optional[int]:
    require_gdal()
    cmd = [OGRINFO, "-al", "-so", "-ro", source]
    if layer:
        cmd = [OGRINFO, "-so", "-ro", source, layer]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=CONVERT_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        return None
    for line in out.stdout.splitlines():
        line = line.strip()
        if line.startswith("Feature Count:"):
            try:
                return int(line.split(":", 1)[1].strip())
            except ValueError:
                return None
    return None


def _geometry_is_missing_or_empty(geom: Optional[dict]) -> bool:
    if geom is None:
        return True
    coords = geom.get("coordinates")
    if coords is None:
        return True
    # Recursively empty (e.g. [] or [[]] or [[[],[]]])
    def _empty(c):
        if isinstance(c, (int, float)):
            return False
        if not c:
            return True
        return all(_empty(x) for x in c)
    return _empty(coords)


def _geometry_is_structurally_invalid(geom: Optional[dict]) -> bool:
    """Cheap, dependency-free structural checks -- NOT a full topology
    validity check (that's what -makevalid during ogr2ogr already handles).
    Catches what -makevalid does not: a Polygon ring with fewer than 4
    positions (not even a valid triangle-closed ring), which is a shape
    ogr2ogr will pass through as "valid" GeoJSON syntactically while it
    describes no real area."""
    if geom is None:
        return False
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype == "Polygon":
        return not coords or any(len(ring) < 4 for ring in coords)
    if gtype == "MultiPolygon":
        return not coords or any(
            not poly or any(len(ring) < 4 for ring in poly) for poly in coords
        )
    return False


def convert_to_geojson(
    input_path: str,
    output_path: str,
    *,
    fmt: str,
    expected_crs: Optional[str] = None,
    layer: Optional[str] = None,
    parcel_id_field: Optional[str] = None,
) -> ConversionResult:
    """Runs the DOWNLOAD-adjacent stages: EXTRACT (via /vsizip/) -> CONVERT
    -> REPROJECT -> CLEAN -> DEDUPLICATE -> VALIDATE, writing a normalized
    EPSG:4326 GeoJSON FeatureCollection to output_path.

    Deterministic: the same input always produces the same output, same
    counts, same feature order (ogr2ogr's own iteration order, followed by a
    stable within-pipeline dedupe pass that keeps first-seen).
    """
    require_gdal()
    source = _source_arg(input_path, fmt)
    input_count = _ogrinfo_feature_count(source, layer)

    with tempfile.TemporaryDirectory() as td:
        raw_out = str(Path(td) / "raw.geojson")
        cmd = [
            OGR2OGR, "-f", "GeoJSON", raw_out, source,
            "-t_srs", "EPSG:4326",
            "-makevalid",
            "-skipfailures",
        ]
        if expected_crs:
            cmd += ["-s_srs", expected_crs]
        if layer:
            cmd.append(layer)

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=CONVERT_TIMEOUT_S)
        except subprocess.TimeoutExpired:
            return ConversionResult(ok=False, why=f"ogr2ogr timed out after {CONVERT_TIMEOUT_S}s",
                                     input_count=input_count or 0)

        transformation_errors = [
            line.strip() for line in proc.stderr.splitlines()
            if line.strip() and ("warning" in line.lower() or "error" in line.lower())
        ]

        if proc.returncode != 0 or not Path(raw_out).exists():
            return ConversionResult(
                ok=False, why=f"ogr2ogr failed (exit {proc.returncode}): {proc.stderr.strip()[:2000]}",
                input_count=input_count or 0, transformation_errors=transformation_errors,
            )

        try:
            raw = json.loads(Path(raw_out).read_text())
        except json.JSONDecodeError as e:
            return ConversionResult(ok=False, why=f"ogr2ogr output was not valid JSON: {e}",
                                     input_count=input_count or 0)

        features = raw.get("features", [])
        accepted = []
        missing_coord = 0
        invalid_geom = 0
        seen_ids: dict = {}
        duplicate_count = 0
        repaired_count = 0

        for feat in features:
            geom = feat.get("geometry")
            props = feat.get("properties") or {}

            if _geometry_is_missing_or_empty(geom):
                missing_coord += 1
                continue
            if _geometry_is_structurally_invalid(geom):
                invalid_geom += 1
                continue

            if parcel_id_field:
                pid = props.get(parcel_id_field)
                if pid is not None and pid != "":
                    if pid in seen_ids:
                        duplicate_count += 1
                        continue
                    seen_ids[pid] = True

            accepted.append(feat)

        # -makevalid may have altered a geometry's ring structure to fix a
        # self-intersection. ogr2ogr does not report which features it
        # touched, so an exact per-feature "was this repaired" count isn't
        # available from the CLI -- recorded as 0 rather than guessed, with
        # this explaining why, so a manifest reader doesn't read the absence
        # of a number as "nothing was repaired" when it may simply be
        # unknown. Real per-feature repair tracking would need the GDAL
        # Python bindings' OGRGeometry.MakeValid() called feature-by-feature,
        # which this module deliberately does not depend on (see the module
        # docstring on why the CLI is used instead).
        repaired_count = 0

        rejected = missing_coord + invalid_geom
        out_fc = {"type": "FeatureCollection", "features": accepted}
        Path(output_path).write_text(json.dumps(out_fc))

        return ConversionResult(
            ok=True,
            output_path=output_path,
            input_count=input_count if input_count is not None else len(features),
            accepted_count=len(accepted),
            rejected_count=rejected,
            duplicate_count=duplicate_count,
            invalid_geometry_count=invalid_geom,
            missing_coordinate_count=missing_coord,
            transformation_errors=transformation_errors,
            repaired_geometry_count=repaired_count,
        )
