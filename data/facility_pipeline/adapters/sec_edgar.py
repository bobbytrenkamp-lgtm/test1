"""SEC EDGAR full-text search adapter.

Searches EDGAR for 8-K and 10-K filings mentioning data center facility
announcements. Uses the public EDGAR full-text search API — no authentication
or API key required.

Sources:
  Full-text search:  https://efts.sec.gov/LATEST/search-index
  Filing index:      https://www.sec.gov/cgi-bin/browse-edgar

Tier: 4 (discovery) — EDGAR filings confirm a company's intent or announcement
but coordinates and operational status must be verified via other sources.

Rate limit: EDGAR's fair-access policy asks for no more than 10 requests/sec
and requires a User-Agent header with contact info.
"""
from __future__ import annotations

import json
import re
import time
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields, normalize_state
from . import BaseAdapter

EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
EDGAR_BASE_URL = "https://www.sec.gov"

# Phrases that strongly suggest a new data center facility announcement
_DC_KEYWORDS = [
    "data center campus",
    "data center facility",
    "hyperscale data center",
    "cloud data center",
    "colocation facility",
    "entered into a lease",
    "data hall",
    "megawatt capacity",
    "MW of capacity",
]

# US state name → abbreviation for rough extraction from filing text
_STATE_NAMES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
}

# Known data-center operators — used to infer operator from filer
_KNOWN_OPERATORS = {
    "equinix": "Equinix",
    "digital realty": "Digital Realty",
    "qts": "QTS Realty Trust",
    "iron mountain": "Iron Mountain",
    "cyrusone": "CyrusOne",
    "coresite": "CoreSite Realty",
    "switch": "Switch Inc",
    "stack infrastructure": "STACK Infrastructure",
    "compass datacenters": "Compass Datacenters",
    "vantage data centers": "Vantage Data Centers",
    "aligned data centers": "Aligned Data Centers",
    "amazon web services": "Amazon Web Services",
    "amazon data services": "Amazon Web Services",
    "microsoft": "Microsoft",
    "google": "Google",
    "meta platforms": "Meta Platforms",
    "apple": "Apple Inc",
    "oracle": "Oracle Corporation",
}


def _extract_mw(text: str) -> float | None:
    """Try to extract a megawatt capacity figure from filing text."""
    patterns = [
        r"(\d[\d,]*(?:\.\d+)?)\s*(?:MW|megawatt)",
        r"(\d[\d,]*(?:\.\d+)?)-megawatt",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                pass
    return None


def _extract_state(text: str) -> tuple[str, str]:
    """Return (full_state, abbr) for the first US state mentioned in text."""
    text_lower = text.lower()
    # Try abbreviated form first (e.g. "Ashburn, VA")
    m = re.search(r",\s*([A-Z]{2})\b", text)
    if m:
        abbr = m.group(1)
        for full, a in _STATE_NAMES.items():
            if a == abbr:
                return full.title(), abbr
    # Try full name
    for name, abbr in sorted(_STATE_NAMES.items(), key=lambda x: -len(x[0])):
        if name in text_lower:
            return name.title(), abbr
    return "", ""


def _extract_city(text: str, state_abbr: str) -> str:
    """Rough city extraction: look for 'in CITY, STATE' patterns."""
    if not state_abbr:
        return ""
    patterns = [
        rf"in\s+([A-Z][a-zA-Z\s]+),\s*{re.escape(state_abbr)}\b",
        rf"([A-Z][a-zA-Z\s]+),\s*{re.escape(state_abbr)}\b",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            city = m.group(1).strip()
            if len(city) < 40:
                return city
    return ""


def _infer_operator(filer_name: str) -> str:
    """Map a filing company name to a known operator label."""
    name_lower = filer_name.lower()
    for key, label in _KNOWN_OPERATORS.items():
        if key in name_lower:
            return label
    return filer_name


def _first(entity: dict, *keys: str) -> str:
    """Return the first non-empty value found under any of these key names,
    unwrapping a one-element list/tuple if that's what's stored. EDGAR's
    full-text search API schema was never confirmed against a live response
    (no outbound access to efts.sec.gov from the environment this adapter
    was written in) — this hedges against the several plausible field-name
    conventions (e.g. 'entity_name' vs 'display_names', 'accession_no' vs
    'adsh') instead of silently discarding every hit if only one guess was
    coded and it happened to be wrong, which is what was happening before:
    this adapter had fetched 0 records on every run since it was added."""
    for key in keys:
        val = entity.get(key)
        if isinstance(val, (list, tuple)):
            val = val[0] if val else None
        if val:
            return str(val)
    return ""


def _filing_to_record(hit: dict, source_id: str) -> FacilityRecord | None:
    """Convert one EDGAR search hit to a FacilityRecord."""
    entity = hit.get("_source", {})
    file_date = _first(entity, "file_date", "filed_at", "date_filed")
    filer_name = _first(entity, "entity_name", "display_names", "filer_name")
    form_type = _first(entity, "form_type", "file_type", "root_forms")
    accession = _first(entity, "accession_no", "adsh", "accession_number").replace("-", "")

    # Build the filing URL
    cik = _first(entity, "entity_id", "ciks", "cik").lstrip("0")
    filing_url = (
        f"{EDGAR_BASE_URL}/Archives/edgar/data/{cik}/{accession}-index.htm"
        if cik and accession
        else ""
    )

    display_text = _first(entity, "period_of_report", "period_ending")

    operator = _infer_operator(filer_name)
    state_full, state_abbr = _extract_state(filer_name + " " + display_text)
    city = _extract_city(display_text, state_abbr)
    mw = _extract_mw(display_text)

    # Skip if we can't extract meaningful location
    if not state_abbr:
        return None

    r = FacilityRecord()
    r.name = f"{operator} Data Center" + (f" - {city}, {state_abbr}" if city else f" - {state_abbr}")
    r.operator = operator
    r.city = city
    r.state = state_full
    r.state_abbr = state_abbr
    r.operational_status = "planned"  # EDGAR announcements → planned until verified
    r.primary_source = source_id
    r.confidence_tier = 4
    r.confidence_score = 0.45
    r.last_verified_date = file_date
    r.is_candidate = True  # Always candidate — needs human review

    if filing_url:
        r.source_urls.append(filing_url)

    if mw:
        r.capacity_mw_planned = mw

    r.notes = (
        f"EDGAR {form_type} filing by {filer_name} on {file_date}. "
        f"Needs verification of exact location, capacity, and status."
    )

    normalize_record_fields(r)
    return r


class SECEdgarAdapter(BaseAdapter):
    """Discovers data center facility announcements from SEC EDGAR 8-K and 10-K filings.

    Results are always marked as candidates (tier 4, confidence 0.45) because
    filing text requires human review to extract reliable facility details.
    """

    SEARCH_QUERIES = [
        # New data center announcements in 8-K filings
        '"data center campus" "will develop" OR "will construct" OR "ground breaking"',
        '"hyperscale data center" "megawatt"',
        '"colocation facility" "square feet" "data center"',
        '"AI data center" "gigawatt" OR "megawatt"',
    ]

    def __init__(self, source: FacilitySource):
        super().__init__(source)

    def _search(self, session, query: str, since: str | None) -> list[dict]:
        params = {
            "q": query,
            "forms": "8-K",
            "dateRange": "custom",
            "startdt": since[:10] if since else "2020-01-01",
            "enddt": "9999-12-31",
        }
        # "_source"/"hits.hits.total.value" were never real EDGAR full-text
        # search API parameters — EDGAR ignores unknown query params rather
        # than erroring, so this wasn't the cause of the 0-results pattern,
        # but it was dead weight suggesting a field-selection mechanism that
        # doesn't exist here; removed rather than left as misleading.
        qs = "&".join(f"{k}={session.utils.quote(str(v))}" for k, v in params.items())
        url = f"{EDGAR_SEARCH_URL}?{qs}"

        try:
            time.sleep(0.15)  # ~6 req/s, well within EDGAR fair-use
            r = session.get(url, timeout=30)
            r.raise_for_status()
            payload = r.json()
            hits = payload.get("hits", {}).get("hits", [])
            if not hits:
                print(f"  [sec_edgar] 0 hits for query {query!r} "
                      f"(response top-level keys: {list(payload.keys())})")
            return hits
        except Exception as e:                       # noqa: BLE001
            # This used to swallow every failure with no trace — CI history
            # shows this adapter has returned exactly 0 records on every run
            # since it was added, including the initial unbounded backfill,
            # which a genuinely-empty search result would not explain for a
            # query this broad. Print so the actual status code / exception
            # is visible on the next real run instead of reading as "no new
            # filings," which is what a silent 0 looks identical to.
            print(f"  [sec_edgar] search failed for query {query!r}: {type(e).__name__}: {e}")
            return []

    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        try:
            import requests
        except ImportError:
            raise RuntimeError("requests is required: pip install requests")

        session = requests.Session()
        # EDGAR requires a User-Agent with contact info per their fair-access policy
        session.headers.update({
            "User-Agent": "US-AI-Infrastructure-Map/1.0 datacenter-research@example.com",
            "Accept": "application/json",
        })
        # Make urllib.parse available on session for URL building
        import urllib.parse
        session.utils = urllib.parse

        seen: set[str] = set()

        for query in self.SEARCH_QUERIES:
            hits = self._search(session, query, since)
            for hit in hits:
                acc = hit.get("_source", {}).get("accession_no", "")
                if acc in seen:
                    continue
                seen.add(acc)

                record = _filing_to_record(hit, self.source_id)
                if record:
                    yield self._stamp(record)
