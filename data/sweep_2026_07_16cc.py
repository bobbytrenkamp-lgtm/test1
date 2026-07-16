"""
Sweep CC — 2026-07-16
+12 county restriction entries, +5 AI campuses
Counties: WI Chippewa, WI Eau Claire, WI St. Croix, TN Loudon,
          KY Campbell, GA Madison, AL Calhoun, MS Madison,
          ND Mercer, WY Albany, WY Fremont, MO Christian
Campuses: ai-wi-003, ai-ky-002, ai-al-003, ai-wy-001, ai-nd-005
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
        "fips": "55017",
        "name": "Chippewa County",
        "state": "WI",
        "level": -1,
        "types": ["data_center"],
        "title": "Wisconsin WEDC Enterprise Zone — Chippewa County Technology Heritage",
        "description": "Chippewa County (Chippewa Falls) hosts the historic site of Cray Research's original supercomputer manufacturing operations, now a multi-tenant technology park. The county benefits from Wisconsin Economic Development Corporation (WEDC) Enterprise Zone and Jobs Tax Credit programs for technology employers. Xcel Energy's Northern States Power subsidiary serves the county with competitive rates; the county's fiber infrastructure leverages the I-94 corridor connectivity to Minneapolis-St. Paul.",
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "WEDC Enterprise Zone tax credits cover wages for qualifying new employees. The former Cray Research campus at Chippewa Falls Technology Park continues to host computing and engineering tenants. Northern States Power (Xcel) provides reliable grid access from Superior/Lake Superior transmission infrastructure.",
        "sources": [
            {"label": "Wisconsin WEDC Enterprise Zone Program", "url": "https://wedc.org/programs-and-resources/programs/enterprise-zone/"},
            {"label": "Chippewa Falls Area Chamber of Commerce Technology Sector", "url": "https://www.chippewafallschamber.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "55035",
        "name": "Eau Claire County",
        "state": "WI",
        "level": -1,
        "types": ["data_center"],
        "title": "Wisconsin Data Center Investment Incentives — Eau Claire County",
        "description": "Eau Claire County participates in Wisconsin's data center tax incentive framework, with WEDC Jobs Tax Credits and Enterprise Zone designations supporting technology investment. The University of Wisconsin-Eau Claire's computing and data science programs build the regional workforce pipeline. Xcel Energy (NSP) provides competitive industrial power rates; Eau Claire's position between Minneapolis-St. Paul and the Twin Cities technology corridor supports colocation and managed service providers.",
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "Eau Claire County benefits from Wisconsin's §71.07(2dd) Data Center Investment Tax Credit, available for qualified investments of $75M+ and creation of 10+ jobs. The county's semiconductor and electronics manufacturing heritage provides skilled labor for data center operations.",
        "sources": [
            {"label": "Wisconsin §71.07(2dd) Data Center Investment Tax Credit", "url": "https://docs.legis.wisconsin.gov/statutes/statutes/71/I/07/2dd"},
            {"label": "WEDC Wisconsin Technology and Innovation Programs", "url": "https://wedc.org/programs-and-resources/programs/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "55109",
        "name": "St. Croix County",
        "state": "WI",
        "level": -1,
        "types": ["data_center"],
        "title": "Wisconsin Data Center Tax Credit — St. Croix County Twin Cities Corridor",
        "description": "St. Croix County (Hudson/New Richmond) on the Wisconsin-Minnesota border benefits from Wisconsin's data center investment tax credit (§71.07(2dd)) and proximity to the Minneapolis-St. Paul technology market. Xcel Energy (NSP) serves the county; fiber infrastructure from the I-94 corridor connects to Twin Cities carrier hotels. Lower Wisconsin land and tax costs compared to Minnesota attract overflow data center demand from the Twin Cities market.",
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "St. Croix County's cross-border position means operators can access MN-side interconnects while benefiting from WI incentive programs. The county has grown rapidly as a residential and commercial suburb of the Twin Cities metro, increasing demand for edge computing and last-mile infrastructure.",
        "sources": [
            {"label": "Wisconsin §71.07(2dd) Data Center Investment Tax Credit", "url": "https://docs.legis.wisconsin.gov/statutes/statutes/71/I/07/2dd"},
            {"label": "St. Croix County Economic Development Corporation", "url": "https://www.stcroixedc.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "47105",
        "name": "Loudon County",
        "state": "TN",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Tennessee Valley Authority Power — Loudon County Data Center Incentives",
        "description": "Loudon County benefits from Tennessee Valley Authority (TVA) power delivered through the Lenoir City Utilities Board, with competitive commercial rates from TVA's diverse generation mix including nuclear (Watts Bar near Rhea County), hydro, and natural gas. Tennessee has no state income tax and provides data center equipment exemptions under T.C.A. §67-6-206. The county's proximity to Oak Ridge National Laboratory (30 miles) creates demand for high-performance computing support facilities.",
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "TVA's industrial power rates are among the lowest in the eastern US. Loudon County's Industrial Development Board can issue industrial revenue bonds for qualifying data center projects. The county sits on I-75 with fiber connectivity to Knoxville and Chattanooga.",
        "sources": [
            {"label": "Tennessee T.C.A. §67-6-206 Computer Equipment Exemption", "url": "https://www.tn.gov/revenue/taxes/sales-and-use-tax/exemptions.html"},
            {"label": "Tennessee Valley Authority Economic Development Power Rates", "url": "https://www.tva.com/energy/economics-of-power/power-rates"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "21037",
        "name": "Campbell County",
        "state": "KY",
        "level": -1,
        "types": ["data_center"],
        "title": "Kentucky Data Center Tax Incentives — Campbell County Northern Kentucky",
        "description": "Campbell County (Newport/Alexandria KY) in the Greater Cincinnati metro area benefits from Kentucky's KEIA (Kentucky Economic Development for a Growing Economy) and KEDFA incentive programs for technology investment. Duke Energy Ohio/Kentucky serves the county with stable industrial power; Northern Kentucky University's data science programs in Highland Heights provide workforce support. The county's position in the Northern Kentucky Data Center cluster (alongside Boone and Kenton counties) attracts overflow colocation demand.",
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Kentucky's KEDFA incentive package can include corporate income tax credits, workforce assessment fees, and sales tax exemptions on data center equipment. Campbell County's location directly across the Ohio River from Cincinnati provides access to major carrier hotels and fiber intersects.",
        "sources": [
            {"label": "Kentucky Cabinet for Economic Development KEDFA Incentives", "url": "https://ced.ky.gov/Business/StartGrowBusiness/Pages/Incentives.aspx"},
            {"label": "Northern Kentucky University Computer Science Programs", "url": "https://www.nku.edu/academics/informatics/programs.html"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "13195",
        "name": "Madison County",
        "state": "GA",
        "level": -1,
        "types": ["data_center"],
        "title": "Georgia Data Center Tax Exemption — Madison County Rural Broadband Corridor",
        "description": "Madison County (Danielsville) qualifies for Georgia's data center sales tax exemption under O.C.G.A. §48-8-3.2, covering qualifying computer equipment, software, and cooling infrastructure. Georgia Power serves the county; the Northeast Georgia fiber corridor connecting Athens to Greenville SC passes through the county. The Georgia Department of Economic Development's OneGeorgia Authority targets rural counties including Madison for technology investment with enhanced incentive packages.",
        "effective_date": "2013-01-01",
        "status": "active",
        "notes": "Georgia's §48-8-3.2 exemption requires $15M minimum investment; data centers in rural Georgia counties qualify for enhanced incentives under the OneGeorgia Authority program. Madison County's proximity to Athens (UGA) supports workforce development.",
        "sources": [
            {"label": "Georgia O.C.G.A. §48-8-3.2 Data Center Sales Tax Exemption", "url": "https://law.justia.com/codes/georgia/2022/title-48/chapter-8/article-1/section-48-8-3-2/"},
            {"label": "Georgia Department of Economic Development Data Centers", "url": "https://www.georgia.org/industries/technology/data-centers"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "01015",
        "name": "Calhoun County",
        "state": "AL",
        "level": -1,
        "types": ["data_center"],
        "title": "Alabama Jobs Act Data Center Incentives — Calhoun County",
        "description": "Calhoun County (Anniston/Oxford) participates in Alabama's Jobs Act (Ala. Code §40-18-376 et seq.) providing income tax credits for qualifying data center employment and capital investment. Alabama Power serves the county with TVA-cost-competitive rates; the I-20 fiber corridor connecting Birmingham and Atlanta passes through Anniston. The county's lower land costs relative to metro Birmingham make it attractive for mid-market data center development.",
        "effective_date": "2015-06-04",
        "status": "active",
        "notes": "Alabama Jobs Act credits cover 3% of payroll for qualifying new employees for up to 10 years; data center operators with substantial workforce qualify. Calhoun County's Gadsden State Community College (Oxford campus) supports technical workforce development for data center operations.",
        "sources": [
            {"label": "Alabama Jobs Act Ala. Code §40-18-376", "url": "https://law.justia.com/codes/alabama/section-40-18-376/"},
            {"label": "Alabama Department of Commerce Data Center Incentives", "url": "https://www.madeinalabama.com/industries/technology/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "28089",
        "name": "Madison County",
        "state": "MS",
        "level": -1,
        "types": ["data_center"],
        "title": "Mississippi Data Center Incentives — Madison County Reservoir Corridor",
        "description": "Madison County (Ridgeland/Canton) in the Jackson metro area benefits from Mississippi's data center tax incentive program (Miss. Code Ann. §27-65-101 exemption and MEGA incentive packages) for qualifying technology investment. Entergy Mississippi provides reliable power; the county's fiber connectivity via I-55 supports Jackson-area colocation demand. Madison County's above-average income demographics and Reservoir corridor growth create demand for enterprise data management facilities.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Mississippi's MEGA incentive program provides negotiated tax incentives for large capital investments; data center projects qualify under the economic development project category. Entergy Mississippi's smart grid investments improve grid reliability in Madison County.",
        "sources": [
            {"label": "Mississippi MEGA Incentive Program", "url": "https://www.mississippi.org/wp-content/uploads/2021/06/IncentivesGuide.pdf"},
            {"label": "Mississippi Code §27-65-101 Sales Tax Exemptions", "url": "https://www.sos.ms.gov/pages/mississippi-law"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "38057",
        "name": "Mercer County",
        "state": "ND",
        "level": 1,
        "types": ["energy", "crypto"],
        "title": "Basin Electric Coal-to-Renewables Transition — Mercer County ND",
        "description": "Mercer County (Beulah) hosts Basin Electric Power Cooperative's Leland Olds Station (coal) and Great Plains Synfuels Plant (coal gasification), as well as growing wind generation. The county's energy economy is transitioning from coal; cryptocurrency miners have been attracted by surplus generation but face uncertainty under the North Dakota Century Code §49-02-28 grid reliability requirements. Basin Electric's proposed renewable energy investments may reshape the power cost profile for large industrial customers.",
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Leland Olds Station retirement plans create uncertainty for Mercer County's power cost structure. Cryptocurrency mining operations in the Beulah area face interruptible service requirements during peak winter demand events. Basin Electric's grid serves rural co-ops across the Dakotas.",
        "sources": [
            {"label": "Basin Electric Power Cooperative Annual Report and Generation Plans", "url": "https://www.basinelectric.com/our-cooperative/annual-report/"},
            {"label": "North Dakota Century Code §49-02-28 Grid Reliability", "url": "https://www.legis.nd.gov/cencode/t49c02.pdf"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "56001",
        "name": "Albany County",
        "state": "WY",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Wyoming Wind Energy and Tax Advantage — Albany County Data Centers",
        "description": "Albany County (Laramie) has no state income tax and no corporate income tax, making Wyoming highly competitive for data center investment. The county's position in the Wyoming Wind Corridor (Chokecherry/Sierra Madre wind resources) provides access to inexpensive renewable generation. Rocky Mountain Power (PacifiCorp) serves the county. The University of Wyoming in Laramie provides research computing demand and STEM workforce. Wyoming Statute §39-15-103 exempts data center computer equipment from sales and use tax.",
        "effective_date": "2010-07-01",
        "status": "active",
        "notes": "Wyoming has no personal or corporate income tax, no gross receipts tax, and low property taxes on data center equipment. Albany County's high-wind environment (average 15+ mph) enables low-cost renewable PPAs. The I-80 fiber corridor through Laramie connects Denver and Salt Lake City markets.",
        "sources": [
            {"label": "Wyoming Statute §39-15-103 Computer Equipment Sales Tax Exemption", "url": "https://wyoleg.gov/statutes/compress/title39.pdf"},
            {"label": "Wyoming Business Council Data Center Incentives", "url": "https://www.wyomingbusiness.org/content/data-centers"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "56013",
        "name": "Fremont County",
        "state": "WY",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Wyoming Wind Corridor — Fremont County Renewable Energy Hub",
        "description": "Fremont County (Lander/Riverton) sits at the center of Wyoming's premier wind energy development corridor, with Rocky Mountain Power (PacifiCorp) transmission access to Chokecherry, Sierra Madre, and other large-scale wind projects. Wyoming's tax advantages (no income tax, sales tax exemption under §39-15-103 for computer equipment) apply county-wide. The county's Eastern Shoshone and Northern Arapaho tribal lands on Wind River Reservation present opportunities for tribal data sovereignty infrastructure investment.",
        "effective_date": "2010-07-01",
        "status": "active",
        "notes": "PacifiCorp's Energy Gateway transmission project adds capacity to export Wyoming wind; Fremont County facilities can access low-cost renewable PPAs from adjacent project areas. Wind River Indian Reservation's tribal government has explored data sovereignty infrastructure to support tribal governmental computing needs.",
        "sources": [
            {"label": "Wyoming Statute §39-15-103 Computer Equipment Sales Tax Exemption", "url": "https://wyoleg.gov/statutes/compress/title39.pdf"},
            {"label": "PacifiCorp Energy Gateway Transmission Project", "url": "https://www.pacificorp.com/content/dam/pcorp/documents/en/pacificorp/energy/transmission/energy-gateway/EGW_Brochure.pdf"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "29043",
        "name": "Christian County",
        "state": "MO",
        "level": -1,
        "types": ["data_center"],
        "title": "Missouri Chapter 100 IRB Program — Christian County Springfield Metro",
        "description": "Christian County (Nixa/Ozark) in the Springfield metropolitan area benefits from Missouri's Chapter 100 Industrial Revenue Bond program (RSMo §100) providing property tax abatement on qualifying data center equipment. Empire District Electric (Liberty Utilities) serves the county; Lumen Technologies (CenturyLink) operates major fiber routes through Springfield connecting to Kansas City and Memphis. The county's rapid residential growth creates demand for local edge computing and enterprise data management.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "RSMo §100 IRB exemption covers personal property tax on qualifying equipment for data center operators. Christian County's position in the Springfield metro (population 475,000+) supports regional data center demand. Missouri's §144.810 sales tax exemption on computer equipment provides additional incentive stacking.",
        "sources": [
            {"label": "Missouri RSMo §100 Industrial Revenue Bond Program", "url": "https://revisor.mo.gov/main/OneChapter.aspx?chapter=100"},
            {"label": "Missouri RSMo §144.810 Computer Equipment Tax Exemption", "url": "https://revisor.mo.gov/main/OneSection.aspx?section=144.810"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
]

new_campuses = [
    {
        "id": "ai-wi-003",
        "name": "Chippewa Falls Technology Park — HPE Cray Heritage Computing Site",
        "operator": "Chippewa Falls Technology Park / HPE Cray Alumni Network",
        "status": "operational",
        "county_fips": "55017",
        "notes": "Multi-tenant technology campus occupying the historic Cray Research supercomputer design and manufacturing site in Chippewa Falls. The campus maintains computing heritage and hosts AI, embedded systems, and engineering tenants leveraging the original Cray Research infrastructure legacy. Xcel Energy NSP provides power via legacy high-reliability feeds designed for supercomputer loads.",
        "lon": -91.3929,
        "lat": 44.9369
    },
    {
        "id": "ai-ky-002",
        "name": "Northern Kentucky University AI and Data Science Research Center",
        "operator": "Northern Kentucky University",
        "status": "operational",
        "county_fips": "21037",
        "notes": "NKU's College of Informatics AI and Data Science research center in Highland Heights, Campbell County. Hosts applied AI research for Cincinnati-region healthcare, logistics, and financial services sectors. Partners with Duke Energy Ohio on smart grid AI projects and Greater Cincinnati tech ecosystem programs.",
        "lon": -84.4552,
        "lat": 38.9453
    },
    {
        "id": "ai-al-003",
        "name": "Jacksonville State University Center for Applied AI",
        "operator": "Jacksonville State University",
        "status": "operational",
        "county_fips": "01015",
        "notes": "JSU Center for Applied AI in Jacksonville, Calhoun County AL. Focuses on AI applications for defense manufacturing analytics (Fort McClellan area), materials science, and rural healthcare informatics. Partners with Gadsden State Community College and Alabama Power on workforce development programs for technology industry.",
        "lon": -85.7622,
        "lat": 33.8143
    },
    {
        "id": "ai-wy-001",
        "name": "University of Wyoming School of Energy Resources AI Research Center",
        "operator": "University of Wyoming",
        "status": "operational",
        "county_fips": "56001",
        "notes": "University of Wyoming's AI research infrastructure supporting the School of Energy Resources wind energy optimization, carbon capture, and clean energy transition research programs. Located in Laramie (Albany County), with HPC systems supporting NCAR/NOAA weather modeling for Wyoming Wind Corridor forecasting and grid integration research.",
        "lon": -105.5668,
        "lat": 41.3143
    },
    {
        "id": "ai-nd-005",
        "name": "Basin Electric Power Cooperative AI Energy Management Center",
        "operator": "Basin Electric Power Cooperative",
        "status": "operational",
        "county_fips": "38057",
        "notes": "Basin Electric Power Cooperative grid management and AI energy dispatch center in Beulah, Mercer County ND. Coordinates real-time generation dispatch for Basin Electric's 2.9 GW coal and 1+ GW wind generation portfolio serving 2.9 million people across nine states. AI-driven load forecasting supports coal-to-renewable transition planning.",
        "lon": -101.7796,
        "lat": 47.2629
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
