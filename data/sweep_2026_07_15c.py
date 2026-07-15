"""
Sweep C  —  2026-07-15
16 new county restrictions · 7 AI campuses · 3 tax incentives · 2 state regs
Targets: CA Inland Empire, FL Broward, IL Will, KS Johnson, LA East Baton Rouge,
         ME Cumberland, NY Nassau, NC Iredell, OH Hamilton, PA Bucks/Montgomery,
         UT Davis, VA Chesterfield, WA Snohomish, WI Milwaukee
"""

import json
import copy
from pathlib import Path

ROOT = Path(__file__).parent

# ── helpers ──────────────────────────────────────────────────────────────────

def load(name):
    with open(ROOT / name) as f:
        return json.load(f)

def save(name, obj):
    with open(ROOT / name, "w") as f:
        json.dump(obj, f, indent=2)


# ── 1. COUNTY RESTRICTIONS ───────────────────────────────────────────────────

NEW_RESTRICTIONS = [
    # ── California – Inland Empire ──────────────────────────────────────────
    {
        "fips": "06065",
        "name": "Riverside County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Major Data Center Corridor — Riverside / Inland Empire",
        "description": (
            "Riverside County anchors the Inland Empire data center corridor along I-15 and "
            "I-10. QTS Data Centers (now Digital Realty), Aligned Energy, and several "
            "wholesale colocation operators run hyperscale facilities in Norco and Mira Loma. "
            "California's favorable climate for air-side economization and lower land costs "
            "than the Bay Area have attracted sustained capital investment. The county's "
            "Riverside County Economic Development Agency actively recruits data center "
            "operators with streamlined permitting through the Select Riverside program."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Southern California Edison provides power; CalISO grid region.",
        "sources": [
            {"label": "Digital Realty — Riverside County Data Center", "url": "https://www.digitalrealty.com/data-centers/americas/los-angeles"},
            {"label": "Riverside County EDA — Select Riverside Program", "url": "https://rcedc.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "06071",
        "name": "San Bernardino County",
        "state": "California",
        "level": 1,
        "types": ["data_center", "water"],
        "title": "Data Center Water-Use Review — Inland Empire Groundwater Basin",
        "description": (
            "San Bernardino County hosts hyperscale data centers in Rialto, Fontana, and "
            "Victorville but faces increasing scrutiny over groundwater withdrawals from the "
            "Inland Empire Groundwater Basin. The Inland Empire Utilities Agency and local "
            "water districts imposed enhanced review requirements for large-scale evaporative "
            "cooling systems in 2022 after projections showed data center expansion could "
            "strain adjudicated basin allocations. Apple operates a large renewable-powered "
            "facility in the county. New facilities must submit a Water Supply Assessment "
            "for cooling-water use exceeding 25 acre-feet per year."
        ),
        "effective_date": "2022-06-01",
        "status": "active",
        "notes": "WSA requirement stems from IEUA Urban Water Management Plan update.",
        "sources": [
            {"label": "IEUA — Urban Water Management Plan 2020", "url": "https://www.ieua.org/about/planning/urban-water-management-plan/"},
            {"label": "San Bernardino County — Development Services", "url": "https://www.sbcounty.gov/departments/land-use-services/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Florida – Broward ────────────────────────────────────────────────────
    {
        "fips": "12011",
        "name": "Broward County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Established Data Center Market — Fort Lauderdale Metro",
        "description": (
            "Broward County hosts one of Florida's most active data center markets. "
            "CyrusOne operates a large campus in Pompano Beach; NTT Global Data Centers "
            "and T5 Data Centers have significant footprints in the county. "
            "Broward's position between Miami and Palm Beach, access to NAP of the Americas "
            "subsea cable terminus infrastructure, and Florida's exemption on data center "
            "equipment sales tax (§212.08(7)(fff) F.S.) make it a preferred location for "
            "financial services and enterprise disaster recovery workloads."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "FL 2021 data center sales tax exemption significantly boosted new investment.",
        "sources": [
            {"label": "CyrusOne — Pompano Beach Data Center", "url": "https://cyrusone.com/data-centers/north-america/florida/pompano-beach/"},
            {"label": "Florida Dept. of Revenue — §212.08 Exemptions", "url": "https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Illinois – Will County ───────────────────────────────────────────────
    {
        "fips": "17197",
        "name": "Will County",
        "state": "Illinois",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Hyperscale Data Center Campus — Joliet/Channahon Area",
        "description": (
            "Will County, southwest of Chicago, hosts Google's major data center campus "
            "near Channahon along the I-55 corridor. The campus, which began operations in "
            "2016 and has undergone multiple expansions, is powered substantially by Illinois "
            "wind energy. The county participates in ComEd's economic development rate for "
            "large commercial and industrial customers, which benefits hyperscale data center "
            "operators. Illinois' data center tax incentive (35 ILCS 110/2d — Enterprise Zone "
            "Act exemption for qualified servers) also applies to eligible Will County facilities."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Google Channahon campus is one of the largest in the Midwest.",
        "sources": [
            {"label": "Google Data Centers — Illinois", "url": "https://www.google.com/about/datacenters/locations/council-bluffs/"},
            {"label": "Will County Center for Economic Development", "url": "https://www.willcountyced.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Kansas – Johnson County ──────────────────────────────────────────────
    {
        "fips": "20091",
        "name": "Johnson County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Kansas City Metro Data Center Hub — Overland Park / Lenexa",
        "description": (
            "Johnson County anchors the Kansas City metropolitan data center market. "
            "Major facilities include Google Fiber's network hub, AT&T Central Office "
            "data centers in Overland Park, and several colocation operators serving "
            "Midwest enterprise clients. CenturyLink/Lumen Technologies maintains "
            "significant network infrastructure in the county. Kansas's data center "
            "incentive (K.S.A. 74-5065 — High Performance Incentive Program) provides "
            "investment tax credits for qualifying capital expenditures by operators "
            "meeting job-creation thresholds. Johnson County is consistently ranked "
            "among the top Midwest counties for business climate."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "Kansas City metro straddles the KS/MO state line; Johnson County is the KS side.",
        "sources": [
            {"label": "KANSASCOMMERCE — High Performance Incentive Program", "url": "https://www.kansascommerce.gov/program/incentives/high-performance-incentive-program/"},
            {"label": "Johnson County — Economic Development", "url": "https://www.jocogov.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Louisiana – East Baton Rouge ─────────────────────────────────────────
    {
        "fips": "22033",
        "name": "East Baton Rouge Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Major Data Center Hub — Baton Rouge / Lumen Technologies Campus",
        "description": (
            "East Baton Rouge Parish hosts Lumen Technologies' (formerly CenturyLink) "
            "headquarters and one of the company's largest network data center campuses. "
            "Digital Realty and Cologix operate carrier-neutral colocation facilities in "
            "the parish. Louisiana's Digital Media and Software Tax Credit (R.S. 47:6022) "
            "and the Quality Jobs Program provide financial incentives for technology "
            "companies meeting payroll thresholds. Entergy Louisiana's competitive "
            "industrial power rates and the parish's central location on the Gulf Coast "
            "fiber corridor make it a preferred hub for regional financial services and "
            "energy sector IT workloads."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Louisiana parishes are equivalent to counties in other states.",
        "sources": [
            {"label": "Lumen Technologies — Baton Rouge Campus", "url": "https://www.lumen.com/en-us/about/our-network.html"},
            {"label": "LED — Quality Jobs Program", "url": "https://www.opportunitylouisiana.gov/business-incentives/quality-jobs"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Maine – Cumberland County ────────────────────────────────────────────
    {
        "fips": "23005",
        "name": "Cumberland County",
        "state": "Maine",
        "level": 2,
        "types": ["data_center", "energy"],
        "title": "Data Center Siting Review — Portland Metro Energy Concerns",
        "description": (
            "Cumberland County, home to Portland, Maine's largest city, has seen growing "
            "data center interest driven by cold climate free-cooling advantages and "
            "proximity to Atlantic subsea cable landing sites. The Portland City Council "
            "adopted a resolution in 2024 directing the Planning Board to study large-scale "
            "data center siting impacts on the Unitil/CMP electric grid and local property "
            "tax base. Maine's renewable portfolio standard (35% by 2025, 80% by 2030) "
            "makes the region attractive for operators committed to clean-energy targets, "
            "but grid capacity constraints on CMP's transmission system have slowed "
            "permitting for large industrial electric loads."
        ),
        "effective_date": "2024-01-01",
        "status": "proposed",
        "notes": "Portland Planning Board study ongoing; no binding moratorium in effect.",
        "sources": [
            {"label": "Portland ME — Planning and Urban Development", "url": "https://www.portlandmaine.gov/175/Planning-Urban-Development"},
            {"label": "Maine PUC — Transmission Interconnection", "url": "https://www.maine.gov/mpuc/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── New York – Nassau County ─────────────────────────────────────────────
    {
        "fips": "36059",
        "name": "Nassau County",
        "state": "New York",
        "level": -1,
        "types": ["data_center"],
        "title": "Long Island Data Center Corridor — Garden City / Syosset",
        "description": (
            "Nassau County anchors Long Island's data center market with facilities in "
            "Garden City, Syosset, and Bethpage. Equinix NY11 in Syosset, along with "
            "DataGryd and Lightpath carrier-neutral facilities, serve financial services "
            "and media workloads requiring low latency to New York City. The county "
            "benefits from PSEG Long Island's reliable power infrastructure and proximity "
            "to the trans-Atlantic cable system terminus at Brookhaven. New York State's "
            "Excelsior Jobs Program and the Empire State Digital Infrastructure "
            "Investment Program provide tax credits for qualifying capital projects."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Nassau proximity to NYC financial district drives latency-sensitive workloads.",
        "sources": [
            {"label": "Equinix — NY11 Syosset Data Center", "url": "https://www.equinix.com/data-centers/americas-colocation/united-states-colocation/new-york-data-centers/ny11"},
            {"label": "Empire State Development — Excelsior Jobs Program", "url": "https://esd.ny.gov/excelsior-jobs-program"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── North Carolina – Iredell County ─────────────────────────────────────
    {
        "fips": "37097",
        "name": "Iredell County",
        "state": "North Carolina",
        "level": 1,
        "types": ["data_center", "water"],
        "title": "Data Center Cooling Water Review — Lake Norman Watershed",
        "description": (
            "Iredell County, on the Lake Norman reservoir northwest of Charlotte, has "
            "attracted data center interest due to plentiful Duke Energy power access and "
            "available industrial land. The Iredell County Board of Commissioners adopted "
            "a Data Center Impact Study Ordinance in 2023 requiring applicants for "
            "facilities over 20 MW to submit a Water Withdrawal and Discharge Impact "
            "Assessment to protect Lake Norman water quality. DXC Technology and several "
            "smaller colocation operators have existing facilities in Statesville. Duke "
            "Energy's McGuire Nuclear Station on Lake Norman provides reliable baseload "
            "power that hyperscale operators view favorably."
        ),
        "effective_date": "2023-04-01",
        "status": "active",
        "notes": "Impact Study Ordinance applies to new data center construction permits.",
        "sources": [
            {"label": "Iredell County — Planning & Development Services", "url": "https://www.iredellcountync.gov/278/Planning-Development"},
            {"label": "Duke Energy — Lake Norman Operations", "url": "https://www.duke-energy.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Ohio – Hamilton County ───────────────────────────────────────────────
    {
        "fips": "39061",
        "name": "Hamilton County",
        "state": "Ohio",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Major Data Center Investment — Cincinnati Metro",
        "description": (
            "Hamilton County anchors the Cincinnati data center market, which serves "
            "as a secondary hub to Columbus for Midwest cloud infrastructure. Amazon Web "
            "Services and Google maintain regional facilities in the Cincinnati metro. "
            "Cincinnati Bell Technology Solutions (now Zayo) operates carrier-neutral "
            "data centers with dense fiber connectivity. Ohio's Data Center Investment "
            "Tax Credit (ORC §5709.65) — 8% credit on capital expenditures above "
            "$100 million — applies to qualifying Hamilton County projects. Duke Energy "
            "Ohio provides competitive industrial rates under Schedule DCS."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "Cincinnati is the financial services/healthcare IT hub for the Ohio River corridor.",
        "sources": [
            {"label": "JobsOhio — Data Center Investment Program", "url": "https://www.jobsohio.com/why-ohio/target-industries/data-centers"},
            {"label": "Ohio Revised Code §5709.65 — Data Center Tax Credit", "url": "https://codes.ohio.gov/ohio-revised-code/section-5709.65"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Pennsylvania – Bucks County ──────────────────────────────────────────
    {
        "fips": "42017",
        "name": "Bucks County",
        "state": "Pennsylvania",
        "level": -1,
        "types": ["data_center"],
        "title": "Delaware Valley Data Center Corridor — Quakertown / Dublin",
        "description": (
            "Bucks County participates in the Philadelphia-area data center corridor "
            "that extends from Northern Virginia through New Jersey into southeastern "
            "Pennsylvania. NTT Global Data Centers and several wholesale colocation "
            "operators maintain facilities in Quakertown and the Route 309 technology "
            "corridor. PECO Energy's industrial electric rates and proximity to "
            "800+ carrier-class fiber routes along the I-476 corridor make Bucks County "
            "an attractive overflow market for Northern Virginia-capacity-constrained "
            "operators. Pennsylvania's Keystone Opportunity Zones (KOZ) include portions "
            "of Quakertown with reduced business and property taxes for qualifying tenants."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Part of the Mid-Atlantic data center corridor from NOVA to Philadelphia.",
        "sources": [
            {"label": "NTT Global Data Centers — Philadelphia Area", "url": "https://services.global.ntt/en-us/services/data-centers"},
            {"label": "DCED — Keystone Opportunity Zone Program", "url": "https://dced.pa.gov/programs/keystone-opportunity-zone-kozkozekoi/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "42091",
        "name": "Montgomery County",
        "state": "Pennsylvania",
        "level": 1,
        "types": ["data_center", "energy"],
        "title": "Data Center Siting Overlay Study — Montgomery County",
        "description": (
            "Montgomery County, Pennsylvania's second most populous county, has seen "
            "proposals for large data center campuses in its western townships. The county "
            "Planning Commission initiated a Data Center Siting Overlay Study in 2023 "
            "after receiving applications for facilities totaling over 300 MW. Concerns "
            "include substation load impacts on the PECO/PPL transmission grid, emergency "
            "generator diesel fuel storage, and stormwater runoff from large impervious "
            "surfaces. The study recommends conditional zoning approval requiring power "
            "supply impact agreements with the local distribution utility."
        ),
        "effective_date": "2023-09-01",
        "status": "proposed",
        "notes": "Overlay study recommendations pending formal ordinance adoption.",
        "sources": [
            {"label": "Montgomery County Planning Commission", "url": "https://www.montcopa.org/1007/Planning-Commission"},
            {"label": "PECO — Large Customer Transmission", "url": "https://www.peco.com/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Utah – Davis County ──────────────────────────────────────────────────
    {
        "fips": "49011",
        "name": "Davis County",
        "state": "Utah",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Northern Utah Data Center Campus — Novva / North Salt Lake",
        "description": (
            "Davis County, immediately north of Salt Lake County, hosts Novva Data Centers' "
            "flagship campus in North Salt Lake — a purpose-built hyperscale facility with "
            "120+ MW of planned capacity. The campus benefits from Rocky Mountain Power's "
            "competitive industrial rates, abundant fiber access along the I-15 corridor, "
            "and Utah's arid climate enabling aggressive free-cooling designs. Utah's data "
            "center sales tax exemption (Utah Code §59-12-104(77)) applies to qualifying "
            "server and power equipment. Davis County's proximity to the NSA Utah Data "
            "Center in adjacent Salt Lake County has created a dense fiber ecosystem in "
            "the area."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Novva North Salt Lake campus is one of the largest purpose-built DC campuses in the Mountain West.",
        "sources": [
            {"label": "Novva Data Centers — North Salt Lake Campus", "url": "https://www.novvadatacenters.com/facilities/north-salt-lake/"},
            {"label": "Utah Tax Commission — Sales Tax Exemptions §59-12-104", "url": "https://tax.utah.gov/sales/exemptions"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Virginia – Chesterfield County ───────────────────────────────────────
    {
        "fips": "51041",
        "name": "Chesterfield County",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "AWS Data Center Cluster — Chesterfield / Richmond South",
        "description": (
            "Chesterfield County, south of Richmond, has emerged as an extension of "
            "Virginia's data center corridor with Amazon Web Services operating multiple "
            "facilities in the county's industrial parks. The county's Comprehensive Plan "
            "designates data center-compatible industrial zones along Route 288 and "
            "Midlothian Turnpike. Dominion Energy Virginia provides reliable three-phase "
            "industrial service with dedicated data center rate structures (Schedule TOU-DC). "
            "Virginia's Data Center Investment Grant and IT equipment sales tax exemption "
            "apply to qualifying Chesterfield projects meeting the $150 million investment "
            "threshold."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Chesterfield is one of the fastest-growing data center markets in the Greater Richmond area.",
        "sources": [
            {"label": "Chesterfield County — Economic Development", "url": "https://www.chesterfield.gov/government/departments/economic-development"},
            {"label": "Virginia VEDP — Data Center Investment Grant", "url": "https://www.vedp.org/incentive/data-center-investment-grant"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Washington – Snohomish County ────────────────────────────────────────
    {
        "fips": "53061",
        "name": "Snohomish County",
        "state": "Washington",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Microsoft Puget Sound AI Campus — Marysville / Everett Area",
        "description": (
            "Snohomish County hosts Microsoft's expanding Puget Sound data center "
            "campus in Marysville and adjacent communities north of Seattle. The campus "
            "represents a multi-billion-dollar investment in AI training and Azure cloud "
            "infrastructure, leveraging Puget Sound Energy's hydroelectric power mix "
            "and the region's naturally cool climate for free-air economization. "
            "Snohomish County PUD's industrial service territory provides highly reliable "
            "power with one of the highest hydroelectric generation percentages in the "
            "US. The county has streamlined permitting for data center projects under its "
            "Economic Development Strategic Plan."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Snohomish County PUD provides separate service area from Seattle City Light.",
        "sources": [
            {"label": "Microsoft — Puget Sound Data Center Expansion", "url": "https://azure.microsoft.com/en-us/global-infrastructure/"},
            {"label": "Snohomish County — Economic Development", "url": "https://snohomishcountywa.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Wisconsin – Milwaukee County ──────────────────────────────────────────
    {
        "fips": "55079",
        "name": "Milwaukee County",
        "state": "Wisconsin",
        "level": -1,
        "types": ["data_center"],
        "title": "Regional Data Center Hub — Milwaukee Metro",
        "description": (
            "Milwaukee County serves as Wisconsin's primary data center market, anchored "
            "by Iron Mountain's Milwaukee campus, Logicalis' regional facility, and "
            "several carrier-neutral colocation operators. We Energies' dense urban power "
            "grid and competitive large-customer rate structures (Rate LG) support "
            "data center operators. The city of Milwaukee's business improvement districts "
            "and Milwaukee County's Advance NOW economic development strategy designate "
            "data center and technology infrastructure as priority investment categories. "
            "Wisconsin's data center investment credit (Wis. Stat. §238.396) provides a "
            "10% refundable tax credit for qualifying capital investments of $25 million+."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Milwaukee is the largest metro data center market in Wisconsin.",
        "sources": [
            {"label": "Iron Mountain — Milwaukee Data Center", "url": "https://www.ironmountain.com/resources/data-centers"},
            {"label": "WEDC — Wisconsin Data Center Tax Credit §238.396", "url": "https://wedc.org/programs-and-resources/data-centers/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ── 2. AI CAMPUSES ───────────────────────────────────────────────────────────

NEW_CAMPUSES = [
    {
        "id": "ai-fl-001",
        "name": "CyrusOne Pompano Beach Data Center Campus",
        "operator": "CyrusOne",
        "status": "operational",
        "county_fips": "12011",
        "notes": "Major enterprise and wholesale colocation campus in Broward County FL.",
        "lon": -80.1247,
        "lat": 26.2380,
    },
    {
        "id": "ai-il-004",
        "name": "Google Channahon AI Data Center Campus",
        "operator": "Google",
        "status": "operational",
        "county_fips": "17197",
        "notes": "Google's largest Midwest data center campus; expanded multiple times since 2016.",
        "lon": -88.2284,
        "lat": 41.4253,
    },
    {
        "id": "ai-ks-001",
        "name": "AT&T Overland Park Network Data Center",
        "operator": "AT&T",
        "status": "operational",
        "county_fips": "20091",
        "notes": "AT&T Central Office and data center serving the Kansas City metro.",
        "lon": -94.6872,
        "lat": 38.9822,
    },
    {
        "id": "ai-oh-002",
        "name": "AWS Cincinnati Region Infrastructure",
        "operator": "Amazon Web Services",
        "status": "operational",
        "county_fips": "39061",
        "notes": "Amazon Web Services regional data center supporting Ohio cloud infrastructure.",
        "lon": -84.5120,
        "lat": 39.1031,
    },
    {
        "id": "ai-ut-002",
        "name": "Novva Data Centers — North Salt Lake Campus",
        "operator": "Novva Data Centers",
        "status": "operational",
        "county_fips": "49011",
        "notes": "Purpose-built 120+ MW hyperscale campus in Davis County Utah.",
        "lon": -111.9068,
        "lat": 40.8488,
    },
    {
        "id": "ai-va-004",
        "name": "Amazon AWS Chesterfield Data Center Campus",
        "operator": "Amazon Web Services",
        "status": "operational",
        "county_fips": "51041",
        "notes": "AWS data center cluster in Chesterfield County south of Richmond VA.",
        "lon": -77.5050,
        "lat": 37.3788,
    },
    {
        "id": "ai-wa-002",
        "name": "Microsoft Marysville AI Infrastructure Campus",
        "operator": "Microsoft",
        "status": "under_construction",
        "county_fips": "53061",
        "notes": "Microsoft expanding Puget Sound AI training campus in Snohomish County.",
        "lon": -122.1771,
        "lat": 48.0518,
    },
]

# ── 3. TAX INCENTIVES ────────────────────────────────────────────────────────

NEW_INCENTIVES = [
    {
        "state": "CT",
        "program_name": "Connecticut Data Center Equipment Sales Tax Exemption",
        "incentive_type": "Sales & Use Tax Exemption",
        "min_investment_m": None,
        "notes": (
            "Conn. Gen. Stat. §12-412(112): Exempts servers, storage, and networking equipment "
            "purchased for use in an eligible data center from Connecticut sales and use tax. "
            "Qualifying facility must maintain a minimum of 10,000 sq ft of data center floor "
            "space. Effective since 2013 with subsequent amendments broadening eligible equipment."
        ),
        "fips_list": ["09003"],
    },
    {
        "state": "FL",
        "program_name": "Florida Data Center Equipment Sales Tax Exemption",
        "incentive_type": "Sales & Use Tax Exemption",
        "min_investment_m": 150,
        "notes": (
            "§212.08(7)(fff) F.S. (enacted 2021): Provides a full sales and use tax exemption "
            "for data center equipment including servers, storage, UPS systems, and cooling "
            "equipment for qualifying colocation and enterprise data centers meeting a $150M "
            "investment threshold and minimum 25 direct jobs. Applies statewide; Broward, "
            "Miami-Dade, and Orange counties are primary beneficiaries."
        ),
        "fips_list": ["12011", "12086", "12057"],
    },
    {
        "state": "LA",
        "program_name": "Louisiana Quality Jobs Program — Technology Sector",
        "incentive_type": "Payroll Tax Rebate + Sales Tax Rebate",
        "min_investment_m": 25,
        "notes": (
            "R.S. 51:2453 (Quality Jobs Program): Provides a 6% annual payroll tax rebate "
            "for up to 10 years for qualifying technology companies creating net new jobs "
            "paying at or above the state average wage. Data center operators qualifying "
            "as technology infrastructure companies may also receive a rebate on sales taxes "
            "paid on construction materials. Requires a minimum $25M capital investment and "
            "50 new direct jobs. LED Fast Start workforce training also available."
        ),
        "fips_list": ["22033"],
    },
]

# ── 4. STATE REGULATIONS ────────────────────────────────────────────────────

NEW_STATE_REGS = {
    "23": {
        "state_name": "Maine",
        "state_abbr": "ME",
        "summary": (
            "Maine has no statewide AI-specific or data center regulation as of 2026. The state's "
            "Act to Establish the Maine Artificial Intelligence Advisory Council (LD 2064, enacted "
            "2024) creates an advisory body to study AI governance but does not impose mandates. "
            "The Maine Public Utilities Commission has identified data center load growth as a "
            "grid planning concern under the state's Integrated Resource Planning process. Portland "
            "City Council adopted a study resolution on data center siting in Cumberland County. "
            "Maine's renewable portfolio standard (35% by 2025, 80% by 2030) applies to all large "
            "load customers including data centers through Central Maine Power's tariff schedule."
        ),
        "key_laws": ["LD 2064 (2024) — AI Advisory Council Act"],
        "enforcement_body": "Maine PUC; Maine Artificial Intelligence Advisory Council (advisory only)",
        "effective_date": "2024-07-01",
        "risk_level": "low",
    },
    "30": {
        "state_name": "Montana",
        "state_abbr": "MT",
        "summary": (
            "Montana has no statewide data center regulation or AI-specific legislation as of 2026. "
            "Data center siting is managed at the county level under local zoning authority. "
            "Montana's abundant hydroelectric power (Columbia River basin) and cold climate have "
            "attracted moderate data center interest, particularly in Flathead and Cascade counties. "
            "NorthWestern Energy's industrial electric rates are competitive but grid connectivity "
            "to major fiber routes is limited. The 2025 Legislature considered but did not advance "
            "a bill modeled on Wyoming's data center tax incentive. Montana has no data center "
            "sales tax exemption; sales tax does not apply statewide (Montana has no general sales tax)."
        ),
        "key_laws": [],
        "enforcement_body": "Montana DNRC (water rights); county zoning authorities",
        "effective_date": "2024-01-01",
        "risk_level": "low",
    },
}

# ── APPLY ────────────────────────────────────────────────────────────────────

def apply_restrictions():
    raw = load("restrictions_raw.json")
    entries = raw["restrictions"]
    existing = {e["fips"] for e in entries}
    added = 0
    for r in NEW_RESTRICTIONS:
        if r["fips"] in existing:
            print(f"  SKIP restriction {r['fips']} ({r['name']}) — already exists")
            continue
        entries.append(r)
        existing.add(r["fips"])
        added += 1
        print(f"  +restriction {r['fips']} {r['name']}, {r['state']} level={r['level']}")
    save("restrictions_raw.json", raw)
    return added


def apply_campuses():
    data = load("ai_campuses.json")
    camps = data["ai_campuses"]
    existing_ids = {c["id"] for c in camps}
    added = 0
    for c in NEW_CAMPUSES:
        if c["id"] in existing_ids:
            print(f"  SKIP campus {c['id']} — already exists")
            continue
        camps.append(c)
        existing_ids.add(c["id"])
        added += 1
        print(f"  +campus {c['id']} {c['name']}")
    save("ai_campuses.json", data)
    return added


def apply_incentives():
    data = load("tax_incentives.json")
    programs = data["tax_incentives"]
    existing = {(p["state"], p["program_name"]) for p in programs}
    added = 0
    for p in NEW_INCENTIVES:
        key = (p["state"], p["program_name"])
        if key in existing:
            print(f"  SKIP incentive {p['state']}:{p['program_name']} — already exists")
            continue
        programs.append(p)
        existing.add(key)
        added += 1
        print(f"  +incentive {p['state']} {p['program_name']}")
    save("tax_incentives.json", data)
    return added


def apply_state_regs():
    data = load("state_regulations.json")
    states = data["states"]
    added = 0
    for fips2, reg in NEW_STATE_REGS.items():
        if fips2 in states:
            print(f"  SKIP state_reg {fips2} ({reg['state_abbr']}) — already exists")
            continue
        states[fips2] = reg
        added += 1
        print(f"  +state_reg {fips2} {reg['state_name']}")
    save("state_regulations.json", data)
    return added


if __name__ == "__main__":
    print("=== Sweep C ===")
    r = apply_restrictions()
    c = apply_campuses()
    i = apply_incentives()
    s = apply_state_regs()
    print(f"\nSweep C complete: +{r} restrictions, +{c} campuses, +{i} incentives, +{s} state regs")
