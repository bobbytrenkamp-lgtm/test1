#!/usr/bin/env python3
"""Review the facility pipeline's candidates pool and safely promote the
records that are genuinely distinct new facilities, not duplicates.

Why this exists: a normal pipeline run only auto-merges an incoming record
into master when >=2 of the three dedup signals (geo/address/name) agree
(see facility_pipeline/deduplication.py). A record that matches an existing
master record on exactly ONE signal is ambiguous and gets parked in
facilities_candidates.json for review, rather than guessed at. As of
2026-08-09 that pool held 2,112 records accumulated across prior real
pipeline runs -- most never reviewed. This script performs that review
mechanically, using the same dedup signals the pipeline already trusts,
rather than leaving a large batch of already-fetched real data sitting
unused (or promoting it blind).

Promotion rule (conservative by design -- see NO-FUZZY-JOINS precedent in
the parcel pipeline for why): a candidate is promoted only when it has real
coordinates AND, across every master record it weakly matches, the ONLY
signal that ever fired is name_match (operator+city text similarity). If
geo_match or address_match fires against ANY master record, the candidate
stays a candidate -- that's exactly the ambiguous "might be the same site,
imprecisely described" case dedup logic can't resolve on its own. Matching
only on operator+city (e.g. "Equinix" "Ashburn") is expected and harmless
when an operator runs many distinct buildings in the same city (true here
for every major colocation operator) -- it says nothing about whether two
*specific* buildings are the same site, which is what geo/address signals
actually test.

Also drops promotion candidates that are near-duplicates of EACH OTHER
(the same dedup logic applied within the promoted batch) so two records of
the same real building from the same source don't both land in master.

Usage:
    python data/review_facility_candidates.py [--source SOURCE_ID] [--dry-run]
"""
from __future__ import annotations

import argparse
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.facility_pipeline.deduplication import build_merge_candidate, find_candidates, iter_auto_merge
from data.facility_pipeline.models import FacilityChangeLog, FacilityRecord
from data.facility_pipeline.reporting import (
    append_changelogs,
    load_candidates,
    load_master,
    save_candidates,
    save_master,
    snapshot_master,
)

# Candidates sourced from the seed dataset itself are pipeline
# self-comparison noise from --full re-runs (existing_data_centers compared
# against the master pool it originally seeded), not new real-world data.
# Never eligible for promotion.
_EXCLUDED_SOURCES = {"existing_data_centers"}

# The OSM adapter's Overpass query box is (24,-125,50,-66) -- see
# facility_pipeline/adapters/osm.py. That box is NOT US-only: it also
# covers a wide swath of southern Canada (confirmed by hand -- real
# candidates in this pool include Toronto/Markham/Brampton ON, Montreal/
# Gatineau/Pointe-Claire/Baie-D'Urfe QC, Vancouver/Burnaby BC, and Winnipeg
# MB, all carrying country="US" even though that field is never actually
# verified for OSM-sourced records). county_fips is also never populated by
# this adapter (checked: 0/352 candidates had it), so it can't be used as a
# US/non-US signal either. The one reliable signal available is a real
# 2-letter US state abbreviation -- when the OSM tag data included a parsed
# state, it's consistently a real US state (spot-checked). Records with no
# parsed state are NOT assumed to be foreign, but they're not promoted
# either: there's no cheap way from data already on hand to tell "real US
# facility that just didn't parse a state" apart from "Canadian facility
# incorrectly in this pool", so both stay candidates rather than guessing.
_US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
    "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
    "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
    "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
    "WI", "WY", "DC",
}


def classify(candidate: FacilityRecord, master: list[FacilityRecord]) -> str:
    """Return 'promotable', 'ambiguous', 'no_geo', or 'no_us_state' for one candidate."""
    if candidate.latitude is None or candidate.longitude is None:
        return "no_geo"
    if (candidate.state_abbr or "").upper() not in _US_STATES:
        return "no_us_state"

    only_name_ever = False
    for m in master:
        if m.facility_id == candidate.facility_id:
            continue
        mc = build_merge_candidate(candidate, m)
        if mc.match_score == 0:
            continue
        if mc.geo_match or mc.address_match:
            return "ambiguous"
        if mc.name_match:
            only_name_ever = True

    return "promotable" if only_name_ever else "ambiguous"


def run(source_filter: str | None, dry_run: bool) -> dict:
    run_id = uuid.uuid4().hex[:12]

    master_raw = load_master()
    master = [FacilityRecord.from_dict(d) for d in master_raw]

    cand_raw = load_candidates()
    candidates = [FacilityRecord.from_dict(d) for d in cand_raw]

    eligible = [
        c for c in candidates
        if c.primary_source not in _EXCLUDED_SOURCES
        and (source_filter is None or c.primary_source == source_filter)
    ]
    print(f"[review:{run_id}] {len(candidates)} total candidates, "
          f"{len(eligible)} eligible for review (excludes seed self-noise"
          f"{f', filtered to source={source_filter}' if source_filter else ''})")

    promotable: list[FacilityRecord] = []
    ambiguous_count = 0
    no_geo_count = 0
    no_us_state_count = 0
    for c in eligible:
        verdict = classify(c, master)
        if verdict == "promotable":
            promotable.append(c)
        elif verdict == "no_geo":
            no_geo_count += 1
        elif verdict == "no_us_state":
            no_us_state_count += 1
        else:
            ambiguous_count += 1

    print(f"[review:{run_id}] classified: {len(promotable)} promotable, "
          f"{ambiguous_count} still ambiguous (geo/address signal fired), "
          f"{no_geo_count} skipped (no coordinates to verify), "
          f"{no_us_state_count} skipped (no verified US state -- includes "
          f"real Canadian facilities the OSM adapter's bounding box "
          f"incorrectly swept in, see module docstring)")

    # Drop near-duplicates of each other within the promotable batch --
    # keep the first, push the rest back to the candidates pool flagged as
    # a same-batch duplicate rather than silently promoting both.
    internal_dupes = find_candidates(promotable)
    dropped_ids: set[str] = set()
    for mc in iter_auto_merge(internal_dupes):
        # Drop whichever id we haven't already decided to keep/drop, so a
        # chain of 3+ mutual duplicates collapses to one survivor instead
        # of alternating keep/drop pair by pair.
        if mc.record_a_id in dropped_ids or mc.record_b_id in dropped_ids:
            continue
        dropped_ids.add(mc.record_b_id)

    final_promote = [c for c in promotable if c.facility_id not in dropped_ids]
    print(f"[review:{run_id}] {len(dropped_ids)} dropped as same-batch duplicates "
          f"of another promoted record; {len(final_promote)} will actually be promoted")

    changelog: list[FacilityChangeLog] = []
    remaining_candidates: list[FacilityRecord] = []
    promoted_ids = {c.facility_id for c in final_promote}

    for c in candidates:
        if c.facility_id in promoted_ids:
            continue
        remaining_candidates.append(c)

    if not dry_run:
        for c in final_promote:
            c.is_candidate = False
            master.append(c)
            changelog.append(FacilityChangeLog(
                change_type="added",
                facility_id=c.facility_id,
                source_id=c.primary_source,
                summary=(
                    f"Promoted from candidate review: {c.name or c.operator} "
                    f"in {c.city or '?'}, {c.state_abbr or '?'} -- matched an "
                    f"existing master record on operator+city text only, "
                    f"never on geo/address proximity"
                ),
                pipeline_run_id=run_id,
            ))

        save_master([r.to_dict() for r in master])
        save_candidates([r.to_dict() for r in remaining_candidates])
        append_changelogs(changelog)
        snap = snapshot_master()
        print(f"[review:{run_id}] Snapshot: {snap}")
    else:
        print(f"[review:{run_id}] DRY RUN -- no files written")

    return {
        "promoted": len(final_promote),
        "still_ambiguous": ambiguous_count,
        "no_geo": no_geo_count,
        "no_us_state": no_us_state_count,
        "dropped_internal_dupes": len(dropped_ids),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Review and promote safe facility candidates")
    parser.add_argument("--source", help="Only review candidates from this source ID")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without writing files")
    args = parser.parse_args()
    summary = run(source_filter=args.source, dry_run=args.dry_run)
    print(f"Done: {summary}")


if __name__ == "__main__":
    main()
