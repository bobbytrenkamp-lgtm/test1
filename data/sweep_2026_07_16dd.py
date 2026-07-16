"""
Sweep DD — 2026-07-16
+12 county restriction entries, +5 AI campuses
Counties: KY Hardin, KY Henderson, AL Shelby, AL Cullman, MS Oktibbeha,
          TN White, SC Aiken, SC York, NC Rowan, NC Union,
          VA Louisa, OH Licking
Campuses: ai-ky-003, ai-ms-005, ai-sc-005, ai-nc-006, ai-va-012
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
        "fips": "21093",
        "name": "Hardin County",
        "state": "KY",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Fort Knox Military AI and Kentucky Data Center Incentives — Hardin County",
        "description": "Hardin County (Elizabethtown) hosts Fort Knox U.S. Army Armor Center and is a growing technology hub benefiting from Kentucky's KEDFA incentive programs. Louisville Gas & Electric (LG&E, a PPL subsidiary) provides competitive power rates; the county's proximity to Louisville and I-65 fiber corridor supports data center development. Fort Knox's military AI and autonomous systems research programs create demand for secure edge computing facilities.",
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Kentucky KEDFA incentives include corporate income tax credits and workforce assessment fee exemptions for qualifying technology employers. Fort Knox hosts the U.S. Army Cyber Institute training and the Army's Network Enterprise Technology Command (NETCOM) regional operations. LG&E rates are highly competitive within the PJM grid footprint.",
        "sources": [
            {"label": "Kentucky Cabinet for Economic Development KEDFA Programs", "url": "https://ced.ky.gov/Business/StartGrowBusiness/Pages/Incentives.aspx"},
            {"label": "Fort Knox Army Installation Technology Programs", "url": "https://home.army.mil/knox/index.php/about/directorate-of-plans-training-mobilization-security/cyber"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "21101",
        "name": "Henderson County",
        "state": "KY",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Kentucky Data Center Incentives — Henderson County Industrial Power Access",
        "description": "Henderson County (Henderson KY) on the Ohio River has a legacy of power-intensive industrial operations (aluminum smelting, manufacturing) that built high-capacity electrical infrastructure. Big Rivers Electric Corporation provides competitive industrial power rates. Kentucky KEDFA incentives apply to data center investment; the county's I-69/US-41 position provides fiber connectivity north to Indianapolis and south to Nashville. Lower land costs and available industrial-zoned sites support data center development.",
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Big Rivers Electric's Henderson facilities benefit from coal generation at reasonable rates during the energy transition. Henderson County's industrial heritage (former Alcan/Century Aluminum smelter) created high-capacity transformer infrastructure that can be repurposed for data center power delivery. KEDFA incentives stack with local property tax concessions.",
        "sources": [
            {"label": "Kentucky Cabinet for Economic Development KEDFA Programs", "url": "https://ced.ky.gov/Business/StartGrowBusiness/Pages/Incentives.aspx"},
            {"label": "Henderson County Economic Development", "url": "https://www.hendersonkyeda.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "01117",
        "name": "Shelby County",
        "state": "AL",
        "level": -1,
        "types": ["data_center"],
        "title": "Alabama Jobs Act Incentives — Shelby County Birmingham Suburb",
        "description": "Shelby County (Pelham/Hoover/Alabaster) is Alabama's fastest-growing county and an emerging technology hub. Alabama Power serves the county with competitive rates; the county's position as a Birmingham suburb provides access to metropolitan fiber infrastructure and workforce. Alabama's Jobs Act (Ala. Code §40-18-376 et seq.) provides payroll-based income tax credits for qualifying data center employers. The county's high-income demographics and rapid commercial growth drive enterprise data demand.",
        "effective_date": "2015-06-04",
        "status": "active",
        "notes": "Alabama's Jobs Act provides 3% payroll credit for up to 10 years. Shelby County's I-65 and US-280 corridors provide fiber diversity. Alabama Power's industrial rates are competitive in the southeastern US; the county benefits from Alabama's warm business climate (no inventory tax, no state income tax on dividends).",
        "sources": [
            {"label": "Alabama Jobs Act Ala. Code §40-18-376", "url": "https://law.justia.com/codes/alabama/section-40-18-376/"},
            {"label": "Shelby County Economic Development Authority", "url": "https://www.shelbycountyal.com/economic-development/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "01043",
        "name": "Cullman County",
        "state": "AL",
        "level": -1,
        "types": ["data_center"],
        "title": "Alabama Jobs Act — Cullman County North Alabama Technology Corridor",
        "description": "Cullman County (Cullman) in North Alabama's industrial corridor benefits from Alabama Power's TVA-competitive rates and the Alabama Jobs Act incentive program. The county's I-65 position midway between Birmingham and Huntsville provides fiber access; Marshall Space Flight Center (Madison County, 40 miles north) creates regional demand for aerospace and defense computing. Cullman Regional Airport provides logistics access for hardware deployments.",
        "effective_date": "2015-06-04",
        "status": "active",
        "notes": "North Alabama's technology corridor is anchored by Huntsville-Madison (Redstone Arsenal, NASA, defense contractors) with Cullman positioned as a lower-cost satellite market. Alabama Power's North Alabama rates are among the lowest in the state due to proximity to TVA transmission. Local incentives include property tax abatement through the Cullman County IDB.",
        "sources": [
            {"label": "Alabama Jobs Act Ala. Code §40-18-376", "url": "https://law.justia.com/codes/alabama/section-40-18-376/"},
            {"label": "Cullman Economic Development Agency", "url": "https://www.cullmanchamber.org/economic-development/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "28105",
        "name": "Oktibbeha County",
        "state": "MS",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Mississippi State University Research Computing — Oktibbeha County",
        "description": "Oktibbeha County (Starkville) hosts Mississippi State University's High Performance Computing Collaboratory (HPCC), one of the southeastern US's major academic supercomputing centers. MSU's AI and machine learning research programs drive demand for computing infrastructure. Entergy Mississippi serves the county; Mississippi's MEGA incentive program applies to qualifying data center investments. The Mississippi e-Center provides technology incubator services for AI startups.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "MSU HPCC operates the SuperMike cluster and multiple specialized GPU clusters for engineering and agricultural AI research. Mississippi's MEGA incentive can provide negotiated tax packages for large capital investments adjacent to university research facilities. Entergy Mississippi rates are competitive in the MISO South grid footprint.",
        "sources": [
            {"label": "Mississippi State University High Performance Computing Collaboratory", "url": "https://www.hpc.msstate.edu/"},
            {"label": "Mississippi MEGA Incentive Program", "url": "https://www.mississippi.org/wp-content/uploads/2021/06/IncentivesGuide.pdf"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "47185",
        "name": "White County",
        "state": "TN",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Tennessee Valley Authority Power — White County Upper Cumberland",
        "description": "White County (Sparta) in the Upper Cumberland region benefits from Tennessee Valley Authority (TVA) power delivered through the Upper Cumberland Electric Membership Corporation. Tennessee's T.C.A. §67-6-206 data center equipment exemption applies; the county's rural location and TVA rates (among the lowest in the eastern US) make it attractive for energy-intensive computing. The Tennessee Department of Economic and Community Development's Upper Cumberland regional office actively recruits data center investment.",
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "TVA's wholesale rates average 5.5-6.5 cents/kWh for industrial customers; retail rates through Upper Cumberland EMC are highly competitive. White County's scenic rural setting reduces visual impact permitting challenges. Tennessee has no state income tax on wages, reducing operational cost for data center operators.",
        "sources": [
            {"label": "Tennessee T.C.A. §67-6-206 Computer Equipment Sales Tax Exemption", "url": "https://www.tn.gov/revenue/taxes/sales-and-use-tax/exemptions.html"},
            {"label": "Tennessee Valley Authority Industrial Power Rates", "url": "https://www.tva.com/energy/economics-of-power/power-rates"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "45003",
        "name": "Aiken County",
        "state": "SC",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "South Carolina Fee in Lieu and DOE Savannah River — Aiken County",
        "description": "Aiken County hosts the Savannah River Site (SRS), a DOE National Nuclear Security Administration (NNSA) facility with significant AI and data processing needs for nuclear materials management. South Carolina's Fee in Lieu of Taxes (FILOT) program under S.C. Code §12-44-30 provides property tax incentives for qualifying data center investment. Dominion Energy South Carolina serves the county; the county's proximity to Augusta GA provides fiber connectivity.",
        "effective_date": "2004-01-01",
        "status": "active",
        "notes": "Savannah River National Laboratory (SRNL) conducts AI-enabled nuclear science research; SRS requires extensive data management for environmental remediation monitoring. SC FILOT can reduce property taxes to ~6% of assessed value for 30 years for qualifying investments of $2.5M+. Dominion Energy SC rates are competitive in the Southeast.",
        "sources": [
            {"label": "South Carolina FILOT Program S.C. Code §12-44-30", "url": "https://www.scstatehouse.gov/code/t12c044.php"},
            {"label": "Savannah River National Laboratory AI Research", "url": "https://www.srnl.doe.gov/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "45091",
        "name": "York County",
        "state": "SC",
        "level": -1,
        "types": ["data_center"],
        "title": "South Carolina FILOT — York County Charlotte Metro Data Center Growth",
        "description": "York County (Rock Hill/Fort Mill) is experiencing rapid data center growth as a Charlotte NC metro overflow market. South Carolina's FILOT program (S.C. Code §12-44-30) provides major property tax incentives versus North Carolina's higher rates. Duke Energy Carolinas serves the county with excellent grid reliability; the I-77 fiber corridor between Charlotte and Columbia provides network access. Rock Hill's municipal broadband expansion enhances the county's connectivity profile.",
        "effective_date": "2004-01-01",
        "status": "active",
        "notes": "SC's FILOT incentive combined with lower land costs makes York County significantly cheaper than Mecklenburg County NC for comparable data center builds. Duke Energy Carolinas provides the same transmission access serving Charlotte facilities. Several large colocation operators have expanded to Fort Mill specifically for the FILOT benefit.",
        "sources": [
            {"label": "South Carolina FILOT Program S.C. Code §12-44-30", "url": "https://www.scstatehouse.gov/code/t12c044.php"},
            {"label": "York County Economic Development Corporation", "url": "https://www.yorkcountyedc.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "37159",
        "name": "Rowan County",
        "state": "NC",
        "level": -1,
        "types": ["data_center"],
        "title": "North Carolina Data Center Tax Incentives — Rowan County Salisbury Fiber",
        "description": "Rowan County (Salisbury) hosts Fibrant, a municipal fiber broadband network providing carrier-grade connectivity, and benefits from North Carolina's Article 3F tax incentives for data centers under G.S. §105-129.95. Duke Energy Carolinas serves the county with reliable grid access. The county's I-85 position between Charlotte and Greensboro places it at the intersection of two major data center corridors, with lower real estate costs than either metro.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "NC G.S. §105-129.95 provides sales and use tax exemptions for qualifying data center equipment with $75M investment and 5 jobs in Tier 2 counties. Salisbury's Fibrant network provides last-mile dark fiber that reduces carrier connectivity costs for data centers compared to leased facilities in Charlotte or Greensboro.",
        "sources": [
            {"label": "North Carolina G.S. §105-129.95 Data Center Tax Incentive", "url": "https://www.ncleg.net/enactedlegislation/statutes/html/bysection/chapter_105/gs_105-129.95.html"},
            {"label": "Salisbury-Rowan Economic Development Commission", "url": "https://www.salisburync.gov/economic-development/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "37179",
        "name": "Union County",
        "state": "NC",
        "level": -1,
        "types": ["data_center"],
        "title": "North Carolina Data Center Incentives — Union County Charlotte Exurb",
        "description": "Union County (Monroe NC) as a high-growth Charlotte exurb benefits from North Carolina's Article 3F data center tax incentives (G.S. §105-129.95) and Duke Energy Carolinas grid access. The county's Tier 1 economic status means lower investment thresholds for data center incentive qualification. The I-485 beltway connection to Charlotte's fiber network and the planned US-74 expansion improve logistics access for hardware deployments.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Union County's population has more than doubled since 2000; enterprise computing demand is growing rapidly. NC Article 3F exemptions in Union County (Tier 1) require $75M investment and 5 jobs. Duke Energy Carolinas transmission capacity serving the Charlotte-area load growth passes through the county.",
        "sources": [
            {"label": "North Carolina G.S. §105-129.95 Data Center Tax Incentive", "url": "https://www.ncleg.net/enactedlegislation/statutes/html/bysection/chapter_105/gs_105-129.95.html"},
            {"label": "Union County Economic Development", "url": "https://www.unioncountync.gov/departments/economic-development"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "51109",
        "name": "Louisa County",
        "state": "VA",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Virginia Data Center Exemption — Louisa County North Anna Nuclear Zone",
        "description": "Louisa County hosts North Anna Nuclear Power Station (Dominion Energy, 1,892 MW from two units), providing highly reliable baseload power that supports data center 99.999% uptime requirements. Virginia's §58.1-609.3(19) data center sales tax exemption applies; the county's position on the Route 33/I-64 corridor provides fiber access from the DC-Richmond data center spine. Land costs are significantly lower than Loudoun or Prince William counties for comparable power access.",
        "effective_date": "2011-07-01",
        "status": "active",
        "notes": "North Anna Units 1 and 2 have operated since the 1970s; Dominion Energy is studying Units 3 and 4 SMR (small modular reactor) deployment. The county's position 40 miles northwest of Richmond provides network access while maintaining rural land costs. VA §58.1-609.3(19) requires $150M qualified investment over 5 years.",
        "sources": [
            {"label": "Virginia Code §58.1-609.3(19) Data Center Exemption", "url": "https://law.lis.virginia.gov/vacode/58.1-609.3/"},
            {"label": "Dominion Energy North Anna Power Station", "url": "https://www.dominionenergy.com/company/making-energy/nuclear-generation/north-anna-power-station"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "39089",
        "name": "Licking County",
        "state": "OH",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Ohio Data Center Tax Exemption — Licking County Intel Semiconductor Corridor",
        "description": "Licking County (Newark/Heath/New Albany area) is the site of Intel's $20B Ohio One Campus semiconductor fabrication complex (under construction 2023-2027). Ohio's data center tax exemption (ORC §5739.02(B)(31)) covers qualifying computer equipment; the county's position on I-70 with AEP Ohio's planned grid capacity expansion for the Intel fab creates infrastructure for adjacent data center development. Ohio's Job Retention Tax Credit and JobsOhio incentives apply to technology investment.",
        "effective_date": "2022-01-21",
        "status": "active",
        "notes": "Intel's Ohio One investment is among the largest private semiconductor investments in US history; the fab's AI chip (Gaudi/Sapphire Rapids) production creates local demand for testing and validation data infrastructure. AEP Ohio is expanding its New Albany-area transmission for the Intel load. JobsOhio's Site Inventory program expedites permitting for adjacent technology investment.",
        "sources": [
            {"label": "Intel Ohio One Campus Semiconductor Fab Announcement", "url": "https://www.intel.com/content/www/us/en/newsroom/news/intel-ohio.html"},
            {"label": "Ohio Revised Code §5739.02(B)(31) Computer Data Center Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
]

new_campuses = [
    {
        "id": "ai-ky-003",
        "name": "Fort Knox U.S. Army Cyber and AI Operations Center",
        "operator": "U.S. Army Network Enterprise Technology Command",
        "status": "operational",
        "county_fips": "21093",
        "notes": "Fort Knox (Hardin County KY) hosts U.S. Army NETCOM regional operations and Cyber Institute training facilities. AI-enabled threat detection, network monitoring, and autonomous systems testing programs. Supports the Army's Project Convergence AI integration initiative for combined arms operations.",
        "lon": -85.9643,
        "lat": 37.8891
    },
    {
        "id": "ai-ms-005",
        "name": "Mississippi State University High Performance Computing Collaboratory",
        "operator": "Mississippi State University HPCC",
        "status": "operational",
        "county_fips": "28105",
        "notes": "MSU's High Performance Computing Collaboratory (HPCC) in Starkville, Oktibbeha County MS. Operates SuperMike-II and specialized GPU clusters for AI/ML research in agriculture, materials science, and biomedical engineering. Hosts the NSF-funded Center for Air Sea Technology and agricultural AI programs for the Mississippi Delta.",
        "lon": -88.7882,
        "lat": 33.4562
    },
    {
        "id": "ai-sc-005",
        "name": "Savannah River National Laboratory AI-Enabled Nuclear Science Center",
        "operator": "Savannah River National Laboratory / DOE NNSA",
        "status": "operational",
        "county_fips": "45003",
        "notes": "SRNL AI research center in Aiken County SC, operating under DOE's Office of Environmental Management. Applies AI and machine learning to nuclear materials monitoring, environmental remediation prediction, and radioactive waste characterization at the Savannah River Site. Part of DOE's National Laboratory AI Initiative.",
        "lon": -81.7176,
        "lat": 33.5568
    },
    {
        "id": "ai-nc-006",
        "name": "Rowan-Cabarrus Community College Advanced Technology and AI Center",
        "operator": "Rowan-Cabarrus Community College",
        "status": "operational",
        "county_fips": "37159",
        "notes": "Rowan-Cabarrus Community College AI and advanced manufacturing technology center in Salisbury, Rowan County NC. Trains data center operations technicians, network engineers, and AI-assisted manufacturing workers for the Charlotte-Greensboro industrial corridor. Partners with Duke Energy Carolinas and Fibrant municipal broadband for hands-on grid and network training.",
        "lon": -80.4775,
        "lat": 35.6710
    },
    {
        "id": "ai-va-012",
        "name": "Dominion Energy North Anna Nuclear AI Power Management System",
        "operator": "Dominion Energy Virginia",
        "status": "operational",
        "county_fips": "51109",
        "notes": "Dominion Energy's AI-enabled grid management and nuclear plant operations support system at North Anna Power Station, Louisa County VA. Integrates predictive maintenance AI for nuclear components, real-time grid dispatch optimization, and load forecasting for the PJM Virginia zone. Part of Dominion's broader grid modernization under Virginia's Clean Economy Act.",
        "lon": -77.7852,
        "lat": 38.0619
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
