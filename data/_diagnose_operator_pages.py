#!/usr/bin/env python3
"""TEMP diagnostic round 2: inspect a real QTS facility detail page's
JSON-LD (round 1 confirmed 1 ld+json script present on the listing page,
need to confirm it's also on detail pages) and a real CyrusOne facility
detail page's HTML structure (round 1 found 0 ld+json scripts there, so
CyrusOne needs a pure-HTML address extraction strategy -- must see real
markup before writing a parser).
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
            print(f"status={resp.status} content-length={len(body)}")
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read()
        print(f"HTTPError status={e.code}")
        return e.code, body
    except Exception as e:
        print(f"EXCEPTION: {type(e).__name__}: {e}")
        return None, None
    finally:
        time.sleep(1.5)


def main():
    # QTS Ashburn-1 detail page: dump the full ld+json block(s)
    status, body = fetch("https://www.qtsdatacenters.com/data-centers/ashburn-1/",
                          "QTS: Ashburn-1 detail page")
    if body:
        text = body.decode("utf-8", errors="replace")
        for m in re.finditer(
            r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', text, re.DOTALL
        ):
            print("--- ld+json block ---")
            print(m.group(1).strip()[:2000])
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.DOTALL)
        print(f"h1: {h1.group(1).strip() if h1 else None}")

    # CyrusOne Chandler-Arizona detail page: dump text around address-like content
    status, body = fetch(
        "https://cyrusone.com/data-centers/north-america/chandler-arizona",
        "CyrusOne: Chandler-Arizona detail page",
    )
    if body:
        text = body.decode("utf-8", errors="replace")
        # Any structured data at all (meta tags, schema.org microdata)?
        og_locality = re.findall(r'<meta[^>]+property="og:[^"]*"[^>]*content="([^"]*)"', text)
        print(f"og: meta content values (sample): {og_locality[:10]}")
        itemprop_matches = re.findall(r'itemprop="([^"]+)"', text)
        print(f"itemprop attributes found: {sorted(set(itemprop_matches))}")
        addr_hits = re.findall(r'"streetAddress"\s*:\s*"([^"]*)"', text)
        print(f"streetAddress JSON hits: {addr_hits[:5]}")
        # Look for a visible address block near "AZ" or a zip code pattern
        zip_ctx = re.findall(r'.{80}\b\d{5}(?:-\d{4})?\b.{20}', text)
        print(f"context around 5-digit numbers (first 5): {zip_ctx[:5]}")
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.DOTALL)
        print(f"h1: {h1.group(1).strip() if h1 else None}")
        title = re.search(r"<title[^>]*>(.*?)</title>", text, re.DOTALL)
        print(f"title: {title.group(1).strip() if title else None}")


if __name__ == "__main__":
    main()
