"""Classify policy text by type, level, and lifecycle stage."""
from __future__ import annotations
import re

# ---------------------------------------------------------------------------
# Policy type signal keywords
# ---------------------------------------------------------------------------
TYPE_SIGNALS: dict[str, list[str]] = {
    "data_center": [
        "data center", "datacenter", "data centre", "hyperscale", "colocation",
        "server farm", "cloud computing facility", "computing facility",
        "high-density computing", "high intensity computing",
    ],
    "ai": [
        "artificial intelligence", r"\bai\b", "machine learning", "facial recognition",
        "automated decision", "algorithmic", "large language model", r"\bllm\b",
        "generative ai", "deep learning",
    ],
    "crypto": [
        "cryptocurrency", "crypto mining", "bitcoin mining", "proof.of.work",
        "blockchain mining", "digital currency mining", "virtual currency mining",
        "high.intensity computing", "mining operation",
    ],
    "energy": [
        r"\benergy\b", "electricity", "grid capacity", "power demand", "megawatt",
        r"\bmw\b", "kilowatt", "curtailment", "demand response", "interconnection",
        "carbon emission", "greenhouse gas", r"\bghg\b", "emissions limit",
    ],
    "water": [
        r"\bwater\b", "groundwater", "aquifer", "water supply", "water use",
        "cooling water", "drought", "water scarcity", "water shortage",
        "evaporative cooling", "water management",
    ],
}

# ---------------------------------------------------------------------------
# Restriction level signal keywords
# ---------------------------------------------------------------------------
LEVEL_SIGNALS: dict[int, list[str]] = {
    4: ["outright ban", "permanent ban", "prohibit", "prohibited", "illegal",
        "outlawed", "comprehensive ban"],
    3: ["moratorium", "temporary ban", "active restriction", "density limit",
        "zone ban", "halt", "freeze"],
    2: ["pending legislation", "proposed moratorium", "significant permitting",
        "enhanced review", "impact assessment required", "growth management"],
    1: ["environmental review", "disclosure required", "minor requirement",
        "light regulation", "ceqa", "sepa", "energy benchmarking"],
    -1: ["tax exemption", "tax abatement", "incentive", "enterprise zone",
         "economic development", "sales tax exempt", "property tax exempt",
         "opportunity zone", "data center hub", "pro.datacenter"],
}

# ---------------------------------------------------------------------------
# Lifecycle stage signals
# ---------------------------------------------------------------------------
STAGE_SIGNALS: dict[str, list[str]] = {
    "proposed": ["introduced", "proposed", "under consideration", "pending", "draft",
                 "first reading", "referred to committee", "under review"],
    "enacted":  ["passed", "adopted", "approved", "signed into law", "enacted",
                 "ordinance no.", "resolution no."],
    "effective": ["in effect", "effective", "currently active", "ongoing",
                  "enforcement", "compliance required"],
    "expired":  ["expired", "sunset", "lapsed", "no longer in effect", "terminated"],
    "repealed": ["repealed", "rescinded", "revoked", "withdrawn", "overturned"],
    "failed":   ["failed", "defeated", "rejected", "tabled", "did not pass",
                 "withdrawn before vote"],
}

# Pre-compile patterns
_TYPE_RE: dict[str, re.Pattern] = {
    k: re.compile("|".join(v), re.I) for k, v in TYPE_SIGNALS.items()
}
_LEVEL_RE: dict[int, re.Pattern] = {
    k: re.compile("|".join(re.escape(kw) if not kw.startswith(r"\b") else kw for kw in v), re.I)
    for k, v in LEVEL_SIGNALS.items()
}
_STAGE_RE: dict[str, re.Pattern] = {
    k: re.compile("|".join(re.escape(kw) for kw in v), re.I)
    for k, v in STAGE_SIGNALS.items()
}


def classify_policy_types(text: str) -> list[str]:
    """Return list of policy types matched in text."""
    found = []
    for ptype, pattern in _TYPE_RE.items():
        if pattern.search(text):
            found.append(ptype)
    return found


def classify_level(text: str) -> int:
    """Return restriction level (-1 to 4) based on strongest signal in text.
    Returns 0 if no level signals are found.
    """
    for level in (4, 3, 2, -1, 1):
        if _LEVEL_RE[level].search(text):
            return level
    return 0


def classify_lifecycle_stage(text: str) -> str:
    """Return most likely lifecycle stage based on text signals.
    Defaults to 'proposed' if no stage signal is found.
    """
    # Ordered by specificity
    for stage in ("failed", "repealed", "expired", "effective", "enacted", "proposed"):
        if _STAGE_RE[stage].search(text):
            return stage
    return "proposed"


def score_relevance(text: str, source_policy_types: list[str]) -> float:
    """Return a 0.0–1.0 confidence score for how relevant this text is.

    Combines: policy type match weight, level signal presence, length of text.
    """
    if not text:
        return 0.0

    matched_types = classify_policy_types(text)
    overlap = len(set(matched_types) & set(source_policy_types))
    type_score = min(overlap / max(len(source_policy_types), 1), 1.0) * 0.5

    # Level signal presence adds confidence
    level = classify_level(text)
    level_score = 0.3 if level != 0 else 0.0

    # Text length proxy for substantive content
    word_count = len(text.split())
    length_score = min(word_count / 200, 1.0) * 0.2

    return round(type_score + level_score + length_score, 3)
