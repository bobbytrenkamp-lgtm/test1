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
 * FETCH-CONFIRMED 2026-07-31 — supersedes the caveats below.
 *   data/check_parcel_services.mjs finally ran the check this header had been
 *   asking for, on a runner with real network access. Results:
 *
 *     Loudoun VA / Fairfax VA / Prince William VA — LIVE, valid layers.
 *     Howard MD / Montgomery MD                   — HTTP 503, no data.
 *
 *   The two Maryland counties share ONE serviceUrl (Maryland's statewide
 *   MD_ParcelBoundaries layer), so that single endpoint failing takes out
 *   both. 503 reproduced across three runs a few minutes apart; that is not
 *   long enough to distinguish a retired endpoint from an extended outage,
 *   so the URL is left in place pending a re-probe rather than replaced with
 *   another guess. Until it returns, both MD counties show the generic
 *   "Parcel data unavailable — service error" toast.
 *
 *   Every fieldMap below was ALSO checked against its layer's real field
 *   list, and they were almost entirely wrong — 16/18 broken for Fairfax,
 *   17/22 for Loudoun, 18/18 for Prince William. Parcels drew correctly and
 *   every attribute row came back empty, which reads as a rendering bug
 *   rather than a mapping one. All three are now corrected from the
 *   services' own schemas, and attributes a service genuinely does not carry
 *   are recorded in `notProvidedBySource` instead of being mapped to an
 *   invented column name. The probe verifies that list too, so if a county
 *   starts publishing one of them it gets reported rather than sitting
 *   unused behind a stale exclusion.
 *
 * SERVICE URL RE-VERIFICATION PASS (2026-07) — superseded, kept for history:
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
      /* Verified against the live layer 2026-07-31 by
         data/check_parcel_services.mjs — every name below came from the
         service's own ?f=json field list, not from inference. */
      fieldMap: {
        parcel_id:           'PA_MCPI',
        pin:                 'PA_MCPI',
        area_sqft:           'PA_LEGAL_SQFT',
        area_acres:          'PA_LEGAL_ACRE',
        subdivision:         'PA_SUBD_NAME',
        county_fips:         '__computed__',
      },

      /* This service is a parcel BOUNDARY layer: geometry plus plat and
         subdivision metadata, nothing else. The keys below were previously
         mapped to invented attribute names (SITE_ADDR, OWNER_NAME, ZONING,
         TOTAL_VALUE, …) that the layer does not expose — 17 of 22 mappings
         resolved to nothing, so the panel rendered blank rows with no
         indication why. They are listed here rather than silently dropped so
         the gap stays visible, and so nobody "restores" them by guessing
         again. Populating them needs Loudoun's separate CAMA/assessment
         service joined in, which this one-service-per-jurisdiction connector
         cannot currently do. */
      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'land_use_code',
        'land_use_desc', 'building_count', 'year_built', 'gross_floor_area',
        'assessed_value', 'land_value', 'improvement_value', 'tax_year',
        'last_sale_date', 'last_sale_price', 'deed_book', 'deed_page',
      ],

      outFields: null, // null = request all fields ('*')

      attribution: {
        name:    'Loudoun County GIS (LOGIS)',
        url:     'https://logis.loudoun.gov/gis/rest/services/',
        portal:  'https://geohub-loudoungis.opendata.arcgis.com/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Ashburn/Sterling "Data Center Alley" — largest data center market globally by power capacity. Boundary layer only: no owner, address, zoning, or assessment attributes.',
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

      /* Verified against the live layer 2026-07-31 by
         data/check_parcel_services.mjs.

         THE FULLY-QUALIFIED NAMES ARE NOT A MISTAKE — DO NOT "TIDY" THEM.
         This layer is a join of two source tables (Parcels + CAMADATA), and
         ArcGIS prefixes every field in a joined layer with its owning table.
         The attribute really is "GISPROD.VECTOR.Parcels.GPIN"; a request for
         plain "GPIN" matches nothing. That is why all 18 previous mappings
         resolved to zero — the bare names were right in spirit and wrong in
         fact, so the layer drew perfectly and every panel row came back
         empty. This is also the richest of the three Virginia sources: it is
         the only one carrying owner and land-use data. */
      fieldMap: {
        parcel_id:           'GISPROD.VECTOR.Parcels.OBJECTID',
        pin:                 'GISPROD.VECTOR.Parcels.GPIN',
        owner:               'GISPROD.VECTOR.CAMADATA.OWNER_CUR',
        land_use_code:       'GISPROD.VECTOR.CAMADATA.USECODE',
        gross_floor_area:    'GISPROD.VECTOR.CAMADATA.SQFTABV',
        area_acres:          'GISPROD.VECTOR.Parcels.DEED_ACREAGE',
        deed_book:           'GISPROD.VECTOR.Parcels.DEED_BOOK',
        deed_page:           'GISPROD.VECTOR.Parcels.DEED_PAGE',
        subdivision:         'GISPROD.VECTOR.Parcels.SUBDIV_NAME',
        county_fips:         '__computed__',
      },

      /* Absent from this service. `address` is listed because the layer holds
         only street COMPONENTS (ST_NO / ST_NAME / ST_TYPE) with no assembled
         address field, and CAMADATA.ADDRESS2/ADDRESS3 are owner mailing
         lines, not the site address — mapping either one would put the wrong
         value under an "Address" label. Assembling components is a connector
         change, not a registry one. */
      notProvidedBySource: [
        'address', 'zoning_code', 'land_use_desc', 'assessed_value',
        'land_value', 'improvement_value', 'tax_year', 'last_sale_date',
        'last_sale_price',
      ],

      outFields: null,

      attribution: {
        name:    'Prince William County GIS',
        url:     'https://www.pwcgov.org/government/dept/it/Pages/GIS.aspx',
        portal:  'https://gis.pwcgov.org/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Manassas/Gainesville corridor — second-largest VA data center market. Parcels joined to CAMA data: carries owner and land-use code, but no zoning or assessed values.',
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

      /* Verified against the live layer 2026-07-31 by
         data/check_parcel_services.mjs. Note Shape__Area's DOUBLE underscore
         — that is the real attribute name; the previous 'SHAPE_Area' (single,
         different casing) matched nothing. This is the thinnest of the three
         Virginia sources: 8 fields, all geometry and identifiers. */
      fieldMap: {
        parcel_id:           'PARCEL_KEY',
        pin:                 'PIN',
        area_sqft:           'Shape__Area',
        county_fips:         '__computed__',
      },

      /* Absent from this service — it is a pure boundary layer. The previous
         mappings for these were invented attribute names; 16 of 18 resolved
         to nothing. Fairfax does publish assessment and sales data, but from
         separate Tax Administration services that would have to be joined. */
      notProvidedBySource: [
        'address', 'owner', 'zoning_code', 'land_use_code', 'land_use_desc',
        'area_acres', 'building_count', 'year_built', 'assessed_value',
        'land_value', 'improvement_value', 'tax_year', 'last_sale_date',
        'last_sale_price', 'subdivision',
      ],

      outFields: null,

      attribution: {
        name:    'Fairfax County GIS',
        url:     'https://www.fairfaxcounty.gov/gis/',
        portal:  'https://opendata.fairfaxcounty.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Reston/Tysons corridor — major Fairfax data center submarket. Boundary layer only: 8 fields, no owner, address, zoning, or assessment attributes.',
      },
    },

    /* ── Montgomery County, Maryland ─────────────────────────────────────
     *
     * Montgomery County MD (Silver Spring/Germantown/Gaithersburg) is the
     * dominant Maryland DC-metro data center market.
     *
     * 2026-08-03 re-verification: the statewide endpoint (geodata.md.gov)
     * returned HTTP 503 on every probe since 2026-07-31 — long enough to
     * stop assuming a transient outage. Fetch-confirmed (GitHub Actions
     * runner; this dev sandbox cannot reach *.md.gov) that Maryland moved
     * the service to a different hostname: geodata.md.gov now serves an
     * explicit "Site Maintenance" page (not a generic error — this was a
     * deliberate migration, not a crash), while the identical service is
     * live at mdgeodata.md.gov. Every fieldMap entry below was ALSO
     * corrected against this service's real, complete field list (117
     * fields) — the previous mapping was written without ever fetching the
     * schema and got most non-boundary fields wrong (TOTAL_ASSESSED,
     * ASSESSMENT_YEAR, DEED_DATE, SALE_PRICE, SUBDIVISION, OWNER: none of
     * these exist). This service is richer than the VA counties' boundary-
     * only layers: real physical/valuation/transaction/legal fields exist
     * and are now mapped correctly, with 8 additional canonical fields
     * (lot_depth_ft, lot_width_ft, year_built, gross_floor_area, deed_book,
     * deed_page, legal_desc, census_tract) newly available that weren't
     * mapped at all before. No owner-name field exists anywhere in the 117
     * — Maryland's public parcel layer appears to deliberately redact it;
     * recorded in notProvidedBySource rather than guessed.
     * ─────────────────────────────────────────────────────────────────── */
    '24031': {
      id:          'md-montgomery-county',
      name:        'Montgomery County, Maryland',
      state:       'MD',
      fips:        '24031',
      connector:   'arcgis',
      serviceUrl:  'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'ACCTID',
        pin:                 'ACCTID',
        address:             'ADDRESS',
        zoning_code:         'ZONING',
        land_use_code:       'LU',
        land_use_desc:       'DESCLU',
        area_acres:          'ACRES',
        lot_depth_ft:        'DEPTH',
        lot_width_ft:        'WIDTH',
        year_built:          'YEARBLT',
        gross_floor_area:    'SQFTSTRC',
        assessed_value:      'NFMTTLVL',
        land_value:          'NFMLNDVL',
        improvement_value:   'NFMIMPVL',
        last_sale_date:      'TRADATE',
        last_sale_price:     'CONSIDR1',
        deed_book:           'DR1LIBER',
        deed_page:           'DR1FOLIO',
        subdivision:         'DESCSUBD',
        legal_desc:          'LEGAL1',
        census_tract:        'CT2020',
        county_fips:         '__computed__',
      },

      /* No field in this service's real 117-field list backs these —
         confirmed absent, not guessed. area_sqft specifically: LANDAREA
         exists but its unit varies per-record (see its companion LUOM
         field), so mapping it directly would silently show wrong units
         for some parcels; area_acres (ACRES, unambiguous) is mapped
         instead. */
      notProvidedBySource: [
        'owner', 'owner_mailing', 'zoning_desc', 'overlay_districts',
        'area_sqft', 'building_count', 'tax_year', 'tax_amount',
      ],

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
     * 2026-08-03 re-verification: same statewide service as Montgomery
     * County MD above (see that entry's comment for the full outage/
     * migration/field-verification detail) — moved from geodata.md.gov
     * (now serving a "Site Maintenance" page) to mdgeodata.md.gov, and
     * every fieldMap entry corrected against the service's real,
     * fetch-confirmed 117-field schema rather than left as an unverified
     * guess.
     * ─────────────────────────────────────────────────────────────────── */
    '24027': {
      id:          'md-howard-county',
      name:        'Howard County, Maryland',
      state:       'MD',
      fips:        '24027',
      connector:   'arcgis',
      serviceUrl:  'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'ACCTID',
        pin:                 'ACCTID',
        address:             'ADDRESS',
        zoning_code:         'ZONING',
        land_use_code:       'LU',
        land_use_desc:       'DESCLU',
        area_acres:          'ACRES',
        lot_depth_ft:        'DEPTH',
        lot_width_ft:        'WIDTH',
        year_built:          'YEARBLT',
        gross_floor_area:    'SQFTSTRC',
        assessed_value:      'NFMTTLVL',
        land_value:          'NFMLNDVL',
        improvement_value:   'NFMIMPVL',
        last_sale_date:      'TRADATE',
        last_sale_price:     'CONSIDR1',
        deed_book:           'DR1LIBER',
        deed_page:           'DR1FOLIO',
        subdivision:         'DESCSUBD',
        legal_desc:          'LEGAL1',
        census_tract:        'CT2020',
        county_fips:         '__computed__',
      },

      /* See Montgomery County MD's entry above — same service, same
         confirmed-absent field list. */
      notProvidedBySource: [
        'owner', 'owner_mailing', 'zoning_desc', 'overlay_districts',
        'area_sqft', 'building_count', 'tax_year', 'tax_amount',
      ],

      outFields: null,

      attribution: {
        name:    'Maryland Dept. of Planning / Dept. of Assessments & Taxation (MD iMAP)',
        url:     'https://gis.howardcountymd.gov/',
        portal:  'https://data.imap.maryland.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Columbia/Jessup/Elkridge corridor — emerging MD data center market between Baltimore and DC. Served from Maryland’s statewide parcel layer, not a Howard County-specific service.',
      },
    },

    /* ── Maricopa County, Arizona ─────────────────────────────────────────
     *
     * Maricopa County (Phoenix metro) is the #2 target by facility count in
     * this app's own dataset (123 in facilities_index.json) after Cook
     * County IL, which is deliberately excluded — see that county's note in
     * AI_TEAM_STATUS.md's Open Handoffs (its parcel data explicitly
     * prohibits redistribution over a network without permission).
     *
     * 2026-08-03 — added via the same fetch-confirm-before-wiring process
     * as the Maryland fix above: the Assessor's own MapServer (fetch-
     * confirmed on a GitHub Actions runner; this dev sandbox cannot reach
     * arcgis.com directly) is unusually rich for a single-service layer —
     * 57 fields, including a real owner-name field (several jurisdictions
     * in this registry redact it) and full assessed-value/sale/deed data.
     * LAND_SIZE exists but its unit could not be confirmed from the schema
     * alone (no companion units field, unlike Maryland's paired LUOM) — left
     * unmapped rather than guessed, matching the Maryland LANDAREA decision.
     * ─────────────────────────────────────────────────────────────────── */
    '04013': {
      id:          'az-maricopa-county',
      name:        'Maricopa County, Arizona',
      state:       'AZ',
      fips:        '04013',
      connector:   'arcgis',
      serviceUrl:  'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'APN',
        pin:                 'APN',
        address:             'PHYSICAL_ADDRESS',
        owner:               'OWNER_NAME',
        owner_mailing:       'MAIL_ADDRESS',
        zoning_code:         'CITY_ZONING',
        land_use_code:       'PUC',
        year_built:          'CONST_YEAR',
        gross_floor_area:    'LIVING_SPACE',
        assessed_value:      'FCV_CUR',
        tax_year:            'TAX_YR_CUR',
        last_sale_date:      'SALE_DATE',
        last_sale_price:     'SALE_PRICE',
        deed_book:           'MCR_BOOK',
        deed_page:           'MCR_PAGE',
        subdivision:         'SUBNAME',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'zoning_desc', 'land_use_desc', 'overlay_districts', 'area_sqft',
        'area_acres', 'lot_depth_ft', 'lot_width_ft', 'building_count',
        'land_value', 'improvement_value', 'tax_amount', 'legal_desc',
        'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Maricopa County Assessor',
        url:     'https://mcassessor.maricopa.gov/',
        portal:  'https://gis.mcassessor.maricopa.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Phoenix metro — one of the largest and fastest-growing US data center markets.',
      },
    },

    /* ── Dallas County, Texas ─────────────────────────────────────────────
     *
     * Dallas County — #3 by facility count (118) in this app's dataset.
     *
     * 2026-08-03 — fetch-confirmed. Two candidates were probed: Dallas
     * Central Appraisal District's own service (maps.dcad.org) returned
     * HTTP 404 at its expected REST path, so this uses the City of
     * Dallas-hosted "Tax Parcels" basemap layer instead, which does return
     * a valid layer. This is a lighter "basemap" layer (42 fields) than
     * Maricopa's or Fulton's full appraisal-district layers — no zoning,
     * assessed-value, or sale-history fields are present at all, only
     * ownership, legal description, and land-use classification. Address
     * components (ST_NUM/ST_DIR/ST_NAME/ST_TYPE) exist individually but not
     * as one field; left unmapped rather than concatenated, matching this
     * registry's existing convention (see Maryland's owner_mailing note).
     * ─────────────────────────────────────────────────────────────────── */
    '48113': {
      id:          'tx-dallas-county',
      name:        'Dallas County, Texas',
      state:       'TX',
      fips:        '48113',
      connector:   'arcgis',
      serviceUrl:  'https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'ACCT',
        pin:                 'ACCT',
        owner:               'TAXPANAME1',
        land_use_code:       'SPTBCODE',
        land_use_desc:       'PROP_CL',
        area_sqft:           'AREA_FEET',
        tax_year:            'APPRAISALYEAR',
        legal_desc:          'LEGAL_1',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'overlay_districts', 'area_acres', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'year_built', 'gross_floor_area', 'assessed_value',
        'land_value', 'improvement_value', 'tax_amount', 'last_sale_date',
        'last_sale_price', 'deed_book', 'deed_page', 'subdivision',
        'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'City of Dallas GIS',
        url:     'https://gis.dallascityhall.com/',
        portal:  'https://dallas-county-open-data-hub-dallascountygis.hub.arcgis.com/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'DFW metro — major Texas data center market. Boundary/basic-attribute layer only: no zoning, valuation, or sale-history fields.',
      },
    },

    /* ── Fulton County, Georgia ───────────────────────────────────────────
     *
     * Fulton County (Atlanta metro) — #5 by facility count (98) in this
     * app's dataset. Santa Clara County CA (#4, 108 facilities) was
     * investigated separately and confirmed unavailable — see
     * AI_TEAM_STATUS.md Open Handoffs; no general-purpose parcel service
     * could be found on the county's real GIS org after three probe rounds.
     *
     * 2026-08-03 — fetch-confirmed via the county's PropertyMapViewer
     * service, layer 11 ("Tax Parcel") of 38 layers in that MapServer.
     * Georgia's assessment system publishes both an "Assess" value (the
     * actual tax basis) and an "Appr" (appraised) value per component —
     * this registry's single canonical assessed_value/land_value/
     * improvement_value slots map to the Assess variants, since those are
     * what the other jurisdictions' "assessed value" fields represent; the
     * Appr fields aren't part of the canonical schema and are simply
     * unused, not missing.
     * ─────────────────────────────────────────────────────────────────── */
    '13121': {
      id:          'ga-fulton-county',
      name:        'Fulton County, Georgia',
      state:       'GA',
      fips:        '13121',
      connector:   'arcgis',
      serviceUrl:  'https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/PropertyMapViewer/PropertyMapViewer/MapServer/11',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'ParcelID',
        pin:                 'ParcelID',
        address:             'Address',
        owner:               'Owner',
        land_use_code:       'LUCode',
        area_acres:          'LandAcres',
        assessed_value:      'TotAssess',
        land_value:          'LandAssess',
        improvement_value:   'ImprAssess',
        tax_year:            'TaxYear',
        subdivision:         'Subdiv',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'land_use_desc',
        'overlay_districts', 'area_sqft', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'year_built', 'gross_floor_area', 'tax_amount',
        'last_sale_date', 'last_sale_price', 'deed_book', 'deed_page',
        'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Fulton County GIS',
        url:     'https://www.fultoncountyga.gov/maps',
        portal:  'https://gisdata.fultoncountyga.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Atlanta metro — major Southeast US data center market.',
      },
    },

    /* ── King County, Washington ─────────────────────────────────────────
     *
     * King County (Seattle metro) — #? by facility count (71) in this app's
     * dataset, added after Franklin County OH and following Santa Clara
     * County CA's confirmed-unavailable result (see that entry's note
     * above and AI_TEAM_STATUS.md Open Handoffs).
     *
     * 2026-08-03 — fetch-confirmed across three probe rounds on a GitHub
     * Actions runner (this dev sandbox cannot reach arcgis.com directly).
     * Two candidates exist on King County's own ArcGIS org
     * (services.arcgis.com/Ej0PsM5Aw677QF1W, owner "KingCounty"):
     * PUBLIC_PARCELS_AREA_2598 (12 fields, address + taxpayer-mailing only)
     * and PARCEL_ADDRESS_PUB_AREA_3069 (69 fields — zoning, acreage,
     * appraised/taxable values, legal description, present-use, tax-payer
     * mailing). This uses the richer of the two. King County distinguishes
     * "appraised" (full market value, pre-adjustment) from "taxable"
     * (post-exemption) land/improvement values; the taxable variants
     * (TAX_LNDVAL/TAX_IMPR) are mapped as this registry's land_value/
     * improvement_value, matching how other jurisdictions' "assessed
     * value" concept is used elsewhere here — no total field exists for
     * either variant, so assessed_value is left unmapped rather than
     * computed (this connector has no generic sum mechanism). No true
     * owner-name field exists; KCTP_ATTN (the tax-payer "attention" line)
     * is the closest available and is used for owner. Licensing: this
     * service is hosted on King County's official public "Open Data"
     * ArcGIS Hub (gis-kingcounty.opendata.arcgis.com) under owner
     * "KingCounty" with a "_PUB" naming convention signaling deliberate
     * public release; the Hub's terms-of-use page is a client-rendered app
     * so its exact text could not be fetched directly, and the service's
     * own copyrightText/description fields are empty, but no redistribution
     * restriction was found anywhere reachable — unlike Cook County IL,
     * where an explicit prohibition was found. Treated as standard public
     * open government GIS data, consistent with every other county in
     * this registry.
     * ─────────────────────────────────────────────────────────────────── */
    '53033': {
      id:          'wa-king-county',
      name:        'King County, Washington',
      state:       'WA',
      fips:        '53033',
      connector:   'arcgis',
      serviceUrl:  'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'PIN',
        pin:                 'PIN',
        address:             'ADDR_FULL',
        owner:               'KCTP_ATTN',
        zoning_code:         'KCA_ZONING',
        land_use_code:       'PREUSE_CODE',
        land_use_desc:       'PREUSE_DESC',
        area_sqft:           'LOTSQFT',
        area_acres:          'KCA_ACRES',
        land_value:          'TAX_LNDVAL',
        improvement_value:   'TAX_IMPR',
        tax_year:            'KCTP_TAXYR',
        subdivision:         'PLAT_NAME',
        legal_desc:          'LEGALDESC',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_desc', 'overlay_districts', 'lot_depth_ft',
        'lot_width_ft', 'building_count', 'year_built', 'gross_floor_area',
        'assessed_value', 'tax_amount', 'last_sale_date', 'last_sale_price',
        'deed_book', 'deed_page', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'King County GIS',
        url:     'https://gis-kingcounty.opendata.arcgis.com/',
        portal:  'https://gis-kingcounty.opendata.arcgis.com/',
        license: 'Public government open data. Verify terms before commercial redistribution.',
        note:    'Seattle metro — major Pacific Northwest data center market.',
      },
    },

    /* ── Franklin County, Ohio ────────────────────────────────────────────
     *
     * Franklin County (Columbus metro) — #? by facility count (82) in this
     * app's dataset.
     *
     * 2026-08-03 — fetch-confirmed on a GitHub Actions runner (this dev
     * sandbox cannot reach franklincountyohio.gov directly). The county
     * Auditor's own hosted service (gis.franklincountyohio.gov) is a rich
     * 117-field CAMA-style layer ("Tax Parcel") — one of the few sources in
     * this registry that carries genuine sale-transaction data (SALEDATE/
     * SALEPRICE) alongside ownership, physical characteristics, and
     * valuation. CLASSDSCRP (the county's own property-class description)
     * is used for land_use_desc since no separate zoning field exists —
     * Ohio county auditors publish tax assessment data, not municipal
     * zoning, which is set independently by each city/township; zoning_code
     * and zoning_desc are correctly left unmapped rather than guessed.
     * NOCARDS ("number of cards", the CAMA-system term for structures on a
     * parcel) is used for building_count. PRPRTYDSCRP is one of three
     * legal-description line fields (PRPRTYDSCRP/2/3); only the first line
     * is mapped to legal_desc — per this registry's existing convention,
     * multi-part fields are not concatenated, but a single real field
     * (even a partial line) is still genuine, unaltered source data. No
     * explicit tax_year or tax_amount field exists for the current values
     * shown, so both are left unmapped rather than guessed.
     * ─────────────────────────────────────────────────────────────────── */
    '39049': {
      id:          'oh-franklin-county',
      name:        'Franklin County, Ohio',
      state:       'OH',
      fips:        '39049',
      connector:   'arcgis',
      serviceUrl:  'https://gis.franklincountyohio.gov/hosting/rest/services/ParcelFeatures/Parcel_Features/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'PARCELID',
        pin:                 'PARCELID',
        address:             'SITEADDRESS',
        owner:               'OWNERNME1',
        land_use_code:       'USECD',
        land_use_desc:       'CLASSDSCRP',
        area_sqft:           'STATEDAREA',
        area_acres:          'ACRES',
        building_count:      'NOCARDS',
        year_built:          'RESYRBLT',
        gross_floor_area:    'BLDGAREA',
        assessed_value:      'TOTVALUEBASE',
        land_value:          'LNDVALUEBASE',
        improvement_value:   'BLDVALUEBASE',
        last_sale_date:      'SALEDATE',
        last_sale_price:     'SALEPRICE',
        legal_desc:          'PRPRTYDSCRP',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'lot_depth_ft', 'lot_width_ft', 'tax_year', 'tax_amount',
        'deed_book', 'deed_page', 'subdivision', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Franklin County Auditor GIS',
        url:     'https://www.franklincountyauditor.com/',
        portal:  'https://gis.franklincountyohio.gov/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Columbus metro — growing Midwest data center market.',
      },
    },

    /* ── Los Angeles County, California ──────────────────────────────────
     *
     * Los Angeles County — #6 by facility count (64) in this app's dataset.
     *
     * 2026-08-03 — fetch-confirmed on a GitHub Actions runner (this dev
     * sandbox cannot reach lacounty.gov directly); the county's own public
     * GIS portal (public.gis.lacounty.gov) was the first candidate tried
     * and returned a live, rich 92-field Assessor-roll layer. AIN
     * (Assessor Identification Number) and APN (Assessor's Parcel Number)
     * are both real, distinct fields — mapped to parcel_id and pin
     * respectively rather than reusing one for both, unlike jurisdictions
     * where only a single identifier concept exists. No owner-name or
     * mailing-address field exists (LA County's public parcel viewer
     * appears to deliberately omit it, same pattern as Maryland). No lot-
     * size field exists either — Shape.STArea() is present but is a raw
     * geometry-derived value with no confirmed real-world unit, so
     * area_sqft/area_acres are left unmapped rather than guessed, matching
     * the Maryland LANDAREA / Maricopa LAND_SIZE precedent. No sale-
     * transaction fields exist (SpatialChangeDate/ParcelCreateDate are GIS
     * record-keeping dates, not sale dates). The layer records up to 5
     * separate structures per parcel (fields suffixed 1-5, e.g. YearBuilt1
     * .. YearBuilt5); only the first structure's fields are mapped to this
     * registry's single-value year_built/gross_floor_area slots, since
     * there is no generic multi-structure aggregation mechanism here.
     * ─────────────────────────────────────────────────────────────────── */
    '06037': {
      id:          'ca-los-angeles-county',
      name:        'Los Angeles County, California',
      state:       'CA',
      fips:        '06037',
      connector:   'arcgis',
      serviceUrl:  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'AIN',
        pin:                 'APN',
        address:             'SitusFullAddress',
        land_use_code:       'UseCode',
        land_use_desc:       'UseDescription',
        year_built:          'YearBuilt1',
        gross_floor_area:    'SQFTmain1',
        land_value:          'Roll_LandValue',
        improvement_value:   'Roll_ImpValue',
        tax_year:            'Roll_Year',
        legal_desc:          'LegalDescription',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'overlay_districts', 'area_sqft', 'area_acres', 'lot_depth_ft',
        'lot_width_ft', 'building_count', 'assessed_value', 'tax_amount',
        'last_sale_date', 'last_sale_price', 'deed_book', 'deed_page',
        'subdivision', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Los Angeles County GIS / Assessor',
        url:     'https://assessor.lacounty.gov/',
        portal:  'https://egis-lacounty.hub.arcgis.com/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'LA metro — one of the largest US data center markets, including El Segundo and downtown LA carrier-hotel submarkets.',
      },
    },

    /* ── Harris County, Texas ─────────────────────────────────────────────
     *
     * Harris County (Houston metro) — #9 by facility count (61) in this
     * app's dataset.
     *
     * 2026-08-03 — fetch-confirmed on a GitHub Actions runner (this dev
     * sandbox cannot reach arcgis.com/hctx.net directly). A search scoped
     * to the county's real, authoritative "HarrisCountyGIS" ArcGIS owner
     * (confirmed genuine via other clearly-official layers on the same
     * account: "Harris County", "HC_Boundary", "City_Limits") found two
     * candidates: this ArcGIS Online-hosted "Harris County Parcels"
     * service, and a self-hosted "HCAD Parcels Layer" at hcusgis.hctx.net
     * (Harris County's own domain) that failed at the connection level
     * from this sandbox's network on every attempt — undetermined whether
     * actually down or just unreachable from here, not confirmed dead.
     * The ArcGIS Online service's own layer index is 1, not 0 as first
     * guessed (confirmed via its FeatureServer root's sub-layer listing);
     * a subsequent fetch of layer 1 itself then hit a transient network
     * failure that cleared up on retry with a longer timeout — the
     * service was live the whole time. Its copyrightText/description
     * identify it as "Official Dataset... Parcel data received from HCAD"
     * (Harris County Appraisal District), with no redistribution
     * restriction found in either field — comparable to every other
     * county in this registry, unlike Cook County IL's confirmed
     * prohibition. 61 real fields, a richer HCAD appraisal-roll schema
     * similar in kind to Franklin County OH's. No address, zoning, or
     * year-built fields exist despite the rich field count — address is
     * split across 8 component fields with no composite (same convention
     * as every other split-address source in this registry: left
     * unmapped rather than concatenated); zoning isn't published by the
     * appraisal district (same as Franklin OH); no year-built field
     * exists in this particular layer at all.
     * ─────────────────────────────────────────────────────────────────── */
    '48201': {
      id:          'tx-harris-county',
      name:        'Harris County, Texas',
      state:       'TX',
      fips:        '48201',
      connector:   'arcgis',
      serviceUrl:  'https://services.arcgis.com/su8ic9KbA7PYVxPS/arcgis/rest/services/Harris_County_Parcels/FeatureServer/1',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'HCAD_NUM',
        pin:                 'acct_num',
        owner:               'owner_name_1',
        land_use_code:       'land_use',
        area_sqft:           'land_sqft',
        area_acres:          'acreage_1',
        assessed_value:      'total_appraised_val',
        land_value:          'land_value',
        improvement_value:   'impr_value',
        tax_year:            'tax_year',
        last_sale_date:      'new_owner_date',
        legal_desc:          'legal_dscr_1',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_desc', 'overlay_districts', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'year_built', 'gross_floor_area', 'tax_amount',
        'last_sale_price', 'deed_book', 'deed_page', 'subdivision',
        'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Harris County Appraisal District (HCAD)',
        url:     'https://hcad.org/',
        portal:  'https://hcad.org/pdata/pdata-property-search',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Houston metro — major Texas data center market.',
      },
    },

    /* ── New York County, New York (Manhattan) ───────────────────────────
     *
     * New York County — #13 by facility count (52) in this app's dataset.
     *
     * 2026-08-03 — fetch-confirmed across four rounds on a GitHub Actions
     * runner (this dev sandbox cannot reach arcgis.com directly). The
     * first guess was right first try: MAPPLUTO ("Primary Land Use Tax
     * Lot Output"), NYC Department of City Planning's citywide parcel
     * dataset, hosted at services5.arcgis.com/GfwWNkhOj9bNBqoJ/ and
     * independently confirmed via ArcGIS Online catalog search as owned
     * by the real "DCP_GIS" account. copyrightText identifies it as "NYC
     * Department of City Planning, Information Technology Division" with
     * no redistribution restriction found, same as every other county in
     * this registry except Cook County IL. 103 real fields — a rich
     * planning/zoning schema, unusually good for zoning_code, overlay,
     * and physical-characteristics coverage compared to most assessor
     * sources here, but MAPPLUTO is a land-use dataset, not a tax roll:
     * it has no improvement/tax-year/tax-amount/sale-history fields at
     * all, unlike an assessor's office source.
     *
     * MAPPLUTO covers all five NYC boroughs in one layer (Manhattan,
     * Bronx, Brooklyn, Queens, Staten Island), each its own county FIPS —
     * this entry is for New York County (Manhattan) only. Round 3's first
     * attempt to confirm the Borough field's real encoded value came back
     * empty-handed for a boring reason (its own logging helper printed
     * the query response's field schema, not the actual feature
     * attributes — fixed in round 4). Round 4 confirmed real sample
     * records: Borough='MN', BoroCode=1, on BBL values beginning with
     * "1" (e.g. 1000010100) — matching the well-documented PLUTO
     * convention where BBL's leading digit is the borough code. `where`
     * below scopes every query to Borough='MN' so panning near the
     * Harlem River/Bronx border can't pull in a neighboring borough's
     * parcels under this county's name — this is the first jurisdiction
     * in the registry needing that, since every other source here is
     * already single-county at the service level. Required adding
     * optional config.where support to connector-arcgis.js (defaults to
     * '1=1', no behavior change for the other 12 jurisdictions).
     *
     * ZoneDist1/Overlay1 used for zoning_code/overlay_districts (the
     * primary designation) rather than concatenating with ZoneDist2-4/
     * Overlay2, following this registry's standing convention against
     * inventing composite fields. LotFront used for lot_width_ft — NYC's
     * own convention for a lot's street frontage, equivalent to what
     * other jurisdictions call lot width. No owner-mailing, zoning
     * description text, area-in-acres, improvement-value, tax-year/
     * amount, sale-history, subdivision, or legal-description fields
     * exist in this dataset.
     * ─────────────────────────────────────────────────────────────────── */
    '36061': {
      id:          'ny-new-york-county',
      name:        'New York County, New York',
      state:       'NY',
      fips:        '36061',
      connector:   'arcgis',
      serviceUrl:  'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0',
      where:       "Borough = 'MN'",

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'BBL',
        pin:                 'BBL',
        address:             'Address',
        owner:               'OwnerName',
        zoning_code:         'ZoneDist1',
        land_use_code:       'LandUse',
        overlay_districts:   'Overlay1',
        area_sqft:           'LotArea',
        lot_depth_ft:        'LotDepth',
        lot_width_ft:        'LotFront',
        building_count:      'NumBldgs',
        year_built:          'YearBuilt',
        gross_floor_area:    'BldgArea',
        assessed_value:      'AssessTot',
        land_value:          'AssessLand',
        census_tract:        'CT2010',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_desc', 'land_use_desc', 'area_acres',
        'improvement_value', 'tax_year', 'tax_amount', 'last_sale_date',
        'last_sale_price', 'deed_book', 'deed_page', 'subdivision',
        'legal_desc',
      ],

      outFields: null,

      attribution: {
        name:    'NYC Department of City Planning (MapPLUTO)',
        url:     'https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page',
        portal:  'https://www1.nyc.gov/site/planning/data-maps/open-data.page',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Manhattan — major Northeast data center market.',
      },
    },

    /* ── Travis County, Texas (Austin) ────────────────────────────────────
     *
     * Travis County — #14 by facility count (45) in this app's dataset.
     *
     * 2026-08-03 — fetch-confirmed across 2 GitHub Actions-dispatched probe
     * rounds (this dev sandbox cannot reach traviscountytx.gov directly).
     * Round 1's blind subdomain guesses (gis.traviscad.org, maps.traviscad.org)
     * failed at DNS; gis.traviscountytx.gov resolved but 404'd at a guessed
     * path. Round 2 used a web search instead of more blind guessing, which
     * surfaced the real path structure (host uses "server1", not "arcgis",
     * in its REST base path) and confirmed this exact layer live with a
     * real 21-field schema. copyrightText: "Travis Central Appraisal
     * District" — no redistribution restriction found, same as every other
     * county in this registry except Cook County IL.
     *
     * This is the "TCAD_public" layer specifically (there's a sibling
     * "TCAD" MapServer at the same host with an identical-looking parcel
     * layer, and a separate "TCAD_Travis_County_Property" layer that turned
     * out to be Travis-County-owned-property only, not general parcels) —
     * its name and its thin field list (situs address, legal description,
     * acreage, no owner/valuation/zoning at all) both indicate this is a
     * deliberately limited public-facing boundary layer, same pattern as
     * this registry's Virginia counties: the fuller CAMA record (owner,
     * assessed value, sale history) lives behind TCAD's own separate
     * property-search portal (traviscad.org/propertysearch, a third-party
     * ProdigyCAD-hosted system, not a general-purpose queryable service),
     * not this ArcGIS layer. Only 7 of 30 canonical fields map as a result
     * — the thinnest of any Texas source in this registry, but real and
     * honestly documented rather than padded with guesses.
     *
     * situs_address used directly for address (source provides it as a
     * single composite field, alongside the individual situs_num/street/
     * city/zip components — same convention as every other source here:
     * prefer a provided composite over concatenating parts). geo_id used
     * for pin as TCAD's second real identifier alongside PROP_ID. sub_dec
     * mapped to subdivision (Texas CAD convention for "subdivision
     * description"). tcad_acres is a real acreage field, unlike several
     * other counties in this registry where only a raw, unit-unconfirmed
     * Shape.STArea() exists (left unmapped here too, for the same reason).
     * ─────────────────────────────────────────────────────────────────── */
    '48453': {
      id:          'tx-travis-county',
      name:        'Travis County, Texas',
      state:       'TX',
      fips:        '48453',
      connector:   'arcgis',
      serviceUrl:  'https://gis.traviscountytx.gov/server1/rest/services/Boundaries_and_Jurisdictions/TCAD_public/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'PROP_ID',
        pin:                 'geo_id',
        address:             'situs_address',
        area_acres:          'tcad_acres',
        subdivision:         'sub_dec',
        legal_desc:          'legal_desc',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_code', 'land_use_desc', 'overlay_districts', 'area_sqft',
        'lot_depth_ft', 'lot_width_ft', 'building_count', 'year_built',
        'gross_floor_area', 'assessed_value', 'land_value',
        'improvement_value', 'tax_year', 'tax_amount', 'last_sale_date',
        'last_sale_price', 'deed_book', 'deed_page', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Travis Central Appraisal District (TCAD)',
        url:     'https://traviscad.org/',
        portal:  'https://traviscad.org/propertysearch/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Austin — major Texas data center market.',
      },
    },

    /* ── Miami-Dade County, Florida ───────────────────────────────────────
     *
     * Miami-Dade County — #15 by facility count (40) in this app's
     * dataset.
     *
     * 2026-08-03 — fetch-confirmed on a GitHub Actions runner (this dev
     * sandbox cannot reach miamidade.gov directly). A web search
     * surfaced a specific, high-confidence lead instead of blind
     * subdomain guessing — a search result described gisweb.miamidade.gov's
     * "MD_LandInformation" MapServer layer 26 as having "44 confirmed
     * fields" — and it resolved live on the very first probe: 46 real
     * fields (44 attributes + Shape geometry fields), polygon geometry,
     * layer name "Parcels @ PaParcel" (PA = Property Appraiser). One of
     * the richest sources in this registry: real owner names, full
     * site/mailing address components, Florida DOR (Department of
     * Revenue) land-use code AND description, building characteristics
     * (bedroom/bathroom/floor/unit counts, multiple building-area
     * variants), subdivision, and current land/building/total assessed
     * values. No description/copyrightText found on this specific layer
     * (both fields present in the schema but empty) — hosted on the
     * county's own official gisweb subdomain, treated as standard public
     * government data like every other county in this registry except
     * Cook County IL.
     *
     * FOLIO (Miami-Dade's real 13-digit parcel identifier, used
     * everywhere in the county's own public-facing tools) mapped to
     * parcel_id; PID (a distinct internal integer identifier) mapped to
     * pin. TRUE_OWNER1 used for owner — TRUE_OWNER2/3 exist for
     * co-owners but only one canonical owner slot exists, same
     * primary-value convention as NYC's ZoneDist1. TRUE_SITE_ADDR used
     * directly for address (a real composite field, not concatenated
     * from parts). Mailing address is genuinely split across 6 separate
     * fields (ADDR1-3/CITY/STATE/ZIP/COUNTRY) with no composite field of
     * its own, so owner_mailing is correctly left unmapped rather than
     * concatenated, per this registry's standing convention. LOT_SIZE
     * exists but has no accompanying unit-of-measure field to confirm
     * sqft vs. acres, so area_sqft/area_acres are left unmapped — same
     * caution as Maryland's LANDAREA/LUOM and Maricopa's LAND_SIZE
     * precedent, even though BUILDING_GROSS_AREA (a floor-area field,
     * conventionally always sqft) was mapped without that hesitation.
     * No sale-transaction or legal-description fields exist in this
     * particular layer.
     * ─────────────────────────────────────────────────────────────────── */
    '12086': {
      id:          'fl-miami-dade-county',
      name:        'Miami-Dade County, Florida',
      state:       'FL',
      fips:        '12086',
      connector:   'arcgis',
      serviceUrl:  'https://gisweb.miamidade.gov/arcgis/rest/services/MD_LandInformation/MapServer/26',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'FOLIO',
        pin:                 'PID',
        address:             'TRUE_SITE_ADDR',
        owner:               'TRUE_OWNER1',
        zoning_code:         'PRIMARY_ZONE',
        land_use_code:       'DOR_CODE_CUR',
        land_use_desc:       'DOR_DESC',
        building_count:      'BUILDING_COUNT',
        year_built:          'YEAR_BUILT',
        gross_floor_area:    'BUILDING_GROSS_AREA',
        assessed_value:      'TOTAL_VAL_CUR',
        land_value:          'LAND_VAL_CUR',
        improvement_value:   'BUILDING_VAL_CUR',
        tax_year:            'ASSESSMENT_YEAR_CUR',
        subdivision:         'SUBDIVISION',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_desc', 'overlay_districts', 'area_sqft',
        'area_acres', 'lot_depth_ft', 'lot_width_ft', 'tax_amount',
        'last_sale_date', 'last_sale_price', 'deed_book', 'deed_page',
        'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Miami-Dade County Property Appraiser',
        url:     'https://www.miamidade.gov/pa/',
        portal:  'https://www.miamidade.gov/Apps/PA/PropertySearch/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Miami — major Florida data center market.',
      },
    },

    /* ── Bexar County, Texas (San Antonio) ────────────────────────────────
     *
     * Bexar County — #16 by facility count (39) in this app's dataset.
     *
     * 2026-08-03 — fetch-confirmed on the first GitHub Actions-dispatched
     * probe round (this dev sandbox cannot reach bexar.org/arcgis.com
     * directly). A web search surfaced a specific lead instead of blind
     * subdomain guessing — a search result titled "Layer: Bexar CAD
     * Parcels (ID:3)" — and it resolved live immediately: 38 real
     * fields, polygon geometry, layer name "Bexar CAD Parcels".
     * copyrightText: "County Appraisal District / BIS Consultants" —
     * this dataset is Bexar County Appraisal District data as processed
     * and redistributed through TxGIO (Texas Geographic Information
     * Office)'s statewide parcel pipeline (description field cites
     * "Date acquired by TxGIO: July 2025"), not a Bexar-County-hosted
     * service directly, worth noting even though no redistribution
     * restriction was found in either metadata field — same standard
     * public-data caveat as every other county in this registry except
     * Cook County IL.
     *
     * Prop_ID (the CAD's internal property identifier) mapped to
     * parcel_id; GEO_ID (a distinct geographic/legal parcel number)
     * mapped to pin — same two-distinct-identifiers pattern as LA
     * County's AIN/APN. SITUS_ADDR/MAIL_ADDR used directly for address/
     * owner_mailing (real composite fields, alongside — but not built
     * from — their own split component fields SITUS_NUM/STRE/... and
     * MAIL_LINE1/2/CITY/..., same convention as every other split-
     * address source in this registry). MKT_VALUE (market value) used
     * for assessed_value, matching how every other jurisdiction's
     * "total assessed value" concept is represented here. DATE_ACQ
     * (date the current owner acquired the parcel) mapped to
     * last_sale_date. LEGAL_AREA/GIS_AREA both have accompanying unit-
     * of-measure fields (LGL_AREA_U/GIS_AREA_U) but this round didn't
     * sample real feature data to confirm their actual encoded values,
     * so area_sqft/area_acres are left unmapped rather than guessed —
     * same caution as Maryland's LANDAREA/LUOM precedent, just with the
     * added twist that a confirming follow-up round is plausible here
     * if a future pass wants to close that specific gap. STAT_LAND_
     * (State Land Use code) mapped to land_use_code; LOC_LAND_U (a
     * second, local land-use code, not a text description — field
     * names in this source are truncated to 10 characters, a shapefile/
     * dbf convention, which is why several read oddly) is deliberately
     * NOT mapped to land_use_desc, since it's a second code scheme, not
     * free text. No building characteristics (count, floor area) exist
     * in this parcel-focused layer.
     * ─────────────────────────────────────────────────────────────────── */
    '48029': {
      id:          'tx-bexar-county',
      name:        'Bexar County, Texas',
      state:       'TX',
      fips:        '48029',
      connector:   'arcgis',
      serviceUrl:  'https://services7.arcgis.com/BUFM2kw4MpxDUJVh/ArcGIS/rest/services/Bexar_CAD_Parcels/FeatureServer/3',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'Prop_ID',
        pin:                 'GEO_ID',
        address:             'SITUS_ADDR',
        owner:               'OWNER_NAME',
        owner_mailing:       'MAIL_ADDR',
        land_use_code:       'STAT_LAND_',
        year_built:          'YEAR_BUILT',
        assessed_value:      'MKT_VALUE',
        land_value:          'LAND_VALUE',
        improvement_value:   'IMP_VALUE',
        tax_year:            'TAX_YEAR',
        last_sale_date:      'DATE_ACQ',
        legal_desc:          'LEGAL_DESC',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'zoning_code', 'zoning_desc', 'land_use_desc', 'overlay_districts',
        'area_sqft', 'area_acres', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'gross_floor_area', 'tax_amount',
        'last_sale_price', 'deed_book', 'deed_page', 'subdivision',
        'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Bexar County Appraisal District (via TxGIO)',
        url:     'https://www.bcad.org/',
        portal:  'https://www.bcad.org/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'San Antonio — major Texas data center market.',
      },
    },

    /* ── Salt Lake County, Utah ─────────────────────────────────────────
     * Live at services1.arcgis.com (Utah Geospatial Resource Center /
     * UGRC's hosted org), layer "Parcels_SaltLake_LIR" — the statewide
     * Land Information Record (LIR) parcel program, maintained in
     * coordination with the county Assessor and updated monthly per
     * UGRC's own documentation. Confirmed live 2026-08-03 via GitHub
     * Actions dispatch (this sandbox's proxy returns HTTP 403 on
     * arcgis.com directly) with a real 30-field schema. No owner name
     * field exists anywhere in this layer — UGRC's LIR program
     * deliberately omits owner data from its statewide parcel feed
     * (available only through each county's own, non-standardized
     * assessor lookup tools), a structural gap rather than a guess.
     * PARCEL_ID and SERIAL_NUM are two distinct real identifier fields
     * (Utah county assessors commonly expose a separate "serial number"
     * from the parcel ID) mapped separately to parcel_id/pin, same
     * convention as every other jurisdiction with two distinct ID
     * fields. PARCEL_ADD used directly for address (a real field, not
     * built from PARCEL_ADD + the separate PARCEL_CITY field — no
     * canonical "city" field exists in this schema, so PARCEL_CITY is
     * left unused rather than concatenated in, same convention as every
     * other split-address source here). PROP_CLASS/PROP_TYPE mapped to
     * land_use_code/land_use_desc respectively (a short classification
     * code alongside a more descriptive property-type field). PARCEL_
     * ACRES has confirmed units (its name states acres) and is mapped to
     * area_acres; area_sqft is left unmapped since the only area-like
     * alternative, Shape__Area, is a raw geometry-engine value with
     * unconfirmed units, same caution as every other ambiguous-unit area
     * field in this registry. BLDG_SQFT (building square footage, a
     * distinct field from the parcel-area fields) mapped to
     * gross_floor_area. HOUSE_CNT mapped to building_count. TOTAL_MKT_
     * VALUE/LAND_MKT_VALUE mapped to assessed_value/land_value, matching
     * how every other jurisdiction's market-value concept is
     * represented. No improvement value, tax year/amount, sale history,
     * deed references, legal description, or census tract fields exist
     * in this parcel-boundary-focused layer.
     * ─────────────────────────────────────────────────────────────────── */
    '49035': {
      id:          'ut-salt-lake-county',
      name:        'Salt Lake County, Utah',
      state:       'UT',
      fips:        '49035',
      connector:   'arcgis',
      serviceUrl:  'https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'PARCEL_ID',
        pin:                 'SERIAL_NUM',
        address:             'PARCEL_ADD',
        land_use_code:       'PROP_CLASS',
        land_use_desc:       'PROP_TYPE',
        area_acres:          'PARCEL_ACRES',
        gross_floor_area:    'BLDG_SQFT',
        building_count:      'HOUSE_CNT',
        year_built:          'BUILT_YR',
        assessed_value:      'TOTAL_MKT_VALUE',
        land_value:          'LAND_MKT_VALUE',
        subdivision:         'SUBDIV_NAME',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'overlay_districts', 'area_sqft', 'lot_depth_ft', 'lot_width_ft',
        'improvement_value', 'tax_year', 'tax_amount', 'last_sale_date',
        'last_sale_price', 'deed_book', 'deed_page', 'legal_desc',
        'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Utah Geospatial Resource Center (UGRC) / Salt Lake County Assessor',
        url:     'https://gis.utah.gov/products/sgid/cadastre/parcels/',
        portal:  'https://opendata.gis.utah.gov/datasets/utah-salt-lake-county-parcels-lir/about',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Salt Lake City metro — major Utah data center market.',
      },
    },

    /* ── Multnomah County, Oregon ───────────────────────────────────────
     * Live at services5.arcgis.com (Multnomah County's own hosted org),
     * layer "Multnomah County Tax Parcels" — found via the county's own
     * open data portal (gis-multco.opendata.arcgis.com) DCAT catalog
     * after a web-search-guessed candidate at a different org
     * (services3.arcgis.com/tNPgIZWOB0Efvm0g/.../Tax_Lots) turned out,
     * on inspection of its own description/copyrightText, to be Umatilla
     * County OR data — a wrong-county false positive despite that exact
     * URL surfacing repeatedly in search results. Confirmed live
     * 2026-08-03 via GitHub Actions dispatch (this sandbox's proxy
     * returns HTTP 403 on arcgis.com directly) with a real 56-field
     * schema, sourced from the county's own Department of Assessment,
     * Recording and Taxation (a much richer layer than most recently
     * added counties). MAPTAXLOT (Oregon's standard "map and taxlot"
     * number) mapped to parcel_id; PROPID (a distinct account/property
     * ID) mapped to pin — two genuinely distinct identifier fields, same
     * convention as every other jurisdiction with two real ID fields.
     * SITUSADDR used directly for address (a real composite field,
     * alongside — but not built from — its own split components
     * SITUSNUM/DIR/NAME/SUFFIX/...). NAME mapped to owner; no single
     * composite mailing-address field exists (only split
     * ADDR1/ADDR2/CITY/STATE/ZIP), so owner_mailing is left unmapped,
     * same convention as every other split-address source here.
     * PROPCLASS/IMPTYPE mapped to land_use_code/land_use_desc
     * respectively. SIZESQFT/SIZEACRES have confirmed units (their names
     * state sqft/acres) and map to area_sqft/area_acres directly.
     * IMP_COUNT (Improvement Count) mapped to building_count. MAIN_SQFT
     * (main building square footage, distinct from the parcel-area
     * fields) mapped to gross_floor_area. Oregon's constitutional
     * Measure 50 assessed value (ROLLM50) mapped to assessed_value —
     * the correct "official" assessed-value concept for Oregon, distinct
     * from real market value, which isn't separately exposed here;
     * ROLLLAND/ROLLIMP mapped to land_value/improvement_value, ROLLYEAR
     * to tax_year. SALE_DATE/SALE_PRICE mapped to
     * last_sale_date/last_sale_price. deed_book/deed_page are left
     * unmapped — Oregon's recording system uses instrument numbers
     * (INST_NUM), a genuinely different identifier scheme than
     * book/page, not a renamed equivalent. LEGAL (full legal description
     * text) mapped to legal_desc; no separate subdivision-name field
     * exists (TRACTLOT/BLOCK/ADDLEGAL are legal-description components,
     * not a subdivision name), so subdivision is left unmapped.
     * ─────────────────────────────────────────────────────────────────── */
    '41051': {
      id:          'or-multnomah-county',
      name:        'Multnomah County, Oregon',
      state:       'OR',
      fips:        '41051',
      connector:   'arcgis',
      serviceUrl:  'https://services5.arcgis.com/x7DNZL1YqNQVNykA/arcgis/rest/services/Multnomah_County_Taxlot_Parcels/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'MAPTAXLOT',
        pin:                 'PROPID',
        address:             'SITUSADDR',
        owner:               'NAME',
        zoning_code:         'ZONING',
        land_use_code:       'PROPCLASS',
        land_use_desc:       'IMPTYPE',
        area_sqft:           'SIZESQFT',
        area_acres:          'SIZEACRES',
        building_count:      'IMP_COUNT',
        year_built:          'ACTYEARBUILT',
        gross_floor_area:    'MAIN_SQFT',
        assessed_value:      'ROLLM50',
        land_value:          'ROLLLAND',
        improvement_value:   'ROLLIMP',
        tax_year:            'ROLLYEAR',
        last_sale_date:      'SALE_DATE',
        last_sale_price:     'SALE_PRICE',
        legal_desc:          'LEGAL',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_desc', 'overlay_districts',
        'lot_depth_ft', 'lot_width_ft', 'tax_amount', 'deed_book',
        'deed_page', 'subdivision', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Multnomah County Department of Assessment, Recording and Taxation',
        url:     'https://www.multco.us/assessment-taxation',
        portal:  'https://gis-multco.opendata.arcgis.com/datasets/multco::multnomah-county-taxlot-parcels',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Portland metro — major Oregon data center market.',
      },
    },

    /* ── Davidson County, Tennessee ─────────────────────────────────────
     * Live at maps.nashville.gov (Nashville/Davidson County's own
     * MetroGIS host), layer "Ownership Parcels"
     * (Cadastral/Parcels/MapServer/0) — confirmed live 2026-08-03 via
     * GitHub Actions dispatch (this sandbox's proxy returns HTTP 403 on
     * similar hosts directly), first-probe success with a real 58-field
     * schema. copyrightText "MetroGIS" confirms this is genuinely
     * Nashville/Davidson County's own official platform (the county's
     * State Plane variant, Parcels_SP, does not actually exist as a
     * separate service — confirmed via a real "Service ... not found"
     * ArcGIS error, not a guess gone wrong). APN (Assessor Parcel
     * Number) mapped to parcel_id; STANPAR (a distinct standardized
     * parcel-number field) mapped to pin — two genuinely distinct
     * identifier fields, same convention as every other jurisdiction
     * with two real ID fields. PropAddr used directly for address (a
     * real composite field, alongside — but not built from — its own
     * split components PropHouse/PropStreet/PropSuite/PropCity/...).
     * Owner mapped to owner; no single composite mailing-address field
     * exists (only split OwnAddr1/2/3/OwnCity/OwnState/OwnCountry/
     * OwnZip), so owner_mailing is left unmapped, same convention as
     * every other split-address source here. LUCode/LUDesc mapped
     * directly to land_use_code/land_use_desc — a clean code+
     * description pair, unlike several other jurisdictions' ambiguous
     * single-code sources. Front/Side (classic CAMA lot-dimension
     * fields) mapped to lot_width_ft/lot_depth_ft respectively. Acres
     * has confirmed units (name states acres) and maps to area_acres;
     * area_sqft is left unmapped since the only alternative, StatedArea,
     * has unconfirmed units, same caution applied to every other
     * ambiguous-unit area field in this registry. No year-built or
     * building-count field exists in this parcel-focused layer (it
     * tracks land/ownership/valuation, not building characteristics).
     * TotlAssd/LandAssd/ImprAssd (the Tennessee assessment-ratio
     * "assessed value" figures, distinct from the source's separate
     * LandAppr/ImprAppr/TotlAppr "appraised" — 100%-of-market — figures)
     * mapped to assessed_value/land_value/improvement_value, kept
     * consistently on the assessed basis rather than mixing with
     * appraised values. OwnDate (date the current owner acquired the
     * parcel) mapped to last_sale_date; SalePrice to last_sale_price.
     * LegalDesc mapped to legal_desc; Tract mapped to census_tract. No
     * deed book/page (OwnInstr/PropInstr are instrument numbers, a
     * different recording scheme) or subdivision-name field exists.
     * ─────────────────────────────────────────────────────────────────── */
    '47037': {
      id:          'tn-davidson-county',
      name:        'Davidson County, Tennessee',
      state:       'TN',
      fips:        '47037',
      connector:   'arcgis',
      serviceUrl:  'https://maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'APN',
        pin:                 'STANPAR',
        address:             'PropAddr',
        owner:               'Owner',
        zoning_code:         'Zoning',
        land_use_code:       'LUCode',
        land_use_desc:       'LUDesc',
        area_acres:          'Acres',
        lot_depth_ft:        'Side',
        lot_width_ft:        'Front',
        assessed_value:      'TotlAssd',
        land_value:          'LandAssd',
        improvement_value:   'ImprAssd',
        last_sale_date:      'OwnDate',
        last_sale_price:     'SalePrice',
        legal_desc:          'LegalDesc',
        census_tract:        'Tract',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_desc', 'overlay_districts', 'area_sqft',
        'building_count', 'year_built', 'gross_floor_area', 'tax_year',
        'tax_amount', 'deed_book', 'deed_page', 'subdivision',
      ],

      outFields: null,

      attribution: {
        name:    'Metro Nashville & Davidson County (MetroGIS)',
        url:     'https://www.nashville.gov/departments/planning/mapping-and-gis',
        portal:  'https://maps.nashville.gov/ParcelViewer/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Nashville metro — major Tennessee data center market.',
      },
    },

    /* ── Philadelphia, Pennsylvania ─────────────────────────────────────
     * Live at mapservices.pasda.psu.edu (PASDA, Pennsylvania's state
     * university-hosted GIS clearinghouse), layer "Philadelphia DOR
     * Parcels 202402" (CityPhilly/MapServer/14) — confirmed live
     * 2026-08-03 via GitHub Actions dispatch (this sandbox's proxy
     * returns HTTP 403 on similar hosts directly) with a real 25-field
     * schema, sourced from the city's Department of Records deed/metes-
     * and-bounds registry (weekly updates, description explicitly flags
     * "Public= Y"). Found over 5 probe rounds: round 1 found a much
     * richer 78-field dataset, OPA_PROPERTIES_PUBLIC (Office of
     * Property Assessment) — real owner, address, market/taxable value,
     * sale history, building characteristics — but its geometryType is
     * esriGeometryPoint, not Polygon; this registry's Leaflet renderer
     * (js/parcel/renderer.js) draws parcels via L.geoJSON with a
     * polygon fillColor/weight style, so Point features would fall back
     * to Leaflet's default marker rendering, the same architectural
     * blocker that ruled out Clark County NV's BOE_Parcels earlier this
     * session — see AI_TEAM_STATUS.md for the full trail and a human
     * recommendation to consider extending the renderer to support
     * point-geometry jurisdictions via a custom pointToLayer, which
     * would unlock that much richer dataset. This entry uses the
     * confirmed Polygon boundary layer instead — genuinely thinner (no
     * assessed value or building characteristics; that data only exists
     * in the point dataset), but still carries real owner and address
     * fields, unlike a pure boundary-only add. PARCELID mapped to
     * parcel_id; TENCODE (the deed registry's own ten-digit map/parcel
     * code, described in the layer's own metadata) mapped to pin — two
     * genuinely distinct identifier fields. OWNER1 mapped to owner; no
     * owner_mailing field exists (OWNER2 is a second owner name, not a
     * mailing address). BC_LANDUSE/BC_TYPE mapped to land_use_code/
     * land_use_desc. IMPERV_ARE/IMP_ROOF/IMP_GROUND/IMP_TOTAL/
     * NATURAL_GR/TOTAL_GROU are impervious-surface coverage metrics for
     * the city's stormwater billing program (confirmed by the
     * accompanying PROGRAM field), a different concept than parcel lot
     * area — deliberately NOT mapped to area_sqft/area_acres rather
     * than force-fit, same caution as every other ambiguous-field
     * source in this registry. No value, building-count, year-built,
     * sale-history, deed-book/page, or legal-description fields exist
     * in this boundary-focused layer.
     * ─────────────────────────────────────────────────────────────────── */
    '42101': {
      id:          'pa-philadelphia',
      name:        'Philadelphia, Pennsylvania',
      state:       'PA',
      fips:        '42101',
      connector:   'arcgis',
      serviceUrl:  'https://mapservices.pasda.psu.edu/server/rest/services/pasda/CityPhilly/MapServer/14',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'PARCELID',
        pin:                 'TENCODE',
        address:             'ADDRESS',
        owner:               'OWNER1',
        land_use_code:       'BC_LANDUSE',
        land_use_desc:       'BC_TYPE',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'area_sqft', 'area_acres', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'year_built', 'gross_floor_area',
        'assessed_value', 'land_value', 'improvement_value', 'tax_year',
        'tax_amount', 'last_sale_date', 'last_sale_price', 'deed_book',
        'deed_page', 'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'City of Philadelphia Department of Records (via PASDA)',
        url:     'https://www.phila.gov/departments/office-of-property-assessment/',
        portal:  'https://www.pasda.psu.edu/uci/DataSummary.aspx?dataset=462',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Philadelphia metro — major Pennsylvania data center market.',
      },
    },

    /* ── Sacramento County, California ──────────────────────────────────
     * Live at services1.arcgis.com (Sacramento County's own hosted
     * org), layer "Parcels" — found via the county's own open data
     * portal (data-sacramentocounty.opendata.arcgis.com) DCAT catalog.
     * Confirmed live 2026-08-03 via GitHub Actions dispatch (this
     * sandbox's proxy returns HTTP 403 on arcgis.com directly) with a
     * real 22-field schema. This is a cadastral/land-use boundary
     * layer with no owner or assessed-value fields at all — that data
     * lives in a separate "Assessor Parcel Viewer" app on the same
     * portal (assessorparcelviewer.saccounty.gov), not yet confirmed to
     * expose its own queryable ArcGIS service; accepted as a thin-but-
     * real add rather than chasing a further round, same precedent as
     * Travis County TX and Philadelphia PA's boundary-only layers. APN
     * mapped to parcel_id; PRCL_KEY (a distinct internal parcel key,
     * separate from the public-facing APN) mapped to pin. No composite
     * address field exists (only split STREET_NBR/STREET_NAM, no unit,
     * no combined city/zip), so address is left unmapped rather than
     * built from parts, same convention as every other split-address
     * source in this registry. LANDUSE/LU_GENERAL mapped to
     * land_use_code/land_use_desc — the primary tier of a deeper
     * land-use hierarchy (LU_SPECIF/LU_DETAIL/LU_USE/LU_SEC_USE exist
     * but have no canonical home in this schema). LOT_SIZE is left
     * unmapped for both area_sqft and area_acres since its unit isn't
     * confirmed by the field name, same caution as every other
     * ambiguous-unit area field here. SUBDIVISIO (Subdivision, a
     * shapefile/dbf-truncated field name) mapped to subdivision. No
     * value, building-characteristic, sale-history, deed-reference, or
     * legal-description-text fields exist in this boundary-focused
     * layer.
     * ─────────────────────────────────────────────────────────────────── */
    '06067': {
      id:          'ca-sacramento-county',
      name:        'Sacramento County, California',
      state:       'CA',
      fips:        '06067',
      connector:   'arcgis',
      serviceUrl:  'https://services1.arcgis.com/5NARefyPVtAeuJPU/arcgis/rest/services/Parcels/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:           'APN',
        pin:                 'PRCL_KEY',
        land_use_code:       'LANDUSE',
        land_use_desc:       'LU_GENERAL',
        subdivision:         'SUBDIVISIO',
        county_fips:         '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'overlay_districts', 'area_sqft', 'area_acres', 'lot_depth_ft',
        'lot_width_ft', 'building_count', 'year_built', 'gross_floor_area',
        'assessed_value', 'land_value', 'improvement_value', 'tax_year',
        'tax_amount', 'last_sale_date', 'last_sale_price', 'deed_book',
        'deed_page', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Sacramento County GIS / Assessor',
        url:     'https://assessor.saccounty.gov/',
        portal:  'https://data-sacramentocounty.opendata.arcgis.com/datasets/sacramentocounty::parcels',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Sacramento metro — major California data center market.',
      },
    },

    /* ───────────────────────────────────────────────────────────────────
     * Cuyahoga County, Ohio (Cleveland) — found via the county's own
     * open-data DCAT catalog (dataset "Parcel Fabric Taxparcels"), which
     * pointed directly at this ArcGIS GeoServices REST layer served under
     * a "CCFO" (Cuyahoga County Fiscal Officer) service folder on the
     * county's own gis.cuyahogacounty.gov domain — the county's own
     * authoritative tax-parcel source, Polygon geometry, 142 fields.
     * One of the richest sources found this session. parcel_id and
     * zoning_code map field-for-field. address maps to the source's own
     * pre-combined par_addr_all field (not concatenated by us). owner
     * maps to parcel_owner (second_owner exists but is not part of the
     * canonical schema). Land use has four parallel LUC systems (tax,
     * ext, abt, tif); tax_luc/tax_luc_description chosen as the primary
     * current tax land-use classification. area_sqft mapped to
     * parcel_lot_size (integer, distinct from parcel_acreage). Valuation
     * fields map to the current tax-roll assessed values (not the
     * certified/prior-year variants, of which there are several).
     * last_sale_date/price map to last_transfer_date/last_sales_amount.
     * owner_mailing left unmapped: the source splits it into five
     * separate component fields (mail_name, mail_addr_street,
     * mail_unit_no, mail_city, mail_state, mail_zip) with no combined
     * field, consistent with the established practice of not
     * concatenating multi-component source fields ourselves. deed_book
     * and deed_page also left unmapped: the source provides both as one
     * already-combined book_page string, which cannot be cleanly split
     * into the two separate canonical fields without fabricating a
     * split. building_count, year_built, and gross_floor_area left
     * unmapped: the source splits building stats into parallel
     * residential (res_bldg_count, total_res_liv_area, min/max_res_age)
     * and commercial (com_bldg_count, total_com_use_area, min/max_com_age)
     * variants with no unified total or single year-built field — mapping
     * only the residential half would misrepresent commercial parcels.
     * No subdivision, overlay_districts, lot_depth_ft/lot_width_ft
     * (only a combined total_legal_front frontage figure), or
     * census_tract fields exist. No description or copyrightText was
     * returned by the service; treated as an official county government
     * platform (own domain, own Fiscal Officer's data) rather than a
     * red flag.
     * ─────────────────────────────────────────────────────────────────── */
    '39035': {
      id:          'oh-cuyahoga-county',
      name:        'Cuyahoga County, Ohio',
      state:       'OH',
      fips:        '39035',
      connector:   'arcgis',
      serviceUrl:  'https://gis.cuyahogacounty.gov/server/rest/services/CCFO/Parcel_Fabric_Taxparcels/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:          'parcel_id',
        pin:                'parcelpin',
        address:            'par_addr_all',
        owner:              'parcel_owner',
        zoning_code:        'zoning_code',
        zoning_desc:        'zoning_use',
        land_use_code:      'tax_luc',
        land_use_desc:      'tax_luc_description',
        area_sqft:          'parcel_lot_size',
        area_acres:         'parcel_acreage',
        assessed_value:     'tax_assessed_total',
        land_value:         'tax_assessed_land',
        improvement_value:  'tax_assessed_improvement',
        tax_year:           'cur_tax_year',
        tax_amount:         'net_tax_total',
        last_sale_date:     'last_transfer_date',
        last_sale_price:    'last_sales_amount',
        legal_desc:         'legal_description',
        county_fips:        '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'overlay_districts', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'year_built', 'gross_floor_area', 'deed_book',
        'deed_page', 'subdivision', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Cuyahoga County Fiscal Officer',
        url:     'https://fiscalofficer.cuyahogacounty.gov/',
        portal:  'https://data-cuyahogacounty.opendata.arcgis.com/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Cleveland metro — Ohio data center market.',
      },
    },

    /* ───────────────────────────────────────────────────────────────────
     * Wake County, North Carolina (Raleigh) — found on round 1: the
     * county's own open-data DCAT catalog listed a "Parcels" dataset
     * ("maintained by the Wake County GIS Property Mapping Team") whose
     * ArcGIS GeoServices REST distribution URL exactly matched a direct
     * guess at the county's own maps.wake.gov ArcGIS Server, confirmed
     * live with 60 fields and Polygon geometry — the richest source
     * found this session (20 of 30 canonical fields mapped). Wake
     * County uses two parallel parcel identifier schemes: PIN_NUM
     * (the primary Property Identification Number) mapped to
     * parcel_id, and REID (Real Estate ID, a secondary identifier) to
     * pin. address maps to the source's own pre-combined SITE_ADDRESS
     * field rather than the split STNUM/STPRE/STNAME/STYPE/STSUF/STMISC
     * component fields. owner_mailing left unmapped: ADDR1/ADDR2/ADDR3
     * are pre-formatted mailing-address lines with no single combined
     * field, consistent with not concatenating multi-line source data
     * ourselves. No zoning field exists (only TYPE_AND_USE/
     * TYPE_USE_DECODE land-use classification, mapped to land_use_code/
     * land_use_desc). area_sqft mapped to CALC_AREA: distinct from the
     * separately-present DEED_ACRES (mapped to area_acres) and from the
     * native SHAPE.AREA geometry field, its naming strongly implies a
     * GIS-calculated area in square feet rather than acres. Valuation
     * fields map to TOTAL_VALUE_ASSD/LAND_VAL/BLDG_VAL, the current
     * assessed values; no tax_year or tax_amount field exists (billing
     * data lives outside this GIS layer). gross_floor_area mapped to
     * HEATEDAREA (heated building area — the closest available building
     * size metric; may undercount unheated space like garages).
     * deed_book/deed_page map field-for-field (DEED_BOOK/DEED_PAGE) —
     * the first county in this registry to provide them as two
     * genuinely separate fields rather than one combined string.
     * legal_desc mapped to PROPDESC (Property Description). No
     * subdivision or census_tract field exists.
     * ─────────────────────────────────────────────────────────────────── */
    '37183': {
      id:          'nc-wake-county',
      name:        'Wake County, North Carolina',
      state:       'NC',
      fips:        '37183',
      connector:   'arcgis',
      serviceUrl:  'https://maps.wake.gov/arcgis/rest/services/Property/Parcels/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:          'PIN_NUM',
        pin:                'REID',
        address:            'SITE_ADDRESS',
        owner:              'OWNER',
        land_use_code:      'TYPE_AND_USE',
        land_use_desc:      'TYPE_USE_DECODE',
        area_sqft:          'CALC_AREA',
        area_acres:         'DEED_ACRES',
        building_count:     'TOTSTRUCTS',
        year_built:         'YEAR_BUILT',
        gross_floor_area:   'HEATEDAREA',
        assessed_value:     'TOTAL_VALUE_ASSD',
        land_value:         'LAND_VAL',
        improvement_value:  'BLDG_VAL',
        last_sale_date:     'SALE_DATE',
        last_sale_price:    'TOTSALPRICE',
        deed_book:          'DEED_BOOK',
        deed_page:          'DEED_PAGE',
        legal_desc:         'PROPDESC',
        county_fips:        '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'lot_depth_ft', 'lot_width_ft', 'tax_year', 'tax_amount',
        'subdivision', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Wake County GIS Property Mapping',
        url:     'https://www.wake.gov/departments-government/tax-administration',
        portal:  'https://data-wake.opendata.arcgis.com/datasets/Wake::parcels-1',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Raleigh metro — North Carolina data center market.',
      },
    },

    /* ───────────────────────────────────────────────────────────────────
     * Polk County, Iowa (Des Moines) — a deliberately thin add. The
     * county's own gis4.polkcountyiowa.gov ArcGIS Server exposes a
     * genuinely rich normalized CAMA dataset via the Polk_County_Parcels
     * FeatureServer: this "Cadastral Parcels" boundary layer (id 1,
     * Polygon geometry) plus four separate non-spatial tables joinable
     * by ParcelNumber — Parcel (legal description, deed book/page,
     * acreage/sqft), Situs Address (full street-address components),
     * Value (taxable/assessed land, building, dwelling, and total
     * values), and Owners Mail (owner name and full mailing address).
     * That richer data is NOT usable here: js/parcel/connector-arcgis.js
     * fetches attributes from a single configured serviceUrl via one
     * /query call and has no support for joining a boundary layer's
     * geometry to related non-spatial tables — the same class of
     * architectural gap that blocked Philadelphia's point-geometry OPA
     * dataset and Clark County NV's BOE_Parcels, documented as a
     * follow-up opportunity in AI_TEAM_STATUS.md (a human could extend
     * the connector to resolve related tables by a shared parcel-number
     * key). This entry uses only the boundary layer's own 8 fields:
     * OBJECTID, Parcel_Number, Alternate_Parcel, HouseNo, GlobalID,
     * last_edited_date, Shape__Area, Shape__Length. parcel_id maps to
     * Parcel_Number. pin maps to Alternate_Parcel — most likely a
     * legacy/historical parcel-number cross-reference given the
     * "Parcel" table's own field naming (ParcelNumber alongside a
     * separate AlternateParcel), but still a genuine distinct
     * identifier value worth surfacing. address is left unmapped:
     * HouseNo is a bare house number with no street name, not a usable
     * site address. No land-use, value, owner, or legal-description
     * data exists on this layer itself — only real, live, official
     * Polk County Auditor boundary geometry plus two identifiers.
     * ─────────────────────────────────────────────────────────────────── */
    '19153': {
      id:          'ia-polk-county',
      name:        'Polk County, Iowa',
      state:       'IA',
      fips:        '19153',
      connector:   'arcgis',
      serviceUrl:  'https://gis4.polkcountyiowa.gov/server/rest/services/Public/Polk_County_Parcels/FeatureServer/1',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:   'Parcel_Number',
        pin:         'Alternate_Parcel',
        county_fips: '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_code', 'land_use_desc', 'overlay_districts', 'area_sqft',
        'area_acres', 'lot_depth_ft', 'lot_width_ft', 'building_count',
        'year_built', 'gross_floor_area', 'assessed_value', 'land_value',
        'improvement_value', 'tax_year', 'tax_amount', 'last_sale_date',
        'last_sale_price', 'deed_book', 'deed_page', 'subdivision',
        'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Polk County Auditor / GIS',
        url:     'https://www.polkcountyiowa.gov/auditor/',
        portal:  'https://gis4.polkcountyiowa.gov/server/rest/services/Public/Polk_County_Parcels/FeatureServer',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Des Moines metro — Iowa data center market. Only boundary/identifier data is exposed here; a richer joinable CAMA dataset exists but requires a connector enhancement (see AI_TEAM_STATUS.md).',
      },
    },

    /* ───────────────────────────────────────────────────────────────────
     * Washington County, Oregon (Hillsboro/Portland metro) — a gap
     * discovered in the facility-count priority queue (36 facilities,
     * ranked above several already-covered counties but never
     * investigated). Found over 4 rounds: rounds 1-2 exhausted guessed
     * county-hosted URLs and a resolved Metro item that turned out to
     * be a static Shapefile download, not a live service; round 3's
     * DCAT catalog search on Oregon Metro's own RLIS Discovery ArcGIS
     * Hub portal (custom domain, not *.opendata.arcgis.com) found the
     * real dataset directly: "Taxlots (Public)", a standardized
     * regional layer compiled by Metro from Clackamas, Multnomah, and
     * Washington Counties' own assessor records; round 4 confirmed it
     * live with 32 fields and real Polygon geometry. This is a
     * regional multi-county service — Multnomah County OR (FIPS 41051)
     * already has its own separate entry above using its own county-
     * hosted service; this entry adds a `where` clause
     * (COUNTY = 'Washington') so query results are always scoped to
     * Washington County regardless of viewport bounds near the county
     * line, on top of the connector's normal spatial-bounds filtering.
     * parcel_id maps to TLID (Tax Lot ID); pin to PRIMACCNUM (Primary
     * Account Number, the assessor's own distinct account identifier;
     * an ALTACCNUM field also exists but only one identifier maps to
     * pin). owner and owner_mailing are left unmapped: the dataset's
     * own description states it explicitly excludes ownership
     * information (OWNERTYPE is a public/private classification, not
     * an owner name). area_acres maps to A_T_ACRES (the assessor's own
     * total acreage) rather than the separately-present GIS_ACRES (a
     * GIS-calculated value), preferring the authoritative source
     * figure. No zoning, tax year/amount, deed reference, subdivision,
     * legal description, or census tract fields exist.
     * ─────────────────────────────────────────────────────────────────── */
    '41067': {
      id:          'or-washington-county',
      name:        'Washington County, Oregon',
      state:       'OR',
      fips:        '41067',
      connector:   'arcgis',
      serviceUrl:  "https://services2.arcgis.com/McQ0OlIABe29rJJy/arcgis/rest/services/Taxlots_(Public)/FeatureServer/3",
      where:       "COUNTY = 'Washington'",

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:          'TLID',
        pin:                'PRIMACCNUM',
        address:            'SITEADDR',
        land_use_code:      'PROP_CODE',
        land_use_desc:      'LANDUSE',
        area_acres:         'A_T_ACRES',
        year_built:         'YEARBUILT',
        gross_floor_area:   'BLDGSQFT',
        assessed_value:     'ASSESSVAL',
        land_value:         'LANDVAL',
        improvement_value:  'BLDGVAL',
        last_sale_date:     'SALEDATE',
        last_sale_price:    'SALEPRICE',
        county_fips:        '__computed__',
      },

      notProvidedBySource: [
        'owner', 'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'area_sqft', 'lot_depth_ft', 'lot_width_ft', 'building_count',
        'tax_year', 'tax_amount', 'deed_book', 'deed_page', 'subdivision',
        'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Oregon Metro RLIS (compiled from Washington County Assessment & Taxation)',
        url:     'https://www.washingtoncountyor.gov/at',
        portal:  'https://rlisdiscovery.oregonmetro.gov/datasets/drcMetro::taxlots-public',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Hillsboro/Portland metro — Oregon data center market. Regional dataset covering Clackamas, Multnomah, and Washington Counties; scoped here to Washington County via a where clause.',
      },
    },

    /* ───────────────────────────────────────────────────────────────────
     * Suffolk County, Massachusetts (Boston metro) — a deliberately
     * thin add, found over 6 rounds. Rounds 1-2 exhausted a wrong
     * ArcGIS org guess and an unreachable state-hosted proxy host;
     * round 3's DCAT catalog search on MassGIS's own open-data portal
     * (gis.data.mass.gov) found the real statewide "Massachusetts
     * Property Tax Parcels" service directly among 295 "parcel"
     * matches; round 4 confirmed one of its layers (GISDATA.L3_ASSESS)
     * is exceptionally rich — 41 fields including full owner name/
     * mailing address, assessed/land/building values, sale history
     * (date/price/book/page), and building characteristics — but it
     * has no geometryType/extent/spatialReference at all: a non-spatial
     * attribute table, not the boundary layer. js/parcel/
     * connector-arcgis.js fetches from a single configured serviceUrl
     * and cannot join a boundary layer to a related table — the same
     * architectural gap already documented for Polk County IA's
     * near-identical situation. Round 5 listed the service's full
     * layer catalog and found the real boundary layer ("Tax Parcels",
     * id 1, Polygon geometry); round 6 confirmed its own field schema:
     * only 19 fields, almost entirely IDs and cartographic metadata
     * (POLY_TYPE, MAP_NO, SOURCE, PLAN_ID, BND_CHK, SYM1/SYM2), with no
     * address/owner/value/use-description data of its own. parcel_id
     * maps to MAP_PAR_ID (the traditional assessor's map-and-lot
     * identifier); pin maps to LOC_ID (MassGIS's standardized location
     * ID — also the join key the rich GISDATA.L3_ASSESS table uses,
     * confirming both tables describe the same real parcels even
     * though they can't be combined here). land_use_code maps to
     * LU_CODES. This is the county's own official Commonwealth of
     * Massachusetts (MassGIS) data — real, live, and joinable to a
     * genuinely rich dataset that a human could unlock by extending the
     * connector, documented as a follow-up opportunity in
     * AI_TEAM_STATUS.md alongside Polk County IA's identical case.
     * ─────────────────────────────────────────────────────────────────── */
    '25025': {
      id:          'ma-suffolk-county',
      name:        'Suffolk County, Massachusetts',
      state:       'MA',
      fips:        '25025',
      connector:   'arcgis',
      serviceUrl:  'https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/MassachusettsPropertyTaxParcels/FeatureServer/1',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:     'MAP_PAR_ID',
        pin:           'LOC_ID',
        land_use_code: 'LU_CODES',
        county_fips:   '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_desc', 'overlay_districts', 'area_sqft', 'area_acres',
        'lot_depth_ft', 'lot_width_ft', 'building_count', 'year_built',
        'gross_floor_area', 'assessed_value', 'land_value', 'improvement_value',
        'tax_year', 'tax_amount', 'last_sale_date', 'last_sale_price',
        'deed_book', 'deed_page', 'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'MassGIS (Commonwealth of Massachusetts Office of Geographic Information)',
        url:     'https://www.mass.gov/orgs/massgis-bureau-of-geographic-information',
        portal:  'https://gis.data.mass.gov/datasets/massgis::gisdata-l3-assess',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Boston metro — Massachusetts data center market. A much richer joinable assessors’ database table exists (GISDATA.L3_ASSESS) but requires a connector enhancement (see AI_TEAM_STATUS.md).',
      },
    },

    '12057': {
      id:          'fl-hillsborough-county',
      name:        'Hillsborough County, Florida',
      state:       'FL',
      fips:        '12057',
      connector:   'arcgis',
      serviceUrl:  'https://gis.tpcmaps.org/arcgis/rest/services/Parcels/MapServer/2',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:         'FOLIO',
        pin:                'PIN',
        address:            'SITE_ADDR',
        owner:              'OWNER',
        land_use_code:      'DOR_CODE',
        land_use_desc:      'DOR_DESC',
        area_acres:         'PAR_ACREAGE',
        building_count:     'tBLDGS',
        year_built:         'ACT',
        gross_floor_area:   'HEAT_AR',
        assessed_value:     'ASD_VAL',
        land_value:         'LAND',
        improvement_value:  'BLDG',
        last_sale_date:     'S_DATE',
        last_sale_price:    'S_AMT',
        subdivision:        'SUB',
        legal_desc:         'LEGAL1',
        county_fips:        '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'area_sqft', 'lot_depth_ft', 'lot_width_ft', 'tax_year', 'tax_amount',
        'deed_book', 'deed_page', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Hillsborough County Property Appraiser',
        url:     'https://www.hcpafl.org/',
        portal:  'https://gis.tpcmaps.org/arcgis/rest/services/Parcels/MapServer/2',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Tampa metro — Florida data center market. Hosted via the Tampa Hillsborough Planning Commission GIS (tpcmaps.org); official Hillsborough County Property Appraiser parcel data, updated quarterly.',
      },
    },

    '25017': {
      id:          'ma-middlesex-county',
      name:        'Middlesex County, Massachusetts',
      state:       'MA',
      fips:        '25017',
      connector:   'arcgis',
      serviceUrl:  'https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/MassachusettsPropertyTaxParcels/FeatureServer/1',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:     'MAP_PAR_ID',
        pin:           'LOC_ID',
        land_use_code: 'LU_CODES',
        county_fips:   '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_desc', 'overlay_districts', 'area_sqft', 'area_acres',
        'lot_depth_ft', 'lot_width_ft', 'building_count', 'year_built',
        'gross_floor_area', 'assessed_value', 'land_value', 'improvement_value',
        'tax_year', 'tax_amount', 'last_sale_date', 'last_sale_price',
        'deed_book', 'deed_page', 'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'MassGIS (Commonwealth of Massachusetts Office of Geographic Information)',
        url:     'https://www.mass.gov/orgs/massgis-bureau-of-geographic-information',
        portal:  'https://gis.data.mass.gov/datasets/massgis::gisdata-l3-assess',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Boston metro suburbs (incl. Cambridge) — Massachusetts data center market. Same statewide "Massachusetts Property Tax Parcels" service already used for Suffolk County; this boundary layer has no county- or town-name field to scope by, but the connector already filters by map viewport bounds on every fetch, so results are correctly restricted to Middlesex when the map is centered there. A much richer joinable assessors’ database table exists (GISDATA.L3_ASSESS) but requires a connector enhancement (see AI_TEAM_STATUS.md) — same architectural gap as Polk County IA and Suffolk County MA.',
      },
    },

    '39061': {
      id:          'oh-hamilton-county',
      name:        'Hamilton County, Ohio',
      state:       'OH',
      fips:        '39061',
      connector:   'arcgis',
      serviceUrl:  'https://cagisonline.hamilton-co.org/arcgis/rest/services/HCE/Cadastral/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:        'PARCELID',
        pin:              'AUDPCLID',
        owner:            'OWNNM1',
        land_use_code:    'CLASS',
        area_acres:       'ACREDEED',
        lot_width_ft:     'FRONT_FOOTAGE',
        assessed_value:   'MKT_TOTAL_VAL',
        land_value:       'MKTLND',
        improvement_value: 'MKTIMP',
        tax_amount:       'ANNUAL_TAXES',
        last_sale_date:   'SALDAT',
        last_sale_price:  'SALAMT',
        deed_book:        'BOOK',
        deed_page:        'PAGE',
        legal_desc:       'LGLDS1',
        county_fips:      '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner_mailing', 'zoning_code', 'zoning_desc', 'land_use_desc',
        'overlay_districts', 'area_sqft', 'lot_depth_ft', 'building_count',
        'year_built', 'gross_floor_area', 'tax_year', 'subdivision', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'CAGIS (Cincinnati Area Geographic Information System)',
        url:     'https://www.hamiltoncountyohio.gov/government/departments/planning_and_development/community_planning/maps_and_gis.php',
        portal:  'https://cagisonline.hamilton-co.org/cagisonline/',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Cincinnati metro — Ohio data center market. Site/mailing address fields are split into multiple components (number/street/suffix, or name/line1/line2/city/state/zip) with no single combined field, so address and owner_mailing aren’t mapped. assessed_value/land_value/improvement_value map to this layer’s MKT_* (market value) fields — Ohio’s statutory assessed value is a fixed 35% conversion of market value not separately exposed in this GIS layer.',
      },
    },

    '42003': {
      id:          'pa-allegheny-county',
      name:        'Allegheny County, Pennsylvania',
      state:       'PA',
      fips:        '42003',
      connector:   'arcgis',
      serviceUrl:  'https://mapservices.pasda.psu.edu/server/rest/services/pasda/AlleghenyCounty/MapServer/25',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:   'PIN',
        pin:         'MAPBLOCKLO',
        area_acres:  'CALCACREAG',
        county_fips: '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_code', 'land_use_desc', 'overlay_districts', 'area_sqft',
        'lot_depth_ft', 'lot_width_ft', 'building_count', 'year_built',
        'gross_floor_area', 'assessed_value', 'land_value', 'improvement_value',
        'tax_year', 'tax_amount', 'last_sale_date', 'last_sale_price',
        'deed_book', 'deed_page', 'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Allegheny County, PA (via PASDA — Pennsylvania Spatial Data Access)',
        url:     'https://www.alleghenycounty.us/Government/Department-Directory/Geographic-Information-Systems-GIS',
        portal:  'https://www.pasda.psu.edu/uci/DataSummary.aspx?dataset=1214',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Pittsburgh metro — Pennsylvania data center market. The county’s own ArcGIS Server (maps.pasda.psu.edu’s AlleghenyCountyParcels service) was unreachable (ArcGIS "not started" on repeated retries); this uses a currently-dated parcels layer found in PASDA’s own regional mirror instead. Only boundary/identifier data is exposed here; Allegheny County’s Real Estate/CAMA assessment data lives in a separate, not-yet-confirmed system.',
      },
    },

    '18097': {
      id:          'in-marion-county',
      name:        'Marion County, Indiana',
      state:       'IN',
      fips:        '18097',
      connector:   'arcgis',
      serviceUrl:  'https://gis.indy.gov/server/rest/services/MapIndy/MapIndyProperty/MapServer/10',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:         'PARCEL_C',
        pin:               'STATEPARCELNUMBER',
        owner:             'FULLOWNERNAME',
        land_use_code:     'PROPERTY_CLASS',
        land_use_desc:     'PROPERTY_SUB_CLASS_DESCRIPTION',
        area_sqft:         'ESTSQFT',
        area_acres:        'ACREAGE',
        assessed_value:    'ASSESSORYEAR_TOTALAV',
        land_value:        'ASSESSORYEAR_LANDTOTAL',
        improvement_value: 'ASSESSORYEAR_IMPTOTAL',
        subdivision:       'SUBDIVNUM',
        legal_desc:        'LEGAL_DESCRIPTION_',
        county_fips:       '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'lot_depth_ft', 'lot_width_ft', 'building_count', 'year_built', 'gross_floor_area',
        'tax_year', 'tax_amount', 'last_sale_date', 'last_sale_price',
        'deed_book', 'deed_page', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'IndyGIS (City of Indianapolis and Marion County, Indiana — consolidated "Unigov" government)',
        url:     'https://maps.indy.gov/',
        portal:  'https://data-indygis.opendata.arcgis.com/datasets/IndyGIS::parcels-w-owner-information-assessed-values',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Indianapolis metro — Indiana data center market. Site address is split across multiple component fields (number/prefix-direction/street name/suffix) with no single combined field, and owner mailing address is likewise split, so neither is mapped.',
      },
    },

    '48439': {
      id:          'tx-tarrant-county',
      name:        'Tarrant County, Texas',
      state:       'TX',
      fips:        '48439',
      connector:   'arcgis',
      serviceUrl:  'https://mapit.tarrantcounty.com/arcgis/rest/services/Tax/TCProperty/MapServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:         'TAXPIN',
        pin:               'ACCOUNT',
        address:           'SITUS_ADDR',
        owner:             'OWNER_NAME',
        land_use_code:     'PARCELTYPE',
        land_use_desc:     'DESCR',
        area_sqft:         'LAND_SQFT',
        area_acres:        'LAND_ACRES',
        year_built:        'YEAR_BUILT',
        gross_floor_area:  'LIVING_ARE',
        assessed_value:    'APPRAISEDV',
        land_value:        'LAND_VALUE',
        improvement_value: 'IMPR_VALUE',
        last_sale_date:    'DEED_DATE',
        deed_book:         'DEED_BOOK',
        deed_page:         'DEED_PAGE',
        subdivision:       'SubdivisionName',
        legal_desc:        'LEGAL_1',
        county_fips:       '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'lot_depth_ft', 'lot_width_ft', 'building_count',
        'tax_year', 'tax_amount', 'last_sale_price', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Tarrant County Tax Assessor-Collector / Tarrant Appraisal District',
        url:     'https://www.tad.org/',
        portal:  'https://mapit.tarrantcounty.com/arcgis/rest/services/Tax/TCProperty/MapServer/0',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Fort Worth metro — Texas data center market. Owner mailing address is split across separate line/city/zip fields with no single combined field, so owner_mailing isn’t mapped.',
      },
    },

    '26163': {
      id:          'mi-wayne-county',
      name:        'Wayne County, Michigan',
      state:       'MI',
      fips:        '26163',
      connector:   'arcgis',
      serviceUrl:  'https://services6.arcgis.com/WiOy9S7NUTWyXUe4/arcgis/rest/services/WayneCo_Parcels/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:         'Parcel',
        pin:               'Parcel2',
        address:           'PPAddress',
        owner:             'PPOwner',
        owner_mailing:     'PPOwnerAddress',
        land_use_code:     'PPClassCode',
        area_acres:        'PPAcres',
        gross_floor_area:  'PPLivingArea',
        year_built:        'PPYearBuilt',
        building_count:    'PPDwellCount',
        assessed_value:    'PPTotalValue',
        land_value:        'PPLandValue',
        improvement_value: 'PPImprValue',
        last_sale_date:    'PPSaleDate',
        last_sale_price:   'PPAmount',
        county_fips:       '__computed__',
      },

      notProvidedBySource: [
        'zoning_code', 'zoning_desc', 'land_use_desc', 'overlay_districts',
        'area_sqft', 'lot_depth_ft', 'lot_width_ft',
        'tax_year', 'tax_amount', 'deed_book', 'deed_page',
        'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Wayne County, Michigan',
        url:     'https://www.waynecounty.com/',
        portal:  'https://services6.arcgis.com/WiOy9S7NUTWyXUe4/arcgis/rest/services/WayneCo_Parcels/FeatureServer/0',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Detroit metro — Michigan data center market. Layer also exposes PPTaxPayer/PPTaxPayerAddress (a separate tax-payer-of-record pair distinct from PPOwner/PPOwnerAddress) which are left unmapped since owner/owner_mailing already have a direct match. PPClassNumber (a secondary class code) and PPGrade/PPCondition/PPHasCAUV have no canonical equivalent and are also left unmapped.',
      },
    },

    '11001': {
      id:          'dc-district-of-columbia',
      name:        'District of Columbia',
      state:       'DC',
      fips:        '11001',
      connector:   'arcgis',
      serviceUrl:  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer/35',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:   'SSL',
        pin:         'SQUARE',
        area_sqft:   'CALCULATEDAREA',
        county_fips: '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_code', 'land_use_desc', 'overlay_districts', 'area_acres',
        'lot_depth_ft', 'lot_width_ft', 'building_count', 'year_built',
        'gross_floor_area', 'assessed_value', 'land_value', 'improvement_value',
        'tax_year', 'tax_amount', 'last_sale_date', 'last_sale_price',
        'deed_book', 'deed_page', 'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'District of Columbia Office of the Surveyor / DC GIS',
        url:     'https://octo.dc.gov/page/dc-gis-service-center',
        portal:  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/FeatureServer/35',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Washington DC — significant East Coast data center market. This is the "Record Lots" layer: per its own description, a property must generally be a Record Lot before DC will issue it a building permit, making this the standard cadastral layer for ordinary developed properties (unlike the "Parcel Lots" layer, which covers only historically-unsubdivided residual land, or the "Tax Lots" layer, which exists only for tax-bill combine/split edge cases — both also live on this same FeatureServer but were not used for that reason). SSL (Square-Suffix-Lot) is DC\'s universal parcel identifier. Only cadastral geometry is exposed here; DC\'s much richer OCFO Integrated Tax System Public Extract (owner, mailing address, assessed land/improvement/total value, sale price/date — 218 fields) and CAMA tables live in separate non-spatial tables joined by SSL, which this connector cannot join — a follow-up connector-enhancement opportunity, same architectural gap as Suffolk County MA and Polk County IA.',
      },
    },

    '12031': {
      id:          'fl-duval-county',
      name:        'Duval County, Florida',
      state:       'FL',
      fips:        '12031',
      connector:   'arcgis',
      serviceUrl:  'https://services1.arcgis.com/CtMjdUqInecbPao9/arcgis/rest/services/Jacksonville_Parcels/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:         'RE',
        pin:               'RE_NOSPACE',
        owner:             'LNAMEOWNER',
        land_use_code:     'PUSE',
        land_use_desc:     'DESCPU',
        zoning_code:       'ZON_LABEL',
        area_acres:        'ACRES',
        building_count:    'NBBLDGS',
        assessed_value:    'CAMA_VAL',
        land_value:        'TOT_LND_VA',
        improvement_value: 'TOT_IMPR_V',
        subdivision:       'SUB_BLK',
        county_fips:       '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner_mailing', 'zoning_desc', 'overlay_districts',
        'area_sqft', 'lot_depth_ft', 'lot_width_ft', 'year_built',
        'gross_floor_area', 'tax_year', 'tax_amount', 'last_sale_date',
        'last_sale_price', 'deed_book', 'deed_page', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Duval County Property Appraiser (City of Jacksonville, Florida)',
        url:     'https://www.coj.net/departments/property-appraiser',
        portal:  'https://services1.arcgis.com/CtMjdUqInecbPao9/arcgis/rest/services/Jacksonville_Parcels/FeatureServer/0',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Jacksonville metro — Florida data center market. Jacksonville and Duval County are a consolidated city-county government. A second ArcGIS Online candidate, "Jacksonville Interactive Parcel Map_WFL1", turned out to be a false positive for Jacksonville, Oregon (its layer names reference an Urban Growth Boundary, an Oregon-specific land-use planning term) and was not used. Site address (ST_DIR/ST_NAME/ST_TYPE/STREET_NO/ADDRCITY), owner mailing address (MAILADDR1-3/MAILCITY/MAILSTATE/MAILZIP), last sale date (SALESLYY/SALESLMM/SALESLDD as three separate numeric fields), and legal description (LEGAL1-6) are all split across multiple source fields with no single combined field, so none of those are mapped.',
      },
    },

    '21111': {
      id:          'ky-jefferson-county',
      name:        'Jefferson County, Kentucky',
      state:       'KY',
      fips:        '21111',
      connector:   'arcgis',
      serviceUrl:  'https://gis.lojic.org/maps/rest/services/LojicSolutions/OpenDataPVA/MapServer/1',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:   'PARCELID',
        pin:         'PIN',
        county_fips: '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_code', 'land_use_desc', 'overlay_districts', 'area_sqft',
        'area_acres', 'lot_depth_ft', 'lot_width_ft', 'building_count',
        'year_built', 'gross_floor_area', 'assessed_value', 'land_value',
        'improvement_value', 'tax_year', 'tax_amount', 'last_sale_date',
        'last_sale_price', 'deed_book', 'deed_page', 'subdivision',
        'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'LOJIC (Louisville/Jefferson County Information Consortium) / Jefferson County PVA',
        url:     'https://www.lojic.org/',
        portal:  'https://gis.lojic.org/maps/rest/services/LojicSolutions/OpenDataPVA/MapServer/1',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Louisville metro — Kentucky data center market. Louisville and Jefferson County are a consolidated city-county government ("Louisville Metro"). This is a pure cadastral-geometry layer (PARCELID, PIN, an internal PARCEL_TYPE code, and an LRSN record-sequence number) with no owner/address/value fields exposed — a thin add, consistent with the precedent set by Middlesex County MA, Allegheny County PA, and District of Columbia this session.',
      },
    },

    '34023': {
      id:          'nj-middlesex-county',
      name:        'Middlesex County, New Jersey',
      state:       'NJ',
      fips:        '34023',
      connector:   'arcgis',
      serviceUrl:  'https://services.arcgis.com/BnY3izA2Kwu6jVHq/arcgis/rest/services/Middlesex_County_NJ_Parcel_data/FeatureServer/0',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:        'PAMS_PIN',
        pin:              'UNIQUEID',
        owner:            'OwnersName',
        address:          'PropLoc',
        land_use_code:    'PropClass',
        land_use_desc:    'LandDesc',
        area_acres:       'Acreage',
        year_built:       'YearBuilt',
        gross_floor_area: 'SFLA',
        assessed_value:   'NetValue',
        last_sale_date:   'SalesDate',
        last_sale_price:  'SalePrice',
        deed_book:        'DeedBook',
        deed_page:        'DeedPage',
        county_fips:      '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'overlay_districts',
        'area_sqft', 'lot_depth_ft', 'lot_width_ft', 'building_count',
        'land_value', 'improvement_value', 'tax_year', 'tax_amount',
        'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Middlesex County, New Jersey (Civil Solutions / Middlesex County Office of Information Technology / NJ Office of GIS)',
        url:     'https://www.middlesexcountynj.gov/',
        portal:  'https://services.arcgis.com/BnY3izA2Kwu6jVHq/arcgis/rest/services/Middlesex_County_NJ_Parcel_data/FeatureServer/0',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Central New Jersey — significant Northeast data center market. Parcel boundaries and MOD-IV (NJ\'s statewide assessment database) attributes updated monthly, merged countywide from each municipality\'s data by Civil Solutions for the Middlesex County Office of Information Technology. A near-identical layer also exists on the county\'s own GIS portal (mcgisportal.co.middlesex.nj.us) but has 46 fields versus this service\'s 58 and is missing the owner-name field, so this richer ArcGIS Online copy was used instead. Owner mailing address (OwnerAddr1/OwnerAddr2/ZipCode) is split across multiple fields with no single combined field, so owner_mailing isn\'t mapped. NetValue is MOD-IV\'s single total net assessed value with no separate land/improvement split exposed.',
      },
    },

    '16001': {
      id:          'id-ada-county',
      name:        'Ada County, Idaho',
      state:       'ID',
      fips:        '16001',
      connector:   'arcgis',
      serviceUrl:  'https://services2.arcgis.com/dgGjZc6xAH5m5JyP/arcgis/rest/services/Parcels/FeatureServer/5',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:      'PARCEL',
        address:        'ADDRESS',
        land_use_code:  'PROPCODE',
        zoning_code:    'ZONING',
        area_acres:     'ACRES',
        assessed_value: 'TOTALVALUE',
        tax_year:       'PROPYEAR',
        subdivision:    'SUBNM',
        county_fips:    '__computed__',
      },

      notProvidedBySource: [
        'pin', 'owner', 'owner_mailing', 'zoning_desc', 'land_use_desc',
        'overlay_districts', 'area_sqft', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'year_built', 'gross_floor_area', 'land_value',
        'improvement_value', 'tax_amount', 'last_sale_date', 'last_sale_price',
        'deed_book', 'deed_page', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Ada County Assessor\'s Office (Boise, Idaho)',
        url:     'https://adacounty.id.gov/assessor/',
        portal:  'https://services2.arcgis.com/dgGjZc6xAH5m5JyP/arcgis/rest/services/Parcels/FeatureServer/5',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Boise metro — Idaho data center market. Confirmed via the layer\'s own copyrightText ("Ada County Assessors Office") and description. Legal description (LEGAL1-5) is split across five fields with no single combined field, so legal_desc isn\'t mapped; TOTALVALUE is the parcel\'s single total assessed value with no separate land/improvement split exposed.',
      },
    },

    '34017': {
      id:          'nj-hudson-county',
      name:        'Hudson County, New Jersey',
      state:       'NJ',
      fips:        '34017',
      connector:   'arcgis',
      serviceUrl:  'https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0',
      where:       "COUNTY = 'HUDSON'",

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:          'PAMS_PIN',
        pin:                'GIS_PIN',
        owner:              'OWNER_NAME',
        address:            'PROP_LOC',
        land_use_code:      'PROP_CLASS',
        area_acres:         'CALC_ACRE',
        year_built:         'YR_CONSTR',
        assessed_value:     'NET_VALUE',
        land_value:         'LAND_VAL',
        improvement_value:  'IMPRVT_VAL',
        tax_amount:         'LAST_YR_TX',
        last_sale_date:     'DEED_DATE',
        last_sale_price:    'SALE_PRICE',
        deed_book:          'DEED_BOOK',
        deed_page:          'DEED_PAGE',
        legal_desc:         'LAND_DESC',
        county_fips:        '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'land_use_desc',
        'overlay_districts', 'area_sqft', 'lot_depth_ft', 'lot_width_ft',
        'building_count', 'gross_floor_area', 'tax_year', 'subdivision',
        'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'New Jersey Office of Information Technology, Office of GIS (NJOGIS) — statewide MOD-IV Composite, filtered to Hudson County',
        url:     'https://www.hudsoncountynj.org/',
        portal:  'https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Jersey City metro — Northeast data center market. Hudson County has no live DCAT feed of its own (data.hudsoncountynj.org is dead) and NJGIN\'s Hudson-specific distribution is only a static shapefile/fgdb .zip download. An ArcGIS Online layer named "NJ_Parcel_Boundaries_Simplified" turned out to be Hudson-County-specific despite its generic name (per its own description/copyrightText), but was too thin (13 fields, effectively just PAMS_PIN) to use. Instead this entry queries the state\'s own official statewide MOD-IV Composite service (compatible with the NJ Division of Taxation\'s MOD-IV assessment system) with a `where: COUNTY = \'HUDSON\'` filter, confirmed live with a real Bayonne City sample record. Owner mailing address (ST_ADDRESS/CITY_STATE/ZIP_CODE) is split across multiple fields with no single combined field, so owner_mailing isn\'t mapped. NET_VALUE is MOD-IV\'s single total net assessed value with no separate land/improvement split beyond LAND_VAL/IMPRVT_VAL (which are mapped). LAST_YR_TX is a tax amount, not a tax year, so it maps to tax_amount rather than tax_year (no tax year field is exposed).',
      },
    },

    '48085': {
      id:          'tx-collin-county',
      name:        'Collin County, Texas',
      state:       'TX',
      fips:        '48085',
      connector:   'arcgis',
      serviceUrl:  'https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:          'geoID',
        pin:                'PROP_ID',
        owner:              'ownerName',
        address:            'situsConcat',
        land_use_code:      'propUseCode',
        area_sqft:          'landSizeSqft',
        area_acres:         'landSizeAcres',
        year_built:         'imprvYearBuilt',
        gross_floor_area:   'imprvMainArea',
        assessed_value:     'currValAssessed',
        land_value:         'currValLand',
        improvement_value:  'currValImprv',
        tax_year:           'currValYear',
        last_sale_date:     'deedFileDate',
        deed_book:          'deedBook',
        deed_page:          'deedPage',
        subdivision:        'legalAbsSubName',
        legal_desc:         'legalDescription',
        county_fips:        '__computed__',
      },

      notProvidedBySource: [
        'owner_mailing', 'zoning_code', 'zoning_desc', 'land_use_desc',
        'overlay_districts', 'lot_depth_ft', 'lot_width_ft', 'building_count',
        'tax_amount', 'last_sale_price', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Collin Central Appraisal District (CCAD)',
        url:     'https://www.collincad.org/',
        portal:  'https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'Frisco/Plano/McKinney metro — DFW data center corridor. Collin County\'s own DCAT feed is dead and its GIS server (gis.collincountytx.gov) was unreachable during investigation, but CCAD — the Central Appraisal District, Texas\'s standard architecture for property assessment since counties themselves don\'t assess (same pattern as Tarrant and Bexar counties) — publishes a live, official ArcGIS feature service confirmed via its own copyrightText ("Collin Central Appraisal District / https://collincad.org") and layer description ("Parcel polygons maintained by Collin Central Appraisal District"). The layer\'s first (OBJECTID 1) record is a null placeholder; a filtered query confirmed real populated records with sensible values. Owner mailing address (ownerAddrLine1/Line2/City/State/Zip/Country) is split across six fields with no single combined field, so owner_mailing isn\'t mapped. No sale-price or tax-amount fields are exposed in this schema.',
      },
    },

    '15003': {
      id:          'hi-honolulu-county',
      name:        'Honolulu County, Hawaii',
      state:       'HI',
      fips:        '15003',
      connector:   'arcgis',
      serviceUrl:  'https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/11',

      minZoom:     14,
      maxFeatures: 500,

      fieldMap: {
        parcel_id:   'tmk',
        pin:         'tmk9txt',
        area_acres:  'gisacres',
        area_sqft:   'rec_area_sf',
        county_fips: '__computed__',
      },

      notProvidedBySource: [
        'address', 'owner', 'owner_mailing', 'zoning_code', 'zoning_desc',
        'land_use_code', 'land_use_desc', 'overlay_districts', 'lot_depth_ft',
        'lot_width_ft', 'building_count', 'year_built', 'gross_floor_area',
        'assessed_value', 'land_value', 'improvement_value', 'tax_year',
        'tax_amount', 'last_sale_date', 'last_sale_price', 'deed_book',
        'deed_page', 'subdivision', 'legal_desc', 'census_tract',
      ],

      outFields: null,

      attribution: {
        name:    'Honolulu Land Information System (Holis), Department of Planning and Permitting, City and County of Honolulu — hosted via Hawaii\'s statewide GIS program',
        url:     'https://www.honolulu.gov/dpp',
        portal:  'https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/11',
        license: 'Public government data. Verify terms before commercial redistribution.',
        note:    'The entire island of Oahu — Honolulu County is legally coextensive with the island. The City and County of Honolulu\'s own open data portal DCAT feed returns HTTP 404, but Hawaii\'s statewide GIS program hosts a Honolulu-County-specific layer directly (title "Parcels - Honolulu County (Island of Oahu)", copyrightText "Honolulu Land Information System (Holis)... City and County of Honolulu"), part of a broader ParcelsZoning MapServer with sibling layers for Hawaii Statewide, Hawaii County, and TMK Zone/Section/Plat breakdowns. This is a pure cadastral/TMK boundary layer with no assessment data (owner, values, sales) joined — its "zone"/"section"/"plat" fields are components of the Tax Map Key numbering system, not real zoning designations, so they aren\'t mapped to zoning_code to avoid a misleading false-friend match. tmk is the standard 8-digit Tax Map Key (Hawaii\'s statewide parcel identifier); tmk9txt is a 9-digit padded variant.',
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
