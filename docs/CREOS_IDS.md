# CREOS Universal Entity IDs

This app is presented to CREOS Enterprise users as **CREOS SiteIntel** —
one of three modules (alongside CREOS Underwrite and CREOS MarketSignal)
in the CREOS commercial real estate platform. This document is a
pointer, not a new system: it exists so this repository, `test2`
(Underwrite), and `test3` (MarketSignal) converge on the same entity ID
scheme as they start sharing data, instead of each inventing one
independently.

The authoritative definition lives in the CREOS Enterprise repository:
[`test4/docs/ARCHITECTURE.md`](https://github.com/bobbytrenkamp-lgtm/test4/blob/main/docs/ARCHITECTURE.md#future-entity-architecture).

## Summary

| Entity     | Future ID format     | Relevant to this app because...        |
| ---------- | --------------------- | ---------------------------------------- |
| `Property` | `CREOS-PROP-000001`   | A parcel/facility record surfaced here is the same property Underwrite models and MarketSignal contextualizes. |
| `Deal`     | `CREOS-DEAL-000001`   | Not owned by this app; referenced when a property here is sent to Underwrite. |
| `Market`   | `CREOS-MKT-XXXXX`     | County/state geographies tracked here correspond to MarketSignal's market records. |

## Status

**Not implemented.** This repository does not generate, store, or
validate these IDs today — its own parcel/facility identifiers
(`facilities_master.json`, county FIPS codes, etc.) remain the source
of truth until Phase 3 of the CREOS Integration Roadmap
(`test4/docs/INTEGRATION_ROADMAP.md`) is scheduled and reviewed. No
schema changes are made by adding this document.
