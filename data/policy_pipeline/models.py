"""Data models for the government-source policy pipeline."""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional
import json


# ---------------------------------------------------------------------------
# Lifecycle stages — more granular than restrictions_raw.json "status"
# ---------------------------------------------------------------------------
LIFECYCLE_STAGES = frozenset({
    "discovered",   # Signal found in government source; not yet validated
    "proposed",     # Formal proposal / bill introduced
    "enacted",      # Passed by governing body but not yet effective
    "effective",    # In effect (maps to status="active" in restrictions_raw.json)
    "expired",      # Time-limited rule that has lapsed
    "repealed",     # Explicitly repealed
    "failed",       # Proposed but did not pass
})

STATUS_TO_LIFECYCLE = {
    "active":   "effective",
    "proposed": "proposed",
    "expired":  "expired",
}

LIFECYCLE_TO_STATUS = {
    "effective": "active",
    "proposed":  "proposed",
    "enacted":   "proposed",   # Not yet effective — still counts as proposed in legacy schema
    "expired":   "expired",
    "repealed":  "expired",
    "failed":    "expired",
    "discovered": "proposed",
}


@dataclass
class PolicySource:
    """A configured government source to monitor (from government_sources.json)."""
    id: str
    jurisdiction_type: str         # "state", "county", "city", "special_district", "federal"
    jurisdiction_name: str
    state: Optional[str]
    state_abbr: Optional[str]
    state_fips: Optional[str]
    fips: Optional[str]            # 5-digit county FIPS; None for state-level
    title: str
    url: Optional[str]
    url_verified: bool
    last_checked: Optional[str]    # ISO date
    tier: int                      # 1 = gov, 2 = industry, 3 = news
    adapter: str
    active: bool
    policy_types: list[str]
    notes: str

    @classmethod
    def from_dict(cls, d: dict) -> "PolicySource":
        return cls(
            id=d["id"],
            jurisdiction_type=d["jurisdiction_type"],
            jurisdiction_name=d["jurisdiction_name"],
            state=d.get("state"),
            state_abbr=d.get("state_abbr"),
            state_fips=d.get("state_fips"),
            fips=d.get("fips"),
            title=d["title"],
            url=d.get("url"),
            url_verified=d.get("url_verified", False),
            last_checked=d.get("last_checked"),
            tier=d.get("tier", 1),
            adapter=d.get("adapter", "generic_html"),
            active=d.get("active", True),
            policy_types=d.get("policy_types", []),
            notes=d.get("notes", ""),
        )

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class LifecycleEvent:
    """A recorded transition in a policy's lifecycle."""
    timestamp: str          # ISO datetime
    from_stage: Optional[str]
    to_stage: str
    trigger: str            # "pipeline_discovery", "manual_review", "source_update"
    source_url: Optional[str]
    notes: str = ""


@dataclass
class PolicyCandidate:
    """A policy signal discovered by the pipeline; awaits human review."""
    candidate_id: str           # Deterministic slug: {source_id}-{hash(title+fips)}
    source_id: str              # Which government_sources.json entry found this
    discovered_at: str          # ISO datetime
    jurisdiction_name: str
    state: Optional[str]
    state_abbr: Optional[str]
    fips: Optional[str]
    title: str
    description: str
    signal_url: str             # The specific page/document URL where this was found
    lifecycle_stage: str        # From LIFECYCLE_STAGES
    policy_types: list[str]
    confidence: float           # 0.0–1.0 — how confident we are this is relevant
    evidence: str               # Quoted snippet or summary of why this is flagged
    existing_fips_match: Optional[str]  # FIPS of existing restrictions_raw.json entry, if any
    review_status: str          # "pending", "accepted", "rejected", "duplicate"
    reviewer_notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "PolicyCandidate":
        return cls(**{k: d.get(k, v) for k, v in cls.__dataclass_fields__.items()})


@dataclass
class SourceHealth:
    """Health status for a configured source URL."""
    source_id: str
    url: Optional[str]
    last_checked: str       # ISO datetime
    http_status: Optional[int]
    reachable: bool
    response_ms: Optional[int]
    error: Optional[str]
    robots_allowed: bool    # Whether robots.txt permits our user agent
    consecutive_failures: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PolicyChangeLog:
    """A recorded change detected in a monitored policy source."""
    log_id: str
    source_id: str
    detected_at: str        # ISO datetime
    change_type: str        # "new_document", "status_change", "url_broken", "content_change"
    url: str
    summary: str
    raw_excerpt: str = ""
    acted_on: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


def load_json_file(path: str) -> dict | list | None:
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {path}: {e}") from e


def save_json_file(path: str, data: dict | list, indent: int = 2) -> None:
    with open(path, "w") as f:
        json.dump(data, f, indent=indent)
