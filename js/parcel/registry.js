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
 *
 * SERVICE URL RE-VERIFICATION PASS (2026-07):
 *   Every serviceUrl below was originally written without ever being fetched —
 *   each one was a plausible-looking guess. One (Montgomery County MD) turned
 *   out to be a fully invalid org/service ID, confirmed dead by a live browser
 *   request. All five were re-derived from web search (this sandbox cannot
 *   make direct outbound HTTP requests to arbitrary domains, so no URL below
 *   has been fetched and confirmed by this pass either — only cross-referenced
 *   against multiple independent search results, official county-branded
 *   domains, and, where possible, field names that already matched what was
 *   guessed originally). Treat these as substantially more trustworthy than
 *   before, not as fetch-confirmed. The single highest-value follow-up for
 *   this file is opening each serviceUrl + '?f=json' in a real browser and
 *   confirming it returns a valid layer definition (name + fields), not
 *   {"error":...}.
 *
 *   A structural finding from this pass, not just a URL-correctness one: the
 *   Virginia counties' public parcel *boundary* services (Loudoun, Fairfax,
 *   confirmed by field list) carry geometry and little else — no owner,
 *   address, zoning, or assessed-value attributes. Those live in separate
 *   county services (e.g. Prince William's "Parcel CAMA Public" layer,
 *   Fairfax's separate Tax Administration Real Estate services) that this
 *   connector's one-service-per-jurisdiction model doesn't join against.
 *   Fields in fieldMap below that have no confirmed source are left as
 *   best-effort guesses — if wrong, they simply don't populate (the panel
 *   omits the row; see js/parcel/panel.js's _fmtFieldRow), they do not show
 *   incorrect data — but for the VA counties in particular, don't expect the
 *   ownership/assessment fields to populate at all from these boundary
 *   services regardless of field-name accuracy.
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
     * 2026-07 re-verification: the previous serviceUrl (arcgis/rest/services/
     * LOGIS_Public/Parcel_Info/FeatureServer/0) does not match any service found
     * via web search. The real public parcels layer is a MapServer (not
     * FeatureServer) under the /gis/ path, not /arcgis/:
     *   https://logis.loudoun.gov/gis/rest/services/COL/pol_connect/MapServer/3
     * Cross-referenced across multiple independent search results. Confirmed
     * fields (via search, not a live fetch): PA_MCPI (9-digit parcel ID),
     * PA_GIS_ACRE, PA_SUBD_NAME, PA_ADD_DATE, PA_END_DATE, SHAPE_Area,
     * SHAPE_Length. This is a boundary-only layer — no owner/address/zoning/
     * assessed-value fields exist in it at all; those fields below are kept
     * as harmless best-guesses (they just won't populate) rather than removed.
     * ─────────────────────────────────────────────────────────────────── */
    '51107': {
      id:          'va-loudoun-county',
      name:        'Loudoun County, Virginia',
      state:       'VA',
      fips:        '51107',
      connector:   'arcgis',
      serviceUrl:  'https://logis.loudoun.gov/gis/rest/services/COL/pol_connect/MapServer/3',
      minZoom:     14,
      maxFeatures: 500,

      /* canonical field id → source attribute name.
       * '__computed__' means the value is derived by the connector, not from properties. */
      fieldMap: {
        parcel_id:           'PA_MCPI',
        pin:                 'PA_MCPI',
        address:             'SITE_ADDR',
        owner:               'OWNER_NAME',
        owner_mailing:       'MAIL_ADDR',
        zoning_code:         'ZONING',
        land_use_code:       'USE_CODE',
        land_use_desc:       'USE_DESC',
        area_sqft:           'SHAPE_Area',
        area_acres:          'PA_GIS_ACRE',
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
        subdivision:         'PA_SUBD_NAME',
        county_fips:         '__computed__',
      },

      outFields: null, // null = request all fields ('*')

      attribution: {
        name:    'Loudoun County GIS (LOGIS)',
        url:     'https://logis.loudoun.gov/gis/rest/services/',
        portal:  'https://geohub-loudoungis.opendata.arcgis.com/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Ashburn/Sterling "Data Center Alley" — largest data center market globally by power capacity.',
      },
    },

    /* ── Prince William County, Virginia — Phase 2 pilot ────────────────
     *
     * Prince William County (the Manassas/Gainesville/Haymarket corridor) is
     * the second-largest data center market in Virginia and one of the fastest-
     * growing in the US.  Major operators including Microsoft, Amazon, and Meta
     * have facilities here.  The county operates its own ArcGIS REST service.
     *
     * 2026-07 re-verification: the previous serviceUrl (gis.pwcgov.org/.../
     * Property/Parcels/FeatureServer/0) points at a domain that no longer
     * appears to be the county's live GIS host — the county's current ArcGIS
     * Server is at gisweb.pwcva.gov. Its "AGOL/AGOL" MapServer, layer 13, is
     * titled "Parcels" and — reassuringly — confirmed via search to contain a
     * GPIN field, matching what was already (correctly, as it turns out)
     * guessed for the `pin` mapping below, plus ST_NO/ST_NAME/ST_TYPE address
     * components, GPIN_SHORT, TAXMAPNUMBER, and city/zip/deed book/deed page/
     * record-date attributes (exact field names for those last few not
     * confirmed). A separate "Parcel CAMA Public" layer under
     * gisweb.pwcva.gov/arcgis/rest/services/GTS/Cadastral/MapServer likely
     * carries assessment data this connector doesn't currently join against.
     * ─────────────────────────────────────────────────────────────────── */
    '51153': {
      id:          'va-prince-william-county',
      name:        'Prince William County, Virginia',
      state:       'VA',
      fips:        '51153',
      connector:   'arcgis',
      serviceUrl:  'https://gisweb.pwcva.gov/arcgis/rest/services/AGOL/AGOL/MapServer/13',
      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'OBJECTID',
        pin:                 'GPIN',
        address:             'SITE_ADDRESS',
        owner:               'OWNER',
        zoning_code:         'ZONING_CODE',
        land_use_code:       'LAND_USE',
        land_use_desc:       'LAND_USE_DESC',
        area_sqft:           'SHAPE_Area',
        area_acres:          'ACREAGE',
        assessed_value:      'TOTAL_ASSD',
        land_value:          'LAND_ASSD',
        improvement_value:   'IMPRV_ASSD',
        tax_year:            'TAX_YEAR',
        last_sale_date:      'SALE_DATE',
        last_sale_price:     'SALE_PRICE',
        deed_book:           'DEED_BOOK',
        deed_page:           'DEED_PAGE',
        subdivision:         'SUBDIV',
        county_fips:         '__computed__',
      },

      outFields: null,

      attribution: {
        name:    'Prince William County GIS',
        url:     'https://www.pwcgov.org/government/dept/it/Pages/GIS.aspx',
        portal:  'https://gis.pwcgov.org/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Manassas/Gainesville corridor — second-largest VA data center market.',
      },
    },

    /* ── Fairfax County, Virginia ────────────────────────────────────────
     *
     * Fairfax is the largest county in Virginia by population and one of the
     * key DC-metro data center markets, particularly the Reston/Tysons area.
     * The county publishes parcels via its open data ArcGIS service.
     *
     * 2026-07 re-verification: the previous serviceUrl (services1.arcgis.com/
     * ioennV6PpG5Xodq0/.../Fairfax_County_Parcels/FeatureServer/0) had the
     * right ArcGIS Online org ID for the county (that org does host Fairfax's
     * Tax Administration Real Estate Sales/Assessed-Values layers) but the
     * wrong service name — no "Fairfax_County_Parcels" service exists there.
     * The actual public parcels layer is self-hosted, not ArcGIS Online:
     *   https://www.fairfaxcounty.gov/mercator/rest/services/OpenData/OpenData_A9/FeatureServer/0
     * Confirmed via search: fields OBJECTID and PIN (both already correctly
     * guessed below), plus PARCEL_TYPE, SRC_CONTROL, PARCEL_KEY. Boundary-only
     * like Loudoun — no owner/address/zoning/value fields in this layer; those
     * live in the separate Tax Administration services on the ioennV6PpG5Xodq0
     * org (OpenData_A5 = Sales, OpenData_A6 = Assessed Values) that this
     * connector doesn't join against.
     * ─────────────────────────────────────────────────────────────────── */
    '51059': {
      id:          'va-fairfax-county',
      name:        'Fairfax County, Virginia',
      state:       'VA',
      fips:        '51059',
      connector:   'arcgis',
      serviceUrl:  'https://www.fairfaxcounty.gov/mercator/rest/services/OpenData/OpenData_A9/FeatureServer/0',
      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'OBJECTID',
        pin:                 'PIN',
        address:             'SITE_ADDRESS',
        owner:               'OWNER_NAME',
        zoning_code:         'ZONING',
        land_use_code:       'LAND_USE',
        land_use_desc:       'LAND_USE_DESC',
        area_sqft:           'SHAPE_Area',
        area_acres:          'AREA_ACRES',
        building_count:      'BLDG_COUNT',
        year_built:          'YEAR_BUILT',
        assessed_value:      'TOTAL_VALUE',
        land_value:          'LAND_VALUE',
        improvement_value:   'IMP_VALUE',
        tax_year:            'TAX_YEAR',
        last_sale_date:      'SALE_DATE',
        last_sale_price:     'SALE_PRICE',
        subdivision:         'SUBDIV_NAME',
        county_fips:         '__computed__',
      },

      outFields: null,

      attribution: {
        name:    'Fairfax County GIS',
        url:     'https://www.fairfaxcounty.gov/gis/',
        portal:  'https://opendata.fairfaxcounty.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Reston/Tysons corridor — major Fairfax data center submarket.',
      },
    },

    /* ── Montgomery County, Maryland ─────────────────────────────────────
     *
     * Montgomery County MD (Silver Spring/Germantown/Gaithersburg) is the
     * dominant Maryland DC-metro data center market.
     *
     * 2026-07 re-verification: the previous serviceUrl (services1.arcgis.com/
     * hCTSlHgaGcpJyXBl/.../Montgomery_County_Parcels/FeatureServer/0) was
     * confirmed dead by a live browser request — {"error":{"code":400,
     * "message":"Invalid URL"}}. Multiple "Montgomery County Parcels"
     * datasets exist across different ArcGIS orgs for the *other* Montgomery
     * Counties (Pennsylvania's "montcopa", Texas's MCAD) — easy to grab the
     * wrong state's data by name alone, so this fix uses Maryland's own
     * statewide parcel service instead of a county-specific one:
     *   https://geodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0
     * Published by the state (Dept. of Assessments & Taxation + Dept. of
     * Planning), covers every MD county including this one and Howard below,
     * and viewport-bounds filtering (already how this connector queries)
     * naturally scopes results to whichever county is on screen. Confirmed
     * fields: ACCTID, ADDRESS, STRTNUM/STRTDIR/STRTNAM/STRTTYP, LU (land use
     * code), DESCLU (land use description) — richer than the VA counties'
     * boundary-only layers, but owner name and assessed-value field names
     * were not confirmed.
     * ─────────────────────────────────────────────────────────────────── */
    '24031': {
      id:          'md-montgomery-county',
      name:        'Montgomery County, Maryland',
      state:       'MD',
      fips:        '24031',
      connector:   'arcgis',
      serviceUrl:  'https://geodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0',
      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'ACCTID',
        pin:                 'ACCTID',
        address:             'ADDRESS',
        owner:               'OWNER',
        zoning_code:         'ZONING',
        land_use_code:       'LU',
        land_use_desc:       'DESCLU',
        area_sqft:           'SHAPE_Area',
        area_acres:          'ACRES',
        assessed_value:      'TOTAL_ASSESSED',
        land_value:          'LAND_ASSESSED',
        improvement_value:   'IMP_ASSESSED',
        tax_year:            'ASSESSMENT_YEAR',
        last_sale_date:      'DEED_DATE',
        last_sale_price:     'SALE_PRICE',
        subdivision:         'SUBDIVISION',
        county_fips:         '__computed__',
      },

      outFields: null,

      attribution: {
        name:    'Maryland Dept. of Planning / Dept. of Assessments & Taxation (MD iMAP)',
        url:     'https://www.montgomerycountymd.gov/gis/',
        portal:  'https://data.imap.maryland.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Silver Spring/Germantown corridor — primary Maryland DC-metro data center market. Served from Maryland’s statewide parcel layer, not a Montgomery County-specific service.',
      },
    },

    /* ── Howard County, Maryland ─────────────────────────────────────────
     *
     * Howard County MD (Columbia/Jessup/Elkridge) sits between Baltimore and
     * Washington and is an emerging data center market, particularly along the
     * US-1 and MD-175 corridors.
     *
     * 2026-07 re-verification: the previous serviceUrl (services3.arcgis.com/
     * o7Q8tBgxZCKeQNEI/.../HCo_Parcels/FeatureServer/0) could not be confirmed
     * via search at all (no evidence this org/service exists) and, per the
     * same finding as Montgomery County above, no county-specific Howard
     * County parcels ArcGIS service surfaced with confidence either. Rather
     * than leave a very likely-fabricated URL in place, this now points at
     * the same Maryland statewide parcel service used for Montgomery County
     * MD (see that entry's comment for full detail and field-confirmation
     * notes) — one authoritative source for every MD county, viewport-bounds
     * filtering already scopes it to whichever county is on screen:
     *   https://geodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0
     * ─────────────────────────────────────────────────────────────────── */
    '24027': {
      id:          'md-howard-county',
      name:        'Howard County, Maryland',
      state:       'MD',
      fips:        '24027',
      connector:   'arcgis',
      serviceUrl:  'https://geodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0',
      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'ACCTID',
        pin:                 'ACCTID',
        address:             'ADDRESS',
        owner:               'OWNER',
        zoning_code:         'ZONING',
        land_use_code:       'LU',
        land_use_desc:       'DESCLU',
        area_sqft:           'SHAPE_Area',
        area_acres:          'ACRES',
        assessed_value:      'ASSESSED_VALUE',
        land_value:          'LAND_VALUE',
        improvement_value:   'IMPROVEMENT_VALUE',
        tax_year:            'ASSESSMENT_YEAR',
        last_sale_date:      'DEED_DATE',
        last_sale_price:     'SALE_PRICE',
        subdivision:         'SUBDIVISION',
        county_fips:         '__computed__',
      },

      outFields: null,

      attribution: {
        name:    'Maryland Dept. of Planning / Dept. of Assessments & Taxation (MD iMAP)',
        url:     'https://gis.howardcountymd.gov/',
        portal:  'https://data.imap.maryland.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Columbia/Jessup/Elkridge corridor — emerging MD data center market between Baltimore and DC. Served from Maryland’s statewide parcel layer, not a Howard County-specific service.',
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
