"""
tests/test_zoning_fetch_pagination.py

data/zoning/scripts/fetch_zoning.py's fetch_arcgis_featureserver() paginates
an ArcGIS FeatureServer layer. It used to stop as soon as a page came back
without an explicit exceededTransferLimit: true flag -- confirmed broken
2026-08-15 against Fairfax County's real zoning FeatureServer (hosted on
ArcGIS Online's shared infrastructure): a request bounded by an explicit
resultRecordCount returned exactly that many features with no
exceededTransferLimit flag at all, silently truncating 6,242 real features
down to 1,000. These tests pin the fix: a full page is itself sufficient
reason to keep paginating; only a page smaller than the requested page size
is proof there's nothing left.

Run: python3 -m pytest tests/test_zoning_fetch_pagination.py -q
"""
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent / "data" / "zoning" / "scripts"))
import fetch_zoning  # noqa: E402


def _feature(i):
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {"OBJECTID": i}}


def test_continues_past_a_full_page_with_no_exceededTransferLimit_flag():
    """The exact Fairfax County bug: full pages, flag never set."""
    pages = [
        {"type": "FeatureCollection", "features": [_feature(i) for i in range(1000)]},
        {"type": "FeatureCollection", "features": [_feature(i) for i in range(1000, 2000)]},
        {"type": "FeatureCollection", "features": [_feature(i) for i in range(2000, 2500)]},
    ]
    calls = {"n": 0}

    def fake_fetch_json(url, timeout=30):
        page = pages[calls["n"]]
        calls["n"] += 1
        return page

    with patch.object(fetch_zoning, "_fetch_json", side_effect=fake_fetch_json):
        result = fetch_zoning.fetch_arcgis_featureserver(
            "https://example.test/FeatureServer", layer_id=0, page_size=1000)

    assert len(result["features"]) == 2500, \
        f"expected all 2500 features across 3 pages, got {len(result['features'])}"
    assert calls["n"] == 3


def test_stops_when_a_page_is_smaller_than_page_size():
    pages = [
        {"type": "FeatureCollection", "features": [_feature(i) for i in range(1000)]},
        {"type": "FeatureCollection", "features": [_feature(i) for i in range(1000, 1400)]},
    ]
    calls = {"n": 0}

    def fake_fetch_json(url, timeout=30):
        page = pages[calls["n"]]
        calls["n"] += 1
        return page

    with patch.object(fetch_zoning, "_fetch_json", side_effect=fake_fetch_json):
        result = fetch_zoning.fetch_arcgis_featureserver(
            "https://example.test/FeatureServer", layer_id=0, page_size=1000)

    assert len(result["features"]) == 1400
    assert calls["n"] == 2, "must not request a third page once a partial page was seen"


def test_stops_immediately_on_zero_features():
    def fake_fetch_json(url, timeout=30):
        return {"type": "FeatureCollection", "features": []}

    with patch.object(fetch_zoning, "_fetch_json", side_effect=fake_fetch_json):
        result = fetch_zoning.fetch_arcgis_featureserver(
            "https://example.test/FeatureServer", layer_id=0, page_size=1000)

    assert result["features"] == []


def test_still_stops_on_explicit_exceededTransferLimit_false_with_partial_page():
    """A traditional ArcGIS Server that DOES set the flag correctly must
    still behave exactly as before -- this is a compatibility guard, not
    just a new-behavior test."""
    pages = [
        {"type": "FeatureCollection", "features": [_feature(i) for i in range(700)],
         "exceededTransferLimit": False},
    ]
    calls = {"n": 0}

    def fake_fetch_json(url, timeout=30):
        page = pages[calls["n"]]
        calls["n"] += 1
        return page

    with patch.object(fetch_zoning, "_fetch_json", side_effect=fake_fetch_json):
        result = fetch_zoning.fetch_arcgis_featureserver(
            "https://example.test/FeatureServer", layer_id=0, page_size=1000)

    assert len(result["features"]) == 700
    assert calls["n"] == 1


def test_where_clause_is_forwarded_to_the_query_url():
    captured_urls = []

    def fake_fetch_json(url, timeout=30):
        captured_urls.append(url)
        return {"type": "FeatureCollection", "features": [_feature(0)]}

    with patch.object(fetch_zoning, "_fetch_json", side_effect=fake_fetch_json):
        fetch_zoning.fetch_arcgis_featureserver(
            "https://example.test/FeatureServer", layer_id=0, page_size=1000,
            where="JURISDICTION='FAIRFAX COUNTY'")

    assert len(captured_urls) == 1
    assert "JURISDICTION" in captured_urls[0]
    assert "FAIRFAX" in captured_urls[0]


# ---------------------------------------------------------------------------
# build_hub_search_url -- regression for a real county-specific hardcoding
# bug: this used to hardcode filter[organization]=Loudoun regardless of
# which jurisdiction was being fetched. Harmless for the VA pilot counties
# (none of them use this code path), but a real bug for
# md-montgomery-county, which does.
# ---------------------------------------------------------------------------

def test_hub_search_url_has_no_organization_filter_by_default():
    url = fetch_zoning.build_hub_search_url("zoning districts")
    assert "organization" not in url

def test_hub_search_url_never_defaults_to_loudoun():
    # The literal regression case: no jurisdiction should ever get an
    # unrequested "Loudoun" filter baked into its own search.
    url = fetch_zoning.build_hub_search_url("zoning districts")
    assert "Loudoun" not in url

def test_hub_search_url_includes_the_search_term():
    url = fetch_zoning.build_hub_search_url("zoning districts")
    assert "zoning" in url

def test_hub_search_url_applies_an_explicit_organization_when_given():
    url = fetch_zoning.build_hub_search_url("zoning", hub_organization="Montgomery")
    assert "filter%5Borganization%5D=Montgomery" in url

def test_hub_search_url_url_encodes_the_organization():
    url = fetch_zoning.build_hub_search_url("zoning", hub_organization="Prince William")
    assert "Prince+William" in url or "Prince%20William" in url


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
