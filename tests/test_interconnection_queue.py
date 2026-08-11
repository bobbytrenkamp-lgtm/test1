"""tests/test_interconnection_queue.py — data/national_data_ingestion/
interconnection_queue.py's pure parse/map logic.

Every fixture row below uses the REAL column order and REAL sample values
confirmed via a live GitHub Actions dispatch against LBNL's actual '03.
Complete Queue Data' sheet (2026-08-11) -- not guessed or invented shapes.
The download/openpyxl-file-reading path is exercised by parse_workbook()
directly against a tiny real fixture .xlsx built in this test (real
openpyxl round-trip, not a mock), so the header-alignment check is proven
against actual file I/O, not just the pure row-parsing function.

Run:  python3 -m pytest tests/test_interconnection_queue.py -q
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.infrastructure_asset_schema import validate_asset  # noqa: E402
from data.national_data_ingestion.interconnection_queue import (  # noqa: E402
    RAW_HEADER,
    _sum_mw,
    parse_row,
    parse_workbook,
    parse_workbook_rows,
)

# Real sample rows, in RAW_HEADER order, taken verbatim from the live
# 2026-08-11 dispatch output (datetimes simplified to ISO strings here --
# parse_row already handles both datetime objects and strings via
# _iso_date, covered separately below).
REAL_WITHDRAWN_ROW = (
    "not assigned", "withdrawn", "2019-02-15", None, None, None, None,
    "Withdrawn", "Withdrawn", "Coconino", "AZ", 4005, "Twin Arrows 69kV Substation",
    "West", None, "Arizona Public Service", "APS", None, None, "ERIS", "Generation",
    "Solar", None, None, "Solar", 20, None, None, 2019, None,
)
REAL_OPERATIONAL_ROW = (
    "Q007 - 061", "operational", "2005-05-25", "2008-04-01", None, None, None,
    "In-Service", "IA Executed", "Navajo", "AZ", 4017, "Zeniff 69kV Substation",
    "West", None, "Arizona Public Service", "APS", None, None, "ERIS", "Generation",
    "Other", None, None, "Other", 24, None, None, 2005, 2008,
)


def test_raw_header_has_30_real_columns():
    assert len(RAW_HEADER) == 30
    assert RAW_HEADER[0] == "q_id"
    assert RAW_HEADER[-1] == "prop_year"


def test_a_real_withdrawn_row_parses_with_county_level_modeled_geometry():
    asset = parse_row(REAL_WITHDRAWN_ROW)
    assert asset is not None
    assert asset["queue_status"] == "withdrawn"
    assert asset["evidence_tier"] == "MODELED"
    assert asset["geometry"]["type"] == "Point"
    assert asset["county_fips"] == "04005"
    assert asset["capacity_mw"] == 20
    assert asset["technology"] == "Solar"
    assert "status" not in asset  # never borrows the generic status vocabulary


def test_project_name_falls_back_to_poi_name_when_blank():
    asset = parse_row(REAL_WITHDRAWN_ROW)
    assert asset["name"] == "Twin Arrows 69kV Substation"


def test_a_real_operational_row_parses_correctly():
    asset = parse_row(REAL_OPERATIONAL_ROW)
    assert asset["queue_status"] == "operational"
    assert asset["capacity_mw"] == 24
    assert asset["queue_id"] == "Q007 - 061"
    assert asset["queue_date"] == "2005-05-25"
    assert asset["proposed_online_date"] == "2008-04-01"


def test_sum_mw_combines_hybrid_components_not_just_the_first():
    assert _sum_mw(100, 50, None) == 150
    assert _sum_mw(None, None, None) is None  # missing is not zero
    assert _sum_mw(0, None, None) == 0  # a real reported zero is preserved


def test_row_with_no_q_status_is_excluded_not_fabricated():
    blank_row = (None,) * len(RAW_HEADER)
    assert parse_row(blank_row) is None


def test_row_with_unresolvable_county_gets_unknown_evidence_tier_and_no_geometry():
    row = list(REAL_WITHDRAWN_ROW)
    row[RAW_HEADER.index("fips_code")] = 99999  # not a real county
    asset = parse_row(tuple(row))
    assert asset["geometry"] is None
    assert asset["evidence_tier"] == "UNKNOWN"


def test_row_with_no_fips_at_all_still_parses_with_unknown_location():
    row = list(REAL_WITHDRAWN_ROW)
    row[RAW_HEADER.index("fips_code")] = None
    asset = parse_row(tuple(row))
    assert asset["geometry"] is None
    assert "county_fips" not in asset


def test_short_row_missing_trailing_columns_does_not_crash():
    # openpyxl can return a shorter tuple for a row whose trailing cells
    # are all empty -- must not IndexError.
    short_row = REAL_OPERATIONAL_ROW[:20]
    asset = parse_row(short_row)
    assert asset is not None


def test_parsed_rows_satisfy_the_real_infrastructure_asset_schema():
    doc = parse_workbook_rows([REAL_WITHDRAWN_ROW, REAL_OPERATIONAL_ROW], "2026-08-11")
    assert len(doc["assets"]) == 2
    for asset in doc["assets"]:
        result = validate_asset(asset)
        assert result.ok, result.errors


def test_every_row_is_accounted_for_included_or_excluded_never_silently_dropped():
    blank_row = (None,) * len(RAW_HEADER)
    unresolvable = list(REAL_WITHDRAWN_ROW)
    unresolvable[RAW_HEADER.index("fips_code")] = 99999

    doc = parse_workbook_rows(
        [REAL_WITHDRAWN_ROW, REAL_OPERATIONAL_ROW, blank_row, tuple(unresolvable)],
        "2026-08-11",
    )
    m = doc["meta"]
    assert m["total_rows_in_source"] == 4
    assert m["included"] == 2
    assert m["excluded_no_status"] == 1
    assert m["excluded_no_resolvable_county_location"] == 1
    assert m["included"] + m["excluded_no_status"] + m["excluded_no_resolvable_county_location"] == 4


def test_ids_are_unique_even_when_q_id_is_not_assigned_for_multiple_rows():
    doc = parse_workbook_rows([REAL_WITHDRAWN_ROW, REAL_WITHDRAWN_ROW], "2026-08-11")
    ids = [a["id"] for a in doc["assets"]]
    assert len(ids) == len(set(ids))


def test_parse_workbook_reads_a_real_xlsx_file_and_validates_the_header():
    openpyxl = __import__("openpyxl")
    import tempfile

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "03. Complete Queue Data"
    ws.append(["RETURN TO CONTENTS"] + [None] * (len(RAW_HEADER) - 1))
    ws.append(list(RAW_HEADER))
    ws.append(list(REAL_WITHDRAWN_ROW))
    ws.append(list(REAL_OPERATIONAL_ROW))

    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "fixture.xlsx"
        wb.save(str(path))
        doc = parse_workbook(path)
        assert doc["meta"]["total_rows_in_source"] == 2
        assert doc["meta"]["included"] == 2


def test_parse_workbook_raises_a_clear_error_on_a_changed_header():
    openpyxl = __import__("openpyxl")
    import tempfile

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "03. Complete Queue Data"
    ws.append(["RETURN TO CONTENTS"])
    ws.append(["totally_different_columns"])

    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "fixture.xlsx"
        wb.save(str(path))
        try:
            parse_workbook(path)
            assert False, "expected a ValueError for a mismatched header"
        except ValueError as e:
            assert "header" in str(e).lower()
