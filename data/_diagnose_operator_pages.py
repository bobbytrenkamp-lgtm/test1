#!/usr/bin/env python3
"""TEMP diagnostic round 3: QTS's ld+json is generic WordPress/Yoast SEO
markup (WebPage/Organization/BreadcrumbList), not a PostalAddress/geo
schema like Equinix/Digital Realty -- round 2 confirmed this. Need to find
where the real city/state/address text actually lives on the page (meta
description, a visible address block, or a Google Maps embed link with
lat/long) before writing a parser.
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
        print(f"HTTPError status={e.code}")
        return e.code, e.read()
    except Exception as e:
        print(f"EXCEPTION: {type(e).__name__}: {e}")
        return None, None
    finally:
        time.sleep(1.5)


def main():
    status, body = fetch("https://www.qtsdatacenters.com/data-centers/ashburn-1/",
                          "QTS: Ashburn-1 detail page (round 3)")
    if not body:
        return
    text = body.decode("utf-8", errors="replace")

    # meta description
    desc = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]*)"', text)
    print(f"meta description: {desc.group(1) if desc else None}")
    og_desc = re.search(r'<meta[^>]+property="og:description"[^>]+content="([^"]*)"', text)
    print(f"og:description: {og_desc.group(1) if og_desc else None}")

    # Google Maps embed / link with lat,lng
    maps_links = re.findall(r'(?:google\.com/maps[^"\'\s]*|maps\.google[^"\'\s]*)', text)
    print(f"google maps links (first 5): {maps_links[:5]}")
    latlng = re.findall(r'[-+]?\d{1,3}\.\d{3,},\s*[-+]?\d{1,3}\.\d{3,}', text)
    print(f"lat,lng-shaped strings (first 5): {latlng[:5]}")

    # Visible state abbreviation context (e.g. ", VA " near an address)
    addr_ctx = re.findall(r'.{40}\b[A-Z][a-z]+,\s*(?:VA|Virginia)\b.{20}', text)
    print(f"context around 'City, VA' pattern (first 5): {addr_ctx[:5]}")

    # Any data-* attributes carrying lat/lng (common in JS-driven map widgets)
    data_lat = re.findall(r'data-lat(?:itude)?="([^"]+)"', text, re.IGNORECASE)
    data_lng = re.findall(r'data-lng|data-lon(?:gitude)?="([^"]+)"', text, re.IGNORECASE)
    print(f"data-lat attrs: {data_lat[:5]}  data-lng attrs: {data_lng[:5]}")

    # Address block near "Address" label
    addr_label_ctx = re.findall(r'.{20}[Aa]ddress.{120}', text)
    print(f"context around the word 'Address' (first 3): {addr_label_ctx[:3]}")


if __name__ == "__main__":
    main()
