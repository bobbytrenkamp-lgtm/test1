"""Load and query the government_sources.json registry."""
from __future__ import annotations
import os
from typing import Iterator
from .models import PolicySource, load_json_file

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES_PATH = os.path.join(DATA_DIR, "government_sources.json")


class SourceRegistry:
    """Loads government_sources.json and provides filtered views of it."""

    def __init__(self, path: str = SOURCES_PATH):
        raw = load_json_file(path)
        if raw is None:
            raise FileNotFoundError(f"government_sources.json not found at {path}")
        self._meta = raw.get("meta", {})
        self._sources: list[PolicySource] = [
            PolicySource.from_dict(s) for s in raw.get("sources", [])
        ]

    @property
    def meta(self) -> dict:
        return self._meta

    @property
    def all_sources(self) -> list[PolicySource]:
        return list(self._sources)

    def active_sources(self) -> list[PolicySource]:
        return [s for s in self._sources if s.active]

    def by_state(self, state_abbr: str) -> list[PolicySource]:
        return [s for s in self._sources if s.state_abbr == state_abbr and s.active]

    def by_fips(self, fips: str) -> list[PolicySource]:
        return [s for s in self._sources if s.fips == fips and s.active]

    def by_adapter(self, adapter: str) -> list[PolicySource]:
        return [s for s in self._sources if s.adapter == adapter and s.active]

    def by_tier(self, tier: int) -> list[PolicySource]:
        return [s for s in self._sources if s.tier == tier and s.active]

    def by_policy_type(self, policy_type: str) -> list[PolicySource]:
        return [s for s in self._sources if policy_type in s.policy_types and s.active]

    def get(self, source_id: str) -> PolicySource | None:
        for s in self._sources:
            if s.id == source_id:
                return s
        return None

    def iter_checkable(self) -> Iterator[PolicySource]:
        """Yield active sources that have a non-null URL."""
        for s in self._sources:
            if s.active and s.url:
                yield s

    def summary(self) -> dict:
        active = self.active_sources()
        by_type: dict[str, int] = {}
        by_adapter: dict[str, int] = {}
        by_tier: dict[str, int] = {}
        for s in active:
            for pt in s.policy_types:
                by_type[pt] = by_type.get(pt, 0) + 1
            by_adapter[s.adapter] = by_adapter.get(s.adapter, 0) + 1
            by_tier[str(s.tier)] = by_tier.get(str(s.tier), 0) + 1
        return {
            "total": len(self._sources),
            "active": len(active),
            "with_url": sum(1 for s in active if s.url),
            "by_policy_type": by_type,
            "by_adapter": by_adapter,
            "by_tier": by_tier,
        }
