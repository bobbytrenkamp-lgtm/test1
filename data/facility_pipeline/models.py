"""Data models for the facility pipeline."""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

OPERATIONAL_STATUSES = frozenset({
    "operational",
    "under_construction",
    "planned",
    "decommissioned",
    "mothballed",
    "unknown",
})

FACILITY_TYPES = frozenset({
    "hyperscale",
    "enterprise",
    "colocation",
    "edge",
    "cloud",
    "mixed",
    "unknown",
})

COOLING_METHODS = frozenset({
    "air",
    "water",
    "liquid_immersion",
    "evaporative",
    "hybrid",
    "geothermal",
    "unknown",
})

# Source tier definitions (1 = highest trust)
SOURCE_TIER_LABELS = {
    1: "company_official",   # Direct company page, press release, or investor filing
    2: "aggregator",         # Cloudscene, DataCenterMap, industry databases
    3: "osm",                # OpenStreetMap community-tagged features
    4: "discovery",          # EPA permits, planning docs, SEC filings, utility queues
    5: "news",               # News articles — candidate only, never auto-promoted
}

# Baseline confidence score by tier (before adjustments)
TIER_BASE_CONFIDENCE: dict[int, float] = {
    1: 0.92,
    2: 0.80,
    3: 0.72,
    4: 0.60,
    5: 0.45,
}

# Existing hand-curated data (data_centers.json, ai_campuses.json) is treated
# as tier-2 equivalent but assigned its own label for auditability.
SEED_SOURCE_ID = "existing_data_centers"
SEED_CONFIDENCE = 0.85


def new_facility_id() -> str:
    return "fc-" + uuid.uuid4().hex[:10]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Core dataclass — FacilityRecord
# ---------------------------------------------------------------------------

@dataclass
class FacilityRecord:
    """One canonical data center / AI campus facility record."""

    # ── Identity ──────────────────────────────────────────────────────────
    facility_id: str = field(default_factory=new_facility_id)
    name: str = ""
    aliases: list[str] = field(default_factory=list)

    # ── Operator / Owner ──────────────────────────────────────────────────
    operator: str = ""
    owner: str = ""
    parent_company: str = ""

    # ── Location ─────────────────────────────────────────────────────────
    street_address: str = ""
    city: str = ""
    county: str = ""
    county_fips: str = ""       # 5-digit FIPS code
    state: str = ""
    state_abbr: str = ""
    zip_code: str = ""
    country: str = "US"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # ── Status ────────────────────────────────────────────────────────────
    operational_status: str = "unknown"     # see OPERATIONAL_STATUSES
    operational_date: str = ""              # ISO date or bare year
    construction_date: str = ""
    planned_date: str = ""

    # ── Facility type ─────────────────────────────────────────────────────
    facility_type: str = "unknown"          # see FACILITY_TYPES
    is_hyperscale: bool = False
    is_enterprise: bool = False
    is_colocation: bool = False
    is_edge: bool = False
    is_cloud: bool = False

    # ── Capacity ──────────────────────────────────────────────────────────
    capacity_mw_known: Optional[float] = None
    capacity_mw_planned: Optional[float] = None
    campus_total_mw: Optional[float] = None

    # ── Infrastructure ────────────────────────────────────────────────────
    power_utility: str = ""
    water_utility: str = ""
    cooling_method: str = "unknown"         # see COOLING_METHODS

    # ── Size ─────────────────────────────────────────────────────────────
    land_area_acres: Optional[float] = None
    building_sqft: Optional[float] = None
    campus_size_acres: Optional[float] = None

    # ── Provenance ────────────────────────────────────────────────────────
    primary_source: str = ""                # source ID from facility_sources.json
    secondary_sources: list[str] = field(default_factory=list)
    source_urls: list[str] = field(default_factory=list)
    last_verified_date: str = ""            # ISO date
    confidence_score: float = 0.0           # 0.0–1.0
    confidence_tier: int = 5                # 1–5

    # ── External IDs (populated by adapters) ──────────────────────────────
    osm_id: str = ""                        # "n{id}", "w{id}", or "r{id}"
    dcm_id: str = ""                        # DataCenterMap listing ID
    cloudscene_id: str = ""                 # Cloudscene listing slug

    # ── Pipeline metadata ─────────────────────────────────────────────────
    created_at: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)
    version: int = 1                        # Monotonically increasing
    is_candidate: bool = False              # True = needs human review
    merged_from: list[str] = field(default_factory=list)
    notes: str = ""

    # ── Serialisation helpers ─────────────────────────────────────────────

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "FacilityRecord":
        valid = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in d.items() if k in valid})

    def touch(self) -> None:
        """Bump version and updated_at on any mutation."""
        self.version += 1
        self.updated_at = utc_now()

    def merge_source(self, source_id: str, url: str = "") -> None:
        if source_id and source_id not in self.secondary_sources and source_id != self.primary_source:
            self.secondary_sources.append(source_id)
        if url and url not in self.source_urls:
            self.source_urls.append(url)


# ---------------------------------------------------------------------------
# FacilitySource — a row in facility_sources.json
# ---------------------------------------------------------------------------

@dataclass
class FacilitySource:
    """A configured data source for the facility pipeline."""
    id: str
    name: str
    tier: int                       # 1–5
    adapter: str                    # adapter module name
    url: Optional[str] = None
    active: bool = True
    requires_auth: bool = False
    auth_env_var: str = ""          # env var that holds the API key / token
    rate_limit_rpm: int = 60        # requests per minute
    last_synced: Optional[str] = None
    etag: Optional[str] = None      # HTTP ETag for incremental updates
    last_modified: Optional[str] = None
    notes: str = ""
    operator_filter: str = ""       # if set, records from this source map to this operator
    confidence_override: Optional[float] = None   # overrides TIER_BASE_CONFIDENCE

    @property
    def confidence(self) -> float:
        if self.confidence_override is not None:
            return self.confidence_override
        return TIER_BASE_CONFIDENCE.get(self.tier, 0.5)

    @classmethod
    def from_dict(cls, d: dict) -> "FacilitySource":
        valid = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in d.items() if k in valid})

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# MergeCandidate — pairing of two records that may be duplicates
# ---------------------------------------------------------------------------

@dataclass
class MergeCandidate:
    """Two facility records that the deduplicator believes may be the same facility."""
    record_a_id: str
    record_b_id: str
    geo_match: bool = False
    address_match: bool = False
    name_match: bool = False
    geo_distance_m: Optional[float] = None
    name_similarity: float = 0.0
    match_score: int = 0            # Sum of matched signals (0–3)
    auto_mergeable: bool = False    # True if match_score >= 2
    review_required: bool = False   # True if match_score == 1
    merged: bool = False
    merged_into: str = ""           # facility_id of the surviving record


# ---------------------------------------------------------------------------
# FacilityChangeLog — one entry in facilities_changelog.json
# ---------------------------------------------------------------------------

@dataclass
class FacilityChangeLog:
    """One change detected in a pipeline run."""
    log_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: str = field(default_factory=utc_now)
    change_type: str = ""   # "added", "updated", "removed", "merged", "candidate_added",
                            #  "verification_failure", "duplicate_detected"
    facility_id: str = ""
    source_id: str = ""
    summary: str = ""
    field_changes: dict = field(default_factory=dict)  # {field: {"from": old, "to": new}}
    pipeline_run_id: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def load_json(path: str):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {path}: {e}") from e


def save_json(path: str, data, indent: int = 2) -> None:
    with open(path, "w") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)
