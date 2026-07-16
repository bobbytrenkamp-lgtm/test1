#!/usr/bin/env python3
"""Sweep U: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: CA Placer (Roseville/HP-AMD heritage), OR Deschutes (Bend tech hub),
OR Lane (Eugene/UO), IA Story (Ames/Iowa State HPC), IN Vanderburgh (Evansville/Toyota),
MI Saginaw (Saginaw/GM-Nexteer), FL Pasco (Wesley Chapel/Tampa north),
MD St. Mary's (NAS Patuxent River/NAWCAD), NH Merrimack (Concord/NH state IT),
WA Yakima (Yakima/ag data), FL Marion (Ocala/healthcare), IN Clark (Jeffersonville/Louisville metro)
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

print("=== Sweep U ===")

# California — Placer County (Roseville, HP/AMD legacy, Sacramento metro DC)
add_restriction({
    "fips": "06061",
    "name": "Placer County",
    "state": "California",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Placer County Roseville Technology and Sacramento Metro Data Center Hub",
    "description": "Placer County (Roseville/Rocklin) is home to the Hewlett Packard Enterprise (HPE) Roseville campus — one of HP's largest manufacturing and R&D sites — and has attracted data center investment from operators serving the Sacramento metro area. Sierra College and William Jessup University support a growing technology workforce. No local DC restrictions; California Competes tax credit available.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Hewlett Packard Enterprise — Roseville California", "url": "https://www.hpe.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Oregon — Deschutes County (Bend, fast-growing tech hub, data centers)
add_restriction({
    "fips": "41017",
    "name": "Deschutes County",
    "state": "Oregon",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Deschutes County Bend Oregon High Desert Technology and Data Center Hub",
    "description": "Deschutes County (Bend) has emerged as one of Oregon's fastest-growing technology hubs, attracting technology workers and data center operators to its high-desert location with 300 days of sunshine, PacifiCorp power, and a strong outdoor recreation quality of life. Jeld-Wen Windows' manufacturing IT and Deschutes Brewery's production technology anchor the local enterprise data market. No local DC restrictions; Oregon data center property tax exemption (ORS §307.175) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Economic Development for Central Oregon (EDCO)", "url": "https://www.edcoinfo.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Oregon — Lane County (Eugene, University of Oregon, EWEB green power)
add_restriction({
    "fips": "41039",
    "name": "Lane County",
    "state": "Oregon",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Lane County Eugene University of Oregon and EWEB Green Power Technology Hub",
    "description": "Lane County (Eugene/Springfield) hosts the University of Oregon (UO) research computing infrastructure and Eugene Water & Electric Board (EWEB) — one of the Pacific Northwest's most renewably-powered municipal utilities. UO's computational biology and data science programs, combined with PeaceHealth health system IT, anchor the Lane County data market. No local DC restrictions; Oregon's no-sales-tax and data center property tax exemption apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "University of Oregon Research Computing", "url": "https://researchcomputing.uoregon.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Iowa — Story County (Ames, Iowa State University, ISU Research Park)
add_restriction({
    "fips": "19169",
    "name": "Story County",
    "state": "Iowa",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Story County Ames Iowa State University Research Computing and Ag-Tech Hub",
    "description": "Story County (Ames) hosts Iowa State University (ISU) — home of one of the top agricultural engineering research programs in the world — with the ISU Research Park housing Corteva Agriscience, Pioneer/DuPont, and Plex Systems technology operations. ISU's CyEnce research computing cluster and the USDA National Animal Disease Center drive significant agricultural and biological data infrastructure. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Iowa State University Research Park", "url": "https://www.isupark.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Indiana — Vanderburgh County (Evansville, Toyota, Alcoa, pharmaceutical)
add_restriction({
    "fips": "18163",
    "name": "Vanderburgh County",
    "state": "Indiana",
    "level": -1,
    "types": ["data_center"],
    "title": "Vanderburgh County Evansville Manufacturing and Healthcare Technology Hub",
    "description": "Vanderburgh County (Evansville) is the commercial center of the Indiana-Illinois-Kentucky tri-state region, hosting Toyota's Sienna/Highlander manufacturing plant, Alcoa's fabrication operations, Deaconess Health System's hospital IT, and pharmaceutical manufacturers Mead Johnson Nutrition (Reckitt). No local DC restrictions; Indiana's EDGE tax credit applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Southwest Indiana Regional Development Authority", "url": "https://swirda.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Michigan — Saginaw County (Saginaw, General Motors, Nexteer Automotive)
add_restriction({
    "fips": "26145",
    "name": "Saginaw County",
    "state": "Michigan",
    "level": -1,
    "types": ["data_center"],
    "title": "Saginaw County General Motors and Automotive Technology Hub",
    "description": "Saginaw County hosts General Motors' Saginaw Metal Casting Operations and Nexteer Automotive's global headquarters — the world's largest dedicated steering and driveline manufacturer — with extensive manufacturing AI, CAD/CAM, and vehicle dynamics data systems. Covenant HealthCare's health IT and Delta College's technology programs round out the market. No local DC restrictions; Michigan's data center sales and use tax exemption (PA 328) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Nexteer Automotive Global Headquarters — Saginaw", "url": "https://www.nexteer.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Pasco County (Wesley Chapel, Tampa north metro, fast growing)
add_restriction({
    "fips": "12101",
    "name": "Pasco County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center"],
    "title": "Pasco County Wesley Chapel Tampa North Metro Data Center Expansion Hub",
    "description": "Pasco County (Wesley Chapel/New Port Richey) is one of Florida's fastest-growing counties, positioned in the Tampa metro north expansion corridor where data center operators seek lower land costs and competitive Duke Energy Florida rates while maintaining Tampa fiber access. Raymond James Financial's back-office technology operations and Connextions' healthcare IT anchor enterprise demand. No local DC restrictions; Florida's data center equipment exemption (§212.08) applies.",
    "effective_date": "2022-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Pasco Economic Development Council", "url": "https://www.pascoedc.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Maryland — St. Mary's County (Lexington Park, NAS Patuxent River, NAWCAD)
add_restriction({
    "fips": "24037",
    "name": "St. Mary's County",
    "state": "Maryland",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "St. Mary's County NAS Patuxent River Naval Air Warfare Center Technology Hub",
    "description": "St. Mary's County (Lexington Park) hosts Naval Air Station Patuxent River, home of the Naval Air Warfare Center Aircraft Division (NAWCAD) — the Navy's premier naval aviation research, test, and evaluation facility. Test Pilot School, strike fighter and helicopter test squadrons, and the Air Force Test Center liaison generate massive flight test data and avionics systems infrastructure. No local DC restrictions; Maryland's enterprise zone and cybersecurity tax credits apply.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NAS Patuxent River — Naval Air Warfare Center Aircraft Division", "url": "https://www.navair.navy.mil/nawcad"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Hampshire — Merrimack County (Concord, NH state government IT, BAE Systems)
add_restriction({
    "fips": "33013",
    "name": "Merrimack County",
    "state": "New Hampshire",
    "level": -1,
    "types": ["data_center"],
    "title": "Merrimack County Concord New Hampshire State Government Technology Hub",
    "description": "Merrimack County (Concord) is New Hampshire's state capital, hosting the NH Bureau of Information Technology Management (BITM) state data center and BAE Systems' electronic systems manufacturing in Merrimack. New Hampshire's no-income-tax and no-sales-tax environment makes Merrimack County attractive for enterprise technology investment. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NH Bureau of Information Technology Management (BITM)", "url": "https://www.nh.gov/doit/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Washington — Yakima County (Yakima, agricultural technology, tree fruit data)
add_restriction({
    "fips": "53077",
    "name": "Yakima County",
    "state": "Washington",
    "level": -1,
    "types": ["data_center"],
    "title": "Yakima County Washington Tree Fruit Agricultural Technology Hub",
    "description": "Yakima County is the center of Washington's $4B tree fruit industry, hosting extensive agricultural precision farming technology, irrigation SCADA systems, cold storage and logistics data infrastructure for Stemilt Growers, Dovex, and major fruit cooperatives. Yakima Valley College technology programs support agricultural data workforce development. No local DC restrictions; Washington's no-income-tax environment applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Yakima Valley Visitors & Convention Bureau — Agricultural Technology", "url": "https://www.visityakima.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Florida — Marion County (Ocala, Munroe Regional Medical, logistics)
add_restriction({
    "fips": "12083",
    "name": "Marion County",
    "state": "Florida",
    "level": -1,
    "types": ["data_center"],
    "title": "Marion County Ocala Healthcare and Logistics Technology Hub",
    "description": "Marion County (Ocala) hosts Munroe Regional Medical Center's health IT, AdventHealth Ocala, and a growing logistics and distribution technology corridor along I-75 serving the equine industry's farm management data systems. Lockheed Martin IT services and GEICO insurance technology operations provide enterprise data anchor tenants. No local DC restrictions; Florida's data center equipment exemption (§212.08) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Ocala Metro Chamber and Economic Partnership", "url": "https://www.ocalacep.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Indiana — Clark County (Jeffersonville, Louisville KY metro, Amazon Air Hub)
add_restriction({
    "fips": "18019",
    "name": "Clark County",
    "state": "Indiana",
    "level": -1,
    "types": ["data_center"],
    "title": "Clark County Jeffersonville Louisville Metro Technology and Logistics Hub",
    "description": "Clark County (Jeffersonville/Clarksville) sits directly across the Ohio River from Louisville, KY, hosting Amazon's robotics fulfillment operations, Stonecipher Building Group tech offices, and a growing data infrastructure corridor benefiting from Louisville metro fiber access with Indiana's lower commercial property tax rates. No local DC restrictions; Indiana's EDGE tax credit applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "One Southern Indiana — Economic Development", "url": "https://www.1si.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ca-009: HPE Roseville Campus (Placer County)
add_campus({
    "id": "ai-ca-009",
    "name": "Hewlett Packard Enterprise (HPE) Roseville Manufacturing and R&D Campus",
    "operator": "Hewlett Packard Enterprise",
    "status": "operational",
    "county_fips": "06061",
    "notes": "HPE's Roseville campus is one of the company's largest US manufacturing facilities, producing server hardware, storage systems, and networking equipment; houses R&D for HPE's Supercomputing and Mission Critical Systems division.",
    "lon": -121.2638,
    "lat": 38.7521
})

# ai-or-005: University of Oregon Research Computing (Lane County)
add_campus({
    "id": "ai-or-005",
    "name": "University of Oregon Research Computing and Talapus HPC — Eugene",
    "operator": "University of Oregon Research Computing",
    "status": "operational",
    "county_fips": "41039",
    "notes": "UO operates Talapus HPC and research computing supporting genomics, neuroscience, earth sciences, and humanities digital research; connected to Pacific Research Platform (PRP) and Internet2 networks.",
    "lon": -123.0789,
    "lat": 44.0460
})

# ai-ia-004: Iowa State University CyEnce / ISU Research Park (Story County)
add_campus({
    "id": "ai-ia-004",
    "name": "Iowa State University CyEnce Research Computing and ISU Research Park — Ames",
    "operator": "Iowa State University / ISU Research Park",
    "status": "operational",
    "county_fips": "19169",
    "notes": "ISU operates CyEnce and Nova HPC clusters supporting agricultural genomics, computational fluid dynamics, and materials science; ISU Research Park co-locates Corteva Agriscience and USDA NADC computational biology with university resources.",
    "lon": -93.6502,
    "lat": 42.0308
})

# ai-md-003: NAS Patuxent River NAWCAD (St. Mary's County)
add_campus({
    "id": "ai-md-003",
    "name": "NAS Patuxent River Naval Air Warfare Center Aircraft Division (NAWCAD)",
    "operator": "US Navy / Naval Air Systems Command (NAVAIR)",
    "status": "operational",
    "county_fips": "24037",
    "notes": "NAWCAD operates flight test data acquisition systems, aircraft simulation labs, and avionics test data infrastructure for all Navy and Marine Corps aircraft programs; Test Pilot School telemetry and SH-60, F/A-18, and F-35C test data systems co-located.",
    "lon": -76.4190,
    "lat": 38.2854
})

# ai-nh-001: NH Bureau of Information Technology Management (Merrimack County)
add_campus({
    "id": "ai-nh-001",
    "name": "New Hampshire Bureau of Information Technology Management (BITM) — Concord",
    "operator": "New Hampshire Department of Information Technology",
    "status": "operational",
    "county_fips": "33013",
    "notes": "NH BITM manages the state government data center in Concord providing shared IT services for state agencies, including 911 communications, DMV, and health and human services data systems for New Hampshire's no-income-tax state economy.",
    "lon": -71.5376,
    "lat": 43.2081
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep U complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
