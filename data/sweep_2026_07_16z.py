"""
Sweep Z — 2026-07-16
Adds 12 county restriction entries and 5 AI campuses.
Idempotent: skips entries already present in the data files.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent
RAW_PATH = DATA_DIR / "restrictions_raw.json"
CAMP_PATH = DATA_DIR / "ai_campuses.json"

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

new_restrictions = [
    {
        "fips": "08069",
        "name": "Larimer County",
        "state": "Colorado",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Larimer County Colorado Fort Collins Technology Corridor Incentive",
        "description": (
            "Larimer County (Fort Collins, CO) hosts Colorado State University, "
            "HP Inc./HP Enterprise legacy facilities, Intel's campus, and a "
            "dense cluster of cleantech and advanced manufacturing firms. "
            "Colorado's EITC data center sales-tax exemption and Platte River "
            "Power Authority's competitive industrial rates — including "
            "access to substantial renewable energy — make the county "
            "attractive for HPC and hyperscale operators. Fort Collins Utilities "
            "and PRPA jointly provide power with Colorado's cleanest grid mix "
            "in the region."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "CSU/HP/Intel tech cluster; PRPA renewable power; CO EITC exemption.",
        "sources": [
            {"label": "Fort Collins Economic Health Office", "url": "https://www.fcgov.com/economicdevelopment/"},
            {"label": "Colorado EITC Data Center Tax Exemption", "url": "https://leg.colorado.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "11001",
        "name": "District of Columbia",
        "state": "DC",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "District of Columbia Federal Government Data Center and AI Hub",
        "description": (
            "The District of Columbia hosts the highest concentration of federal "
            "government data centers in the United States, including facilities "
            "operated by the National Archives and Records Administration (NARA), "
            "the Library of Congress Digital Preservation program, the U.S. "
            "Census Bureau's research systems, and numerous cabinet-agency IT "
            "operations. DC's mayor's office Data Center Incentive program "
            "and the federal agency cloud migration initiative under FITARA "
            "shape data center development. Commercial co-location operators "
            "also maintain a strong presence supporting lobbyist and "
            "contractor technology operations."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Federal data center concentration; NARA/LOC/Census digital ops; FITARA compliance zone.",
        "sources": [
            {"label": "DC Office of the Chief Technology Officer", "url": "https://octo.dc.gov/"},
            {"label": "Federal IT Acquisition Reform Act (FITARA)", "url": "https://www.congress.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "26093",
        "name": "Livingston County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Livingston County Michigan Automotive AI and Data Center Corridor",
        "description": (
            "Livingston County (Howell/Brighton, MI) is part of Michigan's "
            "automotive technology belt between Detroit and Lansing. Major "
            "automotive OEM and Tier-1 supplier operations generate AI, "
            "simulation, and vehicle data computing demand. Stellantis, "
            "General Motors, and numerous Tier-1 suppliers operate facilities "
            "in the county. Michigan's data center incentives (MCL 207.803) "
            "and DTE Energy's competitive industrial rates support qualifying "
            "computing investments. The I-96 tech corridor connects to Ann "
            "Arbor, Dearborn, and Lansing fiber infrastructure."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Automotive AI/simulation demand; DTE Energy; MCL 207.803 incentive; I-96 fiber.",
        "sources": [
            {"label": "Livingston County Economic Development", "url": "https://www.livgov.com/edc/"},
            {"label": "Michigan Data Center Incentive MCL 207.803", "url": "https://www.legislature.mi.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "38101",
        "name": "Ward County",
        "state": "North Dakota",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Ward County North Dakota Minot AFB and Energy Corridor Data Center Zone",
        "description": (
            "Ward County (Minot, ND) hosts Minot Air Force Base, home to "
            "the 5th Bomb Wing (B-52H Stratofortress) and the 91st Missile "
            "Wing's Intercontinental Ballistic Missile (ICBM) nuclear command "
            "and control infrastructure. These military operations require "
            "substantial classified computing. On the commercial side, "
            "North Dakota's data center property-tax exemption (N.D.C.C. "
            "§57-02-08) and Basin Electric Power Cooperative's industrial "
            "rates — increasingly backed by ND wind energy — support "
            "qualifying data center investment."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Minot AFB nuclear C2 computing; Basin Electric wind/coal; ND §57-02-08 exemption.",
        "sources": [
            {"label": "Minot Area Development Corporation (MADC)", "url": "https://www.minot.com/"},
            {"label": "North Dakota Data Center Tax Exemption §57-02-08", "url": "https://www.legis.nd.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "50027",
        "name": "Windsor County",
        "state": "Vermont",
        "level": -1,
        "types": ["data_center"],
        "title": "Windsor County Vermont Precision Valley Technology and Data Incentive",
        "description": (
            "Windsor County (Woodstock/Windsor, VT) occupies Vermont's "
            "historic 'Precision Valley' manufacturing corridor along the "
            "Connecticut River. Vermont's Act 250 environmental land-use "
            "review applies to large facilities, but the state's Business "
            "Vermont incentive program provides corporate income-tax credits "
            "for qualifying technology employers. Green Mountain Power "
            "serves the county with one of the cleanest utility grids in "
            "New England (85%+ renewable-sourced). The county's small scale "
            "positions it for edge data center and colocation "
            "deployments serving the upper Connecticut River Valley."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Green Mountain Power 85%+ renewable; VT Business incentive; Act 250 review applies.",
        "sources": [
            {"label": "Green Mountain Power — Vermont's Clean Energy Grid", "url": "https://greenmountainpower.com/"},
            {"label": "Vermont Agency of Commerce and Community Development", "url": "https://accd.vermont.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51600",
        "name": "Fairfax city",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Fairfax City Virginia Government Technology and Data Center Incentive",
        "description": (
            "Fairfax city is an independent city within the Northern Virginia "
            "technology corridor surrounded by Fairfax County's data center "
            "concentration. Virginia's data center sales-tax exemption "
            "(Va. Code §58.1-609.3) applies city-wide. The city hosts "
            "George Mason University's main campus — one of the nation's "
            "largest universities — which generates substantial HPC and "
            "AI research demand in cybersecurity, data science, and "
            "bioinformatics. Dominion Energy serves the city with access "
            "to the PJM transmission grid."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "George Mason University HPC anchor; Va. §58.1-609.3; Dominion Energy.",
        "sources": [
            {"label": "City of Fairfax Economic Development", "url": "https://www.fairfaxva.gov/"},
            {"label": "George Mason University Research Computing", "url": "https://arcs.gmu.edu/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51683",
        "name": "Manassas city",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Manassas City Virginia Data Center Alley Anchor Zone",
        "description": (
            "Manassas city sits at the southwestern end of Northern Virginia's "
            "'Data Center Alley' — the world's highest concentration of data "
            "center capacity. Virginia's data center sales-tax exemption "
            "(Va. Code §58.1-609.3) applies city-wide, eliminating sales "
            "tax on servers, networking equipment, and electricity for "
            "qualifying facilities. Dominion Energy provides industrial "
            "power via the high-voltage PJM grid. The city also hosts "
            "a major Micron Technology semiconductor manufacturing facility "
            "that drives substantial process-control and design AI computing."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "Data Center Alley anchor; Micron semiconductor fab; Va. §58.1-609.3; Dominion Energy.",
        "sources": [
            {"label": "Manassas City Economic Development", "url": "https://www.manassascity.org/"},
            {"label": "Virginia Data Center Sales Tax Exemption §58.1-609.3", "url": "https://law.lis.virginia.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "55111",
        "name": "Sauk County",
        "state": "Wisconsin",
        "level": -1,
        "types": ["data_center"],
        "title": "Sauk County Wisconsin Dells Technology and Data Center Incentive",
        "description": (
            "Sauk County (Baraboo/Wisconsin Dells, WI) benefits from Wisconsin's "
            "data center sales-tax exemption (Wis. Stat. §77.54(57)) and "
            "Alliant Energy's competitive industrial rates. The county's "
            "tourism economy (Wisconsin Dells) has attracted broadband "
            "infrastructure investment, while Baraboo's industrial base "
            "supports manufacturing AI. The Wisconsin Economic Development "
            "Corporation's (WEDC) Enterprise Zone program provides tax "
            "credits for qualifying technology investments in Baraboo's "
            "downtown redevelopment corridor."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Alliant Energy utility; Wis. §77.54(57) exemption; WEDC Enterprise Zone.",
        "sources": [
            {"label": "Sauk County Economic Development", "url": "https://www.co.sauk.wi.us/"},
            {"label": "Wisconsin WEDC Data Center Incentives", "url": "https://wedc.org/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "25003",
        "name": "Berkshire County",
        "state": "Massachusetts",
        "level": -1,
        "types": ["data_center"],
        "title": "Berkshire County Massachusetts Innovation District and Edge Data Center Zone",
        "description": (
            "Berkshire County (Pittsfield, MA) has transitioned from GE's "
            "former manufacturing base to an emerging technology and creative "
            "economy. Massachusetts's Opportunity Zone tax incentives apply "
            "to qualifying data center investments in Pittsfield's downtown "
            "renewal zones. Eversource Energy provides industrial power "
            "with access to New England's hydroelectric-heavy grid. The "
            "Berkshire Innovation Center at Mass College of Liberal Arts "
            "supports advanced manufacturing and data analytics startups, "
            "and fiber backbone runs along the US-20 corridor connecting "
            "Albany, NY and Springfield, MA markets."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Pittsfield Opportunity Zone; Berkshire Innovation Center; Eversource; Albany fiber link.",
        "sources": [
            {"label": "Berkshire Innovation Center", "url": "https://www.berkshireinnovationcenter.com/"},
            {"label": "MassDevelopment — Berkshire Region Economic Development", "url": "https://www.massdevelopment.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "06031",
        "name": "Kings County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Kings County California Central Valley Energy and Agricultural Data Zone",
        "description": (
            "Kings County (Hanford/Lemoore, CA) hosts Naval Air Station "
            "Lemoore, the Navy's largest tactical jet air station and a "
            "major carrier air wing computing installation. The county is "
            "served by PG&E with access to the San Joaquin Valley power "
            "corridor. Agricultural data demand from dairy and field crops "
            "drives precision farming AI workloads, and the county's "
            "Central Valley location offers lower land costs than Bay Area "
            "data center markets with I-5 and CA-99 fiber-corridor access."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "NAS Lemoore Navy computing; PG&E; Central Valley ag AI demand; I-5 fiber corridor.",
        "sources": [
            {"label": "Kings County Economic Development", "url": "https://www.countyofkings.com/"},
            {"label": "Naval Air Station Lemoore", "url": "https://www.cnic.navy.mil/regions/cnrsw/installations/nas_lemoore.html"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "09015",
        "name": "Windham County",
        "state": "Connecticut",
        "level": -1,
        "types": ["data_center"],
        "title": "Windham County Connecticut Quiet Corner Technology and Data Center Incentive",
        "description": (
            "Windham County (Putnam/Willimantic, CT) is known as Connecticut's "
            "'Quiet Corner' and is home to Eastern Connecticut State University "
            "and substantial textile and manufacturing history repurposed into "
            "industrial real estate. Connecticut's Digital Competitiveness Act "
            "(P.A. 21-76) and Eversource Energy's industrial rates apply "
            "county-wide. The county's affordable land and lower operating "
            "costs relative to Fairfield and Hartford counties attract "
            "edge computing and disaster-recovery facilities, and fiber "
            "runs along the US-6 corridor connecting Worcester and Hartford."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Eastern CT State Univ. anchor; CT P.A. 21-76; Eversource; US-6 fiber corridor.",
        "sources": [
            {"label": "Quiet Corner Chamber of Commerce — Windham County", "url": "https://www.windhamct.com/"},
            {"label": "Connecticut Digital Competitiveness Act P.A. 21-76", "url": "https://www.cga.ct.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "40079",
        "name": "Le Flore County",
        "state": "Oklahoma",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Le Flore County Oklahoma Choctaw Nation Energy and Data Center Incentive",
        "description": (
            "Le Flore County (Poteau, OK) is within the Choctaw Nation of "
            "Oklahoma's jurisdiction and benefits from tribal economic development "
            "initiatives including technology infrastructure investment. "
            "The county lies along the Arkansas border energy corridor with "
            "access to AEP (American Electric Power) SWEPCO's industrial "
            "grid. Oklahoma's data center sales-tax exemption (68 O.S. §54006) "
            "applies to qualifying facilities, and the Choctaw Nation's "
            "economic development programs provide additional incentives "
            "for technology employment in tribal areas."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Choctaw Nation tribal incentives; SWEPCO/AEP grid; 68 O.S. §54006 exemption.",
        "sources": [
            {"label": "Choctaw Nation of Oklahoma Economic Development", "url": "https://www.choctawnation.com/"},
            {"label": "Oklahoma Data Center Incentive 68 O.S. §54006", "url": "https://www.tax.ok.gov/"}
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

new_campuses = [
    {
        "id": "ai-co-005",
        "name": "Colorado State University HPC / NCAR Wyoming Supercomputing Liaison — Fort Collins CO",
        "operator": "Colorado State University / NCAR",
        "status": "operational",
        "county_fips": "08069",
        "notes": (
            "CSU's high-performance computing cluster in Fort Collins supports "
            "atmospheric science, climate modeling, wildfire AI, and agricultural "
            "research in partnership with NCAR's Mesa Lab (Boulder) and the "
            "NCAR-Wyoming Supercomputing Center (Cheyenne). CSU's data science "
            "and AI programs anchor Larimer County's research computing demand."
        ),
        "lon": -105.0844,
        "lat": 40.5734,
    },
    {
        "id": "ai-dc-001",
        "name": "Library of Congress National Digital Preservation Infrastructure",
        "operator": "Library of Congress / U.S. Congress",
        "status": "operational",
        "county_fips": "11001",
        "notes": (
            "The Library of Congress operates one of the largest digital "
            "preservation and AI-assisted cataloging infrastructures in the "
            "world, with primary systems on Capitol Hill. The LC's National "
            "Digital Information Infrastructure and Preservation Program "
            "(NDIIPP) and AI Labs for metadata enrichment serve the national "
            "digital collections."
        ),
        "lon": -77.0047,
        "lat": 38.8892,
    },
    {
        "id": "ai-va-010",
        "name": "Micron Technology Manassas Semiconductor Fab — AI Process Control",
        "operator": "Micron Technology",
        "status": "operational",
        "county_fips": "51683",
        "notes": (
            "Micron's Manassas fabrication plant (formerly 'IM Flash') is one "
            "of the oldest DRAM memory chip fabs in the U.S., now producing "
            "LPDDR5 and 3D NAND memory. The facility operates AI-driven "
            "process control and defect detection systems, making it one "
            "of the most significant semiconductor AI deployments on the "
            "East Coast."
        ),
        "lon": -77.5185,
        "lat": 38.7601,
    },
    {
        "id": "ai-mi-003",
        "name": "Stellantis Brighton Assembly and AI Engineering Center — Livingston County MI",
        "operator": "Stellantis (FCA / Chrysler)",
        "status": "operational",
        "county_fips": "26093",
        "notes": (
            "Stellantis operates engineering and prototype vehicle testing "
            "facilities in Livingston County, MI, including AI-driven "
            "autonomous vehicle simulation, electrification software testing, "
            "and connected-car data processing. The Brighton/Howell area "
            "hosts several Tier-1 supplier operations and Stellantis "
            "powertrain engineering centers."
        ),
        "lon": -83.7799,
        "lat": 42.5334,
    },
    {
        "id": "ai-nd-004",
        "name": "Minot Air Force Base — 91st Missile Wing Command and Control",
        "operator": "U.S. Air Force / Air Force Global Strike Command",
        "status": "operational",
        "county_fips": "38101",
        "notes": (
            "Minot AFB hosts the 91st Missile Wing, responsible for Minuteman III "
            "ICBMs across 150 launch facilities in ND, and the 5th Bomb Wing "
            "(B-52H). The base operates classified nuclear command-and-control "
            "computing infrastructure and Air Force Global Strike Command "
            "C4ISR systems. Emerging AI/ML applications support targeting "
            "analytics and base cybersecurity."
        ),
        "lon": -101.3579,
        "lat": 48.4154,
    },
]

for campus in new_campuses:
    if campus["id"] not in existing_cids:
        campuses.append(campus)
        existing_cids.add(campus["id"])
        added_c += 1

raw["restrictions"] = restrictions
camp_raw["ai_campuses"] = campuses

with RAW_PATH.open("w") as f:
    json.dump(raw, f, indent=2, ensure_ascii=False)

with CAMP_PATH.open("w") as f:
    json.dump(camp_raw, f, indent=2, ensure_ascii=False)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(restrictions)}, Total campuses: {len(campuses)}")
