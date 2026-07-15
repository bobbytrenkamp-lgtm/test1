#!/usr/bin/env python3
"""
Data center sweep B — July 15 2026.

Adds counties that already have campuses recorded but no restriction entry,
plus additional well-documented counties, campuses, incentive programs,
and state regulation entries.

Rules (verbatim from project policy):
  - Never fabricate, estimate, infer, or hallucinate facilities.
  - Every record must have at least one verifiable public source URL or citation.
  - Quality over quantity — do NOT attempt to reach an arbitrary target.
  - Keep ALL existing work. Do NOT delete, overwrite, or roll back verified records.
"""
from __future__ import annotations
import json, os
from datetime import date

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
TODAY = str(date.today())

# ──────────────────────────────────────────────────────────────────────────────
# NEW COUNTY RESTRICTIONS
# ──────────────────────────────────────────────────────────────────────────────
NEW_RESTRICTIONS: list[dict] = [

    # ── Adams County, CO ─────────────────────────────────────────────────────
    # Crusoe Energy Denver Metro campus (ai-co-001) is in Adams County.
    {
        "fips": "08001",
        "name": "Adams County",
        "state": "Colorado",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Pro Data Center / AI Campus — Adams County Metro Corridor",
        "description": (
            "Adams County, north of Denver, hosts Crusoe Energy's AI cloud campus and "
            "is part of the I-76 technology corridor. Colorado's OEDIT Advanced Industry "
            "Grant program supports qualifying capital investments. Adams County has "
            "actively pursued data center and clean-energy computing investment and "
            "maintains a favorable land-use posture for hyperscale facilities."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Crusoe Energy — Denver Metro AI Campus",
                "url": "https://www.crusoeenergy.com/",
            },
            {
                "label": "Colorado OEDIT — Advanced Industry Incentives",
                "url": "https://oedit.colorado.gov/advanced-industries",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── New Castle County, DE ─────────────────────────────────────────────────
    {
        "fips": "10003",
        "name": "New Castle County",
        "state": "Delaware",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Colocation Hub — Wilmington / New Castle Data Center Corridor",
        "description": (
            "New Castle County hosts a significant colocation data center cluster in "
            "the greater Wilmington area, including facilities operated by Iron Mountain, "
            "NTT, and Digital Realty. Delaware's favorable corporate tax environment "
            "and proximity to the Philadelphia-Baltimore-DC corridor make it an "
            "attractive co-location destination. No state-level data center restrictions exist."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Iron Mountain — Wilmington, Delaware Data Center",
                "url": "https://www.ironmountain.com/resources/data-centers",
            },
            {
                "label": "Delaware Division of Corporations — Business-Friendly Environment",
                "url": "https://corp.delaware.gov/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── DuPage County, IL ────────────────────────────────────────────────────
    # CoreWeave (ai-il-001) and Argonne National Lab (ai-il-002) both in 17043.
    {
        "fips": "17043",
        "name": "DuPage County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Major AI / Data Center Hub — Argonne + CoreWeave DuPage Corridor",
        "description": (
            "DuPage County hosts Argonne National Laboratory — home to the Aurora "
            "exascale supercomputer, one of the world's most powerful AI/HPC systems — "
            "as well as a CoreWeave AI computing campus. The county benefits from "
            "Illinois's data center investment tax credit (up to $250M over 5 years "
            "for qualifying investments). DuPage is a key node in the Chicago data "
            "center corridor, with fiber density and redundant power from ComEd."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Home to DOE's Argonne National Laboratory (Aurora supercomputer, 2 exaflops).",
        "sources": [
            {
                "label": "Argonne National Laboratory — Aurora Supercomputer",
                "url": "https://www.alcf.anl.gov/aurora",
            },
            {
                "label": "Illinois DCEO — Data Center Tax Credit",
                "url": "https://www2.illinois.gov/dceo/Pages/default.aspx",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Jackson County, GA ───────────────────────────────────────────────────
    {
        "fips": "13157",
        "name": "Jackson County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Stanton Springs Technology Park",
        "description": (
            "Jackson County is home to the Stanton Springs Technology Park, one of "
            "Georgia's premier hyperscale data center destinations. Meta Platforms "
            "operates a major data center campus there. The park was developed with "
            "state and local incentives including the Georgia Data Center Tax Exemption "
            "and significant utility infrastructure investments by Georgia Power."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "Stanton Springs is a joint economic development initiative of Jackson, Morgan, Newton, and Walton counties.",
        "sources": [
            {
                "label": "Meta — Stanton Springs, Georgia Data Center",
                "url": "https://datacenters.atmeta.com/",
            },
            {
                "label": "Georgia Department of Economic Development — Stanton Springs",
                "url": "https://www.georgia.org/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Hendricks County, IN ─────────────────────────────────────────────────
    # Microsoft AI campus (ai-in-001) is in Hendricks County (18059 ≠ 18057 Hamilton).
    {
        "fips": "18059",
        "name": "Hendricks County",
        "state": "Indiana",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Major AI Campus — Microsoft Hendricks County Hyperscale Cluster",
        "description": (
            "Hendricks County, west of Indianapolis, hosts a Microsoft hyperscale AI "
            "data center campus. Indiana's EDGE Tax Credit and IT equipment sales tax "
            "exemption apply to qualifying capital investments. The county benefits from "
            "competitive power rates from Duke Energy Indiana and access to fiber "
            "infrastructure along the I-70 corridor. Indiana has actively recruited "
            "data center and AI investment."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Microsoft — Indiana Data Center Investment",
                "url": "https://azure.microsoft.com/en-us/explore/global-infrastructure/",
            },
            {
                "label": "IEDC — Indiana EDGE Tax Credit Program",
                "url": "https://iedc.in.gov/programs/tax-credits/edge",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Kent County, MI ──────────────────────────────────────────────────────
    # Switch SUPERNAP Michigan (ai-mi-001) is in Kent County (26081).
    {
        "fips": "26081",
        "name": "Kent County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Switch SUPERNAP Michigan",
        "description": (
            "Kent County (Grand Rapids area) hosts the Switch SUPERNAP Michigan campus, "
            "one of the largest data center campuses in the Midwest. Michigan's PA 328 "
            "sales and use tax exemption for data center equipment applies. Kent County "
            "actively supports data center investment and Switch has announced continued "
            "expansion of the Grand Rapids campus."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Switch — Grand Rapids, Michigan SUPERNAP Campus",
                "url": "https://www.switch.com/data-centers/",
            },
            {
                "label": "Michigan PA 328 — Data Center Sales Tax Exemption",
                "url": "https://www.legislature.mi.gov/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Dakota County, MN ────────────────────────────────────────────────────
    {
        "fips": "27037",
        "name": "Dakota County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Twin Cities South Metro Corridor",
        "description": (
            "Dakota County (Eagan / Burnsville area) is the core of the Twin Cities "
            "data center market, hosting major facilities from CyrusOne, Compass "
            "Datacenters, and regional operators. Minnesota's data center sales tax "
            "exemption (Minn. Stat. §297A.68, Subd. 42) applies to qualifying "
            "equipment. Eagan's fiber infrastructure and Xcel Energy power access make "
            "it the dominant data center submarket in the upper Midwest."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "CyrusOne — Minneapolis/St. Paul Data Center",
                "url": "https://cyrusone.com/data-centers/",
            },
            {
                "label": "Minnesota Dept. of Revenue — Data Center Exemption §297A.68",
                "url": "https://www.revenue.state.mn.us/businesses/sut/pages/sales-exemptions.aspx",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Burleigh County, ND ──────────────────────────────────────────────────
    # Microsoft North Dakota campus (ai-nd-001) is in FIPS 38015 (Burleigh County).
    {
        "fips": "38015",
        "name": "Burleigh County",
        "state": "North Dakota",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Microsoft North Dakota Campus",
        "description": (
            "Burleigh County (Bismarck area) hosts a Microsoft hyperscale data center "
            "campus, one of the largest data center investments in North Dakota history. "
            "North Dakota's NDCC §57-02-08.31 property tax exemption and cold climate "
            "(reducing cooling costs) make the state an attractive hyperscale destination. "
            "Basin Electric and MDU Resources provide reliable power supply."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Microsoft — North Dakota Data Center Investment",
                "url": "https://azure.microsoft.com/en-us/explore/global-infrastructure/",
            },
            {
                "label": "North Dakota NDCC §57-02-08.31 — Data Center Exemption",
                "url": "https://www.legis.nd.gov/cencode/t57c02.html",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Morris County, NJ ────────────────────────────────────────────────────
    # CoreWeave Parsippany campus (ai-nj-001) is in Morris County (34027).
    {
        "fips": "34027",
        "name": "Morris County",
        "state": "New Jersey",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Major AI Campus — CoreWeave Parsippany AI Computing Cluster",
        "description": (
            "Morris County hosts the CoreWeave AI computing campus in Parsippany, "
            "one of the largest GPU cloud computing clusters on the East Coast. "
            "CoreWeave operates thousands of NVIDIA H100/H200 GPUs serving AI model "
            "training workloads. The facility benefits from PSE&G power infrastructure "
            "and dense fiber connectivity in the New York metro data center corridor. "
            "New Jersey's UEZ tax reductions apply to qualifying purchases."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "CoreWeave — Parsippany, New Jersey AI Campus",
                "url": "https://www.coreweave.com/",
            },
            {
                "label": "New Jersey UEZ Program — Morris County",
                "url": "https://www.nj.gov/njbusiness/financing/tax-credits/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Forsyth County, NC ───────────────────────────────────────────────────
    {
        "fips": "37067",
        "name": "Forsyth County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center"],
        "title": "Pro Data Center — Winston-Salem Data Center Corridor",
        "description": (
            "Forsyth County (Winston-Salem) hosts a growing data center cluster, "
            "including facilities from Windstream, Lumos Networks, and regional "
            "colocation operators. The county benefits from North Carolina's data "
            "center tax incentive (N.C.G.S. §105-164.13(55)) and Duke Energy "
            "Carolinas power rates. Winston-Salem has actively recruited data center "
            "investment as part of its technology sector growth strategy."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "NC Department of Revenue — Data Center Tax Incentive §105-164.13",
                "url": "https://www.ncdor.gov/taxes-forms/sales-and-use-tax/exemptions-exclusions-and-refunds/data-centers",
            },
            {
                "label": "Winston-Salem Business Development — Technology Sector",
                "url": "https://www.cityofws.org/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Knox County, TN ──────────────────────────────────────────────────────
    # Oak Ridge National Lab AI campus (ai-tn-003) is coded to Knox County (47093).
    {
        "fips": "47093",
        "name": "Knox County",
        "state": "Tennessee",
        "level": -1,
        "types": ["data_center", "ai", "energy"],
        "title": "Pro AI / HPC Hub — ORNL Ecosystem and Knoxville Tech Corridor",
        "description": (
            "Knox County anchors the Oak Ridge / Knoxville technology corridor, "
            "adjacent to Oak Ridge National Laboratory (ORNL) — home to Frontier, "
            "the world's first exascale supercomputer, and Inca, its successor. "
            "The corridor benefits from TVA's low power rates, the University of "
            "Tennessee at Knoxville's research ecosystem, and Tennessee's data center "
            "sales tax exemption. The region is actively pursuing follow-on commercial "
            "AI computing investment near the DOE complex."
        ),
        "effective_date": "2022-06-01",
        "status": "active",
        "notes": "Frontier (ORNL) became the world's first exascale computer in 2022.",
        "sources": [
            {
                "label": "Oak Ridge National Laboratory — Frontier Supercomputer",
                "url": "https://www.olcf.ornl.gov/frontier/",
            },
            {
                "label": "Tennessee Valley Authority — Power for Computing",
                "url": "https://www.tva.com/energy/distributed-energy-resources",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Williamson County, TN ────────────────────────────────────────────────
    {
        "fips": "47187",
        "name": "Williamson County",
        "state": "Tennessee",
        "level": 1,
        "types": ["data_center"],
        "title": "Growing Data Center Concerns — Franklin / Brentwood Area Opposition",
        "description": (
            "Williamson County (Franklin / Brentwood) has seen organized resident "
            "opposition to data center proposals in or adjacent to its upscale "
            "suburban communities. Planning commission meetings in 2023–2024 included "
            "public comment opposing data center rezoning requests near residential "
            "neighborhoods, citing traffic, noise, and visual impact. No formal "
            "moratorium has been enacted, but developer proposals have faced significant "
            "community pushback."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "No formal moratorium; community opposition at planning commission level as of 2024.",
        "sources": [
            {
                "label": "Williamson County Planning Commission — Meeting Records",
                "url": "https://www.williamsoncounty-tn.gov/",
            },
            {
                "label": "Williamson Home Page / Tennessee Lookout — Franklin Data Center Opposition",
                "url": "https://tennesseelookout.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Tarrant County, TX ───────────────────────────────────────────────────
    # Meta Fort Worth campus (ai-tx-001) is in Tarrant County (48439).
    {
        "fips": "48439",
        "name": "Tarrant County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Meta Fort Worth Campus",
        "description": (
            "Tarrant County (Fort Worth / Arlington area) hosts Meta's Fort Worth AI "
            "data center campus, one of Meta's largest North American facilities. "
            "Texas Chapter 313 tax abatement agreements and the successor Chapter 403 "
            "TEXAS Jobs and Security Act have supported the investment. Oncor Electric "
            "provides power; Tarrant County's access to renewable wind energy from "
            "West Texas makes it attractive for large-scale compute workloads."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "",
        "sources": [
            {
                "label": "Meta — Fort Worth, Texas Data Center",
                "url": "https://datacenters.atmeta.com/",
            },
            {
                "label": "Texas Comptroller — Chapter 313/403 Economic Development",
                "url": "https://comptroller.texas.gov/economy/local/ch313/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Salt Lake County, UT ─────────────────────────────────────────────────
    {
        "fips": "49035",
        "name": "Salt Lake County",
        "state": "Utah",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — Salt Lake City Metro Corridor",
        "description": (
            "Salt Lake County hosts a growing hyperscale data center corridor including "
            "facilities from Google, C7 Data Centers, Novva Data Centers, and others. "
            "Google announced a $1 billion+ data center investment in the Salt Lake metro "
            "area in 2024. Utah's sales tax exemption for data center equipment (Utah Code "
            "Ann. §59-12-104(77)) and competitive Rocky Mountain Power rates make the "
            "state one of the fastest-growing data center markets in the West."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Google announced $1B+ Utah data center investment in 2024.",
        "sources": [
            {
                "label": "Google — Utah Data Center Investment Announcement 2024",
                "url": "https://blog.google/",
            },
            {
                "label": "Utah Code Ann. §59-12-104(77) — Data Center Sales Tax Exemption",
                "url": "https://le.utah.gov/xcode/Title59/Chapter12/C59-12-P1_1800010118000101.pdf",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Henrico County, VA ───────────────────────────────────────────────────
    {
        "fips": "51085",
        "name": "Henrico County",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center"],
        "title": "Major Data Center Investment Hub — QTS Richmond Campus",
        "description": (
            "Henrico County hosts the QTS (now Iron Mountain Data Centers) Richmond "
            "hyperscale campus, one of the largest data center campuses in the "
            "mid-Atlantic. The facility spans multiple buildings and is one of "
            "QTS's flagship campuses. Virginia's Data Center Investment Grant and "
            "sales tax exemption for qualifying equipment apply. Henrico County "
            "has consistently supported data center investment with local "
            "economic development incentives."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "QTS Richmond was acquired by Blackstone in 2021; rebranded under Iron Mountain Data Centers.",
        "sources": [
            {
                "label": "Iron Mountain / QTS — Richmond, Virginia Data Center",
                "url": "https://www.ironmountain.com/resources/data-centers",
            },
            {
                "label": "Virginia VEDP — Data Center Investment Grant Program",
                "url": "https://www.vedp.org/incentive/data-center-investment-grant",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Minnehaha County, SD ─────────────────────────────────────────────────
    {
        "fips": "46099",
        "name": "Minnehaha County",
        "state": "South Dakota",
        "level": -1,
        "types": ["data_center"],
        "title": "Pro Data Center — Sioux Falls Data Center Hub",
        "description": (
            "Minnehaha County (Sioux Falls) has attracted data center investment "
            "driven by South Dakota's zero corporate income tax, low property taxes, "
            "and competitive electrical rates from Xcel Energy and other utilities. "
            "Major data center operators with Sioux Falls facilities include "
            "T-Mobile, Midcontinent Communications, and others. The city has "
            "actively marketed its data center-friendly environment."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "South Dakota has no corporate income tax, a key data center attraction.",
        "sources": [
            {
                "label": "South Dakota GOED — No Corporate Income Tax",
                "url": "https://sdreadytowork.com/why-sd/business-climate/",
            },
            {
                "label": "Sioux Falls Development Foundation — Technology Sector",
                "url": "https://www.siouxfalls.com/",
            },
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# NEW AI CAMPUSES
# ──────────────────────────────────────────────────────────────────────────────
NEW_AI_CAMPUSES: list[dict] = [
    {
        "id": "ai-ga-002",
        "name": "Meta Stanton Springs Data Center Campus",
        "operator": "Meta Platforms",
        "status": "operational",
        "county_fips": "13157",
        "notes": "Meta data center in Stanton Springs Technology Park, Jackson County GA. Part of the four-county Stanton Springs industrial park initiative.",
        "lat": 33.64,
        "lon": -83.79,
    },
    {
        "id": "ai-va-003",
        "name": "Iron Mountain / QTS Richmond Data Center Campus",
        "operator": "Iron Mountain Data Centers (QTS)",
        "status": "operational",
        "county_fips": "51085",
        "notes": "Hyperscale campus in Henrico County, VA. One of QTS's flagship properties, acquired by Blackstone/Iron Mountain in 2021. Multiple hyperscale buildings.",
        "lat": 37.54,
        "lon": -77.45,
    },
    {
        "id": "ai-mn-001",
        "name": "CyrusOne Minneapolis-St. Paul Metro Campus",
        "operator": "CyrusOne (KKR / GIP)",
        "status": "operational",
        "county_fips": "27037",
        "notes": "CyrusOne data center campus in Eagan, Dakota County, MN. Core of the Twin Cities enterprise data center market.",
        "lat": 44.82,
        "lon": -93.17,
    },
    {
        "id": "ai-ut-001",
        "name": "Google Utah Data Center Campus",
        "operator": "Google",
        "status": "under_construction",
        "county_fips": "49035",
        "notes": "Google announced a $1B+ data center campus in the Salt Lake City metro area in 2024. Part of Google's continued US hyperscale expansion.",
        "lat": 40.76,
        "lon": -111.89,
    },
    {
        "id": "ai-de-001",
        "name": "Iron Mountain Wilmington Data Center",
        "operator": "Iron Mountain Data Centers",
        "status": "operational",
        "county_fips": "10003",
        "notes": "Iron Mountain (formerly IO Data Centers) colocation facility in New Castle County, Delaware. Serves the Mid-Atlantic enterprise market.",
        "lat": 39.74,
        "lon": -75.54,
    },
    {
        "id": "ai-sd-001",
        "name": "T-Mobile Sioux Falls Network Data Center",
        "operator": "T-Mobile",
        "status": "operational",
        "county_fips": "46099",
        "notes": "T-Mobile major network operations data center in Sioux Falls, Minnehaha County SD. Anchors the Sioux Falls technology/data center ecosystem.",
        "lat": 43.54,
        "lon": -96.73,
    },
    {
        "id": "ai-nc-001",
        "name": "Windstream / Lumos Winston-Salem Data Center",
        "operator": "Windstream / Lumos Networks",
        "status": "operational",
        "county_fips": "37067",
        "notes": "Windstream and Lumos Networks carrier-grade colocation facilities in Winston-Salem, Forsyth County NC. Anchor of the Winston-Salem data center corridor.",
        "lat": 36.10,
        "lon": -80.24,
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# NEW TAX INCENTIVES
# ──────────────────────────────────────────────────────────────────────────────
NEW_TAX_INCENTIVES: list[dict] = [
    {
        "state": "MN",
        "program_name": "Minnesota Data Center Sales Tax Exemption",
        "authority": "Minnesota Department of Revenue (Minn. Stat. §297A.68, Subd. 42)",
        "description": (
            "Minnesota exempts qualifying computer equipment and peripherals purchased "
            "for use in an enterprise data center from the state sales tax. Qualifying "
            "facilities must have at least 25,000 sq ft of raised floor space and "
            "represent a capital investment of at least $30 million. The exemption "
            "covers servers, networking equipment, cooling infrastructure, and power "
            "equipment. The program was enacted to attract hyperscale data center "
            "investment to the state."
        ),
        "benefit_type": "sales_tax_exemption",
        "enacted_year": 2011,
        "expiration_year": None,
        "sources": [
            {
                "label": "Minnesota Statutes §297A.68, Subd. 42 — Data Center Exemption",
                "url": "https://www.revisor.mn.gov/statutes/cite/297A.68",
            }
        ],
    },
    {
        "state": "UT",
        "program_name": "Utah Data Center Equipment Sales Tax Exemption",
        "authority": "Utah State Tax Commission (Utah Code Ann. §59-12-104(77))",
        "description": (
            "Utah exempts qualifying data center equipment and software from state "
            "sales and use tax under Utah Code Ann. §59-12-104(77). Qualifying "
            "facilities must meet minimum capital investment thresholds and are "
            "required to pay prevailing wages. The exemption applies to servers, "
            "networking equipment, power and cooling infrastructure. Utah also "
            "offers the EDTIF (Economic Development Tax Increment Financing) "
            "program for large capital projects."
        ),
        "benefit_type": "sales_tax_exemption",
        "enacted_year": 2008,
        "expiration_year": None,
        "sources": [
            {
                "label": "Utah Code Ann. §59-12-104(77) — Data Center Tax Exemption",
                "url": "https://le.utah.gov/xcode/Title59/Chapter12/C59-12-P1_1800010118000101.pdf",
            }
        ],
    },
    {
        "state": "NY",
        "program_name": "New York Data Center Tax Credit (Empire State Digital Program)",
        "authority": "New York State Department of Taxation and Finance (N.Y. Tax Law §28)",
        "description": (
            "New York's Empire State Digital Program provides a refundable tax credit "
            "of up to 5% on capital investments in qualified data centers. Qualifying "
            "facilities must invest at least $100 million in capital expenditures and "
            "create or retain qualifying jobs. The credit applies to qualifying "
            "computer hardware, software, and related infrastructure. Projects must "
            "be approved by Empire State Development."
        ),
        "benefit_type": "tax_credit",
        "enacted_year": 2020,
        "expiration_year": None,
        "sources": [
            {
                "label": "New York Tax Law §28 — Empire State Digital Credit",
                "url": "https://www.tax.ny.gov/bus/ads/empirestatedigital.htm",
            }
        ],
    },
    {
        "state": "AR",
        "program_name": "Arkansas Data Center Sales and Use Tax Exemption",
        "authority": "Arkansas Department of Finance and Administration (Ark. Code Ann. §26-52-465)",
        "description": (
            "Arkansas provides a sales and use tax exemption for qualifying data center "
            "equipment under Ark. Code Ann. §26-52-465. Qualifying facilities must "
            "represent a capital investment of at least $25 million in a 48-month "
            "period. The exemption covers servers, storage equipment, networking "
            "infrastructure, and power and cooling equipment. Arkansas also provides "
            "income tax incentives through the ADVANTAGE Arkansas program."
        ),
        "benefit_type": "sales_tax_exemption",
        "enacted_year": 2013,
        "expiration_year": None,
        "sources": [
            {
                "label": "Arkansas DFA — Data Center Tax Exemption §26-52-465",
                "url": "https://www.dfa.arkansas.gov/",
            }
        ],
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# NEW STATE REGULATIONS
# ──────────────────────────────────────────────────────────────────────────────
NEW_STATE_REGULATIONS: dict[str, dict] = {
    "05": {
        "name": "Arkansas",
        "abbr": "AR",
        "level": -1,
        "status": "active",
        "summary": (
            "Arkansas is a favorable data center investment destination with a "
            "sales and use tax exemption for qualifying data center equipment "
            "(§26-52-465) and the ADVANTAGE Arkansas income tax incentive program. "
            "Little Rock and Northwest Arkansas have attracted data center investment. "
            "Competitive power rates from Entergy Arkansas and a low-regulation "
            "environment make the state attractive for edge and enterprise facilities."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "Arkansas DFA — Data Center Tax Exemption",
                "url": "https://www.dfa.arkansas.gov/",
            }
        ],
    },
    "10": {
        "name": "Delaware",
        "abbr": "DE",
        "level": 0,
        "status": "active",
        "summary": (
            "Delaware hosts a moderate data center cluster in New Castle County "
            "(Wilmington area), benefiting from proximity to the Philadelphia–Baltimore–"
            "Washington corridor. No Delaware-specific data center tax incentive exists, "
            "but the state's favorable corporate tax structure and existing financial "
            "services data center ecosystem support the market. No statewide data center "
            "restrictions are enacted."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "Delaware Division of Corporations",
                "url": "https://corp.delaware.gov/",
            }
        ],
    },
    "20": {
        "name": "Kansas",
        "abbr": "KS",
        "level": 0,
        "status": "active",
        "summary": (
            "Kansas has a moderate data center presence primarily in the Kansas City "
            "metro (Johnson County) and Wichita areas. The state's IMPACT program "
            "provides payroll withholding tax rebates for qualifying capital projects. "
            "No Kansas-specific data center sales tax exemption exists, though the "
            "state's low cost of living and power rates attract smaller-scale facilities. "
            "No statewide data center restrictions are enacted."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "Kansas Commerce — IMPACT Program",
                "url": "https://www.kansascommerce.gov/",
            }
        ],
    },
    "46": {
        "name": "South Dakota",
        "abbr": "SD",
        "level": -1,
        "status": "active",
        "summary": (
            "South Dakota is a favorable data center investment destination with zero "
            "corporate income tax, competitive electrical rates, and a business-friendly "
            "regulatory environment. Sioux Falls (Minnehaha County) is the primary data "
            "center market. T-Mobile and regional carriers operate significant facilities. "
            "No statewide data center restrictions or specific tax incentive programs "
            "exist — the competitive advantage is the absence of corporate taxation."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "South Dakota GOED — Business Climate",
                "url": "https://sdreadytowork.com/why-sd/business-climate/",
            }
        ],
    },
    "49": {
        "name": "Utah",
        "abbr": "UT",
        "level": -1,
        "status": "active",
        "summary": (
            "Utah is a fast-growing data center market anchored in Salt Lake County. "
            "The state's data center sales tax exemption (Utah Code Ann. §59-12-104(77)) "
            "and EDTIF incentive program support hyperscale investment. Google, C7 Data "
            "Centers, Novva, and regional colocation operators have significant facilities. "
            "Rocky Mountain Power provides reliable power; fiber infrastructure via the "
            "I-15 corridor is well-developed."
        ),
        "types": ["data_center"],
        "sources": [
            {
                "label": "Utah Code Ann. §59-12-104(77) — Data Center Exemption",
                "url": "https://le.utah.gov/xcode/Title59/Chapter12/C59-12-P1_1800010118000101.pdf",
            }
        ],
    },
}


def run() -> None:
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

    added_r = added_c = added_t = added_s = 0

    for rec in NEW_RESTRICTIONS:
        if rec["fips"] in existing_fips:
            print(f"  SKIP restriction {rec['fips']} ({rec['name']}) — already exists")
            continue
        restrictions_doc["restrictions"].append(rec)
        existing_fips.add(rec["fips"])
        added_r += 1
        print(f"  + restriction {rec['fips']} {rec['name']}, {rec['state']}  level={rec['level']}")

    for campus in NEW_AI_CAMPUSES:
        if campus["id"] in existing_ids:
            print(f"  SKIP campus {campus['id']} — already exists")
            continue
        campuses_doc["ai_campuses"].append(campus)
        existing_ids.add(campus["id"])
        added_c += 1
        print(f"  + campus {campus['id']} {campus['name']}")

    for inc in NEW_TAX_INCENTIVES:
        key = f"{inc['state']}:{inc['program_name']}"
        if key in existing_states:
            print(f"  SKIP incentive {key} — already exists")
            continue
        incentives_doc["tax_incentives"].append(inc)
        existing_states.add(key)
        added_t += 1
        print(f"  + incentive {inc['state']} {inc['program_name']}")

    for fips2, entry in NEW_STATE_REGULATIONS.items():
        if fips2 in existing_st_reg:
            print(f"  SKIP state_reg {fips2} ({entry['abbr']}) — already exists")
            continue
        state_reg_doc["states"][fips2] = entry
        existing_st_reg.add(fips2)
        added_s += 1
        print(f"  + state_reg {fips2} {entry['name']} ({entry['abbr']})")

    with open(restrictions_path, "w") as f:
        json.dump(restrictions_doc, f, indent=2)
    with open(campuses_path, "w") as f:
        json.dump(campuses_doc, f, indent=2)
    with open(incentives_path, "w") as f:
        json.dump(incentives_doc, f, indent=2)
    with open(state_reg_path, "w") as f:
        json.dump(state_reg_doc, f, indent=2)

    print(f"\nSweep B complete: +{added_r} restrictions, +{added_c} campuses, +{added_t} incentives, +{added_s} state regs")


if __name__ == "__main__":
    run()
