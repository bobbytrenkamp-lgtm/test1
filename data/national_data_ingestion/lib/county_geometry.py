"""data/national_data_ingestion/lib/county_geometry.py — real county
centroids decoded from the already-vendored, already-verified Census TIGER
boundaries (vendor/counties-10m.json, the standard us-atlas TopoJSON this
project's own choropleth map already renders).

WHY THIS EXISTS
Some national datasets (e.g. LBNL's interconnection queue) publish only
county + state text, no per-project coordinates. A record with no location
at all cannot satisfy InfrastructureAsset's required `geometry` field, and
inventing coordinates from nothing would be exactly the kind of manufactured
precision this project's rules forbid. A COUNTY-level bbox centroid is a
real, honest, derivable fact ("this project is somewhere in this county"),
distinct from a per-project observed location -- which is exactly what
evidence_tier's OBSERVED vs. MODELED distinction exists to express. Callers
must tag any asset located this way as evidence_tier="MODELED", never
"OBSERVED".

TopoJSON DECODING, MINIMAL AND SCOPED
vendor/counties-10m.json is a real Topology object: quantized, delta-encoded
arc coordinates plus per-county Polygon/MultiPolygon geometries referencing
those arcs by index (positive = forward, ~negative-1 = reversed, matching
the TopoJSON spec). This decodes only what's needed for a bbox centroid --
it does not reconstruct a full, renderable, correctly-oriented polygon
(e.g. arc de-duplication/stitching for shared borders is unnecessary when
all we want is the min/max of every coordinate touched by a county's arcs).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[3]
TOPOJSON_PATH = ROOT / "vendor" / "counties-10m.json"


def _decode_arc(raw_arc: list, scale: list, translate: list) -> list:
    """One TopoJSON arc: delta-encoded [dx, dy] pairs -> absolute [lon, lat]
    points, per the TopoJSON spec's quantization transform."""
    points = []
    x = y = 0
    for dx, dy in raw_arc:
        x += dx
        y += dy
        points.append([x * scale[0] + translate[0], y * scale[1] + translate[1]])
    return points


def _arc_indices(geometry: dict) -> list:
    """Flattens every arc index referenced by a Polygon or MultiPolygon
    geometry, regardless of ring/part nesting -- bbox computation doesn't
    care about ring structure, only which arcs contribute coordinates."""
    gtype = geometry.get("type")
    arcs = geometry.get("arcs", [])
    indices = []
    if gtype == "Polygon":
        for ring in arcs:
            indices.extend(ring)
    elif gtype == "MultiPolygon":
        for polygon in arcs:
            for ring in polygon:
                indices.extend(ring)
    return indices


def load_county_centroids() -> dict:
    """Returns {5-digit FIPS string: [lon, lat]} for every county in the
    vendored topology, computed as the bbox center of that county's real
    boundary arcs. Raises if the vendor file is missing/malformed --
    callers that need this data should fail loudly, not silently skip
    location for every record."""
    topo = json.loads(TOPOJSON_PATH.read_text())
    transform = topo["transform"]
    scale, translate = transform["scale"], transform["translate"]
    raw_arcs = topo["arcs"]

    decoded_arcs = [_decode_arc(a, scale, translate) for a in raw_arcs]

    centroids = {}
    for geom in topo["objects"]["counties"]["geometries"]:
        fips = geom.get("id")
        if not fips:
            continue
        min_lon = min_lat = float("inf")
        max_lon = max_lat = float("-inf")
        for idx in _arc_indices(geom):
            arc = decoded_arcs[idx] if idx >= 0 else decoded_arcs[~idx]
            for lon, lat in arc:
                if lon < min_lon: min_lon = lon
                if lon > max_lon: max_lon = lon
                if lat < min_lat: min_lat = lat
                if lat > max_lat: max_lat = lat
        if min_lon == float("inf"):
            continue
        centroids[fips] = [(min_lon + max_lon) / 2, (min_lat + max_lat) / 2]
    return centroids


_cache: Optional[dict] = None


def county_centroid(fips: str) -> Optional[list]:
    """Cached lookup -- load_county_centroids() decodes all 3,231 counties
    once per process, not once per record."""
    global _cache
    if _cache is None:
        _cache = load_county_centroids()
    return _cache.get(str(fips).zfill(5))
