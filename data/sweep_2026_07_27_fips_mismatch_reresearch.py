#!/usr/bin/env python3
"""Re-research the 16 counties whose FIPS previously carried another county's
name and description.

WHY THIS EXISTS
An earlier fix (data/sweep_2026_07_20e.py and its predecessors) added county
records keyed by FIPS but typed the wrong county name into some of them — the
title and description described one county while the `fips` field pointed at
a different one entirely. FIPS 21117 is Kenton County, KY; the record at that
key was titled "Knott County KY" and described Knott County's coal heritage
and ARC distressed designation. The map coloured the correct polygon (Kenton)
while every text surface on the platform named the wrong place.

A prior pass (data/sweep_2026_07_27_moratorium_corrections.py's sibling
correction) already fixed the `name` field on all 16 records and flagged each
with a `[DATA CORRECTION 2026-07-27]` note explaining that the title and
description still describe the wrong county. This script closes that out: it
searches for the ACTUAL county at each FIPS and replaces the mismatched
title/description with honest, correctly-attributed content.

WHAT THE RESEARCH FOUND
Of the 16, only one — Dorchester County, MD — turned up county-specific,
sourced activity (the county council is deciding whether to draft a
moratorium; nothing has been formally proposed). The other 15 are small or
rural counties with no confirmed county-level data center policy findable via
web search as of this review. That is a real result, not a failure to search
hard enough: most US counties simply have no data center policy activity.

These are recorded as level 0 ("No Known Restrictions") WITHOUT the
research_status=descriptive_only flag used elsewhere on this platform for
generic, non-research content — because unlike those 597 records, each of
these 16 WAS individually searched for data-center-specific activity by
county name. A negative result from real research is different from no
research having happened, and counties_researched in
refresh_platform_metadata.py counts exactly this way: it excludes
descriptive_only, not level-0.

SOURCING HONESTY
No primary county-government page was fetched for any of these 16 —
WebFetch returns 403 from county CMS platforms in this environment. Findings
come from WebSearch result summaries only. pipeline_verified is False and
confidence is "low" on every record here. Two Kentucky counties (Laurel,
LaRue) turned up passing mentions in statewide coverage that fall short of a
confirmed local policy; those mentions are noted but NOT treated as findings.

Usage:
    python3 data/sweep_2026_07_27_fips_mismatch_reresearch.py [--dry-run]
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

NO_FINDING_CAVEAT = (
    "Reviewed via web search on 2026-07-27 specifically for this county's name "
    "plus \"data center\". No confirmed county-level data center policy, "
    "ordinance, or moratorium was found as of that date. This is a negative "
    "search result, not confirmation that no local activity exists — smaller "
    "counties often have no searchable local news coverage even when a zoning "
    "or commission action has occurred. No primary county-government source "
    "was fetched (automated retrieval is blocked by bot protection on most "
    "county CMS platforms in this environment)."
)

# ── Records ─────────────────────────────────────────────────────────────────
# Every entry replaces a record whose title/description described a
# different county than the one its `fips` actually points to.

RECORDS = [
    {
        "fips": "21117", "name": "Kenton County", "state": "Kentucky",
        "title": "Kenton County, KY — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Kenton County (Covington/Independence area, northern Kentucky) has a general "
            "zoning ordinance administered by Planning and Development Services of Kenton "
            "County, covering standard, residential, commercial, employment and special "
            "districts. Kentucky has statewide momentum on this issue — the Kentucky "
            "Resources Council published a model data center zoning ordinance in response to "
            "growing local concern, and several Kentucky counties and cities have adopted "
            "data center-specific rules — but no data center-specific ordinance, moratorium, "
            "or proposal for Kenton County itself was found."
        ),
        "sources": [
            {"label": "Planning and Development Services of Kenton County — Zoning Services",
             "url": "https://www.pdskc.org/services/community-planning/zoning-services/"},
            {"label": "Kentucky Resources Council — Model Data Center Zoning Ordinance",
             "url": "https://kyrc.org/krc-releases-data-center-model-guidance/"},
        ],
        "source_tier": 2,
    },
    {
        "fips": "37099", "name": "Jackson County", "state": "North Carolina",
        "title": "Jackson County, NC — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "North Carolina has seen more than 30 localities enact temporary data center "
            "moratoriums since late 2025, clustered in the western mountain region, the "
            "Triangle corridor, and the Charlotte metro. Jackson County sits in the western "
            "mountain cluster geographically, but no county-specific moratorium, ordinance, "
            "or proposal for Jackson County was found in that coverage."
        ),
        "sources": [
            {"label": "Carolina Public Press — Data center moratorium fever for NC local governments",
             "url": "https://carolinapublicpress.org/75853/data-centers-moratorium-fever-for-nc-local-governments/"},
        ],
        "source_tier": 3,
    },
    {
        "fips": "37187", "name": "Washington County", "state": "North Carolina",
        "title": "Washington County, NC — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "More than 30 North Carolina counties and cities have enacted data center "
            "moratoriums, and the state legislature has bills pending to regulate the "
            "industry. No moratorium, ordinance, or proposal specific to Washington County "
            "was found in state or regional coverage."
        ),
        "sources": [
            {"label": "CBS 17 — North Carolina communities weigh benefits, concerns of data center growth",
             "url": "https://www.cbs17.com/news/north-carolina-news/north-carolina-communities-weigh-benefits-concerns-of-data-center-growth/"},
        ],
        "source_tier": 3,
    },
    {
        "fips": "28095", "name": "Monroe County", "state": "Mississippi",
        "title": "Monroe County, MS — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Mississippi offers a state sales-tax exemption for certified data centers "
            "(minimum $50M investment, 50 jobs) and larger income/franchise/property tax "
            "relief under the Major Economic Impact Act. Some Mississippi cities (Clinton, "
            "Madison, Clarksdale) have updated local zoning to address data centers "
            "specifically. No county-specific zoning action or incentive filing for Monroe "
            "County was found; a separate news item referencing a \"Monroe County tax "
            "incentive application\" concerned a trade/storage business, not a data center."
        ),
        "sources": [],
        "source_tier": 3,
    },
    {
        "fips": "28155", "name": "Webster County", "state": "Mississippi",
        "title": "Webster County, MS — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "No county-specific data center policy was found for Webster County, "
            "Mississippi. Note for future research: nearly all search results for \"Webster "
            "County data center\" return Webster County, MISSOURI (which adopted a six-month "
            "moratorium covering data centers, solar, wind and battery storage in 2026) — a "
            "different county in a different state that happens to share this name. That "
            "Missouri record does not apply here and must not be confused with this one."
        ),
        "sources": [],
        "source_tier": 3,
    },
    {
        "fips": "35011", "name": "De Baca County", "state": "New Mexico",
        "title": "De Baca County, NM — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Several New Mexico counties adopted data center moratoriums in 2026 — Socorro "
            "County (one year, June 2026), Sierra County (18 months), and Santa Fe County (18 "
            "months, 1 MW threshold). No moratorium, ordinance, or proposal specific to De "
            "Baca County was found."
        ),
        "sources": [
            {"label": "Source NM — New Mexico county adopts yearlong data center moratorium",
             "url": "https://sourcenm.com/2026/06/10/new-mexico-county-adopts-yearlong-data-center-moratorium/"},
        ],
        "source_tier": 3,
    },
    {
        "fips": "53003", "name": "Asotin County", "state": "Washington",
        "title": "Asotin County, WA — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "No county-specific data center ordinance, moratorium, or proposal was found for "
            "Asotin County. Search results returned only general zoning-map and parcel-data "
            "resources, with no data center-specific policy content."
        ),
        "sources": [],
        "source_tier": 3,
    },
    {
        "fips": "13125", "name": "Glascock County", "state": "Georgia",
        "title": "Glascock County, GA — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Georgia has seen a wave of data center ordinances — one in five Georgia counties "
            "has adopted or is drafting one, per Georgia Public Broadcasting's review of "
            "municipal codes. Glascock County's 2025 joint comprehensive plan update did not "
            "surface any data center-specific provisions, and no ordinance or moratorium "
            "specific to Glascock County was found."
        ),
        "sources": [
            {"label": "Georgia Public Broadcasting — A 'wave' of data center ordinances sweep through GA counties",
             "url": "https://www.gpb.org/news/2025/10/22/wave-of-data-center-ordinances-sweep-through-ga-counties-how-strict-are-they"},
        ],
        "source_tier": 2,
    },
    {
        "fips": "24019", "name": "Dorchester County", "state": "Maryland",
        "title": "Dorchester County, MD — Council Weighing Whether to Draft Data Center Rules (No Formal Proposal Yet)",
        "description": (
            "The Dorchester County Council is deciding whether the county needs a data center "
            "moratorium, a review task force, or another regulatory framework, ahead of any "
            "project actually being proposed there. Council Vice President Mike Detmer said "
            "the county wants a framework in place before a developer comes forward rather "
            "than reacting afterward. A data center has been proposed in nearby Federalsburg, "
            "about two miles from the Dorchester County line, but no application has been "
            "filed inside Dorchester County itself. An official recommendation was expected "
            "by around August 2026; the county is reportedly looking to Queen Anne's County's "
            "12-month moratorium as a possible model."
        ),
        "sources": [
            {"label": "Star Democrat — Dorchester County Council hopes to get ahead on regulating data center proposals",
             "url": "http://www.stardem.com/news/data_centers/dorchester-county-council-hopes-to-get-ahead-on-regulating-data-center-proposals/article_af7ff49c-f072-4e08-85e9-1cd10bf1ca33.html"},
        ],
        "source_tier": 3,
        "_confidence": "low",
        "_note_extra": (
            "No ordinance has been drafted or proposed as of this review, so this remains "
            "level 0 rather than level 1 (Proposed Restrictions) per docs/TERMINOLOGY.md, "
            "which requires pending legislation. Re-check after the county's expected August "
            "2026 recommendation."
        ),
    },
    {
        "fips": "13131", "name": "Grady County", "state": "Georgia",
        "title": "Grady County, GA — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Georgia has a broad wave of data center ordinance activity — roughly 34 counties "
            "and 23 cities were drafting or had adopted rules as of mid-2026 — but no "
            "ordinance, moratorium, or proposal specific to Grady County was found in that "
            "coverage."
        ),
        "sources": [
            {"label": "Georgia Public Broadcasting — A 'wave' of data center ordinances sweep through GA counties",
             "url": "https://www.gpb.org/news/2025/10/22/wave-of-data-center-ordinances-sweep-through-ga-counties-how-strict-are-they"},
        ],
        "source_tier": 2,
    },
    {
        "fips": "36101", "name": "Steuben County", "state": "New York",
        "title": "Steuben County, NY — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "New York enacted a statewide one-year moratorium on new large-scale (hyperscale) "
            "data center permits via the state Department of Environmental Conservation, "
            "signed by Governor Hochul, while the state develops siting and benefit "
            "standards. That freeze applies to Steuben County as it does to every New York "
            "county; no additional, county-specific ordinance or local moratorium for Steuben "
            "County itself was found."
        ),
        "sources": [
            {"label": "Governor Kathy Hochul — First Statewide Moratorium on New Hyperscale Data Centers",
             "url": "https://www.governor.ny.gov/news/first-statewide-moratorium-new-hyperscale-data-centers-launched-governor-kathy-hochul"},
        ],
        "source_tier": 1,
    },
    {
        "fips": "41069", "name": "Wheeler County", "state": "Oregon",
        "title": "Wheeler County, OR — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Oregon's Data Center Advisory Committee, convened by Governor Kotek, is "
            "developing statewide regulatory recommendations, with legislative action "
            "expected in the 2027 session; most current development activity is concentrated "
            "in the Hillsboro and Umatilla Basin areas. No ordinance, moratorium, or proposal "
            "specific to Wheeler County was found."
        ),
        "sources": [],
        "source_tier": 3,
    },
    {
        "fips": "21115", "name": "Johnson County", "state": "Kentucky",
        "title": "Johnson County, KY — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Kentucky has statewide momentum on data center zoning — the Kentucky Resources "
            "Council published a model ordinance, and counties including Mason and cities "
            "like Bowling Green and Lexington have adopted or drafted local rules — but no "
            "ordinance, moratorium, or proposal specific to Johnson County was found."
        ),
        "sources": [
            {"label": "Kentucky Lantern — Some Kentucky counties and cities are hitting pause on data centers",
             "url": "https://kentuckylantern.com/2026/06/08/some-kentucky-counties-and-cities-are-hitting-pause-on-data-centers/"},
        ],
        "source_tier": 3,
    },
    {
        "fips": "21125", "name": "Laurel County", "state": "Kentucky",
        "title": "Laurel County, KY — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "One industry research report lists Laurel County among a group of Kentucky "
            "counties (with Hancock, Mason, Clark, Oldham, Meade, Gallatin, Carroll, Madison, "
            "Jackson, Marion, and Hardin) where data center projects are described as \"under "
            "consideration\" — that is developer interest, not a county policy, and no zoning "
            "action, ordinance, or moratorium for Laurel County was found."
        ),
        "sources": [
            {"label": "EPIC Report No. 2026-001 — Data Centers in Kentucky",
             "url": "https://caer.uky.edu/sites/default/files/2026-06/epic-report-no-2026-001.pdf"},
        ],
        "source_tier": 2,
    },
    {
        "fips": "21123", "name": "Larue County", "state": "Kentucky",
        "title": "LaRue County, KY — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "One industry report notes LaRue County would easily clear the $25M investment "
            "threshold Kentucky's incentive programs use, framing it as an attractive "
            "location for a regional edge-class facility — that is a market observation, not "
            "a county policy, and no zoning action, ordinance, or moratorium for LaRue County "
            "was found."
        ),
        "sources": [],
        "source_tier": 3,
    },
    {
        "fips": "40053", "name": "Grant County", "state": "Oklahoma",
        "title": "Grant County, OK — Reviewed, No County-Specific Data Center Policy Identified",
        "description": (
            "Oklahoma's SB 1488 places a statewide moratorium on new data centers with an "
            "electrical load over 100 MW, in force until November 1, 2029, while the state "
            "Corporation Commission studies water, rate and property-value impacts; HB 2992 "
            "separately requires large-load users including data centers to cover their share "
            "of electricity and infrastructure costs. Both apply statewide, including Grant "
            "County. No additional, county-specific ordinance or local moratorium for Grant "
            "County itself was found."
        ),
        "sources": [
            {"label": "MultiState — State Data Center Legislation in 2026 Tackles Energy and Tax Issues",
             "url": "https://www.multistate.us/insider/2026/2/20/state-data-center-legislation-in-2026-tackles-energy-and-tax-issues"},
        ],
        "source_tier": 2,
    },
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = json.loads(RAW.read_text())
    rows = data["restrictions"]
    by_fips = {r.get("fips"): i for i, r in enumerate(rows)}

    updated, skipped = [], []

    for rec in RECORDS:
        fips = rec["fips"]
        if fips not in by_fips:
            skipped.append(f"{fips} {rec['name']}: expected present but missing — not touching")
            continue

        existing = rows[by_fips[fips]]
        if "DATA CORRECTION 2026-07-27" not in (existing.get("notes") or ""):
            skipped.append(f"{fips} {rec['name']}: no longer carries the mismatch flag — "
                            f"someone else already fixed it, not overwriting")
            continue

        note_extra = rec.pop("_note_extra", "")
        confidence = rec.pop("_confidence", "low")
        note = (note_extra + " " if note_extra else "") + NO_FINDING_CAVEAT

        new_rec = dict(existing)
        new_rec.update({
            "name": rec["name"],
            "state": rec["state"],
            "level": 0,
            "types": ["data_center"],
            "title": rec["title"],
            "description": rec["description"],
            "effective_date": None,
            "status": "active",
            "notes": note,
            "sources": rec["sources"],
            "source_tier": rec["source_tier"],
            "confidence": confidence,
            "confidence_score": 30 if confidence == "low" else 45,
            "pipeline_verified": False,
            "lifecycle_stage": "effective",
            "last_reviewed": REVIEW_DATE,
        })
        rows[by_fips[fips]] = new_rec
        updated.append(f"{fips} {rec['name']}, {rec['state']}")

    print(f"re-researched (mismatch resolved): {len(updated)}")
    for line in updated:
        print(f"  {line}")
    if skipped:
        print(f"\nSKIPPED: {len(skipped)}")
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
