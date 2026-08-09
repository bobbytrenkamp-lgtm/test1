"""Temporary diagnostic: hit the real EDGAR full-text search API once and
print the raw top-level JSON shape + first hit, so the adapter's field-name
guesses in _first(entity, ...) can be checked against reality instead of
being guessed twice. Deleted before this PR merges -- not part of the
pipeline.
"""
import json
import urllib.parse

import requests

params = {
    "q": '"data center campus" "will develop" OR "will construct" OR "ground breaking"',
    "forms": "8-K",
    "dateRange": "custom",
    "startdt": "2020-01-01",
    "enddt": "9999-12-31",
}
qs = urllib.parse.urlencode(params)
url = f"https://efts.sec.gov/LATEST/search-index?{qs}"

headers = {
    "User-Agent": "US-AI-Infrastructure-Map/1.0 datacenter-research@example.com",
    "Accept": "application/json",
}

r = requests.get(url, headers=headers, timeout=30)
print("status:", r.status_code)
print("url:", r.url)
try:
    payload = r.json()
except Exception as e:
    print("JSON DECODE FAILED:", type(e).__name__, e)
    print("raw text (first 2000 chars):", r.text[:2000])
else:
    print("top-level keys:", list(payload.keys()))
    hits = payload.get("hits", {}).get("hits", [])
    print("num hits:", len(hits))
    if hits:
        print("first hit (full):")
        print(json.dumps(hits[0], indent=2)[:4000])
    else:
        print("full payload (first 3000 chars):")
        print(json.dumps(payload, indent=2)[:3000])
