#!/usr/bin/env python3
"""
Legislative monitoring script for the US Datacenter Restrictions Map.

Searches for newly introduced or changed legislation related to data centers,
cryptocurrency mining, AI regulation, and energy/water restrictions.

Sources (in priority order):
  1. LegiScan API (all 50 states + federal) — set LEGISCAN_API_KEY secret
  2. Congress.gov API (federal only) — set CONGRESS_API_KEY secret (free at api.congress.gov)
  3. Congress.gov DEMO_KEY (federal only, rate-limited fallback — no setup needed)

Nothing is automatically added to the map. Every flagged item requires a human
to review and manually update data/restrictions_raw.json if relevant.

Seen bill IDs are stored in data/monitoring_seen.json to avoid re-alerting
on the same legislation every run.

Exit codes:
  0 — no new items flagged (or no sources available)
  1 — new items found that need human review
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from xml.etree import ElementTree

DATA_DIR       = os.path.dirname(os.path.abspath(__file__))
SEEN_PATH      = os.path.join(DATA_DIR, "monitoring_seen.json")
REPORT_PATH    = os.path.join(DATA_DIR, "monitoring_report.json")
RAW_PATH       = os.path.join(DATA_DIR, "restrictions_raw.json")

LEGISCAN_KEY   = os.environ.get("LEGISCAN_API_KEY", "").strip()
CONGRESS_KEY   = os.environ.get("CONGRESS_API_KEY", "DEMO_KEY").strip() or "DEMO_KEY"

LEGISCAN_BASE  = "https://api.legiscan.com/"
CONGRESS_BASE  = "https://api.congress.gov/v3"

USER_AGENT = (
    "Mozilla/5.0 (compatible; DataCenterRestrictionsMap/1.0; "
    "+https://github.com/bobbytrenkamp-lgtm/test1)"
)

# ---------------------------------------------------------------------------
# State name ↔ abbreviation maps
# ---------------------------------------------------------------------------

STATE_NAME_TO_ABBR = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC",
}
STATE_ABBR_TO_NAME = {v: k for k, v in STATE_NAME_TO_ABBR.items()}

# ---------------------------------------------------------------------------
# Keyword configuration
# ---------------------------------------------------------------------------

# Queries sent to LegiScan (each is a separate API call)
LEGISCAN_QUERIES = [
    "data center restriction ban moratorium",
    "data center zoning ordinance",
    "cryptocurrency mining ban moratorium restrict",
    "bitcoin mining energy restrict",
    "artificial intelligence ordinance regulation local",
    "server farm restrict zoning",
    "data center water use energy consumption",
    "high density computing restrict",
]

# Queries sent to Congress.gov
CONGRESS_QUERIES = [
    "data center",
    "cryptocurrency mining restriction",
    "artificial intelligence regulation data center",
    "server farm energy",
]

# Keywords for local relevance scoring (title / description matching)
HIGH_VALUE_TERMS = [
    "data center", "datacenter", "server farm", "computing facility",
    "cryptocurrency mining", "bitcoin mining", "crypto mining", "blockchain mining",
    "moratorium", "ban", "prohibit", "restrict", "ordinance", "zoning",
    "artificial intelligence", "high density computing", "hyperscale",
]

LOW_VALUE_TERMS = [
    "cybersecurity", "privacy", "broadband", "telecom", "digital divide",
    "social media", "online", "internet service", "streaming",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def http_get(url, params=None, retries=2):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    req.add_header("User-Agent", USER_AGENT)
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read()
                return raw
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise
        except Exception:
            if attempt < retries:
                time.sleep(1)
                continue
            raise
    return b""


def load_seen():
    try:
        with open(SEEN_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"seen_ids": [], "last_run": None}


def save_seen(seen):
    seen["last_run"] = datetime.now(timezone.utc).isoformat()
    with open(SEEN_PATH, "w") as f:
        json.dump(seen, f, indent=2)


def load_tracked_states():
    """Return set of 2-letter state abbreviations from restrictions_raw.json."""
    try:
        with open(RAW_PATH) as f:
            raw = json.load(f)
        abbrs = set()
        for r in raw.get("restrictions", []):
            state = r.get("state", "")
            abbr = STATE_NAME_TO_ABBR.get(state)
            if abbr:
                abbrs.add(abbr)
        return abbrs
    except Exception:
        return set()


def score_item(title, description, state, tracked_states):
    """
    Score a bill for relevance. Returns (score, reasons[]).
    score >= 5: high relevance
    score 3-4: medium relevance
    score 1-2: low relevance (filtered out)
    """
    text = (title + " " + (description or "")).lower()
    score = 0
    reasons = []

    # Penalize irrelevant topics
    for term in LOW_VALUE_TERMS:
        if term in text and not any(t in text for t in HIGH_VALUE_TERMS):
            return 0, []

    # Score high-value keyword hits in title
    title_lower = title.lower()
    for term in HIGH_VALUE_TERMS:
        if term in title_lower:
            score += 3
            reasons.append(f'title contains "{term}"')
            break  # one title hit is enough

    # Score keyword hits in description/summary
    desc_hits = [t for t in HIGH_VALUE_TERMS if t in text and t not in title_lower]
    if desc_hits:
        score += min(len(desc_hits), 2)
        reasons.append(f'summary contains: {", ".join(desc_hits[:3])}')

    # Bonus for tracked state
    if state and state.upper() in tracked_states:
        score += 2
        reasons.append(f"state {state.upper()} is actively tracked")

    # Bonus for ban/moratorium/restrict language
    for strong in ("ban", "moratorium", "prohibit", "restrict"):
        if strong in text:
            score += 1
            reasons.append(f'action keyword: "{strong}"')
            break

    return score, reasons


def guess_affected_counties(state_abbr, title_desc):
    """Return list of FIPS codes in the tracked state that might be affected."""
    try:
        with open(RAW_PATH) as f:
            raw = json.load(f)
        text = title_desc.lower()
        matches = []
        for r in raw.get("restrictions", []):
            if STATE_NAME_TO_ABBR.get(r.get("state", "")) == state_abbr:
                if r["name"].lower().replace(" county", "") in text:
                    matches.append(f"{r['fips']} ({r['name']})")
        return matches
    except Exception:
        return []


# ---------------------------------------------------------------------------
# LegiScan source
# ---------------------------------------------------------------------------

def fetch_legiscan():
    """Query LegiScan API for each keyword set. Returns list of raw bill dicts."""
    if not LEGISCAN_KEY:
        print("  [skip] LEGISCAN_API_KEY not set — skipping LegiScan", file=sys.stderr)
        return []

    bills = {}  # bill_id → bill dict (deduplicate across queries)

    for query in LEGISCAN_QUERIES:
        params = {
            "op": "getSearch",
            "apikey": LEGISCAN_KEY,
            "query": query,
            "state": "ALL",
            "year": 1,  # current sessions only
        }
        try:
            raw = http_get(LEGISCAN_BASE, params)
            data = json.loads(raw)
            if data.get("status") != "OK":
                print(f"  [warn] LegiScan returned status={data.get('status')} for query '{query}'",
                      file=sys.stderr)
                continue
            results = data.get("searchresult", {}).get("results", {})
            # Results is a dict keyed by string index when there are multiple
            if isinstance(results, dict):
                results = list(results.values())
            for bill in results:
                bid = str(bill.get("bill_id", ""))
                if bid and bid not in bills:
                    bills[bid] = bill
            print(f"  LegiScan query '{query[:40]}': {len(results)} results")
            time.sleep(0.3)  # be polite
        except Exception as e:
            print(f"  [warn] LegiScan query failed: {e}", file=sys.stderr)

    print(f"  LegiScan total unique bills: {len(bills)}")
    return list(bills.values())


def normalize_legiscan(bill):
    """Convert a LegiScan bill dict to our standard format."""
    state = bill.get("state", "")
    return {
        "source": "legiscan",
        "id": f"legiscan:{bill.get('bill_id','')}",
        "state": state,
        "bill_number": bill.get("bill_number", ""),
        "title": bill.get("title", ""),
        "description": bill.get("description", ""),
        "status": bill.get("last_action", ""),
        "last_action_date": bill.get("last_action_date", ""),
        "url": bill.get("url", ""),
        "introduced": bill.get("introduced", ""),
    }


# ---------------------------------------------------------------------------
# Congress.gov source
# ---------------------------------------------------------------------------

def fetch_congress():
    """Query Congress.gov API for data-center-related federal legislation."""
    bills = {}

    for query in CONGRESS_QUERIES:
        params = {
            "query": query,
            "format": "json",
            "limit": 20,
            "offset": 0,
            "sort": "updateDate",
            "order": "desc",
            "api_key": CONGRESS_KEY,
        }
        try:
            raw = http_get(f"{CONGRESS_BASE}/bill", params)
            data = json.loads(raw)
            results = data.get("bills", [])
            for bill in results:
                bid = f"{bill.get('congress','')}-{bill.get('type','')}-{bill.get('number','')}"
                if bid not in bills:
                    bills[bid] = bill
            print(f"  Congress.gov query '{query[:40]}': {len(results)} results "
                  f"({'DEMO_KEY — rate limited' if CONGRESS_KEY == 'DEMO_KEY' else 'API key'})")
            time.sleep(0.5)
        except Exception as e:
            print(f"  [warn] Congress.gov query failed: {e}", file=sys.stderr)

    print(f"  Congress.gov total unique bills: {len(bills)}")
    return list(bills.values())


def normalize_congress(bill):
    """Convert a Congress.gov bill dict to our standard format."""
    number = bill.get("number", "")
    btype  = bill.get("type", "")
    congress = bill.get("congress", "")
    title  = bill.get("title", "")
    url    = f"https://www.congress.gov/bill/{congress}th-congress/{btype.lower()}/{number}"
    return {
        "source": "congress",
        "id": f"congress:{congress}-{btype}-{number}",
        "state": "US",
        "bill_number": f"{btype} {number}",
        "title": title,
        "description": bill.get("policyArea", {}).get("name", "") if isinstance(bill.get("policyArea"), dict) else "",
        "status": (bill.get("latestAction") or {}).get("text", ""),
        "last_action_date": (bill.get("latestAction") or {}).get("actionDate", ""),
        "url": url,
        "introduced": bill.get("introducedDate", ""),
    }


# ---------------------------------------------------------------------------
# Main monitoring logic
# ---------------------------------------------------------------------------

def run_monitoring():
    tracked_states = load_tracked_states()
    seen = load_seen()
    seen_ids = set(seen.get("seen_ids", []))

    print(f"\nTracking {len(tracked_states)} states: {', '.join(sorted(tracked_states))}")
    print(f"Previously seen bill IDs: {len(seen_ids)}")

    # Fetch from all sources
    print("\n── LegiScan (50-state) ──")
    ls_raw   = fetch_legiscan()
    ls_bills = [normalize_legiscan(b) for b in ls_raw]

    print("\n── Congress.gov (federal) ──")
    cg_raw   = fetch_congress()
    cg_bills = [normalize_congress(b) for b in cg_raw]

    all_bills = ls_bills + cg_bills
    print(f"\nTotal candidates: {len(all_bills)}")

    # Score and filter
    flagged  = []
    new_ids  = []

    for bill in all_bills:
        bid = bill["id"]
        if bid in seen_ids:
            continue  # already reported

        title = bill.get("title", "")
        desc  = bill.get("description", "") + " " + bill.get("status", "")
        state = bill.get("state", "")

        score, reasons = score_item(title, desc, state, tracked_states)
        if score < 3:
            continue  # not relevant enough

        # Guess which tracked counties might be affected
        affected = guess_affected_counties(state.upper(), title + " " + desc)

        flagged.append({
            **bill,
            "relevance_score": score,
            "relevance_reasons": reasons,
            "affected_counties": affected,
        })
        new_ids.append(bid)

    # Sort by score descending
    flagged.sort(key=lambda x: -x["relevance_score"])

    # Update seen IDs (mark all fetched bills as seen, not just flagged ones)
    all_fetched_ids = [b["id"] for b in all_bills]
    seen["seen_ids"] = list(seen_ids | set(all_fetched_ids))
    save_seen(seen)

    # Write report
    report = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "total_candidates": len(all_bills),
        "new_flagged": len(flagged),
        "items": flagged,
    }
    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    return flagged


def format_issue_body(flagged):
    """Format flagged items into a GitHub Issue body."""
    run_date = date.today().isoformat()
    high = [b for b in flagged if b["relevance_score"] >= 5]
    med  = [b for b in flagged if 3 <= b["relevance_score"] < 5]

    lines = [
        f"## Legislative Monitoring Digest — {run_date}",
        "",
        f"**New items flagged for review:** {len(flagged)}  ",
        f"**High relevance (≥5):** {len(high)}  ",
        f"**Medium relevance (3–4):** {len(med)}",
        "",
        "> **Instructions:** Review each item below. If it represents a real restriction",
        "> or incentive for data centers, update `data/restrictions_raw.json` manually.",
        "> Then close this issue or leave a comment explaining the decision.",
        "",
    ]

    def format_items(items, label):
        if not items:
            return
        lines.append(f"### {label}")
        lines.append("")
        for b in items:
            state_name = STATE_ABBR_TO_NAME.get(b["state"], b["state"])
            bill_ref = f"{b['state']} {b['bill_number']}".strip()
            lines.append(f"#### [{bill_ref}] {b['title']}")
            lines.append(f"- **Score:** {b['relevance_score']} | **State:** {state_name}")
            if b.get("last_action_date"):
                lines.append(f"- **Last action:** {b['last_action_date']} — {b.get('status','')[:120]}")
            if b.get("introduced"):
                lines.append(f"- **Introduced:** {b['introduced']}")
            if b.get("relevance_reasons"):
                lines.append(f"- **Why flagged:** {'; '.join(b['relevance_reasons'])}")
            if b.get("affected_counties"):
                lines.append(f"- **Possible affected counties:** {', '.join(b['affected_counties'][:5])}")
            if b.get("url"):
                lines.append(f"- **[View full bill text]({b['url']})**")
            lines.append("")

    format_items(high, f"High Relevance — {len(high)} item(s)")
    format_items(med, f"Medium Relevance — {len(med)} item(s)")

    lines += [
        "---",
        "_Generated by `data/monitor_legislation.py`. "
        "This is an automated digest — no data was changed automatically._",
    ]
    return "\n".join(lines)


def main():
    print("=" * 64)
    print("  US Datacenter Restrictions Map — Legislative Monitor")
    print("=" * 64)

    flagged = run_monitoring()

    print(f"\n{'='*64}")
    print(f"  New items flagged: {len(flagged)}")
    if flagged:
        print(f"  High relevance (≥5): {sum(1 for b in flagged if b['relevance_score'] >= 5)}")
        print(f"  Medium relevance:    {sum(1 for b in flagged if b['relevance_score'] < 5)}")
        print(f"\n  Top findings:")
        for b in flagged[:5]:
            print(f"    [{b['relevance_score']:2d}] {b['state']} {b['bill_number']}: {b['title'][:70]}")
    print(f"{'='*64}\n")

    if flagged:
        # Print the formatted issue body to stdout for the workflow to capture
        print("\n__ISSUE_BODY_START__")
        print(format_issue_body(flagged))
        print("__ISSUE_BODY_END__")
        return 1

    print("No new items to flag.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
