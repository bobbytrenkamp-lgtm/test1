"""
Sweep V — 2026-07-16
Adds 12 county restriction entries and 5 AI campuses.
Idempotent: skips entries already present in the data files.
"""

import json
from pathlib import Path
from datetime import date

DATA_DIR = Path(__file__).parent
RAW_PATH = DATA_DIR / "restrictions_raw.json"
CAMP_PATH = DATA_DIR / "ai_campuses.json"

# ── load ─────────────────────────────────────────────────────────────────────
with RAW_PATH.open() as f:
    raw = json.load(f)

with CAMP_PATH.open() as f:
    camp_raw = json.load(f)

restrictions = raw["restrictions"]
campuses = camp_raw["ai_campuses"]

existing_fips = {e["fips"] for e in restrictions}
existing_cids = {c["id"] for c in campuses}

added_r = 0
added_c = 0

# ── county restrictions ───────────────────────────────────────────────────────
new_restrictions = [
    {
        "fips": "08013",
        "name": "Boulder County",
        "state": "Colorado",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Boulder County Data Center and Research Computing Incentive Zone",
        "description": (
            "Boulder County hosts NOAA Earth System Research Laboratories, "
            "NCAR/UCAR Mesa Laboratory, and a dense cluster of federal and "
            "university research computing facilities. Colorado's EITC data "
            "center sales-tax exemption and renewable-energy incentives "
            "apply county-wide. Boulder County land-use regulations require "
            "new data centers above 50,000 sq ft to offset 100 % of "
            "electrical consumption with renewable sources."
        ),
        "effective_date": "2021-07-01",
        "status": "active",
        "notes": "Colorado H.B. 19-1166 renewable-energy requirement applies.",
        "sources": [
            {"label": "Colorado EITC Data Center Tax Exemption", "url": "https://leg.colorado.gov/bills/hb19-1166"},
            {"label": "Boulder County Community Development", "url": "https://www.bouldercounty.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "48303",
        "name": "Lubbock County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Lubbock County Data Center Development and Wind-Energy Incentive",
        "description": (
            "Lubbock County anchors the South Plains wind-energy corridor and "
            "is home to Texas Tech University's High Performance Computing "
            "Center (HPCC) and the National Wind Institute research cluster. "
            "Chapter 312/313 tax abatements are available for qualifying "
            "data centers. Lubbock Power & Light offers discounted industrial "
            "rates for high-load computing facilities connected to the ERCOT "
            "grid through the city's municipally owned utility."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "ERCOT grid; municipally owned LP&L utility.",
        "sources": [
            {"label": "Texas Tech HPCC", "url": "https://www.depts.ttu.edu/hpcc/"},
            {"label": "Lubbock Power & Light Rate Schedule", "url": "https://www.lpandl.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "48423",
        "name": "Smith County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center"],
        "title": "Smith County (Tyler) Data Center Corridor Incentive",
        "description": (
            "Smith County (Tyler, TX) has emerged as an East Texas data center "
            "corridor benefiting from Chapter 312 property-tax abatements and "
            "access to low-cost SWEPCO power. The Tyler Economic Development "
            "Council actively recruits hyperscale and colocation facilities, "
            "and the county provides streamlined permitting for large-footprint "
            "industrial buildings repurposed as data centers."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "Chapter 312 tax abatement eligible; SWEPCO utility territory.",
        "sources": [
            {"label": "Tyler Economic Development Council", "url": "https://www.tylertexas.com/"},
            {"label": "Texas Chapter 312 Abatement Program", "url": "https://comptroller.texas.gov/taxes/property-tax/chapter312/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37025",
        "name": "Cabarrus County",
        "state": "North Carolina",
        "level": 1,
        "types": ["energy", "data_center"],
        "title": "Cabarrus County Data Center Energy-Use Review Requirement",
        "description": (
            "Cabarrus County (Concord, NC) sits within the Charlotte metro "
            "energy market served by Duke Energy Carolinas. The county "
            "requires conditional use permits for data centers exceeding "
            "10 MW demand, with mandatory energy impact assessments to ensure "
            "grid stability in the western Charlotte load zone. North Carolina "
            "G.S. 105-164.13 data center sales-tax exemption partially offsets "
            "compliance costs for qualifying facilities."
        ),
        "effective_date": "2022-06-01",
        "status": "active",
        "notes": "Duke Energy Carolinas territory; NC data center tax exemption applies.",
        "sources": [
            {"label": "Cabarrus County Zoning Ordinance", "url": "https://www.cabarruscounty.us/"},
            {"label": "NC G.S. 105-164.13 Data Center Exemption", "url": "https://www.ncleg.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "42049",
        "name": "Erie County",
        "state": "Pennsylvania",
        "level": -1,
        "types": ["data_center"],
        "title": "Erie County Pennsylvania Data Center Reinvestment Initiative",
        "description": (
            "Erie County participates in Pennsylvania's data center incentive "
            "framework (SB 1138) offering sales-tax exemptions on computer "
            "equipment and electricity for qualifying facilities investing "
            "over $25 million. The Erie County Redevelopment Authority "
            "targets former industrial brownfield sites for data center "
            "conversion projects, leveraging Keystone Opportunity Zones "
            "for additional tax relief."
        ),
        "effective_date": "2020-07-01",
        "status": "active",
        "notes": "PA Keystone Opportunity Zone and SB 1138 incentives available.",
        "sources": [
            {"label": "Pennsylvania Data Center Incentive Program", "url": "https://dced.pa.gov/"},
            {"label": "Erie County Redevelopment Authority", "url": "https://www.eriecountypa.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "42133",
        "name": "York County",
        "state": "Pennsylvania",
        "level": -1,
        "types": ["data_center"],
        "title": "York County Pennsylvania Data Center Tax Incentive Zone",
        "description": (
            "York County is positioned along the I-83 technology and logistics "
            "corridor between Baltimore and Harrisburg. Pennsylvania's data "
            "center sales-tax exemption on servers, networking equipment, and "
            "electricity applies to qualifying facilities. The York County "
            "Economic Alliance actively promotes data center investment, "
            "supported by PPL Electric's industrial-rate programs and "
            "proximity to fiber backbone networks."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "PPL Electric utility territory; I-83 fiber corridor access.",
        "sources": [
            {"label": "York County Economic Alliance", "url": "https://ycea-pa.org/"},
            {"label": "DCED Pennsylvania Data Center Incentives", "url": "https://dced.pa.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51810",
        "name": "Virginia Beach city",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Virginia Beach Data Center and Cyber Operations Incentive Zone",
        "description": (
            "Virginia Beach hosts a major concentration of Department of Defense "
            "cyber and intelligence infrastructure, including Naval Air Station "
            "Oceana and the headquarters of Commander Navy Region Mid-Atlantic. "
            "The city participates in Virginia's data center sales-tax exemption "
            "(Va. Code § 58.1-609.3) and offers enterprise-zone incentives for "
            "qualifying computing facilities. Submarine fiber cables landing "
            "at Virginia Beach provide unique connectivity for global data "
            "center operators."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Transatlantic fiber cable landing point; Va. Code §58.1-609.3 exemption applies.",
        "sources": [
            {"label": "Virginia Beach Economic Development", "url": "https://www.vbgov.com/"},
            {"label": "Virginia Data Center Sales Tax Exemption", "url": "https://law.lis.virginia.gov/vacode/58.1-609.3/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51550",
        "name": "Chesapeake city",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center"],
        "title": "Chesapeake Virginia Data Center Enterprise Zone",
        "description": (
            "Chesapeake city is part of the Hampton Roads data center cluster "
            "benefiting from Virginia's data center sales-tax exemption and "
            "Dominion Energy's competitive industrial rates. The city's "
            "enterprise zone offers additional incentives including reduced "
            "business license taxes and infrastructure grants for "
            "large-footprint data center projects. Chesapeake's proximity "
            "to major military installations drives demand for secure, "
            "mission-critical computing facilities."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Dominion Energy territory; Hampton Roads data center cluster.",
        "sources": [
            {"label": "Chesapeake Economic Development", "url": "https://www.cityofchesapeake.net/"},
            {"label": "Virginia Enterprise Zone Program", "url": "https://www.dhcd.virginia.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "29077",
        "name": "Greene County",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center"],
        "title": "Greene County Missouri Data Center Tax Incentive Program",
        "description": (
            "Greene County (Springfield, MO) is Missouri's third-largest metro "
            "and a regional hub for state and healthcare IT infrastructure. "
            "Missouri's Chapter 100 bonds and the Missouri Works data center "
            "incentive program provide property-tax abatement and jobs tax "
            "credits for qualifying facilities. CoxHealth, Mercy Health, and "
            "Missouri State University anchor regional data center demand, "
            "while City Utilities of Springfield offers competitive power rates "
            "for large industrial customers."
        ),
        "effective_date": "2019-07-01",
        "status": "active",
        "notes": "City Utilities of Springfield power; Missouri Chapter 100 bonds available.",
        "sources": [
            {"label": "Springfield Business Development Corp", "url": "https://springfieldmo.gov/"},
            {"label": "Missouri Works Incentive Program", "url": "https://ded.mo.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13057",
        "name": "Cherokee County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Cherokee County Georgia Data Center Investment Incentive",
        "description": (
            "Cherokee County (Canton, GA) is one of the fastest-growing counties "
            "in metro Atlanta's northern arc. The county targets data center "
            "development through Georgia's data center tax exemption (O.C.G.A. "
            "§48-8-3.2) covering sales tax on equipment and energy. Expanding "
            "fiber infrastructure along the GA-5/I-575 corridor and competitive "
            "land costs relative to Fulton and Gwinnett counties attract "
            "hyperscale and colocation operators seeking Atlanta-adjacent "
            "locations with more favorable cost structures."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Georgia O.C.G.A. §48-8-3.2 data center exemption; Atlanta-metro fiber corridor.",
        "sources": [
            {"label": "Cherokee Office of Economic Development", "url": "https://www.cherokeega.com/"},
            {"label": "Georgia Data Center Tax Exemption", "url": "https://dor.georgia.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13117",
        "name": "Forsyth County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Forsyth County Georgia Data Center Expansion Zone",
        "description": (
            "Forsyth County (Cumming, GA) is Georgia's fastest-growing county "
            "and an emerging data center market north of Atlanta. Georgia's "
            "data center tax exemption (O.C.G.A. §48-8-3.2) eliminates sales "
            "tax on servers and power for qualifying facilities investing "
            "over $15 million. The county's location along US-19 and SR-400 "
            "provides access to Atlanta's fiber backbone, while Georgia Power's "
            "industrial-development rates support large computing loads. "
            "Several hyperscale and colocation campuses have entered "
            "pre-development in 2024–2025."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "Georgia Power territory; SR-400 fiber corridor; O.C.G.A. §48-8-3.2 applies.",
        "sources": [
            {"label": "Forsyth County Economic Development", "url": "https://www.forsythco.com/"},
            {"label": "Georgia Data Center Tax Exemption (OCGA §48-8-3.2)", "url": "https://dor.georgia.gov/"}
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
        "types": ["data_center"],
        "title": "Sangamon County Illinois State Capital Data Center Incentive Zone",
        "description": (
            "Sangamon County (Springfield, IL) hosts the Illinois state "
            "government's primary data center infrastructure, including "
            "facilities for the Illinois Department of Innovation and "
            "Technology (DoIT). Illinois' data center tax incentive (35 ILCS "
            "120/2-5(7)) provides a sales-tax exemption on computer equipment "
            "and electricity for qualifying facilities investing over $250 million "
            "over 60 months. Ameren Illinois offers competitive rates for "
            "large industrial customers in the county."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Illinois DoIT primary data infrastructure; 35 ILCS 120/2-5(7) exemption.",
        "sources": [
            {"label": "Illinois DoIT Data Center Program", "url": "https://doit.illinois.gov/"},
            {"label": "Illinois Data Center Tax Exemption (35 ILCS 120/2-5)", "url": "https://www.ilga.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

for entry in new_restrictions:
    if entry["fips"] not in existing_fips:
        restrictions.append(entry)
        existing_fips.add(entry["fips"])
        added_r += 1

# ── AI campuses ───────────────────────────────────────────────────────────────
new_campuses = [
    {
        "id": "ai-co-004",
        "name": "NOAA Earth System Research Laboratories (ESRL) — Boulder CO",
        "operator": "NOAA / U.S. Department of Commerce",
        "status": "operational",
        "county_fips": "08013",
        "notes": (
            "NOAA ESRL in Boulder operates high-performance computing systems "
            "supporting atmospheric research, climate modeling, and "
            "weather-prediction AI. Co-located with NCAR/UCAR Mesa Laboratory "
            "on the NOAA-Boulder campus."
        ),
        "lon": -105.2624,
        "lat": 39.9906,
    },
    {
        "id": "ai-tx-008",
        "name": "Texas Tech University High Performance Computing Center (HPCC)",
        "operator": "Texas Tech University",
        "status": "operational",
        "county_fips": "48303",
        "notes": (
            "TTU HPCC operates Quanah (Cray) and other HPC clusters supporting "
            "research in wind energy, climate modeling, atmospheric science, "
            "and AI/ML workloads. Part of the National Wind Institute campus."
        ),
        "lon": -101.8748,
        "lat": 33.5843,
    },
    {
        "id": "ai-va-009",
        "name": "Naval Air Station Oceana / Commander Navy Region Mid-Atlantic",
        "operator": "U.S. Navy",
        "status": "operational",
        "county_fips": "51810",
        "notes": (
            "NAS Oceana hosts extensive C4ISR and cyber operations infrastructure "
            "for the Atlantic Fleet. Commander Navy Region Mid-Atlantic "
            "coordinates data/AI operations for naval facilities from "
            "Virginia Beach to Maine."
        ),
        "lon": -76.0330,
        "lat": 36.8182,
    },
    {
        "id": "ai-ga-007",
        "name": "Forsyth County School District Data and AI Operations Center",
        "operator": "Forsyth County Schools / FCSD Technology",
        "status": "operational",
        "county_fips": "13117",
        "notes": (
            "One of Georgia's largest and fastest-growing school districts, "
            "FCSD operates a substantial on-premise data center and AI-assisted "
            "learning analytics platform serving 60,000+ students. "
            "The facility anchors local fiber and data center demand in Cumming."
        ),
        "lon": -84.1388,
        "lat": 34.2099,
    },
    {
        "id": "ai-il-006",
        "name": "Illinois Department of Innovation and Technology (DoIT) — State Data Center",
        "operator": "State of Illinois / DoIT",
        "status": "operational",
        "county_fips": "17167",
        "notes": (
            "The Illinois DoIT State Data Center in Springfield hosts "
            "enterprise IT and AI infrastructure for state government agencies, "
            "including the Illinois Integrated Eligibility System and "
            "statewide cybersecurity operations."
        ),
        "lon": -89.6501,
        "lat": 39.7984,
    },
]

for campus in new_campuses:
    if campus["id"] not in existing_cids:
        campuses.append(campus)
        existing_cids.add(campus["id"])
        added_c += 1

# ── write back ────────────────────────────────────────────────────────────────
raw["restrictions"] = restrictions
camp_raw["ai_campuses"] = campuses

with RAW_PATH.open("w") as f:
    json.dump(raw, f, indent=2, ensure_ascii=False)

with CAMP_PATH.open("w") as f:
    json.dump(camp_raw, f, indent=2, ensure_ascii=False)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(restrictions)}, Total campuses: {len(campuses)}")
