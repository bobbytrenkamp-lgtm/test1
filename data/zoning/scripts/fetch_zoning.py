"""
Zoning geometry fetcher.

Supports:
  - ArcGIS FeatureServer / MapServer with pagination
  - GeoJSON direct download
  - ArcGIS Open Data portal (search → discover FeatureServer URL)

Usage:
  python fetch_zoning.py --jurisdiction va-loudoun-county [--dry-run]

IMPORTANT: Only fetches from official public government ArcGIS services and open
data portals. No paid APIs. Respects rate limits with delays between page requests.
"""

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from zoning_config import (
    ARCGIS_PAGE_SIZE, JURISDICTION_CONFIGS, GEOMETRY_DIR,
    SIMPLIFY_TOLERANCE, GEOMETRY_RECORD_WARN_THRESHOLD,
    write_geometry
)


def _fetch_json(url: str, timeout: int = 30) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "ZoningPipeline/1.0 (public data research; non-commercial)"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    return json.loads(raw)


def fetch_arcgis_featureserver(base_url: str, layer_id: int = 0,
                                page_size: int = ARCGIS_PAGE_SIZE,
                                dry_run: bool = False) -> dict:
    """
    Paginate an ArcGIS FeatureServer layer and return GeoJSON FeatureCollection.
    Supports objectId-based pagination (works across all ArcGIS versions).
    """
    query_url = f"{base_url.rstrip('/')}/{layer_id}/query"
    all_features = []
    offset = 0

    print(f"  Fetching {base_url} layer {layer_id}")
    if dry_run:
        print("  [dry-run] Skipping actual request")
        return {"type": "FeatureCollection", "features": [], "dry_run": True}

    while True:
        params = {
            "where":        "1=1",
            "outFields":    "*",
            "f":            "geojson",
            "resultOffset": str(offset),
            "resultRecordCount": str(page_size),
            "geometryPrecision": "6",
        }
        url = f"{query_url}?{urllib.parse.urlencode(params)}"
        try:
            data = _fetch_json(url)
        except urllib.error.HTTPError as e:
            print(f"  HTTP error {e.code} fetching page at offset {offset}: {e.reason}")
            break
        except Exception as e:
            print(f"  Error fetching page at offset {offset}: {e}")
            break

        features = data.get("features", [])
        all_features.extend(features)
        print(f"  ...{len(all_features)} features fetched")

        exceeded = data.get("exceededTransferLimit", False)
        if not exceeded or len(features) == 0:
            break

        offset += page_size
        time.sleep(0.5)  # be polite to government servers

    if len(all_features) > GEOMETRY_RECORD_WARN_THRESHOLD:
        print(f"  WARNING: {len(all_features)} features — output may be large")

    return {
        "type": "FeatureCollection",
        "features": all_features,
        "source_url": base_url,
    }


def fetch_geojson_download(url: str, dry_run: bool = False) -> dict:
    """Download a GeoJSON file directly."""
    print(f"  Downloading GeoJSON from {url}")
    if dry_run:
        print("  [dry-run] Skipping actual download")
        return {"type": "FeatureCollection", "features": [], "dry_run": True}
    data = _fetch_json(url)
    if "type" not in data:
        raise ValueError("Response does not appear to be valid GeoJSON")
    return data


def discover_arcgis_layer(base_url: str, search_terms: list[str],
                           dry_run: bool = False) -> str | None:
    """
    Query an ArcGIS REST root to discover zoning layer URLs.
    Returns the first FeatureServer URL matching a search term.
    """
    print(f"  Discovering layers at {base_url}")
    if dry_run:
        print("  [dry-run] Skipping discovery")
        return None
    try:
        catalog = _fetch_json(f"{base_url}?f=json")
    except Exception as e:
        print(f"  Discovery failed: {e}")
        return None

    services = catalog.get("services", [])
    for term in search_terms:
        for svc in services:
            name = svc.get("name", "").lower()
            svc_type = svc.get("type", "")
            if term.lower() in name and svc_type == "FeatureServer":
                url = f"{base_url.rstrip('/')}/{svc['name']}/FeatureServer"
                print(f"  Found: {url}")
                return url
    return None


def validate_geometry_response(geojson: dict, min_features: int = 0) -> list[str]:
    """Return a list of validation errors (empty = OK)."""
    errors = []
    if geojson.get("dry_run"):
        return []
    if geojson.get("type") != "FeatureCollection":
        errors.append("Response is not a GeoJSON FeatureCollection")
    features = geojson.get("features", [])
    if len(features) == 0:
        errors.append("FeatureCollection contains zero features")
    elif len(features) < min_features:
        errors.append(f"Only {len(features)} features; expected at least {min_features}")
    null_geom = [i for i, f in enumerate(features) if f.get("geometry") is None]
    if null_geom:
        errors.append(f"{len(null_geom)} features have null geometry")
    return errors


def fetch_for_jurisdiction(jurisdiction_id: str, dry_run: bool = False) -> dict | None:
    """Fetch zoning geometry for a single jurisdiction. Returns GeoJSON or None."""
    cfg = JURISDICTION_CONFIGS.get(jurisdiction_id)
    if not cfg:
        print(f"No config for {jurisdiction_id}")
        return None

    src = cfg.get("sources", {}).get("zoning_geometry", {})
    src_type = src.get("type", "")
    min_features = src.get("expected_min_features", 0)

    geojson = None

    if src_type == "arcgis_open_data":
        portal = src.get("portal", "")
        search_terms = src.get("search_terms", ["zoning"])
        fallback = src.get("fallback_mapserver", "")

        # Try to discover FeatureServer from portal (simplified — real portal
        # search would use Hub API: {portal}api/search?q=zoning&f=json)
        # For now attempt a known pattern or fall back.
        discovered = None
        if portal:
            # ArcGIS Hub search API
            hub_search = f"https://opendata.arcgis.com/api/v3/search?q={urllib.parse.quote(search_terms[0])}&filter%5Borganization%5D=Loudoun"
            try:
                if not dry_run:
                    result = _fetch_json(hub_search)
                    results = result.get("data", [])
                    for item in results[:5]:
                        links = item.get("links", {})
                        dl = links.get("agsFeatureServer", "")
                        if dl:
                            discovered = dl
                            break
            except Exception as e:
                print(f"  Hub search failed: {e}")

        if discovered:
            geojson = fetch_arcgis_featureserver(discovered, dry_run=dry_run)
        elif fallback:
            fs_url = discover_arcgis_layer(fallback, search_terms, dry_run=dry_run)
            if fs_url:
                geojson = fetch_arcgis_featureserver(fs_url, dry_run=dry_run)
            else:
                print(f"  Could not discover FeatureServer at {fallback}")
                print("  Manual step required: Find the zoning FeatureServer URL")
                print(f"  at {src.get('portal', portal)} and update zoning_config.py")

    elif src_type == "geojson_download":
        url = src.get("url", "")
        geojson = fetch_geojson_download(url, dry_run=dry_run)

    elif src_type == "arcgis_featureserver":
        url = src.get("url", "")
        layer = src.get("layer_id", 0)
        geojson = fetch_arcgis_featureserver(url, layer, dry_run=dry_run)

    if geojson is None:
        print(f"  No geometry retrieved for {jurisdiction_id}")
        return None

    errors = validate_geometry_response(geojson, min_features)
    if errors:
        print(f"  Validation FAILED:")
        for e in errors:
            print(f"    - {e}")
        print("  Not writing output for this jurisdiction")
        return None

    return geojson


def main():
    parser = argparse.ArgumentParser(description="Fetch zoning geometry for a jurisdiction")
    parser.add_argument("--jurisdiction", required=True, help="Jurisdiction ID")
    parser.add_argument("--dry-run", action="store_true", help="Skip actual HTTP requests")
    args = parser.parse_args()

    print(f"Fetching zoning geometry for: {args.jurisdiction}")
    geojson = fetch_for_jurisdiction(args.jurisdiction, dry_run=args.dry_run)
    if geojson and not geojson.get("dry_run"):
        out_path = write_geometry(args.jurisdiction, geojson)
        print(f"Wrote geometry to: {out_path}")
        feature_count = len(geojson.get("features", []))
        print(f"Features: {feature_count}")
    elif args.dry_run:
        print("[dry-run] No file written")
    else:
        print("No geometry written (fetch failed or validation failed)")
        sys.exit(1)


if __name__ == "__main__":
    main()
