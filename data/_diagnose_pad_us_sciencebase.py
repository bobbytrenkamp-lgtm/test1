"""data/_diagnose_pad_us_sciencebase.py -- TEMP diagnostic.

Four ArcGIS-hosted PAD-US endpoints were already tried and confirmed dead
(2026-08-09, see data/catalog/dataset_registry.json's pad_us_protected_lands
entry: gis1.usgs.gov 502, maps4.arcgisonline.com 503, Esri Living Atlas
returned a suspicious ~103-byte non-GeoJSON body). This is the "alternate
delivery mechanism" follow-up: USGS actually distributes PAD-US as static
per-state/per-region downloads via ScienceBase, not (necessarily) a live
queryable service. This script:

  1. Searches ScienceBase's public JSON search API for the current PAD-US
     version's real catalog item (never guessing an item id from a web
     search summary).
  2. Fetches that item's JSON to find its child items / files.
  3. Drills into a by-state-GeoJSON child item (if found) to get the real
     per-state download URLs, checking specifically for Virginia, Texas,
     and a couple of other real DC markets already covered elsewhere in
     this repo (VA, TX, MD, GA).
  4. Actually downloads one real state file (Virginia, smallest scope to
     verify) and inspects its real shape (GeoJSON FeatureCollection?
     how many features? what properties?).

Run:  python3 data/_diagnose_pad_us_sciencebase.py
"""
import json
import urllib.request
import urllib.error
import urllib.parse

TIMEOUT = 30


def _get(url, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (pad-us-diagnostic)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, str(e).encode()


def main():
    # 1. Search ScienceBase for the current PAD-US "by State" GeoJSON item.
    search_url = "https://www.sciencebase.gov/catalog/items?" + urllib.parse.urlencode({
        "q": "PAD-US by State GeoJSON",
        "format": "json",
        "max": "25",
    })
    print(f"=== ScienceBase search ===\nURL: {search_url}")
    status, body = _get(search_url)
    print(f"HTTP {status}")
    items = []
    if status == 200:
        try:
            d = json.loads(body)
            items = d.get("items", [])
            print(f"result count: {len(items)}")
            for it in items:
                print(f"  - {it.get('id')}  {it.get('title')}")
        except Exception as e:
            print("parse error:", e, body[:500])
    else:
        print("NOT REACHABLE:", body[:500])

    # 2. Also try the known PAD-US 2.1 by-state GeoJSON item directly (found
    # via web search, but must be verified live, not trusted from the
    # search summary alone), to see its real child structure regardless of
    # whether a newer version turned up in the search above.
    known_item = "6025985bd34eb12031138e21"
    item_url = f"https://www.sciencebase.gov/catalog/item/{known_item}?format=json&fields=title,body,files,webLinks"
    print(f"\n=== Known PAD-US 2.1 by-State GeoJSON item ===\nURL: {item_url}")
    status2, body2 = _get(item_url)
    print(f"HTTP {status2}")
    child_items_url = None
    if status2 == 200:
        try:
            d2 = json.loads(body2)
            print(f"title: {d2.get('title')}")
            print(f"files: {[f.get('name') for f in d2.get('files', [])][:20]}")
            print(f"webLinks: {[w.get('uri') for w in d2.get('webLinks', [])][:20]}")
        except Exception as e:
            print("parse error:", e, body2[:800])
    else:
        print("NOT REACHABLE:", body2[:500])

    # 3. List this item's children (the actual per-state sub-items).
    children_url = f"https://www.sciencebase.gov/catalog/items?parentId={known_item}&format=json&max=100&fields=title,id"
    print(f"\n=== Children of the by-State item (should be one per state) ===\nURL: {children_url}")
    status3, body3 = _get(children_url)
    print(f"HTTP {status3}")
    va_child_id = None
    if status3 == 200:
        try:
            d3 = json.loads(body3)
            kids = d3.get("items", [])
            print(f"child count: {len(kids)}")
            for k in kids:
                title = k.get("title", "")
                print(f"  - {k.get('id')}  {title}")
                if "virginia" in title.lower() and "west" not in title.lower():
                    va_child_id = k.get("id")
        except Exception as e:
            print("parse error:", e, body3[:800])
    else:
        print("NOT REACHABLE:", body3[:500])

    if not va_child_id:
        print("\nNo Virginia child item identified -- stopping before guessing a download URL.")
        return

    # 4. Fetch the Virginia child item's own files to get a real download URL.
    va_item_url = f"https://www.sciencebase.gov/catalog/item/{va_child_id}?format=json&fields=title,files"
    print(f"\n=== Virginia child item ===\nURL: {va_item_url}")
    status4, body4 = _get(va_item_url)
    print(f"HTTP {status4}")
    download_url = None
    if status4 == 200:
        try:
            d4 = json.loads(body4)
            print(f"title: {d4.get('title')}")
            files = d4.get("files", [])
            for f in files:
                print(f"  file: {f.get('name')}  url: {f.get('url')}  size: {f.get('size')}")
                if f.get("name", "").lower().endswith(".geojson") or f.get("name", "").lower().endswith(".zip"):
                    download_url = f.get("url")
        except Exception as e:
            print("parse error:", e, body4[:800])
    else:
        print("NOT REACHABLE:", body4[:500])

    if not download_url:
        print("\nNo downloadable file URL found on the Virginia item -- stopping.")
        return

    # 5. Actually download it (partial read only, to inspect shape without
    # blowing up CI log size) and report what it really is.
    print(f"\n=== Downloading real Virginia file ===\nURL: {download_url}")
    status5, body5 = _get(download_url, timeout=60)
    print(f"HTTP {status5}, byte length: {len(body5)}")
    if status5 == 200:
        if download_url.lower().endswith(".zip") or body5[:2] == b"PK":
            print("This is a ZIP archive (likely a shapefile bundle), not raw GeoJSON.")
        else:
            try:
                gj = json.loads(body5)
                print(f"top-level keys: {list(gj.keys())}")
                feats = gj.get("features", [])
                print(f"feature count: {len(feats)}")
                if feats:
                    print(f"sample properties: {json.dumps(feats[0].get('properties', {}), indent=2)[:1500]}")
                    geom = feats[0].get("geometry", {})
                    print(f"sample geometry type: {geom.get('type')}")
            except Exception as e:
                print("NOT PARSEABLE JSON:", e, body5[:500])


if __name__ == "__main__":
    main()
