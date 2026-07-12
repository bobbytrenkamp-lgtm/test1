"""Validate PolicyCandidate objects before adding to the review queue."""
from __future__ import annotations
from .models import PolicyCandidate, LIFECYCLE_STAGES

VALID_POLICY_TYPES = {"data_center", "ai", "crypto", "energy", "water"}
MIN_TITLE_LEN = 8
MIN_DESCRIPTION_LEN = 20
MIN_CONFIDENCE = 0.20


class ValidationError:
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message

    def __str__(self) -> str:
        return f"[{self.field}] {self.message}"


def validate_candidate(candidate: PolicyCandidate) -> list[ValidationError]:
    """Return list of validation errors. Empty list means valid."""
    errors: list[ValidationError] = []

    if not candidate.candidate_id:
        errors.append(ValidationError("candidate_id", "Missing candidate ID"))

    if not candidate.source_id:
        errors.append(ValidationError("source_id", "Missing source ID"))

    if not candidate.title or len(candidate.title) < MIN_TITLE_LEN:
        errors.append(ValidationError(
            "title",
            f"Title too short (< {MIN_TITLE_LEN} chars): {candidate.title!r}"
        ))

    if not candidate.description or len(candidate.description) < MIN_DESCRIPTION_LEN:
        errors.append(ValidationError(
            "description",
            f"Description too short (< {MIN_DESCRIPTION_LEN} chars)"
        ))

    if not candidate.signal_url:
        errors.append(ValidationError("signal_url", "Missing signal URL"))

    if candidate.lifecycle_stage not in LIFECYCLE_STAGES:
        errors.append(ValidationError(
            "lifecycle_stage",
            f"Unknown stage: {candidate.lifecycle_stage!r}. "
            f"Valid: {sorted(LIFECYCLE_STAGES)}"
        ))

    for pt in candidate.policy_types:
        if pt not in VALID_POLICY_TYPES:
            errors.append(ValidationError(
                "policy_types",
                f"Unknown policy type: {pt!r}. Valid: {sorted(VALID_POLICY_TYPES)}"
            ))

    if not candidate.policy_types:
        errors.append(ValidationError("policy_types", "At least one policy type required"))

    if candidate.fips is not None:
        fips = str(candidate.fips)
        if not fips.isdigit() or len(fips) != 5:
            errors.append(ValidationError(
                "fips",
                f"FIPS must be exactly 5 digits: {fips!r}"
            ))

    if not (0.0 <= candidate.confidence <= 1.0):
        errors.append(ValidationError(
            "confidence",
            f"Confidence must be 0.0–1.0, got {candidate.confidence}"
        ))

    if candidate.confidence < MIN_CONFIDENCE:
        errors.append(ValidationError(
            "confidence",
            f"Confidence {candidate.confidence} below minimum {MIN_CONFIDENCE}"
        ))

    if candidate.review_status not in ("pending", "accepted", "rejected", "duplicate"):
        errors.append(ValidationError(
            "review_status",
            f"Unknown review_status: {candidate.review_status!r}"
        ))

    return errors


def is_valid(candidate: PolicyCandidate) -> bool:
    return len(validate_candidate(candidate)) == 0


def filter_valid_candidates(candidates: list[PolicyCandidate]) -> tuple[list, list]:
    """Return (valid_candidates, invalid_candidates_with_errors)."""
    valid = []
    invalid = []
    for c in candidates:
        errors = validate_candidate(c)
        if errors:
            invalid.append((c, errors))
        else:
            valid.append(c)
    return valid, invalid
