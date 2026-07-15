#!/usr/bin/env python3
"""Sweep K: 12 counties, 5 campuses, 2 incentives, 0 state regs
Targets: CO (Arapahoe/Aurora), PA (Philadelphia), IL (Kane/Aurora),
GA (Clarke/Athens), NJ (Mercer/Princeton), ME (Penobscot/Bangor),
MS (Rankin/Brandon), SD (Lincoln), AR (Sebastian/Ft. Smith),
OR (Benton/Corvallis), WI (Washington), IN (St. Joseph/South Bend)
Tax: DE and MT (last two states missing incentive entries)
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

print("=== Sweep K ===")

# ── County Restrictions ────────────────────────────────────────────────────────

# Colorado — Arapahoe County (Aurora, Buckley SFB, Lumen/Comcast DCs)
add_restriction({
    "fips": "08005",
    "name": "Arapahoe County",
    "state": "Colorado",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Arapahoe County Aurora Data Center and Defense IT Hub",
    "description": "Arapahoe County (Aurora) hosts Buckley Space Force Base technology operations, Lumen/CenturyLink legacy data centers, and Comcast's regional infrastructure. Adjacent to Denver, Aurora offers lower land costs and competitive power rates. No local DC restrictions; Colorado EIAF incentives apply.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Aurora Economic Development", "url": "https://www.auroraeconomicdevelopment.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Pennsylvania — Philadelphia County (Comcast HQ, Penn Medicine, financial IT)
add_restriction({
    "fips": "42101",
    "name": "Philadelphia County",
    "state": "Pennsylvania",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Philadelphia County Major Data Center and Financial Technology Hub",
    "description": "Philadelphia hosts Comcast/NBCUniversal technology campus, Penn Medicine and Jefferson Health system IT, Independence Blue Cross data operations, and multiple colocation facilities. No local DC zoning restrictions; PIDC (Philadelphia Industrial Development Corporation) and PA DCED incentives available.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "PIDC — Philadelphia Technology", "url": "https://www.pidc-pa.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Illinois — Kane County (Aurora/Elgin, west Chicago suburb tech corridor)
add_restriction({
    "fips": "17089",
    "name": "Kane County",
    "state": "Illinois",
    "level": -1,
    "types": ["data_center"],
    "title": "Kane County West Chicago Suburban Technology Corridor",
    "description": "Kane County (Aurora/Elgin) is part of the west Chicago suburban technology corridor, adjacent to the DeKalb data center cluster. No local DC zoning restrictions; Illinois Enterprise Zones offer property tax abatement and state sales tax exemption for qualifying data center equipment per 35 ILCS 105/3-5(17).",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "IL DCEO — Data Center Investment", "url": "https://www.illinois.gov/sites/dceo/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Georgia — Clarke County (Athens, University of Georgia research computing)
add_restriction({
    "fips": "13059",
    "name": "Clarke County",
    "state": "Georgia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Clarke County Athens University Research and Healthcare IT Hub",
    "description": "Clarke County (Athens) hosts the University of Georgia's research computing cluster and Piedmont Athens Regional Medical Center data infrastructure. No local DC restrictions; Georgia's data center sales tax exemption (O.C.G.A. §48-8-3.2) and Job Tax Credit apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "UGA Research Computing", "url": "https://research.uga.edu/research-computing/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Jersey — Mercer County (Princeton, Siemens, NJ state capital)
add_restriction({
    "fips": "34021",
    "name": "Mercer County",
    "state": "New Jersey",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Mercer County Princeton Research and Government IT Hub",
    "description": "Mercer County hosts Princeton University's research computing infrastructure, NJ state government IT operations in Trenton, and Siemens Corporation's US headquarters computing. No local DC restrictions; NJ NJEDA incentives and data center sales tax exemption (N.J.S.A. 54:32B-8.57) apply.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Princeton Research Computing", "url": "https://researchcomputing.princeton.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Maine — Penobscot County (Bangor, Eastern Maine Medical, UMaine HPC)
add_restriction({
    "fips": "23019",
    "name": "Penobscot County",
    "state": "Maine",
    "level": -1,
    "types": ["data_center"],
    "title": "Penobscot County Bangor Healthcare and University IT Hub",
    "description": "Penobscot County (Bangor) hosts Eastern Maine Medical Center's health IT operations, University of Maine's high-performance computing center, and Cianbro Corporation technology operations. No local DC restrictions; Maine's BETE (Business Equipment Tax Exemption, 36 MRSA §694) exempts qualifying data center equipment from property tax.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "University of Maine Research Computing", "url": "https://umaine.edu/it/research-computing/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Mississippi — Rankin County (Brandon/Flowood, Jackson suburb tech corridor)
add_restriction({
    "fips": "28121",
    "name": "Rankin County",
    "state": "Mississippi",
    "level": -1,
    "types": ["data_center"],
    "title": "Rankin County Jackson Metro East Technology Corridor",
    "description": "Rankin County (Brandon/Flowood) is the fastest-growing suburban county in the Jackson metro area, hosting Entergy Mississippi operations technology and state government IT overspill. MS Data Center Sales Tax Exemption (§27-65-101) and no local DC restrictions support investment.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Rankin County Economic Development", "url": "https://www.rankincounty.org/government/department-directory/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# South Dakota — Lincoln County (Sioux Falls metro growth, Sanford/Avera)
add_restriction({
    "fips": "46083",
    "name": "Lincoln County",
    "state": "South Dakota",
    "level": -1,
    "types": ["data_center"],
    "title": "Lincoln County Sioux Falls Suburban Growth and Healthcare IT",
    "description": "Lincoln County is the fastest-growing county in South Dakota, located in the Sioux Falls metro. Hosts growing Sanford Health and Avera Health technology infrastructure expansion. SD's zero corporate income tax and no personal income tax environment apply; no local DC restrictions.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Sioux Falls Development Foundation", "url": "https://www.siouxfalls.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Arkansas — Sebastian County (Fort Smith, ArcBest/ABF Freight tech)
add_restriction({
    "fips": "05131",
    "name": "Sebastian County",
    "state": "Arkansas",
    "level": -1,
    "types": ["data_center"],
    "title": "Sebastian County Fort Smith Logistics Technology Hub",
    "description": "Sebastian County (Fort Smith) hosts ArcBest Corporation (ABF Freight) logistics technology operations and the University of Arkansas – Fort Smith (UAFS) computing programs. No local DC restrictions; AEDC incentives and Arkansas' competitive land/power costs support investment in the Arkansas River Valley corridor.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "AEDC — Fort Smith/Sebastian County", "url": "https://www.arkansasedc.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Oregon — Benton County (Corvallis, Oregon State University HPC, HP legacy)
add_restriction({
    "fips": "41003",
    "name": "Benton County",
    "state": "Oregon",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Benton County Corvallis University and Technology Research Hub",
    "description": "Benton County (Corvallis) hosts Oregon State University's high-performance computing cluster, legacy Hewlett-Packard/HP Inc. research facilities, and Samaritan Health Services IT. No local DC restrictions; Oregon's Enterprise Zone property tax exemption and low electricity rates (Pacific Power/PGE) support data center economics.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "OSU Research Computing", "url": "https://research.oregonstate.edu/research-computing"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Wisconsin — Washington County (Milwaukee suburb, Harley-Davidson, Generac)
add_restriction({
    "fips": "55131",
    "name": "Washington County",
    "state": "Wisconsin",
    "level": -1,
    "types": ["data_center"],
    "title": "Washington County Milwaukee Suburb Manufacturing Technology Hub",
    "description": "Washington County (West Bend/Menomonee Falls area) hosts manufacturing technology operations for Harley-Davidson and Generac Holdings. No local DC restrictions; Wisconsin's data center sales tax exemption (s.77.54(57)) and competitive electricity rates from We Energies support investment.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Washington County Economic Development", "url": "https://www.co.washington.wi.gov/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Indiana — St. Joseph County (South Bend, University of Notre Dame HPC)
add_restriction({
    "fips": "18141",
    "name": "St. Joseph County",
    "state": "Indiana",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "St. Joseph County South Bend University and Healthcare IT Hub",
    "description": "St. Joseph County (South Bend) hosts the University of Notre Dame's Center for Research Computing (CRC), Beacon Health System data operations, and a growing tech ecosystem anchored by innovation district investments. No local DC restrictions; Indiana's data center equipment use tax exemption (IC §6-2.5-5-57) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Notre Dame Center for Research Computing", "url": "https://crc.nd.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-co-003: Lumen Technologies Aurora Data Center
add_campus({
    "id": "ai-co-003",
    "name": "Lumen Technologies Aurora Data Center",
    "operator": "Lumen Technologies",
    "status": "operational",
    "county_fips": "08005",
    "notes": "Legacy CenturyLink/Lumen colocation and network hub serving the Denver metro; one of the largest carrier-neutral facilities in Arapahoe County.",
    "lon": -104.8319,
    "lat": 39.7294
})

# ai-pa-002: Comcast Technology Center Philadelphia
add_campus({
    "id": "ai-pa-002",
    "name": "Comcast Technology Center — Philadelphia",
    "operator": "Comcast Corporation",
    "status": "operational",
    "county_fips": "42101",
    "notes": "Comcast's global technology headquarters in Center City Philadelphia; houses major data infrastructure for NBCUniversal, Xfinity, and enterprise services.",
    "lon": -75.1652,
    "lat": 39.9526
})

# ai-il-005: Iron Mountain Chicago West (Kane County)
add_campus({
    "id": "ai-il-005",
    "name": "Iron Mountain Data Center — Chicago West (Aurora)",
    "operator": "Iron Mountain",
    "status": "operational",
    "county_fips": "17089",
    "notes": "Iron Mountain colocation facility in Aurora (Kane County) serving Chicago metro enterprise clients; part of the west suburban Chicago data center corridor.",
    "lon": -88.3201,
    "lat": 41.7606
})

# ai-ga-004: University of Georgia Research Computing (Clarke County)
add_campus({
    "id": "ai-ga-004",
    "name": "UGA Georgia Advanced Research Computing Center",
    "operator": "University of Georgia",
    "status": "operational",
    "county_fips": "13059",
    "notes": "UGA's GACRC provides HPC resources for genomics, climate research, and computational biology; houses Georgia Advanced Research Computing infrastructure.",
    "lon": -83.3777,
    "lat": 33.9519
})

# ai-in-002: Notre Dame Center for Research Computing
add_campus({
    "id": "ai-in-002",
    "name": "University of Notre Dame Center for Research Computing",
    "operator": "University of Notre Dame",
    "status": "operational",
    "county_fips": "18141",
    "notes": "Notre Dame CRC operates the Duda supercomputing cluster and AI/ML platforms supporting computational science, engineering, and social science research.",
    "lon": -86.2520,
    "lat": 41.7002
})

# ── Tax Incentives ─────────────────────────────────────────────────────────────

# Delaware — no state sales tax + Delaware Strategic Fund
add_incentive({
    "state": "DE",
    "program_name": "Delaware No-Sales-Tax Environment and Strategic Fund",
    "incentive_type": "Tax structure / discretionary grant",
    "min_investment_m": None,
    "notes": "Delaware has levied no general state sales tax since 1972, eliminating sales tax on data center equipment purchases. The Delaware Strategic Fund (29 Del.C. §5005B) provides discretionary grants and loans for qualifying capital investment projects. Combined with Delaware's favorable corporate law and low corporate income tax rate.",
    "fips_list": ["10003", "10001"]
})

# Montana — no state sales tax + new industry property tax abatement
add_incentive({
    "state": "MT",
    "program_name": "Montana No-Sales-Tax and New Industry Property Tax Abatement",
    "incentive_type": "Tax structure / property tax abatement",
    "min_investment_m": None,
    "notes": "Montana levies no general sales or use tax, removing a significant upfront cost for data center equipment. The New or Expanding Business Property Tax Abatement (MCA §15-24-1402) reduces property taxes by 50% for the first 5 years for qualifying new or expanding industry. Combined, these make Montana one of the most structurally favorable states for data center investment.",
    "fips_list": ["30031", "30111"]
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)
with open(TAX,  "w") as f: json.dump(tax,  f, indent=2)

print(f"\nSweep K complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +{added['incentives']} incentives, +0 state regs")
