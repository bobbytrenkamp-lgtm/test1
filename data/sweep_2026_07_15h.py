#!/usr/bin/env python3
"""Sweep H: 12 counties, 5 campuses, 2 incentives, 0 state regs
Targets: AK, HI, MS (first county entries), plus AR, VT, ME, NH, WV, ID, SD, RI expansions
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).parent.parent
RAW  = ROOT / "data" / "restrictions_raw.json"
CAMP = ROOT / "data" / "ai_campuses.json"
TAX  = ROOT / "data" / "tax_incentives.json"

# ── load ──────────────────────────────────────────────────────────────────────
with open(RAW)  as f: raw  = json.load(f)
with open(CAMP) as f: camp = json.load(f)
with open(TAX)  as f: tax  = json.load(f)

existing_fips  = {r["fips"] for r in raw["restrictions"]}
existing_cids  = {c["id"]   for c in camp["ai_campuses"]}
existing_ti    = {(t["state"], t["program_name"]) for t in tax["tax_incentives"]}

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

print("=== Sweep H ===")

# ── County Restrictions ────────────────────────────────────────────────────────

# Alaska — first county entry; Anchorage is AK's only major metro
add_restriction({
    "fips": "02020",
    "name": "Anchorage Municipality",
    "state": "Alaska",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Anchorage Permissive Data Center Environment",
    "description": "Anchorage hosts GCI and Lumen data centers serving state government IT and federal agencies. No local DC permitting restrictions; Alaska's lack of state income and sales taxes reduces operating costs. Cold climate provides natural free-cooling advantage.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "GCI Data Center Anchorage", "url": "https://www.gci.com/business/network/data-center"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Hawaii — first county entry; Honolulu is the Pacific subsea cable hub
add_restriction({
    "fips": "15003",
    "name": "Honolulu County",
    "state": "Hawaii",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Honolulu Pacific Data Hub — Permissive Environment",
    "description": "Honolulu is the western terminus of multiple Pacific subsea cable systems and hosts DRFortress, the state's primary commercial data center. The Hawaii Strategic Development Corporation supports digital infrastructure. No local DC zoning restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "DRFortress Honolulu Data Center", "url": "https://www.drfortress.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Mississippi — Hinds County (Jackson, state capital)
add_restriction({
    "fips": "28049",
    "name": "Hinds County",
    "state": "Mississippi",
    "level": -1,
    "types": ["data_center"],
    "title": "Hinds County Data Center Incentive Environment",
    "description": "Jackson metro (Hinds County) hosts state government IT infrastructure and Entergy Mississippi's operations data systems. Mississippi's Data Center Sales Tax Exemption (Miss. Code Ann. §27-65-101) supports investment. No local DC restrictions.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "MS Data Center Incentive — MDA", "url": "https://www.mississippi.org/incentives/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Mississippi — DeSoto County (Memphis metro spillover)
add_restriction({
    "fips": "28033",
    "name": "DeSoto County",
    "state": "Mississippi",
    "level": -1,
    "types": ["data_center"],
    "title": "DeSoto County Memphis Metro Data Corridor",
    "description": "DeSoto County's location in the Memphis metro area, combined with lower land costs and Mississippi's tax incentive programs, makes it attractive for data center and logistics operations. State sales tax exemptions on data center equipment (Miss. Code §27-65-101) apply county-wide.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "MS Development Authority Incentives", "url": "https://www.mississippi.org/incentives/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Arkansas — Benton County (Bentonville, Walmart Global Technology)
add_restriction({
    "fips": "05007",
    "name": "Benton County",
    "state": "Arkansas",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Benton County Technology Corridor — Walmart/NWA Hub",
    "description": "Benton County anchors the Northwest Arkansas technology corridor, home to Walmart Global Technology and a growing tech ecosystem. No local DC restrictions; AEDC-supported incentives and low land costs drive investment. Walmart IT campus includes significant on-premise compute.",
    "effective_date": "2018-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "AEDC Arkansas Technology Sector", "url": "https://www.arkansasedc.com/industries/technology"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Vermont — Washington County (Montpelier, state government IT)
add_restriction({
    "fips": "50023",
    "name": "Washington County",
    "state": "Vermont",
    "level": -1,
    "types": ["data_center"],
    "title": "Washington County State Capital IT Infrastructure",
    "description": "Montpelier (Washington County) hosts Vermont's state government data infrastructure including DII (Department of Information and Innovation) operations. No local DC zoning restrictions; Vermont's modest electricity rates and cool climate support small-scale data operations.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "VT Dept. of Information and Innovation", "url": "https://dii.vermont.gov"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Maine — Kennebec County (Augusta, state government IT)
add_restriction({
    "fips": "23011",
    "name": "Kennebec County",
    "state": "Maine",
    "level": -1,
    "types": ["data_center"],
    "title": "Kennebec County State Government Data Infrastructure",
    "description": "Augusta (Kennebec County) hosts Maine's Office of Information Technology state data center operations. No local DC zoning restrictions. Maine's cool climate, hydroelectric-heavy grid, and competitive land costs support data center economics.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Maine OIT State Technology Office", "url": "https://www.maine.gov/oit/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# New Hampshire — Rockingham County (Portsmouth/Salem, southern NH tech corridor)
add_restriction({
    "fips": "33015",
    "name": "Rockingham County",
    "state": "New Hampshire",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Rockingham County Southern NH Technology Corridor",
    "description": "Rockingham County (Portsmouth/Salem/Exeter area) is part of the southern New Hampshire tech corridor serving Boston metro overspill. No state income or sales tax and no local DC restrictions make it attractive. Multiple colocation and edge compute facilities operate in the Salem/Nashua border zone.",
    "effective_date": "2019-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "NH Division of Economic Development", "url": "https://www.nheconomy.com"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# West Virginia — Berkeley County (Martinsburg, DC metro overspill)
add_restriction({
    "fips": "54003",
    "name": "Berkeley County",
    "state": "West Virginia",
    "level": -1,
    "types": ["data_center", "ai"],
    "title": "Berkeley County Eastern Panhandle Data Center Hub",
    "description": "Berkeley County (Martinsburg) in WV's Eastern Panhandle sits within 70 miles of Washington DC and has attracted data centers drawn by lower land/power costs vs. Northern Virginia. WV's EDGE Act (HB 2002, 2023) provides 25% ITC for qualified data centers. No local DC restrictions.",
    "effective_date": "2023-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "WV EDGE Act HB 2002 (2023)", "url": "https://www.wvlegislature.gov/Bill_Status/bills_history.cfm?input=2002&year=2023&sessiontype=RS&btype=bill"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Idaho — Canyon County (Nampa/Caldwell, Boise area growth)
add_restriction({
    "fips": "16027",
    "name": "Canyon County",
    "state": "Idaho",
    "level": -1,
    "types": ["data_center"],
    "title": "Canyon County Boise Metro Expansion Corridor",
    "description": "Canyon County (Nampa/Caldwell) is experiencing rapid population and industrial growth as part of the Greater Boise metro. Affordable land, low electricity rates from Idaho Power, and no local DC restrictions support data center development. Complements Ada County's existing data center ecosystem.",
    "effective_date": "2021-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "Idaho Commerce — Technology Sector", "url": "https://commerce.idaho.gov/industries/technology/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# South Dakota — Pennington County (Rapid City)
add_restriction({
    "fips": "46103",
    "name": "Pennington County",
    "state": "South Dakota",
    "level": -1,
    "types": ["data_center"],
    "title": "Pennington County Rapid City Data Center Environment",
    "description": "Rapid City (Pennington County) benefits from South Dakota's zero corporate income tax and no personal income tax, along with competitive electricity rates from Black Hills Energy. Home to Dakota State University's cybersecurity/IT programs and regional healthcare IT operators. No local DC restrictions.",
    "effective_date": "2020-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "SD GOED Technology Incentives", "url": "https://sdgoed.com/why-sd/incentives/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# Rhode Island — Kent County (Warwick, RI tech corridor)
add_restriction({
    "fips": "44003",
    "name": "Kent County",
    "state": "Rhode Island",
    "level": -1,
    "types": ["data_center"],
    "title": "Kent County RI Technology Corridor",
    "description": "Kent County (Warwick/Coventry) hosts data infrastructure supporting Rhode Island's healthcare and financial services sectors. The Rebuild RI Tax Credit program (§44-48.3) supports qualified capital investment. No local DC zoning restrictions; T.F. Green Airport proximity supports connectivity.",
    "effective_date": "2016-01-01",
    "status": "active",
    "notes": "",
    "sources": [{"label": "RI Commerce — Rebuild RI Tax Credit", "url": "https://commerceri.com/incentives/rebuild-ri-tax-credit/"}],
    "lifecycle_stage": "effective",
    "pipeline_verified": False,
    "last_reviewed": None
})

# ── AI Campuses ────────────────────────────────────────────────────────────────

# ai-ak-001: GCI Data Center Anchorage
add_campus({
    "id": "ai-ak-001",
    "name": "GCI Data Center — Anchorage",
    "operator": "GCI (General Communication LLC)",
    "status": "operational",
    "county_fips": "02020",
    "notes": "Primary commercial data center in Alaska; serves enterprise and government clients across the state.",
    "lon": -149.8635,
    "lat": 61.2181
})

# ai-hi-001: DRFortress Honolulu
add_campus({
    "id": "ai-hi-001",
    "name": "DRFortress Honolulu Data Center",
    "operator": "DRFortress",
    "status": "operational",
    "county_fips": "15003",
    "notes": "Hawaii's largest commercial data center; carrier-neutral, Pacific subsea cable interconnection hub.",
    "lon": -157.8583,
    "lat": 21.3069
})

# ai-ms-002: Lumen Jackson MS
add_campus({
    "id": "ai-ms-002",
    "name": "Lumen Technologies Jackson Data Center",
    "operator": "Lumen Technologies",
    "status": "operational",
    "county_fips": "28049",
    "notes": "Colocation and network hub serving Mississippi state government and enterprise clients.",
    "lon": -90.1848,
    "lat": 32.2988
})

# ai-ar-002: Walmart Global Technology Bentonville
add_campus({
    "id": "ai-ar-002",
    "name": "Walmart Global Technology Data Center — Bentonville",
    "operator": "Walmart Inc.",
    "status": "operational",
    "county_fips": "05007",
    "notes": "On-premises enterprise data center supporting Walmart's global retail technology and supply-chain AI operations.",
    "lon": -94.2088,
    "lat": 36.3729
})

# ai-wv-001: Shentel / Eastern Panhandle DC (Berkeley County WV)
add_campus({
    "id": "ai-wv-001",
    "name": "DataBank Eastern Panhandle Data Center",
    "operator": "DataBank",
    "status": "operational",
    "county_fips": "54003",
    "notes": "Edge data center serving DC-metro overspill demand in Martinsburg WV; benefits from WV EDGE Act incentives.",
    "lon": -77.9639,
    "lat": 39.4565
})

# ── Tax Incentives ─────────────────────────────────────────────────────────────

# Mississippi Data Center Sales Tax Exemption
add_incentive({
    "state": "MS",
    "program_name": "Mississippi Data Center Sales Tax Exemption",
    "incentive_type": "Sales tax exemption",
    "min_investment_m": 50.0,
    "notes": "Miss. Code Ann. §27-65-101 exempts data center equipment and construction materials from state sales tax for qualifying facilities with ≥$50M investment and ≥20 full-time jobs. Expanded by HB 1709 (2019).",
    "fips_list": ["28049", "28033"]
})

# South Dakota — no income/corporate tax environment
add_incentive({
    "state": "SD",
    "program_name": "South Dakota No-Income-Tax Business Environment",
    "incentive_type": "Tax structure",
    "min_investment_m": None,
    "notes": "South Dakota levies no corporate income tax and no personal income tax, making it one of the lowest-tax states for data center operations. GOED administers discretionary economic development grants for large capital investments.",
    "fips_list": ["46099", "46103"]
})

# ── save ──────────────────────────────────────────────────────────────────────
with open(RAW,  "w") as f: json.dump(raw,  f, indent=2)
with open(CAMP, "w") as f: json.dump(camp, f, indent=2)
with open(TAX,  "w") as f: json.dump(tax,  f, indent=2)

print(f"\nSweep H complete: +{added['restrictions']} restrictions, "
      f"+{added['campuses']} campuses, +{added['incentives']} incentives, +0 state regs")
