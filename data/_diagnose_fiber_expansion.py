"""data/_diagnose_fiber_expansion.py -- TEMP diagnostic script.

Live-probes a short list of candidate regional/state fiber-and-conduit GIS
sources found via web research, to decide which (if any) are real enough to
wire in as a new regional entry alongside the existing ca_middle_mile_corridor
(the first, and so far only, regional fiber-adjacent dataset in the repo).

Never trust a URL found via search alone -- this script actually hits each
one from a real GitHub Actions runner (this sandbox's own outbound network to
third-party hosts is blocked) and prints exactly what comes back: HTTP status,
JSON shape, field names, geometry type, and one real sample feature. Decisions
about what to wire in get made from this output, not from the search summaries
that suggested the URLs.

Candidates, in priority order (real DC-market relevance):
  1. Maryland OMBN (One Maryland Broadband Network) -- as-built inter-county
     fiber, previously probed twice (2026-08-09) and got HTTP 503 both times.
     Re-probing since a same-tier candidate should not be left unresolved.
  2. Arizona ADOT fiber/conduit along I-17/I-19/I-40W -- state-OWNED conduit +
     dark fiber assets (a stronger physical-infrastructure claim than a
     "planned corridor"), Phoenix being a top-5 US data center market.
     Service name not yet confirmed -- this script lists ADOT's whole GIS
     services directory and searches it for fiber/conduit/broadband matches.
  3. TxDOT Statewide Connectivity Corridors -- a real official TxDOT layer
     (used to determine Category 4 funding eligibility), but its service name
     is unconfirmed. This script lists the whole TxDOT hosted-services org
     and searches for a connectivity/corridor/fiber/broadband match.
  4. Memphis, TN municipal fiber lines inventory -- city-level, lower
     priority, but Memphis is a real and growing DC market.

Run:  python3 data/_diagnose_fiber_expansion.py
"""
import json
import sys
import urllib.request
import urllib.error

TIMEOUT = 25
KEYWORDS = ("fiber", "conduit", "broadband", "connectivity", "corridor", "telecom")


def _get(url, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (fiber-diagnostic)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            body = resp.read()
            return status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, str(e).encode()


def _print_json_summary(label, body, max_chars=1500):
    try:
        d = json.loads(body)
    except Exception:
        print(f"  [{label}] not JSON, first {max_chars} chars:")
        print("  " + body[:max_chars].decode(errors="replace"))
        return None
    print(f"  [{label}] JSON keys: {list(d.keys())[:20]}")
    return d


def probe_mapserver(label, base_url):
    print(f"\n=== {label} ===")
    print(f"URL: {base_url}?f=json")
    status, body = _get(base_url + "?f=json")
    print(f"HTTP {status}")
    if status != 200:
        print("  NOT REACHABLE / ERROR:", body[:500])
        return
    d = _print_json_summary("service", body)
    if not d:
        return
    layers = d.get("layers", [])
    print(f"  layers: {[(l.get('id'), l.get('name'), l.get('geometryType')) for l in layers][:20]}")
    if not layers:
        return
    # Probe the first layer's fields + one real sample feature.
    lid = layers[0]["id"]
    layer_url = f"{base_url}/{lid}?f=json"
    status2, body2 = _get(layer_url)
    print(f"  layer {lid} HTTP {status2}")
    if status2 == 200:
        ld = _print_json_summary(f"layer {lid}", body2)
        if ld:
            fields = [f.get("name") for f in ld.get("fields", [])]
            print(f"  layer {lid} geometryType: {ld.get('geometryType')}")
            print(f"  layer {lid} fields: {fields}")
    query_url = f"{base_url}/{lid}/query?where=1=1&outFields=*&resultRecordCount=2&f=json"
    status3, body3 = _get(query_url)
    print(f"  layer {lid} sample query HTTP {status3}")
    if status3 == 200:
        qd = _print_json_summary(f"layer {lid} sample", body3, max_chars=2000)
        if qd:
            feats = qd.get("features", [])
            print(f"  layer {lid} feature count returned: {len(feats)}")
            if feats:
                print(f"  layer {lid} sample attributes: {feats[0].get('attributes')}")
                geom = feats[0].get("geometry", {})
                geom_keys = list(geom.keys()) if isinstance(geom, dict) else None
                print(f"  layer {lid} sample geometry keys: {geom_keys}")


def probe_services_directory(label, services_root, want_keywords=KEYWORDS):
    print(f"\n=== {label}: service directory scan ===")
    print(f"URL: {services_root}?f=json")
    status, body = _get(services_root + "?f=json")
    print(f"HTTP {status}")
    if status != 200:
        print("  NOT REACHABLE / ERROR:", body[:500])
        return []
    d = _print_json_summary("directory", body)
    if not d:
        return []
    services = d.get("services", [])
    folders = d.get("folders", [])
    print(f"  top-level services: {[s.get('name') for s in services]}")
    print(f"  folders: {folders}")
    matches = []
    for s in services:
        name = (s.get("name") or "").lower()
        if any(k in name for k in want_keywords):
            matches.append(s)
    # Also descend one level into folders whose name suggests broadband/fiber.
    for folder in folders:
        if any(k in folder.lower() for k in want_keywords):
            sub_url = f"{services_root}/{folder}?f=json"
            sstatus, sbody = _get(sub_url)
            print(f"  descending into folder '{folder}' -> HTTP {sstatus}")
            if sstatus == 200:
                sd = _print_json_summary(f"folder {folder}", sbody)
                if sd:
                    for s in sd.get("services", []):
                        matches.append(s)
    print(f"  KEYWORD MATCHES: {[(m.get('name'), m.get('type')) for m in matches]}")
    return matches


def main():
    # 1. Maryland OMBN re-probe.
    probe_mapserver(
        "Maryland OMBN (re-probe, previously 503 x2 on 2026-08-09)",
        "https://geodata.md.gov/appdata/rest/services/OMBN/MD_OneMarylandBroadbandNetwork/MapServer",
    )

    # 2. Arizona ADOT -- full services directory scan for fiber/conduit/broadband.
    az_matches = probe_services_directory("Arizona ADOT GIS", "https://gis.azdot.gov/gis/rest/services")
    for m in az_matches:
        name = m.get("name")
        stype = m.get("type", "MapServer")
        probe_mapserver(f"Arizona ADOT candidate: {name}", f"https://gis.azdot.gov/gis/rest/services/{name}/{stype}")

    # Also check azgeo.az.gov (Arizona's broader state GIS clearinghouse) in
    # case ADOT's own directory doesn't surface it under an obvious name.
    azgeo_matches = probe_services_directory("Arizona AZGEO statewide GIS", "https://azgeo.az.gov/arcgis/rest/services")
    for m in azgeo_matches:
        name = m.get("name")
        stype = m.get("type", "MapServer")
        probe_mapserver(f"AZGEO candidate: {name}", f"https://azgeo.az.gov/arcgis/rest/services/{name}/{stype}")

    # 3. TxDOT hosted-feature-service org -- scan for connectivity/corridor/fiber.
    tx_matches = probe_services_directory(
        "TxDOT hosted org (services.arcgis.com/KTcxiTD9dsQw4r7Z)",
        "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services",
    )
    for m in tx_matches:
        name = m.get("name")
        stype = m.get("type", "FeatureServer")
        probe_mapserver(f"TxDOT candidate: {name}", f"https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/{name}/{stype}")

    # 4. Memphis TN municipal fiber lines inventory.
    probe_mapserver(
        "Memphis TN fiber lines inventory",
        "https://maps.memphistn.gov/mapping/rest/services/AGO_InformationServices/IS_Fiber_Lines_Inventory/FeatureServer",
    )

    print("\n\n=== DONE ===")


if __name__ == "__main__":
    main()
