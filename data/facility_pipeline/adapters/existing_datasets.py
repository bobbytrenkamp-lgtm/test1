"""Seed adapter — loads existing data_centers.json and ai_campuses.json."""
from __future__ import annotations

import os
from typing import Iterator

from ..models import FacilityRecord, FacilitySource, SEED_CONFIDENCE, SEED_SOURCE_ID, load_json
from ..normalize import normalize_record_fields
from . import BaseAdapter

DATA_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_CENTERS_PATH = os.path.join(DATA_DIR, "data_centers.json")
AI_CAMPUSES_PATH = os.path.join(DATA_DIR, "ai_campuses.json")

# Map legacy operational status strings to canonical values
_STATUS_MAP = {
    "operational": "operational",
    "active": "operational",
    "under construction": "under_construction",
    "under_construction": "under_construction",
    "planned": "planned",
    "decommissioned": "decommissioned",
    "mothballed": "mothballed",
}


def _map_status(raw: str) -> str:
    return _STATUS_MAP.get((raw or "").lower().strip(), "unknown")


def _facility_type_flags(record: FacilityRecord) -> None:
    """Set boolean type flags from the facility_type string."""
    t = record.facility_type
    record.is_hyperscale = t == "hyperscale"
    record.is_enterprise = t == "enterprise"
    record.is_colocation = t == "colocation"
    record.is_edge = t == "edge"
    record.is_cloud = t == "cloud"


def _from_legacy(d: dict, is_campus: bool = False) -> FacilityRecord:
    """Convert a legacy data_centers.json / ai_campuses.json entry to FacilityRecord."""
    r = FacilityRecord()

    r.name = d.get("name", "")
    r.operator = d.get("operator", d.get("owner", ""))
    r.owner = d.get("owner", "")
    r.parent_company = d.get("parent_company", "")

    r.street_address = d.get("address", d.get("street_address", ""))
    r.city = d.get("city", "")
    r.county = d.get("county", "")
    r.county_fips = str(d.get("county_fips", "")).zfill(5) if d.get("county_fips") else ""
    r.state = d.get("state", "")
    r.state_abbr = d.get("state_abbr", "")
    r.zip_code = str(d.get("zip_code", d.get("zip", ""))).strip()

    r.latitude = d.get("lat")
    r.longitude = d.get("lon") or d.get("lng")

    r.operational_status = _map_status(d.get("status", ""))
    r.operational_date = str(d.get("year_built", "")) if d.get("year_built") else ""

    r.facility_type = "hyperscale" if is_campus else d.get("facility_type", "unknown")
    if is_campus:
        r.facility_type = "hyperscale"
    _facility_type_flags(r)

    mw = d.get("capacity_mw")
    if mw:
        try:
            r.capacity_mw_known = float(mw)
        except (TypeError, ValueError):
            pass

    r.notes = d.get("notes", "")
    r.primary_source = SEED_SOURCE_ID
    r.confidence_score = SEED_CONFIDENCE
    r.confidence_tier = 2

    # Preserve any legacy id as a note rather than overwriting the generated facility_id
    legacy_id = d.get("id", "")
    if legacy_id and not r.notes:
        r.notes = f"legacy_id:{legacy_id}"
    elif legacy_id:
        r.notes = f"{r.notes}; legacy_id:{legacy_id}"

    normalize_record_fields(r)
    return r


class ExistingDatasetsAdapter(BaseAdapter):
    """Yields records from the hand-curated data_centers.json and ai_campuses.json."""

    def __init__(self, source: FacilitySource):
        super().__init__(source)

    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        # since is ignored — seed data is always fully loaded
        dc = load_json(DATA_CENTERS_PATH) or []
        if isinstance(dc, dict):
            dc = dc.get("data_centers", dc.get("facilities", []))
        for entry in dc:
            r = _from_legacy(entry, is_campus=False)
            yield self._stamp(r)

        ac = load_json(AI_CAMPUSES_PATH) or []
        if isinstance(ac, dict):
            ac = ac.get("campuses", ac.get("facilities", []))
        for entry in ac:
            r = _from_legacy(entry, is_campus=True)
            yield self._stamp(r)
