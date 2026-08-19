#!/usr/bin/env python3
"""TEMPORARY diagnostic script -- Priority B live probe.

Probes the one SOURCE_DOWN parcel service (Jefferson County KY / LOJIC) and
the 17 persistently-down/transient policy sources flagged in
data/data_health.json, using the shared classifier in
data/lib/endpoint_diagnostics.py, and prints a full JSON report. Meant to
run once from a GitHub Actions runner (real network access this sandbox
doesn't have), have its output inspected by hand, then be deleted --
matches this repo's established "temp diagnostic script + workflow_dispatch,
findings hand-transcribed, script deleted after" pattern for live
verification work.
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "data"))
from lib.endpoint_diagnostics import (   # noqa: E402
    check_url, classify_down_reason, wayback, find_replacement_candidate,
)

TIMEOUT = 20

PARCEL_TARGETS = {
    "21111": {
        "name": "Jefferson County, KY (LOJIC)",
        "url": "https://gis.lojic.org/maps/rest/services/LojicSolutions/OpenDataPVA/MapServer/1?f=json",
        "kind": "arcgis_layer",
    },
}

POLICY_TARGETS = {
    "az-water-resources": "https://www.azwater.gov/assured-and-adequate-water-supply",
    "ca-santaclara-oes": "https://sustainability.santaclaracounty.gov/climate-change/climate-action-planning",
    "ct-legislature": "https://www.cga.ct.gov/",
    "ferc-order-2023": "https://www.ferc.gov/explainer-interconnection-final-rule",
    "mi-legislature": "https://legislature.michigan.gov/Home",
    "mi-mpsc": "https://www.michigan.gov/mpsc",
    "nc-chatham-commissioners": "https://www.chathamcountync.gov/government/board-of-commissioners",
    "ny-climate-clcpa": "https://www.nysenate.gov/legislation/bills/2019/S6599",
    "ny-local-law-97": "https://www.nyc.gov/site/buildings/codes/local-law-97.page",
    "ny-nyc-mocej": "https://www.nyc.gov/site/mocej/index.page",
    "ny-senate": "https://www.nysenate.gov/",
    "oh-legislature": "https://www.legislature.ohio.gov/",
    "ri-smithfield-council": "https://www.smithfieldri.gov/government/government-officials",
    "nc-orange-commissioners": "https://www.orangecountync.gov/953/Board-of-County-Commissioners-BOCC",
    "nc-rowan-commissioners": "https://www.rowancountync.gov/511/Board-of-Commissioners",
    "tn-washington-commission": "https://www.washingtoncountytn.org/208/County-Commission",
    "wa-douglas-pud": "https://douglaspud.org/",
}


def fetch_body_snippet(url, timeout):
    """Small GET for access-blocked marker detection; never fatal."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read(4000).decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return None


def probe_generic(url):
    res = check_url(url, TIMEOUT)
    body = None
    if not res["ok"]:
        body = fetch_body_snippet(url, TIMEOUT)
    suggestion = None
    archive = None
    if not res["ok"]:
        suggestion = find_replacement_candidate(url, TIMEOUT)
        archive = wayback(url, TIMEOUT)
    down_reason = None if res["ok"] else classify_down_reason(
        status=res["status"], error=res["error"], final_url=res["final_url"],
        original_url=url, consecutive_failures=3, body_snippet=body,
        has_replacement_candidate=bool(suggestion or archive),
    )
    return {
        "url": url, "ok": res["ok"], "status": res["status"], "error": res["error"],
        "final_url": res["final_url"], "down_reason": down_reason,
        "suggested_replacement": suggestion, "archive": archive,
        "body_snippet": (body[:300] if body else None),
    }


def probe_arcgis(url):
    """Direct f=json probe -- report the raw JSON envelope, not just
    reachability, since an ArcGIS 'moved' service often still returns 200
    with an {"error":...} body."""
    res = check_url(url, TIMEOUT)
    body_json = None
    if res["ok"]:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                body_json = json.loads(resp.read().decode("utf-8", "replace"))
        except Exception as e:  # noqa: BLE001
            body_json = {"_parse_error": str(e)}
    result = probe_generic(url)
    result["arcgis_body"] = body_json
    return result


def main():
    report = {"parcel": {}, "policy": {}}
    for fips, t in PARCEL_TARGETS.items():
        print(f"probing parcel {fips} ({t['name']}) ...", file=sys.stderr)
        report["parcel"][fips] = {"name": t["name"], **probe_arcgis(t["url"])}

    for source_id, url in POLICY_TARGETS.items():
        print(f"probing policy source {source_id} ...", file=sys.stderr)
        report["policy"][source_id] = probe_generic(url)

    print(json.dumps(report, indent=2))
    Path("priority_b_report.json").write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
