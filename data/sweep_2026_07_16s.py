#!/usr/bin/env python3
"""Sweep S: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: MS Hancock (Stennis Space Center), VA Goochland (AWS West Creek DCs),
SC Spartanburg (BMW/SYNNEX), MO Cass (Lee's Summit/Oracle Health),
CA Kern (Bakersfield/wind energy), CA Santa Barbara (Vandenberg SFB/UCSB),
CA Ventura (Point Mugu/Amgen), HI Kauai (PMRF), OK Comanche (Fort Sill),
OR Marion (Salem/OR state IT), WA Whatcom (Bellingham/Intel/border),
WV Cabell (Huntington/Marshall University)
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

print("=== Sweep S ===")

# Mississippi — Hancock County (Bay St. Louis, NASA Stennis Space Center)
add_restriction({
    "fips": "28045",
    "name": "Hancock County",
    "state": "Mississippi",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Hancock County NASA Stennis Space Center and Rocket Propulsion Technology Hub",
    "description": "Hancock County (Bay St. Louis) hosts NASA Stennis Space Center — NASA's primary rocket propulsion test facility and the largest NASA field installation in the Southeast — where RS-25 Space Launch System engines are tested. Stennis also houses the National Data Buoy Center (NDBC) and multiple tenant agencies including NOAA, the Navy, and NGA. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NASA Stennis Space Center", "url": "https://www.nasa.gov/centers/stennis/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Virginia — Goochland County (West Creek, Amazon/AWS data centers)
add_restriction({
    "fips": "51075",
    "name": "Goochland County",
    "state": "Virginia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Goochland County West Creek Amazon AWS Data Center Campus",
    "description": "Goochland County's West Creek Business Park has become one of the most significant Amazon Web Services data center expansion corridors in the eastern US, with AWS investing billions in hyperscale data centers along the West Creek Parkway. The Virginia data center sales tax exemption (§58.1-609.3) and competitive Dominion Energy rates make Goochland County a prime alternative to the saturated Northern Virginia market. No local DC restrictions.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Goochland County Economic Development", "url": "https://www.goochlandva.us/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# South Carolina — Spartanburg County (BMW, SYNNEX/Concentrix, Michelin)
add_restriction({
    "fips": "45083",
    "name": "Spartanburg County",
    "state": "South Carolina",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Spartanburg County BMW Manufacturing and Advanced Manufacturing Technology Hub",
    "description": "Spartanburg County hosts BMW Manufacturing's only US assembly plant — BMW's largest plant globally — alongside SYNNEX (Concentrix) IT services headquarters, Michelin North America HQ, and Milliken & Company's advanced materials R&D. The concentration of advanced manufacturing AI, supply chain data systems, and enterprise IT makes Spartanburg a top-tier South Carolina technology hub. No local DC restrictions; SC data center property tax abatement applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "BMW Manufacturing — Spartanburg South Carolina", "url": "https://www.bmwusfactory.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Missouri — Cass County (Lee's Summit, Oracle Health/Cerner global HQ)
add_restriction({
    "fips": "29037",
    "name": "Cass County",
    "state": "Missouri",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Cass County Lee's Summit Oracle Health Cerner Global Headquarters",
    "description": "Cass County (Lee's Summit) hosts Oracle Health's (formerly Cerner) sprawling global headquarters campus — one of the world's largest health IT companies, processing clinical data for hundreds of hospitals worldwide. Oracle Health's Innovations Campus drives significant data center and AI investment in the Kansas City metro. No local DC restrictions; Missouri's data center tax exemption (RSMo §144.810) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Oracle Health (Cerner) — Lee's Summit Missouri", "url": "https://www.oracle.com/health/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# California — Kern County (Bakersfield, oil/gas, Tehachapi wind energy)
add_restriction({
    "fips": "06029",
    "name": "Kern County",
    "state": "California",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Kern County Bakersfield Oil, Gas, and Renewable Energy Technology Hub",
    "description": "Kern County (Bakersfield) produces more oil and gas than any other California county and hosts the Tehachapi Wind Resource Area — one of the earliest and largest wind energy concentrations in the US. Chevron's San Joaquin Valley Operations and California Resources Corporation (CRC) drive extensive energy data and SCADA infrastructure. California Aqueduct operational data and CDFA agricultural monitoring add to the county's data footprint. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Kern County Economic Development Corporation", "url": "https://www.kernedc.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# California — Santa Barbara County (Vandenberg SFB, UCSB, space launch data)
add_restriction({
    "fips": "06083",
    "name": "Santa Barbara County",
    "state": "California",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Santa Barbara County Vandenberg Space Force Base and UCSB Technology Hub",
    "description": "Santa Barbara County hosts Vandenberg Space Force Base — the primary US launch site for polar-orbit satellites — operated by Space Launch Delta 30 with extensive launch data telemetry, satellite tracking, and mission control infrastructure. UC Santa Barbara (UCSB) contributes world-class research computing in physics, materials science, and marine science. SpaceX regularly launches Falcon 9 and Starship missions from Vandenberg. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Vandenberg Space Force Base — Space Launch Delta 30", "url": "https://www.vandenberg.spaceforce.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# California — Ventura County (Point Mugu, Amgen HQ, Naval Air Warfare Center)
add_restriction({
    "fips": "06111",
    "name": "Ventura County",
    "state": "California",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Ventura County Point Mugu Naval Air Warfare Center and Amgen Technology Hub",
    "description": "Ventura County (Oxnard/Thousand Oaks) hosts Naval Base Ventura County with the Naval Air Warfare Center Weapons Division at Point Mugu — the Navy's primary air and missile weapons test range — and Amgen's global headquarters in Thousand Oaks, one of the world's largest biotechnology companies with substantial drug discovery AI and genomics computing. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Amgen Global Headquarters — Thousand Oaks", "url": "https://www.amgen.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Hawaii — Kauai County (Pacific Missile Range Facility, PMRF)
add_restriction({
    "fips": "15007",
    "name": "Kauai County",
    "state": "Hawaii",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Kauai County Pacific Missile Range Facility and Space Defense Technology Hub",
    "description": "Kauai County hosts the Pacific Missile Range Facility (PMRF) at Barking Sands — the world's largest instrumented, multi-dimensional testing and training missile range — operated by the Navy with extensive radar, telemetry, and tracking data infrastructure. The Kokee Research Station and Space Surveillance Telescope (SST) add space domain awareness data capabilities. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Pacific Missile Range Facility (PMRF) — US Navy", "url": "https://www.pmrf.navy.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Oklahoma — Comanche County (Lawton, Fort Sill, Army Fires Center)
add_restriction({
    "fips": "40031",
    "name": "Comanche County",
    "state": "Oklahoma",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Comanche County Fort Sill Army Fires Center of Excellence Technology Hub",
    "description": "Comanche County (Lawton) hosts Fort Sill, home of the US Army Fires Center of Excellence — responsible for field artillery and air defense doctrine, training, and mission command data systems. Fort Sill's Patriot missile battery training and Joint Air Defense Operations Center (JADOC) generate significant military data infrastructure. No local DC restrictions; Oklahoma's data center sales tax exemption (68 O.S. §1354) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Fort Sill — Army Fires Center of Excellence", "url": "https://sill.army.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Oregon — Marion County (Salem, Oregon state government IT)
add_restriction({
    "fips": "41047",
    "name": "Marion County",
    "state": "Oregon",
    "level": -1,
    "types": ["data_center"],
    "title": "Marion County Salem Oregon State Government Technology Hub",
    "description": "Marion County (Salem) is Oregon's state capital, hosting the Oregon Department of Administrative Services (DAS) Enterprise Technology Services data center operations, Salem Health (hospital system) IT, and Chemeketa Community College technology programs. Oregon's no-sales-tax environment and data center property tax exemption (ORS §307.175) support state and commercial data infrastructure investment. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Oregon DAS Enterprise Technology Services", "url": "https://www.oregon.gov/das/ets/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Washington — Whatcom County (Bellingham, Intel/Inphi, refineries, Canadian border)
add_restriction({
    "fips": "53073",
    "name": "Whatcom County",
    "state": "Washington",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Whatcom County Bellingham Refinery Technology and Cross-Border Corridor Hub",
    "description": "Whatcom County (Bellingham) hosts BP Cherry Point and Shell Puget Sound refineries — two of the largest oil refineries in the Pacific Northwest — driving substantial SCADA and process data infrastructure along the I-5 Canadian border corridor. Western Washington University and the growing Bellingham technology sector contribute to the regional tech ecosystem. No local DC restrictions; Washington's no-income-tax environment applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Whatcom County Economic Development", "url": "https://www.whatcomcounty.us/1280/Economic-Development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# West Virginia — Cabell County (Huntington, Marshall University, Appalachian tech)
add_restriction({
    "fips": "54011",
    "name": "Cabell County",
    "state": "West Virginia",
    "level": -1,
    "types": ["data_center"],
    "title": "Cabell County Huntington Marshall University and Appalachian Regional Technology Hub",
    "description": "Cabell County (Huntington) hosts Marshall University with its research computing and health IT programs, Cabell Huntington Hospital's clinical data infrastructure (part of Mountain Health Network), and is a major commercial center for the Tri-State area (WV/KY/OH). Marshall's new Robert C. Byrd Institute for Advanced Flexible Manufacturing supports technology talent development. No local DC restrictions; WV EDGE Act applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Marshall University — Research IT", "url": "https://www.marshall.edu/it/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ms-004: NASA Stennis Space Center (Hancock County)
add_campus({
    "id": "ai-ms-004",
    "name": "NASA Stennis Space Center — Propulsion Test and Data Operations",
    "operator": "NASA / National Data Buoy Center (NOAA)",
    "status": "operational",
    "county_fips": "28045",
    "notes": "Stennis hosts RS-25 SLS engine test stands, National Data Buoy Center oceanographic data operations, and multiple tenant agency computing (NGA, Navy, EPA); largest NASA field installation in the Southeast by land area.",
    "lon": -89.5994,
    "lat": 30.3636
})

# ai-va-008: Amazon Web Services West Creek (Goochland County)
add_campus({
    "id": "ai-va-008",
    "name": "Amazon Web Services West Creek Data Center Campus — Goochland",
    "operator": "Amazon Web Services",
    "status": "operational",
    "county_fips": "51075",
    "notes": "AWS's West Creek corridor in Goochland County represents one of the largest hyperscale data center investments in the Richmond metro area; supports us-east-1 region capacity expansion beyond Northern Virginia's constrained market.",
    "lon": -77.7012,
    "lat": 37.6918
})

# ai-hi-004: Pacific Missile Range Facility PMRF (Kauai County)
add_campus({
    "id": "ai-hi-004",
    "name": "Pacific Missile Range Facility (PMRF) — Barking Sands",
    "operator": "US Navy / Commander, Pacific Fleet",
    "status": "operational",
    "county_fips": "15007",
    "notes": "PMRF operates the world's largest instrumented, multi-environment missile test range with radar, tracking, and telemetry systems for missile defense, anti-submarine warfare, and undersea warfare testing in the Pacific; hosts MDA and MDA Aegis BMD test data systems.",
    "lon": -159.7649,
    "lat": 22.0221
})

# ai-ok-005: Fort Sill Fires Center / JADOC (Comanche County)
add_campus({
    "id": "ai-ok-005",
    "name": "Fort Sill Army Fires Center of Excellence and JADOC — Lawton",
    "operator": "US Army Fires Center of Excellence",
    "status": "operational",
    "county_fips": "40031",
    "notes": "Fort Sill's Fires Center of Excellence manages joint air defense and field artillery mission command systems, Patriot battery C2, and the Joint Air Defense Operations Center (JADOC) data infrastructure supporting Army IAMD operations.",
    "lon": -98.4045,
    "lat": 34.6427
})

# ai-ca-008: Vandenberg SFB Space Launch Delta 30 (Santa Barbara County)
add_campus({
    "id": "ai-ca-008",
    "name": "Vandenberg Space Force Base — Space Launch Delta 30 Mission Control",
    "operator": "US Space Force / Space Launch Delta 30",
    "status": "operational",
    "county_fips": "06083",
    "notes": "Vandenberg SFB's SLD-30 provides launch telemetry, satellite tracking (FPS-16 radar, telemetry stations), and mission control data for DoD, NASA, and commercial polar-orbit launches; SpaceX Falcon 9 and Falcon Heavy operations co-located.",
    "lon": -120.5665,
    "lat": 34.7420
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep S complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
