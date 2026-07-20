#!/usr/bin/env python3
"""
Sweep F — 2026-07-20 — State name normalization
Converts 57 entries where e["state"] is a 2-letter abbreviation to the
canonical full state name used throughout the rest of the database.
Idempotent: running again after normalization changes nothing.
"""

import json

DATA_PATH = "data"

with open(f"{DATA_PATH}/restrictions_raw.json") as f:
    data = json.load(f)
restrictions = data["restrictions"]

STATE_ABBREV_MAP = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

fixed = 0
for entry in restrictions:
    abbrev = entry.get("state", "")
    if abbrev in STATE_ABBREV_MAP:
        entry["state"] = STATE_ABBREV_MAP[abbrev]
        fixed += 1

print(f"State abbreviations normalized: {fixed}")

data["restrictions"] = restrictions
with open(f"{DATA_PATH}/restrictions_raw.json", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

# Verify no abbreviations remain
remaining = [e for e in restrictions if len(e.get("state", "")) <= 3]
if remaining:
    print(f"WARNING: {len(remaining)} entries still have short state codes:")
    for e in remaining:
        print(f"  {e['fips']} {e['name']}: {e['state']!r}")
else:
    print("Verified: no short-form state codes remain.")

print(f"Total restrictions: {len(restrictions)}")
