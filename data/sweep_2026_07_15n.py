#!/usr/bin/env python3
"""Sweep N: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: WV Monongalia (WVU) + Ohio County (Wheeling), NC Cumberland (Fort Liberty),
HI Hawaii County (Maunakea HPC), AK Mat-Su, MT Lewis & Clark (Helena),
RI Washington (URI), CA Yolo (UC Davis), GA Barrow (NE Atlanta DC corridor),
MI Berrien (Whirlpool), VT Rutland, FL Lake County
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

print("=== Sweep N ===")

# West Virginia — Monongalia County (Morgantown, WVU, NASA IV&V)
add_restriction({
    "fips": "54061",
    "name": "Monongalia County",
    "state": "West Virginia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Monongalia County Morgantown University Research and Technology Hub",
    "description": "Monongalia County (Morgantown) hosts West Virginia University's research computing cluster, NASA Independent Verification & Validation (IV&V) facility, and Mylan Pharmaceuticals (Viatris) technology operations. WVU's research network and HPCRC (High Performance Computing and Research Center) make Monongalia County the state's leading research data hub. No local DC restrictions; WV EDGE Act (HB 2002) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "WVU Research Computing", "url": "https://researchcomputing.wvu.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# North Carolina — Cumberland County (Fayetteville, Fort Liberty, Army cyber)
add_restriction({
    "fips": "37051",
    "name": "Cumberland County",
    "state": "North Carolina",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Cumberland County Fort Liberty Army Cyber and Special Operations Hub",
    "description": "Cumberland County hosts Fort Liberty (formerly Fort Bragg), home of the XVIII Airborne Corps, US Army Special Operations Command (USASOC), and significant Army Cyber elements. The concentration of special operations and cyber mission forces drives a major military data infrastructure footprint. No local DC restrictions; NC data center tax incentive (G.S. 105-164.13E) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Fort Liberty (Fort Bragg) — XVIII Airborne Corps", "url": "https://www.fortliberty.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Hawaii — Hawaii County (Big Island, Maunakea Observatories HPC, UH Hilo)
add_restriction({
    "fips": "15001",
    "name": "Hawaii County",
    "state": "Hawaii",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Hawaii County Big Island Maunakea Astronomy and Research Computing Hub",
    "description": "Hawaii County hosts the Maunakea Observatories complex — including W.M. Keck Observatory, Subaru Telescope, Canada-France-Hawaii Telescope — generating some of the largest astronomy datasets in the world processed by connected HPC facilities. UH Hilo provides supporting research computing. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "W.M. Keck Observatory — Maunakea", "url": "https://www.keckobservatory.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Alaska — Matanuska-Susitna Borough (Palmer/Wasilla, growing tech corridor)
add_restriction({
    "fips": "02170",
    "name": "Matanuska-Susitna Borough",
    "state": "Alaska",
    "level": -1,
    "types": ["data_center"],
    "title": "Matanuska-Susitna Borough Growing Mat-Su Technology Corridor",
    "description": "The Matanuska-Susitna (Mat-Su) Borough north of Anchorage is Alaska's fastest-growing region. Agricultural monitoring, natural gas operations data (Eklutna Natural Gas), and state broadband infrastructure expansion support data center demand. No local DC restrictions; Alaska's no-income/no-sales-tax environment applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Mat-Su Borough Economic Development", "url": "https://www.matsugov.us"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Montana — Lewis and Clark County (Helena, Montana state government IT)
add_restriction({
    "fips": "30049",
    "name": "Lewis and Clark County",
    "state": "Montana",
    "level": -1,
    "types": ["data_center"],
    "title": "Lewis and Clark County Montana State Capital IT Infrastructure",
    "description": "Lewis and Clark County (Helena) hosts Montana's State IT Services Division (SITSD) data center operations — the state government's primary IT infrastructure. No local DC restrictions; Montana's no-sales-tax environment and new industry property tax abatement (MCA §15-24-1402) reduce total cost of operations.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Montana SITSD — State IT Services", "url": "https://sitsd.mt.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Rhode Island — Washington County (South County, URI, NAS Quonset area)
add_restriction({
    "fips": "44009",
    "name": "Washington County",
    "state": "Rhode Island",
    "level": -1,
    "types": ["data_center"],
    "title": "Washington County URI Research and South County Technology Hub",
    "description": "Washington County (South Kingstown/Narragansett) hosts the University of Rhode Island (URI) research computing operations and the Quonset Business Park, home to Amgen's regional operations. The NAS Quonset State Airport provides connectivity infrastructure. No local DC restrictions; RI Rebuild RI Tax Credit (§44-48.3) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "URI Research Computing", "url": "https://web.uri.edu/it/research-computing/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# California — Yolo County (Davis, UC Davis research computing, ag-tech data)
add_restriction({
    "fips": "06113",
    "name": "Yolo County",
    "state": "California",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Yolo County UC Davis Research and Agricultural Technology Hub",
    "description": "Yolo County (Davis) hosts UC Davis's research computing facilities, including UC Davis Health and its clinical data infrastructure, and significant agricultural biotechnology data operations (USDA Western Research Center, several ag-biotech firms). Adjacent to Sacramento metro. No local DC restrictions; CA Competes tax credit available.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "UC Davis Research IT", "url": "https://research.ucdavis.edu/it/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Georgia — Barrow County (Winder, northeast Atlanta data center corridor)
add_restriction({
    "fips": "13013",
    "name": "Barrow County",
    "state": "Georgia",
    "level": -1,
    "types": ["data_center"],
    "title": "Barrow County Northeast Atlanta Data Center Expansion Corridor",
    "description": "Barrow County (Winder) is part of the northeast Atlanta suburban data center expansion corridor, attracting investment from operators seeking lower land costs and power rates than Fulton/Gwinnett while maintaining metro Atlanta fiber connectivity. No local DC restrictions; Georgia's data center sales tax exemption (O.C.G.A. §48-8-3.2) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Barrow County Development Authority", "url": "https://www.barrowcounty.com/development-authority"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Michigan — Berrien County (Benton Harbor/St. Joseph, Whirlpool HQ tech)
add_restriction({
    "fips": "26021",
    "name": "Berrien County",
    "state": "Michigan",
    "level": -1,
    "types": ["data_center"],
    "title": "Berrien County Whirlpool Global Technology and Southwest Michigan Hub",
    "description": "Berrien County (Benton Harbor/St. Joseph) hosts Whirlpool Corporation's global headquarters and technology center — one of the world's largest appliance manufacturers with substantial manufacturing AI, IoT, and enterprise data infrastructure. No local DC restrictions; Michigan's data center sales and use tax exemption (PA 328) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Whirlpool Corporation Global HQ — Benton Harbor", "url": "https://www.whirlpoolcorp.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Vermont — Rutland County (Rutland, GE Healthcare legacy, IBM legacy)
add_restriction({
    "fips": "50021",
    "name": "Rutland County",
    "state": "Vermont",
    "level": -1,
    "types": ["data_center"],
    "title": "Rutland County Vermont Regional Technology and Healthcare IT Hub",
    "description": "Rutland County hosts Rutland Regional Medical Center's health IT operations and legacy technology manufacturing presence. Vermont's VEGI program (32 V.S.A. §3325) and Green Mountain Power's renewable electricity support data center economics. No local DC restrictions; Vermont's cool climate provides free-cooling advantages.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Rutland Economic Development Corporation", "url": "https://www.redc.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Lake County (Leesburg, data center corridor, NTE/CenturyLink facilities)
add_restriction({
    "fips": "12069",
    "name": "Lake County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center"],
    "title": "Lake County Florida Data Center and Logistics Technology Corridor",
    "description": "Lake County (Leesburg/Clermont) is experiencing rapid data center development driven by proximity to Orlando, lower land costs, and available large power parcels from Duke Energy Florida. Growing logistics and e-commerce technology infrastructure parallels residential growth. No local DC restrictions; Florida data center equipment exemption (§212.08) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Lake County Economic Development", "url": "https://www.lakecountyfl.gov/departments/county_manager/economic_development.aspx"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# West Virginia — Ohio County (Wheeling, northern panhandle business hub)
add_restriction({
    "fips": "54069",
    "name": "Ohio County",
    "state": "West Virginia",
    "level": -1,
    "types": ["data_center"],
    "title": "Ohio County Wheeling Northern Panhandle Business and Technology Hub",
    "description": "Ohio County (Wheeling) is West Virginia's northern panhandle business center, adjacent to Pittsburgh metro and the Ohio border. WesBanco financial technology operations and WVU Medicine Wheeling Hospital health IT anchor local data infrastructure. No local DC restrictions; WV EDGE Act and no-corporate-income-tax-on-technology-investment environment apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Wheeling Area Chamber of Commerce", "url": "https://www.wheelingchamber.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-wv-002: WVU Research Computing and HPCRC
add_campus({
    "id": "ai-wv-002",
    "name": "WVU High Performance Computing and Research Center (HPCRC)",
    "operator": "West Virginia University Research Corporation",
    "status": "operational",
    "county_fips": "54061",
    "notes": "WVU HPCRC provides HPC resources for materials science, drug discovery, and energy research; also supports NASA IV&V software verification workflows co-located in Morgantown.",
    "lon": -79.9559,
    "lat": 39.6295
})

# ai-nc-003: Fort Liberty / XVIII Airborne Corps IT (Cumberland County)
add_campus({
    "id": "ai-nc-003",
    "name": "Fort Liberty Army Computing and Mission Command Center",
    "operator": "US Army XVIII Airborne Corps / USASOC",
    "status": "operational",
    "county_fips": "37051",
    "notes": "Primary Army data and mission-command computing hub for the XVIII Airborne Corps and US Army Special Operations Command; supports joint all-domain command and control (JADC2) infrastructure.",
    "lon": -79.0014,
    "lat": 35.1390
})

# ai-hi-003: W.M. Keck Observatory Data Center (Maunakea, Hawaii County)
add_campus({
    "id": "ai-hi-003",
    "name": "W.M. Keck Observatory Data Processing Center",
    "operator": "W.M. Keck Observatory / Caltech / UC",
    "status": "operational",
    "county_fips": "15001",
    "notes": "Keck Observatory processes petabytes of astronomical imaging and spectroscopy data; connected to Caltech and UC system HPC networks for reduction, AI classification, and archival storage.",
    "lon": -155.4681,
    "lat": 19.8208
})

# ai-ak-003: Mat-Su Borough Broadband and State Edge Computing
add_campus({
    "id": "ai-ak-003",
    "name": "Mat-Su Borough Digital Infrastructure Hub",
    "operator": "Matanuska Telephone Association (MTA)",
    "status": "operational",
    "county_fips": "02170",
    "notes": "MTA operates fiber network infrastructure and edge computing services for the Mat-Su Valley; supports state broadband connectivity and regional enterprise IT.",
    "lon": -149.1183,
    "lat": 61.5996
})

# ai-ca-006: UC Davis Research Computing (Yolo County)
add_campus({
    "id": "ai-ca-006",
    "name": "UC Davis Farm Computing and Research Data Center",
    "operator": "UC Davis Research IT / CAES",
    "status": "operational",
    "county_fips": "06113",
    "notes": "UC Davis operates research computing supporting the College of Agricultural and Environmental Sciences, genomics research, and UC Davis Health clinical data; part of the UC-wide research computing network.",
    "lon": -121.7405,
    "lat": 38.5382
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep N complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
