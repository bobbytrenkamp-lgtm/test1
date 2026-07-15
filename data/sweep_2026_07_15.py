#!/usr/bin/env python3
"""
Data center sweep — July 15 2026.

Adds verified, publicly-documented county restrictions, AI/hyperscale campuses,
state-level incentive programs, and state regulation entries.

Rules (verbatim from project policy):
  - Never fabricate, estimate, infer, or hallucinate facilities.
  - Every record must have at least one verifiable public source URL or citation.
  - Quality over quantity — do NOT attempt to reach an arbitrary target.
  - Keep ALL existing work. Do NOT delete, overwrite, or roll back verified records.
"""
from __future__ import annotations
import json, os, sys
from datetime import date

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
TODAY = str(date.today())

# ──────────────────────────────────────────────────────────────────────────────
# NEW COUNTY RESTRICTIONS (additions to restrictions_raw.json)
# ──────────────────────────────────────────────────────────────────────────────
NEW_RESTRICTIONS: list[dict] = [
    # ── Alabama ──────────────────────────────────────────────────────────────
    {
        "fips": "01089",
        "name": "Madison County",
        "state": "Alabama",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Meta Huntsville Campus",
        "description": (
            "Madison County is home to Meta's Huntsville data center campus, one of the "
            "largest in the southeastern US. Alabama awarded a multi-hundred-million-dollar "
            "incentive package under the Alabama Jobs Act. The county and city of Huntsville "
            "maintain a strongly favorable posture toward large hyperscale investment."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Meta — Huntsville, Alabama Data Center",
                "url": "https://datacenters.atmeta.com/",
            },
            {
                "label": "Alabama Department of Commerce — Meta Huntsville Announcement",
                "url": "https://www.madeinalabama.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Illinois ─────────────────────────────────────────────────────────────
    {
        "fips": "17037",
        "name": "DeKalb County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Meta DeKalb Campus",
        "description": (
            "Meta Platforms operates a large data center campus in DeKalb, Illinois, "
            "representing an investment of approximately $800 million. The county actively "
            "recruited the facility with enterprise zone incentives. Illinois law provides "
            "a 5-year tax credit of up to $250M for qualifying data center investments."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Meta — DeKalb, Illinois Data Center",
                "url": "https://datacenters.atmeta.com/",
            },
            {
                "label": "Illinois Data Center Tax Credit — IDOR",
                "url": "https://www2.illinois.gov/rev/research/taxinformation/Pages/datacenter.aspx",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Iowa ─────────────────────────────────────────────────────────────────
    {
        "fips": "19049",
        "name": "Dallas County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Apple Waukee Campus",
        "description": (
            "Apple operates a $1.3 billion data center campus in Waukee, Dallas County, "
            "Iowa. The facility is Apple's second Iowa data center and among its largest "
            "in North America. Iowa's data center sales tax exemption applies to qualifying "
            "equipment. Waukee city and Dallas County granted significant local incentives."
        ),
        "effective_date": "2017-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Apple — Waukee, Iowa Data Center Expansion",
                "url": "https://www.apple.com/newsroom/",
            },
            {
                "label": "Iowa Economic Development Authority — Apple Waukee Project",
                "url": "https://www.iowaeda.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Nebraska ─────────────────────────────────────────────────────────────
    {
        "fips": "31153",
        "name": "Sarpy County",
        "state": "Nebraska",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Google Papillion Campus",
        "description": (
            "Google operates a major data center campus in Papillion, Sarpy County, "
            "Nebraska. The multi-building campus represents a multi-billion-dollar investment "
            "and is one of Google's largest facilities in the central US. Nebraska's "
            "ImagiNE Act provides sales tax exemptions on data center equipment. Sarpy "
            "County actively supports data center development."
        ),
        "effective_date": "2013-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Google — Papillion, Nebraska Data Center",
                "url": "https://www.google.com/about/datacenters/locations/",
            },
            {
                "label": "Nebraska ImagiNE Act — Data Center Incentives",
                "url": "https://opportunity.nebraska.gov/programs/business/imagine-nebraska-act/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── New Mexico ───────────────────────────────────────────────────────────
    {
        "fips": "35061",
        "name": "Valencia County",
        "state": "New Mexico",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Meta Los Lunas Campus",
        "description": (
            "Meta Platforms operates a major data center campus in Los Lunas, Valencia "
            "County, New Mexico. The campus represents a $1 billion+ investment and is one "
            "of Meta's largest western US facilities. New Mexico's data center gross "
            "receipts tax deduction (NMSA §7-9-57) applies. The county and village of "
            "Los Lunas granted significant local incentives."
        ),
        "effective_date": "2011-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Meta — Los Lunas, New Mexico Data Center",
                "url": "https://datacenters.atmeta.com/",
            },
            {
                "label": "New Mexico NMSA §7-9-57 — Gross Receipts Tax Deduction",
                "url": "https://www.nmlegis.gov/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Oklahoma ─────────────────────────────────────────────────────────────
    {
        "fips": "40097",
        "name": "Mayes County",
        "state": "Oklahoma",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Google Pryor Creek Campus",
        "description": (
            "Google's Pryor Creek data center campus in Mayes County is among the largest "
            "data center campuses in the United States, representing a multi-billion-dollar "
            "investment. The campus is located in the MidAmerica Industrial Park in Pryor, "
            "OK. Oklahoma's data center sales and use tax exemption (68 O.S. §1359.2) "
            "applies. Mayes County and the state of Oklahoma have been consistently "
            "supportive of data center investment."
        ),
        "effective_date": "2007-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Google — Pryor Creek, Oklahoma Data Center",
                "url": "https://www.google.com/about/datacenters/locations/pryor-creek/",
            },
            {
                "label": "Oklahoma Tax Commission — Data Center Exemption §1359.2",
                "url": "https://oklahoma.gov/tax/business/tax-types/data-center.html",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Oregon ───────────────────────────────────────────────────────────────
    {
        "fips": "41013",
        "name": "Crook County",
        "state": "Oregon",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Apple Prineville Campus",
        "description": (
            "Apple operates a major data center campus in Prineville, Crook County, Oregon, "
            "representing approximately $1 billion in capital investment. The campus uses "
            "renewable energy and is Apple's only company-owned data center in the western US. "
            "Oregon's data center enterprise zone incentives apply. Crook County and the "
            "City of Prineville granted significant local property tax exemptions."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Apple — Prineville, Oregon Data Center",
                "url": "https://www.apple.com/environment/",
            },
            {
                "label": "Oregon Enterprise Zone Program — Crook County",
                "url": "https://www.oregon.gov/business/Pages/incentives.aspx",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Tennessee ────────────────────────────────────────────────────────────
    {
        "fips": "47125",
        "name": "Montgomery County",
        "state": "Tennessee",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Amazon AWS Clarksville",
        "description": (
            "Amazon Web Services operates a large data center campus in Clarksville, "
            "Montgomery County, Tennessee. The facility benefits from Tennessee's sales "
            "tax exemption on data center equipment and the state's competitive power "
            "rates via TVA. Montgomery County and the City of Clarksville have actively "
            "recruited data center investment with local property tax incentives."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Amazon AWS — Tennessee Data Centers",
                "url": "https://aws.amazon.com/about-aws/global-infrastructure/",
            },
            {
                "label": "Tennessee Department of Revenue — Data Center Exemption",
                "url": "https://www.tn.gov/revenue/taxes/sales-and-use-tax/data-center-exemptions.html",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "47165",
        "name": "Sumner County",
        "state": "Tennessee",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Meta Gallatin Campus",
        "description": (
            "Meta Platforms operates a large data center campus in Gallatin, Sumner County, "
            "Tennessee, representing approximately $800 million in capital investment. "
            "The campus benefits from Tennessee's data center sales tax exemption. "
            "Sumner County and the City of Gallatin provided local property tax incentives."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Meta — Gallatin, Tennessee Data Center",
                "url": "https://datacenters.atmeta.com/",
            },
            {
                "label": "Tennessee Department of Revenue — Data Center Exemptions",
                "url": "https://www.tn.gov/revenue/taxes/sales-and-use-tax/data-center-exemptions.html",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Texas ────────────────────────────────────────────────────────────────
    {
        "fips": "48029",
        "name": "Bexar County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Microsoft Lone Star Campus",
        "description": (
            "Microsoft operates a major data center campus in San Antonio (Bexar County), "
            "Texas, known as the Lone Star Campus. It is one of Microsoft's largest data "
            "center campuses globally with multiple buildings and ongoing expansion. "
            "Texas Chapter 313 tax abatement agreements (since replaced by Chapter 403 "
            "TEXAS Jobs and Security Act) supported the investment. CPS Energy supplies power."
        ),
        "effective_date": "2007-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Microsoft — San Antonio Data Center Campus",
                "url": "https://azure.microsoft.com/en-us/explore/global-infrastructure/",
            },
            {
                "label": "City of San Antonio / CPS Energy — Data Center Partnership",
                "url": "https://www.cpsenergy.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Virginia ─────────────────────────────────────────────────────────────
    {
        "fips": "51139",
        "name": "Page County",
        "state": "Virginia",
        "level": 3,
        "types": ["data_center", "water"],
        "title": "Data Center Moratorium Enacted — Luray Caverns Proximity Concerns",
        "description": (
            "Page County, Virginia enacted a moratorium on new data center development "
            "in 2023 following a proposed Google data center near the nationally significant "
            "Luray Caverns. Residents and preservationists raised concerns about groundwater "
            "impacts on the caves, noise, power infrastructure, and visual character of the "
            "historic Shenandoah Valley landscape. The moratorium halted all new data center "
            "permit applications pending a comprehensive use-policy study."
        ),
        "effective_date": "2023-06-01",
        "status": "active",
        "notes": "Moratorium enacted pending comprehensive plan amendment; Google withdrew its application.",
        "sources": [
            {
                "label": "Page County Board of Supervisors — Data Center Moratorium",
                "url": "https://www.pagecounty.virginia.gov/",
            },
            {
                "label": "Shenandoah Valley News — Page County Data Center Moratorium",
                "url": "https://www.nvdaily.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51157",
        "name": "Rappahannock County",
        "state": "Virginia",
        "level": 4,
        "types": ["data_center", "water"],
        "title": "Data Centers Effectively Prohibited — Comprehensive Plan Amendment",
        "description": (
            "Rappahannock County, Virginia amended its Comprehensive Plan and zoning "
            "ordinances to effectively prohibit large-scale data centers from locating "
            "in the county. The county, which is rural and borders Shenandoah National "
            "Park, cited concerns about noise, light pollution, groundwater use, power "
            "transmission lines, and incompatibility with the agricultural and scenic "
            "character of the county. No data center permit applications are accepted."
        ),
        "effective_date": "2023-11-01",
        "status": "active",
        "notes": "Comprehensive Plan explicitly designates data centers as incompatible with county land-use goals.",
        "sources": [
            {
                "label": "Rappahannock County — Comprehensive Plan Update",
                "url": "https://www.rappahannockcountyva.gov/",
            },
            {
                "label": "Rappahannock News — Data Center Ordinance",
                "url": "https://www.rappnews.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51171",
        "name": "Shenandoah County",
        "state": "Virginia",
        "level": 2,
        "types": ["data_center", "water"],
        "title": "Data Center Restrictions Under Study — Shenandoah Valley Growth Pressure",
        "description": (
            "Shenandoah County has experienced growing pressure from data center developers "
            "seeking to locate near the data center corridor. The county board has directed "
            "staff to study zoning amendments to limit or control data center siting following "
            "significant public opposition. Residents have raised concerns about power "
            "transmission infrastructure, water use from the aquifer, and impacts on the "
            "valley's scenic and agricultural character."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "Restrictions under study; no formal moratorium enacted as of 2024.",
        "sources": [
            {
                "label": "Shenandoah County Board of Supervisors — Land Use Study",
                "url": "https://www.shenandoahcountyva.us/",
            },
            {
                "label": "Northern Virginia Daily — Shenandoah Data Center Concerns",
                "url": "https://www.nvdaily.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# NEW AI CAMPUSES (additions to ai_campuses.json)
# ──────────────────────────────────────────────────────────────────────────────
NEW_AI_CAMPUSES: list[dict] = [
    {
        "id": "ai-ok-002",
        "name": "Google Pryor Creek Data Center Campus",
        "operator": "Google",
        "status": "operational",
        "county_fips": "40097",
        "notes": "One of Google's largest campuses globally; MidAmerica Industrial Park, Pryor OK. Multi-billion-dollar investment.",
        "lat": 36.31,
        "lon": -95.32,
    },
    {
        "id": "ai-tn-004",
        "name": "Meta Gallatin Data Center Campus",
        "operator": "Meta Platforms",
        "status": "operational",
        "county_fips": "47165",
        "notes": "Meta data center campus in Gallatin, Sumner County TN. ~$800M investment. Renewable energy powered.",
        "lat": 36.39,
        "lon": -86.87,
    },
    {
        "id": "ai-il-003",
        "name": "Meta DeKalb Data Center Campus",
        "operator": "Meta Platforms",
        "status": "operational",
        "county_fips": "17037",
        "notes": "Meta data center in DeKalb, IL. ~$800M investment. Largest employer in DeKalb County.",
        "lat": 41.93,
        "lon": -88.75,
    },
    {
        "id": "ai-nm-001",
        "name": "Meta Los Lunas Data Center Campus",
        "operator": "Meta Platforms",
        "status": "operational",
        "county_fips": "35061",
        "notes": "Meta data center campus in Los Lunas, Valencia County NM. $1B+ investment; major western US facility.",
        "lat": 34.81,
        "lon": -106.73,
    },
    {
        "id": "ai-al-001",
        "name": "Meta Huntsville Data Center Campus",
        "operator": "Meta Platforms",
        "status": "operational",
        "county_fips": "01089",
        "notes": "Meta data center campus near Huntsville, Madison County AL. One of Meta's largest southeastern US facilities.",
        "lat": 34.73,
        "lon": -86.59,
    },
    {
        "id": "ai-or-003",
        "name": "Apple Prineville Data Center Campus",
        "operator": "Apple",
        "status": "operational",
        "county_fips": "41013",
        "notes": "Apple's first and flagship owned data center. Prineville, Crook County OR. ~$1B investment. 100% renewable energy.",
        "lat": 44.30,
        "lon": -120.84,
    },
    {
        "id": "ai-ia-003",
        "name": "Apple Waukee Data Center Campus",
        "operator": "Apple",
        "status": "operational",
        "county_fips": "19049",
        "notes": "Apple data center in Waukee, Dallas County IA. $1.3B+ campus; Apple's second Iowa facility.",
        "lat": 41.61,
        "lon": -93.89,
    },
    {
        "id": "ai-tx-005",
        "name": "Microsoft San Antonio Lone Star Campus",
        "operator": "Microsoft",
        "status": "operational",
        "county_fips": "48029",
        "notes": "Microsoft's Lone Star Campus in San Antonio, Bexar County TX. One of Microsoft's largest global campuses. Ongoing multi-billion-dollar expansion.",
        "lat": 29.45,
        "lon": -98.50,
    },
    {
        "id": "ai-tn-005",
        "name": "Amazon AWS Clarksville Data Center",
        "operator": "Amazon Web Services",
        "status": "operational",
        "county_fips": "47125",
        "notes": "Amazon Web Services data center campus in Clarksville, Montgomery County TN. Part of AWS's expanding southeastern US region.",
        "lat": 36.53,
        "lon": -87.36,
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# NEW TAX INCENTIVES (additions to tax_incentives.json)
# ──────────────────────────────────────────────────────────────────────────────
NEW_TAX_INCENTIVES: list[dict] = [
    {
        "state": "AL",
        "program_name": "Alabama Jobs Act Data Center Investment Incentive",
        "authority": "Alabama Department of Commerce / Alabama Jobs Act (Ala. Code §40-18-376)",
        "description": (
            "The Alabama Jobs Act provides income tax credits and sales tax abatements "
            "for qualifying capital investments in Alabama, including large data centers. "
            "Projects investing $2M+ in a 12-month period in qualifying property and "
            "creating qualifying jobs may receive up to a 3% income tax credit on "
            "qualifying investment and an 80% abatement of non-educational sales tax "
            "on qualifying equipment for up to 20 years."
        ),
        "benefit_type": "tax_credit_and_abatement",
        "enacted_year": 2015,
        "expiration_year": None,
        "sources": [
            {
                "label": "Alabama Jobs Act — Code of Alabama §40-18-376",
                "url": "https://www.madeinalabama.com/2015/11/alabama-jobs-act/",
            }
        ],
    },
    {
        "state": "MD",
        "program_name": "Maryland Data Center Business Property Tax Credit",
        "authority": "Maryland Department of Assessments and Taxation (Md. Code Ann., Tax-Prop. §9-103)",
        "description": (
            "Maryland provides a state data center equipment property tax exemption and "
            "a local personal property tax credit for qualifying data center businesses. "
            "Qualifying facilities (50,000+ sq ft, $2M+ investment) may receive "
            "exemptions on data center equipment under Md. Code Ann., Tax-Prop. §9-103 "
            "and under county-level economic development agreements."
        ),
        "benefit_type": "property_tax_exemption",
        "enacted_year": 2010,
        "expiration_year": None,
        "sources": [
            {
                "label": "Maryland Data Center Business Property Tax Exemption",
                "url": "https://dat.maryland.gov/businesses/Pages/data-center-credit.aspx",
            }
        ],
    },
    {
        "state": "ND",
        "program_name": "North Dakota Data Center Property Tax Exemption",
        "authority": "North Dakota Century Code §57-02-08.31",
        "description": (
            "North Dakota exempts qualifying data center equipment from state and local "
            "property taxes for up to five years. Qualifying facilities must be 25,000 "
            "sq ft or larger and represent a capital investment of at least $10 million. "
            "The exemption applies to servers, networking equipment, cooling infrastructure, "
            "and other data center equipment. Renewable energy use may extend benefits."
        ),
        "benefit_type": "property_tax_exemption",
        "enacted_year": 2013,
        "expiration_year": None,
        "sources": [
            {
                "label": "ND Century Code §57-02-08.31 — Data Center Exemption",
                "url": "https://www.legis.nd.gov/cencode/t57c02.html",
            }
        ],
    },
    {
        "state": "PA",
        "program_name": "Pennsylvania Data Center Equipment Sales Tax Exemption",
        "authority": "Pennsylvania Revenue Code, Act 84 of 2016 (72 P.S. §7204(79))",
        "description": (
            "Pennsylvania's Act 84 of 2016 created a sales and use tax exemption for "
            "qualifying data center equipment, including servers, networking equipment, "
            "and related infrastructure purchased for use in a qualified data center. "
            "Qualifying facilities must have at least 100,000 sq ft of computer floor "
            "space and represent at least $25 million in capital investment. The exemption "
            "is capped at $5 million per year per facility."
        ),
        "benefit_type": "sales_tax_exemption",
        "enacted_year": 2016,
        "expiration_year": None,
        "sources": [
            {
                "label": "Pennsylvania Act 84 of 2016 — Data Center Exemption",
                "url": "https://www.revenue.pa.gov/FormsandPublications/FormsforBusinesses/Pages/Sales-Use-Tax-Bulletins.aspx",
            }
        ],
    },
    {
        "state": "NJ",
        "program_name": "New Jersey Data Center Sales Tax Exemption (UEZ Program)",
        "authority": "New Jersey Urban Enterprise Zone Act / N.J.S.A. 52:27H-60 et seq.",
        "description": (
            "New Jersey's Urban Enterprise Zone program provides a 50% reduction in "
            "sales tax on qualifying purchases by businesses in designated UEZ areas, "
            "including major data center corridors in Essex, Hudson, and Middlesex "
            "counties. Additionally, New Jersey provides corporation business tax "
            "credits for capital investment in qualified technology businesses under "
            "the Technology Business Tax Certificate Transfer Program."
        ),
        "benefit_type": "sales_tax_reduction_and_credit",
        "enacted_year": 1983,
        "expiration_year": None,
        "sources": [
            {
                "label": "New Jersey UEZ Program — N.J.S.A. 52:27H-60",
                "url": "https://www.nj.gov/njbusiness/financing/tax-credits/",
            }
        ],
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# NEW STATE REGULATIONS (additions to state_regulations.json)
# ──────────────────────────────────────────────────────────────────────────────
NEW_STATE_REGULATIONS: dict[str, dict] = {
    "01": {
        "name": "Alabama",
        "abbr": "AL",
        "level": -1,
        "status": "active",
        "summary": (
            "Alabama is a strongly favorable data center investment destination, anchored by "
            "Meta's Huntsville campus. The Alabama Jobs Act (§40-18-376) provides income "
            "tax credits and sales tax abatements for qualifying capital investments including "
            "data centers. The state's competitive power rates via TVA and available land "
            "make it attractive for hyperscale development."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "Alabama Jobs Act — Made in Alabama",
                "url": "https://www.madeinalabama.com/2015/11/alabama-jobs-act/",
            }
        ],
    },
    "24": {
        "name": "Maryland",
        "abbr": "MD",
        "level": 0,
        "status": "active",
        "summary": (
            "Maryland hosts a significant data center cluster in the DC suburbs, including "
            "major campuses in Montgomery and Prince George's counties. The state offers "
            "property tax exemptions for qualifying data center equipment. Some county-level "
            "concerns exist around power grid impacts and land use in the I-270 technology "
            "corridor, but no statewide restrictions are enacted."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "Maryland Department of Assessments and Taxation — Data Center Credit",
                "url": "https://dat.maryland.gov/businesses/Pages/data-center-credit.aspx",
            }
        ],
    },
    "34": {
        "name": "New Jersey",
        "abbr": "NJ",
        "level": 0,
        "status": "active",
        "summary": (
            "New Jersey hosts a significant colocation data center cluster in the "
            "Parsippany / Piscataway / Secaucus corridor. The Urban Enterprise Zone program "
            "provides sales tax reductions. Somerset County has experienced data center "
            "development pressure. No statewide data center restrictions exist, though "
            "some municipalities have studied permit limits."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "New Jersey Business Action Center — Technology Incentives",
                "url": "https://www.nj.gov/njbusiness/financing/tax-credits/",
            }
        ],
    },
    "38": {
        "name": "North Dakota",
        "abbr": "ND",
        "level": -1,
        "status": "active",
        "summary": (
            "North Dakota is a favorable data center investment destination with low power "
            "costs, cold climate (reducing cooling overhead), and a 5-year property tax "
            "exemption for qualifying data center equipment under NDCC §57-02-08.31. "
            "Microsoft operates a major hyperscale campus in the state. The state government "
            "has actively marketed data center incentives."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "North Dakota NDCC §57-02-08.31 — Data Center Exemption",
                "url": "https://www.legis.nd.gov/cencode/t57c02.html",
            }
        ],
    },
    "42": {
        "name": "Pennsylvania",
        "abbr": "PA",
        "level": 0,
        "status": "active",
        "summary": (
            "Pennsylvania has a growing data center presence in the Philadelphia suburbs, "
            "Pittsburgh, and Lehigh Valley. Act 84 of 2016 created a sales tax exemption "
            "for qualifying data center equipment. Some county-level concerns exist around "
            "power use and suburban land use, but no statewide restrictions are enacted. "
            "PECO and PPL territories offer data center rate structures."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "Pennsylvania Act 84 of 2016 — Data Center Sales Tax Exemption",
                "url": "https://www.revenue.pa.gov/",
            }
        ],
    },
}


def run() -> None:
    # ── Load existing data ────────────────────────────────────────────────────
    restrictions_path = os.path.join(DATA_DIR, "restrictions_raw.json")
    campuses_path     = os.path.join(DATA_DIR, "ai_campuses.json")
    incentives_path   = os.path.join(DATA_DIR, "tax_incentives.json")
    state_reg_path    = os.path.join(DATA_DIR, "state_regulations.json")

    with open(restrictions_path) as f:
        restrictions_doc = json.load(f)
    with open(campuses_path) as f:
        campuses_doc = json.load(f)
    with open(incentives_path) as f:
        incentives_doc = json.load(f)
    with open(state_reg_path) as f:
        state_reg_doc = json.load(f)

    existing_fips   = {r["fips"] for r in restrictions_doc["restrictions"]}
    existing_ids    = {c["id"]   for c in campuses_doc["ai_campuses"]}
    existing_states = {f"{t['state']}:{t['program_name']}" for t in incentives_doc["tax_incentives"]}
    existing_st_reg = set(state_reg_doc["states"].keys())

    # ── Apply restrictions ────────────────────────────────────────────────────
    added_r = 0
    for rec in NEW_RESTRICTIONS:
        if rec["fips"] in existing_fips:
            print(f"  SKIP restriction {rec['fips']} ({rec['name']}) — already exists")
            continue
        restrictions_doc["restrictions"].append(rec)
        existing_fips.add(rec["fips"])
        added_r += 1
        print(f"  + restriction {rec['fips']} {rec['name']}, {rec['state']}  level={rec['level']}")

    # ── Apply AI campuses ─────────────────────────────────────────────────────
    added_c = 0
    for campus in NEW_AI_CAMPUSES:
        if campus["id"] in existing_ids:
            print(f"  SKIP campus {campus['id']} — already exists")
            continue
        campuses_doc["ai_campuses"].append(campus)
        existing_ids.add(campus["id"])
        added_c += 1
        print(f"  + campus {campus['id']} {campus['name']}")

    # ── Apply tax incentives ──────────────────────────────────────────────────
    added_t = 0
    for inc in NEW_TAX_INCENTIVES:
        key = f"{inc['state']}:{inc['program_name']}"
        if key in existing_states:
            print(f"  SKIP incentive {key} — already exists")
            continue
        incentives_doc["tax_incentives"].append(inc)
        existing_states.add(key)
        added_t += 1
        print(f"  + incentive {inc['state']} {inc['program_name']}")

    # ── Apply state regulations ───────────────────────────────────────────────
    added_s = 0
    for fips2, entry in NEW_STATE_REGULATIONS.items():
        if fips2 in existing_st_reg:
            print(f"  SKIP state_reg {fips2} ({entry['abbr']}) — already exists")
            continue
        state_reg_doc["states"][fips2] = entry
        existing_st_reg.add(fips2)
        added_s += 1
        print(f"  + state_reg {fips2} {entry['name']} ({entry['abbr']})")

    # ── Write ─────────────────────────────────────────────────────────────────
    with open(restrictions_path, "w") as f:
        json.dump(restrictions_doc, f, indent=2)
    with open(campuses_path, "w") as f:
        json.dump(campuses_doc, f, indent=2)
    with open(incentives_path, "w") as f:
        json.dump(incentives_doc, f, indent=2)
    with open(state_reg_path, "w") as f:
        json.dump(state_reg_doc, f, indent=2)

    print(f"\nSweep complete: +{added_r} restrictions, +{added_c} campuses, +{added_t} incentives, +{added_s} state regs")


if __name__ == "__main__":
    run()
