#!/usr/bin/env python3
"""TEMP diagnostic round 6: get the FULL field schema + one full real
sample feature's attributes for HIFLD's Electric_Planning_Areas layer on
the already-verified no-token HDR Inc. mirror (services5.arcgis.com/
HDRa0B57OVrv2E1q) -- confirmed live in round 5 (count=94, no auth error).
Round 5 only printed 800-byte-truncated previews; this prints the full
field list and one full (untruncated) feature so real ingestion code can
be written against real field names, not guessed ones.
"""
import json
import urllib.request

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}
LAYER = "https://services5.arcgis.com/HDRa0B57OVrv2E1q/arcgis/rest/services/Electric_Planning_Areas/FeatureServer/0"


def fetch_json(url, params):
    from urllib.parse import urlencode
    full = f"{url}?{urlencode(params)}"
    req = urllib.request.Request(full, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def main():
    meta = fetch_json(f"{LAYER}", {"f": "json"})
    fields = meta.get("fields", [])
    print(f"=== FULL FIELD LIST ({len(fields)} fields) ===")
    for f in fields:
        print(f"  {f['name']!r}: {f['type']} (alias={f.get('alias')!r}, length={f.get('length')})")

    print("\n=== FULL SAMPLE FEATURE (first record, all attributes, geometry ring-count only) ===")
    data = fetch_json(f"{LAYER}/query", {
        "where": "1=1", "outFields": "*", "outSR": "4326",
        "returnGeometry": "true", "resultRecordCount": "1", "f": "json",
    })
    feats = data.get("features", [])
    if feats:
        attrs = feats[0].get("attributes", {})
        print(json.dumps(attrs, indent=2))
        geom = feats[0].get("geometry", {})
        rings = geom.get("rings", [])
        print(f"geometry: {len(rings)} ring(s), first ring has {len(rings[0]) if rings else 0} vertices")

    print("\n=== DISTINCT NAME/ID VALUES (first 20, to see real RTO/ISO naming) ===")
    distinct = fetch_json(f"{LAYER}/query", {
        "where": "1=1", "outFields": "ID,NAME", "returnGeometry": "false",
        "returnDistinctValues": "true", "orderByFields": "NAME", "resultRecordCount": "100", "f": "json",
    })
    for feat in distinct.get("features", [])[:100]:
        a = feat.get("attributes", {})
        print(f"  ID={a.get('ID')!r} NAME={a.get('NAME')!r}")


if __name__ == "__main__":
    main()
