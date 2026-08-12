"""data/_diagnose_fiber_expansion_r3.py -- TEMP diagnostic, round 3.

Confirms the exact query shape the production provider function will use
against TxDOT's Fiberlight_Network FeatureServer before it gets wired into
js/parcel/proximity-layers.js: a bbox-intersects query with f=geojson (not
f=json, which round 1/2 used for schema inspection). Esri hosted feature
services generally support geojson output, but "generally" is not "verified
live" -- this checks it against a real bbox around Houston, TX (a real
Fiberlight-covered market per round 2's distinct-Market probe).

Run:  python3 data/_diagnose_fiber_expansion_r3.py
"""
import json
import urllib.request
import urllib.error
import urllib.parse

TIMEOUT = 25


def _get(url, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (fiber-diagnostic-r3)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, str(e).encode()


def main():
    base = "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/Fiberlight_Network/FeatureServer/0/query"
    # Downtown Houston bbox, roughly 5 miles across.
    params = {
        "where": "1=1",
        "geometry": "-95.45,29.68,-95.30,29.80",
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "CABLE_NAME,USED_FOR,INVENTORY_,PLACEMENTT,FIBERCOUNT,State,Market",
        "outSR": "4326",
        "f": "geojson",
        "resultRecordCount": "500",
    }
    url = base + "?" + urllib.parse.urlencode(params)
    print(f"URL: {url}")
    status, body = _get(url)
    print(f"HTTP {status}")
    if status != 200:
        print("NOT REACHABLE:", body[:1000])
        return
    try:
        d = json.loads(body)
    except Exception as e:
        print("NOT JSON:", e, body[:1000])
        return
    print(f"top-level keys: {list(d.keys())}")
    feats = d.get("features", [])
    print(f"feature count in Houston bbox: {len(feats)}")
    if feats:
        print(f"sample feature: {json.dumps(feats[0], indent=2)[:1500]}")
    if "error" in d:
        print("ERROR BODY:", d["error"])


if __name__ == "__main__":
    main()
