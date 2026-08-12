"""data/_diagnose_fiber_expansion_r2.py -- TEMP diagnostic, round 2.

Round 1 (data/_diagnose_fiber_expansion.py) found two real candidates in
TxDOT's hosted ArcGIS org: Fiberlight_Network (as-built fiber cable segments
with FIBERCOUNT/USED_FOR/PLACEMENTT/INVENTORY_ fields) and
TxDOT_Statewide_Connectivity_Corridors (a statewide corridor eligibility
layer, same tier as the existing ca_middle_mile_corridor). It printed only
JSON *keys*, not the actual description/copyrightText/count values needed to
decide licensing and real breadth -- this round fills that gap. It also
descends into Arizona ADOT's 'Utilities' folder, which round 1's keyword
filter missed (the folder name itself doesn't contain "fiber"/"conduit").

Run:  python3 data/_diagnose_fiber_expansion_r2.py
"""
import json
import urllib.request
import urllib.error

TIMEOUT = 25


def _get(url, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (fiber-diagnostic-r2)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, str(e).encode()


def describe_service(label, base_url, layer_id=0):
    print(f"\n=== {label}: description + licensing + count ===")
    status, body = _get(base_url + "?f=json")
    print(f"service HTTP {status}")
    if status == 200:
        try:
            d = json.loads(body)
            print(f"  serviceDescription: {d.get('serviceDescription')!r}")
            print(f"  description: {d.get('description')!r}")
            print(f"  copyrightText: {d.get('copyrightText')!r}")
        except Exception as e:
            print("  parse error:", e)

    layer_url = f"{base_url}/{layer_id}?f=json"
    lstatus, lbody = _get(layer_url)
    print(f"layer {layer_id} HTTP {lstatus}")
    if lstatus == 200:
        try:
            ld = json.loads(lbody)
            print(f"  layer description: {ld.get('description')!r}")
            print(f"  layer copyrightText: {ld.get('copyrightText')!r}")
        except Exception as e:
            print("  parse error:", e)

    count_url = f"{base_url}/{layer_id}/query?where=1=1&returnCountOnly=true&f=json"
    cstatus, cbody = _get(count_url)
    print(f"layer {layer_id} count query HTTP {cstatus}")
    if cstatus == 200:
        print(f"  {cbody.decode(errors='replace')}")

    return count_url


def distinct_values(label, base_url, layer_id, field):
    url = f"{base_url}/{layer_id}/query?where=1=1&outFields={field}&returnDistinctValues=true&f=json"
    status, body = _get(url)
    print(f"\n=== {label}: distinct {field} ===")
    print(f"HTTP {status}")
    if status == 200:
        try:
            d = json.loads(body)
            feats = d.get("features", [])
            vals = sorted({f.get("attributes", {}).get(field) for f in feats})
            print(f"  distinct {field} values ({len(vals)}): {vals}")
        except Exception as e:
            print("  parse error:", e, body[:500])


def main():
    fl = "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/Fiberlight_Network/FeatureServer"
    describe_service("TxDOT Fiberlight_Network", fl)
    distinct_values("TxDOT Fiberlight_Network", fl, 0, "Market")
    distinct_values("TxDOT Fiberlight_Network", fl, 0, "State")
    distinct_values("TxDOT Fiberlight_Network", fl, 0, "USED_FOR")

    scc = "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Statewide_Connectivity_Corridors/FeatureServer"
    describe_service("TxDOT_Statewide_Connectivity_Corridors", scc)

    # Arizona ADOT: round 1 only searched folder names for keywords, which
    # missed 'Utilities' (a plausible home for conduit/fiber data whose own
    # name doesn't contain the keyword).
    print("\n=== Arizona ADOT: Utilities folder (missed by round-1 keyword filter) ===")
    status, body = _get("https://gis.azdot.gov/gis/rest/services/Utilities?f=json")
    print(f"HTTP {status}")
    if status == 200:
        try:
            d = json.loads(body)
            print(f"  services: {[(s.get('name'), s.get('type')) for s in d.get('services', [])]}")
            print(f"  folders: {d.get('folders', [])}")
        except Exception as e:
            print("  parse error:", e, body[:800])
    else:
        print("  body:", body[:500])

    print("\n\n=== DONE ===")


if __name__ == "__main__":
    main()
