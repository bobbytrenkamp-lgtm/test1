"""Cloudscene adapter stub.

Cloudscene requires a paid API key (CLOUDSCENE_API_KEY env var).
This stub raises a clear error when invoked without credentials.

When a valid API key is available this module will use the Cloudscene
Facilities API to retrieve US data center listings.
"""
from __future__ import annotations

import os
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from . import BaseAdapter

CLOUDSCENE_API_BASE = "https://api.cloudscene.com/v1"
AUTH_ENV_VAR = "CLOUDSCENE_API_KEY"


class CloudsceneAdapter(BaseAdapter):
    """Fetches US data center records from the Cloudscene API."""

    def __init__(self, source: FacilitySource):
        super().__init__(source)
        self._api_key = os.environ.get(AUTH_ENV_VAR, "")

    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        if not self._api_key:
            raise EnvironmentError(
                f"Cloudscene adapter requires {AUTH_ENV_VAR} to be set. "
                "This source is skipped when the env var is absent."
            )
        # Full implementation requires a paid Cloudscene API subscription.
        # Placeholder: when key is present, this would call:
        #   GET /facilities?country=US&page=1&per_page=100
        # and paginate until exhausted.
        raise NotImplementedError(
            "Cloudscene API integration is not yet implemented. "
            "Set CLOUDSCENE_API_KEY and implement pagination in this adapter."
        )
