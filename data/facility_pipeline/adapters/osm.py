"""OpenStreetMap Overpass API adapter.

Queries for nodes/ways/relations tagged as data centers in the US.
Uses the public Overpass API — no authentication required.
"""
from __future__ import annotations

import time
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields, normalize_state
from . import BaseAdapter

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# QL query: all US features tagged as data centers
_QUERY = """
[out:json][timeout:120];
(
  node["building"="data_center"](24,-125,50,-66);
  node["building"="datacenter"](24,-125,50,-66);
  node["man_made"="data_center"](24,-125,50,-66);
  node["telecom"="data_center"](24,-125,50,-66);
  way["building"="data_center"](24,-125,50,-66);
  way["building"="datacenter"](24,-125,50,-66);
  way["man_made"="data_center"](24,-125,50,-66);
  way["telecom"="data_center"](24,-125,50,-66);
  relation["building"="data_center"](24,-125,50,-66);
  relation["building"="datacenter"](24,-125,50,-66);
  relation["man_made"="data_center"](24,-125,50,-66);
);
out center tags;
"""


def _osm_id(element: dict) -> str:
    t = element.get("type", "n")[0]
    return f"{t}{element.get('id', '')}"


def _lat_lon(element: dict) -> tuple[float | None, float | None]:
    if "center" in element:
        c = element["center"]
        return c.get("lat"), c.get("lon")
    return element.get("lat"), element.get("lon")


def _tags_to_record(element: dict, source_id: str) -> FacilityRecord:
    tags = element.get("tags", {})
    r = FacilityRecord()

    r.name = tags.get("name") or tags.get("operator") or ""
    r.operator = tags.get("operator") or tags.get("owner") or ""
    r.owner = tags.get("owner") or ""

    r.street_address = tags.get("addr:street", "")
    if tags.get("addr:housenumber"):
        r.street_address = f"{tags['addr:housenumber']} {r.street_address}".strip()
    r.city = tags.get("addr:city", "")
    r.zip_code = tags.get("addr:postcode", "")

    raw_state = tags.get("addr:state", "")
    full, abbr = normalize_state(raw_state)
    r.state = full or raw_state
    r.state_abbr = abbr

    lat, lon = _lat_lon(element)
    r.latitude = lat
    r.longitude = lon

    r.osm_id = _osm_id(element)
    r.primary_source = source_id
    r.confidence_tier = 3

    # Facility type heuristics
    capacity_raw = tags.get("power", "") or tags.get("plant:output:electricity", "")
    operator_lower = (r.operator or r.name or "").lower()
    hyperscale_ops = {
        "google", "meta", "facebook", "amazon", "aws", "microsoft", "apple",
        "oracle", "equinix", "digital realty", "coresite", "cyrusone",
    }
    if any(op in operator_lower for op in hyperscale_ops):
        r.facility_type = "hyperscale"
        r.is_hyperscale = True
    else:
        r.facility_type = "unknown"

    r.notes = f"osm_tags:{','.join(f'{k}={v}' for k, v in list(tags.items())[:5])}"

    normalize_record_fields(r)
    return r


class OSMAdapter(BaseAdapter):
    """Fetches data center features from OpenStreetMap via the Overpass API."""

    def __init__(self, source: FacilitySource):
        super().__init__(source)

    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        try:
            import requests
        except ImportError:
            raise RuntimeError("requests is required: pip install requests")

        resp = requests.post(
            OVERPASS_URL,
            data={"data": _QUERY},
            timeout=150,
            headers={"Accept-Encoding": "gzip, deflate"},
        )
        resp.raise_for_status()
        data = resp.json()

        for element in data.get("elements", []):
            tags = element.get("tags", {})
            if not tags.get("name") and not tags.get("operator"):
                continue
            r = _tags_to_record(element, self.source_id)
            yield self._stamp(r)
            time.sleep(0)  # yield control
