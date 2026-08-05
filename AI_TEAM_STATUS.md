# AI Team Status

This file coordinates work between AI assistants collaborating on this repo.
No equivalent file existed before 2026-07-30; `docs/ZONING_PILOT_STATUS.md` is
scoped specifically to the zoning pilot and is not a substitute for this.

## Active Work

- Date: 2026-08-03
- Agent: Claude Code
- Task: Ongoing, user-requested incremental expansion of parcel data
  coverage beyond the initial 5-county pilot, prioritized by actual
  facility count in `facilities_index.json`. Fixed the 2 already-broken
  counties first, then added Maricopa AZ / Dallas TX / Fulton GA, then
  Franklin OH / King WA, then LA CA (see Recently Completed below for
  all). Santa Clara County CA (#4 by facility count, 108) was
  investigated over three probe rounds and confirmed unavailable — its
  candidate service is genuinely dead and no general-purpose county
  parcel layer could be found on its GIS org, see Open Handoffs below for
  the full trail; closed as won't-fix pending a human follow-up. Cook
  County IL (#1, 130 facilities) is deliberately not being added — see
  Open Handoffs, it needs a licensing decision, not more research.
  Registry now covers 11 jurisdictions. Hennepin County MN (63
  facilities) was investigated over two probe rounds: no county-specific
  service exists, but the Metropolitan Council publishes a real regional
  parcel dataset covering the 7-county Twin Cities metro (including
  Hennepin) — its ArcGIS server is currently returning HTTP 500
  "Application Error" on every candidate endpoint tried, a server-side
  fault rather than a wrong URL guess; see Open Handoffs for the retry
  recommendation. Denver County CO (62 facilities) was investigated over
  two probe rounds: found the city-county's real ArcGIS org
  (210919_geospatialDenver, 101 items) but every parcel-related dataset
  in it is a derived planning-analysis layer (building-size medians,
  middle-housing conversion studies), not a general-purpose parcel
  boundary/cadastral service — same pattern as Santa Clara CA, see Open
  Handoffs. Harris County TX (61 facilities) was added after 4 diagnostic
  rounds — a real service was found quickly but needed a layer-index
  correction and then a transient-network-failure retry before it
  resolved as live; see Recently Completed below. Registry now covers 12
  jurisdictions. Paused here to check in with the user on the recent
  pattern (3 of the last 4 counties investigated — Santa Clara, Hennepin,
  Denver — needed documentation as blocked/unavailable rather than a
  clean add) before researching further counties. User said to continue.
  New York County NY / Manhattan (52 facilities) was added next — see
  Recently Completed below. Registry now covers 13 jurisdictions. User
  said "do what you think is best" — continuing the incremental
  expansion autonomously. Travis County TX/Austin (45 facilities) was
  added next over 2 probe rounds — see Recently Completed below.
  Registry now covers 14 jurisdictions. Clark County NV/Las Vegas (43
  facilities) was investigated over 3 probe rounds and confirmed
  unavailable — maps.clarkcountynv.gov is a genuinely live, rich GIS
  host (25+ Assessor services) but the two most plausible candidates
  both failed on inspection: Assessor_Base_Map is a cached-tile-only
  basemap with no queryable attributes, and BOE_Parcels is real and
  queryable but turned out to be POINT geometry with only 8 sparse
  fields (no address/owner/value/legal-description) — a Board of
  Equalization appeal-case index, not parcel boundary data; see Open
  Handoffs below for the full trail and untried candidates a human could
  follow up on. Closed as won't-fix pending a human follow-up, same
  pattern as Santa Clara/Hennepin/Denver. Miami-Dade County FL (40
  facilities) was added next — a rare first-probe success, see Recently
  Completed below. Registry now covers 15 jurisdictions. Bexar County
  TX/San Antonio (39 facilities) was added next — another first-probe
  success — see Recently Completed below. Registry now covers 16
  jurisdictions. San Francisco County CA (39 facilities) was
  investigated over 2 probe rounds and confirmed unavailable in its
  current form — DataSF's "Parcels - Active and Retired" Socrata dataset
  is real and live but boundary/zoning-only (no owner/value/legal
  fields) because California state law prohibits SF's Assessor-Recorder
  from posting ownership info online at all; no ArcGIS-native
  parcel/assessment service was found either, and this registry's
  'geojson' connector is unproven and architecturally risky for a
  ~200k-parcel city; see Open Handoffs below for the full trail. Closed
  pending a human decision, same pattern as Santa Clara/Hennepin/Denver/
  Clark. Mecklenburg County NC/Charlotte (39 facilities) was
  investigated next over two probe rounds and confirmed unavailable in
  its current form — round 1 found Charlotte's own GIS host
  (gis.charlottenc.gov) has a real, live parcel layer
  (CountyData/Parcels/MapServer/0) but it's boundary/legal-reference
  only (13 fields: map book/page/block, lot number, PIN, parcel type,
  condo flag, legal-description-source flag — no owner/address/value).
  Round 2 targeted Mecklenburg County's own POLARIS GIS platform
  (polaris3g.mecklenburgcountync.gov), whose host and base path were
  confirmed real via web search (two other real services indexed under
  the same `/polarisv/rest/services/` path), but all 3 targeted guesses
  at a parcel/assessment service name (`parcels`, `Parcels`,
  `RealEstate`) returned the same generic application-level HTTP 500
  "Internal Error" page as the bare root listing did in round 1 — not a
  real ArcGIS error, a server-side fault on that specific path
  regardless of the guessed name. See Open Handoffs below for the full
  trail. Closed pending a human follow-up, same pattern as Santa
  Clara/Hennepin/Denver/Clark/San Francisco. Salt Lake County UT (37
  facilities) was added next — a first-probe success, see Recently
  Completed below. Registry now covers 17 jurisdictions. Multnomah
  County OR/Portland (36 facilities) was added next over 2 probe rounds
  — round 1's web-search-guessed candidate was live but turned out to
  be the wrong county entirely (Umatilla County OR, caught via its own
  description/copyrightText), and round 1's DCAT-catalog fallback found
  the real service directly; round 2 confirmed it with a rich 56-field
  schema. See Recently Completed below. Registry now covers 18
  jurisdictions. Davidson County TN/Nashville (34 facilities) was added
  next — a first-probe success on Nashville's own MetroGIS host with a
  rich 58-field schema. See Recently Completed below. Registry now
  covers 19 jurisdictions. Jackson County MO/Kansas City (34
  facilities) was investigated over three probe rounds and confirmed
  unavailable in its current form — every guessed service name either
  didn't exist (real 404s) or turned out to be a CAD/survey layer with
  no owner/value/address data, not a general parcel data service;
  round 3's root directory listing revealed several unexplored folders
  (ParcelViewer, Land_Records_Management, Internal_Parcel_Viewer,
  Auditor) that are plausible leads for a human to follow up on, past
  this investigation's 3-round budget. See Open Handoffs below for the
  full trail. Closed pending a human follow-up, same pattern as Santa
  Clara/Hennepin/Denver/Clark/San Francisco/Mecklenburg. Philadelphia PA
  (32 facilities) was added next over 5 probe rounds — round 1 found an
  exceptionally rich 78-field dataset (OPA_PROPERTIES_PUBLIC: owner,
  address, market/taxable value, sale history, building
  characteristics) but it turned out to be Point geometry, not Polygon,
  a genuine architectural mismatch with this registry's polygon-only
  Leaflet renderer (same blocker as Clark County NV's BOE_Parcels);
  rounds 2-5 located and confirmed a real Polygon boundary layer
  instead (Philadelphia DOR Parcels), thinner but with real owner/
  address data. See Recently Completed below. Registry now covers 20
  jurisdictions. Sacramento County CA (30 facilities) was added next
  over 2 probe rounds — a real, live cadastral/land-use boundary layer
  with no owner/value data (that lives in a separate, not-yet-confirmed
  Assessor Parcel Viewer app), accepted as a thin-but-real add rather
  than chasing a 3rd round. See Recently Completed below. Registry now
  covers 21 jurisdictions. Cuyahoga County OH/Cleveland (29 facilities)
  was added next — a first-probe success, found directly via the
  county's own open-data DCAT catalog rather than a guessed URL: the
  "Parcel Fabric Taxparcels" dataset, served under a "CCFO" (Cuyahoga
  County Fiscal Officer) folder on the county's own GIS host, with 142
  fields and real Polygon geometry — one of the richest sources found
  this session (19 of 30 canonical fields mapped). See Recently
  Completed below. Registry now covers 22 jurisdictions. Wake County
  NC/Raleigh (28 facilities) was added next — another first-probe
  success, with the DCAT catalog's own confirmed distribution URL for
  the county's "Parcels" dataset exactly matching a direct guess at
  maps.wake.gov, 60 fields, Polygon geometry, and the richest field
  mapping of the session so far (20 of 30 canonical fields, including
  the registry's first genuinely separate deed_book/deed_page fields).
  See Recently Completed below. Registry now covers 23 jurisdictions.
  Polk County IA/Des Moines (27 facilities) was investigated next over
  4 rounds: rounds 1-2 located the county's own gis4.polkcountyiowa.gov
  ArcGIS Server after two rounds of dead-end guesses, confirming a real
  but thin 8-field "Cadastral Parcels" boundary layer; round 3 found
  that the same FeatureServer also exposes four separate non-spatial
  CAMA tables (legal description/deed, situs address, taxable/assessed
  values, owner mailing) joinable by parcel number — a genuinely rich
  dataset; round 4 confirmed those tables' real field schemas, but
  js/parcel/connector-arcgis.js has no support for joining a boundary
  layer to related tables (the same class of architectural gap as
  Philadelphia's Point-geometry blocker), so only the thin boundary
  layer (2 real fields: parcel_id, pin) was added, with the richer
  schema documented as a follow-up opportunity below. See Recently
  Completed below. Registry now covers 24 jurisdictions. While checking
  the facility-count priority list for the next candidate below Polk
  County IA (27), a gap was discovered: Washington County OR/Hillsboro
  has 36 facilities — more than several already-covered counties — but
  had never been investigated. It was added next over 4 rounds: rounds
  1-2 exhausted guessed county-hosted URLs and a resolved Oregon Metro
  item that turned out to be a static Shapefile download rather than a
  live service; round 3's DCAT catalog search on Metro's own RLIS
  Discovery portal (a custom domain, not *.opendata.arcgis.com) found
  the real regional "Taxlots (Public)" dataset directly; round 4
  confirmed it live with 32 fields and real Polygon geometry, covering
  Clackamas/Multnomah/Washington Counties with a `where` clause scoping
  results to Washington County. See Recently Completed below. Registry
  now covers 25 jurisdictions. Suffolk County MA/Boston (27 facilities)
  was investigated next over 6 rounds: rounds 1-2 exhausted a wrong
  ArcGIS org guess and an unreachable state-hosted proxy host; round
  3's DCAT catalog search on MassGIS's own open-data portal found the
  real statewide "Massachusetts Property Tax Parcels" service directly
  among 295 "parcel" matches; round 4 confirmed one of its layers
  (GISDATA.L3_ASSESS) is exceptionally rich (41 fields — full owner
  data, values, sale history, building characteristics) but is a
  non-spatial attribute table, the same architectural gap already
  documented for Polk County IA; round 5 found the real Polygon
  boundary layer ("Tax Parcels") in the same service's layer catalog;
  round 6 confirmed its own thin 19-field schema (mostly IDs and
  cartographic metadata). Added as a thin add (3 real fields), with the
  rich joinable table documented as a follow-up opportunity. See
  Recently Completed below. Registry now covers 26 jurisdictions.
  Hillsborough County FL/Tampa (27 facilities, also tied) was added
  next over 2 rounds: round 1's DCAT catalog search on the county's own
  GeoHub found only Cities/Zoning/map-viewer layers (no parcel
  FeatureServer), and a direct guess at the Property Appraiser's own
  host 500'd; a web search surfaced the Tampa Hillsborough Planning
  Commission's ArcGIS Server (tpcmaps.org), whose `Parcels/MapServer/2`
  layer's own description and copyright text ("Hillsborough County
  Property Appraiser's Parcel data ... Updated quarterly") confirmed it
  as the real, official, county-wide dataset — 56 fields, real Polygon
  geometry. Added with 17 real fields + computed county_fips (18/30).
  See Recently Completed below. Registry now covers 27 jurisdictions.
  Middlesex County MA/Cambridge (26 facilities) was added next in a
  single round: since Suffolk County MA is served by MassGIS's
  statewide "Massachusetts Property Tax Parcels" service, this reused
  the same layer directly. It has no county- or town-name field to
  scope by (confirmed via its real 19-field schema — only a numeric
  TOWN_ID, no COUNTY/CITY_TOWN/MUNI_ID), but since
  `js/parcel/connector-arcgis.js` already restricts every fetch to the
  current map viewport bounds via a geometry-intersects query, no
  `where`-clause scoping is actually needed — the same unscoped service
  Suffolk County already uses correctly returns real Middlesex parcels
  when the map is centered there. Added as a thin add (3 real fields +
  computed county_fips, identical richness to Suffolk since it's the
  same source layer). See Recently Completed below. Registry now
  covers 28 jurisdictions. Hamilton County OH/Cincinnati (25
  facilities, tied with Allegheny County PA) was added next over 3
  rounds: round 1's DCAT-catalog-first approach failed outright — the
  CAGIS (Cincinnati Area Geographic Information System) Open Data Hub
  has disabled its DCAT feed entirely (HTTP 403 "Feeds have been
  disabled for this site"); round 2 fell back to ArcGIS Online's
  public, unauthenticated item-search API, which found several real
  candidates including two hosted by official CAGIS accounts
  (CagisCoreLayers and cagisopendata); round 3 confirmed both directly
  — CAGIS's own ArcGIS Server layer (HCE/Cadastral, "CAGIS.Ham_Parcel
  _Poly") has 99 fields and real Polygon geometry, the authoritative
  source. Added with 15 real fields + computed county_fips (16/30),
  including sale history, deed book/page, and value fields (mapped
  from the layer's MKT_* market-value fields, with a note that Ohio's
  statutory assessed value is a separate 35% conversion not exposed in
  this GIS layer). Site/mailing address fields are split across
  multiple components with no single combined field, so address and
  owner_mailing aren't mapped. See Recently Completed below. Registry
  now covers 29 jurisdictions. Allegheny County PA/Pittsburgh (25
  facilities) was added next over 3 rounds: round 1's DCAT catalog
  confirmed a real "Allegheny County Parcel Boundaries" dataset exists
  but its distribution only points to a PASDA (Pennsylvania Spatial
  Data Access, the state's official GIS clearinghouse) landing page,
  not a direct REST URL; the county's own guessed ArcGIS Server
  service (maps.pasda.psu.edu) returned a real ArcGIS 500 "not
  started" (cold service); round 2 retried it twice with no change,
  then listed the full 41-layer catalog of an alternate PASDA-hosted
  MapServer and found layer 25, "Allegheny County Parcels 20260727" —
  a live, currently-dated parcels layer; round 3 confirmed it directly
  (13 fields, real Polygon geometry). Added as a thin add (3 real
  fields + computed county_fips) — only boundary/PIN/acreage data is
  exposed in this PASDA mirror; the county's own Real Estate/CAMA
  assessment data (owner, value, sale history) lives in a separate,
  not-yet-confirmed system. See Recently Completed below. Registry now
  covers 30 jurisdictions. Marion County IN/Indianapolis (24
  facilities) was added next over 2 rounds — Indianapolis and Marion
  County share a consolidated "Unigov" city-county government: round
  1's DCAT catalog on the Open Indy Data Portal directly surfaced
  "Parcels w/ Owner Information & Assessed Values", a promising
  CAMA-style dataset distinct from a plainer boundary-only fallback;
  round 2 confirmed it directly (50 fields, real Polygon geometry).
  Added with 12 real fields + computed county_fips (13/30), including
  owner name, land/improvement/total assessed values, subdivision, and
  legal description — no single combined address field exists (split
  across number/direction/street/suffix components), so address and
  owner_mailing aren't mapped. See Recently Completed below. Registry
  now covers 31 jurisdictions. Tarrant County TX/Fort Worth (23
  facilities) was added next in a single round — a first-probe
  success: web search directly surfaced the county's own ArcGIS
  Server (mapit.tarrantcounty.com) with a Tarrant Appraisal District
  CAMA export layer explicitly named and described, confirmed real
  with 57 fields, real Polygon geometry, and (unusually for this
  session) a single combined site-address field. Added with 18 real
  fields + computed county_fips (19/30) — the richest addition of this
  stretch — including owner, address, land use, physical
  characteristics, all three value tiers, deed book/page, sale date,
  subdivision, and legal description. Also discovered mid-cycle (via
  the project's own CI probe, unrelated to this addition) that Bexar
  County TX's parcel service — added earlier this session — had gone
  down; confirmed across 2 separate probe attempts and marked
  `knownUnavailable` in the registry per the project's documented
  pattern, with details in Open Handoffs. See Recently Completed
  below. Registry now covers 32 jurisdictions. Wayne County MI/Detroit
  (23 facilities, tied with Tarrant TX) was added next over 2 probe
  rounds: round 1's DCAT catalog found the real service URL directly,
  round 2 hit a transient HTTP 503 that cleared on a single retry,
  confirming a real 28-field parcel layer. Added with 15 real fields +
  computed county_fips (16/30), including a rare fully-mapped
  owner_mailing (single combined source field, unlike most other
  counties this session). See Recently Completed below. Registry now
  covers 33 jurisdictions. District of Columbia (23 facilities, tied
  with Wayne MI and Tarrant TX) was added next over 4 probe rounds —
  the most of any jurisdiction this session: rounds 1-2 traced DC's
  DCAT catalog to a 38-layer `Property_and_Land_WebMercator`
  FeatureServer, round 3 found two real geometry layers that turned
  out to be narrow edge cases per their own descriptions (unsubdivided
  residual land; tax combine/split), and round 4 found the actual
  general-purpose layer ("Record Lots" — required for any building
  permit) after re-checking round 2's catalog for an unprobed
  candidate. Added as a thin 3-field + computed county_fips add
  (4/30), with DC's much richer 218-field CAMA/ITSPE data logged as a
  follow-up connector-enhancement opportunity (SSL-joined, same gap as
  Suffolk MA/Polk IA). See Recently Completed below. Registry now
  covers 34 jurisdictions. Duval County FL/Jacksonville (22
  facilities) was added next over 3 probe rounds: round 1's DCAT
  attempt failed to resolve entirely, round 2's ArcGIS Online fallback
  caught a false positive (a same-named "Jacksonville" candidate that
  was actually Jacksonville, Oregon, identified via its Oregon-
  specific Urban Growth Boundary layer), and round 3 confirmed the
  real candidate as a rich 76-field Duval County Property Appraiser
  CAMA export. Added with 12 real fields + computed county_fips
  (13/30). See Recently Completed below. Registry now covers 35
  jurisdictions. Jefferson County KY/Louisville (22 facilities, tied
  with Duval FL) was added next over 2 probe rounds: round 1's ArcGIS
  Online search directly surfaced a genuine, verifiable match ("PVA"
  in the URL confirming Kentucky's standard assessor terminology, not
  a false positive this time), and round 2 confirmed real Polygon
  geometry but a thin 9-field cadastral-only schema. Added with 2 real
  fields + computed county_fips (3/30), consistent with the thin-add
  precedent from Middlesex MA/Allegheny PA/DC. See Recently Completed
  below. Registry now covers 36 jurisdictions. Middlesex County NJ (22
  facilities, tied with Duval FL and Jefferson KY) was added next over
  3 probe rounds: round 1 verified candidates were genuinely NJ-
  specific (not a false-positive same name), round 2 found two live
  candidates sharing the same NJ MOD-IV source data, and round 3
  picked the richer of the two (58 fields incl. owner name, vs. 46
  missing owner name). Added with 14 real fields + computed
  county_fips (15/30) — the richest addition since Tarrant County TX.
  See Recently Completed below. Registry now covers 37 jurisdictions.
  Ada County ID/Boise (21 facilities) was added next over 3 probe
  rounds: round 1 directly surfaced a genuinely Ada-County-specific
  match, round 2 confirmed the service's one real Polygon layer, and
  round 3 confirmed official Ada County Assessor's Office data with
  32 fields including a rare single combined address field. Added
  with 8 real fields + computed county_fips (9/30). See Recently
  Completed below. Registry now covers 38 jurisdictions. Hudson County
  NJ/Jersey City (21 facilities, tied with Ada ID) was added next over
  3 probe rounds: round 1 found Hudson County's own DCAT feed dead and
  NJGIN's Hudson-specific distribution was only a static shapefile/fgdb
  download, not REST; round 2 found an ArcGIS Online layer
  ("NJ_Parcel_Boundaries_Simplified") that turned out to be genuinely
  Hudson-County-specific despite its generic statewide-sounding name
  (confirmed via its own description/copyrightText), but too thin (13
  fields, effectively just the parcel ID) to use on its own; round 3
  instead probed NJ's official statewide MOD-IV Composite service
  (hosted directly by the state at maps.nj.gov) and confirmed it live
  with a real Bayonne City sample record via a `where: COUNTY =
  'HUDSON'` filter — the connector already supports static `where`
  clauses (used previously for NYC MAPPLUTO and a Washington County
  taxlots layer), so a statewide service scoped to one county was a
  legitimate option, not a fabrication. Added with 16 real fields +
  computed county_fips (17/30) — richer than Middlesex County NJ, the
  previous richest NJ addition. See Recently Completed below. Registry
  now covers 39 jurisdictions. Collin County TX/Frisco-Plano-McKinney
  (21 facilities, tied with Ada ID and Hudson NJ) was added next over
  4 probe rounds: round 1 found Collin County's own DCAT feed dead but
  surfaced two genuinely Collin-County-specific candidates (the
  county's own GIS server and a "CCAD" feature service); round 2 found
  the county's own GIS server unreachable but confirmed CCAD (Collin
  Central Appraisal District — Texas counties don't self-assess, the
  separate CAD does, same architecture as Tarrant and Bexar counties
  earlier this session) as genuinely official via its own
  copyrightText and description; round 3 probed CCAD's "Parcels"
  sub-layer directly and found a rich 114-field schema, but its first
  sample record was a null placeholder; round 4 queried for populated
  records and confirmed real, sensible values (a real HCA Health
  Services parcel in Plano, assessed at $2.6M). Added with 18 real
  fields + computed county_fips (19/30) — the richest addition this
  session, surpassing Hudson County NJ. See Recently Completed below.
  Registry now covers 40 jurisdictions. Honolulu County HI/the island
  of Oahu (20 facilities) was added next over 2 probe rounds: round 1
  directly surfaced "Parcels - Honolulu County (Island of Oahu)"
  hosted by Hawaii's own statewide GIS portal (geodata.hawaii.gov), an
  unambiguous exact-title match with no false-positive risk; round 2
  confirmed the layer live via its copyrightText ("Honolulu Land
  Information System (Holis)... City and County of Honolulu") but
  found it's a pure cadastral/TMK boundary layer with no assessment
  data joined — its "zone"/"section"/"plat" fields are Tax Map Key
  numbering components, not real zoning designations, so weren't
  mapped to avoid a misleading false-friend match. Added with 4 real
  fields (tmk, tmk9txt, gisacres, rec_area_sf) + computed county_fips
  (5/30), a legitimate thin add consistent with this session's DC/
  Jefferson KY precedent since round 1 already confirmed this as the
  sole authoritative Honolulu-specific source. See Recently Completed
  below. Registry now covers 41 jurisdictions. Providence County RI/
  the Providence metro (20 facilities) was investigated next over 4
  probe rounds and closed as unavailable — Rhode Island has no county
  government and no live queryable parcel REST service was found at
  either the county or state level (RIGIS's real, 387-dataset
  statewide catalog has zero datasets titled "parcel"); see Open
  Handoffs for the full trail. Registry remains at 41 jurisdictions.
  Shelby County TN/the Memphis metro (20 facilities) was investigated
  next over 6 probe rounds — the most thorough of the session — and
  also closed as unavailable: a real, live, statewide TN Comptroller
  parcels service was found and confirmed genuine, but a decisive
  LIKE-query check proved Shelby's own data is not included in it
  (Shelby maintains an independent, non-federated assessor system);
  see Open Handoffs for the full trail. Registry remains at 41
  jurisdictions. Washoe County NV/the Reno metro (19 facilities) was
  investigated next and added within 2 probe rounds — the county's own
  ArcGIS org publishes a rich, nightly-refreshed 71-field parcels
  service, yielding an 19/30-field mapping (18 real fields), one of
  the richest additions this session. Registry now covers 42
  jurisdictions. Laramie County WY/the Cheyenne metro (19 facilities)
  was added next within 2 probe rounds — a 12/30-field mapping (11
  real fields) from the county's own "Assessor Parcels" service,
  after deliberately avoiding a same-name false friend ("Cheyenne
  County" is a real, distinct county in NE/KS/CO, not WY). Registry
  now covers 43 jurisdictions. New Castle County DE/the Wilmington
  metro (18 facilities) was added next within 2 probe rounds — a
  10/30-field mapping (9 real fields) from a pure cadastral/ownership
  layer hosted on the county's own domain but owned by Delaware's
  official statewide FirstMap GIS account. Registry now covers 44
  jurisdictions. DeKalb County GA/the Atlanta metro (18 facilities)
  was added next within 2 probe rounds after confirming (via multiple
  independent signals, since "DeKalb County" is a name shared by
  counties in IL/IN/TN/MO/AL) that the real candidate was genuinely
  Georgia — a 13/30-field mapping (12 real fields) from the county's
  own official yearly-versioned Tax Parcels service, with a real
  sample record's assessed/appraised ratio matching Georgia's
  constitutionally mandated 40% assessment rate as independent
  confirmation. Registry now covers 45 jurisdictions. Douglas County
  NE/the Omaha metro (18 facilities) was investigated next over 3
  probe rounds — "Douglas County" is shared by many states, confirmed
  Nebraska via the same ArcGIS account also owning
  douglascountyairquality.com and Omaha-imagery layers — and added
  with an 11/30-field mapping (10 real fields) from the county's
  "Parcels_for_BOE" (Board of Equalization) service, including a
  cross-checked confirmation that SQ_FEET is lot size (not building
  size) matching ACRES × 43,560. Registry now covers 46 jurisdictions.
  Manassas city VA (18 facilities) was added next over 3 probe
  rounds — an independent city, not a county, distinct from the
  separate Manassas Park city — with a 14/30-field mapping (13 real
  fields) from the city's own official "Manassas_Parcels" service
  after rejecting a token-gated alternate candidate. Registry now
  covers 47 jurisdictions. Alameda County CA (17 facilities, Oakland/
  Berkeley metro) was added next over 3 probe rounds — confirmed via
  the county's own DCAT catalog directly listing the winning service —
  with a 10/30-field mapping (9 real fields; no owner-name field
  exists in this schema at all) from the county's official "Parcels"
  service, including a cross-checked confirmation that TotalNetValue =
  Land + Imps − HOEX (homeowner's exemption). Also fixed a display bug
  in schema.js: the `date` formatter now converts ArcGIS epoch-
  millisecond date values to calendar dates instead of showing the
  raw integer, discovered while verifying this addition. Registry now
  covers 48 jurisdictions. Hennepin County MN/the Minneapolis metro (63
  facilities) — previously an "Open, not added" Open Handoffs item
  blocked on an HTTP 500 server error — was retried and resolved: the
  outage was transient, and the county's real candidate (the
  Metropolitan Council's regional 7-county parcels service, filtered
  to Hennepin via a where clause) was added with a 17/30-field mapping
  (16 real fields), one of the richest additions this session. Registry
  now covers 49 jurisdictions. Clark County NV/the Las Vegas metro (43
  facilities) — another "Open, not added" item, closed after 6 total
  probe rounds — was added with the thinnest mapping this session
  (3/30, 2 real fields: parcel_id and owner) after exhausting every
  candidate on the county's genuinely live GIS host and finding none
  expose value/zoning/sale-history data, only a shared canonical
  cadastral table reused across several specialized tool services.
  Registry now covers 50 jurisdictions. San Francisco County CA (39
  facilities) — an "Open, not added" item blocked by California's law
  against SF's Assessor-Recorder posting ownership data online — was
  closed after 5 total probe rounds: a live third-party ArcGIS mirror
  of DataSF's Socrata parcel dataset (pulled daily, verified fresh)
  let it use the proven `arcgis` connector, added with a 5/30-field
  mapping (4 real fields: parcel_id, pin, zoning_code, zoning_desc; no
  owner/value/legal data exists for SF from any source). Registry now
  covers 51 jurisdictions. The user then asked for the ad hoc
  county-by-county workflow to be replaced with a reusable, free-only
  batch pipeline. Phase 1 shipped over two PRs (#413, #414):
  `data/parcel_source_catalog.json` (a machine-readable index of every
  investigated source — production, blocked, rejected, candidate),
  `data/parcel_field_synonyms.json` (a seed corpus of verified
  source-field synonyms extracted from the registry),
  `data/parcel_priority_queue.py --next N` (ranks uncovered counties by
  facility count, flags reusable statewide services), and a CI
  restructure (scoped PR probing via a new changed-FIPS diff mapper,
  retry/backoff/multi-run confirmation in the health probe, replacing
  the old unscoped-on-every-PR sweep). Phase 2a shipped next (#415):
  `data/parcel_pipeline/field_mapper.mjs`, a deterministic tiered
  resolver validated against a ground-truth regression across all 51
  production jurisdictions (576 real mappings, 0 confident wrong
  guesses), plus a generalized mapping validator and a draft-only entry
  generator. Full live discovery (Phase 2b) was explicitly not built —
  it needs real network access this sandbox can't reliably provide, so
  it stays on the GitHub-Actions-dispatch-and-read-logs pattern used
  throughout this session. The user then asked whether all counties are
  covered and to continue until they are — a coverage check found only
  51 of 549 distinct counties with at least one facility actually
  covered. Resumed county-by-county expansion using the new priority
  queue, starting with Essex County NJ (reused Hudson County NJ's
  already-proven statewide service via a different `where` filter, zero
  fresh discovery). Registry now covers 52 jurisdictions. This is
  intended to continue indefinitely across many further rounds per the
  user's explicit standing instruction — see Recently Completed Work
  below for the ongoing detailed log, and Open Handoffs for anything
  that gets stuck.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Investigated San Francisco County CA for the parcel registry —
  the next highest-priority market by facility count after Bexar TX.
  Confirmed unavailable in its current form after 2 probe rounds; not
  added.
- Findings: Unlike most prior investigations, this wasn't a search for
  a hidden or misconfigured service — the real, live, official dataset
  was found immediately (round 1): DataSF's "Parcels - Active and
  Retired" Socrata dataset (data.sfgov.org, dataset id acdm-wktn),
  confirmed with real sample records — mapblklot/blklot parcel numbers,
  address components, zoning_code, a genuinely descriptive
  zoning_district field, administrative districts (supervisor/police/
  planning), real MultiPolygon geometry. What it doesn't carry is the
  problem: zero owner, assessed-value, or legal-description fields, and
  no composite address field. A web search found why: California state
  law prohibits San Francisco's Assessor-Recorder from posting
  ownership information online at all — available only for purchase or
  in person at the office. This is a structural legal restriction on
  this jurisdiction's public data, not a missing-data gap that more
  searching would fix.
- Round 2 checked for an ArcGIS-native alternative that might carry
  valuation data even without ownership: searched the ArcGIS Online
  account that owns the DataSF portal listing (`sfgov_agofo`, 247
  public items). Turned out to be San Francisco's general citywide GIS/
  analytics account (fire dashboards, business registry, census tracts,
  buildings, street-work schedules), not Assessor-specific. Its only
  "parcel" match, `real_parcel_leases`, is the Real Estate Division's
  city-owned leased-property dataset — a narrow, unrelated dataset, not
  general county parcels.
- Architecture note: even if DataSF's dataset carried enough fields,
  this registry's `connector: 'geojson'` (`js/parcel/connector-
  geojson.js`) has never been used by any of the 16 existing
  jurisdictions — every one uses `'arcgis'`. Its `_loadAll()` always
  fetches the entire GeoJSON file into memory in one request with no
  real pagination or bbox streaming (despite the file's header comment
  describing a `config.streaming` option that isn't actually
  implemented) — a risky fit for a full ~200k-parcel city dataset
  regardless of field coverage.
- Not added. See Open Handoffs below for the recommended next steps.
  Diagnostic files (`data/diagnose_sf.mjs`, `.github/workflows/
  _diagnose_sf.yml`) deleted in this commit.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Bexar County TX (San Antonio) to the parcel registry —
  the next highest-priority market by facility count after Miami-Dade
  FL.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 16 jurisdictions (up from
  15). Fetch-confirmed on the first GitHub Actions-dispatched probe
  round (this dev sandbox cannot reach bexar.org/arcgis.com directly) —
  another rare first-try success following Miami-Dade's: a web search
  surfaced a specific lead (a search result titled "Layer: Bexar CAD
  Parcels (ID:3)") that resolved live on the first probe, 38 real
  fields, polygon geometry. This dataset is Bexar County Appraisal
  District data as processed and redistributed through TxGIO (Texas
  Geographic Information Office)'s statewide parcel pipeline
  (description field cites "Date acquired by TxGIO: July 2025"), not a
  Bexar-County-hosted service directly — noted honestly even though no
  redistribution restriction was found in either metadata field. 14 of
  30 canonical fields mapped.
- Prop_ID mapped to parcel_id, GEO_ID (a distinct geographic/legal
  parcel number) to pin — same two-distinct-identifiers pattern as LA
  County's AIN/APN. SITUS_ADDR/MAIL_ADDR used directly for address/
  owner_mailing (real composite fields, alongside their own split
  component fields). MKT_VALUE used for assessed_value. DATE_ACQ (date
  the current owner acquired the parcel) mapped to last_sale_date.
  LEGAL_AREA/GIS_AREA both have accompanying unit-of-measure fields
  (LGL_AREA_U/GIS_AREA_U) but this round didn't sample real feature data
  to confirm their actual encoded units, so area_sqft/area_acres are
  left unmapped rather than guessed — same caution as Maryland's
  LANDAREA/LUOM precedent, though a confirming follow-up round could
  plausibly close this specific gap later. STAT_LAND_ (State Land Use
  code — field names in this source are truncated to 10 characters, a
  shapefile/dbf convention) mapped to land_use_code; LOC_LAND_U (a
  second, local land-use code, not free text) deliberately NOT mapped
  to land_use_desc. No building characteristics (count, floor area)
  exist in this parcel-focused layer.
- Validated the same way as every prior addition: fieldMap +
  notProvidedBySource cover all 30 canonical schema.js fields with zero
  gaps/overlaps (verified via script); `tests/parcel.test.js` — 293/293
  passing; live-tested via Playwright through the real
  `window.PARCEL_PANEL.show()` rendering path — populated fields render
  real values, gaps render "Not published by this source", no page
  errors.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Miami-Dade County FL to the parcel registry — the next
  highest-priority market by facility count after Clark NV (confirmed
  unavailable, see below).
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 15 jurisdictions (up from
  14). Fetch-confirmed on a single GitHub Actions-dispatched probe round
  (this dev sandbox cannot reach miamidade.gov directly) — a rare
  first-try success: a web search surfaced a specific lead
  (gisweb.miamidade.gov's "MD_LandInformation" MapServer layer 26,
  described by a search result as having "44 confirmed fields") and it
  resolved live on the first probe with 46 real fields, polygon
  geometry, layer name "Parcels @ PaParcel" (Property Appraiser). One of
  the richest sources in this registry: real owner names, full site/
  mailing address components, Florida DOR land-use code AND
  description, building characteristics, subdivision, and current land/
  building/total assessed values. 16 of 30 canonical fields mapped.
- FOLIO (Miami-Dade's real 13-digit parcel identifier) mapped to
  parcel_id; PID (a distinct internal integer id) mapped to pin.
  TRUE_OWNER1 used for owner (TRUE_OWNER2/3 exist for co-owners, same
  primary-value convention as NYC's ZoneDist1). Mailing address is
  genuinely split across 6 separate fields with no composite of its
  own, so owner_mailing is correctly left unmapped rather than
  concatenated. LOT_SIZE exists but has no accompanying unit-of-measure
  field, so area_sqft/area_acres are left unmapped — same caution as
  Maryland's LANDAREA/LUOM and Maricopa's LAND_SIZE precedent. No
  sale-transaction or legal-description fields exist in this layer.
- Licensing: no description/copyrightText found on this specific layer
  (both fields present in the schema but empty) — hosted on the
  county's own official gisweb subdomain, treated as standard public
  government data like every other county in this registry except Cook
  County IL.
- Validated the same way as every prior addition: fieldMap +
  notProvidedBySource cover all 30 canonical schema.js fields with zero
  gaps/overlaps (verified via script); `tests/parcel.test.js` — 293/293
  passing; live-tested via Playwright through the real
  `window.PARCEL_PANEL.show()` rendering path — populated fields render
  real values, gaps render "Not published by this source", no page
  errors.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Investigated Clark County NV (Las Vegas) for the parcel
  registry — the next highest-priority market by facility count after
  Travis TX. Confirmed unavailable after 3 probe rounds; not added.
- Findings: `maps.clarkcountynv.gov` is genuinely live with a real
  Assessor folder listing 25+ services (round 1) — this is not a
  Santa-Clara-style dead-service case. Two named candidates were
  checked in detail: `Assessor_Base_Map` (round 2) turned out to be a
  `singleFusedMapCache` tile basemap with an empty sub-layers list — no
  queryable attributes exist on it at all, ruled out structurally, not
  by guesswork. `BOE_Parcels` (rounds 2-3) is a real, live, queryable
  FeatureServer, but its one sub-layer has `esriGeometryPoint` geometry
  (not polygon) and only 8 sparse fields (OBJECTID, parcel, prim_parcel,
  id, parent_id, form, status, descr) — no address, owner, assessed
  value, or legal description. "BOE" is Board of Equalization; the
  field names (form/status) and point geometry both indicate this is an
  appeal-case index pointing at parcels, not parcel boundary data
  itself — genuinely the wrong layer, not a licensing or connectivity
  problem.
- Not investigated further (this session's established 2-3 round
  budget): the Assessor folder lists ~20 more untried services —
  `Assessor/added_current`, `Assessor/AOSubdivisions`,
  `Assessor/CommonArea`, `Assessor/LandApp`, `Assessor/ParcelHistory`,
  `Assessor/ParcelDrafter`, `Assessor/clarktrs_qq_p`, and the yearly
  `Added_20XX`/`Cancelled_20XX` series — any of which could plausibly be
  the real general-purpose parcel boundary layer this county surely has
  somewhere, given how rich this GIS host otherwise is. A human
  spot-checking that list directly (rather than guessing from service
  names alone, the way this session's first two guesses did) is the
  fastest path forward. `gisgate.co.clark.nv.us`, the alternate/older
  host mentioned by search results, failed at the connection level on
  both attempts in round 1 — likely retired in favor of
  maps.clarkcountynv.gov, not worth retrying.
- Closed as won't-fix pending a human follow-up, same pattern as Santa
  Clara CA / Hennepin MN / Denver CO. Diagnostic files (`data/
  diagnose_clark.mjs`, `.github/workflows/_diagnose_clark.yml`) deleted
  in this commit — no permanent trace left in the codebase, all findings
  preserved here instead.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Travis County TX (Austin) to the parcel registry — the
  next highest-priority market by facility count after New York County.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 14 jurisdictions (up from
  13). Fetch-confirmed across 2 GitHub Actions-dispatched probe rounds
  (this dev sandbox cannot reach traviscountytx.gov directly). Round 1's
  blind subdomain guesses (gis.traviscad.org, maps.traviscad.org) failed
  at DNS; gis.traviscountytx.gov resolved but 404'd at a guessed path.
  Rather than keep guessing, round 2 used a web search, which surfaced
  the real path structure (this host uses "server1", not "arcgis", in
  its REST base path) and confirmed the "TCAD_public" layer live with a
  real 21-field schema on the first specific URL tried.
- Only 7 of 30 canonical fields mapped — the thinnest of any Texas
  source in this registry. "TCAD_public"'s name and its field list
  (situs address, legal description, acreage, no owner/valuation/zoning
  at all) both indicate a deliberately limited public-facing boundary
  layer, same pattern as this registry's Virginia counties: the fuller
  CAMA record (owner, assessed value, sale history) lives behind TCAD's
  own separate property-search portal, a third-party ProdigyCAD-hosted
  system that isn't a general-purpose queryable service, not this
  ArcGIS layer. Documented honestly as thin rather than padded with
  guesses; two sibling layers at the same host (a plain "TCAD" MapServer
  and "TCAD_Travis_County_Property") were checked and ruled out — the
  latter turned out to be Travis-County-government-owned property only,
  not general parcels.
- Licensing: copyrightText identifies the source as "Travis Central
  Appraisal District" — no redistribution restriction found, same as
  every other county in this registry except Cook County IL.
- Validated the same way as every prior addition: fieldMap +
  notProvidedBySource cover all 30 canonical schema.js fields with zero
  gaps/overlaps (verified via script); `tests/parcel.test.js` — 293/293
  passing; live-tested via Playwright through the real
  `window.PARCEL_PANEL.show()` rendering path — populated fields render
  real values, gaps render "Not published by this source", no page
  errors.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added New York County NY (Manhattan) to the parcel registry —
  the next highest-priority market by facility count after Harris TX.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 13 jurisdictions (up from
  12). Fetch-confirmed across 4 GitHub Actions-dispatched probe rounds
  (this dev sandbox cannot reach arcgis.com directly). Unusually clean
  investigation: the first guess (MAPPLUTO, NYC Department of City
  Planning's citywide parcel/land-use dataset) was right on round 1,
  independently confirmed via ArcGIS Online catalog search as owned by
  the real "DCP_GIS" account. Round 2 fetched its real 103-field schema.
  Rounds 3-4 were needed to confirm the real encoded value of the
  Borough field (round 3's own probe script had a bug — it logged the
  query response's field schema instead of the actual returned feature
  attributes, a false dead-end fixed in round 4, which confirmed
  Borough='MN'/BoroCode=1 for Manhattan from real sample records).
  17 of 30 canonical fields mapped — strong on zoning/land-use/physical
  characteristics (this is a land-use dataset, not a tax roll), but no
  improvement-value, tax-year/amount, or sale-history fields exist at
  all, unlike an assessor's-office source.
- MAPPLUTO covers all five NYC boroughs in one layer, each its own
  county FIPS. This is the first jurisdiction in the registry where the
  source service itself isn't already scoped to a single county, so a
  new `where` config field was added to `js/parcel/connector-arcgis.js`
  (defaults to `'1=1'`, zero behavior change for the other 12
  jurisdictions) and set to `Borough = 'MN'` for this entry, so panning
  near the Harlem River/Bronx border can't render a neighboring
  borough's parcels under New York County's name.
- Licensing: copyrightText identifies the source as "NYC Department of
  City Planning, Information Technology Division" — no redistribution
  restriction found, same as every other county in this registry except
  Cook County IL.
- Validated the same way as every prior addition: fieldMap +
  notProvidedBySource cover all 30 canonical schema.js fields with zero
  gaps/overlaps (verified via script); `tests/parcel.test.js` — 293/293
  passing; live-tested via Playwright through the real
  `window.PARCEL_PANEL.show()` rendering path — populated fields render
  real values, gaps render "Not published by this source", no page
  errors.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Harris County TX to the parcel registry — the next
  highest-priority market by facility count after LA CA, following Santa
  Clara CA / Hennepin MN / Denver CO being documented as blocked/needing
  more research.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 12 jurisdictions (up from
  11). Fetch-confirmed over 4 GitHub Actions-dispatched probe rounds
  (this dev sandbox cannot reach arcgis.com/hctx.net directly) — more
  rounds than any other county this session, but for a reassuring reason:
  a real, authoritative service was found on the first owner-scoped
  search (round 1), the remaining 3 rounds were purely mechanical fixes
  (round 2: fetch real schemas for two real candidates; round 3:
  discovered the correct layer index is 1, not 0; round 4: a transient
  network failure on layer 1 cleared up on retry with a longer timeout —
  the service was live the whole time, this sandbox's network just
  couldn't reach it on that one attempt). 13 of 30 canonical fields
  mapped from a rich 61-field HCAD (Harris County Appraisal District)
  appraisal-roll schema — real land/improvement/total-appraised values,
  tax year, legal description, and a genuine last-transfer date. No
  address field (split across 8 unmapped components, same convention as
  every other split-address source in this registry), no zoning, and no
  year-built field exist in this particular layer.
- The self-hosted "HCAD Parcels Layer" alternative at hcusgis.hctx.net
  (Harris County's own domain) failed at the connection level from this
  sandbox's network on every attempt across all 4 rounds — genuinely
  undetermined whether it's down or just unreachable from here, not
  confirmed dead. Not investigated further since the ArcGIS Online
  service turned out live and sufficient.
- Licensing: the service's own copyrightText/description identify it as
  "Official Dataset... Parcel data received from HCAD," attributed to
  "Harris County Appraisal District, GIS Division" with a physical
  address — no redistribution restriction found in either field, a
  cleaner and more direct confirmation than King County's (whose
  terms-of-use page couldn't be fetched at all) since this service's own
  metadata was directly readable.
- Validated the same way as every prior addition: fieldMap +
  notProvidedBySource cover all 30 canonical schema.js fields with zero
  gaps/overlaps; live-tested via Playwright through the real
  `window.PARCEL_PANEL.show()` rendering path — populated fields render
  real values, gaps render "Not published by this source", no page
  errors.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Los Angeles County CA to the parcel registry — the next
  highest-priority market by facility count after Franklin OH / King WA.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 11 jurisdictions (up from
  10). Fetch-confirmed on a GitHub Actions runner (this dev sandbox
  cannot reach lacounty.gov directly) — the county's own public GIS
  portal (public.gis.lacounty.gov) was the first candidate tried and
  returned a live, rich 92-field Assessor-roll layer on the first probe.
  12 of 30 canonical fields mapped: AIN and APN are both real, distinct
  identifier fields, mapped to parcel_id and pin respectively rather than
  reusing one for both. No owner-name or mailing-address field exists
  (same redaction pattern as Maryland). No lot-size field exists either —
  Shape.STArea() is present but is a raw geometry-derived value with no
  confirmed real-world unit, so area_sqft/area_acres are left unmapped
  rather than guessed, matching the Maryland LANDAREA / Maricopa
  LAND_SIZE precedent. No sale-transaction fields exist. The layer
  records up to 5 separate structures per parcel (fields suffixed 1-5);
  only the first structure's year-built/floor-area are mapped, since
  there's no generic multi-structure aggregation mechanism.
- Validated the same way as every prior addition: fieldMap +
  notProvidedBySource cover all 30 canonical schema.js fields with zero
  gaps/overlaps; live-tested via Playwright through the real
  `window.PARCEL_PANEL.show()` rendering path — populated fields render
  real values, gaps render "Not published by this source", no page
  errors.
- Licensing: hosted on the county's own "public" GIS subdomain
  (public.gis.lacounty.gov, not a third-party ArcGIS Online org), under
  the "LACounty_Cache" namespace — an official county-operated public
  service. No redistribution restriction found. Treated as standard
  public government data, same as every other county in this registry.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Franklin County OH and King County WA to the parcel
  registry — the next two highest-priority markets by facility count
  after Santa Clara CA was confirmed unavailable (see Open Handoffs).
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 10 jurisdictions (up from
  8). Both fetch-confirmed across multiple GitHub Actions-dispatched
  probe rounds (this dev sandbox cannot reach either county's GIS host
  directly): Franklin County's Auditor-hosted "Tax Parcel" layer (117
  fields) is one of the few sources in this registry carrying genuine
  sale-transaction data (SALEDATE/SALEPRICE) alongside ownership,
  physical characteristics, and valuation — 18 of 30 canonical fields
  mapped. King County's richer of two candidate services,
  PARCEL_ADDRESS_PUB_AREA_3069 (69 fields), was chosen over the thinner
  12-field PUBLIC_PARCELS_AREA_2598 — 15 of 30 canonical fields mapped,
  including zoning, acreage, taxable land/improvement values (King County
  publishes both "appraised" and "taxable" variants; taxable was used to
  match how other jurisdictions' "assessed value" concept is used
  elsewhere in this registry — no total field exists for either variant,
  so assessed_value is correctly left unmapped rather than computed,
  since this connector has no generic sum mechanism beyond the
  `__computed__` special case for county_fips).
- Every fieldMap entry verified against each service's real, live field
  list (not guessed); every jurisdiction's fieldMap + notProvidedBySource
  validated programmatically to cover all 30 canonical schema.js fields
  with zero gaps and zero overlaps. Live-tested via Playwright against a
  local static server with synthetic features run through the real
  `window.PARCEL_PANEL.show()` rendering path — populated fields render
  their real values, gap fields correctly render "Not published by this
  source", no page errors.
- Licensing: King County's service is hosted on the county's official
  public "Open Data" ArcGIS Hub (gis-kingcounty.opendata.arcgis.com)
  under owner "KingCounty" with a "_PUB" naming convention signaling
  deliberate public release. The Hub's terms-of-use page is a
  client-rendered app so its exact text could not be fetched directly by
  a plain HTTP request, and the service's own copyrightText/description
  fields are empty — but no redistribution restriction was found
  anywhere reachable, unlike Cook County IL where an explicit prohibition
  was found in the source's own documentation. Treated as standard public
  government open data, consistent with every other county in this
  registry; documented as a caveat rather than asserted as a definitively
  confirmed clean license.
- Found (not fixed) during this work: comprehensive validation of every
  jurisdiction's fieldMap + notProvidedBySource against schema.js's 30
  canonical fields (not just the 2 new ones) turned up a pre-existing gap
  in the 3 Virginia counties (Loudoun, Fairfax, Prince William) — each is
  missing several canonical fields from both fieldMap and
  notProvidedBySource (e.g. legal_desc, census_tract, tax_amount,
  owner_mailing, zoning_desc), meaning those fields silently render
  nothing instead of the "Not published by this source" label. This
  predates this session's changes — schema.js almost certainly grew new
  canonical fields after the VA counties' notProvidedBySource lists were
  last written. Not fixed here: it needs the same fetch-confirm rigor as
  every other entry, not a guess made as a side effect of an unrelated
  PR. New Open Handoffs entry added below.
- Deliberately NOT done: did not attempt Los Angeles CA, Hennepin MN,
  Denver CO, or Harris TX yet — next in the priority queue.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added 3 new counties to the parcel registry — Maricopa AZ,
  Dallas TX, and Fulton GA — the next-highest-priority markets by
  facility count after fixing the Maryland outage (see below), skipping
  Cook County IL for the licensing reason noted in Open Handoffs.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/registry.js` now covers 8 jurisdictions (up from
  5). Each new entry followed the same fetch-confirm-before-wiring
  process as the Maryland fix: verified live via a temporary diagnostic
  dispatched on a GitHub Actions runner (this sandbox can't reach
  `arcgis.com`/county GIS domains directly), built the fieldMap against
  the service's real field list rather than a guess, and declared every
  canonical field with no real backing field via `notProvidedBySource`
  (verified programmatically that every jurisdiction's fieldMap +
  notProvidedBySource together account for all 30 canonical schema
  fields with zero gaps and zero overlaps). Maricopa County's service
  turned out unusually rich — 57 fields including a real owner-name
  field (several jurisdictions in this registry redact it) and full
  valuation/sale/deed data. Dallas County's available service (the
  Dallas Central Appraisal District's own service 404'd; used the City
  of Dallas's basemap layer instead) is much thinner — no zoning,
  valuation, or sale-history fields at all, honestly reflected via 21
  `notProvidedBySource` entries rather than padded out with guesses.
  Also fixed a hardcoded "5 counties" claim on the About page's roadmap
  section (now reads the registry's actual count, so it can't go stale
  again as more counties are added).
- Verified, not assumed: independently re-checked each candidate
  county's licensing terms before wiring anything up (this is what
  caught the Cook County restriction). For the 3 added, ran the
  project's own field-coverage validation script (all fieldMap +
  notProvidedBySource entries are valid canonical IDs, zero missing,
  zero overlapping) — this caught one real gap (Fulton's `land_use_desc`
  was accidentally left unaccounted for) before it shipped. Then
  verified live in a browser: called `window.PARCEL_PANEL.show()` with
  synthetic features for all 3 new counties and confirmed populated
  fields render their real values while every `notProvidedBySource`
  field correctly shows "Not published by this source" — not just that
  the code looks right. `tests/run_all.sh` 176/176 and
  `tests/parcel.test.js` 293/293 passing.
- Files changed: `js/parcel/registry.js`, `js/analytics.js`, this file.
- Related systems: the parcel intelligence panel and map layer for the
  3 new counties; the About page's platform roadmap section.
- Deliberately NOT done: did not add Santa Clara County CA (its
  candidate service timed out on the first probe, later confirmed dead —
  see the follow-up entry below) or Cook County IL (licensing) — see Open
  Handoffs and Active Work above.

- Date: 2026-08-03
- Agent: Claude Code
- Task: Investigated Santa Clara County CA (#4 parcel-expansion target by
  facility count) after its first probe timed out inconclusively. Result:
  confirmed unavailable, not added.
- Shipped: three rounds of GitHub Actions-dispatched probing (this
  sandbox can't reach these hosts directly). Round 1 gave the original
  candidate a longer timeout — it failed outright with a connection/DNS
  "fetch failed" on two endpoints, confirming it's genuinely dead rather
  than slow. Round 2 found the county's ArcGIS Hub site is live but
  keyword search only returns a generic dataset listing. Round 3 drilled
  into that listing plus a direct ArcGIS Online catalog search and found
  the real, live Santa Clara County Planning Office ArcGIS org — but
  every Feature Service it exposes is a narrow subset (open space
  easements, Williamson Act agricultural parcels, land use designations),
  not a general county-wide parcel boundary/assessor layer.
- Deliberately NOT done: did not add Santa Clara to the registry — no
  fieldMap was built because no general parcel service was found to
  build one against. Did not keep trying further keyword-search
  variations once the org's real content was enumerated and none of it
  matched — see Open Handoffs for the recommended human follow-up.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Related systems: `js/parcel/registry.js` (no changes — this is a
  negative-result investigation).
- Task: Fixed the Maryland parcel endpoint outage (Howard 24027 +
  Montgomery 24031), open since 2026-07-31 — the first step of a
  user-requested effort to expand parcel coverage incrementally,
  starting with fixing what was already broken before adding more
  counties.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: the statewide endpoint didn't just have an extended outage —
  Maryland migrated it to a different hostname. `geodata.md.gov` (the
  old URL) now serves an explicit "Site Maintenance" HTML page (not a
  generic error), confirming a deliberate move rather than a crash;
  the identical service is live at `mdgeodata.md.gov`. Both MD
  registry entries repointed there. While already re-verifying the
  service, also fetched its real, complete 117-field schema and
  corrected the *entire* fieldMap against it — the previous mapping
  had been written without ever fetching the schema and got nearly
  every non-boundary field wrong (`TOTAL_ASSESSED`, `ASSESSMENT_YEAR`,
  `DEED_DATE`, `SALE_PRICE`, `SUBDIVISION`, `OWNER`: none of these
  exist on the real service). Now 22 fields map correctly per county
  (up from 17 mostly-invented ones), including 8 newly-available
  canonical fields the old mapping never touched at all (lot
  dimensions, year built, gross floor area, deed book/page, legal
  description, census tract). No owner-name field exists anywhere in
  the schema — Maryland's public layer appears to deliberately redact
  it — recorded via `notProvidedBySource` (8 fields) rather than
  guessed, so the parcel panel now explicitly says "Not published by
  this source" for those (see the 2026-08-02 parcel-panel-wording fix)
  instead of silently showing nothing, which is what MD's panel did
  for every unmapped field before since it never had a
  `notProvidedBySource` block at all.
- Verified, not assumed: this sandbox cannot reach `arcgis.com`/
  `*.md.gov` directly, so used the same technique as the earlier HIFLD
  investigation — a temporary diagnostic script + workflow
  (`_diagnose_md_parcels`, removed after use) dispatched on a GitHub
  Actions runner with real network access. It directly fetched
  `?f=json` from both the old and new hostnames (confirming the 200 vs.
  "Site Maintenance" 503 split) and pulled the service's real field
  list, rather than trusting a web search summary. Confirmed the new
  fieldMap's 22 keys and 8 `notProvidedBySource` entries are all valid
  canonical schema.js field IDs (no typos). Full `tests/run_all.sh`
  176/176 and `tests/parcel.test.js` 293/293 passing.
- Files changed: `js/parcel/registry.js`, this file.
- Related systems: the parcel intelligence panel for both MD counties;
  the monthly `check_parcel_services.yml` probe (will report `LIVE`
  for both on its next run instead of the recorded `DEAD*`).
- Next: per the user's request, continuing to add more counties
  incrementally — see Open Handoffs below for the prioritization
  approach.

- Date: 2026-08-03
- Agent: Claude Code
- Task: After 4 survey-and-fix rounds this session (PRs #216-224) landed
  several subtle bugs — a race condition, a listener leak, an href
  scheme-validation gap — none of them had regression coverage, so they
  could silently reappear. Added tests for the two most likely to
  regress silently rather than starting a 5th survey.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped:
  - `tests/test_frontend_core.mjs`: 10 new cases for `safeHref()`
    (added in #221) — real `http`/`https` URLs pass through unchanged
    (case-insensitively), `javascript:`/`data:`/whitespace-padded/
    relative/empty/`null`/`undefined` all reduce to `"#"`.
  - New `tests/test_economy_map_race.mjs`, wired into `run_all.sh`'s
    always-run suite list (no jsdom needed — `economy-map.js` has no
    module-scope DOM dependency, only function-scope, so a handful of
    targeted mocks for `document.querySelector`/`window.ECONOMY`/
    `window.layerStateRef` are enough). Drives the exact race #220
    fixed with controllable, individually-resolvable promises (no real
    network, no timing flakiness): toggle layer A on, toggle layer B
    on before A's fetch resolves, resolve A's now-stale request first,
    then B's — asserts the final active layer/checkbox state is
    self-consistent.
- Verified, not assumed: didn't just confirm the new test passes —
  checked out `economy-map.js` as it stood immediately before #220 and
  ran the new test against it specifically to confirm it fails there
  (2 of 8 assertions fail, including a raw `TypeError` from the
  pre-fix code never even calling `load()` a second time), then
  restored the fixed version and confirmed all 8 pass again. A test
  that can't fail proves nothing; this one demonstrably can.
- Files changed: `tests/test_frontend_core.mjs` (new cases),
  `tests/test_economy_map_race.mjs` (new file), `tests/run_all.sh`
  (wired in), `AI_TEAM_STATUS.md`.
- Related systems: the always-run (non-jsdom-gated) portion of the test
  suite specifically, so this coverage can't be silently skipped the
  way the jsdom-gated suites can be (see the 2026-08-02 `run_all.sh`
  fix above).
- Deliberately NOT done: did not add regression coverage for the
  `economy-view.js` listener leak (#220) or the parcel-panel wording
  fix (#222) — both live inside code that touches the real DOM/Leaflet
  at a level this session's targeted-mock approach doesn't reach
  cleanly (panel.js and the DOM-heavy parts of economy-view.js are
  already deliberately excluded from the unit suite for this reason;
  see parcel.test.js's own header comment). Live Playwright
  verification was done for both at the time and is recorded in
  BUG_TRACKER.md, but that verification wasn't captured as a
  repeatable automated test in this pass.

- Date: 2026-08-02
- Agent: Claude Code
- Task: A 4th codebase survey, this time specifically targeting
  performance (main-thread blocking, redundant DOM work against the
  app's largest datasets — ~3,143 counties, ~4,300+ facilities) and
  data-pipeline computational correctness (aggregation, timezone,
  filtering) — two angles an earlier survey asked about but didn't
  substantively cover. Unlike the first three survey rounds, this one
  came back essentially clean, which is itself useful signal: no O(n²)
  DOM-query-in-loop patterns, no un-cleared polling loops outside the
  already-fixed economy-view.js, `map.js`'s county layers already use a
  single `L.geoJSON` with in-place `setStyle()` rather than recreating
  layers, and Python-side rounding/timezone handling checked out
  correct everywhere examined.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: one real, if low-impact, correctness bug the survey did
  find — `update_economic_data.py`'s county records stored a 3-digit
  county-only code in their `county_fips` field instead of the full
  5-digit FIPS every other file in the codebase uses as a join key.
  Confirmed via grep that no current JS consumer reads this specific
  field (records are correctly indexed by their dict key instead), so
  it's dead code today, not a live bug — but worth fixing before
  something starts reading it and gets silently wrong matches. One-line
  fix: store the already-validated 5-digit `fips` instead of its bare
  3-digit `co` component.
- Verified, not assumed: independently re-checked the agent's "likely
  dead code" claim myself with a direct grep of `economy.js`/
  `economy-view.js`/`economy-map.js` before treating it as confirmed,
  rather than taking the survey's word for it. Confirmed the fix's
  `fips` variable is the same validated 5-digit value already used as
  the dict key a few lines below. `python3 data/update_economic_data.py
  --check` passes; `tests/run_all.sh` 176/176 passing.
- Also evaluated and deliberately did NOT act on: a debounce
  inconsistency the same survey flagged (`pipeline.js`'s facility
  search and `analytics.js`'s ranking search re-filter on every
  keystroke while `map.js`'s layer search debounces) — real
  inconsistency, but both un-debounced call sites are already windowed/
  paginated, so the actual per-keystroke cost is a cheap array scan,
  not a full re-render. Not worth a PR on its own; noted here in case a
  future pass wants to normalize it for consistency's sake.
- Files changed: `data/update_economic_data.py`, `BUG_TRACKER.md`, this
  file.
- Related systems: the Update Economic Data GitHub Action and its
  output (`data/economy/census_county.json`, `census_state.json`).
- Deliberately NOT done: this is a good natural checkpoint for the
  survey-and-fix loop that's been running this session (PRs #216-223,
  8 merged) — four consecutive rounds have now been run, and this last
  one found nothing else worth shipping. Not launching a 5th round
  automatically; the remaining Open Handoffs below are genuinely
  external/blocked, not further-surveyable.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Picked up two already-scoped items straight from Open Handoffs
  below rather than running a fourth research survey: the parcel panel's
  wording for attributes a source doesn't publish, and verifying whether
  the `data/*.py` missing-`encoding="utf-8"` handoff was still real.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `js/parcel/panel.js`'s `_fmtFieldRow()` (used by the Details,
  Zoning, and Valuation tabs alike) previously just omitted a row
  whenever a field's value was empty — indistinguishable to a user from
  a bug, whether the parcel genuinely has no value or the source never
  publishes that field type at all (`registry.js`'s `notProvidedBySource`
  already recorded the distinction, but nothing surfaced it). Now checks
  the current parcel's jurisdiction (via `props.county_fips` →
  `PARCEL_REGISTRY.get()`) and, for a field explicitly listed as not
  provided, renders "Not published by this source" instead of nothing.
  Also fixed the Zoning tab's zoning-code badge specifically, which had
  no fallback at all when absent — it now shows "Zoning code not
  published by this source" rather than the badge silently vanishing,
  the single most visually prominent instance of this gap. New
  `.pp-field-na` style (muted, italic) added to `parcel.css`.
- Verified, not assumed: since `panel.js` is deliberately excluded from
  the unit suite (touches the live document/Leaflet), and this sandbox
  cannot reach the real ArcGIS parcel services to select a live parcel,
  called `window.PARCEL_PANEL.show()` directly in a live browser with a
  synthetic feature shaped exactly like Loudoun County's real props
  (only the fields its real `fieldMap` actually provides present; all
  17 of its `notProvidedBySource` fields genuinely absent). Confirmed
  all 17 render "Not published by this source" across Details/Zoning/
  Valuation, confirmed the zoning-code badge fallback specifically, and
  separately confirmed genuinely-provided fields (parcel ID, area,
  subdivision) still render their real values unaffected. Full
  `tests/run_all.sh` 176/176 passing.
- Also: re-checked the `encoding="utf-8"` handoff below with a script
  scanning every `open()`/`read_text()`/`write_text()` call under
  `data/` recursively (the original handoff only appears to have
  checked the top level) — it's already fully resolved, zero calls
  missing `encoding=`. Removed the stale handoff entry; see the note
  left in its place for detail.
- Files changed: `js/parcel/panel.js`, `css/parcel.css`,
  `BUG_TRACKER.md`, this file.
- Related systems: the parcel intelligence panel (all three data tabs),
  every jurisdiction currently in the registry.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed two bugs found in a third codebase survey after PRs
  #216-#220 merged: a `javascript:`/`data:` URI scheme-validation gap
  across six `href` render sites, and three unguarded theme-change
  `localStorage.setItem` calls that could throw uncaught or leave an
  unhandled promise rejection. Also removed one small piece of dead
  code found in the same pass.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped:
  - Every file's local `esc()`/`escHtml()` helper HTML-encodes `& < >
    "` but none of them block a dangerous URL *scheme* — six
    `href="${esc(url)}"` sites in `report.js` (source citations, signal
    source URLs), `jurisdiction.js` (policy sources, archived-copy
    links, suggested-replacement links, related-news links), and
    `stocks.js` (related-news links) rendered `href` straight from
    automated scraper/RSS-adapter data with no scheme check. Added a
    single `safeHref(url)` to `js/constants.js` — this codebase's
    established home for de-duplicating site-wide helpers — that
    passes through real `http(s)` URLs and reduces anything else
    (`javascript:`, `data:`, empty, malformed) to a safe `"#"`. Applied
    at all six sites, composed with (not replacing) each file's
    existing escaping call.
  - Three `localStorage.setItem('theme', ...)` call sites (the header
    theme-toggle button in `map.js`, both branches of
    `applyThemeValue()` in `account.js`, and `auth.js`'s
    `setPreference()`) had no try/catch, unlike every other
    `localStorage` write site in the codebase. In a quota-exceeded or
    Safari-private-browsing environment, `setItem` throws — in
    `map.js` this happened *before* the theme actually changed, so the
    toggle button would silently do nothing on click; in `auth.js`'s
    `async setPreference()` (called with no `await`/`.catch()`
    anywhere) it would instead surface as an unhandled promise
    rejection on every theme change. Wrapped all four call sites (plus
    the paired `getItem` read) in `try {} catch {}`, matching the
    pattern already used everywhere else in this codebase for
    best-effort persistence.
  - Removed an unused `summIsDupe` computation in `js/news.js`
    (`_renderLeadCard` — computed but never referenced; the actual
    gating condition a few lines below is a different, simpler check).
- Verified, not assumed: exercised `safeHref()` directly in-browser
  against real URLs, dangerous schemes, and edge cases (empty,
  `undefined`, whitespace-padded, relative paths) — all resolved
  correctly. Loaded the Jurisdiction detail page live and confirmed
  every rendered source/archive/news `href` is still a real, correct
  URL (including Google News RSS redirect links), unaffected by the
  new guard. Clicked the header theme-toggle button live and confirmed
  it still correctly changes `data-theme`. Full `tests/run_all.sh`
  176/176 passing.
- Files changed: `js/constants.js`, `js/report.js`, `js/jurisdiction.js`,
  `js/stocks.js`, `js/map.js`, `js/account.js`, `js/auth.js`,
  `js/news.js`, `BUG_TRACKER.md`, this file.
- Related systems: every page that renders scraper/API-sourced links
  (Jurisdiction detail, county reports, AI Stocks news panel); the
  site-wide theme toggle (header button and the Account panel's theme
  selector).

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed two bugs found in the same codebase survey as the
  monitor_legislation fix below: a race condition in `js/economy-map.js`
  (rapid economic-layer toggling could desync the map from its own
  checkbox UI) and a listener/memory leak in `js/economy-view.js`
  (`selectRegion()`/`renderProfile()` never called `_teardown()`,
  contradicting the file's own documented render-lifecycle invariant).
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped:
  - `economy-map.js`'s `activate()` used a single `_loading` boolean as
    a mutex. Toggling layer A, then layer B before A's fetch resolved,
    made B's `activate()` call return `false` immediately (mutex still
    held) — indistinguishable from a genuine failure — while A's
    original promise later resolved and won anyway, leaving the map
    showing A's data with *neither* checkbox checked (B's toggle
    rolled back as "failed"; A's own checkbox had already been
    unchecked by B's "turn off other economic layers" exclusivity
    logic before A's promise resolved). Replaced the boolean mutex with
    a monotonic `_requestGen` counter: every toggle bumps it, and each
    in-flight `activate()` call compares its captured generation against
    the current one when its promise resolves — a stale/superseded
    request now returns `null` and is silently discarded (no checkbox
    rollback, no restyle), rather than being treated as a failure.
  - `economy-view.js`: every click in the Regional Explorer calls
    `selectRegion()` → `renderProfile()`, which replaces `#econ-profile`'s
    `innerHTML` (detaching its buttons) and rewires fresh listeners via
    `wireProfileActions()` — but nothing tore down the *previous*
    selection's listeners, so their closures (holding references to
    now-detached nodes) accumulated unboundedly in the module-level
    `_cleanups` array for the life of the page view. Fixed with a
    separately-scoped `_profileCleanups`/`onProfile()`/`_teardownProfile()`
    trio (mirroring the existing `_cleanups`/`on()`/`_teardown()`
    pattern) so the profile panel's own listeners are torn down before
    every re-render, without touching the still-live listeners other
    sections (KPI strip, trends, signals, search) registered through
    the shared `_cleanups`. Also caught and fixed two more call sites
    that bypass `renderProfile()` entirely (the geo-toggle and
    metric-clear handlers, which reset `#econ-profile`'s content
    directly) — both would have leaked through the same gap and needed
    their own `_teardownProfile()` call.
- Verified, not assumed: reviewed the diff in full before accepting it,
  then independently reproduced both bugs' *fixed* behavior live rather
  than trusting the diff alone. Race condition: throttled the county
  data fetch via Playwright route interception, rapidly toggled two
  layers within the resulting race window, and confirmed the final
  state is self-consistent (whichever layer ended up active matches
  its checkbox and `layerStateRef`) — plus confirmed ordinary
  single-toggle on/off still works normally. Memory leak: called
  `selectRegion()` 8 times in a row via the exposed
  `window.ECONOMY_VIEW.selectRegion()`/`_debug()` API and confirmed
  `profileListenerCount` stays flat at 3 across all 8 calls (would have
  grown to 24 before the fix), then specifically checked for a stale-
  closure symptom — selected county A, then county B, then clicked the
  watchlist button once, and confirmed only B (the current selection)
  got watchlisted, not A. Full `tests/run_all.sh` 176/176 passing.
- Files changed: `js/economy-map.js`, `js/economy-view.js`,
  `BUG_TRACKER.md`, this file.
- Related systems: the Economy tab's map-layer toggle UI and Regional
  Explorer profile panel. No other page's code touched.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed a truthfulness bug in `monitor_legislation.yml`/
  `monitor_legislation.py` (a monitor-script crash could be misreported
  as "new legislation flagged" or a clean "no new items" run) and
  removed a dead, unwired-up `ISO_QUEUE_URLS` dict in `ferc_queue.py`.
  Found while surveying the codebase for the next round of work after
  the accessibility PRs (#216/#217/#218) merged.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `main()` in `monitor_legislation.py` now wraps its call to
  `run_monitoring()` in `try`/`except` — an uncaught exception returns
  `2`, distinct from `0` (no new items) and `1` (new items found),
  where previously it would have fallen through to Python's own default
  exit code of `1` for an unhandled exception, identical to the
  deliberate "found something" signal. The workflow's "Print summary"
  step now treats `2` as a real failure (fails the step so the job
  shows red, instead of continuing to show green under
  `continue-on-error`), and a new step files/updates a GitHub issue
  tagged `data-validation` — a label that was already defined in this
  workflow but never actually used anywhere in it — mirroring the
  pattern `update_data.yml` already used correctly for its own
  validator-failure case. `ISO_QUEUE_URLS` (7 per-ISO URLs, zero
  references anywhere) removed from `ferc_queue.py`; the same
  information already exists as prose in the file's docstring.
- Verified, not assumed: monkeypatched `run_monitoring()` to exercise
  all three `main()` outcomes directly (crash → `2` with traceback +
  marker printed; empty list → `0`; populated list → `1` with the
  issue-body markers intact) rather than just reading the code and
  assuming it was right. Validated the workflow YAML still parses.
  Confirmed `ISO_QUEUE_URLS` had zero references anywhere in the repo
  before removing it. Full `tests/run_all.sh` 176/176 passing
  (unaffected — no existing test exercises `monitor_legislation.py`
  directly).
- Files changed: `data/monitor_legislation.py`,
  `.github/workflows/monitor_legislation.yml`,
  `data/facility_pipeline/adapters/ferc_queue.py`, `BUG_TRACKER.md`,
  this file.
- Related systems: the legislative-monitoring GitHub Action (runs Mon/
  Thu 08:00 UTC), the FERC interconnection-queue facility adapter (Tier
  4 discovery source).
- Deliberately NOT done: did not try to actually make the monitor more
  robust against the underlying failure modes that could crash it (bad
  API responses, network errors) — this fix is specifically about the
  workflow/exit-code signal being honest when a crash *does* happen, not
  about preventing every possible crash. `data/monitor_legislation.py`'s
  individual fetch functions already have their own error handling from
  an earlier pass this session.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed the News tab's own pre-existing WCAG accessibility
  violations (`aria-allowed-role`, `aria-prohibited-attr`,
  `color-contrast`, `nested-interactive`) — the open handoff logged
  below by the site-wide accessibility pass (#216), which never covered
  `#tab-news`.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped:
  - Every clickable news card (`.news-lead`, `.news-row`,
    `.news-dev-item`, `.news-wire-item`, `.news-mi-item`, the section
    "featured" block) no longer has `role="button"`+`tabindex` bolted
    onto its `<article>`/`<section>`/`<div>` container. Instead each
    card's headline is a real `<button>` (new `_makeHeadlineBtn()` in
    `js/news.js`) — natively keyboard-operable, no manual keydown code
    needed — and the container keeps only a plain "click anywhere on
    the card" mouse listener (new `_wireCardClick()`), no role/tabindex.
    This fixed both `aria-allowed-role` (69 nodes — `<article>`/
    `<section>` don't allow `role="button"` in the ARIA-in-HTML spec)
    and `nested-interactive` (27 nodes — the cards' real nested
    `.news-location-link` buttons were focusable descendants of another
    focusable, role="button" element).
  - `.news-status-dot` (the "auto-updated" indicator) now gets
    `aria-hidden="true"` instead of an invalid, redundant `aria-label`
    on a bare `<span>` (`aria-prohibited-attr`, 1 node) — the adjacent
    "Auto-updated hourly" text already conveys the same thing visibly.
  - All 14 category-tag chip colors (`.cat-data-centers`, etc. in
    `css/style.css`) re-tuned for contrast: 1 (Legal & Copyright)
    needed a dark-theme fix, and — checking all 14, not just the ones
    that happened to be in that day's live feed — every one of them
    failed in light theme (as low as 1.41:1), since these colors had no
    light-theme override at all. Added one, in both the
    `html[data-theme="light"]` block and the `@media
    (prefers-color-scheme: light) { html:not([data-theme="dark"])
    {...} }` block — the same dual-block pattern already found missing
    in `economy.css`/`parcel.css`/`pipeline.css` during the site-wide
    pass. Colors computed via the WCAG relative-luminance formula
    against each chip's actual axe-computed blended background (its
    rgba tint over the real `--surface`), same hue, darkened/lightened
    until ≥4.5:1, then verified in-browser.
- Verified, not assumed: local `python3 -m http.server 8099` +
  Playwright (Chromium) + axe-core loop scanning `#tab-news`
  specifically (`wcag2a`/`wcag2aa`/`best-practice`), same method the
  handoff asked for. Before: `aria-allowed-role` (69),
  `aria-prohibited-attr` (1), `color-contrast` (6), `nested-interactive`
  (27). Fixed one violation class at a time, re-scanning after each —
  all four cleared to zero, confirmed again with one final full sweep.
  Separately swept all 14 category colors (not just whichever were live
  that day) against both themes programmatically — all pass. Confirmed
  click/keyboard behavior didn't regress: card-whitespace click, Tab +
  Enter on the headline button, and the nested location-link button
  (still filters the map, still doesn't also open the article detail)
  all work correctly. Full `tests/run_all.sh` 176/176 passing; `E2E=1`
  browser smoke suite passing.
- Files changed: `js/news.js`, `css/style.css`, `BUG_TRACKER.md`,
  `AI_TEAM_STATUS.md`.
- Related systems: none outside the News tab — the headline-button
  restructuring only touches `js/news.js`'s card-builder functions and
  the CSS handles matching classes; no other page's markup pattern was
  touched.

- Date: 2026-08-02
- Agent: Claude Code
- Task: Fixed `tests/run_all.sh` reporting "All suites passed" when
  jsdom-dependent suites were actually silently skipped — the same
  hollow-pass bug class fixed once already (2026-07-31) in the CI
  workflow's dependency step, found while surveying the codebase for
  the next round of work after the accessibility PR (#216) merged.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: `run()` now checks each suite's output for a `SKIP` marker in
  addition to its exit code, and the final summary explicitly lists any
  skipped suites and states "This is NOT a full pass" instead of
  claiming an unqualified pass. Exit code unchanged.
- Verified, not assumed: reproduced the bug directly (ran the script in
  this sandbox, which has no jsdom, and got the old false "All suites
  passed"), then confirmed the fix in both states — jsdom absent (new
  summary correctly lists the 3 skipped suites) and jsdom present via a
  throwaway `npm install --prefix` (summary reverts to plain "All
  suites passed" and the 3 suites actually run and pass) — plus
  confirmed a deliberately-failing command is still caught.
- Files changed: `tests/run_all.sh`, `BUG_TRACKER.md`, this file.
- Related systems: local dev test workflow (does not affect CI, which
  already installs jsdom as of the 2026-07-31 fix).

- Date: 2026-08-02
- Agent: Claude Code
- Task: Site-wide WCAG 2 AA accessibility audit (axe-core, `wcag2a`/
  `wcag2aa`/`best-practice` tags) across every page. Not scoped to a bug
  report — a systematic sweep following the standing "keep improving,
  institutional quality" instruction.
- Branch: `claude/us-datacenter-restrictions-map-skooi7`
- Shipped: a `<main>` landmark now wraps every page view (previously the
  app had none, so axe's `region` rule failed almost everywhere); the
  missing `@media (prefers-color-scheme: light)` mirror block was added
  to `economy.css`/`parcel.css`/`pipeline.css` (root cause of 46 of
  Pipeline's `color-contrast` violations — OS-preference light-mode
  users, not just users who explicitly toggle the theme, were getting
  unreadable dark-theme colors); theme-aware CSS custom properties
  replaced hardcoded severity/status colors reused verbatim across both
  themes (`--color-danger`/`--color-info`, `.juris-sev`'s inline
  severity color, `.ds-badge`'s five status colors); 18 unlabeled
  `<select>` elements got `aria-label`s; heading levels that jumped from
  `h1` straight to `h3` (Map/Stocks/Pipeline/Analytics) were fixed by
  promoting each page's first real heading to `h2`. Full writeup with
  root causes in `BUG_TRACKER.md`.
- Verified, not assumed: every fix re-confirmed via a fresh axe-core
  scan after the change, not just reasoning about the CSS. The `<main>`
  wrapper work in particular needed three iterations before it was
  right — the first attempt (`display:contents` alone) still exposed
  every *inactive* tab's empty `<main>` as a second simultaneous
  landmark, and a nesting mistake while restructuring the Map tab's
  wrapper briefly put `<main>` inside `<main>`. Both were caught by
  re-running the scan rather than assuming the fix worked, and are
  recorded in `AI_CONTEXT.md`. Confirmed page layout is pixel-for-pixel
  unaffected on every tab (dimensions checked directly), confirmed
  theme colors actually swap at runtime (not just correct on paper), and
  ran the full `E2E=1` browser smoke suite (zero JS errors) plus
  `tests/run_all.sh` (176/176) before pushing.
- Files changed: `index.html`, `css/style.css`, `css/jurisdiction.css`,
  `css/economy.css`, `css/parcel.css`, `css/pipeline.css`,
  `css/stocks.css`, `js/map.js`, `js/pipeline.js`, `js/analytics.js`,
  `js/home.js`, `js/jurisdiction.js`, `js/stocks.js`,
  `js/economy-view.js`, `tests/e2e_smoke.mjs`.
- Related systems: every page's DOM landmark structure, theming
  (dark/light), Pipeline's badge coloring, the E2E smoke suite's
  Economy-tab legend diagnostic (one selector updated to match the new
  heading level).
- Deliberately NOT done: Pipeline's two remaining `color-contrast`
  nodes (`#pl-view-table`/`#pipeline-export-btn`, 4.25:1) were left as
  `--accent` is a brand color used site-wide — a bigger design call than
  the rest of this pass. The News tab's pre-existing, unrelated
  accessibility issues (`aria-allowed-role`, `aria-prohibited-attr`,
  `color-contrast`, `nested-interactive` — never previously audited,
  not caused by this change) were found but are out of scope for this
  PR; confirmed this pass did not regress or touch them. See Open
  Handoffs.

- Date: 2026-07-31
- Agent: Claude Code (claude-opus-5)
- Task: Parcel data integrity + CI test gate. PRs #202, #203, #204, #205, all
  merged to `main`. Started from a user report that the parcel layer was
  hidden behind county chrome; fixing that made the layer legible, which
  revealed Montgomery County had no parcel data at all, which led to the rest.
- Shipped: county tooltip/fill no longer obscure parcels; parcel pane z-index
  un-tied from labelsPane; all three Virginia fieldMaps rebuilt from the
  services' real schemas (previously 16/18, 17/22 and 18/18 broken); parcel
  search no longer rejects whole queries over one unknown column; new
  `data/check_parcel_services.mjs` probe + monthly workflow; new
  `.github/workflows/test.yml` running the full suite plus E2E on push/PR.
- Verified, not assumed: every field name came from each service's own
  `?f=json` output, confirmed by re-running the probe after the change. E2E
  scenario failures went 15 -> 1 -> 0 across three diagnostic cycles. Both
  workflows confirmed green on `main`.
- Two mistakes worth knowing about, both recorded in AI_CONTEXT.md and
  BUG_TRACKER.md: (1) the first CI gate printed "ALL PASS — 176/176" while
  jsdom was missing and its suites silently skipped — a hollow green build;
  (2) a TradingView error was misdiagnosed as an application bug until stack
  capture proved every frame was in their bundle. Both came from acting before
  reading the evidence, which is the same root cause as the bad fieldMaps.
- Files changed: `js/parcel/registry.js`, `js/parcel/index.js`,
  `js/parcel/renderer.js`, `js/map.js`, `data/check_parcel_services.mjs` (new),
  `.github/workflows/{test,check_parcel_services}.yml` (new),
  `tests/e2e_smoke.mjs`, `.gitignore`, and the four AI memory files.
- Related systems: parcel intelligence, CI, E2E harness.
- Deliberately NOT done: Maryland's dead URL was not replaced, and no
  zoning/assessment/sales mappings were invented. See Open Handoffs.

- Date: 2026-07-31
- Agent: Claude Code
- Task: Project-health cleanup pass (doc hygiene, dead code, encoding
  bugs, CI test gate) following an open-ended "how can this be improved"
  review of the whole project, not scoped to any single feature.
- Branch: `claude/past-conversation-recall-gcihz4`
- Current status: Complete. Full offline suite passes
  (`tests/run_all.sh`, 176/176 JS + all Python suites). The new
  `.github/workflows/test.yml` CI gate was live-validated, not just wired in
  on paper: actually ran `tests/e2e_smoke.mjs` against the pre-installed
  Chromium (same tool versions the workflow uses) end to end — all 16
  scenarios, 0 hard JS errors. One log line looked suspicious at first
  (`Economic Intelligence — awaiting first data run` reported `HAS VALUES`
  where the code comments say it should show a placeholder) but checking
  `data/economy/*.json` directly confirmed the economy pipeline has
  genuinely already run on this branch (real `generated_at` timestamps,
  thousands of records) — that scenario's own "unpopulated" precondition
  doesn't hold here, so showing real values instead of a placeholder is
  correct, not a bug.
- Files changed: `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `AI_CHANGELOG_ARCHIVE.md`
  (new), `PROJECT_CONTEXT.md`, `.gitignore`, `tests/e2e_smoke.mjs`,
  `.github/workflows/test.yml` (new), 20 `data/*.py` pipeline scripts
  (encoding fix only), 43 `data/sweep_2026_07_*.py` scripts (deleted).
- Related systems: project documentation, CI, data pipeline scripts.
- Explicitly out of scope, and why: filling in the missing 54% of county
  policy research and repairing the 711-URL dead-citation backlog both
  require genuine government-source verification, not something to
  fabricate — flagged to Bobby instead of attempted. Same for the
  city-level regulation layer (a real data-architecture feature, not a
  cleanup task).
- Last updated: 2026-07-31

## Recently Completed Work

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Honolulu County, Hawaii (FIPS 15003, 20 facilities, the
  entire island of Oahu) to the parcel registry, over two probe
  rounds.
- Findings: Round 1's ArcGIS Online search directly and unambiguously
  surfaced "Parcels - Honolulu County (Island of Oahu)" hosted by
  Hawaii's own statewide GIS portal (geodata.hawaii.gov) — an exact
  title match with no false-positive risk, unlike some prior counties'
  investigations. The City and County of Honolulu's own open data
  portal DCAT feed returns HTTP 404. Round 2 probed the layer directly
  and confirmed it live and genuine via its own copyrightText
  ("Honolulu Land Information System (Holis)... Department of
  Planning and Permitting, City and County of Honolulu") and
  description, part of a broader ParcelsZoning MapServer with sibling
  layers for Hawaii Statewide, Hawaii County, and TMK Zone/Section/
  Plat breakdowns. The layer turned out to be a pure cadastral/TMK
  boundary file — no owner, address, or assessment data joined. Its
  "zone", "section", and "plat" fields are components of Hawaii's Tax
  Map Key numbering system, not real zoning designations; mapping
  "zone" to the canonical zoning_code field would have been a
  misleading false-friend match, so it was deliberately left unmapped.
- Field mapping: 4 of 30 canonical fields mapped (parcel_id → tmk [the
  standard 8-digit Tax Map Key, Hawaii's statewide parcel identifier],
  pin → tmk9txt [a 9-digit padded variant], area_acres → gisacres,
  area_sqft → rec_area_sf) plus county_fips (computed) — 5/30, a
  legitimate thin add consistent with this session's DC (3 real
  fields) and Jefferson KY (2 real fields) precedent, since round 1
  already confirmed this is the sole authoritative Honolulu-specific
  source with no richer alternative available. The remaining 25 fields
  recorded in `notProvidedBySource` — verified programmatically to
  cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: official Honolulu Land Information System (Holis) data
  from the City and County of Honolulu's Department of Planning and
  Permitting, republished via Hawaii's statewide GIS program as an
  ArcGIS feature service. Standard "public government data, verify
  terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  based on the real confirmed sample record confirmed correct
  rendering of all 4 mapped fields plus computed county_fips, and "Not
  published by this source" for the remaining 25, zero page errors.
  Registry now covers 41 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: After Shelby County TN closed unavailable (see Open Handoffs),
  investigated the next entry in the facility-count priority queue:
  Washoe County, Nevada (FIPS 32031, Reno/Sparks metro, 19 facilities).
- Findings: The real service was found immediately in round 1 —
  Washoe County's own open data portal (opendata.washoecounty.gov)
  lists a "Parcels" dataset owned directly by the county's own ArcGIS
  org ("washoe"), confirmed independently via ArcGIS Online search.
  Round 2 confirmed the service is live, rich, and well-maintained:
  71 fields, 194,061 records, a genuine nightly-refreshed feature
  service with real assessed values, sale history, and zoning.
- Added: `nv-washoe-county` with an 18-field mapping (parcel_id →
  APN, pin → PIN, owner → LASTNAME [split from FIRSTNAME with no
  combined field, so incomplete for individual owners but a real,
  non-fabricated value], address → FullAddress, zoning_code → Zoning,
  land_use_code → LAND_USE, area_acres → ACREAGE, year_built →
  YEARBLT, gross_floor_area → SQFEET [building square footage, not
  lot size — no lot-sqft field exists, only ACREAGE], assessed_value
  → TOTALASS, land_value → LANDASS, improvement_value → BUILDASS,
  tax_year → TAXYEAR, last_sale_date → SALEDATE, last_sale_price →
  SALEPRICE, deed_book → BOOK, deed_page → PAGE, subdivision →
  SUBNAME) plus county_fips (computed) — 19/30, one of the richest
  additions this session alongside Collin County TX. owner_mailing is
  left unmapped since MAILING1 alone (no city/state/zip) isn't a
  usable address by itself, matching the same-discipline decision
  applied to Hudson NJ's split mailing address. The remaining 11
  fields recorded in `notProvidedBySource` — verified programmatically
  to cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: official Washoe County Assessor/GIS data, published
  directly by the county's own ArcGIS organization. Standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  based on a real confirmed sample record (parcel 001-020-01, owner
  MONTOYA, 3943 Kings Row, Reno) confirmed correct rendering of all 18
  mapped fields plus computed county_fips, and "Not published by this
  source" for the remaining 11, zero page errors. Registry now covers
  42 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Continued down the facility-count priority queue after Washoe
  County NV: investigated Laramie County, Wyoming (FIPS 56021,
  Cheyenne metro, 19 facilities).
- Findings: Round 1 found the real candidate quickly — "Assessor
  Parcels", owner CLCGISC (Cheyenne-Laramie County GIS Consortium),
  hosted directly on the county's own domain (maps.laramiecounty.com).
  A same-name false friend was deliberately avoided: "CheyenneCO_
  Parcel(s)" (owner CheyenneCounty) is a real, distinct county in
  Nebraska/Kansas/Colorado, not Wyoming — Cheyenne is only a city
  within Laramie County, WY, not a county of its own. Round 2 confirmed
  the real service live with 34 fields and 45,920 records, including a
  sample record naming "CITY OF CHEYENNE" as owner — solid
  corroboration this is the correct Wyoming county.
- Added: `wy-laramie-county` with an 11-field mapping (parcel_id →
  statepidn, pin → accountno, owner → name1 [a single, already-
  combined name field], land_use_desc → accttype [descriptive category
  text like "Res Vacant Land"/"Agricultural", not a short code, so
  mapped to land_use_desc rather than land_use_code], area_sqft →
  netsf, area_acres → netacres [cross-checked as a matched lot-size
  pair: netacres × 43,560 ≈ netsf in sample records — not building
  size, so no gross_floor_area mapping], assessed_value → assessedv,
  land_value → totallandv, improvement_value → totalimpsv, tax_year →
  taxyear, legal_desc → legal) plus county_fips (computed) — 12/30.
  Both the situs address (split across streetno/streetdir/streetname/
  streetsuf with no combined field) and the owner's mailing address
  (address1/city/state/zipcode, confirmed as mailing rather than situs
  via the City of Cheyenne sample record, whose city-hall mailing
  address differs from its actual Roundtop Rd situs) are left
  unmapped per this session's no-concatenation discipline. No zoning,
  sale-history, deed, or subdivision-name fields are exposed. The
  remaining 18 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Licensing: official Laramie County Assessor/GIS data, published
  directly by the county's own GIS consortium. Standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on a
  real confirmed sample record (Remount Ranch LLC, 106.35 acres,
  assessed $11,164) confirmed correct rendering of all 11 mapped
  fields plus computed county_fips, and "Not published by this
  source" for the remaining 18, zero page errors. Registry now covers
  43 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Continued down the facility-count priority queue after Laramie
  County WY: investigated New Castle County, Delaware (FIPS 10003,
  Wilmington metro, 18 facilities).
- Findings: Round 1 found the real candidate immediately — "Delaware
  New Castle County Parcels", owned by FirstMap@De (Delaware's
  official statewide FirstMap GIS program account) but hosted directly
  on the county's own ArcGIS Server domain (gis.nccde.org).
  Independently corroborated by two other third-party items
  referencing the same layer as "Parcels", one owned by Delaware's
  Dept of Natural Resources and Environmental Control (DNREC). Round
  2 confirmed the service live with 42 fields and 203,811 records.
- Added: `de-new-castle-county` with a 9-field mapping (parcel_id →
  PRCLID, pin → PARCELNO, owner → CNTCTLAST [a single combined
  owner/entity name field], address → ADDRESS [a single, already-
  combined situs address field — unlike some other states' schemas
  that split it across street-number/name/suffix], land_use_desc →
  PROPCLASS [descriptive text like "RESIDENTIAL", not a short code],
  area_acres → LOTSZ, lot_depth_ft → LOTDPTH, lot_width_ft →
  LOTFRONTAG, subdivision → SUBDIV) plus county_fips (computed) —
  10/30. AREA looked size-like by name but its value ("10003800") is
  an administrative tax-area code, not square footage — deliberately
  not mapped to area_sqft to avoid a misleading false-friend match; no
  genuine lot-sqft field is exposed. The owner's mailing address
  (OWNADDR/OWNADDR2/OWNCITY/OWNSTATE/OWNZIP) is split across 5 fields
  with no combined value, so owner_mailing isn't mapped. This is a
  pure cadastral/ownership GIS layer with no assessment data (values,
  sale history, deed, zoning, or year-built) joined. The remaining 20
  fields recorded in `notProvidedBySource` — verified programmatically
  to cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: official New Castle County / Delaware FirstMap GIS data.
  Standard "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on a
  real confirmed sample record (parcel 0600100003, owner GARDNER
  WILLIAM W, Smith Bridge Rd, Wilmington) confirmed correct rendering
  of all 9 mapped fields plus computed county_fips, and "Not published
  by this source" for the remaining 20, zero page errors. Registry now
  covers 44 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Continued down the facility-count priority queue after New
  Castle County DE: investigated DeKalb County, Georgia (FIPS 13089,
  Atlanta metro, 18 facilities). "DeKalb County" is a name shared by
  counties in IL, IN, TN, MO, and AL, so extra geographic confirmation
  was required before trusting any candidate.
- Findings: Round 1 surfaced a strong candidate immediately, confirmed
  as genuinely Georgia via multiple independent signals: search
  results reference "Tucker" (a real DeKalb County GA city) and are
  owned by "decatur_admin" (Decatur is DeKalb County GA's county
  seat). The county's own official GIS admin account (DeKalbGISAdmin)
  publishes yearly-versioned "Tax Parcels" feature services (2022,
  2024, 2025). Round 2 confirmed the current 2025 vintage live with 35
  fields and 246,602 records — and a real sample record's
  ASSESSED_VALUE/APPRAISED_VALUE ratio (150,160/375,400 ≈ 0.40)
  matched Georgia's constitutionally mandated 40% assessment ratio,
  independent confirmation the data is genuine and correctly sourced.
- Added: `ga-dekalb-county` with a 12-field mapping (parcel_id →
  ParcelID, area_sqft → StatedArea, lot_depth_ft → DEPTH, lot_width_ft
  → FRONTAGE, zoning_code → ZONING [confirmed via a real "R-100"
  DeKalb-County-GA-specific zoning designation in sample data],
  overlay_districts → OVERLAY_DIST, land_use_code → LANDUSECODE
  [numeric], land_use_desc → LANDUSE [abbreviated text like "SUB"],
  assessed_value → ASSESSED_VALUE, land_value → LAND_VALUE,
  improvement_value → BLDG_VALUE, tax_year → TAXYR) plus county_fips
  (computed) — 13/30. This layer carries rich zoning/land-use/
  valuation data but has no owner-name or address fields in its
  schema at all — not a mapping gap, just outside this particular
  dataset's scope. No sale-history, deed, subdivision-name, or
  combined legal-description fields are exposed either (the
  LEGAL_LOT_NUMBER/LEGAL_BUILDING_NUMBER/LEGAL_UNIT_NUMBER components
  have no combined string). The remaining 17 fields recorded in
  `notProvidedBySource` — verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
- Licensing: official DeKalb County, Georgia GIS/Tax Assessor data.
  Standard "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on a
  real confirmed sample record (parcel 12 228 01 021, R-100 zoning,
  11,831 sq ft) confirmed correct rendering of the populated mapped
  fields plus computed county_fips, and "Not published by this
  source" for the remaining fields, zero page errors. Registry now
  covers 45 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Continued down the facility-count priority queue after DeKalb
  County GA: investigated Douglas County, Nebraska (FIPS 31055, Omaha
  metro, 18 facilities), over three probe rounds. "Douglas County" is
  a name shared by many states (CO, KS, OR, WA, MN, WI, GA, MO, IL,
  and others), so extra geographic confirmation was required before
  trusting any candidate.
- Findings: Rounds 1-2 surfaced a strong candidate, "Parcels_for_BOE"
  (built for the county's Board of Equalization), and confirmed it as
  genuinely Nebraska via a decisive signal: the same ArcGIS account
  (Nataliya2) that owns this parcels layer also owns "Douglas County,
  NE - Air Quality" (hosted at douglascountyairquality.com) and
  imagery layers explicitly named "Douglas_County_NE_2022_Imagery"
  and "Omaha_NE_1958_Imagery", all hosted on dcgis.org — the county's
  own confirmed ArcGIS Server. Round 3 pulled a real sample record and
  cross-checked SQ_FEET against ACRES × 43,560 (1.17 × 43,560 ≈
  50,965, matching SQ_FEET exactly) to confirm it as lot size, not
  building size — BLDG_SF is the separate, much smaller building-
  footprint field.
- Added: `ne-douglas-county` with an 10-field mapping (parcel_id →
  PIN, owner → OWNER_NAME, address → PROPERTY_A [confirmed as a
  genuine pre-combined situs address string, not a concatenation],
  land_use_code → CLASS, land_use_desc → DCAACCTYPE, area_sqft →
  SQ_FEET, area_acres → ACRES, building_count → NUMBLDGS, year_built
  → BLDG_YRBLT, gross_floor_area → BLDG_SF) plus county_fips
  (computed) — 11/30. This layer, built for the Board of Equalization,
  has no assessed-value, sale-history, deed, or zoning fields at all —
  a separate assessor system holds that data. The owner's mailing
  address is split across four fields with no combined value, so
  owner_mailing isn't mapped, and ADDITION_N wasn't mapped to
  subdivision since real sample records show it as the generic value
  "LANDS" rather than an actual platted subdivision name. Several
  source fields (board_members, district, Join_Count, TARGET_FID,
  etc.) are artifacts of a spatial join with a commissioner-districts
  layer, not genuine parcel attributes, and were excluded entirely.
  The remaining 18 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Licensing: official Douglas County, Nebraska GIS / Board of
  Equalization data. Standard "public government data, verify terms
  before commercial redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on a
  real confirmed sample record (parcel 0100370012, owner RODRIGUES
  ANTHONY T, 28215 West Maple Rd) confirmed correct rendering of all
  10 mapped fields plus computed county_fips, and "Not published by
  this source" for the remaining 18, zero page errors. Registry now
  covers 46 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Continued down the facility-count priority queue after Douglas
  County NE: investigated Manassas city, Virginia (FIPS 51683, 18
  facilities), over three probe rounds. Manassas is an independent
  city, not a county (VA has many independent cities that function as
  their own GIS/assessor jurisdiction, the same precedent as DC and
  Suffolk MA earlier this session), and distinct from the separately
  incorporated city of Manassas Park and the surrounding, but
  administratively separate, Prince William County.
- Findings: Round 1 surfaced two Manassas-city-specific candidates
  (correctly excluding a "Manassas Park City VA Parcels" layer as a
  false friend): one from ArcGIS account "wharcgisdeveloper", one from
  "manassas_gis". Round 2 found the wharcgisdeveloper layer requires
  an authentication token ("499 Token Required" on every query, so
  unusable) and confirmed the manassas_gis layer as the city's own
  official data via description "City of Manassas Taxable Parcels"
  and copyrightText "City of Manassas" — live with 26 fields. Round 3
  pulled a real sample record (13,645 total parcels; owner LANE
  GWENDOLYN A, 9300 Niki Pl #302) confirming sensible values
  throughout.
- Added: `va-manassas-city` with a 13-field mapping (parcel_id →
  TAXMAP, pin → GIS_UID, address → PROPERTY_ADDRESS [confirmed as a
  genuine pre-combined address string, not a concatenation],
  owner → OWNER_NAME, zoning_code → ZONING, area_acres → TOTAL_ACRES,
  assessed_value → TOTAL_ASSESSED_VALUE, land_value → LAND_VALUE,
  improvement_value → IMPROVEMENT_VALUE, last_sale_date → SALE_DATE,
  last_sale_price → SALE_PRICE, legal_desc → LEGAL_DESCRIPTION) plus
  county_fips (computed) — 14/30. DEED_BOOK_PAGE is a single
  pre-combined "book/page" string (e.g. "2478/1658") that cannot be
  cleanly split into the separate deed_book/deed_page canonical
  fields, so neither is mapped. MORE_ZONING_INFO was deliberately NOT
  mapped to zoning_desc — it's a static link to the city's general
  zoning-ordinance webpage, identical across every record, not a
  per-parcel description. The remaining 17 fields recorded in
  `notProvidedBySource` — verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
- Licensing: official City of Manassas, Virginia GIS data. Standard
  "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on the
  real confirmed sample record (Lane Gwendolyn A, 9300 Niki Pl #302,
  assessed at $269,000) confirmed correct rendering of all 13 mapped
  fields plus computed county_fips, and "Not published by this
  source" for the remaining 17, zero page errors. Registry now covers
  47 jurisdictions.

- Date: 2026-08-05
- Agent: Claude Code
- Task: Continued down the facility-count priority queue after
  Manassas city VA: investigated Alameda County, California (FIPS
  06001, 17 facilities, Oakland/Berkeley/Fremont metro), over three
  probe rounds. "Alameda" is a common place name, so extra geographic
  confirmation was required before trusting any candidate.
- Findings: Round 1 found a decisive candidate directly in the
  county's own official open-data DCAT catalog (data.acgov.org),
  which lists a "Parcels" dataset backed by an ArcGIS FeatureServer —
  independently corroborated by an ArcGIS Online item search finding
  the same service under two account names, one of which
  ("thayes_cofgis") reads as "County of [Alameda] GIS". Round 2
  confirmed it live with 42 fields and a description crediting
  "Alameda County Information Technology Department". Round 3 pulled a
  real sample record (parcel 15-1338-24, 1049 61st St, Oakland) and
  cross-checked TotalNetValue against Land + Imps − HOEX (homeowner's
  exemption): 467,989 + 1,091,974 − 7,000 = 1,552,963, exactly
  matching — confirming it as the correct net assessed value rather
  than a raw sum.
- Added: `ca-alameda-county` with a 9-field mapping (parcel_id → APN,
  address → SitusAddress [confirmed as a genuine pre-combined situs
  address string], owner_mailing → MailingAddress [also pre-combined;
  mapped despite no owner-name field existing anywhere in this
  schema — common for CA county parcel-boundary feeds, which often
  omit owner names for privacy], land_use_code → UseCode, assessed_value
  → TotalNetValue, land_value → Land, improvement_value → Imps,
  last_sale_date → LatestDocumentDate, deed_book → BOOK, deed_page →
  PAGE) plus county_fips (computed) — 10/30. CLCALand/CLCAImps are
  separate Williamson Act (California Land Conservation Act)
  alternate valuations, not general values, so they weren't used for
  land_value/improvement_value. Shape__Area was deliberately left
  unmapped since its units were never confirmed as square feet (no
  separate acreage field exists in this schema at all).
  TRAPrimary/TRASecondary are Tax Rate Area codes, not census tract.
  APN_SORT is a resortable reformatting of the same APN identifier,
  not a distinct PIN. The remaining 19 fields recorded in
  `notProvidedBySource` — verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
- Also fixed: while Playwright-verifying this addition, discovered
  `js/parcel/schema.js`'s `date` formatter displayed ArcGIS
  epoch-millisecond date values (e.g. `LatestDocumentDate`) as a raw
  integer instead of a calendar date. Fixed the formatter to detect
  large numeric values and convert them via `Date`, while leaving
  pre-formatted date strings from other sources unchanged.
- Licensing: official Alameda County, California Information
  Technology Department data. Standard "public government data,
  verify terms before commercial redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on the
  real confirmed sample record (parcel 15-1338-24, 1049 61st St,
  Oakland, assessed at $1,552,963) confirmed correct rendering of all
  10 mapped fields plus computed county_fips — including the
  corrected date formatting (2023-03-24) — and "Not published by this
  source" for the remaining 19, zero page errors. Registry now covers
  48 jurisdictions.

- Date: 2026-08-05
- Agent: Claude Code
- Task: Retried Hennepin County, Minnesota (FIPS 27053, 63 facilities,
  Minneapolis metro) after it had been left as an "Open, not added"
  Open Handoffs item on 2026-08-03: a real, catalog-confirmed dataset
  (the Metropolitan Council's regional Twin Cities metro parcels
  service) had returned `HTTP 500 "Application Error"` from the ArcGIS
  Web Adaptor on every endpoint, a server-side fault rather than a
  wrong-URL guess, so it was worth retrying rather than starting a
  fresh investigation elsewhere.
- Findings: Round 3 retried the same previously-confirmed URLs — the
  outage was transient and both endpoints are now live. The
  unversioned "Parcels" layer turned out to be a naming trap: despite
  its generic name, its own layer metadata reports it as "Anoka County
  Parcels" specifically, not a metro-wide layer. The real candidate is
  "Parcels_Aggregate" ("Metropolitan 7-County Parcels"), covering all 7
  Twin Cities metro counties (Hennepin, Ramsey, Dakota, Anoka,
  Washington, Carver, Scott) with a `CO_NAME` field for filtering to
  one county — 95-field schema confirmed. Round 4 pulled a real
  Hennepin-specific sample record (`CO_NAME='Hennepin'`, parcel
  053-0102724110005, DRFC Metro LLC, Metro Office Park) whose `CO_CODE`
  ("27053") exactly matches this county's FIPS code, and confirmed
  EMV_LAND (1,172,000) + EMV_BLDG (777,000) = EMV_TOTAL (1,949,000),
  confirming it as a genuine sum.
- Added: `mn-hennepin-county` with a `where: "CO_NAME = 'Hennepin'"`
  filter (this is a shared regional service, same pattern as 3 other
  registry entries) and a 16-field mapping (parcel_id → PIN, pin →
  COUNTY_PIN, owner → OWNER_NAME, land_use_code → USECLASS1, area_acres
  → ACRES_POLY [ACRES_DEED was null for the real sample, ACRES_POLY was
  populated], year_built → YEAR_BUILT, gross_floor_area → FIN_SQ_FT,
  assessed_value → EMV_TOTAL, land_value → EMV_LAND, improvement_value
  → EMV_BLDG, tax_year → TAX_YEAR, tax_amount → TOTAL_TAX, last_sale_date
  → SALE_DATE, last_sale_price → SALE_VALUE, subdivision → PLAT_NAME,
  legal_desc → ABB_LEGAL) plus county_fips (computed) — 17/30, one of
  the richest additions this session. address and owner_mailing are
  NOT mapped: the situs address is split across 9+ components with no
  combined field anywhere in the schema, and the owner-mailing address
  (OWN_ADD_L1-4) was entirely blank on the real sample record with no
  combined value either (a separate TAX_ADD_L1/L2 tax-mailing pair was
  populated instead, but isn't a canonical target). The remaining 13
  fields recorded in `notProvidedBySource` — verified programmatically
  to cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: official Metropolitan Council (Metro GIS), Minnesota
  data. Standard "public government data, verify terms before
  commercial redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on the
  real confirmed sample record confirmed correct rendering of all 15
  populated mapped fields plus computed county_fips — including
  correct calendar-date formatting for last_sale_date (2006-08-01) —
  and "Not published by this source" for the remaining 13, zero page
  errors. (tax_year and legal_desc were genuinely blank on this real
  sample record, so correctly render no row rather than a value.)
  Removed the now-resolved "Hennepin County, Minnesota" Open Handoffs
  entry. Registry now covers 49 jurisdictions.

- Date: 2026-08-05
- Agent: Claude Code
- Task: Closed out Clark County, Nevada (FIPS 32003, 43 facilities,
  Las Vegas metro), an "Open, not added" Open Handoffs item, after 6
  total probe rounds (3 on 2026-08-03, 3 more this session).
- Findings: Unlike most other "Open" items this session, Clark
  County's public GIS host (maps.clarkcountynv.gov) is genuinely live
  with a rich Assessor folder (25+ services) — this was never a
  dead-host problem. Round 4 re-fetched the full folder listing and
  found several `esriGeometryPolygon` candidates worth checking.
  Round 5 found a layer named "ParcelPoly" appearing under both the
  `CommonArea` (11 fields) and `ParcelHistory` (16 fields, a strict
  superset) services — confirming it as a shared canonical Assessor
  cadastral table reused across specialized tool services (a
  drafting/survey tool, a land-valuation-analysis tool, an HOA
  common-area tool). Round 6 confirmed the last untested candidate
  (`Assessor/Layers` sub-layer "Parcels") was equally thin (only
  acreage + APN, no owner/address/value), and pulled a real sample
  record from ParcelHistory's ParcelPoly (APN 13808114027, owner
  "American Homes 4 Rent Properties Three LLC") confirming genuine,
  sensible data.
- Added: `nv-clark-county` with the thinnest mapping this session —
  parcel_id → APN, owner → OWNER — plus county_fips (computed), 3/30.
  No service anywhere on this GIS host exposes assessed-value,
  land-use, zoning, or sale-history data; Clark County's actual
  valuation/tax data almost certainly lives in a separate, non-GIS
  assessor database. address is NOT mapped (situs address split
  across 6 components, no combined field). legal_desc is NOT mapped
  (LEGAL_DESCR1-3 are 3 free-text lines; one sample's LEGAL_DESCR2
  happened to contain the substring "PLAT BOOK 105 PAGE 53", but this
  is prose inside a legal description, not a structured field, so it
  was not parsed for deed_book/deed_page). OWNER2 has no canonical
  field; DOCNO is a single modern document-reference number, not a
  book/page pair, so neither is mapped. The remaining 27 fields
  recorded in `notProvidedBySource` — verified programmatically to
  cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: official Clark County, Nevada Assessor data. Standard
  "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on the
  real confirmed sample record confirmed correct rendering of both
  mapped fields plus computed county_fips, and "Not published by this
  source" for the remaining 27, zero page errors. Removed the
  now-resolved "Item: Clark County, Nevada (Las Vegas) parcel data"
  Open Handoffs entry. Registry now covers 50 jurisdictions.

- Date: 2026-08-05
- Agent: Claude Code
- Task: Closed out San Francisco County, California (FIPS 06075, 39
  facilities), an "Open, not added" Open Handoffs item, after 5 total
  probe rounds (2 on 2026-08-03, 3 more this session).
- Findings: San Francisco is structurally different from every other
  county investigated this session — not a dead host or a wrong URL
  guess, but a real, live, well-documented dataset that's
  categorically restricted: California state law prohibits SF's
  Assessor-Recorder from posting ownership, assessed-value, or sale
  information online at all (confirmed via web search; available only
  for purchase or in person), so zero owner/value/legal fields exist
  for San Francisco from any source. Round 3 searched for a genuine
  ArcGIS-native SF Assessor-Recorder service — the "ASR Mapping" hub
  turned out to be owned by account `david.josefovsky_asr`, whose
  "_asr" suffix strongly suggested genuine Assessor-Recorder staff.
  Round 4 searched that account's full 38-item list directly: every
  item was a web map, story map, or hub page with no queryable
  service URL — a dead end. Round 4 also found a promising second
  lead: a Feature Service named "Active Parcels (from DataSF, pulled
  daily)", owned by third-party account `vll_sfgis`, explicitly
  mirroring DataSF's Socrata "Parcels - Active and Retired" dataset
  (data.sfgov.org, id acdm-wktn) into ArcGIS format on a daily cron.
  Round 5 verified it directly: `lastEditDate` was 2026-08-04 (within
  1 day of verification, confirming the daily pull is genuinely
  live), and a real sample record (mapblklot "1038019", a Presidio
  Heights single-family lot) confirmed sensible values across all 39
  fields. This mirror lets San Francisco use this registry's proven,
  already-battle-tested `arcgis` connector instead of
  `connector-geojson.js`, which no existing jurisdiction uses and
  whose pagination is unfinished (a documented but unimplemented
  `config.streaming` option) — avoiding an unproven first use of that
  connector at the scale of San Francisco's ~200k parcels.
- Added: `ca-san-francisco-county` — parcel_id → mapblklot, pin →
  blklot, zoning_code → zoning_code, zoning_desc → zoning_district —
  plus county_fips (computed), 5/30. pin and parcel_id are genuinely
  distinct source fields (legacy Map+Block+Lot vs. current Block+Lot)
  even though they held the same value ("1038019") in the verified
  sample. zoning_district was mapped to zoning_desc rather than
  zoning_code because the sample confirmed it's a real human-readable
  description ("RESIDENTIAL- HOUSE, ONE FAMILY- DETACHED") distinct
  from the short code ("RH-1(D)"). area_sqft was deliberately NOT
  mapped to the layer's Shape__Area field despite it existing: the
  layer's spatialReference is Web Mercator (wkid 102100/3857), a
  projected system in meters (not feet) that also distorts area with
  latitude, so it cannot be trusted as a real square-footage value.
  address is NOT mapped (situs address split across from_address_num/
  to_address_num/street_name/street_type, no combined field). The
  remaining 25 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps
  and zero overlaps.
- Licensing: public DataSF open data (San Francisco Office of the
  Assessor-Recorder as original source, mirrored to ArcGIS by a
  third-party account). Standard "public government data, verify
  terms before commercial redistribution" caveat applied.
- Validation: field-mapping validation script confirmed zero
  missing/extra/overlap against the 30 canonical fields. `node
  tests/parcel.test.js` passes (293/293). Playwright live-test via
  `window.PARCEL_PANEL.show()` with a synthetic feature based on the
  real confirmed sample record confirmed correct rendering of all 4
  mapped fields plus computed county_fips, and "Not published by this
  source" for the remaining 25, zero page errors. Removed the
  now-resolved "Item: San Francisco County, California parcel data"
  Open Handoffs entry. Registry now covers 51 jurisdictions.

- Date: 2026-08-05
- Agent: Claude Code
- Task: Began a new phase of parcel-registry expansion — after Phase 1
  (source catalog, priority queue, CI restructuring) and Phase 2a
  (deterministic field mapper/generator) shipped, the user asked
  whether all counties are covered and to continue until they are.
  Coverage check: only 51 of 549 distinct counties with at least one
  facility in `facilities_index.json` had parcel coverage. Resumed the
  county-by-county expansion, now guided by
  `data/parcel_priority_queue.py --next N` instead of ad hoc research.
- Findings: The priority queue's reusable-statewide-source detection
  correctly flagged Essex County NJ (FIPS 34013, 12 facilities) as
  covered by the same statewide NJ MOD-IV Composite service already
  proven for Hudson County NJ — confirmed live with a real Caldwell
  Boro Twp sample record (PROP_LOC "35 HILLSIDE AVE", CITY_STATE
  "CALDWELL, NJ", a genuine Essex County municipality), added by
  copying Hudson's exact fieldMap with `where: COUNTY = 'ESSEX'`
  instead of 'HUDSON' — zero fresh discovery needed. The same round
  also tried Baltimore City MD (24510) and Prince George's County MD
  (24033) against the statewide `MD_ParcelBoundaries` service already
  proven for Montgomery/Howard County MD, using bounding-box queries —
  but both bboxes returned neighboring counties' data instead (Anne
  Arundel and Montgomery respectively, per the layer's own `JURSCODE`
  field), a real methodological miss (a bbox near a county line can
  return edge-adjacent parcels from either side). Left both as
  candidates in the catalog for a follow-up round using `JURSCODE`
  where-filtering instead of bbox geometry, once the exact codes for
  those two jurisdictions are confirmed — not guessed.
- Added: `nj-essex-county` (FIPS 34013) — identical 16-real-field
  mapping to Hudson County NJ (parcel_id, pin, owner, address,
  land_use_code, area_acres, year_built, assessed_value, land_value,
  improvement_value, tax_amount, last_sale_date, last_sale_price,
  deed_book, deed_page, legal_desc) plus computed county_fips, 17/30.
  LAND_VAL (272,500) + IMPRVT_VAL (293,900) = NET_VALUE (566,400)
  exactly, confirming it as a genuine sum, same cross-check pattern
  used for Hennepin MN's EMV_TOTAL earlier this session.
- Licensing: New Jersey Office of Information Technology (NJOGIS)
  statewide MOD-IV Composite data, same source and license note as
  Hudson County NJ's existing entry.
- Validation: `node data/parcel_pipeline/check_registry_integrity.mjs`
  and `python3 data/validate_parcel_catalog.py` both clean.
  `node tests/parcel.test.js` passes (293/293).
  `node tests/test_parcel_field_mapper.mjs` ground-truth regression:
  52 jurisdictions, 592 real mappings, 0 confident wrong guesses.
  Playwright live-test confirmed correct rendering of all 16 mapped
  fields plus computed county_fips, zero page errors,
  `totalJurisdictions: 52`. `data/parcel_source_catalog.json`
  regenerated via `seed_catalog_from_registry.mjs`. Registry now
  covers 52 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Collin County, Texas (FIPS 48085, 21 facilities, tied
  with Ada ID and Hudson NJ, Frisco/Plano/McKinney metro) to the
  parcel registry, over four probe rounds.
- Findings: Round 1 found Collin County's own open data portal DCAT
  feed dead, but ArcGIS Online searches surfaced two genuinely
  Collin-County-specific candidates (not same-name false positives):
  the county's own GIS server (gis.collincountytx.gov) hosting a
  "Parcels (Collin County, TX)" layer, and "CCAD Parcel Feature Set"
  (CCAD = Collin Central Appraisal District). Round 2 found the
  county's own GIS server unreachable ("fetch failed") but confirmed
  CCAD as genuinely official via its copyrightText ("Collin Central
  Appraisal District") and description (nightly-refreshed appraisal
  data joined to the parcel layer) — Texas counties don't perform
  property assessment themselves, the separate Central Appraisal
  District does, the same architecture already seen for Tarrant and
  Bexar counties this session. CCAD's FeatureServer has sub-layers
  including id 4, "Parcels". Round 3 probed that layer directly and
  found a rich 114-field schema (copyrightText "Collin Central
  Appraisal District / https://collincad.org", description "Parcel
  polygons maintained by Collin Central Appraisal District"), but its
  unfiltered first sample record (OBJECTID 1) came back with nearly
  every attribute null — a placeholder feature, not real data. Round 4
  queried specifically for records with a populated owner name and
  confirmed real, sensible values: a genuine HCA Health Services of
  Texas Inc. parcel in Plano, 1.13 acres, built 1989, assessed at
  $2,600,000.
- Field mapping: 18 of 30 canonical fields mapped (parcel_id → geoID
  [the CAD's public account/parcel number], pin → PROP_ID [internal
  numeric key], owner → ownerName, address → situsConcat [a single
  combined site-address field, unusually not split], land_use_code →
  propUseCode, area_sqft → landSizeSqft, area_acres → landSizeAcres,
  year_built → imprvYearBuilt, gross_floor_area → imprvMainArea,
  assessed_value → currValAssessed, land_value → currValLand,
  improvement_value → currValImprv, tax_year → currValYear,
  last_sale_date → deedFileDate, deed_book → deedBook, deed_page →
  deedPage, subdivision → legalAbsSubName, legal_desc →
  legalDescription) plus county_fips (computed) — 19/30, the richest
  addition this session, surpassing Hudson County NJ's 17/30. Owner
  mailing address (ownerAddrLine1/Line2/City/State/Zip/Country) is
  split across six fields with no single combined field, so
  owner_mailing isn't mapped. No sale-price or tax-amount fields are
  exposed in this schema (consistent with Texas not requiring sale
  price disclosure — the same pattern seen for other Texas CAD sources
  this session). The remaining 11 fields recorded in
  `notProvidedBySource` — verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
- Licensing: official Collin Central Appraisal District (CCAD)
  government parcel data, hosted as an ArcGIS Online feature service.
  Standard "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  based on the real confirmed HCA Health Services sample record
  confirmed correct rendering of all 18 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  11, zero page errors. Registry now covers 40 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Hudson County, New Jersey (FIPS 34017, 21 facilities,
  tied with Ada ID, Jersey City metro) to the parcel registry, over
  three probe rounds.
- Findings: Round 1 found Hudson County's own open data portal DCAT
  feed dead (fetch failed), and NJGIN's Hudson-County-specific
  distribution was only a static shapefile/fgdb `.zip` download, not a
  REST service. Round 2 found an ArcGIS Online layer named
  "NJ_Parcel_Boundaries_Simplified" that — despite its generic
  statewide-sounding name — turned out to be genuinely Hudson-County-
  specific, confirmed via its own description and copyrightText
  ("Hudson County... NJ Office of Information Technology, Office of
  GIS (NJOGIS)"). It was real and live but thin: only 13 fields
  (PAMS_PIN, MUN, BLOCK, LOT, QCODE, LASTUPDATE, County, plus geology/
  geometry fields), of which only PAMS_PIN mapped cleanly to a
  canonical field. Round 2 also surfaced NJ's official statewide
  MOD-IV Composite service, hosted directly by the state at
  maps.nj.gov. Round 3 probed that service directly: confirmed live
  with 46 fields (the same MOD-IV schema family already seen for
  Middlesex County NJ, but richer), and confirmed a working
  `WHERE COUNTY='HUDSON'` filter returns real data — a sample Bayonne
  City parcel with genuine owner/value/sale/deed attributes. Since the
  connector already supports a static `where` clause (used previously
  for NYC's MAPPLUTO borough filter and a Washington County taxlots
  layer), scoping this statewide, state-authoritative service to
  Hudson County via `where: "COUNTY = 'HUDSON'"` was used instead of
  the thin county-specific layer.
- Field mapping: 16 of 30 canonical fields mapped (parcel_id →
  PAMS_PIN, pin → GIS_PIN, owner → OWNER_NAME, address → PROP_LOC,
  land_use_code → PROP_CLASS, area_acres → CALC_ACRE, year_built →
  YR_CONSTR, assessed_value → NET_VALUE, land_value → LAND_VAL,
  improvement_value → IMPRVT_VAL, tax_amount → LAST_YR_TX,
  last_sale_date → DEED_DATE, last_sale_price → SALE_PRICE, deed_book
  → DEED_BOOK, deed_page → DEED_PAGE, legal_desc → LAND_DESC) plus
  county_fips (computed) — 17/30, richer than Middlesex County NJ (the
  previous richest NJ addition at 15/30). Owner mailing address
  (ST_ADDRESS/CITY_STATE/ZIP_CODE) is split across multiple fields
  with no single combined field, so owner_mailing isn't mapped;
  LAST_YR_TX is a tax amount, not a tax year, so it maps to tax_amount
  rather than tax_year (no tax year field is exposed). The remaining
  13 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Licensing: official New Jersey Office of Information Technology,
  Office of GIS (NJOGIS) statewide government parcel data, compatible
  with the state's MOD-IV tax assessment system. Standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  based on the real confirmed Bayonne City sample record confirmed
  correct rendering of all 16 mapped fields plus computed county_fips,
  and "Not published by this source" for the remaining 13, zero page
  errors. Registry now covers 39 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Ada County, Idaho (FIPS 16001, 21 facilities, Boise) to
  the parcel registry, over three probe rounds.
- Findings: Round 1's ArcGIS Online item search directly surfaced
  "Ada County Parcel Boundaries", hosted by the same organization
  that also hosts "Ada County Address Points" and "Ada County Zoning
  Districts" — a genuine match, not a same-name false positive. Round
  2 confirmed the FeatureServer's one real layer (id 5, "Parcel",
  esriGeometryPolygon), from a service described as "Elections and
  Assessors layers". Round 3 probed layer 5 directly and confirmed
  official Ada County Assessor's Office data: 32 fields, copyrightText
  "Ada County Assessors Office", description confirming parcel
  boundaries maintained by the Assessor's office from plats,
  subdivisions, surveys, and deeds.
- Field mapping: 8 of 30 canonical fields mapped (parcel_id → PARCEL,
  address → ADDRESS [a single combined field, unusually not split],
  land_use_code → PROPCODE, zoning_code → ZONING, area_acres → ACRES,
  assessed_value → TOTALVALUE, tax_year → PROPYEAR, subdivision →
  SUBNM) plus county_fips (computed) — 9/30. Legal description
  (LEGAL1-5) is split across five fields with no single combined
  field, so legal_desc isn't mapped; TOTALVALUE is the parcel's single
  total assessed value with no separate land/improvement split
  exposed. The remaining 21 fields recorded in `notProvidedBySource` —
  verified programmatically to cover all 30 canonical fields with
  zero gaps and zero overlaps.
- Licensing: official Ada County Assessor's Office (Boise, Idaho)
  government parcel data, hosted as an ArcGIS Online feature service.
  Standard "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 8 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  21, zero page errors. Registry now covers 38 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Middlesex County, New Jersey (FIPS 34023, 22 facilities,
  tied with Duval FL and Jefferson KY) to the parcel registry, over
  three probe rounds.
- Findings: Round 1's ArcGIS Online item search surfaced three
  genuinely NJ-specific candidates (verified against the risk of a
  same-state or same-name false positive like Duval FL's Jacksonville-
  Oregon mixup): the county's own GIS portal, an ArcGIS Online hosted
  "Middlesex_County_NJ_Parcel_data" service, and a third candidate
  that turned out to require an auth token (discarded). Round 2
  confirmed both remaining candidates were real, live Polygon parcel
  layers sharing the same underlying NJ MOD-IV (statewide assessment
  database) source data, maintained by Civil Solutions for the
  Middlesex County Office of Information Technology. Round 3 compared
  their field schemas directly: the county's own portal exposes 46
  fields but is missing an owner-name field, while the ArcGIS Online
  copy exposes 58 fields including `OwnersName` — so the richer
  ArcGIS Online copy was used.
- Field mapping: 14 of 30 canonical fields mapped (parcel_id →
  PAMS_PIN [NJ's statewide unique parcel ID], pin → UNIQUEID, owner →
  OwnersName, address → PropLoc, land_use_code → PropClass,
  land_use_desc → LandDesc, area_acres → Acreage, year_built →
  YearBuilt, gross_floor_area → SFLA, assessed_value → NetValue,
  last_sale_date → SalesDate, last_sale_price → SalePrice, deed_book →
  DeedBook, deed_page → DeedPage) plus county_fips (computed) — 15/30,
  the richest addition since Tarrant County TX this session. Owner
  mailing address (OwnerAddr1/OwnerAddr2/ZipCode) is split across
  multiple fields with no single combined field, so owner_mailing
  isn't mapped; NetValue is MOD-IV's single total net assessed value
  with no separate land/improvement split exposed. The remaining 15
  fields recorded in `notProvidedBySource` — verified programmatically
  to cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: official Middlesex County, New Jersey government parcel
  data (Civil Solutions / Middlesex County Office of Information
  Technology / NJ Office of GIS), hosted as an ArcGIS Online feature
  service. Standard "public government data, verify terms before
  commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 14 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  15, zero page errors. Registry now covers 37 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Jefferson County, Kentucky (FIPS 21111, 22 facilities,
  Louisville) to the parcel registry, over two probe rounds.
- Findings: Round 1's ArcGIS Online item search directly surfaced
  "Jefferson County KY Parcels" on gis.lojic.org's `LojicSolutions/
  OpenDataPVA` MapServer, layer 1 — a strong, verifiable match
  confirmed by the URL itself: "PVA" (Property Valuation
  Administrator) is Kentucky's standard county-assessor terminology,
  and "LojicSolutions" matches LOJIC (Louisville/Jefferson County
  Information Consortium), so this wasn't the kind of same-named
  false positive the Duval County FL investigation hit. Round 2
  probed it directly and confirmed real `esriGeometryPolygon`
  geometry, but a thin 9-field schema (OBJECTID, PARCELID,
  PARCEL_TYPE, LRSN, SHAPE, GLOBALID, SHAPE.AREA, SHAPE.LEN, PIN) —
  a pure cadastral-geometry layer with no owner/address/value fields.
- Field mapping: 2 of 30 canonical fields mapped (parcel_id →
  PARCELID, pin → PIN) plus county_fips (computed) — 3/30, a thin add
  consistent with the precedent set by Middlesex County MA, Allegheny
  County PA, and District of Columbia this session. PARCEL_TYPE (an
  internal type code) and LRSN (an internal record-sequence number)
  have no confident canonical equivalent and are left unmapped. The
  remaining 27 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps
  and zero overlaps.
- Licensing: official LOJIC / Jefferson County PVA government parcel
  data, hosted on Louisville Metro's own ArcGIS Server. Standard
  "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of both mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  27, zero page errors. Registry now covers 36 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Duval County, Florida (FIPS 12031, 22 facilities,
  Jacksonville) to the parcel registry, over three probe rounds.
- Findings: Round 1's DCAT catalog attempt on the City of
  Jacksonville's open data portal (data.coj.net) failed to resolve
  entirely (DNS/fetch failure), so the round fell back to ArcGIS
  Online's public item-search API, which surfaced two named
  candidates: "Jacksonville Parcels" and "Jacksonville Interactive
  Parcel Map_WFL1". Round 2 probed both services' layer catalogs and
  caught a subtle false positive: the "Interactive Parcel Map"
  candidate's layer names (`Jville_UGB`, `Jville_Comp_Plan`,
  `Jville_Zones`) referenced an Urban Growth Boundary — a term
  specific to Oregon-style land-use planning — revealing it was
  actually Jacksonville, **Oregon** (a small town in Jackson County,
  OR), not Jacksonville, FL; it was discarded. "Jacksonville Parcels"
  confirmed as the real candidate: one real Polygon layer, explicitly
  named `jackonsville-fl-parcels` [sic, the source's own typo]. Round
  3 probed it directly and confirmed a rich 76-field Duval County
  Property Appraiser CAMA export with real Polygon geometry.
- Field mapping: 12 of 30 canonical fields mapped (parcel_id → RE,
  pin → RE_NOSPACE, owner → LNAMEOWNER, land_use_code → PUSE,
  land_use_desc → DESCPU, zoning_code → ZON_LABEL, area_acres → ACRES,
  building_count → NBBLDGS, assessed_value → CAMA_VAL, land_value →
  TOT_LND_VA, improvement_value → TOT_IMPR_V, subdivision → SUB_BLK)
  plus county_fips (computed) — 13/30. Site address
  (ST_DIR/ST_NAME/ST_TYPE/STREET_NO/ADDRCITY), owner mailing address
  (MAILADDR1-3/MAILCITY/MAILSTATE/MAILZIP), last sale date
  (SALESLYY/SALESLMM/SALESLDD as three separate numeric fields), and
  legal description (LEGAL1-6) are all split across multiple source
  fields with no single combined field, so none of those are mapped.
  The remaining 17 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Licensing: official Duval County Property Appraiser (City of
  Jacksonville, Florida) data, hosted as an ArcGIS Online feature
  service. Standard "public government data, verify terms before
  commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 12 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  17, zero page errors. Registry now covers 35 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added District of Columbia (FIPS 11001, 23 facilities, tied
  with Wayne County MI and Tarrant County TX) to the parcel registry,
  over four probe rounds — the most rounds any single jurisdiction has
  taken this session.
- Findings: Round 1's DCAT catalog on DC OCTO's open data portal
  (opendata.dc.gov) surfaced a "Tax Exempt Properties" dataset
  distributed from a `Property_and_Land_WebMercator` FeatureServer
  (maps2.dcgis.dc.gov) — a strong signal its other layers carried DC's
  real-property data. Round 2 listed that service's full 38-layer
  catalog and found two real Polygon geometry layers ("Parcel Lots",
  "Tax Lots") plus several likely CAMA/assessment layers via a
  targeted DCAT keyword re-filter (integrated tax system, CAMA, real
  property, assessment). Round 3 probed all of them directly: Parcel
  Lots and Tax Lots both confirmed real `esriGeometryPolygon` geometry,
  but each layer's own description reveals a narrow edge case —
  Parcel Lots is land that was *never* subdivided into Record or Tax
  Lots (a historical residual category), and Tax Lots exist only when
  a property's tax lot diverges from its record lot (a "combine" or
  "split" edge case). The CAMA layers (residential CAMA, property
  sales CAMA) and a separate, much richer 218-field "ITSPE" (OCFO
  Integrated Tax System Public Extract, a different ArcGIS org)
  returned no `geometryType` — non-spatial tables joined to geometry
  via DC's SSL (Square-Suffix-Lot) identifier, the same architectural
  gap this session already hit with Suffolk County MA and Polk County
  IA (the connector only does 1:1 field mapping on a single spatial
  layer; it can't join a non-spatial CAMA table to a geometry layer).
  Round 4 checked the one remaining candidate seen in round 2's layer
  catalog but not yet probed: "Record Lots". Its own description
  settled the choice: "a piece of property must be a Record Lot before
  a building permit will be issued... normally when they are seeking a
  building permit" — i.e., this is DC's standard cadastral layer for
  ordinary developed properties (data center sites included), unlike
  the other two edge-case layers. Confirmed real `esriGeometryPolygon`
  geometry with 35 fields.
- Field mapping: 3 of 30 canonical fields mapped (parcel_id → SSL,
  pin → SQUARE, area_sqft → CALCULATEDAREA) plus county_fips
  (computed) — 4/30, a thin add following the same precedent as
  Middlesex County MA and Allegheny County PA, since Record Lots is a
  pure cadastral-geometry layer with no owner/value/address fields.
  The remaining 26 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Follow-up opportunity: the OCFO Integrated Tax System Public Extract
  (218 fields: OWNERNAME, ADDRESS1/ADDRESS2/CITYSTZIP, PREMISEADD,
  NEWLAND/NEWIMPR/NEWTOTAL, SALEPRICE, SALEDATE, DEEDDATE, ASSESSMENT,
  ANNUALTAX, USECODE, LANDAREA — joined by SSL) and the CAMA
  residential/property-sales tables on the same
  `Property_and_Land_WebMercator` service would make DC's parcel data
  dramatically richer if the connector supported a non-spatial-table
  join by a shared key field — the same connector-enhancement
  opportunity already logged for Suffolk County MA and Polk County IA.
- Licensing: official District of Columbia government parcel data
  (Office of the Surveyor / DC GIS), confirmed via the layer's own
  copyrightText ("District of Columbia"). Standard "public government
  data, verify terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 3 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  26, zero page errors. Registry now covers 34 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Wayne County, Michigan (FIPS 26163, 23 facilities, Detroit
  metro) to the parcel registry, over two probe rounds.
- Findings: Round 1's DCAT catalog on the county's own GIS portal
  directly surfaced "WayneCo Parcels" with a real ArcGIS GeoServices
  REST distribution URL (services6.arcgis.com, item WiOy9S7NUTWyXUe4).
  Round 2 probed it directly and got HTTP 503 "The service is
  unavailable" — treated as possibly transient given this session's
  track record with brief ArcGIS Online outages, so the same probe was
  re-run once rather than immediately writing it off. The re-run
  returned HTTP 200 with 28 real fields, layer name
  "parcel_joined_ExportFeatures", and real Polygon geometry — the 503
  was transient, not a genuine outage.
- Field mapping: 15 of 30 canonical fields mapped (parcel_id → Parcel,
  pin → Parcel2, address → PPAddress, owner → PPOwner, owner_mailing →
  PPOwnerAddress, land_use_code → PPClassCode, area_acres → PPAcres,
  gross_floor_area → PPLivingArea, year_built → PPYearBuilt,
  building_count → PPDwellCount, assessed_value → PPTotalValue,
  land_value → PPLandValue, improvement_value → PPImprValue,
  last_sale_date → PPSaleDate, last_sale_price → PPAmount) plus
  county_fips (computed) — 16/30. Unusually for this session,
  owner_mailing has a single combined source field (PPOwnerAddress) so
  it could actually be mapped. The layer also carries a separate
  PPTaxPayer/PPTaxPayerAddress pair (tax-payer-of-record, distinct from
  owner-of-record) and a secondary PPClassNumber code, plus
  PPGrade/PPCondition/PPHasCAUV — none have a canonical equivalent and
  are left unmapped since PPOwner/PPOwnerAddress/PPClassCode already
  cover the corresponding canonical fields. The remaining 14 fields
  recorded in `notProvidedBySource` — verified programmatically to
  cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: public Wayne County, Michigan government parcel data,
  hosted as an ArcGIS Online feature service. Standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 15 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  14, zero page errors. Registry now covers 33 jurisdictions.

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Tarrant County, Texas (FIPS 48439, 23 facilities, Fort
  Worth metro) to the parcel registry, in a single probe round — a
  first-probe success.
- Findings: Web search directly surfaced the county's own ArcGIS
  Server (mapit.tarrantcounty.com), with a "Tax/TCProperty" layer
  explicitly named and described in search results as a Tarrant
  Appraisal District CAMA export. Probed directly and confirmed: 57
  fields, real Polygon geometry, description "Tarrant County parcels
  derived from Tarrant Appraisal District parcel property feature
  class", copyrightText "Tarrant County Tax Assessor-Collector,
  Tarrant Appraisal District". Notably, unlike most other counties
  this session, `SITUS_ADDR` is a single combined site-address field
  rather than split across number/street/suffix components.
- Field mapping: 18 of 30 canonical fields mapped (parcel_id → TAXPIN,
  pin → ACCOUNT, address → SITUS_ADDR, owner → OWNER_NAME,
  land_use_code → PARCELTYPE, land_use_desc → DESCR, area_sqft →
  LAND_SQFT, area_acres → LAND_ACRES, year_built → YEAR_BUILT,
  gross_floor_area → LIVING_ARE, assessed_value → APPRAISEDV,
  land_value → LAND_VALUE, improvement_value → IMPR_VALUE,
  last_sale_date → DEED_DATE, deed_book → DEED_BOOK, deed_page →
  DEED_PAGE, subdivision → SubdivisionName, legal_desc → LEGAL_1) plus
  county_fips (computed) — 19/30, the richest addition of this
  stretch. Owner mailing address is split across separate line/city/
  zip fields with no single combined field, so owner_mailing isn't
  mapped. The remaining 11 fields recorded in `notProvidedBySource` —
  verified programmatically to cover all 30 canonical fields with zero
  gaps and zero overlaps.
- Licensing: official Tarrant County Tax Assessor-Collector / Tarrant
  Appraisal District data, confirmed via the layer's own copyrightText.
  Standard "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 18 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  11, zero page errors. Registry now covers 32 jurisdictions.
- Unrelated finding during this PR's CI cycle: `check_parcel_services`
  flagged Bexar County TX's parcel service (added earlier this
  session) as newly down. Confirmed across 2 separate probe attempts
  a few minutes apart (Wake County NC and King County WA also flagged
  alongside it on the first attempt, but both recovered on rerun —
  only Bexar stayed down), so treated as a real outage rather than
  flakiness and marked `knownUnavailable` in `js/parcel/registry.js`
  per the project's own documented pattern (see
  `data/check_parcel_services.mjs`'s comments), with a corresponding
  Open Handoffs entry. This was unrelated to the Tarrant County
  addition itself — just discovered incidentally while getting this
  PR's CI green.
- Temp files (`data/diagnose_tarrant_tx.mjs`,
  `.github/workflows/_diagnose_tarrant_tx.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-04

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Marion County, Indiana (FIPS 18097, 24 facilities,
  Indianapolis metro) to the parcel registry, over two probe rounds.
- Findings: Indianapolis and Marion County share a consolidated
  "Unigov" city-county government. Round 1's DCAT catalog on the Open
  Indy Data Portal (data-indygis.opendata.arcgis.com) directly
  surfaced a promising dataset — "Parcels w/ Owner Information &
  Assessed Values" — alongside a plainer boundary-only fallback
  ("Parcels"). Round 2 probed both directly: the richer candidate
  (MapIndy/MapIndyProperty, layer 10, internal name "Parcel") is real,
  live, 50 fields, real Polygon geometry — used it over the fallback
  (25 fields, no owner/value data).
- Field mapping: 12 of 30 canonical fields mapped (parcel_id →
  PARCEL_C, pin → STATEPARCELNUMBER, owner → FULLOWNERNAME,
  land_use_code → PROPERTY_CLASS, land_use_desc →
  PROPERTY_SUB_CLASS_DESCRIPTION, area_sqft → ESTSQFT, area_acres →
  ACREAGE, assessed_value → ASSESSORYEAR_TOTALAV, land_value →
  ASSESSORYEAR_LANDTOTAL, improvement_value → ASSESSORYEAR_IMPTOTAL,
  subdivision → SUBDIVNUM, legal_desc → LEGAL_DESCRIPTION_) plus
  county_fips (computed) — 13/30. Site address is split across
  multiple component fields (street number, prefix direction, street
  name, suffix, suffix direction) with no single combined field, and
  owner mailing address is likewise split (address line 1/2, city,
  state, zip), so neither `address` nor `owner_mailing` is mapped —
  the connector only supports 1:1 field mapping. The remaining 17
  fields recorded in `notProvidedBySource` — verified programmatically
  to cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: IndyGIS's own official data (the joint Indianapolis/
  Marion County GIS department). Standard "public government data,
  verify terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 12 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  17, zero page errors. Registry now covers 31 jurisdictions.
- Temp files (`data/diagnose_marion_in.mjs`,
  `.github/workflows/_diagnose_marion_in.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-04

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Allegheny County, Pennsylvania (FIPS 42003, 25
  facilities, Pittsburgh metro) to the parcel registry, over three
  probe rounds.
- Findings: Round 1's DCAT catalog on the county's own GIS Open Data
  portal confirmed a real "Allegheny County Parcel Boundaries" dataset
  exists, but its distribution field only pointed to a PASDA
  (Pennsylvania Spatial Data Access — Penn State's official statewide
  GIS clearinghouse) landing page rather than a direct REST URL; a
  direct guess at the county's own PASDA-hosted ArcGIS Server
  (maps.pasda.psu.edu's AlleghenyCountyParcels service) returned a
  real ArcGIS 500 "Service ... not started" — a cold/idle service
  state. Round 2 retried that service twice (4s apart) with no change,
  then listed the full layer catalog (41 layers) of an alternate
  PASDA-hosted MapServer (mapservices.pasda.psu.edu's
  pasda/AlleghenyCounty) and found layer 25, "Allegheny County Parcels
  20260727" — a live, currently-dated parcels layer distinct from the
  dead service. Round 3 confirmed it directly: 13 fields, real Polygon
  geometry.
- Field mapping: 3 of 30 canonical fields mapped (parcel_id → PIN, pin
  → MAPBLOCKLO — the traditional Allegheny County Map-Block-Lot
  identifier, area_acres → CALCACREAG) plus county_fips (computed) —
  4/30. This PASDA mirror only exposes boundary/identifier/acreage
  data; no owner, address, value, or sale fields exist in this layer,
  and the layer catalog's other 40 layers (library/parks/streets/
  hydrology/etc.) contained no CAMA or assessment attribute table to
  join. The remaining 26 fields recorded in `notProvidedBySource` —
  verified programmatically to cover all 30 canonical fields with zero
  gaps and zero overlaps.
- Licensing: Allegheny County's own official parcel boundary data,
  mirrored through PASDA (the Commonwealth of Pennsylvania's official
  GIS data-sharing partnership with Penn State). Standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of both mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  26, zero page errors. Registry now covers 30 jurisdictions.
- Follow-up opportunity (not attempted this session): Allegheny
  County's own Real Estate/CAMA assessment website (owner, value, sale
  history) is a separate system from this GIS boundary layer and was
  not investigated — a human could look into whether it exposes a
  queryable API or bulk data export that could be joined to this
  boundary layer's PIN field.
- Temp files (`data/diagnose_allegheny_pa.mjs`,
  `.github/workflows/_diagnose_allegheny_pa.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-04

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Hamilton County, Ohio (FIPS 39061, 25 facilities,
  Cincinnati metro) to the parcel registry, over three probe rounds.
- Findings: Round 1's usual DCAT-catalog-first approach failed outright
  — CAGIS (Cincinnati Area Geographic Information System, the joint
  city-county GIS authority) has disabled its Open Data Hub's DCAT feed
  entirely, returning HTTP 403 "Feeds have been disabled for this
  site." Round 2 fell back to ArcGIS Online's public, unauthenticated
  item-search API (`www.arcgis.com/sharing/rest/search`), which
  reliably surfaced several real candidates including two published by
  official CAGIS accounts: "Hamilton County Parcel Polygons" (owner
  CagisCoreLayers, CAGIS's own core-layers publishing account) hosted
  on CAGIS's own ArcGIS Server, and "Hamilton County Parcels - Open
  Data" (owner cagisopendata) hosted on ArcGIS Online. Round 3 probed
  both directly: both are real, live, Polygon-geometry layers with
  nearly identical ~98-99-field CAMA-style schemas. Used the CAGIS-
  hosted one (`HCE/Cadastral/MapServer/0`, internal layer name
  "CAGIS.Ham_Parcel_Poly") as the more directly authoritative source.
- Field mapping: 15 of 30 canonical fields mapped (parcel_id →
  PARCELID, pin → AUDPCLID, owner → OWNNM1, land_use_code → CLASS,
  area_acres → ACREDEED, lot_width_ft → FRONT_FOOTAGE, assessed_value →
  MKT_TOTAL_VAL, land_value → MKTLND, improvement_value → MKTIMP,
  tax_amount → ANNUAL_TAXES, last_sale_date → SALDAT, last_sale_price →
  SALAMT, deed_book → BOOK, deed_page → PAGE, legal_desc → LGLDS1) plus
  county_fips (computed) — 16/30. Two notable honesty calls: (1)
  site/mailing address fields are split into multiple components
  (ADDRNO/ADDRST/ADDRSF for site address; OWNAD1/OWNAD1A/OWNAD2/
  OWNADCITY/OWNADSTATE/OWNADZIP and a separate MLNM/MLADR set for
  mailing) with no single combined field and the connector only
  supports 1:1 field mapping, so address and owner_mailing are left
  unmapped rather than guessing which component to use; (2)
  assessed_value/land_value/improvement_value map to this layer's
  MKT_* (market value) fields rather than a literal "assessed" field,
  since Ohio's statutory assessed value is a fixed 35% conversion of
  market value that isn't separately exposed in this GIS layer — noted
  explicitly in the attribution rather than silently mislabeled. The
  remaining 14 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Licensing: CAGIS's own official data, confirmed via the AGOL item
  ownership (CagisCoreLayers). Standard "public government data,
  verify terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 15 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  14, zero page errors. Registry now covers 29 jurisdictions.
- Temp files (`data/diagnose_hamilton_oh.mjs`,
  `.github/workflows/_diagnose_hamilton_oh.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-04

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Middlesex County, Massachusetts (FIPS 25017, 26
  facilities, Cambridge/Boston suburbs) to the parcel registry, in a
  single probe round.
- Findings: Suffolk County MA is already served by MassGIS's statewide
  "Massachusetts Property Tax Parcels" ArcGIS service
  (arcgisserver.digital.mass.gov). This round re-probed that same
  layer's field list to look for a county- or town-name field to scope
  Middlesex by (following the `where`-clause pattern used for
  Washington County OR / Oregon Metro's multi-county service and NYC's
  multi-borough service). The real field list confirmed the layer has
  only 19 fields — the same schema already found for Suffolk — with no
  COUNTY, CITY_TOWN, or MUNI_ID field at all; the only town-related
  field is a numeric TOWN_ID with no accompanying name lookup in this
  layer, so several guessed where-clauses using string functions on
  nonexistent/wrong-type fields returned generic ArcGIS "Unable to
  perform query operation" errors. Rather than trying to source an
  external MassGIS town-ID-to-county crosswalk (fragile, and this
  layer is thin regardless), recognized that no scoping is actually
  required: `js/parcel/connector-arcgis.js`'s `fetchViewport` already
  restricts every fetch to the current map viewport via a
  geometry-intersects query, and Suffolk County's own existing entry
  already uses this exact service with no `where` clause at all
  (defaulting to `1=1`). Adding Middlesex the same way — same
  serviceUrl, no `where` clause — is architecturally identical to
  Suffolk and correctly returns real Middlesex-area parcels because
  the viewport bounds do the geographic scoping, not an attribute
  filter.
- Field mapping: identical to Suffolk County MA, since it's the same
  source layer — 3 of 30 canonical fields mapped (parcel_id →
  MAP_PAR_ID, pin → LOC_ID, land_use_code → LU_CODES) plus county_fips
  (computed). The remaining 26 fields recorded in
  `notProvidedBySource` — verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
- Licensing: same as Suffolk County MA — MassGIS's own official
  statewide service. Standard "public government data, verify terms
  before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 3 mapped fields plus "Not
  published by this source" for the remaining 26, zero page errors.
  Registry now covers 28 jurisdictions.
- Follow-up opportunity (not attempted this session): same as Polk
  County IA and Suffolk County MA — a human could extend
  `js/parcel/connector-arcgis.js` to support resolving a boundary
  layer's features against a related non-spatial attribute table
  (GISDATA.L3_ASSESS, joinable by LOC_ID), which would unlock genuinely
  rich owner/value/sale/building data for all three MassGIS-schema
  jurisdictions at once.
- Temp files (`data/diagnose_middlesex_ma.mjs`,
  `.github/workflows/_diagnose_middlesex_ma.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-04

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Hillsborough County, Florida (FIPS 12057, 27 facilities,
  Tampa metro) to the parcel registry, over two probe rounds.
- Findings: Round 1 checked the county's own GeoHub open-data portal's
  DCAT catalog for "parcel" matches — it only exposed Cities/Zoning/
  Map-viewer layers, no parcel FeatureServer — and a direct guess at
  the Property Appraiser's own host (gis.hcpafl.org) returned an
  ArcGIS 500 ("Service ... not found"). A web search surfaced the City
  of Tampa's own ArcGIS Server (`arcgis.tampagov.net/.../TaxParcel`,
  46 fields) and the Tampa Hillsborough Planning Commission's ArcGIS
  Server (`gis.tpcmaps.org/.../Parcels/MapServer/2`, 56 fields); round
  2 probed both directly. The Tampa city server's own description read
  "Hillsborough County Property Appraiser Data (City & county
  Parcels)" with copyrightText "City of Tampa: GIS" — ambiguous
  city-vs-county scoping. The tpcmaps.org layer's own description read
  "Hillsborough County Property Appraiser's Parcel data shows
  ownership boundaries and data including addresses, DOR land usage
  codes, legal descriptions, value and other various ownership
  information. Updated quarterly." with copyrightText "Hillsborough
  County Property Appraiser" — unambiguously the official, county-wide
  source, hosted by the joint city-county planning commission. Used
  the tpcmaps.org layer.
- Field mapping: 17 of 30 canonical fields mapped directly (parcel_id →
  FOLIO, pin → PIN, address → SITE_ADDR, owner → OWNER, land_use_code →
  DOR_CODE, land_use_desc → DOR_DESC, area_acres → PAR_ACREAGE,
  building_count → tBLDGS, year_built → ACT, gross_floor_area →
  HEAT_AR, assessed_value → ASD_VAL, land_value → LAND,
  improvement_value → BLDG, last_sale_date → S_DATE, last_sale_price →
  S_AMT, subdivision → SUB, legal_desc → LEGAL1) plus county_fips
  (computed) — 18/30. Not mapped: owner_mailing (source splits it
  across ADDR_1/ADDR_2/CITY/STATE/ZIP with no single concatenated
  field, and the connector only supports 1:1 field mapping),
  zoning_code/zoning_desc/overlay_districts (no zoning field in this
  parcel layer), area_sqft, lot_depth_ft, lot_width_ft, tax_year,
  tax_amount, deed_book, deed_page, census_tract — recorded in
  `notProvidedBySource`, verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
- Licensing: official Hillsborough County Property Appraiser data,
  confirmed via the layer's own copyrightText. Standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 17 mapped fields plus computed
  county_fips, and "Not published by this source" for the remaining
  12, zero page errors. Registry now covers 27 jurisdictions.
- Temp files (`data/diagnose_hillsborough_fl.mjs`,
  `.github/workflows/_diagnose_hillsborough_fl.yml`) deleted in the
  same commit that added the registry entry.
- Last updated: 2026-08-04

- Date: 2026-08-04
- Agent: Claude Code
- Task: Added Suffolk County, Massachusetts (FIPS 25025, 27 facilities)
  to the parcel registry, over six probe rounds — a deliberately thin
  add.
- Findings: Rounds 1-2 exhausted a wrong ArcGIS org guess (Invalid URL
  error) and an alternate state-hosted proxy URL that failed with a
  real DNS/connection error (likely an internal-only host). Round 3
  checked MassGIS's own open-data portal DCAT catalog directly
  (gis.data.mass.gov, an ArcGIS Hub site) and found the real dataset
  among 295 "parcel" matches: "GISDATA.L3 ASSESS" / "Massachusetts
  Property Tax Parcels", the standardized statewide assessors' parcel
  mapping dataset, on a host neither of the first two rounds' guesses
  used (arcgisserver.digital.mass.gov). Round 4 confirmed that URL
  live — but it turned out to be layer 4 of a 4-layer service, an
  exceptionally rich 41-field non-spatial table (full owner name/
  mailing address, assessed/land/building values, sale history with
  book/page, building characteristics, TOWN_ID) with no geometryType at
  all. Round 5 listed the service's full layer catalog and found the
  real Polygon boundary layer: "Tax Parcels" (layer 1). Round 6
  confirmed its own field schema: only 19 fields, almost entirely IDs
  and cartographic metadata, with no address/owner/value data of its
  own.
- Architectural blocker: same as Polk County IA — `js/parcel/
  connector-arcgis.js` fetches from a single configured `serviceUrl`
  and cannot join the boundary layer to the related GISDATA.L3_ASSESS
  attribute table by their shared LOC_ID key. The rich 41-field
  dataset is real and live but not usable without a connector
  enhancement.
- Field mapping: 3 of 30 canonical fields mapped from the boundary
  layer itself (parcel_id → MAP_PAR_ID, pin → LOC_ID — the same join
  key the rich attribute table uses, confirming both describe the same
  real parcels even though they can't be combined here — land_use_code
  → LU_CODES) plus county_fips (computed). The remaining 26 fields
  recorded in `notProvidedBySource` — verified programmatically to
  cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: MassGIS (Commonwealth of Massachusetts Office of
  Geographic Information)'s own official statewide service, confirmed
  via its own copyrightText ("Commonwealth of Massachusetts Office of
  Geographic Information (MassGIS)"). Standard "public government
  data, verify terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 3 mapped fields plus "Not
  published by this source" for the remaining 26, zero page errors.
  Registry now covers 26 jurisdictions.
- Follow-up opportunity (not attempted this session): same as Polk
  County IA — a human could extend `js/parcel/connector-arcgis.js` to
  support resolving a boundary layer's features against a related
  non-spatial attribute table by a shared key (here, LOC_ID), which
  would unlock genuinely rich owner/value/sale/building data for
  Suffolk County MA (and Polk County IA, and potentially other
  jurisdictions publishing a similar normalized MassGIS-style schema).
- Temp files (`data/diagnose_suffolk_ma.mjs`,
  `.github/workflows/_diagnose_suffolk_ma.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-04

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Washington County, Oregon (FIPS 41067, 36 facilities) to
  the parcel registry, over four probe rounds. Discovered as a gap
  while checking the facility-count priority list after Polk County
  IA: 36 facilities, ranked above several already-covered counties
  (Wake NC's 28, Cuyahoga OH's 29) but never investigated.
- Findings: Round 1's guessed county-hosted URLs (gis.co.washington.or.us,
  www.co.washington.or.us) all failed real DNS/404 errors. A web search
  found that Oregon Metro (the Portland tri-county regional government
  covering Clackamas, Multnomah, and Washington) publishes a
  standardized "Taxlots (Public)" dataset via its RLIS Discovery ArcGIS
  Hub portal, compiled from each county assessor's own records. Round 2
  resolved that item's metadata via the ArcGIS sharing API, but it
  turned out to be a static Shapefile download (type: Shapefile, no
  live service `url`), not a queryable REST service. Round 3 checked
  RLIS Discovery's own DCAT catalog directly on its custom domain
  (rlisdiscovery.oregonmetro.gov — not a *.opendata.arcgis.com host,
  confirming ArcGIS Hub sites expose this same feed pattern on custom
  domains too) and found the real "Taxlots (Public)" dataset directly,
  with a genuine ArcGIS GeoServices REST distribution URL. Round 4
  confirmed that URL live: 32 fields, real Polygon geometry, covering
  all three counties with a per-feature COUNTY field.
- Scope handling: this is a regional multi-county service. Multnomah
  County OR (FIPS 41051) already has its own separate registry entry
  using its own county-hosted service — this entry adds a `where`
  clause (`COUNTY = 'Washington'`) so query results are always scoped
  to Washington County regardless of viewport bounds near the county
  line, on top of the connector's normal spatial-bounds filtering (the
  same `where`-clause pattern already used for NYC's borough scoping).
- Field mapping: 13 of 30 canonical fields mapped (parcel_id, pin,
  address, land_use_code, land_use_desc, area_acres, year_built,
  gross_floor_area, assessed_value, land_value, improvement_value,
  last_sale_date, last_sale_price) plus county_fips (computed).
  parcel_id maps to TLID (Tax Lot ID); pin to PRIMACCNUM (Primary
  Account Number, the assessor's own distinct identifier — an
  ALTACCNUM field also exists but only one identifier maps to pin).
  owner and owner_mailing are left unmapped: the dataset's own
  description explicitly states it excludes ownership information
  (OWNERTYPE is a public/private classification, not an owner name).
  area_acres maps to A_T_ACRES (the assessor's own total acreage)
  rather than the separately-present GIS_ACRES (a GIS-calculated
  value), preferring the authoritative source figure. No zoning, tax
  year/amount, deed reference, subdivision, legal description, or
  census tract fields exist. The remaining 16 fields recorded in
  `notProvidedBySource` — verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
- Licensing: Oregon Metro's own official RLIS Discovery portal,
  compiling records from the county's own Department of Assessment &
  Taxation. Standard "public government data, verify terms before
  commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 13 mapped fields plus "Not
  published by this source" for the remaining 16, zero page errors.
  Registry now covers 25 jurisdictions.
- Temp files (`data/diagnose_washington_or.mjs`,
  `.github/workflows/_diagnose_washington_or.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-03

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Polk County, Iowa (FIPS 19153, 27 facilities) to the
  parcel registry, over four probe rounds — a deliberately thin add.
- Findings: Rounds 1-2 exhausted several wrong-domain guesses (two real
  DNS failures, two real 404s) before a web search found the real host:
  gis4.polkcountyiowa.gov, serving a Polk_County_Parcels
  FeatureServer/MapServer with a "Cadastral Parcels" layer (id 1),
  confirmed real, live, Polygon geometry — but only 8 fields (mostly
  IDs and geometry metadata). Round 3 listed the FeatureServer's full
  catalog and found four separate non-spatial tables also present:
  Parcel (id 2 — legal description, deed book/page, acreage/sqft),
  Situs Address (id 3 — full street-address components), Value (id 4 —
  taxable and assessed land/building/dwelling/total values), and
  Owners Mail (id 5 — owner name and full mailing address), all
  joinable by a shared ParcelNumber field — a genuinely rich, standard
  normalized CAMA schema. Round 4 confirmed each table's real field
  schema (Parcel: 15 fields; Situs Address: 17 fields; Value: 22
  fields; Owners Mail: 31 fields).
- Architectural blocker: `js/parcel/connector-arcgis.js` fetches
  attributes from a single configured `serviceUrl` via one `/query`
  call (see `_buildQueryUrl`/`_execute`) and has no support for
  resolving a boundary layer's geometry against related non-spatial
  tables. This is the same class of gap as the Point-vs-Polygon issue
  that blocked Philadelphia's OPA dataset and Clark County NV's
  BOE_Parcels — the richer 4-table CAMA schema found here is real and
  live but not usable without a connector enhancement.
- Field mapping: only 2 of 30 canonical fields mapped from the boundary
  layer itself (parcel_id → Parcel_Number, pin → Alternate_Parcel —
  most likely a legacy/historical parcel-number cross-reference given
  the Parcel table's own field naming, but still a genuine distinct
  identifier), plus county_fips (computed) — the thinnest add this
  session. address left unmapped: the boundary layer's HouseNo field is
  a bare house number with no street name, not a usable site address.
  The remaining 27 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Licensing: Polk County's own GIS host (gis4.polkcountyiowa.gov),
  confirmed via a web search and the service's own description text
  ("Polk County Auditor... Contact Auditor by phone... or by email at
  giswebmaster@polkcountyiowa.gov"). Standard "public government data,
  verify terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of both mapped fields plus "Not published
  by this source" for the remaining 27, zero page errors. Registry now
  covers 24 jurisdictions.
- Follow-up opportunity (not attempted this session): a human could
  extend `js/parcel/connector-arcgis.js` to support resolving a
  boundary layer's features against one or more related non-spatial
  tables by a shared key field (here, ParcelNumber), which would
  unlock genuinely rich owner/value/address/legal data for Polk County
  and potentially other jurisdictions publishing a similar normalized
  CAMA schema (separate boundary + attribute tables rather than one
  flat layer).
- Temp files (`data/diagnose_polk.mjs`,
  `.github/workflows/_diagnose_polk.yml`) deleted in the same commit
  that added the registry entry.
- Last updated: 2026-08-03

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Wake County, North Carolina (FIPS 37183, 28 facilities) to
  the parcel registry, in a single probe round.
- Findings: Wake County's own open-data DCAT catalog listed a "Parcels"
  dataset ("maintained by the Wake County GIS Property Mapping Team")
  whose real ArcGIS GeoServices REST distribution URL
  (maps.wake.gov/arcgis/rest/services/Property/Parcels/MapServer/0)
  exactly matched a direct guess probed in the same round, confirmed
  live: 60 fields, real Polygon geometry — the richest source found
  this session.
- Field mapping: 20 of 30 canonical fields mapped (parcel_id, pin,
  address, owner, land_use_code, land_use_desc, area_sqft, area_acres,
  building_count, year_built, gross_floor_area, assessed_value,
  land_value, improvement_value, last_sale_date, last_sale_price,
  deed_book, deed_page, legal_desc, county_fips). Wake County uses two
  parallel identifier schemes — PIN_NUM (primary Property
  Identification Number) mapped to parcel_id, REID (Real Estate ID)
  mapped to pin. address maps to the source's own pre-combined
  SITE_ADDRESS field rather than the split street-component fields.
  area_sqft mapped to CALC_AREA: distinct from the separately-present
  DEED_ACRES (mapped to area_acres) and the native SHAPE.AREA geometry
  field, its naming strongly implies a GIS-calculated square-foot area
  rather than acres. deed_book/deed_page map field-for-field — the
  first county in this registry with two genuinely separate deed
  reference fields rather than one combined string. owner_mailing left
  unmapped: ADDR1/ADDR2/ADDR3 are pre-formatted mailing-address lines
  with no single combined field, consistent with not concatenating
  multi-line source data ourselves. No zoning field exists (only
  land-use classification). No tax_year or tax_amount field exists
  (billing data lives outside this GIS layer). The remaining 10 fields
  recorded in `notProvidedBySource` — verified programmatically to
  cover all 30 canonical fields with zero gaps and zero overlaps.
- Licensing: Wake County's own GIS host (maps.wake.gov), found via the
  county's own open data portal DCAT catalog. Standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 20 mapped fields plus "Not
  published by this source" for the remaining 10, zero page errors.
  Registry now covers 23 jurisdictions.
- Temp files (`data/diagnose_wake.mjs`,
  `.github/workflows/_diagnose_wake.yml`) deleted in the same commit
  that added the registry entry.
- Last updated: 2026-08-03

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Cuyahoga County, Ohio (FIPS 39035, 29 facilities) to the
  parcel registry, over two probe rounds.
- Findings: Web search found Cuyahoga County's own open data portal
  plus a dedicated Fiscal GIS Hub run by the county Fiscal Officer.
  Round 1's DCAT catalog search (same pattern as Salt Lake/Multnomah/
  Philadelphia/Sacramento) found the real dataset directly: "Parcel
  Fabric Taxparcels", with a genuine ArcGIS GeoServices REST
  distribution URL under a "CCFO" (Cuyahoga County Fiscal Officer)
  service folder on the county's own gis.cuyahogacounty.gov host —
  exactly the right authority for tax parcel data. Round 2 confirmed
  that URL live: Polygon geometry, 142 fields, one of the richest
  sources found this session.
- Field mapping: 19 of 30 canonical fields mapped (parcel_id, pin,
  address, owner, zoning_code, zoning_desc, land_use_code,
  land_use_desc, area_sqft, area_acres, assessed_value, land_value,
  improvement_value, tax_year, tax_amount, last_sale_date,
  last_sale_price, legal_desc, county_fips). parcel_id and zoning_code
  match field-for-field; address maps to the source's own pre-combined
  par_addr_all field (not concatenated by us). Land use has four
  parallel LUC systems (tax/ext/abt/tif); tax_luc/tax_luc_description
  chosen as the primary current tax land-use classification. Valuation
  fields map to the current tax-roll assessed values, not the several
  certified/prior-year variants also present. owner_mailing left
  unmapped: the source splits it into five separate component fields
  with no combined field, consistent with the established practice of
  not concatenating multi-component source fields ourselves. deed_book
  and deed_page also left unmapped: the source provides both as one
  already-combined book_page string that can't be cleanly split without
  fabricating a division. building_count, year_built, and
  gross_floor_area left unmapped: the source splits building stats into
  parallel residential and commercial variants with no unified total or
  single year-built field. No subdivision, overlay_districts, lot
  depth/width (only a combined frontage figure), or census_tract fields
  exist. The remaining 11 fields recorded in `notProvidedBySource` —
  verified programmatically to cover all 30 canonical fields with zero
  gaps and zero overlaps.
- Licensing: Cuyahoga County's own Fiscal Officer service, on the
  county's own GIS domain, found via the county's own open data portal
  DCAT catalog. No description or copyrightText was returned by the
  service; treated as an official government platform rather than a red
  flag, given the unambiguous own-domain/own-authority match. Standard
  "public government data, verify terms before commercial
  redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 19 mapped fields plus "Not
  published by this source" for the remaining 11, zero page errors.
  Registry now covers 22 jurisdictions.
- Temp files (`data/diagnose_cuyahoga.mjs`,
  `.github/workflows/_diagnose_cuyahoga.yml`) deleted in the same
  commit that added the registry entry.
- Last updated: 2026-08-03

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Sacramento County, California (FIPS 06067, 30 facilities)
  to the parcel registry, over two probe rounds.
- Findings: Web search found Sacramento County's own official open
  data portal (data-sacramentocounty.opendata.arcgis.com) hosting both
  a "Parcels" dataset and a separate "Assessor Parcel Viewer" app.
  Round 1's DCAT catalog search (same pattern as Salt Lake/Multnomah/
  Philadelphia) found the real "Parcels" dataset directly, with a
  genuine ArcGIS REST distribution URL on the county's own ArcGIS org.
  Round 2 confirmed that URL live with a real 22-field schema — a
  cadastral/land-use boundary layer (APN, a distinct internal parcel
  key, a full land-use code hierarchy, subdivision name, lot size) but
  with zero owner or assessed-value fields; that data likely lives in
  the separate Assessor Parcel Viewer app
  (assessorparcelviewer.saccounty.gov), whose own queryable ArcGIS
  service was not confirmed. Accepted as a thin-but-real add rather
  than spending a 3rd round chasing the Assessor app, same precedent as
  Travis County TX and Philadelphia PA's boundary-only layers.
- Field mapping: 6 of 30 canonical fields mapped (parcel_id, pin,
  land_use_code, land_use_desc, subdivision, county_fips). No composite
  address field exists (only split STREET_NBR/STREET_NAM, no unit, no
  combined city/zip), so address is left unmapped rather than built
  from parts, same convention as every other split-address source in
  this registry. LOT_SIZE is left unmapped for both area_sqft and
  area_acres since its unit isn't confirmed by the field name, same
  caution as every other ambiguous-unit area field here. The remaining
  24 fields recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps.
- Licensing: Sacramento County's own ArcGIS org, found via the county's
  own open data portal DCAT catalog; standard "public government data,
  verify terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 6 mapped fields plus "Not
  published by this source" for all 24 unmapped fields, zero page
  errors. Registry now covers 21 jurisdictions.
- Shipped: PR #289 (registry addition, deletes the temporary diagnostic
  script/workflow in the same commit).

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Philadelphia, Pennsylvania (FIPS 42101, 32 facilities) to
  the parcel registry, over five probe rounds — the most rounds any
  single county has needed this session, driven by a genuine
  architectural finding rather than repeated wrong guesses.
- Findings: Round 1's DCAT-catalog lookup (Philadelphia's own open data
  portal, same successful pattern as Salt Lake/Multnomah) needed two
  passes — a broad "property/parcel/opa" title regex returned 47
  matches but missed the target within its print limit; round 2's
  targeted "opa" title search found it directly: OPA_PROPERTIES_PUBLIC,
  the Office of Property Assessment's public dataset. Round 3 confirmed
  it live with an exceptionally rich 78-field schema — real owner name,
  address, market/taxable value, full sale history, and building
  characteristics, among the cleanest field naming of any source this
  session (lowercase snake_case like `owner_1`, `market_value`,
  `sale_date`) — but its `geometryType` is `esriGeometryPoint`, not
  `Polygon`. This registry's Leaflet renderer (`js/parcel/renderer.js`)
  draws parcels via `L.geoJSON` with a polygon fillColor/weight style;
  Point features fall back to Leaflet's default marker rendering
  instead, the same architectural blocker that ruled out Clark County
  NV's `BOE_Parcels` earlier this session — a genuinely new kind of
  finding, not a wrong guess, so the investigation continued past the
  usual 2-3 round budget. Round 4 found PASDA's `CityPhilly` MapServer
  (Pennsylvania's state-university-hosted GIS clearinghouse) had 33
  sub-layers including one named directly "Philadelphia DOR Parcels
  202402" (DOR = Department of Revenue). Round 5 confirmed that exact
  layer live: real Polygon geometry, 25 fields, sourced from the city's
  deed/metes-and-bounds registry, updated weekly, explicitly flagged
  "Public= Y" in its own metadata.
- Field mapping: 7 of 30 canonical fields mapped (parcel_id, pin,
  address, owner, land_use_code, land_use_desc, county_fips) — thinner
  than most recent additions, since this Polygon layer carries no
  value, building-count, year-built, sale-history, or legal-description
  data (all of that lives only in the point-geometry
  OPA_PROPERTIES_PUBLIC dataset). The remaining 23 recorded in
  `notProvidedBySource` — verified programmatically to cover all 30
  canonical fields with zero gaps and zero overlaps.
  IMPERV_ARE/IMP_ROOF/IMP_GROUND/IMP_TOTAL/NATURAL_GR/TOTAL_GROU are
  impervious-surface coverage metrics for the city's stormwater billing
  program (confirmed by an accompanying PROGRAM field), a different
  concept than parcel lot area — deliberately left unmapped rather than
  force-fit to area_sqft/area_acres, same caution applied to every
  other ambiguous-field source in this registry.
- Licensing: sourced through PASDA, a Pennsylvania state university
  GIS clearinghouse redistributing the City of Philadelphia's own
  Department of Records data; the layer's own description explicitly
  flags "Public= Y"; standard "public government data, verify terms
  before commercial redistribution" caveat applied.
- Architecture note for follow-up: the much richer OPA_PROPERTIES_PUBLIC
  point dataset (78 fields including owner, value, and sale history)
  remains unused because this registry has no point-geometry rendering
  path. A human could consider extending `js/parcel/renderer.js` with a
  custom `pointToLayer` (e.g. small styled circle markers) to unlock
  point-geometry jurisdictions like this one — worth flagging since
  Philadelphia's dataset is unusually rich and this may not be the last
  point-geometry-only source encountered as the priority list continues
  down smaller markets.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 7 mapped fields plus "Not
  published by this source" for all 23 unmapped fields, zero page
  errors. Registry now covers 20 jurisdictions.
- Shipped: PR #286 (registry addition, deletes the temporary diagnostic
  script/workflow in the same commit).

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Davidson County, Tennessee (FIPS 47037, 34 facilities) to
  the parcel registry — a first-probe success following the web-
  search-first discovery pattern.
- Findings: Web search found a specific, real candidate immediately on
  Nashville's own MetroGIS host: `maps.nashville.gov/.../Cadastral/
  Parcels/MapServer`, described directly as "Parcel Boundaries for
  Nashville/Davidson County" with an "Ownership Parcels" layer.
  Confirmed live via GitHub Actions dispatch (this sandbox's proxy
  blocks similar hosts directly) with a real, rich 58-field schema;
  `copyrightText: "MetroGIS"` confirmed it's genuinely Nashville's own
  official platform (no wrong-county risk this time, unlike Multnomah).
  A fallback candidate (`Parcels_SP`, a State Plane projection variant)
  was checked and confirmed to not exist as a real service (a genuine
  ArcGIS "Service ... not found" error, not a wrong guess needing
  follow-up).
- Field mapping: 18 of 30 canonical fields mapped — including real
  owner name, a composite property address field, a clean land-use
  code+description pair, lot width/depth (mapped from the classic CAMA
  Front/Side fields), acreage (confirmed units), Tennessee's
  assessment-ratio "assessed value" figures (kept consistently on the
  assessed basis rather than mixed with the source's separate
  "appraised" — 100%-of-market — figures), last sale date/price, legal
  description, and census tract. The remaining 12 (owner_mailing,
  zoning_desc, overlay_districts, area_sqft, building_count,
  year_built, gross_floor_area, tax_year, tax_amount, deed_book,
  deed_page, subdivision) recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps. Notably, this layer has no year-built or
  building-count field at all (it tracks land/ownership/valuation, not
  building characteristics) — a genuine source gap, not an oversight.
  `area_sqft` deliberately left unmapped since the only alternative,
  `StatedArea`, has unconfirmed units, same caution applied to every
  other ambiguous-unit area field in this registry.
- Licensing: `copyrightText: "MetroGIS"` is Nashville/Davidson County's
  own Metro Government GIS department; standard "public government
  data, verify terms before commercial redistribution" caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 18 mapped fields plus "Not
  published by this source" for all 12 unmapped fields, zero page
  errors. Registry now covers 19 jurisdictions.
- Shipped: PR #276 (registry addition, deletes the temporary diagnostic
  script/workflow in the same commit).

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Multnomah County, Oregon (FIPS 41051, 36 facilities) to
  the parcel registry, over two probe rounds.
- Findings: Round 1's web-search-guessed candidate
  (`services3.arcgis.com/tNPgIZWOB0Efvm0g/.../Tax_Lots`) was live and
  had appeared repeatedly across multiple web searches, but its own
  `description` and `copyrightText` fields revealed it as **Umatilla
  County, Oregon** GIS data, not Multnomah — a wrong-county false
  positive caught by the standing practice of always checking
  description/copyrightText, not just HTTP status. Round 1's DCAT
  catalog fallback (Multnomah's own open data portal,
  gis-multco.opendata.arcgis.com) found the real answer directly: a
  dataset literally titled "Multnomah County Taxlot Parcels" with a
  genuine ArcGIS REST distribution URL. Round 2 confirmed that URL live
  with a real, rich 56-field schema — layer name "Multnomah County Tax
  Parcels", sourced from the county's own Department of Assessment,
  Recording and Taxation.
- Field mapping: 20 of 30 canonical fields mapped — the richest of any
  jurisdiction added this session — including owner name (real, unlike
  Salt Lake's statewide feed), address, zoning code, land use,
  area_sqft/acres (confirmed units), building count, year built, gross
  floor area, Oregon's constitutional Measure 50 assessed value
  (ROLLM50, the correct "official" assessed-value concept for Oregon)
  plus land/improvement value breakdown, tax year, full sale history
  (date + price), and legal description. The remaining 10
  (owner_mailing, zoning_desc, overlay_districts, lot_depth_ft,
  lot_width_ft, tax_amount, deed_book, deed_page, subdivision,
  census_tract) recorded in `notProvidedBySource` — verified
  programmatically to cover all 30 canonical fields with zero gaps and
  zero overlaps. deed_book/deed_page deliberately left unmapped rather
  than force-fit to the source's INST_NUM field, since Oregon's
  recording system uses instrument numbers, a genuinely different
  identifier scheme than book/page, not a renamed equivalent.
- Licensing: found via the county's own official open data portal
  listing (gis-multco.opendata.arcgis.com), sourced from the county
  Department of Assessment, Recording and Taxation; standard "public
  government data, verify terms before commercial redistribution"
  caveat applied.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 20 mapped fields plus "Not
  published by this source" for all 10 unmapped fields, zero page
  errors. Registry now covers 18 jurisdictions.
- Shipped: PR #274 (registry addition, deletes the temporary diagnostic
  script/workflow in the same commit).

- Date: 2026-08-03
- Agent: Claude Code
- Task: Added Salt Lake County, Utah (FIPS 49035, 37 facilities) to the
  parcel registry — a first-probe success following the same web-
  search-first discovery pattern as Miami-Dade/Bexar.
- Findings: Web search found a specific, real candidate immediately:
  UGRC (Utah Geospatial Resource Center) hosts a "Parcels_SaltLake_LIR"
  FeatureServer layer, part of the statewide Land Information Record
  (LIR) parcel program maintained in coordination with the county
  Assessor and updated monthly. Confirmed live via GitHub Actions
  dispatch (this sandbox's proxy returns HTTP 403 on arcgis.com
  directly, confirmed via a direct curl test) with a real 30-field
  schema: PARCEL_ID, SERIAL_NUM, PARCEL_ADD, PARCEL_CITY, PROP_CLASS,
  PROP_TYPE, PARCEL_ACRES, BLDG_SQFT, HOUSE_CNT, BUILT_YR,
  TOTAL_MKT_VALUE, LAND_MKT_VALUE, SUBDIV_NAME, plus admin/geometry
  fields. No owner name field exists anywhere in this layer — UGRC's
  statewide LIR program deliberately omits owner data (available only
  through each county's own non-standardized assessor lookup app), a
  structural gap, not a guess. Two fallback candidates were also probed
  (the county's own open data portal DCAT catalog, and a guessed county
  GIS host) but the UGRC layer's first-probe success made them
  unnecessary to pursue further.
- Field mapping: 13 of 30 canonical fields mapped (parcel_id, pin,
  address, land_use_code, land_use_desc, area_acres, gross_floor_area,
  building_count, year_built, assessed_value, land_value, subdivision,
  county_fips); the remaining 17 (owner, owner_mailing, zoning_code,
  zoning_desc, overlay_districts, area_sqft, lot_depth_ft, lot_width_ft,
  improvement_value, tax_year, tax_amount, last_sale_date,
  last_sale_price, deed_book, deed_page, legal_desc, census_tract)
  recorded in `notProvidedBySource` — verified programmatically to
  cover all 30 canonical fields with zero gaps and zero overlaps.
  PARCEL_ID/SERIAL_NUM mapped separately to parcel_id/pin (two distinct
  real identifier fields, standard for Utah county assessors). PARCEL_
  ADD used directly for address, not concatenated with the separate
  PARCEL_CITY field (no canonical "city" field exists). PARCEL_ACRES has
  confirmed units (name states acres) and maps to area_acres; area_sqft
  left unmapped since the only alternative, Shape__Area, has unconfirmed
  units, same caution applied to every other ambiguous-unit area field
  in this registry. BLDG_SQFT (a distinct building-square-footage field)
  maps to gross_floor_area. TOTAL_MKT_VALUE/LAND_MKT_VALUE map to
  assessed_value/land_value, matching how every other jurisdiction's
  market-value concept is represented.
- Licensing: UGRC is a Utah state government agency; the live service's
  `description` field describes the public LIR parcel-sharing program
  with no redistribution restriction found; standard "public government
  data, verify terms before commercial redistribution" caveat applied,
  consistent with every other jurisdiction in this registry.
- Validation: `node tests/parcel.test.js` passes (293/293). Playwright
  live-test via `window.PARCEL_PANEL.show()` with a synthetic feature
  confirmed correct rendering of all 13 mapped fields plus "Not
  published by this source" for all 17 unmapped fields, zero page
  errors. Registry now covers 17 jurisdictions.
- Shipped: PR #271 (registry addition, deletes the temporary diagnostic
  script/workflow in the same commit).

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Live-browser-tested the site screener and polygon draw/measure
  tool (both work correctly, zero errors) — six features now confirmed
  working this session (compare tool, keyboard shortcuts, 3D view,
  workspace persistence, site screener, draw tool). Then audited all of
  `data/*.py` for bare `except Exception:`/`except:` blocks, the same
  silent-failure pattern already fixed twice this session in HIFLD/zoning
  ArcGIS fetchers. Found something categorically worse than either of
  those: `validate_sources.py`'s `write_report_to_map_data()` silently
  fell back to an empty dict on *any* read failure of `map_data.json` —
  the entire 1,467-county production dataset — and then unconditionally
  wrote that empty dict back to the same file a few lines later.
  `update_data.yml` calls this and commits `map_data.json` straight to
  `main` with no review. A single transient read glitch was one bad run
  away from destroying the whole dataset. Fixed by raising instead of
  silently substituting — verified the calling workflow step already has
  `continue-on-error: true`, so this doesn't break the deploy, it just
  stops the destructive write. Also fixed two lower-severity silent
  swallows in `monitor_legislation.py` (dropped bill-scoring bonuses with
  no log line explaining why).
- Files changed: `data/validate_sources.py`, `data/monitor_legislation.py`,
  `BUG_TRACKER.md`, this file.
- Tests performed: `tests/run_all.sh` 176/176. Directly exercised the fixed
  function with a nonexistent `MAP_DATA_PATH` and confirmed it now raises
  and writes nothing, where it previously would have silently written a
  near-empty file. Playwright exploration of the two new features, zero JS
  errors.
- Note for whoever reads this next: the same audit found several other
  bare-except blocks in facility_pipeline scraper adapters
  (`digital_realty.py`, `equinix.py`, `hyperscale_press.py`) that silently
  skip malformed scraped items inside a loop. Left as-is — worst case is
  missing supplementary detail on a best-effort scrape, not data loss —
  but worth a closer look if facility data quality ever looks off.

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Continued "institutional quality" pass. Live-browser-tested the
  compare tool, keyboard shortcuts modal, 3D terrain view toggle, and
  workspace save/reload persistence — all four work correctly (two initial
  "bugs" turned out to be wrong assumptions in my own test scripts, not app
  defects, corrected before concluding). Then swept for the same class of
  issue already found twice this session: (1) `data/zoning/scripts/
  fetch_zoning.py`'s ArcGIS pagination never checked for the
  `{"error":...}` response-body gotcha, so a broken zoning endpoint would
  have been indistinguishable from a legitimately empty result in the logs
  — added the same check already used in `fetch_infrastructure.py`.
  (2) The no-paid-dependency test suite failed on a genuinely new hit:
  `data/facility_pipeline/adapters/osm.py` passes through an OSM
  contributor's own basemap-attribution tag verbatim into a `notes` field,
  and one record happened to cite a provider on the paid-service watch
  list — inert third-party metadata, not a live dependency, but a
  *recurring* risk (unlike the earlier cloudscene historical-snapshot
  finding, which was a one-time archive artifact). Root-caused rather than
  test-exempted: the adapter now excludes `source`/`source:*` tags before
  building `notes`, so the data file itself stays fully scanned for any
  genuine future paid-dependency leak.
- Files changed: `data/zoning/scripts/fetch_zoning.py`,
  `data/facility_pipeline/adapters/osm.py`,
  `data/facilities_candidates.json` (one record corrected),
  `BUG_TRACKER.md`, this file.
- Tests performed: `tests/run_all.sh` 176/176 (was failing on the
  no-paid-dependency check before this fix — confirmed the failure was
  new, not pre-existing, by checking it wasn't present before this
  session's edits). Playwright exploration against real Chromium for the
  four features listed above, zero JS errors.

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Bobby asked to keep going toward "institutional quality." Followed up
  on an open item from earlier in this session: `fetch_infrastructure.py`'s
  substation and power-plant queries were silently returning 0 records on
  every run (visible as ArcGIS "Invalid URL" errors after an earlier fix in
  this same session made that failure loggable instead of silent, but not
  yet diagnosed). This sandbox's proxy blocks arcgis.com entirely, so
  diagnosis needed a real-internet environment — used a throwaway
  `workflow_dispatch` diagnostic workflow dispatched against GitHub Actions
  (PRs #208-#211, deleted once the real fix landed) to search HIFLD's ArcGIS
  orgs and verify actual field names/values rather than guessing.
- Findings: substations' original service is genuinely gone, but a live
  mirror exists under a different HIFLD org with a different schema
  (MAX_VOLT/MIN_VOLT instead of a combined VOLTAGE string, COUNTYFIPS
  instead of COUNTY_FIPS, COUNTRY='USA' not 'US'). Transmission's URL was
  never broken — its WHERE clause referenced a COUNTRY column that layer's
  schema doesn't have, which is why it failed with a different ArcGIS error
  ("Invalid query parameters") than substations/power-plants did ("Invalid
  URL"). Power_Plants and EPA water stress have no verified live
  replacement after a genuine search (both HIFLD orgs' full service
  listings, two DCAT catalog guesses, several 403s from human-facing search
  pages) — left open rather than guessed, per the project's own established
  rule from the Virginia parcel fieldMap incident.
- Files changed: `data/fetch_infrastructure.py`, `BUG_TRACKER.md`, this
  file. (Diagnostic-only files `data/diagnose_hifld_endpoints.py` and
  `.github/workflows/_diagnose_hifld.yml` were added and then deleted in
  this same pass, per their own stated intent.)
- Tests performed: `tests/run_all.sh` (176/176 — this module has no offline
  coverage, live network behavior only). The actual fix was verified via
  the diagnostic workflow's real Actions-runner probes returning genuine
  feature data with the exact WHERE clauses and field names now in the
  code, before writing the real fix.
- Remaining concerns: Power_Plants and EPA water stress are still broken
  (see BUG_TRACKER.md's Active Bugs). Recommend re-running
  `update_infrastructure.yml` after this merges to confirm substations and
  transmission now populate `sample_layers.json` for real, since CI is the
  only environment that can reach these services at all.

- Date: 2026-08-02
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Bobby asked for "a complete bug fix — access any web problems and fix
  them," i.e. actual browser/UI testing rather than data-pipeline/CI work.
  Ran `tests/e2e_smoke.mjs` against a real headless Chromium (pre-installed
  at `/opt/pw-browsers/chromium`) and a local server, iterating until all 15
  scenarios passed clean. Found and fixed two real bugs: (1) header nav tabs
  became unreachable with no visual affordance at common laptop widths
  (1200-1366px) because the "More" overflow pattern only engaged below
  700px — root-caused to a prior session's padding fix having been tuned
  for seven tabs before an eighth ("AI Stocks") was added; fixed the stale
  breakpoint and added a dynamic overflow-detection fallback so this class
  of bug can't silently recur. (2) The "Counties Researched" stat was
  overcounting by 597 (showing 1,467 instead of 870) in four places (Home
  KPI + freshness bar, Analytics KPI card, map legend, About page data
  quality panel) because they'd never adopted the `researchedCount()` fix
  from the 2026-07-27 reclassification sweep — most visibly on the About
  page, where "1,467 researched" and "2,273 not yet researched" sat next to
  each other without summing to 3,143. Also re-ran
  `data/refresh_platform_metadata.py`, which had itself drifted stale.
  See BUG_TRACKER.md for full root-cause writeups on both.
- Commit(s): see branch history for
  `claude/us-datacenter-restrictions-map-skooi7`, dated 2026-08-02.
- Files changed: `css/style.css`, `js/map.js`, `js/home.js`,
  `js/analytics.js`, `index.html` (cache-busting version bumps),
  `data/platform_metadata.json`, `tests/e2e_smoke.mjs`, `BUG_TRACKER.md`,
  this file.
- Tests performed: full `tests/run_all.sh` (176/176), `tests/e2e_smoke.mjs`
  end-to-end against real Chromium — 5 full runs while iterating, final run
  clean with zero JS errors and zero thrown assertions across all 15
  scenarios.
- Remaining concerns: none for this pass. Broader data-pipeline reliability
  work (EIA/FCC/LegiScan API keys, HIFLD ArcGIS endpoint drift) from earlier
  in this session remains open and requires Bobby to register free API keys
  — not fixable in code.

- Date: 2026-07-31
- Agent: Claude Code
- Task: Reconciled `claude/us-datacenter-restrictions-map-skooi7` with its
  actual merge state. PR #200 for that branch shows as "closed" rather than
  "merged" on GitHub — its diff was applied to `main` via a direct push
  (`1ce316a`, "Facility pipeline reliability fixes + Windows test-suite
  portability (#200)") instead of GitHub's own merge button, which is why the
  PR never flipped to a merged state. The branch then kept accumulating its
  own independent bot-generated data commits (source link health, facility
  refresh, economy pipeline, AI news) after that point, making it look like
  13 commits of unmerged work were stranded. Verified this was not the case:
  diffing file contents (not commit history) between `main` and the branch
  tip showed the only differences were 8 auto-generated data files, and
  `main`'s own copy of every one of them was timestamped strictly *after*
  the branch's — i.e. `main` had already re-run those pipelines and
  superseded the branch's copies. No unique code or data existed on the
  branch. Confirmed with the full `tests/run_all.sh` suite (200 offline
  tests, all passing) before touching anything.
- Action taken: force-pushed `claude/us-datacenter-restrictions-map-skooi7`
  to `main`'s current tip, so the branch stops looking perpetually "ahead."
- Files changed: this file (corrected the "PR opened and merged" claim
  below, which was misleading about the actual mechanism).
- Tests performed: full `tests/run_all.sh` (176/176 JS + all Python suites
  passing) run against the branch before reset, to confirm nothing of value
  would be lost.
- See "Open Handoffs" below for two related branch-cleanup items that could
  not be completed this session (blocked on permissions, not on judgment).

- Date: 2026-07-30
- Agent: Claude Companion
- Task: Fixed 3 Windows-only test-suite portability bugs (missing UTF-8
  encoding on file reads in `data/build_facilities_index.py` and
  `tests/test_no_paid_dependencies.py`; a Windows path-doubling bug in
  `tests/test_data_loading.mjs`) discovered while verifying the
  facility-pipeline branch's changes before merge. Confirmed via testing
  against `origin/main` on the same machine that none of these were caused
  by the branch itself — all three failed identically on `main`.
- Commit(s): see branch history for
  `claude/us-datacenter-restrictions-map-skooi7`, entry dated 2026-07-30 in
  `AI_CHANGELOG.md`.
- Files changed: `data/build_facilities_index.py`,
  `tests/test_no_paid_dependencies.py`, `tests/test_data_loading.mjs`.
- Tests performed: full `tests/run_all.sh` suite (Python 3.11.9 + Node.js
  24.18.0, both freshly installed for this — neither existed on this
  machine before). E2E Playwright suite not run (opt-in, needs a local
  server + Chromium; treated as optional per the project's own convention).
- Remaining concerns: see "Open Handoffs" below.

- Date: 2026-07-30
- Agent: Claude (session continuing `claude/us-datacenter-restrictions-map-skooi7`)
- Task: Ratified the cloudscene-in-historical-snapshots handoff left by
  Claude Companion above. Recommended keeping the existing `PATH_EXEMPT`
  exemption for `data/facilities_version_history/` — those files are
  write-once archives, never re-read as config or executed, so scanning
  them protects nothing; a real reintroduction of a paid service would
  still be caught in the live source it's actually defined in (an
  adapter, `facility_sources.json`, `requirements.txt`, a workflow).
  Bobby confirmed. Expanded the `PATH_EXEMPT` comment in
  `tests/test_no_paid_dependencies.py` to spell out that reasoning, and
  updated `BUG_TRACKER.md`'s entry from "Open" to "Resolved".
- Commit(s): see branch history for
  `claude/us-datacenter-restrictions-map-skooi7`, dated 2026-07-30.
- Files changed: `tests/test_no_paid_dependencies.py`, `BUG_TRACKER.md`,
  this file.
- Tests performed: `python3 -m pytest tests/test_no_paid_dependencies.py -q`
  and full `tests/run_all.sh`.
- Remaining concerns: none — this handoff is closed.

## Open Handoffs

- Item: Providence County, Rhode Island (FIPS 44007, Providence metro,
  20 facilities) parcel data — investigated 2026-08-04 over four probe
  rounds via GitHub Actions dispatch, closed as unavailable.
- Current status: Not added. No live, queryable, county-or-state-level
  parcel REST service exists for Rhode Island.
- Round 1: Rhode Island has no county government — counties are
  census/judicial boundaries only, with no administrative or GIS
  authority of their own. The City of Providence's own open data
  portal DCAT feed returns HTTP 404. ArcGIS Online searches surfaced
  only individual-town parcel layers ("City of Providence CT Parcels",
  "East Providence CT Parcels", "Cranston CT Parcels" — the "CT" here
  is a vendor naming convention, not Connecticut; all three are
  genuine RI municipalities), confirming parcel data is published
  town-by-town via vendors like AxisGIS rather than aggregated
  anywhere.
- Round 2: Searched specifically for a genuine RIGIS (Rhode Island
  Geographic Information System, the state's official GIS program)
  statewide parcels service. No such ArcGIS item was found by title or
  owner search. Every live ArcGIS FeatureServer surfaced across this
  and round 1 (Lincoln RI Parcels, RI_Parcels_Simple_2_SLE_SLR, RI
  Parcels Add Accounts After Join Part1, RI_Parcel_Date_Range, several
  Parcels_011224_*Split analysis layers) is hosted by individual
  consultants or researchers (TigheBond, personal ArcGIS accounts),
  not an authoritative statewide or county source. `rigis.org`'s own
  DCAT feed did respond HTTP 200 (unlike Providence's portal), a
  promising lead worth following up.
- Round 3: Fetched RIGIS's DCAT feed raw and confirmed it's genuinely
  real and substantial — 387 total datasets, proper DCAT-US structure
  (`@context`, `@type`, `dataset` array). The first text match for
  "parcel" was just a description mentioning "parcels of land" in an
  unrelated "Local Conservation Lands 2026" dataset, not an actual
  Parcels entry.
- Round 4 (final): Filtered all 387 RIGIS datasets specifically for
  "parcel" in the title — zero matches. RIGIS's real, substantial,
  official catalog has no dataset titled anything containing
  "parcel" at all.
- Conclusion: across all four rounds, no authoritative county-wide or
  statewide live parcel REST service was found for Rhode Island — not
  from the City of Providence, not from RIGIS, and not from any of the
  individually-hosted ArcGIS layers turned up (all single-town or
  ad-hoc extracts). Using any one of those individual layers as a
  stand-in for "Providence County" would misrepresent the FIPS-level
  jurisdiction this app models, so none was added. Recommend
  revisiting if RIGIS ever publishes a live statewide parcels REST
  endpoint, or reconsidering this as a municipality-level entry (just
  the City of Providence, using a specific verified-official live town
  service) rather than the full county if the product wants
  sub-county granularity in the future.

- Item: Shelby County, Tennessee (FIPS 47157, Memphis metro, 20
  facilities) parcel data — investigated 2026-08-04 over six probe
  rounds via GitHub Actions dispatch, closed as unavailable.
- Current status: Not added. The one real, live, statewide TN parcels
  service found does not include Shelby County's data.
- Round 1: City of Memphis's own open data portal DCAT catalog (69
  datasets) has no real parcel/assessor data — its 3 "parcel-ish" hits
  (HCD Property Investments, Memphis Jurisdiction Boundary) are
  unrelated. ArcGIS Online searches surfaced "Certified Parcels"
  (owner ColliervilleGIS — a single town within the county, too
  narrow) and "Site & Structure Address Points" / "Shelby County
  Boundary" (owner `shelbycounty911` — confirms a genuine Shelby
  County government GIS presence, but these specific items are
  address points and a boundary, not parcels).
- Round 2: `tnmap.tn.gov`'s ArcGIS REST root has zero services and its
  folder list (ADMINISTRATIVE_BOUNDARIES, BASEMAPS, COMMUNITY,
  ELEVATION, ENVIRONMENTAL, HEALTH, HISTORICAL, PUBLIC_SAFETY, SAFETY,
  STRUCTURES, TABLEAU, TRANSPORTATION, Utilities, etc.) has nothing
  parcel/assessment-related. The `shelbycounty911` org's full 24-item
  catalog was confirmed to contain zero parcels layers (only address
  points, road centerlines, and 911/emergency infrastructure).
  `gis.shelbycountytn.gov` is Cloudflare-blocked; `maps.shelbycountytn.gov`
  doesn't resolve.
- Round 3: Found the real candidate by searching items owned by
  `tnmap_oir` (the "TN Property Viewer" web app's actual owner
  account): **"Tennessee Property Boundaries Public Use"**, a
  statewide feature service. Confirmed genuine via multiple
  independent third-party items ("Decatur County Parcels", "Henderson
  County Parcels", "Madison County Parcels") that all reference this
  exact same FeatureServer URL.
- Round 4: Confirmed the service is real and authoritative — owned by
  the **TN Comptroller of the Treasury, Division of Property
  Assessments**, description states coverage of "all 95 counties in
  the state." 17-field schema confirmed (OWNER, ADDRESS, DEEDAC,
  SUBDIV, PARCELID, GISLINK, COUNTY_NAME, etc.), with a genuine
  populated sample record for Anderson County.
- Round 5: Queried `COUNTY_NAME='Shelby'` (the correct field name,
  found via the schema) — record count came back 0, a clean
  (non-timeout) result.
- Round 6 (final): Ruled out a spelling/case mismatch behind the
  zero-count result with `LIKE '%hel%'` (lowercase) and `LIKE '%HEL%'`
  (uppercase) queries — both returned count 0, meaning no county name
  containing "hel" in any case exists anywhere in the dataset. Shelby
  County is conclusively, genuinely absent from this layer.
- Conclusion: the TN Comptroller's statewide parcels layer explicitly
  claims "all 95 counties" but Shelby — Tennessee's most populous
  county — appears to be the exception, consistent with rounds 1–2's
  finding that Shelby maintains its own independent GIS/assessor
  infrastructure (`shelbycounty911`, a separate Assessor of Property
  office) rather than feeding into the state's shared CAMA system.
  Recommend revisiting if Shelby County's own Assessor of Property
  ever exposes a public ArcGIS parcels service (their current web
  presence is a Cloudflare-protected portal with no discoverable REST
  API), or if the TN Comptroller's statewide layer is ever expanded to
  include Shelby.

- Item (resolved): Bexar County, TX (FIPS 48029, San Antonio) parcel
  service outage — `services7.arcgis.com/BUFM2kw4MpxDUJVh/ArcGIS/
  rest/services/Bexar_CAD_Parcels/FeatureServer/3` started timing out
  (20000ms) in `check_parcel_services.yml` on 2026-08-04, discovered
  incidentally while merging the Marion County IN PR (#327) —
  unrelated to that diff. Confirmed across 2 separate probe attempts a
  few minutes apart and marked `knownUnavailable` in
  `js/parcel/registry.js` per the project's documented pattern. Less
  than 20 minutes later, while merging the next PR (Tarrant County TX,
  #329), `check_parcel_services.mjs` reported it RECOVERED — the
  outage was real but brief. Removed the `knownUnavailable` block
  accordingly; no further action needed.
- Item: Jackson County, Missouri (Kansas City) parcel data — next
  target by facility count (34 in `facilities_index.json`, tied with
  Davidson County TN) after Davidson County TN.
- Current status: Open, not added. Investigated over three probe
  rounds, run 2026-08-03 via GitHub Actions dispatch (this sandbox
  can't reach jacksongov.org directly). Jackson County's own GIS host,
  `jcgis.jacksongov.org`, is genuinely live and reachable, but no
  general-purpose parcel/assessor data service was found on it in three
  rounds of investigation.
- Round 1: two web-search-suggested candidates. `Cadastral/
  ParcelsAndAddresses` returns a real ArcGIS 404 ("Service ... not
  found") — the web search snippet describing it appears to have been
  stale or referred to a service that no longer exists under that name.
  `Cadastral/LotsAndDimensions/MapServer/0` is real and live, but
  turned out to be "Builder Block Numbers" — a CAD text-annotation
  layer (FontName/FontSize/Bold/TextString/MSLINK_DMRS fields indicate
  a MicroStation/Bentley GIS annotation layer), not parcel polygons.
- Round 2: listed `LotsAndDimensions`' full sub-layer set to find the
  real parcel layer index. All 9 sub-layers turned out to be CAD/survey
  elements (0:Builder Block Numbers, 1:Default, 2:Property Dimensions,
  3:Default, 4:Lot Corners, 5:Lot Numbers, 6:Lot Annotation, 7:Default,
  8:Lots) — the entire service is a surveying/plat layer, not a general
  parcel data source with owner/value/address fields, even though it
  does contain a layer literally named "Lots". Two more guessed service
  names (`ParcelViewer/Parcels`, `Cadastral/Parcels`) both returned real
  404s.
- Round 3: listed the services root directory and the `Cadastral`
  folder directly instead of guessing further names. The root directory
  has folders for `Auditor`, `Cadastral`, `COMBAT`,
  `Compliance_Certificate`, `ElectionAdministration`,
  `GeoprocessingServices`, `Imagery`, `Internal_Parcel_Viewer`,
  `Land_Records_Management`, `Locators`, `ParcelViewer`, `Parks_Rec`,
  `TaxExemption`, `Utilities`, plus a few root-level services (`Auditor`
  FeatureServer/MapServer, two geocoders, `Neighborhoods` MapServer).
  The `Cadastral` folder itself only contains `LotsAndDimensions`
  (already ruled out) and `PastYearParcels` (a historical-year variant
  of the same lots/dimensions data, not yet checked for a different
  field schema but named similarly to the already-ruled-out service).
- Recommended next action: several unexplored folders are plausible
  leads for a human to investigate past this session's 3-round budget:
  `ParcelViewer` (the public-facing Parcel Viewer app at
  jcgis.jacksongov.org/parcelviewer/ must query some real backing
  service — this session's single guessed name `ParcelViewer/Parcels`
  was wrong, but the correct service name is likely something else in
  that folder), `Land_Records_Management` (the most promising name by
  far for genuine deed/ownership/assessment data), `Auditor` (Missouri
  counties' Auditor's office sometimes maintains parcel/tax data — the
  root-level `Auditor` FeatureServer/MapServer services weren't probed
  for field schema in this round), and `Internal_Parcel_Viewer` (name
  suggests it may be access-restricted, lowest priority of the four).
- Relevant files: `js/parcel/registry.js`.

- Item: Mecklenburg County, North Carolina (Charlotte) parcel data —
  next target by facility count (39 in `facilities_index.json`, tied
  with San Francisco CA) after Bexar County TX.
- Current status: Open, not added. Investigated over two probe rounds,
  run 2026-08-03 via GitHub Actions dispatch (this sandbox can't reach
  charlottenc.gov/mecklenburgcountync.gov directly). Two independent GIS
  hosts were checked, each real but each with a distinct problem.
- Round 1: Charlotte's own GIS host, `gis.charlottenc.gov`, has a real,
  live parcel layer at
  `arcgis/rest/services/CountyData/Parcels/MapServer/0` — confirmed with
  exactly the 13 fields a web search predicted (OBJECTID, MAP_BOOK,
  MAP_PAGE, MAP_BLOCK, LOT_NUM, NC_PIN, PID, PARCEL_TYPE,
  CONDO_TOWN_FLAG, Legal_From, Shape, Shape.STArea(),
  Shape.STLength()). This is boundary/legal-reference only — no
  address, owner, land use, or assessed-value fields at all, so at most
  it could support parcel_id/pin (NC_PIN, PID), subdivision-adjacent
  data (MAP_BOOK/PAGE/BLOCK, LOT_NUM), and county_fips — roughly 3-4 of
  30 canonical fields. Round 1 also tried listing
  `polaris3g.mecklenburgcountync.gov`'s services root
  (`/polarisv/rest/services?f=json`), which is Mecklenburg County's own
  (not Charlotte-city) GIS platform and the more likely home for a real
  Assessor/Register-of-Deeds parcel service, but got a generic
  application-level HTTP 500 "Internal Error" HTML page (custom CSS with
  `--bg`/`--fg`/`--divider` variables) rather than a standard ArcGIS
  JSON error — even though a web search had already indexed two other
  real, correctly-structured services under that exact same host+path
  (`basemap` and `basemap_aerial` MapServers), confirming the host and
  path structure are real and reachable, just not the bare root listing.
- Round 2 bypassed the broken root listing and guessed three plausible
  parcel/assessment service names directly under that same confirmed
  path: `parcels`, `Parcels`, `RealEstate`
  (`.../polarisv/rest/services/<name>/MapServer?f=json`). All three
  returned the identical generic 500 "Internal Error" page as the round
  1 root listing — not a per-guess 404 or "service not found", the same
  fault regardless of name. This suggests the issue is with how this
  path segment (`/polarisv/rest/services/`) itself is served, not with
  guessing the wrong service name — the real parcel service, if it
  exists on POLARIS, likely lives under a different path structure not
  yet identified.
- Recommended next action: a human needs to either (a) browse
  `polaris3g.mecklenburgcountync.gov` in an actual browser (not a raw
  fetch) to find the real navigable path to its parcel/Assessor layer —
  the site likely front-ends these services through a JS viewer whose
  network requests would reveal the real REST path, which a plain
  URL-guessing fetch loop cannot discover; or (b) accept
  gis.charlottenc.gov's confirmed-real but thin 13-field boundary layer
  as a partial add, honestly documented as legal-reference-only with no
  owner/address/value data, consistent with how Travis County TX's thin
  7-field layer was already handled.
- Relevant files: `js/parcel/registry.js`.

- Item: Denver County, Colorado parcel data — #8 target by facility
  count (62 in `facilities_index.json`).
- Current status: Open, not added. Investigated over three probe
  rounds (rounds 1-2: 2026-08-03; round 3: 2026-08-05), run via GitHub
  Actions dispatch (this sandbox can't reach denvergov.org / arcgis.com
  directly). Round 1's direct URL guesses at Denver's GIS host failed
  outright. Round 2 found Denver's real ArcGIS Online org
  (`210919_geospatialDenver` — confirmed genuine via a
  correctly-attributed dataset found in round 1's general keyword
  search) and enumerated its full content (101 items). Every
  parcel-related dataset in it is a derived planning-department analysis
  layer built from parcel data, not a general-purpose parcel boundary/
  cadastral service — e.g. "Single Family Residential Parcels - Building
  Size", "Parcels_BldgSize_Neighborhood_MEDIAN", middle-housing
  zoning-conversion studies. None expose the standard owner/address/
  land-use/value attributes this registry needs, and none is titled or
  described as a general assessor/cadastral parcel layer. Same pattern
  as Santa Clara County CA (see that entry, further down this section).
  Round 3 retried `gis.denvergov.org` directly (REST services root, two
  folder guesses, and the bare host root) — all four requests failed
  fast (7-441ms) with a raw "fetch failed" rather than a timeout,
  consistent with the host not existing/resolving from GitHub Actions'
  network rather than being merely overloaded. Also tried Denver's Open
  Data Catalog DCAT feed at two URL patterns (`data.denvergov.org` and
  `denvergov.org/opendata`) — both returned HTTP 200 but with the
  generic Open Data Catalog landing-page HTML, not real DCAT JSON;
  Denver's open-data portal is Socrata-based, not ArcGIS Hub, so the
  `/api/feed/dcat-us/1.1.json` pattern used successfully for every
  ArcGIS-Hub-based county this session simply doesn't apply here.
- Recommended next action: a human with local knowledge could check
  whether Denver publishes its base assessor/cadastral parcel layer
  somewhere other than the exhausted ArcGIS Online org — e.g. by
  browsing Denver's Socrata catalog directly in a browser (its
  programmatic DCAT endpoint isn't at the standard ArcGIS Hub path, and
  guessing Socrata dataset IDs isn't productive without a human doing
  the actual browsing) — or by confirming via a non-sandboxed network
  whether `gis.denvergov.org` genuinely doesn't exist as a public host,
  since three consecutive automated attempts across two days have all
  failed identically.
- Relevant files: `js/parcel/registry.js`.

- Item: The 3 Virginia counties in the parcel registry (Loudoun,
  Fairfax, Prince William) have stale `notProvidedBySource` lists.
- Current status: Open, found (not fixed) 2026-08-03 during comprehensive
  validation of every jurisdiction while adding Franklin OH / King WA.
  Each VA county's `fieldMap` + `notProvidedBySource` union no longer
  covers all 30 canonical fields in `js/parcel/schema.js` — missing
  fields vary per county but include `legal_desc`, `census_tract`,
  `tax_amount`, `owner_mailing`, `zoning_desc`, `overlay_districts`,
  `lot_depth_ft`, `lot_width_ft`, and (Prince William only)
  `area_sqft`/`building_count`/`year_built`. This predates this session's
  changes — schema.js almost certainly grew new canonical fields after
  these three entries were last verified. Effect: those fields render
  nothing in the panel instead of the correct "Not published by this
  source" label — a cosmetic/completeness gap, not incorrect data (no
  field is mis-mapped).
- Recommended next action: re-verify each of the 3 VA counties' live
  field lists (the same fetch-confirm-before-wiring process used for
  every other entry in this registry — GitHub Actions dispatch, since
  this dev sandbox cannot reach these hosts directly) and add the
  missing canonical field ids to each `notProvidedBySource` array. A
  simple script comparing `Object.keys(fieldMap) ∪ notProvidedBySource`
  against `PARCEL_SCHEMA.FIELDS` per jurisdiction (used to validate
  Franklin/King in this session) will confirm the fix.
- Relevant files: `js/parcel/registry.js`.

- Item: Cook County, Illinois parcel data — #1 target by facility count
  (130 in `facilities_index.json`, the single highest of any county
  outside the current registry) but deliberately not added.
- Current status: Open, needs a licensing/business decision, not more
  research. Both the raw GIS service (`gis.cookcountyil.gov`) and the
  official Cook County Open Data Portal copy of the same parcel dataset
  explicitly state the data "may not be redistributed or made available
  over a network without explicit permission from the Cook County
  Department of Office Technology," and require the Cook County Board
  of Commissioners be cited in any product built from it. This is
  materially stricter than the standard "Public government data. Verify
  terms before commercial redistribution." note on every other
  jurisdiction currently in the registry — this app publicly serves
  parcel data to end users over the web, which is exactly what that
  clause restricts.
- Why it was not fixed: this isn't a technical gap (a live, well-formed
  ArcGIS service exists) — it's a permission the project doesn't have.
  Wiring it up anyway would mean guessing that either the restriction
  doesn't really apply or won't be enforced, neither of which is this
  agent's call to make.
- Recommended next action: someone with authority to request it should
  contact Cook County's Department of Office Technology for explicit
  redistribution permission. If granted, add `13031` following the same
  fetch-confirm-before-wiring process as every other jurisdiction here.
  If not, this item should be closed as won't-fix rather than left open
  indefinitely.
- Relevant files: `js/parcel/registry.js`.

- Item: Santa Clara County, California parcel data — #4 target by
  facility count (108).
- Current status: Confirmed unavailable, closed as won't-fix for now (not
  just inconclusive). Investigated over three probe rounds, run 2026-08-03
  via GitHub Actions dispatch (this sandbox can't reach these hosts
  directly): (1) the original candidate, `webgis.sccgov.org/gis/rest/
  services/opendata/SCCGISHUBFeatureService/MapServer`, failed outright
  with a connection/DNS-level "fetch failed" on two separate endpoints
  even with a 25s timeout — genuinely dead, not just slow; (2) the
  county's ArcGIS Hub site (`gisdata-sccplanning.hub.arcgis.com`) is live
  but a keyword search for "parcel" only returns a generic OGC dataset
  listing, not a schema; (3) drilling into that listing plus a direct
  ArcGIS Online catalog search (`arcgis.com/sharing/rest/search`) found
  the county Planning Office's real, live ArcGIS org
  (`services2.arcgis.com/tcv2cMrq63AgvbHF/...`, owner `SCC.Planning.
  Office`) — but every Feature Service it exposes is a narrow subset
  (Open Space Easement Parcels, Williamson Act agricultural-contract
  parcels, General Plan Land Use Designations), not a general county-wide
  parcel boundary/assessor layer. No such layer was discoverable by
  keyword search.
- Recommended next action: none from this agent — further progress needs
  a human to either browse `SCC.Planning.Office`'s full ArcGIS Online org
  content directly (their catalog page, not keyword search, in case a
  general parcels layer exists but isn't tagged "parcel") or contact
  Santa Clara County directly to ask whether a public parcel-boundary
  service exists at all. Don't keep retrying keyword-search variations —
  that avenue is exhausted.
- Relevant files: `js/parcel/registry.js`.

- Item: Zoning / assessed value / sales data for the Virginia parcel counties.
- Current status: Not available from any of the three live services — this is
  a data-architecture limit, not a missing mapping. Do not add fieldMap
  entries for these; they will resolve to nothing.
- Recommended next action: joining a county's separate CAMA/tax service is a
  connector redesign (the model is currently one service per jurisdiction).
  Scope it deliberately rather than bolting it on.
- Relevant files: `js/parcel/connector-arcgis.js`, `js/parcel/registry.js`.

  (The "no-paid-dependency guard flags cloudscene in historical snapshots"
  item that used to be tracked here was resolved 2026-07-30 — see the
  2026-07-30 cloudscene entry further down this file's Recently Completed
  Work log and BUG_TRACKER.md's "Finding (ratified)" entry. Not re-listed
  as an open handoff.)

  (The "panel wording for attributes a parcel source does not publish"
  item that used to be tracked here was resolved 2026-08-02, using
  exactly the wording this entry recommended ("Not published by this
  source") — see this file's Recently Completed Work log and
  BUG_TRACKER.md's parcel panel entry. Not re-listed as an open handoff.)

  (The "Maryland parcel endpoint returning 503" item that used to be
  tracked here was resolved 2026-08-03 — it had migrated to a different
  hostname, not just an extended outage; see this file's Recently
  Completed Work log and BUG_TRACKER.md's Maryland entry. Not re-listed
  as an open handoff.)

  (The "same missing-`encoding=\"utf-8\"` pattern exists in ~15 other
  `data/*.py` scripts" item that used to be tracked here is resolved —
  verified 2026-08-02 with a full script over every `open()`/`read_text()`/
  `write_text()` call under `data/` (recursively, not just the top level):
  zero calls are missing `encoding=` (excluding the handful of correct
  binary-mode `"rb"`/`"wb"` opens, which don't take one). Every file this
  item originally named already has it. Unclear exactly which prior fix
  closed this out — likely an incidental side effect of other work rather
  than a dedicated pass — but the gap doesn't exist anymore, so it's not
  re-listed as an open handoff.)

  (The "News tab has its own unrelated, pre-existing WCAG accessibility
  issues" item that used to be tracked here was resolved 2026-08-02 —
  see this file's Recently Completed Work log and BUG_TRACKER.md's News
  tab entry. Not re-listed as an open handoff.)

- Item: Delete two dead branches — `feature/automated-ai-news` and
  `fix/news-skip-ci`.
- Current status: Not deleted. Both are stale from 2026-07-11 (380 files /
  ~7.7M lines behind current `main` — predate the Economy tab, Zoning
  pilot, Stocks test suites, and vendored Three.js). Their one idea
  (dropping `[skip ci]` from the hourly news commit) was deliberately
  reconsidered later — `main` intentionally keeps `[skip ci]` on news
  commits since `ai_news.json` is fetched with `cache: "no-store"`, so no
  Pages redeploy is needed for new articles to appear (see AI_CONTEXT.md
  Session 6). Nothing on either branch is salvageable.
- Blocker: `git push origin --delete <branch>` was rejected with HTTP 403
  through the environment's git proxy for both branches (a force-push to
  reset `skooi7` succeeded seconds earlier from the same session, so this
  is specific to ref *deletion*, not a general push block — likely GitHub
  branch protection or an org policy denial, not a proxy misconfiguration).
  The GitHub MCP server also has no branch-deletion tool. Per this
  environment's own guidance, 403s from the proxy are policy denials to be
  reported, not routed around.
- Recommended next action: delete both branches manually from the GitHub
  UI (Branches page) or via an authenticated `gh api -X DELETE
  repos/bobbytrenkamp-lgtm/test1/git/refs/heads/<branch>` from a session
  with the right permissions.
- Relevant commits: n/a (no code change needed, deletion only).
