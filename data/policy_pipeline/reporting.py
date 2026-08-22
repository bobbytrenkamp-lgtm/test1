"""Generate source health reports and pipeline run summaries."""
from __future__ import annotations
import os
import sys
from datetime import datetime, timezone
from .models import SourceHealth, PolicyCandidate, save_json_file, load_json_file

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.endpoint_diagnostics import classify_down_reason  # noqa: E402

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_HEALTH_PATH = os.path.join(DATA_DIR, "source_health.json")
CANDIDATES_PATH = os.path.join(DATA_DIR, "policy_candidates.json")
CHANGE_LOG_PATH = os.path.join(DATA_DIR, "policy_change_log.json")


def load_source_health() -> dict:
    data = load_json_file(SOURCE_HEALTH_PATH)
    if data is None:
        return {"meta": {"last_run": None}, "sources": {}}
    return data


def save_source_health(health_data: dict) -> None:
    health_data["meta"]["last_run"] = datetime.now(timezone.utc).isoformat()
    save_json_file(SOURCE_HEALTH_PATH, health_data)


def update_source_health_entry(health_data: dict, health: SourceHealth) -> None:
    """Upsert a SourceHealth record into the health_data dict.

    Tracks first_failure_at (when the current outage started -- reset the
    instant a source recovers) and down_reason (why it's currently failing,
    via the shared classifier in lib/endpoint_diagnostics.py) alongside the
    existing consecutive_failures counter. consecutive_failures itself stays
    a flat running count rather than being replaced with a full per-run
    history array (the model parcel_health_history.json uses): the counter
    already answers the question generate_data_health.py needs ("has this
    failed >=3 scheduled runs in a row") correctly for a source that's
    checked on a regular cadence, and migrating 109 sources' history to a
    windowed model would be a materially bigger schema change for the same
    practical decision in the common case. first_failure_at closes the one
    real gap that existed either way: nothing recorded how long an outage
    had been running.
    """
    sources = health_data.setdefault("sources", {})
    prev = sources.get(health.source_id, {})
    entry = health.to_dict()
    if health.reachable:
        entry["consecutive_failures"] = 0
        entry["first_failure_at"] = None
        entry["down_reason"] = None
    else:
        entry["consecutive_failures"] = prev.get("consecutive_failures", 0) + 1
        entry["first_failure_at"] = prev.get("first_failure_at") or health.last_checked
        entry["down_reason"] = classify_down_reason(
            status=health.http_status, error=health.error,
            final_url=None, original_url=health.url,
            consecutive_failures=entry["consecutive_failures"],
            body_snippet=health.body_snippet,
        )
    # body_snippet only exists to feed the classification above -- storing
    # arbitrary third-party response HTML long-term in a committed JSON file
    # isn't worth it once down_reason has already been computed from it.
    entry["body_snippet"] = None
    sources[health.source_id] = entry


def load_candidates() -> list[dict]:
    data = load_json_file(CANDIDATES_PATH)
    if data is None:
        return []
    return data.get("candidates", [])


def save_candidates(candidates: list[PolicyCandidate]) -> None:
    existing = load_candidates()
    existing_ids = {c["candidate_id"] for c in existing}
    new_dicts = [c.to_dict() for c in candidates if c.candidate_id not in existing_ids]
    all_candidates = existing + new_dicts
    save_json_file(CANDIDATES_PATH, {
        "meta": {
            "description": "Policy signals discovered by the pipeline awaiting human review. Do NOT copy entries here directly to restrictions_raw.json without verification.",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "total": len(all_candidates),
            "pending": sum(1 for c in all_candidates if c.get("review_status") == "pending"),
        },
        "candidates": all_candidates,
    })


def build_run_summary(
    sources_checked: int,
    sources_reachable: int,
    sources_failed: int,
    new_candidates: int,
    duplicates_skipped: int,
    invalid_skipped: int,
    elapsed_seconds: float,
) -> dict:
    return {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "sources_checked": sources_checked,
        "sources_reachable": sources_reachable,
        "sources_failed": sources_failed,
        "reachability_pct": round(sources_reachable / max(sources_checked, 1) * 100, 1),
        "new_candidates_added": new_candidates,
        "duplicates_skipped": duplicates_skipped,
        "invalid_skipped": invalid_skipped,
        "elapsed_seconds": round(elapsed_seconds, 1),
    }


def health_report_summary(health_data: dict) -> dict:
    """Summarize source health for display / CI reporting."""
    sources = health_data.get("sources", {})
    reachable = sum(1 for s in sources.values() if s.get("reachable"))
    unreachable = len(sources) - reachable
    chronic_failures = [
        sid for sid, s in sources.items()
        if s.get("consecutive_failures", 0) >= 3
    ]
    return {
        "total_sources": len(sources),
        "reachable": reachable,
        "unreachable": unreachable,
        "chronic_failures": chronic_failures,
        "as_of": health_data.get("meta", {}).get("last_run"),
    }


def determine_exit_code(valid_candidates: list, health_data: dict) -> int:
    """Exit code for a normal (non --check-health-only) pipeline run.

    Real bug found 2026-08-16: this used to be `1 if valid_candidates else 0`
    inline in run_policy_pipeline.py's main() -- it only ever looked at
    whether new candidates were found, completely ignoring chronic source
    failures. update_policy_sources.yml's "Open issue" step is gated on this
    exit code, and its own issue body already builds a dedicated "Chronic
    Source Failures" section -- but on any day with zero new candidates (the
    common case), a source stuck broken for weeks never triggered that step
    at all. The --check-health-only code path already got this right
    (`0 if not report["unreachable"] else 1`, using this same
    health_report_summary() chronic_failures list); this makes both paths
    agree on what counts as chronic (3+ consecutive failures).
    """
    chronic_failures = health_report_summary(health_data)["chronic_failures"]
    return 1 if (valid_candidates or chronic_failures) else 0


def append_change_log(entries: list[dict]) -> None:
    """Append new change log entries to policy_change_log.json."""
    data = load_json_file(CHANGE_LOG_PATH)
    if data is None:
        data = {"meta": {"description": "Log of detected changes in monitored government sources."}, "entries": []}
    data["entries"].extend(entries)
    data["meta"]["last_updated"] = datetime.now(timezone.utc).isoformat()
    save_json_file(CHANGE_LOG_PATH, data)
