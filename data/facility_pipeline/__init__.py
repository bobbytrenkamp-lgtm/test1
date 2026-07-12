"""
Facility Pipeline — canonical US data center dataset.

Ingests facility records from multiple authoritative sources, deduplicates
them, scores confidence, and maintains a version-tracked master dataset.

Data flow:
  facility_sources.json
       │
       ▼
  run_facility_pipeline.py
    ├── adapters (OSM, company pages, aggregators, discovery, news)
    ├── normalize.py     → normalise addresses, coordinates, names
    ├── deduplication.py → geo / address / name matching
    ├── merge.py         → confidence-based field merge
    ├── sync.py          → incremental state tracking
    └── reporting.py     → changelog I/O

Outputs:
  facilities_master.json    — confirmed canonical records
  facilities_candidates.json — pending human review (news / low-confidence)
  facilities_changelog.json  — append-only audit trail
  facilities_sync_state.json — per-source last-sync timestamps
  facilities_version_history/{timestamp}.json — periodic snapshots
"""
