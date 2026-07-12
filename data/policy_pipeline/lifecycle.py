"""Lifecycle tracking and transition logic for policy records."""
from __future__ import annotations
from datetime import datetime, timezone
from .models import (
    LifecycleEvent, LIFECYCLE_STAGES, STATUS_TO_LIFECYCLE, LIFECYCLE_TO_STATUS
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def map_status_to_stage(status: str) -> str:
    """Convert restrictions_raw.json 'status' to lifecycle stage."""
    return STATUS_TO_LIFECYCLE.get(status, "effective")


def map_stage_to_status(stage: str) -> str:
    """Convert lifecycle stage back to restrictions_raw.json 'status' value."""
    return LIFECYCLE_TO_STATUS.get(stage, "active")


def build_lifecycle_event(
    from_stage: str | None,
    to_stage: str,
    trigger: str,
    source_url: str | None = None,
    notes: str = "",
) -> LifecycleEvent:
    if to_stage not in LIFECYCLE_STAGES:
        raise ValueError(f"Unknown lifecycle stage: {to_stage!r}")
    return LifecycleEvent(
        timestamp=now_iso(),
        from_stage=from_stage,
        to_stage=to_stage,
        trigger=trigger,
        source_url=source_url,
        notes=notes,
    )


def is_terminal_stage(stage: str) -> bool:
    """Return True if this stage requires no further monitoring (policy resolved)."""
    return stage in {"expired", "repealed", "failed"}


def should_escalate(stage: str, days_since_last_review: int) -> bool:
    """Return True if a record at this stage and age needs human review.

    Thresholds:
      proposed/enacted → escalate after 180 days
      effective        → escalate after 365 days
      discovered       → escalate after 30 days
    """
    thresholds = {
        "discovered":  30,
        "proposed":   180,
        "enacted":    180,
        "effective":  365,
    }
    threshold = thresholds.get(stage)
    if threshold is None:
        return False
    return days_since_last_review > threshold


def add_lifecycle_fields_to_entry(entry: dict) -> dict:
    """Add lifecycle fields to an existing restrictions_raw.json entry.

    Does not modify existing fields. Safe to call on already-migrated entries.
    """
    if "lifecycle_stage" not in entry:
        status = entry.get("status", "active")
        entry["lifecycle_stage"] = map_status_to_stage(status)
    if "pipeline_verified" not in entry:
        entry["pipeline_verified"] = False
    if "last_reviewed" not in entry:
        entry["last_reviewed"] = None
    return entry


def migrate_restrictions_file(raw_data: dict) -> dict:
    """Add lifecycle fields to all entries in a restrictions_raw.json structure."""
    restrictions = raw_data.get("restrictions", [])
    for entry in restrictions:
        add_lifecycle_fields_to_entry(entry)
    return raw_data
