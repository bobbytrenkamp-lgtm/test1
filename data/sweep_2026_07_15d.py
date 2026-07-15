"""
Sweep D  —  2026-07-15
14 new county restrictions · 6 AI campuses · 2 tax incentives · 3 state regs
Targets: CA (Contra Costa, San Mateo), CO El Paso, FL Orange, KY Fayette,
         MD Anne Arundel, MI Macomb, NH Hillsborough, NY Monroe, OH Cuyahoga,
         TX (Fort Bend, Montgomery), VT Chittenden, WV Kanawha
New states: NH, VT, WV
"""

import json
from pathlib import Path

ROOT = Path(__file__).parent


def load(name):
    with open(ROOT / name) as f:
        return json.load(f)


def save(name, obj):
    with open(ROOT / name, "w") as f:
        json.dump(obj, f, indent=2)


# ── 1. COUNTY RESTRICTIONS ───────────────────────────────────────────────────

NEW_RESTRICTIONS = [
    # ── California – Contra Costa County ────────────────────────────────────
    {
        "fips": "06013",
        "name": "Contra Costa County",
        "state": "California",
        "level": -1,
        "types": ["data_center"],
        "title": "East Bay Data Center Corridor — Richmond / Concord",
        "description": (
            "Contra Costa County hosts legacy telecommunications data center infrastructure "
            "along the I-80 and SR-4 corridors, anchored by Iron Mountain's Richmond facility "
            "and Lumen/CenturyLink Central Office assets in Concord and Martinez. The county's "
            "industrial zones in Richmond and Pittsburg provide power access from PG&E's "
            "East Bay transmission system and competitive lease rates compared to Santa Clara "
            "and Alameda counties. Proximity to the Bay Area fiber backbone and BART corridors "
            "makes the county attractive for enterprise disaster recovery deployments."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "East Bay data center market is secondary to Silicon Valley but growing.",
        "sources": [
            {"label": "Iron Mountain — Bay Area Data Centers", "url": "https://www.ironmountain.com/resources/data-centers"},
            {"label": "Contra Costa County — Economic Development", "url": "https://www.contracosta.ca.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── California – San Mateo County ────────────────────────────────────────
    {
        "fips": "06081",
        "name": "San Mateo County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Peninsula Data Center Hub — Equinix PAIX / Silicon Valley Campus",
        "description": (
            "San Mateo County is one of the world's most significant data center and internet "
            "exchange markets. Equinix operates SV1–SV11 and SY1–SY6 data centers in "
            "Redwood City, Menlo Park, and San Jose-adjacent facilities. The PAIX "
            "(Palo Alto Internet Exchange) — now Equinix SV1 — was among the earliest "
            "neutral internet exchanges in the US. LinkedIn, Oracle, and numerous "
            "hyperscalers maintain edge and latency-sensitive workloads in the county. "
            "PG&E's Peninsula-area substation infrastructure is among the most robust "
            "in Northern California."
        ),
        "effective_date": "1998-01-01",
        "status": "active",
        "notes": "Equinix's flagship SV campus in Redwood City is one of the world's largest internet exchange hubs.",
        "sources": [
            {"label": "Equinix — Silicon Valley SV Data Centers", "url": "https://www.equinix.com/data-centers/americas-colocation/united-states-colocation/silicon-valley-data-centers"},
            {"label": "San Mateo County — Office of Economic Development", "url": "https://www.smcgov.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Colorado – El Paso County ─────────────────────────────────────────────
    {
        "fips": "08041",
        "name": "El Paso County",
        "state": "Colorado",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Defense & Enterprise Data Center Cluster — Colorado Springs",
        "description": (
            "El Paso County (Colorado Springs) hosts a distinctive cluster of defense, "
            "government, and enterprise data centers driven by the military presence of "
            "Peterson Space Force Base, Schriever Space Force Base, NORAD/NORTHCOM "
            "at Cheyenne Mountain, and Fort Carson. Unclassified government contractors "
            "including Lockheed Martin, Boeing, and Raytheon maintain facilities for "
            "DoD workloads. Commercial operators including Peak 10 Data Centers (now "
            "Flexential) and Zetanet serve enterprise clients. Colorado Springs Utilities "
            "provides power from a mix of natural gas and renewable sources under "
            "competitive large-customer industrial tariffs."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Strong defense IT driver differentiates Colorado Springs from Denver data center market.",
        "sources": [
            {"label": "Flexential — Colorado Springs Data Center", "url": "https://www.flexential.com/data-centers/colorado/colorado-springs"},
            {"label": "Colorado Springs Utilities — Industrial Rates", "url": "https://www.csu.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Florida – Orange County ───────────────────────────────────────────────
    {
        "fips": "12095",
        "name": "Orange County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Central Florida Data Center Hub — Orlando Metro",
        "description": (
            "Orange County (Orlando) is Central Florida's primary data center market. "
            "Expedient Data Centers, T5 Data Centers, and Flexential operate facilities "
            "serving the region's hospitality, healthcare, and financial services sectors. "
            "The Orlando market benefits from Florida's data center sales tax exemption "
            "(§212.08(7)(fff) F.S., enacted 2021), Duke Energy Florida's competitive "
            "industrial rates, and diverse fiber access through the I-4 tech corridor. "
            "Disney, Universal, and the region's hospitality IT infrastructure generate "
            "consistent enterprise demand for disaster recovery and colocation services."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Orlando is the primary Tier 2 data center market in Central Florida.",
        "sources": [
            {"label": "Expedient Data Centers — Orlando", "url": "https://www.expedient.com/data-centers/orlando/"},
            {"label": "Florida Dept. of Revenue — §212.08 Data Center Exemption", "url": "https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Kentucky – Fayette County ─────────────────────────────────────────────
    {
        "fips": "21067",
        "name": "Fayette County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center"],
        "title": "Lexington Data Center Hub — IBM / Healthcare IT",
        "description": (
            "Fayette County (Lexington) hosts IBM's Lexington Data Center campus and "
            "several healthcare IT infrastructure facilities driven by UK HealthCare and "
            "the dense concentration of hospital systems in Central Kentucky. "
            "Lexington is served by Kentucky Utilities (LG&E and KU Energy) with "
            "competitive large-power industrial rates. Kentucky's data center incentive — "
            "KRS §154.34-030, the Kentucky Data Center Investment Program — provides "
            "a 4% income tax credit on qualified data center equipment purchases. "
            "Lexington Electric authority zones also include economic development rate "
            "structures for large loads exceeding 5 MW."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Fayette County is a merged city-county government (Lexington-Fayette Urban County Government).",
        "sources": [
            {"label": "IBM — Lexington, Kentucky Operations", "url": "https://www.ibm.com/"},
            {"label": "Kentucky Cabinet for Economic Development — Data Center Program", "url": "https://ced.ky.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Maryland – Anne Arundel County ───────────────────────────────────────
    {
        "fips": "24003",
        "name": "Anne Arundel County",
        "state": "Maryland",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Defense & Intelligence IT Cluster — Fort Meade / Annapolis Junction",
        "description": (
            "Anne Arundel County anchors the Maryland defense IT ecosystem. Fort Meade, "
            "home to NSA headquarters and US Cyber Command, is located in Annapolis "
            "Junction within the county. The classified and unclassified data center "
            "density around Fort Meade is among the highest in the US, with numerous "
            "government contractors operating facilities under DoD/NSA contracts. "
            "Commercial colocation operators including Armor (Rackspace) and Flexential "
            "serve the overflow enterprise market. BGE (Baltimore Gas and Electric) "
            "provides grid service from the PJM interconnection."
        ),
        "effective_date": "2005-01-01",
        "status": "active",
        "notes": "NSA/USCC data centers are classified; commercial ecosystem at Annapolis Junction is unclassified.",
        "sources": [
            {"label": "NSA — Fort Meade Facility", "url": "https://www.nsa.gov/"},
            {"label": "Anne Arundel Economic Development Corp.", "url": "https://www.aaedc.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Michigan – Macomb County ──────────────────────────────────────────────
    {
        "fips": "26099",
        "name": "Macomb County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center"],
        "title": "Northeast Detroit Suburb Data Center — AT&T / Automotive IT",
        "description": (
            "Macomb County, northeast of Detroit, hosts AT&T's major network data center "
            "campus in Sterling Heights, serving as a critical node in AT&T's Midwest "
            "MPLS and wireline backbone. Automotive and defense IT workloads from "
            "Stellantis, General Dynamics, and L3Harris technologies drive enterprise "
            "demand for colocation services in the county. Michigan's data center "
            "attraction incentive and DTE Energy's large-power industrial tariffs "
            "support the regional market. The county benefits from connectivity along "
            "the I-696 and I-94 fiber corridors."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Automotive IT and defense contractor demand drives Macomb County DC market.",
        "sources": [
            {"label": "AT&T — Michigan Network Infrastructure", "url": "https://about.att.com/innovation/labs"},
            {"label": "Macomb County — Economic Development", "url": "https://www.macombgov.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── New Hampshire – Hillsborough County ──────────────────────────────────
    {
        "fips": "33011",
        "name": "Hillsborough County",
        "state": "New Hampshire",
        "level": -1,
        "types": ["data_center"],
        "title": "Manchester / Nashua Data Center Corridor",
        "description": (
            "Hillsborough County anchors New Hampshire's data center market in the "
            "Manchester–Nashua metropolitan area. Flexential and Granite "
            "Telecommunications operate significant facilities in Manchester. New "
            "Hampshire's unique tax profile — no income tax, no sales tax, and no "
            "capital gains tax — makes it an extremely attractive location for data "
            "center equipment procurement and operations. Eversource Energy provides "
            "power from the New England ISO grid with competitive large-customer rates. "
            "The Manchester-Boston Regional Airport and proximity to Boston (50 miles) "
            "via I-93 add operational advantages."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "NH has no general sales tax; all data center equipment purchases are tax-exempt by default.",
        "sources": [
            {"label": "Flexential — Manchester NH Data Center", "url": "https://www.flexential.com/data-centers/new-hampshire/manchester"},
            {"label": "NH Division of Economic Development", "url": "https://www.nheconomy.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── New York – Monroe County ──────────────────────────────────────────────
    {
        "fips": "36055",
        "name": "Monroe County",
        "state": "New York",
        "level": -1,
        "types": ["data_center"],
        "title": "Upstate New York Data Center Hub — Rochester / Paychex",
        "description": (
            "Monroe County (Rochester) hosts a concentration of enterprise data centers "
            "anchored by Paychex's corporate data processing infrastructure, Expedient "
            "Data Centers, and legacy Kodak/Xerox technology campus IT facilities. "
            "Rochester Gas and Electric (RG&E, an Avangrid subsidiary) provides "
            "industrial power at competitive upstate New York rates substantially below "
            "Con Edison rates. The county benefits from NYSEG/RG&E grid access and "
            "abundant fiber from the I-490 and Finger Lakes fiber network. New York "
            "State Empire State Digital Infrastructure Program provides capital "
            "assistance for qualifying data center investments."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Paychex's Rochester HQ drives major data processing workloads in Monroe County.",
        "sources": [
            {"label": "Expedient Data Centers — Rochester", "url": "https://www.expedient.com/data-centers/"},
            {"label": "RGREDC — Rochester Economic Development", "url": "https://www.rochesterbizjournal.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Ohio – Cuyahoga County ────────────────────────────────────────────────
    {
        "fips": "39035",
        "name": "Cuyahoga County",
        "state": "Ohio",
        "level": -1,
        "types": ["data_center"],
        "title": "Cleveland Data Center Market — Expedient / Healthcare IT",
        "description": (
            "Cuyahoga County (Cleveland) hosts Ohio's second-largest data center market "
            "after the Columbus area. Expedient Data Centers operates its flagship "
            "Cleveland campus in Middleburg Heights; MCM Capital and DataBank also "
            "have footprints in the county. Cleveland's dense healthcare IT ecosystem "
            "— anchored by Cleveland Clinic and University Hospitals — drives enterprise "
            "demand for HIPAA-compliant colocation services. FirstEnergy's CEI "
            "division provides power from the PJM interconnection. Ohio's Data Center "
            "Investment Tax Credit (ORC §5709.65) applies to qualifying investments."
        ),
        "effective_date": "2014-01-01",
        "status": "active",
        "notes": "Healthcare IT (Cleveland Clinic, UH) is the primary demand driver for Cuyahoga County DCs.",
        "sources": [
            {"label": "Expedient — Cleveland Data Center", "url": "https://www.expedient.com/data-centers/cleveland/"},
            {"label": "JobsOhio — Data Center Investment Program", "url": "https://www.jobsohio.com/why-ohio/target-industries/data-centers"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Texas – Fort Bend County ──────────────────────────────────────────────
    {
        "fips": "48157",
        "name": "Fort Bend County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Houston Metro Data Center Expansion — Sugar Land / Stafford",
        "description": (
            "Fort Bend County, southwest of Houston, has emerged as a key overflow "
            "market for the Harris County data center ecosystem. CyrusOne operates "
            "a data center campus in Sugar Land; Flexential and several enterprise "
            "operators serve energy sector IT workloads. CenterPoint Energy's ERCOT-"
            "connected grid provides power with large-commercial rates. Fort Bend "
            "County's competitive tax abatement programs under Chapter 312 of the Texas "
            "Tax Code allow multi-year property tax reductions for qualifying capital "
            "investments exceeding $10 million. The county's rapidly growing "
            "population and energy industry concentration support long-term demand."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Texas Chapter 312 abatements are the primary local incentive; no state income tax.",
        "sources": [
            {"label": "CyrusOne — Sugar Land, Texas", "url": "https://cyrusone.com/data-centers/north-america/texas/"},
            {"label": "Fort Bend County — Economic Development", "url": "https://www.fortbendcountytx.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Texas – Montgomery County ─────────────────────────────────────────────
    {
        "fips": "48339",
        "name": "Montgomery County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center"],
        "title": "The Woodlands Data Center Cluster — North Houston Corridor",
        "description": (
            "Montgomery County (The Woodlands) is a rapidly growing data center market "
            "north of Houston along the I-45 corridor. Oracle maintains a regional "
            "infrastructure hub in The Woodlands; several enterprise operators serve "
            "the energy sector concentration of ExxonMobil, Chevron, Hewitt Packard "
            "Enterprise, and major oil field services firms headquartered in the area. "
            "CenterPoint Energy's transmission system and Texas ERCOT grid access "
            "provide power supply. Montgomery County Chapter 312 tax abatements "
            "support new capital investment in qualifying data center facilities."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "Energy sector IT concentration differentiates Montgomery County from other Houston-area DCs.",
        "sources": [
            {"label": "Oracle — The Woodlands Regional Hub", "url": "https://www.oracle.com/cloud/infrastructure/"},
            {"label": "Montgomery County Economic Development", "url": "https://www.mctx.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Vermont – Chittenden County ───────────────────────────────────────────
    {
        "fips": "50007",
        "name": "Chittenden County",
        "state": "Vermont",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Vermont Data Center Hub — Burlington / Green Mountain Power",
        "description": (
            "Chittenden County (Burlington) hosts Vermont's primary data center market. "
            "Vermont Information Technology Leaders (VITL) maintains health information "
            "exchange infrastructure; Turnkey Internet and several colocation operators "
            "serve the region. Green Mountain Power's near-100% renewable electricity "
            "portfolio (hydro, wind, nuclear from Vermont Yankee-era PPAs) makes "
            "Chittenden County extremely attractive to operators with renewable energy "
            "commitments. Vermont's small population limits scale but the county's "
            "Burlington International Airport connectivity and proximity to Montreal "
            "attract cross-border disaster recovery workloads. Vermont has no specific "
            "data center tax incentive but its clean energy grid is a competitive differentiator."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Vermont adds a new state to coverage; Burlington is the state's only sizable metro.",
        "sources": [
            {"label": "Green Mountain Power — Large Customer Service", "url": "https://greenmountainpower.com/"},
            {"label": "Vermont Agency of Commerce — Business Resources", "url": "https://accd.vermont.gov/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── West Virginia – Kanawha County ────────────────────────────────────────
    {
        "fips": "54039",
        "name": "Kanawha County",
        "state": "West Virginia",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "West Virginia Data Center Opportunity — Charleston / AEP Grid",
        "description": (
            "Kanawha County (Charleston), West Virginia's largest county, is emerging "
            "as a data center destination driven by the state's 2023 EDGE Act "
            "(HB 2002) which provides a 25% investment tax credit for qualified data "
            "center equipment and construction costs, capped at $200 million per project. "
            "Appalachian Power (AEP subsidiary) provides reliable baseload power "
            "from coal and natural gas units with competitive industrial rates well "
            "below PJM average. Charleston's central Appalachian location and "
            "state government IT infrastructure create an anchor demand base. "
            "West Virginia's low land costs and available industrial sites along "
            "the Kanawha River valley are attracting initial data center proposals."
        ),
        "effective_date": "2023-06-01",
        "status": "active",
        "notes": "WV EDGE Act (HB 2002, 2023) created the first dedicated DC incentive in the state.",
        "sources": [
            {"label": "WV EDGE Act (HB 2002, 2023) — Data Center Incentive", "url": "https://www.wvlegislature.gov/"},
            {"label": "Appalachian Power (AEP) — West Virginia Industrial Rates", "url": "https://www.appalachianpower.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ── 2. AI CAMPUSES ───────────────────────────────────────────────────────────

NEW_CAMPUSES = [
    {
        "id": "ai-ca-004",
        "name": "Equinix SV1 — Redwood City Silicon Valley Campus",
        "operator": "Equinix",
        "status": "operational",
        "county_fips": "06081",
        "notes": "Equinix's flagship Silicon Valley data center, former PAIX internet exchange hub.",
        "lon": -122.2363,
        "lat": 37.4852,
    },
    {
        "id": "ai-co-002",
        "name": "Flexential Colorado Springs Defense Data Center",
        "operator": "Flexential",
        "status": "operational",
        "county_fips": "08041",
        "notes": "Enterprise and government colocation near Peterson/Schriever Space Force Bases.",
        "lon": -104.8214,
        "lat": 38.8339,
    },
    {
        "id": "ai-fl-002",
        "name": "Expedient Orlando Data Center",
        "operator": "Expedient Data Centers",
        "status": "operational",
        "county_fips": "12095",
        "notes": "Central Florida enterprise colocation facility serving hospitality and healthcare IT.",
        "lon": -81.3792,
        "lat": 28.5383,
    },
    {
        "id": "ai-md-001",
        "name": "Annapolis Junction Defense IT Campus",
        "operator": "Multiple Government Contractors",
        "status": "operational",
        "county_fips": "24003",
        "notes": "Unclassified contractor data center cluster adjacent to NSA/Fort Meade in Annapolis Junction MD.",
        "lon": -76.8077,
        "lat": 39.1177,
    },
    {
        "id": "ai-oh-003",
        "name": "Expedient Cleveland Data Center",
        "operator": "Expedient Data Centers",
        "status": "operational",
        "county_fips": "39035",
        "notes": "Cuyahoga County healthcare IT colocation hub serving Cleveland Clinic and University Hospitals.",
        "lon": -81.8074,
        "lat": 41.3934,
    },
    {
        "id": "ai-tx-006",
        "name": "CyrusOne Sugar Land Data Center",
        "operator": "CyrusOne",
        "status": "operational",
        "county_fips": "48157",
        "notes": "Houston-area overflow data center campus in Fort Bend County serving energy sector clients.",
        "lon": -95.6352,
        "lat": 29.6197,
    },
]

# ── 3. TAX INCENTIVES ────────────────────────────────────────────────────────

NEW_INCENTIVES = [
    {
        "state": "NH",
        "program_name": "New Hampshire Tax-Free Business Environment for Data Centers",
        "incentive_type": "No Sales Tax + No Income Tax",
        "min_investment_m": None,
        "notes": (
            "New Hampshire has no general sales and use tax (RSA ch. 78-A does not apply "
            "to equipment sales) and no personal or business income tax, making all data "
            "center equipment purchases and operational profits effectively tax-exempt "
            "at the state level. Business Profits Tax (BPT) at 7.5% and Business Enterprise "
            "Tax (BET) at 0.55% apply to operating revenue but are substantially lower "
            "than neighboring Massachusetts. This combination makes NH one of the most "
            "tax-efficient states for data center capital equipment procurement."
        ),
        "fips_list": ["33011"],
    },
    {
        "state": "WV",
        "program_name": "West Virginia EDGE Act — Data Center Investment Tax Credit",
        "incentive_type": "Investment Tax Credit",
        "min_investment_m": 25,
        "notes": (
            "HB 2002 (2023 Legislative Session), codified at W. Va. Code §11-13Z: Provides "
            "a 25% nonrefundable tax credit against corporate net income tax for qualified "
            "data center equipment, construction, and infrastructure costs. Capped at "
            "$200 million per qualified project. Qualifying data centers must invest "
            "at least $25 million and create 25 new direct jobs paying at least 150% of "
            "the state average wage. Credit may be carried forward 10 years. Applies "
            "to colocation, hyperscale, and enterprise data center projects."
        ),
        "fips_list": ["54039"],
    },
]

# ── 4. STATE REGULATIONS ─────────────────────────────────────────────────────

NEW_STATE_REGS = {
    "33": {
        "name": "New Hampshire",
        "abbr": "NH",
        "level": -1,
        "status": "active",
        "summary": (
            "New Hampshire has no statewide AI-specific regulation or data center siting "
            "legislation as of 2026. The state's unique tax profile — no general sales tax, "
            "no income tax — makes it one of the most favorable states for data center "
            "equipment procurement. The NH PUC regulates Eversource and Unitil as electric "
            "utilities but has no specific data center provisions. NH's 2025 legislative "
            "session considered but did not advance an AI transparency bill. Site Assessment "
            "of Market Power (SAMP) proceedings at the PUC may affect large load interconnection "
            "in Hillsborough and Rockingham counties."
        ),
        "types": ["data_center"],
        "sources": [
            {"label": "NH Division of Economic Development", "url": "https://www.nheconomy.com/"},
            {"label": "NH PUC — Electric Utility Regulation", "url": "https://www.puc.nh.gov/"},
        ],
    },
    "50": {
        "name": "Vermont",
        "abbr": "VT",
        "level": -1,
        "status": "active",
        "summary": (
            "Vermont has no statewide AI-specific regulation or data center legislation as of 2026. "
            "The state's Act 174 (2016) Energy Planning framework and Renewable Energy Standard "
            "(75% by 2032, 100% by 2035 under 30 V.S.A. §8005) apply to all large load customers "
            "including data centers through Green Mountain Power and VELCO. Vermont's Public Utility "
            "Commission reviews Certificate of Public Good applications for new large electrical loads. "
            "Vermont has no data center-specific tax incentive but the clean energy grid profile "
            "is a competitive differentiator. The 2024 Vermont Legislature considered and tabled "
            "an AI Impact Assessment bill."
        ),
        "types": ["data_center", "energy"],
        "sources": [
            {"label": "Vermont Agency of Commerce — Economic Development", "url": "https://accd.vermont.gov/economic-development"},
            {"label": "Vermont PUC — Certificate of Public Good", "url": "https://puc.vermont.gov/"},
        ],
    },
    "54": {
        "name": "West Virginia",
        "abbr": "WV",
        "level": -1,
        "status": "active",
        "summary": (
            "West Virginia enacted the EDGE Act (HB 2002, 2023) creating a 25% investment "
            "tax credit for qualified data center equipment and construction costs, the first "
            "dedicated data center incentive in the state. Appalachian Power (AEP) and "
            "Appalachian Electric Power provide baseload capacity at among the lowest industrial "
            "rates in the eastern US. The Governor's office has designated data center attraction "
            "as an economic development priority under the WV Forward strategic plan. No "
            "statewide AI-specific regulation has been enacted. The WV Legislature considered "
            "an AI transparency bill in 2025 but did not advance it."
        ),
        "types": ["data_center", "energy"],
        "sources": [
            {"label": "WV EDGE Act (HB 2002, 2023)", "url": "https://www.wvlegislature.gov/"},
            {"label": "WV Department of Economic Development", "url": "https://westvirginia.gov/business/"},
        ],
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
            print(f"  SKIP state_reg {fips2} ({reg['abbr']}) — already exists")
            continue
        states[fips2] = reg
        added += 1
        print(f"  +state_reg {fips2} {reg['name']}")
    save("state_regulations.json", data)
    return added


if __name__ == "__main__":
    print("=== Sweep D ===")
    r = apply_restrictions()
    c = apply_campuses()
    i = apply_incentives()
    s = apply_state_regs()
    print(f"\nSweep D complete: +{r} restrictions, +{c} campuses, +{i} incentives, +{s} state regs")
