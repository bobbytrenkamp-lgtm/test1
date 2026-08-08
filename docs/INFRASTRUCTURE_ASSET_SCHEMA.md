# Infrastructure Asset Schema

## Why this exists

Every infrastructure category this project touches — substations,
transmission lines, power plants, fiber segments, water/wastewater
facilities, utility territories — was represented as its own ad-hoc dict
shape in `data/sample_layers.json`, with no shared notion of provenance or
evidence quality. That made it possible for a record to carry an implicit,
unstated confidence ("this is just what the file says") instead of an
explicit one, and gave every new data category its own chance to skip the
core distinction this platform is built around: **unknown is not zero,
missing is not false, near infrastructure does not mean capacity exists.**

`data/infrastructure_asset_schema.py` is the shared contract every new
infrastructure record is expected to satisfy. `js/infrastructure/asset-schema.js`
mirrors its enums for synchronous browser-side use (an evidence badge, an
asset-type filter).

## The base `InfrastructureAsset` shape

Every asset, regardless of type, requires:

| Field           | Meaning                                                             |
|-----------------|----------------------------------------------------------------------|
| `id`            | Stable, unique identifier                                            |
| `asset_type`    | One of the enum values below                                         |
| `name`          | Human-readable name                                                  |
| `geometry`      | GeoJSON-shaped `{type, coordinates}` (Point/LineString/Polygon/MultiPolygon) |
| `source`        | `{publisher, url, retrieved_at}` — a source without a real URL is rejected, never invented |
| `evidence_tier` | `OBSERVED` \| `MODELED` \| `UNKNOWN` — general-purpose confidence |
| `last_verified` | When this record was last confirmed against its source               |

Optional: `status` (`existing`/`planned`/`under_construction`/`retired`/`proposed`/`unknown`).

## Type extensions

| `asset_type`           | Required fields beyond the base                          |
|-------------------------|-----------------------------------------------------------|
| `substation`             | `voltage_kv`                                              |
| `transmission_line`      | `voltage_kv`                                               |
| `power_plant`            | `capacity_mw`, `fuel_type`                                 |
| `fiber_segment`          | `evidence_classification` (its own enum, see below)         |
| `water_facility`         | `facility_type` (`capacity_mgd` optional — unknown capacity is not zero capacity) |
| `wastewater_facility`    | `facility_type` (`capacity_mgd` optional)                   |
| `utility_territory`      | `utility_name`, non-empty `fips_list`                        |

Additional categories named in the national-data-foundation plan (ISO/RTO
zones, interconnection queue entries, planned generation/transmission,
retirements) are **not yet enum members**. A type is only added to
`ASSET_TYPES` together with a real `TYPE_SCHEMAS` entry — declaring a type
nothing actually validates would be worse than not declaring it.

## Fiber gets its own evidence vocabulary

Generic `OBSERVED`/`MODELED`/`UNKNOWN` is not fine-grained enough for fiber,
where the single most common and most dangerous mistake is treating **FCC
broadband availability as physical fiber infrastructure**. A `fiber_segment`
record's `evidence_classification` must be one of:

- `KNOWN_ROUTE` — a real, sourced physical route
- `APPROXIMATE_ROUTE` — a route inferred from partial evidence
- `SERVICE_AREA` — a coverage polygon, not a route
- `PROVIDER_PRESENCE` — a provider is known to operate in the area, no route
- `BROADBAND_AVAILABILITY` — FCC-style availability data — explicitly **not**
  a known route
- `UNKNOWN`

Setting the base `evidence_tier` alone is not sufficient for a fiber
record — `evidence_classification` is a separate required field, so a
record can never borrow the generic tier in place of the fiber-specific one.

## What this PR does *not* do

It does not migrate `data/sample_layers.json`'s existing substation/
transmission/utility-territory/fiber records to comply. Those records
predate this schema and do not carry a real per-record `source`/
`evidence_tier`/`last_verified` — inventing one now would itself be
manufactured coverage. `data/validate_infrastructure_assets.py` instead
generates `data/infrastructure_asset_compliance.json`, a read-only
compliance report against the current data. **0% compliance today is the
honest, expected state** — every dataset predates the schema. The report
exists so the gap is documented and trackable, not hidden; future
infrastructure ingestion (grid intelligence, fiber, water) is expected to
satisfy this schema for real, with a genuine per-record source.

## Keeping the Python and JS copies in sync

`data/infrastructure_asset_schema.py` is canonical.
`tests/test_infrastructure_asset_schema_sync.mjs` shells out to
`python3 -m data.infrastructure_asset_schema --dump-enums` and diffs the
result against `js/infrastructure/asset-schema.js`'s constants, so the two
can never silently drift apart — the same discipline
`data/parcel_pipeline/check_registry_integrity.mjs` already applies to the
parcel connector-type enum.
