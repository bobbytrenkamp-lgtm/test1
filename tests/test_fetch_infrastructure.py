"""tests/test_fetch_infrastructure.py — data/fetch_infrastructure.py's power
plant fetcher.

fetch_power_plants() was broken for a long time (POWER_PLANT_URL pointed at
a retired HIFLD service). This tests the fix against a real, verified field
schema (confirmed 2026-08-08 via a live GitHub Actions dispatch against
geodata.epa.gov/arcgis/rest/services/OEI/FRS_PowerPlants/MapServer/12) --
not an imagined one. The two properties that matter most: a multi-generator
plant is deduplicated to one record, and capacity_mw is always None (this
source genuinely has no capacity field) rather than silently defaulted to 0
or fabricated from something else.

Run:  python3 -m pytest tests/test_fetch_infrastructure.py -q
"""
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

import fetch_infrastructure as fi  # noqa: E402


def _feature(plant_code, lon, lat, **overrides):
    attrs = {
        "PLANT_CODE": plant_code, "PLANT_NAME": f"Plant {plant_code}",
        "PRIMARY_NAME": f"Plant {plant_code}", "STATE_CODE": "VA",
        "COUNTY_NAME": "Loudoun", "FIPS_CODE": "51107", "STATUS": "OP",
        "OPERATING_YEAR": 2010, "ENERGY_SOURCE_1": "NG", "SECTOR_NAME": "Electric Utility",
    }
    attrs.update(overrides)
    return {"attributes": attrs, "geometry": {"x": lon, "y": lat}}


def test_multi_generator_plant_deduplicated_to_one_record():
    # Real layer is one row per GENERATOR -- a 3-unit plant must collapse
    # to a single power-plant record, not appear 3 times.
    raw = [
        _feature("1001", -77.49, 39.04, GENERATOR_ID="1"),
        _feature("1001", -77.49, 39.04, GENERATOR_ID="2"),
        _feature("1001", -77.49, 39.04, GENERATOR_ID="3"),
        _feature("1002", -77.50, 39.05),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    ids = sorted(r["id"] for r in result)
    assert ids == ["pp-1001", "pp-1002"]


def test_capacity_mw_is_always_none_never_fabricated():
    raw = [_feature("2001", -77.0, 39.0)]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    assert result[0]["capacity_mw"] is None


def test_real_fields_are_mapped_correctly():
    raw = [_feature("3001", -77.1, 39.1, PLANT_NAME="Test Generating Station",
                     ENERGY_SOURCE_1="SUN", STATE_CODE="CA", FIPS_CODE="06073")]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    r = result[0]
    assert r["name"] == "Test Generating Station"
    assert r["fuel_type"] == "SUN"
    assert r["state"] == "CA"
    assert r["county_fips"] == "06073"
    assert r["lon"] == -77.1
    assert r["lat"] == 39.1


def test_records_missing_coordinates_are_skipped_not_zeroed():
    raw = [
        {"attributes": {"PLANT_CODE": "4001", "PLANT_NAME": "No Coords"}, "geometry": {}},
        _feature("4002", -77.2, 39.2),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    assert len(result) == 1
    assert result[0]["id"] == "pp-4002"


def test_empty_upstream_response_returns_empty_list_not_error():
    with patch.object(fi, "_arcgis_paginate", return_value=[]):
        result = fi.fetch_power_plants()
    assert result == []


def test_records_missing_plant_code_are_skipped():
    raw = [
        {"attributes": {"PLANT_NAME": "No Code"}, "geometry": {"x": -77.3, "y": 39.3}},
        _feature("5001", -77.4, 39.4),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_power_plants()
    assert len(result) == 1
    assert result[0]["id"] == "pp-5001"


# ── Wastewater facilities ────────────────────────────────────────────────
# fetch_wastewater_facilities() -- against a real, verified field schema
# (confirmed 2026-08-09 via a live GitHub Actions dispatch, run 31289722600,
# against geodata.epa.gov/arcgis/rest/services/OEI/FRS_Wastewater/MapServer/1).
# Same honesty properties as power plants: deduplicated by NPDES_ID, and
# capacity_mgd is always None since this source has no capacity/flow field.

def _ww_feature(npdes_id, lon, lat, **overrides):
    attrs = {
        "NPDES_ID": npdes_id, "REGISTRY_ID": f"REG{npdes_id}",
        "CWP_NAME": f"Facility {npdes_id}", "CWP_STREET": "1 Plant Rd",
        "CWP_CITY": "Leesburg", "CWP_STATE": "VA", "CWP_COUNTY": "Loudoun",
        "FAC_DERIVED_FIPS": "51107", "CWP_MAJOR_MINOR_STATUS": "Major",
        "CWP_PERMIT_STATUS_CODE": "EFF", "CWP_PERMIT_STATUS_DESC": "Effective",
        "CWP_FACILITY_TYPE_DESC": "POTW", "CWP_CSO_FLAG": "N",
    }
    attrs.update(overrides)
    return {"attributes": attrs, "geometry": {"x": lon, "y": lat}}


def test_wastewater_dedup_by_npdes_id():
    raw = [
        _ww_feature("VA0001", -77.49, 39.04),
        _ww_feature("VA0001", -77.49, 39.04),
        _ww_feature("VA0002", -77.50, 39.05),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_wastewater_facilities()
    ids = sorted(r["id"] for r in result)
    assert ids == ["ww-VA0001", "ww-VA0002"]


def test_wastewater_capacity_mgd_is_always_none_never_fabricated():
    raw = [_ww_feature("VA0003", -77.0, 39.0)]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_wastewater_facilities()
    assert result[0]["capacity_mgd"] is None


def test_wastewater_real_fields_are_mapped_correctly():
    raw = [_ww_feature("VA0004", -77.1, 39.1, CWP_NAME="Test WWTP",
                        CWP_STATE="CA", FAC_DERIVED_FIPS="06073",
                        CWP_FACILITY_TYPE_DESC="Municipal")]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_wastewater_facilities()
    r = result[0]
    assert r["name"] == "Test WWTP"
    assert r["state"] == "CA"
    assert r["county_fips"] == "06073"
    assert r["facility_type"] == "Municipal"
    assert r["lon"] == -77.1
    assert r["lat"] == 39.1


def test_wastewater_records_missing_coordinates_are_skipped_not_zeroed():
    raw = [
        {"attributes": {"NPDES_ID": "VA0005", "CWP_NAME": "No Coords"}, "geometry": {}},
        _ww_feature("VA0006", -77.2, 39.2),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_wastewater_facilities()
    assert len(result) == 1
    assert result[0]["id"] == "ww-VA0006"


def test_wastewater_empty_upstream_response_returns_empty_list_not_error():
    with patch.object(fi, "_arcgis_paginate", return_value=[]):
        result = fi.fetch_wastewater_facilities()
    assert result == []


def test_wastewater_records_missing_npdes_id_are_skipped():
    raw = [
        {"attributes": {"CWP_NAME": "No ID"}, "geometry": {"x": -77.3, "y": 39.3}},
        _ww_feature("VA0007", -77.4, 39.4),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_wastewater_facilities()
    assert len(result) == 1
    assert result[0]["id"] == "ww-VA0007"


def test_wastewater_permit_status_is_passed_through_not_filtered():
    # Only the schema was confirmed live, not real enum values -- this
    # fetcher must not guess which CWP_PERMIT_STATUS_CODE values mean
    # "active" and silently drop the rest.
    raw = [_ww_feature("VA0008", -77.5, 39.5, CWP_PERMIT_STATUS_CODE="TER",
                        CWP_PERMIT_STATUS_DESC="Terminated")]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_wastewater_facilities()
    assert len(result) == 1
    assert result[0]["permit_status_code"] == "TER"
    assert result[0]["permit_status_desc"] == "Terminated"


# ── Water systems (partitioned by Primacy_Agency) ────────────────────────
# fetch_water_systems() used to issue one unpartitioned query against a
# 44,000+-feature layer and never finished in real dispatches (confirmed
# empirically, documented in the function's own docstring). The fix
# discovers real Primacy_Agency values live (never a hardcoded/guessed
# list) and fetches each partition independently, so one bad partition
# can't sink the whole run and the total is a real sum of real partitions.

def _ws_feature(pwsid, lon, lat, **overrides):
    attrs = {
        "PWSID": pwsid, "PWS_Name": f"System {pwsid}", "Primacy_Agency": "VA",
        "Population_Served_Count": 1000, "Service_Connections_Count": 400,
        "Service_Area_Type": "Community", "Verification_Status": "Verified",
        "Model_Method": "Parcel", "Area_SqKM": 12.5,
    }
    attrs.update(overrides)
    return {"attributes": attrs, "centroid": {"x": lon, "y": lat}}


def test_water_systems_discovers_partitions_before_fetching():
    with patch.object(fi, "_arcgis_distinct_values", return_value=["VA", "MD"]) as mock_discover, \
         patch.object(fi, "_arcgis_paginate", return_value=[]) as mock_paginate:
        fi.fetch_water_systems()
    mock_discover.assert_called_once_with(fi.WATER_SYSTEM_URL, "Primacy_Agency")
    assert mock_paginate.call_count == 2


def test_water_systems_no_partitions_discovered_aborts_cleanly():
    with patch.object(fi, "_arcgis_distinct_values", return_value=[]), \
         patch.object(fi, "_arcgis_paginate") as mock_paginate:
        result = fi.fetch_water_systems()
    assert result == []
    mock_paginate.assert_not_called()


def test_water_systems_partition_where_clause_is_scoped_and_escaped():
    with patch.object(fi, "_arcgis_distinct_values", return_value=["O'Brien Rural Water"]), \
         patch.object(fi, "_arcgis_paginate", return_value=[]) as mock_paginate:
        fi.fetch_water_systems()
    where = mock_paginate.call_args[0][1]
    assert where == "Primacy_Agency = 'O''Brien Rural Water'"


def test_water_systems_records_are_deduped_by_pwsid_across_partitions():
    raw_va = [_ws_feature("VA0000001", -77.0, 39.0)]
    raw_md = [_ws_feature("VA0000001", -77.0, 39.0), _ws_feature("MD0000002", -76.0, 39.5, Primacy_Agency="MD")]

    def fake_paginate(url, where, out_fields, max_per_page=None, extra_params=None):
        return raw_va if "VA" in where else raw_md

    with patch.object(fi, "_arcgis_distinct_values", return_value=["VA", "MD"]), \
         patch.object(fi, "_arcgis_paginate", side_effect=fake_paginate):
        result = fi.fetch_water_systems()
    assert len(result) == 2
    assert {r["pwsid"] for r in result} == {"VA0000001", "MD0000002"}


def test_water_systems_one_failed_partition_does_not_abort_the_batch():
    def fake_paginate(url, where, out_fields, max_per_page=None, extra_params=None):
        if "VA" in where:
            raise RuntimeError("simulated transport failure")
        return [_ws_feature("MD0000001", -76.0, 39.5, Primacy_Agency="MD")]

    with patch.object(fi, "_arcgis_distinct_values", return_value=["VA", "MD"]), \
         patch.object(fi, "_arcgis_paginate", side_effect=fake_paginate):
        result = fi.fetch_water_systems()
    assert len(result) == 1
    assert result[0]["pwsid"] == "MD0000001"


def test_water_systems_real_fields_are_mapped_correctly():
    raw = [_ws_feature("VA0000003", -77.2, 39.2, PWS_Name="Test Water Co",
                        Population_Served_Count=5000, Service_Connections_Count=1800,
                        Service_Area_Type="Community", Verification_Status="Verified",
                        Model_Method="Parcel", Area_SqKM=8.3)]
    with patch.object(fi, "_arcgis_distinct_values", return_value=["VA"]), \
         patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_water_systems()
    r = result[0]
    assert r["name"] == "Test Water Co"
    assert r["population_served"] == 5000
    assert r["service_connections"] == 1800
    assert r["service_area_type"] == "Community"
    assert r["verification_status"] == "Verified"
    assert r["area_sqkm"] == 8.3
    assert r["state"] == "VA"  # inferred from the PWSID prefix, not Primacy_Agency
    assert r["lon"] == -77.2
    assert r["lat"] == 39.2


def test_water_systems_records_missing_centroid_are_skipped_not_zeroed():
    raw = [
        {"attributes": {"PWSID": "VA0000004", "PWS_Name": "No Centroid"}, "centroid": {}},
        _ws_feature("VA0000005", -77.3, 39.3),
    ]
    with patch.object(fi, "_arcgis_distinct_values", return_value=["VA"]), \
         patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_water_systems()
    assert len(result) == 1
    assert result[0]["pwsid"] == "VA0000005"


def test_water_systems_records_missing_pwsid_are_skipped():
    raw = [
        {"attributes": {"PWS_Name": "No PWSID"}, "centroid": {"x": -77.4, "y": 39.4}},
        _ws_feature("VA0000006", -77.5, 39.5),
    ]
    with patch.object(fi, "_arcgis_distinct_values", return_value=["VA"]), \
         patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_water_systems()
    assert len(result) == 1
    assert result[0]["pwsid"] == "VA0000006"


def test_water_systems_empty_partition_response_does_not_error():
    with patch.object(fi, "_arcgis_distinct_values", return_value=["VA"]), \
         patch.object(fi, "_arcgis_paginate", return_value=[]):
        result = fi.fetch_water_systems()
    assert result == []


# ── ISO/RTO / electric planning areas ───────────────────────────────────
#
# fetch_iso_rto_regions() -- EIA's own US Energy Atlas RTO_Regions
# FeatureServer requires an ArcGIS token even for bare layer metadata (a
# real, live-confirmed dead end, see ISO_RTO_URL's comment). The real
# no-token replacement is HIFLD's "Electric Planning Areas" layer on the
# same HDR Inc. mirror already used for substations/transmission/power
# plants, confirmed live 2026-08-11 (count=94, real field schema below).

def _rto_feature(record_id, name, ring, **overrides):
    attrs = {
        "ID": record_id, "NAME": name, "COUNTRY": "USA", "NAICS_CODE": "2211",
        "NAICS_DESC": "ELECTRIC POWER GENERATION, TRANSMISSION AND DISTRIBUTION",
        "SOURCE": "FERC 714, EIA 860, EIA 861, TIGER/Line Shapefiles - U.S. Census",
        "ABBRV": None, "YEAR": "2018", "PEAK_LOAD": 11989.0, "PEAK_RANGE": 6038.0,
        "WEBSITE": "NOT AVAILABLE",
    }
    attrs.update(overrides)
    return {"attributes": attrs, "geometry": {"rings": [ring]}}


_SQUARE_RING = [[-90.0, 30.0], [-90.0, 31.0], [-89.0, 31.0], [-89.0, 30.0], [-90.0, 30.0]]


def test_iso_rto_real_fields_are_mapped_correctly():
    raw = {"features": [_rto_feature(
        "2775", "CALIFORNIA INDEPENDENT SYSTEM OPERATOR", _SQUARE_RING,
        ABBRV="CAISO", PEAK_LOAD=45000.0,
    )]}
    with patch.object(fi, "_get", return_value=raw):
        result = fi.fetch_iso_rto_regions()
    assert len(result) == 1
    r = result[0]
    assert r["id"] == "epa-2775"
    assert r["name"] == "CALIFORNIA INDEPENDENT SYSTEM OPERATOR"
    assert r["abbreviation"] == "CAISO"
    assert r["country"] == "USA"
    assert r["peak_load_mw"] == 45000.0
    assert r["website"] is None  # "NOT AVAILABLE" is a real sentinel, not a real URL


def test_iso_rto_website_not_available_sentinel_becomes_none():
    raw = {"features": [_rto_feature("195", "ALABAMA POWER COMPANY", _SQUARE_RING,
                                      WEBSITE="NOT AVAILABLE")]}
    with patch.object(fi, "_get", return_value=raw):
        result = fi.fetch_iso_rto_regions()
    assert result[0]["website"] is None


def test_iso_rto_real_website_is_passed_through():
    raw = {"features": [_rto_feature("13501", "NEW YORK INDEPENDENT SYSTEM OPERATOR",
                                      _SQUARE_RING, WEBSITE="https://www.nyiso.com")]}
    with patch.object(fi, "_get", return_value=raw):
        result = fi.fetch_iso_rto_regions()
    assert result[0]["website"] == "https://www.nyiso.com"


def test_iso_rto_records_with_no_rings_are_skipped():
    raw = {"features": [
        {"attributes": {"ID": "1", "NAME": "No Geometry"}, "geometry": {}},
        _rto_feature("2", "Has Geometry", _SQUARE_RING),
    ]}
    with patch.object(fi, "_get", return_value=raw):
        result = fi.fetch_iso_rto_regions()
    assert len(result) == 1
    assert result[0]["id"] == "epa-2"


def test_iso_rto_empty_upstream_response_returns_empty_list_not_error():
    with patch.object(fi, "_get", return_value={"features": []}):
        result = fi.fetch_iso_rto_regions()
    assert result == []


def test_iso_rto_none_response_returns_empty_list_not_error():
    with patch.object(fi, "_get", return_value=None):
        result = fi.fetch_iso_rto_regions()
    assert result == []


def test_iso_rto_arcgis_error_response_returns_empty_list_not_error():
    # The real "Token Required" failure mode this source used to hit --
    # must degrade to an empty list, never raise or return garbage.
    with patch.object(fi, "_get", return_value={"error": {"code": 499, "message": "Token Required"}}):
        result = fi.fetch_iso_rto_regions()
    assert result == []


def test_iso_rto_rings_are_downsampled_and_rounded():
    long_ring = [[-90.0 + i * 0.001, 30.0] for i in range(20)]
    raw = {"features": [_rto_feature("3", "Long Ring", long_ring)]}
    with patch.object(fi, "_get", return_value=raw):
        result = fi.fetch_iso_rto_regions()
    ring = result[0]["rings"][0]
    assert len(ring) < len(long_ring)  # downsampled, not the full vertex count
    assert all(len(str(p[0]).split(".")[-1]) <= 4 for p in ring)  # rounded to 4dp


# ── Substation quality classification ──────────────────────────────────────
#
# classify_substation_quality() is a pure function of fields the record
# already carries (type/status/name) -- confirmed against the real
# 53,826-record dataset: 37,891 TYPE='SUBSTATION' vs 15,349 TYPE='TAP' (a
# transmission-line branch point, not a switching facility) plus small
# RISER/DEAD END/NOT AVAILABLE counts; 51,786 STATUS='IN SERVICE'; ~46.8%
# of NAME values are the generic 'UnknownNNNNN' placeholder the source
# itself uses. See data/catalog/dataset_registry.json's substations entry
# for the full history these numbers come from.

def _sub_record(**overrides):
    rec = {
        "id": "sub-1", "name": "Ashburn Substation", "type": "SUBSTATION",
        "status": "IN SERVICE", "voltage_kv": 230, "county_fips": "51107",
        "state": "VA", "lon": -77.49, "lat": 39.04,
    }
    rec.update(overrides)
    return rec


def test_substation_all_three_signals_present_is_high_tier():
    result = fi.classify_substation_quality(_sub_record())
    assert result == {"quality_tier": "high", "quality_flags": []}


def test_substation_tap_type_flagged_non_substation():
    result = fi.classify_substation_quality(_sub_record(type="TAP"))
    assert result["quality_flags"] == ["non_substation_type"]
    assert result["quality_tier"] == "medium"  # exactly one flag


def test_substation_not_in_service_flagged():
    result = fi.classify_substation_quality(_sub_record(status="NOT AVAILABLE"))
    assert result["quality_flags"] == ["not_confirmed_in_service"]
    assert result["quality_tier"] == "medium"


def test_substation_placeholder_name_flagged():
    result = fi.classify_substation_quality(_sub_record(name="Unknown107655"))
    assert result["quality_flags"] == ["generic_name"]
    assert result["quality_tier"] == "medium"


def test_substation_a_real_but_differently_formatted_name_is_not_flagged():
    # The placeholder pattern is exactly 'Unknown' + digits, nothing looser --
    # a real substation that happens to be named e.g. "Unknown Creek Substation"
    # must not be caught by this.
    result = fi.classify_substation_quality(_sub_record(name="Unknown Creek Substation"))
    assert "generic_name" not in result["quality_flags"]


def test_substation_two_flags_is_low_tier():
    result = fi.classify_substation_quality(_sub_record(type="TAP", status="NOT AVAILABLE"))
    assert sorted(result["quality_flags"]) == ["non_substation_type", "not_confirmed_in_service"]
    assert result["quality_tier"] == "low"


def test_substation_all_three_flags_is_low_tier():
    result = fi.classify_substation_quality(
        _sub_record(type="RISER", status="UNDER CONST", name="Unknown42"))
    assert len(result["quality_flags"]) == 3
    assert result["quality_tier"] == "low"


def _substation_feature(id_, lon, lat, **overrides):
    attrs = {
        "ID": id_, "NAME": f"Substation {id_}", "TYPE": "SUBSTATION",
        "STATUS": "IN SERVICE", "MAX_VOLT": 230, "MIN_VOLT": 115,
        "COUNTY": "Loudoun", "STATE": "VA", "COUNTYFIPS": "51107",
    }
    attrs.update(overrides)
    return {"attributes": attrs, "geometry": {"x": lon, "y": lat}}


def test_fetch_substations_stamps_quality_tier_on_every_record():
    raw = [
        _substation_feature("1", -77.49, 39.04),
        _substation_feature("2", -77.50, 39.05, TYPE="TAP", NAME="Unknown99"),
    ]
    with patch.object(fi, "_arcgis_paginate", return_value=raw):
        result = fi.fetch_substations()
    tiers = {r["id"]: r["quality_tier"] for r in result}
    assert tiers == {"sub-1": "high", "sub-2": "low"}
    # quality_flags travels with the record too, not just the bare tier.
    low = next(r for r in result if r["id"] == "sub-2")
    assert set(low["quality_flags"]) == {"non_substation_type", "generic_name"}
