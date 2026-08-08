"""data/parcel_pipeline/static_ingestion/pipeline.py

Orchestrates one static source end to end:

  DISCOVER (read the registered StaticSource)
    -> DOWNLOAD (download.py: retry/backoff, corruption/HTML detection,
                 conditional fetch against the last known ETag/checksum)
    -> VERIFY (did the download actually succeed and pass its checks)
    -> EXTRACT + CONVERT + REPROJECT + CLEAN + DEDUPLICATE + VALIDATE
                (convert.py, via ogr2ogr)
    -> INDEX + OPTIMIZE FOR WEB (chunk.py: geographic chunking)
    -> GENERATE METADATA (this file: manifest.json per source, with
                 provenance -- checksum, retrieved_at, source-declared
                 modified date, per-stage counts)
    -> PUBLISH (writes chunk files + index under the given output root --
                actually committing them to the repo is left to the CI
                workflow/caller, this module only writes to disk)
    -> HEALTH CHECK (classifies the run's outcome into one of the health
                states below, never a bare pass/fail)

UPDATE-CHECK-BEFORE-EXPENSIVE-WORK is structural, not incidental: the
manifest from the PREVIOUS run (etag/last_modified/sha256) is read back in
and handed to download.download() as the conditional-request baseline, so an
unchanged source costs one small HTTP request and skips conversion/chunking
entirely. A run that finds nothing changed is reported as `skipped`, not
silently treated the same as a fresh success.

HEALTH STATES
-------------
Six distinct outcomes, not a boolean, so a failure is diagnosable without
reading a stack trace:

  SOURCE_DOWN         the download failed (network/HTTP) after retries
  SOURCE_CHANGED      the file downloaded fine but a structural check on
                       it looked wrong (e.g. corrupt archive/HTML masquerade)
  SCHEMA_CHANGED       the converted output is missing an expected_fields
                       entry the source registry declared
  DATA_EMPTY           the conversion produced zero accepted features
  NETWORK_FAILURE      a transport-level exception, not an HTTP failure
  VALIDATION_FAILURE   accepted features exist but rejected/invalid counts
                       are suspiciously large relative to the input
  OK                   none of the above
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Callable, Optional

from . import download as download_mod
from . import convert as convert_mod
from . import chunk as chunk_mod
from .models import StaticSource

SOURCE_DOWN = "SOURCE_DOWN"
SOURCE_CHANGED = "SOURCE_CHANGED"
SCHEMA_CHANGED = "SCHEMA_CHANGED"
DATA_EMPTY = "DATA_EMPTY"
NETWORK_FAILURE = "NETWORK_FAILURE"
VALIDATION_FAILURE = "VALIDATION_FAILURE"
OK = "OK"

# Above this rejection ratio, something is probably wrong with the source or
# the join config rather than the data genuinely being that messy -- worth a
# human look rather than silently publishing a mostly-empty layer.
REJECTION_RATIO_ALERT_THRESHOLD = 0.15


@dataclass
class PipelineResult:
    ok: bool
    source_id: str
    health: str
    skipped: bool = False
    why: Optional[str] = None
    dataset_version: int = 1
    retrieved_at: Optional[str] = None
    source_last_modified: Optional[str] = None
    checksum: Optional[str] = None
    input_count: int = 0
    accepted_count: int = 0
    rejected_count: int = 0
    duplicate_count: int = 0
    invalid_geometry_count: int = 0
    missing_coordinate_count: int = 0
    transformation_errors: list = field(default_factory=list)
    chunk_count: int = 0
    chunk_files: list = field(default_factory=list)
    manifest_path: Optional[str] = None


def _manifest_path(state_dir: Path, source_id: str) -> Path:
    return state_dir / f"{source_id}.manifest.json"


def _load_prior_manifest(state_dir: Path, source_id: str) -> Optional[dict]:
    p = _manifest_path(state_dir, source_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except json.JSONDecodeError:
        return None


def run_pipeline(
    source: StaticSource,
    *,
    output_root: str,
    state_dir: str,
    raw_download_dir: Optional[str] = None,
    force_refresh: bool = False,
    download_fn: Callable = download_mod.download,
    convert_fn: Callable = convert_mod.convert_to_geojson,
    chunk_fn: Callable = chunk_mod.chunk_geojson,
    now_iso: Optional[str] = None,
) -> PipelineResult:
    state_path = Path(state_dir)
    state_path.mkdir(parents=True, exist_ok=True)
    raw_dir = Path(raw_download_dir or (state_path / "raw"))
    raw_dir.mkdir(parents=True, exist_ok=True)
    out_dir = Path(output_root) / source.id
    out_dir.mkdir(parents=True, exist_ok=True)

    retrieved_at = now_iso or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    # `prior` is read unconditionally: dataset_version has to keep counting up
    # across a force_refresh, or a forced re-run would look like the source's
    # very first ingestion every time. force_refresh instead controls a
    # SEPARATE thing below -- whether the prior manifest's etag/checksum are
    # handed to the downloader as a "skip if unchanged" hint. Conflating the
    # two (the bug an earlier version of this function had) made every
    # forced re-run silently reset dataset_version back to 1.
    prior = _load_prior_manifest(state_path, source.id)
    conditional = None if force_refresh else prior

    is_zip = source.format in ("shapefile", "geopackage", "geojson") and source.download_url.lower().endswith(".zip")
    raw_path = str(raw_dir / f"{source.id}.download")

    dl = download_fn(
        source.download_url, raw_path,
        is_zip=is_zip,
        prior_etag=(conditional or {}).get("etag"),
        prior_last_modified=(conditional or {}).get("source_last_modified"),
        prior_sha256=(conditional or {}).get("checksum"),
    )

    if not dl.ok:
        health = NETWORK_FAILURE if dl.failure_type == download_mod.NETWORK_FAILURE else \
            (SOURCE_CHANGED if dl.failure_type in (download_mod.HTML_MASQUERADE, download_mod.CORRUPT_ARCHIVE, download_mod.EMPTY_FILE)
             else SOURCE_DOWN)
        return PipelineResult(
            ok=False, source_id=source.id, health=health, why=dl.why,
            retrieved_at=retrieved_at,
            dataset_version=(prior or {}).get("dataset_version", 0),
        )

    if dl.not_modified:
        return PipelineResult(
            ok=True, source_id=source.id, health=OK, skipped=True,
            why="source unchanged since last run (conditional request / checksum match)",
            retrieved_at=retrieved_at,
            dataset_version=(prior or {}).get("dataset_version", 1),
            checksum=dl.sha256 or (prior or {}).get("checksum"),
            source_last_modified=dl.last_modified or (prior or {}).get("source_last_modified"),
            chunk_count=(prior or {}).get("chunk_count", 0),
            chunk_files=(prior or {}).get("chunk_files", []),
            manifest_path=str(_manifest_path(state_path, source.id)),
        )

    converted_path = str(state_path / f"{source.id}.converted.geojson")
    conv = convert_fn(
        raw_path, converted_path,
        fmt=source.format, expected_crs=source.expected_crs,
        parcel_id_field=source.parcel_id_field,
    )

    if not conv.ok:
        return PipelineResult(
            ok=False, source_id=source.id, health=SOURCE_CHANGED, why=conv.why,
            retrieved_at=retrieved_at, checksum=dl.sha256,
            dataset_version=(prior or {}).get("dataset_version", 0),
        )

    # Schema check: does the converted output actually carry the fields the
    # registry declared? A silently-changed publisher schema is exactly the
    # kind of drift a human needs to know about rather than have it degrade
    # every downstream field quietly.
    schema_ok, missing_fields = _check_schema(converted_path, source.expected_fields)

    if conv.accepted_count == 0:
        health = DATA_EMPTY
    elif not schema_ok:
        health = SCHEMA_CHANGED
    elif conv.input_count and (conv.rejected_count / max(1, conv.input_count)) > REJECTION_RATIO_ALERT_THRESHOLD:
        health = VALIDATION_FAILURE
    else:
        health = OK

    chunked = chunk_fn(converted_path, str(out_dir), dataset_id=source.id)

    dataset_version = (prior or {}).get("dataset_version", 0) + 1

    result = PipelineResult(
        ok=(health in (OK,)),
        source_id=source.id,
        health=health,
        why=None if health == OK else (
            f"missing expected fields: {missing_fields}" if health == SCHEMA_CHANGED
            else f"rejected {conv.rejected_count} of {conv.input_count} input features "
                 f"({(conv.rejected_count / max(1, conv.input_count)) * 100:.1f}%)"
            if health == VALIDATION_FAILURE
            else "conversion produced zero accepted features"
        ),
        dataset_version=dataset_version,
        retrieved_at=retrieved_at,
        source_last_modified=dl.last_modified,
        checksum=dl.sha256,
        input_count=conv.input_count,
        accepted_count=conv.accepted_count,
        rejected_count=conv.rejected_count,
        duplicate_count=conv.duplicate_count,
        invalid_geometry_count=conv.invalid_geometry_count,
        missing_coordinate_count=conv.missing_coordinate_count,
        transformation_errors=conv.transformation_errors,
        chunk_count=chunked.chunk_count,
        chunk_files=chunked.chunk_files,
    )

    manifest = {
        **asdict(result),
        "etag": dl.etag,
        "jurisdiction": source.jurisdiction,
        "publisher": source.publisher,
        "download_url": source.download_url,
        "overall_bbox": chunked.overall_bbox,
    }
    manifest_path = _manifest_path(state_path, source.id)
    manifest_path.write_text(json.dumps(manifest, indent=2))
    result.manifest_path = str(manifest_path)

    return result


def _check_schema(geojson_path: str, expected_fields: list[str]) -> tuple[bool, list[str]]:
    try:
        fc = json.loads(Path(geojson_path).read_text())
    except (json.JSONDecodeError, OSError):
        return False, list(expected_fields)
    features = fc.get("features", [])
    if not features:
        return True, []   # DATA_EMPTY is reported separately; nothing to check schema against
    present = set()
    for feat in features[:50]:   # a sample is enough; this is a schema check, not per-feature validation
        present.update((feat.get("properties") or {}).keys())
    missing = [f for f in expected_fields if f not in present]
    return (len(missing) == 0), missing
