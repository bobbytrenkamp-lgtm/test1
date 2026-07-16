#!/usr/bin/env python3
"""Sweep R: 12 counties, 5 campuses, 0 incentives, 0 state regs
Targets: UT Weber (Ogden/Hill AFB), TX Brazoria (Dow Chemical/Freeport),
TX Galveston (NASA JSC area/UTMB), NC Johnston (Raleigh south DC),
AZ Coconino (Flagstaff/NAU), KS Riley (Fort Riley/K-State),
GA Houston (Warner Robins/Robins AFB), VA Albemarle (UVA/Charlottesville),
KY McCracken (Paducah nuclear/energy), DE Sussex (complete DE coverage),
AL Morgan (Decatur/Huntsville metro), AZ Mohave (Kingman data centers)
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

print("=== Sweep R ===")

# Utah — Weber County (Ogden, Hill AFB Air Logistics Center)
add_restriction({
    "fips": "49057",
    "name": "Weber County",
    "state": "Utah",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Weber County Ogden Hill AFB Air Force Logistics and Technology Hub",
    "description": "Weber County (Ogden) hosts Hill Air Force Base, home of Ogden Air Logistics Complex (OO-ALC) — one of three Air Force Air Logistics Centers responsible for maintaining and overhauling aircraft, missiles, and software systems. Hill AFB's Software Engineering directorate and the 388th/419th Fighter Wings' F-35 maintenance operations represent a major Air Force data and AI investment. No local DC restrictions; Utah's data center tax incentive (UCA §59-12-104(96)) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Hill Air Force Base — Ogden Air Logistics Complex", "url": "https://www.hill.af.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Texas — Brazoria County (Freeport, Dow Chemical, BASF, petrochemical hub)
add_restriction({
    "fips": "48039",
    "name": "Brazoria County",
    "state": "Texas",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "Brazoria County Freeport Dow Chemical and Petrochemical Technology Hub",
    "description": "Brazoria County (Freeport/Lake Jackson) hosts Dow Chemical's Texas Operations — the largest integrated chemical complex in the western hemisphere — along with BASF, Olin, and OxyChem facilities. Process automation, SCADA, and environmental compliance data infrastructure serves one of the densest petrochemical industrial concentrations in North America. No local DC restrictions; Texas no-corporate-income-tax environment applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Dow Chemical Texas Operations — Freeport", "url": "https://www.dow.com/en-us/site/texas-operations.html"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Texas — Galveston County (Clear Lake, NASA Johnson Space Center adjacent, UTMB)
add_restriction({
    "fips": "48167",
    "name": "Galveston County",
    "state": "Texas",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Galveston County NASA Johnson Space Center Area and UTMB Technology Hub",
    "description": "Galveston County (Webster/Clear Lake/Galveston) sits adjacent to NASA Johnson Space Center (Harris County boundary), supporting the aerospace technology ecosystem with UTMB Galveston's biomedical research computing and Port of Galveston logistics IT. The Clear Lake aerospace cluster between NASA JSC and Galveston Bay drives significant engineering data and simulation infrastructure. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "University of Texas Medical Branch (UTMB) — Galveston", "url": "https://www.utmb.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# North Carolina — Johnston County (Raleigh south metro, DC expansion)
add_restriction({
    "fips": "37101",
    "name": "Johnston County",
    "state": "North Carolina",
    "level": -1,
    "types": ["data_center"],
    "title": "Johnston County Research Triangle Metro South Data Center Expansion",
    "description": "Johnston County (Smithfield/Clayton) has emerged as a data center expansion corridor for the Research Triangle metro, offering lower land costs and competitive Duke Energy Progress electricity rates compared to Wake County while maintaining RTP fiber connectivity. The Johnston County I-40 and US-70 corridor supports warehouse and logistics technology alongside data infrastructure. No local DC restrictions; NC data center tax incentive (G.S. 105-164.13E) applies.",
    "effective_date": "2022-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Johnston County Economic Development", "url": "https://www.johnstoncountync.org/economic-development/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Arizona — Coconino County (Flagstaff, NAU, USGS, Lowell Observatory)
add_restriction({
    "fips": "04005",
    "name": "Coconino County",
    "state": "Arizona",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Coconino County Flagstaff Northern Arizona University and Scientific Computing Hub",
    "description": "Coconino County (Flagstaff) hosts Northern Arizona University (NAU) research computing, Lowell Observatory (pioneered SDSS/survey astronomy data), and the USGS Astrogeology Science Center — the primary hub for NASA planetary mapping data. NAU's high-altitude location and cooler climate support research data operations. No local DC restrictions; Arizona data center sales tax incentive applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NAU Research Computing — Northern Arizona University", "url": "https://nau.edu/research/research-computing/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Kansas — Riley County (Manhattan, Fort Riley, Kansas State University)
add_restriction({
    "fips": "20161",
    "name": "Riley County",
    "state": "Kansas",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Riley County Fort Riley and Kansas State University Technology Hub",
    "description": "Riley County (Manhattan) hosts Fort Riley, home of the 1st Infantry Division (Big Red One) with significant Army mission command and training data infrastructure, and Kansas State University (K-State) — a top-10 public research university in cybersecurity and agricultural engineering computing. K-State's National Agricultural Biosecurity Center drives specialized data operations. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Fort Riley — 1st Infantry Division", "url": "https://www.riley.army.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Georgia — Houston County (Warner Robins, Robins AFB Air Logistics Center)
add_restriction({
    "fips": "13153",
    "name": "Houston County",
    "state": "Georgia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Houston County Warner Robins Robins AFB Air Force Logistics Technology Hub",
    "description": "Houston County (Warner Robins) hosts Robins Air Force Base, home of the Warner Robins Air Logistics Complex (WR-ALC) — responsible for maintaining the C-17, C-5, F-15, and U-2 fleets — and the Air Force Life Cycle Management Center. The concentration of Air Force IT, software sustainment, and intelligence systems makes Warner Robins one of the most significant Air Force data hubs in the Southeast. No local DC restrictions; Georgia's data center sales tax exemption (O.C.G.A. §48-8-3.2) applies.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Robins Air Force Base — Warner Robins Air Logistics Complex", "url": "https://www.robins.af.mil"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Virginia — Albemarle County (Charlottesville, UVA, NRAO)
add_restriction({
    "fips": "51003",
    "name": "Albemarle County",
    "state": "Virginia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Albemarle County Charlottesville University of Virginia Research Technology Hub",
    "description": "Albemarle County (Charlottesville) hosts the University of Virginia (UVA) and its Rivanna Research computing cluster, UVA Health's clinical data infrastructure, and the National Radio Astronomy Observatory (NRAO) headquarters. UVA's data science, bioinformatics, and AI research programs drive significant research computing demand. No local DC restrictions; Virginia's data center sales tax exemption (§58.1-609.3) and enterprise zone incentives apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "UVA Research Computing — University of Virginia", "url": "https://www.rc.virginia.edu"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Kentucky — McCracken County (Paducah, nuclear enrichment legacy, TVA energy hub)
add_restriction({
    "fips": "21145",
    "name": "McCracken County",
    "state": "Kentucky",
    "level": -1,
    "types": ["data_center", "energy"],
    "title": "McCracken County Paducah Nuclear Energy and Ohio River Technology Hub",
    "description": "McCracken County (Paducah) hosts the legacy Paducah Gaseous Diffusion Plant — a former uranium enrichment facility now undergoing DOE decontamination — and TVA's grid operations for the region. Paducah's Ohio River location and TVA power make it an emerging data center candidate. No local DC restrictions; Kentucky's data center personal property tax exemption (KRS 132.200) applies.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Paducah Area Chamber of Commerce", "url": "https://www.paducahchamber.org"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Delaware — Sussex County (Lewes/Georgetown, completes Delaware county coverage)
add_restriction({
    "fips": "10005",
    "name": "Sussex County",
    "state": "Delaware",
    "level": -1,
    "types": ["data_center"],
    "title": "Sussex County Delaware Coastal and Agricultural Technology Hub",
    "description": "Sussex County is Delaware's southernmost county, encompassing the Lewes technology sector (Blink Health, data startups), Perdue Farms' significant agricultural technology and supply chain data operations, and the Delmarva Peninsula's broadband connectivity anchor. Delaware's no-sales-tax environment and the Coastal Zone Act infrastructure support technology investment. No local DC restrictions; Delaware's data center tax incentive (§1924A) applies.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Sussex County Economic Development", "url": "https://www.sussexcountyde.gov/economic-development"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Alabama — Morgan County (Decatur, Huntsville metro, Nucor, Toyota)
add_restriction({
    "fips": "01103",
    "name": "Morgan County",
    "state": "Alabama",
    "level": -1,
    "types": ["data_center"],
    "title": "Morgan County Decatur Huntsville Metro West Manufacturing Technology Hub",
    "description": "Morgan County (Decatur) hosts Nucor Corporation's steel mini-mill with advanced manufacturing data systems, 3M's specialty materials operations, and is part of the broader Huntsville metro manufacturing technology corridor along the Tennessee River. General Electric Nuclear Energy's nearby Decatur operations add energy sector data infrastructure. No local DC restrictions; Alabama's data center tax exemption and Growing Alabama credit apply.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Decatur-Morgan County Economic Development", "url": "https://www.decaturedge.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Arizona — Mohave County (Kingman, data center market, cooler NW Arizona)
add_restriction({
    "fips": "04015",
    "name": "Mohave County",
    "state": "Arizona",
    "level": -1,
    "types": ["data_center"],
    "title": "Mohave County Kingman Arizona Data Center and Energy Technology Hub",
    "description": "Mohave County (Kingman/Bullhead City/Lake Havasu) offers a low-cost alternative to the Phoenix metro data center market, with competitive APS/UniSource electricity rates, cooler high-desert temperatures than the Valley of the Sun, and I-40 corridor connectivity. The county's industrial land availability and Arizona's data center sales tax incentive have attracted interest from logistics and colocation operators. No local DC restrictions.",
    "effective_date": "2022-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Mohave County Economic Development", "url": "https://www.mohavecounty.us/ContentPage.aspx?id=173&cid=93"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ut-004: Hill AFB Ogden Air Logistics Complex (Weber County)
add_campus({
    "id": "ai-ut-004",
    "name": "Hill AFB Ogden Air Logistics Complex (OO-ALC) — Software Engineering",
    "operator": "US Air Force / Ogden Air Logistics Complex",
    "status": "operational",
    "county_fips": "49057",
    "notes": "OO-ALC's Software Engineering Group maintains and modernizes flight control, avionics, and maintenance software for USAF aircraft; F-35 sustainment software ops co-located; one of Air Force's primary sustainment data centers.",
    "lon": -111.9738,
    "lat": 41.1240
})

# ai-ga-006: Robins AFB Warner Robins Air Logistics Complex (Houston County)
add_campus({
    "id": "ai-ga-006",
    "name": "Robins AFB Warner Robins Air Logistics Complex (WR-ALC)",
    "operator": "US Air Force / Warner Robins Air Logistics Complex",
    "status": "operational",
    "county_fips": "13153",
    "notes": "WR-ALC maintains C-17, C-5, F-15, and U-2 aircraft and associated avionics, software, and intelligence systems; Air Force Life Cycle Management Center (AFLCMC) manages major acquisition programs from Robins; among largest employers in Georgia.",
    "lon": -83.5919,
    "lat": 32.6401
})

# ai-va-007: UVA Research Computing / NRAO (Albemarle County)
add_campus({
    "id": "ai-va-007",
    "name": "UVA Rivanna Research Computing and NRAO Headquarters — Charlottesville",
    "operator": "University of Virginia / National Radio Astronomy Observatory",
    "status": "operational",
    "county_fips": "51003",
    "notes": "UVA's Rivanna HPC cluster supports bioinformatics, data science, and clinical AI research at UVA Health; NRAO headquarters coordinates global radio telescope network data including the Very Large Array (VLA) and ALMA data archives.",
    "lon": -78.4767,
    "lat": 38.0293
})

# ai-ks-002: Fort Riley / K-State Research (Riley County)
add_campus({
    "id": "ai-ks-002",
    "name": "Fort Riley Mission Command and K-State Biosecurity Research Institute — Manhattan",
    "operator": "US Army 1st Infantry Division / Kansas State University",
    "status": "operational",
    "county_fips": "20161",
    "notes": "Fort Riley hosts 1st Infantry Division mission command and training data systems; K-State's Biosecurity Research Institute (BRI) operates BSL-3 research computing and NBAF (National Bio and Agro-defense Facility) data systems adjacent to campus.",
    "lon": -96.5847,
    "lat": 39.1836
})

# ai-ky-001: Paducah Area TVA Grid and Energy Operations (McCracken County)
add_campus({
    "id": "ai-ky-001",
    "name": "Paducah Area TVA Power Operations and DOE Technology Center",
    "operator": "Tennessee Valley Authority / US DOE Paducah Site",
    "status": "operational",
    "county_fips": "21145",
    "notes": "TVA's Paducah area grid operations manage power distribution for western Kentucky and surrounding states; the DOE Paducah Site's ongoing deactivation and remediation program operates extensive environmental monitoring and process data systems.",
    "lon": -88.6001,
    "lat": 37.0834
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)

print(f"\nSweep R complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +0 incentives, +0 state regs")
