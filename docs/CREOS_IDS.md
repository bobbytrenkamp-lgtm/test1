# CREOS Universal Entity IDs

This app is presented to CREOS Enterprise users as **CREOS SiteIntel** —
one of three modules (alongside CREOS Underwrite and CREOS MarketSignal)
in the CREOS commercial real estate platform. This document is a
pointer, not a new system: it exists so this repository, `test2`
(Underwrite), and `test3` (MarketSignal) converge on the same entity ID
scheme as they start sharing data, instead of each inventing one
independently.

The authoritative definition lives in the CREOS Enterprise repository:
[`test4/src/domain/ids.ts`](https://github.com/bobbytrenkamp-lgtm/test4/blob/main/src/domain/ids.ts)
and [`test4/docs/ARCHITECTURE.md`](https://github.com/bobbytrenkamp-lgtm/test4/blob/main/docs/ARCHITECTURE.md#entity-architecture-superseded-id-format--read-this).

> **Correction (Phase 4):** the table below previously showed
> `CREOS-PROP-000001`-style sequential display IDs as the *real*
> identifier. That was wrong and is now superseded in test4's own
> architecture doc — sequential counters collide across independently
> operated apps. The **real** identifier is a 26-character ULID
> (collision-safe, sortable by creation time); `CREOS-PROP-XXXXX`
> (last 5 characters of the ULID, not a running count) is only a
> human-facing display form derived from it.

## Summary

| Entity     | Real ID              | Display ID form     | Relevant to this app because...        |
| ---------- | --------------------- | -------------------- | ---------------------------------------- |
| `Property` | 26-char ULID           | `CREOS-PROP-XXXXX`   | A parcel/facility record surfaced here is the same property Underwrite models and MarketSignal contextualizes. |
| `Deal`     | 26-char ULID           | `CREOS-DEAL-XXXXX`   | Not owned by this app; referenced when a property here is sent to Underwrite. |
| `Market`   | 26-char ULID           | `CREOS-MKT-XXXXX`    | County/state geographies tracked here correspond to MarketSignal's market records. |

## Status

**Utility available, not yet used anywhere.** `js/creos-ids.js` (Phase 4)
implements the generator/validator side of this scheme — a hand-ported,
test-verified copy of test4's own spec-compliant algorithm (see that
file's header comment and `tests/test_creos_ids.mjs`, which re-checks
the same known-timestamp vectors test4 verified independently against
the ULID spec). This repository's own parcel/facility identifiers
(`facilities_master.json`, county FIPS codes, etc.) remain the sole
source of truth for everything this app does internally — nothing calls
`generateCreosUlid()` yet, no schema changed, no existing ID was
touched or replaced. The utility exists so a future SiteIntel ->
Underwrite handoff (Phase 5 of `test4/docs/INTEGRATION_ROADMAP.md`,
still not scheduled) has a ready, tested building block for tagging a
record with a real CREOS ID at that boundary.
