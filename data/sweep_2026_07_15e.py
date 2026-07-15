"""
Sweep E  —  2026-07-15
14 new county restrictions · 5 AI campuses · 2 tax incentives · 1 state reg
Targets: Coweta GA, Fresno CA, Douglas CO, Boone KY, Sedgwick KS, Suffolk MA,
         Essex NJ, Union NJ, Suffolk NY, Westchester NY, Greene OH, Allegheny PA,
         Delaware County PA, York SC
New state: MS (state reg)
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
    # ── California – Fresno County ────────────────────────────────────────────
    {
        "fips": "06019",
        "name": "Fresno County",
        "state": "California",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Central Valley Telecom Infrastructure — Fresno Regional Hub",
        "description": (
            "Fresno County anchors Central Valley telecommunications and data center "
            "infrastructure. AT&T and Lumen/CenturyLink maintain major Central Office "
            "data centers in Fresno serving agricultural, healthcare, and state government "
            "IT workloads. The CENIC (Corporation for Education Network Initiatives in "
            "California) backbone passes through Fresno, providing research network "
            "connectivity to UC Merced and CSU Fresno. Pacific Gas and Electric's "
            "San Joaquin Division provides power to industrial customers. Fresno's "
            "inland location reduces seismic and coastal flooding risk compared to "
            "Bay Area facilities and its low land costs are attracting new colocation "
            "interest from operators unable to afford Silicon Valley."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Central Valley data center market is emerging; Fresno is largest city between LA and SF.",
        "sources": [
            {"label": "CENIC — California Education Network Infrastructure", "url": "https://cenic.org/"},
            {"label": "Fresno EDC — Business Climate", "url": "https://www.fresnoedc.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Colorado – Douglas County ─────────────────────────────────────────────
    {
        "fips": "08035",
        "name": "Douglas County",
        "state": "Colorado",
        "level": -1,
        "types": ["data_center"],
        "title": "Denver South Technology Corridor — Castle Rock / Parker",
        "description": (
            "Douglas County, the rapidly growing Denver south metro area, has seen "
            "data center expansion driven by proximity to the Denver market, lower "
            "land costs than Jefferson or Denver counties, and Xcel Energy's "
            "industrial rates. CenturyLink/Lumen and several enterprise operators "
            "have facilities in Castle Rock and Lone Tree. The county's I-25 "
            "technology corridor includes Charles Schwab's major operations campus "
            "and other financial services IT infrastructure that generates demand "
            "for disaster recovery colocation. Colorado's data center sales tax "
            "exemption (C.R.S. §39-26-711.5) applies to qualifying projects."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Douglas County is one of the fastest-growing counties in the US; tech sector demand is rising.",
        "sources": [
            {"label": "Douglas County — Economic Development", "url": "https://www.douglas.co.us/economic-development/"},
            {"label": "Xcel Energy — Colorado Large Customer Rates", "url": "https://www.xcelenergy.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Georgia – Coweta County ───────────────────────────────────────────────
    {
        "fips": "13077",
        "name": "Coweta County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Meta Newnan Data Center Campus — I-85 Southwest Atlanta Corridor",
        "description": (
            "Coweta County (Newnan) hosts Meta's major data center campus along the I-85 "
            "corridor southwest of Atlanta. The campus, a multi-building hyperscale "
            "facility, is powered substantially by Georgia Power solar and wind energy "
            "under long-term renewable purchase agreements. Meta's presence has accelerated "
            "fiber infrastructure development in the county and attracted supplier and "
            "logistics activity. Georgia's data center exemption from sales tax on "
            "computer equipment (O.C.G.A. §48-8-3(68)) applies to the campus. "
            "The county's I-85 location and proximity to Hartsfield-Jackson Atlanta "
            "International Airport support operational access."
        ),
        "effective_date": "2017-01-01",
        "status": "active",
        "notes": "Meta Newnan is one of the largest data centers in Georgia outside the Metro Atlanta core.",
        "sources": [
            {"label": "Meta — Newnan, Georgia Data Center", "url": "https://www.facebook.com/datacenter/"},
            {"label": "Georgia Power — Renewable Energy Programs", "url": "https://www.georgiapower.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Kansas – Sedgwick County ──────────────────────────────────────────────
    {
        "fips": "20173",
        "name": "Sedgwick County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center"],
        "title": "Wichita Regional Data Center Hub — Cox / AT&T Telecom Infrastructure",
        "description": (
            "Sedgwick County (Wichita) is Kansas's largest data center market, anchored "
            "by Cox Business's enterprise network, AT&T's Wichita Central Office campus, "
            "and several colocation facilities serving the aviation and manufacturing "
            "sectors. Spirit AeroSystems, Boeing's Wichita operations, and Cessna/Textron "
            "maintain significant enterprise IT infrastructure in the county. "
            "Kansas's High Performance Incentive Program (K.S.A. 74-5065) provides "
            "investment tax credits and sales tax refunds for qualifying technology "
            "companies creating high-wage jobs. Evergy's competitive industrial rates "
            "and Westar Energy's generation assets provide reliable power supply."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Aviation and advanced manufacturing drive Wichita data center demand.",
        "sources": [
            {"label": "Cox Business — Wichita", "url": "https://www.cox.com/business/"},
            {"label": "Kansas Commerce — HPIP Program", "url": "https://www.kansascommerce.gov/program/incentives/high-performance-incentive-program/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Kentucky – Boone County ───────────────────────────────────────────────
    {
        "fips": "21015",
        "name": "Boone County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Northern Kentucky Data Center Hub — Cincinnati Metro / Amazon Air",
        "description": (
            "Boone County (Florence/Hebron), the core of Northern Kentucky, hosts "
            "Amazon Air's CVG hub at Cincinnati/Northern Kentucky Airport (CVG) alongside "
            "significant AWS and enterprise data center facilities. The county's strategic "
            "position at the intersection of I-71, I-75, and I-275 makes it a major "
            "logistics and technology operations hub. Duke Energy Kentucky provides "
            "reliable industrial power at competitive rates. The Ohio River crossing "
            "provides fiber connectivity to Cincinnati's dense carrier ecosystem. "
            "Kentucky's KRS §154.34-030 data center incentive applies to qualifying "
            "Boone County investments meeting capital expenditure thresholds."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Amazon's CVG hub and air cargo operations create significant IT infrastructure demand.",
        "sources": [
            {"label": "Amazon Air — CVG Hub at Hebron, Kentucky", "url": "https://www.amazon.com/"},
            {"label": "Northern Kentucky Tri-ED — Economic Development", "url": "https://www.northernkentucky.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Massachusetts – Suffolk County ────────────────────────────────────────
    {
        "fips": "25025",
        "name": "Suffolk County",
        "state": "Massachusetts",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Boston Data Center Hub — Equinix BO / TierPoint",
        "description": (
            "Suffolk County (Boston) hosts New England's primary data center market. "
            "Equinix operates BO1 through BO5 data centers in Boston's Seaport District "
            "and surrounding area; TierPoint, Markley Group, and One Summer Street "
            "are major colocation facilities. Boston's financial services, biotech, "
            "and academic medical concentration (Harvard, MIT, Mass General) drives "
            "persistent enterprise demand. Eversource's Boston Electric Division provides "
            "dense urban grid access. Massachusetts' Chapter 64H §6(r) provides a sales "
            "tax exemption for computer equipment and software used in data processing, "
            "applying to qualified data center operators."
        ),
        "effective_date": "2005-01-01",
        "status": "active",
        "notes": "Boston is the primary Tier 1 data center market in New England.",
        "sources": [
            {"label": "Equinix — Boston BO Data Centers", "url": "https://www.equinix.com/data-centers/americas-colocation/united-states-colocation/boston-data-centers"},
            {"label": "TierPoint — Boston Data Center", "url": "https://tierpoint.com/data-centers/boston/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── New Jersey – Essex County ─────────────────────────────────────────────
    {
        "fips": "34013",
        "name": "Essex County",
        "state": "New Jersey",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Newark Data Center Hub — Equinix NY7 / Iron Mountain",
        "description": (
            "Essex County (Newark) is one of the US's most significant data center and "
            "internet exchange markets. Equinix NY7 in Newark is among the busiest "
            "internet exchange points on the East Coast, offering sub-1ms latency to "
            "Manhattan. Iron Mountain, Internap, and Digital Realty operate major "
            "facilities in the county. The NJ-2 fiber corridor through Newark supports "
            "massive financial services trading infrastructure. PSEG's NJ transmission "
            "system and PJM interconnection provide highly reliable power. New Jersey's "
            "Urban Enterprise Zone tax incentives apply to qualifying Newark investments."
        ),
        "effective_date": "2005-01-01",
        "status": "active",
        "notes": "Equinix NY7 Newark is one of the top 5 internet exchange points by traffic in North America.",
        "sources": [
            {"label": "Equinix — NY7 Newark Data Center", "url": "https://www.equinix.com/data-centers/americas-colocation/united-states-colocation/new-york-data-centers/ny7"},
            {"label": "Iron Mountain — Newark Data Center", "url": "https://www.ironmountain.com/resources/data-centers"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── New Jersey – Union County ─────────────────────────────────────────────
    {
        "fips": "34039",
        "name": "Union County",
        "state": "New Jersey",
        "level": -1,
        "types": ["data_center"],
        "title": "North Jersey Data Center Corridor — Elizabeth / Linden",
        "description": (
            "Union County anchors the North Jersey fiber and data center corridor through "
            "Elizabeth and Linden. Lightpath (formerly Cablevision) and Zayo Group "
            "operate carrier-neutral dark fiber and data center facilities. The county's "
            "I-278 (Staten Island Expressway) corridor connects to the NY/NJ fiber "
            "ecosystem with direct access to Wall Street's high-frequency trading "
            "infrastructure. PSEG's distribution system provides industrial power. "
            "Elizabeth's Elizabeth Development Company Economic Opportunity Zone "
            "provides property tax abatements for qualifying technology investments."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "High-frequency trading latency requirements drive fiber density through Union County.",
        "sources": [
            {"label": "Lightpath — New Jersey Data Centers", "url": "https://www.lightpath.com/"},
            {"label": "Union County — Economic Development", "url": "https://ucnj.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── New York – Suffolk County ─────────────────────────────────────────────
    {
        "fips": "36103",
        "name": "Suffolk County",
        "state": "New York",
        "level": -1,
        "types": ["data_center"],
        "title": "Long Island Eastern Data Center — Melville / Hauppauge Corridor",
        "description": (
            "Suffolk County hosts Long Island's eastern data center corridor anchored "
            "by Connectiv and DataGryd facilities in Melville and Hauppauge. The "
            "Hauppauge Industrial Park, one of the largest industrial parks in the "
            "Northeast, provides industrial zoning compatible with data center operations. "
            "PSEG Long Island's reliable grid and proximity to trans-Atlantic fiber "
            "cable landing stations support low-latency transatlantic connectivity. "
            "The county's financial services and healthcare IT workloads from "
            "Broadridge Financial Solutions (headquartered in Lake Success, Nassau) "
            "extend into Suffolk. New York's Empire State Digital program applies."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Hauppauge Industrial Park has zoning pre-approved for large industrial electrical loads.",
        "sources": [
            {"label": "Suffolk County IDA — Industrial Development", "url": "https://www.suffolkida.org/"},
            {"label": "PSEG Long Island — Industrial Customer Service", "url": "https://www.psegliny.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── New York – Westchester County ─────────────────────────────────────────
    {
        "fips": "36119",
        "name": "Westchester County",
        "state": "New York",
        "level": -1,
        "types": ["data_center"],
        "title": "NYC Metro Overflow Market — White Plains / Tarrytown Corridor",
        "description": (
            "Westchester County serves as a primary overflow data center market for "
            "New York City operators. Equinix and Iron Mountain operate facilities in "
            "White Plains and Tarrytown; DataBank has a presence in Orangeburg. "
            "The county's Metro-North rail corridor enables operational staff access "
            "from Manhattan (30 minutes). Con Edison provides reliable urban-edge "
            "power with dense substation coverage. Financial services firms including "
            "Mastercard (headquartered in Purchase) and IBM Research (Yorktown Heights) "
            "maintain significant IT infrastructure that drives enterprise colocation "
            "demand. New York's Empire State Digital Investment Program applies to "
            "qualifying Westchester projects."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Westchester proximity to Manhattan financial services is the primary demand driver.",
        "sources": [
            {"label": "Westchester County Office of Economic Development", "url": "https://www.westchestergov.com/"},
            {"label": "Con Edison — Large Commercial & Industrial Service", "url": "https://www.coned.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Ohio – Greene County ──────────────────────────────────────────────────
    {
        "fips": "39057",
        "name": "Greene County",
        "state": "Ohio",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Dayton Metro Defense IT Hub — WPAFB Adjacent Data Centers",
        "description": (
            "Greene County, home to Wright-Patterson Air Force Base (WPAFB), hosts "
            "defense contractor and enterprise data centers serving the Dayton metro. "
            "SAIC, Leidos, Booz Allen Hamilton, and numerous smaller defense IT firms "
            "maintain facilities near WPAFB for AFRL (Air Force Research Laboratory) "
            "contract work. Commercial operators including Expedient serve the "
            "healthcare and manufacturing sectors. Beavercreek, the county's largest "
            "city, has attracted technology investment driven by WPAFB proximity. "
            "AES Ohio (formerly Dayton Power and Light) provides industrial power "
            "under competitive rate structures."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "WPAFB and AFRL are among the largest defense IT consumers in the Midwest.",
        "sources": [
            {"label": "WPAFB — Wright-Patterson Air Force Base", "url": "https://www.wpafb.af.mil/"},
            {"label": "Greene County — Economic Development", "url": "https://www.co.greene.oh.us/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Pennsylvania – Allegheny County ──────────────────────────────────────
    {
        "fips": "42003",
        "name": "Allegheny County",
        "state": "Pennsylvania",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Pittsburgh Data Center Market — Expedient / Iron Mountain",
        "description": (
            "Allegheny County (Pittsburgh) is Pennsylvania's second-largest data center "
            "market. Expedient Data Centers operates its Pittsburgh flagship campus "
            "in the Strip District; Iron Mountain maintains a records and data center "
            "facility. Carnegie Mellon University's proximity has generated demand "
            "for AI and HPC workloads served by colocation facilities in the county. "
            "Duquesne Light and West Penn Power provide industrial electricity with "
            "PJM interconnection access. Pittsburgh's fiber network, built on former "
            "steel mill industrial rights-of-way, supports dense carrier connectivity. "
            "Pennsylvania's Keystone Opportunity Zone program applies to qualifying areas."
        ),
        "effective_date": "2014-01-01",
        "status": "active",
        "notes": "CMU proximity makes Allegheny County a growing AI/ML compute market.",
        "sources": [
            {"label": "Expedient — Pittsburgh Data Center", "url": "https://www.expedient.com/data-centers/pittsburgh/"},
            {"label": "Iron Mountain — Pittsburgh", "url": "https://www.ironmountain.com/resources/data-centers"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Pennsylvania – Delaware County ────────────────────────────────────────
    {
        "fips": "42045",
        "name": "Delaware County",
        "state": "Pennsylvania",
        "level": -1,
        "types": ["data_center"],
        "title": "Philadelphia Suburban Data Center Corridor — Chester / Radnor",
        "description": (
            "Delaware County anchors the Philadelphia western suburban data center "
            "corridor. Flexential and several enterprise operators maintain colocation "
            "facilities in the Route 30 and I-476 technology corridors. The county's "
            "proximity to Philadelphia (10-15 miles) and access to PECO Energy's "
            "suburban grid make it an attractive secondary market. Healthcare IT "
            "workloads from Main Line Health, Crozer Health, and Jefferson Health "
            "drive persistent enterprise demand for HIPAA-compliant colocation. "
            "Delaware County's Keystone Opportunity Zone extensions and the PIDA "
            "loan program support qualifying capital investments."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Philadelphia western suburbs provide lower-cost overflow capacity for Mid-Atlantic enterprise.",
        "sources": [
            {"label": "Delaware County — Economic Development", "url": "https://delcopa.gov/"},
            {"label": "PIDA — Pennsylvania Industrial Development Authority", "url": "https://dced.pa.gov/programs/pennsylvania-industrial-development-authority-pida/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── South Carolina – York County ──────────────────────────────────────────
    {
        "fips": "45091",
        "name": "York County",
        "state": "South Carolina",
        "level": -1,
        "types": ["data_center"],
        "title": "Charlotte Metro Overflow — Rock Hill / Fort Mill Data Center Campus",
        "description": (
            "York County (Rock Hill / Fort Mill) is the primary South Carolina overflow "
            "market for the Charlotte, NC data center corridor. Lower South Carolina "
            "property taxes and utility rates compared to North Carolina have attracted "
            "enterprise operators including TierPoint and Evolent Health's regional IT "
            "infrastructure to Fort Mill. Duke Energy Carolinas provides reliable power "
            "with industrial rates competitive with Charlotte. South Carolina's Tier I "
            "and Tier II job tax credits and the Technology Intensive Facility Act "
            "provide additional incentives for qualifying capital investments exceeding "
            "$25 million."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "York County SC is part of the Charlotte MSA and benefits from cross-border tax differential.",
        "sources": [
            {"label": "York County — Economic Development", "url": "https://yorkcountydevelopment.com/"},
            {"label": "SC Department of Commerce — Technology Incentives", "url": "https://www.sccommerce.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ── 2. AI CAMPUSES ───────────────────────────────────────────────────────────

NEW_CAMPUSES = [
    {
        "id": "ai-ga-003",
        "name": "Meta Newnan Data Center Campus",
        "operator": "Meta",
        "status": "operational",
        "county_fips": "13077",
        "notes": "Meta hyperscale data center in Coweta County GA, I-85 southwest Atlanta corridor.",
        "lon": -84.7999,
        "lat": 33.3807,
    },
    {
        "id": "ai-nj-002",
        "name": "Equinix NY7 Newark Data Center",
        "operator": "Equinix",
        "status": "operational",
        "county_fips": "34013",
        "notes": "Major internet exchange and colocation facility; among top 5 IX points in North America.",
        "lon": -74.1724,
        "lat": 40.7357,
    },
    {
        "id": "ai-ma-001",
        "name": "Equinix BO1 Boston Data Center",
        "operator": "Equinix",
        "status": "operational",
        "county_fips": "25025",
        "notes": "Flagship New England data center; financial services and biotech AI workloads.",
        "lon": -71.0589,
        "lat": 42.3601,
    },
    {
        "id": "ai-pa-001",
        "name": "Expedient Pittsburgh Data Center — Strip District",
        "operator": "Expedient Data Centers",
        "status": "operational",
        "county_fips": "42003",
        "notes": "Pittsburgh flagship campus; CMU AI research proximity drives HPC demand.",
        "lon": -79.9959,
        "lat": 40.4406,
    },
    {
        "id": "ai-sc-002",
        "name": "TierPoint Fort Mill Data Center",
        "operator": "TierPoint",
        "status": "operational",
        "county_fips": "45091",
        "notes": "Charlotte metro overflow enterprise colocation in Fort Mill, York County SC.",
        "lon": -80.9432,
        "lat": 35.0073,
    },
]

# ── 3. TAX INCENTIVES ────────────────────────────────────────────────────────

NEW_INCENTIVES = [
    {
        "state": "KS",
        "program_name": "Kansas High Performance Incentive Program (HPIP)",
        "incentive_type": "Investment Tax Credit + Sales Tax Refund",
        "min_investment_m": 1,
        "notes": (
            "K.S.A. 74-5065: Provides a 10% investment tax credit on qualified capital "
            "expenditures (including data center equipment and construction) for companies "
            "creating minimum-wage jobs at or above 150% of the county median wage. "
            "Companies qualifying for HPIP are also eligible for sales tax refunds on "
            "eligible equipment and machinery purchases. The program has no maximum cap "
            "but requires pre-application approval. Qualifying data center operators in "
            "Johnson and Sedgwick counties have used HPIP for capital equipment credits."
        ),
        "fips_list": ["20091", "20173"],
    },
    {
        "state": "MA",
        "program_name": "Massachusetts Data Processing Equipment Sales Tax Exemption",
        "incentive_type": "Sales Tax Exemption",
        "min_investment_m": None,
        "notes": (
            "M.G.L. ch. 64H §6(r) and (s): Exempts computer equipment and related "
            "software used exclusively in data processing from Massachusetts sales and "
            "use tax. The exemption applies to servers, storage systems, networking "
            "equipment, and cooling systems used in qualifying data center operations. "
            "Massachusetts also offers the Economic Development Incentive Program (EDIP) "
            "providing investment tax credits and TIF (Tax Increment Financing) for "
            "larger qualifying projects. Data center operators in Suffolk, Middlesex, "
            "and Norfolk counties regularly apply for EDIP benefits."
        ),
        "fips_list": ["25025", "25017"],
    },
]

# ── 4. STATE REGULATIONS ─────────────────────────────────────────────────────

NEW_STATE_REGS = {
    "28": {
        "name": "Mississippi",
        "abbr": "MS",
        "level": -1,
        "status": "active",
        "summary": (
            "Mississippi has no statewide AI-specific regulation or dedicated data center "
            "legislation as of 2026. The Mississippi Development Authority (MDA) promotes "
            "data center investment under the state's general economic development programs, "
            "including the Advantage Jobs Rebate (which can apply to technology companies) "
            "and sales tax exemptions for manufacturing equipment that may extend to "
            "qualifying data center machinery. Mississippi Power (Southern Company) and "
            "Entergy Mississippi provide baseload power at competitive industrial rates. "
            "The state's low cost of living, available land, and natural gas generation "
            "resources attract energy-intensive workloads. No AI governance bill has been "
            "introduced in the Mississippi Legislature as of 2025."
        ),
        "types": ["data_center", "energy"],
        "sources": [
            {"label": "Mississippi Development Authority", "url": "https://www.mississippi.org/"},
            {"label": "Mississippi Power — Industrial Rates", "url": "https://www.mississippipower.com/"},
        ],
    },
}

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


def apply_state_regs():
    data = load("state_regulations.json")
    states = data["states"]
    added = 0
    for fips2, reg in NEW_STATE_REGS.items():
        if fips2 in states:
            print(f"  SKIP state_reg {fips2} ({reg['abbr']}) — already exists")
            continue
        states[fips2] = reg
        added += 1
        print(f"  +state_reg {fips2} {reg['name']}")
    save("state_regulations.json", data)
    return added


if __name__ == "__main__":
    print("=== Sweep E ===")
    r = apply_restrictions()
    c = apply_campuses()
    i = apply_incentives()
    s = apply_state_regs()
    print(f"\nSweep E complete: +{r} restrictions, +{c} campuses, +{i} incentives, +{s} state regs")
