#!/usr/bin/env python3
"""Correct county records that contradict verified policy findings, and add
missing counties with documented moratoriums.

WHY THIS EXISTS
An audit of level -1 ("Pro-Development Hub") records found the platform was
actively asserting the opposite of the truth for a cluster of Kansas counties.
Harvey County KS was labelled a Pro-Development Hub with a description about its
BNSF railyard and Mennonite college, while the county commission had in fact
adopted a moratorium on data center construction running through the end of
2028. Five of the six Kansas counties known to have moratoriums were labelled
level -1; a sixth was missing entirely.

That is the worst failure mode for this platform — confidently wrong in the
favourable direction, on the exact question a user comes here to answer.

SOURCING HONESTY — READ THIS BEFORE TRUSTING pipeline_verified
Every fact below was located through web search, which returned real source
URLs including county government pages. However, direct fetching of those pages
failed: county CMS platforms and the aggregator trackers all returned HTTP 403
to an automated fetch (bot protection, not a paywall). Loudoun, Santa Fe,
Harvey County and datacenterbans.com were each tried and each refused.

Therefore, for every record here:
  - `pipeline_verified` is False. The primary source was NOT read by this script.
  - `confidence` is "medium", never "high".
  - `source_tier` reflects the DOMAIN of the cited URL (1 for .gov), not the
    strength of our verification.
  - `notes` states explicitly that the county's own page was identified but
    could not be retrieved for direct confirmation.

A human with an ordinary browser should open each cited government URL and
confirm the terms before any of these records is treated as Tier 1 verified.
The point of recording it this way is that the dataset never overstates what
was actually checked.

LEVEL ASSIGNMENT
Per docs/TERMINOLOGY.md, `ban` (level 4) is "an active ordinance prohibiting new
data center construction". A moratorium prohibits new construction for a defined
period, so an adopted moratorium is level 4 while it is in force. Counties merely
*debating* a moratorium are NOT included — proposed measures would be level 1
("Proposed Restrictions") and none are added here without an adoption vote.

Usage:
    python3 data/sweep_2026_07_27_moratorium_corrections.py [--dry-run]
Then regenerate the map data:
    python3 data/process_data.py
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
RAW = ROOT / "data" / "restrictions_raw.json"

REVIEW_DATE = "2026-07-27"

# Common provenance caveat attached to every record this sweep touches.
FETCH_CAVEAT = (
    "Located via web search on 2026-07-27; the county's own page was identified "
    "but returned HTTP 403 to automated retrieval, so its text was not read "
    "directly by the pipeline. Facts here come from the search result summary "
    "and corroborating local news coverage. A human should open the cited "
    "government URL to confirm the exact terms before treating this as Tier 1 "
    "verified."
)

# ── Records ─────────────────────────────────────────────────────────────────
# Each entry: the county, the adopted action, and the sources found.
# 'replace' = the county already exists with a contradicting level.
# 'add'     = the county is absent from the dataset entirely.

RECORDS = [
    {
        "_action": "replace",
        "_was_level": -1,
        "fips": "20079",
        "name": "Harvey County",
        "state": "Kansas",
        "level": 4,
        "types": ["data_center", "water"],
        "title": "Harvey County KS — Data Center Moratorium Through End of 2028",
        "description": (
            "The Harvey County Commission adopted a resolution placing a moratorium on "
            "construction of data centers in the unincorporated areas of the county, in "
            "force through the end of 2028. The commission passed the resolution "
            "unanimously at its January 13, 2026 meeting. No data center application had "
            "been submitted at the time of adoption; the county stated the moratorium gives "
            "the planning department and zoning board time to research and draft data "
            "center regulations. Water use was a stated driver — part of the Equus Beds "
            "Aquifer, a primary groundwater source for south-central Kansas, lies within "
            "Harvey County, and commissioners cited hyperscale facilities' potential "
            "consumption of over a million gallons per day."
        ),
        "effective_date": "2026-01-13",
        "status": "active",
        "notes": "Moratorium runs through the end of 2028. " + FETCH_CAVEAT,
        "sources": [
            {"label": "Harvey County, KS — Commission implements moratorium on data center developments",
             "url": "https://www.harveycounty.gov/commission-implements-moratorium-on-data-center-developments"},
            {"label": "KWCH: Harvey County Commission places moratorium on data center construction",
             "url": "https://www.kwch.com/2026/01/13/harvey-county-commission-places-moratorium-data-center-construction/"},
            {"label": "KSN: Harvey County, Kansas, halts data center developments for now",
             "url": "https://www.ksn.com/news/local/harvey-county-bans-data-centers-for-now/"},
        ],
        "source_tier": 1,      # harveycounty.gov is a government domain
        "confidence": "medium",
        "confidence_score": 60,
    },
    {
        "_action": "replace",
        "_was_level": -1,
        "fips": "20061",
        "name": "Geary County",
        "state": "Kansas",
        "level": 4,
        "types": ["data_center"],
        "title": "Geary County KS — One-Year Data Center Moratorium",
        "description": (
            "Geary County commissioners approved a one-year moratorium on data center "
            "development. The measure is part of a cluster of 2026 Kansas county "
            "moratoriums adopted while local governments draft siting regulations for "
            "large-load facilities."
        ),
        "effective_date": None,
        "status": "active",
        "notes": ("Duration reported as one year; the exact adoption date and expiry were "
                  "not established from available sources. " + FETCH_CAVEAT),
        "sources": [
            {"label": "KSNT: Geary County approves moratorium on data center development",
             "url": "https://www.ksnt.com/news/local-news/geary-co-approves-moratorium-on-data-center-development/"},
        ],
        "source_tier": 3,      # local news only; no government URL located
        "confidence": "low",
        "confidence_score": 40,
    },
    {
        "_action": "replace",
        "_was_level": -1,
        "fips": "20103",
        "name": "Leavenworth County",
        "state": "Kansas",
        "level": 4,
        "types": ["data_center"],
        "title": "Leavenworth County KS — 90-Day Data Center Moratorium",
        "description": (
            "Leavenworth County commissioners voted to impose a 90-day moratorium on data "
            "center development, pausing new applications while the county considers "
            "regulations."
        ),
        "effective_date": None,
        "status": "active",
        "notes": ("90-day duration reported; adoption date not established, and a short "
                  "moratorium may already have expired or been extended — this record needs "
                  "re-checking before use. " + FETCH_CAVEAT),
        "sources": [
            {"label": "KSHB: Leavenworth County commissioners pass 90-day moratorium on data centers",
             "url": "https://www.kshb.com/news/local-news/kansas/leavenworth-county/leavenworth-county-commissioners-pass-90-day-moratorium-on-data-centers"},
        ],
        "source_tier": 3,
        "confidence": "low",
        "confidence_score": 35,
    },
    {
        "_action": "replace",
        "_was_level": -1,
        "fips": "20169",
        "name": "Saline County",
        "state": "Kansas",
        "level": 4,
        "types": ["data_center", "energy"],
        "title": "Saline County KS — Moratorium on Data Centers, Nuclear and Hydrogen Facilities",
        "description": (
            "Saline County voted to place a moratorium on construction of data centers, "
            "nuclear power facilities and hydrogen-based energy facilities in the "
            "unincorporated areas of the county. The scope covering several categories of "
            "large-load energy infrastructure alongside data centers distinguishes it from "
            "the data-center-only moratoriums adopted elsewhere in Kansas."
        ),
        "effective_date": None,
        "status": "active",
        "notes": ("Scope covers data centers plus nuclear and hydrogen energy facilities. "
                  "Adoption date and duration not established. " + FETCH_CAVEAT),
        "sources": [
            {"label": "KSN: Kansas county puts moratorium on data centers and nuclear, hydrogen plants",
             "url": "https://www.ksn.com/news/kansas-county-puts-moratorium-on-data-centers-and-nuclear-hydrogen-plants/"},
        ],
        "source_tier": 3,
        "confidence": "low",
        "confidence_score": 40,
    },
    {
        "_action": "replace",
        "_was_level": -1,
        "fips": "20173",
        "name": "Sedgwick County",
        "state": "Kansas",
        "level": 4,
        "types": ["data_center"],
        "title": "Sedgwick County KS — Data Center Moratorium, Extended May 2026",
        "description": (
            "The Sedgwick County Commission extended its moratorium on data center "
            "development applications by a further 90 days on May 6, 2026, continuing a "
            "pause on new applications while the county works on regulations. Sedgwick "
            "County contains Wichita, the largest city in Kansas."
        ),
        "effective_date": "2026-05-06",
        "status": "active",
        "notes": ("Date shown is the May 6, 2026 extension, not the original adoption. "
                  "A 90-day extension from that date implies expiry around August 2026, so "
                  "this record requires re-checking for a further extension or lapse. "
                  + FETCH_CAVEAT),
        "sources": [
            {"label": "KWCH: Sedgwick County Commission extends moratorium on data centers for 90 more days",
             "url": "https://www.kwch.com/2026/05/06/sedgwick-county-commission-extends-moratorium-data-centers-90-more-days/"},
        ],
        "source_tier": 3,
        "confidence": "low",
        "confidence_score": 40,
    },
    {
        "_action": "add",
        "fips": "20111",
        "name": "Lyon County",
        "state": "Kansas",
        "level": 4,
        "types": ["data_center"],
        "title": "Lyon County KS — Six-Month Data Center Moratorium",
        "description": (
            "Lyon County commissioners approved a six-month moratorium on data centers. "
            "Lyon County was absent from this platform's dataset entirely before this "
            "record was added."
        ),
        "effective_date": None,
        "status": "active",
        "notes": ("Six-month duration reported; adoption date not established, so expiry is "
                  "unknown and this record needs re-checking. " + FETCH_CAVEAT),
        "sources": [
            {"label": "KSNT: Moratorium on data centers approved by Lyon County commissioners",
             "url": "https://www.ksnt.com/news/local-news/moratorium-on-data-centers-approved-by-lyon-county-commissioners/"},
        ],
        "source_tier": 3,
        "confidence": "low",
        "confidence_score": 35,
    },
    {
        "_action": "add",
        "fips": "06025",
        "name": "Imperial County",
        "state": "California",
        "level": 4,
        "types": ["data_center"],
        "title": "Imperial County CA — One-Year Data Center Moratorium",
        "description": (
            "The Imperial County Board of Supervisors unanimously approved a moratorium "
            "barring new data center construction for one year, to allow an advisory board "
            "time to develop rules for future development. Imperial County was absent from "
            "this platform's dataset entirely before this record was added."
        ),
        "effective_date": None,
        "status": "active",
        "notes": ("One-year duration reported, adopted unanimously; the exact adoption date "
                  "was not established. " + FETCH_CAVEAT),
        "sources": [
            {"label": "inewsource: Imperial County's data center moratorium will last one year",
             "url": "https://inewsource.org/2026/07/14/data-center-moratorium-imperial-county/"},
        ],
        "source_tier": 3,
        "confidence": "low",
        "confidence_score": 40,
    },
    {
        "_action": "replace",
        "_was_level": 3,
        "fips": "35049",
        "name": "Santa Fe County",
        "state": "New Mexico",
        "level": 4,
        "types": ["data_center"],
        "title": "Santa Fe County NM — 18-Month Data Center Moratorium (1 MW Threshold)",
        "description": (
            "The Santa Fe County Board of County Commissioners voted unanimously to adopt "
            "an 18-month moratorium on data center development. The pause was extended from "
            "the 12 months originally proposed to 18 months, and the regulatory threshold "
            "was lowered from 100 megawatts to one megawatt — meaning the moratorium reaches "
            "far smaller facilities than a typical hyperscale-focused measure."
        ),
        "effective_date": None,
        "status": "active",
        "notes": ("Previously recorded at level 3; upgraded to level 4 because an adopted "
                  "moratorium prohibits new construction. The 1 MW threshold is unusually "
                  "low and materially broadens scope. Adoption date not established. "
                  + FETCH_CAVEAT),
        "sources": [
            {"label": "Santa Fe County — Board approves 18-month moratorium on data centers",
             "url": "https://www.santafecountynm.gov/news/detail/santa-fe-county-approves-18-month-moratorium-on-data-centers"},
        ],
        "source_tier": 1,      # santafecountynm.gov is a government domain
        "confidence": "medium",
        "confidence_score": 55,
    },
    {
        "_action": "replace",
        "_was_level": 3,
        "fips": "19113",
        "name": "Linn County",
        "state": "Iowa",
        "level": 4,
        "types": ["data_center"],
        "title": "Linn County IA — Data Center Ordinance (Feb 2026) and Subsequent Moratorium",
        "description": (
            "The Linn County Board of Supervisors approved a data center ordinance on "
            "February 18, 2026, following its third and final consideration. Subsequently, "
            "after roughly three hours of public comment and discussion, the board passed a "
            "moratorium on data centers by a 2–1 vote — adopting a pause despite already "
            "having an ordinance in place."
        ),
        "effective_date": "2026-02-18",
        "status": "active",
        "notes": ("Two distinct actions: an ordinance adopted February 18, 2026, and a later "
                  "moratorium passed 2–1. The moratorium's date and duration were not "
                  "established. Level 4 reflects the moratorium. " + FETCH_CAVEAT),
        "sources": [
            {"label": "Linn County, IA — Data Centers in Unincorporated Linn County",
             "url": "https://www.linncountyiowa.gov/1862/Data-Centers-in-Unincorporated-Linn-Coun"},
            {"label": "KCRG: Despite putting ordinance in place, Linn County passes data center moratorium",
             "url": "https://www.kcrg.com/2026/07/01/despite-putting-ordinance-place-linn-county-passes-data-center-moratorium/"},
        ],
        "source_tier": 1,      # linncountyiowa.gov is a government domain
        "confidence": "medium",
        "confidence_score": 60,
    },
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = json.loads(RAW.read_text())
    rows = data["restrictions"]
    by_fips = {r.get("fips"): i for i, r in enumerate(rows)}

    replaced, added, skipped = [], [], []

    for rec in RECORDS:
        action = rec.pop("_action")
        was = rec.pop("_was_level", None)
        fips = rec["fips"]

        rec["lifecycle_stage"] = "effective"
        # NEVER True from this script — the primary source was not read. See the
        # module docstring.
        rec["pipeline_verified"] = False
        rec["last_reviewed"] = REVIEW_DATE

        if fips in by_fips:
            existing = rows[by_fips[fips]]
            cur = existing.get("level")
            if action == "add":
                skipped.append(f"{fips} {rec['name']}: expected missing but present at level {cur}")
                continue
            if was is not None and cur != was:
                # The dataset moved since this sweep was written. Do not silently
                # overwrite someone else's more recent research.
                skipped.append(f"{fips} {rec['name']}: expected level {was}, found {cur} — "
                               f"NOT overwriting, needs manual review")
                continue
            rows[by_fips[fips]] = rec
            replaced.append(f"{fips} {rec['name']}, {rec['state']}: level {cur} -> {rec['level']}")
        else:
            if action == "replace":
                skipped.append(f"{fips} {rec['name']}: expected present but missing")
                continue
            rows.append(rec)
            added.append(f"{fips} {rec['name']}, {rec['state']}: new at level {rec['level']}")

    print(f"corrected (contradicted label fixed): {len(replaced)}")
    for line in replaced:
        print(f"  {line}")
    print(f"\nadded (was missing entirely): {len(added)}")
    for line in added:
        print(f"  {line}")
    if skipped:
        print(f"\nSKIPPED (data changed — needs manual review): {len(skipped)}")
        for line in skipped:
            print(f"  {line}")

    if args.dry_run:
        print("\n--dry-run: nothing written")
        return 0

    meta = data.setdefault("meta", {})
    meta["last_updated"] = REVIEW_DATE
    RAW.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"\nwrote {RAW.relative_to(ROOT)} ({len(rows)} records)")
    print("Now run: python3 data/process_data.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
