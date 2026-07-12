#!/usr/bin/env python3
"""
Fetch infrastructure data relevant to data center site analysis.

Sources (all public, no authentication required):
  - HIFLD Electric Substations  (ArcGIS REST, Homeland Infrastructure Foundation-Level Data)
  - HIFLD Electric Transmission Lines
  - HIFLD Power Plants
  - FCC National Broadband Map  (county-level fiber coverage)
  - EPA WATERS / USGS           (county-level water availability proxy)

Outputs: updates data/sample_layers.json with real infrastructure data.

Usage:
    python data/fetch_infrastructure.py [--layers substations,transmission,power,fiber,water]
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
SUBSTATION_URL  = f"{HIFLD_BASE}/Electric_Substations/FeatureServer/0/query"
TRANSMISSION_URL= f"{HIFLD_BASE}/Electric_Power_Transmission_Lines/FeatureServer/0/query"
POWER_PLANT_URL = f"{HIFLD_BASE}/Power_Plants/FeatureServer/0/query"

# ── FCC National Broadband Map (public API, no auth) ──────────────────────
FCC_COUNTY_URL  = "https://broadbandmap.fcc.gov/api/public/map/listCountyAvailability"

# ── EPA WATERS (ArcGIS, public) ─────────────────────────────────────────────
# Watershed water stress via EPA EnviroAtlas
EPA_WATERS_URL  = "https://enviroatlas.epa.gov/arcgis/rest/services/Supplemental/USACensus2010/MapServer/6/query"

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


def _arcgis_paginate(url: str, where: str, out_fields: str, max_per_page: int = 2000) -> list[dict]:
    """Fetch all records from an ArcGIS Feature Service using pagination."""
    records: list[dict] = []
    offset = 0
    while True:
        data = _get(url, {
            "where":           where,
            "outFields":       out_fields,
            "outSR":           "4326",
            "f":               "json",
            "resultRecordCount": max_per_page,
            "resultOffset":    offset,
            "geometryType":    "esriGeometryPoint",
            "returnGeometry":  "true",
        })
        if not data:
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
    # HIFLD VOLTAGE field is a string like '69', '115', '138', '230', '345', '500', '765'
    # Filter to >= 69 kV (anything that can feed a major data center load)
    where = ("STATUS = 'IN SERVICE' AND "
             "COUNTRY = 'US' AND "
             "LONGITUDE IS NOT NULL AND LATITUDE IS NOT NULL")
    raw = _arcgis_paginate(SUBSTATION_URL, where,
                           "ID,NAME,TYPE,VOLTAGE,COUNTY,STATE,STATE_FIPS,COUNTY_FIPS,LONGITUDE,LATITUDE")
    if not raw:
        log.warning("No substation data returned.")
        return []

    out = []
    for feat in raw:
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        voltage_str = str(a.get("VOLTAGE", "") or "")
        # Parse max voltage (field may contain semicolons for multi-voltage: "115;230")
        voltages = []
        for part in voltage_str.replace(";", ",").split(","):
            try:
                voltages.append(float(part.strip()))
            except ValueError:
                pass
        max_v = max(voltages) if voltages else 0
        if max_v < 69:
            continue  # skip low-voltage distribution substations
        lon = geom.get("x") or a.get("LONGITUDE")
        lat = geom.get("y") or a.get("LATITUDE")
        if not lon or not lat:
            continue
        county_fips = str(a.get("COUNTY_FIPS") or "").zfill(5)
        out.append({
            "id":          f"sub-{a.get('ID','')}",
            "name":        (a.get("NAME") or "Unknown Substation").title(),
            "type":        a.get("TYPE", "substation"),
            "voltage_kv":  int(max_v),
            "county_fips": county_fips,
            "state":       a.get("STATE", ""),
            "lon":         round(float(lon), 5),
            "lat":         round(float(lat), 5),
        })
    log.info("Substations: %d records (>= 69 kV)", len(out))
    return out


# ── Transmission lines ───────────────────────────────────────────────────────

def fetch_transmission_lines() -> list[dict]:
    """
    Fetch high-voltage transmission lines (>= 115 kV) within the continental US.
    Returns simplified polyline dicts (sampled path points).
    """
    log.info("Fetching HIFLD transmission lines (>= 115 kV)…")
    # HIFLD VOLTAGE field similar to substations
    where = "STATUS = 'IN SERVICE' AND COUNTRY = 'US'"
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

def fetch_power_plants() -> list[dict]:
    """
    Fetch major power plants (>= 100 MW nameplate capacity).
    Returns list of simplified point dicts.
    """
    log.info("Fetching HIFLD power plants (>= 100 MW)…")
    where = ("STATUS = 'OP' AND "
             "COUNTRY = 'US' AND "
             "LONGITUDE IS NOT NULL")
    raw = _arcgis_paginate(POWER_PLANT_URL, where,
                           "Plant_Code,Plant_Name,PrimSource,Install_MW,Total_MW,County,StateName,County_FIPS,LONGITUDE,LATITUDE")
    if not raw:
        log.warning("No power plant data returned.")
        return []

    out = []
    for feat in raw:
        a = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        mw = a.get("Total_MW") or a.get("Install_MW") or 0
        try:
            mw = float(mw)
        except (TypeError, ValueError):
            mw = 0
        if mw < 100:
            continue
        lon = geom.get("x") or a.get("LONGITUDE")
        lat = geom.get("y") or a.get("LATITUDE")
        if not lon or not lat:
            continue
        county_fips = str(a.get("County_FIPS") or "").zfill(5)
        out.append({
            "id":           f"pp-{a.get('Plant_Code','')}",
            "name":         a.get("Plant_Name", "Unknown Plant"),
            "type":         a.get("PrimSource", "unknown"),
            "capacity_mw":  round(mw, 1),
            "county_fips":  county_fips,
            "state":        a.get("StateName", ""),
            "lon":          round(float(lon), 5),
            "lat":          round(float(lat), 5),
        })
    log.info("Power plants: %d records (>= 100 MW)", len(out))
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

    for sfips in state_fips:
        data = _get(FCC_COUNTY_URL, {
            "state_fips": sfips,
            "f":          "json",
        })
        if not data:
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


# ── Update sample_layers.json ─────────────────────────────────────────────────

def update_layers(layers_path: str, updates: dict[str, Any]) -> None:
    with open(layers_path) as f:
        data = json.load(f)

    for key, value in updates.items():
        if value:
            data[key] = value
            log.info("Updated layer '%s': %s records", key,
                     len(value) if isinstance(value, (list, dict)) else "n/a")

    data["_last_updated"] = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(layers_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    log.info("Wrote %s", layers_path)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch infrastructure data layers")
    parser.add_argument(
        "--layers",
        default="substations,transmission,power,fiber,water",
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

    if "fiber" in enabled:
        fiber = fetch_fiber_coverage()
        if fiber:
            updates["fiber_coverage"] = fiber

    if "water" in enabled:
        water = fetch_water_stress()
        if water:
            updates["water_stress"] = water

    if updates:
        update_layers(LAYERS_PATH, updates)
    else:
        log.warning("No data fetched — sample_layers.json unchanged.")


if __name__ == "__main__":
    main()
