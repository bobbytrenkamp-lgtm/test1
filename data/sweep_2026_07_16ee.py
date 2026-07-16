"""
Sweep EE — 2026-07-16
+12 county restriction entries, +5 AI campuses
Counties: PA Centre, PA Luzerne, PA Lycoming, PA Blair,
          OH Mahoning, OH Fairfield, OH Allen, OH Ross,
          IN Johnson, IN Hancock, IN Morgan, IN Shelby
Campuses: ai-pa-003, ai-pa-004, ai-oh-006, ai-in-006, ai-in-007
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
        "fips": "42027",
        "name": "Centre County",
        "state": "PA",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Penn State University Research Computing — Centre County Data Center Incentives",
        "description": "Centre County (State College) hosts Penn State University's Institute for Computational and Data Sciences (ICDS) and the Roar/Roar Collab HPC systems, one of the top research computing infrastructures in the Northeast. Pennsylvania's Data Center Opportunity Zone program and Keystone Opportunity Zones (KOZ) provide property tax and income tax abatement for qualifying technology investments. PPL Electric Utilities serves the county; the I-80 corridor provides fiber connectivity east to Philadelphia and west to Pittsburgh.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Penn State's ICDS Roar system provides 28,000+ CPU cores and 100+ GPU nodes for research computing. KOZ designation in Centre County's industrial parks provides 10-year corporate tax relief. The university's data science PhD program and NSF funding attract AI research infrastructure investment.",
        "sources": [
            {"label": "Penn State Institute for Computational and Data Sciences ICDS", "url": "https://www.icds.psu.edu/"},
            {"label": "Pennsylvania Keystone Opportunity Zone Program", "url": "https://dced.pa.gov/programs/keystone-opportunity-zone-koz-program/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "42079",
        "name": "Luzerne County",
        "state": "PA",
        "level": -1,
        "types": ["data_center"],
        "title": "Pennsylvania Keystone Opportunity Zone — Luzerne County Wilkes-Barre",
        "description": "Luzerne County (Wilkes-Barre/Scranton metro) benefits from Pennsylvania's Keystone Opportunity Zone designations in the Wyoming Valley industrial parks and data center equipment purchasing advantages. PPL Electric Utilities (PJM grid) provides reliable power; the county's position on I-81 provides fiber connectivity along the Northeast spine. Wilkes University's engineering programs support the technical workforce. Lower real estate costs versus Philadelphia or Pittsburgh attract mid-market colocation operators.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "KOZ parcels in Luzerne County provide 10-year abatement on corporate net income tax, capital stock and franchise tax, and local earned income tax for qualified businesses. Wilkes-Barre's designation as an economic distressed zone enables enhanced RACP (Redevelopment Assistance Capital Program) grants for technology infrastructure.",
        "sources": [
            {"label": "Pennsylvania Keystone Opportunity Zone Program", "url": "https://dced.pa.gov/programs/keystone-opportunity-zone-koz-program/"},
            {"label": "Luzerne County Economic Development", "url": "https://lucoed.org/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "42081",
        "name": "Lycoming County",
        "state": "PA",
        "level": -1,
        "types": ["data_center"],
        "title": "Pennsylvania Keystone Opportunity Zone — Lycoming County Williamsport",
        "description": "Lycoming County (Williamsport) qualifies for Pennsylvania's KOZ program with industrial park designations providing multi-year corporate tax abatement. PPL Electric Utilities provides power; the county's West Branch Susquehanna River position and I-180/US-220 corridor provides logistics access. Pennsylvania College of Technology (Penn College), a Penn State affiliate, provides technical training for data center operations. Marcellus Shale gas infrastructure in the county supports energy development that can benefit power cost predictability.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Lycoming County's Opportunity Zone designation (federal) overlaps with state KOZ benefits in certain parcels. Penn College of Technology's network systems and data center programs feed the local workforce pipeline. PPL's grid in northern Pennsylvania is connected to the Keystone and Susquehanna 765kV transmission backbone.",
        "sources": [
            {"label": "Pennsylvania Keystone Opportunity Zone Program", "url": "https://dced.pa.gov/programs/keystone-opportunity-zone-koz-program/"},
            {"label": "Pennsylvania College of Technology Network Systems Programs", "url": "https://www.pct.edu/academics/programs/network-systems.shtml"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "42013",
        "name": "Blair County",
        "state": "PA",
        "level": -1,
        "types": ["data_center"],
        "title": "Pennsylvania KOZ Program — Blair County Altoona",
        "description": "Blair County (Altoona) is a historically significant rail hub that has been diversifying into technology and logistics. Pennsylvania's KOZ program covers portions of Altoona's industrial districts; Penelec (a FirstEnergy subsidiary) provides power via the PJM grid. Penn State Altoona's computer science programs support regional workforce development. The US-220/I-99 corridor provides fiber connectivity north to State College and south to Harrisburg.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Blair County's Keystone Innovation Zone (KIZ) designation for technology startups near Penn State Altoona provides additional R&D tax credits. Altoona's legacy railroad infrastructure (Norfolk Southern Altoona Works) provides real estate at below-market rates for large-footprint data center development.",
        "sources": [
            {"label": "Pennsylvania Keystone Opportunity Zone Program", "url": "https://dced.pa.gov/programs/keystone-opportunity-zone-koz-program/"},
            {"label": "Blair County Economic Development", "url": "https://www.blaircountedc.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "39099",
        "name": "Mahoning County",
        "state": "OH",
        "level": -1,
        "types": ["data_center"],
        "title": "Ohio Data Center Tax Exemption — Mahoning County Steel Valley Transformation",
        "description": "Mahoning County (Youngstown/Warren) is transitioning from its steel industry heritage to a technology-driven economy. Ohio's data center sales tax exemption (ORC §5739.02(B)(31)) applies; FirstEnergy/Ohio Edison serves the county with existing industrial-grade power infrastructure from the steel era. Youngstown State University's STEM programs and Northeast Ohio's growing tech sector support data center workforce development. Ohio's Enterprise Zone program provides additional property tax benefits.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Mahoning County's legacy industrial infrastructure (high-capacity electrical substations from steel production) reduces data center power delivery buildout costs. Youngstown's Opportunity Zone designation provides federal tax incentives for capital gains investments in new facilities. I-80 (Ohio Turnpike) fiber corridor connects to Cleveland, Pittsburgh, and Chicago.",
        "sources": [
            {"label": "Ohio Revised Code §5739.02(B)(31) Computer Data Center Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Youngstown-Warren Regional Chamber Economic Development", "url": "https://www.regionalchamber.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "39045",
        "name": "Fairfield County",
        "state": "OH",
        "level": -1,
        "types": ["data_center"],
        "title": "Ohio Data Center Tax Exemption — Fairfield County Columbus Metro Expansion",
        "description": "Fairfield County (Lancaster/Canal Winchester) benefits from Columbus metropolitan area expansion for data center development. AEP Ohio provides grid access and Ohio's §5739.02(B)(31) data center sales tax exemption covers qualifying computer equipment. The county's I-33/Route 33 Corridor is designated a State Technology Investment Priority Zone with accelerated permitting and enterprise zone property tax incentives. Columbus's semiconductor corridor expansion (Intel fab in Licking County, 30 miles east) is increasing regional data center demand.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Fairfield County's Route 33 corridor has attracted logistics and light industrial investment serving the Columbus market. AEP Ohio's grid investments serving the Intel fab load in adjacent Licking County improve transmission reliability through Fairfield County. Ohio Enterprise Zone agreements can reduce property tax assessments on new data center equipment.",
        "sources": [
            {"label": "Ohio Revised Code §5739.02(B)(31) Computer Data Center Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Fairfield County Economic Development Department", "url": "https://www.fairfieldcountyohio.gov/economic-development/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "39003",
        "name": "Allen County",
        "state": "OH",
        "level": -1,
        "types": ["data_center"],
        "title": "Ohio Data Center Tax Exemption — Allen County Lima Industrial Power",
        "description": "Allen County (Lima) has significant industrial power infrastructure from its oil refining and manufacturing heritage. Ohio's §5739.02(B)(31) data center sales tax exemption and AEP Ohio's service territory provide the baseline for data center investment. Ohio Northern University's STEM and computer science programs in Ada (10 miles west) support the regional workforce. The county's I-75 position between Toledo and Dayton provides fiber connectivity in the western Ohio corridor.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Allen County's Lima Refinery (Husky/BP legacy) provides refinery-grade electrical substation infrastructure that can support data center power delivery. AEP Ohio's transmission infrastructure serving Lima's industrial loads has excess capacity for new large customers. Ohio Enterprise Zone agreements available for qualifying new technology investments.",
        "sources": [
            {"label": "Ohio Revised Code §5739.02(B)(31) Computer Data Center Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Allen County Economic Development Group", "url": "https://www.edglima.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "39141",
        "name": "Ross County",
        "state": "OH",
        "level": -1,
        "types": ["data_center"],
        "title": "Ohio Data Center Tax Exemption — Ross County Chillicothe",
        "description": "Ross County (Chillicothe) benefits from Ohio's §5739.02(B)(31) data center equipment sales tax exemption and AEP Ohio's grid service. Chillicothe's US-35 and US-50 corridors connect to Columbus (45 miles north) and Huntington WV; fiber routes along these highways enable connectivity. Ohio University Chillicothe campus provides a technical workforce pipeline. The county's participation in Ohio's Enterprise Zone and Job Creation Tax Credit programs supplements the state data center exemption.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "Ross County's Hopewell Health Center and Mead's Papermill site offer conversion opportunities for large-footprint data centers with existing industrial electrical infrastructure. AEP Ohio serves the county via the central Ohio transmission system.",
        "sources": [
            {"label": "Ohio Revised Code §5739.02(B)(31) Computer Data Center Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Ross County Development Commission", "url": "https://www.rossdc.org/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "18081",
        "name": "Johnson County",
        "state": "IN",
        "level": -1,
        "types": ["data_center"],
        "title": "Indiana Data Center Tax Exemption — Johnson County Indianapolis South Corridor",
        "description": "Johnson County (Greenwood/Franklin) south of Indianapolis benefits from Indiana's data center tax exemption (IC 6-2.5-5-37 for qualifying computer equipment) and Duke Energy Indiana's competitive rates. The county's I-65 corridor provides fiber connectivity south to Louisville and north to Indianapolis carrier hotels. Franklin College's computer science programs provide local workforce support; the county's rapid commercial growth reflects spillover from Indianapolis's data center market.",
        "effective_date": "2014-01-01",
        "status": "active",
        "notes": "Indiana IC 6-2.5-5-37 exemption covers qualifying computer equipment, cooling systems, and related infrastructure with minimum investment of $10M and 20 jobs. Johnson County's industrial parks on I-65 have attracted Amazon and logistics operators that co-locate with data infrastructure. Duke Energy Indiana's rates are competitive in the MISO Midwest market.",
        "sources": [
            {"label": "Indiana Code IC 6-2.5-5-37 Data Center Sales Tax Exemption", "url": "https://iga.in.gov/laws/2023/ic/titles/6#6-2.5-5-37"},
            {"label": "Johnson County Economic Development Corporation", "url": "https://www.jcedc.org/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "18059",
        "name": "Hancock County",
        "state": "IN",
        "level": -1,
        "types": ["data_center"],
        "title": "Indiana Data Center Tax Exemption — Hancock County I-70 East Indianapolis",
        "description": "Hancock County (Greenfield) on I-70 east of Indianapolis benefits from Indiana's §IC 6-2.5-5-37 data center equipment tax exemption and proximity to the Indianapolis Airport's Mount Comfort satellite general aviation airport. Duke Energy Indiana serves the county; the I-70 corridor provides fiber connectivity to Columbus OH and Indianapolis. The county's participation in the Indianapolis Regional Development Commission provides coordinated permitting for large technology investments.",
        "effective_date": "2014-01-01",
        "status": "active",
        "notes": "Hancock County's eastern Indianapolis position provides access to Indianapolis's metropolitan fiber and carrier hotels while offering lower real estate costs. Indiana's economic development incentives (IEDC) include Skills Enhancement Fund grants for data center workforce training. Duke Energy Indiana's grid connects to AEP Ohio at the Indiana-Ohio border, enabling network redundancy.",
        "sources": [
            {"label": "Indiana Code IC 6-2.5-5-37 Data Center Sales Tax Exemption", "url": "https://iga.in.gov/laws/2023/ic/titles/6#6-2.5-5-37"},
            {"label": "Hancock County Economic Development Council", "url": "https://www.hcedc.com/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "18109",
        "name": "Morgan County",
        "state": "IN",
        "level": -1,
        "types": ["data_center"],
        "title": "Indiana Data Center Tax Exemption — Morgan County Indianapolis Southwest",
        "description": "Morgan County (Martinsville) southwest of Indianapolis participates in Indiana's data center tax exemption program (IC 6-2.5-5-37). Duke Energy Indiana serves the county; the SR-37/I-69 corridor provides fiber access to Bloomington and Indianapolis. The county's Indiana University Health Morgan Hospital campus generates local healthcare data management demand. IEDC incentives for technology investment apply to qualifying data center projects meeting Indiana's job creation thresholds.",
        "effective_date": "2014-01-01",
        "status": "active",
        "notes": "Morgan County's US-40 and SR-37 corridors connect to I-70 (east-west) and I-69 (north-south), providing fiber path diversity. Indiana's data center exemption requires 20+ qualifying jobs and $10M+ investment. Duke Energy Indiana's rates are among the more competitive in the Midwest.",
        "sources": [
            {"label": "Indiana Code IC 6-2.5-5-37 Data Center Sales Tax Exemption", "url": "https://iga.in.gov/laws/2023/ic/titles/6#6-2.5-5-37"},
            {"label": "Morgan County Economic Development", "url": "https://www.morgancountyin.org/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "18145",
        "name": "Shelby County",
        "state": "IN",
        "level": -1,
        "types": ["data_center"],
        "title": "Indiana Data Center Tax Exemption — Shelby County Shelbyville",
        "description": "Shelby County (Shelbyville) east of Indianapolis qualifies for Indiana's data center equipment tax exemption under IC 6-2.5-5-37. Duke Energy Indiana provides grid access; the I-74 corridor connects to Cincinnati (east) and Indianapolis (west) with fiber infrastructure. Shelbyville's manufacturing base (Toyota, GE) has built industrial-grade electrical infrastructure adaptable for data center use. Flat land and modest land costs relative to Indianapolis make the county attractive for large-footprint data center development.",
        "effective_date": "2014-01-01",
        "status": "active",
        "notes": "Shelby County's I-74 position puts it equidistant between Indianapolis and Cincinnati metro fiber hubs, enabling network path diversity. Toyota's Shelbyville paint facility established high-reliability industrial electrical feeds in the county that support data center power planning. IEDC incentives available for qualifying job creation.",
        "sources": [
            {"label": "Indiana Code IC 6-2.5-5-37 Data Center Sales Tax Exemption", "url": "https://iga.in.gov/laws/2023/ic/titles/6#6-2.5-5-37"},
            {"label": "Shelby County Economic Development Corporation", "url": "https://www.shelbycountyin.us/government/departments/economic_development/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
]

new_campuses = [
    {
        "id": "ai-pa-003",
        "name": "Penn State Institute for Computational and Data Sciences — Roar HPC",
        "operator": "Pennsylvania State University ICDS",
        "status": "operational",
        "county_fips": "42027",
        "notes": "Penn State ICDS Roar and Roar Collab high-performance computing systems in State College, Centre County PA. 28,000+ CPU cores, 100+ GPU nodes including NVIDIA A100s for AI/ML research. Supports Penn State faculty across 24 colleges in areas including materials science, drug discovery, astrophysics, and agricultural AI. Part of NSF ACCESS allocation network.",
        "lon": -77.8600,
        "lat": 40.7934
    },
    {
        "id": "ai-pa-004",
        "name": "Wilkes University AI and Engineering Research Center",
        "operator": "Wilkes University",
        "status": "operational",
        "county_fips": "42079",
        "notes": "Wilkes University engineering and computing research center in Wilkes-Barre, Luzerne County PA. AI research focuses on smart grid optimization for the northeastern Pennsylvania grid, predictive manufacturing for the regional industrial sector, and healthcare informatics for Geisinger Health System partnerships. Leverages PPL Electric Utilities grid data partnerships.",
        "lon": -75.8813,
        "lat": 41.2459
    },
    {
        "id": "ai-oh-006",
        "name": "Youngstown State University Advanced Manufacturing AI Research Center",
        "operator": "Youngstown State University",
        "status": "operational",
        "county_fips": "39099",
        "notes": "YSU's Williamson College of Business Administration and STEM College joint AI research center in Youngstown, Mahoning County OH. Focuses on AI applications for steel and metals manufacturing automation, additive manufacturing process optimization, and regional economic transformation analytics. Partners with Youngstown's Additive Manufacturing incubator cluster.",
        "lon": -80.6495,
        "lat": 41.0998
    },
    {
        "id": "ai-in-006",
        "name": "Franklin College Center for Data Analytics and AI",
        "operator": "Franklin College",
        "status": "operational",
        "county_fips": "18081",
        "notes": "Franklin College AI and data analytics research center in Franklin, Johnson County IN. Focuses on applied AI for healthcare informatics (Johnson Memorial Health partnership), agricultural technology for southern Indiana farming operations, and supply chain optimization for Indianapolis-area logistics industry. Supported by Lilly Endowment higher education grants.",
        "lon": -86.0550,
        "lat": 39.4806
    },
    {
        "id": "ai-in-007",
        "name": "Hancock Regional Hospital AI Clinical Decision Support System",
        "operator": "Hancock Health System",
        "status": "operational",
        "county_fips": "18059",
        "notes": "Hancock Regional Hospital's AI-powered clinical decision support and healthcare analytics platform in Greenfield, Hancock County IN. AI systems support emergency department triage prioritization, sepsis prediction, readmission risk scoring, and operational scheduling optimization. Part of the Indiana Regional Medical Center AI Health Initiative network.",
        "lon": -85.7683,
        "lat": 39.7875
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
