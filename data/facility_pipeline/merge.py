"""Confidence-based field merge for facility records.

Rules:
- Higher-confidence source always wins for a given field.
- A non-null/non-empty value from a lower-confidence source NEVER
  overwrites a non-null/non-empty value from a higher-confidence source.
- Null / empty values are filled in from any source regardless of confidence.
- Secondary sources and source URLs are accumulated (de-duplicated).
"""
from __future__ import annotations

from typing import Any

from .models import FacilityRecord, utc_now

# Fields that are accumulated across sources (never overwritten)
_ACCUMULATE_FIELDS = {"secondary_sources", "source_urls", "merged_from", "aliases"}

# Fields that should never be downgraded to lower-confidence values
_MERGE_FIELDS: list[str] = [
    "name",
    "operator",
    "owner",
    "parent_company",
    "street_address",
    "city",
    "county",
    "county_fips",
    "state",
    "state_abbr",
    "zip_code",
    "latitude",
    "longitude",
    "operational_status",
    "operational_date",
    "construction_date",
    "planned_date",
    "facility_type",
    "is_hyperscale",
    "is_enterprise",
    "is_colocation",
    "is_edge",
    "is_cloud",
    "capacity_mw_known",
    "capacity_mw_planned",
    "campus_total_mw",
    "power_utility",
    "water_utility",
    "cooling_method",
    "land_area_acres",
    "building_sqft",
    "campus_size_acres",
    "last_verified_date",
    "osm_id",
    "dcm_id",
    "cloudscene_id",
    "notes",
]


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return False
    return False


def merge_into(
    base: FacilityRecord,
    incoming: FacilityRecord,
    incoming_confidence: float,
) -> list[str]:
    """Merge `incoming` into `base` in-place using confidence rules.

    Returns a list of field names that were updated.
    """
    base_confidence = base.confidence_score
    changed: list[str] = []

    for field_name in _MERGE_FIELDS:
        base_val = getattr(base, field_name, None)
        inc_val = getattr(incoming, field_name, None)

        if _is_empty(inc_val):
            continue

        if _is_empty(base_val):
            # Fill in missing data from any source
            setattr(base, field_name, inc_val)
            changed.append(field_name)
        elif incoming_confidence > base_confidence:
            # Higher-confidence source overwrites
            if inc_val != base_val:
                setattr(base, field_name, inc_val)
                changed.append(field_name)

    # Accumulate secondary_sources
    if incoming.primary_source and incoming.primary_source != base.primary_source:
        if incoming.primary_source not in base.secondary_sources:
            base.secondary_sources.append(incoming.primary_source)
            changed.append("secondary_sources")

    for src in incoming.secondary_sources:
        if src and src not in base.secondary_sources and src != base.primary_source:
            base.secondary_sources.append(src)

    # Accumulate source_urls
    for url in incoming.source_urls:
        if url and url not in base.source_urls:
            base.source_urls.append(url)
            changed.append("source_urls")

    # Accumulate aliases
    for alias in getattr(incoming, "aliases", []):
        if alias and alias not in base.aliases and alias != base.name:
            base.aliases.append(alias)

    # Promote confidence score if incoming is higher
    if incoming_confidence > base_confidence:
        base.confidence_score = incoming_confidence
        base.confidence_tier = incoming.confidence_tier
        base.primary_source = incoming.primary_source
        changed.append("confidence_score")

    if changed:
        base.touch()

    return changed


def merge_records(
    winner: FacilityRecord,
    loser: FacilityRecord,
) -> FacilityRecord:
    """Merge loser into winner.  Winner keeps its facility_id.

    The surviving record inherits the higher-confidence fields from both sides.
    """
    w_conf = winner.confidence_score
    l_conf = loser.confidence_score

    # Always merge the lower-confidence record into the higher-confidence one
    if l_conf > w_conf:
        winner, loser = loser, winner

    merge_into(winner, loser, loser.confidence_score)

    # Track provenance
    if loser.facility_id not in winner.merged_from:
        winner.merged_from.append(loser.facility_id)

    winner.touch()
    return winner
