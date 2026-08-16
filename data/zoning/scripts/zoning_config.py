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


def _perp_distance(pt, a, b):
    """Perpendicular distance from pt to the line through a-b (2D, degrees)."""
    (px, py), (ax, ay), (bx, by) = pt, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    nx, ny = ax + t * dx, ay + t * dy
    return ((px - nx) ** 2 + (py - ny) ** 2) ** 0.5


def douglas_peucker(points: list, tolerance: float) -> list:
    """Ramer-Douglas-Peucker line simplification, pure Python (no Shapely/GEOS
    dependency needed for a tolerance this coarse). Keeps the first and last
    point always; a point survives only if it deviates from the straight line
    between its neighbors by more than `tolerance`. This is exactly what
    docs/ZONING_ARCHITECTURE.md has described as the pipeline's own geometry
    simplification step since the doc was written -- SIMPLIFY_TOLERANCE
    existed, but nothing ever called an implementation of it."""
    if len(points) < 3:
        return list(points)

    first, last = points[0], points[-1]
    max_dist = -1.0
    max_idx = 0
    for i in range(1, len(points) - 1):
        d = _perp_distance(points[i], first, last)
        if d > max_dist:
            max_dist = d
            max_idx = i

    if max_dist > tolerance:
        left = douglas_peucker(points[:max_idx + 1], tolerance)
        right = douglas_peucker(points[max_idx:], tolerance)
        return left[:-1] + right
    return [first, last]


def simplify_ring(ring: list, tolerance: float) -> list:
    """Simplifies one closed GeoJSON linear ring. Never returns fewer than 4
    points (3 distinct + the repeated closing point), the minimum GeoJSON
    allows for a valid Polygon ring -- falling back to the original ring
    rather than emitting invalid geometry if simplification would go below
    that floor."""
    simplified = douglas_peucker(ring, tolerance)
    if len(simplified) < 4:
        return ring
    # Douglas-Peucker on an already-closed ring keeps both the start and end
    # point (identical coordinates) since both are endpoints of the input --
    # confirm closure explicitly rather than relying on that as an assumption.
    if simplified[0] != simplified[-1]:
        simplified = simplified + [simplified[0]]
    return simplified


def simplify_geometry(geometry: dict, tolerance: float) -> dict:
    """Simplifies a GeoJSON Polygon or MultiPolygon geometry ring-by-ring.
    Other geometry types (Point, LineString) pass through unchanged --
    zoning district geometry is always polygonal, so this only needs to
    handle the two real cases rather than a generic GeoJSON simplifier."""
    if not geometry:
        return geometry
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if gtype == "Polygon" and coords:
        return {"type": gtype, "coordinates": [simplify_ring(r, tolerance) for r in coords]}
    if gtype == "MultiPolygon" and coords:
        return {
            "type": gtype,
            "coordinates": [[simplify_ring(r, tolerance) for r in poly] for poly in coords],
        }
    return geometry

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
                # Live-verified 2026-08-15 via six rounds of disposable
                # diagnostic GitHub Actions dispatch. The previous
                # "arcgis_open_data" config below never resolved (three full
                # rounds enumerating 8 REST folders on Fairfax's own ArcGIS
                # Server host, www.fairfaxcounty.gov/mercator, confirmed
                # negative -- no zoning service exists there). The real
                # service is instead hosted on ArcGIS Online's shared
                # infrastructure under Fairfax's own official org account
                # (FX.AuthData, contentStatus "public_authoritative"),
                # findable only via an ArcGIS Online item search, not REST
                # folder enumeration. Layer 0 ("Zoning"): real fields
                # ZONECODE/ZONETYPE/PROFFER/PUBLIC_LAND/JURISDICTION,
                # geometryType esriGeometryPolygon, 6,440 features total.
                #
                # That total spans THREE real jurisdictions merged into one
                # layer via JURISDICTION ("FAIRFAX COUNTY" / "TOWN OF
                # HERNDON" / "TOWN OF VIENNA", plus a handful of null-
                # jurisdiction records) -- confirmed via a distinct-values
                # query. The where clause below scopes every fetch to
                # Fairfax County proper; Herndon/Vienna town zoning is a
                # separate ordinance and is deliberately excluded rather
                # than ingested as if it were county data. Fairfax-County-
                # only count independently confirmed: 6,242 features, 0
                # with null/empty ZONECODE, 44 real distinct ZONECODE
                # values. ZONETYPE is a real but coarse GIS grouping field
                # (RESIDENTIAL/COMMERCIAL/INDUSTRIAL/PLANNED UNITS/OTHER/
                # TYSON covering many codes each) -- it is not a per-code
                # district name, so district_name_field intentionally has
                # no real value here (see below), same pattern as Prince
                # William County.
                "type":     "arcgis_featureserver",
                "url":      "https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services/Zoning/FeatureServer",
                "layer_id": 0,
                "where":    "JURISDICTION='FAIRFAX COUNTY'",
                "expected_min_features": 6000,
            },
            "ordinance": {
                "type": "url",
                "url":  "https://www.fairfaxcounty.gov/planning-development/zoning/ordinance",
            },
        },
        # Confirmed real GIS attribute name (round 5/6 diagnostics,
        # 2026-08-15) -- replaces the previous unverified guesses
        # ("ZONINGCODE" / "ZONINGDESC", which do not exist on this service).
        "district_code_field": "ZONECODE",
        "district_name_field": "__no_name_field_on_this_layer__",
    },
    "va-prince-william-county": {
        "display_name":   "Prince William County, VA",
        "state":          "VA",
        "county_fips":    "51153",
        "data_center_relevance": "high",
        "sources": {
            "zoning_geometry": {
                # Live-verified 2026-08-13 via three rounds of disposable
                # diagnostic GitHub Actions dispatch, same methodology as
                # Loudoun. The ArcGIS Hub portal-search config below (the
                # previous entry) never resolved a real service. The real
                # source lives directly on PWC's own ArcGIS Server, in the
                # Planning/Zoning MapServer (14 layers total). Layer 5
                # ("Zoning Districts") is the real countywide layer: real
                # fields ZoningDistrict (code)/ZoningCaseNumber/GISAcreage/
                # ZoningCaseName/PROFFERS, geometryType esriGeometryPolygon,
                # 2,227 features. (Also found but not yet wired in: layer 7
                # "Overlay District Data Center Opportunity Zone" -- a real,
                # single designated rezoning case with fields CaseName/
                # CaseNumber/OrdinanceNumber/ZoningOrdinanceLink -- worth a
                # follow-up as an overlay layer once the base district
                # geometry is proven in production.)
                #
                # Unlike Loudoun's Zoning layer, this layer carries no
                # separate district-name field -- ZoningDistrict is both the
                # code and the only classification attribute, so
                # district_name_field intentionally has no real value here
                # (see below).
                "type":     "arcgis_featureserver",
                "url":      "https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Zoning/MapServer",
                "layer_id": 5,
                "expected_min_features": 2000,
            },
            "ordinance": {
                "type": "url",
                "url":  "https://www.pwcva.gov/department/planning-office/zoning-ordinance",
            },
        },
        # Confirmed real GIS attribute name (round 3 diagnostic, 2026-08-13)
        # -- replaces the previous unverified guess ("ZONING", which does
        # not exist on this service). No real district-name field exists on
        # this layer (see notes above); left pointing at a nonexistent
        # field name on purpose so normalize_zoning.py's props.get(name_field, "")
        # fallback resolves to "" rather than silently picking up an
        # unrelated attribute.
        "district_code_field": "ZoningDistrict",
        "district_name_field": "__no_name_field_on_this_layer__",
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
