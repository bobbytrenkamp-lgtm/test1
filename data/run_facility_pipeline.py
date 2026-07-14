#!/usr/bin/env python3
"""Facility pipeline runner — incremental update from all configured sources.

Usage:
    python data/run_facility_pipeline.py [--source SOURCE_ID] [--full]

Options:
    --source SOURCE_ID   Only run this one source (default: all active fetchable)
    --full               Force full pull (ignore last-sync timestamps)
    --dry-run            Print what would happen without writing output files
"""
from __future__ import annotations

import argparse
import os
import sys
import traceback
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.facility_pipeline.deduplication import (
    find_candidates,
    iter_auto_merge,
    iter_review_required,
)
from data.facility_pipeline.merge import merge_records
from data.facility_pipeline.models import (
    FacilityChangeLog,
    FacilityRecord,
    load_json,
)
from data.facility_pipeline.normalize import normalize_record_fields
from data.facility_pipeline.reporting import (
    MASTER_PATH,
    append_changelogs,
    load_candidates,
    load_master,
    run_summary,
    save_candidates,
    save_master,
    snapshot_master,
)
from data.facility_pipeline.source_registry import FacilitySourceRegistry
from data.facility_pipeline.sync import SyncState

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCES_PATH = os.path.join(DATA_DIR, "facility_sources.json")

# Adapter registry — maps adapter name → class
_ADAPTER_MAP: dict[str, type] = {}


def _load_adapter(name: str):
    global _ADAPTER_MAP
    if not _ADAPTER_MAP:
        from data.facility_pipeline.adapters.existing_datasets import ExistingDatasetsAdapter
        from data.facility_pipeline.adapters.osm import OSMAdapter
        from data.facility_pipeline.adapters.datacentermap import DataCenterMapAdapter
        from data.facility_pipeline.adapters.cloudscene import CloudsceneAdapter
        from data.facility_pipeline.adapters.equinix import EquinixAdapter
        from data.facility_pipeline.adapters.digital_realty import DigitalRealtyAdapter
        from data.facility_pipeline.adapters.ferc_queue import FERCQueueAdapter
        from data.facility_pipeline.adapters.sec_edgar import SECEdgarAdapter
        _ADAPTER_MAP = {
            "existing_datasets": ExistingDatasetsAdapter,
            "osm": OSMAdapter,
            "datacentermap": DataCenterMapAdapter,
            "cloudscene": CloudsceneAdapter,
            "equinix": EquinixAdapter,
            "digital_realty": DigitalRealtyAdapter,
            "ferc_queue": FERCQueueAdapter,
            "sec_edgar": SECEdgarAdapter,
        }
    cls = _ADAPTER_MAP.get(name)
    if cls is None:
        raise ValueError(f"Unknown adapter: {name!r}. Available: {list(_ADAPTER_MAP)}")
    return cls


def _records_by_id(records: list[FacilityRecord]) -> dict[str, FacilityRecord]:
    return {r.facility_id: r for r in records}


def run(
    source_filter: str | None = None,
    full: bool = False,
    dry_run: bool = False,
) -> dict:
    run_id = uuid.uuid4().hex[:12]
    print(f"[run:{run_id}] Starting facility pipeline run")

    registry = FacilitySourceRegistry(SOURCES_PATH)
    sync = SyncState()

    # Load existing master dataset
    master_raw = load_master()
    master: dict[str, FacilityRecord] = {}
    for d in master_raw:
        r = FacilityRecord.from_dict(d)
        master[r.facility_id] = r
    print(f"[run:{run_id}] Loaded {len(master)} existing master records")

    # Load existing candidates
    cand_raw = load_candidates()
    candidates_pool: list[FacilityRecord] = [FacilityRecord.from_dict(d) for d in cand_raw]

    added = updated = merged = candidates_added = errors = 0
    changelog: list[FacilityChangeLog] = []

    sources = list(registry.iter_fetchable())
    if source_filter:
        sources = [s for s in sources if s.id == source_filter]
        if not sources:
            print(f"[run:{run_id}] ERROR: source '{source_filter}' not found or not fetchable")
            sys.exit(1)

    for source in sources:
        adapter_cls = _load_adapter(source.adapter)
        adapter = adapter_cls(source)

        since = None if full else sync.last_synced(source.id)
        print(f"[run:{run_id}] Fetching {source.id!r} (since={since or 'full'})")

        try:
            incoming: list[FacilityRecord] = []
            for record in adapter.fetch(since=since):
                normalize_record_fields(record)
                incoming.append(record)
            print(f"[run:{run_id}]   fetched {len(incoming)} records from {source.id}")
        except Exception as e:
            print(f"[run:{run_id}]   ERROR fetching {source.id}: {e}")
            traceback.print_exc()
            sync.mark_failed(source.id, str(e))
            errors += 1
            changelog.append(FacilityChangeLog(
                change_type="verification_failure",
                source_id=source.id,
                summary=str(e),
                pipeline_run_id=run_id,
            ))
            continue

        # Dedup incoming against master
        existing_list = list(master.values())
        merge_candidates = find_candidates(incoming, existing=existing_list)

        # Identify which incoming records matched existing ones
        matched_incoming_ids: set[str] = set()
        matched_existing_ids: dict[str, str] = {}  # incoming_id → existing_id

        for mc in iter_auto_merge(merge_candidates):
            # Determine which is incoming vs existing
            if mc.record_a_id in master:
                ex_id, in_id = mc.record_a_id, mc.record_b_id
            elif mc.record_b_id in master:
                ex_id, in_id = mc.record_b_id, mc.record_a_id
            else:
                continue

            matched_incoming_ids.add(in_id)
            matched_existing_ids[in_id] = ex_id

        for mc in iter_review_required(merge_candidates):
            # Flag for human review — add to candidates pool, don't auto-merge
            if mc.record_a_id in master:
                in_id = mc.record_b_id
            elif mc.record_b_id in master:
                in_id = mc.record_a_id
            else:
                continue
            matched_incoming_ids.add(in_id)

        # Process each incoming record
        for record in incoming:
            is_candidate = source.tier >= 5  # news sources → always candidate

            if record.facility_id in matched_existing_ids:
                # Merge into existing master record
                ex_id = matched_existing_ids[record.facility_id]
                existing = master[ex_id]
                old_conf = existing.confidence_score
                from data.facility_pipeline.merge import merge_into
                changed = merge_into(existing, record, source.confidence)
                if changed and not dry_run:
                    updated += 1
                    changelog.append(FacilityChangeLog(
                        change_type="updated",
                        facility_id=ex_id,
                        source_id=source.id,
                        summary=f"Fields updated from {source.id}: {', '.join(changed[:5])}",
                        field_changes={f: {"from": None, "to": None} for f in changed},
                        pipeline_run_id=run_id,
                    ))
            elif record.facility_id in matched_incoming_ids:
                # Flagged for review — add to candidates
                record.is_candidate = True
                if not dry_run:
                    candidates_pool.append(record)
                    candidates_added += 1
                    changelog.append(FacilityChangeLog(
                        change_type="candidate_added",
                        facility_id=record.facility_id,
                        source_id=source.id,
                        summary=f"Needs review: matched {source.id} record",
                        pipeline_run_id=run_id,
                    ))
            elif is_candidate:
                record.is_candidate = True
                if not dry_run:
                    candidates_pool.append(record)
                    candidates_added += 1
                    changelog.append(FacilityChangeLog(
                        change_type="candidate_added",
                        facility_id=record.facility_id,
                        source_id=source.id,
                        summary=f"News-tier candidate from {source.id}",
                        pipeline_run_id=run_id,
                    ))
            else:
                # New record — add to master
                if not dry_run:
                    master[record.facility_id] = record
                    added += 1
                    changelog.append(FacilityChangeLog(
                        change_type="added",
                        facility_id=record.facility_id,
                        source_id=source.id,
                        summary=f"New facility from {source.id}: {record.name or record.operator}",
                        pipeline_run_id=run_id,
                    ))

        if not dry_run:
            sync.update(source.id)

    # Persist results
    if not dry_run:
        master_list = list(master.values())
        save_master(master_list)
        save_candidates(candidates_pool)
        append_changelogs(changelog)
        snap = snapshot_master()
        print(f"[run:{run_id}] Snapshot: {snap}")

    summary = run_summary(added, updated, merged, candidates_added, errors, run_id)
    print(
        f"[run:{run_id}] Done — "
        f"added={added} updated={updated} merged={merged} "
        f"candidates={candidates_added} errors={errors}"
    )
    if dry_run:
        print("[run:{run_id}] DRY RUN — no files written")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the US facility pipeline")
    parser.add_argument("--source", help="Only process this source ID")
    parser.add_argument(
        "--full", action="store_true", help="Force full pull (ignore last-sync)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print plan without writing files"
    )
    args = parser.parse_args()
    run(source_filter=args.source, full=args.full, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
