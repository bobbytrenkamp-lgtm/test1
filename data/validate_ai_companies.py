#!/usr/bin/env python3
"""Validate ai_companies.json against expected schema and cross-reference js/stocks.js."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
JSON_PATH = ROOT / "data" / "ai_companies.json"
JS_PATH   = ROOT / "js"  / "stocks.js"

REQUIRED_PUBLIC_KEYS  = {"ticker", "symbol", "name", "shortName", "category", "description"}
REQUIRED_PRIVATE_KEYS = {"name", "valuationText", "valuationAsOf", "sourceName", "lastReviewed", "description"}

VALID_EXCHANGES = {"NASDAQ", "NYSE", "SP", "AMEX"}

ERRORS   = []
WARNINGS = []


def err(msg):  ERRORS.append(msg)
def warn(msg): WARNINGS.append(msg)


def validate_json():
    try:
        data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as e:
        err(f"Cannot parse {JSON_PATH}: {e}")
        return None
    return data


def check_public_companies(companies):
    seen_tickers  = {}
    seen_symbols  = {}

    for i, c in enumerate(companies):
        ref = f"public_companies[{i}] ({c.get('name', '?')})"

        missing = REQUIRED_PUBLIC_KEYS - c.keys()
        if missing:
            err(f"{ref}: missing keys: {missing}")

        ticker = c.get("ticker", "")
        symbol = c.get("symbol", "")

        # Ticker format: EXCHANGE:SYMBOL
        if ":" not in ticker:
            err(f"{ref}: ticker '{ticker}' missing exchange prefix (e.g. NASDAQ:NVDA)")
        else:
            exchange, sym_part = ticker.split(":", 1)
            if exchange not in VALID_EXCHANGES:
                warn(f"{ref}: unrecognised exchange '{exchange}' in ticker '{ticker}'")
            if sym_part != symbol:
                err(f"{ref}: ticker symbol part '{sym_part}' != symbol field '{symbol}'")

        # Duplicate checks
        if ticker in seen_tickers:
            err(f"{ref}: duplicate ticker '{ticker}' (first seen at index {seen_tickers[ticker]})")
        seen_tickers[ticker] = i

        if symbol in seen_symbols:
            err(f"{ref}: duplicate symbol '{symbol}' (first seen at index {seen_symbols[symbol]})")
        seen_symbols[symbol] = i

        # Non-empty strings
        for key in REQUIRED_PUBLIC_KEYS:
            if key in c and not str(c[key]).strip():
                err(f"{ref}: field '{key}' is empty")


def check_private_companies(companies):
    for i, p in enumerate(companies):
        ref = f"private_companies[{i}] ({p.get('name', '?')})"
        missing = REQUIRED_PRIVATE_KEYS - p.keys()
        if missing:
            err(f"{ref}: missing keys: {missing}")
        for key in REQUIRED_PRIVATE_KEYS:
            if key in p and not str(p[key]).strip():
                err(f"{ref}: field '{key}' is empty")


def cross_check_js(json_companies):
    """Warn if a ticker in the JSON isn't found in the JS source."""
    if not JS_PATH.exists():
        warn(f"Cannot find {JS_PATH} for cross-check")
        return

    js_src = JS_PATH.read_text(encoding="utf-8")
    json_tickers = {c["ticker"] for c in json_companies if "ticker" in c}

    for ticker in sorted(json_tickers):
        # Look for the ticker string in the JS AI_COMPANIES array
        if f"'{ticker}'" not in js_src and f'"{ticker}"' not in js_src:
            warn(f"Ticker '{ticker}' in JSON not found in js/stocks.js — JSON may be out of sync")

    # Also extract tickers from JS and warn about any in JS but not in JSON
    js_tickers = set(re.findall(r"ticker:\s*['\"]([A-Z]+:[A-Z]+)['\"]", js_src))
    for ticker in sorted(js_tickers - json_tickers):
        warn(f"Ticker '{ticker}' found in js/stocks.js but missing from ai_companies.json")


def main():
    data = validate_json()
    if data is None:
        print("FAIL — could not parse JSON")
        sys.exit(1)

    public_list  = data.get("public_companies", [])
    private_list = data.get("private_companies", [])

    if not isinstance(public_list, list) or not public_list:
        err("public_companies must be a non-empty array")
    if not isinstance(private_list, list) or not private_list:
        err("private_companies must be a non-empty array")

    if isinstance(public_list, list):
        check_public_companies(public_list)
    if isinstance(private_list, list):
        check_private_companies(private_list)

    cross_check_js(public_list if isinstance(public_list, list) else [])

    for w in WARNINGS:
        print(f"WARN  {w}")
    for e in ERRORS:
        print(f"ERROR {e}")

    if not ERRORS and not WARNINGS:
        print(f"OK — {len(public_list)} public companies, {len(private_list)} private companies. No issues found.")
    elif not ERRORS:
        print(f"PASS (with {len(WARNINGS)} warning(s)) — {len(public_list)} public, {len(private_list)} private companies.")
    else:
        print(f"FAIL — {len(ERRORS)} error(s), {len(WARNINGS)} warning(s).")
        sys.exit(1)


if __name__ == "__main__":
    main()
