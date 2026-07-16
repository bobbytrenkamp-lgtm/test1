"""
Sweep X — 2026-07-16
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
        "fips": "12021",
        "name": "Collier County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center"],
        "title": "Collier County Florida Data Center and Smart-Growth Technology Incentive",
        "description": (
            "Collier County (Naples, FL) has pursued technology diversification "
            "alongside its tourism and real estate economy. Florida's data center "
            "sales-tax exemption (F.S. §212.08(5)(j)) applies county-wide, and "
            "FPL (Florida Power & Light) serves the county with one of Florida's "
            "lowest residential and commercial rates driven by solar investment. "
            "Collier County's Accelerate Naples economic development program "
            "targets technology and innovation employers including small-footprint "
            "edge data centers serving Southwest Florida's growing population."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "FPL utility; FL §212.08(5)(j) exemption; Accelerate Naples tech program.",
        "sources": [
            {"label": "Accelerate Naples — Collier County Economic Development", "url": "https://www.colliercountyfl.gov/"},
            {"label": "Florida Power & Light Rates and Solar", "url": "https://www.fpl.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "22103",
        "name": "St. Tammany Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "St. Tammany Parish Louisiana Northshore Technology and Data Center Incentive",
        "description": (
            "St. Tammany Parish (Covington/Mandeville, LA) is Louisiana's "
            "fastest-growing parish and the anchor of the New Orleans Northshore "
            "technology corridor. The parish participates in Louisiana's Quality "
            "Jobs Program and Industrial Tax Exemption Program (ITEP), both "
            "available to qualifying data center projects. Entergy Louisiana "
            "serves the parish with access to the MISO grid and competitive "
            "industrial rates. The Northshore Fiber Network and proximity to "
            "New Orleans' fiber hubs support co-location and cloud-gateway "
            "deployments serving the Gulf Coast market."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "Entergy Louisiana; MISO grid; Louisiana ITEP and Quality Jobs available.",
        "sources": [
            {"label": "St. Tammany Economic Development Foundation", "url": "https://www.stedf.org/"},
            {"label": "Louisiana Industrial Tax Exemption Program (ITEP)", "url": "https://www.opportunitylouisiana.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "22089",
        "name": "St. Charles Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "St. Charles Parish Louisiana Industrial Corridor Data Center Zone",
        "description": (
            "St. Charles Parish lies along the Mississippi River chemical and "
            "industrial corridor between Baton Rouge and New Orleans. The parish "
            "benefits from Louisiana's Industrial Tax Exemption Program (ITEP) "
            "and has some of the highest electric-generation capacity per capita "
            "in the nation due to its refinery and petrochemical base. Entergy "
            "Louisiana provides industrial rates suited to large computing loads, "
            "and the parish's established heavy-industrial permitting experience "
            "supports large-footprint data center construction."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "High-capacity industrial power; Entergy Louisiana; ITEP available.",
        "sources": [
            {"label": "St. Charles Parish Government Economic Development", "url": "https://www.stcharlesparish-la.gov/"},
            {"label": "Louisiana ITEP Program", "url": "https://www.opportunitylouisiana.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "05031",
        "name": "Craighead County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center"],
        "title": "Craighead County Arkansas Data Center and Technology Incentive",
        "description": (
            "Craighead County (Jonesboro, AR) is home to Arkansas State "
            "University (ASU) and the Arkansas Center for Data Sciences, "
            "generating regional HPC and AI research demand. Arkansas's "
            "Invest Arkansas program offers tax credits and grants for "
            "qualifying technology facilities, and Entergy Arkansas provides "
            "industrial rates competitive with regional peers. Jonesboro's "
            "manufacturing and logistics base is increasingly augmented by "
            "AI-driven supply-chain optimization workloads."
        ),
        "effective_date": "2020-07-01",
        "status": "active",
        "notes": "ASU data science anchor; Entergy Arkansas; Invest Arkansas program.",
        "sources": [
            {"label": "Jonesboro Regional Chamber of Commerce", "url": "https://www.jonesborochamber.com/"},
            {"label": "Arkansas Economic Development Commission — Invest Arkansas", "url": "https://www.arkansasedc.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37085",
        "name": "Harnett County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Harnett County North Carolina Defense Technology and Data Center Zone",
        "description": (
            "Harnett County is home to Fort Liberty (formerly Fort Bragg), "
            "the U.S. Army's largest installation and a major hub for Special "
            "Operations Command (USSOCOM) cyber and intelligence computing. "
            "North Carolina's data center tax exemption (G.S. 105-164.13) "
            "applies to qualifying facilities, and Duke Energy Progress "
            "serves the county with industrial-rate schedules. The county's "
            "proximity to the Research Triangle (Durham/Raleigh) provides "
            "fiber access and workforce supply for commercial data center "
            "operators benefiting from defense-sector proximity."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Fort Liberty/USSOCOM cyber anchor; NC G.S. 105-164.13 exemption; Duke Energy Progress.",
        "sources": [
            {"label": "Harnett County Economic Development", "url": "https://www.harnett.org/"},
            {"label": "NC G.S. 105-164.13 Data Center Exemption", "url": "https://www.ncleg.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "47035",
        "name": "Cumberland County",
        "state": "Tennessee",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Cumberland County Tennessee Plateau Technology and Data Center Incentive",
        "description": (
            "Cumberland County (Crossville, TN) sits on the Cumberland Plateau "
            "and offers a cooler microclimate (lower PUE costs) and abundant "
            "TVA-supplied hydroelectric and nuclear power. TVA's competitive "
            "industrial rates and Tennessee's data center sales-tax exemption "
            "(Tenn. Code Ann. §67-6-329) apply to qualifying facilities investing "
            "over $100 million. The Crossville-Plateau Airport and I-40 access "
            "support construction logistics, and the county's growing retirement "
            "and tech-remote population anchors fiber build-out."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "TVA hydro/nuclear power; cooler plateau climate; TCA §67-6-329 exemption.",
        "sources": [
            {"label": "Cumberland County Chamber Economic Development", "url": "https://www.crossvillememphischamber.com/"},
            {"label": "Tennessee Data Center Sales Tax Exemption TCA §67-6-329", "url": "https://www.tn.gov/revenue/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "53015",
        "name": "Cowlitz County",
        "state": "Washington",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Cowlitz County Washington Columbia River Industrial Power Zone",
        "description": (
            "Cowlitz County (Longview, WA) sits along the Columbia River and "
            "is served by Cowlitz County PUD with some of the lowest industrial "
            "power rates in the United States, sourced primarily from Columbia "
            "River hydroelectric generation. Washington's data center sales-tax "
            "exemption (RCW 82.08.986) applies to qualifying investments over "
            "$200 million. The Longview-Kelso industrial port complex and "
            "proximity to Portland, OR fiber exchanges make the county "
            "attractive for hyperscale operators seeking renewable-power "
            "contracts at competitive pricing."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "Cowlitz PUD ultra-low hydro rates; RCW 82.08.986 exemption; Portland fiber access.",
        "sources": [
            {"label": "Cowlitz County PUD — Industrial Rates", "url": "https://www.cowlitzpud.org/"},
            {"label": "WA Data Center Sales Tax Exemption RCW 82.08.986", "url": "https://app.leg.wa.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "16019",
        "name": "Bonneville County",
        "state": "Idaho",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Bonneville County Idaho National Laboratory AI Research Zone",
        "description": (
            "Bonneville County (Idaho Falls, ID) hosts Idaho National Laboratory "
            "(INL), the U.S. Department of Energy's leading nuclear energy "
            "research center and a growing hub for AI, machine learning, and "
            "cybersecurity research. INL's Mission Support Center and Cybercore "
            "Integration Center operate HPC clusters. Idaho's data center "
            "property-tax exemption and Rocky Mountain Power's competitive rates "
            "— including access to Snake River hydro and nuclear power — "
            "make Bonneville County one of the most cost-effective data "
            "center locations in the Mountain West."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "INL Cybercore HPC; Rocky Mountain Power hydro+nuclear; ID property-tax exemption.",
        "sources": [
            {"label": "Idaho National Laboratory (INL)", "url": "https://inl.gov/"},
            {"label": "Idaho Falls Area Chamber Economic Development", "url": "https://www.idahofallschamber.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "31079",
        "name": "Hall County",
        "state": "Nebraska",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Hall County Nebraska Grand Island Data Center and Renewable Energy Incentive",
        "description": (
            "Hall County (Grand Island, NE) is served by Grand Island Utilities "
            "and NPPD (Nebraska Public Power District) with competitive industrial "
            "rates and access to Nebraska's wind energy surplus. Nebraska's "
            "data center incentive (LB 552) provides a sales-tax exemption "
            "on data center equipment and electricity for facilities meeting "
            "investment thresholds. Grand Island's central Nebraska location "
            "and I-80 fiber access position it as a disaster-recovery "
            "and secondary-market data center destination."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "NPPD and Grand Island Utilities; NE LB 552 sales-tax exemption; I-80 fiber.",
        "sources": [
            {"label": "Grand Island Economic Development", "url": "https://www.grand-island.com/"},
            {"label": "Nebraska Data Center Incentive LB 552", "url": "https://nebraskalegislature.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "29145",
        "name": "Newton County",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center"],
        "title": "Newton County Missouri Joplin Area Data Center Development Zone",
        "description": (
            "Newton County (Neosho/Joplin area, MO) benefits from Missouri's "
            "Chapter 100 industrial bonds and Missouri Works incentives available "
            "to qualifying data center investments. Empire Electric / Liberty "
            "Utilities serves the county with competitive commercial rates. "
            "The Joplin metro's position at the US-71/I-44 interchange and "
            "its fiber-served enterprise park infrastructure attract logistics "
            "and edge computing operators serving the four-state region "
            "(MO, KS, OK, AR)."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Liberty Utilities; Missouri Chapter 100 bonds; Joplin four-state hub.",
        "sources": [
            {"label": "Joplin Area Chamber of Commerce Economic Development", "url": "https://www.joplincc.com/"},
            {"label": "Missouri Chapter 100 Industrial Bond Program", "url": "https://ded.mo.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "20155",
        "name": "Reno County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Reno County Kansas Data Center and Wind Energy Development Zone",
        "description": (
            "Reno County (Hutchinson, KS) sits in south-central Kansas within "
            "one of the nation's most productive wind energy zones. Evergy "
            "(formerly Westar) provides industrial power increasingly sourced "
            "from Kansas wind turbines, with corporate renewable energy "
            "certificates (RECs) available. Kansas's data center property-tax "
            "exemption (K.S.A. 79-223) and the Hutchinson Area Economic "
            "Development Council's incentive programs attract data center "
            "operators seeking flat-rate, renewable-energy contracts."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Evergy wind-heavy grid; K.S.A. 79-223 property-tax exemption; I-135 corridor.",
        "sources": [
            {"label": "Hutchinson Area Economic Development Council", "url": "https://www.hutchinsonks.com/"},
            {"label": "Kansas Data Center Tax Exemption K.S.A. 79-223", "url": "https://www.ksrevenue.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "56033",
        "name": "Sheridan County",
        "state": "Wyoming",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Sheridan County Wyoming Data Center Energy and Tax Incentive Zone",
        "description": (
            "Sheridan County (Sheridan, WY) benefits from Wyoming's uniquely "
            "favorable data center environment: no corporate income tax, no "
            "individual income tax, and no sales tax on data center equipment "
            "or electricity. Black Hills Energy serves the county with "
            "competitive industrial rates. Sheridan's position near I-90 "
            "and proximity to Billings, MT fiber exchanges supports redundant "
            "connectivity. The county's high-altitude, cooler climate reduces "
            "data center cooling costs."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "No Wyoming income or sales tax; Black Hills Energy; high-altitude cooling.",
        "sources": [
            {"label": "Wyoming Business Council — Data Center Incentives", "url": "https://wyomingbusiness.org/"},
            {"label": "Sheridan Economic and Educational Development (SEED)", "url": "https://sheridanwyoseed.org/"}
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
        "id": "ai-id-002",
        "name": "Idaho National Laboratory (INL) Cybercore Integration Center",
        "operator": "U.S. Department of Energy / Battelle Energy Alliance",
        "status": "operational",
        "county_fips": "16019",
        "notes": (
            "INL's Cybercore Integration Center in Idaho Falls is DOE's premier "
            "facility for industrial control system cybersecurity research and "
            "AI-driven threat detection. The facility also hosts the Mission "
            "Support Center HPC cluster supporting nuclear energy modeling, "
            "materials science AI, and critical infrastructure protection."
        ),
        "lon": -112.0391,
        "lat": 43.5160,
    },
    {
        "id": "ai-la-004",
        "name": "St. Tammany Corporation Innovation Center — Covington LA",
        "operator": "St. Tammany Corporation / Northshore Tech Hub",
        "status": "operational",
        "county_fips": "22103",
        "notes": (
            "The St. Tammany Corporation operates the Northshore technology "
            "innovation hub in Covington, supporting data analytics, cybersecurity, "
            "and AI/ML startups serving the Gulf Coast energy and logistics "
            "sectors. The facility anchors Northshore Tech, a regional tech "
            "cluster attracting remote tech workers from the New Orleans metro."
        ),
        "lon": -90.0989,
        "lat": 30.4752,
    },
    {
        "id": "ai-nc-005",
        "name": "Fort Liberty (Fort Bragg) USSOCOM Cyber and AI Operations",
        "operator": "U.S. Army / USSOCOM",
        "status": "operational",
        "county_fips": "37085",
        "notes": (
            "Fort Liberty hosts U.S. Army Special Operations Command (USSOCOM) "
            "cyber and intelligence computing infrastructure, including classified "
            "AI/ML platforms for mission planning, threat analysis, and "
            "tactical autonomous systems research. Fort Liberty is one of the "
            "largest military installations in the world by population."
        ),
        "lon": -79.0064,
        "lat": 35.1390,
    },
    {
        "id": "ai-wa-006",
        "name": "Cowlitz County PUD Industrial Computing — Longview WA",
        "operator": "Cowlitz County PUD / Lower Columbia Economic Development Council",
        "status": "planned",
        "county_fips": "53015",
        "notes": (
            "Cowlitz County PUD has partnered with the Lower Columbia EDC to "
            "develop an industrial data center park leveraging the PUD's "
            "ultra-low hydroelectric rates (<2 cents/kWh). Several hyperscale "
            "operators have engaged in site selection processes for the "
            "Longview industrial port area, making this a planned major "
            "computing campus in the Pacific Northwest."
        ),
        "lon": -122.9384,
        "lat": 46.1382,
    },
    {
        "id": "ai-ar-003",
        "name": "Arkansas State University High Performance Computing Center — Jonesboro",
        "operator": "Arkansas State University (ASU)",
        "status": "operational",
        "county_fips": "05031",
        "notes": (
            "Arkansas State University operates a regional HPC cluster and "
            "data analytics center in Jonesboro, supporting research in "
            "agricultural AI, bioinformatics, and supply-chain optimization "
            "for the Arkansas Delta region. The facility is part of the "
            "Arkansas High Performance Computing Center (AHPCC) statewide network."
        ),
        "lon": -90.7043,
        "lat": 35.8423,
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
