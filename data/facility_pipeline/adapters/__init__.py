"""Base adapter ABC for facility data sources."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterator

from ..models import FacilityRecord, FacilitySource


class BaseAdapter(ABC):
    """All source adapters implement this interface."""

    def __init__(self, source: FacilitySource):
        self.source = source

    @property
    def source_id(self) -> str:
        return self.source.id

    @property
    def confidence(self) -> float:
        return self.source.confidence

    @abstractmethod
    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        """Yield FacilityRecord objects from the source.

        `since` is an ISO timestamp; adapters should use it for incremental
        fetches where the source supports it.  Pass None for a full pull.
        """

    def _stamp(self, record: FacilityRecord) -> FacilityRecord:
        """Apply source provenance fields to a record."""
        record.primary_source = self.source_id
        record.confidence_score = self.confidence
        record.confidence_tier = self.source.tier
        return record
