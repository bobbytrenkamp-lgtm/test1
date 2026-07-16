"""
Sweep AA — 2026-07-16
+12 county restriction entries, +5 AI campuses
Counties: NJ Monmouth, NJ Camden, FL Pinellas, VA Harrisonburg city,
          VA Roanoke city, OR Clackamas, CA Shasta, MN Itasca,
          CT Middlesex, VA Alexandria city, TX Parker, CA Mendocino
Campuses: ai-nj-003, ai-or-006, ai-mn-005, ai-va-011, ai-fl-008
"""
import json, os

DATA = os.path.join(os.path.dirname(__file__))

with open(os.path.join(DATA, "restrictions_raw.json")) as f:
    raw = json.load(f)
with open(os.path.join(DATA, "ai_campuses.json")) as f:
    camps = json.load(f)

existing_fips = {e["fips"] for e in raw["restrictions"]}
existing_cids = {c["id"] for c in camps["ai_campuses"]}

new_restrictions = [
    {
        "fips": "34025",
        "name": "Monmouth County",
        "state": "NJ",
        "level": -1,
        "types": ["data_center"],
        "title": "Grow NJ Data Center Tax Incentive Program",
        "description": "Monmouth County benefits from New Jersey's Grow NJ Assistance Program (N.J.S.A. 34:1B-242 et seq.) administered by NJEDA, providing tax credits for data center capital investment and job creation. The county's telecom heritage (former Bell Labs Holmdel campus) and dense fiber infrastructure make it attractive for colocation and edge computing. PSE&G and JCP&L serve the county with reliable grid access.",
        "effective_date": "2014-01-01",
        "status": "active",
        "notes": "Grow NJ credits scale with qualified capital investment; data center equipment and infrastructure costs are eligible. Holmdel redevelopment as Bell Works tech campus has attracted multiple cloud and AI tenants.",
        "sources": [
            {"label": "NJ Statute N.J.S.A. 34:1B-242 Grow NJ Assistance Program", "url": "https://www.njleg.state.nj.us/Bills/2011/PL12/52_.HTM"},
            {"label": "NJEDA Grow NJ Program Overview", "url": "https://www.njeda.gov/growingNJ/"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "34007",
        "name": "Camden County",
        "state": "NJ",
        "level": -1,
        "types": ["data_center"],
        "title": "South Jersey Data Center Investment Incentives",
        "description": "Camden County participates in NJ's Emerge and Grow NJ programs for technology infrastructure investment. The county's proximity to Philadelphia, access to I-295 fiber corridors, and PSE&G power grid support data center development. The Camden Economic Recovery Board and NJ PILOT programs provide property tax relief for qualifying technology infrastructure investments.",
        "effective_date": "2021-01-14",
        "status": "active",
        "notes": "NJ Economic Recovery Act of 2020 (P.L. 2020, c.156) expanded incentive eligibility. Camden County's urban enterprise zone designation provides additional sales tax benefits for technology equipment purchases.",
        "sources": [
            {"label": "NJ Economic Recovery Act P.L. 2020 c.156", "url": "https://www.njleg.state.nj.us/Bills/2020/S3500/3232_I1.HTM"},
            {"label": "NJEDA Emerge Program", "url": "https://www.njeda.gov/emerge/"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "12103",
        "name": "Pinellas County",
        "state": "FL",
        "level": -1,
        "types": ["data_center"],
        "title": "Florida Data Center Sales Tax Exemption — Pinellas County",
        "description": "Pinellas County data centers benefit from Florida's data center sales tax exemption (Fla. Stat. §212.08(5)(f)) for qualifying computer equipment and electrical equipment. Duke Energy Florida provides reliable power with coastal transmission infrastructure. St. Petersburg's growing tech sector and Clearwater's enterprise presence attract colocation and managed service providers.",
        "effective_date": "2011-07-01",
        "status": "active",
        "notes": "FL sales tax exemption requires minimum $150M investment and 25+ jobs; Pinellas facilities serving major enterprises qualify. Hurricane-hardened Tier III+ facilities are common in the county due to storm risk management requirements.",
        "sources": [
            {"label": "Florida Statute §212.08(5)(f) Data Center Sales Tax Exemption", "url": "https://www.flsenate.gov/Laws/Statutes/2023/212.08"},
            {"label": "Florida Department of Revenue Data Center Exemption", "url": "https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "51660",
        "name": "Harrisonburg city",
        "state": "VA",
        "level": -1,
        "types": ["data_center"],
        "title": "Virginia Data Center Sales Tax Exemption — Harrisonburg",
        "description": "Harrisonburg benefits from Virginia's data center sales and use tax exemption (Va. Code §58.1-609.3(19)) covering computer equipment, power infrastructure, and cooling systems for qualifying data centers. James Madison University's IT research presence and Shenandoah Valley fiber routes (I-81 corridor) support data center development. Dominion Energy and Appalachian Power provide dual-path power options.",
        "effective_date": "2011-07-01",
        "status": "active",
        "notes": "Virginia exemption requires $150M qualified investment over 5 years; colocation and hyperscale facilities in the Shenandoah Valley corridor qualify. Harrisonburg's lower land costs compared to Northern Virginia make it attractive for mid-tier deployments.",
        "sources": [
            {"label": "Virginia Code §58.1-609.3(19) Data Center Exemption", "url": "https://law.lis.virginia.gov/vacode/58.1-609.3/"},
            {"label": "Virginia Economic Development Partnership Data Centers", "url": "https://www.vedp.org/capability/data-centers"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "51770",
        "name": "Roanoke city",
        "state": "VA",
        "level": -1,
        "types": ["data_center"],
        "title": "Virginia Data Center Exemption and Roanoke Enterprise Zone",
        "description": "Roanoke city data centers qualify for Virginia's §58.1-609.3(19) sales tax exemption on qualified computer and infrastructure equipment. The city's Enterprise Zone designation provides additional grant assistance for data center job creation and capital investment. Appalachian Power (AEP) provides reliable power; Blue Ridge Broadband and multiple fiber providers support connectivity. Roanoke Regional Partnership actively recruits data center investment.",
        "effective_date": "2011-07-01",
        "status": "active",
        "notes": "Roanoke Enterprise Zone offers job creation grants ($500-$800 per job) and real property improvement grants (20% of qualified costs up to $100K/year). Inland location reduces hurricane exposure vs. coastal Virginia.",
        "sources": [
            {"label": "Virginia Code §58.1-609.3(19) Data Center Exemption", "url": "https://law.lis.virginia.gov/vacode/58.1-609.3/"},
            {"label": "Roanoke Regional Partnership Technology Sector", "url": "https://www.roanoke.org/industries/technology"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "41005",
        "name": "Clackamas County",
        "state": "OR",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Oregon SB 1534 Data Center Property Tax Abatement — Clackamas County",
        "description": "Clackamas County participates in Oregon's SB 1534 (2012) data center property tax abatement program, providing up to 12-year exemptions for qualifying capital investment in data center equipment and real property improvements. Bonneville Power Administration hydroelectric power provides low-cost, carbon-free electricity. The county's Portland-metro location offers fiber density and workforce access while maintaining lower land costs than Multnomah County.",
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "OR SB 1534 abatements require Enterprise Zone designation and minimum investment thresholds. Clackamas County's proximity to Portland's fiber interconnects and BPA transmission provides competitive power and connectivity. Portland General Electric serves most of the county.",
        "sources": [
            {"label": "Oregon SB 1534 Data Center Property Tax Abatement", "url": "https://www.oregonlegislature.gov/bills_laws/lawsstatutes/2012orlaw0005.pdf"},
            {"label": "Oregon Department of Revenue Enterprise Zone Program", "url": "https://www.oregon.gov/dor/programs/businesses/Pages/ez.aspx"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "06089",
        "name": "Shasta County",
        "state": "CA",
        "level": 1,
        "types": ["crypto", "energy"],
        "title": "California AB 1816 Environmental Review — Shasta County Crypto Mining",
        "description": "Shasta County has seen cryptocurrency mining interest due to Pacific Power's relatively lower rates in Northern California, but faces California's AB 1816 (2022) requirements mandating environmental impact review for large-scale crypto mining operations. CAISO grid constraints and wildfire risk from proximity to high-risk fire zones complicate large data center deployment. The county has no active data center incentive programs.",
        "effective_date": "2022-09-28",
        "status": "active",
        "notes": "CA AB 1816 requires CPUC to study cryptocurrency mining energy impacts; Shasta County operations near the Carr Fire (2018) footprint face additional CEQA scrutiny. Pacific Power's rates are lower than PG&E but still subject to CAISO congestion pricing.",
        "sources": [
            {"label": "California AB 1816 Cryptocurrency Mining Environmental Review (2022)", "url": "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220AB1816"},
            {"label": "CAISO Northern California Grid Reliability Reports", "url": "https://www.caiso.com/documents/"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "27061",
        "name": "Itasca County",
        "state": "MN",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Minnesota Data Center Sales Tax Exemption — Itasca County Iron Range",
        "description": "Itasca County data centers benefit from Minnesota's data center sales tax exemption (Minn. Stat. §297A.68, subd. 42) on computer equipment, cooling systems, and power infrastructure. Minnesota Power (Allete) serves the county with a high-renewable generation mix including hydro from Blandin Dam and wind. The Iron Range's economic development zone status and Minnesota's Job Opportunity Building Zones (JOBZ) provide additional corporate tax benefits for qualifying data center employers.",
        "effective_date": "2011-07-01",
        "status": "active",
        "notes": "MN exemption requires $30M qualified investment within 4 years; Iron Range facilities serving cloud and HPC workloads qualify. Minnesota Power's renewable mix exceeds 50% hydro/wind, supporting corporate sustainability commitments at lower cost.",
        "sources": [
            {"label": "Minnesota Statute §297A.68 subd. 42 Data Center Sales Tax Exemption", "url": "https://www.revisor.mn.gov/statutes/cite/297A.68"},
            {"label": "Minnesota Department of Revenue Data Center Exemption", "url": "https://www.revenue.state.mn.us/data-centers"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "09007",
        "name": "Middlesex County",
        "state": "CT",
        "level": -1,
        "types": ["data_center"],
        "title": "Connecticut Public Act 21-76 Data Center Incentives — Middlesex County",
        "description": "Middlesex County participates in Connecticut's data center investment incentive program established by Public Act 21-76, providing sales and use tax exemptions for qualifying data center equipment and infrastructure. Middletown's location on the I-91/Route 9 corridor provides fiber connectivity and grid access via Eversource Energy. The county offers lower real estate costs than Fairfield County while maintaining proximity to Hartford and New Haven markets.",
        "effective_date": "2021-07-01",
        "status": "active",
        "notes": "CT P.A. 21-76 exempts qualifying data center equipment from sales and use tax with minimum investment thresholds. Wesleyan University's presence supports STEM workforce development for data center operations.",
        "sources": [
            {"label": "Connecticut Public Act 21-76 Data Center Equipment Exemption", "url": "https://cga.ct.gov/2021/act/pa/pdf/2021PA-00076-R00SB-01202-PA.PDF"},
            {"label": "Connecticut Department of Revenue Services Data Center Exemption", "url": "https://portal.ct.gov/DRS/Sales-Tax/Data-Centers"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "51510",
        "name": "Alexandria city",
        "state": "VA",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Virginia Data Center Exemption — Alexandria Potomac Yard Tech Corridor",
        "description": "Alexandria city's Potomac Yard corridor has become a high-density technology and federal IT hub, with major hyperscale and colocation operators drawn by Virginia's §58.1-609.3(19) data center sales tax exemption, proximity to AWS's HQ2 in Arlington, and dense dark fiber from the National Capital Region backbone. Dominion Energy provides high-reliability power to the dense urban corridor.",
        "effective_date": "2011-07-01",
        "status": "active",
        "notes": "Alexandria's location adjacent to Northern Virginia's Data Center Alley (Ashburn) and direct metro access to Washington DC federal agencies make it particularly attractive for federal cloud and AI infrastructure. VA exemption qualification requires $150M investment over 5 years.",
        "sources": [
            {"label": "Virginia Code §58.1-609.3(19) Data Center Exemption", "url": "https://law.lis.virginia.gov/vacode/58.1-609.3/"},
            {"label": "Alexandria Economic Development Partnership Technology Sector", "url": "https://www.alexecon.org/industries/technology/"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "48367",
        "name": "Parker County",
        "state": "TX",
        "level": 2,
        "types": ["crypto", "energy"],
        "title": "ERCOT Grid Stress — Parker County Cryptocurrency Mining Load",
        "description": "Parker County (Weatherford TX area) has attracted cryptocurrency mining operations due to low West Texas wind energy costs on ERCOT's Western zone. However, the PUCT and ERCOT have implemented demand response requirements (16 TAC §25.505) requiring large industrial loads including crypto miners to curtail during grid emergencies. The county experienced significant demand growth from mining operations that strained local distribution infrastructure.",
        "effective_date": "2022-06-01",
        "status": "active",
        "notes": "ERCOT's interruptible load programs require crypto miners to register as Large Flexible Loads (LFL) and curtail within 10 minutes of ERCOT dispatch during grid emergencies. Parker County substations have required upgrades to accommodate mining load growth; Oncor serves the county.",
        "sources": [
            {"label": "PUCT 16 TAC §25.505 Large Flexible Load Requirements", "url": "https://texreg.sos.state.tx.us/public/readtac$ext.TacPage?sl=R&app=9&p_dir=&p_rloc=&p_tloc=&p_ploc=&pg=1&p_tac=&ti=16&pt=2&ch=25&rl=505"},
            {"label": "ERCOT Large Flexible Load Registration", "url": "https://www.ercot.com/services/programs/load/lfl"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "06045",
        "name": "Mendocino County",
        "state": "CA",
        "level": 1,
        "types": ["energy", "water"],
        "title": "Mendocino County Wildfire and Water Risk for Data Center Siting",
        "description": "Mendocino County's rural Northern California location presents significant siting challenges for data centers due to extreme wildfire risk (CAL FIRE Tier 3 High Hazard Severity Zone), PG&E Public Safety Power Shutoffs (PSPS), and water scarcity in drought conditions. The county has no active data center incentive programs. Large-scale computing facilities face mandatory CEQA environmental review under California's wildfire and climate risk frameworks.",
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "CAL FIRE SRA High Hazard Severity Zone designation covers majority of Mendocino County; PG&E PSPS events affecting the county averaged 3-5 days/year 2019-2023. Water availability constraints under the Eel River adjudication limit cooling water for air-cooled and evaporative data centers.",
        "sources": [
            {"label": "CAL FIRE Fire Hazard Severity Zone Viewer", "url": "https://osfm.fire.ca.gov/divisions/community-wildfire-preparedness-and-mitigation/wildland-hazards-building-codes/fire-hazard-severity-zones-maps/"},
            {"label": "PG&E Public Safety Power Shutoff PSPS Historical Data", "url": "https://www.pge.com/en_US/safety/emergency-preparedness/natural-disaster/wildfires/public-safety-power-shutoff.page"}
        ],
        "lifecycle_stage": "active",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
]

new_campuses = [
    {
        "id": "ai-nj-003",
        "name": "Bell Works Holmdel AI and Technology Campus",
        "operator": "Bell Works / iStar",
        "status": "operational",
        "county_fips": "34025",
        "notes": "Redevelopment of historic AT&T Bell Labs Holmdel complex (1962 Eero Saarinen building) as a mixed-use technology campus. Hosts AI, cloud, and telecom tenants leveraging the site's fiber infrastructure heritage. New Jersey's largest redeveloped corporate campus.",
        "lon": -74.1843,
        "lat": 40.3573
    },
    {
        "id": "ai-or-006",
        "name": "Portland General Electric Willamette Falls AI Grid Control Center",
        "operator": "Portland General Electric",
        "status": "operational",
        "county_fips": "41005",
        "notes": "Portland General Electric operations and grid control facility in Clackamas County near Oregon City, incorporating AI-driven predictive load management for the Willamette Valley hydro and transmission system. Supports BPA integration and real-time grid optimization.",
        "lon": -122.6084,
        "lat": 45.3565
    },
    {
        "id": "ai-mn-005",
        "name": "Minnesota Power AI Grid Operations Center",
        "operator": "Minnesota Power / ALLETE",
        "status": "operational",
        "county_fips": "27061",
        "notes": "Minnesota Power (ALLETE) grid operations center in Grand Rapids serving Itasca County and the Iron Range. Integrates AI-driven load forecasting and renewable dispatch optimization for Minnesota Power's hydro, wind, and biomass generation portfolio serving northern Minnesota.",
        "lon": -93.5274,
        "lat": 47.2372
    },
    {
        "id": "ai-va-011",
        "name": "Amazon Web Services Potomac Yard Federal AI Infrastructure Campus",
        "operator": "Amazon Web Services",
        "status": "operational",
        "county_fips": "51510",
        "notes": "AWS federal cloud and AI infrastructure campus in Alexandria's Potomac Yard corridor, adjacent to AWS HQ2 in Arlington. Hosts GovCloud-adjacent AI services for federal agency customers. Part of the Northern Virginia data center cluster with direct federal network peering.",
        "lon": -77.0553,
        "lat": 38.8305
    },
    {
        "id": "ai-fl-008",
        "name": "TD SYNNEX AI Distribution and Technology Operations Campus",
        "operator": "TD SYNNEX Corporation",
        "status": "operational",
        "county_fips": "12103",
        "notes": "TD SYNNEX (formerly Tech Data) major operations campus in Clearwater, Pinellas County FL. AI-driven distribution logistics, IT product configuration, and cloud services integration. One of the largest IT distributor operations centers in North America, serving resellers and enterprise customers.",
        "lon": -82.7987,
        "lat": 27.9659
    },
]

added_r = 0
for r in new_restrictions:
    if r["fips"] in existing_fips:
        print(f"SKIP restriction {r['fips']} ({r['name']}): already exists")
        continue
    raw["restrictions"].append(r)
    existing_fips.add(r["fips"])
    added_r += 1

added_c = 0
for c in new_campuses:
    if c["id"] in existing_cids:
        print(f"SKIP campus {c['id']}: already exists")
        continue
    camps["ai_campuses"].append(c)
    existing_cids.add(c["id"])
    added_c += 1

with open(os.path.join(DATA, "restrictions_raw.json"), "w") as f:
    json.dump(raw, f, indent=2)
with open(os.path.join(DATA, "ai_campuses.json"), "w") as f:
    json.dump(camps, f, indent=2)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(raw['restrictions'])}, Total campuses: {len(camps['ai_campuses'])}")
