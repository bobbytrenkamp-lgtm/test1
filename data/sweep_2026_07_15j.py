#!/usr/bin/env python3
"""Sweep J: 12 counties, 5 campuses, 2 incentives, 0 state regs
Targets: CA (San Diego), GA (Cobb), MA (Essex), NJ (Middlesex), TN (Rutherford),
WI (Outagamie), ND (Cass/Fargo), UT (Utah County/Silicon Slopes), NY (Erie/Buffalo),
MI (Ingham/Lansing), ID (Kootenai), RI (Newport/NUWC)
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

print("=== Sweep J ===")

# ── County Restrictions ────────────────────────────────────────────────────────

# California — San Diego County (Qualcomm, NAVWAR, major defense tech)
add_restriction({
    "fips": "06073",
    "name": "San Diego County",
    "state": "California",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "San Diego County Defense Tech and Semiconductor Hub",
    "description": "San Diego County hosts Qualcomm HQ, NAVWAR (Naval Information Warfare Systems Command), General Atomics, and a major defense/biotech IT cluster. Multiple AWS, Google, and colocation facilities serve the region. No local DC zoning restrictions; California Competes tax credit available for qualifying investments.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NAVWAR — San Diego Defense Tech", "url": "https://www.navwar.navy.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Georgia — Cobb County (Marietta, Lockheed Martin, WellStar)
add_restriction({
    "fips": "13067",
    "name": "Cobb County",
    "state": "Georgia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Cobb County Atlanta Metro Defense and Healthcare IT Hub",
    "description": "Cobb County (Marietta) hosts Lockheed Martin Aeronautics' southeast IT operations, WellStar Health System's data infrastructure, and Kennesaw State University research computing. Part of metro Atlanta's data center corridor; no local DC restrictions. Georgia's Job Tax Credit and data center sales tax exemption apply.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Cobb County Economic Development", "url": "https://www.cobbcounty.org/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Massachusetts — Essex County (Andover/Lawrence, Raytheon/RTX, EMC legacy)
add_restriction({
    "fips": "25009",
    "name": "Essex County",
    "state": "Massachusetts",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Essex County North Shore Defense and Technology Hub",
    "description": "Essex County hosts Raytheon/RTX technology operations in Andover, legacy EMC/Dell research facilities in Andover/Chelmsford border area, and MIT Lincoln Laboratory connectivity. No local DC restrictions; Massachusetts data center equipment exemption (Ch.64H §6(r)) applies. Significant defense-sector and enterprise IT infrastructure.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Raytheon Technologies — Andover MA", "url": "https://www.rtx.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Jersey — Middlesex County (J&J pharma IT, Rutgers, NJ tech corridor)
add_restriction({
    "fips": "34023",
    "name": "Middlesex County",
    "state": "New Jersey",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Middlesex County NJ Pharmaceutical IT and University Research Hub",
    "description": "Middlesex County hosts Johnson & Johnson's global IT operations, Rutgers University research computing, and major pharmaceutical/biotech data infrastructure. New Brunswick/Piscataway corridor is a key component of the NJ technology belt. No local DC restrictions; NJ Economic Development Authority incentives available.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Choose NJ — Technology Sector", "url": "https://www.choosenj.com/industries/technology/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Tennessee — Rutherford County (Murfreesboro, Amazon/Nissan tech, MTSU)
add_restriction({
    "fips": "47149",
    "name": "Rutherford County",
    "state": "Tennessee",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Rutherford County Middle Tennessee Technology and Logistics Hub",
    "description": "Rutherford County (Murfreesboro) is one of Tennessee's fastest-growing counties, hosting Amazon fulfillment technology operations, Nissan North America IT center, and Middle Tennessee State University's data systems. No local DC restrictions; Tennessee's no income tax and data center equipment exemption (TCA §67-6-346) apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "TN ECD — Rutherford County", "url": "https://www.tn.gov/ecd/regions/middle-tennessee.html"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Wisconsin — Outagamie County (Appleton, Cuna Mutual, Fox Cities tech)
add_restriction({
    "fips": "55087",
    "name": "Outagamie County",
    "state": "Wisconsin",
    "level": -1,
    "types": ["data_center"],
    "title": "Outagamie County Fox Cities Financial Technology Hub",
    "description": "Outagamie County (Appleton) is the center of Wisconsin's Fox Cities region, hosting CUNA Mutual Group's data operations, ThedaCare health system IT, and the Fox Valley Technical College cyber/IT programs. No local DC restrictions; Wisconsin's data center sales tax exemption (s.77.54(57)) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Outagamie County Economic Development", "url": "https://www.outagamie.org/government/departments-f-o/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# North Dakota — Cass County (Fargo, NDSU, Microsoft/AT&T, Great Plains)
add_restriction({
    "fips": "38017",
    "name": "Cass County",
    "state": "North Dakota",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Cass County Fargo Technology and University Computing Hub",
    "description": "Cass County (Fargo) is North Dakota's largest metro and hosts NDSU research computing, Sanford Health IT operations, Microsoft Azure edge infrastructure, and major agricultural data analytics operations. No local DC restrictions; ND's New/Expanding Business Income Tax Exemption (N.D.C.C. §57-38.5) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Greater Fargo Moorhead EDC — Technology", "url": "https://www.gfmedc.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Utah — Utah County (Provo/Silicon Slopes, Adobe, BYU, major tech hub)
add_restriction({
    "fips": "49049",
    "name": "Utah County",
    "state": "Utah",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Utah County Silicon Slopes Technology Hub",
    "description": "Utah County (Provo/Orem) is the heart of Utah's 'Silicon Slopes,' hosting Adobe Systems, Qualtrics (SAP), Ancestry.com data operations, Vivint Smart Home, and Brigham Young University research computing. One of the fastest-growing tech corridors in the US. No local DC restrictions; Utah's EDTIF data center incentive applies.",
    "effective_date": "2018-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Silicon Slopes — Utah Tech Industry", "url": "https://siliconslopes.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New York — Erie County (Buffalo, financial services IT, University at Buffalo)
add_restriction({
    "fips": "36029",
    "name": "Erie County",
    "state": "New York",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Erie County Buffalo Emerging Technology Hub",
    "description": "Erie County (Buffalo) hosts M&T Bank's financial technology operations, KeyBank's regional data infrastructure, University at Buffalo research computing, and a growing tech ecosystem anchored by the Buffalo-Niagara Medical Campus. No local DC restrictions; NYS Empire State Development REAP and data center incentives apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Buffalo Niagara Partnership — Technology", "url": "https://www.buffaloniagara.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Michigan — Ingham County (Lansing, Michigan state government IT, MSU)
add_restriction({
    "fips": "26065",
    "name": "Ingham County",
    "state": "Michigan",
    "level": -1,
    "types": ["data_center"],
    "title": "Ingham County Michigan State Capital and University IT Hub",
    "description": "Ingham County (Lansing/East Lansing) hosts Michigan's Department of Technology, Management and Budget (DTMB) state data center and Michigan State University's High Performance Computing Center (HPCC). No local DC restrictions; Michigan's MEGA and other MEDC incentives available for qualifying investments.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Michigan DTMB — State Data Center", "url": "https://www.michigan.gov/dtmb"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Idaho — Kootenai County (Coeur d'Alene, northern Idaho tech hub)
add_restriction({
    "fips": "16055",
    "name": "Kootenai County",
    "state": "Idaho",
    "level": -1,
    "types": ["data_center"],
    "title": "Kootenai County North Idaho Technology Hub",
    "description": "Kootenai County (Coeur d'Alene) is northern Idaho's primary tech hub, hosting Coeur d'Alene Press, Hagadone Hospitality technology operations, and growing remote-work-driven tech migration. Low land costs, Idaho Power's low electricity rates, and no local DC restrictions support data center development.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Kootenai County — Business Development", "url": "https://www.kcgov.us/economy"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Rhode Island — Newport County (NUWC defense IT, Navy training)
add_restriction({
    "fips": "44005",
    "name": "Newport County",
    "state": "Rhode Island",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Newport County Naval Undersea Warfare Center IT Hub",
    "description": "Newport County hosts the Naval Undersea Warfare Center (NUWC) Division Newport, the US Navy's corporate laboratory for undersea warfare, and Naval Station Newport. Significant defense-sector data and simulation infrastructure. No local DC restrictions; Rhode Island's Rebuild RI Tax Credit (§44-48.3) applies to qualifying investments.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NUWC Division Newport", "url": "https://www.navsea.navy.mil/Home/Warfare-Centers/NUWC-Newport/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ca-005: Qualcomm Data Center San Diego
add_campus({
    "id": "ai-ca-005",
    "name": "Qualcomm Data Center — San Diego",
    "operator": "Qualcomm Technologies Inc.",
    "status": "operational",
    "county_fips": "06073",
    "notes": "On-premises data center supporting Qualcomm's semiconductor R&D, 5G/AI chip testing, and enterprise compute operations.",
    "lon": -117.1611,
    "lat": 32.7157
})

# ai-tn-006: Nissan North America IT Center Rutherford County
add_campus({
    "id": "ai-tn-006",
    "name": "Nissan North America IT Operations Center",
    "operator": "Nissan North America",
    "status": "operational",
    "county_fips": "47149",
    "notes": "Nissan's North American IT hub in Smyrna/Rutherford County supporting manufacturing systems, supply chain AI, and connected vehicle data.",
    "lon": -86.5186,
    "lat": 35.9828
})

# ai-ut-003: Adobe Utah County / Silicon Slopes DC
add_campus({
    "id": "ai-ut-003",
    "name": "Adobe Systems Utah Data Center — Silicon Slopes",
    "operator": "Adobe Systems",
    "status": "operational",
    "county_fips": "49049",
    "notes": "Adobe's Utah data center supporting Creative Cloud, Document Cloud, and Experience Cloud AI/ML workloads in the Silicon Slopes corridor.",
    "lon": -111.6585,
    "lat": 40.2338
})

# ai-nd-003: NDSU Research Computing Center (Fargo)
add_campus({
    "id": "ai-nd-003",
    "name": "NDSU High Performance Computing Center",
    "operator": "North Dakota State University",
    "status": "operational",
    "county_fips": "38017",
    "notes": "NDSU's HPC facility supporting agricultural data analytics, materials science research, and Great Plains climate modeling.",
    "lon": -96.7898,
    "lat": 46.8772
})

# ai-ny-001: M&T Bank Technology Center Buffalo
add_campus({
    "id": "ai-ny-001",
    "name": "M&T Bank Technology Operations Center",
    "operator": "M&T Bank Corporation",
    "status": "operational",
    "county_fips": "36029",
    "notes": "M&T Bank's primary technology operations hub supporting regional banking IT, data analytics, and financial services processing for the Buffalo-Niagara region.",
    "lon": -78.8784,
    "lat": 42.8864
})

# ── Tax Incentives ─────────────────────────────────────────────────────────────

# New Jersey — NJ Economic Redevelopment and Growth (ERG) for tech infrastructure
add_incentive({
    "state": "NJ",
    "program_name": "New Jersey Data Center Sales Tax Exemption",
    "incentive_type": "Sales tax exemption",
    "min_investment_m": 25.0,
    "notes": "New Jersey provides a sales and use tax exemption on computer equipment and software purchased for use in a data center with a minimum investment of $25M (N.J.S.A. 54:32B-8.57). The New Jersey Economic Development Authority (NJEDA) administers additional discretionary incentives for large-scale data center projects.",
    "fips_list": ["34013", "34039", "34023"]
})

# Tennessee — Data center equipment sales tax exemption
add_incentive({
    "state": "TN",
    "program_name": "Tennessee Data Center Sales Tax Exemption",
    "incentive_type": "Sales tax exemption",
    "min_investment_m": 100.0,
    "notes": "Tennessee Code Annotated §67-6-346 exempts computer equipment, software, and energy used by qualifying data centers from sales and use tax. Minimum investment of $100M for full exemption; Tennessee has no state income tax, further reducing total cost of operations.",
    "fips_list": ["47001", "47037", "47065", "47031", "47157", "47125", "47165", "47093", "47149"]
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)
with open(TAX,  "w") as f: json.dump(tax,  f, indent=2)

print(f"\nSweep J complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +{added['incentives']} incentives, +0 state regs")
