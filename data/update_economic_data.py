#!/usr/bin/env python3
"""Build the Economy tab's local JSON from FRED and Census APIs.

WHY THIS EXISTS
The Economy tab needs national macro series (financing costs, inflation, labor)
and county/state demographics (population, income, workforce, broadband) to put
data center policy in economic context. Both sources require API keys, and the
browser must never see one — so every live request happens here, in CI, and the
frontend loads only the generated files.

OUTPUTS (all under data/economy/)
    fred_data.json        national time series + latest values
    census_county.json    ~3,140 counties, FIPS-keyed
    census_state.json     52 state-level rows, FIPS-keyed
    census_cbp.json       optional County Business Patterns module
    economic_metadata.json  provenance, warnings, staleness, selected variables

THE CENTRAL SAFETY RULE
A failed or partial API run must never degrade good committed data. Every write
goes through _safe_write(), which refuses to replace a populated file with an
empty or structurally invalid one. Missing observations stay missing — they are
never coerced to zero, because zero is a real value for several of these series
and a fabricated zero would silently corrupt a chart or a ranking.

EXIT CODES
    0  success, or a partial run where stale data was correctly preserved
    1  output validation failed — committing would corrupt data
    2  no source was reachable AND no usable prior data exists

Usage:
    python3 data/update_economic_data.py [options]

    --fred-only           skip Census entirely
    --census-only         skip FRED entirely
    --force-census        run Census even if it was refreshed recently
    --skip-cbp            skip the optional Business Patterns module
    --census-max-age-days N  refresh Census only if older than N days (default 7)
    --offline             validate and re-derive from existing files, no network
    --check               validate existing outputs and exit (CI guard)

Environment:
    FRED_API_KEY      REQUIRED for FRED — the API rejects keyless requests.
                      (https://fred.stlouisfed.org/docs/api/api_key.html)
    CENSUS_API_KEY    OPTIONAL. Census answers unauthenticated requests at about
                      500/day per IP and a full run costs ~13, so the pipeline
                      runs keyless when this is unset. Set it only to raise the
                      ceiling. (https://api.census.gov/data/key_signup.html)
Both keys are free. Neither is ever logged, echoed, or written to any output file.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

PIPELINE_VERSION = "1.0.0"

ROOT = Path(__file__).parent.parent
ECON = ROOT / "data" / "economy"

SERIES_CONFIG = ECON / "series_config.json"
CENSUS_CONFIG = ECON / "census_config.json"
FRED_OUT      = ECON / "fred_data.json"
COUNTY_OUT    = ECON / "census_county.json"
STATE_OUT     = ECON / "census_state.json"
CBP_OUT       = ECON / "census_cbp.json"
META_OUT      = ECON / "economic_metadata.json"

FRED_OBS_URL    = "https://api.stlouisfed.org/fred/series/observations"
FRED_SERIES_URL = "https://api.stlouisfed.org/fred/series"
CENSUS_ACS_URL  = "https://api.census.gov/data/{year}/acs/acs5"
CENSUS_VARS_URL = "https://api.census.gov/data/{year}/acs/acs5/variables.json"
CENSUS_CBP_URL  = "https://api.census.gov/data/{year}/cbp"

UA = "USDataCenterPolicyTracker-EconPipeline/1.0 (+https://bobbytrenkamp-lgtm.github.io/test1/)"

# How far back to pull FRED observations. 'Max' in the UI means max of this window.
FRED_HISTORY_START = "1990-01-01"

# Politeness delay between requests to the same host.
REQUEST_DELAY_S = 0.35

# Census returns these as sentinel "missing/suppressed" numerics, not real data.
# -666666666 is the documented ACS "not computable" jam value; the others are its
# siblings for annotated estimates. Treating any of them as a real number would
# put a -666 million dollar median income into a choropleth.
CENSUS_JAM_VALUES = {
    -666666666, -999999999, -888888888, -222222222,
    -333333333, -555555555, -111111111,
}

warnings: list[str] = []


def _rel(path: Path) -> str:
    """Repo-relative path for logging, falling back to the name.

    relative_to() raises when the path is outside ROOT, which happens whenever
    the output constants are redirected (tests, or a caller pointing at a
    scratch dir). A log line must never be the thing that crashes a run.
    """
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return path.name


def warn(msg: str) -> None:
    """Record a warning for economic_metadata.json and echo it once."""
    warnings.append(msg)
    print(f"  warning: {msg}")


# ─────────────────────────── HTTP ───────────────────────────

def _get_json(url: str, timeout: int = 45, retries: int = 3):
    """GET and parse JSON. Returns None on failure rather than raising, so one
    bad series or one bad geography never aborts the whole run."""
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", "replace")
            time.sleep(REQUEST_DELAY_S)
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                # A 200 response that isn't JSON usually means the API sent an
                # error message as plain text/HTML (a rate-limit notice, a
                # WAF page) rather than raising an HTTP error status. The
                # exception type alone ("JSONDecodeError") is not diagnosable
                # on its own — keep a short snippet of what the body actually
                # said so the next run's logs explain the failure instead of
                # just naming it. _redact() first: some APIs echo the request
                # URL back in their own error text, and that URL may carry
                # api_key/key — this snippet reaches a public log line.
                last = f"JSONDecodeError: {_redact(raw[:200])!r}"
                break
        except urllib.error.HTTPError as e:
            # 400/404 are permanent for this URL — retrying wastes CI minutes.
            body = ""
            try:
                body = _redact(e.read().decode("utf-8", "replace")[:200])
            except Exception:                                # noqa: BLE001
                pass
            last = f"HTTP {e.code}" + (f": {body!r}" if body else "")
            if e.code in (400, 401, 403, 404):
                break
        except Exception as e:                              # noqa: BLE001
            last = type(e).__name__
        if attempt < retries - 1:
            time.sleep(1.5 * (attempt + 1))
    return {"__error__": last or "unknown"}


def _is_err(payload) -> bool:
    return payload is None or (isinstance(payload, dict) and "__error__" in payload)


def _redact(url: str) -> str:
    """Strip api_key/key from a URL before it can reach a log line."""
    out = url
    for param in ("api_key", "key"):
        import re
        out = re.sub(rf"([?&]{param}=)[^&]*", r"\1REDACTED", out)
    return out


# ─────────────────────── numeric parsing ───────────────────────

def parse_number(raw):
    """Convert an API value to float, or None when genuinely missing.

    FRED uses "." for a missing observation. Census uses null, empty string, and
    a family of large negative jam values. Every one of these must become None,
    NOT 0 — several tracked series legitimately sit near zero (T10Y2Y, NFCI), so
    a fabricated zero is indistinguishable from real data downstream.
    """
    if raw is None:
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        val = float(raw)
    else:
        s = str(raw).strip()
        if s in ("", ".", "-", "N/A", "NA", "null", "None", "(NA)", "*", "**"):
            return None
        s = s.replace(",", "")
        try:
            val = float(s)
        except ValueError:
            return None
    if val != val or val in (float("inf"), float("-inf")):   # NaN / inf
        return None
    if int(val) in CENSUS_JAM_VALUES:
        return None
    return val


def pct_change(new, old):
    """Percent change, or None when it cannot be computed honestly.

    Guards division by zero and refuses a change calculation when either
    endpoint is missing — returning 0 there would assert 'no change' from
    absent evidence.
    """
    if new is None or old is None:
        return None
    if old == 0:
        return None
    return round((new - old) / abs(old) * 100.0, 2)


def cagr(new, old, years):
    """Compound annual growth rate as a percent, or None.

    Requires strictly positive endpoints: a CAGR through zero or a negative
    base is not defined, and fractional powers of a negative number are complex.
    """
    if new is None or old is None or years is None or years <= 0:
        return None
    if old <= 0 or new <= 0:
        return None
    return round(((new / old) ** (1.0 / years) - 1.0) * 100.0, 2)


def safe_ratio_pct(numerator, denominator, decimals=1):
    """numerator/denominator as a percent, or None. Never divides by zero."""
    if numerator is None or denominator is None:
        return None
    if denominator <= 0:
        return None
    return round(numerator / denominator * 100.0, decimals)


# ─────────────────────── safe output writing ───────────────────────

def _load_existing(path: Path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except Exception:                                        # noqa: BLE001
        warn(f"{path.name} exists but is unreadable — treating as absent")
        return None


def _record_count(payload) -> int:
    """How many real records a payload carries, for the emptiness guard."""
    if not isinstance(payload, dict):
        return 0
    for key in ("counties", "states", "series"):
        node = payload.get(key)
        if isinstance(node, dict):
            return len(node)
        if isinstance(node, list):
            return len(node)
    return 0


def _safe_write(path: Path, payload, *, min_records: int = 1) -> bool:
    """Write only if the new payload is at least as substantial as what exists.

    This is the guard that makes a failed API run harmless. An outage that
    yields 0 series or 3 counties must not overwrite a good file with 18 series
    and 3,140 counties — the site would silently lose its economic data and
    nothing would look broken until someone noticed empty charts.
    """
    new_n = _record_count(payload)
    if new_n < min_records:
        warn(f"refusing to write {path.name}: only {new_n} record(s), "
             f"below the {min_records} minimum — keeping existing file")
        return False

    old = _load_existing(path)
    if old is not None:
        old_n = _record_count(old)
        # A 20% shrink is normal churn (a series discontinued, a county merged).
        # Anything larger means the source misbehaved.
        if old_n > 0 and new_n < old_n * 0.8:
            warn(f"refusing to write {path.name}: record count would drop "
                 f"{old_n} -> {new_n} (>20% loss) — keeping existing file")
            return False

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=1, sort_keys=True) + "\n")
    print(f"  wrote {_rel(path)}  ({new_n} records)")
    return True


# ─────────────────────────── FRED ───────────────────────────

def fred_release_name(series_id: str, api_key: str):
    """The FRED release a series belongs to, which names the originating agency.

    FRED *hosts* series produced by BLS, BEA, Census, Freddie Mac and others.
    The /series endpoint does not carry the agency as a field, so we ask
    /series/release — its release name ("Employment Situation", "Consumer Price
    Index") identifies the real publisher. Without this the UI would credit the
    Federal Reserve for everything, which the spec explicitly forbids.
    Failure is non-fatal: the series still publishes, just without attribution.
    """
    url = (f"{FRED_SERIES_URL}/release?series_id={urllib.parse.quote(series_id)}"
           f"&api_key={api_key}&file_type=json")
    payload = _get_json(url, retries=2)
    if _is_err(payload):
        return None
    releases = (payload or {}).get("releases") or []
    if not releases:
        return None
    return releases[0].get("name")


def fred_series_metadata(series_id: str, api_key: str):
    """Fetch and validate one series through the FRED metadata endpoint.

    Called before observations so a renamed or discontinued series is recorded
    as a warning and skipped, rather than crashing the run or silently
    publishing an empty chart.
    """
    url = f"{FRED_SERIES_URL}?series_id={urllib.parse.quote(series_id)}&api_key={api_key}&file_type=json"
    payload = _get_json(url)
    if _is_err(payload):
        return None, f"metadata request failed ({payload.get('__error__') if isinstance(payload, dict) else 'no response'})"
    items = (payload or {}).get("seriess") or []
    if not items:
        return None, "series not found in FRED metadata (renamed or discontinued?)"
    s = items[0]
    notes = (s.get("notes") or "").strip()
    return {
        "fred_title":        s.get("title"),
        "units":             s.get("units"),
        "units_short":       s.get("units_short"),
        "frequency":         s.get("frequency"),
        "frequency_short":   s.get("frequency_short"),
        "seasonal_adjustment": s.get("seasonal_adjustment"),
        "seasonal_adjustment_short": s.get("seasonal_adjustment_short"),
        "last_updated":      s.get("last_updated"),
        "observation_start": s.get("observation_start"),
        "observation_end":   s.get("observation_end"),
        # Truncated: some notes run to several paragraphs and this ships to the
        # browser. Enough for a provenance line, not a whole methodology essay.
        "fred_notes":        (notes[:400] + "…") if len(notes) > 400 else (notes or None),
        "source_agency":     fred_release_name(series_id, api_key),
    }, None


def fred_observations(series_id: str, api_key: str):
    url = (f"{FRED_OBS_URL}?series_id={urllib.parse.quote(series_id)}"
           f"&api_key={api_key}&file_type=json"
           f"&observation_start={FRED_HISTORY_START}&sort_order=asc")
    payload = _get_json(url)
    if _is_err(payload):
        return None, f"observations request failed ({payload.get('__error__') if isinstance(payload, dict) else 'no response'})"
    obs = (payload or {}).get("observations")
    if obs is None:
        return None, "response contained no observations array"
    return obs, None


def build_fred_observations(raw_obs, today=None):
    """Normalise FRED observations into [[date, value|null], ...].

    Drops future-dated rows (a data error, never legitimate) and preserves
    missing values as null so the chart can break the line instead of drawing a
    straight segment through a gap that never existed.
    """
    today = today or date.today()
    out = []
    seen = set()
    for row in raw_obs:
        d = (row or {}).get("date")
        if not d or not isinstance(d, str):
            continue
        try:
            parsed = datetime.strptime(d[:10], "%Y-%m-%d").date()
        except ValueError:
            continue
        if parsed > today:
            continue
        if d in seen:
            continue
        seen.add(d)
        out.append([d, parse_number((row or {}).get("value"))])
    out.sort(key=lambda r: r[0])
    return out


def _last_valid(observations):
    """Most recent observation with a real value, as (date, value)."""
    for d, v in reversed(observations):
        if v is not None:
            return d, v
    return None, None


def _value_on_or_before(observations, target: date):
    """Latest real value at or before target — used for MoM / YoY baselines.

    Walking backwards from the target rather than indexing a fixed number of
    rows keeps this correct for irregular frequencies (weekly ICSA, quarterly
    GDPC1) and for series with missing observations.
    """
    best = None
    for d, v in observations:
        if v is None:
            continue
        try:
            parsed = datetime.strptime(d, "%Y-%m-%d").date()
        except ValueError:
            continue
        if parsed <= target:
            best = (d, v)
        else:
            break
    return best if best else (None, None)


def collect_fred(config, api_key, existing):
    """Fetch every configured series. Returns (payload, ok_count)."""
    series_out = {}
    skipped = []

    for spec in config.get("series", []):
        sid = spec["id"]
        meta, err = fred_series_metadata(sid, api_key)
        if err:
            warn(f"FRED {sid}: {err} — skipping this series")
            skipped.append({"series_id": sid, "reason": err})
            # Preserve whatever we already had for this series.
            prior = (existing or {}).get("series", {}).get(sid)
            if prior:
                prior["stale"] = True
                series_out[sid] = prior
            continue

        raw, err = fred_observations(sid, api_key)
        if err:
            warn(f"FRED {sid}: {err} — skipping this series")
            skipped.append({"series_id": sid, "reason": err})
            prior = (existing or {}).get("series", {}).get(sid)
            if prior:
                prior["stale"] = True
                series_out[sid] = prior
            continue

        obs = build_fred_observations(raw)
        latest_date, latest_val = _last_valid(obs)
        if latest_date is None:
            warn(f"FRED {sid}: no valid observations after parsing — skipping")
            skipped.append({"series_id": sid, "reason": "no valid observations"})
            continue

        latest_dt = datetime.strptime(latest_date, "%Y-%m-%d").date()

        # Previous observation (the one immediately before the latest real one).
        prev_date, prev_val = None, None
        reals = [(d, v) for d, v in obs if v is not None]
        if len(reals) >= 2:
            prev_date, prev_val = reals[-2]

        mom_date, mom_val = _value_on_or_before(obs, latest_dt - timedelta(days=28))
        yoy_date, yoy_val = _value_on_or_before(obs, latest_dt - timedelta(days=365))

        stale_days = (date.today() - latest_dt).days
        freq = (meta.get("frequency_short") or "").upper()
        # Staleness thresholds scaled to publication cadence — a quarterly
        # series being 40 days old is normal; a daily series is not.
        limit = {"D": 10, "W": 21, "BW": 30, "M": 70, "Q": 200, "SA": 400, "A": 500}.get(freq, 120)

        series_out[sid] = {
            "series_id":     sid,
            "label":         spec.get("label"),
            "short_label":   spec.get("short_label"),
            "category":      spec.get("category"),
            "source":        "Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis",
            "source_agency": meta.get("source_agency"),
            "fred_notes":    meta.get("fred_notes"),
            "fred_title":    meta.get("fred_title"),
            "units":         meta.get("units"),
            "units_short":   meta.get("units_short"),
            "unit_type":     spec.get("unit_type"),
            "decimals":      spec.get("decimals", 2),
            "frequency":     meta.get("frequency"),
            "frequency_short": freq,
            "seasonal_adjustment":       meta.get("seasonal_adjustment"),
            "seasonal_adjustment_short": meta.get("seasonal_adjustment_short"),
            "latest_date":   latest_date,
            "latest_value":  latest_val,
            "previous_date": prev_date,
            "previous_value": prev_val,
            "change_abs":    (round(latest_val - prev_val, 4) if prev_val is not None else None),
            "change_pct":    pct_change(latest_val, prev_val),
            "change_mom_pct": pct_change(latest_val, mom_val),
            "change_mom_abs": (round(latest_val - mom_val, 4) if mom_val is not None else None),
            "change_yoy_pct": pct_change(latest_val, yoy_val),
            "change_yoy_abs": (round(latest_val - yoy_val, 4) if yoy_val is not None else None),
            "yoy_baseline_date": yoy_date,
            "fred_last_updated": meta.get("last_updated"),
            "retrieved_at":  datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "observation_count": len(obs),
            "missing_count": sum(1 for _, v in obs if v is None),
            "stale":         stale_days > limit,
            "stale_days":    stale_days,
            "observations":  obs,
        }
        print(f"  {sid:16} {len(obs):>6} obs   latest {latest_date} = {latest_val}")

    payload = {
        "_schema":      "economy_fred_v1",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "history_start": FRED_HISTORY_START,
        "categories":   config.get("categories", []),
        "skipped":      skipped,
        "series":       series_out,
    }
    return payload, len(series_out)


# ─────────────────────────── Census ───────────────────────────

def discover_acs_vintage(api_key, max_probe_back=4):
    """Find the newest ACS 5-year vintage that actually responds.

    The latest vintage is NOT hardcoded: Census publishes on its own schedule
    and a hardcoded year silently breaks the pipeline every autumn. Probe
    backwards from last year until a variables endpoint answers.
    """
    start = date.today().year - 1
    for year in range(start, start - max_probe_back - 1, -1):
        url = CENSUS_VARS_URL.format(year=year)
        payload = _get_json(url, timeout=60)
        if not _is_err(payload) and isinstance(payload, dict) and payload.get("variables"):
            print(f"  ACS 5-year vintage detected: {year}")
            return year, payload["variables"]
        print(f"  ACS {year}: not available")
    return None, None


def verify_variables(cfg, vintage_vars):
    """Check every configured variable exists and its label matches expectation.

    Returns (selected, problems). ACS variable IDs are reused across vintages
    but tables get restructured — B28002's broadband line has moved. Verifying
    the label prevents publishing an unrelated variable under a metric's name,
    which is far worse than publishing nothing.
    """
    selected, problems = {}, {}

    for metric, spec in cfg["metrics"].items():
        expect = spec.get("expect_label", {})
        chosen = {}
        bad = []

        for role, var_id in spec["variables"].items():
            candidates = [var_id]
            # broadband_pct declares fallbacks because its table moved.
            if metric == "broadband_pct" and role == "broadband":
                candidates = spec.get("broadband_candidates", [var_id])

            picked = None
            for cand in candidates:
                info = vintage_vars.get(cand)
                if not info:
                    continue
                label = (info.get("label") or "").lower()
                fragments = [f.lower() for f in expect.get(cand, expect.get(var_id, []))]
                if all(frag in label for frag in fragments):
                    picked = cand
                    break

            if picked is None:
                bad.append(f"{role}={var_id}")
            else:
                chosen[role] = picked

        if bad:
            problems[metric] = bad
            warn(f"ACS metric '{metric}': could not verify {', '.join(bad)} "
                 f"in this vintage — metric will be omitted rather than guessed")
        else:
            selected[metric] = chosen

    return selected, problems


def _chunk_variables(var_ids, limit):
    """Census caps variables per request; split into compliant batches."""
    uniq = sorted(set(var_ids))
    return [uniq[i:i + limit] for i in range(0, len(uniq), limit)]


def _census_key_param(api_key):
    """Census key query fragment, or empty string when running keyless.

    Census permits unauthenticated requests (roughly 500/day per IP). Appending
    an empty `key=` is NOT the same as omitting it — Census rejects a blank key
    outright — so the parameter has to disappear entirely, not go empty.
    """
    return f"&key={api_key}" if api_key else ""


def fetch_acs(year, geo_clause, var_ids, api_key, limit=50):
    """Fetch ACS variables for a geography, batching to respect the cap.

    Returns { geo_key_tuple: {var_id: raw_value} } or None on total failure.
    """
    merged: dict[tuple, dict] = {}
    for batch in _chunk_variables(var_ids, limit):
        get_list = ",".join(["NAME"] + batch)
        url = (f"{CENSUS_ACS_URL.format(year=year)}?get={urllib.parse.quote(get_list)}"
               f"&{geo_clause}{_census_key_param(api_key)}")
        payload = _get_json(url, timeout=120)
        if _is_err(payload) or not isinstance(payload, list) or len(payload) < 2:
            err = payload.get("__error__") if isinstance(payload, dict) else "malformed response"
            warn(f"ACS {year} batch failed ({err}) for {len(batch)} variables: {_redact(url)[:110]}")
            return None
        header, rows = payload[0], payload[1:]
        idx = {name: i for i, name in enumerate(header)}
        geo_cols = [c for c in ("state", "county") if c in idx]
        for row in rows:
            key = tuple(row[idx[c]] for c in geo_cols)
            slot = merged.setdefault(key, {})
            slot["NAME"] = row[idx["NAME"]]
            for var in batch:
                if var in idx:
                    slot[var] = row[idx[var]]
    return merged


def derive_metric(metric, spec, chosen_vars, raw_row):
    """Compute one metric's value from raw ACS cells, or None."""
    kind = spec.get("derive", "direct")

    if kind == "direct":
        return parse_number(raw_row.get(chosen_vars.get("value")))

    if kind == "ratio":
        num = parse_number(raw_row.get(chosen_vars.get(spec["ratio_numerator"])))
        den = parse_number(raw_row.get(chosen_vars.get(spec["ratio_denominator"])))
        return safe_ratio_pct(num, den, spec.get("decimals", 1))

    if kind == "sum_over_denominator":
        total = 0.0
        any_present = False
        for part in spec["sum_parts"]:
            v = parse_number(raw_row.get(chosen_vars.get(part)))
            if v is not None:
                total += v
                any_present = True
        if not any_present:
            return None
        den = parse_number(raw_row.get(chosen_vars.get(spec["ratio_denominator"])))
        return safe_ratio_pct(total, den, spec.get("decimals", 1))

    return None


def build_census_geography(level, year, cfg, selected, api_key, state_names):
    """Build the FIPS-keyed payload for counties or states, including history.

    History is fetched vintage-by-vintage for the metrics that declare
    history:true, which is what makes the 1y/5y change and CAGR figures real
    rather than interpolated.
    """
    geo_clause = "for=county:*&in=state:*" if level == "county" else "for=state:*"

    # Every variable the current vintage needs.
    all_vars = []
    for metric, chosen in selected.items():
        all_vars.extend(chosen.values())

    print(f"  fetching {level} data for ACS {year} ({len(set(all_vars))} variables)")
    current = fetch_acs(year, geo_clause, all_vars, api_key,
                        cfg.get("max_variables_per_request", 50))
    if not current:
        return None, {}

    # Historical vintages, only for history-enabled metrics.
    hist_metrics = {m: c for m, c in selected.items()
                    if cfg["metrics"][m].get("history")}
    hist_vars = []
    for chosen in hist_metrics.values():
        hist_vars.extend(chosen.values())

    years_back = cfg.get("history_years_back", 5)
    history_by_year: dict[int, dict] = {}
    for offset in range(1, years_back + 1):
        hy = year - offset
        got = fetch_acs(hy, geo_clause, hist_vars, api_key,
                        cfg.get("max_variables_per_request", 50))
        if got:
            history_by_year[hy] = got
            print(f"    history ACS {hy}: {len(got)} rows")
        else:
            warn(f"ACS {hy} history unavailable for {level} — "
                 f"trend figures spanning that year will be omitted, not estimated")

    oldest_year = min(history_by_year) if history_by_year else year
    records, dup_guard = {}, set()

    for geo_key, raw in current.items():
        if level == "county":
            if len(geo_key) != 2:
                continue
            st, co = geo_key
            st, co = str(st).zfill(2), str(co).zfill(3)
            fips = st + co
            if len(fips) != 5 or not fips.isdigit():
                warn(f"skipping malformed county FIPS: {geo_key!r}")
                continue
        else:
            st = str(geo_key[0]).zfill(2)
            if len(st) != 2 or not st.isdigit():
                warn(f"skipping malformed state FIPS: {geo_key!r}")
                continue
            fips, co = st, None

        if fips in dup_guard:
            warn(f"duplicate {level} record for FIPS {fips} — keeping the first")
            continue
        dup_guard.add(fips)

        raw_name = raw.get("NAME") or ""
        if level == "county":
            name = raw_name.split(",")[0].strip()
            state_name = (raw_name.split(",")[1].strip()
                          if "," in raw_name else state_names.get(st, ""))
        else:
            name = raw_name.strip()
            state_name = name

        metrics, history = {}, {}

        for metric, chosen in selected.items():
            spec = cfg["metrics"][metric]
            value = derive_metric(metric, spec, chosen, raw)
            entry = {"value": value}

            if spec.get("history"):
                series = []
                for hy in sorted(history_by_year):
                    hrow = history_by_year[hy].get(geo_key)
                    if not hrow:
                        continue
                    hv = derive_metric(metric, spec, chosen, hrow)
                    if hv is not None:
                        series.append([hy, hv])
                if value is not None:
                    series.append([year, value])
                # Chronological by construction, but assert it: the frontend
                # draws these in array order and would render a zig-zag.
                series.sort(key=lambda r: r[0])
                if series:
                    history[metric] = series

                by_year = dict(series)
                v1 = by_year.get(year - 1)
                v5 = by_year.get(year - 5)
                entry["change_1y_pct"] = pct_change(value, v1)
                entry["change_5y_pct"] = pct_change(value, v5)
                if metric == "population":
                    entry["cagr_5y_pct"] = cagr(value, v5, 5)

            metrics[metric] = entry

        rec = {
            "name":       name,
            "state":      state_name,
            "state_fips": st,
            "metrics":    metrics,
        }
        if co is not None:
            rec["county_fips"] = co
        if history:
            rec["history"] = history
        records[fips] = rec

    payload = {
        "_schema":      f"economy_census_{level}_v1",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "acs_vintage":  year,
        "oldest_history_year": oldest_year,
        "source":       "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "dollar_note":  f"Dollar figures are ACS {year} inflation-adjusted dollars and are not directly comparable to other vintages.",
        "selected_variables": selected,
        "counties" if level == "county" else "states": records,
    }
    return payload, records


# ─────────────────── County Business Patterns (optional) ───────────────────

def collect_cbp(year, api_key, cfg):
    """Optional CBP module. Isolated so a CBP failure cannot break the ACS page.

    Suppressed cells become null plus a _suppressed marker — never 0, and never
    eligible for rankings or percent-change, per the config's suppression_rule.
    """
    cbp_cfg = cfg.get("_cbp", {})
    flags = set(cbp_cfg.get("suppression_flags", []))
    out = {}

    for naics in cbp_cfg.get("naics_of_interest", {}):
        url = (f"{CENSUS_CBP_URL.format(year=year)}?get=NAME,ESTAB,EMP,PAYANN,EMP_F,PAYANN_F"
               f"&for=county:*&in=state:*&NAICS2017={urllib.parse.quote(naics)}"
               f"{_census_key_param(api_key)}")
        payload = _get_json(url, timeout=120)
        if _is_err(payload) or not isinstance(payload, list) or len(payload) < 2:
            err = payload.get("__error__") if isinstance(payload, dict) else "malformed"
            warn(f"CBP {year} NAICS {naics} unavailable ({err}) — "
                 f"business-activity module omitted for this code")
            continue

        header, rows = payload[0], payload[1:]
        idx = {n: i for i, n in enumerate(header)}
        for row in rows:
            try:
                fips = str(row[idx["state"]]).zfill(2) + str(row[idx["county"]]).zfill(3)
            except (KeyError, IndexError):
                continue
            if len(fips) != 5 or not fips.isdigit():
                continue

            def cell(col, flag_col):
                raw = row[idx[col]] if col in idx else None
                flag = row[idx[flag_col]] if flag_col in idx else None
                if flag and str(flag).strip() in flags:
                    return None, True
                return parse_number(raw), False

            emp, emp_sup   = cell("EMP", "EMP_F")
            pay, pay_sup   = cell("PAYANN", "PAYANN_F")
            estab = parse_number(row[idx["ESTAB"]]) if "ESTAB" in idx else None

            slot = out.setdefault(fips, {"naics": {}})
            slot["naics"][naics] = {
                "establishments": estab,
                "employment":     emp,
                "employment_suppressed": emp_sup,
                "annual_payroll_usd": pay,
                "annual_payroll_suppressed": pay_sup,
            }

    if not out:
        return None

    return {
        "_schema":      "economy_cbp_v1",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cbp_year":     year,
        "source":       "U.S. Census Bureau, County Business Patterns",
        "suppression_display": cbp_cfg.get("suppression_display", "Not disclosed"),
        "naics_labels": cbp_cfg.get("naics_of_interest", {}),
        "counties":     out,
    }


# ─────────────────────────── validation ───────────────────────────

def _is_unpopulated_placeholder(payload) -> bool:
    """True for a shipped placeholder that the pipeline has not filled in yet.

    A placeholder has generated_at:null and no records. That state is VALID and
    expected before the first CI run — it is deliberately distinct from
    'populated but corrupt', which must fail. Without this distinction --check
    would fail on a fresh checkout and block the very workflow that populates
    the data. Mirrors how data/source_link_health.json ships in this repo.
    """
    if not isinstance(payload, dict):
        return False
    return payload.get("generated_at") is None and _record_count(payload) == 0


def validate_outputs():
    """Post-write validation. Returns a list of hard errors (empty = valid).

    This runs against what is actually on disk and is also the --check mode used
    in CI, so a corrupt commit fails the workflow instead of shipping.
    """
    errors = []
    today = date.today()

    fred = _load_existing(FRED_OUT)
    if fred and not _is_unpopulated_placeholder(fred):
        series = fred.get("series", {})
        if not series:
            errors.append("fred_data.json claims to be generated but has no series")
        for sid, s in series.items():
            obs = s.get("observations") or []
            dates = [d for d, _ in obs]
            if dates != sorted(dates):
                errors.append(f"{sid}: observations are not chronological")
            for d, _ in obs:
                try:
                    if datetime.strptime(d, "%Y-%m-%d").date() > today:
                        errors.append(f"{sid}: future observation date {d}")
                        break
                except ValueError:
                    errors.append(f"{sid}: unparseable observation date {d!r}")
                    break
            if s.get("unit_type") == "percent":
                v = s.get("latest_value")
                # Rates outside this band indicate a units or parsing error, not
                # a real economy. Deliberately wide to allow historical extremes.
                if v is not None and not (-25 <= v <= 100):
                    errors.append(f"{sid}: latest percent value {v} is implausible")

    for path, key, width in ((COUNTY_OUT, "counties", 5), (STATE_OUT, "states", 2)):
        payload = _load_existing(path)
        if not payload or _is_unpopulated_placeholder(payload):
            continue
        recs = payload.get(key, {})
        if not recs:
            errors.append(f"{path.name} claims to be generated but has no {key}")
        if not payload.get("acs_vintage"):
            errors.append(f"{path.name} missing acs_vintage")
        for fips, rec in recs.items():
            if len(fips) != width or not fips.isdigit():
                errors.append(f"{path.name}: invalid {width}-char FIPS {fips!r}")
                break
            for metric, m in (rec.get("metrics") or {}).items():
                v = m.get("value")
                if v is None:
                    continue
                if metric.endswith("_pct") or metric == "unemployment_rate":
                    if not (0 <= v <= 100):
                        errors.append(f"{path.name} {fips} {metric}: {v} outside 0-100")
                        break
            for metric, series in (rec.get("history") or {}).items():
                years = [y for y, _ in series]
                if years != sorted(years):
                    errors.append(f"{path.name} {fips} history.{metric} not chronological")
                    break
                if any(y > today.year for y in years):
                    errors.append(f"{path.name} {fips} history.{metric} has a future year")
                    break

    return errors


# ─────────────────────────── metadata ───────────────────────────

def write_metadata(fred_payload, county_payload, state_payload, cbp_payload,
                   acs_vintage, var_problems, prior_meta, census_ran,
                   any_source_ok=True):
    """Write economic_metadata.json, or skip when a run changed nothing.

    TWO THINGS THIS GETS RIGHT, both found by running the workflow for real
    with no API keys configured:

    1. `generated_at` means "when data was last generated", NOT "when the
       pipeline last ran". A no-op run that fetched nothing must not stamp a
       fresh timestamp onto a file containing no data — that reads as freshly
       generated data. The run time is recorded separately as `last_run_at`.

    2. A run that changes nothing writes nothing. The workflow is scheduled
       daily; without this, every day until the keys are configured would add a
       commit reading "0 FRED series, 0 counties, ACS None". That is 365 junk
       commits a year and it buries real changes in the history.
    """
    fred_series = (fred_payload or {}).get("series", {}) or {}
    latest_obs = None
    for s in fred_series.values():
        d = s.get("latest_date")
        if d and (latest_obs is None or d > latest_obs):
            latest_obs = d

    src_updated = None
    for s in fred_series.values():
        u = s.get("fred_last_updated")
        if u and (src_updated is None or u > src_updated):
            src_updated = u

    counties = (county_payload or {}).get("counties", {}) or {}
    states   = (state_payload  or {}).get("states",   {}) or {}

    # Preserve the previous Census timestamp when this run skipped Census, so
    # the weekly-refresh decision stays correct across FRED-only runs.
    prior = prior_meta or {}
    census_updated = (datetime.now(timezone.utc).isoformat(timespec="seconds")
                      if census_ran and counties
                      else (prior.get("census", {}) or {}).get("last_successful_update"))

    any_stale = any(s.get("stale") for s in fred_series.values())

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    # Only advance generated_at when a source actually produced data. On a no-op
    # run keep the prior value (None on a never-populated deployment) so the
    # timestamp never claims data that does not exist.
    generated_at = now if any_source_ok else prior.get("generated_at")

    meta = {
        "_schema":         "economy_metadata_v1",
        "pipeline_version": PIPELINE_VERSION,
        "generated_at":    generated_at,
        "last_run_at":     now,
        "source_updated_at": src_updated,
        "latest_observation_date": latest_obs,
        "acs_vintage":     acs_vintage or (county_payload or {}).get("acs_vintage")
                           or (prior.get("acs_vintage")),
        "oldest_history_year": (county_payload or {}).get("oldest_history_year")
                               or prior.get("oldest_history_year"),
        "fred_series_count": len(fred_series),
        "fred_skipped":    (fred_payload or {}).get("skipped", []),
        "county_count":    len(counties),
        "state_count":     len(states),
        "cbp_available":   bool(cbp_payload),
        "cbp_year":        (cbp_payload or {}).get("cbp_year"),
        "census": {
            "last_successful_update": census_updated,
            "selected_variables": (county_payload or {}).get("selected_variables")
                                  or (prior.get("census", {}) or {}).get("selected_variables"),
            "unverified_metrics": var_problems or (prior.get("census", {}) or {}).get("unverified_metrics", {}),
        },
        "sources": [
            {
                "id": "fred",
                "name": "Federal Reserve Economic Data (FRED)",
                "publisher": "Federal Reserve Bank of St. Louis",
                "url": "https://fred.stlouisfed.org/",
                "note": "FRED hosts series produced by several agencies (BLS, BEA, Census). Each series records its own originating agency where FRED supplies it.",
                "update_frequency": "Daily pipeline run; individual series update on their own publication schedules.",
            },
            {
                "id": "acs5",
                "name": "American Community Survey 5-Year Estimates",
                "publisher": "U.S. Census Bureau",
                "url": "https://www.census.gov/programs-surveys/acs/",
                "note": "5-year rolling estimates. Dollar values are expressed in the vintage's inflation-adjusted dollars and are not comparable across vintages.",
                "update_frequency": "Annual vintage; checked weekly by the pipeline.",
            },
        ],
        # Copy, not the live module-level list. Storing the reference made the
        # returned dict alias mutable module state, so a later warn() silently
        # mutated a metadata snapshot someone was holding as "the previous run".
        "warnings": list(warnings),
        "stale":    any_stale,
    }
    if cbp_payload:
        meta["sources"].append({
            "id": "cbp",
            "name": "County Business Patterns",
            "publisher": "U.S. Census Bureau",
            "url": "https://www.census.gov/programs-surveys/cbp.html",
            "note": "Establishment and employment counts. Disclosure-suppressed cells are shown as 'Not disclosed' and excluded from rankings and change calculations.",
            "update_frequency": "Annual.",
        })

    # Skip the write when nothing but the run clock moved. Compared with
    # last_run_at excluded on BOTH sides, so a genuine change — new data, a new
    # warning, a key finally being configured — still writes.
    if prior:
        a = {k: v for k, v in meta.items() if k != "last_run_at"}
        b = {k: v for k, v in prior.items() if k != "last_run_at"}
        if a == b:
            print(f"  {_rel(META_OUT)} unchanged — not rewriting "
                  f"(prevents a daily no-op commit)")
            return meta

    META_OUT.parent.mkdir(parents=True, exist_ok=True)
    # ensure_ascii=False so em-dashes in warnings stay readable rather than
    # being escaped to — — same fix refresh_platform_metadata.py needed.
    META_OUT.write_text(json.dumps(meta, indent=1, sort_keys=True,
                                   ensure_ascii=False) + "\n")
    print(f"  wrote {_rel(META_OUT)}")
    return meta


def _census_is_fresh(prior_meta, max_age_days):
    ts = ((prior_meta or {}).get("census", {}) or {}).get("last_successful_update")
    if not ts:
        return False
    try:
        when = datetime.fromisoformat(ts)
    except ValueError:
        return False
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - when) < timedelta(days=max_age_days)


# ─────────────────────────── main ───────────────────────────

def load_state_names():
    """State FIPS -> name, read from the app's own data so the two never drift."""
    try:
        reg = json.loads((ROOT / "data" / "state_regulations.json").read_text())
        return {k: (v.get("name") or "") for k, v in (reg.get("states") or {}).items()}
    except Exception:                                        # noqa: BLE001
        return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fred-only", action="store_true")
    ap.add_argument("--census-only", action="store_true")
    ap.add_argument("--force-census", action="store_true")
    ap.add_argument("--skip-cbp", action="store_true")
    ap.add_argument("--census-max-age-days", type=int, default=7)
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    if args.check:
        errs = validate_outputs()
        if errs:
            print("VALIDATION FAILED:")
            for e in errs:
                print(f"  - {e}")
            return 1
        print("economic data validation passed")
        return 0

    series_cfg = json.loads(SERIES_CONFIG.read_text())
    census_cfg = json.loads(CENSUS_CONFIG.read_text())
    prior_meta = _load_existing(META_OUT)
    state_names = load_state_names()

    fred_key   = os.environ.get("FRED_API_KEY", "").strip()
    census_key = os.environ.get("CENSUS_API_KEY", "").strip()

    existing_fred   = _load_existing(FRED_OUT)
    existing_county = _load_existing(COUNTY_OUT)
    existing_state  = _load_existing(STATE_OUT)
    existing_cbp    = _load_existing(CBP_OUT)

    fred_payload   = existing_fred
    county_payload = existing_county
    state_payload  = existing_state
    cbp_payload    = existing_cbp
    acs_vintage    = (existing_county or {}).get("acs_vintage")
    var_problems   = {}
    census_ran     = False
    any_source_ok  = False

    if args.offline:
        print("offline mode — validating and re-deriving metadata from existing files only")
        any_source_ok = bool(existing_fred or existing_county)
    else:
        # ── FRED ──
        if not args.census_only:
            print("\n=== FRED ===")
            if not fred_key:
                warn("FRED_API_KEY is not set — skipping FRED. "
                     "Existing fred_data.json is preserved unchanged.")
            else:
                built, ok_count = collect_fred(series_cfg, fred_key, existing_fred)
                if ok_count == 0:
                    warn("FRED returned no usable series — keeping existing file")
                elif _safe_write(FRED_OUT, built, min_records=1):
                    fred_payload = built
                    any_source_ok = True
                else:
                    fred_payload = existing_fred

        # ── Census ──
        if not args.fred_only:
            print("\n=== Census ACS ===")
            if not census_key:
                # Not a skip. Census answers unauthenticated requests at roughly
                # 500/day per IP, and one full run costs ~13 (one batch of 16
                # variables x 6 vintages x 2 geography levels, plus the vintage
                # probe). The key only buys headroom this pipeline never uses,
                # so its absence must not cost the user the entire Economy tab.
                print("  CENSUS_API_KEY not set — running keyless "
                      "(Census allows ~500 requests/day; this run needs ~13)")
            if not args.force_census and _census_is_fresh(prior_meta, args.census_max_age_days):
                print(f"  Census data refreshed within {args.census_max_age_days} days — skipping "
                      f"(ACS updates annually; use --force-census to override)")
            else:
                vintage, vintage_vars = discover_acs_vintage(census_key)
                if not vintage:
                    warn("no ACS 5-year vintage responded — keeping existing Census files")
                else:
                    selected, var_problems = verify_variables(census_cfg, vintage_vars)
                    if not selected:
                        warn("no ACS variables could be verified — keeping existing Census files")
                    else:
                        acs_vintage = vintage
                        cp, crecs = build_census_geography(
                            "county", vintage, census_cfg, selected, census_key, state_names)
                        if cp and _safe_write(COUNTY_OUT, cp, min_records=2000):
                            county_payload = cp
                            census_ran = True
                            any_source_ok = True
                        sp, srecs = build_census_geography(
                            "state", vintage, census_cfg, selected, census_key, state_names)
                        if sp and _safe_write(STATE_OUT, sp, min_records=40):
                            state_payload = sp
                            any_source_ok = True

                        # ── CBP (optional, isolated) ──
                        if not args.skip_cbp:
                            print("\n=== Census County Business Patterns (optional) ===")
                            try:
                                built = collect_cbp(vintage - 1, census_key, census_cfg)
                                if built and _safe_write(CBP_OUT, built, min_records=100):
                                    cbp_payload = built
                            except Exception as e:           # noqa: BLE001
                                warn(f"CBP module raised {type(e).__name__} — "
                                     f"ignored; the Economy page does not depend on it")

    print("\n=== metadata ===")
    write_metadata(fred_payload, county_payload, state_payload, cbp_payload,
                   acs_vintage, var_problems, prior_meta, census_ran,
                   any_source_ok=any_source_ok)

    print("\n=== validation ===")
    errs = validate_outputs()
    if errs:
        print("VALIDATION FAILED — committing this data would corrupt it:")
        for e in errs:
            print(f"  - {e}")
        return 1
    print("  all checks passed")

    if not any_source_ok and not (existing_fred or existing_county):
        print("\nNo source was reachable and there is no usable prior data.")
        return 2

    if not any_source_ok:
        print("\nNo source updated this run; previously good data was preserved. "
              "Exiting successfully — stale data remains available.")

    print(f"\nDone. {len((fred_payload or {}).get('series', {}))} FRED series, "
          f"{len((county_payload or {}).get('counties', {}))} counties, "
          f"{len((state_payload or {}).get('states', {}))} states, "
          f"{len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
