"""data/parcel_pipeline/static_ingestion/models.py

The StaticSource config and the registry it's loaded from
(data/parcel_pipeline/static_ingestion/sources.json).

WHY THIS REGISTRY STARTS EMPTY
-------------------------------
Every field below is required precisely so a source can't be added without
someone having actually looked at it — parcel_id_field, expected_fields, and
expected_crs in particular can't be guessed correctly, and guessing wrong
here produces the same class of bug as a wrong ArcGIS fieldMap: confidently
wrong data rather than an obvious failure.

Registering a source is a claim that a human (or an agent with real network
access, not this repository's offline tests) has:
  1. opened the download_url and confirmed it returns the declared format,
  2. confirmed the CRS the file is actually in,
  3. confirmed which field is the true parcel identifier,
  4. read the license/terms enough to note anything that matters.

Until that happens for a given jurisdiction, it has no entry here — the same
discipline js/parcel/registry.js already applies to live services (see that
file's own comments about not promoting an unverified service).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent.parent.parent
REGISTRY_PATH = Path(__file__).resolve().parent / "sources.json"

SUPPORTED_FORMATS = (
    "geojson", "shapefile", "geopackage", "csv-coordinates", "csv-wkt",
    "kml", "file-geodatabase",
)

REQUIRED_FIELDS = (
    "id", "jurisdiction", "publisher", "landing_page", "download_url",
    "format", "expected_crs", "update_frequency", "license_notes",
    "expected_fields", "parcel_id_field", "geographic_coverage",
    "last_verified",
)


@dataclass
class StaticSource:
    id: str
    jurisdiction: str
    publisher: str
    landing_page: str
    download_url: str
    format: str
    expected_crs: str
    update_frequency: str          # one of the REFRESH_CADENCES in pipeline.py
    license_notes: str
    expected_fields: list[str]
    parcel_id_field: str
    geographic_coverage: str
    last_verified: str             # ISO date a human last confirmed the URL
    fips_hint: Optional[str] = None      # narrows which jurisdiction this feeds, if known
    simplify_tolerance_deg: Optional[float] = None   # for chunk.py's web-overview output
    notes: str = ""

    def __post_init__(self):
        if self.format not in SUPPORTED_FORMATS:
            raise ValueError(
                f"static source '{self.id}': format '{self.format}' is not one of "
                f"{SUPPORTED_FORMATS}"
            )

    def to_dict(self) -> dict:
        return asdict(self)


def validate_source_dict(d: dict) -> list[str]:
    """Returns a list of problems; empty means the entry is well-formed.
    Does not touch the network — this is structural validation only."""
    problems = []
    missing = [f for f in REQUIRED_FIELDS if f not in d or d[f] in (None, "")]
    if missing:
        problems.append(f"missing required field(s): {missing}")
    if d.get("format") and d["format"] not in SUPPORTED_FORMATS:
        problems.append(f"format '{d['format']}' is not one of {SUPPORTED_FORMATS}")
    if d.get("expected_fields") is not None and not isinstance(d["expected_fields"], list):
        problems.append("expected_fields must be a list")
    if d.get("parcel_id_field") and d.get("expected_fields") is not None:
        if d["parcel_id_field"] not in d["expected_fields"]:
            problems.append(
                f"parcel_id_field '{d['parcel_id_field']}' is not listed in expected_fields "
                f"-- a field that isn't expected to exist can't be the parcel identifier"
            )
    return problems


def load_registry(path: Path = REGISTRY_PATH) -> list[StaticSource]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text())
    sources = []
    for entry in raw.get("sources", []):
        problems = validate_source_dict(entry)
        if problems:
            raise ValueError(f"static source '{entry.get('id', '?')}' is invalid: {problems}")
        kwargs = {k: entry[k] for k in REQUIRED_FIELDS}
        kwargs["fips_hint"] = entry.get("fips_hint")
        kwargs["simplify_tolerance_deg"] = entry.get("simplify_tolerance_deg")
        kwargs["notes"] = entry.get("notes") or ""
        sources.append(StaticSource(**kwargs))
    return sources


def get_source(source_id: str, path: Path = REGISTRY_PATH) -> Optional[StaticSource]:
    for s in load_registry(path):
        if s.id == source_id:
            return s
    return None
