"""data/_diagnose_pad_us_sciencebase_r2.py -- TEMP diagnostic, round 2.

Round 1's 30s timeout wasn't enough to distinguish "ScienceBase is slow" from
"ScienceBase is unreachable from a GitHub Actions runner" -- all three calls
timed out identically. This retries the single most important call (the
known PAD-US 2.1 by-State GeoJSON item) with a much longer timeout (90s) and
prints wall-clock elapsed time, so a genuine block (which should fail fast
or hang for the full duration) can be told apart from a slow-but-real
response.

Run:  python3 data/_diagnose_pad_us_sciencebase_r2.py
"""
import time
import urllib.request
import urllib.error

TIMEOUT = 90


def _get(url, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (pad-us-diagnostic-r2)"})
    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            return resp.status, body, time.monotonic() - start
    except urllib.error.HTTPError as e:
        return e.code, e.read(), time.monotonic() - start
    except Exception as e:
        return None, str(e).encode(), time.monotonic() - start


def main():
    url = "https://www.sciencebase.gov/catalog/item/6025985bd34eb12031138e21?format=json&fields=title,files,webLinks"
    print(f"URL: {url}\nTimeout: {TIMEOUT}s")
    status, body, elapsed = _get(url)
    print(f"HTTP {status}, elapsed {elapsed:.1f}s, body length {len(body)}")
    print(body[:1500])

    # Also try the base sciencebase.gov homepage as a control -- if even
    # this times out identically, the whole domain is unreachable from this
    # runner, not just the catalog API specifically.
    print("\n--- control: sciencebase.gov root ---")
    status2, body2, elapsed2 = _get("https://www.sciencebase.gov/", timeout=30)
    print(f"HTTP {status2}, elapsed {elapsed2:.1f}s, body length {len(body2)}")


if __name__ == "__main__":
    main()
