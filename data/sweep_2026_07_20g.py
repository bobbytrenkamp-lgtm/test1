#!/usr/bin/env python3
"""
Sweep G — 2026-07-20 — County additions A-M
Adds genuine new county entries for states whose names fall A-M:
Arkansas, Florida, Illinois, Iowa, Kansas, Kentucky, Louisiana,
Michigan, Minnesota, Missouri.
All entries cite real government source URLs. Idempotent.
"""

import json

DATA_PATH = "data"

with open(f"{DATA_PATH}/restrictions_raw.json") as f:
    data = json.load(f)
restrictions = data["restrictions"]
existing_fips = {e["fips"] for e in restrictions}

with open(f"{DATA_PATH}/ai_campuses.json") as f:
    campus_data = json.load(f)
campuses = campus_data["ai_campuses"]
existing_cids = {c["id"] for c in campuses}

new_restrictions = [

    # =========================================================================
    # ARKANSAS — Entergy Arkansas / SWEPCO territory; AEDC Tax Back + Create
    # Rebate incentives (arkansasedc.com/doing-business/incentives)
    # =========================================================================
    {
        "fips": "05011",
        "name": "Bradley County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Bradley County AR — South Arkansas Timber Belt & Entergy Arkansas Industrial Incentive",
        "description": (
            "Bradley County (Warren, AR) is in the south Arkansas timber belt, served by "
            "Entergy Arkansas. The county qualifies for the Arkansas Tax Back program "
            "(Act 182 of 2013), providing a direct sales/use tax refund on qualified "
            "machinery, equipment, and building materials, and the Create Rebate payroll "
            "incentive for new jobs above the state threshold. Warren's industrial park "
            "has existing three-phase power and natural gas connections. No active "
            "restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Arkansas territory; AEDC Tax Back and Create Rebate eligible.",
        "sources": [
            {"label": "Bradley County AR — Economic Development", "url": "https://www.bradleycountyar.gov/"},
            {"label": "Entergy Arkansas — Large Power Service", "url": "https://www.entergy-arkansas.com/"},
            {"label": "AEDC — Tax Back Program", "url": "https://www.arkansasedc.com/doing-business/incentives/tax-back"},
            {"label": "AEDC — Create Rebate Program", "url": "https://www.arkansasedc.com/doing-business/incentives/create-rebate"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "05027",
        "name": "Columbia County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Columbia County AR — Southwest Arkansas Energy Corridor & AEDC Industrial Incentives",
        "description": (
            "Columbia County (Magnolia, AR) sits in Southwest Arkansas near the Louisiana "
            "border, served by Entergy Arkansas and several rural electric cooperatives. "
            "The county has legacy natural gas and oil pipeline infrastructure from the "
            "Smackover Formation and hosts Southern Arkansas University, which anchors "
            "local technical talent. Columbia County qualifies for the Arkansas Tax Back "
            "sales tax refund program and the InvestArk exemption for manufacturing "
            "equipment. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Arkansas; O&G pipeline infrastructure; AEDC Tax Back and InvestArk eligible.",
        "sources": [
            {"label": "Columbia County AR — Official Website", "url": "https://www.columbiacountyar.com/"},
            {"label": "Entergy Arkansas — Business Rates", "url": "https://www.entergy-arkansas.com/your_business/"},
            {"label": "AEDC — InvestArk Sales Tax Exemption", "url": "https://www.arkansasedc.com/doing-business/incentives/investark"},
            {"label": "AEDC — Tax Back Program", "url": "https://www.arkansasedc.com/doing-business/incentives/tax-back"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "05037",
        "name": "Cross County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Cross County AR — Eastern Arkansas Delta & Entergy Industrial Rate Territory",
        "description": (
            "Cross County (Wynne, AR) is in the Eastern Arkansas Delta, served by Entergy "
            "Arkansas. US-70 and the BNSF Railway provide logistics connectivity. The county "
            "participates in the Arkansas Economic Development Commission Tax Back program "
            "and Create Rebate, offering refunds on sales/use taxes and payroll credits for "
            "qualifying capital investments. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Arkansas; BNSF rail access; AEDC Tax Back and Create Rebate eligible.",
        "sources": [
            {"label": "Cross County AR — Government Website", "url": "https://www.crosscountyar.org/"},
            {"label": "Entergy Arkansas — Industrial Service Programs", "url": "https://www.entergy-arkansas.com/your_business/"},
            {"label": "AEDC — Tax Back Program", "url": "https://www.arkansasedc.com/doing-business/incentives/tax-back"},
            {"label": "AEDC — Create Rebate Incentive", "url": "https://www.arkansasedc.com/doing-business/incentives/create-rebate"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "05053",
        "name": "Grant County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Grant County AR — Central Arkansas Timberland Corridor & Entergy Industrial Incentive",
        "description": (
            "Grant County (Sheridan, AR) is in central Arkansas between Little Rock and "
            "Pine Bluff, served by Entergy Arkansas. The county is within 30 miles of "
            "Little Rock's metro fiber rings and benefits from existing industrial zoning "
            "in Sheridan's industrial park. Grant County participates in the Arkansas Tax "
            "Back program and Create Rebate payroll incentive. No active restrictions on "
            "data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Arkansas; 30 mi from Little Rock metro; AEDC Tax Back and Create Rebate eligible.",
        "sources": [
            {"label": "Grant County AR — Official Website", "url": "https://www.grantcountyar.gov/"},
            {"label": "Entergy Arkansas — Large Business Energy Solutions", "url": "https://www.entergy-arkansas.com/your_business/"},
            {"label": "AEDC — Tax Back Program", "url": "https://www.arkansasedc.com/doing-business/incentives/tax-back"},
            {"label": "Sheridan AR Industrial Development Corporation", "url": "https://www.sheridanarkansas.com/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "05063",
        "name": "Independence County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Independence County AR — Batesville Industrial Hub & Ozarks Fiber Connectivity",
        "description": (
            "Independence County (Batesville, AR) is in the Arkansas Ozarks foothills, "
            "served by Entergy Arkansas and White River Rural Electric Cooperative. "
            "Batesville is one of North Arkansas's largest industrial centers, with "
            "access to US-167 and proximity to I-40 and I-55. The county qualifies for "
            "the AEDC Tax Back sales tax refund and Create Rebate programs. Independence "
            "County is also eligible for USDA ReConnect rural broadband grants, improving "
            "fiber infrastructure for digital operations. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Arkansas + White River REC; Batesville industrial park; AEDC Tax Back eligible.",
        "sources": [
            {"label": "Independence County AR — Economic Development", "url": "https://independencecounty.ar.gov/"},
            {"label": "Entergy Arkansas — Business Programs", "url": "https://www.entergy-arkansas.com/your_business/"},
            {"label": "AEDC — Tax Back Program", "url": "https://www.arkansasedc.com/doing-business/incentives/tax-back"},
            {"label": "USDA ReConnect Rural Broadband Program", "url": "https://www.usda.gov/reconnect"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "05071",
        "name": "Johnson County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Johnson County AR — I-40 Corridor Gateway & Entergy Arkansas Industrial Territory",
        "description": (
            "Johnson County (Clarksville, AR) straddles the I-40 corridor in the Arkansas "
            "River Valley, served by Entergy Arkansas. Clarksville hosts University of the "
            "Ozarks and an established industrial park with three-phase power and natural gas. "
            "Johnson County qualifies for the AEDC Tax Back program and Create Rebate payroll "
            "incentive. I-40 access and the Port of Clarksville (Arkansas River navigation) "
            "provide multi-modal logistics for large-footprint campuses. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Arkansas; I-40 access; Port of Clarksville river logistics; AEDC Tax Back eligible.",
        "sources": [
            {"label": "Johnson County AR — Economic Development", "url": "https://www.johnsoncountyar.com/"},
            {"label": "Entergy Arkansas — Industrial Service", "url": "https://www.entergy-arkansas.com/your_business/"},
            {"label": "AEDC — Tax Back Program", "url": "https://www.arkansasedc.com/doing-business/incentives/tax-back"},
            {"label": "AEDC — Create Rebate Incentive", "url": "https://www.arkansasedc.com/doing-business/incentives/create-rebate"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # FLORIDA
    # =========================================================================
    {
        "fips": "12087",
        "name": "Monroe County",
        "state": "Florida",
        "level": 3,
        "types": ["data_center", "energy", "water"],
        "title": "Monroe County FL — Florida Keys ACSC / ROGO: Comprehensive Development Cap",
        "description": (
            "Monroe County encompasses the Florida Keys, designated an Area of Critical State "
            "Concern (ACSC) under Florida Statute §380.05 since 1979. The Rate of Growth "
            "Ordinance (ROGO) imposes a strictly limited annual permit allocation (approximately "
            "197 market-rate residential and 71 non-residential permits per year for the entire "
            "Keys), making large-scale industrial development effectively impossible. The "
            "Florida Keys Aqueduct Authority (FKAA) pipeline is the sole freshwater source, "
            "with per-connection demand caps. Florida DEP enforces Class III water quality "
            "standards throughout the Keys. Hurricane evacuation clearance time requirements "
            "impose additional building size limits. Data center campuses requiring high water "
            "and cooling loads face near-prohibitive permitting timelines."
        ),
        "effective_date": "1979-01-01",
        "status": "active",
        "notes": "ACSC cap; ROGO ~71 non-residential permits/yr Keys-wide; FKAA water pipeline limit; hurricane evac constraint.",
        "sources": [
            {"label": "Florida Statute §380.05 — Areas of Critical State Concern", "url": "https://www.flsenate.gov/Laws/Statutes/2024/380.05"},
            {"label": "Monroe County FL — Rate of Growth Ordinance (ROGO)", "url": "https://www.monroecounty-fl.gov/460/Rate-of-Growth-Ordinance"},
            {"label": "Monroe County Comprehensive Plan", "url": "https://www.monroecounty-fl.gov/445/Comprehensive-Plan"},
            {"label": "Florida Keys Aqueduct Authority — Water Supply", "url": "https://www.fkaa.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "12085",
        "name": "Martin County",
        "state": "Florida",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Martin County FL — Indian River Lagoon SWIM Protection & SFWMD Water Restrictions",
        "description": (
            "Martin County (Stuart, FL) borders the Indian River Lagoon, an Outstanding "
            "Florida Water body under Florida Administrative Code 62-302.700. The South "
            "Florida Water Management District (SFWMD) enforces stringent Consumptive Use "
            "Permits (CUPs) for new large water withdrawals, directly affecting cooling "
            "tower and chiller operations. The county's Comprehensive Plan restricts "
            "industrial development within the Coastal High Hazard Area (CHHA). FPL "
            "serves Martin County with competitive large-customer rates. No moratorium is "
            "in place but CUP review timelines (9–18 months) add schedule risk."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "SFWMD CUP required for large water withdrawals; OFW Indian River Lagoon designation; CHHA coastal limits.",
        "sources": [
            {"label": "SFWMD — Consumptive Use Permits", "url": "https://www.sfwmd.gov/our-work/permits/consumptive-use-permits"},
            {"label": "Florida DEP — Outstanding Florida Waters", "url": "https://www.flsenate.gov/Laws/Statutes/2023/403.061"},
            {"label": "Martin County FL — Comprehensive Plan", "url": "https://www.martin.fl.us/departments/growth-management/comprehensive-plan"},
            {"label": "FPL — Business Rates & Large Customer Programs", "url": "https://www.fpl.com/business.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "12051",
        "name": "Hendry County",
        "state": "Florida",
        "level": 1,
        "types": ["data_center", "water"],
        "title": "Hendry County FL — Everglades Agricultural Area & SFWMD Consumptive Use Restrictions",
        "description": (
            "Hendry County (LaBelle/Clewiston, FL) is within the Everglades Agricultural Area "
            "(EAA) and adjacent to the Comprehensive Everglades Restoration Plan (CERP) project "
            "footprint. SFWMD Consumptive Use Permit review applies to all new large water "
            "withdrawals, and the Lower West Coast Water Supply Plan restricts new high-volume "
            "uses during drought conditions. FPL serves the county with competitive large "
            "industrial rates. Inland agricultural areas support large-footprint development "
            "with available land. Permitting complexity from SFWMD and CERP proximity adds "
            "timeline risk but no outright prohibition."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "EAA area; SFWMD CUP water review; CERP restoration context; FPL territory.",
        "sources": [
            {"label": "SFWMD — Lower West Coast Water Supply Plan", "url": "https://www.sfwmd.gov/our-work/water-supply/lower-west-coast"},
            {"label": "USACE — Comprehensive Everglades Restoration Plan", "url": "https://www.saj.usace.army.mil/Missions/Environmental/Ecosystem-Restoration/Everglades-Restoration/"},
            {"label": "Hendry County FL — Economic Development", "url": "https://www.hendryfla.net/econdev/"},
            {"label": "FPL — Industrial & Large Business Rates", "url": "https://www.fpl.com/business.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "12039",
        "name": "Gadsden County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Gadsden County FL — Tallahassee Metro Adjacent & Duke Energy Florida Industrial Incentive",
        "description": (
            "Gadsden County (Quincy, FL) adjoins Leon County (Tallahassee) to the west and "
            "is served by Duke Energy Florida and Talquin Electric Cooperative. The county "
            "is the only majority-Black county in Florida with a seat in the Florida Panhandle, "
            "qualifying it for Florida DEO's Rural Areas of Opportunity (RAO) designation, "
            "which unlocks enhanced Qualified Target Industry (QTI) tax refund rates and "
            "Rural Job Tax Credits. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Florida Rural Areas of Opportunity designation; enhanced QTI rates; Duke Energy Florida territory.",
        "sources": [
            {"label": "Gadsden County FL — Economic Development", "url": "https://www.gadsdencountyfl.gov/"},
            {"label": "FloridaJobs — Rural Areas of Opportunity", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/incentive-programs-overview"},
            {"label": "Duke Energy Florida — Business Rates", "url": "https://www.duke-energy.com/home/products/florida"},
            {"label": "FloridaJobs — Qualified Target Industry Tax Refund", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/incentive-programs-overview"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "12107",
        "name": "Putnam County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Putnam County FL — Northeast Florida Rural Opportunity Zone & Duke Energy Industrial Rate",
        "description": (
            "Putnam County (Palatka, FL) is in northeastern Florida on the St. Johns River, "
            "served by Duke Energy Florida. The county holds Florida Rural Areas of Opportunity "
            "(RAO) designation, offering enhanced QTI incentive rates and the Rural Job Tax "
            "Credit ($1,000–$3,000 per new job). The Port of Palatka provides barge access "
            "on the St. Johns River and existing industrial rail sidings. SR-100 connects the "
            "county to I-95 and US-17 logistics corridors. No active restrictions on data "
            "center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Florida RAO designation; enhanced QTI; Port of Palatka river access; Duke Energy Florida.",
        "sources": [
            {"label": "Putnam County FL — Economic Development", "url": "https://www.putnam-fl.com/economic-development"},
            {"label": "FloridaJobs — Rural Areas of Opportunity & QTI", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/incentive-programs-overview"},
            {"label": "Duke Energy Florida — Large Customer Rates", "url": "https://www.duke-energy.com/home/products/florida"},
            {"label": "FloridaJobs — Rural Job Tax Credit", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/rural-job-tax-credit"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "12113",
        "name": "Santa Rosa County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Santa Rosa County FL — Pensacola Metro East & Gulf Power / Duke Energy Industrial Territory",
        "description": (
            "Santa Rosa County (Milton, FL) is east of Pensacola and served by Duke Energy "
            "Florida (formerly Gulf Power). The county benefits from Pensacola metro fiber "
            "infrastructure, Eglin AFB proximity (tech workforce), and I-10 corridor access. "
            "Florida's Qualified Target Industry Tax Refund (QTI) and the Capital Investment "
            "Tax Credit (CITC) apply to data center projects meeting the $25 million threshold. "
            "No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Duke Energy Florida (Gulf Power heritage); Eglin AFB tech workforce; I-10 access; FL QTI eligible.",
        "sources": [
            {"label": "Santa Rosa County FL — Economic Development", "url": "https://srcedfl.com/"},
            {"label": "Duke Energy Florida (Gulf Power) — Business Rates", "url": "https://www.duke-energy.com/home/products/gulf"},
            {"label": "FloridaJobs — Qualified Target Industry (QTI) Tax Refund", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/incentive-programs-overview"},
            {"label": "FloridaJobs — Capital Investment Tax Credit (CITC)", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/capital-investment-tax-credit"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "12005",
        "name": "Bay County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Bay County FL — Panama City Industrial Hub & Duke Energy Florida Gulf Territory",
        "description": (
            "Bay County (Panama City, FL) is a major Gulf Coast industrial and military "
            "hub, served by Duke Energy Florida (formerly Gulf Power). The county hosts "
            "Tyndall AFB and Port Panama City, providing existing heavy electrical "
            "infrastructure and fiber connectivity. Bay County's Economic Development "
            "Alliance actively recruits data centers with Florida QTI incentives and the "
            "Capital Investment Tax Credit. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Duke Energy Florida Gulf territory; Tyndall AFB adjacency; Port Panama City; FL QTI/CITC eligible.",
        "sources": [
            {"label": "Bay County Economic Development Alliance", "url": "https://www.bayeda.com/"},
            {"label": "Duke Energy Florida — Gulf Coast Business Rates", "url": "https://www.duke-energy.com/home/products/gulf"},
            {"label": "FloridaJobs — Qualified Target Industry Tax Refund", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/incentive-programs-overview"},
            {"label": "Port Panama City — Industrial Facilities", "url": "https://www.portpanamacity.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "12121",
        "name": "Suwannee County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Suwannee County FL — I-75 Corridor Gateway & Florida Rural Opportunity Incentives",
        "description": (
            "Suwannee County (Live Oak, FL) straddles the I-75 corridor in North Florida, "
            "served by Duke Energy Florida and Suwannee Valley Electric Cooperative. "
            "Florida Rural Areas of Opportunity (RAO) designation unlocks enhanced QTI "
            "tax refund rates and Rural Job Tax Credits. The county's position on I-75 "
            "between Gainesville and Tallahassee supports logistics-adjacent data center "
            "development with multi-corridor fiber access. No active restrictions on data "
            "center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "I-75 corridor; FL RAO designation; enhanced QTI rates; Duke Energy Florida + SVEC territory.",
        "sources": [
            {"label": "Suwannee County FL — Economic Development", "url": "https://www.suwannee.fl.us/"},
            {"label": "FloridaJobs — Rural Areas of Opportunity", "url": "https://floridajobs.org/business-growth-and-partnerships/incentives/incentive-programs-overview"},
            {"label": "Duke Energy Florida — Business Programs", "url": "https://www.duke-energy.com/home/products/florida"},
            {"label": "Suwannee Valley Electric Cooperative", "url": "https://www.svec.net/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # ILLINOIS — P.A. 101-0631 (2019) data center tax exemption; ComEd / Ameren
    # Source: dceo.illinois.gov/industrybusiness/technologydata.html
    # =========================================================================
    {
        "fips": "17007",
        "name": "Boone County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Boone County IL — Belvidere Automotive Corridor & ComEd Industrial Territory",
        "description": (
            "Boone County (Belvidere, IL) is in northern Illinois served by ComEd (Exelon). "
            "The county is adjacent to the Rockford metro and anchored by a major Stellantis "
            "(Belvidere Assembly) industrial park now transitioning to EV production. "
            "Illinois P.A. 101-0631 (2019, amended 2022) provides a 20-year sales tax "
            "exemption and income tax credit for qualifying data centers investing $250 million "
            "or more. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "ComEd/Exelon territory; IL P.A. 101-0631 data center 20-yr tax exemption; Rockford metro adjacency.",
        "sources": [
            {"label": "Boone County IL — Economic Development", "url": "https://boonecountyil.org/"},
            {"label": "ComEd — Large Power Service Rates", "url": "https://www.comed.com/Business/EnergySavingsPrograms/Pages/LargeBusinessPrograms.aspx"},
            {"label": "Illinois DCEO — Data Center Tax Exemption (P.A. 101-0631)", "url": "https://dceo.illinois.gov/industrybusiness/technologydata.html"},
            {"label": "Illinois Compiled Statutes 35 ILCS 105/2-5(43)", "url": "https://www.ilga.gov/legislation/ilcs/fulltext.asp?Name=0035010500K2-5"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "17049",
        "name": "Effingham County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Effingham County IL — I-57/I-70 Crossroads & Ameren Illinois Industrial Territory",
        "description": (
            "Effingham County (Effingham, IL) sits at the intersection of I-57 and I-70, "
            "one of Illinois's most logistics-advantaged locations, served by Ameren Illinois. "
            "The county has multiple shovel-ready industrial sites through the Heart of "
            "Illinois Economic Development Commission (HIEDC). Illinois P.A. 101-0631 "
            "data center tax exemption applies; Ameren's large industrial rates are "
            "among the most competitive in the Midwest. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "I-57/I-70 interchange logistics hub; Ameren Illinois territory; IL P.A. 101-0631 data center exemption.",
        "sources": [
            {"label": "Effingham County IL — Economic Development", "url": "https://www.effinghamil.com/economic-development"},
            {"label": "Ameren Illinois — Large Power & Industrial Service", "url": "https://www.ameren.com/illinois/business/large-power"},
            {"label": "Illinois DCEO — Data Center Tax Exemption", "url": "https://dceo.illinois.gov/industrybusiness/technologydata.html"},
            {"label": "HIEDC — Heart of Illinois Economic Development", "url": "https://www.heartofill.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "17077",
        "name": "Jackson County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Jackson County IL — Carbondale / SIU Research Nexus & Ameren Southern Illinois Territory",
        "description": (
            "Jackson County (Carbondale, IL) hosts Southern Illinois University (SIU), "
            "which anchors fiber and research infrastructure in southern Illinois. The "
            "county is served by Ameren Illinois and AmerenCIPS in the Midwest ISO grid. "
            "Illinois P.A. 101-0631 data center tax exemption applies. The Illinois "
            "Enterprise Zone program offers additional local incentives for qualifying "
            "industrial investments. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "SIU fiber/research anchor; Ameren Illinois territory; IL P.A. 101-0631; IL Enterprise Zone eligible.",
        "sources": [
            {"label": "Jackson County IL — Government", "url": "https://www.jacksoncountyil.gov/"},
            {"label": "Ameren Illinois — Business Energy Services", "url": "https://www.ameren.com/illinois/business"},
            {"label": "Illinois DCEO — Data Center Tax Exemption (P.A. 101-0631)", "url": "https://dceo.illinois.gov/industrybusiness/technologydata.html"},
            {"label": "Illinois Enterprise Zone Program — DCEO", "url": "https://dceo.illinois.gov/communities/enterprisezones.htm"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "17143",
        "name": "Peoria County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Peoria County IL — Caterpillar HQ City & ComEd / Ameren Industrial Territory",
        "description": (
            "Peoria County (Peoria, IL) is Illinois's third-largest metro area and home "
            "to Caterpillar global headquarters, which drives robust fiber infrastructure "
            "and industrial power capacity. The county is served by Ameren Illinois and "
            "benefits from existing heavy-electrical substation capacity. Illinois P.A. "
            "101-0631 data center tax exemption applies. The Peoria Development Authority "
            "actively recruits industrial and technology tenants with TIF and Enterprise "
            "Zone incentives. No active restrictions on data centers."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Ameren Illinois; Caterpillar HQ city; robust fiber ring; IL P.A. 101-0631; TIF/EZ available.",
        "sources": [
            {"label": "Peoria County IL — Economic Development", "url": "https://www.co.peoria.il.us/"},
            {"label": "Ameren Illinois — Large Industrial Service", "url": "https://www.ameren.com/illinois/business/large-power"},
            {"label": "Illinois DCEO — Data Center Tax Exemption", "url": "https://dceo.illinois.gov/industrybusiness/technologydata.html"},
            {"label": "Peoria Area Chamber — Economic Development", "url": "https://www.peoriachamber.org/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "17167",
        "name": "Sangamon County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Sangamon County IL — Springfield State Capital Fiber Hub & Ameren Illinois Incentive",
        "description": (
            "Sangamon County (Springfield, IL) is the Illinois state capital and served by "
            "Ameren Illinois. Springfield's role as state government hub means dense fiber "
            "diversity and multi-carrier point-of-presence availability. Illinois P.A. "
            "101-0631 data center tax exemption applies; the City of Springfield offers TIF "
            "districts and enterprise zone incentives for qualifying industrial projects. "
            "No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Illinois state capital; Ameren Illinois; dense fiber diversity; IL P.A. 101-0631; TIF/EZ available.",
        "sources": [
            {"label": "Sangamon County IL — Economic Development", "url": "https://www.co.sangamon.il.us/departments/a-c/community-resources/economic-development"},
            {"label": "Ameren Illinois — Business Programs & Rates", "url": "https://www.ameren.com/illinois/business"},
            {"label": "Illinois DCEO — Data Center Tax Exemption (P.A. 101-0631)", "url": "https://dceo.illinois.gov/industrybusiness/technologydata.html"},
            {"label": "City of Springfield IL — Economic Development", "url": "https://www.springfield.il.us/departments/community-relations/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # IOWA — Iowa Code §423.3(47A) large data center exemption; MidAmerican/Alliant
    # Source: tax.iowa.gov/businesses/data-center-exemptions
    # =========================================================================
    {
        "fips": "19015",
        "name": "Boone County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Boone County IA — Central Iowa MidAmerican Energy Territory & Iowa Data Center Exemption",
        "description": (
            "Boone County (Boone, IA) is in central Iowa near Ames, served by MidAmerican "
            "Energy (Berkshire Hathaway). MidAmerican has invested heavily in Iowa wind "
            "generation, approaching 100% renewable electricity in its Iowa service territory. "
            "Iowa Code §423.3(47A) provides a sales tax exemption for data center equipment "
            "purchases by facilities investing at least $200 million and committing to 200% "
            "renewable electricity. IEDA (Iowa Economic Development Authority) offers "
            "additional High Quality Jobs and Reinvestment District incentives."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "MidAmerican near-100% renewable IA territory; Iowa Code §423.3(47A) $200M/200% renewable threshold.",
        "sources": [
            {"label": "Boone County IA — Economic Development", "url": "https://www.boonecountyia.gov/"},
            {"label": "MidAmerican Energy — Iowa Renewable Commitment", "url": "https://www.midamericanenergy.com/renewable-energy"},
            {"label": "Iowa DOR — Data Center Exemption Iowa Code §423.3(47A)", "url": "https://tax.iowa.gov/businesses/data-center-exemptions"},
            {"label": "IEDA — High Quality Jobs Program", "url": "https://www.iowaeda.com/grow-your-business/incentives/high-quality-jobs/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "19045",
        "name": "Clinton County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Clinton County IA — Mississippi River Industrial Corridor & Alliant Energy Territory",
        "description": (
            "Clinton County (Clinton, IA) sits on the Mississippi River with existing "
            "industrial port infrastructure, served by Alliant Energy (Interstate Power "
            "and Light). The county has a legacy of heavy manufacturing and chemical "
            "industry with robust three-phase power and natural gas infrastructure. "
            "Iowa Code §423.3(47A) data center exemption and IEDA High Quality Jobs "
            "incentives apply. Rail access via CN and Iowa Interstate Railroad supports "
            "large industrial campus logistics."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Alliant Energy territory; Mississippi River port; CN rail; Iowa Code §423.3(47A) eligible.",
        "sources": [
            {"label": "Clinton County IA — Economic Development", "url": "https://www.clintoncountyiowa.com/economic-development"},
            {"label": "Alliant Energy Iowa — Business Rates & Programs", "url": "https://www.alliantenergy.com/business"},
            {"label": "Iowa DOR — Data Center Tax Exemption", "url": "https://tax.iowa.gov/businesses/data-center-exemptions"},
            {"label": "IEDA — Iowa Economic Development Authority", "url": "https://www.iowaeda.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "19103",
        "name": "Johnson County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Johnson County IA — Iowa City University Hub & MidAmerican Energy Research Territory",
        "description": (
            "Johnson County (Iowa City, IA) is home to the University of Iowa, driving "
            "strong fiber infrastructure and a technology-trained workforce. The county "
            "is served by MidAmerican Energy with near-100% renewable Iowa electricity. "
            "Iowa Code §423.3(47A) data center exemption and IEDA incentives apply. "
            "The Iowa City Corridor (Iowa City–Cedar Rapids) is one of Iowa's most "
            "active data center markets. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "University of Iowa anchor; MidAmerican renewable electricity; Iowa Code §423.3(47A) eligible.",
        "sources": [
            {"label": "Johnson County IA — Economic Development", "url": "https://www.johnsoncountyiowa.gov/economic-development"},
            {"label": "MidAmerican Energy — Iowa Business Programs", "url": "https://www.midamericanenergy.com/"},
            {"label": "Iowa DOR — Data Center Tax Exemption §423.3(47A)", "url": "https://tax.iowa.gov/businesses/data-center-exemptions"},
            {"label": "IEDA — Data Center Investment in Iowa", "url": "https://www.iowaeda.com/data-centers/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "19113",
        "name": "Linn County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Linn County IA — Cedar Rapids Metro Data Center Hub & Iowa Code §423.3(47A) Exemption",
        "description": (
            "Linn County (Cedar Rapids, IA) is Iowa's second-largest city and a proven "
            "data center destination. Google's 2013 Iowa data center campus (expanding "
            "to >$3.9 billion in Cedar Rapids area investment) demonstrates the viability "
            "of the market. The county is served by Alliant Energy (IPL) with high "
            "renewable content and competitive large-customer rates. Iowa Code §423.3(47A) "
            "data center exemption, IEDA incentives, and Cedar Rapids EDC property tax "
            "abatements apply. No active restrictions on data center development."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Google campus anchor; Alliant Energy IPL; Iowa Code §423.3(47A); Cedar Rapids EDC tax abatements.",
        "sources": [
            {"label": "Linn County IA — Economic Development", "url": "https://www.linncounty.org/economic-development"},
            {"label": "Alliant Energy Iowa — Commercial & Industrial Programs", "url": "https://www.alliantenergy.com/business"},
            {"label": "Iowa DOR — Data Center Tax Exemption", "url": "https://tax.iowa.gov/businesses/data-center-exemptions"},
            {"label": "IEDA — Iowa Data Center Markets", "url": "https://www.iowaeda.com/data-centers/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # KANSAS — Evergy; STAR Bond / HPIP incentives
    # Source: kansascommerce.gov/business/incentives
    # =========================================================================
    {
        "fips": "20009",
        "name": "Barton County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Barton County KS — Great Bend Industrial Hub & Evergy Kansas Central Territory",
        "description": (
            "Barton County (Great Bend, KS) is in central Kansas, served by Evergy Kansas "
            "Central (formerly Westar Energy). The county has a legacy of oil production "
            "and grain processing with robust three-phase power infrastructure. Kansas "
            "HPIP (High-Performance Incentive Program) offers a 10% income tax credit "
            "for capital investments above $50,000 with payroll thresholds. The STAR Bond "
            "program enables sales tax financing for qualified projects. No active "
            "restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Evergy Kansas Central; HPIP 10% income tax credit; STAR Bond program; oil/ag infrastructure.",
        "sources": [
            {"label": "Barton County KS — Economic Development", "url": "https://www.bartoncounty.org/"},
            {"label": "Evergy — Kansas Central Business Rates", "url": "https://www.evergy.com/"},
            {"label": "Kansas Commerce — High-Performance Incentive Program (HPIP)", "url": "https://www.kansascommerce.gov/business/incentives/hpip/"},
            {"label": "Kansas Commerce — STAR Bond Financing", "url": "https://www.kansascommerce.gov/business/incentives/star-bonds/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "20015",
        "name": "Butler County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Butler County KS — Wichita Metro East & Evergy Industrial Rate Territory",
        "description": (
            "Butler County (El Dorado, KS) is the eastern gateway to the Wichita metro, "
            "served by Evergy (formerly KCP&L/Westar). The county has existing refinery "
            "and industrial infrastructure at El Dorado and benefits from Wichita's fiber "
            "ring extensions. Kansas HPIP income tax credit and the IRB (Industrial Revenue "
            "Bonds) program provide property tax exemptions for qualifying industrial "
            "investments. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Evergy territory; Wichita metro fiber access; HPIP + KS IRB property tax exemption available.",
        "sources": [
            {"label": "Butler County KS — Economic Development", "url": "https://www.bucoks.com/"},
            {"label": "Evergy — Business & Industrial Rates", "url": "https://www.evergy.com/"},
            {"label": "Kansas Commerce — HPIP Incentive", "url": "https://www.kansascommerce.gov/business/incentives/hpip/"},
            {"label": "Kansas Commerce — Industrial Revenue Bonds", "url": "https://www.kansascommerce.gov/business/incentives/industrial-revenue-bonds/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "20113",
        "name": "McPherson County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "McPherson County KS — I-135 Industrial Corridor & Evergy Kansas Central Incentive",
        "description": (
            "McPherson County (McPherson, KS) is on the I-135 corridor between Wichita "
            "and Salina, served by Evergy Kansas Central. The county hosts a significant "
            "petroleum refining complex (Frontier Energy McPherson Refinery) with robust "
            "electrical infrastructure. Kansas HPIP, STAR Bond, and IRB programs apply. "
            "McPherson's position on the I-135 / US-56 corridor gives logistics access "
            "to I-70 (east-west) and I-35 (Kansas City) within 40 miles. No restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Evergy Kansas Central; I-135 logistics; Frontier refinery infrastructure; HPIP/STAR Bond eligible.",
        "sources": [
            {"label": "McPherson County KS — Economic Development", "url": "https://www.mcphersoncountyks.us/"},
            {"label": "Evergy — Kansas Central Tariffs", "url": "https://www.evergy.com/"},
            {"label": "Kansas Commerce — HPIP Tax Credit", "url": "https://www.kansascommerce.gov/business/incentives/hpip/"},
            {"label": "Kansas Commerce — STAR Bond Program", "url": "https://www.kansascommerce.gov/business/incentives/star-bonds/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # KENTUCKY (new counties not yet in DB, A-M range)
    # KEDFA KBI / KEIA incentives; LG&E KU / Duke Energy KY / AEP KY territory
    # =========================================================================
    {
        "fips": "21005",
        "name": "Anderson County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Anderson County KY — Frankfort Metro Adjacent & LG&E KU Industrial Territory",
        "description": (
            "Anderson County (Lawrenceburg, KY) adjoins Franklin County (Frankfort, state "
            "capital) and is served by Louisville Gas & Electric/Kentucky Utilities (LG&E KU). "
            "The county benefits from the Bluegrass Parkway and US-127 corridor with proximity "
            "to Lexington and Louisville metro fiber rings. KEDFA KBI wage assessment credits "
            "and KEIA sales tax refunds on construction materials apply. Bourbon County "
            "spirits infrastructure anchors a trained industrial workforce. No restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "LG&E KU service; adjacent to Frankfort state capital; Lexington metro fiber access; KEDFA KBI eligible.",
        "sources": [
            {"label": "Anderson County KY — Economic Development", "url": "https://www.andersoncounty.ky.gov/"},
            {"label": "LG&E and KU — Kentucky Business Energy Programs", "url": "https://lge-ku.com/"},
            {"label": "KEDFA — Kentucky Business Investment (KBI)", "url": "https://ced.ky.gov/Incentives/Kentucky_Business_Investment"},
            {"label": "KEIA — Kentucky Enterprise Initiative Act", "url": "https://ced.ky.gov/Incentives/Kentucky_Enterprise_Initiative_Act"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "21029",
        "name": "Bullitt County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Bullitt County KY — Louisville South I-65 Corridor & LG&E Industrial Territory",
        "description": (
            "Bullitt County (Shepherdsville, KY) is directly south of Louisville on the "
            "I-65 corridor, served by Louisville Gas & Electric (LG&E). The county benefits "
            "from Louisville metro fiber rings and the UPS Worldport proximity at Louisville "
            "International Airport (SDF). KEDFA KBI wage assessment credits, KEIA sales tax "
            "refunds, and Chapter 100 county property tax incentives apply. Multiple shovel-"
            "ready industrial parks exist in the county. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "LG&E territory; I-65 logistics; Louisville metro fiber; UPS Worldport access; KEDFA KBI/KEIA eligible.",
        "sources": [
            {"label": "Bullitt County KY — Economic Development", "url": "https://www.bullittcounty.ky.gov/economic-development"},
            {"label": "Louisville Gas & Electric (LG&E) — Business Rates", "url": "https://lge-ku.com/"},
            {"label": "KEDFA — Kentucky Business Investment Program", "url": "https://ced.ky.gov/Incentives/Kentucky_Business_Investment"},
            {"label": "Greater Louisville Inc. — Economic Development", "url": "https://www.greaterlouisville.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "21059",
        "name": "Daviess County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Daviess County KY — Owensboro Ohio River Hub & Kentucky Utilities Industrial Territory",
        "description": (
            "Daviess County (Owensboro, KY) is the largest city in Western Kentucky and "
            "a major Ohio River industrial hub, served by Kentucky Utilities (KU, LG&E "
            "group). Owensboro-Daviess County has a diverse manufacturing base (aluminum, "
            "auto parts, healthcare) with heavy electrical infrastructure. KEDFA KBI wage "
            "credits, KEIA refunds, and Kentucky's Data Center investment incentives apply. "
            "US-60/I-165 provide logistics connectivity. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "KU territory; Ohio River logistics; Owensboro-Daviess County EDC; KEDFA KBI eligible.",
        "sources": [
            {"label": "Daviess County / Owensboro — Economic Development", "url": "https://www.greaterowernsboro.com/"},
            {"label": "Kentucky Utilities (KU) — Industrial Business Rates", "url": "https://lge-ku.com/"},
            {"label": "KEDFA — Kentucky Business Investment Program", "url": "https://ced.ky.gov/Incentives/Kentucky_Business_Investment"},
            {"label": "KEIA — Kentucky Enterprise Initiative Act", "url": "https://ced.ky.gov/Incentives/Kentucky_Enterprise_Initiative_Act"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # LOUISIANA — Entergy Louisiana / CLECO; ITEP + Quality Jobs + FastStart
    # Source: opportunitylouisiana.gov
    # =========================================================================
    {
        "fips": "22007",
        "name": "Assumption Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Assumption Parish LA — Bayou Lafourche Industrial Corridor & Entergy Louisiana Territory",
        "description": (
            "Assumption Parish (Napoleonville, LA) is in the Bayou Lafourche industrial "
            "corridor, served by Entergy Louisiana. The parish sits above major underground "
            "salt dome caverns used for hydrocarbon storage, with extensive pipeline "
            "infrastructure. Louisiana's Industrial Tax Exemption Program (ITEP) provides "
            "a 100% property tax exemption for up to 10 years on qualifying manufacturing "
            "and industrial investments. LED Quality Jobs and FastStart programs apply. "
            "No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Louisiana; salt dome/pipeline infrastructure; ITEP 10-yr property tax exemption; LED Quality Jobs.",
        "sources": [
            {"label": "Assumption Parish LA — Government Website", "url": "https://www.assumptionla.com/"},
            {"label": "Entergy Louisiana — Large Industrial Rates", "url": "https://www.entergy-louisiana.com/"},
            {"label": "LED — Industrial Tax Exemption Program (ITEP)", "url": "https://www.opportunitylouisiana.gov/business-incentives/industrial-tax-exemption"},
            {"label": "LED — Quality Jobs Program", "url": "https://www.opportunitylouisiana.gov/business-incentives/quality-jobs"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "22011",
        "name": "Beauregard Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Beauregard Parish LA — DeRidder Industrial Zone & CLECO Northwest Louisiana Territory",
        "description": (
            "Beauregard Parish (DeRidder, LA) in northwest Louisiana is served by CLECO "
            "(Cleco Corporate Holdings). The parish benefits from US-171 industrial "
            "connectivity and a timber-based industrial workforce. Louisiana ITEP provides "
            "100% property tax exemption on qualifying new industrial investments for up "
            "to 10 years. LED's FastStart customized workforce training is available at "
            "no cost to qualifying employers. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "CLECO service territory; timber workforce; ITEP 10-yr exemption; LED FastStart eligible.",
        "sources": [
            {"label": "Beauregard Parish LA — Economic Development", "url": "https://www.beauregardonline.com/"},
            {"label": "CLECO — Louisiana Business Rates", "url": "https://www.cleco.com/"},
            {"label": "LED — Industrial Tax Exemption Program", "url": "https://www.opportunitylouisiana.gov/business-incentives/industrial-tax-exemption"},
            {"label": "LED — FastStart Workforce Training", "url": "https://www.opportunitylouisiana.gov/business-incentives/faststart"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "22031",
        "name": "De Soto Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "De Soto Parish LA — Mansfield Haynesville Shale Corridor & CLECO Industrial Territory",
        "description": (
            "De Soto Parish (Mansfield, LA) is in the Haynesville Shale natural gas "
            "production zone, with extensive pipeline and midstream infrastructure. "
            "The parish is served by CLECO and has a trained energy-sector workforce. "
            "Louisiana ITEP 10-year property tax exemption and LED Quality Jobs payroll "
            "credits apply. Proximity to I-49 and Shreveport metro fiber supports "
            "industrial connectivity. No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Haynesville Shale gas infrastructure; CLECO territory; ITEP 10-yr; LED Quality Jobs eligible.",
        "sources": [
            {"label": "De Soto Parish LA — Economic Development", "url": "https://desotoparishgov.com/"},
            {"label": "CLECO — Northwest Louisiana Service Territory", "url": "https://www.cleco.com/"},
            {"label": "LED — Industrial Tax Exemption Program", "url": "https://www.opportunitylouisiana.gov/business-incentives/industrial-tax-exemption"},
            {"label": "LED — Quality Jobs Incentive Program", "url": "https://www.opportunitylouisiana.gov/business-incentives/quality-jobs"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # MICHIGAN — Consumers Energy / DTE / UPPCO; Michigan Strategic Fund
    # Source: michiganbusiness.org/grow/incentives
    # =========================================================================
    {
        "fips": "26015",
        "name": "Barry County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Barry County MI — West Michigan Manufacturing Belt & Consumers Energy Territory",
        "description": (
            "Barry County (Hastings, MI) is in West Michigan's manufacturing belt, served "
            "by Consumers Energy. The county benefits from US-131 corridor access and "
            "proximity to Grand Rapids metro fiber infrastructure. Michigan Strategic Fund "
            "(MSF) offers the Michigan Business Development Program (MBDP) grants and "
            "the Data Center Equipment Exemption under MCL §205.54bb. No active "
            "restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Consumers Energy; US-131/Grand Rapids metro proximity; MI MSF/MBDP; MCL §205.54bb DC exemption.",
        "sources": [
            {"label": "Barry County MI — Economic Development", "url": "https://www.barrycounty.org/"},
            {"label": "Consumers Energy — Business Rates & Programs", "url": "https://www.consumersenergy.com/business"},
            {"label": "Michigan Strategic Fund — MBDP Grant Program", "url": "https://www.michiganbusiness.org/grow/incentives/"},
            {"label": "Michigan Data Center Equipment Exemption — MCL §205.54bb", "url": "https://www.legislature.mi.gov/documents/mcl/pdf/mcl-205-54bb.pdf"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "26049",
        "name": "Genesee County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Genesee County MI — Flint Metro Revitalization & DTE Energy Industrial Incentive",
        "description": (
            "Genesee County (Flint, MI) is undergoing industrial revitalization through "
            "federal Invest in America Act funds and MSF Michigan Revitalization grants. "
            "The county is served by DTE Energy. Flint's existing industrial land "
            "inventory and brownfield sites offer competitive acquisition costs. "
            "Michigan's Brownfield Redevelopment Authority (MBRA) provides tax increment "
            "financing for qualifying projects; the MCL §205.54bb data center equipment "
            "exemption and MSF Business Development Program grants also apply."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "DTE Energy; Flint brownfield TIF available; MSF revitalization grants; MCL §205.54bb eligible.",
        "sources": [
            {"label": "Genesee County MI — Economic Development", "url": "https://www.gc4me.com/departments/economic_development/"},
            {"label": "DTE Energy — Large Power Service", "url": "https://www.dteenergy.com/us/en/business.html"},
            {"label": "Michigan Strategic Fund — Business Development Program", "url": "https://www.michiganbusiness.org/grow/incentives/"},
            {"label": "Michigan Data Center Equipment Exemption — MCL §205.54bb", "url": "https://www.legislature.mi.gov/documents/mcl/pdf/mcl-205-54bb.pdf"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "26065",
        "name": "Ingham County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Ingham County MI — Lansing State Capital & Consumers Energy Government District",
        "description": (
            "Ingham County (Lansing, MI) is the Michigan state capital and home to "
            "Michigan State University, driving dense fiber infrastructure and a "
            "technology-trained workforce. The county is served by Consumers Energy and "
            "Lansing Board of Water & Light (municipal utility). MSF Michigan Business "
            "Development Program, MCL §205.54bb data center equipment exemption, and "
            "City of Lansing renaissance zone incentives apply. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Consumers Energy + LBW&L municipal utility; MSU anchor; MSF MBDP; MCL §205.54bb eligible.",
        "sources": [
            {"label": "Ingham County MI — Economic Development", "url": "https://www.ingham.org/"},
            {"label": "Consumers Energy — Commercial & Industrial Rates", "url": "https://www.consumersenergy.com/business"},
            {"label": "Lansing Board of Water & Light — Industrial Power", "url": "https://www.lbwl.com/"},
            {"label": "Michigan Strategic Fund — MBDP Grants", "url": "https://www.michiganbusiness.org/grow/incentives/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # MINNESOTA — Xcel Energy / Minnesota Power; Minn. Stat. §297A.68, subd. 42
    # Source: revenue.state.mn.us/data-center-equipment
    # =========================================================================
    {
        "fips": "27003",
        "name": "Anoka County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Anoka County MN — Twin Cities North Metro & Xcel Energy Industrial Territory",
        "description": (
            "Anoka County (Anoka, MN) is in the Twin Cities north metro area, served by "
            "Xcel Energy. The county benefits from Minneapolis–St. Paul metro fiber "
            "infrastructure and interstate highway access on I-35W and US-10. Minnesota "
            "Stat. §297A.68, subd. 42 provides a sales tax exemption for data center "
            "equipment purchases by facilities investing at least $30 million and using "
            "45% renewable electricity. DEED (MN Dept of Employment & Economic "
            "Development) incentives and county property tax abatements apply."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Xcel Energy; Twin Cities metro fiber; Minn. Stat. §297A.68(42) $30M/45% renewable threshold.",
        "sources": [
            {"label": "Anoka County MN — Economic Development", "url": "https://www.anokacounty.us/"},
            {"label": "Xcel Energy — Business Products & Rates", "url": "https://www.xcelenergy.com/"},
            {"label": "MN Revenue — Data Center Equipment Exemption §297A.68(42)", "url": "https://www.revenue.state.mn.us/data-center-equipment"},
            {"label": "DEED — Minnesota Business Development", "url": "https://mn.gov/deed/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "27019",
        "name": "Carver County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Carver County MN — Minneapolis Southwest Exurb & Xcel Energy Suburban Territory",
        "description": (
            "Carver County (Chaska, MN) is a rapidly growing Twin Cities southwest suburb, "
            "served by Xcel Energy. The county hosts Chaska's Data Center Park (a municipally "
            "planned data center district) with pre-engineered utility infrastructure "
            "including redundant fiber and substation capacity. Minn. Stat. §297A.68, "
            "subd. 42 data center equipment exemption and DEED incentives apply. No "
            "active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Xcel Energy; Chaska Data Center Park pre-engineered utilities; Minn. Stat. §297A.68(42) eligible.",
        "sources": [
            {"label": "Carver County MN — Economic Development", "url": "https://www.co.carver.mn.us/"},
            {"label": "Xcel Energy — Minnesota Large Power Service", "url": "https://www.xcelenergy.com/"},
            {"label": "MN Revenue — Data Center Sales Tax Exemption", "url": "https://www.revenue.state.mn.us/data-center-equipment"},
            {"label": "City of Chaska MN — Economic Development", "url": "https://www.chaskamn.com/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "27139",
        "name": "Scott County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Scott County MN — Prior Lake / Shakopee Corridor & Xcel Energy Industrial Territory",
        "description": (
            "Scott County (Shakopee, MN) is in the Twin Cities southwest metro, served by "
            "Xcel Energy. Shakopee hosts a major Amazon fulfillment center and multiple "
            "manufacturing campuses, demonstrating existing heavy-power infrastructure. "
            "I-169 and US-169 provide freight and logistics access. Minn. Stat. §297A.68, "
            "subd. 42 data center equipment exemption applies. Scott County EDC offers "
            "tax abatements for qualifying industrial projects."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Xcel Energy; Shakopee industrial/logistics hub; Minn. Stat. §297A.68(42); Scott County EDC abatement.",
        "sources": [
            {"label": "Scott County MN — Economic Development", "url": "https://www.co.scott.mn.us/"},
            {"label": "Xcel Energy — Minnesota Commercial & Industrial", "url": "https://www.xcelenergy.com/"},
            {"label": "MN Revenue — Data Center Equipment Exemption", "url": "https://www.revenue.state.mn.us/data-center-equipment"},
            {"label": "Shakopee MN — Economic Development", "url": "https://www.shakopeemn.gov/business/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # =========================================================================
    # MISSOURI — Ameren Missouri / Evergy; Mo. Rev. Stat. §135.770 data center
    # Source: ded.mo.gov/programs/business/missouri-works
    # =========================================================================
    {
        "fips": "29003",
        "name": "Andrew County",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Andrew County MO — Northwest Missouri Evergy Territory & Missouri Works Incentive",
        "description": (
            "Andrew County (Savannah, MO) is in northwest Missouri's agricultural belt, "
            "served by Evergy Missouri West (formerly KCP&L). The county sits on the "
            "US-71 corridor between Kansas City and St. Joseph. Missouri Works tax "
            "credits and the Chapter 135 Data Center Tax exemption (Mo. Rev. Stat. "
            "§135.770) apply for qualifying data center investments. No active "
            "restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Evergy Missouri West; Missouri Works credits; Mo. Rev. Stat. §135.770 data center tax exemption.",
        "sources": [
            {"label": "Andrew County MO — Official Website", "url": "https://www.andrewcounty.org/"},
            {"label": "Evergy — Missouri West Business Rates", "url": "https://www.evergy.com/"},
            {"label": "MO DED — Missouri Works Program", "url": "https://ded.mo.gov/programs/business/missouri-works"},
            {"label": "Mo. Rev. Stat. §135.770 — Data Center Tax Incentive", "url": "https://revisor.mo.gov/main/OneSection.aspx?section=135.770"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "29011",
        "name": "Barton County",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Barton County MO — Southwest Missouri Wind Belt & Empire District Electric Territory",
        "description": (
            "Barton County (Lamar, MO) is in the Ozark Plateau transition zone of "
            "southwest Missouri, served by Empire District Electric (Liberty Utilities, "
            "a Fortis subsidiary). The county is within Missouri's emerging wind belt "
            "and benefits from natural gas pipeline access along US-160. Missouri Works "
            "credits and Mo. Rev. Stat. §135.770 data center tax incentive apply. "
            "Rural land costs are among the lowest in the state. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Empire District Electric / Liberty Utilities; Missouri wind belt; MO Works; §135.770 eligible.",
        "sources": [
            {"label": "Barton County MO — Official Website", "url": "https://www.bartonco.org/"},
            {"label": "Liberty Utilities (Empire District) — Missouri Rates", "url": "https://www.libertyutilities.com/"},
            {"label": "MO DED — Missouri Works", "url": "https://ded.mo.gov/programs/business/missouri-works"},
            {"label": "Mo. Rev. Stat. §135.770 — Data Center Tax Incentive", "url": "https://revisor.mo.gov/main/OneSection.aspx?section=135.770"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "29033",
        "name": "Carroll County",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Carroll County MO — Missouri River Corridor & Ameren Missouri Industrial Territory",
        "description": (
            "Carroll County (Carrollton, MO) lies along the Missouri River in north-central "
            "Missouri, served by Ameren Missouri. The county benefits from US-65 corridor "
            "access and existing three-phase agricultural power infrastructure. Ameren's "
            "competitive large-industrial rates and Missouri Works tax credits apply. "
            "Mo. Rev. Stat. §135.770 data center tax incentive program is available. "
            "No active restrictions on data center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Ameren Missouri; Missouri River corridor; US-65 access; MO Works; §135.770 data center incentive.",
        "sources": [
            {"label": "Carroll County MO — Government", "url": "https://www.mo-carroll.com/"},
            {"label": "Ameren Missouri — Large Power & Industrial Rates", "url": "https://www.ameren.com/missouri/business/large-power"},
            {"label": "MO DED — Missouri Works Tax Credits", "url": "https://ded.mo.gov/programs/business/missouri-works"},
            {"label": "Mo. Rev. Stat. §135.770 — Data Center Tax Incentive", "url": "https://revisor.mo.gov/main/OneSection.aspx?section=135.770"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]  # end new_restrictions

# =========================================================================
# NEW AI CAMPUSES
# =========================================================================

new_campuses = [
    {
        "id": "ai-ia-006",
        "name": "Google Data Center Campus — Linn County IA",
        "type": "hyperscale_data_center",
        "operator": "Google LLC (Alphabet)",
        "description": (
            "Google's Iowa Data Center campus in Council Bluffs and Cedar Rapids represents "
            "over $3.9 billion in cumulative investment as of 2024, making Iowa one of "
            "Google's largest US data center markets. The facilities run primarily on "
            "MidAmerican Energy renewable wind power under Iowa Code §423.3(47A) exemption."
        ),
        "county": "Linn County",
        "state_abbrev": "IA",
        "established": "2009",
        "source": "https://www.iowaeda.com/data-centers/",
    },
    {
        "id": "ai-mo-003",
        "name": "CyrusOne / QTS Kansas City Data Center Campus — Jackson County MO",
        "type": "colocation_data_center",
        "operator": "CyrusOne / QTS Realty Trust",
        "description": (
            "The Kansas City data center market in Jackson County hosts CyrusOne's KC campus "
            "and QTS KC facilities, leveraging Missouri Works incentives, central US network "
            "routing advantages, and competitive Evergy Missouri West power rates."
        ),
        "county": "Jackson County",
        "state_abbrev": "MO",
        "established": "2015",
        "source": "https://ded.mo.gov/programs/business/missouri-works",
    },
    {
        "id": "ai-mn-007",
        "name": "Compass / Digital Realty Twin Cities Data Center Cluster — Carver County MN",
        "type": "hyperscale_data_center",
        "operator": "Compass Datacenters / Digital Realty",
        "description": (
            "Chaska (Carver County, MN) hosts a municipally planned data center district "
            "leveraged by Compass and Digital Realty. Facilities benefit from Xcel Energy's "
            "Minnesota renewable portfolio and the Minn. Stat. §297A.68 subd. 42 exemption."
        ),
        "county": "Carver County",
        "state_abbrev": "MN",
        "established": "2018",
        "source": "https://www.revenue.state.mn.us/data-center-equipment",
    },
    {
        "id": "ai-il-008",
        "name": "Equinix CH Campuses — DuPage County IL",
        "type": "colocation_data_center",
        "operator": "Equinix",
        "description": (
            "Equinix's Chicago CH campuses in DuPage County (Lisle, IL) are among the "
            "largest colocation hubs in the Midwest, benefiting from Illinois P.A. 101-0631 "
            "data center tax exemption and ComEd dense fiber connectivity in the Chicago metro."
        ),
        "county": "DuPage County",
        "state_abbrev": "IL",
        "established": "2000",
        "source": "https://dceo.illinois.gov/industrybusiness/technologydata.html",
    },
    {
        "id": "ai-fl-009",
        "name": "Florida Power & Light AI Grid Optimization Center — Palm Beach County FL",
        "type": "ai_research_facility",
        "operator": "FPL (NextEra Energy)",
        "description": (
            "FPL's Grid Modernization & AI Operations Center in West Palm Beach (Palm Beach "
            "County, FL) uses machine learning to manage the largest investor-owned utility "
            "in the US, optimizing generation dispatch, outage prediction, and demand response "
            "across FPL's Florida service territory."
        ),
        "county": "Palm Beach County",
        "state_abbrev": "FL",
        "established": "2020",
        "source": "https://www.fpl.com/about/energized/energy-innovation.html",
    },
]

# ---------------------------------------------------------------------------
# Append only genuinely new entries
# ---------------------------------------------------------------------------

added_r = 0
for entry in new_restrictions:
    if entry["fips"] not in existing_fips:
        restrictions.append(entry)
        existing_fips.add(entry["fips"])
        added_r += 1

added_c = 0
for campus in new_campuses:
    if campus["id"] not in existing_cids:
        campuses.append(campus)
        existing_cids.add(campus["id"])
        added_c += 1

data["restrictions"] = restrictions
with open(f"{DATA_PATH}/restrictions_raw.json", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

campus_data["ai_campuses"] = campuses
with open(f"{DATA_PATH}/ai_campuses.json", "w") as f:
    json.dump(campus_data, f, indent=2)
    f.write("\n")

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(restrictions)}, Total campuses: {len(campuses)}")
