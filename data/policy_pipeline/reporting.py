"""Generate source health reports and pipeline run summaries."""
from __future__ import annotations
import os
from datetime import datetime, timezone
from .models import SourceHealth, PolicyCandidate, save_json_file, load_json_file

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
    """Upsert a SourceHealth record into the health_data dict."""
    sources = health_data.setdefault("sources", {})
    entry = health.to_dict()
    if health.reachable:
        entry["consecutive_failures"] = 0
    else:
        prev = sources.get(health.source_id, {})
        entry["consecutive_failures"] = prev.get("consecutive_failures", 0) + 1
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


def append_change_log(entries: list[dict]) -> None:
    """Append new change log entries to policy_change_log.json."""
    data = load_json_file(CHANGE_LOG_PATH)
    if data is None:
        data = {"meta": {"description": "Log of detected changes in monitored government sources."}, "entries": []}
    data["entries"].extend(entries)
    data["meta"]["last_updated"] = datetime.now(timezone.utc).isoformat()
    save_json_file(CHANGE_LOG_PATH, data)
