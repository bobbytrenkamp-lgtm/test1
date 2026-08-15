# Adding a New Parcel Jurisdiction

This guide walks through adding parcel data coverage for a new county or municipality.

## Prerequisites

Before starting, you need:
- An official ArcGIS FeatureServer, WFS, or GeoJSON endpoint for the jurisdiction's parcel data
- The FIPS code for the county (5-digit, e.g. `06037` for Los Angeles County, CA)
- A list of the attribute field names in the source data

## Step 1 — Verify the data source

Open the service URL in a browser and confirm:
- The endpoint returns valid data (try appending `/query?where=1%3D1&resultRecordCount=1&f=json`)
- Parcel polygon geometry is included (`returnGeometry=true`)
- The data is from an official government or authoritative source

For ArcGIS services, the services directory at `https://{host}/arcgis/rest/services/` will list available layers. Look for layers named "Parcel", "Land Records", or similar.

## Step 2 — Identify the field mapping

Compare the source attribute names to the canonical field schema in `js/parcel/schema.js`. Make a note of which source fields map to which canonical fields.

Common source field names by jurisdiction type:

| Canonical field    | Common ArcGIS names            |
|--------------------|--------------------------------|
| `parcel_id`        | OBJECTID, APN, PARCELID, PIN   |
| `pin`              | PIN, APN, PARCEL_NUMBER        |
| `address`          | SITE_ADDR, SITEADDR, ADDRESS   |
| `owner`            | OWNER_NAME, OWNER, OWN_NAME    |
| `zoning_code`      | ZONING, ZONE, ZONING_CODE      |
| `land_use_code`    | USE_CODE, LUC, LUSE            |
| `land_use_desc`    | USE_DESC, LAND_USE, LUSE_DESC  |
| `area_acres`       | AREA_ACRES, ACREAGE, ACRES     |
| `area_sqft`        | SHAPE_Area, GIS_SQFT, AREA_SF  |
| `assessed_value`   | TOTAL_VALUE, ASMNT_VAL         |
| `land_value`       | LAND_VALUE, LAND_VAL           |
| `improvement_value`| IMP_VALUE, IMPRV_VALUE         |

## Step 3 — Add the jurisdiction to the registry

Open `js/parcel/registry.js` and add a new entry inside the `JURISDICTIONS` object, using the FIPS code as the key:

```js
'06037': {
  id:          'ca-los-angeles-county',
  name:        'Los Angeles County, California',
  state:       'CA',
  fips:        '06037',
  connector:   'arcgis',
  serviceUrl:  'https://arcgis.gis.lacounty.gov/arcgis/rest/services/LACounty_Cache/LACounty_Parcel/FeatureServer/0',
  minZoom:     14,
  maxFeatures: 500,

  fieldMap: {
    parcel_id:           'OBJECTID',
    pin:                 'APN',
    address:             'SitusAddress',
    owner:               'OwnerName',
    zoning_code:         'ZoneCode',
    land_use_code:       'UseCode',
    land_use_desc:       'UseDesc',
    area_sqft:           'Shape_Area',
    area_acres:          'Acreage',
    assessed_value:      'Total_Asmnt',
    land_value:          'Land_Asmnt',
    improvement_value:   'Imprv_Asmnt',
    county_fips:         '__computed__',
  },

  outFields: null,  // null = request all fields ('*')

  attribution: {
    name:    'LA County GIS Data Portal',
    url:     'https://egis3.lacounty.gov/dataportal/',
    license: 'Public government data.',
    note:    'Los Angeles County Assessor parcel data.',
  },
},
```

> **Field mapping note:** Set `'__computed__'` for any field whose value is derived (like `county_fips`, which the connector fills in automatically from `config.fips`). Fields not listed in `fieldMap` are passed through with their source names lowercased.

> **Provenance note:** Every `fieldMap` entry you verify here also drives source provenance automatically — `connector-arcgis.js`'s `_normalize()` attaches a `direct-official` `window.PARCEL_PROVENANCE` record (this jurisdiction's `id`/`name`, the real source attribute name) for each canonical field listed in `fieldMap`. Nothing extra to configure; a field left out of `fieldMap` (passed through lowercased) never gets a provenance record, since this connector genuinely does not know what that attribute is.

## Step 4 — Add a layer-registry entry (optional)

If you want the jurisdiction to appear as a distinct layer option (rather than always using the Loudoun County pilot toggle), you could add a per-jurisdiction entry to `js/layer-registry.js`. For Phase 1, all parcel data uses the single `parcels` layer toggle.

## Step 5 — Test the new jurisdiction

1. Enable the Parcels layer in the map layers panel
2. Click on a county with the new FIPS code
3. Zoom to level 14+ — parcels should appear
4. Click a parcel to open the panel and verify the field values are correct
5. Run `tests/parcel.test.js` in the browser console to confirm the registry is valid

## Step 6 — Document the source

Add the source to `data/zoning/sources/source_registry.json` under the jurisdiction's key:

```json
"ca-los-angeles-county": {
  "jurisdiction_id": "ca-los-angeles-county",
  "jurisdiction_name": "Los Angeles County, California",
  "state": "CA",
  "county_fips": "06037",
  "sources": {
    "parcels": {
      "title": "LA County Parcel Data",
      "url": "https://arcgis.gis.lacounty.gov/...",
      "type": "arcgis_featureserver",
      "license": "Public",
      "last_checked": "2026-07-21",
      "tier": 1
    }
  }
}
```

## Automated tooling (in progress)

The manual steps above (1–6) are still how a jurisdiction actually gets added to `js/parcel/registry.js` today — there is no automated entry generator yet. Two pieces of tooling exist to make *finding what to work on next* less manual, though:

- **`data/parcel_source_catalog.json`** — a machine-readable index of every parcel source investigated for this project, not just the ones that made it into the registry. Production jurisdictions (regenerated from the live registry by `node data/parcel_pipeline/seed_catalog_from_registry.mjs`, safe to re-run any time) sit alongside hand-transcribed candidate/blocked/rejected records for counties that were investigated but not added, each with a `notes` pointer back to the relevant `AI_TEAM_STATUS.md` line range for the full narrative trail. Validate it with `python3 data/validate_parcel_catalog.py`.
- **`data/parcel_priority_queue.py --next N`** — ranks the next N jurisdictions worth investigating by facility count (from `data/facilities_index.json`), automatically excluding counties already in production and counties that are blocked/rejected without a due retry, and flags when a state already has a reusable statewide/regional service (via the `where`-clause pattern below) that might cover a new county just by changing the filter value.
- **`data/parcel_field_synonyms.json`** — an exact-match seed corpus of every source attribute name already verified (by a human, against a real live service) to map to a given canonical field, extracted from every `fieldMap` currently in the registry via `node data/parcel_pipeline/extract_field_synonyms.mjs`. This is a reference lookup only — nothing consumes it automatically yet.

Full discovery (searching for new candidate sources), scoring, and automated field-mapping/entry-generation are a planned later phase and don't exist yet — this tooling only helps you find and record what's already known.

## Connector types

Currently supported and implemented: `arcgis` (ArcGIS FeatureServer/MapServer via GeoJSON output), `geojson` (static or dynamic GeoJSON download), `wfs` (OGC Web Feature Service 1.1.0/2.0.0). All 51 current registry entries use `arcgis`; `geojson` and `wfs` are implemented and ready but not yet used by any live jurisdiction.

Planned:
- `ckan` — CKAN open data portal API
- A multi-table-join connector, for jurisdictions that publish parcel boundaries and assessment/CAMA data as separate services joined by a shared identifier (PIN/APN/FOLIO/SSL)

To implement a new connector type, create `js/parcel/connector-{type}.js` following the same interface as `ArcGISParcelConnector`:
- `fetchViewport(bounds, signal)` → GeoJSON FeatureCollection (normalized)
- `searchByQuery(whereClause, signal)` → GeoJSON FeatureCollection (normalized)
- `fetchById(id, signal)` → GeoJSON FeatureCollection (normalized)

Then update **both** `js/parcel/renderer.js`'s `_makeConnector()` factory (the map-rendering path) **and** `js/parcel/index.js`'s `search()` method (the search-bar path, which currently hardcodes `ArcGISParcelConnector` rather than dispatching by connector type) to instantiate the correct connector class based on `config.connector`. Also add the new type to the connector-enum check in `tests/parcel.test.js` (`['arcgis', 'geojson', 'wfs'].includes(cfg.connector)`) — every registry entry using an un-listed connector type fails that assertion.

For a service that shares one dataset across multiple counties (a statewide or regional agency), scope it to one county with a `where` clause on the registry entry (e.g. `where: "COUNTY = 'HUDSON'"`) rather than adding a new connector — `connector-arcgis.js` already supports this (defaults to `'1=1'` when absent), and it's the pattern behind several existing entries (NJ MOD-IV, NYC MAPPLUTO, the Twin Cities metro regional service).
