"""
Sweep Y — 2026-07-16
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
        "fips": "25027",
        "name": "Worcester County",
        "state": "Massachusetts",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Worcester County Massachusetts Life Sciences and Data Center Technology Incentive",
        "description": (
            "Worcester County anchors central Massachusetts's life sciences "
            "and higher-education cluster, home to UMass Medical School, "
            "Worcester Polytechnic Institute, and over 160 biotech and medical "
            "device companies. These institutions generate substantial clinical "
            "data, genomics, and AI research computing demand. Eversource Energy "
            "provides industrial rates, and Massachusetts's Opportunity Zone "
            "tax incentives apply to qualifying data center and tech-facility "
            "investments in designated census tracts throughout Worcester."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "UMass Medical/WPI biotech anchor; Eversource utility; MA Opportunity Zones.",
        "sources": [
            {"label": "Worcester Regional Chamber of Commerce Tech Sector", "url": "https://www.worcesterchamber.org/"},
            {"label": "Massachusetts Opportunity Zone Program", "url": "https://www.mass.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "09001",
        "name": "Fairfield County",
        "state": "Connecticut",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Fairfield County Connecticut Financial Technology and Data Center Zone",
        "description": (
            "Fairfield County (Stamford/Greenwich, CT) is the financial capital "
            "of New England, home to hedge funds, asset managers, and major "
            "financial institutions including Synchrony Financial, UBS Americas, "
            "and Charter Communications HQ. Connecticut's Angel Investor Tax "
            "Credit and Digital Competitiveness Act (P.A. 21-76) provide "
            "incentives for qualifying technology investments. Eversource and "
            "UI (United Illuminating) serve the county with direct fiber "
            "connectivity to New York City financial exchanges via the "
            "Long Island Sound submarine cable routes."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Stamford financial IT hub; CT P.A. 21-76 digital incentive; NYC fiber access.",
        "sources": [
            {"label": "Stamford Economic Development — Connecticut Innovation", "url": "https://www.stamfordct.gov/"},
            {"label": "Connecticut Digital Competitiveness Act P.A. 21-76", "url": "https://www.cga.ct.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "09013",
        "name": "Tolland County",
        "state": "Connecticut",
        "level": -1,
        "types": ["data_center"],
        "title": "Tolland County Connecticut Innovation Corridor Data Center Incentive",
        "description": (
            "Tolland County (Vernon/Rockville, CT) lies along the Route 44 "
            "innovation corridor northeast of Hartford and is home to the "
            "University of Connecticut's main campus in Storrs. UConn's "
            "research computing and National Science Foundation-funded "
            "cyberinfrastructure generate regional HPC demand. Connecticut's "
            "data center incentive framework (P.A. 21-76) and Eversource "
            "Energy's industrial-rate options support qualifying facilities. "
            "The county's rural character provides lower land costs compared "
            "to Hartford and Fairfield markets."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "UConn Storrs HPC anchor; Eversource utility; CT P.A. 21-76 applies.",
        "sources": [
            {"label": "University of Connecticut Research IT", "url": "https://research.uconn.edu/"},
            {"label": "Northeast Connecticut Economic Alliance", "url": "https://www.ncealliance.org/"}
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
        "types": ["data_center", "ai"],
        "title": "Scott County Minnesota Twin Cities South Metro Data Center and Tech Campus Zone",
        "description": (
            "Scott County (Shakopee/Prior Lake, MN) is one of the fastest-growing "
            "counties in the Twin Cities metro, hosting major e-commerce and "
            "fulfillment operations including Amazon's Shakopee fulfillment "
            "and delivery infrastructure. Minnesota's data center sales-tax "
            "exemption (Minn. Stat. §297A.68, subd. 42) applies to qualifying "
            "investments. Xcel Energy serves the county with access to the "
            "regional grid and competitive industrial rates. The Prior Lake "
            "Mdewakanton Sioux Community's data operations and casino "
            "technology infrastructure also contribute to computing demand."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Amazon Shakopee anchor; Xcel Energy; MN §297A.68 exemption; Mdewakanton Sioux tribal ops.",
        "sources": [
            {"label": "Scott County Economic Development", "url": "https://www.scottcountymn.gov/"},
            {"label": "Minnesota Data Center Tax Exemption §297A.68 Subd 42", "url": "https://www.revisor.mn.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "06107",
        "name": "Tulare County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Tulare County California Central Valley Agricultural AI and Data Infrastructure Zone",
        "description": (
            "Tulare County (Visalia, CA) is California's leading dairy and "
            "agricultural county, generating substantial data demand for "
            "precision agriculture, animal genomics, and water-management AI. "
            "Southern California Edison and PG&E jointly serve parts of the "
            "county with industrial rates. The county's Opportunity Zone "
            "designations in Visalia and Porterville qualify for federal "
            "capital gains deferral. California's data center sector is "
            "expanding inland to lower-cost markets as Bay Area and LA "
            "land and power costs escalate."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "AG/dairy AI demand; SCE/PG&E border area; CA Opportunity Zone available.",
        "sources": [
            {"label": "Tulare County Economic Development", "url": "https://tularecounty.ca.gov/"},
            {"label": "Visalia Economic Development Corporation", "url": "https://www.visaliaedo.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "06047",
        "name": "Merced County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Merced County California UC Merced Research Computing and Data Center Incentive",
        "description": (
            "Merced County hosts the University of California Merced, California's "
            "newest UC campus and a growing research computing hub. UC Merced's "
            "Cyberinfrastructure Initiative and National Science Foundation "
            "ACCESS-allocated HPC resources support AI, climate modeling, "
            "and agricultural science workloads. PG&E serves the county with "
            "industrial rates, and Merced County's Opportunity Zone designations "
            "provide federal tax incentives for qualifying data center investments "
            "in the rapidly expanding campus vicinity."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "UC Merced HPC anchor; PG&E utility; Opportunity Zone in campus corridor.",
        "sources": [
            {"label": "UC Merced Cyberinfrastructure Initiative", "url": "https://it.ucmerced.edu/"},
            {"label": "Merced County Economic Development", "url": "https://mercedcounty.net/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "23003",
        "name": "Aroostook County",
        "state": "Maine",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Aroostook County Maine Arctic-Climate Data Center and Wind Energy Zone",
        "description": (
            "Aroostook County (Presque Isle, ME) offers an exceptionally "
            "favorable climate for data center cooling, with average annual "
            "temperatures enabling free-air cooling 9+ months per year. "
            "Emera Maine (Versant Power) provides access to New England's "
            "hydroelectric grid. Maine's Job Creation Through Educational "
            "Opportunity program and Pine Tree Development Zone incentives "
            "offer property-tax and income-tax benefits for qualifying "
            "technology investments. Large amounts of available industrial "
            "land and wind energy development support hyperscale operators "
            "seeking zero-carbon computing at minimal PUE."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Sub-arctic cooling economics; Versant Power hydro access; Pine Tree Zone incentives.",
        "sources": [
            {"label": "Aroostook County Economic Development", "url": "https://www.maineregionaledc.com/"},
            {"label": "Maine Pine Tree Development Zone Program", "url": "https://www.maine.gov/decd/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "23009",
        "name": "Hancock County",
        "state": "Maine",
        "level": -1,
        "types": ["data_center"],
        "title": "Hancock County Maine Downeast Technology and Edge Data Infrastructure",
        "description": (
            "Hancock County (Ellsworth/Bar Harbor, ME) anchors the Downeast "
            "Maine broadband corridor and benefits from Maine's Pine Tree "
            "Development Zone property-tax and income-tax incentives for "
            "qualifying technology investments. The MDI Biological Laboratory "
            "in Bar Harbor generates bioinformatics computing demand, and "
            "Versant Power provides access to hydroelectric-sourced "
            "New England power. The county's cold Atlantic climate supports "
            "low-PUE data center operations, and state broadband investments "
            "under the Maine Connectivity Authority are expanding fiber "
            "infrastructure to support edge computing deployments."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "MDI Biological Lab bioinformatics demand; cold climate cooling; ME Pine Tree Zone.",
        "sources": [
            {"label": "Downeast Economic Development District", "url": "https://downeastmaine.com/"},
            {"label": "Maine Connectivity Authority Broadband Initiative", "url": "https://www.maineconnectivity.org/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "33005",
        "name": "Cheshire County",
        "state": "New Hampshire",
        "level": -1,
        "types": ["data_center"],
        "title": "Cheshire County New Hampshire Data Center and Advanced Manufacturing Incentive",
        "description": (
            "Cheshire County (Keene, NH) benefits from New Hampshire's "
            "business-friendly tax environment — no income tax, no sales "
            "tax — and Keene State College's regional technology workforce. "
            "Eversource Energy serves the county with access to New England's "
            "hydroelectric and nuclear grid. The Monadnock Region Economic "
            "Development Council supports technology investment with "
            "site-development assistance and workforce development programs "
            "tailored to manufacturing and technology employers."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "No NH income/sales tax; Eversource utility; Keene State College tech workforce.",
        "sources": [
            {"label": "Monadnock Economic Development Corp (MEDC)", "url": "https://monadnockedc.org/"},
            {"label": "New Hampshire Division of Economic Development", "url": "https://www.nheconomy.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "44001",
        "name": "Bristol County",
        "state": "Rhode Island",
        "level": -1,
        "types": ["data_center"],
        "title": "Bristol County Rhode Island Maritime Technology and Data Center Zone",
        "description": (
            "Bristol County (Bristol/Warren, RI) hosts Roger Williams University "
            "and sits on the eastern shore of Narragansett Bay. The county's "
            "technology sector is anchored by maritime and defense technology "
            "firms serving the Naval Station Newport cluster (across the bay "
            "in Newport County). Rhode Island's Qualified Jobs Incentive Act "
            "and Commerce RI incentive programs support technology employers, "
            "and National Grid provides industrial power to the county."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Roger Williams University tech; Naval Station Newport proximity; RI Qualified Jobs Act.",
        "sources": [
            {"label": "Commerce Rhode Island Technology Incentives", "url": "https://commerceri.com/"},
            {"label": "Rhode Island Qualified Jobs Incentive Act", "url": "https://www.rilegislature.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "56041",
        "name": "Uinta County",
        "state": "Wyoming",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Uinta County Wyoming I-80 Energy Corridor Data Center Zone",
        "description": (
            "Uinta County (Evanston, WY) sits on the I-80 energy and data "
            "corridor at the Wyoming-Utah border. Wyoming's unique tax structure "
            "— no corporate income tax, no individual income tax, and no "
            "sales tax on data center equipment or electricity — makes it "
            "one of the nation's most data-center-friendly states. Rocky "
            "Mountain Power serves the county with hydroelectric and wind "
            "generation. Evanston's I-80 position provides fiber backbone "
            "connectivity between Salt Lake City and Cheyenne."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "No WY income/sales tax; Rocky Mountain Power hydro/wind; I-80 fiber corridor.",
        "sources": [
            {"label": "Wyoming Business Council", "url": "https://wyomingbusiness.org/"},
            {"label": "Uinta County Economic Development", "url": "https://www.uintacounty.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "40111",
        "name": "Okmulgee County",
        "state": "Oklahoma",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Okmulgee County Oklahoma Muscogee Nation Tribal Technology and Data Center Incentive",
        "description": (
            "Okmulgee County is the seat of the Muscogee (Creek) Nation, one "
            "of the largest tribal nations in the United States. The Muscogee "
            "Nation operates substantial government technology and data "
            "infrastructure including gaming, healthcare, and tribal citizen "
            "services platforms. Oklahoma's data center incentive (68 O.S. "
            "§54006) provides sales-tax exemptions on equipment and power "
            "for qualifying facilities. PSO (Public Service Company of Oklahoma) "
            "provides industrial power with access to Oklahoma's wind-heavy "
            "SPP grid."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Muscogee (Creek) Nation tribal IT anchor; PSO/SPP grid; 68 O.S. §54006 exemption.",
        "sources": [
            {"label": "Muscogee (Creek) Nation — Department of Technology", "url": "https://www.muscogeenation.com/"},
            {"label": "Oklahoma Data Center Tax Exemption 68 O.S. §54006", "url": "https://www.tax.ok.gov/"}
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
        "id": "ai-ma-003",
        "name": "UMass Medical School / WPI Advanced Research Computing Hub — Worcester MA",
        "operator": "University of Massachusetts Medical School / Worcester Polytechnic Institute",
        "status": "operational",
        "county_fips": "25027",
        "notes": (
            "UMass Medical and WPI jointly anchor central Massachusetts's life-sciences "
            "computing cluster. Research computing at UMass Medical supports genomics, "
            "clinical AI, and NIH-funded biomedical informatics. WPI's Data Science "
            "program operates HPC resources shared with regional biotech partners."
        ),
        "lon": -71.8023,
        "lat": 42.2626,
    },
    {
        "id": "ai-ct-001",
        "name": "Synchrony Financial Data Operations Center — Stamford CT",
        "operator": "Synchrony Financial",
        "status": "operational",
        "county_fips": "09001",
        "notes": (
            "Synchrony Financial, one of the nation's largest consumer financial "
            "services companies, operates its headquarters and primary data "
            "operations center in Stamford. The facility processes credit and "
            "financing AI/ML models serving 70M+ active accounts and 450,000+ "
            "merchant partners, anchoring Fairfield County's fintech computing cluster."
        ),
        "lon": -73.5387,
        "lat": 41.0534,
    },
    {
        "id": "ai-mn-004",
        "name": "Amazon Shakopee Fulfillment AI Operations Center",
        "operator": "Amazon",
        "status": "operational",
        "county_fips": "27139",
        "notes": (
            "Amazon operates multiple fulfillment and delivery station facilities "
            "in Shakopee (Scott County), among the largest employment sites in "
            "the Twin Cities metro. These facilities deploy AI-driven robotics, "
            "inventory prediction, and last-mile routing optimization, making "
            "them significant edge AI operations nodes."
        ),
        "lon": -93.5196,
        "lat": 44.7974,
    },
    {
        "id": "ai-ca-010",
        "name": "UC Merced Cyberinfrastructure and HPC Initiative",
        "operator": "University of California, Merced",
        "status": "operational",
        "county_fips": "06047",
        "notes": (
            "UC Merced's Cyberinfrastructure Initiative provides HPC and cloud "
            "resources to researchers across UC campuses. Research areas include "
            "Central Valley climate modeling, agricultural AI, wildfire prediction, "
            "and renewable energy grid optimization. The campus is allocated "
            "compute on NSF ACCESS and XSEDE successor systems."
        ),
        "lon": -120.4233,
        "lat": 37.3656,
    },
    {
        "id": "ai-ok-006",
        "name": "Muscogee (Creek) Nation Tribal Digital Operations Center — Okmulgee OK",
        "operator": "Muscogee (Creek) Nation",
        "status": "operational",
        "county_fips": "40111",
        "notes": (
            "The Muscogee (Creek) Nation operates a centralized tribal government "
            "data center in Okmulgee supporting health records (Indian Health Service "
            "integration), gaming analytics, citizen services, and the Nation's "
            "e-commerce and retail technology platforms for tribal enterprises."
        ),
        "lon": -95.9670,
        "lat": 35.6239,
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
