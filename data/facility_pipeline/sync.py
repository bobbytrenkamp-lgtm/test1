"""Incremental sync state — track per-source last-sync timestamps and ETags."""
from __future__ import annotations

import os
from typing import Optional

from .models import load_json, save_json, utc_now

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYNC_STATE_PATH = os.path.join(DATA_DIR, "facilities_sync_state.json")

# Re-export for convenience
__all__ = ["SyncState", "SYNC_STATE_PATH"]


class SyncState:
    """Persists last-sync metadata per source so adapters can do incremental fetches."""

    def __init__(self, path: str = SYNC_STATE_PATH):
        self._path = path
        raw = load_json(path) or {}
        self._state: dict[str, dict] = raw

    def get(self, source_id: str) -> dict:
        return dict(self._state.get(source_id, {}))

    def last_synced(self, source_id: str) -> Optional[str]:
        return self._state.get(source_id, {}).get("last_synced")

    def etag(self, source_id: str) -> Optional[str]:
        return self._state.get(source_id, {}).get("etag")

    def last_modified(self, source_id: str) -> Optional[str]:
        return self._state.get(source_id, {}).get("last_modified")

    def update(self, source_id: str, **kwargs) -> None:
        """Record that source_id was just synced.  Merges kwargs into its state entry."""
        entry = self._state.setdefault(source_id, {})
        entry["last_synced"] = utc_now()
        for k, v in kwargs.items():
            if v is not None:
                entry[k] = v
        self._save()

    def mark_failed(self, source_id: str, error: str) -> None:
        entry = self._state.setdefault(source_id, {})
        entry["last_error"] = error
        entry["last_error_at"] = utc_now()
        self._save()

    def _save(self) -> None:
        save_json(self._path, self._state)

    def summary(self) -> dict:
        return {sid: dict(v) for sid, v in self._state.items()}
