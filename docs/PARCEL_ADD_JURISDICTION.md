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

## Connector types

Currently supported: `arcgis` (ArcGIS FeatureServer via GeoJSON output).

Planned:
- `geojson` — static or dynamic GeoJSON download
- `wfs` — OGC Web Feature Service
- `ckan` — CKAN open data portal API

To implement a new connector type, create `js/parcel/connector-{type}.js` following the same interface as `ArcGISParcelConnector`:
- `fetchViewport(bounds, signal)` → GeoJSON FeatureCollection (normalized)
- `searchByQuery(whereClause, signal)` → GeoJSON FeatureCollection (normalized)
- `fetchById(id, signal)` → GeoJSON FeatureCollection (normalized)

Then update `js/parcel/renderer.js` to instantiate the correct connector class based on `config.connector`.
