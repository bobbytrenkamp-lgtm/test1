#!/usr/bin/env python3
"""Offline unit tests for data/update_economic_data.py.

Every test runs without network access. API responses are sample payloads
shaped like the real FRED and Census responses, including the specific
malformed values those APIs actually emit ("." for missing FRED observations,
-666666666 ACS jam values, CBP disclosure flags).

The emphasis is on the ways this pipeline could silently corrupt data rather
than crash: a missing value becoming 0, a suppressed CBP cell entering a
ranking, an API outage overwriting good committed data with an empty file.
Those are the failures nobody notices until a chart is wrong.

Run:
    python3 -m pytest tests/test_economic_data.py -q
    python3 tests/test_economic_data.py          # falls back to a plain runner
"""
import json
import re
import sys
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "data"))
import update_economic_data as econ  # noqa: E402


# ────────────────────────── sample API payloads ──────────────────────────

FRED_SERIES_RESPONSE = {
    "seriess": [{
        "id": "DGS10",
        "title": "Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity",
        "observation_start": "1962-01-02",
        "observation_end": "2026-07-24",
        "frequency": "Daily", "frequency_short": "D",
        "units": "Percent", "units_short": "%",
        "seasonal_adjustment": "Not Seasonally Adjusted",
        "seasonal_adjustment_short": "NSA",
        "last_updated": "2026-07-25 15:18:03-05",
        "notes": "For further information regarding treasury constant maturity data, please refer to the H.15 release.",
    }]
}

# "." is FRED's missing-observation marker — market holidays for a daily series.
FRED_OBS_RESPONSE = {
    "observations": [
        {"date": "2026-07-20", "value": "4.21"},
        {"date": "2026-07-21", "value": "4.25"},
        {"date": "2026-07-22", "value": "."},
        {"date": "2026-07-23", "value": "4.30"},
        {"date": "2026-07-24", "value": "4.28"},
    ]
}

ACS_VARIABLES_RESPONSE = {
    "variables": {
        # Real label confirmed live 2026-07-27: just "Estimate!!Total", not
        # "Estimate!!Total population" -- the wrong guess this fixture used
        # to make, which silently nulled population on every live ACS run
        # since the feature first shipped (undetected because verify_variables()
        # fails safe by omitting the metric rather than crashing).
        "B01003_001E": {"label": "Estimate!!Total", "concept": "TOTAL POPULATION"},
        "B01002_001E": {"label": "Estimate!!Median age --!!Total", "concept": "MEDIAN AGE BY SEX"},
        "B19013_001E": {"label": "Estimate!!Median household income in the past 12 months", "concept": "MEDIAN HOUSEHOLD INCOME"},
        "B19301_001E": {"label": "Estimate!!Per capita income in the past 12 months", "concept": "PER CAPITA INCOME"},
        "B23025_003E": {"label": "Estimate!!Total:!!In labor force:!!Civilian labor force:", "concept": "EMPLOYMENT STATUS"},
        "B23025_004E": {"label": "Estimate!!Total:!!In labor force:!!Civilian labor force:!!Employed", "concept": "EMPLOYMENT STATUS"},
        "B23025_005E": {"label": "Estimate!!Total:!!In labor force:!!Civilian labor force:!!Unemployed", "concept": "EMPLOYMENT STATUS"},
        "B15003_001E": {"label": "Estimate!!Total:", "concept": "EDUCATIONAL ATTAINMENT"},
        "B15003_022E": {"label": "Estimate!!Total:!!Bachelor's degree", "concept": "EDUCATIONAL ATTAINMENT"},
        "B15003_023E": {"label": "Estimate!!Total:!!Master's degree", "concept": "EDUCATIONAL ATTAINMENT"},
        "B15003_024E": {"label": "Estimate!!Total:!!Professional school degree", "concept": "EDUCATIONAL ATTAINMENT"},
        "B15003_025E": {"label": "Estimate!!Total:!!Doctorate degree", "concept": "EDUCATIONAL ATTAINMENT"},
        "B25077_001E": {"label": "Estimate!!Median value (dollars)", "concept": "MEDIAN VALUE"},
        "B25064_001E": {"label": "Estimate!!Median gross rent", "concept": "MEDIAN GROSS RENT"},
        "B28002_001E": {"label": "Estimate!!Total:", "concept": "PRESENCE OF INTERNET SUBSCRIPTIONS"},
        "B28002_004E": {"label": "Estimate!!Total:!!With an Internet subscription:!!Broadband of any type",
                        "concept": "PRESENCE OF INTERNET SUBSCRIPTIONS"},
        "B11001_001E": {"label": "Estimate!!Total:", "concept": "HOUSEHOLD TYPE (INCLUDING LIVING ALONE)"},
        "B23025_001E": {"label": "Estimate!!Total:", "concept": "EMPLOYMENT STATUS"},
        "B23025_002E": {"label": "Estimate!!Total:!!In labor force:", "concept": "EMPLOYMENT STATUS"},
        "B25003_001E": {"label": "Estimate!!Total:", "concept": "TENURE"},
        "B25003_002E": {"label": "Estimate!!Total:!!Owner occupied", "concept": "TENURE"},
        "B25002_001E": {"label": "Estimate!!Total:", "concept": "OCCUPANCY STATUS"},
        "B25002_003E": {"label": "Estimate!!Total:!!Vacant", "concept": "OCCUPANCY STATUS"},
        "B17001_001E": {"label": "Estimate!!Total:", "concept": "POVERTY STATUS IN THE PAST 12 MONTHS BY SEX BY AGE"},
        "B17001_002E": {"label": "Estimate!!Total:!!Income in the past 12 months below poverty level:",
                        "concept": "POVERTY STATUS IN THE PAST 12 MONTHS BY SEX BY AGE"},
        "B08013_001E": {"label": "Estimate!!Aggregate travel time to work (in minutes)",
                        "concept": "AGGREGATE TRAVEL TIME TO WORK OF WORKERS BY SEX"},
        "B08012_001E": {"label": "Estimate!!Total:", "concept": "TRAVEL TIME TO WORK"},
    }
}

# Census returns a header row then data rows. -666666666 is the documented
# "not computable" jam value; a county with no rent data emits it.
ACS_COUNTY_RESPONSE = [
    ["NAME", "B01003_001E", "B19013_001E", "B23025_003E", "B23025_005E", "B25064_001E", "state", "county"],
    ["Loudoun County, Virginia", "429782", "170463", "232004", "6032", "2114", "51", "107"],
    ["Travis County, Texas",     "1326436", "95321", "780112", "31204", "1699", "48", "453"],
    ["Loving County, Texas",     "64",     "-666666666", "40", "0", "-666666666", "48", "301"],
]

CBP_RESPONSE = [
    ["NAME", "ESTAB", "EMP", "PAYANN", "EMP_F", "PAYANN_F", "state", "county", "NAICS2017"],
    ["Loudoun County, Virginia", "412", "18204", "2841002", "", "", "51", "107", "518210"],
    # 'D' = withheld to avoid disclosing individual company data.
    ["Loving County, Texas",     "1",   "0",     "0",       "D", "D", "48", "301", "518210"],
]


# ────────────────────────── test helpers ──────────────────────────

_results = {"pass": 0, "fail": 0}


def check(cond, msg):
    if cond:
        _results["pass"] += 1
    else:
        _results["fail"] += 1
        print(f"  FAIL: {msg}")


def eq(actual, expected, msg):
    check(actual == expected, f"{msg} — expected {expected!r}, got {actual!r}")


# ────────────────────────── numeric parsing ──────────────────────────

def test_parse_number_missing_markers():
    """Missing must be None, never 0. Several tracked series sit near zero
    (T10Y2Y, NFCI), so a fabricated 0 is indistinguishable from real data."""
    for raw in [".", "", "  ", None, "N/A", "NA", "null", "(NA)", "*", "-", "abc", True, False]:
        eq(econ.parse_number(raw), None, f"parse_number({raw!r}) should be None")


def test_parse_number_valid():
    eq(econ.parse_number("4.28"), 4.28, "plain decimal")
    eq(econ.parse_number("0"), 0.0, "zero is a REAL value, not missing")
    eq(econ.parse_number("-1.25"), -1.25, "negative (yield spread can invert)")
    eq(econ.parse_number("1,326,436"), 1326436.0, "comma-grouped integer")
    eq(econ.parse_number(429782), 429782.0, "already numeric")


def test_parse_number_census_jam_values():
    """ACS jam values must not become real numbers — a -666666666 median income
    would render as a -$666 million choropleth value."""
    for jam in (-666666666, -999999999, -888888888, -222222222):
        eq(econ.parse_number(jam), None, f"jam value {jam} should be None")
        eq(econ.parse_number(str(jam)), None, f"jam value {jam} as string should be None")


def test_parse_number_non_finite():
    eq(econ.parse_number(float("nan")), None, "NaN should be None")
    eq(econ.parse_number(float("inf")), None, "inf should be None")


# ────────────────────────── change / growth math ──────────────────────────

def test_pct_change():
    eq(econ.pct_change(110, 100), 10.0, "simple +10%")
    eq(econ.pct_change(90, 100), -10.0, "simple -10%")
    eq(econ.pct_change(100, 100), 0.0, "no change is 0.0, distinct from None")


def test_pct_change_guards():
    eq(econ.pct_change(100, 0), None, "division by zero must be None, not inf")
    eq(econ.pct_change(None, 100), None, "missing new value -> None")
    eq(econ.pct_change(100, None), None, "missing baseline -> None, never 'no change'")
    eq(econ.pct_change(None, None), None, "both missing -> None")


def test_pct_change_negative_base():
    """Uses abs() on the denominator so a negative baseline still yields a
    correctly-signed change (NFCI and T10Y2Y go negative)."""
    eq(econ.pct_change(-0.5, -1.0), 50.0, "-1.0 -> -0.5 is a 50% move toward zero")


def test_cagr():
    eq(econ.cagr(121, 100, 2), 10.0, "2-year CAGR of 100->121 is 10%")
    eq(econ.cagr(100, 100, 5), 0.0, "flat CAGR is 0")


def test_cagr_guards():
    """A CAGR through zero or from a negative base is undefined — fractional
    powers of a negative number are complex, not a growth rate."""
    eq(econ.cagr(100, 0, 5), None, "zero base -> None")
    eq(econ.cagr(100, -50, 5), None, "negative base -> None")
    eq(econ.cagr(0, 100, 5), None, "zero endpoint -> None")
    eq(econ.cagr(100, 50, 0), None, "zero years -> None")
    eq(econ.cagr(None, 50, 5), None, "missing endpoint -> None")


def test_safe_ratio_pct():
    eq(econ.safe_ratio_pct(6032, 232004), 2.6, "unemployment rate 6032/232004")
    eq(econ.safe_ratio_pct(5, 0), None, "zero denominator must be None, never a crash")
    eq(econ.safe_ratio_pct(0, 100), 0.0, "genuine 0% is a real value")
    eq(econ.safe_ratio_pct(None, 100), None, "missing numerator -> None")


# ────────────────────────── FRED observation parsing ──────────────────────────

def test_fred_observations_parse():
    obs = econ.build_fred_observations(FRED_OBS_RESPONSE["observations"], today=date(2026, 7, 26))
    eq(len(obs), 5, "all five observations retained")
    eq(obs[0], ["2026-07-20", 4.21], "first observation parsed")
    eq(obs[2], ["2026-07-22", None], "'.' preserved as None, NOT dropped and NOT 0")
    eq(obs[4], ["2026-07-24", 4.28], "last observation parsed")


def test_fred_observations_gap_preserved():
    """The gap must survive as an explicit None so the chart breaks the line
    instead of interpolating a straight segment through a day with no data."""
    obs = econ.build_fred_observations(FRED_OBS_RESPONSE["observations"], today=date(2026, 7, 26))
    nones = [d for d, v in obs if v is None]
    eq(nones, ["2026-07-22"], "exactly the holiday is null")


def test_fred_observations_rejects_future_dates():
    raw = [
        {"date": "2026-07-20", "value": "4.21"},
        {"date": "2027-01-01", "value": "9.99"},   # impossible
    ]
    obs = econ.build_fred_observations(raw, today=date(2026, 7, 26))
    eq(len(obs), 1, "future-dated observation dropped")
    eq(obs[0][0], "2026-07-20", "only the valid row survives")


def test_fred_observations_sorted_and_deduped():
    raw = [
        {"date": "2026-07-24", "value": "4.28"},
        {"date": "2026-07-20", "value": "4.21"},
        {"date": "2026-07-24", "value": "4.99"},   # duplicate date
        {"date": "not-a-date", "value": "1.0"},
    ]
    obs = econ.build_fred_observations(raw, today=date(2026, 7, 26))
    eq([d for d, _ in obs], ["2026-07-20", "2026-07-24"], "sorted ascending, deduped, junk dropped")


def test_fred_last_valid_skips_trailing_nulls():
    obs = [["2026-07-20", 4.21], ["2026-07-23", 4.30], ["2026-07-24", None]]
    d, v = econ._last_valid(obs)
    eq((d, v), ("2026-07-23", 4.30), "latest REAL value, not the trailing null")


def test_fred_value_on_or_before():
    """YoY baselines walk backwards by date, which keeps them correct for
    irregular frequencies (weekly claims, quarterly GDP) and gapped series."""
    obs = [["2025-07-24", 3.90], ["2026-01-15", 4.10], ["2026-07-24", 4.28]]
    d, v = econ._value_on_or_before(obs, date(2026, 7, 24) - timedelta(days=365))
    eq((d, v), ("2025-07-24", 3.90), "picks the observation at the year-ago boundary")
    d2, v2 = econ._value_on_or_before(obs, date(2020, 1, 1))
    eq((d2, v2), (None, None), "no observation that old -> None, not the earliest row")


# ────────────────────────── Census FIPS + variables ──────────────────────────

def test_census_fips_construction():
    """County FIPS is state(2) + county(3), zero-padded to exactly 5 chars.
    Alabama county 1 must be '01001', never '11'."""
    eq(str("1").zfill(2) + str("1").zfill(3), "01001", "zero-padding both parts")
    eq(str("51").zfill(2) + str("107").zfill(3), "51107", "Loudoun County")
    eq(str("48").zfill(2) + str("301").zfill(3), "48301", "Loving County")


def test_verify_variables_accepts_valid():
    cfg = json.loads((Path(econ.ROOT) / "data" / "economy" / "census_config.json").read_text())
    selected, problems = econ.verify_variables(cfg, ACS_VARIABLES_RESPONSE["variables"])
    check("population" in selected, "population verified against real labels")
    check("unemployment_rate" in selected, "unemployment_rate verified")
    check("bachelors_or_higher_pct" in selected, "education metric verified")
    check("broadband_pct" in selected, "broadband verified via candidate list")
    eq(selected["broadband_pct"]["broadband"], "B28002_004E", "picked the any-type broadband line")


def test_verify_variables_accepts_new_metrics():
    """The six metrics added for the ACS expansion (households through
    avg_commute_minutes) must verify against realistic label text, not just
    happen to exist in the config -- this is exactly the check that would
    have caught a wrong table/variable ID before it ever reached a live run."""
    cfg = json.loads((Path(econ.ROOT) / "data" / "economy" / "census_config.json").read_text())
    selected, problems = econ.verify_variables(cfg, ACS_VARIABLES_RESPONSE["variables"])
    for metric in ("households", "labor_force_participation_rate", "homeownership_rate",
                   "housing_vacancy_rate", "poverty_rate", "avg_commute_minutes"):
        check(metric in selected, f"{metric} verified against realistic ACS labels")
        check(metric not in problems, f"{metric} has no verification problems")


def test_verify_variables_rejects_label_mismatch():
    """A variable ID that exists but means something else must be REJECTED, not
    silently used. This is the B28002-moved-between-vintages scenario."""
    corrupted = json.loads(json.dumps(ACS_VARIABLES_RESPONSE["variables"]))
    corrupted["B19013_001E"]["label"] = "Estimate!!Total households with a boat"
    cfg = json.loads((Path(econ.ROOT) / "data" / "economy" / "census_config.json").read_text())
    selected, problems = econ.verify_variables(cfg, corrupted)
    check("median_household_income" not in selected,
          "mismatched label must exclude the metric")
    check("median_household_income" in problems,
          "the mismatch must be recorded as a problem for metadata")


def test_verify_variables_rejects_missing_variable():
    trimmed = {k: v for k, v in ACS_VARIABLES_RESPONSE["variables"].items()
               if k != "B25077_001E"}
    cfg = json.loads((Path(econ.ROOT) / "data" / "economy" / "census_config.json").read_text())
    selected, problems = econ.verify_variables(cfg, trimmed)
    check("median_home_value" not in selected, "absent variable excludes the metric")
    check("median_home_value" in problems, "absence recorded as a problem")


def test_variable_request_chunking():
    """Census caps variables per request at 50; batches must respect that."""
    ids = [f"B0000{i:03d}E" for i in range(120)]
    batches = econ._chunk_variables(ids, 50)
    eq(len(batches), 3, "120 variables -> 3 batches")
    check(all(len(b) <= 50 for b in batches), "no batch exceeds the cap")
    eq(sum(len(b) for b in batches), 120, "no variable lost in batching")


# ────────────────────────── derived metrics ──────────────────────────

def _cfg():
    return json.loads((Path(econ.ROOT) / "data" / "economy" / "census_config.json").read_text())


def test_derive_unemployment_rate():
    cfg = _cfg()
    spec = cfg["metrics"]["unemployment_rate"]
    chosen = {"labor_force": "B23025_003E", "employed": "B23025_004E", "unemployed": "B23025_005E"}
    row = {"B23025_003E": "232004", "B23025_005E": "6032"}
    eq(econ.derive_metric("unemployment_rate", spec, chosen, row), 2.6,
       "6032/232004 = 2.6%")


def test_derive_unemployment_zero_labor_force():
    """A county with no labor force must yield None, not a ZeroDivisionError
    and not 0% (which would read as full employment)."""
    cfg = _cfg()
    spec = cfg["metrics"]["unemployment_rate"]
    chosen = {"labor_force": "B23025_003E", "employed": "B23025_004E", "unemployed": "B23025_005E"}
    eq(econ.derive_metric("unemployment_rate", spec, chosen,
                          {"B23025_003E": "0", "B23025_005E": "0"}), None,
       "zero labor force -> None")


def test_derive_bachelors_or_higher():
    """Sum of the four degree levels over population 25+."""
    cfg = _cfg()
    spec = cfg["metrics"]["bachelors_or_higher_pct"]
    chosen = {"denominator": "B15003_001E", "bachelors": "B15003_022E",
              "masters": "B15003_023E", "professional": "B15003_024E",
              "doctorate": "B15003_025E"}
    row = {"B15003_001E": "1000", "B15003_022E": "300", "B15003_023E": "150",
           "B15003_024E": "30", "B15003_025E": "20"}
    eq(econ.derive_metric("bachelors_or_higher_pct", spec, chosen, row), 50.0,
       "(300+150+30+20)/1000 = 50%")


def test_derive_bachelors_all_parts_missing():
    cfg = _cfg()
    spec = cfg["metrics"]["bachelors_or_higher_pct"]
    chosen = {"denominator": "B15003_001E", "bachelors": "B15003_022E",
              "masters": "B15003_023E", "professional": "B15003_024E",
              "doctorate": "B15003_025E"}
    row = {"B15003_001E": "1000", "B15003_022E": ".", "B15003_023E": None,
           "B15003_024E": "", "B15003_025E": "-666666666"}
    eq(econ.derive_metric("bachelors_or_higher_pct", spec, chosen, row), None,
       "no degree data at all -> None, not 0%")


def test_derive_direct_with_jam_value():
    cfg = _cfg()
    spec = cfg["metrics"]["median_household_income"]
    eq(econ.derive_metric("median_household_income", spec, {"value": "B19013_001E"},
                          {"B19013_001E": "-666666666"}), None,
       "jam value -> None so Loving County is 'No data', not -$666M")


def test_derive_avg_commute_minutes():
    """'average' must divide WITHOUT the *100 that 'ratio' applies -- this is
    a genuine mean, not a percentage, and safe_ratio_pct's built-in *100 would
    silently turn a real ~25-minute commute into ~2500 minutes."""
    cfg = _cfg()
    spec = cfg["metrics"]["avg_commute_minutes"]
    chosen = {"aggregate_minutes": "B08013_001E", "commuters": "B08012_001E"}
    row = {"B08013_001E": "50000", "B08012_001E": "2000"}
    eq(econ.derive_metric("avg_commute_minutes", spec, chosen, row), 25.0,
       "50000 minutes / 2000 commuters = 25.0 minutes, not 2500%")


def test_derive_avg_commute_minutes_zero_commuters():
    cfg = _cfg()
    spec = cfg["metrics"]["avg_commute_minutes"]
    chosen = {"aggregate_minutes": "B08013_001E", "commuters": "B08012_001E"}
    eq(econ.derive_metric("avg_commute_minutes", spec, chosen,
                          {"B08013_001E": "0", "B08012_001E": "0"}), None,
       "zero commuters -> None, not a ZeroDivisionError")


def test_derive_poverty_rate():
    cfg = _cfg()
    spec = cfg["metrics"]["poverty_rate"]
    chosen = {"below_poverty": "B17001_002E", "total": "B17001_001E"}
    row = {"B17001_002E": "1500", "B17001_001E": "10000"}
    eq(econ.derive_metric("poverty_rate", spec, chosen, row), 15.0,
       "1500/10000 = 15.0%")


def test_derive_homeownership_rate():
    cfg = _cfg()
    spec = cfg["metrics"]["homeownership_rate"]
    chosen = {"owner_occupied": "B25003_002E", "total_occupied": "B25003_001E"}
    row = {"B25003_002E": "6500", "B25003_001E": "10000"}
    eq(econ.derive_metric("homeownership_rate", spec, chosen, row), 65.0,
       "6500/10000 = 65.0%")


def test_derive_housing_vacancy_rate():
    cfg = _cfg()
    spec = cfg["metrics"]["housing_vacancy_rate"]
    chosen = {"vacant": "B25002_003E", "total_units": "B25002_001E"}
    row = {"B25002_003E": "800", "B25002_001E": "10000"}
    eq(econ.derive_metric("housing_vacancy_rate", spec, chosen, row), 8.0,
       "800/10000 = 8.0%")


def test_derive_labor_force_participation_rate():
    cfg = _cfg()
    spec = cfg["metrics"]["labor_force_participation_rate"]
    chosen = {"in_labor_force": "B23025_002E", "population_16plus": "B23025_001E"}
    row = {"B23025_002E": "7200", "B23025_001E": "10000"}
    eq(econ.derive_metric("labor_force_participation_rate", spec, chosen, row), 72.0,
       "7200/10000 = 72.0%")


def test_derive_households_direct():
    cfg = _cfg()
    spec = cfg["metrics"]["households"]
    eq(econ.derive_metric("households", spec, {"value": "B11001_001E"},
                          {"B11001_001E": "42000"}), 42000.0,
       "direct passthrough, same as population")


# ────────────────────────── CBP suppression ──────────────────────────

def test_cbp_suppression_flags_recognised():
    """A 'D'-flagged cell reports 0 in the raw payload. Trusting that number
    would put a fake zero into rankings; the flag must win over the value."""
    cfg = _cfg()
    flags = set(cfg["_cbp"]["suppression_flags"])
    check("D" in flags, "'D' (withheld) is a suppression flag")
    header = CBP_RESPONSE[0]
    idx = {n: i for i, n in enumerate(header)}
    row = CBP_RESPONSE[2]
    raw_emp = row[idx["EMP"]]
    flag = row[idx["EMP_F"]]
    eq(raw_emp, "0", "raw payload really does say 0")
    check(flag in flags, "but the flag marks it suppressed")
    value = None if flag in flags else econ.parse_number(raw_emp)
    eq(value, None, "suppressed cell resolves to None, never 0")


def test_cbp_suppressed_excluded_from_change():
    """Suppression must not become an endpoint in a percent change."""
    eq(econ.pct_change(None, 18204), None, "suppressed new value -> no change figure")
    eq(econ.pct_change(18204, None), None, "suppressed baseline -> no change figure")


# ────────────────────────── Building Permits (BPS via FRED) ──────────────────────────

def test_bps_series_id_format():
    """FRED's per-county series ID is BPPRIV + a 3-digit zero-padded state
    code + the 3-digit county code (6 digits total), NOT the plain 5-digit
    FIPS -- confirmed against real published series: BPPRIV048089 (Colorado
    County, TX, FIPS 48089), BPPRIV044007 (Providence County, RI, FIPS
    44007), BPPRIV012011 (Broward County, FL, FIPS 12011). A live run using
    the un-padded 5-digit form returned HTTP 400 'series does not exist' for
    every county checked, which is what caught this."""
    eq(econ._bps_series_id("48089"), "BPPRIV048089", "matches the real published series ID")
    eq(econ._bps_series_id("44007"), "BPPRIV044007", "two-digit state FIPS gets one more leading zero")
    eq(econ._bps_series_id("12011"), "BPPRIV012011", "matches the real published series ID")
    eq(econ._bps_series_id("01001"), "BPPRIV001001", "single-digit-looking state FIPS still gets padded to 3 digits")


def _fake_fred_obs_json(url, **kwargs):
    """Route a fake FRED observations response by series_id embedded in the
    URL, the same way fred_observations() actually builds it -- so this
    exercises collect_permits() exactly as it calls that real function,
    without needing to know or duplicate URL-building logic in the test.

    Three groups of series_id, matching the three things a real run sees:
    the two specific named counties below (with real multi-year data, for the
    YoY-computation test), a "9xxxx" block that always has one observation
    (bulk padding so tests can clear the 500-result floor without hand-writing
    500 rows), and everything else (404 -- most US counties have never
    reported to BPS, and that must resolve to "skipped", not an error).
    """
    m = re.search(r"series_id=([A-Za-z0-9]+)", url)
    sid = m.group(1) if m else None
    # Recover the underlying FIPS from the real series-ID transform (BPPRIV +
    # a leading "0" + the 5-digit FIPS) so this routes on FIPS, not on a
    # hardcoded series-ID string that would silently stop matching anything
    # if _bps_series_id's format ever changes again.
    fips = sid[len("BPPRIV0"):] if sid and sid.startswith("BPPRIV0") else None
    if fips == "01001":
        return {"observations": [
            {"date": "2023-01-01", "value": "412"},
            {"date": "2024-01-01", "value": "455"},
        ]}
    if fips == "01003":
        return {"observations": [{"date": "2024-01-01", "value": "88"}]}
    if fips and fips.startswith("9"):
        return {"observations": [{"date": "2024-01-01", "value": "10"}]}
    return {"__error__": "HTTP 404"}


def test_collect_permits_skips_counties_without_a_series():
    """A missing per-county series is the expected case for most counties, not
    a failure -- it must be silently excluded, never crash the whole module."""
    real_get_json = econ._get_json
    econ._get_json = _fake_fred_obs_json
    try:
        real_padding = [f"9{i:04d}" for i in range(600)]          # -> real data
        no_series_padding = [f"{i:05d}" for i in range(10000, 10600)]  # -> 404
        fips_list = ["01001", "01003"] + real_padding + no_series_padding
        out = econ.collect_permits(fips_list, "fakekey")
    finally:
        econ._get_json = real_get_json
    check("01001" in out and "01003" in out, "the two real series are present")
    check(all(f not in out for f in no_series_padding),
          "no-series FIPS must not appear in the result at all")
    eq(len(out), 2 + len(real_padding), "result is exactly the counties with real data")


def test_collect_permits_computes_year_over_year_change():
    """The whole point of a county-level permits figure is trend, not just a
    level -- a bare '455 permits' says nothing about direction."""
    real_get_json = econ._get_json
    econ._get_json = _fake_fred_obs_json
    try:
        real_padding = [f"9{i:04d}" for i in range(600)]
        out = econ.collect_permits(["01001"] + real_padding, "fakekey")
    finally:
        econ._get_json = real_get_json
    rec = out.get("01001")
    check(rec is not None, "01001 should be present (has real data)")
    eq(rec["value"], 455, "latest value is the most recent observation")
    eq(rec["as_of"], "2024-01-01", "as_of is the latest observation's date")
    expected_yoy = econ.pct_change(455, 412)
    eq(rec["change_yoy_pct"], expected_yoy, "YoY computed against the prior year's observation")


def test_collect_permits_rejects_suspiciously_small_result():
    """Real BPS coverage is broad even though not universal; a tiny result
    means the series ID scheme or the key is wrong, not that almost no county
    in America has ever issued a building permit."""
    real_get_json = econ._get_json
    econ._get_json = _fake_fred_obs_json
    try:
        # Only the two real series in the whole list -- 2 results, far under
        # the 500 floor.
        out = econ.collect_permits(["01001", "01003"], "fakekey")
    finally:
        econ._get_json = real_get_json
    eq(out, {}, "2 counties is far below the 500-county sanity floor -> rejected")


def test_collect_permits_below_floor_warning_shows_error_detail():
    """When the result is too small, the warning must say WHY, not just how
    many. A bare '0 counties returned real data' -- what this module actually
    said the first time it ran live -- is not diagnosable; there is no way to
    tell a systemic problem (wrong series ID pattern, bad key) apart from
    genuinely sparse BPS coverage in that sample."""
    econ.warnings.clear()
    real_get_json = econ._get_json
    econ._get_json = lambda url, **kw: {"__error__": "HTTP 500"}  # not a plain 404
    try:
        out = econ.collect_permits(["01001", "01003", "01005"], "fakekey")
    finally:
        econ._get_json = real_get_json
    eq(out, {}, "3 counties is far below the floor -> rejected")
    joined = " ".join(econ.warnings)
    check("Building Permits" in joined, "warning was recorded")
    check("HTTP 500" in joined,
          f"the actual error reason must appear in the warning so a systemic problem is "
          f"diagnosable, not just a count; got: {joined}")


def test_collect_permits_respects_max_counties_cap():
    """--permits-max-counties bounds a test run; it must actually stop, not
    just document an intention."""
    real_get_json = econ._get_json
    calls = []

    def counting_get_json(url, **kwargs):
        calls.append(url)
        return _fake_fred_obs_json(url, **kwargs)

    econ._get_json = counting_get_json
    try:
        fips_list = [f"{i:05d}" for i in range(30000, 31000)]
        econ.collect_permits(fips_list, "fakekey", max_counties=25)
    finally:
        econ._get_json = real_get_json
    eq(len(calls), 25, "must stop at the cap, not check every county in the list")


def test_collect_permits_max_counties_samples_across_full_list():
    """A capped run must be a cross-section, not a prefix. The first live
    bounded test (max_counties=50) sampled 50 alphabetically-first FIPS,
    which happened to all fall in Alabama, and returned 0 hits -- with a
    prefix sample, a real 0-hit result is indistinguishable from 'the sample
    got unlucky and only covered one state'. Striding across the whole list
    makes a capped run a genuine test of the full geographic spread."""
    real_get_json = econ._get_json
    calls = []

    def counting_get_json(url, **kwargs):
        calls.append(url)
        return _fake_fred_obs_json(url, **kwargs)

    econ._get_json = counting_get_json
    try:
        fips_list = [f"{i:05d}" for i in range(50000, 52000)]  # 2,000 entries
        econ.collect_permits(fips_list, "fakekey", max_counties=20)
    finally:
        econ._get_json = real_get_json
    ids = [re.search(r"series_id=([A-Za-z0-9]+)", u).group(1) for u in calls]
    checked_nums = sorted(int(i.replace("BPPRIV", "")) for i in ids)
    span = checked_nums[-1] - checked_nums[0] if checked_nums else 0
    # A prefix of 20 out of 2,000 sequential FIPS spans at most 19. Striding
    # across the full 2,000-entry list should span most of that range.
    check(span > 1000,
          f"sample spans only {span} (min={checked_nums[0] if checked_nums else None}, "
          f"max={checked_nums[-1] if checked_nums else None}) — looks like a prefix, not "
          f"a cross-section of the full list")


def test_validate_outputs_flags_bad_building_permits():
    """A negative permits value or a future as_of date is exactly the kind of
    corruption validate_outputs() exists to catch before it ships."""
    with tempfile.TemporaryDirectory() as td:
        county_path = Path(td) / "census_county.json"
        payload = {
            "generated_at": "2026-07-27T00:00:00+00:00",
            "acs_vintage": 2024,
            "counties": {
                "01001": {
                    "metrics": {},
                    "history": {},
                    "building_permits": {"value": -3, "as_of": "2024-01-01", "change_yoy_pct": 1.0},
                },
            },
        }
        county_path.write_text(json.dumps(payload))
        real_county_out = econ.COUNTY_OUT
        real_state_out = econ.STATE_OUT
        real_fred_out = econ.FRED_OUT
        econ.COUNTY_OUT = county_path
        econ.STATE_OUT = Path(td) / "does_not_exist_state.json"
        econ.FRED_OUT = Path(td) / "does_not_exist_fred.json"
        try:
            errs = econ.validate_outputs()
        finally:
            econ.COUNTY_OUT = real_county_out
            econ.STATE_OUT = real_state_out
            econ.FRED_OUT = real_fred_out
    check(any("building_permits" in e for e in errs),
          f"negative building_permits.value should have been flagged; got: {errs}")


# ────────────────────────── BLS QCEW wages ──────────────────────────

def test_get_csv_rows_parses_header_keyed_dicts():
    """_get_csv_rows must key rows by the file's own header row (via
    DictReader), not by hardcoded column positions -- resilient to BLS
    reordering columns, matching how the rest of this pipeline tolerates
    payload shape drift elsewhere."""
    fake_csv = "area_fips,agglvl_code,annual_avg_wkly_wage\n01001,70,812\n"
    real_urlopen = econ.urllib.request.urlopen

    class _FakeResp:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self): return fake_csv.encode("utf-8")

    econ.urllib.request.urlopen = lambda req, timeout=None: _FakeResp()
    try:
        rows, err = econ._get_csv_rows("https://example.invalid/x.csv")
    finally:
        econ.urllib.request.urlopen = real_urlopen
    eq(err, None, "no error on a well-formed CSV")
    eq(len(rows), 1, "one data row parsed")
    eq(rows[0]["annual_avg_wkly_wage"], "812", "keyed by header name, not position")


def test_discover_bls_vintage_picks_newest_responding_year():
    real_get_csv = econ._get_csv_rows

    def fake(url, **kwargs):
        if f"/{date.today().year - 1}/" in url:
            return [{"agglvl_code": "70"}], None
        return None, "HTTP 404"

    econ._get_csv_rows = fake
    try:
        year = econ.discover_bls_vintage()
    finally:
        econ._get_csv_rows = real_get_csv
    eq(year, date.today().year - 1, "picks the most recent year that actually responds")


def _fake_bls_csv_rows(url, **kwargs):
    """Route a fake QCEW CSV response by the area FIPS embedded in the URL,
    the same way _get_csv_rows() actually builds it -- exercises
    collect_bls_wages() exactly as it calls the real function."""
    m = re.search(r"/area/([A-Za-z0-9]+)\.csv", url)
    fips = m.group(1) if m else None
    if fips == "01001":
        return [
            {"agglvl_code": "75", "own_code": "5", "industry_code": "51",
             "annual_avg_wkly_wage": "9999", "annual_avg_emplvl": "1"},
            {"agglvl_code": "70", "own_code": "0", "industry_code": "10",
             "annual_avg_wkly_wage": "812", "annual_avg_emplvl": "18500"},
        ], None
    if fips == "01003":
        # Older-style column name, no "annual_" prefix -- exercises the
        # candidate-field fallback.
        return [
            {"agglvl_code": "70", "own_code": "0", "industry_code": "10",
             "avg_wkly_wage": "755", "avg_annual_emplvl": "9200"},
        ], None
    if fips and fips.startswith("9"):
        return [
            {"agglvl_code": "70", "own_code": "0", "industry_code": "10",
             "annual_avg_wkly_wage": "700", "annual_avg_emplvl": "500"},
        ], None
    return None, "HTTP 404"


def test_collect_bls_wages_picks_county_total_row():
    """A response has multiple agglvl_code rows (ownership/industry
    breakdowns); only the agglvl_code=70 county-total row may be used."""
    real_get_csv = econ._get_csv_rows
    econ._get_csv_rows = _fake_bls_csv_rows
    try:
        real_padding = [f"9{i:04d}" for i in range(600)]
        out = econ.collect_bls_wages(["01001", "01003"] + real_padding, 2024)
    finally:
        econ._get_csv_rows = real_get_csv
    eq(out["01001"]["value"], 812.0, "the agglvl_code=70 row's wage, not the 75 row's 9999")
    eq(out["01001"]["employment"], 18500.0, "employment from the same total row")
    eq(out["01001"]["year"], 2024, "year recorded")


def test_collect_bls_wages_falls_back_to_older_column_name():
    real_get_csv = econ._get_csv_rows
    econ._get_csv_rows = _fake_bls_csv_rows
    try:
        real_padding = [f"9{i:04d}" for i in range(600)]
        out = econ.collect_bls_wages(["01001", "01003"] + real_padding, 2024)
    finally:
        econ._get_csv_rows = real_get_csv
    eq(out["01003"]["value"], 755.0, "avg_wkly_wage (no annual_ prefix) used as a fallback")
    eq(out["01003"]["employment"], 9200.0, "avg_annual_emplvl used as a fallback")


def test_collect_bls_wages_skips_counties_without_a_total_row():
    """A county whose response has no agglvl_code=70 row (or 404s) must be
    silently excluded, never crash the whole module."""
    real_get_csv = econ._get_csv_rows
    econ._get_csv_rows = _fake_bls_csv_rows
    try:
        real_padding = [f"9{i:04d}" for i in range(600)]
        no_data_padding = [f"{i:05d}" for i in range(10000, 10600)]
        out = econ.collect_bls_wages(["01001", "01003"] + real_padding + no_data_padding, 2024)
    finally:
        econ._get_csv_rows = real_get_csv
    check(all(f not in out for f in no_data_padding), "no-data FIPS must not appear at all")
    eq(len(out), 2 + len(real_padding), "result is exactly the counties with a real total row")


def test_collect_bls_wages_rejects_suspiciously_small_result():
    real_get_csv = econ._get_csv_rows
    econ._get_csv_rows = _fake_bls_csv_rows
    try:
        out = econ.collect_bls_wages(["01001", "01003"], 2024)
    finally:
        econ._get_csv_rows = real_get_csv
    eq(out, {}, "2 counties is far below the 500-county sanity floor -> rejected")


def test_collect_bls_wages_respects_max_counties_cap():
    real_get_csv = econ._get_csv_rows
    calls = []

    def counting(url, **kwargs):
        calls.append(url)
        return _fake_bls_csv_rows(url, **kwargs)

    econ._get_csv_rows = counting
    try:
        fips_list = [f"{i:05d}" for i in range(30000, 31000)]
        econ.collect_bls_wages(fips_list, 2024, max_counties=25)
    finally:
        econ._get_csv_rows = real_get_csv
    eq(len(calls), 25, "must stop at the cap, not check every county in the list")


def test_bls_is_fresh_direct():
    now = datetime.now(timezone.utc)
    eq(econ._bls_is_fresh({}, 90), False, "no prior timestamp -> not fresh")
    eq(econ._bls_is_fresh({"bls_last_successful_update": (now - timedelta(days=10)).isoformat()}, 90),
       True, "10 days old against a 90-day gate -> fresh")
    eq(econ._bls_is_fresh({"bls_last_successful_update": (now - timedelta(days=120)).isoformat()}, 90),
       False, "120 days old against a 90-day gate -> not fresh")


def test_validate_outputs_flags_bad_avg_weekly_wage():
    with tempfile.TemporaryDirectory() as td:
        county_path = Path(td) / "census_county.json"
        payload = {
            "generated_at": "2026-07-27T00:00:00+00:00",
            "acs_vintage": 2024,
            "counties": {
                "01001": {
                    "metrics": {},
                    "history": {},
                    "avg_weekly_wage": {"value": -1, "employment": 100, "year": 2024},
                },
            },
        }
        county_path.write_text(json.dumps(payload))
        real_county_out = econ.COUNTY_OUT
        real_state_out = econ.STATE_OUT
        real_fred_out = econ.FRED_OUT
        econ.COUNTY_OUT = county_path
        econ.STATE_OUT = Path(td) / "does_not_exist_state.json"
        econ.FRED_OUT = Path(td) / "does_not_exist_fred.json"
        try:
            errs = econ.validate_outputs()
        finally:
            econ.COUNTY_OUT = real_county_out
            econ.STATE_OUT = real_state_out
            econ.FRED_OUT = real_fred_out
    check(any("avg_weekly_wage" in e for e in errs),
          f"negative avg_weekly_wage.value should have been flagged; got: {errs}")


# ────────────────────────── EIA electricity price ──────────────────────────

def test_load_state_abbr_to_fips_matches_state_regulations():
    """Built from the app's own state_regulations.json rather than a second
    hardcoded 50-state table that could silently drift from it."""
    mapping = econ.load_state_abbr_to_fips()
    check(len(mapping) >= 50, f"expected at least 50 state abbreviations, got {len(mapping)}")
    check(mapping.get("CA") is not None, "California present")
    eq(mapping.get("CA"), "06", "California FIPS is 06")


_EIA_RESPONSE = {
    "response": {
        "data": [
            {"period": "2026-05", "stateid": "CA", "sectorid": "IND", "price": "12.50"},
            {"period": "2026-04", "stateid": "CA", "sectorid": "IND", "price": "12.10"},
            {"period": "2026-05", "stateid": "TX", "sectorid": "IND", "price": "6.80"},
            {"period": "2026-05", "stateid": "US", "sectorid": "IND", "price": "9.00"},
        ] + [
            # Padding so the 40-state sanity floor is comfortably cleared in
            # the "accepts a full response" test without hand-writing 50 rows.
            {"period": "2026-05", "stateid": abbr, "sectorid": "IND", "price": "8.00"}
            for abbr in [
                "AL", "AK", "AZ", "AR", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
                "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
                "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
                "PA", "RI", "SC", "SD", "TN", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
            ]
        ]
    }
}


def test_collect_eia_electricity_price_picks_newest_period():
    """CA has two rows (2026-04 and 2026-05); the newer one must win."""
    real_get_json = econ._get_json
    econ._get_json = lambda url, **kw: _EIA_RESPONSE
    try:
        out = econ.collect_eia_electricity_price("fakekey")
    finally:
        econ._get_json = real_get_json
    ca_fips = econ.load_state_abbr_to_fips()["CA"]
    check(ca_fips in out, "California present in result")
    eq(out[ca_fips]["value"], 12.5, "the newer (2026-05) price wins, not the older 12.10")
    eq(out[ca_fips]["as_of"], "2026-05", "as_of reflects the newer period")
    eq(out[ca_fips]["sector"], "IND", "sector recorded")


def test_collect_eia_electricity_price_drops_aggregate_rows():
    """The 'US' aggregate row must not appear under any real state's FIPS --
    there is no FIPS for it, so the abbr-to-FIPS lookup naturally drops it."""
    real_get_json = econ._get_json
    econ._get_json = lambda url, **kw: _EIA_RESPONSE
    try:
        out = econ.collect_eia_electricity_price("fakekey")
    finally:
        econ._get_json = real_get_json
    check(all(v["value"] != 9.0 for v in out.values()),
          "the US aggregate row's price (9.00) must not appear as any state's value")


def test_collect_eia_electricity_price_rejects_suspiciously_small_result():
    """Fewer than 40 states/territories is treated as a broken response."""
    real_get_json = econ._get_json
    econ._get_json = lambda url, **kw: {"response": {"data": [
        {"period": "2026-05", "stateid": "CA", "sectorid": "IND", "price": "12.50"},
        {"period": "2026-05", "stateid": "TX", "sectorid": "IND", "price": "6.80"},
    ]}}
    try:
        out = econ.collect_eia_electricity_price("fakekey")
    finally:
        econ._get_json = real_get_json
    eq(out, {}, "2 states is far below the 40-state sanity floor -> rejected")


def test_collect_eia_electricity_price_handles_fetch_failure():
    real_get_json = econ._get_json
    econ._get_json = lambda url, **kw: {"__error__": "HTTP 503"}
    try:
        out = econ.collect_eia_electricity_price("fakekey")
    finally:
        econ._get_json = real_get_json
    eq(out, {}, "fetch failure -> empty dict, not a crash")


def test_eia_is_fresh_direct():
    now = datetime.now(timezone.utc)
    eq(econ._eia_is_fresh({}, 30), False, "no prior timestamp -> not fresh")
    eq(econ._eia_is_fresh({"eia_last_successful_update": (now - timedelta(days=5)).isoformat()}, 30),
       True, "5 days old against a 30-day gate -> fresh")
    eq(econ._eia_is_fresh({"eia_last_successful_update": (now - timedelta(days=45)).isoformat()}, 30),
       False, "45 days old against a 30-day gate -> not fresh")


def test_validate_outputs_flags_bad_electricity_price():
    with tempfile.TemporaryDirectory() as td:
        state_path = Path(td) / "census_state.json"
        payload = {
            "generated_at": "2026-07-27T00:00:00+00:00",
            "acs_vintage": 2024,
            "states": {
                "06": {
                    "metrics": {},
                    "history": {},
                    "electricity_price": {"value": -5, "as_of": "2026-05", "sector": "IND"},
                },
            },
        }
        state_path.write_text(json.dumps(payload))
        real_county_out = econ.COUNTY_OUT
        real_state_out = econ.STATE_OUT
        real_fred_out = econ.FRED_OUT
        econ.COUNTY_OUT = Path(td) / "does_not_exist_county.json"
        econ.STATE_OUT = state_path
        econ.FRED_OUT = Path(td) / "does_not_exist_fred.json"
        try:
            errs = econ.validate_outputs()
        finally:
            econ.COUNTY_OUT = real_county_out
            econ.STATE_OUT = real_state_out
            econ.FRED_OUT = real_fred_out
    check(any("electricity_price" in e for e in errs),
          f"negative electricity_price.value should have been flagged; got: {errs}")


def test_validate_outputs_catches_new_rate_metrics_out_of_range():
    """Regression guard: the percent-range check used to only recognise
    '_pct' suffixes and the single hardcoded name 'unemployment_rate', which
    would have silently let a corrupted poverty_rate/homeownership_rate/etc.
    (any of the new ACS '_rate' metrics) ship with a value like 250%."""
    with tempfile.TemporaryDirectory() as td:
        county_path = Path(td) / "census_county.json"
        payload = {
            "generated_at": "2026-07-27T00:00:00+00:00",
            "acs_vintage": 2024,
            "counties": {
                "01001": {
                    "metrics": {"poverty_rate": {"value": 250.0}},
                    "history": {},
                },
            },
        }
        county_path.write_text(json.dumps(payload))
        real_county_out = econ.COUNTY_OUT
        real_state_out = econ.STATE_OUT
        real_fred_out = econ.FRED_OUT
        econ.COUNTY_OUT = county_path
        econ.STATE_OUT = Path(td) / "does_not_exist_state.json"
        econ.FRED_OUT = Path(td) / "does_not_exist_fred.json"
        try:
            errs = econ.validate_outputs()
        finally:
            econ.COUNTY_OUT = real_county_out
            econ.STATE_OUT = real_state_out
            econ.FRED_OUT = real_fred_out
    check(any("poverty_rate" in e and "outside 0-100" in e for e in errs),
          f"a 250% poverty_rate should have been flagged; got: {errs}")


# ────────────────────────── history ordering ──────────────────────────

def test_history_sorted_chronologically():
    """The frontend draws history arrays in order; unsorted input would render
    a zig-zag sparkline that looks like real volatility."""
    series = [[2024, 429782], [2020, 413538], [2022, 420959]]
    series.sort(key=lambda r: r[0])
    eq([y for y, _ in series], [2020, 2022, 2024], "ascending by year")


# ────────────────────────── output protection ──────────────────────────

def test_safe_write_rejects_empty_payload():
    """The core outage guard: an empty result must never replace good data."""
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "census_county.json"
        good = {"counties": {f"{i:05d}": {"name": f"C{i}"} for i in range(3000)}}
        econ.warnings.clear()
        eq(econ._safe_write(p, good, min_records=2000), True, "good payload writes")
        empty = {"counties": {}}
        eq(econ._safe_write(p, empty, min_records=2000), False,
           "empty payload REFUSED")
        after = json.loads(p.read_text())
        eq(len(after["counties"]), 3000, "existing good data untouched on disk")


def test_safe_write_rejects_large_shrink():
    """A partial outage returning 5% of counties would pass a naive non-empty
    check. The >20% loss guard catches it."""
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "census_county.json"
        econ.warnings.clear()
        econ._safe_write(p, {"counties": {f"{i:05d}": {} for i in range(3000)}}, min_records=1)
        partial = {"counties": {f"{i:05d}": {} for i in range(150)}}
        eq(econ._safe_write(p, partial, min_records=1), False,
           "5% of records REFUSED as a suspicious shrink")
        eq(len(json.loads(p.read_text())["counties"]), 3000, "good data preserved")


def test_safe_write_allows_small_churn():
    """Normal churn (a discontinued series, a merged county) must still write,
    or the file would freeze permanently."""
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "s.json"
        econ.warnings.clear()
        econ._safe_write(p, {"series": {f"S{i}": {} for i in range(20)}}, min_records=1)
        eq(econ._safe_write(p, {"series": {f"S{i}": {} for i in range(19)}}, min_records=1),
           True, "one series lost is acceptable churn")


def test_safe_write_first_write_succeeds():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "new.json"
        econ.warnings.clear()
        eq(econ._safe_write(p, {"series": {"DGS10": {}}}, min_records=1), True,
           "first write with no prior file succeeds")


def test_record_count_shapes():
    eq(econ._record_count({"counties": {"51107": {}}}), 1, "counties dict")
    eq(econ._record_count({"states": {"51": {}}}), 1, "states dict")
    eq(econ._record_count({"series": {"DGS10": {}}}), 1, "series dict")
    eq(econ._record_count({}), 0, "empty payload")
    eq(econ._record_count(None), 0, "None payload")


# ────────────────────────── secret hygiene ──────────────────────────

def test_url_redaction():
    """Any URL that reaches a log line must have its key stripped. A leaked key
    in CI output is a permanent disclosure."""
    u = "https://api.census.gov/data/2024/acs/acs5?get=NAME&for=county:*&key=abc123secret"
    out = econ._redact(u)
    check("abc123secret" not in out, "census key removed")
    check("REDACTED" in out, "replaced with a marker")
    f = "https://api.stlouisfed.org/fred/series?series_id=DGS10&api_key=deadbeef&file_type=json"
    outf = econ._redact(f)
    check("deadbeef" not in outf, "fred key removed")


def test_get_json_error_snippets_are_redacted():
    """_get_json() keeps a body snippet on failure for diagnosability (added
    after a live Census keyless run failed with a bare 'JSONDecodeError' and
    nothing else to go on). That snippet must never carry a live key: some
    APIs echo the request URL back in their own error text."""
    src = (Path(econ.ROOT) / "data" / "update_economic_data.py").read_text()
    check("_redact(raw[:200])" in src or "_redact(raw" in src,
          "JSONDecodeError snippet is not passed through _redact()")
    check("_redact(e.read()" in src,
          "HTTPError body snippet is not passed through _redact()")


def test_no_api_key_in_source_defaults():
    """No literal key may be committed. Keys come only from the environment."""
    src = (Path(econ.ROOT) / "data" / "update_economic_data.py").read_text()
    check('FRED_API_KEY", ""' in src or 'os.environ.get("FRED_API_KEY"' in src,
          "FRED key read from environment")
    check("CENSUS_API_KEY" in src, "Census key read from environment")
    for bad in ("api_key=abc", "key=live_", "sk-", "AKIA"):
        check(bad not in src, f"no literal secret pattern {bad!r} in source")


def test_census_key_param_omitted_when_unset():
    """Keyless Census must send NO key parameter, not an empty one.

    `&key=` with nothing after it is not "no key" to Census — it is an invalid
    key, and the request is rejected. So the whole fragment has to vanish.
    """
    check(econ._census_key_param("") == "", "empty key must produce no fragment")
    check(econ._census_key_param(None) == "", "unset key must produce no fragment")
    check(econ._census_key_param("abc123") == "&key=abc123", "set key is appended")
    # And the assembled URL must be a valid Census request either way.
    for key, expect in (("", False), ("abc123", True)):
        url = f"https://api.census.gov/data/2023/acs/acs5?get=NAME&for=state:*{econ._census_key_param(key)}"
        check(("key=" in url) is expect, f"key presence wrong for {key!r}")
        check("key=&" not in url and not url.endswith("key="),
              f"assembled a blank key= parameter for {key!r}")


# ────────────────────────── metadata + freshness ──────────────────────────

def test_census_freshness_gate():
    """FRED runs daily but ACS updates annually; the gate prevents pointlessly
    re-downloading ~3,140 counties every day."""
    now = datetime.now(timezone.utc)
    fresh = {"census": {"last_successful_update": now.isoformat(timespec="seconds")}}
    eq(econ._census_is_fresh(fresh, 7), True, "just-updated Census is fresh")
    old = {"census": {"last_successful_update": (now - timedelta(days=30)).isoformat(timespec="seconds")}}
    eq(econ._census_is_fresh(old, 7), False, "30-day-old Census is stale")
    eq(econ._census_is_fresh({}, 7), False, "no record -> not fresh, so it runs")
    eq(econ._census_is_fresh({"census": {"last_successful_update": "garbage"}}, 7), False,
       "unparseable timestamp -> not fresh, fail toward refreshing")


def test_metadata_required_keys():
    with tempfile.TemporaryDirectory() as td:
        orig = econ.META_OUT
        try:
            econ.META_OUT = Path(td) / "economic_metadata.json"
            econ.warnings.clear()
            meta = econ.write_metadata(
                {"series": {"DGS10": {"latest_date": "2026-07-24",
                                      "fred_last_updated": "2026-07-25 15:18:03-05",
                                      "stale": False}}},
                {"counties": {"51107": {}}, "acs_vintage": 2024, "oldest_history_year": 2019,
                 "selected_variables": {"population": {"value": "B01003_001E"}}},
                {"states": {"51": {}}},
                None, 2024, {}, None, True)
            for key in ("generated_at", "source_updated_at", "latest_observation_date",
                        "acs_vintage", "oldest_history_year", "fred_series_count",
                        "county_count", "state_count", "warnings", "stale",
                        "pipeline_version"):
                check(key in meta, f"metadata contains required key '{key}'")
            eq(meta["fred_series_count"], 1, "series counted")
            eq(meta["county_count"], 1, "counties counted")
            eq(meta["acs_vintage"], 2024, "vintage recorded")
            eq(meta["stale"], False, "not stale")
        finally:
            econ.META_OUT = orig


def test_metadata_preserves_census_timestamp_on_fred_only_run():
    """A FRED-only run must not erase the Census timestamp, or the weekly gate
    would re-download every county on the next run."""
    with tempfile.TemporaryDirectory() as td:
        orig = econ.META_OUT
        try:
            econ.META_OUT = Path(td) / "m.json"
            econ.warnings.clear()
            prior = {"census": {"last_successful_update": "2026-07-20T00:00:00+00:00",
                                "selected_variables": {"population": {"value": "B01003_001E"}}},
                     "acs_vintage": 2024, "oldest_history_year": 2019}
            meta = econ.write_metadata({"series": {}}, None, None, None,
                                       None, {}, prior, census_ran=False)
            eq(meta["census"]["last_successful_update"], "2026-07-20T00:00:00+00:00",
               "prior Census timestamp carried forward")
            eq(meta["acs_vintage"], 2024, "prior vintage carried forward")
        finally:
            econ.META_OUT = orig


def test_generated_at_does_not_advance_on_a_noop_run():
    """generated_at means "when data was last generated", not "when the pipeline
    last ran". A keyless run that fetched nothing must not stamp a fresh
    timestamp onto a file containing no data — that reads as freshly generated
    data. Found by running the real workflow with no secrets configured."""
    with tempfile.TemporaryDirectory() as td:
        orig = econ.META_OUT
        try:
            econ.META_OUT = Path(td) / "m.json"
            econ.warnings.clear()
            # Never-populated deployment: prior generated_at is None.
            meta = econ.write_metadata({"series": {}}, None, None, None,
                                       None, {}, {"generated_at": None},
                                       census_ran=False, any_source_ok=False)
            eq(meta["generated_at"], None,
               "no-op run must leave generated_at as None, not stamp 'now'")
            check(meta.get("last_run_at"), "last_run_at records when the run happened")

            # A previously-populated deployment keeps its real timestamp.
            prev = "2026-07-01T00:00:00+00:00"
            meta2 = econ.write_metadata({"series": {}}, None, None, None,
                                        None, {}, {"generated_at": prev},
                                        census_ran=False, any_source_ok=False)
            eq(meta2["generated_at"], prev,
               "no-op run must preserve the prior generated_at, not overwrite it")

            # A run that DID fetch advances it.
            meta3 = econ.write_metadata({"series": {"DGS10": {"latest_date": "2026-07-24"}}},
                                        None, None, None, None, {},
                                        {"generated_at": prev},
                                        census_ran=False, any_source_ok=True)
            check(meta3["generated_at"] != prev,
                  "a run that fetched data must advance generated_at")
        finally:
            econ.META_OUT = orig


def test_noop_run_does_not_rewrite_metadata():
    """The workflow runs daily. Without this, every day until the API keys are
    configured would add a commit reading "0 FRED series, 0 counties, ACS None" —
    365 junk commits a year burying real changes."""
    with tempfile.TemporaryDirectory() as td:
        orig = econ.META_OUT
        try:
            econ.META_OUT = Path(td) / "m.json"
            econ.warnings.clear()
            first = econ.write_metadata({"series": {}}, None, None, None,
                                        None, {}, None, census_ran=False,
                                        any_source_ok=False)
            eq(econ.META_OUT.exists(), True, "first run writes the file")
            before = econ.META_OUT.read_text()

            # Identical second run — must not touch the file.
            econ.warnings.clear()
            econ.write_metadata({"series": {}}, None, None, None,
                                None, {}, first, census_ran=False,
                                any_source_ok=False)
            eq(econ.META_OUT.read_text(), before,
               "an unchanged run must not rewrite metadata (would churn a commit daily)")

            # A NEW warning is real news and must still be written.
            econ.warnings.clear()
            econ.warn("something new happened")
            econ.write_metadata({"series": {}}, None, None, None,
                                None, {}, first, census_ran=False,
                                any_source_ok=False)
            check(econ.META_OUT.read_text() != before,
                  "a changed warning set must still be written")
        finally:
            econ.META_OUT = orig


def test_metadata_written_without_ascii_escapes():
    """Warnings contain em-dashes. ensure_ascii would escape them to \\u2014,
    which is unreadable in a diff — the same fix refresh_platform_metadata.py
    needed."""
    with tempfile.TemporaryDirectory() as td:
        orig = econ.META_OUT
        try:
            econ.META_OUT = Path(td) / "m.json"
            econ.warnings.clear()
            econ.warn("a warning with an em-dash — right here")
            econ.write_metadata({"series": {}}, None, None, None,
                                None, {}, None, census_ran=False, any_source_ok=False)
            raw = econ.META_OUT.read_text()
            check("—" in raw, "em-dash written literally")
            check("\\u2014" not in raw, "em-dash must not be escaped to \\u2014")
        finally:
            econ.META_OUT = orig


def test_shipped_metadata_is_honest_about_never_having_run():
    """The committed metadata must not claim data was generated when none was."""
    m = json.loads((Path(econ.ROOT) / "data/economy/economic_metadata.json").read_text())
    if m.get("county_count", 0) == 0 and m.get("fred_series_count", 0) == 0:
        eq(m.get("generated_at"), None,
           "metadata reports 0 series and 0 counties but claims a generated_at")


def test_metadata_flags_stale_series():
    with tempfile.TemporaryDirectory() as td:
        orig = econ.META_OUT
        try:
            econ.META_OUT = Path(td) / "m.json"
            econ.warnings.clear()
            meta = econ.write_metadata(
                {"series": {"A": {"latest_date": "2026-01-01", "stale": True}}},
                None, None, None, None, {}, None, False)
            eq(meta["stale"], True, "a stale series marks the whole payload stale")
        finally:
            econ.META_OUT = orig


# ────────────────────────── config integrity ──────────────────────────

def test_series_config_wellformed():
    cfg = json.loads((Path(econ.ROOT) / "data" / "economy" / "series_config.json").read_text())
    ids = [s["id"] for s in cfg["series"]]
    eq(len(ids), len(set(ids)), "no duplicate series IDs")
    cats = {c["id"] for c in cfg["categories"]}
    for s in cfg["series"]:
        check(s["category"] in cats, f"{s['id']} category '{s['category']}' is declared")
        for field in ("label", "short_label", "unit_type", "tooltip"):
            check(bool(s.get(field)), f"{s['id']} has a non-empty {field}")
    required = {"DFF", "DGS2", "DGS10", "T10Y2Y", "MORTGAGE30US", "NFCI",
                "BUSLOANS", "CREACBM027NBOG", "CPIAUCSL", "PCEPI", "GDPC1",
                "INDPRO", "UNRATE", "PAYEMS", "ICSA", "RSAFS", "HOUST", "PERMIT"}
    missing = required - set(ids)
    eq(missing, set(), "every series named in the specification is configured")


def test_kpi_ordering_unique():
    cfg = json.loads((Path(econ.ROOT) / "data" / "economy" / "series_config.json").read_text())
    orders = [s["kpi_order"] for s in cfg["series"] if s.get("kpi")]
    eq(len(orders), len(set(orders)), "KPI order values are unique")
    eq(len(orders), 7, "exactly seven KPI indicators as specified")


def test_census_config_wellformed():
    cfg = _cfg()
    for metric, spec in cfg["metrics"].items():
        check(bool(spec.get("label")), f"{metric} has a label")
        check(spec.get("derive") in ("direct", "ratio", "average", "sum_over_denominator"),
              f"{metric} declares a known derive kind")
        if spec["derive"] == "ratio":
            check(spec.get("ratio_numerator") in spec["variables"],
                  f"{metric} numerator role exists in variables")
            check(spec.get("ratio_denominator") in spec["variables"],
                  f"{metric} denominator role exists in variables")
        if spec["derive"] == "average":
            check(spec.get("average_numerator") in spec["variables"],
                  f"{metric} average numerator role exists in variables")
            check(spec.get("average_denominator") in spec["variables"],
                  f"{metric} average denominator role exists in variables")
        if spec["derive"] == "sum_over_denominator":
            for part in spec["sum_parts"]:
                check(part in spec["variables"], f"{metric} sum part '{part}' declared")
    check(cfg["max_variables_per_request"] <= 50, "respects the Census 50-variable cap")


# ────────────────────────── validation pass ──────────────────────────

def test_validate_detects_future_observation():
    with tempfile.TemporaryDirectory() as td:
        orig_f, orig_c, orig_s = econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT
        try:
            econ.FRED_OUT = Path(td) / "fred_data.json"
            econ.COUNTY_OUT = Path(td) / "c.json"
            econ.STATE_OUT = Path(td) / "s.json"
            future = (date.today() + timedelta(days=40)).isoformat()
            econ.FRED_OUT.write_text(json.dumps({"series": {"X": {
                "observations": [["2026-01-01", 1.0], [future, 2.0]],
                "unit_type": "percent", "latest_value": 2.0}}}))
            errs = econ.validate_outputs()
            check(any("future observation" in e for e in errs),
                  "future-dated observation is caught by validation")
        finally:
            econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT = orig_f, orig_c, orig_s


def test_validate_detects_unsorted_history():
    with tempfile.TemporaryDirectory() as td:
        orig_f, orig_c, orig_s = econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT
        try:
            econ.FRED_OUT = Path(td) / "f.json"
            econ.COUNTY_OUT = Path(td) / "census_county.json"
            econ.STATE_OUT = Path(td) / "s.json"
            econ.COUNTY_OUT.write_text(json.dumps({
                "acs_vintage": 2024,
                "counties": {"51107": {"metrics": {}, "history": {
                    "population": [[2024, 5], [2020, 3]]}}}}))
            errs = econ.validate_outputs()
            check(any("not chronological" in e for e in errs),
                  "out-of-order history is caught")
        finally:
            econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT = orig_f, orig_c, orig_s


def test_validate_detects_bad_fips():
    with tempfile.TemporaryDirectory() as td:
        orig_f, orig_c, orig_s = econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT
        try:
            econ.FRED_OUT = Path(td) / "f.json"
            econ.COUNTY_OUT = Path(td) / "census_county.json"
            econ.STATE_OUT = Path(td) / "s.json"
            econ.COUNTY_OUT.write_text(json.dumps({
                "acs_vintage": 2024,
                "counties": {"511": {"metrics": {}}}}))     # 3 chars, invalid
            errs = econ.validate_outputs()
            check(any("invalid 5-char FIPS" in e for e in errs),
                  "short FIPS is caught")
        finally:
            econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT = orig_f, orig_c, orig_s


def test_validate_detects_out_of_range_percent():
    with tempfile.TemporaryDirectory() as td:
        orig_f, orig_c, orig_s = econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT
        try:
            econ.FRED_OUT = Path(td) / "f.json"
            econ.COUNTY_OUT = Path(td) / "census_county.json"
            econ.STATE_OUT = Path(td) / "s.json"
            econ.COUNTY_OUT.write_text(json.dumps({
                "acs_vintage": 2024,
                "counties": {"51107": {"metrics": {
                    "unemployment_rate": {"value": 412.5}}}}}))
            errs = econ.validate_outputs()
            check(any("outside 0-100" in e for e in errs),
                  "impossible percentage is caught")
        finally:
            econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT = orig_f, orig_c, orig_s


def test_placeholder_is_valid_but_corrupt_is_not():
    """The shipped placeholder (generated_at:null, no records) must pass --check
    so a fresh checkout doesn't fail the very workflow that populates it. A file
    that CLAIMS to be generated but is empty must still fail."""
    with tempfile.TemporaryDirectory() as td:
        orig_f, orig_c, orig_s = econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT
        try:
            econ.FRED_OUT = Path(td) / "fred_data.json"
            econ.COUNTY_OUT = Path(td) / "census_county.json"
            econ.STATE_OUT = Path(td) / "census_state.json"

            placeholder = {"generated_at": None, "series": {}}
            econ.FRED_OUT.write_text(json.dumps(placeholder))
            econ.COUNTY_OUT.write_text(json.dumps({"generated_at": None, "counties": {},
                                                   "acs_vintage": None}))
            econ.STATE_OUT.write_text(json.dumps({"generated_at": None, "states": {},
                                                  "acs_vintage": None}))
            eq(econ.validate_outputs(), [], "unpopulated placeholder is valid")

            # Same emptiness, but asserting it was generated -> must fail.
            econ.FRED_OUT.write_text(json.dumps(
                {"generated_at": "2026-07-26T00:00:00+00:00", "series": {}}))
            errs = econ.validate_outputs()
            check(any("has no series" in e for e in errs),
                  "empty-but-claims-generated is caught as corrupt")
        finally:
            econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT = orig_f, orig_c, orig_s


def test_is_unpopulated_placeholder():
    check(econ._is_unpopulated_placeholder({"generated_at": None, "series": {}}),
          "null generated_at + no records = placeholder")
    check(not econ._is_unpopulated_placeholder(
        {"generated_at": "2026-07-26T00:00:00+00:00", "series": {}}),
        "claims generated -> not a placeholder")
    check(not econ._is_unpopulated_placeholder(
        {"generated_at": None, "series": {"DGS10": {}}}),
        "has records -> not a placeholder")


def test_shipped_placeholders_validate():
    """The files actually committed in data/economy/ must pass --check as-is."""
    errs = econ.validate_outputs()
    eq(errs, [], "committed data/economy files pass validation")


def test_validate_passes_on_clean_data():
    with tempfile.TemporaryDirectory() as td:
        orig_f, orig_c, orig_s = econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT
        try:
            econ.FRED_OUT = Path(td) / "fred_data.json"
            econ.COUNTY_OUT = Path(td) / "census_county.json"
            econ.STATE_OUT = Path(td) / "census_state.json"
            econ.FRED_OUT.write_text(json.dumps({"series": {"DGS10": {
                "observations": [["2026-07-20", 4.21], ["2026-07-22", None],
                                 ["2026-07-24", 4.28]],
                "unit_type": "percent", "latest_value": 4.28}}}))
            econ.COUNTY_OUT.write_text(json.dumps({
                "acs_vintage": 2024,
                "counties": {"51107": {"metrics": {
                    "unemployment_rate": {"value": 2.6},
                    "median_household_income": {"value": 170463}},
                    "history": {"population": [[2020, 413538], [2024, 429782]]}}}}))
            econ.STATE_OUT.write_text(json.dumps({
                "acs_vintage": 2024,
                "states": {"51": {"metrics": {"population": {"value": 8642274}}}}}))
            errs = econ.validate_outputs()
            eq(errs, [], "clean data produces no validation errors")
        finally:
            econ.FRED_OUT, econ.COUNTY_OUT, econ.STATE_OUT = orig_f, orig_c, orig_s


# ────────────────────────── runner ──────────────────────────

def _all_tests():
    return [(n, f) for n, f in sorted(globals().items())
            if n.startswith("test_") and callable(f)]


def main():
    print("Economic data pipeline tests (offline)\n")
    for name, fn in _all_tests():
        econ.warnings.clear()
        try:
            fn()
        except Exception as e:                                # noqa: BLE001
            _results["fail"] += 1
            print(f"  ERROR in {name}: {type(e).__name__}: {e}")
    total = _results["pass"] + _results["fail"]
    print(f"\n{_results['pass']}/{total} assertions passed")
    if _results["fail"]:
        print(f"{_results['fail']} FAILED")
        return 1
    print("All economic data tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
