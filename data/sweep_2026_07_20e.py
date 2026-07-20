#!/usr/bin/env python3
"""
Sweep E — 2026-07-20 — FIPS corrections
Fixes 11 entries where the stored county name does not match the canonical
county at that FIPS code (introduced by sweeps C/D using off-by-two FIPS).
Also adds 2 entries for counties that were intended but coded under the
wrong FIPS: Upshur County TX (48459) and Laurel County KY (21123).
"""

import json

DATA_PATH = "data"

with open(f"{DATA_PATH}/restrictions_raw.json") as f:
    data = json.load(f)
restrictions = data["restrictions"]
existing_fips = {e["fips"] for e in restrictions}

# ---------------------------------------------------------------------------
# Corrections: update in-place by FIPS (name + all dependent fields)
# ---------------------------------------------------------------------------

CORRECTIONS = {
    # ---- Texas (8) --------------------------------------------------------
    "48083": {
        "name": "Coleman County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Coleman County TX — AEP/WTU West Texas Territory & Chapter 403 Data Center Exemption",
        "description": (
            "Coleman County (Coleman, TX) is a sparsely populated West Texas agricultural "
            "county in the ERCOT grid, served by West Texas Utilities (an AEP subsidiary). "
            "Abundant wind generation potential and flat rangeland make it suitable for "
            "large industrial footprints. Coleman County qualifies for the Texas Chapter 403 "
            "data center sales tax exemption (TX Tax Code §151.359) and the Texas Enterprise "
            "Zone program. Low population density and favorable county appraisal caps under "
            "Chapter 381 agreements support large-campus development. No active restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "AEP/WTU ERCOT West zone; Ch.403 exemption eligible; low land cost; Ch.381 abatement available.",
        "sources": [
            {"label": "Coleman County TX Appraisal District", "url": "https://www.colemancad.org/"},
            {"label": "AEP West Texas Utilities — Tariff Book", "url": "https://www.aeptexas.com/customers/tariff/"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Texas Enterprise Zone Program — Governor's Office", "url": "https://gov.texas.gov/business/page/texas-enterprise-zone-program"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "48199": {
        "name": "Hardin County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Hardin County TX — Golden Triangle Industrial Corridor & Entergy Texas Service Area",
        "description": (
            "Hardin County (Kountze/Silsbee, TX) lies in the Neches River bottomlands of "
            "Southeast Texas's Golden Triangle industrial corridor (Beaumont–Port Arthur–Orange). "
            "The county is served by Entergy Texas with competitive large-industrial rates. "
            "Neches River floodplain is mapped FEMA Special Flood Hazard Area; inland industrial "
            "parcels avoid this constraint. Hardin County qualifies for the Texas Chapter 403 "
            "data center exemption and Texas Enterprise Zone benefits via TEDC. Timber and "
            "petrochemical infrastructure provide stable utility and logistics networks."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Entergy Texas service area; FEMA SFHA near Neches River bottomlands; Ch.403 eligible.",
        "sources": [
            {"label": "Hardin County TX — Commissioner's Court", "url": "https://www.hardincountytx.com/"},
            {"label": "Entergy Texas — Large Industrial Rates & Tariffs", "url": "https://www.entergytexas.com/our-company/rates-tariffs"},
            {"label": "FEMA Flood Map Service Center", "url": "https://msc.fema.gov/portal/home"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "48203": {
        "name": "Harrison County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Harrison County TX — East Texas SWEPCO/AEP Territory & Chapter 403 Incentive",
        "description": (
            "Harrison County (Marshall, TX) is in deep East Texas, served by SWEPCO "
            "(Southwestern Electric Power Company, an AEP subsidiary). The county has abundant "
            "natural gas pipeline infrastructure from legacy East Texas oil production. Marshall "
            "is a historic rail junction with BNSF and Union Pacific freight access. Harrison "
            "County participates in the Texas Chapter 403 data center sales tax exemption and "
            "state Enterprise Zone designation. The City of Marshall EDC offers performance "
            "agreements for large employers requiring substantial capital investment."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "SWEPCO/AEP territory; natural gas pipeline network; Marshall EDC performance agreements; Ch.403.",
        "sources": [
            {"label": "Harrison County TX Appraisal District", "url": "https://www.harrisoncad.org/"},
            {"label": "SWEPCO — Texas Large Power Service Tariff", "url": "https://www.swepco.com/global/utilities/lib/docs/info/tariffs/tx-tariff.pdf"},
            {"label": "City of Marshall TX — Economic Development", "url": "https://www.marshalltexas.net/economic-development"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "48221": {
        "name": "Hood County",
        "state": "Texas",
        "level": 1,
        "types": ["data_center", "energy"],
        "title": "Hood County TX — DFW Exurban Growth & Oncor 138 kV Transmission Capacity Review",
        "description": (
            "Hood County (Granbury, TX) is on the southern fringe of the Dallas–Fort Worth "
            "Metroplex, served by Oncor Electric Delivery. The county's 138 kV transmission "
            "infrastructure is approaching capacity as DFW suburban growth accelerates; large "
            "load interconnections above 5 MW may require Oncor transmission-upgrade cost "
            "assignments under ERCOT interconnection protocols. Hood County participates in the "
            "Texas Chapter 403 data center tax exemption and multi-year county appraisal "
            "limitations under the Texas Economic Development Act. No moratorium is in place, "
            "but a grid capacity review adds timeline risk for high-density campuses."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "Oncor 138 kV near-capacity; ERCOT interconnection study required >5 MW; Ch.403 eligible.",
        "sources": [
            {"label": "Hood County TX — Official Website", "url": "https://www.co.hood.tx.us/"},
            {"label": "Oncor Electric Delivery — Wholesale & Interconnection", "url": "https://www.oncor.com/EN/OurCompany/Pages/Wholesale.aspx"},
            {"label": "ERCOT — Transmission Planning Documents", "url": "https://www.ercot.com/gridinfo/trans"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "48231": {
        "name": "Hunt County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Hunt County TX — Greenville Industrial Heritage & Chapter 403 Data Center Incentive",
        "description": (
            "Hunt County (Greenville, TX) is 45 miles northeast of Dallas, served by Oncor "
            "Electric Delivery in the ERCOT North zone. Greenville's industrial tradition — "
            "anchored by Majors Field Airport and former L-3/Raytheon presence — provides "
            "a trained workforce and robust utility infrastructure. Blackland Prairie geology "
            "provides stable, low-subsidence ground for large building footprints. Hunt County "
            "participates in the Texas Chapter 403 data center exemption and offers Chapter 381 "
            "county abatements for qualified capital investments."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Oncor ERCOT North zone; Greenville EDC tax abatement available; Ch.403 and Ch.381 eligible.",
        "sources": [
            {"label": "Hunt County TX — Commissioner's Court", "url": "https://www.huntcounty.net/"},
            {"label": "City of Greenville TX — Economic Development", "url": "https://greenvilletx.gov/economy/"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Oncor Electric Delivery — ERCOT North Zone", "url": "https://www.oncor.com/EN/OurCompany/Pages/Wholesale.aspx"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "48237": {
        "name": "Jack County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Jack County TX — North-Central TX Mineral Belt & ERCOT North Zone Incentive",
        "description": (
            "Jack County (Jacksboro, TX) is in the Mineral Wells–Palo Pinto region of "
            "North-Central Texas, served by Oncor Electric Delivery in the ERCOT North zone. "
            "The county has a legacy of oil and gas production and sits within 60 miles of "
            "Fort Worth. Jack County participates in the Texas Chapter 403 data center "
            "exemption and is eligible for Chapter 381 county abatements. Rural land values "
            "and stable limestone geology support large industrial site development with "
            "minimal subsidence risk. No active data center restrictions."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Oncor ERCOT North zone; Ch.403 data center exemption; limestone bedrock; rural land costs.",
        "sources": [
            {"label": "Jack County TX Appraisal District", "url": "https://www.jackcad.org/"},
            {"label": "Oncor Electric Delivery — Tariff & Rates", "url": "https://www.oncor.com/EN/OurCompany/Pages/Wholesale.aspx"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "ERCOT — North Load Zone Reference", "url": "https://www.ercot.com/gridinfo/load/load_hist"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "48391": {
        "name": "Refugio County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Refugio County TX — South Texas O&G Infrastructure & AEP Texas Central Territory",
        "description": (
            "Refugio County (Refugio, TX) is a sparsely populated South Texas coastal county "
            "with significant oil and gas pipeline infrastructure, served by AEP Texas Central "
            "(formerly Central Power and Light) in the ERCOT South zone. The county borders "
            "the Aransas National Wildlife Refuge, requiring federal ESA Section 7 consultation "
            "for projects near the coast; inland industrial parcels are unaffected. Refugio "
            "County qualifies for Texas Chapter 403 data center tax exemptions and Enterprise "
            "Zone benefits. AEP Texas Central's large-industrial rate schedules are competitive "
            "for high-load operations."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "AEP Texas Central ERCOT South zone; ESA Section 7 near ANWR coast; Ch.403 eligible.",
        "sources": [
            {"label": "Refugio County TX — Official Website", "url": "https://refugiocounty.net/"},
            {"label": "AEP Texas — Large Power & Transmission Tariffs", "url": "https://www.aeptexas.com/customers/tariff/"},
            {"label": "USFWS — Aransas National Wildlife Refuge", "url": "https://www.fws.gov/refuge/aransas"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "48461": {
        "name": "Upton County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Upton County TX — Permian Basin Core & WTU/AEP Renewable-Ready Chapter 403 Incentive",
        "description": (
            "Upton County (McCamey/Rankin, TX) is in the heart of the Permian Basin, one of "
            "the world's most productive oil and gas regions, and is also home to the McCamey "
            "Wind Farm cluster. The county is served by West Texas Utilities (AEP) in the "
            "ERCOT West zone with abundant co-located renewable generation. Permian Basin "
            "energy infrastructure provides multiple natural gas backup options and dense fiber "
            "connectivity through O&G operational networks. Upton County qualifies for Texas "
            "Chapter 403 data center exemptions; low land costs favor large renewable-powered "
            "campuses."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "WTU/AEP ERCOT West zone; Permian Basin O&G plus McCamey wind; Ch.403 eligible.",
        "sources": [
            {"label": "Upton County TX Appraisal District", "url": "https://www.uptoncad.org/"},
            {"label": "AEP West Texas Utilities — Tariff Book", "url": "https://www.aeptexas.com/customers/tariff/"},
            {"label": "ERCOT — West Load Zone Generation Resources", "url": "https://www.ercot.com/gridinfo/resource"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ---- Kentucky (2) -----------------------------------------------------
    "21117": {
        "name": "Knott County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Knott County KY — Appalachian Coal Heritage, ARC Distressed Designation & KEDFA Incentives",
        "description": (
            "Knott County (Hindman, KY) is a former coal-producing county in eastern Kentucky "
            "served by Kentucky Power (an AEP subsidiary) and East Kentucky Power Cooperative "
            "(EKPC). The county holds ARC (Appalachian Regional Commission) Distressed "
            "designation, qualifying projects for federal POWER+ Initiative grants and coal "
            "severance tax replacement funds. Kentucky KEDFA KBI (Kentucky Business Investment) "
            "incentives offer wage assessment credits and reduced payroll tax burdens for "
            "qualifying new employers. Federal BEAD broadband grants reach the county seat "
            "of Hindman, improving connectivity for digital infrastructure projects."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "ARC Distressed; POWER+ Initiative eligible; KEDFA KBI wage credit; KY Power/EKPC service.",
        "sources": [
            {"label": "Knott County KY — Official Website", "url": "https://www.knottcounty.com/"},
            {"label": "Kentucky Power (AEP) — Eastern Kentucky Service Territory", "url": "https://www.kentuckypower.com/"},
            {"label": "ARC — Distressed Counties & POWER+ Initiative", "url": "https://www.arc.gov/distressed-communities/"},
            {"label": "KEDFA — Kentucky Business Investment Program", "url": "https://ced.ky.gov/Incentives/Kentucky_Business_Investment"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    "21125": {
        "name": "Lawrence County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Lawrence County KY — Big Sandy Region ARC Incentives & Kentucky Power Territory",
        "description": (
            "Lawrence County (Louisa, KY) occupies the Big Sandy River valley on the "
            "Kentucky–West Virginia border, served by Kentucky Power (AEP). ARC Distressed "
            "designation and POWER+ Initiative eligibility provide federal economic development "
            "incentives for new industries. Kentucky KEDFA KBI incentives include wage "
            "assessment credits up to 100% of withholding tax for up to 15 years. The "
            "county's proximity to the Big Sandy coalfield provides existing heavy-electrical "
            "infrastructure and skilled technical workforce. No active restrictions on data "
            "center development."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "ARC Distressed; KY Power/AEP service; KEDFA KBI and POWER+ eligible; Big Sandy infrastructure.",
        "sources": [
            {"label": "Lawrence County KY — Official Website", "url": "https://lawrencecountykygov.com/"},
            {"label": "Kentucky Power (AEP) — Eastern Kentucky", "url": "https://www.kentuckypower.com/"},
            {"label": "ARC — POWER+ Initiative for Coal Communities", "url": "https://www.arc.gov/power-initiative/"},
            {"label": "KEDFA — Kentucky Business Investment Program", "url": "https://ced.ky.gov/Incentives/Kentucky_Business_Investment"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ---- North Carolina (1) -----------------------------------------------
    "37047": {
        "name": "Columbus County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Columbus County NC — Tier 1 JDIG County & Duke Energy Progress Incentive Territory",
        "description": (
            "Columbus County (Whiteville, NC) is in southeastern North Carolina, served by "
            "Duke Energy Progress. As a Tier 1 county under North Carolina's Job Development "
            "Investment Grant (JDIG) program, Columbus County offers the maximum 80% wage "
            "credit reimbursement for qualified new jobs. The county also benefits from "
            "G.S. §105-275(45), which exempts qualifying data center equipment from real and "
            "personal property taxation. Rural land costs and proximity to the I-74 corridor "
            "support large industrial campus development. No active restrictions on data centers."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "NC Tier 1 JDIG (80% wage credit); G.S. §105-275(45) equipment exemption; Duke Energy Progress.",
        "sources": [
            {"label": "Columbus County NC — Economic Development", "url": "https://www.columbusco.org/economic-development"},
            {"label": "NC Commerce — JDIG Tier 1 Job Grants", "url": "https://www.nccommerce.com/jdig"},
            {"label": "NC G.S. §105-275(45) — Data Center Equipment Exemption", "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-275.html"},
            {"label": "Duke Energy Progress — North Carolina Rates", "url": "https://www.duke-energy.com/home/products/north-carolina"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
}

correction_count = 0
for entry in restrictions:
    if entry["fips"] in CORRECTIONS:
        corr = CORRECTIONS[entry["fips"]]
        for key, val in corr.items():
            entry[key] = val
        correction_count += 1
        print(f"  Corrected {entry['fips']} -> {corr['name']}")

print(f"Corrections applied: {correction_count}")

# ---------------------------------------------------------------------------
# New entries — counties intended by earlier sweeps, now correctly coded
# ---------------------------------------------------------------------------

new_entries = []

if "48459" not in existing_fips:
    new_entries.append({
        "fips": "48459",
        "name": "Upshur County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Upshur County TX — East Texas SWEPCO/AEP Pineywoods Territory & Chapter 403 Incentive",
        "description": (
            "Upshur County (Gilmer, TX) is in the Pineywoods of East Texas, served by SWEPCO "
            "(Southwestern Electric Power Company, AEP) and Wood County Electric Cooperative. "
            "The county lies within the Sabine River watershed with dense East Texas timber "
            "land and natural gas pipeline corridors providing energy backup options. Gilmer is "
            "the county seat and has existing industrial zoning. Upshur County qualifies for "
            "the Texas Chapter 403 data center exemption and Chapter 381 county abatements for "
            "qualifying projects. No active restrictions on data center construction."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "SWEPCO/AEP and WCEC cooperative territory; East TX Pineywoods; Ch.403 and Ch.381 eligible.",
        "sources": [
            {"label": "Upshur County TX — Commissioner's Court", "url": "https://www.co.upshur.tx.us/"},
            {"label": "SWEPCO — Texas Large Power Service Tariff", "url": "https://www.swepco.com/global/utilities/lib/docs/info/tariffs/tx-tariff.pdf"},
            {"label": "Wood County Electric Cooperative", "url": "https://www.wcec.net/"},
            {"label": "TX Comptroller — Chapter 403 Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    })

if "21123" not in existing_fips:
    new_entries.append({
        "fips": "21123",
        "name": "Laurel County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Laurel County KY — I-75 Corridor Hub & KEDFA KBI / KEIA Data Center Incentives",
        "description": (
            "Laurel County (London, KY) sits on the I-75 corridor in southeastern Kentucky, "
            "one of the most strategically located counties in the state for logistics-adjacent "
            "data center development. The county is served by Duke Energy Kentucky and East "
            "Kentucky Power Cooperative (EKPC). Laurel County qualifies for Kentucky KEDFA KBI "
            "(Kentucky Business Investment) wage assessment credits and the Kentucky Enterprise "
            "Initiative Act (KEIA) sales tax refund on construction materials. The county has "
            "a record of manufacturing investment and an affordable industrial land market. "
            "No active restrictions on data centers."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "I-75 corridor access; Duke Energy KY/EKPC service; KEDFA KBI (15-yr wage credit) and KEIA eligible.",
        "sources": [
            {"label": "Laurel County KY Economic Development — London KY", "url": "https://www.laurelcountyky.gov/economic-development"},
            {"label": "Duke Energy Kentucky — Industrial Service Rates", "url": "https://www.duke-energy.com/home/products/kentucky"},
            {"label": "KEDFA — Kentucky Business Investment Program", "url": "https://ced.ky.gov/Incentives/Kentucky_Business_Investment"},
            {"label": "Kentucky Enterprise Initiative Act (KEIA) — Cabinet for Economic Development", "url": "https://ced.ky.gov/Incentives/Kentucky_Enterprise_Initiative_Act"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    })

restrictions.extend(new_entries)
print(f"New entries added: {len(new_entries)}")

data["restrictions"] = restrictions
with open(f"{DATA_PATH}/restrictions_raw.json", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print(f"Total restrictions: {len(restrictions)}")
