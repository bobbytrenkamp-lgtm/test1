"""data/parcel_pipeline/static_ingestion/chunk.py

Splits one converted FeatureCollection into multiple web-sized,
geographically-local chunk files plus an index describing each chunk's
bounding box -- so a browser can load only the chunks that intersect its
current viewport instead of one giant file for an entire state.

STRATEGY: Z-ORDER (MORTON) SORT, THEN SEQUENTIAL PACKING
----------------------------------------------------------
A full quadtree/R-tree partition would give tighter bounding boxes, but a
Z-order sort is the simplest approach that is still genuinely spatially
local (features near each other in 2D space end up near each other in the
sorted sequence), doesn't require a spatial-indexing dependency, and is easy
to verify: shuffle the features, re-sort, get the same chunks back.

Chunks are then packed sequentially along that sorted order, closing a chunk
once it would exceed EITHER the feature-count cap or the byte-size cap --
a chunk of 500 parcels with enormous ring counts (a complex coastal county
boundary artifact) must not produce a multi-MB "small" chunk just because it
stayed under the feature-count limit.

This is deliberately NOT vector tiles (no .mbtiles/.pbf pyramid). Vector
tiles are the more scalable long-term answer for a true national dataset,
but they need an additional toolchain (tippecanoe or equivalent) this PR
does not introduce; simple geographic chunking is enough to stop shipping
one giant file per state today, and the chunk index format below is designed
so a later switch to real tiles would not have to change how the frontend
discovers what to load -- it would just replace what a "chunk" is.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


DEFAULT_MAX_FEATURES_PER_CHUNK = 500
DEFAULT_MAX_BYTES_PER_CHUNK = 1_500_000   # keeps a chunk comfortably under typical mobile fetch budgets


@dataclass
class ChunkResult:
    ok: bool
    chunk_files: list[str] = field(default_factory=list)
    index_path: Optional[str] = None
    total_features: int = 0
    chunk_count: int = 0
    overall_bbox: Optional[list] = None
    why: Optional[str] = None


def _feature_bbox(geom: dict) -> Optional[tuple]:
    coords_flat = []

    def walk(c):
        if not c:
            return
        if isinstance(c[0], (int, float)):
            coords_flat.append(c)
        else:
            for x in c:
                walk(x)

    walk(geom.get("coordinates"))
    if not coords_flat:
        return None
    lons = [c[0] for c in coords_flat]
    lats = [c[1] for c in coords_flat]
    return (min(lons), min(lats), max(lons), max(lats))


def _centroid(bbox: tuple) -> tuple:
    return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


def _morton_key(lon: float, lat: float, bits: int = 16) -> int:
    """Interleaves normalized lon/lat bits into one Z-order sort key. Pure
    function of the coordinates -- no external state, no randomness, so
    the same feature set always sorts identically regardless of its
    starting order (asserted by a test: shuffled input, same output)."""
    def norm(v, lo, hi):
        v = max(lo, min(hi, v))
        return int(((v - lo) / (hi - lo)) * ((1 << bits) - 1))

    x = norm(lon, -180.0, 180.0)
    y = norm(lat, -90.0, 90.0)

    def spread(v):
        result = 0
        for i in range(bits):
            result |= ((v >> i) & 1) << (2 * i)
        return result

    return spread(x) | (spread(y) << 1)


def chunk_geojson(
    input_path: str,
    output_dir: str,
    *,
    dataset_id: str,
    max_features_per_chunk: int = DEFAULT_MAX_FEATURES_PER_CHUNK,
    max_bytes_per_chunk: int = DEFAULT_MAX_BYTES_PER_CHUNK,
) -> ChunkResult:
    fc = json.loads(Path(input_path).read_text())
    features = fc.get("features", [])
    if not features:
        return ChunkResult(ok=True, chunk_files=[], chunk_count=0, total_features=0, overall_bbox=None)

    keyed = []
    overall = None
    for feat in features:
        bbox = _feature_bbox(feat.get("geometry") or {})
        if not bbox:
            continue
        cx, cy = _centroid(bbox)
        keyed.append((_morton_key(cx, cy), feat, bbox))
        overall = bbox if overall is None else (
            min(overall[0], bbox[0]), min(overall[1], bbox[1]),
            max(overall[2], bbox[2]), max(overall[3], bbox[3]),
        )

    keyed.sort(key=lambda t: t[0])

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    chunks = []
    current: list = []
    current_bbox = None
    current_bytes = 2   # "[]" baseline

    def flush():
        nonlocal current, current_bbox, current_bytes
        if not current:
            return
        idx = len(chunks)
        name = f"{dataset_id}_chunk_{idx:04d}.geojson"
        path = Path(output_dir) / name
        payload = {"type": "FeatureCollection", "features": [f for _, f, _ in current]}
        path.write_text(json.dumps(payload))
        chunks.append({
            "file": name,
            "feature_count": len(current),
            "bbox": list(current_bbox),
        })
        current = []
        current_bbox = None
        current_bytes = 2

    for key, feat, bbox in keyed:
        # Rough per-feature byte cost via its own serialized size, not the
        # whole running payload -- cheap, and the cap is a budget rather than
        # a byte-exact guarantee, consistent with it being a soft mobile-fetch
        # target rather than a hard protocol limit.
        feat_bytes = len(json.dumps(feat))
        would_exceed_bytes = current and (current_bytes + feat_bytes) > max_bytes_per_chunk
        would_exceed_count = len(current) >= max_features_per_chunk

        if current and (would_exceed_bytes or would_exceed_count):
            flush()

        current.append((key, feat, bbox))
        current_bytes += feat_bytes
        current_bbox = bbox if current_bbox is None else (
            min(current_bbox[0], bbox[0]), min(current_bbox[1], bbox[1]),
            max(current_bbox[2], bbox[2]), max(current_bbox[3], bbox[3]),
        )

    flush()

    index = {
        "dataset_id": dataset_id,
        "chunk_count": len(chunks),
        "total_features": sum(c["feature_count"] for c in chunks),
        "overall_bbox": list(overall) if overall else None,
        "chunks": chunks,
        "strategy": "z-order-sequential-pack",
    }
    index_path = Path(output_dir) / f"{dataset_id}_index.json"
    index_path.write_text(json.dumps(index, indent=2))

    return ChunkResult(
        ok=True,
        chunk_files=[c["file"] for c in chunks],
        index_path=str(index_path),
        total_features=index["total_features"],
        chunk_count=len(chunks),
        overall_bbox=index["overall_bbox"],
    )
