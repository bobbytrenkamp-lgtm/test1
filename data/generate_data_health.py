#!/usr/bin/env python3
"""data/generate_data_health.py — project-wide data health dashboard.

data/generate_data_catalog.py answers "what data does this project have and
is it wired into the UI." This answers a different question: "as of the
most recent automated run, is each data pipeline actually working right
now." The two are deliberately separate artifacts (data_catalog.json /
DATA_COVERAGE.md vs data_health.json / DATA_HEALTH.md) because a dataset can
have excellent declared coverage and still be silently broken -- the
"Shorewood/Will County problem" for parcels, the same failure mode this
dashboard exists to catch across every other pipeline before it goes
unnoticed for months.

HEALTH STATES
-------------
Same seven-state vocabulary data/parcel_pipeline/static_ingestion/pipeline.py
already established for the static ingestion pipeline, reused here instead
of reinvented so "health" means one thing project-wide:

  OK                   last run succeeded, nothing to report
  SOURCE_DOWN           persistently unreachable (repeated consecutive
                        failures), not just a one-off blip
  NETWORK_FAILURE       unreachable, but not (yet) persistent -- could be
                        transient
  VALIDATION_FAILURE    reachable/present, but the content failed a
                        structural check (e.g. an unreachable-link ratio
                        high enough to suggest something is actually wrong,
                        not just normal citation rot)
  SOURCE_CHANGED        reserved for pipelines that detect a structural
                        source change (not yet populated by any real signal
                        below -- listed for vocabulary completeness)
  SCHEMA_CHANGED        reserved (same)
  DATA_EMPTY            reserved (same)
  NOT_YET_TRACKED       no automated health signal exists for this pipeline
                        yet -- an honest "we don't know," never silently
                        reported as OK

WHAT THIS AGGREGATES (real signals only, nothing invented)
------------------------------------------------------------
  data/source_health.json           policy_pipeline source reachability
                                     (per-source, with consecutive_failures)
  data/source_link_health.json      county-page citation URL reachability
  data/map_data.json#validation_report   map_data.json's own citation URLs
  data/parcel_pipeline/static_ingestion/state/*.manifest.json
                                     per static-ingestion-source pipeline health
  data/parcel_health_history.json   per-jurisdiction ArcGIS parcel service
                                     reachability (data/check_parcel_services.mjs
                                     --record-history; only scheduled/dispatch
                                     runs write it, never a PR run)

Every dataset in data/catalog/dataset_registry.json that has none of the
above is listed under `datasets_without_automated_health_tracking` --
reported, not hidden, and never defaulted to OK. When a pipeline's own key in
`pipelines` exactly matches a registered dataset id (parcels_registry,
static_parcel_ingestion), that dataset is excluded from the fallback list
since a real signal already covers it by name.

Usage:
    python3 data/generate_data_health.py            # regenerate
    python3 data/generate_data_health.py --check     # staleness gate (CI)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
HEALTH_JSON_PATH = DATA_DIR / "data_health.json"
HEALTH_DOC_PATH = ROOT / "docs" / "DATA_HEALTH.md"

OK = "OK"
SOURCE_DOWN = "SOURCE_DOWN"
NETWORK_FAILURE = "NETWORK_FAILURE"
VALIDATION_FAILURE = "VALIDATION_FAILURE"
SOURCE_CHANGED = "SOURCE_CHANGED"
SCHEMA_CHANGED = "SCHEMA_CHANGED"
DATA_EMPTY = "DATA_EMPTY"
NOT_YET_TRACKED = "NOT_YET_TRACKED"

HEALTH_STATES = (
    OK, SOURCE_DOWN, NETWORK_FAILURE, VALIDATION_FAILURE,
    SOURCE_CHANGED, SCHEMA_CHANGED, DATA_EMPTY, NOT_YET_TRACKED,
)

# A source that has failed this many consecutive scheduled runs is treated
# as persistently down rather than transiently flaky -- matches the "≥2-of-
# last-3" escalation discipline check_parcel_services.mjs already uses for
# its own "newly dead" classification, rounded to a single clear threshold
# since source_health.json only tracks a running count, not a windowed history.
PERSISTENT_FAILURE_THRESHOLD = 3

# A citation-URL unreachable ratio above this is flagged as worth a look
# (VALIDATION_FAILURE) rather than treated as normal link rot. Chosen well
# above typical background rot (a handful of dead links out of hundreds) so
# this doesn't fire on noise -- both real signals below are currently far
# past it (42% and 48%), which is itself the finding.
UNREACHABLE_RATIO_ALERT_THRESHOLD = 0.15

# Mirrors data/check_parcel_services.mjs's own CONFIRMATION_WINDOW /
# CONFIRMATION_THRESHOLD exactly (see _parcel_service_health below) -- these
# values must stay in sync with that script's constants, not be tuned
# independently here.
PARCEL_CONFIRMATION_WINDOW = 3
PARCEL_CONFIRMATION_THRESHOLD = 2


def _load_json(path: Path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


def _policy_source_health() -> dict:
    data = _load_json(DATA_DIR / "source_health.json")
    if not data:
        return {
            "pipeline": "policy_pipeline_sources",
            "health": NOT_YET_TRACKED,
            "why": "data/source_health.json does not exist or is unreadable",
        }
    sources = data.get("sources", {})
    down = []
    transient = []
    for source_id, s in sources.items():
        if s.get("reachable"):
            continue
        if (s.get("consecutive_failures") or 0) >= PERSISTENT_FAILURE_THRESHOLD:
            down.append(source_id)
        else:
            transient.append(source_id)

    if down:
        health = SOURCE_DOWN
    elif transient:
        health = NETWORK_FAILURE
    else:
        health = OK

    return {
        "pipeline": "policy_pipeline_sources",
        "health": health,
        "last_checked": data.get("meta", {}).get("last_run"),
        "total_sources": len(sources),
        "persistently_down": sorted(down),
        "transiently_unreachable": sorted(transient),
    }


def _citation_link_health(report: dict | None, label: str, checked_at_key: str = "checked_at") -> dict:
    if not report:
        return {"pipeline": label, "health": NOT_YET_TRACKED, "why": "no report file found"}

    summary = report.get("summary", report)  # map_data.json's validation_report has no nested "summary"
    total = summary.get("checked") or summary.get("total_checked") or summary.get("total_citation_urls") or 0
    unreachable = summary.get("unreachable")
    if unreachable is None:
        unreachable = summary.get("broken")
    if unreachable is None or not total:
        return {"pipeline": label, "health": NOT_YET_TRACKED, "why": "report exists but has no usable counts"}

    ratio = unreachable / total
    health = VALIDATION_FAILURE if ratio > UNREACHABLE_RATIO_ALERT_THRESHOLD else OK
    return {
        "pipeline": label,
        "health": health,
        "last_checked": report.get(checked_at_key) or report.get("last_run"),
        "total_urls_checked": total,
        "unreachable": unreachable,
        "unreachable_ratio": round(ratio, 4),
    }


def _static_ingestion_health() -> dict:
    sources_path = DATA_DIR / "parcel_pipeline" / "static_ingestion" / "sources.json"
    registry = _load_json(sources_path)
    registered = (registry or {}).get("sources", [])
    if not registered:
        return {
            "pipeline": "static_parcel_ingestion",
            "health": NOT_YET_TRACKED,
            "why": "zero sources registered in sources.json -- pipeline is built and tested "
                   "but has nothing to run yet (see docs/INFRASTRUCTURE_ASSET_SCHEMA.md-style "
                   "honesty note in static_ingestion/models.py)",
        }
    state_dir = DATA_DIR / "parcel_pipeline" / "static_ingestion" / "state"
    per_source = []
    worst = OK
    order = [OK, NETWORK_FAILURE, VALIDATION_FAILURE, SCHEMA_CHANGED, DATA_EMPTY, SOURCE_CHANGED, SOURCE_DOWN]
    for src in registered:
        manifest = _load_json(state_dir / f"{src['id']}.manifest.json")
        h = (manifest or {}).get("health", NOT_YET_TRACKED)
        per_source.append({"source_id": src["id"], "health": h})
        if h in order and order.index(h) > order.index(worst if worst in order else OK):
            worst = h
    return {"pipeline": "static_parcel_ingestion", "health": worst, "sources": per_source}


def _parcel_service_health() -> dict:
    """Aggregates data/parcel_health_history.json (written by
       check_parcel_services.mjs --record-history on scheduled/dispatch runs
       only -- a PR-triggered run can never populate it, so a missing file
       here is an honest "not yet run", not a hidden failure).

       Mirrors check_parcel_services.mjs's own isConfirmedDead() decision
       exactly (>=2 failures within the latest 3 recorded runs for a FIPS, OR
       a first-ever recorded run with no prior history to consult -- that
       second case is deliberately aggressive in the source script, so this
       dashboard must reproduce it rather than a "safer"-looking approximation
       that would disagree with what the CI job itself concluded and acted on
       (opening a tracking issue, failing the job)."""
    data = _load_json(DATA_DIR / "parcel_health_history.json")
    history = (data or {}).get("history") or {}
    if not history:
        return {
            "pipeline": "parcels_registry",
            "health": NOT_YET_TRACKED,
            "why": "data/parcel_health_history.json does not exist yet -- "
                   "check_parcel_services.yml only writes it on a scheduled "
                   "or manually-dispatched run, never on a pull_request run",
        }

    down = []
    transient = []
    for fips, runs in history.items():
        if not runs:
            continue
        latest = runs[-1]
        if latest.get("ok"):
            continue
        prior = runs[:-1][-(PARCEL_CONFIRMATION_WINDOW - 1):]
        if not prior:
            confirmed = True  # matches isConfirmedDead's "no history" branch
        else:
            prior_failures = sum(1 for r in prior if not r.get("ok"))
            confirmed = (prior_failures + 1) >= PARCEL_CONFIRMATION_THRESHOLD
        (down if confirmed else transient).append(fips)

    if down:
        health = SOURCE_DOWN
    elif transient:
        health = NETWORK_FAILURE
    else:
        health = OK

    return {
        "pipeline": "parcels_registry",
        "health": health,
        "last_checked": (data or {}).get("meta", {}).get("last_updated"),
        "total_jurisdictions": len(history),
        "persistently_down": sorted(down),
        "transiently_unreachable": sorted(transient),
    }


def build_report() -> dict:
    map_data = _load_json(DATA_DIR / "map_data.json") or {}

    pipelines = {
        "policy_pipeline_sources": _policy_source_health(),
        "county_page_citations": _citation_link_health(
            _load_json(DATA_DIR / "source_link_health.json"), "county_page_citations"),
        "map_data_citations": _citation_link_health(
            map_data.get("validation_report"), "map_data_citations", checked_at_key="last_run"),
        "static_parcel_ingestion": _static_ingestion_health(),
        "parcels_registry": _parcel_service_health(),
    }

    registry = _load_json(ROOT / "data" / "catalog" / "dataset_registry.json") or {"datasets": []}
    tracked_pipeline_names = set(pipelines.keys())
    # Most pipeline-level signals here (a citation-URL checker, a
    # source-reachability checker) don't map 1:1 onto one dataset id, so no
    # mapping is invented for those -- forcing one would misrepresent which
    # specific dataset a signal actually covers. But when a pipeline's own key
    # in `pipelines` above IS exactly a registered dataset id (parcels_registry,
    # static_parcel_ingestion), that dataset genuinely does have a health
    # signal -- whatever it currently reports, including NOT_YET_TRACKED --
    # and must not also appear in the generic fallback list below, or the
    # same fact would be reported two different ways in the same document.
    untracked_datasets = sorted(
        d["id"] for d in registry.get("datasets", [])
        if d["id"] not in tracked_pipeline_names
    )

    counts = {}
    for p in pipelines.values():
        counts[p["health"]] = counts.get(p["health"], 0) + 1

    return {
        "_meta": {
            "description": (
                "Project-wide data health: is each pipeline's most recent automated "
                "run actually healthy right now, distinct from data_catalog.json's "
                "coverage/wiring question. NOT_YET_TRACKED is an honest 'we don't know', "
                "never silently reported as OK."
            ),
            "generator": "data/generate_data_health.py",
            "health_states": list(HEALTH_STATES),
        },
        "pipelines": pipelines,
        "datasets_without_automated_health_tracking": untracked_datasets,
        "summary": {
            "pipelines_tracked": len(pipelines),
            "counts_by_health": counts,
            "total_registered_datasets": len(registry.get("datasets", [])),
            "datasets_without_tracking_count": len(untracked_datasets),
        },
    }


def render_markdown(report: dict) -> str:
    lines = [
        "# Data Health Dashboard",
        "",
        "Generated by `data/generate_data_health.py` -- do not hand-edit, run the generator instead.",
        "",
        report["_meta"]["description"],
        "",
        "## Pipeline health",
        "",
        "| Pipeline | Health | Detail |",
        "|---|---|---|",
    ]
    for name, p in report["pipelines"].items():
        detail_bits = []
        # total_sources (policy_pipeline_sources) and total_jurisdictions
        # (parcels_registry) are the same "down/transient/total" shape under
        # different names -- both real pipeline-level down/transient counts,
        # just counting different kinds of things (config'd sources vs.
        # registered county GIS services).
        total_key = "total_sources" if "total_sources" in p else "total_jurisdictions" if "total_jurisdictions" in p else None
        if total_key:
            detail_bits.append(f"{len(p.get('persistently_down', []))} down / "
                                f"{len(p.get('transiently_unreachable', []))} transient / {p[total_key]} total")
        if "total_urls_checked" in p:
            detail_bits.append(f"{p['unreachable']}/{p['total_urls_checked']} unreachable "
                                f"({p['unreachable_ratio']*100:.1f}%)")
        if "why" in p:
            detail_bits.append(p["why"])
        lines.append(f"| {name} | {p['health']} | {'; '.join(detail_bits) or '-'} |")

    lines += [
        "",
        "## Datasets with no automated health signal yet",
        "",
        f"{report['summary']['datasets_without_tracking_count']} of "
        f"{report['summary']['total_registered_datasets']} datasets in "
        "data/catalog/dataset_registry.json have no per-dataset automated health check "
        "(they are hand-curated JSON or covered only indirectly by the pipeline signals "
        "above, not fetched/validated per dataset). Listed here, not defaulted to OK:",
        "",
    ]
    for d in report["datasets_without_automated_health_tracking"]:
        lines.append(f"- {d}")
    lines.append("")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="staleness gate (CI)")
    args = parser.parse_args()

    report = build_report()
    fresh_json = json.dumps(report, indent=2, sort_keys=True) + "\n"
    fresh_md = render_markdown(report)

    if args.check:
        problems = []
        if not HEALTH_JSON_PATH.exists() or HEALTH_JSON_PATH.read_text() != fresh_json:
            problems.append(str(HEALTH_JSON_PATH))
        if not HEALTH_DOC_PATH.exists() or HEALTH_DOC_PATH.read_text() != fresh_md:
            problems.append(str(HEALTH_DOC_PATH))
        if problems:
            print("ERROR: stale data health artifacts: " + ", ".join(problems))
            print(f"Run 'python3 {Path(__file__).name}' and commit the result.")
            return 1
        print("OK: data health dashboard artifacts are up to date.")
        return 0

    HEALTH_JSON_PATH.write_text(fresh_json)
    HEALTH_DOC_PATH.write_text(fresh_md)
    print(f"Wrote {HEALTH_JSON_PATH} and {HEALTH_DOC_PATH}")
    for name, p in report["pipelines"].items():
        print(f"  {name}: {p['health']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
