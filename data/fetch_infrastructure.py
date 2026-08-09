#!/usr/bin/env python3
"""
Fetch infrastructure data relevant to data center site analysis.

Sources (all public, no authentication required):
  - HIFLD Electric Substations  (ArcGIS REST, Homeland Infrastructure Foundation-Level Data)
  - HIFLD Electric Transmission Lines
  - EPA FRS Power Plants        (EIA-860 generator data joined with FRS)
  - EPA FRS/ICIS Wastewater     (NPDES-permitted wastewater treatment facilities)
  - FCC National Broadband Map  (county-level fiber coverage)
  - EPA WATERS / USGS           (county-level water availability proxy)
  - EIA US Energy Atlas         (ISO/RTO region boundaries -- currently token-gated, see ISO_RTO_URL)
  - EPA Community Water Systems (drinking-water service-area boundaries)

Outputs: updates data/sample_layers.json with real infrastructure data.

Usage:
    python data/fetch_infrastructure.py [--layers substations,transmission,power,wastewater,fiber,water,iso_rto,water_systems]
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from typing import Any

import requests

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATA_DIR   = os.path.dirname(os.path.abspath(__file__))
LAYERS_PATH = os.path.join(DATA_DIR, "sample_layers.json")

# ── HIFLD ArcGIS REST endpoints (public, no auth) ──────────────────────────
HIFLD_BASE = "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services"
# Electric_Substations and Power_Plants under this org both went away (HTTP
# 200 with {"error":{"message":"Invalid URL"}} — confirmed via CI run
# 30723020119, 2026-07-31). Diagnosed from a real-internet GitHub Actions
# runner (this sandbox's proxy blocks arcgis.com entirely) across PRs
# #208-#212: a live mirror of substations exists under a different HIFLD
# org, with a schema that differs from the original (MAX_VOLT/MIN_VOLT
# instead of one VOLTAGE string; COUNTYFIPS instead of COUNTY_FIPS;
# COUNTRY='USA' not 'US') — see fetch_substations() below. No live
# Power_Plants replacement was found after searching both HIFLD orgs'
# service listings and two DCAT catalog guesses; not guessing a URL
# without verification (see the Maryland parcel decision in
# BUG_TRACKER.md for why that's a real, previously-hit failure mode).
# The G4S1dGvn7PIgYd6Y mirror above (fetched historically) was itself a
# degraded subset -- only 25 US substations nationwide after the >=69kV
# filter, confirmed 2026-08-02. Root cause found 2026-08-09: DHS's HIFLD
# Open portal (the origin for all of these mirrors) was shut down entirely
# in August 2025. There is no single "official" replacement anymore --
# only surviving third-party copies of the pre-shutdown dataset. This one
# (HDR Inc., an engineering firm) was confirmed live via a real GitHub
# Actions probe dispatch (probe_national_source.yml) to carry the
# authentic HIFLD Electric Substations schema, including MAX_VOLT/MIN_VOLT
# as directly-reported numeric fields (not inferred from connected lines,
# unlike the Rutgers RenewableEnergy mirror's MAX_INFER/MIN_INFER, which
# was also confirmed live but not chosen as primary for that reason).
# Real national record count was NOT knowable from the probe tool (its
# ogrinfo-based schema check never surfaces real attribute values, and
# ArcGIS returnCountOnly queries are too small to pass this repo's
# download-floor sanity check) -- so, per the standing "land real data,
# not just more probing" instruction, that unknown is being resolved by
# running this fetcher for real against a live ArcGIS Actions runner
# rather than continuing to probe blind.
SUBSTATION_URL  = "https://services5.arcgis.com/HDRa0B57OVrv2E1q/arcgis/rest/services/Electric_Substations/FeatureServer/0/query"
#
# Transmission's URL was never the problem — confirmed alive the whole
# time. The WHERE clause below used to reference COUNTRY, a column this
# layer's schema doesn't have at all (unlike substations' schema, which
# does), so every query failed with "Invalid query parameters" — a
# different, more specific ArcGIS error than "Invalid URL", which is what
# gave this away.
TRANSMISSION_URL= f"{HIFLD_BASE}/Electric_Power_Transmission_Lines/FeatureServer/0/query"
# Verified live 2026-08-08 via a real GitHub Actions dispatch (this
# sandbox has no outbound network to third-party/government hosts, so this
# was confirmed by an actual query, not assumed): EPA's own Facility
# Registry Service MapServer, layer 12 ("All Powerplants"), which compiles
# EIA-860 generator-level data joined with FRS facility records. Real
# confirmed fields: PLANT_CODE, PLANT_NAME, STATE, COUNTY, STATUS,
# OPERATING_MONTH/YEAR, ENERGY_SOURCE_1..6, SECTOR_NAME, PRIMARY_NAME,
# LOCATION_ADDRESS, CITY_NAME, COUNTY_NAME, STATE_CODE, FIPS_CODE,
# LATITUDE83, LONGITUDE83 — see fetch_power_plants() for the full mapping.
# NOTE: this layer has NO nameplate-capacity field of any kind. Plant
# identity/location/status/fuel-source data is real and usable; capacity_mw
# is genuinely unknown from this source and is never fabricated here.
POWER_PLANT_URL = "https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_PowerPlants/MapServer/12/query"

# Verified live 2026-08-09 via a real GitHub Actions dispatch (workflow run
# 31289722600, job 93184735924): the same EPA OEI namespace, this time layer
# 1 ("Wastewater Treatment Plants — Major, Minor and Other/Nonclassified"),
# combining FRS facility records with ICIS-NPDES permit data. Real confirmed
# fields (from a live ogrinfo schema dump, not assumed): NPDES_ID,
# REGISTRY_ID, CWP_NAME, CWP_STREET, CWP_CITY, CWP_STATE, CWP_ZIP,
# CWP_COUNTY, FAC_DERIVED_FIPS, CWP_MAJOR_MINOR_STATUS,
# CWP_PERMIT_STATUS_CODE, CWP_PERMIT_STATUS_DESC, CWP_FACILITY_TYPE_DESC,
# CWP_CSO_FLAG, FAC_LAT, FAC_LONG. That dispatch only confirmed the SCHEMA
# (ogrinfo -al -so is metadata-only), not real permit-status enum values —
# so unlike power plants' STATUS='OP', this fetcher does not filter on
# CWP_PERMIT_STATUS_CODE/DESC by guessing what "active" looks like. It
# fetches every record with real coordinates and passes permit status
# through as reported. NOTE: like power plants, this layer has NO capacity
# field (no MGD/flow rate) — capacity_mgd is genuinely unknown and never
# fabricated here.
WASTEWATER_URL = "https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_Wastewater/MapServer/1/query"

# ── FCC National Broadband Map ──────────────────────────────────────────────
# NOT actually no-auth despite this file's original header claiming so: every
# request to this endpoint gets HTTP 405 (Method Not Allowed), confirmed via
# real CI logs (2026-07-30, all 51 state queries failed identically, ~6 of
# the job's ~6.5 minutes burned on retries). The FCC's own current API spec
# (bdc-public-data-api-spec.pdf, fcc.gov/BroadbandData) states the Broadband
# Data Collection public data API requires a registered API token — this
# was a free-registration requirement added after this adapter was written,
# not a bug fixable by changing the request itself. Needs an FCC_BDC_API_KEY
# (or whatever the actual token env var should be called) registered at
# https://broadbandmap.fcc.gov/ and added as a repo secret, mirroring how
# EIA_API_KEY already works for update_economic_data.yml — same category of
# blocker, not something fixable in code alone.
FCC_COUNTY_URL  = "https://broadbandmap.fcc.gov/api/public/map/listCountyAvailability"

# ── EPA WATERS (ArcGIS, public) ─────────────────────────────────────────────
# Watershed water stress via EPA EnviroAtlas
EPA_WATERS_URL  = "https://enviroatlas.epa.gov/arcgis/rest/services/Supplemental/USACensus2010/MapServer/6/query"

# ── EIA ISO/RTO regions ──────────────────────────────────────────────────
# Real EIA-published boundary layer (US Energy Atlas, atlas.eia.gov),
# found via web search and confirmed live on a real GitHub Actions runner.
# This is EIA's own ArcGIS Hub hosting, not the HIFLD lineage substations/
# transmission come from, so it is unaffected by the HIFLD Open shutdown.
# Represents the 7 US RTO/ISO regions (PJM, MISO, ERCOT, CAISO, SPP, NYISO,
# ISO-NE). EIA's own documentation notes these boundaries are illustrative
# (RTOs don't have crisp legal borders the way states do, and shapes can
# overlap or leave gaps) -- passed through as-is, never treated as more
# precise than the source claims. Real field schema was not knowable before
# the first live fetch, so attributes are passed through unfiltered rather
# than guessing field names.
ISO_RTO_URL = "https://services7.arcgis.com/FGr1D95XCGALKXqM/ArcGIS/rest/services/RTO_Regions/FeatureServer/0/query"

# ── EPA Community Water System Service Area Boundaries ──────────────────
# EPA's own national dataset of drinking-water service-area polygons for
# 44,000+ community water systems (~99% of the population served by
# community water systems nationwide), covering all 50 states + DC +
# tribal/territory systems. Found via web search and confirmed live on a
# real GitHub Actions probe dispatch: real schema includes PWSID, PWS_Name,
# Primacy_Agency, Population_Served_Count, Service_Connections_Count,
# Service_Area_Type, Verification_Status, Area_SqKM. This is WATER
# INFRASTRUCTURE (a utility's known service territory) -- distinct from
# water_stress (a scarcity index) and distinct from a capacity/main-size
# claim, which this source does not carry. Service areas are drawn at
# varying confidence (see Verification_Status/Model_Method) -- passed
# through as reported, never upgraded to "confirmed" by this project.
WATER_SYSTEM_URL = "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Water_System_Boundaries/FeatureServer/0/query"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "USDataCenterPolicyTracker/1.0 (research; github.com/bobbytrenkamp-lgtm/test1)"})


def _get(url: str, params: dict, retries: int = 3, delay: float = 2.0) -> dict | None:
    for attempt in range(retries):
        try:
            r = SESSION.get(url, params=params, timeout=60)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            log.warning("GET %s attempt %d/%d failed: %s", url, attempt + 1, retries, exc)
            if attempt < retries - 1:
                time.sleep(delay * (2 ** attempt))
    return None


def _arcgis_paginate(url: str, where: str, out_fields: str, max_per_page: int = 2000,
                      extra_params: dict | None = None) -> list[dict]:
    """Fetch all records from an ArcGIS Feature Service using pagination.

    extra_params lets a caller add query params (e.g. maxAllowableOffset
    to have the server generalize/simplify polygon geometry before
    transmission) without every other caller needing to know about them.
    """
    records: list[dict] = []
    offset = 0
    while True:
        params = {
            "where":           where,
            "outFields":       out_fields,
            "outSR":           "4326",
            "f":               "json",
            "resultRecordCount": max_per_page,
            "resultOffset":    offset,
            "geometryType":    "esriGeometryPoint",
            "returnGeometry":  "true",
        }
        if extra_params:
            params.update(extra_params)
        data = _get(url, params)
        if not data:
            break
        if "error" in data:
            # ArcGIS Feature Services routinely return HTTP 200 with an
            # {"error": {...}} body for a bad query (unknown field, a
            # renamed/retired layer, a malformed `where` clause) —
            # raise_for_status() never sees this, since the HTTP layer
            # succeeded. Reading .get("features", []) off an error object
            # silently returns an empty list indistinguishable from a
            # genuinely empty result set, which is exactly what happened
            # here: every HIFLD layer returned 0 records with no error
            # printed anywhere in CI logs. Surface it instead of guessing.
            err = data["error"]
            log.warning("ArcGIS query error from %s: %s", url,
                        err.get("message", err) if isinstance(err, dict) else err)
            break
        features = data.get("features", [])
        records.extend(features)
        log.info("  fetched %d records (total so far: %d)", len(features), len(records))
        if len(features) < max_per_page:
            break
        offset += max_per_page
        time.sleep(0.5)
    return records


# ── Substations ─────────────────────────────────────────────────────────────

def fetch_substations() -> list[dict]:
    """
    Fetch high-voltage electric substations (>= 69 kV) within the continental US.
    Returns list of simplified point dicts for sample_layers.json.
    """
    log.info("Fetching HIFLD substations (>= 69 kV)…")
    # No STATUS filter: the probe that confirmed this mirror's schema was
    # summary-only (ogrinfo -so never surfaces real attribute values), so
    # the real enum values STATUS actually takes on THIS mirror are
    # unconfirmed. Filtering on a guessed 'IN SERVICE' could silently drop
    # most records if the real value differs even slightly (case, spacing,
    # a different vocabulary entirely). STATUS is instead passed through
    # as reported, same discipline already used for wastewater/power-plant
    # permit status elsewhere in this file.
    where = "COUNTRY = 'USA' AND LATITUDE IS NOT NULL AND LONGITUDE IS NOT NULL"
    raw = _arcgis_paginate(SUBSTATION_URL, where,
                           "ID,NAME,TYPE,STATUS,MAX_VOLT,MIN_VOLT,COUNTY,STATE,"
                           "COUNTYFIPS,LONGITUDE,LATITUDE")
    if not raw:
        log.warning("No substation data returned.")
        return []

    out = []
    all_states_seen: set[str] = set()
    for feat in raw:
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        all_states_seen.add(str(a.get("STATE") or "").strip())
        try:
            max_v = float(a.get("MAX_VOLT") or 0)
        except (TypeError, ValueError):
            max_v = 0
        if max_v < 69:
            continue  # skip low-voltage distribution substations
        lon = geom.get("x") or a.get("LONGITUDE")
        lat = geom.get("y") or a.get("LATITUDE")
        if not lon or not lat:
            continue
        county_fips = str(a.get("COUNTYFIPS") or "").zfill(5)
        out.append({
            "id":          f"sub-{a.get('ID','')}",
            "name":        (a.get("NAME") or "Unknown Substation").title(),
            "type":        a.get("TYPE", "substation"),
            "status":      a.get("STATUS", ""),
            "voltage_kv":  int(max_v),
            "county_fips": county_fips,
            "state":       a.get("STATE", ""),
            "lon":         round(float(lon), 5),
            "lat":         round(float(lat), 5),
        })
    log.info("Substations: %d raw records fetched, %d records (>= 69 kV) kept",
              len(raw), len(out))
    log.info("Raw fetch touched %d distinct STATE values (before voltage filter): %s",
              len(all_states_seen), sorted(s for s in all_states_seen if s))

    from collections import Counter
    state_counts = Counter(o["state"] for o in out if o["state"])
    log.info("Substations (>= 69 kV) by state (%d states represented): %s",
              len(state_counts), dict(sorted(state_counts.items())))

    if len(out) < 500:
        # Real HIFLD coverage is tens of thousands of substations nationwide.
        # A low count here doesn't mean an error (the ArcGIS response was
        # valid, no "error" key) — it means SUBSTATION_URL's current source
        # is a subset, not the full national layer. See its definition above.
        log.warning("Substation count (%d) looks like partial coverage, not "
                    "a fetch failure — see SUBSTATION_URL's comment.", len(out))
    return out


# ── Transmission lines ───────────────────────────────────────────────────────

def fetch_transmission_lines() -> list[dict]:
    """
    Fetch high-voltage transmission lines (>= 115 kV) within the continental US.
    Returns simplified polyline dicts (sampled path points).
    """
    log.info("Fetching HIFLD transmission lines (>= 115 kV)…")
    # This layer's schema has no COUNTRY column at all — every query
    # including one was rejected outright with "Cannot perform query.
    # Invalid query parameters." (confirmed against live data; the URL
    # itself was never broken).
    where = "STATUS = 'IN SERVICE'"
    data = _get(TRANSMISSION_URL, {
        "where":             where,
        "outFields":         "ID,OWNER,VOLTAGE,TYPE,SUB_1,SUB_2",
        "outSR":             "4326",
        "f":                 "json",
        "resultRecordCount": 2000,
        "returnGeometry":    "true",
        "geometryType":      "esriGeometryPolyline",
    })
    if not data:
        log.warning("No transmission data returned.")
        return []
    if "error" in data:
        # Same HTTP-200-with-error-body gotcha handled in _arcgis_paginate,
        # but this fetcher calls _get() directly rather than going through
        # that helper — needed here too, or a bad query silently reads back
        # as "0 records" instead of a diagnosable error.
        err = data["error"]
        log.warning("ArcGIS query error from %s: %s", TRANSMISSION_URL,
                    err.get("message", err) if isinstance(err, dict) else err)
        return []

    out = []
    for feat in (data.get("features") or []):
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        voltage_str = str(a.get("VOLTAGE", "") or "")
        voltages = []
        for part in voltage_str.replace(";", ",").split(","):
            try:
                voltages.append(float(part.strip()))
            except ValueError:
                pass
        max_v = max(voltages) if voltages else 0
        if max_v < 115:
            continue
        # paths is list of list of [lon, lat] pairs; sample every 10th point
        paths = geom.get("paths", [])
        sampled_path = []
        for ring in paths:
            sampled_path.extend(ring[::10])
        if not sampled_path:
            continue
        out.append({
            "id":         f"tx-{a.get('ID','')}",
            "name":       f"{a.get('SUB_1','?')} — {a.get('SUB_2','?')}",
            "voltage_kv": int(max_v),
            "owner":      a.get("OWNER", ""),
            "path":       [[round(p[0], 4), round(p[1], 4)] for p in sampled_path],
        })
    log.info("Transmission lines: %d records (>= 115 kV)", len(out))
    return out


# ── Power plants ─────────────────────────────────────────────────────────────
# STILL BROKEN, unlike substations/transmission above: POWER_PLANT_URL returns
# {"error":{"message":"Invalid URL"}} and no live replacement was found after
# searching both HIFLD orgs' service listings (services1.arcgis.com/
# Hp6G80Pky0om7QvQ and services.arcgis.com/G4S1dGvn7PIgYd6Y — the latter is
# where the working substations mirror lives, but it has no Power_Plants-
# named layer) and two DCAT catalog guesses (both came back empty/non-JSON).
# _arcgis_paginate's error-visibility fix means this now fails loudly (see
# BUG_TRACKER.md) rather than silently reading back as "0 records" — but it
# does still fail. Needs someone to actually find the current URL by hand
# (e.g. via hifld-geoplatform.hub.arcgis.com's search UI, which returned a
# 403 to every automated fetch attempted here) rather than guessing one.

def fetch_power_plants() -> list[dict]:
    """
    Fetch operating power plants from EPA's FRS_PowerPlants layer (EIA-860
    generator data joined with FRS facility records).

    HONESTY NOTE: this layer carries plant identity, location, operating
    status, and fuel source (ENERGY_SOURCE_1) -- all real, all usable. It
    does NOT carry a nameplate-capacity field. Every record's `capacity_mw`
    is therefore explicitly None, never estimated or defaulted to 0 --
    "unknown" and "zero megawatts" are not the same claim, and this project
    never conflates them. A future source (e.g. EIA-860 proper, if a free
    bulk download can be verified) may fill this gap later.

    Returns list of simplified point dicts, deduplicated by PLANT_CODE
    (this layer is one row per GENERATOR, so a multi-unit plant otherwise
    appears many times).
    """
    log.info("Fetching EPA FRS power plants (operating, US)…")
    where = "STATUS = 'OP' AND LATITUDE83 IS NOT NULL"
    raw = _arcgis_paginate(POWER_PLANT_URL, where,
                           "PLANT_CODE,PLANT_NAME,PRIMARY_NAME,STATE_CODE,COUNTY_NAME,FIPS_CODE,"
                           "STATUS,OPERATING_YEAR,ENERGY_SOURCE_1,SECTOR_NAME,LATITUDE83,LONGITUDE83")
    if not raw:
        log.warning("No power plant data returned.")
        return []

    seen_plant_codes: set[str] = set()
    out = []
    for feat in raw:
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        plant_code = str(a.get("PLANT_CODE") or "")
        if not plant_code or plant_code in seen_plant_codes:
            continue  # one row per generator; keep the plant only once
        lon = geom.get("x") or a.get("LONGITUDE83")
        lat = geom.get("y") or a.get("LATITUDE83")
        if not lon or not lat:
            continue
        seen_plant_codes.add(plant_code)
        county_fips = str(a.get("FIPS_CODE") or "").zfill(5)
        out.append({
            "id":           f"pp-{plant_code}",
            "name":         a.get("PLANT_NAME") or a.get("PRIMARY_NAME") or "Unknown Plant",
            "fuel_type":    a.get("ENERGY_SOURCE_1") or "unknown",
            "sector":       a.get("SECTOR_NAME") or "",
            "status":       a.get("STATUS") or "",
            "operating_year": a.get("OPERATING_YEAR"),
            "capacity_mw":  None,  # genuinely not in this source -- never fabricated
            "county_fips":  county_fips,
            "state":        a.get("STATE_CODE", ""),
            "lon":          round(float(lon), 5),
            "lat":          round(float(lat), 5),
        })
    log.info("Power plants: %d records (deduplicated by plant code)", len(out))
    return out


# ── Wastewater treatment facilities ─────────────────────────────────────────

def fetch_wastewater_facilities() -> list[dict]:
    """
    Fetch NPDES-permitted wastewater treatment facilities from EPA's
    FRS_Wastewater layer (FRS facility records joined with ICIS permit data).

    HONESTY NOTE: like fetch_power_plants(), this layer carries facility
    identity, location, county, and permit/facility-type classification --
    all real, all usable. It does NOT carry a capacity/flow-rate field, so
    `capacity_mgd` is explicitly None, never estimated or defaulted.
    Permit status (CWP_PERMIT_STATUS_CODE/DESC) is passed through as
    reported rather than filtered, since only the schema (not real status
    values) was confirmed live -- see WASTEWATER_URL's comment.

    Returns list of simplified point dicts, deduplicated by NPDES_ID.
    """
    log.info("Fetching EPA FRS/ICIS wastewater treatment facilities…")
    where = "FAC_LAT IS NOT NULL AND FAC_LONG IS NOT NULL"
    raw = _arcgis_paginate(WASTEWATER_URL, where,
                           "NPDES_ID,REGISTRY_ID,CWP_NAME,CWP_STREET,CWP_CITY,CWP_STATE,"
                           "CWP_COUNTY,FAC_DERIVED_FIPS,CWP_MAJOR_MINOR_STATUS,"
                           "CWP_PERMIT_STATUS_CODE,CWP_PERMIT_STATUS_DESC,"
                           "CWP_FACILITY_TYPE_DESC,CWP_CSO_FLAG,FAC_LAT,FAC_LONG")
    if not raw:
        log.warning("No wastewater facility data returned.")
        return []

    seen_npdes_ids: set[str] = set()
    out = []
    for feat in raw:
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        npdes_id = str(a.get("NPDES_ID") or "")
        if not npdes_id or npdes_id in seen_npdes_ids:
            continue
        lon = geom.get("x") or a.get("FAC_LONG")
        lat = geom.get("y") or a.get("FAC_LAT")
        if not lon or not lat:
            continue
        seen_npdes_ids.add(npdes_id)
        county_fips = str(a.get("FAC_DERIVED_FIPS") or "").zfill(5)
        out.append({
            "id":                  f"ww-{npdes_id}",
            "name":                a.get("CWP_NAME") or "Unknown Facility",
            "registry_id":         a.get("REGISTRY_ID") or "",
            "facility_type":       a.get("CWP_FACILITY_TYPE_DESC") or "",
            "major_minor_status":  a.get("CWP_MAJOR_MINOR_STATUS") or "",
            "permit_status_code":  a.get("CWP_PERMIT_STATUS_CODE") or "",
            "permit_status_desc":  a.get("CWP_PERMIT_STATUS_DESC") or "",
            "combined_sewer_outfall": a.get("CWP_CSO_FLAG") or "",
            "capacity_mgd":        None,  # genuinely not in this source -- never fabricated
            "county_fips":         county_fips,
            "county_name":         a.get("CWP_COUNTY") or "",
            "state":               a.get("CWP_STATE") or "",
            "city":                a.get("CWP_CITY") or "",
            "lon":                 round(float(lon), 5),
            "lat":                 round(float(lat), 5),
        })
    log.info("Wastewater facilities: %d records (deduplicated by NPDES ID)", len(out))
    return out


# ── Fiber / broadband coverage ───────────────────────────────────────────────

def fetch_fiber_coverage() -> dict[str, float]:
    """
    Fetch county-level fiber broadband availability from FCC National Broadband Map.
    Returns {county_fips: pct_locations_with_fiber} for all US counties.
    """
    log.info("Fetching FCC broadband fiber coverage by county…")

    # FCC BDC API — county availability summary
    # Docs: https://broadbandmap.fcc.gov/home/data
    # Endpoint returns JSON list of county records with technology breakdown
    result: dict[str, float] = {}

    # State FIPS codes 01–56 (skipping territories)
    state_fips = [f"{i:02d}" for i in range(1, 57)
                  if i not in (3, 7, 14, 43, 52)]  # skips unassigned FIPS

    for i, sfips in enumerate(state_fips):
        # A 405 (or any HTTP-level failure) here means the endpoint itself
        # rejected the request shape — see the FCC_COUNTY_URL comment above,
        # this now requires a registered API token this adapter doesn't
        # send. Retrying with backoff can't fix that, and confirmed via CI
        # logs that hammering all 51 states with 3 retries each burned ~6 of
        # the job's ~6.5 minutes for a guaranteed 0-result outcome. Probe
        # once with no retries on the first state; if it fails, stop rather
        # than repeating the same failure 50 more times.
        data = _get(FCC_COUNTY_URL, {
            "state_fips": sfips,
            "f":          "json",
        }, retries=1 if i == 0 else 3)
        if not data:
            if i == 0:
                log.warning("FCC broadband API unreachable on first probe — "
                            "stopping rather than repeating this 50 more times. "
                            "See FCC_COUNTY_URL's comment: this endpoint now "
                            "requires a registered API token.")
                return result
            log.debug("No FCC data for state %s", sfips)
            continue
        # Expected structure: list of county records with availability stats
        records = data if isinstance(data, list) else data.get("results", data.get("data", []))
        for rec in (records or []):
            fips = str(rec.get("county_fips", rec.get("fips_code", "")) or "").zfill(5)
            if not fips or fips == "00000":
                continue
            # Fiber penetration: percent of locations with fiber-to-premises (tech code 50)
            fiber_pct = (
                rec.get("pct_bb_fiber")
                or rec.get("fiber_pct")
                or rec.get("tech_50_pct")
                or 0
            )
            try:
                result[fips] = round(float(fiber_pct), 1)
            except (TypeError, ValueError):
                pass
        time.sleep(0.3)

    log.info("Fiber coverage: %d counties", len(result))
    return result


# ── Water stress ─────────────────────────────────────────────────────────────

def fetch_water_stress() -> dict[str, float]:
    """
    Fetch county-level baseline water stress from EPA EnviroAtlas / WRI proxy.
    Score: 0.0 (low stress) to 5.0 (extremely high stress).
    Returns {county_fips: stress_score}.

    Falls back to USGS water use data if primary source unavailable.
    """
    log.info("Fetching water stress data by county…")

    result: dict[str, float] = {}

    # Try EPA EnviroAtlas county water stress layer
    data = _get(EPA_WATERS_URL, {
        "where":       "1=1",
        "outFields":   "FIPS,ws_bws",   # ws_bws = baseline water stress
        "f":           "json",
        "resultRecordCount": 5000,
    })
    if data and "error" in data:
        err = data["error"]
        log.warning("EPA EnviroAtlas query error: %s",
                    err.get("message", err) if isinstance(err, dict) else err)
    if data and data.get("features"):
        for feat in data["features"]:
            a = feat.get("attributes", {})
            fips = str(a.get("FIPS") or "").zfill(5)
            stress = a.get("ws_bws")
            if fips and stress is not None:
                try:
                    result[fips] = round(float(stress), 2)
                except (TypeError, ValueError):
                    pass
        log.info("Water stress (EPA): %d counties", len(result))
        return result

    # Fallback: WRI Aqueduct via Esri hosted service
    log.info("Primary water source unavailable; trying WRI Aqueduct fallback…")
    wri_url = ("https://services.arcgis.com/LG9Yn2oFqZi5PnO5/arcgis/rest/services/"
               "Aqueduct_30_Baseline/FeatureServer/0/query")
    data = _get(wri_url, {
        "where":       "gid_0='USA'",
        "outFields":   "county_fips,bws_label,bws_raw",
        "f":           "json",
        "resultRecordCount": 5000,
    })
    if data and "error" in data:
        err = data["error"]
        log.warning("WRI Aqueduct query error: %s",
                    err.get("message", err) if isinstance(err, dict) else err)
    if data and data.get("features"):
        # Map WRI label to numeric score: Low=1, Low-Medium=2, Medium-High=3, High=4, Extremely High=5
        label_map = {"Low": 1.0, "Low-Medium": 2.0, "Medium-High": 3.0, "High": 4.0, "Extremely High": 5.0}
        for feat in data["features"]:
            a = feat.get("attributes", {})
            fips = str(a.get("county_fips") or "").zfill(5)
            raw = a.get("bws_raw")
            label = a.get("bws_label", "")
            if fips:
                score = raw if raw is not None else label_map.get(label)
                if score is not None:
                    try:
                        result[fips] = round(float(score), 2)
                    except (TypeError, ValueError):
                        pass
        log.info("Water stress (WRI): %d counties", len(result))

    return result


# ── ISO/RTO regions ──────────────────────────────────────────────────────

def fetch_iso_rto_regions() -> list[dict]:
    """
    Fetch the US RTO/ISO region boundaries from EIA's US Energy Atlas.
    Returns simplified polygon dicts (one per RTO/ISO). Ring vertices are
    downsampled for storage size -- these are large, detailed cartographic
    boundaries and a rough regional overlay doesn't need full resolution.

    HONESTY NOTE: this is coverage-area evidence only, not a power
    availability or interconnection-capacity claim. Being inside an
    RTO/ISO boundary says nothing about whether the grid there has spare
    capacity -- see interconnection queue data for that question.
    """
    log.info("Fetching EIA RTO/ISO region boundaries…")
    data = _get(ISO_RTO_URL, {
        "where":          "1=1",
        "outFields":      "*",
        "outSR":          "4326",
        "f":              "json",
        "returnGeometry": "true",
    })
    if not data:
        log.warning("No ISO/RTO region data returned.")
        return []
    if "error" in data:
        err = data["error"]
        log.warning("ArcGIS query error from %s: %s", ISO_RTO_URL,
                    err.get("message", err) if isinstance(err, dict) else err)
        return []

    features = data.get("features") or []
    if features:
        log.info("Sample ISO/RTO attributes (first feature): %s",
                 features[0].get("attributes", {}))

    out = []
    for feat in features:
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        rings = geom.get("rings", [])
        sampled_rings = [ring[::5] for ring in rings if len(ring) > 1]
        if not sampled_rings:
            continue
        name = (a.get("NAME") or a.get("RTO_NAME") or a.get("Name") or
                a.get("ABBREV") or a.get("Region") or "Unknown RTO/ISO")
        out.append({
            "id":         f"rto-{name}".lower().replace(" ", "-").replace("/", "-"),
            "name":       name,
            "attributes": a,  # real field schema unconfirmed before first live fetch -- passed through unfiltered
            "rings":      [[[round(p[0], 4), round(p[1], 4)] for p in ring] for ring in sampled_rings],
        })
    log.info("ISO/RTO regions: %d records", len(out))
    return out


# ── Water systems (drinking water service areas) ─────────────────────────

def fetch_water_systems() -> list[dict]:
    """
    Fetch EPA Community Water System service-area boundaries.

    Returns simplified polygon dicts, one per water system. Ring vertices
    are downsampled for storage size -- these are detailed cartographic
    service-area boundaries, and this is a national-overview layer, not a
    parcel-precision one.

    HONESTY NOTE: a service-area polygon says "this utility's known
    territory reaches here" -- it does NOT say the utility has spare
    capacity, does NOT give main size/location, and does NOT give a
    treatment plant location (see fetch_wastewater_facilities() for the
    wastewater side of that; no equivalent public EPA drinking-water
    treatment-plant point layer was found in this pass). Never conflate
    "inside a service area" with "water available."
    """
    log.info("Fetching EPA Community Water System service-area boundaries…")
    # This layer's 44,000+ service-area polygons are cartographically
    # detailed -- at full resolution, a handful of pages already produced
    # response bodies large enough to make a real fetch dispatch run past
    # 15 minutes with no sign of finishing (confirmed empirically, not
    # assumed). maxAllowableOffset asks the server to generalize geometry
    # to ~0.001 degrees (roughly 100m) before sending it, which is standard
    # ArcGIS REST behavior, not a hack, and is appropriate precision for a
    # national-overview layer (this project already downsamples rings
    # client-side for the same reason). A smaller page size bounds any
    # single response further.
    raw = _arcgis_paginate(WATER_SYSTEM_URL, "1=1",
                           "PWSID,PWS_Name,Primacy_Agency,Population_Served_Count,"
                           "Service_Connections_Count,Service_Area_Type,"
                           "Verification_Status,Model_Method,Area_SqKM",
                           max_per_page=500,
                           extra_params={"maxAllowableOffset": "0.001"})
    if not raw:
        log.warning("No water system data returned.")
        return []

    out = []
    for feat in raw:
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        rings = geom.get("rings", [])
        sampled_rings = [ring[::8] for ring in rings if len(ring) > 1]
        pwsid = str(a.get("PWSID") or "")
        # EPA's own PWSID convention is a 2-letter state postal code
        # prefix (e.g. "VA0000123") -- this is a documented EPA format
        # rule, not an inferred/guessed value, but it has not been
        # independently re-confirmed against real PWSID values from this
        # specific layer (only the field name was confirmed live).
        state_guess = pwsid[:2].upper() if len(pwsid) >= 2 and pwsid[:2].isalpha() else ""
        out.append({
            "id":                     f"ws-{pwsid or a.get('OBJECTID', len(out))}",
            "pwsid":                  pwsid,
            "name":                   a.get("PWS_Name") or "Unknown Water System",
            "primacy_agency":         a.get("Primacy_Agency") or "",
            "state":                  state_guess,
            "population_served":      a.get("Population_Served_Count"),
            "service_connections":    a.get("Service_Connections_Count"),
            "service_area_type":      a.get("Service_Area_Type") or "",
            "verification_status":    a.get("Verification_Status") or "",
            "boundary_method":        a.get("Model_Method") or "",
            "area_sqkm":              a.get("Area_SqKM"),
            "rings": [[[round(p[0], 4), round(p[1], 4)] for p in ring] for ring in sampled_rings],
        })

    log.info("Water systems: %d records", len(out))
    from collections import Counter
    state_counts = Counter(o["state"] for o in out if o["state"])
    log.info("Water systems by inferred state (%d states represented): %s",
              len(state_counts), dict(sorted(state_counts.items())))
    return out


# ── Update sample_layers.json ─────────────────────────────────────────────────

def update_layers(layers_path: str, updates: dict[str, Any]) -> None:
    with open(layers_path, encoding="utf-8") as f:
        data = json.load(f)

    for key, value in updates.items():
        if value:
            data[key] = value
            log.info("Updated layer '%s': %s records", key,
                     len(value) if isinstance(value, (list, dict)) else "n/a")

    data["_last_updated"] = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(layers_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    log.info("Wrote %s", layers_path)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch infrastructure data layers")
    parser.add_argument(
        "--layers",
        default="substations,transmission,power,wastewater,fiber,water,iso_rto,water_systems",
        help="Comma-separated list of layers to fetch",
    )
    args = parser.parse_args()
    enabled = {l.strip() for l in args.layers.split(",")}

    updates: dict[str, Any] = {}

    if "substations" in enabled:
        subs = fetch_substations()
        if subs:
            updates["power_infrastructure"] = subs

    if "transmission" in enabled:
        lines = fetch_transmission_lines()
        if lines:
            updates["transmission_lines"] = lines

    if "power" in enabled:
        plants = fetch_power_plants()
        if plants:
            updates["power_plants"] = plants

    if "wastewater" in enabled:
        wastewater = fetch_wastewater_facilities()
        if wastewater:
            updates["wastewater_facilities"] = wastewater

    if "fiber" in enabled:
        fiber = fetch_fiber_coverage()
        if fiber:
            updates["fiber_coverage"] = fiber

    if "water" in enabled:
        water = fetch_water_stress()
        if water:
            updates["water_stress"] = water

    if "iso_rto" in enabled:
        regions = fetch_iso_rto_regions()
        if regions:
            updates["iso_rto_regions"] = regions

    if "water_systems" in enabled:
        systems = fetch_water_systems()
        if systems:
            updates["water_systems"] = systems

    if updates:
        update_layers(LAYERS_PATH, updates)
    else:
        log.warning("No data fetched — sample_layers.json unchanged.")


if __name__ == "__main__":
    main()
