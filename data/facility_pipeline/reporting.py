"""Changelog read/write and version snapshot for the facility pipeline."""
from __future__ import annotations

import os

from .models import FacilityChangeLog, load_json, save_json, utc_now

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHANGELOG_PATH = os.path.join(DATA_DIR, "facilities_changelog.json")
MASTER_PATH = os.path.join(DATA_DIR, "facilities_master.json")
CANDIDATES_PATH = os.path.join(DATA_DIR, "facilities_candidates.json")
VERSION_DIR = os.path.join(DATA_DIR, "facilities_version_history")


def append_changelog(entry: FacilityChangeLog, path: str = CHANGELOG_PATH) -> None:
    """Append one change-log entry to facilities_changelog.json."""
    raw = load_json(path) or []
    raw.append(entry.to_dict())
    save_json(path, raw)


def append_changelogs(
    entries: list[FacilityChangeLog], path: str = CHANGELOG_PATH
) -> None:
    if not entries:
        return
    raw = load_json(path) or []
    raw.extend(e.to_dict() for e in entries)
    save_json(path, raw)


def load_master(path: str = MASTER_PATH) -> list[dict]:
    return load_json(path) or []


def save_master(records: list, path: str = MASTER_PATH) -> None:
    data = [r.to_dict() if hasattr(r, "to_dict") else r for r in records]
    save_json(path, data)


def load_candidates(path: str = CANDIDATES_PATH) -> list[dict]:
    return load_json(path) or []


def save_candidates(records: list, path: str = CANDIDATES_PATH) -> None:
    data = [r.to_dict() if hasattr(r, "to_dict") else r for r in records]
    save_json(path, data)


def snapshot_master(path: str = MASTER_PATH, version_dir: str = VERSION_DIR) -> str:
    """Write a timestamped copy of the master file to the version history dir.

    Returns the path of the snapshot file.
    """
    os.makedirs(version_dir, exist_ok=True)
    data = load_json(path) or []
    ts = utc_now().replace(":", "-").replace("+", "Z")[:19]
    snap_path = os.path.join(version_dir, f"{ts}.json")
    save_json(snap_path, data)
    return snap_path


def run_summary(
    added: int,
    updated: int,
    merged: int,
    candidates_added: int,
    errors: int,
    run_id: str,
) -> dict:
    return {
        "run_id": run_id,
        "timestamp": utc_now(),
        "added": added,
        "updated": updated,
        "merged": merged,
        "candidates_added": candidates_added,
        "errors": errors,
    }
