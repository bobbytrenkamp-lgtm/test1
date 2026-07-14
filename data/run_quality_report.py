#!/usr/bin/env python3
"""Dataset quality report for the US AI infrastructure facility database.

Prints a structured summary of:
  - Record counts by source and confidence tier
  - Field completeness (coordinates, capacity, address, source URL)
  - Confidence score distribution
  - Candidate queue status
  - Data gaps and recommended next actions

Usage:
    python data/run_quality_report.py [--json] [--candidates]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.facility_pipeline.models import FacilityRecord, load_json
from data.facility_pipeline.reporting import load_master, load_candidates

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCES_PATH = os.path.join(DATA_DIR, "facility_sources.json")

SOURCE_TIER_LABELS = {
    1: "company_official",
    2: "aggregator / hand-curated",
    3: "osm_community",
    4: "discovery (permits, filings, queue)",
    5: "news / unverified",
}


def _pct(n: int, total: int) -> str:
    if not total:
        return "  0%"
    return f"{100 * n // total:3d}%"


def build_report(master_records: list[FacilityRecord], candidates: list[FacilityRecord]) -> dict:
    total = len(master_records)
    report: dict = {"total_master": total, "total_candidates": len(candidates)}

    # ── Source breakdown ────────────────────────────────────────────────────
    by_source: Counter = Counter()
    by_tier: Counter = Counter()
    for r in master_records:
        by_source[r.primary_source or "unknown"] += 1
        by_tier[r.confidence_tier or 5] += 1

    report["by_source"] = dict(by_source.most_common())
    report["by_tier"] = {
        tier: {"count": cnt, "label": SOURCE_TIER_LABELS.get(tier, "?")}
        for tier, cnt in sorted(by_tier.items())
    }

    # ── Field completeness ──────────────────────────────────────────────────
    has_coords = sum(1 for r in master_records if r.latitude and r.longitude)
    has_state = sum(1 for r in master_records if r.state_abbr or r.state)
    has_city = sum(1 for r in master_records if r.city)
    has_address = sum(1 for r in master_records if r.street_address)
    has_source_url = sum(1 for r in master_records if r.source_urls)
    has_capacity = sum(1 for r in master_records if r.capacity_mw_known or r.capacity_mw_planned)
    has_operator = sum(1 for r in master_records if r.operator)
    has_status = sum(1 for r in master_records if r.operational_status not in ("", "unknown"))
    has_verified_date = sum(1 for r in master_records if r.last_verified_date)

    report["completeness"] = {
        "has_coordinates": {"count": has_coords, "pct": round(100 * has_coords / max(total, 1))},
        "has_state": {"count": has_state, "pct": round(100 * has_state / max(total, 1))},
        "has_city": {"count": has_city, "pct": round(100 * has_city / max(total, 1))},
        "has_street_address": {"count": has_address, "pct": round(100 * has_address / max(total, 1))},
        "has_source_url": {"count": has_source_url, "pct": round(100 * has_source_url / max(total, 1))},
        "has_capacity_mw": {"count": has_capacity, "pct": round(100 * has_capacity / max(total, 1))},
        "has_operator": {"count": has_operator, "pct": round(100 * has_operator / max(total, 1))},
        "has_operational_status": {"count": has_status, "pct": round(100 * has_status / max(total, 1))},
        "has_verified_date": {"count": has_verified_date, "pct": round(100 * has_verified_date / max(total, 1))},
    }

    # ── Confidence distribution ─────────────────────────────────────────────
    buckets = {"high (≥0.85)": 0, "medium (0.60–0.84)": 0, "low (<0.60)": 0, "unset": 0}
    for r in master_records:
        c = r.confidence_score
        if not c:
            buckets["unset"] += 1
        elif c >= 0.85:
            buckets["high (≥0.85)"] += 1
        elif c >= 0.60:
            buckets["medium (0.60–0.84)"] += 1
        else:
            buckets["low (<0.60)"] += 1
    report["confidence_distribution"] = buckets

    # ── Operational status breakdown ────────────────────────────────────────
    status_counts: Counter = Counter()
    for r in master_records:
        status_counts[r.operational_status or "unknown"] += 1
    report["by_status"] = dict(status_counts.most_common())

    # ── State coverage ──────────────────────────────────────────────────────
    by_state: Counter = Counter()
    for r in master_records:
        key = r.state_abbr or r.state or "Unknown"
        by_state[key] += 1
    report["by_state"] = dict(by_state.most_common(55))

    # ── Records missing source URLs (verification gap) ──────────────────────
    no_url = [r for r in master_records if not r.source_urls]
    report["records_without_source_url"] = {
        "count": len(no_url),
        "note": "These records came from the hand-curated seed and have not been verified against a public source URL.",
    }

    # ── Candidate queue ────────────────────────────────────────────────────
    cand_by_source: Counter = Counter()
    for c in candidates:
        cand_by_source[c.primary_source or "unknown"] += 1
    report["candidates_by_source"] = dict(cand_by_source.most_common())

    return report


def print_report(report: dict) -> None:
    total = report["total_master"]
    cands = report["total_candidates"]

    print("=" * 60)
    print("  US AI Infrastructure Database — Quality Report")
    print("=" * 60)
    print(f"\n  Master records:  {total:,}")
    print(f"  Candidates:      {cands:,}  (awaiting review)")

    print("\n── Source Breakdown ──────────────────────────────────────")
    for src, cnt in report["by_source"].items():
        print(f"  {src:<35} {cnt:>5,}")

    print("\n── Confidence Tiers ──────────────────────────────────────")
    for tier, info in report["by_tier"].items():
        print(f"  Tier {tier} ({info['label']:<30})  {info['count']:>5,}")

    print("\n── Confidence Score Distribution ─────────────────────────")
    for bucket, cnt in report["confidence_distribution"].items():
        pct = _pct(cnt, total)
        print(f"  {bucket:<22}  {cnt:>5,}  ({pct})")

    print("\n── Field Completeness ────────────────────────────────────")
    for field, info in report["completeness"].items():
        bar = "█" * (info["pct"] // 5) + "░" * (20 - info["pct"] // 5)
        print(f"  {field:<28}  {bar}  {info['pct']:>3}%  ({info['count']:,}/{total:,})")

    print("\n── Operational Status ────────────────────────────────────")
    for status, cnt in report["by_status"].items():
        print(f"  {status:<22}  {cnt:>5,}")

    print("\n── Top States by Record Count ────────────────────────────")
    states = list(report["by_state"].items())
    for i in range(0, min(len(states), 20), 2):
        left = f"{states[i][0]}: {states[i][1]}"
        right = f"{states[i+1][0]}: {states[i+1][1]}" if i + 1 < len(states) else ""
        print(f"  {left:<25}  {right}")

    no_url = report["records_without_source_url"]
    print(f"\n── Verification Gap ──────────────────────────────────────")
    print(f"  {no_url['count']:,} records lack a source URL")
    print(f"  → Run Equinix, Digital Realty, OSM, and DataCenterMap")
    print(f"    pipelines to enrich these with verified source URLs.")

    if report["candidates_by_source"]:
        print("\n── Candidate Queue (needs review) ────────────────────────")
        for src, cnt in report["candidates_by_source"].items():
            print(f"  {src:<35} {cnt:>5,}")

    print("\n── Quality Actions ───────────────────────────────────────")
    completeness = report["completeness"]
    if completeness["has_source_url"]["pct"] < 80:
        print("  ⚠  Source URL coverage is low — run tier-1 pipelines")
    if completeness["has_coordinates"]["pct"] < 90:
        print("  ⚠  Coordinate coverage is low — run OSM pipeline")
    if completeness["has_capacity_mw"]["pct"] < 30:
        print("  ℹ  Capacity data is sparse — expected for enterprise DCs")
    if completeness["has_verified_date"]["pct"] < 50:
        print("  ⚠  Many records have no verification date")
    if cands > 200:
        print(f"  ⚠  {cands} candidates awaiting review — promote or reject")
    if completeness["has_source_url"]["pct"] >= 80:
        print("  ✓  Source URL coverage is good")
    if completeness["has_coordinates"]["pct"] >= 90:
        print("  ✓  Coordinate coverage is good")

    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="Data quality report for facility database")
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of formatted report")
    parser.add_argument("--candidates", action="store_true", help="Show full candidate list")
    args = parser.parse_args()

    master_raw = load_master()
    master = [FacilityRecord.from_dict(d) for d in master_raw]

    cand_raw = load_candidates()
    candidates = [FacilityRecord.from_dict(d) for d in cand_raw]

    report = build_report(master, candidates)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_report(report)

    if args.candidates and candidates:
        print(f"\nCandidate records ({len(candidates)}):")
        for c in candidates[:50]:
            print(f"  [{c.primary_source}] {c.name or c.operator} — {c.city or ''}, {c.state_abbr or ''}")
        if len(candidates) > 50:
            print(f"  ... and {len(candidates) - 50} more")


if __name__ == "__main__":
    main()
