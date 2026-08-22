"""data/parcel_pipeline/static_ingestion/derive_county_registry_layer.py

Turns a statewide static-ingestion source's raw chunked GeoJSON output
(data/generated/static_parcels/<source-id>/*.geojson) into a single,
browser-sized GeoJSON file js/parcel/registry.js can serve through the
existing GeoJSONParcelConnector, scoped to specific towns.

WHY TOWNS, NOT THE WHOLE STATE
-------------------------------
js/parcel/registry.js is keyed one entry per county FIPS, and
GeoJSONParcelConnector fetches its whole file once and caches it in
browser memory (js/parcel/connector-geojson.js's own doc comment: "For
large files, set config.streaming" -- which isn't available for a static
file with no server-side filter). A full state or even a full county can
be 100+ MB, both too large to commit sensibly and too large to hand a
browser tab in one fetch. Filtering to only the towns actually relevant
to this platform's purpose (where known data-center facilities are, per
data/facilities_index.json) keeps the artifact honest about its own
scope instead of silently truncating or fabricating full coverage.

WHY A REAL SPATIAL JOIN, NOT A HARDCODED TOWN LIST
----------------------------------------------------
Vermont's parcel schema has no COUNTY field (VT's local government units
are towns, not counties -- see sources.json's own note on this source).
Guessing which towns belong to which county from memory is exactly the
kind of "confidently wrong" data this project's whole discipline refuses
(models.py's own docstring says the same about parcel_id_field/CRS
guesses). This script instead decodes the real US Census county boundary
already vendored for the main policy map (vendor/counties-10m.json) and
does an actual point-in-polygon test per parcel. A handful of parcels
from towns administratively in a neighboring county can still fall just
inside the boundary polygon near a shared town line -- that's a real,
minor, and expected artifact of joining two independently-drawn
boundary datasets, not a bug in either one.

USAGE
-----
  python3 data/parcel_pipeline/static_ingestion/derive_county_registry_layer.py \\
      --source vt-vcgi-statewide-parcels --county-fips 50007 \\
      --towns BURLINGTON,SOUTH BURLINGTON,WINOOSKI,COLCHESTER \\
      --keep-fields GLIST_SPAN,SPAN,E911ADDR,OWNER1,CAT,ACRESGL,REAL_FLV,LAND_LV,IMPRV_LV,GLYEAR,TOWN \\
      --id-field GLIST_SPAN \\
      --out data/generated/static_parcels/vt-vcgi-statewide-parcels/chittenden-burlington-metro.geojson \\
      --simplify-deg 0.0001 --round-decimals 5

  --check runs the same derivation and diffs against the committed --out
  file instead of writing it, matching this repo's other generate_*.py
  --check convention (fails CI if the committed file is stale).
"""
from __future__ import annotations

import argparse
import glob
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent.parent


def load_one_geometry(path: str, object_name: str, feature_id: str):
    """Minimal TopoJSON -> shapely decoder, scoped to a single feature id.
    No third-party topojson package -- that dependency chain pulled in a
    numpy build that conflicted with the system numpy during development
    of this script. This only implements what us-atlas TopoJSON needs:
    Polygon/MultiPolygon, delta-encoded + quantized arcs."""
    from shapely.geometry import Polygon, MultiPolygon

    d = json.load(open(path))
    transform = d.get("transform")
    scale = transform["scale"] if transform else (1, 1)
    translate = transform["translate"] if transform else (0, 0)

    geom = next(g for g in d["objects"][object_name]["geometries"] if g.get("id") == feature_id)

    def decode_arc(arc):
        points = []
        x = y = 0
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * scale[0] + translate[0], y * scale[1] + translate[1]))
        return points

    def arc_coords(i):
        raw = d["arcs"][i if i >= 0 else ~i]
        pts = decode_arc(raw)
        return list(reversed(pts)) if i < 0 else pts

    def ring_coords(arc_indices):
        coords = []
        for i in arc_indices:
            seg = arc_coords(i)
            if coords and coords[-1] == seg[0]:
                coords.extend(seg[1:])
            else:
                coords.extend(seg)
        return coords

    gtype = geom["type"]
    if gtype == "Polygon":
        rings = [ring_coords(ring) for ring in geom["arcs"]]
        return Polygon(rings[0], rings[1:]), geom.get("properties", {})
    elif gtype == "MultiPolygon":
        polys = []
        for part in geom["arcs"]:
            rings = [ring_coords(ring) for ring in part]
            if len(rings[0]) >= 4:
                polys.append(Polygon(rings[0], rings[1:]))
        return MultiPolygon(polys), geom.get("properties", {})
    raise ValueError(f"unsupported geometry type {gtype}")


def _round_coords(c, nd):
    if isinstance(c[0], (int, float)):
        return [round(c[0], nd), round(c[1], nd)]
    return [_round_coords(x, nd) for x in c]


def derive(source_id: str, county_fips: str, towns: set, keep_fields: list,
           simplify_deg: float, round_decimals: int, id_field: str) -> dict:
    try:
        from shapely.geometry import shape, mapping
        from shapely.prepared import prep
    except ImportError as e:
        raise SystemExit(
            "This script requires shapely (pip install shapely) -- it is not a "
            "runtime dependency of the shipped app, only of this offline "
            "derivation tool."
        ) from e

    topojson_path = ROOT / "vendor" / "counties-10m.json"
    poly, props = load_one_geometry(str(topojson_path), "counties", county_fips)
    prepared = prep(poly)

    chunk_dir = ROOT / "data" / "generated" / "static_parcels" / source_id
    # Only the raw chunker's own naming convention (chunk.py's
    # f"{dataset_id}_chunk_{idx:04d}.geojson") -- NOT a glob for every
    # .geojson under this directory. A derived output written into the
    # same directory (or any other file matching *.geojson) would
    # otherwise get re-scanned as if it were raw source data on the next
    # run, silently double-counting already-filtered features.
    chunk_files = sorted(glob.glob(str(chunk_dir / f"{source_id}_chunk_*.geojson")))
    if not chunk_files:
        raise SystemExit(f"No chunk files found under {chunk_dir} -- has the "
                          f"static ingestion for '{source_id}' been run?")

    matched = []
    town_counts: dict = {}
    for fn in chunk_files:
        d = json.load(open(fn))
        for f in d["features"]:
            p = f["properties"]
            town = p.get("TOWN")
            if towns and town not in towns:
                continue
            if id_field and not p.get(id_field):
                # A real, if small (~4.4% in the first version of this
                # file), share of records in this source carry valid
                # geometry and TOWN but every attribute field null --
                # apparent non-assessed slivers (water, road right-of-way)
                # swept into the same layer as real parcels. parcel_id is
                # a required canonical field (js/parcel/schema.js); a
                # feature with none would render as a clickable "parcel"
                # with no id and no data, so it's excluded here rather
                # than shipped as if it were real parcel data.
                continue
            try:
                g = shape(f["geometry"])
            except Exception:
                continue
            if not prepared.contains(g.representative_point()):
                # Real spatial join, not the town allowlist alone -- a
                # feature whose TOWN matches but whose actual geometry
                # falls outside the county polygon (data entry error,
                # or a town split by the boundary) is excluded rather
                # than trusted on the town name alone.
                continue
            town_counts[town] = town_counts.get(town, 0) + 1
            geom = shape(f["geometry"])
            if simplify_deg:
                geom = geom.simplify(simplify_deg, preserve_topology=True)
            out_geom = mapping(geom)
            out_geom["coordinates"] = _round_coords(list(out_geom["coordinates"]), round_decimals) \
                if isinstance(out_geom["coordinates"], list) else out_geom["coordinates"]
            trimmed_props = {k: p.get(k) for k in keep_fields}
            matched.append({"type": "Feature", "geometry": out_geom, "properties": trimmed_props})

    print(f"  matched {len(matched)} parcels across {len(town_counts)} towns: "
          f"{dict(sorted(town_counts.items()))}", file=sys.stderr)
    return {"type": "FeatureCollection", "features": matched}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, help="static_ingestion source id, e.g. vt-vcgi-statewide-parcels")
    ap.add_argument("--county-fips", required=True, help="5-digit county FIPS, e.g. 50007")
    ap.add_argument("--towns", required=True, help="comma-separated TOWN field values to include")
    ap.add_argument("--keep-fields", required=True, help="comma-separated source property names to keep")
    ap.add_argument("--id-field", default=None,
                     help="source property name that must be non-empty for a feature to be kept "
                          "(drops attribute-empty geometry slivers); omit to keep everything")
    ap.add_argument("--out", required=True, help="output path, relative to repo root")
    ap.add_argument("--simplify-deg", type=float, default=0.0001,
                     help="shapely simplify tolerance in degrees (default ~11m at mid-latitudes)")
    ap.add_argument("--round-decimals", type=int, default=5,
                     help="coordinate rounding (default 5 = ~1.1m, matched to the default simplify tolerance)")
    ap.add_argument("--check", action="store_true",
                     help="diff against the committed --out file instead of writing it; exit 1 if stale")
    args = ap.parse_args()

    towns = {t.strip() for t in args.towns.split(",") if t.strip()}
    keep_fields = [f.strip() for f in args.keep_fields.split(",") if f.strip()]

    result = derive(args.source, args.county_fips, towns, keep_fields,
                     args.simplify_deg, args.round_decimals, args.id_field)

    out_path = ROOT / args.out
    fresh = json.dumps(result, separators=(",", ":"))

    if args.check:
        if not out_path.exists():
            print(f"FAIL: {args.out} does not exist", file=sys.stderr)
            sys.exit(1)
        committed = out_path.read_text()
        if committed != fresh:
            print(f"FAIL: {args.out} is stale -- re-run without --check to regenerate", file=sys.stderr)
            sys.exit(1)
        print(f"OK: {args.out} is current ({len(result['features'])} features)")
        return

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(fresh)
    print(f"Wrote {args.out} ({len(result['features'])} features, "
          f"{out_path.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
