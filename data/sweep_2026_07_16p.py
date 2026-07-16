#!/usr/bin/env python3
"""Sweep P: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: WI Kenosha (Uline/Snap-on/Amazon), OR Linn (GlobalWafers),
TN Sullivan (Eastman Chemical/Kingsport), ID Twin Falls (Magic Valley DC),
ND Morton (Mandan energy hub), MT Missoula (UMT research),
KY Kenton (Covington/Cincinnati metro), WV Wood (Parkersburg),
MD Howard (Columbia/Leidos/defense IT), GA Muscogee (Columbus/TSYS/Fort Moore),
MI Isabella (CMU/Mount Pleasant), MO Cape Girardeau (SEMO/healthcare)
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

print("=== Sweep P ===")

# Wisconsin — Kenosha County (Uline HQ, Snap-on Tools, Amazon logistics)
add_restriction({
    "fips": "55059",
    "name": "Kenosha County",
    "state": "Wisconsin",
    "level": -1,
    "types": ["data_center"],
    "title": "Kenosha County Uline and Manufacturing Technology Logistics Hub",
    "description": "Kenosha County hosts Uline's global shipping and distribution headquarters (one of the largest privately-held companies in the US), Snap-on Tools' technology operations, and major Amazon logistics infrastructure along the I-94 Chicago-Milwaukee corridor. No local DC restrictions; Wisconsin's data center sales tax exemption (Wis. Stat. §77.54(57)) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Kenosha Area Business Alliance", "url": "https://www.kaba.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Oregon — Linn County (Albany, GlobalWafers silicon manufacturing)
add_restriction({
    "fips": "41043",
    "name": "Linn County",
    "state": "Oregon",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Linn County Albany Silicon Manufacturing and Advanced Materials Technology Hub",
    "description": "Linn County (Albany) is Oregon's hub for rare metals and silicon wafer manufacturing, hosting GlobalWafers' Memc semiconductor-grade silicon wafer production and ATI's specialty metals (titanium, zirconium) operations. Albany's manufacturing technology and process data infrastructure supports the broader Willamette Valley semiconductor supply chain. No local DC restrictions; Oregon data center property tax exemption (ORS §307.175) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Linn County Economic Development — Albany", "url": "https://www.linnbiz.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Tennessee — Sullivan County (Kingsport, Eastman Chemical global HQ)
add_restriction({
    "fips": "47163",
    "name": "Sullivan County",
    "state": "Tennessee",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Sullivan County Kingsport Eastman Chemical Global Technology Hub",
    "description": "Sullivan County (Kingsport) hosts Eastman Chemical Company's global headquarters — one of the largest specialty chemical companies in the world — which operates an extensive process automation, IoT, and enterprise data infrastructure. The Tennessee Valley Authority (TVA) provides low-cost power to the region. No local DC restrictions; Tennessee data center tax exemption (T.C.A. §67-6-346) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Eastman Chemical Company — Kingsport Tennessee", "url": "https://www.eastman.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Idaho — Twin Falls County (Magic Valley, CSI, growing data center market)
add_restriction({
    "fips": "16083",
    "name": "Twin Falls County",
    "state": "Idaho",
    "level": -1,
    "types": ["data_center"],
    "title": "Twin Falls County Magic Valley Agricultural Technology and Data Center Hub",
    "description": "Twin Falls County (Twin Falls) anchors Idaho's Magic Valley region, home to College of Southern Idaho (CSI) and a growing data center market driven by low-cost Idaho Power hydro electricity, available land, and a favorable tax climate. Chobani's yogurt manufacturing operations and dairy/ag tech data infrastructure serve the agricultural heartland. No local DC restrictions; Idaho's data center sales tax exemption (Idaho Code §63-3622KK) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Twin Falls Area Chamber of Commerce", "url": "https://www.twinfallschamber.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# North Dakota — Morton County (Mandan, energy SCADA, adjacent to state capital)
add_restriction({
    "fips": "38059",
    "name": "Morton County",
    "state": "North Dakota",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Morton County Mandan Energy Operations and State Capital Adjacency Hub",
    "description": "Morton County (Mandan) sits across the Missouri River from Bismarck and hosts the Tesoro/HollyFrontier (now HF Sinclair) Mandan oil refinery and Basin Electric Power Cooperative's energy operations data infrastructure. The Mandan, Hidatsa, and Arikara Nation's energy development adds further data infrastructure. No local DC restrictions; North Dakota's no-sales-tax-on-data-center-equipment environment applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Morton County Commission — Mandan ND", "url": "https://www.co.morton.nd.us"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Montana — Missoula County (Missoula, University of Montana, regional healthcare)
add_restriction({
    "fips": "30063",
    "name": "Missoula County",
    "state": "Montana",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Missoula County University of Montana Research Computing and Regional Technology Hub",
    "description": "Missoula County hosts the University of Montana (UM) with its research computing infrastructure and the Montana Cyberinfrastructure Network (MontanaCAN). Providence St. Patrick Hospital and Community Medical Center anchor regional health IT. Missoula is Montana's second-largest city with a growing technology sector. No local DC restrictions; Montana's no-sales-tax environment and property tax abatement (MCA §15-24-1402) apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "University of Montana — Research Computing", "url": "https://www.umt.edu/it/research-computing/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Kentucky — Kenton County (Covington/Florence, Northern KY Cincinnati metro tech)
add_restriction({
    "fips": "21117",
    "name": "Kenton County",
    "state": "Kentucky",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Kenton County Northern Kentucky Cincinnati Metro Technology Corridor",
    "description": "Kenton County (Covington/Florence) forms the core of Northern Kentucky's technology corridor adjacent to Cincinnati, hosting Cincinnati/Northern Kentucky International Airport (CVG) logistics technology, Amazon Air Hub, and a dense concentration of financial services and enterprise IT operations. Duke Energy Kentucky's competitive power rates support data center investment. No local DC restrictions; Kentucky's data center personal property tax exemption (KRS 132.200) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Northern Kentucky Area Development District", "url": "https://www.nkadd.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# West Virginia — Wood County (Parkersburg, WV regional healthcare and energy)
add_restriction({
    "fips": "54107",
    "name": "Wood County",
    "state": "West Virginia",
    "level": -1,
    "types": ["data_center"],
    "title": "Wood County Parkersburg Regional Healthcare and Energy Technology Hub",
    "description": "Wood County (Parkersburg) is the commercial center of the Mid-Ohio Valley, hosting WVU Medicine Camden Clark Medical Center's health IT operations, Lubrizol specialty chemicals (Berkshire Hathaway), and energy sector data infrastructure along the Ohio River petrochemical corridor. No local DC restrictions; WV EDGE Act (HB 2002) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Greater Parkersburg CVB — Wood County", "url": "https://www.greaterparkersburg.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Maryland — Howard County (Columbia, Leidos HQ, defense IT corridor)
add_restriction({
    "fips": "24027",
    "name": "Howard County",
    "state": "Maryland",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Howard County Columbia Maryland Defense Technology and Cybersecurity Hub",
    "description": "Howard County (Columbia) hosts Leidos' global headquarters — one of the largest defense IT and cybersecurity firms in the US — along with CACI International, Tenable Networks, and dozens of defense technology contractors in the I-95/Route 29 corridor. Proximity to NSA Fort Meade (Anne Arundel County) makes Howard County a critical node in the National Capital Region defense IT ecosystem. No local DC restrictions; Maryland's enterprise zone and cybersecurity tax credits apply.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Howard County Economic Development Authority", "url": "https://www.hceda.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Georgia — Muscogee County (Columbus, TSYS/Global Payments, Fort Moore)
add_restriction({
    "fips": "13215",
    "name": "Muscogee County",
    "state": "Georgia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Muscogee County Columbus TSYS Global Payments and Fort Moore Technology Hub",
    "description": "Muscogee County (Columbus) hosts Global Payments (TSYS) — one of the world's largest payment technology companies — with its primary data operations and technology campus. Fort Moore (formerly Fort Benning), home of the US Army Infantry and Armor schools and the Maneuver Center of Excellence, adds significant military C4ISR and training simulation data infrastructure. No local DC restrictions; Georgia's data center sales tax exemption (O.C.G.A. §48-8-3.2) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Global Payments (TSYS) — Columbus Georgia HQ", "url": "https://www.tsys.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Michigan — Isabella County (Mount Pleasant, Central Michigan University)
add_restriction({
    "fips": "26073",
    "name": "Isabella County",
    "state": "Michigan",
    "level": -1,
    "types": ["data_center"],
    "title": "Isabella County Central Michigan University Research and Regional Technology Hub",
    "description": "Isabella County (Mount Pleasant) hosts Central Michigan University (CMU) and its research computing infrastructure, along with the Saginaw Chippewa Indian Tribe's Soaring Eagle Casino and Resort enterprise IT operations. CMU's online and hybrid programs drive significant data processing infrastructure. No local DC restrictions; Michigan's data center sales and use tax exemption (PA 328) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Central Michigan University — Research Computing", "url": "https://www.cmich.edu/offices-departments/it"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Missouri — Cape Girardeau County (Cape Girardeau, SEMO, regional healthcare)
add_restriction({
    "fips": "29031",
    "name": "Cape Girardeau County",
    "state": "Missouri",
    "level": -1,
    "types": ["data_center"],
    "title": "Cape Girardeau County Southeast Missouri Regional Technology Hub",
    "description": "Cape Girardeau County hosts Southeast Missouri State University (SEMO) with regional research computing, SoutheastHEALTH hospital system's health IT operations, and Cape Girardeau's position as the commercial center of the Missouri Bootheel-SEMO region. No local DC restrictions; Missouri's data center tax exemption (RSMo §144.810) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Cape Girardeau Area Chamber of Commerce", "url": "https://www.capechamber.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-tn-007: Eastman Chemical Technology Campus (Sullivan County)
add_campus({
    "id": "ai-tn-007",
    "name": "Eastman Chemical Company Technology and Innovation Center — Kingsport",
    "operator": "Eastman Chemical Company",
    "status": "operational",
    "county_fips": "47163",
    "notes": "Eastman's Kingsport campus operates one of the most extensive industrial AI and process data systems in the US specialty chemicals sector; supports manufacturing optimization, IoT sensor networks, and enterprise ERP across global operations.",
    "lon": -82.5618,
    "lat": 36.5484
})

# ai-md-002: Leidos Global Headquarters (Howard County, Columbia MD)
add_campus({
    "id": "ai-md-002",
    "name": "Leidos Global Headquarters and Technology Campus — Columbia",
    "operator": "Leidos Holdings",
    "status": "operational",
    "county_fips": "24027",
    "notes": "Leidos' Columbia MD headquarters anchors a major defense IT and AI campus; Leidos is among the largest DoD cybersecurity, intelligence, and health IT contractors, operating classified data systems supporting NSA, DHS, and DoD agencies.",
    "lon": -76.8610,
    "lat": 39.2037
})

# ai-ga-005: Global Payments (TSYS) Columbus GA
add_campus({
    "id": "ai-ga-005",
    "name": "Global Payments (TSYS) Payment Technology Data Center — Columbus",
    "operator": "Global Payments Inc. (TSYS)",
    "status": "operational",
    "county_fips": "13215",
    "notes": "TSYS (Total System Services, now Global Payments) operates its primary payment processing data center in Columbus GA; processes billions of card transactions annually for financial institutions globally.",
    "lon": -84.9877,
    "lat": 32.4610
})

# ai-mt-001: University of Montana Research Computing (Missoula)
add_campus({
    "id": "ai-mt-001",
    "name": "University of Montana Research Computing — Missoula",
    "operator": "University of Montana",
    "status": "operational",
    "county_fips": "30063",
    "notes": "UM operates statewide research computing and the Montana Cyberinfrastructure Network (MontanaCAN) supporting genomics, environmental science, and forestry research; part of the Internet2 research network.",
    "lon": -113.9923,
    "lat": 46.8625
})

# ai-or-004: GlobalWafers Silicon Manufacturing — Albany OR (Linn County)
add_campus({
    "id": "ai-or-004",
    "name": "GlobalWafers Semiconductor Silicon Wafer Facility — Albany",
    "operator": "GlobalWafers (formerly SunEdison Semiconductor / MEMC)",
    "status": "operational",
    "county_fips": "41043",
    "notes": "GlobalWafers' Albany OR facility manufactures semiconductor-grade silicon wafers for the global chip supply chain; operations include extensive process automation, quality data systems, and manufacturing AI supporting the Willamette Valley semiconductor ecosystem.",
    "lon": -123.1059,
    "lat": 44.6365
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep P complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
