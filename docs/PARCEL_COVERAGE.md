# Parcel Coverage & Data Quality

**Generated file — do not edit by hand.**
Run `node data/parcel_pipeline/generate_coverage_metrics.mjs` to regenerate.

> These figures measure how many canonical fields each jurisdiction's configured sources are wired up to populate. They are an engineering signal, not a measure of data accuracy, freshness, or fitness for any real estate decision. A county can score 100 here while publishing values that are years stale.

## Coverage

| | |
|---|---|
| Production jurisdictions | 59 |
| Facility-bearing jurisdictions | 549 |
| Jurisdiction coverage | 10.7% |
| **Facility-weighted coverage** | **53.4%** |
| Known facilities | 4456 |
| Facilities in covered jurisdictions | 2047 |
| Facilities with no county FIPS (unattributable) | 625 |

Facility-weighted coverage is the number worth watching. Plain jurisdiction
coverage understates the product badly, because the counties that matter are
wildly unequal — Loudoun County VA alone holds more data centers than most states.

## Data depth

Share of covered jurisdictions with at least one field wired up in each category.
The facility-weighted column answers the more useful question: do the *busy*
counties have it?

| Category | Jurisdictions | Facility-weighted |
|---|---|---|
| area | 46 (78%) | 74.2% |
| identity | 59 (100%) | 100% |
| address | 38 (64.4%) | 58.7% |
| ownership | 36 (61%) | 64.6% |
| assessment | 40 (67.8%) | 69.1% |
| sales | 25 (42.4%) | 38.8% |
| zoning | 17 (28.8%) | 27.2% |
| building | 27 (45.8%) | 41.9% |
| legal | 33 (55.9%) | 55.3% |
| land_use | 47 (79.7%) | 76.7% |

## Quality distribution

| Tier | Count | Meaning |
|---|---|---|
| full-intelligence | 6 | Geometry, ownership, assessment, sales, and zoning all wired up. |
| rich | 33 | Geometry and identity plus ownership/address and valuation. |
| standard | 6 | Geometry plus several useful attribute categories. |
| basic | 6 | Geometry and identity plus limited attributes. |
| boundary-only | 8 | Essentially polygons and an identifier. |

Quality score: mean **47.7** / 105 (best 91.7, worst 10).

The score is a plain weighted sum with every weight visible in
`data/parcel_pipeline/coverage_rules.mjs`, and each component is reported
individually in the JSON. **The per-category coverage above is the more honest
number** — the score exists to make jurisdictions sortable, not to be quoted.

Weights: identity 10, area 5, address 10, ownership 10, assessment 15, sales 15, zoning 15, building 10, land_use 5, legal 5, provenance 5.
Polygon geometry is not scored: it is a precondition, not an achievement — a
parcel source without it is not a parcel source. The `area` category scores the
publisher's area *attribute*, which genuinely varies.

## Top next opportunities

Facility-bearing jurisdictions not yet in production, ranked by facility count.

| FIPS | Jurisdiction | Facilities | Status | Effort | Fields seen | Shared service |
|---|---|---|---|---|---|---|
| 17031 | Cook County, Illinois | 130 | investigated, blocked | high | 0 | no |
| 08031 | Denver County, Colorado | 62 | investigated, needs human review | high | 0 | no |
| 29095 | Jackson County, Missouri | 34 | catalogued, not yet promoted | high | 0 | no |
| 29510 | St. Louis city, Missouri | 15 | catalogued, not yet promoted | high | 0 | no |
| 05119 | Pulaski County | 14 | catalogued, not yet promoted | high | 0 | no |
| 09001 | Fairfield County | 14 | catalogued, not yet promoted | high | 0 | no |
| 35001 | Bernalillo County | 14 | catalogued, not yet promoted | high | 0 | no |
| 37063 | Durham County, North Carolina | 14 | catalogued, not yet promoted | high | 0 | no |
| 40109 | Oklahoma County | 14 | catalogued, not yet promoted | high | 0 | no |
| 40143 | Tulsa County | 14 | catalogued, not yet promoted | high | 0 | no |
| 06073 | San Diego County | 13 | catalogued, not yet promoted | high | 0 | no |
| 20091 | Johnson County | 13 | catalogued, not yet promoted | high | 0 | no |
| 28049 | Hinds County | 13 | catalogued, not yet promoted | high | 0 | no |
| 29189 | St. Louis County | 13 | catalogued, not yet promoted | high | 0 | no |
| 33011 | Hillsborough County | 13 | catalogued, not yet promoted | high | 0 | no |
| 08013 | Boulder County | 12 | catalogued, not yet promoted | high | 0 | no |
| 12095 | Orange County | 12 | catalogued, not yet promoted | high | 0 | no |
| 13097 | Douglas County | 12 | catalogued, not yet promoted | high | 0 | no |
| 23005 | Cumberland County | 12 | catalogued, not yet promoted | high | 0 | no |
| 50007 | Chittenden County | 12 | catalogued, not yet promoted | high | 0 | no |

## Covered jurisdictions

| FIPS | Jurisdiction | Facilities | Tier | Score |
|---|---|---|---|---|
| 51107 | Loudoun County, Virginia | 129 | boundary-only | 15 |
| 04013 | Maricopa County, Arizona | 123 | full-intelligence | 80 |
| 48113 | Dallas County, Texas | 118 | rich | 27.9 |
| 13121 | Fulton County, Georgia | 98 | rich | 45 |
| 39049 | Franklin County, Ohio | 82 | rich | 72.9 |
| 53033 | King County, Washington | 71 | rich | 62.9 |
| 06037 | Los Angeles County, California | 64 | rich | 44.6 |
| 27053 | Hennepin County, Minnesota | 63 | rich | 58.3 |
| 48201 | Harris County, Texas | 61 | rich | 46.7 |
| 36061 | New York County, New York | 52 | rich | 62.5 |
| 51059 | Fairfax County, Virginia | 46 | boundary-only | 12.5 |
| 48453 | Travis County, Texas | 45 | basic | 24.2 |
| 32003 | Clark County, Nevada | 43 | basic | 10 |
| 12086 | Miami-Dade County, Florida | 40 | rich | 70 |
| 06075 | San Francisco County, California | 39 | basic | 25 |
| 37119 | Mecklenburg County, North Carolina | 39 | boundary-only | 12.5 |
| 48029 | Bexar County, Texas | 39 | rich | 60 |
| 49035 | Salt Lake County, Utah | 37 | rich | 45 |
| 41067 | Washington County, Oregon | 36 | rich | 60.4 |
| 47037 | Davidson County, Tennessee | 34 | full-intelligence | 75.4 |
| 42101 | Philadelphia, Pennsylvania | 32 | standard | 30 |
| 06067 | Sacramento County, California | 30 | basic | 15 |
| 39035 | Cuyahoga County, Ohio | 29 | full-intelligence | 81.7 |
| 37183 | Wake County, North Carolina | 28 | rich | 76.3 |
| 12057 | Hillsborough County, Florida | 27 | rich | 70.4 |
| 19153 | Polk County, Iowa | 27 | boundary-only | 10 |
| 25025 | Suffolk County, Massachusetts | 27 | basic | 12.5 |
| 25017 | Middlesex County, Massachusetts | 26 | basic | 12.5 |
| 39061 | Hamilton County, Ohio | 25 | rich | 51.3 |
| 41051 | Multnomah County, Oregon | 25 | full-intelligence | 91.7 |
| 42003 | Allegheny County, Pennsylvania | 25 | boundary-only | 12.5 |
| 18097 | Marion County, Indiana | 24 | rich | 37.9 |
| 11001 | District of Columbia | 23 | boundary-only | 12.5 |
| 26163 | Wayne County, Michigan | 23 | rich | 71.3 |
| 48439 | Tarrant County, Texas | 23 | rich | 65.4 |
| 12031 | Duval County, Florida | 22 | rich | 52.1 |
| 21111 | Jefferson County, Kentucky | 22 | boundary-only | 10 |
| 34023 | Middlesex County, New Jersey | 22 | rich | 61.3 |
| 16001 | Ada County, Idaho | 21 | rich | 42.5 |
| 34017 | Hudson County, New Jersey | 21 | rich | 64.6 |
| 48085 | Collin County, Texas | 21 | rich | 66.7 |
| 15003 | Honolulu County, Hawaii | 20 | boundary-only | 15 |
| 32031 | Washoe County, Nevada | 19 | full-intelligence | 85 |
| 56021 | Laramie County, Wyoming | 19 | rich | 39.2 |
| 10003 | New Castle County, Delaware | 18 | standard | 30 |
| 13089 | DeKalb County, Georgia | 18 | standard | 42.5 |
| 31055 | Douglas County, Nebraska | 18 | standard | 40 |
| 51683 | Manassas city, Virginia | 18 | full-intelligence | 70.4 |
| 06001 | Alameda County, California | 17 | rich | 44.6 |
| 01073 | Jefferson County, Alabama | 16 | rich | 37.9 |
| 17043 | DuPage County, Illinois | 16 | rich | 42.9 |
| 24510 | Baltimore city, Maryland | 16 | rich | 80.4 |
| 24031 | Montgomery County, Maryland | 14 | rich | 80.4 |
| 46099 | Minnehaha County | 14 | standard | 34.2 |
| 24033 | Prince George's County, Maryland | 12 | rich | 80.4 |
| 34013 | Essex County, New Jersey | 12 | rich | 64.6 |
| 51153 | Prince William County, Virginia | 9 | standard | 44.2 |
| 49049 | Utah County | 5 | rich | 45 |
| 24027 | Howard County, Maryland | 4 | rich | 80.4 |
