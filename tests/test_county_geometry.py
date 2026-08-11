"""tests/test_county_geometry.py — data/national_data_ingestion/lib/county_geometry.py.

Verifies the TopoJSON bbox-centroid decoder against real, independently-
known county locations (not just "did it run without throwing") -- a wrong
decode that still produces *some* coordinate pair would otherwise pass
silently.

Run:  python3 -m pytest tests/test_county_geometry.py -q
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.national_data_ingestion.lib.county_geometry import (  # noqa: E402
    county_centroid,
    load_county_centroids,
)


def test_loads_every_county_in_the_vendored_topology():
    centroids = load_county_centroids()
    # The vendored us-atlas counties-10m.json carries 3,231 county
    # geometries (confirmed by direct inspection) -- every one that has
    # real boundary arcs should produce a centroid.
    assert len(centroids) >= 3200


def test_every_centroid_key_is_a_real_5_digit_fips_string():
    centroids = load_county_centroids()
    for fips in centroids:
        assert isinstance(fips, str) and len(fips) == 5 and fips.isdigit()


def test_loudoun_county_va_centroid_is_in_the_real_expected_region():
    # Loudoun County, VA (51107) is a real, well-known reference point this
    # project already uses extensively (e.g. the jurisdiction demo county) --
    # its true centroid is approximately (-77.6, 39.1).
    lon, lat = county_centroid("51107")
    assert -78.2 < lon < -77.2
    assert 38.8 < lat < 39.4


def test_maricopa_county_az_centroid_is_in_the_real_expected_region():
    # Maricopa County, AZ (04013) -- true centroid approximately (-112.3, 33.3).
    lon, lat = county_centroid("4013")  # un-padded input must still resolve
    assert -113.5 < lon < -111.0
    assert 32.5 < lat < 34.2


def test_unknown_fips_returns_none_not_a_fabricated_location():
    assert county_centroid("99999") is None


def test_result_is_cached_across_calls_not_redecoded_every_time():
    import data.national_data_ingestion.lib.county_geometry as mod
    mod._cache = None
    first = county_centroid("51107")
    cache_after_first = mod._cache
    second = county_centroid("24031")
    assert mod._cache is cache_after_first  # same dict object, not rebuilt
    assert first is not None and second is not None
