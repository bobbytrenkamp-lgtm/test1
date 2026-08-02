#!/usr/bin/env python3
"""One-off diagnostic: find working replacement URLs for the HIFLD ArcGIS
endpoints fetch_infrastructure.py currently calls, which return
{"error": {"message": "Invalid URL"}} in production (confirmed via CI run
30723020119, 2026-07-31). This sandbox's outbound proxy blocks arcgis.com
entirely, so this can only be diagnosed from a real-internet environment —
run via `workflow_dispatch` on .github/workflows/update_infrastructure.yml
(temporarily invoking this instead of the real fetch) or directly in an
Actions job. Not part of the normal pipeline; delete once the real fix
lands in fetch_infrastructure.py.

Usage: python3 data/diagnose_hifld_endpoints.py
"""
import sys

import requests

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "USDataCenterPolicyTracker/1.0 (diagnostic; github.com/bobbytrenkamp-lgtm/test1)"})

# maps.nccs.nasa.gov dropped: "Network is unreachable" from the Actions
# runner itself (errno 101), not a sandbox proxy artifact — genuinely dead
# from here, so not worth re-probing.
CANDIDATES = {
    "substations": [
        "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/HIFLD_electric_power_substations/FeatureServer/0/query",
    ],
    "transmission": [
        "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query",
    ],
}

# Also probe the bare FeatureServer root (not /query) to enumerate real layer
# ids/names when a guess above is wrong but the service itself is alive.
ROOTS_TO_ENUMERATE = [
    "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/HIFLD_electric_power_substations/FeatureServer",
]

# The original org (Hp6G80Pky0om7QvQ) is still alive — its transmission-lines
# service resolved with a real ArcGIS error ("Invalid query parameters", not
# "Invalid URL"), unlike substations/power_plants which say "Invalid URL".
# List everything currently published under it to find the real names.
ORG_SERVICE_LISTS = [
    "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services",
    "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services",
]


def probe_query(url, where="1=1"):
    try:
        r = SESSION.get(url, params={
            "where": where, "outFields": "*", "returnGeometry": "false",
            "resultRecordCount": 3, "f": "json",
        }, timeout=30)
        status = r.status_code
        try:
            data = r.json()
        except Exception:
            return status, f"non-JSON body ({len(r.content)} bytes)", None
        if "error" in data:
            return status, f"ArcGIS error: {data['error'].get('message', data['error'])}", None
        feats = data.get("features", [])
        fields = list(feats[0]["attributes"].keys()) if feats else []
        return status, f"OK — {len(feats)} sample feature(s)", fields
    except Exception as exc:
        return None, f"request failed: {exc}", None


def list_services(root_url):
    try:
        r = SESSION.get(root_url, params={"f": "json"}, timeout=30)
        data = r.json()
        if "error" in data:
            return f"ArcGIS error: {data['error'].get('message', data['error'])}"
        services = data.get("services", [])
        return "; ".join(f"{s.get('name')} ({s.get('type')})" for s in services) or "(no services listed)"
    except Exception as exc:
        return f"request failed: {exc}"


def probe_root(url):
    try:
        r = SESSION.get(url, params={"f": "json"}, timeout=30)
        data = r.json()
        if "error" in data:
            return f"ArcGIS error: {data['error'].get('message', data['error'])}"
        layers = data.get("layers", [])
        return "; ".join(f"{l.get('id')}={l.get('name')}" for l in layers) or "(no layers listed)"
    except Exception as exc:
        return f"request failed: {exc}"


def search_dcat_catalog(catalog_url, keywords):
    """DCAT catalogs are machine-readable government-data feeds (built for
    data.gov harvesting), so they may not hit the same bot-blocking as the
    Hub's human-facing pages. Each dataset lists its real distribution
    (download/service) URLs — search titles for our keywords."""
    try:
        r = SESSION.get(catalog_url, timeout=30)
        data = r.json()
    except Exception as exc:
        return [f"request/parse failed: {exc}"]
    datasets = data.get("dataset", [])
    hits = []
    for kw in keywords:
        for ds in datasets:
            title = (ds.get("title") or "")
            if kw.lower() not in title.lower():
                continue
            urls = [d.get("accessURL") or d.get("downloadURL")
                    for d in ds.get("distribution", []) if d.get("accessURL") or d.get("downloadURL")]
            hits.append(f"{title!r}: {urls}")
    return hits or [f"({len(datasets)} datasets in catalog, none matched {keywords})"]


DCAT_CATALOGS = {
    "https://hifld-geoplatform.hub.arcgis.com/api/feed/dcat-us/1.1.json": ["power plant"],
    "https://www.epa.gov/waterdata/catalog/rest/dcat-us/1.1.json": ["water stress", "watershed", "EnviroAtlas"],
}


def main():
    for label, urls in CANDIDATES.items():
        print(f"\n=== {label} ===")
        for url in urls:
            status, msg, fields = probe_query(url)
            print(f"  [{status}] {url}\n      {msg}")
            if fields:
                print(f"      fields: {fields}")

    print("\n=== layer enumeration (root FeatureServer, no /N) ===")
    for url in ROOTS_TO_ENUMERATE:
        print(f"  {url}")
        print(f"      {probe_root(url)}")

    print("\n=== org service listing (what's actually published now) ===")
    for url in ORG_SERVICE_LISTS:
        print(f"  {url}")
        print(f"      {list_services(url)}")

    print("\n=== DCAT catalog search (power plants, EPA water) ===")
    for url, keywords in DCAT_CATALOGS.items():
        print(f"  {url}  keywords={keywords}")
        for hit in search_dcat_catalog(url, keywords):
            print(f"      {hit}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
