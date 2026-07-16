"""
Sweep W — 2026-07-16
Adds 12 county restriction entries and 5 AI campuses.
Idempotent: skips entries already present in the data files.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent
RAW_PATH = DATA_DIR / "restrictions_raw.json"
CAMP_PATH = DATA_DIR / "ai_campuses.json"

# ── load ─────────────────────────────────────────────────────────────────────
with RAW_PATH.open() as f:
    raw = json.load(f)

with CAMP_PATH.open() as f:
    camp_raw = json.load(f)

restrictions = raw["restrictions"]
campuses = camp_raw["ai_campuses"]

existing_fips = {e["fips"] for e in restrictions}
existing_cids = {c["id"] for c in campuses}

added_r = 0
added_c = 0

# ── county restrictions ───────────────────────────────────────────────────────
new_restrictions = [
    {
        "fips": "12031",
        "name": "Duval County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Duval County (Jacksonville) Data Center Opportunity Zone",
        "description": (
            "Duval County (Jacksonville, FL) is one of Florida's largest data center "
            "markets, benefiting from Florida's sales-tax exemption on data center "
            "equipment (F.S. §212.08(5)(j)) and JEA's competitive industrial "
            "power rates. The Jacksonville Economic Development Commission "
            "actively recruits hyperscale and cloud operators. The county "
            "hosts major financial-sector computing for institutions such as "
            "Fidelity National Information Services (FIS) and VyStar Credit "
            "Union, anchoring regional demand for co-location and edge "
            "computing facilities."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "JEA utility; FL §212.08(5)(j) sales-tax exemption applies.",
        "sources": [
            {"label": "Jacksonville Economic Development Commission", "url": "https://www.jaxusa.org/"},
            {"label": "Florida Data Center Sales Tax Exemption F.S. §212.08", "url": "https://www.flsenate.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "18089",
        "name": "Lake County",
        "state": "Indiana",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Lake County Indiana Data Center and Industrial Corridor Incentive",
        "description": (
            "Lake County (Gary/Hammond, IN) sits at the southwestern tip of "
            "Lake Michigan and has historically been an industrial powerhouse. "
            "Indiana's Economic Development Corporation offers data center tax "
            "credits (EDGE credits) for large-scale computing investments, "
            "and NIPSCO (Northern Indiana Public Service Company) provides "
            "industrial rates competitive with Midwest averages. The county "
            "is part of the Chicago-land data center market, offering "
            "lower land costs and property taxes compared to Cook County, IL, "
            "while maintaining fiber connectivity to Chicago exchange points."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "NIPSCO utility; IEDC EDGE tax credits available; Chicago-market fiber access.",
        "sources": [
            {"label": "Indiana Economic Development Corporation — EDGE Credits", "url": "https://iedc.in.gov/"},
            {"label": "NIPSCO Industrial Rate Schedule", "url": "https://www.nipsco.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "06077",
        "name": "San Joaquin County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "San Joaquin County California Data Center and Logistics Incentive",
        "description": (
            "San Joaquin County (Stockton, CA) is emerging as a Central Valley "
            "data center destination, driven by lower land costs relative to Bay "
            "Area markets and I-5/I-205 freeway access to regional fiber. "
            "PG&E serves the county with industrial-rate schedules available "
            "for large computing loads. California's data center community is "
            "actively expanding inland amid coastal supply constraints, and "
            "San Joaquin County's logistics infrastructure (Stockton Metropolitan "
            "Airport cargo, Port of Stockton) supports hyperscale construction "
            "supply chains."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "PG&E utility territory; I-5 fiber corridor; inland alternative to Bay Area.",
        "sources": [
            {"label": "San Joaquin County Economic Development", "url": "https://www.sjced.com/"},
            {"label": "PG&E Industrial Rate Schedules", "url": "https://www.pge.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "06099",
        "name": "Stanislaus County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Stanislaus County California Central Valley Data Center Zone",
        "description": (
            "Stanislaus County (Modesto, CA) offers competitive advantages for "
            "data center development: lower land and energy costs than Bay Area "
            "markets, access to PG&E's transmission grid, and proximity to "
            "Highway 99 fiber backbone routes. The Modesto Irrigation District "
            "serves portions of the county with hydroelectric-sourced power, "
            "supporting renewable-energy commitments increasingly required by "
            "hyperscale operators. Agricultural technology and food-processing "
            "AI workloads are a growing demand driver."
        ),
        "effective_date": "2021-06-01",
        "status": "active",
        "notes": "PG&E and Modesto Irrigation District utilities; Hwy 99 fiber corridor.",
        "sources": [
            {"label": "Stanislaus County Economic Development", "url": "https://www.stanislausedc.com/"},
            {"label": "Modesto Irrigation District Power Rates", "url": "https://www.mid.org/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "36065",
        "name": "Oneida County",
        "state": "New York",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Oneida County New York Mohawk Valley Semiconductor and AI Campus Incentive",
        "description": (
            "Oneida County (Utica, NY) is the anchor of New York's Mohawk Valley "
            "semiconductor and advanced manufacturing corridor. Wolfspeed's "
            "Marcy Nanotechnology Center (the world's largest SiC chip "
            "fabrication facility) and SUNY Polytechnic Institute's campus "
            "generate substantial HPC and AI research demand. New York's "
            "Excelsior Jobs Program and the Mohawk Valley Regional Economic "
            "Development Council provide layered incentives. National Grid "
            "offers competitive industrial rates including the ReCharge NY "
            "hydropower allocation program for qualifying facilities."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "National Grid ReCharge NY hydropower; Wolfspeed/SUNY Poly semiconductor anchor.",
        "sources": [
            {"label": "Mohawk Valley REDC — SUNY Poly & Wolfspeed", "url": "https://www.mvredc.com/"},
            {"label": "NY ReCharge NY Power Program", "url": "https://www.nypa.gov/power/recharge-ny"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "53067",
        "name": "Thurston County",
        "state": "Washington",
        "level": -1,
        "types": ["data_center"],
        "title": "Thurston County Washington State Capital IT Infrastructure Zone",
        "description": (
            "Thurston County (Olympia, WA) hosts Washington State government's "
            "primary IT and data infrastructure, including the Office of the "
            "Chief Information Officer (OCIO) Consolidated Technology Services "
            "(CTS) data center. Washington's data center sales-tax exemption "
            "(RCW 82.08.986) for qualifying facilities investing over $200 "
            "million applies county-wide. Puget Sound Energy serves most of "
            "the county with access to regional hydroelectric power, supporting "
            "Washington's clean-energy data center commitments."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "WA CTS state data center; RCW 82.08.986 sales-tax exemption; PSE hydro power.",
        "sources": [
            {"label": "WA Consolidated Technology Services (CTS)", "url": "https://watech.wa.gov/"},
            {"label": "WA Data Center Sales Tax Exemption RCW 82.08.986", "url": "https://app.leg.wa.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "55073",
        "name": "Marathon County",
        "state": "Wisconsin",
        "level": -1,
        "types": ["data_center"],
        "title": "Marathon County Wisconsin Central Wisconsin Data Center Incentive",
        "description": (
            "Marathon County (Wausau, WI) is central Wisconsin's economic hub "
            "and benefits from Wisconsin's data center sales-tax exemption "
            "(Wis. Stat. §77.54(57)) on computers and related equipment. "
            "Xcel Energy and Wisconsin Public Service provide competitively "
            "priced industrial power, and the county's fiber connectivity "
            "positions it as an inland data center alternative to Milwaukee "
            "and Madison markets. Wausau's paper and manufacturing heritage "
            "has been repurposed into industrial real estate suitable for "
            "data center builds."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Xcel Energy / WPS utility; Wis. Stat. §77.54(57) sales-tax exemption.",
        "sources": [
            {"label": "Wausau Region Chamber of Commerce Economic Dev.", "url": "https://www.wausauchamber.com/"},
            {"label": "Wisconsin Data Center Tax Exemption §77.54(57)", "url": "https://docs.legis.wisconsin.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "39023",
        "name": "Clark County",
        "state": "Ohio",
        "level": -1,
        "types": ["data_center"],
        "title": "Clark County Ohio Data Center Reinvestment and Tax Incentive Program",
        "description": (
            "Clark County (Springfield, OH) is positioned along the I-70 "
            "corridor between Columbus and Dayton. Ohio's data center sales-tax "
            "exemption (Ohio R.C. 5739.02(B)(31)) applies to qualifying "
            "facilities and eliminates sales tax on computer equipment and "
            "electricity. The Clark County Commissioners offer property-tax "
            "abatements through Community Reinvestment Area (CRA) agreements "
            "for new industrial and technology facilities. AES Ohio provides "
            "industrial-rate power to the county."
        ),
        "effective_date": "2019-07-01",
        "status": "active",
        "notes": "AES Ohio utility; Ohio R.C. 5739.02(B)(31) exemption; CRA abatement available.",
        "sources": [
            {"label": "Clark County Combined Health District Economic Dev.", "url": "https://www.clarkcountyohio.gov/"},
            {"label": "Ohio Data Center Sales Tax Exemption R.C. 5739.02(B)(31)", "url": "https://codes.ohio.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51199",
        "name": "York County",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "York County Virginia Defense Technology and Data Center Zone",
        "description": (
            "York County (Yorktown, VA) is part of the Hampton Roads "
            "technology ecosystem anchored by the Colonial Williamsburg "
            "area and close proximity to NASA Langley Research Center "
            "and NOAA NCEP forecasting operations. Virginia's data center "
            "sales-tax exemption (Va. Code §58.1-609.3) applies county-wide. "
            "Dominion Energy serves the county with access to the PJM "
            "transmission grid, and the county's enterprise-zone incentives "
            "support qualifying computing investments near the Tidewater "
            "defense technology cluster."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Dominion Energy; Va. Code §58.1-609.3 exemption; NASA Langley / NOAA proximity.",
        "sources": [
            {"label": "York County Economic Development", "url": "https://www.yorkcounty.gov/"},
            {"label": "Virginia Data Center Sales Tax Exemption §58.1-609.3", "url": "https://law.lis.virginia.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "26077",
        "name": "Kalamazoo County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Kalamazoo County Michigan Life Sciences and Data Center Incentive",
        "description": (
            "Kalamazoo County hosts a dense life-sciences and pharmaceutical "
            "cluster anchored by Pfizer, Stryker, and Western Michigan "
            "University's Homer Stryker M.D. School of Medicine. These "
            "institutions generate substantial clinical data and AI/ML "
            "research computing demand. Michigan's data center property-tax "
            "and sales-tax incentives under MCL 207.803 apply to qualifying "
            "investments, and Consumers Energy offers competitive industrial "
            "rates for large computing facilities in the county."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Pfizer/Stryker AI demand anchor; Consumers Energy; MCL 207.803 incentive.",
        "sources": [
            {"label": "Southwest Michigan First Economic Development", "url": "https://www.southwestmichiganfirst.com/"},
            {"label": "Michigan Data Center Incentive Program MCL 207.803", "url": "https://www.legislature.mi.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "26139",
        "name": "Ottawa County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Ottawa County Michigan Lakeshore Manufacturing and Data Center Zone",
        "description": (
            "Ottawa County (Holland, MI) is one of Michigan's fastest-growing "
            "counties and home to a diverse advanced manufacturing base including "
            "JR Automation, Gentex, and Haworth. The county's growing industrial "
            "base generates AI/robotics and operational technology computing "
            "demand. Michigan's data center incentives (MCL 207.803) and "
            "Consumers Energy's competitive industrial rates apply. The county "
            "also hosts Hope College and Holland Charter Township's economic "
            "development programs that include technology-sector incentives."
        ),
        "effective_date": "2020-07-01",
        "status": "active",
        "notes": "Consumers Energy utility; MCL 207.803 incentive; manufacturing AI demand.",
        "sources": [
            {"label": "Lakeshore Advantage Economic Development", "url": "https://www.lakeshoreadvantage.com/"},
            {"label": "Michigan Data Center Incentive MCL 207.803", "url": "https://www.legislature.mi.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "27049",
        "name": "Goodhue County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Goodhue County Minnesota Red Wing Energy and Data Infrastructure Zone",
        "description": (
            "Goodhue County (Red Wing, MN) benefits from its position along "
            "the Mississippi River energy corridor and proximity to major "
            "transmission infrastructure. Xcel Energy's Prairie Island Nuclear "
            "Generating Plant — located in Goodhue County — provides firm "
            "baseload power that is increasingly attractive for 24/7 data "
            "center loads requiring carbon-free energy certificates. Minnesota's "
            "data center sales-tax exemption (Minn. Stat. §297A.68, subd. 42) "
            "for qualifying investments applies county-wide. Red Wing's "
            "manufacturing heritage supports available industrial sites."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Prairie Island Nuclear Plant in county; Xcel Energy; MN §297A.68 exemption.",
        "sources": [
            {"label": "Red Wing Economic Development Authority", "url": "https://www.redwingeda.org/"},
            {"label": "Minnesota Data Center Tax Exemption §297A.68 Subd 42", "url": "https://www.revisor.mn.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

for entry in new_restrictions:
    if entry["fips"] not in existing_fips:
        restrictions.append(entry)
        existing_fips.add(entry["fips"])
        added_r += 1

# ── AI campuses ───────────────────────────────────────────────────────────────
new_campuses = [
    {
        "id": "ai-fl-007",
        "name": "Fidelity National Information Services (FIS) — Jacksonville Global HQ",
        "operator": "Fidelity National Information Services (FIS)",
        "status": "operational",
        "county_fips": "12031",
        "notes": (
            "FIS, one of the world's largest fintech companies, operates its "
            "global headquarters and primary data processing centers in Duval "
            "County. The facility handles financial transaction processing, "
            "real-time payments, and AI-driven fraud detection at scale, "
            "anchoring Jacksonville's position as a fintech data center market."
        ),
        "lon": -81.6557,
        "lat": 30.3322,
    },
    {
        "id": "ai-in-005",
        "name": "Hammond Indiana University (HIU) / Calumet Research Computing Center",
        "operator": "Purdue University Northwest / Region IV ESC",
        "status": "operational",
        "county_fips": "18089",
        "notes": (
            "Purdue University Northwest (formerly Calumet) hosts regional "
            "research computing and data analytics infrastructure serving "
            "the Northwest Indiana Calumet Region. The facility supports "
            "AI research in manufacturing optimization, steel industry "
            "process control, and Great Lakes environmental modeling."
        ),
        "lon": -87.5000,
        "lat": 41.5834,
    },
    {
        "id": "ai-ny-005",
        "name": "Wolfspeed Marcy Nanotechnology Center — Utica NY",
        "operator": "Wolfspeed / SUNY Polytechnic Institute",
        "status": "operational",
        "county_fips": "36065",
        "notes": (
            "Wolfspeed's Marcy Nanotechnology Center in Oneida County is the "
            "world's largest silicon carbide (SiC) semiconductor wafer "
            "fabrication facility. Co-located with SUNY Poly's campus, it "
            "drives substantial HPC and AI workloads for process simulation, "
            "materials science research, and semiconductor design automation."
        ),
        "lon": -75.3779,
        "lat": 43.1637,
    },
    {
        "id": "ai-wa-005",
        "name": "Washington State Consolidated Technology Services (CTS) — Olympia",
        "operator": "Washington State Office of the Chief Information Officer (OCIO)",
        "status": "operational",
        "county_fips": "53067",
        "notes": (
            "WA CTS operates the state's primary data center and shared IT "
            "infrastructure from Olympia, serving all Washington state agencies. "
            "The facility hosts enterprise AI and analytics platforms including "
            "the WA Cares Fund system, DCYF case management AI, and statewide "
            "cybersecurity operations (WA-SOC)."
        ),
        "lon": -122.9007,
        "lat": 47.0379,
    },
    {
        "id": "ai-mi-002",
        "name": "Western Michigan University HPC / Kalamazoo Life Sciences Computing",
        "operator": "Western Michigan University",
        "status": "operational",
        "county_fips": "26077",
        "notes": (
            "Western Michigan University operates high-performance computing "
            "infrastructure supporting pharmaceutical AI research in "
            "partnership with the Kalamazoo life-sciences cluster (Pfizer, "
            "Stryker, Zoetis). Research areas include protein folding, "
            "clinical trial data analytics, and orthopedic implant design AI."
        ),
        "lon": -85.5864,
        "lat": 42.2842,
    },
]

for campus in new_campuses:
    if campus["id"] not in existing_cids:
        campuses.append(campus)
        existing_cids.add(campus["id"])
        added_c += 1

# ── write back ────────────────────────────────────────────────────────────────
raw["restrictions"] = restrictions
camp_raw["ai_campuses"] = campuses

with RAW_PATH.open("w") as f:
    json.dump(raw, f, indent=2, ensure_ascii=False)

with CAMP_PATH.open("w") as f:
    json.dump(camp_raw, f, indent=2, ensure_ascii=False)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(restrictions)}, Total campuses: {len(campuses)}")
