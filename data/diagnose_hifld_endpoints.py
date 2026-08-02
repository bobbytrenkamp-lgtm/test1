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
import json
import sys

import requests

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "USDataCenterPolicyTracker/1.0 (diagnostic; github.com/bobbytrenkamp-lgtm/test1)"})

CANDIDATES = {
    "substations": [
        "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Substations/FeatureServer/0/query",
        "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/HIFLD_electric_power_substations/FeatureServer/0/query",
        "https://services5.arcgis.com/caWDr9qv9f34KIAZ/arcgis/rest/services/ElectricSubstations/FeatureServer/0/query",
        "https://maps.nccs.nasa.gov/mapping/rest/services/hifld_open/energy/FeatureServer/0/query",
    ],
    "transmission": [
        "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query",
        "https://maps.nccs.nasa.gov/mapping/rest/services/hifld_open/energy/FeatureServer/1/query",
        "https://maps.nccs.nasa.gov/mapping/rest/services/hifld_open/energy/FeatureServer/2/query",
    ],
    "power_plants": [
        "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Power_Plants/FeatureServer/0/query",
        "https://maps.nccs.nasa.gov/mapping/rest/services/hifld_open/energy/FeatureServer/3/query",
        "https://maps.nccs.nasa.gov/mapping/rest/services/hifld_open/energy/FeatureServer/4/query",
    ],
    "epa_water": [
        "https://enviroatlas.epa.gov/arcgis/rest/services/Supplemental/USACensus2010/MapServer/6/query",
    ],
}

# Also probe the bare FeatureServer root (not /query) to enumerate real layer
# ids/names when a guess above is wrong but the service itself is alive.
ROOTS_TO_ENUMERATE = [
    "https://maps.nccs.nasa.gov/mapping/rest/services/hifld_open/energy/FeatureServer",
    "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/HIFLD_electric_power_substations/FeatureServer",
]


def probe_query(url):
    try:
        r = SESSION.get(url, params={
            "where": "STATE = 'VA'", "outFields": "*", "returnGeometry": "false",
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

    return 0


if __name__ == "__main__":
    sys.exit(main())
