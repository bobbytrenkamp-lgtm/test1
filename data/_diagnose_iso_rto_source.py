#!/usr/bin/env python3
"""TEMP diagnostic: find a non-token-gated way to download EIA's RTO/ISO
region boundaries.

Known so far (from data/catalog/dataset_registry.json's iso_rto entry):
the raw FeatureServer query (services7.arcgis.com/FGr1D95XCGALKXqM/ArcGIS/
rest/services/RTO_Regions/FeatureServer/0/query) returns "Token Required"
even for outFields=* or bare layer metadata, despite the layer being
publicly viewable via the EIA US Energy Atlas Hub UI. This script probes
several public, no-auth alternatives:

1. ArcGIS Online's public item-search API (no auth required for public
   items) to find the real Hub item id for "RTO Regions".
2. That item's /data endpoint (sharing/rest/content/items/<id>/data) --
   sometimes exposes a direct download URL or embedded service info.
3. The Esri Hub public download proxy, which serves i already-published
   open data through opendata.arcgis.com without a token, in both common
   URL shapes:
     - https://opendata.arcgis.com/api/v3/datasets/<id>/downloads/data?format=geojson&spatialRefId=4326
     - https://<org-hub-domain>/datasets/<id>.geojson
4. A direct query against the FeatureServer's *public* companion MapServer
   (if one exists) and the item's related "Hosted Feature Layer" export.

Prints full response status/headers/body-prefix for every attempt so a
human can read the real result, no matter which (if any) works.
"""
import json
import urllib.error
import urllib.request

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}


def fetch(url, label, params=None):
    if params:
        from urllib.parse import urlencode
        url = f"{url}?{urlencode(params)}"
    print(f"\n=== {label} ===\n{url}")
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            print(f"status={resp.status} content-type={resp.headers.get('Content-Type')} "
                  f"content-length={len(body)}")
            print(f"body[:800]={body[:800]!r}")
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read()
        print(f"HTTPError status={e.code}")
        print(f"body[:800]={body[:800]!r}")
        return e.code, body
    except Exception as e:
        print(f"EXCEPTION: {type(e).__name__}: {e}")
        return None, None


def main():
    # Step 1: public ArcGIS Online item search (no auth needed for public items)
    status, body = fetch(
        "https://www.arcgis.com/sharing/rest/search",
        "ArcGIS Online public item search for RTO Regions",
        {"q": "RTO Regions eia", "f": "json", "num": 10},
    )
    item_ids = []
    if body:
        try:
            data = json.loads(body)
            for r in data.get("results", []):
                print(f"  candidate item: id={r.get('id')} title={r.get('title')!r} "
                      f"owner={r.get('owner')} type={r.get('type')}")
                item_ids.append(r.get("id"))
        except json.JSONDecodeError:
            print("  (not JSON)")

    # Step 2: also try the EIA-specific Hub search (atlas.eia.gov's own Hub API)
    status, body = fetch(
        "https://hub.arcgis.com/api/search/v1/collections/dataset/items",
        "Esri Hub public search API for RTO Regions",
        {"q": "RTO Regions eia"},
    )
    if body:
        try:
            data = json.loads(body)
            for f in data.get("features", [])[:10]:
                props = f.get("properties", {})
                print(f"  candidate hub item: id={f.get('id')} name={props.get('name')!r}")
                item_ids.append(f.get("id"))
        except json.JSONDecodeError:
            print("  (not JSON)")

    item_ids = [i for i in dict.fromkeys(item_ids) if i]  # de-dup, preserve order
    print(f"\nCandidate item ids collected: {item_ids}")

    # Step 3: for each candidate item id, try the known no-token download shapes
    for item_id in item_ids[:5]:
        fetch(f"https://www.arcgis.com/sharing/rest/content/items/{item_id}",
              f"Item metadata for {item_id}")
        fetch(f"https://opendata.arcgis.com/api/v3/datasets/{item_id}_0/downloads/data",
              f"Hub download proxy (v3, geojson) for {item_id}",
              {"format": "geojson", "spatialRefId": "4326"})
        fetch(f"https://www.arcgis.com/sharing/rest/content/items/{item_id}/data",
              f"Item /data endpoint for {item_id}")

    # Step 4: direct attempt at the RTO_Regions FeatureServer's *export*
    # endpoint (sometimes public download export bypasses query-level token
    # gating even when /query does not) and its plain layer metadata.
    fetch("https://services7.arcgis.com/FGr1D95XCGALKXqM/ArcGIS/rest/services/RTO_Regions/FeatureServer/0",
          "Bare layer metadata (no query)", {"f": "json"})
    fetch("https://services7.arcgis.com/FGr1D95XCGALKXqM/ArcGIS/rest/services/RTO_Regions/FeatureServer",
          "Bare service metadata (no query)", {"f": "json"})


if __name__ == "__main__":
    main()
