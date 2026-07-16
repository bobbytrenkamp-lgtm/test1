#!/usr/bin/env python3
"""Sweep Q: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: LA Lafayette Parish (Acadiana oil/gas tech), LA Calcasieu (Lake Charles LNG),
NM Doña Ana (Las Cruces/NMSU/WSMR), FL Okaloosa (Eglin AFB cyber),
AL Limestone (Huntsville metro/Toyota), SC Richland (Columbia/UofSC state IT),
TX Bell (Fort Cavazos/III Corps), TX Ector (Odessa/Permian Basin),
MS Jackson (Pascagoula/Ingalls Shipbuilding), KY Daviess (Owensboro healthcare),
GA Rockdale (Conyers/Atlanta DC corridor), FL Escambia (Pensacola/NAS)
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

print("=== Sweep Q ===")

# Louisiana — Lafayette Parish (Acadiana energy tech hub)
add_restriction({
    "fips": "22055",
    "name": "Lafayette Parish",
    "state": "Louisiana",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Lafayette Parish Acadiana Energy Technology and Innovation Hub",
    "description": "Lafayette Parish (Lafayette) is the commercial and technology capital of Acadiana, serving as the service hub for Louisiana's onshore oil and gas industry. LHC Group (now UnitedHealth/Optum), Waitr Technologies, and oilfield service companies (Halliburton, Baker Hughes) maintain significant data operations. UL Lafayette's research computing and the Cajun Data Center round out the market. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Lafayette Economic Development Authority (LEDA)", "url": "https://www.lafayette.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Louisiana — Calcasieu Parish (Lake Charles, LNG export, massive petrochemical)
add_restriction({
    "fips": "22019",
    "name": "Calcasieu Parish",
    "state": "Louisiana",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Calcasieu Parish Lake Charles LNG Export and Petrochemical Technology Hub",
    "description": "Calcasieu Parish (Lake Charles) hosts one of the largest LNG export terminal concentrations in North America (Sabine Pass/Cheniere, Lake Charles LNG/Energy Transfer), plus massive petrochemical and refining operations (PPG, Citgo, Sasol). SCADA, process control, and environmental compliance data infrastructure is among the densest in the US energy sector. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Southwest Louisiana Economic Development Alliance", "url": "https://www.swlaeda.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Mexico — Doña Ana County (Las Cruces, NMSU, White Sands Missile Range adjacent)
add_restriction({
    "fips": "35013",
    "name": "Do̱a Ana County",
    "state": "New Mexico",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Doña Ana County Las Cruces NMSU and White Sands Research Technology Hub",
    "description": "Doña Ana County (Las Cruces) hosts New Mexico State University (NMSU) research computing, including the NMSU High Performance Computing Center, adjacent to White Sands Missile Range (WSMR) — the nation's largest US military installation by area and a hub for missile and space test data. Space port America (Sierra County adjacent) and SpaceX cross-utilization add aerospace computing demand. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NMSU High Performance Computing Center", "url": "https://hpc.nmsu.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Okaloosa County (Fort Walton Beach/Niceville, Eglin AFB, Air Force cyber)
add_restriction({
    "fips": "12091",
    "name": "Okaloosa County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Okaloosa County Eglin AFB Air Force Test and Cyber Technology Hub",
    "description": "Okaloosa County hosts Eglin Air Force Base — the largest Air Force base by area in the US — including the Air Force Materiel Command (AFMC) 96th Test Wing, Air Force Research Laboratory (AFRL) Munitions Directorate, and the 53rd Wing's operational test units. The concentration of advanced weapons test and evaluation, cyber, and electronic warfare data infrastructure is among the highest in the US military. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Eglin Air Force Base — 96th Test Wing", "url": "https://www.eglin.af.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Alabama — Limestone County (Athens, Huntsville metro north, Toyota manufacturing)
add_restriction({
    "fips": "01083",
    "name": "Limestone County",
    "state": "Alabama",
    "level": -1,
    "types": ["data_center"],
    "title": "Limestone County Huntsville Metro North Manufacturing Technology Hub",
    "description": "Limestone County (Athens) is the fastest-growing county in Alabama's Huntsville metro area, hosting Toyota Motor Manufacturing Alabama's engine plant and a growing corridor of advanced manufacturing and logistics technology operations. The proximity to Redstone Arsenal and the Huntsville defense-tech ecosystem drives demand for enterprise IT infrastructure. No local DC restrictions; Alabama's data center tax exemption and Growing Alabama credit apply.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Limestone County Economic Development Association", "url": "https://www.limestonecountyeda.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# South Carolina — Richland County (Columbia, UofSC, SC state government IT)
add_restriction({
    "fips": "45079",
    "name": "Richland County",
    "state": "South Carolina",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Richland County Columbia University of South Carolina and State Government IT Hub",
    "description": "Richland County (Columbia) hosts South Carolina's state capital with the SC Division of Technology Operations (DTO) data center, the University of South Carolina (UofSC) research computing infrastructure, Fort Jackson (the Army's largest basic training installation), and BlueCross BlueShield of South Carolina's technology headquarters. No local DC restrictions; SC's data center property tax abatement and JEDA tax-exempt bond financing support investment.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "SC Division of Technology Operations", "url": "https://www.sc.gov/residents/technology"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Texas — Bell County (Killeen/Temple, Fort Cavazos, III Corps)
add_restriction({
    "fips": "48027",
    "name": "Bell County",
    "state": "Texas",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Bell County Fort Cavazos III Corps Army Mission Command Technology Hub",
    "description": "Bell County (Killeen/Temple) hosts Fort Cavazos (formerly Fort Hood), home of III Corps and the 1st Cavalry Division — one of the largest US military installations — with extensive Army mission command, network operations, and cyber data infrastructure. Scott & White Health (Baylor Scott & White) provides a significant regional health IT anchor. No local DC restrictions; Texas no-corporate-income-tax environment applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Fort Cavazos — III Corps / 1st Cavalry Division", "url": "https://home.army.mil/cavazos"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Texas — Ector County (Odessa, Permian Basin energy SCADA, oil production)
add_restriction({
    "fips": "48135",
    "name": "Ector County",
    "state": "Texas",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Ector County Odessa Permian Basin Energy Operations and SCADA Hub",
    "description": "Ector County (Odessa) is at the geographic center of the Permian Basin — the world's most productive oil field — hosting operational headquarters for Pioneer Natural Resources, Diamondback Energy, and Occidental Petroleum. SCADA systems, IoT drilling sensors, and production data infrastructure generate enormous edge computing demand. No local DC restrictions; Texas no-corporate-income-tax environment applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Odessa Development Corporation", "url": "https://www.odessatexas.com/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Mississippi — Jackson County (Pascagoula, Huntington Ingalls / Ingalls Shipbuilding)
add_restriction({
    "fips": "28059",
    "name": "Jackson County",
    "state": "Mississippi",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Jackson County Pascagoula Ingalls Shipbuilding Naval Defense Technology Hub",
    "description": "Jackson County (Pascagoula) hosts Huntington Ingalls Industries' Ingalls Shipbuilding — the largest naval shipbuilder in the US and Mississippi's largest private employer — producing DDG destroyers, LPD amphibious ships, and LHA/LHD amphibious assault ships. The concentration of defense manufacturing operations, digital shipbuilding systems, and naval design data infrastructure makes Jackson County a significant DoD technology hub. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Huntington Ingalls Industries — Ingalls Shipbuilding", "url": "https://ingalls.huntingtoningalls.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Kentucky — Daviess County (Owensboro, Owensboro Health, Toyota, healthcare IT)
add_restriction({
    "fips": "21059",
    "name": "Daviess County",
    "state": "Kentucky",
    "level": -1,
    "types": ["data_center"],
    "title": "Daviess County Owensboro Regional Healthcare and Manufacturing Technology Hub",
    "description": "Daviess County (Owensboro) hosts Owensboro Health Regional Hospital's health IT operations, Audubon Area Community Services technology programs, and industrial manufacturing data infrastructure from Metalsa, OMNI Technologies, and nearby Toyota Motor Manufacturing Kentucky (Scott County). Owensboro is western Kentucky's largest city and regional technology hub. No local DC restrictions; Kentucky's data center personal property tax exemption (KRS 132.200) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Owensboro-Daviess County Regional Airport Economic Development", "url": "https://www.owensboro.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Georgia — Rockdale County (Conyers, Atlanta east data center expansion)
add_restriction({
    "fips": "13247",
    "name": "Rockdale County",
    "state": "Georgia",
    "level": -1,
    "types": ["data_center"],
    "title": "Rockdale County Conyers Atlanta East Industrial and Data Center Expansion Hub",
    "description": "Rockdale County (Conyers) is part of the greater Atlanta industrial and data center expansion corridor east of I-20, offering lower land costs and competitive utility rates from Georgia Power while maintaining access to Atlanta fiber infrastructure. GreenHouse Data and regional distribution center operators have established data infrastructure in Conyers. No local DC restrictions; Georgia's data center sales tax exemption (O.C.G.A. §48-8-3.2) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Rockdale Economic Development Council", "url": "https://www.rockdaleedc.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Escambia County (Pensacola, NAS Pensacola, Navy cyber training)
add_restriction({
    "fips": "12033",
    "name": "Escambia County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Escambia County Pensacola Naval Air Station and Cyber Training Technology Hub",
    "description": "Escambia County (Pensacola) hosts Naval Air Station Pensacola — the Navy's primary aviation training command — and the Center for Information Warfare Training (CIWT), which provides Navy cyber, intelligence, and information warfare training. Gulf Power (now Duke Energy Florida) connectivity and the growing Pensacola tech ecosystem support complementary commercial data investment. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NAS Pensacola — Center for Information Warfare Training", "url": "https://www.ciwt.navy.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-fl-006: Eglin AFB / AFRL Cyber and Test Data Center (Okaloosa County)
add_campus({
    "id": "ai-fl-006",
    "name": "Eglin AFB Air Force Research Laboratory Munitions and Cyber Operations Center",
    "operator": "US Air Force / AFRL / 96th Test Wing",
    "status": "operational",
    "county_fips": "12091",
    "notes": "Eglin AFB's AFRL Munitions Directorate and 96th TW operate extensive weapons test and evaluation data systems; supports the Air Force's developmental and operational test missions across the Gulf Test Range.",
    "lon": -86.5253,
    "lat": 30.4833
})

# ai-la-003: Cheniere / Sabine Pass LNG SCADA (Calcasieu adjacent/Cameron, use Calcasieu)
add_campus({
    "id": "ai-la-003",
    "name": "Lake Charles LNG and Petrochemical Industrial Operations Data Hub",
    "operator": "Calcasieu Pass LNG / Energy Transfer (Lake Charles LNG)",
    "status": "operational",
    "county_fips": "22019",
    "notes": "Calcasieu Parish hosts co-located LNG liquefaction control systems, refinery process automation, and environmental SCADA for one of the largest petrochemical industrial complexes in North America; handles real-time operations data for multiple major LNG terminals and chemical plants.",
    "lon": -93.2174,
    "lat": 30.2266
})

# ai-tx-007: Fort Cavazos III Corps Mission Command Center (Bell County)
add_campus({
    "id": "ai-tx-007",
    "name": "Fort Cavazos III Corps Mission Command and Network Operations Center",
    "operator": "US Army III Corps / 1st Cavalry Division",
    "status": "operational",
    "county_fips": "48027",
    "notes": "Fort Cavazos (formerly Fort Hood) III Corps mission command infrastructure supports combined-arms operations, joint all-domain command and control (JADC2) exercises, and Army-wide network operations training for the 1st Cavalry Division and III Corps subordinate units.",
    "lon": -97.7831,
    "lat": 31.1344
})

# ai-ms-003: Huntington Ingalls / Ingalls Shipbuilding (Jackson County)
add_campus({
    "id": "ai-ms-003",
    "name": "Huntington Ingalls Ingalls Shipbuilding Digital Shipyard Operations",
    "operator": "Huntington Ingalls Industries (HII) — Ingalls Shipbuilding",
    "status": "operational",
    "county_fips": "28059",
    "notes": "Ingalls Shipbuilding's Pascagoula facility operates digital shipbuilding systems including 3D design (Aveva AVEVA Marine), ship data management, and production control systems; builds US Navy destroyers, amphibious ships, and Coast Guard vessels.",
    "lon": -88.5561,
    "lat": 30.3585
})

# ai-sc-004: UofSC Research Computing / SC DTO (Richland County)
add_campus({
    "id": "ai-sc-004",
    "name": "University of South Carolina Research Computing and SC State Data Center — Columbia",
    "operator": "University of South Carolina / SC Division of Technology Operations",
    "status": "operational",
    "county_fips": "45079",
    "notes": "UofSC operates research HPC supporting clinical genomics, public health, and social sciences; co-located data services with SC's state government DTO data center supporting digital government operations.",
    "lon": -81.0348,
    "lat": 33.9969
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep Q complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
