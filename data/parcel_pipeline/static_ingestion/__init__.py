"""data/parcel_pipeline/static_ingestion — the static parcel dataset ingestion pipeline.

Government agencies that don't run a queryable ArcGIS/WFS service still very
often publish parcel data — just as a downloadable Shapefile, GeoPackage, or
zipped GeoJSON on an open-data portal. js/parcel/registry.js's connectors
only know how to talk to a live service, so every one of those jurisdictions
has been invisible to this project — not because the data doesn't exist, but
because nothing here knew how to pull it in. This package is that missing
capability: download -> verify -> extract -> convert -> normalize ->
reproject -> clean -> deduplicate -> validate -> chunk -> publish, with a
provenance record at every step.

Module map:
  models.py    -- StaticSource config dataclass + the registry loader
  download.py  -- fetch with retry/backoff, ETag/Last-Modified conditional
                  requests, checksum, corruption/HTML-error-page detection
  convert.py   -- GDAL/OGR-backed format conversion + reprojection +
                  geometry validation/repair, with full accept/reject counts
  chunk.py     -- splits a converted FeatureCollection into web-sized,
                  geographically-partitioned chunk files plus an index
  pipeline.py  -- orchestrates all of the above into one deterministic run
                  and writes the manifest a human or CI job reads back
"""
