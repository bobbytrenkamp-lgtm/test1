"""Address normalization and coordinate validation for facility records."""
from __future__ import annotations

import re
from typing import Optional

# US bounding box (continental + AK + HI)
LAT_MIN, LAT_MAX = 17.5, 71.5
LON_MIN, LON_MAX = -179.9, -66.0

# State name → abbreviation
STATE_ABBR: dict[str, str] = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
    "puerto rico": "PR", "guam": "GU",
}

ABBR_TO_NAME: dict[str, str] = {v: k.title() for k, v in STATE_ABBR.items()}

# Street type expansions (abbreviation → canonical)
_STREET_TYPES = {
    r"\bST\b": "Street", r"\bAVE?\b": "Avenue", r"\bBLVD\b": "Boulevard",
    r"\bDR\b": "Drive", r"\bRD\b": "Road", r"\bLN\b": "Lane",
    r"\bCT\b": "Court", r"\bPL\b": "Place", r"\bCIR\b": "Circle",
    r"\bPKWY\b": "Parkway", r"\bHWY\b": "Highway", r"\bFWY\b": "Freeway",
    r"\bTER?\b": "Terrace", r"\bWAY\b": "Way", r"\bSQ\b": "Square",
    r"\bTRL\b": "Trail", r"\bBYPS?\b": "Bypass", r"\bROUTE\b": "Route",
}

_DIRECTION = {
    r"\bN\b": "North", r"\bS\b": "South", r"\bE\b": "East", r"\bW\b": "West",
    r"\bNE\b": "Northeast", r"\bNW\b": "Northwest",
    r"\bSE\b": "Southeast", r"\bSW\b": "Southwest",
}


def normalize_state(value: str) -> tuple[str, str]:
    """Return (full_name, abbreviation) for a US state string.

    Accepts either full name or 2-letter abbreviation.
    Returns ("", "") if unrecognised.
    """
    if not value:
        return ("", "")
    v = value.strip()
    if len(v) == 2:
        abbr = v.upper()
        name = ABBR_TO_NAME.get(abbr, "")
        return (name, abbr) if name else ("", "")
    lower = v.lower()
    abbr = STATE_ABBR.get(lower, "")
    return (v.title(), abbr) if abbr else ("", "")


def normalize_zip(value: str) -> str:
    """Return 5-digit ZIP or empty string."""
    if not value:
        return ""
    digits = re.sub(r"\D", "", value)
    return digits[:5] if len(digits) >= 5 else ""


def normalize_street(value: str) -> str:
    """Expand common street abbreviations and title-case the address."""
    if not value:
        return ""
    s = value.strip().upper()
    for pat, replacement in _STREET_TYPES.items():
        s = re.sub(pat, replacement, s)
    for pat, replacement in _DIRECTION.items():
        s = re.sub(pat, replacement, s)
    return s.title()


def normalize_name(value: str) -> str:
    """Strip extra whitespace and normalise capitalization for facility names."""
    if not value:
        return ""
    return " ".join(value.split())


def normalize_operator(value: str) -> str:
    """Strip legal suffixes for comparison; preserve original for storage."""
    if not value:
        return ""
    return " ".join(value.split())


def validate_coordinates(lat: Optional[float], lon: Optional[float]) -> bool:
    """True iff coordinates fall within the US bounding box."""
    if lat is None or lon is None:
        return False
    return LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX


def clamp_coordinates(
    lat: Optional[float], lon: Optional[float]
) -> tuple[Optional[float], Optional[float]]:
    """Return (lat, lon) only if valid; otherwise (None, None)."""
    if validate_coordinates(lat, lon):
        return (round(lat, 6), round(lon, 6))
    return (None, None)


def normalize_capacity(value) -> Optional[float]:
    """Parse MW capacity from a string or number; return None on failure."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value) if value > 0 else None
    s = str(value).strip().upper().replace(",", "")
    # Extract first number (possibly decimal)
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if not m:
        return None
    return float(m.group(1))


def normalize_record_fields(record) -> None:
    """Mutate a FacilityRecord in-place, normalising its fields."""
    record.name = normalize_name(record.name)
    record.operator = normalize_operator(record.operator)
    record.street_address = normalize_street(record.street_address)
    record.zip_code = normalize_zip(record.zip_code)

    if record.state or record.state_abbr:
        raw = record.state_abbr if record.state_abbr else record.state
        full, abbr = normalize_state(raw)
        if full:
            record.state = full
            record.state_abbr = abbr

    record.latitude, record.longitude = clamp_coordinates(
        record.latitude, record.longitude
    )
