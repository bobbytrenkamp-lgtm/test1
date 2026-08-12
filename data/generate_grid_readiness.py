#!/usr/bin/env python3
"""data/generate_grid_readiness.py — Grid Readiness v1, a county-level
explainable screening score.

WHAT THIS IS
A COUNTY-level companion to js/parcel/suitability.js's per-parcel score,
answering a coarser, earlier question: before a user drills into specific
parcels, which counties even have real, mapped grid fundamentals worth
looking at? It follows suitability.js's exact design rules (deterministic,
transparent, never scores what it did not measure, reports its own
coverage) — see that file's header for the full rationale, restated here
at county granularity rather than re-argued.

REAL INPUTS ONLY, TWO COMPONENTS IN v1
  1. substation_infrastructure — count of real TYPE='SUBSTATION' records
     (data/sample_layers.json#power_infrastructure) whose county_fips
     matches, plus the fraction that are quality_tier='high' (disclosed as
     an input, never blended into the score itself — physical presence and
     documentation completeness are different facts; see
     data/fetch_infrastructure.py's classify_substation_quality()).
  2. interconnection_activity — count and summed capacity_mw of ACTIVE
     (not withdrawn, not operational, not suspended) LBNL interconnection
     queue entries (data/interconnection_queue.json) whose county_fips
     matches. "Active" is the forward-looking signal: developers currently
     pursuing interconnection here, not projects that already gave up
     (withdrawn) or already exist (operational).

WHAT IS DELIBERATELY NOT INCLUDED IN v1 (see docs/PARCEL_MULTI_SOURCE_ARCHITECTURE.md's
own precedent for recording a deferred component instead of faking it)
  - Transmission-line presence per county: fetch_transmission_lines() does
    not carry a county_fips field at all (confirmed by reading
    data/fetch_infrastructure.py directly) — a real line-intersects-county
    spatial join would be new code, not a reuse, and is deferred rather
    than approximated under this PR's time budget.
  - ISO/RTO planning-authority context: would need a real point-in-polygon
    join between a county centroid and iso_rto_regions' polygon rings.
    js/parcel/geo.js's pointInPolygon() and county_centroid() both already
    exist, but wiring them together is new code and belongs in its own
    reviewable increment, not folded silently into this one.
Both are real, named gaps — not silently omitted from the score's
documentation, only from what it currently measures.

WHY EVERY COUNTY IN THE OUTPUT GETS A REAL (NEVER FABRICATED) ZERO
Unlike a per-parcel proximity measurement (where "no data" and "far away"
are genuinely different), both v1 inputs come from datasets with
near-total REAL national coverage: power_infrastructure spans all 50
states + DC + PR (53,826 records, confirmed in
data/catalog/dataset_registry.json), and LBNL's queue "compiles ... ~98%
of US generating capacity" (confirmed in interconnection_queue.py's own
header). A county with zero matching substation records or zero active
queue entries in these datasets is real information (this project's best
available real evidence found no substations / no active interconnection
activity there) — not a coverage gap needing omission. The interconnection
component's WEIGHT is omitted per-county (not scored 0) only when
data/interconnection_queue.json does not exist at all for this run — a
wholly different fact ("we have not fetched this dataset") than "we
fetched it and found nothing here".

Only counties that appear in at least one of the two source datasets are
scored. This project has no canonical "all US counties" list it trusts
enough to invent zeros for counties neither dataset ever touched — see
data/parcel_priority_queue.py's identical county_fips-grouping-from-real-
data-only convention.

Usage:
    python3 data/generate_grid_readiness.py            # regenerate
    python3 data/generate_grid_readiness.py --check     # staleness gate (CI)
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).parent.parent
SAMPLE_LAYERS_PATH = ROOT / "data" / "sample_layers.json"
INTERCONNECTION_QUEUE_PATH = ROOT / "data" / "interconnection_queue.json"
OUTPUT_JSON_PATH = ROOT / "data" / "grid_readiness.json"
OUTPUT_DOC_PATH = ROOT / "docs" / "GRID_READINESS.md"

# Weights sum to 100 for legibility, though nothing depends on that sum --
# scoring renormalizes over whatever components are actually available for
# a given county, the same convention as js/parcel/suitability.js's
# WEIGHTS. Substation infrastructure is weighted higher because it is a
# direct physical-infrastructure signal; interconnection activity is a
# forward-looking pipeline/demand signal, real but one step more removed
# from built capacity.
WEIGHTS = {
    "substation_infrastructure": 60,
    "interconnection_activity": 40,
}
LABELS = {
    "substation_infrastructure": "Substation infrastructure",
    "interconnection_activity": "Interconnection queue activity",
}

# ── Piecewise-linear interpolation ──────────────────────────────────────────
# Deliberate twin of js/parcel/suitability.js's interpolate() (same
# algorithm, same reasoning for why curves over a formula: every threshold
# is a readable, arguable number, not a coefficient in an equation). Kept
# as a small duplicated pure function rather than a cross-language import,
# since there is no runtime path from Python to browser JS in this project.


def interpolate(x: Optional[float], points: list) -> Optional[int]:
    if x is None:
        return None
    if x <= points[0][0]:
        return points[0][1]
    last = points[-1]
    if x >= last[0]:
        return last[1]
    for i in range(1, len(points)):
        x0, y0 = points[i - 1]
        x1, y1 = points[i]
        if x <= x1:
            ratio = (x - x0) / (x1 - x0)
            return round(y0 + ratio * (y1 - y0))
    return last[1]


# Breakpoints are anchored on the REAL distribution of the committed
# 2026-08-12 data (computed directly from data/sample_layers.json and
# data/interconnection_queue.json, not guessed): substation-count-per-county
# percentiles p10=2 p25=4 p50=8 p75=14 p90=26 p99=76 max=352 across 3,076
# counties with at least one real substation. A curve, not a raw percentile
# rank, so the score stays meaningful as new counties are added later
# without shifting every other county's number.
SUBSTATION_COUNT_CURVE = [
    [0, 0], [1, 15], [2, 30], [4, 45], [8, 60], [14, 72], [26, 82], [76, 93], [200, 100],
]

# Active-queue-entry-count-per-county percentiles (2,633 counties with at
# least one queue entry of any status): p50=1 p75=4 p90=8 p99=26 max=95
# active entries.
QUEUE_ACTIVE_COUNT_CURVE = [
    [0, 0], [1, 20], [4, 40], [8, 55], [26, 75], [95, 95], [200, 100],
]

# Active-queue-capacity-MW-sum-per-county percentiles, counties with >0 MW
# only (1,774 of 2,633): p10=74 p25=160 p50=400 p75=1060 p90=2400 p99=9543
# max=32157 MW.
QUEUE_ACTIVE_MW_CURVE = [
    [0, 0], [74, 20], [400, 40], [1060, 60], [2400, 75], [9543, 90], [32157, 100],
]


def confidence_band(available_pct: float) -> str:
    if available_pct >= 85:
        return "high"
    if available_pct >= 60:
        return "moderate"
    if available_pct >= 35:
        return "low"
    return "very-low"


# ── Loading real data ────────────────────────────────────────────────────


def load_substations_by_county() -> dict[str, list[dict]]:
    data = json.loads(SAMPLE_LAYERS_PATH.read_text())
    by_county: dict[str, list[dict]] = defaultdict(list)
    for rec in data.get("power_infrastructure") or []:
        fips = rec.get("county_fips")
        # Only real TYPE='SUBSTATION' records count -- TAP/RISER/DEAD END
        # are not substation facilities, the same filter
        # js/parcel/proximity-layers.js's substations layer already applies
        # for the identical reason (see that file's 2026-08-12 comment).
        if fips and rec.get("type") == "SUBSTATION":
            by_county[fips].append(rec)
    return by_county


def load_queue_by_county() -> Optional[dict[str, list[dict]]]:
    """Returns None (not {}) when the source file does not exist at all --
    the caller must treat that as "component wholly unavailable this run",
    distinct from a real empty result."""
    if not INTERCONNECTION_QUEUE_PATH.exists():
        return None
    data = json.loads(INTERCONNECTION_QUEUE_PATH.read_text())
    by_county: dict[str, list[dict]] = defaultdict(list)
    for asset in data.get("assets") or []:
        fips = asset.get("county_fips")
        if fips:
            by_county[fips].append(asset)
    return by_county


# ── Component scorers ────────────────────────────────────────────────────
# Each returns {score, inputs, rule}. Never returns None for a county that
# is in scope for this component -- see the module header for why a real
# zero is the correct value here, not an omission.


def score_substation_component(records: list[dict]) -> dict:
    count = len(records)
    score = interpolate(count, SUBSTATION_COUNT_CURVE)
    high_tier = sum(1 for r in records if r.get("quality_tier") == "high")
    high_tier_fraction = round(high_tier / count, 2) if count else None
    return {
        "score": score,
        "inputs": {
            "substationCount": count,
            "highTierFraction": high_tier_fraction,
        },
        "rule": (
            "Count of real TYPE=SUBSTATION records in this county (HIFLD-lineage, "
            "see data/fetch_infrastructure.py), mapped through a curve anchored on "
            "the real national per-county count distribution. highTierFraction is "
            "reported for transparency but NOT blended into the score -- it measures "
            "how well-documented the found substations are, a different fact from "
            "how many exist."
        ),
    }


def score_queue_component(entries: list[dict]) -> dict:
    active = [e for e in entries if e.get("queue_status") == "active"]
    active_count = len(active)
    active_mw = sum(e.get("capacity_mw") or 0 for e in active)

    count_score = interpolate(active_count, QUEUE_ACTIVE_COUNT_CURVE)
    mw_score = interpolate(active_mw, QUEUE_ACTIVE_MW_CURVE)
    score = round((count_score + mw_score) / 2)

    return {
        "score": score,
        "inputs": {
            "activeQueueEntries": active_count,
            "totalQueueEntries": len(entries),
            "activeQueueCapacityMw": round(active_mw, 1),
        },
        "rule": (
            "Mean of two curves over ACTIVE (not withdrawn/operational/suspended) "
            "LBNL interconnection queue entries in this county: entry count and "
            "summed reported capacity_mw. Withdrawn projects are excluded because "
            "they represent abandoned interest, not current activity; operational "
            "projects are excluded because they already exist -- this measures "
            "current pipeline demand, not built capacity."
        ),
    }


# ── Per-county composition ──────────────────────────────────────────────


def score_county(
    fips: str,
    substation_records: list[dict],
    queue_entries: Optional[list[dict]],
    queue_available: bool,
) -> dict:
    components = []
    omitted = []

    sub_result = score_substation_component(substation_records)
    components.append({
        "component": "substation_infrastructure",
        "label": LABELS["substation_infrastructure"],
        "weight": WEIGHTS["substation_infrastructure"],
        "score": sub_result["score"],
        "inputs": sub_result["inputs"],
        "rule": sub_result["rule"],
    })

    if queue_available:
        q_result = score_queue_component(queue_entries or [])
        components.append({
            "component": "interconnection_activity",
            "label": LABELS["interconnection_activity"],
            "weight": WEIGHTS["interconnection_activity"],
            "score": q_result["score"],
            "inputs": q_result["inputs"],
            "rule": q_result["rule"],
        })
    else:
        omitted.append({
            "component": "interconnection_activity",
            "label": LABELS["interconnection_activity"],
            "weight": WEIGHTS["interconnection_activity"],
            "why": "data/interconnection_queue.json has not been generated for this "
                   "run -- the LBNL source requires a real browser fetch (see "
                   ".github/workflows/update_interconnection_queue.yml); this is a "
                   "missing dataset, not a real zero.",
        })

    total_weight = sum(WEIGHTS.values())
    available_weight = sum(c["weight"] for c in components)
    weighted = sum(c["score"] * c["weight"] for c in components)
    overall = round(weighted / available_weight) if available_weight else None
    available_pct = round((available_weight / total_weight) * 1000) / 10 if total_weight else 0.0

    return {
        "fips": fips,
        "overall": overall,
        "components": sorted(components, key=lambda c: -c["weight"]),
        "omitted": omitted,
        "coverage": {
            "availableWeight": available_weight,
            "totalWeight": total_weight,
            "availablePct": available_pct,
        },
        "confidence": confidence_band(available_pct),
        "basis": (
            f"Weighted mean of {len(components)} component(s) covering "
            f"{available_pct}% of the total weight. {len(omitted)} component(s) "
            f"had no data source available this run and were omitted rather than "
            f"scored zero."
        ),
    }


DISCLAIMER = (
    "County-level screening score only. It ranks counties by mapped public grid "
    "infrastructure and interconnection-queue activity on the axes listed -- it is "
    "not a statement about available interconnection capacity, utility willingness "
    "to serve, or transmission headroom, none of which are published in any free "
    "national dataset. A high score means real substations and/or active "
    "interconnection requests were found in this county's public data, nothing "
    "more. Every component and its rule is shown so the number can be checked "
    "rather than trusted."
)


# ── Report assembly ──────────────────────────────────────────────────────


def build_report() -> dict:
    sub_by_county = load_substations_by_county()
    queue_by_county = load_queue_by_county()
    queue_available = queue_by_county is not None

    all_fips = set(sub_by_county) | (set(queue_by_county) if queue_by_county else set())

    counties = {}
    for fips in sorted(all_fips):
        queue_entries = (queue_by_county or {}).get(fips, []) if queue_available else None
        counties[fips] = score_county(
            fips, sub_by_county.get(fips, []), queue_entries, queue_available,
        )

    scored_overalls = [c["overall"] for c in counties.values() if c["overall"] is not None]
    mean_overall = round(sum(scored_overalls) / len(scored_overalls), 1) if scored_overalls else None

    return {
        "meta": {
            "description": (
                "Grid Readiness v1 -- county-level explainable screening score. "
                "See data/generate_grid_readiness.py's module docstring for full "
                "methodology, real breakpoint provenance, and what is deliberately "
                "not yet included."
            ),
            "weights": WEIGHTS,
            "interconnection_queue_data_available": queue_available,
            "counties_scored": len(counties),
            "mean_overall_score": mean_overall,
            "disclaimer": DISCLAIMER,
        },
        "counties": counties,
    }


def render_markdown(report: dict) -> str:
    meta = report["meta"]
    counties = report["counties"]
    lines = [
        "# Grid Readiness v1",
        "",
        "Generated by `data/generate_grid_readiness.py` -- do not hand-edit, run the generator instead.",
        "",
        meta["description"],
        "",
        f"**Counties scored:** {meta['counties_scored']}  ",
        f"**Interconnection queue data available:** {meta['interconnection_queue_data_available']}  ",
        f"**Mean overall score:** {meta['mean_overall_score']}",
        "",
        "## Components",
        "",
        "| Component | Weight |",
        "|---|---|",
    ]
    for key, weight in meta["weights"].items():
        lines.append(f"| {LABELS.get(key, key)} | {weight} |")
    lines.append("")
    lines.append("## Top 25 counties by overall score")
    lines.append("")
    lines.append("| FIPS | Overall | Confidence | Basis |")
    lines.append("|---|---|---|---|")
    ranked = sorted(
        (c for c in counties.values() if c["overall"] is not None),
        key=lambda c: -c["overall"],
    )
    for c in ranked[:25]:
        lines.append(f"| {c['fips']} | {c['overall']} | {c['confidence']} | {c['basis']} |")
    lines.append("")
    lines.append("## Disclaimer")
    lines.append("")
    lines.append(meta["disclaimer"])
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="staleness gate (CI)")
    args = parser.parse_args()

    report = build_report()
    fresh_json = json.dumps(report, indent=2, sort_keys=True) + "\n"
    fresh_md = render_markdown(report)

    if args.check:
        problems = []
        if not OUTPUT_JSON_PATH.exists() or OUTPUT_JSON_PATH.read_text() != fresh_json:
            problems.append(str(OUTPUT_JSON_PATH))
        if not OUTPUT_DOC_PATH.exists() or OUTPUT_DOC_PATH.read_text() != fresh_md:
            problems.append(str(OUTPUT_DOC_PATH))
        if problems:
            print("ERROR: stale grid readiness artifacts: " + ", ".join(problems))
            print(f"Run 'python3 {Path(__file__).name}' and commit the result.")
            return 1
        print("OK: grid readiness artifacts are up to date.")
        return 0

    OUTPUT_JSON_PATH.write_text(fresh_json)
    OUTPUT_DOC_PATH.write_text(fresh_md)
    print(f"Wrote {OUTPUT_JSON_PATH} and {OUTPUT_DOC_PATH}")
    print(f"  {report['meta']['counties_scored']} counties scored, "
          f"mean overall {report['meta']['mean_overall_score']}, "
          f"interconnection queue data available: {report['meta']['interconnection_queue_data_available']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
