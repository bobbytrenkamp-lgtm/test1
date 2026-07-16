#!/usr/bin/env python3
"""Sweep O: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: NV Carson City (state capital IT), PA Beaver (Shell cracker),
MI Genesee (Flint/Kettering/GM), AL Mobile (port/Airbus),
WA Kitsap (Naval Base Kitsap), CA Sacramento (state data centers),
VA Richmond city (VCU Health/state IT), TX El Paso (Fort Bliss),
NC Buncombe (Asheville/NOAA NCEI), NJ Bergen (Verizon HQ corridor),
OK Cleveland (OU/OSCER), WI Rock (Janesville/Milwaukee Tool)
"""
import json, pathlib

ROOT = pathlib.Path(__file__).parent.parent
RAW  = ROOT / "data" / "restrictions_raw.json"
CAMP = ROOT / "data" / "ai_campuses.json"

with open(RAW)  as f: raw  = json.load(f)
with open(CAMP) as f: camp = json.load(f)

existing_fips = {r["fips"] for r in raw["restrictions"]}
existing_cids = {c["id"]   for c in camp["ai_campuses"]}

added = {"restrictions": 0, "campuses": 0}

def add_restriction(entry):
    if entry["fips"] in existing_fips:
        return
    raw["restrictions"].append(entry)
    existing_fips.add(entry["fips"])
    added["restrictions"] += 1
    print(f"  +restriction {entry['fips']} {entry['name']}, {entry['state']} level={entry['level']}")

def add_campus(entry):
    if entry["id"] in existing_cids:
        return
    camp["ai_campuses"].append(entry)
    existing_cids.add(entry["id"])
    added["campuses"] += 1
    print(f"  +campus {entry['id']} {entry['name']}")

print("=== Sweep O ===")

# Nevada — Carson City (independent city, NV state capital IT)
add_restriction({
    "fips": "32510",
    "name": "Carson City",
    "state": "Nevada",
    "level": -1,
    "types": ["data_center"],
    "title": "Carson City Nevada State Government IT and Technology Hub",
    "description": "Carson City is Nevada's state capital and houses the Nevada Enterprise Information Technology Services (EITS) data center operations, serving state government agencies. Nevada's no-corporate-income-tax and no-personal-income-tax environment, combined with low electricity rates from NV Energy, make Carson City attractive for state and commercial data infrastructure. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Nevada EITS — State IT Services", "url": "https://eits.nv.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Pennsylvania — Beaver County (Center Township, Shell Pennsylvania Chemicals)
add_restriction({
    "fips": "42007",
    "name": "Beaver County",
    "state": "Pennsylvania",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Beaver County Shell Pennsylvania Chemicals and Energy Technology Hub",
    "description": "Beaver County hosts Shell Pennsylvania Chemicals' ethane cracker complex (one of the largest US petrochemical investments in decades), driving significant industrial IoT, SCADA, and process data infrastructure in the Ohio River Valley. Pennsylvania's keystone EDGE tax credit and proximity to Pittsburgh tech talent support complementary data center development. No local DC restrictions.",
    "effective_date": "2022-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Shell Pennsylvania Chemicals — Beaver County", "url": "https://www.shell.com/business-customers/chemicals/our-businesses/pennsylvania-chemicals.html"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Michigan — Genesee County (Flint, Kettering University, GM)
add_restriction({
    "fips": "26049",
    "name": "Genesee County",
    "state": "Michigan",
    "level": -1,
    "types": ["data_center"],
    "title": "Genesee County Flint Kettering University and Automotive Technology Hub",
    "description": "Genesee County (Flint) hosts Kettering University, one of the top engineering co-op programs in the US with strong GM and automotive technology partnerships, and anchors the historic automotive manufacturing data ecosystem. McLaren Health Care and Covenant Health anchor regional health IT. No local DC restrictions; Michigan's data center sales and use tax exemption (PA 328) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Kettering University — Flint Michigan", "url": "https://www.kettering.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Alabama — Mobile County (Mobile port, Airbus US Manufacturing)
add_restriction({
    "fips": "01097",
    "name": "Mobile County",
    "state": "Alabama",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Mobile County Port and Aerospace Manufacturing Technology Hub",
    "description": "Mobile County hosts the Port of Mobile (the largest US Gulf port by tonnage), Airbus US Manufacturing Facility (A320 family final assembly), and Austal USA shipbuilding — generating substantial logistics, manufacturing operations, and defense IT infrastructure. No local DC restrictions; Alabama's Growing Alabama credit and data center tax exemption support investment.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Port of Mobile — Alabama State Port Authority", "url": "https://www.asdd.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Washington — Kitsap County (Bremerton, Naval Base Kitsap, Puget Sound Naval Shipyard)
add_restriction({
    "fips": "53035",
    "name": "Kitsap County",
    "state": "Washington",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Kitsap County Naval Base Kitsap and Puget Sound Naval Shipyard Technology Hub",
    "description": "Kitsap County hosts Naval Base Kitsap (one of the largest US naval installations), Puget Sound Naval Shipyard (major naval vessel maintenance), and Naval Undersea Warfare Center (NUWC) Keyport. The concentration of Navy cyber, submarine operations, and shipyard data infrastructure makes Kitsap County a significant DoD technology hub. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Naval Base Kitsap — US Navy", "url": "https://www.cnic.navy.mil/regions/cnrnw/installations/nbk.html"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# California — Sacramento County (state capital, CDT data centers)
add_restriction({
    "fips": "06067",
    "name": "Sacramento County",
    "state": "California",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Sacramento County California State Government and Health Technology Hub",
    "description": "Sacramento County is California's state capital, housing the California Department of Technology (CDT) primary data centers serving state government agencies, UC Davis Health System, and Sutter Health's technology headquarters. State government IT consolidation under the California Government Operations Agency (GovOps) drives significant data infrastructure investment. No local DC restrictions; CA Competes tax credit available.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "California Department of Technology (CDT)", "url": "https://cdt.ca.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Virginia — Richmond city (VA state capital, VCU Health, financial tech)
add_restriction({
    "fips": "51760",
    "name": "Richmond city",
    "state": "Virginia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Richmond City Virginia State Government and Financial Technology Hub",
    "description": "Richmond city is Virginia's state capital, home to the Virginia Information Technologies Agency (VITA) state data center, VCU Health's clinical data infrastructure, and a dense financial services technology corridor (Capital One, Markel, Dominion Energy). Virginia's data center sales tax exemption (§58.1-609.3) and proximity to Northern Virginia data center alley support the Richmond market. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Virginia Information Technologies Agency (VITA)", "url": "https://vita.virginia.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Texas — El Paso County (Fort Bliss, Army Futures Command, border operations)
add_restriction({
    "fips": "48141",
    "name": "El Paso County",
    "state": "Texas",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "El Paso County Fort Bliss Army Futures Command and Border Technology Hub",
    "description": "El Paso County hosts Fort Bliss, one of the largest US military installations, including 1st Armored Division and key Army Futures Command (AFC) test and evaluation facilities at White Sands adjacent range. Cross-border logistics technology with Juárez maquiladoras drives significant supply-chain data infrastructure. No local DC restrictions; Texas no-corporate-income-tax environment applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Fort Bliss — 1st Armored Division", "url": "https://home.army.mil/bliss"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# North Carolina — Buncombe County (Asheville, NOAA NCEI, data centers)
add_restriction({
    "fips": "37021",
    "name": "Buncombe County",
    "state": "North Carolina",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Buncombe County Asheville NOAA Climate Data Center and Technology Hub",
    "description": "Buncombe County (Asheville) hosts NOAA's National Centers for Environmental Information (NCEI), the world's largest active archive of weather and climate data, as well as a growing data center cluster attracted by the region's cool climate, renewable power from Duke Energy, and lower land costs. The NOAA NCEI processes petabytes of climate and earth observation data annually. No local DC restrictions; NC data center tax incentive (G.S. 105-164.13E) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NOAA National Centers for Environmental Information — Asheville", "url": "https://www.ncei.noaa.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Jersey — Bergen County (Teaneck/Hackensack, Verizon HQ, major data corridor)
add_restriction({
    "fips": "34003",
    "name": "Bergen County",
    "state": "New Jersey",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Bergen County Verizon Headquarters and Northern NJ Data Center Corridor",
    "description": "Bergen County hosts Verizon's global headquarters (Basking Ridge adjacent), major financial services IT operations for Wall Street firms, and is part of the dense northern New Jersey data center corridor connecting to NYC metro fiber networks. PSEG power reliability and proximity to 111 8th Ave fiber hub make Bergen County a prime colocation market. No local DC restrictions; NJ Economic Recovery Act incentive applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Bergen County Economic Development", "url": "https://www.co.bergen.nj.us/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Oklahoma — Cleveland County (Norman, OU, OSCER supercomputing)
add_restriction({
    "fips": "40027",
    "name": "Cleveland County",
    "state": "Oklahoma",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Cleveland County University of Oklahoma Research Computing Hub",
    "description": "Cleveland County (Norman) hosts the University of Oklahoma's OU Supercomputing Center for Education and Research (OSCER), one of the top university HPC environments in the central US. OU's meteorology and weather research computing is world-renowned, supporting NOAA's Storm Prediction Center co-located in Norman. No local DC restrictions; Oklahoma's data center sales tax exemption (68 O.S. §1354) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "OU Supercomputing Center for Education and Research (OSCER)", "url": "https://www.ou.edu/oscer"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Wisconsin — Rock County (Janesville, Milwaukee Tool R&D, Amazon)
add_restriction({
    "fips": "55105",
    "name": "Rock County",
    "state": "Wisconsin",
    "level": -1,
    "types": ["data_center"],
    "title": "Rock County Janesville Manufacturing Technology and Logistics Hub",
    "description": "Rock County (Janesville) hosts Milwaukee Tool's engineering and R&D operations, Amazon fulfillment technology, and Woodman's Food Market IT headquarters. As a southern Wisconsin logistics corridor adjacent to I-90/I-39 interchange, Rock County supports significant supply-chain data and fulfillment technology infrastructure. No local DC restrictions; Wisconsin's data center sales tax exemption (Wis. Stat. §77.54(57)) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Rock County Economic Development Alliance", "url": "https://www.rockeda.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ca-007: California Department of Technology State Data Center (Sacramento)
add_campus({
    "id": "ai-ca-007",
    "name": "California Department of Technology (CDT) State Data Center",
    "operator": "California Department of Technology",
    "status": "operational",
    "county_fips": "06067",
    "notes": "CDT operates the primary state government data center in Sacramento supporting California's enterprise IT consolidation initiative (CGEN); hosts applications for dozens of state agencies and provides cloud-on-ramp services.",
    "lon": -121.4944,
    "lat": 38.5816
})

# ai-va-006: Virginia Information Technologies Agency (VITA) Data Center (Richmond)
add_campus({
    "id": "ai-va-006",
    "name": "Virginia Information Technologies Agency (VITA) Enterprise Data Center",
    "operator": "Virginia Information Technologies Agency (VITA)",
    "status": "operational",
    "county_fips": "51760",
    "notes": "VITA's enterprise data center provides shared IT infrastructure and managed services to Virginia state agencies; supports the Commonwealth's digital government transformation and cybersecurity operations.",
    "lon": -77.4360,
    "lat": 37.5407
})

# ai-nc-004: NOAA National Centers for Environmental Information (Asheville, Buncombe)
add_campus({
    "id": "ai-nc-004",
    "name": "NOAA National Centers for Environmental Information (NCEI) — Asheville",
    "operator": "NOAA / National Centers for Environmental Information",
    "status": "operational",
    "county_fips": "37021",
    "notes": "NOAA NCEI Asheville is the world's largest archive of atmospheric, coastal, geophysical, and oceanic data; processes and distributes petabytes of climate and weather data annually to researchers, governments, and private sector.",
    "lon": -82.5515,
    "lat": 35.5951
})

# ai-wa-004: Naval Base Kitsap Cyber and IT Operations (Kitsap County)
add_campus({
    "id": "ai-wa-004",
    "name": "Naval Base Kitsap Cyber and Network Operations Center",
    "operator": "US Navy / CNIC Northwest",
    "status": "operational",
    "county_fips": "53035",
    "notes": "Naval Base Kitsap operates Navy cybersecurity and network operations supporting submarine forces, surface forces, and Puget Sound Naval Shipyard IT; includes NUWC Keyport's undersea warfare data systems.",
    "lon": -122.6326,
    "lat": 47.5676
})

# ai-ok-004: OU Supercomputing Center OSCER (Cleveland County)
add_campus({
    "id": "ai-ok-004",
    "name": "OU Supercomputing Center for Education and Research (OSCER)",
    "operator": "University of Oklahoma",
    "status": "operational",
    "county_fips": "40027",
    "notes": "OSCER operates Schooner (Dell HPC cluster) and supports OU meteorology, geosciences, and engineering research; co-located in Norman with NOAA Storm Prediction Center for weather modeling collaboration.",
    "lon": -97.4395,
    "lat": 35.2226
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep O complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
