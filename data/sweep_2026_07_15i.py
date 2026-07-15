#!/usr/bin/env python3
"""Sweep I: 12 counties, 5 campuses, 2 incentives, 0 state regs
Targets: 2nd entries for AK, DE, HI, WY; SC expansion; AR/AL/CT/MA/MS/NM additions
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

print("=== Sweep I ===")

# ── County Restrictions ────────────────────────────────────────────────────────

# Alaska — Fairbanks North Star Borough (UAF research computing)
add_restriction({
    "fips": "02090",
    "name": "Fairbanks North Star Borough",
    "state": "Alaska",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Fairbanks North Star Borough — UAF Research Computing Hub",
    "description": "Fairbanks hosts the University of Alaska Fairbanks (UAF) Arctic Region Supercomputing Center and NOAA/NWS Alaska operations. Cold climate enables year-round free cooling. No local DC zoning restrictions; Alaska's no-income/no-state-sales-tax environment supports operational economics.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "UAF Research Computing", "url": "https://www.uaf.edu/rcs/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Delaware — Kent County (Dover, state capital IT)
add_restriction({
    "fips": "10001",
    "name": "Kent County",
    "state": "Delaware",
    "level": -1,
    "types": ["data_center"],
    "title": "Kent County Delaware State Capital IT Infrastructure",
    "description": "Dover (Kent County) hosts Delaware's Department of Technology and Information (DTI) state data center. Delaware has no state sales tax, reducing equipment acquisition costs. No local DC restrictions; the DTI facility serves as the state's primary government IT operations hub.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Delaware DTI — State Technology", "url": "https://dti.delaware.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Hawaii — Maui County (MHPCC, Air Force AMOS)
add_restriction({
    "fips": "15009",
    "name": "Maui County",
    "state": "Hawaii",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Maui County — MHPCC and Air Force Supercomputing Hub",
    "description": "Maui hosts the Maui High Performance Computing Center (MHPCC), operated for the Air Force Research Laboratory, and the Air Force Maui Optical and Supercomputing (AMOS) facility. No local DC zoning restrictions; Hawaii's strategic Pacific location and renewable energy transition support long-term operations.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "MHPCC — Maui HPC Center", "url": "https://www.mhpcc.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Wyoming — Natrona County (Casper, energy sector data)
add_restriction({
    "fips": "56025",
    "name": "Natrona County",
    "state": "Wyoming",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Natrona County Wyoming Energy Sector Data Hub",
    "description": "Casper (Natrona County) is Wyoming's second-largest city and the hub of the state's oil, gas, and wind energy data operations. No state corporate income tax or personal income tax. No local DC restrictions. Wyoming's abundant wind power provides low-carbon electricity options for data centers.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Wyoming LEADS — Data Center Incentives", "url": "https://www.wyomingleads.com/why-wyoming/incentives/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Arkansas — Washington County (Fayetteville/Springdale, University of Arkansas)
add_restriction({
    "fips": "05143",
    "name": "Washington County",
    "state": "Arkansas",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Washington County Northwest Arkansas University Tech Corridor",
    "description": "Washington County (Fayetteville/Springdale) anchors the University of Arkansas research computing ecosystem and hosts J.B. Hunt Transport technology operations. Part of the broader Northwest Arkansas tech corridor. No local DC restrictions; AEDC incentives and competitive land/power costs drive investment.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "AEDC — Arkansas Technology", "url": "https://www.arkansasedc.com/industries/technology"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Mississippi — Harrison County (Gulfport/Biloxi, Gulf Coast energy data)
add_restriction({
    "fips": "28047",
    "name": "Harrison County",
    "state": "Mississippi",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Harrison County Gulf Coast Energy and Hospitality IT Hub",
    "description": "Harrison County (Gulfport/Biloxi) hosts Gulf energy operations data and the IT infrastructure supporting Mississippi's coastal gaming/hospitality industry. Mississippi's Data Center Sales Tax Exemption (§27-65-101) applies. No local DC zoning restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "MS Development Authority Incentives", "url": "https://www.mississippi.org/incentives/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Mexico — Santa Fe County (state capital, DOE/LANL proximity)
add_restriction({
    "fips": "35049",
    "name": "Santa Fe County",
    "state": "New Mexico",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Santa Fe County State Capital and DOE Edge Compute Hub",
    "description": "Santa Fe (Santa Fe County) hosts New Mexico's state government IT infrastructure and serves as a connectivity hub for Los Alamos National Laboratory operations. The state's Technology Jobs Tax Credit and no local DC restrictions support the growing DOE/defense technology corridor.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NM EMNRD — Technology Incentives", "url": "https://www.nmedd.com/incentives.html"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Alabama — Montgomery County (state capital, Alabama Supercomputer Authority)
add_restriction({
    "fips": "01101",
    "name": "Montgomery County",
    "state": "Alabama",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Montgomery County Alabama State Capital IT and Supercomputing Hub",
    "description": "Montgomery (Montgomery County) hosts the Alabama Supercomputer Authority (ASA) and Alabama state government IT operations. The ASA operates high-performance computing resources for state agencies and universities. No local DC restrictions; Alabama's Growing Alabama Credit (§40-18-376.1) supports qualifying investments.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Alabama Supercomputer Authority", "url": "https://www.asc.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Connecticut — New London County (Groton, Electric Boat / US Navy defense IT)
add_restriction({
    "fips": "09011",
    "name": "New London County",
    "state": "Connecticut",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "New London County Defense Technology and Navy IT Hub",
    "description": "New London County hosts the US Navy Submarine Base (Groton), Electric Boat / General Dynamics submarine manufacturing IT, and US Coast Guard Academy computing. Significant defense-sector data infrastructure with no local DC zoning restrictions. Connecticut's Data Center Equipment Tax Exemption (CGS §12-412(112)) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "CT OPM — Economic Development", "url": "https://portal.ct.gov/OPM"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# South Carolina — Charleston County (port logistics IT, growing tech hub)
add_restriction({
    "fips": "45019",
    "name": "Charleston County",
    "state": "South Carolina",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Charleston County Port Logistics and Technology Hub",
    "description": "Charleston County hosts the Port of Charleston IT infrastructure, Volvo Cars North America operations data, and a growing fintech/medical tech sector. No local DC restrictions; SC's sales tax exemption for data center equipment (SC Code §12-36-2120(67)) and Locate SC incentives support investment.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Locate SC — Data Center Incentives", "url": "https://locatesc.com/incentives/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# South Carolina — Greenville County (BMW / manufacturing tech corridor)
add_restriction({
    "fips": "45045",
    "name": "Greenville County",
    "state": "South Carolina",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Greenville County Upstate SC Advanced Manufacturing Technology Hub",
    "description": "Greenville County hosts BMW Manufacturing's North American IT hub, Michelin's digital operations, and a growing concentration of advanced manufacturing data infrastructure. No local DC restrictions; SC's data center equipment exemptions and Greenville's Upstate SC Alliance incentives support investment.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Upstate SC Alliance — Technology", "url": "https://upstatescalliance.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Massachusetts — Norfolk County (Dedham/Quincy, State Street / healthcare IT)
add_restriction({
    "fips": "25021",
    "name": "Norfolk County",
    "state": "Massachusetts",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Norfolk County Greater Boston South Shore Technology Hub",
    "description": "Norfolk County (Dedham/Quincy/Braintree) hosts State Street Corporation's technology operations, Blue Cross Blue Shield MA, and significant healthcare/financial IT infrastructure. No local DC restrictions; MassIT-supported broadband and Massachusetts' data center equipment exemption (Ch.64H §6(r)) apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "MassTech Collaborative", "url": "https://masstech.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ak-002: UAF Arctic Region Supercomputing Center
add_campus({
    "id": "ai-ak-002",
    "name": "UAF Arctic Region Supercomputing Center (ARSC)",
    "operator": "University of Alaska Fairbanks",
    "status": "operational",
    "county_fips": "02090",
    "notes": "High-performance computing center supporting Arctic research, climate modeling, and DoD/NOAA computation workloads.",
    "lon": -147.7220,
    "lat": 64.8401
})

# ai-hi-002: MHPCC Maui
add_campus({
    "id": "ai-hi-002",
    "name": "Maui High Performance Computing Center (MHPCC)",
    "operator": "Amentum Services (for AFRL)",
    "status": "operational",
    "county_fips": "15009",
    "notes": "DoD-funded HPC center operated for the Air Force Research Laboratory; supports Pacific theater defense simulation and AI workloads.",
    "lon": -156.6825,
    "lat": 20.8783
})

# ai-de-002: Delaware DTI State Data Center
add_campus({
    "id": "ai-de-002",
    "name": "Delaware DTI State Data Center — Dover",
    "operator": "Delaware Department of Technology and Information",
    "status": "operational",
    "county_fips": "10001",
    "notes": "Primary state government data center serving Delaware's agency IT infrastructure, hosting enterprise applications and disaster recovery.",
    "lon": -75.5244,
    "lat": 39.1582
})

# ai-al-002: Alabama Supercomputer Authority
add_campus({
    "id": "ai-al-002",
    "name": "Alabama Supercomputer Authority Data Center",
    "operator": "Alabama Supercomputer Authority (ASA)",
    "status": "operational",
    "county_fips": "01101",
    "notes": "State-operated HPC facility providing supercomputing resources for Alabama universities, state agencies, and research programs.",
    "lon": -86.2999,
    "lat": 32.3668
})

# ai-sc-003: Immedion Charleston
add_campus({
    "id": "ai-sc-003",
    "name": "Immedion Charleston Data Center",
    "operator": "Immedion",
    "status": "operational",
    "county_fips": "45019",
    "notes": "Regional colocation data center serving Charleston's growing financial technology, healthcare, and logistics IT sectors.",
    "lon": -79.9311,
    "lat": 32.7765
})

# ── Tax Incentives ─────────────────────────────────────────────────────────────

# Alaska — no income/sales tax environment
add_incentive({
    "state": "AK",
    "program_name": "Alaska No-Income/No-State-Sales-Tax Environment",
    "incentive_type": "Tax structure",
    "min_investment_m": None,
    "notes": "Alaska levies no state income tax and no state sales tax (funded by Permanent Fund oil revenues). Data centers benefit from structurally lower operating costs. Federal/DoD data center projects also receive favorable treatment. Individual municipalities may levy local sales taxes.",
    "fips_list": ["02020", "02090"]
})

# Maine — Business Equipment Tax Exemption (BETE)
add_incentive({
    "state": "ME",
    "program_name": "Maine Business Equipment Tax Exemption (BETE)",
    "incentive_type": "Property tax exemption",
    "min_investment_m": None,
    "notes": "36 MRSA §694 exempts qualified business equipment — including data center servers, storage, and networking hardware — from local property taxation. First-time business property in Maine qualifies; reduces one of the largest recurring cost drivers for data centers.",
    "fips_list": ["23005", "23011"]
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)
with open(TAX,  "w") as f: json.dump(tax,  f, indent=2)

print(f"\nSweep I complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +{added['incentives']} incentives, +0 state regs")
