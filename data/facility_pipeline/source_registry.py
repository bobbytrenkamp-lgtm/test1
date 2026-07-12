"""Load and query the facility_sources.json registry."""
from __future__ import annotations

import os
from typing import Iterator

from .models import FacilitySource, load_json

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES_PATH = os.path.join(DATA_DIR, "facility_sources.json")


class FacilitySourceRegistry:
    """Loads facility_sources.json and provides filtered views."""

    def __init__(self, path: str = SOURCES_PATH):
        raw = load_json(path)
        if raw is None:
            raise FileNotFoundError(f"facility_sources.json not found at {path}")
        self._meta: dict = raw.get("meta", {})
        self._sources: list[FacilitySource] = [
            FacilitySource.from_dict(s) for s in raw.get("sources", [])
        ]

    @property
    def meta(self) -> dict:
        return self._meta

    @property
    def all_sources(self) -> list[FacilitySource]:
        return list(self._sources)

    def active(self) -> list[FacilitySource]:
        return [s for s in self._sources if s.active]

    def by_tier(self, tier: int) -> list[FacilitySource]:
        return [s for s in self._sources if s.tier == tier and s.active]

    def by_adapter(self, adapter: str) -> list[FacilitySource]:
        return [s for s in self._sources if s.adapter == adapter and s.active]

    def get(self, source_id: str) -> FacilitySource | None:
        return next((s for s in self._sources if s.id == source_id), None)

    def iter_fetchable(self) -> Iterator[FacilitySource]:
        """Yield active sources with a URL that don't require unavailable auth."""
        for s in self._sources:
            if not s.active:
                continue
            if s.requires_auth:
                env_val = os.environ.get(s.auth_env_var, "")
                if not env_val:
                    continue
            yield s

    def summary(self) -> dict:
        active = self.active()
        by_tier: dict[str, int] = {}
        by_adapter: dict[str, int] = {}
        for s in active:
            t = str(s.tier)
            by_tier[t] = by_tier.get(t, 0) + 1
            by_adapter[s.adapter] = by_adapter.get(s.adapter, 0) + 1
        return {
            "total": len(self._sources),
            "active": len(active),
            "fetchable": sum(1 for _ in self.iter_fetchable()),
            "by_tier": by_tier,
            "by_adapter": by_adapter,
        }

    def update_sync_state(self, source_id: str, path: str = SOURCES_PATH, **kwargs) -> None:
        """Persist last_synced / etag / last_modified back to facility_sources.json."""
        raw = load_json(path) or {"meta": {}, "sources": []}
        for entry in raw.get("sources", []):
            if entry.get("id") == source_id:
                for k, v in kwargs.items():
                    entry[k] = v
                break
        from .models import save_json
        save_json(path, raw)
        s = self.get(source_id)
        if s:
            for k, v in kwargs.items():
                if hasattr(s, k):
                    setattr(s, k, v)
