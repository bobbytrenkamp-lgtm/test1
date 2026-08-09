#!/usr/bin/env python3
"""data/generate_data_catalog.py

    python3 data/generate_data_catalog.py
    python3 data/generate_data_catalog.py --check

Generates data/data_catalog.json and docs/DATA_COVERAGE.md.

WHY A SPLIT BETWEEN REGISTRY AND GENERATOR
-------------------------------------------
data/catalog/dataset_registry.json holds the facts a human has to declare
(which organization publishes this, what its official URL is, what its known
coverage holes are). This script holds the facts the REPOSITORY ITSELF can
answer: how many records are actually in the file right now, whether a
GitHub Actions workflow updates it, whether the production UI (index.html /
js/map.js) actually reads it, whether a test file actually exercises it.

Splitting it this way is what keeps "58 production jurisdictions" from ever
silently drifting to "actually 61" without the catalog knowing — the count is
read from js/parcel/registry.js every time this runs, never typed by hand.

Record counts use a small set of documented extraction rules per dataset
(see RECORD_COUNT_RULES) rather than a single "count top-level list length"
assumption, because the files here have genuinely different shapes (a bare
list, a dict with a named list, a dict of counties keyed by FIPS). Guessing
wrong here would silently misreport coverage, which is the one thing this
file exists to prevent.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "data" / "catalog" / "dataset_registry.json"
CATALOG_PATH = ROOT / "data" / "data_catalog.json"
DOC_PATH = ROOT / "docs" / "DATA_COVERAGE.md"


def read_json(rel_path: str):
    p = ROOT / rel_path
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def read_text(rel_path: str) -> str:
    p = ROOT / rel_path
    return p.read_text() if p.exists() else ""


# ── Record count extraction ─────────────────────────────────────────────────
#
# One rule per dataset id, because "how many records does this file have" is
# not a generic question — a bare JSON list, a dict keyed by FIPS, and a dict
# with a named sub-list all mean something different. A rule that isn't
# listed here reports null rather than guessing.

def _count_registry_js() -> int | None:
    # js/parcel/registry.js is a JS module, not JSON. Reuse the same
    # extraction logic check_registry_integrity.mjs already relies on
    # (JURISDICTIONS keys) by shelling out to node with the existing loader
    # rather than re-implementing a JS object parser in Python.
    try:
        out = subprocess.run(
            ["node", "-e",
             "const {loadRegistry} = require('./data/parcel_pipeline/lib/load_registry.mjs');"
             "loadRegistry().then(r => console.log(r.all().length));"],
            cwd=ROOT, capture_output=True, text=True, timeout=20,
        )
        return int(out.stdout.strip())
    except (subprocess.SubprocessError, ValueError, OSError):
        # load_registry.mjs is an ES module; try the CommonJS-safe fallback
        # used elsewhere in this pipeline (dynamic import via node --input-type).
        try:
            out = subprocess.run(
                ["node", "--input-type=module", "-e",
                 "import {loadRegistry} from './data/parcel_pipeline/lib/load_registry.mjs';"
                 "const r = await loadRegistry(); console.log(r.all().length);"],
                cwd=ROOT, capture_output=True, text=True, timeout=20,
            )
            return int(out.stdout.strip())
        except (subprocess.SubprocessError, ValueError, OSError):
            return None


def _count_json_path(rel_path: str, *keys: str) -> int | None:
    data = read_json(rel_path)
    if data is None:
        return None
    node = data
    for k in keys:
        if not isinstance(node, dict) or k not in node:
            return None
        node = node[k]
    if isinstance(node, list):
        return len(node)
    if isinstance(node, dict):
        return len(node)
    return None


def _count_zoning_jurisdictions() -> int | None:
    d = ROOT / "data" / "zoning" / "jurisdictions"
    if not d.is_dir():
        return None
    return sum(1 for _ in d.iterdir() if _.is_dir())


RECORD_COUNT_RULES = {
    "parcels_registry": _count_registry_js,
    "parcel_source_catalog": lambda: _count_json_path("data/parcel_source_catalog.json", "jurisdictions"),
    "data_centers": lambda: _count_json_path("data/facilities_index.json"),
    "facility_sources": lambda: _count_json_path("data/facility_sources.json", "sources"),
    "transmission_lines": lambda: _count_json_path("data/sample_layers.json", "transmission_lines"),
    "substations": lambda: _count_json_path("data/sample_layers.json", "power_infrastructure"),
    "power_plants": lambda: _count_json_path("data/sample_layers.json", "power_plants"),
    "utility_territories": lambda: _count_json_path("data/sample_layers.json", "utility_territories"),
    "iso_rto": lambda: 0,
    "interconnection_queues": lambda: 0,
    "fiber_network": lambda: _count_json_path("data/sample_layers.json", "fiber_network"),
    "fcc_broadband_fiber_pct": lambda: 0,
    "water_stress": lambda: _count_json_path("data/sample_layers.json", "water_stress"),
    "wastewater": lambda: _count_json_path("data/sample_layers.json", "wastewater_facilities"),
    "roads": lambda: 0,
    "rail": lambda: 0,
    "fema_flood": lambda: 0,
    "nwi_wetlands": lambda: 0,
    "pad_us_protected_lands": lambda: 0,
    "zoning_jurisdictions": _count_zoning_jurisdictions,
    "parcel_assessment_sales_ownership": lambda: 0,
    "economic_census": lambda: _count_json_path("data/economy/census_county.json"),
    "fred_data": lambda: _count_json_path("data/economy/fred_data.json"),
    "political_risk": lambda: _count_json_path("data/political_risk.json", "scores"),
    "restrictions_raw": lambda: _count_json_path("data/restrictions_raw.json", "restrictions"),
    "ai_news": lambda: _count_json_path("data/ai_news.json", "articles"),
}


# ── UI / CI wiring detection ────────────────────────────────────────────────
#
# "Is this dataset actually connected to anything a user sees" is exactly the
# distinction Phase 11 in the project brief cares about (ENGINE EXISTS vs
# DATA EXISTS vs UI INTEGRATED are different claims). Detected by searching
# the production JS/HTML for a reference to the dataset's own file path or a
# declared keyword — a real, if approximate, signal that beats a hand-typed
# "yes" which drifts the moment someone removes a script tag.

UI_SEARCH_FILES = ["index.html", "js/map.js", "js/parcel/index.js", "js/parcel/proximity-layers.js",
                    "js/parcel/constraint-layers.js"]

UI_KEYWORDS = {
    "parcels_registry": ["parcel/registry.js"],
    "data_centers": ["facilities_index.json"],
    "transmission_lines": ["transmission_lines"],
    "substations": ["power_infrastructure"],
    "fiber_network": ["fiber_network"],
    "water_stress": ["water_stress"],
    "utility_territories": ["utility_territories"],
    "fema_flood": ["FEMA_NFHL_URL"],
    "political_risk": ["political_risk", "DC_RISK_BY_FIPS"],
    "ai_news": ["ai_news.json"],
    "economic_census": ["census_county", "census_cbp"],
    "fred_data": ["fred_data"],
    "zoning_jurisdictions": ["ZONING", "zoning/jurisdictions"],
}


def _ui_consumed(dataset_id: str) -> bool:
    keywords = UI_KEYWORDS.get(dataset_id)
    if not keywords:
        return False
    haystack = "\n".join(read_text(f) for f in UI_SEARCH_FILES)
    return any(kw in haystack for kw in keywords)


# CI test file each dataset's generator/consumer is exercised by, if any.
# Read from tests/run_all.sh's own `run` lines rather than guessed, so this
# tracks the actual gate rather than a file that merely exists.

def _ci_tested_test_ids() -> set[str]:
    run_all = read_text("tests/run_all.sh")
    return set(re.findall(r'run "([^"]+)"', run_all))


CI_TEST_LABEL_KEYWORDS = {
    "parcels_registry": "parcel registry integrity",
    "data_centers": "facilities index",
    "economic_census": "economic",
    "fred_data": "economic",
    "political_risk": None,  # no dedicated CI test currently
    "restrictions_raw": "policy pipeline",
    "ai_news": None,
}


def _ci_tested(dataset_id: str, test_labels: set[str]) -> bool:
    kw = CI_TEST_LABEL_KEYWORDS.get(dataset_id)
    if not kw:
        return False
    return any(kw.lower() in label.lower() for label in test_labels)


# GitHub Actions workflow each dataset is refreshed by, detected by whether
# any workflow file mentions the dataset's own file path.
#
# Two things that would otherwise misreport this, both caught while checking
# the first run's output by hand:
#
#   1. Matching only the basename (Path(file_part).name) let a directory
#      path like "data/zoning/jurisdictions" match on the bare word
#      "jurisdictions" -- which appears in an unrelated workflow's UI text
#      ("Pull the next N jurisdictions..."). Basename matching is now
#      restricted to names that actually look like a filename (contain a
#      '.'), so a directory reference only matches on its full path.
#   2. Returning the FIRST alphabetically-matching workflow hid the real
#      automation: data/sample_layers.json is fetched by
#      update_infrastructure.yml, but a stray mention of the same filename
#      in an error message inside update_data.yml (alphabetically earlier)
#      was reported instead. All matches are now collected, so the genuine
#      one is never silently shadowed by a coincidental string match.

# ── Update cadence classification (Phase 10: "classify refresh cadence per
# dataset, check-before-expensive-work") ──────────────────────────────────
#
# Parsed from the workflow's own committed cron schedule via plain regex,
# not a YAML parser -- PyYAML is not a declared dependency of
# data/requirements.txt (it happens to be importable in some environments
# incidentally, which would make this script silently work locally and
# silently fail in CI). Cron text is simple and stable enough that a regex
# match on `cron: "..."` is exactly the discipline check_registry_integrity.mjs's
# own comment recommends: don't add a dependency a five-field string doesn't need.
_CRON_LINE_RE = re.compile(r'cron:\s*"([^"]+)"')
_SCHEDULE_BLOCK_RE = re.compile(r'^\s*schedule:\s*$', re.MULTILINE)

# Ordered worst-to-best is irrelevant here; this is a lookup table used to
# pick the MOST FREQUENT cadence when a workflow declares more than one cron
# trigger (e.g. monitor_legislation.yml fires twice a week on different
# days -- still "weekly" in effect, not two separate cadences).
_CADENCE_FREQUENCY_RANK = {
    "hourly": 0, "daily": 1, "weekly": 2, "monthly": 3, "custom": 4,
    "manual-only": 5, "none": 6, "unknown": 7,
}


def _cron_cadence_label(cron_expr: str) -> str:
    parts = cron_expr.split()
    if len(parts) != 5:
        return "unknown"
    _minute, hour, dom, _month, dow = parts
    if hour == "*":
        return "hourly"
    if dom != "*" and dow == "*":
        return "monthly"
    if dow != "*" and dom == "*":
        return "weekly"
    if dom == "*" and dow == "*":
        return "daily"
    return "custom"  # both day-of-month and day-of-week constrained -- rare, not worth a false label


def _workflow_cadence(workflow_name: str) -> dict:
    path = ROOT / ".github" / "workflows" / workflow_name
    if not path.is_file():
        return {"cadence": "unknown", "cron_expressions": []}
    text = path.read_text()
    crons = _CRON_LINE_RE.findall(text)
    if crons:
        labels = [_cron_cadence_label(c) for c in crons]
        best = min(labels, key=lambda l: _CADENCE_FREQUENCY_RANK.get(l, 99))
        return {"cadence": best, "cron_expressions": crons}
    if "workflow_dispatch:" in text and not _SCHEDULE_BLOCK_RE.search(text):
        return {"cadence": "manual-only", "cron_expressions": []}
    return {"cadence": "none", "cron_expressions": []}


def _dataset_cadence(workflow_names: list[str]) -> dict | None:
    """Rolls up cadence across every workflow that touches this dataset --
    a dataset refreshed by both a weekly and an hourly workflow is
    effectively hourly. Returns None (not a fake 'none') when no workflow
    touches the dataset at all, so a caller can distinguish "genuinely
    never refreshed" from "refreshed, but only manually"."""
    if not workflow_names:
        return None
    per_workflow = {wf: _workflow_cadence(wf) for wf in workflow_names}
    best = min(
        (v["cadence"] for v in per_workflow.values()),
        key=lambda c: _CADENCE_FREQUENCY_RANK.get(c, 99),
    )
    return {"cadence": best, "per_workflow": per_workflow}


def _automated_workflows(rel_path: str | None) -> list[str]:
    if not rel_path:
        return []
    file_part = rel_path.split("#")[0]
    basename = Path(file_part).name
    basename_is_filename_like = "." in basename
    wf_dir = ROOT / ".github" / "workflows"
    if not wf_dir.is_dir():
        return []
    matches = []
    for wf in sorted(wf_dir.glob("*.yml")):
        text = wf.read_text()
        if file_part in text or (basename_is_filename_like and basename in text):
            matches.append(wf.name)
    return matches


def build_catalog() -> dict:
    registry = json.loads(REGISTRY_PATH.read_text())
    test_labels = _ci_tested_test_ids()

    datasets = []
    for entry in registry["datasets"]:
        did = entry["id"]
        count_fn = RECORD_COUNT_RULES.get(did)
        record_count = count_fn() if count_fn else None

        automated = _automated_workflows(entry.get("file"))
        datasets.append({
            **entry,
            "record_count": record_count,
            "ui_consumed": _ui_consumed(did),
            "ci_tested": _ci_tested(did, test_labels),
            "automated_update_workflows": automated,
            "update_cadence": _dataset_cadence(automated),
            "has_data": bool(record_count),
        })

    by_category: dict[str, list[dict]] = {}
    for d in datasets:
        by_category.setdefault(d["category"], []).append(d)

    categories_summary = []
    for cat, items in sorted(by_category.items()):
        with_data = [d for d in items if d["has_data"]]
        categories_summary.append({
            "category": cat,
            "dataset_count": len(items),
            "datasets_with_data": len(with_data),
            "total_records": sum(d["record_count"] or 0 for d in with_data),
            "ui_consumed_count": sum(1 for d in items if d["ui_consumed"]),
            "automated_count": sum(1 for d in items if d["automated_update_workflows"]),
        })

    return {
        "meta": {
            "generated_by": "data/generate_data_catalog.py",
            "generated_from": [
                "data/catalog/dataset_registry.json",
                "js/parcel/registry.js",
                "data/*.json (record counts)",
                "tests/run_all.sh (CI coverage)",
                ".github/workflows/*.yml (automation coverage)",
                "index.html, js/map.js, js/parcel/*.js (UI consumption)",
            ],
            "caveat": (
                "record_count, ui_consumed, ci_tested, and automated_update_workflows are "
                "computed from the current repository state every run. Everything else "
                "(source_org, source_url, license, known_coverage_holes, "
                "known_quality_issues) is declared once in dataset_registry.json and "
                "requires a human to update when it changes. A dataset with has_data:false "
                "means this repository currently holds zero records for it, whatever the "
                "engine built to consume it can do."
            ),
        },
        "categories": categories_summary,
        "datasets": datasets,
        "totals": {
            "dataset_count": len(datasets),
            "datasets_with_data": sum(1 for d in datasets if d["has_data"]),
            "datasets_ui_consumed": sum(1 for d in datasets if d["ui_consumed"]),
            "datasets_ci_tested": sum(1 for d in datasets if d["ci_tested"]),
            "datasets_automated": sum(1 for d in datasets if d["automated_update_workflows"]),
            "datasets_by_cadence": _cadence_counts(datasets),
        },
    }


def _cadence_counts(datasets: list[dict]) -> dict:
    counts: dict[str, int] = {}
    for d in datasets:
        label = d["update_cadence"]["cadence"] if d["update_cadence"] else "not_automated"
        counts[label] = counts.get(label, 0) + 1
    return dict(sorted(counts.items()))


def render_markdown(catalog: dict) -> str:
    L = []
    L.append("# Data Coverage")
    L.append("")
    L.append("**Generated file — do not edit by hand.**")
    L.append("Run `python3 data/generate_data_catalog.py` to regenerate.")
    L.append("Declared metadata (sources, URLs, known issues) lives in "
              "`data/catalog/dataset_registry.json`.")
    L.append("")
    L.append(f"> {catalog['meta']['caveat']}")
    L.append("")

    t = catalog["totals"]
    L.append("## Totals")
    L.append("")
    L.append("| | |")
    L.append("|---|---|")
    L.append(f"| Datasets catalogued | {t['dataset_count']} |")
    L.append(f"| Datasets with actual data (has_data) | {t['datasets_with_data']} |")
    L.append(f"| Datasets wired into the production UI | {t['datasets_ui_consumed']} |")
    L.append(f"| Datasets with dedicated CI coverage | {t['datasets_ci_tested']} |")
    L.append(f"| Datasets on an automated refresh workflow | {t['datasets_automated']} |")
    L.append("")

    L.append("## Refresh cadence (computed from each workflow's own cron schedule, not declared)")
    L.append("")
    L.append("| Cadence | Datasets |")
    L.append("|---|---|")
    for label, count in t["datasets_by_cadence"].items():
        L.append(f"| {label} | {count} |")
    L.append("")

    L.append("## By category")
    L.append("")
    L.append("| Category | Datasets | With data | Total records | UI-consumed | Automated |")
    L.append("|---|---|---|---|---|---|")
    for c in catalog["categories"]:
        L.append(f"| {c['category']} | {c['dataset_count']} | {c['datasets_with_data']} | "
                  f"{c['total_records']:,} | {c['ui_consumed_count']} | {c['automated_count']} |")
    L.append("")

    L.append("## Every dataset")
    L.append("")
    L.append("`has_data: false` means an engine or architecture may exist for this dataset, "
              "but the repository currently holds zero real records for it — see "
              "`known_coverage_holes` for why.")
    L.append("")
    for c in catalog["categories"]:
        cat = c["category"]
        L.append(f"### {cat}")
        L.append("")
        for d in [x for x in catalog["datasets"] if x["category"] == cat]:
            status = "✅ has data" if d["has_data"] else "⛔ no data"
            L.append(f"**{d['name']}** ({d['id']}) — {status}")
            L.append("")
            L.append(f"- Records: {d['record_count'] if d['record_count'] is not None else 'n/a'}")
            L.append(f"- Source: {d['source_org'] or '_not applicable — no data_'}")
            if d["source_url"]:
                L.append(f"- Source URL: {d['source_url']}")
            L.append(f"- Geographic scope (declared): {d['geographic_scope_declared'] or '_none_'}")
            L.append(f"- Update frequency (declared): {d['update_frequency_declared'] or '_none_'}")
            L.append(f"- Authoritative: {d['authoritative']}")
            L.append(f"- UI-consumed: {d['ui_consumed']}")
            L.append(f"- CI-tested: {d['ci_tested']}")
            L.append(f"- Automated update workflow(s): {', '.join(d['automated_update_workflows']) if d['automated_update_workflows'] else '_none_'}")
            L.append(f"- Actual refresh cadence (computed from the workflow's own cron schedule): "
                      f"{d['update_cadence']['cadence'] if d['update_cadence'] else '_not applicable — no automated workflow_'}")
            if d["known_coverage_holes"]:
                L.append(f"- **Known coverage holes:** {d['known_coverage_holes']}")
            if d["known_quality_issues"]:
                L.append(f"- **Known quality issues:** {d['known_quality_issues']}")
            L.append("")

    return "\n".join(L)


def main():
    check = "--check" in sys.argv

    catalog = build_catalog()
    catalog_json = json.dumps(catalog, indent=2) + "\n"
    md = render_markdown(catalog)

    if check:
        stale = []
        if not CATALOG_PATH.exists() or CATALOG_PATH.read_text() != catalog_json:
            stale.append(str(CATALOG_PATH.relative_to(ROOT)))
        if not DOC_PATH.exists() or DOC_PATH.read_text() != md:
            stale.append(str(DOC_PATH.relative_to(ROOT)))
        if stale:
            print("Data catalog artifacts are stale:")
            for s in stale:
                print(f"  - {s}")
            print("\nRun: python3 data/generate_data_catalog.py")
            sys.exit(1)
        print("OK — data catalog artifacts match current repository state.")
        return

    CATALOG_PATH.write_text(catalog_json)
    DOC_PATH.write_text(md)
    t = catalog["totals"]
    print(f"Wrote {CATALOG_PATH.relative_to(ROOT)} and {DOC_PATH.relative_to(ROOT)}")
    print(f"  {t['dataset_count']} datasets catalogued, {t['datasets_with_data']} have real data")
    print(f"  {t['datasets_ui_consumed']} wired into the UI, {t['datasets_automated']} on automated refresh")


if __name__ == "__main__":
    main()
