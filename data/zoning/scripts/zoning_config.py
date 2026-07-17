"""
Zoning pipeline configuration — jurisdiction definitions and pipeline constants.
"""

import os
import json
from pathlib import Path

ZONING_DATA_DIR   = Path(__file__).parent.parent
JURISDICTIONS_DIR = ZONING_DATA_DIR / "jurisdictions"
NORMALIZED_DIR    = ZONING_DATA_DIR / "normalized"
GEOMETRY_DIR      = ZONING_DATA_DIR / "geometry"
SCRIPTS_DIR       = ZONING_DATA_DIR / "scripts"
SOURCES_FILE      = ZONING_DATA_DIR / "sources" / "source_registry.json"

DISCLAIMER = (
    "Zoning information is provided for preliminary research only. "
    "District boundaries, overlays, parcel conditions, interpretations, "
    "variances, and recent amendments may affect a property. "
    "Confirm all requirements with the controlling jurisdiction before "
    "relying on this information."
)

# Geometry simplification tolerance in degrees (~90 m at mid-latitudes)
SIMPLIFY_TOLERANCE = 0.001

# Maximum GeoJSON feature count before we warn about file size
GEOMETRY_RECORD_WARN_THRESHOLD = 5000

# ArcGIS FeatureServer default page size
ARCGIS_PAGE_SIZE = 1000

JURISDICTION_CONFIGS = {
    "va-loudoun-county": {
        "display_name":   "Loudoun County, VA",
        "state":          "VA",
        "county_fips":    "51107",
        "data_center_relevance": "critical",
        "sources": {
            "zoning_geometry": {
                "type":   "arcgis_open_data",
                "portal": "https://data-loudoungis.opendata.arcgis.com/",
                "search_terms": ["current zoning", "zoning districts", "zoning"],
                "fallback_mapserver": "https://logis.loudoun.gov/arcgis/rest/services/",
                "export_format": "geojson",
                "expected_min_features": 100,
            },
            "ordinance": {
                "type": "municode",
                "url":  "https://library.municode.com/va/loudoun_county/codes/codified_ordinances",
            },
        },
        "district_code_field": "ZONING",  # expected GIS attribute name (may vary)
        "district_name_field": "ZONING_DESC",
    },
}


def load_jurisdiction_config(jurisdiction_id: str) -> dict:
    cfg = JURISDICTION_CONFIGS.get(jurisdiction_id)
    if not cfg:
        raise ValueError(f"No config found for jurisdiction: {jurisdiction_id}")
    return cfg


def load_source_registry() -> dict:
    if SOURCES_FILE.exists():
        with open(SOURCES_FILE) as f:
            return json.load(f)
    return {}


def load_jurisdiction_file(jurisdiction_id: str, filename: str) -> dict:
    path = JURISDICTIONS_DIR / jurisdiction_id / filename
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def write_normalized(jurisdiction_id: str, data: dict) -> Path:
    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = NORMALIZED_DIR / f"{jurisdiction_id}.json"
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    return out_path


def write_geometry(jurisdiction_id: str, geojson: dict) -> Path:
    GEOMETRY_DIR.mkdir(parents=True, exist_ok=True)
    out_path = GEOMETRY_DIR / f"{jurisdiction_id}.geojson"
    with open(out_path, "w") as f:
        json.dump(geojson, f)
    return out_path
