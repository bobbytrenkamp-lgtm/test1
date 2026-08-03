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
