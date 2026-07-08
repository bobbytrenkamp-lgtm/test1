#!/usr/bin/env python3
"""
Multi-layer data quality validator for the US Datacenter Restrictions Map.

Layers:
  1. JSON schema — required fields, correct types, value ranges
  2. FIPS integrity — every FIPS exists in the 3,143-county reference database
  3. Name/state consistency — county name and state must match the FIPS reference
  4. Source quality — classify sources by tier (Tier 1=gov/official, Tier 2=industry, Tier 3=news)
  5. Confidence scoring — composite score per entry based on tier, source count, freshness
  6. Coordinate bounds — lat/lon for facilities must fall within US bounds
  7. Freshness alerts — flag stale proposed/active entries without recent verification
  8. Logical consistency — level, status, types, description coherence cross-checks

Exit codes:
  0  — all checks passed (or only low-severity warnings)
  1  — errors found (data should be corrected before deploy)
  2  — critical failure (schema/FIPS errors that could corrupt the map)
"""

import json
import os
import re
import sys
from datetime import date, datetime, timezone

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

RAW_PATH       = os.path.join(DATA_DIR, "restrictions_raw.json")
MAP_DATA_PATH  = os.path.join(DATA_DIR, "map_data.json")
LAYERS_PATH    = os.path.join(DATA_DIR, "sample_layers.json")
STATE_REG_PATH = os.path.join(DATA_DIR, "state_regulations.json")
FIPS_REF_PATH  = os.path.join(DATA_DIR, "county_names.json")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_LEVELS   = {-1, 0, 1, 2, 3, 4}
VALID_TYPES    = {"data_center", "ai", "crypto", "energy", "water"}
VALID_STATUSES = {"active", "proposed", "expired"}

# US bounds (generous, includes AK/HI/PR/territories)
US_LAT_MIN, US_LAT_MAX = 17.0, 72.0
US_LON_MIN, US_LON_MAX = -180.0, -63.0

# State abbreviation → full name (for cross-checking restrictions_raw "state" field)
STATE_ABBR_TO_NAME = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
    "PR": "Puerto Rico", "GU": "Guam", "VI": "Virgin Islands",
}
STATE_NAME_TO_ABBR = {v: k for k, v in STATE_ABBR_TO_NAME.items()}

# Tier-1 domain keywords — government / official regulatory sources
TIER1_PATTERNS = [
    r"\.gov\b", r"\.mil\b", r"state\.[a-z]{2}\.us\b",
    r"\bcongress\.gov\b", r"\blegiscan\.com\b", r"\bstatutes\b",
    r"\bordinance\b", r"\blegislature\b", r"\blegislation\b",
    r"\bcounty\b.{0,20}\bofficial\b",
    r"\bfederalregister\.gov\b", r"\bepagov\b",
    r"\bpublic\s*utilities\b", r"\bpuc\b",
    r"\bsec\.gov\b", r"\bftc\.gov\b",
]
TIER1_RE = re.compile("|".join(TIER1_PATTERNS), re.I)

# Tier-2 — reputable industry / trade / think-tank sources
TIER2_PATTERNS = [
    r"\bdatacenterknowledge\.com\b", r"\bdatacenterdynamics\.com\b",
    r"\bbloomberg\.com\b", r"\breuters\.com\b", r"\bwsj\.com\b",
    r"\bftimes\.com\b", r"\bnytimes\.com\b", r"\bwashingtonpost\.com\b",
    r"\btheatlantic\.com\b", r"\bbrookings\.edu\b", r"\bnrdc\.org\b",
    r"\bsierraclub\.org\b", r"\biea\.org\b", r"\bepa\.gov\b",
    r"\bforbes\.com\b", r"\btechcrunch\.com\b", r"\bwired\.com\b",
    r"\btheverge\.com\b", r"\bars\.technica\b", r"\bvox\.com\b",
    r"\bstatista\.com\b", r"\bpitchbook\.com\b",
    r"\bindustryreport\b", r"\bwhitepaper\b",
]
TIER2_RE = re.compile("|".join(TIER2_PATTERNS), re.I)

# Staleness thresholds (days)
STALE_PROPOSED = 180   # 6 months — proposed rules that haven't moved
STALE_ACTIVE   = 365   # 12 months — active restrictions need re-verification annually
STALE_INCENTIVE = 548  # 18 months — incentive programs change less often


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class Issue:
    def __init__(self, severity, layer, entity, message, suggestion=""):
        self.severity   = severity   # "critical" | "error" | "warning" | "info"
        self.layer      = layer
        self.entity     = entity
        self.message    = message
        self.suggestion = suggestion

    def __str__(self):
        sug = f" → {self.suggestion}" if self.suggestion else ""
        return f"[{self.severity.upper():8s}] [{self.layer}] {self.entity}: {self.message}{sug}"


def load_json(path, label):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[WARN] {label} not found at {path}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"[CRITICAL] {label} is invalid JSON: {e}", file=sys.stderr)
        return None


def classify_source(source):
    """Return (tier, url_or_None) for a source (string or {label,url} dict)."""
    if isinstance(source, dict):
        url = source.get("url", "")
        text = url + " " + source.get("label", "")
    else:
        text = str(source)
        url = None
    if TIER1_RE.search(text):
        return 1, url
    if TIER2_RE.search(text):
        return 2, url
    return 3, url


def days_since(date_str):
    """Days since an ISO-format date string; None if unparseable."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            d = datetime.strptime(date_str, fmt).date()
            return (date.today() - d).days
        except ValueError:
            continue
    return None


def effective_date_age(entry):
    return days_since(entry.get("effective_date") or entry.get("last_reviewed"))


def confidence_score(entry, tier, source_count, url_count):
    """
    Return (score 0-100, label).
    Weights: tier (40), source count (20), url availability (20), freshness (20).
    """
    # Tier score
    tier_scores = {1: 40, 2: 28, 3: 14}
    s_tier = tier_scores.get(tier, 0)

    # Source count (cap at 3)
    s_sources = min(source_count, 3) / 3 * 20

    # URL availability
    s_url = min(url_count, 2) / 2 * 20

    # Freshness — based on effective_date or status
    age = effective_date_age(entry)
    if age is None:
        s_fresh = 5  # Unknown date, partial credit
    elif age <= 90:
        s_fresh = 20
    elif age <= 365:
        s_fresh = 14
    elif age <= 730:
        s_fresh = 8
    else:
        s_fresh = 2

    total = s_tier + s_sources + s_url + s_fresh
    if total >= 80:
        label = "verified"
    elif total >= 60:
        label = "high"
    elif total >= 40:
        label = "medium"
    else:
        label = "low"
    return round(total), label


# ---------------------------------------------------------------------------
# Layer 1: JSON Schema
# ---------------------------------------------------------------------------

REQUIRED_FIELDS = {
    "fips": str,
    "name": str,
    "state": str,
    "level": int,
    "types": list,
    "title": str,
    "description": str,
    "status": str,
    "sources": list,
}

def validate_schema(restrictions):
    issues = []
    for r in restrictions:
        fips = r.get("fips", "?")
        label = f"{fips}/{r.get('name','?')}"

        for field, expected_type in REQUIRED_FIELDS.items():
            if field not in r:
                issues.append(Issue("critical", "schema", label,
                                    f"Missing required field: '{field}'",
                                    f"Add '{field}' to this entry"))
            elif not isinstance(r[field], expected_type):
                issues.append(Issue("error", "schema", label,
                                    f"Field '{field}' should be {expected_type.__name__}, "
                                    f"got {type(r[field]).__name__}"))

        if r.get("level") not in VALID_LEVELS and r.get("level") is not None:
            issues.append(Issue("error", "schema", label,
                                f"Invalid level {r['level']}; must be one of {sorted(VALID_LEVELS)}"))

        if r.get("status") and r["status"] not in VALID_STATUSES:
            issues.append(Issue("error", "schema", label,
                                f"Invalid status '{r['status']}'; must be one of {sorted(VALID_STATUSES)}"))

        for t in r.get("types", []):
            if t not in VALID_TYPES:
                issues.append(Issue("error", "schema", label,
                                    f"Unknown type '{t}'; valid types: {sorted(VALID_TYPES)}"))

        fips_val = r.get("fips", "")
        if fips_val and (not fips_val.isdigit() or len(fips_val) != 5):
            issues.append(Issue("critical", "schema", label,
                                f"FIPS '{fips_val}' must be exactly 5 digits",
                                "Zero-pad if needed, e.g. '01001'"))

    return issues


# ---------------------------------------------------------------------------
# Layer 2 & 3: FIPS Integrity + Name/State Consistency
# ---------------------------------------------------------------------------

def validate_fips(restrictions, fips_ref):
    issues = []
    counties = fips_ref.get("counties", {})

    for r in restrictions:
        fips  = r.get("fips", "")
        name  = r.get("name", "")
        state = r.get("state", "")
        label = f"{fips}/{name}"

        if not fips:
            continue

        if fips not in counties:
            issues.append(Issue("critical", "fips", label,
                                f"FIPS '{fips}' not found in the 3,143-county reference database",
                                "Check the FIPS code at census.gov or use county_names.json"))
            continue

        ref = counties[fips]
        ref_name  = ref["name"]
        ref_abbr  = ref["state"]
        ref_state = STATE_ABBR_TO_NAME.get(ref_abbr, ref_abbr)

        if name != ref_name:
            issues.append(Issue("critical", "fips", label,
                                f"County name mismatch: raw='{name}' reference='{ref_name}'",
                                f"Change name to '{ref_name}'"))

        entry_abbr = STATE_NAME_TO_ABBR.get(state, state)
        if entry_abbr != ref_abbr:
            issues.append(Issue("error", "fips", label,
                                f"State mismatch: raw='{state}' ({entry_abbr}) "
                                f"reference='{ref_state}' ({ref_abbr})",
                                f"Change state to '{ref_state}'"))

    return issues


# ---------------------------------------------------------------------------
# Layer 4 & 5: Source Quality + Confidence Scoring
# ---------------------------------------------------------------------------

def validate_sources_and_confidence(restrictions):
    issues = []
    confidence_results = {}

    for r in restrictions:
        fips  = r.get("fips", "?")
        label = f"{fips}/{r.get('name','?')}"
        sources = r.get("sources", [])

        if not sources:
            issues.append(Issue("warning", "sources", label,
                                "No sources provided",
                                "Add at least one {label, url} source object"))
            confidence_results[fips] = {"score": 0, "label": "low", "min_tier": 3,
                                         "source_count": 0, "url_count": 0}
            continue

        tiers = []
        url_count = 0
        for src in sources:
            tier, url = classify_source(src)
            tiers.append(tier)
            if url:
                url_count += 1

        min_tier = min(tiers)
        avg_tier = sum(tiers) / len(tiers)

        if min_tier == 3 and len(sources) == 1:
            issues.append(Issue("warning", "sources", label,
                                "Only Tier-3 (news/community) source — consider adding a government or official source",
                                "Add a .gov or official document link"))
        if url_count == 0:
            issues.append(Issue("warning", "sources", label,
                                "All sources are plain text (no URLs) — cannot auto-validate links",
                                "Convert sources to {\"label\": \"...\", \"url\": \"...\"} format"))

        score, conf_label = confidence_score(r, min_tier, len(sources), url_count)
        confidence_results[fips] = {
            "score": score,
            "label": conf_label,
            "min_tier": min_tier,
            "avg_tier": round(avg_tier, 1),
            "source_count": len(sources),
            "url_count": url_count,
        }

        if conf_label == "low":
            issues.append(Issue("warning", "confidence", label,
                                f"Low confidence score ({score}/100) — entry needs better sourcing",
                                "Add government or official sources with URLs"))

    return issues, confidence_results


# ---------------------------------------------------------------------------
# Layer 6: Coordinate Bounds (sample_layers.json)
# ---------------------------------------------------------------------------

def validate_coordinates(layers_data):
    issues = []
    if not layers_data:
        return issues

    categories = ["data_centers", "ai_campuses", "power_infrastructure"]
    for cat in categories:
        for item in layers_data.get(cat, []):
            item_id   = item.get("id", "?")
            item_name = item.get("name", "?")
            label     = f"{cat}/{item_id} ({item_name})"
            lat = item.get("lat") or item.get("latitude")
            lon = item.get("lon") or item.get("longitude")

            if lat is None or lon is None:
                # Check nested coordinates
                coords = item.get("coordinates")
                if coords and isinstance(coords, list) and len(coords) >= 2:
                    lon, lat = coords[0], coords[1]

            if lat is None or lon is None:
                issues.append(Issue("warning", "coordinates", label,
                                    "Missing lat/lon coordinates"))
                continue

            if not (US_LAT_MIN <= float(lat) <= US_LAT_MAX):
                issues.append(Issue("error", "coordinates", label,
                                    f"Latitude {lat} outside US bounds ({US_LAT_MIN}–{US_LAT_MAX})"))
            if not (US_LON_MIN <= float(lon) <= US_LON_MAX):
                issues.append(Issue("error", "coordinates", label,
                                    f"Longitude {lon} outside US bounds ({US_LON_MIN}–{US_LON_MAX})"))

    return issues


# ---------------------------------------------------------------------------
# Layer 7: Freshness Alerts
# ---------------------------------------------------------------------------

def validate_freshness(restrictions):
    issues = []
    today = date.today()

    for r in restrictions:
        fips   = r.get("fips", "?")
        label  = f"{fips}/{r.get('name','?')}"
        status = r.get("status", "")
        level  = r.get("level")
        eff    = r.get("effective_date", "")
        age    = days_since(eff) if eff else None

        if age is None:
            issues.append(Issue("info", "freshness", label,
                                "No effective_date — cannot assess data freshness"))
            continue

        if status == "proposed" and age > STALE_PROPOSED:
            issues.append(Issue("warning", "freshness", label,
                                f"Proposed entry is {age} days old (threshold {STALE_PROPOSED}d) — "
                                f"may have been enacted or dropped",
                                "Re-verify current status and update effective_date"))

        elif status == "active" and level in (2, 3, 4) and age > STALE_ACTIVE:
            issues.append(Issue("warning", "freshness", label,
                                f"High-severity active restriction is {age} days old "
                                f"(threshold {STALE_ACTIVE}d) — verify it is still in effect",
                                "Re-verify and add last_reviewed date"))

        elif level == -1 and age > STALE_INCENTIVE:
            issues.append(Issue("info", "freshness", label,
                                f"Incentive/pro-datacenter entry is {age} days old "
                                f"(threshold {STALE_INCENTIVE}d) — verify program is still active"))

    return issues


# ---------------------------------------------------------------------------
# Layer 8: Logical Consistency
# ---------------------------------------------------------------------------

LEVEL_KEYWORDS = {
    4: (["ban", "prohibit", "outlawed", "illegal", "moratorium"], "ban/prohibit"),
    3: (["moratorium", "ban", "restrict", "freeze", "halt", "deny"], "moratorium/restriction"),
    -1: (["incentive", "tax", "enterprise", "hub", "friendly", "encourage", "benefit",
          "attract", "bonus", "rebate", "opportunity zone", "pro-datacenter"], "incentive/pro-datacenter"),
}

def validate_logical_consistency(restrictions):
    issues = []

    for r in restrictions:
        fips  = r.get("fips", "?")
        label = f"{fips}/{r.get('name','?')}"
        level = r.get("level")
        desc  = (r.get("description", "") + " " + r.get("title", "")).lower()
        types = r.get("types", [])
        status = r.get("status", "")

        # Level 4 (ban) must mention ban-like language
        if level == 4:
            kws, phrase = LEVEL_KEYWORDS[4]
            if not any(kw in desc for kw in kws):
                issues.append(Issue("warning", "consistency", label,
                                    f"Level 4 (ban) but description lacks ban language; "
                                    f"expected one of: {kws[:3]}..."))

        # Level 3 (active moratorium) same
        if level == 3:
            kws, phrase = LEVEL_KEYWORDS[3]
            if not any(kw in desc for kw in kws):
                issues.append(Issue("info", "consistency", label,
                                    f"Level 3 (active restriction) description may lack "
                                    f"restriction language ({kws[:3]}...)"))

        # Level -1 (incentive) should have incentive language
        if level == -1:
            kws, phrase = LEVEL_KEYWORDS[-1]
            if not any(kw in desc for kw in kws):
                issues.append(Issue("warning", "consistency", label,
                                    f"Level -1 (incentive) but description lacks incentive language; "
                                    f"expected one of: {kws[:3]}..."))

        # Expired entries shouldn't be high severity
        if status == "expired" and level in (3, 4):
            issues.append(Issue("warning", "consistency", label,
                                f"Status is 'expired' but level={level} (high severity) — "
                                "consider lowering level to reflect the expired state"))

        # Proposed entries shouldn't be level 4 unless specifically titled as such
        if status == "proposed" and level == 4:
            issues.append(Issue("info", "consistency", label,
                                "Level 4 (ban) with status 'proposed' — confirm this is truly enacted"))

        # Water type should mention water or energy in description
        if "water" in types and not any(w in desc for w in ["water", "h2o", "drought", "aquifer"]):
            issues.append(Issue("info", "consistency", label,
                                "Has type 'water' but description doesn't mention water usage"))

    return issues


# ---------------------------------------------------------------------------
# State regulations validation (basic)
# ---------------------------------------------------------------------------

def validate_state_regulations(state_data):
    issues = []
    if not state_data:
        return issues

    for fips2, state in state_data.get("states", {}).items():
        label = f"states/{fips2} ({state.get('name','?')})"
        for field in ("name", "level", "status", "summary", "sources"):
            if field not in state:
                issues.append(Issue("error", "schema", label,
                                    f"Missing field '{field}' in state entry"))
        lvl = state.get("level")
        if lvl is not None and lvl not in VALID_LEVELS:
            issues.append(Issue("error", "schema", label,
                                f"Invalid state level {lvl}"))
        if not fips2.isdigit() or len(fips2) != 2:
            issues.append(Issue("error", "fips", label,
                                f"State FIPS '{fips2}' should be exactly 2 digits"))

    return issues


# ---------------------------------------------------------------------------
# Write confidence metadata back to map_data.json
# ---------------------------------------------------------------------------

def write_confidence_to_map_data(confidence_results):
    try:
        with open(MAP_DATA_PATH) as f:
            md = json.load(f)
    except Exception:
        print("[WARN] Could not load map_data.json to write confidence scores", file=sys.stderr)
        return

    updated = 0
    for fips, conf in confidence_results.items():
        if fips in md.get("counties", {}):
            md["counties"][fips]["confidence"] = conf["label"]
            md["counties"][fips]["confidence_score"] = conf["score"]
            md["counties"][fips]["source_tier"] = conf["min_tier"]
            updated += 1

    md["confidence_metadata"] = {
        "last_computed": datetime.now(timezone.utc).isoformat(),
        "scoring_weights": {
            "source_tier": "40% (Tier1=gov/official, Tier2=industry, Tier3=news)",
            "source_count": "20% (capped at 3 sources)",
            "url_availability": "20% (capped at 2 URLs)",
            "freshness": "20% (effective_date age)",
        },
        "labels": {
            "verified": "Score ≥ 80 — government sources, multiple URLs, recent date",
            "high": "Score 60–79 — good sources, some URLs",
            "medium": "Score 40–59 — industry/news sources, limited URLs",
            "low": "Score < 40 — few sources, no URLs, or very stale",
        },
    }

    with open(MAP_DATA_PATH, "w") as f:
        json.dump(md, f, indent=2)

    print(f"Confidence scores written for {updated} counties in map_data.json")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def print_header(title):
    print(f"\n{'─'*64}")
    print(f"  {title}")
    print(f"{'─'*64}")


def summarize(issues):
    counts = {"critical": 0, "error": 0, "warning": 0, "info": 0}
    for iss in issues:
        counts[iss.severity] = counts.get(iss.severity, 0) + 1
    return counts


def main():
    print("=" * 64)
    print("  US Datacenter Restrictions Map — Multi-Layer Validator")
    print("=" * 64)

    # Load all data files
    raw_data    = load_json(RAW_PATH, "restrictions_raw.json")
    layers_data = load_json(LAYERS_PATH, "sample_layers.json")
    state_data  = load_json(STATE_REG_PATH, "state_regulations.json")
    fips_ref    = load_json(FIPS_REF_PATH, "county_names.json")

    if raw_data is None or fips_ref is None:
        print("\n[CRITICAL] Cannot proceed without restrictions_raw.json and county_names.json")
        return 2

    restrictions = raw_data.get("restrictions", [])
    print(f"\nLoaded {len(restrictions)} county entries")

    all_issues = []

    # --- Layer 1: Schema ---
    print_header("Layer 1: JSON Schema Validation")
    schema_issues = validate_schema(restrictions)
    all_issues.extend(schema_issues)
    if schema_issues:
        for iss in schema_issues:
            print(f"  {iss}")
    else:
        print("  ✓ All entries pass schema validation")

    # --- Layers 2 & 3: FIPS + Name/State ---
    print_header("Layer 2+3: FIPS Integrity & Name/State Consistency")
    fips_issues = validate_fips(restrictions, fips_ref)
    all_issues.extend(fips_issues)
    if fips_issues:
        for iss in fips_issues:
            print(f"  {iss}")
    else:
        print(f"  ✓ All {len(restrictions)} FIPS codes verified against 3,143-county reference")

    # --- Layers 4 & 5: Source Quality + Confidence ---
    print_header("Layer 4+5: Source Quality & Confidence Scoring")
    src_issues, confidence_results = validate_sources_and_confidence(restrictions)
    all_issues.extend(src_issues)
    if src_issues:
        for iss in src_issues:
            print(f"  {iss}")
    else:
        print("  ✓ No source quality issues found")

    # Print confidence distribution
    dist = {"verified": 0, "high": 0, "medium": 0, "low": 0}
    for c in confidence_results.values():
        dist[c["label"]] = dist.get(c["label"], 0) + 1
    print(f"\n  Confidence distribution:")
    for lbl in ("verified", "high", "medium", "low"):
        bar = "█" * dist.get(lbl, 0)
        print(f"    {lbl:10s}: {dist.get(lbl,0):3d}  {bar}")

    # --- Layer 6: Coordinate Bounds ---
    print_header("Layer 6: Coordinate Bounds (facilities)")
    coord_issues = validate_coordinates(layers_data)
    all_issues.extend(coord_issues)
    if coord_issues:
        for iss in coord_issues:
            print(f"  {iss}")
    else:
        print("  ✓ All facility coordinates within US bounds")

    # --- Layer 7: Freshness ---
    print_header("Layer 7: Data Freshness Alerts")
    fresh_issues = validate_freshness(restrictions)
    all_issues.extend(fresh_issues)
    if fresh_issues:
        for iss in fresh_issues:
            print(f"  {iss}")
    else:
        print("  ✓ No freshness concerns found")

    # --- Layer 8: Logical Consistency ---
    print_header("Layer 8: Logical Consistency")
    logic_issues = validate_logical_consistency(restrictions)
    all_issues.extend(logic_issues)
    if logic_issues:
        for iss in logic_issues:
            print(f"  {iss}")
    else:
        print("  ✓ All entries pass logical consistency checks")

    # --- State Regulations ---
    print_header("State Regulations Schema")
    state_issues = validate_state_regulations(state_data)
    all_issues.extend(state_issues)
    if state_issues:
        for iss in state_issues:
            print(f"  {iss}")
    else:
        print("  ✓ State regulations pass schema validation")

    # --- Write confidence scores to map_data.json ---
    write_confidence_to_map_data(confidence_results)

    # --- Final summary ---
    counts = summarize(all_issues)
    print(f"\n{'='*64}")
    print(f"  VALIDATION SUMMARY")
    print(f"{'='*64}")
    print(f"  Entries validated : {len(restrictions)} counties")
    print(f"  Critical          : {counts['critical']}")
    print(f"  Errors            : {counts['error']}")
    print(f"  Warnings          : {counts['warning']}")
    print(f"  Info              : {counts['info']}")
    print(f"{'='*64}\n")

    if counts["critical"] > 0:
        print("RESULT: CRITICAL FAILURES — data must be fixed before deploy")
        return 2
    if counts["error"] > 0:
        print("RESULT: ERRORS — data should be corrected")
        return 1
    if counts["warning"] > 0:
        print("RESULT: WARNINGS — review recommended but data is deployable")
        return 0
    print("RESULT: ALL CLEAR — data passes all validation layers")
    return 0


if __name__ == "__main__":
    sys.exit(main())
