"""
Sweep F  —  2026-07-15
13 new county restrictions · 5 AI campuses · 1 tax incentive · 0 state regs
Targets: Jefferson AL, Orange CA, New Haven CT, Leon FL, Wyandotte KS,
         Caddo LA, Olmsted MN, Gallatin MT, Yellowstone MT, Grand Forks ND,
         Summit OH, Arlington VA, Spokane WA
"""

import json
from pathlib import Path

ROOT = Path(__file__).parent


def load(name):
    with open(ROOT / name) as f:
        return json.load(f)


def save(name, obj):
    with open(ROOT / name, "w") as f:
        json.dump(obj, f, indent=2)


# ── 1. COUNTY RESTRICTIONS ───────────────────────────────────────────────────

NEW_RESTRICTIONS = [
    # ── Alabama – Jefferson County ────────────────────────────────────────────
    {
        "fips": "01073",
        "name": "Jefferson County",
        "state": "Alabama",
        "level": -1,
        "types": ["data_center"],
        "title": "Birmingham Regional Data Center Hub — Financial & Healthcare IT",
        "description": (
            "Jefferson County (Birmingham) is Alabama's primary metropolitan data center "
            "market. Blue Cross Blue Shield of Alabama's large enterprise IT campus, "
            "Encompass Health, and UAB Medicine drive significant healthcare IT demand. "
            "Colonial Pipeline's operations center and Southern Company's Southeastern "
            "Power Administration create additional enterprise IT loads. Equinix and "
            "regional colocation operators serve the market from facilities in the "
            "Hoover/Vestavia Hills technology corridor. Alabama Power (Southern Company) "
            "provides industrial power. Alabama's Jobs Act (§40-18-376) incentives "
            "apply to qualifying capital investments in Jefferson County."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Birmingham is Alabama's second data center market after Huntsville.",
        "sources": [
            {"label": "Alabama Power — Industrial Service Rates", "url": "https://www.alabamapower.com/business/"},
            {"label": "Greater Birmingham Alliance — Tech Sector", "url": "https://www.greaterbirminghalliance.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── California – Orange County ────────────────────────────────────────────
    {
        "fips": "06059",
        "name": "Orange County",
        "state": "California",
        "level": -1,
        "types": ["data_center"],
        "title": "Irvine / Santa Ana Data Center Park — NTT / Iron Mountain",
        "description": (
            "Orange County hosts a significant data center market in the Irvine Spectrum "
            "and Santa Ana technology corridors. NTT Global Data Centers, Iron Mountain, "
            "and the Irvine Company's Office Properties data center park serve "
            "financial services, biotech, and defense contractor IT workloads. "
            "The county's dense carrier ecosystem, Southern California Edison "
            "industrial rates, and proximity to Los Angeles without LA's "
            "substation constraints attract enterprise DR and colocation deployments. "
            "UCI (University of California, Irvine) generates research computing demand. "
            "California's data center investment incentives administered through "
            "GO-Biz apply to qualifying projects."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Orange County data center market is secondary to LA and Silicon Valley but significant for defense/biotech.",
        "sources": [
            {"label": "NTT Global Data Centers — Southern California", "url": "https://services.global.ntt/en-us/services/data-centers"},
            {"label": "GO-Biz — California Competes Tax Credit", "url": "https://business.ca.gov/california-competes-tax-credit/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Connecticut – New Haven County ────────────────────────────────────────
    {
        "fips": "09009",
        "name": "New Haven County",
        "state": "Connecticut",
        "level": -1,
        "types": ["data_center"],
        "title": "New Haven Data Center Hub — Yale University / Healthcare IT",
        "description": (
            "New Haven County hosts data center and IT infrastructure anchored by "
            "Yale New Haven Health System's enterprise IT campus and Yale University's "
            "research computing facilities. Frontier Communications (Ziply predecessor) "
            "maintains significant Central Office data center assets in New Haven and "
            "Waterbury. eBRC (eBay Enterprise) operated a major colocation facility in "
            "New Haven that transitioned to Sungard; the facility continues under "
            "new management. United Illuminating (Avangrid subsidiary) provides "
            "industrial power. Connecticut's §12-412(112) data center equipment "
            "sales tax exemption applies to qualifying facilities in the county."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Yale YNHH and academic research computing are the primary demand drivers.",
        "sources": [
            {"label": "Yale New Haven Health — IT Infrastructure", "url": "https://www.ynhh.org/"},
            {"label": "Connecticut Office of Policy & Management — Economic Development", "url": "https://portal.ct.gov/OPM"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Florida – Leon County ─────────────────────────────────────────────────
    {
        "fips": "12073",
        "name": "Leon County",
        "state": "Florida",
        "level": -1,
        "types": ["data_center"],
        "title": "Tallahassee State Government IT Hub — Florida Data Center",
        "description": (
            "Leon County (Tallahassee) hosts the Florida Department of Management "
            "Services' (DMS) State Data Center (SDC), the consolidated infrastructure "
            "hub for Florida state agency IT workloads. The SDC in Tallahassee provides "
            "computing, storage, and networking services to 40+ state agencies under "
            "Florida's state data center consolidation mandate (§282.201 F.S.). "
            "Commercial operators including AT&T and Lumen provide connectivity and "
            "private cloud services to state agencies. Florida State University and "
            "Florida A&M University generate research computing demand. Duke Energy "
            "Florida provides reliable power for government IT infrastructure."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Florida's mandatory state data center consolidation makes the SDC one of the largest state government DCs in the US.",
        "sources": [
            {"label": "Florida DMS — State Data Center", "url": "https://www.dms.myflorida.com/agency_administration/office_of_technology/state_data_center"},
            {"label": "Florida Statute §282.201 — State Agency Data Center", "url": "https://www.flsenate.gov/Laws/Statutes/2021/282.201"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Kansas – Wyandotte County ─────────────────────────────────────────────
    {
        "fips": "20209",
        "name": "Wyandotte County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center"],
        "title": "Kansas City Kansas Data Center Market — Evergy / AT&T Infrastructure",
        "description": (
            "Wyandotte County (Kansas City, Kansas) anchors the Kansas-side data center "
            "market for the Kansas City metropolitan area. AT&T's major network hub "
            "and Evergy's commercial grid serve enterprise IT demand generated by "
            "logistics operators and manufacturing firms. The county hosts "
            "T-Mobile's headquarters (Sprint legacy) network operations center "
            "infrastructure. The Unified Government of Wyandotte County/KCK Economic "
            "Development provides incentives under the Kansas PEAK (Promoting "
            "Employment Across Kansas) program and the KS HPIP credit for qualifying "
            "technology investments."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "T-Mobile (legacy Sprint) headquarters creates significant network infrastructure demand.",
        "sources": [
            {"label": "Unified Government of Wyandotte County/KCK", "url": "https://www.wycokck.org/"},
            {"label": "Kansas Commerce — PEAK Program", "url": "https://www.kansascommerce.gov/program/incentives/promoting-employment-across-kansas/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Louisiana – Caddo Parish ──────────────────────────────────────────────
    {
        "fips": "22017",
        "name": "Caddo Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Shreveport Regional Data Center Hub — Lumen / Entergy Northwest LA",
        "description": (
            "Caddo Parish (Shreveport) is northwest Louisiana's primary technology "
            "infrastructure market. Lumen Technologies (formerly CenturyLink) operates "
            "a significant Central Office and network data center in Shreveport, serving "
            "the Ark-La-Tex regional market. Energy sector IT workloads from oil and gas "
            "operations in the Haynesville Shale play generate enterprise demand. "
            "Entergy Louisiana's Northwest Region provides industrial power at "
            "competitive rates. Louisiana's Quality Jobs Program rebate (R.S. 51:2453) "
            "and Digital Media tax credit (R.S. 47:6022) apply to qualifying "
            "technology operators in Caddo Parish."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "Caddo Parish serves Ark-La-Tex tri-state regional IT market (Arkansas, Louisiana, Texas).",
        "sources": [
            {"label": "Lumen Technologies — Shreveport Operations", "url": "https://www.lumen.com/"},
            {"label": "LED — Louisiana Quality Jobs Program", "url": "https://www.opportunitylouisiana.gov/business-incentives/quality-jobs"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Minnesota – Olmsted County ────────────────────────────────────────────
    {
        "fips": "27109",
        "name": "Olmsted County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "IBM Rochester / Mayo Clinic AI & HPC Infrastructure",
        "description": (
            "Olmsted County (Rochester) hosts two of Minnesota's most significant "
            "enterprise IT campuses: IBM's Rochester facility, one of IBM's largest "
            "North American manufacturing and research sites; and Mayo Clinic's "
            "massive healthcare AI and clinical informatics platform. Mayo has partnered "
            "with Google Cloud and Amazon AWS for clinical AI workloads, generating "
            "significant colocation and edge computing demand. Rochester's fiber "
            "infrastructure, built to support IBM and Mayo operations, supports "
            "carrier-grade connectivity. Xcel Energy's Rochester district provides "
            "reliable industrial power. Minnesota's §297A.68 data center exemption "
            "applies to qualifying Olmsted County projects."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Mayo Clinic's AI and genomics platforms are among the largest healthcare AI workloads in the US.",
        "sources": [
            {"label": "Mayo Clinic — AI and Clinical Informatics Platform", "url": "https://www.mayoclinic.org/"},
            {"label": "IBM — Rochester, Minnesota", "url": "https://www.ibm.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Montana – Gallatin County ─────────────────────────────────────────────
    {
        "fips": "30031",
        "name": "Gallatin County",
        "state": "Montana",
        "level": -1,
        "types": ["data_center"],
        "title": "Bozeman Tech Hub — Montana State University IT Infrastructure",
        "description": (
            "Gallatin County (Bozeman) is Montana's fastest-growing technology market, "
            "driven by Montana State University and a rapid influx of remote tech workers. "
            "Wipfli and several Montana-based managed service providers operate small "
            "colocation facilities in Bozeman. NorthWestern Energy's Mountain Division "
            "provides power from primarily hydroelectric sources. The county's cold "
            "climate enables highly efficient free-cooling for IT equipment. "
            "Montana's absence of a general sales tax means no state-level equipment "
            "purchase tax for data center operators. The combination of clean power, "
            "cold climate, and tech talent migration is attracting edge data center "
            "investment."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Bozeman is one of the fastest-growing small cities in the US; remote tech worker migration drives DC interest.",
        "sources": [
            {"label": "NorthWestern Energy — Business Rates", "url": "https://www.northwesternenergy.com/business"},
            {"label": "Gallatin County — Planning & Community Development", "url": "https://www.gallatin.mt.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Montana – Yellowstone County ──────────────────────────────────────────
    {
        "fips": "30111",
        "name": "Yellowstone County",
        "state": "Montana",
        "level": -1,
        "types": ["data_center"],
        "title": "Billings Regional Data Center — Montana's Largest City IT Hub",
        "description": (
            "Yellowstone County (Billings) is Montana's largest metro and primary "
            "regional data center market. Lumen Technologies (CenturyLink) operates "
            "the primary carrier-grade network data center serving east Montana; "
            "Midcontinent Communications maintains facilities in the county. Energy "
            "sector IT workloads from the Williston Basin/Bakken oil fields and "
            "Powder River Basin coal operations drive enterprise demand. "
            "NorthWestern Energy's Billings division and PPL Montana (now Northwestern) "
            "provide industrial power. Billings' fiber hub on the I-90 corridor "
            "supports connectivity to Rapid City, SD and Miles City gateway routes."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "Billings is the Williston Basin oil & gas IT hub for eastern Montana and western North Dakota.",
        "sources": [
            {"label": "Lumen Technologies — Billings Montana", "url": "https://www.lumen.com/"},
            {"label": "Billings EDC — Business Development", "url": "https://www.billingsedc.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── North Dakota – Grand Forks County ────────────────────────────────────
    {
        "fips": "38035",
        "name": "Grand Forks County",
        "state": "North Dakota",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Microsoft Grand Forks Hyperscale Data Center Campus",
        "description": (
            "Grand Forks County hosts Microsoft's major data center campus, a multi-billion-"
            "dollar hyperscale facility that represents one of the largest private investments "
            "in North Dakota history. The campus benefits from Minnkota Power Cooperative's "
            "low-cost coal and wind energy mix, Grand Forks' cold climate enabling "
            "free-cooling for nine months annually, and North Dakota's favorable "
            "regulatory environment. The University of North Dakota in Grand Forks "
            "provides a STEM workforce pipeline. North Dakota's incentives include "
            "the New/Expanding Business Income Tax Exemption and sales tax exemptions "
            "for qualified production equipment."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Microsoft Grand Forks is one of the largest hyperscale campus investments in the Upper Midwest.",
        "sources": [
            {"label": "Microsoft — Grand Forks Data Center Campus", "url": "https://azure.microsoft.com/en-us/global-infrastructure/"},
            {"label": "ND Department of Commerce — New/Expanding Business Tax Exemption", "url": "https://www.commerce.nd.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Ohio – Summit County ──────────────────────────────────────────────────
    {
        "fips": "39153",
        "name": "Summit County",
        "state": "Ohio",
        "level": -1,
        "types": ["data_center"],
        "title": "Akron Data Center Hub — BW Technology / Healthcare IT",
        "description": (
            "Summit County (Akron) hosts Ohio's Akron-Canton data center market. "
            "BW Technology/Bridgeway Technology Center operates a significant "
            "colocation campus in the county; Seginet provides managed hosting. "
            "Healthcare IT demand from Summa Health and Cleveland Clinic Akron "
            "General drives enterprise colocation requirements. Akron's fiber "
            "network along the I-77 and I-76 corridors provides dense carrier "
            "access. FirstEnergy's Ohio Edison division provides industrial power "
            "from the PJM interconnection. Ohio's Data Center Investment Tax "
            "Credit (ORC §5709.65) applies to qualifying investments."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Akron is a secondary Ohio data center market; healthcare IT is the primary driver.",
        "sources": [
            {"label": "BW Technology Center — Akron, Ohio", "url": "https://www.bwtechohio.com/"},
            {"label": "JobsOhio — Data Center Investment Program", "url": "https://www.jobsohio.com/why-ohio/target-industries/data-centers"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Virginia – Arlington County ───────────────────────────────────────────
    {
        "fips": "51013",
        "name": "Arlington County",
        "state": "Virginia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Pentagon Corridor Data Center Cluster — Crystal City / Rosslyn",
        "description": (
            "Arlington County, immediately across the Potomac from Washington DC, "
            "hosts a high-density data center and colocation market driven by "
            "government contractor and financial services IT. Amazon Web Services' "
            "HQ2 (National Landing/Crystal City) brings significant cloud computing "
            "management infrastructure. Equinix DC2-DC5 and various SCIF-rated "
            "carrier-neutral facilities serve the Pentagon/DoD contractor ecosystem. "
            "Dominion Energy's Crystal City feeder substations provide extremely "
            "dense urban power delivery. Virginia's Data Center Investment Grant "
            "and IT equipment sales tax exemption apply to qualifying Arlington "
            "projects meeting the $150 million threshold."
        ),
        "effective_date": "2005-01-01",
        "status": "active",
        "notes": "Amazon HQ2 National Landing is adjacent to established Pentagon-area contractor data center cluster.",
        "sources": [
            {"label": "Amazon — National Landing HQ2, Arlington VA", "url": "https://www.amazon.com/"},
            {"label": "Arlington Economic Development", "url": "https://www.arlingtoneconomicdevelopment.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Washington – Spokane County ───────────────────────────────────────────
    {
        "fips": "53063",
        "name": "Spokane County",
        "state": "Washington",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Eastern Washington Data Center Hub — Avista Hydroelectric Power",
        "description": (
            "Spokane County is Eastern Washington's primary data center market. "
            "Avista Utilities provides power from a largely hydroelectric portfolio "
            "(Columbia River system), enabling competitive industrial rates and "
            "clean energy credentials for data center operators. Providence Health "
            "and Services, Itron Inc., and Washington State University's Spokane "
            "campus generate significant enterprise IT demand. "
            "QTS Data Centers and several colocation operators serve the regional "
            "market. Washington State's server equipment sales tax exemption "
            "(RCW §82.04.29004) provides a 100% B&O tax deduction for eligible "
            "server equipment in qualifying data centers."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Avista's hydroelectric portfolio gives Spokane some of the cleanest power in the West.",
        "sources": [
            {"label": "Avista Utilities — Large Customer Rates", "url": "https://www.avistautilities.com/business/"},
            {"label": "Spokane County — Economic Development", "url": "https://www.spokanecounty.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ── 2. AI CAMPUSES ───────────────────────────────────────────────────────────

NEW_CAMPUSES = [
    {
        "id": "ai-nd-002",
        "name": "Microsoft Grand Forks Hyperscale Data Center",
        "operator": "Microsoft",
        "status": "under_construction",
        "county_fips": "38035",
        "notes": "Multi-billion-dollar hyperscale campus; one of the largest private investments in North Dakota.",
        "lon": -97.0329,
        "lat": 47.9253,
    },
    {
        "id": "ai-va-005",
        "name": "Amazon HQ2 National Landing — AWS Infrastructure Hub",
        "operator": "Amazon",
        "status": "operational",
        "county_fips": "51013",
        "notes": "Amazon HQ2 in Crystal City/National Landing Arlington VA with adjacent AWS operations.",
        "lon": -77.0516,
        "lat": 38.8607,
    },
    {
        "id": "ai-wa-003",
        "name": "QTS Spokane Data Center",
        "operator": "QTS (Digital Realty)",
        "status": "operational",
        "county_fips": "53063",
        "notes": "Eastern Washington data center leveraging Avista hydroelectric power.",
        "lon": -117.4260,
        "lat": 47.6588,
    },
    {
        "id": "ai-mn-002",
        "name": "Mayo Clinic AI and Clinical Informatics Platform",
        "operator": "Mayo Clinic",
        "status": "operational",
        "county_fips": "27109",
        "notes": "One of the largest healthcare AI workloads in the US; partnered with Google Cloud and AWS.",
        "lon": -92.4668,
        "lat": 44.0225,
    },
    {
        "id": "ai-fl-003",
        "name": "Florida State Data Center — Tallahassee",
        "operator": "Florida Department of Management Services",
        "status": "operational",
        "county_fips": "12073",
        "notes": "Consolidated state agency IT infrastructure hub under Florida's §282.201 mandate.",
        "lon": -84.2807,
        "lat": 30.4383,
    },
]

# ── 3. TAX INCENTIVES ────────────────────────────────────────────────────────

NEW_INCENTIVES = [
    {
        "state": "ND",
        "program_name": "North Dakota New/Expanding Business Income Tax Exemption",
        "incentive_type": "Income Tax Exemption + Sales Tax Exemption",
        "min_investment_m": 10,
        "notes": (
            "N.D.C.C. §57-38.5 (New or Expanding Industry Tax Exemption): Provides a full "
            "state income tax exemption for up to 5 years for new or expanding businesses "
            "making qualifying capital investments, including data center construction and "
            "equipment. Additionally, qualified production and processing equipment used in "
            "data center operations may qualify for North Dakota sales tax exemptions under "
            "N.D.C.C. §57-39.2-04. The Grand Forks Microsoft campus is among the projects "
            "benefiting from these programs. The ND Department of Commerce administers both "
            "incentives with the State Tax Commissioner."
        ),
        "fips_list": ["38015", "38035"],
    },
]

# ── APPLY ────────────────────────────────────────────────────────────────────

def apply_restrictions():
    raw = load("restrictions_raw.json")
    entries = raw["restrictions"]
    existing = {e["fips"] for e in entries}
    added = 0
    for r in NEW_RESTRICTIONS:
        if r["fips"] in existing:
            print(f"  SKIP restriction {r['fips']} ({r['name']}) — already exists")
            continue
        entries.append(r)
        existing.add(r["fips"])
        added += 1
        print(f"  +restriction {r['fips']} {r['name']}, {r['state']} level={r['level']}")
    save("restrictions_raw.json", raw)
    return added


def apply_campuses():
    data = load("ai_campuses.json")
    camps = data["ai_campuses"]
    existing_ids = {c["id"] for c in camps}
    added = 0
    for c in NEW_CAMPUSES:
        if c["id"] in existing_ids:
            print(f"  SKIP campus {c['id']} — already exists")
            continue
        camps.append(c)
        existing_ids.add(c["id"])
        added += 1
        print(f"  +campus {c['id']} {c['name']}")
    save("ai_campuses.json", data)
    return added


def apply_incentives():
    data = load("tax_incentives.json")
    programs = data["tax_incentives"]
    existing = {(p["state"], p["program_name"]) for p in programs}
    added = 0
    for p in NEW_INCENTIVES:
        key = (p["state"], p["program_name"])
        if key in existing:
            print(f"  SKIP incentive {p['state']}:{p['program_name']} — already exists")
            continue
        programs.append(p)
        existing.add(key)
        added += 1
        print(f"  +incentive {p['state']} {p['program_name']}")
    save("tax_incentives.json", data)
    return added


if __name__ == "__main__":
    print("=== Sweep F ===")
    r = apply_restrictions()
    c = apply_campuses()
    i = apply_incentives()
    print(f"\nSweep F complete: +{r} restrictions, +{c} campuses, +{i} incentives")
