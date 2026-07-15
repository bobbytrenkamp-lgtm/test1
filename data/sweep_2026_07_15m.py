#!/usr/bin/env python3
"""Sweep M: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: AZ Cochise (Fort Huachuca/NETCOM), FL Palm Beach + Polk,
IN Tippecanoe (Purdue) + Monroe (IU), MT Cascade (Malmstrom AFB),
LA Terrebonne (offshore energy), OH Delaware (Columbus metro),
NY Onondaga (Syracuse), NC New Hanover (Wilmington), WY Campbell,
NH Strafford (UNH)
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

print("=== Sweep M ===")

# ── County Restrictions ────────────────────────────────────────────────────────

# Arizona — Cochise County (Fort Huachuca, Army NETCOM — #1 Army IT hub)
add_restriction({
    "fips": "04003",
    "name": "Cochise County",
    "state": "Arizona",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Cochise County Fort Huachuca Army Network Technology Hub",
    "description": "Cochise County hosts Fort Huachuca, home of the US Army Network Enterprise Technology Command (NETCOM) and Army Cyber Command elements. Fort Huachuca is the Army's primary network management and IT hub, housing one of the most significant DoD data infrastructure concentrations in the western US. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "US Army NETCOM — Fort Huachuca", "url": "https://www.netcom.army.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Palm Beach County (Boca Raton, ADT HQ, G4S, corporate tech)
add_restriction({
    "fips": "12099",
    "name": "Palm Beach County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Palm Beach County Boca Raton Corporate Technology Hub",
    "description": "Palm Beach County (Boca Raton) hosts ADT's global headquarters, G4S Secure Solutions, Office Depot's technology operations, and a dense concentration of financial services and insurance IT infrastructure. No local DC restrictions; Florida's data center equipment exemption (§212.08) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Business Development Board of Palm Beach County", "url": "https://www.bdb.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Polk County (Lakeland, Publix HQ tech, Amazon, Saddle Creek)
add_restriction({
    "fips": "12105",
    "name": "Polk County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center"],
    "title": "Polk County Lakeland Logistics and Retail Technology Hub",
    "description": "Polk County (Lakeland) hosts Publix Super Markets' global technology and IT headquarters, Amazon fulfillment technology operations, and Saddle Creek Logistics's systems. As one of Florida's fastest-growing logistics corridors, Polk County supports substantial supply-chain data infrastructure. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Polk County Economic Development", "url": "https://www.polkfl.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Indiana — Tippecanoe County (Lafayette/West Lafayette, Purdue research computing)
add_restriction({
    "fips": "18157",
    "name": "Tippecanoe County",
    "state": "Indiana",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Tippecanoe County Purdue University Research Computing Hub",
    "description": "Tippecanoe County (West Lafayette) hosts Purdue University's Rosen Center for Advanced Computing (RCAC), one of the largest university HPC clusters in the US, and Caterpillar's digital operations center. Purdue's Brown Family Technology Center anchors a growing tech campus. No local DC restrictions; Indiana's EDGE tax credit applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Purdue RCAC Research Computing", "url": "https://www.rcac.purdue.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Indiana — Monroe County (Bloomington, Indiana University UITS, IU research network)
add_restriction({
    "fips": "18105",
    "name": "Monroe County",
    "state": "Indiana",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Monroe County Indiana University Research Computing Hub",
    "description": "Monroe County (Bloomington) hosts Indiana University's globally recognized research data center and UITS (University IT Services), which operates among the most advanced university networking and HPC environments in the world (including BigRed200 Cray supercomputer). IU anchors a significant research data infrastructure. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "IU Research Technologies — Supercomputing", "url": "https://research.iu.edu/facilities/supercomputing.html"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Montana — Cascade County (Great Falls, Malmstrom AFB / AFGSC nuclear data)
add_restriction({
    "fips": "30013",
    "name": "Cascade County",
    "state": "Montana",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Cascade County Malmstrom AFB Air Force Global Strike Command Hub",
    "description": "Cascade County hosts Malmstrom Air Force Base, headquarters for the 341st Missile Wing and one of three Air Force Global Strike Command (AFGSC) ICBM bases. The base concentrates critical military command-and-control data infrastructure. No local DC restrictions; Montana's no-sales-tax environment and property tax abatement (MCA §15-24-1402) support complementary commercial investment.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Malmstrom AFB — 341st Missile Wing", "url": "https://www.malmstrom.af.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Louisiana — Terrebonne Parish (Houma, offshore oil/gas data hub)
add_restriction({
    "fips": "22109",
    "name": "Terrebonne Parish",
    "state": "Louisiana",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Terrebonne Parish Houma Offshore Energy Data Operations Hub",
    "description": "Terrebonne Parish (Houma) is the service hub for Gulf of Mexico offshore oil and gas operations, hosting seismic data processing, SCADA pipeline systems, and operations centers for Halliburton, Wood Group, and major offshore operators. The energy sector drives substantial edge compute and data infrastructure. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Terrebonne Economic Development Authority", "url": "https://www.terrebonne.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Ohio — Delaware County (Columbus metro data center expansion zone)
add_restriction({
    "fips": "39041",
    "name": "Delaware County",
    "state": "Ohio",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Delaware County Columbus Metro Data Center Expansion Corridor",
    "description": "Delaware County is one of the fastest-growing counties in Ohio and has emerged as a primary data center expansion zone for the Columbus metro area, offering lower land costs and competitive electricity rates while maintaining proximity to Columbus fiber infrastructure. Hyperscale cloud providers have targeted the county. No local DC restrictions; Ohio's data center sales tax exemption (ORC §5739.02(B)(42a)) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Delaware County Regional Planning", "url": "https://www.co.delaware.oh.us/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New York — Onondaga County (Syracuse, Lockheed Martin SI, Syracuse University)
add_restriction({
    "fips": "36067",
    "name": "Onondaga County",
    "state": "New York",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Onondaga County Syracuse Defense Technology and University Hub",
    "description": "Onondaga County (Syracuse) hosts Lockheed Martin's Systems Integration — Owego facility proximity, Syracuse University research computing, and CXtec's network infrastructure. No local DC restrictions; the NYS Empire State Digital program and Upstate Revitalization Initiative support technology investment in Central New York.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "CenterState CEO — Central NY Technology", "url": "https://www.centerstateceo.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# North Carolina — New Hanover County (Wilmington, GE Hitachi Nuclear, port IT)
add_restriction({
    "fips": "37129",
    "name": "New Hanover County",
    "state": "North Carolina",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "New Hanover County Wilmington Energy and Port Technology Hub",
    "description": "New Hanover County (Wilmington) hosts GE Hitachi Nuclear Energy's global headquarters, the Port of Wilmington's logistics IT infrastructure, and PPD (now Thermo Fisher Scientific) clinical research computing. No local DC restrictions; NC's data center tax incentive (G.S. 105-164.13E) applies to qualifying investments.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Wilmington Business Development", "url": "https://www.wilmingtonnc.gov/departments/development-services/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Wyoming — Campbell County (Gillette, coal and energy operations data)
add_restriction({
    "fips": "56005",
    "name": "Campbell County",
    "state": "Wyoming",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Campbell County Wyoming Energy Operations Data Hub",
    "description": "Campbell County (Gillette) is the center of Wyoming's Powder River Basin coal and energy operations, hosting SCADA, environmental monitoring, and mining operations data infrastructure for Arch Resources, Peabody Energy, and Basin Electric Power Cooperative. No state corporate income tax and no local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Campbell County Economic Development", "url": "https://www.ccgov.net/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Hampshire — Strafford County (Dover/Durham, UNH research computing)
add_restriction({
    "fips": "33017",
    "name": "Strafford County",
    "state": "New Hampshire",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Strafford County University of New Hampshire Technology Hub",
    "description": "Strafford County (Dover/Durham) hosts the University of New Hampshire's research computing and the Interoperability Lab (UNH-IOL), a premier networking test and certification facility that supports major technology vendors. Wentworth-Douglass Hospital IT and growing Seacoast tech overspill round out the market. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "UNH Interoperability Laboratory", "url": "https://www.iol.unh.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-az-001: Army NETCOM Fort Huachuca
add_campus({
    "id": "ai-az-001",
    "name": "US Army NETCOM Data Center — Fort Huachuca",
    "operator": "US Army Network Enterprise Technology Command (NETCOM)",
    "status": "operational",
    "county_fips": "04003",
    "notes": "Primary Army network management and enterprise IT data center; supports Army-wide network operations, defensive cyber, and Army Cyber Command missions.",
    "lon": -110.3445,
    "lat": 31.5437
})

# ai-in-003: Purdue RCAC
add_campus({
    "id": "ai-in-003",
    "name": "Purdue University RCAC Computing Cluster — West Lafayette",
    "operator": "Purdue University Research Computing (RCAC)",
    "status": "operational",
    "county_fips": "18157",
    "notes": "One of the largest university HPC environments in the US, hosting Anvil, Bell, and Gilbreth clusters; NSF ACCESS allocation site supporting national research.",
    "lon": -86.9081,
    "lat": 40.4237
})

# ai-in-004: Indiana University UITS Data Center
add_campus({
    "id": "ai-in-004",
    "name": "Indiana University UITS Data Center (BigRed) — Bloomington",
    "operator": "Indiana University UITS",
    "status": "operational",
    "county_fips": "18105",
    "notes": "IU operates BigRed200 (Cray Shasta supercomputer) and Carbonate HPC clusters; one of the most advanced university research networks globally, supporting genomics, HPC, and AI workloads.",
    "lon": -86.5264,
    "lat": 39.1653
})

# ai-fl-005: CyrusOne Boca Raton
add_campus({
    "id": "ai-fl-005",
    "name": "CyrusOne Boca Raton Data Center",
    "operator": "CyrusOne",
    "status": "operational",
    "county_fips": "12099",
    "notes": "CyrusOne carrier-neutral colocation facility serving South Florida enterprise and financial services clients; part of the Boca Raton corporate technology cluster.",
    "lon": -80.1275,
    "lat": 26.3683
})

# ai-oh-005: Amazon AWS Delaware County Ohio
add_campus({
    "id": "ai-oh-005",
    "name": "Amazon AWS Central Ohio Data Center — Delaware County",
    "operator": "Amazon Web Services",
    "status": "operational",
    "county_fips": "39041",
    "notes": "AWS hyperscale data center campus in Delaware County, part of the broader AWS us-east-2 (Ohio) region footprint expanding beyond Franklin County into the lower-cost Delaware County corridor.",
    "lon": -83.0677,
    "lat": 40.2981
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep M complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
