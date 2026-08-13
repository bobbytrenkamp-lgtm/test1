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
    "va-fairfax-county": {
        "display_name":   "Fairfax County, VA",
        "state":          "VA",
        "county_fips":    "51059",
        "data_center_relevance": "high",
        "sources": {
            "zoning_geometry": {
                "type":   "arcgis_open_data",
                "portal": "https://data.fairfaxcounty.gov/",
                "search_terms": ["zoning districts", "current zoning"],
                "export_format": "geojson",
                "expected_min_features": 100,
            },
            "ordinance": {
                "type": "url",
                "url":  "https://library.municode.com/va/fairfax_county/codes/zoning_ordinance",
            },
        },
        "district_code_field": "ZONINGCODE",
        "district_name_field": "ZONINGDESC",
    },
    "va-prince-william-county": {
        "display_name":   "Prince William County, VA",
        "state":          "VA",
        "county_fips":    "51153",
        "data_center_relevance": "high",
        "sources": {
            "zoning_geometry": {
                "type":   "arcgis_open_data",
                "portal": "https://pwcgis.maps.arcgis.com/",
                "search_terms": ["zoning districts", "zoning"],
                "export_format": "geojson",
                "expected_min_features": 100,
            },
            "ordinance": {
                "type": "url",
                "url":  "https://www.pwcva.gov/department/planning-office/zoning-ordinance",
            },
        },
        "district_code_field": "ZONING",
        "district_name_field": "ZONING_DESCRIPTION",
    },
    "md-montgomery-county": {
        "display_name":   "Montgomery County, MD",
        "state":          "MD",
        "county_fips":    "24031",
        "data_center_relevance": "medium",
        "sources": {
            "zoning_geometry": {
                "type":   "arcgis_open_data",
                "portal": "https://data.montgomerycountymd.gov/",
                "search_terms": ["zoning districts", "zoning"],
                "export_format": "geojson",
                "expected_min_features": 100,
            },
            "ordinance": {
                "type": "url",
                "url":  "https://codelibrary.amlegal.com/codes/montgomeryco/latest/montgomeryco_md/0-0-0-1",
            },
        },
        "district_code_field": "ZONING",
        "district_name_field": "DESCRIPTION",
    },
    "va-loudoun-county": {
        "display_name":   "Loudoun County, VA",
        "state":          "VA",
        "county_fips":    "51107",
        "data_center_relevance": "critical",
        "sources": {
            "zoning_geometry": {
                # Live-verified 2026-08-13 via two rounds of disposable diagnostic
                # GitHub Actions dispatch (see AI_CHANGELOG.md). The ArcGIS Hub
                # portal search (previous "arcgis_open_data" config below) never
                # resolved -- the real service lives directly on Loudoun's own
                # ArcGIS Server (same host family as the already-verified parcel
                # service), not through opendata.arcgis.com. COL/Zoning/MapServer
                # has 6 layers; layer 0 ("Leesburg Zoning", LB_-prefixed fields)
                # is town-specific and was queried by mistake in round 1. Layer 3
                # ("Zoning") is the real countywide layer: serviceDescription
                # "Loudoun County, Virginia zoning", copyrightText "Loudoun
                # County, Virginia" (official publisher), 1,271 polygon features,
                # geometryType esriGeometryPolygon. Layer 1 ("1972 Zoning
                # Ordinance") has only 87 features and is confirmed historical/
                # superseded -- not used. f=geojson output is auto-reprojected
                # to WGS84 by the ArcGIS server regardless of the layer's native
                # spatialReference (wkid 2924 / VA State Plane North).
                "type":     "arcgis_featureserver",
                "url":      "https://logis.loudoun.gov/gis/rest/services/COL/Zoning/MapServer",
                "layer_id": 3,
                "expected_min_features": 1000,
            },
            "ordinance": {
                "type": "municode",
                "url":  "https://library.municode.com/va/loudoun_county/codes/codified_ordinances",
            },
        },
        # Confirmed real GIS attribute names from the live service (round 2
        # diagnostic, 2026-08-13) -- replaces the previous unverified guesses
        # ("ZONING" / "ZONING_DESC", which do not exist on this service).
        # ZO_ZONE carries current-ordinance codes (e.g. "IP") that reflect
        # Loudoun's 2023 Zoning Ordinance rewrite (confirmed live: sample
        # record has ZO_ORDINANCE="2023", ZO_ZONE_ORD="IP 2023") and do not
        # match the older codes (PD-IP, I1, I2, ...) hand-transcribed into
        # districts.json from general public knowledge on 2026-07-17. See
        # districts.json's own notes for how that mismatch is handled --
        # DC-eligibility is never guessed across the old/new code boundary.
        "district_code_field": "ZO_ZONE",
        "district_name_field": "ZD_ZONE_NAME",
    },
}


def load_jurisdiction_config(jurisdiction_id: str) -> dict:
    cfg = JURISDICTION_CONFIGS.get(jurisdiction_id)
    if not cfg:
        raise ValueError(f"No config found for jurisdiction: {jurisdiction_id}")
    return cfg


def load_source_registry() -> dict:
    if SOURCES_FILE.exists():
        with open(SOURCES_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_jurisdiction_file(jurisdiction_id: str, filename: str) -> dict:
    path = JURISDICTIONS_DIR / jurisdiction_id / filename
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_normalized(jurisdiction_id: str, data: dict) -> Path:
    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = NORMALIZED_DIR / f"{jurisdiction_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return out_path


def write_geometry(jurisdiction_id: str, geojson: dict) -> Path:
    GEOMETRY_DIR.mkdir(parents=True, exist_ok=True)
    out_path = GEOMETRY_DIR / f"{jurisdiction_id}.geojson"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f)
    return out_path
