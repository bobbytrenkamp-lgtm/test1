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
  jurisdictions. The next candidates below Bexar TX (39) in the
  facility-count priority list — San Francisco CA (39), Mecklenburg
  County NC/Charlotte (39), Salt Lake County UT (37), Multnomah County
  OR/Portland (36), Davidson County TN/Nashville (34), Jackson County
  MO/Kansas City (34), Philadelphia PA (32), Sacramento County CA (30),
  Cuyahoga County OH/Cleveland (29), Wake County NC/Raleigh (28), Polk
  County IA/Des Moines (27) — have not yet been investigated.

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

- Item: Clark County, Nevada (Las Vegas) parcel data — next target by
  facility count (43 in `facilities_index.json`) after Travis County TX.
- Current status: Open, not added. Investigated over three probe
  rounds, run 2026-08-03 via GitHub Actions dispatch (this sandbox
  can't reach clarkcountynv.gov directly). Unlike Santa Clara/Denver,
  this is NOT a dead-GIS-host case: `maps.clarkcountynv.gov` is
  genuinely live with a real Assessor folder listing 25+ services
  (round 1). Two named candidates were checked in detail and both ruled
  out on their actual structure/schema, not guesswork:
  `Assessor_Base_Map` (round 2) is a `singleFusedMapCache` cached tile
  basemap with an empty sub-layers list — no queryable attributes exist
  on it at all. `BOE_Parcels` (rounds 2-3) is real and queryable, but
  its one sub-layer is `esriGeometryPoint` geometry (not polygon) with
  only 8 sparse fields (OBJECTID, parcel, prim_parcel, id, parent_id,
  form, status, descr) — no address/owner/value/legal-description.
  "BOE" is Board of Equalization; this is an appeal-case point index,
  not parcel boundary data.
- Recommended next action: the Assessor folder lists ~20 more untried
  services worth a human's direct look — `Assessor/added_current`,
  `Assessor/AOSubdivisions`, `Assessor/CommonArea`, `Assessor/LandApp`,
  `Assessor/ParcelHistory`, `Assessor/ParcelDrafter`,
  `Assessor/clarktrs_qq_p`, and yearly `Added_20XX`/`Cancelled_20XX`
  series — full listing:
  `https://maps.clarkcountynv.gov/arcgis/rest/services/Assessor?f=json`.
  Given how rich this GIS host is, the general-purpose parcel boundary
  layer almost certainly exists somewhere in that folder; it just wasn't
  either of the two most plausibly-named candidates tried here.
  `gisgate.co.clark.nv.us` (an alternate/older host mentioned by search
  results) failed at the connection level on both attempts in round 1 —
  likely retired, not worth retrying.
- Relevant files: `js/parcel/registry.js`.

- Item: Denver County, Colorado parcel data — #8 target by facility
  count (62 in `facilities_index.json`).
- Current status: Open, not added. Investigated over two probe rounds,
  run 2026-08-03 via GitHub Actions dispatch (this sandbox can't reach
  denvergov.org / arcgis.com directly). Round 1's direct URL guesses at
  Denver's GIS host failed outright. Round 2 found Denver's real ArcGIS
  Online org (`210919_geospatialDenver` — confirmed genuine via a
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
- Recommended next action: a human with local knowledge could check
  whether Denver publishes its base assessor/cadastral parcel layer
  somewhere other than this ArcGIS Online org — e.g. a self-hosted GIS
  server at gis.denvergov.org that this sandbox couldn't reach at all in
  round 1 (that attempt returned a raw fetch failure, not a 404, so it's
  unconfirmed whether that host exists and is just unreachable from
  GitHub Actions' network, or is genuinely down) — or via Denver's Open
  Data Catalog (a human-browsable data.denvergov.org page rather than a
  programmatic search) rather than more `owner:` searches, which have
  now enumerated this org's full content with no hit.
- Relevant files: `js/parcel/registry.js`.

- Item: Hennepin County, Minnesota parcel data — #7 target by facility
  count (63 in `facilities_index.json`).
- Current status: Open, not added. Investigated over two probe rounds,
  run 2026-08-03 via GitHub Actions dispatch (this sandbox can't reach
  these hosts directly). Hennepin County has no county-specific public
  GIS parcel service discoverable (round 1: direct URL guesses at
  gis.hennepin.us all 404'd). Round 2 found the real thing via ArcGIS
  Online catalog search: the Metropolitan Council (Metro GIS) publishes a
  "Metropolitan 7-County Parcel Polygons" dataset covering the whole
  Twin Cities metro, including Hennepin — real, catalog-confirmed URLs at
  `arcgis.metc.state.mn.us/data1/rest/services/parcels/...` (both the
  unversioned "Parcels" layer and the "Parcels_Aggregate" layer). All
  three candidate REST endpoints returned `HTTP 500 "Application Error"`
  from the ArcGIS Web Adaptor itself — a server-side fault, not a 404 or
  wrong-URL guess like every other dead-end found so far this session.
- Recommended next action: retry the same three URLs (see
  `data/diagnose_hennepin.mjs` in the commit history — deleted from the
  working tree but recoverable via git log — for the exact endpoints)
  after some time has passed, in case this was a transient outage on the
  Metropolitan Council's server. If it's still erroring, also worth
  checking `gisdata.mn.gov/dataset/us-mn-state-metc-plan-parcels-open`
  (the MN Geospatial Commons page for this dataset, confirmed reachable
  with HTTP 200) for an alternate/updated resource link, since dataset
  landing pages sometimes point to a different active endpoint than what
  a catalog search indexes. If this dataset covers all 7 metro counties,
  note it would also be the natural source for any future Twin Cities
  counties added to this registry (e.g. Ramsey, Dakota, Anoka).
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
