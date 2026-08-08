# Multi-Source Parcel Enrichment — Architecture

*Companion to `docs/PARCEL_SYSTEM_ARCHITECTURE.md`. Read that first for the
single-source parcel system this builds on.*

---

## 1. Why this exists

Every parcel connector fetches exactly one service per jurisdiction, so a
parcel record is only ever as rich as whatever that one service publishes.
Frequently that is geometry and nothing else.

Loudoun County VA — the largest data center market on earth — is the standing
example. Its parcel layer publishes plat and subdivision metadata only, so 17
of its 22 canonical fields sit in `notProvidedBySource`. `registry.js`'s own
comment on that entry has named the fix for months:

> Populating them needs Loudoun's separate CAMA/assessment service joined in,
> which this one-service-per-jurisdiction connector cannot currently do.

This is that capability, built once and generically.

**The split of responsibility is the whole design:** the registry *describes*
each jurisdiction's secondary sources and the exact identifier they join on;
`js/parcel/enrichment.js` *executes* those descriptions. There is no
county-specific fetch logic anywhere in `js/`, and adding an enriched
jurisdiction is a configuration change, not a code change.

---

## 2. Current architecture (as of this PR)

### 2.1 Parcel loading flow

```
map.js  setLayerVisible('parcels', …)
  → PARCEL.onLayerToggle(id, visible, fips)      js/parcel/index.js
  → PARCEL_RENDERER.setActive(fips, hasData)     js/parcel/renderer.js
      → PARCEL_REGISTRY.get(fips)                js/parcel/registry.js
      → _makeConnector(config)                   arcgis | geojson | wfs
  → on map moveend/zoomend → _scheduleFetch()
      → AbortController cancels any in-flight request
      → connector.fetchViewport(bounds, signal)
      → connector._normalize()  source columns → canonical field ids
  → GeoJSON FeatureCollection → Leaflet pane 'parcels'
```

`_normalize()` is where a raw service record becomes a canonical parcel: it
reverses the entry's `fieldMap`, stamps `county_fips` and `_source`, and
guarantees `parcel_id`. **Enrichment attaches immediately after this step** —
it consumes canonical field ids, never raw source columns.

### 2.2 Search flow

`PARCEL_SEARCH.setContext(visible, fips)` tracks whether the layer is live;
lookups go through the same connector via `searchByQuery()` / `fetchById()`.

### 2.3 Zoning flow

`window.ZONING.loadByFips(fips)` / `getCachedByFips(fips)` / `hasCoverage(fips)`,
loaded independently of parcels and joined at render time by FIPS + zoning code.

### 2.4 Feasibility flow

`PARCEL_FEASIBILITY.assess(props, fips)` reads cached zoning standards and
computes `_buildableEnvelope()` — currently *area arithmetic only*: lot
coverage × area, floors from height. It does not yet subtract mapped
constraints geometrically (that is the conceptual-buildable-envelope PR).

### 2.5 Existing data sources

| Source | Where | Notes |
|---|---|---|
| Parcel services | `js/parcel/registry.js` | 58 production jurisdictions |
| Source catalog | `data/parcel_source_catalog.json` | 167 entries: production, candidate, blocked, rejected |
| Shared services | catalog `shared_services` key | NJ MOD-IV Composite, MD ParcelBoundaries |
| Facilities | `data/facilities_index.json` | data-center facilities, county FIPS tagged |
| Zoning | `data/zoning/*` | district standards, per pilot jurisdiction |
| Policy / risk / economy | `data/political_risk.json`, `data/economy/*` | county + state level |

### 2.6 Generated-data pipelines

`data/parcel_pipeline/` (discovery → draft → promotion), `facility_pipeline/`,
`policy_pipeline/`, `economy/`. All run in GitHub Actions; none require paid
services.

---

## 3. The enrichment engine

### 3.1 Module layout

| File | Responsibility |
|---|---|
| `js/parcel/provenance.js` | Confidence vocabulary; per-field source records; derivation metadata |
| `js/parcel/enrichment.js` | Join execution, conflict resolution, caching, cancellation, per-source health |

`enrichment.js` performs **no network I/O**. Source types register an
*executor* via `registerExecutor(type, fn)`. That keeps the entire join /
conflict / provenance path testable offline with fake executors — including
failure modes a live service produces only intermittently.

### 3.2 Configuration contract

An `enrichment` block on a `registry.js` jurisdiction entry:

```js
enrichment: {
  sources: [
    {
      id:         'loudoun-cama',            // required, unique within the jurisdiction
      label:      'Loudoun County CAMA',     // shown in the UI / provenance strings
      type:       'arcgis-table',            // must have a registered executor
      url:        'https://…/MapServer/5',   // consumed by the executor, not by the engine

      baseField:  'parcel_id',               // CANONICAL field on the parcel to join FROM
      joinField:  'PARCELID',                // identifier column in the secondary source
      joinNormalize: { upper: true, stripNonAlnum: true },

      fieldMap: {                            // canonical field ← source column
        owner:          'OWNER_NAME',
        assessed_value: 'TOTVAL',
      },

      confidence: 'official-joined',         // default when omitted
      priority:   10,                        // lower wins ties; default 100
      override:   false,                     // may this source REPLACE an existing value?
      cacheTtlMs: 1800000,                   // default 30 min
    },
  ],
}
```

Validated by `PARCEL_ENRICHMENT.validateConfig()`, which is also called from
`data/parcel_pipeline/check_registry_integrity.mjs` — so a bad join config
fails CI rather than shipping. The integrity check additionally verifies that
`baseField` is a field the jurisdiction's own `fieldMap` actually populates
(otherwise the join key would always be empty).

### 3.3 Rules the engine enforces

**Exact joins only.** Records match on a shared government identifier,
compared exactly after the declared normalization. Normalization is opt-in per
source (`trim → upper → stripNonAlnum → padStart`, in that fixed order) so
`0123-45-6789` can match `0123456789` without making genuinely different
parcels compare equal.

`owner`, `owner_mailing`, `address`, `legal_desc`, and `subdivision` are
**rejected as join keys outright**. Two parcels owned by "SMITH JOHN" are not
the same parcel, and a plausible-looking address match is how a system
silently attributes one property's assessment to another. This is a hard
config error, not a warning — there is no correct way to use them.

**A secondary failure never breaks geometry.** Every source executes in its
own `try`/`catch`. A dead CAMA service degrades the panel to the fields it
already had; it never blanks the map. Health is reported per source
(`ok`, `error`, `unsupported`, `no-keys`, `joined-none`, `config-error`) and
rolled up by `summarizeHealth()` — any source failing makes the record
`degraded`, because a panel showing ownership but silently missing valuation
is not "healthy".

**A wrong join key is loud.** A source that answers cleanly but matches zero
of N keys reports `joined-none`, not `ok`. Silent success with nothing merged
is the signature of a wrong `joinField`, and the bug most worth catching.

**Nothing is overwritten silently.** Default precedence:

1. An empty field is filled by whichever configured source reaches it first
   (deterministically — by `priority`, then declaration order, *never* by
   which server answered fastest).
2. A field that already has a value is **kept**. A secondary source may only
   replace it by declaring `override: true` *and* being strictly more direct
   on the confidence ordering. Since base values are treated as
   `direct-official` and nothing outranks that, in practice the geometry layer
   stays authoritative over what it does publish.
3. Every rejected competing value is recorded in `result.conflicts` with the
   reason — surfaced, never discarded.

**Missing is not zero.** `null`, `undefined`, and `''` from a secondary source
mean "this source has nothing to say": never merged, never counted as
provided, never overwriting. `0` and `false` *are* values (a tax-exempt parcel
genuinely assessed at 0) and merge normally.

### 3.4 Provenance

Every merged value carries a record under `props._provenance[fieldId]`:

```js
{ sourceId, sourceLabel, confidence, sourceField, fetchedAt, sourceUpdatedAt }
```

`sourceField` is deliberately retained: "assessed_value came from TOTVAL on
loudoun-cama" instantly distinguishes a bad field mapping from a bad join,
which the value alone never does.

Confidence tiers, most to least direct:

| id | Meaning |
|---|---|
| `direct-official` | Read directly from the authoritative publisher |
| `official-joined` | Official table, matched on an exact shared identifier |
| `official-derived` | Computed by this app from official values (records `derivedFrom`) |
| `third-party-mirror` | Non-government republication |
| `inferred` | Estimated, not published by any source |
| `unknown` | No provenance recorded |

`rank` is an **ordering, not a score**. It is never summed, averaged, or shown
to users. The `direct-official` / `official-joined` distinction is the one
that matters most in practice: both come from the government, but a joined
value arrived through a key match *this application performed*, so a bad join
key produces confidently-wrong data — which is exactly why joined values rank
below direct ones.

`PARCEL_PROVENANCE.derived()` refuses to label a computed value
`official-derived` unless it is given its input list; with no stated inputs it
records `inferred` instead. An unexplained derived number is the failure mode
this module exists to prevent.

### 3.5 Caching and cancellation

Cache is keyed per `(sourceId, normalized join key)` rather than per request,
so panning back over already-seen parcels costs nothing even though the
viewport query differs. Bounded (5,000 entries, LRU-ish) and TTL'd (default 30
min). A key that genuinely has *no* record is cached too — otherwise every pan
re-asks the server about the same unmatched parcels.

An `AbortSignal` is checked before each source and after each fetch. An
aborted enrichment returns the base features untouched and reports
`aborted: true`.

---

## 4. Where the remaining planned features integrate

| Feature | Integration point |
|---|---|
| ArcGIS non-spatial table joins | `registerExecutor('arcgis-table', …)` — no engine change |
| Static dataset ingestion | New executor + generated artifacts under `data/` |
| Coverage / quality analytics | Reads `fieldMap` + `notProvidedBySource` + enrichment config from the registry |
| Infrastructure proximity | New module; consumes parcel geometry post-enrichment |
| Environmental constraints | New module; same entry point as proximity |
| Buildable envelope | Upgrades `feasibility.js::_buildableEnvelope` to subtract constraint geometry |
| Site suitability score | Consumes enrichment + proximity + constraints; records `derivedFrom` per component |
| Sales history | Canonical `sales_history` array, populated by an enrichment source |

---

## 5. Testing

`tests/test_parcel_enrichment.mjs` (89 assertions) covers exact-join
validation, the refusal to join on owner/address, deterministic conflict
resolution, per-source failure isolation, cache hit/miss/expiry, cancellation,
missing-vs-zero, multi-feature shared keys, and keyless parcels.

Wired into `tests/run_all.sh`. `check_registry_integrity.mjs` validates every
enrichment block in CI using the same validator the runtime uses, rather than a
second implementation that could drift.

---

## 6. The `arcgis-table` executor

`js/parcel/enrichment-arcgis-table.js` registers the first real executor. It
unlocks the split geometry/CAMA architecture the Virginia data center counties
use: the parcel *boundary* service carries polygons and plat metadata, while
ownership, valuation, land use, and building characteristics live in a
separate non-spatial table on the same or a sibling ArcGIS server. Prince
William's "Parcel CAMA Public" layer and Fairfax's Tax Administration Real
Estate services are the canonical cases.

An "ArcGIS table" here is any queryable layer fetched with
`returnGeometry=false` — joining against a second *feature* layer by attribute
works identically, and is often how a county actually publishes assessment
data.

### Additional per-source options

| Option | Default | Purpose |
|---|---|---|
| `url` | required | The layer URL; `/query` is appended |
| `numericJoin` | `false` | Emit unquoted numbers in `IN (…)` |
| `batchSize` | 100 | Keys per request |
| `resultRecordCount` | 1000 | ArcGIS page size |
| `sourceUpdatedAt` | `null` | Publisher's declared vintage, if known |

`numericJoin` matters more than it looks. Quoting a value against an integer
column makes some ArcGIS/SQL Server backends fail outright and others silently
return zero rows — which the engine would then correctly but unhelpfully
report as `joined-none`. It is **declared, not guessed**: a purely
numeric-looking parcel id stored as text (`'0012345'`) must still be quoted, or
the leading zeros the county actually stores are lost.

### Failure modes it handles

- **ArcGIS errors inside a 200 body.** Bad field name, invalid `WHERE`, layer
  not found — all returned as `{"error": …}` with HTTP 200. Not checking this
  is how a misconfigured join looks like an empty result.
- **HTML masquerading as data.** A retired county portal, or one moved behind
  a login, answers 200 with a sign-in page. Reported as "non-JSON response (an
  HTML error or login page?)" rather than a parser stack trace.
- **Transient failures.** Up to 3 attempts with 400ms/1200ms backoff.
  Deliberately short: enrichment is progressive enhancement behind an
  already-rendered map and must not spend 30s retrying while the user pans.
- **Aborts.** Propagate immediately without consuming retries — an abort is
  the user panning away, not a service failure.
- **SQL escaping.** Embedded apostrophes are doubled. Only ever used for
  government identifiers, but a parcel id containing a quote would otherwise
  break the query at best and inject SQL into a public endpoint at worst.
- **Duplicate rows per parcel.** Assessment tables legitimately carry several
  rows per parcel (one per building, one per owner of record). First row wins,
  deterministically. Merging them would fabricate a parcel matching no single
  official row; the multi-row cases that matter — sales history, building
  lists — need array-valued handling rather than being flattened.

### Raw vs normalized keys

Normalization is lossy and therefore not reversible, so the engine passes
executors `ctx.rawByKey` (normalized key → the original values that produced
it). The `WHERE` clause is built from the **raw** values the server actually
stores; responses are re-normalized with the source's own rules before
indexing. That is what lets a county storing `0123-45-6789` on its parcel
layer join to `0123456789` in its CAMA table.

Tested in `tests/test_parcel_enrichment_arcgis.mjs` (47 assertions) with
`global.fetch` stubbed throughout — no network access, and failure modes a
live county server produces only intermittently are exercised every run.
