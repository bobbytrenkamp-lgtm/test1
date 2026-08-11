#!/usr/bin/env python3
"""TEMP diagnostic: find real, scrapable public data-center location pages
for candidate operators not yet covered by facility_pipeline adapters
(currently: Equinix, Digital Realty). Prints real HTTP status + a body
prefix for each candidate URL so real adapters can be built against
confirmed page structure, not guessed selectors.

Candidates chosen: QTS Data Centers and CyrusOne -- both major US
colocation/hyperscale operators with (per general knowledge, unverified
until this runs) public data-center location listing pages.
"""
import re
import time
import urllib.error
import urllib.request

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def fetch(url, label):
    print(f"\n=== {label} ===\n{url}")
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            print(f"status={resp.status} content-type={resp.headers.get('Content-Type')} "
                  f"content-length={len(body)}")
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read()
        print(f"HTTPError status={e.code}")
        print(f"body[:400]={body[:400]!r}")
        return e.code, body
    except Exception as e:
        print(f"EXCEPTION: {type(e).__name__}: {e}")
        return None, None
    finally:
        time.sleep(1.5)


def analyze(body, label):
    if not body:
        return
    text = body.decode("utf-8", errors="replace")
    ld_json_count = len(re.findall(r'<script[^>]*type="application/ld\+json"', text))
    link_count = len(re.findall(r'<a\s[^>]*href=', text, re.IGNORECASE))
    has_next_data = '__NEXT_DATA__' in text
    has_nuxt = '__NUXT__' in text
    print(f"  [{label}] ld+json scripts={ld_json_count} <a> tags={link_count} "
          f"__NEXT_DATA__={has_next_data} __NUXT__={has_nuxt}")
    # print a sample of href values that look like facility/location detail links
    hrefs = re.findall(r'href="([^"]+)"', text)
    interesting = [h for h in hrefs if re.search(r'data-center|location|facilit', h, re.IGNORECASE)]
    print(f"  sample location-like hrefs (first 15): {interesting[:15]}")


def main():
    # QTS Data Centers
    status, body = fetch("https://www.qtsdatacenters.com/data-centers", "QTS: /data-centers")
    analyze(body, "qts")
    if not body or status != 200:
        status, body = fetch("https://www.qtsdatacenters.com/locations", "QTS: /locations")
        analyze(body, "qts-locations")

    # CyrusOne
    status, body = fetch("https://cyrusone.com/data-centers/", "CyrusOne: /data-centers/")
    analyze(body, "cyrusone")
    if not body or status != 200:
        status, body = fetch("https://cyrusone.com/locations/", "CyrusOne: /locations/")
        analyze(body, "cyrusone-locations")


if __name__ == "__main__":
    main()
