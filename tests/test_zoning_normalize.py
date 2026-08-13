"""
Tests for data/zoning/scripts/normalize_zoning.py's map_district_code().

Real-data motivation (2026-08-13): Loudoun County's live zoning GIS service
returns raw district codes without hyphens ('PDIP', 'JLMA3'), while
districts.json's hand-transcribed keys include them ('PD-IP', 'JLMA-3').
Without punctuation-insensitive matching, 56 real parcels (44 'PDIP' + 12
'JLMA3', counted from the live-fetched geometry on 2026-08-13) silently fell
through to "unclassified" even though their district is fully documented
under a differently-punctuated key. This is a real bug found from real data,
not a synthetic scenario.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data" / "zoning" / "scripts"))

import normalize_zoning as nz  # noqa: E402


def test_exact_match_untouched():
    known = {"PD-IP", "I1", "I2", "AR1", "JLMA-3", "B2", "PD-OP"}
    assert nz.map_district_code("I1", "va-loudoun-county", known) == "I1"


def test_hyphen_omitted_in_source_matches_hyphenated_known_code():
    known = {"PD-IP", "I1", "I2", "AR1", "JLMA-3", "B2", "PD-OP"}
    assert nz.map_district_code("PDIP", "va-loudoun-county", known) == "PD-IP"
    assert nz.map_district_code("JLMA3", "va-loudoun-county", known) == "JLMA-3"


def test_lowercase_and_whitespace_normalized():
    known = {"PD-IP"}
    assert nz.map_district_code(" pd-ip ", "va-loudoun-county", known) == "PD-IP"
    assert nz.map_district_code("pdip", "va-loudoun-county", known) == "PD-IP"


def test_genuinely_unmatched_code_returned_as_is_not_guessed():
    # 'IP' (Loudoun's real, common current-ordinance code, live-verified
    # 2026-08-13) must NOT be coerced to 'PD-IP' just because they share a
    # substring after punctuation-stripping -- that would be conflating two
    # different real district codes on a guess. It has no punctuation-
    # insensitive match against this known set, so it stays 'IP'.
    known = {"PD-IP", "I1", "I2", "AR1", "JLMA-3", "B2", "PD-OP"}
    assert nz.map_district_code("IP", "va-loudoun-county", known) == "IP"


def test_no_known_codes_falls_back_to_exact_uppercase():
    assert nz.map_district_code("ip", "va-loudoun-county", None) == "IP"
    assert nz.map_district_code("ip", "va-loudoun-county", set()) == "IP"


def test_two_known_codes_differing_only_by_punctuation_both_still_distinct_after_stripping():
    # A jurisdiction whose districts.json genuinely has two codes that would
    # collide after stripping punctuation would be a real data-quality
    # problem in that jurisdiction's own file, not something this function
    # should paper over -- verify Loudoun's real committed set has no such
    # collision so the punctuation-insensitive fallback is well-defined
    # in practice.
    districts_path = (
        ROOT / "data" / "zoning" / "jurisdictions" / "va-loudoun-county" / "districts.json"
    )
    import json

    data = json.loads(districts_path.read_text(encoding="utf-8"))
    codes = list(data.get("districts", {}).keys())
    stripped = [nz._punctuation_stripped(c) for c in codes]
    assert len(stripped) == len(set(stripped)), (
        "Loudoun districts.json has two codes that collide once punctuation "
        "is stripped -- map_district_code's fallback would be ambiguous"
    )
