/* js/parcel/registry.js
 * Jurisdiction registry for parcel data sources.
 *
 * Each entry defines:
 *   id          — matches data/zoning/jurisdictions/ folder names
 *   name        — human-readable display name
 *   fips        — 5-digit county FIPS code
 *   connector   — connector type ('arcgis' | 'geojson' | 'wfs')
 *   serviceUrl  — primary data endpoint (see attribution.url for human-readable)
 *   minZoom     — minimum Leaflet zoom level to load parcels (14 = neighborhood)
 *   maxFeatures — max features per viewport request
 *   fieldMap    — canonical field id → source attribute name (the field key in GeoJSON properties)
 *   outFields   — array of source fields to request, or null for all ('*')
 *   attribution — source credit shown in the panel
 *
 * To add a new jurisdiction, copy the Loudoun County block and update the values.
 * See docs/PARCEL_ADD_JURISDICTION.md for a step-by-step guide.
 */
window.PARCEL_REGISTRY = (function () {
  'use strict';

  const JURISDICTIONS = {

    /* ── Loudoun County, Virginia — Pilot jurisdiction ───────────────────
     *
     * Loudoun County is the most important pilot: the Ashburn/Sterling area
     * (Data Center Alley) is the largest data center market globally by power
     * capacity. The county operates LOGIS (Loudoun Geographic Information System).
     *
     * SERVICE URL VERIFICATION REQUIRED:
     *   The endpoint below is derived from the county's public ArcGIS REST services
     *   directory. Confirm the active parcel FeatureServer path at:
     *   https://logis.loudoun.gov/arcgis/rest/services/
     *   and the Open Data portal: https://data-loudoungis.opendata.arcgis.com/
     *   Field names must be verified against the live service schema before production use.
     * ─────────────────────────────────────────────────────────────────── */
    '51107': {
      id:          'va-loudoun-county',
      name:        'Loudoun County, Virginia',
      state:       'VA',
      fips:        '51107',
      connector:   'arcgis',
      serviceUrl:  'https://logis.loudoun.gov/arcgis/rest/services/LOGIS_Public/Parcel_Info/FeatureServer/0',
      minZoom:     14,
      maxFeatures: 500,

      /* canonical field id → source attribute name.
       * '__computed__' means the value is derived by the connector, not from properties. */
      fieldMap: {
        parcel_id:           'OBJECTID',
        pin:                 'PIN',
        address:             'SITE_ADDR',
        owner:               'OWNER_NAME',
        owner_mailing:       'MAIL_ADDR',
        zoning_code:         'ZONING',
        land_use_code:       'USE_CODE',
        land_use_desc:       'USE_DESC',
        area_sqft:           'SHAPE_Area',
        area_acres:          'AREA_ACRES',
        building_count:      'BLDG_COUNT',
        year_built:          'YEAR_BUILT',
        gross_floor_area:    'GFA_SQFT',
        assessed_value:      'TOTAL_VALUE',
        land_value:          'LAND_VALUE',
        improvement_value:   'IMP_VALUE',
        tax_year:            'TAX_YEAR',
        last_sale_date:      'LAST_SALE_DT',
        last_sale_price:     'LAST_SALE_PR',
        deed_book:           'DEED_BOOK',
        deed_page:           'DEED_PAGE',
        subdivision:         'SUBDIV_NAME',
        county_fips:         '__computed__',
      },

      outFields: null, // null = request all fields ('*')

      attribution: {
        name:    'Loudoun County GIS (LOGIS)',
        url:     'https://logis.loudoun.gov/arcgis/rest/services/',
        portal:  'https://data-loudoungis.opendata.arcgis.com/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Ashburn/Sterling "Data Center Alley" — largest data center market globally by power capacity.',
      },
    },

  };

  function get(fips) {
    return JURISDICTIONS[String(fips).padStart(5, '0')] || null;
  }

  function has(fips) {
    return Object.prototype.hasOwnProperty.call(JURISDICTIONS, String(fips).padStart(5, '0'));
  }

  function all() {
    return Object.values(JURISDICTIONS);
  }

  return { JURISDICTIONS, get, has, all };
})();
