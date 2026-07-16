#!/usr/bin/env python3
"""Sweep T: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: NY Jefferson (Fort Drum/10th Mountain), NY Orange (West Point area/Stewart ANG),
MA Hampshire (Amherst/UMass/MGHPCC), MA Barnstable (Cape Cod/PAVE PAWS),
OH Lake (Mentor/Sherwin-Williams), OH Lorain (Elyria/US Steel),
WI Sheboygan (Kohler/Sargento), MN Ramsey (St. Paul/MN state IT),
MN Anoka (Minneapolis north/Amazon), KS Shawnee (Topeka/KS state IT),
KS Douglas (Lawrence/KU research), MN Carver (Chaska/Cargill/western suburbs)
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

print("=== Sweep T ===")

# New York — Jefferson County (Watertown, Fort Drum, 10th Mountain Division)
add_restriction({
    "fips": "36045",
    "name": "Jefferson County",
    "state": "New York",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Jefferson County Fort Drum 10th Mountain Division Technology Hub",
    "description": "Jefferson County (Watertown) hosts Fort Drum, home of the 10th Mountain Division — the most-deployed division in the US Army since 9/11 — with significant mission command, logistics AI, and network operations data infrastructure. Fort Drum's Joint Multinational Readiness Center training exercises and sustainment data systems anchor the county's technology profile. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Fort Drum — 10th Mountain Division", "url": "https://www.drum.army.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New York — Orange County (Newburgh, Stewart ANG Base, West Point area)
add_restriction({
    "fips": "36071",
    "name": "Orange County",
    "state": "New York",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Orange County Stewart ANG Base and Hudson Valley Technology Hub",
    "description": "Orange County (Newburgh/Middletown) hosts Stewart Air National Guard Base — a key Air Mobility Command tanker base and Army Reserve aviation hub — and lies adjacent to West Point's military academy technology infrastructure. The Hudson Valley Technology Hub and I-84 corridor support growing data center interest from New York City metro operators seeking lower costs. No local DC restrictions; NYS Empire State Digital incentive program applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Orange County Partnership — Economic Development", "url": "https://www.ocpartnership.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Massachusetts — Hampshire County (Amherst, UMass, MGHPCC)
add_restriction({
    "fips": "25015",
    "name": "Hampshire County",
    "state": "Massachusetts",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Hampshire County Amherst UMass and Massachusetts Green High Performance Computing",
    "description": "Hampshire County (Amherst/Northampton) hosts the University of Massachusetts Amherst and the Massachusetts Green High Performance Computing Center (MGHPCC) — a consortium facility serving UMass, Harvard, MIT, BU, and Northeastern. The MGHPCC is one of the most energy-efficient research data centers in the US and anchors a growing Pioneer Valley technology ecosystem. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Massachusetts Green HPC Center (MGHPCC)", "url": "https://www.mghpcc.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Massachusetts — Barnstable County (Cape Cod, PAVE PAWS, Otis ANG)
add_restriction({
    "fips": "25001",
    "name": "Barnstable County",
    "state": "Massachusetts",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Barnstable County Cape Cod PAVE PAWS Radar and Otis ANG Technology Hub",
    "description": "Barnstable County (Hyannis/Barnstable) hosts the PAVE PAWS phased-array warning radar system at Cape Cod Air Force Station — a critical ballistic missile early warning radar for the Eastern Seaboard — and Otis Air National Guard Base with its 102nd Intelligence Wing. The concentration of radar, signals intelligence, and early warning data infrastructure is militarily significant. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Cape Cod Air Force Station — PAVE PAWS", "url": "https://www.afspacecom.af.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Ohio — Lake County (Mentor, Sherwin-Williams, Lubrizol, NE Ohio tech)
add_restriction({
    "fips": "39085",
    "name": "Lake County",
    "state": "Ohio",
    "level": -1,
    "types": ["data_center"],
    "title": "Lake County Mentor Northeast Ohio Manufacturing and Technology Hub",
    "description": "Lake County (Mentor/Painesville) hosts Sherwin-Williams' coatings R&D operations and Lubrizol's (Berkshire Hathaway) specialty chemical technology headquarters, driving significant industrial AI and manufacturing data infrastructure in the Cleveland metro eastern corridor. NOPEC's cooperative utility rates support enterprise technology investment. No local DC restrictions; Ohio's data center sales tax exemption (ORC §5739.02(B)(42a)) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Lubrizol Corporation — Wickliffe Ohio (Lake County)", "url": "https://www.lubrizol.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Ohio — Lorain County (Elyria, US Steel, Ford Motor, NE Ohio steel corridor)
add_restriction({
    "fips": "39093",
    "name": "Lorain County",
    "state": "Ohio",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Lorain County Elyria US Steel and Advanced Manufacturing Technology Hub",
    "description": "Lorain County (Elyria/Lorain) hosts US Steel's Great Lakes Works and Ford Motor's Lorain stamping operations, driving industrial IoT, process control, and supply chain data infrastructure in the Lake Erie manufacturing corridor. Lorain County Community College's technology programs support a growing technology workforce pipeline. No local DC restrictions; Ohio's data center sales tax exemption (ORC §5739.02(B)(42a)) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Lorain County Economic Development", "url": "https://www.loraincounty.us/departments/economic-development/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Wisconsin — Sheboygan County (Sheboygan, Kohler Company global HQ, Sargento Foods)
add_restriction({
    "fips": "55117",
    "name": "Sheboygan County",
    "state": "Wisconsin",
    "level": -1,
    "types": ["data_center"],
    "title": "Sheboygan County Kohler Company and Manufacturing Technology Hub",
    "description": "Sheboygan County hosts Kohler Company's global headquarters and innovation campus — a major bathroom/kitchen fixture and power systems manufacturer with extensive industrial IoT and manufacturing AI — alongside Sargento Foods' cheese production technology operations. Kohler's hospitality and commercial real estate portfolio drives enterprise data infrastructure. No local DC restrictions; Wisconsin's data center sales tax exemption (Wis. Stat. §77.54(57)) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Kohler Company Global Headquarters — Sheboygan County", "url": "https://www.kohler.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Minnesota — Ramsey County (St. Paul, Minnesota state capital IT, health systems)
add_restriction({
    "fips": "27123",
    "name": "Ramsey County",
    "state": "Minnesota",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Ramsey County St. Paul Minnesota State Government and Health Technology Hub",
    "description": "Ramsey County (St. Paul) is Minnesota's state capital, housing the Minnesota IT Services (MNIT) enterprise data center operations for state government, Regions Hospital's health IT, and 3M's specialty materials innovation center on the East Side. Ecolab's water technology and food safety data operations anchor the corporate technology presence. No local DC restrictions; Minnesota's Angel Tax Credit and targeted tax increment financing support technology investment.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Minnesota IT Services (MNIT) — State Data Center", "url": "https://mn.gov/mnit/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Minnesota — Anoka County (Coon Rapids, Minneapolis north metro, Amazon fulfillment)
add_restriction({
    "fips": "27003",
    "name": "Anoka County",
    "state": "Minnesota",
    "level": -1,
    "types": ["data_center"],
    "title": "Anoka County Minneapolis North Metro Logistics and Technology Hub",
    "description": "Anoka County (Coon Rapids/Blaine) is the fastest-growing county in the Minneapolis metro area, hosting Amazon's large fulfillment and logistics technology operations, Medtronic device manufacturing, and a growing I-35W corridor technology cluster. Xcel Energy's transmission infrastructure and the northern metro fiber network support data center development. No local DC restrictions; Minnesota's Sales Tax Exemption for Data Centers (Minn. Stat. §297A.68) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Anoka County Economic Development", "url": "https://www.anokacounty.us/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Kansas — Shawnee County (Topeka, Kansas state government IT, BNSF)
add_restriction({
    "fips": "20177",
    "name": "Shawnee County",
    "state": "Kansas",
    "level": -1,
    "types": ["data_center"],
    "title": "Shawnee County Topeka Kansas State Government and Transportation Technology Hub",
    "description": "Shawnee County (Topeka) is Kansas's state capital, hosting the Kansas Office of Information Technology Services (OITS) state data center and the Hill's Pet Nutrition (Colgate-Palmolive) research computing operations. BNSF Railway's significant Topeka operations drive logistics data infrastructure in the central freight corridor. No local DC restrictions; Kansas data center equipment sales tax exemption applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Kansas Office of Information Technology Services (OITS)", "url": "https://ebit.ks.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Kansas — Douglas County (Lawrence, University of Kansas research computing)
add_restriction({
    "fips": "20045",
    "name": "Douglas County",
    "state": "Kansas",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Douglas County Lawrence University of Kansas Research Computing Hub",
    "description": "Douglas County (Lawrence) hosts the University of Kansas (KU) and its Center for Research Computing (CRC) — providing HPC resources for genomics, biomedical engineering, and humanities data — as well as KU Medical Center's clinical data infrastructure. Lawrence's position between Topeka and Kansas City metro supports a growing technology talent corridor. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "KU Center for Research Computing", "url": "https://crc.ku.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Minnesota — Carver County (Chaska/Chanhassen, Cargill, western metro tech)
add_restriction({
    "fips": "27019",
    "name": "Carver County",
    "state": "Minnesota",
    "level": -1,
    "types": ["data_center"],
    "title": "Carver County Chaska Western Twin Cities Manufacturing and Technology Hub",
    "description": "Carver County (Chaska/Chanhassen) hosts Cargill's global headquarters (one of the largest privately-held companies in the US) with substantial agricultural technology and supply chain data operations, and a growing western Twin Cities technology corridor with Pentair's water treatment technology operations. No local DC restrictions; Minnesota's data center sales tax exemption (Minn. Stat. §297A.68) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Cargill Global Headquarters — Wayzata/Hopkins MN", "url": "https://www.cargill.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ny-004: Fort Drum 10th Mountain Division (Jefferson County)
add_campus({
    "id": "ai-ny-004",
    "name": "Fort Drum 10th Mountain Division Mission Command Center",
    "operator": "US Army 10th Mountain Division",
    "status": "operational",
    "county_fips": "36045",
    "notes": "Fort Drum's 10th Mountain Division operates mission command and logistics data systems supporting the most-deployed US Army division; includes joint exercise data infrastructure and theater sustainment computing.",
    "lon": -75.7607,
    "lat": 44.0527
})

# ai-ma-002: Massachusetts Green HPC Center MGHPCC (Hampshire County)
add_campus({
    "id": "ai-ma-002",
    "name": "Massachusetts Green High Performance Computing Center (MGHPCC) — Holyoke",
    "operator": "UMass / Harvard / MIT / BU / Northeastern (consortium)",
    "status": "operational",
    "county_fips": "25015",
    "notes": "MGHPCC is one of the most energy-efficient research data centers in the US, serving research computing for 5 major New England universities; powered by hydroelectric power from the Connecticut River; exemplar of academic research data center design.",
    "lon": -72.6162,
    "lat": 42.2036
})

# ai-mn-003: MNIT State Data Center (Ramsey County)
add_campus({
    "id": "ai-mn-003",
    "name": "Minnesota IT Services (MNIT) Enterprise Data Center — St. Paul",
    "operator": "Minnesota IT Services (MNIT)",
    "status": "operational",
    "county_fips": "27123",
    "notes": "MNIT's state data center provides enterprise IT infrastructure for all Minnesota state agencies, including cybersecurity operations, cloud services brokerage, and the state's 911 emergency communications system backbone.",
    "lon": -93.0898,
    "lat": 44.9537
})

# ai-ks-003: Kansas OITS State Data Center (Shawnee County)
add_campus({
    "id": "ai-ks-003",
    "name": "Kansas Office of Information Technology Services (OITS) State Data Center — Topeka",
    "operator": "Kansas Office of Information Technology Services",
    "status": "operational",
    "county_fips": "20177",
    "notes": "Kansas OITS operates the state government primary data center supporting agency IT consolidation and shared services; manages the KanAccess broadband mapping and rural connectivity data programs.",
    "lon": -95.6890,
    "lat": 39.0558
})

# ai-wi-002: Kohler Company Innovation Center (Sheboygan County)
add_campus({
    "id": "ai-wi-002",
    "name": "Kohler Company Innovation Center and Manufacturing Technology Campus",
    "operator": "Kohler Co.",
    "status": "operational",
    "county_fips": "55117",
    "notes": "Kohler's Sheboygan County campus houses the company's manufacturing AI, IoT sensor integration, and enterprise data systems for global operations; Kohler's residential and hospitality technology platforms process data from millions of connected fixtures worldwide.",
    "lon": -87.7845,
    "lat": 43.7369
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep T complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
