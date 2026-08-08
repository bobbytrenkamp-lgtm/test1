"""data/national_data_ingestion -- read-only candidate-source investigation
for national (non-parcel) datasets: grid infrastructure, water/wastewater,
environmental/development layers, and anything else Phase 5-8 of the
national-data-foundation plan needs.

This does NOT duplicate data/parcel_pipeline/static_ingestion's download/
convert/chunk pipeline -- that pipeline is not actually parcel-specific in
its logic (only in its current package location and the StaticSource
dataclass's field naming), so a verified national source is registered and
ingested through THAT pipeline directly, reusing it as-is. This package
holds only the piece that pipeline doesn't have: a safe, side-effect-free
way to investigate a candidate URL (found via research, not yet verified)
before it is trusted enough to register anywhere.

Module map:
  probe_source.py  -- downloads a candidate URL to a temp path and inspects
                       it with ogrinfo (real fields, geometry type, feature
                       count), printing a JSON report. Never writes to the
                       repository -- registration is always a separate,
                       deliberate step after a human (or an agent with real
                       network access, via GitHub Actions) reviews the
                       result.
"""
