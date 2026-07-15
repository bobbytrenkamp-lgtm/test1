"""
Sweep G  —  2026-07-15
12 new county restrictions · 5 AI campuses · 2 tax incentives · 2 state regs
Targets: Pulaski AR, Black Hawk IA, Johnson IA, Jefferson Parish LA, Orleans LA,
         Hampden MA, Boone MO, St Charles MO, St Louis City MO, Guilford NC,
         Tulsa OK, Midland TX
New states for regs: AK, HI
New states for incentives: CA, RI
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
    # ── Arkansas – Pulaski County ─────────────────────────────────────────────
    {
        "fips": "05119",
        "name": "Pulaski County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center"],
        "title": "Little Rock Data Center Hub — Windstream HQ / State Government IT",
        "description": (
            "Pulaski County (Little Rock) is Arkansas's primary data center market. "
            "Windstream Communications (now Kinetic Business) is headquartered in "
            "Little Rock and operates major network data center facilities in the county. "
            "Arkansas state government IT infrastructure, consolidated under the "
            "Department of Transformation and Shared Services (DTS), is anchored here. "
            "Entergy Arkansas provides reliable power from a mix of nuclear, natural gas, "
            "and renewables. Arkansas's data center sales tax exemption (A.C.A. §26-52-465) "
            "applies to qualifying server hardware and networking equipment purchases. "
            "The University of Arkansas for Medical Sciences (UAMS) generates additional "
            "healthcare IT demand."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Windstream HQ makes Little Rock a fiber/telecom infrastructure anchor for the mid-South.",
        "sources": [
            {"label": "Windstream / Kinetic Business — Little Rock", "url": "https://www.windstream.com/"},
            {"label": "Arkansas DTS — State Data Center Consolidation", "url": "https://dts.arkansas.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Iowa – Black Hawk County ──────────────────────────────────────────────
    {
        "fips": "19013",
        "name": "Black Hawk County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center"],
        "title": "Waterloo / Cedar Falls Data Center — John Deere IT / MidWestOne",
        "description": (
            "Black Hawk County (Waterloo/Cedar Falls) hosts enterprise IT infrastructure "
            "anchored by John Deere's major operations and technology campus. Deere's "
            "precision agriculture and connected equipment platforms generate significant "
            "edge computing and data center demand. MidWestOne Financial Group and "
            "UnityPoint Health-Waterloo drive additional healthcare and financial IT "
            "loads. Iowa's data center sales tax exemption (Iowa Code §423.3(47A)) "
            "applies to qualifying server and power equipment. MidAmerican Energy's "
            "industrial rates and growing renewable portfolio support the county's "
            "technology sector."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "John Deere's precision agriculture platform creates unique edge computing demand in the county.",
        "sources": [
            {"label": "John Deere — Waterloo Operations Center", "url": "https://www.deere.com/"},
            {"label": "Iowa Economic Development Authority — Data Center Incentives", "url": "https://www.iowaeconomicdevelopment.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Iowa – Johnson County ─────────────────────────────────────────────────
    {
        "fips": "19103",
        "name": "Johnson County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "University of Iowa Research Computing — Iowa City Data Center",
        "description": (
            "Johnson County (Iowa City) hosts the University of Iowa's research computing "
            "infrastructure and University of Iowa Health Care's enterprise IT platform. "
            "The UI's ITS Oakdale Research Park campus includes high-performance computing "
            "and data storage facilities. ACT (formerly known as American College Testing) "
            "maintains major enterprise data center operations in Iowa City. "
            "Iowa's data center sales tax exemption (Iowa Code §423.3(47A)) applies. "
            "MidAmerican Energy provides power with an expanding renewable portfolio. "
            "UI Health Care's Epic EMR system is among the largest academic health "
            "information systems in the Midwest."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "UI Health Care's Epic system drives significant enterprise data center demand in Johnson County.",
        "sources": [
            {"label": "University of Iowa — ITS Research Computing", "url": "https://its.uiowa.edu/"},
            {"label": "ACT — Iowa City Operations", "url": "https://www.act.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Louisiana – Jefferson Parish ──────────────────────────────────────────
    {
        "fips": "22051",
        "name": "Jefferson Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center"],
        "title": "New Orleans Metro Data Center Hub — Metairie / Kenner",
        "description": (
            "Jefferson Parish (Metairie/Kenner) is the core of the greater New Orleans "
            "metropolitan data center market. AT&T's major Central Office complex in "
            "Metairie and Lumen Technologies' regional network hub serve the Gulf Coast "
            "oil and gas, maritime, and financial services sectors. Post-Katrina data "
            "center investments were upgraded for flood resilience with raised equipment "
            "floors and improved generator backup. The parish benefits from Entergy "
            "Louisiana's Gulf Coast power system. Louisiana's Quality Jobs Program "
            "rebate (R.S. 51:2453) and the Digital Media tax credit (R.S. 47:6022) "
            "apply to qualifying technology operators."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Post-Katrina DC upgrades make Jefferson Parish facilities more resilient than pre-2005 standards.",
        "sources": [
            {"label": "Jefferson Parish — Economic Development", "url": "https://www.jeffparish.net/"},
            {"label": "LED — Quality Jobs Program", "url": "https://www.opportunitylouisiana.gov/business-incentives/quality-jobs"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Louisiana – Orleans Parish ────────────────────────────────────────────
    {
        "fips": "22071",
        "name": "Orleans Parish",
        "state": "Louisiana",
        "level": -1,
        "types": ["data_center"],
        "title": "New Orleans Data Center — Cologix / NTT Gulf Coast Hub",
        "description": (
            "Orleans Parish (New Orleans) hosts Cologix's New Orleans carrier-neutral "
            "colocation campus and NTT Global Data Centers' Gulf Coast facility, serving "
            "as the primary subsea cable and fiber interconnection hub for the Gulf of "
            "Mexico energy sector. The parish's dense fiber infrastructure, developed "
            "over decades to serve offshore energy operations, provides low-latency "
            "connectivity to Houston and Atlanta. Energy Transfer Partners, Chevron, "
            "and Shell maintain significant enterprise IT workloads. Entergy New Orleans "
            "provides urban grid service; the city has invested in grid hardening post-Ida "
            "improvements. Louisiana's Quality Jobs Program applies."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "New Orleans is the fiber hub for Gulf of Mexico deepwater energy operations.",
        "sources": [
            {"label": "Cologix — New Orleans Data Center", "url": "https://www.cologix.com/data-centers/new-orleans/"},
            {"label": "New Orleans Business Alliance — Technology Sector", "url": "https://www.neworleansbusinessalliance.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Massachusetts – Hampden County ────────────────────────────────────────
    {
        "fips": "25013",
        "name": "Hampden County",
        "state": "Massachusetts",
        "level": -1,
        "types": ["data_center"],
        "title": "Springfield Data Center — Western Massachusetts Regional Hub",
        "description": (
            "Hampden County (Springfield) hosts the primary data center market for "
            "western Massachusetts. Baystate Health's enterprise IT campus and Liberty "
            "Mutual Insurance's Springfield operations generate healthcare and financial "
            "services IT demand. Zayo Group and Eversource Energy's Western MA division "
            "serve the regional market. Springfield's lower real estate costs compared "
            "to Boston make it an attractive DR and secondary site for New England "
            "enterprises. Massachusetts' §64H §6(r) data processing equipment sales tax "
            "exemption applies. The I-91 fiber corridor provides connectivity to Hartford "
            "CT and Albany NY."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Springfield is the primary data center market between Boston and Hartford.",
        "sources": [
            {"label": "Baystate Health — Springfield, MA", "url": "https://www.baystatehealth.org/"},
            {"label": "MassDevelopment — Western MA Economic Development", "url": "https://www.massdevelopment.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Missouri – Boone County ───────────────────────────────────────────────
    {
        "fips": "29019",
        "name": "Boone County",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Columbia Data Center — University of Missouri Research Computing",
        "description": (
            "Boone County (Columbia) hosts the University of Missouri's research "
            "computing and data management infrastructure. MU's Informatics Institute "
            "and MU Health Care's enterprise Epic system drive significant academic "
            "and healthcare IT demand. Midcontinent Communications and Socket Telecom "
            "provide regional carrier services. Columbia's position on the I-70 fiber "
            "corridor between St. Louis and Kansas City supports enterprise connectivity. "
            "Missouri's data center tax credit (§135.1610 RSMo) provides investment "
            "credits for qualifying large data center projects. Ameren Missouri provides "
            "industrial power with growing renewable capacity."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "MU research computing and MU Health Care are the primary IT infrastructure drivers.",
        "sources": [
            {"label": "University of Missouri — Research Computing", "url": "https://missouri.edu/"},
            {"label": "Missouri S&T / MU — IT Infrastructure", "url": "https://it.missouri.edu/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Missouri – St. Charles County ────────────────────────────────────────
    {
        "fips": "29183",
        "name": "St. Charles County",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "St. Louis West Suburb Data Center — WWT / Enterprise Tech Corridor",
        "description": (
            "St. Charles County (O'Fallon/St. Charles) is the rapidly growing western "
            "suburb of St. Louis hosting World Wide Technology (WWT), one of the largest "
            "technology services companies in the US, whose headquarters in Maryland "
            "Heights (St. Louis County border area) extends infrastructure into St. "
            "Charles County. Enterprise data centers serving the county's "
            "financial services and manufacturing base use Ameren Missouri's "
            "industrial rates. The St. Charles County Economic Development Centre "
            "actively recruits technology employers under Missouri's Enhanced Enterprise "
            "Zone program. The I-70 and I-64 fiber corridors provide connectivity."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "St. Charles County is one of the fastest-growing counties in Missouri; WWT's presence anchors tech demand.",
        "sources": [
            {"label": "World Wide Technology (WWT) — Maryland Heights/St. Louis", "url": "https://www.wwt.com/"},
            {"label": "St. Charles County EDC — Technology", "url": "https://www.sccmo.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Missouri – St. Louis City ─────────────────────────────────────────────
    {
        "fips": "29510",
        "name": "St. Louis City",
        "state": "Missouri",
        "level": -1,
        "types": ["data_center"],
        "title": "St. Louis Data Center Hub — Equinix STL / GreenStreet",
        "description": (
            "St. Louis City (an independent city-county equivalent under Missouri law) "
            "hosts major data center and internet exchange infrastructure. Equinix STL1 "
            "in downtown St. Louis is the primary Midwest internet exchange point west of "
            "Chicago. GreenStreet Data Centers, Centene Corporation's enterprise IT "
            "platform, and Mastercard's global operations hub generate significant "
            "colocation demand. Ameren Missouri's urban grid provides reliable power. "
            "Missouri's data center investment tax credit (§135.1610 RSMo) and the "
            "St. Louis Development Corporation's TIF program support qualifying projects. "
            "St. Louis City's central US location on the Mississippi River fiber corridor "
            "provides low-latency paths east to Chicago and west to Kansas City."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "St. Louis City is an independent city separate from St. Louis County under Missouri law.",
        "sources": [
            {"label": "Equinix — STL1 St. Louis Data Center", "url": "https://www.equinix.com/data-centers/americas-colocation/united-states-colocation/st-louis-data-centers/stl1"},
            {"label": "St. Louis Development Corporation", "url": "https://www.stlouis-mo.gov/government/departments/sldc/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── North Carolina – Guilford County ─────────────────────────────────────
    {
        "fips": "37081",
        "name": "Guilford County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center"],
        "title": "Greensboro Enterprise Data Center — VF Corp / HanesBrands IT",
        "description": (
            "Guilford County (Greensboro/High Point) hosts enterprise data center "
            "infrastructure driven by major corporate IT operations. VF Corporation "
            "(North Face, Timberland), HanesBrands, and Volvo Financial Services "
            "maintain significant IT campuses. Tier1 Cloud and Unitedstack provide "
            "regional colocation services. Duke Energy's Piedmont division provides "
            "industrial power. Greensboro is a key node on the I-85 technology corridor "
            "between Charlotte and Raleigh-Durham. North Carolina's data center "
            "investment requirements (including the Article 3F tax exemption for "
            "qualifying investments) apply to eligible Guilford County facilities."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "VF Corp and HanesBrands' corporate IT campuses are the primary enterprise anchor in Guilford County.",
        "sources": [
            {"label": "VF Corporation — Greensboro, NC", "url": "https://www.vfc.com/"},
            {"label": "Greensboro-Guilford County EDC", "url": "https://www.greensboroedc.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Oklahoma – Tulsa County ───────────────────────────────────────────────
    {
        "fips": "40143",
        "name": "Tulsa County",
        "state": "Oklahoma",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Tulsa Energy IT Hub — Williams Companies / ONEOK / Magellan",
        "description": (
            "Tulsa County is Oklahoma's second-largest data center market, anchored "
            "by energy sector IT infrastructure for pipeline and midstream operators. "
            "Williams Companies, ONEOK, and Magellan Midstream maintain major enterprise "
            "IT campuses managing critical pipeline operations, SCADA systems, and "
            "energy trading platforms. Lumen Technologies and Cox Communications "
            "provide carrier-grade connectivity. OG&E (Oklahoma Gas and Electric) and "
            "Public Service Company of Oklahoma (AEP subsidiary) provide industrial power. "
            "Oklahoma's data center incentive (68 O.S. §1370.9 — computer data center "
            "sales tax exemption) applies to qualifying Tulsa County facilities."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Pipeline IT and midstream operations data centers distinguish Tulsa from conventional DC markets.",
        "sources": [
            {"label": "Williams Companies — Tulsa, Oklahoma", "url": "https://www.williams.com/"},
            {"label": "Tulsa EDC — Technology Sector", "url": "https://www.tulsaedc.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── Texas – Midland County ────────────────────────────────────────────────
    {
        "fips": "48329",
        "name": "Midland County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Permian Basin Energy IT Hub — Midland Oilfield Operations Data Center",
        "description": (
            "Midland County is the operational headquarters of the Permian Basin, "
            "the world's most productive oil field, generating enormous data center "
            "and edge computing demand for oilfield IT, reservoir modeling, seismic "
            "data processing, and SCADA systems. Pioneer Natural Resources (ExxonMobil), "
            "Diamondback Energy, and ConocoPhillips maintain major operations centers. "
            "Lumen Technologies, Permian Basin Petroleum Association networks, and "
            "regional fiber carriers serve the energy IT market. Oncor's West Texas "
            "transmission system provides power. Texas's Chapter 312 property tax "
            "abatements apply to qualifying data center investments."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Permian Basin digital oilfield operations create unique, high-volume data center demand for seismic and SCADA.",
        "sources": [
            {"label": "Pioneer Natural Resources — Midland, TX Operations", "url": "https://www.pxd.com/"},
            {"label": "Midland Development Corporation", "url": "https://www.midlanddc.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ── 2. AI CAMPUSES ───────────────────────────────────────────────────────────

NEW_CAMPUSES = [
    {
        "id": "ai-ar-001",
        "name": "Windstream / Kinetic Business Network Data Center — Little Rock",
        "operator": "Windstream / Kinetic",
        "status": "operational",
        "county_fips": "05119",
        "notes": "Windstream HQ campus; major mid-South fiber/telecom network data center.",
        "lon": -92.2896,
        "lat": 34.7465,
    },
    {
        "id": "ai-la-001",
        "name": "Cologix New Orleans Data Center",
        "operator": "Cologix",
        "status": "operational",
        "county_fips": "22071",
        "notes": "Primary carrier-neutral internet exchange and Gulf energy sector colocation hub.",
        "lon": -90.0715,
        "lat": 29.9511,
    },
    {
        "id": "ai-mo-001",
        "name": "Equinix STL1 St. Louis Data Center",
        "operator": "Equinix",
        "status": "operational",
        "county_fips": "29510",
        "notes": "Primary Midwest internet exchange west of Chicago; Mastercard and Centene enterprise hub.",
        "lon": -90.1994,
        "lat": 38.6270,
    },
    {
        "id": "ai-nc-002",
        "name": "Tier1 Cloud Greensboro Data Center",
        "operator": "Tier1 Cloud",
        "status": "operational",
        "county_fips": "37081",
        "notes": "Enterprise colocation serving VF Corp, HanesBrands and Piedmont NC corridor.",
        "lon": -79.7910,
        "lat": 36.0726,
    },
    {
        "id": "ai-ok-003",
        "name": "Williams Companies Tulsa Operations Data Center",
        "operator": "Williams Companies",
        "status": "operational",
        "county_fips": "40143",
        "notes": "Critical pipeline SCADA and midstream operations IT infrastructure in Tulsa.",
        "lon": -95.9928,
        "lat": 36.1540,
    },
]

# ── 3. TAX INCENTIVES ────────────────────────────────────────────────────────

NEW_INCENTIVES = [
    {
        "state": "CA",
        "program_name": "California Competes Tax Credit (CalCompetes)",
        "incentive_type": "Income Tax Credit (Negotiated)",
        "min_investment_m": 1,
        "notes": (
            "GO-Biz (Governor's Office of Business and Economic Development) — CalCompetes: "
            "A negotiated income tax credit for businesses that want to come to California "
            "or stay and grow in California. Awards are based on number of jobs, wages, "
            "investment amount, economic impact, and strategic importance to the state. "
            "Data center operators qualifying as technology infrastructure companies have "
            "received CalCompetes awards for qualifying capital investment and job creation. "
            "Separate from the statewide sales tax exemption for manufacturing and R&D "
            "equipment (Ca. Rev. and Tax Code §6377.1) which may also apply to data center "
            "server and power equipment in qualifying R&D contexts."
        ),
        "fips_list": ["06085", "06081", "06075", "06001", "06037", "06065", "06071", "06019", "06059", "06013"],
    },
    {
        "state": "RI",
        "program_name": "Rhode Island Rebuild RI Tax Credit",
        "incentive_type": "Tax Credit (up to 20-30% of qualified costs)",
        "min_investment_m": 5,
        "notes": (
            "R.I. Gen. Laws §44-48.3 (Rebuild Rhode Island Tax Credit): Provides a "
            "tax credit of up to 20% (or 30% for distressed areas) of qualified "
            "project costs for commercial and industrial development, including data "
            "center construction and renovation. Qualifying projects must create a "
            "minimum of 25 new full-time jobs or invest at least $5 million in a "
            "qualified area. Credits are allocated by the Rhode Island Commerce "
            "Corporation on a competitive basis. The program has been used for "
            "technology infrastructure investments in Providence County."
        ),
        "fips_list": ["44007"],
    },
]

# ── 4. STATE REGULATIONS ─────────────────────────────────────────────────────

NEW_STATE_REGS = {
    "02": {
        "name": "Alaska",
        "abbr": "AK",
        "level": -1,
        "status": "active",
        "summary": (
            "Alaska has no statewide AI-specific regulation or dedicated data center "
            "legislation as of 2026. The state's remote geography and high utility "
            "costs (diesel power in many areas) limit commercial data center development. "
            "GCI (General Communication Inc.) and Alaska Communications maintain "
            "telecom infrastructure and small data center assets in Anchorage and "
            "Fairbanks. The Trans-Alaska Pipeline System (TAPS) and North Slope oil "
            "operations generate industrial IT and edge computing demand. "
            "Alaska has no personal income tax and no state sales tax, making equipment "
            "acquisition favorable for the limited commercial data center market. "
            "The Federal government (DoD, Coast Guard, NOAA) is the primary driver of "
            "data center investment in the state."
        ),
        "types": ["data_center"],
        "sources": [
            {"label": "Alaska Dept. of Commerce — Business Programs", "url": "https://www.commerce.alaska.gov/"},
            {"label": "GCI — Alaska Network Infrastructure", "url": "https://www.gci.com/"},
        ],
    },
    "15": {
        "name": "Hawaii",
        "abbr": "HI",
        "level": -1,
        "status": "active",
        "summary": (
            "Hawaii has no statewide AI-specific regulation or dedicated data center "
            "legislation as of 2026. The state's high electricity costs (among the "
            "highest in the US due to oil-fired generation, though rapidly transitioning "
            "to renewables) make conventional data center operations expensive. "
            "Hawaiian Telcom (Consolidated Communications) and Lumen/CenturyLink "
            "maintain carrier-grade network data center infrastructure. Pacific subsea "
            "cable landing sites in Oahu (including the SEA-US and TGN-IA cables) "
            "create strategic interconnection value for trans-Pacific workloads. "
            "Hawaii's 100% renewable portfolio standard by 2045 (HRS §269-92) "
            "is reshaping the power cost structure for large loads. "
            "No AI governance bill has been enacted as of 2025."
        ),
        "types": ["data_center", "energy"],
        "sources": [
            {"label": "Hawaii PUC — Energy Regulation", "url": "https://puc.hawaii.gov/"},
            {"label": "Hawaiian Telcom — Data Center Services", "url": "https://hawaiiantel.com/"},
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
    print("=== Sweep G ===")
    r = apply_restrictions()
    c = apply_campuses()
    i = apply_incentives()
    s = apply_state_regs()
    print(f"\nSweep G complete: +{r} restrictions, +{c} campuses, +{i} incentives, +{s} state regs")
