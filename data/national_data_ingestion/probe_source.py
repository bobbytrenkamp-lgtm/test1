#!/usr/bin/env python3
"""data/national_data_ingestion/probe_source.py — read-only candidate-source
investigation, for use BEFORE a national (non-parcel) dataset is registered
anywhere.

The project's rule against inventing source URLs applies just as much to
grid/water/environmental data as it does to parcels: a candidate URL found
via research is not a verified source until something has actually opened
it, confirmed the format, and listed its real fields. This sandbox has no
outbound network access to third-party hosts, so this script is meant to be
run from GitHub Actions (real network) via
.github/workflows/probe_national_source.yml, dispatched manually with a
candidate URL -- never assumed to have been run locally.

It deliberately does nothing to the repository: no file is registered, no
sources.json is touched. It downloads to a temp path, inspects the result
with ogrinfo, prints a JSON summary, and exits. A human (or an agent reading
the resulting Actions artifact/log) decides whether to register the source
for real afterward.

Reuses data/parcel_pipeline/static_ingestion/download.py's download() as-is
rather than reimplementing retry/backoff/HTML-masquerade/corrupt-archive
detection a second time -- that logic is not parcel-specific despite its
current package location.

Usage (from a GitHub Actions runner with gdal-bin + requests installed):
    python3 -m data.national_data_ingestion.probe_source \
        --url https://example.gov/data.zip --format shapefile
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

from data.parcel_pipeline.static_ingestion.download import download  # noqa: E402
from data.parcel_pipeline.static_ingestion.convert import (  # noqa: E402
    OGR2OGR, OGRINFO, GdalNotAvailable, require_gdal,
)

ZIP_LIKE_FORMATS = ("shapefile", "geojson", "geopackage", "kml")


def _source_arg(path: str, fmt: str, is_zip: bool) -> str:
    if is_zip and fmt in ZIP_LIKE_FORMATS:
        return f"/vsizip/{path}"
    return path


def probe(url: str, fmt: str, *, is_zip: bool | None = None, layer: str | None = None,
          timeout_s: int = 120) -> dict:
    if is_zip is None:
        is_zip = url.lower().endswith(".zip")

    try:
        require_gdal()
    except GdalNotAvailable as e:
        return {"ok": False, "stage": "gdal_check", "why": str(e)}

    with tempfile.TemporaryDirectory() as td:
        dest = str(Path(td) / "candidate.download")
        dl = download(url, dest, is_zip=is_zip, timeout_s=timeout_s)
        if not dl.ok:
            return {
                "ok": False, "stage": "download",
                "failure_type": dl.failure_type, "why": dl.why,
                "url": url,
            }

        source = _source_arg(dest, fmt, is_zip)
        cmd = [OGRINFO, "-al", "-so", "-ro", source]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s)
        except subprocess.TimeoutExpired:
            return {"ok": False, "stage": "ogrinfo", "why": f"ogrinfo timed out after {timeout_s}s", "url": url}

        if proc.returncode != 0:
            return {
                "ok": False, "stage": "ogrinfo",
                "why": proc.stderr.strip()[:4000],
                "url": url, "bytes_downloaded": dl.bytes_written, "sha256": dl.sha256,
            }

        layers = _parse_ogrinfo_layers(proc.stdout)
        return {
            "ok": True,
            "url": url,
            "format": fmt,
            "bytes_downloaded": dl.bytes_written,
            "sha256": dl.sha256,
            "etag": dl.etag,
            "last_modified": dl.last_modified,
            "layers": layers,
        }


# ogrinfo -al -so prints a handful of fixed metadata lines per layer before
# the field list starts; anything with a colon that ISN'T one of these is
# treated as a "FIELDNAME: Type (width.precision)" field definition line.
# Best-effort text parsing (not a real GDAL API call) -- this is
# investigation tooling only, not something convert.py's real conversion
# path depends on; that always talks to ogr2ogr directly.
_NON_FIELD_PREFIXES = (
    "INFO:", "Layer name:", "Metadata:", "Geometry:", "Feature Count:",
    "Extent:", "Layer SRS WKT:", "Data axis to CRS axis mapping:",
    "FID Column", "Geometry Column",
)


def _parse_ogrinfo_layers(ogrinfo_stdout: str) -> list[dict]:
    layers: list[dict] = []
    current: dict | None = None
    in_srs_block = False
    for raw_line in ogrinfo_stdout.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if stripped.startswith("Layer name:"):
            if current:
                layers.append(current)
            current = {"name": stripped.split(":", 1)[1].strip(), "geometry_type": None,
                       "feature_count": None, "fields": []}
            in_srs_block = False
            continue
        if current is None:
            continue
        if stripped.startswith("Layer SRS WKT:"):
            in_srs_block = True
            continue
        if in_srs_block:
            # WKT blocks are indented and contain no top-level field syntax;
            # they end when a line starts back at column 0 with a real
            # metadata/field line, recognizable by not being indented.
            if line.startswith(" ") or not stripped:
                continue
            in_srs_block = False
        if stripped.startswith("Geometry:"):
            current["geometry_type"] = stripped.split(":", 1)[1].strip()
            continue
        if stripped.startswith("Feature Count:"):
            try:
                current["feature_count"] = int(stripped.split(":", 1)[1].strip())
            except ValueError:
                pass
            continue
        if not stripped or ":" not in stripped:
            continue
        if any(stripped.startswith(p) for p in _NON_FIELD_PREFIXES):
            continue
        name, _, rest = stripped.partition(":")
        name = name.strip()
        if name and " " not in name:
            current["fields"].append({"name": name, "type": rest.strip()})
    if current:
        layers.append(current)
    return layers


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--format", required=True, choices=[
        "shapefile", "geojson", "geopackage", "csv", "kml", "csv_wkt"])
    parser.add_argument("--layer", default=None)
    parser.add_argument("--is-zip", action="store_true", default=None)
    parser.add_argument("--not-zip", dest="is_zip", action="store_false")
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--output", default=None, help="write JSON result here in addition to stdout")
    args = parser.parse_args()

    result = probe(args.url, args.format, is_zip=args.is_zip, layer=args.layer, timeout_s=args.timeout)
    text = json.dumps(result, indent=2)
    print(text)
    if args.output:
        Path(args.output).write_text(text)
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
