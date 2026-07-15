#!/usr/bin/env python3
"""Sweep L: 12 counties, 5 campuses, 2 incentives, 0 state regs
Targets: NY (Albany, Saratoga/GlobalFoundries), OH (Montgomery/Dayton AFRL),
LA (Bossier/Cyber Innovation Center), WI (Waukesha/GE Healthcare),
WA (Clark/Vancouver, Pierce/Tacoma), FL (Brevard/Space Coast, Seminole),
CO (Weld/Greeley), MO (Platte/KC), MA (Plymouth), TX (Bexar area)
Tax: HI and VT (completes all 50 states with incentive entries)
"""
import json, pathlib

ROOT = pathlib.Path(__file__).parent.parent
RAW  = ROOT / "data" / "restrictions_raw.json"
CAMP = ROOT / "data" / "ai_campuses.json"
TAX  = ROOT / "data" / "tax_incentives.json"

with open(RAW)  as f: raw  = json.load(f)
with open(CAMP) as f: camp = json.load(f)
with open(TAX)  as f: tax  = json.load(f)

existing_fips = {r["fips"] for r in raw["restrictions"]}
existing_cids = {c["id"]   for c in camp["ai_campuses"]}
existing_ti   = {(t["state"], t["program_name"]) for t in tax["tax_incentives"]}

added = {"restrictions": 0, "campuses": 0, "incentives": 0}

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

def add_incentive(entry):
    key = (entry["state"], entry["program_name"])
    if key in existing_ti:
        return
    tax["tax_incentives"].append(entry)
    existing_ti.add(key)
    added["incentives"] += 1
    print(f"  +incentive {entry['state']} {entry['program_name']}")

print("=== Sweep L ===")

# ── County Restrictions ────────────────────────────────────────────────────────

# New York — Albany County (Albany, IBM, NY state government IT)
add_restriction({
    "fips": "36001",
    "name": "Albany County",
    "state": "New York",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Albany County New York State Government and IBM Technology Hub",
    "description": "Albany County hosts New York State's Office of Information Technology Services (ITS) enterprise data center, IBM's longstanding technology operations, and SUNY Albany research computing. NY state government IT represents one of the largest public-sector data center footprints in the US. No local DC restrictions; NYS Empire State Development incentives apply.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NYS Office of Information Technology Services", "url": "https://its.ny.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New York — Saratoga County (Malta, GlobalFoundries Fab 8 semiconductor)
add_restriction({
    "fips": "36091",
    "name": "Saratoga County",
    "state": "New York",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Saratoga County GlobalFoundries Semiconductor and Technology Hub",
    "description": "Saratoga County hosts GlobalFoundries Fab 8 in Malta — one of the largest and most advanced semiconductor manufacturing facilities in North America. On-premises compute infrastructure for chip design, EDA simulation, and manufacturing AI is substantial. SUNY Polytechnic Institute (Albany Nano) proximity anchors the semiconductor tech corridor. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "GlobalFoundries Fab 8 — Malta NY", "url": "https://gf.com/manufacturing/fab-8/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Ohio — Montgomery County (Dayton, Wright-Patterson AFB, AFRL cyber)
add_restriction({
    "fips": "39113",
    "name": "Montgomery County",
    "state": "Ohio",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Montgomery County Dayton Defense Technology and Cyber Hub",
    "description": "Montgomery County (Dayton) hosts Wright-Patterson Air Force Base and the Air Force Research Laboratory (AFRL), the Air Force's primary science and technology organization. The AFRL Information Directorate drives major computing investments. No local DC restrictions; Ohio's data center sales tax exemption (ORC §5739.02(B)(42a)) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "AFRL — Wright-Patterson AFB", "url": "https://www.afrl.af.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Louisiana — Bossier Parish (Barksdale AFB, Louisiana Cyber Innovation Center)
add_restriction({
    "fips": "22015",
    "name": "Bossier Parish",
    "state": "Louisiana",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Bossier Parish Cyber Innovation Center and Barksdale AFB Technology Hub",
    "description": "Bossier Parish hosts the Louisiana Cyber Innovation Center (LCIC), a premier cybersecurity research and development hub co-located near Barksdale Air Force Base. The Air Force's Global Strike Command concentrates significant military cyber and data operations here. No local DC restrictions; Louisiana's data center incentives (R.S. 47:6039) apply.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Louisiana Cyber Innovation Center", "url": "https://www.lcic.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Wisconsin — Waukesha County (GE Healthcare HQ, Kohl's IT)
add_restriction({
    "fips": "55133",
    "name": "Waukesha County",
    "state": "Wisconsin",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Waukesha County GE Healthcare and Corporate IT Hub",
    "description": "Waukesha County hosts GE HealthCare's global headquarters and R&D operations, Kohl's Corporation IT center, and Generac Power Systems technology operations. No local DC restrictions; Wisconsin's data center sales tax exemption (s.77.54(57)) and competitive We Energies power rates support investment.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "GE HealthCare — Waukesha WI", "url": "https://www.gehealthcare.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Washington — Clark County (Vancouver, Silicon Forest south, Amazon/Daimler)
add_restriction({
    "fips": "53011",
    "name": "Clark County",
    "state": "Washington",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Clark County Vancouver Silicon Forest South Technology Hub",
    "description": "Clark County (Vancouver WA) is the southern anchor of the Portland-Vancouver Silicon Forest, attracting tech companies seeking Oregon-free corporate income tax while maintaining Pacific Northwest connectivity. Amazon, Daimler Trucks North America, and multiple tech firms operate data infrastructure here. No local DC restrictions; WA's data center sales tax exemption applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Greater Vancouver WA Economic Development", "url": "https://www.columbiabusinesscenter.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Brevard County (Space Coast, NASA, SpaceX, L3Harris)
add_restriction({
    "fips": "12009",
    "name": "Brevard County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Brevard County Space Coast Defense and Aerospace Technology Hub",
    "description": "Brevard County (Space Coast) hosts NASA Kennedy Space Center, SpaceX launch operations, L3Harris Technologies (global HQ in Melbourne), and Northrop Grumman. The concentration of aerospace/defense IT is among the highest per-capita in the US. No local DC restrictions; Florida's data center equipment exemption (§212.08) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Space Florida — Technology Hub", "url": "https://www.spaceflorida.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Washington — Pierce County (Tacoma, Joint Base Lewis-McChord)
add_restriction({
    "fips": "53053",
    "name": "Pierce County",
    "state": "Washington",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Pierce County Tacoma Defense IT and Regional Technology Hub",
    "description": "Pierce County hosts Joint Base Lewis-McChord (JBLM), one of the largest Army installations in the US, with significant military data and communications infrastructure. MultiCare Health System, the Port of Tacoma logistics IT, and Amazon distribution tech also operate in the county. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Pierce County EDC — Technology", "url": "https://www.piercecountyed.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Colorado — Weld County (Greeley, Anadarko/Chevron energy data, agricultural tech)
add_restriction({
    "fips": "08123",
    "name": "Weld County",
    "state": "Colorado",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Weld County Colorado Energy and Agricultural Technology Data Hub",
    "description": "Weld County hosts significant oil and gas operations data infrastructure (Chevron, Civitas Resources), JBS USA food technology, and agricultural analytics operations. The county's energy sector drives one of the largest industrial IoT/SCADA data footprints in Colorado. No local DC restrictions; Colorado EIAF incentives available.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Upstate Colorado Economic Development", "url": "https://www.upstatecolorado.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Missouri — Platte County (Kansas City area, MCI airport zone, logistics tech)
add_restriction({
    "fips": "29165",
    "name": "Platte County",
    "state": "Missouri",
    "level": -1,
    "types": ["data_center"],
    "title": "Platte County Kansas City Airport Technology and Logistics Hub",
    "description": "Platte County (Riverside/Parkville) hosts technology operations near Kansas City International Airport (MCI), benefiting from major airline and logistics IT infrastructure. World Wide Technology (WWT) and H&R Block IT operations extend into this corridor. No local DC restrictions; Missouri's quality jobs incentive and Chapter 100 bonds support qualifying investments.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Platte County Economic Development", "url": "https://www.plattecountyed.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Massachusetts — Plymouth County (South Shore, healthcare IT, Raytheon proximity)
add_restriction({
    "fips": "25023",
    "name": "Plymouth County",
    "state": "Massachusetts",
    "level": -1,
    "types": ["data_center"],
    "title": "Plymouth County South Shore Healthcare and Regional Technology Hub",
    "description": "Plymouth County hosts South Shore Hospital, Beth Israel Lahey Health South Shore, and Raytheon Intelligence & Space proximity operations. Growing data infrastructure supports the healthcare IT corridor between Boston and Cape Cod. No local DC restrictions; Massachusetts data center equipment exemption (Ch.64H §6(r)) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "South Shore Chamber of Commerce Technology", "url": "https://www.southshorechamber.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Seminole County (Lake Mary/Sanford, AAA, Mitsubishi Power, Fiserv)
add_restriction({
    "fips": "12117",
    "name": "Seminole County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Seminole County Lake Mary Corporate Technology Hub",
    "description": "Seminole County (Lake Mary/Sanford) hosts AAA's US headquarters, Mitsubishi Power Americas, Convergys (now Concentrix), and multiple financial services technology operations. Lake Mary is one of Florida's most significant corporate technology centers outside Miami and Tampa. No local DC restrictions; FL data center equipment exemption (§212.08) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Seminole County Economic Development", "url": "https://www.seminolecountyfl.gov/offices/economic-development/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ny-002: NYS ITS Enterprise Data Center Albany
add_campus({
    "id": "ai-ny-002",
    "name": "New York State ITS Enterprise Data Center — Albany",
    "operator": "NYS Office of Information Technology Services",
    "status": "operational",
    "county_fips": "36001",
    "notes": "State-operated enterprise data center providing IT infrastructure for New York State agencies; one of the largest public-sector data centers in the Northeast.",
    "lon": -73.7562,
    "lat": 42.6526
})

# ai-ny-003: GlobalFoundries Fab 8 Computing Infrastructure
add_campus({
    "id": "ai-ny-003",
    "name": "GlobalFoundries Fab 8 Computing Infrastructure — Malta",
    "operator": "GlobalFoundries",
    "status": "operational",
    "county_fips": "36091",
    "notes": "On-premises HPC and EDA compute supporting chip design simulation, manufacturing AI, and yield analytics for one of North America's largest semiconductor fabs.",
    "lon": -73.8199,
    "lat": 43.0100
})

# ai-oh-004: AFRL Computing Center Wright-Patterson
add_campus({
    "id": "ai-oh-004",
    "name": "Air Force Research Laboratory Computing Center — Wright-Patterson",
    "operator": "US Air Force Research Laboratory (AFRL)",
    "status": "operational",
    "county_fips": "39113",
    "notes": "AFRL operates DoD HPC resources at Wright-Patterson supporting materials science, aerospace modeling, autonomy AI, and cyber research across the Information, Space, and Sensors directorates.",
    "lon": -84.0483,
    "lat": 39.8261
})

# ai-la-002: Louisiana Cyber Innovation Center
add_campus({
    "id": "ai-la-002",
    "name": "Louisiana Cyber Innovation Center (LCIC) — Bossier City",
    "operator": "State of Louisiana / LCIC",
    "status": "operational",
    "county_fips": "22015",
    "notes": "Public-private cybersecurity R&D hub co-located with defense technology partners near Barksdale AFB; anchors Louisiana's cyber technology corridor.",
    "lon": -93.7321,
    "lat": 32.5160
})

# ai-fl-004: L3Harris Technologies Melbourne Operations Center
add_campus({
    "id": "ai-fl-004",
    "name": "L3Harris Technologies Mission Operations Data Center",
    "operator": "L3Harris Technologies",
    "status": "operational",
    "county_fips": "12009",
    "notes": "L3Harris global HQ supports defense electronics, satellite communications, and intelligence systems compute at the Melbourne, FL campus — among the largest defense-tech data footprints in Florida.",
    "lon": -80.6081,
    "lat": 28.0836
})

# ── Tax Incentives ─────────────────────────────────────────────────────────────

# Hawaii — High Technology Investment Tax Credit
add_incentive({
    "state": "HI",
    "program_name": "Hawaii High Technology Investment Tax Credit",
    "incentive_type": "Income tax credit",
    "min_investment_m": None,
    "notes": "HRS §235-110.91 provides a 100% refundable income tax credit (up to $2.5M per investment) for qualified investment in high-technology businesses operating in Hawaii. Data centers supporting qualifying R&D, software development, or AI workloads for eligible businesses may benefit. The Hawaii Technology Development Corporation (HTDC) also provides facility grants and technical assistance.",
    "fips_list": ["15003", "15009"]
})

# Vermont — Vermont Employment Growth Incentive (VEGI)
add_incentive({
    "state": "VT",
    "program_name": "Vermont Employment Growth Incentive (VEGI)",
    "incentive_type": "Performance-based incentive",
    "min_investment_m": None,
    "notes": "32 V.S.A. §3325 establishes the VEGI program, administered by the Vermont Economic Progress Council (VEPC). Cash incentive payments are awarded based on net new qualifying payroll, qualifying capital investments, and overall economic benefit to Vermont. Large data center projects creating well-paid technical jobs may qualify for significant VEGI awards.",
    "fips_list": ["50007", "50023"]
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)
with open(TAX,  "w") as f: json.dump(tax,  f, indent=2)

print(f"\nSweep L complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +{added['incentives']} incentives, +0 state regs")
