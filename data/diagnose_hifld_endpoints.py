#!/usr/bin/env python3
"""One-off diagnostic: find working replacement URLs for the HIFLD ArcGIS
endpoints fetch_infrastructure.py currently calls, which return
{"error": {"message": "Invalid URL"}} in production (confirmed via CI run
30723020119, 2026-07-31). This sandbox's outbound proxy blocks arcgis.com
entirely, so this can only be diagnosed from a real-internet environment —
run via `workflow_dispatch` on .github/workflows/_diagnose_hifld.yml on a
GitHub Actions runner. Not part of the normal pipeline; delete once the
real fix lands in fetch_infrastructure.py.

Prior rounds (see PRs #208-#210) established:
  - substations: dead at the original org, but a real mirror exists at
    services.arcgis.com/G4S1dGvn7PIgYd6Y/.../HIFLD_electric_power_substations
    — schema differs from the original (MAX_VOLT/MIN_VOLT instead of a
    combined VOLTAGE string; COUNTYFIPS instead of COUNTY_FIPS).
  - transmission: the URL was never the problem — the real code's WHERE
    clause references COUNTRY, a column that plain doesn't exist on this
    layer's schema (confirmed via `fields:` on a 1=1 query).
  - Power_Plants / EPA water stress: no live replacement found after
    searching both HIFLD orgs' service listings and two DCAT catalog
    guesses. Not guessing a URL without verification (see the Maryland
    parcel decision in BUG_TRACKER.md for why).

This final round verifies the exact WHERE clauses the real code needs to
use, since the real code's existing clauses were never checked against
these services' actual data (STATUS values, etc.).

Usage: python3 data/diagnose_hifld_endpoints.py
"""
import sys

import requests

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "USDataCenterPolicyTracker/1.0 (diagnostic; github.com/bobbytrenkamp-lgtm/test1)"})

SUBSTATIONS_URL = "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/HIFLD_electric_power_substations/FeatureServer/0/query"
TRANSMISSION_URL = "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query"


def probe(label, url, where, out_fields):
    try:
        r = SESSION.get(url, params={
            "where": where, "outFields": out_fields, "returnGeometry": "false",
            "resultRecordCount": 5, "f": "json",
        }, timeout=30)
        data = r.json()
    except Exception as exc:
        print(f"  [{label}] request failed: {exc}")
        return
    if "error" in data:
        err = data["error"]
        print(f"  [{label}] ArcGIS error: {err.get('message', err)}")
        return
    feats = data.get("features", [])
    print(f"  [{label}] OK — {len(feats)} feature(s) for WHERE {where!r}")
    for f in feats[:3]:
        print(f"      {f.get('attributes')}")


def main():
    print("=== substations: real WHERE clause against the new service ===")
    probe("substations", SUBSTATIONS_URL,
          "STATUS = 'IN SERVICE' AND COUNTRY = 'US' AND LONGITUDE IS NOT NULL AND LATITUDE IS NOT NULL",
          "ID,NAME,TYPE,MAX_VOLT,MIN_VOLT,COUNTY,STATE,COUNTYFIPS,LONGITUDE,LATITUDE,STATUS,COUNTRY")

    print("\n=== substations: STATUS value distribution (unfiltered sample) ===")
    probe("substations-status-sample", SUBSTATIONS_URL, "1=1", "STATUS,COUNTRY")

    print("\n=== transmission: COUNTRY removed from WHERE clause ===")
    probe("transmission", TRANSMISSION_URL,
          "STATUS = 'IN SERVICE'",
          "ID,OWNER,VOLTAGE,TYPE,SUB_1,SUB_2,STATUS")

    print("\n=== transmission: STATUS value distribution (unfiltered sample) ===")
    probe("transmission-status-sample", TRANSMISSION_URL, "1=1", "STATUS")

    return 0


if __name__ == "__main__":
    sys.exit(main())
